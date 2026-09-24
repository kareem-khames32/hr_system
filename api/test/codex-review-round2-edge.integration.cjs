'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
let f,branch,version,n=0
before(async()=>{f=await require('./codex-review-round2-fixture.cjs')('edges');branch=await f.repo('Branch').save({code:'CR2EDGE',name:'Edge fixtures'});version=await f.policy()},{timeout:180000})
after(async()=>{if(f)await f.close()})
async function employee(){
  const e=await f.repo('Employee').save({employeeCode:`EDGE${++n}`,fullName:'Synthetic edge employee',branchId:branch.id,joinDate:'2020-01-01',
    status:'active',isActive:true,basicSalary:1000,payMethod:'mixed',bankTransferAmount:300,bankName:'Test Bank',iban:'SA0380000000608010167519'})
  await f.repo('AttendanceExemption').save({employeeId:e.id,effectiveFrom:'2026-01-01',effectiveTo:'2026-12-31',reasonCode:'field_role',reason:'Synthetic fixture',status:'APPROVED',createdByUserId:f.admin.id,approvedByUserId:f.admin.id,approvedAt:new Date(),requiresCheckinForPresence:false})
  return e
}
async function prepared(count){
  const employees=[];for(let i=0;i<count;i++)employees.push(await employee())
  const run=await f.ok('POST','/payroll/runs',{name:`Edge ${n}`,policyVersionId:version,period:'2026-08',filters:{employeeIds:employees.map(e=>e.id)}})
  await f.ok('POST',`/payroll/runs/${run.id}/calculate`,{});await f.approve(run.id)
  const detail=await f.ok('GET',`/payroll/runs/${run.id}`)
  assert.equal(detail.items.length,count);assert.ok(detail.items.every(i=>Number(i.netPay)===1000))
  return {run,employees,items:detail.items}
}
const mark=(run,item,paid)=>f.ok('POST',`/payroll/disbursement/runs/${run.id}/mark`,{itemIds:[item.id],paid,note:'Independent edge review'})
const pay=run=>f.ok('POST',`/payroll/runs/${run.id}/pay`,{channel:'MIXED',reference:'Independent edge payout',unpaidReason:'Awaiting employee collection'})
async function check(run,item,expected,state){
  const sheet=await f.ok('GET',`/payroll/runs/${run.id}/bank-sheet`),screen=await f.ok('GET',`/payroll/disbursement/runs/${run.id}`),
    register=await f.ok('GET','/reports/financial/payroll-register?period=2026-08'),slip=await f.ok('GET',`/payroll/items/${item.id}`),methods=await f.ok('GET',`/payroll/runs/${run.id}/pay-methods`)
  const b=sheet.rows.find(r=>r.employeeId===item.employeeId),s=screen.rows.find(r=>r.itemId===item.id),r=register.rows.find(r=>r.runId===run.id&&r.employeeId===item.employeeId)
  assert.deepEqual([b.bankAmount,b.cashAmount],expected);assert.deepEqual([s.bankAmount,s.cashAmount],expected)
  assert.deepEqual([Number(r.bank),Number(r.cash)],expected);assert.deepEqual([slip.employee.paySplit.bank,slip.employee.paySplit.cash],expected)
  assert.equal(s.state,state)
  assert.equal(sheet.totals.bank+sheet.totals.cash,sheet.totals.net)
  assert.equal(Object.values(methods).reduce((sum,r)=>sum+r.bank,0),sheet.totals.bank)
  assert.equal(Object.values(methods).reduce((sum,r)=>sum+r.cash,0),sheet.totals.cash)
}
test('CR2-E1 mark then unmark then RUN_LEVEL pays current split and freezes it across five outputs',async t=>{
  const {run,employees:[e],items:[item]}=await prepared(1)
  await mark(run,item,true);await mark(run,item,false)
  await f.repo('Employee').update(e.id,{bankTransferAmount:600})
  await check(run,item,[600,400],'UNPAID');await pay(run)
  const frozen=await f.repo('PayrollItem').findOneByOrFail({id:item.id})
  assert.deepEqual([frozen.paidPayMethod,Number(frozen.paidBankAmount),Number(frozen.paidCashAmount)],['mixed',600,400])
  assert.equal((await f.repo('PayrollItemDisbursement').findOneByOrFail({itemId:item.id})).status,'UNPAID')
  await f.repo('Employee').update(e.id,{payMethod:'cash',bankTransferAmount:900})
  await check(run,item,[600,400],'PAID')
  const repeat=await f.request('POST',`/payroll/runs/${run.id}/pay`,{channel:'CASH',reference:'duplicate'})
  assert.equal(repeat.status,400)
  t.diagnostic(JSON.stringify({scenario:'RUN_LEVEL stale UNPAID',frozen:[600,400],fiveOutputsAgree:true,repeatPay:repeat.status}))
},{timeout:240000})
test('CR2-E2 PER_EMPLOYEE leaves unpaid item live, then a late payment freezes its actual split once',async t=>{
  const {run,employees,items}=await prepared(2)
  await mark(run,items[0],true);await mark(run,items[1],true);await mark(run,items[1],false)
  await pay(run)
  const unpaid=await f.repo('PayrollItem').findOneByOrFail({id:items[1].id})
  assert.equal(unpaid.paidPayMethod,null);assert.equal(unpaid.paidBankAmount,null);assert.equal(unpaid.paidCashAmount,null)
  await f.repo('Employee').update(employees[0].id,{bankTransferAmount:800});await f.repo('Employee').update(employees[1].id,{bankTransferAmount:800})
  await check(run,items[0],[300,700],'PAID');await check(run,items[1],[800,200],'UNPAID')
  await mark(run,items[1],true);await f.repo('Employee').update(employees[1].id,{bankTransferAmount:100})
  await check(run,items[1],[800,200],'PAID')
  const repeat=await f.request('POST',`/payroll/disbursement/runs/${run.id}/mark`,{itemIds:[items[1].id],paid:true,note:'Repeated closed payment'});assert.equal(repeat.status,409)
  const cancel=await f.request('POST',`/payroll/disbursement/runs/${run.id}/mark`,{itemIds:[items[1].id],paid:false,note:'Cannot cancel closed payment'})
  assert.ok(cancel.status>=400)
  t.diagnostic(JSON.stringify({scenario:'PER_EMPLOYEE then late payment',firstFrozen:[300,700],lateFrozen:[800,200],repeatStatus:repeat.status,cancelStatus:cancel.status}))
},{timeout:240000})
test('CR2-E3 fault after first paid split write rolls back every split and run transition',async t=>{
  const {run,items}=await prepared(2)
  const {Repository}=require('../node_modules/typeorm'),original=Repository.prototype.update;let writes=0
  Repository.prototype.update=async function(criteria,patch){
    const out=await original.call(this,criteria,patch)
    if(this.metadata.name==='PayrollItem'&&patch?.paidPayMethod&&++writes===1)throw new Error('INDEPENDENT_REVIEW_INJECTED_FAILURE')
    return out
  }
  let response
  try{response=await f.request('POST',`/payroll/runs/${run.id}/pay`,{channel:'MIXED',reference:'Failure fixture'})}finally{Repository.prototype.update=original}
  assert.equal(response.status,500);assert.equal(writes,1)
  assert.equal((await f.repo('PayrollRun').findOneByOrFail({id:run.id})).status,'APPROVED')
  for(const i of items){const row=await f.repo('PayrollItem').findOneByOrFail({id:i.id});assert.equal(row.paidPayMethod,null);assert.equal(row.paidBankAmount,null);assert.equal(row.paidCashAmount,null)}
  await pay(run);for(const i of items)await check(run,i,[300,700],'PAID')
  t.diagnostic(JSON.stringify({scenario:'atomic paid snapshot',injectedStatus:response.status,partialWritesPersisted:0,retrySucceeded:true}))
},{timeout:240000})
