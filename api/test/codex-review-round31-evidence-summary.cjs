'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),scope=require('./codex-review-round31-scope-evidence.cjs'),ts=require('../node_modules/typescript')
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
assert.equal(git(['rev-parse','HEAD']),scope.target)
const cases=new Map(),diagnostics=[]
const executions=['previous','affected','independent-confirmed'].map(suffix=>{
 const file=`codex-review-round31-results-${suffix}.cjs`,r=require(path.join(__dirname,file))
 for(const c of r.results){const key=c.file+':'+c.name;assert.ok(!cases.has(key));cases.set(key,c)}
 for(const line of r.diagnostics||[])try{const d=JSON.parse(line);if(d.case||d.financialExpected)diagnostics.push(d)}catch{}
 return {file,selected:r.selected,counts:r.summary.counts,failures:r.failures.map(f=>({file:f.file,name:f.name,error:f.error}))}
})
const parsed=(s,name)=>ts.createSourceFile(name,s.replaceAll('\r\n','\n'),ts.ScriptTarget.Latest,true)
const method=(source,name)=>{let found;function visit(n){if(ts.isMethodDeclaration(n)&&n.name?.getText(source)===name)found=n;ts.forEachChild(n,visit)}visit(source);assert.ok(found,name);return found}
const printer=ts.createPrinter({removeComments:true}),printed=(node,source)=>printer.printNode(ts.EmitHint.Unspecified,node,source)
const comparisons=[]
for(const [file,names] of [
 ['api/src/attendance/holiday-work.service.ts',['create','normalize','view','computeRows','clearCoveredOvertime','lockNamedTargets']],
 ['api/src/attendance/attendance.service.ts',['recomputeOvertimeWindowDays','assertOvertimePeriodAutoApprove']]]){
 const old=parsed(git(['show','5d4c52b:'+file]),file),current=parsed(fs.readFileSync(path.join(root,file),'utf8'),file)
 for(const part of names)comparisons.push({file,part,unchanged:printed(method(old,part).body,old)===printed(method(current,part).body,current)})
}
assert.ok(comparisons.every(x=>x.unchanged),JSON.stringify(comparisons))
const old=fs.readFileSync(path.join(__dirname,'codex-review-round30-holiday-scope.integration.cjs'),'utf8')
const needle=' const e=await f.employee(9000,f.B),bodyA='
const adapted=old.replaceAll('round30','round31').replaceAll('CR30','CR31').replaceAll('r30_','r31_').replace(needle," const day=action==='update'?'2026-07-17':'2026-07-10'\n"+needle)
assert.equal(fs.readFileSync(path.join(__dirname,'codex-review-round31-holiday-scope.integration.cjs'),'utf8'),adapted)
const counts={tests:cases.size,passed:[...cases.values()].filter(r=>r.pass&&!r.skip).length,failed:[...cases.values()].filter(r=>!r.pass).length,skipped:[...cases.values()].filter(r=>r.skip).length}
assert.deepEqual(counts,{tests:127,passed:126,failed:1,skipped:0})
const initial=require('./codex-review-round31-results-independent.cjs'),confirmed=require('./codex-review-round31-results-independent-confirmed.cjs')
assert.deepEqual(initial.summary.counts,confirmed.summary.counts)
assert.deepEqual(initial.failures.map(x=>x.name),confirmed.failures.map(x=>x.name))
const output={target:scope.target,comparedProductRange:'5d4c52b..f680ac1',relatedCodeLimit:'162d50e..f680ac1',counts,executions,diagnostics,sourceComparisons:comparisons,
 notes:{runtimeTarget:'f680ac1',oldRuntimeExecuted:false,
  closure:'CR30 holiday-order update and cancel races both reject 404 after actual company PATCH moves the order to branch B. Real punch-backed payroll CREDIT 300 remains PENDING; order remains ACTIVE in B. Branch-B allowed control passes.',
  priorFixtureAdaptation:'Original Round30 test is unchanged. New Round31 copy uses distinct Fridays for update (2026-07-17) and cancel (2026-07-10); protected first order otherwise legitimately remains in branch B and wins the second same-day payroll source.',
  periods:'Actual company relocation before the row lock: old update/delete both 403 with the entire stored period unchanged. Reverse ordering: real company PATCH waits on the held row; old update returns its own A snapshot then company update succeeds, or old delete succeeds and company update sees 404. No foreign names enter these responses.',
  ordinaryResponses:'Ordinary holiday update/cancel detail replies deeply equal GET; post-reload relocation returns only the already-known saved name, not the later foreign name.',
  autoApproval:'Affected runtime suite covers closed windows, branch scope, unsettled days, exemption, caps, disabled type, and malformed approval snapshots. Automatic and manual approved overtime both equal 140.62 = trunc(2.5 * 37.5 * 1.5, 2), preserved in payroll and overtime report.',
  blocker:'CR31-B01: pause the holiday update after its transaction commits and before its unscoped repository reload. Actual company PATCH moves/renames the order in branch B; old-branch GET is 404. Resume: 200 fallback has movedOutOfScope=true but includes the new branch-B name. Confirmed on a second disposable database. Stored B order remains unchanged; no new incorrect financial write is claimed.',
  repeatedExecution:{file:'codex-review-round31-results-independent.cjs',classification:'Initial valid reproduction; independent-confirmed repeats all seven cases on a second disposable database. Not double counted.'},
  migrations:'No new migration in product delta. Existing AA-13 exercises migration 074 twice only on its owned disposable database; prior owner clarification permits this. No company migration.',
  performanceMeasured:false,fullSuiteExecuted:false,servicesStartedOrStopped:false,companyDatabasesWritten:false},staticChecks:require('./codex-review-round31-static-checks.cjs')}
fs.writeFileSync(path.join(__dirname,'codex-review-round31-evidence-results.cjs'),'module.exports = '+JSON.stringify(output,null,2)+'\n')
console.log(JSON.stringify({target:scope.target,counts,sourceComparisons:comparisons}))
