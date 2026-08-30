import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { CanonicalEnvironment } from './environment';

export function createCanonicalClient(environment: CanonicalEnvironment): SupabaseClient {
  if (environment.mode !== 'UAT' || !environment.supabaseUrl || !environment.supabaseAnonKey) {
    throw new Error('Canonical Supabase client is available only in a fully configured UAT environment.');
  }
  return createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
}
