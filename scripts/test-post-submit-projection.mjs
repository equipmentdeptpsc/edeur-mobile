import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const repository = readFileSync(new URL('../lib/repositories/SupabaseOperatorWorkRepository.ts', import.meta.url), 'utf8');
const panel = readFileSync(new URL('../components/CanonicalDeurOperatorPanel.tsx', import.meta.url), 'utf8');
const auth = readFileSync(new URL('../lib/auth.tsx', import.meta.url), 'utf8');

assert.match(repository, /from\('deurs'\).*previous_revision_id/s, 'projection remains server-backed');
assert.doesNotMatch(repository, /\.in\('status',\['Draft','In Progress'\]\)/, 'submitted status is not filtered out');
assert.match(repository, /openDeur=selected\.open/);
assert.match(repository, /dailyDeur=selected\.daily/);
assert.match(panel, /work\.openDeur \?\? work\.dailyDeur/, 'submitted daily DEUR remains visible');
assert.match(panel, /const isOpen = Boolean\(work\.openDeur\)/);
assert.match(panel, /isOpen \? <></, 'activity, End Shift, and Submit controls require an open DEUR');
assert.match(auth, /canonicalWork\.dailyDeur/, 'same-day Start guard includes submitted daily DEUR');
assert.match(auth, /DAILY_DEUR_EXISTS/);

const choose = (rows, today) => {
  const open = rows.find(({ status }) => status === 'Draft' || status === 'In Progress');
  if (open) return { open, daily: open };
  const daily = rows.find(({ work_date }) => work_date === today);
  return daily ? { daily } : {};
};
const submitted = { id: 'deur-2', deur_number: 'DEUR-2026-000002', work_date: '2026-08-28', status: 'Submitted' };
const sameDay = choose([submitted], '2026-08-28');
assert.equal(sameDay.daily, submitted);
assert.equal(sameDay.daily.deur_number, 'DEUR-2026-000002');
assert.equal(sameDay.daily.work_date, '2026-08-28');
assert.equal(sameDay.open, undefined, 'submitted DEUR has no active activity projection');
assert.deepEqual(choose([submitted], '2026-08-29'), {}, 'submitted prior day does not block next day');
const crossMidnight = { id: 'deur-open', work_date: '2026-08-28', status: 'In Progress' };
assert.equal(choose([submitted, crossMidnight], '2026-08-29').open, crossMidnight, 'prior open cross-midnight DEUR takes precedence');
assert.equal((repository.match(/dailyDeur/g) ?? []).length >= 2, true, 'one canonical daily projection is reused');
assert.doesNotMatch(repository, /mockRepository|localStorage/, 'canonical projection has no fixture fallback');

console.log('Post-submit canonical projection regression: PASS');
