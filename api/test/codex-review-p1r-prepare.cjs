'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),target='c6b3c573c2c96978c298720426531781f5e33637',git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim()
assert.equal(git(['rev-parse','HEAD']),target);assert.equal(git(['diff','--name-only',target]),'')
const files=git(['ls-files','api/src','api/scripts','src','docs','api/test']).split(/\r?\n/).filter(Boolean)
fs.writeFileSync(path.join(__dirname,'codex-review-p1r-scope-evidence.cjs'),'module.exports = '+JSON.stringify({target,base:'622ed57',root,files:files.map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))},null,2)+'\n')
for(const name of ['suite.cjs','preload.cjs','fixture.cjs','support.cjs','static.cjs','boundaries.integration.cjs']){
 const dest=path.join(__dirname,'codex-review-p1r-'+name);assert.equal(fs.existsSync(dest),false)
 fs.writeFileSync(dest,fs.readFileSync(path.join(__dirname,'codex-review-p1-'+name),'utf8').replaceAll('codex-review-p1-','codex-review-p1r-'))
}
console.log(JSON.stringify({target,hashedFiles:files.length}))
