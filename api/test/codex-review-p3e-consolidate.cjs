'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const sources=['regression','closure','auth-races','final-races','reports-final'],byTest=new Map()
for(const suffix of sources){const file='codex-review-p3e-results-'+suffix+'.cjs',run=require('./'+file);for(const row of run.results)byTest.set(row.file+'\n'+row.name,{...row,resultFile:file})}
const results=[...byTest.values()],counts={tests:results.length,passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length}
assert.equal(counts.tests,93);assert.equal(counts.failed,3)
const value={target:require('./codex-review-p3e-scope-evidence.cjs').target,note:'Latest execution for each unchanged test name; initial setup and interrupted-run failures superseded by the listed later runs.',sources,counts,results}
fs.writeFileSync(path.join(__dirname,'codex-review-p3e-consolidated.cjs'),'module.exports = '+JSON.stringify(value,null,2)+'\n');console.log(JSON.stringify(counts))
