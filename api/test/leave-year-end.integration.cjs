// إقفال سنة الإجازات على قاعدة SQL مؤقتة (hr_leave_year_end_test_<hex>): ترحيل 058 على مخطط قديم وفرقه صفر،
// المعاينة بنطاق الفرع، «تسوية رصيد موظف» مصروفة (بدل في شهر مسير عبر دفتر المديونيات) أو تصفير بس،
// «إقفال السنة» لفرع ومايتكررش، والإجازة المعتمدة في السنة الجديدة بتتخصم صح بعد الإقفال،
// وبداية استحقاق السنوية للموظف الجديد من شاشة أنواع الإجازات.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const { payrollPeriodOfDate } = require('../src/payroll/payroll-period')
const database = `hr_leave_year_end_test_${crypto.randomBytes(8).toString('hex')}`
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const migration = fs.readFileSync(path.join(apiRoot, '../docs/migrations/payroll/20260919_058_leave_year_end.sql'), 'utf8')
let app, ds, master, base, created = false
const org = {}, people = {}, users = {}
const TODAY = new Date().toLocaleDateString('en-CA')
const NY = TODAY.slice(0, 4)
const Y = String(Number(NY) - 1)
const PAY_MONTH = payrollPeriodOfDate(TODAY, 23)
const uuid = () => crypto.randomUUID()

function assertDisposable() {
  assert.match(database, /^hr_leave_year_end_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
function repo(name) { assertDisposable(); return ds.getRepository(name) }
function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(user)}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
function expectStatus(response, status) {
  assert.equal(response.status, status, JSON.stringify(response.body))
  return response.body
}
const balanceRow = (employeeId, period) => repo('LeaveBalance').findOneBy({ employeeId, balanceType: 'annual', period })
const rowOf = (preview, emp) => preview.rows.find((r) => r.employee.id === emp.id)

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME || 'sa', password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  await app.get(require('../src/settings/config-defaults.service').ConfigDefaultsService).onApplicationBootstrap()
  await repo('RequestsConfig').save([
    { key: 'leave.accrual_mode', value: 'yearly' }, { key: 'leave.carryover_expiry_months', value: '12' },
    { key: 'leave.probation_months', value: '0' }, { key: 'payroll.cycle_start_day', value: '23' }, { key: 'payroll.monthly_days', value: '30' },
    // الترحيل الآلي عند الإقلاع مايسبقش الإقفال اليدوي في الاختبار
    { key: 'leave.rollover_through_period', value: Y },
  ])
  org.branchA = await repo('Branch').save({ code: 'LYE_A', name: 'فرع الإقفال الأول' })
  org.branchB = await repo('Branch').save({ code: 'LYE_B', name: 'فرع الإقفال التاني' })
  const employee = (code, overrides = {}) => repo('Employee').save({ employeeCode: code, fullName: `موظف ${code}`, branchId: org.branchA.id,
    joinDate: '2020-01-01', basicSalary: 9000, housingAllowance: 1000, transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0,
    status: 'active', ...overrides })
  people.e1 = await employee('LYE1')
  people.e2 = await employee('LYE2', { basicSalary: 6000, housingAllowance: 0 })
  people.e3 = await employee('LYE3', { branchId: org.branchB.id })
  const user = (label, role, branchId, permissions = []) => repo('User').save({ email: `${label}@leave-year-end.invalid`, displayName: label,
    passwordHash: 'test-only', role, branchId, employeeId: null, permissions: JSON.stringify(permissions) })
  users.admin = await user('admin', 'super_admin', null)
  users.hr = await user('hr-a', 'hr_manager', org.branchA.id, ['leave_balances.manage', 'leaves.view_all', 'payroll.calculate'])
  users.hrNoPay = await user('hr-a-no-pay', 'hr_manager', org.branchA.id, ['leave_balances.manage', 'leaves.view_all'])
  users.viewer = await user('viewer-a', 'branch_manager', org.branchA.id, ['leaves.view_all'])
  // أرصدة السنة اللي خلصت: e1 أخد 6 (متبقي 15)، e2 من غير أي صف (21)، e3 فرع تاني؛ وe1 أخد يومين في السنة الجديدة قبل الإقفال
  await repo('LeaveBalance').save([
    { employeeId: people.e1.id, balanceType: 'annual', period: Y, entitled: 21, taken: 6, openingDays: 0, openingTaken: 0 },
    { employeeId: people.e3.id, balanceType: 'annual', period: Y, entitled: 21, taken: 0, openingDays: 0, openingTaken: 0 },
    { employeeId: people.e1.id, balanceType: 'annual', period: NY, entitled: 21, taken: 2, openingDays: 0, openingTaken: 0 },
  ])
}, { timeout: 120000 })

after(async (t) => {
  try { if (app) await app.close() } finally {
    if (created && master) {
      assertDisposable()
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      t.diagnostic(`Cleanup: ${database} dropped.`)
    }
    if (master) await master.close()
  }
})

test('ترحيل 058: على المخطط القديم بيضيف الأعمدة والجدول بأسماء TypeORM، والاستحقاق «سنوي» يفضل أول سنة كاملة، ومايتكررش', async () => {
  const types = await repo('LeaveType').save([
    { code: 'ANNUAL', nameAr: 'سنوية', balanceType: 'annual', isPaid: true, category: 'ANNUAL', annualDays: 21, carryOverEnabled: true, carryOverMaxDays: 5 },
    { code: 'SICK', nameAr: 'مرضية', balanceType: 'sick', isPaid: true, category: 'SICK', annualDays: 120, sickPayTiers: '[{"fromDay":1,"toDay":null,"payPercent":100}]' },
  ])
  // المخطط قبل الترحيل (القاعدة المؤقتة بس)
  await ds.query(`ALTER TABLE dbo.leave_types DROP CONSTRAINT [DF_a1c3077785e5dc51059f03141b5];
    ALTER TABLE dbo.leave_types DROP COLUMN [firstYearProrated], [entitlementStartMonths];
    ALTER TABLE dbo.leave_balances DROP CONSTRAINT [DF_10f15487e4293dfbba779a28c5b];
    ALTER TABLE dbo.leave_balances DROP COLUMN [settledDays];
    DROP TABLE dbo.leave_balance_settlements;`)
  const run = () => ds.transaction(async (em) => {
    for (const batch of migration.split(/^\s*GO\s*$/im).map((b) => b.trim()).filter(Boolean)) await em.query(batch)
  })
  await run()
  assert.deepEqual((await ds.query('SELECT [code], [firstYearProrated], [entitlementStartMonths] FROM dbo.leave_types ORDER BY [id]'))
    .map((r) => [r.code, r.firstYearProrated, r.entitlementStartMonths]), [['ANNUAL', false, null], ['SICK', false, null]])
  assert.equal(Number((await balanceRow(people.e1.id, Y)).settledDays), 0)
  await run()
  const { upQueries } = await ds.driver.createSchemaBuilder().log()
  const ours = upQueries.map((q) => q.query).filter((q) => /leave_balance_settlements|leave_types|leave_balances/.test(q))
  assert.deepEqual(ours, [], 'فرق المخطط لجداول الترحيل صفر')
  // باقي الاختبار: أول سنة بالنسبة (الافتراضي الجديد)
  await repo('LeaveType').update({ id: types[0].id }, { firstYearProrated: true })
})

test('المعاينة بنطاق الفرع: المستحق والمستخدم والمتبقي واللي يترحّل (سقف 5) واللي يسقط', async () => {
  const preview = expectStatus(await request(users.hr, 'GET', `/leaves/year-end/${Y}`), 200)
  assert.deepEqual([preview.ended, preview.canClose, preview.settings.carryOverMaxDays], [true, true, 5])
  assert.deepEqual(preview.rows.map((r) => r.employee.id).sort(), [people.e1.id, people.e2.id].sort(), 'فرع المستخدم بس')
  const e1 = rowOf(preview, people.e1)
  assert.deepEqual([e1.period, e1.entitledTotal, e1.used, e1.remaining, e1.carried, e1.lapsed, e1.settleable, e1.closed], [Y, 21, 6, 15, 5, 10, 15, false])
  const e2 = rowOf(preview, people.e2)
  assert.deepEqual([e2.remaining, e2.carried, e2.lapsed], [21, 5, 16])
  assert.deepEqual([preview.totals.employees, preview.totals.remaining, preview.totals.carried, preview.totals.lapsed, preview.totals.pending], [2, 36, 10, 26, 2])
  // الفرع التاني: لمدير النظام بس
  expectStatus(await request(users.hr, 'GET', `/leaves/year-end/${Y}?branchId=${org.branchB.id}`), 403)
  const other = expectStatus(await request(users.admin, 'GET', `/leaves/year-end/${Y}?branchId=${org.branchB.id}`), 200)
  assert.deepEqual(other.rows.map((r) => r.employee.id), [people.e3.id])
  // اللي بيشوف الإجازات بس: يعاين ومايسوّيش ولا يقفل ولا يشوف مبالغ التسويات
  expectStatus(await request(users.viewer, 'GET', `/leaves/year-end/${Y}`), 200)
  expectStatus(await request(users.viewer, 'POST', `/leaves/year-end/${Y}/close`, {}), 403)
  expectStatus(await request(users.viewer, 'GET', `/leaves/year-end/${Y}/settlements`), 403)
})

test('تسوية مصروفة قبل الإقفال: بدل الأيام × الراتب ÷ 30 في شهر المسير كإضافة، والرصيد صفر، وإعادة الطلب مابتكررش', async () => {
  const body = { mode: 'PAID', reason: 'تسوية رصيد نهاية السنة بموافقة الإدارة', payrollPeriod: PAY_MONTH, expectedDays: 21, idempotencyKey: uuid() }
  // الصرف محتاج صلاحية حساب الرواتب
  expectStatus(await request(users.hrNoPay, 'POST', `/leaves/year-end/${Y}/settle/${people.e2.id}`, { ...body, idempotencyKey: uuid() }), 403)
  // رقم الشاشة قديم = تعارض
  expectStatus(await request(users.hr, 'POST', `/leaves/year-end/${Y}/settle/${people.e2.id}`, { ...body, expectedDays: 20, idempotencyKey: uuid() }), 409)
  // موظف فرع تاني = مش موجود
  expectStatus(await request(users.hr, 'POST', `/leaves/year-end/${Y}/settle/${people.e3.id}`, { ...body, idempotencyKey: uuid() }), 404)
  const done = expectStatus(await request(users.hr, 'POST', `/leaves/year-end/${Y}/settle/${people.e2.id}`, body), 201)
  assert.deepEqual([done.replayed, done.settlement.days, done.settlement.amount, done.settlement.payrollPeriod], [false, 21, 4200, PAY_MONTH])
  // الراتب وقت التسوية محفوظ في السجل للمراجعة، ومش راجع في الرد
  assert.equal(done.settlement.monthlySalary, undefined)
  assert.equal(Number((await repo('LeaveBalanceSettlement').findOneByOrFail({ id: done.settlement.id })).monthlySalary), 6000)
  assert.deepEqual([done.balance.remaining, done.balance.settled, done.balance.carried, done.balance.lapsed], [0, 21, 0, 0])
  const obligation = await repo('EmployeeObligation').findOneByOrFail({ id: done.settlement.obligationId })
  assert.deepEqual([obligation.employeeId, obligation.type, obligation.category, Number(obligation.amount), obligation.status, obligation.targetPeriod, obligation.sourceRef],
    [people.e2.id, 'CREDIT', 'allowance', 4200, 'PENDING', PAY_MONTH, `leave-settlement:${done.settlement.id}`])
  assert.equal(Number((await balanceRow(people.e2.id, Y)).settledDays), 21, 'صف السنة اتحفظ بالتسوية')
  const replay = expectStatus(await request(users.hr, 'POST', `/leaves/year-end/${Y}/settle/${people.e2.id}`, body), 201)
  assert.deepEqual([replay.replayed, replay.settlement.id], [true, done.settlement.id])
  assert.equal(await repo('EmployeeObligation').countBy({ employeeId: people.e2.id }), 1)
  expectStatus(await request(users.hr, 'POST', `/leaves/year-end/${Y}/settle/${people.e2.id}`, { ...body, idempotencyKey: uuid() }), 400)
  const history = expectStatus(await request(users.hr, 'GET', `/leaves/year-end/${Y}/settlements`), 200)
  assert.deepEqual(history.map((h) => [h.employeeName, h.days, h.mode, h.actorName]), [[people.e2.fullName, 21, 'PAID', 'hr-a']])
})

test('إقفال السنة لفرع: المُرحّل لحد السقف، والمسوّى مايترحّلش، والفرع التاني ماتلمسش، والتكرار آمن، والإجازة في السنة الجديدة بتتخصم صح', async () => {
  expectStatus(await request(users.hr, 'POST', `/leaves/year-end/${NY}/close`, {}), 400)
  expectStatus(await request(users.hr, 'POST', `/leaves/year-end/${Number(Y) - 1}/close`, {}), 400)
  const closed = expectStatus(await request(users.hr, 'POST', `/leaves/year-end/${Y}/close`, {}), 201)
  assert.equal(closed.branchId, org.branchA.id)
  assert.deepEqual([closed.summary.closed, closed.summary.pending], [2, 0])
  const next1 = await balanceRow(people.e1.id, NY)
  assert.deepEqual([Number(next1.openingDays), Number(next1.taken), String(next1.openingExpiry).slice(0, 10)], [5, 2, `${NY}-12-31`], 'الإجازة اللي اتاخدت قبل الإقفال زي ما هي')
  assert.equal(Number((await balanceRow(people.e2.id, NY)).openingDays), 0, 'اتسوّى كله قبل الإقفال')
  assert.equal(await balanceRow(people.e3.id, NY), null, 'فرع تاني')
  const again = expectStatus(await request(users.hr, 'POST', `/leaves/year-end/${Y}/close`, {}), 201)
  assert.deepEqual([again.created, again.closingEnsured, again.ensured], [0, 0, 0])
  assert.equal(Number((await balanceRow(people.e1.id, NY)).openingDays), 5)
  const preview = expectStatus(await request(users.hr, 'GET', `/leaves/year-end/${Y}`), 200)
  const e1 = rowOf(preview, people.e1)
  assert.deepEqual([e1.closed, e1.carried, e1.lapsed, e1.settleable], [true, 5, 10, 10])
  // رصيد السنة الجديدة: 5 مُرحّل + 21 − 2 = 24، وإجازة معتمدة جديدة تاخد من المُرحّل الأول
  const balances = app.get(require('../src/requests/leave-balances.service').LeaveBalancesService)
  assert.equal((await balances.balanceOf(people.e1.id, 'annual', TODAY)).remaining, 24)
  await ds.transaction((em) => balances.deduct(em, people.e1.id, 'annual', 3, TODAY))
  const after1 = await balanceRow(people.e1.id, NY)
  assert.deepEqual([Number(after1.openingTaken), Number(after1.taken)], [3, 5])
  assert.equal((await balances.balanceOf(people.e1.id, 'annual', TODAY)).remaining, 21)
  // بعد الإقفال: التصفير على اللي سقط بس (10)، والمُرحّل يفضل في السنة الجديدة
  const zeroed = expectStatus(await request(users.hrNoPay, 'POST', `/leaves/year-end/${Y}/settle/${people.e1.id}`,
    { mode: 'ZEROED', reason: 'رصيد سقط حسب اللائحة', expectedDays: 10, idempotencyKey: uuid() }), 201)
  assert.deepEqual([zeroed.settlement.days, zeroed.settlement.amount, zeroed.settlement.obligationId, zeroed.balance.settleable], [10, null, null, 0])
  assert.equal(await repo('EmployeeObligation').countBy({ employeeId: people.e1.id }), 0)
  assert.equal(Number((await balanceRow(people.e1.id, NY)).openingDays), 5)
})

test('بداية استحقاق السنوية من شاشة الأنواع: الموظف الجديد قبل يوم الاستحقاق مايقدرش ياخد سنوي', async () => {
  const annual = await repo('LeaveType').findOneByOrFail({ code: 'ANNUAL' })
  const saved = expectStatus(await request(users.admin, 'PATCH', `/settings/leave-types/${annual.id}`, { entitlementStartMonths: 6, firstYearProrated: false }), 200)
  assert.deepEqual([saved.entitlementStartMonths, saved.firstYearProrated], [6, false])
  expectStatus(await request(users.admin, 'PATCH', `/settings/leave-types/${annual.id}`, { entitlementStartMonths: 61 }), 400)
  const joined = new Date(Date.now() - 60 * 86400000).toLocaleDateString('en-CA')
  const fresh = await repo('Employee').save({ employeeCode: 'LYE4', fullName: 'موظف LYE4', branchId: org.branchA.id, joinDate: joined, basicSalary: 5000, status: 'active' })
  const balances = app.get(require('../src/requests/leave-balances.service').LeaveBalancesService)
  await assert.rejects(balances.assertSufficient(fresh.id, 'annual', 1, TODAY), /الإجازة السنوية بتبدأ بعد 6 شهر من التعيين/)
  // موظف قديم مايتأثرش
  await balances.assertSufficient(people.e1.id, 'annual', 1, TODAY)
  // من يوم التعيين وأول سنة كاملة (سنوي): 21 يوم متاحة
  expectStatus(await request(users.admin, 'PATCH', `/settings/leave-types/${annual.id}`, { entitlementStartMonths: 0 }), 200)
  await balances.assertSufficient(fresh.id, 'annual', 21, TODAY)
})
