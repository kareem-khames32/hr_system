'use strict'
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
let f, branch, seq = 0
const note = value => console.log('CR7_EVIDENCE ' + JSON.stringify(value))
const money = v => Number(v)
const breakdown = item => typeof item.breakdown === 'string' ? JSON.parse(item.breakdown) : item.breakdown
const employee = extra => f.repo('Employee').save({ employeeCode: `R7M${++seq}`, fullName: `CR7 Money ${seq}`, branchId: branch.id,
  joinDate: '2024-01-01', status: 'active', isActive: true, basicSalary: 6000, housingAllowance: 0, transportAllowance: 0,
  phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0, workPressureAllowance: 1000, currency: 'EGP', payMethod: 'cash',
  annualLeaveEntitled: false, ...extra })
const calc = (emps, extra = {}) => f.ok('POST', '/payroll/runs/calculate-defined', { period: '2026-10', scopeType: 'CUSTOM',
  employeeIds: emps.map(e => e.id), name: `CR7 money ${++seq}`, ...extra })
before(async () => {
  f = await require('./codex-review-round7-fixture.cjs')('r7money')
  for (const [key,value] of Object.entries({ 'payroll.cycle_start_day': '1', 'payroll.monthly_days':'30', 'payroll.daily_hours':'8',
    'payroll.salary_evidence_mode':'MONTHLY_HISTORY_OR_CURRENT_FILE', 'payroll.policy.min_net_guarantee':'null',
    'payroll.policy.net_floor_pct':'null', 'payroll.policy.max_deduction_pct_of_gross':'null', 'attendance.weekend_days':'FRI,SAT',
    'loan.insufficient_net_behavior':'PARTIAL_THEN_CARRY' })) await f.setting(key,value)
  branch = await f.repo('Branch').save({ name: 'CR7 Money', code: 'R7M', country: 'EG' })
  note({case:'sql-environment',rows:await f.ds.query("SELECT CAST(SERVERPROPERTY('ProductVersion') AS varchar(30)) AS productVersion, compatibility_level FROM sys.databases WHERE name=DB_NAME()")})
})
after(async () => { if(f) await f.close() })
test('CR7 money: paid run, one reversal and one supplementary preserve 1000 once and reconcile all surfaces', async () => {
  const emp = await employee({ payMethod: 'mixed', bankTransferAmount: 6500, bankName: 'مصرف الراجحي', iban: 'SA0380000000608010167519' })
  const p=await f.ok('POST','/payroll/policies',{name:'CR7 published policy',effectiveFrom:'2026-01-01',settings:{defaultPeriodType:'CALENDAR_MONTH',cycleStartDay:1,cycleEndMode:'DERIVED',cycleEndDay:null,dailyHours:8}})
  const published=await f.ok('POST',`/payroll/policies/${p.policy.id}/versions/${p.versions[0].id}/publish`,{expectedRevision:p.versions[0].revision,reason:'Independent review published policy'})
  const draft=await f.ok('POST','/payroll/runs',{name:'CR7 reversible run',period:'2026-10',policyVersionId:published.version.id,filters:{employeeIds:[emp.id]}})
  const run=await f.ok('POST',`/payroll/runs/${draft.id}/calculate`,{}), item=run.items[0]
  assert.equal(money(item.netPay),7000); assert.equal(money(item.allowances),1000)
  assert.deepEqual(breakdown(item).workPressureAllowance,{monthlyAmount:1000,earnedAmount:1000})
  await f.approve(run.id)
  await f.ok('POST',`/payroll/runs/${run.id}/pay`,{channel:'BANK_TRANSFER',reference:'CR7-paid'},f.approver)
  assert.ok((await f.request('POST',`/payroll/runs/${run.id}/pay`,{channel:'CASH'},f.approver)).status >= 400)
  const bank = await f.ok('GET',`/payroll/runs/${run.id}/bank-sheet`)
  assert.deepEqual([bank.rows[0].netPay,bank.rows[0].bankAmount,bank.rows[0].cashAmount],[7000,6500,500])
  const slip = await f.ok('GET',`/payroll/items/${item.id}`)
  assert.deepEqual(slip.lines.earnings.filter(r=>r.key==='SALARY:WORK_PRESSURE').map(r=>r.amount),[1000])
  assert.equal(slip.lines.totals.net,7000)
  const selection = {employeeIds:[emp.id]}
  const preview = await f.ok('POST',`/payroll/runs/${run.id}/reversal-preview`,selection)
  assert.equal(preview.blocked,false); assert.equal(money(preview.totalNet),7000)
  const reversal = await f.ok('POST',`/payroll/runs/${run.id}/reversals`,{...selection,reason:'Independent correction with full refund of work pressure allowance',previewHash:preview.previewHash})
  assert.equal(money(reversal.totalNet),-7000)
  await f.ok('POST',`/payroll/runs/${reversal.id}/approve`,{},f.approver)
  await f.ok('POST',`/payroll/runs/${reversal.id}/pay`,{channel:'BANK_TRANSFER',reference:'CR7-refund'},f.approver)
  let supplementary = await f.ok('POST',`/payroll/runs/${run.id}/supplementary`,{...selection,reason:'Independent reissue after documented full refund'})
  supplementary = await f.ok('POST',`/payroll/runs/${supplementary.id}/calculate`,{})
  assert.equal(money(supplementary.totalNet),7000)
  await f.approve(supplementary.id)
  await f.ok('POST',`/payroll/runs/${supplementary.id}/pay`,{channel:'BANK_TRANSFER',reference:'CR7-reissue'},f.approver)
  const register = await f.ok('GET','/reports/financial/payroll-register?period=2026-10')
  const rows=register.rows.filter(r=>r.employeeId===emp.id)
  const total=rows.reduce((s,r)=>s+money(r.net),0)
  const pressure=rows.reduce((s,r)=>s+money(r.allowanceBuckets.WORK_PRESSURE||0),0)
  note({case:'money-reversal',original:7000,reversal:-7000,supplementary:7000,netRegister:total,pressureRegister:pressure,
    rows:rows.map(r=>({runId:r.runId,net:r.net,pressure:r.allowanceBuckets.WORK_PRESSURE}))})
  assert.equal(total,7000); assert.equal(pressure,1000)
})
test('CR7 money: sick and unpaid deductions leave the pressure amount whole, with an independent zero-allowance control', async () => {
  const paid = await employee({}), control = await employee({workPressureAllowance:0})
  await f.repo('LeaveType').save({code:'R7SICK',nameAr:'مرضية مراجعة',isPaid:true,balanceType:'sick',category:'SICK',
    sickPayTiers:JSON.stringify([{fromDay:1,toDay:null,payPercent:75}])})
  for(const emp of [paid,control]) {
    await f.repo('Leave').save({employeeId:emp.id,leaveTypeCode:'R7SICK',fromDate:'2026-10-05',toDate:'2026-10-08',days:4,period:'FULL',isUnpaid:false,status:'APPROVED'})
    await f.repo('Leave').save({employeeId:emp.id,leaveTypeCode:'UNPAID',fromDate:'2026-10-11',toDate:'2026-10-12',days:2,period:'FULL',isUnpaid:true,status:'APPROVED'})
  }
  const run=await calc([paid,control]), a=run.items.find(r=>r.employeeId===paid.id), b=run.items.find(r=>r.employeeId===control.id)
  // 4 x 6000/30 x 25% = 200; 2 x 6000/30 = 400. Base net 5400, plus pressure 1000 = 6400.
  assert.equal(money(a.unpaidLeaveDeduction),600,'persisted leave deduction includes sick 200 and unpaid 400'); assert.equal(breakdown(a).sickLeave.amount,200)
  assert.deepEqual([money(a.netPay),money(b.netPay)],[6400,5400])
  assert.equal(breakdown(a).dayRate,200); assert.equal(breakdown(a).hourRate,25)
  note({case:'sick-and-unpaid',sick:200,unpaid:400,baseNet:5400,withPressure:6400})
})
test('CR7 money: 31-day month full coverage and mid-month joiner truncate independently to cents',async()=>{
  const full=await employee({workPressureAllowance:1000.01}), joined=await employee({workPressureAllowance:1000.01,joinDate:'2026-10-17'})
  const run=await calc([full,joined]), a=run.items.find(r=>r.employeeId===full.id), b=run.items.find(r=>r.employeeId===joined.id)
  // Full October is 30/30, not 31/30. Joiner has 15/30 service days: 3000 + floor(100001*15/30)/100 = 3500.
  assert.deepEqual([money(a.netPay),money(b.netPay)],[7000.01,3500])
  assert.deepEqual(breakdown(b).workPressureAllowance,{monthlyAmount:1000.01,earnedAmount:500})
  note({case:'31-day-proration',full:7000.01,joinerDays:15,joinerPressure:500,joinerNet:3500})
})
test('CR7 money: thirty suspension days consume only the six-component salary',async()=>{
  const emp=await employee({})
  await f.ok('POST',`/employees/${emp.id}/suspensions`,{fromDate:'2026-10-01',toDate:'2026-10-30',reason:'Independent suspension throughout thirty service days'})
  const run=await calc([emp]),item=run.items[0]
  assert.equal(money(item.unpaidLeaveDeduction),6000);assert.equal(money(item.netPay),1000)
  assert.equal(breakdown(item).workPressureAllowance.earnedAmount,1000)
  await f.approve(run.id);await f.ok('POST',`/payroll/runs/${run.id}/pay`,{channel:'CASH',reference:'CR7-suspension'},f.approver)
  note({case:'suspension',days:30,deduction:6000,netPaid:1000})
})
test('CR7 money: floor is computed from 6000 and the pressure is added after the floor',async()=>{
  const emp=await employee({})
  await f.repo('EmployeeObligation').save({employeeId:emp.id,type:'DEBIT',category:'custody_shortfall',amount:5800,label:'Independent debt',status:'PENDING',effectiveDate:'2026-10-01'})
  await f.setting('payroll.policy.net_floor_pct','50')
  let run
  try {run=await calc([emp])}finally{await f.setting('payroll.policy.net_floor_pct','null')}
  const item=run.items[0]
  assert.equal(money(item.otherDeductions),3000);assert.equal(money(item.netPay),4000)
  note({case:'net-floor',basis:6000,floor:3000,collected:3000,carried:2800,pressure:1000,net:4000})
})
test('CR7 security: pressure salary stays hidden from a non-financial employee reader and cannot be patched directly',async()=>{
  const emp=await employee({workPressureAllowance:1234.56})
  const reader=await f.repo('User').save({email:'r7reader@codex.invalid',displayName:'CR7 Reader',passwordHash:'not-a-password',role:'employee',
    branchId:branch.id,permissions:JSON.stringify(['employees.view'])})
  const view=await f.ok('GET',`/employees/${emp.id}`,null,reader)
  assert.ok(!JSON.stringify(view).includes('workPressureAllowance'))
  const update=await f.request('PATCH',`/employees/${emp.id}`,{workPressureAllowance:9999},reader)
  assert.ok(update.status>=400);assert.equal(money((await f.repo('Employee').findOneByOrFail({id:emp.id})).workPressureAllowance),1234.56)
  note({case:'salary-security',readStatus:200,hidden:true,writeStatus:update.status})
})
test('CR7 settlement: mid-month leaver receives pressure through one last-salary line and is excluded from bank payout',async()=>{
  const emp=await employee({status:'archived',isActive:false}), control=await employee({status:'archived',isActive:false,workPressureAllowance:0})
  const cases=[]
  for(const row of [emp,control]) {
    const kase=await f.repo('OffboardingCase').save({employeeId:row.id,lastWorkingDay:'2026-10-15',status:'IN_SETTLEMENT',terminationReason:'termination'})
    await f.repo('ClearanceItem').save(['manager','custody','it','finance','hr'].map(party=>({caseId:kase.id,party,label:party,status:'DONE'})))
    cases.push(kase)
  }
  const run=await calc([emp,control]),item=run.items.find(r=>r.employeeId===emp.id)
  assert.equal(money(item.netPay),3500);assert.equal(breakdown(item).workPressureAllowance.earnedAmount,500)
  const lines=[]
  for(const kase of cases) {
    const recalc=await f.ok('POST',`/offboarding/${kase.id}/recalc-lines`,{})
    lines.push(recalc.lines)
  }
  const salaryLines=lines.map(rows=>rows.filter(r=>r.isAuto&&r.label.startsWith('راتب آخر شهر')))
  assert.deepEqual(salaryLines.map(r=>r.length),[1,1]);assert.deepEqual(salaryLines.map(r=>money(r[0].amount)),[3500,3000])
  const eos=rows=>rows.filter(r=>r.label.startsWith('مكافأة نهاية الخدمة')).map(r=>money(r.amount))
  assert.equal(eos(lines[0]).length,1);assert.deepEqual(eos(lines[0]),eos(lines[1]))
  for(const kase of cases)await f.ok('POST',`/offboarding/${kase.id}/approve-settlement`,{})
  await f.approve(run.id)
  const sheet=await f.ok('GET',`/payroll/runs/${run.id}/bank-sheet`)
  assert.equal(sheet.rows.length,0);assert.deepEqual([sheet.settlement.employees,sheet.settlement.total],[2,6500])
  const repeated=await f.request('POST',`/offboarding/${cases[0].id}/approve-settlement`,{})
  assert.ok(repeated.status>=400)
  note({case:'settlement',serviceDays:15,lastSalary:3500,controlSalary:3000,pressure:500,eos:eos(lines[0])[0],bankRows:0,settlementTotal:6500,repeatStatus:repeated.status})
})
test('CR7 salary source: a pressure-only dated change after calculation invalidates approval',async()=>{
  const emp=await employee({})
  const initial=await f.ok('GET',`/payroll/employees/${emp.id}/salary-history`)
  await f.ok('POST',`/payroll/employees/${emp.id}/salary-history/monthly`,{expectedRevision:initial.revision,expectedCurrentSourceHash:initial.currentSourceHash,
    reason:'Independent initial monthly salary evidence',evidenceReference:'CR7 initial salary',
    periods:[{...initial.current,effectivePayrollPeriod:'2026-01',effectiveToPayrollPeriod:null}]})
  const run=await calc([emp])
  const context=await f.ok('GET',`/employees/${emp.id}/salary-change-context`)
  await f.ok('PATCH',`/employees/${emp.id}`,{salaryChange:{expectedRevision:context.historyRevision,expectedCurrentSourceHash:context.currentSourceHash,
    effectivePayrollPeriod:context.currentPayrollPeriod,reason:'Independent pressure-only revision after calculation',evidenceReference:'CR7 dated decision',
    salary:{...context.current,workPressureAllowance:'1500.00'}}})
  const {writeParityReasonsBeforeApproval}=require('./fixtures/payroll-parity-reasons.cjs')
  await writeParityReasonsBeforeApproval((u,m,p,b)=>f.request(m,p,b,u),f.approver,'POST',`/payroll/runs/${run.id}/approve`)
  const report=await f.ok('GET',`/payroll/runs/${run.id}/unassigned`,null,f.approver)
  await f.ok('POST',`/payroll/runs/${run.id}/unassigned-ack`,{reportHash:report.reportHash},f.approver)
  const approval=await f.request('POST',`/payroll/runs/${run.id}/approve`,{},f.approver)
  note({case:'stale-pressure-source',status:approval.status,body:approval.body})
  assert.equal(approval.status,409)
  assert.equal((await f.repo('PayrollRun').findOneByOrFail({id:run.id})).status,'CALCULATED')
})
