import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, NavigationTab } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { TokenVaultView } from './components/TokenVaultView';
import { DynamicLimitsView } from './components/DynamicLimitsView';
import { PrivacyProxyView } from './components/PrivacyProxyView';
import { HeaderSanitizationView } from './components/HeaderSanitizationView';
import { RaceLabView } from './components/RaceLabView';
import { ApiConsoleView } from './components/ApiConsoleView';
import { CreateTokenModal } from './components/CreateTokenModal';
import { TokenBankApi, TokenRecord, ApiActivityItem, UpdateLimitsRequest } from './services/api';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [tokens, setTokens] = useState<TokenRecord[]>([]);
  const [activeTokenId, setActiveTokenId] = useState<string>('');
  const [activity, setActivity] = useState<ApiActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Load initial data
  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    setIsRefreshing(true);

    try {
      const [loadedTokens, loadedActivity] = await Promise.all([
        TokenBankApi.getTokens(),
        TokenBankApi.getActivityLog(),
      ]);

      setTokens(loadedTokens);
      setActivity(loadedActivity);

      if (loadedTokens.length > 0) {
        // Retain current selection if valid, else pick first
        setActiveTokenId((prev) => {
          if (prev && loadedTokens.some((t) => t.tokenId === prev)) {
            return prev;
          }
          return loadedTokens[0].tokenId;
        });
      }
    } catch (err) {
      console.error('Failed to load TokenBank data', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeToken = tokens.find((t) => t.tokenId === activeTokenId) || tokens[0] || null;

  const handleUpdateLimits = async (params: UpdateLimitsRequest) => {
    if (!activeToken) return;
    const updated = await TokenBankApi.updateLimits(activeToken.tokenId, params);
    setTokens((prev) => prev.map((t) => (t.tokenId === updated.tokenId ? updated : t)));
    const freshActivity = await TokenBankApi.getActivityLog();
    setActivity(freshActivity);
  };

  const handleTokenCreated = (newToken: TokenRecord) => {
    setTokens((prev) => [newToken, ...prev]);
    setActiveTokenId(newToken.tokenId);
    loadData(true);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex font-sans antialiased selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Sidebar for Desktop */}
      <div className="hidden md:block">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          activeToken={activeToken}
          allTokens={tokens}
          onSelectToken={setActiveTokenId}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
        />
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-black/80 flex">
          <div className="w-64 bg-neutral-950 border-r border-neutral-800 h-full">
            <Sidebar
              currentTab={currentTab}
              onSelectTab={(tab) => {
                setCurrentTab(tab);
                setMobileMenuOpen(false);
              }}
              activeToken={activeToken}
              allTokens={tokens}
              onSelectToken={(id) => {
                setActiveTokenId(id);
                setMobileMenuOpen(false);
              }}
              onOpenCreateModal={() => {
                setIsCreateModalOpen(true);
                setMobileMenuOpen(false);
              }}
            />
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          currentTab={currentTab}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onRefresh={() => loadData(true)}
          isRefreshing={isRefreshing}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {isLoading ? (
            <div className="py-24 text-center space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin mx-auto" />
              <p className="text-xs text-neutral-400 font-mono">Initializing TokenBank Console...</p>
            </div>
          ) : (
            <>
              {currentTab === 'dashboard' && (
                <DashboardView
                  token={activeToken}
                  activity={activity}
                  onNavigateTab={setCurrentTab}
                  onOpenCreateModal={() => setIsCreateModalOpen(true)}
                />
              )}

              {currentTab === 'vault' && (
                <TokenVaultView
                  activeToken={activeToken}
                  allTokens={tokens}
                  onSelectToken={setActiveTokenId}
                  onOpenCreateModal={() => setIsCreateModalOpen(true)}
                  onNavigateTab={setCurrentTab}
                />
              )}

              {currentTab === 'limits' && (
                <DynamicLimitsView
                  token={activeToken}
                  onUpdateLimits={handleUpdateLimits}
                  onOpenCreateModal={() => setIsCreateModalOpen(true)}
                />
              )}

              {currentTab === 'proxy' && (
                <PrivacyProxyView
                  token={activeToken}
                  onRefresh={() => loadData(true)}
                  onNavigateTab={setCurrentTab}
                  onOpenCreateModal={() => setIsCreateModalOpen(true)}
                />
              )}

              {currentTab === 'sanitization' && (
                <HeaderSanitizationView />
              )}

              {currentTab === 'racelab' && (
                <RaceLabView
                  token={activeToken}
                  onRefresh={() => loadData(true)}
                  onOpenCreateModal={() => setIsCreateModalOpen(true)}
                  onNavigateTab={setCurrentTab}
                />
              )}

              {currentTab === 'apiconsole' && (
                <ApiConsoleView token={activeToken} />
              )}
            </>
          )}
        </main>

        <footer className="border-t border-neutral-900 bg-neutral-950/80 py-4 px-6 text-[11px] text-neutral-500 font-mono flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-400">TokenBank Console</span>
            <span>·</span>
            <span>Decoupled Anonymous Credit Engine</span>
            <span>·</span>
            <span className="text-emerald-500">Zero PII Stored</span>
          </div>

          <div className="flex items-center gap-3">
            <span>REST API Ready</span>
            <span>·</span>
            <span>tb:&#123;id&#125;:user_spend_limit</span>
          </div>
        </footer>
      </div>

      {/* Token Provisioning Modal */}
      <CreateTokenModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleTokenCreated}
      />
    </div>
  );
}
