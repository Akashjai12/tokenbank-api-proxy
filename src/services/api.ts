/**
 * TokenBank Console - API Service Layer
 * 
 * Provides clean typed REST interfaces and a robust local mock engine with
 * realistic persistence, latency simulation, and validation.
 * 
 * When connecting to a production backend, simply set `USE_MOCK = false`
 * and point `API_BASE_URL` to your FastAPI / Express server.
 */

export interface TokenRecord {
  tokenId: string; // e.g. tb_live_7e84a92c310b89f41de600829ac455b8
  maskedToken: string;
  totalAllocated: number;
  usedTokens: number;
  remainingBalance: number;
  userSpendLimit: number;
  dailyLimit: number | null;
  dailyUsed: number;
  dailyRemaining: number | null;
  status: 'active' | 'rate_limited' | 'exhausted';
  createdAt: string;
}

export interface CreateTokenRequest {
  allocatedTokens: number;
  userSpendLimit?: number;
  dailyLimit?: number | null;
}

export interface UpdateLimitsRequest {
  userSpendLimit?: number;
  dailyLimit?: number | null;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}

export interface ChatCompletionResponse {
  id: string;
  model: string;
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  accounting: {
    estimatedReserved: number;
    actualDeducted: number;
    reconciliationDelta: number;
    remainingBalance: number;
  };
  sanitization: {
    strippedHeaders: string[];
    outboundHeaders: Record<string, string>;
  };
  latencyMs: number;
  statusCode: number;
}

export interface ApiActivityItem {
  id: string;
  timestamp: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PATCH';
  model?: string;
  tokensDeducted: number;
  status: number;
  statusText: string;
  latencyMs: number;
  sanitizedHeadersCount: number;
}

export interface ConcurrencySimulationResult {
  workerCount: number;
  tokensPerWorker: number;
  initialBalance: number;
  grantedCount: number;
  rejectedCount: number;
  finalBalance: number;
  overdraftDetected: boolean;
  workers: Array<{
    workerId: number;
    success: boolean;
    statusCode: number;
    tokensAllocated: number;
    remainingAfter: number;
    latencyMs: number;
  }>;
}

// Configuration
export const API_CONFIG = {
  USE_MOCK: true,
  BASE_URL: import.meta.env.VITE_API_BASE_URL || '/v1',
  DEFAULT_SIMULATED_DELAY_MS: 320,
};

// Storage keys
const STORAGE_KEYS = {
  TOKENS: 'tokenbank_tokens_v2',
  ACTIVE_TOKEN_ID: 'tokenbank_active_token_v2',
  ACTIVITY: 'tokenbank_activity_v2',
};

// Initial Seed Data
const INITIAL_TOKENS: TokenRecord[] = [
  {
    tokenId: 'tb_live_7e84a92c310b89f41de600829ac455b8',
    maskedToken: 'tb_live_7e84...55b8',
    totalAllocated: 500000,
    usedTokens: 142850,
    remainingBalance: 207150,
    userSpendLimit: 350000,
    dailyLimit: 50000,
    dailyUsed: 18400,
    dailyRemaining: 31600,
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    tokenId: 'tb_live_4f91b72a8c3d0e91552a44b1239ce841',
    maskedToken: 'tb_live_4f91...e841',
    totalAllocated: 250000,
    usedTokens: 248900,
    remainingBalance: 1100,
    userSpendLimit: 250000,
    dailyLimit: 25000,
    dailyUsed: 24200,
    dailyRemaining: 800,
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    tokenId: 'tb_live_9a01e56b3c2d4e8f1a7b9c3d5e7f1b3d',
    maskedToken: 'tb_live_9a01...1b3d',
    totalAllocated: 100000,
    usedTokens: 100000,
    remainingBalance: 0,
    userSpendLimit: 100000,
    dailyLimit: 20000,
    dailyUsed: 20000,
    dailyRemaining: 0,
    status: 'exhausted',
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
  }
];

const INITIAL_ACTIVITY: ApiActivityItem[] = [
  {
    id: 'act-1',
    timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    endpoint: '/v1/chat/completions',
    method: 'POST',
    model: 'gemini-3.8-flash',
    tokensDeducted: 184,
    status: 200,
    statusText: 'OK',
    latencyMs: 245,
    sanitizedHeadersCount: 5,
  },
  {
    id: 'act-2',
    timestamp: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    endpoint: '/v1/chat/completions',
    method: 'POST',
    model: 'gemini-3.8-flash',
    tokensDeducted: 412,
    status: 200,
    statusText: 'OK',
    latencyMs: 310,
    sanitizedHeadersCount: 6,
  },
  {
    id: 'act-3',
    timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    endpoint: '/v1/tokens/limits',
    method: 'PATCH',
    tokensDeducted: 0,
    status: 200,
    statusText: 'OK',
    latencyMs: 12,
    sanitizedHeadersCount: 0,
  },
  {
    id: 'act-4',
    timestamp: new Date(Date.now() - 1000 * 60 * 52).toISOString(),
    endpoint: '/v1/chat/completions',
    method: 'POST',
    model: 'gpt-4o',
    tokensDeducted: 890,
    status: 200,
    statusText: 'OK',
    latencyMs: 540,
    sanitizedHeadersCount: 5,
  },
  {
    id: 'act-5',
    timestamp: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    endpoint: '/v1/chat/completions',
    method: 'POST',
    model: 'gemini-3.8-flash',
    tokensDeducted: 0,
    status: 429,
    statusText: 'Quota Exceeded',
    latencyMs: 8,
    sanitizedHeadersCount: 5,
  }
];

// Helper: LocalStorage state sync
function loadStoredTokens(): TokenRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TOKENS);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return INITIAL_TOKENS;
}

function saveStoredTokens(tokens: TokenRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.TOKENS, JSON.stringify(tokens));
  } catch {
    // ignore
  }
}

function loadStoredActivity(): ApiActivityItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVITY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return INITIAL_ACTIVITY;
}

function saveStoredActivity(activity: ApiActivityItem[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(activity.slice(0, 50)));
  } catch {
    // ignore
  }
}

const delay = (ms = API_CONFIG.DEFAULT_SIMULATED_DELAY_MS) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * TokenBank API Service
 */
export const TokenBankApi = {
  /**
   * Get all tokens
   */
  async getTokens(): Promise<TokenRecord[]> {
    await delay(200);
    return loadStoredTokens();
  },

  /**
   * Get status of a specific bearer token
   */
  async getTokenStatus(bearerToken: string): Promise<TokenRecord> {
    await delay(180);
    const tokens = loadStoredTokens();
    const found = tokens.find((t) => t.tokenId === bearerToken);
    if (!found) {
      throw new Error('Token not found in TokenBank');
    }
    return found;
  },

  /**
   * Provision a new anonymous bearer key
   */
  async createToken(params: CreateTokenRequest): Promise<TokenRecord> {
    await delay(350);

    const allocated = Math.max(1000, Math.floor(params.allocatedTokens));
    const spendLimit = params.userSpendLimit !== undefined 
      ? Math.min(allocated, Math.max(0, Math.floor(params.userSpendLimit)))
      : allocated;

    if (params.userSpendLimit !== undefined && params.userSpendLimit > allocated) {
      throw new Error('User spend limit cannot exceed total purchased allocated tokens.');
    }

    const dailyLimit = params.dailyLimit ? Math.max(100, Math.floor(params.dailyLimit)) : null;

    // Generate high-entropy 32-byte hex token
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const tokenId = `tb_live_${randomHex}`;
    const masked = `${tokenId.slice(0, 11)}...${tokenId.slice(-4)}`;

    const newToken: TokenRecord = {
      tokenId,
      maskedToken: masked,
      totalAllocated: allocated,
      usedTokens: 0,
      remainingBalance: spendLimit,
      userSpendLimit: spendLimit,
      dailyLimit,
      dailyUsed: 0,
      dailyRemaining: dailyLimit,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    const tokens = loadStoredTokens();
    tokens.unshift(newToken);
    saveStoredTokens(tokens);

    // Record activity
    const activity = loadStoredActivity();
    activity.unshift({
      id: `act-${Date.now()}`,
      timestamp: new Date().toISOString(),
      endpoint: '/v1/tokens/create',
      method: 'POST',
      tokensDeducted: 0,
      status: 201,
      statusText: 'Created',
      latencyMs: 24,
      sanitizedHeadersCount: 0,
    });
    saveStoredActivity(activity);

    return newToken;
  },

  /**
   * Update limits dynamically
   */
  async updateLimits(bearerToken: string, params: UpdateLimitsRequest): Promise<TokenRecord> {
    await delay(250);
    const tokens = loadStoredTokens();
    const token = tokens.find((t) => t.tokenId === bearerToken);
    if (!token) {
      throw new Error('Token not found.');
    }

    if (params.userSpendLimit !== undefined) {
      if (params.userSpendLimit > token.totalAllocated) {
        throw new Error(`Spend limit cannot exceed total allocation of ${token.totalAllocated.toLocaleString()} tokens.`);
      }
      if (params.userSpendLimit < token.usedTokens) {
        throw new Error(`Spend limit cannot be lower than tokens already consumed (${token.usedTokens.toLocaleString()}).`);
      }
      token.userSpendLimit = Math.floor(params.userSpendLimit);
      token.remainingBalance = Math.max(0, token.userSpendLimit - token.usedTokens);
    }

    if (params.dailyLimit !== undefined) {
      if (params.dailyLimit !== null && params.dailyLimit > token.totalAllocated) {
        throw new Error(`Daily limit cannot exceed total allocation of ${token.totalAllocated.toLocaleString()} tokens.`);
      }
      token.dailyLimit = params.dailyLimit ? Math.floor(params.dailyLimit) : null;
      token.dailyRemaining = token.dailyLimit ? Math.max(0, token.dailyLimit - token.dailyUsed) : null;
    }

    saveStoredTokens(tokens);

    // Record activity
    const activity = loadStoredActivity();
    activity.unshift({
      id: `act-${Date.now()}`,
      timestamp: new Date().toISOString(),
      endpoint: '/v1/tokens/limits',
      method: 'PATCH',
      tokensDeducted: 0,
      status: 200,
      statusText: 'OK',
      latencyMs: 18,
      sanitizedHeadersCount: 0,
    });
    saveStoredActivity(activity);

    return token;
  },

  /**
   * Execute chat completion via the Privacy Proxy
   */
  async chatCompletionProxy(
    bearerToken: string,
    payload: ChatCompletionRequest,
    customHeaders?: Record<string, string>
  ): Promise<ChatCompletionResponse> {
    const startTime = performance.now();
    await delay(450);

    const tokens = loadStoredTokens();
    const token = tokens.find((t) => t.tokenId === bearerToken);
    if (!token) {
      throw new Error('Unauthorized: Bearer token does not exist in token bank.');
    }

    // 1. Estimate tokens
    const promptLength = payload.messages.reduce((acc, m) => acc + m.content.length, 0);
    const promptEst = Math.ceil(promptLength / 4);
    const maxTokens = payload.maxTokens || 250;
    const estimatedTokens = Math.max(20, promptEst + maxTokens);

    // 2. Pre-flight Check
    if (token.usedTokens + estimatedTokens > token.userSpendLimit) {
      const remaining = Math.max(0, token.userSpendLimit - token.usedTokens);
      throw new Error(`Spend limit reached. Estimated ${estimatedTokens} tokens required, but only ${remaining} tokens remain.`);
    }

    if (token.dailyLimit && token.dailyUsed + estimatedTokens > token.dailyLimit) {
      const dailyRem = Math.max(0, token.dailyLimit - token.dailyUsed);
      throw new Error(`Daily limit reached. Estimated ${estimatedTokens} tokens required, but only ${dailyRem} tokens remain today.`);
    }

    // 3. Header Sanitization Simulation
    const defaultStripped = [
      'X-Forwarded-For: 198.51.100.88',
      'Client-IP: 203.0.113.42',
      'Cookie: session_auth=private_key_99',
      'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      'Referer: https://internal.corp/admin',
      'Sec-CH-UA: "Chromium";v="128"',
    ];
    const strippedHeaders = customHeaders 
      ? Object.keys(customHeaders).map(k => `${k}: ${customHeaders[k]}`)
      : defaultStripped;

    const outboundHeaders = {
      'Authorization': 'Bearer [ENTERPRISE_UPSTREAM_KEY_MASKED]',
      'User-Agent': 'TokenBank-PrivacyProxy/1.0 (Privacy-Preserving; No-Logging)',
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // 4. Actual tokens & response generation
    const lastUserMsg = payload.messages[payload.messages.length - 1]?.content || 'Hello';
    const completionText = `[TokenBank Privacy Proxy] Processed request completely anonymously.\n\n` +
      `Zero client identifiers (IP, cookies, or user-agent telemetry) were transmitted downstream. ` +
      `Your prompt regarding "${lastUserMsg.slice(0, 60)}${lastUserMsg.length > 60 ? '...' : ''}" was evaluated successfully under token bank bearer authority.`;

    const actualPromptTokens = Math.max(12, Math.ceil(promptLength / 4));
    const actualCompletionTokens = Math.max(18, Math.ceil(completionText.length / 4));
    const actualDeducted = actualPromptTokens + actualCompletionTokens;
    const reconciliationDelta = actualDeducted - estimatedTokens;

    // 5. Update token balance
    token.usedTokens += actualDeducted;
    token.remainingBalance = Math.max(0, token.userSpendLimit - token.usedTokens);
    token.dailyUsed += actualDeducted;
    if (token.dailyLimit) {
      token.dailyRemaining = Math.max(0, token.dailyLimit - token.dailyUsed);
    }
    saveStoredTokens(tokens);

    const latencyMs = Math.round(performance.now() - startTime);

    // Record activity
    const activity = loadStoredActivity();
    activity.unshift({
      id: `act-${Date.now()}`,
      timestamp: new Date().toISOString(),
      endpoint: '/v1/chat/completions',
      method: 'POST',
      model: payload.model,
      tokensDeducted: actualDeducted,
      status: 200,
      statusText: 'OK',
      latencyMs,
      sanitizedHeadersCount: strippedHeaders.length,
    });
    saveStoredActivity(activity);

    return {
      id: `chatcmpl-${Date.now().toString(36)}`,
      model: payload.model,
      content: completionText,
      usage: {
        promptTokens: actualPromptTokens,
        completionTokens: actualCompletionTokens,
        totalTokens: actualDeducted,
      },
      accounting: {
        estimatedReserved: estimatedTokens,
        actualDeducted,
        reconciliationDelta,
        remainingBalance: token.remainingBalance,
      },
      sanitization: {
        strippedHeaders,
        outboundHeaders,
      },
      latencyMs,
      statusCode: 200,
    };
  },

  /**
   * Run Concurrency Stress Simulation
   */
  async runConcurrencySimulation(
    bearerToken: string,
    workerCount: number,
    tokensPerWorker: number
  ): Promise<ConcurrencySimulationResult> {
    await delay(350);
    const tokens = loadStoredTokens();
    const token = tokens.find((t) => t.tokenId === bearerToken);
    if (!token) {
      throw new Error('Token not found.');
    }

    const initialBalance = Math.max(0, token.userSpendLimit - token.usedTokens);
    let runningBalance = initialBalance;
    let grantedCount = 0;
    let rejectedCount = 0;

    const workers = [];

    for (let i = 1; i <= workerCount; i++) {
      const simulatedWorkerLatency = Math.round(10 + Math.random() * 25) / 10;
      if (runningBalance >= tokensPerWorker) {
        runningBalance -= tokensPerWorker;
        token.usedTokens += tokensPerWorker;
        grantedCount++;
        workers.push({
          workerId: i,
          success: true,
          statusCode: 200,
          tokensAllocated: tokensPerWorker,
          remainingAfter: runningBalance,
          latencyMs: simulatedWorkerLatency,
        });
      } else {
        rejectedCount++;
        workers.push({
          workerId: i,
          success: false,
          statusCode: 429,
          tokensAllocated: 0,
          remainingAfter: runningBalance,
          latencyMs: simulatedWorkerLatency,
        });
      }
    }

    token.remainingBalance = Math.max(0, token.userSpendLimit - token.usedTokens);
    saveStoredTokens(tokens);

    return {
      workerCount,
      tokensPerWorker,
      initialBalance,
      grantedCount,
      rejectedCount,
      finalBalance: token.remainingBalance,
      overdraftDetected: false,
      workers,
    };
  },

  /**
   * Get Recent Activity Log
   */
  async getActivityLog(): Promise<ApiActivityItem[]> {
    await delay(120);
    return loadStoredActivity();
  },

  /**
   * Reset / Re-seed mock data
   */
  async resetMockData(): Promise<void> {
    localStorage.removeItem(STORAGE_KEYS.TOKENS);
    localStorage.removeItem(STORAGE_KEYS.ACTIVITY);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_TOKEN_ID);
    await delay(150);
  }
};
