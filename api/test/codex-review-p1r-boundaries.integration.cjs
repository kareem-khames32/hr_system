'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),setup=require('./codex-review-p1r-support.cjs')
let f,reader,employee,prior,current
const reason='مراجعة مستقلة لتاريخ المسير وعزل الفروع',money=['basicSalary','housingAllowance','transportAllowance','phoneAllowance','workNatureAllowance','otherAllowance','workPressureAllowance']
before(async()=>{
 f=await setup('p1_boundary');reader=await f.actor('p1-reader',['payroll.view','users.manage'])
 const department=await f.repo('Department').save({name:'P1 department A',branchId:f.A.id})
 employee=await f.employee(6000,f.B,{bankName:'P1 synthetic bank'})
 await f.repo('AttendanceExemption').save({employeeId:employee.id,effectiveFrom:'2020-01-01',effectiveTo:'2031-12-31',reasonCode:'field_role',reason,status:'APPROVED',createdByUserId:f.admin.id,approvedByUserId:f.admin.id,approvedAt:new Date('2020-01-01T08:00:00Z'),requiresCheckinForPresence:false})
 const salary=async periods=>{
  const view=await f.ok('GET',`/payroll/employees/${employee.id}/salary-history`)
  return f.ok('POST',`/payroll/employees/${employee.id}/salary-history/monthly`,{expectedRevision:view.revision,expectedCurrentSourceHash:view.currentSourceHash,reason,evidenceReference:'P1 synthetic decision',periods:periods.map(([from,to,basic])=>({effectivePayrollPeriod:from,effectiveToPayrollPeriod:to,currency:view.current?.currency??'SAR',...Object.fromEntries(money.map(key=>[key,key==='basicSalary'?basic:'0.00']))}))})
 }
 await salary([['2026-01',null,'6000.00']]);prior=await f.draft('P1 common series',[employee.id]);await f.calculate(prior);await f.pay(prior)
 await salary([['2026-01','2026-10','6000.00'],['2026-11',null,'9000.00']])
 const context=await f.ok('GET','/attendance/calendar-context?scope=EMPLOYEE&sourceId='+employee.id)
 await f.ok('PATCH','/employees/'+employee.id,{branchId:f.A.id,departmentId:department.id,teamId:null,calendarChange:{effectiveFrom:new Date().toLocaleDateString('en-CA'),reason,expectedRevision:context.revision,expectedCurrentSourceHash:context.currentSourceHash}})
 current=await f.draft('P1 common series',[employee.id],'2026-11');await f.calculate(current)
 assert.equal((await f.request('GET','/payroll/runs/'+prior.id,null,reader)).status,403)
 assert.equal((await f.request('GET','/payroll/runs/'+current.id,null,reader)).status,200)
},{timeout:180000})
after(async()=>{if(f)await f.close()})
test('P1 branch reader changes tab must not disclose a foreign prior payroll period or amount',async t=>{
 const before=await f.repo('PayrollItem').find({order:{id:'ASC'}})
 const url='/payroll/runs/'+current.id+'/changes',company=await f.ok('GET',url),branch=await f.ok('GET',url,null,reader)
 const row=branch.rows.find(row=>row.employeeId===employee.id),full=company.rows.find(row=>row.employeeId===employee.id)
 assert.deepEqual(full.salary,{previous:6000,current:9000});assert.equal(full.previousPeriod,'2026-07')
 assert.deepEqual(await f.repo('PayrollItem').find({order:{id:'ASC'}}),before)
 t.diagnostic(JSON.stringify({case:'P1-new-changes-tab',foreignRunStatus:403,currentRunStatus:200,branch,companyRow:full,storedUnchanged:true}))
 assert.ok(!row?.previousPeriod&&(!row?.salary||row.salary.previous==null)&&branch.previousSeriesPeriod==null,'Foreign previous period and financial amount must be concealed')
})
test('P1 login log accepts ISO from/to date filters and retains branch isolation',async t=>{
 await f.repo('LoginEvent').save({userId:reader.id,identifier:reader.email,method:'PASSWORD',outcome:'SUCCESS',at:new Date('2026-10-03T08:00:00Z')})
 const plain=await f.request('GET','/users/login-events',null,reader),filtered=await f.request('GET','/users/login-events?from=2026-10-01&to=2026-10-03',null,reader)
 assert.equal(plain.status,200);assert.ok(plain.body.rows.some(row=>row.userId===reader.id))
 t.diagnostic(JSON.stringify({case:'P1-login-date-filter',plainStatus:plain.status,filteredStatus:filtered.status,filtered:filtered.body}))
 assert.equal(filtered.status,200)
})
