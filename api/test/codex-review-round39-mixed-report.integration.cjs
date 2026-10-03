'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),setup=require('./codex-review-round39-support.cjs')
let f,reader,departmentA,departmentB
const reason='مراجعة الرأس المختلط المسموح دون أسماء تنظيم الفرع الآخر'
before(async()=>{
 f=await setup('r39_mixed');reader=await f.actor('r39-mixed-reader',['payroll.view','reports.view'])
 departmentA=await f.repo('Department').save({name:'CR39 visible department A',branchId:f.A.id})
 departmentB=await f.repo('Department').save({name:'CR39 confidential department B',branchId:f.B.id})
},{timeout:180000})
after(async()=>{if(f)await f.close()})
for(const kind of ['BRANCH','DEPARTMENT'])test(`CR39 ${kind} mixed report retains allowed run head without foreign organization names`,{timeout:180000},async t=>{
 const period=kind==='BRANCH'?'2026-07':'2026-08'
 for(const [branch,department] of [[f.A,departmentA],[f.B,departmentB]]){
  const e=await f.employee(9000,branch,{departmentId:department.id,bankName:'CR39 mixed bank'})
  await f.repo('AttendanceExemption').save({employeeId:e.id,effectiveFrom:'2020-01-01',effectiveTo:'2031-12-31',reasonCode:'field_role',reason,status:'APPROVED',createdByUserId:f.admin.id,approvedByUserId:f.admin.id,approvedAt:new Date('2020-01-01T08:00:00Z'),requiresCheckinForPresence:false})
 }
 const filters=kind==='BRANCH'?{branchIds:[f.A.id,f.B.id]}:{departmentIds:[departmentA.id,departmentB.id]}
 const run=await f.ok('POST','/payroll/runs',{name:'CR39 shared payroll '+kind,period,policyVersionId:f.version,filters})
 await f.calculate(run);await f.pay(run)
 const members=await f.repo('PayrollRunMember').findBy({runId:run.id});assert.ok(members.some(m=>m.snapshot.branchId===f.A.id)&&members.some(m=>m.snapshot.branchId===f.B.id))
 assert.equal((await f.request('GET',`/payroll/runs/${run.id}`,null,reader)).status,403)
 const stored=await f.repo('PayrollRun').findOneByOrFail({id:run.id}),before=await f.repo('PayrollItem').findBy({runId:run.id})
 assert.equal(Number(stored.totalNet),members.length*9000)
 const unassigned=await f.ok('GET',`/reports/payroll/unassigned?period=${period}`,null,reader),summary=await f.ok('GET','/reports/payroll',null,reader)
 const company=await f.ok('GET',`/reports/payroll/unassigned?period=${period}`),companySummary=await f.ok('GET','/reports/payroll')
 const hiddenName=kind==='BRANCH'?f.B.name:departmentB.name,visibleName=kind==='BRANCH'?f.A.name:departmentA.name
 const listHead=unassigned.runs.find(r=>r.period===period),summaryHead=summary.runs.find(r=>r.id===run.id)
 assert.ok(listHead&&summaryHead,'The permitted mixed head must remain visible')
 assert.ok(listHead.scopeLabel.includes(visibleName));assert.ok(company.runs.some(r=>r.id===run.id&&r.scopeLabel.includes(hiddenName)))
 assert.ok(companySummary.runs.find(r=>r.id===run.id).scopeLabel.includes(hiddenName));assert.equal(summaryHead.storedTotalNet,null)
 assert.deepEqual(await f.repo('PayrollItem').findBy({runId:run.id}),before)
 t.diagnostic(JSON.stringify({case:'mixed-head-foreign-organization-label',kind,fullRunRead:403,mixedHeadAllowed:true,hiddenName,listHead,summaryScopeLabel:summaryHead.scopeLabel,storedNet:stored.totalNet,storedUnchanged:true}))
 assert.equal(listHead.scopeLabel.includes(hiddenName)||summaryHead.scopeLabel.includes(hiddenName),false,'Permitting a mixed run head does not permit disclosing private organization names from its foreign branches')
})
