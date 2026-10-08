'use strict'
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),results=[]
for(const area of ['api','.']){
 const run=cp.spawnSync(process.execPath,[path.join(root,area,'node_modules/typescript/bin/tsc'),'--noEmit','--incremental','false'],{cwd:path.join(root,area),encoding:'utf8',timeout:180000})
 results.push({area,exitCode:run.status,diagnostics:String(run.stdout||'')+String(run.stderr||'')})
}
fs.writeFileSync(path.join(__dirname,'codex-review-p4b-static-checks.cjs'),'module.exports = '+JSON.stringify({target:require('./codex-review-p4b-scope-evidence.cjs').target,results},null,2)+'\n')
console.log(JSON.stringify(results));assert.ok(results.every(r=>r.exitCode===0))
