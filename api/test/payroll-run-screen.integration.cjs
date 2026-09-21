// B5 — الخطوة 22 على قاعدة مؤقتة (HTTP وSQL فعليان): سيناريو المالك «مسيران لفرعين بمعدلات مختلفة» من الأول للآخر،
// وفصل المهام PAYRUN-STATE-003 ورخصة الشركة الصغيرة، وقيد الصرف وأخطاء الحالة PAYRUN-STATE-001، وسجل الأحداث بالأسماء،
// والتعارضات بإجراءات حل، وترتيب تحصيل المالك من نسخة سياسة منشورة، وفترة التكافؤ التشغيلية (الخطوة 23).
// قاعدة مؤقتة عشوائية (hr_run_screen_test_<hex>) تُحذف في النهاية؛ لا اتصال بـhr_system.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_run_screen_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-run-screen-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const policyStart = '2026-05-23', attendanceEnd = '2026-08-22'
const cycle23 = { defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 23, cycleEndMode: 'DERIVED', cycleEndDay: null }
let app, master, ds, base, created = false
let admin, hrA, hrB, hrC, hrS, branchA, branchB, branchC, employeeNumber = 0

function assertDisposable() {
  assert.match(database, /^hr_run_screen_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: null,
    tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]'),
    ...(user.scopeAllBranches === true ? { scopeAllBranches: true } : {}) })
}
// الخطوة 20 (B4): قبل اعتماد مسير يُكتب سبب لكل رمز في تقرير التكافؤ بنفس المستخدم (هذه المجموعة لا تختبر التكافؤ نفسه)
const { writeParityReasonsBeforeApproval } = require('./fixtures/payroll-parity-reasons.cjs')
async function request(user, method, route, body) {
  await writeParityReasonsBeforeApproval(request, user, method, route)
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
function expectStatus(response, status) { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }

async function employee(branch, { salary = 6000, lateOn = null } = {}) {
  const emp = await repo('Employee').save({ employeeCode: `RSC${String(++employeeNumber).padStart(3, '0')}`, fullName: `موظف شاشة المسير ${employeeNumber}`,
    branchId: branch.id, joinDate: '2020-01-01', basicSalary: salary, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0,
    currency: 'SAR', status: 'active', isActive: true, payMethod: 'transfer' })
  // حضور محسوب ثابت لثلاثة أشهر يعزل الاختبار عن سياسة الغياب؛ يوم تأخير واحد عند الطلب.
  const rows = []
  for (let time = Date.parse(`${policyStart}T12:00:00Z`); time <= Date.parse(`${attendanceEnd}T12:00:00Z`); time += 86400000) {
    const date = new Date(time).toISOString().slice(0, 10)
    const late = lateOn && lateOn.date === date ? lateOn.minutes : 0
    rows.push({ employeeId: emp.id, branchId: emp.branchId, date, status: late ? 'late' : 'present', checkIn: '08:00', checkOut: '16:00',
      shiftName: 'وردية اختبار شاشة المسير', shiftStart: '08:00', shiftEnd: '16:00', scheduleSource: 'override', workMinutes: 480, lateMinutes: late, deductibleMinutes: 0, earlyLeaveMinutes: 0 })
  }
  await repo('AttendanceDay').save(rows, { chunk: 100 })
  return emp
}
async function createPolicy(name, branch, settings = {}) {
  return expectStatus(await request(admin, 'POST', '/payroll/policies', { name, branchId: branch.id, effectiveFrom: policyStart, settings: { ...cycle23, ...settings } }), 201)
}
async function publish(created, revision) {
  const [version] = created.versions
  const published = expectStatus(await request(admin, 'POST', `/payroll/policies/${created.policy.id}/versions/${version.id}/publish`,
    { expectedRevision: revision ?? version.revision, reason: 'نشر مجموعة معدلات لاختبار شاشة المسير' }), 200)
  return { policyId: created.policy.id, versionId: published.version.id }
}
const createDraft = async (body, user) => expectStatus(await request(user, 'POST', '/payroll/runs', body), 201)
const calculate = async (run, user, body = {}) => expectStatus(await request(user, 'POST', `/payroll/runs/${run.id}/calculate`, body), 201)
const detail = async (run, user = admin) => expectStatus(await request(user, 'GET', `/payroll/runs/${run.id}`), 200)
async function acknowledge(run, user) {
  const report = expectStatus(await request(user, 'GET', `/payroll/runs/${run.id}/unassigned`), 200)
  return expectStatus(await request(user, 'POST', `/payroll/runs/${run.id}/unassigned-ack`, { reportHash: report.reportHash }), 201)
}
const itemOf = (run, emp) => { const row = run.items.find(item => item.employeeId === emp.id); assert.ok(row, `missing item for ${emp.employeeCode}`); return row }

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  branchA = await repo('Branch').save({ code: 'RSC_A', name: 'فرع القاهرة' })
  branchB = await repo('Branch').save({ code: 'RSC_B', name: 'فرع الجيزة' })
  branchC = await repo('Branch').save({ code: 'RSC_C', name: 'فرع الإسكندرية' })
  const user = (email, displayName, role, branchId, permissions, extra = {}) => repo('User').save({ email: `${email}@run-screen-test.invalid`, displayName,
    passwordHash: 'test-only', role, branchId, permissions: JSON.stringify(permissions), ...extra })
  const payrollDesk = ['payroll.view', 'payroll.calculate', 'payroll.approve', 'payroll.pay', 'payroll.cancel']
  admin = await user('admin', 'مدير النظام', 'super_admin', null, [])
  hrA = await user('hr-a', 'هالة — فرع القاهرة', 'hr_manager', branchA.id, payrollDesk)
  hrB = await user('hr-b', 'باسم — فرع الجيزة', 'hr_manager', branchB.id, payrollDesk)
  hrC = await user('hr-c', 'كريمة — فرع الإسكندرية', 'hr_manager', branchC.id, payrollDesk)
  // ملف المراجعة: يحتسب ويعتمد ويملك الإعدادات — لا يفعّل رخصة الشركة الصغيرة لنفسه.
  // إعدادات الشركة كلها بقت لحساب على مستوى الشركة (عزل الفروع: assertCompanyWideWrite)، فالحساب ده «نطاقه: كل الفروع»
  // عشان يوصل لفحص الرخصة نفسه؛ حساب الفرع بيترفض قبلها بحارس عزل الفروع (مغطى في اختبارات الإعدادات).
  hrS = await user('hr-s', 'سامية — إعدادات الشركة', 'hr_manager', branchA.id, [...payrollDesk, 'settings.manage'], { scopeAllBranches: true })
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '23' }, { key: 'payroll.monthly_days', value: '30' }, { key: 'payroll.daily_hours', value: '8' },
    { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' }, { key: 'payroll.late_deduction_enabled', value: 'true' },
    { key: 'attendance.absence_penalty_days', value: '1' }, { key: 'attendance.weekend_days', value: 'FRI,SAT' },
  ])
  // رخصة الشركة الصغيرة مبذورة مقفلة عند الإقلاع (configSeed)
  assert.equal((await repo('RequestsConfig').findOneByOrFail({ key: 'payroll.approval_self_approval_allowed' })).value, 'false')
}, { timeout: 120000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assertDisposable()
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const remaining = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(remaining.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try { assert.match(path.basename(uploads), /^hr-run-screen-files-/); fs.rmSync(uploads, { recursive: true, force: true }) } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Run screen fixture cleanup failed')
})

test('Owner scenario: two runs for two branches with different rate sets, end to end (draft, real numbers, separation of duties, approval, pay record, events, parity period)', async () => {
  const period = '2026-08'
  const policyA = await publish(await createPolicy('مجموعة القاهرة — 8 ساعات', branchA, { dailyHours: 8 }))
  const policyB = await publish(await createPolicy('مجموعة الجيزة — 10 ساعات وأرضية 50%', branchB, { dailyHours: 10, netFloorPct: 50 }))
  const a1 = await employee(branchA, { salary: 6000, lateOn: { date: '2026-08-03', minutes: 30 } }), a2 = await employee(branchA, { salary: 6000 })
  const b1 = await employee(branchB, { salary: 9000, lateOn: { date: '2026-08-03', minutes: 30 } }), b2 = await employee(branchB, { salary: 9000 })

  // مسير لكل فرع مربوط بمجموعته، والفترة من دورة المجموعة
  let runA = await createDraft({ name: 'مسير القاهرة — أغسطس', policyVersionId: policyA.versionId, period, filters: { branchIds: [branchA.id] } }, hrA)
  let runB = await createDraft({ name: 'مسير الجيزة — أغسطس', policyVersionId: policyB.versionId, period, filters: { branchIds: [branchB.id] } }, admin)
  assert.deepEqual([runA.startDate, runA.endDate, runB.startDate, runB.endDate], ['2026-07-23', '2026-08-22', '2026-07-23', '2026-08-22'])
  runA = await calculate(runA, hrA)
  runB = await calculate(runB, admin)

  // أرقام حقيقية بمعدلات كل مجموعة: سعر الساعة = الأجر ÷ 30 ÷ ساعات اليوم، و30 دقيقة تأخير بسعر الدقيقة
  const itemA1 = itemOf(runA, a1), itemB1 = itemOf(runB, b1)
  assert.deepEqual([Number(itemA1.basicSalary), JSON.parse(itemA1.breakdown).hourRate, Number(itemA1.latenessDeduction), Number(itemA1.netPay)], [6000, 25, 12.5, 5987.5])
  // 9000 ÷ 30 ÷ 10 ساعات = 30 للساعة و0.50 للدقيقة → 30 دقيقة = 15.00 (مقابل 12.50 في مجموعة الثماني ساعات)
  assert.deepEqual([Number(itemB1.basicSalary), JSON.parse(itemB1.breakdown).hourRate, Number(itemB1.latenessDeduction), Number(itemB1.netPay)], [9000, 30, 15, 8985])
  assert.deepEqual([Number(itemOf(runA, a2).netPay), Number(itemOf(runB, b2).netPay)], [6000, 9000])
  assert.equal(Number(runA.totalNet), 11987.5); assert.equal(Number(runB.totalNet), 17985)
  const coverage = JSON.parse(itemA1.breakdown)
  assert.deepEqual([coverage.coverFrom, coverage.coverTo, coverage.coverDays, coverage.prorataFactor, coverage.monthlyDays], ['2026-07-23', '2026-08-22', 31, 1, 30])
  const snapshotA = expectStatus(await request(hrA, 'GET', `/payroll/runs/${runA.id}/policy-snapshot`), 200).stored
  const snapshotB = expectStatus(await request(admin, 'GET', `/payroll/runs/${runB.id}/policy-snapshot`), 200).stored
  assert.deepEqual([snapshotA.values.dailyHours, snapshotA.values.netFloorPct, snapshotA.policy.versionId], [8, null, policyA.versionId])
  assert.deepEqual([snapshotB.values.dailyHours, snapshotB.values.netFloorPct, snapshotB.sources.netFloorPct.kind, snapshotB.policy.versionId], [10, '50', 'POLICY_VERSION', policyB.versionId])

  // شاشة المسير: من احتسب، وفصل المهام للمستخدم الحالي، وترتيب التحصيل المطبق
  const viewA = await detail(runA, hrA)
  assert.deepEqual([viewA.actors.calculated.id, viewA.actors.calculated.name, viewA.calculatedBy], [hrA.id, 'هالة — فرع القاهرة', hrA.id])
  assert.equal(viewA.approvalGuard.blocked.code, 'PAYRUN-STATE-003')
  assert.equal((await detail(runA, admin)).approvalGuard.blocked, null)
  assert.deepEqual([viewA.collection.source, viewA.collection.effectiveOrder], ['DEFAULT', ['ATTENDANCE', 'RECOVERY', 'TYPED', 'ADMINISTRATIVE', 'LOAN']])
  assert.deepEqual(JSON.parse(itemA1.breakdown).collection, { source: 'DEFAULT', versionId: policyA.versionId, order: ['ATTENDANCE', 'RECOVERY', 'TYPED', 'ADMINISTRATIVE', 'LOAN'], ownerOrder: false, loanSlot: null })

  // الصرف قبل الاعتماد ← PAYRUN-STATE-001 بالحالة والحالات المتاحة
  const early = expectStatus(await request(hrA, 'POST', `/payroll/runs/${runA.id}/pay`, { channel: 'BANK_TRANSFER', reference: 'TRX-EARLY' }), 400)
  assert.deepEqual([early.code, early.currentStatus, early.allowedStatuses], ['PAYRUN-STATE-001', 'CALCULATED', ['APPROVED']])
  assert.match(early.message, /«صرف المسير» والمسير في حالة «محسوب»/)

  // من احتسب لا يعتمد (PAYRUN-STATE-003)؛ مستخدم آخر يعتمد بعد إقراره بتقرير «بلا مسير»
  const selfApproval = expectStatus(await request(hrA, 'POST', `/payroll/runs/${runA.id}/approve`), 403)
  assert.equal(selfApproval.code, 'PAYRUN-STATE-003'); assert.equal(selfApproval.calculatedBy, hrA.id)
  assert.equal((await detail(runA)).status, 'CALCULATED')
  await acknowledge(runA, admin)
  runA = expectStatus(await request(admin, 'POST', `/payroll/runs/${runA.id}/approve`), 201)
  assert.deepEqual([runA.status, runA.approvedBy], ['APPROVED', admin.id])

  // قيد الصرف: القناة والمرجع مطلوبان، ومن صرف يُسجل
  assert.equal(expectStatus(await request(hrA, 'POST', `/payroll/runs/${runA.id}/pay`), 400).code, 'PAYRUN-PAY-CHANNEL')
  assert.equal(expectStatus(await request(hrA, 'POST', `/payroll/runs/${runA.id}/pay`, { channel: 'BANK_TRANSFER', reference: '12' }), 400).code, 'PAYRUN-PAY-REFERENCE')
  assert.equal((await detail(runA)).status, 'APPROVED', 'a refused pay record writes nothing')
  expectStatus(await request(hrA, 'POST', `/payroll/runs/${runA.id}/pay`, { channel: 'BANK_TRANSFER', reference: '  TRX-2026-08-CAIRO ' }), 201)
  const paid = await detail(runA, hrA)
  assert.deepEqual([paid.status, paid.paidBy, paid.payChannel, paid.payReference], ['PAID', hrA.id, 'BANK_TRANSFER', 'TRX-2026-08-CAIRO'])
  assert.deepEqual([paid.payRecord.paidBy.name, paid.payRecord.channelLabel, paid.payRecord.reference], ['هالة — فرع القاهرة', 'تحويل بنكي', 'TRX-2026-08-CAIRO'])
  assert.deepEqual([paid.actors.approved.name, paid.actors.paid.name], ['مدير النظام', 'هالة — فرع القاهرة'])
  const again = expectStatus(await request(hrA, 'POST', `/payroll/runs/${runA.id}/pay`, { channel: 'CASH', reference: 'محضر 2' }), 400)
  assert.deepEqual([again.code, again.currentStatus], ['PAYRUN-STATE-001', 'PAID'])
  assert.deepEqual([expectStatus(await request(admin, 'POST', `/payroll/runs/${runA.id}/approve`), 400).code], ['PAYRUN-STATE-001'])
  assert.equal(expectStatus(await request(hrA, 'POST', `/payroll/runs/${runA.id}/member-exclusions`, { employeeId: a2.id, reason: 'بعد الصرف' }), 400).code, 'PAYRUN-STATE-001')
  // تصحيح المراجعة: مسير خارج النطاق ← 403 قبل الحالة والسبب (لا تُكشف حالته PAID)، ومسير غير موجود ← 404 قبل فحص السبب
  const outOfScope = expectStatus(await request(hrB, 'POST', `/payroll/runs/${runA.id}/member-exclusions`, { employeeId: a2.id, reason: 'x' }), 403)
  assert.equal(outOfScope.currentStatus, undefined); assert.doesNotMatch(JSON.stringify(outOfScope), /PAID|PAYRUN-STATE|PAYRUN-EXCLUSION-REASON/)
  expectStatus(await request(hrA, 'POST', '/payroll/runs/987654/member-exclusions', { employeeId: a2.id, reason: '' }), 404)

  // سجل المسير: من فعل ماذا ومتى بالاسم
  const events = expectStatus(await request(hrA, 'GET', `/payroll/runs/${runA.id}/events`), 200)
  const byType = type => events.filter(event => event.eventType === type).at(-1)
  assert.deepEqual(['DRAFT_CREATED', 'CALCULATED', 'UNASSIGNED_ACKNOWLEDGED', 'APPROVED', 'PAID'].map(type => byType(type)?.actorName),
    ['هالة — فرع القاهرة', 'هالة — فرع القاهرة', 'مدير النظام', 'مدير النظام', 'هالة — فرع القاهرة'])
  assert.deepEqual([byType('APPROVED').payload.calculatedBy, byType('APPROVED').payload.smallCompanyException, typeof byType('APPROVED').payload.parityReportHash],
    [hrA.id, false, 'string'])
  assert.deepEqual([byType('PAID').payload.paidBy, byType('PAID').payload.channel, byType('PAID').payload.reference], [hrA.id, 'BANK_TRANSFER', 'TRX-2026-08-CAIRO'])
  assert.deepEqual(byType('CALCULATED').payload.collection, { source: 'DEFAULT', order: ['ATTENDANCE', 'RECOVERY', 'TYPED', 'ADMINISTRATIVE', 'LOAN'], versionId: policyA.versionId })
  // تصحيح المراجعة: وقت الحدث في لوحة الأحداث = وقت المنفّذ في سطر «احتسبه/اعتمده/صرفه» للإجراء نفسه (لا فرق ساعات UTC/محلي)
  for (const [type, at] of [['CALCULATED', paid.actors.calculated.at], ['APPROVED', paid.actors.approved.at], ['PAID', paid.actors.paid.at]]) {
    assert.ok(Math.abs(Date.parse(byType(type).createdAt) - Date.parse(at)) < 5000, `${type}: event ${byType(type).createdAt} vs actor ${at}`)
  }

  // مسير الجيزة: المحتسب نفسه مرفوض، ثم رخصة الشركة الصغيرة المفعّلة صراحةً تسمح له ويُسجل استخدامها
  assert.equal(expectStatus(await request(admin, 'POST', `/payroll/runs/${runB.id}/approve`), 403).code, 'PAYRUN-STATE-003')
  await acknowledge(runB, admin)
  // تصحيح المراجعة: حامل الاحتساب والاعتماد والإعدادات لا يفعّل الرخصة لنفسه؛ صلاحيتها المستقلة لمدير النظام فقط
  const licenceKey = 'payroll.approval_self_approval_allowed'
  const licenceRefused = expectStatus(await request(hrS, 'PATCH', '/settings/config', { key: licenceKey, value: 'true' }), 403)
  assert.equal(licenceRefused.code, 'PAYRUN-SOD-LICENCE-PERMISSION')
  assert.equal((await repo('RequestsConfig').findOneByOrFail({ key: licenceKey })).value, 'false', 'a refused licence change writes nothing')
  expectStatus(await request(hrS, 'PATCH', '/settings/config', { key: 'payroll.daily_hours', value: '8' }), 200)
  expectStatus(await request(admin, 'PATCH', '/settings/config', { key: licenceKey, value: 'true' }), 200)
  try {
    assert.equal((await detail(runB)).approvalGuard.blocked, null)
    runB = expectStatus(await request(admin, 'POST', `/payroll/runs/${runB.id}/approve`), 201)
  } finally { expectStatus(await request(admin, 'PATCH', '/settings/config', { key: licenceKey, value: 'false' }), 200) }
  assert.equal((await repo('RequestsConfig').findOneByOrFail({ key: licenceKey })).value, 'false')
  const approvedB = expectStatus(await request(admin, 'GET', `/payroll/runs/${runB.id}/events`), 200).filter(event => event.eventType === 'APPROVED').at(-1)
  assert.deepEqual([approvedB.payload.calculatedBy, approvedB.payload.smallCompanyException, approvedB.payload.selfApprovalSetting], [admin.id, true, true])
  // مستخدم الفرع لا يرى مسير فرع آخر
  expectStatus(await request(hrA, 'GET', `/payroll/runs/${runB.id}`), 403)
  expectStatus(await request(hrB, 'GET', `/payroll/runs/${runB.id}`), 200)

  // الخطوة 23 (تصحيح المراجعة): الشهر لا يُحتسب ما دام في الشهر نفسه مسير آخر معتمد غير مصروف (مسير الجيزة)، ولو صُرف مسير القاهرة SHADOW بتقرير موقّع
  let operations = expectStatus(await request(admin, 'GET', '/payroll/parity-history'), 200)
  assert.deepEqual([operations.months, operations.stage, operations.countedPeriods, operations.scope], [0, 'BASELINE', [], 'COMPANY'])
  assert.deepEqual(operations.periods, [{ period, counted: false, runIds: [runA.id, runB.id], blockers: [{ runId: runB.id, reason: 'معتمد ولم يُصرف بعد' }] }])
  assert.deepEqual(operations.runs.map(row => [row.runId, row.counted, row.notCountedReason]),
    [[runA.id, false, `الشهر ${period} غير مكتمل: المسير #${runB.id} معتمد ولم يُصرف بعد`], [runB.id, false, 'معتمد ولم يُصرف بعد']])
  assert.equal(operations.runs[0].approvedByName, 'مدير النظام')
  const scoped = expectStatus(await request(hrB, 'GET', '/payroll/parity-history'), 200)
  assert.deepEqual([scoped.runs.map(row => row.runId), scoped.scope], [[runB.id], 'BRANCH'], 'a branch user sees only runs in its scope')
  assert.match(scoped.message, /داخل نطاق فرعك/)
  // بعد صرف مسير الجيزة يكتمل الشهر بمسيريه
  expectStatus(await request(hrB, 'POST', `/payroll/runs/${runB.id}/pay`, { channel: 'CASH', reference: 'محضر-الجيزة-08' }), 201)
  operations = expectStatus(await request(admin, 'GET', '/payroll/parity-history'), 200)
  assert.deepEqual([operations.months, operations.countedPeriods, operations.runs.map(row => row.counted)], [1, [period], [true, true]])

  // مسير تجريبي: حامل الاعتماد في نطاقه يعلّمه بسبب مكتوب فلا يُحتسب ولا يحجب شهره؛ خارج النطاق 403؛ السبب إلزامي؛ والحدث مسجل بالاسم
  expectStatus(await request(hrA, 'POST', `/payroll/runs/${runB.id}/parity-counting`, { counts: false, reason: 'تشغيل تجريبي' }), 403)
  assert.equal(expectStatus(await request(hrB, 'POST', `/payroll/runs/${runB.id}/parity-counting`, { counts: false, reason: 'x' }), 400).code, 'PAYRUN-PARITY-COUNTING-REASON')
  const branchView = expectStatus(await request(hrB, 'POST', `/payroll/runs/${runB.id}/parity-counting`, { counts: false, reason: 'مسير تجريبي قبل التشغيل الحي' }), 201)
  assert.deepEqual([branchView.months, branchView.excludedRuns, branchView.runs[0].excluded.reason], [0, 1, 'مسير تجريبي قبل التشغيل الحي'])
  const company = expectStatus(await request(admin, 'GET', '/payroll/parity-history'), 200)
  assert.deepEqual([company.months, company.countedPeriods, company.excludedRuns, company.periods[0].runIds], [1, [period], 1, [runA.id]])
  assert.deepEqual([company.runs[1].counted, company.runs[1].excluded.byName, company.runs[1].notCountedReason], [false, 'باسم — فرع الجيزة', 'مسير تجريبي لا يُحتسب: مسير تجريبي قبل التشغيل الحي'])
  assert.equal((await detail(runB, hrB)).parityExcludedBy, hrB.id)
  assert.equal(expectStatus(await request(hrB, 'POST', `/payroll/runs/${runB.id}/parity-counting`, { counts: false, reason: 'مرة ثانية' }), 400).code, 'PAYRUN-PARITY-COUNTING-UNCHANGED')
  const countingEvent = expectStatus(await request(hrB, 'GET', `/payroll/runs/${runB.id}/events`), 200).at(-1)
  assert.deepEqual([countingEvent.eventType, countingEvent.actorName, countingEvent.reason, countingEvent.payload.counts], ['PARITY_COUNTING_CHANGED', 'باسم — فرع الجيزة', 'مسير تجريبي قبل التشغيل الحي', false])
  expectStatus(await request(hrB, 'POST', `/payroll/runs/${runB.id}/parity-counting`, { counts: true, reason: 'تصحيح: المسير حقيقي' }), 201)
  operations = expectStatus(await request(admin, 'GET', '/payroll/parity-history'), 200)
  assert.deepEqual([operations.months, operations.excludedRuns, operations.periods[0].runIds], [1, 0, [runA.id, runB.id]])
})

test('Conflicts screen actions: excluding the employee from a calculated run recalculates it with the written exclusion; a draft keeps the exclusion in its definition', async () => {
  const period = '2026-06'
  const policy = await publish(await createPolicy('مجموعة تعارضات القاهرة', branchA, { dailyHours: 8 }))
  const e1 = await employee(branchA), e2 = await employee(branchA)
  const scope = { branchIds: [branchA.id], employeeIds: [e1.id, e2.id] }
  let runC = await calculate(await createDraft({ name: 'مسير يونيو — الأول', policyVersionId: policy.versionId, period, filters: scope }, hrA), hrA)
  const runD = await createDraft({ name: 'مسير يونيو — الثاني', policyVersionId: policy.versionId, period, filters: { branchIds: [branchA.id], employeeIds: [e1.id] } }, hrA)
  const conflict = expectStatus(await request(hrA, 'POST', `/payroll/runs/${runD.id}/calculate`, {}), 409)
  assert.equal(conflict.code, 'PAYRUN-DRAFT-CONFLICT')
  assert.deepEqual(conflict.conflicts.map(row => [row.employeeId, row.otherRunId]), [[e1.id, runC.id]])

  assert.equal(expectStatus(await request(hrA, 'POST', `/payroll/runs/${runC.id}/member-exclusions`, { employeeId: e1.id, reason: 'ok' }), 400).code, 'PAYRUN-EXCLUSION-REASON')
  runC = expectStatus(await request(hrA, 'POST', `/payroll/runs/${runC.id}/member-exclusions`, { employeeId: e1.id, reason: 'يُصرف في مسير يونيو الثاني' }), 201)
  assert.deepEqual([runC.status, runC.snapshotVersion, runC.items.map(item => item.employeeId)], ['CALCULATED', 2, [e2.id]])
  const excluded = runC.members.find(member => member.employeeId === e1.id)
  assert.deepEqual([excluded.membershipStatus, excluded.exclusionReason], ['EXCLUDED', 'EXC_MANUAL_EXCLUSION'])
  assert.deepEqual(runC.selection.exclusions.map(row => [row.employeeId, row.reason, row.byUserId]), [[e1.id, 'يُصرف في مسير يونيو الثاني', hrA.id]])
  const recalculated = expectStatus(await request(hrA, 'GET', `/payroll/runs/${runC.id}/events`), 200).at(-1)
  assert.deepEqual([recalculated.eventType, recalculated.reason, recalculated.payload.exclusionsAdded.map(row => row.employeeId), recalculated.payload.diff.removedEmployeeIds],
    ['RECALCULATED', `استبعاد الموظف رقم ${e1.id} من المسير: يُصرف في مسير يونيو الثاني`, [e1.id], [e1.id]])
  assert.equal(expectStatus(await request(hrA, 'POST', `/payroll/runs/${runC.id}/member-exclusions`, { employeeId: e1.id, reason: 'مرة ثانية' }), 400).code, 'PAYRUN-EXCLUSION-DUPLICATE')
  // التعارض زال: المسير الثاني يُحتسب
  assert.deepEqual((await calculate(runD, hrA)).items.map(item => item.employeeId), [e1.id])

  // المسودة: الاستبعاد يُلحق بتعريفها تحت القفل ولا يُحتسب شيء
  const draft = await createDraft({ name: 'مسير يوليو — مسودة', policyVersionId: policy.versionId, period: '2026-07', filters: scope }, hrA)
  const updated = expectStatus(await request(hrA, 'POST', `/payroll/runs/${draft.id}/member-exclusions`, { employeeId: e2.id, reason: 'في إجازة بلا أجر طويلة' }), 201)
  assert.deepEqual([updated.status, updated.selection.exclusions.map(row => [row.employeeId, row.reason])], ['DRAFT', [[e2.id, 'في إجازة بلا أجر طويلة']]])
  assert.equal(expectStatus(await request(hrA, 'POST', `/payroll/runs/${draft.id}/member-exclusions`, { employeeId: e2.id, reason: 'تكرار' }), 400).code, 'PAYRUN-EXCLUSION-DUPLICATE')
  // مستخدم فرع آخر لا يستبعد من مسير خارج فرعه
  expectStatus(await request(hrB, 'POST', `/payroll/runs/${draft.id}/member-exclusions`, { employeeId: e1.id, reason: 'خارج النطاق' }), 403)
})

test('Owner collection order from a published version: loans first, then recoveries, attendance last under a 5% cap; approval verifies the plan on the loan slot and the run is paid', async () => {
  const period = '2026-08'
  const { legacyEquivalentPayrollDefinition } = require('../src/payroll/payroll-policy-engine-run')
  const definition = legacyEquivalentPayrollDefinition()
  const lateness = definition.components.find(row => row.code === 'LATENESS_DED')
  definition.components.push({ ...lateness, code: 'RECOVERY_DED', nameAr: 'استرداد العهد', sequence: 24 },
    { ...lateness, code: 'LOAN_DED', nameAr: 'قسط السلفة', stage: 5, sequence: 30, valueSource: 'LEDGER', ledgerCategory: 'loan', ledgerDirection: 'DEBIT',
      ledgerPartialPayment: 'ALLOW_PARTIAL', carryOverEligible: true, exemptible: false })
  const created = await createPolicy('مجموعة الإسكندرية — السلف أولًا', branchC, { dailyHours: 8, maxDeductionPctOfGross: 5 })
  const route = `/payroll/policies/${created.policy.id}/versions/${created.versions[0].id}`
  const check = expectStatus(await request(admin, 'POST', `${route}/definition/validate`, { definition, autoOrder: false }), 200)
  assert.equal(check.valid, true, JSON.stringify(check))
  const saved = expectStatus(await request(admin, 'PATCH', `${route}/definition`, { expectedRevision: created.versions[0].revision, reason: 'بنود ترتيب التحصيل لاختبار المسير',
    definition, acknowledgedWarnings: check.requiredAcknowledgements }), 200)
  const collection = { schemaVersion: 'SRS_COLLECTION_V1_20260913', classifications: [
    { componentCode: 'LATENESS_DED', kind: 'ATTENDANCE' }, { componentCode: 'SHORTFALL_DED', kind: 'ATTENDANCE' }, { componentCode: 'ABSENCE_DED', kind: 'ATTENDANCE' },
    { componentCode: 'UNPAID_LEAVE_DED', kind: 'UNPAID_NON_ENTITLEMENT' }, { componentCode: 'RECOVERY_DED', kind: 'RECOVERY' }, { componentCode: 'LOAN_DED', kind: 'LOAN' },
  ], collectionOrder: ['LOAN_DED', 'RECOVERY_DED', 'LATENESS_DED', 'SHORTFALL_DED', 'ABSENCE_DED'] }
  const withCollection = expectStatus(await request(admin, 'PATCH', `${route}/collection`, { expectedRevision: saved.revision, reason: 'ترتيب المالك: السلف ثم الاستردادات ثم الحضور', collection }), 200)
  const policy = await publish(created, withCollection.revision)

  const emp = await employee(branchC, { salary: 6000, lateOn: { date: '2026-08-03', minutes: 30 } })
  const loan = await repo('Loan').save({ employeeId: emp.id, amount: 250, status: 'DISBURSED', disbursedAt: new Date('2026-07-01T08:00:00Z') })
  await repo('LoanInstallment').save({ loanId: loan.id, dueDate: '2026-08-01', amount: 250, paid: false })
  await repo('EmployeeObligation').save({ employeeId: emp.id, type: 'DEBIT', category: 'custody_shortfall', amount: 200, label: 'عهدة مفقودة لاختبار ترتيب التحصيل', status: 'PENDING', effectiveDate: '2026-08-01' })

  let run = await calculate(await createDraft({ name: 'مسير الإسكندرية — أغسطس', policyVersionId: policy.versionId, period, filters: { branchIds: [branchC.id] } }, admin), admin)
  const item = itemOf(run, emp)
  // سقف 5% من 6000 = 300: القسط 250 كاملًا، ثم الاسترداد 50 من 200 (يُرحّل 150)، ثم التأخير 12.50 يسقط
  assert.deepEqual([Number(item.loanInstallments), Number(item.otherDeductions), Number(item.latenessDeduction), Number(item.netPay)], [250, 50, 0, 5700])
  const breakdown = JSON.parse(item.breakdown)
  assert.deepEqual(breakdown.collection, { source: 'POLICY_VERSION', versionId: policy.versionId, order: ['LOAN', 'RECOVERY', 'TYPED', 'ADMINISTRATIVE', 'ATTENDANCE'],
    ownerOrder: true, loanSlot: { netBeforeLoans: 6000, capConsumed: 0 } })
  assert.deepEqual([breakdown.installmentPlan.context.netBeforeLoans, breakdown.installmentPlan.context.capConsumed], ['6000.00', '0.00'])
  assert.deepEqual(breakdown.netProtection.collectionOrder, ['LOAN', 'RECOVERY', 'TYPED', 'ADMINISTRATIVE', 'ATTENDANCE'])
  assert.deepEqual(breakdown.netProtection.attendanceDropped, { shortfall: '0.00', lateness: '12.50', absence: '0.00' })
  const view = await detail(run)
  assert.deepEqual([view.collection.source, view.collection.loanBeforeOthers, view.collection.componentOrder], ['POLICY_VERSION', true, collection.collectionOrder])

  await acknowledge(run, hrC)
  run = expectStatus(await request(hrC, 'POST', `/payroll/runs/${run.id}/approve`), 201)
  assert.equal(run.status, 'APPROVED')
  expectStatus(await request(hrC, 'POST', `/payroll/runs/${run.id}/pay`, { channel: 'CASH', reference: 'محضر تسليم 17' }), 201)
  const obligations = await repo('EmployeeObligation').find({ where: { employeeId: emp.id }, order: { id: 'ASC' } })
  assert.deepEqual(obligations.map(row => [row.status, Number(row.amount)]).sort(), [['APPLIED', 200], ['PENDING', 150]].sort())
})
