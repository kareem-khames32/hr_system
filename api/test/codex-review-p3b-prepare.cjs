'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),git=args=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim(),target=git(['rev-parse','HEAD'])
assert.equal(target.slice(0,7),'ef4e894');assert.equal(git(['diff','--name-only']),'');assert.equal(git(['diff','--name-only','4d88d36','HEAD','--','api/src','src','api/test','docs/migrations']),'')
const files=git(['ls-files']).split(/\r?\n/).filter(Boolean).map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))
const write=(name,value)=>{const p=path.join(__dirname,'codex-review-p3b-'+name);assert.equal(fs.existsSync(p),false);fs.writeFileSync(p,value)}
write('scope-evidence.cjs','module.exports = '+JSON.stringify({target,reviewed:['4d88d36'],root,files},null,2)+'\n')
for(const name of ['suite.cjs','fixture.cjs','verify.cjs','preload.cjs','http-preload.cjs','download-preload.cjs','safe-mail-preload.cjs','transport-preload.cjs','static.cjs','units.integration.cjs','positions-fixture.cjs','independent.integration.cjs','controls.integration.cjs','seat-races.integration.cjs','seat-snapshot.integration.cjs']){
 let body=fs.readFileSync(path.join(__dirname,'codex-review-p3a-'+name),'utf8').replaceAll('codex-review-p3a-','codex-review-p3b-').replaceAll('p3a_','p3b_').replaceAll('P3A','P3B')
 if(name==='verify.cjs')body=body.replace(" for(const db of require('./codex-review-p3b-run-notes.cjs').additionalObservedDatabases)databases.add(db)\n",'')
 write(name,body)
}
console.log(JSON.stringify({target,trackedFiles:files.length}))
