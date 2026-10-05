'use strict'
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process')
const names=['audit-ui','db-migrate','file-type','queue-ui','routes-guards','scheduled-jobs','settlement-applied-label']
const result=spawnSync(process.execPath,['--require',path.join(__dirname,'codex-review-p2a-preload.cjs'),'--test',...names.map(n=>path.join(__dirname,n+'.test.cjs'))],{cwd:path.resolve(__dirname,'..'),encoding:'utf8',maxBuffer:20*1024*1024})
fs.writeFileSync(path.join(__dirname,'codex-review-p2a-unit-results.cjs'),'module.exports = '+JSON.stringify({names,exitCode:result.status,stdout:result.stdout,stderr:result.stderr},null,2)+'\n')
console.log(JSON.stringify({names,exitCode:result.status,summary:(result.stdout||'').split('\n').filter(l=>/^# (tests|pass|fail|skipped)|^not ok/.test(l))}));process.exitCode=result.status??1
