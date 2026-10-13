'use strict'
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict')
const root=path.resolve(__dirname,'../..'),target=cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()
assert.equal(target,'40b42e3a01e23c3091fde2ec78071164a228f308')
const files=cp.execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8',maxBuffer:8e6}).split('\0').filter(Boolean).map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))
fs.writeFileSync(path.join(__dirname,'codex-review-p8a-scope-evidence.cjs'),'module.exports = '+JSON.stringify({target,files},null,2)+'\n')
for(const suffix of ['suite','verify','preload','http-preload','safe-mail-preload','download-preload','transport-preload','lfsql-preload','local-preload']){
 const dest=path.join(__dirname,'codex-review-p8a-'+suffix+'.cjs');assert.equal(fs.existsSync(dest),false)
 let text=fs.readFileSync(path.join(__dirname,'codex-review-p7d-'+suffix+'.cjs'),'utf8').replaceAll('p7d','p8a').replaceAll('P7D','P8A')
 if(suffix==='suite')text=text.replace('const files = selected.map',"for(const n of ['missing-punch-deduction','mailbox','meet','meet-calls','meet-audience','task-attachments','work-extension','positions','review-evaluator','mobile-punch-audience']) reviewedTemporaryMigrations.add(n+'.integration.cjs');\nconst files = selected.map")
 fs.writeFileSync(dest,text)
}
console.log(JSON.stringify({target,trackedFiles:files.length}))
