'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),setup=require('./codex-review-round32-support.cjs')
let f,actorA,actorB,seq=0
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r});return {promise,resolve}}
async function within(p,ms){let timer;try{return await Promise.race([p.then(value=>({done:true,value})),new Promise(resolve=>{timer=setTimeout(()=>resolve({done:false}),ms)})])}finally{clearTimeout(timer)}}
before(async()=>{f=await setup('r32_independent');await f.setting('attendance.weekend_days','FRI,SAT');await f.repo('Branch').update([f.A.id,f.B.id],{weekendDays:'FRI,SAT'});actorA=await f.actor('r32-reader-a',['attendance.manage','payroll.view']);actorB=await f.actor('r32-reader-b',['attendance.manage','payroll.view'],f.B)},{timeout:180000})
after(async()=>{if(f)await f.close()})
const holidayBody=name=>({name,targetLevel:'branch',branchId:f.A.id,dates:['2030-07-05'],multiplier:2})
for(const phase of ['after-commit','after-reload'])test(`CR32 holiday update reply ${phase}: a later foreign name must never enter the success fallback`,{timeout:60000},async t=>{
 const n=++seq,body=holidayBody('CR32 known original '+n),order=(await f.ok('POST','/attendance/holiday-work',body,actorA)).order
 const submittedName='CR32 known saved '+n,foreignName='CR32 PRIVATE B ONLY '+n
 const service=f.app.get(require('../src/attendance/holiday-work.service').HolidayWorkService)
 const target=phase==='after-commit'?service.em:service,method=phase==='after-commit'?'transaction':'detailAfterWrite',original=target[method]
 const entered=deferred(),gate=deferred();let armed=true,pending,result
 target[method]=async function(...args){
  const match=phase==='after-commit'||(args[0]?.sub===actorA.id&&args[1]?.id===order.id)
  if(armed&&match){
   armed=false
   if(phase==='after-commit'){const value=await original.apply(this,args);entered.resolve();await gate.promise;return value}
   entered.resolve();await gate.promise
  }
  return original.apply(this,args)
 }
 try{
  pending=f.request('PATCH',`/attendance/holiday-work/${order.id}`,{...body,name:submittedName},actorA)
  assert.equal((await within(entered.promise,5000)).done,true)
  assert.equal((await f.repo('HolidayWorkOrder').findOneBy({id:order.id})).name,submittedName,'The branch-A edit really committed before the relocation')
  const moved=await f.request('PATCH',`/attendance/holiday-work/${order.id}`,{...body,branchId:f.B.id,name:foreignName},f.admin)
  assert.equal(moved.status,200,JSON.stringify(moved.body))
  assert.equal((await f.request('GET',`/attendance/holiday-work/${order.id}`,null,actorA)).status,404)
  gate.resolve();result=await pending
 }finally{gate.resolve();await Promise.allSettled([pending].filter(Boolean));target[method]=original}
 assert.equal(result.status,200,JSON.stringify(result.body));assert.equal(result.body.order.movedOutOfScope,true)
 assert.equal((await f.repo('HolidayWorkOrder').findOneBy({id:order.id})).name,foreignName)
 t.diagnostic(JSON.stringify({case:'holiday-response-after-move',phase,responseStatus:result.status,getOldBranch:404,response:result.body,foreignNamePresent:JSON.stringify(result.body).includes(foreignName),submittedName,foreignName}))
 assert.ok(!JSON.stringify(result.body).includes(foreignName),'The success response must not disclose a name saved later in the other branch')
 assert.equal(result.body.order.id,order.id);assert.equal(result.body.order.status,'ACTIVE')
 if(result.body.order.name!==undefined)assert.equal(result.body.order.name,submittedName)
})
test('CR32 ordinary holiday update and cancel retain successful scoped detail replies',{timeout:60000},async()=>{
 const body=holidayBody('CR32 ordinary'),order=(await f.ok('POST','/attendance/holiday-work',body,actorA)).order
 const updated=await f.ok('PATCH',`/attendance/holiday-work/${order.id}`,{...body,name:'CR32 ordinary updated'},actorA)
 const {overtime,...view}=updated;assert.deepEqual(view,await f.ok('GET',`/attendance/holiday-work/${order.id}`,null,actorA))
 const cancelled=await f.ok('POST',`/attendance/holiday-work/${order.id}/cancel`,{reason:'اختبار إلغاء مسموح'},actorA)
 assert.equal(cancelled.order.status,'CANCELLED');assert.deepEqual(cancelled,await f.ok('GET',`/attendance/holiday-work/${order.id}`,null,actorA))
})
async function period(){return f.ok('POST','/attendance/overtime-periods',{name:'CR32 period '+(++seq),branchId:f.A.id,fromDate:'2030-07-01',toDate:'2030-07-31',effect:'OPEN',autoApprove:false},actorA)}
for(const action of ['update','delete'])test(`CR32 overtime period ${action}: actual company relocation wins before row lock`,{timeout:60000},async t=>{
 const row=await period(),service=f.app.get(require('../src/attendance/attendance.service').AttendanceService),repo=service.overtimePeriods,original=repo.findOne
 const entered=deferred(),gate=deferred();let armed=true,pending,result,saved
 repo.findOne=async function(options){const value=await original.call(this,options);if(armed&&options.where?.id===row.id&&!options.lock){armed=false;entered.resolve();await gate.promise}return value}
 try{
  pending=f.request(action==='update'?'PATCH':'DELETE',`/attendance/overtime-periods/${row.id}`,action==='update'?{name:'stale A period',effect:'CLOSED'}:undefined,actorA)
  assert.equal((await within(entered.promise,5000)).done,true)
  const changed=await f.request('PATCH',`/attendance/overtime-periods/${row.id}`,{branchId:f.B.id,name:'CR32 private B period'},f.admin)
  assert.equal(changed.status,200,JSON.stringify(changed.body));saved=await f.repo('OvertimePeriod').findOneByOrFail({id:row.id})
  gate.resolve();result=await pending
 }finally{gate.resolve();await Promise.allSettled([pending].filter(Boolean));repo.findOne=original}
 assert.equal(result.status,403,JSON.stringify(result.body));assert.deepEqual(await f.repo('OvertimePeriod').findOneByOrFail({id:row.id}),saved)
 assert.ok(!JSON.stringify(result.body).includes(saved.name));assert.ok(!(await f.ok('GET','/attendance/overtime-periods',null,actorA)).some(p=>p.id===row.id))
 t.diagnostic(JSON.stringify({case:'period-company-first',action,companyUpdate:200,oldCommand:403,stateUnchanged:true}))
})
for(const action of ['update','delete'])test(`CR32 overtime period ${action}: row lock serializes a later company edit`,{timeout:60000},async t=>{
 const row=await period(),{Repository}=require('typeorm'),original=Repository.prototype.findOne,entered=deferred(),gate=deferred();let armed=true,pending,moving,result,changed
 Repository.prototype.findOne=async function(options){const value=await original.call(this,options);if(armed&&this.metadata.name==='OvertimePeriod'&&options?.where?.id===row.id&&options.lock?.mode==='pessimistic_write'){armed=false;assert.equal(this.manager.queryRunner?.isTransactionActive,true);entered.resolve();await gate.promise}return value}
 try{
  pending=f.request(action==='update'?'PATCH':'DELETE',`/attendance/overtime-periods/${row.id}`,action==='update'?{name:'CR32 saved A period',effect:'CLOSED'}:undefined,actorA)
  assert.equal((await within(entered.promise,5000)).done,true)
  moving=f.request('PATCH',`/attendance/overtime-periods/${row.id}`,{branchId:f.B.id,name:'CR32 later B period'},f.admin)
  assert.equal((await within(moving,250)).done,false,'The real company update must wait for the period row')
  gate.resolve();[result,changed]=await Promise.all([pending,moving])
 }finally{gate.resolve();await Promise.allSettled([pending,moving].filter(Boolean));Repository.prototype.findOne=original}
 assert.equal(result.status,200,JSON.stringify(result.body))
 if(action==='delete'){assert.equal(changed.status,404);assert.equal(await f.repo('OvertimePeriod').countBy({id:row.id}),0)}
 else{assert.equal(changed.status,200);assert.equal(result.body.name,'CR32 saved A period');assert.equal(result.body.branchId,f.A.id);assert.equal((await f.repo('OvertimePeriod').findOneByOrFail({id:row.id})).branchId,f.B.id)}
 t.diagnostic(JSON.stringify({case:'period-old-command-first',action,command:result.status,laterCompany:changed.status,responseFromOwnWrite:true}))
})
