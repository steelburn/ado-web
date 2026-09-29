// tools/emphasis-highlights.mjs
//
// One-time, guarded, CRLF-preserving applier that gives three features
// prominent emphasis on the marketing site:
//   1. New Project Wizard
//   2. Move chat into the Editor Area
//   3. Delegation to coding agents
//
// It (a) adds a #highlights section to index.html, (b) adds three
// highlight cards to the top of features.html's bento grid, and
// (c) appends the .hl-* styles. Re-running is a no-op (guarded).
//
// Run:  node tools/emphasis-highlights.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const p = (rel) => new URL(rel, root);
const crlf = (s) => s.split('\n').join('\r\n');

function read(rel) {
  return readFileSync(p(rel), 'utf8');
}
function write(rel, text) {
  writeFileSync(p(rel), text);
}
function report(rel, before, after) {
  const delta = after.length - before.length;
  console.log(`  ${rel}: ${delta >= 0 ? '+' : ''}${delta} bytes`);
}

// ── 1. index.html — add the #highlights section before </main> ──────────────
const INDEX_BLOCK = crlf(`
    <!-- ═══════════════ HIGHLIGHTS ═══════════════ -->
    <section class="section section-alt" id="highlights" aria-labelledby="highlights-title">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow"><span class="dot"></span>Built for how you actually work</span>
          <h2 id="highlights-title">Three things ADO&nbsp;Code does <span class="accent">better than anything else</span></h2>
          <p class="section-sub">A guided start for new projects, a chat that lives in your editor, and one&nbsp;click delegation to coding agents &mdash; all wired into your Azure DevOps backlog.</p>
        </div>

        <div class="bento hl-grid">
          <article class="bento-card hl-card reveal">
            <span class="hl-badge">Start here</span>
            <h3 class="hl-title">New Project Wizard</h3>
            <p>Point ADO&nbsp;Code at an empty folder and it scaffolds the whole project &mdash; layout, <code>AGENTS.md</code> brief and <code>git&nbsp;init</code> &mdash; then links it to a fresh Azure&nbsp;DevOps repository.</p>
            <ul class="hl-list">
              <li>Pick a stack, get a working skeleton</li>
              <li>Repository + work-item wiring in one pass</li>
              <li>Re-run any time with &ldquo;Re-run setup&rdquo;</li>
            </ul>
            <a class="hl-cta" href="/install.html">Start a project <span aria-hidden="true">&rarr;</span></a>
          </article>

          <article class="bento-card hl-card reveal">
            <span class="hl-badge">New</span>
            <h3 class="hl-title">Move chat into the Editor Area</h3>
            <p>Pop the ADO&nbsp;Code chat out of the sidebar and into a full editor tab. Ask for a plan in one tab, watch the diff land in another &mdash; the conversation pinned next to the code it touches.</p>
            <ul class="hl-list">
              <li>Full-width chat beside your code</li>
              <li>Keep several conversations open at once</li>
              <li>Same session &mdash; move it in one step</li>
            </ul>
            <a class="hl-cta" href="/features.html#all-features">See it in the feature list <span aria-hidden="true">&rarr;</span></a>
          </article>

          <article class="bento-card hl-card reveal">
            <span class="hl-badge">Fan out</span>
            <h3 class="hl-title">Delegate to Agents</h3>
            <p>Hand a work item to an external coding agent and it runs in its own isolated git worktree &mdash; then commits, pushes and opens the pull request while you get on with something else.</p>
            <ul class="hl-list">
              <li>Claude&nbsp;Code, Codex, OpenCode, Hermes, Pi, dsh</li>
              <li>Every run isolated in <code>.ado-code/worktrees/</code></li>
              <li>Automatic commit &rarr; push &rarr; pull request</li>
            </ul>
            <a class="hl-cta" href="/agents.html">How delegation works <span aria-hidden="true">&rarr;</span></a>
          </article>
        </div>
      </div>
    </section>
`);

// ── 2. features.html — three highlight cards at the top of the bento grid ──
const FEATURES_BLOCK = crlf(`
          <article class="bento-card hl-card reveal">
            <span class="hl-badge">Start here</span>
            <h3>New Project Wizard</h3>
            <p>Scaffold a project from an empty folder &mdash; structure, <code>AGENTS.md</code> brief and <code>git&nbsp;init</code> &mdash; and wire it to Azure&nbsp;DevOps in one guided pass.</p>
          </article>
          <article class="bento-card hl-card reveal">
            <span class="hl-badge">New</span>
            <h3>Chat in the Editor Area</h3>
            <p>Move the conversation out of the sidebar into a full editor tab, side by side with the code it changes.</p>
          </article>
          <article class="bento-card hl-card reveal">
            <span class="hl-badge">Fan out</span>
            <h3>Delegate to Coding Agents</h3>
            <p>Send a work item to an external agent in its own git worktree; ADO&nbsp;Code commits, pushes and opens the pull request.</p>
          </article>
`);

// ── 3. style.css — .hl-* styles ─────────────────────────────────────────────
const CSS_BLOCK = crlf(`
/* ── Highlights emphasis (New Project Wizard · Editor chat · Agent delegation) ── */
.hl-grid { align-items: stretch; }
.hl-card { display: flex; flex-direction: column; gap: 10px; }
.hl-badge {
  align-self: flex-start;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.66rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink, #e6e9f0);
  background: rgba(0, 120, 212, 0.14);
  border: 1px solid rgba(0, 120, 212, 0.4);
  border-radius: 99px;
  padding: 3px 10px;
}
.hl-card h3 { font-size: 1.18rem; font-weight: 700; letter-spacing: -0.01em; margin-top: 2px; }
.hl-card p { color: var(--ink-2, #a9b3c6); font-size: 0.94rem; }
.hl-list { list-style: none; display: flex; flex-direction: column; gap: 8px; margin: 4px 0 0; padding: 0; }
.hl-list li { position: relative; padding-left: 22px; color: var(--ink-2, #a9b3c6); font-size: 0.9rem; }
.hl-list li::before {
  content: "";
  position: absolute;
  left: 0; top: 0.5em;
  width: 8px; height: 8px;
  border-radius: 2px;
  background: var(--accent, #0078d4);
  box-shadow: 0 0 0 3px rgba(0, 120, 212, 0.16);
}
.hl-cta {
  margin-top: auto;
  padding-top: 12px;
  font-weight: 600;
  font-size: 0.92rem;
  color: var(--accent, #0078d4);
  text-decoration: none;
}
.hl-cta:hover { text-decoration: underline; }
`);

// ── apply ───────────────────────────────────────────────────────────────────
let applied = 0;

{
  const rel = 'index.html';
  let src = read(rel);
  if (src.includes('id="highlights"')) {
    console.log(`  ${rel}: already applied (skip)`);
  } else {
    const anchor = '  </main>';
    const at = src.indexOf(anchor);
    if (at === -1) throw new Error(`${rel}: anchor "${anchor}" not found`);
    const before = src;
    src = src.slice(0, at) + INDEX_BLOCK.replace(/\r\n$/, '') + src.slice(at);
    write(rel, src);
    report(rel, before, src);
    applied++;
  }
}

{
  const rel = 'features.html';
  let src = read(rel);
  if (src.includes('class="bento-card hl-card')) {
    console.log(`  ${rel}: already applied (skip)`);
  } else {
    const open = src.indexOf('class="bento"');
    if (open === -1) throw new Error(`${rel}: <div class="bento"> not found`);
    const gt = src.indexOf('>', open);
    const after = gt + 1;
    const before = src;
    src = src.slice(0, after) + FEATURES_BLOCK.replace(/\r\n$/, '') + src.slice(after);
    write(rel, src);
    report(rel, before, src);
    applied++;
  }
}

{
  const rel = 'assets/css/style.css';
  let src = read(rel);
  if (/\.hl-card\b/.test(src)) {
    console.log(`  ${rel}: already applied (skip)`);
  } else {
    const before = src;
    if (!src.endsWith('\n')) src += '\r\n';
    src += CSS_BLOCK;
    write(rel, src);
    report(rel, before, src);
    applied++;
  }
}

console.log(`\nDone. ${applied} file(s) changed.`);
