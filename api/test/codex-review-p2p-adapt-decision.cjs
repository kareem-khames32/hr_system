'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const source=path.join(__dirname,'request-decision-race.integration.cjs'),target=path.join(__dirname,'codex-review-p2p-decision-race.integration.cjs')
assert.equal(fs.existsSync(target),false)
let code=fs.readFileSync(source,'utf8').replaceAll('hr_decision_race_','hr_codex_p2p_decision_race_test_')
const marker="  app.setGlobalPrefix('api');"
assert.ok(code.includes(marker))
code=code.replace(marker,"  const mail = app.get(require('../src/auth/mail.service').MailService); mail.isConfigured = () => false; mail.send = async () => { throw Error('Real mail prohibited in review') };\n"+marker)
fs.writeFileSync(target,'// P2P review-only copy: disposable database prefix and instance mail guard; assertions unchanged.\n'+code)
console.log('Created isolated decision-race evidence without changing the original test')
