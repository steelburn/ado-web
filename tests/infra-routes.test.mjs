// Phase 3 (infra) guards for the multi-page split:
//   * nginx extensionless 301 aliases + the 404 error page
//   * sitemap.xml <-> PAGES parity (every page, one <lastmod> each)
//   * 404.html has no stale /#section deep links
//   * index.html carries a complete legacy /#section -> /page.html#anchor map
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PAGES, SITE_ORIGIN } from '../scripts/site-pages.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const nginx = read('nginx.conf');
const sitemap = read('sitemap.xml');
const notFound = read('404.html');
const index = read('index.html');

// ── nginx.conf ──────────────────────────────────────────────────────────────
test('nginx: every extensionless route 301s to its canonical .html page', () => {
  for (const p of PAGES) {
    if (p.url === '/') continue; // home is served, not aliased
    const clean = p.url.replace(/\.html$/, '');
    const re = new RegExp(
      `location\\s*=\\s*${clean.replace(/\//g, '\\/')}\\s*\\{\\s*return\\s+301\\s+${p.url.replace(/\./g, '\\.').replace(/\//g, '\\/')};\\s*\\}`,
    );
    assert.match(nginx, re, `missing 301 alias for ${clean} -> ${p.url}`);
  }
});

test('nginx: the custom 404 error page is wired up', () => {
  assert.match(nginx, /error_page\s+404\s+=\s*404\s+\/404\.html;/);
});

test('nginx: braces are balanced', () => {
  const open = (nginx.match(/\{/g) || []).length;
  const close = (nginx.match(/\}/g) || []).length;
  assert.equal(open, close, 'unbalanced { } in nginx.conf');
});

// ── sitemap.xml ─────────────────────────────────────────────────────────────
test('sitemap: lists exactly the site pages (parity with PAGES)', () => {
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const expected = PAGES.map((p) => `${SITE_ORIGIN}${p.url}`);
  assert.deepEqual([...locs].sort(), [...expected].sort());
});

test('sitemap: every <url> has a <lastmod>', () => {
  const urls = (sitemap.match(/<url>/g) || []).length;
  const lastmods = (sitemap.match(/<lastmod>/g) || []).length;
  assert.equal(urls, lastmods);
  assert.ok(urls >= PAGES.length);
});

// ── 404.html ────────────────────────────────────────────────────────────────
test('404.html: no stale /#section deep links remain', () => {
  const stale = [...notFound.matchAll(/href="\/#[^"]+"/g)].map((m) => m[0]);
  assert.deepEqual(stale, [], `404.html still links to old anchors: ${stale.join(', ')}`);
});

test('404.html: offer a link back home (and to install)', () => {
  assert.match(notFound, /href="\/"/);
  assert.match(notFound, /href="\/install\.html"/);
});

// ── index.html legacy redirect ──────────────────────────────────────────────
const LEGACY_MAP = {
  '#features': '/features.html#features',
  '#screens': '/gallery.html#screens',
  '#launch': '/gallery.html#launch',
  '#all-features': '/features.html#all-features',
  '#modes': '/modes.html#modes',
  '#agents': '/agents.html#agents',
  '#commands': '/commands.html#commands',
  '#install': '/install.html#install',
  '#faq': '/faq.html#faq',
};

test('index.html: legacy /#section redirect covers every old anchor', () => {
  const pairs = [...index.matchAll(/'#([\w-]+)':\s*'\/([^']+)'/g)];
  const map = Object.fromEntries(pairs.map((m) => [`#${m[1]}`, `/${m[2]}`]));
  for (const [from, to] of Object.entries(LEGACY_MAP)) {
    assert.equal(map[from], to, `legacy redirect for ${from} -> ${to} missing`);
  }
});

test('index.html: every legacy redirect targets a real page file', () => {
  const files = new Set(PAGES.map((p) => p.file));
  for (const to of Object.values(LEGACY_MAP)) {
    const file = to.replace(/^\//, '').split('#')[0];
    assert.ok(files.has(file), `legacy redirect points at unknown page: ${file}`);
  }
});
