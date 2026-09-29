// Guards the capture wiring: tools/capture/wiring/*, the compose stack, and the
// Dockerfile. These are the pieces that were silently wrong and cost a run each:
//   • application-scoped settings written into the workspace file (editor error)
//   • no node/npm in the code-server image (MCP + gates dead)
//   • palette-title command invocation (ambiguous, chat never opened)
//
// They are cheap to check and expensive to rediscover, so they are locked here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  APPLICATION_SCOPED,
  parseEnv,
  renderTemplate,
  stripDocKeys,
  workspaceSettings,
} from '../tools/capture/wiring/wire.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

test('extensions.autoUpdate is application-scoped', () => {
  assert.ok(APPLICATION_SCOPED.has('extensions.autoUpdate'));
  assert.ok(APPLICATION_SCOPED.has('workbench.colorTheme'));
  assert.ok(APPLICATION_SCOPED.has('telemetry.telemetryLevel'));
});

test('workspace settings drop every application-scoped key, keep the rest', () => {
  const user = {
    'extensions.autoUpdate': false,
    'workbench.colorTheme': 'Default Dark Modern',
    'adoCode.adoProject': 'Contoso',
    'adoCode.mcp.servers': [],
    'editor.fontSize': 13,
  };
  const ws = workspaceSettings(user);
  for (const key of APPLICATION_SCOPED) assert.ok(!(key in ws), `${key} leaked into workspace settings`);
  assert.equal(ws['adoCode.adoProject'], 'Contoso');
  assert.deepEqual(ws['adoCode.mcp.servers'], []);
  assert.equal(ws['editor.fontSize'], 13);
});

test('doc keys (_comment) are stripped from rendered settings', () => {
  const clean = stripDocKeys({ _comment: 'docs', 'adoCode.adoProject': 'C' });
  assert.ok(!('_comment' in clean));
  assert.equal(clean['adoCode.adoProject'], 'C');
});

test('renderTemplate substitutes, and fails on missing/leftover placeholders', () => {
  assert.equal(renderTemplate('a=${X}', { X: '1' }), 'a=1');
  assert.throws(() => renderTemplate('a=${MISSING}', {}), /no value/);
});

test('parseEnv reads KEY=value, skips blanks and comments', () => {
  const env = parseEnv('# c\n\nADO_ORG=contoso-demo\nLLM_MODEL=demo-gpt\n');
  assert.deepEqual(env, { ADO_ORG: 'contoso-demo', LLM_MODEL: 'demo-gpt' });
});

test('keybindings map every scene command id to a unique chord', () => {
  const capture = read('tools/capture/capture.mjs');
  const chords = [...capture.matchAll(/'([A-Za-z.]*adoCode\.[A-Za-z.]+)':\s*'((?:Control|Alt|Shift)[^']*)'/g)].map(
    (m) => ({ id: m[1], chord: m[2] }),
  );
  assert.ok(chords.length >= 5, 'expected the CHORDS map in capture.mjs');

  const keybindings = JSON.parse(read('tools/capture/wiring/keybindings.template.json'));
  const byCommand = new Map(keybindings.map((k) => [k.command, k.key]));

  // Playwright spells the modifier `Control`, keybindings.json spells it `ctrl`;
  // normalise both sides before comparing.
  const norm = (s) => s.toLowerCase().replace(/control/g, 'ctrl');

  for (const { id, chord } of chords) {
    assert.ok(byCommand.has(id), `no keybinding for scene command ${id}`);
    assert.equal(norm(byCommand.get(id)), norm(chord), `chord mismatch for ${id}`);
  }

  const keys = keybindings.map((k) => k.key.toLowerCase());
  assert.equal(new Set(keys).size, keys.length, 'duplicate keybinding chords');
});

test('capture.mjs invokes commands by id, not by palette title', () => {
  const capture = read('tools/capture/capture.mjs');
  assert.match(capture, /runCommandId/, 'expected a runCommandId helper');
  // The ambiguous titles that used to drive the scenes must be gone.
  assert.doesNotMatch(capture, /runCommand\(page, 'ADO Code:/, 'scene still triggers a command by title');
});

test('the code-server image is built with node/npm', () => {
  const dockerfile = read('tools/capture/Dockerfile.code-server');
  assert.match(dockerfile, /FROM codercom\/code-server/, 'must extend the code-server image');
  assert.match(dockerfile, /COPY --from=\w+ .*\/usr\/local\/bin\/node/, 'must copy the node binary');
  assert.match(dockerfile, /npm-cli\.js/, 'must link npm');
  // glibc note: copying an alpine (musl) node would not run on the Debian base.
  assert.match(dockerfile, /bookworm|node:\d+-[a-z]+(?!alpine)/, 'should copy a glibc node build');
});

test('compose builds the capture image and stages keybindings', () => {
  const compose = read('tools/capture/docker-compose.capture.yml');
  assert.match(compose, /dockerfile: Dockerfile\.code-server/, 'compose must build the custom image');
  assert.match(compose, /image: ado-code-capture-code-server/, 'compose must name the built image');
  assert.doesNotMatch(compose, /image: codercom\/code-server:latest/, 'stock image must no longer be used directly');
  assert.match(compose, /cp \/generated\/User\/keybindings\.json/, 'keybindings must be staged into the profile');
  assert.match(compose, /cp \/generated\/User\/settings\.json/, 'user settings must be staged');
  assert.match(compose, /cp \/generated\/workspace\/\.vscode\/settings\.json/, 'workspace settings must be staged');
});
