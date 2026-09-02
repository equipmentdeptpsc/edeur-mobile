import { readCanonicalEnvironment, type CanonicalEnvironment } from './environment';
import { createCanonicalClient } from './client';
import { CanonicalAuthenticationRepository } from './authentication';
import { CanonicalDeurCommandRepository } from './commandRepository';
import { OfflineDeurCommandOutbox } from './offlineOutbox';
import { OfflineContinuationRepository } from './offlineContinuation';
import { selectOperatorWorkRepository } from '../repositories/selectOperatorWorkRepository';
import type { OperatorWorkRepository } from '../repositories/OperatorWorkRepository';

export interface CanonicalRuntime {
  environment: CanonicalEnvironment;
  configurationError: string | null;
  authentication?: CanonicalAuthenticationRepository;
  workRepository?: OperatorWorkRepository;
  commands?: CanonicalDeurCommandRepository;
  offlineOutbox?: OfflineDeurCommandOutbox;
  offlineContinuation?: OfflineContinuationRepository;
}

export function createMobileRuntime(): CanonicalRuntime {
  try {
    const environment=readCanonicalEnvironment();
    if(environment.mode==='DEMO')return{environment,configurationError:null,workRepository:selectOperatorWorkRepository(environment)};
    const client=createCanonicalClient(environment);
    return{environment,configurationError:null,authentication:new CanonicalAuthenticationRepository(client,environment),workRepository:selectOperatorWorkRepository(environment,client),commands:new CanonicalDeurCommandRepository(client),offlineOutbox:new OfflineDeurCommandOutbox(),offlineContinuation:new OfflineContinuationRepository()};
  }catch(error){
    // Demo is explicit opt-in. If UAT configuration fails (including when
    // Expo was started without .env.uat), remain in UAT and surface the
    // configuration blocker instead of silently rendering the demo PIN flow.
    const mode=process.env.EXPO_PUBLIC_EDEUR_MODE?.trim()==='DEMO'?'DEMO':'UAT';
    return{environment:{mode},configurationError:error instanceof Error?error.message:'Canonical configuration failed.'};
  }
}

export const mobileRuntime=createMobileRuntime();
