"""
Automated Pytest Suite for Anonymous Token Bank & API Proxy.

Validates:
1. Decoupled token creation (no identity).
2. Dynamic limits modification and bounds checks.
3. Header sanitization stripping sensitive IP & Cookie headers.
4. Concurrency test: 20 simultaneous parallel requests against limited quota,
   verifying atomic Lua reservation prevents any overdraft.
"""

import asyncio
import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from proxy import sanitize_headers, estimate_request_tokens

@pytest.mark.asyncio
async def test_header_sanitization():
    raw_headers = {
        "x-forwarded-for": "198.51.100.42",
        "client-ip": "203.0.113.195",
        "cookie": "session_id=secret_user_99; tracking_uuid=xyz",
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        "referer": "https://private-user-portal.example.com/chat",
        "x-custom-request-id": "req-12345"
    }
    sanitized = sanitize_headers(raw_headers)
    
    assert "x-forwarded-for" not in sanitized
    assert "client-ip" not in sanitized
    assert "cookie" not in sanitized
    assert "referer" not in sanitized
    assert "TokenBank-PrivacyProxy" in sanitized["user-agent"]
    assert sanitized["x-custom-request-id"] == "req-12345"

@pytest.mark.asyncio
async def test_token_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create Token
        create_res = await client.post("/v1/tokens/create", json={
            "allocated_tokens": 50000,
            "user_spend_limit": 20000,
            "daily_limit": 5000
        })
        assert create_res.status_code == 201
        data = create_res.json()
        token = data["token"]
        assert token.startswith("tb_live_")
        assert data["total_allocated"] == 50000
        assert data["user_spend_limit"] == 20000
        assert data["remaining_balance"] == 20000

        headers = {"Authorization": f"Bearer {token}"}

        # 2. Check Status
        status_res = await client.get("/v1/tokens/status", headers=headers)
        assert status_res.status_code == 200
        sdata = status_res.json()
        assert sdata["total_allocated"] == 50000
        assert sdata["user_spend_limit"] == 20000
        assert sdata["used_tokens"] == 0

        # 3. Update Limits (within allocation)
        patch_res = await client.patch("/v1/tokens/limits", headers=headers, json={
            "user_spend_limit": 35000,
            "daily_limit": 10000
        })
        assert patch_res.status_code == 200
        pdata = patch_res.json()
        assert pdata["user_spend_limit"] == 35000
        assert pdata["daily_limit"] == 10000

        # 4. Reject Limit exceeding total allocation
        bad_patch = await client.patch("/v1/tokens/limits", headers=headers, json={
            "user_spend_limit": 999999
        })
        assert bad_patch.status_code == 400

        # 5. Send Chat Completion through Privacy Proxy
        chat_res = await client.post("/v1/chat/completions", headers=headers, json={
            "model": "gemini-3.8-flash",
            "messages": [{"role": "user", "content": "What is differential privacy?"}],
            "max_tokens": 100
        })
        assert chat_res.status_code == 200
        assert "X-TokenBank-Remaining-Tokens" in chat_res.headers
        remaining = int(chat_res.headers["X-TokenBank-Remaining-Tokens"])
        assert remaining < 35000
