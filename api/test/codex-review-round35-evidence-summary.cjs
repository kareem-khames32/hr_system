'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),ts=require('../node_modules/typescript')
const root=path.resolve(__dirname,'../..'),scope=require('./codex-review-round35-scope-evidence.cjs')
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
assert.equal(git(['rev-parse','HEAD']),scope.target)
const cases=new Map(),diagnostics=[]
const executions=['previous','affected','independent','downstream-expanded','payload'].map(suffix=>{
 const file=`codex-review-round35-results-${suffix}.cjs`,r=require(path.join(__dirname,file))
 for(const c of r.results){const key=c.file+':'+c.name;assert.ok(!cases.has(key));cases.set(key,c)}
 for(const line of r.diagnostics||[])try{const d=JSON.parse(line);if(d.case)diagnostics.push(d)}catch{}
 return {file,selected:r.selected,counts:r.summary.counts,failures:r.failures.map(f=>({file:f.file,name:f.name,error:f.error}))}
})
const counts={tests:cases.size,passed:[...cases.values()].filter(r=>r.pass&&!r.skip).length,failed:[...cases.values()].filter(r=>!r.pass).length,skipped:[...cases.values()].filter(r=>r.skip).length}
assert.deepEqual(counts,{tests:61,passed:57,failed:4,skipped:0})
const parse=(s,name)=>ts.createSourceFile(name,s.replaceAll('\r\n','\n'),ts.ScriptTarget.Latest,true)
function declaration(source,name){let found;function visit(n){if((ts.isFunctionDeclaration(n)||ts.isMethodDeclaration(n))&&n.name?.getText(source)===name)found=n;ts.forEachChild(n,visit)}visit(source);assert.ok(found,name);return found}
const printer=ts.createPrinter({removeComments:true}),print=(n,s)=>printer.printNode(ts.EmitHint.Unspecified,n,s)
const sourceComparisons=[]
for(const [file,name,revision] of [
 ['api/src/payroll/payroll-reversal-ledger.ts','planPayrollItemReversal','162d50e'],
 ['api/src/payroll/payroll-reversal-ledger.ts','planPayrollItemReversal','622b637'],
 ['api/src/payroll/payroll.service.ts','assertRunAccess','622b637'],
 ['api/src/payroll/payroll-corrections.service.ts','createReversal','622b637']
]){
 const old=parse(git(['show',revision+':'+file]),file),current=parse(fs.readFileSync(path.join(root,file),'utf8'),file)
 const unchanged=print(declaration(old,name).body,old)===print(declaration(current,name).body,current)
 assert.ok(unchanged);sourceComparisons.push({revision,file,method:name,bodyUnchangedIgnoringComments:true})
}
const output={target:scope.target,comparedProductRange:'622b637..21c07f3',relatedCodeLimit:'162d50e..21c07f3',counts,executions,diagnostics,sourceComparisons,
 closure:{id:'CR34-B01',closed:true,evidence:'All six unchanged Round34 tests pass: carry, suspension, grant/drop/defer exemption events and resumed-installment response redact foreign run IDs. Independent real payroll reversal verifies foreign references and reason-number redaction in bonus/deduction events and loan ledger; company and borrower own ledger retain references. Stored evidence unchanged.'},
 findings:[
 {id:'CR35-B01',severity:'blocking branch-isolation disclosure',preExisting:true,source:'payroll-reversal-ledger.ts planPayrollItemReversal',
  routes:['POST /payroll/runs/:id/reversal-preview','POST /payroll/runs/:id/reversals','POST /payroll/runs/:id/approve (reversal)','POST /payroll/runs/:id/pay (reversal)'],
  reproduction:'Pay an A-only salary-1000 payroll against a 1500 loan: 1000 collected, 500 carried. Actually transfer employee to B effective the following cycle. Calculate and approve B-only payroll reserving the 500 child installment. Reader A can read source A (200), cannot read holding B (403), but preview and create/approve/pay refusals expose B run ID in text and blockers[].details.runId. Three independent employees cover creation, approval and payment. Ledger, events and runs unchanged by rejected actions.',
  financialResult:'Source net 0, later installment 500, later net 500; refusal remains 409 PAYRUN-REVERSAL-BLOCKED. Preserve the blocking behavior while masking the unrelated run.',
  note:'Reversal preview may show amounts for the authorized source payroll; this does not authorize the identifier of an entirely foreign downstream payroll. Not the deferred 403/404 existence distinction.'},
 {id:'CR35-N01',severity:'nonblocking over-redaction regression',source:'payroll-run-visibility.ts payrollRunRefVisibility',
  reproduction:'A-only custom payroll and its paid reversal are both directly readable by A (200/200). Bonus and deduction PAYROLL_REVERSED events retain originalRunId but return reversalRunId:null and scrub their reason. Loan ledger REVERSAL returns payrollRunId:null. Company retains all references; money is correct.',
  cause:'assertRunAccess delegates reversal access to parent payroll. The reference helper only checks own membership or legacy stamped branch, without using parentRunId. A generated CUSTOM reversal lacks its own membership/branch snapshot.',
  whyNonblocking:'No foreign data disclosed or financial action incorrectly allowed; reference is missing from an otherwise visible audit record. Original/reversal pages and company/employee views remain available.'}
 ],
 notes:{runtimeTarget:'21c07f3',oldRuntimeExecuted:false,unitCases:1,sqlIntegrationCases:60,
  finance:'9000 + 123.45 bonus - 67.89 deduction - 300.12 loan = 8755.44. Paid loan balance: paid 300.12, remaining 300.12. Actual reversal total -8755.44 restores loan paid 0, remaining 600.24. Stored loan/events unchanged by all reads.',
  helperCoverage:'Nested object/array run references, allowed references, amount/date preservation, immutable stored input and company deep equality independently executed.',
  otherPolicies:'Prior owner exceptions including source-parent heads, own payslips, Q-010 amount visibility and deferred existence distinctions unchanged; no new blocker assigned to those exceptions.',
  preparationCorrection:'First downstream fixture assertion looked for blocker.runId rather than blocker.details.runId. Corrected only the new test. Initial valid reproduction repeated with the expanded create/approve/pay coverage; duplicates excluded from final count.',
  performanceMeasured:false,fullIntegrationSuiteExecuted:false,fullUnitSuiteExecuted:false,browserExecuted:false,migrationsExecuted:false,productModified:false,oldTestsModified:false,companyDatabasesWritten:false,servicesStartedOrStopped:false,
  limitations:'Scoped read and targeted runtime tests, not an exhaustive guarantee over all historical endpoints. SQL engine recorded in final audit; compatibility 150 is not a native SQL Server 2019 execution.'},
 staticChecks:require('./codex-review-round35-static-checks.cjs')}
fs.writeFileSync(path.join(__dirname,'codex-review-round35-evidence-results.cjs'),'module.exports = '+JSON.stringify(output,null,2)+'\n')
console.log(JSON.stringify({target:scope.target,counts,sourceComparisons}))
