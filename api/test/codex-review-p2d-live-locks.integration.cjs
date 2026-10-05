'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
let f,accrual,queue,win
before(async()=>{f=await require('./codex-review-p2d-support.cjs')('p2d_live_locks');accrual=f.app.get(require('../src/payroll/payroll-daily-accrual.service').PayrollDailyAccrualService);queue=f.app.get(require('../src/queue/queue.service').QueueService);win=await accrual.liveWindow()},{timeout:120000})
after(async()=>{if(f)await f.close()})
async function hold(id){const qr=f.ds.createQueryRunner();await qr.connect();await qr.startTransaction();await require('../src/payroll/payroll-settlement-boundary').lockPayrollEmployees(qr.manager,[id]);return qr}
async function release(qr){if(qr.isTransactionActive)await qr.rollbackTransaction();await qr.release()}
const read=id=>f.ds.query('SELECT * FROM payroll_daily_accrual WHERE employeeId=@0 ORDER BY date',[id])
test('P2C C real queue retries finance lock timeout without writes or recursive jobs; succeeds on retry',async t=>{
 const e=await f.employee(6000,f.A,{payMethod:'cash'});await f.attendance(e,win.period);await accrual.refreshLive([e.id])
 await f.ds.query('UPDATE payroll_daily_accrual SET isDirty=1 WHERE employeeId=@0 AND date=@1',[e.id,win.upTo])
 const {requestPayrollAccrualRefresh,PAYROLL_ACCRUAL_REFRESH_JOB}=require('../src/payroll/payroll-daily-accrual')
 await f.ds.transaction(em=>requestPayrollAccrualRefresh(em,e.id,new Date(Date.now()+3600000)))
 await f.ds.query('UPDATE jobs_queue SET runAfter=DATEADD(second,-1,SYSUTCDATETIME()) WHERE jobType=@0',[PAYROLL_ACCRUAL_REFRESH_JOB])
 const before=await read(e.id),qr=await hold(e.id);let first
 try{first=await queue.runOnce();assert.equal(first.retried,1);assert.deepEqual(await read(e.id),before)}finally{await release(qr)}
 const [pending]=await f.ds.query('SELECT * FROM jobs_queue WHERE jobType=@0',[PAYROLL_ACCRUAL_REFRESH_JOB]);assert.equal(pending.status,'PENDING');assert.equal(pending.attempts,1)
 await f.ds.query('UPDATE jobs_queue SET runAfter=DATEADD(second,-1,SYSUTCDATETIME()) WHERE id=@0',[pending.id])
 const second=await queue.runOnce();assert.equal(second.done,1)
 const after=await read(e.id);assert.equal(after.filter(r=>r.isDirty).length,0)
 const jobs=await f.ds.query('SELECT status,attempts FROM jobs_queue WHERE jobType=@0',[PAYROLL_ACCRUAL_REFRESH_JOB]);assert.deepEqual(jobs,[{status:'DONE',attempts:2}])
 t.diagnostic(JSON.stringify({case:'actual-queue-timeout',first,second,dirtyAfter:0,noRecursiveJobs:true}))
},{timeout:120000})
test('P2C C worker first: real approval waits on same lock and completes after worker, without changing net',async t=>{
 const e=await f.employee(6000,f.B,{payMethod:'cash'}),run=await f.draft('P2C lock ordering',[e.id]);await f.calculate(run);await f.ready(run)
 await f.ds.query('UPDATE payroll_daily_accrual SET isDirty=1 WHERE employeeId=@0 AND date=@1',[e.id,'2026-07-01'])
 const original=accrual.accrualClosed;let enter,unblock,settled=false
 const entered=new Promise(r=>enter=r),gate=new Promise(r=>unblock=r)
 accrual.accrualClosed=async function(em,id,...rest){const result=await original.call(this,em,id,...rest);if(id===e.id){enter();await gate}return result}
 let work,approval
 try{
  work=accrual.refreshEmployee(e.id);await entered
  approval=f.request('POST',`/payroll/runs/${run.id}/approve`,{},f.approver).then(r=>{settled=true;return r})
  await new Promise(r=>setTimeout(r,500));assert.equal(settled,false,'approval must wait for the worker financial lock')
  unblock();assert.equal((await work).computed,1);const reply=await approval;assert.equal(reply.status,201,JSON.stringify(reply.body));assert.equal(Number(reply.body.totalNet),6000)
  const before=await read(e.id);assert.deepEqual(await accrual.refreshEmployee(e.id),{computed:0,reused:0});assert.deepEqual(await read(e.id),before)
  t.diagnostic(JSON.stringify({case:'worker-first-real-approval',approvalStatus:reply.status,totalNet:reply.body.totalNet,closedRowsUnchanged:true}))
 }finally{unblock();accrual.accrualClosed=original;if(work)await work.catch(()=>{});if(approval)await approval.catch(()=>{})}
},{timeout:120000})
test('P2C C busy refresh must report unresolved work instead of remaining zero',async t=>{
 const b=await f.repo('Branch').save({name:'فرع مشغول',code:'P2C-BUSY'}),e=await f.employee(9000,b,{payMethod:'cash'});await f.attendance(e,win.period)
 const user=await f.actor('busy-reader',['payroll.view','payroll.calculate'],b),qr=await hold(e.id);let response
 try{response=await f.ok('POST','/payroll/live/refresh',{},user);assert.equal(response.computed,0);assert.equal(response.preview.counts.pending,1);assert.equal((await read(e.id)).length,0)}finally{await release(qr)}
 const retry=await f.ok('POST','/payroll/live/refresh',{},user);assert.equal(retry.preview.counts.pending,0);assert.ok(retry.computed>0)
 t.diagnostic(JSON.stringify({case:'busy-refresh-progress',computed:response.computed,remaining:response.remaining,pending:response.preview.counts.pending,retryComputed:retry.computed,retryComplete:true}))
 assert.equal(response.remaining,1,'Unresolved busy employee must remain pending in the refresh progress response')
},{timeout:120000})
