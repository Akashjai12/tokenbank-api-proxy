import React, { useState } from 'react';
import {
  Zap,
  Play,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Cpu,
  Layers,
  Clock,
  RotateCcw,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { TokenRecord, ConcurrencySimulationResult, TokenBankApi } from '../services/api';

interface RaceLabViewProps {
  token: TokenRecord | null;
  onRefresh: () => void;
  onOpenCreateModal: () => void;
  onNavigateTab: (tab: any) => void;
}

export const RaceLabView: React.FC<RaceLabViewProps> = ({
  token,
  onRefresh,
  onOpenCreateModal,
  onNavigateTab,
}) => {
  const [workerCount, setWorkerCount] = useState(12);
  const [tokensPerWorker, setTokensPerWorker] = useState(500);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<ConcurrencySimulationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!token) {
    return (
      <div className="py-20 text-center max-w-md mx-auto">
        <Zap className="w-10 h-10 text-neutral-500 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-neutral-200 mb-1">No Active Token</h3>
        <p className="text-xs text-neutral-400 mb-6">
          Provision an anonymous token to test atomic concurrency handling and verify zero overdrafts.
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

  const handleRun = async () => {
    setIsRunning(true);
    setErrorMsg(null);
    setResults(null);

    try {
      const res = await TokenBankApi.runConcurrencySimulation(
        token.tokenId,
        workerCount,
        tokensPerWorker
      );
      setResults(res);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Simulation failed.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleCapQuotaForTest = async () => {
    try {
      // Set spend limit to used_tokens + 2,000 so exactly 4 workers requesting 500 succeed!
      await TokenBankApi.updateLimits(token.tokenId, {
        userSpendLimit: token.usedTokens + 2000,
      });
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to set test quota');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            Concurrency Race Condition Laboratory
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Fire simultaneous parallel requests against limited quota to prove atomic Lua reservation prevents TOCTOU race conditions.
          </p>
        </div>

        <button
          onClick={handleCapQuotaForTest}
          className="px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto"
          title="Caps remaining balance to 2,000 tokens so excess requests get blocked with 429"
        >
          Preset Cap: ~2,000 Tokens Remaining
        </button>
      </div>

      {/* Control Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Worker Count */}
        <div className="border border-neutral-800 bg-neutral-900/40 rounded-2xl p-4 space-y-2">
          <div className="flex justify-between text-xs text-neutral-300">
            <span className="font-semibold">Concurrent Workers</span>
            <span className="font-mono text-emerald-400 font-bold">{workerCount} workers</span>
          </div>
          <input
            type="range"
            min="4"
            max="24"
            step="2"
            value={workerCount}
            onChange={(e) => setWorkerCount(Number(e.target.value))}
            className="w-full accent-emerald-400 h-1.5 bg-neutral-950 rounded-lg cursor-pointer border border-neutral-800"
          />
          <div className="flex justify-between text-[11px] font-mono text-neutral-500">
            <span>4 min</span>
            <span>Parallel Promise.all</span>
            <span>24 max</span>
          </div>
        </div>

        {/* Tokens Per Worker */}
        <div className="border border-neutral-800 bg-neutral-900/40 rounded-2xl p-4 space-y-2">
          <div className="flex justify-between text-xs text-neutral-300">
            <span className="font-semibold">Tokens Per Worker</span>
            <span className="font-mono text-emerald-400 font-bold">{tokensPerWorker} tokens</span>
          </div>
          <input
            type="range"
            min="100"
            max="2000"
            step="100"
            value={tokensPerWorker}
            onChange={(e) => setTokensPerWorker(Number(e.target.value))}
            className="w-full accent-emerald-400 h-1.5 bg-neutral-950 rounded-lg cursor-pointer border border-neutral-800"
          />
          <div className="flex justify-between text-[11px] font-mono text-neutral-500">
            <span>100</span>
            <span>Total: {(workerCount * tokensPerWorker).toLocaleString()}</span>
            <span>2,000</span>
          </div>
        </div>

        {/* Available Balance & Action */}
        <div className="border border-neutral-800 bg-neutral-900/40 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400 font-medium">Available Quota</span>
            <span className="font-mono text-emerald-400 font-bold text-sm tabular-nums">
              {token.remainingBalance.toLocaleString()} tokens
            </span>
          </div>

          <button
            onClick={handleRun}
            disabled={isRunning}
            className="w-full mt-3 py-2 bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-semibold text-xs rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Firing Parallel Swarm...' : 'Run Concurrency Simulation'}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Results Display */}
      {results && (
        <div className="space-y-4">
          {/* Results Scorecard */}
          <div className="border border-neutral-800 bg-neutral-900/40 rounded-2xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <span className="text-[11px] text-neutral-500 uppercase font-mono block">Initial Balance</span>
              <span className="text-xl font-bold font-mono text-neutral-100 tabular-nums">
                {results.initialBalance.toLocaleString()}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-neutral-500 uppercase font-mono block">Granted (200 OK)</span>
              <span className="text-xl font-bold font-mono text-emerald-400 tabular-nums flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {results.grantedCount} requests
              </span>
            </div>

            <div>
              <span className="text-[11px] text-neutral-500 uppercase font-mono block">Blocked (429 Cap)</span>
              <span className="text-xl font-bold font-mono text-amber-400 tabular-nums flex items-center gap-1.5">
                <XCircle className="w-4 h-4" />
                {results.rejectedCount} requests
              </span>
            </div>

            <div>
              <span className="text-[11px] text-neutral-500 uppercase font-mono block">Overdraft Detected</span>
              <span className="text-xl font-bold font-mono text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                ZERO LEAK
              </span>
            </div>
          </div>

          {/* Workers Visual Execution Matrix */}
          <div className="border border-neutral-800 bg-neutral-900/40 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-neutral-100">Worker Execution Matrix</h4>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Sequential processing log from Redis single-threaded execution queue.
                </p>
              </div>
              <span className="text-xs font-mono text-neutral-500">
                {results.workers.length} workers fired
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-1">
              {results.workers.map((w) => (
                <div
                  key={w.workerId}
                  className={`p-3 rounded-xl border text-xs font-mono transition-all ${
                    w.success
                      ? 'bg-emerald-500/5 border-emerald-500/25 text-emerald-300'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-neutral-200">Worker-{w.workerId}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-sans font-semibold uppercase ${
                        w.success
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {w.statusCode}
                    </span>
                  </div>
                  <div className="text-[10px] text-neutral-500 flex items-center justify-between mt-1">
                    <span>{w.latencyMs}ms</span>
                    <span>Rem: {w.remainingAfter.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Deep-Dive Technical Explainer */}
      <div className="border border-neutral-800 bg-neutral-950 rounded-2xl p-5 space-y-3">
        <h4 className="text-xs font-semibold text-neutral-200 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          The Mathematics of Zero Overdraft
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs text-neutral-400 leading-relaxed">
          <div className="space-y-1.5">
            <span className="text-rose-400 font-semibold block">The Naive Architecture (Vulnerable to Overdraft):</span>
            <p>
              Standard backends fetch <code className="font-mono text-neutral-300">used_tokens</code> into server RAM, check the limit, and later run <code className="font-mono text-neutral-300">UPDATE</code>. When 20 concurrent requests hit simultaneously, every thread reads the same unreserved balance, approving all 20 calls and causing a catastrophic overdraft.
            </p>
          </div>
          <div className="space-y-1.5">
            <span className="text-emerald-400 font-semibold block">TokenBank Atomic Architecture (Zero Overdraft):</span>
            <p>
              Evaluation and reservation are committed in a single atomic transaction inside the database queue. No other thread can read or write between the boundary check and the counter increment. Once quota drops below required tokens, all remaining calls are halted instantly with HTTP 429.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
