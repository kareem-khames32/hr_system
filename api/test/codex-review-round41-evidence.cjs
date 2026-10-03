'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const scope=require('./codex-review-round41-scope-evidence.cjs'),cases=new Map(),diagnostics=[]
const executions=['previous40','independent','affected'].map(suffix=>{
 const file=`codex-review-round41-results-${suffix}.cjs`,r=require('./'+file)
 for(const row of r.results)cases.set(row.file+':'+row.name,{...row,evidence:file})
 for(const s of r.diagnostics||[])try{const d=JSON.parse(s);if(d.case)diagnostics.push(d)}catch{}
 return {file,files:r.selected,counts:r.summary.counts,failures:r.failures.map(x=>({file:x.file,name:x.name,error:x.error}))}
})
const finalCases=[...cases.values()],counts={tests:finalCases.length,passed:finalCases.filter(x=>x.pass&&!x.skip).length,failed:finalCases.filter(x=>!x.pass).length,skipped:finalCases.filter(x=>x.skip).length}
assert.equal(counts.failed,1);assert.equal(counts.skipped,0)
assert.equal(finalCases.find(x=>!x.pass).name,'CR41 boundary: unconsumed employeeId query cannot reveal another employee hidden payroll month through my payslip')
const databases=new Set()
for(const execution of executions)for(const s of require('./'+execution.file).stdout||[])for(const m of s.matchAll(/CR5_DATABASE (\{[^\r\n]+\})/g)){const row=JSON.parse(m[1]);if(row.operation==='CREATE')databases.add(row.database)}
const result={target:scope.target,productRange:'ecf4846..2cb8883',relatedCodeLimit:'162d50e..2cb8883',counts,executions,finalCases,diagnostics,databasesCreated:databases.size,
 closures:[
  {id:'CR40-B01',closed:true,proof:'Eight unchanged round40 tests pass. Independent live response decoder accepts the new 16-hex tag and tries 432 months using SHA1/SHA256/SHA512/MD5: no match. Read implementation uses domain-separated server-secret HMAC. Stable keys agree across payslip, run table, month lines and approval review; rows and columns match. Company/self line text retained.'},
  {id:'CR40-B02',closed:true,proof:'Same real allowance/pay/reverse/transfer/pay lifecycle exercised in seven readers: payslip, run lines, run detail, month lines, approval review, obligation ledger and financial register. No foreign historical period in branch responses. Product corrections regression also covers explicitly seeded stored debit/breakdown text and financial register fallback. All four describePayrollItemsLines callers pass viewer.'}
 ],
 findings:[{id:'CR41-B01',severity:'blocking branch isolation / payroll-period existence disclosure',introducedIn:'2cb8883',
  routes:['GET /payroll/items/:ownItemId?employeeId=:foreignEmployeeId'],
  sources:['api/src/payroll/hidden-run-periods.interceptor.ts:58','api/src/payroll/hidden-run-periods.interceptor.ts:69','api/src/payroll/payroll.controller.ts:480'],
  reproduction:'Ordinary employee account, employeeId linked only to own employee, permissions=[] and branch A. Own paid November payslip legitimately retains original July payroll text after an actual allowance/pay/reverse/transfer lifecycle. Create real foreign B July payroll (6000), foreign B August payroll (7000), plus another B employee with no payroll. Reading the foreign July item directly is 404. Append unused employeeId query to the same own-payslip URL: nonexistent ID, self ID, foreign no-payroll ID and foreign August ID all return the byte-equivalent JSON body, retaining مسير 2026-07. Only foreign July ID causes that text and key to be masked. Every own-payslip request returns 200. Thus a caller without payroll.view can verify a specific foreign employee payroll month through redaction differences. Stored records and own net 9067.89 unchanged; company response identical with/without the query.',
  cause:'Global interceptor reads raw request.query.employeeId regardless of whether the endpoint accepts or authorizes that parameter, adds it to response employee context and queries hidden payroll periods. Controller ignores this query and authorizes only the item ID. The correct self exemption does not exempt the injected foreign ID.',
  expected:'Tie redaction employee context to the resource actually authorized by this route. Do not use unconsumed/unvalidated query values as an authorization or redaction input. Preserve safety net on genuine employee responses and allowed self/company text.',
  policyInterpretation:'This is a newly introduced specific foreign-employee payroll-month oracle in a successful self-service read, not the previously deferred 403/404 distinction when requesting a payroll-run ID. It does not expose the foreign salary amount; the protected fact reproduced is membership in a payroll period.'}],
 controls:{restoredAllowance:{base:9000,allowance:67.89,originalNet:9067.89,reversal:-9067.89,currentNet:9067.89},scopeRuns:{local:6000,foreign:9000,company:15000},queryControls:['nonexistent employee','self employee','foreign employee without payroll','foreign employee with August only'],directForeignItemStatus:404,allSelfReadStatuses:200,companySelfTextPreservedWithoutInjectedContext:true,storedFinanceAndHistoryUnchangedByReads:true},
 limitations:{fullIntegrationSuite:false,fullUnitSuite:false,textUnitTests:8,browser:false,oldRevisionRuntime:false,performanceMeasured:false,newMigrations:false,
  environment:'Real Nest guards/pipes/controllers/interceptors/services in-process without a listening HTTP service. SQL Server2022 compatibility150, not native SQL2019. Existing migration fixtures only on our disposable databases under prior explicit permission.',
  fixtures:'Real API financial cycle and branch transfer in independent test; fixture seeds synthetic employees/attendance exemptions. Existing corrections test explicitly seeds debit and breakdown text. Round40 scope controls retain documented legacy-header fixtures, not a new migration or unsupported cost-center-only create claim.',
  transport:'Exact private SEC-07 PDF fixture permits dot directory segments under supplied .claude worktree; authorization and storage checks unchanged.',
  scope:'Full seven-file product delta and relevant readers reviewed within authorized range; main phase0/phase1/phase2 untouched. Owner decisions not reclassified.',
  modifications:'New round41 tests/evidence and requested report only; no product/old test edits, company-data writes or service changes.'},
 staticChecks:require('./codex-review-round41-static-checks.cjs')}
fs.writeFileSync(path.join(__dirname,'codex-review-round41-evidence-results.cjs'),'module.exports = '+JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify({target:result.target,counts,databasesCreated:databases.size,affected:executions.at(-1).counts,findings:result.findings.map(x=>x.id)}))
