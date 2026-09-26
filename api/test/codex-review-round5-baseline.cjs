'use strict'
// Git-object sources in memory only: no worktree checkout and no product file writes.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),baseline='ce9ee15',sources=new Map()
const files=execFileSync('git',['diff','--name-only',baseline,'d352f40','--','api/src'],{cwd:root,encoding:'utf8'}).trim().split(/\r?\n/)
for(const file of files){assert.match(file,/^api\/src\/[a-z0-9/_.-]+\.ts$/);sources.set(path.resolve(root,file).toLowerCase(),execFileSync('git',['show',`${baseline}:${file}`],{cwd:root}))}
const read=fs.readFileSync
fs.readFileSync=function(file,options){const data=typeof file==='string'?sources.get(path.resolve(file).toLowerCase()):null;if(!data)return read.apply(this,arguments);const encoding=typeof options==='string'?options:options?.encoding;return encoding?data.toString(encoding):Buffer.from(data)}
console.log('CR5_BASELINE '+JSON.stringify({commit:baseline,productSourcesInMemory:sources.size,productFilesWritten:0}))
