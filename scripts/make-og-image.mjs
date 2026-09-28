// Generates assets/img/og-image.png (1200x630) for Open Graph / Twitter cards.
//
// Social platforms do not render SVG OG images, so we rasterise a small
// on-brand HTML page with a headless Chrome/Edge. Run:
//   node scripts/make-og-image.mjs
import { existsSync, writeFileSync, readFileSync, mkdtempSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pngOut = join(root, 'assets', 'img', 'og-image.png');

const WIDTH = 1200;
const HEIGHT = 630;

const BROWSERS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

const html = [
  '<!DOCTYPE html>',
  '<html lang="en">',
  '<head>',
  '<meta charset="utf-8">',
  '<style>',
  '* { margin: 0; padding: 0; box-sizing: border-box; }',
  'html, body { width: ' + WIDTH + 'px; height: ' + HEIGHT + 'px; }',
  'body {',
  '  background: radial-gradient(125% 125% at 88% 6%, rgba(0,120,212,0.38), transparent 62%), #0b0e14;',
  '  color: #e6e9f0;',
  '  font-family: "Segoe UI", system-ui, -apple-system, Arial, sans-serif;',
  '  display: flex; flex-direction: column; justify-content: center;',
  '  padding: 84px 96px;',
  '}',
  '.brand { display: flex; align-items: center; gap: 18px; margin-bottom: 40px; }',
  '.logo { width: 66px; height: 66px; border-radius: 16px;',
  '  background: linear-gradient(180deg, #3a9bef, #0b5ca8);',
  '  display: flex; align-items: center; justify-content: center;',
  '  font-weight: 800; font-size: 32px; color: #fff; }',
  '.brand-name { font-size: 30px; font-weight: 700; letter-spacing: -0.01em; }',
  '.badge { margin-left: auto; font-family: Consolas, monospace; font-size: 19px;',
  '  color: #8a93a8; border: 1px solid #232a3b; border-radius: 999px; padding: 9px 20px; }',
  'h1 { font-size: 64px; line-height: 1.08; letter-spacing: -0.02em; max-width: 980px; }',
  'h1 .accent { color: #3a9bef; }',
  'p.sub { margin-top: 26px; font-size: 27px; color: #aab2c5; max-width: 920px; line-height: 1.38; }',
  '.tags { margin-top: 46px; display: flex; gap: 14px; font-family: Consolas, monospace;',
  '  font-size: 19px; color: #8a93a8; }',
  '.tags span { border: 1px solid #232a3b; border-radius: 8px; padding: 8px 16px; }',
  '</style>',
  '</head>',
  '<body>',
  '  <div class="brand">',
  '    <div class="logo">A</div>',
  '    <div class="brand-name">ADO Code</div>',
  '    <div class="badge">VS Code Marketplace</div>',
  '  </div>',
  '  <h1>Your Azure DevOps backlog, <span class="accent">inside VS Code</span>.</h1>',
  '  <p class="sub">Real work-item hierarchy, chat with any OpenAI-compatible or Anthropic LLM, and coding agents running in isolated git worktrees.</p>',
  '  <div class="tags"><span>Free</span><span>BYO API key</span><span>Chat - Plan - Act - YOLO</span></div>',
  '</body>',
  '</html>',
  '',
].join('\n');

const browser = BROWSERS.find((p) => existsSync(p));
if (!browser) {
  console.error('No Chrome/Edge binary found. Install Chrome/Edge or edit BROWSERS in this script.');
  process.exit(1);
}

const tmp = mkdtempSync(join(tmpdir(), 'ado-og-'));
const htmlPath = join(tmp, 'og-image.html');
writeFileSync(htmlPath, html, 'utf8');

const args = [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--window-size=' + WIDTH + ',' + HEIGHT,
  '--screenshot=' + pngOut,
  pathToFileURL(htmlPath).href,
];

const result = spawnSync(browser, args, { stdio: 'inherit' });
if (result.status !== 0) {
  console.error('Headless browser exited with status ' + result.status);
  process.exit(1);
}

// Verify the PNG really is 1200x630 (IHDR is the first chunk).
const buf = readFileSync(pngOut);
const isPng = buf.slice(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
if (!isPng) {
  console.error('Output is not a PNG: ' + pngOut);
  process.exit(1);
}
const width = buf.readUInt32BE(16);
const height = buf.readUInt32BE(20);
if (width !== WIDTH || height !== HEIGHT) {
  console.error('Unexpected size ' + width + 'x' + height + ' (expected ' + WIDTH + 'x' + HEIGHT + ')');
  process.exit(1);
}

console.log('Wrote ' + pngOut + ' (' + width + 'x' + height + ')');
