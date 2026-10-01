# Anonymous Token Bank & Privacy-Preserving LLM Proxy

Production-grade Minimum Viable Product (MVP) engineered with **FastAPI (Python)**, **Redis**, and **Lua Scripting**.

## Architecture Overview

```
                                  [ Anonymous Client ]
                                           │
                                           │ Bearer: tb_live_<hex>
                                           ▼
                 ┌─────────────────────────────────────────────────────┐
                 │       FastAPI API Gateway & Privacy Proxy           │
                 │                                                     │
                 │  1. Token Extractor (Zero User Tables / No PII)    │
                 │  2. Header Sanitizer (Strips IP, Cookies, UA)       │
                 │  3. Pre-flight Token Estimator                      │
                 └──────────────────┬─────────────────┬────────────────┘
                                    │                 │
              [Atomic Lua Script]   │                 │ [Sanitized Forward]
                                    ▼                 ▼
             ┌─────────────────────────────┐    ┌───────────────────────────┐
             │       Redis 7.2 Cluster     │    │  Upstream Enterprise LLM  │
             │                             │    │   (Google Gemini Flash)   │
             │ tb:{id}:total_allocated     │    └─────────────┬─────────────┘
             │ tb:{id}:used_tokens         │                  │
             │ tb:{id}:user_spend_limit    │                  │ usage.total_tokens
             │ tb:{id}:daily_limit         │                  ▼
             │ tb:{id}:daily_used:{date}   │    ┌───────────────────────────┐
             └──────────────┬──────────────┘    │  Atomic Reconciliation    │
                            │                   │  diff = actual - est      │
                            └───────────────────┤  INCRBY used_tokens diff  │
                                                └───────────────────────────┘
```

---

## 1. Quickstart & Local Setup

### Prerequisites
- Python 3.10+
- Redis Server (or Docker)

### Installation
```bash
# Clone and enter directory
cd python_backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Running with Docker Compose (Recommended)
```bash
# Set your Gemini / OpenAI API key (optional for real upstream calls)
export GEMINI_API_KEY="your-api-key"

docker-compose up -d --build
```
API will be live at `http://localhost:8000`. Interactive OpenAPI documentation at `http://localhost:8000/docs`.

### Running Locally
```bash
# Start redis
redis-server &

# Start FastAPI server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 2. Sample cURL Commands

### 1. Provision an Anonymous Token with Custom Limits
```bash
curl -X POST "http://localhost:8000/v1/tokens/create" \
  -H "Content-Type: application/json" \
  -d '{
    "allocated_tokens": 100000,
    "user_spend_limit": 50000,
    "daily_limit": 10000
  }'
```
**Example Response:**
```json
{
  "token": "tb_live_f4b7a192c890e1837482910fae3b890123456789abcdef0123456789abcdef01",
  "token_id": "tb_live_f4b7a192...",
  "total_allocated": 100000,
  "user_spend_limit": 50000,
  "daily_limit": 10000,
  "used_tokens": 0,
  "remaining_balance": 50000,
  "created_at": "2026-10-01T12:00:00Z",
  "warning": "IMPORTANT: This bearer secret is your ONLY credential. We do not store email, IP, or identity. If lost, it cannot be recovered."
}
```

---

### 2. Check Real-Time Anonymous Status
```bash
curl -X GET "http://localhost:8000/v1/tokens/status" \
  -H "Authorization: Bearer tb_live_f4b7a192c890e1837482910fae3b890123456789abcdef0123456789abcdef01"
```
**Example Response:**
```json
{
  "token_id": "tb_live_f4b7a192...",
  "total_allocated": 100000,
  "used_tokens": 1420,
  "remaining_balance": 48580,
  "user_spend_limit": 50000,
  "daily_limit": 10000,
  "daily_used": 1420,
  "daily_remaining": 8580,
  "status": "active"
}
```

---

### 3. Dynamically Update Spending Limits
```bash
curl -X PATCH "http://localhost:8000/v1/tokens/limits" \
  -H "Authorization: Bearer tb_live_f4b7a192c890e1837482910fae3b890123456789abcdef0123456789abcdef01" \
  -H "Content-Type: application/json" \
  -d '{
    "user_spend_limit": 75000,
    "daily_limit": 15000
  }'
```

---

### 4. Send Proxied Request Through Privacy Proxy
```bash
curl -i -X POST "http://localhost:8000/v1/chat/completions" \
  -H "Authorization: Bearer tb_live_f4b7a192c890e1837482910fae3b890123456789abcdef0123456789abcdef01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini-3.8-flash",
    "messages": [
      {"role": "user", "content": "Explain atomic distributed counters in Redis."}
    ],
    "max_tokens": 200
  }'
```
**Response Headers Attached:**
```http
HTTP/1.1 200 OK
X-TokenBank-Remaining-Tokens: 48312
X-TokenBank-Limit: 75000
X-TokenBank-Sanitized: x-forwarded-for,client-ip,cookie,referer,user-agent
Content-Type: application/json
```

---

## 3. Concurrency & Race Condition Guarantees

In high-concurrency environments, naive `GET` followed by `SET` introduces race conditions where 50 requests hitting simultaneously could exceed the spend limit by orders of magnitude.

Token Bank enforces strict mathematical safety through **Redis Lua Scripting**:
1. **Single-threaded Atomicity**: Redis executes Lua scripts sequentially. No other read or write can intervene.
2. **Atomic Pre-flight Reservation**: The script checks `used + estimated <= limit`. If valid, it increments `used_tokens` right inside the transaction before returning.
3. **Overdraft Rejection**: If limit exceeded, it halts immediately with HTTP 429 (`X-TokenBank-Limit-Reached`).
4. **Post-call Reconciliation**: Computes `diff = actual_tokens - estimated_tokens` and applies `INCRBY used_tokens diff`. If an upstream call fails or network breaks, the reserved tokens are 100% credited back.

---

## 4. Running the Test Suite
```bash
pytest test_bank.py -v
```
