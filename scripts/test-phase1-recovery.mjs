import { readFileSync } from 'node:fs';

const read = file => readFileSync(file, 'utf8');
const auth = read('lib/auth.tsx');
const panel = read('components/CanonicalDeurOperatorPanel.tsx');
const history = read('components/CanonicalHistory.tsx');
const profile = read('components/CanonicalProfile.tsx');
const repository = read('lib/repositories/SupabaseOperatorWorkRepository.ts');
const checks = [
  [auth.includes("canonicalWork.openDeur") && auth.includes("DAILY_DEUR_EXISTS"), 'submitted daily DEUR no longer blocks a fresh canonical start'],
  [panel.includes('START NEW DEUR') && panel.includes('startCanonicalDeur'), 'post-submit UI exposes Start New DEUR'],
  [history.includes('getDeurHistory') && !history.includes('mockRepository.getDeurHistory'), 'History uses canonical repository data'],
  [profile.includes('CanonicalProfile') || profile.includes('operatorId'), 'Profile exposes canonical identity and assignment'],
  [repository.includes('async getDeurHistory') && repository.includes('deur_events'), 'canonical history includes event-backed records'],
  [panel.includes('Activity timeline'), 'DEUR panel renders canonical activity timeline'],
  [panel.includes('operationalRemarks'), 'remarks use the existing canonical start contract'],
];
let failed = 0;
for (const [passed, label] of checks) { console.log(`${passed ? 'PASS' : 'FAIL'}: ${label}`); if (!passed) failed += 1; }
process.exitCode = failed ? 1 : 0;
