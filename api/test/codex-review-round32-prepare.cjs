'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),target='7e08fb126da78d0dbc31765cf9832ddb5be9efa7'
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
assert.equal(git(['rev-parse','HEAD']),target)
assert.equal(git(['diff','--name-only',target,'--','api/src','src','docs','api/test']),'')
const files=git(['ls-files','api/src','src','docs','api/test']).split(/\r?\n/).filter(Boolean)
const evidence=path.join(__dirname,'codex-review-round32-scope-evidence.cjs')
if(!fs.existsSync(evidence))fs.writeFileSync(evidence,'module.exports = '+JSON.stringify({target,base:'f680ac1',root,files:files.map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')})),environmentCopied:false},null,2)+'\n')
for(const name of ['suite','preload','fixture','support','static','final-audit']){
 const destination=path.join(__dirname,`codex-review-round32-${name}.cjs`)
 if(fs.existsSync(destination))continue
 fs.writeFileSync(destination,fs.readFileSync(path.join(__dirname,`codex-review-round31-${name}.cjs`),'utf8').replaceAll('round31','round32').replaceAll('CR31','CR32').replaceAll('REPORT_31','REPORT_32').replace('|30|31)','|30|31|32)'))
}
const destination=path.join(__dirname,'codex-review-round32-independent.integration.cjs')
if(!fs.existsSync(destination)){
 let source=fs.readFileSync(path.join(__dirname,'codex-review-round31-independent.integration.cjs'),'utf8').replaceAll('\r\n','\n').replaceAll('round31','round32').replaceAll('CR31','CR32').replaceAll('r31','r32')
 source=source.replaceAll('before-reload','after-commit')
 source=source.replace("phase==='after-commit'?service.orders:service,method=phase==='after-commit'?'findOneByOrFail':'detailAfterWrite'","phase==='after-commit'?service.em:service,method=phase==='after-commit'?'transaction':'detailAfterWrite'")
 source=source.replace("const match=phase==='after-commit'?args[0]?.id===order.id:args[0]?.sub===actorA.id&&args[1]?.id===order.id\n  if(armed&&match){armed=false;entered.resolve();await gate.promise}\n  return original.apply(this,args)","const match=phase==='after-commit'||(args[0]?.sub===actorA.id&&args[1]?.id===order.id)\n  if(armed&&match){\n   armed=false\n   if(phase==='after-commit'){const value=await original.apply(this,args);entered.resolve();await gate.promise;return value}\n   entered.resolve();await gate.promise\n  }\n  return original.apply(this,args)")
 assert.ok(source.includes('const value=await original.apply(this,args)'))
 fs.writeFileSync(destination,source)
}
console.log(JSON.stringify({target,hashedFiles:files.length,productClean:true,adaptation:'before-reload hook replaced by delaying the return of the real transaction AFTER commit; all real transaction work and snapshot reading retained'}))
