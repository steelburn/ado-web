// Deck-derivation guard for `docs/quiz.md`.
//
// The quiz promises every answer can be graded from the shipped site alone. The
// site has two viewer surfaces: the landing page (`index.html` / `README.md`,
// guarded by `tests/quiz-evidence.test.mjs`) and the presentation deck
// (`deck.html`). This file proves the *deck* is a usable grading surface too.
//
// `docs/quiz.md` carries a `## Deck evidence` table whose rows are snippets that
// must appear verbatim in `deck.html`; a question is "deck-gradeable" when it
// has at least one row. The doc must also name, explicitly, any question the
// deck cannot grade. If the slide copy drifts so an answer is no longer provable
// from the deck, the build fails instead of shipping an ungradeable deck.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const QUIZ = 'docs/quiz.md';
const DECK = 'deck.html';
const markdown = read(QUIZ);
const deck = read(DECK);

const ALL = Array.from({ length: 10 }, (_, i) => i + 1);

// Row shape: `| 9 | \`Code Review\` |`
const ROW = /^\|\s*(\d+)\s*\|\s*`([^`]+)`\s*\|\s*$/;

function deckSection(md) {
  const start = md.indexOf('## Deck evidence');
  assert.notEqual(start, -1, `missing "## Deck evidence" section in ${QUIZ}`);
  const body = md.slice(start + 1);
  const end = body.indexOf('\n## ');
  return end === -1 ? body : body.slice(0, end);
}

function parseRows(md) {
  const rows = [];
  for (const line of deckSection(md).split(/\r?\n/)) {
    const m = line.match(ROW);
    if (m) rows.push({ id: Number(m[1]), snippet: m[2] });
  }
  return rows;
}

// The explicit exclusion list, e.g. `**Deck cannot grade:** Q5.`
function cannotGrade(md) {
  const m = md.match(/\*\*Deck cannot grade:\*\*\s*([^\n.]*)/);
  if (!m) return null;
  return [...m[1].matchAll(/Q(\d+)/g)].map((x) => Number(x[1]));
}

const rows = parseRows(markdown);
const byId = new Map();
for (const r of rows) {
  if (!byId.has(r.id)) byId.set(r.id, []);
  byId.get(r.id).push(r.snippet);
}
const gradeable = new Set(byId.keys());

test('deck evidence table maps real questions to usable snippets', () => {
  assert.ok(rows.length >= 1, 'expected at least one deck evidence row');
  for (const r of rows) {
    assert.ok(ALL.includes(r.id), `deck evidence cites Q${r.id}, which is not a quiz question`);
    assert.ok(r.snippet.trim().length >= 2, `Q${r.id} deck snippet is too short to prove anything`);
  }
});

test('every deck snippet is present verbatim in deck.html', () => {
  assert.match(deck, /<html[\s>]/, 'deck.html does not look like an HTML page');
  for (const [id, snippets] of byId) {
    for (const s of snippets) {
      assert.ok(deck.includes(s), `Q${id}: deck.html no longer contains "${s}"`);
    }
  }
});

test('doc names exactly the questions the deck cannot grade', () => {
  const cannot = cannotGrade(markdown);
  assert.ok(cannot !== null, 'doc must state which questions the deck cannot grade');
  const expected = ALL.filter((id) => !gradeable.has(id));
  assert.deepEqual(
    [...cannot].sort((a, b) => a - b),
    expected,
    'the "Deck cannot grade" list must equal the questions that have no deck evidence',
  );
});

test('deck-gradeable and un-gradeable sets partition the quiz', () => {
  const cannot = cannotGrade(markdown) ?? [];
  for (const id of cannot) {
    assert.ok(!gradeable.has(id), `Q${id} is both deck evidence and listed as un-gradeable`);
  }
  assert.equal(
    gradeable.size + cannot.length,
    10,
    'every question must be deck-gradeable or explicitly excluded',
  );
});
