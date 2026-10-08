'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const independent=require('./codex-review-p4d-results-independent.cjs'),race=require('./codex-review-p4d-results-race.cjs'),affected=require('./codex-review-p4d-results-affected.cjs')
for(const run of [independent,race,affected]){assert.deepEqual(run.failures,[]);assert.equal(run.summary.counts.failed,0)}
const cases=[...independent.results,...race.results]
assert.equal(cases.length,15);assert.equal(new Set(cases.map(r=>r.name)).size,15);assert.ok(cases.every(r=>r.pass))
const staticChecks=require('./codex-review-p4d-static-checks.cjs');assert.ok(staticChecks.results.every(r=>r.exitCode===0))
const evidence={target:require('./codex-review-p4d-scope-evidence.cjs').target,base:'9299eee',
 verdict:{B4_8:'لا أوافق',phase4:'لا أوافق',B4_1ThroughB4_7:'unchanged approvals'},
 blockers:[{id:'P4D-B01',continues:'P4C-B01',tests:['P4D-X01','P4D-X02','P4D-X03']},{id:'P4D-B02',tests:['P4D-X04']}],
 closed:{originalExamples:['P4D-S01','P4D-S02','P4D-S03'],installments:'P4D-P02',earlierControls:['P4D-D01','P4D-D02','P4D-D03','P4D-N01','P4D-P01','P4D-R01','P4D-R02']},
 tests:{affected:{selected:affected.selected,counts:affected.summary.counts},independent:cases,units:{script:'codex-review-p4d-units.cjs',passed:6,failed:0,source:'Successful node:test stdout captured in review tool session; includes EPU-01 through EPU-06'},staticChecks},
 interpretation:'X01-X04 pass by reproducing confidentiality failures; all other independent cases assert closure or regression controls. Passing detection tests is not product approval.',
 sourceAudit:{alternateSubjects:['toEmployeeId: custody transfer creates a requestId-linked assignment, so the existing row filter covers it','withEmployeeId: shift swap records requestId-linked history; no copied payload narrative found in exported tables'],projection:'Employee and section rows use the scrubber; metadata added later consists of static labels, counts, employee id and export timestamp.',scope:'Only this diff reviewed; approved B4.1-B4.7 unchanged.'},
 reproduce:["$env:REVIEW_PRELOAD='codex-review-p4d-lfsql-preload.cjs'","$env:REVIEW_RESULT_SUFFIX='recheck'",'node api/test/codex-review-p4d-suite.cjs codex-review-p4d-export codex-review-p4d-export-derived codex-review-p4d-export-locks codex-review-p4d-closures codex-review-p4d-export-controls codex-review-p4d-text-bypasses codex-review-p4d-text-race','node api/test/codex-review-p4d-units.cjs','node api/test/codex-review-p4d-static.cjs'],
 limits:['No full suite or mutation run','No browser review','Unchanged payroll and leave evidence not repeated']}
fs.writeFileSync(path.join(__dirname,'codex-review-p4d-evidence-index.cjs'),'module.exports = '+JSON.stringify(evidence,null,2)+'\n')
console.log(JSON.stringify({existingIntegration:affected.summary.counts.passed,independent:cases.length,units:6,typecheck:'passed',blockers:evidence.blockers.map(r=>r.id)}))
