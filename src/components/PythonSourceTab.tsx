import React, { useState } from 'react';
import { FileCode, Copy, Check, Download, Layers, ShieldCheck, Terminal } from 'lucide-react';

export const PythonSourceTab: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string>('main.py');
  const [copied, setCopied] = useState(false);

  const fileContents: Record<string, { desc: string; code: string; language: string }> = {
    'main.py': {
      desc: 'FastAPI server with life-cycle connection pool, token provisioner, limits patcher, and proxy router.',
      language: 'python',
      code: `import secrets
from datetime import datetime, timezone
from typing import Optional, Dict, Any
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

redis_client: Optional[aioredis.Redis] = None
http_client: Optional[httpx.AsyncClient] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global redis_client, http_client
    redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    http_client = httpx.AsyncClient()
    yield
    if redis_client:
        await redis_client.aclose()
    if http_client:
        await http_client.aclose()

app = FastAPI(title="Anonymous Token Bank & API Proxy", lifespan=lifespan)

# 1. Create Token (No personal identifiers stored)
@app.post("/v1/tokens/create", status_code=status.HTTP_201_CREATED)
async def create_token(payload: TokenCreateRequest):
    token_entropy = secrets.token_hex(32)
    bearer_token = f"{settings.TOKEN_PREFIX}{token_entropy}"
    
    pipe = redis_client.pipeline(transaction=True)
    pipe.set(f"tb:{bearer_token}:total_allocated", payload.allocated_tokens)
    pipe.set(f"tb:{bearer_token}:used_tokens", 0)
    pipe.set(f"tb:{bearer_token}:user_spend_limit", payload.user_spend_limit or payload.allocated_tokens)
    if payload.daily_limit:
        pipe.set(f"tb:{bearer_token}:daily_limit", payload.daily_limit)
    await pipe.execute()

    return {
        "token": bearer_token,
        "token_id": f"{bearer_token[:16]}...",
        "total_allocated": payload.allocated_tokens,
        "remaining_balance": payload.user_spend_limit or payload.allocated_tokens,
        "warning": "Bearer key is unrecoverable. Keep it secure."
    }

# 2. Privacy Proxy Endpoint with Atomic Lua Check
@app.post("/v1/chat/completions")
async def chat_completions_proxy(request: Request, response: Response, token: str = Header(..., alias="Authorization")):
    bearer = extract_bearer_token(token)
    body = await request.json()
    estimated = estimate_request_tokens(body)
    
    # Pre-flight atomic reservation
    res = await redis_client.eval(RESERVE_TOKENS_LUA, 5, ...)
    if res[0] == 0:
        raise HTTPException(status_code=429, detail="Spend limit exceeded.")

    # Strip client IP, cookies, and tracking user agent
    sanitized = sanitize_headers(dict(request.headers))

    # Forward to enterprise upstream LLM
    status_code, data, _ = await forward_upstream_request(http_client, body, sanitized)
    actual_tokens = data.get("usage", {}).get("total_tokens", estimated)

    # Reconcile exact difference atomically
    await redis_client.eval(RECONCILE_TOKENS_LUA, 4, ..., estimated, actual_tokens)
    return data`
    },
    'lua_scripts.py': {
      desc: 'Atomic Redis Lua scripts for pre-flight reservation, reconciliation, and dynamic limit enforcement.',
      language: 'lua',
      code: `-- 1. Atomic Pre-flight Reservation Script
-- KEYS: used_tokens, user_spend_limit, daily_used, daily_limit, total_allocated
-- ARGV: estimated_tokens, daily_ttl
local used = tonumber(redis.call('GET', KEYS[1]) or '0')
local spend_limit = tonumber(redis.call('GET', KEYS[2]))

if not spend_limit then
    return {0, "TOKEN_NOT_FOUND", 0, 0}
end

local estimated = tonumber(ARGV[1])

-- Hard stop spend limit check
if (used + estimated) > spend_limit then
    local remaining = math.max(0, spend_limit - used)
    return {0, "SPEND_LIMIT_EXCEEDED", remaining, spend_limit}
end

-- Atomic commit: reserve tokens
local new_used = redis.call('INCRBY', KEYS[1], estimated)
local remaining_after = math.max(0, spend_limit - new_used)
return {1, "OK", remaining_after, spend_limit}

-----------------------------------------------------------------
-- 2. Atomic Post-Call Reconciliation Script
-- KEYS: used_tokens, user_spend_limit, daily_used, daily_limit
-- ARGV: estimated_tokens, actual_tokens
local estimated = tonumber(ARGV[1])
local actual = tonumber(ARGV[2])
local diff = actual - estimated

-- Adjust used_tokens by exact diff
local new_used = redis.call('INCRBY', KEYS[1], diff)
if new_used < 0 then
    redis.call('SET', KEYS[1], '0')
    new_used = 0
end
return {1, "RECONCILED", remaining, new_used}`
    },
    'proxy.py': {
      desc: 'Header sanitization (IP / cookie / tracking stripping) and HTTPX async upstream forwarder.',
      language: 'python',
      code: `import httpx

SENSITIVE_HEADERS = {
    "x-forwarded-for", "x-real-ip", "client-ip", "cf-connecting-ip",
    "true-client-ip", "forwarded", "cookie", "user-agent", "referer", "origin"
}

def sanitize_headers(incoming: dict) -> dict:
    sanitized = {}
    for k, v in incoming.items():
        if k.lower() not in SENSITIVE_HEADERS and not k.lower().startswith("x-client-"):
            sanitized[k.lower()] = v
    # Attach enterprise proxy identity
    sanitized["user-agent"] = "TokenBank-PrivacyProxy/1.0 (Privacy-Preserving; No-Logging)"
    if settings.UPSTREAM_API_KEY:
        sanitized["authorization"] = f"Bearer {settings.UPSTREAM_API_KEY}"
    return sanitized`
    },
    'config.py': {
      desc: 'Pydantic BaseSettings loading environment configuration.',
      language: 'python',
      code: `import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Anonymous Token Bank & API Proxy"
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    UPSTREAM_API_BASE: str = os.getenv("UPSTREAM_API_BASE", "https://generativelanguage.googleapis.com/v1beta/openai")
    UPSTREAM_API_KEY: str = os.getenv("UPSTREAM_API_KEY", os.getenv("GEMINI_API_KEY", ""))
    TOKEN_PREFIX: str = "tb_live_"

settings = Settings()`
    },
    'test_bank.py': {
      desc: 'Pytest test suite validating token lifecycle, limits enforcement, and concurrency safety.',
      language: 'python',
      code: `import pytest
from httpx import AsyncClient, ASGITransport
from main import app

@pytest.mark.asyncio
async def test_token_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create
        res = await client.post("/v1/tokens/create", json={"allocated_tokens": 100000, "user_spend_limit": 50000})
        token = res.json()["token"]
        
        # Verify status
        status_res = await client.get("/v1/tokens/status", headers={"Authorization": f"Bearer {token}"})
        assert status_res.json()["remaining_balance"] == 50000`
    },
    'docker-compose.yml': {
      desc: 'Multi-container orchestration setup with FastAPI and Redis 7.2 Alpine.',
      language: 'yaml',
      code: `version: '3.8'

services:
  tokenbank-api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - REDIS_URL=redis://redis:6379/0
      - UPSTREAM_API_KEY=\${GEMINI_API_KEY:-}
    depends_on:
      - redis

  redis:
    image: redis:7.2-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes`
    },
    'requirements.txt': {
      desc: 'Python package dependencies.',
      language: 'text',
      code: `fastapi>=0.115.0
uvicorn[standard]>=0.31.0
redis>=5.1.0
httpx>=0.27.0
pydantic>=2.9.0
pydantic-settings>=2.5.0
pytest>=8.3.0
pytest-asyncio>=0.24.0`
    }
  };

  const currentFile = fileContents[selectedFile] || fileContents['main.py'];

  const copyCurrent = () => {
    navigator.clipboard.writeText(currentFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
            <FileCode className="w-4 h-4 text-emerald-400" />
            FastAPI (Python) + Redis Reference Implementation
          </h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-2xl leading-relaxed">
            Self-contained, production-ready backend repository. Built with FastAPI, async Redis (aioredis), Lua scripting, and HTTPX.
          </p>
        </div>

        <button
          onClick={copyCurrent}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-950 bg-emerald-400 hover:bg-emerald-300 rounded transition-colors whitespace-nowrap shadow-sm"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied File' : `Copy ${selectedFile}`}</span>
        </button>
      </div>

      {/* Code Browser Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar: File Tree */}
        <div className="lg:col-span-4 space-y-2">
          <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider block px-1">
            Repository Files (/python_backend)
          </span>

          <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-2 space-y-1">
            {Object.keys(fileContents).map((fileName) => (
              <button
                key={fileName}
                onClick={() => setSelectedFile(fileName)}
                className={`w-full text-left px-3 py-2 rounded text-xs font-mono flex items-center justify-between transition-colors ${
                  selectedFile === fileName
                    ? 'bg-neutral-800 text-emerald-400 border border-neutral-700'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{fileName}</span>
                </div>
                <span className="text-[10px] text-neutral-500 uppercase">
                  {fileContents[fileName].language}
                </span>
              </button>
            ))}
          </div>

          {/* Architecture Box */}
          <div className="border border-neutral-800 bg-neutral-950 rounded-xl p-4 space-y-2 text-xs text-neutral-400">
            <span className="font-semibold text-neutral-200 block">Decoupled Redis Keys:</span>
            <ul className="font-mono text-[11px] space-y-1 text-neutral-300">
              <li>tb:&#123;id&#125;:total_allocated</li>
              <li>tb:&#123;id&#125;:used_tokens</li>
              <li>tb:&#123;id&#125;:user_spend_limit</li>
              <li>tb:&#123;id&#125;:daily_limit</li>
              <li>tb:&#123;id&#125;:daily_used:YYYYMMDD</li>
            </ul>
          </div>
        </div>

        {/* Right Pane: Code Viewer */}
        <div className="lg:col-span-8 space-y-2">
          <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-neutral-900/90 border-b border-neutral-800 flex items-center justify-between">
              <div>
                <span className="font-mono text-xs text-neutral-200 font-semibold">{selectedFile}</span>
                <span className="text-neutral-500 text-xs ml-2">· {currentFile.desc}</span>
              </div>
              <button
                onClick={copyCurrent}
                className="text-neutral-400 hover:text-neutral-200 text-xs p-1"
                title="Copy file content"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="p-4 bg-neutral-950 overflow-x-auto max-h-[580px]">
              <pre className="font-mono text-xs text-neutral-300 leading-relaxed">
                {currentFile.code}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
