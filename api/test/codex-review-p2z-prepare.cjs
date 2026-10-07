'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),git=args=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim(),target=git(['rev-parse','HEAD'])
assert.equal(target.slice(0,7),'2249f0d');assert.equal(git(['diff','--name-only']),'');assert.equal(git(['diff','--name-only','07d51e0','HEAD','--','api/src','src','docs/migrations']),'')
const files=git(['ls-files']).split(/\r?\n/).filter(Boolean).map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))
const write=(name,value)=>{const p=path.join(__dirname,'codex-review-p2z-'+name);assert.equal(fs.existsSync(p),false);fs.writeFileSync(p,value)}
write('scope-evidence.cjs','module.exports = '+JSON.stringify({target,reviewed:['3ed7b64','07d51e0'],root,files},null,2)+'\n')
for(const name of ['suite.cjs','fixture.cjs','verify.cjs','preload.cjs','http-preload.cjs','download-preload.cjs','safe-mail-preload.cjs','transport-preload.cjs','comments-fixture.cjs','employment-fixture.cjs','static.cjs','units.integration.cjs','retry.integration.cjs','personal-proof.integration.cjs','contract-lock-order.integration.cjs','feature-pool.integration.cjs','independent.integration.cjs']){
 const text=fs.readFileSync(path.join(__dirname,'codex-review-p2y-'+name),'utf8').replaceAll('codex-review-p2y-','codex-review-p2z-').replaceAll('p2y_','p2z_').replaceAll('P2Y','P2Z')
 write(name,text)
}
console.log(JSON.stringify({target,trackedFiles:files.length}))
