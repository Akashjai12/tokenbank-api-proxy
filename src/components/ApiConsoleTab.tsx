import React, { useState } from 'react';
import { Terminal, Copy, Check, ExternalLink, Code } from 'lucide-react';

interface ApiConsoleTabProps {
  activeToken: string;
}

export const ApiConsoleTab: React.FC<ApiConsoleTabProps> = ({ activeToken }) => {
  const [activeSnippet, setActiveSnippet] = useState<'curl' | 'python' | 'node'>('curl');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000';
  const tokenToUse = activeToken || 'tb_live_f4b7a192c890e1837482910fae3b890123456789abcdef0123456789abcdef01';

  const copyCode = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const curlCommands = [
    {
      title: '1. Create an Anonymous Bearer Token with Custom Limits',
      endpoint: 'POST /v1/tokens/create',
      description: 'Generates a new anonymous bearer key with hard spend cap & optional daily rate limit. No email or IP required.',
      cmd: `curl -X POST "${baseUrl}/v1/tokens/create" \\
  -H "Content-Type: application/json" \\
  -d '{
    "allocated_tokens": 100000,
    "user_spend_limit": 50000,
    "daily_limit": 10000
  }'`
    },
    {
      title: '2. Check Real-Time Anonymous Status & Metrics',
      endpoint: 'GET /v1/tokens/status',
      description: 'Queries live token balances, used tokens, remaining quota, and daily usage directly from Redis.',
      cmd: `curl -X GET "${baseUrl}/v1/tokens/status" \\
  -H "Authorization: Bearer ${tokenToUse}"`
    },
    {
      title: '3. Dynamically Update Spending Limits',
      endpoint: 'PATCH /v1/tokens/limits',
      description: 'Adjusts user_spend_limit or daily_limit on the fly. Rejects any limit greater than total purchased balance.',
      cmd: `curl -X PATCH "${baseUrl}/v1/tokens/limits" \\
  -H "Authorization: Bearer ${tokenToUse}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "user_spend_limit": 75000,
    "daily_limit": 15000
  }'`
    },
    {
      title: '4. Execute Proxied Request Through Privacy Gateway',
      endpoint: 'POST /v1/chat/completions',
      description: 'Sanitizes all client IP/cookie headers, performs atomic Redis reservation, and proxies downstream with token reconciliation.',
      cmd: `curl -i -X POST "${baseUrl}/v1/chat/completions" \\
  -H "Authorization: Bearer ${tokenToUse}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gemini-3.8-flash",
    "messages": [
      {"role": "user", "content": "Explain zero-knowledge proofs and anonymous bearer credentials."}
    ],
    "max_tokens": 200
  }'`
    }
  ];

  const pythonSnippet = `import httpx
import asyncio

async def test_token_bank():
    base_url = "${baseUrl}"
    bearer_token = "${tokenToUse}"
    headers = {"Authorization": f"Bearer {bearer_token}"}

    async with httpx.AsyncClient() as client:
        # 1. Check real-time token status
        status_res = await client.get(f"{base_url}/v1/tokens/status", headers=headers)
        print("Token Status:", status_res.json())

        # 2. Update spend limit dynamically
        patch_res = await client.patch(
            f"{base_url}/v1/tokens/limits",
            headers=headers,
            json={"user_spend_limit": 60000, "daily_limit": 12000}
        )
        print("Updated Limits:", patch_res.json())

        # 3. Send anonymous chat completion via privacy proxy
        chat_res = await client.post(
            f"{base_url}/v1/chat/completions",
            headers=headers,
            json={
                "model": "gemini-3.8-flash",
                "messages": [{"role": "user", "content": "Hello via Privacy Proxy!"}],
                "max_tokens": 100
            }
        )
        print("Remaining Tokens Header:", chat_res.headers.get("X-TokenBank-Remaining-Tokens"))
        print("Response:", chat_res.json())

asyncio.run(test_token_bank())
`;

  const nodeSnippet = `// Node.js (v18+) fetch example
const baseUrl = "${baseUrl}";
const bearerToken = "${tokenToUse}";

async function run() {
  // 1. Inspect Status
  const statusRes = await fetch(\`\${baseUrl}/v1/tokens/status\`, {
    headers: { Authorization: \`Bearer \${bearerToken}\` }
  });
  console.log("Status:", await statusRes.json());

  // 2. Chat completion proxy call
  const proxyRes = await fetch(\`\${baseUrl}/v1/chat/completions\`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: \`Bearer \${bearerToken}\`
    },
    body: JSON.stringify({
      model: "gemini-3.8-flash",
      messages: [{ role: "user", content: "Explain atomic token reservations." }],
      max_tokens: 150
    })
  });

  console.log("Remaining tokens header:", proxyRes.headers.get("x-tokenbank-remaining-tokens"));
  console.log("Result:", await proxyRes.json());
}

run();
`;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            Interactive API Specifications & Code Snippets
          </h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-2xl leading-relaxed">
            All commands below are dynamically wired with your active bearer token and live endpoint URL. Copy and run directly in any terminal or script.
          </p>
        </div>

        {/* Tab selection */}
        <div className="flex items-center gap-1 p-1 bg-neutral-950 border border-neutral-800 rounded-lg">
          <button
            onClick={() => setActiveSnippet('curl')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              activeSnippet === 'curl' ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            cURL (CLI)
          </button>
          <button
            onClick={() => setActiveSnippet('python')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              activeSnippet === 'python' ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Python (httpx)
          </button>
          <button
            onClick={() => setActiveSnippet('node')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              activeSnippet === 'node' ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Node.js (fetch)
          </button>
        </div>
      </div>

      {activeSnippet === 'curl' ? (
        <div className="space-y-4">
          {curlCommands.map((item, idx) => (
            <div key={idx} className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-4 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-semibold text-neutral-200 flex items-center gap-2">
                    <span>{item.title}</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-emerald-400">
                      {item.endpoint}
                    </span>
                  </h4>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    {item.description}
                  </p>
                </div>

                <button
                  onClick={() => copyCode(item.cmd, idx)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors shrink-0 self-start sm:self-auto"
                >
                  {copiedIndex === idx ? (
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

              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg overflow-x-auto">
                <pre className="font-mono text-xs text-neutral-300 leading-relaxed">
                  {item.cmd}
                </pre>
              </div>
            </div>
          ))}
        </div>
      ) : activeSnippet === 'python' ? (
        <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-200">
              Python 3 Async Implementation (httpx)
            </span>
            <button
              onClick={() => copyCode(pythonSnippet, 99)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors"
            >
              {copiedIndex === 99 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedIndex === 99 ? 'Copied' : 'Copy Python'}</span>
            </button>
          </div>
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg overflow-x-auto max-h-[500px]">
            <pre className="font-mono text-xs text-neutral-300 leading-relaxed">
              {pythonSnippet}
            </pre>
          </div>
        </div>
      ) : (
        <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-200">
              Node.js TypeScript / JavaScript Client (native fetch)
            </span>
            <button
              onClick={() => copyCode(nodeSnippet, 98)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors"
            >
              {copiedIndex === 98 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedIndex === 98 ? 'Copied' : 'Copy Node'}</span>
            </button>
          </div>
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg overflow-x-auto max-h-[500px]">
            <pre className="font-mono text-xs text-neutral-300 leading-relaxed">
              {nodeSnippet}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
