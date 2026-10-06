'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),target='64f3f55baeb9d1e93426755024dd81495499dda6'
const git=args=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
assert.equal(git(['rev-parse','HEAD']),target);assert.equal(git(['diff','--name-only']),'')
assert.equal(git(['diff','--name-only','6288e78',target,'--','api/src','src','docs/migrations']),'')
const files=git(['ls-files']).split(/\r?\n/).filter(Boolean).map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))
function write(name,text){const dest=path.join(__dirname,'codex-review-p2o-'+name);assert.equal(fs.existsSync(dest),false);fs.writeFileSync(dest,text)}
write('scope-evidence.cjs','module.exports = '+JSON.stringify({target,root,files},null,2)+'\n')
for(const name of ['suite.cjs','fixture.cjs','document-fixture.cjs','static.cjs','verify.cjs','preload.cjs','download-preload.cjs','http-preload.cjs','regression-preload.cjs','renderer-preload.cjs','streams.integration.cjs','independent.integration.cjs','concurrency.integration.cjs','second-process.cjs','units.integration.cjs','schema-cache.integration.cjs']){
 let text=fs.readFileSync(path.join(__dirname,'codex-review-p2n-'+name),'utf8').replaceAll('codex-review-p2n-','codex-review-p2o-').replaceAll('p2n_','p2o_').replaceAll('P2N','P2O')
 if(name==='schema-cache.integration.cjs')text=text.replace("  assert.equal(await rules.documentAckSchemaReady(f.ds.manager),false,'Application A still has its legitimate pre-migration negative cache')", "  // Do not recheck or reset here: the real task endpoints must discover migration B applied.\n")
 if(name==='suite.cjs')text=text.replace("const files = selected.map", "reviewedTemporaryMigrations.add('codex-review-p2o-migration-races.integration.cjs')\nconst files = selected.map")
 if(name==='units.integration.cjs')text+='\nrequire(\'./schema-readiness.test.cjs\')\n'
 write(name,text)
}
console.log(JSON.stringify({target,trackedFiles:files.length}))
