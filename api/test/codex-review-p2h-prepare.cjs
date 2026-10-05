'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),target='6d4d9e97f7d0ceaca2e2c4f4636ecdb00bf6497e'
const git=args=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
assert.equal(git(['rev-parse','HEAD']),target);assert.equal(git(['diff','--name-only']),'')
assert.equal(git(['diff','--name-only','552244b',target,'--','api/src','src','docs/migrations']),'')
const files=git(['ls-files']).split(/\r?\n/).filter(Boolean).map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))
function write(name,text){const dest=path.join(__dirname,'codex-review-p2h-'+name);assert.equal(fs.existsSync(dest),false);fs.writeFileSync(dest,text)}
write('scope-evidence.cjs','module.exports = '+JSON.stringify({target,root,files},null,2)+'\n')
for(const name of ['suite.cjs','fixture.cjs','static.cjs','verify.cjs','preload.cjs','download-preload.cjs','independent.integration.cjs']){
 let text=fs.readFileSync(path.join(__dirname,'codex-review-p2g-'+name),'utf8').replaceAll('codex-review-p2g-','codex-review-p2h-').replaceAll('p2g_','p2h_').replaceAll('P2G','P2H').replaceAll('p2g_','p2h_')
 if(name==='suite.cjs')text=text.replace('const files = selected.map',"reviewedTemporaryMigrations.add('request-execution-migration.integration.cjs')\nconst files = selected.map")
 if(name==='download-preload.cjs')text=text.replace('hr-tasks-files-', 'hr-(?:tasks|reqexec)-files-')
 write(name==='independent.integration.cjs'?'closure.integration.cjs':name,text)
}
console.log(JSON.stringify({target,trackedFiles:files.length}))
