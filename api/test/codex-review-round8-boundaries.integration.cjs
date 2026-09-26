'use strict'
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
let f, a, b, local, foreign, reader, holiday, policy
const date = '2026-10-15', marker = 'CR8_PRIVATE_BRANCH_B_HOLIDAY'
const note = value => console.log('CR8_EVIDENCE ' + JSON.stringify(value))
const serialized = value => JSON.stringify(value)
async function calendarChange(effectiveFrom = '2026-08-01') {
  const c = await f.ok('GET', '/attendance/calendar-context?scope=GLOBAL&sourceId=0')
  return { effectiveFrom, reason: 'Independent round 8 disposable fixture', expectedRevision: c.revision, expectedCurrentSourceHash: c.currentSourceHash }
}
async function sources(day, actor = reader, employeeId = local.id) {
  return f.request('POST', `/payroll/policies/${policy.policy.id}/versions/${policy.versions[0].id}/sources/read`,
    { expectedRevision: policy.versions[0].revision, employeeId, periodStart: day, periodEnd: day }, actor)
}
before(async () => {
  f = await require('./codex-review-round8-fixture.cjs')('r8boundaries')
  for (const [key,value] of Object.entries({ 'attendance.weekend_days':'FRI,SAT', 'system.country':'EG',
    'payroll.cycle_start_day':'1', 'payroll.monthly_days':'30', 'payroll.daily_hours':'8',
    'payroll.salary_evidence_mode':'MONTHLY_HISTORY_OR_CURRENT_FILE' })) await f.setting(key,value)
  a = await f.repo('Branch').save({name:'CR8 Branch A',code:'R8A',country:'EG',weekendDays:'FRI,SAT'})
  b = await f.repo('Branch').save({name:'CR8 Branch B',code:'R8B',country:'EG',weekendDays:'FRI,SAT'})
  const employee = (code,branchId) => f.repo('Employee').save({employeeCode:code,fullName:code,branchId,
    joinDate:'2024-01-01',status:'active',isActive:true,basicSalary:6000,housingAllowance:0,transportAllowance:0,
    phoneAllowance:0,workNatureAllowance:0,otherAllowance:0,workPressureAllowance:0,currency:'EGP',payMethod:'cash'})
  local=await employee('R8LOCAL',a.id); foreign=await employee('R8FOREIGN',b.id)
  reader=await f.repo('User').save({email:'r8branch@codex.invalid',displayName:'CR8 A reader',passwordHash:'not-a-password',role:'hr_manager',
    branchId:a.id,employeeId:local.id,permissions:JSON.stringify(['payroll.view','payroll.calculate','settings.view','attendance.manage','calendar.view_all','reports.view'])})
  await f.ok('POST','/catalogs/holidays',{name:marker,date,country:'EG',audience:{level:'employees',branchId:b.id,employeeIds:[foreign.id]},calendarChange:await calendarChange()})
  holiday=await f.repo('PublicHoliday').findOneByOrFail({name:marker})
  policy=await f.ok('POST','/payroll/policies',{name:'CR8 live evidence policy',effectiveFrom:'2026-01-01'})
})
after(async()=>{if(f)await f.close()})

test('CR8 foreign holiday values are hidden; permitted employee and holiday remain readable',async()=>{
  const hidden=await sources(date), allowed=await sources(date,f.admin,foreign.id)
  assert.equal(hidden.status,200);assert.equal(allowed.status,200)
  assert.ok(!serialized(hidden.body).includes(marker));assert.ok(serialized(allowed.body).includes(marker))
  const denied=await sources(date,reader,foreign.id)
  assert.equal(denied.status,403);assert.ok(!serialized(denied.body).includes(marker))
  const routes=['/catalogs/holidays','/attendance/calendar-context?scope=GLOBAL&sourceId=0','/calendar?month=2026-10']
  for(const route of routes){const body=await f.ok('GET',route,null,reader);assert.ok(!serialized(body).includes(marker),route)}
  note({case:'holiday-value-isolation',allowed:allowed.status,hidden:hidden.status,foreignEmployee:denied.status,otherRoutes:routes})
})

test('CR8 hidden foreign holiday must not survive in sourceRefs or expose its covered date',async()=>{
  const ref=`public_holidays:${holiday.id}`, observations=[]
  for(const day of ['2026-10-14',date,'2026-10-16']){
    const r=await sources(day);assert.equal(r.status,200)
    const section=r.body.snapshot.sections.schedule
    observations.push({day,foreignReferenceReturned:section.sourceRefs.includes(ref),holidayRows:section.data.calendarEvidence.holidays.length})
  }
  note({case:'foreign-holiday-reference-date-oracle',ref,observations})
  assert.ok(observations.every(x=>!x.foreignReferenceReturned),'A holiday removed for branch scope must also be removed from sourceRefs')
})

test('CR8 corrupt audience produces a generic issue without the holiday name or branch description',async()=>{
  try{
    await f.repo('PublicHoliday').update({id:holiday.id},{audience:'{not-valid-json'})
    const r=await sources(date);assert.equal(r.status,200)
    const schedule=r.body.snapshot.sections.schedule
    assert.ok(schedule.issues.some(x=>x.code==='SCHEDULE_HOLIDAY_INVALID'&&x.sourceRef==='public_holidays'))
    assert.ok(!serialized(r.body).includes(marker));assert.equal(schedule.data.calendarEvidence.holidays.length,0)
    note({case:'corrupt-audience',nameHidden:true,issue:schedule.issues.find(x=>x.code==='SCHEDULE_HOLIDAY_INVALID')})
  }finally{await f.repo('PublicHoliday').update({id:holiday.id},{audience:holiday.audience})}
})

test('CR8 stored run, policy snapshot, events, payslip and reports do not publish foreign holiday values',async()=>{
  const p=await f.ok('POST','/payroll/policies',{name:'CR8 snapshot policy',effectiveFrom:'2026-01-01',settings:{defaultPeriodType:'CALENDAR_MONTH',cycleStartDay:1,cycleEndMode:'DERIVED',cycleEndDay:null,dailyHours:8}})
  const published=await f.ok('POST',`/payroll/policies/${p.policy.id}/versions/${p.versions[0].id}/publish`,{expectedRevision:p.versions[0].revision,reason:'Independent round 8 persisted run'})
  const draft=await f.ok('POST','/payroll/runs',{name:'CR8 scope persistence',period:'2026-10',policyVersionId:published.version.id,filters:{employeeIds:[local.id]}})
  const run=await f.ok('POST',`/payroll/runs/${draft.id}/calculate`,{}), item=run.items[0]
  assert.equal(Number(item.netPay),6000);assert.ok(!serialized(run).includes(marker))
  const bd=typeof item.breakdown==='string'?JSON.parse(item.breakdown):item.breakdown
  const shadowContainers=[]
  const walk=v=>{if(!v||typeof v!=='object')return;for(const [k,c]of Object.entries(v)){if(k==='policyShadow'&&c)shadowContainers.push(c);walk(c)}}
  walk(bd);assert.ok(shadowContainers.length,'exercise persisted shadow evidence rather than only LEGACY mode')
  const routes=[`/payroll/runs/${run.id}`,`/payroll/runs/${run.id}/policy-snapshot`,`/payroll/runs/${run.id}/events`,
    `/payroll/runs/${run.id}/bank-sheet`,`/payroll/runs/${run.id}/pay-methods`,`/payroll/items/${item.id}`,
    '/payroll/runs','/payroll/my-payslips','/reports/payroll?includeDraft=true','/reports/financial/payroll-register?period=2026-10&includeDraft=true']
  for(const route of routes){const body=await f.ok('GET',route,null,reader);assert.ok(!serialized(body).includes(marker),route);assert.ok(!serialized(body).includes(`public_holidays:${holiday.id}`),route)}
  const tables=['PayrollRun','PayrollItem','PayrollRunMember','PayrollRunEvent']
  const saved=[]
  for(const table of tables){const rows=await f.repo(table).find();assert.ok(!serialized(rows).includes(marker),table);assert.ok(!serialized(rows).includes(`public_holidays:${holiday.id}`),table);saved.push({table,rows:rows.length})}
  note({case:'persisted-and-publishing-surfaces',runId:run.id,net:6000,shadowCount:shadowContainers.length,routes,saved})
})

test('CR8 dated holiday survives a future calendar edit while a non-target employee stays a working day',async()=>{
  const historicalDate='2026-09-15'
  await f.ok('POST','/catalogs/holidays',{name:'CR8 dated local holiday',date:historicalDate,country:'EG',audience:{level:'employees',branchId:a.id,employeeIds:[local.id]},calendarChange:await calendarChange()})
  const row=await f.repo('PublicHoliday').findOneByOrFail({name:'CR8 dated local holiday'})
  await f.ok('PATCH',`/catalogs/holidays/${row.id}`,{date:'2026-10-20',calendarChange:await calendarChange('2026-09-20')})
  const attendance=f.app.get(require('../src/attendance/attendance.service').AttendanceService)
  assert.equal((await attendance.calendarDay(local.id,historicalDate)).dayKind,'HOLIDAY')
  assert.equal((await attendance.calendarDay(foreign.id,historicalDate)).working,true)
  const command=(emp,branchId)=>f.request('POST','/attendance/holiday-work',{name:'CR8 historical actual order',targetLevel:'employees',branchId,employeeIds:[emp.id],dates:[historicalDate],multiplier:1.5})
  const accepted=await command(local,a.id), denied=await command(foreign,b.id)
  note({case:'dated-calendar-edited-later',currentDate:(await f.repo('PublicHoliday').findOneByOrFail({id:row.id})).date,historicalDate,accepted:accepted.status,nonTarget:denied.status})
  assert.equal(accepted.status,201,serialized(accepted.body));assert.equal(denied.status,400,serialized(denied.body))
})
