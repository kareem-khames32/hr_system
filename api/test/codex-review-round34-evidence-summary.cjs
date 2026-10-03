'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),ts=require('../node_modules/typescript')
const root=path.resolve(__dirname,'../..'),scope=require('./codex-review-round34-scope-evidence.cjs')
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
assert.equal(git(['rev-parse','HEAD']),scope.target)
const cases=new Map(),diagnostics=[]
const suffixes=['previous','affected','independent-v2','boundaries-confirmed','exemption-events-final']
const executions=suffixes.map(suffix=>{
 const file=`codex-review-round34-results-${suffix}.cjs`,r=require(path.join(__dirname,file))
 for(const c of r.results){const key=c.file+':'+c.name;assert.ok(!cases.has(key));cases.set(key,c)}
 for(const line of r.diagnostics||[])try{const d=JSON.parse(line);if(d.case)diagnostics.push(d)}catch{}
 return {file,selected:r.selected,counts:r.summary.counts,failures:r.failures.map(f=>({file:f.file,name:f.name,error:f.error}))}
})
const counts={tests:cases.size,passed:[...cases.values()].filter(r=>r.pass&&!r.skip).length,failed:[...cases.values()].filter(r=>!r.pass).length,skipped:[...cases.values()].filter(r=>r.skip).length}
assert.deepEqual(counts,{tests:65,passed:62,failed:3,skipped:0})
const parsed=(text,name)=>ts.createSourceFile(name,text.replaceAll('\r\n','\n'),ts.ScriptTarget.Latest,true)
function part(source,name){let found;function visit(n){if((ts.isMethodDeclaration(n)||ts.isFunctionDeclaration(n))&&n.name?.getText(source)===name)found=n;ts.forEachChild(n,visit)}visit(source);assert.ok(found,name);return found}
const printer=ts.createPrinter({removeComments:true}),print=(n,s)=>printer.printNode(ts.EmitHint.Unspecified,n,s)
const sourceComparisons=[]
for(const [file,name] of [['api/src/payroll/payroll-obligation-ledger.ts','postPayrollObligations'],['api/src/payroll/payroll-financial-exemption-ledger.ts','postExemptedObligations']]){
 const current=parsed(fs.readFileSync(path.join(root,file),'utf8'),file)
 for(const revision of ['162d50e','2ba6575']){
  const old=parsed(git(['show',revision+':'+file]),file)
  const unchanged=print(part(old,name).body,old)===print(part(current,name).body,current)
  assert.ok(unchanged);sourceComparisons.push({revision,file,function:name,bodyUnchangedIgnoringComments:true})
 }
}
const preparationCorrections=[
 {file:'independent',reason:'Employee self-service is /mine; an employee without an administrative basis gets 404 on the administrative detail route. Removed that incorrect positive detail assertion, retained real own /mine verification.'},
 {file:'boundaries',reason:'Resume of a historical period returns DEDUCTION_PERIOD_PAST before the closed-period guard. The final test records this correctly; the closed-resume message is read in code but not independently forced in this scenario.'},
 {file:'boundaries-v2',reason:'A transfer effective today cannot overlap a future paid payroll; the API correctly returned 409. Final reproduction uses real past July/August 2026 payrolls and a real current transfer.'},
 {file:'boundaries-v3',reason:'Direct future transfer correctly returned 400; future transfers require their request workflow. No guard bypassed in the final reproduction.'},
 {file:'boundaries-v4',reason:'A prior-year payroll was outside the fixture policy effective date. Final reproduction uses fixed past July/August 2026, inside the published policy.'},
 {file:'exemption-events',reason:'QUALITY was a fixture category typo; valid product category is PERFORMANCE.'},
 {file:'exemption-events-confirmed',reason:'Fixture called calculate on CALCULATED instead of recalculate; corrected the new test only.'},
 {file:'exemption-events-v3',reason:'Recalculate requires a reason. Added the fixture reason; final reproduction reaches the disclosure assertions.'}
]
const output={target:scope.target,comparedProductRange:'2ba6575..622b637',relatedCodeLimit:'162d50e..622b637',counts,executions,diagnostics,sourceComparisons,preparationCorrections,
 findings:[{id:'CR34-B01',classification:'branch-isolation identifier disclosure; no observed money error',route:'GET /deductions/:id and mutation responses using detailIn, including POST /deductions/obligations/:id/decision',
  reproducedEvents:['CARRY_FORWARD','CARRY_SUSPENDED','EXEMPTION_GRANTED','EXEMPTED','DEFERRED_BY_EXEMPTION'],field:'events[].payload.runId',
  cause:'detailIn redacts deferredPastClosedRunId only; the generic runId in ledger/exemption events is returned unchanged.',
  expectations:'Keep request access, financial effects, stored event evidence and in-scope/company references. Redact hidden references using the employee membership snapshot rule before returning any event-bearing view.',
  preExisting:'Event-producing functions are unchanged from 162d50e and 2ba6575 by AST body comparison. No old-code runtime executed; the live disclosure was reproduced on target 622b637.'}],
 closure:{id:'CR33-B01',closed:true,evidence:'Unmodified Round33 independent suite 10/10; allowance APPROVED/PAID cancellation retains 409, hides foreign run ID, preserves company ID and leaves ledger unchanged.'},
 notes:{finance:'Bonus 123.45 produces net 9123.45 on salary 9000; deduction 67.89 produces 8932.11. Carry of 2500 across two salary-1000 payrolls collects 2000, leaves 500, each net 0. Exemption DROP/DEFER_ONE_PERIOD of 123.45 changes net 8876.55 to 9000, collected 0; deferred child is exactly 123.45.',
  self:'Employee own bonuses/deductions mine retains run references; privileged branch-current reader loses foreign snapshot references in obligation fields.',
  guards:'Both direct and exempted ledger reservation guards executed on real disposable SQL transactions: 409 PAYRUN-OBLIGATION-RESERVED, no foreign payroll number, row unchanged.',
  limitations:['No full integration/unit suite in this round.','No browser/UI execution.','No legacy-missing-period bonus label fixture independently forced.','Closed-period guard for resumed installments inspected but historical runtime hits the earlier past-period guard.','No migration run and no native SQL Server 2019 instance used.'],
  performanceMeasured:false,productModified:false,oldTestsModified:false,companyDatabasesWritten:false,servicesStartedOrStopped:false,oldRuntimeExecuted:false},
 staticChecks:require('./codex-review-round34-static-checks.cjs')}
fs.writeFileSync(path.join(__dirname,'codex-review-round34-evidence-results.cjs'),'module.exports = '+JSON.stringify(output,null,2)+'\n')
console.log(JSON.stringify({target:scope.target,counts,sourceComparisons,preparationCorrections:preparationCorrections.length}))
