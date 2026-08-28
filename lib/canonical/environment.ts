import type { MobileRuntimeMode } from './contracts.generated';

export interface CanonicalEnvironment {
  mode: MobileRuntimeMode;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  apiBaseUrl?: string;
  projectRef?: string;
}

const expoEnvironment = (): Record<string, string | undefined> => ({
  EXPO_PUBLIC_EDEUR_MODE: process.env.EXPO_PUBLIC_EDEUR_MODE,
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  EXPO_PUBLIC_ERMS_API_URL: process.env.EXPO_PUBLIC_ERMS_API_URL,
});

export function readCanonicalEnvironment(source: Record<string, string | undefined> = expoEnvironment()): CanonicalEnvironment {
  const requestedMode = source.EXPO_PUBLIC_EDEUR_MODE?.trim() || 'DEMO';
  if (requestedMode !== 'DEMO' && requestedMode !== 'UAT') throw new Error('eDEUR mode must be explicitly DEMO or UAT.');
  const mode = requestedMode;
  if (mode === 'DEMO') return { mode };
  const supabaseUrl = source.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = source.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const apiBaseUrl = source.EXPO_PUBLIC_ERMS_API_URL?.trim();
  if (!supabaseUrl || !supabaseAnonKey || !apiBaseUrl) throw new Error('UAT canonical configuration is incomplete. Demo fallback is disabled.');
  const parsed = new URL(supabaseUrl);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || !parsed.hostname.endsWith('.supabase.co')) throw new Error('UAT Supabase URL is invalid.');
  const projectRef = parsed.hostname.slice(0, -'.supabase.co'.length);
  if (projectRef !== 'jtkctarqbwmqdcewthkn') throw new Error('UAT Supabase project does not match the approved isolated project.');
  const api = new URL(apiBaseUrl);
  if (api.protocol !== 'https:' || api.username || api.password) throw new Error('UAT API URL is invalid.');
  return { mode, supabaseUrl, supabaseAnonKey, apiBaseUrl: api.origin, projectRef };
}
