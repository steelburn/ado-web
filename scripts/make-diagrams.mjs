// Exports the ```mermaid diagrams in docs/architecture.md to
// docs/diagrams/<nn>-<slug>.svg and .png.
//
//   node scripts/make-diagrams.mjs [--force-fetch] [--only <slug>] [--keep-temp]
//
// Zero dependencies, matching the rest of the repo: the mermaid bundle is
// downloaded once and cached in the OS temp dir, inlined into a temp HTML file
// (so headless Chrome never needs network or a server), rendered with
// `--dump-dom` to capture the SVG, then rasterised at 2x with `--screenshot`.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { decorateSvg, escapeHtml, extractDiagrams, svgSize } from './diagrams.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOC = join(root, 'docs', 'architecture.md');
const OUT_DIR = join(root, 'docs', 'diagrams');
const SCALE = 2;
const BACKGROUND = '#0b0e14';

// Pinned to the mermaid 11 line; override with MERMAID_URL to re-pin.
const MERMAID_URL = process.env.MERMAID_URL || 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';

// On-brand palette, mirrored from assets/css/style.css design tokens.
const MERMAID_CONFIG = {
  startOnLoad: false,
  securityLevel: 'strict',
  theme: 'base',
  fontFamily: 'Segoe UI, Arial, sans-serif',
  // Root-level htmlLabels:false IS the one that matters — the per-diagram
  // `flowchart.htmlLabels` alone still emits <foreignObject> labels, which
  // render as blank boxes in plenty of SVG consumers (resvg, Inkscape,
  // ImageMagick, GitHub's sanitiser). Probe: scripts/make-diagrams.mjs notes.
  htmlLabels: false,
  flowchart: { htmlLabels: false, useMaxWidth: false, curve: 'basis', padding: 16 },
  themeVariables: {
    darkMode: true,
    background: BACKGROUND,
    fontFamily: 'Segoe UI, Arial, sans-serif',
    primaryColor: '#10141d',
    primaryTextColor: '#e6e9f0',
    primaryBorderColor: '#0078d4',
    secondaryColor: '#161b26',
    tertiaryColor: '#0b0e14',
    mainBkg: '#10141d',
    nodeBorder: '#0078d4',
    nodeTextColor: '#e6e9f0',
    lineColor: '#8b93a7',
    textColor: '#e6e9f0',
    edgeLabelBackground: BACKGROUND,
    clusterBkg: '#10141d',
    clusterBorder: '#232a3b',
    titleColor: '#e6e9f0',
  },
};

const BROWSERS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};

const browser = BROWSERS.find((p) => existsSync(p));
if (!browser) {
  console.error('No Chrome/Edge binary found. Install Chrome/Edge or edit BROWSERS in this script.');
  process.exit(1);
}

async function fetchBundle() {
  const cacheDir = join(tmpdir(), 'ado-web-mermaid');
  const cached = join(cacheDir, MERMAID_URL.split('/').pop());
  if (existsSync(cached) && !flag('--force-fetch')) return readFileSync(cached, 'utf8');

  console.log(`Fetching ${MERMAID_URL} ...`);
  const res = await fetch(MERMAID_URL);
  if (!res.ok) throw new Error(`mermaid download failed: HTTP ${res.status}`);
  const source = await res.text();
  if (!/globalThis\[["']mermaid["']\]|window\.mermaid|self\.mermaid/.test(source)) {
    throw new Error('downloaded mermaid bundle does not look like a UMD build');
  }
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(cached, source, 'utf8');
  return source;
}

function renderPage(source, bundle) {
  const config = JSON.stringify(MERMAID_CONFIG);
  const escaped = escapeHtml(source).replace(/<\/script/gi, '<\\/script');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>rendering</title>
<style>html,body{margin:0;padding:0;background:${BACKGROUND}}</style>
<script>${bundle.replace(/<\/script/gi, '<\\/script')}</script>
</head><body>
<pre id="src" hidden>${escaped}</pre>
<div id="host"></div>
<script>
(function () {
  var src = document.getElementById('src').textContent;
  mermaid.initialize(${config});
  mermaid.render('ado-diagram', src).then(function (result) {
    document.getElementById('host').innerHTML = result.svg;
    Array.prototype.forEach.call(document.querySelectorAll('script'), function (s) { s.remove(); });
    document.title = 'READY';
  }).catch(function (err) {
    document.body.setAttribute('data-error', (err && err.message) || String(err));
    document.title = 'ERROR';
  });
})();
</script>
</body></html>
`;
}

function screenshotPage(svg, { width, height }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>diagram</title>
<style>html,body{margin:0;padding:0;background:${BACKGROUND};overflow:hidden}
svg{display:block}</style>
</head><body>
${svg}
</body></html>
`;
}

function chrome(args) {
  const res = spawnSync(browser, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', ...args], {
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
  });
  if (res.error) throw res.error;
  return res;
}

function extractRenderedSvg(dump) {
  if (dump.includes('data-error=')) {
    const message = /data-error="([^"]*)"/.exec(dump);
    throw new Error(`mermaid failed to render: ${message ? message[1] : 'unknown error'}`);
  }
  const host = dump.indexOf('id="host"');
  const start = dump.indexOf('<svg', host >= 0 ? host : 0);
  const end = dump.lastIndexOf('</svg>');
  if (start < 0 || end < start) throw new Error('no rendered <svg> in DOM dump');
  return dump.slice(start, end + '</svg>'.length);
}

function verifyPng(buffer, expected) {
  if (buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('output is not a PNG');
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (width !== expected.width || height !== expected.height) {
    throw new Error(`PNG is ${width}x${height}, expected ${expected.width}x${expected.height}`);
  }
  return { width, height };
}

const bundle = await fetchBundle();
const diagrams = extractDiagrams(readFileSync(DOC, 'utf8'));
const only = value('--only');
const selected = only ? diagrams.filter((d) => d.slug === only) : diagrams;
if (selected.length === 0) {
  console.error(`No diagrams matched${only ? ` --only ${only}` : ''}. Known: ${diagrams.map((d) => d.slug).join(', ')}`);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), 'ado-diagrams-'));

try {
  for (const diagram of selected) {
    const pagePath = join(tmp, `${diagram.slug}.html`);
    writeFileSync(pagePath, renderPage(diagram.source, bundle), 'utf8');

    const dom = chrome(['--virtual-time-budget=30000', '--force-device-scale-factor=1', '--dump-dom', pathToFileURL(pagePath).href]);
    const svg = decorateSvg(extractRenderedSvg(dom.stdout), { title: diagram.heading, background: BACKGROUND });
    const size = svgSize(svg);
    if (size.width < 200 || size.height < 120) {
      throw new Error(`${diagram.slug}: implausibly small SVG (${size.width}x${size.height})`);
    }

    const svgOut = join(OUT_DIR, `${diagram.slug}.svg`);
    writeFileSync(svgOut, svg, 'utf8');

    const shotPath = join(tmp, `${diagram.slug}-shot.html`);
    writeFileSync(shotPath, screenshotPage(svg, size), 'utf8');
    const pngOut = join(OUT_DIR, `${diagram.slug}.png`);
    chrome([
      `--force-device-scale-factor=${SCALE}`,
      `--window-size=${size.width},${size.height}`,
      `--screenshot=${pngOut}`,
      pathToFileURL(shotPath).href,
    ]);

    const png = verifyPng(readFileSync(pngOut), { width: size.width * SCALE, height: size.height * SCALE });
    console.log(`Wrote docs/diagrams/${diagram.slug}.svg (${size.width}x${size.height}) + .png (${png.width}x${png.height})`);
  }
  console.log(`\n${selected.length} diagram(s) exported to docs/diagrams/`);
} finally {
  if (!flag('--keep-temp')) rmSync(tmp, { recursive: true, force: true });
  else console.log(`Temp files kept in ${tmp}`);
}
