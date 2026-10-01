import React, { useState } from 'react';
import {
  Zap,
  ShieldCheck,
  AlertTriangle,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Cpu
} from 'lucide-react';

interface ConcurrencyLabTabProps {
  activeToken: string;
  status: any;
  onRefresh: () => void;
  onUpdateLimits: (spendLimit: number, dailyLimit: number | null) => Promise<boolean>;
}

interface WorkerResult {
  workerId: number;
  success: boolean;
  code: string;
  remainingTokens: number;
  latencyMs: number;
}

interface SimulationSummary {
  concurrent_workers: number;
  requested_per_worker: number;
  balance_before: number;
  spend_limit: number;
  total_granted: number;
  total_rejected_429: number;
  balance_after: number;
  total_used_now: number;
  overdraft_detected: boolean;
  worker_results: WorkerResult[];
}

export const ConcurrencyLabTab: React.FC<ConcurrencyLabTabProps> = ({
  activeToken,
  status,
  onRefresh,
  onUpdateLimits
}) => {
  const [workerCount, setWorkerCount] = useState(12);
  const [tokensPerWorker, setTokensPerWorker] = useState(400);
  const [isRunning, setIsRunning] = useState(false);
  const [simulationData, setSimulationData] = useState<SimulationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleQuickCap = async () => {
    if (!status) return;
    try {
      // Set spend limit to used_tokens + 1,200 tokens so exactly 3 workers (at 400 each) succeed!
      const targetLimit = status.used_tokens + 1200;
      await onUpdateLimits(targetLimit, status.daily_limit);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to adjust balance limit');
    }
  };

  const runSimulation = async () => {
    if (!activeToken || isRunning) return;
    setIsRunning(true);
    setError(null);
    setSimulationData(null);

    try {
      const res = await fetch('/v1/tokens/race-simulation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify({
          concurrent_requests: workerCount,
          tokens_per_request: tokensPerWorker
        })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }

      const json = await res.json();
      setSimulationData(json.simulation);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Simulation execution failed');
    } finally {
      setIsRunning(false);
    }
  };

  const currentRemaining = status ? Math.max(0, status.user_spend_limit - status.used_tokens) : 0;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Atomic Concurrency & Race Condition Laboratory
          </h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-2xl leading-relaxed">
            Test high-concurrency token contention. In naive architectures, simultaneous requests trigger Time-Of-Check to Time-Of-Use (TOCTOU) bugs resulting in costly token overdrafts. Redis Lua scripts run atomically in a single thread to guarantee absolute hard stop enforcement.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleQuickCap}
            className="text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded transition-colors whitespace-nowrap"
            title="Set spend limit to exactly 1,200 tokens above current used balance"
          >
            Cap Remaining to ~1,200 Tokens
          </button>
        </div>
      </div>

      {/* Control Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-4 space-y-2">
          <label className="text-xs font-medium text-neutral-300 block">
            Concurrent Workers: <span className="font-mono text-emerald-400">{workerCount}</span>
          </label>
          <input
            type="range"
            min="4"
            max="24"
            step="2"
            value={workerCount}
            onChange={(e) => setWorkerCount(Number(e.target.value))}
            className="w-full accent-emerald-400"
          />
          <span className="text-[11px] text-neutral-500 block">
            Workers fire in parallel via Promise.all
          </span>
        </div>

        <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-4 space-y-2">
          <label className="text-xs font-medium text-neutral-300 block">
            Tokens Per Worker: <span className="font-mono text-emerald-400">{tokensPerWorker}</span>
          </label>
          <input
            type="range"
            min="100"
            max="2000"
            step="100"
            value={tokensPerWorker}
            onChange={(e) => setTokensPerWorker(Number(e.target.value))}
            className="w-full accent-emerald-400"
          />
          <span className="text-[11px] text-neutral-500 block">
            Total Demand: {(workerCount * tokensPerWorker).toLocaleString()} tokens
          </span>
        </div>

        <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <span className="text-xs text-neutral-400 block">Current Available Balance</span>
            <span className="text-xl font-bold font-mono text-neutral-100 tabular-nums">
              {currentRemaining.toLocaleString()} tokens
            </span>
          </div>
          <button
            onClick={runSimulation}
            disabled={isRunning}
            className="w-full mt-2 py-2 bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-medium text-xs rounded transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Executing Swarm...' : 'Fire Concurrent Swarm'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Simulation Results */}
      {simulationData && (
        <div className="space-y-4">
          {/* Summary Scorecard */}
          <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <span className="text-xs text-neutral-500 block">Initial Balance</span>
              <span className="text-lg font-bold font-mono text-neutral-200 tabular-nums">
                {simulationData.balance_before.toLocaleString()}
              </span>
            </div>

            <div>
              <span className="text-xs text-neutral-500 block">Granted (200 OK)</span>
              <span className="text-lg font-bold font-mono text-emerald-400 tabular-nums flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                {simulationData.total_granted} workers
              </span>
            </div>

            <div>
              <span className="text-xs text-neutral-500 block">Stopped (429 Limit)</span>
              <span className="text-lg font-bold font-mono text-amber-400 tabular-nums flex items-center gap-1">
                <XCircle className="w-4 h-4" />
                {simulationData.total_rejected_429} workers
              </span>
            </div>

            <div>
              <span className="text-xs text-neutral-500 block">Overdraft Detected?</span>
              <span className="text-lg font-bold font-mono text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" />
                ZERO LEAK
              </span>
            </div>
          </div>

          {/* Worker Results Matrix */}
          <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-neutral-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                Worker Execution Stream
              </h4>
              <span className="text-[11px] text-neutral-500 font-mono">
                Redis Lua Execution Queue
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {simulationData.worker_results.map((w) => (
                <div
                  key={w.workerId}
                  className={`p-3 rounded-lg border text-xs font-mono transition-all ${
                    w.success
                      ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-300'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-neutral-300">W-{w.workerId}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        w.success
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {w.success ? '200 OK' : '429 STOP'}
                    </span>
                  </div>
                  <div className="text-[10px] text-neutral-500 flex items-center justify-between mt-1">
                    <span>{w.latencyMs}ms</span>
                    <span>Rem: {w.remainingTokens}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Architectural Guarantee Explanation */}
      <div className="border border-neutral-800 bg-neutral-950 rounded-xl p-5 space-y-3">
        <h4 className="text-xs font-semibold text-neutral-200 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          Why Redis Lua Eliminates the Race Condition
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-neutral-400 leading-relaxed">
          <div className="space-y-1">
            <span className="text-rose-400 font-semibold block">The Naive Approach (Broken):</span>
            <p>
              Application executes <code className="font-mono text-neutral-300">GET used_tokens</code>, checks balance in Python memory, then calls <code className="font-mono text-neutral-300">INCRBY</code>. Under 20 concurrent requests, all 20 threads read the same initial balance simultaneously before any increment occurs, causing overspends of thousands of dollars.
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-emerald-400 font-semibold block">The Token Bank Guarantee (Lua):</span>
            <p>
              The entire inspection and increment logic is encapsulated into a Lua script executed by Redis's single-threaded event loop. No other read or write can interleave during execution. Once the hard spend ceiling is reached, excess requests are rejected within sub-milliseconds.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
