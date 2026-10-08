'use strict'
// B5.2 (أ) على SQL حقيقي: موديول «المزايا والتأمين الطبي» مقفول افتراضيًا؛ وثائق التأمين وفئاتها ودرجات الفئة بترحيلات 143–145؛ الكتابة لحساب
// بكل الفروع وتحت قفل صف الوثيقة؛ وتقرير الأهلية بنطاق فروع الحساب. مفيش مبلغ بيتخصم. قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const migrate = require('../scripts/db-migrate.cjs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_benefits_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_benefits_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-benefits-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/benefits/insurance')
const MIGRATIONS = ['20261009_143_insurance_policies.sql', '20261009_144_insurance_classes.sql', '20261009_145_insurance_class_grades.sql']
  .map(name => path.resolve(apiRoot, '..', 'docs', 'migrations', 'payroll', name))
const TABLES = ['insurance_policies', 'insurance_classes', 'insurance_class_grades']
let master, pool, app, ds, base, modules, created = false, sequence = 0
const B = {}, G = {}, E = {}, U = {}, P = {}
const repo = name => { assert.match(database, NAME); assert.equal(ds.options.database, database); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token(user) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const raw = await response.text(); return { status: response.status, body: raw ? JSON.parse(raw) : null }
}
const ok = (response, status = 200) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const employee = (name, branch, grade, extra = {}) => repo('Employee').save({ employeeCode: 'BI' + ++sequence, fullName: name, branchId: branch.id, gradeId: grade ? grade.id : null, joinDate: '2020-01-01',
  basicSalary: 5000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'cash', ...extra })
const account = (label, branch, permissions) => repo('User').save({ email: `${label}@benefits.invalid`, displayName: 'حساب ' + label, passwordHash: 'test-only', role: 'employee', branchId: branch.id, permissions: JSON.stringify(permissions) })
const runMigrations = async () => { assert.match(database, NAME); for (const file of MIGRATIONS) for (const batch of migrate.splitBatches(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'))) await pool.request().batch(batch) }
const tablesPresent = async () => (await pool.request().query(`SELECT COUNT(*) AS n FROM sys.tables WHERE [name] IN (${TABLES.map(name => `N'${name}'`).join(', ')})`)).recordset[0].n
const I = '/benefits/insurance'
const day = offset => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10)
const policyOf = (overview, id) => overview.policies.find(row => row.id === id)
const classOf = (overview, policyId, name) => policyOf(overview, policyId).classes.find(row => row.name === name)

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
  B.riyadh = await repo('Branch').save({ code: 'BI_1', name: 'فرع الرياض', country: 'SA' })
  B.cairo = await repo('Branch').save({ code: 'BI_2', name: 'فرع القاهرة', country: 'EG' })
  G.manager = await repo('Grade').save({ name: 'مدير', isActive: true }); G.staff = await repo('Grade').save({ name: 'موظف', isActive: true }); G.old = await repo('Grade').save({ name: 'درجة قديمة', isActive: false })
  E.manager = await employee('مدير سعودي', B.riyadh, G.manager); E.staff = await employee('موظف سعودي', B.riyadh, G.staff); E.none = await employee('من غير درجة', B.riyadh, null)
  E.cairo = await employee('موظف القاهرة', B.cairo, G.staff); await employee('موظف ساب الشغل', B.riyadh, G.staff, { status: 'terminated', isActive: false })
  U.admin = await repo('User').save({ email: 'admin@benefits.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', scopeAllBranches: true, permissions: '[]' })
  U.hr = await account('hr', B.riyadh, ['benefits.manage']); U.hrCairo = await account('hr-cairo', B.cairo, ['benefits.manage']); U.plain = await account('plain', B.riyadh, ['employees.view', 'dependents.manage'])
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

test('BI-01: الموديول مقفول = مفيش مسار (وبيتفتح مع سجل المعالين)؛ وقبل الترحيلات الشاشة بتقول ناقص؛ والترحيلات بشكل الكيانات وبتتكرر بأمان', async () => {
  assert.equal(await modules.isEnabled('benefits'), false)
  assert.notEqual((await request(U.admin, 'GET', I)).status, 200)
  // الموديول بيعتمد على سجل المعالين
  ok(await request(U.admin, 'PUT', '/modules/dependents', { enabled: true })); ok(await request(U.admin, 'PUT', '/modules/benefits', { enabled: true })); modules.invalidate()
  for (const [index, file] of MIGRATIONS.entries()) {
    const text = fs.readFileSync(file)
    assert.equal(text.includes(Buffer.from('\r\n')), false, 'LF بس — git بيخزّن الملف LF')
    assert.notDeepEqual([...text.subarray(0, 3)], [0xef, 0xbb, 0xbf])
    assert.ok(String(text).match(/THROW \d+/g).every(code => new RegExp(`^THROW 14${index + 3}0\\d\\d$`).test(code)), file)
    assert.doesNotMatch(String(text), /\bDROP\b|\bTRUNCATE\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b/i)
  }
  // شكل الكيانات = شكل الترحيلات: الملفات بتعدّي على قاعدة synchronize من غير تغيير
  await runMigrations()
  for (const table of [...TABLES].reverse()) await pool.request().batch(`DROP TABLE dbo.${table}`)
  rules.resetInsuranceCache()
  assert.equal(await tablesPresent(), 0)
  const before = ok(await request(U.admin, 'GET', I))
  assert.deepEqual([before.ready, before.policies, before.grades.map(row => row.name)], [false, [], ['مدير', 'موظف']])
  assert.deepEqual([(await request(U.admin, 'POST', `${I}/policies`, { name: 'قبل الترحيل', insurerName: 'شركة', startDate: day(-10), endDate: day(300) })).status, (await request(U.admin, 'GET', `${I}/eligibility`)).status], [400, 400])
  await runMigrations(); await runMigrations()
  assert.equal(await tablesPresent(), 3)
  assert.deepEqual([ok(await request(U.admin, 'GET', I)).ready, ok(await request(U.admin, 'GET', `${I}/eligibility`)).rows.length], [true, 4])
})

test('BI-02: الوثيقة — بصلاحية الموديول، والكتابة لحساب بكل الفروع، وحالتها (سارية، هتنتهي قريب، انتهت، متعطّلة)، والتعديل بالمبعوت بس وبسطر تدقيق', async () => {
  const body = { name: 'وثيقة السعودية', insurerName: 'بوبا', policyNumber: 'P-100', country: 'SA', startDate: day(-30), endDate: day(300), note: 'الوثيقة الموحدة' }
  assert.deepEqual([(await request(U.plain, 'GET', I)).status, (await request(U.plain, 'POST', `${I}/policies`, body)).status, (await request(U.hr, 'POST', `${I}/policies`, body)).status,
    (await request(U.admin, 'POST', `${I}/policies`, { ...body, name: '' })).status, (await request(U.admin, 'POST', `${I}/policies`, { ...body, country: 'AE' })).status,
    (await request(U.admin, 'POST', `${I}/policies`, { ...body, endDate: day(-40) })).status], [403, 403, 403, 400, 400, 400])
  const made = ok(await request(U.admin, 'POST', `${I}/policies`, body), 201)
  P.saudi = made.policies[0].id
  assert.deepEqual([made.policies.map(row => [row.name, row.insurerName, row.policyNumber, row.country, row.isActive, row.state, row.classes]), made.canEdit], [[['وثيقة السعودية', 'بوبا', 'P-100', 'SA', true, 'ACTIVE', []]], true])
  // حساب الفرع بيقرا ومابيعدّلش
  const seen = ok(await request(U.hr, 'GET', I))
  assert.deepEqual([seen.canEdit, seen.policies.length, (await request(U.hr, 'PATCH', `${I}/policies/${P.saudi}`, { isActive: false })).status], [false, 1, 403])
  // التعديل بالمبعوت بس؛ والحالات
  const soon = policyOf(ok(await request(U.admin, 'PATCH', `${I}/policies/${P.saudi}`, { endDate: day(20) })), P.saudi)
  assert.deepEqual([soon.state, soon.stateLabel, soon.daysLeft, soon.name, soon.policyNumber, soon.note], ['EXPIRING', 'هتنتهي قريب', 20, 'وثيقة السعودية', 'P-100', 'الوثيقة الموحدة'])
  assert.equal(policyOf(ok(await request(U.admin, 'PATCH', `${I}/policies/${P.saudi}`, { startDate: day(-60), endDate: day(-1) })), P.saudi).state, 'EXPIRED')
  assert.equal(policyOf(ok(await request(U.admin, 'PATCH', `${I}/policies/${P.saudi}`, { endDate: day(300), isActive: false })), P.saudi).state, 'DISABLED')
  assert.deepEqual([(await request(U.admin, 'PATCH', `${I}/policies/${P.saudi}`, { endDate: day(-400) })).status, (await request(U.admin, 'PATCH', `${I}/policies/${P.saudi}`, { isActive: 'no' })).status,
    (await request(U.admin, 'PATCH', `${I}/policies/999999`, { isActive: true })).status], [400, 400, 404])
  assert.equal(policyOf(ok(await request(U.admin, 'PATCH', `${I}/policies/${P.saudi}`, { isActive: true })), P.saudi).state, 'ACTIVE')
  assert.deepEqual((await repo('AuditLog').find({ where: { entityType: 'insurance_policy' }, order: { id: 'ASC' } })).map(row => [row.action, row.category, row.entityId]).slice(0, 2),
    [['INSURANCE_POLICY_CREATED', 'SETTINGS', String(P.saudi)], ['INSURANCE_POLICY_UPDATED', 'SETTINGS', String(P.saudi)]])
})

test('BI-03: الفئات — الاسم فريد في الوثيقة، وافتراضية واحدة، والدرجة لفئة مفعّلة واحدة، وطلبين مع بعض = واحد يعدّي، ومفيش مسح', async () => {
  const C = `${I}/policies/${P.saudi}/classes`
  assert.deepEqual([(await request(U.hr, 'POST', C, { name: 'أ' })).status, (await request(U.admin, 'POST', C, { name: '' })).status, (await request(U.admin, 'POST', C, { name: 'أ', employeeShareMonthly: 10.555 })).status,
    (await request(U.admin, 'POST', C, { name: 'أ', gradeIds: [999999] })).status, (await request(U.admin, 'POST', `${I}/policies/999999/classes`, { name: 'أ' })).status], [403, 400, 400, 400, 404])
  const first = classOf(ok(await request(U.admin, 'POST', C, { name: 'أ', employeeShareMonthly: 150.5, gradeIds: [G.manager.id] }), 201), P.saudi, 'أ')
  assert.deepEqual([first.employeeShareMonthly, first.isDefault, first.isActive, first.gradeIds], [150.5, false, true, [G.manager.id]])
  // نفس الاسم، ودرجة مربوطة بفئة مفعّلة تانية: مرفوض
  assert.deepEqual([(await request(U.admin, 'POST', C, { name: 'أ' })).status, (await request(U.admin, 'POST', C, { name: 'ب', gradeIds: [G.manager.id] })).status], [400, 400])
  // الافتراضية واحدة: التانية بتشيلها من الأولى
  ok(await request(U.admin, 'POST', C, { name: 'ب', isDefault: true, gradeIds: [G.staff.id] }), 201)
  const third = ok(await request(U.admin, 'POST', C, { name: 'ج', isDefault: true }), 201)
  assert.deepEqual(policyOf(third, P.saudi).classes.map(row => [row.name, row.isDefault, row.gradeIds]), [['أ', false, [G.manager.id]], ['ب', false, [G.staff.id]], ['ج', true, []]])
  // طلبين مع بعض بنفس الاسم: واحد بس
  const pair = await Promise.all([request(U.admin, 'POST', C, { name: 'د' }), request(U.admin, 'POST', C, { name: 'د' })])
  assert.deepEqual([pair.map(response => response.status).sort(), await repo('InsuranceClass').count({ where: { policyId: P.saudi, name: 'د' } })], [[201, 400], 1])
  // التعديل بالمبعوت بس، والتعطيل بيفك الدرجة لفئة تانية
  const A = `${I}/classes/${first.id}`
  const renamed = classOf(ok(await request(U.admin, 'PATCH', A, { employeeShareMonthly: 200 })), P.saudi, 'أ')
  assert.deepEqual([renamed.employeeShareMonthly, renamed.gradeIds, renamed.isDefault], [200, [G.manager.id], false])
  assert.deepEqual([(await request(U.hr, 'PATCH', A, { isActive: false })).status, (await request(U.admin, 'PATCH', A, { name: 'ب' })).status, (await request(U.admin, 'PATCH', `${I}/classes/999999`, { name: 'س' })).status], [403, 400, 404])
  ok(await request(U.admin, 'PATCH', A, { isActive: false }))
  const moved = ok(await request(U.admin, 'PATCH', `${I}/classes/${classOf(third, P.saudi, 'ج').id}`, { gradeIds: [G.manager.id] }))
  assert.deepEqual(classOf(moved, P.saudi, 'ج').gradeIds, [G.manager.id])
  // والفئة المتعطّلة ماتتفعّلش ودرجتها بقت لفئة مفعّلة تانية
  assert.equal((await request(U.admin, 'PATCH', A, { isActive: true })).status, 400)
  ok(await request(U.admin, 'PATCH', A, { gradeIds: [], isActive: true }))
  assert.deepEqual([await repo('InsuranceClass').count({ where: { policyId: P.saudi } }), (await request(U.admin, 'DELETE', A)).status], [4, 404])
  assert.deepEqual((await repo('AuditLog').find({ where: { entityType: 'insurance_class' }, order: { id: 'ASC' } })).map(row => row.action).slice(0, 2), ['INSURANCE_CLASS_CREATED', 'INSURANCE_CLASS_CREATED'])
})

test('BI-04: الأهلية — وثيقة دولة فرع الموظف السارية وفئة درجته (ثم الافتراضية)، للنشطين في نطاق الحساب، وقراءة بس', async () => {
  const riyadh = ok(await request(U.hr, 'GET', `${I}/eligibility`))
  const byId = report => Object.fromEntries(report.rows.map(row => [row.employeeId, [row.policyName, row.className, row.by]]))
  // المدير بدرجته (ج)، والموظف بدرجته (ب)، ومن غير درجة الافتراضية (ج)
  assert.deepEqual([byId(riyadh), riyadh.withoutPolicy, riyadh.withoutClass], [{ [E.manager.id]: ['وثيقة السعودية', 'ج', 'GRADE'], [E.staff.id]: ['وثيقة السعودية', 'ب', 'GRADE'], [E.none.id]: ['وثيقة السعودية', 'ج', 'DEFAULT'] }, 0, 0])
  // حساب القاهرة: موظفه بس، ومفيش وثيقة لمصر
  const cairo = ok(await request(U.hrCairo, 'GET', `${I}/eligibility`))
  assert.deepEqual([byId(cairo), cairo.withoutPolicy], [{ [E.cairo.id]: [null, null, null] }, 1])
  // وثيقة لكل الشركة: المصري بياخدها (من غير فئة)، والسعودي لسه على وثيقة دولته
  const general = ok(await request(U.admin, 'POST', `${I}/policies`, { name: 'وثيقة عامة', insurerName: 'أكسا', startDate: day(-5), endDate: day(360) }), 201).policies[0].id
  assert.deepEqual(byId(ok(await request(U.hrCairo, 'GET', `${I}/eligibility`))), { [E.cairo.id]: ['وثيقة عامة', null, null] })
  assert.equal(ok(await request(U.hrCairo, 'GET', `${I}/eligibility`)).withoutClass, 1)
  assert.equal(byId(ok(await request(U.hr, 'GET', `${I}/eligibility`)))[E.staff.id][0], 'وثيقة السعودية')
  // وثيقة السعودية اتعطّلت: السعودي بيرجع للعامة
  ok(await request(U.admin, 'PATCH', `${I}/policies/${P.saudi}`, { isActive: false }))
  assert.equal(byId(ok(await request(U.hr, 'GET', `${I}/eligibility`)))[E.staff.id][0], 'وثيقة عامة')
  ok(await request(U.admin, 'PATCH', `${I}/policies/${P.saudi}`, { isActive: true }))
  // الموظف اتنقل: بيتبع فرعه الحالي
  await repo('Employee').update({ id: E.staff.id }, { branchId: B.cairo.id })
  assert.deepEqual([E.staff.id in byId(ok(await request(U.hr, 'GET', `${I}/eligibility`))), byId(ok(await request(U.hrCairo, 'GET', `${I}/eligibility`)))[E.staff.id]], [false, ['وثيقة عامة', null, null]])
  await repo('Employee').update({ id: E.staff.id }, { branchId: B.riyadh.id })
  assert.deepEqual([(await request(U.plain, 'GET', `${I}/eligibility`)).status, general > P.saudi, Number((await repo('Employee').findOneByOrFail({ id: E.staff.id })).basicSalary)], [403, true, 5000])
})
