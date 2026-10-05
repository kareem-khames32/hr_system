'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
for(const n of ['closure.integration.cjs','download-preload.cjs']){
 const dest=path.join(__dirname,'codex-review-p2c-'+n);assert.equal(fs.existsSync(dest),false)
 fs.writeFileSync(dest,fs.readFileSync(path.join(__dirname,'codex-review-p2b-'+n),'utf8').replaceAll('codex-review-p2b-','codex-review-p2c-').replaceAll('p2a_independent','p2c_a_closure'))
}
