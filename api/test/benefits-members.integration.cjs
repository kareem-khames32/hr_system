'use strict'
// B5.2 (ب) على SQL حقيقي: اشتراكات التأمين الطبي وطلبات شركة التأمين — ترحيلي 146 و147، طلب الإضافة (تم = اشتراك برقم البطاقة)، طلب الحذف
// (من الشاشة، ومع حذف المعال، ومع فتح ملف إنهاء الخدمة ببند إخلاء طرف)، والكشف، بنطاق فروع الحساب. مفيش مبلغ. قاعدة عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const migrate = require('../scripts/db-migrate.cjs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_benefit_members_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_benefit_members_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-benefit-members-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/benefits/insurance-members')
const { openOffboardingCase } = require('../src/offboarding/offboarding-open')
const MIGRATIONS = ['20261009_146_insurance_enrollments.sql', '20261009_147_insurance_member_requests.sql'].map(name => path.resolve(apiRoot, '..', 'docs', 'migrations', 'payroll', name))
const TABLES = ['insurance_enrollments', 'insurance_member_requests']
let master, pool, app, ds, base, modules, created = false, sequence = 0
const B = {}, E = {}, U = {}, D = {}, K = {}
const repo = name => { assert.match(database, NAME); assert.equal(ds.options.database, database); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token(user) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const raw = await response.text(); return { status: response.status, body: raw ? JSON.parse(raw) : null }
}
const ok = (response, status = 200) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const employee = (name, branch, extra = {}) => repo('Employee').save({ employeeCode: 'BM' + ++sequence, fullName: name, branchId: branch.id, gradeId: null, joinDate: '2020-01-01', nationalId: '10' + String(sequence).padStart(8, '0'),
  birthDate: '1990-05-0' + sequence, basicSalary: 5000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'cash', ...extra })
const dependent = (owner, nameAr, relation, isInsured) => repo('Dependent').save({ employeeId: owner.id, nameAr, nameEn: null, relation, birthDate: '2015-03-01', nationalId: '20' + String(++sequence).padStart(8, '0'), gender: null, isInsured,
  documentId: null, status: 'ACTIVE', removeReason: null, requestId: null, createdByUserId: U.admin.id, createdAt: new Date(), updatedAt: null })
const account = (label, branch, permissions) => repo('User').save({ email: `${label}@benefit-members.invalid`, displayName: 'حساب ' + label, passwordHash: 'test-only', role: 'employee', branchId: branch.id, permissions: JSON.stringify(permissions) })
const runMigrations = async () => { assert.match(database, NAME); for (const file of MIGRATIONS) for (const batch of migrate.splitBatches(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'))) await pool.request().batch(batch) }
const tablesPresent = async () => (await pool.request().query(`SELECT COUNT(*) AS n FROM sys.tables WHERE [name] IN (${TABLES.map(name => `N'${name}'`).join(', ')})`)).recordset[0].n
const I = '/benefits/insurance'
const day = offset => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10)
const memberOf = (view, person, child = null) => view.members.find(row => row.employeeId === person.id && row.dependentId === (child ? child.id : null))
const requestsOf = () => repo('InsuranceMemberRequest').find({ order: { id: 'ASC' } })
const messageOf = response => (Array.isArray(response.body?.message) ? response.body.message.join(' ') : response.body?.message)

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
  B.riyadh = await repo('Branch').save({ code: 'BM_1', name: 'فرع الرياض', country: 'SA' })
  B.cairo = await repo('Branch').save({ code: 'BM_2', name: 'فرع القاهرة', country: 'EG' })
  U.admin = await repo('User').save({ email: 'admin@benefit-members.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', scopeAllBranches: true, permissions: '[]' })
  U.hr = await account('hr', B.riyadh, ['benefits.manage', 'dependents.manage']); U.hrCairo = await account('hr-cairo', B.cairo, ['benefits.manage']); U.plain = await account('plain', B.riyadh, ['employees.view', 'dependents.manage'])
  E.one = await employee('موظف أول', B.riyadh); E.two = await employee('موظف تاني', B.riyadh); E.plainOne = await employee('موظف من غير تأمين', B.riyadh); E.cairo = await employee('موظف القاهرة', B.cairo)
  D.wife = await dependent(E.one, 'زوجة الموظف الأول', 'SPOUSE', true); D.son = await dependent(E.one, 'ابن الموظف الأول', 'SON', true); D.father = await dependent(E.one, 'والد الموظف الأول', 'FATHER', false)
  ok(await request(U.admin, 'PUT', '/modules/dependents', { enabled: true })); ok(await request(U.admin, 'PUT', '/modules/benefits', { enabled: true })); modules.invalidate()
  // وثيقة السعودية بفئة افتراضية (مصر من غير وثيقة)
  const made = ok(await request(U.admin, 'POST', `${I}/policies`, { name: 'وثيقة السعودية', insurerName: 'بوبا', policyNumber: 'P-9', country: 'SA', startDate: day(-30), endDate: day(300) }), 201)
  K.policy = made.policies[0].id
  K.class = ok(await request(U.admin, 'POST', `${I}/policies/${K.policy}/classes`, { name: 'ب', isDefault: true }), 201).policies[0].classes[0].id
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

test('BM-01: قبل ترحيلي 146 و147 — الشاشة بتقول ناقص، وإنهاء الخدمة وحذف المعال زي الأول؛ والترحيلين بشكل الكيانات وبيتكرروا بأمان', async () => {
  for (const [index, file] of MIGRATIONS.entries()) {
    const text = fs.readFileSync(file)
    assert.equal(text.includes(Buffer.from('\r\n')), false, 'LF بس — git بيخزّن الملف LF')
    assert.notDeepEqual([...text.subarray(0, 3)], [0xef, 0xbb, 0xbf])
    assert.ok(String(text).match(/THROW \d+/g).every(code => new RegExp(`^THROW 14${index + 6}0\\d\\d$`).test(code)), file)
    assert.doesNotMatch(String(text), /\bDROP\b|\bTRUNCATE\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b/i)
  }
  await runMigrations()
  for (const table of [...TABLES].reverse()) await pool.request().batch(`DROP TABLE dbo.${table}`)
  rules.resetInsuranceMembersCache()
  assert.equal(await tablesPresent(), 0)
  assert.deepEqual(ok(await request(U.hr, 'GET', `${I}/members`)), { ready: false, members: [], requests: [] })
  assert.deepEqual([(await request(U.hr, 'POST', `${I}/requests`, { employeeId: E.one.id })).status, (await request(U.hr, 'GET', `${I}/sheet`)).status], [400, 400])
  // من غير الجداول: فتح ملف إنهاء الخدمة بجهاته الخمس بالظبط، وحذف المعال شغال
  const gone = await employee('موظف بيمشي قبل الترحيل', B.riyadh), child = await dependent(gone, 'معال قبل الترحيل', 'SON', true)
  const kase = await ds.transaction(em => openOffboardingCase(em, { employeeId: gone.id, lastWorkingDay: day(10), terminationReason: 'resignation', openedBy: U.admin.id }))
  assert.deepEqual((await repo('ClearanceItem').find({ where: { caseId: kase.id }, order: { id: 'ASC' } })).map(row => row.party), ['manager', 'custody', 'it', 'finance', 'hr'])
  ok(await request(U.hr, 'POST', `/dependents/${child.id}/remove`, { reason: 'اختبار قبل الترحيل' }))
  await runMigrations(); await runMigrations()
  assert.equal(await tablesPresent(), 2)
  assert.equal(ok(await request(U.hr, 'GET', `${I}/members`)).ready, true)
})

test('BM-02: طلب الإضافة — للموظف أو لمعال مشمول بالتأمين في نطاق الحساب، على وثيقة دولة فرعه وفئته؛ الكشف؛ و«تم» برقم البطاقة = اشتراك ساري واحد', async () => {
  const view = ok(await request(U.hr, 'GET', `${I}/members`))
  // أعضاء النطاق: الموظفين النشطين ومعاليهم المشمولين بس (الوالد مش مشمول، وموظف القاهرة برّه)
  assert.deepEqual(view.members.filter(row => row.employeeId === E.one.id).map(row => [row.dependentId, row.memberName, row.relation, row.enrollment, row.openRequest]),
    [[null, 'موظف أول', null, null, null], [D.wife.id, 'زوجة الموظف الأول', 'SPOUSE', null, null], [D.son.id, 'ابن الموظف الأول', 'SON', null, null]])
  assert.equal(view.members.some(row => row.employeeId === E.cairo.id), false)
  const R = `${I}/requests`
  const noPolicy = await request(U.hrCairo, 'POST', R, { employeeId: E.cairo.id })
  assert.deepEqual([(await request(U.plain, 'POST', R, { employeeId: E.one.id })).status, (await request(U.plain, 'GET', `${I}/members`)).status, (await request(U.hr, 'POST', R, { employeeId: E.cairo.id })).status,
    (await request(U.hr, 'POST', R, { employeeId: 999999 })).status, (await request(U.hr, 'POST', R, {})).status, (await request(U.hr, 'POST', R, { employeeId: E.one.id, dependentId: D.father.id })).status,
    (await request(U.hr, 'POST', R, { employeeId: E.two.id, dependentId: D.wife.id })).status, noPolicy.status, /مفيش وثيقة/.test(messageOf(noPolicy))], [403, 403, 404, 404, 400, 400, 404, 400, true])
  assert.equal((await requestsOf()).length, 0)
  const first = ok(await request(U.hr, 'POST', R, { employeeId: E.one.id }), 201)
  assert.deepEqual(memberOf(first, E.one).openRequest.status, 'PENDING')
  assert.deepEqual(first.requests.map(row => [row.kind, row.status, row.origin, row.memberName, row.className, row.policyName]), [['ADD', 'PENDING', 'MANUAL', 'موظف أول', 'ب', 'وثيقة السعودية']])
  // طلب مفتوح للعضو: التاني مرفوض؛ وطلبين مع بعض لعضو تاني = واحد
  assert.equal((await request(U.hr, 'POST', R, { employeeId: E.one.id })).status, 400)
  const pair = await Promise.all([request(U.hr, 'POST', R, { employeeId: E.two.id }), request(U.hr, 'POST', R, { employeeId: E.two.id })])
  assert.deepEqual([pair.map(response => response.status).sort(), (await requestsOf()).filter(row => row.employeeId === E.two.id).length], [[201, 400], 1])
  ok(await request(U.hr, 'POST', R, { employeeId: E.one.id, dependentId: D.wife.id }), 201)
  // الكشف: بيانات العضو لشركة التأمين، بنطاق الحساب
  const sheet = ok(await request(U.hr, 'GET', `${I}/sheet`))
  assert.deepEqual([sheet.status, sheet.rows.map(row => [row.kind, row.memberName, row.relation, row.birthDate, row.nationalId, row.className, row.policyNumber])],
    ['PENDING', [['ADD', 'موظف أول', null, E.one.birthDate, E.one.nationalId, 'ب', 'P-9'], ['ADD', 'موظف تاني', null, E.two.birthDate, E.two.nationalId, 'ب', 'P-9'], ['ADD', 'زوجة الموظف الأول', 'SPOUSE', '2015-03-01', D.wife.nationalId, 'ب', 'P-9']]])
  assert.deepEqual([ok(await request(U.hrCairo, 'GET', `${I}/sheet`)).rows, ok(await request(U.hrCairo, 'GET', `${I}/members`)).requests], [[], []])
  // «اتبعت» ثم «تم»: من غير رقم بطاقة أو تاريخ مرفوض، وحساب فرع تاني = مش موجود
  const [one, two, wife] = await requestsOf()
  const S = (row, step) => `${R}/${row.id}/${step}`
  assert.deepEqual([(await request(U.hrCairo, 'POST', S(one, 'send'))).status, (await request(U.plain, 'POST', S(one, 'send'))).status, (await request(U.hr, 'POST', `${R}/999999/send`)).status], [404, 403, 404])
  ok(await request(U.hr, 'POST', S(one, 'send')), 201)
  assert.deepEqual([(await request(U.hr, 'POST', S(one, 'send'))).status, ok(await request(U.hr, 'GET', `${I}/sheet?status=SENT`)).rows.length, ok(await request(U.hr, 'GET', `${I}/sheet`)).rows.length], [400, 1, 2])
  assert.deepEqual([(await request(U.hr, 'POST', S(one, 'done'), { effectiveDate: day(0) })).status, (await request(U.hr, 'POST', S(one, 'done'), { cardNumber: 'C-1' })).status,
    (await request(U.hr, 'POST', S(one, 'done'), { cardNumber: 'C-1', effectiveDate: '2026-02-30' })).status], [400, 400, 400])
  const done = ok(await request(U.hr, 'POST', S(one, 'done'), { cardNumber: ' C-1 ', effectiveDate: day(0) }), 201)
  assert.deepEqual([memberOf(done, E.one).enrollment.cardNumber, memberOf(done, E.one).enrollment.className, memberOf(done, E.one).enrollment.startDate, memberOf(done, E.one).openRequest], ['C-1', 'ب', day(0), null])
  assert.deepEqual([(await request(U.hr, 'POST', S(one, 'done'), { cardNumber: 'C-1', effectiveDate: day(0) })).status, (await request(U.hr, 'POST', R, { employeeId: E.one.id })).status], [400, 400], 'الطلب اتقفل، والعضو مشترك')
  // «تم» مرتين مع بعض على طلب المعال (من غير «اتبعت»): اشتراك واحد
  const both = await Promise.all([request(U.hr, 'POST', S(wife, 'done'), { cardNumber: 'C-2', effectiveDate: day(0) }), request(U.hr, 'POST', S(wife, 'done'), { cardNumber: 'C-2', effectiveDate: day(0) })])
  assert.deepEqual([both.map(response => response.status).sort(), await repo('InsuranceEnrollment').count({ where: { employeeId: E.one.id, status: 'ACTIVE' } })], [[201, 400], 2])
  // الإلغاء بسبب
  assert.equal((await request(U.hr, 'POST', S(two, 'cancel'), {})).status, 400)
  ok(await request(U.hr, 'POST', S(two, 'cancel'), { reason: 'الموظف اعتذر' }), 201)
  assert.deepEqual((await requestsOf()).map(row => [row.employeeId, row.dependentId, row.status]), [[E.one.id, null, 'DONE'], [E.two.id, null, 'CANCELLED'], [E.one.id, D.wife.id, 'DONE']])
  assert.deepEqual((await repo('AuditLog').find({ where: { entityType: 'insurance_member_request' }, order: { id: 'ASC' } })).map(row => row.action).slice(0, 5),
    ['INSURANCE_ADD_REQUESTED', 'INSURANCE_ADD_REQUESTED', 'INSURANCE_ADD_REQUESTED', 'INSURANCE_REQUEST_SENT', 'INSURANCE_REQUEST_DONE'])
})

test('BM-03: طلب الحذف من الشاشة — بسبب، لاشتراك ساري في نطاق الحساب، و«تم» بتاريخ النهاية بينهي الاشتراك', async () => {
  const own = await repo('InsuranceEnrollment').findOneByOrFail({ employeeId: E.one.id, dependentId: D.wife.id })
  const X = id => `${I}/enrollments/${id}/remove-request`
  assert.deepEqual([(await request(U.hr, 'POST', X(own.id), {})).status, (await request(U.hrCairo, 'POST', X(own.id), { reason: 'سبب' })).status, (await request(U.plain, 'POST', X(own.id), { reason: 'سبب' })).status,
    (await request(U.hr, 'POST', X(999999), { reason: 'سبب' })).status], [400, 404, 403, 404])
  const made = ok(await request(U.hr, 'POST', X(own.id), { reason: 'طلاق' }), 201)
  assert.deepEqual(memberOf(made, E.one, D.wife).openRequest.kind, 'REMOVE')
  assert.equal((await request(U.hr, 'POST', X(own.id), { reason: 'تاني' })).status, 400)
  const removal = (await requestsOf()).at(-1)
  assert.deepEqual([removal.kind, removal.enrollmentId, removal.origin, removal.reason, removal.status], ['REMOVE', own.id, 'MANUAL', 'طلاق', 'PENDING'])
  // الكشف بيبيّن رقم بطاقة العضو المطلوب حذفه
  assert.deepEqual(ok(await request(U.hr, 'GET', `${I}/sheet`)).rows.map(row => [row.kind, row.memberName, row.cardNumber, row.reason]), [['REMOVE', 'زوجة الموظف الأول', 'C-2', 'طلاق']])
  assert.equal((await request(U.hr, 'POST', `${I}/requests/${removal.id}/done`, { effectiveDate: day(-5) })).status, 400, 'النهاية قبل البداية')
  const done = ok(await request(U.hr, 'POST', `${I}/requests/${removal.id}/done`, { effectiveDate: day(3) }), 201)
  assert.deepEqual([memberOf(done, E.one, D.wife).enrollment, memberOf(done, E.one, D.wife).openRequest], [null, null])
  const ended = await repo('InsuranceEnrollment').findOneByOrFail({ id: own.id })
  assert.deepEqual([ended.status, String(ended.endDate).slice(0, 10)], ['ENDED', day(3)])
  // بعد ما انتهى: طلب إضافة جديد مسموح
  ok(await request(U.hr, 'POST', `${I}/requests`, { employeeId: E.one.id, dependentId: D.wife.id }), 201)
  const again = (await requestsOf()).at(-1)
  ok(await request(U.hr, 'POST', `${I}/requests/${again.id}/done`, { cardNumber: 'C-3', effectiveDate: day(4) }), 201)
})

test('BM-04: طلبات الحذف اللي بتطلع لوحدها — مع حذف المعال، ومع فتح ملف إنهاء الخدمة (ببند إخلاء طرف)؛ ومن غير اشتراكات مفيش أي حاجة زيادة', async () => {
  // حذف معال مشترك من سجل المعالين: طلب حذف لاشتراكه
  ok(await request(U.hr, 'POST', `/dependents/${D.wife.id}/remove`, { reason: 'اتحذفت من السجل' }))
  const afterDependent = (await requestsOf()).at(-1)
  assert.deepEqual([afterDependent.kind, afterDependent.origin, afterDependent.dependentId, afterDependent.status, afterDependent.createdByUserId, afterDependent.reason],
    ['REMOVE', 'DEPENDENT', D.wife.id, 'PENDING', U.hr.id, 'حذف المعال من سجل المعالين'])
  // معال من غير اشتراك: ولا طلب
  const count = (await requestsOf()).length
  ok(await request(U.hr, 'POST', `/dependents/${D.son.id}/remove`, { reason: 'من غير اشتراك' }))
  assert.equal((await requestsOf()).length, count)
  // إنهاء خدمة موظف مشترك: طلب حذف لاشتراكه (ولمعاله اللي لسه مالوش طلب حذف مفتوح)، وبند إخلاء طرف عند الموارد البشرية
  const kase = await ds.transaction(em => openOffboardingCase(em, { employeeId: E.one.id, lastWorkingDay: day(20), terminationReason: 'resignation', openedBy: U.admin.id }))
  const items = await repo('ClearanceItem').find({ where: { caseId: kase.id }, order: { id: 'ASC' } })
  assert.deepEqual(items.map(row => [row.party, row.label]).slice(-2), [['hr', 'تسليم الوثائق وشهادة الخبرة'], ['hr', 'حذف التأمين الطبي من الوثيقة (1 عضو)']])
  const raised = (await requestsOf()).filter(row => row.origin === 'OFFBOARDING')
  assert.deepEqual(raised.map(row => [row.kind, row.employeeId, row.dependentId, row.status, row.createdByUserId]), [['REMOVE', E.one.id, null, 'PENDING', U.admin.id]], 'اشتراك الزوجة له طلب حذف مفتوح فمايتكررش')
  // فتح تاني (ملف جديد) مايكررش الطلبات
  const second = await ds.transaction(em => openOffboardingCase(em, { employeeId: E.one.id, lastWorkingDay: day(25), terminationReason: 'resignation', openedBy: U.admin.id }))
  assert.deepEqual([(await requestsOf()).filter(row => row.origin === 'OFFBOARDING').length, await repo('ClearanceItem').count({ where: { caseId: second.id } })], [1, 5])
  // موظف من غير اشتراكات: الجهات الخمس بس
  const plainCase = await ds.transaction(em => openOffboardingCase(em, { employeeId: E.plainOne.id, lastWorkingDay: day(20), terminationReason: 'resignation', openedBy: U.admin.id }))
  assert.deepEqual((await repo('ClearanceItem').find({ where: { caseId: plainCase.id }, order: { id: 'ASC' } })).map(row => row.party), ['manager', 'custody', 'it', 'finance', 'hr'])
  // الطلب اللي طلع لوحده بيتقفل زي أي طلب: «تم» بينهي الاشتراك — وطلب موظف ساب الشغل لسه ظاهر لحساب فرعه
  await repo('Employee').update({ id: E.one.id }, { status: 'terminated', isActive: false })
  const view = ok(await request(U.hr, 'GET', `${I}/members`))
  assert.deepEqual([view.members.some(row => row.employeeId === E.one.id), view.requests.filter(row => row.status === 'PENDING').map(row => [row.originLabel, row.memberName]).sort()],
    [false, [['إنهاء خدمة', 'موظف أول'], ['حذف معال', 'زوجة الموظف الأول']].sort()])
  ok(await request(U.hr, 'POST', `${I}/requests/${raised[0].id}/done`, { effectiveDate: day(20) }), 201)
  assert.equal((await repo('InsuranceEnrollment').findOneByOrFail({ id: raised[0].enrollmentId })).status, 'ENDED')
  // من أول الملف لآخره: ولا راتب اتغيّر ولا قيد اتكتب
  assert.deepEqual([Number((await repo('Employee').findOneByOrFail({ id: E.one.id })).basicSalary), await repo('EmployeeObligation').count()], [5000, 0])
})
