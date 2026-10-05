'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),target='a30d8c0010d00d88fa88a5b4eefcb5de7562d437'
const git=args=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
assert.equal(git(['rev-parse','HEAD']),target);assert.equal(git(['diff','--name-only']),'')
const files=git(['ls-files']).split(/\r?\n/).filter(Boolean).map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))
function write(name,text){const dest=path.join(__dirname,'codex-review-p2f-'+name);assert.equal(fs.existsSync(dest),false);fs.writeFileSync(dest,text)}
write('scope-evidence.cjs','module.exports = '+JSON.stringify({target,root,files},null,2)+'\n')
for(const name of ['suite.cjs','fixture.cjs','static.cjs','verify.cjs','preload.cjs','boundaries.integration.cjs','units.integration.cjs']){
 const text=fs.readFileSync(path.join(__dirname,'codex-review-p2e-'+name),'utf8').replaceAll('codex-review-p2e-','codex-review-p2f-').replaceAll('p2e_','p2f_').replaceAll('CODEX_REVIEW_REPORT_P2E.md','CODEX_REVIEW_REPORT_P2F.md')
 write(name,text)
}
console.log(JSON.stringify({target,trackedFiles:files.length}))
