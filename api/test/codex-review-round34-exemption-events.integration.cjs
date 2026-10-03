'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),setup=require('./codex-review-round34-support.cjs')
let f,hrA,hrB,department,team
const today=()=>new Date().toLocaleDateString('en-CA'),reason='إعفاء مستقل بعد مراجعة محضر المخالفة والمستند المؤيد'
before(async()=>{
 f=await setup('r34_exemption_events')
 const perms=['deductions.manage','deductions.view','deductions.approve','approve.hr','payroll.view']
 hrA=await f.actor('r34-ex-a',perms);hrB=await f.actor('r34-ex-b',perms,f.B)
 department=await f.repo('Department').save({name:'CR34 exemption A',branchId:f.A.id});team=await f.repo('Team').save({name:'CR34 exemption team',departmentId:department.id})
 await f.setting('financial_exemptions.cooldown_hours','0')
},{timeout:180000})
after(async()=>{if(f)await f.close()})
for(const disposition of ['DROP','DEFER_ONE_PERIOD'])test(`CR34 ${disposition}: deduction exemption event must hide a foreign payroll reference`,{timeout:180000},async t=>{
 const e=await f.employee(9000,f.B,{bankName:'CR34 exemption bank'})
 await f.repo('AttendanceExemption').save({employeeId:e.id,effectiveFrom:'2020-01-01',effectiveTo:'2031-12-31',reasonCode:'field_role',reason,status:'APPROVED',createdByUserId:f.admin.id,approvedByUserId:f.admin.id,approvedAt:new Date('2020-01-01T08:00:00Z'),requiresCheckinForPresence:false})
 const type=await f.ok('POST','/deductions/types',{code:'CR34_EX_'+disposition,nameAr:'خصم اختبار الإعفاء',category:'PERFORMANCE',calcMethod:'FIXED_AMOUNT',maxPctOfGross:null,creatorScopes:['HR'],approvalSteps:['HR']})
 const row=await f.ok('POST','/deductions',{employeeId:e.id,deductionTypeId:type.id,inputValue:'123.45',targetPeriod:'2026-07',incidentDate:today(),reason,confirmNotDuplicate:true},hrB)
 assert.equal(row.status,'APPROVED')
 const run=await f.draft('CR34 hidden exemption '+disposition,[e.id]);await f.calculate(run)
 assert.equal(Number((await f.repo('PayrollItem').findOneByOrFail({runId:run.id,employeeId:e.id})).netPay),8876.55)
 const input={runId:run.id,employeeId:e.id,scopeKind:'DEDUCTION_TYPE',targetKind:'TYPED',deductionTypeId:type.id,disposition,reason,attachmentRef:'CR34-EX-FIXTURE',overrideReason:'مراجعة مستقلة مثبتة بمحضر لتصحيح استحقاق الخصم'}
 const preview=await f.ok('POST','/payroll/exemptions/preview',input),grant=await f.ok('POST','/payroll/exemptions',{...input,previewHash:preview.previewHash})
 assert.equal(grant.status,'ACTIVE');await f.ok('POST',`/payroll/runs/${run.id}/recalculate`,{reason});await f.pay(run)
 assert.equal(Number((await f.repo('PayrollItem').findOneByOrFail({runId:run.id,employeeId:e.id})).netPay),9000)
 const rows=await f.repo('EmployeeObligation').find({where:{deductionRequestId:row.id},order:{id:'ASC'}})
 assert.equal(rows[0].status,disposition==='DROP'?'EXEMPTED':'DEFERRED');assert.equal(Number(rows[0].appliedAmount),0)
 assert.equal(rows.length,disposition==='DROP'?1:2)
 if(rows.length===2){assert.equal(rows[1].status,'PENDING');assert.equal(Number(rows[1].amount),123.45)}
 const context=await f.ok('GET',`/attendance/calendar-context?scope=EMPLOYEE&sourceId=${e.id}`)
 await f.ok('PATCH',`/employees/${e.id}`,{branchId:f.A.id,departmentId:department.id,teamId:team.id,calendarChange:{effectiveFrom:today(),reason,expectedRevision:context.revision,expectedCurrentSourceHash:context.currentSourceHash}})
 assert.equal((await f.request('GET',`/payroll/runs/${run.id}`,null,hrA)).status,403)
 const stored=await f.repo('DeductionRequestEvent').find({where:{requestId:row.id},order:{id:'ASC'}})
 const branch=await f.ok('GET',`/deductions/${row.id}`,null,hrA),company=await f.ok('GET',`/deductions/${row.id}`)
 assert.ok(branch.obligations.every(x=>x.appliedPayrollRunId===null&&x.reservedPayrollRunId===null))
 const names=['EXEMPTION_GRANTED',disposition==='DROP'?'EXEMPTED':'DEFERRED_BY_EXEMPTION']
 const pick=v=>v.events.filter(x=>names.includes(x.eventType)).map(x=>({type:x.eventType,runId:x.payload.runId}))
 assert.deepEqual(pick(company),names.map(type=>({type,runId:run.id})))
 assert.deepEqual(await f.repo('DeductionRequestEvent').find({where:{requestId:row.id},order:{id:'ASC'}}),stored)
 t.diagnostic(JSON.stringify({case:'exemption-event-run-reference',disposition,directRunStatus:403,detailStatus:200,branchEvents:pick(branch),companyEvents:pick(company),exemptionAmount:123.45,beforeNet:8876.55,afterNet:9000,storedEvidenceUnchangedByRead:true}))
 assert.deepEqual(pick(branch),names.map(type=>({type,runId:null})),'Foreign payroll reference must also be hidden for exemption events')
})
