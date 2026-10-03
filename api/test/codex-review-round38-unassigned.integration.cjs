'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),setup=require('./codex-review-round38-support.cjs')
let f,reader,local,foreign,localRun,foreignRun
const reason='مراجعة مستقلة لنطاق قائمة المسيرات',hidden={id:null,name:'مسير خارج نطاق صلاحيتك',period:null,status:null,startDate:null,endDate:null}
const report=(from,to,actor)=>f.ok('GET',`/reports/payroll/unassigned?from=${from}&to=${to}`,null,actor)
async function financialState(){return {
 runs:await f.repo('PayrollRun').find({order:{id:'ASC'}}),items:await f.repo('PayrollItem').find({order:{id:'ASC'}}),
 members:await f.repo('PayrollRunMember').find({order:{id:'ASC'}}),events:await f.repo('PayrollRunEvent').find({order:{id:'ASC'}})
}}
before(async()=>{
 f=await setup('r38_unassigned');reader=await f.actor('r38-reader-a',['payroll.view','reports.view'])
 const department=await f.repo('Department').save({name:'CR38 department A',branchId:f.A.id})
 local=await f.employee(9000,f.A,{bankName:'CR38 test bank'});foreign=await f.employee(9000,f.B,{bankName:'CR38 test bank'})
 for(const employee of [local,foreign])await f.repo('AttendanceExemption').save({employeeId:employee.id,effectiveFrom:'2020-01-01',effectiveTo:'2031-12-31',reasonCode:'field_role',reason,status:'APPROVED',createdByUserId:f.admin.id,approvedByUserId:f.admin.id,approvedAt:new Date('2020-01-01T08:00:00Z'),requiresCheckinForPresence:false})
 for(const [branch,employee] of [[f.A,local],[f.B,foreign]]){
  const run=await f.ok('POST','/payroll/runs',{name:'CR38 payroll '+branch.name,period:'2026-07',policyVersionId:f.version,filters:{branchIds:[branch.id]}})
  await f.calculate(run);await f.pay(run)
  const stored=await f.repo('PayrollRun').findOneByOrFail({id:run.id});assert.equal(stored.scopeType,'BRANCH');assert.equal(stored.status,'PAID');assert.equal(Number(stored.totalNet),9000)
  const member=await f.repo('PayrollRunMember').findOneByOrFail({runId:run.id,employeeId:employee.id})
  const snapshot=typeof member.snapshot==='string'?JSON.parse(member.snapshot):member.snapshot
  assert.equal(Number(snapshot.branchId),branch.id)
  if(branch===f.A)localRun=stored;else foreignRun=stored
 }
 const calendar=await f.ok('GET',`/attendance/calendar-context?scope=EMPLOYEE&sourceId=${foreign.id}`)
 await f.ok('PATCH',`/employees/${foreign.id}`,{branchId:f.A.id,departmentId:department.id,teamId:null,calendarChange:{effectiveFrom:new Date().toLocaleDateString('en-CA'),reason,expectedRevision:calendar.revision,expectedCurrentSourceHash:calendar.currentSourceHash}})
 assert.equal((await f.request('GET',`/payroll/runs/${foreignRun.id}`,null,reader)).status,403)
 assert.equal((await f.request('GET',`/payroll/runs/${localRun.id}`,null,reader)).status,200)
},{timeout:240000})
after(async()=>{if(f)await f.close()})
test('CR38 unassigned lastRun conceals all foreign metadata and preserves the permitted head and stored finance',{timeout:90000},async t=>{
 const before=await financialState(),branch=await report('2026-09-01','2026-09-30',reader),company=await report('2026-09-01','2026-09-30',f.admin)
 const hiddenRow=branch.rows.find(x=>x.employeeId===foreign.id),ownRow=branch.rows.find(x=>x.employeeId===local.id)
 assert.ok(hiddenRow&&ownRow);assert.deepEqual(hiddenRow.lastRun,hidden)
 assert.equal(ownRow.lastRun.id,localRun.id);assert.equal(ownRow.lastRun.period,'2026-07');assert.equal(ownRow.lastRun.status,'PAID')
 assert.deepEqual(ownRow.lastRun,company.rows.find(x=>x.employeeId===local.id).lastRun)
 assert.equal(company.rows.find(x=>x.employeeId===foreign.id).lastRun.id,foreignRun.id)
 assert.deepEqual(await financialState(),before)
 t.diagnostic(JSON.stringify({case:'unassigned-last-run-closure',foreignDirectRead:403,foreignLastRun:hiddenRow.lastRun,permittedLastRun:ownRow.lastRun,netEach:9000,storedFinanceUnchanged:true}))
})
test('CR38 unassigned top-level runs must exclude a wholly foreign historical membership after transfer',{timeout:90000},async t=>{
 const before=await financialState(),branch=await report('2026-07-01','2026-07-22',reader),company=await report('2026-07-01','2026-07-22',f.admin)
 assert.equal(company.runs.length,2);assert.ok(company.runs.some(x=>x.id===foreignRun.id));assert.ok(branch.runs.some(x=>x.id===localRun.id))
 assert.deepEqual(await financialState(),before)
 t.diagnostic(JSON.stringify({case:'unassigned-top-level-foreign-run',foreignDirectRead:403,foreignRun:foreignRun.id,foreignBranch:f.B.name,branchRuns:branch.runs,companyRuns:company.runs,branchSummary:branch.summary,storedFinanceUnchanged:true}))
 assert.equal(JSON.stringify(branch.runs).includes(f.B.name),false,'A former B member now in A must not expose the B branch name through a historical run scopeLabel')
 assert.equal(branch.runs.length,1,'No B membership snapshot belongs to A; the wholly foreign head must be absent')
})
test('CR38 unassigned reversal reason conceals the foreign head while the company sees it and real reversal balances',{timeout:180000},async t=>{
 const reversal=await f.reverse(foreignRun,[foreign.id]);assert.equal(Number((await f.repo('PayrollRun').findOneByOrFail({id:reversal.id})).totalNet),-9000)
 const before=await financialState(),branch=await report('2026-07-01','2026-07-22',reader),company=await report('2026-07-01','2026-07-22',f.admin)
 const branchReason=branch.rows.find(x=>x.employeeId===foreign.id)?.reasons.find(x=>x.code==='REVERSED_IN_RUN')
 const companyReason=company.rows.find(x=>x.employeeId===foreign.id)?.reasons.find(x=>x.code==='REVERSED_IN_RUN')
 assert.ok(branchReason&&companyReason);assert.deepEqual(branchReason.run,hidden);assert.equal(companyReason.run.id,foreignRun.id)
 assert.deepEqual(await financialState(),before)
 t.diagnostic(JSON.stringify({case:'unassigned-reversal-reason-closure',branchReason,companyReason,originalNet:9000,reversalNet:-9000,storedFinanceUnchanged:true}))
})
