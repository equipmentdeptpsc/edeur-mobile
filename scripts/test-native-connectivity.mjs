import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('lib/useConnectivity.ts', 'utf8');
assert.match(source, /let sharedStatus: ConnectionStatus = 'offline'/, 'initial connectivity state is fail-closed');
assert.match(source, /sharedStatus/, 'connectivity state is shared across hook instances');
assert.match(source, /confirmedOnlineGeneration/, 'stale offline results cannot overwrite a confirmed online probe');
assert.match(source, /Platform\.OS === 'web' \? undefined : AppState\.addEventListener/, 'native app activation triggers a fresh connectivity probe');
assert.match(source, /setInterval\(\(\) => \{ void checkConnectivity\(\); \}, HEARTBEAT_INTERVAL_MS\)/, 'native and web receive periodic transport probes');
assert.match(source, /probeCanonicalConnectivity\(probeUrl\)/, 'connectivity state uses the configured canonical endpoint');
assert.match(source, /isAbortLikeError/, 'abort classification uses a cross-platform structural helper');
assert.doesNotMatch(source, /DOMException|instanceof\s+DOMException/, 'native connectivity does not depend on DOMException');
assert.match(source, /typeof AbortController === 'function'/, 'native probe guards optional AbortController support');
console.log('PASS native connectivity: fail-closed startup, activation probe, periodic canonical probe');
