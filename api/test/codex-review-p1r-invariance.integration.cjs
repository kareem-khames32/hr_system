'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),setup=require('./codex-review-p1r-support.cjs')
let f,reader,inside,left,outside,current,previous
async function historical(period,people,branch,status='APPROVED'){
 const run=await f.repo('PayrollRun').save({name:'P1R archived common series',period,startDate:period+'-01',endDate:period+'-28',branchId:branch.id,scopeType:'BRANCH',status,totalNet:people.length*6000,approvedAt:status==='APPROVED'?new Date(period+'-28T10:00:00Z'):null})
 for(const emp of people){await f.repo('PayrollRunMember').save({runId:run.id,employeeId:emp.id,membershipStatus:'INCLUDED',snapshot:{branchId:branch.id,employeeCode:emp.employeeCode,fullName:emp.fullName}})
  await f.repo('PayrollItem').save({runId:run.id,employeeId:emp.id,basicSalary:6000,netPay:6000,absenceDays:0,unpaidLeaveDays:0,payMethod:'cash',breakdown:JSON.stringify({gross:6000})})}
 return run
}
before(async()=>{f=await setup('p1r_invariance');reader=await f.actor('p1r-reader',['payroll.view']);inside=await f.employee();left=await f.employee();outside=await f.employee(6000,f.B)
 previous=await historical('2019-01',[inside,left],f.A);current=await historical('2026-11',[inside],f.A,'CALCULATED')},{timeout:120000})
after(async()=>{if(f)await f.close()})
test('P1R hidden payroll additions do not change a visible older comparison until the scan boundary',async t=>{
 const url=`/payroll/runs/${current.id}/changes`,before=await f.ok('GET',url,null,reader)
 assert.equal(before.previousSeriesPeriod,'2019-01');assert.equal(before.counts.leavers,1)
 for(let i=0;i<49;i++){const year=2020+Math.floor(i/12),month=String(i%12+1).padStart(2,'0');await historical(`${year}-${month}`,[outside],f.B)}
 const after=await f.ok('GET',url,null,reader);assert.deepEqual(after,before)
 t.diagnostic(JSON.stringify({case:'49-hidden-headers',responseIdentical:true,previousPeriod:after.previousSeriesPeriod,leavers:after.counts.leavers}))
})
test('P1R a fiftieth foreign header must not remove a visible previous series and leaver',async t=>{
 const url=`/payroll/runs/${current.id}/changes`,before=await f.ok('GET',url,null,reader)
 const foreign=await historical('2024-02',[outside],f.B)
 assert.equal((await f.request('GET',`/payroll/runs/${foreign.id}`,null,reader)).status,403)
 const after=await f.ok('GET',url,null,reader)
 t.diagnostic(JSON.stringify({case:'50-hidden-headers',before,after,foreignUnreadable:true,fixture:'seeded valid historical run and membership rows; no payroll calculation in this case'}))
 assert.deepEqual(after,before,'Foreign headers must not displace the visible historical series')
})
