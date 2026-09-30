'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),snapshot=path.join(__dirname,'codex-review-round22-snapshot')
const target='27741078ee376b8e7b492d3a5d45817e147e8aac'
const git=(args,cwd=root)=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim()
const hash=file=>fs.existsSync(file)?crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'):null
if(!fs.existsSync(snapshot)){git(['clone','--shared','--no-checkout','--quiet',root,snapshot]);git(['checkout','--quiet','--detach',target],snapshot)}
if(git(['rev-parse','HEAD'],snapshot)!==target)throw Error('Incorrect snapshot')
for(const part of ['', 'api']){const destination=path.join(snapshot,part,'node_modules'),source=path.join(root,part,'node_modules');if(!fs.existsSync(destination))fs.symlinkSync(source,destination,'junction');if(fs.realpathSync(destination)!==fs.realpathSync(source))throw Error('Invalid dependency junction')}
for(const suffix of ['suite','fixture','preload'])fs.writeFileSync(path.join(__dirname,`codex-review-round22-${suffix}.cjs`),fs.readFileSync(path.join(__dirname,`codex-review-round21-${suffix}.cjs`),'utf8').replaceAll('round21','round22').replace('|20|21)', '|20|21|22)'))
const product=git(['diff','--name-only','d530d55',target,'--','api/src','src','docs/migrations']).split(/\r?\n/).filter(Boolean)
const evidence=git(['ls-files','api/test/*codex-review-round21*','api/test/org-filter*','CODEX_REVIEW_REPORT_21.md']).split(/\r?\n/).filter(Boolean)
const output={base:'d530d55',target,snapshotHead:target,head:git(['rev-parse','HEAD']),product:product.map(file=>({file,sha256:hash(path.join(snapshot,file))})),originalEvidence:evidence.map(file=>({file,sha256:hash(path.join(root,file))})),baselineStatus:git(['status','--short']),environmentFileCopied:false}
const outputPath=path.join(__dirname,'codex-review-round22-scope-evidence.cjs');if(!fs.existsSync(outputPath))fs.writeFileSync(outputPath,'module.exports = '+JSON.stringify(output,null,2)+'\n')
console.log(JSON.stringify({target,productFiles:product.length,originalEvidence:evidence.length}))
