'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),target='17086dd36aed10de1492215298d94326101acb1c'
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
assert.equal(git(['rev-parse','HEAD']),target)
assert.equal(git(['diff','--name-only',target,'--','api/src','src','docs','api/test']),'')
const files=git(['ls-files','api/src','src','docs','api/test']).split(/\r?\n/).filter(Boolean)
const evidence=path.join(__dirname,'codex-review-round36-scope-evidence.cjs')
if(!fs.existsSync(evidence))fs.writeFileSync(evidence,'module.exports = '+JSON.stringify({target,base:'21c07f3',root,files:files.map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')})),environmentCopied:false},null,2)+'\n')
for(const name of ['suite','preload','fixture','support','static','final-audit']){
 const destination=path.join(__dirname,`codex-review-round36-${name}.cjs`)
 if(fs.existsSync(destination))continue
 fs.writeFileSync(destination,fs.readFileSync(path.join(__dirname,`codex-review-round35-${name}.cjs`),'utf8').replaceAll('round35','round36').replaceAll('CR35','CR36').replaceAll('REPORT_35','REPORT_36').replace('|34|35)','|34|35|36)'))
}
console.log(JSON.stringify({target,hashedFiles:files.length,productClean:true}))
