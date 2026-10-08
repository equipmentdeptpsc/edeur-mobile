export const EXPLICIT_LOGOUT_KEY = 'edeur-uat-explicit-logout-v1';

export interface ExplicitLogoutStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export type ExplicitLogoutResult = { completed: boolean; error?: 'MARKER_PERSIST_FAILED' | 'SIGN_OUT_FAILED' | 'OFFLINE_CLEAR_FAILED' };

/** A durable barrier between explicit logout and ordinary session recovery. */
export class ExplicitLogoutGate {
  private blocked = false;
  private generation = 0;
  private inFlight: Promise<ExplicitLogoutResult> | null = null;

  constructor(private readonly storage: ExplicitLogoutStorage) {}

  get isBlocked(): boolean { return this.blocked; }
  get currentGeneration(): number { return this.generation; }
  permits(generation: number): boolean { return !this.blocked && generation === this.generation; }

  async restore(): Promise<boolean> {
    try {
      if (await this.storage.getItem(EXPLICIT_LOGOUT_KEY) === '1') this.blocked = true;
    } catch {
      // Unreadable auth state cannot authorize an automatic session restore.
      this.blocked = true;
    }
    return this.blocked;
  }

  logout(signOut: () => Promise<void>, clearOfflineAuth: () => Promise<void>): Promise<ExplicitLogoutResult> {
    if (this.inFlight) return this.inFlight;
    this.blocked = true;
    this.generation += 1;
    const operation = (async (): Promise<ExplicitLogoutResult> => {
      try { await this.storage.setItem(EXPLICIT_LOGOUT_KEY, '1'); }
      catch {
        this.blocked = false;
        this.generation += 1;
        return { completed: false, error: 'MARKER_PERSIST_FAILED' };
      }
      let error: ExplicitLogoutResult['error'];
      try { await signOut(); } catch { error = 'SIGN_OUT_FAILED'; }
      try { await clearOfflineAuth(); } catch { error ??= 'OFFLINE_CLEAR_FAILED'; }
      // Once the marker is durable, restoration stays blocked even if cleanup fails.
      return { completed: true, ...(error ? { error } : {}) };
    })();
    this.inFlight = operation;
    void operation.then(() => { if (this.inFlight === operation) this.inFlight = null; });
    return operation;
  }

  async releaseAfterExplicitLogin(expectedGeneration: number): Promise<boolean> {
    if (expectedGeneration !== this.generation) return false;
    await this.storage.removeItem(EXPLICIT_LOGOUT_KEY);
    if (expectedGeneration !== this.generation) return false;
    this.blocked = false;
    this.generation += 1;
    return true;
  }

  advance(): number { this.generation += 1; return this.generation; }
}
