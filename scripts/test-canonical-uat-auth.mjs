import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const auth = read('lib/canonical/authentication.ts');
const context = read('lib/auth.tsx');
const login = read('app/login.tsx');
const environment = read('lib/canonical/environment.ts');
const repository = read('lib/repositories/SupabaseOperatorWorkRepository.ts');
const packageJson = read('package.json');

let passed = 0;
let failed = 0;
const check = (condition, label) => {
  if (condition) { passed += 1; console.log(`PASS: ${label}`); }
  else { failed += 1; console.error(`FAIL: ${label}`); }
};

check(login.includes("mode === 'UAT'") && login.includes('Username or email') && login.includes('secureTextEntry'), 'UAT renders canonical credential form');
check(!login.includes('Demo PINs: 1234') || login.includes("mode === 'DEMO' ?"), 'demo credential hints are isolated to DEMO mode');
check(auth.includes('signInWithPassword') && auth.includes('/api/auth/username-login'), 'canonical auth uses existing email/username contracts');
check(auth.includes("from('users')") && auth.includes("from('operators')") && auth.includes("status !== 'active'") && auth.includes("status !== 'Active'"), 'authenticated user and active operator linkage are required');
check(environment.includes("projectRef !== 'jtkctarqbwmqdcewthkn'") && environment.includes('Demo fallback is disabled'), 'UAT is pinned to isolated canonical environment');
check(packageJson.includes('"web:uat": "node --env-file=.env.uat') && packageJson.includes('--clear --web'), 'UAT web launch explicitly loads .env.uat');
check(context.includes('canonicalWorks') && context.includes('selectedCanonicalWork') && context.includes('selectCanonicalWork'), 'auth context exposes explicit work selection state');
check(context.includes('works.length===1?works[0]:null'), 'multiple works do not silently select the first item');
check(context.includes('setCanonicalWorks([])') && context.includes('setSelectedCanonicalWork(null)') && context.includes('clearSession()'), 'logout clears canonical session and work state');
check(repository.includes('getCurrentWorks') && repository.includes('rentalLine:{id:lineId'), 'successful canonical auth loads line-keyed work projections');
check(!auth.includes('console.log') && !context.includes('console.log') && !login.includes('password}</Text>'), 'credentials are not logged or rendered');

console.log(`Results: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
