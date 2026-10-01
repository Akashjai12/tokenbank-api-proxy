import React, { useState } from 'react';
import {
  KeyRound,
  Copy,
  Check,
  Eye,
  EyeOff,
  Plus,
  ShieldCheck,
  Lock,
  Coins,
  Clock,
  Sparkles,
  ArrowRight,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { TokenRecord } from '../services/api';

interface TokenVaultViewProps {
  activeToken: TokenRecord | null;
  allTokens: TokenRecord[];
  onSelectToken: (tokenId: string) => void;
  onOpenCreateModal: () => void;
  onNavigateTab: (tab: any) => void;
}

export const TokenVaultView: React.FC<TokenVaultViewProps> = ({
  activeToken,
  allTokens,
  onSelectToken,
  onOpenCreateModal,
  onNavigateTab,
}) => {
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyToken = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!activeToken) {
    return (
      <div className="py-20 text-center max-w-md mx-auto">
        <KeyRound className="w-10 h-10 text-neutral-500 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-neutral-200 mb-1">No Active Token in Vault</h3>
        <p className="text-xs text-neutral-400 mb-6">
          Generate an anonymous bearer secret to manage funds, enforce spend stops, and route proxied completions.
        </p>
        <button
          onClick={onOpenCreateModal}
          className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-semibold text-xs rounded-lg transition-colors"
        >
          Provision Anonymous Token
        </button>
      </div>
    );
  }

  const spendPercent = activeToken.userSpendLimit > 0
    ? Math.min(100, Math.round((activeToken.usedTokens / activeToken.userSpendLimit) * 100))
    : 0;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-emerald-400" />
            Anonymous Token Vault
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Cryptographic bearer keys with pure self-contained authority. Zero personal identifiers linked.
          </p>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-400 hover:bg-emerald-300 text-neutral-950 text-xs font-semibold rounded-lg transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Provision New Key</span>
        </button>
      </div>

      {/* Primary Anonymous Token Card */}
      <div className="border border-neutral-800 bg-gradient-to-b from-neutral-900/60 to-neutral-950 rounded-2xl p-6 space-y-6 relative overflow-hidden shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800/80 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-700/80 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-neutral-100">Primary Anonymous Bearer Key</h4>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold uppercase ${
                    activeToken.status === 'active'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                  }`}
                >
                  ● {activeToken.status}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Created: {new Date(activeToken.createdAt).toLocaleDateString()} · 256-bit Random Hex Entropy
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => setShowSecret(!showSecret)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-300 hover:text-neutral-100 bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/60 rounded-lg transition-colors"
            >
              {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showSecret ? 'Mask Secret' : 'Reveal Secret'}</span>
            </button>

            <button
              onClick={() => copyToken(activeToken.tokenId)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Key'}</span>
            </button>
          </div>
        </div>

        {/* Masked Secret Key Display */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono text-neutral-400 uppercase tracking-wider block">
            Bearer Secret Token (Authorization: Bearer &lt;token&gt;)
          </label>
          <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl font-mono text-xs text-emerald-400 flex items-center justify-between gap-4 break-all select-all">
            <span>
              {showSecret
                ? activeToken.tokenId
                : `${activeToken.tokenId.slice(0, 16)}••••••••••••••••••••••••••••••••••••••••••••••••${activeToken.tokenId.slice(-6)}`}
            </span>
          </div>
        </div>

        {/* Token Quota Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          <div className="p-3.5 bg-neutral-950/80 border border-neutral-800 rounded-xl">
            <span className="text-[11px] text-neutral-500 block">Total Purchased</span>
            <span className="text-xl font-bold font-mono text-neutral-100 tabular-nums">
              {activeToken.totalAllocated.toLocaleString()}
            </span>
          </div>

          <div className="p-3.5 bg-neutral-950/80 border border-neutral-800 rounded-xl">
            <span className="text-[11px] text-neutral-500 block">Active Spend Cap</span>
            <span className="text-xl font-bold font-mono text-neutral-100 tabular-nums">
              {activeToken.userSpendLimit.toLocaleString()}
            </span>
          </div>

          <div className="p-3.5 bg-neutral-950/80 border border-neutral-800 rounded-xl">
            <span className="text-[11px] text-neutral-500 block">Tokens Consumed</span>
            <span className="text-xl font-bold font-mono text-neutral-100 tabular-nums">
              {activeToken.usedTokens.toLocaleString()}
            </span>
          </div>

          <div className="p-3.5 bg-neutral-950/80 border border-neutral-800 rounded-xl">
            <span className="text-[11px] text-neutral-500 block">Remaining Spendable</span>
            <span className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
              {activeToken.remainingBalance.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Warning Callout */}
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed">
            <strong>Unrecoverable Credential Notice:</strong> This bearer key is your ONLY authentication proof. If lost, neither the bank nor administrators can restore access or recover funds. Keep a secure offline backup.
          </span>
        </div>
      </div>

      {/* Multi-Token Inventory List */}
      <div className="border border-neutral-800 bg-neutral-900/40 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-neutral-100">Provisioned Tokens Inventory</h4>
            <p className="text-xs text-neutral-400 mt-0.5">
              Switch active context to inspect or test proxy calls with other credentials.
            </p>
          </div>
          <span className="text-xs font-mono text-neutral-400">
            {allTokens.length} active token{allTokens.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="divide-y divide-neutral-800 border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950">
          {allTokens.map((t) => {
            const isCurrent = t.tokenId === activeToken.tokenId;
            return (
              <div
                key={t.tokenId}
                className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                  isCurrent ? 'bg-neutral-900/60' : 'hover:bg-neutral-900/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      isCurrent ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-neutral-600'
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-neutral-200 font-medium">
                        {t.maskedToken}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-mono">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
                      Allocated: {t.totalAllocated.toLocaleString()} · Spend Limit: {t.userSpendLimit.toLocaleString()} · Remaining: {t.remainingBalance.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {!isCurrent && (
                    <button
                      onClick={() => onSelectToken(t.tokenId)}
                      className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs rounded font-medium transition-colors"
                    >
                      Make Active
                    </button>
                  )}
                  <button
                    onClick={() => copyToken(t.tokenId)}
                    className="p-1.5 text-neutral-400 hover:text-neutral-200 transition-colors"
                    title="Copy Bearer Key"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
