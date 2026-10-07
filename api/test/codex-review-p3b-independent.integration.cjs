'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
const fixture=require('./codex-review-p3b-positions-fixture.cjs')
let f
before(async()=>{f=await fixture('p3b_independent')})
after(async()=>{if(f)await f.close()})
test('P3B-I01: a moved department and team must not expose their foreign identifiers',async()=>{
 const p=await f.position({teamId:f.T.id})
 try{
  await f.ok('PATCH',`/departments/${f.D.id}`,{branchId:f.B.id})
  const detail=await f.ok('GET',`/positions/${p.id}`,null,f.viewer)
  const list=await f.ok('GET','/positions',null,f.viewer)
  const options=await f.ok('GET',`/positions/options?branchId=${f.A.id}`,null,f.viewer)
  const preview=await f.ok('GET','/positions/generate',null,f.viewer)
  const actual={detail:[detail.departmentId,detail.teamId,detail.departmentName,detail.teamName],list:list.positions.find(x=>x.id===p.id),option:options.positions.find(x=>x.id===p.id),preview:preview.groups}
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'foreign-department-reference',actual}))
  assert.equal(detail.departmentName,'قسم برّه الفرع');assert.equal(detail.teamName,null)
  assert.notEqual(detail.departmentId,f.D.id,'foreign department ID must be redacted along with its name')
  assert.notEqual(detail.teamId,f.T.id,'foreign team ID must be redacted along with its name')
 }finally{await f.ok('PATCH',`/departments/${f.D.id}`,{branchId:f.A.id})}
})
test('P3B-I02: moving a team alone to a foreign department must hide its current name',async()=>{
 const p=await f.position({teamId:f.T.id})
 try{
  await f.ok('PATCH',`/teams/${f.T.id}`,{departmentId:f.E.id,name:'Foreign team identity after move'})
  const detail=await f.ok('GET',`/positions/${p.id}`,null,f.viewer)
  const options=await f.ok('GET',`/positions/options?branchId=${f.A.id}`,null,f.viewer)
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'foreign-team-name',detail:{teamId:detail.teamId,teamName:detail.teamName},option:options.positions.find(x=>x.id===p.id)}))
  assert.notEqual(detail.teamName,'Foreign team identity after move','team current department is outside the reader branch')
 }finally{await f.ok('PATCH',`/teams/${f.T.id}`,{departmentId:f.D.id,name:'Synthetic own team'})}
})
test('P3B-I03: department validity must survive waiting for the position creation lock',async()=>{
 const D=await f.department(),emp=await f.employee({departmentId:D.id}),actor=await f.account(emp)
 const title=await f.repo('JobTitle').save({title:'Synthetic race title',isActive:true})
 const request=await f.ask({positionTitle:title.title},actor)
 const held=f.ds.createQueryRunner();await held.connect();await held.startTransaction()
 let pending,result
 try{
  await held.query("DECLARE @r int; EXEC @r = sys.sp_getapplock @Resource=N'hr:positions:generate', @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=5000; SELECT @r AS result")
  pending=f.approve(request.id)
  let blocked=false
  for(let i=0;i<100;i++){
   const rows=await f.ds.query('SELECT COUNT(*) AS n FROM sys.dm_exec_requests WHERE database_id=DB_ID() AND blocking_session_id<>0')
   if(Number(rows[0].n)>0){blocked=true;break}await new Promise(r=>setTimeout(r,25))
  }
  assert.ok(blocked,'approval reached the held database lock')
  await f.ok('PATCH',`/departments/${D.id}`,{branchId:f.B.id})
  await held.commitTransaction();result=await pending
  const created=await f.repo('ApprovedPosition').find({where:{jobTitleId:title.id}})
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'request-department-race',approval:result.status,positions:created.map(p=>({id:p.id,branchId:p.branchId,departmentId:p.departmentId})),departmentCurrentBranch:f.B.id}))
  assert.equal(result.status,400,'approval must reject a department moved out of the request branch while waiting')
  assert.equal(created.length,0)
 }finally{if(held.isTransactionActive)await held.rollbackTransaction();await held.release();if(pending)await pending}
})
test('P3B-I04: generation must not overwrite a holder assignment committed after its initial plan',async()=>{
 const title=await f.repo('JobTitle').save({title:'Synthetic generation race title',isActive:true})
 const emp=await f.employee({jobTitle:title.title})
 const target=await f.position({jobTitleId:title.id,teamId:f.T.id})
 let release,entered;const barrier=new Promise(r=>entered=r),resume=new Promise(r=>release=r)
 const original=f.service.generationPlan
 let intercepted=false,pending
 f.service.generationPlan=async function(em,...args){const plan=await original.call(this,em,...args);if(em.queryRunner?.isTransactionActive&&!intercepted){intercepted=true;entered();await resume}return plan}
 try{
  pending=f.request('POST','/positions/generate',{},f.viewer)
  await Promise.race([barrier,pending.then(()=>{throw Error('Generation completed before barrier')}),new Promise((_,r)=>setTimeout(()=>r(Error('Generation barrier timeout')),5000))])
  await f.ok('POST',`/positions/${target.id}/holders`,{employeeId:emp.id},f.viewer)
  release();const result=await pending
  assert.equal(result.status,201,JSON.stringify(result.body))
  const holder=await f.repo('PositionHolder').findOneByOrFail({employeeId:emp.id})
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'generation-overwrites-link',assigned:target.id,final:holder.positionId,response:result.body}))
  assert.equal(holder.positionId,target.id,'employee already seated in its unit must be skipped after acquiring its row lock')
 }finally{release();f.service.generationPlan=original;if(pending)await pending}
})
