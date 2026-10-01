// Guards the values `docs/architecture.md` copies out of the site.
//
// Its diagrams are hand-written mermaid, but two of the labels are not prose —
// they restate live values: the `?v=` cache-bust query on the IDX→STY/MAIN
// edges (which must track SITE_VERSION, scripts/site-version.mjs) and the
// deck's slide count. Nothing guarded those, so the diagram sat on a stale
// `?v=0.7.0` while the site shipped `?v=0.11.0`, and said "16-slide deck" after
// the deck grew to 17. Both exports embed the stale label, and
// tests/diagrams.test.mjs cannot catch it — it only checks that an SVG exists,
// is well-formed and is sized.
//
// scripts/set-site-version.mjs rewrites the doc alongside the root pages, so a
// SITE_VERSION bump keeps the first test green.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { SITE_VERSION } from '../scripts/site-version.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const diagramsDir = join(root, 'docs', 'diagrams');
const doc = readFileSync(join(root, 'docs', 'architecture.md'), 'utf8');
const assetQuery = /[?&]v=([0-9A-Za-z._-]+)/g;

test('the architecture doc labels its asset edges with SITE_VERSION', () => {
  const found = [...doc.matchAll(assetQuery)];
  assert.ok(found.length >= 1, 'expected docs/architecture.md to label the IDX→STY/MAIN edges with ?v=');
  for (const m of found) {
    assert.equal(
      m[1],
      SITE_VERSION,
      `docs/architecture.md: ?v=${m[1]} does not match SITE_VERSION ${SITE_VERSION} (cache-bust drift)`,
    );
  }
});

test('the exported architecture SVGs label asset edges with SITE_VERSION', () => {
  const svgs = readdirSync(diagramsDir).filter((f) => f.endsWith('.svg'));
  assert.ok(svgs.length >= 1, 'expected committed SVG exports in docs/diagrams/');
  for (const file of svgs) {
    const svg = readFileSync(join(diagramsDir, file), 'utf8');
    for (const m of svg.matchAll(assetQuery)) {
      assert.equal(
        m[1],
        SITE_VERSION,
        `docs/diagrams/${file}: ?v=${m[1]} is stale — run node scripts/make-diagrams.mjs`,
      );
    }
  }
});

test("the architecture doc's deck slide count matches deck.html", () => {
  const deck = readFileSync(join(root, 'deck.html'), 'utf8');
  const slides = (deck.match(/<section class="slide[ ">]/g) || []).length;
  const found = [...doc.matchAll(/(\d+)-slide deck/g)];
  assert.ok(found.length >= 1, 'expected the architecture doc to name the deck slide count');
  for (const m of found) {
    assert.equal(
      m[1],
      String(slides),
      `docs/architecture.md: diagram says "${m[1]}-slide deck" but deck.html has ${slides} slides`,
    );
  }
});
