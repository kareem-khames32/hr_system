'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict');let f
before(async()=>{f=await require('./codex-review-p2x-employment-fixture.cjs')('p2x_virtual_parity')},{timeout:180000})
after(async()=>{if(f)await f.close()})
test('P2X virtual entries equal materialized entries for calendar, anniversary, clipped and historical windows',async t=>{
 let comparisons=0
 const layouts=[[],[f.last],[f.year],[f.last+'-09-01'],['P1:'+f.last],[f.last,f.year+'-09-01']]
 for(const basis of ['YEAR_START','HIRE_ANNIVERSARY'])for(const mode of ['monthly','daily','annual'])for(const existing of layouts){
  await f.repo('LeaveType').update(f.annual.id,{renewalBasis:basis});await f.setting('leave.accrual_mode',mode)
  for(const date of [f.last+'-11-15',f.year+'-12-31',f.next+'-01-31']){
   const emp=await f.employee(f.A,{joinDate:'2020-09-01'})
   for(const key of existing)await f.balance(emp,key,{entitled:17,openingDays:2,taken:1})
   const ctx=await f.leaves.accrualContext(emp.id),segment=f.leaves.gateSegment(date),before=await f.rows(emp)
   const virtual=await f.leaves.entryAt(f.repo('LeaveBalance'),emp.id,'annual',segment.start,ctx)
   const virtualView=f.leaves.view(virtual.row,f.leaves.measureDate(virtual,date,segment.start,segment.later),ctx,false,virtual)
   assert.deepEqual(await f.rows(emp),before,'virtual entry must not persist')
   const actualView=await f.ds.transaction(async em=>{await f.leaves.lockEmployee(em,emp.id,true);const actual=await f.leaves.ensureAt(em.getRepository(f.repo('LeaveBalance').target),emp.id,'annual',segment.start,ctx);return f.leaves.view(actual.row,f.leaves.measureDate(actual,date,segment.start,segment.later),ctx,false,actual)})
   assert.deepEqual(virtualView,actualView,JSON.stringify({basis,mode,existing,date}));comparisons++
  }
 }
 t.diagnostic(JSON.stringify({case:'virtual-materialized-parity',comparisons}))
})
test('P2X missing untyped balance rejects without creating a row; sick and leap-day anniversary match saved behavior',async()=>{
 const emp=await f.employee(f.A,{joinDate:'2024-02-29'}),ctx=await f.leaves.accrualContext(emp.id)
 await assert.rejects(f.leaves.entryAt(f.repo('LeaveBalance'),emp.id,'none',f.year+'-12-31',ctx),/لا يوجد رصيد/)
 assert.equal(await f.repo('LeaveBalance').countBy({employeeId:emp.id}),0)
 for(const balanceType of ['sick','annual']){
  const before=await f.leaves.entryAt(f.repo('LeaveBalance'),emp.id,balanceType,f.next+'-02-28',ctx)
  const after=await f.ds.transaction(async em=>{await f.leaves.lockEmployee(em,emp.id,true);return f.leaves.ensureAt(em.getRepository(f.repo('LeaveBalance').target),emp.id,balanceType,f.next+'-02-28',ctx)})
  assert.deepEqual(f.leaves.view(before.row,f.next+'-02-28',ctx,false,before),f.leaves.view(after.row,f.next+'-02-28',ctx,false,after))
 }
})
