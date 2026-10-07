'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict')
const fixture=require('./codex-review-p3b-positions-fixture.cjs')
for(const rcsi of [false])test(`P3B-S${rcsi?2:1}: competing holders on the final seat (RCSI=${rcsi})`,async()=>{
 const f=await fixture(rcsi?'p3b_seat_snapshot':'p3b_seat_locking',{rcsi})
 let held,pending
 try{
  await f.ok('PUT','/modules/features/positions.enforce_on_hiring',{enabled:true});f.modules.invalidate()
  const p=await f.position({headcount:1}),e1=await f.employee(),e2=await f.employee()
  held=f.ds.createQueryRunner();await held.connect();await held.startTransaction()
  await held.query('SELECT id FROM positions WITH (UPDLOCK, ROWLOCK) WHERE id=@0',[p.id])
  pending=Promise.all([e1,e2].map(e=>f.request('POST',`/positions/${p.id}/holders`,{employeeId:e.id},f.viewer)))
  let n=0;for(let i=0;i<100;i++){n=Number((await f.ds.query('SELECT COUNT(*) AS n FROM sys.dm_exec_requests WHERE database_id=DB_ID() AND blocking_session_id<>0'))[0].n);if(n>=2)break;await new Promise(r=>setTimeout(r,25))}
  assert.equal(n,2,'both attempts actually blocked on the same SQL row')
  await held.commitTransaction()
  const result=await pending;assert.deepEqual(result.map(r=>r.status).sort(),[201,409])
  const view=await f.ok('GET',`/positions/${p.id}`,null,f.viewer);assert.deepEqual([view.occupied,view.vacant,view.over],[1,0,0])
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'last-seat',rcsi,statuses:result.map(r=>r.status),occupied:view.occupied}))
 }finally{if(held){if(held.isTransactionActive)await held.rollbackTransaction();await held.release()}if(pending)await pending;await f.close()}
})
