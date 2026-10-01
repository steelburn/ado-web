// Rewrites every `?v=<value>` asset query in every root-level page to the value
// of SITE_VERSION from scripts/site-version.mjs. Idempotent.
//
// Post-split the site is multi-page, so this walks all root *.html files
// (index, features, gallery, …, deck, 404) rather than index.html alone.
//
// docs/architecture.md is rewritten too: its mermaid diagrams label the
// IDX→STY/MAIN edges with the same `?v=` token, so the drawing went stale on
// every bump until it was included (guarded by tests/architecture-doc.test.mjs).
//
// Usage: node scripts/set-site-version.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { SITE_VERSION } from './site-version.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pages = readdirSync(root).filter((f) => f.endsWith('.html'));
const targets = [...pages, join('docs', 'architecture.md')];

for (const file of targets) {
  const path = join(root, file);
  const before = readFileSync(path, 'utf8');
  const after = before.replace(/\?v=[0-9A-Za-z._-]+/g, `?v=${SITE_VERSION}`);
  if (after === before) {
    console.log(`${file}: already at ?v=${SITE_VERSION}`);
  } else {
    writeFileSync(path, after);
    console.log(`${file}: asset queries updated to ?v=${SITE_VERSION}`);
  }
}
