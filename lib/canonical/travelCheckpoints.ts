export type CanonicalTravelCheckpoint = {
  checkpointId: string;
  sequence: number;
  displayLabel?: string;
  odometer: number;
  clientOccurredAt?: string;
  serverAcceptedAt: string;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  distanceFromPrevious?: number;
  custodianOperatorId?: string;
  source: string;
};

export type TravelCheckpointResult =
  | { success: true; checkpoint?: CanonicalTravelCheckpoint; version?: number; disposition?: 'ACCEPTED' | 'REPLAYED' }
  | { success: false; code: string; retryable?: boolean; refreshRequired?: boolean };

export type TravelCheckpointCommandInput = {
  commandId: string;
  idempotencyKey: string;
  deurId: string;
  operatorId: string;
  expectedVersion: number;
  odometer: number;
  clientOccurredAt: string;
  locationName?: string;
  latitude?: number;
  longitude?: number;
};

export function isCanonicalTravelPolicy(value: string | undefined): boolean {
  return value === 'odometer' || value === 'both';
}
