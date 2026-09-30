// Gallery guard: the full-screen screenshot viewer.
//
// Clicking a screenshot on the gallery (or focusing it and pressing Enter/Space)
// must open it full-screen, without bubbling to the page handlers. This suite
// pins the three moving parts — the overlay markup, the CSS, and the controller
// wiring in main.js — plus the invariant that the overlay is NOT itself a
// screenshot figure (so scanShotFigures never picks it up), and that main.js
// stays a no-op on pages that don't ship the overlay (the deck wires its own).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const gallery = read('gallery.html');
const css = read('assets/css/style.css');
const js = read('assets/js/main.js');

test('gallery.html ships a hidden full-screen screenshot viewer', () => {
  const open = gallery.match(/<div class="shot-lb" id="shot-lb"[^>]*>/);
  assert.ok(open, 'expected a #shot-lb overlay in gallery.html');
  assert.match(open[0], /role="dialog"/);
  assert.match(open[0], /aria-modal="true"/);
  assert.match(open[0], /aria-label="Screenshot viewer"/);
  assert.match(open[0], /\bhidden\b/, 'the overlay must start hidden');
  assert.match(gallery, /id="shot-lb-close"/, 'expected a close control');
  assert.match(gallery, /id="shot-lb-img"/, 'expected the full-screen image element');
  assert.match(gallery, /id="shot-lb-cap"/, 'expected a caption element');
});

test('the gallery viewer is not scanned as a screenshot figure', () => {
  const start = gallery.indexOf('<div class="shot-lb" id="shot-lb"');
  const end = gallery.indexOf('<script src="/assets/js/main.js');
  assert.ok(start > -1 && end > start, 'could not locate the overlay block');
  const overlay = gallery.slice(start, end);
  assert.doesNotMatch(overlay, /data-shot=/, 'the overlay must not declare data-shot');
  assert.doesNotMatch(overlay, /<figure\b/, 'the overlay must not be a screenshot figure');
});

test('style.css styles the overlay and the zoom affordance', () => {
  assert.match(css, /\.shot-lb \{/, 'expected .shot-lb styles');
  assert.match(css, /\.shot-lb\[hidden\] \{ display: none; \}/, 'hidden overlay must not render');
  assert.match(css, /\.shot-lb__img \{/, 'expected the image rule');
  assert.match(css, /\.shot--zoom img \{ cursor: zoom-in; \}/, 'expected a zoom cursor on zoomable shots');
});

test('main.js opens, closes and only wires real screenshots', () => {
  assert.match(js, /function openShot\(/, 'expected openShot()');
  assert.match(js, /function closeShot\(/, 'expected closeShot()');
  assert.match(js, /classList\.add\('shot--zoom'\)/, 'zoomable shots must be flagged');
  assert.match(js, /fig\.setAttribute\('aria-label'/, 'zoomable shots need an accessible name');
  assert.match(js, /'View screenshot full screen'/, 'expected the zoom aria-label copy');

  // Esc closes the viewer; a click on a screenshot must not bubble to the page.
  assert.match(js, /if \(shotLbOpen && e\.key === 'Escape'\)/);
  assert.match(js, /e\.stopPropagation\(\)/);

  // No-op on pages without the overlay (the deck wires its own viewer).
  assert.match(js, /\$\('#shot-lb'\)/, 'the overlay must be looked up');
  assert.match(js, /if \(shotLb && \$\('figure\.shot'\)\)/, 'must bail when there is nothing to wire');
});

test('gallery ships captured .shot figures that become zoomable', () => {
  const captured = [...gallery.matchAll(/<figure class="shot[^"]*" data-shot="([^"]+)" data-state="captured">/g)];
  assert.ok(captured.length >= 1, 'expected at least one captured screenshot to zoom');
});
