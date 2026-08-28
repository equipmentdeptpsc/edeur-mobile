import type { CanonicalActivity } from './contracts.generated';

export type CanonicalMobileActivity = 'Operating' | 'Idle' | 'Standby' | 'Meal Break' | 'Breakdown';

export function mapMobileActivity(activity: CanonicalMobileActivity): CanonicalActivity {
  if (activity === 'Operating') return 'operation';
  if (activity === 'Idle') return 'idle';
  if (activity === 'Standby') return 'standby';
  if (activity === 'Breakdown') return 'breakdown';
  if (activity === 'Meal Break') return 'mealBreak';
  throw new Error('Unsupported canonical Mobile activity.');
}
