import React, { useState } from 'react';
import {
  Shield,
  Send,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Layers,
  Sparkles,
  ArrowRight,
  Terminal,
  FileCode
} from 'lucide-react';
import { TokenRecord, ChatCompletionResponse, TokenBankApi } from '../services/api';

interface PrivacyProxyViewProps {
  token: TokenRecord | null;
  onRefresh: () => void;
  onNavigateTab: (tab: any) => void;
  onOpenCreateModal: () => void;
}

export const PrivacyProxyView: React.FC<PrivacyProxyViewProps> = ({
  token,
  onRefresh,
  onNavigateTab,
  onOpenCreateModal,
}) => {
  const [model, setModel] = useState('gemini-3.8-flash');
  const [prompt, setPrompt] = useState('Explain zero-knowledge bearer tokens and why atomic pre-flight checks prevent race conditions.');
  const [maxTokens, setMaxTokens] = useState(250);
  const [temperature, setTemperature] = useState(0.7);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<ChatCompletionResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<'response' | 'accounting' | 'raw'>('response');

  const presetPrompts = [
    'Explain zero-knowledge bearer tokens and why atomic pre-flight checks prevent race conditions.',
    'What headers must be stripped to prevent client IP leakage when proxying LLM calls?',
    'How does Lua scripting in Redis ensure Time-Of-Check to Time-Of-Use (TOCTOU) safety?',
  ];

  if (!token) {
    return (
      <div className="py-20 text-center max-w-md mx-auto">
        <Shield className="w-10 h-10 text-neutral-500 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-neutral-200 mb-1">No Active Bearer Key</h3>
        <p className="text-xs text-neutral-400 mb-6">
          You need an anonymous token to test the privacy proxy and verify accounting reconciliation.
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

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setErrorMsg(null);
    setResponse(null);

    try {
      const res = await TokenBankApi.chatCompletionProxy(token.tokenId, {
        model,
        messages: [
          { role: 'system', content: 'You are an expert distributed systems engineer and privacy security architect.' },
          { role: 'user', content: prompt },
        ],
        maxTokens,
        temperature,
      });

      setResponse(res);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Proxy execution failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            Privacy Proxy Execution Studio
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Test LLM chat completions with real-time header sanitization and pre-flight token accounting.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-neutral-400">
          <span>Bearer: <strong className="text-neutral-200">{token.maskedToken}</strong></span>
          <span>·</span>
          <span>Balance: <strong className="text-emerald-400">{token.remainingBalance.toLocaleString()}</strong></span>
        </div>
      </div>

      {/* Main Grid: Request Form + Response Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Request Composer */}
        <div className="lg:col-span-5 space-y-4">
          <form onSubmit={handleSend} className="border border-neutral-800 bg-neutral-900/40 rounded-2xl p-5 space-y-4">
            {/* Model Selector */}
            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                Upstream Target Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs rounded-lg px-3 py-2 font-mono focus:outline-none focus:border-emerald-500"
              >
                <option value="gemini-3.8-flash">Google Gemini 3.8 Flash (Enterprise Upstream)</option>
                <option value="gemini-3.1-pro-preview">Google Gemini 3.1 Pro (Complex Reasoning)</option>
                <option value="gpt-4o">OpenAI GPT-4o (Compatible Downstream)</option>
                <option value="claude-3-5-sonnet">Anthropic Claude 3.5 Sonnet</option>
                <option value="deepseek-v3">DeepSeek V3 (High-Throughput)</option>
              </select>
            </div>

            {/* Prompt Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-neutral-300">Prompt Content</label>
                <span className="text-[11px] font-mono text-neutral-500">
                  ~{Math.ceil(prompt.length / 4)} prompt tokens
                </span>
              </div>
              <textarea
                rows={5}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs rounded-xl p-3.5 font-mono focus:outline-none focus:border-emerald-500 resize-y leading-relaxed"
                placeholder="Enter prompt for anonymized evaluation..."
                required
              />
            </div>

            {/* Preset Buttons */}
            <div>
              <span className="text-[11px] text-neutral-500 block mb-1.5">Prompt Presets:</span>
              <div className="space-y-1">
                {presetPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPrompt(p)}
                    className="w-full text-left p-2 rounded-lg bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 text-[11px] text-neutral-400 hover:text-neutral-200 truncate transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders: Max Tokens & Temperature */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-neutral-800/80">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-neutral-400">
                  <span>Max Tokens</span>
                  <span className="font-mono text-neutral-200 font-semibold">{maxTokens}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="1500"
                  step="50"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Number(e.target.value))}
                  className="w-full accent-emerald-400 h-1.5 bg-neutral-950 rounded-lg cursor-pointer border border-neutral-800"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-neutral-400">
                  <span>Temperature</span>
                  <span className="font-mono text-neutral-200 font-semibold">{temperature}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="w-full accent-emerald-400 h-1.5 bg-neutral-950 rounded-lg cursor-pointer border border-neutral-800"
                />
              </div>
            </div>

            {/* Submit CTA */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || !prompt.trim()}
                className="w-full py-2.5 bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-semibold text-xs rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing Atomic Reservation & Proxying...</span>
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

          {/* Quick Nav to Header Sanitization */}
          <div className="border border-neutral-800 bg-neutral-900/30 rounded-xl p-4 flex items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-semibold text-neutral-200 block">Header Sanitization Audit</span>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Inspect which headers are stripped prior to upstream transit.
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('sanitization')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 shrink-0"
            >
              <span>Inspect</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Right Column: Response & Accounting Panel */}
        <div className="lg:col-span-7 space-y-4">
          <div className="border border-neutral-800 bg-neutral-900/40 rounded-2xl p-5 min-h-[480px] flex flex-col justify-between">
            <div>
              {/* Output Tab Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-neutral-200">Proxy Output</span>
                  {response && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                      HTTP {response.statusCode} OK · {response.latencyMs}ms
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 p-0.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs">
                  <button
                    onClick={() => setViewTab('response')}
                    className={`px-3 py-1 rounded transition-colors ${
                      viewTab === 'response' ? 'bg-neutral-800 text-neutral-100 font-medium' : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Assistant Output
                  </button>
                  <button
                    onClick={() => setViewTab('accounting')}
                    className={`px-3 py-1 rounded transition-colors ${
                      viewTab === 'accounting' ? 'bg-neutral-800 text-emerald-400 font-medium' : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Accounting Delta
                  </button>
                  <button
                    onClick={() => setViewTab('raw')}
                    className={`px-3 py-1 rounded transition-colors ${
                      viewTab === 'raw' ? 'bg-neutral-800 text-neutral-100 font-medium' : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    JSON Response
                  </button>
                </div>
              </div>

              {/* Error Callout */}
              {errorMsg && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs space-y-2 mb-4">
                  <div className="font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>Proxy Stopped: Limit Reached (HTTP 429)</span>
                  </div>
                  <p className="font-mono text-[11px] leading-relaxed">
                    {errorMsg}
                  </p>
                </div>
              )}

              {/* Content Areas */}
              {isLoading ? (
                <div className="py-28 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-emerald-400 mx-auto" />
                  <p className="text-xs text-neutral-400">
                    Executing Redis Lua atomic reservation & querying upstream LLM...
                  </p>
                </div>
              ) : !response ? (
                <div className="py-28 text-center text-neutral-500 text-xs">
                  Awaiting request execution. Select a model and click "Send Proxied Request".
                </div>
              ) : viewTab === 'response' ? (
                <div className="space-y-4">
                  <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-200 font-sans leading-relaxed whitespace-pre-wrap">
                    {response.content}
                  </div>

                  {/* Token Usage Badges */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                      <span className="text-[10px] text-neutral-500 uppercase font-mono block">Prompt Tokens</span>
                      <span className="text-lg font-bold font-mono text-neutral-200 tabular-nums">
                        {response.usage.promptTokens}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                      <span className="text-[10px] text-neutral-500 uppercase font-mono block">Completion Tokens</span>
                      <span className="text-lg font-bold font-mono text-neutral-200 tabular-nums">
                        {response.usage.completionTokens}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                      <span className="text-[10px] text-neutral-500 uppercase font-mono block">Total Deducted</span>
                      <span className="text-lg font-bold font-mono text-emerald-400 tabular-nums">
                        {response.usage.totalTokens}
                      </span>
                    </div>
                  </div>
                </div>
              ) : viewTab === 'accounting' ? (
                <div className="space-y-4">
                  <div className="border border-neutral-800 bg-neutral-950 rounded-xl p-4 space-y-3">
                    <h5 className="text-xs font-semibold text-neutral-200 flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-cyan-400" />
                      Two-Phase Atomic Accounting Trace
                    </h5>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      TokenBank reserves estimated tokens in Redis before forwarding downstream. When the upstream call completes, the exact difference is reconciled via <code className="font-mono text-neutral-300">INCRBY diff</code>.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono pt-1">
                      <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800">
                        <span className="text-[10px] text-neutral-500 block">1. Preflight Reserved</span>
                        <span className="text-base font-bold text-neutral-200 tabular-nums">
                          {response.accounting.estimatedReserved} tokens
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800">
                        <span className="text-[10px] text-neutral-500 block">2. Actual Usage</span>
                        <span className="text-base font-bold text-neutral-200 tabular-nums">
                          {response.accounting.actualDeducted} tokens
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800">
                        <span className="text-[10px] text-neutral-500 block">3. Reconcile Delta</span>
                        <span className="text-base font-bold text-emerald-400 tabular-nums">
                          {response.accounting.reconciliationDelta > 0 ? `+${response.accounting.reconciliationDelta}` : response.accounting.reconciliationDelta} tokens
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border border-neutral-800 bg-neutral-950 rounded-xl p-4 space-y-2 text-xs">
                    <span className="font-semibold text-neutral-200 block">Remaining Spendable Quota:</span>
                    <span className="text-2xl font-bold font-mono text-emerald-400 tabular-nums block">
                      {response.accounting.remainingBalance.toLocaleString()} tokens
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl max-h-[360px] overflow-x-auto">
                  <pre className="font-mono text-[11px] text-neutral-300 leading-relaxed">
                    {JSON.stringify(response, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Custom Audit Headers attached to response */}
            {response && (
              <div className="pt-3 mt-4 border-t border-neutral-800">
                <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block mb-1">
                  Attached Custom Headers Returned to Client
                </span>
                <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                  <span className="px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-300">
                    <span className="text-emerald-400">X-TokenBank-Remaining-Tokens:</span> {response.accounting.remainingBalance}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-300">
                    <span className="text-emerald-400">X-TokenBank-Limit:</span> {token.userSpendLimit}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-300">
                    <span className="text-emerald-400">X-TokenBank-Sanitized:</span> client-ip,cookies,user-agent
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
