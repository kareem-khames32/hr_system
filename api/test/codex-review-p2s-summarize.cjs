'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const runs=['closure','new','rcsi','separate-gates','regressions'].map(suffix=>{
 const file='codex-review-p2s-results-'+suffix+'.cjs',r=require('./'+file)
 assert.equal(r.summary.success,true);assert.equal(r.failures.length,0)
 return{file,selected:r.selected,counts:r.summary.counts}
})
const checks=require('./codex-review-p2s-static-checks.cjs');assert.ok(checks.results.every(r=>r.exitCode===0))
const summary={reviewed:'508fbb0',checkout:require('./codex-review-p2s-scope-evidence.cjs').target,
 totals:runs.reduce((a,r)=>({passed:a.passed+r.counts.passed,failed:a.failed+r.counts.failed,skipped:a.skipped+r.counts.skipped}),{passed:0,failed:0,skipped:0}),runs,
 staticChecks:checks.results,
 safety:{onlyGuardedDisposableDatabases:true,inProcessHttpOnly:true,realMail:false,existingFilesUnchanged:'verified separately',performanceBenchmark:false},
 coverage:['Real PATCH pool admission with one rejected handler','FIFO, shared deadline, expiration versus handoff, handler/query/commit failures','SQL same-account contention and independent admission-state instances','Transfer exact affected accounts, prior branch, same-branch revocation, active trigger','Transfer rebinding/current branch race under RC and RCSI','Atomic audit rollback and request versus background actor','Prior internal comment/file/notification boundaries and account history','Existing comments, comments migration, calendar transfer and audit suites'],
 limits:['SQL Server 2022 with compatibility level 150, not a SQL Server 2019 engine','Separate process admission simulated by independent module state; database applock tested on real SQL','Single-connection fallback serializes only within one process; current application uses the default pool size 10','No full application suite, browser, owner services or B2.9 work reviewed']}
fs.writeFileSync(path.join(__dirname,'codex-review-p2s-execution-summary.cjs'),'module.exports = '+JSON.stringify(summary,null,2)+'\n')
console.log(JSON.stringify({totals:summary.totals,runs:runs.map(r=>({file:r.file,passed:r.counts.passed})),tsc:'passed'}))
