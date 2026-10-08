'use strict'
module.exports={
 target:'b3c4d3cbd6ed01e1732424c65f058357dbb4a821',base:'3f30874',report:'D:/projects/hr_system/CODEX_REVIEW_REPORT_P3M.md',
 verdict:'APPROVE',batches:['B3.1','B3.8','B3.10','B3.12','B3.13'],
 closures:{
  'P3L-B01':['preboarding.integration.cjs: B01 (real login, detail/mine/work/team/report/log)','preboarding.integration.cjs: B02 (creator/uploader proof denied, own proof allowed)'],
  'P3L-B02':['surveys.integration.cjs: S01-S04 (suppression, real close/response overlap, 409, session setting restoration, insert rollback)','units.integration.cjs: S05 (10,020 publication scenarios)'],
  'P3L-B03':['rewards.integration.cjs: R02 (manual marker cannot substitute value)','penalties.integration.cjs: P04 (manual marker cannot substitute deduction)'],
  'P3L-B04':['rewards.integration.cjs: R01/R03/R04 (postcommit failure, transaction rollback, stale attempt fencing)'],
  'P3L-B05':['penalties.integration.cjs: P02/P03/P05 (pending not recurrence, expired live writer, instant approval rollback)'],
  'P3L-B06':['policy-pool.integration.cjs: K02 (10 active transactions, no extra acquire, 10 HTTP 200)']
 },
 prefixes:'All evidence filenames above are prefixed codex-review-p3m-',
 additional:['R05: bonus immediate approval rollback includes ledger, audit and outbox','C01/K01/U01: earlier privacy fixes remain effective','R06: nonblocking stale claim dismissal 409'],
 validation:{
  existingIntegration:118,existingUnits:52,independentDatabaseCases:21,independentPublicationProperty:1,
  finalResults:['results-baseline.cjs','results-independent.cjs','results-additional.cjs (R05/R06 only)','results-instant-deduction.cjs (P05 corrected fixture)','results-preboarding-proof.cjs','results-units-final.cjs'],
  typechecks:'static-checks.cjs',
  initialFixtureFailure:'P05 audit probe passed numeric entityId to nvarchar parameter; corrected to String in review file only, rerun succeeded. Initial results preserved.',
  notRun:['full integration suite','full unit suite','mutation campaign','browser inspection']
 },
 manualAudit:{
  financialEntryPoints:'Only review reward submit and penalty apply call these financial create services on behalf of their modules; both pass server-only hooks. HTTP controllers do not accept hooks.',
  newLocks:'Financial applock then reward/penalty row. Claim transaction ends before financial creation; pending cleanup does not acquire financial applock. No inverse new lock order found.',
  policyReads:'referenceFor, visibleTo, statesFor and their queries use supplied EntityManager; outside-transaction detail may use default manager.',
  surveyReaders:'results is the only response aggregate endpoint; close and respond share survey row lock. Other endpoints expose questions and participation metadata, not answer rows.',
  preboardingNotifications:'B3.1 explicitly retains account-role notifications/email independently of session restriction; task opening/execution/file access remain restricted.',
  anonymityLimit:'No absolute anonymity promise against a database operator with transaction-log/live-write access; the prior documented database limit remains.'
 },
 rerunPowerShell:[
  "$env:REVIEW_PRELOAD='codex-review-p3m-transport-preload.cjs'",
  "$env:REVIEW_PATTERN='P3M-'",
  "$env:REVIEW_RESULT_SUFFIX='repeat-independent'",
  'node api/test/codex-review-p3m-suite.cjs codex-review-p3m-surveys codex-review-p3m-policy-pool codex-review-p3m-rewards codex-review-p3m-penalties codex-review-p3m-preboarding codex-review-p3m-case-privacy codex-review-p3m-knowledge codex-review-p3m-unit-scope',
  'node api/test/codex-review-p3m-static.cjs'
 ],
 safety:'Disposable guarded databases only; in-process HTTP with no listener; same MailService instance stubbed before initialization; LDAP blocked; product and existing tests unchanged.'
}
