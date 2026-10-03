'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),target='2cb88835c220815488b92911caedd778db61714f'
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
assert.equal(git(['rev-parse','HEAD']),target);assert.equal(git(['diff','--name-only',target,'--','api/src','src','docs','api/test']),'')
const files=git(['ls-files','api/src','src','docs','api/test']).split(/\r?\n/).filter(Boolean)
const evidence=path.join(__dirname,'codex-review-round41-scope-evidence.cjs');assert.equal(fs.existsSync(evidence),false)
fs.writeFileSync(evidence,'module.exports = '+JSON.stringify({target,base:'ecf4846',root,files:files.map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')})),environmentCopied:false},null,2)+'\n')
for(const name of ['suite','preload','fixture','support','static','final-audit','download-preload']){
 const destination=path.join(__dirname,`codex-review-round41-${name}.cjs`);assert.equal(fs.existsSync(destination),false)
 fs.writeFileSync(destination,fs.readFileSync(path.join(__dirname,`codex-review-round40-${name}.cjs`),'utf8').replaceAll('round40','round41').replaceAll('CR40','CR41').replaceAll('REPORT_40','REPORT_41').replace('|39|40)','|39|40|41)'))
}
console.log(JSON.stringify({target,hashedFiles:files.length,productClean:true}))
