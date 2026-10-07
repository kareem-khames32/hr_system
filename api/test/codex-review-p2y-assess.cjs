'use strict'
const fs=require('node:fs'),path=require('node:path')
// Later corrected executions supersede the same named test, never a different assertion.
const selected=['retry','core','personal-proof','independent','independent-corrected','contract-order-valid','feature-pool-http']
const latest=new Map()
for(const name of selected)for(const row of require('./codex-review-p2y-results-'+name+'.cjs').results)latest.set(row.file+'\n'+row.name,{...row,result:name})
const rows=[...latest.values()],byFile={}
for(const row of rows){const counts=byFile[row.file]??={passed:0,failed:0,skipped:0};counts[row.skip?'skipped':row.pass?'passed':'failed']++}
const result={reviewed:['b4d0b00','3ed7b64'],selected,tests:rows.length,passed:rows.filter(r=>r.pass&&!r.skip).length,failed:rows.filter(r=>!r.pass).length,byFile,
 failures:rows.filter(r=>!r.pass).map(({file,name,error,result})=>({file,name,error,result})),
 harnessCorrections:['Initial core transport denied .claude ancestor; repeated affected files with private-root-only download transport, keeping real controller authorization.',
 'Contract-race initial synthetic year used string concatenation; corrected to numeric year before the valid reproduction.',
 'Independent notification count initially used wrong column userId; corrected to recipientUserId and all four cases repeated.',
 'Feature-pool final evidence uses the actual HTTP feature-setting write; earlier exploratory evidence directly invalidated only its in-memory cache.']}
fs.writeFileSync(path.join(__dirname,'codex-review-p2y-assessment.cjs'),'module.exports = '+JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify(result))
