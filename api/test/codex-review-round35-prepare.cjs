'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),target='21c07f3b6854d0ebd18ef451d76bdd6a10661397'
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
assert.equal(git(['rev-parse','HEAD']),target)
assert.equal(git(['diff','--name-only',target,'--','api/src','src','docs','api/test']),'')
const files=git(['ls-files','api/src','src','docs','api/test']).split(/\r?\n/).filter(Boolean)
const evidence=path.join(__dirname,'codex-review-round35-scope-evidence.cjs')
if(!fs.existsSync(evidence))fs.writeFileSync(evidence,'module.exports = '+JSON.stringify({target,base:'622b637',root,files:files.map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')})),environmentCopied:false},null,2)+'\n')
for(const name of ['suite','preload','fixture','support','static','final-audit']){
 const destination=path.join(__dirname,`codex-review-round35-${name}.cjs`)
 if(fs.existsSync(destination))continue
 fs.writeFileSync(destination,fs.readFileSync(path.join(__dirname,`codex-review-round34-${name}.cjs`),'utf8').replaceAll('round34','round35').replaceAll('CR34','CR35').replaceAll('REPORT_34','REPORT_35').replace('|33|34)','|33|34|35)'))
}
console.log(JSON.stringify({target,hashedFiles:files.length,productClean:true}))
