'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),ts=require('typescript')
const root=path.resolve(__dirname,'../..'),scope=require('./codex-review-round36-scope-evidence.cjs')
const suffixes=['previous35','previous34','affected','boundaries','ledger','ledger-response']
const executions=suffixes.map(s=>{
 const file=`codex-review-round36-results-${s}.cjs`,r=require('./'+file)
 return {file,selected:r.selected,counts:r.summary.counts,failures:r.failures.map(x=>({file:x.file,name:x.name,error:x.error}))}
})
const counts={tests:0,passed:0,failed:0,skipped:0};for(const r of executions)for(const key of Object.keys(counts))counts[key]+=r.counts[key]
assert.deepEqual(counts,{tests:86,passed:82,failed:4,skipped:0})
const diagnostics=[]
for(const suffix of suffixes)for(const value of require(`./codex-review-round36-results-${suffix}.cjs`).diagnostics||[]){
 try{const row=JSON.parse(value);if(row.case)diagnostics.push(row)}catch{}
}
const git=args=>execFileSync('git',['-c',`safe.directory=${root.replaceAll('\\','/')}`,...args],{cwd:root,encoding:'utf8'})
const printer=ts.createPrinter({removeComments:true,newLine:ts.NewLineKind.LineFeed})
function body(text,file,name){
 const source=ts.createSourceFile(file,text.replace(/\r\n/g,'\n'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);let result
 const visit=node=>{if((ts.isMethodDeclaration(node)||ts.isFunctionDeclaration(node))&&node.name?.getText(source)===name&&node.body)result=printer.printNode(ts.EmitHint.Unspecified,node.body,source);ts.forEachChild(node,visit)}
 visit(source);assert.ok(result,`${file}:${name}`);return result
}
const preexisting=[]
for(const [revision,file,methods] of [
 ['21c07f3','api/src/payroll/obligations.service.ts',['listByEmployee','cancel']],
 ['162d50e','api/src/payroll/obligations.service.ts',['listByEmployee']],
 ['21c07f3','api/src/payroll/payroll-reversal-ledger.ts',['postPayrollReversalLine']],
]){
 const old=git(['show',`${revision}:${file}`]),current=fs.readFileSync(path.join(root,file),'utf8')
 for(const method of methods)preexisting.push({revision,file,method,bodyUnchangedIgnoringComments:body(old,file,method)===body(current,file,method)})
}
assert.ok(preexisting.every(x=>x.bodyUnchangedIgnoringComments))
const output={target:scope.target,comparedProductRange:'21c07f3..17086dd',relatedCodeLimit:'162d50e..17086dd',counts,executions,diagnostics,preexisting,
 closures:[
 {id:'CR35-B01',closed:true,evidence:'Unchanged previous tests and expanded independent real SQL tests pass. Preview line and aggregate blockers hide foreign run ID/status; create, approve and pay return 409 to both branch and company without changing complete loan, payroll, installment, allocation or event state. Company retains references. Preview hashes are identical. Internal redactedMessage is absent from all responses.'},
 {id:'CR35-N01',closed:true,evidence:'Real paid original/reversal both directly readable by branch A (200/200); bonus and deduction PAYROLL_REVERSED and loan REVERSAL keep both allowed refs, while entirely foreign original/reversal remain hidden. Company and employee retain permitted references.'}
 ],
 findings:[{id:'CR36-B01',severity:'blocking branch-isolation disclosure',preExisting:true,
  sources:[{file:'api/src/payroll/obligations.service.ts',line:102,method:'listByEmployee'},{file:'api/src/payroll/obligations.service.ts',line:116,method:'cancel'}],
  routes:['GET /obligations/employee/:id','POST /obligations/:id/cancel'],
  fields:['reservedPayrollRunId','appliedPayrollRunId','payrollReversalRunId'],
  reproduction:'Create a real manual CREDIT 123.45 for a salary-9000 employee in B. Calculate/approve, or pay, or pay/reverse B-only payroll. Transfer employee to A by the real employee API. A reader with payroll.view/payroll.calculate cannot open original or reversal payroll (403) but generic obligations list (200) exposes foreign reservation/application/reversal IDs. Successful cancel response (201) also exposes the foreign reserved payroll ID. Company preserves all refs; an A-only run reference is correctly visible in the positive cancellation control.',
  amounts:'123.45 credit, approved net 9123.45. Reads leave ledger unchanged. Cancellation intentionally changes status to CANCELLED; tested financial fields and approved payroll amount stay unchanged. This finding is response disclosure, not a requested change to cancellation policy.',
  expected:'Keep access, amounts and action semantics while applying payroll reference visibility per employee to every run-reference field in list and cancellation responses. Keep company and otherwise permitted refs unchanged.',
  boundary:'Entirely foreign B membership snapshots, not a mixed payroll head, employee self-view, or deferred 403/404 existence difference.'}],
 notes:{runtimeTarget:'17086dd',oldRuntimeExecuted:false,sqlIntegrationCases:85,unitCases:1,
  finance:'Independent true bonus/deduction/loan payment: 9000 + 123.45 - 67.89 - 300.12 = 8755.44; reversal -8755.44; loan restored to paid 0 / remaining 600.24. Separate blocking examples collect 1000 of 1500, carry 500, and later payroll net 500, without any rejected-action financial change.',
  otherPolicies:'Prior owner exceptions unchanged; no new blocker assigned to them. Raw generic obligations are an additional unmasked reader path, not a reversal-fix regression.',
  performanceMeasured:false,fullIntegrationSuiteExecuted:false,fullUnitSuiteExecuted:false,browserExecuted:false,migrationsExecuted:false,productModified:false,oldTestsModified:false,companyDatabasesWritten:false,servicesStartedOrStopped:false,
  limitations:'Scoped reading and executed targeted tests; not an exhaustive assurance for all historical endpoints. SQL engine/version and cleanup recorded separately. Compatibility 150 does not constitute native SQL Server 2019 testing.'},
 staticChecks:require('./codex-review-round36-static-checks.cjs')}
fs.writeFileSync(path.join(__dirname,'codex-review-round36-evidence-results.cjs'),'module.exports = '+JSON.stringify(output,null,2)+'\n')
console.log(JSON.stringify({counts,closures:output.closures.map(x=>({id:x.id,closed:x.closed})),findings:output.findings.map(x=>x.id),preexisting}))
