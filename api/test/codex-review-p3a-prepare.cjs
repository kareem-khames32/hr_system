'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),git=args=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim(),target=git(['rev-parse','HEAD'])
assert.equal(target.slice(0,7),'1221285');assert.equal(git(['diff','--name-only']),'')
const files=git(['ls-files']).split(/\r?\n/).filter(Boolean).map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))
const write=(name,value)=>{const p=path.join(__dirname,'codex-review-p3a-'+name);assert.equal(fs.existsSync(p),false);fs.writeFileSync(p,value)}
write('scope-evidence.cjs','module.exports = '+JSON.stringify({target,reviewed:['3a7140d','2eeb197','1221285'],root,files},null,2)+'\n')
for(const name of ['suite.cjs','fixture.cjs','verify.cjs','preload.cjs','http-preload.cjs','download-preload.cjs','safe-mail-preload.cjs','transport-preload.cjs','comments-fixture.cjs','static.cjs']){
 let body=fs.readFileSync(path.join(__dirname,'codex-review-p2z-'+name),'utf8').replaceAll('codex-review-p2z-','codex-review-p3a-').replaceAll('p2z_','p3a_').replaceAll('P2Z','P3A')
 if(name==='suite.cjs')body=body.replace('const files = selected.map',"reviewedTemporaryMigrations.add('positions-migration.integration.cjs')\nconst files = selected.map")
 write(name,body)
}
console.log(JSON.stringify({target,trackedFiles:files.length}))
