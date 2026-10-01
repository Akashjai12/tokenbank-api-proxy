import React, { useState } from 'react';
import {
  FileCheck2,
  Shield,
  ArrowRight,
  Plus,
  Trash2,
  Check,
  AlertTriangle,
  Lock,
  Layers,
  Sparkles
} from 'lucide-react';

interface HeaderItem {
  id: string;
  name: string;
  value: string;
  isSensitive: boolean;
  category: 'ip' | 'cookie' | 'tracking' | 'standard';
}

const DEFAULT_INCOMING_HEADERS: HeaderItem[] = [
  { id: 'h-1', name: 'X-Forwarded-For', value: '203.0.113.195, 198.51.100.42', isSensitive: true, category: 'ip' },
  { id: 'h-2', name: 'Client-IP', value: '198.51.100.42', isSensitive: true, category: 'ip' },
  { id: 'h-3', name: 'Cookie', value: 'session_id=sec_9841af; tracking_uuid=usr_3914902a', isSensitive: true, category: 'cookie' },
  { id: 'h-4', name: 'User-Agent', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36', isSensitive: true, category: 'tracking' },
  { id: 'h-5', name: 'Referer', value: 'https://internal-console.corp.local/users/profile', isSensitive: true, category: 'tracking' },
  { id: 'h-6', name: 'Sec-CH-UA', value: '"Chromium";v="128", "Not;A=Brand";v="24"', isSensitive: true, category: 'tracking' },
  { id: 'h-7', name: 'Content-Type', value: 'application/json', isSensitive: false, category: 'standard' },
  { id: 'h-8', name: 'Accept', value: 'application/json', isSensitive: false, category: 'standard' },
];

export const HeaderSanitizationView: React.FC = () => {
  const [incomingHeaders, setIncomingHeaders] = useState<HeaderItem[]>(DEFAULT_INCOMING_HEADERS);
  const [newHeaderName, setNewHeaderName] = useState('');
  const [newHeaderValue, setNewHeaderValue] = useState('');

  const SENSITIVE_PATTERNS = [
    'x-forwarded', 'client-ip', 'x-real-ip', 'cf-connecting', 'cookie', 
    'user-agent', 'referer', 'origin', 'sec-ch-ua', 'authorization'
  ];

  const isHeaderSensitive = (name: string): boolean => {
    const lower = name.toLowerCase();
    return SENSITIVE_PATTERNS.some((p) => lower.includes(p)) || lower.startsWith('x-client-');
  };

  const handleAddHeader = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHeaderName.trim()) return;

    const sensitive = isHeaderSensitive(newHeaderName);
    const item: HeaderItem = {
      id: `h-${Date.now()}`,
      name: newHeaderName.trim(),
      value: newHeaderValue.trim() || 'value',
      isSensitive: sensitive,
      category: sensitive ? 'tracking' : 'standard',
    };

    setIncomingHeaders([...incomingHeaders, item]);
    setNewHeaderName('');
    setNewHeaderValue('');
  };

  const handleRemoveHeader = (id: string) => {
    setIncomingHeaders(incomingHeaders.filter((h) => h.id !== id));
  };

  const strippedHeaders = incomingHeaders.filter((h) => h.isSensitive);
  const allowedHeaders = incomingHeaders.filter((h) => !h.isSensitive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
          <FileCheck2 className="w-5 h-5 text-emerald-400" />
          Header Sanitization & Privacy Scrubbing Inspector
        </h3>
        <p className="text-xs text-neutral-400 mt-0.5">
          Visualize how incoming client fingerprints are purged before upstream transmission to prevent IP geolocation and telemetry tracking.
        </p>
      </div>

      {/* Visual Pipeline Comparison (Before / After) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Incoming Inbound Request */}
        <div className="lg:col-span-5 border border-neutral-800 bg-neutral-900/40 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div>
              <span className="text-xs font-semibold text-neutral-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Inbound Client Request
              </span>
              <span className="text-[11px] text-neutral-500 font-mono">
                Headers arriving at proxy gateway
              </span>
            </div>
            <span className="text-[11px] font-mono text-neutral-400">
              {incomingHeaders.length} headers
            </span>
          </div>

          <div className="space-y-2">
            {incomingHeaders.map((header) => (
              <div
                key={header.id}
                className={`p-3 rounded-xl border text-xs font-mono transition-all ${
                  header.isSensitive
                    ? 'bg-rose-500/5 border-rose-500/25 text-rose-300'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{header.name}</span>
                    {header.isSensitive && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 font-sans font-semibold uppercase">
                        Stripped
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveHeader(header.id)}
                    className="text-neutral-500 hover:text-neutral-300 transition-colors p-0.5"
                    title="Remove Header"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-[11px] text-neutral-400 break-all">
                  {header.value}
                </div>
              </div>
            ))}
          </div>

          {/* Add custom test header */}
          <form onSubmit={handleAddHeader} className="pt-3 border-t border-neutral-800 space-y-2">
            <span className="text-[11px] font-medium text-neutral-400 block">
              Test Custom Header Stripping:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Header (e.g. X-Real-IP)"
                value={newHeaderName}
                onChange={(e) => setNewHeaderName(e.target.value)}
                className="bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 font-mono"
              />
              <input
                type="text"
                placeholder="Value"
                value={newHeaderValue}
                onChange={(e) => setNewHeaderValue(e.target.value)}
                className="bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <button
              type="submit"
              className="w-full py-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Header to Test</span>
            </button>
          </form>
        </div>

        {/* Center: Transformation Engine Indicator */}
        <div className="lg:col-span-2 flex flex-col items-center justify-center py-6 lg:py-24 text-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Shield className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-neutral-200">
            Privacy Filter
          </span>
          <span className="text-[11px] text-neutral-500 max-w-[130px] font-mono leading-relaxed">
            {strippedHeaders.length} sensitive purged
          </span>
          <ArrowRight className="w-4 h-4 text-emerald-400 hidden lg:block mt-2" />
        </div>

        {/* Right: Sanitized Downstream Forward */}
        <div className="lg:col-span-5 border border-neutral-800 bg-neutral-900/40 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div>
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Sanitized Upstream Headers
              </span>
              <span className="text-[11px] text-neutral-500 font-mono">
                Transmitted downstream to LLM API
              </span>
            </div>
            <span className="text-[11px] font-mono text-emerald-400">
              Zero PII Outbound
            </span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            {/* Injected Enterprise Key */}
            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/25 text-emerald-300">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-emerald-400">Authorization</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-sans font-semibold uppercase">
                  Enterprise Secret
                </span>
              </div>
              <div className="text-[11px] text-neutral-400">
                Bearer tb_upstream_enterprise_key_••••••••
              </div>
            </div>

            {/* Anonymized Proxy User-Agent */}
            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/25 text-emerald-300">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-emerald-400">User-Agent</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-sans font-semibold uppercase">
                  Standardized
                </span>
              </div>
              <div className="text-[11px] text-neutral-400">
                TokenBank-PrivacyProxy/1.0 (Privacy-Preserving; No-Logging)
              </div>
            </div>

            {/* Preserved Safe Standard Headers */}
            {allowedHeaders.map((header) => (
              <div
                key={header.id}
                className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-300"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold">{header.name}</span>
                  <span className="text-[10px] text-neutral-500 uppercase font-sans">
                    Preserved
                  </span>
                </div>
                <div className="text-[11px] text-neutral-400">
                  {header.value}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs space-y-1.5 text-neutral-400 leading-relaxed">
            <span className="font-semibold text-neutral-200 block">Outbound Guarantees:</span>
            <p className="text-[11px]">
              The downstream LLM provider only sees TokenBank's enterprise gateway IP and anonymous proxy identity. Your client IP, cookies, and local browser details are 100% physically withheld.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
