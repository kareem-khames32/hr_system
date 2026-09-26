'use strict'
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
let f, branch, service, attendance, selected, expectedOrder
const date='2026-10-15'
before(async()=>{
  f=await require('./codex-review-round8-fixture.cjs')('r8limit')
  await f.setting('attendance.weekend_days','FRI,SAT');await f.setting('system.country','EG')
  branch=await f.repo('Branch').save({name:'CR8 501 targets',code:'R8LIMIT',country:'EG',weekendDays:'FRI,SAT'})
  const rows=Array.from({length:501},(_,i)=>({employeeCode:`R8LIMIT${String(i+1).padStart(4,'0')}`,fullName:`CR8 target ${i+1}`,branchId:branch.id,
    joinDate:'2024-01-01',status:'active',isActive:true,basicSalary:6000,housingAllowance:0,transportAllowance:0,phoneAllowance:0,workNatureAllowance:0,otherAllowance:0,currency:'EGP',payMethod:'cash'}))
  await f.repo('Employee').save(rows,{chunk:10})
  service=f.app.get(require('../src/attendance/holiday-work.service').HolidayWorkService)
  attendance=f.app.get(require('../src/attendance/attendance.service').AttendanceService)
  expectedOrder=[...(await service.employeesLite()).values()].map(e=>e.employeeId)
  assert.equal(expectedOrder.length,501)
  selected=expectedOrder[500]
  const c=await f.ok('GET','/attendance/calendar-context?scope=GLOBAL&sourceId=0')
  await f.ok('POST','/catalogs/holidays',{name:'CR8 holiday only employee 501',date,country:'EG',audience:{level:'employees',branchId:branch.id,employeeIds:[selected]},
    calendarChange:{effectiveFrom:'2026-08-01',reason:'Independent 501 target functional boundary',expectedRevision:c.revision,expectedCurrentSourceHash:c.currentSourceHash}})
})
after(async()=>{if(f)await f.close()})
test('CR8 branch order is valid when its only holiday recipient is candidate 501',async()=>{
  assert.equal((await attendance.calendarDay(selected,date)).dayKind,'HOLIDAY')
  assert.equal((await attendance.calendarDay(expectedOrder[0],date)).working,true)
  const observed=[], original=attendance.calendarDay
  let group
  attendance.calendarDay=async function(...args){observed.push(args[0]);return original.apply(this,args)}
  try{group=await f.request('POST','/attendance/holiday-work',{name:'CR8 valid branch holiday order',targetLevel:'branch',branchId:branch.id,dates:[date],multiplier:1.5})}
  finally{attendance.calendarDay=original}
  const individual=await f.request('POST','/attendance/holiday-work',{name:'CR8 same employee explicit order',targetLevel:'employees',branchId:branch.id,employeeIds:[selected],dates:[date],multiplier:1.5})
  console.log('CR8_EVIDENCE '+JSON.stringify({case:'501-target-limit',targets:expectedOrder.length,eligibleEmployee:selected,eligibleDay:'HOLIDAY',
    visited:observed.length,eligibleVisited:observed.includes(selected),branchStatus:group.status,branchBody:group.body,individualStatus:individual.status}))
  assert.equal(individual.status,201,JSON.stringify(individual.body))
  assert.equal(group.status,201,'The branch contains an eligible employee; a bounded search cannot establish that every target is working')
})
