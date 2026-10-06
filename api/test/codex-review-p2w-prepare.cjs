'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),git=args=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim(),target=git(['rev-parse','HEAD'])
assert.equal(target.slice(0,7),'57018ce');assert.equal(git(['diff','--name-only']),'');assert.equal(git(['diff','--name-only','544dc02','HEAD','--','api/src','src','docs/migrations']),'')
const files=git(['ls-files']).split(/\r?\n/).filter(Boolean).map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))
const write=(name,value)=>{const p=path.join(__dirname,'codex-review-p2w-'+name);assert.equal(fs.existsSync(p),false);fs.writeFileSync(p,value)}
write('scope-evidence.cjs','module.exports = '+JSON.stringify({target,reviewed:'544dc02',root,files},null,2)+'\n')
for(const name of ['suite.cjs','fixture.cjs','verify.cjs','preload.cjs','http-preload.cjs','download-preload.cjs','safe-mail-preload.cjs','comments-fixture.cjs','employment-fixture.cjs','static.cjs','units.integration.cjs']){
 const text=fs.readFileSync(path.join(__dirname,'codex-review-p2v-'+name),'utf8').replaceAll('codex-review-p2v-','codex-review-p2w-').replaceAll('p2v_','p2w_').replaceAll('P2V','P2W')
 write(name,text)
}
write('closure.integration.cjs',"'use strict'\nrequire('./codex-review-p2v-payroll-race.integration.cjs')\nrequire('./codex-review-p2v-reason.integration.cjs')\n")
console.log(JSON.stringify({target,reviewed:'544dc02',trackedFiles:files.length}))
