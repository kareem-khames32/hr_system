'use strict'
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process')
const target=path.resolve(__dirname,'../src/requests/requests.service.ts'),original=fs.readFileSync
const source=cp.execFileSync('git',['show','403347cb:api/src/requests/requests.service.ts'],{cwd:path.resolve(__dirname,'../..'),encoding:'utf8'});let hit=false
fs.readFileSync=function(file,...args){if(typeof file==='string'&&path.resolve(file).toLowerCase()===target.toLowerCase()){if(!hit){hit=true;console.log('REVIEW_PROGRESS pre-fix RequestsService loaded in memory; files unchanged')}const encoding=typeof args[0]==='string'?args[0]:args[0]?.encoding;return encoding?source:Buffer.from(source)}return original.call(this,file,...args)}

require('./codex-review-p5d-lfsql-preload.cjs')
process.on('exit',()=>{if(!hit){console.error('BASELINE_SOURCE_NOT_LOADED');process.exitCode=1}})
