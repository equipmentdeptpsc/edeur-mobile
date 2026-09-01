import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source = fs.readFileSync('lib/useConnectivity.ts', 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const module = { exports: {} };
new Function('require', 'module', 'exports', output)((name) => {
  if (name === 'react') return { useState: () => [], useEffect: () => {}, useRef: () => ({ current: true }) };
  if (name === 'react-native') return { AppState: { addEventListener: () => ({ remove() {} }) }, Platform: { OS: 'web' } };
  throw new Error(`Unexpected import: ${name}`);
}, module, module.exports);

const { canonicalConnectivityProbeUrl, probeCanonicalConnectivity } = module.exports;
assert.equal(canonicalConnectivityProbeUrl('https://psc-ed-uat.equipmentdept-psc.workers.dev'), 'https://psc-ed-uat.equipmentdept-psc.workers.dev/api/auth/username-login');

const originalFetch = globalThis.fetch;
globalThis.fetch = async () => new Response(JSON.stringify({ success: false }), { status: 405 });
assert.equal(await probeCanonicalConnectivity(canonicalConnectivityProbeUrl('https://psc-ed-uat.equipmentdept-psc.workers.dev')), true, 'CORS-readable method rejection proves the UAT Worker is reachable');
globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
assert.equal(await probeCanonicalConnectivity(canonicalConnectivityProbeUrl('https://psc-ed-uat.equipmentdept-psc.workers.dev')), false, 'transport or CORS failure remains fail-closed');
globalThis.fetch = originalFetch;

assert.match(source, /setInterval\(\(\) => \{ void checkConnectivity\(\); \}, HEARTBEAT_INTERVAL_MS\)/, 'Web keeps polling while an offline continuation is active');
assert.match(fs.readFileSync('lib/auth.tsx', 'utf8'), /REVALIDATION_START[\s\S]*?applyCanonicalSession[\s\S]*?OUTBOX_REPLAY_START[\s\S]*?replayOffline\(true\)/, 'online reconnect revalidates before FIFO replay');
console.log('PASS web connectivity: CORS-readable probe, periodic retry, revalidation before replay');
