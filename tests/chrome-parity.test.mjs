// Chrome-parity guard.
//
// The site uses hand-duplicated chrome (strategy A1): the shared <header> and
// <footer> are copied into every page by hand, with no build step. This test is
// the safety net — it compares each migrated page's chrome to the canonical
// copies in _partials/{header,footer}.html so the duplication can never drift.
//
// Pages migrate one at a time (PAGES[].chromeMigrated in scripts/site-pages.mjs).
// Until a page is flagged migrated we only sanity-check that it still has a nav
// and a footer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { MARKETING_PAGES, PRIMARY_NAV } from '../scripts/site-pages.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const norm = (s) => s.replace(/\r\n/g, '\n').trim();

function extractHeader(html) {
  const m = html.match(/<header class="nav"[\s\S]*?<\/header>/);
  assert.ok(m, 'page is missing its <header class="nav"> block');
  return m[0];
}

function extractFooter(html) {
  const m = html.match(/<footer class="footer"[\s\S]*?<\/footer>/);
  assert.ok(m, 'page is missing its <footer class="footer"> block');
  return m[0];
}

// The only sanctioned per-page difference is `aria-current="page"` on the active
// nav item; drop it before comparing.
const canonicalize = (block) => norm(block).replace(/ aria-current="page"/g, '');

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The partials carry a documentation comment above the real markup; compare
// the chrome markup itself, not the whole file.
const headerPartial = canonicalize(extractHeader(read('_partials/header.html')));
const footerPartial = canonicalize(extractFooter(read('_partials/footer.html')));

test('canonical header advertises every primary nav target', () => {
  for (const item of PRIMARY_NAV) {
    assert.match(
      headerPartial,
      new RegExp(`href="${escapeRe(item.url)}"`),
      `canonical header is missing a link to ${item.url}`,
    );
  }
  assert.match(headerPartial, /id="nav-links"/, 'canonical header must keep #nav-links (main.js)');
  assert.match(headerPartial, /aria-controls="nav-links"/, 'burger must advertise #nav-links');
});

test('canonical footer links to real pages', () => {
  assert.match(footerPartial, /href="\/install\.html"/, 'footer should link to the install page');
  assert.match(footerPartial, /href="\/deck\.html"/, 'footer should link to the deck');
  assert.doesNotMatch(
    footerPartial,
    /href="#(features|screens|launch|install)"/,
    'footer must not keep legacy same-page anchors',
  );
});

for (const page of MARKETING_PAGES) {
  test(`chrome parity: ${page.file}`, () => {
    const abs = join(root, page.file);
    if (!existsSync(abs)) {
      assert.ok(
        !page.chromeMigrated,
        `${page.file} is flagged chromeMigrated but the file does not exist`,
      );
      return; // not created yet — it lands in Phase 2
    }

    const html = read(page.file);

    if (!page.chromeMigrated) {
      // Pre-migration: just make sure the landmarks are present.
      assert.match(html, /<header class="nav"/, `${page.file} lost its header`);
      assert.match(html, /<footer class="footer"/, `${page.file} lost its footer`);
      return;
    }

    assert.equal(
      canonicalize(extractHeader(html)),
      headerPartial,
      `${page.file} <header> drifted from _partials/header.html`,
    );
    assert.equal(
      canonicalize(extractFooter(html)),
      footerPartial,
      `${page.file} <footer> drifted from _partials/footer.html`,
    );
  });
}

// Regression guard: the multi-page split once spliced the _partials doc comment
// into each page WITHOUT its opening `<!--`, which closed the marker comment
// early so the leftover prose (and a phantom <header>/<footer> element) rendered
// as visible page content. extractHeader/extractFooter happily found the *real*
// chrome, so the parity check above stayed green — this catches that class of
// corrupt-comment defect directly.
test('no page renders stray or duplicated chrome markup', () => {
  for (const page of MARKETING_PAGES) {
    const abs = join(root, page.file);
    if (!existsSync(abs)) continue;
    const html = read(page.file);

    const opens = (html.match(/<!--/g) || []).length;
    const closes = (html.match(/-->/g) || []).length;
    assert.equal(opens, closes, `${page.file} has unbalanced HTML comments`);

    assert.equal(
      (html.match(/<header class="nav"/g) || []).length,
      1,
      `${page.file} should have exactly one <header class="nav">`,
    );
    assert.equal(
      (html.match(/<footer class="footer"/g) || []).length,
      1,
      `${page.file} should have exactly one <footer class="footer">`,
    );

    // any other raw <header>/<footer> tag is a phantom from a mis-spliced comment
    assert.equal(
      (html.match(/<header(?![^>]*\bclass="nav")/g) || []).length,
      0,
      `${page.file} contains a stray <header> element`,
    );
    assert.equal(
      (html.match(/<footer(?![^>]*\bclass="footer")/g) || []).length,
      0,
      `${page.file} contains a stray <footer> element`,
    );
  }
});
