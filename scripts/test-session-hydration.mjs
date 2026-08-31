import fs from 'node:fs';

const auth = fs.readFileSync('lib/auth.tsx', 'utf8');
const repository = fs.readFileSync('lib/repositories/SupabaseOperatorWorkRepository.ts', 'utf8');
const checks = [
  ['core session applies work before optional turnover loading', /setCanonicalWork\(work\)[\s\S]*loadTurnoverTargets/],
  ['turnover failure does not reject core session hydration', /core work remains rendered/],
  ['repository exposes separate turnover loading', /async loadTurnoverTargets\(work/],
  ['core work reads do not await turnover eligibility', !/for\(const work of works\) await this\.attachTurnoverTargets\(work\)/.test(repository)],
];
let failed = 0;
for (const [name, check] of checks) {
  const pass = check instanceof RegExp ? check.test(auth + repository) : check;
  console.log(`${pass ? 'PASS' : 'FAIL'}: ${name}`);
  if (!pass) failed++;
}
process.exitCode = failed ? 1 : 0;
