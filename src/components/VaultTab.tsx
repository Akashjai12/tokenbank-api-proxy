import React, { useState } from 'react';
import {
  ShieldAlert,
  Key,
  Copy,
  Check,
  Lock,
  Sliders,
  AlertCircle,
  Clock,
  Coins,
  ArrowUpRight,
  TrendingDown,
  ShieldCheck
} from 'lucide-react';

interface TokenStatus {
  token_id: string;
  total_allocated: number;
  used_tokens: number;
  remaining_balance: number;
  user_spend_limit: number;
  daily_limit: number | null;
  daily_used: number;
  daily_remaining: number | null;
  status: string;
}

interface VaultTabProps {
  activeToken: string;
  status: TokenStatus | null;
  isLoading: boolean;
  onRefresh: () => void;
  onUpdateLimits: (spendLimit: number, dailyLimit: number | null) => Promise<boolean>;
  onOpenCreateModal: () => void;
}

export const VaultTab: React.FC<VaultTabProps> = ({
  activeToken,
  status,
  isLoading,
  onRefresh,
  onUpdateLimits,
  onOpenCreateModal,
}) => {
  const [copied, setCopied] = useState(false);
  const [showFullToken, setShowFullToken] = useState(false);

  // Limits edit state
  const [newSpendLimit, setNewSpendLimit] = useState<number>(status?.user_spend_limit || 50000);
  const [newDailyLimit, setNewDailyLimit] = useState<string>(
    status?.daily_limit ? String(status.daily_limit) : ''
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // Sync state if status updates
  React.useEffect(() => {
    if (status) {
      setNewSpendLimit(status.user_spend_limit);
      setNewDailyLimit(status.daily_limit ? String(status.daily_limit) : '');
    }
  }, [status?.user_spend_limit, status?.daily_limit]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(activeToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveLimits = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateError(null);
    setUpdateSuccess(false);

    if (status && newSpendLimit > status.total_allocated) {
      setUpdateError(`Hard spend limit cannot exceed total purchased tokens (${status.total_allocated.toLocaleString()})`);
      return;
    }

    const dailyVal = newDailyLimit.trim() === '' ? null : Number(newDailyLimit);
    if (dailyVal !== null && status && dailyVal > status.total_allocated) {
      setUpdateError(`Daily limit cannot exceed total purchased tokens (${status.total_allocated.toLocaleString()})`);
      return;
    }

    setIsUpdating(true);
    try {
      const ok = await onUpdateLimits(newSpendLimit, dailyVal);
      if (ok) {
        setUpdateSuccess(true);
        setTimeout(() => setUpdateSuccess(false), 3000);
      }
    } catch (err: any) {
      setUpdateError(err.message || 'Failed to update limits');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!activeToken || !status) {
    return (
      <div className="py-16 text-center max-w-md mx-auto">
        <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto mb-4 text-neutral-400">
          <Key className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-neutral-200 mb-2">No Active Bearer Token</h3>
        <p className="text-sm text-neutral-400 mb-6">
          Provision an anonymous bearer key to start storing credits, setting hard stops, and proxying requests.
        </p>
        <button
          onClick={onOpenCreateModal}
          className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-medium text-sm rounded transition-colors"
        >
          Provision Anonymous Key
        </button>
      </div>
    );
  }

  const spendPercent = status.user_spend_limit > 0
    ? Math.min(100, Math.round((status.used_tokens / status.user_spend_limit) * 100))
    : 0;

  const dailyPercent = status.daily_limit && status.daily_limit > 0
    ? Math.min(100, Math.round((status.daily_used / status.daily_limit) * 100))
    : 0;

  return (
    <div className="space-y-6">
      {/* Privacy Notice Banner */}
      <div className="border border-neutral-800 bg-neutral-900/60 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
              Decoupled Privacy Architecture
              <span className="text-xs text-neutral-400 font-normal">· Zero PII Stored</span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5 max-w-2xl leading-relaxed">
              This token has no user ID, email, or IP address attached. Authorization is purely governed by your high-entropy secret bearer key. If this key is lost, funds cannot be recovered.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/60 bg-emerald-500/5 px-3 py-1.5 rounded transition-colors whitespace-nowrap shrink-0"
        >
          + Provision New Key
        </button>
      </div>

      {/* Active Bearer Secret Bar */}
      <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <Key className="w-4 h-4 text-emerald-400" />
            <span className="font-medium text-neutral-300">Active Anonymous Bearer Secret</span>
            <span className="text-neutral-600">/</span>
            <span className="font-mono text-[11px] text-neutral-500">tb_live_*</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFullToken(!showFullToken)}
              className="text-xs text-neutral-400 hover:text-neutral-200 px-2 py-1 rounded bg-neutral-800/60 border border-neutral-700/60 transition-colors"
            >
              {showFullToken ? 'Mask Secret' : 'Reveal Secret'}
            </button>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 text-xs text-neutral-200 hover:text-white px-2.5 py-1 rounded bg-neutral-800 border border-neutral-700 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Key'}</span>
            </button>
          </div>
        </div>

        <div className="mt-3 p-3 bg-neutral-950 border border-neutral-800 rounded font-mono text-xs text-emerald-400 break-all select-all flex items-center justify-between gap-2">
          <span>{showFullToken ? activeToken : `${activeToken.slice(0, 16)}••••••••••••••••••••••••••••••••••••••••••••••••${activeToken.slice(-6)}`}</span>
        </div>
      </div>

      {/* Telemetry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Allocated */}
        <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-4">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">Total Purchased Balance</span>
            <Coins className="w-4 h-4 text-neutral-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-100 tabular-nums">
            {status.total_allocated.toLocaleString()}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1 font-mono">
            tb:&#123;id&#125;:total_allocated
          </div>
        </div>

        {/* Remaining Spendable */}
        <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-4">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">Remaining Quota</span>
            <span className="text-[11px] text-emerald-400 font-mono">
              {Math.max(0, 100 - spendPercent)}% free
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            {status.remaining_balance.toLocaleString()}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            Available until hard stop ceiling
          </div>
        </div>

        {/* Used Tokens */}
        <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-4">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">Total Tokens Used</span>
            <TrendingDown className="w-4 h-4 text-neutral-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-100 tabular-nums">
            {status.used_tokens.toLocaleString()}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1 font-mono">
            tb:&#123;id&#125;:used_tokens
          </div>
        </div>

        {/* Hard Spend Limit */}
        <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-4">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">Active Spend Limit</span>
            <Lock className="w-4 h-4 text-amber-500/70" />
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-100 tabular-nums">
            {status.user_spend_limit.toLocaleString()}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1 font-mono">
            tb:&#123;id&#125;:user_spend_limit
          </div>
        </div>
      </div>

      {/* Quota Progress & Daily Rate Limit Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hard Spend Limit Meter */}
        <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm font-semibold text-neutral-200">Hard Stop Usage Meter</h4>
            </div>
            <span className="text-xs font-mono text-neutral-400 tabular-nums">
              {status.used_tokens.toLocaleString()} / {status.user_spend_limit.toLocaleString()}
            </span>
          </div>

          <div className="w-full bg-neutral-950 h-2.5 rounded-full overflow-hidden border border-neutral-800">
            <div
              className={`h-full transition-all duration-500 ${
                spendPercent > 90
                  ? 'bg-rose-500'
                  : spendPercent > 70
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              }`}
              style={{ width: `${spendPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>0 tokens</span>
            <span className="font-mono text-neutral-300">{spendPercent}% capacity consumed</span>
            <span>{status.user_spend_limit.toLocaleString()} cap</span>
          </div>

          <p className="text-xs text-neutral-400 leading-relaxed pt-1 border-t border-neutral-800/80">
            Once <span className="font-mono text-neutral-200">used_tokens</span> hits this limit, the privacy proxy immediately rejects all downstream requests with <code className="font-mono text-amber-300">HTTP 429 Too Many Requests</code>.
          </p>
        </div>

        {/* Daily Rate Limit Meter */}
        <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h4 className="text-sm font-semibold text-neutral-200">Daily Rate Limit (UTC Window)</h4>
            </div>
            <span className="text-xs font-mono text-neutral-400 tabular-nums">
              {status.daily_limit ? `${status.daily_used.toLocaleString()} / ${status.daily_limit.toLocaleString()}` : 'Disabled'}
            </span>
          </div>

          {status.daily_limit ? (
            <>
              <div className="w-full bg-neutral-950 h-2.5 rounded-full overflow-hidden border border-neutral-800">
                <div
                  className={`h-full transition-all duration-500 ${
                    dailyPercent > 90
                      ? 'bg-rose-500'
                      : dailyPercent > 70
                      ? 'bg-amber-400'
                      : 'bg-cyan-400'
                  }`}
                  style={{ width: `${dailyPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>Used Today: {status.daily_used.toLocaleString()}</span>
                <span className="font-mono text-cyan-300">{status.daily_remaining?.toLocaleString()} remaining</span>
                <span>Limit: {status.daily_limit.toLocaleString()}</span>
              </div>
            </>
          ) : (
            <div className="p-4 bg-neutral-950/60 border border-dashed border-neutral-800 rounded text-center text-xs text-neutral-500">
              No daily rate limit configured. Requests are only bounded by the global spend limit.
            </div>
          )}

          <p className="text-xs text-neutral-400 leading-relaxed pt-1 border-t border-neutral-800/80">
            Stored under <code className="font-mono text-neutral-300">tb:&#123;id&#125;:daily_used:YYYYMMDD</code> with an auto-expiring TTL resetting at 00:00 UTC.
          </p>
        </div>
      </div>

      {/* Dynamic Limits Modifier Form */}
      <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h4 className="text-sm font-semibold text-neutral-100">Dynamic Policy & Limit Control</h4>
          </div>
          <span className="text-xs text-neutral-500 font-mono">PATCH /v1/tokens/limits</span>
        </div>

        <form onSubmit={handleSaveLimits} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Hard Stop Spend Limit (Tokens)
              </label>
              <input
                type="number"
                min={status.used_tokens}
                max={status.total_allocated}
                value={newSpendLimit}
                onChange={(e) => setNewSpendLimit(Number(e.target.value))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm font-mono text-neutral-100 focus:outline-none focus:border-emerald-500 transition-colors"
                required
              />
              <span className="block text-[11px] text-neutral-500 mt-1">
                Max ceiling: {status.total_allocated.toLocaleString()} tokens (purchased balance).
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Daily Rate Limit (Tokens / Day, Optional)
              </label>
              <input
                type="number"
                min="0"
                max={status.total_allocated}
                placeholder="Leave blank to disable daily rate limit"
                value={newDailyLimit}
                onChange={(e) => setNewDailyLimit(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm font-mono text-neutral-100 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <span className="block text-[11px] text-neutral-500 mt-1">
                Leave blank or 0 to disable daily rate limits.
              </span>
            </div>
          </div>

          {updateError && (
            <div className="p-3 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{updateError}</span>
            </div>
          )}

          {updateSuccess && (
            <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>Limits updated successfully in Redis atomic storage!</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={isUpdating}
              className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-medium text-xs rounded transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isUpdating ? 'Executing Lua Script...' : 'Update Limits Atomically'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
