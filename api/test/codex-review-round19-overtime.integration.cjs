// Round19 cases with the disposable scaffold borrowed from round18 (only database prefix renamed).
// Round18 independent cases with the unchanged disposable setup borrowed from round17.
// Review copy of the original feature tests, with disclosed CRLF adaptation and independent added cases.
'use strict'
// «اعتماد تلقائي» لفترة الإضافي المفتوحة (قرار المالك 28 سبتمبر) على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر
// (hr_codex_r19_overtime_test_<16 hex> — لا مساس بقاعدة الشركة)، عبر HTTP بتوكنات موقّعة محليًا ومن غير كلمات مرور:
//  AA-01) فترة مفتوحة عليها العلامة ويوم خلص: الكشف بيتعتمد لوحده — طلب OVERTIME_AUTO بخطوة نظام، وقرار approverId = 0
//         بتعليق «اعتماد تلقائي — فترة الإضافي «الاسم»»، وحدث AUTO_APPROVED بمعرّف الفترة، وحجز اليوم، ولقطة الاعتماد النهائي.
//  AA-02) فترة مفتوحة من غير العلامة: التوجيه لسلسلته UNDER_REVIEW زي الأول بالحرف، واعتماده اليدوي بنفس الدليل بيطلع
//         نفس الدقائق والساعات وسعر الساعة والقيمة بالظبط زي التلقائي.
//  AA-03) الاتنين بينزلوا المسير بلقطتهم المثبتة (APPROVAL_SNAPSHOT) بنفس القيمة — لقطة قرار النظام صالحة للصرف.
//  AA-04) الفترة المقفولة بتكسب: مفيش كشف ولا اعتماد تلقائي، والطلب الصريح بيمشي في سلسلته، والمكتشف المستني بيتلغي.
//  AA-05) فترة الفرع عليها العلامة بتسري على فرعها بس: موظف فرع تاني في نفس اليوم بيتوجه لسلسلته.
//  AA-06) يوم لسه ماخلصش مابيتعتمدش وبيفضل مكتشف، وبيتعتمد في دورة بعد ما يخلص؛ وحد «خلص» من إطار يوم العمل نفسه
//         (آخر اليوم للنهارية، وحد صباح الغد ونافذة الانصراف للّيلية) + مهلة الاستقرار.
//  AA-07) الموظف المستثنى من الحضور بيفضل في سلسلته (مدير + موارد بشرية) — مفيش اعتماد تلقائي لإضافيه.
//  AA-08) رفض السقف الأسبوعي من مسار الاعتماد نفسه مابينبلعش: رجوع للسلسلة UNDER_REVIEW والسبب متسجل.
//  AA-09) حد الفترات المالية المقفلة (قاعدة التقديم): مفيش اعتماد ولا توجيه والسبب بيتسجل مرة؛ ولما الحد يسمح بيتعتمد
//         بترحيل فترة المسير المقفلة زي اليدوي.
//  AA-10) «اعتماد تلقائي» على فترة مقفولة مرفوض برسالة عربية (إنشاء/تعديل/قفل)، والقيمة منطقية بس، والنطاق زي ما هو.
//  AA-11) تعليق القرار مابيسمّيش فترة فرع تاني.
//  AA-11ب) الشاشة: خانة العلامة وجملة شرحها للفترة المفتوحة بس وشغالة افتراضيًا، والشارة، و«اعتماد تلقائي» في السجل والطلبات.
//  AA-12) نوع OVERTIME_AUTO لازم يكون مفعّل، وسلسلته مش شرط للاعتماد التلقائي.
//  AA-13) ترحيل 20260928_074 عبر المُرحّل المجمّع نفسه: إضافي، آمن للتكرار، الفترات القائمة صفر، وفرق المخطط صفر.
// Run (من api/): node --test test/overtime-auto-approve-period.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_codex_r19_overtime_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_codex_r19_overtime_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-ot-auto-files-'))
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-ot-auto-migrations-'))
const MIGRATIONS = path.join(apiRoot, '..', 'docs/migrations/payroll')
const FILE = '20260928_074_overtime_period_auto_approve.sql'
const DF = 'DF_c7cb6d2665b3c861c183e772c16'
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const isoDate = value => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
const dateAfter = (value, offset) => { const day = new Date(`${value}T12:00:00`); day.setDate(day.getDate() + offset); return isoDate(day) }
const today = isoDate(new Date())
// يوم عمل (أربعاء) خلص من يومين على الأقل — نفس اختيار مجموعات الإضافي التانية
let workDate = dateAfter(today, -2)
while (new Date(`${workDate}T12:00:00`).getDay() !== 3) workDate = dateAfter(workDate, -1)
const numeric = value => Number(value)
const toObject = value => typeof value === 'string' ? JSON.parse(value) : value
// مهلة استقرار ضخمة (أطول من عمر يوم العمل) عشان يوم خلص فعلًا يفضل «مستني» لحد ما ترجع للصفر
const LONG_SYNC_INTERVAL = '20000'
let app, master, pool, ds, baseUrl, admin, attendance, requests, created = false, sequence = 0
const D = {}
const repo = name => ds.getRepository(name)

function assertDisposable() {
  assert.match(database, migrate.DISPOSABLE_DATABASE); assert.match(database, NAME)
  assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system')
  if (ds) assert.equal(ds.options.database, database)
}
function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function request(user, method, url, body) {
  const response = await fetch(baseUrl + url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(user)}` },
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

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  const connection = db => ({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: db, options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 10000, requestTimeout: 120000 })
  master = await new sql.ConnectionPool(connection('master')).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  // المهام الدورية موقوفة: كل دورة توجيه في الاختبار صريحة (reconcile-overtime) أو من الإرسال الفوري بعد البصمة
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource); assertDisposable()
  pool = await new sql.ConnectionPool(connection(database)).connect()
  baseUrl = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  attendance = app.get(require('../src/attendance/attendance.service').AttendanceService)
  requests = app.get(require('../src/requests/requests.service').RequestsService)
  admin = await repo('User').save({ email: 'admin@ot-auto.invalid', displayName: 'مراجع اختبار الاعتماد التلقائي', passwordHash: 'isolated-test-token-only', role: 'super_admin', permissions: '["*"]' })
  const chain = await repo('ApprovalChain').save({ code: 'OT_AUTO_THREE', nameAr: 'مدير ثم رئيس قسم ثم موارد بشرية', isActive: true, autoApprove: false })
  await repo('ApprovalStep').save(['direct_manager_of_requester', 'department_manager_of_requester', 'hr'].map((approverRole, index) => ({
    chainId: chain.id, stepOrder: index + 1, approverRole })))
  for (const [code, destinationHandler] of [['OVERTIME', 'overtime_entries'], ['OVERTIME_AUTO', 'overtime_auto']]) {
    await repo('RequestType').save({ code, nameAr: code === 'OVERTIME' ? 'عمل إضافي' : 'إضافي مكتشف', category: 'time_attendance',
      destinationHandler, approvalChainId: chain.id, isActive: true, requiredFields: JSON.stringify(code === 'OVERTIME' ? ['date', 'hours'] : []) })
  }
  await repo('RequestsConfig').save(Object.entries({
    // الإضافي مقفول بالإعداد العام: النافذة بتتفتح بالفترات بس (إلا AA-05 اللي بيفتحه للفرع التاني)
    'overtime.enabled': 'false', 'overtime.biometric_requires_confirmation': 'true', 'overtime.detection_threshold_hours': '0.5',
    'overtime.multiplier_weekday': '1.5', 'overtime.multiplier_weekend': '1.5', 'overtime.multiplier_holiday': '2',
    'overtime.rounding_minutes': '15', 'overtime.rounding_direction': 'DOWN', 'overtime.max_hours_per_day': '0',
    'overtime.max_hours_per_week': '0', 'overtime.max_hours_per_month': '0', 'overtime.request_backdate_days': '30',
    'overtime.max_closed_periods': '1', 'overtime.allow_early_overtime': 'false', 'overtime.missing_punch_policy': 'BLOCK',
    'overtime.leave_conflict_policy': 'BLOCK', 'overtime.wage_components': 'BASIC,HOUSING,TRANSPORT,PHONE,WORK_NATURE,OTHER',
    'payroll.cycle_start_day': '1', 'payroll.monthly_days': '30', 'payroll.daily_hours': '8',
    // تسعير الإضافي على راتب الملف (راتب شهر يوم العمل من السجل مغطى في payroll-run-salary-period.integration.cjs)
    'payroll.salary_evidence_mode': 'MONTHLY_HISTORY_OR_CURRENT_FILE', 'payroll.exempt_overtime_eligible': 'false',
    'attendance.weekend_days': 'FRI,SAT', 'attendance.grace_minutes': '0', 'attendance.flex.shortfall_grace_minutes': '10',
  }).map(([key, value]) => ({ key, value })))
  fs.mkdirSync(path.join(base, 'payroll'), { recursive: true })
  fs.copyFileSync(path.join(MIGRATIONS, FILE), path.join(base, 'payroll', FILE))
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try { if (pool) await pool.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assertDisposable()
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  for (const dir of [uploads, base]) {
    try {
      assert.equal(path.dirname(path.resolve(dir)), path.resolve(os.tmpdir())); assert.match(path.basename(dir), /^hr-ot-auto-(files|migrations)-/)
      fs.rmSync(dir, { recursive: true, force: true }); assert.equal(fs.existsSync(dir), false)
    } catch (error) { errors.push(error) }
  }
  if (errors.length) throw new AggregateError(errors, 'overtime auto-approve fixture cleanup failed')
})

// فرع مستقل لكل تركيب: مدير مباشر ورئيس قسم وموارد بشرية حقيقيين، وموظف براتب 9000 (سعر الساعة 9000/30/8 = 37.50)
async function fixture({ day = workDate, shift = {} } = {}) {
  const n = ++sequence
  const branch = await repo('Branch').save({ code: `AA${n}`, name: `فرع اعتماد تلقائي ${n}`, weekendDays: 'FRI,SAT' })
  const department = await repo('Department').save({ branchId: branch.id, code: `AADEPT${n}`, name: `قسم اعتماد تلقائي ${n}` })
  const person = (suffix, extra = {}) => repo('Employee').save({ employeeCode: `AA${n}${suffix}`, fingerprintCode: `AA${n}${suffix}`,
    fullName: `موظف اعتماد تلقائي ${n} ${suffix}`, branchId: branch.id, departmentId: department.id, joinDate: '2020-01-01', basicSalary: 0,
    housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0, status: 'active', isActive: true,
    annualLeaveEntitled: false, payMethod: 'cash', ...extra })
  const managerEmployee = await person('M'), headEmployee = await person('D'), hrEmployee = await person('H')
  await repo('Department').update(department.id, { managerEmployeeId: headEmployee.id })
  const emp = await person('E', { managerEmployeeId: managerEmployee.id, basicSalary: 9000 })
  const user = (employee, suffix, role = 'employee', permissions = []) => repo('User').save({ email: `${n}-${suffix}@ot-auto.invalid`,
    displayName: employee.fullName, employeeId: employee.id, branchId: branch.id, passwordHash: 'isolated-test-token-only', role,
    permissions: JSON.stringify(permissions) })
  const owner = await user(emp, 'owner')
  const manager = await user(managerEmployee, 'manager', 'employee', ['requests.view_all'])
  const head = await user(headEmployee, 'head', 'employee', ['requests.view_all'])
  const hr = await user(hrEmployee, 'hr', 'hr_manager', ['requests.view_all', 'attendance.manage', 'attendance.view_all'])
  const saved = await request(admin, 'POST', '/catalogs/shifts', { name: `وردية اعتماد تلقائي ${n}`, startTime: '08:00', endTime: '17:00',
    shiftMode: 'fixed', graceMinutes: 0, flexEnabled: false, flexWindowMinutes: 60, requiredWorkMinutes: 540,
    effectiveFrom: dateAfter(day, -14), changeReason: 'وردية مؤرخة لاختبار الاعتماد التلقائي', ...shift })
  assert.equal(saved.status, 201, JSON.stringify(saved.body))
  const assigned = await request(admin, 'POST', '/attendance/schedule/day', { employeeId: emp.id, date: day, shiftId: saved.body.id })
  assert.equal(assigned.status, 201, JSON.stringify(assigned.body))
  return { n, emp, branch, owner, manager, head, hr, day }
}
// بصمات فعلية ليوم خلص (مش النهارده ولا بعده): 08:00 → 19:35 على وردية 9 ساعات = 155 دقيقة زيادة → 150 بعد التقريب
async function punches(f, clocks = ['08:00', '19:35']) {
  assert.ok(f.day < today, 'البصمات الفعلية لأيام خلصت بس')
  const result = await request(admin, 'POST', '/attendance/punches/manual', { reason: 'بصمات فعلية لاختبار الاعتماد التلقائي',
    punches: clocks.map(time => ({ employeeCode: f.emp.employeeCode, timestamp: new Date(`${f.day}T${time}:00`).toISOString() })) })
  assert.equal(result.status, 201, JSON.stringify(result.body))
}
async function period(actor, body) {
  const response = await request(actor, 'POST', '/attendance/overtime-periods', { fromDate: workDate, toDate: workDate, effect: 'OPEN', ...body })
  assert.equal(response.status, 201, JSON.stringify(response.body))
  return response.body
}
async function reconcile() {
  const response = await request(admin, 'POST', '/requests/engine/reconcile-overtime')
  assert.equal(response.status, 201, JSON.stringify(response.body))
  return response.body
}
const entriesOf = f => repo('OvertimeEntry').find({ where: { employeeId: f.emp.id }, order: { id: 'ASC' } })
const eventsOf = entryId => repo('OvertimeEntryEvent').find({ where: { entryId }, order: { id: 'ASC' } })
const decisionsOf = requestId => repo('RequestApproval').find({ where: { requestId }, order: { id: 'ASC' } })
const decide = (actor, id) => request(actor, 'POST', `/requests/${id}/act`, { action: 'APPROVE', comment: 'مراجعة ساعات الإضافي وأدلتها' })
const COMMENT = name => `اعتماد تلقائي — فترة الإضافي «${name}»`
// الحقول المالية المحسوبة للقيد — لازم تبقى هي هي بين الاعتماد التلقائي واليدوي لنفس الدليل
const money = entry => ({ status: entry.status, approvedMinutes: numeric(entry.approvedMinutes), payableHours: numeric(entry.payableHours),
  hoursActual: numeric(entry.hoursActual), rate: numeric(entry.rate), hourlyRateSnapshot: numeric(entry.hourlyRateSnapshot),
  amountSnapshot: numeric(entry.amountSnapshot), originalPeriod: entry.originalPeriod, deferredFromRunId: entry.deferredFromRunId })
const pricing = approval => ({ approvedMinutes: approval.approvedMinutes, hours: approval.hours, multiplier: approval.multiplier,
  hourlyRate: approval.hourlyRate, amount: approval.amount, wageBase: approval.wageBase, wageBasis: approval.wageBasis,
  wageComponents: approval.wageComponents, monthlyDays: approval.monthlyDays, dailyHours: approval.dailyHours, dayKind: approval.dayKind,
  wagePayrollPeriod: approval.wagePayrollPeriod, evidenceMode: approval.evidenceMode, formula: approval.formula,
  originalPeriod: approval.originalPeriod, deferredFromRunId: approval.deferredFromRunId })
const evidenceNumbers = evidence => ({ workDate: evidence.workDate, dayKind: evidence.dayKind, checkIn: evidence.checkIn, checkOut: evidence.checkOut,
  workedMinutes: evidence.workedMinutes, requiredMinutes: evidence.requiredMinutes, rawMinutes: evidence.rawMinutes,
  detectedMinutes: evidence.detectedMinutes, policy: evidence.policy, open: evidence.window.open, blockers: evidence.blockers })
const EXPECTED_MONEY = { status: 'APPROVED', approvedMinutes: 150, payableHours: 2.5, hoursActual: 2.5, rate: 1.5, hourlyRateSnapshot: 37.5,
  amountSnapshot: 140.62, originalPeriod: workDate.slice(0, 7), deferredFromRunId: null }


// Appended to the disposable in-process overtime fixture by the review builder.

// Independent round19 cases, using the disposable real-SQL scaffold.
test('CR19 marker-only and nested references use real period lookup and preserve snapshots for every scope',async t=>{
  const {collectOvertimeWindowIds,overtimeWindowRedactor}=require('../src/attendance/overtime-window-view')
  const local=await repo('Branch').save({code:'R19L',name:'فرع محلي'}),foreign=await repo('Branch').save({code:'R19F',name:'فرع آخر'})
  const general=await period(admin,{name:'R19-GENERAL',branchId:null,autoApprove:true})
  const own=await period(admin,{name:'R19-LOCAL',branchId:local.id,autoApprove:true})
  const hidden=await period(admin,{name:'R19-HIDDEN',branchId:foreign.id,autoApprove:true})
  const deleted=await period(admin,{name:'R19-DELETED',branchId:foreign.id,autoApprove:true})
  await repo('OvertimePeriod').delete(deleted.id)
  const ids=[general.id,own.id,hidden.id,deleted.id]
  const markerOnly={approval:{autoApproval:{periodIds:ids},amount:140.62,approverId:0}}
  const nested={review:[markerOnly,{approval:{autoApproval:{periodIds:[hidden.id]}}}],evidence:{window:{open:true,reason:'R19-HIDDEN',governingWindowIds:ids}}}
  const before=JSON.stringify([markerOnly,nested]),evidence=[]
  assert.deepEqual([...collectOvertimeWindowIds(markerOnly)],ids)
  for(const [scope,expected] of [[[local.id],[general.id,own.id]],[[local.id,foreign.id],[general.id,own.id,hidden.id]],[[],[general.id]],[null,[general.id,own.id,hidden.id]]]){
    const view=await overtimeWindowRedactor(ds.manager,scope,[markerOnly,nested]),a=view(markerOnly),b=view(nested)
    assert.deepEqual(a.approval.autoApproval.periodIds,expected)
    assert.deepEqual(b.review[0].approval.autoApproval.periodIds,expected)
    assert.deepEqual(b.evidence.window.governingWindowIds,expected)
    assert.deepEqual(b.review[1].approval.autoApproval.periodIds,scope===null||scope.includes(foreign.id)?[hidden.id]:[])
    assert.equal(a.approval.amount,140.62);assert.equal(a.approval.approverId,0)
    if(scope!==null&&!scope.includes(foreign.id))assert.ok(!JSON.stringify(b).includes('R19-HIDDEN'))
    assert.equal(JSON.stringify([markerOnly,nested]),before)
    a.approval.autoApproval.periodIds.push(9999);assert.equal(JSON.stringify([markerOnly,nested]),before)
    evidence.push({scope,visible:expected})
  }
  // No active test-wide periods are left for the following real attendance flow.
  await repo('OvertimePeriod').delete([general.id,own.id,hidden.id])
  t.diagnostic(JSON.stringify({case:'marker-only-and-nested-real-sql',evidence,storedInputUnchanged:true}))
})

test('CR19 real transfer retains only global marker IDs for new branch without losing pending or approved flags or money',async t=>{
  const old=await fixture(),current=await fixture(),hiddenName='R19-FOREIGN-AUTO'
  const viewer=await repo('User').save({email:'r19-branch@review.invalid',displayName:'قارئ الفرع الجديد',passwordHash:'test-only',role:'employee',branchId:current.branch.id,
    permissions:JSON.stringify(['attendance.view_all','attendance.manage','overtime.confirm','payroll.view','requests.view_all','requests.create_on_behalf'])})
  const change=async from=>{
    const r=await request(admin,'GET',`/attendance/calendar-context?scope=EMPLOYEE&sourceId=${old.emp.id}`);assert.equal(r.status,200)
    return {effectiveFrom:from,reason:'نقل مؤرخ مستقل',expectedRevision:r.body.revision,expectedCurrentSourceHash:r.body.currentSourceHash}
  }
  let r=await request(admin,'POST','/attendance/calendar-context/confirm',{scope:'EMPLOYEE',sourceId:old.emp.id,calendarChange:await change(dateAfter(old.day,-20))});assert.equal(r.status,201,JSON.stringify(r.body))
  const globalPeriod=await period(admin,{name:'R19-GLOBAL-AUTO',branchId:null,autoApprove:true})
  const hiddenPeriod=await period(old.hr,{name:hiddenName,branchId:old.branch.id,autoApprove:true})
  await configDuring({'attendance.sync_interval_minutes':LONG_SYNC_INTERVAL},()=>punches(old))
  const [entry]=await entriesOf(old);assert.equal(entry.status,'DETECTED')
  r=await request(admin,'PATCH',`/employees/${old.emp.id}`,{branchId:current.branch.id,departmentId:current.emp.departmentId,managerEmployeeId:null,
    attendanceEffectiveFrom:dateAfter(old.day,1),attendanceChangeReason:'نقل مؤرخ مستقل',calendarChange:await change(dateAfter(old.day,1))});assert.equal(r.status,200,JSON.stringify(r.body))
  const monthRoute=`/attendance/overtime?from=${old.day}&to=${old.day}`
  const month=async actor=>{const response=await request(actor,'GET',monthRoute);assert.equal(response.status,200);const row=response.body.entries.find(x=>x.id===entry.id);assert.ok(row);return row}
  const checkForeignAbsent=value=>{
    assert.ok(!JSON.stringify(value).includes(hiddenName))
    const visit=x=>{if(!x||typeof x!=='object')return
      for(const ids of [x.governingWindowIds,x.autoApproval?.periodIds])if(Array.isArray(ids))assert.ok(!ids.includes(hiddenPeriod.id))
      for(const item of Object.values(x))visit(item)
    };visit(value)
  }
  const detectedSaved=JSON.stringify((await repo('OvertimeEntry').findOneByOrFail({id:entry.id})).calculationSnapshot)
  const waiting=await month(viewer);assert.equal(waiting.autoApprovalPending,true);assert.equal(waiting.autoApproved,false);checkForeignAbsent(waiting)
  assert.equal(JSON.stringify((await repo('OvertimeEntry').findOneByOrFail({id:entry.id})).calculationSnapshot),detectedSaved)
  await requests.dispatchDetectedOvertime([entry.id])
  const approved=await repo('OvertimeEntry').findOneByOrFail({id:entry.id});assert.equal(approved.status,'APPROVED')
  assert.deepEqual([...approved.calculationSnapshot.approval.autoApproval.periodIds].sort((a,b)=>a-b),[globalPeriod.id,hiddenPeriod.id].sort((a,b)=>a-b))
  const saved=JSON.stringify(approved.calculationSnapshot)
  const branchRow=await month(viewer),companyRow=await month(admin)
  assert.deepEqual(branchRow.calculationSnapshot.approval.autoApproval.periodIds,[globalPeriod.id]);checkForeignAbsent(branchRow)
  assert.deepEqual(companyRow.calculationSnapshot.approval.autoApproval.periodIds,approved.calculationSnapshot.approval.autoApproval.periodIds)
  assert.equal(branchRow.autoApproved,true);assert.equal(branchRow.autoApprovalPending,false)
  assert.equal(Number(branchRow.amountSnapshot),140.62);assert.equal(Number(companyRow.amountSnapshot),140.62)
  const detail=await request(viewer,'GET',`/requests/${approved.requestId}`);assert.equal(detail.status,200);checkForeignAbsent(detail.body)
  assert.equal(detail.body.overtime.calculationSnapshot.approval.autoApproved,true)
  assert.equal(JSON.stringify((await repo('OvertimeEntry').findOneByOrFail({id:entry.id})).calculationSnapshot),saved)
  t.diagnostic(JSON.stringify({case:'mixed-marker-live-transfer',branchMarker:branchRow.calculationSnapshot.approval.autoApproval,companyMarker:companyRow.calculationSnapshot.approval.autoApproval,
    pendingBefore:waiting.autoApprovalPending,approvedAfter:branchRow.autoApproved,pendingAfter:branchRow.autoApprovalPending,amount:140.62,storedSnapshotUnchanged:true}))
})
