// Guards `docs/quiz.md`.
//
// The quiz is marketing collateral, so its structure is a contract: exactly 10
// questions, the first 8 single-answer, the last 2 multi-select, every option
// labelled and referenced by the answer key. A broken key would ship a quiz
// that cannot be graded, so we assert the shape rather than trusting the prose.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const markdown = readFileSync(join(root, 'docs', 'quiz.md'), 'utf8');

const OPTION = /^- ([A-E])\.\s+(\S.*)$/gm;
const HEADING = /^### (\d+)\.\s+(\S.*)$/gm;
const KEY_ROW = /^\|\s*(\d+)\s*\|\s*\*\*(.+?)\*\*\s*\|/gm;
const MULTI_MARKER = /\(select all that apply\)/i;

/** Split the doc into { id, title, body } question records. */
function parseQuestions(doc) {
  const heads = [...doc.matchAll(HEADING)].map((m) => ({ id: Number(m[1]), title: m[2], index: m.index }));
  return heads.map((h, i) => ({
    id: h.id,
    title: h.title,
    body: doc.slice(h.index, i + 1 < heads.length ? heads[i + 1].index : doc.length),
  }));
}

/** Answer key: id -> list of option letters. */
function parseKey(doc) {
  const key = new Map();
  for (const m of doc.matchAll(KEY_ROW)) {
    const letters = [...m[2].matchAll(/[A-E]/g)].map((l) => l[0]);
    key.set(Number(m[1]), letters);
  }
  return key;
}

const questions = parseQuestions(markdown);
const key = parseKey(markdown);
const optionLetters = (q) => [...q.body.matchAll(OPTION)].map((m) => m[1]);

test('quiz.md has exactly 10 numbered questions, in order', () => {
  assert.equal(questions.length, 10, `expected 10 questions, got ${questions.length}`);
  assert.deepEqual(
    questions.map((q) => q.id),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  );
  for (const q of questions) assert.ok(q.title.length > 0, `Q${q.id} has no prompt text`);
});

test('every question offers >= 4 lettered options (A..n, no gaps)', () => {
  for (const q of questions) {
    const letters = optionLetters(q);
    assert.ok(letters.length >= 4, `Q${q.id} has ${letters.length} options, expected >= 4`);
    assert.deepEqual(letters, [...'ABCDEFGHI'].slice(0, letters.length), `Q${q.id} options must be contiguous from A`);
  }
});

test('questions 1-8 are single-answer, 9-10 are multi-select', () => {
  for (const q of questions) {
    const multi = MULTI_MARKER.test(q.body);
    if (q.id <= 8) assert.equal(multi, false, `Q${q.id} must not be marked multi-select`);
    else assert.equal(multi, true, `Q${q.id} must be marked "(select all that apply)"`);
  }
});

test('the answer key covers all 10 questions exactly once', () => {
  assert.equal(key.size, 10, `answer key has ${key.size} rows, expected 10`);
  for (const q of questions) assert.ok(key.has(q.id), `answer key is missing Q${q.id}`);
});

test('answer key letters exist and match the single/multi contract', () => {
  for (const q of questions) {
    const letters = key.get(q.id);
    const offered = optionLetters(q);
    for (const l of letters) assert.ok(offered.includes(l), `Q${q.id} key cites option ${l}, which is not offered`);
    assert.equal(new Set(letters).size, letters.length, `Q${q.id} key repeats an option letter`);
    if (q.id <= 8) assert.equal(letters.length, 1, `Q${q.id} is single-answer but the key cites ${letters.length}`);
    else assert.ok(letters.length >= 2, `Q${q.id} is multi-select but the key cites ${letters.length}`);
  }
});

test('quiz.md states the scoring rule and cites its source', () => {
  assert.match(markdown, /Scoring/i, 'doc must explain how the quiz is scored');
  assert.match(markdown, /index\.html|README\.md/, 'doc must cite where the facts come from');
});
