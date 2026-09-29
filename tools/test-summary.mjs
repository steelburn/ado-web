// tools/test-summary.mjs — run the full suite and print only the totals.
import { spawnSync } from 'node:child_process';

const r = spawnSync('node', ['--test', '--test-reporter=tap'], { encoding: 'utf8', shell: true });
const out = `${r.stdout || ''}${r.stderr || ''}`;
for (const line of out.split(/\r?\n/)) {
  if (/^# (tests|suites|pass|fail|cancelled|skipped|todo|duration_ms)\b/.test(line)) console.log(line);
  if (/^not ok /.test(line)) console.log(line);
}
console.log(`exit code: ${r.status}`);
