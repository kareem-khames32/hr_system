'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),git=args=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim(),target='bdf069551e2ab25f622cb79c3660726f627f109a'
assert.equal(git(['rev-parse','HEAD']),target);assert.equal(git(['diff','--name-only']),'')
const files=git(['ls-files']).split(/\r?\n/).filter(Boolean).map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))
function write(name,text){const dest=path.join(__dirname,'codex-review-p2e-'+name);assert.equal(fs.existsSync(dest),false);fs.writeFileSync(dest,text)}
write('scope-evidence.cjs','module.exports = '+JSON.stringify({target,root,files},null,2)+'\n')
for(const name of ['suite.cjs','fixture.cjs','static.cjs','verify.cjs']){
 let text=fs.readFileSync(path.join(__dirname,'codex-review-p2d-'+name),'utf8').replaceAll('codex-review-p2d-','codex-review-p2e-').replaceAll('p2d_','p2e_').replaceAll('CODEX_REVIEW_REPORT_P2D.md','CODEX_REVIEW_REPORT_P2E.md')
 if(name==='suite.cjs')text=text.replace('const files = selected.map',"reviewedTemporaryMigrations.add('notifications-migration.integration.cjs')\nconst files = selected.map")
 if(name==='fixture.cjs')text=text.replace("app.setGlobalPrefix('api')",`// Instance substitutions before app.init or enabling notification email.
    const mail=app.get(require('../src/auth/mail.service').MailService)
    const mailbox={sent:[],attempts:[],configured:true,hold:null,failure:null}
    mail.isConfigured=()=>mailbox.configured
    mail.send=async message=>{mailbox.attempts.push({...message});if(mailbox.hold)await mailbox.hold;if(mailbox.failure)throw mailbox.failure;mailbox.sent.push({...message});return{accepted:[message.to],rejected:[],messageId:'review-only',response:'250 synthetic'}}
    assert.notEqual(mail.send,require('../src/auth/mail.service').MailService.prototype.send)
    app.get(require('../node_modules/@nestjs/config').ConfigService).set('FRONTEND_URL','https://hr.example.invalid')
    app.setGlobalPrefix('api')`).replace('return { database, app, ds, master, repo,','return { database, app, ds, master, mailbox, repo,')
 write(name,text)
}
console.log(JSON.stringify({target,trackedFiles:files.length}))
