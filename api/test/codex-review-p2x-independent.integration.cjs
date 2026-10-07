'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict');let f
const latch=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve}}
const bounded=async(p,label)=>{let timer;try{return await Promise.race([p,new Promise((_,r)=>timer=setTimeout(()=>r(new Error(label)),20000))])}finally{clearTimeout(timer)}}
const waitBlocked=async()=>{for(let i=0;i<80;i++){const rows=await f.ds.query("SELECT session_id FROM sys.dm_exec_requests WHERE database_id=DB_ID() AND session_id<>@@SPID AND wait_type LIKE 'LCK%'");if(rows.length)return;await new Promise(r=>setTimeout(r,100))}throw Error('SQL lock waiter was not observed')}
before(async()=>{f=await require('./codex-review-p2x-employment-fixture.cjs')('p2x_independent')},{timeout:180000})
after(async()=>{if(f)await f.close()})
test('P2X profile opening balance and contract form one ordered operation before rehire',async t=>{
 const {emp}=await f.ended();await f.balance(emp,f.year)
 const service=f.app.get(require('../src/employees/employees.service').EmployeesService),original=service.openingBalanceIn,entered=latch(),release=latch();let edit,hire
 service.openingBalanceIn=async function(em,id,...rest){if(id===emp.id){assert.equal(em.queryRunner.isTransactionActive,true);entered.resolve();await release.promise}return original.call(this,em,id,...rest)}
 try{
  edit=f.request('PATCH',`/employees/${emp.id}`,{openingBalanceDays:10,openingBalanceExpiry:f.next+'-12-31',contractNumber:'OLD-SERVICE-CONTRACT'},f.admin);edit.catch(()=>{})
  await bounded(Promise.race([entered.promise,edit.then(r=>{throw Error('Update missed transaction barrier '+r.status)})]),'opening barrier')
  hire=f.rehire(emp);hire.catch(()=>{});await waitBlocked()
  release.resolve();assert.equal((await edit).status,200);assert.equal((await hire).status,201)
  const rows=await f.rows(emp),current=rows.find(r=>r.period===f.year&&r.balanceType==='annual'),frozen=rows.find(r=>r.period==='P1:'+f.year)
  assert.equal(Number(current.openingDays),0);assert.equal(Number(frozen.openingDays),10)
  assert.equal((await f.repo('Employee').findOneByOrFail({id:emp.id})).contractNumber,null)
  t.diagnostic(JSON.stringify({case:'opening-order',current:0,frozen:10,sqlWaitObserved:true}))
 }finally{release.resolve();await Promise.allSettled([edit,hire].filter(Boolean));service.openingBalanceIn=original}
})
test('P2X an old balance check crossing rehire remains read-only',async t=>{
 await f.repo('LeaveType').update(f.annual.id,{renewalBasis:'HIRE_ANNIVERSARY'});await f.setting('leave.accrual_mode','daily')
 const {emp}=await f.ended(undefined,'CLOSED',{joinDate:'2020-09-01'}),reference=await f.employee(f.A,{joinDate:f.year+'-02-01'});await f.balance(reference,f.year)
 const original=f.leaves.entryAt,entered=latch(),release=latch();let job
 f.leaves.entryAt=async function(repo,id,...rest){if(id===emp.id){entered.resolve();await release.promise}return original.call(this,repo,id,...rest)}
 try{
  job=f.leaves.assertSufficient(emp.id,'annual',1,f.next+'-01-31');job.catch(()=>{});await bounded(entered.promise,'read-only gate barrier')
  assert.equal((await f.rehire(emp)).status,201);const before=await f.rows(emp);release.resolve();await job
  assert.deepEqual(await f.rows(emp),before)
  await f.ds.transaction(em=>f.leaves.deduct(em,emp.id,'annual',1,f.next+'-01-31'))
  await f.ds.transaction(em=>f.leaves.deduct(em,reference.id,'annual',1,f.next+'-01-31'))
  const trim=({employeeId,...view})=>view
  assert.deepEqual(trim(await f.leaves.balanceOf(emp.id,'annual',f.next+'-01-31')),trim(await f.leaves.balanceOf(reference.id,'annual',f.next+'-01-31')))
  assert.equal((await f.rows(emp)).some(r=>r.period===f.year+'-09-01'),false)
  t.diagnostic(JSON.stringify({case:'read-only-old-context',oldAnniversaryRow:false,sameAsReference:true}))
 }finally{release.resolve();if(job)await job.catch(()=>{});f.leaves.entryAt=original}
})
test('P2X old pending approval rechecks after rehire and leaves no row on failure or retry',async t=>{
 const {Repository}=require('../node_modules/typeorm')
 const {emp}=await f.ended(undefined,'CLOSED',{joinDate:'2020-09-01'}),owner=await f.account(emp)
 const type=await f.repo('RequestType').save({code:'P2X_ANNUAL',nameAr:'Synthetic annual',category:'leaves',destinationHandler:'leave_calendar_balance',affectsBalance:true,isActive:true})
 const req=await f.repo('Request').save({typeCode:'LEAVE',definitionCode:type.code,requesterId:emp.id,createdByUserId:owner.id,branchId:f.A.id,status:'UNDER_REVIEW',currentStep:1,
  resolvedSteps:JSON.stringify([{stepOrder:1,role:'hr',approverEmployeeId:null}]),payload:JSON.stringify({leaveTypeCode:'ANNUAL',fromDate:f.next+'-01-29',toDate:f.next+'-01-31',days:3,reason:'Pending old-service request'})})
 const original=Repository.prototype.save,entered=latch(),release=latch();let job,once=false
 Repository.prototype.save=async function(row,...rest){if(!once&&this.metadata.name==='Leave'&&row.employeeId===emp.id){once=true;entered.resolve();await release.promise}return original.call(this,row,...rest)}
 try{
  job=f.request('POST',`/requests/${req.id}/act`,{action:'APPROVE'},f.admin);job.catch(()=>{})
  await bounded(Promise.race([entered.promise,job.then(r=>{throw Error('Approval missed barrier '+JSON.stringify(r))})]),'approval barrier')
  assert.equal(await f.repo('LeaveBalance').countBy({employeeId:emp.id}),0)
  assert.equal((await f.rehire(emp)).status,201);const before=await f.rows(emp)
  release.resolve();const first=await job,retry=await f.request('POST',`/requests/${req.id}/act`,{action:'APPROVE'},f.admin)
  assert.equal(first.status,400);assert.equal(retry.status,400);assert.match(first.body.message,/1\.67/)
  assert.deepEqual(await f.rows(emp),before);assert.equal(await f.repo('Leave').countBy({requestId:req.id}),0)
  assert.equal(await f.repo('RequestApproval').countBy({requestId:req.id}),0)
  t.diagnostic(JSON.stringify({case:'approval-after-rehire',first:first.body,retry:retry.body,noLeaveOrBalanceOrApproval:true}))
 }finally{release.resolve();if(job)await job.catch(()=>{});Repository.prototype.save=original}
})
