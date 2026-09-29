// One-time: renumber the `<!-- NN · Title -->` slide comments in deck.html so
// they ascend sequentially with no duplicates. CRLF-preserving.

import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'deck.html';
let text = readFileSync(FILE, 'utf8');

let n = 0;
text = text.replace(/<!-- \d\d · /g, () => `<!-- ${String(++n).padStart(2, '0')} · `);

writeFileSync(FILE, text, 'utf8');
console.log(`OK: renumbered ${n} slide comments`);
