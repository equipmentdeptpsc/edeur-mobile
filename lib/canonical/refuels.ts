export type CanonicalRefuel = {
  refuelId: string;
  deurId: string;
  odometer: number;
  liters: number;
  locationName?: string;
  clientOccurredAt?: string;
  serverAcceptedAt: string;
  fuelEfficiency?: number | null;
};

export type RefuelCommandInput = {
  commandId: string;
  idempotencyKey: string;
  rentalId: string;
  rentalLineId: string;
  equipmentId: string;
  assignmentId: string;
  operatorId: string;
  deurId: string;
  expectedVersion: number;
  odometer: number;
  liters: number;
  clientOccurredAt: string;
  locationName?: string;
};

export function parseCanonicalRefuel(value: unknown): CanonicalRefuel | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const row = value as Record<string, unknown>;
  if (typeof row.refuelId !== 'string' || typeof row.deurId !== 'string' || typeof row.odometer !== 'number' || typeof row.liters !== 'number' || typeof row.serverAcceptedAt !== 'string') return undefined;
  return { refuelId: row.refuelId, deurId: row.deurId, odometer: row.odometer, liters: row.liters, serverAcceptedAt: row.serverAcceptedAt, ...(typeof row.locationName === 'string' ? { locationName: row.locationName } : {}), ...(typeof row.clientOccurredAt === 'string' ? { clientOccurredAt: row.clientOccurredAt } : {}), ...(typeof row.fuelEfficiency === 'number' || row.fuelEfficiency === null ? { fuelEfficiency: row.fuelEfficiency } : {}) };
}
