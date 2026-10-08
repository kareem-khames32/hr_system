'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const selected=['closure','auth-regression','range-locks-final','domain-creation-final'],unique=new Map()
for(const suffix of selected){const file=`codex-review-p3i-results-${suffix}.cjs`,r=require('./'+file);for(const row of r.results)unique.set(row.file+'|'+row.name,{...row,resultFile:file})}
const results=[...unique.values()],counts={tests:results.length,passed:results.filter(r=>r.pass&&!r.skip).length,failed:results.filter(r=>!r.pass).length,skipped:results.filter(r=>r.skip).length}
assert.equal(counts.tests,166);assert.equal(counts.failed,2)
const out={target:require('./codex-review-p3i-scope-evidence.cjs').target,counts,selected,earlyRuns:[{file:'codex-review-p3i-results-range-locks.cjs',disposition:'Harness setup only: the account already had the proposed role, so no role-change lock was required. Corrected our new fixture to use the sentinel source role; final two SQL-wait cases pass.'},{file:'codex-review-p3i-results-domain-creation.cjs',disposition:'Same two product failures; final run adds a sequential negative control.'}],results}
fs.writeFileSync(path.join(__dirname,'codex-review-p3i-consolidated.cjs'),'module.exports = '+JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(counts))
