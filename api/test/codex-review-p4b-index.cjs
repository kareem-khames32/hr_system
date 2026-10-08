'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const read=n=>require('./codex-review-p4b-results-'+n+'.cjs')
const affected=read('affected'),closure=read('closure'),tax=read('tax-overtime-final'),tiers=read('tier-writers')
const independent=[...closure.results.filter(r=>!r.file.includes('-tax.')),...tax.results,...tiers.results]
assert.equal(independent.length,14);assert.ok(independent.every(r=>r.pass));assert.equal(affected.summary.counts.passed,100)
const tapFile=path.join(__dirname,'codex-review-p4b-default-parity.tap'),buffer=fs.readFileSync(tapFile)
const tap=buffer[0]===255&&buffer[1]===254?buffer.toString('utf16le').replace(/^\uFEFF/,''):buffer.toString('utf8')
fs.writeFileSync(tapFile,tap);assert.match(tap,/pass 82/);assert.match(tap,/fail 0/)
const results={target:require('./codex-review-p4b-scope-evidence.cjs').target,verdicts:{'B4.4':'APPROVE','B4.5':'APPROVE','B4.8':'REJECT',phase4:'REJECT'},
 blocker:{id:'P4B-B01',continues:'P4A-B04',evidence:'P4B-D03',file:'codex-review-p4b-export-derived.integration.cjs'},
 note:{id:'P4B-N01',evidence:'P4B-N01',sqlError:1205,file:'codex-review-p4b-export-locks.integration.cjs'},
 existing:{files:affected.selected.length,tests:affected.summary.counts.passed,result:'codex-review-p4b-results-affected.cjs'},
 independent:{tests:independent.length,results:independent},units:{tests:82,baseline:'456e544',salaryItems:500},
 checks:require('./codex-review-p4b-static-checks.cjs'),
 setupCorrections:'Early P4B tax runs incorrectly expected a JSON error code and then enabled an already-enabled calculator; corrected only our evidence. Final tests pass. No product changes.',
 reproduction:{env:{REVIEW_PRELOAD:'codex-review-p4b-lfsql-preload.cjs',REVIEW_RESULT_SUFFIX:'rerun'},command:'node api/test/codex-review-p4b-suite.cjs codex-review-p4b-tax codex-review-p4b-overtime-history codex-review-p4b-tiers-race codex-review-p4b-tiers-writers codex-review-p4b-export codex-review-p4b-export-derived codex-review-p4b-export-locks'}}
fs.writeFileSync(path.join(__dirname,'codex-review-p4b-evidence-index.cjs'),'module.exports = '+JSON.stringify(results,null,2)+'\n')
console.log(JSON.stringify({existing:100,independent:14,units:82,blockers:1,notes:1}))
