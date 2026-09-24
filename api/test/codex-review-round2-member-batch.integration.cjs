'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
let f
before(async()=>{f=await require('./codex-review-round2-fixture.cjs')('memberbatch')},{timeout:180000})
after(async()=>{if(f)await f.close()})
test('CR2 isolate the same 500-member save used at payroll.service.ts:1185',async t=>{
  const run=await f.repo('PayrollRun').save({name:'Independent batch probe',period:'2026-10',startDate:'2026-09-23',endDate:'2026-10-22',status:'DRAFT'})
  const branch=await f.repo('Branch').save({code:'BATCH',name:'Synthetic batch'})
  const staff=[];for(let i=0;i<500;i++)staff.push({employeeCode:`BATCH${i}`,fullName:`Synthetic batch ${i}`,basicSalary:7800,branchId:branch.id})
  const employees=await f.repo('Employee').save(staff,{chunk:50})
  const members=employees.map(e=>f.repo('PayrollRunMember').create({runId:run.id,employeeId:e.id,snapshot:{employeeCode:e.employeeCode,gross:7800},membershipStatus:'INCLUDED',inclusionSource:'SCOPE',exclusionReason:null}))
  let failure
  try{await f.repo('PayrollRunMember').save(members)}catch(e){failure={name:e.name,code:e.driverError?.code,number:e.driverError?.number,parameters:e.parameters?.length,message:String(e.driverError?.message||e.message).split('\n')[0]}}
  t.diagnostic(JSON.stringify({batch:500,failure,rowsPersisted:await f.repo('PayrollRunMember').countBy({runId:run.id})}))
  assert.ok(failure,'Independent probe expects the observed large batch to fail')
  assert.equal(await f.repo('PayrollRunMember').countBy({runId:run.id}),0)
  // Control: identical input written in bounded batches, on the same disposable database.
  await f.repo('PayrollRunMember').save(members,{chunk:100})
  assert.equal(await f.repo('PayrollRunMember').countBy({runId:run.id}),500)
  t.diagnostic(JSON.stringify({controlChunk:100,identicalRowsSaved:500}))
},{timeout:180000})
