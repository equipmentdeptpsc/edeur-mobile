import { readCanonicalEnvironment, type CanonicalEnvironment } from './environment';
import { createCanonicalClient } from './client';
import { CanonicalAuthenticationRepository } from './authentication';
import { CanonicalDeurCommandRepository } from './commandRepository';
import { OfflineDeurCommandOutbox } from './offlineOutbox';
import { selectOperatorWorkRepository } from '../repositories/selectOperatorWorkRepository';
import type { OperatorWorkRepository } from '../repositories/OperatorWorkRepository';

export interface CanonicalRuntime {
  environment: CanonicalEnvironment;
  configurationError: string | null;
  authentication?: CanonicalAuthenticationRepository;
  workRepository?: OperatorWorkRepository;
  commands?: CanonicalDeurCommandRepository;
  offlineOutbox?: OfflineDeurCommandOutbox;
}

export function createMobileRuntime(): CanonicalRuntime {
  try {
    const environment=readCanonicalEnvironment();
    if(environment.mode==='DEMO')return{environment,configurationError:null,workRepository:selectOperatorWorkRepository(environment)};
    const client=createCanonicalClient(environment);
    return{environment,configurationError:null,authentication:new CanonicalAuthenticationRepository(client,environment),workRepository:selectOperatorWorkRepository(environment,client),commands:new CanonicalDeurCommandRepository(client),offlineOutbox:new OfflineDeurCommandOutbox()};
  }catch(error){return{environment:{mode:process.env.EXPO_PUBLIC_EDEUR_MODE==='UAT'?'UAT':'DEMO'},configurationError:error instanceof Error?error.message:'Canonical configuration failed.'};}
}

export const mobileRuntime=createMobileRuntime();
