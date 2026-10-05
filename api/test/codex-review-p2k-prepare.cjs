'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),target='70a99530335d5ff3987a12e3c7b6c333425378c6'
const git=args=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
assert.equal(git(['rev-parse','HEAD']),target);assert.equal(git(['diff','--name-only']),'')
assert.equal(git(['diff','--name-only','a423953',target,'--','api/src','src','docs/migrations']),'')
const files=git(['ls-files']).split(/\r?\n/).filter(Boolean).map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))
function write(name,text){const dest=path.join(__dirname,'codex-review-p2k-'+name);assert.equal(fs.existsSync(dest),false);fs.writeFileSync(dest,text)}
write('scope-evidence.cjs','module.exports = '+JSON.stringify({target,root,files},null,2)+'\n')
for(const name of ['suite.cjs','fixture.cjs','static.cjs','verify.cjs','preload.cjs','download-preload.cjs','closure.integration.cjs','independent.integration.cjs','decision-race.integration.cjs','units.integration.cjs','current-scope.integration.cjs']){
 const text=fs.readFileSync(path.join(__dirname,'codex-review-p2j-'+name),'utf8').replaceAll('codex-review-p2j-','codex-review-p2k-').replaceAll('p2j_','p2k_').replaceAll('P2J','P2K')
 write(name,text)
}
console.log(JSON.stringify({target,trackedFiles:files.length}))
