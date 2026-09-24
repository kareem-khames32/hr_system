'use strict'
const {test,before,after} = require('node:test'), assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), {performance} = require('node:perf_hooks')
let f, active = null
const measurements=[]
const resultFile=path.join(__dirname,`codex-review-round2-performance-${process.env.REVIEW_PERF_SUFFIX||'results'}.cjs`)
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
  try {r=await f.request(method,route,body,actor)}finally{record.ms=performance.now()-start;clearInterval(timer);clearInterval(progress);active=null}
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
before(async()=>{f=await require('./codex-review-round2-fixture.cjs')('performance')},{timeout:180000})
after(async()=>{
  fs.writeFileSync(resultFile,'module.exports = '+JSON.stringify(measurements,null,2)+'\n')
  if(f)await f.close()
})
test('CR2 PERF real attendance data copied only INTO disposable database; no source writes',async t=>{
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
  if(process.env.REVIEW_ONLY_88==='true') {
    const actor=await f.repo('User').save({email:'benchmark88@codex.invalid',displayName:'Synthetic scoped read',passwordHash:'test-only',role:'read_only',branchId:10,permissions:JSON.stringify(['attendance.view_all'])})
    const [scope]=await f.ds.query('SELECT (SELECT COUNT(*) FROM employees WHERE branchId=10) employees,(SELECT COUNT(*) FROM attendance_days WHERE branchId=10 AND [date]=\'2026-09-15\') storedRows')
    t.diagnostic(JSON.stringify({original88Conditions:{branchId:10,date:'2026-09-15',role:'read_only',...scope}}))
    await measure('daily original 88 second scenario','/attendance/daily?date=2026-09-15','GET',undefined,actor)
    return
  }
  const [dates]=await f.ds.query('SELECT CONVERT(varchar(10),MAX([date]),23) latest FROM attendance_days')
  for(let round=1;round<=3;round++)await measure(`daily copied latest round ${round}`,`/attendance/daily?date=${dates.latest}`)
  await measure('daily copied maximum stored rows','/attendance/daily?date=2026-08-31')
  await measure('daily copied today','/attendance/daily?date=2026-09-24')
  await measure('employees copied 616','/employees')
  await measure('attendance report copied September','/reports/attendance?month=2026-09')
  await measure('headcount copied 616','/reports/headcount')
  await measure('financial copied September','/reports/financial/payroll-register?period=2026-09')
  await measure('payroll list copied','/payroll/runs')
},{timeout:1800000})
test('CR2 PERF calculate exactly 500 synthetic employees and independently reconcile 3900000',async t=>{
  // Separate branch and fixed attendance remove company-specific payroll inputs while preserving workload.
  const branch=await f.repo('Branch').save({code:'CR2PERF',name:'Synthetic 500 benchmark'})
  const version=await f.policy()
  const staff=[]
  const staffCount=Number(process.env.REVIEW_STAFF_COUNT||500)
  for(let i=0;i<staffCount;i++)staff.push({employeeCode:`CR2PERF${String(i).padStart(4,'0')}`,fullName:`Synthetic ${i}`,branchId:branch.id,
    joinDate:'2020-01-01',status:'active',isActive:true,basicSalary:6000,housingAllowance:1200,transportAllowance:600,
    phoneAllowance:0,workNatureAllowance:0,otherAllowance:0,payMethod:'cash',currency:'SAR'})
  const employees=await f.repo('Employee').save(staff,{chunk:50})
  const rows=[]
  for(const employee of employees) for(let offset=0;offset<30;offset++) {
    const date=new Date(Date.UTC(2026,8,23+offset)).toISOString().slice(0,10)
    rows.push({employeeId:employee.id,branchId:branch.id,date,status:'present',checkIn:'08:00',checkOut:'16:00',shiftName:'Synthetic fixed',shiftStart:'08:00',shiftEnd:'16:00',
      scheduleSource:'override',workMinutes:480,lateMinutes:0,deductibleMinutes:0,earlyLeaveMinutes:0})
  }
  await f.repo('AttendanceDay').save(rows,{chunk:100})
  const draft=await measure('draft 500','/payroll/runs','POST',{name:'Independent 500 payroll',policyVersionId:version,period:'2026-10',filters:{branchIds:[branch.id]}})
  const calculated=await measure('calculate 500',`/payroll/runs/${draft.id}/calculate`,'POST',{})
  const detail=await measure('payroll detail 500',`/payroll/runs/${draft.id}`)
  assert.equal(detail.items.length,staffCount)
  const cents=detail.items.reduce((sum,i)=>sum+Math.round(Number(i.netPay)*100),0)
  assert.equal(cents,staffCount*780000)
  assert.ok(detail.items.every(i=>Number(i.netPay)===7800))
  t.diagnostic(JSON.stringify({employees:500,days:15000,manual:'500*(6000+1200+600)=3900000',actual:cents/100,status:calculated.status||calculated.run?.status}))
  await measure('bank sheet 500',`/payroll/runs/${draft.id}/bank-sheet`)
  await measure('financial include draft 500',`/reports/financial/payroll-register?period=2026-10&includeDraft=true&branchId=${branch.id}`)
  await f.approve(draft.id)
  await measure('disbursement 500',`/payroll/disbursement/runs/${draft.id}`)
},{timeout:3600000})
