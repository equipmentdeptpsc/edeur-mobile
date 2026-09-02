import { useEffect, useId } from 'react';
import { requireNativeModule } from 'expo-modules-core';

export const ExpoKeepAwakeTag = 'ExpoKeepAwakeDefaultTag';

type KeepAwakeModule = { activate?: (tag: string) => Promise<void> | void; deactivate?: (tag: string) => Promise<void> | void };

function nativeModule(): KeepAwakeModule | null {
  try { return requireNativeModule<KeepAwakeModule>('ExpoKeepAwake'); }
  catch { return null; }
}

/** Keep-awake is convenience-only; native/Expo Go failures must never escape the lifecycle. */
export async function activateKeepAwakeAsync(tag: string = ExpoKeepAwakeTag): Promise<void> {
  try { await nativeModule()?.activate?.(tag); }
  catch { console.warn('KEEP_AWAKE_UNAVAILABLE', JSON.stringify({ action: 'activate' })); }
}

export async function deactivateKeepAwakeAsync(tag: string = ExpoKeepAwakeTag): Promise<void> {
  try { await nativeModule()?.deactivate?.(tag); }
  catch { console.warn('KEEP_AWAKE_UNAVAILABLE', JSON.stringify({ action: 'deactivate' })); }
}

export function deactivateKeepAwake(tag: string = ExpoKeepAwakeTag): Promise<void> {
  return deactivateKeepAwakeAsync(tag);
}

export function useKeepAwake(tag?: string): void {
  const defaultTag = useId();
  const tagOrDefault = tag ?? defaultTag;
  useEffect(() => {
    void activateKeepAwakeAsync(tagOrDefault);
    return () => { void deactivateKeepAwakeAsync(tagOrDefault); };
  }, [tagOrDefault]);
}

