'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),setup=require('./codex-review-round39-support.cjs')
let f,reader,owner,employee,original,reversal,current,restored,item
const reason='اختبار مستقل لنص القيد بعد عكس مسير ثم انتقال فرع',period='2026-11'
before(async()=>{
 f=await setup('r39_payslip');reader=await f.actor('r39-reader',['payroll.view','reports.view'])
 const department=await f.repo('Department').save({name:'CR39 department A',branchId:f.A.id})
 employee=await f.employee(9000,f.B,{bankName:'CR39 fixture bank'})
 await f.repo('AttendanceExemption').save({employeeId:employee.id,effectiveFrom:'2020-01-01',effectiveTo:'2031-12-31',reasonCode:'field_role',reason,status:'APPROVED',createdByUserId:f.admin.id,approvedByUserId:f.admin.id,approvedAt:new Date('2020-01-01T08:00:00Z'),requiresCheckinForPresence:false})
 const credit=await f.ok('POST','/obligations',{employeeId:employee.id,type:'CREDIT',amount:67.89,label:'CR39 original allowance',category:'allowance',effectiveDate:'2026-07-01'})
 original=await f.draft('CR39 private July B',[employee.id]);await f.calculate(original);await f.pay(original)
 assert.equal(Number((await f.repo('PayrollRun').findOneByOrFail({id:original.id})).totalNet),9067.89)
 reversal=await f.reverse(original,[employee.id]);assert.equal(Number((await f.repo('PayrollRun').findOneByOrFail({id:reversal.id})).totalNet),-9067.89)
 restored=await f.repo('EmployeeObligation').findOneByOrFail({payrollReversalOfObligationId:credit.id});assert.equal(restored.status,'PENDING');assert.ok(restored.label.includes('مسير 2026-07'))
 const c=await f.ok('GET',`/attendance/calendar-context?scope=EMPLOYEE&sourceId=${employee.id}`)
 await f.ok('PATCH',`/employees/${employee.id}`,{branchId:f.A.id,departmentId:department.id,teamId:null,calendarChange:{effectiveFrom:new Date().toLocaleDateString('en-CA'),reason,expectedRevision:c.revision,expectedCurrentSourceHash:c.currentSourceHash}})
 owner=await f.actor('r39-owner',[],f.A,{employeeId:employee.id})
 current=await f.draft('CR39 visible November A',[employee.id],period);await f.calculate(current);await f.pay(current)
 item=await f.repo('PayrollItem').findOneByOrFail({runId:current.id,employeeId:employee.id});assert.equal(Number(item.netPay),9067.89)
 const member=await f.repo('PayrollRunMember').findOneByOrFail({runId:current.id,employeeId:employee.id});assert.equal(member.snapshot.branchId,f.A.id)
 for(const run of [original,reversal])assert.equal((await f.request('GET',`/payroll/runs/${run.id}`,null,reader)).status,403)
 assert.equal((await f.request('GET',`/payroll/runs/${current.id}`,null,reader)).status,200)
},{timeout:240000})
after(async()=>{if(f)await f.close()})
async function state(){return {item:await f.repo('PayrollItem').findOneByOrFail({id:item.id}),ledger:await f.repo('EmployeeObligation').find({where:{employeeId:employee.id},order:{id:'ASC'}}),events:await f.repo('PayrollRunEvent').find({order:{id:'ASC'}})}}
const forbidden='مسير 2026-07'
function textPaths(value,prefix='$',out=[]){
 if(typeof value==='string'){if(value.includes(forbidden))out.push({path:prefix,text:value.length<500?value:'[serialized value contains foreign period]'})}
 else if(Array.isArray(value))value.forEach((v,i)=>textPaths(v,prefix+'['+i+']',out))
 else if(value&&typeof value==='object')for(const [k,v] of Object.entries(value))textPaths(v,prefix+'.'+k,out)
 return out
}
test('CR39 ledger and payslip obligationDetails hide a real reinstated foreign period; company/self and finance intact',{timeout:60000},async t=>{
 const before=await state(),ledger=await f.ok('GET',`/obligations/employee/${employee.id}`,null,reader),companyLedger=await f.ok('GET',`/obligations/employee/${employee.id}`)
 const branch=await f.ok('GET',`/payroll/items/${item.id}`,null,reader),company=await f.ok('GET',`/payroll/items/${item.id}`),self=await f.ok('GET',`/payroll/items/${item.id}`,null,owner)
 const visible=ledger.find(x=>x.id===restored.id),detail=branch.obligationDetails.find(x=>x.obligationId===restored.id)
 assert.ok(visible&&detail);assert.equal(visible.label.includes(forbidden),false);assert.equal(detail.label.includes(forbidden),false)
 assert.equal(companyLedger.find(x=>x.id===restored.id).label,restored.label)
 for(const view of [company,self])assert.equal(view.obligationDetails.find(x=>x.obligationId===restored.id).label,restored.label)
 for(const view of [branch,company,self]){assert.equal(Number(view.item.netPay),9067.89);assert.equal(view.lines.totals.net,9067.89);assert.equal(view.lines.totals.earnings,9067.89);assert.equal(view.lines.totals.deductions,0)}
 assert.deepEqual(await state(),before)
 t.diagnostic(JSON.stringify({case:'real-restored-ledger-controls',foreignRunRead:403,currentRunRead:200,ledgerLabel:visible.label,obligationDetailLabel:detail.label,companyLabel:restored.label,net:9067.89,restoredAmount:67.89,companyAndSelfPreserved:true,storedUnchanged:true}))
})
for(const route of ['payslip','run-lines','run-detail','events'])test(`CR39 ${route}: no foreign payroll period through a current in-scope payroll`,{timeout:60000},async t=>{
 const before=await state(),url=route==='payslip'?`/payroll/items/${item.id}`:route==='run-lines'?`/payroll/runs/${current.id}/lines`:route==='events'?`/payroll/runs/${current.id}/events`:`/payroll/runs/${current.id}`
 const branch=await f.ok('GET',url,null,reader),company=await f.ok('GET',url),leaks=textPaths(branch),companyRefs=textPaths(company)
 assert.deepEqual(await state(),before)
 t.diagnostic(JSON.stringify({case:'in-scope-payroll-foreign-text',route,originalForeignPeriod:'2026-07',currentVisiblePeriod:period,directForeignRead:403,routeStatus:200,leaks,companyRefs,net:9067.89,storedUnchanged:true}))
 assert.deepEqual(leaks,[],'The current payroll is visible; an embedded reference to the old foreign payroll is not')
})
