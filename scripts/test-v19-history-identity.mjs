import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const read = path => readFileSync(path, 'utf8');
const auth = read('lib/auth.tsx');
const client = read('lib/canonical/client.ts');
const authentication = read('lib/canonical/authentication.ts');
const repository = read('lib/repositories/SupabaseOperatorWorkRepository.ts');
const home = read('app/(tabs)/home.tsx');
const jsx = (type, props) => ({ type, props: props ?? {} });
const hooks = { values: [], cursor: 0, effects: [] };
const react = {
  useState(initial) {
    const slot = hooks.cursor++;
    if (!(slot in hooks.values)) hooks.values[slot] = initial;
    return [hooks.values[slot], value => {
      hooks.values[slot] = typeof value === 'function' ? value(hooks.values[slot]) : value;
    }];
  },
  useCallback: callback => callback,
  useEffect: effect => { hooks.effects.push(effect); },
};
const identity = { authUserId: 'auth-user', applicationUserId: 'app-user', companyId: 'uat-company', operatorId: 'uat-operator', operatorName: 'UAT Operator' };
const submitted = { id: 'deur-id', deurNumber: 'DEUR-2026-000025', workDate: '2026-10-04', status: 'Submitted', equipmentName: 'Equipment', assetNumber: 'ASSET-1', rentalNumber: 'RENTAL-1' };
let historyCalls = [];
let authState = { operator: { id: identity.operatorId }, mode: 'UAT', canonicalIdentity: identity, canonicalWork: null };
const colors = new Proxy({}, { get: () => '#000' });
const mocks = {
  react,
  'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
  'react-native': { StyleSheet: { create: value => value }, ScrollView: 'ScrollView', View: 'View', Text: 'Text', TextInput: 'TextInput', TouchableOpacity: 'TouchableOpacity', RefreshControl: 'RefreshControl' },
  'expo-router': { useRouter: () => ({ push() {} }) },
  'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
  'lucide-react-native': new Proxy({}, { get: (_, name) => name }),
  '@/lib/theme': { fonts: {}, radius: {}, spacing: { lg: 1, md: 1, xxxl: 1 } },
  '@/lib/useTheme': { useTheme: () => ({ colors }) },
  '@/lib/auth': { useAuth: () => authState },
  '@/lib/mockRepository': { mockRepository: { getDeurHistory: () => { throw new Error('Demo history must not run in UAT'); } } },
  '@/components/Card': { Card: 'Card' },
  './Card': { Card: 'Card' },
  '@/components/StatusChip': { StatusChip: 'StatusChip' },
  './StatusChip': { StatusChip: 'StatusChip' },
  '@/components/EmptyState': { EmptyState: 'EmptyState' },
  './EmptyState': { EmptyState: 'EmptyState' },
  '@/lib/utils': {},
  '@/lib/canonical/runtime': { mobileRuntime: { workRepository: { getDeurHistory: async supplied => { historyCalls.push(supplied); return [submitted]; } } } },
};
function loadComponent(path, aliases) {
  const source = ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, require: name => {
    if (name in aliases) return aliases[name];
    throw new Error('Unmocked import: ' + name);
  }, setTimeout, console }, { filename: path });
  return exports;
}
const { CanonicalHistory } = loadComponent('components/CanonicalHistory.tsx', mocks);
mocks['@/components/CanonicalHistory'] = { CanonicalHistory };
const { default: HistoryScreen } = loadComponent('app/(tabs)/history.tsx', mocks);
function render(component, props) {
  hooks.cursor = 0;
  hooks.effects = [];
  const tree = component(props);
  for (const effect of hooks.effects) effect();
  return tree;
}
function find(tree, predicate) {
  if (tree == null || typeof tree !== 'object') return null;
  if (predicate(tree)) return tree;
  for (const child of Object.values(tree.props ?? {})) {
    for (const value of Array.isArray(child) ? child : [child]) {
      const found = find(value, predicate);
      if (found) return found;
    }
  }
  return null;
}
for (const count of [0, 2]) {
  authState = { ...authState, canonicalWork: null, canonicalWorks: Array.from({ length: count }, (_, index) => ({ rentalLine: { id: String(index) } })) };
  hooks.values = [];
  const screen = render(HistoryScreen);
  const history = find(screen, node => node.type === CanonicalHistory);
  assert.ok(history, count + ' current works must not block History');
  assert.equal(history.props.identity, identity);
  hooks.values = [];
  render(CanonicalHistory, history.props);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(historyCalls.at(-1), identity, 'History queries with restored session identity');
  const loaded = render(CanonicalHistory, history.props);
  assert.ok(find(loaded, node => node.type === 'Text' && node.props.children === 'DEUR-2026-000025'), 'submitted DEUR renders');
  assert.ok(find(loaded, node => node.type === 'StatusChip' && node.props.label === 'SUBMITTED'), 'submitted status renders');
}
authState = { ...authState, operator: null, canonicalIdentity: null };
hooks.values = [];
assert.equal(render(HistoryScreen), null, 'logout hides History');
assert.match(auth, /setCanonicalIdentity\(authenticated\.identity\)[\s\S]*setCanonicalWork\(work\)/, 'identity survives null current work');
assert.match(auth, /setCanonicalIdentity\(work\.identity\)/, 'offline restore also sets identity');
assert.match(auth, /const finishSignedOut[\s\S]*?setCanonicalIdentity\(null\)/, 'signed-out path clears identity');
assert.match(auth, /const logout[\s\S]*?setCanonicalIdentity\(null\)/, 'logout clears identity');
assert.match(auth, /restoreSession\(\)[\s\S]*applyCanonicalSession\(session, generation\)/, 'persisted session feeds identity restore');
assert.match(authentication, /INITIAL_SESSION[\s\S]*resolveIdentity\(authUserId/, 'session restoration resolves canonical identity');
assert.match(client, /storage: AsyncStorage, persistSession: true/, 'Android session remains persisted');
assert.match(repository, /async getDeurHistory\(identity:CanonicalSessionIdentity\)[\s\S]*?\.eq\('operator_id',identity\.operatorId\)/, 'history remains operator scoped');
assert.match(home, /work=\{canonicalWork\}/, 'Home retains current-work selection');
console.log('PASS History identity: zero and multiple current works query and render submitted DEUR; restore, logout, scoping, and Home contracts');
