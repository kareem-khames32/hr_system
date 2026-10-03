'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),ts=require('typescript')
const scope=require('./codex-review-round40-scope-evidence.cjs'),root=path.resolve(__dirname,'../..'),cases=new Map(),diagnostics=[]
const executions=['previous39','key','scopes','cost-center-control','adjacent','affected'].map(suffix=>{
 const file=`codex-review-round40-results-${suffix}.cjs`,r=require('./'+file)
 for(const row of r.results)cases.set(row.file+':'+row.name,{...row,evidence:file})
 for(const s of r.diagnostics||[])try{const d=JSON.parse(s);if(d.case)diagnostics.push(d)}catch{}
 return {file,files:r.selected,counts:r.summary.counts,failures:r.failures.map(x=>({file:x.file,name:x.name,error:x.error}))}
})
const finalCases=[...cases.values()],counts={tests:finalCases.length,passed:finalCases.filter(x=>x.pass&&!x.skip).length,failed:finalCases.filter(x=>!x.pass).length,skipped:finalCases.filter(x=>x.skip).length}
assert.deepEqual(counts,{tests:270,passed:266,failed:4,skipped:0})
assert.ok(finalCases.filter(x=>!x.pass).every(x=>x.file==='codex-review-round40-key-boundary.integration.cjs'))
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).replace(/\r\n/g,'\n')
const printer=ts.createPrinter({removeComments:true,newLine:ts.NewLineKind.LineFeed})
function body(text,file,name){const source=ts.createSourceFile(file,text.replace(/\r\n/g,'\n'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);let found
 const visit=n=>{if((ts.isFunctionDeclaration(n)||ts.isMethodDeclaration(n))&&n.name?.getText(source)===name&&n.body)found=n.body;ts.forEachChild(n,visit)}
 visit(source);assert.ok(found);return printer.printNode(ts.EmitHint.Unspecified,found,source)}
const comparisons=[]
for(const [file,name] of [['api/src/payroll/payroll-overview.service.ts','itemLines'],['api/src/payroll/payroll-approval-chain.service.ts','review']]){
 comparisons.push({file,name,unchangedFromF58f894:body(git(['show',`f58f894:${file}`]),file,name)===body(fs.readFileSync(path.join(root,file),'utf8'),file,name)})
}
assert.ok(comparisons.every(x=>x.unchangedFromF58f894))
const databases=new Set()
for(const execution of executions)for(const s of require('./'+execution.file).stdout||[])for(const m of s.matchAll(/CR5_DATABASE (\{[^\r\n]+\})/g)){const row=JSON.parse(m[1]);if(row.operation==='CREATE')databases.add(row.database)}
assert.equal(databases.size,26)
const result={target:scope.target,productRange:'f58f894..ecf4846',relatedCodeLimit:'162d50e..ecf4846',counts,executions,finalCases,diagnostics,databasesCreated:databases.size,comparisons,
 closures:[
  {id:'CR39-B01',literalCopiesClosed:true,securityClosed:false,proof:'All unchanged round39 cases pass: literal hidden month removed from payslip and run-lines name/key. Stable row-column mapping and money preserved. New unkeyed key digest still reveals the hidden month through offline dictionary matching (CR40-B01); other line readers still return it literally (CR40-B02).'},
  {id:'CR39-B02',closed:true,proof:'Real BRANCH and DEPARTMENT mixed payroll controls (unchanged round39), plus independent TEAM and CUSTOM payrolls. Single-branch labels hide foreign units; multi-branch/company labels retain authorized names. CUSTOM global count hidden; legacy branch header scoped; company cost-center name preserved in explicit historical metadata fixture.'}
 ],
 findings:[
  {id:'CR40-B01',severity:'blocking branch isolation',routes:['GET /payroll/items/:id','GET /payroll/runs/:id/lines'],sources:['api/src/payroll/payroll-run-visibility.ts:163','api/src/payroll/payroll.service.ts:1952','api/src/payroll/payroll.service.ts:1968'],introducedIn:'ecf4846',
   reproduction:'Actual API CREDIT/allowance 67.89 for B employee earning 9000. July payroll calculated/approved/paid (9067.89), reversed (-9067.89), product regenerates obligation label with original period. Employee transferred to A; November payroll calculated/approved/paid (9067.89), A membership snapshot verified. Reader A gets 403 for July and its reversal, 200 for November. Returned masked key ends ~d1124846. An independent decoder taking only that returned string enumerates 432 months (2000-2035); replacing the generic phrase and comparing SHA1 first8 produces the unique candidate 2026-07 in both routes. No privileged response or DB data is input to the decoder.',
   cause:'Public unsalted digest of the original text is a verifier for a small hidden-period dictionary. This is not a hash-collision finding; changing to a stronger unkeyed digest does not address it.',
   expected:'Use a stable opaque line identity that cannot validate guesses of protected text, preserving row-column mapping and distinct keys. Keep authorized/company/self text and stored records intact.'},
  {id:'CR40-B02',severity:'blocking branch isolation',routes:['GET /payroll/overview/lines?period=2026-11','GET /payroll/approval-chain/runs/:id/review'],sources:['api/src/payroll/payroll-overview.service.ts:426','api/src/payroll/payroll-overview.service.ts:431','api/src/payroll/payroll-approval-chain.service.ts:293','api/src/payroll/payroll-approval-chain.service.ts:301'],preExisting:true,
   reproduction:'Same genuine allowance/pay/reverse/transfer/pay lifecycle. Reader A may read the November item, but may not read the July B payroll (403). overview-lines rows.earnings and columns.earnings still return original name/key containing مسير 2026-07. Approval review rows.earningLines returns the same literal hidden period. Both responses 200; net remains 9067.89. Company text retained and stored item/ledger/events unchanged.',
   cause:'Both existing describePayrollItemsLines callers return the line names/keys directly without applying hidden-run-period rendering. Method bodies unchanged from f58f894 (static comparison; no old-runtime claim).',
   expected:'Apply consistent visibility-aware rendering to all line readers, including names, keys and column headers. Preserve allowed current run heads, money, original storage and company/self text.'}
 ],
 controls:{restoredAllowance:{base:9000,allowance:67.89,net:9067.89,reversal:-9067.89,currentNet:9067.89},scopeRuns:{local:6000,foreign:9000,company:15000},keyMapping:true,stableRepeatedResponse:true,companySelfTextPreserved:true,storedFinanceAndHistoryUnchangedByReads:true},
 fixtureCorrections:{superseded:['Initial COST_CENTER setup attempted unsupported costCenter-only definition, correctly rejected 400 PAYRUN-SCOPE-REQUIRED. Corrected only new test: real mixed BRANCH payroll then explicit historical scope metadata fixture; rerun passed. Not a product defect.'],resultsRetained:true,databaseCleanupIncludesAllAttempts:true},
 limitations:{fullIntegrationSuite:false,fullUnitSuite:false,textUnitTests:5,browser:false,oldRevisionRuntime:false,performanceMeasured:false,newMigrations:false,
  environment:'Actual Nest guards/pipes/controllers/services with in-process HTTP transport and no listening service. SQL2022 compatibility150, not native SQL2019. Existing migration fixtures only on private random databases under prior permission.',
  transport:'Exact private SEC-07 PDF fixture path permits dot directory segments under supplied .claude worktree; actual authorization and storage checks intact.',
  scope:'Full product delta and related authorized paths reviewed. Main phase0/phase1/phase2 untouched. Prior owner exceptions unchanged; current visible run permission does not authorize a different historical foreign run period embedded in a line.',
  modifications:'New round40 tests/evidence and requested report only; no product/old tests/company data/service changes.'},
 staticChecks:require('./codex-review-round40-static-checks.cjs')}
fs.writeFileSync(path.join(__dirname,'codex-review-round40-evidence-results.cjs'),'module.exports = '+JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify({target:result.target,counts,databasesCreated:databases.size,findings:result.findings.map(x=>x.id)}))
