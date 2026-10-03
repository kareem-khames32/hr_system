'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),target='f7a184e2bdcacecdab025194cf905bb8eb677e58'
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
if(git(['rev-parse','HEAD'])!==target)throw Error('Review target changed')
if(git(['diff','--name-only',target,'--','api/src','src','docs']))throw Error('Product worktree is not clean')
const files=git(['ls-files','api/src','src','docs','api/test']).split(/\r?\n/).filter(Boolean)
const output={target,base:'31cd394',root,baselineStatus:git(['status','--short']),files:files.map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')})),environmentCopied:false}
const evidence=path.join(__dirname,'codex-review-round25-scope-evidence.cjs')
if(!fs.existsSync(evidence))fs.writeFileSync(evidence,'module.exports = '+JSON.stringify(output,null,2)+'\n')
for(const name of ['suite','preload','fixture','final-audit','static']){
 if(fs.existsSync(path.join(__dirname,`codex-review-round25-${name}.cjs`)))continue
 const source=fs.readFileSync(path.join(__dirname,`codex-review-round24-${name}.cjs`),'utf8').replaceAll('round24','round25').replaceAll('CR24','CR25').replaceAll('CODEX_REVIEW_REPORT_24','CODEX_REVIEW_REPORT_25').replace('|23|24)','|23|24|25)')
 fs.writeFileSync(path.join(__dirname,`codex-review-round25-${name}.cjs`),source)
}
console.log(JSON.stringify({target,hashedFiles:files.length,source:root}))
