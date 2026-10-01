import React, { useState } from 'react';
import { X, KeyRound, Check, Copy, AlertTriangle, ShieldCheck } from 'lucide-react';
import { TokenRecord, TokenBankApi } from '../services/api';

interface CreateTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newToken: TokenRecord) => void;
}

export const CreateTokenModal: React.FC<CreateTokenModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [allocatedTokens, setAllocatedTokens] = useState<number>(250000);
  const [spendLimit, setSpendLimit] = useState<number>(150000);
  const [dailyLimit, setDailyLimit] = useState<string>('25000');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Success view state
  const [createdToken, setCreatedToken] = useState<TokenRecord | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handlePreset = (amount: number) => {
    setAllocatedTokens(amount);
    setSpendLimit(Math.floor(amount * 0.7));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (spendLimit > allocatedTokens) {
      setErrorMsg('User Spend Limit cannot exceed total purchased tokens.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newToken = await TokenBankApi.createToken({
        allocatedTokens,
        userSpendLimit: spendLimit,
        dailyLimit: dailyLimit.trim() ? Number(dailyLimit) : null,
      });

      setCreatedToken(newToken);
      onCreated(newToken);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to provision token.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToken = () => {
    if (createdToken) {
      navigator.clipboard.writeText(createdToken.tokenId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleModalClose = () => {
    setCreatedToken(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-100">Provision Anonymous Bearer Key</h3>
              <p className="text-[11px] text-neutral-400">Zero personal data · Pure bearer authority</p>
            </div>
          </div>

          <button
            onClick={handleModalClose}
            className="text-neutral-500 hover:text-neutral-300 transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {createdToken ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-semibold">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Anonymous Key Provisioned Successfully!</span>
              </div>
              <p className="text-neutral-300 leading-relaxed text-[11px]">
                This bearer token is your ONLY credential. No email or recovery mechanism exists. Store it securely.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-neutral-400 uppercase tracking-wider block">
                Your Bearer Secret
              </label>
              <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl font-mono text-xs text-emerald-400 break-all select-all flex items-center justify-between gap-2">
                <span>{createdToken.tokenId}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl">
                <span className="text-[10px] text-neutral-500 block uppercase">Allocated Balance</span>
                <span className="font-bold text-neutral-100">{createdToken.totalAllocated.toLocaleString()} tokens</span>
              </div>
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl">
                <span className="text-[10px] text-neutral-500 block uppercase">Active Spend Cap</span>
                <span className="font-bold text-neutral-100">{createdToken.userSpendLimit.toLocaleString()} tokens</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={copyToken}
                className="flex-1 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard' : 'Copy Bearer Secret'}</span>
              </button>
              <button
                onClick={handleModalClose}
                className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-xl transition-colors"
              >
                Close & Use Key
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Purchase presets */}
            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1.5">
                1. Token Allocation (Purchased Balance)
              </label>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {[50000, 100000, 250000, 500000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handlePreset(amt)}
                    className={`py-1.5 text-xs font-mono rounded-lg border transition-colors ${
                      allocatedTokens === amt
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold'
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
                  if (spendLimit > val) setSpendLimit(val);
                }}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-100 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            {/* Spend Limit */}
            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1">
                2. User Spend Limit (Hard Stop Ceiling)
              </label>
              <input
                type="number"
                min="100"
                max={allocatedTokens}
                value={spendLimit}
                onChange={(e) => setSpendLimit(Number(e.target.value))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-100 focus:outline-none focus:border-emerald-500"
                required
              />
              <span className="text-[11px] text-neutral-500 block mt-1">
                Hard stop ceiling (must be $\le$ {allocatedTokens.toLocaleString()} tokens).
              </span>
            </div>

            {/* Daily limit */}
            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1">
                3. Daily Rate Limit (Optional)
              </label>
              <input
                type="number"
                min="0"
                max={allocatedTokens}
                placeholder="Optional daily cap (e.g. 25000)"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleModalClose}
                className="px-4 py-2 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-semibold text-xs rounded-xl transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Provisioning...' : 'Provision Anonymous Token'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
