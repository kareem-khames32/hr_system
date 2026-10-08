'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),git=args=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim(),target=git(['rev-parse','HEAD'])
assert.equal(target.slice(0,7),'25df8dc');assert.equal(git(['diff','--name-only']),'')
const files=git(['ls-files']).split(/\r?\n/).filter(Boolean).map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))
const write=(name,value)=>{const p=path.join(__dirname,'codex-review-p3i-'+name);assert.equal(fs.existsSync(p),false);fs.writeFileSync(p,value)}
write('scope-evidence.cjs','module.exports = '+JSON.stringify({target,reviewed:['706fcbe..25df8dc'],root,files},null,2)+'\n')
for(const name of ['suite.cjs','fixture.cjs','verify.cjs','preload.cjs','http-preload.cjs','download-preload.cjs','safe-mail-preload.cjs','transport-preload.cjs','static.cjs','auth-independent.integration.cjs','units.integration.cjs','auth-races.integration.cjs','session-boundary.integration.cjs','password-race.integration.cjs','account-role-concurrency.integration.cjs','factor-paths.integration.cjs','unseeded-role.integration.cjs','permission-races.integration.cjs','domain-rebinding.integration.cjs','fix-controls.integration.cjs']){
 let body=fs.readFileSync(path.join(__dirname,'codex-review-p3h-'+name),'utf8').replaceAll('codex-review-p3h-','codex-review-p3i-').replaceAll('p3h_','p3i_').replaceAll('P3H','P3I')
 if(name==='unseeded-role.integration.cjs'){
  body=body.replace("const proto=require('typeorm').Repository.prototype,original=proto.findOne;", "const proto=f.app.get(require('../src/auth/users.controller').UsersController),original=proto.roleStamp;")
  body=body.replace(/proto\.findOne=async function\(options\)\{[^\n]+/,"proto.roleStamp=async function(code,em){const stamp=await original.call(this,code,em);if(code==='employee'&&em&&!once){once=true;assert.equal(stamp,'PRESET');enter();await resume}return stamp}")
  body=body.replace('proto.findOne=original','proto.roleStamp=original')
  body=body.replace('assert.equal(insert.status,201);return',"assert.equal(insert.status,201);assert.equal((await f.repo('User').findOneByOrFail({id:target.id})).tokenVersion,2);return")
 }
 if(['account-role-concurrency.integration.cjs','fix-controls.integration.cjs'].includes(name)){
  body=body.replace("const proto=require('typeorm').Repository.prototype,original=proto.findOne,b=barrier();", "const proto=f.app.get(require('../src/auth/users.controller').UsersController),original=proto.roleStamp,b=barrier();")
  body=body.replace(/proto\.findOne=async function\(options\)\{if\(this.metadata.name==='Role'[^\n]+/,"proto.roleStamp=async function(code,em){if(code===role.code&&em&&!once){once=true;b.enter();await b.resume}return original.call(this,code,em)}")
  body=body.replace('proto.findOne=original;if(pending)','proto.roleStamp=original;if(pending)')
 }
 write(name,body)
}
console.log(JSON.stringify({target,trackedFiles:files.length}))
