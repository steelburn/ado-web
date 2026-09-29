// tools/normalize-crlf.mjs — convert bare LF to CRLF in the given files.
// Usage: node tools/normalize-crlf.mjs <file> [file...]
import { readFileSync, writeFileSync } from 'node:fs';
const root = new URL('..', import.meta.url);
for (const rel of process.argv.slice(2)) {
  const url = new URL(rel, root);
  const before = readFileSync(url, 'utf8');
  const after = before.replace(/(?<!\r)\n/g, '\r\n');
  if (after !== before) {
    writeFileSync(url, after);
    console.log(`fixed ${rel} (bare LF -> CRLF)`);
  } else {
    console.log(`ok    ${rel} (already CRLF)`);
  }
}
