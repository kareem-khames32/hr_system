'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),hash=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')
for(const tail of ['suite.cjs','fixture.cjs','preload.cjs','final-audit.cjs']){
  const target=path.join(__dirname,'codex-review-round18-'+tail)
  if(fs.existsSync(target))throw Error('Review artifact already exists')
  let body=fs.readFileSync(path.join(__dirname,'codex-review-round17-'+tail),'utf8').replaceAll('round17','round18').replaceAll('REPORT_17','REPORT_18')
  if(tail==='suite.cjs')body=body.replace('|16|17)', '|16|17|18)').replace('new Set([',"new Set(['codex-review-round17-overtime.integration.cjs',")
  if(tail==='final-audit.cjs')body=body.replaceAll('5eb8394','dfbdd14')
  fs.writeFileSync(target,body)
}
const product=execFileSync('git',['diff','--name-only','5eb8394','dfbdd14','--','api/src','src','docs/migrations/payroll'],{cwd:root,encoding:'utf8'}).trim().split(/\r?\n/)
const originalEvidence=fs.readdirSync(__dirname).filter(f=>/^codex-review-round17-/.test(f)&&fs.statSync(path.join(__dirname,f)).isFile()).map(f=>'api/test/'+f)
originalEvidence.push('CODEX_REVIEW_REPORT_17.md','api/test/employee-required-fields.test.cjs',...['overtime-auto-approve-period','national-id-or-passport','employee-bulk-update','overtime-immediate-dispatch','payroll-overtime-request','employee-suspension'].map(n=>'api/test/'+n+'.integration.cjs'))
const output={base:'5eb8394',target:'dfbdd14',head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),product:product.map(file=>({file,sha256:hash(file)})),originalEvidence:originalEvidence.map(file=>({file,sha256:hash(file)})),baselineStatus:execFileSync('git',['status','--short'],{cwd:root,encoding:'utf8'}).trim()}
fs.writeFileSync(path.join(__dirname,'codex-review-round18-scope-evidence.cjs'),'module.exports = '+JSON.stringify(output,null,2)+'\n')
console.log(JSON.stringify({target:output.target,productFiles:product.length,priorEvidenceFiles:originalEvidence.length}))
