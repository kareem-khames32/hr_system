'use strict'
// Real Nest controllers/guards and SQL on the disposable fixture; no product edits.
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
const setup=require('./codex-review-round29-support.cjs')
let f,desk,hr,seq=0
const reason='قرار اختبار مستقل للتحقق من حفظ الأثر المالي والرد في معاملة واحدة'
const today=()=>new Date().toLocaleDateString('en-CA')
const month=(offset=0)=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth()+offset,1,12).toLocaleDateString('en-CA').slice(0,7)}
before(async()=>{
 f=await setup('r29_independent')
 desk=await f.actor('r29-desk',['bonuses.manage','deductions.manage'])
 hr=await f.actor('r29-hr',['bonuses.manage','deductions.manage','bonuses.approve','deductions.approve','approve.hr','requests.view_all'])
},{timeout:180000})
after(async()=>{if(f)await f.close()})
function cfg(kind){return kind==='bonus'?{prefix:'bonuses',entity:'BonusRequest',event:'BonusRequestEvent',key:'bonusRequestId',typeKey:'bonusTypeId',service:()=>require('../src/payroll/bonuses.service').BonusesService}:{prefix:'deductions',entity:'DeductionRequest',event:'DeductionRequestEvent',key:'deductionRequestId',typeKey:'deductionTypeId',service:()=>require('../src/payroll/typed-deductions.service').TypedDeductionsService}}
async function proposed(kind,actor=desk){
 const c=cfg(kind),employee=await f.employee(9000)
 const type=await f.ok('POST',`/${c.prefix}/types`,{code:'CR29_'+kind.toUpperCase()+'_'+(++seq),nameAr:'نوع مراجعة '+seq,calcMethod:'FIXED_AMOUNT',creatorScopes:['HR'],approvalSteps:['HR'],...(kind==='deduction'?{category:'PERFORMANCE'}:{})})
 const row=await f.ok('POST',`/${c.prefix}`,{employeeId:employee.id,[c.typeKey]:type.id,inputValue:'123.45',reason,targetPeriod:month(),confirmNotDuplicate:true,...(kind==='deduction'?{incidentDate:today()}:{})},actor)
 return {c,employee,row}
}
async function state(c,id){return {row:await f.repo(c.entity).findOneByOrFail({id}),events:await f.repo(c.event).find({where:{requestId:id},order:{id:'ASC'}}),ledger:await f.repo('EmployeeObligation').find({where:{[c.key]:id},order:{id:'ASC'}})}}
for(const kind of ['bonus','deduction']){
 test(`CR29 ${kind}: immediate HR and separate approval give exactly one 123.45 obligation`,{timeout:60000},async t=>{
  const instant=await proposed(kind,hr),manual=await proposed(kind,desk),c=instant.c
  assert.equal(instant.row.status,'APPROVED');assert.equal(manual.row.status,'IN_APPROVAL')
  const approved=await f.ok('POST',`/${c.prefix}/${manual.row.id}/approve`,{expectedRevision:manual.row.revision,reason},hr)
  assert.equal(approved.status,'APPROVED')
  for(const x of [instant,manual]){
   const s=await state(c,x.row.id);assert.equal(s.ledger.length,1);assert.equal(Number(s.ledger[0].amount),123.45)
   assert.equal(s.ledger[0].status,'PENDING');assert.equal(s.ledger[0].type,kind==='bonus'?'CREDIT':'DEBIT')
   assert.ok(JSON.parse(s.row.steps).every(step=>step.status==='APPROVED'))
   const retry=await f.request('POST',`/${c.prefix}/${x.row.id}/approve`,{expectedRevision:s.row.revision,reason},hr)
   assert.equal(retry.status,409);assert.equal((await state(c,x.row.id)).ledger.length,1)
  }
  const {notice,...view}=approved;assert.deepEqual(view,await f.ok('GET',`/${c.prefix}/${manual.row.id}`,null,hr))
  t.diagnostic(JSON.stringify({case:'instant-manual-equality',kind,amount:123.45,eachObligations:1,replay:409,responseEqualsDetail:true}))
 })
 for(const action of ['approve','reject','cancel'])test(`CR29 ${kind} ${action}: response under finance lock, response failure rolls back, retry returns stored detail`,{timeout:60000},async t=>{
  const {c,employee,row}=await proposed(kind,action==='cancel'?hr:desk),before=await state(c,row.id)
  const service=f.app.get(c.service()),original=service.detailIn;let observed=false
  service.detailIn=async function(em,user,id){
   const view=await original.call(this,em,user,id)
   if(id===row.id){
    assert.equal(em.queryRunner?.isTransactionActive,true)
    const [lock]=await em.query("SELECT APPLOCK_MODE('public',@0,'Transaction') AS held",['hr:employee-finance:'+employee.id])
    assert.equal(lock.held,'Exclusive');assert.ok(view);observed=true
    throw new (require('@nestjs/common').ForbiddenException)('CR29 injected response failure')
   }
   return view
  }
  let refused
  try{refused=await f.request('POST',`/${c.prefix}/${row.id}/${action}`,{expectedRevision:row.revision,reason},hr)}finally{service.detailIn=original}
  assert.equal(observed,true);assert.equal(refused.status,403);assert.deepEqual(await state(c,row.id),before,'Response failure must roll back the request, events and obligation')
  const success=await f.ok('POST',`/${c.prefix}/${row.id}/${action}`,{expectedRevision:row.revision,reason},hr)
  const {notice,...withoutNotice}=success
  assert.deepEqual(action==='approve'?withoutNotice:success,await f.ok('GET',`/${c.prefix}/${row.id}`,null,hr))
  const after=await state(c,row.id);assert.equal(after.row.status,{approve:'APPROVED',reject:'REJECTED',cancel:'CANCELLED'}[action])
  assert.equal(after.ledger.length,action==='reject'?0:1)
  if(after.ledger.length)assert.equal(after.ledger[0].status,action==='cancel'?'CANCELLED':'PENDING')
  t.diagnostic(JSON.stringify({case:'response-atomicity',kind,action,exclusiveEmployeeLock:true,failureRolledBack:true,retry:201,responseEqualsDetail:true}))
 })
}

async function transfer(employee){
 const context=await f.ok('GET',`/attendance/calendar-context?scope=EMPLOYEE&sourceId=${employee.id}`)
 await f.ok('PATCH',`/employees/${employee.id}`,{branchId:f.B.id,calendarChange:{effectiveFrom:today(),reason,expectedRevision:context.revision,expectedCurrentSourceHash:context.currentSourceHash}})
}
for(const kind of ['early','defer'])test(`CR29 ${kind} loan request: transfer before final approval cannot execute; fresh branch request executes once`,{timeout:90000},async t=>{
 const n=++seq,employee=await f.employee(9000),owner=await f.actor('r29-owner-'+n,[],f.A,{employeeId:employee.id})
 const hrB=await f.actor('r29-hr-b-'+n,['approve.hr','requests.view_all','requests.create_on_behalf','payroll.view'],f.B)
 const chain=await f.repo('ApprovalChain').save({code:'CR29_LOAN_'+n,nameAr:'سلسلة مراجعة السلفة '+n,isActive:true,autoApprove:false})
 await f.repo('ApprovalStep').save({chainId:chain.id,stepOrder:1,approverRole:'hr'})
 const typeCode=kind==='early'?'EARLY_LOAN_SETTLEMENT':'LOAN_INSTALLMENT_DEFER'
 const loanType=await f.repo('RequestType').findOneBy({code:'LOAN'})
 await f.repo('RequestType').save({...loanType,code:'LOAN',nameAr:'سلفة المراجعة',category:'financial',destinationHandler:'loans_installments',requiredFields:'["amount","months"]',approvalChainId:chain.id,isActive:true})
 await f.repo('RequestType').save({code:typeCode,nameAr:'حركة مراجعة السلفة',category:'financial',destinationHandler:kind==='early'?'loan_early_settlement':'loan_installment_defer',requiredFields:JSON.stringify(kind==='early'?['loanId']:['loanId','installmentId','toPeriod','reason']),approvalChainId:chain.id,isActive:true})
 const [loan]=await f.ds.query("INSERT loans(employeeId,amount,status) OUTPUT INSERTED.id VALUES(@0,CAST('900.00' AS decimal(18,2)),N'APPROVED')",[employee.id])
 const [installment]=await f.ds.query("INSERT loan_installments(loanId,dueDate,amount,paid,paidAmount,financialStatus,financialRevision,originalDueDate) OUTPUT INSERTED.id VALUES(@0,@1,CAST('900.00' AS decimal(18,2)),0,CAST('0.00' AS decimal(18,2)),N'DUE',1,@1)",[loan.id,month()+'-01'])
 const payload=kind==='early'?{loanId:loan.id,amount:'123.45',reference:'CR29-LOAN-'+n,method:'BANK_TRANSFER',mode:'SHORTEN_TERM'}:{loanId:loan.id,installmentId:installment.id,toPeriod:month(1),reason}
 const submitted=await f.ok('POST','/requests',{typeCode,submit:true,payload},owner);assert.equal(submitted.status,'UNDER_REVIEW')
 const saved=await f.repo('Request').findOneByOrFail({id:submitted.id})
 const positions=()=>f.repo('LoanInstallment').find({where:{loanId:loan.id},order:{id:'ASC'}}),before=await positions()
 const approvals=()=>f.repo('RequestApproval').countBy({requestId:submitted.id}),approvalCount=await approvals()
 await transfer(employee)
 const denied=await f.request('POST',`/requests/${submitted.id}/act`,{action:'APPROVE',comment:reason},hr)
 assert.equal(denied.status,403,JSON.stringify(denied.body));assert.match(denied.body.message,/تغير فرع الموظف/);assert.ok(!JSON.stringify(denied.body).includes(f.B.name))
 assert.deepEqual(await positions(),before);assert.deepEqual(await f.repo('Request').findOneByOrFail({id:submitted.id}),saved);assert.equal(await approvals(),approvalCount)
 // A fresh request submitted from the employee's current branch must remain operational.
 Object.assign(owner,await f.repo('User').findOneByOrFail({id:owner.id})) // Transfer invalidates the old token; issue the fixture's next JWT from the current account.
 const fresh=await f.ok('POST','/requests',{typeCode,submit:true,payload},owner)
 const completed=await f.ok('POST',`/requests/${fresh.id}/act`,{action:'APPROVE',comment:reason},hrB)
 assert.equal(completed.status,'COMPLETED')
 const after=await positions()
 if(kind==='early')assert.equal(after.reduce((sum,p)=>sum+Number(p.paidAmount),0),123.45)
 else{assert.equal(after.find(p=>p.id===installment.id).financialStatus,'DEFERRED');const children=after.filter(p=>p.parentInstallmentId===installment.id);assert.equal(children.length,1);assert.equal(Number(children[0].amount),900);assert.equal(children[0].dueDate,month(1)+'-01')}
 const repeat=await f.request('POST',`/requests/${fresh.id}/act`,{action:'APPROVE',comment:reason},hrB);assert.ok([400,409].includes(repeat.status));assert.deepEqual(await positions(),after)
 t.diagnostic(JSON.stringify({case:'loan-request-branch-recheck',kind,transfer:200,oldApproval:403,rollbackComplete:true,newBranchApproval:201,replayNoEffect:true,amount:kind==='early'?123.45:900}))
})
