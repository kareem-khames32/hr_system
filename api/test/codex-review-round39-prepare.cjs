'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),target='f58f894d5b8d00e7e60605001188eb770dc5b289'
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
assert.equal(git(['rev-parse','HEAD']),target);assert.equal(git(['diff','--name-only',target,'--','api/src','src','docs','api/test']),'')
const files=git(['ls-files','api/src','src','docs','api/test']).split(/\r?\n/).filter(Boolean)
const evidence=path.join(__dirname,'codex-review-round39-scope-evidence.cjs');assert.equal(fs.existsSync(evidence),false)
fs.writeFileSync(evidence,'module.exports = '+JSON.stringify({target,base:'e28c17a',root,files:files.map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')})),environmentCopied:false},null,2)+'\n')
for(const name of ['suite','preload','fixture','support','static','final-audit','download-preload']){
 const destination=path.join(__dirname,`codex-review-round39-${name}.cjs`);assert.equal(fs.existsSync(destination),false)
 fs.writeFileSync(destination,fs.readFileSync(path.join(__dirname,`codex-review-round38-${name}.cjs`),'utf8').replaceAll('round38','round39').replaceAll('CR38','CR39').replaceAll('REPORT_38','REPORT_39').replace('|37|38)','|37|38|39)'))
}
console.log(JSON.stringify({target,hashedFiles:files.length,productClean:true}))
