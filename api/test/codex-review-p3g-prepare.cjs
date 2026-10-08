'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),git=args=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim(),target=git(['rev-parse','HEAD'])
assert.equal(target.slice(0,7),'f0983df');assert.equal(git(['diff','--name-only']),'')
const files=git(['ls-files']).split(/\r?\n/).filter(Boolean).map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))
const write=(name,value)=>{const p=path.join(__dirname,'codex-review-p3g-'+name);assert.equal(fs.existsSync(p),false);fs.writeFileSync(p,value)}
write('scope-evidence.cjs','module.exports = '+JSON.stringify({target,reviewed:['0bda600..f0983df'],root,files},null,2)+'\n')
for(const name of ['suite.cjs','fixture.cjs','verify.cjs','preload.cjs','http-preload.cjs','download-preload.cjs','safe-mail-preload.cjs','transport-preload.cjs','static.cjs','auth-independent.integration.cjs','data-independent.integration.cjs','documents.integration.cjs','units.integration.cjs','auth-races.integration.cjs','report-controls.integration.cjs','session-boundary.integration.cjs','version-writers.integration.cjs']){
 const body=fs.readFileSync(path.join(__dirname,'codex-review-p3f-'+name),'utf8').replaceAll('codex-review-p3f-','codex-review-p3g-').replaceAll('p3f_','p3g_').replaceAll('P3F','P3G')
 write(name,body)
}
console.log(JSON.stringify({target,trackedFiles:files.length}))
