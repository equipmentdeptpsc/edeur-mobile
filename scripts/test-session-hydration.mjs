import fs from 'node:fs';

const auth = fs.readFileSync('lib/auth.tsx', 'utf8');
const repository = fs.readFileSync('lib/repositories/SupabaseOperatorWorkRepository.ts', 'utf8');
const authentication = fs.readFileSync('lib/canonical/authentication.ts', 'utf8');
const login = fs.readFileSync('app/login.tsx', 'utf8');
const checks = [
  ['core session applies work before optional turnover loading', /setCanonicalWork\(work\)[\s\S]*loadTurnoverTargets/],
  ['turnover failure does not reject core session hydration', /core work remains rendered/],
  ['repository exposes separate turnover loading', /async loadTurnoverTargets\(work/],
  ['core work reads do not await turnover eligibility', !/for\(const work of works\) await this\.attachTurnoverTargets\(work\)/.test(repository)],
  ['session hydration uses the one-shot INITIAL_SESSION event', /onAuthStateChange\(/.test(authentication) && /INITIAL_SESSION/.test(authentication)],
  ['initial session listener is cleaned up', /data\.subscription\.unsubscribe\(\)/.test(authentication)],
  ['UAT starts at the deterministic signed-out state instead of a spinner sentinel', /mode === 'UAT' \? null : loadSession\(\)/.test(auth)],
  ['restored sessions redirect from login to Home', /if \(operator\) router\.replace\('\/\(tabs\)\/home'\)/.test(login)],
];
let failed = 0;
for (const [name, check] of checks) {
  const pass = check instanceof RegExp ? check.test(auth + repository) : check;
  console.log(`${pass ? 'PASS' : 'FAIL'}: ${name}`);
  if (!pass) failed++;
}
process.exitCode = failed ? 1 : 0;
