'use strict'
module.exports = {
 target:'b7ef9826ff65c08959a05785877d44f2e06e1ddf',baseline:'c197b892',
 verdict:{'P6C-B01':'closed','P6A-B06':'closed','B6.7':'approve','B6.8':'approve','B6.10':'approve',phase6:'approve'},
 evidence:[
  {tests:['A04','A07','A10','A11','A15'],result:'Account rebind/unlink before claim rejects; update waiting for an action-row lock also rejects after the account change commits. Change after successful claim follows the accepted boundary.'},
  {tests:['A09','A13','A14'],result:'Original disabled account and revoked HR role cases now return 409. No bonus is created; proposal remains unclaimed.'},
  {tests:['A16'],result:'Actual PATCH /roles changes its package; actual PUT /users/:id/permissions changes overrides. Both increment the account version atomically and stale claim returns 409 without a request.'},
  {tests:['A17','A18'],result:'Dismiss and outcome reject disabled/deleted/version-changed users at the conditional UPDATE. An unchanged account without an employee can dismiss normally.'},
  {tests:['A02','A05','A08','A12'],result:'Old ASCII/IBAN, Persian digits, zero-width separators, amount-shaped notes, four-space phone groups and the actual user-written performance-goal unit no longer reach the fake provider. Goal target, weight and cycle dates remain intact.'},
  {tests:['R01'],result:'Actual AttendanceService.myToday projection preserves date, shift/attendance clocks and measured minutes while masking a contact in the shift name. A nonempty approved payslip preserves exact numeric amounts and period boundaries.'},
  {tests:['R02'],result:'Nonblocking note: policy library version has effectiveDate but the tool reads effectiveFrom, so provider gets null. The mismatch existed before CRP6C.'}
 ],
 sourceAudit:'codex-review-p6d-trust-audit-result.cjs: 32 trusted/trustedShape calls with provenance, provider-boundary paths, object keys and account-version writers.',
 finalResults:[
  {file:'codex-review-p6d-results-regression.cjs',tests:22,description:'Five original affected integration files, unchanged.'},
  {file:'codex-review-p6d-results-extended.cjs',onlyFile:'codex-review-p6d-ai.integration.cjs',tests:16},
  {file:'codex-review-p6d-results-read-final.cjs',tests:19,description:'Final assist (11) and read (8) evidence files.'},
  {file:'codex-review-p6d-unit-results.cjs',tests:100},
  {file:'codex-review-p6d-static-checks.cjs',description:'API and frontend tsc --noEmit --incremental false; both exit 0.'}
 ],
 testSemantics:'All original exposure tests were adapted in NEW P6D files to assert closure; their success means closure. R02 instead asserts the documented nonblocking omission. The first closures result retained an incorrect A12 diagnostic flag from P6C; its assertions passed and read-final has the corrected flag. No prior evidence or original test file was modified.',
 commands:[
  "$env:REVIEW_PRELOAD='codex-review-p6d-local-preload.cjs'",
  "$env:REVIEW_RESULT_SUFFIX='reproduce'",
  'node api/test/codex-review-p6d-suite.cjs codex-review-p6d-ai codex-review-p6d-ai-assist codex-review-p6d-ai-read',
  'node api/test/codex-review-p6d-suite.cjs ai-assistant ai-action-assistant ai-assist ai-reports crp6a',
  'node api/test/codex-review-p6d-units.cjs',
  'node api/test/codex-review-p6d-static.cjs',
  'node api/test/codex-review-p6d-trust-audit.cjs'
 ],
 safety:'Owned random disposable databases only; production and payroll-review databases untouched. Real Nest guards/controllers run through in-process HTTP. Actual MailService instance stubbed before init; AI environment removed and fake providers installed. No external HTTP/DNS or real LDAP/model/SMTP. No owner port 3000/4000 or service lifecycle changes.',
 limits:['No whole-project integration rerun, mutation campaign or browser run.','Accepted post-claim authorization boundary remains.','Free-text numbers (including experience and codes) are intentionally masked; written-out numbers and the documented full PDF remain outside that guarantee.','Earlier deferred seed-script and other nonblocking notes remain deferred.']
}
