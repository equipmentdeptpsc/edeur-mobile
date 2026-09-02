import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const auth = fs.readFileSync('lib/auth.tsx', 'utf8');
const repository = fs.readFileSync('lib/repositories/SupabaseOperatorWorkRepository.ts', 'utf8');
const authentication = fs.readFileSync('lib/canonical/authentication.ts', 'utf8');
const login = fs.readFileSync('app/login.tsx', 'utf8');
const connectivity = fs.readFileSync('lib/useConnectivity.ts', 'utf8');
const checks = [
  ['core session applies work before optional turnover loading', /setCanonicalWork\(work\)[\s\S]*loadTurnoverTargets/],
  ['turnover failure leaves core session hydration usable and retries on refresh', /Eligibility is optional for core work rendering and can retry on the next refresh\./],
  ['repository exposes separate turnover loading', /async loadTurnoverTargets\(work/],
  ['core work reads do not await turnover eligibility', !/for\(const work of works\) await this\.attachTurnoverTargets\(work\)/.test(repository)],
  ['session hydration uses the one-shot INITIAL_SESSION event', /onAuthStateChange\(/.test(authentication) && /INITIAL_SESSION/.test(authentication)],
  ['initial session listener is cleaned up', /data\.subscription\.unsubscribe\(\)/.test(authentication)],
  ['UAT keeps a hydration sentinel until online authorization or bounded offline restoration resolves', /mode === 'UAT' \? undefined : loadSession\(\)/.test(auth) && /'INITIALIZING'/.test(auth)],
  ['startup effect records entry before evaluating UAT authentication guards', /AUTH_INIT_EFFECT_ENTER[\s\S]*?if \(runtime\.environment\.mode !== 'UAT'\)/.test(auth) && auth.includes('AUTH_INIT_EFFECT_GUARD')],
  ['missing UAT authentication reaches a terminal signed-out state', auth.includes("AUTHENTICATION_UNAVAILABLE") && auth.includes("finishSignedOut('AUTHENTICATION_UNAVAILABLE', false)")],
  ['initial session restoration begins independently of connectivity completion', auth.indexOf('AUTH_INITIAL_SESSION_CALL') < auth.indexOf('const online = await onlinePromise')],
  ['connectivity probing is diagnostic-only and settles at the native deadline', connectivity.includes('CONNECTIVITY_PROBE_TIMEOUT_ARMED') && connectivity.includes('CONNECTIVITY_PROBE_TIMEOUT_FIRED') && connectivity.includes('CONNECTIVITY_PROBE_RESOLVED')],
  ['startup cleanup cannot silently retain the initializing sentinel', auth.includes('AUTH_INIT_RESULT_IGNORED_CANCELLED') && auth.includes('AUTH_INIT_EFFECT_CLEANUP')],
  ['bootstrap failures are classified and terminal rather than leaving operator undefined', auth.includes('AUTH_INIT_SYNC_FAILURE') && auth.includes("finishSignedOut('BOOTSTRAP_FAILURE', false)")],
  ['offline continuation restores only a bounded saved snapshot', /restoreOfflineContinuation/.test(auth) && /OFFLINE_CONTINUATION/.test(auth)],
  ['accepted Start DEUR persists its canonical response before the follow-up work refresh', /runCanonical\('start',[\s\S]*?async \(accepted\)[\s\S]*?activeActivity: 'operation'[\s\S]*?persistOfflineContinuation\(startedWork\)[\s\S]*?refreshCanonicalWork/.test(auth)],
  ['continuation writes retain the timestamp from a genuine successful online authorization', /applyCanonicalSession[\s\S]*?lastSuccessfulOnlineAuthorizationAt\.current = new Date\(\)/.test(auth) && /persistOfflineContinuation[\s\S]*?offlineContinuation\.save\(work, authorizationAt\)/.test(auth)],
  ['reconnect revalidates before it replays the durable outbox', /restoreSession\(\)[\s\S]*applyCanonicalSession\(session\)[\s\S]*replayOffline\(true\)/.test(auth)],
  ['restored sessions redirect from login to the public Home path', /if \(operator\) router\.replace\('\/home'\)/.test(login)],
  ['a successful login redirects through the public Home path', /router\.replace\('\/home'\)/.test(login)],
  ['root redirects authenticated operators through the public Home path', read('app/index.tsx').includes('href="/home"')],
  ['post-auth public paths never include Expo Router route-group segments', !/(?:replace|push)\('\/\(tabs\)\//.test(login + read('app/(tabs)/home.tsx') + read('app/turnover-login.tsx') + read('app/reliever-login.tsx'))],
];
let failed = 0;
for (const [name, check] of checks) {
  const pass = check instanceof RegExp ? check.test(auth + repository) : check;
  console.log(`${pass ? 'PASS' : 'FAIL'}: ${name}`);
  if (!pass) failed++;
}
process.exitCode = failed ? 1 : 0;
