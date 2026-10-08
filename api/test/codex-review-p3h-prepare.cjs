'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),git=args=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim(),target=git(['rev-parse','HEAD'])
assert.equal(target.slice(0,7),'b53a011');assert.equal(git(['diff','--name-only']),'')
const files=git(['ls-files']).split(/\r?\n/).filter(Boolean).map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))
const write=(name,value)=>{const p=path.join(__dirname,'codex-review-p3h-'+name);assert.equal(fs.existsSync(p),false);fs.writeFileSync(p,value)}
write('scope-evidence.cjs','module.exports = '+JSON.stringify({target,reviewed:['204bed7..b53a011'],root,files},null,2)+'\n')
for(const name of ['suite.cjs','fixture.cjs','verify.cjs','preload.cjs','http-preload.cjs','download-preload.cjs','safe-mail-preload.cjs','transport-preload.cjs','static.cjs','auth-independent.integration.cjs','data-independent.integration.cjs','documents.integration.cjs','units.integration.cjs','auth-races.integration.cjs','report-controls.integration.cjs','session-boundary.integration.cjs','version-writers.integration.cjs','password-race.integration.cjs','account-role-concurrency.integration.cjs','factor-paths.integration.cjs']){
 const body=fs.readFileSync(path.join(__dirname,'codex-review-p3g-'+name),'utf8').replaceAll('codex-review-p3g-','codex-review-p3h-').replaceAll('p3g_','p3h_').replaceAll('P3G','P3H')
 write(name,body)
}
console.log(JSON.stringify({target,trackedFiles:files.length}))
