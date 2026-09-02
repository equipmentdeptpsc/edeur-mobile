import { readFileSync } from 'node:fs';

const safe = readFileSync('lib/expoKeepAwakeSafe.ts', 'utf8');
const metro = readFileSync('metro.config.js', 'utf8');
const layout = readFileSync('app/_layout.tsx', 'utf8');
const checks = [
  ['Metro aliases Expo keep-awake to the guarded shim', metro.includes("moduleName === 'expo-keep-awake'") && metro.includes('expoKeepAwakeSafe.ts')],
  ['activation catches native rejection', /activateKeepAwakeAsync[\s\S]*?try[\s\S]*?catch/.test(safe)],
  ['deactivation catches native rejection', /deactivateKeepAwakeAsync[\s\S]*?try[\s\S]*?catch/.test(safe)],
  ['hook never creates an unhandled activation promise', safe.includes('void activateKeepAwakeAsync') && !safe.includes('activateKeepAwakeAsync(tagOrDefault).then(')],
  ['cleanup remains non-blocking', safe.includes('void deactivateKeepAwakeAsync')],
  ['root layout has no direct keep-awake business dependency', !layout.includes('expo-keep-awake')],
];
let failed = 0;
for (const [name, pass] of checks) { console.log(`${pass ? 'PASS' : 'FAIL'}: ${name}`); if (!pass) failed += 1; }
console.log(`Results: ${checks.length - failed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;

