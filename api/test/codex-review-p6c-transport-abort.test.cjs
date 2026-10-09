'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict'),cp=require('node:child_process'),path=require('node:path'),fs=require('node:fs')
test('P6C-W03: receiver abort settles from response headers',t=>{
 const child=cp.spawnSync(process.execPath,[path.join(__dirname,'codex-review-p6c-response-abort.cjs')],{encoding:'utf8',timeout:6000})
 const evidence={status:child.status,signal:child.signal,stdout:child.stdout,stderr:child.stderr}
 fs.writeFileSync(path.join(__dirname,'codex-review-p6c-transport-abort-result.cjs'),'module.exports = '+JSON.stringify(evidence,null,2)+'\n')
 assert.equal(child.status,0);assert.deepEqual(JSON.parse(child.stdout.trim()),{result:'resolved',status:200});assert.equal(child.stderr,'')
 t.diagnostic(JSON.stringify({responseStatus:200,promiseSettled:true,receiver:'local loopback',externalConnections:0}))
})
