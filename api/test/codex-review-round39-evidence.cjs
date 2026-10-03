'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),ts=require('typescript')
const scope=require('./codex-review-round39-scope-evidence.cjs'),root=path.resolve(__dirname,'../..'),cases=new Map(),diagnostics=[]
const executions=['previous38','affected','independent','payslip','mixed','bonus','bonus-confirmed'].map(suffix=>{
 const file=`codex-review-round39-results-${suffix}.cjs`,r=require('./'+file)
 for(const row of r.results)cases.set(row.file+':'+row.name,{...row,evidence:file})
 for(const s of r.diagnostics||[])try{const d=JSON.parse(s);if(d.case)diagnostics.push(d)}catch{}
 return {file,files:r.selected,counts:r.summary.counts,failures:r.failures.map(x=>({file:x.file,name:x.name,error:x.error}))}
})
const finalCases=[...cases.values()],counts={tests:finalCases.length,passed:finalCases.filter(x=>x.pass&&!x.skip).length,failed:finalCases.filter(x=>!x.pass).length,skipped:finalCases.filter(x=>x.skip).length}
assert.deepEqual(counts,{tests:259,passed:255,failed:4,skipped:0})
assert.ok(finalCases.filter(x=>!x.pass).every(x=>/^codex-review-round39-(payslip|mixed-report)\.integration\.cjs$/.test(x.file)))
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).replace(/\r\n/g,'\n')
const printer=ts.createPrinter({removeComments:true,newLine:ts.NewLineKind.LineFeed})
function body(text,file,name){const source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);let found
 const visit=n=>{if((ts.isFunctionDeclaration(n)||ts.isMethodDeclaration(n))&&n.name?.getText(source)===name&&n.body)found=n.body;ts.forEachChild(n,visit)}
 visit(source);assert.ok(found);return printer.printNode(ts.EmitHint.Unspecified,found,source)}
const comparisons=[]
for(const [file,names] of [['api/src/payroll/payroll-reports.ts',['payrollRunScopeLabel','payrollRunsReport']],['api/src/payroll/payroll.service.ts',['runLines']],['api/src/payroll/payroll-item-lines.ts',['creditLine']]]){
 const old=git(['show',`e28c17a:${file}`]),now=fs.readFileSync(path.join(root,file),'utf8')
 for(const name of names)comparisons.push({file,name,unchangedFromE28c17a:body(old,file,name)===body(now,file,name)})
}
assert.ok(comparisons.every(x=>x.unchangedFromE28c17a))
const databases=new Set()
for(const execution of executions)for(const s of require('./'+execution.file).stdout||[])for(const m of s.matchAll(/CR5_DATABASE (\{[^\r\n]+\})/g)){const row=JSON.parse(m[1]);if(row.operation==='CREATE')databases.add(row.database)}
assert.equal(databases.size,25)
const result={target:scope.target,productRange:'e28c17a..f58f894',relatedCodeLimit:'162d50e..f58f894',counts,executions,finalCases,diagnostics,databasesCreated:databases.size,comparisons,
 closures:[{id:'CR38-B01',closed:true,proof:'All six unchanged Round38 cases pass. Wholly foreign historical payroll absent from unassigned runs; allowed local and company heads unchanged. Independent mixed-head test exposes separate organization-label disclosure CR39-B02.'},
 {id:'CR38-B02',previousEventPathsClosed:true,proof:'Real overtime, bonus, deduction and loan reversal event periods hidden after transfer, allowed/company/self text preserved. Ledger labels and payslip obligationDetails also sanitized; actual paid bonus status/payout.period/appliedPeriod hidden, self/company/in-scope reader preserved. Remaining payslip/run-lines copies are CR39-B01.'}],
 findings:[
 {id:'CR39-B01',severity:'blocking branch isolation',routes:['GET /payroll/items/:id','GET /payroll/runs/:id/lines'],
  sources:['api/src/payroll/payroll-run-visibility.ts:156','api/src/payroll/payroll.service.ts:1952','api/src/payroll/payroll.service.ts:1957','api/src/payroll/payroll-item-lines.ts:136'],
  reproduction:'Real API credit/allowance 67.89 for B employee earning 9000. July payroll paid (9067.89), genuinely reversed (-9067.89), automatically regenerated obligation label references July. Actual employee transfer to A, November payroll calculated/approved/paid (9067.89), A membership snapshot verified. A cannot read July/reversal (403), can read November (200). Ledger and obligationDetails hide July, but payslip lines.earnings[].name AND .key, and run-lines rows plus columns, retain مسير 2026-07. No injected label or stored snapshot mutation.',
  cause:'Deep scrub only recognizes label/reason/note/notes/description; line text uses name and also embeds text in key. runLines does not apply visibility-aware text rendering at all.',
  expected:'Scope all line names and keys, including columns, preserving their consistent mapping and totals. Keep company/self/allowed text and stored rows intact.',
  preExisting:'The unmasked source names/keys and runLines are unchanged; this delta attempted payslip sanitization but misses the actual line fields.'},
 {id:'CR39-B02',severity:'blocking foreign organization-name disclosure',routes:['GET /reports/payroll/unassigned','GET /reports/payroll'],sources:['api/src/payroll/payroll-reports.ts:152','api/src/payroll/payroll-reports.ts:255','api/src/payroll/payroll-reports.ts:561'],
  reproduction:'Real BRANCH mixed A+B payroll (2 x 9000 = 18000), and DEPARTMENT mixed A+B payroll (4 x 9000 = 36000), calculated/approved/paid. A full run GET 403 but legitimately receives mixed report head. scopeLabel names branch B and confidential department B in both report endpoints. Company retains full labels and stored items unchanged.',
  cause:'payrollRunScopeLabel resolves every definition ID from global organization-name maps without reader scope. Correct new visibleRunIds membership test does not sanitize the surviving mixed head.',
  expected:'Retain the permitted mixed head, but scope its organization labels or render a generic mixed-scope description. Company labels stay complete.',preExisting:true,
  policyInterpretation:'User exception permits a mixed run head, not names of arbitrary departments/branches outside the viewer scope. No finding assigned to the legitimate mixed run identity/status or local amounts.'}],
 controls:{overtime:126.56,bonusDeductionLoanNet:8755.44,restoredAllowance:{base:9000,allowance:67.89,net:9067.89,reversal:-9067.89,currentNet:9067.89},paidBonus:{amount:123.45,net:9123.45},storedFinanceAndHistoryUnchangedByReads:true,rawCurrentRunAndEventPeriodScanPassed:true},
 fixtureCorrections:{superseded:['independent: five payslip before-hook failures caused by my attempting a correctly forbidden direct debit; replaced with legitimate CREDIT allowance via API','bonus: /bonuses/mine intentionally lacks obligations collection; corrected only my assertion, then reran successfully'],resultsRetained:true,databaseCleanupIncludesAllAttempts:true},
 limitations:{fullIntegrationSuite:false,fullUnitSuite:false,pureTextUnitTests:3,browser:false,oldRevisionRuntime:false,performanceMeasured:false,newMigrations:false,
  environment:'Actual Nest guards/pipes/controllers/services, in-process HTTP transport without listening service. SQL2022 compatibility150, not native SQL2019. Existing migration fixtures only on private random databases under prior permission.',
  transport:'Exact private SEC-07 PDF test path permits dot directory segments under supplied .claude worktree; actual authorization and storage checks intact.',
  scope:'Reviewed full product delta and related paths only within authorized range. Main phase0/phase1 untouched. Prior owner exceptions unchanged.',
  modifications:'New round39 tests/evidence and requested report only; no product/old tests/company data/service changes.'},
 staticChecks:require('./codex-review-round39-static-checks.cjs')}
fs.writeFileSync(path.join(__dirname,'codex-review-round39-evidence-results.cjs'),'module.exports = '+JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify({target:result.target,counts,databasesCreated:databases.size,findings:result.findings.map(x=>x.id)}))
