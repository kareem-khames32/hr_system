'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict');let f
before(async()=>{f=await require('./codex-review-p2v-employment-fixture.cjs')('p2v_independent')},{timeout:180000})
after(async()=>{if(f)await f.close()})
test('P2V A settled return requires trimmed reason and preserves join date and balances',async()=>{
 for(const status of ['SETTLED','CLOSED']){const {emp}=await f.ended(undefined,status);await f.balance(emp,f.year,{taken:4});const before=await f.rows(emp)
  for(const reason of [undefined,'    ','1234',9]){const r=await f.request('POST',`/employees/${emp.id}/reactivate`,{reason},f.archiver);assert.equal(r.status,400);assert.equal(r.body.code,'SETTLED_RETURN_REASON_REQUIRED')}
  const ok=await f.request('POST',`/employees/${emp.id}/reactivate`,{reason:'  Valid explicit continuation  '},f.archiver);assert.equal(ok.status,201);assert.equal(ok.body.joinDate,'2020-01-01');assert.deepEqual(await f.rows(emp),before)
  const hist=await f.ds.query('SELECT reason FROM employee_status_history WHERE employeeId=@0 AND fieldName=@1',[emp.id,'status']);assert.ok(hist.some(r=>r.reason.includes('Valid explicit continuation')))
 }
 const {emp}=await f.ended(undefined,null);assert.equal((await f.request('POST',`/employees/${emp.id}/reactivate`,{},f.archiver)).status,201)
})
test('P2V B old future-dated leave cancellation must not restore days from the new period',async t=>{
 const {emp}=await f.ended(f.year+'-01-31');await f.balance(emp,f.year,{taken:3})
 // Valid historical state: approved before termination for a later date; all its deduction is frozen at rehire.
 const old=await f.repo('Leave').save({employeeId:emp.id,leaveTypeCode:'ANNUAL',fromDate:f.year+'-08-10',toDate:f.year+'-08-12',days:3,status:'APPROVED',isUnpaid:false,period:'FULL'})
 assert.equal((await f.rehire(emp)).status,201)
 await f.ds.transaction(em=>f.leaves.deduct(em,emp.id,'annual',2,f.year+'-09-10'))
 const before=await f.repo('LeaveBalance').findOneByOrFail({employeeId:emp.id,balanceType:'annual',period:f.year})
 const frozenBefore=(await f.rows(emp)).filter(r=>r.period.startsWith('P'))
 const chain=await f.repo('ApprovalChain').save({code:'P2V_CANCEL_AUTO',nameAr:'Synthetic cancellation',isActive:true,autoApprove:true})
 await f.repo('RequestType').save({code:'LEAVE_CANCEL',nameAr:'Synthetic leave cancellation',category:'leaves',destinationHandler:'leave_balance_restore',approvalChainId:chain.id,isActive:true,requiredFields:JSON.stringify(['leaveId','reason'])})
 const cancelled=await f.ok('POST','/requests',{typeCode:'LEAVE_CANCEL',onBehalfEmployeeId:emp.id,payload:{leaveId:old.id,reason:'Cancel leave from old service'},submit:true})
 assert.equal(cancelled.status,'COMPLETED')
 const after=await f.repo('LeaveBalance').findOneByOrFail({employeeId:emp.id,balanceType:'annual',period:f.year})
 assert.equal((await f.repo('Leave').findOneByOrFail({id:old.id})).status,'CANCELLED');assert.deepEqual((await f.rows(emp)).filter(r=>r.period.startsWith('P')),frozenBefore)
 t.diagnostic(JSON.stringify({case:'old-future-leave',beforeTaken:Number(before.taken),afterTaken:Number(after.taken),frozenTaken:Number(frozenBefore[0].taken)}))
 assert.equal(Number(after.taken),Number(before.taken),'Frozen old leave must not refund new-period deductions')
})
test('P2V B hidden old payroll period must not be returned to new-branch employee reader',async t=>{
 const {emp}=await f.ended(),hidden=await f.run({branchId:f.B.id,period:f.last+'-04',startDate:f.last+'-04-01',endDate:f.last+'-04-30',status:'CALCULATED'})
 try{await f.repo('PayrollRunMember').save({runId:hidden.id,employeeId:emp.id,membershipStatus:'INCLUDED',snapshot:{branchId:f.B.id}})
  const visible=await require('../src/payroll/payroll-run-visibility').payrollRunRefVisibility(f.ds.manager,[f.A.id],[hidden.id],[emp.id])
  assert.equal(visible(hidden.id,emp.id),false)
  const r=await f.request('GET',`/employees/${emp.id}/employment-periods`,null,f.hirer)
  const refused=await f.rehire(emp),company=await f.request('GET',`/employees/${emp.id}/employment-periods`,null,f.admin)
  assert.equal(refused.status,400);assert.equal(company.status,200);assert.equal(JSON.stringify(company.body).includes(hidden.period),true)
  t.diagnostic(JSON.stringify({case:'hidden-payroll-period',status:r.status,visible:visible(hidden.id,emp.id),response:r.body,writeRefusal:refused.body,companySees:true}))
  assert.equal(r.status,200);assert.equal(JSON.stringify(r.body).includes(hidden.period),false,'Foreign run period must be redacted, not only its id and name')
 }finally{await f.repo('PayrollRun').update(hidden.id,{status:'CANCELLED'})}
})
test('P2V B freeze failure rolls back employee, employment period and all balances atomically',async()=>{
 const {emp}=await f.ended();await f.balance(emp,'12345678901234567890',{taken:1});const before=await f.rows(emp)
 const response=await f.rehire(emp);assert.ok(response.status>=400);assert.equal((await f.repo('Employee').findOneByOrFail({id:emp.id})).joinDate,'2020-01-01');assert.equal(await f.repo('EmploymentPeriod').count({where:{employeeId:emp.id}}),0);assert.deepEqual(await f.rows(emp),before)
})
