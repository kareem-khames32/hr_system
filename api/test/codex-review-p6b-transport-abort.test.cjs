'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict'),cp=require('node:child_process'),path=require('node:path'),fs=require('node:fs')
test('P6B-W03: receiver abort leaves the sending promise pending past its timeout',t=>{
 const child=cp.spawnSync(process.execPath,[path.join(__dirname,'codex-review-p6b-response-abort.cjs')],{encoding:'utf8',timeout:6000})
 const evidence={status:child.status,signal:child.signal,stdout:child.stdout,stderr:child.stderr}
 fs.writeFileSync(path.join(__dirname,'codex-review-p6b-transport-abort-result.cjs'),'module.exports = '+JSON.stringify(evidence,null,2)+'\n')
 assert.equal(child.status,3);assert.equal(JSON.parse(child.stdout.trim()).result,'hung');assert.equal(child.stderr,'')
 t.diagnostic(JSON.stringify({unsettledAfterMs:2500,transportTimeoutMs:1000,receiver:'local loopback',externalConnections:0}))
})
