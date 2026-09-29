// tools/crlf-check.mjs — report files containing bare LF (repo keeps root pages CRLF).
import { readFileSync } from 'node:fs';
const root = new URL('..', import.meta.url);
const list = process.argv.slice(2);
const targets = list.length ? list : ['index.html', 'features.html', 'assets/css/style.css', 'deck.html'];
let bad = 0;
for (const rel of targets) {
  const s = readFileSync(new URL(rel, root), 'utf8');
  const lines = s.split('\n');
  let count = 0;
  lines.forEach((ln, i) => {
    if (!ln.endsWith('\r') && i < lines.length - 1) {
      count++;
      if (count <= 5) console.log(`  ${rel}:${i + 1}: bare LF -> ${JSON.stringify(ln.slice(0, 60))}`);
    }
  });
  if (count) bad++;
  console.log(`${count === 0 ? 'OK ' : 'BAD'} ${rel}: bareLF=${count}`);
}
process.exit(bad ? 1 : 0);
