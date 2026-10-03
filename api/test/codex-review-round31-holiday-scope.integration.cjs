'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),setup=require('./codex-review-round31-support.cjs')
let f,actorA,actorB
const day='2026-07-17',reason='فحص مستقل لتزامن تغيير فرع أمر دوام عطلة وقرار مالي'
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r});return {promise,resolve}}
async function within(p,ms){let timer;try{return await Promise.race([p.then(value=>({done:true,value})),new Promise(resolve=>{timer=setTimeout(()=>resolve({done:false}),ms)})])}finally{clearTimeout(timer)}}
before(async()=>{f=await setup('r31_holiday_scope');await f.setting('attendance.weekend_days','FRI,SAT');await f.repo('Branch').update([f.A.id,f.B.id],{weekendDays:'FRI,SAT'});actorA=await f.actor('r30-holiday-a',['attendance.manage','payroll.view']);actorB=await f.actor('r30-holiday-b',['attendance.manage','payroll.view'],f.B)},{timeout:180000})
after(async()=>{if(f)await f.close()})
for(const action of ['update','cancel'])test(`CR31 holiday ${action}: old branch must not overwrite or cancel an order reassigned to another branch`,{timeout:120000},async t=>{
 const day=action==='update'?'2026-07-17':'2026-07-10'
 const e=await f.employee(9000,f.B),bodyA={name:'CR31 '+action+' original A',targetLevel:'branch',branchId:f.A.id,dates:[day],multiplier:2}
 await f.repo('Employee').update(e.id,{fingerprintCode:e.employeeCode})
 await f.repo('AttendanceDay').update({employeeId:e.id,date:day},{status:'holiday',checkIn:'08:00',checkOut:'12:00',workMinutes:240})
 const order=(await f.ok('POST','/attendance/holiday-work',bodyA,actorA)).order
 const service=f.app.get(require('../src/attendance/holiday-work.service').HolidayWorkService),method=action==='update'?'normalize':'visibleOrder',original=service[method],entered=deferred(),gate=deferred()
 let armed=true,pending,result,afterCompany,obligationsBefore
 service[method]=async function(...args){const value=await original.apply(this,args);if(armed&&args[0].sub===actorA.id){armed=false;entered.resolve();await gate.promise}return value}
 try{
  pending=f.request(action==='update'?'PATCH':'POST',`/attendance/holiday-work/${order.id}`+(action==='cancel'?'/cancel':''),action==='update'?{...bodyA,name:'CR31 stale A update'}:{reason},actorA)
  assert.equal((await within(entered.promise,5000)).done,true)
  const changed=await f.request('PATCH',`/attendance/holiday-work/${order.id}`,{...bodyA,name:'CR31 private B '+action,branchId:f.B.id},f.admin)
  assert.equal(changed.status,200,JSON.stringify(changed.body))
  assert.equal((await f.request('GET',`/attendance/holiday-work/${order.id}`,null,actorA)).status,404)
  assert.equal((await f.ok('GET',`/attendance/holiday-work/${order.id}`,null,actorB)).order.branchId,f.B.id)
  await f.ok('POST','/attendance/punches/manual',{punches:['08:00','12:00'].map(clock=>({employeeCode:e.employeeCode,timestamp:new Date(`${day}T${clock}:00`).toISOString()})),reason})
  const run=await f.draft('CR31 holiday order B '+action,[e.id]);const calculated=await f.calculate(run)
  const sourceRef=`holiday_work:${order.id}:${day}`
  obligationsBefore=await f.repo('EmployeeObligation').findBy({employeeId:e.id,sourceRef})
  if(!obligationsBefore.length){const d=await f.repo('AttendanceDay').findOneBy({employeeId:e.id,date:day});t.diagnostic(JSON.stringify({case:'holiday-fixture-diagnostic',day:d&&{status:d.status,checkIn:d.checkIn,checkOut:d.checkOut,workMinutes:d.workMinutes},holiday:JSON.parse(calculated.items[0].breakdown||'{}').holidayWork}))}
  assert.equal(obligationsBefore.length,1,'Real payroll creates the source for this branch-B holiday work')
  assert.equal(obligationsBefore[0].status,'PENDING');assert.equal(Number(obligationsBefore[0].amount),300,'9000 / 30 / 8 * 4 hours * 2')
  afterCompany=await f.repo('HolidayWorkOrder').findOneByOrFail({id:order.id})
  gate.resolve();result=await pending
 }finally{gate.resolve();await Promise.allSettled([pending].filter(Boolean));service[method]=original}
 const stored=await f.repo('HolidayWorkOrder').findOneByOrFail({id:order.id}),credit=await f.repo('EmployeeObligation').findOneByOrFail({id:obligationsBefore[0].id})
 t.diagnostic(JSON.stringify({case:'holiday-order-branch-race',action,companyChange:200,oldBranchReadAfterChange:404,oldMutationStatus:result.status,before:{branchId:afterCompany.branchId,status:afterCompany.status},after:{branchId:stored.branchId,status:stored.status},creditBefore:{status:obligationsBefore[0].status,amount:Number(obligationsBefore[0].amount)},creditAfter:{status:credit.status,amount:Number(credit.amount)}}))
 assert.deepEqual(stored,afterCompany,'An old branch permission must not overwrite a now-foreign order')
 assert.deepEqual(credit,obligationsBefore[0],'A refused/out-of-scope operation must not cancel the other branch financial source')
 assert.ok([403,404,409].includes(result.status))
})
test('CR31 holiday scope controls: ordinary foreign write is refused; authorized branch still updates and cancels',{timeout:60000},async t=>{
 const body={name:'CR31 permitted B order',targetLevel:'branch',branchId:f.B.id,dates:[day],multiplier:2}
 const order=(await f.ok('POST','/attendance/holiday-work',body,actorB)).order
 for(const action of ['update','cancel']){const response=await f.request(action==='update'?'PATCH':'POST',`/attendance/holiday-work/${order.id}`+(action==='cancel'?'/cancel':''),action==='update'?{...body,branchId:f.A.id}:{reason},actorA);assert.equal(response.status,404)}
 const changed=await f.ok('PATCH',`/attendance/holiday-work/${order.id}`,{...body,name:'CR31 permitted B updated'},actorB);assert.equal(changed.order.name,'CR31 permitted B updated')
 const cancelled=await f.ok('POST',`/attendance/holiday-work/${order.id}/cancel`,{reason},actorB);assert.equal(cancelled.order.status,'CANCELLED')
 t.diagnostic(JSON.stringify({case:'holiday-order-controls',foreignUpdate:404,foreignCancel:404,authorizedUpdate:200,authorizedCancel:201}))
})
