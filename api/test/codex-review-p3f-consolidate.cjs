'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const names=['closure','new-races','role-writer','regression'],tests=new Map(),runs=[]
for(const suffix of names){const file='codex-review-p3f-results-'+suffix+'.cjs',r=require('./'+file);runs.push({file,counts:r.summary.counts});for(const t of r.results){if(!t.skip)tests.set(t.file+'|'+t.name,t)}}
const all=[...tests.values()],failed=all.filter(t=>!t.pass),passed=all.filter(t=>t.pass)
assert.equal(all.length,96);assert.equal(failed.length,4)
const result={target:require('./codex-review-p3f-scope-evidence.cjs').target,total:all.length,passed:passed.length,failed:failed.length,runs,failures:failed,staticChecks:require('./codex-review-p3f-static-checks.cjs')}
fs.writeFileSync(path.join(__dirname,'codex-review-p3f-consolidated.cjs'),'module.exports = '+JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify({total:all.length,passed:passed.length,failed:failed.length}))
