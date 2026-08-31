// GENERATED CONTRACT — DO NOT ADD BUSINESS LOGIC.
// Source: EquipmentRentalSystem `uat/MOBILE-CANONICAL-CONTRACT.md`
// Source version: 2026-08-28.phase1

export type MobileRuntimeMode = 'DEMO' | 'UAT';
export type CanonicalActivity = 'operation' | 'idle' | 'standby' | 'mealBreak' | 'breakdown';

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
}

export interface CanonicalOperatorWork {
  identity: CanonicalSessionIdentity;
  assignment: { id: string; projectId: string; status: string };
  equipment: { id: string; name: string; assetNumber: string; currentReading?: number };
  rental: { id: string; rentalNumber: string; status: string; billingMethod?: string };
  rentalLine: { id: string; status: string; operationalMetadata: Record<string, unknown> };
  custody?: { primaryOperatorId: string; currentAuthorizedOperatorId: string; turnoverId?: string; turnoverToOperatorId?: string; turnoverStatus: 'PENDING' | 'ACCEPTED' };
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
