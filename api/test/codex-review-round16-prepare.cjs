'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),hash=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')
for(const tail of ['suite.cjs','fixture.cjs','preload.cjs','final-audit.cjs']){
  const target=path.join(__dirname,'codex-review-round16-'+tail)
  if(fs.existsSync(target))throw Error('Review artifact already exists')
  let body=fs.readFileSync(path.join(__dirname,'codex-review-round15-'+tail),'utf8').replaceAll('round15','round16').replaceAll('REPORT_15','REPORT_16')
  if(tail==='suite.cjs')body=body.replace('|14|15)', '|14|15|16)')
  if(tail==='final-audit.cjs')body=body.replaceAll('c5ef321','668dc96')
  fs.writeFileSync(target,body)
}
const product=execFileSync('git',['diff','--name-only','c5ef321','668dc96','--','api/src','src','docs/migrations'],{cwd:root,encoding:'utf8'}).trim().split(/\r?\n/)
const originalEvidence=fs.readdirSync(__dirname).filter(f=>/^codex-review-round1[45]-/.test(f)&&fs.statSync(path.join(__dirname,f)).isFile()).map(f=>'api/test/'+f)
originalEvidence.push('CODEX_REVIEW_REPORT_15.md','api/test/leave-type-rules.test.cjs',...['leave-contract','leave-attachment-with-request','leave-sick-pay-attachment','fulltest-leaves-payroll','request-execution','manager-of-direct-manager','administration-level'].map(n=>'api/test/'+n+'.integration.cjs'))
const output={base:'c5ef321',target:'668dc96',head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),product:product.map(file=>({file,sha256:hash(file)})),originalEvidence:originalEvidence.map(file=>({file,sha256:hash(file)})),baselineStatus:execFileSync('git',['status','--short'],{cwd:root,encoding:'utf8'}).trim()}
fs.writeFileSync(path.join(__dirname,'codex-review-round16-scope-evidence.cjs'),'module.exports = '+JSON.stringify(output,null,2)+'\n')
console.log(JSON.stringify({target:output.target,productFiles:product.length,priorEvidenceFiles:originalEvidence.length}))
