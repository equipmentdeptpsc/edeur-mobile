import type { Session, SupabaseClient } from '@supabase/supabase-js';
import type { CanonicalEnvironment } from './environment';
import type { CanonicalSessionIdentity } from './contracts.generated';

export interface CanonicalAuthenticationResult {
  session: Session;
  identity: CanonicalSessionIdentity;
}

export type CanonicalAuthenticationFailureCode = 'INVALID_CREDENTIALS' | 'AUTH_SERVICE_UNAVAILABLE' | 'OPERATOR_LINKAGE' | 'SESSION_INITIALIZATION' | 'CONFIGURATION';

export class CanonicalAuthenticationError extends Error {
  constructor(readonly code:CanonicalAuthenticationFailureCode,message:string){super(message);this.name='CanonicalAuthenticationError';}
}

export class CanonicalAuthenticationRepository {
  constructor(private readonly client: SupabaseClient, private readonly environment: CanonicalEnvironment) {}

  async signIn(identifierInput: string, password: string): Promise<CanonicalAuthenticationResult> {
    const identifier = identifierInput.trim();
    if (!identifier || !password) throw new CanonicalAuthenticationError('INVALID_CREDENTIALS','Invalid username or password.');
    const session = identifier.includes('@')
      ? await this.emailSession(identifier, password)
      : await this.usernameSession(identifier, password);
    const identity = await this.resolveIdentity(session.user.id);
    return { session, identity };
  }

  async signOut(): Promise<void> { await this.client.auth.signOut(); }

  async restoreSession(): Promise<CanonicalAuthenticationResult | null> {
    const session = await this.initialSession();
    if (!session) return null;
    try {
      return { session, identity: await this.resolveIdentity(session.user.id) };
    } catch { return null; }
  }

  private initialSession(): Promise<Session | null> {
    return new Promise((resolve) => {
      let settled = false;
      let unsubscribe: (() => void) | undefined;
      const finish = (session: Session | null) => {
        if (settled) return;
        settled = true;
        unsubscribe?.();
        resolve(session);
      };
      const { data } = this.client.auth.onAuthStateChange((event, session) => {
        if (event === 'INITIAL_SESSION') finish(session);
      });
      unsubscribe = () => data.subscription.unsubscribe();
      if (settled) unsubscribe();
    });
  }

  private async emailSession(email: string, password: string): Promise<Session> {
    const response = await this.client.auth.signInWithPassword({ email, password });
    if (response.error || !response.data.session) throw new CanonicalAuthenticationError('INVALID_CREDENTIALS','Invalid username or password.');
    return response.data.session;
  }

  private async usernameSession(identifier: string, password: string): Promise<Session> {
    if (!this.environment.apiBaseUrl) throw new CanonicalAuthenticationError('CONFIGURATION','UAT configuration is unavailable.');
    let response:Response;
    try{response=await fetch(`${this.environment.apiBaseUrl}/api/auth/username-login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({identifier,password})});}
    catch{throw new CanonicalAuthenticationError('AUTH_SERVICE_UNAVAILABLE','Unable to reach UAT authentication service.');}
    const payload = await response.json().catch(() => null) as { success?: boolean; session?: { accessToken?: unknown; refreshToken?: unknown } } | null;
    if (!response.ok || payload?.success !== true || typeof payload.session?.accessToken !== 'string' || typeof payload.session.refreshToken !== 'string') {
      throw new CanonicalAuthenticationError('INVALID_CREDENTIALS','Invalid username or password.');
    }
    const installed = await this.client.auth.setSession({ access_token: payload.session.accessToken, refresh_token: payload.session.refreshToken });
    if (installed.error || !installed.data.session) throw new CanonicalAuthenticationError('SESSION_INITIALIZATION','Unable to initialize the authenticated session.');
    return installed.data.session;
  }

  private async resolveIdentity(authUserId: string): Promise<CanonicalSessionIdentity> {
    const userResponse = await this.client.schema('erp').from('users').select('id,company_id,operator_id,status').eq('id', authUserId).maybeSingle();
    const user = userResponse.data as { id?: unknown; company_id?: unknown; operator_id?: unknown; status?: unknown } | null;
    if (userResponse.error || typeof user?.id !== 'string' || user.status !== 'active' || typeof user.company_id !== 'string' || typeof user.operator_id !== 'string') {
      await this.client.auth.signOut();
      throw new CanonicalAuthenticationError('OPERATOR_LINKAGE','Your account is not linked to an active Operator.');
    }
    const operatorResponse = await this.client.schema('erp').from('operators').select('id,name,status').eq('id', user.operator_id).maybeSingle();
    const operator = operatorResponse.data as { id?: unknown; name?: unknown; status?: unknown } | null;
    if (operatorResponse.error || typeof operator?.id !== 'string' || typeof operator.name !== 'string' || operator.status !== 'Active') {
      await this.client.auth.signOut();
      throw new CanonicalAuthenticationError('OPERATOR_LINKAGE','Your account is not linked to an active Operator.');
    }
    return { authUserId, applicationUserId: user.id, companyId: user.company_id, operatorId: operator.id, operatorName: operator.name };
  }
}
