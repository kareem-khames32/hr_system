'use strict'
module.exports={
 target:'544dc02',checkout:'57018ce',base:'44bec99',verdict:'لا أوافق على التشغيل',
 report:'D:/projects/hr_system/CODEX_REVIEW_REPORT_P2W.md',
 reproduction:{
  cwd:'D:/projects/hr_system/.claude/worktrees/review-p02',
  shell:'PowerShell',
  environment:["$env:REVIEW_PRELOAD='codex-review-p2w-safe-mail-preload.cjs'","$env:REVIEW_RESULT_SUFFIX='<unique-label>'"],
  commands:[
   'node api/test/codex-review-p2w-suite.cjs codex-review-p2w-residual-writers',
   'node api/test/codex-review-p2w-suite.cjs codex-review-p2w-empty-row-approval',
   'node api/test/codex-review-p2w-suite.cjs codex-review-p2w-fix-controls',
   'node api/test/codex-review-p2w-suite.cjs codex-review-p2w-units employment-periods employment-periods-migration codex-review-p2w-payroll-race codex-review-p2w-reason',
   'node api/test/codex-review-p2w-suite.cjs leave-year-end leave-contract employee-suspension payroll-coverage payroll-settlement-boundary',
   'node api/test/codex-review-p2w-static.cjs'
  ],
  safety:'Runner preloads guard disposable DB names, disable network listeners and background jobs, and replace MailService.send/isConfigured before initialization. Do not run these evidence files without the runner.'
 },
 canonicalResults:[
  {file:'codex-review-p2w-results-closure.cjs',passed:46,failed:0},
  {file:'codex-review-p2w-results-fix-controls.cjs',passed:3,failed:0},
  {file:'codex-review-p2w-results-regressions.cjs',passed:57,failed:0},
  {file:'codex-review-p2w-results-residual-writers-final.cjs',passed:0,failed:2},
  {file:'codex-review-p2w-results-empty-row-approval-final.cjs',passed:0,failed:1}
 ],
 exploratoryResultsExcludedFromCounts:[
  {file:'codex-review-p2w-results-residual-writers.cjs',reason:'The initial reference fixture did not yet create its anniversary row; superseded by the final result.'},
  {file:'codex-review-p2w-results-empty-row-approval.cjs',reason:'Verified the first attempt rejected, but omitted the retry after the independently committed empty row; superseded by the final result.'}
 ],
 findings:[
  {id:'CRP2W-B01',priority:'P1',source:['api/src/employees/employees.service.ts:921','api/src/employees/employees.service.ts:568'],evidence:'codex-review-p2w-residual-writers.integration.cjs',test:1,actual:{currentOpening:10,frozenOpening:0,contractNumber:null},expected:'The old-service edit and its balance effect must share one ordering relative to rehire.'},
  {id:'CRP2W-B02',priority:'P1',source:['api/src/requests/leave-balances.service.ts:518','api/src/requests/leave-balances.service.ts:344'],evidence:['codex-review-p2w-residual-writers.integration.cjs','codex-review-p2w-empty-row-approval.integration.cjs'],actual:{staleKey:'2026-09-01',remainingAtJanuary31:4.25,referenceAtJanuary31:1.78,firstApproval:400,retryApproval:201,approvedDays:3,referenceAtJanuary29:1.67},expected:'Creating a missing row must use a service-period context synchronized with rehire; a rolled-back approval must not leave a stale anniversary row.'}
 ],
 closed:['CRP2V-B-B01 future approved leave and closed-service deductions','CRP2V-B-B03 payroll employee reread after lock','CRP2V-B-B04 hidden run period and end oracle','CRP2V-A-N01 full 500-character reason','CRP2V-B-B02 original rollover race; residual writer class remains open'],
 limits:['Not a full-suite run','SQL Server 2022 compatibility 150, not native SQL Server 2019','No UI change and no browser run','No timing-based performance conclusions'],
 verification:'codex-review-p2w-final-verification.cjs'
}
