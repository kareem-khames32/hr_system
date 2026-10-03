'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),scope=require('./codex-review-round30-scope-evidence.cjs'),ts=require('../node_modules/typescript')
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
assert.equal(git(['rev-parse','HEAD']),scope.target)
const cases=new Map(),diagnostics=[]
const executions=['previous','affected','independent','holiday-confirmed'].map(suffix=>{
 const file=`codex-review-round30-results-${suffix}.cjs`,r=require(path.join(__dirname,file))
 for(const c of r.results){const key=c.file+':'+c.name;assert.ok(!cases.has(key));cases.set(key,c)}
 for(const line of r.diagnostics||[])try{const d=JSON.parse(line);if(d.case||d.financialExpected)diagnostics.push(d)}catch{}
 return {file,selected:r.selected,counts:r.summary.counts,failures:r.failures.map(f=>({file:f.file,name:f.name,error:f.error}))}
})
const parsed=(s,name)=>ts.createSourceFile(name,s.replaceAll('\r\n','\n'),ts.ScriptTarget.Latest,true)
const method=(source,name)=>{let found;function visit(n){if(ts.isMethodDeclaration(n)&&n.name?.getText(source)===name)found=n;ts.forEachChild(n,visit)}visit(source);assert.ok(found,name);return found}
const printer=ts.createPrinter({removeComments:true}),printed=(node,source)=>printer.printNode(ts.EmitHint.Unspecified,node,source)
const comparisons=[]
for(const [file,names] of [
 ['api/src/payroll/allowances-grants.service.ts',['cancelLine','cancelGrant']],
 ['api/src/attendance/holiday-work.service.ts',['cancel','normalize','view','computeRows']]]){
 const old=parsed(git(['show','6620dab:'+file]),file),current=parsed(fs.readFileSync(path.join(root,file),'utf8'),file)
 for(const part of names)comparisons.push({file,part,unchanged:printed(method(old,part).body,old)===printed(method(current,part).body,current)})
 if(file.includes('holiday-work'))comparisons.push({file,part:'update, apart from the added named-employee lock call',unchanged:printed(method(old,'update').body,old)===printed(method(current,'update').body,current).split('\n').filter(line=>!line.includes('await this.lockNamedTargets(em, values)')).join('\n')})
}
assert.ok(comparisons.every(x=>x.unchanged),JSON.stringify(comparisons))
const counts={tests:cases.size,passed:[...cases.values()].filter(r=>r.pass&&!r.skip).length,failed:[...cases.values()].filter(r=>!r.pass).length,skipped:[...cases.values()].filter(r=>r.skip).length}
assert.deepEqual(counts,{tests:85,passed:83,failed:2,skipped:0})
const output={target:scope.target,comparedProductRange:'6620dab..5d4c52b',relatedCodeLimit:'162d50e..5d4c52b',counts,executions,diagnostics,sourceComparisons:comparisons,
 notes:{runtimeTarget:'5d4c52b',oldRuntimeExecuted:false,
  closure:'Original Round29 create/cancel races unmodified: actual transfer commits first; both financial writes return 403 with no ledger change. New reverse-order tests verify Exclusive employee-finance lock via SQL APPLOCK_MODE, actual transfer waits, financial operation finishes 201 then transfer 200.',
  paidState:'A real payroll containing 9000 base plus 321.09 direct CREDIT is calculated, approved and paid while cancellation is paused after its early scope check. Cancellation resumes, rereads APPLIED and returns 400; netPay is 9321.09 and applied ledger is unchanged.',
  targets:'Actual PATCH employee transfer before named/group allowance lock: named group rejects atomically 400; team loses transferred employee and creates one 150.25 line for the remaining member. Line cancellation remains operational. Named waiver and named holiday create/update reject 400 with no partial save.',
  moneyRequests:'Round29 early-repayment/deferral transfer guards still work after relocation to execute. Round6 historical allowance request executes after transfer once, 123.45; approve/reject/return and scope concealment remain correct.',
  blocker:'Holiday order scope can change. Pause branch-A update after normalize, or cancel after visibleOrder read. Company PATCH moves order to B, old-branch GET is 404. Real manual punches (fingerprint mapped) and payroll calculation create B employee CREDIT 300 for four hours * (9000/30/8) *2. Resume old A mutation: update 200 moves order back to A, or cancellation commits then returns 404. Both cancel the actual B financial source. Reproduced on a second disposable database.',
  preliminaryRuns:[{file:'codex-review-round30-results-setup1.cjs',classification:'New fixture errors: attempted to clear required department; used incorrect net field. Fixed test with valid destination department/team and correct netPay.'},{file:'codex-review-round30-results-setup2.cjs',classification:'One remaining new-test assertion used net instead of netPay; corrected only the new test.'},{file:'codex-review-round30-results-holiday-setup1.cjs',classification:'Fixture lacked raw punch evidence; payroll recomputation correctly replaced the manually seeded day.'},{file:'codex-review-round30-results-holiday-setup2.cjs',classification:'Fixture employee lacked fingerprint mapping; manual punches did not bind. Added mapping in disposable fixture and used real manual-punch API.'},{file:'codex-review-round30-results-holiday-scope.cjs',classification:'Initial valid reproduction of the same two product failures; confirmed unchanged on another disposable database. Not double counted.'}],
  performanceMeasured:false,fullSuiteExecuted:false,servicesStartedOrStopped:false,companyDatabasesWritten:false},staticChecks:require('./codex-review-round30-static-checks.cjs')}
fs.writeFileSync(path.join(__dirname,'codex-review-round30-evidence-results.cjs'),'module.exports = '+JSON.stringify(output,null,2)+'\n')
console.log(JSON.stringify({target:scope.target,counts,sourceComparisons:comparisons}))
