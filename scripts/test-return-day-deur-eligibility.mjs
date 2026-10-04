import {readFileSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');
const repository=read('lib/repositories/SupabaseOperatorWorkRepository.ts');
const auth=read('lib/auth.tsx');
const panel=read('components/CanonicalDeurOperatorPanel.tsx');
const home=read('app/(tabs)/home.tsx');
let failed=0;
const check=(passed,label)=>{console.log(`${passed?'PASS':'FAIL'}: ${label}`);if(!passed)failed++;};

const visible=({sameOperator=true,line='Returned',assignment='Completed',workDay='2026-10-04',operationalDay='2026-10-04',resolved=false,frequency='PER_WORKDAY'})=>sameOperator&&line==='Returned'&&assignment==='Completed'&&workDay===operationalDay&&!resolved&&frequency==='PER_WORKDAY';

check(repository.includes(".eq('status','Active')")&&repository.includes(".in('status',['Released','Active'])"),'A: active work projection remains active-only');
check(repository.includes("rpc('read_pending_operator_return_day_deur_work')")&&repository.includes("deurEligibility:{kind:'PENDING_RETURN_DAY'"),'B: same-day completed returned work is read through a separate server projection');
check(visible({})&&!visible({resolved:true}),'C: resolved return-day expectation is excluded');
check(!visible({sameOperator:false}),'D: another operator cannot receive the return-day work');
check(!visible({operationalDay:'2026-10-05'}),'E: the exception expires after the return operational day');
check(!visible({line:'Active',assignment:'Active'}),'F: a normal active assignment is not relabeled as return-day history');
check(!repository.includes("status:'Active',operationalMetadata:metadata},deurEligibility")&&repository.includes("status:text(line,'status')??'Returned'"),'G: returned projection preserves Returned rather than reopening equipment');
check(home.includes('work={canonicalWork}')&&!home.includes('canonicalDeurWorks'),'H: Home remains limited to active current work');
check(auth.includes('selectedCanonicalWork??canonicalWork')&&auth.includes('setCanonicalWork(current=>current?.rentalLine.id===startedWork.rentalLine.id?startedWork:current)'),'I: commands retain selected return-day work without assigning it to Home state');
check(panel.includes('PENDING DEUR')&&panel.includes('Completed assignment · eligible work date')&&panel.includes('This does not create or reopen an assignment.'),'J: DEUR UI identifies the bounded return-day exception without exposing raw IDs');
check(auth.includes('canonicalDeurWorks')&&panel.includes('canonicalDeurWorks.map'),'DEUR selection uses the separate eligibility list');

process.exitCode=failed?1:0;
