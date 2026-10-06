'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),target='5af6c3096c30b80c81e32132322e3a93209244cc'
const git=args=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
assert.equal(git(['rev-parse','HEAD']),target);assert.equal(git(['diff','--name-only']),'')
assert.equal(git(['diff','--name-only','85ba28c',target,'--','api/src','src','docs/migrations']),'')
const files=git(['ls-files']).split(/\r?\n/).filter(Boolean).map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))
function write(name,text){const dest=path.join(__dirname,'codex-review-p2q-'+name);assert.equal(fs.existsSync(dest),false);fs.writeFileSync(dest,text)}
write('scope-evidence.cjs','module.exports = '+JSON.stringify({target,root,files},null,2)+'\n')
for(const name of ['suite.cjs','fixture.cjs','static.cjs','verify.cjs','preload.cjs','download-preload.cjs','http-preload.cjs','regression-preload.cjs','renderer-preload.cjs','comments-fixture.cjs']){
 const text=fs.readFileSync(path.join(__dirname,'codex-review-p2p-'+name),'utf8').replaceAll('codex-review-p2p-','codex-review-p2q-').replaceAll('p2p_','p2q_').replaceAll('P2P','P2Q')
 write(name,text)
}
// Preserve the previous review assertions, using only new fixture/output paths.
for(const name of ['boundaries','independent','concurrency','units','decision-race']){
 write(name+'.integration.cjs',fs.readFileSync(path.join(__dirname,'codex-review-p2p-'+name+'.integration.cjs'),'utf8').replaceAll('codex-review-p2p-','codex-review-p2q-').replaceAll('p2p_','p2q_').replaceAll('P2P','P2Q'))
}
console.log(JSON.stringify({target,trackedFiles:files.length}))
