'use strict'
const {test,before,after} = require('node:test'), assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), {performance} = require('node:perf_hooks')
let f, active = null
const measurements=[]
const resultFile=path.join(__dirname,`codex-review-round4-performance-${process.env.REVIEW_PERF_SUFFIX||'results'}.cjs`)
const {SqlServerQueryRunner} = require('../node_modules/typeorm/driver/sqlserver/SqlServerQueryRunner')
const query = SqlServerQueryRunner.prototype.query
SqlServerQueryRunner.prototype.query = async function(sql,...args) {
  const mark = active && this.connection.options.database === f?.database ? active : null
  const start=performance.now()
  try { return await query.call(this,sql,...args) }
  catch(e){if(mark){mark.sqlError={name:e.name,code:e.driverError?.code,number:e.driverError?.number,parameterCount:Array.isArray(args[0])?args[0].length:0,sqlLength:sql.length};console.log('REVIEW_SQL_ERROR '+JSON.stringify(mark.sqlError))}throw e}
  finally { if(mark) {
    mark.queries++
    const operation=/^\s*(SELECT|INSERT|UPDATE|DELETE|EXEC)/i.exec(sql)?.[1]?.toUpperCase()||'OTHER'
    const table=/(?:FROM|INTO|UPDATE|JOIN)\s+(?:(?:\[?dbo\]?\.)?)["\[]?([A-Za-z_]+)/i.exec(sql)?.[1]||'other'
    const key=operation+' '+table, entry=mark.groups[key]||(mark.groups[key]={count:0,ms:0})
    entry.count++; entry.ms+=performance.now()-start
    if(operation!=='SELECT'&&operation!=='OTHER')mark.writes++
  } }
}
for(const method of ['startTransaction','commitTransaction','rollbackTransaction']) {
  const original=SqlServerQueryRunner.prototype[method]
  SqlServerQueryRunner.prototype[method]=async function(...args) {
    try {return await original.apply(this,args)}finally{
      if(active&&this.connection.options.database===f?.database) {
        if(method==='startTransaction'&&!this.__reviewTx){this.__reviewTx=performance.now();active.transactions++}
        if(method!=='startTransaction'&&this.__reviewTx){active.maxTransactionMs=Math.max(active.maxTransactionMs,performance.now()-this.__reviewTx);this.__reviewTx=null}
      }
    }
  }
}
async function measure(label,route,method='GET',body,actor) {
  const record={label,route,queries:0,writes:0,groups:{},transactions:0,maxTransactionMs:0,rssStartMiB:process.memoryUsage().rss/1048576,peakRssMiB:0}
  active=record
  const timer=setInterval(()=>{record.peakRssMiB=Math.max(record.peakRssMiB,process.memoryUsage().rss/1048576)},25)
  const progress=setInterval(()=>console.log('REVIEW_PROGRESS '+JSON.stringify({label,elapsedSeconds:Math.round((performance.now()-start)/1000),queries:record.queries})),30000)
  const start=performance.now()
  let r
  try {r=typeof route==='function'?{status:200,body:await route()}:await f.request(method,route,body,actor)}finally{record.ms=performance.now()-start;clearInterval(timer);clearInterval(progress);active=null}
  if(typeof route==='function')record.route='fixture.approve including prerequisite acknowledgements'
  record.status=r.status
  record.responseBytes=Buffer.byteLength(JSON.stringify(r.body))
  record.rows=Array.isArray(r.body)?r.body.length:Array.isArray(r.body?.rows)?r.body.rows.length:Array.isArray(r.body?.items)?r.body.items.length:null
  record.topSql=Object.entries(record.groups).map(([group,v])=>({group,...v})).sort((a,b)=>b.ms-a.ms).slice(0,8)
  record.sqlSumMs=Object.values(record.groups).reduce((s,v)=>s+v.ms,0)
  delete record.groups
  measurements.push(record)
  fs.writeFileSync(resultFile,'module.exports = '+JSON.stringify(measurements,null,2)+'\n')
  console.log('REVIEW_MEASURE '+JSON.stringify(record))
  assert.ok(r.status>=200&&r.status<300,`Benchmark status ${r.status}, error code ${r.body?.code||'none'}`)
  return r.body
}
before(async()=>{f=await require('./codex-review-round4-fixture.cjs')('r4performance')},{timeout:180000})
after(async()=>{
  fs.writeFileSync(resultFile,'module.exports = '+JSON.stringify(measurements,null,2)+'\n')
  if(f)await f.close()
})
test('CR4 PERF real attendance data copied only INTO disposable database; no source writes',async t=>{
  const tables=['branches','departments','teams','cost_centers','grades','job_titles','employees','employee_salary_history','employee_salary_history_versions',
    'employee_status_history','employee_suspensions','shifts','work_schedules','weekly_schedule_entries','schedule_day_overrides','schedule_exception_rules',
    'attendance_rule_versions','attendance_exemptions','attendance_days','attendance_punches','attendance_corrections','public_holidays','leave_types','leaves',
    'permission_types','requests','request_types','overtime_periods','overtime_entries','holiday_work_orders','offboarding_cases','payroll_runs','payroll_items','payroll_run_members',
    'payroll_period_claims','payroll_daily_accrual','payroll_financial_exemptions','payroll_item_disbursements','lateness_tiers']
  f.assertDisposable()
  const qr=f.ds.createQueryRunner();await qr.connect();await qr.startTransaction()
  try{
    for(const table of tables){assert.match(table,/^[a-z_]+$/);await qr.query(`ALTER TABLE [dbo].[${table}] NOCHECK CONSTRAINT ALL`)}
    for(const table of tables){
      const cols=await qr.query(`SELECT d.name,d.is_identity FROM sys.columns d JOIN sys.tables dt ON d.object_id=dt.object_id
        JOIN [hr_system].sys.tables st ON st.name=dt.name JOIN [hr_system].sys.columns s ON s.object_id=st.object_id AND s.name=d.name
        WHERE dt.name=@0 AND d.is_computed=0 AND d.system_type_id<>189 ORDER BY d.column_id`,[table])
      assert.ok(cols.length)
      const names=cols.map(c=>'['+c.name+']').join(','),identity=cols.some(c=>c.is_identity)
      await qr.query(`DELETE FROM [dbo].[${table}]`)
      await qr.query(`${identity?`SET IDENTITY_INSERT [dbo].[${table}] ON;`:''} INSERT INTO [dbo].[${table}] (${names}) SELECT ${names} FROM [hr_system].[dbo].[${table}]; ${identity?`SET IDENTITY_INSERT [dbo].[${table}] OFF;`:''}`)
    }
    // Settings used by these calculations only; never copy domain/mail/login configuration.
    await qr.query("DELETE FROM dbo.requests_config WHERE [key] LIKE 'attendance.%' OR [key] LIKE 'payroll.%' OR [key] LIKE 'overtime.%'")
    await qr.query("INSERT INTO dbo.requests_config ([key],[value]) SELECT [key],[value] FROM [hr_system].dbo.requests_config WHERE [key] LIKE 'attendance.%' OR [key] LIKE 'payroll.%' OR [key] LIKE 'overtime.%'")
    await qr.commitTransaction()
  }catch(e){await qr.rollbackTransaction();throw e}finally{await qr.release()}
  const [counts]=await f.ds.query('SELECT (SELECT COUNT(*) FROM employees) employees,(SELECT COUNT(*) FROM attendance_days) days,(SELECT COUNT(*) FROM attendance_punches) punches')
  t.diagnostic(JSON.stringify({copied:counts,sourceWrites:0,copiedTables:tables.length,compatibility:150}))
  assert.equal(counts.employees,616)
  if(process.env.REVIEW_REAL_PAYROLL20==='true'){
    await require('./codex-review-round4-real20.cjs')({f,measure,t});return
  }
  if(process.env.REVIEW_ONLY_88==='true') {
    const actor=await f.repo('User').save({email:'benchmark88@codex.invalid',displayName:'Synthetic scoped read',passwordHash:'test-only',role:'read_only',branchId:10,permissions:JSON.stringify(['attendance.view_all'])})
    const [scope]=await f.ds.query('SELECT (SELECT COUNT(*) FROM employees WHERE branchId=10) employees,(SELECT COUNT(*) FROM attendance_days WHERE branchId=10 AND [date]=\'2026-09-15\') storedRows')
    t.diagnostic(JSON.stringify({original88Conditions:{branchId:10,date:'2026-09-15',role:'read_only',...scope}}))
    await measure('daily original 88 second scenario','/attendance/daily?date=2026-09-15','GET',undefined,actor)
    return
  }
  const [dates]=await f.ds.query('SELECT CONVERT(varchar(10),MAX([date]),23) latest FROM attendance_days')
  for(let round=1;round<=3;round++)await measure(`daily copied latest round ${round}`,`/attendance/daily?date=${dates.latest}`)
  const {AttendanceService}=require('../src/attendance/attendance.service')
  const withoutClock=value=>Array.isArray(value)?value.map(withoutClock):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([key])=>key!=='computedAt').map(([key,v])=>[key,withoutClock(v)])):value
  const on=await measure('daily copied maximum stored rows','/attendance/daily?date=2026-08-31')
  const withBatch=AttendanceService.prototype.withBatch
  let off
  try{AttendanceService.prototype.withBatch=function(){return this};off=await measure('daily 500 cache OFF packet unchanged','/attendance/daily?date=2026-08-31')}
  finally{AttendanceService.prototype.withBatch=withBatch}
  assert.deepEqual(withoutClock(on),withoutClock(off))
  const actor=await f.repo('User').save({email:'r3scoped@codex.invalid',displayName:'Synthetic scoped read',passwordHash:'test-only',role:'read_only',branchId:10,permissions:JSON.stringify(['attendance.view_all'])})
  const scopeOn=await measure('daily original 88 second scenario','/attendance/daily?date=2026-09-15','GET',undefined,actor)
  try{AttendanceService.prototype.withBatch=function(){return this};off=await measure('daily branch10 cache OFF packet unchanged','/attendance/daily?date=2026-09-15','GET',undefined,actor)}
  finally{AttendanceService.prototype.withBatch=withBatch}
  assert.deepEqual(withoutClock(scopeOn),withoutClock(off))
  t.diagnostic(JSON.stringify({dailyResponsesEqual:true,excludedFields:['computedAt'],rows:[on.length,scopeOn.length],samePacketSize:true}))
  await measure('daily copied today','/attendance/daily?date=2026-09-26')
  await measure('employees copied 616','/employees')
  await measure('attendance report copied September','/reports/attendance?month=2026-09')
  await measure('headcount copied 616','/reports/headcount')
  await measure('financial copied September','/reports/financial/payroll-register?period=2026-09')
  await measure('payroll list copied','/payroll/runs')
},{timeout:1800000})
test('CR4 PERF calculate exactly 500 synthetic employees and independently reconcile 3900000',async t=>{
  // Separate branch and fixed attendance remove company-specific payroll inputs while preserving workload.
  const branch=await f.repo('Branch').save({code:'CR2PERF',name:'Synthetic 500 benchmark'})
  const version=await f.policy()
  const staff=[]
  const staffCount=Number(process.env.REVIEW_STAFF_COUNT||500)
  const past=process.env.REVIEW_PAST_500==='true',benchmarkPeriod=past?'2026-07':'2026-10'
  for(let i=0;i<staffCount;i++)staff.push({employeeCode:`CR2PERF${String(i).padStart(4,'0')}`,fullName:`Synthetic ${i}`,branchId:branch.id,
    joinDate:'2020-01-01',status:'active',isActive:true,basicSalary:6000,housingAllowance:1200,transportAllowance:600,
    phoneAllowance:0,workNatureAllowance:0,otherAllowance:0,payMethod:'cash',currency:'SAR'})
  const employees=await f.repo('Employee').save(staff,{chunk:50})
  const rows=[]
  for(const employee of employees) for(let offset=0;offset<30;offset++) {
    const date=new Date(Date.UTC(2026,past?5:8,23+offset)).toISOString().slice(0,10)
    rows.push({employeeId:employee.id,branchId:branch.id,date,status:'present',checkIn:'08:00',checkOut:'16:00',shiftName:'Synthetic fixed',shiftStart:'08:00',shiftEnd:'16:00',
      scheduleSource:'override',workMinutes:480,lateMinutes:0,deductibleMinutes:0,earlyLeaveMinutes:0})
  }
  await f.repo('AttendanceDay').save(rows,{chunk:100})
  const draft=await measure('draft 500','/payroll/runs','POST',{name:'Independent 500 payroll',policyVersionId:version,period:benchmarkPeriod,filters:{branchIds:[branch.id]}})
  const calculated=await measure('calculate 500',`/payroll/runs/${draft.id}/calculate`,'POST',{})
  const detail=await measure('payroll detail 500',`/payroll/runs/${draft.id}`)
  assert.equal(detail.items.length,staffCount)
  const cents=detail.items.reduce((sum,i)=>sum+Math.round(Number(i.netPay)*100),0)
  assert.equal(cents,staffCount*780000)
  assert.ok(detail.items.every(i=>Number(i.netPay)===7800))
  const [accrualCount]=await f.ds.query('SELECT COUNT(*) computedDays FROM payroll_daily_accrual WHERE period=@0',[benchmarkPeriod])
  assert.equal(accrualCount.computedDays,past?staffCount*30:staffCount*Math.min(30,Math.max(0,Math.floor((Date.now()-new Date('2026-09-23T00:00:00').getTime())/86400000)+1)))
  t.diagnostic(JSON.stringify({benchmarkPeriod,preloadedDays:rows.length,actuallyAccruedDays:accrualCount.computedDays,pastMonth:past}))
  t.diagnostic(JSON.stringify({employees:500,days:15000,manual:'500*(6000+1200+600)=3900000',actual:cents/100,status:calculated.status||calculated.run?.status}))
  await measure('bank sheet 500',`/payroll/runs/${draft.id}/bank-sheet`)
  await measure('financial include draft 500',`/reports/financial/payroll-register?period=${benchmarkPeriod}&includeDraft=true&branchId=${branch.id}`)
  const eventSizes=await f.ds.query('SELECT eventType,DATALENGTH(payload) sqlUtf16Bytes FROM payroll_run_events WHERE runId=@0',[draft.id])
  t.diagnostic(JSON.stringify({eventSizes}))
  await measure('approve 500 including acknowledgements',()=>f.approve(draft.id))
  await measure('disbursement 500',`/payroll/disbursement/runs/${draft.id}`)
  await measure('pay 500',`/payroll/runs/${draft.id}/pay`,'POST',{channel:'CASH',reference:'Independent third review payout'})
  const paid=await f.repo('PayrollRun').findOneByOrFail({id:draft.id})
  assert.equal(paid.status,'PAID');assert.equal(Number(paid.totalNet),staffCount*7800)
  const frozen=await f.repo('PayrollItem').findBy({runId:draft.id})
  assert.equal(frozen.length,staffCount)
  assert.ok(frozen.every(i=>i.paidPayMethod==='cash'&&Number(i.paidBankAmount)===0&&Number(i.paidCashAmount)===7800))
  const sheet=await measure('paid bank sheet 500',`/payroll/runs/${draft.id}/bank-sheet`)
  assert.equal(sheet.totals.bank,0);assert.equal(sheet.totals.cash,staffCount*7800);assert.equal(sheet.totals.net,staffCount*7800)
  const register=await measure('paid financial 500',`/reports/financial/payroll-register?period=${benchmarkPeriod}&branchId=${branch.id}`)
  const registered=register.rows.filter(r=>r.runId===draft.id)
  assert.equal(registered.length,staffCount);assert.equal(registered.reduce((s,r)=>s+Number(r.bank)+Number(r.cash),0),staffCount*7800)
  const screen=await measure('paid disbursement 500',`/payroll/disbursement/runs/${draft.id}`)
  assert.equal(screen.rows.length,staffCount);assert.ok(screen.rows.every(r=>r.state==='PAID'))
  const repeated=await f.request('POST',`/payroll/runs/${draft.id}/pay`,{channel:'CASH',reference:'Intentional duplicate'})
  assert.equal(repeated.status,400)
  const recalculated=await f.request('POST',`/payroll/runs/${draft.id}/calculate`,{})
  assert.ok(recalculated.status>=400&&recalculated.status<500)
  t.diagnostic(JSON.stringify({complete500Cycle:true,employees:staffCount,manualTotal:staffCount*7800,paidTotal:Number(paid.totalNet),frozenCashItems:frozen.length,duplicatePayStatus:repeated.status,recalculatePaidStatus:recalculated.status,eventSizes}))
},{timeout:3600000})

test('CR4 PERF assign November for 500 employees with independent service-window coverage',async t=>{
  const branch=await f.repo('Branch').save({code:'CR4SHIFT',name:'Synthetic shift performance'})
  const staff=[]
  for(let i=0;i<500;i++)staff.push({employeeCode:'CR4SHIFT'+i,fullName:'Synthetic shift '+i,branchId:branch.id,joinDate:'2020-01-01',status:'active',isActive:true})
  const employees=await f.repo('Employee').save(staff,{chunk:50}), ids=employees.map(e=>e.id)
  const shift=await f.ok('POST','/catalogs/shifts',{name:'Review future shift',startTime:'08:00',endTime:'16:00',shiftMode:'fixed',graceMinutes:0,flexEnabled:false,requiredWorkMinutes:480,effectiveFrom:'2026-01-01',changeReason:'Independent review'})
  const body={employeeIds:ids,from:'2026-11-01',to:'2026-11-30',shiftId:shift.id}
  const full=await measure('assign month 500 full service','/attendance/schedule/range','POST',body)
  assert.equal(full.applied,500);assert.deepEqual(full.failed,[]);assert.deepEqual(full.skipped,[])
  const {In}=require('../node_modules/typeorm')
  await f.repo('ScheduleEntry').delete({employeeId:In(ids)})
  await f.repo('ScheduleDayOverride').delete({employeeId:In(ids)})
  await f.repo('Employee').update({id:In(ids.slice(400,450))},{actualStartDate:'2026-11-16'})
  await f.repo('Employee').update({id:In(ids.slice(475))},{status:'terminated',isActive:false})
  await f.repo('OffboardingCase').save(ids.slice(450,475).map(employeeId=>({employeeId,lastWorkingDay:'2026-11-10',status:'IN_CLEARANCE',openedBy:f.admin.id})),{chunk:25})
  const mixed=await measure('assign month 500 mixed service','/attendance/schedule/range','POST',body)
  assert.equal(mixed.applied,475);assert.equal(mixed.partial,75);assert.equal(mixed.skipped.length,25);assert.deepEqual(mixed.failed,[])
  const rows=await f.ds.query('SELECT employeeId,CONVERT(varchar(10),weekStart,23) start FROM weekly_schedule_entries WHERE employeeId IN ('+ids.map((_,n)=>'@'+n).join(',')+')',ids)
  const days=await f.ds.query('SELECT employeeId,CONVERT(varchar(10),date,23) date FROM schedule_day_overrides WHERE employeeId IN ('+ids.map((_,n)=>'@'+n).join(',')+')',ids)
  const sets=new Map(ids.map(id=>[id,new Set()]))
  for(const row of rows)for(let n=0;n<7;n++)sets.get(row.employeeId).add(new Date(Date.parse(row.start+'T12:00:00Z')+n*86400000).toISOString().slice(0,10))
  for(const row of days)sets.get(row.employeeId).add(row.date)
  let count=0
  for(let i=0;i<500;i++){
    const expected=[]
    for(let d=1;d<=30;d++)if(i<400||(i<450&&d>=16)||(i>=450&&i<475&&d<=10))expected.push('2026-11-'+String(d).padStart(2,'0'))
    assert.deepEqual([...sets.get(ids[i])].sort(),expected,'Employee index '+i)
    count+=expected.length
  }
  assert.equal(count,13000)
  t.diagnostic(JSON.stringify({serviceWindowAssignment:true,employees:500,manual:'400*30+50*15+25*10+25*0=13000',coveredDays:count,weeklyRows:rows.length,dayRows:days.length,partial:mixed.partial,skipped:mixed.skipped.length}))
},{timeout:1800000})
