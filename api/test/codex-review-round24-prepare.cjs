'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),target='31cd394d6bb0abe98244ee409baef3f6c3db6d96'
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
if(git(['rev-parse','HEAD'])!==target)throw Error('Review target changed')
if(git(['diff','--name-only',target,'--','api/src','src','docs']))throw Error('Product worktree is not clean')
const files=git(['ls-files','api/src','src','docs','api/test']).split(/\r?\n/).filter(Boolean)
const output={target,base:'7332f1e',root,baselineStatus:git(['status','--short']),files:files.map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')})),environmentCopied:false}
const evidence=path.join(__dirname,'codex-review-round24-scope-evidence.cjs')
if(!fs.existsSync(evidence))fs.writeFileSync(evidence,'module.exports = '+JSON.stringify(output,null,2)+'\n')
for(const name of ['suite','preload','fixture','final-audit']){
 let source=fs.readFileSync(path.join(__dirname,`codex-review-round23-${name}.cjs`),'utf8').replaceAll('round23','round24').replaceAll('CR23','CR24').replaceAll('CODEX_REVIEW_REPORT_23','CODEX_REVIEW_REPORT_24').replace('|22|23)','|22|23|24)')
 if(name==='suite') source=source.replace("stream.on('test:pass'", "stream.on('test:stderr', d => { stdout.push(redact(d.message)); console.log(redact(d.message)) })\nstream.on('test:pass'")
 fs.writeFileSync(path.join(__dirname,`codex-review-round24-${name}.cjs`),source)
}
console.log(JSON.stringify({target,hashedFiles:files.length,source:root}))
