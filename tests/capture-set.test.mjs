// Guards the capture routing (assets/img/screenshots/capture-set.json).
//
// The capture-set decides which shots the Playwright/code-server harness can
// produce and which are hand-captured. It must not drift from the manifest, or
// the harness will silently skip (or mislabel) shots. Four things are locked:
//   1. capture-set ↔ manifest : the id sets are equal, no dupes.
//   2. the split             : exactly 8 browser + 4 manual, with the manual set
//                              pinned so a regression cannot move a shot silently.
//   3. field completeness    : every browser shot has a scene/open/settle and a
//                              unique scene key; every manual shot has a reason.
//   4. the runner works      : `capture.mjs --plan` runs offline (no Playwright)
//                              and reports the expected counts.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { ROOT, loadManifest } from '../scripts/screenshots.mjs';

const CAPTURE_SET = join(ROOT, 'assets/img/screenshots/capture-set.json');
const MODES = ['browser', 'manual'];
// Pinned on purpose: moving a shot between modes is a deliberate act.
const EXPECTED_MANUAL = ['backlog-tree', 'command-palette', 'worktree-run-card', 'memory-panel'];

function loadCaptureSet() {
  return JSON.parse(readFileSync(CAPTURE_SET, 'utf8'));
}

test('capture-set parses and declares a known route', () => {
  const set = loadCaptureSet();
  assert.equal(set.version, 1);
  assert.equal(set.route, 'playwright-code-server');
  assert.ok(Array.isArray(set.shots) && set.shots.length > 0);
});

test('capture-set id set equals the manifest id set', () => {
  const set = loadCaptureSet();
  const manifest = loadManifest();
  const setIds = set.shots.map((s) => s.id).sort();
  const manIds = manifest.shots.map((s) => s.id).sort();
  assert.deepEqual(setIds, manIds, 'capture-set ids must mirror manifest ids');
});

test('capture-set has no duplicate ids', () => {
  const ids = loadCaptureSet().shots.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('every shot has a valid mode', () => {
  for (const s of loadCaptureSet().shots) {
    assert.ok(MODES.includes(s.mode), `${s.id}: mode "${s.mode}" not one of ${MODES.join(', ')}`);
  }
});

test('split is exactly 8 browser + 4 manual', () => {
  const shots = loadCaptureSet().shots;
  const browser = shots.filter((s) => s.mode === 'browser');
  const manual = shots.filter((s) => s.mode === 'manual');
  assert.equal(browser.length, 8, 'expected 8 automated shots');
  assert.equal(manual.length, 4, 'expected 4 hand-captured shots');
});

test('the hand-captured set is pinned', () => {
  const manual = loadCaptureSet()
    .shots.filter((s) => s.mode === 'manual')
    .map((s) => s.id)
    .sort();
  assert.deepEqual(manual, [...EXPECTED_MANUAL].sort());
});

test('every browser shot is fully specified', () => {
  for (const s of loadCaptureSet().shots.filter((x) => x.mode === 'browser')) {
    for (const field of ['surface', 'scene', 'open', 'settle']) {
      assert.ok(typeof s[field] === 'string' && s[field].trim(), `${s.id}: missing ${field}`);
    }
    assert.match(s.scene, /^[a-zA-Z][a-zA-Z0-9]*$/, `${s.id}: scene must be a camelCase key`);
  }
});

test('browser scene keys are unique', () => {
  const scenes = loadCaptureSet().shots.filter((s) => s.mode === 'browser').map((s) => s.scene);
  assert.equal(new Set(scenes).size, scenes.length, 'two shots share a scene key');
});

test('every manual shot explains itself', () => {
  for (const s of loadCaptureSet().shots.filter((x) => x.mode === 'manual')) {
    assert.ok(s.surface?.trim(), `${s.id}: missing surface`);
    assert.ok(s.reason?.trim(), `${s.id}: missing reason`);
    assert.ok(s.how?.trim(), `${s.id}: missing how`);
  }
});

test('viewport matches the manifest capture spec', () => {
  const set = loadCaptureSet();
  const capture = loadManifest().capture;
  assert.equal(set.viewport.width, capture.width);
  assert.equal(set.viewport.height, capture.height);
  assert.equal(set.viewport.deviceScaleFactor, capture.devicePixelRatio);
});

test('runner and compose files exist', () => {
  const set = loadCaptureSet();
  assert.ok(existsSync(join(ROOT, set.runner)), `${set.runner} missing`);
  assert.ok(existsSync(join(ROOT, set.compose)), `${set.compose} missing`);
});

test('every scene key has an implementation in capture.mjs', () => {
  const src = readFileSync(join(ROOT, 'tools/capture/capture.mjs'), 'utf8');
  for (const s of loadCaptureSet().shots.filter((x) => x.mode === 'browser')) {
    assert.ok(new RegExp(`\\b${s.scene}\\s*\\(`).test(src), `${s.id}: no scene "${s.scene}" in capture.mjs`);
  }
});

test('--plan runs offline and reports the expected split', () => {
  const out = execFileSync(process.execPath, [join(ROOT, 'tools/capture/capture.mjs'), '--plan'], {
    encoding: 'utf8',
    cwd: ROOT,
  });
  assert.match(out, /8 browser shots/);
  assert.match(out, /4 native shots/);
  for (const id of EXPECTED_MANUAL) assert.ok(out.includes(id), `plan omits ${id}`);
});
