'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),scope=require('./codex-review-round26-scope-evidence.cjs')
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
assert.equal(git(['rev-parse','HEAD']),scope.target)
const suffixes=['previous','affected','independent'],cases=new Map()
const executions=suffixes.map(suffix=>{
 const file=`codex-review-round26-results-${suffix}.cjs`,r=require(path.join(__dirname,file))
 for(const c of r.results){const key=c.file+':'+c.name;assert.ok(!cases.has(key));cases.set(key,c)}
 return {file,selected:r.selected,counts:r.summary.counts,failures:r.failures.map(f=>({file:f.file,name:f.name,error:f.error}))}
})
const before=git(['show','f7a184e:api/src/payroll/payroll-reversal-ledger.ts']),current=fs.readFileSync(path.join(root,'api/src/payroll/payroll-reversal-ledger.ts'),'utf8')
const functions=['describePayrollRunCorrection','describePayrollItemReversal']
const slice=(source,name)=>{const normalized=source.replaceAll('\r\n','\n'),start=normalized.indexOf(`export async function ${name}(`),next=normalized.indexOf('\nexport ',start+1);assert.ok(start>=0);return normalized.slice(start,next===-1?undefined:next).trim()}
const sourceComparison=functions.map(name=>({name,unchanged:slice(before,name)===slice(current,name),sha256:crypto.createHash('sha256').update(slice(current,name)).digest('hex')}))
assert.ok(sourceComparison.every(row=>row.unchanged))
const counts={tests:cases.size,passed:[...cases.values()].filter(r=>r.pass).length,failed:[...cases.values()].filter(r=>!r.pass).length}
const output={target:scope.target,comparedProductRange:'f7a184e..84f26e8',counts,executions,rawSerializersComparedWithPreviousCommit:sourceComparison,
 notes:{runtimeTarget:'84f26e8',oldRuntimeExecuted:false,fullResponseCheck:'Actual HTTP correction and reversal bodies compared by deep equality to unchanged raw serializers on the same disposable data.',
  directFixtureUpdates:'Employee placement was prepared on the disposable database; the dated case also uses appendEmployeeOrgCalendar in a transaction. Payroll and exemption actions use the guarded API.',performanceMeasured:false},
 staticChecks:require('./codex-review-round26-static-checks.cjs')}
fs.writeFileSync(path.join(__dirname,'codex-review-round26-evidence-results.cjs'),'module.exports = '+JSON.stringify(output,null,2)+'\n')
console.log(JSON.stringify({target:scope.target,counts,rawSerializersUnchanged:true}))
