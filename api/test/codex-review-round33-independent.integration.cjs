'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),setup=require('./codex-review-round33-support.cjs')
let f,desk,departmentB,teamB,seq=0
const period='2030-07',amount=150.25
before(async()=>{f=await setup('r33_independent');desk=await f.actor('r33-allowances',['payroll.calculate','payroll.view']);departmentB=await f.repo('Department').save({name:'CR33 department B',branchId:f.B.id});teamB=await f.repo('Team').save({name:'CR33 team B',departmentId:departmentB.id})},{timeout:180000})
after(async()=>{if(f)await f.close()})
async function employee(){const e=await f.employee(9000,f.A,{bankName:'CR33 fixture bank'});await f.repo('AttendanceExemption').save({employeeId:e.id,effectiveFrom:'2020-01-01',effectiveTo:'2031-12-31',reasonCode:'field_role',reason:'CR33 isolate allowance arithmetic',status:'APPROVED',createdByUserId:f.admin.id,approvedByUserId:f.admin.id,approvedAt:new Date('2020-01-01T08:00:00Z'),terminatedFrom:null,requiresCheckinForPresence:false});return e}
async function transfer(emp){const c=await f.ok('GET',`/attendance/calendar-context?scope=EMPLOYEE&sourceId=${emp.id}`);await f.ok('PATCH',`/employees/${emp.id}`,{branchId:f.B.id,departmentId:departmentB.id,teamId:teamB.id,calendarChange:{effectiveFrom:new Date().toLocaleDateString('en-CA'),reason:'CR33 actual branch transfer',expectedRevision:c.revision,expectedCurrentSourceHash:c.currentSourceHash}})}
async function scenario(foreign,count=1,mixed=false){
 const employees=[];for(let i=0;i<count;i++)employees.push(await employee())
 const type=await f.ok('POST','/payroll/allowances/types',{name:'CR33 allowance '+(++seq)})
 const body={period,allowanceTypeId:type.id,amount:String(amount),targetLevel:'employees',branchId:f.A.id,employeeIds:employees.map(e=>e.id),reason:'CR33 scope and arithmetic'}
 const grant=await f.ok('POST','/payroll/allowances/grants',body,desk)
 if(foreign)for(const e of employees)await transfer(e)
 const extra=mixed?[await employee()]:[]
 const run=await f.draft('CR33 '+(foreign?'PRIVATE B':'VISIBLE A')+' '+seq,[...employees,...extra].map(e=>e.id),period)
 await f.calculate(run)
 const lines=await f.repo('PayrollAllowanceGrantLine').findBy({grantId:grant.id})
 for(const e of employees){
  const member=await f.repo('PayrollRunMember').findOneByOrFail({runId:run.id,employeeId:e.id});assert.equal(member.snapshot.branchId,foreign?f.B.id:f.A.id)
  const item=await f.repo('PayrollItem').findOneByOrFail({runId:run.id,employeeId:e.id});assert.equal(Number(item.otherAdditions),amount);assert.equal(Number(item.netPay),9000+amount)
 }
 return {employees,type,body,grant,run,lines,extra}
}
async function listed(ctx,user=desk){const list=await f.ok('GET',`/payroll/allowances/grants?period=${period}`,null,user);return list.rows.filter(row=>row.grantId===ctx.grant.id)}
for(const foreign of [false,true])for(const action of ['line','grant'])test(`CR33 ${foreign?'foreign':'own'} payroll references in list and ${action} cancellation; recalculation removes the exact amount`,{timeout:120000},async t=>{
 const ctx=await scenario(foreign,action==='grant'?2:1),rows=await listed(ctx)
 assert.equal(rows.length,ctx.lines.length)
 for(const row of rows){assert.equal(row.amount,amount);assert.equal(row.state,'IN_RUN');assert.deepEqual([row.runId,row.runName,row.runStatus],foreign?[null,null,null]:[ctx.run.id,ctx.run.name,'CALCULATED'])}
 for(const row of await listed(ctx,f.admin))assert.equal(row.runId,ctx.run.id)
 const response=await f.ok('POST',`/payroll/allowances/${action==='line'?'lines/'+ctx.lines[0].id:'grants/'+ctx.grant.id}/cancel`,{},desk)
 assert.deepEqual(response.recalculateRuns,foreign?[]:[{id:ctx.run.id,name:ctx.run.name,status:'CALCULATED'}])
 if(action==='grant'){assert.equal(response.cancelled,2);assert.equal(response.locked,0)}else assert.equal(response.status,'CANCELLED')
 for(const line of ctx.lines)assert.equal((await f.repo('EmployeeObligation').findOneByOrFail({id:line.obligationId})).status,'CANCELLED')
 await f.ok('POST',`/payroll/runs/${ctx.run.id}/recalculate`,{reason:'CR33 cancelled allowance'})
 for(const e of ctx.employees){const item=await f.repo('PayrollItem').findOneByOrFail({runId:ctx.run.id,employeeId:e.id});assert.equal(Number(item.otherAdditions),0);assert.equal(Number(item.netPay),9000)}
 t.diagnostic(JSON.stringify({case:'allowance-cancellation',foreign,action,rows:rows.length,referenceVisible:!foreign,netBefore:9150.25,netAfter:9000,companyReferenceVisible:true}))
})
test('CR33 a mixed run header is hidden for an allowance whose own employee snapshot is foreign',{timeout:120000},async t=>{
 const ctx=await scenario(true,1,true),rows=await listed(ctx)
 assert.deepEqual([rows[0].runId,rows[0].runName,rows[0].runStatus],[null,null,null])
 assert.equal((await listed(ctx,f.admin))[0].runId,ctx.run.id)
 const result=await f.ok('POST',`/payroll/allowances/grants/${ctx.grant.id}/cancel`,{},desk)
 assert.deepEqual(result.recalculateRuns,[])
 t.diagnostic(JSON.stringify({case:'allowance-mixed-member-scope',members:2,allowanceEmployeeBranch:f.B.id,otherEmployeeBranch:f.A.id,referenceHidden:true}))
})
for(const paid of [false,true])test(`CR33 cancellation refusal for foreign ${paid?'paid':'approved'} payroll must not expose its identifier`,{timeout:120000},async t=>{
 const ctx=await scenario(true),line=ctx.lines[0]
 await f.approve(ctx.run.id)
 if(paid)await f.ok('POST',`/payroll/runs/${ctx.run.id}/pay`,{channel:'CASH',reference:'CR33 PAY '+ctx.run.id},f.approver)
 const before=await f.repo('EmployeeObligation').findOneByOrFail({id:line.obligationId}),beforeLine=await f.repo('PayrollAllowanceGrantLine').findOneByOrFail({id:line.id})
 assert.equal(before.status,paid?'APPLIED':'PENDING');assert.equal(paid?before.appliedPayrollRunId:before.reservedPayrollRunId,ctx.run.id)
 const rows=await listed(ctx);assert.equal(rows[0].state,paid?'PAID':'APPROVED');assert.equal(rows[0].canCancel,false);assert.equal(rows[0].runId,null)
 assert.equal((await f.request('GET',`/payroll/runs/${ctx.run.id}`,null,desk)).status,403)
 const result=await f.request('POST',`/payroll/allowances/lines/${line.id}/cancel`,{},desk)
 assert.equal(result.status,409)
 assert.deepEqual(await f.repo('EmployeeObligation').findOneByOrFail({id:line.obligationId}),before)
 assert.deepEqual(await f.repo('PayrollAllowanceGrantLine').findOneByOrFail({id:line.id}),beforeLine)
 const company=await f.request('POST',`/payroll/allowances/lines/${line.id}/cancel`,{},f.admin)
 assert.equal(company.status,409);assert.ok(company.body.message.includes('#'+ctx.run.id),'Company may identify its own protected payroll')
 const leaked=String(result.body.message).includes('#'+ctx.run.id)
 t.diagnostic(JSON.stringify({case:'allowance-refusal-reference',paid,responseStatus:result.status,response:result.body,foreignRunId:ctx.run.id,listRunId:rows[0].runId,directRead:403,ledgerUnchanged:true,leaked}))
 assert.ok(!leaked,'A refusal must preserve financial protection without disclosing the hidden payroll identifier')
})
for(const foreign of [false,true])test(`CR33 post-commit lockedRuns ${foreign?'hides the foreign':'keeps the own'} approved payroll`,{timeout:120000},async t=>{
 const emp=await employee(),type=await f.ok('POST','/payroll/allowances/types',{name:'CR33 locked reference '+(++seq)})
 const service=f.app.get(require('../src/payroll/allowances-grants.service').PayrollAllowancesService),original=service.monthRunsFor
 let armed=true,run,result
 service.monthRunsFor=async function(month,ids){
  if(armed&&month===period&&ids.includes(emp.id)){
   armed=false
   assert.equal(await f.repo('PayrollAllowanceGrantLine').countBy({employeeId:emp.id,allowanceTypeId:type.id}),1)
   if(foreign)await transfer(emp)
   run=await f.draft('CR33 locked '+(foreign?'PRIVATE B ':'VISIBLE A ')+seq,[emp.id],period)
   await f.calculate(run);await f.approve(run.id)
  }
  return original.call(this,month,ids)
 }
 try{result=await f.ok('POST','/payroll/allowances/grants',{period,allowanceTypeId:type.id,amount:String(amount),targetLevel:'employees',branchId:f.A.id,employeeIds:[emp.id],reason:'CR33 approval before response'},desk)}finally{service.monthRunsFor=original}
 assert.ok(run);assert.equal(result.total,amount);assert.deepEqual(result.recalculateRuns,[])
 assert.deepEqual(result.lockedRuns,foreign?[]:[{id:run.id,name:run.name,status:'APPROVED'}])
 const ctx={grant:{id:result.id},run},rows=await listed(ctx)
 assert.equal(rows[0].state,'APPROVED');assert.equal(rows[0].runId,foreign?null:run.id)
 assert.equal((await listed(ctx,f.admin))[0].runId,run.id)
 t.diagnostic(JSON.stringify({case:'allowance-locked-response',foreign,total:result.total,lockedRuns:result.lockedRuns,companyReferenceVisible:true}))
})
test('CR33 legacy payroll without membership uses its stamped branch and preserves company visibility',{timeout:120000},async t=>{
 for(const foreign of [false,true]){
  const ctx=await scenario(foreign)
  // Deliberately model a pre-membership payroll only inside our owned disposable database.
  await f.repo('PayrollRunMember').delete({runId:ctx.run.id})
  await f.repo('PayrollRun').update(ctx.run.id,{branchId:foreign?f.B.id:f.A.id,scopeType:'BRANCH',scopeIds:JSON.stringify([foreign?f.B.id:f.A.id]),definition:null})
  const rows=await listed(ctx)
  assert.equal(rows[0].runId,foreign?null:ctx.run.id);assert.equal((await listed(ctx,f.admin))[0].runId,ctx.run.id)
  const response=await f.ok('POST',`/payroll/allowances/lines/${ctx.lines[0].id}/cancel`,{},desk)
  assert.deepEqual(response.recalculateRuns,foreign?[]:[{id:ctx.run.id,name:ctx.run.name,status:'CALCULATED'}])
 }
 t.diagnostic(JSON.stringify({case:'legacy-payroll-reference',ownVisible:true,foreignHidden:true,companyBothVisible:true,fixture:'explicit pre-membership shape in disposable database only'}))
})
