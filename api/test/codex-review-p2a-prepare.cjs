'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),target='0f93925b2b1c6ed4e2768bdfb10fa992b204e957'
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
assert.equal(git(['rev-parse','HEAD']),target);assert.equal(git(['diff','--name-only',target]),'')
const files=git(['ls-files','api/src','api/scripts','src','docs','api/test']).split(/\r?\n/).filter(Boolean)
const existing=git(['ls-files','--others','--exclude-standard']).split(/\r?\n/).filter(f=>f&&!f.includes('codex-review-p2a-'))
const hash=file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')})
const evidence=path.join(__dirname,'codex-review-p2a-scope-evidence.cjs');assert.equal(fs.existsSync(evidence),false)
fs.writeFileSync(evidence,'module.exports = '+JSON.stringify({target,base:'c6b3c57',root,files:files.map(hash),preexisting:existing.map(hash)},null,2)+'\n')
for(const name of ['suite','preload','fixture','support','static']){
 const destination=path.join(__dirname,`codex-review-p2a-${name}.cjs`);assert.equal(fs.existsSync(destination),false)
 let source=fs.readFileSync(path.join(__dirname,`codex-review-p1-${name}.cjs`),'utf8').replaceAll('codex-review-p1-','codex-review-p2a-')
 if(name==='suite')source=source.replace('const files = selected.map',"for(const name of ['audit-log-migration','stored-file-sha256-migration','queue-outbox-migration','codex-review-p2a-migrations']) reviewedTemporaryMigrations.add(name+'.integration.cjs')\nconst files = selected.map")
 if(name==='fixture')source=source.replace("NODE_ENV: 'test', JWT_SECRET:","NODE_ENV: 'test', QUEUE_WORKER: 'off', UPLOADS_ROOT: path.join(__dirname,'codex-review-p2a-tmp','independent-uploads'), JWT_SECRET:")
 fs.writeFileSync(destination,source)
}
console.log(JSON.stringify({target,hashedFiles:files.length,preservedFiles:existing,productClean:true}))
