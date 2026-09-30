'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),snapshot=path.join(__dirname,'codex-review-round21-snapshot')
const target='d530d55fca96593254dc1c08f7257ec9e5c2d1e3'
const git=(args,cwd=root)=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim()
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
if(!fs.existsSync(snapshot)){git(['clone','--shared','--no-checkout','--quiet',root,snapshot]);git(['checkout','--quiet','--detach',target],snapshot)}
if(git(['rev-parse','HEAD'],snapshot)!==target)throw Error('Incorrect snapshot')
for(const part of ['', 'api']){const destination=path.join(snapshot,part,'node_modules'),source=path.join(root,part,'node_modules');if(!fs.existsSync(destination))fs.symlinkSync(source,destination,'junction');if(fs.realpathSync(destination)!==fs.realpathSync(source))throw Error('Invalid dependency junction')}
for(const suffix of ['suite','fixture','preload'])fs.writeFileSync(path.join(__dirname,`codex-review-round21-${suffix}.cjs`),fs.readFileSync(path.join(__dirname,`codex-review-round20-${suffix}.cjs`),'utf8').replaceAll('round20','round21').replace('|19|20)', '|19|20|21)'))
const product=git(['diff','--name-only','512f6bc',target,'--','api/src','src','docs/migrations']).split(/\r?\n/).filter(Boolean)
const evidence=git(['ls-files','api/test/*codex-review-round20*','api/test/org-filter*']).split(/\r?\n/).filter(Boolean)
const output={base:'512f6bc',target,snapshotHead:target,head:git(['rev-parse','HEAD']),product:product.map(file=>({file,sha256:hash(path.join(snapshot,file))})),originalEvidence:evidence.map(file=>({file,sha256:hash(path.join(root,file))})),baselineStatus:git(['status','--short']),environmentFileCopied:false}
const outputPath=path.join(__dirname,'codex-review-round21-scope-evidence.cjs');if(!fs.existsSync(outputPath))fs.writeFileSync(outputPath,'module.exports = '+JSON.stringify(output,null,2)+'\n')
console.log(JSON.stringify({target,productFiles:product.length,originalEvidence:evidence.length}))
