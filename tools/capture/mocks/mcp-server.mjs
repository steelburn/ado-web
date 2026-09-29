#!/usr/bin/env node
// Minimal stdio MCP server for the capture harness.
//
// Ships a fixed tool list so the MCP panel shows *connected* servers with a
// stable tool count — no npx download, no network. Invoked as
//   node mcp-server.mjs <serverName> <comma,separated,tool,names>
// and speaks newline-delimited JSON-RPC 2.0 on stdin/stdout (MCP stdio transport).
const name = process.argv[2] || 'demo-mcp';
const tools = (process.argv[3] || 'ping').split(',').filter(Boolean);

const send = (obj) => process.stdout.write(`${JSON.stringify(obj)}\n`);

function handle(msg) {
  const { id, method, params } = msg;
  const ok = (result) => id !== undefined && send({ jsonrpc: '2.0', id, result });
  switch (method) {
    case 'initialize':
      return ok({
        protocolVersion: params?.protocolVersion || '2024-11-05',
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name, version: '1.0.0' },
      });
    case 'notifications/initialized':
      return;
    case 'tools/list':
      return ok({
        tools: tools.map((t) => ({
          name: t,
          description: `${name}: ${t.replace(/_/g, ' ')}`,
          inputSchema: { type: 'object', properties: {}, additionalProperties: true },
        })),
      });
    case 'resources/list':
      return ok({ resources: [] });
    case 'prompts/list':
      return ok({ prompts: [] });
    case 'ping':
      return ok({});
    default:
      if (id !== undefined) send({ jsonrpc: '2.0', id, error: { code: -32601, message: `method not found: ${method}` } });
  }
}

let buf = '';
process.stdin.on('data', (d) => {
  buf += d.toString('utf8');
  let nl;
  while ((nl = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    try { handle(JSON.parse(line)); } catch { /* ignore malformed framing */ }
  }
});
