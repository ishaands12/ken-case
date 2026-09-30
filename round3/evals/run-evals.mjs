import { readFile } from 'node:fs/promises';
import { evaluateAction } from '../policy.mjs';

const cases = JSON.parse(await readFile(new URL('./cases.json', import.meta.url), 'utf8'));
let passed = 0;
for (const c of cases) {
  const got = evaluateAction(c.input);
  const ok = Object.entries(c.expect).every(([k,v]) => got[k] === v);
  if (ok) passed++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${c.id} ${c.name}`);
  if (!ok) console.log('  expected', c.expect, 'got', got);
}
console.log(`\n${passed}/${cases.length} evals passed`);
if (passed !== cases.length) process.exitCode = 1;
