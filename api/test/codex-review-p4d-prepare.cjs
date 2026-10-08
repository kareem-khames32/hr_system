'use strict'
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),target=cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()
assert.ok(target.startsWith('fbe5a18'));assert.equal(cp.execFileSync('git',['diff','--name-only','HEAD'],{cwd:root,encoding:'utf8'}).trim(),'')
const files=cp.execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean).map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))
fs.writeFileSync(path.join(__dirname,'codex-review-p4d-scope-evidence.cjs'),'module.exports = '+JSON.stringify({target,base:'9299eee',files},null,2)+'\n')
for(const name of ['suite','fixture','verify','preload','http-preload','download-preload','safe-mail-preload','transport-preload','lfsql-preload','static','helpers','units']){
 const dest=path.join(__dirname,'codex-review-p4d-'+name+'.cjs');assert.equal(fs.existsSync(dest),false)
 const s=fs.readFileSync(path.join(__dirname,'codex-review-p4c-'+name+'.cjs'),'utf8').replaceAll('codex-review-p4c-','codex-review-p4d-').replaceAll('p4c_','p4d_').replaceAll('P4C','P4D')
 fs.writeFileSync(dest,s)
}
console.log(JSON.stringify({target,tracked:files.length}))
