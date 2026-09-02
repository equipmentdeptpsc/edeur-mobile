import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { mockRepository } from './mockRepository';
import type { Operator } from './types';
import type { CanonicalActivity, CanonicalCommandResult, CanonicalOperatorWork } from './canonical/contracts.generated';
import { mobileRuntime as runtime } from './canonical/runtime';
import { CanonicalAuthenticationError } from './canonical/authentication';
import { canonicalConnectivityProbeUrl, probeCanonicalConnectivity, useConnectivity } from './useConnectivity';
import type { OfflineSyncState } from './canonical/offlineOutbox';
import type { OfflineContinuationSnapshot } from './canonical/offlineContinuation';
import { createSecureCommandId } from './canonical/secureCommandId';
import { isDeurReadOnly } from './canonical/deurLifecycle';

export type UatSessionState = 'INITIALIZING' | 'ONLINE_AUTHENTICATED' | 'OFFLINE_CONTINUATION' | 'OFFLINE_EXPIRED' | 'REAUTH_REQUIRED' | 'SIGNED_OUT';

interface AuthContextValue {
  operator: Operator | null | undefined;
  canonicalWork: CanonicalOperatorWork | null;
  canonicalWorks: CanonicalOperatorWork[];
  selectedCanonicalWork: CanonicalOperatorWork | null;
  selectCanonicalWork: (rentalEquipmentLineId: string) => void;
  pendingDeurId: string | null;
  mode: 'DEMO' | 'UAT';
  configurationError: string | null;
  canonicalBusy: boolean;
  offlineSyncState: OfflineSyncState;
  offlinePendingCount: number;
  uatSessionState: UatSessionState;
  offlineContinuationSnapshot: OfflineContinuationSnapshot | null;
  requiresOnlineFirstSignIn: boolean;
  getLoginError: () => string | null;
  login: (identifier: string, password?: string) => Promise<boolean>;
  loginReliever: (name: string, pin: string, deurId?: string) => boolean;
  loginMainOperator: (pin: string, deurId: string) => boolean;
  resumeDeur: (deurId: string) => boolean;
  refreshCanonicalWork: () => Promise<boolean>;
  startCanonicalDeur: (optional?: { openingMeter?: number; shift?: string; operationalRemarks?: string }) => Promise<CanonicalCommandResult>;
  transitionCanonicalActivity: (activity: CanonicalActivity, reason?: { id: string; label: string; remarks?: string }) => Promise<CanonicalCommandResult>;
  endCanonicalShift: (evidence?: { closingMeter?: number; closingLocation?: string }) => Promise<CanonicalCommandResult>;
  submitCanonicalDeur: () => Promise<CanonicalCommandResult>;
  initiateCanonicalTurnover: (targetOperatorId: string) => Promise<{ success: boolean; code?: string }>;
  acceptCanonicalTurnover: () => Promise<{ success: boolean; code?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_KEY = 'erms_operator_session_v1';
const PENDING_DEUR_KEY = 'erms_pending_deur_v1';

function loadSession(): Operator | null {
  if (runtime.environment.mode !== 'DEMO') return null;
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const opId = JSON.parse(raw) as string;
        return mockRepository.getOperator(opId);
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function saveSession(operatorId: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SESSION_KEY, JSON.stringify(operatorId));
    }
  } catch {
    // ignore
  }
}

function clearSession(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(PENDING_DEUR_KEY);
    }
  } catch {
    // ignore
  }
}

function loadPendingDeurId(): string | null {
  if (runtime.environment.mode !== 'DEMO') return null;
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(PENDING_DEUR_KEY);
    }
  } catch { /* ignore */ }
  return null;
}

function savePendingDeurId(deurId: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PENDING_DEUR_KEY, deurId);
    }
  } catch { /* ignore */ }
}

function clearPendingDeurId(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(PENDING_DEUR_KEY);
    }
  } catch { /* ignore */ }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [operator, setOperator] = useState<Operator | null | undefined>(runtime.environment.mode === 'UAT' ? undefined : loadSession());
  const [canonicalWork, setCanonicalWork] = useState<CanonicalOperatorWork | null>(null);
  const [canonicalWorks, setCanonicalWorks] = useState<CanonicalOperatorWork[]>([]);
  const [selectedCanonicalWork, setSelectedCanonicalWork] = useState<CanonicalOperatorWork | null>(null);
  const [pendingDeurId, setPendingDeurId] = useState<string | null>(loadPendingDeurId());
  const [canonicalBusy, setCanonicalBusy] = useState(false);
  const connectivityProbeUrl = canonicalConnectivityProbeUrl(runtime.environment.apiBaseUrl);
  const connectivity = useConnectivity(connectivityProbeUrl);
  const [offlineSyncState, setOfflineSyncState] = useState<OfflineSyncState>('ONLINE');
  const [offlinePendingCount, setOfflinePendingCount] = useState(0);
  const [uatSessionState, setUatSessionState] = useState<UatSessionState>(runtime.environment.mode === 'UAT' ? 'INITIALIZING' : 'ONLINE_AUTHENTICATED');
  useEffect(() => { if (runtime.environment.mode === 'UAT') console.info('AUTH_PROVIDER_RENDER', JSON.stringify({ operator: operator === undefined ? 'undefined' : operator ? 'authenticated' : 'signed-out', uatSessionState })); }, [operator, uatSessionState]);
  const [offlineContinuationSnapshot, setOfflineContinuationSnapshot] = useState<OfflineContinuationSnapshot | null>(null);
  const [requiresOnlineFirstSignIn, setRequiresOnlineFirstSignIn] = useState(false);
  const loginErrorRef = useRef<string | null>(null);
  const canonicalBusyRef = useRef(false);
  const commandIds = useRef(new Map<string, string>());
  const replayingOffline = useRef(false);
  const revalidatingSession = useRef(false);
  const turnoverHydrationRef = useRef(0);
  const lastSuccessfulOnlineAuthorizationAt = useRef<Date | null>(null);
  const withBootstrapTimeout = async <T,>(operation: Promise<T>, timeoutMs = 12000): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([operation, new Promise<T>((_, reject) => { timeoutId = setTimeout(() => reject(new Error('BOOTSTRAP_TIMEOUT')), timeoutMs); })]);
    } finally { if (timeoutId) clearTimeout(timeoutId); }
  };

  const refreshOfflineStatus = async () => {
    if (runtime.environment.mode !== 'UAT' || !runtime.offlineOutbox) return;
    const count = await runtime.offlineOutbox.pendingCount(); setOfflinePendingCount(count);
    setOfflineSyncState(connectivity === 'offline' ? 'OFFLINE' : count > 0 ? 'SYNC_PENDING' : 'ONLINE');
  };

  const replayOffline = async (sessionValidated = false) => {
    if (replayingOffline.current || connectivity === 'offline' || (!sessionValidated && uatSessionState !== 'ONLINE_AUTHENTICATED') || !runtime.offlineOutbox || !runtime.commands) return;
    replayingOffline.current = true; setOfflineSyncState('SYNC_PENDING');
    try {
      const state = await runtime.offlineOutbox.replay((item) => item.commandType === 'ACTIVITY_TRANSITION'
        ? runtime.commands!.transition(item.work, item.deurId, item.expectedVersion, item.payload.activity!, item.idempotencyKey, item.payload.idleReason)
        : runtime.commands!.endShift(item.work, item.deurId, item.expectedVersion, item.idempotencyKey, item.payload.evidence));
      console.info('OUTBOX_REPLAY_RESULT', JSON.stringify({ state }));
      await refreshOfflineStatus(); if (state === 'SYNC_CONFLICT') setOfflineSyncState('SYNC_CONFLICT');
      if (state === 'ONLINE') await refreshCanonicalWork();
    } finally { replayingOffline.current = false; }
  };

  const hydrateTurnoverTargets = (works: CanonicalOperatorWork[]) => {
    if (!runtime.workRepository?.loadTurnoverTargets) return;
    const hydration = ++turnoverHydrationRef.current;
    void Promise.all(works.map(async (item) => {
      await runtime.workRepository!.loadTurnoverTargets!(item);
      if (hydration !== turnoverHydrationRef.current) return;
      setCanonicalWorks(current => current.map(value => value.rentalLine.id === item.rentalLine.id ? { ...value, turnoverTargets: item.turnoverTargets } : value));
      setCanonicalWork(current => current?.rentalLine.id === item.rentalLine.id ? { ...current, turnoverTargets: item.turnoverTargets } : current);
      setSelectedCanonicalWork(current => current?.rentalLine.id === item.rentalLine.id ? { ...current, turnoverTargets: item.turnoverTargets } : current);
    })).catch(() => { /* Eligibility is optional for core work rendering and can retry on the next refresh. */ });
  };

  const persistOfflineContinuation = async (work: CanonicalOperatorWork | null): Promise<boolean> => {
    if (!runtime.offlineContinuation) return false;
    if (!work?.openDeur) {
      await runtime.offlineContinuation.clear();
      setOfflineContinuationSnapshot(null);
      return false;
    }
    try {
      const authorizationAt = lastSuccessfulOnlineAuthorizationAt.current;
      if (!authorizationAt || !await runtime.offlineContinuation.save(work, authorizationAt)) {
        console.warn('OFFLINE_CONTINUATION_SAVE_FAILED', JSON.stringify({ reason: authorizationAt ? 'INVALID_WORK_IDENTITY' : 'MISSING_ONLINE_AUTHORIZATION', hasOpenDeur: true }));
        return false;
      }
      const restored = await runtime.offlineContinuation.restore();
      setOfflineContinuationSnapshot(restored.kind === 'eligible' || restored.kind === 'expired' ? restored.snapshot : null);
      return true;
    } catch {
      console.warn('OFFLINE_CONTINUATION_SAVE_FAILED', JSON.stringify({ reason: 'LOCAL_PERSISTENCE_UNAVAILABLE', hasOpenDeur: true }));
      return false;
    }
  };

  const applyCanonicalSession = async (authenticated: Awaited<ReturnType<NonNullable<typeof runtime.authentication>['restoreSession']>>) => {
    if (!authenticated || !runtime.workRepository) { setOperator(null); setCanonicalWorks([]); setCanonicalWork(null); setSelectedCanonicalWork(null); return false; }
    lastSuccessfulOnlineAuthorizationAt.current = new Date();
    const works = runtime.workRepository.getCurrentWorks ? await runtime.workRepository.getCurrentWorks(authenticated.identity) : await runtime.workRepository.getCurrentWork(authenticated.identity).then(value=>value?[value]:[]);
    const work = works.length===1?works[0]:null; setCanonicalWorks(works); setSelectedCanonicalWork(work); setCanonicalWork(work); setOperator({ id: authenticated.identity.operatorId, name: authenticated.identity.operatorName, loginName: authenticated.session.user.email ?? authenticated.identity.authUserId, initials: authenticated.identity.operatorName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase(), isReliever: false }); setPendingDeurId(work?.openDeur?.id ?? null);
    await persistOfflineContinuation(work);
    hydrateTurnoverTargets(works);
    return true;
  };

  const restoreOfflineContinuation = async () => {
    if (!runtime.offlineContinuation) return false;
    const restored = await runtime.offlineContinuation.restore();
    if (restored.kind !== 'eligible' && restored.kind !== 'expired') return false;
    const { snapshot, work } = restored;
    setOfflineContinuationSnapshot(snapshot);
    setCanonicalWorks([work]); setSelectedCanonicalWork(work); setCanonicalWork(work); setPendingDeurId(work.openDeur?.id ?? null);
    setOperator({ id: snapshot.operatorId, name: snapshot.operatorDisplayName, loginName: snapshot.applicationUserId, initials: snapshot.operatorDisplayName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase(), isReliever: false });
    setUatSessionState(restored.kind === 'eligible' ? 'OFFLINE_CONTINUATION' : 'OFFLINE_EXPIRED');
    return true;
  };

  useEffect(() => {
    if (runtime.environment.mode !== 'UAT' || !runtime.authentication) return;
    let cancelled = false;
    void (async () => {
      setUatSessionState('INITIALIZING');
      const online = await probeCanonicalConnectivity(connectivityProbeUrl);
      if (!cancelled && online) {
        try {
          const session = await runtime.authentication!.restoreSession();
          if (await withBootstrapTimeout(applyCanonicalSession(session))) { if (!cancelled) { setRequiresOnlineFirstSignIn(false); setUatSessionState('ONLINE_AUTHENTICATED'); } return; }
        } catch { /* A reachable service without a valid session is signed out, not offline continuation. */ }
      }
      if (!cancelled && !online && await restoreOfflineContinuation()) { setRequiresOnlineFirstSignIn(false); return; }
      if (!cancelled) { setOperator(null); setCanonicalWorks([]); setCanonicalWork(null); setSelectedCanonicalWork(null); setRequiresOnlineFirstSignIn(!online); setUatSessionState('SIGNED_OUT'); }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    void refreshOfflineStatus();
    if (runtime.environment.mode !== 'UAT' || uatSessionState === 'INITIALIZING') return;
    if (connectivity === 'offline') { void restoreOfflineContinuation(); return; }
    if (!runtime.authentication || revalidatingSession.current) return;
    revalidatingSession.current = true;
    void (async () => {
      console.info('REVALIDATION_START');
      try {
        const session = await runtime.authentication!.restoreSession();
        if (!await applyCanonicalSession(session)) { console.info('REVALIDATION_RESULT', JSON.stringify({ success: false, reason: 'SESSION_OR_WORK_REJECTED' })); setUatSessionState('REAUTH_REQUIRED'); setOfflineSyncState('SYNC_CONFLICT'); return; }
        setUatSessionState('ONLINE_AUTHENTICATED');
        console.info('REVALIDATION_RESULT', JSON.stringify({ success: true, reason: null }));
        console.info('OUTBOX_REPLAY_START');
        await replayOffline(true);
      } catch { console.info('REVALIDATION_RESULT', JSON.stringify({ success: false, reason: 'REVALIDATION_FAILED' })); setUatSessionState('REAUTH_REQUIRED'); setOfflineSyncState('SYNC_CONFLICT'); }
      finally { revalidatingSession.current = false; }
    })();
  }, [connectivity, uatSessionState]);

  const login = async (identifier: string, password?: string) => {
    loginErrorRef.current=null;
    if (runtime.environment.mode === 'UAT') {
      if (runtime.configurationError || !runtime.authentication || !runtime.workRepository || !password) return false;
      try {
        const authenticated = await runtime.authentication.signIn(identifier, password);
        const applied = await applyCanonicalSession(authenticated);
        if (applied) { setRequiresOnlineFirstSignIn(false); setUatSessionState('ONLINE_AUTHENTICATED'); }
        return applied;
      } catch(error) { loginErrorRef.current=error instanceof CanonicalAuthenticationError?error.message:'Canonical sign-in failed.';return false; }
    }
    const pin = identifier;
    const op = mockRepository.authenticateByPin(pin);
    if (!op) return false;
    setOperator(op);
    saveSession(op.id);
    // Check if there's a pending DEUR to resume
    const pending = mockRepository.getActiveDeurWithTurnoverPending();
    if (pending) {
      setPendingDeurId(pending.id);
      savePendingDeurId(pending.id);
    } else {
      setPendingDeurId(null);
      clearPendingDeurId();
    }
    return true;
  };

  const loginReliever = (name: string, pin: string, deurId?: string) => {
    if (runtime.environment.mode !== 'DEMO') return false;
    const op = mockRepository.authenticateReliever(name, pin);
    if (!op) return false;
    // Mark DEUR as pending turnover — do NOT create segment yet
    if (deurId) {
      mockRepository.markTurnoverPending(deurId);
      setPendingDeurId(deurId);
      savePendingDeurId(deurId);
    } else {
      // Check if there's a turnover-pending DEUR
      const pending = mockRepository.getActiveDeurWithTurnoverPending();
      if (pending) {
        setPendingDeurId(pending.id);
        savePendingDeurId(pending.id);
      }
    }
    setOperator(op);
    saveSession(op.id);
    return true;
  };

  const loginMainOperator = (pin: string, deurId: string) => {
    if (runtime.environment.mode !== 'DEMO') return false;
    const op = mockRepository.authenticateByPin(pin);
    if (!op) return false;
    // Mark DEUR as pending turnover
    mockRepository.markTurnoverPending(deurId);
    setPendingDeurId(deurId);
    savePendingDeurId(deurId);
    setOperator(op);
    saveSession(op.id);
    return true;
  };

  const resumeDeur = (deurId: string) => {
    if (runtime.environment.mode !== 'DEMO') return false;
    if (!operator) return false;
    const deur = mockRepository.getDeurById(deurId);
    if (!deur || deur.status !== 'Active') return false;
    mockRepository.resumeOperation(deurId, operator.id, operator.name, operator.isReliever ?? false);
    setPendingDeurId(null);
    clearPendingDeurId();
    return true;
  };

  const logout = () => {
    if (runtime.environment.mode === 'UAT') void runtime.authentication?.signOut();
    if (runtime.environment.mode === 'UAT') void runtime.offlineContinuation?.clear();
    setOperator(null);
    setCanonicalWork(null); setCanonicalWorks([]); setSelectedCanonicalWork(null);
    setPendingDeurId(null);
    setOfflineContinuationSnapshot(null);
    if (runtime.environment.mode === 'UAT') setUatSessionState('SIGNED_OUT');
    clearSession();
  };

  const failure = (code: string): CanonicalCommandResult => ({ success: false, code });
  const refreshCanonicalWork = async () => {
    if (runtime.environment.mode !== 'UAT' || !canonicalWork || !runtime.workRepository) return false;
    try {
      const works = runtime.workRepository.getCurrentWorks ? await runtime.workRepository.getCurrentWorks(canonicalWork.identity) : await runtime.workRepository.getCurrentWork(canonicalWork.identity).then(value=>value?[value]:[]); const work = works.find(item=>item.rentalLine.id===canonicalWork.rentalLine.id) ?? (works.length===1?works[0]:null); setCanonicalWorks(works); setSelectedCanonicalWork(work); setCanonicalWork(work); hydrateTurnoverTargets(works);
      setPendingDeurId(work?.openDeur?.id ?? null);
      await persistOfflineContinuation(work);
      return true;
    } catch { return false; }
  };
  const runCanonical = async (key: string, action: (identity: string) => Promise<CanonicalCommandResult>, onAccepted?: (result: Extract<CanonicalCommandResult, { success: true }>) => Promise<void>) => {
    if (canonicalBusyRef.current) return failure('ACTION_IN_PROGRESS');
    let identity = commandIds.current.get(key);
    if (!identity) { identity = createSecureCommandId(); commandIds.current.set(key, identity); }
    canonicalBusyRef.current = true;
    setCanonicalBusy(true);
    try {
      const result = await action(identity);
      if (result.success || !result.retryable) commandIds.current.delete(key);
      if (result.success && onAccepted) await onAccepted(result);
      if (result.success || result.refreshRequired) await refreshCanonicalWork();
      return result;
    } finally { canonicalBusyRef.current = false; setCanonicalBusy(false); }
  };
  const startCanonicalDeur: AuthContextValue['startCanonicalDeur'] = async (optional = {}) => {
    if (!canonicalWork || canonicalWork.openDeur || canonicalWork.dailyDeur || !runtime.commands) return failure(canonicalWork?.openDeur ? 'PRIOR_OPEN_DEUR' : canonicalWork?.dailyDeur ? 'DAILY_DEUR_EXISTS' : 'NO_AUTHORIZED_WORK');
    if (connectivity === 'offline' || uatSessionState !== 'ONLINE_AUTHENTICATED') return failure('CONNECTIVITY_REQUIRED_FOR_START');
    const draftKey = 'start-draft';
    let draftId = commandIds.current.get(draftKey);
    if (!draftId) { draftId = createSecureCommandId(); commandIds.current.set(draftKey, draftId); }
    const result = await runCanonical('start', (identity) => runtime.commands!.start(canonicalWork, identity, draftId!, optional), async (accepted) => {
      const openDeur = { ...accepted.record, activeActivity: 'operation' as const };
      const startedWork = { ...canonicalWork, openDeur, dailyDeur: openDeur };
      setCanonicalWorks(current => current.map(work => work.rentalLine.id === startedWork.rentalLine.id ? startedWork : work));
      setSelectedCanonicalWork(startedWork); setCanonicalWork(startedWork); setPendingDeurId(openDeur.id);
      await persistOfflineContinuation(startedWork);
    });
    if (result.success || !result.retryable) commandIds.current.delete(draftKey);
    return result;
  };
  const transitionCanonicalActivity: AuthContextValue['transitionCanonicalActivity'] = async (activity, reason) => {
    const deur = canonicalWork?.openDeur;
    if (!canonicalWork || !deur || !runtime.commands) return failure('NO_OPEN_DEUR');
    if (isDeurReadOnly(deur.status)) return failure('DEUR_READ_ONLY');
    if (connectivity === 'offline' && uatSessionState === 'OFFLINE_CONTINUATION' && runtime.offlineOutbox) {
      await runtime.offlineOutbox.enqueue({ commandType: 'ACTIVITY_TRANSITION', deurId: deur.id, rentalEquipmentLineId: canonicalWork.rentalLine.id, operatorId: canonicalWork.identity.operatorId, expectedVersion: deur.rowVersion, work: canonicalWork, payload: { activity, ...(reason ? { idleReason: reason } : {}) } });
      await refreshOfflineStatus(); return failure('LOCAL_PENDING');
    }
    if (connectivity === 'offline' || uatSessionState !== 'ONLINE_AUTHENTICATED') return failure(uatSessionState === 'OFFLINE_EXPIRED' ? 'OFFLINE_CONTINUATION_EXPIRED' : 'CONNECTIVITY_REQUIRED_FOR_REVALIDATION');
    return runCanonical(`transition:${activity}`, (identity) => runtime.commands!.transition(canonicalWork, deur.id, deur.rowVersion, activity, identity, reason));
  };
  const endCanonicalShift: AuthContextValue['endCanonicalShift'] = async (evidence = {}) => {
    const deur = canonicalWork?.openDeur;
    if (!canonicalWork || !deur || !runtime.commands) return failure('NO_OPEN_DEUR');
    if (isDeurReadOnly(deur.status)) return failure('DEUR_READ_ONLY');
    if (connectivity === 'offline' && uatSessionState === 'OFFLINE_CONTINUATION' && runtime.offlineOutbox) {
      await runtime.offlineOutbox.enqueue({ commandType: 'COMPLETE_SHIFT', deurId: deur.id, rentalEquipmentLineId: canonicalWork.rentalLine.id, operatorId: canonicalWork.identity.operatorId, expectedVersion: deur.rowVersion, work: canonicalWork, payload: { evidence } });
      await refreshOfflineStatus(); return failure('LOCAL_PENDING');
    }
    if (connectivity === 'offline' || uatSessionState !== 'ONLINE_AUTHENTICATED') return failure(uatSessionState === 'OFFLINE_EXPIRED' ? 'OFFLINE_CONTINUATION_EXPIRED' : 'CONNECTIVITY_REQUIRED_FOR_REVALIDATION');
    return runCanonical('end-shift', (identity) => runtime.commands!.endShift(canonicalWork, deur.id, deur.rowVersion, identity, evidence));
  };
  const submitCanonicalDeur = async () => {
    const deur = canonicalWork?.openDeur;
    if (!canonicalWork || !deur || !runtime.commands) return failure('NO_OPEN_DEUR');
    if (isDeurReadOnly(deur.status)) return failure('DEUR_READ_ONLY');
    if (connectivity === 'offline' || uatSessionState !== 'ONLINE_AUTHENTICATED') return failure('CONNECTIVITY_REQUIRED_FOR_SUBMIT');
    return runCanonical('submit', (identity) => runtime.commands!.submit(canonicalWork, deur.id, deur.rowVersion, identity));
  };
  const initiateCanonicalTurnover = async (targetOperatorId: string): Promise<{ success: boolean; code?: string }> => {
    const deur = canonicalWork?.openDeur;
    if (!canonicalWork || !deur || !runtime.commands) return failure('NO_OPEN_DEUR');
    if (isDeurReadOnly(deur.status)) return failure('DEUR_READ_ONLY');
    if (connectivity === 'offline' || uatSessionState !== 'ONLINE_AUTHENTICATED') return failure('CONNECTIVITY_REQUIRED_FOR_TURNOVER');
    if (!canonicalWork.turnoverTargets?.some(target => target.operatorId === targetOperatorId)) return failure('TARGET_OPERATOR_NOT_ELIGIBLE');
    if (canonicalBusyRef.current) return failure('ACTION_IN_PROGRESS');
    canonicalBusyRef.current = true; setCanonicalBusy(true);
    try {
      const identity = createSecureCommandId();
      const result = await runtime.commands.initiateTurnover(canonicalWork, deur.id, deur.rowVersion, targetOperatorId, identity);
      if (result.success) await refreshCanonicalWork();
      return result;
    } finally { canonicalBusyRef.current = false; setCanonicalBusy(false); }
  };
  const acceptCanonicalTurnover = async (): Promise<{ success: boolean; code?: string }> => {
    const turnoverId = canonicalWork?.custody?.turnoverId;
    if (!canonicalWork || canonicalWork.custody?.turnoverStatus !== 'PENDING' || !turnoverId || !runtime.commands) return failure('NO_PENDING_TURNOVER');
    const deur = canonicalWork.openDeur ?? canonicalWork.dailyDeur;
    if (deur && isDeurReadOnly(deur.status)) return failure('DEUR_READ_ONLY');
    if (connectivity === 'offline' || uatSessionState !== 'ONLINE_AUTHENTICATED') return failure('CONNECTIVITY_REQUIRED_FOR_TURNOVER');
    if (canonicalBusyRef.current) return failure('ACTION_IN_PROGRESS');
    canonicalBusyRef.current = true; setCanonicalBusy(true);
    try {
      const identity = createSecureCommandId();
      const result = await runtime.commands.acceptTurnover(turnoverId, canonicalWork.identity.operatorId, identity);
      if (result.success) await refreshCanonicalWork();
      return result;
    } finally { canonicalBusyRef.current = false; setCanonicalBusy(false); }
  };

  const selectCanonicalWork = (rentalEquipmentLineId:string) => { const work=canonicalWorks.find(item=>item.rentalLine.id===rentalEquipmentLineId) ?? null; setSelectedCanonicalWork(work); setCanonicalWork(work); setPendingDeurId(work?.openDeur?.id ?? null); };
  return (
    <AuthContext.Provider value={{ operator, canonicalWork, canonicalWorks, selectedCanonicalWork, selectCanonicalWork, pendingDeurId, mode: runtime.environment.mode, configurationError: runtime.configurationError, canonicalBusy, offlineSyncState, offlinePendingCount, uatSessionState, offlineContinuationSnapshot, requiresOnlineFirstSignIn, getLoginError:()=>loginErrorRef.current, login, loginReliever, loginMainOperator, resumeDeur, refreshCanonicalWork, startCanonicalDeur, transitionCanonicalActivity, endCanonicalShift, submitCanonicalDeur, initiateCanonicalTurnover, acceptCanonicalTurnover, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
