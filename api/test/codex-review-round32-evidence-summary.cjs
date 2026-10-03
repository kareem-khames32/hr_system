'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),scope=require('./codex-review-round32-scope-evidence.cjs'),ts=require('../node_modules/typescript')
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
assert.equal(git(['rev-parse','HEAD']),scope.target)
const cases=new Map(),diagnostics=[]
const executions=['independent','affected','postwrite-confirmed','effects-final'].map(suffix=>{
 const file=`codex-review-round32-results-${suffix}.cjs`,r=require(path.join(__dirname,file))
 for(const c of r.results){const key=c.file+':'+c.name;assert.ok(!cases.has(key));cases.set(key,c)}
 for(const line of r.diagnostics||[])try{const d=JSON.parse(line);if(d.case||d.financialExpected)diagnostics.push(d)}catch{}
 return {file,selected:r.selected,counts:r.summary.counts,failures:r.failures.map(f=>({file:f.file,name:f.name,error:f.error}))}
})
const parsed=(s,name)=>ts.createSourceFile(name,s.replaceAll('\r\n','\n'),ts.ScriptTarget.Latest,true)
const method=(source,name)=>{let found;function visit(n){if(ts.isMethodDeclaration(n)&&n.name?.getText(source)===name)found=n;ts.forEachChild(n,visit)}visit(source);assert.ok(found,name);return found}
const printer=ts.createPrinter({removeComments:true}),printed=(node,source)=>printer.printNode(ts.EmitHint.Unspecified,node,source)
const comparisons=[]
for(const [revision,file,names] of [
 ['f680ac1','api/src/attendance/holiday-work.service.ts',['create','cancel','normalize','view','computeRows','clearCoveredOvertime','lockNamedTargets','detailAfterWrite']],
 ['162d50e','api/src/payroll/allowances-grants.service.ts',['monthRunsFor']]]){
 const old=parsed(git(['show',revision+':'+file]),file),current=parsed(fs.readFileSync(path.join(root,file),'utf8'),file)
 for(const part of names)comparisons.push({comparedFrom:revision,file,part,unchanged:printed(method(old,part).body,old)===printed(method(current,part).body,current)})
}
assert.ok(comparisons.every(x=>x.unchanged),JSON.stringify(comparisons))
const counts={tests:cases.size,passed:[...cases.values()].filter(r=>r.pass&&!r.skip).length,failed:[...cases.values()].filter(r=>!r.pass).length,skipped:[...cases.values()].filter(r=>r.skip).length}
assert.deepEqual(counts,{tests:44,passed:43,failed:1,skipped:0})
const initial=require('./codex-review-round32-results-postwrite.cjs'),confirmed=require('./codex-review-round32-results-postwrite-confirmed.cjs')
assert.deepEqual(initial.failures.map(x=>x.name),confirmed.failures.map(x=>x.name))
const output={target:scope.target,comparedProductRange:'f680ac1..7e08fb1',relatedCodeLimit:'162d50e..7e08fb1',counts,executions,diagnostics,sourceComparisons:comparisons,
 notes:{runtimeTarget:'7e08fb1',oldRuntimeExecuted:false,
  closure:'CR31-B01: real transaction work completes and commits, test pauses the return of that transaction, then an actual company PATCH moves/renames the holiday order. Old branch GET is 404; resumed update is 200 and returns only its own committed name. Delaying detailAfterWrite gives the same result. Affected holiday-work test also exercises a real SQL row-lock queue without service hooks.',
  adaptation:'The removed post-commit repository read can no longer be hooked. New test delays return from the real transaction after it commits; it does not change transaction work, returned row, scope decisions, or persistence. Original Round31 tests remain untouched.',
  effects:'Real Friday punches discover overtime. Updating a future holiday order to cover that day recomputes one day and cancels detected overtime; detail reply equals GET. Payroll creates 300 (9000/30/8*4*2). Updating multiplier cancels unreserved credit, recalculation creates exactly one 225 credit, overtimeAmount=0. Cancelling the order and recalculating removes the credit. Existing affected test preserves reserved 487.50 on an approved run.',
  blocker:'CR32-B01: create an A-branch allowance 150.25 and pause the subsequent monthRunsFor read, after the grant transaction commits. Transfer employee through actual PATCH, create and calculate a new B-only payroll through actual endpoints (membership snapshot branch B). Old branch cannot list it and GET is 403. Resume the allowance response: 201 with correct 150.25 plus forbidden new run id/name/status in recalculateRuns. Confirmed on two disposable databases; the second run asserts the membership snapshot explicitly. No incorrect money or unauthorized write is claimed.',
  scopeDecision:'This is not the accepted mixed-run header case: the new run has only one member, whose snapshot is branch B. The branch-A allowance was saved before transfer; its existence does not make the subsequent B-only payroll readable.',
  controls:'An allowance whose employee and calculated payroll remain inside branch A returns its allowed run reference and 150.25 unchanged.',
  adjacentSourceReadOnly:['financial-exemptions.detailIn/transactions','bonuses.act/detail','typed-deductions.act/detail','obligations.create/cancel','loans transactions','payroll-disbursement.mark/view','employees.update','holiday-work.create/detail'],
  repeatedExecution:{file:'codex-review-round32-results-postwrite.cjs',classification:'Initial valid reproduction, not double counted. Diagnostic initially accessed member.branchId instead of member.snapshot.branchId; authorization/list assertions already demonstrated denied access. Corrected diagnostic and strengthened snapshot assertion for confirmation.'},
  fixtureCorrection:{file:'codex-review-round32-results-effects.cjs',classification:'New review test initially invoked the draft-only calculate endpoint for a CALCULATED run. Product correctly refused 400 PAYRUN-STATE-001. Only the new test was corrected to the recalculate endpoint with reason; final case passes.'},
  preparationCorrection:'Before any execution, normalized CRLF/LF in the new prepare script so its hook adaptation matches either working-copy newline style.',
  migrations:'No new product migration. Affected fixture tests exercise existing 055 and 074 only on their owned disposable databases, permitted by prior owner clarification. No company migrations.',
  performanceMeasured:false,fullSuiteExecuted:false,servicesStartedOrStopped:false,companyDatabasesWritten:false},staticChecks:require('./codex-review-round32-static-checks.cjs')}
fs.writeFileSync(path.join(__dirname,'codex-review-round32-evidence-results.cjs'),'module.exports = '+JSON.stringify(output,null,2)+'\n')
console.log(JSON.stringify({target:scope.target,counts,sourceComparisons:comparisons}))
