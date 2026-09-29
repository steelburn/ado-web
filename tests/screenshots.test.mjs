// Guards the screenshot library (assets/img/screenshots).
//
// The manifest is the single source of truth and the HTML references shots by
// id, so three things must never drift:
//   1. manifest ↔ files  : every shot has a PNG of the declared size, and the
//                          placeholder marker matches the declared status.
//   2. manifest ↔ markup : every `data-shot` in index.html / deck.html exists
//                          in the manifest, with full img attributes, and every
//                          shot listed for a page is actually used on it.
//   3. placeholders are never displayed: CSS must hide `data-state="placeholder"`
//                          images (stand-ins are review-only).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  ROOT,
  SHOTS_DIR,
  PAGES,
  GUIDE_PATH,
  MARKER_KEYWORD,
  MARKER_VALUE,
  loadManifest,
  validateManifest,
  scanShotFigures,
  placeholderPng,
  placeholderId,
  readPngInfo,
  encodePng,
  measureText,
  sanitizeLabel,
  hasGlyph,
} from '../scripts/screenshots.mjs';
import { SITE_VERSION } from '../scripts/site-version.mjs';

const manifest = loadManifest();
const shotPath = (shot) => join(ROOT, SHOTS_DIR, shot.file);
const pageHtml = (key) => readFileSync(join(ROOT, PAGES[key]), 'utf8');

test('screenshot manifest is structurally valid', () => {
  assert.deepEqual(validateManifest(manifest), []);
  assert.ok(manifest.shots.length >= 8, 'expected a real library of shots, got ' + manifest.shots.length);
});

test('every shot has a PNG whose dimensions match the manifest', () => {
  for (const shot of manifest.shots) {
    const file = shotPath(shot);
    assert.ok(existsSync(file), SHOTS_DIR + '/' + shot.file + ' is missing — run: node scripts/make-screenshots.mjs');
    const info = readPngInfo(readFileSync(file));
    assert.ok(info.valid, shot.file + ' is not a readable PNG (' + info.reason + ')');
    assert.equal(info.width, shot.width, shot.file + ' width');
    assert.equal(info.height, shot.height, shot.file + ' height');
  }
});

test('placeholder marker matches the declared status', () => {
  for (const shot of manifest.shots) {
    const buffer = readFileSync(shotPath(shot));
    const marked = placeholderId(buffer);
    if (shot.status === 'captured') {
      assert.equal(
        marked,
        null,
        shot.id + ': status is "captured" but the file still carries the placeholder marker'
      );
      assert.ok(!buffer.includes(Buffer.from(MARKER_VALUE, 'latin1')), shot.id + ': real capture contains a placeholder marker');
    } else {
      assert.equal(marked, shot.id, shot.id + ': expected a generated placeholder carrying its own id');
    }
  }
});

test('every page reference resolves to a manifest shot with accessible markup', () => {
  for (const [key, file] of Object.entries(PAGES)) {
    const figures = scanShotFigures(pageHtml(key));
    for (const figure of figures) {
      const where = file + ' → data-shot="' + figure.id + '"';
      const shot = manifest.shots.find((s) => s.id === figure.id);
      assert.ok(shot, where + ' is not declared in ' + SHOTS_DIR + '/manifest.json');
      const src = figure.src || '';
      assert.equal(
        src.split('?')[0],
        '/assets/img/screenshots/' + shot.file,
        where + ': src must be ' + '/assets/img/screenshots/' + shot.file
      );
      assert.match(src, new RegExp('\\?v=' + SITE_VERSION.replace(/\./g, '\\.') + '$'), where + ': src must carry the SITE_VERSION cache-buster');
      assert.ok(figure.state === 'placeholder' || figure.state === 'captured', where + ': data-state must be placeholder|captured');
      assert.equal(figure.state, shot.status, where + ': data-state must mirror the manifest status');
      assert.equal(figure.width, String(shot.width), where + ': img width must reserve the intrinsic width');
      assert.equal(figure.height, String(shot.height), where + ': img height must reserve the intrinsic height');
      assert.ok(figure.hasImg, where + ': figure needs an <img>');
      assert.ok(figure.alt && figure.alt.trim().length >= 15, where + ': img needs descriptive alt text');
      assert.equal(figure.alt, shot.alt, where + ': alt must match the manifest alt (single source of copy)');
      assert.ok(figure.caption && figure.caption.length >= 10, where + ': figure needs a visible caption');
      assert.equal(figure.caption, shot.caption, where + ': caption must match the manifest caption (single source of copy)');
      assert.ok(figure.caption.length <= 220, where + ': caption is too long for a grid cell');
    }
  }
});

test('every shot is used exactly by the pages listed in usedOn', () => {
  for (const [key, file] of Object.entries(PAGES)) {
    const used = new Set(scanShotFigures(pageHtml(key)).map((figure) => figure.id));
    for (const shot of manifest.shots) {
      const expected = shot.usedOn.includes(key);
      assert.equal(
        used.has(shot.id),
        expected,
        shot.id + ': usedOn says ' + (expected ? '' : 'no ') + file + ' usage — fix the markup or usedOn'
      );
    }
  }
});

test('each page wires a meaningful number of shots', () => {
  const gallery = scanShotFigures(pageHtml('gallery')).length;
  const deck = scanShotFigures(pageHtml('deck')).length;
  assert.ok(gallery >= 6, 'gallery.html should show a real gallery, found ' + gallery);
  assert.ok(deck >= 4, 'deck.html should show captures, found ' + deck);
});

test('placeholders are hidden in CSS on both pages', () => {
  const site = readFileSync(join(ROOT, 'assets/css/style.css'), 'utf8');
  const deck = readFileSync(join(ROOT, 'assets/css/deck.css'), 'utf8');
  const hides = /\[data-state="placeholder"\]\s+img\s*(?:,|\{)[^}]*display:\s*none/s;
  assert.ok(hides.test(site), 'style.css must not render placeholder shots (.shot[data-state="placeholder"] img)');
  assert.ok(hides.test(deck), 'deck.css must not render placeholder shots (.s-shot[data-state="placeholder"] img)');
  assert.ok(
    /html\[data-shots="placeholders"\]/.test(site) && /html\[data-shots="placeholders"\]/.test(deck),
    'both stylesheets need the ?shots=placeholders review override'
  );
});

test('the capture guide documents every shot id', () => {
  assert.ok(existsSync(GUIDE_PATH), SHOTS_DIR + '/README.md (capture guide) is missing');
  const guide = readFileSync(GUIDE_PATH, 'utf8');
  for (const shot of manifest.shots) {
    assert.ok(guide.includes(shot.id), 'capture guide is missing ' + shot.id);
    assert.ok(guide.includes(shot.file), 'capture guide is missing ' + shot.file);
  }
});

test('placeholder renderer is deterministic and self-describing', () => {
  const a = placeholderPng({ id: 'demo-shot', width: 640, height: 400 });
  const b = placeholderPng({ id: 'demo-shot', width: 640, height: 400 });
  assert.deepEqual(a, b, 'placeholder rendering must be byte-identical across runs');

  const info = readPngInfo(a);
  assert.equal(info.width, 640);
  assert.equal(info.height, 400);
  assert.equal(info.texts[MARKER_KEYWORD], MARKER_VALUE + ':demo-shot');
  assert.equal(placeholderId(a), 'demo-shot');
  assert.equal(placeholderId(b), 'demo-shot');
});

test('placeholder renderer handles ids and copy it cannot typeset', () => {
  assert.equal(sanitizeLabel('héro → shot'), 'H-RO - SHOT');
  assert.ok(hasGlyph('Z') && hasGlyph('-') && hasGlyph('?'));
  assert.equal(measureText('', 4), 0);
  assert.ok(measureText('ADO CODE', 4) > measureText('ADO', 4));
});

test('PNG encoder rejects nothing it should not and round-trips dimensions', () => {
  const rgb = Buffer.alloc(4 * 3 * 3, 7);
  const png = encodePng({ width: 4, height: 3, rgb, texts: { Comment: 'hello' } });
  const info = readPngInfo(png);
  assert.ok(info.valid);
  assert.equal(info.width, 4);
  assert.equal(info.height, 3);
  assert.deepEqual(info.types, ['IHDR', 'IDAT', 'tEXt', 'IEND']);
  assert.equal(info.texts.Comment, 'hello');
  assert.equal(placeholderId(png), null, 'a plain PNG must not look like a placeholder');
});

test('a corrupted or foreign file never counts as a placeholder', () => {
  assert.equal(placeholderId(Buffer.from('not a png at all')), null);
  assert.equal(readPngInfo(Buffer.alloc(0)).valid, false);
  assert.equal(readPngInfo(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0])).valid, false);
});
