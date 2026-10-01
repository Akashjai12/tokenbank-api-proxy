import React, { useState } from 'react';
import { Terminal, Copy, Check, Code, ExternalLink, Sparkles } from 'lucide-react';
import { TokenRecord } from '../services/api';

interface ApiConsoleViewProps {
  token: TokenRecord | null;
}

export const ApiConsoleView: React.FC<ApiConsoleViewProps> = ({ token }) => {
  const [lang, setLang] = useState<'curl' | 'python' | 'node'>('curl');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const bearerKey = token?.tokenId || 'tb_live_7e84a92c310b89f41de600829ac455b8';
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://api.tokenbank.dev';

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const curlSnippets = [
    {
      id: 'curl-create',
      title: '1. Provision an Anonymous Token',
      endpoint: 'POST /v1/tokens/create',
      code: `curl -X POST "${baseUrl}/v1/tokens/create" \\
  -H "Content-Type: application/json" \\
  -d '{
    "allocated_tokens": 100000,
    "user_spend_limit": 50000,
    "daily_limit": 10000
  }'`,
    },
    {
      id: 'curl-status',
      title: '2. Check Real-Time Anonymous Status',
      endpoint: 'GET /v1/tokens/status',
      code: `curl -X GET "${baseUrl}/v1/tokens/status" \\
  -H "Authorization: Bearer ${bearerKey}"`,
    },
    {
      id: 'curl-limits',
      title: '3. Dynamically Update Spending Limits',
      endpoint: 'PATCH /v1/tokens/limits',
      code: `curl -X PATCH "${baseUrl}/v1/tokens/limits" \\
  -H "Authorization: Bearer ${bearerKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "user_spend_limit": 75000,
    "daily_limit": 15000
  }'`,
    },
    {
      id: 'curl-proxy',
      title: '4. Execute Proxied Request Through Privacy Gateway',
      endpoint: 'POST /v1/chat/completions',
      code: `curl -i -X POST "${baseUrl}/v1/chat/completions" \\
  -H "Authorization: Bearer ${bearerKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gemini-3.8-flash",
    "messages": [
      {"role": "user", "content": "Explain zero-knowledge privacy in 1 sentence."}
    ],
    "max_tokens": 200
  }'`,
    },
  ];

  const pythonSnippet = `import httpx
import asyncio

BASE_URL = "${baseUrl}"
BEARER_TOKEN = "${bearerKey}"

async def main():
    headers = {"Authorization": f"Bearer {BEARER_TOKEN}"}

    async with httpx.AsyncClient() as client:
        # 1. Fetch real-time token status
        status_res = await client.get(f"{BASE_URL}/v1/tokens/status", headers=headers)
        print("Token Status:", status_res.json())

        # 2. Update spend limits dynamically
        patch_res = await client.patch(
            f"{BASE_URL}/v1/tokens/limits",
            headers=headers,
            json={"user_spend_limit": 80000, "daily_limit": 20000}
        )
        print("Updated Limits:", patch_res.json())

        # 3. Proxy chat completion (scrubbing IP & cookies)
        completion_res = await client.post(
            f"{BASE_URL}/v1/chat/completions",
            headers=headers,
            json={
                "model": "gemini-3.8-flash",
                "messages": [{"role": "user", "content": "Hello anonymous proxy!"}],
                "max_tokens": 100
            }
        )
        print("Remaining Quota Header:", completion_res.headers.get("X-TokenBank-Remaining-Tokens"))
        print("Response:", completion_res.json())

if __name__ == "__main__":
    asyncio.run(main())
`;

  const nodeSnippet = `// Node.js (v18+) Native Fetch SDK Pattern
const BASE_URL = "${baseUrl}";
const BEARER_TOKEN = "${bearerKey}";

async function run() {
  const headers = { Authorization: \`Bearer \${BEARER_TOKEN}\` };

  // 1. Inspect Token Balance & Ceilings
  const statusRes = await fetch(\`\${BASE_URL}/v1/tokens/status\`, { headers });
  const status = await statusRes.json();
  console.log("Active Status:", status);

  // 2. Execute Privacy Proxied Request
  const proxyRes = await fetch(\`\${BASE_URL}/v1/chat/completions\`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gemini-3.8-flash",
      messages: [{ role: "user", content: "Explain atomic token reservations." }],
      max_tokens: 150
    })
  });

  console.log("Remaining tokens header:", proxyRes.headers.get("x-tokenbank-remaining-tokens"));
  console.log("Output:", await proxyRes.json());
}

run();
`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-emerald-400" />
            API Console & Integration SDKs
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Ready-to-run snippets wired dynamically with your active bearer token and API endpoint.
          </p>
        </div>

        {/* Language Tabs */}
        <div className="flex items-center p-1 bg-neutral-900 border border-neutral-800 rounded-xl text-xs self-start sm:self-auto">
          <button
            onClick={() => setLang('curl')}
            className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
              lang === 'curl' ? 'bg-neutral-800 text-neutral-100 shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            cURL (CLI)
          </button>
          <button
            onClick={() => setLang('python')}
            className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
              lang === 'python' ? 'bg-neutral-800 text-neutral-100 shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Python (httpx)
          </button>
          <button
            onClick={() => setLang('node')}
            className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
              lang === 'node' ? 'bg-neutral-800 text-neutral-100 shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Node.js (fetch)
          </button>
        </div>
      </div>

      {lang === 'curl' ? (
        <div className="space-y-4">
          {curlSnippets.map((item) => (
            <div
              key={item.id}
              className="border border-neutral-800 bg-neutral-900/40 rounded-2xl p-5 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-semibold text-neutral-200 flex items-center gap-2">
                    <span>{item.title}</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-emerald-400">
                      {item.endpoint}
                    </span>
                  </h4>
                </div>

                <button
                  onClick={() => copyToClipboard(item.code, item.id)}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors self-start sm:self-auto font-medium"
                >
                  {copiedId === item.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy cURL</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl overflow-x-auto">
                <pre className="font-mono text-xs text-neutral-300 leading-relaxed">
                  {item.code}
                </pre>
              </div>
            </div>
          ))}
        </div>
      ) : lang === 'python' ? (
        <div className="border border-neutral-800 bg-neutral-900/40 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-200">
              Python 3 Async Implementation (httpx)
            </span>
            <button
              onClick={() => copyToClipboard(pythonSnippet, 'python')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors font-medium"
            >
              {copiedId === 'python' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Script</span>
                </>
              )}
            </button>
          </div>
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl overflow-x-auto max-h-[560px]">
            <pre className="font-mono text-xs text-neutral-300 leading-relaxed">
              {pythonSnippet}
            </pre>
          </div>
        </div>
      ) : (
        <div className="border border-neutral-800 bg-neutral-900/40 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-200">
              Node.js Client (Native Fetch API)
            </span>
            <button
              onClick={() => copyToClipboard(nodeSnippet, 'node')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors font-medium"
            >
              {copiedId === 'node' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Script</span>
                </>
              )}
            </button>
          </div>
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl overflow-x-auto max-h-[560px]">
            <pre className="font-mono text-xs text-neutral-300 leading-relaxed">
              {nodeSnippet}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
