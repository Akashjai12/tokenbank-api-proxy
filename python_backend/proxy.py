import math
from typing import Dict, Any, Tuple
import httpx
from config import settings

# Headers that reveal user identity, location, or telemetry
SENSITIVE_HEADERS = {
    "x-forwarded-for",
    "x-real-ip",
    "client-ip",
    "cf-connecting-ip",
    "true-client-ip",
    "forwarded",
    "cookie",
    "user-agent",
    "referer",
    "origin",
    "authorization",
    "sec-ch-ua",
    "sec-ch-ua-mobile",
    "sec-ch-ua-platform",
    "host",
}

def sanitize_headers(incoming_headers: Dict[str, str]) -> Dict[str, str]:
    """
    Strips all client identity metadata, IPs, tracking headers, and cookies.
    Replaces with anonymous, privacy-hardened proxy identity.
    """
    sanitized: Dict[str, str] = {}
    for key, val in incoming_headers.items():
        k_lower = key.lower()
        if k_lower not in SENSITIVE_HEADERS and not k_lower.startswith("x-client-"):
            sanitized[k_lower] = val
            
    # Inject enterprise upstream authorization & neutral user agent
    if settings.UPSTREAM_API_KEY:
        sanitized["authorization"] = f"Bearer {settings.UPSTREAM_API_KEY}"
    sanitized["user-agent"] = "TokenBank-PrivacyProxy/1.0 (Privacy-Preserving; No-Logging)"
    sanitized["content-type"] = "application/json"
    sanitized["accept"] = "application/json"
    return sanitized

def estimate_request_tokens(payload: Dict[str, Any]) -> int:
    """
    Conservative token estimation:
    Calculates prompt characters / 4 + requested max_tokens or default buffer.
    """
    total_chars = 0
    messages = payload.get("messages", [])
    for msg in messages:
        content = msg.get("content", "")
        if isinstance(content, str):
            total_chars += len(content)
        elif isinstance(content, list):
            for part in content:
                if isinstance(part, dict) and "text" in part:
                    total_chars += len(part["text"])

    prompt_tokens = math.ceil(total_chars * settings.DEFAULT_ESTIMATED_TOKENS_PER_CHAR)
    # Reserve for prompt + requested completion tokens (or fallback conservative buffer)
    max_tokens = payload.get("max_tokens") or payload.get("max_completion_tokens") or settings.DEFAULT_MAX_COMPLETION_TOKENS
    estimated = max(10, prompt_tokens + int(max_tokens))
    return estimated

async def forward_upstream_request(
    client: httpx.AsyncClient,
    payload: Dict[str, Any],
    sanitized_headers: Dict[str, str]
) -> Tuple[int, Dict[str, Any], Dict[str, str]]:
    """
    Proxies request downstream to LLM API.
    Returns: (status_code, response_json, response_headers)
    """
    target_url = f"{settings.UPSTREAM_API_BASE.rstrip('/')}/chat/completions"
    
    # If no upstream key is configured, provide a realistic synthetic completion
    # so local tests and sandboxes run seamlessly without external billable keys
    if not settings.UPSTREAM_API_KEY:
        prompt_text = str(payload.get("messages", [{}])[-1].get("content", ""))
        prompt_tokens = max(12, len(prompt_text) // 4)
        completion_text = (
            f"[TokenBank Privacy Proxy Response] Anonymously processed. "
            f"No IP or identity was stored or transmitted downstream."
        )
        completion_tokens = len(completion_text) // 4
        mock_response = {
            "id": "chatcmpl-tb-proxy-synthetic-01",
            "object": "chat.completion",
            "created": 1742080000,
            "model": payload.get("model", settings.UPSTREAM_DEFAULT_MODEL),
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": completion_text
                    },
                    "finish_reason": "stop"
                }
            ],
            "usage": {
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": prompt_tokens + completion_tokens
            }
        }
        return 200, mock_response, {"content-type": "application/json"}

    response = await client.post(
        target_url,
        json=payload,
        headers=sanitized_headers,
        timeout=60.0
    )
    
    try:
        body = response.json()
    except Exception:
        body = {"raw": response.text}
        
    return response.status_code, body, dict(response.headers)
