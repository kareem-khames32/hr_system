'use strict'
// تسريبات رد قسيمة الموظف (الدفعة B0.1s — من جرد المسارات) على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر
// (hr_payslip_leaks_test_<16 hex>)، عبر HTTP بتوكنات موقّعة محليًا ومن غير كلمات مرور:
//  LK-01) GET /payroll/my-payslips: كان بيرجّع صف المسير كله — تقرير التكافؤ (أرقام كل موظف في المسير) ولقطة السياسة وصافي
//         المسير وتعريفه. دلوقتي بيرجّع بيانات المسير اللي القسيمة بتعرضها بس، وأرقام الزميل مش في الرد خالص.
//  LK-02) GET /payroll/items/:id لصاحب القسيمة من غير صلاحية رواتب: نفس البيانات المحدودة. وقارئ الرواتب في نطاقه لسه بياخد
//         بيانات المسير زي ما كانت (من غير اللقطة والتقرير)، وقارئ رواتب صاحب قسيمة برّه نطاقه بياخد المحدودة.
//  LK-03) بعد الصرف: مرجع الصرف وقناته باقيين في قسيمة الموظف (الشاشة بتعرضهم له)، ومين صرف مش في الرد.
//         ورد الاعتماد والصرف نفسه من غير لقطة السياسة وتقرير التكافؤ.
//  LK-04) مسير فيه فرعين: قارئ رواتب فرع واحد بياخد قسيمة موظف فرعه ببيانات القسيمة بس (المسير كله برّه نطاقه)،
//         وقارئ الرواتب على مستوى الشركة بياخد بيانات المسير زي ما هي.
//  LK-05) GET /reports/payroll (لوحة التقارير) وآخر المسيرات في GET /dashboard/stats: لقارئ الرواتب بس.
//  LK-06) تقرير حوكمة الإعفاءات: صافي المسير المحفوظ لقارئ الشركة بس، والمكافآت بموظفي نطاق القارئ.
//  LK-07) (CR23-B02) إعادة فتح المسير وإلغاؤه بصلاحية العملية من غير «عرض مسيرات الرواتب»: العملية بتتنفذ، والرد حالة المسير بس
//         من غير بنود ولا أعضاء ولا أسماء ولا مبالغ. بيلغي المسير متعدد الفروع، فأي اختبار بعده مابيستخدمهوش.
//  LK-08) (CR24-B02) «ضم موظفين للمسير» (المفرد والمختلط) بصلاحية الحساب من غير «عرض مسيرات الرواتب»: العضوية بتتغير، والحقل run
//         حالة المسير بس. وموظف فرع تاني أو رقم مش موجود بيتخطوا برد واحد من غير اسم ولا كود. قارئ الرواتب بياخد تفاصيل المسير زي GET.
//  LK-09) معاينة عضوية المسير المحفوظ بصلاحية الحساب من غير عرض الرواتب: الأسماء والتغطية من غير راتب الشهر ولا المستحق ولا البصمة.
// Run (من api/): node --test test/payroll-response-leaks.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const { writeParityReasonsBeforeApproval } = require('./fixtures/payroll-parity-reasons.cjs')

const database = `hr_payslip_leaks_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_payslip_leaks_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payslip-leaks-uploads-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const period = '2026-07', startDate = '2026-06-23', endDate = '2026-07-22'
let app, ds, master, base, created = false
const B = {}, E = {}, U = {}
let run, mineItem, colleagueItem
// مسير تاني فيه موظف من كل فرع، ورد اعتماد المسير الأول
let run2, nearItem, farItem, approveResponse
// مسير تالت محسوب (مش معتمد) لعمليات العضوية والمعاينة
let run3

function assertDisposable() {
  assert.match(database, migrate.DISPOSABLE_DATABASE); assert.match(database, NAME)
  assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system')
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
async function request(user, method, route, body) {
  await writeParityReasonsBeforeApproval(request, user, method, route)
  const token = jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    tokenVersion: 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]'),
    // حساب «كل الفروع» (مش مدير نظام): النطاق في التوكن زي ما تسجيل الدخول بيكتبه، وJwtStrategy بيطابقه مع صف المستخدم
    ...(user.scopeAllBranches ? { scopeAllBranches: true } : {}) })
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const ok = (response, status = 200) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
function dates(from, to) {
  const result = []
  for (let time = Date.parse(`${from}T12:00:00Z`); time <= Date.parse(`${to}T12:00:00Z`); time += 86400000) result.push(new Date(time).toISOString().slice(0, 10))
  return result
}
const attendance = emp => repo('AttendanceDay').save(dates(startDate, endDate).map(date => ({ employeeId: emp.id, branchId: emp.branchId, date, status: 'present',
  checkIn: '08:00', checkOut: '16:00', shiftName: 'وردية اختبار', shiftStart: '08:00', shiftEnd: '16:00', scheduleSource: 'override',
  lateMinutes: 0, deductibleMinutes: 0, earlyLeaveMinutes: 0, workMinutes: 480 })))

// اللي القسيمة بتعرضه من المسير — ولا مفتاح زيادة
const SAFE_RUN_KEYS = ['branchId', 'correctionReason', 'endDate', 'id', 'name', 'paidAt', 'parentRunId', 'payChannel', 'payReference', 'period', 'runType', 'startDate', 'status']
// اللي ماينفعش يوصل لصاحب القسيمة: أرقام المسير كله وتعريفه ومين عمل إيه
const FORBIDDEN_RUN_KEYS = ['parityReport', 'policySnapshot', 'policySnapshotHash', 'totalNet', 'definition', 'employeeIds', 'scopeIds', 'scopeType',
  'approvedBy', 'paidBy', 'calculatedBy', 'policyId', 'policyVersionId', 'engineMode', 'parityExcludedReason', 'snapshotVersion']
// راتب الزميل رقم مميز مايتلخبطش مع أي رقم تاني في الرد
const COLLEAGUE_SALARY = 17341.37, MY_SALARY = 6000
// موظف الفرع التاني في المسير متعدد الفروع: راتبه ومكافأته أرقام مميزة برضه
const FAR_SALARY = 8123.45, FAR_BONUS = 4321.09
const mentionsColleague = body => { const text = JSON.stringify(body); return text.includes('17341') || text.includes(`"employeeId":${E.colleague.id}`) }
// مسير العضوية: رواتب مميزة لأعضائه وللموظف اللي بينضم ولموظف الفرع التاني
const M1_SALARY = 9111.11, M2_SALARY = 9222.22, M3_SALARY = 9333.33, FOREIGN_SALARY = 5555.55, MISSING_EMPLOYEE_ID = 987654321
const membershipLeaks = body => { const text = JSON.stringify(body); return ['9111', '9222', '9333', '5555', '"items"', '"members"', '"engine"', '"totalNet"', '"netPay"',
  'موظف فرع تاني برّه المسير', 'LK-009'].filter(part => text.includes(part)) }

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 10000, requestTimeout: 120000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  ds = app.get(require('../node_modules/typeorm').DataSource); assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`

  B.main = await repo('Branch').save({ name: 'فرع المعادي', code: 'LK-MAIN' })
  B.other = await repo('Branch').save({ name: 'فرع الإسكندرية', code: 'LK-OTHER' })
  const employee = (code, fullName, basicSalary, branch = B.main) => repo('Employee').save({ employeeCode: code, fullName, branchId: branch.id, joinDate: '2020-01-01',
    basicSalary, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'transfer' })
  E.me = await employee('LK-001', 'موظف صاحب القسيمة', MY_SALARY)
  E.colleague = await employee('LK-002', 'زميل في نفس المسير', COLLEAGUE_SALARY)
  const user = (email, role, branch, employeeId, permissions, extra = {}) => repo('User').save({ email, displayName: email, passwordHash: 'isolated-test-token-only', role,
    branchId: branch ? branch.id : null, employeeId, permissions: JSON.stringify(permissions), ...extra })
  U.admin = await user('admin@leaks.test', 'super_admin', null, null, ['*'])
  U.me = await user('me@leaks.test', 'employee', B.main, E.me.id, [])
  U.reader = await user('reader@leaks.test', 'hr_manager', B.main, null, ['payroll.view'])
  // قارئ رواتب فرع تاني وهو نفسه صاحب القسيمة: القسيمة برّه نطاق صلاحيته، فبيشوفها كصاحبها بس
  E.outside = await employee('LK-003', 'قارئ رواتب فرع تاني', 5000)
  U.outsideReader = await user('outside@leaks.test', 'hr_manager', B.other, E.outside.id, ['payroll.view'])
  // مسير فيه فرعين: موظف من فرع القارئ وموظف من فرع تاني
  E.near = await employee('LK-004', 'موظف فرع القارئ', 7000)
  E.far = await employee('LK-005', 'موظف الفرع التاني', FAR_SALARY, B.other)
  // قارئ رواتب على مستوى الشركة (نطاقه «كل الفروع»)، وحساب فرع معاه التقارير واللوحة وعرض الإعفاءات من غير صلاحية رواتب
  U.companyReader = await user('company@leaks.test', 'hr_manager', null, null, ['payroll.view', 'reports.view', 'dashboard.view_all', 'financial_exemption.view'], { scopeAllBranches: true })
  U.branchViewer = await user('viewer@leaks.test', 'employee', B.main, null, ['reports.view', 'dashboard.view_all', 'financial_exemption.view'])
  // صلاحية العملية لوحدها من غير عرض الرواتب (نطاقه كل الفروع)
  U.reopener = await user('reopener@leaks.test', 'employee', null, null, ['payroll.reopen'], { scopeAllBranches: true })
  U.canceller = await user('canceller@leaks.test', 'employee', null, null, ['payroll.cancel'], { scopeAllBranches: true })
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '23' }, { key: 'payroll.monthly_days', value: '30' }, { key: 'payroll.daily_hours', value: '8' },
    { key: 'payroll.late_deduction_enabled', value: 'true' }, { key: 'attendance.absence_penalty_days', value: '1' }, { key: 'attendance.weekend_days', value: 'FRI,SAT' },
    { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' },
  ])
  await require('./fixtures/payroll-small-company-approval.cjs').allowSmallCompanyApproval(repo)
  for (const emp of [E.me, E.colleague, E.outside, E.near, E.far]) await attendance(emp)

  run = ok(await request(U.admin, 'POST', '/payroll/runs/calculate-defined', { period, scopeType: 'CUSTOM', employeeIds: [E.me.id, E.colleague.id, E.outside.id],
    name: 'مسير اختبار التسريبات' }), 201)
  // B1.10 (D03): المسير بالحساب الحالي بس؛ فحص التكافؤ (SHADOW) عشان تقرير التكافؤ المحفوظ يبقى فيه أرقام الزميل (دليل إن التسريب كان ممكن)
  ok(await request(U.admin, 'POST', `/payroll/runs/${run.id}/engine-mode`, { mode: 'SHADOW', reason: 'فحص التكافؤ لاختبار التسريب' }), 201)
  run = ok(await request(U.admin, 'POST', `/payroll/runs/${run.id}/recalculate`, { reason: 'إعادة الحساب بفحص التكافؤ' }), 201)
  mineItem = run.items.find(item => item.employeeId === E.me.id); colleagueItem = run.items.find(item => item.employeeId === E.colleague.id)
  assert.ok(mineItem && colleagueItem)
  const report = ok(await request(U.admin, 'GET', `/payroll/runs/${run.id}/unassigned`))
  ok(await request(U.admin, 'POST', `/payroll/runs/${run.id}/unassigned-ack`, { reportHash: report.reportHash }), 201)
  approveResponse = ok(await request(U.admin, 'POST', `/payroll/runs/${run.id}/approve`), 201)

  run2 = ok(await request(U.admin, 'POST', '/payroll/runs/calculate-defined', { period, scopeType: 'CUSTOM', employeeIds: [E.near.id, E.far.id],
    name: 'مسير فرعين' }), 201)
  nearItem = run2.items.find(item => item.employeeId === E.near.id); farItem = run2.items.find(item => item.employeeId === E.far.id)
  assert.ok(nearItem && farItem)
  const report2 = ok(await request(U.admin, 'GET', `/payroll/runs/${run2.id}/unassigned`))
  ok(await request(U.admin, 'POST', `/payroll/runs/${run2.id}/unassigned-ack`, { reportHash: report2.reportHash }), 201)
  ok(await request(U.admin, 'POST', `/payroll/runs/${run2.id}/approve`), 201)

  // مسير العضوية (بعد اعتماد الاتنين اللي فوق عشان مايغيّرش تقاريرهم): محسوب ومفتوح، وكل أعضائه في فرع حساب المحاسب
  E.m1 = await employee('LK-006', 'عضو أول في مسير العضوية', M1_SALARY)
  E.m2 = await employee('LK-007', 'عضو تاني في مسير العضوية', M2_SALARY)
  E.m3 = await employee('LK-008', 'موظف بينضم للمسير', M3_SALARY)
  E.foreign = await employee('LK-009', 'موظف فرع تاني برّه المسير', FOREIGN_SALARY, B.other)
  for (const emp of [E.m1, E.m2, E.m3, E.foreign]) await attendance(emp)
  // صلاحية الحساب لوحدها (حساب فرع)، ومعاها عرض الرواتب
  U.calculator = await user('calculator@leaks.test', 'employee', B.main, null, ['payroll.calculate'])
  U.calcReader = await user('calcreader@leaks.test', 'hr_manager', B.main, null, ['payroll.calculate', 'payroll.view'])
  // تغيير العضوية مع إعادة الحساب متاح لمسير له تعريف: مسودة بمعادلة منشورة (نفس دورة يوم 23) ثم احتسابها
  const policy = ok(await request(U.admin, 'POST', '/payroll/policies', { name: 'معادلة مسير العضوية', effectiveFrom: startDate,
    settings: { defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 23, cycleEndMode: 'DERIVED', cycleEndDay: null } }), 201)
  const [version] = policy.versions
  const published = ok(await request(U.admin, 'POST', `/payroll/policies/${policy.policy.id}/versions/${version.id}/publish`,
    { expectedRevision: version.revision, reason: 'نشر معادلة اختبار العضوية' }))
  const draft = ok(await request(U.admin, 'POST', '/payroll/runs', { name: 'مسير العضوية', policyVersionId: published.version.id, period,
    filters: { employeeIds: [E.m1.id, E.m2.id] } }), 201)
  // B1.10 (D03): المسير الجديد بالحساب الحالي بس؛ فحص التكافؤ (SHADOW) عشان تقرير التكافؤ المحفوظ يبقى فيه أرقام الزملاء (اللي القسيمة مابترجعهاش)
  ok(await request(U.admin, 'POST', `/payroll/runs/${draft.id}/engine-mode`, { mode: 'SHADOW', reason: 'فحص التكافؤ لاختبار التسريب' }), 201)
  run3 = ok(await request(U.admin, 'POST', `/payroll/runs/${draft.id}/calculate`, {}), 201)
  assert.deepEqual([run3.status, run3.items.length], ['CALCULATED', 2])
}, { timeout: 300000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
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
  try { fs.rmSync(uploads, { recursive: true, force: true }) } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'payslip leaks fixture cleanup failed')
})

test('LK-01: «قسائم راتبي» بترجّع بيانات المسير اللي القسيمة بتعرضها بس — من غير أرقام الزملاء ولا تعريف المسير', async () => {
  // الدليل إن التسريب كان ممكن: صف المسير في القاعدة فيه تقرير تكافؤ بأرقام الزميل، وتعريف بأرقام الموظفين، وصافي المسير كله
  const stored = await repo('PayrollRun').findOneByOrFail({ id: run.id })
  assert.equal(stored.status, 'APPROVED')
  assert.ok(stored.parityReport && stored.parityReport.includes('17341'), 'تقرير التكافؤ المحفوظ فيه راتب الزميل')
  assert.ok(stored.policySnapshot, 'لقطة السياسة محفوظة على المسير')
  assert.ok(Number(stored.totalNet) > COLLEAGUE_SALARY, 'صافي المسير بيجمع الكل')
  assert.ok(String(stored.employeeIds).includes(String(E.colleague.id)))

  const slips = ok(await request(U.me, 'GET', '/payroll/my-payslips'))
  assert.equal(slips.length, 1)
  const [slip] = slips
  assert.deepEqual(Object.keys(slip).sort(), ['item', 'reversal', 'run'])
  assert.equal(slip.item.id, mineItem.id); assert.equal(slip.item.employeeId, E.me.id); assert.equal(Number(slip.item.netPay), MY_SALARY)
  assert.deepEqual(Object.keys(slip.run).sort(), SAFE_RUN_KEYS)
  for (const key of FORBIDDEN_RUN_KEYS) assert.ok(!(key in slip.run), `run.${key} مايرجعش لصاحب القسيمة`)
  assert.deepEqual([slip.run.id, slip.run.name, slip.run.period, slip.run.startDate, slip.run.endDate, slip.run.status],
    [run.id, 'مسير اختبار التسريبات', period, startDate, endDate, 'APPROVED'])
  assert.equal(mentionsColleague(slips), false, 'ولا رقم ولا معرّف للزميل في الرد كله')
})

test('LK-02: القسيمة — صاحبها من غير صلاحية بياخد البيانات المحدودة، وقارئ الرواتب في نطاقه زي ما كان', async () => {
  const own = ok(await request(U.me, 'GET', `/payroll/items/${mineItem.id}`))
  assert.equal(own.item.id, mineItem.id)
  assert.deepEqual(Object.keys(own.run).sort(), SAFE_RUN_KEYS)
  for (const key of FORBIDDEN_RUN_KEYS) assert.ok(!(key in own.run), `run.${key} مايرجعش لصاحب القسيمة`)
  assert.equal(mentionsColleague(own), false)
  // القسيمة نفسها كاملة لصاحبها: بنوده وهويته
  assert.equal(own.employee.fullName, 'موظف صاحب القسيمة')
  assert.ok(own.lines && own.member && Array.isArray(own.leaveDeductions))
  // قسيمة الزميل: 404 بنفس الرسالة (مفيش كاشف وجود)
  const other = await request(U.me, 'GET', `/payroll/items/${colleagueItem.id}`)
  assert.deepEqual([other.status, other.body.message], [404, 'بند المسير غير موجود'])

  // قارئ الرواتب في نطاقه: بيانات المسير زي ما كانت (صافيه وتعريفه)، ومن غير اللقطة وتقرير التكافؤ
  const reader = ok(await request(U.reader, 'GET', `/payroll/items/${mineItem.id}`))
  assert.ok(Number(reader.run.totalNet) > COLLEAGUE_SALARY)
  for (const key of ['definition', 'employeeIds', 'approvedBy', 'calculatedBy', 'scopeType']) assert.ok(key in reader.run, `قارئ الرواتب بياخد run.${key}`)
  for (const key of ['parityReport', 'policySnapshot']) assert.ok(!(key in reader.run), `run.${key} مابيرجعش في القسيمة لأي حد`)

  // قارئ رواتب فرع تاني وهو صاحب القسيمة: برّه نطاق صلاحيته، فبياخدها كصاحبها — البيانات المحدودة بس
  const outsideItem = run.items.find(item => item.employeeId === E.outside.id)
  const outside = ok(await request(U.outsideReader, 'GET', `/payroll/items/${outsideItem.id}`))
  assert.deepEqual(Object.keys(outside.run).sort(), SAFE_RUN_KEYS)
  assert.equal(mentionsColleague(outside), false)
  // وقسيمة غيره في الفرع التاني: 404
  assert.equal((await request(U.outsideReader, 'GET', `/payroll/items/${mineItem.id}`)).status, 404)
})

test('LK-03: بعد الصرف — مرجع الصرف وقناته في قسيمة الموظف، ومين صرف مش في الرد', async () => {
  const payResponse = ok(await request(U.admin, 'POST', `/payroll/runs/${run.id}/pay`, { channel: 'BANK_TRANSFER', reference: 'TRX-LEAK-0001' }), 201)
  // رد الاعتماد والصرف: حالة المسير من غير لقطة السياسة وتقرير التكافؤ (فيهم أرقام كل موظف) — صلاحية الاعتماد أو الصرف مش صلاحية عرض الرواتب
  assert.deepEqual([approveResponse.id, approveResponse.status, payResponse.id, payResponse.status], [run.id, 'APPROVED', run.id, 'PAID'])
  for (const response of [approveResponse, payResponse]) {
    for (const key of ['parityReport', 'policySnapshot']) assert.ok(!(key in response), `${key} مايرجعش في رد الاعتماد أو الصرف`)
    assert.ok(!JSON.stringify(response).includes('17341'), 'ولا راتب موظف في الرد')
  }
  const stored = await repo('PayrollRun').findOneByOrFail({ id: run.id })
  assert.equal(stored.status, 'PAID'); assert.equal(stored.paidBy, U.admin.id)
  const [slip] = ok(await request(U.me, 'GET', '/payroll/my-payslips'))
  assert.deepEqual([slip.run.status, slip.run.payReference, slip.run.payChannel], ['PAID', 'TRX-LEAK-0001', stored.payChannel])
  assert.ok(slip.run.paidAt)
  assert.deepEqual(Object.keys(slip.run).sort(), SAFE_RUN_KEYS)
  const own = ok(await request(U.me, 'GET', `/payroll/items/${mineItem.id}`))
  assert.deepEqual(Object.keys(own.run).sort(), SAFE_RUN_KEYS)
  assert.equal(own.run.payReference, 'TRX-LEAK-0001')
  assert.equal(mentionsColleague([slip, own]), false)
})

test('LK-04: مسير فيه فرعين — قارئ رواتب فرع واحد بياخد قسيمة موظف فرعه ببيانات القسيمة بس، وقارئ الشركة بياخد بيانات المسير', async () => {
  const stored = await repo('PayrollRun').findOneByOrFail({ id: run2.id })
  assert.ok(Number(stored.totalNet) > FAR_SALARY && String(stored.employeeIds).includes(String(E.far.id)), 'المسير المحفوظ بيجمع الفرعين')
  // المسير كله برّه نطاق قارئ الفرع: شاشة المسير بترفضه
  assert.equal((await request(U.reader, 'GET', `/payroll/runs/${run2.id}`)).status, 403)
  // وقسيمة موظف فرعه بتتفتح له، ببيانات القسيمة بس — من غير صافي المسير ولا تعريفه ولا أرقام موظفي الفرع التاني
  const near = ok(await request(U.reader, 'GET', `/payroll/items/${nearItem.id}`))
  assert.equal(near.item.employeeId, E.near.id)
  assert.deepEqual(Object.keys(near.run).sort(), SAFE_RUN_KEYS)
  for (const key of FORBIDDEN_RUN_KEYS) assert.ok(!(key in near.run), `run.${key} مايرجعش لقارئ فرع والمسير فيه فرع تاني`)
  const text = JSON.stringify(near)
  assert.ok(!text.includes('8123') && !text.includes(`"employeeId":${E.far.id}`) && !text.includes('موظف الفرع التاني'), 'ولا رقم ولا اسم لموظف الفرع التاني')
  // قسيمة موظف الفرع التاني: 404 بنفس الرسالة
  const far = await request(U.reader, 'GET', `/payroll/items/${farItem.id}`)
  assert.deepEqual([far.status, far.body.message], [404, 'بند المسير غير موجود'])
  // المسير اللي كله في فرعه: بيانات المسير زي ما كانت (LK-02)، فالتضييق على المسير متعدد الفروع بس
  assert.ok('totalNet' in ok(await request(U.reader, 'GET', `/payroll/items/${mineItem.id}`)).run)

  // قارئ الرواتب على مستوى الشركة: بيانات المسير زي ما هي، للقسيمتين
  for (const item of [nearItem, farItem]) {
    const company = ok(await request(U.companyReader, 'GET', `/payroll/items/${item.id}`))
    assert.equal(Number(company.run.totalNet), Number(stored.totalNet))
    for (const key of ['definition', 'employeeIds', 'approvedBy', 'scopeType']) assert.ok(key in company.run, `قارئ الشركة بياخد run.${key}`)
    for (const key of ['parityReport', 'policySnapshot']) assert.ok(!(key in company.run))
  }
})

test('LK-05: تقرير مسيرات الرواتب في لوحة التقارير وآخر المسيرات في لوحة التحكم — لقارئ الرواتب بس', async () => {
  // «التقارير» من غير «عرض مسيرات الرواتب»: التقرير مرفوض، بفلتر ومن غير فلتر (فلتر على فريق من موظف واحد كان بيرجّع راتبه)
  for (const route of ['/reports/payroll', `/reports/payroll?branchId=${B.main.id}`, '/reports/payroll?includeDraft=true']) {
    const blocked = await request(U.branchViewer, 'GET', route)
    assert.equal(blocked.status, 403, `${route}: ${JSON.stringify(blocked.body)}`)
    assert.ok(!JSON.stringify(blocked.body).includes('totalNet'))
  }
  // التقارير غير المالية شغالة له زي ما هي
  ok(await request(U.branchViewer, 'GET', '/reports/headcount'))
  // قارئ الرواتب: التقرير زي ما كان
  const report = ok(await request(U.companyReader, 'GET', '/reports/payroll'))
  assert.deepEqual([run.id, run2.id].map(id => report.runs.some(row => row.id === id)), [true, true])

  // لوحة التحكم: صلاحية اللوحة لوحدها ماتجيبش صافي المسيرات
  const stats = ok(await request(U.branchViewer, 'GET', '/dashboard/stats'))
  assert.deepEqual(stats.payrollRuns, [])
  assert.ok(stats.employees.total >= 1, 'باقي أرقام اللوحة زي ما هي')
  const full = ok(await request(U.companyReader, 'GET', '/dashboard/stats'))
  assert.ok(full.payrollRuns.some(row => row.id === run2.id && Number(row.totalNet) > FAR_SALARY), JSON.stringify(full.payrollRuns))
})

test('LK-06: تقرير حوكمة الإعفاءات — صافي المسير المحفوظ لقارئ الشركة بس، والمكافآت بموظفي نطاق القارئ', async () => {
  // مكافأة مصروفة لموظف الفرع التاني في المسير متعدد الفروع
  await repo('EmployeeObligation').save({ employeeId: E.far.id, type: 'CREDIT', category: 'bonus', amount: FAR_BONUS, label: 'مكافأة موظف الفرع التاني',
    status: 'APPLIED', appliedPayrollRunId: run2.id, appliedAmount: FAR_BONUS })
  const stored = await repo('PayrollRun').findOneByOrFail({ id: run2.id })
  const route = `/payroll/exemptions/report?fromPeriod=${period}&toPeriod=${period}`
  // حساب فرع معاه عرض الإعفاءات من غير صلاحية رواتب: المسير ظاهر (فيه موظف من فرعه) من غير إجمالي المسير ولا مكافأة الفرع التاني
  const scoped = ok(await request(U.branchViewer, 'GET', route))
  const scopedRow = scoped.byRun.find(row => row.runId === run2.id)
  assert.ok(scopedRow, JSON.stringify(scoped.byRun))
  assert.deepEqual([scopedRow.totalNet, scopedRow.bonuses], [null, '0.00'])
  assert.ok(scoped.byRun.every(row => row.totalNet === null))
  assert.ok(!JSON.stringify(scoped).includes('4321') && !JSON.stringify(scoped).includes('8123'), 'ولا رقم من الفرع التاني')
  // قارئ الرواتب على مستوى الشركة: الأرقام زي ما كانت
  const company = ok(await request(U.companyReader, 'GET', route))
  const companyRow = company.byRun.find(row => row.runId === run2.id)
  assert.deepEqual([Number(companyRow.totalNet), companyRow.bonuses], [Number(stored.totalNet), FAR_BONUS.toFixed(2)])
})

test('LK-07: إعادة فتح المسير وإلغاؤه من غير «عرض مسيرات الرواتب» — العملية بتتنفذ والرد حالة المسير بس', async () => {
  // مايقدرش يقرا المسير أصلًا
  for (const actor of [U.reopener, U.canceller]) assert.equal((await request(actor, 'GET', `/payroll/runs/${run2.id}`)).status, 403)
  const leaked = body => { const text = JSON.stringify(body); return ['7000', '8123', 'موظف فرع القارئ', 'موظف الفرع التاني', '"items"', '"members"', '"engine"', '"totalNet"'].filter(part => text.includes(part)) }

  const reopened = ok(await request(U.reopener, 'POST', `/payroll/runs/${run2.id}/reopen`, { reason: 'مراجعة بند قبل الصرف بطلب المالية' }), 201)
  assert.deepEqual(Object.keys(reopened).sort(), SAFE_RUN_KEYS)
  assert.deepEqual([reopened.id, reopened.status], [run2.id, 'CALCULATED'])
  assert.deepEqual(leaked(reopened), [], 'رد إعادة الفتح من غير بنود ولا أسماء ولا مبالغ')

  const cancelled = ok(await request(U.canceller, 'POST', `/payroll/runs/${run2.id}/cancel`, { reason: 'إلغاء مسودة اختبار بعد إعادة الفتح' }), 201)
  assert.deepEqual(Object.keys(cancelled).sort(), SAFE_RUN_KEYS)
  assert.deepEqual([cancelled.id, cancelled.status], [run2.id, 'CANCELLED'])
  assert.deepEqual(leaked(cancelled), [])
  // والعمليتين اتنفذوا فعلًا، وقارئ الرواتب بيشوف المسير ببنوده زي ما هو
  const detail = ok(await request(U.admin, 'GET', `/payroll/runs/${run2.id}`))
  assert.equal(detail.status, 'CANCELLED')
  assert.deepEqual(detail.items.map(item => item.employeeId).sort((a, b) => a - b), [E.near.id, E.far.id].sort((a, b) => a - b))
})

test('LK-08: «ضم موظفين للمسير» بصلاحية الحساب من غير «عرض مسيرات الرواتب» — العضوية بتتغير والرد حالة المسير بس', async () => {
  // مايقدرش يقرا المسير أصلًا
  assert.equal((await request(U.calculator, 'GET', `/payroll/runs/${run3.id}`)).status, 403)

  // اختيار مختلط مابيغيّرش العضوية: عضو موجود بالفعل، وموظف فرع تاني، ورقم مش موجود. الرد مايبقاش باب لقراءة المسير ولا لأسماء فرع تاني
  const bulk = ok(await request(U.calculator, 'POST', `/payroll/runs/${run3.id}/members/bulk`,
    { employeeIds: [E.m1.id, E.foreign.id, MISSING_EMPLOYEE_ID], reason: 'تأكيد عضو موجود بالفعل' }), 201)
  assert.deepEqual(Object.keys(bulk.run).sort(), SAFE_RUN_KEYS)
  assert.deepEqual(membershipLeaks(bulk), [], 'رد الضم المختلط من غير بنود ولا مبالغ ولا اسم موظف الفرع التاني')
  assert.deepEqual(bulk.results.map(row => [row.employeeId, row.outcome, row.skipCode, row.fullName, row.employeeCode]), [
    [E.m1.id, 'SKIPPED', 'ALREADY_IN_RUN', 'عضو أول في مسير العضوية', 'LK-006'],
    [E.foreign.id, 'SKIPPED', 'OUT_OF_BRANCH_SCOPE', null, null],
    [MISSING_EMPLOYEE_ID, 'SKIPPED', 'OUT_OF_BRANCH_SCOPE', null, null],
  ])
  // موظف الفرع التاني والرقم اللي مش موجود: نفس الرد بالحرف
  const [, foreign, missing] = bulk.results.map(({ employeeId: _id, ...row }) => row)
  assert.deepEqual(foreign, missing)

  // ضم موظف فعلًا: المسير المحسوب بيتعاد حسابه بالعضو الجديد
  const single = ok(await request(U.calculator, 'POST', `/payroll/runs/${run3.id}/members`, { employeeIds: [E.m3.id], reason: 'ضم موظف جديد للمسير' }), 201)
  assert.deepEqual(Object.keys(single.run).sort(), SAFE_RUN_KEYS)
  assert.deepEqual([single.run.id, single.run.status, single.added, single.recalculated], [run3.id, 'CALCULATED', [E.m3.id], true])
  assert.deepEqual(membershipLeaks(single), [], 'رد الضم من غير بنود ولا مبالغ')
  // والعملية اتنفذت فعلًا: التلاتة في المسير بأرقامهم (الدليل إن الأرقام موجودة والرد ماجابهاش)
  const detail = ok(await request(U.admin, 'GET', `/payroll/runs/${run3.id}`))
  assert.deepEqual(detail.items.map(item => item.employeeId).sort((a, b) => a - b), [E.m1.id, E.m2.id, E.m3.id].sort((a, b) => a - b))
  assert.deepEqual(membershipLeaks(detail).filter(part => /^9/.test(part)), ['9111', '9222', '9333'])

  // موظف الفرع التاني بالنداء المفرد: مرفوض من غير اسمه، وبنفس رسالة الرقم اللي مش موجود
  const refusals = []
  for (const id of [E.foreign.id, MISSING_EMPLOYEE_ID]) {
    const refused = await request(U.calculator, 'POST', `/payroll/runs/${run3.id}/members`, { employeeIds: [id], reason: 'محاولة ضم من برّه الفرع' })
    assert.equal(refused.status, 400, JSON.stringify(refused.body))
    assert.deepEqual(membershipLeaks(refused.body), [])
    refusals.push(String(refused.body.message).replace(String(id), '#'))
  }
  assert.equal(refusals[0], refusals[1])

  // قارئ الرواتب: الرد زي ما كان — تفاصيل المسير ببنوده، مطابقة لشاشة المسير
  const reader = ok(await request(U.calcReader, 'POST', `/payroll/runs/${run3.id}/members/bulk`, { employeeIds: [E.m1.id], reason: 'عرض مخول لعضو موجود' }), 201)
  assert.deepEqual(reader.run, ok(await request(U.calcReader, 'GET', `/payroll/runs/${run3.id}`)))
  assert.equal(reader.run.items.length, 3)
})

test('LK-09: معاينة عضوية المسير بصلاحية الحساب من غير «عرض مسيرات الرواتب» — الأسماء والتغطية من غير راتب الشهر ولا المستحق', async () => {
  const route = `/payroll/runs/${run3.id}/membership-preview`
  const full = ok(await request(U.calcReader, 'GET', route))
  assert.match(full.previewHash, /^[a-f0-9]{64}$/)
  assert.ok(full.included.length >= 2 && full.included.every(row => row.monthlyGross > 0 && row.earnedGross > 0), JSON.stringify(full.included))
  assert.equal(full.totals.monthlyGross, Math.round(full.included.reduce((sum, row) => sum + row.monthlyGross * 100, 0)) / 100)

  const blind = ok(await request(U.calculator, 'GET', route))
  assert.deepEqual([blind.previewHash, blind.totals.monthlyGross, blind.totals.earnedGross], [null, null, null])
  // نفس الصفوف بالحرف، والمبالغ بس اللي اتشالت
  assert.deepEqual(blind.included, full.included.map(row => ({ ...row, monthlyGross: null, earnedGross: null })))
  assert.deepEqual(blind.excluded, full.excluded)
  assert.deepEqual({ ...blind.totals, monthlyGross: full.totals.monthlyGross, earnedGross: full.totals.earnedGross }, full.totals)
  assert.ok(blind.included.some(row => row.fullName === 'عضو أول في مسير العضوية' && row.coverDays > 0), 'الأسماء والتغطية زي ما هي')
  assert.deepEqual(['9111', '9222', '9333'].filter(part => JSON.stringify(blind).includes(part)), [], 'ولا راتب في المعاينة')
})
