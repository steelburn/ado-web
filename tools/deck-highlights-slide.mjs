// One-time, guarded applier: insert a "Highlights" slide into deck.html and
// renumber every slide id / aria-label so numbering stays sequential, then sync
// the no-JS counter fallback. CRLF-preserving (deck.html is a CRLF file).
//
// Idempotent guard: aborts if the Highlights slide already exists.

import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'deck.html';
const text = readFileSync(FILE, 'utf8');

if (text.includes('Highlights</p>') || /·\s*Highlights\s*-->/.test(text)) {
  console.error('ABORT: a Highlights slide already present in deck.html');
  process.exit(1);
}

const slideRe = /<section class="(slide[^"]*)" id="s\d+" aria-roledescription="slide" aria-label="Slide \d+ of \d+">/g;
const before = [...text.matchAll(slideRe)].length;
if (before !== 16) {
  console.error(`ABORT: expected 16 slides before insert, found ${before}`);
  process.exit(1);
}

const s4 = text.indexOf('id="s4"');
if (s4 < 0) { console.error('ABORT: anchor slide s4 not found'); process.exit(1); }
const s4End = text.indexOf('</section>', s4);
if (s4End < 0) { console.error('ABORT: end of s4 not found'); process.exit(1); }
const insertAt = s4End + '</section>'.length;

const BLOCK = [
  '',
  '      <!-- 05 · Highlights -->',
  '      <section class="slide" id="s0" aria-roledescription="slide" aria-label="Slide 0 of 0">',
  '        <div class="s-head">',
  '          <p class="s-kicker"><span class="s-kicker-dot" aria-hidden="true"></span>Highlights</p>',
  '          <h2 class="s-title">Three things to try first.</h2>',
  '        </div>',
  '        <div class="s-cols s-cols--3">',
  '          <div class="s-card">',
  '            <h3><span class="s-card-n">01</span>New Project Wizard</h3>',
  '            <p>Scaffold a whole project from one command — folder layout, <code>AGENTS.md</code>, <code>git init</code>, and an optional Azure DevOps repo link.</p>',
  '            <ul class="s-bullets">',
  '              <li>Pick a stack, get a working tree</li>',
  '              <li>Agent-ready from the first commit</li>',
  '            </ul>',
  '          </div>',
  '          <div class="s-card">',
  '            <h3><span class="s-card-n">02</span>Chat in the Editor Area</h3>',
  '            <p>Move chat out of the sidebar into a full editor tab — keep the conversation and the code side by side.</p>',
  '            <ul class="s-bullets">',
  '              <li>Drag the panel to any editor group</li>',
  '              <li>Room for long diffs and answers</li>',
  '            </ul>',
  '          </div>',
  '          <div class="s-card">',
  '            <h3><span class="s-card-n">03</span>Delegate to Agents</h3>',
  '            <p>Hand a work item to Claude Code, Codex and other agent CLIs — each run in its own isolated git worktree.</p>',
  '            <ul class="s-bullets">',
  '              <li>Auto commit → push → pull request</li>',
  '              <li>Review the branch, keep your tree clean</li>',
  '            </ul>',
  '          </div>',
  '        </div>',
  '        <div class="slide__notes">The three headline moments: start a project with the wizard, pull chat into the editor area, and delegate real work items to coding agents in isolated git worktrees.</div>',
  '      </section>',
].join('\r\n');

// Insert after the s4 slide, then renumber every slide sequentially so the new
// slide becomes #5 and the old s5..s16 shift to s6..s17.
const total = before + 1;
let j = 0;
const inserted = text.slice(0, insertAt) + '\r\n\r\n' + BLOCK + text.slice(insertAt);
const renumbered = inserted.replace(slideRe, (_m, cls) => {
  j += 1;
  return `<section class="${cls}" id="s${j}" aria-roledescription="slide" aria-label="Slide ${j} of ${total}">`;
});
if (j !== total) { console.error(`ABORT: renumbered ${j}, expected ${total}`); process.exit(1); }

// Sync the no-JS counter fallback.
const out = renumbered.replace(/(id="counter-total">)\d+(<)/, `$1${total}$2`);
if (!new RegExp(`id="counter-total">${total}<`).test(out)) {
  console.error('ABORT: counter-total fallback not updated');
  process.exit(1);
}
if (!/\r\n/.test(out) || /\n/.test(out.replace(/\r\n/g, ''))) {
  console.error('ABORT: line endings are not pure CRLF');
  process.exit(1);
}

writeFileSync(FILE, out, 'utf8');
console.log(`OK: deck.html now has ${total} slides (Highlights inserted as slide 5)`);
