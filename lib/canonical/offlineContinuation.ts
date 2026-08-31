import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import type { CanonicalActivity, CanonicalOpenDeur, CanonicalOperatorWork, CanonicalSessionIdentity } from './contracts.generated';

export const OFFLINE_CONTINUATION_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const STORAGE_KEY = 'edeur-uat-offline-continuation-v1';
const FILE_NAME = 'edeur-uat-offline-continuation.json';

export interface OfflineContinuationSnapshot {
  schemaVersion: 1;
  savedAt: string;
  lastSuccessfulOnlineAuthorizationAt: string;
  authUserId: string;
  applicationUserId: string;
  operatorId: string;
  operatorDisplayName: string;
  companyId: string;
  assignmentId: string;
  rentalId: string;
  rentalEquipmentLineId: string;
  equipmentId: string;
  equipmentDisplayIdentity: { name: string; assetNumber: string };
  rentalNumber: string;
  deurId: string;
  deurNumber: string;
  workDate: string;
  deurVersion: number;
  deurStatus: string;
  currentActivity?: CanonicalActivity;
  custody?: { primaryOperatorId: string; currentAuthorizedOperatorId: string };
  lastCanonicalSyncAt: string;
}

export type OfflineContinuationRestore =
  | { kind: 'absent' }
  | { kind: 'invalid' }
  | { kind: 'eligible'; snapshot: OfflineContinuationSnapshot; work: CanonicalOperatorWork }
  | { kind: 'expired'; snapshot: OfflineContinuationSnapshot; work: CanonicalOperatorWork };

export interface OfflineContinuationStore {
  read(): Promise<unknown | null>;
  write(snapshot: OfflineContinuationSnapshot): Promise<void>;
  clear(): Promise<void>;
}

class DurableOfflineContinuationStore implements OfflineContinuationStore {
  private readonly file: File | null = Platform.OS === 'web' ? null : new File(Paths.document, FILE_NAME);

  async read(): Promise<unknown | null> {
    try {
      if (Platform.OS === 'web') {
        const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      }
      if (!this.file || !this.file.exists) return null;
      return JSON.parse(await this.file.text());
    } catch { return null; }
  }

  async write(snapshot: OfflineContinuationSnapshot): Promise<void> {
    const raw = JSON.stringify(snapshot);
    if (Platform.OS === 'web') { globalThis.localStorage?.setItem(STORAGE_KEY, raw); return; }
    if (!this.file) return;
    if (!this.file.exists) this.file.create({ intermediates: true });
    this.file.write(raw);
  }

  async clear(): Promise<void> {
    try {
      if (Platform.OS === 'web') { globalThis.localStorage?.removeItem(STORAGE_KEY); return; }
      if (this.file?.exists) this.file.delete();
    } catch { /* A stale bounded snapshot must never block an explicit sign-out. */ }
  }
}

export class OfflineContinuationRepository {
  constructor(private readonly store: OfflineContinuationStore = new DurableOfflineContinuationStore()) {}

  async save(work: CanonicalOperatorWork, lastSuccessfulOnlineAuthorizationAt: Date = new Date()): Promise<boolean> {
    const snapshot = createOfflineContinuationSnapshot(work, lastSuccessfulOnlineAuthorizationAt);
    if (!snapshot) { await this.clear(); return false; }
    await this.store.write(snapshot);
    return true;
  }

  async restore(now: Date = new Date()): Promise<OfflineContinuationRestore> {
    const raw = await this.store.read();
    if (raw === null) return { kind: 'absent' };
    if (!isOfflineContinuationSnapshot(raw)) return { kind: 'invalid' };
    const work = restoreWork(raw);
    if (!work) return { kind: 'invalid' };
    const lastAuthorization = Date.parse(raw.lastSuccessfulOnlineAuthorizationAt);
    if (!Number.isFinite(lastAuthorization)) return { kind: 'invalid' };
    return now.getTime() - lastAuthorization <= OFFLINE_CONTINUATION_MAX_AGE_MS
      ? { kind: 'eligible', snapshot: raw, work }
      : { kind: 'expired', snapshot: raw, work };
  }

  async clear(): Promise<void> { await this.store.clear(); }
}

export function createOfflineContinuationSnapshot(work: CanonicalOperatorWork, lastSuccessfulOnlineAuthorizationAt: Date = new Date()): OfflineContinuationSnapshot | null {
  const deur = work.openDeur;
  if (!deur || !isOpenDeur(deur) || !hasRequiredWorkIdentity(work)) return null;
  if (work.custody && work.custody.currentAuthorizedOperatorId !== work.identity.operatorId) return null;
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    savedAt: now,
    lastSuccessfulOnlineAuthorizationAt: lastSuccessfulOnlineAuthorizationAt.toISOString(),
    authUserId: work.identity.authUserId,
    applicationUserId: work.identity.applicationUserId,
    operatorId: work.identity.operatorId,
    operatorDisplayName: work.identity.operatorName,
    companyId: work.identity.companyId,
    assignmentId: work.assignment.id,
    rentalId: work.rental.id,
    rentalEquipmentLineId: work.rentalLine.id,
    equipmentId: work.equipment.id,
    equipmentDisplayIdentity: { name: work.equipment.name, assetNumber: work.equipment.assetNumber },
    rentalNumber: work.rental.rentalNumber,
    deurId: deur.id,
    deurNumber: deur.deurNumber,
    workDate: deur.workDate,
    deurVersion: deur.rowVersion,
    deurStatus: deur.status,
    ...(deur.activeActivity ? { currentActivity: deur.activeActivity } : {}),
    ...(work.custody ? { custody: { primaryOperatorId: work.custody.primaryOperatorId, currentAuthorizedOperatorId: work.custody.currentAuthorizedOperatorId } } : {}),
    lastCanonicalSyncAt: now,
  };
}

export function isOfflineContinuationSnapshot(value: unknown): value is OfflineContinuationSnapshot {
  if (!isRecord(value) || value.schemaVersion !== 1) return false;
  const strings = ['savedAt', 'lastSuccessfulOnlineAuthorizationAt', 'authUserId', 'applicationUserId', 'operatorId', 'operatorDisplayName', 'companyId', 'assignmentId', 'rentalId', 'rentalEquipmentLineId', 'equipmentId', 'rentalNumber', 'deurId', 'deurNumber', 'workDate', 'deurStatus', 'lastCanonicalSyncAt'];
  if (strings.some((key) => typeof value[key] !== 'string' || !String(value[key]).trim())) return false;
  if (typeof value.deurVersion !== 'number' || !Number.isInteger(value.deurVersion) || value.deurVersion < 0) return false;
  if (!isRecord(value.equipmentDisplayIdentity) || typeof value.equipmentDisplayIdentity.name !== 'string' || typeof value.equipmentDisplayIdentity.assetNumber !== 'string') return false;
  if (value.currentActivity !== undefined && !isCanonicalActivity(value.currentActivity)) return false;
  if (value.custody !== undefined && (!isRecord(value.custody) || typeof value.custody.primaryOperatorId !== 'string' || typeof value.custody.currentAuthorizedOperatorId !== 'string')) return false;
  const snapshot = value as Record<string, string>;
  return isOpenStatus(snapshot.deurStatus) && isValidDate(snapshot.lastSuccessfulOnlineAuthorizationAt) && isValidDate(snapshot.lastCanonicalSyncAt);
}

function restoreWork(snapshot: OfflineContinuationSnapshot): CanonicalOperatorWork | null {
  if (snapshot.custody && snapshot.custody.currentAuthorizedOperatorId !== snapshot.operatorId) return null;
  const identity: CanonicalSessionIdentity = { authUserId: snapshot.authUserId, applicationUserId: snapshot.applicationUserId, companyId: snapshot.companyId, operatorId: snapshot.operatorId, operatorName: snapshot.operatorDisplayName };
  const openDeur: CanonicalOpenDeur = { id: snapshot.deurId, deurNumber: snapshot.deurNumber, workDate: snapshot.workDate, status: snapshot.deurStatus, operatorId: snapshot.custody?.primaryOperatorId ?? snapshot.operatorId, rowVersion: snapshot.deurVersion, ...(snapshot.currentActivity ? { activeActivity: snapshot.currentActivity } : {}) };
  return {
    identity,
    assignment: { id: snapshot.assignmentId, projectId: 'offline-cached', status: 'Active' },
    equipment: { id: snapshot.equipmentId, name: snapshot.equipmentDisplayIdentity.name, assetNumber: snapshot.equipmentDisplayIdentity.assetNumber },
    rental: { id: snapshot.rentalId, rentalNumber: snapshot.rentalNumber, status: 'Active' },
    rentalLine: { id: snapshot.rentalEquipmentLineId, status: 'Active', operationalMetadata: {} },
    ...(snapshot.custody ? { custody: { ...snapshot.custody, turnoverStatus: 'ACCEPTED' as const } } : {}),
    openDeur,
    dailyDeur: openDeur,
  };
}

function hasRequiredWorkIdentity(work: CanonicalOperatorWork): boolean {
  return [work.identity.applicationUserId, work.identity.operatorId, work.identity.operatorName, work.identity.companyId, work.assignment.id, work.rental.id, work.rentalLine.id, work.equipment.id, work.equipment.name, work.equipment.assetNumber, work.rental.rentalNumber].every((value) => Boolean(value?.trim()));
}
function isOpenDeur(deur: CanonicalOpenDeur): boolean { return isOpenStatus(deur.status) && Boolean(deur.id && deur.deurNumber && deur.workDate) && Number.isInteger(deur.rowVersion) && deur.rowVersion >= 0; }
function isOpenStatus(status: unknown): boolean { return status === 'Draft' || status === 'In Progress'; }
function isCanonicalActivity(value: unknown): value is CanonicalActivity { return value === 'operation' || value === 'idle' || value === 'standby' || value === 'mealBreak' || value === 'breakdown'; }
function isValidDate(value: string): boolean { return Number.isFinite(Date.parse(value)); }
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
