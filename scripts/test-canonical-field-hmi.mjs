import { readFileSync } from 'node:fs';

const read = file => readFileSync(file, 'utf8');
const panel = read('components/CanonicalDeurOperatorPanel.tsx');
const details = read('components/CanonicalDeurDetailsSheet.tsx');
let passed = 0;
let failed = 0;
const check = (condition, label) => {
  if (condition) { passed++; console.log(`  PASS: ${label}`); }
  else { failed++; console.error(`  FAIL: ${label}`); }
};

console.log('=== Canonical Field HMI and DEUR Details Tests ===');
check(panel.includes('startCanonicalDeur') && panel.includes('transitionCanonicalActivity') && panel.includes('endCanonicalShift') && panel.includes('submitCanonicalDeur'), 'HMI actions retain canonical handlers');
check(panel.includes('ACTIVITIES') && panel.includes('ActivityButton') && panel.includes('active={active}'), 'all canonical activities use the field HMI control');
check(panel.includes('accessibilityLabel={`Set activity ${label}`}') && panel.includes('accessibilityState'), 'activity controls expose accessible labels and state');
check(panel.includes('accessibilityLabel="Open DEUR details menu"') && panel.includes('CanonicalDeurDetailsSheet'), 'active DEUR exposes an obvious canonical drawer trigger');
check(!panel.includes('Activity timeline') && details.includes('Activity timeline'), 'full timeline moved off the primary HMI into the drawer');
check(panel.includes('Select Idle Reason') && panel.includes("if(label==='Idle'){setShowIdleReasons(true)") && !panel.includes('Optional Idle Reason'), 'Idle Reason controls are contextual rather than permanently rendered');
check(details.includes('DEUR Details') && details.includes('Canonical read-only view') && details.includes('work.equipment.name') && details.includes('work.rental.rentalNumber'), 'details surface uses canonical overview data');
check(details.includes('deriveCanonicalActivityDurations') && details.includes('derived.operatingMinutes') && details.includes('derived.idleMinutes') && details.includes('derived.standbyMinutes') && details.includes('derived.mealBreakMinutes') && details.includes('derived.breakdownMinutes'), 'details surface derives canonical shift totals from event history');
check(details.includes('deur.events') && details.includes('event.occurredAt') && details.includes('actionLabel'), 'timeline uses canonical events and local time');
check(details.includes('openingHourMeter') && details.includes('closingHourMeter') && details.includes('openingOdometer') && details.includes('closingOdometer') && !details.includes('Completion is not yet supported in this beta'), 'dual-meter details expose explicit canonical pairs');
check(details.includes('operationalRemarks') && details.includes('No remarks recorded.') && !details.includes('TextInput'), 'remarks are read-only canonical data');
check(details.includes('turnoverStatus') && details.includes('Pending acceptance') && !details.includes('initiateCanonicalTurnover') && !details.includes('acceptCanonicalTurnover'), 'turnover details are read-only');
check(!panel.includes('mockRepository') && !details.includes('mockRepository') && !panel.includes('localStorage') && !details.includes('localStorage'), 'legacy/local authority is not reintroduced');
check(!details.includes('>{work.assignment.projectId}') && !details.includes('>{work.identity.operatorId}') && !details.includes('>{work.custody.primaryOperatorId}'), 'raw canonical identifiers are not rendered');
check(details.includes('onTravel') && details.includes('onRefuel') && !details.match(/photo|attachment/i), 'restored travel and refuel links remain in the canonical drawer without unsupported attachments');
console.log(`=== Results: ${passed} passed, ${failed} failed ===`);
if (failed) process.exitCode = 1;
