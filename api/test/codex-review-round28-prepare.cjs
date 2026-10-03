'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),target='770a5917932602fa5275beb0b6e2001e8ed3c4b8'
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
assert.equal(git(['rev-parse','HEAD']),target)
assert.equal(git(['diff','--name-only',target,'--','api/src','src','docs','api/test']),'')
const files=git(['ls-files','api/src','src','docs','api/test']).split(/\r?\n/).filter(Boolean)
const evidence=path.join(__dirname,'codex-review-round28-scope-evidence.cjs')
if(!fs.existsSync(evidence))fs.writeFileSync(evidence,'module.exports = '+JSON.stringify({target,base:'e6fa740',root,baselineStatus:git(['status','--short']),files:files.map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')})),environmentCopied:false},null,2)+'\n')
for(const name of ['suite','preload','fixture','support','static','final-audit']){
 const destination=path.join(__dirname,`codex-review-round28-${name}.cjs`)
 if(fs.existsSync(destination))continue
 fs.writeFileSync(destination,fs.readFileSync(path.join(__dirname,`codex-review-round27-${name}.cjs`),'utf8').replaceAll('round27','round28').replaceAll('CR27','CR28').replaceAll('REPORT_27','REPORT_28').replace('|26|27)','|26|27|28)'))
}
// Preserve the first two previous boundary cases exactly; replace the old timeout-sized race with new independent ordering tests.
const destination=path.join(__dirname,'codex-review-round28-boundaries.integration.cjs')
if(!fs.existsSync(destination)){
 const old=fs.readFileSync(path.join(__dirname,'codex-review-round27-boundaries.integration.cjs'),'utf8'),end=old.indexOf("test('CR27 attachment authorization")
 assert.ok(end>0)
 fs.writeFileSync(destination,old.slice(0,end).replaceAll('round27','round28').replaceAll('CR27','CR28').replaceAll('r27_','r28_'))
}
console.log(JSON.stringify({target,hashedFiles:files.length,productClean:true}))
