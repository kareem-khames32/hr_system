'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),target='1ca474c9c4f3dd8413955eb14e876f665d360c92',git=a=>execFileSync('git',a,{cwd:root,encoding:'utf8'}).trim()
assert.equal(git(['rev-parse','HEAD']),target);assert.equal(git(['diff','--name-only',target]),'')
const hash=file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')})
const files=git(['ls-files','api/src','api/scripts','src','docs','api/test']).split(/\r?\n/).filter(Boolean),preexisting=git(['ls-files','--others','--exclude-standard']).split(/\r?\n/).filter(n=>n&&!n.includes('codex-review-p2b-'))
const destination=path.join(__dirname,'codex-review-p2b-scope-evidence.cjs');assert.equal(fs.existsSync(destination),false)
fs.writeFileSync(destination,'module.exports = '+JSON.stringify({target,root,files:files.map(hash),preexisting:preexisting.map(hash),reviews:{A:['0f93925','658e15f'],B:['658e15f','73d5643'],C:['73d5643','1ca474c']}},null,2)+'\n')
for(const name of ['suite','fixture','support','static','download-preload']){
 const dest=path.join(__dirname,`codex-review-p2b-${name}.cjs`);assert.equal(fs.existsSync(dest),false)
 let s=fs.readFileSync(path.join(__dirname,`codex-review-p2a-${name}.cjs`),'utf8').replaceAll('codex-review-p2a-','codex-review-p2b-')
 if(name==='suite')s=s.replace('const files = selected.map',"for(const n of ['codex-review-p2b-one-person-a','codex-review-p2b-money','payroll-live','payroll-daily-accrual','payroll-performance','attendance-live-absences']) reviewedTemporaryMigrations.add(n+'.integration.cjs')\nconst files = selected.map")
 fs.writeFileSync(dest,s)
}
for(const [from,to] of [['codex-review-p2a-independent','codex-review-p2b-closure'],['codex-review-p1r-invariance','codex-review-p2b-leavers'],['codex-review-p2a-money','codex-review-p2b-money']]){
 let s=fs.readFileSync(path.join(__dirname,from+'.integration.cjs'),'utf8').replaceAll('codex-review-p2a-','codex-review-p2b-').replaceAll('codex-review-p1r-','codex-review-p2b-')
 fs.writeFileSync(path.join(__dirname,to+'.integration.cjs'),s)
}
fs.writeFileSync(path.join(__dirname,'codex-review-p2b-one-person-a.integration.cjs'),execFileSync('git',['show','658e15f:api/test/one-person-controls.integration.cjs'],{cwd:root,encoding:'utf8'}))
console.log(JSON.stringify({target,files:files.length,preexisting}))
