'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),setup=require('./codex-review-p1-support.cjs')
let f,finance
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
before(async()=>{f=await setup('p1_finance');finance=await f.actor('p1-finance',['loans.disburse','payroll.view','settlement.approve','offboarding.manage'])},{timeout:120000})
after(async()=>{if(f)await f.close()})
async function loan(){
 const emp=await f.employee();const [l]=await f.ds.query("INSERT loans(employeeId,amount,status,firstInstallmentPeriod,installmentMonths,requiresDisbursement) OUTPUT INSERTED.id VALUES(@0,900,N'APPROVED','2026-11',1,1)",[emp.id])
 await f.ds.query("INSERT loan_installments(loanId,dueDate,amount,paid,paidAmount,financialStatus,financialRevision,originalDueDate) VALUES(@0,'2026-11-01',900,0,0,N'DUE',1,'2026-11-01')",[l.id]);return {emp,id:l.id}
}
test('P1 simultaneous loan disbursements persist exactly one reference without changing balance',async t=>{
 const l=await loan(),before=await f.repo('LoanInstallment').findBy({loanId:l.id})
 const results=await Promise.all(['ONE','TWO'].map(reference=>f.request('POST',`/loans/${l.id}/disbursement`,{date:today(),method:'BANK_TRANSFER',reference},finance)))
 assert.deepEqual(results.map(x=>x.status).sort(),[201,409]);const [row]=await f.ds.query('SELECT amount,status,disbursementReference FROM loans WHERE id=@0',[l.id])
 assert.equal(Number(row.amount),900);assert.equal(row.status,'DISBURSED');assert.ok(['ONE','TWO'].includes(row.disbursementReference));assert.deepEqual(await f.repo('LoanInstallment').findBy({loanId:l.id}),before)
 t.diagnostic(JSON.stringify({case:'loan-once',statuses:results.map(x=>x.status),amount:Number(row.amount),installmentsUnchanged:true}))
})
test('P1 loan disbursement rechecks branch after waiting for the finance lock',async t=>{
 const l=await loan(),lock=require('../src/payroll/payroll-settlement-boundary'),original=lock.lockPayrollEmployees,qr=f.ds.createQueryRunner()
 await qr.connect();await qr.startTransaction();await original(qr.manager,[l.emp.id])
 let enter;const entered=new Promise(r=>enter=r)
 lock.lockPayrollEmployees=async(em,ids)=>{if(ids.includes(l.emp.id)&&em!==qr.manager)enter();return original(em,ids)}
 let pending
 try{
  pending=f.request('POST',`/loans/${l.id}/disbursement`,{date:today(),method:'CASH'},finance)
  await Promise.race([entered,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error('finance-lock barrier not entered')),5000);timer.unref()})])
  await qr.manager.query('UPDATE employees SET branchId=@0 WHERE id=@1',[f.B.id,l.emp.id]);await qr.commitTransaction()
  const result=await pending;assert.equal(result.status,404);const [row]=await f.ds.query('SELECT disbursedAt,amount,status FROM loans WHERE id=@0',[l.id]);assert.equal(row.disbursedAt,null);assert.equal(Number(row.amount),900)
  t.diagnostic(JSON.stringify({case:'loan-transfer-race',status:result.status,persistedPayment:false}))
 }finally{lock.lockPayrollEmployees=original;if(qr.isTransactionActive)await qr.rollbackTransaction();await qr.release();if(pending)await pending}
})
test('P1 simultaneous settlement payment recordings preserve exactly one reference and the approved net',async t=>{
 const emp=await f.employee(2400,f.A,{annualLeaveEntitled:false}),kase=await f.repo('OffboardingCase').save({employeeId:emp.id,lastWorkingDay:'2099-07-10',status:'IN_SETTLEMENT',terminationReason:'termination'})
 await f.repo('ClearanceItem').save(['manager','custody','it','finance','hr'].map(party=>({caseId:kase.id,party,label:party,status:'DONE'})))
 await f.ok('POST',`/offboarding/${kase.id}/recalc-lines`);await f.ok('POST',`/offboarding/${kase.id}/approve-settlement`,{},f.approver)
 const before=await f.repo('OffboardingCase').findOneByOrFail({id:kase.id})
 const results=await Promise.all(['FIRST','SECOND'].map(reference=>f.request('POST',`/offboarding/${kase.id}/settlement-payment`,{date:today(),method:'BANK_TRANSFER',reference},finance)))
 assert.deepEqual(results.map(x=>x.status).sort(),[201,409]);const after=await f.repo('OffboardingCase').findOneByOrFail({id:kase.id})
 assert.equal(after.settlementNet,before.settlementNet);assert.equal(after.status,before.status)
 const [paid]=await f.ds.query('SELECT settlementPaymentReference AS reference FROM offboarding_cases WHERE id=@0',[kase.id]);assert.ok(['FIRST','SECOND'].includes(paid.reference))
 t.diagnostic(JSON.stringify({case:'settlement-once',statuses:results.map(x=>x.status),net:Number(after.settlementNet),netAndStatusUnchanged:true}))
})
