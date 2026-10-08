import { readFileSync } from 'node:fs';

const read = file => readFileSync(file, 'utf8');
const repository = read('lib/repositories/SupabaseOperatorWorkRepository.ts');
const auth = read('lib/auth.tsx');
const home = read('app/(tabs)/home.tsx');
const profile = read('components/CanonicalProfile.tsx');
const panel = read('components/CanonicalDeurOperatorPanel.tsx');
let passed = 0;
let failed = 0;
const check = (condition, label) => {
  if (condition) { passed++; console.log(`  PASS: ${label}`); }
  else { failed++; console.error(`  FAIL: ${label}`); }
};

console.log('=== Assignment Visibility and Refresh Tests ===');
check(repository.includes("rpc('read_current_operator_assignments')"), 'current assignments come from the role-safe server projection');
check(repository.includes('deurEligible:value.deurEligible===true'), 'DEUR eligibility remains separate from assignment visibility');
check(home.includes('CURRENT ASSIGNMENT') && home.includes('work.assignment.projectName') && home.includes('work.rental.status'), 'Home renders assignment, project, and lifecycle state');
check(profile.includes('CURRENT ASSIGNMENT') && profile.includes('work.assignment.projectName') && profile.includes('work.rental.status'), 'Profile renders assignment, project, and lifecycle state');
check(home.includes('DEUR becomes available when the rental is activated.') && panel.includes('DEUR becomes available when the rental is activated.'), 'preactivation work explains the Active-only DEUR gate');
check(auth.includes("if (work.deurEligible !== true) return failure('RENTAL_NOT_ACTIVE')"), 'mobile command path fails closed before DEUR start');
check(home.includes("Current offline data remains available.") && profile.includes("Current offline data remains available."), 'refresh failure is offline safe and visible');
check(home.includes('disabled={refreshing}') && profile.includes('disabled={refreshing}'), 'refresh actions suppress duplicate taps');
check(repository.includes("select('total_operating_minutes") && repository.includes('acknowledged_at') && repository.includes("acknowledgementStatus:'Acknowledged'"), 'canonical refresh projects acknowledgment state');
check(repository.includes("const daily=rows.find(row=>text(row,'work_date')===today)"), 'submitted and acknowledged daily DEUR states survive refresh');
check(panel.includes('work.assignment.operatorDisplayName') && panel.includes('work.custody'), 'Assignment Operator and turnover custody remain distinct');
console.log(`=== Results: ${passed} passed, ${failed} failed ===`);
if (failed) process.exitCode = 1;
