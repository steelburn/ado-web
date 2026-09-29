#!/usr/bin/env node
// Render the capture container's code-server settings + keybindings.
//
//   node tools/capture/wiring/wire.mjs            # write from .env.capture
//   node tools/capture/wiring/wire.mjs --check    # fail if generated output is stale
//
// Outputs (gitignored, staged into the volumes by the compose `init` service):
//   .generated/User/settings.json               User scope  (every setting)
//   .generated/workspace/.vscode/settings.json  Workspace   (no application-only keys)
//   .generated/User/keybindings.json            deterministic command chords
//
// Scope split: VS Code *application*-scoped settings (theme, telemetry, zoom,
// extensions.autoUpdate, …) are only honoured in the User profile. Writing them
// into the workspace file makes the editor flag "cannot be applied in this
// scope" — see APPLICATION_SCOPED below.
//
// Sources, in order: defaults from .env.capture.example, overridden by
// tools/capture/.env.capture if present. Secrets are never printed — the summary
// redacts PAT / API key.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const captureDir = join(here, '..');
const examplePath = join(here, '.env.capture.example');
const envPath = join(captureDir, '.env.capture');
const settingsTemplatePath = join(here, 'settings.template.json');
const keybindingsTemplatePath = join(here, 'keybindings.template.json');
const outDir = join(captureDir, '.generated');

// Settings VS Code only honours in the User profile. Keeping them out of the
// workspace file is the fix for the editor's "this setting cannot be applied in
// this scope" markers (originally: extensions.autoUpdate).
export const APPLICATION_SCOPED = new Set([
  'extensions.autoUpdate',
  'security.workspace.trust.enabled',
  'telemetry.telemetryLevel',
  'window.zoomLevel',
  'workbench.colorTheme',
  'workbench.startupEditor',
]);

// `KEY=value` per line, ignoring blanks and #-comments.
export function parseEnv(text) {
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return out;
}

// Substitute ${NAME}; fail loudly on a placeholder with no value so a half-wired
// container never ships.
export function renderTemplate(text, vars) {
  const rendered = text.replace(/\$\{([A-Z0-9_]+)\}/g, (_, key) => {
    if (!(key in vars)) {
      throw new Error(`no value for \${${key}} — add it to .env.capture or .env.capture.example`);
    }
    return vars[key];
  });
  const leftovers = rendered.match(/\$\{[A-Z0-9_]+\}/g);
  if (leftovers) throw new Error(`unsubstituted placeholders: ${leftovers.join(', ')}`);
  return rendered;
}

// `_comment`-style keys are documentation, not settings — drop them so the
// editor does not flag "Unknown Configuration Setting".
export function stripDocKeys(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) if (!k.startsWith('_')) out[k] = v;
  return out;
}

export function workspaceSettings(userSettings) {
  const out = {};
  for (const [k, v] of Object.entries(userSettings)) {
    if (!APPLICATION_SCOPED.has(k)) out[k] = v;
  }
  return out;
}

export function renderOutputs(vars) {
  const user = stripDocKeys(JSON.parse(renderTemplate(readFileSync(settingsTemplatePath, 'utf8'), vars)));
  const keybindings = JSON.parse(renderTemplate(readFileSync(keybindingsTemplatePath, 'utf8'), vars));
  const file = (obj) => JSON.stringify(obj, null, 2) + '\n';
  return {
    [join(outDir, 'User', 'settings.json')]: file(user),
    [join(outDir, 'workspace', '.vscode', 'settings.json')]: file(workspaceSettings(user)),
    [join(outDir, 'User', 'keybindings.json')]: file(keybindings),
  };
}

function loadVars() {
  const base = parseEnv(readFileSync(examplePath, 'utf8'));
  const overrides = existsSync(envPath) ? parseEnv(readFileSync(envPath, 'utf8')) : {};
  return { ...base, ...overrides };
}

const redact = (v) => (v ? `${v.slice(0, 3)}…(${v.length} chars)` : '(unset)');

function main() {
  const vars = loadVars();
  const outputs = renderOutputs(vars);
  const check = process.argv.includes('--check');

  if (check) {
    const stale = Object.entries(outputs).filter(
      ([target, expected]) => !existsSync(target) || readFileSync(target, 'utf8') !== expected,
    );
    if (stale.length) {
      for (const [target] of stale) console.error(`stale: ${target}`);
      console.error('run `node tools/capture/wiring/wire.mjs` to regenerate');
      process.exit(1);
    }
    console.log(`wire: ${Object.keys(outputs).length} generated files are up to date.`);
    return;
  }

  for (const [target, content] of Object.entries(outputs)) {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
    console.log(`wrote ${target}`);
  }
  console.log(`  org      ${vars.ADO_ORG}  ${vars.ADO_ORG_URL}  (${vars.ADO_PROJECT})`);
  console.log(`  llm      ${vars.LLM_PROVIDER}  ${vars.LLM_API_URL}  ${vars.LLM_MODEL}`);
  console.log(`  api key  ${redact(vars.LLM_API_KEY)}`);
  console.log(`  mode     ${vars.ADO_CODE_MODE}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
