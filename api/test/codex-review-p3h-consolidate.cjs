'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const names=['closure','permission-races','remaining-paths','fix-controls','regression','domain-final'],tests=new Map(),runs=[]
for(const suffix of names){const file='codex-review-p3h-results-'+suffix+'.cjs',r=require('./'+file);runs.push({file,counts:r.summary.counts});for(const t of r.results){if(!t.skip)tests.set(t.file+'|'+t.name,t)}}
const all=[...tests.values()],failed=all.filter(t=>!t.pass),passed=all.filter(t=>t.pass)
assert.equal(all.length,161);assert.equal(failed.length,5)
const result={target:require('./codex-review-p3h-scope-evidence.cjs').target,total:all.length,passed:passed.length,failed:failed.length,runs,failures:failed,staticChecks:require('./codex-review-p3h-static-checks.cjs'),excludedByRunner:['domain-login-two-factor.integration.cjs'],notes:['The domain-rebinding case was repeated with a protected /auth/me request proving the returned session enters as employee B. The final result replaces the earlier result for distinct-test counting.','No product or pre-existing test was changed. Old P3G next-role barrier was moved in a new P3H copy to before the first role-row lock.']}
fs.writeFileSync(path.join(__dirname,'codex-review-p3h-consolidated.cjs'),'module.exports = '+JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify({total:all.length,passed:passed.length,failed:failed.length}))
