'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
let f,emp,other,user
before(async()=>{f=await require('./codex-review-p2d-support.cjs')('p2d_live_controls');emp=await f.employee(6000);other=await f.employee(9000,f.B);user=await f.actor('self',[],f.A,{employeeId:emp.id})},{timeout:120000})
after(async()=>{if(f)await f.close()})
test('P2B C mine cannot be enabled or redirected by caller supplied employee or feature values',async()=>{
 const path='/payroll/live/mine',attack=`?employeeId=${other.id}&userId=${f.admin.id}&feature=true`
 assert.equal((await f.request('GET',path+attack,null,user)).status,404)
 await f.ok('PUT','/modules/features/payroll.live_employee_view',{enabled:true})
 try{const plain=await f.ok('GET',path,null,user),foreign=await f.ok('GET',path+attack,null,user);assert.deepEqual(foreign,plain)}
 finally{await f.ok('PUT','/modules/features/payroll.live_employee_view',{enabled:false})}
 assert.equal((await f.request('GET',path+attack,null,user)).status,404)
})
test('P2B C invalid settings are rejected; corrupt stored values use documented safe behavior',async()=>{
 for(const [key,values] of [['payroll.live_accrual_all',['TRUE','oops','']],['payroll.approval.net_change_alert_percent',['-1','1001','2.5','oops']]]){
  for(const value of values)assert.equal((await f.request('PATCH','/settings/config',{key,value})).status,400,`${key}=${value}`)
 }
 const {payrollNetChangeAlertPercent}=require('../src/payroll/payroll-run-changes')
 assert.equal(payrollNetChangeAlertPercent('bad'),20)
 await f.setting('payroll.live_accrual_all','bad')
 const accrual=f.app.get(require('../src/payroll/payroll-daily-accrual.service').PayrollDailyAccrualService)
 const result=await accrual.accrueOpenRuns();assert.equal(result.employees,0)
 await f.setting('payroll.live_accrual_all','true')
})
test('P2B C adding a hidden previous payroll cannot change alerts or change counters',async()=>{
 const reader=await f.actor('alerts',['payroll.view'])
 const add=async(period,branch,net,status)=>{
  const run=await f.repo('PayrollRun').save({name:'P2B alerts',period,startDate:period+'-01',endDate:period+'-28',branchId:branch.id,scopeType:'BRANCH',status,totalNet:net,approvedAt:status==='APPROVED'?new Date(period+'-28T10:00:00Z'):null})
  await f.repo('PayrollRunMember').save({runId:run.id,employeeId:emp.id,membershipStatus:'INCLUDED',snapshot:{branchId:branch.id,employeeCode:emp.employeeCode,fullName:emp.fullName}})
  await f.repo('PayrollItem').save({runId:run.id,employeeId:emp.id,basicSalary:net,netPay:net,absenceDays:0,unpaidLeaveDays:0,payMethod:'cash',breakdown:JSON.stringify({gross:net})});return run
 }
 const prior=await add('2026-06',f.A,6000,'APPROVED'),now=await add('2026-11',f.A,9000,'CALCULATED')
 const route=`/payroll/runs/${now.id}/changes`,before=await f.ok('GET',route,null,reader)
 assert.equal(before.alerts.netChanges[0].previousNet,6000);assert.equal(before.alerts.netChanges[0].percent,50)
 const hidden=await add('2026-10',f.B,7100,'APPROVED')
 assert.equal((await f.request('GET',`/payroll/runs/${hidden.id}`,null,reader)).status,403)
 assert.deepEqual(await f.ok('GET',route,null,reader),before)
 const company=await f.ok('GET',route);assert.equal(company.alerts.netChanges[0].previousNet,7100)
})
require('./payroll-net-change-alert.test.cjs')
