'use strict'
const {run}=require('node:test'),fs=require('node:fs'),path=require('node:path')
const files=['codex-review-round5-adapted-category-ui.test.cjs','codex-review-round5-card.test.cjs']
const results=[]
const stream=run({files:files.map(x=>path.join(__dirname,x)),concurrency:1})
stream.on('test:pass',d=>results.push({name:d.name,pass:true}))
stream.on('test:fail',d=>results.push({name:d.name,pass:false,error:d.details.error?.message}))
stream.on('test:summary',d=>{if(!d.file){const data={files,summary:d,results};fs.writeFileSync(path.join(__dirname,'codex-review-round5-results-local.cjs'),'module.exports = '+JSON.stringify(data,null,2)+'\n');console.log(JSON.stringify(data));process.exitCode=d.success?0:1}})
stream.resume()
