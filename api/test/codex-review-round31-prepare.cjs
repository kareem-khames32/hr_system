'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),target='f680ac1b08f2fff0c4e32b66fb51cecea1e3d000'
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
assert.equal(git(['rev-parse','HEAD']),target)
assert.equal(git(['diff','--name-only',target,'--','api/src','src','docs','api/test']),'')
const files=git(['ls-files','api/src','src','docs','api/test']).split(/\r?\n/).filter(Boolean)
const evidence=path.join(__dirname,'codex-review-round31-scope-evidence.cjs')
if(!fs.existsSync(evidence))fs.writeFileSync(evidence,'module.exports = '+JSON.stringify({target,base:'5d4c52b',root,files:files.map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')})),environmentCopied:false},null,2)+'\n')
for(const name of ['suite','preload','fixture','support','static','final-audit']){
 const destination=path.join(__dirname,`codex-review-round31-${name}.cjs`)
 if(fs.existsSync(destination))continue
 fs.writeFileSync(destination,fs.readFileSync(path.join(__dirname,`codex-review-round30-${name}.cjs`),'utf8').replaceAll('round30','round31').replaceAll('CR30','CR31').replaceAll('REPORT_30','REPORT_31').replace('|29|30)','|29|30|31)'))
}
// Preserve the original evidence. Isolate each case's day so a successfully protected order cannot win the next case's same-day grant.
const old=fs.readFileSync(path.join(__dirname,'codex-review-round30-holiday-scope.integration.cjs'),'utf8')
const needle=" const e=await f.employee(9000,f.B),bodyA="
assert.equal(old.split(needle).length,2)
const adapted=old.replaceAll('round30','round31').replaceAll('CR30','CR31').replaceAll('r30_','r31_').replace(needle," const day=action==='update'?'2026-07-17':'2026-07-10'\n"+needle)
const destination=path.join(__dirname,'codex-review-round31-holiday-scope.integration.cjs')
if(!fs.existsSync(destination))fs.writeFileSync(destination,adapted)
console.log(JSON.stringify({target,hashedFiles:files.length,productClean:true,adaptation:'one distinct Friday per holiday-order race; original test unchanged'}))
