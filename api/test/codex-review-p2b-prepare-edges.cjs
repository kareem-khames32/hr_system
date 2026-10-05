'use strict'
const fs=require('node:fs'),path=require('node:path')
let source=fs.readFileSync(path.join(__dirname,'codex-review-round3-cache-edges.integration.cjs'),'utf8')
source=source.replace("require('./codex-review-round2-fixture.cjs')('r3cacheedges')","require('./codex-review-p2b-fixture.cjs')('p2b_range_edges')")
source=source.replace("async function run(e,from,to){return f.ds.transaction(em=>accrual.accrueEmployeeRange(em,{employeeId:e.id,period:'2026-09',runId:null,from,to,today:'2026-09-24'}))}",`const clean=value=>{const v=JSON.parse(JSON.stringify(value));delete v.computedAt;return v}
async function run(e,from,to){return f.ds.transaction(async em=>{
 const result=await accrual.accrueEmployeeRange(em,{employeeId:e.id,period:'2026-09',runId:null,from,to,today:'2026-09-24'})
 const ranged=await attendance.readOnlyRange(em,[e.id],from,to),plain=attendance.inManager(em)
 for(let t=Date.parse(from+'T12:00:00Z');t<=Date.parse(to+'T12:00:00Z');t+=86400000){const date=new Date(t).toISOString().slice(0,10);assert.deepEqual(clean(await ranged.computeDay(e.id,date,false,true)),clean(await plain.computeDay(e.id,date,false,true)),date)}
 return result
})}`)
source=source.replace('const batch=attendance.batchScope(em),plain=attendance.inManager(em)',"const batch=await attendance.readOnlyRange(em,[e.id],'2026-08-01','2026-08-11'),plain=attendance.inManager(em)")
source+=`
test('P2B B out-of-range employee and edge permission/half-leave retain the old answer; no writes',async t=>{
 const e=await employee(),outside=await employee(),date='2026-08-31'
 const shift=await f.repo('Shift').findOneByOrFail({name:'R3 night'})
 for(const emp of[e,outside]){
  await f.repo('ScheduleDayOverride').save({employeeId:emp.id,date,shiftId:shift.id,shiftName:shift.name,startTime:'20:00',endTime:'01:00'})
  await f.repo('AttendancePunch').save(['2026-08-31T22:45:00','2026-09-01T01:00:00'].map(s=>stamp(emp,s)))
 }
 await f.repo('Leave').save({employeeId:e.id,leaveTypeCode:'ANNUAL',fromDate:date,toDate:date,days:0.5,period:'MORNING',isUnpaid:false,status:'APPROVED'})
 await f.repo('Request').save({requesterId:e.id,branchId:branch.id,typeCode:'PERMISSION',status:'COMPLETED',payload:JSON.stringify({date,fromTime:'22:30',toTime:'23:00',paid:true})})
 await f.ds.transaction(async em=>{
  const ranged=await attendance.readOnlyRange(em,[e.id],date,date),plain=attendance.inManager(em)
  const before=await em.query('SELECT * FROM attendance_days ORDER BY id')
  for(const[id,day]of[[e.id,date],[outside.id,date],[e.id,'2026-09-01']]){
   const a=await ranged.computeDay(id,day,false,true),b=await plain.computeDay(id,day,false,true)
   assert.deepEqual(clean(a),clean(b));t.diagnostic(JSON.stringify({case:'range-edge',employee:id,date:day,status:a.status,late:a.lateMinutes,work:a.workMinutes}))
  }
  const first=await ranged.computeDay(e.id,date,false,true),saved=clean(first);first.lateMinutes=99999;if(first.attendanceRuleSnapshot)first.attendanceRuleSnapshot.damaged=true
  assert.deepEqual(clean(await ranged.computeDay(e.id,date,false,true)),saved,'Returned object mutation cannot corrupt range state')
  await assert.rejects(ranged.computeDay(e.id,date,false,false),/للقراءة بس/)
  assert.deepEqual(await em.query('SELECT * FROM attendance_days ORDER BY id'),before)
 })
})
`
fs.writeFileSync(path.join(__dirname,'codex-review-p2b-range-edges.integration.cjs'),source)
console.log('Prepared independent read-only range comparison from prior review fixtures')
