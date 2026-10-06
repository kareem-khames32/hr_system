'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),target='59146d5aa5d7ceddf65930a97ca1590bd49f6044'
const git=args=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
assert.equal(git(['rev-parse','HEAD']),target);assert.equal(git(['diff','--name-only']),'')
assert.equal(git(['diff','--name-only','f7514a8',target,'--','api/src','src','docs/migrations']),'')
const files=git(['ls-files']).split(/\r?\n/).filter(Boolean).map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))
function write(name,text){const dest=path.join(__dirname,'codex-review-p2n-'+name);assert.equal(fs.existsSync(dest),false);fs.writeFileSync(dest,text)}
write('scope-evidence.cjs','module.exports = '+JSON.stringify({target,root,files},null,2)+'\n')
for(const name of ['suite.cjs','fixture.cjs','static.cjs','verify.cjs','preload.cjs','download-preload.cjs','http-preload.cjs','regression-preload.cjs','streams.integration.cjs']){
 const text=fs.readFileSync(path.join(__dirname,'codex-review-p2m-'+name),'utf8').replaceAll('codex-review-p2m-','codex-review-p2n-').replaceAll('p2m_','p2n_').replaceAll('P2M','P2N')
 write(name,text)
}
console.log(JSON.stringify({target,trackedFiles:files.length}))
