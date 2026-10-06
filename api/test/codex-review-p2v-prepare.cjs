'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),git=args=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim(),target=git(['rev-parse','HEAD'])
assert.equal(target.slice(0,7),'9a00376');assert.equal(git(['diff','--name-only']),'');assert.equal(git(['diff','--name-only','ec58f92','HEAD','--','api/src','src','docs/migrations']),'')
const files=git(['ls-files']).split(/\r?\n/).filter(Boolean).map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))
const write=(name,value)=>{const p=path.join(__dirname,'codex-review-p2v-'+name);assert.equal(fs.existsSync(p),false);fs.writeFileSync(p,value)}
write('scope-evidence.cjs','module.exports = '+JSON.stringify({target,reviewed:'ec58f92',root,files},null,2)+'\n')
for(const name of ['suite.cjs','fixture.cjs','verify.cjs','preload.cjs','http-preload.cjs','download-preload.cjs','safe-mail-preload.cjs','comments-fixture.cjs','static.cjs']){
 let text=fs.readFileSync(path.join(__dirname,'codex-review-p2u-'+name),'utf8').replaceAll('codex-review-p2u-','codex-review-p2v-').replaceAll('p2u_','p2v_').replaceAll('P2U','P2V')
 if(name==='suite.cjs')text=text.replace('const files = selected.map',"reviewedTemporaryMigrations.add('employment-periods-migration.integration.cjs')\nreviewedTemporaryMigrations.add('codex-review-p2v-migration.integration.cjs')\nconst files = selected.map")
 write(name,text)
}
write('units.integration.cjs',"'use strict'\n"+['employment-periods','employment-periods-ui','leave-balance-periods','schema-readiness','routes-guards'].map(n=>`require('./${n}.test.cjs')`).join('\n')+'\n')
console.log(JSON.stringify({target,reviewed:'ec58f92',trackedFiles:files.length}))
