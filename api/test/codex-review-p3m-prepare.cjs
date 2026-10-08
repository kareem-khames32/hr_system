'use strict'
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),target=cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()
assert.ok(target.startsWith('b3c4d3c'))
assert.equal(cp.execFileSync('git',['diff','--name-only','HEAD'],{cwd:root,encoding:'utf8'}).trim(),'')
const files=cp.execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean).map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))
fs.writeFileSync(path.join(__dirname,'codex-review-p3m-scope-evidence.cjs'),'module.exports = '+JSON.stringify({target,base:'3f30874',files},null,2)+'\n')
for(const suffix of ['suite','fixture','verify','preload','http-preload','download-preload','safe-mail-preload','transport-preload','static','helpers']){
 const dest=path.join(__dirname,'codex-review-p3m-'+suffix+'.cjs');assert.equal(fs.existsSync(dest),false)
 fs.writeFileSync(dest,fs.readFileSync(path.join(__dirname,'codex-review-p3l-'+suffix+'.cjs'),'utf8').replaceAll('codex-review-p3l-','codex-review-p3m-').replaceAll('p3l_','p3m_').replaceAll('P3L','P3M'))
}
console.log(JSON.stringify({target,tracked:files.length}))
