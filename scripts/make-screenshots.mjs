#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════
   Screenshot library generator / status reporter

     node scripts/make-screenshots.mjs           # write missing placeholders
     node scripts/make-screenshots.mjs --check   # report drift only (exit 1)
     node scripts/make-screenshots.mjs --force   # rewrite every placeholder
     node scripts/make-screenshots.mjs --list    # print the capture backlog

   Placeholders keep every `data-shot` reference in index.html / deck.html
   resolvable before the real captures exist. They are generated from the
   manifest (deterministic, stdlib-only) and are never displayed on the live
   site: CSS renders the caption card while `data-state="placeholder"`.

   Drift rules (also enforced by tests/screenshots.test.mjs):
     status "placeholder" → the PNG on disk must be a generated placeholder
     status "captured"    → the PNG on disk must be a real capture
*/
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  ROOT,
  SHOTS_DIR,
  loadManifest,
  validateManifest,
  placeholderPng,
  readPngInfo,
  placeholderId,
} from './screenshots.mjs';

const args = new Set(process.argv.slice(2));
const checkOnly = args.has('--check');
const force = args.has('--force');
const listOnly = args.has('--list');

const manifest = loadManifest();
const problems = validateManifest(manifest);
if (problems.length) {
  console.error('scripts/make-screenshots.mjs: manifest is invalid');
  for (const problem of problems) console.error('  - ' + problem);
  process.exit(1);
}

if (listOnly || checkOnly) {
  printTable();
  if (checkOnly) {
    const drift = report();
    if (drift) {
      console.error('\n' + drift + ' shot(s) out of sync with the manifest.');
      console.error('Fix: capture the PNG, set status to "captured" and data-state="captured".');
      process.exit(1);
    }
    console.log('\nAll ' + manifest.shots.length + ' shots match the manifest.');
  }
  process.exit(0);
}

mkdirSync(join(ROOT, SHOTS_DIR), { recursive: true });

let written = 0;
let kept = 0;
let drift = 0;

for (const shot of manifest.shots) {
  const file = join(ROOT, SHOTS_DIR, shot.file);
  const disk = diskState(file);

  if (shot.status === 'captured') {
    if (disk !== 'real') {
      console.error(
        '✗ ' + shot.id + ': marked captured but no real screenshot at ' + SHOTS_DIR + '/' + shot.file
      );
      drift++;
    }
    continue;
  }

  if (disk === 'real' && !force) {
    console.error(
      '✗ ' + shot.id + ': real capture found but manifest status is "placeholder" — set it to "captured"'
    );
    drift++;
    continue;
  }

  if (disk === 'placeholder' && !force) {
    kept++;
    continue;
  }

  writeFileSync(file, placeholderPng({ id: shot.id, width: shot.width, height: shot.height }));
  written++;
  console.log('• wrote ' + SHOTS_DIR + '/' + shot.file + ' (' + shot.width + '×' + shot.height + ')');
}

printTable();

const pending = manifest.shots.filter((shot) => shot.status === 'placeholder');
if (pending.length) {
  console.log('\nCapture backlog (' + pending.length + ' of ' + manifest.shots.length + ' shots):');
  for (const shot of pending) {
    console.log('  - ' + shot.id + ' — ' + shot.title);
  }
  console.log('\nSee ' + SHOTS_DIR + '/README.md for the capture recipe of each shot.');
}

console.log('\n' + written + ' placeholder(s) written, ' + kept + ' kept.');
if (drift) {
  console.error(drift + ' shot(s) out of sync with the manifest — resolve before committing.');
  process.exit(1);
}

/* ── helpers ─────────────────────────────────────────────── */

function diskState(file) {
  if (!existsSync(file)) return 'missing';
  const buffer = readFileSync(file);
  const info = readPngInfo(buffer);
  if (!info.valid) return 'invalid';
  if (placeholderId(buffer)) return 'placeholder';
  return 'real';
}

function report() {
  let drift = 0;
  for (const shot of manifest.shots) {
    const disk = diskState(join(ROOT, SHOTS_DIR, shot.file));
    const expected = shot.status === 'captured' ? 'real' : 'placeholder';
    if (disk !== expected) drift++;
  }
  return drift;
}

function printTable() {
  const rows = manifest.shots.map((shot) => {
    const file = join(ROOT, SHOTS_DIR, shot.file);
    const disk = diskState(file);
    const expected = shot.status === 'captured' ? 'real' : 'placeholder';
    return {
      id: shot.id,
      status: shot.status,
      disk,
      ok: disk === expected ? '  ' : '≠ ',
      pages: shot.usedOn.join('+'),
      size: shot.width + '×' + shot.height,
    };
  });

  const w = (key) => Math.max(...rows.map((r) => String(r[key]).length), key.length);
  const widths = { ok: 1, id: w('id'), status: w('status'), disk: w('disk'), pages: w('pages'), size: w('size') };
  console.log('shots in ' + SHOTS_DIR + '/');
  console.log(
    '  ' +
      'id'.padEnd(widths.id) +
      '  ' +
      'status'.padEnd(widths.status) +
      '  ' +
      'on disk'.padEnd(widths.disk) +
      '  ' +
      'pages'.padEnd(widths.pages) +
      '  ' +
      'size'
  );
  for (const row of rows) {
    console.log(
      row.ok +
        row.id.padEnd(widths.id) +
        '  ' +
        row.status.padEnd(widths.status) +
        '  ' +
        row.disk.padEnd(widths.disk) +
        '  ' +
        row.pages.padEnd(widths.pages) +
        '  ' +
        row.size
    );
  }
}
