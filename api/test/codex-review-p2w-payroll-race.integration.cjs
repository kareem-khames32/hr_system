'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict');let f
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve}}
const bounded=async(p,label)=>{let timer;try{return await Promise.race([p,new Promise((_,r)=>timer=setTimeout(()=>r(new Error(label)),20000))])}finally{clearTimeout(timer)}}
before(async()=>{f=await require('./codex-review-p2w-employment-fixture.cjs')('p2w_payroll_race')},{timeout:180000})
after(async()=>{if(f)await f.close()})
test('P2W B rehire and old-period calculation must not both commit an unresolved old payroll item',async t=>{
 const {emp}=await f.ended(f.last+'-06-30')
 await f.setting('payroll.salary_evidence_mode','MONTHLY_HISTORY_OR_CURRENT_FILE')
 const closed=await f.run({period:f.last+'-06',startDate:f.last+'-06-01',endDate:f.last+'-06-30',status:'PAID'})
 await f.repo('PayrollRunMember').save({runId:closed.id,employeeId:emp.id,membershipStatus:'EXCLUDED',snapshot:{branchId:f.A.id}})
 const run=await f.run({period:f.last+'-05',startDate:f.last+'-05-01',endDate:f.last+'-05-31',status:'DRAFT',scopeType:'CUSTOM',employeeIds:JSON.stringify([emp.id]),branchId:null})
 const boundary=require('../src/payroll/payroll-settlement-boundary'),original=boundary.lockPayrollEmployees,entered=deferred(),release=deferred();let armed=true,job
 const service=f.app.get(require('../src/payroll/payroll.service').PayrollService)
 const actor={sub:f.admin.id,role:'super_admin',permissions:['*'],branchId:null,scopeAllBranches:true}
 const args={runId:run.id,period:run.period,scopeType:'CUSTOM',employeeIds:[emp.id]}
 boundary.lockPayrollEmployees=async function(em,ids,...rest){if(armed&&ids.includes(emp.id)){armed=false;entered.resolve();await release.promise}return original(em,ids,...rest)}
 try{
  job=service.calculateDefined(actor,args);job.catch(()=>{})
  await bounded(entered.promise,'calculation did not reach employee financial lock')
  assert.equal((await f.rehire(emp)).status,201)
  release.resolve();await bounded(job,'calculation did not finish')
  const first=await f.repo('PayrollRunMember').findOneByOrFail({runId:run.id,employeeId:emp.id})
  const firstItems=await f.repo('PayrollItem').find({where:{runId:run.id,employeeId:emp.id}})
  await service.calculateDefined(actor,{...args,reason:'Compare fresh post-rehire evaluation'})
  const fresh=await f.repo('PayrollRunMember').findOneByOrFail({runId:run.id,employeeId:emp.id})
  const freshItems=await f.repo('PayrollItem').find({where:{runId:run.id,employeeId:emp.id}})
  t.diagnostic(JSON.stringify({case:'old-payroll-crosses-rehire',rehireStatus:201,first:{status:first.membershipStatus,items:firstItems.map(i=>({basicSalary:i.basicSalary,netPay:i.netPay}))},fresh:{status:fresh.membershipStatus,items:freshItems.length}}))
  assert.equal(first.membershipStatus,fresh.membershipStatus,'A calculation evaluating after rehire commits must agree with the fresh calculation')
  assert.equal(firstItems.length,freshItems.length)
 }finally{release.resolve();if(job)await job.catch(()=>{});boundary.lockPayrollEmployees=original}
})
