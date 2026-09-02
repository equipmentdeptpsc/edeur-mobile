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
  console.info('CONNECTIVITY_PROBE_START', JSON.stringify({ platform: Platform.OS }));
  try {
    const controller = typeof AbortController === 'function' ? new AbortController() : undefined;
    const response = await new Promise<Response>((resolve, reject) => {
      let settled = false;
      const finish = (action: () => void) => { if (settled) return; settled = true; clearTimeout(timeoutId); action(); };
      console.info('CONNECTIVITY_PROBE_TIMEOUT_ARMED');
      const timeoutId = setTimeout(() => {
        console.info('CONNECTIVITY_PROBE_TIMEOUT_FIRED');
        controller?.abort();
        finish(() => reject(Object.assign(new Error('CONNECTIVITY_TIMEOUT'), { name: 'AbortError' })));
      }, HEARTBEAT_TIMEOUT_MS);
      void fetch(target, { method: 'GET', cache: 'no-store', ...(controller ? { signal: controller.signal } : {}) }).then(value => finish(() => resolve(value))).catch(error => finish(() => reject(error)));
    });
    console.info('CONNECTIVITY_PROBE_RESOLVED', JSON.stringify({ online: true }));
    console.info('CONNECTIVITY_PROBE_RESULT', JSON.stringify({ transportReached: true, httpStatus: response.status, classifiedOnline: true, failureClass: null }));
    return true;
  } catch (error) {
    const failureClass: ConnectivityProbeFailureClass = isAbortLikeError(error) ? 'TIMEOUT' : 'NETWORK';
    console.info('CONNECTIVITY_PROBE_RESOLVED', JSON.stringify({ online: false, failureClass }));
    console.info('CONNECTIVITY_PROBE_RESULT', JSON.stringify({ transportReached: false, httpStatus: null, classifiedOnline: false, failureClass }));
    return false;
  }
}

export function useConnectivity(probeUrl?: string): ConnectionStatus {
  // Start fail-closed. UAT startup performs a real probe before restoring either mode.
  const [status, setStatus] = useState<ConnectionStatus>('offline');
  const mountedRef = useRef(true);
  console.info('CONNECTIVITY_HOOK_RENDER', JSON.stringify({ status }));

  useEffect(() => {
    console.info('CONNECTIVITY_EFFECT_ENTER', JSON.stringify({ platform: Platform.OS }));
    mountedRef.current = true;

    const checkConnectivity = async () => {
      const online = await probeCanonicalConnectivity(probeUrl);
      if (mountedRef.current) {
        const nextStatus = online ? 'online' : 'offline';
        console.info('CONNECTIVITY_STATE_SET', JSON.stringify({ status: nextStatus }));
        setStatus(nextStatus);
      }
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
