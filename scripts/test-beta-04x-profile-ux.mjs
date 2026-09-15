import fs from 'node:fs';
import path from 'node:path';

const profile = fs.readFileSync(path.join(process.cwd(), 'components/CanonicalProfile.tsx'), 'utf8');
const lifecycle = fs.readFileSync(path.join(process.cwd(), 'lib/canonical/deurLifecycle.ts'), 'utf8');
const auth = fs.readFileSync(path.join(process.cwd(), 'lib/auth.tsx'), 'utf8');

const checks = [
  ['canonical profile does not render application or operator UUIDs', !profile.includes('{operator.applicationUserId}') && !profile.includes('{operator.operatorId}')],
  ['profile renders an operator role and useful assignment context', profile.includes('>Operator<') && profile.includes('CURRENT ASSIGNMENT') && profile.includes('work.equipment.assetNumber')],
  ['opaque fallback login identifiers are hidden', profile.includes('isOpaqueIdentifier') && profile.includes('!isOpaqueIdentifier(sessionOperator.loginName)')],
  ['profile uses compact card layout', profile.includes('compactCard') && profile.includes('paddingVertical: 10')],
  ['mobile operational-open lifecycle is Draft or In Progress only', lifecycle.includes("status === 'Draft' || status === 'In Progress'")],
  ['Start New DEUR is guarded by the mobile open-DEUR projection', auth.includes('canonicalWork.openDeur') && auth.includes('PRIOR_OPEN_DEUR')],
];

for (const [label, passed] of checks) console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
if (checks.some(([, passed]) => !passed)) process.exit(1);
console.log('Beta 04X Profile UX checks: PASS');
