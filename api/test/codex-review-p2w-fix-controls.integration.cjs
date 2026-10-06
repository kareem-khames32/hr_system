'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict');let f
const latch=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve}}
const bounded=async(p,label)=>{let timer;try{return await Promise.race([p,new Promise((_,r)=>timer=setTimeout(()=>r(new Error(label)),20000))])}finally{clearTimeout(timer)}}
before(async()=>{f=await require('./codex-review-p2w-employment-fixture.cjs')('p2w_fix_controls')},{timeout:180000})
after(async()=>{if(f)await f.close()})
test('P2W old approved leave must be cancelled before rehire and must refund only the old row',async t=>{
 const {emp}=await f.ended(f.year+'-01-31');await f.balance(emp,f.year,{taken:3})
 const old=await f.repo('Leave').save({employeeId:emp.id,leaveTypeCode:'ANNUAL',fromDate:f.year+'-08-10',toDate:f.year+'-08-12',days:3,status:'APPROVED',isUnpaid:false,period:'FULL'})
 const refused=await f.rehire(emp);assert.equal(refused.status,400);assert.equal(refused.body.code,'REHIRE_FUTURE_LEAVES')
 assert.equal((await f.repo('Employee').findOneByOrFail({id:emp.id})).joinDate,'2020-01-01')
 const revoke=await f.request('POST',`/leaves/${old.id}/revoke`,{reason:'Resolve old-service leave before rehire'},f.admin);assert.equal(revoke.status,201,JSON.stringify(revoke.body))
 assert.equal((await f.repo('Leave').findOneByOrFail({id:old.id})).status,'CANCELLED')
 assert.equal(Number((await f.rows(emp))[0].taken),0)
 assert.equal((await f.rehire(emp)).status,201)
 await assert.rejects(f.leaves.assertSufficient(emp.id,'annual',1,f.year+'-01-20'),/فترة خدمة مقفولة/)
 await assert.rejects(f.ds.transaction(em=>f.leaves.deduct(em,emp.id,'annual',1,f.year+'-01-20')),/فترة خدمة مقفولة/)
 await f.ds.transaction(em=>f.leaves.deduct(em,emp.id,'annual',2,f.year+'-09-10'))
 const rows=await f.rows(emp),current=rows.find(r=>r.period===f.year&&r.balanceType==='annual'),frozen=rows.find(r=>r.period==='P1:'+f.year)
 assert.equal(Number(current.taken),2);assert.equal(Number(frozen.taken),0)
 t.diagnostic(JSON.stringify({case:'old-future-leave-closure',initial:refused.body.code,newTaken:Number(current.taken),oldTaken:Number(frozen.taken)}))
})
test('P2W rollover that read its source before rehire must reevaluate it after the employee lock',async t=>{
 const {emp}=await f.ended(f.last+'-12-31');await f.balance(emp,f.last)
 const original=f.leaves.rolloverRow,entered=latch(),release=latch();let job
 f.leaves.rolloverRow=async function(em,id,employeeId,...rest){if(employeeId===emp.id){entered.resolve();await release.promise}return original.call(this,em,id,employeeId,...rest)}
 try{
  job=f.leaves.rollover(f.last,[f.A.id]);job.catch(()=>{})
  await bounded(entered.promise,'rollover source barrier not reached')
  assert.equal((await f.rehire(emp)).status,201)
  release.resolve();await bounded(job,'rollover did not finish')
  const current=await f.repo('LeaveBalance').findOneByOrFail({employeeId:emp.id,period:f.year,balanceType:'annual'})
  assert.equal(Number(current.openingDays),0)
  t.diagnostic(JSON.stringify({case:'rollover-source-reread',openingDays:Number(current.openingDays)}))
 }finally{release.resolve();if(job)await job.catch(()=>{});f.leaves.rolloverRow=original}
})
test('P2W hidden payroll end cannot be inferred by probing rehire dates, while company reader retains it',async t=>{
 const {emp}=await f.ended(),visible=await f.run(),hidden=await f.run({branchId:f.B.id,endDate:f.last+'-12-31'})
 try{
  await f.repo('PayrollRunMember').save({runId:visible.id,employeeId:emp.id,membershipStatus:'INCLUDED',snapshot:{branchId:f.A.id}})
  await f.repo('PayrollRunMember').save({runId:hidden.id,employeeId:f.far.id,membershipStatus:'INCLUDED',snapshot:{branchId:f.B.id}})
  const limited=await f.request('GET',`/employees/${emp.id}/employment-periods`,null,f.hirer),company=await f.request('GET',`/employees/${emp.id}/employment-periods`,null,f.admin)
  assert.equal(limited.status,200);assert.equal(limited.body.rehire.code,'REHIRE_HIDDEN_RUN');assert.equal(limited.body.rehire.minStartDate,null)
  assert.equal(company.status,200);assert.equal(company.body.rehire.minStartDate,f.year+'-01-01')
  const replies=[]
  for(const day of [f.last+'-07-01',f.year+'-02-01',f.next+'-08-01']){const r=await f.rehire(emp,day);assert.equal(r.status,400);assert.equal(r.body.code,'REHIRE_HIDDEN_RUN');replies.push(r.body)}
  assert.deepEqual(replies[0],replies[1]);assert.deepEqual(replies[1],replies[2]);assert.equal(JSON.stringify([limited.body,...replies]).includes(hidden.endDate),false)
  t.diagnostic(JSON.stringify({case:'hidden-end-oracle',limited:limited.body.rehire,companyMinimum:company.body.rehire.minStartDate,identicalDateRefusals:true}))
 }finally{await f.repo('PayrollRun').update(visible.id,{status:'CANCELLED'});await f.repo('PayrollRun').update(hidden.id,{status:'CANCELLED'})}
})
