import type { CanonicalOperatorWork } from './contracts.generated';
import type { CanonicalEnvironment } from './environment';

export type Scenario8TerminalCommand = 'END_SHIFT' | 'SUBMIT';

export type Scenario8HarnessState = {
  enabled: boolean;
  endShift: 'NOT_CAPTURED' | 'CAPTURED' | 'REPLAYED' | 'BLOCKED';
  submit: 'NOT_CAPTURED' | 'CAPTURED' | 'REPLAYED' | 'BLOCKED';
};

type Captured = { payload: Record<string, unknown>; authUserId: string; targetDeurId: string; used: boolean };

const FIXED = {
  mode: 'UAT' as const,
  projectRef: 'jtkctarqbwmqdcewthkn',
  operatorId: '42120275-248a-453a-8c7f-1c471221a0d3',
  rentalLineId: '7577e0c0-ce2e-4fc6-9e1b-358729f03e73',
  assignmentId: '9c8e8c25-bd59-4cb4-9ef7-62edbe15d413',
  workDate: '2026-09-03',
} as const;

function copy<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }

export function isScenario8ReplayEligible(environment: CanonicalEnvironment, work: CanonicalOperatorWork | null | undefined): boolean {
  const deur = work?.openDeur ?? work?.dailyDeur;
  return environment.mode === FIXED.mode && environment.projectRef === FIXED.projectRef
    && work?.identity.operatorId === FIXED.operatorId
    && work.rentalLine.id === FIXED.rentalLineId
    && work.assignment.id === FIXED.assignmentId
    && deur?.workDate === FIXED.workDate;
}

export class Scenario8ReplayHarness {
  private readonly captured = new Map<Scenario8TerminalCommand, Captured>();

  state(environment: CanonicalEnvironment, work: CanonicalOperatorWork | null | undefined): Scenario8HarnessState {
    const enabled = isScenario8ReplayEligible(environment, work);
    const phase = (type: Scenario8TerminalCommand): Scenario8HarnessState['endShift'] => {
      const record = this.captured.get(type);
      if (!enabled) return record ? 'BLOCKED' : 'NOT_CAPTURED';
      return !record ? 'NOT_CAPTURED' : record.used ? 'REPLAYED' : 'CAPTURED';
    };
    return { enabled, endShift: phase('END_SHIFT'), submit: phase('SUBMIT') };
  }

  capture(type: Scenario8TerminalCommand, environment: CanonicalEnvironment, work: CanonicalOperatorWork, payload: Record<string, unknown>): boolean {
    if (!isScenario8ReplayEligible(environment, work) || this.captured.has(type)) return false;
    const deur = work.openDeur;
    if (!deur || payload.deurId !== deur.id || payload.operatorId !== work.identity.operatorId
      || payload.rentalLineId !== work.rentalLine.id || payload.assignmentId !== work.assignment.id) return false;
    this.captured.set(type, { payload: copy(payload), authUserId: work.identity.authUserId, targetDeurId: deur.id, used: false });
    return true;
  }

  async replay(type: Scenario8TerminalCommand, environment: CanonicalEnvironment, work: CanonicalOperatorWork, execute: (payload: Record<string, unknown>) => Promise<{ success: boolean; disposition?: string }>): Promise<{ success: boolean; code?: string }> {
    const record = this.captured.get(type);
    const deur = work.openDeur ?? work.dailyDeur;
    if (!record || record.used || !deur || record.targetDeurId !== deur.id || !isScenario8ReplayEligible(environment, work) || record.authUserId !== work.identity.authUserId) return { success: false, code: 'SCENARIO8_REPLAY_BLOCKED' };
    record.used = true;
    const result = await execute(copy(record.payload));
    return result.success && result.disposition === 'REPLAYED' ? { success: true } : { success: false, code: result.success ? 'SCENARIO8_REPLAY_NOT_REPLAYED' : 'SCENARIO8_REPLAY_REJECTED' };
  }

  clear(): void { this.captured.clear(); }
  discard(type: Scenario8TerminalCommand): void { this.captured.delete(type); }
}
