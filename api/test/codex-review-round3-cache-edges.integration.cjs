'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
const {AttendanceService}=require('../src/attendance/attendance.service')
const {PayrollDailyAccrualService}=require('../src/payroll/payroll-daily-accrual.service')
const {readCalendarSource,confirmCalendarSource}=require('../src/attendance/attendance-calendar-history')
let f,branch,attendance,accrual,n=0
const actor=()=>({sub:f.admin.id,role:'super_admin',branchId:null,permissions:['*']})
async function confirm(scope,id,date='2026-08-01'){
 await f.ds.transaction(async em=>{const r=await readCalendarSource(em,scope,id);await confirmCalendarSource(em,actor(),scope,id,{effectiveFrom:date,reason:'Independent batch edge fixture',expectedRevision:r.revision,expectedCurrentSourceHash:r.currentSourceHash})})
}
async function employee(){
 const e=await f.repo('Employee').save({employeeCode:`R3EDGE${++n}`,fullName:'Synthetic cache edge',branchId:branch.id,joinDate:'2020-01-01',isActive:true,status:'active',basicSalary:9000,payMethod:'cash'})
 await confirm('EMPLOYEE',e.id)
 await f.repo('AttendanceRuleVersion').save({sourceType:'EMPLOYEE',sourceId:e.id,version:1,effectiveFrom:'2026-08-01',snapshot:{workScheduleId:null,flexOverrideMode:'INHERIT'},actorUserId:f.admin.id,reason:'Synthetic dated assignment',legacyBaseline:false})
 return e
}
const stamp=(e,s)=>({employeeId:e.id,employeeCode:e.employeeCode,punchTime:new Date(s),source:'DEVICE',deviceSn:'R3'})
async function run(e,from,to){return f.ds.transaction(em=>accrual.accrueEmployeeRange(em,{employeeId:e.id,period:'2026-09',runId:null,from,to,today:'2026-09-24'}))}
before(async()=>{
 f=await require('./codex-review-round2-fixture.cjs')('r3cacheedges')
 branch=await f.repo('Branch').save({code:'R3EDGE',name:'Independent edge branch',country:'EG',weekendDays:'FRI'})
 for(const [key,value] of Object.entries({'attendance.weekend_days':'FRI','attendance.grace_minutes':'0','payroll.monthly_days':'30','payroll.daily_hours':'8','overtime.detection_threshold_hours':'0.5'}))await f.setting(key,value)
 await confirm('GLOBAL',0);await confirm('BRANCH',branch.id)
 attendance=f.app.get(AttendanceService);accrual=f.app.get(PayrollDailyAccrualService)
},{timeout:180000})
after(async()=>{if(f)await f.close()})
test('CR3-E1 night crosses month and dated shift revision inside one accrual batch',async t=>{
 const e=await employee()
 const shift=await f.ok('POST','/catalogs/shifts',{name:'R3 night',startTime:'20:00',endTime:'01:00',shiftMode:'fixed',graceMinutes:0,flexEnabled:false,requiredWorkMinutes:300,effectiveFrom:'2026-08-01',changeReason:'Independent old night version'})
 await f.ok('PATCH',`/catalogs/shifts/${shift.id}`,{startTime:'21:00',endTime:'02:00',effectiveFrom:'2026-09-01',changeReason:'Independent changed night version'})
 for(const date of ['2026-08-31','2026-09-01'])await f.repo('ScheduleDayOverride').save({employeeId:e.id,date,shiftId:shift.id,shiftName:shift.name,startTime:'21:00',endTime:'02:00'})
 await f.repo('AttendancePunch').save(['2026-08-31T20:10:00','2026-09-01T00:50:00','2026-09-01T21:20:00','2026-09-02T02:00:00'].map(s=>stamp(e,s)))
 assert.equal((await run(e,'2026-08-31','2026-09-01')).computed,2)
 const days=await f.repo('AttendanceDay').find({where:{employeeId:e.id},order:{date:'ASC'}})
 assert.deepEqual(days.map(d=>[d.date,d.shiftStart,d.shiftEnd,d.lateMinutes,d.workMinutes,d.shortfallMinutes]),[
  ['2026-08-31','20:00','01:00',10,280,20],['2026-09-01','21:00','02:00',20,280,20]])
 assert.notEqual(days[0].attendanceRuleSnapshot.sourceVersionId,days[1].attendanceRuleSnapshot.sourceVersionId)
 t.diagnostic(JSON.stringify({nightDays:days.map(d=>({date:d.date,late:d.lateMinutes,work:d.workMinutes,shortfall:d.shortfallMinutes}))}))
})
test('CR3-E2 actual dated branch transfer and branch holiday/weekend resolved for each day of same batch',async t=>{
 const e=await employee(),other=await f.repo('Branch').save({code:'R3MOVE',name:'Independent destination',country:'SA',weekendDays:'SAT'})
 await confirm('BRANCH',other.id)
 const context=await f.ok('GET',`/attendance/calendar-context?scope=EMPLOYEE&sourceId=${e.id}`)
 await f.ok('PATCH',`/employees/${e.id}`,{branchId:other.id,calendarChange:{effectiveFrom:'2026-08-29',reason:'Independent historical transfer',expectedRevision:context.revision,expectedCurrentSourceHash:context.currentSourceHash}})
 // Friday 28 belongs to EG/FRI; Saturday 29 belongs to SA/SAT. Sunday 30 works in SA.
 await run(e,'2026-08-28','2026-08-30')
 await f.ds.transaction(async em=>{
  const scope=attendance.batchScope(em)
  const calendar=[];for(const date of ['2026-08-28','2026-08-29','2026-08-30'])calendar.push(await scope.calendarDay(e.id,date))
  assert.deepEqual(calendar.map(d=>[d.date,d.branchId,d.dayKind]),[['2026-08-28',branch.id,'WEEKEND'],['2026-08-29',other.id,'WEEKEND'],['2026-08-30',other.id,'WORKING']])
  for(const day of calendar)assert.deepEqual(day,await attendance.inManager(em).calendarDay(e.id,day.date))
  t.diagnostic(JSON.stringify({transferCalendar:calendar.map(d=>({date:d.date,branch:d.branchId,kind:d.dayKind}))}))
 })
})
test('CR3-E3 exemption ranges remain exact; overlap outside day does not poison cache, overlap inside day fails both paths',async()=>{
 const e=await employee(),window=(from,to)=>({employeeId:e.id,effectiveFrom:from,effectiveTo:to,status:'APPROVED',reasonCode:'field_role',reason:'Synthetic edge overlap',createdByUserId:f.admin.id,approvedByUserId:f.approver.id,approvedAt:new Date(),requiresCheckinForPresence:false})
 await f.repo('AttendanceExemption').save([window('2026-08-01','2026-08-03'),window('2026-08-02','2026-08-04'),window('2026-08-10','2026-08-10')])
 await f.ds.transaction(async em=>{
  const batch=attendance.batchScope(em),plain=attendance.inManager(em)
  const strip=d=>Object.fromEntries(Object.entries(d).filter(([k])=>k!=='computedAt'))
  for(const date of ['2026-08-10','2026-08-11'])assert.deepEqual(strip(await batch.computeDay(e.id,date,false,true)),strip(await plain.computeDay(e.id,date,false,true)))
  const errors=[];for(const s of [batch,plain]){try{await s.computeDay(e.id,'2026-08-02',false,true)}catch(error){errors.push({name:error.name,message:error.message})}}
  assert.equal(errors.length,2);assert.deepEqual(errors[0],errors[1])
 })
})
test('CR3-E4 reference cache ends with batch; punches remain live; changed source visible in next transaction',async()=>{
 const e=await employee()
 const shift=await f.repo('Shift').findOneByOrFail({name:'R3 night'})
 await f.repo('ScheduleDayOverride').save({employeeId:e.id,date:'2026-08-30',shiftId:shift.id,shiftName:shift.name,startTime:'20:00',endTime:'01:00'})
 await f.ds.transaction(async em=>{
  const b=attendance.batchScope(em),first=await b.employeeRow(e.id)
  assert.equal(Number(first.basicSalary),9000)
  const result=await b.shiftFor(e.id,'2026-08-30');result.sourceSettings={bad:'mutation'}
  assert.notDeepEqual(await b.shiftFor(e.id,'2026-08-30'),result)
  assert.equal((await b.computeDay(e.id,'2026-08-30',false,true)).status,'absent')
  await em.getRepository('AttendancePunch').save(['2026-08-30T20:00:00','2026-08-31T01:00:00'].map(s=>stamp(e,s)))
  const changed=await b.computeDay(e.id,'2026-08-30',false,true)
  assert.equal(changed.status,'present');assert.equal(changed.workMinutes,300)
 })
 await f.repo('Employee').update(e.id,{basicSalary:9100})
 await f.ds.transaction(async em=>assert.equal(Number((await attendance.batchScope(em).employeeRow(e.id)).basicSalary),9100))
})
test('CR3-E5 dated holiday removal and branch weekend revision inside range survive batch memoization',async t=>{
 const e=await employee()
 const command=async(scope,id,date)=>{const c=await f.ok('GET',`/attendance/calendar-context?scope=${scope}&sourceId=${id}`);return {effectiveFrom:date,reason:'Independent calendar boundary',expectedRevision:c.revision,expectedCurrentSourceHash:c.currentSourceHash}}
 const holiday=await f.ok('POST','/catalogs/holidays',{name:'R3 dated holiday',date:'2026-08-10',endDate:'2026-08-13',country:'EG',calendarChange:await command('GLOBAL',0,'2026-08-01')})
 await f.ok('DELETE',`/catalogs/holidays/${holiday.id}`,{calendarChange:await command('GLOBAL',0,'2026-08-12')})
 await f.ok('PATCH',`/branches/${branch.id}`,{weekendDays:'SAT',calendarChange:await command('BRANCH',branch.id,'2026-08-14')})
 await run(e,'2026-08-10','2026-08-15')
 await f.ds.transaction(async em=>{
  const b=attendance.batchScope(em),plain=attendance.inManager(em),actual=[]
  for(const date of ['2026-08-10','2026-08-11','2026-08-12','2026-08-13','2026-08-14','2026-08-15']){
   const day=await b.calendarDay(e.id,date);assert.deepEqual(day,await plain.calendarDay(e.id,date));actual.push(day.dayKind)
  }
  assert.deepEqual(actual,['HOLIDAY','HOLIDAY','WORKING','WORKING','WORKING','WEEKEND'])
  t.diagnostic(JSON.stringify({calendarBoundaryKinds:actual}))
 })
})
test('CR3-E6 supplied shadow UTC date filtering can omit first local SQL DATE; independent oracle covers all dates',async t=>{
 const [row]=await f.ds.query("SELECT CAST('2026-08-31' AS date) rawDate,CONVERT(varchar(10),CAST('2026-08-31' AS date),23) sqlDay")
 const originalKey=row.rawDate instanceof Date?row.rawDate.toISOString().slice(0,10):String(row.rawDate).slice(0,10)
 assert.equal(row.sqlDay,'2026-08-31');assert.notEqual(originalKey,row.sqlDay)
 t.diagnostic(JSON.stringify({sqlDate:row.sqlDay,originalShadowDay:originalKey,firstDayOmitted:originalKey<'2026-08-31'}))
})
