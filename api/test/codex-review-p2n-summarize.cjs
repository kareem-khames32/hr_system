'use strict'
const fs=require('node:fs'),path=require('node:path')
const files=fs.readdirSync(__dirname).filter(n=>/^codex-review-p2n-results-.*[.]cjs$/.test(n)).sort((a,b)=>fs.statSync(path.join(__dirname,a)).mtimeMs-fs.statSync(path.join(__dirname,b)).mtimeMs)
const latest=new Map()
for(const file of files){const r=require('./'+file);for(const row of r.results)latest.set(row.file+':'+row.name,{...row,source:file})}
const rows=[...latest.values()],result={target:'f7514a8',head:'59146d5',counts:{passed:rows.filter(r=>r.pass&&!r.skip).length,failed:rows.filter(r=>!r.pass).length,skipped:rows.filter(r=>r.skip).length},rows,
 notes:['Unique tests use their latest completed outcome; repeated runs are not added.','Initial issuing failures: native Chromium unavailable. PDF fixture supplies deterministic bytes; real changed service, SQL, storage and hashes retained.','Initial sendFile 404: Express dotfile restriction on the .claude ancestor; only private review upload paths allowed by the test transport.','Initial second fixture failed because Nest config was retained for the previous deleted disposable DB; RCSI was rerun in its own process.','The native rendering probe is the one skipped case; this review makes no native rendering or browser-visual claim.','The schema-cache blocker reproduced with two application processes under both READ COMMITTED and RCSI.']}
fs.writeFileSync(path.join(__dirname,'codex-review-p2n-execution-summary.cjs'),'module.exports = '+JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify(result.counts))
