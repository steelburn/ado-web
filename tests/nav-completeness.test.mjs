// Primary-navigation completeness for the multi-page split: every marketing
// page must advertise every primary-nav item from the shared header, every nav
// target must be a real file, the active item must be marked with
// aria-current="page" (and only that item), and every non-home page must be
// reachable from the nav. Driven by scripts/site-pages.mjs (the IA SSOT).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PRIMARY_NAV, MARKETING_PAGES } from '../scripts/site-pages.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const navBlock = (html) => {
  const m = html.match(/<nav class="nav-links"[^>]*>([\s\S]*?)<\/nav>/);
  return m ? m[1] : '';
};
const fileForUrl = (url) => (url === '/' ? 'index.html' : url.replace(/^\//, ''));

test('every primary-nav target resolves to a real file', () => {
  for (const item of PRIMARY_NAV) {
    assert.ok(existsSync(join(root, fileForUrl(item.url))), `nav target missing: ${item.url}`);
  }
});

for (const page of MARKETING_PAGES) {
  test(`${page.file}: header advertises every primary-nav item`, () => {
    const block = navBlock(read(page.file));
    assert.ok(block, `${page.file}: no primary nav block found`);
    for (const item of PRIMARY_NAV) {
      assert.ok(block.includes(`href="${item.url}"`), `${page.file}: nav is missing ${item.label} (${item.url})`);
    }
  });

  test(`${page.file}: aria-current marks exactly the active nav item`, () => {
    const block = navBlock(read(page.file));
    const count = [...block.matchAll(/aria-current="page"/g)].length;
    const expected = page.nav ? 1 : 0;
    assert.equal(count, expected, `${page.file}: expected ${expected} aria-current="page", found ${count}`);
    if (page.nav) {
      const item = PRIMARY_NAV.find((n) => n.key === page.nav);
      const anchor = [...block.matchAll(/<a\b[^>]*>/g)].map((m) => m[0]).find((t) => t.includes('aria-current="page"'));
      assert.ok(anchor, `${page.file}: no nav anchor carries aria-current="page"`);
      assert.ok(anchor.includes(`href="${item.url}"`), `${page.file}: aria-current is not on the ${item.label} link`);
    }
  });
}

test('every non-home marketing page is reachable from the primary nav', () => {
  const urls = new Set(PRIMARY_NAV.map((n) => n.url));
  for (const page of MARKETING_PAGES) {
    if (page.key === 'index') continue;
    assert.ok(urls.has(page.url), `${page.file} (${page.url}) is not linked from the primary nav`);
  }
});
