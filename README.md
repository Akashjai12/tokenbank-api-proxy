# TokenBank Console

**TokenBank Console** is a modern developer dashboard for a privacy-preserving LLM token management and API proxy platform.

It provides a clean interface for managing anonymous bearer tokens, monitoring token usage, configuring spending limits, testing privacy-preserving LLM requests, inspecting sanitized headers, and simulating concurrent API requests.

> **Current version:** Frontend-only MVP  
> **Backend:** Designed to connect with a FastAPI + Redis backend

---

## Overview

TokenBank is designed around a simple idea:

**Give developers secure, anonymous control over LLM token usage without requiring traditional user accounts or storing unnecessary personal information.**

The TokenBank Console acts as the frontend interface for this system.

It currently uses a mock API engine with local storage persistence, allowing the entire dashboard to be explored without a running backend.

The frontend is structured so that the mock layer can later be replaced by the real TokenBank backend through REST APIs.

---

## Features

### Dashboard & Telemetry

The dashboard provides a real-time overview of token usage and API activity.

- Total allocated tokens
- Used tokens
- Remaining quota
- Daily UTC usage
- Visual token allocation and burn meter
- Active spending boundary
- Recent API proxy activity
- HTTP status codes
- Token deductions
- Request latency
- Stripped header counts

---

### Anonymous Token Vault

Manage anonymous bearer credentials without traditional user accounts.

Features include:

- Anonymous bearer token generation
- Mask / reveal secret
- One-click token copying
- Token status
- Token allocation information
- Remaining balance
- Token inventory
- Active token switching
- New token provisioning
- Custom allocation
- Custom spending limits
- Daily usage limits

Example token format:

```text
tb_live_<64-character-hex-secret>
```

---

### Dynamic Limits

Configure token consumption policies dynamically.

Supported controls:

- User spend limit
- Daily rate limit
- Numeric inputs
- Interactive sliders
- Real-time validation
- Save and reset controls
- Validation against purchased token allocation
- Prevention of invalid limits

The UI is designed to work with a backend that enforces these limits atomically.

---

### Privacy Proxy Studio

Test LLM requests through the TokenBank privacy proxy.

Features include:

- Model selection
- Prompt composer
- Prompt presets
- Maximum token controls
- Temperature controls
- Request execution
- Response inspection
- Raw JSON inspection
- Accounting reconciliation tracing

The accounting trace displays:

```text
Estimated Tokens
       ↓
Reserved Tokens
       ↓
Actual Upstream Usage
       ↓
Reconciliation Delta
```

---

### Header Sanitization Inspector

Inspect how sensitive request headers are handled before they are forwarded to an LLM provider.

The interface provides a visual:

```text
Client Request
      ↓
Header Sanitization
      ↓
Sanitized Proxy Request
      ↓
LLM Provider
```

Example headers that may be identified as sensitive:

```text
X-Forwarded-For
Client-IP
Cookie
Referer
Tracking User-Agent
Sec-CH-UA
```

The inspector also allows custom headers to be tested against the privacy filter.

---

### Concurrency Race Lab

The Race Lab demonstrates concurrent token requests and quota enforcement.

Features include:

- 4–24 parallel workers
- Configurable token demand
- Concurrent request simulation
- Worker-by-worker results
- Request latency
- Successful requests
- Rejected requests
- Quota boundary testing
- Zero-overdraft verification

Example execution:

```text
Worker 01 → 200 OK
Worker 02 → 200 OK
Worker 03 → 429 Quota Exceeded
Worker 04 → 429 Quota Exceeded
```

The purpose is to demonstrate how atomic quota reservation can prevent multiple simultaneous requests from exceeding the configured token limit.

---

### API Console

Generate ready-to-use API requests for different environments.

Supported languages:

- cURL
- Python
- Node.js

Example cURL:

```bash
curl -X POST "http://localhost:8000/v1/chat/completions" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "your-model",
    "messages": [
      {
        "role": "user",
        "content": "Explain zero-knowledge privacy."
      }
    ],
    "max_tokens": 100
  }'
```

The frontend can dynamically insert the currently selected bearer token into generated snippets.

---

## Tech Stack

### Frontend

- React
- TypeScript
- Tailwind CSS
- Vite
- Component-based architecture

### Current Data Layer

- Mock API engine
- LocalStorage persistence

### Planned Backend

- Python
- FastAPI
- Redis
- Redis Lua scripts
- REST API
- LLM provider integrations
- Docker

---

## Architecture

The frontend is intentionally separated from the backend.

```text
┌─────────────────────────────────────┐
│          TokenBank Console          │
│                                     │
│  React + TypeScript + Tailwind      │
│                                     │
│  Dashboard                          │
│  Token Vault                        │
│  Dynamic Limits                     │
│  Privacy Proxy Studio               │
│  Header Inspector                   │
│  Race Lab                           │
│  API Console                        │
└─────────────────┬───────────────────┘
                  │
                  │ REST API
                  ▼
┌─────────────────────────────────────┐
│          FastAPI Backend            │
│                                     │
│  Token Provisioning                 │
│  Token Status                       │
│  Dynamic Limits                     │
│  Chat Completions Proxy             │
│  Race Simulation                    │
│  Usage Reconciliation               │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│               Redis                 │
│                                     │
│  Token Allocation                   │
│  Used Tokens                        │
│  Spend Limits                       │
│  Daily Limits                       │
│  Atomic Reservations                │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│          LLM Provider(s)            │
└─────────────────────────────────────┘
```

---

## Project Structure

```text
tokenbank-console/
│
├── public/
│
├── src/
│   ├── components/
│   │   ├── dashboard/
│   │   ├── token-vault/
│   │   ├── limits/
│   │   ├── proxy/
│   │   ├── headers/
│   │   ├── race-lab/
│   │   └── api-console/
│   │
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── TokenVault.tsx
│   │   ├── Limits.tsx
│   │   ├── PrivacyProxy.tsx
│   │   ├── HeaderInspector.tsx
│   │   ├── RaceLab.tsx
│   │   └── APIConsole.tsx
│   │
│   ├── services/
│   │   └── api.ts
│   │
│   ├── hooks/
│   │
│   ├── types/
│   │
│   ├── App.tsx
│   └── main.tsx
│
├── .env.example
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## API Service Layer

The frontend uses a dedicated API service layer:

```text
src/services/api.ts
```

This keeps UI components independent from the backend implementation.

The service layer contains interfaces and functions for concepts such as:

```text
TokenRecord
ChatCompletionRequest
UpdateLimitsRequest
ConcurrencySimulationResult
```

This makes it easier to replace the mock API with a real REST API later.

---

## Mock Mode

The current application runs without a backend.

The frontend uses a mock engine and local storage so that users can interact with the dashboard immediately.

Conceptually:

```text
Frontend
   ↓
api.ts
   ↓
Mock Engine
   ↓
LocalStorage
```

This allows development and UI testing without Redis or FastAPI.

---

## Connecting the Real Backend

Once the FastAPI backend is ready, disable mock mode and configure the backend URL.

Example environment variable:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Then configure the API service to use the real backend instead of the mock implementation.

Conceptually:

```text
API_CONFIG.USE_MOCK = false
```

After this change:

```text
TokenBank Console
        ↓
    FastAPI API
        ↓
       Redis
        ↓
   LLM Provider
```

---

## Planned API Endpoints

The frontend is designed around the following backend endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/v1/tokens/create` | Create anonymous token |
| GET | `/v1/tokens/status` | Get token usage and balance |
| PATCH | `/v1/tokens/limits` | Update spending limits |
| POST | `/v1/chat/completions` | Send request through privacy proxy |
| POST | `/v1/tokens/race-simulation` | Run concurrency simulation |

---

## Example Backend Flow

### 1. Create Token

```http
POST /v1/tokens/create
```

Example request:

```json
{
  "allocated_tokens": 100000,
  "user_spend_limit": 50000,
  "daily_limit": 10000
}
```

---

### 2. Check Token Status

```http
GET /v1/tokens/status
Authorization: Bearer <YOUR_TOKEN>
```

---

### 3. Update Limits

```http
PATCH /v1/tokens/limits
Authorization: Bearer <YOUR_TOKEN>
```

Example:

```json
{
  "user_spend_limit": 75000,
  "daily_limit": 10000
}
```

---

### 4. Execute LLM Request

```http
POST /v1/chat/completions
Authorization: Bearer <YOUR_TOKEN>
```

Example:

```json
{
  "model": "your-model",
  "messages": [
    {
      "role": "user",
      "content": "Explain zero-knowledge privacy."
    }
  ],
  "max_tokens": 100
}
```

---

## Getting Started

### Prerequisites

Make sure you have:

- Node.js 18+
- npm

Check your versions:

```bash
node --version
npm --version
```

---

### Installation

Clone the repository:

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
```

Enter the project directory:

```bash
cd tokenbank-console
```

Install dependencies:

```bash
npm install
```

---

### Run Development Server

```bash
npm run dev
```

The application will normally be available at:

```text
http://localhost:5173
```

---

## Environment Variables

Create a `.env` file when connecting the application to a real backend.

Example:

```env
VITE_API_BASE_URL=http://localhost:8000
```

For local frontend development with mock mode, the backend URL may not be required.

---

## Development Workflow

The intended development workflow is:

```text
1. Build UI
      ↓
2. Test with Mock API
      ↓
3. Connect FastAPI
      ↓
4. Connect Redis
      ↓
5. Connect LLM Provider
      ↓
6. Test quotas and concurrency
      ↓
7. Deploy
```

---

## Security Considerations

TokenBank is designed with privacy and security considerations in mind.

The backend architecture is intended to support:

- Anonymous bearer credentials
- No traditional user account requirement
- No unnecessary personally identifiable information
- Sanitization of tracking-related request headers
- Atomic quota reservations
- Hard spending limits
- Daily usage limits
- Token reconciliation after upstream responses
- Protection against concurrent quota overdrafts

The frontend itself should never be treated as a trusted security boundary.

All authorization, quota enforcement, token validation, and privacy enforcement must ultimately be implemented and validated by the backend.

---

## Important

The current repository is a **frontend-only project**.

The mock API layer is intended for:

- UI development
- Demonstration
- Prototyping
- Local testing

It should not be considered a production authorization or token accounting system until connected to the real backend.

---

## Roadmap

### Phase 1 — Frontend

- [x] Dashboard
- [x] Token Vault
- [x] Dynamic Limits
- [x] Privacy Proxy Studio
- [x] Header Sanitization Inspector
- [x] Concurrency Race Lab
- [x] API Console
- [x] Mock API service layer
- [x] LocalStorage persistence

### Phase 2 — Backend

- [ ] FastAPI integration
- [ ] Redis token storage
- [ ] Atomic Redis Lua reservations
- [ ] Token reconciliation
- [ ] Dynamic quota enforcement
- [ ] Privacy header sanitization
- [ ] Real LLM proxy

### Phase 3 — Production

- [ ] Authentication/administration layer where required
- [ ] Production Redis configuration
- [ ] Logging and observability
- [ ] Automated tests
- [ ] Rate limiting
- [ ] Error monitoring
- [ ] Docker deployment
- [ ] Cloud deployment

---

## License

This project is currently intended for educational, development, and prototyping purposes.

Add your preferred license before distributing the project publicly.

---

## Author

**Akash Jaiswal**

TokenBank Console — Privacy-Preserving LLM Token Management & API Proxy Dashboard
