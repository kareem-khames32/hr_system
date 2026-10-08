'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),git=args=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim(),target=git(['rev-parse','HEAD'])
assert.equal(target.slice(0,7),'452454f');assert.equal(git(['diff','--name-only']),'')
const files=git(['ls-files']).split(/\r?\n/).filter(Boolean).map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))
const write=(name,value)=>{const p=path.join(__dirname,'codex-review-p3k-'+name);assert.equal(fs.existsSync(p),false);fs.writeFileSync(p,value)}
write('scope-evidence.cjs','module.exports = '+JSON.stringify({target,reviewed:['1338808..452454f'],root,files},null,2)+'\n')
for(const name of ['suite.cjs','fixture.cjs','verify.cjs','preload.cjs','http-preload.cjs','download-preload.cjs','safe-mail-preload.cjs','transport-preload.cjs','static.cjs']){
 let body=fs.readFileSync(path.join(__dirname,'codex-review-p3j-'+name),'utf8').replaceAll('codex-review-p3j-','codex-review-p3k-').replaceAll('p3j_','p3k_').replaceAll('P3J','P3K')
 if(name==='suite.cjs')body=body.replace('const files = selected.map',"for(const n of ['phase3-migrations','onboarding-templates-migration','recruitment-jobs-migration']) reviewedTemporaryMigrations.add(n+'.integration.cjs')\nconst files = selected.map")
 write(name,body)
}
console.log(JSON.stringify({target,trackedFiles:files.length}))
