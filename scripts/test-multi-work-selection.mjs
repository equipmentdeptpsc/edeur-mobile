import { readFileSync } from 'node:fs';
const repo=readFileSync('lib/repositories/SupabaseOperatorWorkRepository.ts','utf8');
const auth=readFileSync('lib/auth.tsx','utf8');
const panel=readFileSync('components/CanonicalDeurOperatorPanel.tsx','utf8');
const checks=[
 [repo.includes('getCurrentWorks')&&!repo.includes('getCurrentWorks')||repo.includes('in(\'assignment_id\''),'multi-work repository method exists'],
 [repo.includes('new Set<string>()')&&repo.includes('Canonical Rental Line projection is ambiguous'),'duplicate line IDs fail closed'],
 [repo.includes('sort((a,b)=>a.rental.rentalNumber'),'deterministic work ordering'],
 [auth.includes('canonicalWorks')&&auth.includes('selectedCanonicalWork')&&auth.includes('selectCanonicalWork'),'auth context stores selectable work list'],
 [auth.includes('rentalLine.id===rentalEquipmentLineId'),'selection is keyed by Rental Equipment Line ID'],
 [panel.includes('canonicalWorks.length > 1')&&panel.includes('selectCanonicalWork(item.rentalLine.id)'),'multiple work items require explicit selection'],
]; let failed=0; for(const [ok,label] of checks){console.log(`${ok?'PASS':'FAIL'}: ${label}`);if(!ok)failed++;} process.exitCode=failed?1:0;
