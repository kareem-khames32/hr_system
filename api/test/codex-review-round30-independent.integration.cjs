'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),setup=require('./codex-review-round30-support.cjs')
let f,desk,seq=0
const reason='مراجعة مستقلة لحماية القرار المالي مع نقل الموظف'
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r});return {promise,resolve}}
async function within(p,ms){let timer;try{return await Promise.race([p.then(value=>({done:true,value})),new Promise(resolve=>{timer=setTimeout(()=>resolve({done:false}),ms)})])}finally{clearTimeout(timer)}}
before(async()=>{f=await setup('r30_independent');desk=await f.actor('r30-desk',['payroll.calculate','payroll.view','attendance.manage']);await f.setting('attendance.weekend_days','FRI,SAT');await f.repo('Branch').update([f.A.id,f.B.id],{weekendDays:'FRI,SAT'});f.departmentB=await f.repo('Department').save({name:'قسم النقل المسموح',branchId:f.B.id});f.teamB=await f.repo('Team').save({name:'فريق النقل المسموح',departmentId:f.departmentB.id})},{timeout:180000})
after(async()=>{if(f)await f.close()})
async function transfer(e){const c=await f.ok('GET',`/attendance/calendar-context?scope=EMPLOYEE&sourceId=${e.id}`);return f.request('PATCH',`/employees/${e.id}`,{branchId:f.B.id,departmentId:f.departmentB.id,teamId:f.teamB.id,calendarChange:{effectiveFrom:new Date().toLocaleDateString('en-CA'),reason,expectedRevision:c.revision,expectedCurrentSourceHash:c.currentSourceHash}})}
async function moveBeforeLock(e,action){
 const boundary=require('../src/payroll/payroll-settlement-boundary'),original=boundary.lockPayrollEmployees,entered=deferred(),gate=deferred();let armed=true,pending,moving,result
 boundary.lockPayrollEmployees=async function(em,ids){if(armed&&ids.includes(e.id)){armed=false;entered.resolve();await gate.promise}return original(em,ids)}
 try{pending=action();assert.equal((await within(entered.promise,5000)).done,true);moving=transfer(e);const moved=await within(moving,5000);assert.equal(moved.done,true);assert.equal(moved.value.status,200,JSON.stringify(moved.value.body));gate.resolve();result=await pending}
 finally{gate.resolve();await Promise.allSettled([pending,moving].filter(Boolean));boundary.lockPayrollEmployees=original}
 return result
}
for(const action of ['create','cancel'])test(`CR30 direct obligation ${action} holds employee lock until save, transfer waits`,{timeout:60000},async t=>{
 const e=await f.employee(9000),body={employeeId:e.id,type:'CREDIT',amount:321.09,category:'manual',label:reason}
 const row=action==='cancel'?await f.ok('POST','/obligations',body,desk):null
 const service=f.app.get(require('../src/payroll/obligations.service').ObligationsService),original=service.assertEmployeeInScope,entered=deferred(),gate=deferred();let armed=true,pending,moving,result
 service.assertEmployeeInScope=async function(user,id,em){const employee=await original.call(this,user,id,em);if(armed&&user.sub===desk.id&&id===e.id&&em?.queryRunner?.isTransactionActive){armed=false;const [lock]=await em.query("SELECT APPLOCK_MODE('public',@0,'Transaction') AS mode",['hr:employee-finance:'+id]);assert.equal(lock.mode,'Exclusive');entered.resolve();await gate.promise}return employee}
 try{
  pending=f.request('POST',action==='create'?'/obligations':`/obligations/${row.id}/cancel`,action==='create'?body:{},desk)
  assert.equal((await within(entered.promise,5000)).done,true)
  moving=transfer(e);assert.equal((await within(moving,250)).done,false,'Actual transfer waits while the authorized financial write owns the lock')
  gate.resolve();result=await pending;assert.equal(result.status,201,JSON.stringify(result.body));assert.equal((await moving).status,200)
 }finally{gate.resolve();await Promise.allSettled([pending,moving].filter(Boolean));service.assertEmployeeInScope=original}
 const stored=await f.repo('EmployeeObligation').findOneByOrFail({id:result.body.id});assert.equal(stored.status,action==='create'?'PENDING':'CANCELLED');assert.equal(Number(stored.amount),321.09)
 assert.equal((await f.request('POST',`/obligations/${stored.id}/cancel`,{},desk)).status,403)
 t.diagnostic(JSON.stringify({case:'financial-write-first',action,exclusiveLock:true,write:201,transfer:200,afterTransfer:403,amount:321.09}))
})
test('CR30 cancellation rereads APPLIED after a real payroll is paid during its early scope check',{timeout:120000},async t=>{
 const e=await f.employee(9000),credit=await f.ok('POST','/obligations',{employeeId:e.id,type:'CREDIT',amount:321.09,category:'manual',label:reason,effectiveDate:'2026-07-01'},desk)
 const run=await f.draft('CR30 pay versus cancel',[e.id]);await f.calculate(run)
 const service=f.app.get(require('../src/payroll/obligations.service').ObligationsService),original=service.assertEmployeeInScope,entered=deferred(),gate=deferred();let armed=true,pending,result
 service.assertEmployeeInScope=async function(...args){const value=await original.apply(this,args);if(armed&&args[0].sub===desk.id&&args[1]===e.id){armed=false;entered.resolve();await gate.promise}return value}
 try{
  pending=f.request('POST',`/obligations/${credit.id}/cancel`,{},desk);assert.equal((await within(entered.promise,5000)).done,true)
  await f.pay(run)
  const paid=await f.repo('EmployeeObligation').findOneByOrFail({id:credit.id});assert.equal(paid.status,'APPLIED')
  gate.resolve();result=await pending;assert.equal(result.status,400,JSON.stringify(result.body));assert.deepEqual(await f.repo('EmployeeObligation').findOneByOrFail({id:credit.id}),paid)
 }finally{gate.resolve();await Promise.allSettled([pending].filter(Boolean));service.assertEmployeeInScope=original}
 const item=await f.repo('PayrollItem').findOneByOrFail({runId:run.id,employeeId:e.id});assert.equal(Number(item.netPay),9321.09)
 t.diagnostic(JSON.stringify({case:'paid-state-recheck',cancelStatus:result.status,ledger:'APPLIED',net:9321.09,expected:9000+321.09}))
})
for(const level of ['employees','teams'])test(`CR30 ${level} allowance targets are reread after actual transfer; named group is atomic`,{timeout:60000},async t=>{
 const department=await f.repo('Department').save({name:'قسم CR30 '+(++seq),branchId:f.A.id}),team=await f.repo('Team').save({name:'فريق CR30 '+seq,departmentId:department.id})
 const moving=await f.employee(9000,f.A,{departmentId:department.id,teamId:team.id}),remaining=await f.employee(9000,f.A,{departmentId:department.id,teamId:team.id})
 const type=await f.ok('POST','/payroll/allowances/types',{name:'بدل CR30 '+seq})
 const body={period:'2026-07',allowanceTypeId:type.id,amount:'150.25',targetLevel:level,branchId:f.A.id,employeeIds:[moving.id,remaining.id],teamIds:[team.id],reason}
 const response=await moveBeforeLock(moving,()=>f.request('POST','/payroll/allowances/grants',body,desk))
 assert.equal(response.status,level==='employees'?400:201,JSON.stringify(response.body))
 const grants=await f.repo('PayrollAllowanceGrant').findBy({allowanceTypeId:type.id}),lines=await f.repo('PayrollAllowanceGrantLine').findBy({allowanceTypeId:type.id})
 if(level==='employees'){assert.equal(grants.length,0);assert.equal(lines.length,0)}
 else{assert.deepEqual(lines.map(x=>x.employeeId),[remaining.id]);assert.equal(response.body.total,150.25);assert.equal(lines[0].branchId,f.A.id)
  const cancelled=await f.ok('POST',`/payroll/allowances/lines/${lines[0].id}/cancel`,{},desk);assert.equal(cancelled.status,'CANCELLED');assert.equal((await f.repo('EmployeeObligation').findOneByOrFail({id:lines[0].obligationId})).status,'CANCELLED')}
 assert.equal(await f.repo('EmployeeObligation').countBy({employeeId:moving.id}),0)
 t.diagnostic(JSON.stringify({case:'allowance-target-recheck',level,transfer:200,status:response.status,employees:lines.map(x=>x.employeeId),remainingExpected:level==='employees'?0:1,total:response.body.total??0}))
})
for(const kind of ['waiver','holiday-create','holiday-update'])test(`CR30 ${kind} named target rejects real transfer without any partial save`,{timeout:60000},async t=>{
 const e=await f.employee(9000),name='CR30 '+kind+' '+(++seq),holiday={name,targetLevel:'employees',branchId:f.A.id,employeeIds:[e.id],dates:['2030-07-05'],multiplier:2}
 let original
 if(kind==='holiday-update')original=(await f.ok('POST','/attendance/holiday-work',{...holiday,targetLevel:'branch'},desk)).order
 const action=()=>kind==='waiver'?f.request('POST','/payroll/overview/waivers',{period:'2026-07',kind:'LATENESS',targetLevel:'employees',branchId:f.A.id,employeeIds:[e.id],reason:name},desk):f.request(kind==='holiday-update'?'PATCH':'POST','/attendance/holiday-work'+(original?'/'+original.id:''),holiday,desk)
 const before=original?await f.repo('HolidayWorkOrder').findOneByOrFail({id:original.id}):null,response=await moveBeforeLock(e,action)
 assert.equal(response.status,400,JSON.stringify(response.body));assert.ok(!JSON.stringify(response.body).includes(f.B.name))
 if(kind==='waiver')assert.equal(await f.repo('PayrollDeductionWaiver').countBy({reason:name}),0)
 else if(original)assert.deepEqual(await f.repo('HolidayWorkOrder').findOneByOrFail({id:original.id}),before)
 else assert.equal(await f.repo('HolidayWorkOrder').countBy({name}),0)
 t.diagnostic(JSON.stringify({case:'named-target-recheck',kind,transfer:200,status:400,noPartialSave:true}))
})
