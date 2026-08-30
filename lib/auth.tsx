import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { mockRepository } from './mockRepository';
import type { Operator } from './types';
import type { CanonicalActivity, CanonicalCommandResult, CanonicalOperatorWork } from './canonical/contracts.generated';
import { mobileRuntime as runtime } from './canonical/runtime';
import { CanonicalAuthenticationError } from './canonical/authentication';

interface AuthContextValue {
  operator: Operator | null;
  canonicalWork: CanonicalOperatorWork | null;
  canonicalWorks: CanonicalOperatorWork[];
  selectedCanonicalWork: CanonicalOperatorWork | null;
  selectCanonicalWork: (rentalEquipmentLineId: string) => void;
  pendingDeurId: string | null;
  mode: 'DEMO' | 'UAT';
  configurationError: string | null;
  canonicalBusy: boolean;
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
  const [operator, setOperator] = useState<Operator | null>(loadSession());
  const [canonicalWork, setCanonicalWork] = useState<CanonicalOperatorWork | null>(null);
  const [canonicalWorks, setCanonicalWorks] = useState<CanonicalOperatorWork[]>([]);
  const [selectedCanonicalWork, setSelectedCanonicalWork] = useState<CanonicalOperatorWork | null>(null);
  const [pendingDeurId, setPendingDeurId] = useState<string | null>(loadPendingDeurId());
  const [canonicalBusy, setCanonicalBusy] = useState(false);
  const loginErrorRef = useRef<string | null>(null);
  const canonicalBusyRef = useRef(false);
  const commandIds = useRef(new Map<string, string>());

  const login = async (identifier: string, password?: string) => {
    loginErrorRef.current=null;
    if (runtime.environment.mode === 'UAT') {
      if (runtime.configurationError || !runtime.authentication || !runtime.workRepository || !password) return false;
      try {
        const authenticated = await runtime.authentication.signIn(identifier, password);
        const works = runtime.workRepository.getCurrentWorks ? await runtime.workRepository.getCurrentWorks(authenticated.identity) : await runtime.workRepository.getCurrentWork(authenticated.identity).then(value=>value?[value]:[]); const work = works.length===1?works[0]:null; setCanonicalWorks(works); setSelectedCanonicalWork(work); setCanonicalWork(work);
        setOperator({ id: authenticated.identity.operatorId, name: authenticated.identity.operatorName, loginName: identifier, initials: authenticated.identity.operatorName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase(), isReliever: false });
        setPendingDeurId(work?.openDeur?.id ?? null);
        return true;
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
    setOperator(null);
    setCanonicalWork(null); setCanonicalWorks([]); setSelectedCanonicalWork(null);
    setPendingDeurId(null);
    clearSession();
  };

  const failure = (code: string): CanonicalCommandResult => ({ success: false, code });
  const refreshCanonicalWork = async () => {
    if (runtime.environment.mode !== 'UAT' || !canonicalWork || !runtime.workRepository) return false;
    try {
      const works = runtime.workRepository.getCurrentWorks ? await runtime.workRepository.getCurrentWorks(canonicalWork.identity) : await runtime.workRepository.getCurrentWork(canonicalWork.identity).then(value=>value?[value]:[]); const work = works.find(item=>item.rentalLine.id===canonicalWork.rentalLine.id) ?? (works.length===1?works[0]:null); setCanonicalWorks(works); setSelectedCanonicalWork(work); setCanonicalWork(work);
      setPendingDeurId(work?.openDeur?.id ?? null);
      return true;
    } catch { return false; }
  };
  const runCanonical = async (key: string, action: (identity: string) => Promise<CanonicalCommandResult>) => {
    if (canonicalBusyRef.current) return failure('ACTION_IN_PROGRESS');
    let identity = commandIds.current.get(key);
    if (!identity) { identity = crypto.randomUUID(); commandIds.current.set(key, identity); }
    canonicalBusyRef.current = true;
    setCanonicalBusy(true);
    try {
      const result = await action(identity);
      if (result.success || !result.retryable) commandIds.current.delete(key);
      if (result.success || result.refreshRequired) await refreshCanonicalWork();
      return result;
    } finally { canonicalBusyRef.current = false; setCanonicalBusy(false); }
  };
  const startCanonicalDeur: AuthContextValue['startCanonicalDeur'] = async (optional = {}) => {
    if (!canonicalWork || canonicalWork.openDeur || canonicalWork.dailyDeur || !runtime.commands) return failure(canonicalWork?.openDeur ? 'PRIOR_OPEN_DEUR' : canonicalWork?.dailyDeur ? 'DAILY_DEUR_EXISTS' : 'NO_AUTHORIZED_WORK');
    const draftKey = 'start-draft';
    let draftId = commandIds.current.get(draftKey);
    if (!draftId) { draftId = crypto.randomUUID(); commandIds.current.set(draftKey, draftId); }
    const result = await runCanonical('start', (identity) => runtime.commands!.start(canonicalWork, identity, draftId!, optional));
    if (result.success || !result.retryable) commandIds.current.delete(draftKey);
    return result;
  };
  const transitionCanonicalActivity: AuthContextValue['transitionCanonicalActivity'] = async (activity, reason) => {
    const deur = canonicalWork?.openDeur;
    if (!canonicalWork || !deur || !runtime.commands) return failure('NO_OPEN_DEUR');
    return runCanonical(`transition:${activity}`, (identity) => runtime.commands!.transition(canonicalWork, deur.id, deur.rowVersion, activity, identity, reason));
  };
  const endCanonicalShift: AuthContextValue['endCanonicalShift'] = async (evidence = {}) => {
    const deur = canonicalWork?.openDeur;
    if (!canonicalWork || !deur || !runtime.commands) return failure('NO_OPEN_DEUR');
    return runCanonical('end-shift', (identity) => runtime.commands!.endShift(canonicalWork, deur.id, deur.rowVersion, identity, evidence));
  };
  const submitCanonicalDeur = async () => {
    const deur = canonicalWork?.openDeur;
    if (!canonicalWork || !deur || !runtime.commands) return failure('NO_OPEN_DEUR');
    return runCanonical('submit', (identity) => runtime.commands!.submit(canonicalWork, deur.id, deur.rowVersion, identity));
  };

  const selectCanonicalWork = (rentalEquipmentLineId:string) => { const work=canonicalWorks.find(item=>item.rentalLine.id===rentalEquipmentLineId) ?? null; setSelectedCanonicalWork(work); setCanonicalWork(work); setPendingDeurId(work?.openDeur?.id ?? null); };
  return (
    <AuthContext.Provider value={{ operator, canonicalWork, canonicalWorks, selectedCanonicalWork, selectCanonicalWork, pendingDeurId, mode: runtime.environment.mode, configurationError: runtime.configurationError, canonicalBusy, getLoginError:()=>loginErrorRef.current, login, loginReliever, loginMainOperator, resumeDeur, refreshCanonicalWork, startCanonicalDeur, transitionCanonicalActivity, endCanonicalShift, submitCanonicalDeur, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
