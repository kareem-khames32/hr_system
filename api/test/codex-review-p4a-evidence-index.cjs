'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const latest=new Map()
for(const suffix of ['phase4','controls','reports','data-protection'])for(const r of require('./codex-review-p4a-results-'+suffix+'.cjs').results)latest.set(r.file+'|'+r.name,r)
const rows=[...latest.values()];assert.ok(rows.every(x=>x.pass))
const independent=require('./codex-review-p4a-results-closure.cjs');assert.equal(independent.failures.length,0)
const units=fs.readFileSync(path.join(__dirname,'codex-review-p4a-default-parity.tap'),'utf8');assert.match(units,/# pass 79/);assert.match(units,/# fail 0/)
const evidence={target:'6f5964c',baseline:'456e544',existingIntegrationFiles:new Set(rows.map(x=>x.file)).size,existingIntegrationTests:rows.length,independentTests:independent.summary.counts,unitAndBaselineChecks:79,typechecks:require('./codex-review-p4a-static-checks.cjs').results,
 findings:[
 {id:'P4A-B01',batches:['B4.4','B4.5'],tests:['P4A-F01','P4A-F02'],classification:'blocker',observed:'Enabled through API after verifying a successor. Historical payroll approved with unverified table and 1482.50 tax; overtime used unverified 2.00 multiplier instead of company 1.50.'},
 {id:'P4A-B02',batches:['B4.4'],tests:['P4A-F03'],classification:'blocker',observed:'Cancelled August CALCULATED run remained in approved September tax snapshot: 1024.16 vs 1482.50 control.'},
 {id:'P4A-B03',batches:['B4.5'],tests:['P4A-L01'],classification:'blocker',observed:'Employee moved EG to SA before lock. Historical entitlement and carry 30 vs 15 on reference.'},
 {id:'P4A-B04',batches:['B4.8'],tests:['P4A-D01'],classification:'blocker',observed:'Canonical LEAVE with confidential LEAVE_ANNUAL definition masked by request endpoint but exported with original reason.'},
 {id:'P4A-B05',batches:['B4.8'],tests:['P4A-D02'],classification:'blocker',observed:'Document added after actual employee transfer to inaccessible branch appears in pending export; subsequent export 404.'}
 ],
 normalization:'SQL CRLF normalized to Git LF in memory by lfsql-preload; existing tests and migrations unchanged. All six initial failures disappeared on corrected transport.',
 reviewBoundaries:['No browser review','No full integration run','No legal-number certification','Phase 2/3 deferred notes remain nonblocking for these changes'],
 files:[...new Set(rows.map(x=>x.file))].sort()}
fs.writeFileSync(path.join(__dirname,'codex-review-p4a-evidence-summary.cjs'),'module.exports = '+JSON.stringify(evidence,null,2)+'\n')
console.log(JSON.stringify({existingIntegrationFiles:evidence.existingIntegrationFiles,existingIntegrationTests:evidence.existingIntegrationTests,independentTests:independent.summary.counts.tests,unitChecks:79,typechecks:evidence.typechecks}))
