// Deck guard: the Highlights slide.
//
// The deck mirrors the marketing IA, so the three headline features that the
// site promotes (New Project Wizard · chat in the Editor Area · delegation to
// agents) must also appear as their own deck slide. This suite also pins the
// slide numbering contract: one `aria-label="Slide N of T"` per slide, N
// sequential from 1, T equal to the real slide count, ids unique, and the
// no-JS counter fallback in the chrome equal to T.
//
// Read-only.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const deck = readFileSync(new URL('../deck.html', import.meta.url), 'utf8');

const slideRe = /<section class="slide[^"]*" id="(s\d+)" aria-roledescription="slide" aria-label="Slide (\d+) of (\d+)">/g;
const slides = [...deck.matchAll(slideRe)];

test('deck: has a Highlights slide', () => {
  assert.match(deck, /Highlights<\//, 'expected a "Highlights" kicker in the deck');
});

test('deck: Highlights slide names all three headline features', () => {
  assert.match(deck, /New Project Wizard/, 'missing "New Project Wizard"');
  assert.match(deck, /Editor Area/, 'missing chat in the Editor Area');
  assert.match(deck, /[Dd]elegat/, 'missing agent delegation');
  assert.match(deck, /worktree/i, 'missing the isolated worktree detail');
});

test('deck: every slide has a sequential aria-label and a consistent total', () => {
  const n = slides.length;
  assert.ok(n >= 17, `expected at least 17 slides after the split, found ${n}`);
  slides.forEach((m, i) => {
    assert.equal(m[2], String(i + 1), `slide ${m[1]}: position label should be ${i + 1}`);
    assert.equal(m[3], String(n), `slide ${m[1]}: total label should be ${n}`);
  });
  const ids = slides.map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length, 'slide ids must be unique');
});

test('deck: no-JS counter fallback matches the slide count', () => {
  const n = slides.length;
  const m = deck.match(/id="counter-total">(\d+)</);
  assert.ok(m, 'expected a counter-total fallback in the deck chrome');
  assert.equal(m[1], String(n), 'counter-total fallback must equal the slide count');
});
