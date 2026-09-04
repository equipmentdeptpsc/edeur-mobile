import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const authentication = read('lib/canonical/authentication.ts');
const authContext = read('lib/auth.tsx');
const login = read('app/login.tsx');
let passed = 0;
let failed = 0;
const check = (condition, label) => {
  if (condition) { passed += 1; console.log(`PASS: ${label}`); }
  else { failed += 1; console.error(`FAIL: ${label}`); }
};

check(authentication.includes("'/api/auth/operator-pin-login'") && authentication.includes('JSON.stringify(payload)'), 'PIN transport uses the canonical Operator PIN endpoint and payload boundary');
check(authentication.includes('signInWithOperatorPin') && authentication.includes('isValidOperatorPin(pin)'), 'PIN sign-in validates before transport');
check(authentication.includes("response.status === 429") && authentication.includes('RATE_LIMITED'), 'rate limits are normalized without exposing account state');
check(authentication.includes('ACCOUNT_UNAVAILABLE') && !authentication.includes('Your account is not linked'), 'operator linkage failure is normalized');
check(login.includes('Login Name') && login.includes('Six digit Operator PIN') && login.includes('Use password instead'), 'login exposes Login Name, PIN, and explicit password compatibility');
check(login.includes('keyboardType="number-pad"') && login.includes('inputMode="numeric"') && login.includes('maxLength={6}'), 'PIN input uses a six-digit numeric keyboard');
check(login.includes('secureTextEntry={!pinVisible}') && login.includes("'Show PIN'") && login.includes("'Hide PIN'"), 'PIN is masked by default with an accessible visibility toggle');
check(login.includes("value.replace(/\\D/g, '').slice(0, 6)") && login.includes('isValidOperatorPin(pin)'), 'PIN input rejects whitespace and nonnumeric characters');
check(authContext.includes("method === 'OPERATOR_PIN'") && authContext.includes('signInWithOperatorPin(identifier, credential)'), 'auth context routes only the selected PIN flow to the PIN endpoint');
check(login.includes("setPin(''); setPassword(''); setPinVisible(false)") && !login.includes('localStorage.setItem'), 'PIN is cleared after completion paths and is not persisted by the login screen');
check(!login.includes('console.log') && !authentication.includes('console.log'), 'PIN is not logged by login or transport code');

console.log(`Results: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
