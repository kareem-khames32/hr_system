'use strict'
const {test,before,after}=require('node:test')
const assert=require('node:assert/strict')
let f,a,b,local,foreign,reader,policy,publicHoliday,ownHoliday,hiddenHoliday
const date='2026-10-15'
const note=value=>console.log('CR9_EVIDENCE '+JSON.stringify(value))
async function change(){const c=await f.ok('GET','/attendance/calendar-context?scope=GLOBAL&sourceId=0');return{effectiveFrom:'2026-08-01',reason:'Independent round 9 fixture',expectedRevision:c.revision,expectedCurrentSourceHash:c.currentSourceHash}}
const read=(emp,actor)=>f.request('POST',`/payroll/policies/${policy.policy.id}/versions/${policy.versions[0].id}/sources/read`,{expectedRevision:policy.versions[0].revision,employeeId:emp.id,periodStart:date,periodEnd:date},actor)
before(async()=>{
  f=await require('./codex-review-round9-fixture.cjs')('r9privacy')
  await f.setting('attendance.weekend_days','FRI,SAT');await f.setting('system.country','EG')
  a=await f.repo('Branch').save({name:'CR9 A',code:'R9A',country:'EG',weekendDays:'FRI,SAT'})
  b=await f.repo('Branch').save({name:'CR9 B',code:'R9B',country:'EG',weekendDays:'FRI,SAT'})
  const employee=(code,branchId)=>f.repo('Employee').save({employeeCode:code,fullName:code,branchId,joinDate:'2024-01-01',status:'active',isActive:true,basicSalary:6000,currency:'EGP',payMethod:'cash'})
  local=await employee('R9LOCAL',a.id);foreign=await employee('R9FOREIGN',b.id)
  reader=await f.repo('User').save({email:'r9scope@codex.invalid',displayName:'CR9 Scope',passwordHash:'not-a-password',role:'hr_manager',branchId:a.id,permissions:JSON.stringify(['payroll.view','payroll.calculate','settings.view'])})
  for(const [name,audience]of [['CR9 PUBLIC',null],['CR9 OWN',{level:'employees',branchId:a.id,employeeIds:[local.id]}],['CR9 PRIVATE',{level:'employees',branchId:b.id,employeeIds:[foreign.id]}]])
    await f.ok('POST','/catalogs/holidays',{name,date,country:'EG',audience,calendarChange:await change()})
  publicHoliday=await f.repo('PublicHoliday').findOneByOrFail({name:'CR9 PUBLIC'})
  ownHoliday=await f.repo('PublicHoliday').findOneByOrFail({name:'CR9 OWN'})
  hiddenHoliday=await f.repo('PublicHoliday').findOneByOrFail({name:'CR9 PRIVATE'})
  policy=await f.ok('POST','/payroll/policies',{name:'CR9 source policy',effectiveFrom:'2026-01-01'})
})
after(async()=>{if(f)await f.close()})
test('CR9 permitted public and same-branch references survive while foreign references disappear from the complete response',async()=>{
  const r=await read(local,reader);assert.equal(r.status,200)
  const s=r.body.snapshot.sections.schedule, ids=s.data.calendarEvidence.holidays.map(h=>h.id)
  assert.deepEqual(ids.sort((x,y)=>x-y),[publicHoliday.id,ownHoliday.id].sort((x,y)=>x-y))
  for(const row of [publicHoliday,ownHoliday])assert.ok(s.sourceRefs.includes(`public_holidays:${row.id}`))
  assert.ok(!JSON.stringify(r.body).includes(`public_holidays:${hiddenHoliday.id}`));assert.ok(!JSON.stringify(r.body).includes('CR9 PRIVATE'))
  const own=await read(foreign,f.admin);assert.equal(own.status,200);assert.ok(own.body.snapshot.sections.schedule.sourceRefs.includes(`public_holidays:${hiddenHoliday.id}`))
  note({case:'permitted-and-hidden-references',allowedIds:ids,foreignReferenceAbsentFromWholeResponse:true,foreignAuthorizedRead:own.status})
})
test('CR9 unreadable audience has no numeric reference anywhere, including blockers and sourceRefs',async()=>{
  try{
    await f.repo('PublicHoliday').update({id:hiddenHoliday.id},{audience:'{invalid'})
    const r=await read(local,reader);assert.equal(r.status,200)
    const s=r.body.snapshot.sections.schedule
    assert.ok(s.issues.some(i=>i.code==='SCHEDULE_HOLIDAY_INVALID'&&i.sourceRef==='public_holidays'))
    assert.ok(!JSON.stringify(r.body).includes(`public_holidays:${hiddenHoliday.id}`));assert.ok(!JSON.stringify(r.body).includes('CR9 PRIVATE'))
    assert.ok(s.sourceRefs.includes(`public_holidays:${publicHoliday.id}`))
    note({case:'invalid-audience-reference',genericIssue:true,numericReferenceAbsentFromWholeResponse:true})
  }finally{await f.repo('PublicHoliday').update({id:hiddenHoliday.id},{audience:hiddenHoliday.audience})}
})
