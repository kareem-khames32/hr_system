'use strict'
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),target=cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()
assert.ok(target.startsWith('e1df9d5'));assert.equal(cp.execFileSync('git',['diff','--name-only','HEAD'],{cwd:root,encoding:'utf8'}).trim(),'')
const files=cp.execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean).map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))
fs.writeFileSync(path.join(__dirname,'codex-review-p4c-scope-evidence.cjs'),'module.exports = '+JSON.stringify({target,base:'aa88c14',files},null,2)+'\n')
for(const name of ['suite','fixture','verify','preload','http-preload','download-preload','safe-mail-preload','transport-preload','lfsql-preload','static','helpers']){
 const dest=path.join(__dirname,'codex-review-p4c-'+name+'.cjs');assert.equal(fs.existsSync(dest),false)
 const s=fs.readFileSync(path.join(__dirname,'codex-review-p4b-'+name+'.cjs'),'utf8').replaceAll('codex-review-p4b-','codex-review-p4c-').replaceAll('p4b_','p4c_').replaceAll('P4B','P4C')
 fs.writeFileSync(dest,s)
}
console.log(JSON.stringify({target,tracked:files.length}))
