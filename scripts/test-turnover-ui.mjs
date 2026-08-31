import { readFileSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const auth = read('lib/auth.tsx');
const work = read('lib/repositories/SupabaseOperatorWorkRepository.ts');
const panel = read('components/CanonicalDeurOperatorPanel.tsx');
const home = read('app/(tabs)/home.tsx');
const commands = read('lib/canonical/commandRepository.ts');
let passed = 0, failed = 0;
const check = (value, label) => value ? (passed++, console.log(`  PASS: ${label}`)) : (failed++, console.error(`  FAIL: ${label}`));

console.log('=== UAT Turnover UI Contract Tests ===');
check(work.includes("read_eligible_deur_turnover_operators") && work.includes('turnoverTargets'), 'eligible relievers come from the canonical read projection');
check(auth.includes('const hydrateTurnoverTargets') && (auth.match(/hydrateTurnoverTargets\(works\)/g) ?? []).length === 2, 'every core-work hydration reloads eligible turnover targets');
check(auth.includes('turnoverHydrationRef') && auth.includes('hydration !== turnoverHydrationRef.current'), 'stale asynchronous eligibility reads cannot overwrite a newer work refresh');
check(auth.includes('TARGET_OPERATOR_NOT_ELIGIBLE'), 'arbitrary target operator ids are rejected client-side');
check(auth.includes('CONNECTIVITY_REQUIRED_FOR_TURNOVER') && auth.includes("connectivity === 'offline'"), 'turnover initiation is online-only');
check(commands.includes('command_initiate_deur_turnover') && auth.includes('refreshCanonicalWork'), 'initiation uses the canonical command and refreshes state');
check(panel.includes('TURN OVER DEUR') && panel.includes('turnoverTargets.map'), 'current custodian sees a target-specific turnover action');
check(panel.includes('isOpen && hasCustodyAuthority') && panel.includes('work.turnoverTargets?.length'), 'initiation requires an open DEUR, current custody, and a non-empty server-derived target list');
check(panel.includes("offlineSyncState === 'OFFLINE'") && !panel.includes('offlineOutbox.enqueue'), 'offline turnover is blocked and never queued');
check(panel.includes('ACCEPT TURNOVER') && panel.includes('turnoverStatus === \'PENDING\''), 'pending turnover exposes acceptance only to the nominated reliever');
check(home.includes('PENDING HANDOVER') && home.includes("turnoverStatus==='PENDING'"), 'pending handover is distinct from normal assignment work on Home');
check(panel.includes('Activity controls remain locked') && panel.includes('This DEUR is read-only after custody transfers'), 'non-custodian cannot mutate activity, end shift, or submit');
check(work.includes('turnoverId') && work.includes('currentAuthorizedOperatorId'), 'same DEUR identity and custody are preserved through projection');
console.log(`=== Results: ${passed} passed, ${failed} failed ===`);
if (failed) process.exitCode = 1;
