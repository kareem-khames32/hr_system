'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),scope=require('./codex-review-round29-scope-evidence.cjs'),ts=require('../node_modules/typescript')
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
assert.equal(git(['rev-parse','HEAD']),scope.target)
const suffixes=['previous','affected','independent','obligations-confirmed'],cases=new Map(),diagnostics=[]
const executions=suffixes.map(suffix=>{
 const file=`codex-review-round29-results-${suffix}.cjs`,r=require(path.join(__dirname,file))
 for(const c of r.results){const key=c.file+':'+c.name;assert.ok(!cases.has(key));cases.set(key,c)}
 for(const line of r.diagnostics||[])try{const d=JSON.parse(line);if(d.case)diagnostics.push(d)}catch{}
 return {file,selected:r.selected,counts:r.summary.counts,failures:r.failures.map(f=>({file:f.file,name:f.name,error:f.error}))}
})
const parsed=(s,name)=>ts.createSourceFile(name,s.replaceAll('\r\n','\n'),ts.ScriptTarget.Latest,true)
const method=(source,name)=>{let found;function visit(n){if(ts.isMethodDeclaration(n)&&n.name?.getText(source)===name)found=n;ts.forEachChild(n,visit)}visit(source);assert.ok(found,name);return found}
const printer=ts.createPrinter({removeComments:true}),printed=(node,source)=>printer.printNode(ts.EmitHint.Unspecified,node,source)
const comparisons=[]
for(const service of ['bonuses','typed-deductions']){
 const file=`api/src/payroll/${service}.service.ts`,old=parsed(git(['show','770a591:'+file]),file),current=parsed(fs.readFileSync(path.join(root,file),'utf8'),file)
 for(const part of ['views','actorProblem','snapshotRules','approveStep','approveInstantly'])comparisons.push({file,part,unchanged:printed(method(old,part).body,old)===printed(method(current,part).body,current)})
}
const p='api/src/payroll/obligations.service.ts'
comparisons.push({file:p,part:'entire unchanged file; reproduced issue predates 6620dab',unchanged:git(['show','770a591:'+p]).replaceAll('\r\n','\n')===fs.readFileSync(path.join(root,p),'utf8').replaceAll('\r\n','\n').trim()})
assert.ok(comparisons.every(x=>x.unchanged),JSON.stringify(comparisons))
const counts={tests:cases.size,passed:[...cases.values()].filter(r=>r.pass&&!r.skip).length,failed:[...cases.values()].filter(r=>!r.pass).length,skipped:[...cases.values()].filter(r=>r.skip).length}
assert.deepEqual(counts,{tests:99,passed:97,failed:2,skipped:0})
const output={target:scope.target,comparedProductRange:'770a591..6620dab',relatedCodeLimit:'162d50e..6620dab',counts,executions,diagnostics,sourceComparisons:comparisons,
 notes:{runtimeTarget:'6620dab',oldRuntimeExecuted:false,
  closure:'Round28 related-race unchanged: both actual employee transfers commit first; cancellation is refused, request stays APPROVED and obligation PENDING. Affected product tests also cover rejection, objection response, new creation, stale bulk, reversal, suspended deduction decision, direct loan repayment, recovery collect/writeoff and on-behalf loan request.',
  responseAtomicity:'Six independent cases call the original detailIn, verify a transaction-owned Exclusive employee-finance lock with SQL APPLOCK_MODE, then inject ForbiddenException in the response phase. Request, events and ledger roll back; successful retries equal GET. This injection is a verification technique, not a production finding.',
  immediateHr:'Bonus and deduction immediate HR versus separate approval: exactly one 123.45 obligation each; replay denied without an extra obligation.',
  loans:'Actual PATCH employee transfer before final approval of early settlement and deferral: generic 403 and full rollback. Fresh request in new branch completes once. After transfer the fixture refreshes the user tokenVersion, as normal reauthentication requires.',
  blocker:'Direct obligations create/cancel: barrier delays only the old-branch command after its real scope check. Actual transfer commits, new-branch reader observes ledger before old write, then old branch POST succeeds 201. Added/cancelled CREDIT 321.09. Normal post-transfer attempts are 403; legitimate new-branch controls succeed. No subsequent payroll net measured.',
  additionalReadOnlyReview:['payroll-salary-history.service.ts','attendance-exemptions.service.ts','attendance.service.ts confirmOvertime','employees.service.ts suspension/transfer locks','allowances-grants.service.ts cancelLine','offboarding.service.ts withFinancialCase','requests/destinations.service.ts executeTransfer'],
  nonfinancialOpinion:'No independently executed new nonfinancial defect reported. Overlap alone is not a blanket proof that a write completed before a transfer: intervening reads or payroll consumers must also agree. Follow up per endpoint under B1.4.',
  preliminaryRuns:[{file:'codex-review-round29-results-setup1.cjs',classification:'Test fixture errors only: uppercase catalog codes required; real transfer invalidates old JWT tokenVersion. Fixed only the new test.'},{file:'codex-review-round29-results-obligations.cjs',classification:'First reproduction of the same two product failures; confirmed unchanged on a second disposable database. Not double counted.'}],
  performanceMeasured:false,fullSuiteExecuted:false},staticChecks:require('./codex-review-round29-static-checks.cjs')}
fs.writeFileSync(path.join(__dirname,'codex-review-round29-evidence-results.cjs'),'module.exports = '+JSON.stringify(output,null,2)+'\n')
console.log(JSON.stringify({target:scope.target,counts,sourceComparisons:comparisons}))
