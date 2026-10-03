'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
const setup=require('./codex-review-round29-support.cjs')
let f,oldBranch,newBranch
const reason='مراجعة مستقلة لنقل موظف أثناء كتابة مالية في دفتر المستحقات'
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r});return {promise,resolve}}
async function within(p,ms){let timer;try{return await Promise.race([p.then(value=>({done:true,value})),new Promise(resolve=>{timer=setTimeout(()=>resolve({done:false}),ms)})])}finally{clearTimeout(timer)}}
before(async()=>{f=await setup('r29_obligations');oldBranch=await f.actor('r29-old-branch',['payroll.calculate']);newBranch=await f.actor('r29-new-branch',['payroll.calculate','payroll.view'],f.B)},{timeout:180000})
after(async()=>{if(f)await f.close()})
async function transfer(e){const context=await f.ok('GET',`/attendance/calendar-context?scope=EMPLOYEE&sourceId=${e.id}`);return f.request('PATCH',`/employees/${e.id}`,{branchId:f.B.id,calendarChange:{effectiveFrom:new Date().toLocaleDateString('en-CA'),reason,expectedRevision:context.revision,expectedCurrentSourceHash:context.currentSourceHash}})}
for(const action of ['create','cancel'])test(`CR29 obligation ${action}: current-branch financial permission must survive a real transfer before the write`,{timeout:60000},async t=>{
 const e=await f.employee(9000),body={employeeId:e.id,type:'CREDIT',amount:321.09,label:reason,category:'manual'}
 const row=action==='cancel'?await f.ok('POST','/obligations',body):null
 const service=f.app.get(require('../src/payroll/obligations.service').ObligationsService),original=service.assertEmployeeInScope
 const entered=deferred(),gate=deferred();let armed=true,writing,moving,result,moved,beforeFromNew
 service.assertEmployeeInScope=async function(user,id){
  const employee=await original.call(this,user,id)
  // Hold after the real scope read, before save. Only the old-branch financial command is delayed.
  if(armed&&user.sub===oldBranch.id&&id===e.id){armed=false;entered.resolve();await gate.promise}
  return employee
 }
 try{
  writing=f.request('POST',action==='create'?'/obligations':`/obligations/${row.id}/cancel`,action==='create'?body:{},oldBranch)
  assert.equal((await within(entered.promise,5000)).done,true)
  moving=transfer(e);const completed=await within(moving,5000)
  if(completed.done){
   moved=completed.value;assert.equal(moved.status,200,JSON.stringify(moved.body))
   assert.equal((await f.repo('Employee').findOneByOrFail({id:e.id})).branchId,f.B.id)
   beforeFromNew=await f.ok('GET',`/obligations/employee/${e.id}`,null,newBranch)
  }
  gate.resolve();[result,moved]=await Promise.all([writing,moving]);assert.equal(moved.status,200)
 }finally{gate.resolve();await Promise.allSettled([writing,moving].filter(Boolean));service.assertEmployeeInScope=original}
 const afterFromNew=await f.ok('GET',`/obligations/employee/${e.id}`,null,newBranch)
 const staleAgain=await f.request('POST',action==='create'?'/obligations':`/obligations/${row.id}/cancel`,action==='create'?body:{},oldBranch)
 assert.equal(staleAgain.status,403)
 t.diagnostic(JSON.stringify({case:'obligation-transfer-race',action,realTransferStatus:moved.status,transferCommittedFirst:!!beforeFromNew,oldBranchWriteStatus:result.status,oldBranchReply:result.body,newBranchBefore:beforeFromNew?.map(x=>({id:x.id,status:x.status,amount:Number(x.amount)})),newBranchAfter:afterFromNew.map(x=>({id:x.id,status:x.status,amount:Number(x.amount)})),ordinaryPostTransferDenied:staleAgain.status}))
 if(beforeFromNew){
  assert.deepEqual(afterFromNew,beforeFromNew,'Once the real transfer commits, stale old-branch permission must not change a financial source')
  assert.ok([403,404,409].includes(result.status))
 }else assert.equal(result.status,201,'Serialization before transfer is also valid')
})
test('CR29 obligation controls: allowed create/cancel and explicit foreign-branch refusal',{timeout:60000},async t=>{
 const e=await f.employee(9000,f.B),body={employeeId:e.id,type:'CREDIT',amount:321.09,label:reason,category:'manual'}
 const denied=await f.request('POST','/obligations',body,oldBranch);assert.equal(denied.status,403)
 const row=await f.ok('POST','/obligations',body,newBranch);assert.equal(Number(row.amount),321.09)
 const foreign=await f.request('POST',`/obligations/${row.id}/cancel`,{},oldBranch);assert.equal(foreign.status,403)
 const cancelled=await f.ok('POST',`/obligations/${row.id}/cancel`,{},newBranch);assert.equal(cancelled.status,'CANCELLED')
 t.diagnostic(JSON.stringify({case:'obligation-controls',create:201,foreignCreate:403,foreignCancel:403,authorizedCancel:201}))
})
