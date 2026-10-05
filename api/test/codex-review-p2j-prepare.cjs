'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),target='81d0e17c04ea0c44ef28b9449e94a97482f0000b'
const git=args=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
assert.equal(git(['rev-parse','HEAD']),target);assert.equal(git(['diff','--name-only']),'')
assert.equal(git(['diff','--name-only','eb09736',target,'--','api/src','src','docs/migrations']),'')
const files=git(['ls-files']).split(/\r?\n/).filter(Boolean).map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))
function write(name,text){const dest=path.join(__dirname,'codex-review-p2j-'+name);assert.equal(fs.existsSync(dest),false);fs.writeFileSync(dest,text)}
write('scope-evidence.cjs','module.exports = '+JSON.stringify({target,root,files},null,2)+'\n')
for(const name of ['suite.cjs','fixture.cjs','static.cjs','verify.cjs','preload.cjs','download-preload.cjs','closure.integration.cjs','independent.integration.cjs','decision-race.integration.cjs','units.integration.cjs']){
 const text=fs.readFileSync(path.join(__dirname,'codex-review-p2i-'+name),'utf8').replaceAll('codex-review-p2i-','codex-review-p2j-').replaceAll('p2i_','p2j_').replaceAll('P2I','P2J')
 write(name,text)
}
console.log(JSON.stringify({target,trackedFiles:files.length}))
