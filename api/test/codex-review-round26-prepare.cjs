'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),target='84f26e8ecf9f1bf311169a14561a22d8c2f5a3b2'
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
assert.equal(git(['rev-parse','HEAD']),target)
assert.equal(git(['diff','--name-only',target,'--','api/src','src','docs','api/test']),'')
const files=git(['ls-files','api/src','src','docs','api/test']).split(/\r?\n/).filter(Boolean)
const evidence=path.join(__dirname,'codex-review-round26-scope-evidence.cjs')
if(!fs.existsSync(evidence))fs.writeFileSync(evidence,'module.exports = '+JSON.stringify({target,base:'f7a184e',root,baselineStatus:git(['status','--short']),files:files.map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')})),environmentCopied:false},null,2)+'\n')
for(const name of ['suite','preload','fixture','support','static']){
 const destination=path.join(__dirname,`codex-review-round26-${name}.cjs`)
 if(fs.existsSync(destination))continue
 const source=fs.readFileSync(path.join(__dirname,`codex-review-round25-${name}.cjs`),'utf8').replaceAll('round25','round26').replaceAll('CR25','CR26').replace('|24|25)','|24|25|26)')
 fs.writeFileSync(destination,source)
}
console.log(JSON.stringify({target,hashedFiles:files.length,productClean:true}))
