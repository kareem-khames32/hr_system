'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),target='6620dab9b58408975812f6155d8cabb312d7906f'
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
assert.equal(git(['rev-parse','HEAD']),target)
assert.equal(git(['diff','--name-only',target,'--','api/src','src','docs','api/test']),'')
const files=git(['ls-files','api/src','src','docs','api/test']).split(/\r?\n/).filter(Boolean)
const evidence=path.join(__dirname,'codex-review-round29-scope-evidence.cjs')
if(!fs.existsSync(evidence))fs.writeFileSync(evidence,'module.exports = '+JSON.stringify({target,base:'770a591',root,baselineStatus:git(['status','--short']),files:files.map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')})),environmentCopied:false},null,2)+'\n')
for(const name of ['suite','preload','fixture','support','static','final-audit']){
 const destination=path.join(__dirname,`codex-review-round29-${name}.cjs`)
 if(fs.existsSync(destination))continue
 fs.writeFileSync(destination,fs.readFileSync(path.join(__dirname,`codex-review-round28-${name}.cjs`),'utf8').replaceAll('round28','round29').replaceAll('CR28','CR29').replaceAll('REPORT_28','REPORT_29').replace('|27|28)','|27|28|29)'))
}
console.log(JSON.stringify({target,hashedFiles:files.length,productClean:true}))
