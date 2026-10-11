'use strict'
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),target=cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()
assert.equal(target,'cfd56bd4bfd89103b1fa109c7e81b803b973a0ce')
const files=cp.execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8',maxBuffer:8e6}).split('\0').filter(Boolean).map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))
fs.writeFileSync(path.join(__dirname,'codex-review-p7d-scope-evidence.cjs'),'module.exports = '+JSON.stringify({target,files},null,2)+'\n')
for(const suffix of ['suite','verify','preload','http-preload','safe-mail-preload','download-preload','transport-preload','lfsql-preload','local-preload']){
 const from=path.join(__dirname,'codex-review-p7c-'+suffix+'.cjs'),to=path.join(__dirname,'codex-review-p7d-'+suffix+'.cjs')
 assert.equal(fs.existsSync(to),false)
 fs.writeFileSync(to,fs.readFileSync(from,'utf8').replaceAll('p7c','p7d').replaceAll('P7C','P7D'))
}
let source=fs.readFileSync(path.join(__dirname,'codex-review-p7c-channels.integration.cjs'),'utf8')
// Retain the seven independent cases and setup, not the copied original NC tests.
source=source.slice(0,source.indexOf("test('NC-01:"))
source=source.replaceAll('P7C','P7D').replaceAll('p7c','p7d').replaceAll('hr_notify_channels_test_','hr_codex_p7d_channels_test_')
source=source.replace('Success proves the remaining defect; this is not a passing product acceptance test.','Closure of the old N07: mail handover must precede the delayed skipped-row write.')
source=source.replace('N07 defect: a blocked skip-record write separates the final event check from mail submission','N07 closure: handover precedes a blocked skip-record write')
source=source.replace('assert.equal(mailbox.sent.length,0);\n      expectStatus(await rule',"assert.equal(mailbox.sent.length,1,'handover already happened before skipped-row write');\n      expectStatus(await rule")
source=source.replace("assert.equal(mailbox.sent.length,0,'admin save completed before any mail submission');","assert.equal(mailbox.sent.length,1,'admin save is after handover');")
source=source.replace('adminSavedBeforeMail:true,eventEmail:false,messagesAfterSave:1','handoverBeforeAdminSave:true,eventEmail:false,messagesBeforeSave:1')
fs.writeFileSync(path.join(__dirname,'codex-review-p7d-channels.integration.cjs'),source)
console.log(JSON.stringify({target,trackedFiles:files.length,createdReviewHarness:true}))
