import secrets
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, Header, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import redis.asyncio as aioredis
import httpx

from config import settings
from lua_scripts import (
    RESERVE_TOKENS_LUA,
    RECONCILE_TOKENS_LUA,
    UPDATE_LIMITS_LUA,
    GET_STATUS_LUA,
)
from proxy import sanitize_headers, estimate_request_tokens, forward_upstream_request

# Redis client reference
redis_client: Optional[aioredis.Redis] = None
http_client: Optional[httpx.AsyncClient] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global redis_client, http_client
    # Initialize async Redis connection pool
    redis_client = aioredis.from_url(
        settings.REDIS_URL,
        encoding="utf-8",
        decode_responses=True
    )
    http_client = httpx.AsyncClient()
    yield
    # Cleanup resources
    if redis_client:
        await redis_client.aclose()
    if http_client:
        await http_client.aclose()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Decoupled Anonymous Token Bank & Privacy-Preserving LLM Proxy.",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # Privacy first: no credentials or cookies
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "X-TokenBank-Remaining-Tokens",
        "X-TokenBank-Limit",
        "X-TokenBank-Limit-Reached",
        "X-TokenBank-Sanitized",
        "X-TokenBank-Daily-Remaining"
    ]
)

# ---------------------------------------------------------
# Request & Response Schemas
# ---------------------------------------------------------
class TokenCreateRequest(BaseModel):
    allocated_tokens: int = Field(
        ...,
        gt=0,
        description="Amount of tokens purchased for this anonymous key."
    )
    user_spend_limit: Optional[int] = Field(
        None,
        gt=0,
        description="Optional custom hard cap limit (defaults to allocated_tokens)."
    )
    daily_limit: Optional[int] = Field(
        None,
        gt=0,
        description="Optional daily rate-limit ceiling."
    )

class TokenCreateResponse(BaseModel):
    token: str = Field(..., description="The anonymous bearer secret key (tb_live_<hex>).")
    token_id: str
    total_allocated: int
    user_spend_limit: int
    daily_limit: Optional[int]
    used_tokens: int
    remaining_balance: int
    created_at: str
    warning: str

class TokenLimitsUpdateRequest(BaseModel):
    user_spend_limit: Optional[int] = Field(None, ge=0)
    daily_limit: Optional[int] = Field(None, ge=0)

class TokenStatusResponse(BaseModel):
    token_id: str
    total_allocated: int
    used_tokens: int
    remaining_balance: int
    user_spend_limit: int
    daily_limit: Optional[int]
    daily_used: int
    daily_remaining: Optional[int]
    status: str

# ---------------------------------------------------------
# Helpers
# ---------------------------------------------------------
def extract_bearer_token(authorization: Optional[str] = Header(None)) -> str:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header. Format: Bearer tb_live_<hex>"
        )
    parts = authorization.strip().split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header format. Expected 'Bearer tb_live_<hex>'"
        )
    token = parts[1]
    if not token.startswith(settings.TOKEN_PREFIX):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token format. Bearer keys must start with '{settings.TOKEN_PREFIX}'"
        )
    return token

def get_today_utc_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d")

def get_seconds_until_midnight_utc() -> int:
    now = datetime.now(timezone.utc)
    seconds_today = now.hour * 3600 + now.minute * 60 + now.second
    return max(60, 86400 - seconds_today)

# ---------------------------------------------------------
# Endpoints
# ---------------------------------------------------------
@app.post("/v1/tokens/create", response_model=TokenCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_token(payload: TokenCreateRequest):
    """
    1. Generates a new cryptographically secure anonymous bearer key.
    2. Initializes atomic Redis state structures with NO user identity links.
    3. Returns bearer key and configuration.
    """
    if not redis_client:
        raise HTTPException(status_code=500, detail="Redis connection unavailable")

    spend_limit = payload.user_spend_limit if payload.user_spend_limit is not None else payload.allocated_tokens
    if spend_limit > payload.allocated_tokens:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="user_spend_limit cannot exceed allocated_tokens."
        )

    # High entropy bearer token: tb_live_ + 32 bytes (64 hex characters)
    token_entropy = secrets.token_hex(32)
    bearer_token = f"{settings.TOKEN_PREFIX}{token_entropy}"
    token_id = bearer_token[:16] + "..."  # Redacted identifier for non-secret displays

    # Redis atomic keys
    key_allocated = f"tb:{bearer_token}:total_allocated"
    key_used = f"tb:{bearer_token}:used_tokens"
    key_spend_limit = f"tb:{bearer_token}:user_spend_limit"
    key_daily_limit = f"tb:{bearer_token}:daily_limit"

    pipe = redis_client.pipeline(transaction=True)
    pipe.set(key_allocated, payload.allocated_tokens)
    pipe.set(key_used, 0)
    pipe.set(key_spend_limit, spend_limit)
    if payload.daily_limit is not None and payload.daily_limit > 0:
        pipe.set(key_daily_limit, payload.daily_limit)
    else:
        pipe.delete(key_daily_limit)
    await pipe.execute()

    return TokenCreateResponse(
        token=bearer_token,
        token_id=token_id,
        total_allocated=payload.allocated_tokens,
        user_spend_limit=spend_limit,
        daily_limit=payload.daily_limit,
        used_tokens=0,
        remaining_balance=spend_limit,
        created_at=datetime.now(timezone.utc).isoformat(),
        warning="IMPORTANT: This bearer secret is your ONLY credential. We do not store email, IP, or identity. If lost, it cannot be recovered."
    )

@app.patch("/v1/tokens/limits", response_model=TokenStatusResponse)
async def update_token_limits(
    payload: TokenLimitsUpdateRequest,
    token: str = Header(..., alias="Authorization")
):
    """
    Dynamically updates hard stop spend limit or daily limit.
    Enforces that spend limit cannot exceed total purchased allocation.
    """
    if not redis_client:
        raise HTTPException(status_code=500, detail="Redis connection unavailable")

    bearer_token = extract_bearer_token(token)
    
    key_allocated = f"tb:{bearer_token}:total_allocated"
    key_spend_limit = f"tb:{bearer_token}:user_spend_limit"
    key_daily_limit = f"tb:{bearer_token}:daily_limit"

    new_spend = payload.user_spend_limit if payload.user_spend_limit is not None else -1
    new_daily = payload.daily_limit if payload.daily_limit is not None else -1

    # Execute atomic Lua script
    result = await redis_client.eval(
        UPDATE_LIMITS_LUA,
        3,
        key_allocated,
        key_spend_limit,
        key_daily_limit,
        new_spend,
        new_daily
    )

    status_code, msg, current_spend, current_daily = result
    if status_code == 0:
        if msg == "TOKEN_NOT_FOUND":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token does not exist.")
        elif msg == "SPEND_LIMIT_EXCEEDS_ALLOCATION":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="user_spend_limit cannot exceed total purchased allocated tokens."
            )
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Limit update failed: {msg}")

    # Return updated status
    return await get_token_status(token=f"Bearer {bearer_token}")

@app.get("/v1/tokens/status", response_model=TokenStatusResponse)
async def get_token_status(token: str = Header(..., alias="Authorization")):
    """
    Returns real-time metrics: Total purchased, Total used, Remaining balance,
    Active user spend limit, and Daily usage status.
    """
    if not redis_client:
        raise HTTPException(status_code=500, detail="Redis connection unavailable")

    bearer_token = extract_bearer_token(token)
    date_str = get_today_utc_str()

    key_allocated = f"tb:{bearer_token}:total_allocated"
    key_used = f"tb:{bearer_token}:used_tokens"
    key_spend_limit = f"tb:{bearer_token}:user_spend_limit"
    key_daily_limit = f"tb:{bearer_token}:daily_limit"
    key_daily_used = f"tb:{bearer_token}:daily_used:{date_str}"

    res = await redis_client.eval(
        GET_STATUS_LUA,
        5,
        key_allocated,
        key_used,
        key_spend_limit,
        key_daily_limit,
        key_daily_used
    )

    total_allocated, used_tokens, spend_limit, daily_limit, daily_used, token_status = res

    if token_status == "NOT_FOUND":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bearer token not found")

    remaining_balance = max(0, spend_limit - used_tokens)
    
    daily_lim_val = daily_limit if daily_limit > -1 else None
    daily_rem_val = max(0, daily_lim_val - daily_used) if daily_lim_val is not None else None

    return TokenStatusResponse(
        token_id=f"{bearer_token[:16]}...",
        total_allocated=total_allocated,
        used_tokens=used_tokens,
        remaining_balance=remaining_balance,
        user_spend_limit=spend_limit,
        daily_limit=daily_lim_val,
        daily_used=daily_used,
        daily_remaining=daily_rem_val,
        status="active"
    )

@app.post("/v1/chat/completions")
async def chat_completions_proxy(
    request: Request,
    response: Response,
    token: str = Header(..., alias="Authorization")
):
    """
    The Privacy Proxy Endpoint:
    1. Pre-flight check (atomic Redis Lua reservation).
    2. Header sanitization (strip client IPs, cookies, tracking).
    3. Upstream execution (forward to enterprise LLM endpoint).
    4. Post-call reconciliation (adjust exact usage.total_tokens).
    """
    if not redis_client or not http_client:
        raise HTTPException(status_code=500, detail="Service uninitialized")

    bearer_token = extract_bearer_token(token)

    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    # 1. Conservative Pre-flight Estimation
    estimated_tokens = estimate_request_tokens(body)
    date_str = get_today_utc_str()
    daily_ttl = get_seconds_until_midnight_utc()

    key_allocated = f"tb:{bearer_token}:total_allocated"
    key_used = f"tb:{bearer_token}:used_tokens"
    key_spend_limit = f"tb:{bearer_token}:user_spend_limit"
    key_daily_limit = f"tb:{bearer_token}:daily_limit"
    key_daily_used = f"tb:{bearer_token}:daily_used:{date_str}"

    # Atomic Lua Reservation
    lua_result = await redis_client.eval(
        RESERVE_TOKENS_LUA,
        5,
        key_used,
        key_spend_limit,
        key_daily_used,
        key_daily_limit,
        key_allocated,
        estimated_tokens,
        daily_ttl
    )

    success, msg, remaining_after_reservation, spend_limit = lua_result

    if success == 0:
        response.headers["X-TokenBank-Limit-Reached"] = "true"
        response.headers["X-TokenBank-Remaining-Tokens"] = str(remaining_after_reservation)
        response.headers["X-TokenBank-Limit"] = str(spend_limit)
        
        detail_msg = "Token limit reached. Hard spend limit exceeded."
        if msg == "DAILY_LIMIT_EXCEEDED":
            detail_msg = "Daily rate limit reached. Resets at 00:00 UTC."
        elif msg == "TOKEN_NOT_FOUND":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid bearer token.")

        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": {
                    "message": detail_msg,
                    "type": "insufficient_token_quota",
                    "code": 429,
                    "remaining_tokens": remaining_after_reservation,
                    "spend_limit": spend_limit
                }
            }
        )

    # 2. Header Sanitization
    incoming_headers = dict(request.headers)
    sanitized = sanitize_headers(incoming_headers)

    # 3. Upstream Execution
    upstream_status = 500
    upstream_data: Dict[str, Any] = {}
    actual_tokens = 0
    call_failed = False

    try:
        upstream_status, upstream_data, _ = await forward_upstream_request(
            http_client,
            body,
            sanitized
        )
        if upstream_status >= 400:
            call_failed = True
        else:
            usage = upstream_data.get("usage", {})
            actual_tokens = usage.get("total_tokens", estimated_tokens)
    except Exception as e:
        call_failed = True
        upstream_status = 502
        upstream_data = {"error": {"message": f"Upstream execution failure: {str(e)}", "code": 502}}

    # 4. Atomic Reconciliation
    # If the call failed, actual_tokens is 0, releasing the reservation completely.
    reconciled_actual = 0 if call_failed else actual_tokens

    recon_res = await redis_client.eval(
        RECONCILE_TOKENS_LUA,
        4,
        key_used,
        key_spend_limit,
        key_daily_used,
        key_daily_limit,
        estimated_tokens,
        reconciled_actual
    )
    _, _, final_remaining, final_used = recon_res

    # Attach privacy & accounting audit headers
    response.headers["X-TokenBank-Remaining-Tokens"] = str(final_remaining)
    response.headers["X-TokenBank-Limit"] = str(spend_limit)
    response.headers["X-TokenBank-Sanitized"] = "x-forwarded-for,client-ip,cookie,referer,user-agent"
    response.status_code = upstream_status

    return upstream_data

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
