'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),git=args=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim(),target=git(['rev-parse','HEAD'])
assert.equal(target.slice(0,7),'e9c8b9c');assert.equal(git(['diff','--name-only']),'')
assert.equal(git(['diff','--name-only','577b8d7','HEAD','--','api/src','docs/migrations','src/components/positions','src/lib/positions-api.ts','src/app/positions']),'')
const excluded=git(['diff','--name-only','577b8d7','HEAD','--','api/src','src','api/test']).split(/\r?\n/).filter(Boolean)
const files=git(['ls-files']).split(/\r?\n/).filter(Boolean).map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))
const write=(name,value)=>{const p=path.join(__dirname,'codex-review-p3c-'+name);assert.equal(fs.existsSync(p),false);fs.writeFileSync(p,value)}
write('scope-evidence.cjs','module.exports = '+JSON.stringify({target,reviewed:['577b8d7'],excludedAfterTarget:excluded,root,files},null,2)+'\n')
for(const name of ['suite.cjs','fixture.cjs','verify.cjs','preload.cjs','http-preload.cjs','download-preload.cjs','safe-mail-preload.cjs','transport-preload.cjs','static.cjs','units.integration.cjs','positions-fixture.cjs','independent.integration.cjs','controls.integration.cjs','seat-races.integration.cjs','seat-snapshot.integration.cjs','generation.integration.cjs','unit-writes.integration.cjs','isolation.integration.cjs']){
 const body=fs.readFileSync(path.join(__dirname,'codex-review-p3b-'+name),'utf8').replaceAll('codex-review-p3b-','codex-review-p3c-').replaceAll('p3b_','p3c_').replaceAll('P3B','P3C')
 write(name,body)
}
console.log(JSON.stringify({target,trackedFiles:files.length,excludedAfterTarget:excluded}))
