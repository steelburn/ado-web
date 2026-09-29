#!/usr/bin/env node
// Deterministic, OpenAI-compatible LLM mock for the capture harness.
//
// Why: the chat webview renders whatever the model returns, so to shoot a
// *reproducible* plan card / tool call / Mermaid diagram we need stable model
// output — not a paid, non-deterministic provider. Point the extension at this
// server with `adoCode.llmApiUrl` (see tools/capture/wiring/wire.mjs).
//
// Two ways to pick the reply:
//   1. POST /__scenario {"name":"plan"}  — set the next reply explicitly (what
//      capture.mjs does before each scene); survives across requests.
//   2. Keyword match on the last user message (plan / mermaid / verify / tests).
//
// Endpoints: GET /v1/models, POST /v1/chat/completions (stream + non-stream).
// SSE follows the OpenAI chat.completions wire format, ending with `[DONE]`.
import { createServer } from 'node:http';

const PORT = Number(process.env.LLM_MOCK_PORT || 9001);
const MODEL = process.env.LLM_MOCK_MODEL || 'demo-gpt';
const TOOL = 'run_terminal_command';

const SCENARIOS = {
  default: {
    text: 'I have the workspace open. Ask me to plan, implement, or review a work item and I will use the ADO Code tools to do it.',
  },
  plan: {
    text: [
      '## Plan — AB#502 Card tokenization',
      '',
      '1. **Add a token vault adapter** (AB#503) — wrap the vault SDK, unit-test read/write/rotate.',
      '2. **Backfill legacy cards** (AB#504) — one-off, idempotent migration job.',
      '3. **Open the PR into `main`** once tests, lint and build are green (AB#502).',
      '',
      'I will keep the migration behind `feature.cardTokens` and close both tasks as I finish them.',
    ].join('\n'),
  },
  consent: {
    // First turn asks for a shell command that is not auto-approved → the chat
    // renders the consent card with its auto-approve countdown.
    tool: { name: TOOL, args: { command: 'npm run migrate:card-tokens -- --dry-run' } },
  },
  diff: {
    text: [
      'Applied the vault adapter and wired the migration flag.',
      '',
      '```diff',
      '--- a/src/vault/adapter.ts',
      '+++ b/src/vault/adapter.ts',
      '@@ -12,6 +12,11 @@ export class VaultAdapter {',
      '+  async rotate(cardId: string): Promise<Token> {',
      '+    const current = await this.read(cardId);',
      '+    return this.write(cardId, await this.vault.reissue(current));',
      '+  }',
      ' }',
      '```',
      '',
      'Next: run the verification gates.',
    ].join('\n'),
  },
  mermaid: {
    text: [
      'Here is the checkout flow after the change:',
      '',
      '```mermaid',
      'flowchart LR',
      '  A[Checkout UI] --> B{Token on file?}',
      '  B -- yes --> C[Charge token]',
      '  B -- no --> D[Tokenize card]',
      '  D --> C',
      '  C --> E[Receipt]',
      '```',
    ].join('\n'),
  },
  gates: {
    text: [
      '### Verification',
      '',
      '- **tests** ✅ 128 passed',
      '- **lint** ✅ clean',
      '- **build** ✅ 0 errors',
      '',
      'All gates green — safe to open the PR.',
    ].join('\n'),
  },
  done: {
    text: [
      '### AB#502 Card tokenization — complete',
      '',
      'Tests, lint and build are green. I opened the pull request:',
      '',
      '- **PR #43** → `feature/ab502-card-tokenization` into `main`',
      '',
      'AB#502, AB#503 and AB#504 are set to **Committed**.',
    ].join('\n'),
  },
};

function pickScenario(body) {
  const text = (body?.messages || []).map((m) => (typeof m.content === 'string' ? m.content : '')).join('\n').toLowerCase();
  if (/mermaid|diagram|flow/.test(text)) return 'mermaid';
  if (/verif|test|lint|gate/.test(text)) return 'gates';
  if (/plan|break ?down/.test(text)) return 'plan';
  return 'default';
}

let forced = null; // set by POST /__scenario

const chunk = (obj) => `data: ${JSON.stringify(obj)}\n\n`;

function streamText(res, text) {
  const id = `chatcmpl-demo-${Date.now()}`;
  const base = { id, object: 'chat.completion.chunk', model: MODEL };
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
  res.write(chunk({ ...base, choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }] }));
  for (const piece of text.match(/[\s\S]{1,28}/g) || []) {
    res.write(chunk({ ...base, choices: [{ index: 0, delta: { content: piece }, finish_reason: null }] }));
  }
  res.write(chunk({ ...base, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] }));
  res.write('data: [DONE]\n\n');
  res.end();
}

function streamTool(res, tool) {
  const id = `chatcmpl-demo-${Date.now()}`;
  const base = { id, object: 'chat.completion.chunk', model: MODEL };
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
  res.write(chunk({ ...base, choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }] }));
  res.write(chunk({
    ...base,
    choices: [{ index: 0, delta: { tool_calls: [{ index: 0, id: 'call_demo_1', type: 'function', function: { name: tool.name, arguments: JSON.stringify(tool.args) } }] }, finish_reason: null }],
  }));
  res.write(chunk({ ...base, choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }] }));
  res.write('data: [DONE]\n\n');
  res.end();
}

const server = createServer((req, res) => {
  const u = new URL(req.url, `http://localhost:${PORT}`);
  if (req.method === 'GET' && u.pathname.endsWith('/skills.json')) {
    // Served so `adoCode.skillRegistryUrls` resolves offline (the MCP/skills panel
    // shows a populated catalog without reaching the network).
    const registry = JSON.stringify({
      version: 1,
      skills: [
        { id: 'ado-work-item', name: 'ADO Work Item', category: 'azure-devops', description: 'Create and update work items from chat.' },
        { id: 'pr-review', name: 'PR Review', category: 'git', description: 'Review a pull request and post comments.' },
        { id: 'release-notes', name: 'Release Notes', category: 'docs', description: 'Draft release notes from merged work items.' },
      ],
    });
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(registry);
  }
  if (req.method === 'GET' && u.pathname.endsWith('/models')) {
    const payload = JSON.stringify({ object: 'list', data: [{ id: MODEL, object: 'model', owned_by: 'ado-web-capture' }] });
    console.log(`[llm-mock] ${u.pathname} → model list`);
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(payload);
  }
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const raw = Buffer.concat(chunks).toString('utf8');
    let body = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch { /* ignore */ }

    if (u.pathname === '/__scenario') {
      forced = body?.name && SCENARIOS[body.name] ? body.name : null;
      console.log(`[llm-mock] scenario forced → ${forced || 'auto'}`);
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ scenario: forced }));
    }

    const name = forced || pickScenario(body);
    const scene = SCENARIOS[name];
    const wantStream = body.stream !== false;
    // Log every completion so a capture run can be verified end-to-end
    // (`docker logs llm-mock`) instead of guessed from the screenshot.
    console.log(
      `[llm-mock] ${u.pathname} model=${body.model || MODEL} scenario=${name} stream=${wantStream} msgs=${(body.messages || []).length}`,
    );

    if (scene.tool) {
      if (wantStream) return streamTool(res, scene.tool);
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({
        id: 'chatcmpl-demo', object: 'chat.completion', model: MODEL,
        choices: [{ index: 0, message: { role: 'assistant', content: null, tool_calls: [{ id: 'call_demo_1', type: 'function', function: { name: scene.tool.name, arguments: JSON.stringify(scene.tool.args) } }] }, finish_reason: 'tool_calls' }],
      }));
    }

    if (wantStream) return streamText(res, scene.text);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      id: 'chatcmpl-demo', object: 'chat.completion', model: MODEL,
      choices: [{ index: 0, message: { role: 'assistant', content: scene.text }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
    }));
  });
});

server.listen(PORT, () => console.log(`llm-mock listening on :${PORT} (model ${MODEL}, scenario ${forced || 'auto'})`));
