'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),git=args=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim(),target=git(['rev-parse','HEAD'])
assert.equal(target.slice(0,7),'938004f');assert.equal(git(['diff','--name-only']),'');assert.equal(git(['diff','--name-only','3ed7b64','HEAD','--','api/src','src','docs/migrations']),'')
const files=git(['ls-files']).split(/\r?\n/).filter(Boolean).map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))
const write=(name,value)=>{const p=path.join(__dirname,'codex-review-p2y-'+name);assert.equal(fs.existsSync(p),false);fs.writeFileSync(p,value)}
write('scope-evidence.cjs','module.exports = '+JSON.stringify({target,reviewed:['b4d0b00','3ed7b64'],root,files},null,2)+'\n')
for(const name of ['suite.cjs','fixture.cjs','verify.cjs','preload.cjs','http-preload.cjs','download-preload.cjs','safe-mail-preload.cjs','comments-fixture.cjs','employment-fixture.cjs','static.cjs']){
 let text=fs.readFileSync(path.join(__dirname,'codex-review-p2x-'+name),'utf8').replaceAll('codex-review-p2x-','codex-review-p2y-').replaceAll('p2x_','p2y_').replaceAll('P2X','P2Y')
 if(name==='suite.cjs')text=text.replace('const files = selected.map',"reviewedTemporaryMigrations.add('tasks-assignment-rules-migration.integration.cjs')\nconst files = selected.map")
 write(name,text)
}
let retry=fs.readFileSync(path.join(__dirname,'codex-review-p2x-lock-order.integration.cjs'),'utf8').replaceAll('codex-review-p2x-','codex-review-p2y-').replaceAll('p2x_','p2y_').replaceAll('P2X','P2Y')
retry=retry.replace("characterize bank approval versus suspension lock order, including the previous unlocked-read behavior","suspension deadlock retries the transaction without duplicate effects")
retry=retry.replace('[false,true]','[false]').replace("assert.ok([a.status,b.status].every(s=>s===201||s===500),JSON.stringify({a,b}))","assert.deepEqual([a.status,b.status],[201,201],JSON.stringify({a,b}));assert.equal(await f.repo('EmployeeSuspension').countBy({employeeId:emp.id}),1)")
retry=retry.replace('[[201,500],[201,500]]','[[201,201]]')
write('retry.integration.cjs',retry)
console.log(JSON.stringify({target,trackedFiles:files.length}))
