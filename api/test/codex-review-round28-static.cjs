'use strict'
const fs=require('node:fs'),path=require('node:path'),{spawnSync,execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),scope=require('./codex-review-round28-scope-evidence.cjs')
if(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()!==scope.target)throw Error('Unexpected HEAD')
const results=[]
for(const area of ['api','.']){
 const cwd=path.resolve(root,area),r=spawnSync(process.execPath,['node_modules/typescript/bin/tsc','--noEmit','--incremental','false','-p','tsconfig.json'],{cwd,encoding:'utf8'})
 // Only compiler diagnostics are persisted; no environment or configuration values.
 results.push({area,exitCode:r.status,diagnostics:(r.stdout||'')+(r.stderr||'')})
}
fs.writeFileSync(path.join(__dirname,'codex-review-round28-static-checks.cjs'),'module.exports = '+JSON.stringify({target:scope.target,results},null,2)+'\n')
console.log(JSON.stringify(results));process.exitCode=results.some(r=>r.exitCode!==0)?1:0
