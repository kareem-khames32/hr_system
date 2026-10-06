'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
for(const name of ['payroll-race','reason']){
 const destination=path.join(__dirname,`codex-review-p2w-${name}.integration.cjs`);assert.equal(fs.existsSync(destination),false)
 fs.writeFileSync(destination,fs.readFileSync(path.join(__dirname,`codex-review-p2v-${name}.integration.cjs`),'utf8').replaceAll('codex-review-p2v-','codex-review-p2w-').replaceAll('p2v_','p2w_').replaceAll('P2V','P2W'))
}
