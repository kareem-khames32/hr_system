'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const files=fs.readdirSync(__dirname).filter(n=>/^codex-review-p2p-results-[a-z0-9_-]+\.cjs$/.test(n)).sort((a,b)=>fs.statSync(path.join(__dirname,a)).mtimeMs-fs.statSync(path.join(__dirname,b)).mtimeMs)
const latest=new Map(),runs=[]
for(const file of files){
 const r=require(path.join(__dirname,file));runs.push({file,counts:r.summary.counts})
 for(const row of r.results){
  const canonical=row.file==='codex-review-p2p-decision-race.integration.cjs'?'request-decision-race.integration.cjs':row.file
  latest.set(canonical+'\0'+row.name,{...row,source:file})
 }
}
const rows=[...latest.values()].map(({ms,...row})=>row)
const counts={passed:rows.filter(r=>r.pass&&!r.skip).length,failed:rows.filter(r=>!r.pass).length,skipped:rows.filter(r=>r.skip).length}
assert.equal(counts.failed,3)
assert.ok(rows.filter(r=>!r.pass).every(r=>r.file==='codex-review-p2p-boundaries.integration.cjs'))
const result={target:'af310a6',head:'9236c5c',counts,runs,rows,notes:[
 'Unique test names use their latest completed outcome. READ COMMITTED and RCSI concurrency cases have distinct names. Repeated attempts are retained in raw result files.',
 'The three final failures are independent authorization assertions, reproduced through actual account PATCH endpoints and new sessions. Existing sessions correctly return 401.',
 'Initial review-only fixture issues were corrected: an account must be unlinked before another account takes its employee; the existing notifications route is /notifications; policy publication rejects past dates, so the owned database was aged after publication; author assertions now identify the intended comment by opaque ref.',
 'The existing request-decision-race fixture uses a database name outside the review safety allowlist. Eight before-hook failures happened before database creation. A review-only copy changes just that temporary name/cleanup pattern and adds instance mail mocks; the same eight assertions pass. Its final outcomes supersede the safety-guard setup failures.',
 'All enabled notification tests replace MailService.send and isConfigured on the actual instance. The network guard independently blocks real SMTP and listening ports.',
 'HTTP is exercised in process through Express with guards, interceptors and authorization intact. The download shim permits dotfile ancestors only under the private review upload root (.claude). A deterministic synthetic PDF renderer supports document regressions; no native Chromium or browser-visual validation is claimed.',
 'Migration 093 tests cover pre-migration behavior, same-process availability after applying it, idempotence and schema parity. The available engine is SQL Server 2022 with compatibility level 150, not an actual SQL Server 2019 instance.',
 'No performance conclusion is drawn from recorded runner durations. Only new codex-review-p2p-* evidence and the requested report were written.'
]}
fs.writeFileSync(path.join(__dirname,'codex-review-p2p-execution-summary.cjs'),'module.exports = '+JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify({counts,runs:runs.map(r=>({file:r.file,passed:r.counts.passed,failed:r.counts.failed})),failures:rows.filter(r=>!r.pass).map(r=>({file:r.file,name:r.name,error:r.error}))},null,2))
