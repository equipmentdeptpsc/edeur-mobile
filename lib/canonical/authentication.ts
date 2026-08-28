import type { Session, SupabaseClient } from '@supabase/supabase-js';
import type { CanonicalEnvironment } from './environment';
import type { CanonicalSessionIdentity } from './contracts.generated';

export interface CanonicalAuthenticationResult {
  session: Session;
  identity: CanonicalSessionIdentity;
}

export class CanonicalAuthenticationRepository {
  constructor(private readonly client: SupabaseClient, private readonly environment: CanonicalEnvironment) {}

  async signIn(identifierInput: string, password: string): Promise<CanonicalAuthenticationResult> {
    const identifier = identifierInput.trim();
    if (!identifier || !password) throw new Error('Username/email and password are required.');
    const session = identifier.includes('@')
      ? await this.emailSession(identifier, password)
      : await this.usernameSession(identifier, password);
    const identity = await this.resolveIdentity(session.user.id);
    return { session, identity };
  }

  async signOut(): Promise<void> { await this.client.auth.signOut(); }

  private async emailSession(email: string, password: string): Promise<Session> {
    const response = await this.client.auth.signInWithPassword({ email, password });
    if (response.error || !response.data.session) throw new Error('Invalid username/email or password.');
    return response.data.session;
  }

  private async usernameSession(identifier: string, password: string): Promise<Session> {
    if (!this.environment.apiBaseUrl) throw new Error('Trusted username authentication is unavailable.');
    const response = await fetch(`${this.environment.apiBaseUrl}/api/auth/username-login`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identifier, password }),
    });
    const payload = await response.json().catch(() => null) as { success?: boolean; session?: { accessToken?: unknown; refreshToken?: unknown } } | null;
    if (!response.ok || payload?.success !== true || typeof payload.session?.accessToken !== 'string' || typeof payload.session.refreshToken !== 'string') {
      throw new Error('Invalid username/email or password.');
    }
    const installed = await this.client.auth.setSession({ access_token: payload.session.accessToken, refresh_token: payload.session.refreshToken });
    if (installed.error || !installed.data.session) throw new Error('Invalid username/email or password.');
    return installed.data.session;
  }

  private async resolveIdentity(authUserId: string): Promise<CanonicalSessionIdentity> {
    const userResponse = await this.client.schema('erp').from('users').select('id,company_id,operator_id,status').eq('id', authUserId).maybeSingle();
    const user = userResponse.data as { id?: unknown; company_id?: unknown; operator_id?: unknown; status?: unknown } | null;
    if (userResponse.error || typeof user?.id !== 'string' || user.status !== 'active' || typeof user.company_id !== 'string' || typeof user.operator_id !== 'string') {
      await this.client.auth.signOut();
      throw new Error('Authenticated user is not linked to an active Operator.');
    }
    const operatorResponse = await this.client.schema('erp').from('operators').select('id,name,status').eq('id', user.operator_id).maybeSingle();
    const operator = operatorResponse.data as { id?: unknown; name?: unknown; status?: unknown } | null;
    if (operatorResponse.error || typeof operator?.id !== 'string' || typeof operator.name !== 'string' || operator.status !== 'Active') {
      await this.client.auth.signOut();
      throw new Error('Linked Operator is unavailable or inactive.');
    }
    return { authUserId, applicationUserId: user.id, companyId: user.company_id, operatorId: operator.id, operatorName: operator.name };
  }
}
