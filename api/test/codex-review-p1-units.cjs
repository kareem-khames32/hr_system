'use strict'
const fs=require('node:fs'),path=require('node:path'),{run}=require('node:test'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),files=execFileSync('git',['diff','--name-only','ce15142','622ed57','--','api/test'],{cwd:root,encoding:'utf8'}).trim().split(/\r?\n/).filter(f=>f.endsWith('.test.cjs')&&!f.includes('codex-review-')).map(f=>path.join(root,f))
const results=[],errors=[]
const runner=run({files,concurrency:2,execArgv:['--require',path.join(__dirname,'codex-review-p1-preload.cjs'),'--require',path.join(__dirname,'codex-review-round5-harness.cjs')]})
runner.on('test:pass',d=>results.push({file:path.basename(d.file||''),name:d.name,pass:true,skip:d.skip||false}))
runner.on('test:fail',d=>{const row={file:path.basename(d.file||''),name:d.name,pass:false,error:d.details.error?.message,cause:d.details.error?.cause?.message};results.push(row);console.log(JSON.stringify(row))})
runner.on('test:stderr',d=>errors.push(d.message))
runner.on('test:summary',d=>{if(d.file)return;fs.writeFileSync(path.join(__dirname,'codex-review-p1-unit-results.cjs'),'module.exports = '+JSON.stringify({selected:files.map(f=>path.basename(f)),summary:d,results,errors},null,2)+'\n');console.log(JSON.stringify({files:files.length,counts:d.counts}));process.exitCode=d.success?0:1})
runner.resume()
