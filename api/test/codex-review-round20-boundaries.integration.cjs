'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
const fixture=require('./codex-review-round20-fixture.cjs')
let f,A,B,DA,DB,hrA,n=0
const today=()=>require('../src/attendance/attendance.service').localDateOf(new Date())
before(async()=>{
  f=await fixture('r20_boundaries')
  A=await f.repo('Branch').save({code:'R20-A',name:'فرع أ',country:'EG'});B=await f.repo('Branch').save({code:'R20-B',name:'فرع ب خاص',country:'SA'})
  DA=await f.repo('Department').save({name:'قسم أ',branchId:A.id});DB=await f.repo('Department').save({name:'قسم ب خاص',branchId:B.id})
  hrA=await f.repo('User').save({email:'hra@r20.invalid',displayName:'معتمد أ',role:'employee',branchId:A.id,passwordHash:'test-only',permissions:JSON.stringify(['approve.hr','employees.edit','employees.view','documents.manage','org.manage'])})
  const chain=await f.repo('ApprovalChain').save({code:'R20-PERSONAL',nameAr:'بيانات شخصية',isActive:true,autoApprove:false})
  await f.repo('ApprovalStep').save({chainId:chain.id,stepOrder:1,approverRole:'hr'})
  await f.repo('RequestType').save({code:'PERSONAL_DATA_UPDATE',nameAr:'تحديث بيانات شخصية',category:'personal_data',destinationHandler:'employee_record',approvalChainId:chain.id,isActive:true,requiredFields:'[]'})
  await f.setting('system.currency','EGP');await f.setting('payroll.salary_evidence_mode','MONTHLY_HISTORY_OR_CURRENT_FILE')
},{timeout:180000})
after(async()=>{if(f)await f.close()})
async function person(branch=A,extra={}){
  n++;const e=await f.repo('Employee').save({employeeCode:`R20-${n}`,fullName:'أحمد علي محمد',branchId:branch.id,departmentId:branch.id===A.id?DA.id:DB.id,joinDate:today(),basicSalary:5000,currency:branch.country==='EG'?'EGP':'SAR',payMethod:'cash',status:'active',isActive:true,nationalId:`ID-${n}`,passportNo:`PASS-${n}`,fingerprintCode:`FP-${n}`,...extra})
  const u=await f.repo('User').save({email:`owner${n}@r20.invalid`,displayName:e.fullName,role:'employee',branchId:branch.id,employeeId:e.id,passwordHash:'test-only',permissions:'[]'})
  return {e,u}
}
const submit=(p,payload)=>f.ok('POST','/requests',{typeCode:'PERSONAL_DATA_UPDATE',submit:true,payload},p.u)
const approve=id=>f.request('POST',`/requests/${id}/act`,{action:'APPROVE'},hrA)
async function blockedPair(actions){
  const runner=f.ds.createQueryRunner(),pending=[];let waits=0
  try{
    await runner.connect();await runner.startTransaction()
    await runner.query("DECLARE @r int; EXEC @r=sys.sp_getapplock @Resource='hr:employees:identity',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=5000; IF @r<0 THROW 59999,'test lock failed',1;")
    for(const action of actions)pending.push(action())
    for(let i=0;i<150;i++){
      waits=Number((await runner.query("SELECT COUNT(*) n FROM sys.dm_tran_locks WHERE resource_database_id=DB_ID() AND resource_type='APPLICATION' AND request_status='WAIT'"))[0].n)
      if(waits>=2)break;await new Promise(r=>setTimeout(r,25))
    }
    assert.ok(waits>=2,'Both API calls must be waiting on actual SQL locks')
    await runner.commitTransaction();return {responses:await Promise.all(pending),waits}
  }finally{if(runner.isTransactionActive)await runner.rollbackTransaction();await Promise.allSettled(pending);await runner.release()}
}

test('CR20 two personal-data approvals cannot clear both identity fields and failed approval leaves no audit',async t=>{
  const p=await person(),r1=await submit(p,{nationalId:null}),r2=await submit(p,{passportNo:null})
  const {responses,waits}=await blockedPair([()=>approve(r1.id),()=>approve(r2.id)])
  assert.deepEqual(responses.map(r=>r.status).sort(),[201,400],JSON.stringify(responses))
  const saved=await f.repo('Employee').findOneByOrFail({id:p.e.id});assert.ok(saved.nationalId||saved.passportNo)
  const rows=await f.repo('Request').findBy({requesterId:p.e.id});assert.deepEqual(rows.map(r=>r.status).sort(),['COMPLETED','UNDER_REVIEW'])
  assert.equal(await f.repo('EmployeeStatusHistory').countBy({employeeId:p.e.id}),1)
  const rejected=rows.find(r=>r.status==='UNDER_REVIEW');assert.equal(await f.repo('RequestApproval').countBy({requestId:rejected.id}),0)
  t.diagnostic(JSON.stringify({case:'personal-two-clears',waits,statuses:responses.map(r=>r.status),oneIdentityRetained:true,auditRolledBack:true}))
})

test('CR20 request approval and HR update share identity serialization with normalized duplicates',async t=>{
  const p=await person(),q=await person(),request=await submit(p,{passportNo:' shared-١٩١٩ '})
  const {responses,waits}=await blockedPair([()=>approve(request.id),()=>f.request('PATCH',`/employees/${q.e.id}`,{passportNo:'SHARED-1919'},hrA)])
  const successful=responses.filter(r=>r.status>=200&&r.status<300);assert.equal(successful.length,1,JSON.stringify(responses))
  assert.ok(responses.every(r=>[200,201,400,409].includes(r.status)),JSON.stringify(responses))
  assert.equal(await f.repo('Employee').countBy({passportNo:'SHARED-1919'}),1)
  t.diagnostic(JSON.stringify({case:'personal-approval-vs-hr-save',waits,statuses:responses.map(r=>r.status),storedCount:1}))
})

test('CR20 ordinary employee cannot probe identity duplication through submitting requests',async t=>{
  const outsider=await person(B,{fullName:'صاحب رقم محجوب خاص'}),p=await person()
  const r=await submit(p,{nationalId:outsider.e.nationalId});assert.equal(r.status,'UNDER_REVIEW')
  const stranger=await f.request('POST',`/requests/${r.id}/act`,{action:'APPROVE'},outsider.u);assert.equal(stranger.status,403)
  const result=await approve(r.id);assert.equal(result.status,400);assert.ok(!JSON.stringify(result.body).includes(outsider.e.fullName));assert.ok(!JSON.stringify(result.body).includes(B.name))
  assert.equal((await f.repo('Employee').findOneByOrFail({id:p.e.id})).nationalId,p.e.nationalId)
  t.diagnostic(JSON.stringify({case:'identity-oracle-and-scope',submission:r.status,unauthorizedApproval:stranger.status,conflictingApproval:result.status,noForeignName:true}))
})

test('CR20 hiring documents and currency context enforce branch and self-service scope',async t=>{
  const p=await person(),outside=await person(B)
  await f.repo('DocType').update({code:'contract'},{requiredForHiring:true,isActive:true})
  const listed=await f.ok('GET','/hiring-documents/missing',null,hrA)
  assert.ok(listed.employees.some(x=>x.employeeId===p.e.id));assert.ok(!listed.employees.some(x=>x.employeeId===outside.e.id))
  const before=await f.repo('HiringDocumentReminder').count()
  for(const foreignId of [outside.e.id,999999]){
    const r=await f.request('POST','/hiring-documents/reminders',{employeeIds:[p.e.id,foreignId]},hrA);assert.equal(r.status,404);assert.equal(r.body.message,'موظف أو أكتر من المختارين غير موجود')
  }
  assert.equal(await f.repo('HiringDocumentReminder').count(),before)
  assert.equal((await f.request('GET','/hiring-documents/missing',null,p.u)).status,403)
  const sent=await f.ok('POST','/hiring-documents/reminders',{employeeIds:[p.e.id,p.e.id]},hrA);assert.equal(sent.sent,1)
  const mine=await f.ok('GET',`/hiring-documents/mine?employeeId=${outside.e.id}`,null,p.u);assert.equal(mine.missingCount,1)
  const ownCurrency=await f.ok('GET','/settings/currency-context',null,p.u)
  assert.deepEqual(Object.keys(ownCurrency).sort(),['branches','defaultCurrency','ownCurrency']);assert.deepEqual(ownCurrency.branches,[{id:A.id,currency:'EGP'}])
  assert.equal((await f.request('GET','/settings/currency-context',null,null)).status,401)
  t.diagnostic(JSON.stringify({case:'new-endpoint-scope',noPartialReminders:true,duplicateRecipientsDeduplicated:true,visibleBranches:ownCurrency.branches}))
})

test('CR20 reminder authorization is checked again when employee moves before insertion',async t=>{
  const p=await person(),day=today()
  const document=await f.ok('POST','/documents',{employeeId:p.e.id,docType:'contract',fileRef:'legacy-complete-before-transfer.pdf'})
  const initial=await f.ok('GET','/hiring-documents/missing',null,hrA)
  assert.ok(!initial.employees.some(row=>row.employeeId===p.e.id),'No document was missing while the employee was in scope')
  const calendar=await f.ok('GET',`/attendance/calendar-context?scope=EMPLOYEE&sourceId=${p.e.id}`)
  await f.ok('POST','/attendance/calendar-context/confirm',{scope:'EMPLOYEE',sourceId:p.e.id,calendarChange:{effectiveFrom:day,reason:'اختبار عزل التذكير',expectedRevision:calendar.revision,expectedCurrentSourceHash:calendar.currentSourceHash}})
  const runner=f.ds.createQueryRunner();let pending,result,transfer,waitObserved=false
  try{
    await runner.connect();await runner.startTransaction()
    await runner.query('SELECT TOP (1) id FROM dbo.employee_documents WITH (TABLOCKX,HOLDLOCK)')
    pending=f.request('POST','/hiring-documents/reminders',{employeeIds:[p.e.id]},hrA)
    for(let i=0;i<150;i++){
      const rows=await runner.query("SELECT COUNT(*) n FROM sys.dm_tran_locks WHERE resource_database_id=DB_ID() AND request_status='WAIT'")
      if(Number(rows[0].n)>0){waitObserved=true;break}await new Promise(r=>setTimeout(r,25))
    }
    assert.equal(waitObserved,true,'Status query must wait after the original scope lookup')
    const current=await f.ok('GET',`/attendance/calendar-context?scope=EMPLOYEE&sourceId=${p.e.id}`)
    transfer=await f.request('PATCH',`/employees/${p.e.id}`,{branchId:B.id,departmentId:DB.id,managerEmployeeId:null,attendanceEffectiveFrom:day,attendanceChangeReason:'نقل أثناء تذكير قديم',calendarChange:{effectiveFrom:day,reason:'نقل أثناء تذكير قديم',expectedRevision:current.revision,expectedCurrentSourceHash:current.currentSourceHash}})
    assert.equal(transfer.status,200,JSON.stringify(transfer.body))
    // The blocking transaction now removes the document in the new branch. The stale caller never had
    // both current scope and a missing document at any instant; this is not just a slow authorized write.
    await runner.query('UPDATE dbo.employee_documents SET fileRef=NULL WHERE id=@0',[document.id])
    await runner.commitTransaction();result=await pending
  }finally{if(runner.isTransactionActive)await runner.rollbackTransaction();if(pending)await pending;await runner.release()}
  const stored=await f.repo('HiringDocumentReminder').countBy({employeeId:p.e.id,sentByUserId:hrA.id})
  t.diagnostic(JSON.stringify({case:'reminder-transfer-race',initialMissing:false,documentRemovedAfterTransfer:true,waitObserved,transferStatus:transfer.status,reminderStatus:result.status,reminderBody:result.body,persistedRemindersOutsideScope:stored}))
  assert.equal(result.status,404,'A reminder must not write after the employee has moved out of scope');assert.equal(stored,0)
})
