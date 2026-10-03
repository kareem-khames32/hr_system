'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),scope=require('./codex-review-round28-scope-evidence.cjs'),ts=require('../node_modules/typescript')
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
assert.equal(git(['rev-parse','HEAD']),scope.target)
const suffixes=['previous','affected','boundaries','related-confirmed'],cases=new Map(),diagnostics=[]
const executions=suffixes.map(suffix=>{
 const file=`codex-review-round28-results-${suffix}.cjs`,r=require(path.join(__dirname,file))
 for(const c of r.results){const key=c.file+':'+c.name;assert.ok(!cases.has(key));cases.set(key,c)}
 for(const line of r.diagnostics||[])try{const d=JSON.parse(line);if(d.case)diagnostics.push(d)}catch{}
 return {file,selected:r.selected,counts:r.summary.counts,failures:r.failures.map(f=>({file:f.file,name:f.name,error:f.error}))}
})
const parsed=(source,name)=>ts.createSourceFile(name,source.replaceAll('\r\n','\n'),ts.ScriptTarget.Latest,true)
const method=(source,name)=>{let found;function visit(n){if(ts.isMethodDeclaration(n)&&n.name?.getText(source)===name)found=n;ts.forEachChild(n,visit)}visit(source);assert.ok(found,name);return found}
const printer=ts.createPrinter({removeComments:true}),printed=(node,source)=>printer.printNode(ts.EmitHint.Unspecified,node,source)
const comparisons=[]
const p='api/src/payroll/financial-exemptions.service.ts',old=parsed(git(['show','e6fa740:'+p]),p),current=parsed(fs.readFileSync(path.join(root,p),'utf8'),p)
const oldDetail=method(old,'detail').body.statements[0].expression.arguments[0].body,newDetail=method(current,'detailIn').body
comparisons.push({file:p,part:'old detail transaction body versus new detailIn',unchanged:printed(oldDetail,old)===printed(newDetail,current)})
for(const methodName of ['views','visible','hiddenCarriedCopies'])comparisons.push({file:p,part:methodName,unchanged:printed(method(old,methodName).body,old)===printed(method(current,methodName).body,current)})
for(const service of ['bonuses','typed-deductions']){
 const file=`api/src/payroll/${service}.service.ts`,before=parsed(git(['show','e6fa740:'+file]),file),after=parsed(fs.readFileSync(path.join(root,file),'utf8'),file)
 comparisons.push({file,part:'cancel (newly reproduced, predates this fix)',unchanged:printed(method(before,'cancel').body,before)===printed(method(after,'cancel').body,after)})
}
assert.ok(comparisons.every(row=>row.unchanged),JSON.stringify(comparisons))
const counts={tests:cases.size,passed:[...cases.values()].filter(r=>r.pass&&!r.skip).length,failed:[...cases.values()].filter(r=>!r.pass).length,skipped:[...cases.values()].filter(r=>r.skip).length}
const output={target:scope.target,comparedProductRange:'e6fa740..770a591',relatedCodeLimit:'162d50e..770a591',counts,executions,diagnostics,sourceComparisons:comparisons,
 notes:{runtimeTarget:'770a591',oldRuntimeExecuted:false,
  originalRaceTest:'Previous test source preserved. Its 10-second gate equalled the SQL lock timeout. New tests explicitly cover attachment-first, recalculation-first, and real 409 timeout followed by retry; a safe busy response is accepted.',
  responseAtomicity:'A test-only detailIn wrapper calls the original, verifies Exclusive transaction-owned run lock, then injects a response-phase ForbiddenException. All five mutations roll back both rows and events; successful retry equals GET.',
  relatedRaces:'Real bonus/deduction creation and approval, branch-scoped cancel, and real PATCH employees with dated calendar command. A barrier pauses the existing await before acquiring the employee finance lock, after scope checking. Actual transfer commits first; cancellation commits request and obligation changes then returns 404.',
  preliminaryRuns:[{file:'codex-review-round28-results-related.cjs',classification:'fixture preparation errors: catalog code used a hyphen; fixed only in new test'},
   {file:'codex-review-round28-results-related-valid.cjs',classification:'fixture preparation errors: employee transfer omitted mandatory calendar command; fixed only in new test'},
   {file:'codex-review-round28-results-related-final.cjs',classification:'earlier reproduction of the same two product failures; superseded in distinct counts by related-confirmed with controls'}],
  performanceMeasured:false},staticChecks:require('./codex-review-round28-static-checks.cjs')}
fs.writeFileSync(path.join(__dirname,'codex-review-round28-evidence-results.cjs'),'module.exports = '+JSON.stringify(output,null,2)+'\n')
console.log(JSON.stringify({target:scope.target,counts,sourceComparisons:comparisons}))
