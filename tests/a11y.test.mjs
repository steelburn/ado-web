// Accessibility guards for the multi-page site: skip link, mobile-nav wiring,
// the Modes tab pattern, focus visibility, text contrast and copy feedback.
// Chrome-level checks run against every marketing page (scripts/site-pages.mjs);
// host-specific patterns (hero pills, the Modes tablist) run on their own page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { MARKETING_PAGES } from '../scripts/site-pages.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const css = read('assets/css/style.css');
const js = read('assets/js/main.js');

const pages = MARKETING_PAGES.map((p) => ({ ...p, html: read(p.file) }));
const pageHtml = (key) => pages.find((p) => p.key === key).html;

/* ── colour helpers (WCAG 2.x relative luminance) ── */
function token(name, source = css) {
  const m = source.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  return m ? m[1] : null;
}
function luminance(hex) {
  const channels = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
function contrastRatio(a, b) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/* ── chrome: every marketing page ── */
for (const page of pages) {
  test(`${page.file}: a skip link is the first thing in <body> and targets an existing id`, () => {
    assert.match(page.html, /<body>\s*<a class="skip-link" href="#([\w-]+)"/, 'expected a skip link right after <body>');
    const target = page.html.match(/<a class="skip-link" href="#([\w-]+)"/)[1];
    assert.match(page.html, new RegExp(`id="${target}"`), `skip link target #${target} must exist`);
    assert.match(css, /\.skip-link\b/, 'expected .skip-link styles');
  });

  test(`${page.file}: the mobile menu button advertises the element it controls`, () => {
    const burger = page.html.match(/<button class="nav-burger"[^>]*>/);
    assert.ok(burger, 'expected a nav-burger button');
    const controls = burger[0].match(/aria-controls="([\w-]+)"/);
    assert.ok(controls, 'expected aria-controls on the nav-burger');
    assert.match(page.html, new RegExp(`id="${controls[1]}"`), `nav-burger controls #${controls[1]} which must exist`);
  });

  test(`${page.file}: the status region is a polite live region`, () => {
    assert.match(page.html, /id="a11y-status"[^>]*aria-live="polite"/, 'expected a polite live region');
    assert.match(page.html, /role="status"/, 'expected the live region to use role="status"');
  });
}

test('main.js closes the mobile menu on Escape and restores focus', () => {
  assert.match(js, /Escape/, 'expected an Escape handler');
  assert.match(js, /burger\.focus\(\)/, 'expected focus to return to the burger');
});

test('the hero mode selector is a toggle group, not a broken tablist', () => {
  const group = pageHtml('index').match(/<div class="mode-pills"[\s\S]*?<\/div>/);
  assert.ok(group, 'expected a .mode-pills group');
  assert.match(group[0], /role="group"/, 'hero pills should be a role="group"');
  assert.ok(!/role="tab"/.test(group[0]), 'hero pills must not use role="tab" without panels');
  assert.match(group[0], /aria-pressed="true"/, 'hero pills should expose aria-pressed');
});

test('the Modes page implements a complete tab pattern', () => {
  const modes = pageHtml('modes');
  const tabs = [...modes.matchAll(/<button[^>]*role="tab"[^>]*>/g)].map((m) => m[0]);
  assert.equal(tabs.length, 4, 'expected four tabs');

  const zeroTabindex = tabs.filter((t) => /tabindex="0"/.test(t));
  assert.equal(zeroTabindex.length, 1, 'exactly one tab should be in the roving tab order');

  for (const tab of tabs) {
    const controls = tab.match(/aria-controls="([\w-]+)"/);
    const selected = tab.match(/aria-selected="(true|false)"/);
    assert.ok(controls, `tab is missing aria-controls: ${tab}`);
    assert.ok(selected, `tab is missing aria-selected: ${tab}`);
    assert.match(modes, new RegExp(`id="${controls[1]}"[^>]*role="tabpanel"`), `tabpanel #${controls[1]} must exist`);
    if (selected[1] === 'true') {
      assert.match(tab, /tabindex="0"/, 'the selected tab must be tabbable');
    } else {
      assert.match(tab, /tabindex="-1"/, 'unselected tabs must not be tabbable');
    }
  }

  for (const panel of modes.matchAll(/role="tabpanel"/g)) assert.ok(panel);
  assert.match(js, /ArrowRight|ArrowLeft/, 'expected arrow-key navigation for the tabs');
});

test('muted text colour meets WCAG AA against the page background', () => {
  const ink = token('ink-4');
  const bg = token('bg-0');
  assert.ok(ink && bg, 'expected --ink-4 and --bg-0 colour tokens');
  const ratio = contrastRatio(ink, bg);
  assert.ok(ratio >= 4.5, `--ink-4 (${ink}) vs --bg-0 (${bg}) is ${ratio.toFixed(2)}:1, below 4.5:1`);
});

test('a global focus-visible ring is defined', () => {
  assert.match(css, /:focus-visible\s*\{[^}]*outline:/, 'expected a global :focus-visible outline');
});

test('copy buttons announce success through a live region', () => {
  assert.match(pageHtml('index'), /id="a11y-status"[^>]*aria-live="polite"/, 'expected a polite live region');
  assert.match(pageHtml('index'), /role="status"/, 'expected the live region to use role="status"');
  assert.match(js, /a11y-status/, 'expected main.js to update the live region');
  const copyControls = [...pageHtml('index').matchAll(/data-copy=/g)];
  assert.ok(copyControls.length >= 1, 'expected at least one data-copy control');
});
