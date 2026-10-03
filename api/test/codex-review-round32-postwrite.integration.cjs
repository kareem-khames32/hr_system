'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),setup=require('./codex-review-round32-support.cjs')
let f,desk,departmentB,teamB
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r});return {promise,resolve}}
async function within(p,ms){let timer;try{return await Promise.race([p.then(value=>({done:true,value})),new Promise(resolve=>{timer=setTimeout(()=>resolve({done:false}),ms)})])}finally{clearTimeout(timer)}}
before(async()=>{f=await setup('r32_postwrite');desk=await f.actor('r32-allowances',['payroll.calculate','payroll.view']);departmentB=await f.repo('Department').save({name:'CR32 private department B',branchId:f.B.id});teamB=await f.repo('Team').save({name:'CR32 private team B',departmentId:departmentB.id})},{timeout:180000})
after(async()=>{if(f)await f.close()})
const period='2030-07'
test('CR32 allowance success reply does not expose a new foreign run created after its transaction committed',{timeout:120000},async t=>{
 const emp=await f.employee(9000),type=await f.ok('POST','/payroll/allowances/types',{name:'CR32 allowance response'})
 const service=f.app.get(require('../src/payroll/allowances-grants.service').PayrollAllowancesService),original=service.monthRunsFor,entered=deferred(),gate=deferred()
 let armed=true,pending,result,foreign,stored,privateRead
 service.monthRunsFor=async function(month,ids){if(armed&&month===period&&ids.includes(emp.id)){armed=false;entered.resolve();await gate.promise}return original.call(this,month,ids)}
 try{
  pending=f.request('POST','/payroll/allowances/grants',{period,allowanceTypeId:type.id,amount:'150.25',targetLevel:'employees',branchId:f.A.id,employeeIds:[emp.id],reason:'CR32 legitimate allowance before transfer'},desk)
  assert.equal((await within(entered.promise,8000)).done,true)
  const line=await f.repo('PayrollAllowanceGrantLine').findOneByOrFail({employeeId:emp.id,allowanceTypeId:type.id})
  assert.equal(line.branchId,f.A.id);assert.equal(Number(line.amount),150.25)
  assert.equal((await f.repo('EmployeeObligation').findOneByOrFail({id:line.obligationId})).status,'PENDING')
  const context=await f.ok('GET',`/attendance/calendar-context?scope=EMPLOYEE&sourceId=${emp.id}`)
  await f.ok('PATCH',`/employees/${emp.id}`,{branchId:f.B.id,departmentId:departmentB.id,teamId:teamB.id,calendarChange:{effectiveFrom:new Date().toLocaleDateString('en-CA'),reason:'CR32 actual transfer after allowance saved',expectedRevision:context.revision,expectedCurrentSourceHash:context.currentSourceHash}})
  foreign=await f.draft('CR32 NEW PRIVATE B PAYROLL',[emp.id],period)
  await f.calculate(foreign)
  stored=await f.repo('PayrollRunMember').findBy({runId:foreign.id})
  assert.equal(stored.length,1)
  assert.equal(stored[0].snapshot.branchId,f.B.id,'The new run has only a branch-B snapshot, not a mixed run')
  privateRead=await f.request('GET',`/payroll/runs/${foreign.id}`,null,desk)
  assert.equal(privateRead.status,403,JSON.stringify(privateRead.body))
  assert.ok(!(await f.ok('GET','/payroll/runs',null,desk)).some(row=>row.id===foreign.id))
  gate.resolve();result=await pending
 }finally{gate.resolve();await Promise.allSettled([pending].filter(Boolean));service.monthRunsFor=original}
 assert.equal(result.status,201,JSON.stringify(result.body));assert.equal(result.body.total,150.25)
 const leaked=result.body.recalculateRuns?.find(row=>row.id===foreign.id)
 t.diagnostic(JSON.stringify({case:'allowance-postcommit-foreign-run',responseStatus:result.status,response:result.body,foreignRead:privateRead.status,foreignRunId:foreign.id,foreignName:foreign.name,memberBranchIds:stored.map(m=>m.snapshot.branchId),leaked:!!leaked}))
 assert.ok(!leaked,'The post-commit response must not disclose a run wholly outside the writer branch')
})
test('CR32 allowance reply retains an in-scope run reference and exact amount',{timeout:120000},async t=>{
 const emp=await f.employee(9000),run=await f.draft('CR32 visible allowance run',[emp.id],period)
 await f.calculate(run)
 const type=await f.ok('POST','/payroll/allowances/types',{name:'CR32 allowed allowance'})
 const response=await f.ok('POST','/payroll/allowances/grants',{period,allowanceTypeId:type.id,amount:'150.25',targetLevel:'employees',branchId:f.A.id,employeeIds:[emp.id],reason:'CR32 allowed response'},desk)
 assert.equal(response.created,1);assert.equal(response.total,150.25)
 assert.ok(response.recalculateRuns.some(row=>row.id===run.id&&row.name===run.name))
 t.diagnostic(JSON.stringify({case:'allowance-postcommit-control',created:response.created,total:response.total,inScopeRunReturned:true}))
})
