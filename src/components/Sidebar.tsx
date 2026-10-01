import React from 'react';
import {
  LayoutDashboard,
  KeyRound,
  SlidersHorizontal,
  Shield,
  Zap,
  Terminal,
  FileCheck2,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';
import { TokenRecord } from '../services/api';

export type NavigationTab = 
  | 'dashboard'
  | 'vault'
  | 'limits'
  | 'proxy'
  | 'sanitization'
  | 'racelab'
  | 'apiconsole';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  activeToken: TokenRecord | null;
  allTokens: TokenRecord[];
  onSelectToken: (tokenId: string) => void;
  onOpenCreateModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  activeToken,
  allTokens,
  onSelectToken,
  onOpenCreateModal,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (activeToken) {
      navigator.clipboard.writeText(activeToken.tokenId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const navItems = [
    {
      id: 'dashboard' as NavigationTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'vault' as NavigationTab,
      label: 'Token Vault',
      icon: KeyRound,
      badge: allTokens.length > 0 ? `${allTokens.length}` : null,
    },
    {
      id: 'limits' as NavigationTab,
      label: 'Dynamic Limits',
      icon: SlidersHorizontal,
      badge: null,
    },
    {
      id: 'proxy' as NavigationTab,
      label: 'Privacy Proxy Studio',
      icon: Shield,
      badge: 'Live',
    },
    {
      id: 'sanitization' as NavigationTab,
      label: 'Header Sanitization',
      icon: FileCheck2,
      badge: null,
    },
    {
      id: 'racelab' as NavigationTab,
      label: 'Concurrency Race Lab',
      icon: Zap,
      badge: null,
    },
    {
      id: 'apiconsole' as NavigationTab,
      label: 'API Console',
      icon: Terminal,
      badge: null,
    },
  ];

  const quotaPercent = activeToken && activeToken.userSpendLimit > 0
    ? Math.min(100, Math.round((activeToken.usedTokens / activeToken.userSpendLimit) * 100))
    : 0;

  return (
    <aside className="w-64 bg-neutral-950 border-r border-neutral-800 flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none z-20">
      <div>
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 font-semibold shadow-inner">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-sm tracking-tight text-neutral-100 flex items-center gap-1.5">
                TokenBank
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/70 border border-emerald-800/50 px-1.5 py-0.2 rounded uppercase">
                  Console
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="p-3 space-y-1">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            Platform Views
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-neutral-900 text-neutral-100 border border-neutral-800 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/40 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-emerald-400' : 'text-neutral-500'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sidebar Footer: Active Bearer Token Mini-Card */}
      <div className="p-3 border-t border-neutral-800 bg-neutral-950/90 space-y-3">
        {activeToken ? (
          <div className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-neutral-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Active Key
              </span>
              <button
                onClick={handleCopy}
                className="text-[10px] text-neutral-400 hover:text-neutral-200 flex items-center gap-1 transition-colors"
                title="Copy Active Bearer Token"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <select
              value={activeToken.tokenId}
              onChange={(e) => onSelectToken(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs rounded px-2 py-1 font-mono focus:outline-none focus:border-emerald-500"
            >
              {allTokens.map((t) => (
                <option key={t.tokenId} value={t.tokenId}>
                  {t.maskedToken}
                </option>
              ))}
            </select>

            {/* Quota Mini Bar */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[10px] font-mono text-neutral-400">
                <span>Quota Used</span>
                <span className="tabular-nums text-neutral-300">{quotaPercent}%</span>
              </div>
              <div className="w-full bg-neutral-950 h-1.5 rounded-full overflow-hidden border border-neutral-800">
                <div
                  className={`h-full transition-all duration-300 ${
                    quotaPercent > 90
                      ? 'bg-rose-500'
                      : quotaPercent > 70
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                  }`}
                  style={{ width: `${quotaPercent}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={onOpenCreateModal}
            className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-medium rounded-lg transition-colors"
          >
            + Provision Token
          </button>
        )}

        <div className="flex items-center justify-between text-[11px] text-neutral-500 px-1 font-mono">
          <span>Engine: REST / Mock</span>
          <span className="text-emerald-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Ready
          </span>
        </div>
      </div>
    </aside>
  );
};
