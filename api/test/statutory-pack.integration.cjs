'use strict'
// B4.2: حزمة الدولة على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر (hr_statutory_pack_test_<16 hex>)، عبر HTTP بتوكنات موقّعة محليًا ومن غير كلمات مرور.
//  SK-01) البذرة والعرض: الإقلاع بيحمّل كل صفوف بطاقات C «محتاج تحقق» مرة واحدة؛ العرض بصلاحية الإعدادات بكل مفاتيح الكتالوج، والساري
//         النهارده متعلّم، ومين بيقرا المفتاح.
//  SK-02) التعديل لمدير النظام بس: صف بتاريخ جديد بخانات المفتاح بالظبط (والتاريخ المكرر مرفوض، وضغطتين مع بعض صف واحد)، وتعديل القيم
//         بالمبعوت بس، وعلامة «اتأكد» والمصدر، وسطر تدقيق بقبل وبعد؛ والقراءة بالتاريخ الفعّال بتاخد الصف الجديد من تاريخه؛ والبذرة
//         مابتكتبش فوق تعديل.
// Run (من api/): node --test test/statutory-pack.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_statutory_pack_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_statutory_pack_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-statutory-pack-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/statutory/statutory-pack.service')
const { STATUTORY_SEED } = require('../src/statutory/statutory-data')
const { STATUTORY_CATALOG } = require('../src/statutory/statutory-catalog')
const { statutoryAt, statutoryNumber } = require('../src/statutory/statutory')
const { readStatutoryEntries, StatutorySeedService } = require('../src/statutory/statutory.service')
const { localDateOf } = require('../src/attendance/attendance.service')
let app, master, ds, base, created = false
const users = {}

function assertDisposable() {
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: null, tokenVersion: user.tokenVersion ?? 0,
  scopeAllBranches: user.scopeAllBranches ?? false, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(user)}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const expectStatus = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const messageOf = response => [].concat(response.body?.message ?? []).join('، ')
const answer = response => [response.status, messageOf(response)]
const S = '/settings/statutory'
const keyOf = (pack, key) => pack.keys.find(row => row.key === key)
const audits = async action => Number((await ds.query('SELECT COUNT(*) AS [n] FROM [audit_log] WHERE [action] = @0', [action]))[0].n)

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  // مفيش رسالة بريد حقيقية بتطلع من الاختبار
  const { MailService } = require('../src/auth/mail.service')
  const mail = app.get(MailService)
  mail.isConfigured = () => false
  mail.send = async () => { throw new Error('no mail in tests') }
  assert.notEqual(mail.send, MailService.prototype.send)
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  const user = (label, role, permissions) => repo('User').save({ email: `${label}@statutory.invalid`, displayName: label, passwordHash: 'test-only', role, branchId: null, scopeAllBranches: true,
    permissions: JSON.stringify(permissions), isActive: true })
  users.admin = await user('admin', 'super_admin', [])
  users.settings = await user('settings', 'hr_manager', ['settings.manage'])
  users.plain = await user('plain', 'employee', ['employees.view'])
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created) {
      assertDisposable()
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  fs.rmSync(uploads, { recursive: true, force: true })
  if (errors.length) t.diagnostic(errors.map(error => error.message).join(' | '))
}, { timeout: 60000 })

test('SK-01: الإقلاع بيحمّل صفوف بطاقات C «محتاج تحقق» مرة واحدة، والعرض بصلاحية الإعدادات بكل المفاتيح والساري النهارده ومين بيقراها', async () => {
  // الإقلاع حمّل البذرة كلها
  assert.deepEqual([await repo('StatutoryDefinition').count(), await repo('StatutoryDefinition').count({ where: { verified: true } }), await app.get(StatutorySeedService).seed()], [STATUTORY_SEED.length, 0, 0])
  assert.equal(await repo('StatutoryValue').count(), STATUTORY_SEED.reduce((sum, seed) => sum + Object.keys(seed.values).length, 0))
  // العرض: بصلاحية الإعدادات — ومن غيرها 403
  assert.equal((await request(users.plain, 'GET', S)).status, 403)
  const pack = expectStatus(await request(users.settings, 'GET', S), 200)
  assert.deepEqual([pack.available, pack.canEdit, pack.countries, pack.keys.length, expectStatus(await request(users.admin, 'GET', S), 200).canEdit],
    [true, false, [{ code: 'EG', label: 'مصر' }, { code: 'SA', label: 'السعودية' }], STATUTORY_CATALOG.length, true])
  // B4.4 (أ): مفتاحي الضريبة بتقراهم المعاينة عند الطلب (للعرض بس)
  const TAX_PREVIEW = 'معاينة ضريبة كسب العمل (للعرض بس — مابتتخصمش)'
  assert.deepEqual(pack.keys.filter(row => row.usedBy).map(row => [row.key, row.usedBy]), [['eg.insurance.wage_limits', 'حساب التأمينات الاجتماعية'], ['eg.salary_tax.brackets', TAX_PREVIEW],
    ['eg.salary_tax.high_income', TAX_PREVIEW], ['sa.gosi.new_track', 'حساب التأمينات الاجتماعية']])
  assert.ok(pack.keys.every(row => row.rows.length >= 1 && row.rows.every(entry => entry.verified === false && entry.source)))
  // الساري النهارده: صف واحد بالكتير لكل مفتاح — آخر «ساري من» لحد النهارده
  const today = localDateOf(new Date())
  for (const row of pack.keys) {
    const expected = row.rows.map(entry => entry.effectiveFrom).filter(date => date <= today).sort().at(-1) ?? null
    assert.deepEqual(row.rows.filter(entry => entry.current).map(entry => entry.effectiveFrom), expected ? [expected] : [], row.key)
  }
  const tax = keyOf(pack, 'eg.salary_tax.brackets')
  assert.deepEqual([tax.label, tax.card, tax.codes.length, tax.rows[0].effectiveFrom, tax.rows[0].values.band_5_pct, tax.rows[0].values.personal_exemption, tax.codes.find(row => row.code === 'band_top_pct').label],
    ['ضريبة كسب العمل — الشرائح والإعفاء', 'C-EG-01', 18, '2024-03-01', '22.5', '20000', 'فوق الشريحة 6 (%)'])
  assert.deepEqual(keyOf(pack, 'sa.gosi.new_track').rows.map(entry => entry.effectiveFrom), ['2028-07-03', '2027-07-03', '2026-07-03', '2025-07-03', '2024-07-03'], 'الأحدث الأول')
  assert.deepEqual(keyOf(pack, 'sa.end_of_service').rows[0].values.resignation_low_fraction, '0.3333')
})

test('SK-02: التعديل لمدير النظام بس — صف بتاريخ جديد بخانات المفتاح، وتعديل بالمبعوت بس، و«اتأكد» والمصدر، وسطر تدقيق، والقراءة بالتاريخ الفعّال', async () => {
  const wage = { country: 'EG', key: 'eg.minimum_wage', effectiveFrom: '2027-03-01', values: { monthly_amount: '8000' } }
  // مش مدير نظام (حتى بصلاحية الإعدادات): 403 للإضافة والتعديل
  const current = keyOf(expectStatus(await request(users.admin, 'GET', S), 200), 'eg.minimum_wage').rows[0]
  assert.deepEqual([answer(await request(users.settings, 'POST', S, wage)), answer(await request(users.settings, 'PATCH', `${S}/${current.id}`, { verified: true })), (await request(users.plain, 'POST', S, wage)).status],
    [[403, rules.STATUTORY_ADMIN_ONLY], [403, rules.STATUTORY_ADMIN_ONLY], 403])
  const add = body => request(users.admin, 'POST', S, body)
  for (const [bad, message] of [[{ ...wage, key: 'eg.made_up' }, rules.STATUTORY_KEY_UNKNOWN], [{ ...wage, country: 'SA' }, rules.STATUTORY_KEY_UNKNOWN], [{ ...wage, effectiveFrom: '2027-02-30' }, rules.STATUTORY_DATE],
    [{ ...wage, effectiveFrom: '1989-12-31' }, rules.STATUTORY_DATE], [{ ...wage, values: {} }, rules.STATUTORY_VALUES], [{ ...wage, values: { monthly_amount: '-1' } }, rules.STATUTORY_VALUES],
    [{ ...wage, values: { monthly_amount: '8000', bonus: '1' } }, rules.STATUTORY_VALUES], [{ ...wage, values: { monthly_amount: 'تمانية آلاف' } }, rules.STATUTORY_VALUES], [{ ...wage, source: 'ت'.repeat(301) }, rules.STATUTORY_SOURCE],
    [{ ...wage, verified: 'yes' }, rules.STATUTORY_VERIFIED]]) assert.deepEqual(answer(await add(bad)), [400, message], JSON.stringify(bad).slice(0, 80))
  const before = await repo('StatutoryDefinition').count()
  // ضغطتين مع بعض بنفس التاريخ: صف واحد
  const race = await Promise.all([add({ ...wage, source: ' قرار المجلس القومي للأجور ', verified: true }), add({ ...wage, source: ' قرار المجلس القومي للأجور ', verified: true })])
  assert.deepEqual([race.map(response => response.status).sort(), race.find(response => response.status === 409).body.message, await repo('StatutoryDefinition').count()], [[201, 409], rules.STATUTORY_EXISTS, before + 1])
  const added = keyOf(race.find(response => response.status === 201).body, 'eg.minimum_wage')
  assert.deepEqual(added.rows.map(entry => [entry.effectiveFrom, entry.values.monthly_amount, entry.verified, entry.source, entry.current]),
    [['2027-03-01', '8000', true, 'قرار المجلس القومي للأجور', false], ['2025-03-01', '7000', false, current.source, true]])
  // القراءة بالتاريخ الفعّال: الصف الجديد من تاريخه بس
  const entries = await readStatutoryEntries(ds.manager)
  const at = date => statutoryNumber(statutoryAt(entries, 'EG', 'eg.minimum_wage', date), 'monthly_amount')
  assert.deepEqual([at('2025-02-28'), at('2026-12-31'), at('2027-02-28'), at('2027-03-01'), at('2030-01-01')], [null, 7000, 7000, 8000, 8000])

  // التعديل: المبعوت بس، وبنفس الخانات
  const caps = keyOf(expectStatus(await request(users.admin, 'GET', S), 200), 'sa.deduction_caps').rows[0]
  const patch = (id, body) => request(users.admin, 'PATCH', `${S}/${id}`, body)
  assert.deepEqual([answer(await patch(caps.id, {})), answer(await patch(caps.id, { values: { total_pct: '50' } })), answer(await patch(caps.id, { values: { other: '1' } })), answer(await patch(caps.id, { values: { total_pct: 'x' } })),
    answer(await patch(caps.id, { verified: 1 })), answer(await patch(987654, { verified: true }))],
  [[400, rules.STATUTORY_NOTHING], [400, rules.STATUTORY_NOTHING], [400, rules.STATUTORY_VALUES], [400, rules.STATUTORY_VALUES], [400, rules.STATUTORY_VERIFIED], [404, rules.STATUTORY_NOT_FOUND]])
  const edited = keyOf(expectStatus(await patch(caps.id, { values: { total_pct: '45.5' }, verified: true, source: 'نص المادة 93' }), 200), 'sa.deduction_caps').rows[0]
  assert.deepEqual([edited.values, edited.verified, edited.source, edited.effectiveFrom], [{ loan_installment_pct: '10', total_pct: '45.5', fine_max_days_per_month: '5' }, true, 'نص المادة 93', caps.effectiveFrom])
  // سطر تدقيق لكل كتابة بقبل وبعد
  const [log] = await ds.query(`SELECT TOP (1) [before], [after], [actorUserId] FROM [audit_log] WHERE [action] = N'STATUTORY_ROW_UPDATED' ORDER BY [id] DESC`)
  assert.deepEqual([await audits('STATUTORY_ROW_ADDED'), await audits('STATUTORY_ROW_UPDATED'), JSON.parse(log.before), JSON.parse(log.after), log.actorUserId],
    [1, 1, { values: { total_pct: '50' }, verified: false, source: caps.source }, { values: { total_pct: '45.5' }, verified: true, source: 'نص المادة 93' }, users.admin.id])
  // البذرة مابتكتبش فوق تعديل مدير النظام ولا بتضيف حاجة
  assert.equal(await app.get(StatutorySeedService).seed(), 0)
  assert.equal(keyOf(expectStatus(await request(users.settings, 'GET', S), 200), 'sa.deduction_caps').rows[0].values.total_pct, '45.5')
  // مفتاح بيقراه حساب التأمينات: التعديل بيوصل للقراءة بالتاريخ الفعّال
  const limits = keyOf(expectStatus(await request(users.admin, 'GET', S), 200), 'eg.insurance.wage_limits').rows.find(entry => entry.effectiveFrom === '2027-01-01')
  expectStatus(await patch(limits.id, { values: { max_salary: '19500' } }), 200)
  const after = await readStatutoryEntries(ds.manager)
  assert.deepEqual([statutoryNumber(statutoryAt(after, 'EG', 'eg.insurance.wage_limits', '2026-12-31'), 'max_salary'), statutoryNumber(statutoryAt(after, 'EG', 'eg.insurance.wage_limits', '2027-01-31'), 'max_salary')], [16700, 19500])
})
