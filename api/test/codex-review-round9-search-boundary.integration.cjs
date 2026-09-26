'use strict'
const {test,before,after}=require('node:test')
const assert=require('node:assert/strict')
let f,a,b,parent,child,other,otherBranchDept,eligible,attendance
const date='2026-09-15'
const note=value=>console.log('CR9_EVIDENCE '+JSON.stringify(value))
async function order(targetLevel,branchId,employeeIds){return f.request('POST','/attendance/holiday-work',{name:'CR9 independent historical order',targetLevel,branchId,employeeIds,dates:[date],multiplier:1.5})}
async function observe(action){
  const ids=[],original=attendance.calendarDay
  attendance.calendarDay=async function(...args){ids.push(args[0]);return original.apply(this,args)}
  try{return{response:await action(),ids}}finally{attendance.calendarDay=original}
}
before(async()=>{
  f=await require('./codex-review-round9-fixture.cjs')('r9search')
  await f.setting('attendance.weekend_days','FRI,SAT');await f.setting('system.country','EG')
  a=await f.repo('Branch').save({name:'CR9 3001 targets',code:'R9LIMIT',country:'EG',weekendDays:'FRI,SAT'})
  b=await f.repo('Branch').save({name:'CR9 destination',code:'R9DEST',country:'EG',weekendDays:'FRI,SAT'})
  parent=await f.repo('Department').save({name:'CR9 Holiday parent',code:'R9P',branchId:a.id})
  child=await f.repo('Department').save({name:'CR9 Holiday child',code:'R9CH',branchId:a.id,parentId:parent.id})
  other=await f.repo('Department').save({name:'CR9 Others',code:'R9OTH',branchId:a.id})
  otherBranchDept=await f.repo('Department').save({name:'CR9 Destination dept',code:'R9D',branchId:b.id})
  const employees=Array.from({length:3001},(_,i)=>({employeeCode:`R9LIMIT${String(i+1).padStart(4,'0')}`,fullName:`CR9 candidate ${i+1}`,branchId:a.id,
    departmentId:i===3000?child.id:other.id,joinDate:'2024-01-01',status:'active',isActive:true,basicSalary:6000,currency:'EGP',payMethod:'cash'}))
  await f.repo('Employee').save(employees,{chunk:10})
  eligible=await f.repo('Employee').findOneByOrFail({employeeCode:'R9LIMIT3001'})
  assert.equal(await f.repo('Employee').count(),3001)
  const c=await f.ok('GET','/attendance/calendar-context?scope=GLOBAL&sourceId=0')
  await f.ok('POST','/catalogs/holidays',{name:'CR9 historical department holiday',date,country:'EG',audience:{level:'departments',branchId:a.id,departmentIds:[parent.id]},
    calendarChange:{effectiveFrom:'2026-08-01',reason:'Independent round 9 actual search boundary',expectedRevision:c.revision,expectedCurrentSourceHash:c.currentSourceHash}})
  attendance=f.app.get(require('../src/attendance/attendance.service').AttendanceService)
  assert.equal((await attendance.calendarDay(eligible.id,date)).dayKind,'HOLIDAY')
  await f.ok('PATCH',`/employees/${eligible.id}`,{departmentId:other.id})
  assert.equal((await attendance.calendarDay(eligible.id,date)).dayKind,'HOLIDAY')
})
after(async()=>{if(f)await f.close()})
test('CR9 exhausting 3000 of 3001 historical candidates reports incomplete search, persists no order, and allows an explicit employee target',async()=>{
  const beforeCount=await f.repo('HolidayWorkOrder').count()
  const got=await observe(()=>order('branch',a.id))
  assert.equal(got.response.status,400);assert.equal(got.ids.length,3000);assert.ok(!got.ids.includes(eligible.id))
  assert.match(got.response.body.message,/3000/);assert.match(got.response.body.message,/3001/)
  assert.ok(!got.response.body.message.includes('يوم عمل عادي'))
  assert.equal(await f.repo('HolidayWorkOrder').count(),beforeCount)
  const explicit=await observe(()=>order('employees',a.id,[eligible.id]))
  assert.equal(explicit.response.status,201,JSON.stringify(explicit.response.body));assert.ok(explicit.ids.includes(eligible.id))
  note({case:'search-exhaustion',targets:3001,visited:got.ids.length,eligibleVisited:false,status:got.response.status,message:got.response.body.message,orderRowsAddedByFailedAttempt:0,explicitEmployeeStatus:explicit.response.status})
})
test('CR9 current membership in a child department ranks its eligible employee before 3000 nonmembers',async()=>{
  await f.ok('PATCH',`/employees/${eligible.id}`,{departmentId:child.id})
  const got=await observe(()=>order('branch',a.id))
  assert.equal(got.response.status,201,JSON.stringify(got.response.body));assert.deepEqual(got.ids,[eligible.id])
  note({case:'descendant-department-priority',employeeId:eligible.id,status:got.response.status,visited:got.ids.length,first:got.ids[0]})
})
test('CR9 historical cross-branch candidate is still checked; a complete 3000-person working-day search has the normal rejection',async()=>{
  const c=await f.ok('GET',`/attendance/calendar-context?scope=EMPLOYEE&sourceId=${eligible.id}`)
  await f.ok('PATCH',`/employees/${eligible.id}`,{branchId:b.id,departmentId:otherBranchDept.id,
    calendarChange:{effectiveFrom:'2026-09-26',reason:'Independent historical transfer after holiday',expectedRevision:c.revision,expectedCurrentSourceHash:c.currentSourceHash}})
  assert.equal((await attendance.calendarDay(eligible.id,date)).dayKind,'HOLIDAY')
  const moved=await observe(()=>order('employees',b.id,[eligible.id]))
  assert.equal(moved.response.status,201,JSON.stringify(moved.response.body));assert.deepEqual(moved.ids,[eligible.id])
  const complete=await observe(()=>order('branch',a.id))
  assert.equal(complete.response.status,400);assert.equal(complete.ids.length,3000)
  assert.ok(complete.response.body.message.includes('يوم عمل عادي'));assert.ok(!complete.response.body.message.includes('وقف عند'))
  note({case:'cross-branch-history-and-complete-search',historicalDay:'HOLIDAY',movedEmployeeStatus:moved.response.status,completeTargets:3000,visited:complete.ids.length,status:complete.response.status,message:complete.response.body.message})
})
