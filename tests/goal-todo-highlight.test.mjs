// Guard: the Goal & To-do feature carries prominent emphasis.
//
// ADO Code pins a session Goal and tracks it as a To-do list in the activity
// bar. That story is promoted alongside the other headline features:
//   * a fourth highlight card on the landing page (#highlights),
//   * the same card at the top of the Features page bento,
//   * a fourth card on the deck's Highlights slide (s5),
//   * its own accent colour in style.css.
// This suite fails if any of that emphasis regresses (or drops the originals).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const index = read('index.html');
const features = read('features.html');
const deck = read('deck.html');
const css = read('assets/css/style.css');

const highlightCard = (html) =>
  html.match(/<article class="bento-card hl-card hl-card--goal reveal">[\s\S]*?<\/article>/);

test('the landing page promotes Goal & To-do as a fourth highlight', () => {
  assert.match(index, /<h2 id="highlights-title">Four things/, 'the highlights heading must say four');
  const card = highlightCard(index);
  assert.ok(card, 'expected a *.hl-card--goal on the landing page');
  assert.match(card[0], /<h3 class="hl-title">Goal &amp; To-do<\/h3>/);
  assert.match(card[0], /hl-badge--goal/, 'expected the goal badge variant');
  assert.match(card[0], /hl-cta/, 'expected a call to action');
});

test('the Features page echoes the Goal & To-do highlight', () => {
  const card = highlightCard(features);
  assert.ok(card, 'expected a *.hl-card--goal on the Features page');
  assert.match(card[0], /<h3>Goal &amp; To-do<\/h3>/);
});

test('the deck Highlights slide carries a fourth Goal & To-do card', () => {
  const slide = deck.match(/<section class="slide" id="s5"[\s\S]*?<\/section>/);
  assert.ok(slide, 'expected the s5 Highlights slide');
  assert.match(slide[0], /<h2 class="s-title">Four things to try first\.<\/h2>/);
  assert.match(slide[0], /s-cols--4/, 'the highlights grid must now fit four columns');
  assert.match(slide[0], /<h3><span class="s-card-n">04<\/span>Goal &amp; To-do<\/h3>/);
});

test('the other deck grids keep their original shapes', () => {
  const fourCol = [...deck.matchAll(/s-cols--4/g)];
  assert.equal(fourCol.length, 1, 'only the Highlights slide uses a four-column grid');
  assert.match(deck, /class="s-cols s-cols--gap s-cols--3"/, 'the What\'s-new slide keeps its three-column grid');
});

test('style.css gives the goal card its own accent', () => {
  assert.match(css, /\.hl-card--goal \.hl-badge--goal \{/);
  assert.match(css, /\.hl-card--goal \.hl-list li::before \{/);
  assert.match(css, /var\(--rose, #f07178\)/, 'expected the rose accent token');
});

test('the original three highlights survive', () => {
  assert.match(index, /<h3 class="hl-title">New Project Wizard<\/h3>/);
  assert.match(index, /Editor Area/);
  assert.match(index, /Delegate to Agents/);
  assert.match(features, /<h3>New Project Wizard<\/h3>/);
  assert.match(features, /<h3>Chat in the Editor Area<\/h3>/);
  assert.match(features, /<h3>Delegate to Coding Agents<\/h3>/);
});
