// GENERATED CONTRACT — DO NOT ADD BUSINESS LOGIC.
// Source: EquipmentRentalSystem `uat/MOBILE-CANONICAL-CONTRACT.md`
// Source version: 2026-08-28.phase1

export type MobileRuntimeMode = 'DEMO' | 'UAT';
export type CanonicalActivity = 'operation' | 'idle' | 'standby' | 'mealBreak' | 'breakdown';
export type CanonicalMeterRequirement = 'none' | 'hourMeter' | 'odometer' | 'both';

export interface CanonicalSessionIdentity {
  authUserId: string;
  applicationUserId: string;
  companyId: string;
  operatorId: string;
  operatorName: string;
}

export interface CanonicalOpenDeur {
  id: string;
  deurNumber: string;
  workDate: string;
  status: string;
  rowVersion: number;
  operatorId: string;
  shift?: string;
  activeActivity?: CanonicalActivity;
  totalOperatingMinutes?: number;
  totalIdleMinutes?: number;
  totalMaintenanceMinutes?: number;
  totalMealBreakMinutes?: number;
  totalStandbyMinutes?: number;
  openingMeter?: number;
  closingMeter?: number;
  meterRequirement?: CanonicalMeterRequirement;
  openingHourMeter?: number;
  closingHourMeter?: number;
  openingOdometer?: number;
  closingOdometer?: number;
  legacyMeterEvidenceState?: string;
  operationalRemarks?: string;
  submittedAt?: string;
  acknowledgedAt?: string;
  acknowledgementStatus?: string;
  events?: CanonicalDeurEvent[];
  startedAt?: string;
  endedAt?: string;
}

export interface CanonicalMeterEvidence {
  openingHourMeter?: number;
  closingHourMeter?: number;
  openingOdometer?: number;
  closingOdometer?: number;
}

export interface CanonicalDeurEvent {
  id: string;
  activity: CanonicalActivity | 'shift';
  action: 'start' | 'end';
  occurredAt: string;
  sequence: number;
}

export interface CanonicalDeurHistoryRecord extends CanonicalOpenDeur {
  equipmentName: string;
  assetNumber: string;
  rentalNumber: string;
}

export interface CanonicalOperatorWork {
  identity: CanonicalSessionIdentity;
  assignment: { id: string; projectId: string; projectName?: string; status: string; operatorDisplayName?: string };
  equipment: { id: string; name: string; assetNumber: string; currentReading?: number };
  rental: { id: string; rentalNumber: string; status: string; billingMethod?: string };
  rentalLine: { id: string; status: string; operationalMetadata: Record<string, unknown> };
  deurEligible?: boolean;
  deurEligibility?: { kind: 'PENDING_RETURN_DAY'; workDate: string; state: 'PENDING' | 'IN_PROGRESS' };
  meterRequirement?: CanonicalMeterRequirement;
  custody?: { primaryOperatorId: string; primaryOperatorDisplayName?: string; currentAuthorizedOperatorId: string; currentAuthorizedOperatorDisplayName?: string; turnoverId?: string; turnoverToOperatorId?: string; turnoverStatus: 'PENDING' | 'ACCEPTED' };
  openDeur?: CanonicalOpenDeur;
  dailyDeur?: CanonicalOpenDeur;
  turnoverTargets?: CanonicalTurnoverOperator[];
}

export interface CanonicalTurnoverOperator {
  operatorId: string;
  displayName: string;
  status: string;
}

export interface CanonicalCommandIdentity {
  commandId: string;
  idempotencyKey: string;
  rentalId: string;
  rentalLineId: string;
  equipmentId: string;
  operatorId: string;
  assignmentId: string;
  clientCreatedAt: string;
  deviceId?: string;
}

export interface CanonicalCommandSuccess {
  success: true;
  disposition: 'ACCEPTED' | 'REPLAYED';
  record: CanonicalOpenDeur & Record<string, unknown>;
  version: number;
  serverOccurredAt: string;
}

export interface CanonicalCommandFailure {
  success: false;
  code: string;
  retryable?: boolean;
  refreshRequired?: boolean;
}

export type CanonicalCommandResult = CanonicalCommandSuccess | CanonicalCommandFailure;
