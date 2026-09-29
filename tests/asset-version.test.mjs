// Guards against cache-bust drift: every `?v=` query in every root HTML page
// must be identical and must match the single-source SITE_VERSION. Before the
// multi-page split this inspected index.html only; it now covers the whole
// page set (see scripts/site-pages.mjs for the IA single source of truth).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { SITE_VERSION } from '../scripts/site-version.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pages = readdirSync(root).filter((f) => f.endsWith('.html'));

test('every page contains at least one asset version query', () => {
  for (const file of pages) {
    const html = readFileSync(join(root, file), 'utf8');
    const versions = [...html.matchAll(/[?&]v=([0-9.]+)/g)];
    assert.ok(versions.length >= 1, `expected at least one ?v= query in ${file}`);
  }
});

test('every asset version query matches SITE_VERSION', () => {
  for (const file of pages) {
    const html = readFileSync(join(root, file), 'utf8');
    for (const m of html.matchAll(/[?&]v=([0-9.]+)/g)) {
      assert.equal(
        m[1],
        SITE_VERSION,
        `${file}: ?v=${m[1]} does not match SITE_VERSION ${SITE_VERSION} (cache-bust drift)`,
      );
    }
  }
});
