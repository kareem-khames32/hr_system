'use strict'
// B5.2 (ج) على SQL حقيقي: تقرير حصص الموظفين الشهرية (قراءة بس، بنطاق الفروع وبعملة الفرع)، وتذاكر السفر السنوية بالدرجة (ميزة فرعية مقفولة
// افتراضيًا، ترحيل 148). مفيش مبلغ بيتخصم ولا قيد بيتكتب. قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const migrate = require('../scripts/db-migrate.cjs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_benefit_extras_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_benefit_extras_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-benefit-extras-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/benefits/ticket-entitlements')
const MIGRATION = path.resolve(apiRoot, '..', 'docs', 'migrations', 'payroll', '20261009_148_ticket_entitlements.sql')
let master, pool, app, ds, base, modules, created = false, sequence = 0
const B = {}, G = {}, E = {}, U = {}
const repo = name => { assert.match(database, NAME); assert.equal(ds.options.database, database); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token(user) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const raw = await response.text(); return { status: response.status, body: raw ? JSON.parse(raw) : null }
}
const ok = (response, status = 200) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const employee = (name, branch, grade, extra = {}) => repo('Employee').save({ employeeCode: 'BX' + ++sequence, fullName: name, branchId: branch.id, gradeId: grade ? grade.id : null, joinDate: '2020-01-01',
  basicSalary: 5000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'cash', ...extra })
const account = (label, branch, permissions) => repo('User').save({ email: `${label}@benefit-extras.invalid`, displayName: 'حساب ' + label, passwordHash: 'test-only', role: 'employee', branchId: branch.id, permissions: JSON.stringify(permissions) })
const runMigration = async () => { assert.match(database, NAME); for (const batch of migrate.splitBatches(fs.readFileSync(MIGRATION, 'utf8').replace(/\r\n/g, '\n'))) await pool.request().batch(batch) }
const tableExists = async () => (await pool.request().query(`SELECT OBJECT_ID(N'dbo.ticket_entitlements', N'U') AS id`)).recordset[0].id != null
const day = offset => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10)
const enroll = (policy, insuranceClass, person, dependentId = null, status = 'ACTIVE') => repo('InsuranceEnrollment').save({ policyId: policy, classId: insuranceClass, employeeId: person.id, dependentId, cardNumber: 'C' + ++sequence,
  startDate: day(-10), endDate: status === 'ACTIVE' ? null : day(-1), status, createdByUserId: U.admin.id, createdAt: new Date(), updatedByUserId: null, updatedAt: null })
const T = '/benefits/tickets'

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
  B.riyadh = await repo('Branch').save({ code: 'BX_1', name: 'فرع الرياض', country: 'SA' })
  B.cairo = await repo('Branch').save({ code: 'BX_2', name: 'فرع القاهرة', country: 'EG' })
  G.manager = await repo('Grade').save({ name: 'مدير', isActive: true }); G.staff = await repo('Grade').save({ name: 'موظف', isActive: true }); G.old = await repo('Grade').save({ name: 'درجة قديمة', isActive: false })
  U.admin = await repo('User').save({ email: 'admin@benefit-extras.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', scopeAllBranches: true, permissions: '[]' })
  U.hr = await account('hr', B.riyadh, ['benefits.manage']); U.hrCairo = await account('hr-cairo', B.cairo, ['benefits.manage']); U.plain = await account('plain', B.riyadh, ['employees.view', 'payroll.view'])
  E.one = await employee('موظف أول', B.riyadh, G.manager); E.two = await employee('موظف تاني', B.riyadh, G.staff); E.three = await employee('موظف تالت', B.riyadh, G.staff); E.cairo = await employee('موظف القاهرة', B.cairo, G.staff)
  ok(await request(U.admin, 'PUT', '/modules/dependents', { enabled: true })); ok(await request(U.admin, 'PUT', '/modules/benefits', { enabled: true })); modules.invalidate()
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

test('BX-01: حصص الموظفين الشهرية — مجموع حصة فئات اشتراكاته السارية (هو ومعاليه)، بعملة فرعه وبنطاق الحساب، وقراءة بس', async () => {
  const policy = await repo('InsurancePolicy').save({ name: 'وثيقة', insurerName: 'شركة', policyNumber: null, country: null, startDate: day(-30), endDate: day(300), isActive: true, note: null, createdByUserId: U.admin.id,
    createdAt: new Date(), updatedByUserId: null, updatedAt: null })
  const klass = (name, share) => repo('InsuranceClass').save({ policyId: policy.id, name, employeeShareMonthly: share, isDefault: false, isActive: true, updatedByUserId: null, updatedAt: null })
  const a = await klass('أ', 150.5), free = await klass('ب', 0)
  assert.deepEqual(ok(await request(U.hr, 'GET', '/benefits/insurance/shares')), { rows: [], totals: [] })
  // الأول: هو ومعال على (أ)، واشتراك منتهي مايتعدّش؛ التاني على فئة من غير حصة؛ والقاهرة على (أ)
  await enroll(policy.id, a.id, E.one); await enroll(policy.id, a.id, E.one, 501); await enroll(policy.id, a.id, E.one, 502, 'ENDED')
  await enroll(policy.id, free.id, E.two); await enroll(policy.id, a.id, E.cairo)
  const riyadh = ok(await request(U.hr, 'GET', '/benefits/insurance/shares'))
  assert.deepEqual(riyadh, { rows: [{ employeeId: E.one.id, fullName: 'موظف أول', employeeCode: E.one.employeeCode, currency: 'SAR', members: 2, total: 301 },
    { employeeId: E.two.id, fullName: 'موظف تاني', employeeCode: E.two.employeeCode, currency: 'SAR', members: 1, total: 0 }], totals: [{ currency: 'SAR', employees: 2, total: 301 }] })
  assert.deepEqual(ok(await request(U.hrCairo, 'GET', '/benefits/insurance/shares')).totals, [{ currency: 'EGP', employees: 1, total: 150.5 }])
  assert.deepEqual(ok(await request(U.admin, 'GET', '/benefits/insurance/shares')).totals.map(row => [row.currency, row.total]).sort(), [['EGP', 150.5], ['SAR', 301]])
  assert.equal((await request(U.plain, 'GET', '/benefits/insurance/shares')).status, 403)
  // ولا خصم ولا قيد اتكتب
  assert.deepEqual([await repo('EmployeeObligation').count(), Number((await pool.request().query('SELECT COUNT(*) AS n FROM dbo.deduction_requests')).recordset[0].n)], [0, 0])
})

test('BX-02: تذاكر السفر — الميزة الفرعية مقفولة افتراضيًا = مفيش مسار؛ وقبل ترحيل 148 الشاشة بتقول ناقص؛ والترحيل بشكل الكيان وبيتكرر بأمان', async () => {
  assert.equal(await modules.isFeatureEnabled(rules.TICKETS_FEATURE), false)
  assert.deepEqual([(await request(U.admin, 'GET', T)).status, (await request(U.admin, 'PUT', `${T}/${G.manager.id}`, { ticketsPerYear: 2 })).status], [404, 404])
  ok(await request(U.admin, 'PUT', `/modules/features/${rules.TICKETS_FEATURE}`, { enabled: true })); modules.invalidate()
  const text = fs.readFileSync(MIGRATION)
  assert.equal(text.includes(Buffer.from('\r\n')), false, 'LF بس — git بيخزّن الملف LF')
  assert.notDeepEqual([...text.subarray(0, 3)], [0xef, 0xbb, 0xbf])
  assert.ok(String(text).match(/THROW \d+/g).every(code => /^THROW 1480\d\d$/.test(code)))
  assert.doesNotMatch(String(text), /\bDROP\b|\bTRUNCATE\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b/i)
  await runMigration()
  await pool.request().batch('DROP TABLE dbo.ticket_entitlements'); rules.resetTicketEntitlementsCache()
  assert.equal(await tableExists(), false)
  assert.deepEqual([ok(await request(U.admin, 'GET', T)), (await request(U.admin, 'PUT', `${T}/${G.manager.id}`, { ticketsPerYear: 2 })).status], [{ ready: false, canEdit: true, rows: [] }, 400])
  await runMigration(); await runMigration()
  assert.equal(await tableExists(), true)
  assert.equal(ok(await request(U.admin, 'GET', T)).ready, true)
})

test('BX-03: استحقاق التذاكر بالدرجة — التعريف لحساب بكل الفروع، والعدد من صفر (بيشيل الصف) لحد 12، وطلبين مع بعض = صف واحد، وعدد الموظفين بنطاق الحساب', async () => {
  const first = ok(await request(U.hr, 'GET', T))
  // الدرجات المفعّلة بس (القديمة برّه)، من غير استحقاق؛ وعدد موظفي نطاق الحساب
  assert.deepEqual([first.canEdit, first.rows.map(row => [row.gradeName, row.ticketsPerYear, row.includesDependents, row.headcount])], [false, [['مدير', 0, false, 1], ['موظف', 0, false, 2]]])
  const P = grade => `${T}/${grade.id}`
  assert.deepEqual([(await request(U.plain, 'GET', T)).status, (await request(U.hr, 'PUT', P(G.manager), { ticketsPerYear: 2 })).status, (await request(U.admin, 'PUT', P(G.manager), { ticketsPerYear: 13 })).status,
    (await request(U.admin, 'PUT', P(G.manager), { ticketsPerYear: 1.5 })).status, (await request(U.admin, 'PUT', P(G.manager), {})).status, (await request(U.admin, 'PUT', P(G.manager), { ticketsPerYear: 2, includesDependents: 'yes' })).status,
    (await request(U.admin, 'PUT', `${T}/999999`, { ticketsPerYear: 2 })).status], [403, 403, 400, 400, 400, 400, 404])
  const set = ok(await request(U.admin, 'PUT', P(G.manager), { ticketsPerYear: 2, includesDependents: true, note: ' درجة أولى ' }))
  assert.deepEqual(set.rows.map(row => [row.gradeName, row.ticketsPerYear, row.includesDependents, row.note, row.headcount]), [['مدير', 2, true, 'درجة أولى', 1], ['موظف', 0, false, null, 3]])
  const pair = await Promise.all([request(U.admin, 'PUT', P(G.staff), { ticketsPerYear: 1 }), request(U.admin, 'PUT', P(G.staff), { ticketsPerYear: 1 })])
  assert.deepEqual([pair.map(response => response.status), await repo('TicketEntitlement').count({ where: { gradeId: G.staff.id } })], [[200, 200], 1])
  // درجة متعطّلة ليها استحقاق بتفضل ظاهرة؛ والصفر بيشيل الصف
  ok(await request(U.admin, 'PUT', P(G.old), { ticketsPerYear: 1 }))
  assert.deepEqual(ok(await request(U.hrCairo, 'GET', T)).rows.map(row => [row.gradeName, row.ticketsPerYear, row.headcount]), [['مدير', 2, 0], ['موظف', 1, 1], ['درجة قديمة', 1, 0]])
  ok(await request(U.admin, 'PUT', P(G.old), { ticketsPerYear: 0 }))
  assert.deepEqual([await repo('TicketEntitlement').count(), ok(await request(U.admin, 'GET', T)).rows.length], [2, 2])
  assert.deepEqual((await repo('AuditLog').find({ where: { action: 'TICKET_ENTITLEMENT_SET' }, order: { id: 'ASC' } })).map(row => row.entityId).slice(0, 1), [String(G.manager.id)])
  // قفل الميزة: المسارين مش متاحين، والتعريف محفوظ
  ok(await request(U.admin, 'PUT', `/modules/features/${rules.TICKETS_FEATURE}`, { enabled: false })); modules.invalidate()
  assert.deepEqual([(await request(U.admin, 'GET', T)).status, await repo('TicketEntitlement').count()], [404, 2])
})
