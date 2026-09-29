// Guards the scroll-reveal progressive enhancement: content must never be
// left invisible when JS is disabled, the script fails to boot, an error is
// thrown, or IntersectionObserver is unavailable. Page-specific checks now run
// against every marketing page (scripts/site-pages.mjs), not index.html alone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { MARKETING_PAGES } from '../scripts/site-pages.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const css = read('assets/css/style.css');
const js = read('assets/js/main.js');
const allPages = readdirSync(root).filter((f) => f.endsWith('.html'));

test('reveal hiding is opt-in behind a `js` class', () => {
  assert.match(
    css,
    /\.js\s+\.reveal\s*\{[^}]*opacity:\s*0/,
    'expected a `.js .reveal { opacity: 0 }` rule'
  );
});

test('there is no unscoped `.reveal { opacity: 0 }` rule', () => {
  const unscoped = [...css.matchAll(/(^|\})\s*\.reveal\s*\{([^}]*)\}/gm)]
    .map((m) => m[2])
    .filter((body) => /opacity:\s*0/.test(body));
  assert.equal(
    unscoped.length,
    0,
    'a bare `.reveal { opacity: 0 }` would hide content when JS is off'
  );
});

test('every page sets the `js` class before the stylesheet loads', () => {
  for (const page of MARKETING_PAGES) {
    const doc = read(page.file);
    const jsIdx = doc.indexOf("classList.add('js')");
    const cssIdx = doc.indexOf('style.css');
    assert.notEqual(jsIdx, -1, `${page.file}: expected an inline script adding the \`js\` class`);
    assert.notEqual(cssIdx, -1, `${page.file}: expected a stylesheet link`);
    assert.ok(jsIdx < cssIdx, `${page.file}: the \`js\`-class script must run before the stylesheet`);
  }
});

test('no page references the stale cache-bust version', () => {
  for (const file of allPages) {
    assert.ok(!/\?v=0\.5\.\d/.test(read(file)), `${file}: stale ?v=0.5.x query is still present`);
  }
});

test('main.js reveals everything when IntersectionObserver is unavailable', () => {
  assert.match(
    js,
    /'\s*IntersectionObserver\s*'\s+in\s+window/,
    'expected a feature check for IntersectionObserver'
  );
  assert.match(
    js,
    /else\s*\{[\s\S]*?classList\.add\('in'\)/,
    'expected an else branch that reveals all elements without IntersectionObserver'
  );
});

test('main.js has an error safety net that reveals all content', () => {
  assert.match(js, /__adoRevealAll/, 'main.js should use the __adoRevealAll safety net');
  assert.match(js, /try\s*\{/, 'reveal setup should be wrapped in try/catch');
  assert.match(js, /__adoBooted\s*=\s*true/, 'expected a boot flag for the safety net');
});

test('reveal elements are selected with the querySelectorAll alias', () => {
  const doubleDollar = '$'.repeat(2);
  assert.ok(
    js.includes(`revealEls = ${doubleDollar}(`),
    'revealEls must use the querySelectorAll alias — using querySelector yields a ' +
      'single element and silently breaks the reveal (regression guard).'
  );
});
