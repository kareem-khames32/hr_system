'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),target='9236c5cd2c04a022924e5d51201c3a056b03a132'
const git=args=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
assert.equal(git(['rev-parse','HEAD']),target);assert.equal(git(['diff','--name-only']),'')
assert.equal(git(['diff','--name-only','af310a6',target,'--','api/src','src','docs/migrations']),'')
const files=git(['ls-files']).split(/\r?\n/).filter(Boolean).map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))
function write(name,text){const dest=path.join(__dirname,'codex-review-p2p-'+name);assert.equal(fs.existsSync(dest),false);fs.writeFileSync(dest,text)}
write('scope-evidence.cjs','module.exports = '+JSON.stringify({target,root,files},null,2)+'\n')
for(const name of ['suite.cjs','fixture.cjs','static.cjs','verify.cjs','preload.cjs','download-preload.cjs','http-preload.cjs','regression-preload.cjs','renderer-preload.cjs']){
 let text=fs.readFileSync(path.join(__dirname,'codex-review-p2o-'+name),'utf8').replaceAll('codex-review-p2o-','codex-review-p2p-').replaceAll('p2o_','p2p_').replaceAll('P2O','P2P')
 if(name==='suite.cjs')text=text.replace('const files = selected.map',"reviewedTemporaryMigrations.add('comments-migration.integration.cjs')\nconst files = selected.map")
 write(name,text)
}
console.log(JSON.stringify({target,trackedFiles:files.length}))
