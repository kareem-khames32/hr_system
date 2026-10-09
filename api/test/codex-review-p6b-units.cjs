'use strict'
const fs=require('node:fs'),path=require('node:path'),{run}=require('node:test')
Object.assign(process.env,{NODE_ENV:'test',JWT_SECRET:require('node:crypto').randomBytes(48).toString('hex'),DB_SYNCHRONIZE:'false'})
const files=fs.readdirSync(__dirname).filter(n=>['customer-provision','setup-import','i18n-ui','user-language','integrations','webhooks','sso-oidc','cost-center-report','ai','modules-registry','modules-ui','schema-readiness','routes-guards','session-cookie','mobile-shell-ui'].includes(n.replace('.test.cjs',''))&&n.endsWith('.test.cjs')).map(n=>path.join(__dirname,n))
const failures=[],results=[];const stream=run({files,concurrency:2})
stream.on('test:fail',d=>{const row={file:path.basename(d.file||''),name:d.name,error:d.details?.error?.message};failures.push(row);console.log(JSON.stringify(row))})
stream.on('test:pass',d=>results.push({file:path.basename(d.file||''),name:d.name}))
stream.on('test:summary',d=>{if(!d.file){fs.writeFileSync(path.join(__dirname,'codex-review-p6b-unit-results.cjs'),'module.exports = '+JSON.stringify({summary:d,files:files.length,failures,results},null,2));console.log(JSON.stringify(d));process.exitCode=d.success?0:1}})
stream.resume()
