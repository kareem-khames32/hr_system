'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),target='733480cee5262b7880e7419d52a0982a00cb1074'
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
assert.equal(git(['rev-parse','HEAD']),target)
assert.equal(git(['diff','--name-only',target,'--','api/src','src','docs','api/test']),'')
const files=git(['ls-files','api/src','src','docs','api/test']).split(/\r?\n/).filter(Boolean)
const evidence=path.join(__dirname,'codex-review-round37-scope-evidence.cjs')
assert.equal(fs.existsSync(evidence),false)
fs.writeFileSync(evidence,'module.exports = '+JSON.stringify({target,base:'17086dd',root,files:files.map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')})),environmentCopied:false},null,2)+'\n')
for(const name of ['suite','preload','fixture','support','static','final-audit']){
 const destination=path.join(__dirname,`codex-review-round37-${name}.cjs`)
 assert.equal(fs.existsSync(destination),false)
 fs.writeFileSync(destination,fs.readFileSync(path.join(__dirname,`codex-review-round36-${name}.cjs`),'utf8').replaceAll('round36','round37').replaceAll('CR36','CR37').replaceAll('REPORT_36','REPORT_37').replace('|35|36)','|35|36|37)'))
}
console.log(JSON.stringify({target,hashedFiles:files.length,productClean:true}))
