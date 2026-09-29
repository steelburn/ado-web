// One-time Phase 3 (infra) migration for the multi-page split.
// CRLF-preserving. Idempotent-guarded: aborts if a target already contains
// its inserted marker or the anchor is missing.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const p = (f) => join(root, f);
const read = (f) => readFileSync(p(f), 'utf8');
const write = (f, s) => writeFileSync(p(f), s, 'utf8');
const EOL = '\r\n';

function insertBefore(file, anchorLine, block) {
  const src = read(file);
  if (src.includes(block.split(EOL)[0])) throw new Error(`${file}: already applied`);
  const idx = src.indexOf(anchorLine);
  if (idx < 0) throw new Error(`${file}: anchor not found: ${anchorLine}`);
  const out = src.slice(0, idx) + block.split('\n').join(EOL) + src.slice(idx);
  write(file, out);
  console.log('patched', file);
}

// 1) nginx.conf — extensionless 301 aliases before `location = / {`
insertBefore('nginx.conf', '    location = / {', `    # Extensionless aliases -> canonical .html routes (multi-page split).
    # NOTE: URL fragments (#modes) are NEVER sent to the server, so legacy
    # /#section deep links cannot be redirected here; index.html resolves them
    # client-side. The aliases below cover clean, extensionless URLs only.
    location = /features { return 301 /features.html; }
    location = /gallery  { return 301 /gallery.html; }
    location = /modes    { return 301 /modes.html; }
    location = /agents   { return 301 /agents.html; }
    location = /commands { return 301 /commands.html; }
    location = /install  { return 301 /install.html; }
    location = /faq      { return 301 /faq.html; }
    location = /deck     { return 301 /deck.html; }

`);

// 2) index.html — legacy /#section client-side redirect before style.css link
insertBefore('index.html', '  <link rel="stylesheet" href="/assets/css/style.css?v=0.8.0">',
`  <!-- Legacy deep-link migration: the site was split from one page into many,
       so old /#section links (#modes, #faq, ...) now point at empty anchors.
       URL fragments are never sent to the server, so this MUST be handled
       client-side. If JS is disabled the visitor simply stays on the home
       page (graceful degradation) rather than hitting a 404. -->
  <script>
    (function () {
      var map = {
        '#features': '/features.html#features',
        '#screens': '/gallery.html#screens',
        '#launch': '/gallery.html#launch',
        '#all-features': '/features.html#all-features',
        '#modes': '/modes.html#modes',
        '#agents': '/agents.html#agents',
        '#commands': '/commands.html#commands',
        '#install': '/install.html#install',
        '#faq': '/faq.html#faq'
      };
      var target = map[window.location.hash];
      if (target) { window.location.replace(target); }
    })();
  </script>
`);

// 3) sitemap.xml — one <url> per page + deck, each with <lastmod>
const LAST = '2026-09-28';
const pages = [
  ['https://ado-code.ne1.dev/', '1.0'],
  ['https://ado-code.ne1.dev/features.html', '0.9'],
  ['https://ado-code.ne1.dev/gallery.html', '0.7'],
  ['https://ado-code.ne1.dev/modes.html', '0.6'],
  ['https://ado-code.ne1.dev/agents.html', '0.6'],
  ['https://ado-code.ne1.dev/commands.html', '0.6'],
  ['https://ado-code.ne1.dev/install.html', '0.8'],
  ['https://ado-code.ne1.dev/faq.html', '0.6'],
  ['https://ado-code.ne1.dev/deck.html', '0.8'],
];
const sitemap = ['<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
  .concat(pages.flatMap(([loc, pr]) => [
    '  <url>',
    `    <loc>${loc}</loc>`,
    `    <lastmod>${LAST}</lastmod>`,
    '    <changefreq>monthly</changefreq>',
    `    <priority>${pr}</priority>`,
    '  </url>',
  ]))
  .concat(['</urlset>', '']).join(EOL);
write('sitemap.xml', sitemap);
console.log('rewrote sitemap.xml');
