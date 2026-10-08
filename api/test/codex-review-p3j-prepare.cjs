'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),git=args=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim(),target=git(['rev-parse','HEAD'])
assert.equal(target.slice(0,7),'7b7f8d1');assert.equal(git(['diff','--name-only']),'')
const files=git(['ls-files']).split(/\r?\n/).filter(Boolean).map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))
const write=(name,value)=>{const p=path.join(__dirname,'codex-review-p3j-'+name);assert.equal(fs.existsSync(p),false);fs.writeFileSync(p,value)}
write('scope-evidence.cjs','module.exports = '+JSON.stringify({target,reviewed:['ef2664b..7b7f8d1'],root,files},null,2)+'\n')
for(const name of ['suite.cjs','fixture.cjs','verify.cjs','preload.cjs','http-preload.cjs','download-preload.cjs','safe-mail-preload.cjs','transport-preload.cjs','static.cjs','auth-independent.integration.cjs','units.integration.cjs','auth-races.integration.cjs','session-boundary.integration.cjs','password-race.integration.cjs','account-role-concurrency.integration.cjs','factor-paths.integration.cjs','unseeded-role.integration.cjs','permission-races.integration.cjs','domain-rebinding.integration.cjs','fix-controls.integration.cjs','domain-creation.integration.cjs','range-locks.integration.cjs']){
 let body=fs.readFileSync(path.join(__dirname,'codex-review-p3i-'+name),'utf8').replaceAll('codex-review-p3i-','codex-review-p3j-').replaceAll('p3i_','p3j_').replaceAll('P3I','P3J')
 if(name==='safe-mail-preload.cjs')body=body.replace('return app}',"app.get(require('../src/auth/directory.service').DirectoryService).client=()=>{throw Error('P3J real LDAP prohibited')};return app}")
 write(name,body)
}
console.log(JSON.stringify({target,trackedFiles:files.length}))
