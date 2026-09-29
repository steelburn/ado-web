#!/usr/bin/env node
// Deterministic mock of the Azure DevOps REST surface that ado-code calls.
//
// Why: the capture harness must be hermetic — no live org, no PAT, no network —
// so screenshots are reproducible in CI and on any machine. Point the extension
// at this server with `adoCode.organizations[0].url` / `adoCode.adoServerUrl`
// (see tools/capture/wiring/wire.mjs). Auth headers are ignored.
//
// Subset implemented (ADO REST 7.1): connectionData, profile/me, projects,
// teams, wit/wiql, wit/workitems (batch + single), wit/workitems/{id}/comments,
// git/repositories, git/.../pullrequests (GET + POST). Anything else returns an
// empty collection so the extension degrades gracefully instead of erroring.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const data = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'data.json'), 'utf8'));
const PORT = Number(process.env.ADO_MOCK_PORT || 9000);

const j = (res, body, status = 200) => {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'access-control-allow-origin': '*',
  });
  res.end(payload);
};

// A work item in the shape the extension's REST reader expects (fields bag).
const wi = (w) => ({
  id: w.id,
  rev: 1,
  url: `http://localhost:${PORT}/_apis/wit/workItems/${w.id}`,
  fields: {
    'System.Id': w.id,
    'System.WorkItemType': w.type,
    'System.Title': w.title,
    'System.State': w.state,
    'System.AssignedTo': { displayName: w.assignedTo, uniqueName: `${w.assignedTo}@contoso-demo.example` },
    'System.AreaPath': w.area,
    'System.IterationPath': w.iteration,
    'System.Description': w.description ? `<p>${w.description}</p>` : '',
    'Microsoft.VSTS.Common.AcceptanceCriteria': w.acceptanceCriteria ? `<p>${w.acceptanceCriteria}</p>` : '',
    'System.Parent': w.parent,
  },
});

const comment = (c, i) => ({
  id: i + 1,
  workItemId: 0,
  text: `<p>${c.text}</p>`,
  createdBy: { displayName: c.author },
  createdDate: `2025-01-0${i + 1}T10:00:00Z`,
});

const handlers = {
  connectionData: () => ({
    authenticatedUser: data.user,
    authorizedUser: data.user,
    instanceId: data.org,
    locationServiceData: { serviceOwner: data.user.displayName },
  }),
  'profile/me': () => ({
    id: data.user.id,
    displayName: data.user.displayName,
    emailAddress: data.user.uniqueName,
  }),
  projects: (u) => (u.pathname.match(/\/([^/]+)\/_apis\/projects\/[^/]+\/teams/)?.[1] === undefined
    ? { count: 1, value: [data.project] }
    : { count: 1, value: [data.team] }),
  teams: () => ({ count: 1, value: [data.team] }),
  wiql: (u, body) => {
    // Echo the requested ids when the query projects them; otherwise all items.
    const ids = [...(body?.query || '').matchAll(/\[System\.Id\]\s*=\s*(\d+)/gi)].map((m) => Number(m[1]));
    const all = data.workItems;
    const list = ids.length ? all.filter((w) => ids.includes(w.id)) : all;
    return { queryType: 'flat', workItems: list.map((w) => ({ id: w.id, url: `http://localhost:${PORT}/_apis/wit/workItems/${w.id}` })) };
  },
  workitemsBatch: (u) => {
    const ids = (u.searchParams.get('ids') || '').split(',').map(Number).filter(Boolean);
    const all = data.workItems.map(wi);
    return { count: all.length, value: ids.length ? all.filter((w) => ids.includes(w.id)) : all };
  },
  workitemSingle: (u) => {
    const id = Number(u.pathname.split('/').pop());
    const w = data.workItems.find((x) => x.id === id);
    return w ? wi(w) : { errorCode: 0, message: 'not found' };
  },
  workitemComments: (u) => {
    const id = Number(u.pathname.split('/').slice(-2)[0]);
    const w = data.workItems.find((x) => x.id === id);
    const comments = (w?.comments || []).map(comment);
    return { totalCount: comments.length, count: comments.length, comments };
  },
  classificationNodes: () => ({
    name: 'AdoDemo',
    structureType: 'Project',
    children: [{ name: 'Sprint 12', structureType: 'Iteration', path: '\\AdoDemo\\Iteration\\Sprint 12' }],
  }),
  repositories: () => ({ count: 1, value: [data.repository] }),
  pullRequests: (u, body, method) => {
    if (method === 'POST') {
      const draft = { ...data.pullRequests[0], pullRequestId: 43, title: body?.title || 'Demo PR', status: 'active' };
      return draft;
    }
    return { count: data.pullRequests.length, value: data.pullRequests };
  },
};

function route(u, body, method) {
  const p = u.pathname.toLowerCase();
  if (p.includes('_apis/wit/workitems') && p.includes('/comments')) return handlers.workitemComments(u);
  if (p.includes('_apis/wit/workitems')) return /\d+$/.test(u.pathname) ? handlers.workitemSingle(u) : handlers.workitemsBatch(u);
  if (p.includes('_apis/wit/wiql')) return handlers.wiql(u, body);
  if (p.includes('_apis/wit/classificationnodes')) return handlers.classificationNodes();
  if (p.includes('_apis/wit')) return { count: 0, value: [] };
  if (p.includes('pullrequests')) return handlers.pullRequests(u, body, method);
  if (p.includes('_apis/git/repositories')) return handlers.repositories();
  if (p.includes('_apis/projects') && p.includes('/teams')) return handlers.teams();
  if (p.includes('_apis/projects')) return { count: 1, value: [data.project] };
  if (p.includes('_apis/profile')) return handlers['profile/me']();
  if (p.includes('_apis/connectiondata')) return handlers.connectionData();
  if (p.includes('_apis')) return { count: 0, value: [] };
  return { count: 0, value: [] };
}

const server = createServer((req, res) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const raw = Buffer.concat(chunks).toString('utf8');
    let body;
    try { body = raw ? JSON.parse(raw) : undefined; } catch { body = { query: raw }; }
    const u = new URL(req.url, `http://localhost:${PORT}`);
    const out = route(u, body, req.method);
    // Log every call so a capture run can be verified end-to-end
    // (`docker logs ado-mock`) instead of inferred from the screenshot.
    const n = Array.isArray(out?.value)
      ? out.value.length
      : Array.isArray(out?.workItems)
        ? out.workItems.length
        : undefined;
    console.log(`[ado-mock] ${req.method} ${u.pathname}${n !== undefined ? ` → ${n} item(s)` : ''}`);
    j(res, out);
  });
});

server.listen(PORT, () => console.log(`ado-mock listening on :${PORT} (org ${data.org}, project ${data.project.name})`));
