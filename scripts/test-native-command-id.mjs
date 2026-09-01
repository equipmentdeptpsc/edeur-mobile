import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const files = {
  helper: read('lib/canonical/secureCommandId.ts'),
  auth: read('lib/auth.tsx'),
  commands: read('lib/canonical/commandRepository.ts'),
  outbox: read('lib/canonical/offlineOutbox.ts'),
  envelope: read('lib/canonical/offlineEnvelope.ts'),
};
let passed = 0;
let failed = 0;
const check = (condition, label) => {
  if (condition) { passed++; console.log(`PASS: ${label}`); }
  else { failed++; console.error(`FAIL: ${label}`); }
};

console.log('=== Native Canonical Command-ID Regression ===');
Object.defineProperty(globalThis, 'crypto', { configurable: true, value: undefined });
check(files.helper.includes("from 'expo-crypto'") && files.helper.includes('randomUUID()'), 'secure ID helper uses Expo Crypto');
check(!Object.values(files).some((source) => /\bcrypto\.randomUUID\s*\(|globalThis\.crypto|window\.crypto/.test(source)), 'command paths do not depend on browser crypto globals');
check(files.auth.includes('createSecureCommandId()') && (files.auth.match(/createSecureCommandId\(\)/g) ?? []).length >= 4, 'Start, activity, turnover, and shared command IDs use the helper');
check(files.commands.includes('identity:string=createSecureCommandId()'), 'repository default command identity uses the helper');
check(files.outbox.includes('const id = createSecureCommandId()'), 'offline outbox envelopes use the helper');
check(files.envelope.includes('id = createSecureCommandId()'), 'generic offline envelopes use the helper');
check(files.helper.includes('cryptographically secure UUID'), 'helper documents the security contract');
console.log(`=== Results: ${passed} passed, ${failed} failed ===`);
process.exitCode = failed ? 1 : 0;
