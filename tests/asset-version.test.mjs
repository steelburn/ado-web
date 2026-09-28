// Guards against cache-bust drift: every `?v=` query in index.html must be
// identical and must match the single-source SITE_VERSION.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { SITE_VERSION } from '../scripts/site-version.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');

const versions = [...html.matchAll(/\?v=([0-9A-Za-z._-]+)/g)].map((m) => m[1]);

test('index.html contains at least one asset version query', () => {
  assert.ok(versions.length >= 1, 'expected at least one ?v= query in index.html');
});

test('all asset version queries are identical (no drift)', () => {
  assert.equal(
    new Set(versions).size,
    1,
    `cache-bust drift detected across ?v= queries: ${versions.join(', ')}`
  );
});

test('asset version queries match the single source SITE_VERSION', () => {
  for (const v of new Set(versions)) {
    assert.equal(v, SITE_VERSION, `?v=${v} does not match SITE_VERSION=${SITE_VERSION}`);
  }
});
