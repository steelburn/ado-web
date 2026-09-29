// Structural link integrity for the multi-page split: every internal href/src
// must resolve to a real file, and every fragment must point at an id that
// actually exists on the target page. Complements tests/infra-routes.test.mjs
// (nginx aliases + sitemap) and tests/nav-completeness.test.mjs (primary nav).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

// Every root HTML document: content pages, the deck, and the 404 page.
const htmlFiles = readdirSync(root).filter((f) => f.endsWith('.html'));

// id index per page, for fragment validation.
const ids = new Map();
for (const file of htmlFiles) {
  ids.set(file, new Set([...read(file).matchAll(/\bid="([^"]+)"/g)].map((m) => m[1])));
}

const isExternal = (url) => /^(https?:|mailto:|tel:|data:|javascript:|\/\/)/i.test(url);

function resolveTarget(url) {
  const clean = url.split('#')[0].split('?')[0];
  if (clean === '' || clean === '/') return 'index.html';
  return clean.startsWith('/') ? clean.slice(1) : clean;
}

for (const file of htmlFiles) {
  test(`${file}: internal links resolve to real files and anchors`, () => {
    const html = read(file);
    const refs = [
      ...[...html.matchAll(/\bhref="([^"]+)"/g)].map((m) => m[1]),
      ...[...html.matchAll(/\bsrc="([^"]+)"/g)].map((m) => m[1]),
    ];

    for (const raw of refs) {
      if (!raw || isExternal(raw)) continue;

      // Same-page fragment (e.g. the skip link's #main).
      if (raw.startsWith('#')) {
        const id = decodeURIComponent(raw.slice(1));
        if (!id) continue;
        assert.ok(ids.get(file).has(id), `${file}: same-page anchor "${raw}" has no matching id`);
        continue;
      }

      const target = resolveTarget(raw);
      assert.ok(existsSync(join(root, target)), `${file}: "${raw}" resolves to missing file "${target}"`);

      const hash = raw.includes('#') ? decodeURIComponent(raw.slice(raw.indexOf('#') + 1)) : '';
      if (hash && ids.has(target)) {
        assert.ok(ids.get(target).has(hash), `${file}: "${raw}" points at "${target}" which has no id "${hash}"`);
      }
    }
  });
}
