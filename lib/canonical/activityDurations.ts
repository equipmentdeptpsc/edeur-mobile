import type { CanonicalDeurEvent } from './contracts.generated';

export type CanonicalActivityDurations = {
  operatingMinutes: number;
  idleMinutes: number;
  standbyMinutes: number;
  mealBreakMinutes: number;
  breakdownMinutes: number;
  shiftMinutes: number;
};

const empty = (): CanonicalActivityDurations => ({ operatingMinutes: 0, idleMinutes: 0, standbyMinutes: 0, mealBreakMinutes: 0, breakdownMinutes: 0, shiftMinutes: 0 });
const keyFor = (activity: CanonicalDeurEvent['activity']): keyof CanonicalActivityDurations | undefined => ({ operation: 'operatingMinutes', idle: 'idleMinutes', standby: 'standbyMinutes', mealBreak: 'mealBreakMinutes', breakdown: 'breakdownMinutes' } as const)[activity as Exclude<CanonicalDeurEvent['activity'], 'shift'>];

/** Presentation-only projection: canonical event timestamps remain the persisted source of truth. */
export function deriveCanonicalActivityDurations(events: CanonicalDeurEvent[] | undefined, now = Date.now()): CanonicalActivityDurations {
  const result = empty();
  if (!events?.length) return result;
  const ordered = [...events].sort((a, b) => a.sequence - b.sequence || new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
  const open = new Map<CanonicalDeurEvent['activity'], number>();
  let shiftStartedAt: number | undefined;
  for (const event of ordered) {
    const at = new Date(event.occurredAt).getTime();
    if (!Number.isFinite(at)) continue;
    if (event.activity === 'shift') {
      if (event.action === 'start' && shiftStartedAt === undefined) shiftStartedAt = at;
      if (event.action === 'end' && shiftStartedAt !== undefined && at >= shiftStartedAt) { result.shiftMinutes += Math.round((at - shiftStartedAt) / 60_000); shiftStartedAt = undefined; }
      continue;
    }
    const key = keyFor(event.activity);
    if (!key) continue;
    if (event.action === 'start') open.set(event.activity, at);
    else {
      const startedAt = open.get(event.activity);
      if (startedAt !== undefined && at >= startedAt) { result[key] += Math.round((at - startedAt) / 60_000); open.delete(event.activity); }
    }
  }
  for (const [activity, startedAt] of open) { const key = keyFor(activity); if (key && now >= startedAt) result[key] += Math.round((now - startedAt) / 60_000); }
  if (shiftStartedAt !== undefined && now >= shiftStartedAt) result.shiftMinutes += Math.round((now - shiftStartedAt) / 60_000);
  return result;
}
