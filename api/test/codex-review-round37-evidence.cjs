'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),ts=require('typescript')
const root=path.resolve(__dirname,'../..'),scope=require('./codex-review-round37-scope-evidence.cjs')
const selected=['previous36','affected','payload','overtime-complete','download-control'],finalCases=new Map(),diagnostics=[]
const executions=selected.map(suffix=>{
 const file=`codex-review-round37-results-${suffix}.cjs`,r=require('./'+file)
 for(const row of r.results)finalCases.set(row.file+':'+row.name,{...row,evidence:file})
 for(const text of r.diagnostics||[])try{const parsed=JSON.parse(text);if(parsed.case)diagnostics.push(parsed)}catch{}
 return {file,selected:r.selected,counts:r.summary.counts,failures:r.failures.map(x=>({file:x.file,name:x.name,error:x.error}))}
})
const cases=[...finalCases.values()],counts={tests:cases.length,passed:cases.filter(x=>x.pass&&!x.skip).length,failed:cases.filter(x=>!x.pass).length,skipped:cases.filter(x=>x.skip).length}
assert.deepEqual(counts,{tests:189,passed:187,failed:2,skipped:0})
assert.ok(cases.filter(x=>!x.pass).every(x=>x.file==='codex-review-round37-overtime.integration.cjs'))
const git=args=>execFileSync('git',['-c',`safe.directory=${root.replaceAll('\\','/')}`,...args],{cwd:root,encoding:'utf8'})
const printer=ts.createPrinter({removeComments:true,newLine:ts.NewLineKind.LineFeed})
function body(text,file,name){
 const source=ts.createSourceFile(file,text.replace(/\r\n/g,'\n'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);let found
 const visit=n=>{if((ts.isFunctionDeclaration(n)||ts.isMethodDeclaration(n))&&n.name?.getText(source)===name&&n.body)found=n.body
  if(ts.isVariableDeclaration(n)&&n.name.getText(source)===name&&n.initializer&&ts.isArrowFunction(n.initializer))found=n.initializer.body
  ts.forEachChild(n,visit)};visit(source);assert.ok(found,`${file}:${name}`);return printer.printNode(ts.EmitHint.Unspecified,found,source)
}
const sourceComparisons=[]
for(const [file,names] of [['api/src/payroll/payroll-reports.ts',['payrollOvertimeReport','runRef']],['api/src/payroll/payroll-reversal-ledger.ts',['postPayrollReversalLine']]]){
 const old=git(['show',`17086dd:${file}`]),now=fs.readFileSync(path.join(root,file),'utf8')
 for(const name of names)sourceComparisons.push({revision:'17086dd',file,method:name,bodyUnchangedIgnoringCommentsAndLineEndings:body(old,file,name)===body(now,file,name)})
}
assert.ok(sourceComparisons.every(x=>x.bodyUnchangedIgnoringCommentsAndLineEndings))
const requestFile='api/src/requests/requests.service.ts',reasonPass=/stepOrder:\s*event\.stepOrder,\s*reason:\s*event\.reason,\s*createdAt:\s*event\.createdAt/
const requestEventReasonUnmaskedBeforeAndAfter=[git(['show',`17086dd:${requestFile}`]),fs.readFileSync(path.join(root,requestFile),'utf8')].every(s=>reasonPass.test(s))
assert.equal(requestEventReasonUnmaskedBeforeAndAfter,true)
const databases=new Set()
for(const file of fs.readdirSync(__dirname).filter(f=>/^codex-review-round37-results-.*\.cjs$/.test(f)))for(const line of require('./'+file).stdout||[])for(const m of line.matchAll(/CR5_DATABASE (\{[^\r\n]+\})/g)){const d=JSON.parse(m[1]);if(d.operation==='CREATE')databases.add(d.database)}
const result={target:scope.target,comparedProductRange:'17086dd..733480c',relatedCodeLimit:'162d50e..733480c',counts,executions,finalCases:cases,diagnostics,sourceComparisons,requestEventReasonUnmaskedBeforeAndAfter,databasesCreated:databases.size,
 closure:{id:'CR36-B01',closed:true,evidence:'All eight unchanged Round36 cases pass. Raw ledger and cancellation response hide foreign reserved/applied/reversal refs, preserve allowed branch/company refs and 123.45 amount / 9123.45 payroll net. Cancellation stays 201 and updates only its existing intended fields. Independent real deferred overtime lifecycle hides payment/deferred/snapshot refs in attendance log and structured request overtime data, preserving 126.56, 135 minutes, status, event timestamps and immutable stored history.'},
 findings:[
 {id:'CR37-B01',severity:'blocking branch-isolation disclosure',preExisting:true,route:'GET /requests/:id',source:'requests.service.ts:2109',
  reproduction:'A real overtime request approved by three people, deferred from already-paid July to August, paid in a B-only payroll, then genuinely reversed. Employee transfers to A; former request approver account is now scoped to A and remains an authorized party. Original/reversal payroll GET is 403, request GET is 200. overtime.events[].reason retains both foreign payroll IDs: عكس صرف مسير 2026-08 (#4) بمسير العكس #5: عاد السجل معتمدًا بلا مسير. Company, employee and in-scope approver legitimately retain the original text.',
  cause:'Request detail passes event.reason verbatim, discards event payload containing the IDs, then scopes only numeric run-reference keys. The reference walker cannot identify numbers embedded in free text.',
  expected:'Use original event payload references and employee-specific payroll visibility to redact only unauthorized references in displayed reason; preserve authorized history and stored event.'},
 {id:'CR37-B02',severity:'blocking branch-isolation disclosure',preExisting:true,route:'GET /reports/payroll/overtime',source:'payroll-reports.ts:763 and runRef:354',
  reproduction:'Real July overtime approved after July payroll payment; financial value 126.56 paid in August while employee belongs to B. Transfer employee to A. A cannot open either B payroll (403), but report (200) returns deferredFromRunId=6 and run.status=PAID, with August period/start/end despite masking payment payroll ID/name. Company retains original July and August references. No seeded reference or event payload.',
  cause:'Report starts with current employee scope then exposes deferredFromRunId verbatim and uses a runRef helper based on old run definition rather than member snapshot visibility. That helper masks id/name only and retains status.',
  expected:'Apply the same per-employee payroll reference visibility to deferred reference and payment run head, including status; retain rows and legitimate overtime values under the report policy.'}
 ],
 notes:{oldRuntimeExecuted:false,unitCases:1,integrationFileCases:188,performanceMeasured:false,fullIntegrationSuiteExecuted:false,fullUnitSuiteExecuted:false,browserExecuted:false,
  financialProof:'Real manual punches 07:52–19:20 minus required 540 minutes => 148 raw, 135 after 15-minute DOWN rounding; 9000/30/8=37.50, 2.25 hours x 1.5 x 37.50 = 126.56 after money truncation. Paid July contains zero overtime; actual late approval references July; actual August payment includes 126.56 once. Actual reversal returns entry to APPROVED with 126.56 intact; stored entry/request/events unchanged by reads.',
  fixtureCorrections:'Three superseded new-fixture runs are retained but excluded from final counts: first required a real destination department; second needed the employee tokenVersion refreshed after transfer invalidated their session; third asserted a nonexistent overtime-entry createdAt, replaced with actual approval and event timestamps. Their DB cleanup is included in final audit.',
  downloadControl:'Original affected run: 176/177, only SEC-07 allowed PDF returned 404. Express ignores dot directory segments; fixture files were below supplied .claude worktree. Reran unchanged SEC-07 with review-only response.sendFile dotfiles:allow restricted to the exact private test PDF directory. Authorization and fileFor/storage checks unchanged; passed. Deduplicated final result replaces that environment failure with the controlled result. Initial failure remains recorded.',
  migrations:'No new migration in product delta. Existing 064/074 migration fixtures ran only on random guarded disposable DBs, as explicitly permitted in prior clarification.',
  otherPolicies:'Prior owner exceptions unchanged; request participation permits historical request access but does not grant access to entirely foreign payroll references. No new blocker assigned to accepted mixed-run heads, self views or deferred existence distinctions.',
  productModified:false,oldTestsModified:false,companyDatabasesWritten:false,servicesStartedOrStopped:false,limitations:'Targeted runtime tests and related code reading, not an exhaustive assertion over every historical endpoint. SQL engine and cleanup recorded separately; compatibility 150 is not native SQL Server 2019 execution.'},
 staticChecks:require('./codex-review-round37-static-checks.cjs')}
fs.writeFileSync(path.join(__dirname,'codex-review-round37-evidence-results.cjs'),'module.exports = '+JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify({target:result.target,counts,databasesCreated:databases.size,closure:result.closure.id,findings:result.findings.map(x=>x.id),sourceComparisons}))
