'use strict'
// تسريبات رد قسيمة الموظف (الدفعة B0.1s — من جرد المسارات) على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر
// (hr_codex_r23_payslips_test_<16 hex>)، عبر HTTP بتوكنات موقّعة محليًا ومن غير كلمات مرور:
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

const database = `hr_codex_r23_payslips_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_codex_r23_payslips_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payslip-leaks-uploads-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const period = '2026-07', startDate = '2026-06-23', endDate = '2026-07-22'
let app, ds, master, base, created = false
const B = {}, E = {}, U = {}
let run, mineItem, colleagueItem
// مسير تاني فيه موظف من كل فرع، ورد اعتماد المسير الأول
let run2, nearItem, farItem, approveResponse

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
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '23' }, { key: 'payroll.monthly_days', value: '30' }, { key: 'payroll.daily_hours', value: '8' },
    { key: 'payroll.late_deduction_enabled', value: 'true' }, { key: 'attendance.absence_penalty_days', value: '1' }, { key: 'attendance.weekend_days', value: 'FRI,SAT' },
    { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' },
  ])
  await require('./fixtures/payroll-small-company-approval.cjs').allowSmallCompanyApproval(repo)
  for (const emp of [E.me, E.colleague, E.outside, E.near, E.far]) await attendance(emp)

  const policy=ok(await request(U.admin,'POST','/payroll/policies',{name:'سياسة اختبار القسائم المستقلة',effectiveFrom:'2026-01-23',settings:{defaultPeriodType:'CUSTOM_DAY_RANGE',cycleStartDay:23,cycleEndMode:'DERIVED',cycleEndDay:null,dailyHours:8}}),201)
  const published=ok(await request(U.admin,'POST',`/payroll/policies/${policy.policy.id}/versions/${policy.versions[0].id}/publish`,{expectedRevision:policy.versions[0].revision,reason:'اختبار تكميلي بنسخة منشورة'}),200)
  run=ok(await request(U.admin,'POST','/payroll/runs',{period,policyVersionId:published.version.id,filters:{employeeIds:[E.me.id,E.colleague.id,E.outside.id]},name:'مسير اختبار التسريبات'}),201)
  run=ok(await request(U.admin,'POST',`/payroll/runs/${run.id}/calculate`,{}),201)
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
  assert.ok(String(stored.employeeIds??stored.definition).includes(String(E.colleague.id)))

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

let financeReplies=[]
test('CR23 own paid, reversed and supplementary payslips keep colleague amounts outside every response',{timeout:180000},async t=>{
  const selection={employeeIds:[E.me.id,E.colleague.id]},reason='تصحيح مستقل لقسائم المسير'
  const preview=ok(await request(U.admin,'POST',`/payroll/runs/${run.id}/reversal-preview`,selection),201)
  assert.equal(preview.blocked,false)
  const reversal=ok(await request(U.admin,'POST',`/payroll/runs/${run.id}/reversals`,{...selection,reason,previewHash:preview.previewHash}),201)
  const decider=await repo('User').save({email:'decider@r23.invalid',displayName:'معتمد مستقل',role:'employee',scopeAllBranches:true,permissions:JSON.stringify(['payroll.approve','payroll.pay']),passwordHash:'test-only'})
  const reversalApproved=ok(await request(decider,'POST',`/payroll/runs/${reversal.id}/approve`),201)
  const reversalPaid=ok(await request(decider,'POST',`/payroll/runs/${reversal.id}/pay`,{channel:'CASH',reference:'R23-REVERSE'}),201)
  const supplemental=ok(await request(U.admin,'POST',`/payroll/runs/${run.id}/supplementary`,{...selection,reason,name:'تكميلي مستقل'}),201)
  const calculated=ok(await request(U.admin,'POST',`/payroll/runs/${supplemental.id}/calculate`,{}),201)
  assert.equal(Number(calculated.items.find(i=>i.employeeId===E.me.id).netPay),MY_SALARY)
  assert.equal(Number(calculated.items.find(i=>i.employeeId===E.colleague.id).netPay),COLLEAGUE_SALARY)
  const unassigned=ok(await request(U.admin,'GET',`/payroll/runs/${supplemental.id}/unassigned`))
  ok(await request(U.admin,'POST',`/payroll/runs/${supplemental.id}/unassigned-ack`,{reportHash:unassigned.reportHash}),201)
  await writeParityReasonsBeforeApproval(request,U.admin,'POST',`/payroll/runs/${supplemental.id}/approve`)
  assert.equal((await request(decider,'GET',`/payroll/runs/${supplemental.id}`)).status,403)
  const approved=ok(await request(decider,'POST',`/payroll/runs/${supplemental.id}/approve`),201)
  const paid=ok(await request(decider,'POST',`/payroll/runs/${supplemental.id}/pay`,{channel:'CASH',reference:'R23-SUPPLEMENT'}),201)
  financeReplies=[reversalApproved,reversalPaid,approved,paid]
  t.diagnostic(JSON.stringify({case:'finance-responses',responses:financeReplies.map(r=>({id:r.id,runType:r.runType,status:r.status,parityReportLength:r.parityReport?.length??0,policySnapshotLength:r.policySnapshot?.length??0,peerPresent:mentionsColleague(r),hasParityReportKey:'parityReport' in r,hasPolicySnapshotKey:'policySnapshot' in r}))}))
  const slips=ok(await request(U.me,'GET','/payroll/my-payslips'))
  assert.equal(slips.length,2)
  for(const slip of slips){
    assert.deepEqual(Object.keys(slip.run).sort(),SAFE_RUN_KEYS);assert.equal(slip.item.employeeId,E.me.id)
    assert.equal(mentionsColleague(slip),false)
    const own=ok(await request(U.me,'GET',`/payroll/items/${slip.item.id}`))
    assert.equal(mentionsColleague(own),false);assert.deepEqual(Object.keys(own.run).sort(),SAFE_RUN_KEYS)
  }
  const original=slips.find(s=>s.run.id===run.id)
  assert.equal(original.reversal.line.status,'POSTED');assert.equal(original.reversal.line.netPay,'6000.00')
  assert.equal(original.reversal.supplementary.length,1);assert.equal(original.reversal.supplementary[0].netPay,'6000.00')
  t.diagnostic(JSON.stringify({case:'own-correction-payslips',publishedSlips:slips.length,runKeys:13,ownNet:6000,peerNet:COLLEAGUE_SALARY,peerLeaked:false,reversalItems:(await repo('PayrollItem').countBy({runId:reversal.id}))}))
})

test('CR23 approve and pay responses do not contain colleague monetary evidence for regular or reversal runs',()=>{
  assert.equal(financeReplies.length,4)
  for(const response of financeReplies){assert.equal(mentionsColleague(response),false);assert.ok(!response.policySnapshot);assert.ok(!response.parityReport)}
})

test('CR23 reopening and cancelling without payroll.view must not return full employee payroll details',async t=>{
  const operator=await repo('User').save({email:'reopen-only@r23.invalid',displayName:'تشغيل دون قراءة الرواتب',role:'employee',scopeAllBranches:true,permissions:JSON.stringify(['payroll.reopen','payroll.cancel']),passwordHash:'test-only'})
  assert.equal((await request(operator,'GET',`/payroll/runs/${run2.id}`)).status,403)
  const reopened=await request(operator,'POST',`/payroll/runs/${run2.id}/reopen`,{reason:'اختبار محتوى رد إعادة الفتح'})
  assert.equal(reopened.status,201)
  const cancelled=await request(operator,'POST',`/payroll/runs/${run2.id}/cancel`,{reason:'اختبار محتوى رد الإلغاء'})
  assert.equal(cancelled.status,201)
  const summarize=response=>({status:response.status,items:response.body.items?.map(i=>({employeeId:i.employeeId,netPay:i.netPay})),memberNames:response.body.members?.map(m=>m.snapshot?.fullName),hasEngine:!!response.body.engine})
  t.diagnostic(JSON.stringify({case:'mutation-without-payroll-view',getStatus:403,permissions:JSON.parse(operator.permissions),reopen:summarize(reopened),cancel:summarize(cancelled)}))
  assert.ok(!JSON.stringify(reopened.body).includes('8123.45'),'Reopen permission alone must not disclose individual salaries')
  assert.ok(!JSON.stringify(cancelled.body).includes('8123.45'),'Cancel permission alone must not disclose individual salaries')
})
