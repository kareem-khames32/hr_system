'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),target='e6fa74039550f500ee18f8196e83341f37446553'
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
assert.equal(git(['rev-parse','HEAD']),target)
assert.equal(git(['diff','--name-only',target,'--','api/src','src','docs','api/test']),'')
const files=git(['ls-files','api/src','src','docs','api/test']).split(/\r?\n/).filter(Boolean)
const evidence=path.join(__dirname,'codex-review-round27-scope-evidence.cjs')
if(!fs.existsSync(evidence))fs.writeFileSync(evidence,'module.exports = '+JSON.stringify({target,base:'84f26e8',root,baselineStatus:git(['status','--short']),files:files.map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')})),environmentCopied:false},null,2)+'\n')
for(const name of ['suite','preload','fixture','support','static','final-audit']){
 const destination=path.join(__dirname,`codex-review-round27-${name}.cjs`)
 if(fs.existsSync(destination))continue
 fs.writeFileSync(destination,fs.readFileSync(path.join(__dirname,`codex-review-round26-${name}.cjs`),'utf8').replaceAll('round26','round27').replaceAll('CR26','CR27').replaceAll('REPORT_26','REPORT_27').replace('|25|26)','|25|26|27)'))
}
console.log(JSON.stringify({target,hashedFiles:files.length,productClean:true}))
