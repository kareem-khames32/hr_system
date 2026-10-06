'use strict'
// Canonical results. Earlier exploratory result files are retained for cleanup/audit,
// not counted again; the first visibility probe had a fixture-call error which was fixed.
module.exports = {
 reviewed:'ec58f92',checkout:'9a00376',baseline:'61fcf83',
 verdicts:{A:'approve',B:'do-not-approve'},
 report:'D:/projects/hr_system/CODEX_REVIEW_REPORT_P2V.md',
 existing:{results:['codex-review-p2v-results-batch.cjs','codex-review-p2v-results-regressions.cjs'],passed:140,failed:0},
 independent:[
  {result:'codex-review-p2v-results-independent-final.cjs',tests:4,passed:2,failed:2,findings:['CRP2V-B-B01','CRP2V-B-B04']},
  {result:'codex-review-p2v-results-boundaries.cjs',onlyFile:'codex-review-p2v-rollover-race.integration.cjs',tests:1,failed:1,finding:'CRP2V-B-B02'},
  {result:'codex-review-p2v-results-old-payroll-race.cjs',tests:1,failed:1,finding:'CRP2V-B-B03'},
  {result:'codex-review-p2v-results-reason.cjs',tests:1,failed:1,finding:'CRP2V-A-N01',nonblocking:true}
 ],
 static:'codex-review-p2v-static-checks.cjs',
 rerun:'Set REVIEW_PRELOAD=codex-review-p2v-safe-mail-preload.cjs and REVIEW_RESULT_SUFFIX to a new evidence suffix, then: node api/test/codex-review-p2v-suite.cjs codex-review-p2v-independent codex-review-p2v-rollover-race codex-review-p2v-payroll-race codex-review-p2v-reason',
 barriers:'Repository save and employee-finance-lock entry are paused in memory; the actual implementations run after release. No source file is patched.',
 mail:'MailService instance send/isConfigured replaced before init; network harness blocks real mail and real listening sockets.',
 limitations:['No full suite or browser rerun','SQL Server 2022 compatibility 150, not native SQL Server 2019','No performance conclusion drawn from test durations']
}
