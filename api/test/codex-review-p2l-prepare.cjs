'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),target='9007ecbf88dc84e7d8ec88a638fafea698d9a25b'
const git=args=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
assert.equal(git(['rev-parse','HEAD']),target);assert.equal(git(['diff','--name-only']),'')
assert.equal(git(['diff','--name-only','f44d4b1',target,'--','api/src','src','docs/migrations']),'')
const files=git(['ls-files']).split(/\r?\n/).filter(Boolean).map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))
function write(name,text){const dest=path.join(__dirname,'codex-review-p2l-'+name);assert.equal(fs.existsSync(dest),false);fs.writeFileSync(dest,text)}
write('scope-evidence.cjs','module.exports = '+JSON.stringify({target,root,files},null,2)+'\n')
for(const name of ['suite.cjs','fixture.cjs','static.cjs','verify.cjs','preload.cjs','download-preload.cjs','user-agent-preload.cjs']){
 let text=fs.readFileSync(path.join(__dirname,'codex-review-p2k-'+name),'utf8').replaceAll('codex-review-p2k-','codex-review-p2l-').replaceAll('p2k_','p2l_').replaceAll('P2K','P2L')
 if(name==='suite.cjs')text=text.replace("const files = selected", "reviewedTemporaryMigrations.add('policies-migration.integration.cjs')\nconst files = selected")
 write(name,text)
}
console.log(JSON.stringify({target,trackedFiles:files.length}))
