'use strict'
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),target=cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()
assert.ok(target.startsWith('6f5964c'));assert.equal(cp.execFileSync('git',['diff','--name-only','HEAD'],{cwd:root,encoding:'utf8'}).trim(),'')
const files=cp.execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean).map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))
fs.writeFileSync(path.join(__dirname,'codex-review-p4a-scope-evidence.cjs'),'module.exports = '+JSON.stringify({target,base:'456e544',files},null,2)+'\n')
for(const name of ['suite','fixture','verify','preload','http-preload','download-preload','safe-mail-preload','transport-preload','static','helpers']){
 const dest=path.join(__dirname,'codex-review-p4a-'+name+'.cjs');assert.equal(fs.existsSync(dest),false)
 let s=fs.readFileSync(path.join(__dirname,'codex-review-p3m-'+name+'.cjs'),'utf8').replaceAll('codex-review-p3m-','codex-review-p4a-').replaceAll('p3m_','p4a_').replaceAll('P3M','P4A')
 if(name==='suite')s=s.replace('const files = selected.map',"for(const name of ['legal-entities','legal-entities-migration','statutory-pack','statutory-migration','salary-items','eg-salary-tax','payroll-statutory','eos-country','overtime-legal-minimum','leave-entitlement-tiers','suspension-paid','penalty-fine-cap','resignation-legal-terms','saudization-report','banks','hijri-display','employee-privacy','data-protection']) reviewedTemporaryMigrations.add(name+'.integration.cjs')\nconst files = selected.map")
 fs.writeFileSync(dest,s)
}
console.log(JSON.stringify({target,tracked:files.length}))
