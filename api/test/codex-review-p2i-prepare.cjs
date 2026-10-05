'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),target='f9f6e7fa649a8e5d81e0e8ccfaf66861bbbd0967'
const git=args=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
assert.equal(git(['rev-parse','HEAD']),target);assert.equal(git(['diff','--name-only']),'')
assert.equal(git(['diff','--name-only','3bd73a4',target,'--','api/src','src','docs/migrations']),'')
const files=git(['ls-files']).split(/\r?\n/).filter(Boolean).map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))
function write(name,text){const dest=path.join(__dirname,'codex-review-p2i-'+name);assert.equal(fs.existsSync(dest),false);fs.writeFileSync(dest,text)}
write('scope-evidence.cjs','module.exports = '+JSON.stringify({target,root,files},null,2)+'\n')
for(const name of ['suite.cjs','fixture.cjs','static.cjs','verify.cjs','preload.cjs','download-preload.cjs','execution-independent.integration.cjs']){
 let text=fs.readFileSync(path.join(__dirname,'codex-review-p2h-'+name),'utf8').replaceAll('codex-review-p2h-','codex-review-p2i-').replaceAll('p2h_','p2i_').replaceAll('P2H','P2I')
 if(name==='suite.cjs')text=text.replace('const files = selected.map',"reviewedTemporaryMigrations.add('approval-delegations-migration.integration.cjs')\nconst files = selected.map")
 if(name==='download-preload.cjs')text=text.replace('tasks|reqexec', 'tasks|reqexec|delegations')
 write(name==='execution-independent.integration.cjs'?'closure.integration.cjs':name,text)
}
console.log(JSON.stringify({target,trackedFiles:files.length}))
