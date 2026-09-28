'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),hash=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')
for(const tail of ['suite.cjs','fixture.cjs','preload.cjs','final-audit.cjs']){
  const target=path.join(__dirname,'codex-review-round19-'+tail)
  if(fs.existsSync(target))throw Error('Review artifact already exists')
  let body=fs.readFileSync(path.join(__dirname,'codex-review-round18-'+tail),'utf8').replaceAll('round18','round19').replaceAll('REPORT_18','REPORT_19')
  if(tail==='suite.cjs')body=body.replace('|17|18)', '|17|18|19)').replace('new Set([',"new Set(['codex-review-round18-overtime.integration.cjs',")
  if(tail==='final-audit.cjs')body=body.replaceAll('dfbdd14','899d611').replace("concurrentRunNote:'Round2 performance result changed outside this review selected runs; left untouched. This review did not run or restore it.',",'')
  fs.writeFileSync(target,body)
}
const product=execFileSync('git',['diff','--name-only','dfbdd14','899d611','--','api/src','src','docs/migrations/payroll'],{cwd:root,encoding:'utf8'}).trim().split(/\r?\n/)
const originalEvidence=fs.readdirSync(__dirname).filter(f=>/^codex-review-round18-/.test(f)&&fs.statSync(path.join(__dirname,f)).isFile()).map(f=>'api/test/'+f)
originalEvidence.push('CODEX_REVIEW_REPORT_18.md','api/test/employee-required-fields.test.cjs','api/test/bank-pay-codes.test.cjs',...['overtime-auto-approve-period','national-id-or-passport','employee-bulk-update','overtime-immediate-dispatch','payroll-overtime-request','employee-suspension','user-branch-scopes'].map(n=>'api/test/'+n+'.integration.cjs'))
const output={base:'dfbdd14',target:'899d611',head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),product:product.map(file=>({file,sha256:hash(file)})),originalEvidence:originalEvidence.map(file=>({file,sha256:hash(file)})),baselineStatus:execFileSync('git',['status','--short'],{cwd:root,encoding:'utf8'}).trim()}
fs.writeFileSync(path.join(__dirname,'codex-review-round19-scope-evidence.cjs'),'module.exports = '+JSON.stringify(output,null,2)+'\n')
console.log(JSON.stringify({target:output.target,productFiles:product.length,priorEvidenceFiles:originalEvidence.length}))
