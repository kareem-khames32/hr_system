'use strict'
const fs=require('node:fs'),path=require('node:path')
const old=fs.readFileSync(path.join(__dirname,'codex-review-round17-overtime.integration.cjs'),'utf8')
const index=old.indexOf("test('AA-01:")
if(index<0)throw Error('Prior fixture changed')
const prefix=old.slice(0,index)
fs.writeFileSync(path.join(__dirname,'codex-review-round18-overtime.integration.cjs'),
  '// Round18 independent cases with the unchanged disposable setup borrowed from round17.\n'+prefix+'\n'+fs.readFileSync(path.join(__dirname,'codex-review-round18-overtime-extra.cjs'),'utf8'))
console.log('Built independent round18 overtime cases')
