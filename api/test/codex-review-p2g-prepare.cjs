'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),target='8db1a0b9ccb9b990f3b806a47f8993f8060e181d'
const git=args=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
assert.equal(git(['rev-parse','HEAD']),target);assert.equal(git(['diff','--name-only']),'')
const files=git(['ls-files']).split(/\r?\n/).filter(Boolean).map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))
function write(name,text){const dest=path.join(__dirname,'codex-review-p2g-'+name);assert.equal(fs.existsSync(dest),false);fs.writeFileSync(dest,text)}
write('scope-evidence.cjs','module.exports = '+JSON.stringify({target,root,files},null,2)+'\n')
for(const name of ['suite.cjs','fixture.cjs','static.cjs','verify.cjs','preload.cjs']){
 let text=fs.readFileSync(path.join(__dirname,'codex-review-p2f-'+name),'utf8').replaceAll('codex-review-p2f-','codex-review-p2g-').replaceAll('p2f_','p2g_').replaceAll('CODEX_REVIEW_REPORT_P2F.md','CODEX_REVIEW_REPORT_P2G.md')
 if(name==='suite.cjs')text=text.replace('const files = selected.map',"reviewedTemporaryMigrations.add('tasks-migration.integration.cjs')\nconst files = selected.map")
 write(name,text)
}
console.log(JSON.stringify({target,trackedFiles:files.length}))
