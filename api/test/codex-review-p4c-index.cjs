'use strict'
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict')
const read = suffix => require('./codex-review-p4c-results-' + suffix + '.cjs')
const independent = read('independent'), deep = read('deep'), controls = read('controls'), affected = read('affected')
for (const run of [independent, deep, controls, affected]) {
  assert.equal(run.summary.counts.failed, 0)
  assert.deepEqual(run.failures, [])
}
const unique = [
  ...independent.results.filter(r => !r.file.includes('updated-sources')),
  ...deep.results.filter(r => r.file.includes('updated-sources')),
  ...controls.results,
]
assert.equal(unique.length, 11)
assert.equal(new Set(unique.map(r => r.name)).size, 11)
assert.ok(unique.every(r => r.pass))
const unitPath = path.join(__dirname, 'codex-review-p4c-units.tap')
const bytes = fs.readFileSync(unitPath)
const units = bytes[0] === 255 && bytes[1] === 254 ? bytes.subarray(2).toString('utf16le') : bytes.toString('utf8')
fs.writeFileSync(unitPath, units, 'utf8')
assert.match(units, /tests 5/)
assert.match(units, /fail 0/)
const staticChecks = require('./codex-review-p4c-static-checks.cjs')
assert.ok(staticChecks.results.every(r => r.exitCode === 0))
const summary = {
  target: require('./codex-review-p4c-scope-evidence.cjs').target,
  base: 'aa88c14',
  verdict: { B4_8: 'لا أوافق', phase4: 'لا أوافق', previousB4_1ThroughB4_7: 'unchanged approvals' },
  blocker: { id: 'P4C-B01', continues: ['P4B-B01', 'P4A-B04'], evidence: ['P4C-S01', 'P4C-S02', 'P4C-S03'] },
  note: { id: 'P4C-N02', evidence: ['P4C-P02'], description: 'Existing public loan installments omitted because the export requires employeeId on their table.' },
  oldClosures: ['P4C-D01', 'P4C-D02', 'P4C-D03', 'P4C-N01'],
  affected: { selected: affected.selected, counts: affected.summary.counts },
  independent: unique,
  units: { passed: 5, failed: 0, output: path.basename(unitPath) },
  staticChecks,
  interpretation: 'S01/S02/S03 pass by reproducing confidentiality leaks; P02 passes by reproducing an existing completeness issue. Passing the review suite does not mean product approval.',
  commands: [
    "$env:REVIEW_PRELOAD='codex-review-p4c-lfsql-preload.cjs'",
    "$env:REVIEW_RESULT_SUFFIX='recheck'",
    'node api/test/codex-review-p4c-suite.cjs codex-review-p4c-export codex-review-p4c-export-derived codex-review-p4c-export-locks codex-review-p4c-updated-sources codex-review-p4c-export-controls',
    'node api/test/codex-review-p4c-units.cjs',
    'node api/test/codex-review-p4c-static.cjs',
  ],
  limits: ['No full suite', 'No mutation testing', 'No browser review', 'Unchanged payroll/overtime/tier evidence not repeated'],
}
fs.writeFileSync(path.join(__dirname, 'codex-review-p4c-evidence-index.cjs'), 'module.exports = ' + JSON.stringify(summary, null, 2) + '\n')
console.log(JSON.stringify({ integrationExisting: affected.summary.counts.passed, independentUnique: unique.length, units: 5, typecheck: 'passed', findings: ['P4C-B01', 'P4C-N02'] }))
