'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),scope=require('./codex-review-round27-scope-evidence.cjs')
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
assert.equal(git(['rev-parse','HEAD']),scope.target)
const suffixes=['previous','affected','boundaries'],cases=new Map(),diagnostics=[]
const executions=suffixes.map(suffix=>{
 const file=`codex-review-round27-results-${suffix}.cjs`,r=require(path.join(__dirname,file))
 for(const c of r.results){const key=c.file+':'+c.name;assert.ok(!cases.has(key));cases.set(key,c)}
 for(const line of r.diagnostics||[])try{const d=JSON.parse(line);if(d.case)diagnostics.push(d)}catch{}
 return {file,selected:r.selected,counts:r.summary.counts,failures:r.failures.map(f=>({file:f.file,name:f.name,error:f.error}))}
})
const before=git(['show','84f26e8:api/src/payroll/payroll-reversal-ledger.ts']),current=fs.readFileSync(path.join(root,'api/src/payroll/payroll-reversal-ledger.ts'),'utf8')
const functions=['describePayrollRunCorrection','describePayrollItemReversal']
const slice=(source,name)=>{const normalized=source.replaceAll('\r\n','\n'),start=normalized.indexOf(`export async function ${name}(`),next=normalized.indexOf('\nexport ',start+1);assert.ok(start>=0);return normalized.slice(start,next===-1?undefined:next).trim()}
const sourceComparison=functions.map(name=>({name,unchanged:slice(before,name)===slice(current,name),sha256:crypto.createHash('sha256').update(slice(current,name)).digest('hex')}))
assert.ok(sourceComparison.every(row=>row.unchanged))
const counts={tests:cases.size,passed:[...cases.values()].filter(r=>r.pass&&!r.skip).length,failed:[...cases.values()].filter(r=>!r.pass).length,skipped:[...cases.values()].filter(r=>r.skip).length}
const race=diagnostics.find(d=>d.case==='attachment-scope-race');assert.ok(race)
const output={target:scope.target,comparedProductRange:'84f26e8..e6fa740',relatedCodeLimit:'162d50e..e6fa740',counts,executions,diagnostics,
 rawSerializersComparedWithPreviousCommit:sourceComparison,
 notes:{runtimeTarget:'e6fa740',oldRuntimeExecuted:false,
  fullResponseCheck:'Actual guarded API correction and reversal bodies compared by deep equality to unchanged raw serializers on the same disposable data. No claim of whole-system byte equality across two deployed versions.',
  directFixtureUpdates:'Employee placement is prepared only on disposable databases; the dated scenario uses appendEmployeeOrgCalendar in a transaction. Recalculation, payment, reversal, supplementary creation and exemption actions use real guarded API handlers in process, without a listener.',
  concurrencyControl:'The test calls the real loadCarriedPlaces, then pauses its return once. While attachment is paused with exemption row locked, company recalculation commits a new membership. No scope result or SQL snapshot is fabricated. Finally always releases the barrier and restores the runtime method.',
  observedImpact:'Attachment reference and ATTACHMENT_ADDED event committed after foreign membership committed, followed by 403. The request began while its branch was authorized; no post-transfer standalone bypass or monetary alteration was demonstrated.',
  performanceMeasured:false},staticChecks:require('./codex-review-round27-static-checks.cjs')}
fs.writeFileSync(path.join(__dirname,'codex-review-round27-evidence-results.cjs'),'module.exports = '+JSON.stringify(output,null,2)+'\n')
console.log(JSON.stringify({target:scope.target,counts,rawSerializersUnchanged:true,race}))
