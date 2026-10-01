import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  Lock,
  Clock,
  AlertTriangle,
  Check,
  RotateCcw,
  ShieldAlert,
  ArrowRight,
  TrendingDown
} from 'lucide-react';
import { TokenRecord, UpdateLimitsRequest } from '../services/api';

interface DynamicLimitsViewProps {
  token: TokenRecord | null;
  onUpdateLimits: (params: UpdateLimitsRequest) => Promise<void>;
  onOpenCreateModal: () => void;
}

export const DynamicLimitsView: React.FC<DynamicLimitsViewProps> = ({
  token,
  onUpdateLimits,
  onOpenCreateModal,
}) => {
  const [spendLimit, setSpendLimit] = useState<number>(token?.userSpendLimit || 100000);
  const [dailyLimit, setDailyLimit] = useState<string>(
    token?.dailyLimit !== null && token?.dailyLimit !== undefined ? String(token.dailyLimit) : ''
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState(false);

  useEffect(() => {
    if (token) {
      setSpendLimit(token.userSpendLimit);
      setDailyLimit(token.dailyLimit !== null ? String(token.dailyLimit) : '');
    }
  }, [token?.userSpendLimit, token?.dailyLimit, token?.tokenId]);

  if (!token) {
    return (
      <div className="py-20 text-center max-w-md mx-auto">
        <SlidersHorizontal className="w-10 h-10 text-neutral-500 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-neutral-200 mb-1">No Active Token</h3>
        <p className="text-xs text-neutral-400 mb-6">
          Provision an anonymous token to configure dynamic spending ceilings and daily rate-limits.
        </p>
        <button
          onClick={onOpenCreateModal}
          className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-semibold text-xs rounded-lg transition-colors"
        >
          Provision Anonymous Key
        </button>
      </div>
    );
  }

  const handleReset = () => {
    setSpendLimit(token.userSpendLimit);
    setDailyLimit(token.dailyLimit !== null ? String(token.dailyLimit) : '');
    setErrorMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(false);

    // Validation 1: Hard stop cannot exceed total allocated purchase
    if (spendLimit > token.totalAllocated) {
      setErrorMsg(`Hard Spend Limit (${spendLimit.toLocaleString()}) cannot exceed total purchased tokens (${token.totalAllocated.toLocaleString()}).`);
      return;
    }

    // Validation 2: Hard stop cannot be lower than tokens already used
    if (spendLimit < token.usedTokens) {
      setErrorMsg(`Spend Limit cannot be lower than tokens already spent (${token.usedTokens.toLocaleString()}).`);
      return;
    }

    const parsedDaily = dailyLimit.trim() ? Number(dailyLimit) : null;
    if (parsedDaily !== null && parsedDaily > token.totalAllocated) {
      setErrorMsg(`Daily limit cannot exceed total purchased tokens (${token.totalAllocated.toLocaleString()}).`);
      return;
    }

    setIsSaving(true);
    try {
      await onUpdateLimits({
        userSpendLimit: spendLimit,
        dailyLimit: parsedDaily,
      });
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update token limits.');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    spendLimit !== token.userSpendLimit ||
    (dailyLimit.trim() === '' ? null : Number(dailyLimit)) !== token.dailyLimit;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-emerald-400" />
          Dynamic Limits & Hard Stop Policy
        </h3>
        <p className="text-xs text-neutral-400 mt-0.5">
          Configure real-time spending ceilings and daily rate-limits. Updates are committed atomically via <code className="font-mono text-emerald-400">PATCH /v1/tokens/limits</code>.
        </p>
      </div>

      {/* Main Limits Form Card */}
      <form onSubmit={handleSave} className="border border-neutral-800 bg-neutral-900/40 rounded-2xl p-6 space-y-6">
        {/* Token Context Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-neutral-800/80">
          <div>
            <span className="text-xs text-neutral-400">Target Bearer Token</span>
            <div className="font-mono text-xs text-neutral-200 font-semibold mt-0.5">
              {token.maskedToken}
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-neutral-400">
            <span>Total Purchased: <strong className="text-neutral-100">{token.totalAllocated.toLocaleString()}</strong></span>
            <span>·</span>
            <span>Already Consumed: <strong className="text-amber-400">{token.usedTokens.toLocaleString()}</strong></span>
          </div>
        </div>

        {/* Control 1: User Spend Limit */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <label className="text-xs font-semibold text-neutral-200 flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                User Spend Limit (Hard Stop Ceiling)
              </label>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Maximum token spend allowed. Downstream calls abort with HTTP 429 when <code className="font-mono text-neutral-300">used_tokens + estimated &gt; spend_limit</code>.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min={token.usedTokens}
                max={token.totalAllocated}
                step="1000"
                value={spendLimit}
                onChange={(e) => setSpendLimit(Number(e.target.value))}
                className="w-36 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs font-mono text-neutral-100 text-right focus:outline-none focus:border-emerald-500 font-semibold"
              />
              <span className="text-xs font-mono text-neutral-500">tokens</span>
            </div>
          </div>

          {/* Interactive Range Slider */}
          <div className="space-y-1.5 pt-1">
            <input
              type="range"
              min={token.usedTokens}
              max={token.totalAllocated}
              step="1000"
              value={spendLimit}
              onChange={(e) => setSpendLimit(Number(e.target.value))}
              className="w-full accent-emerald-400 h-2 bg-neutral-950 rounded-lg cursor-pointer border border-neutral-800"
            />
            <div className="flex justify-between text-[11px] font-mono text-neutral-500">
              <span>Min: {token.usedTokens.toLocaleString()} (used)</span>
              <span className="text-neutral-300 font-bold">{spendLimit.toLocaleString()} tokens</span>
              <span>Max: {token.totalAllocated.toLocaleString()} (purchased)</span>
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-800/80" />

        {/* Control 2: Daily Rate Limit */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <label className="text-xs font-semibold text-neutral-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                Daily Rate Limit (UTC Window)
              </label>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Optional daily burn ceiling. Stored in Redis with automatic TTL expiring at 00:00 UTC.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max={token.totalAllocated}
                step="1000"
                placeholder="Disabled"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
                className="w-36 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs font-mono text-neutral-100 text-right focus:outline-none focus:border-emerald-500 font-semibold"
              />
              <span className="text-xs font-mono text-neutral-500">tokens / day</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span>Quick presets:</span>
            {[10000, 25000, 50000, 100000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setDailyLimit(String(preset))}
                className="px-2 py-0.5 rounded bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 font-mono text-[11px] text-neutral-400 hover:text-neutral-200 transition-colors"
              >
                {(preset / 1000).toFixed(0)}k/day
              </button>
            ))}
            <button
              type="button"
              onClick={() => setDailyLimit('')}
              className="px-2 py-0.5 rounded bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 font-mono text-[11px] text-neutral-500 hover:text-rose-400 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Error / Success Feedback */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs flex items-center gap-2.5">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Token limits updated successfully! Pre-flight checks will enforce the new limits immediately.</span>
          </div>
        )}

        {/* Submit Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-neutral-800/80">
          <button
            type="button"
            onClick={handleReset}
            disabled={!hasChanges || isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200 disabled:opacity-40 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Current</span>
          </button>

          <button
            type="submit"
            disabled={!hasChanges || isSaving}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-semibold text-xs rounded-lg transition-colors disabled:opacity-50 shadow-sm"
          >
            {isSaving ? (
              <span>Saving Changes...</span>
            ) : (
              <span>Save Limit Policies</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
