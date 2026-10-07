'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),git=args=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim(),target=git(['rev-parse','HEAD'])
assert.equal(target.slice(0,7),'6091baf');assert.equal(git(['diff','--name-only']),'')
const files=git(['ls-files']).split(/\r?\n/).filter(Boolean).map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))
const write=(name,value)=>{const p=path.join(__dirname,'codex-review-p3d-'+name);assert.equal(fs.existsSync(p),false);fs.writeFileSync(p,value)}
write('scope-evidence.cjs','module.exports = '+JSON.stringify({target,reviewed:['577b8d7..e9c8b9c','998de4f..6091baf'],root,files},null,2)+'\n')
for(const name of ['suite.cjs','fixture.cjs','verify.cjs','preload.cjs','http-preload.cjs','download-preload.cjs','safe-mail-preload.cjs','transport-preload.cjs','static.cjs']){
 let body=fs.readFileSync(path.join(__dirname,'codex-review-p3c-'+name),'utf8').replaceAll('codex-review-p3c-','codex-review-p3d-').replaceAll('p3c_','p3d_').replaceAll('P3C','P3D')
 if(name==='suite.cjs')body=body.replace("const files = selected.map", "for(const n of ['user-sessions-migration','totp-migration','announcements-migration','document-expiry-migration','saved-reports-migration']) reviewedTemporaryMigrations.add(n+'.integration.cjs')\nconst files = selected.map")
 write(name,body)
}
console.log(JSON.stringify({target,trackedFiles:files.length}))
