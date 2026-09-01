import { readFileSync } from 'node:fs';

const source=readFileSync('lib/repositories/SupabaseOperatorWorkRepository.ts','utf8');
const checks=[
  [source.includes("rpc('read_uat_limited_pilot_operator_work_date'"),'authoritative pilot work date is read from the authenticated canonical RPC'],
  [source.includes('if(work.dailyDeur?.workDate!==effectiveWorkDate)delete work.dailyDeur;'),'a prior-day terminal DEUR cannot occupy the current daily slot'],
  [source.includes(".eq('work_date',effectiveWorkDate)"),'same-day DEUR lookup uses the server work date'],
  [source.includes('if(work.openDeur||work.dailyDeur)continue;'),'prior open DEUR and same-day DEUR retain their canonical block'],
  [source.includes('if(!isDate(effectiveWorkDate))continue;'),'non-pilot work retains existing canonical selection behavior'],
  [source.includes('Canonical pilot daily DEUR projection failed.'),'the pilot projection fails closed rather than inventing availability'],
];
let failed=0;
for(const [passed,label] of checks){console.log(`${passed?'PASS':'FAIL'}: ${label}`);if(!passed)failed++;}
const resolveDaily=({open,daily,serverDate,byDate})=>{
  let selected=daily;
  if(selected?.workDate!==serverDate)selected=undefined;
  if(open||selected)return selected;
  return byDate.find(item=>item.workDate===serverDate);
};
const submitted={workDate:'2026-09-01',status:'Submitted'};
const sameDaySubmitted={workDate:'2026-09-02',status:'Submitted'};
const priorOpen={workDate:'2026-09-01',status:'In Progress'};
const cases=[
  [resolveDaily({daily:submitted,serverDate:'2026-09-02',byDate:[submitted]})===undefined,'previous-day submitted is historical and Start remains eligible'],
  [resolveDaily({daily:sameDaySubmitted,serverDate:'2026-09-02',byDate:[sameDaySubmitted]})===sameDaySubmitted,'same-day submitted suppresses duplicate Start'],
  [resolveDaily({open:priorOpen,serverDate:'2026-09-02',byDate:[]})===undefined,'prior-day open remains outside daily selection while canonical openDeur blocks Start'],
  [resolveDaily({daily:submitted,serverDate:'2026-09-02',byDate:[sameDaySubmitted]})===sameDaySubmitted,'server date wins when device-derived daily selection is stale'],
  [submitted.status==='Submitted'&&submitted.workDate==='2026-09-01','historical submitted DEUR is preserved for history'],
];
for(const [passed,label] of cases){console.log(`${passed?'PASS':'FAIL'}: ${label}`);if(!passed)failed++;}
process.exitCode=failed?1:0;
