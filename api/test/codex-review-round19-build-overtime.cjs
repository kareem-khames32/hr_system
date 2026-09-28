'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const source='codex-review-round18-overtime.integration.cjs',old=fs.readFileSync(path.join(__dirname,source),'utf8')
const index=old.indexOf("test('CR18 all overtime")
if(index<0)throw Error('Prior fixture changed')
const prefix=old.slice(0,index).replaceAll('hr_ot_auto_approve_test_','hr_codex_r19_overtime_test_')
fs.writeFileSync(path.join(__dirname,'codex-review-round19-overtime.integration.cjs'),
  '// Round19 cases with the disposable scaffold borrowed from round18 (only database prefix renamed).\n'+prefix+'\n'+fs.readFileSync(path.join(__dirname,'codex-review-round19-overtime-extra.cjs'),'utf8'))
console.log(JSON.stringify({scaffoldSource:source,sourceSha256:crypto.createHash('sha256').update(old).digest('hex')}))
