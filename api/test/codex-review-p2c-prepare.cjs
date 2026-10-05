'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),git=args=>cp.execFileSync('git',['-c','core.excludesFile=NUL',...args],{cwd:root,encoding:'utf8'}).trim(),target='523c50d2acf6dd22cc183d5b7a2317caa316482f'
assert.equal(git(['rev-parse','HEAD']),target);assert.equal(git(['diff','--name-only']), '')
const files=git(['ls-files']).split(/\r?\n/).filter(Boolean).map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))
function write(name,text){const dest=path.join(__dirname,'codex-review-p2c-'+name);assert.equal(fs.existsSync(dest),false);fs.writeFileSync(dest,text)}
write('scope-evidence.cjs','module.exports = '+JSON.stringify({target,root,files},null,2)+'\n')
for(const name of ['suite.cjs','fixture.cjs','support.cjs','static.cjs']){
 let s=fs.readFileSync(path.join(__dirname,'codex-review-p2b-'+name),'utf8').replaceAll('codex-review-p2b-','codex-review-p2c-')
 if(name==='suite.cjs')s=s.replace('const files = selected.map',"for(const n of ['decimal-output-precision','codex-review-p2c-money','codex-review-p2c-precision','payroll-live','one-person-controls','payroll-daily-accrual','queue-outbox','codex-review-p2c-live','codex-review-p2c-live-controls','codex-review-p2c-screen-history','codex-review-p2c-script-precision']) reviewedTemporaryMigrations.add(n+'.integration.cjs')\nconst files = selected.map")
 write(name,s)
}
for(const name of ['live','live-controls','screen-history','money','office'])write(name+'.integration.cjs',fs.readFileSync(path.join(__dirname,'codex-review-p2b-'+name+'.integration.cjs'),'utf8').replaceAll('codex-review-p2b-','codex-review-p2c-').replaceAll('p2b_','p2c_'))
console.log(JSON.stringify({target,trackedFiles:files.length}))
