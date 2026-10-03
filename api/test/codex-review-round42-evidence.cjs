'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const scope=require('./codex-review-round42-scope-evidence.cjs'),cases=new Map(),diagnostics=[],databases=new Set()
const executions=['previous41','mixed','mixed-confirmed','affected','profile-confirmed','mixed-final'].map(suffix=>{
 const file=`codex-review-round42-results-${suffix}.cjs`,r=require('./'+file)
 for(const row of r.results)cases.set(row.file+':'+row.name,{...row,evidence:file})
 for(const s of r.diagnostics||[])try{const d=JSON.parse(s);if(d.case)diagnostics.push(d)}catch{}
 for(const s of r.stdout||[])for(const m of s.matchAll(/CR5_DATABASE (\{[^\r\n]+\})/g)){const row=JSON.parse(m[1]);if(row.operation==='CREATE')databases.add(row.database)}
 return {file,files:r.selected,counts:r.summary.counts,failures:r.failures.map(x=>({file:x.file,name:x.name,error:x.error,cause:x.cause}))}
})
const finalCases=[...cases.values()],counts={tests:finalCases.length,passed:finalCases.filter(x=>x.pass&&!x.skip).length,failed:finalCases.filter(x=>!x.pass).length,skipped:finalCases.filter(x=>x.skip).length}
assert.equal(counts.tests,371);assert.equal(counts.failed,0);assert.equal(counts.skipped,0)
assert.equal(databases.size,30)
const affected=new Set(require('./codex-review-round42-results-affected.cjs').selected.map(x=>x+'.integration.cjs'))
assert.equal(finalCases.filter(x=>affected.has(x.file)).length,351)
const result={target:scope.target,productRange:'2cb8883..ce15142',relatedCodeLimit:'162d50e..ce15142',verdict:'APPROVE',counts,executions,finalCases,diagnostics,databasesCreated:databases.size,
 closures:[{id:'CR41-B01',closed:true,
  proof:'The prior live oracle test passes unchanged at this revision. Ordinary self-service account without payroll.view gets identical own-payslip JSON with no query, own ID, nonexistent ID, foreign employee with no payroll, foreign August payroll and foreign July payroll. Direct foreign item still returns 404. Five further query forms, including duplicate employeeId and employee[id], also leave the own-payslip body unchanged.',
  implementationRead:'The interceptor now reads only authenticated user from the request. Employee contexts come from response employeeId or employee.id, and nearest employee context replaces inherited context. describePayrollItemsLines and run breakdown scrub per employee, not by a union. Full four-file product delta read.'}],
 findings:[],
 controls:{mixedRealCycle:{originalPeriod:'2026-07',currentPeriod:'2026-11',base:[6000,9000],restoredCredits:[11.11,22.22],currentNet:[6011.11,9022.22],total:15033.33,reversal:-15033.33,
  lifecycle:'Real allowance creation, calculate, approve, pay, reversal and actual employee transfer through the API, followed by another calculate/approve/pay. Synthetic employee and attendance exemption setup only.',
  perEmployeeText:'Same old July run, one employee originally in A and one in B. Reader A sees July text for A employee and redacted text for transferred B employee within the same current response. Verified on payslips, run lines, monthly lines, approval review and financial register. Original mixed run access 403; fully in-scope current run 200.',
  keys:'Payslip, table, monthly lines and approval review line objects match per employee; columns contain exactly one matching key/name. Company and self retain original text.',
  immutableReads:'Full stored run/item/obligation/event snapshots are deep-equal before and after reads and query variants.'},
  priorSevenReaders:true,priorHmacPublicDictionaryNoMatch:true,priorScopeLabelControls:true,
  serializedUntrustedPayload:'Pure walker control only: client-authored JSON stored as a string is not parsed as employee context. This is not presented as a separate HTTP exploit test.'},
 fixtureCorrections:[
  {execution:'mixed',cause:'My initial transfer fixture sent departmentId:null and correctly received 400. Supplied a real in-scope department in the new round42 test, then both tests passed. No product assertion had run in the failed attempt.'},
  {execution:'affected',case:'PD-05 self photo download',cause:'Express ignores dot-directory paths in the supplied .claude worktree. Restricted test transport adaptation to private hr-profile-files-*/YYYY-MM/<uuid>.png alongside existing SEC07 PDF fixture. All six unchanged profile tests then passed, including foreign HR and peer 403s. Authorization and storage checks unchanged.'}
 ],
 limitations:{fullIntegrationSuite:false,fullUnitSuite:false,textUnitTests:8,browser:false,oldRevisionRuntime:false,performanceMeasured:false,newMigrations:false,
  environment:'Real Nest guards/pipes/controllers/interceptors/services in-process without a listening HTTP service. SQL Server2022 compatibility150, not native SQL2019. Existing migration fixtures only on our disposable databases under prior explicit permission.',
  reviewed:'Full four-file product delta plus related readers and response shapes inside authorized range. Inspected request payload serialization and financial report aggregation; no additional reproduced disclosure found. This is not an exhaustive audit of every route.',
  fixtures:'Prior round40 legacy-header controls and product explicitly seeded debit/breakdown text remain documented fixtures. New mixed scenario uses actual product-produced restored-credit text.',
  scope:'Main phase0/phase1/phase2 untouched. Owner decisions not reclassified. No product/old-test edits, company-data writes, service changes, or performance measurements.'},
 staticChecks:require('./codex-review-round42-static-checks.cjs')}
fs.writeFileSync(path.join(__dirname,'codex-review-round42-evidence-results.cjs'),'module.exports = '+JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify({target:result.target,counts,databasesCreated:databases.size,affected:{files:affected.size,tests:351},findings:[],verdict:result.verdict}))
