'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),hash=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')
for(const tail of ['suite.cjs','fixture.cjs','preload.cjs','final-audit.cjs']){
  const target=path.join(__dirname,'codex-review-round17-'+tail)
  if(fs.existsSync(target))throw Error('Review artifact already exists')
  let body=fs.readFileSync(path.join(__dirname,'codex-review-round16-'+tail),'utf8').replaceAll('round16','round17').replaceAll('REPORT_16','REPORT_17')
  if(tail==='suite.cjs')body=body.replace('|15|16)', '|15|16|17)').replace("new Set([", "new Set(['overtime-auto-approve-period.integration.cjs','codex-review-round17-overtime.integration.cjs',")
  if(tail==='final-audit.cjs')body=body.replaceAll('668dc96','5eb8394')
  fs.writeFileSync(target,body)
}
const product=execFileSync('git',['diff','--name-only','d6bbe5b','5eb8394','--','api/src','src','docs/migrations/payroll'],{cwd:root,encoding:'utf8'}).trim().split(/\r?\n/)
const originalEvidence=fs.readdirSync(__dirname).filter(f=>/^codex-review-round1[56]-/.test(f)&&fs.statSync(path.join(__dirname,f)).isFile()).map(f=>'api/test/'+f)
originalEvidence.push('CODEX_REVIEW_REPORT_16.md',...['overtime-auto-approve-period','national-id-or-passport'].map(n=>'api/test/'+n+'.integration.cjs'))
const output={base:'d6bbe5b',target:'5eb8394',head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),product:product.map(file=>({file,sha256:hash(file)})),originalEvidence:originalEvidence.map(file=>({file,sha256:hash(file)})),baselineStatus:execFileSync('git',['status','--short'],{cwd:root,encoding:'utf8'}).trim()}
fs.writeFileSync(path.join(__dirname,'codex-review-round17-scope-evidence.cjs'),'module.exports = '+JSON.stringify(output,null,2)+'\n')
console.log(JSON.stringify({target:output.target,productFiles:product.length,priorEvidenceFiles:originalEvidence.length}))
