/**
 * Anonymous Token Bank & API Proxy - Core In-Memory Redis Engine
 * Implements exact Redis atomic key structures and Lua script semantics.
 */

import crypto from 'crypto';

export interface TokenRecord {
  tokenId: string; // tb_live_<hex>
  totalAllocated: number; // tb:{id}:total_allocated
  usedTokens: number; // tb:{id}:used_tokens
  userSpendLimit: number; // tb:{id}:user_spend_limit
  dailyLimit: number | null; // tb:{id}:daily_limit
  dailyUsed: Record<string, number>; // tb:{id}:daily_used:{date_str}
  createdAt: string;
}

export interface ReservationResult {
  success: boolean;
  code: 'OK' | 'TOKEN_NOT_FOUND' | 'SPEND_LIMIT_EXCEEDED' | 'DAILY_LIMIT_EXCEEDED';
  remainingTokens: number;
  spendLimit: number;
  estimated: number;
  message?: string;
}

export interface ReconcileResult {
  remainingTokens: number;
  newUsed: number;
  diff: number;
}

class TokenBankEngine {
  // In-memory Redis key-value store emulation with atomic synchronous locking
  private tokens: Map<string, TokenRecord> = new Map();
  // Lock mechanism simulating Redis single-threaded execution queue for Lua scripts
  private lockQueue: Promise<void> = Promise.resolve();

  constructor() {
    // Seed initial demo anonymous token for convenience
    this.createToken({
      allocatedTokens: 100000,
      userSpendLimit: 50000,
      dailyLimit: 15000,
      predefinedKey: 'tb_live_7e84a92c310b89f41de600829ac455b8'
    });
  }

  private async acquireAtomic<T>(fn: () => T | Promise<T>): Promise<T> {
    const prev = this.lockQueue;
    let resolver: () => void = () => {};
    this.lockQueue = new Promise((resolve) => {
      resolver = resolve;
    });
    await prev;
    try {
      return await fn();
    } finally {
      resolver();
    }
  }

  public getTodayDateStr(): string {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const d = String(now.getUTCDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }

  public async createToken(params: {
    allocatedTokens: number;
    userSpendLimit?: number;
    dailyLimit?: number | null;
    predefinedKey?: string;
  }): Promise<TokenRecord> {
    return this.acquireAtomic(() => {
      const allocated = Math.max(1, Math.floor(params.allocatedTokens));
      const spendLimit = params.userSpendLimit !== undefined 
        ? Math.min(allocated, Math.max(0, Math.floor(params.userSpendLimit)))
        : allocated;
      
      const dailyLimit = params.dailyLimit ? Math.max(1, Math.floor(params.dailyLimit)) : null;

      const bearerKey = params.predefinedKey || `tb_live_${crypto.randomBytes(24).toString('hex')}`;

      const record: TokenRecord = {
        tokenId: bearerKey,
        totalAllocated: allocated,
        usedTokens: 0,
        userSpendLimit: spendLimit,
        dailyLimit: dailyLimit,
        dailyUsed: {},
        createdAt: new Date().toISOString()
      };

      this.tokens.set(bearerKey, record);
      return { ...record };
    });
  }

  public async updateLimits(
    bearerKey: string,
    params: { userSpendLimit?: number; dailyLimit?: number | null }
  ): Promise<{ success: boolean; record?: TokenRecord; error?: string }> {
    return this.acquireAtomic(() => {
      const record = this.tokens.get(bearerKey);
      if (!record) {
        return { success: false, error: 'TOKEN_NOT_FOUND' };
      }

      if (params.userSpendLimit !== undefined) {
        if (params.userSpendLimit > record.totalAllocated) {
          return { success: false, error: 'SPEND_LIMIT_EXCEEDS_ALLOCATION' };
        }
        if (params.userSpendLimit < 0) {
          return { success: false, error: 'INVALID_SPEND_LIMIT' };
        }
        record.userSpendLimit = Math.floor(params.userSpendLimit);
      }

      if (params.dailyLimit !== undefined) {
        if (params.dailyLimit === null || params.dailyLimit <= 0) {
          record.dailyLimit = null;
        } else {
          if (params.dailyLimit > record.totalAllocated) {
            return { success: false, error: 'DAILY_LIMIT_EXCEEDS_ALLOCATION' };
          }
          record.dailyLimit = Math.floor(params.dailyLimit);
        }
      }

      return { success: true, record: { ...record } };
    });
  }

  public async getStatus(bearerKey: string): Promise<TokenRecord | null> {
    return this.acquireAtomic(() => {
      const record = this.tokens.get(bearerKey);
      if (!record) return null;
      return { ...record };
    });
  }

  /**
   * Atomic Pre-flight Lua Script Emulation
   */
  public async reserveTokens(bearerKey: string, estimatedTokens: number): Promise<ReservationResult> {
    return this.acquireAtomic(() => {
      const record = this.tokens.get(bearerKey);
      if (!record) {
        return {
          success: false,
          code: 'TOKEN_NOT_FOUND',
          remainingTokens: 0,
          spendLimit: 0,
          estimated: estimatedTokens,
          message: 'Bearer token does not exist in token bank.'
        };
      }

      const estimated = Math.max(1, Math.floor(estimatedTokens));
      const today = this.getTodayDateStr();
      const currentDailyUsed = record.dailyUsed[today] || 0;

      // 1. Check Hard Spend Limit
      if (record.usedTokens + estimated > record.userSpendLimit) {
        const remaining = Math.max(0, record.userSpendLimit - record.usedTokens);
        return {
          success: false,
          code: 'SPEND_LIMIT_EXCEEDED',
          remainingTokens: remaining,
          spendLimit: record.userSpendLimit,
          estimated,
          message: `Spend limit exceeded. Required ~${estimated} tokens, only ${remaining} remaining.`
        };
      }

      // 2. Check Daily Limit
      if (record.dailyLimit !== null && record.dailyLimit > 0) {
        if (currentDailyUsed + estimated > record.dailyLimit) {
          const dailyRemaining = Math.max(0, record.dailyLimit - currentDailyUsed);
          return {
            success: false,
            code: 'DAILY_LIMIT_EXCEEDED',
            remainingTokens: dailyRemaining,
            spendLimit: record.dailyLimit,
            estimated,
            message: `Daily rate limit reached. Required ~${estimated} tokens, only ${dailyRemaining} available today.`
          };
        }
      }

      // 3. Atomically Commit Reservation
      record.usedTokens += estimated;
      record.dailyUsed[today] = currentDailyUsed + estimated;

      const remainingAfter = Math.max(0, record.userSpendLimit - record.usedTokens);

      return {
        success: true,
        code: 'OK',
        remainingTokens: remainingAfter,
        spendLimit: record.userSpendLimit,
        estimated
      };
    });
  }

  /**
   * Atomic Post-Call Reconciliation Lua Script Emulation
   */
  public async reconcileTokens(
    bearerKey: string,
    estimatedTokens: number,
    actualTokens: number
  ): Promise<ReconcileResult> {
    return this.acquireAtomic(() => {
      const record = this.tokens.get(bearerKey);
      if (!record) {
        return { remainingTokens: 0, newUsed: 0, diff: 0 };
      }

      const estimated = Math.max(0, Math.floor(estimatedTokens));
      const actual = Math.max(0, Math.floor(actualTokens));
      const diff = actual - estimated; // positive if underestimated, negative if overestimated

      record.usedTokens = Math.max(0, record.usedTokens + diff);

      const today = this.getTodayDateStr();
      if (record.dailyUsed[today] !== undefined) {
        record.dailyUsed[today] = Math.max(0, record.dailyUsed[today] + diff);
      }

      const remaining = Math.max(0, record.userSpendLimit - record.usedTokens);

      return {
        remainingTokens: remaining,
        newUsed: record.usedTokens,
        diff
      };
    });
  }

  public async listTokens(): Promise<Array<{ tokenId: string; masked: string; allocated: number; used: number; limit: number; remaining: number }>> {
    return this.acquireAtomic(() => {
      const list: Array<{ tokenId: string; masked: string; allocated: number; used: number; limit: number; remaining: number }> = [];
      for (const [key, t] of this.tokens.entries()) {
        list.push({
          tokenId: key,
          masked: `${key.slice(0, 11)}...${key.slice(-4)}`,
          allocated: t.totalAllocated,
          used: t.usedTokens,
          limit: t.userSpendLimit,
          remaining: Math.max(0, t.userSpendLimit - t.usedTokens)
        });
      }
      return list;
    });
  }
}

export const tokenBank = new TokenBankEngine();
