'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
const {Repository}=require('typeorm')
let f
before(async()=>{f=await require('./codex-review-p3c-positions-fixture.cjs')('p3c_residual')})
after(async()=>{if(f)await f.close()})
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
async function bounded(promise,label){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label)),7000)})])}finally{clearTimeout(timer)}}
async function waitBlocked(){for(let i=0;i<180;i++){const rows=await f.ds.query('SELECT COUNT(*) AS n FROM sys.dm_exec_requests WHERE database_id=DB_ID() AND blocking_session_id<>0');if(Number(rows[0].n)>0)return;await sleep(25)}throw Error('Approval never waited on the department lock')}
test('P3C-R01: approval waiting on manual creation must extend that frozen position, not create an active duplicate',async()=>{
 const D=await f.department(),person=await f.employee({departmentId:D.id,teamId:null}),actor=await f.account(person),req=await f.ask({},actor)
 const original=Repository.prototype.save;let entered,release,once=false,manual,approval
 const arrived=new Promise(r=>entered=r),resume=new Promise(r=>release=r)
 Repository.prototype.save=async function(entity,...args){
  if(!once&&this.metadata.name==='ApprovedPosition'&&entity.departmentId===D.id&&entity.status==='FROZEN'){
   once=true;entered();await resume
  }
  return original.call(this,entity,...args)
 }
 try{
  manual=f.position({departmentId:D.id,status:'FROZEN',headcount:3})
  await bounded(Promise.race([arrived,manual.then(()=>{throw Error('Manual creation finished before insertion barrier')})]),'Manual creation barrier timed out')
  approval=f.approve(req.id)
  await waitBlocked()
  release();const created=await manual,result=await approval
  assert.equal(result.status,201,JSON.stringify(result.body))
  const rows=await f.repo('ApprovedPosition').find({where:{jobTitleId:f.title.id,departmentId:D.id}})
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'approval-after-manual-insert',manual:created.id,approval:result.status,positions:rows.map(p=>({id:p.id,status:p.status,headcount:p.headcount}))}))
  assert.deepEqual(rows.map(p=>({id:p.id,status:p.status,headcount:p.headcount})),[{id:created.id,status:'FROZEN',headcount:5}])
 }finally{release();Repository.prototype.save=original;await Promise.allSettled([manual,approval].filter(Boolean))}
})
test('P3C-R02: frozen position committed before approval is extended without becoming active',async()=>{
 const D=await f.department(),person=await f.employee({departmentId:D.id,teamId:null}),actor=await f.account(person)
 const p=await f.position({departmentId:D.id,status:'FROZEN',headcount:3}),req=await f.ask({},actor),result=await f.approve(req.id)
 assert.equal(result.status,201,JSON.stringify(result.body))
 const rows=await f.repo('ApprovedPosition').find({where:{jobTitleId:f.title.id,departmentId:D.id}})
 assert.deepEqual(rows.map(r=>({id:r.id,status:r.status,headcount:r.headcount})),[{id:p.id,status:'FROZEN',headcount:5}])
})
test('P3C-R03: generation must still match the current title name to employee titles after waiting',async()=>{
 const title=await f.repo('JobTitle').save({title:'Synthetic title before rename',isActive:true}),D=await f.department()
 const person=await f.employee({departmentId:D.id,teamId:null,jobTitle:title.title})
 const original=f.service.generationPlan;let entered,release,once=false,pending
 const arrived=new Promise(r=>entered=r),resume=new Promise(r=>release=r)
 f.service.generationPlan=async function(em,...args){const plan=await original.call(this,em,...args);if(em.queryRunner?.isTransactionActive&&!once){once=true;entered(plan);await resume}return plan}
 try{
  pending=f.request('POST','/positions/generate',{},f.viewer)
  const plan=await bounded(Promise.race([arrived,pending.then(()=>{throw Error('Generation finished before plan barrier')})]),'Generation barrier timed out')
  assert.equal(plan.find(g=>g.jobTitleId===title.id).action,'create')
  await f.ok('PATCH',`/catalogs/job-titles/${title.id}`,{title:'Synthetic renamed different title'})
  release();const result=await pending;assert.equal(result.status,201,JSON.stringify(result.body))
  const rows=await f.repo('ApprovedPosition').find({where:{jobTitleId:title.id}}),link=await f.repo('PositionHolder').findOneBy({employeeId:person.id})
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'generation-title-renamed',employeeTitle:person.jobTitle,currentTitle:(await f.repo('JobTitle').findOneByOrFail({id:title.id})).title,positions:rows.map(p=>p.id),link:link?.positionId??null}))
  assert.equal(rows.length,0,'an old name no longer maps to this catalog title')
 }finally{release();f.service.generationPlan=original;if(pending)await pending}
})
test('P3C-R04: same-branch team move rejects linking and should suppress the now-invalid candidates',async()=>{
 const D=await f.department(),other=await f.department(),team=await f.repo('Team').save({code:'P3C_R_TEAM',name:'Synthetic moving team',departmentId:D.id})
 const person=await f.employee({departmentId:D.id,teamId:team.id}),p=await f.position({departmentId:D.id,teamId:team.id})
 await f.ok('PATCH',`/teams/${team.id}`,{departmentId:other.id})
 const detail=await f.ok('GET',`/positions/${p.id}`,null,f.viewer),link=await f.request('POST',`/positions/${p.id}/holders`,{employeeId:person.id},f.viewer)
 console.log('REVIEW_MEASURE '+JSON.stringify({case:'same-branch-team-move',unitHidden:detail.unitHidden,candidates:detail.linkable.map(p=>p.id),linkStatus:link.status}))
 assert.equal(link.status,400);assert.equal(await f.repo('PositionHolder').findOneBy({employeeId:person.id}),null)
 assert.deepEqual(detail.linkable,[],'the UI must not offer a link the current unit rule refuses')
})
test('P3C-R05: holder assignment and approval serialize on position before department without a cycle',async()=>{
 const D=await f.department(),person=await f.employee({departmentId:D.id,teamId:null}),actor=await f.account(person),p=await f.position({departmentId:D.id}),req=await f.ask({},actor)
 const original=f.service.loadScoped;let entered,release,once=false,link,approval
 const arrived=new Promise(r=>entered=r),resume=new Promise(r=>release=r)
 f.service.loadScoped=async function(em,user,id,lock){const row=await original.call(this,em,user,id,lock);if(!once&&lock&&id===p.id){once=true;entered();await resume}return row}
 try{
  link=f.request('POST',`/positions/${p.id}/holders`,{employeeId:person.id},f.viewer)
  await bounded(Promise.race([arrived,link.then(()=>{throw Error('Link finished before position barrier')})]),'Link barrier timed out')
  approval=f.approve(req.id);await waitBlocked();release()
  const responses=await Promise.all([link,approval])
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'link-approval-lock-order',statuses:responses.map(r=>r.status)}))
  assert.deepEqual(responses.map(r=>r.status),[201,201])
  assert.equal((await f.repo('PositionHolder').findOneByOrFail({employeeId:person.id})).positionId,p.id)
  assert.equal((await f.repo('ApprovedPosition').findOneByOrFail({id:p.id})).headcount,5)
 }finally{release();f.service.loadScoped=original;await Promise.allSettled([link,approval].filter(Boolean))}
})
test('P3C-R06: catalog rename before the generation plan leaves old-title employees unlinked',async()=>{
 const title=await f.repo('JobTitle').save({title:'Synthetic rename control before',isActive:true}),D=await f.department()
 const person=await f.employee({departmentId:D.id,teamId:null,jobTitle:title.title})
 await f.ok('PATCH',`/catalogs/job-titles/${title.id}`,{title:'Synthetic rename control after'})
 await f.ok('POST','/positions/generate',{},f.viewer)
 assert.equal(await f.repo('ApprovedPosition').count({where:{jobTitleId:title.id}}),0)
 assert.equal(await f.repo('PositionHolder').findOneBy({employeeId:person.id}),null)
})
