import { useState, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

export type ConnectionStatus =
  | 'online'
  | 'offline'
  | 'syncing'
  | 'pending'
  | 'synced'
  | 'failed';
export type ConnectivityProbeFailureClass = 'TIMEOUT' | 'NETWORK';

const HEARTBEAT_INTERVAL_MS = 15000;
const HEARTBEAT_TIMEOUT_MS = 5000;

/** The username route is public for method negotiation and has the isolated-UAT Web CORS contract. */
export function canonicalConnectivityProbeUrl(apiBaseUrl?: string): string | undefined {
  if (!apiBaseUrl) return undefined;
  try { return new URL('/api/auth/username-login', apiBaseUrl).toString(); }
  catch { return undefined; }
}

/** Abort errors have different prototypes across browser, Hermes, and fetch polyfills. */
export function isAbortLikeError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const value = error as { name?: unknown; code?: unknown };
  return value.name === 'AbortError' || value.code === 'ABORT_ERR';
}

/** A reachable endpoint may reject an unauthenticated probe; reachability is sufficient here. */
export async function probeCanonicalConnectivity(probeUrl?: string): Promise<boolean> {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  const target = probeUrl ?? (Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : undefined);
  if (!target) return false;
  console.info('CONNECTIVITY_PROBE_START', JSON.stringify({ target: new URL(target).pathname || '/' }));
  try {
    const controller = typeof AbortController === 'function' ? new AbortController() : undefined;
    const timeoutId = controller ? setTimeout(() => controller.abort(), HEARTBEAT_TIMEOUT_MS) : undefined;
    try {
      const response = await fetch(target, { method: 'GET', cache: 'no-store', ...(controller ? { signal: controller.signal } : {}) });
      console.info('CONNECTIVITY_PROBE_RESULT', JSON.stringify({ transportReached: true, httpStatus: response.status, classifiedOnline: true, failureClass: null }));
    }
    finally { if (timeoutId) clearTimeout(timeoutId); }
    return true;
  } catch (error) {
    const failureClass: ConnectivityProbeFailureClass = isAbortLikeError(error) ? 'TIMEOUT' : 'NETWORK';
    console.info('CONNECTIVITY_PROBE_RESULT', JSON.stringify({ transportReached: false, httpStatus: null, classifiedOnline: false, failureClass }));
    return false;
  }
}

export function useConnectivity(probeUrl?: string): ConnectionStatus {
  // Start fail-closed. UAT startup performs a real probe before restoring either mode.
  const [status, setStatus] = useState<ConnectionStatus>('offline');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const checkConnectivity = async () => {
      const online = await probeCanonicalConnectivity(probeUrl);
      if (mountedRef.current) setStatus(online ? 'online' : 'offline');
    };

    checkConnectivity();

    const intervalId = setInterval(() => { void checkConnectivity(); }, HEARTBEAT_INTERVAL_MS);
    const appStateSubscription = Platform.OS === 'web' ? undefined : AppState.addEventListener('change', (next) => {
      if (next === 'active') void checkConnectivity();
    });

    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.addEventListener) {
      const handleOffline = () => { if (mountedRef.current) setStatus('offline'); };
      const handleOnline = () => { void checkConnectivity(); };
      window.addEventListener('offline', handleOffline);
      window.addEventListener('online', handleOnline);

      return () => {
        mountedRef.current = false;
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('online', handleOnline);
        clearInterval(intervalId);
        appStateSubscription?.remove();
      };
    }

    return () => { mountedRef.current = false; clearInterval(intervalId); appStateSubscription?.remove(); };
  }, [probeUrl]);

  return status;
}
