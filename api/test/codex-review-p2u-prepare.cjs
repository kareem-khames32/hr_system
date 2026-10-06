'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),git=args=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim(),target=git(['rev-parse','HEAD'])
assert.equal(target.slice(0,7),'32a2034');assert.equal(git(['diff','--name-only']),'')
assert.equal(git(['diff','--name-only','ecf6163','HEAD','--','api/src','src','docs/migrations']),'')
const files=git(['ls-files']).split(/\r?\n/).filter(Boolean).map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))
const write=(name,value)=>{const p=path.join(__dirname,'codex-review-p2u-'+name);assert.equal(fs.existsSync(p),false);fs.writeFileSync(p,value)}
write('scope-evidence.cjs','module.exports = '+JSON.stringify({target,reviewed:'ecf6163',root,files},null,2)+'\n')
for(const name of ['suite.cjs','fixture.cjs','verify.cjs','preload.cjs','http-preload.cjs','regression-preload.cjs','comments-fixture.cjs','independent.integration.cjs','concurrency.integration.cjs','migration-shape.integration.cjs','units.integration.cjs','auditor-units.integration.cjs']){
 let text=fs.readFileSync(path.join(__dirname,'codex-review-p2t-'+name),'utf8').replaceAll('codex-review-p2t-','codex-review-p2u-').replaceAll('p2t_','p2u_').replaceAll('P2T','P2U')
 if(name==='suite.cjs')text=text.replace("const files = selected.map","reviewedTemporaryMigrations.add('codex-review-p2u-migration-extra.integration.cjs')\nconst files = selected.map")
 if(name==='auditor-units.integration.cjs')text=text.replace("const exact=source.slice(start,end),script=", "const helper=source.split(/\\r?\\n/).find(line=>line.startsWith('const customCondOf ='));assert.ok(helper);\n const exact=source.slice(start,end),script=").replace("const React=require('react');const customFields", "${helper}\nconst React=require('react');const customFields")
 write(name,text)
}
console.log(JSON.stringify({target,reviewed:'ecf6163',trackedFiles:files.length}))
