// Unit tests for the capture-harness mocks (tools/capture/mocks/*).
//
// The mocks are what make captures hermetic, so they are tested like real
// services: each is spawned on an ephemeral-ish port and exercised over HTTP /
// stdio. Guards the ADO REST shapes the extension reads, the OpenAI SSE format,
// the scenario switch, and the stdio MCP handshake.
import assert from 'node:assert/strict';
import test from 'node:test';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const mock = (f) => join(root, 'tools', 'capture', 'mocks', f);

// Spawn a long-running mock and resolve once it signals readiness on stdout.
function start(file, env, ready = /listening/) {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [file], { env: { ...process.env, ...env } });
    let out = '';
    const timer = setTimeout(() => { proc.kill(); reject(new Error(`${file} did not start`)); }, 5000);
    proc.stdout.on('data', (d) => {
      out += d.toString();
      if (ready.test(out)) { clearTimeout(timer); resolve(proc); }
    });
    proc.stderr.on('data', (d) => process.stderr.write(d));
    proc.on('error', reject);
  });
}

const stop = (proc) => new Promise((res) => { proc.once('exit', res); proc.kill(); });

async function sseText(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const raw = await res.text();
  let text = '';
  for (const line of raw.split('\n')) {
    if (!line.startsWith('data: ')) continue;
    const payload = line.slice(6);
    if (payload === '[DONE]') break;
    const j = JSON.parse(payload);
    const d = j.choices?.[0]?.delta;
    if (d?.content) text += d.content;
    if (d?.tool_calls) text += JSON.stringify(d.tool_calls);
  }
  return text;
}

test('ado-mock serves the ADO REST shapes the extension reads', async () => {
  const port = 9410;
  const proc = await start(mock('ado.mjs'), { ADO_MOCK_PORT: String(port) });
  const base = `http://localhost:${port}`;
  try {
    const me = await (await fetch(`${base}/_apis/connectionData`)).json();
    assert.equal(me.authenticatedUser.displayName, 'Demo Developer');

    const items = await (await fetch(`${base}/AdoDemo/_apis/wit/workitems?ids=502,503&api-version=7.1`)).json();
    assert.equal(items.value.length, 2);
    assert.equal(items.value[0].fields['System.WorkItemType'], 'User Story');
    assert.match(items.value[0].fields['System.Title'], /Card tokenization/);

    const wiql = await (await fetch(`${base}/AdoDemo/_apis/wit/wiql?api-version=7.1`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: 'SELECT [System.Id] FROM WorkItems' }),
    })).json();
    assert.equal(wiql.workItems.length, 5);

    const repos = await (await fetch(`${base}/AdoDemo/_apis/git/repositories`)).json();
    assert.equal(repos.value[0].name, 'ado-demo');

    const comments = await (await fetch(`${base}/AdoDemo/_apis/wit/workitems/502/comments`)).json();
    assert.equal(comments.comments.length, 2);

    const pr = await (await fetch(`${base}/AdoDemo/_apis/git/repositories/ado-demo/pullrequests`)).json();
    assert.equal(pr.value[0].pullRequestId, 42);
  } finally {
    await stop(proc);
  }
});

test('llm-mock speaks OpenAI chat completions and honours the scenario switch', async () => {
  const port = 9411;
  const proc = await start(mock('llm.mjs'), { LLM_MOCK_PORT: String(port) });
  const base = `http://localhost:${port}`;
  try {
    const models = await (await fetch(`${base}/v1/models`)).json();
    assert.equal(models.data[0].id, 'demo-gpt');

    const skills = await (await fetch(`${base}/skills.json`)).json();
    assert.equal(skills.skills.length, 3);

    const set = (name) => fetch(`${base}/__scenario`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) });

    await set('plan');
    assert.match(await sseText(`${base}/v1/chat/completions`, { stream: true, messages: [] }), /AB#502/);

    await set('consent');
    assert.match(await sseText(`${base}/v1/chat/completions`, { stream: true, messages: [] }), /run_terminal_command/);

    await set('done');
    assert.match(await sseText(`${base}/v1/chat/completions`, { stream: true, messages: [] }), /pull request/i);

    // Keyword fallback when no scenario is forced.
    await set('does-not-exist');
    assert.match(await sseText(`${base}/v1/chat/completions`, { stream: true, messages: [{ role: 'user', content: 'draw a mermaid diagram' }] }), /flowchart/);
  } finally {
    await stop(proc);
  }
});

test('mcp-server completes the stdio handshake and lists tools', async () => {
  const proc = spawn(process.execPath, [mock('mcp-server.mjs'), 'filesystem', 'read_file,write_file'], { stdio: ['pipe', 'pipe', 'inherit'] });
  const lines = [];
  const got = new Promise((resolve) => {
    proc.stdout.on('data', (d) => {
      lines.push(...d.toString().split('\n').filter(Boolean));
      if (lines.length >= 2) resolve();
    });
  });
  try {
    proc.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} })}\n`);
    proc.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' })}\n`);
    await got;
    const init = JSON.parse(lines[0]);
    assert.equal(init.result.serverInfo.name, 'filesystem');
    const tools = JSON.parse(lines[1]);
    assert.deepEqual(tools.result.tools.map((t) => t.name), ['read_file', 'write_file']);
  } finally {
    proc.kill();
  }
});

test('wire.mjs renders settings with no placeholders left', () => {
  const r = spawnSync(process.execPath, [join(root, 'tools', 'capture', 'wiring', 'wire.mjs')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const settings = JSON.parse(spawnSync(process.execPath, ['-e',
    "process.stdout.write(require('fs').readFileSync('tools/capture/.generated/workspace/.vscode/settings.json','utf8'))"],
    { encoding: 'utf8', cwd: root }).stdout);
  assert.equal(settings['adoCode.organizations'][0].name, 'contoso-demo');
  assert.equal(settings['adoCode.llmApiUrl'], 'http://llm-mock:9001/v1');
  assert.ok(Array.isArray(settings['adoCode.mcp.servers']) && settings['adoCode.mcp.servers'].length === 2);
  assert.ok(settings['adoCode.consent.autoApproveTools'].length === 0);
  assert.ok(!JSON.stringify(settings).includes('${'), 'unsubstituted placeholder leaked into settings');
});
