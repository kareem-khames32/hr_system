'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),target='7332f1e171f8f3e3f0a71f0acac558cdb73ef0d3'
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')
if(git(['rev-parse','HEAD'])!==target)throw Error('Review target changed')
if(git(['diff','--name-only',target,'--','api/src','src','docs']))throw Error('Product worktree is not clean')
let suite=fs.readFileSync(path.join(__dirname,'codex-review-round22-suite.cjs'),'utf8').replaceAll('round22','round23').replace('|21|22)', '|21|22|23)')
suite=suite.replace("const snapshot=path.join(__dirname,'codex-review-round23-snapshot'),testDir=path.join(snapshot,'api/test')",'const testDir=__dirname')
suite=suite.split('\n').filter(line=>!line.startsWith('for(const name of fs.readdirSync(__dirname)')).join('\n')
suite=suite.replace('preloads.push(path.join(__dirname, process.env.REVIEW_PRELOAD))','preloads.splice(1,0,path.join(__dirname, process.env.REVIEW_PRELOAD))')
fs.writeFileSync(path.join(__dirname,'codex-review-round23-suite.cjs'),suite)
fs.writeFileSync(path.join(__dirname,'codex-review-round23-fixture.cjs'),fs.readFileSync(path.join(__dirname,'codex-review-round22-fixture.cjs'),'utf8'))
const files=git(['ls-files','api/src','src','docs','api/test']).split(/\r?\n/).filter(Boolean)
const output={target,base:'162d50e',root,baselineStatus:git(['status','--short']),files:files.map(file=>({file,sha256:hash(file)})),environmentCopied:false}
const evidence=path.join(__dirname,'codex-review-round23-scope-evidence.cjs')
if(!fs.existsSync(evidence))fs.writeFileSync(evidence,'module.exports = '+JSON.stringify(output,null,2)+'\n')
console.log(JSON.stringify({target,hashedFiles:files.length,source:root}))
