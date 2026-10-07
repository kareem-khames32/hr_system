'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),{AsyncLocalStorage}=require('node:async_hooks')
const fixture=require('./codex-review-p3c-positions-fixture.cjs')
let f
before(async()=>{f=await fixture('p3c_controls')})
after(async()=>{if(f)await f.close()})
test('P3C-C01: hidden position and employee responses equal nonexistent resources',async()=>{
 const own=await f.position(),foreign=await f.position({branchId:f.B.id,departmentId:f.E.id},f.admin)
 const emp=await f.employee({branchId:f.B.id,departmentId:f.E.id})
 const signature=r=>({status:r.status,message:r.body?.message})
 for(const [method,route,body]of [['GET','/positions/X',null],['PATCH','/positions/X',{headcount:4}],['POST','/positions/X/holders',{employeeId:emp.id}],['DELETE',`/positions/X/holders/${emp.id}`,null]]){
  const hidden=await f.request(method,route.replace('X',foreign.id),body,f.viewer),missing=await f.request(method,route.replace('X','999999'),body,f.viewer)
  assert.equal(hidden.status,404);assert.deepEqual(signature(hidden),signature(missing))
 }
 const hidden=await f.request('POST',`/positions/${own.id}/holders`,{employeeId:emp.id},f.viewer),missing=await f.request('POST',`/positions/${own.id}/holders`,{employeeId:999999},f.viewer)
 assert.deepEqual(signature(hidden),signature(missing));assert.equal(hidden.status,404)
 const options=await f.ok('GET',`/positions/options?branchId=${f.B.id}`,null,f.viewer);assert.deepEqual(options.positions,[])
})
test('P3C-C02: holder move removes identity from the old branch detail and counts',async()=>{
 const p=await f.position(),emp=await f.employee()
 await f.ok('POST',`/positions/${p.id}/holders`,{employeeId:emp.id},f.viewer)
 assert.equal((await f.ok('GET',`/positions/${p.id}`,null,f.viewer)).occupied,1)
 await f.repo('Employee').update(emp.id,{branchId:f.B.id,departmentId:f.E.id,teamId:null})
 const view=await f.ok('GET',`/positions/${p.id}`,null,f.viewer)
 assert.equal(view.occupied,0);assert.equal(view.holders.some(h=>h.employeeId===emp.id),false)
 await f.repo('Employee').update(emp.id,{branchId:f.A.id,departmentId:f.D.id,teamId:f.T.id})
 assert.equal((await f.ok('GET',`/positions/${p.id}`,null,f.viewer)).occupied,1)
})
test('P3C-C03: department staging overrides input; concurrent approvals combine once',async()=>{
 const title=await f.repo('JobTitle').save({title:'Synthetic approval concurrency',isActive:true})
 const r1=await f.ask({positionTitle:title.title,positionDepartmentId:f.E.id,positionDepartment:'Forged foreign unit',headcount:2})
 const r2=await f.ask({positionTitle:title.title,headcount:3})
 const payload=JSON.parse((await f.repo('Request').findOneByOrFail({id:r1.id})).payload)
 assert.equal(payload.positionDepartmentId,f.D.id);assert.equal(payload.positionDepartment,f.D.name)
 const result=await Promise.all([f.approve(r1.id),f.approve(r2.id)])
 for(const response of result)assert.equal(response.status,201,JSON.stringify(response.body))
 const positions=await f.repo('ApprovedPosition').find({where:{jobTitleId:title.id}})
 assert.equal(positions.length,1);assert.equal(positions[0].headcount,5)
 assert.notEqual((await f.approve(r1.id)).status,201)
 assert.equal((await f.repo('ApprovedPosition').findOneByOrFail({id:positions[0].id})).headcount,5)
})
test('P3C-C04: an already moved request department rejects before waiting; serial generation preserves a team holder',async()=>{
 const D=await f.department(),emp=await f.employee({departmentId:D.id}),actor=await f.account(emp)
 const req=await f.ask({},actor)
 await f.ok('PATCH',`/departments/${D.id}`,{branchId:f.B.id})
 assert.equal((await f.approve(req.id)).status,400)
 const title=await f.repo('JobTitle').save({title:'Synthetic preserved holder',isActive:true})
 const member=await f.employee({jobTitle:title.title}),p=await f.position({jobTitleId:title.id,teamId:f.T.id})
 await f.ok('POST',`/positions/${p.id}/holders`,{employeeId:member.id},f.viewer)
 await f.ok('POST','/positions/generate',{},f.viewer)
 assert.equal((await f.repo('PositionHolder').findOneByOrFail({employeeId:member.id})).positionId,p.id)
})
test('P3C-C05: position mutations and request execution use only their transaction SQL connection',async()=>{
 const {SqlServerQueryRunner}=require('../node_modules/typeorm/driver/sqlserver/SqlServerQueryRunner')
 const storage=new AsyncLocalStorage(),originalTransaction=f.ds.transaction,originalQuery=SqlServerQueryRunner.prototype.query
 const calls={own:0,foreign:0},bad=[]
 f.ds.transaction=function(...args){const callback=args.pop();return originalTransaction.call(this,...args,em=>storage.run(em.queryRunner,()=>callback(em)))}
 SqlServerQueryRunner.prototype.query=function(statement,...args){const current=storage.getStore();if(current&&this.connection===f.ds){if(this===current)calls.own++;else{calls.foreign++;bad.push(String(statement).slice(0,100))}}return originalQuery.call(this,statement,...args)}
 try{
  f.modules.invalidate()
  const title=await f.repo('JobTitle').save({title:'Synthetic SQL tracing',isActive:true})
  const p=await f.position({jobTitleId:title.id}),emp=await f.employee({jobTitle:title.title})
  await f.ok('PATCH',`/positions/${p.id}`,{headcount:7},f.viewer)
  f.modules.invalidate();await f.ok('POST',`/positions/${p.id}/holders`,{employeeId:emp.id},f.viewer)
  await f.ok('DELETE',`/positions/${p.id}/holders/${emp.id}`,null,f.viewer)
  await f.ok('POST','/positions/generate',{},f.viewer)
  const req=await f.ask({positionTitle:title.title});assert.equal((await f.approve(req.id)).status,201)
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'transaction-connection-trace',calls,bad}))
  assert.ok(calls.own>20);assert.equal(calls.foreign,0,JSON.stringify(bad))
 }finally{f.ds.transaction=originalTransaction;SqlServerQueryRunner.prototype.query=originalQuery}
})
