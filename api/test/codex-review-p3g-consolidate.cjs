'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const names=['closure','writers','overlap-final','factor-paths','regression'],tests=new Map(),runs=[]
for(const suffix of names){const file='codex-review-p3g-results-'+suffix+'.cjs',r=require('./'+file);runs.push({file,counts:r.summary.counts});for(const t of r.results){if(!t.skip)tests.set(t.file+'|'+t.name,t)}}
const all=[...tests.values()],failed=all.filter(t=>!t.pass),passed=all.filter(t=>t.pass)
assert.equal(all.length,126);assert.equal(failed.length,3)
const result={target:require('./codex-review-p3g-scope-evidence.cjs').target,total:all.length,passed:passed.length,failed:failed.length,runs,failures:failed,staticChecks:require('./codex-review-p3g-static-checks.cjs'),fixtureCorrections:[{run:'codex-review-p3g-results-overlap.cjs',detail:'Two lock-order controls initially asserted a displayName update that the account DTO does not expose. Changed only our new test to isActive:false, an accepted field; both real SQL lock orders then passed. No product defect counted from these two initial assertions.'}]}
fs.writeFileSync(path.join(__dirname,'codex-review-p3g-consolidated.cjs'),'module.exports = '+JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify({total:all.length,passed:passed.length,failed:failed.length}))
