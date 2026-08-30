import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import type { CanonicalActivity, CanonicalCommandResult, CanonicalOperatorWork } from './contracts.generated';

export type OfflineCommandType = 'ACTIVITY_TRANSITION' | 'COMPLETE_SHIFT';
export type OfflineSyncState = 'ONLINE' | 'OFFLINE' | 'SYNC_PENDING' | 'SYNC_CONFLICT';
export interface OfflineDeurCommand {
  commandId: string;
  idempotencyKey: string;
  commandType: OfflineCommandType;
  deurId: string;
  rentalEquipmentLineId: string;
  operatorId: string;
  locallyCreatedAt: string;
  localSequence: number;
  expectedVersion: number;
  work: CanonicalOperatorWork;
  payload: { activity?: CanonicalActivity; idleReason?: { id: string; label: string; remarks?: string }; evidence?: { closingMeter?: number; closingLocation?: string } };
  syncStatus: 'LOCAL_PENDING' | 'SERVER_CONFIRMED' | 'SYNC_CONFLICT' | 'REJECTED_AUTHORIZATION' | 'TERMINAL_STATE';
  retryCount: number;
  lastErrorCode?: string;
}

interface OfflineStore { read(): Promise<OfflineDeurCommand[]>; write(items: OfflineDeurCommand[]): Promise<void>; }
const STORAGE_KEY = 'edeur-uat-offline-outbox-v1';

class DurableOfflineStore implements OfflineStore {
  private readonly file = new File(Paths.document, 'edeur-uat-offline-outbox.json');
  async read(): Promise<OfflineDeurCommand[]> {
    try {
      const raw = Platform.OS === 'web' ? globalThis.localStorage?.getItem(STORAGE_KEY) : this.file.exists ? await this.file.text() : null;
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter(isOfflineCommand).sort((left, right) => left.localSequence - right.localSequence) : [];
    } catch { return []; }
  }
  async write(items: OfflineDeurCommand[]): Promise<void> {
    const value = JSON.stringify(items);
    if (Platform.OS === 'web') { globalThis.localStorage?.setItem(STORAGE_KEY, value); return; }
    if (!this.file.exists) this.file.create({ intermediates: true });
    this.file.write(value);
  }
}

export class OfflineDeurCommandOutbox {
  private readonly store: OfflineStore;
  constructor(store: OfflineStore = new DurableOfflineStore()) { this.store = store; }
  async list(): Promise<OfflineDeurCommand[]> { return this.store.read(); }
  async pendingCount(): Promise<number> { return (await this.list()).filter(item => item.syncStatus === 'LOCAL_PENDING').length; }
  async enqueue(input: Omit<OfflineDeurCommand, 'commandId' | 'idempotencyKey' | 'locallyCreatedAt' | 'localSequence' | 'syncStatus' | 'retryCount'>): Promise<OfflineDeurCommand> {
    const items = await this.list(); const id = crypto.randomUUID();
    const nextVersion = input.expectedVersion + items.filter(item => item.deurId === input.deurId && item.syncStatus === 'LOCAL_PENDING').length;
    const envelope: OfflineDeurCommand = { ...input, expectedVersion: nextVersion, commandId: id, idempotencyKey: id, locallyCreatedAt: new Date().toISOString(), localSequence: Math.max(0, ...items.map(item => item.localSequence)) + 1, syncStatus: 'LOCAL_PENDING', retryCount: 0 };
    await this.store.write([...items, envelope]); return envelope;
  }
  async replay(execute: (item: OfflineDeurCommand) => Promise<CanonicalCommandResult>): Promise<OfflineSyncState> {
    const items = await this.list();
    for (const item of items.filter(entry => entry.syncStatus === 'LOCAL_PENDING').sort((left, right) => left.localSequence - right.localSequence)) {
      const result = await execute(item);
      if (result.success) { item.syncStatus = 'SERVER_CONFIRMED'; item.lastErrorCode = undefined; await this.store.write(items); continue; }
      item.retryCount += 1; item.lastErrorCode = result.code;
      if (result.code === 'TRANSPORT_FAILURE') { await this.store.write(items); return 'SYNC_PENDING'; }
      if (result.code === 'CONFLICT') { item.syncStatus = 'SYNC_CONFLICT'; await this.store.write(items); return 'SYNC_CONFLICT'; }
      item.syncStatus = result.code === 'FORBIDDEN' || result.code === 'OWNERSHIP_MISMATCH' ? 'REJECTED_AUTHORIZATION' : 'TERMINAL_STATE';
      await this.store.write(items); return 'SYNC_CONFLICT';
    }
    return 'ONLINE';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function isOfflineCommand(value: unknown): value is OfflineDeurCommand {
  return isRecord(value) && typeof value.commandId === 'string' && typeof value.idempotencyKey === 'string' && (value.commandType === 'ACTIVITY_TRANSITION' || value.commandType === 'COMPLETE_SHIFT') && typeof value.deurId === 'string' && typeof value.rentalEquipmentLineId === 'string' && typeof value.operatorId === 'string' && typeof value.localSequence === 'number' && typeof value.expectedVersion === 'number' && isRecord(value.work) && isRecord(value.payload) && typeof value.syncStatus === 'string' && typeof value.retryCount === 'number';
}
