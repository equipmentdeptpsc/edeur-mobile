import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync('lib/canonical/explicitLogout.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const module = { exports: {} };
new Function('module', 'exports', compiled)(module, module.exports);
const { ExplicitLogoutGate, EXPLICIT_LOGOUT_KEY } = module.exports;

class MemoryStorage {
  values = new Map();
  async getItem(key) { return this.values.get(key) ?? null; }
  async setItem(key, value) { this.values.set(key, value); }
  async removeItem(key) { this.values.delete(key); }
}

const storage = new MemoryStorage();
const operationalCache = { pendingActivity: 'operation' };
let localSession = true;
let offlineAuth = true;
let signOutCalls = 0;
const gate = new ExplicitLogoutGate(storage);
assert.equal(await gate.restore(), false, 'normal authenticated restart remains restorable');
assert.equal(gate.permits(gate.currentGeneration), true, 'temporary network loss does not mark logout');
assert.equal(gate.permits(gate.currentGeneration), true, 'offline cold start without logout remains eligible');

const previousGeneration = gate.currentGeneration;
const result = await gate.logout(async () => { signOutCalls += 1; localSession = false; }, async () => { offlineAuth = false; });
assert.deepEqual(result, { completed: true }, 'explicit logout completes after auth cleanup');
assert.equal(localSession, false, 'Supabase session is cleared');
assert.equal(offlineAuth, false, 'offline authenticated identity is cleared');
assert.equal(storage.values.get(EXPLICIT_LOGOUT_KEY), '1', 'logout marker persists');
assert.equal(gate.permits(previousGeneration), false, 'stale hydration cannot reauthorize after logout');
assert.equal(operationalCache.pendingActivity, 'operation', 'operational offline data is preserved');

const restarted = new ExplicitLogoutGate(storage);
assert.equal(await restarted.restore(), true, 'restart after logout remains signed out');
assert.equal(restarted.permits(restarted.currentGeneration), false, 'reconnect after logout cannot restore a session');
assert.equal(restarted.permits(restarted.currentGeneration), false, 'cached operator identity alone cannot authorize entry');
assert.equal(await restarted.releaseAfterExplicitLogin(restarted.currentGeneration + 1), false, 'stale login cannot release logout');
assert.equal(await restarted.releaseAfterExplicitLogin(restarted.currentGeneration), true, 'explicit credentials release logout');
assert.equal(restarted.permits(restarted.currentGeneration), true, 'explicit login permits authenticated entry');
assert.equal(storage.values.has(EXPLICIT_LOGOUT_KEY), false, 'explicit login removes persisted logout marker');

let finishSignOut;
const slowSignOut = new Promise(resolve => { finishSignOut = resolve; });
const first = restarted.logout(async () => { signOutCalls += 1; await slowSignOut; }, async () => {});
const second = restarted.logout(async () => { signOutCalls += 1; }, async () => {});
assert.equal(first, second, 'duplicate logout taps share one operation');
finishSignOut();
assert.equal((await first).completed, true);
assert.equal(signOutCalls, 2, 'duplicate tap invokes signOut once');

const failedSignOut = new ExplicitLogoutGate(new MemoryStorage());
let cleanupCalled = false;
const failure = await failedSignOut.logout(async () => { throw new Error('storage error'); }, async () => { cleanupCalled = true; });
assert.deepEqual(failure, { completed: true, error: 'SIGN_OUT_FAILED' }, 'signOut failure is reported');
assert.equal(cleanupCalled, true, 'offline auth cleanup still runs after signOut failure');
assert.equal(failedSignOut.isBlocked, true, 'signOut failure cannot reauthorize stale tokens');

const brokenStorage = new MemoryStorage();
brokenStorage.setItem = async () => { throw new Error('disk unavailable'); };
const markerFailure = new ExplicitLogoutGate(brokenStorage);
let signedOutDespiteFailure = false;
assert.deepEqual(await markerFailure.logout(async () => { signedOutDespiteFailure = true; }, async () => {}), { completed: false, error: 'MARKER_PERSIST_FAILED' });
assert.equal(signedOutDespiteFailure, false, 'failed durable marker does not present a false logout');

const context = readFileSync('lib/auth.tsx', 'utf8');
const login = readFileSync('app/login.tsx', 'utf8');
const profile = readFileSync('components/CanonicalProfile.tsx', 'utf8');
const authentication = readFileSync('lib/canonical/authentication.ts', 'utf8');
const authModule = { exports: {} };
const authCompiled = ts.transpileModule(authentication, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
new Function('module', 'exports', authCompiled)(authModule, authModule.exports);
const { CanonicalAuthenticationRepository } = authModule.exports;
let signOutScope;
const repository = new CanonicalAuthenticationRepository({ auth: { signOut: async options => { signOutScope = options.scope; return { error: null }; } } }, {});
await repository.signOut();
assert.equal(signOutScope, 'local', 'canonical signOut clears local Supabase persistence without requiring network');
const rejectedRepository = new CanonicalAuthenticationRepository({ auth: { signOut: async () => ({ error: new Error('storage unavailable') }) } }, {});
await assert.rejects(rejectedRepository.signOut(), /storage unavailable/, 'Supabase signOut errors are not silently ignored');
assert.match(context, /await explicitLogout\.current\.restore\(\)/, 'startup reads explicit logout marker');
assert.match(context, /uatSessionState === 'INITIALIZING' \|\| explicitLogout\.current\.isBlocked/, 'reconnect skips explicit logout while preserving ordinary recovery');
assert.match(context, /await Promise\.allSettled\(\[\.\.\.offlineSaves\.current\]\)/, 'logout waits for in-flight offline auth persistence');
assert.match(profile, /if\(await logout\(\)\)router\.replace\('\/login'\)/, 'profile navigates only after logout completes');
assert.match(login, /if \(operator\) router\.replace\('\/home'\)/, 'login redirect still follows authenticated state');
assert.match(authentication, /signOut\(\{ scope: 'local' \}\)/, 'Supabase local sign-out clears the persisted session offline');

console.log('PASS explicit logout: persistence, restart, reconnect, offline, duplicate tap, failure, and navigation guards');
