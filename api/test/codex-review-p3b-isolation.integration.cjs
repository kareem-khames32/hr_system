'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
let f
before(async()=>{f=await require('./codex-review-p3b-positions-fixture.cjs')('p3b_isolation')})
after(async()=>{if(f)await f.close()})
test('P3B-H01: moved department identities are hidden and aggregated with identical update responses',async()=>{
 const D1=await f.department(),D2=await f.department()
 const p1=await f.position({departmentId:D1.id}),p2=await f.position({departmentId:D2.id})
 await f.employee({departmentId:D1.id,teamId:null});await f.employee({departmentId:D2.id,teamId:null})
 await f.ok('PATCH',`/departments/${D1.id}`,{branchId:f.B.id});await f.ok('PATCH',`/departments/${D2.id}`,{branchId:f.B.id})
 const list=await f.ok('GET','/positions',null,f.viewer),hidden=list.summary.filter(l=>l.departmentName==='قسم برّه الفرع')
 assert.equal(hidden.length,1);assert.equal(hidden[0].departmentId,null);assert.equal(hidden[0].approved,6);assert.equal(hidden[0].unassigned,2)
 const signatures=[]
 for(const departmentId of [D1.id,D2.id,999999]){
  const result=await f.request('PATCH',`/positions/${p1.id}`,{departmentId},f.viewer)
  signatures.push({status:result.status,message:result.body.message})
 }
 assert.equal(signatures[0].status,400);assert.deepEqual(signatures[0],signatures[1]);assert.deepEqual(signatures[0],signatures[2])
 const safe=await f.ok('PATCH',`/positions/${p1.id}`,{departmentId:null,budget:'100'},f.viewer)
 assert.equal(safe.departmentId,null);assert.equal(safe.unitHidden,true)
 assert.equal((await f.repo('ApprovedPosition').findOneByOrFail({id:p1.id})).departmentId,D1.id,'redacted null is not a write to the stored unit')
 const options=await f.ok('GET',`/positions/options?branchId=${f.A.id}`,null,f.viewer)
 assert.ok(!options.positions.some(p=>[p1.id,p2.id].includes(p.id)))
})
test('P3B-H02: same-branch team moves remain visible; outside moves hide name and ID until returned',async()=>{
 const D=await f.department(),p=await f.position({teamId:f.T.id})
 await f.ok('PATCH',`/teams/${f.T.id}`,{departmentId:D.id,name:'Synthetic same branch team'})
 let view=await f.ok('GET',`/positions/${p.id}`,null,f.viewer)
 assert.equal(view.teamId,f.T.id);assert.equal(view.teamName,'Synthetic same branch team');assert.equal(view.unitHidden,false)
 await f.ok('PATCH',`/teams/${f.T.id}`,{departmentId:f.E.id,name:'Synthetic foreign team name'})
 view=await f.ok('GET',`/positions/${p.id}`,null,f.viewer)
 assert.equal(view.teamId,null);assert.equal(view.teamName,'فريق برّه الفرع');assert.equal(view.unitHidden,true)
 await f.ok('PATCH',`/teams/${f.T.id}`,{departmentId:f.D.id})
 view=await f.ok('GET',`/positions/${p.id}`,null,f.viewer)
 assert.equal(view.teamId,f.T.id);assert.equal(view.teamName,'Synthetic foreign team name');assert.equal(view.unitHidden,false)
})
