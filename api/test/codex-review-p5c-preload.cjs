'use strict'
const fs=require('node:fs'),path=require('node:path'),os=require('node:os')
const temporary=path.join(__dirname,'codex-review-p5c-tmp')
fs.mkdirSync(temporary,{recursive:true});os.tmpdir=()=>temporary
// The next preload is round5/round2: disposable DB guard, in-process HTTP,
// no SMTP transporter, LDAP or background services. Instance mail mocks only.
