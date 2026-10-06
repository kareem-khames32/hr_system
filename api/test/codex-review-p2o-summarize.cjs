'use strict'
const fs=require('node:fs'),path=require('node:path')
const files=fs.readdirSync(__dirname).filter(n=>/^codex-review-p2o-results-.*[.]cjs$/.test(n)).sort((a,b)=>fs.statSync(path.join(__dirname,a)).mtimeMs-fs.statSync(path.join(__dirname,b)).mtimeMs)
const latest=new Map(),runs=[]
for(const file of files){const r=require('./'+file);runs.push({file,counts:r.summary.counts});for(const row of r.results)latest.set(row.file+':'+row.name,{...row,source:file})}
const rows=[...latest.values()],result={target:'6288e78',head:'64f3f55',counts:{passed:rows.filter(r=>r.pass&&!r.skip).length,failed:rows.filter(r=>!r.pass).length,skipped:rows.filter(r=>r.skip).length},runs,rows,
 notes:[
  'Unique tests use the latest completed outcome; repeated isolation runs are not double-counted.',
  'The previous P2N schema-cache proof was copied and its obsolete post-migration negative-cache assertion removed. No existing test was edited. Both independent application processes and real SQL DDL are retained.',
  'Both READ COMMITTED and READ_COMMITTED_SNAPSHOT were tested. Migration 089/092 and the parent task mapping commit from another connection while the real endpoint is blocked on its task row.',
  'Initial new migration-race fixture attempted to PATCH its ordinary control after closing it. The existing product correctly returned 400. The review-only fixture now reopens with a reason before PATCH; all scenarios pass.',
  'Deterministic synthetic PDF renderer and in-process HTTP transport are inherited from P2N. Actual changed services, SQL transactions, guards, file storage and hashes execute. No native Chromium or browser-visual claim.',
  'Every notification-enabled fixture substitutes MailService.send and isConfigured on its instance; the review network guard also refuses real SMTP and listening ports.',
  'The review scope contains eight readiness functions only. Existing stored-file hash and employee-suspension readiness do not cache missing schema; daily accrual 061 remains the pre-existing documented fallback. No product or existing test changes.'
 ]}
fs.writeFileSync(path.join(__dirname,'codex-review-p2o-execution-summary.cjs'),'module.exports = '+JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify({counts:result.counts,runs:result.runs}))
