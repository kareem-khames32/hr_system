'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
const {requiredEmployeeFields}=require('./helpers/employee-fixture.cjs')
let f
before(async()=>{f=await require('./codex-review-p3b-positions-fixture.cjs')('p3b_unit_writes');await f.ok('PUT','/modules/features/positions.enforce_on_hiring',{enabled:true});f.modules.invalidate()})
after(async()=>{if(f)await f.close()})
test('P3B-W01: linking must not seat an employee on a position whose department is already foreign',async()=>{
 const D=await f.department(),emp=await f.employee({departmentId:D.id,teamId:null}),p=await f.position({departmentId:D.id})
 await f.ok('PATCH',`/departments/${D.id}`,{branchId:f.B.id})
 const before=await f.ok('GET',`/positions/${p.id}`,null,f.viewer)
 assert.equal(before.unitHidden,true);assert.equal(before.departmentId,null)
 const result=await f.request('POST',`/positions/${p.id}/holders`,{employeeId:emp.id},f.viewer)
 const link=await f.repo('PositionHolder').findOneBy({employeeId:emp.id})
 console.log('REVIEW_MEASURE '+JSON.stringify({case:'link-foreign-department',hidden:before.unitHidden,status:result.status,positionBranch:p.branchId,departmentCurrentBranch:f.B.id,link:link?.positionId??null}))
 assert.equal(result.status,400,'a hidden foreign unit must not accept a new assignment through the direct route')
 assert.equal(link,null)
})
test('P3B-W02: hiring must recheck department ownership after waiting on the seat',async()=>{
 const D=await f.department(),p=await f.position({departmentId:D.id,headcount:1})
 const payload={...requiredEmployeeFields({jobTitle:f.title.title}),fullName:'موظف تجربة التعيين',joinDate:'2026-10-01',branchId:f.A.id,departmentId:D.id,basicSalary:5000,positionId:p.id}
 const held=f.ds.createQueryRunner();await held.connect();await held.startTransaction();let pending
 try{
  await held.query('SELECT id FROM positions WITH (UPDLOCK, ROWLOCK) WHERE id=@0',[p.id])
  pending=f.request('POST','/employees',payload,f.viewer)
  let blocked=false
  for(let i=0;i<120;i++){
   const rows=await f.ds.query('SELECT COUNT(*) AS n FROM sys.dm_exec_requests WHERE database_id=DB_ID() AND blocking_session_id<>0')
   if(Number(rows[0].n)>0){blocked=true;break}await new Promise(r=>setTimeout(r,25))
  }
  assert.ok(blocked,'the real hiring request reached the locked position')
  await f.ok('PATCH',`/departments/${D.id}`,{branchId:f.B.id})
  await held.commitTransaction();const result=await pending
  const people=await f.repo('Employee').find({where:{nationalId:payload.nationalId}})
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'hire-moved-department',status:result.status,message:result.body?.message,employees:people.map(e=>({id:e.id,branchId:e.branchId,departmentId:e.departmentId})),departmentCurrentBranch:f.B.id}))
  assert.equal(result.status,400,'hiring must reject a unit moved out of the branch while waiting')
  assert.equal(people.length,0)
 }finally{if(held.isTransactionActive)await held.rollbackTransaction();await held.release();if(pending)await pending}
})
test('P3B-W03: ordinary in-branch hiring and holder assignment still work',async()=>{
 const D=await f.department(),p=await f.position({departmentId:D.id,headcount:2}),emp=await f.employee({departmentId:D.id,teamId:null})
 await f.ok('POST',`/positions/${p.id}/holders`,{employeeId:emp.id},f.viewer)
 const payload={...requiredEmployeeFields({jobTitle:f.title.title}),joinDate:'2026-10-01',branchId:f.A.id,departmentId:D.id,basicSalary:5000,positionId:p.id}
 const hired=await f.ok('POST','/employees',payload,f.viewer)
 assert.equal((await f.repo('PositionHolder').findOneByOrFail({employeeId:hired.id})).positionId,p.id)
 assert.equal((await f.ok('GET',`/positions/${p.id}`,null,f.viewer)).occupied,2)
})
