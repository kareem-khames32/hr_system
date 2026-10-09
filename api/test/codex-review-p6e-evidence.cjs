'use strict'
module.exports={
 target:'1f2ac7a8e7401ee43dd27c5e55328c0a5d8adb68',baseline:'b7ef9826',verdict:'approval retained',
 note:'P6D-N01 closed: P6E-R02 compares the actual policy library version.effectiveDate to the value delivered to the fake provider, and rejects the old effectiveFrom key.',
 provenance:'PoliciesService VERSION_COLUMNS converts PolicyVersion.effectiveDate (SQL date) to YYYY-MM-DD; versionView -> itemView -> mine -> company_policies -> trustedShape(date). Other projected properties match the library response. No new trusted free-text field.',
 dates:{
  insurance:'Production policyState with the test clock at 02:15 Africa/Cairo: old UTC end-date helper yields 19 days; corrected local calendar helper yields 20.',
  exemptions:'Existing assertions unchanged; selected late/absence days are working days in all 12 months of 2026. The full calendar population loop remains calendar-based.',
  overtime:'Production describeOvertimeSubmission with empty active-entry/closed-period repositories: 2026-09-08 is allowed on October 6 (28 days); on October 9 (31 days) it yields OVERTIME_BACKDATE_LIMIT under the unchanged 30-day policy.',
  absence:'P6E-T01 uses actual AttendanceService.materializeAbsences on a disposable database: October 8 has no generated row at an October 6 clock, then becomes absent at an October 9 clock.',
  clock:'Only test process Date is offset. Explicit dates/native driver Date instances are preserved and elapsed time advances. No system/SQL clock change.',
  assertionAudit:'AST comparison preserves all 1409 captured assertion/expect calls across the four date-sensitive files.'
 },
 results:[
  {file:'codex-review-p6e-results-affected.cjs',tests:81,passed:81,files:6},
  {file:'codex-review-p6e-results-boundary.cjs',tests:9,passed:9,newUniqueTests:1},
  {file:'codex-review-p6e-date-audit-result.cjs',description:'Assertion comparison, insurance midnight boundary, actual overtime submission policy, and working-day date checks.'}
 ],
 commands:[
  "$env:REVIEW_PRELOAD='codex-review-p6e-local-preload.cjs'",
  "$env:REVIEW_RESULT_SUFFIX='reproduce'",
  'node api/test/codex-review-p6e-suite.cjs codex-review-p6e-ai-read benefits-insurance payroll-financial-exemptions fulltest-leaves-payroll fulltest-reports ai-reports',
  'node api/test/codex-review-p6e-date-audit.cjs'
 ],
 safety:'Unchanged product and existing tests. Disposable databases only, actual MailService stub before initialization, fake model, in-process HTTP, no external HTTP/DNS, no service changes and no access to owner ports 3000/4000/3001/4001/4002.',
 limits:'No full-project rerun, full unit rerun or browser session. A fixed clock proves the chosen fixture date; date boundaries are checked separately here.'
}
