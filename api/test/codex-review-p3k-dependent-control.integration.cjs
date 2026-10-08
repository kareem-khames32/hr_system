'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict'),setup=require('./codex-review-p3k-helpers.cjs')
test('P3K-D01: dependent write waits for employee, then applies current branch and serializes duplicate identity',{timeout:120000},async()=>{
 const f=await setup('dependent_control');let runner,pending
 try{
  await f.enable('dependents')
  const employee=await f.emp(),hr=await f.account(['dependents.manage'])
  const body={employeeId:employee.id,nameAr:'معال تجريبي',relation:'SON',nationalId:'7700770077'}
  runner=f.ds.createQueryRunner();await runner.connect();await runner.startTransaction()
  const [session]=await runner.query('SELECT @@SPID AS id')
  await runner.query('SELECT [id] FROM [employees] WITH (UPDLOCK, ROWLOCK) WHERE [id]=@0',[employee.id])
  pending=f.request('POST','/dependents',body,hr)
  let waited=false
  const deadline=Date.now()+6000
  while(Date.now()<deadline){
   const [row]=await f.ds.query("SELECT COUNT(*) n FROM sys.dm_exec_requests WHERE blocking_session_id=@0 AND wait_type LIKE 'LCK%'",[session.id])
   if(Number(row.n)>0){waited=true;break}
   await new Promise(r=>setTimeout(r,25))
  }
  assert.equal(waited,true,'Dependent write must wait for the held employee row')
  await runner.query('UPDATE [employees] SET [branchId]=@0 WHERE [id]=@1',[f.b.id,employee.id]);await runner.commitTransaction()
  const rejected=await pending;pending=null
  assert.equal(rejected.status,404);assert.equal(await f.repo('Dependent').count({where:{employeeId:employee.id}}),0)
  await f.repo('Employee').update({id:employee.id},{branchId:f.a.id})
  const race=await Promise.all([f.request('POST','/dependents',body,hr),f.request('POST','/dependents',body,hr)])
  assert.deepEqual(race.map(x=>x.status).sort(),[201,409]);assert.equal(await f.repo('Dependent').count({where:{employeeId:employee.id}}),1)
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'D01',waited,movedEmployeeWrite:rejected.status,concurrentDuplicate:race.map(x=>x.status).sort(),rows:1}))
 }finally{
  if(runner){if(runner.isTransactionActive)await runner.rollbackTransaction();await runner.release()}
  if(pending)await pending.catch(()=>{})
  await f.close()
 }
})
