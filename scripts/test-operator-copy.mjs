import { readFileSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const login = read('app/login.tsx');
const home = read('app/(tabs)/home.tsx');
const panel = read('components/CanonicalDeurOperatorPanel.tsx');
const auth = read('lib/auth.tsx');
const commands = read('lib/canonical/commandRepository.ts');

let passed = 0;
let failed = 0;
const check = (condition, label) => {
  if (condition) { passed += 1; console.log(`PASS: ${label}`); }
  else { failed += 1; console.error(`FAIL: ${label}`); }
};

check(login.includes('Operator Login') && !login.includes('Canonical Operator Access'), 'login uses operator-facing wording');
check(home.includes('Current Assignment') && !home.includes('Canonical UAT session'), 'home uses operator-facing wording');
check(panel.includes('Status: {deur.status}') && !panel.includes('Canonical status:'), 'DEUR status label is plain language');
check(panel.includes('After submission, the DEUR will be sent for customer review.') && !panel.includes('trusted Web/backend workflow'), 'submission guidance is operator-facing');
check(panel.includes('Standby — equipment is ready but temporarily not operating.') && !panel.includes('current canonical command has no Standby-reason'), 'standby guidance omits implementation details');
check(panel.includes('DEUR started successfully.') && panel.includes('Shift ended successfully.') && panel.includes('DEUR submitted successfully.'), 'success messages are operational');
check(panel.includes('startCanonicalDeur') && panel.includes('transitionCanonicalActivity') && panel.includes('endCanonicalShift') && panel.includes('submitCanonicalDeur'), 'canonical lifecycle actions remain wired');
check(auth.includes("runCanonical('start'") && auth.includes("runCanonical('submit'"), 'canonical command flow remains unchanged');
check(commands.includes("'command_start_deur_shift'") && commands.includes("'command_submit_deur'"), 'canonical RPC names remain unchanged');

console.log(`Results: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
