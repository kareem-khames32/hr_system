'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const files=fs.readdirSync(__dirname).filter(n=>/^codex-review-p2r-results-[a-z0-9_-]+\.cjs$/.test(n)).sort((a,b)=>fs.statSync(path.join(__dirname,a)).mtimeMs-fs.statSync(path.join(__dirname,b)).mtimeMs)
const latest=new Map(),runs=[]
for(const file of files){const r=require(path.join(__dirname,file));runs.push({file,counts:r.summary.counts});for(const {ms,...row} of r.results)if(!row.skip)latest.set(row.file+'\0'+row.name,{...row,source:file})}
const rows=[...latest.values()],counts={passed:rows.filter(r=>r.pass).length,failed:rows.filter(r=>!r.pass).length}
assert.equal(counts.failed,2)
const result={target:'4e83eae',head:'8fa322a',counts,runs,rows,notes:[
 'Latest completed outcome per file/test; distinct RC and RCSI names. Diagnostic baseline tests are explicitly identified and do not count as tests of the unmodified final writer.',
 'Previous P2Q rebinding tests depended on simultaneous handler entry. New account-lock evidence instead holds the employee-history SQL table, starts two actual PATCH requests, releases it, and checks serialized commits, original/intermediate identity history, tokenVersion=2 and hidden internal text/files. Both RC and RCSI pass.',
 'The real 15-second application-lock timeout returns 409 without entering the waiting handler. The first still-running handler retains its lock; after release a new edit succeeds. Validation failure releases the lock; different account resources remain independent when pool capacity is available.',
 'New pool blocker: the default maximum of ten connections is unchanged. Ten actual PATCH requests for distinct accounts are paused just after acquiring their account locks and before the first handler query. Diagnostics show ten held connections and zero free. Releasing all barriers makes every handler wait for another connection; all ten return 500. The next request succeeds after transactions release. No time-based performance assertion is used.',
 'Pool diagnostic baseline uses the same HTTP requests and barriers with only the new AccountEditLock interceptor bypassed in memory. Connections held at the barrier are zero and all ten requests succeed. No source files changed.',
 'New transfer audit regression: a real approved scheduled transfer is made due in the owned database and executed by DestinationsService.executeTransfer in a real transaction. Branch and token version change, but no USER_UPDATED event is inserted. The previous nine-line save writer is reproduced in memory in a separate test and emits the event with the same audit subscriber. The targeted UPDATE correctly preserves a concurrently rebound employee ID.',
 'Pagination tests cover more than one hidden page, duplicate entity references across pages, insertion between pages, internal/public comments on the same request, the twenty-visible-item limit and the documented ten-page cap. No skipped or duplicate visible item was observed within that cap.',
 'Application writer scan: UsersController.update remains the full-entity save of an existing account; transfer now updates branchId/tokenVersion by employee criterion; domain linking, login/security, offboarding and roles use specific-column updates. Seed scripts are not executed.',
 'Old boundary, projection, saved-history, email, transaction and policy-gate controls pass. Existing comment/migration, notification, audit, request execution, branch scope and domain sync suites execute unchanged. API/UI tsc pass.',
 'Every notification-enabled fixture mocks MailService.send and isConfigured on its instance. The transport is in-process Express; the network guard refuses SMTP/LDAP and listening sockets, including ports 3000/4000. Owned temporary DBs only.',
 'Only new codex-review-p2r-* artifacts and the requested report are written. No performance assessment from recorded test-run durations. Available SQL engine is 2022 with compatibility level 150; no native 2019 claim.',
 'Reproduce from review-p02: REVIEW_PRELOAD=codex-review-p2r-regression-preload.cjs, REVIEW_CONCURRENCY=1, REVIEW_RESULT_SUFFIX=<unique>; node api/test/codex-review-p2r-suite.cjs <basename without .integration.cjs>. REVIEW_RCSI=true selects RCSI. REVIEW_PATTERN="diagnostic baseline" runs only the pool baseline.'
]}
fs.writeFileSync(path.join(__dirname,'codex-review-p2r-execution-summary.cjs'),'module.exports = '+JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify({counts,failures:rows.filter(r=>!r.pass).map(r=>({file:r.file,name:r.name,error:r.error}))},null,2))
