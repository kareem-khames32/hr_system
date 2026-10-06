'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),target='2c7b350d97abce534b56f5d25e1cc603230b4c36'
const git=args=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
assert.equal(git(['rev-parse','HEAD']),target);assert.equal(git(['diff','--name-only']),'')
assert.equal(git(['diff','--name-only','1588d39',target,'--','api/src','src','docs/migrations']),'')
const files=git(['ls-files']).split(/\r?\n/).filter(Boolean).map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))
function write(name,text){const dest=path.join(__dirname,'codex-review-p2t-'+name);assert.equal(fs.existsSync(dest),false);fs.writeFileSync(dest,text)}
write('scope-evidence.cjs','module.exports = '+JSON.stringify({target,root,reviewed:['a66d0c9','1588d39'],files},null,2)+'\n')
for(const name of ['suite.cjs','fixture.cjs','static.cjs','verify.cjs','preload.cjs','download-preload.cjs','http-preload.cjs','regression-preload.cjs','renderer-preload.cjs','comments-fixture.cjs']){
 let text=fs.readFileSync(path.join(__dirname,'codex-review-p2s-'+name),'utf8').replaceAll('codex-review-p2s-','codex-review-p2t-').replaceAll('p2s_','p2t_').replaceAll('P2S','P2T')
 if(name==='suite.cjs')text=text.replace("const files = selected.map", "reviewedTemporaryMigrations.add('employee-custom-fields-migration.integration.cjs')\nconst files = selected.map")
 write(name,text)
}
write('units.integration.cjs',"'use strict'\n"+['request-audience-conditions','request-audience-conditions-ui','employee-custom-fields','employee-custom-fields-ui','request-audience','payroll-bonuses-ui','routes-guards','schema-readiness'].filter(n=>fs.existsSync(path.join(__dirname,n+'.test.cjs'))).map(n=>`require('./${n}.test.cjs')`).join('\n')+'\n')
console.log(JSON.stringify({target,trackedFiles:files.length}))
