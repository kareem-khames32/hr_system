'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),target='020dbf04c0ee9947ca146d9de92567ac9a0d97a8'
const git=args=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
assert.equal(git(['rev-parse','HEAD']),target);assert.equal(git(['diff','--name-only']),'')
assert.equal(git(['diff','--name-only','4934813',target,'--','api/src','src','docs/migrations']),'')
const files=git(['ls-files']).split(/\r?\n/).filter(Boolean).map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))
function write(name,text){const dest=path.join(__dirname,'codex-review-p2m-'+name);assert.equal(fs.existsSync(dest),false);fs.writeFileSync(dest,text)}
write('scope-evidence.cjs','module.exports = '+JSON.stringify({target,root,files},null,2)+'\n')
for(const name of ['suite.cjs','fixture.cjs','static.cjs','verify.cjs','preload.cjs','download-preload.cjs','http-preload.cjs','regression-preload.cjs','units.integration.cjs','streams.integration.cjs']){
 const text=fs.readFileSync(path.join(__dirname,'codex-review-p2l-'+name),'utf8').replaceAll('codex-review-p2l-','codex-review-p2m-').replaceAll('p2l_','p2m_').replaceAll('P2L','P2M')
 write(name,text)
}
// Execute the previous immutable evidence against this target with this round's
// disposable fixture/transport. The original evidence files are not modified.
write('closure.integration.cjs',fs.readFileSync(path.join(__dirname,'codex-review-p2l-independent.integration.cjs'),'utf8').replaceAll('codex-review-p2l-fixture.cjs','codex-review-p2m-fixture.cjs').replaceAll('p2l_independent','p2m_closure'))
console.log(JSON.stringify({target,trackedFiles:files.length}))
