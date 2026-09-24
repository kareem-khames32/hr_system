'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
let f
before(async()=>{f=await require('./codex-review-round2-fixture.cjs')('largerun')},{timeout:180000})
after(async()=>{if(f)await f.close()})
test('CR2 500 employee endpoint fails at member batch and rolls back entire calculation',async t=>{
  const branch=await f.repo('Branch').save({code:'BIGRUN',name:'Independent large run'})
  const policyVersionId=await f.policy()
  const staff=[];for(let i=0;i<500;i++)staff.push({employeeCode:`BIG${i}`,fullName:`Synthetic ${i}`,branchId:branch.id,joinDate:'2020-01-01',status:'active',isActive:true,basicSalary:7800,payMethod:'cash'})
  await f.repo('Employee').save(staff,{chunk:50})
  const draft=await f.ok('POST','/payroll/runs',{name:'Independent 500 failure',period:'2026-10',policyVersionId,filters:{branchIds:[branch.id]}})
  const {SqlServerQueryRunner}=require('../node_modules/typeorm/driver/sqlserver/SqlServerQueryRunner'),original=SqlServerQueryRunner.prototype.query
  let failedSql,lockAcquiredAt,lockHeldMs
  SqlServerQueryRunner.prototype.query=async function(sql,...args){
    try{const out=await original.call(this,sql,...args);if(sql.includes("hr:payroll:calculation"))lockAcquiredAt=performance.now();return out}catch(e){if(this.connection.options.database===f.database)failedSql={number:e.driverError?.number,code:e.driverError?.code,parameters:args[0]?.length,memberInsert:/INSERT INTO ["\[]payroll_run_members["\]]/.test(sql)};throw e}
  }
  let response
  try{response=await f.request('POST',`/payroll/runs/${draft.id}/calculate`,{});lockHeldMs=performance.now()-lockAcquiredAt}finally{SqlServerQueryRunner.prototype.query=original}
  const run=await f.repo('PayrollRun').findOneByOrFail({id:draft.id})
  const state={status:run.status,items:await f.repo('PayrollItem').countBy({runId:draft.id}),members:await f.repo('PayrollRunMember').countBy({runId:draft.id}),accrual:await f.repo('PayrollDailyAccrual').countBy({runId:draft.id})}
  t.diagnostic(JSON.stringify({endpointStatus:response.status,failedSql,state,lockToResponseMs:lockHeldMs}))
  assert.equal(response.status,500);assert.deepEqual(failedSql,{number:8003,code:'EREQUEST',parameters:3000,memberInsert:true})
  assert.deepEqual(state,{status:'DRAFT',items:0,members:0,accrual:0})
},{timeout:1200000})
