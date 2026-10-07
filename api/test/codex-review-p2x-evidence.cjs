'use strict'
module.exports={
 reviewed:'0074cd8',checkout:'4785a72',base:'175dcfb',verdict:'أوافق على التشغيل',
 report:'D:/projects/hr_system/CODEX_REVIEW_REPORT_P2X.md',
 reproduction:{cwd:'D:/projects/hr_system/.claude/worktrees/review-p02',shell:'PowerShell',
  environment:["$env:REVIEW_PRELOAD='codex-review-p2x-safe-mail-preload.cjs'","$env:REVIEW_RESULT_SUFFIX='<unique-label>'"],
  commands:[
   'node api/test/codex-review-p2x-suite.cjs codex-review-p2x-units employment-periods employment-periods-migration codex-review-p2x-fix-controls codex-review-p2x-payroll-race codex-review-p2x-reason',
   'node api/test/codex-review-p2x-suite.cjs codex-review-p2x-independent codex-review-p2x-virtual-parity',
   'node api/test/codex-review-p2x-suite.cjs codex-review-p2x-lock-order',
   'node api/test/codex-review-p2x-suite.cjs leave-year-end leave-contract employee-suspension payroll-coverage payroll-settlement-boundary recovery',
   'node api/test/codex-review-p2x-static.cjs'
  ],safety:'Use the runner: random disposable DB guard, in-process HTTP with no listening ports, disabled background jobs and LDAP, MailService instance send/isConfigured replaced before initialization. Recovery contains unrelated native PDF tests which could not launch Chromium in this environment.'},
 canonicalResults:[
  {file:'codex-review-p2x-results-closure.cjs',passed:53,failed:0},
  {file:'codex-review-p2x-results-independent.cjs',passed:5,failed:0,comparisons:108},
  {file:'codex-review-p2x-results-lock-order-verified.cjs',passed:1,failed:0,note:'Characterization expects SQL deadlock 1205 in current and previous-read variants; it is not a successful no-deadlock assertion.'},
  {file:'codex-review-p2x-results-regressions.cjs',passed:90,failed:3,note:'Three unrelated recovery PDF tests could not launch Chromium; do not interpret this as a full passing regression suite.'}
 ],
 duplicatesExcluded:['codex-review-p2x-results-lock-order.cjs','codex-review-p2x-results-lock-order-final.cjs'],
 closed:[
  {id:'CRP2W-B01',evidence:'codex-review-p2x-independent.integration.cjs',observed:{newOpening:0,frozenOpening:10,sqlLockWait:true,oldContractCleared:true}},
  {id:'CRP2W-B02',evidence:'codex-review-p2x-independent.integration.cjs',observed:{oldContextWrites:0,approval:400,retry:400,available:1.67,noPersistedLeaveBalanceOrApproval:true}},
  {id:'entryAt equivalence',evidence:'codex-review-p2x-virtual-parity.integration.cjs',observed:{comparisons:108,differences:0,additionalCases:['sick','leap-day anniversary','untyped missing balance']}}
 ],
 nonblocking:[{id:'CRP2X-N01',source:['api/src/requests/destinations.service.ts:727','api/src/employees/employees.service.ts:1088'],evidence:'codex-review-p2x-lock-order.integration.cjs',observed:{current:{approval:201,suspension:500,sqlError:1205},previousReadInMemory:{approval:201,suspension:500,sqlError:1205}},scope:'Reproduces with the new bank employee read lock removed in memory. This is a comparison of the changed read behavior, not a full checkout execution of the previous commit.'}],
 sourceAudit:{runtimeBalanceWriters:['EmployeesService currentYearBalancesIn/openingBalanceIn/annualEntitlementIn','LeaveBalancesService deduct/restoreLeave/adjust/rolloverRow/renewBalancePeriods/ensureRowsOf/settleYearEnd'],
  employeeWriters:'Changed full-entity request handlers use employee row locks. Existing attendance catalog writer takes finance locks before reading employees; contract renewal and archive/reactivate take row locks. Offboarding cancellation now updates status columns only.',
  assertSufficientConsumer:'RequestsService.assertLeaveBalance performs no direct balance-row read requiring materialization afterward.'},
 limits:['Not a full-suite run','SQL Server 2022 compatibility 150; native SQL Server 2019 not run','No browser review; no UI changes','No timing-based performance conclusions','Native PDF generation not validated'],
 verification:'codex-review-p2x-final-verification.cjs'
}
