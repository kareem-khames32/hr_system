'use strict'
// B4.5 (ب) على SQL حقيقي: الحد القانوني لمعامل الإضافي من حزمة الدولة — الإعداد مقفول = معامل الشركة بالحرف (ونفس بصمة الأدلة)، ومفتوح = الأعلى
// من معامل الشركة والحد القانوني لدولة فرع الموظف، بلقطة الحد اللي اتطبق. التفعيل من مسار «حزمة الدولة» (مدير النظام + الصفوف «اتأكد»).
// قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_overtime_legal_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_overtime_legal_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-overtime-legal-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const calc = require('../src/statutory/statutory-calculators.service')
let master, app, ds, base, admin, attendance, created = false, sequence = 0
const B = {}, E = {}, D = {}
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, permissions: JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token(user) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const raw = await response.text(); return { status: response.status, body: raw ? JSON.parse(raw) : null }
}
const ok = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const employee = (branch, extra = {}) => repo('Employee').save({ employeeCode: 'OTL' + ++sequence, fullName: 'موظف حد الإضافي ' + sequence, branchId: branch.id, joinDate: '2020-01-01', status: 'active', isActive: true,
  basicSalary: 6000, housingAllowance: 2000, transportAllowance: 0, otherAllowance: 0, payMethod: 'cash', ...extra })
// الأدلة قراءة بس (مابتحفظش صفوف): المعامل ولقطة الحد القانوني وبصمة الأدلة
const evidenceOf = async (emp, date) => { const evidence = await attendance.overtimeEvidence(emp.id, date); return { multiplier: evidence.policy.multiplier, legal: evidence.policy.legalMinimum ?? null, kind: evidence.dayKind, fingerprint: evidence.fingerprint } }
const setCompany = (key, value) => request(admin, 'PATCH', '/settings/config', { key: `overtime.${key}`, value })
const verify = async key => {
  const pack = ok(await request(admin, 'GET', '/settings/statutory'), 200)
  for (const row of pack.keys.find(entry => entry.key === key).rows) if (!row.verified) ok(await request(admin, 'PATCH', `/settings/statutory/${row.id}`, { verified: true }), 200)
}
const enable = enabled => request(admin, 'PUT', '/settings/statutory/calculators/OVERTIME_LEGAL_MINIMUM', { enabled })

before(async () => {
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true } }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  // مفيش رسالة بريد حقيقية بتطلع من الاختبار
  const { MailService } = require('../src/auth/mail.service')
  const mail = app.get(MailService)
  mail.isConfigured = () => false
  mail.send = async () => { throw new Error('no mail in tests') }
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1'); ds = app.get(require('../node_modules/typeorm').DataSource)
  assert.equal(ds.options.database, database)
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  attendance = app.get(require('../src/attendance/attendance.service').AttendanceService)
  B.eg = await repo('Branch').save({ code: 'OTL_EG', name: 'فرع القاهرة', country: 'EG' })
  B.sa = await repo('Branch').save({ code: 'OTL_SA', name: 'فرع الرياض', country: 'SA' })
  B.none = await repo('Branch').save({ code: 'OTL_NO', name: 'فرع من غير دولة' })
  admin = await repo('User').save({ email: 'admin@overtime-legal.invalid', displayName: 'Fixture admin', passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  E.eg = await employee(B.eg); E.sa = await employee(B.sa); E.none = await employee(B.none)
  // كل الأجر أساسي: الحد السعودي = 1 + 50% = 1.5
  E.saBasic = await employee(B.sa, { basicSalary: 8000, housingAllowance: 0 })
  // يوم عمل ويوم راحة من أسبوع واحد (بنوع اليوم من تقويم النظام نفسه)
  for (let day = 1; day <= 7 && !(D.weekday && D.weekend); day++) {
    const date = `2026-09-0${day}`, kind = (await evidenceOf(E.eg, date)).kind
    if (kind === 'WEEKDAY') D.weekday ??= date
    if (kind === 'WEEKEND') D.weekend ??= date
  }
  assert.ok(D.weekday && D.weekend, JSON.stringify(D))
}, { timeout: 120000 })

after(async t => {
  if (app) await app.close()
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

test('OL-01: الإعداد مقفول (الافتراضي) — معامل الشركة بالحرف في الدولتين، ومن غير لقطة حد قانوني', async () => {
  assert.equal(await repo('RequestsConfig').findOneBy({ key: 'overtime.legal_minimum.enabled' }), null, 'المفتاح مش موجود = مقفول')
  for (const emp of [E.eg, E.sa, E.none]) {
    assert.deepEqual([(await evidenceOf(emp, D.weekday)).multiplier, (await evidenceOf(emp, D.weekend)).multiplier, (await evidenceOf(emp, D.weekend)).legal], [1.5, 1.5, null], emp.fullName)
  }
  // التفعيل مرفوض والصفوف «محتاج تحقق»
  assert.deepEqual([(await enable(true)).status, (await enable(true)).body.message], [400, calc.CALCULATOR_UNVERIFIED])
})

test('OL-02: مفتوح — الأعلى من معامل الشركة والحد القانوني لدولة الفرع، بلقطة الحد اللي اتطبق؛ واللي معامل الشركة أعلى فيه زي ما هو بنفس البصمة', async () => {
  const closed = { egWeekday: await evidenceOf(E.eg, D.weekday), sa: await evidenceOf(E.sa, D.weekday), none: await evidenceOf(E.none, D.weekend) }
  await verify('eg.overtime'); await verify('sa.overtime')
  ok(await enable(true), 200)
  try {
    // مصر — يوم الراحة: القانون 2 أعلى من معامل الشركة 1.5
    const rest = await evidenceOf(E.eg, D.weekend)
    assert.deepEqual([rest.multiplier, rest.legal], [2, { multiplier: 2, country: 'EG', key: 'eg.overtime', effectiveFrom: '2025-09-01', verified: true, companyMultiplier: 1.5 }])
    // مصر — نهار العمل: القانون 1.35 أقل من 1.5؛ والسعودية: 1 + 50% × (6000 ÷ 8000) = 1.38 أقل من 1.5؛ ومن غير دولة — معامل الشركة بنفس بصمة الأدلة
    assert.deepEqual([await evidenceOf(E.eg, D.weekday), await evidenceOf(E.sa, D.weekday), await evidenceOf(E.none, D.weekend)], [closed.egWeekday, closed.sa, closed.none])
    // معامل الشركة لليوم العادي اتنزّل 1.25: الحد القانوني هو اللي بيتطبق — مصر 1.35 والسعودية 1.38، ومن غير دولة 1.25
    ok(await setCompany('multiplier_weekday', '1.25'), 200)
    const eg = await evidenceOf(E.eg, D.weekday), sa = await evidenceOf(E.sa, D.weekday), saBasic = await evidenceOf(E.saBasic, D.weekday), none = await evidenceOf(E.none, D.weekday)
    assert.deepEqual([eg.multiplier, eg.legal.companyMultiplier, eg.legal.country], [1.35, 1.25, 'EG'])
    assert.deepEqual([sa.multiplier, sa.legal], [1.38, { multiplier: 1.38, country: 'SA', key: 'sa.overtime', effectiveFrom: '2025-02-19', verified: true, companyMultiplier: 1.25 }])
    assert.deepEqual([saBasic.multiplier, none.multiplier, none.legal], [1.5, 1.25, null])
    // يوم قبل سريان صف الدولة: مفيش حد قانوني (القيمة بتاريخ يوم الشغل)
    const old = await evidenceOf(E.eg, '2025-01-06')
    assert.deepEqual([old.legal, [1.25, 1.5].includes(old.multiplier)], [null, true])
    // الموظف المنقول: بدولة فرعه الحالي
    await repo('Employee').update({ id: E.none.id }, { branchId: B.eg.id })
    assert.equal((await evidenceOf(E.none, D.weekday)).multiplier, 1.35)
    await repo('Employee').update({ id: E.none.id }, { branchId: B.none.id })
    // شاشة الإعدادات العامة مابتفتحش ولا بتقفل المفتاح
    assert.deepEqual([(await request(admin, 'PATCH', '/settings/config', { key: 'overtime.legal_minimum.enabled', value: 'false' })).status], [400])
  } finally {
    await setCompany('multiplier_weekday', '1.5')
    ok(await enable(false), 200)
  }
  // اتقفل: رجع معامل الشركة
  assert.deepEqual([await evidenceOf(E.eg, D.weekend).then(row => [row.multiplier, row.legal]), await evidenceOf(E.eg, D.weekday)], [[1.5, null], closed.egWeekday])
})
