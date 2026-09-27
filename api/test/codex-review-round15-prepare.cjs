'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),hash=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')
for(const tail of ['suite.cjs','fixture.cjs','preload.cjs','final-audit.cjs']){
  const target=path.join(__dirname,'codex-review-round15-'+tail)
  if(fs.existsSync(target))throw Error('Review artifact already exists')
  let body=fs.readFileSync(path.join(__dirname,'codex-review-round14-'+tail),'utf8').replaceAll('round14','round15').replaceAll('REPORT_14','REPORT_15')
  if(tail==='suite.cjs')body=body.replace('|13|14)', '|13|14|15)')
  if(tail==='final-audit.cjs')body=body.replaceAll('9b55ecc','c5ef321')
  fs.writeFileSync(target,body)
}
const product=execFileSync('git',['diff','--name-only','9b55ecc','c5ef321','--','api/src','src','docs/migrations'],{cwd:root,encoding:'utf8'}).trim().split(/\r?\n/)
const originalEvidence=fs.readdirSync(__dirname).filter(f=>/^codex-review-round1[34]-/.test(f)&&fs.statSync(path.join(__dirname,f)).isFile()).map(f=>'api/test/'+f)
originalEvidence.push('CODEX_REVIEW_REPORT_14.md',...['manager-of-direct-manager','administration-level','approval-chain-branch-copy','request-category-chains','leave-contract','request-execution'].map(n=>'api/test/'+n+'.integration.cjs'))
const output={base:'9b55ecc',target:'c5ef321',head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),product:product.map(file=>({file,sha256:hash(file)})),originalEvidence:originalEvidence.map(file=>({file,sha256:hash(file)})),baselineStatus:execFileSync('git',['status','--short'],{cwd:root,encoding:'utf8'}).trim()}
fs.writeFileSync(path.join(__dirname,'codex-review-round15-scope-evidence.cjs'),'module.exports = '+JSON.stringify(output,null,2)+'\n')
console.log(JSON.stringify({target:output.target,productFiles:product.length,priorEvidenceFiles:originalEvidence.length}))
