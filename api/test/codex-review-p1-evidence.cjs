'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const finalRuns=['batches','scheduler-confirmed','regression','regression-download-confirmed','independent-finance-confirmed','migrations-combined-confirmed','boundaries','money-current-final']
const rows=new Map()
for(const suffix of finalRuns){const result=require(`./codex-review-p1-results-${suffix}.cjs`);for(const row of result.results)rows.set(row.file+'::'+row.name,{...row,evidence:suffix})}
const values=[...rows.values()],counts={tests:values.length,passed:values.filter(r=>r.pass&&!r.skip).length,failed:values.filter(r=>!r.pass).length,skipped:values.filter(r=>r.skip).length}
const current=require('./codex-review-p1-money-current.cjs'),baseline=require('./codex-review-p1-money-baseline.cjs')
const strip=({variant,...rest})=>rest
assert.deepEqual(strip(current),strip(baseline))
const units=require('./codex-review-p1-unit-results.cjs'),staticChecks=require('./codex-review-p1-static-checks.cjs')
const output={target:require('./codex-review-p1-scope-evidence.cjs').target,finalRuns,counts,results:values,
 baselineComparison:{base:'ce15142',baselineProductTreeUnmodified:true,exactEquality:true,decimalFieldsCompared:true,totalNet:current.totalNet,rows:current.rows,status:current.status,baselineResult:'codex-review-p1-results-money-baseline-confirmed.cjs'},
 unitResults:units,staticChecks,environmentLimitations:{opsBackupTransport:'Docker pipe denied; SQL native full backup/restore/CHECKDB tested separately',nativeSql2019:false,compatibility:150,browserInteraction:false,performanceMeasured:false},
 supersededAttempts:{'scheduler-confirmed':'Scheduler metadata retained with timers disabled; resolves SJ-3 harness nextRunAt failure','regression-download-confirmed':'Express private dot-directory PDF fixture transport only; authorization unchanged','independent-finance-confirmed':'Corrected new test route /disbursement and expected status DISBURSED; supplied branch to backup employee','migrations-combined-confirmed':'Forced only second disposable datasource synchronize=false because Nest forRoot config was cached','money-current-final':'Existing debit seeded directly; creation of new direct debit is guarded by default','money-baseline-confirmed':'Added git safe.directory for read-only baseline comparison'},
 excludedEnvironmentFailure:'codex-review-p1-results-ops.cjs: four tests could not finish because backup transport cannot access Docker; not classified as product failure'}
fs.writeFileSync(path.join(__dirname,'codex-review-p1-evidence-results.cjs'),'module.exports = '+JSON.stringify(output,null,2)+'\n')
console.log(JSON.stringify({counts,baselineEqual:true,totalNet:current.totalNet,skips:values.filter(r=>r.skip).map(r=>({file:r.file,name:r.name,reason:r.skip})),unitKeys:Object.keys(units),failures:values.filter(r=>!r.pass).map(r=>({file:r.file,name:r.name}))}))
