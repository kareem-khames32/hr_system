'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),setup=require('./codex-review-round35-support.cjs')
let f,hrA,deptA,teamA,seq=0
const reason='مراجعة مستقلة للصرف والعكس وحجب مراجع المسير',today=()=>new Date().toLocaleDateString('en-CA')
before(async()=>{
 f=await setup('r35_independent')
 hrA=await f.actor('r35-hr-a',['payroll.view','bonuses.view','bonuses.manage','bonuses.approve','deductions.view','deductions.manage','deductions.approve','approve.hr'])
 deptA=await f.repo('Department').save({name:'CR35 department A',branchId:f.A.id});teamA=await f.repo('Team').save({name:'CR35 team A',departmentId:deptA.id})
},{timeout:180000})
after(async()=>{if(f)await f.close()})
async function stored(loanId,bonusId,deductionId){return {
 loans:await f.ds.query('SELECT * FROM loans WHERE id=@0',[loanId]),installments:await f.ds.query('SELECT * FROM loan_installments WHERE loanId=@0 ORDER BY id',[loanId]),
 loanEvents:await f.ds.query('SELECT * FROM loan_installment_events WHERE loanId=@0 ORDER BY id',[loanId]),
 bonusEvents:await f.repo('BonusRequestEvent').find({where:{requestId:bonusId},order:{id:'ASC'}}),deductionEvents:await f.repo('DeductionRequestEvent').find({where:{requestId:deductionId},order:{id:'ASC'}})
}}
for(const foreign of [true,false])test(`CR35 real bonus deduction and loan reversal: ${foreign?'foreign references hidden':'in-scope references preserved'}`,{timeout:180000},async t=>{
 const branch=foreign?f.B:f.A,e=await f.employee(9000,branch,{bankName:'CR35 fixture bank'})
 await f.repo('AttendanceExemption').save({employeeId:e.id,effectiveFrom:'2020-01-01',effectiveTo:'2031-12-31',reasonCode:'field_role',reason,status:'APPROVED',createdByUserId:f.admin.id,approvedByUserId:f.admin.id,approvedAt:new Date('2020-01-01T08:00:00Z'),requiresCheckinForPresence:false})
 const requests=[]
 for(const [prefix,key,amount] of [['bonuses','bonusTypeId','123.45'],['deductions','deductionTypeId','67.89']]){
  const type=await f.ok('POST',`/${prefix}/types`,{code:'CR35_'+(++seq),nameAr:'نوع مستقل '+seq,calcMethod:'FIXED_AMOUNT',creatorScopes:['HR'],approvalSteps:['HR'],...(prefix==='deductions'?{category:'PERFORMANCE'}:{})})
  const row=await f.ok('POST',`/${prefix}`,{employeeId:e.id,[key]:type.id,inputValue:amount,targetPeriod:'2026-07',reason,confirmNotDuplicate:true,...(prefix==='deductions'?{incidentDate:today()}:{})})
  assert.equal(row.status,'APPROVED');requests.push({prefix,id:row.id})
 }
 // Explicit legacy loan fixture; every collection and reversal event below is produced by actual payroll operations.
 const loan=await f.repo('Loan').save({employeeId:e.id,amount:600.24,status:'APPROVED',isExceptional:true,installmentMonths:2,firstInstallmentPeriod:'2026-07'})
 for(const period of ['2026-07','2026-08'])await f.repo('LoanInstallment').save({loanId:loan.id,dueDate:period+'-01',originalDueDate:period+'-01',amount:300.12,paidAmount:'0.00',financialStatus:'DUE',financialRevision:1,paid:false})
 const run=await f.draft('CR35 '+(foreign?'hidden':'visible')+' ledger',[e.id]);await f.calculate(run);await f.pay(run)
 const item=await f.repo('PayrollItem').findOneByOrFail({runId:run.id,employeeId:e.id})
 assert.equal(Number(item.netPay),8755.44);assert.equal(Number(item.loanInstallments),300.12)
 const paidLedger=await f.ok('GET',`/loans/${loan.id}/ledger`);assert.equal(paidLedger.paidAmount,'300.12');assert.equal(paidLedger.remainingAmount,'300.12')
 const reversal=await f.reverse(run,[e.id])
 assert.equal(Number((await f.repo('PayrollRun').findOneByOrFail({id:reversal.id})).totalNet),-8755.44)
 if(foreign){
  const c=await f.ok('GET',`/attendance/calendar-context?scope=EMPLOYEE&sourceId=${e.id}`)
  await f.ok('PATCH',`/employees/${e.id}`,{branchId:f.A.id,departmentId:deptA.id,teamId:teamA.id,calendarChange:{effectiveFrom:today(),reason,expectedRevision:c.revision,expectedCurrentSourceHash:c.currentSourceHash}})
 }
 const owner=await f.actor('r35-self-'+seq,[],f.A,{employeeId:e.id})
 const direct=[];for(const id of [run.id,reversal.id])direct.push((await f.request('GET',`/payroll/runs/${id}`,null,hrA)).status)
 assert.deepEqual(direct,foreign?[403,403]:[200,200])
 const before=await stored(loan.id,requests[0].id,requests[1].id),checks=[]
 for(const row of requests){
  const company=await f.ok('GET',`/${row.prefix}/${row.id}`),branchView=await f.ok('GET',`/${row.prefix}/${row.id}`,null,hrA)
  const original=company.events.find(x=>x.eventType==='PAYROLL_REVERSED'),event=branchView.events.find(x=>x.eventType==='PAYROLL_REVERSED')
  assert.ok(original&&event);assert.equal(original.payload.originalRunId,run.id);assert.equal(original.payload.reversalRunId,reversal.id)
  checks.push({route:row.prefix,actual:[event.payload.originalRunId,event.payload.reversalRunId],expected:foreign?[null,null]:[run.id,reversal.id],reason:event.reason,companyReason:original.reason})
 }
 const company=await f.ok('GET',`/loans/${loan.id}/ledger`),branchView=await f.ok('GET',`/loans/${loan.id}/ledger`,null,hrA),self=await f.ok('GET',`/loans/${loan.id}/ledger`,null,owner)
 assert.equal(company.paidAmount,'0.00');assert.equal(company.remainingAmount,'600.24')
 for(const v of [branchView,self]){assert.equal(v.paidAmount,company.paidAmount);assert.equal(v.remainingAmount,company.remainingAmount);assert.deepEqual(v.installments,company.installments)}
 const ownMine=(await f.ok('GET','/loans/mine',null,owner)).find(x=>x.id===loan.id);assert.deepEqual(ownMine,self)
 for(const event of company.events.filter(x=>x.payrollRunId!=null)){
  const shown=branchView.events.find(x=>x.id===event.id),own=self.events.find(x=>x.id===event.id)
  if(own){assert.equal(own.payrollRunId,event.payrollRunId);assert.equal(own.reason,event.reason)}
  checks.push({route:'loan-'+event.action,actual:[shown.payrollRunId],expected:foreign?[null]:[event.payrollRunId],reason:shown.reason,companyReason:event.reason})
 }
 assert.deepEqual(await stored(loan.id,requests[0].id,requests[1].id),before)
 t.diagnostic(JSON.stringify({case:'real-reversal-visibility',foreign,direct,net:8755.44,loanCollected:300.12,loanRestored:600.24,storedEvidenceUnchanged:true,checks}))
 for(const c of checks){assert.deepEqual(c.actual,c.expected,c.route);if(foreign)assert.doesNotMatch(c.reason??'',/#\d+/);else assert.equal(c.reason,c.companyReason)}
})
