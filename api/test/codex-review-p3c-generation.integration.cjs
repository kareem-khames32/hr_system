'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
let f
before(async()=>{f=await require('./codex-review-p3c-positions-fixture.cjs')('p3c_generation')})
after(async()=>{if(f)await f.close()})
async function pausePlan(change){
 const original=f.service.generationPlan;let release,entered,once=false,pending,timer
 const arrived=new Promise(r=>entered=r),resume=new Promise(r=>release=r)
 f.service.generationPlan=async function(em,...args){const plan=await original.call(this,em,...args);if(em.queryRunner?.isTransactionActive&&!once){once=true;entered(plan);await resume}return plan}
 try{
  pending=f.request('POST','/positions/generate',{},f.viewer)
  const plan=await Promise.race([arrived,pending.then(()=>{throw Error('Generation completed before plan barrier')}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Plan barrier timeout')),5000)})])
  clearTimeout(timer);await change(plan);release();const response=await pending
  assert.equal(response.status,201,JSON.stringify(response.body));return response.body
 }finally{clearTimeout(timer);release();f.service.generationPlan=original;if(pending)await pending}
}
test('P3C-G01: an existing position committed after the plan must prevent duplicate generation',async()=>{
 const title=await f.repo('JobTitle').save({title:'Synthetic concurrent manual position',isActive:true}),D=await f.department()
 await f.employee({jobTitle:title.title,departmentId:D.id,teamId:null})
 let manuallyCreated
 const result=await pausePlan(async plan=>{
  assert.equal(plan.find(g=>g.jobTitleId===title.id).action,'create')
  manuallyCreated=await f.position({jobTitleId:title.id,departmentId:D.id})
 })
 const rows=await f.repo('ApprovedPosition').find({where:{jobTitleId:title.id,departmentId:D.id}})
 console.log('REVIEW_MEASURE '+JSON.stringify({case:'generation-existing-after-plan',manual:manuallyCreated.id,positions:rows.map(p=>({id:p.id,headcount:p.headcount})),result}))
 assert.equal(rows.length,1,'generation must recheck whether its title/unit already has a non-cancelled position')
})
test('P3C-G02: an inactive catalog title after the plan must not create a new approved position',async()=>{
 const title=await f.repo('JobTitle').save({title:'Synthetic disabled catalog race',isActive:true}),D=await f.department()
 await f.employee({jobTitle:title.title,departmentId:D.id,teamId:null})
 const result=await pausePlan(async plan=>{
  assert.equal(plan.find(g=>g.jobTitleId===title.id).action,'create')
  await f.ok('PATCH',`/catalogs/job-titles/${title.id}`,{isActive:false})
 })
 const current=await f.repo('JobTitle').findOneByOrFail({id:title.id}),rows=await f.repo('ApprovedPosition').find({where:{jobTitleId:title.id}})
 console.log('REVIEW_MEASURE '+JSON.stringify({case:'generation-inactive-title-after-plan',active:current.isActive,created:rows.map(p=>p.id),result}))
 assert.equal(current.isActive,false);assert.equal(rows.length,0,'generation must recheck the catalog title still qualifies')
})
test('P3C-G03: equivalent changes before the plan are skipped',async()=>{
 const title=await f.repo('JobTitle').save({title:'Synthetic manual before generation',isActive:true}),D=await f.department()
 await f.employee({jobTitle:title.title,departmentId:D.id,teamId:null})
 const p=await f.position({jobTitleId:title.id,departmentId:D.id})
 const disabled=await f.repo('JobTitle').save({title:'Synthetic disabled before generation',isActive:false})
 await f.employee({jobTitle:disabled.title,departmentId:D.id,teamId:null})
 await f.ok('POST','/positions/generate',{},f.viewer)
 assert.deepEqual((await f.repo('ApprovedPosition').find({where:{jobTitleId:title.id}})).map(p=>p.id),[p.id])
 assert.equal(await f.repo('ApprovedPosition').count({where:{jobTitleId:disabled.id}}),0)
})
