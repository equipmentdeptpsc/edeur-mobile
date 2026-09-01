import { randomUUID } from 'expo-crypto';

/**
 * Generates a cryptographically secure UUID for canonical command identity.
 * Expo Crypto uses native secure randomness in Expo Go / Hermes and the
 * platform implementation on web, so callers do not depend on browser globals.
 */
export function createSecureCommandId(): string {
  return randomUUID();
}
