'use strict'
// Independent SQL oracle. No global batchScope toggle; existing identities remain exact.
// Extra coverage beyond the supplied shadow: all dates, claims, events, return/callback values,
// and the in-memory after-commit queue (raw SAVE TRANSACTION does not roll it back).
const assert=require('node:assert/strict')
const {AttendanceService}=require('../src/attendance/attendance.service')
const {PayrollDailyAccrualService}=require('../src/payroll/payroll-daily-accrual.service')
const original=PayrollDailyAccrualService.prototype.accrueEmployeeRange
const stats={calls:0,compared:0,rows:0,mismatches:0,equalErrors:0};let seq=0
const clockColumns=new Set(['computedAt','dirtyAt','createdAt','claimedAt','releasedAt'])
const iso=v=>v instanceof Date?v.toISOString():String(v)
async function raw(em,id){
 const days=await em.query('SELECT * FROM attendance_days WHERE employeeId=@0',[id])
 const overtime=await em.query('SELECT * FROM overtime_entries WHERE employeeId=@0',[id])
 return {days,overtime,
  accruals:await em.query('SELECT * FROM payroll_daily_accrual WHERE employeeId=@0',[id]),
  claims:await em.query('SELECT * FROM overtime_day_claims WHERE employeeId=@0',[id]),
  events:await em.query('SELECT * FROM overtime_entry_events WHERE entryId IN (SELECT id FROM overtime_entries WHERE employeeId=@0)',[id]),
  requests:await em.query('SELECT * FROM requests WHERE id IN (SELECT requestId FROM overtime_entries WHERE employeeId=@0 AND requestId IS NOT NULL)',[id])}
}
function refsFor(rows,before){
 const refs={days:new Map(),overtime:new Map()}
 for(const table of ['days','overtime']){
  const old=new Set(before[table].map(r=>r.id)),used=new Set()
  for(const row of rows[table]){
   const key=old.has(row.id)?`existing:${row.id}`:table==='days'?`${row.employeeId}|${iso(row.date)}`:`${row.employeeId}|${iso(row.date)}|${row.source}|${row.requestId}`
   assert.ok(!used.has(key),`Ambiguous new ${table} natural key: oracle refuses to hide it`);used.add(key);refs[table].set(row.id,key)
  }
 }
 return refs
}
function normalize(value,refs,key=''){
 if(value instanceof Date)return value.toISOString()
 if(Array.isArray(value))return value.map(v=>normalize(v,refs,key))
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,normalize(v,refs,k)]))
 if(typeof value==='number'){
  const kind=/^attendanceDayIds?$/.test(key)?'days':/^(?:entryId|overtime(?:Entry)?Ids?)$/.test(key)?'overtime':null
  if(kind){assert.ok(refs[kind].has(value),`Dangling ${key} in shadow evidence`);return `${kind}:${refs[kind].get(value)}`}
 }
 if(typeof value==='string'&&/^[\[{]/.test(value)){let parsed;try{parsed=JSON.parse(value)}catch{return value}return JSON.stringify(normalize(parsed,refs))}
 return value
}
function canonical(rows,before){
 const refs=refsFor(rows,before),out={}
 for(const [table,list] of Object.entries(rows)){
  const previous=new Map(before[table].map(r=>[r.id,r]))
  out[table]=list.map(row=>{
   const obj={}
   for(const [key,value] of Object.entries(row)){
    if(key==='id'){obj.id=previous.has(value)?value:'<new identity>';continue}
    // Preserve timestamps of pre-existing unchanged fields; only clocks produced by this calculation vary.
    // computeDay writes second-resolution clocks: a genuine rewrite can equal the preimage
    // in the first pass and differ a second later. Clock equality cannot identify a write.
    if(['computedAt','dirtyAt'].includes(key)){obj[key]=value==null?null:'<calculation clock>';continue}
    if(clockColumns.has(key)&&value!=null&&iso(previous.get(row.id)?.[key])!==iso(value)){obj[key]='<written clock>';continue}
    obj[key]=normalize(value,refs,key)
   }
   return JSON.stringify(obj)
  }).sort()
 }
 return {rows:out,refs}
}
function queue(runner,refs){
 const pending=runner.data.overtimeDispatchAfterCommit
 return pending?[...pending].map(([depth,ids])=>[depth,[...ids].map(id=>refs.overtime.has(id)?refs.overtime.get(id):`other:${id}`).sort()]).sort():[]
}
PayrollDailyAccrualService.prototype.accrueEmployeeRange=async function(em,input){
 stats.calls++
 if(!em?.queryRunner?.isTransactionActive)return original.call(this,em,input)
 const before=await raw(em,input.employeeId),point=`cr3_shadow_${++seq}`,runner=em.queryRunner
 const savedQueue=runner.data.overtimeDispatchAfterCommit?structuredClone(runner.data.overtimeDispatchAfterCommit):undefined
 await em.query(`SAVE TRANSACTION ${point}`)
 const oldAttendance=Object.assign(Object.create(AttendanceService.prototype),this.attendance)
 oldAttendance.batchScope=function(manager){return this.inManager(manager)}
 const oldService=Object.assign(Object.create(Object.getPrototypeOf(this)),this,{attendance:oldAttendance})
 const callbacks={off:[],on:[]};let offResult,onResult,offError,onError,offRows,offQueue,onRows,onQueue
 try{
  offResult=await original.call(oldService,em,{...input,onComputed:(date,day)=>callbacks.off.push({date,day})})
  offRows=canonical(await raw(em,input.employeeId),before);offQueue=queue(runner,offRows.refs)
 }catch(e){offError=e}
 await em.query(`ROLLBACK TRANSACTION ${point}`)
 if(savedQueue)runner.data.overtimeDispatchAfterCommit=structuredClone(savedQueue);else delete runner.data.overtimeDispatchAfterCommit
 try{
  onResult=await original.call(this,em,{...input,onComputed:(date,day)=>{callbacks.on.push({date,day});input.onComputed?.(date,day)}})
  onRows=canonical(await raw(em,input.employeeId),before);onQueue=queue(runner,onRows.refs)
 }catch(e){onError=e}
 if(offError||onError){
  if(offError&&onError&&offError.name===onError.name&&offError.message===onError.message){stats.equalErrors++;throw onError}
  stats.mismatches++;throw new Error(`CR3_SHADOW_ERROR_DIFFERENCE old=${offError?.name}:${offError?.message} new=${onError?.name}:${onError?.message}`)
 }
 try{
  assert.deepEqual(onResult,offResult,'accrual return')
  assert.deepEqual(onRows.rows,offRows.rows,'persisted values including claims/events')
  assert.deepEqual(onQueue,offQueue,'after-commit dispatch targets')
  const cb=(rows,refs)=>rows.map(({date,day})=>({date,day:day?normalize(Object.fromEntries(Object.entries(day).filter(([k])=>!['id','computedAt'].includes(k))),refs):null}))
  assert.deepEqual(cb(callbacks.on,onRows.refs),cb(callbacks.off,offRows.refs),'callback values')
 }catch(e){
  stats.mismatches++;const differences=[]
  for(const table of Object.keys(onRows.rows)){
   const a=offRows.rows[table],b=onRows.rows[table]
   if(a.length!==b.length)differences.push({table,oldCount:a.length,newCount:b.length})
   for(let i=0;i<Math.min(a.length,b.length);i++)if(a[i]!==b[i]){
    const old=JSON.parse(a[i]),now=JSON.parse(b[i]);const fields=Object.keys({...old,...now}).filter(k=>JSON.stringify(old[k])!==JSON.stringify(now[k]))
    differences.push({table,row:i,fields,values:Object.fromEntries(fields.map(k=>[k,{off:String(old[k]).slice(0,180),on:String(now[k]).slice(0,180)}]))});break
   }
  }
  console.log('CR3_SHADOW_MISMATCH '+JSON.stringify({employeeId:input.employeeId,from:input.from,to:input.to,differences,reason:e.message.slice(0,70)}));throw e
 }
 stats.compared++;stats.rows+=Object.values(onRows.rows).reduce((sum,rows)=>sum+rows.length,0)
 return onResult
}
process.on('exit',()=>console.log('CR3_SHADOW_SUMMARY '+JSON.stringify(stats)))
module.exports={normalize,canonical,stats}
