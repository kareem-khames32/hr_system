'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),setup=require('./codex-review-round40-support.cjs')
let f,reader,multi,teamA,teamB,cc,eA,eB
const reason='ضوابط مستقلة لتسمية نطاق المسير والأرقام'
before(async()=>{
 f=await setup('r40_scopes');reader=await f.actor('r40-reader',['payroll.view','reports.view']);multi=await f.actor('r40-multi',['payroll.view','reports.view'],f.A,{scopeBranchIds:JSON.stringify([f.A.id,f.B.id])})
 const da=await f.repo('Department').save({name:'CR40 allowed department',branchId:f.A.id}),db=await f.repo('Department').save({name:'CR40 private department',branchId:f.B.id})
 teamA=await f.repo('Team').save({name:'CR40 allowed team',departmentId:da.id});teamB=await f.repo('Team').save({name:'CR40 private team',departmentId:db.id})
 cc=await f.repo('CostCenter').save({code:'CR40_CC',name:'CR40 company cost center'})
 eA=await f.employee(6000,f.A,{bankName:'CR40 bank',departmentId:da.id,teamId:teamA.id,costCenterId:cc.id})
 eB=await f.employee(9000,f.B,{bankName:'CR40 bank',departmentId:db.id,teamId:teamB.id,costCenterId:cc.id})
 for(const e of [eA,eB])await f.repo('AttendanceExemption').save({employeeId:e.id,effectiveFrom:'2020-01-01',effectiveTo:'2031-12-31',reasonCode:'field_role',reason,status:'APPROVED',createdByUserId:f.admin.id,approvedByUserId:f.admin.id,approvedAt:new Date('2020-01-01T08:00:00Z'),requiresCheckinForPresence:false})
},{timeout:180000})
after(async()=>{if(f)await f.close()})
for(const [kind,period] of [['TEAM','2026-07'],['CUSTOM','2026-08'],['COST_CENTER','2026-09']])test(`CR40 ${kind}: scoped labels, multi-branch/company control, counts and legacy branch header`,{timeout:180000},async t=>{
 const filters=kind==='TEAM'?{teamIds:[teamA.id,teamB.id]}:kind==='CUSTOM'?{employeeIds:[eA.id,eB.id]}:{branchIds:[f.A.id,f.B.id]}
 const run=await f.ok('POST','/payroll/runs',{name:'CR40 mixed '+kind,period,policyVersionId:f.version,filters});await f.calculate(run);await f.pay(run)
 assert.equal(Number((await f.repo('PayrollRun').findOneByOrFail({id:run.id})).totalNet),15000)
 // Explicit legacy-header fixtures, retaining real calculated items and membership snapshots.
 // Current definition API does not accept a cost-center-only filter; that report scope is tested as historical metadata.
 if(kind==='CUSTOM')await f.repo('PayrollRun').update(run.id,{branchId:f.B.id})
 if(kind==='COST_CENTER')await f.repo('PayrollRun').update(run.id,{scopeType:'COST_CENTER',scopeIds:JSON.stringify([cc.id])})
 assert.equal((await f.request('GET',`/payroll/runs/${run.id}`,null,reader)).status,403)
 const before={run:await f.repo('PayrollRun').findOneByOrFail({id:run.id}),items:await f.repo('PayrollItem').findBy({runId:run.id})}
 const branch=await f.ok('GET','/reports/payroll',null,reader),company=await f.ok('GET','/reports/payroll'),allBranches=await f.ok('GET','/reports/payroll',null,multi)
 const unassigned=await f.ok('GET',`/reports/payroll/unassigned?period=${period}`,null,reader)
 const b=branch.runs.find(x=>x.id===run.id),c=company.runs.find(x=>x.id===run.id),m=allBranches.runs.find(x=>x.id===run.id),u=unassigned.runs.find(x=>x.period===period)
 assert.ok(b&&c&&m&&u);assert.equal(Number(b.totalNet),6000);assert.equal(b.employees,1);assert.equal(b.storedTotalNet,null)
 assert.equal(Number(c.totalNet),15000);assert.equal(c.employees,2);assert.equal(Number(m.totalNet),15000);assert.equal(m.employees,2)
 assert.equal(u.scopeLabel,b.scopeLabel)
 if(kind==='TEAM'){
  assert.equal(b.scopeLabel,'فريق: '+teamA.name+'، وغيرها خارج نطاق صلاحيتك')
  assert.equal(c.scopeLabel,'فريق: '+teamA.name+'، '+teamB.name);assert.equal(m.scopeLabel,c.scopeLabel)
 }else if(kind==='CUSTOM'){
  assert.equal(b.scopeLabel,'قائمة مخصّصة');assert.equal(m.scopeLabel,'قائمة مخصّصة');assert.equal(c.scopeLabel,'قائمة مخصّصة (2 موظف)')
  assert.equal(b.branchId,null);assert.equal(b.branchName,null);assert.equal(c.branchId,f.B.id);assert.equal(c.branchName,f.B.name);assert.equal(m.branchId,f.B.id)
 }else{assert.equal(b.scopeLabel,'مركز تكلفة: '+cc.name);assert.equal(c.scopeLabel,b.scopeLabel);assert.equal(m.scopeLabel,b.scopeLabel)}
 assert.deepEqual({run:await f.repo('PayrollRun').findOneByOrFail({id:run.id}),items:await f.repo('PayrollItem').findBy({runId:run.id})},before)
 t.diagnostic(JSON.stringify({case:'extended-scope-label-controls',kind,branchLabel:b.scopeLabel,companyLabel:c.scopeLabel,multiLabel:m.scopeLabel,localTotal:b.totalNet,companyTotal:c.totalNet,branchHeader:[b.branchId,b.branchName],companyHeader:[c.branchId,c.branchName],storedUnchanged:true}))
})
