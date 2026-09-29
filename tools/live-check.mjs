// tools/live-check.mjs — smoke-check the running container for the new emphasis.
const base = 'http://localhost:3060';
const checks = [
  ['/', (b) => b.includes('id="highlights"'), 'index has #highlights'],
  ['/', (b) => b.includes('New Project Wizard'), 'index: New Project Wizard'],
  ['/', (b) => b.includes('Editor Area'), 'index: Editor Area'],
  ['/', (b) => b.includes('Delegate to Agents'), 'index: Delegate to Agents'],
  ['/', (b) => b.includes('?v=0.9.0'), 'index cache-bust=0.9.0'],
  ['/features.html', (b) => b.includes('class="bento-card hl-card'), 'features has highlight cards'],
  ['/features.html', (b) => b.includes('Delegate to Coding Agents'), 'features: delegation card'],
  ['/assets/css/style.css', (b) => b.includes('.hl-card'), 'css served with .hl-card'],
];
let bad = 0;
for (const [path, fn, label] of checks) {
  const res = await fetch(base + path);
  const body = await res.text();
  const ok = res.ok && fn(body);
  if (!ok) bad++;
  console.log(`${ok ? 'OK ' : 'BAD'} [${res.status}] ${label}`);
}
console.log(bad ? `\n${bad} check(s) failed` : '\nall live checks passed');
process.exit(bad ? 1 : 0);
