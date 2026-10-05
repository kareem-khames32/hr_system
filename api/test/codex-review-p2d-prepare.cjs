'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),git=args=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim(),target='f8d8c1bf447bc37587da0911ba4545966459f0a0'
assert.equal(git(['rev-parse','HEAD']),target);assert.equal(git(['diff','--name-only']),'')
const files=git(['ls-files']).split(/\r?\n/).filter(Boolean).map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))
function write(name,text){const dest=path.join(__dirname,'codex-review-p2d-'+name);assert.equal(fs.existsSync(dest),false);fs.writeFileSync(dest,text)}
write('scope-evidence.cjs','module.exports = '+JSON.stringify({target,root,files},null,2)+'\n')
for(const name of ['suite.cjs','fixture.cjs','support.cjs','static.cjs','verify.cjs','download-preload.cjs','office-edges.integration.cjs','office-real.integration.cjs','office-units.integration.cjs','office.integration.cjs','closure.integration.cjs','live-locks.integration.cjs','live.integration.cjs','live-controls.integration.cjs','script-precision.integration.cjs','precision.integration.cjs','screen-history.integration.cjs','money.integration.cjs']){
 let text=fs.readFileSync(path.join(__dirname,'codex-review-p2c-'+name),'utf8').replaceAll('codex-review-p2c-','codex-review-p2d-').replaceAll('p2c_','p2d_').replaceAll('CODEX_REVIEW_REPORT_P2C.md','CODEX_REVIEW_REPORT_P2D.md')
 write(name,text)
}
console.log(JSON.stringify({target,trackedFiles:files.length}))
