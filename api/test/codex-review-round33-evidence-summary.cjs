'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),scope=require('./codex-review-round33-scope-evidence.cjs'),ts=require('../node_modules/typescript')
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
assert.equal(git(['rev-parse','HEAD']),scope.target)
const cases=new Map(),diagnostics=[]
const executions=['previous','affected','independent-confirmed'].map(suffix=>{
 const file=`codex-review-round33-results-${suffix}.cjs`,r=require(path.join(__dirname,file))
 for(const c of r.results){const key=c.file+':'+c.name;assert.ok(!cases.has(key));cases.set(key,c)}
 for(const line of r.diagnostics||[])try{const d=JSON.parse(line);if(d.case)diagnostics.push(d)}catch{}
 return {file,selected:r.selected,counts:r.summary.counts,failures:r.failures.map(f=>({file:f.file,name:f.name,error:f.error}))}
})
const parsed=(s,name)=>ts.createSourceFile(name,s.replaceAll('\r\n','\n'),ts.ScriptTarget.Latest,true)
const method=(source,name)=>{let found;function visit(n){if(ts.isMethodDeclaration(n)&&n.name?.getText(source)===name)found=n;ts.forEachChild(n,visit)}visit(source);assert.ok(found,name);return found}
const printer=ts.createPrinter({removeComments:true}),printed=(node,source)=>printer.printNode(ts.EmitHint.Unspecified,node,source)
const comparisons=[],file='api/src/payroll/allowances-grants.service.ts'
for(const [revision,names] of [['162d50e',['cancelConflict']],['7e08fb1',['monthRunsFor','runsHolding','cancelConflict','lockedBranchTargets','openRunItems']]]){
 const old=parsed(git(['show',revision+':'+file]),file),current=parsed(fs.readFileSync(path.join(root,file),'utf8'),file)
 for(const part of names)comparisons.push({comparedFrom:revision,file,part,unchanged:printed(method(old,part).body,old)===printed(method(current,part).body,current)})
}
assert.ok(comparisons.every(x=>x.unchanged),JSON.stringify(comparisons))
const counts={tests:cases.size,passed:[...cases.values()].filter(r=>r.pass&&!r.skip).length,failed:[...cases.values()].filter(r=>!r.pass).length,skipped:[...cases.values()].filter(r=>r.skip).length}
assert.deepEqual(counts,{tests:35,passed:33,failed:2,skipped:0})
const initial=require('./codex-review-round33-results-independent.cjs'),confirmed=require('./codex-review-round33-results-independent-confirmed.cjs')
assert.deepEqual(initial.failures.map(x=>x.name),confirmed.failures.map(x=>x.name))
const output={target:scope.target,comparedProductRange:'7e08fb1..2ba6575',relatedCodeLimit:'162d50e..2ba6575',counts,executions,diagnostics,sourceComparisons:comparisons,
 notes:{runtimeTarget:'2ba6575',oldRuntimeExecuted:false,
  closure:'Unmodified Round32 postwrite race passes: actual employee transfer and new foreign payroll after grant commit, response 201 with correct 150.25 and no foreign reference. Independently verified list, line cancellation and bulk cancellation for A-only and B-only snapshots. Company retains references; exact same in-scope references retained.',
  finance:'Each employee has salary 9000 and allowance 150.25: actual calculated net 9150.25. Real line/bulk cancellation cancels only the intended PENDING obligation, actual recalculation yields otherAdditions 0 and net 9000. Foreign approved and paid scenarios use real approval/payment endpoints, refusal leaves the obligation and line unchanged.',
  cases:'LockedRuns tested on actual approved payroll created between grant commit and reference lookup, both own and foreign. Mixed run with a different A member still hides the B allowance employee reference. Legacy-no-members fixture explicitly removes membership only in a disposable database and stamps run branch; own visible, foreign hidden, company both visible.',
  blocker:'CR33-B01: after an A-stamped allowance employee actually transfers to B, a B-only payroll includes the allowance and is approved or paid. List correctly hides runId/name/status and disables cancel, direct run read is 403. Calling line cancellation returns 409 but cancelConflict embeds the hidden reserved/applied payroll ID (#6/#7 in these fixtures). Both states reproduced on two disposable databases. Financial protection is correct; only refusal-message redaction is missing.',
  expectedFix:'Keep 409 and all locked financial checks; format the refusal with a run reference only if visible for this user and employee snapshot. Company keeps its identifying message. This is a concrete identifier disclosure, not merely deferred 403/404 existence differences.',
  repeatedExecution:{file:'codex-review-round33-results-independent.cjs',classification:'First valid seven-case run (five pass, two reproduce blocker). Confirmed file repeats these and adds three successful boundary cases on a second database; repeats not double counted.'},
  preparationCorrection:'An initial affected-suite invocation named a nonexistent payroll-future-month test; it failed during file selection before any test or database creation. Corrected to the two existing affected files; no product failure.',
  migrations:'None executed in this round.',performanceMeasured:false,fullSuiteExecuted:false,servicesStartedOrStopped:false,companyDatabasesWritten:false},staticChecks:require('./codex-review-round33-static-checks.cjs')}
fs.writeFileSync(path.join(__dirname,'codex-review-round33-evidence-results.cjs'),'module.exports = '+JSON.stringify(output,null,2)+'\n')
console.log(JSON.stringify({target:scope.target,counts,sourceComparisons:comparisons}))
