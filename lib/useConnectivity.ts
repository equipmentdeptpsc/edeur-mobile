import { useState, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

export type ConnectionStatus =
  | 'online'
  | 'offline'
  | 'syncing'
  | 'pending'
  | 'synced'
  | 'failed';

const HEARTBEAT_INTERVAL_MS = 15000;
const HEARTBEAT_TIMEOUT_MS = 5000;

/** A reachable endpoint may reject an unauthenticated probe; reachability is sufficient here. */
export async function probeCanonicalConnectivity(probeUrl?: string): Promise<boolean> {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && !navigator.onLine) return false;
  const target = probeUrl ?? (Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : undefined);
  if (!target) return false;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEARTBEAT_TIMEOUT_MS);
    try { await fetch(target, { method: 'GET', cache: 'no-store', signal: controller.signal }); }
    finally { clearTimeout(timeoutId); }
    return true;
  } catch { return false; }
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
