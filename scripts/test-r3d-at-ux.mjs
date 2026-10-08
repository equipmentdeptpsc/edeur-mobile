import fs from 'node:fs';

const panel = fs.readFileSync('components/CanonicalDeurOperatorPanel.tsx', 'utf8');
const details = fs.readFileSync('components/CanonicalDeurDetailsSheet.tsx', 'utf8');
const auth = fs.readFileSync('lib/auth.tsx', 'utf8');

const checks = [
  ['active Meter review card removed', !panel.includes('>Meter review</')],
  ['closing inputs are modal-only', panel.includes('showEndShiftSheet') && panel.includes('Modal visible={showEndShiftSheet}') && !panel.includes('Closing readings are required by the canonical rental expectation')],
  ['manual hour-meter fields are absent', !panel.includes('Opening hour meter') && !panel.includes('Closing hour meter')],
  ['automatic activity projection is used', panel.includes('deriveCanonicalActivityDurations') && panel.includes('Activity time is derived from canonical timestamps')],
  ['odometer-capable policy is explicit', panel.includes("work.meterRequirement === 'odometer' || work.meterRequirement === 'both'")],
  ['derived read-only totals shown', panel.includes('Activity totals are derived from canonical timestamps') && panel.includes('Metric label="Operating"') && panel.includes('Metric label="Idle"')],
  ['submit guard retained', panel.includes("deur?.status === 'Ended'") && panel.includes("uatSessionState === 'ONLINE_AUTHENTICATED'")],
  ['details shift and meter evidence retained', details.includes('Section title="Shift summary"') && details.includes('Section title="Meter"')],
  ['travel custody scope retained', ['rentalId:work.rental.id', 'rentalLineId:work.rentalLine.id', 'equipmentId:work.equipment.id', 'assignmentId:work.assignment.id'].every(value => auth.includes(value))],
  ['refuel path retained', auth.includes('recordRefuel')],
];
for (const [label, ok] of checks) {
  if (!ok) throw new Error(`FAIL: ${label}`);
  console.log(`PASS: ${label}`);
}
console.log(`R3D-AT UX checks ${checks.length}/${checks.length} passed`);
