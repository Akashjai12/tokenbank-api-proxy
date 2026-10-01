import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { VaultTab } from './components/VaultTab';
import { ProxyStudioTab } from './components/ProxyStudioTab';
import { ConcurrencyLabTab } from './components/ConcurrencyLabTab';
import { ApiConsoleTab } from './components/ApiConsoleTab';
import { PythonSourceTab } from './components/PythonSourceTab';
import { ProvisionModal } from './components/ProvisionModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'vault' | 'proxy' | 'concurrency' | 'api' | 'python'>('vault');
  const [activeToken, setActiveToken] = useState<string>('tb_live_7e84a92c310b89f41de600829ac455b8');
  const [tokenList, setTokenList] = useState<Array<{ tokenId: string; masked: string; allocated: number; used: number; limit: number; remaining: number }>>([]);
  const [tokenStatus, setTokenStatus] = useState<any | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(false);
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState<boolean>(false);

  // Fetch token list
  const fetchTokenList = useCallback(async () => {
    try {
      const res = await fetch('/v1/tokens/list-active');
      if (res.ok) {
        const data = await res.json();
        setTokenList(data.tokens || []);
        if (!activeToken && data.tokens?.length > 0) {
          setActiveToken(data.tokens[0].tokenId);
        }
      }
    } catch {
      // Ignored for quiet fallback
    }
  }, [activeToken]);

  // Fetch active token status
  const fetchStatus = useCallback(async () => {
    if (!activeToken) return;
    setIsLoadingStatus(true);
    try {
      const res = await fetch('/v1/tokens/status', {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setTokenStatus(data);
      } else {
        setTokenStatus(null);
      }
    } catch {
      setTokenStatus(null);
    } finally {
      setIsLoadingStatus(false);
    }
  }, [activeToken]);

  useEffect(() => {
    fetchTokenList();
  }, [fetchTokenList]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleUpdateLimits = async (spendLimit: number, dailyLimit: number | null): Promise<boolean> => {
    if (!activeToken) return false;
    const res = await fetch('/v1/tokens/limits', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${activeToken}`,
      },
      body: JSON.stringify({
        user_spend_limit: spendLimit,
        daily_limit: dailyLimit,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const updated = await res.json();
    setTokenStatus(updated);
    fetchTokenList();
    return true;
  };

  const handleTokenCreated = (newToken: string) => {
    setActiveToken(newToken);
    fetchTokenList();
    fetchStatus();
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeToken={activeToken}
        tokenList={tokenList}
        onSelectToken={(token) => setActiveToken(token)}
        onOpenCreateModal={() => setIsProvisionModalOpen(true)}
        onRefresh={() => {
          fetchStatus();
          fetchTokenList();
        }}
        isRefreshing={isLoadingStatus}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'vault' && (
          <VaultTab
            activeToken={activeToken}
            status={tokenStatus}
            isLoading={isLoadingStatus}
            onRefresh={fetchStatus}
            onUpdateLimits={handleUpdateLimits}
            onOpenCreateModal={() => setIsProvisionModalOpen(true)}
          />
        )}

        {activeTab === 'proxy' && (
          <ProxyStudioTab
            activeToken={activeToken}
            onTokenUsed={() => {
              fetchStatus();
              fetchTokenList();
            }}
          />
        )}

        {activeTab === 'concurrency' && (
          <ConcurrencyLabTab
            activeToken={activeToken}
            status={tokenStatus}
            onRefresh={() => {
              fetchStatus();
              fetchTokenList();
            }}
            onUpdateLimits={handleUpdateLimits}
          />
        )}

        {activeTab === 'api' && (
          <ApiConsoleTab activeToken={activeToken} />
        )}

        {activeTab === 'python' && (
          <PythonSourceTab />
        )}
      </main>

      <footer className="border-t border-neutral-900 bg-neutral-950 py-6 text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-400">Token Bank & Privacy Proxy</span>
            <span>·</span>
            <span>FastAPI + Redis Architecture</span>
            <span>·</span>
            <span>Zero-PII Bearer Standard</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span>tb:&#123;id&#125;:total_allocated</span>
            <span>tb:&#123;id&#125;:user_spend_limit</span>
            <span>tb:&#123;id&#125;:used_tokens</span>
          </div>
        </div>
      </footer>

      <ProvisionModal
        isOpen={isProvisionModalOpen}
        onClose={() => setIsProvisionModalOpen(false)}
        onCreated={handleTokenCreated}
      />
    </div>
  );
}
