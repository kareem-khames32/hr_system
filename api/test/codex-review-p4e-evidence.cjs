'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const independent=require('./codex-review-p4e-results-independent.cjs'),affected=require('./codex-review-p4e-results-affected.cjs')
for(const run of [independent,affected]){assert.deepEqual(run.failures,[]);assert.equal(run.summary.counts.failed,0)}
assert.equal(independent.results.length,16);assert.ok(independent.results.every(r=>r.pass))
const units=fs.readFileSync(path.join(__dirname,'codex-review-p4e-units.tap'),'utf8')
assert.match(units,/tests 7/);assert.match(units,/fail 0/);assert.doesNotMatch(units,/unhandledRejection|asynchronous activity|Error:/)
const staticChecks=require('./codex-review-p4e-static-checks.cjs');assert.ok(staticChecks.results.every(r=>r.exitCode===0))
const fieldCoverage=require('./codex-review-p4e-field-coverage.cjs')
assert.equal(fieldCoverage.unclassifiedJson.length,5)
const evidence={target:require('./codex-review-p4e-scope-evidence.cjs').target,base:'eb87928',
 verdict:{B4_8:'أوافق على التشغيل',phase4:'أوافق على التشغيل',B4_1ThroughB4_7:'unchanged approvals; B4.7 is documented deferral only'},
 closures:[{id:'P4D-B01',state:'اتقفل',tests:['P4E-X01','P4E-X02','P4E-X03','P4E-S01','P4E-S02','P4E-S03']},
 {id:'P4D-B02',state:'اتقفل',tests:['P4E-X04a','P4E-X04b']}],
 notes:[{id:'P4E-N01',blocking:false,description:'EPU-07 assumes an unspecified metadata length is 255, omitting five simple-json columns from its classification requirement; SQL Server driver maps simple-json to ntext.',evidence:'codex-review-p4e-field-coverage.cjs'}],
 tests:{affected:{selected:affected.selected,counts:affected.summary.counts},independent:independent.results,units:{script:'codex-review-p4e-units.cjs',passed:7,failed:0,output:'codex-review-p4e-units.tap'},staticChecks},
 reviewOnlyHarnessCorrection:'Initial metadata/unit helper lacked a synthetic JWT_SECRET when importing AppModule; the helper was corrected and rerun. No product file or existing test was changed.',
 sourceAudit:{
  fields:fieldCoverage,
  freeText:'Destination copies to dependent removal, custody condition, employee archive reason, obligation labels, histories and other listed narrative fields are covered by field masking or source-request row omission.',
  structured:'Job-title, address, identity and bank writers copy canonical field values. Settlement obligation snapshots contain id/type/amount, not obligation label. Letter rows carry requestId; issued HR-document custom values are manual, not copied by a request destination.',
  alternateSubjects:['toEmployeeId: custody transfer persists requestId on the recipient assignment','withEmployeeId: shift swap history carries requestId; exported copied request prose was not found'],
  ordering:'Request insertion precedes execution in the engine or is committed in the same transaction. Executed requests cannot enter the RETURNED_FOR_INFO-only payload-edit path. Export masks after all employee/section reads.',
  projection:'Only static metadata, counts, ids and export timestamp are added after guarded employee and section projection.'
 },
 reproduction:["$env:REVIEW_PRELOAD='codex-review-p4e-lfsql-preload.cjs'","$env:REVIEW_RESULT_SUFFIX='recheck'",'node api/test/codex-review-p4e-suite.cjs codex-review-p4e-export codex-review-p4e-export-derived codex-review-p4e-export-locks codex-review-p4e-closures codex-review-p4e-export-controls codex-review-p4e-text-controls codex-review-p4e-text-race','node api/test/codex-review-p4e-units.cjs','node api/test/codex-review-p4e-field-audit.cjs','node api/test/codex-review-p4e-static.cjs'],
 limits:['No full suite or mutation run','No browser review','Unchanged payroll and leave evidence not repeated']}
fs.writeFileSync(path.join(__dirname,'codex-review-p4e-evidence-index.cjs'),'module.exports = '+JSON.stringify(evidence,null,2)+'\n')
console.log(JSON.stringify({existingIntegration:affected.summary.counts.passed,independent:independent.results.length,units:7,typecheck:'passed',blockers:0,notes:['P4E-N01']}))
