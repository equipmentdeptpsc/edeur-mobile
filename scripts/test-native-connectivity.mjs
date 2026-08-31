import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('lib/useConnectivity.ts', 'utf8');
assert.match(source, /const \[status, setStatus\] = useState<ConnectionStatus>\('offline'\)/, 'initial connectivity state is fail-closed');
assert.match(source, /Platform\.OS === 'web' \? undefined : AppState\.addEventListener/, 'native app activation triggers a fresh connectivity probe');
assert.match(source, /setInterval\(\(\) => \{ void checkConnectivity\(\); \}, HEARTBEAT_INTERVAL_MS\)/, 'native and web receive periodic transport probes');
assert.match(source, /probeCanonicalConnectivity\(probeUrl\)/, 'connectivity state uses the configured canonical endpoint');
console.log('PASS native connectivity: fail-closed startup, activation probe, periodic canonical probe');
