// tests/highlights.test.mjs
//
// Guards the three features that must carry prominent emphasis on the site:
//   1. the New Project Wizard,
//   2. moving chat into the Editor Area,
//   3. delegation to coding agents.
//
// They are promoted on the landing page (#highlights) and echoed in the
// Features page's bento grid. This suite fails if that emphasis regresses.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const index = read('index.html');
const features = read('features.html');
const css = read('assets/css/style.css');

test('index.html exposes a dedicated #highlights section', () => {
  assert.match(index, /id="highlights"/, 'index should expose a #highlights section');
});

test('index highlights all three emphasized features', () => {
  const wanted = [
    ['New Project Wizard', /New Project Wizard/],
    ['chat in the Editor Area', /Editor Area/],
    ['delegation to agents', /Delegate to Agents/],
  ];
  for (const [name, re] of wanted) {
    assert.match(index, re, `index should emphasize ${name}`);
  }
});

test('index highlight CTAs point at the right deep-dive pages', () => {
  assert.match(index, /href="\/install\.html"/, 'wizard CTA -> install');
  assert.match(index, /href="\/agents\.html"/, 'delegation CTA -> agents');
  assert.match(index, /href="\/features\.html#all-features"/, 'editor-chat CTA -> features');
});

test('features.html echoes the three features as highlight cards', () => {
  const cards = features.match(/class="[^"]*hl-card[^"]*"/g) || [];
  assert.ok(cards.length >= 3, `expected >= 3 highlight cards on features.html, found ${cards.length}`);
  assert.match(features, /New Project Wizard/);
  assert.match(features, /Editor Area/);
  assert.match(features, /Delegate to Coding Agents/);
});

test('highlight styles are defined in style.css', () => {
  assert.match(css, /\.hl-card\b/, 'style.css should define .hl-card');
  assert.match(css, /\.hl-list\b/, 'style.css should define .hl-list');
});

test('index.html still has exactly one <h1> (the hero)', () => {
  const h1 = index.match(/<h1\b/g) || [];
  assert.equal(h1.length, 1, 'exactly one h1 required');
});
