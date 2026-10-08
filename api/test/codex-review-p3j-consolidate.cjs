'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const selected=['closure','regression','slot-races-complete','unlink-final','domain-final'],unique=new Map()
for(const suffix of selected){const file=`codex-review-p3j-results-${suffix}.cjs`,r=require('./'+file);for(const row of r.results)if(!row.skip)unique.set(row.file+'|'+row.name,{...row,resultFile:file})}
const results=[...unique.values()],counts={tests:results.length,passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length}
assert.equal(counts.tests,201);assert.equal(counts.failed,0)
const out={target:require('./codex-review-p3j-scope-evidence.cjs').target,counts,selected,earlyRuns:[{file:'codex-review-p3j-results-slot-races.cjs',disposition:'Review fixture used an incorrect import path for localDateOf; corrected only the new P3J test helper, then both transfer cases passed.'},{file:'codex-review-p3j-results-slot-races-complete.cjs',disposition:'Initial unlink expectation required immediate login success. Observed safe 409 from the existing conditional GUID writer, then verified a fresh login returns 201 with one correctly linked account. Final unlink evidence supersedes that expectation.'}],excluded:['integrity.integration.cjs: older migration fixture excluded by runner; not counted or run.'],results}
fs.writeFileSync(path.join(__dirname,'codex-review-p3j-consolidated.cjs'),'module.exports = '+JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(counts))
