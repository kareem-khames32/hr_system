'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),target='622ed57b19c82ec6e9e87d9546aef3dc260c4e7b'
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
assert.equal(git(['rev-parse','HEAD']),target);assert.equal(git(['diff','--name-only',target]),'')
const files=git(['ls-files','api/src','api/scripts','src','docs','api/test']).split(/\r?\n/).filter(Boolean)
const evidence=path.join(__dirname,'codex-review-p1-scope-evidence.cjs');assert.equal(fs.existsSync(evidence),false)
fs.writeFileSync(evidence,'module.exports = '+JSON.stringify({target,base:'ce15142',root,files:files.map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')})),environmentCopied:false},null,2)+'\n')
for(const name of ['suite','preload','fixture','support','static','download-preload']){
 const destination=path.join(__dirname,`codex-review-p1-${name}.cjs`);assert.equal(fs.existsSync(destination),false)
 let source=fs.readFileSync(path.join(__dirname,`codex-review-round42-${name}.cjs`),'utf8').replaceAll('round42','p1').replaceAll('CR42','CRP1').replaceAll('REPORT_42','REPORT_P1')
 if(name==='suite'){
  source=source.replace("const files = selected.map", "for(const name of ['modules-enforcement','modules-migration','modules-settings','login-security-migration','scheduled-jobs','statutory-migration','payment-changes-migration','loan-disbursement-migration','settlement-payment-migration','gosi-tracks','one-person-controls','loan-disbursement','settlement-payment','settlement-pending-obligations']) reviewedTemporaryMigrations.add(name+'.integration.cjs')\nconst files = selected.map")
  source=source.replace('|41|42)', '|41|42|P1)')
 }
 fs.writeFileSync(destination,source)
}
console.log(JSON.stringify({target,hashedFiles:files.length,productClean:true}))
