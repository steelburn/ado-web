#!/usr/bin/env node
// Screenshot capture harness — Playwright driving code-server (Docker).
//
// Route: "playwright-code-server" (see assets/img/screenshots/capture-set.json).
// code-server renders VS Code inside a browser, so the chat/editor *webviews* are
// real DOM that Playwright can screenshot. Native workbench chrome (tree views,
// the QuickPick) is NOT faithful in the web shell — those shots are listed as
// "manual" and are skipped here.
//
//   node tools/capture/capture.mjs --plan          # offline, no deps: what would run
//   node tools/capture/capture.mjs --only agent-chat-plan,mermaid-diagram
//   node tools/capture/capture.mjs                 # capture every browser shot
//
// Playwright is imported lazily, so --plan (and the guard test) run in the
// dependency-free repo. Install it only when actually capturing:
//   cd tools/capture && npm install
//
// Selectors: code-server's shell and the extension's webview DOM are external
// contracts. The scenes below are a working skeleton — expect to tune a selector
// against the live editor the first time you run a scene (each is isolated so a
// tweak does not disturb the others).

import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const CAPTURE_SET = join(ROOT, 'assets/img/screenshots/capture-set.json');
const OUT_DIR = join(ROOT, 'assets/img/screenshots');

const MODES = ['browser', 'manual'];

function loadCaptureSet() {
  return JSON.parse(readFileSync(CAPTURE_SET, 'utf8'));
}

function parseArgs(argv) {
  const opts = {
    plan: false,
    probe: false,
    only: null,
    baseUrl: process.env.CAPTURE_BASE_URL || 'http://localhost:8080',
    password: process.env.CAPTURE_PASSWORD || '',
    folder: process.env.CAPTURE_FOLDER || '/home/coder/ado-demo',
    timeout: Number(process.env.CAPTURE_TIMEOUT || 60000),
    headed: false,
    keepOpen: false,
    channel: process.env.CAPTURE_CHANNEL || null,
    chromium: process.env.CAPTURE_CHROMIUM || null,
    out: OUT_DIR,
    llmMockUrl: process.env.CAPTURE_LLM_MOCK || 'http://localhost:9001',
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--plan') opts.plan = true;
    else if (a === '--probe') opts.probe = true;
    else if (a === '--headed') opts.headed = true;
    else if (a === '--keep-open') opts.keepOpen = true;
    else if (a === '--channel') opts.channel = argv[++i];
    else if (a === '--chromium') opts.chromium = argv[++i];
    else if (a === '--only') opts.only = (argv[++i] || '').split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--base-url') opts.baseUrl = argv[++i];
    else if (a === '--password') opts.password = argv[++i];
    else if (a === '--folder') opts.folder = argv[++i];
    else if (a === '--out') opts.out = resolve(argv[++i]);
    else if (a === '--timeout') opts.timeout = Number(argv[++i]);
    else if (a === '--llm-mock') opts.llmMockUrl = argv[++i];
    else if (a === '--help' || a === '-h') opts.help = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return opts;
}

// --- webview scenes -------------------------------------------------------
// Each scene opens its surface, waits for the shot to settle, and returns. The
// driver screenshots the webview frame afterwards. Helpers are deliberately
// small so a selector fix stays local to one scene.
// Deterministic command invocation. Scene commands fire through the keybindings
// injected into the User profile (wiring/keybindings.template.json) — NOT via
// their palette titles. Titles are ambiguous: VS Code's *built-in*
// "Chat: Focus on Chat View" fuzzy-matches a `>ADO Code: Focus Chat` query and
// steals focus, so the chat never opened. Command ids cannot collide.
const CHORDS = {
  'adoCode.chat.focus': 'Control+Alt+A',
  'adoCode.setMode': 'Control+Alt+M',
  'adoCode.selectWorkItem': 'Control+Alt+I',
  'adoCode.showWorkItemDetail': 'Control+Alt+D',
  'adoCode.openSettings': 'Control+Alt+S',
  'adoCode.agentViewDetail': 'Control+Alt+V',
};

// VS Code renders each webview as an iframe *inside a shadow root*, so a CSS
// locator like `iframe.webview` matches NOTHING (verified against the live
// container) — but `page.frames()` still enumerates it. In browser/code-server
// builds the webview's content document is the `…/webview/browser/pre/fake.html`
// frame (the service worker serves the extension's HTML for that URL). We resolve
// the frame by that URL *and* by the selector it must contain, because several
// webviews can be alive at once.
const WEBVIEW_FRAME = /\/webview\/browser\/pre\/fake\.html/;
const CHAT_READY = '.chat-layout, .input-field';

function makeHelpers(page, opts) {
  let resolved = null;
  const contentFrames = () =>
    page.frames().filter((f) => f !== page.mainFrame() && WEBVIEW_FRAME.test(f.url()));
  const frame = () => {
    if (!resolved) throw new Error('webview frame not resolved — call waitForWebview() first');
    return resolved;
  };
  return {
    frame,
    // Tell the LLM mock which canned reply to return next, so scenes render
    // deterministic content instead of depending on a live model.
    async setScenario(name) {
      if (!name) return;
      const res = await page.request.post(`${opts.llmMockUrl}/__scenario`, { data: { name } });
      if (!res.ok()) throw new Error(`setScenario(${name}) failed: HTTP ${res.status()} (is llm-mock up at ${opts.llmMockUrl}?)`);
    },
    async focusView(page, label) {
      await page.locator(`.activitybar [aria-label="${label}"]`).first().click();
    },
    // Palette fallback, kept for ad-hoc/debug use. Prefer runCommandId: see CHORDS.
    async runCommand(page, title) {
      await page.keyboard.press('Control+Shift+P');
      const box = page.locator('.quick-input-box input');
      await box.fill(`>${title}`);
      await box.press('Enter');
    },
    // Fire a command by id through its injected chord. Keybindings only resolve
    // when focus is in the workbench, so park focus off any webview iframe first.
    async runCommandId(page, id) {
      const chord = CHORDS[id];
      if (!chord) throw new Error(`no keybinding chord mapped for command id "${id}" (see wiring/keybindings.template.json)`);
      await page.keyboard.press('Escape').catch(() => {});
      await page.locator('.statusbar, .titlebar').first().click({ timeout: 5000 }).catch(() => {});
      await page.keyboard.press(chord);
    },
    // Wait until some webview content frame shows `selector`, then cache it.
    async waitForWebview(page, selector = CHAT_READY) {
      resolved = null;
      const deadline = Date.now() + opts.timeout;
      while (Date.now() < deadline) {
        for (const f of contentFrames()) {
          try {
            await f.locator(selector).first().waitFor({ state: 'visible', timeout: 500 });
            resolved = f;
            return f;
          } catch {
            /* not this frame (or not ready yet) — keep polling */
          }
        }
        await page.waitForTimeout(200);
      }
      const seen = contentFrames()
        .map((f) => `  ${f.url().slice(0, 90)}`)
        .join('\n');
      throw new Error(
        `no webview frame matched "${selector}" within ${opts.timeout}ms.\n` +
          `webview content frames seen (${contentFrames().length}):\n${seen || '  (none)'}`,
      );
    },
    async chat(page, text) {
      // The chat editor is a contenteditable; candidates are ordered
      // most-specific first. If none match we dump the frame's body so the next
      // run is debuggable instead of a bare timeout.
      const box = frame()
        .locator('.interactive-input-editor [contenteditable="true"], .chat-input [contenteditable="true"], textarea.input, .input-field, [contenteditable="true"], textarea')
        .first();
      try {
        await box.waitFor({ timeout: opts.timeout });
      } catch (err) {
        const html = await frame().locator('body').first().innerHTML().catch(() => '(frame unavailable)');
        throw new Error(`chat input not found.\nframe body (first 600 chars):\n${String(html).slice(0, 600)}`);
      }
      await box.click();
      await box.fill(text);
      await box.press('Enter');
    },
    // Focus Chat is the real command id (adoCode.chat.focus); the chat view must
    // be revealed before its iframe content is in the DOM.
    async openChat(page) {
      await this.runCommandId(page, 'adoCode.chat.focus');
      await this.waitForWebview(page);
    },
    // code-server shows a full-screen "toggle sidebar" splash when a view is hidden.
    async openSidebar(page) {
      await page.locator('.activitybar').first().click();
    },
  };
}

const SCENES = {
  async agentChatPlan({ helpers, page }) {
    await helpers.openChat(page);
    await helpers.chat(page, 'Plan the work for "Payment Platform Overhaul" epic. Do not modify files yet.');
    // Plan replies render as markdown with an `## Plan — AB#502` heading.
    await helpers.frame().locator('.markdown-body').getByText(/Plan\s*[—\u2014-]\s*AB#502/).first().waitFor();
  },
  async consentCountdown({ helpers, page }) {
    await helpers.openChat(page);
    await helpers.chat(page, 'Run the card-token migration migration job.');
    await helpers.frame().locator('.consent-card').first().waitFor();
    await helpers.frame().locator('.consent-card-timer-text').first().waitFor();
  },
  async pullRequestOpen({ helpers, page }) {
    await helpers.openChat(page);
    await helpers.chat(page, 'Finish AB#502 and open the pull request.');
    await helpers.frame().locator('.markdown-body').getByText(/pull request/i).first().waitFor();
  },
  async runVerification({ helpers, page }) {
    await helpers.openChat(page);
    await helpers.chat(page, 'Run the verification gates for this change.');
    await helpers.frame().locator('.markdown-body').getByText(/tests/i).first().waitFor();
  },
  async modesSelector({ helpers, page }) {
    await helpers.openChat(page);
    const toggle = helpers.frame().locator('.mode-toggle, .mode-selector, [aria-label*="mode" i]').first();
    if (await toggle.count()) {
      await toggle.click();
    } else {
      // Fall back to the mode command when the chat exposes no inline toggle.
      await helpers.runCommandId(page, 'adoCode.setMode');
    }
  },
  async mermaidDiagram({ helpers, page }) {
    await helpers.openChat(page);
    await helpers.chat(page, 'Diagram the checkout request flow.');
    await helpers.frame().locator('.markdown-body svg').first().waitFor();
  },
  async mcpSkills({ helpers, page }) {
    // Configuration webview (adoCode.openSettings) → MCP servers / Skills tab.
    await helpers.runCommandId(page, 'adoCode.openSettings');
    await helpers.waitForWebview(page);
    await helpers.frame().locator('.config-mcp, .skill-catalog').first().waitFor();
  },
  async workItemWebview({ helpers, page }) {
    // Fragile: needs a selected work item; selection normally goes through a
    // native QuickPick. See capture-set.json note for this shot.
    await helpers.runCommandId(page, 'adoCode.selectWorkItem');
    await page.locator('.quick-input-box input').fill('502');
    await page.locator('.quick-input-box input').press('Enter');
    await helpers.runCommandId(page, 'adoCode.showWorkItemDetail');
    await helpers.waitForWebview(page);
    await helpers.frame().getByText(/acceptance criteria/i).first().waitFor();
  },
};

function frame(page) {
  return page.locator('iframe.webview').first().contentFrame();
}

// --- driver ---------------------------------------------------------------

function selectedShots(set, only) {
  const browser = set.shots.filter((s) => s.mode === 'browser');
  return only ? browser.filter((s) => only.includes(s.id)) : browser;
}

function printPlan(set, shots) {
  const manual = set.shots.filter((s) => s.mode === 'manual');
  console.log(`route: ${set.route}  (runner ${set.runner})`);
  console.log(`viewport: ${set.viewport.width}x${set.viewport.height} @${set.viewport.deviceScaleFactor}x`);
  console.log(`\nautomated (${shots.length} browser shot${shots.length === 1 ? '' : 's'}):`);
  for (const s of shots) console.log(`  • ${s.id.padEnd(20)} ${s.surface.padEnd(24)} scene=${s.scene}`);
  console.log(`\nhand-capture (${manual.length} native shot${manual.length === 1 ? '' : 's'}):`);
  for (const s of manual) console.log(`  • ${s.id.padEnd(20)} ${s.surface}`);
}

async function login(page, opts) {
  await page.goto(opts.baseUrl, { waitUntil: 'domcontentloaded' });
  const pw = page.locator('input[type="password"]');
  if (await pw.count()) {
    await pw.first().fill(opts.password);
    await page.locator('button[type="submit"], .submit').first().click();
    await page.waitForLoadState('networkidle');
  }
  // Wait for the workbench shell (the webviews only exist once it boots).
  await page.locator('.monaco-workbench, .activitybar').first().waitFor({ timeout: opts.timeout });
}

// Playwright is imported lazily so --plan and --probe-less runs stay offline.
async function loadChromium() {
  try {
    const { chromium } = await import('playwright');
    return chromium;
  } catch {
    console.error('Playwright is not installed. Run:\n  cd tools/capture && npm install');
    process.exit(2);
  }
}

// `channel: 'chrome'` reuses a system Chrome (avoids a browser download);
// `--chromium <path>` pins an explicit build.
function launchOptions(opts) {
  const o = { headless: !opts.headed };
  if (opts.channel) o.channel = opts.channel;
  if (opts.chromium) o.executablePath = opts.chromium;
  return o;
}

// Smoke test for the route: log in, open a workspace, screenshot the workbench.
// Needs no capture-set scenes, so it validates Docker+code-server+Playwright alone.
async function probe(opts) {
  const chromium = await loadChromium();
  mkdirSync(opts.out, { recursive: true });
  const browser = await chromium.launch(launchOptions(opts));
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(opts.timeout);
  try {
    await login(page, opts);
    await page.goto(`${opts.baseUrl}/?folder=${encodeURIComponent(opts.folder)}`, { waitUntil: 'domcontentloaded' });
    await page.locator('.monaco-workbench').first().waitFor({ timeout: opts.timeout });
    const out = join(opts.out, 'workbench.png');
    await page.screenshot({ path: out });
    console.log(`probe OK — "${await page.title()}" @ ${opts.baseUrl}`);
    console.log(`  screenshot: ${out}`);
  } finally {
    await browser.close();
  }
}

async function capture(set, shots, opts) {
  const chromium = await loadChromium();

  if (!opts.password && !process.env.CAPTURE_PASSWORD) {
    console.error('No code-server password set. Pass --password or CAPTURE_PASSWORD.');
    process.exit(2);
  }
  mkdirSync(opts.out, { recursive: true });

  const browser = await chromium.launch(launchOptions(opts));
  const context = await browser.newContext({
    viewport: { width: set.viewport.width, height: set.viewport.height },
    deviceScaleFactor: set.viewport.deviceScaleFactor,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(opts.timeout);

  try {
    await login(page, opts);
    const folderUrl = `${opts.baseUrl}/?folder=${encodeURIComponent(opts.folder)}`;
    await page.goto(folderUrl, { waitUntil: 'domcontentloaded' });
    await page.locator('.monaco-workbench').first().waitFor({ timeout: opts.timeout });

    const helpers = makeHelpers(page, opts);
    let ok = 0;
    for (const shot of shots) {
      const scene = SCENES[shot.scene];
      if (!scene) {
        console.warn(`  ! ${shot.id}: no scene "${shot.scene}" — skipped`);
        continue;
      }
      process.stdout.write(`  → ${shot.id} … `);
      try {
        await helpers.setScenario(shot.scenario);
        await scene({ helpers, page, opts });
        // The manifest spec is the whole editor window (1440x900 @2x), so shoot
        // the viewport — not just the sidebar iframe.
        await page.screenshot({ path: join(opts.out, `${shot.id}.png`) });
        console.log('captured');
        ok++;
      } catch (err) {
        console.log(`FAILED — ${err.message.split('\n')[0]}`);
        if (opts.keepOpen) await page.pause();
      }
    }
    console.log(`\n${ok}/${shots.length} captured into ${opts.out}`);
    console.log('Next: set each manifest status to "captured" + the figure data-state, then bump SITE_VERSION (see assets/img/screenshots/README.md).');
  } finally {
    if (opts.keepOpen) await page.pause();
    await browser.close();
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log('usage: node tools/capture/capture.mjs [--plan] [--probe] [--only a,b] [--base-url URL] [--password PW] [--folder ABS] [--out DIR] [--timeout MS] [--channel chrome] [--chromium PATH] [--headed] [--keep-open]');
    return;
  }

  if (opts.probe) {
    await probe(opts);
    return;
  }

  const set = loadCaptureSet();
  for (const s of set.shots) {
    if (!MODES.includes(s.mode)) throw new Error(`${s.id}: mode must be one of ${MODES.join(', ')}`);
  }
  const shots = selectedShots(set, opts.only);
  if (opts.only) {
    const unknown = opts.only.filter((id) => !shots.some((s) => s.id === id));
    if (unknown.length) throw new Error(`--only: not automated shots: ${unknown.join(', ')}`);
  }

  if (opts.plan) {
    printPlan(set, shots);
    return;
  }
  if (!shots.length) {
    console.log('Nothing to do — no browser shots selected.');
    return;
  }
  if (existsSync(opts.out) === false) mkdirSync(opts.out, { recursive: true });
  await capture(set, shots, opts);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
