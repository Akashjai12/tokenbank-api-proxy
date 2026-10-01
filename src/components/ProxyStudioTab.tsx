import React, { useState } from 'react';
import {
  Send,
  Shield,
  Zap,
  Check,
  AlertTriangle,
  FileCode,
  ArrowRight,
  Eye,
  Sliders,
  Cpu,
  RefreshCw
} from 'lucide-react';

interface ProxyStudioTabProps {
  activeToken: string;
  onTokenUsed: () => void;
}

interface ChatResponseData {
  id?: string;
  choices?: Array<{ message: { content: string } }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  _token_bank_audit?: {
    anonymized: boolean;
    stripped_headers: string[];
    estimated_reserved: number;
    actual_deducted: number;
    reconciliation_adjustment: number;
    remaining_balance: number;
  };
  headers?: Record<string, string>;
  error?: any;
}

export const ProxyStudioTab: React.FC<ProxyStudioTabProps> = ({ activeToken, onTokenUsed }) => {
  const [prompt, setPrompt] = useState('Explain why Redis Lua scripts prevent race conditions in distributed token banks.');
  const [maxTokens, setMaxTokens] = useState(250);
  const [temperature, setTemperature] = useState(0.7);
  const [isLoading, setIsLoading] = useState(false);
  const [responseData, setResponseData] = useState<ChatResponseData | null>(null);
  const [responseHeaders, setResponseHeaders] = useState<Record<string, string>>({});
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'text' | 'json' | 'sanitization'>('text');

  const presetPrompts = [
    'Explain why Redis Lua scripts prevent race conditions in distributed token banks.',
    'What headers must be stripped to prevent client IP leakage when proxying LLM calls?',
    'Write a concise overview of zero-knowledge bearer tokens for API credit management.'
  ];

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setResponseData(null);
    setStatusCode(null);
    setLatencyMs(null);

    const startTime = performance.now();

    try {
      const res = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`,
          // Pass mock sensitive client headers to show they get stripped
          'X-Forwarded-For': '198.51.100.88',
          'Client-IP': '203.0.113.42',
          'Cookie': 'session_auth=private_cookie_123',
          'X-Client-Location': 'San Francisco, US'
        },
        body: JSON.stringify({
          model: 'gemini-3.8-flash',
          messages: [
            { role: 'system', content: 'You are an expert distributed systems engineer and security architect.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: maxTokens,
          temperature: temperature
        })
      });

      const elapsed = Math.round(performance.now() - startTime);
      setLatencyMs(elapsed);
      setStatusCode(res.status);

      // Extract custom audit headers
      const headersObj: Record<string, string> = {};
      res.headers.forEach((val, key) => {
        if (key.toLowerCase().startsWith('x-tokenbank') || key.toLowerCase() === 'content-type') {
          headersObj[key] = val;
        }
      });
      setResponseHeaders(headersObj);

      const json = await res.json();
      setResponseData(json);

      // Notify parent to refresh token metrics
      onTokenUsed();
    } catch (err: any) {
      setStatusCode(500);
      setResponseData({ error: { message: err.message || 'Network error' } });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            Privacy Proxy Execution Studio
          </h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-2xl leading-relaxed">
            Requests sent here are scrubbed of IP headers, cookies, and client fingerprints. Redis atomically executes a Lua reservation before forwarding downstream to the enterprise LLM API.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 bg-neutral-950 px-3 py-1.5 rounded border border-neutral-800">
          <span className="text-neutral-500">Target:</span>
          <span className="text-emerald-400">POST /v1/chat/completions</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Request Form */}
        <div className="lg:col-span-5 space-y-4">
          <form onSubmit={handleSend} className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-4 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-neutral-300">Prompt Payload</label>
                <div className="text-[11px] text-neutral-500 font-mono">
                  ~{Math.ceil(prompt.length / 4)} tokens
                </div>
              </div>
              <textarea
                rows={5}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors font-mono leading-relaxed resize-y"
                placeholder="Enter prompt for anonymous evaluation..."
                required
              />
            </div>

            {/* Presets */}
            <div>
              <span className="text-[11px] text-neutral-500 block mb-1.5">Preset Prompts:</span>
              <div className="space-y-1">
                {presetPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPrompt(p)}
                    className="w-full text-left text-[11px] text-neutral-400 hover:text-neutral-200 p-1.5 rounded hover:bg-neutral-800/60 truncate transition-colors border border-transparent hover:border-neutral-800"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Configuration Controls */}
            <div className="pt-3 border-t border-neutral-800/80 grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-neutral-400 block mb-1">Max Tokens ({maxTokens})</label>
                <input
                  type="range"
                  min="50"
                  max="1000"
                  step="50"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Number(e.target.value))}
                  className="w-full accent-emerald-400"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Temperature ({temperature})</label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="w-full accent-emerald-400"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-neutral-500 font-mono">
                Model: gemini-3.8-flash
              </span>
              <button
                type="submit"
                disabled={isLoading || !prompt.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-medium text-xs rounded transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Proxying...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Proxied Request</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Privacy Protocol Snapshot */}
          <div className="border border-neutral-800 bg-neutral-900/20 rounded-xl p-4 space-y-2.5 text-xs">
            <h4 className="font-semibold text-neutral-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Privacy Enforcement Pipeline
            </h4>
            <ul className="space-y-1.5 text-neutral-400 text-[11px] leading-relaxed">
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">1.</span>
                <span>Pre-flight atomic check: verifies user spend limit before touching downstream network.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">2.</span>
                <span>Header stripping: drops client IPs, cookies, user-agents, tracking parameters.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">3.</span>
                <span>Post-call reconciliation: exact token usage reconciled atomically via Redis Lua.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right Column: Response & Audit */}
        <div className="lg:col-span-7 space-y-4">
          <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-4 min-h-[460px] flex flex-col justify-between">
            <div>
              {/* Header Bar */}
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-neutral-200">Proxy Output</span>
                  {statusCode !== null && (
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                        statusCode === 200
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : statusCode === 429
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      HTTP {statusCode}
                    </span>
                  )}
                  {latencyMs !== null && (
                    <span className="text-[11px] font-mono text-neutral-400">
                      {latencyMs}ms
                    </span>
                  )}
                </div>

                {/* View toggles */}
                <div className="flex items-center gap-1 p-0.5 bg-neutral-950 border border-neutral-800 rounded">
                  <button
                    onClick={() => setViewMode('text')}
                    className={`px-2.5 py-1 text-[11px] rounded transition-colors ${
                      viewMode === 'text' ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Assistant Text
                  </button>
                  <button
                    onClick={() => setViewMode('sanitization')}
                    className={`px-2.5 py-1 text-[11px] rounded transition-colors ${
                      viewMode === 'sanitization' ? 'bg-neutral-800 text-emerald-400' : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Privacy Audit
                  </button>
                  <button
                    onClick={() => setViewMode('json')}
                    className={`px-2.5 py-1 text-[11px] rounded transition-colors ${
                      viewMode === 'json' ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Raw JSON
                  </button>
                </div>
              </div>

              {/* Body Content */}
              {isLoading ? (
                <div className="py-24 text-center space-y-3">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mx-auto" />
                  <p className="text-xs text-neutral-400">
                    Executing atomic Lua reservation & proxying downstream to LLM...
                  </p>
                </div>
              ) : !responseData ? (
                <div className="py-24 text-center text-neutral-500 text-xs">
                  Awaiting request execution. Click "Send Proxied Request" to begin.
                </div>
              ) : viewMode === 'text' ? (
                <div className="space-y-4">
                  {responseData.error ? (
                    <div className="p-4 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-2">
                      <div className="font-semibold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        {statusCode === 429 ? 'Hard Limit Stopped (HTTP 429)' : 'Proxy Error'}
                      </div>
                      <p className="text-xs font-mono leading-relaxed">
                        {responseData.error.message || JSON.stringify(responseData.error)}
                      </p>
                      {responseData.error.remaining_tokens !== undefined && (
                        <div className="pt-2 text-[11px] border-t border-rose-500/20 text-rose-400 font-mono">
                          Remaining tokens available: {responseData.error.remaining_tokens}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-sans text-neutral-200 leading-relaxed whitespace-pre-wrap">
                      {responseData.choices?.[0]?.message?.content || 'No text output returned.'}
                    </div>
                  )}

                  {/* Usage Summary Badges */}
                  {responseData.usage && (
                    <div className="grid grid-cols-3 gap-3 pt-2">
                      <div className="p-2.5 rounded bg-neutral-950 border border-neutral-800">
                        <span className="text-[11px] text-neutral-400 block">Prompt Tokens</span>
                        <span className="text-sm font-bold font-mono text-neutral-200 tabular-nums">
                          {responseData.usage.prompt_tokens}
                        </span>
                      </div>
                      <div className="p-2.5 rounded bg-neutral-950 border border-neutral-800">
                        <span className="text-[11px] text-neutral-400 block">Completion</span>
                        <span className="text-sm font-bold font-mono text-neutral-200 tabular-nums">
                          {responseData.usage.completion_tokens}
                        </span>
                      </div>
                      <div className="p-2.5 rounded bg-neutral-950 border border-neutral-800">
                        <span className="text-[11px] text-neutral-400 block">Total Deducted</span>
                        <span className="text-sm font-bold font-mono text-emerald-400 tabular-nums">
                          {responseData.usage.total_tokens}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : viewMode === 'sanitization' ? (
                <div className="space-y-4">
                  {/* Sanitization Breakdown */}
                  <div className="border border-neutral-800 bg-neutral-950 rounded-lg p-4 space-y-3">
                    <h5 className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" />
                      Client Header Stripping Audit
                    </h5>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      The proxy identified and removed the following fingerprinting headers from the inbound request before transmitting upstream:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(responseData._token_bank_audit?.stripped_headers || ['x-forwarded-for', 'client-ip', 'cookie', 'x-client-location']).map((h) => (
                        <span
                          key={h}
                          className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 font-mono text-[11px]"
                        >
                          ✕ {h}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Accounting Reconciliation Trace */}
                  <div className="border border-neutral-800 bg-neutral-950 rounded-lg p-4 space-y-3">
                    <h5 className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                      Atomic Lua Reservation & Reconciliation Trace
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                      <div className="p-2.5 rounded bg-neutral-900 border border-neutral-800">
                        <span className="text-[10px] text-neutral-500 block">1. Preflight Reserved</span>
                        <span className="text-neutral-200 font-bold tabular-nums">
                          {responseData._token_bank_audit?.estimated_reserved || 'N/A'} tokens
                        </span>
                      </div>
                      <div className="p-2.5 rounded bg-neutral-900 border border-neutral-800">
                        <span className="text-[10px] text-neutral-500 block">2. Upstream Actual</span>
                        <span className="text-neutral-200 font-bold tabular-nums">
                          {responseData._token_bank_audit?.actual_deducted || 'N/A'} tokens
                        </span>
                      </div>
                      <div className="p-2.5 rounded bg-neutral-900 border border-neutral-800">
                        <span className="text-[10px] text-neutral-500 block">3. Reconcile Delta</span>
                        <span className="text-emerald-400 font-bold tabular-nums">
                          {responseData._token_bank_audit?.reconciliation_adjustment !== undefined
                            ? `${responseData._token_bank_audit.reconciliation_adjustment > 0 ? '+' : ''}${responseData._token_bank_audit.reconciliation_adjustment}`
                            : 'N/A'} tokens
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <pre className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg font-mono text-[11px] text-neutral-300 overflow-x-auto max-h-[360px] leading-relaxed">
                  {JSON.stringify(responseData, null, 2)}
                </pre>
              )}
            </div>

            {/* Custom Headers Footer */}
            {Object.keys(responseHeaders).length > 0 && (
              <div className="pt-3 mt-4 border-t border-neutral-800">
                <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block mb-1">
                  Attached Custom Response Headers
                </span>
                <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                  {Object.entries(responseHeaders).map(([k, v]) => (
                    <span key={k} className="px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-300">
                      <span className="text-emerald-400">{k}:</span> {v}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
