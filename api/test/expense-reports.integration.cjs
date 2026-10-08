'use strict'
// B5.3 (أ) على SQL حقيقي: تقارير المصروفات — الميزة الفرعية مقفولة افتراضيًا، الترحيلات 149–151، الفئات وحدودها، البنود والإيصالات، التقديم كطلب
// (الخادم بيثبّت الإجمالي والبنود)، الإرجاع والرفض، والاعتماد النهائي بقيد دائن واحد في الدفتر. و(ب): سلفة المأمورية (ترحيل 152) — طلبها، تسجيل
// صرفها، ربطها بتقرير، وتسويتها في اعتماده (دائن أو مدين أو من غير قيد)، وبند إخلاء الطرف. و(ج): حد الفئة بالدرجة (ترحيل 153)، وأسعار البدل اليومي
// (154) وبند البدل اليومي المحسوب من الخادم. قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const migrate = require('../scripts/db-migrate.cjs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_expense_reports_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_expense_reports_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-expense-reports-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/expenses/expense-reports')
const advanceRules = require('../src/expenses/travel-advances')
const { openOffboardingCase } = require('../src/offboarding/offboarding-open')
const MIGRATIONS = ['20261009_149_expense_categories.sql', '20261009_150_expense_reports.sql', '20261009_151_expense_lines.sql', '20261009_152_travel_advances.sql', '20261009_153_expense_category_limits.sql',
  '20261009_154_per_diem_rates.sql'].map(name => path.resolve(apiRoot, '..', 'docs', 'migrations', 'payroll', name))
const TABLES = ['expense_categories', 'expense_reports', 'expense_lines', 'travel_advances', 'expense_category_limits', 'per_diem_rates']
let master, pool, app, ds, base, modules, created = false, sequence = 0
const B = {}, E = {}, U = {}, C = {}, G = {}
const repo = name => { assert.match(database, NAME); assert.equal(ds.options.database, database); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token(user) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const raw = await response.text(); let parsed = null
  try { parsed = raw ? JSON.parse(raw) : null } catch { parsed = raw }
  return { status: response.status, body: parsed }
}
const ok = (response, status = 200) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const refused = (response, status, message) => { assert.deepEqual([response.status, response.body?.message], [status, message]) }
const employee = (name, branch) => repo('Employee').save({ employeeCode: 'EX' + ++sequence, fullName: name, branchId: branch.id, joinDate: '2020-01-01',
  basicSalary: 5000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'cash' })
const account = (label, branch, permissions, extra = {}) => repo('User').save({ email: `${label}@expense-reports.invalid`, displayName: 'حساب ' + label, passwordHash: 'test-only', role: 'employee', branchId: branch.id,
  permissions: JSON.stringify(permissions), ...extra })
const runMigrations = async () => { assert.match(database, NAME); for (const file of MIGRATIONS) for (const batch of migrate.splitBatches(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'))) await pool.request().batch(batch) }
const tablesExist = async () => (await pool.request().query(`SELECT ${TABLES.map(name => `OBJECT_ID(N'dbo.${name}', N'U') AS [${name}]`).join(', ')}`)).recordset[0]
const day = offset => new Date(Date.now() + offset * 86400000).toLocaleDateString('en-CA')
const file = (user, employeeId, entityType = 'request') => repo('StoredFile').save({ originalName: 'receipt.pdf', storedName: `2026-10/${crypto.randomUUID()}.pdf`, mime: 'application/pdf', size: 10, entityType,
  uploadedBy: user.id, employeeId })
const M = '/expenses/my'
const mine = async user => ok(await request(user, 'GET', M))
const reportOf = async (user, id) => (await mine(user)).reports.find(row => row.id === id)
const newReport = async (user, title = 'مأمورية') => ok(await request(user, 'POST', `${M}/reports`, { title }), 201).id
const line = (user, reportId, body) => request(user, 'POST', `${M}/reports/${reportId}/lines`, { expenseDate: day(-2), ...body })
const send = (user, reportId, extra = {}) => request(user, 'POST', '/requests', { typeCode: 'EXPENSE_REPORT', payload: { reportId, ...extra }, submit: true })
const act = (user, id, action, note) => request(user, 'POST', `/requests/${id}/act`, { action, ...(note ? { comment: note } : {}) })
const entries = requestId => repo('EmployeeObligation').find({ where: { sourceRequestId: requestId } })

before(async () => {
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  const connection = { server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD, options: { encrypt: false, trustServerCertificate: true } }
  master = await new sql.ConnectionPool({ ...connection, database: 'master' }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  // مفيش رسالة بريد حقيقية بتطلع من الاختبار
  const mail = app.get(require('../src/auth/mail.service').MailService)
  mail.isConfigured = () => false
  mail.send = async () => { throw new Error('no mail in tests') }
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1'); ds = app.get(require('../node_modules/typeorm').DataSource)
  assert.equal(ds.options.database, database)
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  pool = await new sql.ConnectionPool({ ...connection, database }).connect()
  modules = app.get(require('../src/modules-registry/modules.service').ModulesService)
  B.riyadh = await repo('Branch').save({ code: 'EX_1', name: 'فرع الرياض', country: 'SA' })
  B.cairo = await repo('Branch').save({ code: 'EX_2', name: 'فرع القاهرة', country: 'EG' })
  U.admin = await repo('User').save({ email: 'admin@expense-reports.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', scopeAllBranches: true, permissions: '[]' })
  E.one = await employee('موظف أول', B.riyadh); E.two = await employee('موظف تاني', B.riyadh); E.cairo = await employee('موظف القاهرة', B.cairo)
  U.one = await account('one', B.riyadh, [], { employeeId: E.one.id }); U.two = await account('two', B.riyadh, [], { employeeId: E.two.id }); U.cairo = await account('cairo', B.cairo, [], { employeeId: E.cairo.id })
  U.finance = await account('finance', B.riyadh, ['expenses.manage']); U.financeCairo = await account('finance-cairo', B.cairo, ['expenses.manage'])
  U.approver = await account('approver', B.riyadh, ['approve.hr', 'requests.view_all'], { scopeAllBranches: true })
  U.loose = await account('loose', B.riyadh, [])
  const chain = await repo('ApprovalChain').save({ code: 'EX_HR', nameAr: 'سلسلة تقارير المصروفات', isActive: true, autoApprove: false })
  await repo('ApprovalStep').save({ chainId: chain.id, stepOrder: 1, approverRole: 'hr' })
  await repo('RequestType').save({ code: 'EXPENSE_REPORT', nameAr: 'تقرير مصروفات', category: 'financial', destinationHandler: rules.EXPENSE_REPORT_HANDLER, approvalChainId: chain.id, isActive: true,
    requiredFields: JSON.stringify(['reportId']) })
  await repo('RequestType').save({ code: 'TRAVEL_ADVANCE', nameAr: 'سلفة مأمورية', category: 'financial', destinationHandler: advanceRules.TRAVEL_ADVANCE_HANDLER, approvalChainId: chain.id, isActive: true,
    requiredFields: JSON.stringify(['amount', 'reason']) })
}, { timeout: 120000 })

after(async t => {
  if (app) await app.close()
  if (pool) await pool.close()
  try {
    if (created) {
      assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('database', database).query('SELECT DB_ID(@database) AS id')).recordset[0].id, null)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } finally {
    if (master) await master.close()
    fs.rmSync(uploads, { recursive: true, force: true })
  }
})

test('EX-01: الميزة الفرعية مقفولة افتراضيًا = مفيش مسار ولا نوع طلب؛ وقبل الترحيلات الشاشة بتقول ناقص؛ والترحيلات بشكل الكيانات وبتتكرر بأمان', async () => {
  assert.equal(await modules.isFeatureEnabled(rules.EXPENSE_REPORTS_FEATURE), false)
  assert.deepEqual([(await request(U.one, 'GET', M)).status, (await request(U.admin, 'GET', '/expenses/overview')).status, (await request(U.one, 'POST', `${M}/reports`, { title: 'مأمورية' })).status], [404, 404, 404])
  // النوع مش في الكتالوج، والتقديم بيه زي نوع مش موجود — والطلب البسيط القائم مالوش علاقة
  assert.equal(ok(await request(U.one, 'GET', '/requests/types')).some(row => row.code === 'EXPENSE_REPORT'), false)
  refused(await send(U.one, 1), 404, 'نوع الطلب غير موجود')
  assert.equal(await repo('Request').count(), 0)
  ok(await request(U.admin, 'PUT', `/modules/features/${rules.EXPENSE_REPORTS_FEATURE}`, { enabled: true })); modules.invalidate()
  for (const migration of MIGRATIONS) {
    const text = fs.readFileSync(migration), code = path.basename(migration).split('_')[1]
    assert.equal(text.includes(Buffer.from('\r\n')), false, 'LF بس — git بيخزّن الملف LF')
    assert.notDeepEqual([...text.subarray(0, 3)], [0xef, 0xbb, 0xbf])
    assert.ok(String(text).match(/THROW \d+/g).every(found => new RegExp(`^THROW ${code}0\\d\\d$`).test(found)), code)
    assert.doesNotMatch(String(text), /\bDROP\b|\bTRUNCATE\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b/i)
  }
  // الترحيل على جداول الكيانات (synchronize) بيعدّي = نفس الشكل
  await runMigrations()
  for (const name of [...TABLES].reverse()) await pool.request().batch(`DROP TABLE dbo.${name}`)
  rules.resetExpenseReportsCache(); advanceRules.resetTravelAdvancesCache()
  assert.deepEqual(Object.values(await tablesExist()), [null, null, null, null, null, null])
  assert.deepEqual(await mine(U.one), { ready: false, currency: null, requestTypeCode: null, advanceTypeCode: null, categories: [], reports: [], advances: [], perDiem: [] })
  assert.deepEqual(ok(await request(U.admin, 'GET', '/expenses/overview')), { ready: false, canEdit: true, categories: [], grades: [], rates: [], reports: [], advances: [] })
  refused(await request(U.one, 'POST', '/requests', { typeCode: 'TRAVEL_ADVANCE', payload: { amount: 100, reason: 'مأمورية' }, submit: true }), 400, advanceRules.ADVANCE_MIGRATION_MISSING)
  refused(await request(U.one, 'POST', `${M}/reports`, { title: 'مأمورية' }), 400, rules.EXPENSE_MIGRATION_MISSING)
  refused(await request(U.admin, 'POST', '/expenses/categories', { name: 'انتقالات' }), 400, rules.EXPENSE_MIGRATION_MISSING)
  // ترحيل واحد ناقص (154: أسعار البدل اليومي) = الميزة لسه مش جاهزة
  for (const file of MIGRATIONS.slice(0, 5)) for (const batch of migrate.splitBatches(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'))) await pool.request().batch(batch)
  assert.equal((await mine(U.one)).ready, false)
  await runMigrations(); await runMigrations()
  assert.ok(Object.values(await tablesExist()).every(id => id != null))
  assert.deepEqual((await pool.request().query(`SELECT COL_LENGTH(N'dbo.expense_lines', N'perDiemRateId') AS a, COL_LENGTH(N'dbo.expense_lines', N'perDiemDays') AS b`)).recordset[0], { a: 4, b: 4 })
  const ready = await mine(U.one)
  assert.deepEqual([ready.ready, ready.currency, ready.requestTypeCode, ready.advanceTypeCode, ready.reports, ready.advances], [true, 'SAR', 'EXPENSE_REPORT', 'TRAVEL_ADVANCE', [], []])
  assert.equal((await mine(U.cairo)).currency, 'EGP')
  // النوع ظهر في الكتالوج بحقل رقم التقرير بس
  const type = ok(await request(U.one, 'GET', '/requests/types')).find(row => row.code === 'EXPENSE_REPORT')
  assert.deepEqual([JSON.parse(type.requiredFields), JSON.parse(type.customFields).map(field => field.key)], [['reportId'], ['reportId']])
  // حساب من غير ملف موظف مالوش تقارير
  refused(await request(U.finance, 'GET', M), 403, 'حسابك مش مربوط بملف موظف')
})

test('EX-02: الفئات — تعريف للشركة كلها (الكتابة لحساب بكل الفروع)، بقيم متحكم فيها واسم مايتكررش، وبسطر تدقيق', async () => {
  assert.equal((await request(U.loose, 'GET', '/expenses/overview')).status, 403)
  assert.equal((await request(U.loose, 'POST', '/expenses/categories', { name: 'انتقالات' })).status, 403)
  // حساب فرع معاه الصلاحية: يقرا ومايكتبش
  assert.equal(ok(await request(U.finance, 'GET', '/expenses/overview')).canEdit, false)
  assert.equal((await request(U.finance, 'POST', '/expenses/categories', { name: 'انتقالات' })).status, 403)
  for (const [body, message] of [[{ name: 'ا' }, 'اسم الفئة من حرفين لحد 120 حرف'], [{ name: 'انتقالات', limitPerLine: -5 }, `حد البند مبلغ موجب بخانتين عشريتين بالكتير (لحد ${rules.LINE_AMOUNT_MAX})`],
    [{ name: 'انتقالات', limitPerLine: '10.555' }, `حد البند مبلغ موجب بخانتين عشريتين بالكتير (لحد ${rules.LINE_AMOUNT_MAX})`], [{ name: 'انتقالات', limitMode: 'STOP' }, 'وضع الحد «تحذير» أو «منع»'],
    [{ name: 'انتقالات', receiptRequired: 'yes' }, '«الإيصال إجباري» نعم أو لا']]) refused(await request(U.admin, 'POST', '/expenses/categories', body), 400, message)
  C.taxi = ok(await request(U.admin, 'POST', '/expenses/categories', { name: 'انتقالات', limitPerLine: 100, limitMode: 'WARN' }), 201).id
  C.hotel = ok(await request(U.admin, 'POST', '/expenses/categories', { name: 'إقامة', limitPerLine: 500, limitMode: 'BLOCK', receiptRequired: true }), 201).id
  C.meals = ok(await request(U.admin, 'POST', '/expenses/categories', { name: 'وجبات' }), 201).id
  C.old = ok(await request(U.admin, 'POST', '/expenses/categories', { name: 'فئة قديمة' }), 201).id
  refused(await request(U.admin, 'POST', '/expenses/categories', { name: ' انتقالات ' }), 409, 'فيه فئة بنفس الاسم')
  refused(await request(U.admin, 'PATCH', `/expenses/categories/${C.meals}`, { name: 'إقامة' }), 409, 'فيه فئة بنفس الاسم')
  refused(await request(U.admin, 'PATCH', '/expenses/categories/999999', { name: 'حاجة' }), 404, 'فئة المصروف مش موجودة')
  ok(await request(U.admin, 'PATCH', `/expenses/categories/${C.old}`, { name: 'فئة قديمة', isActive: false }))
  const all = ok(await request(U.finance, 'GET', '/expenses/overview')).categories
  assert.deepEqual(all.map(row => [row.name, row.limitPerLine, row.limitMode, row.receiptRequired, row.isActive]).sort((a, b) => a[0].localeCompare(b[0], 'ar')),
    [['إقامة', 500, 'BLOCK', true, true], ['انتقالات', 100, 'WARN', false, true], ['فئة قديمة', null, 'WARN', false, false], ['وجبات', null, 'WARN', false, true]].sort((a, b) => a[0].localeCompare(b[0], 'ar')))
  // الموظف بيشوف المفعّل بس
  assert.deepEqual((await mine(U.one)).categories.map(row => row.id).sort(), [C.taxi, C.hotel, C.meals].sort())
  const audit = await pool.request().query(`SELECT [action], COUNT(*) AS n FROM dbo.audit_log WHERE [entityType] = N'expense_category' GROUP BY [action]`)
  assert.deepEqual(Object.fromEntries(audit.recordset.map(row => [row.action, Number(row.n)])), { EXPENSE_CATEGORY_CREATED: 4, EXPENSE_CATEGORY_UPDATED: 1 })
})

test('EX-03: التقرير وبنوده — للموظف لنفسه بس، البند بحكم الفئة (منع بيرفض، تحذير بيتعلّم)، والإيصال ملفه هو بنوع «طلب»', async () => {
  for (const [body, message] of [[{ title: 'م' }, 'عنوان التقرير من حرفين لحد 200 حرف'], [{ title: 'مأمورية', tripFrom: day(-3) }, 'فترة المأمورية: تاريخ البداية والنهاية الاتنين (أو سيبهم فاضيين)'],
    [{ title: 'مأمورية', tripFrom: day(-1), tripTo: day(-3) }, 'نهاية المأمورية قبل بدايتها']]) refused(await request(U.one, 'POST', `${M}/reports`, body), 400, message)
  const id = ok(await request(U.one, 'POST', `${M}/reports`, { title: 'مأمورية جدة', tripFrom: day(-5), tripTo: day(-3) }), 201).id
  E.report = id
  // تقرير حد تاني زي اللي مش موجود
  refused(await line(U.two, id, { categoryId: C.meals, amount: 10 }), 404, rules.REPORT_NOT_FOUND)
  refused(await request(U.two, 'PATCH', `${M}/reports/${id}`, { title: 'عنوان تاني' }), 404, rules.REPORT_NOT_FOUND)
  refused(await request(U.two, 'DELETE', `${M}/reports/${id}`), 404, rules.REPORT_NOT_FOUND)
  assert.equal((await mine(U.two)).reports.length, 0)
  for (const [body, message] of [[{ amount: 10 }, 'اختار فئة المصروف'], [{ categoryId: C.meals, amount: 10, expenseDate: day(2) }, 'تاريخ المصروف في المستقبل'],
    [{ categoryId: C.meals, amount: 0 }, `مبلغ البند موجب بخانتين عشريتين بالكتير (لحد ${rules.LINE_AMOUNT_MAX})`], [{ categoryId: C.meals, amount: '12.345' }, `مبلغ البند موجب بخانتين عشريتين بالكتير (لحد ${rules.LINE_AMOUNT_MAX})`],
    [{ categoryId: 999999, amount: 10 }, 'فئة المصروف مش موجودة'], [{ categoryId: C.old, amount: 10 }, 'فئة «فئة قديمة» مقفولة — غيّر فئة البند'],
    [{ categoryId: C.hotel, amount: 500.01 }, 'بند «إقامة» بمبلغ 500.01 فوق حد الفئة 500.00']]) refused(await line(U.one, id, body), 400, message)
  // الإيصال: ملف غيره، أو ملفه بنوع تاني، أو ملف مش موجود — مرفوض
  const others = await file(U.two, E.two.id), wrongType = await file(U.one, E.one.id, 'document'), own = await file(U.one, E.one.id)
  for (const receiptFileId of [others.id, wrongType.id, 999999]) refused(await line(U.one, id, { categoryId: C.hotel, amount: 300, receiptFileId }), 400, 'إيصال البند لازم يكون ملف رفعته إنت لنفسك من الشاشة دي')
  // حد «تحذير»: بيتحفظ وبيتعلّم؛ حد «منع» عند الحد بالظبط بيعدّي
  assert.deepEqual(ok(await line(U.one, id, { categoryId: C.taxi, amount: 150.5, note: '  تاكسي   المطار ' }), 201).warning, 'فوق حد الفئة (100.00)')
  const hotel = ok(await line(U.one, id, { categoryId: C.hotel, amount: 500 }), 201)
  assert.equal(hotel.warning, null)
  const report = await reportOf(U.one, id)
  assert.deepEqual([report.code, report.phase, report.editable, report.total, report.tripFrom, report.tripTo, report.requestId], [rules.reportCode(id), 'DRAFT', true, 650.5, day(-5), day(-3), null])
  assert.deepEqual(report.lines.map(row => [row.categoryName, row.amount, row.note, row.warning, row.problem, row.receiptFileId]),
    [['انتقالات', 150.5, 'تاكسي المطار', 'فوق حد الفئة (100.00)', null, null], ['إقامة', 500, null, null, 'بند «إقامة» محتاج إيصال', null]])
  // تعديل بند وحذفه
  ok(await request(U.one, 'PATCH', `${M}/reports/${id}/lines/${hotel.id}`, { categoryId: C.hotel, expenseDate: day(-4), amount: 480, receiptFileId: own.id }))
  refused(await request(U.one, 'PATCH', `${M}/reports/${id}/lines/999999`, { categoryId: C.meals, expenseDate: day(-4), amount: 5 }), 404, 'البند مش موجود')
  const extra = ok(await line(U.one, id, { categoryId: C.meals, amount: 20 }), 201).id
  ok(await request(U.one, 'DELETE', `${M}/reports/${id}/lines/${extra}`))
  refused(await request(U.one, 'DELETE', `${M}/reports/${id}/lines/${extra}`), 404, 'البند مش موجود')
  assert.deepEqual((await reportOf(U.one, id)).lines.map(row => [row.amount, row.problem, row.receiptFileId]), [[480, null, own.id], [150.5, null, null]])
  // مسودة عمرها ما اتقدّمت بتتمسح ببنودها
  const scrap = await newReport(U.one, 'مسودة غلط'); ok(await line(U.one, scrap, { categoryId: C.meals, amount: 5 }), 201)
  ok(await request(U.one, 'DELETE', `${M}/reports/${scrap}`))
  assert.deepEqual([await repo('ExpenseReport').count({ where: { id: scrap } }), await repo('ExpenseLine').count({ where: { reportId: scrap } })], [0, 0])
  // ولا قيد ولا طلب لحد دلوقتي
  assert.deepEqual([await repo('EmployeeObligation').count(), await repo('Request').count()], [0, 0])
})

test('EX-04: التقديم — تقرير فاضي أو بإيصال إجباري ناقص مرفوض من غير طلب؛ والخادم بيثبّت الإجمالي والبنود فوق أي قيمة من العميل، والتقرير بيتقفل', async () => {
  const empty = await newReport(U.one, 'تقرير فاضي')
  refused(await send(U.one, empty), 400, rules.REPORT_EMPTY)
  const needs = await newReport(U.one, 'محتاج إيصال'); ok(await line(U.one, needs, { categoryId: C.hotel, amount: 100 }), 201)
  refused(await send(U.one, needs), 400, 'بند «إقامة» محتاج إيصال')
  // تقرير غيره، أو رقم مش رقم، زي اللي مش موجود
  for (const reportId of [E.report, 999999]) refused(await send(U.two, reportId), 400, rules.REPORT_NOT_FOUND)
  assert.equal(await repo('Request').count(), 0)
  assert.deepEqual([(await reportOf(U.one, empty)).phase, (await reportOf(U.one, needs)).phase], ['DRAFT', 'DRAFT'])
  // العميل بعت مبلغ وبنود من عنده: الخادم بيكتب فوقهم
  const sent = ok(await send(U.one, E.report, { amount: 999999, lines: [{ category: 'مزوّر', amount: 1 }], reportTitle: 'عنوان مزوّر' }), 201)
  E.request = sent.id
  const stored = JSON.parse((await repo('Request').findOneByOrFail({ id: sent.id })).payload)
  const receipt = (await reportOf(U.one, E.report)).lines.find(row => row.categoryName === 'إقامة').receiptFileId
  assert.deepEqual(stored, { reportId: E.report, amount: 630.5, reportTitle: 'مأمورية جدة', tripFrom: day(-5), tripTo: day(-3), lines: [
    { category: 'إقامة', date: day(-4), amount: 480, note: null, receipt: `file:${receipt}`, warning: null },
    { category: 'انتقالات', date: day(-2), amount: 150.5, note: 'تاكسي المطار', receipt: null, warning: 'فوق حد الفئة (100.00)' }] })
  const row = await repo('ExpenseReport').findOneByOrFail({ id: E.report })
  assert.deepEqual([row.status, row.requestId, Number(row.totalAmount), row.obligationId], ['SUBMITTED', sent.id, 630.5, null])
  const pending = await reportOf(U.one, E.report)
  assert.deepEqual([pending.phase, pending.editable, pending.requestId], ['PENDING', false, sent.id])
  // تحت الاعتماد: لا بند ولا عنوان ولا مسح، ولا طلب تاني على نفس التقرير
  refused(await line(U.one, E.report, { categoryId: C.meals, amount: 10 }), 409, 'التقرير تحت الاعتماد أو اتعتمد — مايتعدّلش')
  refused(await request(U.one, 'PATCH', `${M}/reports/${E.report}`, { title: 'عنوان جديد' }), 409, 'التقرير تحت الاعتماد أو اتعتمد — مايتعدّلش')
  refused(await request(U.one, 'DELETE', `${M}/reports/${E.report}`), 409, 'التقرير تحت الاعتماد أو اتعتمد — مايتعدّلش')
  refused(await send(U.one, E.report), 409, rules.REPORT_BUSY)
  assert.equal(await repo('Request').count(), 1)
  // الإيصال: المعتمد بيوصله من الطلب (الملف نفسه مش على القرص في الاختبار = 404 بعد ما الاطلاع عدّى)، وغيره ممنوع
  assert.deepEqual([(await request(U.approver, 'GET', `/files/${receipt}`)).status, (await request(U.two, 'GET', `/files/${receipt}`)).status, (await request(U.loose, 'GET', `/files/${receipt}`)).status], [404, 403, 403])
  assert.equal(await repo('EmployeeObligation').count(), 0)
})

test('EX-05: الإرجاع للاستكمال بيفتح التعديل، وإعادة التقديم بتثبّت القيم الجديدة؛ والاعتماد النهائي قيد دائن واحد في الدفتر مربوط بالطلب', async () => {
  // غير المعتمد مايعتمدش
  assert.notEqual((await act(U.two, E.request, 'APPROVE')).status, 201)
  ok(await act(U.approver, E.request, 'RETURN', 'ضيف إيصال التاكسي'), 201)
  const back = await reportOf(U.one, E.report)
  assert.deepEqual([back.phase, back.editable], ['RETURNED', true])
  // طلب تاني على تقرير راجع للاستكمال مرفوض — صاحبه يكمّل نفس الطلب
  refused(await send(U.one, E.report), 409, rules.REPORT_BUSY)
  const taxi = back.lines.find(row => row.categoryName === 'انتقالات'), hotel = back.lines.find(row => row.categoryName === 'إقامة'), own = await file(U.one, E.one.id)
  ok(await request(U.one, 'PATCH', `${M}/reports/${E.report}/lines/${taxi.id}`, { categoryId: C.taxi, expenseDate: taxi.expenseDate, amount: 90, note: 'تاكسي المطار', receiptFileId: own.id }))
  ok(await request(U.one, 'POST', `/requests/${E.request}/resubmit`, {}), 201)
  const stored = JSON.parse((await repo('Request').findOneByOrFail({ id: E.request })).payload)
  assert.deepEqual([stored.amount, stored.lines.map(row => [row.amount, row.receipt, row.warning])], [570, [[480, `file:${hotel.receiptFileId}`, null], [90, `file:${own.id}`, null]]])
  assert.equal((await reportOf(U.one, E.report)).phase, 'PENDING')
  // بنود اتغيّرت من ورا الخادم بعد التقديم: الاعتماد بيقف ومفيش قيد
  await pool.request().query(`UPDATE dbo.expense_lines SET [amount] = 9000 WHERE [id] = ${Number(taxi.id)}`)
  refused(await act(U.approver, E.request, 'APPROVE'), 400, `لم يُعتمد الطلب — ${rules.REPORT_TOTAL_CHANGED}. الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات`)
  assert.equal((await repo('Request').findOneByOrFail({ id: E.request })).status === 'COMPLETED', false)
  assert.equal(await repo('EmployeeObligation').count(), 0)
  await pool.request().query(`UPDATE dbo.expense_lines SET [amount] = 90 WHERE [id] = ${Number(taxi.id)}`)
  ok(await act(U.approver, E.request, 'APPROVE'), 201)
  const made = await entries(E.request)
  assert.deepEqual(made.map(entry => [entry.employeeId, entry.type, entry.category, Number(entry.amount), entry.status, entry.label]),
    [[E.one.id, 'CREDIT', 'expense', 570, 'PENDING', `مصروفات: تقرير ${rules.reportCode(E.report)} — مأمورية جدة`]])
  const row = await repo('ExpenseReport').findOneByOrFail({ id: E.report })
  assert.deepEqual([row.status, row.obligationId, row.approvedAt != null], ['APPROVED', made[0].id, true])
  const done = await reportOf(U.one, E.report)
  assert.deepEqual([done.phase, done.editable], ['APPROVED', false])
  // بعد الاعتماد: لا تعديل، ولا طلب تاني بيصرفه تاني
  refused(await line(U.one, E.report, { categoryId: C.meals, amount: 10 }), 409, 'التقرير تحت الاعتماد أو اتعتمد — مايتعدّلش')
  refused(await send(U.one, E.report), 409, rules.REPORT_DONE)
  assert.notEqual((await act(U.approver, E.request, 'APPROVE')).status, 201)
  assert.equal(await repo('EmployeeObligation').count(), 1)
})

test('EX-06: الرفض بيفكّ التقرير: بيتعدّل ويتقدّم في طلب جديد، والقيد للطلب المعتمد بس؛ وطلب قديم على تقرير اتربط بغيره مايصرفش', async () => {
  const id = await newReport(U.two, 'مصروفات مكتب'); ok(await line(U.two, id, { categoryId: C.meals, amount: 40 }), 201)
  const first = ok(await send(U.two, id), 201)
  ok(await act(U.approver, first.id, 'REJECT', 'مش واضح'), 201)
  const rejected = await reportOf(U.two, id)
  assert.deepEqual([rejected.phase, rejected.editable, rejected.requestId], ['REJECTED', true, first.id])
  ok(await line(U.two, id, { categoryId: C.taxi, amount: 60 }), 201)
  const second = ok(await send(U.two, id), 201)
  assert.notEqual(second.id, first.id)
  assert.deepEqual([(await repo('ExpenseReport').findOneByOrFail({ id })).requestId, JSON.parse((await repo('Request').findOneByOrFail({ id: second.id })).payload).amount], [second.id, 100])
  // تنفيذ الطلب المرفوض (لو اتنادى) مايلاقيش تقريره مربوط بيه
  await assert.rejects(ds.transaction(async em => rules.executeExpenseReport(em, await em.getRepository('Request').findOneByOrFail({ id: first.id }), null, { reportId: id, amount: 40 })), { message: rules.REPORT_NOT_LINKED })
  // وتقرير موظف تاني في حمولة طلب مقدّمه غيره مايتنفّذش
  await assert.rejects(ds.transaction(async em => rules.executeExpenseReport(em, { ...(await em.getRepository('Request').findOneByOrFail({ id: second.id })), requesterId: E.one.id }, null, { reportId: id, amount: 100 })),
    { message: rules.REPORT_NOT_LINKED })
  ok(await act(U.approver, second.id, 'APPROVE'), 201)
  assert.deepEqual([(await entries(first.id)).length, (await entries(second.id)).map(entry => [entry.employeeId, Number(entry.amount)])], [0, [[E.two.id, 100]]])
  // تنفيذ اتعاد لنفس الطلب بيرجّع نفس المرجع من غير قيد تاني
  const again = await ds.transaction(async em => rules.executeExpenseReport(em, await em.getRepository('Request').findOneByOrFail({ id: second.id }), null, { reportId: id, amount: 100 }))
  assert.deepEqual([again, (await entries(second.id)).length], [{ ref: rules.reportCode(id), completed: true }, 1])
  // فئة اتقفلت بعد حفظ البند: التقديم بيقف عندها
  const stale = await newReport(U.two, 'فئة هتتقفل'); ok(await line(U.two, stale, { categoryId: C.meals, amount: 15 }), 201)
  ok(await request(U.admin, 'PATCH', `/expenses/categories/${C.meals}`, { name: 'وجبات', isActive: false }))
  refused(await send(U.two, stale), 400, 'فئة «وجبات» مقفولة — غيّر فئة البند')
  assert.equal((await reportOf(U.two, stale)).lines[0].problem, 'فئة «وجبات» مقفولة — غيّر فئة البند')
  ok(await request(U.admin, 'PATCH', `/expenses/categories/${C.meals}`, { name: 'وجبات', isActive: true }))
})

test('EX-07: شاشة الإدارة — التقارير المتقدّمة لموظفين نطاق الحساب بفرعهم الحالي وبعملته؛ والميزة لما تتقفل النوع بيختفي والطلب المفتوح بيكمّل', async () => {
  const cairo = await newReport(U.cairo, 'مأمورية القاهرة'); ok(await line(U.cairo, cairo, { categoryId: C.taxi, amount: 70 }), 201)
  const open = ok(await send(U.cairo, cairo), 201)
  const riyadh = ok(await request(U.finance, 'GET', '/expenses/overview')).reports
  assert.deepEqual(riyadh.map(row => [row.employeeName, row.phase, row.total, row.currency]).sort((a, b) => a[2] - b[2]), [['موظف تاني', 'APPROVED', 100, 'SAR'], ['موظف أول', 'APPROVED', 570, 'SAR']])
  assert.deepEqual(ok(await request(U.financeCairo, 'GET', '/expenses/overview')).reports.map(row => [row.employeeName, row.phase, row.total, row.currency, row.requestId]), [['موظف القاهرة', 'PENDING', 70, 'EGP', open.id]])
  assert.equal(ok(await request(U.admin, 'GET', '/expenses/overview')).reports.length, 3)
  // المسودات مش في شاشة الإدارة
  assert.equal(ok(await request(U.admin, 'GET', '/expenses/overview')).reports.some(row => row.phase === 'DRAFT'), false)
  // الموظف اتنقل: التقرير بيتبع فرعه الحالي
  await repo('Employee').update({ id: E.two.id }, { branchId: B.cairo.id })
  assert.deepEqual(ok(await request(U.finance, 'GET', '/expenses/overview')).reports.map(row => row.employeeName), ['موظف أول'])
  assert.equal(ok(await request(U.financeCairo, 'GET', '/expenses/overview')).reports.length, 2)
  await repo('Employee').update({ id: E.two.id }, { branchId: B.riyadh.id })
  // قفل الميزة: مفيش مسار ولا نوع ولا تقديم جديد، والطلب المفتوح بيكمّل سلسلته وبيتصرف
  ok(await request(U.admin, 'PUT', `/modules/features/${rules.EXPENSE_REPORTS_FEATURE}`, { enabled: false })); modules.invalidate()
  assert.deepEqual([(await request(U.cairo, 'GET', M)).status, ok(await request(U.cairo, 'GET', '/requests/types')).some(row => row.code === 'EXPENSE_REPORT')], [404, false])
  refused(await send(U.cairo, cairo), 404, 'نوع الطلب غير موجود')
  ok(await act(U.approver, open.id, 'APPROVE'), 201)
  assert.deepEqual((await entries(open.id)).map(entry => [entry.employeeId, Number(entry.amount), entry.category]), [[E.cairo.id, 70, 'expense']])
  ok(await request(U.admin, 'PUT', `/modules/features/${rules.EXPENSE_REPORTS_FEATURE}`, { enabled: true })); modules.invalidate()
  assert.equal((await reportOf(U.cairo, cairo)).phase, 'APPROVED')
})

const askAdvance = (user, amount, reason = 'مأمورية الدمام') => request(user, 'POST', '/requests', { typeCode: 'TRAVEL_ADVANCE', payload: { amount, reason }, submit: true })
const step = (user, id, name, note) => request(user, 'POST', `/expenses/advances/${id}/steps/${name}`, note === undefined ? {} : { note })
const attach = (user, reportId, advanceId) => request(user, 'PUT', `${M}/reports/${reportId}/advance`, { advanceId })
/** سلفة معتمدة (ومصروفة لو `paid`) لموظف */
async function advanceFor(user, amount, paid = true) {
  const sent = ok(await askAdvance(user, amount), 201)
  ok(await act(U.approver, sent.id, 'APPROVE'), 201)
  const row = await repo('TravelAdvance').findOneByOrFail({ requestId: sent.id })
  if (paid) ok(await step(U.admin, row.id, 'paid'), 201)
  return row.id
}

test('EX-08: سلفة المأمورية — الاعتماد بيسجّلها مفتوحة من غير قيد؛ المالية بتسجّل الصرف لموظفين نطاقها؛ والربط بتقرير صاحبها بعد الصرف بس، سلفة واحدة لتقرير واحد', async () => {
  const before = await repo('EmployeeObligation').count()
  refused(await askAdvance(U.one, 0), 400, advanceRules.ADVANCE_AMOUNT)
  refused(await askAdvance(U.one, '12.345'), 400, advanceRules.ADVANCE_AMOUNT)
  refused(await askAdvance(U.one, 1000, 'م'), 400, advanceRules.ADVANCE_PURPOSE)
  const sent = ok(await askAdvance(U.one, '1000.50', '  مأمورية   الدمام '), 201)
  assert.deepEqual([JSON.parse((await repo('Request').findOneByOrFail({ id: sent.id })).payload).amount, await repo('TravelAdvance').count()], [1000.5, 0])
  ok(await act(U.approver, sent.id, 'APPROVE'), 201)
  const row = await repo('TravelAdvance').findOneByOrFail({ requestId: sent.id })
  assert.deepEqual([row.employeeId, Number(row.amount), row.purpose, row.status, row.paidAt, row.reportId], [E.one.id, 1000.5, 'مأمورية الدمام', 'OPEN', null, null])
  assert.equal(await repo('EmployeeObligation').count(), before, 'السلفة من غير قيد في الدفتر')
  // تنفيذ اتعاد لنفس الطلب: نفس السلفة
  const again = await ds.transaction(async em => advanceRules.executeTravelAdvance(em, await em.getRepository('Request').findOneByOrFail({ id: sent.id }), null, { amount: 1000.5, reason: 'مأمورية الدمام' }))
  assert.deepEqual([again, await repo('TravelAdvance').count({ where: { requestId: sent.id } })], [{ ref: advanceRules.advanceCode(row.id), completed: true }, 1])
  const own = (await mine(U.one)).advances
  assert.deepEqual(own.map(item => [item.id, item.code, item.amount, item.status, item.paid, item.reportId]), [[row.id, advanceRules.advanceCode(row.id), 1000.5, 'OPEN', false, null]])
  assert.deepEqual((await mine(U.two)).advances, [])
  // الربط قبل الصرف مرفوض؛ وسلفة غيره زي اللي مش موجودة
  const report = await newReport(U.one, 'مأمورية الدمام'); E.tripReport = report; E.tripAdvance = row.id
  refused(await attach(U.one, report, row.id), 400, 'السلفة لسه مااتسجّلش صرفها — ماتتربطش بتقرير')
  const foreign = await newReport(U.two, 'تقرير موظف تاني')
  refused(await attach(U.two, foreign, row.id), 404, advanceRules.ADVANCE_NOT_FOUND)
  refused(await attach(U.one, report, 999999), 404, advanceRules.ADVANCE_NOT_FOUND)
  refused(await attach(U.one, report, 'x'), 400, advanceRules.ADVANCE_NOT_FOUND)
  // خطوات المالية: بالصلاحية، ولموظف في نطاق الحساب (غيره «مش موجودة»)، و«اترجّعت» بعد الصرف وبملاحظة
  assert.equal((await step(U.loose, row.id, 'paid')).status, 403)
  refused(await step(U.financeCairo, row.id, 'paid'), 404, advanceRules.ADVANCE_NOT_FOUND)
  refused(await step(U.finance, row.id, 'cancel'), 400, 'الخطوة «اتصرفت» أو «اترجّعت»')
  refused(await step(U.finance, row.id, 'returned', 'اترجّعت للخزينة'), 400, 'السلفة لسه مااتسجّلش صرفها — ماتتربطش بتقرير')
  ok(await step(U.finance, row.id, 'paid'), 201)
  refused(await step(U.finance, row.id, 'paid'), 409, 'صرف السلفة متسجّل قبل كده')
  const paid = await repo('TravelAdvance').findOneByOrFail({ id: row.id })
  assert.deepEqual([paid.paidAt != null, paid.paidByUserId, paid.status], [true, U.finance.id, 'OPEN'])
  // الربط: سلفة واحدة للتقرير وتقرير واحد للسلفة؛ والمربوطة ماتتقفلش «اترجّعت»
  ok(await attach(U.one, report, row.id))
  const other = await newReport(U.one, 'تقرير تاني')
  refused(await attach(U.one, other, row.id), 409, 'السلفة مربوطة بتقرير تاني — فكّها منه الأول')
  refused(await step(U.finance, row.id, 'returned', 'اترجّعت للخزينة'), 409, 'السلفة مربوطة بتقرير مصروفات — التسوية بتتم باعتماده')
  const linked = await reportOf(U.one, report)
  assert.deepEqual([linked.advance, linked.net, linked.total], [{ id: row.id, code: advanceRules.advanceCode(row.id), amount: 1000.5 }, -1000.5, 0])
  ok(await attach(U.one, report, null))
  assert.deepEqual([(await reportOf(U.one, report)).advance, (await repo('TravelAdvance').findOneByOrFail({ id: row.id })).reportId], [null, null])
  // مسح مسودة مربوطة بسلفة بيفكّها
  ok(await attach(U.one, other, row.id)); ok(await request(U.one, 'DELETE', `${M}/reports/${other}`))
  assert.equal((await repo('TravelAdvance').findOneByOrFail({ id: row.id })).reportId, null)
  // «اترجّعت نقدًا»: بملاحظة، وبتقفل السلفة من غير قيد
  const cash = await advanceFor(U.two, 300)
  refused(await step(U.finance, cash, 'returned', ' '), 400, 'اكتب ملاحظة القفل (من حرفين لحد 300 حرف)')
  ok(await step(U.finance, cash, 'returned', 'المأمورية اتلغت واترجّعت للخزينة'), 201)
  refused(await step(U.finance, cash, 'returned', 'تاني'), 409, 'السلفة اتقفلت قبل كده')
  refused(await attach(U.two, foreign, cash), 409, 'السلفة اتقفلت قبل كده')
  const closed = await repo('TravelAdvance').findOneByOrFail({ id: cash })
  assert.deepEqual([closed.status, closed.closeNote, closed.closedByUserId, closed.closedAt != null], ['RETURNED', 'المأمورية اتلغت واترجّعت للخزينة', U.finance.id, true])
  assert.equal(await repo('EmployeeObligation').count(), before)
  const audit = await pool.request().query(`SELECT [action], COUNT(*) AS n FROM dbo.audit_log WHERE [entityType] = N'travel_advance' GROUP BY [action]`)
  assert.deepEqual(Object.fromEntries(audit.recordset.map(item => [item.action, Number(item.n)])), { TRAVEL_ADVANCE_PAID: 2, TRAVEL_ADVANCE_RETURNED: 1 })
  // نظرة المالية: سلف موظفين النطاق بس
  assert.deepEqual(ok(await request(U.finance, 'GET', '/expenses/overview')).advances.map(item => [item.id, item.employeeName, item.status, item.currency]).sort((a, b) => a[0] - b[0]),
    [[row.id, 'موظف أول', 'OPEN', 'SAR'], [cash, 'موظف تاني', 'RETURNED', 'SAR']])
  assert.deepEqual(ok(await request(U.financeCairo, 'GET', '/expenses/overview')).advances, [])
})

test('EX-09: التسوية في اعتماد التقرير — الصافي دائن لو المصروف أكتر، ومدين لو أقل، ومن غير قيد لو متساويين؛ والمعتمد شايف السلفة والصافي؛ وسلفة اتغيّرت بعد التقديم بتوقّف الاعتماد', async () => {
  // مصروف 1200.50 وسلفة 1000.50 ← دائن 200
  ok(await line(U.one, E.tripReport, { categoryId: C.meals, amount: 1200.5 }), 201)
  ok(await attach(U.one, E.tripReport, E.tripAdvance))
  const sent = ok(await send(U.one, E.tripReport, { advanceAmount: 1, netAmount: 5000 }), 201)
  const stored = JSON.parse((await repo('Request').findOneByOrFail({ id: sent.id })).payload)
  assert.deepEqual([stored.amount, stored.advanceAmount, stored.netAmount], [1200.5, 1000.5, 200])
  // تحت الاعتماد: السلفة ماتتفكّش
  refused(await attach(U.one, E.tripReport, null), 409, 'التقرير تحت الاعتماد أو اتعتمد — مايتعدّلش')
  // مبلغ السلفة اتغيّر من ورا الخادم: الاعتماد بيقف من غير قيد ولا تسوية
  const count = await repo('EmployeeObligation').count()
  await pool.request().query(`UPDATE dbo.travel_advances SET [amount] = 10 WHERE [id] = ${Number(E.tripAdvance)}`)
  refused(await act(U.approver, sent.id, 'APPROVE'), 400, `لم يُعتمد الطلب — ${rules.REPORT_TOTAL_CHANGED}. الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات`)
  assert.deepEqual([await repo('EmployeeObligation').count(), (await repo('TravelAdvance').findOneByOrFail({ id: E.tripAdvance })).status], [count, 'OPEN'])
  await pool.request().query(`UPDATE dbo.travel_advances SET [amount] = 1000.50 WHERE [id] = ${Number(E.tripAdvance)}`)
  ok(await act(U.approver, sent.id, 'APPROVE'), 201)
  const code = advanceRules.advanceCode(E.tripAdvance)
  assert.deepEqual((await entries(sent.id)).map(entry => [entry.employeeId, entry.type, entry.category, Number(entry.amount), entry.label]),
    [[E.one.id, 'CREDIT', 'expense', 200, `تسوية سلفة مأمورية ${code}: تقرير ${rules.reportCode(E.tripReport)} (المصروف 1200.50 − السلفة 1000.50)`]])
  const settled = await repo('TravelAdvance').findOneByOrFail({ id: E.tripAdvance })
  assert.deepEqual([settled.status, settled.reportId, settled.closedAt != null], ['SETTLED', E.tripReport, true])
  const done = await reportOf(U.one, E.tripReport)
  assert.deepEqual([done.phase, done.advance.id, done.net], ['APPROVED', E.tripAdvance, 200])
  refused(await step(U.finance, E.tripAdvance, 'returned', 'ملاحظة'), 409, 'السلفة اتقفلت قبل كده')
  // مصروف 300 وسلفة 500 ← مدين 200 (تسوية)
  const less = await advanceFor(U.two, 500), lessReport = await newReport(U.two, 'مأمورية قصيرة')
  ok(await line(U.two, lessReport, { categoryId: C.meals, amount: 300 }), 201); ok(await attach(U.two, lessReport, less))
  const lessSent = ok(await send(U.two, lessReport), 201)
  assert.equal(JSON.parse((await repo('Request').findOneByOrFail({ id: lessSent.id })).payload).netAmount, -200)
  ok(await act(U.approver, lessSent.id, 'APPROVE'), 201)
  assert.deepEqual((await entries(lessSent.id)).map(entry => [entry.employeeId, entry.type, entry.category, Number(entry.amount), entry.status]), [[E.two.id, 'DEBIT', 'adjustment', 200, 'PENDING']])
  // مأمورية اتلغت: تقرير من غير بنود مربوط بسلفة ← السلفة كلها مدين
  const whole = await advanceFor(U.two, 400), emptyReport = await newReport(U.two, 'مأمورية اتلغت')
  refused(await send(U.two, emptyReport), 400, rules.REPORT_EMPTY)
  ok(await attach(U.two, emptyReport, whole))
  const emptySent = ok(await send(U.two, emptyReport), 201)
  assert.deepEqual((({ amount, advanceAmount, netAmount, lines }) => [amount, advanceAmount, netAmount, lines])(JSON.parse((await repo('Request').findOneByOrFail({ id: emptySent.id })).payload)), [0, 400, -400, []])
  ok(await act(U.approver, emptySent.id, 'APPROVE'), 201)
  assert.deepEqual((await entries(emptySent.id)).map(entry => [entry.type, Number(entry.amount)]), [['DEBIT', 400]])
  // متساويين ← من غير قيد، والتقرير معتمد والسلفة متسوّية
  const even = await advanceFor(U.two, 50), evenReport = await newReport(U.two, 'مأمورية بالظبط')
  ok(await line(U.two, evenReport, { categoryId: C.meals, amount: 50 }), 201); ok(await attach(U.two, evenReport, even))
  const evenSent = ok(await send(U.two, evenReport), 201)
  ok(await act(U.approver, evenSent.id, 'APPROVE'), 201)
  const evenRow = await repo('ExpenseReport').findOneByOrFail({ id: evenReport })
  assert.deepEqual([(await entries(evenSent.id)).length, evenRow.status, evenRow.obligationId, (await repo('TravelAdvance').findOneByOrFail({ id: even })).status], [0, 'APPROVED', null, 'SETTLED'])
  // تنفيذ اتعاد: ولا قيد
  await ds.transaction(async em => rules.executeExpenseReport(em, await em.getRepository('Request').findOneByOrFail({ id: evenSent.id }), null, { reportId: evenReport, amount: 50, advanceAmount: 50 }))
  assert.equal((await entries(evenSent.id)).length, 0)
})

test('EX-10: إنهاء الخدمة — سلف مأموريات مفتوحة بتطلع بند إخلاء طرف عند المالية بعددها وإجماليها؛ ومن غير سلف مفتوحة مفيش بند', async () => {
  await advanceFor(U.cairo, 250); await advanceFor(U.cairo, 100.5, false)
  assert.deepEqual(await advanceRules.openAdvancesOf(ds.manager, E.cairo.id), { count: 2, total: 350.5 })
  const kase = await ds.transaction(em => openOffboardingCase(em, { employeeId: E.cairo.id, lastWorkingDay: day(20), terminationReason: 'resignation', openedBy: U.admin.id }))
  const items = await repo('ClearanceItem').find({ where: { caseId: kase.id }, order: { id: 'ASC' } })
  assert.deepEqual(items.map(row => [row.party, row.label]).at(-1), ['finance', 'تسوية سلف مأموريات مفتوحة (2) بإجمالي 350.5'])
  // موظف سلفه كلها اتقفلت: من غير بند
  assert.deepEqual(await advanceRules.openAdvancesOf(ds.manager, E.two.id), { count: 0, total: 0 })
  const clean = await ds.transaction(em => openOffboardingCase(em, { employeeId: E.two.id, lastWorkingDay: day(20), terminationReason: 'resignation', openedBy: U.admin.id }))
  assert.equal((await repo('ClearanceItem').find({ where: { caseId: clean.id } })).some(row => row.label.includes('سلف مأموريات')), false)
})

const category = async id => ok(await request(U.admin, 'GET', '/expenses/overview')).categories.find(row => row.id === id)
const perDiem = (user, reportId, body) => request(user, 'POST', `${M}/reports/${reportId}/per-diem`, { expenseDate: day(-3), ...body })

test('EX-11: حد الفئة بالدرجة — حد درجة الموظف بيسبق حد الفئة العام في التحذير والمنع، والموظف بيشوف حد درجته، والحدود بتتكتب كلها مع الفئة', async () => {
  G.senior = await repo('Grade').save({ name: 'مدير أول', isActive: true }); G.junior = await repo('Grade').save({ name: 'موظف', isActive: true })
  await repo('Employee').update({ id: E.one.id }, { gradeId: G.senior.id })
  const taxi = { name: 'انتقالات', limitPerLine: 100, limitMode: 'WARN' }, hotel = { name: 'إقامة', limitPerLine: 500, limitMode: 'BLOCK', receiptRequired: true }
  for (const [gradeLimits, message] of [[{ gradeId: G.senior.id }, 'حدود الدرجات قايمة (درجة وحد)'], [[{ gradeId: G.senior.id, limitPerLine: 0 }], 'حد الدرجة: اختار الدرجة واكتب مبلغ موجب بخانتين عشريتين بالكتير'],
    [[{ gradeId: G.senior.id, limitPerLine: 300 }, { gradeId: G.senior.id, limitPerLine: 400 }], 'الدرجة متكررة في حدود الفئة'], [[{ gradeId: 999999, limitPerLine: 300 }], 'درجة من الدرجات مش موجودة']]) {
    refused(await request(U.admin, 'PATCH', `/expenses/categories/${C.taxi}`, { ...taxi, gradeLimits }), 400, message)
  }
  assert.deepEqual((await category(C.taxi)).gradeLimits, [])
  ok(await request(U.admin, 'PATCH', `/expenses/categories/${C.taxi}`, { ...taxi, gradeLimits: [{ gradeId: G.senior.id, limitPerLine: 300 }, { gradeId: G.junior.id, limitPerLine: 50 }] }))
  ok(await request(U.admin, 'PATCH', `/expenses/categories/${C.hotel}`, { ...hotel, gradeLimits: [{ gradeId: G.senior.id, limitPerLine: 800 }] }))
  assert.deepEqual([(await category(C.taxi)).gradeLimits, (await category(C.hotel)).gradeLimits], [[{ gradeId: G.senior.id, limitPerLine: 300 }, { gradeId: G.junior.id, limitPerLine: 50 }], [{ gradeId: G.senior.id, limitPerLine: 800 }]])
  // تعديل من غير `gradeLimits` مايلمسش الحدود
  ok(await request(U.admin, 'PATCH', `/expenses/categories/${C.taxi}`, taxi))
  assert.equal((await category(C.taxi)).gradeLimits.length, 2)
  assert.deepEqual(ok(await request(U.admin, 'GET', '/expenses/overview')).grades.map(row => row.name), ['مدير أول', 'موظف'])
  // الموظف بيشوف حد درجته هو (ومن غير حدود باقي الدرجات)؛ واللي من غير درجة بيشوف الحد العام
  const limitOf = async (user, id) => { const row = (await mine(user)).categories.find(item => item.id === id); return [row.limitPerLine, row.gradeLimits] }
  assert.deepEqual([await limitOf(U.one, C.taxi), await limitOf(U.one, C.hotel), await limitOf(U.two, C.taxi), await limitOf(U.two, C.hotel)], [[300, []], [800, []], [100, []], [500, []]])
  // التحذير والمنع بحد الدرجة
  const senior = await newReport(U.one, 'مصروفات مدير أول'), plain = await newReport(U.two, 'مصروفات من غير درجة')
  const own = await file(U.one, E.one.id)
  assert.equal(ok(await line(U.one, senior, { categoryId: C.taxi, amount: 250 }), 201).warning, null)
  assert.equal(ok(await line(U.one, senior, { categoryId: C.taxi, amount: 350 }), 201).warning, 'فوق حد الفئة (300.00)')
  assert.equal(ok(await line(U.two, plain, { categoryId: C.taxi, amount: 250 }), 201).warning, 'فوق حد الفئة (100.00)')
  ok(await line(U.one, senior, { categoryId: C.hotel, amount: 700, receiptFileId: own.id }), 201)
  refused(await line(U.one, senior, { categoryId: C.hotel, amount: 800.01, receiptFileId: own.id }), 400, 'بند «إقامة» بمبلغ 800.01 فوق حد الفئة 800.00')
  refused(await line(U.two, plain, { categoryId: C.hotel, amount: 700 }), 400, 'بند «إقامة» بمبلغ 700.00 فوق حد الفئة 500.00')
  // التقديم بيثبّت المخالفة بحد درجة صاحب التقرير
  const sent = ok(await send(U.one, senior), 201)
  assert.deepEqual(JSON.parse((await repo('Request').findOneByOrFail({ id: sent.id })).payload).lines.map(row => [row.category, row.amount, row.warning]).sort((a, b) => a[1] - b[1]),
    [['انتقالات', 250, null], ['انتقالات', 350, 'فوق حد الفئة (300.00)'], ['إقامة', 700, null]])
  // الدرجة اتغيّرت بعد حفظ البند: الحكم بالدرجة الحالية — بند الإقامة بقى فوق حد المنع العام والتقديم بيقف
  const moved = await newReport(U.one, 'قبل تغيير الدرجة'); ok(await line(U.one, moved, { categoryId: C.hotel, amount: 700, receiptFileId: own.id }), 201)
  await repo('Employee').update({ id: E.one.id }, { gradeId: null })
  assert.equal((await reportOf(U.one, moved)).lines[0].problem, 'بند «إقامة» بمبلغ 700.00 فوق حد الفئة 500.00')
  refused(await send(U.one, moved), 400, 'بند «إقامة» بمبلغ 700.00 فوق حد الفئة 500.00')
  await repo('Employee').update({ id: E.one.id }, { gradeId: G.senior.id })
  // قايمة فاضية بتشيل حدود الدرجات
  ok(await request(U.admin, 'PATCH', `/expenses/categories/${C.taxi}`, { ...taxi, gradeLimits: [] }))
  assert.deepEqual([(await category(C.taxi)).gradeLimits, (await limitOf(U.one, C.taxi))[0]], [[], 100])
})

test('EX-12: البدل اليومي — السعر بالوجهة والدرجة تعريف للشركة كلها؛ والبند مبلغه من الخادم (الأيام × سعر درجة الموظف) ومايتعدّلش؛ وسعر اتغيّر قبل التقديم بيمنع', async () => {
  C.daily = ok(await request(U.admin, 'POST', '/expenses/categories', { name: 'بدل يومي' }), 201).id
  const rate = (body, id) => request(U.admin, id ? 'PATCH' : 'POST', id ? `/expenses/rates/${id}` : '/expenses/rates', { categoryId: C.daily, destination: 'الرياض', dailyAmount: 150, ...body })
  assert.equal((await request(U.finance, 'POST', '/expenses/rates', { categoryId: C.daily, destination: 'الرياض', dailyAmount: 150 })).status, 403)
  assert.equal((await request(U.loose, 'POST', '/expenses/rates', { categoryId: C.daily, destination: 'الرياض', dailyAmount: 150 })).status, 403)
  for (const [body, message] of [[{ destination: 'ر' }, 'الوجهة من حرفين لحد 80 حرف'], [{ categoryId: 'x' }, 'اختار فئة المصروف اللي البدل بيتسجّل تحتها'], [{ dailyAmount: 0 }, 'سعر اليوم مبلغ موجب بخانتين عشريتين بالكتير (لحد 99999.99)'],
    [{ gradeId: 'x' }, 'الدرجة مش صحيحة'], [{ categoryId: C.old }, 'فئة المصروف بتاعة البدل مش موجودة أو مقفولة'], [{ categoryId: 999999 }, 'فئة المصروف بتاعة البدل مش موجودة أو مقفولة'],
    [{ gradeId: 999999 }, 'درجة من الدرجات مش موجودة']]) refused(await rate(body), 400, message)
  assert.deepEqual((await mine(U.one)).perDiem, [])
  const general = ok(await rate({ destination: '  الرياض ' }), 201).id
  const seniorRate = ok(await rate({ gradeId: G.senior.id, dailyAmount: 250 }), 201).id
  ok(await rate({ destination: 'جدة', dailyAmount: 120.5 }), 201)
  refused(await rate({}), 409, 'فيه سعر مفعّل لنفس الوجهة والدرجة')
  refused(await rate({ gradeId: G.senior.id, dailyAmount: 999 }), 409, 'فيه سعر مفعّل لنفس الوجهة والدرجة')
  refused(await rate({}, 999999), 404, 'سعر البدل اليومي مش موجود')
  assert.deepEqual(ok(await request(U.finance, 'GET', '/expenses/overview')).rates.map(row => [row.destination, row.gradeId, row.dailyAmount, row.isActive]),
    [['الرياض', null, 150, true], ['الرياض', G.senior.id, 250, true], ['جدة', null, 120.5, true]])
  // كل موظف بيشوف سعر درجته للوجهة
  assert.deepEqual([(await mine(U.one)).perDiem, (await mine(U.two)).perDiem], [[{ destination: 'الرياض', dailyAmount: 250 }, { destination: 'جدة', dailyAmount: 120.5 }], [{ destination: 'الرياض', dailyAmount: 150 }, { destination: 'جدة', dailyAmount: 120.5 }]])
  const trip = await newReport(U.one, 'مأمورية الرياض')
  for (const [body, message] of [[{ days: 3 }, 'اختار الوجهة'], [{ destination: 'الرياض', days: 0 }, 'عدد الأيام رقم صحيح من 1 لحد 90'], [{ destination: 'الرياض', days: 91 }, 'عدد الأيام رقم صحيح من 1 لحد 90'],
    [{ destination: 'الرياض', days: 1.5 }, 'عدد الأيام رقم صحيح من 1 لحد 90'], [{ destination: 'الرياض', days: 2, expenseDate: day(3) }, 'تاريخ المصروف في المستقبل'], [{ destination: 'دبي', days: 2 }, rules.PER_DIEM_NONE]]) {
    refused(await perDiem(U.one, trip, body), 400, message)
  }
  refused(await perDiem(U.two, trip, { destination: 'الرياض', days: 2 }), 404, rules.REPORT_NOT_FOUND)
  // العميل مايحددش المبلغ: الخادم بيحسبه بسعر درجة الموظف
  const made = ok(await perDiem(U.one, trip, { destination: 'الرياض', days: 3, amount: 1, perDiemRateId: general, categoryId: C.taxi }), 201)
  assert.deepEqual([made.amount, made.perDiem], [750, '3 يوم × 250.00 (الرياض)'])
  const saved = await repo('ExpenseLine').findOneByOrFail({ id: made.id })
  assert.deepEqual([Number(saved.amount), saved.categoryId, saved.perDiemRateId, saved.perDiemDays, saved.receiptFileId], [750, C.daily, seniorRate, 3, null])
  // بند البدل مايتعدّلش من مسار البند العادي (وإلا مبلغه يتكتب باليد)
  refused(await request(U.one, 'PATCH', `${M}/reports/${trip}/lines/${made.id}`, { categoryId: C.daily, expenseDate: day(-3), amount: 5000 }), 400, 'بند البدل اليومي مايتعدّلش — امسحه وضيفه تاني')
  const view = (await reportOf(U.one, trip)).lines[0]
  assert.deepEqual([view.categoryName, view.amount, view.perDiem, view.problem, view.warning], ['بدل يومي', 750, '3 يوم × 250.00 (الرياض)', null, null])
  // موظف من غير درجة: سعر كل الدرجات
  const plain = await newReport(U.two, 'مأمورية الرياض'); assert.equal(ok(await perDiem(U.two, plain, { destination: 'الرياض', days: 2 }), 201).amount, 300)
  // السعر اتغيّر قبل التقديم: البند بيتعلّم والتقديم بيقف؛ يتمسح ويتضاف بالسعر الجديد
  ok(await rate({ gradeId: G.senior.id, dailyAmount: 300 }, seniorRate))
  assert.equal((await reportOf(U.one, trip)).lines[0].problem, rules.perDiemChanged('الرياض'))
  refused(await send(U.one, trip), 400, rules.perDiemChanged('الرياض'))
  ok(await request(U.one, 'DELETE', `${M}/reports/${trip}/lines/${made.id}`))
  assert.equal(ok(await perDiem(U.one, trip, { destination: 'الرياض', days: 3 }), 201).amount, 900)
  ok(await line(U.one, trip, { categoryId: C.meals, amount: 100 }), 201)
  const sent = ok(await send(U.one, trip), 201)
  const stored = JSON.parse((await repo('Request').findOneByOrFail({ id: sent.id })).payload)
  assert.deepEqual([stored.amount, stored.lines.map(row => [row.category, row.amount, row.perDiem ?? null, row.receipt])], [1000, [['بدل يومي', 900, '3 يوم × 300.00 (الرياض)', null], ['وجبات', 100, null, null]]])
  // السعر اتغيّر والطلب تحت الاعتماد: المبلغ اللي المعتمد شايفه هو اللي بيتصرف
  ok(await rate({ gradeId: G.senior.id, dailyAmount: 400 }, seniorRate))
  ok(await act(U.approver, sent.id, 'APPROVE'), 201)
  assert.deepEqual((await entries(sent.id)).map(entry => [entry.type, entry.category, Number(entry.amount)]), [['CREDIT', 'expense', 1000]])
  // سعر الدرجة اتقفل: الموظف بيرجع لسعر كل الدرجات، وبند محفوظ بالسعر المقفول بيتمنع
  const later = await newReport(U.one, 'مأمورية تانية'); ok(await perDiem(U.one, later, { destination: 'الرياض', days: 1 }), 201)
  ok(await rate({ gradeId: G.senior.id, dailyAmount: 400, isActive: false }, seniorRate))
  assert.deepEqual([(await mine(U.one)).perDiem[0], (await reportOf(U.one, later)).lines[0].problem], [{ destination: 'الرياض', dailyAmount: 150 }, rules.perDiemChanged('الرياض')])
  // فئة البدل اتقفلت: الوجهة بتختفي من اختيارات الموظف وبند جديد مرفوض
  ok(await request(U.admin, 'PATCH', `/expenses/categories/${C.daily}`, { name: 'بدل يومي', isActive: false }))
  assert.deepEqual((await mine(U.two)).perDiem, [])
  refused(await perDiem(U.two, plain, { destination: 'جدة', days: 1 }), 400, 'فئة المصروف بتاعة البدل مش موجودة أو مقفولة')
  const audit = await pool.request().query(`SELECT [action], COUNT(*) AS n FROM dbo.audit_log WHERE [entityType] = N'per_diem_rate' GROUP BY [action]`)
  assert.deepEqual(Object.fromEntries(audit.recordset.map(item => [item.action, Number(item.n)])), { PER_DIEM_RATE_CREATED: 3, PER_DIEM_RATE_UPDATED: 3 })
})
