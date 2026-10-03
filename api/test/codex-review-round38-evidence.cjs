'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process')
const scope=require('./codex-review-round38-scope-evidence.cjs'),root=path.resolve(__dirname,'../..'),cases=new Map(),diagnostics=[]
const executions=['previous37','affected','independent','related'].map(suffix=>{
 const file=`codex-review-round38-results-${suffix}.cjs`,r=require('./'+file)
 for(const row of r.results)cases.set(row.file+':'+row.name,{...row,evidence:file})
 for(const s of r.diagnostics||[])try{const d=JSON.parse(s);if(d.case)diagnostics.push(d)}catch{}
 return {file,files:r.selected,counts:r.summary.counts,failures:r.failures.map(x=>({file:x.file,name:x.name,error:x.error}))}
})
const finalCases=[...cases.values()],counts={tests:finalCases.length,passed:finalCases.filter(x=>x.pass&&!x.skip).length,failed:finalCases.filter(x=>!x.pass).length,skipped:finalCases.filter(x=>x.skip).length}
assert.deepEqual(counts,{tests:215,passed:212,failed:3,skipped:0})
assert.ok(finalCases.filter(x=>!x.pass).every(x=>/^codex-review-round38-(event-period|unassigned|related-periods)\.integration\.cjs$/.test(x.file)))
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).replace(/\r\n/g,'\n')
const file='api/src/payroll/payroll-reports.ts',old=git(['show','733480c:'+file]),now=fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n')
const line='for (const row of [...employeeMembers, ...rawItems]) visibleRunIds.add(Number(row.runId))'
const summary=s=>s.slice(s.indexOf('  const runSummaries = runs.filter'),s.indexOf('\n}',s.indexOf('  const runSummaries = runs.filter')))
assert.ok(old.includes(line)&&now.includes(line));assert.ok(summary(old).length>300);assert.equal(summary(old),summary(now))
const unchanged=git(['diff','733480c',scope.target,'--','api/src/payroll/payroll-run-visibility.ts','api/src/payroll/payroll-reversal-ledger.ts','api/src/payroll/bonuses.service.ts','api/src/payroll/typed-deductions.service.ts','api/src/loans/loans.service.ts']).trim()===''
assert.equal(unchanged,true)
const databases=new Set()
for(const execution of executions)for(const s of require('./'+execution.file).stdout||[])for(const m of s.matchAll(/CR5_DATABASE (\{[^\r\n]+\})/g)){const row=JSON.parse(m[1]);if(row.operation==='CREATE')databases.add(row.database)}
assert.equal(databases.size,16)
const result={target:scope.target,productRange:'733480c..e28c17a',relatedCodeLimit:'162d50e..e28c17a',counts,executions,finalCases,diagnostics,databasesCreated:databases.size,
 closures:[
 {id:'CR37-B01',numbersClosed:true,remainingPeriodFinding:'CR38-B02',proof:'Unchanged Round37 runtime case passes: hidden #IDs removed, allowed/company/self text and stored history unchanged. New stronger assertion proves a foreign August payment period remains in July overtime request history.'},
 {id:'CR37-B02',overtimeReportClosed:true,proof:'Actual paid/deferred overtime report hides payment id/name/period/status/start/end and deferred ID, preserves company refs and 126.56. Independent unassigned lastRun and reversal reasons hide foreign metadata and retain own A branch head; top-level runs has separate CR38-B01.'}],
 findings:[
 {id:'CR38-B01',severity:'blocking branch isolation',route:'GET /reports/payroll/unassigned',source:'api/src/payroll/payroll-reports.ts:479,559',preExisting:true,
  proof:'Create, calculate, approve and pay two BRANCH payrolls via real APIs, one employee per branch, 9000 each. Transfer the former B employee to A via employee/calendar API. B-only membership snapshot remains B; A direct payroll GET is 403. July unassigned report includes B run with null id/generic name but scopeLabel naming B, PAID status, 2026-07 period and 2026-06-23..2026-07-22 dates. Company sees both full heads, and A own payroll remains visible. Read operations leave all runs/items/members/events identical.',
  cause:'Top-level visibleRunIds derives from current-scope employees and all their historical members/items, not snapshot scope. runSummaries invokes runRef without the employee visibility decision, then resolves scopeLabel against all organization names.',
  expected:'Filter top-level runs by in-scope historical membership (with defined legacy fallback); wholly foreign run absent. Preserve authorized mixed heads and company output; avoid foreign organization labels.'},
 {id:'CR38-B02',severity:'blocking branch isolation; remaining metadata in event text',routes:['GET /requests/:id','GET /bonuses/:id','GET /deductions/:id','GET /loans/:id/ledger'],source:'api/src/payroll/payroll-run-visibility.ts:34; api/src/requests/requests.service.ts:2086',
  proof:'Real July overtime deferred to an August B payroll and reversed; after transfer A has request access but August/reversal GET 403. Event text is عكس صرف مسير 2026-08 بمسير العكس: عاد السجل معتمدًا بلا مسير. The hidden payroll period remains although IDs are absent. Real bonus/deduction/loan reversal independently exhibits July period at all three related endpoints. Company/self and in-scope controls retain full authorized text. Stored history unchanged.',
  cause:'scrubEventReferences strips #digits only; reversal writer embeds parentRun.period as well. Old tests asserted number masking only, not period masking. Current request explicitly requires periods of foreign runs to be hidden.',
  expected:'Render a generic foreign-run event label from the original refs and visibility decision, removing unauthorized period as well as number/name/status while retaining legitimate monetary effect, work date and stored event. Preserve allowed text verbatim.'}],
 staticEvidence:{unassignedMembershipInsertionAndRunSummariesUnchangedFrom733480c:true,sharedScrubberWritersAndRelatedEndpointsUnchangedFrom733480c:unchanged,oldRuntimeExecuted:false},
 financialChecks:{overtime:{rawMinutes:148,approvedMinutes:135,hourlyRate:37.5,multiplier:1.5,amount:126.56},branchPayrolls:{netEach:9000,reversal:-9000},relatedReversal:{formula:'9000 + 123.45 - 67.89 - 300.12',net:8755.44,reversal:-8755.44,loanCollected:300.12,loanRestored:600.24},storedRowsUnchangedByReads:true},
 limitations:{performanceMeasured:false,fullIntegrationSuite:false,fullUnitSuite:false,browser:false,oldRuntime:false,independentDuplicatePayrollFixture:false,productOrOldTestsEdited:false,companyDatabaseWrites:false,servicesStartedOrStopped:false,
  transport:'In-process Nest/Express with actual guards, validation and service code; no HTTP listener. Existing SEC-07 PDF fixture uses exact private-path dotfiles allowance because supplied worktree is below .claude. No authorization/storage checks bypassed.',
  migrations:'No new migration. Existing scope and overtime migration tests only on harness-owned disposable databases under prior explicit permission.',
  boundary:'Latest delta plus related code within 162d50e..e28c17a; main phase0/phase1 work ignored. Prior owner exceptions unchanged. SQL Server 2022 compatibility150; not native SQL2019.'},
 staticChecks:require('./codex-review-round38-static-checks.cjs')}
fs.writeFileSync(path.join(__dirname,'codex-review-round38-evidence-results.cjs'),'module.exports = '+JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify({target:result.target,counts,databasesCreated:databases.size,findings:result.findings.map(x=>x.id)}))
