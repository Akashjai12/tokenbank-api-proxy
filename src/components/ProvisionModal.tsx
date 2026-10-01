import React, { useState } from 'react';
import { X, Key, Shield, AlertTriangle, Check, Copy, Sparkles } from 'lucide-react';

interface ProvisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (token: string) => void;
}

export const ProvisionModal: React.FC<ProvisionModalProps> = ({ isOpen, onClose, onCreated }) => {
  const [allocatedTokens, setAllocatedTokens] = useState<number>(100000);
  const [userSpendLimit, setUserSpendLimit] = useState<number>(50000);
  const [dailyLimit, setDailyLimit] = useState<string>('15000');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success view with newly created token
  const [createdToken, setCreatedToken] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleAllocatePreset = (amount: number) => {
    setAllocatedTokens(amount);
    setUserSpendLimit(Math.floor(amount * 0.75));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (userSpendLimit > allocatedTokens) {
      setError('user_spend_limit cannot exceed allocated_tokens.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/v1/tokens/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allocated_tokens: allocatedTokens,
          user_spend_limit: userSpendLimit,
          daily_limit: dailyLimit.trim() ? Number(dailyLimit) : null
        })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setCreatedToken(data);
      onCreated(data.token);
    } catch (err: any) {
      setError(err.message || 'Creation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToken = () => {
    if (createdToken?.token) {
      navigator.clipboard.writeText(createdToken.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-emerald-500/10 text-emerald-400">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-100">Provision Anonymous Bearer Key</h3>
              <span className="text-[11px] text-neutral-400">Zero personal data · Pure bearer authority</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-300 transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {createdToken ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Anonymous Bearer Key Initialized in Redis!</span>
              </div>
              <p className="text-neutral-300 leading-relaxed text-[11px]">
                {createdToken.warning}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-400">Your Bearer Secret Token</label>
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded font-mono text-xs text-emerald-400 break-all select-all flex items-center justify-between gap-2">
                <span>{createdToken.token}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded">
                <span className="text-[10px] text-neutral-500 block">Total Balance</span>
                <span className="font-bold text-neutral-200">{createdToken.total_allocated.toLocaleString()} tokens</span>
              </div>
              <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded">
                <span className="text-[10px] text-neutral-500 block">Spend Cap</span>
                <span className="font-bold text-neutral-200">{createdToken.user_spend_limit.toLocaleString()} tokens</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={copyToken}
                className="flex-1 py-2 bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-medium text-xs rounded transition-colors flex items-center justify-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard' : 'Copy Bearer Secret'}</span>
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs rounded transition-colors"
              >
                Close & Use Token
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Purchase presets */}
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                1. Token Allocation (Simulated Purchase)
              </label>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {[25000, 50000, 100000, 250000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleAllocatePreset(amt)}
                    className={`py-1.5 text-xs font-mono rounded border transition-colors ${
                      allocatedTokens === amt
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {(amt / 1000).toFixed(0)}k
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="1000"
                step="1000"
                value={allocatedTokens}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setAllocatedTokens(val);
                  if (userSpendLimit > val) setUserSpendLimit(val);
                }}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs font-mono text-neutral-100 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            {/* Spend limit */}
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                2. User Spend Limit (Hard Stop Ceiling)
              </label>
              <input
                type="number"
                min="100"
                max={allocatedTokens}
                value={userSpendLimit}
                onChange={(e) => setUserSpendLimit(Number(e.target.value))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs font-mono text-neutral-100 focus:outline-none focus:border-emerald-500"
                required
              />
              <span className="text-[11px] text-neutral-500 block mt-1">
                Must be $\le$ allocated purchase ({allocatedTokens.toLocaleString()} tokens).
              </span>
            </div>

            {/* Daily limit */}
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                3. Daily Rate Limit (Optional)
              </label>
              <input
                type="number"
                min="0"
                max={allocatedTokens}
                placeholder="Optional daily cap (e.g. 10000)"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs font-mono text-neutral-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {error && (
              <div className="p-3 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-medium text-xs rounded transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Generating Bearer Key...' : 'Provision Anonymous Token'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
