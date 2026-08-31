import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function loadContinuationModule() {
  const source = fs.readFileSync('lib/canonical/offlineContinuation.ts', 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const require = (name) => {
    if (name === 'expo-file-system') return { File: class {}, Paths: { document: '' } };
    if (name === 'react-native') return { Platform: { OS: 'web' } };
    throw new Error(`Unexpected runtime import: ${name}`);
  };
  new Function('require', 'module', 'exports', output)(require, module, module.exports);
  return module.exports;
}

class MemoryStore {
  value = null;
  async read() { return this.value; }
  async write(value) { this.value = JSON.parse(JSON.stringify(value)); }
  async clear() { this.value = null; }
}

const { OfflineContinuationRepository, OFFLINE_CONTINUATION_MAX_AGE_MS } = loadContinuationModule();
const authorizationAt = new Date('2026-09-01T00:00:00.000Z');
const work = {
  identity: { authUserId: 'auth-1', applicationUserId: 'app-1', companyId: 'tenant-1', operatorId: 'operator-1', operatorName: 'Offline Operator' },
  assignment: { id: 'assignment-1', projectId: 'project-1', status: 'Active' },
  equipment: { id: 'equipment-1', name: 'Excavator', assetNumber: 'EQ-1' },
  rental: { id: 'rental-1', rentalNumber: 'R-1', status: 'Active' },
  rentalLine: { id: 'line-1', status: 'Active', operationalMetadata: {} },
  openDeur: { id: 'deur-1', deurNumber: 'DEUR-1', workDate: '2026-08-31', status: 'In Progress', operatorId: 'operator-1', rowVersion: 7, activeActivity: 'operation' },
};

const store = new MemoryStore();
const repository = new OfflineContinuationRepository(store);
assert.equal(await repository.save(work, authorizationAt), true, 'online authorization stores a bounded snapshot');
const eligible = await repository.restore(new Date(authorizationAt.getTime() + OFFLINE_CONTINUATION_MAX_AGE_MS - 60_000));
assert.equal(eligible.kind, 'eligible', 'snapshot restores within twelve hours');
assert.equal(eligible.work.openDeur?.rowVersion, 7, 'canonical DEUR version restores');
assert.equal(eligible.work.openDeur?.activeActivity, 'operation', 'canonical activity restores');
assert.equal(eligible.work.openDeur?.workDate, '2026-08-31', 'cross-date work identity remains immutable');
assert.equal(eligible.snapshot.lastSuccessfulOnlineAuthorizationAt, authorizationAt.toISOString(), 'restart does not reset authorization time');

const expired = await repository.restore(new Date(authorizationAt.getTime() + OFFLINE_CONTINUATION_MAX_AGE_MS + 1));
assert.equal(expired.kind, 'expired', 'snapshot becomes read-only after twelve hours');
assert.equal(expired.work.openDeur?.id, 'deur-1', 'expired snapshot remains readable');

store.value = { schemaVersion: 999 };
assert.equal((await repository.restore()).kind, 'invalid', 'old or malformed snapshot fails closed');
assert.equal(await repository.save({ ...work, openDeur: undefined }, authorizationAt), false, 'no open DEUR never grants continuation');

console.log('PASS offline continuation: online snapshot, restart restore, expiry, immutable work date, malformed fail-closed');
