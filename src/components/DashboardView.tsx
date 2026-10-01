import React, { useState } from 'react';
import {
  Coins,
  TrendingDown,
  Lock,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Activity,
  Layers,
  Sparkles,
  Download,
  Check
} from 'lucide-react';
import { TokenRecord, ApiActivityItem } from '../services/api';

interface DashboardViewProps {
  token: TokenRecord | null;
  activity: ApiActivityItem[];
  onNavigateTab: (tab: any) => void;
  onOpenCreateModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  token,
  activity,
  onNavigateTab,
  onOpenCreateModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'rate_limited'>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [exportedSuccess, setExportedSuccess] = useState(false);

  const filteredActivity = activity.filter((item) => {
    const matchesSearch = 
      item.endpoint.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.model && item.model.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.statusText.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = 
      statusFilter === 'all' ? true :
      statusFilter === 'success' ? item.status < 400 :
      item.status === 429;

    return matchesSearch && matchesStatus;
  });

  const handleExportCSV = () => {
    if (filteredActivity.length === 0) return;

    setIsExporting(true);

    const headers = [
      'Activity_ID',
      'Timestamp_ISO',
      'Timestamp_Local',
      'Endpoint',
      'HTTP_Method',
      'Model_Action',
      'Tokens_Deducted',
      'Sanitized_Headers_Count',
      'HTTP_Status',
      'Status_Description',
      'Latency_MS',
      'Bearer_Token_ID'
    ];

    const escapeCsv = (val: any): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filteredActivity.map((item) => [
      escapeCsv(item.id),
      escapeCsv(item.timestamp),
      escapeCsv(new Date(item.timestamp).toLocaleString()),
      escapeCsv(item.endpoint),
      escapeCsv(item.method),
      escapeCsv(item.model || 'System Admin'),
      escapeCsv(item.tokensDeducted),
      escapeCsv(item.sanitizedHeadersCount),
      escapeCsv(item.status),
      escapeCsv(item.statusText),
      escapeCsv(item.latencyMs),
      escapeCsv(token ? token.maskedToken : 'N/A')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    link.setAttribute('href', url);
    link.setAttribute('download', `tokenbank-api-activity-${timestampStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setIsExporting(false);
    setExportedSuccess(true);
    setTimeout(() => setExportedSuccess(false), 2500);
  };

  if (!token) {
    return (
      <div className="py-20 text-center max-w-md mx-auto">
        <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto mb-4 text-neutral-400">
          <Coins className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-neutral-200 mb-1">No Active Token Initialized</h3>
        <p className="text-xs text-neutral-400 mb-6">
          Provision an anonymous bearer key to start tracking token balances, enforcing spend limits, and viewing telemetry.
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

  const spendPercent = token.userSpendLimit > 0
    ? Math.min(100, Math.round((token.usedTokens / token.userSpendLimit) * 100))
    : 0;

  const dailyPercent = token.dailyLimit && token.dailyLimit > 0
    ? Math.min(100, Math.round((token.dailyUsed / token.dailyLimit) * 100))
    : 0;

  return (
    <div className="space-y-6">
      {/* Privacy Guarantee Header Callout */}
      <div className="border border-neutral-800 bg-neutral-900/40 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              Decoupled Anonymous Token Standard
              <span className="text-xs text-neutral-500 font-normal">· Pure Bearer Authority</span>
            </div>
            <p className="text-xs text-neutral-400 mt-1 max-w-2xl leading-relaxed">
              No personal identity or IP logs exist in this database. Downstream API requests are scrubbed of all identifying headers and bounded strictly by atomic spend limits.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigateTab('vault')}
            className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 rounded-lg text-xs font-medium text-neutral-200 transition-colors"
          >
            Inspect Token
          </button>
          <button
            onClick={() => onNavigateTab('proxy')}
            className="px-3 py-1.5 bg-emerald-400 hover:bg-emerald-300 rounded-lg text-xs font-semibold text-neutral-950 transition-colors"
          >
            Launch Proxy Studio
          </button>
        </div>
      </div>

      {/* 4 Primary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Allocated */}
        <div className="border border-neutral-800 bg-neutral-900/40 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">Total Allocated Tokens</span>
            <Coins className="w-4 h-4 text-neutral-500" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-neutral-100 tabular-nums">
              {token.totalAllocated.toLocaleString()}
            </div>
            <div className="text-[11px] text-neutral-500 mt-1 font-mono">
              Total purchased credit balance
            </div>
          </div>
        </div>

        {/* Used Tokens */}
        <div className="border border-neutral-800 bg-neutral-900/40 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">Used Tokens</span>
            <TrendingDown className="w-4 h-4 text-neutral-500" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-neutral-100 tabular-nums">
              {token.usedTokens.toLocaleString()}
            </div>
            <div className="text-[11px] text-neutral-500 mt-1">
              Consumed across all requests
            </div>
          </div>
        </div>

        {/* Remaining Spendable */}
        <div className="border border-neutral-800 bg-neutral-900/40 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">Remaining Quota</span>
            <span className="text-[11px] font-mono text-emerald-400">
              {Math.max(0, 100 - spendPercent)}% Available
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
              {token.remainingBalance.toLocaleString()}
            </div>
            <div className="text-[11px] text-neutral-500 mt-1">
              Spendable before hard stop ceiling
            </div>
          </div>
        </div>

        {/* Daily Usage */}
        <div className="border border-neutral-800 bg-neutral-900/40 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">Daily Usage (UTC)</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-neutral-100 tabular-nums">
              {token.dailyUsed.toLocaleString()}
            </div>
            <div className="text-[11px] text-neutral-500 mt-1 font-mono">
              {token.dailyLimit ? `Cap: ${token.dailyLimit.toLocaleString()} / day` : 'No daily cap configured'}
            </div>
          </div>
        </div>
      </div>

      {/* Token Usage Progress Visualization */}
      <div className="border border-neutral-800 bg-neutral-900/40 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Token Allocation & Spend Boundary Visualization
            </h4>
            <p className="text-xs text-neutral-400 mt-0.5">
              Atomic pre-flight checks enforce the active spend limit before releasing calls downstream.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-neutral-400">
            <span>Used: <strong className="text-neutral-200">{token.usedTokens.toLocaleString()}</strong></span>
            <span>·</span>
            <span>Cap: <strong className="text-amber-400">{token.userSpendLimit.toLocaleString()}</strong></span>
            <span>·</span>
            <span>Purchased: <strong className="text-neutral-200">{token.totalAllocated.toLocaleString()}</strong></span>
          </div>
        </div>

        {/* Multi-tier Visual Bar */}
        <div className="w-full bg-neutral-950 h-4 rounded-xl overflow-hidden border border-neutral-800 p-0.5">
          <div className="w-full h-full flex rounded-lg overflow-hidden bg-neutral-900">
            {/* Consumed */}
            <div
              className={`h-full transition-all duration-500 ${
                spendPercent > 90 ? 'bg-rose-500' : spendPercent > 70 ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
              style={{ width: `${spendPercent}%` }}
              title={`Used tokens: ${token.usedTokens.toLocaleString()}`}
            />
            {/* Remaining until spend limit */}
            <div
              className="h-full bg-neutral-800/80 transition-all duration-500"
              style={{
                width: `${Math.max(0, 100 - spendPercent)}%`,
              }}
              title={`Available quota: ${token.remainingBalance.toLocaleString()}`}
            />
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded bg-emerald-400 shrink-0" />
            <span>Used Quota: <strong className="text-neutral-200 font-mono">{token.usedTokens.toLocaleString()}</strong> ({spendPercent}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded bg-neutral-700 shrink-0" />
            <span>Available to Spend: <strong className="text-neutral-200 font-mono">{token.remainingBalance.toLocaleString()}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded bg-amber-400/80 shrink-0" />
            <span>Unallocated Reserve: <strong className="text-neutral-200 font-mono">{Math.max(0, token.totalAllocated - token.userSpendLimit).toLocaleString()}</strong></span>
          </div>
        </div>
      </div>

      {/* Recent API Activity Log */}
      <div className="border border-neutral-800 bg-neutral-900/40 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              Recent API Proxy Activity
            </h4>
            <p className="text-xs text-neutral-400 mt-0.5">
              Real-time audit log of proxied completions and limit updates.
            </p>
          </div>

          {/* Filters & Search */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search activity..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center p-1 bg-neutral-950 border border-neutral-800 rounded-lg text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2 py-1 rounded transition-colors ${
                  statusFilter === 'all' ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('success')}
                className={`px-2 py-1 rounded transition-colors ${
                  statusFilter === 'success' ? 'bg-neutral-800 text-emerald-400' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                200 OK
              </button>
              <button
                onClick={() => setStatusFilter('rate_limited')}
                className={`px-2 py-1 rounded transition-colors ${
                  statusFilter === 'rate_limited' ? 'bg-neutral-800 text-amber-400' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                429 Cap
              </button>
            </div>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCSV}
              disabled={filteredActivity.length === 0 || isExporting}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                exportedSuccess
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-neutral-950 hover:bg-neutral-850 text-neutral-300 hover:text-white border-neutral-800 disabled:opacity-40 disabled:pointer-events-none'
              }`}
              title="Export filtered activity logs as CSV file for auditing"
            >
              {exportedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Exported!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Export CSV</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Activity Table */}
        <div className="overflow-x-auto border border-neutral-800 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950 text-neutral-400 font-mono text-[11px] uppercase border-b border-neutral-800">
              <tr>
                <th className="py-2.5 px-4 font-medium">Timestamp</th>
                <th className="py-2.5 px-4 font-medium">Endpoint</th>
                <th className="py-2.5 px-4 font-medium">Model / Action</th>
                <th className="py-2.5 px-4 font-medium">Tokens Deducted</th>
                <th className="py-2.5 px-4 font-medium">Sanitized</th>
                <th className="py-2.5 px-4 font-medium">Status</th>
                <th className="py-2.5 px-4 font-medium text-right">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-850 bg-neutral-900/30">
              {filteredActivity.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-neutral-500 text-xs">
                    No matching activity recorded yet.
                  </td>
                </tr>
              ) : (
                filteredActivity.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-850/40 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-neutral-400 whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-neutral-200 whitespace-nowrap">
                      {item.endpoint}
                    </td>
                    <td className="py-2.5 px-4 text-neutral-300">
                      {item.model || 'System Admin'}
                    </td>
                    <td className="py-2.5 px-4 font-mono tabular-nums text-neutral-200">
                      {item.tokensDeducted > 0 ? (
                        <span className="text-emerald-400">-{item.tokensDeducted}</span>
                      ) : (
                        <span className="text-neutral-500">0</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-neutral-400">
                      {item.sanitizedHeadersCount > 0 ? (
                        <span className="text-emerald-400">{item.sanitizedHeadersCount} stripped</span>
                      ) : (
                        <span className="text-neutral-500">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`font-mono text-[11px] px-2 py-0.5 rounded ${
                          item.status < 300
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                            : item.status === 429
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/25'
                        }`}
                      >
                        {item.status} {item.statusText}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-right text-neutral-400 tabular-nums">
                      {item.latencyMs}ms
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
