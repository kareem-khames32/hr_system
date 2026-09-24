'use strict'
// Read-only baseline loader: git objects served to ts-node in memory. No checkout or product edits.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),baseline='f1ade54'
const changed=execFileSync('git',['diff','--name-only',baseline,'edffde6','--','api/src'],{cwd:root,encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean)
const saved=new Map()
for(const file of changed){
 assert.ok(/^api\/src\/[a-z0-9/_.-]+\.ts$/.test(file))
 if(file==='api/src/common/sql-batches.ts'||file==='api/src/common/sql-packet-size.ts')continue
 saved.set(path.resolve(root,file).toLowerCase(),execFileSync('git',['show',`${baseline}:${file}`],{cwd:root}))
}
const read=fs.readFileSync
fs.readFileSync=function(file,options){
 const value=typeof file==='string'?saved.get(path.resolve(file).toLowerCase()):null
 if(!value)return read.apply(this,arguments)
 const encoding=typeof options==='string'?options:options?.encoding
 return encoding?value.toString(encoding):Buffer.from(value)
}
console.log('CR3_BASELINE '+JSON.stringify({commit:baseline,inMemorySourceFiles:saved.size,productFilesWritten:0}))
process.nextTick(()=>{
 const {AttendanceService}=require('../src/attendance/attendance.service')
 assert.equal(AttendanceService.prototype.batchScope,undefined,'Baseline must really be the pre-change attendance implementation')
 console.log('CR3_BASELINE_VERIFIED '+JSON.stringify({commit:baseline,batchScopeAbsent:true}))
})
