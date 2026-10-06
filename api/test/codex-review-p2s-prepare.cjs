'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),target='23ded2a2f69549fa05aa9fc16b596ae35efc1ec2'
const git=args=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
assert.equal(git(['rev-parse','HEAD']),target);assert.equal(git(['diff','--name-only']),'')
assert.equal(git(['diff','--name-only','508fbb0',target,'--','api/src','src','docs/migrations']),'')
const files=git(['ls-files']).split(/\r?\n/).filter(Boolean).map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))
function write(name,text){const dest=path.join(__dirname,'codex-review-p2s-'+name);assert.equal(fs.existsSync(dest),false);fs.writeFileSync(dest,text)}
write('scope-evidence.cjs','module.exports = '+JSON.stringify({target,root,reviewed:'508fbb0',files},null,2)+'\n')
for(const name of ['suite.cjs','fixture.cjs','static.cjs','verify.cjs','preload.cjs','download-preload.cjs','http-preload.cjs','regression-preload.cjs','renderer-preload.cjs','comments-fixture.cjs',...['boundaries','independent','concurrency','units','decision-race','controls','account-lock','pagination'].map(x=>x+'.integration.cjs')]){
 write(name,fs.readFileSync(path.join(__dirname,'codex-review-p2r-'+name),'utf8').replaceAll('codex-review-p2r-','codex-review-p2s-').replaceAll('p2r_','p2s_').replaceAll('P2R','P2S'))
}
console.log(JSON.stringify({target,trackedFiles:files.length}))
