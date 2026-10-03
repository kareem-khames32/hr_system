// قبول مسارات الإضافي عبر HTTP وقاعدة SQL عشوائية، دون تغيير بيانات النظام أو قاعدة المراجعة.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_codex_r38_ot_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-ot-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, master, ds, base, admin, financeApprover, created = false, sequence = 0
const repo = name => ds.getRepository(name)
const numeric = value => Number(value)
const isoDate = value => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
const dateAfter = (value, offset) => { const day = new Date(`${value}T12:00:00`); day.setDate(day.getDate() + offset); return isoDate(day) }
const today = isoDate(new Date())
let workDate = '2026-07-08'
while (new Date(`${workDate}T12:00:00`).getDay() !== 3) workDate = dateAfter(workDate, -1)
const toObject = value => typeof value === 'string' ? JSON.parse(value) : value

function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null,
    employeeId: user.employeeId ?? null, tokenVersion: user.tokenVersion ?? 0,
    permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
// الخطوة 20 (B4): قبل اعتماد مسير يُكتب سبب لكل رمز في تقرير التكافؤ (هذه المجموعة لا تختبر التكافؤ نفسه)
const { writeParityReasonsBeforeApproval } = require('./fixtures/payroll-parity-reasons.cjs')
async function request(user, method, url, body) {
  await writeParityReasonsBeforeApproval(request, user, method, url)
  const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(user)}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
async function configDuring(values, action) {
  const previous = new Map()
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, await repo('RequestsConfig').findOneBy({ key }))
    await repo('RequestsConfig').save({ key, value: String(value) })
  }
  try { return await action() } finally {
    for (const [key, row] of previous) {
      if (row) await repo('RequestsConfig').save(row)
      else await repo('RequestsConfig').delete({ key })
    }
  }
}
// قاعدة المالك (الخطوة 13): تغيير الأجر يسري من راتب شهر كامل عبر salaryChange بسياق التعديل المقروء، لا بمفاتيح الملف العامة
async function changeSalary(f, basicSalary) {
  const context = await request(admin, 'GET', `/employees/${f.emp.id}/salary-change-context`)
  assert.equal(context.status, 200, JSON.stringify(context.body))
  return request(admin, 'PATCH', `/employees/${f.emp.id}`, { salaryChange: { expectedRevision: context.body.historyRevision,
    // التغيير بيسري من شهر يوم العمل نفسه: أول أيام الشهر يوم العمل (آخر أربعاء فات) بيقع في الشهر اللي قبله، ولو التغيير اتسجّل من
    // الشهر الحالي الموظف بيبقى من غير راتب موثق في شهر المسير المطلوب — والاختبار كان بيفشل أول أسبوع من كل شهر
    expectedCurrentSourceHash: context.body.currentSourceHash, effectivePayrollPeriod: f.day.slice(0, 7) < context.body.currentPayrollPeriod ? f.day.slice(0, 7) : context.body.currentPayrollPeriod,
    reason: 'تغيير أجر بعد اعتماد الإضافي للاختبار', evidenceReference: `fixture:${f.emp.id}:salary`, salary: { ...context.body.current, basicSalary } } })
}
// كود دولة فريد لكل تركيب بحروف لاتينية كبيرة فقط (2–5) كما يشترط فحص لقطة التقويم؛ «T1» كان يُرفض فتتوقف المجموعة قبل منطق الإضافي
const fixtureCountry = n => { let letters = ''; for (let rest = n; rest > 0; rest = Math.floor((rest - 1) / 26)) letters = String.fromCharCode(65 + ((rest - 1) % 26)) + letters; return `T${letters}` }
async function fixture({ day = workDate, shift = {}, employee = {} } = {}) {
  const n = ++sequence
  assert.ok(n <= 475254, 'fixture country code stays within five letters')
  const branch = await repo('Branch').save({ code: `OT${n}`, name: `فرع اختبار إضافي ${n}`, country: fixtureCountry(n), weekendDays: 'FRI,SAT' })
  const department = await repo('Department').save({ branchId: branch.id, code: `OTDEPT${n}`, name: `قسم اختبار إضافي ${n}` })
  const person = (suffix, extra = {}) => repo('Employee').save({ employeeCode: `OT${n}${suffix}`, fingerprintCode: `OT${n}${suffix}`, fullName: `موظف إضافي ${n} ${suffix}`,
    branchId: branch.id, departmentId: department.id, joinDate: '2020-01-01', basicSalary: 0,
    housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0,
    status: 'active', isActive: true, annualLeaveEntitled: false, payMethod: 'cash', ...extra })
  const managerEmployee = await person('M'), headEmployee = await person('D'), hrEmployee = await person('H')
  await repo('Department').update(department.id, { managerEmployeeId: headEmployee.id })
  const emp = await person('E', { managerEmployeeId: managerEmployee.id, basicSalary: 9000, ...employee })
  const user = (employee, suffix, role = 'employee', permissions = []) => repo('User').save({
    email: `${n}-${suffix}@payroll-ot.invalid`, displayName: employee.fullName, employeeId: employee.id,
    branchId: branch.id, passwordHash: 'isolated-test-token-only', role, permissions: JSON.stringify(permissions),
  })
  const owner = await user(emp, 'owner')
  const manager = await user(managerEmployee, 'manager', 'employee', ['requests.view_all'])
  const head = await user(headEmployee, 'head', 'employee', ['requests.view_all'])
  const hr = await user(hrEmployee, 'hr', 'hr_manager', ['requests.view_all', 'attendance.manage', 'attendance.view_all', 'requests.create_on_behalf'])
  const saved = await request(admin, 'POST', '/catalogs/shifts', {
    name: `وردية اختبار إضافي ${n}`, startTime: '08:00', endTime: '17:00', shiftMode: 'fixed', graceMinutes: 0,
    flexEnabled: false, flexWindowMinutes: 60, requiredWorkMinutes: 540,
    effectiveFrom: dateAfter(day, -14), changeReason: 'تعريف وردية مؤرخة لاختبار أدلة الإضافي', ...shift,
  })
  assert.equal(saved.status, 201, JSON.stringify(saved.body))
  const f = { emp, branch, department, owner, manager, head, hr, source: saved.body, day }
  await assign(f, day)
  return f
}
async function assign(f, day = f.day) {
  const assigned = await request(f.hr, 'POST', '/attendance/schedule/day', { employeeId: f.emp.id, date: day, shiftId: f.source.id })
  assert.equal(assigned.status, 201, JSON.stringify(assigned.body))
}
async function punches(f, start, end, { day = f.day, endDay = day } = {}) {
  assert.ok(day <= today && endDay <= today, 'Fixtures must never fabricate future attendance')
  const values = [[day, start], ...(end ? [[endDay, end]] : [])].map(([date, clock]) => ({
    employeeCode: f.emp.employeeCode, timestamp: new Date(`${date}T${clock}:00`).toISOString(),
  }))
  const result = await request(f.hr, 'POST', '/attendance/punches/manual', { punches: values, reason: 'بصمات فعلية لقبول الإضافي في قاعدة معزولة' })
  assert.equal(result.status, 201, JSON.stringify(result.body))
  return repo('AttendanceDay').findOneByOrFail({ employeeId: f.emp.id, date: day })
}
async function preview(f, day = f.day, actor = f.owner, employeeId) {
  const response = await request(actor, 'GET', `/attendance/overtime/preview?date=${day}${employeeId === undefined ? '' : `&employeeId=${employeeId}`}`)
  assert.equal(response.status, 200, JSON.stringify(response.body))
  return response.body
}
async function window(f, effect, extra = {}) {
  const response = await request(extra.branchId === null ? admin : f.hr, 'POST', '/attendance/overtime-periods', { name: `نافذة ${effect} للاختبار`,
    fromDate: f.day, toDate: f.day, branchId: f.branch.id, effect, isActive: true, ...extra })
  assert.equal(response.status, 201, JSON.stringify(response.body))
  return response.body
}
const submit = (f, extra = {}) => request(f.owner, 'POST', '/requests', {
  typeCode: 'OVERTIME', submit: true, payload: { date: f.day, hours: 3, reason: 'عمل إضافي موثق بعد انتهاء الوردية', ...extra },
})
const decide = (actor, id, extra = {}) => request(actor, 'POST', `/requests/${id}/act`, {
  action: 'APPROVE', comment: 'مراجعة ساعات الإضافي وأدلتها', ...extra,
})
async function complete(f, pending, final = {}) {
  let result
  for (const [index, actor] of [f.manager, f.head, f.hr].entries()) {
    result = await decide(actor, pending.id, index === 2 ? final : {})
    assert.equal(result.status, 201, JSON.stringify(result.body))
    assert.equal(result.body.status, index === 2 ? 'COMPLETED' : 'UNDER_REVIEW')
    if (index < 2) assert.equal(result.body.currentStep, index + 2)
  }
  return repo('OvertimeEntry').findOneByOrFail({ requestId: pending.id })
}
async function counts(f) {
  return { requests: await repo('Request').count({ where: { requesterId: f.emp.id } }),
    entries: await repo('OvertimeEntry').count({ where: { employeeId: f.emp.id } }),
    approvals: await repo('RequestApproval').count(), claims: await repo('OvertimeDayClaim').count(), events: await repo('OvertimeEntryEvent').count() }
}
const claimsFor = f => repo('OvertimeDayClaim').find({ where: { employeeId: f.emp.id, workDate: f.day }, order: { id: 'ASC' } })
// الخطوة 16 (B3): اسم المسير فريد داخل الشهر لغير الملغى؛ كل مسير جديد يأخذ رقمًا تسلسليًا.
let overtimeRunNumber = 0
async function payroll(f, period = f.day.slice(0, 7), extra = {}) {
  const response = await request(admin, 'POST', '/payroll/runs/calculate-defined', {
    period, scopeType: 'CUSTOM', employeeIds: [f.emp.id], name: `مسير قبول مصادر الإضافي ${++overtimeRunNumber}`, ...extra,
  })
  assert.equal(response.status, 201, JSON.stringify(response.body))
  const item = response.body.items.find(row => row.employeeId === f.emp.id)
  assert.ok(item)
  return { run: response.body, item, breakdown: toObject(item.breakdown) }
}
// الخطوة 18 (B3): الاعتماد يتطلب إقرارًا بتقرير «موظفون بلا مسير» لنسخة الحساب الحالية بنطاق المعتمد.
async function acknowledgeUnassigned(user, runId) {
  const report = await request(user, 'GET', `/payroll/runs/${runId}/unassigned`)
  assert.equal(report.status, 200, JSON.stringify(report.body))
  const ack = await request(user, 'POST', `/payroll/runs/${runId}/unassigned-ack`, { reportHash: report.body.reportHash })
  assert.equal(ack.status, 201, JSON.stringify(ack.body))
}
async function payPayroll(run) {
  await acknowledgeUnassigned(financeApprover, run.id)
  const approved = await request(financeApprover, 'POST', `/payroll/runs/${run.id}/approve`)
  assert.equal(approved.status, 201, JSON.stringify(approved.body))
  // الخطوة 22 (B5): الصرف يسجل قناته ومرجعه
  const paid = await request(financeApprover, 'POST', `/payroll/runs/${run.id}/pay`, { channel: 'BANK_TRANSFER', reference: `OT-TEST-${run.id}` })
  assert.equal(paid.status, 201, JSON.stringify(paid.body))
  return paid.body
}
const monthAfter = period => {
  const [year, month] = period.split('-').map(Number)
  return isoDate(new Date(year, month, 1, 12)).slice(0, 7)
}
async function concurrentBehindEmployeeLock(f, actions) {
  // حاجز SQL فعلي يجعل الطلبات تنتظر قفل الموظف نفسه قبل تحريرها، دون استبدال
  // أي خدمة أو دالة في التطبيق ودون الاعتماد على اختلاف سرعة طلبات الشبكة.
  const runner = ds.createQueryRunner()
  let pending = [], committed = false
  try {
    await runner.connect(); await runner.startTransaction()
    const [{ spid }] = await runner.query('SELECT @@SPID AS spid')
    const locked = await runner.query(`DECLARE @result int;
      EXEC @result = sys.sp_getapplock @Resource = @0, @LockMode = 'Exclusive',
        @LockOwner = 'Transaction', @LockTimeout = 5000;
      SELECT @result AS lockResult;`, [`hr:employee-finance:${f.emp.id}`])
    assert.ok(numeric(locked[0].lockResult) >= 0)
    pending = actions.map(action => action())
    const deadline = Date.now() + 6000
    let waiting = []
    while (Date.now() < deadline) {
      // SQL قد يضع المنتظر الثاني خلف الأول؛ نتتبع السلسلة كاملة ونظل نطلب
      // دليلاً على انتظار كل عملية فعلياً داخل قاعدة الاختبار نفسها.
      const result = await master.request().input('blocker', sql.Int, spid).input('testDatabase', sql.NVarChar, database).query(`
        WITH waiting AS (
          SELECT session_id, blocking_session_id, wait_type
          FROM sys.dm_exec_requests
          WHERE database_id=DB_ID(@testDatabase) AND wait_type LIKE 'LCK%'
        ), blocked AS (
          SELECT session_id, blocking_session_id, wait_type, 1 AS depth
          FROM waiting WHERE blocking_session_id=@blocker
          UNION ALL
          SELECT w.session_id, w.blocking_session_id, w.wait_type, b.depth+1
          FROM waiting w INNER JOIN blocked b ON w.blocking_session_id=b.session_id
        ) SELECT DISTINCT session_id, blocking_session_id, wait_type, depth FROM blocked OPTION (MAXRECURSION 20)`)
      waiting = result.recordset
      if (waiting.length >= actions.length) break
      await new Promise(resolve => setTimeout(resolve, 25))
    }
    assert.ok(waiting.length >= actions.length, `Expected ${actions.length} actual SQL waiters, observed ${JSON.stringify(waiting)}`)
    process.stdout.write(`# SQL barrier ${actions.length} operations: ${JSON.stringify(waiting)}\n`)
    await runner.commitTransaction(); committed = true
    return await Promise.all(pending)
  } finally {
    if (!committed && runner.isTransactionActive) await runner.rollbackTransaction()
    await Promise.allSettled(pending)
    await runner.release()
  }
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, /^hr_codex_r38_ot_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433),
    user: env.DB_USERNAME, password: env.DB_PASSWORD, database: 'master',
    options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  assert.equal((await master.request().query('SELECT 1 AS ready')).recordset[0].ready, 1)
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  ds = app.get(require('../node_modules/typeorm').DataSource); assert.equal(ds.options.database, database)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  const makeAdmin = email => repo('User').save({ email, displayName: 'مراجع اختبار الإضافي', passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  admin = await makeAdmin('admin@payroll-ot.invalid'); financeApprover = await makeAdmin('finance@payroll-ot.invalid')
  const chain = await repo('ApprovalChain').save({ code: 'OT_HTTP_THREE', nameAr: 'مدير ثم رئيس قسم ثم موارد بشرية',
    requestTypeCode: 'OVERTIME', isActive: true, autoApprove: false })
  await repo('ApprovalStep').save([
    { chainId: chain.id, stepOrder: 1, approverRole: 'direct_manager_of_requester' },
    { chainId: chain.id, stepOrder: 2, approverRole: 'department_manager_of_requester' },
    { chainId: chain.id, stepOrder: 3, approverRole: 'hr' },
  ])
  for (const [code, destinationHandler] of [['OVERTIME', 'overtime_entries'], ['OVERTIME_AUTO', 'overtime_auto']]) {
    const old = await repo('RequestType').findOneBy({ code })
    await repo('RequestType').save({ ...old, code, nameAr: code === 'OVERTIME' ? 'عمل إضافي' : 'إضافي مكتشف', category: 'time_attendance',
      destinationHandler, approvalChainId: chain.id, isActive: true, requiredFields: JSON.stringify(code === 'OVERTIME' ? ['date', 'hours'] : []) })
  }
  await repo('RequestsConfig').save([
    { key: 'overtime.enabled', value: 'false' }, { key: 'overtime.biometric_requires_confirmation', value: 'true' },
    { key: 'overtime.detection_threshold_hours', value: '0.5' },
    { key: 'overtime.multiplier_weekday', value: '1.5' }, { key: 'overtime.multiplier_weekend', value: '1.75' },
    { key: 'overtime.multiplier_holiday', value: '2' },
    { key: 'overtime.rounding_minutes', value: '15' }, { key: 'overtime.rounding_direction', value: 'DOWN' },
    { key: 'overtime.max_hours_per_day', value: '0' }, { key: 'overtime.max_hours_per_week', value: '0' },
    { key: 'overtime.max_hours_per_month', value: '0' }, { key: 'overtime.request_backdate_days', value: '400' },
    { key: 'overtime.max_closed_periods', value: '1' }, { key: 'overtime.allow_early_overtime', value: 'false' },
    { key: 'overtime.missing_punch_policy', value: 'BLOCK' }, { key: 'overtime.leave_conflict_policy', value: 'BLOCK' },
    { key: 'overtime.wage_components', value: 'BASIC,HOUSING,TRANSPORT,PHONE,WORK_NATURE,OTHER' },
    { key: 'payroll.cycle_start_day', value: '1' }, { key: 'payroll.monthly_days', value: '30' },
    // تسعير الإضافي هنا على راتب الملف؛ تسعيره براتب شهر يوم العمل من السجل مغطى في payroll-run-salary-period.integration.cjs.
    { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' },
    { key: 'payroll.daily_hours', value: '8' }, { key: 'attendance.weekend_days', value: 'FRI,SAT' },
    { key: 'attendance.grace_minutes', value: '0' }, { key: 'attendance.flex.shortfall_grace_minutes', value: '10' },
    { key: 'payroll.exempt_overtime_eligible', value: 'false' },
  ])
}, { timeout: 60000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_codex_r38_ot_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} no longer exists in sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir())); assert.match(path.basename(uploads), /^hr-payroll-ot-files-/)
    fs.rmSync(uploads, { recursive: true, force: true }); assert.equal(fs.existsSync(uploads), false)
    t.diagnostic('Cleanup verified: the temporary uploads directory was removed.')
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Overtime fixture cleanup failed')
})

// قاعدة المالك (17 سبتمبر): الإضافي = الشغل الفعلي − الساعات المطلوبة. 07:52–19:20 = 688 دقيقة − 540 = 148 خام
// (كانت 140 لما كان بيتحسب بعد نهاية الوردية 17:00 بس)، والمحتسب لسه 135 بعد التقريب كل 15.
// Appended to a copy of the proven payroll-overtime fixture. All evidence below is created by real APIs.
const expectOK=r=>{assert.ok(r.status>=200&&r.status<300,JSON.stringify(r.body));return r.body}
const requestOK=async(user,method,url,body)=>expectOK(await request(user,method,url,body))
async function realDeferredPayroll(){
 const f=await fixture({day:'2026-07-08'})
 await punches(f,'07:52','19:20')
 const pending=expectOK(await submit(f));const original=await payroll(f,'2026-07')
 assert.equal(Number(original.item.overtimeAmount),0);await payPayroll(original.run)
 const approved=await complete(f,pending);assert.equal(approved.deferredFromRunId,original.run.id)
 assert.equal(Number(approved.amountSnapshot),126.56)
 const later=await payroll(f,'2026-08');assert.equal(Number(later.item.overtimeAmount),126.56)
 await payPayroll(later.run)
 const entry=await repo('OvertimeEntry').findOneByOrFail({id:approved.id})
 assert.equal(entry.status,'PAID');assert.equal(entry.payrollRunId,later.run.id)
 return {...f,pending,original,later,entry}
}
async function transferAndRestrict(f){
 const A=await repo('Branch').save({code:'R38A'+sequence,name:'CR38 receiving A '+sequence,country:f.branch.country})
 const department=await repo('Department').save({branchId:A.id,name:'CR38 receiving department '+sequence})
 const c=await requestOK(admin,'GET',`/attendance/calendar-context?scope=EMPLOYEE&sourceId=${f.emp.id}`)
 await requestOK(admin,'PATCH',`/employees/${f.emp.id}`,{branchId:A.id,departmentId:department.id,teamId:null,calendarChange:{effectiveFrom:today,reason:'نقل فعلي لمراجعة عزل مرجع المسير',expectedRevision:c.revision,expectedCurrentSourceHash:c.currentSourceHash}})
 // A former approver remains a party to the request after their account scope changes.
 f.hr.branchId=A.id;f.hr.permissions=JSON.stringify(['requests.view_all','attendance.view_all','payroll.view','reports.view'])
 await repo('User').update(f.hr.id,{branchId:A.id,permissions:f.hr.permissions})
 Object.assign(f.owner,await repo('User').findOneByOrFail({id:f.owner.id}))
 for(const run of [f.original.run,f.later.run])assert.equal((await request(f.hr,'GET',`/payroll/runs/${run.id}`)).status,403)
 return A
}
const logFor=async(f,actor)=> (await requestOK(actor,'GET','/attendance/overtime?from=2026-07-01&to=2026-07-31')).entries.find(x=>x.id===f.entry.id)
async function stored(f){return {entry:await repo('OvertimeEntry').findOneByOrFail({id:f.entry.id}),events:await repo('OvertimeEntryEvent').find({where:{entryId:f.entry.id},order:{id:'ASC'}}),request:await repo('Request').findOneByOrFail({id:f.pending.id})}}
test('CR38 overtime event must hide the foreign payment period as well as its numbers',{timeout:300000},async t=>{
 const f=await realDeferredPayroll()
 const preview=await requestOK(admin,'POST',`/payroll/runs/${f.later.run.id}/reversal-preview`,{employeeIds:[f.emp.id]});assert.equal(preview.blocked,false)
 const reversal=await requestOK(admin,'POST',`/payroll/runs/${f.later.run.id}/reversals`,{employeeIds:[f.emp.id],reason:'مراجعة أثر عكس الإضافي',previewHash:preview.previewHash})
 await requestOK(financeApprover,'POST',`/payroll/runs/${reversal.id}/approve`,{})
 await requestOK(financeApprover,'POST',`/payroll/runs/${reversal.id}/pay`,{channel:'CASH',reference:'CR38 reversal'})
 assert.equal(Number((await repo('PayrollRun').findOneByOrFail({id:reversal.id})).totalNet),-Number(f.later.run.totalNet))
 const allowed=await requestOK(f.hr,'GET',`/requests/${f.pending.id}`),allowedEvent=allowed.overtime.events.find(x=>x.eventType==='PAYROLL_REVERSED');assert.ok(allowedEvent)
 for(const id of [f.later.run.id,reversal.id])assert.ok(allowedEvent.reason.includes('#'+id))
 await transferAndRestrict(f);assert.equal((await request(f.hr,'GET',`/payroll/runs/${reversal.id}`)).status,403)
 const before=await stored(f),detail=await requestOK(f.hr,'GET',`/requests/${f.pending.id}`),company=await requestOK(admin,'GET',`/requests/${f.pending.id}`),self=await requestOK(f.owner,'GET',`/requests/${f.pending.id}`)
 const event=detail.overtime.events.find(x=>x.eventType==='PAYROLL_REVERSED'),companyEvent=company.overtime.events.find(x=>x.id===event.id),selfEvent=self.overtime.events.find(x=>x.id===event.id)
 assert.equal(detail.overtime.status,'APPROVED');assert.equal(Number(detail.overtime.amountSnapshot),126.56)
 assert.equal(companyEvent.reason,allowedEvent.reason);assert.equal(selfEvent.reason,companyEvent.reason)
 assert.deepEqual(await stored(f),before)
 t.diagnostic(JSON.stringify({case:'overtime-request-event-run-reference',directRunStatus:403,requestStatus:200,originalRun:f.later.run.id,reversalRun:reversal.id,branchReason:event.reason,companyReason:companyEvent.reason,selfReason:selfEvent.reason,amount:126.56,status:'APPROVED',storedHistoryUnchanged:true}))
 assert.equal(f.original.run.period,'2026-07');assert.equal(f.later.run.period,'2026-08')
 assert.ok(companyEvent.reason.includes(f.later.run.period));assert.ok(selfEvent.reason.includes(f.later.run.period))
 assert.equal(event.reason.includes(f.later.run.period),false,'The old request party must not learn the foreign payment period, different from the July work date')
 for(const id of [f.later.run.id,reversal.id])assert.equal(new RegExp('#'+id+'(?![0-9])').test(event.reason),false,'Request event reason must conceal foreign payroll references')
})
