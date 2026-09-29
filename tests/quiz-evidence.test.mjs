// Derivation guard for `docs/quiz.md`.
//
// The quiz claims every answer can be graded from the shipped site alone. That
// is a testable promise, not prose: `docs/quiz.md` carries an `## Evidence`
// table mapping each question to a verbatim snippet of `index.html` /
// `README.md`, and this file greps the real source for it. If marketing copy
// changes such that an answer is no longer derivable — the quote disappears, or
// a distractor sneaks into the site — the build fails instead of shipping a
// quiz whose key contradicts the website.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const markdown = read('docs/quiz.md');

// --- parse the Evidence table ---------------------------------------------

/** Rows look like: `| 1 | \`index.html\` | \`some quote\` | \`distractor\` |` */
const ROW = /^\|\s*(\d+)\s*\|(.+)\|\s*$/;

const stripTicks = (cell) => cell.trim().replace(/^`|`$/g, '').trim();

function parseEvidence(md) {
  const start = md.indexOf('## Evidence');
  assert.notEqual(start, -1, 'docs/quiz.md must have an "## Evidence" section');
  const body = md.slice(start);
  const end = body.indexOf('\n## ', 1);
  const section = end === -1 ? body : body.slice(0, end);

  const rows = [];
  for (const line of section.split('\n')) {
    const m = line.match(ROW);
    if (!m) continue;
    if (/^-+$/.test(m[2].replace(/\|/g, '').trim())) continue; // header separator
    const cells = line.split('|').slice(2).map(stripTicks);
    rows.push({
      id: Number(m[1]),
      source: cells[0],
      mustContain: cells[1],
      mustNotContain: cells[2] ?? '—',
    });
  }
  return rows;
}

const evidence = parseEvidence(markdown);

// --- tests ----------------------------------------------------------------

test('Evidence table has one row per question, ids 1..10 in order', () => {
  assert.equal(evidence.length, 10, `expected 10 evidence rows, got ${evidence.length}`);
  assert.deepEqual(
    evidence.map((r) => r.id),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  );
});

test('every evidence row names a real source file', () => {
  const allowed = new Set(['index.html', 'features.html', 'gallery.html', 'modes.html', 'agents.html', 'commands.html', 'install.html', 'faq.html', 'deck.html', 'README.md']);
  for (const r of evidence) {
    assert.ok(allowed.has(r.source), `Q${r.id}: unexpected source "${r.source}"`);
  }
});

test('every evidence row has a substantive quote', () => {
  for (const r of evidence) {
    assert.ok(
      r.mustContain.length >= 12,
      `Q${r.id}: "must contain" snippet is too short to prove anything`,
    );
  }
});

test('each answer is derivable: the quote is present in its source file', () => {
  for (const r of evidence) {
    const body = read(r.source);
    assert.ok(
      body.includes(r.mustContain),
      `Q${r.id}: not derivable from ${r.source} — missing quote:\n  ${r.mustContain}`,
    );
  }
});

test('each distractor is absent from the site (no accidental correct answer)', () => {
  for (const r of evidence) {
    if (r.mustNotContain === '—') continue;
    const body = read(r.source);
    assert.ok(
      !body.includes(r.mustNotContain),
      `Q${r.id}: distractor "${r.mustNotContain}" now appears in ${r.source} — the key may be wrong`,
    );
  }
});

test('answer key letters are backed by an evidence row', () => {
  // Keeps the key and the evidence table from drifting apart: a row for Q_n
  // must exist for every question the key grades.
  const keyIds = [...markdown.matchAll(/^\|\s*(\d+)\s*\|/gm)]
    .map((m) => Number(m[1]))
    .filter((n) => n >= 1 && n <= 10);
  const graded = new Set(keyIds);
  for (const r of evidence) {
    assert.ok(graded.has(r.id), `Q${r.id} has evidence but no answer-key row`);
  }
});
