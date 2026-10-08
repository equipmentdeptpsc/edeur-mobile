import assert from 'node:assert/strict';
import { deriveCanonicalActivityDurations } from '../lib/canonical/activityDurations.ts';

const event = (activity, action, occurredAt, sequence) => ({ id: `${sequence}`, activity, action, occurredAt, sequence });
const schedule = [
  event('shift', 'start', '2026-09-25T08:00:00Z', 1), event('operation', 'start', '2026-09-25T08:00:00Z', 2),
  event('operation', 'end', '2026-09-25T10:30:00Z', 3), event('idle', 'start', '2026-09-25T10:30:00Z', 4),
  event('idle', 'end', '2026-09-25T10:45:00Z', 5), event('operation', 'start', '2026-09-25T10:45:00Z', 6),
  event('operation', 'end', '2026-09-25T12:00:00Z', 7), event('mealBreak', 'start', '2026-09-25T12:00:00Z', 8),
  event('mealBreak', 'end', '2026-09-25T13:00:00Z', 9), event('operation', 'start', '2026-09-25T13:00:00Z', 10),
  event('operation', 'end', '2026-09-25T16:00:00Z', 11), event('shift', 'end', '2026-09-25T16:00:00Z', 12),
];
assert.deepEqual(deriveCanonicalActivityDurations(schedule, Date.parse('2026-09-25T16:00:00Z')), { operatingMinutes: 405, idleMinutes: 15, standbyMinutes: 0, mealBreakMinutes: 60, breakdownMinutes: 0, shiftMinutes: 480 });
assert.equal(deriveCanonicalActivityDurations([event('operation', 'start', '2026-09-25T23:30:00Z', 1)], Date.parse('2026-09-26T00:15:00Z')).operatingMinutes, 45);
assert.equal(deriveCanonicalActivityDurations([event('operation', 'end', '2026-09-25T10:00:00Z', 1)]).operatingMinutes, 0);
console.log('PASS canonical activity duration derivation: deterministic schedule, open interval, midnight, and malformed fallback');
