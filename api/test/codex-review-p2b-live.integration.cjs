'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
let f,accrual,win,n=0
before(async()=>{f=await require('./codex-review-p2b-support.cjs')('p2b_live');accrual=f.app.get(require('../src/payroll/payroll-daily-accrual.service').PayrollDailyAccrualService);win=await accrual.liveWindow()},{timeout:120000})
after(async()=>{if(f)await f.close()})
const actor=(permissions,branch)=>f.actor('live-'+(++n),permissions,branch)
const row=(view,id)=>view.rows.find(r=>r.employeeId===id)
test('P2B C calculation-only refresh must not return payroll amounts hidden by GET',async t=>{
 const employee=await f.employee(9000,f.A,{payMethod:'cash'});await f.attendance(employee,win.period)
 const user=await actor(['payroll.calculate'],f.A)
 assert.equal((await f.request('GET','/payroll/live',null,user)).status,403)
 const refreshed=await f.request('POST','/payroll/live/refresh',{},user)
 const exposed=row(refreshed.body.preview??{rows:[]},employee.id)
 t.diagnostic(JSON.stringify({case:'live-refresh-permission',getStatus:403,postStatus:refreshed.status,employeeId:exposed?.employeeId,earned:exposed?.earned,estimatedNet:exposed?.estimatedNet}))
 assert.ok(refreshed.status===403 || !exposed || (exposed.earned==null&&exposed.estimatedNet==null),'Operation permission must not bypass the payroll view permission')
})
test('P2B C the latest day alone must not mark a partially accumulated period complete',async t=>{
 const branch=await f.repo('Branch').save({code:'HOLE',name:'Partial period'}),employee=await f.employee(9000,branch,{payMethod:'cash'})
 await f.attendance(employee,win.period)
 const user=await actor(['payroll.calculate','payroll.view'],branch)
 const one=await f.ds.transaction(em=>accrual.accrueEmployeeRange(em,{employeeId:employee.id,period:win.period,runId:null,from:win.upTo,to:win.upTo,today:win.today}))
 assert.equal(one.computed,1)
 const before=row(await f.ok('GET','/payroll/live',null,user),employee.id)
 const refreshed=await f.ok('POST','/payroll/live/refresh',{},user)
 // Control: the real range engine can fill the missing earlier days without changing inputs.
 const full=await accrual.refreshLive([employee.id])
 const after=row(await f.ok('GET','/payroll/live',null,user),employee.id)
 const expectedDays=Math.floor((Date.parse(win.upTo)-Date.parse(win.startDate))/86400000)+1
 assert.equal(after.days,expectedDays);assert.equal(after.earned,expectedDays*300)
 t.diagnostic(JSON.stringify({case:'missing-earlier-days',window:win,before:{days:before.days,complete:before.complete,earned:before.earned},refresh:{computed:refreshed.computed,remaining:refreshed.remaining},control:{computed:full.computed,days:after.days,earned:after.earned}}))
 assert.equal(before.complete,false,'Earlier gaps are missing even when the last day exists')
 assert.equal(refreshed.preview.rows[0].days,expectedDays)
})
test('P2B C a refresh chosen before real payroll approval must not rewrite its accrual afterward',async t=>{
 const employee=await f.employee(6000,f.B,{payMethod:'cash'}),run=await f.draft('P2B refresh approval race',[employee.id],'2026-07')
 await f.calculate(run);await f.ready(run)
 const days=await f.ds.query('SELECT CONVERT(varchar(10),date,23) AS d FROM payroll_daily_accrual WHERE employeeId=@0 AND period=@1 ORDER BY date',[employee.id,'2026-07'])
 assert.ok(days.length>0)
 await f.ds.query('UPDATE payroll_daily_accrual SET isDirty=1,dirtyReason=N\'P2B selected before approval\' WHERE employeeId=@0 AND period=@1 AND date=@2',[employee.id,'2026-07',days[0].d])
 const original=accrual.accrueEmployeeRange;let enteredResolve,releaseResolve
 const entered=new Promise(r=>enteredResolve=r),release=new Promise(r=>releaseResolve=r)
 accrual.accrueEmployeeRange=async function(em,input){if(input.employeeId===employee.id){enteredResolve();await release}return original.call(this,em,input)}
 let refresh,before,after,approved
 try{
  refresh=accrual.refreshEmployee(employee.id)
  await Promise.race([entered,new Promise((_,reject)=>setTimeout(()=>reject(Error('refresh barrier not entered')),15000))])
  approved=await f.ok('POST',`/payroll/runs/${run.id}/approve`,{},f.approver)
  // A later-period salary in the current employee file (fixture write, not a past payroll edit).
  // The frozen July accrual must remain at 6000/30 even when today's file is now 9000.
  await f.repo('Employee').update({id:employee.id},{basicSalary:9000})
  before=await f.ds.query('SELECT * FROM payroll_daily_accrual WHERE employeeId=@0 AND period=@1 ORDER BY date',[employee.id,'2026-07'])
  releaseResolve();const result=await refresh
  after=await f.ds.query('SELECT * FROM payroll_daily_accrual WHERE employeeId=@0 AND period=@1 ORDER BY date',[employee.id,'2026-07'])
  const saved=await f.repo('PayrollRun').findOneByOrFail({id:run.id})
  assert.equal(saved.status,'APPROVED');assert.equal(Number(saved.totalNet),Number(approved.totalNet))
  t.diagnostic(JSON.stringify({case:'refresh-after-approval',status:saved.status,computed:result.computed,beforeDirty:before[0].isDirty,afterDirty:after[0].isDirty,beforeEarnings:before[0].earningsAmount,afterEarnings:after[0].earningsAmount,changedRows:before.filter((r,i)=>JSON.stringify(r)!==JSON.stringify(after[i])).length,totalNet:saved.totalNet,laterSalaryFixture:true}))
 }finally{releaseResolve();accrual.accrueEmployeeRange=original;if(refresh)await refresh.catch(()=>{})}
 assert.deepEqual(after,before,'Closed accrual rows must remain exactly unchanged after approval')
})
