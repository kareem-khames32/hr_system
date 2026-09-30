'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),snapshot=path.join(__dirname,'codex-review-round20-snapshot')
const git=(args,cwd=root)=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim()
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
if(!fs.existsSync(snapshot)){
  git(['clone','--shared','--no-checkout','--quiet',root,snapshot])
  git(['checkout','--quiet','--detach','512f6bcf5537df0f9aeada13e6bc079799603203'],snapshot)
}
if(!git(['rev-parse','HEAD'],snapshot).startsWith('512f6bc'))throw Error('Incorrect snapshot')
for(const part of ['', 'api']){
  const target=path.join(snapshot,part,'node_modules'),source=path.join(root,part,'node_modules')
  if(!fs.existsSync(target))fs.symlinkSync(source,target,'junction')
  if(fs.realpathSync(target)!==fs.realpathSync(source))throw Error('Incorrect dependency junction')
}
let suite=fs.readFileSync(path.join(__dirname,'codex-review-round19-suite.cjs'),'utf8').replaceAll('round19','round20')
suite=suite.replace("const defaults =", "const snapshot=path.join(__dirname,'codex-review-round20-snapshot'),testDir=path.join(snapshot,'api/test')\nfor(const name of fs.readdirSync(__dirname).filter(n=>/^codex-review-round20-.*[.]cjs$/.test(n)&&!/(?:results|scope-evidence|suite|prepare|preload|audit|read-scope)/.test(n)))fs.copyFileSync(path.join(__dirname,name),path.join(testDir,name))\nconst defaults =")
suite=suite.replace("path.join(__dirname, name + '.integration.cjs')","path.join(testDir, name + '.integration.cjs')")
suite=suite.replace("const preloads = [path.join(__dirname, 'codex-review-round5-harness.cjs')]", "const preloads = [path.join(__dirname,'codex-review-round20-preload.cjs'),path.join(testDir, 'codex-review-round5-harness.cjs')]")
suite=suite.replace('|18|19)', '|18|19|20)').replace('new Set([',"new Set(['hiring-documents-migration.integration.cjs','codex-review-round20-migrations.integration.cjs',")
fs.writeFileSync(path.join(__dirname,'codex-review-round20-suite.cjs'),suite)
fs.writeFileSync(path.join(__dirname,'codex-review-round20-fixture.cjs'),fs.readFileSync(path.join(__dirname,'codex-review-round19-fixture.cjs'),'utf8').replaceAll('round19','round20'))
const product=git(['diff','--name-only','d18da83','512f6bc','--','api/src','src','docs/migrations']).split(/\r?\n/)
const originalEvidence=git(['diff','--name-only','d18da83','512f6bc','--','api/test']).split(/\r?\n/)
const output={base:'d18da83',target:'512f6bc',head:git(['rev-parse','HEAD']),snapshotHead:git(['rev-parse','HEAD'],snapshot),product:product.map(file=>({file,sha256:hash(path.join(snapshot,file))})),originalEvidence:originalEvidence.map(file=>({file,sha256:hash(path.join(root,file))})),baselineStatus:git(['status','--short']),environmentFileCopied:false}
const evidence=path.join(__dirname,'codex-review-round20-scope-evidence.cjs')
if(!fs.existsSync(evidence))fs.writeFileSync(evidence,'module.exports = '+JSON.stringify(output,null,2)+'\n')
console.log(JSON.stringify({target:output.target,productFiles:product.length,originalTests:originalEvidence.length,snapshotHead:output.snapshotHead}))
