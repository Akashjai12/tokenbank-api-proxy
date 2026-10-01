import React from 'react';
import { Shield, Key, RefreshCw, Plus, Check } from 'lucide-react';

interface HeaderProps {
  activeTab: 'vault' | 'proxy' | 'concurrency' | 'api' | 'python';
  setActiveTab: (tab: 'vault' | 'proxy' | 'concurrency' | 'api' | 'python') => void;
  activeToken: string;
  tokenList: Array<{ tokenId: string; masked: string; allocated: number; used: number; limit: number; remaining: number }>;
  onSelectToken: (token: string) => void;
  onOpenCreateModal: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  activeToken,
  tokenList,
  onSelectToken,
  onOpenCreateModal,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <header className="border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <span className="text-base font-semibold tracking-tight text-neutral-100 flex items-center gap-2">
              TOKEN BANK
              <span className="text-xs font-normal text-emerald-400 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                PRIVACY PROXY
              </span>
            </span>
          </div>
        </div>

        {/* Zone 2: 4-5 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-lg">
          <button
            onClick={() => setActiveTab('vault')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              activeTab === 'vault'
                ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Vault & Limits
          </button>
          <button
            onClick={() => setActiveTab('proxy')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              activeTab === 'proxy'
                ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Privacy Proxy Studio
          </button>
          <button
            onClick={() => setActiveTab('concurrency')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              activeTab === 'concurrency'
                ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Concurrency Race Lab
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              activeTab === 'api'
                ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            API & cURL Specs
          </button>
          <button
            onClick={() => setActiveTab('python')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              activeTab === 'python'
                ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            FastAPI Codebase
          </button>
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-2">
          {tokenList.length > 0 && (
            <div className="relative flex items-center">
              <Key className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 pointer-events-none" />
              <select
                value={activeToken}
                onChange={(e) => onSelectToken(e.target.value)}
                className="bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs rounded pl-8 pr-7 py-1.5 font-mono focus:outline-none focus:border-emerald-500 transition-colors"
                title="Active Anonymous Bearer Key"
              >
                {tokenList.map((t) => (
                  <option key={t.tokenId} value={t.tokenId}>
                    {t.masked} ({t.remaining.toLocaleString()} left)
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 text-neutral-400 hover:text-neutral-200 bg-neutral-900 border border-neutral-800 rounded hover:bg-neutral-800 transition-colors disabled:opacity-50"
            title="Refresh Token Metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-950 bg-emerald-400 hover:bg-emerald-300 rounded transition-colors whitespace-nowrap shrink-0 shadow-sm font-sans"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Provision Key</span>
          </button>
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="md:hidden flex overflow-x-auto px-4 py-2 border-t border-neutral-900 gap-1 bg-neutral-950">
        {(['vault', 'proxy', 'concurrency', 'api', 'python'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-2.5 py-1 text-xs rounded whitespace-nowrap ${
              activeTab === tab ? 'bg-neutral-800 text-emerald-400' : 'text-neutral-400'
            }`}
          >
            {tab === 'vault' && 'Vault'}
            {tab === 'proxy' && 'Proxy Studio'}
            {tab === 'concurrency' && 'Race Lab'}
            {tab === 'api' && 'cURL API'}
            {tab === 'python' && 'FastAPI Code'}
          </button>
        ))}
      </div>
    </header>
  );
};
