// Deck guard: the full-screen screenshot viewer.
//
// Clicking a screenshot on the deck (or focusing it and pressing Enter/Space)
// must open it full-screen, without the deck's own background-click advance
// firing and without the keyboard shortcuts moving the slide underneath.
// This suite pins the three moving parts — the overlay markup, the CSS, and the
// controller wiring — plus the invariant that the overlay is NOT itself a
// screenshot figure (so scanShotFigures never picks it up).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const deck = read('deck.html');
const css = read('assets/css/deck.css');
const js = read('assets/js/deck.js');

test('deck.html ships a hidden full-screen screenshot viewer', () => {
  const open = deck.match(/<div class="shot-lb" id="shot-lb"[^>]*>/);
  assert.ok(open, 'expected a #shot-lb overlay in deck.html');
  assert.match(open[0], /role="dialog"/);
  assert.match(open[0], /aria-modal="true"/);
  assert.match(open[0], /aria-label="Screenshot viewer"/);
  assert.match(open[0], /\bhidden\b/, 'the overlay must start hidden');
  assert.match(deck, /id="shot-lb-close"/, 'expected a close control');
  assert.match(deck, /id="shot-lb-img"/, 'expected the full-screen image element');
  assert.match(deck, /id="shot-lb-cap"/, 'expected a caption element');
});

test('the viewer is not scanned as a screenshot figure', () => {
  const start = deck.indexOf('<div class="shot-lb" id="shot-lb"');
  const end = deck.indexOf('<script src="/assets/js/deck.js');
  assert.ok(start > -1 && end > start, 'could not locate the overlay block');
  const overlay = deck.slice(start, end);
  assert.doesNotMatch(overlay, /data-shot=/, 'the overlay must not declare data-shot');
  assert.doesNotMatch(overlay, /<figure\b/, 'the overlay must not be a screenshot figure');
});

test('deck.css styles the overlay and the zoom affordance', () => {
  assert.match(css, /\.shot-lb \{/, 'expected .shot-lb styles');
  assert.match(css, /\.shot-lb\[hidden\] \{ display: none; \}/, 'hidden overlay must not render');
  assert.match(css, /\.shot-lb__img \{/, 'expected the image rule');
  assert.match(css, /\.s-shot--zoom img \{ cursor: zoom-in; \}/, 'expected a zoom cursor on zoomable shots');
  // the print / export view must not print the overlay chrome
  assert.match(css, /\.deck-overview, \.shot-lb, \.s-hint \{ display: none !important; \}/);
});

test('deck.js opens, closes and does not hijack the deck', () => {
  assert.match(js, /function openShot\(/, 'expected openShot()');
  assert.match(js, /function closeShot\(/, 'expected closeShot()');
  assert.match(js, /classList\.add\('s-shot--zoom'\)/, 'zoomable shots must be flagged');
  assert.match(js, /fig\.setAttribute\('aria-label'/, 'zoomable shots need an accessible name');
  assert.match(js, /'View screenshot full screen'/, 'expected the zoom aria-label copy');

  // Esc closes the viewer before it reaches the notes/overview handling.
  assert.match(js, /if \(shotLbOpen\) \{[\s\S]*?'Escape'[\s\S]*?closeShot\(\)/);

  // A click on a screenshot must not fall through to the stage click that
  // advances the slide, and background/keyboard nav must pause while open.
  assert.match(js, /e\.target\.closest\('\.s-shot, a, button/, 'stage click must ignore screenshots');
  assert.match(js, /if \(overviewOpen \|\| shotLbOpen\) return;/, 'stage click must pause while open');
});

test('captured screenshots remain valid .s-shot figures', () => {
  const captured = [...deck.matchAll(/<figure class="s-shot" data-shot="([^"]+)" data-state="captured">/g)];
  assert.ok(captured.length >= 1, 'expected at least one captured screenshot to zoom');
});
