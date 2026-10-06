'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const files=fs.readdirSync(__dirname).filter(n=>/^codex-review-p2q-results-[a-z0-9_-]+\.cjs$/.test(n)).sort((a,b)=>fs.statSync(path.join(__dirname,a)).mtimeMs-fs.statSync(path.join(__dirname,b)).mtimeMs)
const latest=new Map(),runs=[]
for(const file of files){const r=require(path.join(__dirname,file));runs.push({file,counts:r.summary.counts});for(const {ms,...row} of r.results)latest.set(row.file+'\0'+row.name,{...row,source:file})}
const rows=[...latest.values()],counts={passed:rows.filter(r=>r.pass&&!r.skip).length,failed:rows.filter(r=>!r.pass).length,skipped:rows.filter(r=>r.skip).length}
assert.equal(counts.failed,5)
assert.equal(rows.filter(r=>!r.pass&&r.file==='codex-review-p2q-controls.integration.cjs').length,1)
const result={target:'85ba28c',head:'5af6c30',counts,runs,rows,notes:[
 'Latest outcome per file and test name; repeated reproductions are not double-counted. RC and RCSI test names are distinct.',
 'All four prior P2P boundary assertions pass. The new blocker has four failing assertions: controlled overlapping relinks, a permissions-only stale save, and two real SQL row-lock races under RC and RCSI. Both real SQL races use unmodified service methods and real PATCH requests.',
 'The controlled race pauses one actual UsersController repository save after its original-identity history has committed. Another actual PATCH commits an intermediate employee; a new internal comment is then created and verified hidden while the account is that employee. The delayed save displaces this identity without recording it. A fresh current session exposes the internal text and exact attachment bytes.',
 'The remaining failed assertion is notification pagination: sixty newer mentions that become unreadable are filtered after TOP(60), hiding the older still-readable notification. This is recorded separately as a nonblocking functional issue.',
 'History failure blocks user saving; user-save failure leaves conservative history. Supported detach/relink, deactivate/reactivate, replacement employee account, hidden notification read/dismiss and restored visibility controls pass. Persisted notification/history rows are unchanged by reading.',
 'Source scan of application account writers finds the intentional existing-user employeeId assignment in UsersController.update. Domain linking writes domainObjectGuid only; provisioning creates accounts. The blocker also covers whole-entity saves that implicitly overwrite an employeeId without an employeeId DTO field.',
 'History consumers: profile/history use projectEmployeeHistory; employee export uses employee records; payroll changes query a payment-field allowlist; live-employment evidence queries lifecycle fields; audit subscriber only emits employee-history SALARY entries. loginAccount DATA rows are excluded. Generic USER_UPDATED audit entries retain their previously authorized behavior.',
 'Existing tests were never edited. Prior review assertions were copied with new helper/output paths. The first launch attempted the suite before preparation finished and exited with MODULE_NOT_FOUND, before any database access; it was rerun after preparation completed.',
 'domain-login-two-factor was excluded by the runner migration/child-process safety allowlist, before execution. It is not included in any test count or success claim. Domain sync and auto-provision suites both executed.',
 'Instance MailService.send/isConfigured mocks are used before enabling notification email. The network guard blocks real SMTP, LDAP and listening sockets. HTTP executes in-process through Express. No 3000/4000 listener or operating-system service is touched.',
 'No performance conclusion from runner durations. SQL engine available is 2022 with compatibility level 150, not an actual 2019 server; migration 093 idempotence/pre-post/same-process/schema parity tests pass. API and UI tsc pass.',
 'Run from the review worktree: set REVIEW_PRELOAD=codex-review-p2q-regression-preload.cjs, REVIEW_CONCURRENCY=1 and a distinct REVIEW_RESULT_SUFFIX; node api/test/codex-review-p2q-suite.cjs <basenames without .integration.cjs>. Set REVIEW_RCSI=true for RCSI cases. All database names are fresh disposable hr_*_test_<16hex> names; no production DB fallback.'
]}
fs.writeFileSync(path.join(__dirname,'codex-review-p2q-execution-summary.cjs'),'module.exports = '+JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify({counts,failures:rows.filter(r=>!r.pass).map(r=>({file:r.file,name:r.name}))},null,2))
