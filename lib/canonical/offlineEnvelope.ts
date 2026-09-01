import { createSecureCommandId } from './secureCommandId';

export interface OfflineCommandEnvelope<T> {
  commandId: string;
  idempotencyKey: string;
  commandType: string;
  canonicalEntityId: string;
  expectedVersion?: number;
  capturedAt: string;
  payload: T;
  retryCount: number;
  state: 'PENDING' | 'ACKNOWLEDGED' | 'CONFLICT' | 'REJECTED';
}

export function createOfflineCommandEnvelope<T>(input: Omit<OfflineCommandEnvelope<T>, 'commandId' | 'idempotencyKey' | 'retryCount' | 'state'>, id = createSecureCommandId()): OfflineCommandEnvelope<T> {
  return { ...input, commandId: id, idempotencyKey: id, retryCount: 0, state: 'PENDING' };
}

export function markOfflineRetry<T>(envelope: OfflineCommandEnvelope<T>): OfflineCommandEnvelope<T> {
  return { ...envelope, retryCount: envelope.retryCount + 1 };
}
