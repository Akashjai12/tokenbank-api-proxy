import React from 'react';
import { Plus, RefreshCw, Shield, Menu, Key } from 'lucide-react';
import { NavigationTab } from './Sidebar';

interface NavbarProps {
  currentTab: NavigationTab;
  onOpenCreateModal: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onToggleMobileMenu?: () => void;
}

const TAB_TITLES: Record<NavigationTab, { title: string; category: string }> = {
  dashboard: { title: 'Dashboard & Telemetry', category: 'Overview' },
  vault: { title: 'Token Vault', category: 'Credentials' },
  limits: { title: 'Dynamic Limit Policies', category: 'Governance' },
  proxy: { title: 'Privacy Proxy Studio', category: 'Execution' },
  sanitization: { title: 'Header Sanitization Inspector', category: 'Security' },
  racelab: { title: 'Concurrency Race Lab', category: 'Stress Testing' },
  apiconsole: { title: 'API Console & SDKs', category: 'Integration' },
};

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onOpenCreateModal,
  onRefresh,
  isRefreshing,
  onToggleMobileMenu,
}) => {
  const currentInfo = TAB_TITLES[currentTab] || { title: 'Dashboard', category: 'Console' };

  return (
    <header className="h-16 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10">
      {/* Zone 1 & 2: Breadcrumbs & Section Title */}
      <div className="flex items-center gap-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 text-neutral-400 hover:text-neutral-200 bg-neutral-900 border border-neutral-800 rounded-lg"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
        <div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-medium">
            <span>TokenBank</span>
            <span className="text-neutral-600">/</span>
            <span className="text-neutral-500">{currentInfo.category}</span>
            <span className="text-neutral-600">/</span>
            <span className="text-neutral-200">{currentInfo.title}</span>
          </div>
        </div>
      </div>

      {/* Zone 3: Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors disabled:opacity-50"
          title="Refresh Token Metrics"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : 'text-neutral-400'}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>

        <button
          onClick={onOpenCreateModal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors whitespace-nowrap shadow-sm shadow-emerald-950"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Provision Token</span>
        </button>
      </div>
    </header>
  );
};
