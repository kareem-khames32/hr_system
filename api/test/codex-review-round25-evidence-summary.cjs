'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),scope=require('./codex-review-round25-scope-evidence.cjs')
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
assert.equal(git(['rev-parse','HEAD']),scope.target)
const finalRuns=['prior-independent','affected','policy-publish','boundaries-corrected','exemption-edges','correction-final-v2','ui']
const selected=finalRuns.map(suffix=>{
 const file=`codex-review-round25-results-${suffix}.cjs`,r=require(path.join(__dirname,file))
 return {file,selected:r.selected,counts:r.summary.counts,failures:r.failures.map(f=>({file:f.file,name:f.name,error:f.error}))}
})
const unique=new Map()
for(const suffix of finalRuns)for(const r of require(`./codex-review-round25-results-${suffix}.cjs`).results){
 const key=r.file+':'+r.name;assert.ok(!unique.has(key));unique.set(key,r)
}
const failures=[...unique.values()].filter(r=>!r.pass)
const output={target:scope.target,comparison:'31cd394..f7a184e',finalRuns:selected,
 finalUniqueCounts:{tests:unique.size,passed:[...unique.values()].filter(r=>r.pass).length,failed:failures.length},
 findingTests:failures.map(r=>({name:r.name,file:r.file})),
 earlierAttemptsPreserved:{
  'results-boundaries':'Test fixture initially used BRANCH instead of documented lowercase branch; corrected only the new round25 test.',
  'results-correction-final':'Test initially expected 403 for a hidden item; item endpoint correctly returns 404. Updated only the new round25 assertion, then reproduced the actual supplementary-data leak.',
  'results-correction-edges':'First reproduction of the two blockers, before adding the payslip follow-up.'},
 sourceInspection:{
  reversalLedgerUnchangedFrom31cd394:git(['diff','31cd394','f7a184e','--','api/src/payroll/payroll-reversal-ledger.ts'])==='',
  previousForwardCalledApply:git(['show','31cd394:api/src/payroll/payroll.service.ts']).includes('const result = await this.applyRunMembership(em, user, run, { ...change, reason })'),
  runtimeBaselineExecuted:false,
  distinction:'Existing code provenance read in git; all runtime reproductions ran at f7a184e. No claim that either defect was newly introduced.'
 },
 staticChecks:require('./codex-review-round25-static-checks.cjs'),performanceMeasured:false}
fs.writeFileSync(path.join(__dirname,'codex-review-round25-evidence-results.cjs'),'module.exports = '+JSON.stringify(output,null,2)+'\n')
console.log(JSON.stringify({target:scope.target,...output.finalUniqueCounts,sourceInspection:output.sourceInspection}))
