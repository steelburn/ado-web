#!/usr/bin/env node
// tools/split-pages.mjs
//
// One-time Phase 2 migration helper. Splits the monolithic index.html into the
// 8-page IA (Option A) using scripts/site-pages.mjs as the SSOT.
//
// Design notes:
//   * Sections are sliced VERBATIM from index.html (no retyping) and CRLF is
//     preserved, so the moved markup is byte-identical to the original.
//   * Chrome (header/footer) is duplicated from _partials/ — strategy A1, no
//     build step. tests/chrome-parity.test.mjs is the drift safety net.
//   * Same-page `#anchor` links are rewritten to the page that now hosts the
//     section (e.g. #modes -> /modes.html#modes).
//
// This is a migration tool, NOT a build step (the site ships no bundler).
// It is guarded: it aborts if index.html no longer looks like the monolith.
//
// Usage: node tools/split-pages.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PAGES } from '../scripts/site-pages.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const NL = '\r\n';

const src = read('index.html');
const headInner = src.match(/<head>([\s\S]*?)<\/head>/)[1];
const skipLink = src.match(/<a class="skip-link"[^>]*>[^<]*<\/a>/)[0];
const mainInner = src.match(/<main id="main">([\s\S]*?)<\/main>/)[1];

if (!/id="features"/.test(mainInner)) {
  throw new Error('index.html does not look like the monolithic page (already split?) — aborting');
}

const headerPartial = read('_partials/header.html').match(/<header[\s\S]*?<\/header>/)[0];
const footerPartial = read('_partials/footer.html').match(/<footer[\s\S]*?<\/footer>/)[0];

// Which source sections land on which page.
const CONTENT = {
  index: ['@hero'],
  features: ['features', 'all-features'],
  gallery: ['screens', 'launch'],
  modes: ['modes'],
  agents: ['agents'],
  commands: ['commands'],
  install: ['install'],
  faq: ['faq'],
};

// anchor id -> page key that now hosts it.
const ANCHOR_PAGE = {
  features: 'features',
  'all-features': 'features',
  screens: 'gallery',
  launch: 'gallery',
  modes: 'modes',
  agents: 'agents',
  commands: 'commands',
  install: 'install',
  faq: 'faq',
};

function sliceSection(id) {
  const re =
    id === '@hero'
      ? /\r?\n[ \t]*<section class="hero">[\s\S]*?<\/section>/
      : new RegExp(`\\r?\\n[ \\t]*<section\\b[^>]*id="${id}"[^>]*>[\\s\\S]*?<\\/section>`);
  const m = mainInner.match(re);
  if (!m) throw new Error(`section not found: ${id}`);
  return m[0];
}

function rewriteAnchors(html, selfKey) {
  return html.replace(/href="#([\w-]+)"/g, (full, id) => {
    if (id === 'main' || id === 'top') return full;
    const target = ANCHOR_PAGE[id];
    if (!target) return full;
    if (target === selfKey) return `href="#${id}"`;
    return `href="/${target}.html#${id}"`;
  });
}

function buildHead(page) {
  let h = headInner;
  h = h.replace(/<title>[\s\S]*?<\/title>/, `<title>${page.title}</title>`);
  h = h.replace(/(<meta name="description" content=")[^"]*(")/, `$1${page.description}$2`);
  h = h.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${page.canonical}$2`);
  h = h.replace(/(<meta (?:property|name)="og:url" content=")[^"]*(")/, `$1${page.canonical}$2`);
  h = h.replace(/(<meta (?:property|name)="og:title" content=")[^"]*(")/, `$1${page.title}$2`);
  h = h.replace(/(<meta (?:property|name)="og:description" content=")[^"]*(")/, `$1${page.description}$2`);
  h = h.replace(/(<meta (?:property|name)="twitter:title" content=")[^"]*(")/, `$1${page.title}$2`);
  h = h.replace(/(<meta (?:property|name)="twitter:description" content=")[^"]*(")/, `$1${page.description}$2`);
  // JSON-LD: SoftwareApplication stays on index, FAQPage moves to faq.
  h = h.replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/g, (block) => {
    if (/"@type"\s*:\s*"SoftwareApplication"/.test(block)) {
      return page.key === 'index' ? `${NL}  ${block.trim()}` : '';
    }
    if (/"@type"\s*:\s*"FAQPage"/.test(block)) {
      return page.key === 'faq' ? `${NL}  ${block.trim()}` : '';
    }
    return block;
  });
  return h.replace(/^\s+|\s+$/g, '');
}

function chromeHeader(page) {
  if (!page.nav) return headerPartial;
  const re = new RegExp(`(<a href="[^"]+" data-nav="${page.nav}")(>)`);
  if (!re.test(headerPartial)) throw new Error(`nav item not found for ${page.key} (${page.nav})`);
  return headerPartial.replace(re, '$1 aria-current="page"$2');
}

for (const page of PAGES) {
  const keys = CONTENT[page.key];
  if (!keys) continue;

  const mainSlices = keys
    .map((k) => rewriteAnchors(sliceSection(k), page.key))
    .join('')
    .replace(/^\r?\n/, '');

  const html = [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    buildHead(page),
    '</head>',
    '<body>',
    `  ${skipLink}`,
    '',
    '  <!-- ═══════════════ NAV ═══════════════ -->',
    `  ${chromeHeader(page)}`,
    '',
    '  <main id="main">',
    mainSlices,
    '  </main>',
    '',
    '  <!-- ═══════════════ FOOTER ═══════════════ -->',
    `  ${footerPartial}`,
    '',
    '  <div id="a11y-status" class="sr-only" role="status" aria-live="polite"></div>',
    '',
    '  <script src="/assets/js/main.js?v=0.7.0"></script>',
    '</body>',
    '</html>',
    '',
  ].join(NL);

  writeFileSync(join(root, page.file), html, 'utf8');
  console.log(`wrote ${page.file}`);
}
