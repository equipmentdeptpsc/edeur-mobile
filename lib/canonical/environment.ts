import Constants from 'expo-constants';
import type { MobileRuntimeMode } from './contracts.generated';

export interface CanonicalEnvironment {
  mode: MobileRuntimeMode;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  apiBaseUrl?: string;
  projectRef?: string;
}

export interface CanonicalEnvironmentDiagnostics {
  environment: MobileRuntimeMode;
  canonicalConfig: 'READY' | 'BLOCKED';
  canonicalAuth: 'ENABLED' | 'DISABLED';
  demoMode: 'ENABLED' | 'DISABLED';
  demoFallback: 'DISABLED';
  configSource: 'APP_CONFIG_EXTRA';
}

type AppConfigExtra = { canonicalUat?: Record<string, unknown> };
const text = (value: unknown): string | undefined => typeof value === 'string' && value.trim() ? value.trim() : undefined;
const expoEnvironment = (): Record<string, string | undefined> => {
  const extra = Constants.expoConfig?.extra as AppConfigExtra | undefined;
  const canonicalUat = extra?.canonicalUat;
  return {
    EXPO_PUBLIC_EDEUR_MODE: text(canonicalUat?.mode),
    EXPO_PUBLIC_SUPABASE_URL: text(canonicalUat?.supabaseUrl),
    EXPO_PUBLIC_SUPABASE_ANON_KEY: text(canonicalUat?.supabaseAnonKey),
    EXPO_PUBLIC_ERMS_API_URL: text(canonicalUat?.apiBaseUrl),
  };
};

export const resolvedRuntimeMode = (source: Record<string, string | undefined> = expoEnvironment()): MobileRuntimeMode => source.EXPO_PUBLIC_EDEUR_MODE?.trim() === 'DEMO' ? 'DEMO' : 'UAT';

export function readCanonicalEnvironment(source: Record<string, string | undefined> = expoEnvironment()): CanonicalEnvironment {
  // Fail closed when the mode injection is missing. Demo is opt-in only;
  // an isolated-UAT build must never silently downgrade to demo credentials.
  const requestedMode = source.EXPO_PUBLIC_EDEUR_MODE?.trim() || 'UAT';
  if (requestedMode !== 'DEMO' && requestedMode !== 'UAT') throw new Error('eDEUR mode must be explicitly DEMO or UAT.');
  const mode = resolvedRuntimeMode(source);
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

export function canonicalEnvironmentDiagnostics(environment: CanonicalEnvironment, configurationError: string | null): CanonicalEnvironmentDiagnostics {
  const canonicalReady = environment.mode === 'UAT' && configurationError === null;
  return {
    environment: environment.mode,
    canonicalConfig: canonicalReady ? 'READY' : 'BLOCKED',
    canonicalAuth: canonicalReady ? 'ENABLED' : 'DISABLED',
    demoMode: environment.mode === 'DEMO' ? 'ENABLED' : 'DISABLED',
    demoFallback: 'DISABLED',
    configSource: 'APP_CONFIG_EXTRA',
  };
}
