import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const panel = read('components/CanonicalDeurOperatorPanel.tsx');
const repo = read('lib/repositories/SupabaseOperatorWorkRepository.ts');
const contracts = read('lib/canonical/contracts.generated.ts');

const checks = [
  ['meter requirement is read from the existing expectation snapshot', repo.includes('readMeterRequirement') && repo.includes('meterRequirement')],
  ['server meter totals are projected', repo.includes('total_standby_minutes') && repo.includes('total_maintenance_minutes')],
  ['canonical event timestamps are projected', repo.includes('occurred_at') && repo.includes('startedAt') && repo.includes('endedAt')],
  ['closing meter is validated before the terminal command', panel.includes('CLOSING_METER_REQUIRED') && panel.includes('CLOSING_METER_BELOW_OPENING')],
  ['closing meter uses the canonical terminal evidence shape', panel.includes('endCanonicalShift({ closingMeter: value })')],
  ['closing meter input is numeric', panel.includes('keyboardType="numeric"')],
  ['shift summary renders server totals', panel.includes('totalStandbyMinutes') && panel.includes('totalMaintenanceMinutes')],
  ['meter contract is explicit', contracts.includes("CanonicalMeterRequirement = 'none' | 'hourMeter' | 'odometer' | 'both'")],
];
for (const [label, passed] of checks) console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
if (checks.some(([, passed]) => !passed)) process.exit(1);
console.log('Phase-2 recovery checks: PASS');
