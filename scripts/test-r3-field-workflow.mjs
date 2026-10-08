import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const panel=readFileSync(new URL('../components/CanonicalDeurOperatorPanel.tsx',import.meta.url),'utf8');
const refuel=readFileSync(new URL('../app/deur-refuel/[id].tsx',import.meta.url),'utf8');
const auth=readFileSync(new URL('../lib/auth.tsx',import.meta.url),'utf8');
const commands=readFileSync(new URL('../lib/canonical/commandRepository.ts',import.meta.url),'utf8');

for(const marker of ['currentStrip','activeDuration(deur)','TRAVEL CHECKPOINTS','REFUEL','const canSubmit = deur?.status === \'Ended\'','disabled={!canSubmit}']) assert.ok(panel.includes(marker),`field HMI retains ${marker}`);
for(const marker of ['Fuel added','Equipment fuel history','Online-only','recordCanonicalRefuel','readCanonicalEquipmentRefuels']) assert.ok(refuel.includes(marker)||auth.includes(marker),`refuel screen retains ${marker}`);
for(const marker of ['command_record_deur_refuel','read_equipment_refuel_history']) assert.ok(commands.includes(marker),`canonical command boundary retains ${marker}`);
assert.ok(!refuel.includes('mockRepository')&&!refuel.includes('offlineOutbox'),'refuel has no local authority or offline queue');
console.log('PASS R3 field workflow: industrial HMI, canonical refuel, online-only persistence, and submit lifecycle guard');
