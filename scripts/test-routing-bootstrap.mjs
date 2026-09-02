import { readFileSync } from 'node:fs';

const layout = readFileSync('app/_layout.tsx', 'utf8');
const index = readFileSync('app/index.tsx', 'utf8');
const notFound = readFileSync('app/+not-found.tsx', 'utf8');
const checks = [
  ['root navigator remains mounted while fonts load', !layout.includes("if (!fontsLoaded && !fontError) {\n    return null;")],
  ['index is the canonical default route', layout.includes('<Stack initialRouteName="index"')],
  ['auth bootstrap remains the root route decision', index.includes("if (operator === undefined) return") && index.includes('<Redirect href="/login" />') && index.includes('<Redirect href="/home" />')],
  ['unknown routes retain the explicit not-found screen', notFound.includes("This screen doesn't exist.") && notFound.includes('href="/"')],
  ['startup routing does not use a timing delay', !layout.includes('setTimeout') && !index.includes('setTimeout')],
];
let failed = 0;
for (const [name, pass] of checks) { console.log(`${pass ? 'PASS' : 'FAIL'}: ${name}`); if (!pass) failed += 1; }
console.log(`Results: ${checks.length - failed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;

