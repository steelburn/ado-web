// Rewrites every `?v=<value>` asset query in index.html to the value of
// SITE_VERSION from scripts/site-version.mjs. Idempotent.
//
// Usage: node scripts/set-site-version.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { SITE_VERSION } from './site-version.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = join(root, 'index.html');

const before = readFileSync(indexPath, 'utf8');
const after = before.replace(/\?v=[0-9A-Za-z._-]+/g, `?v=${SITE_VERSION}`);

if (after === before) {
  console.log(`index.html already at ?v=${SITE_VERSION} — nothing to do.`);
} else {
  writeFileSync(indexPath, after);
  console.log(`index.html asset queries updated to ?v=${SITE_VERSION}.`);
}
