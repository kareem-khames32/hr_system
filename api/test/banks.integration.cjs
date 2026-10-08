'use strict'
// B4.6 (ب) على SQL حقيقي: جدول البنوك (ترحيل 138 والشغل قبله)، وإضافته وتعديله لحساب بكل الفروع، وتنبيه «كود البنك في الآيبان مش في جدول
// البنوك» في كشف البنك وشاشة الصرف — الجدول الفاضي = الكشف زي الأول — لموظفين بآيبان سعودي ومصري. قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_banks_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_banks_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-banks-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const banks = require('../src/payroll/banks')
const MIGRATION = path.resolve(apiRoot, '..', 'docs', 'migrations', 'payroll', '20261009_138_banks.sql')
const S = '/settings/banks'
let master, pool, app, ds, base, admin, scoped, created = false, sequence = 0
const B = {}, E = {}
const repo = name => { assert.match(database, NAME); assert.equal(ds.options.database, database); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token(user) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const raw = await response.text(); return { status: response.status, body: raw ? JSON.parse(raw) : null }
}
const ok = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const answer = response => [response.status, [].concat(response.body?.message ?? []).join('، ')]
const SA = code => `SA03${code}${'1'.repeat(18)}`
const EG = code => `EG38${code}${'2'.repeat(21)}`
// استثناء حضور طول السنة يعزل الحساب عن الغياب والتأخير
async function employee(branch, iban, extra = {}) {
  const emp = await repo('Employee').save({ employeeCode: 'BK' + ++sequence, fullName: 'موظف البنوك ' + sequence, branchId: branch.id, joinDate: '2020-01-01', basicSalary: 9000,
    housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'transfer', bankName: 'بنك الموظف', iban, ...extra })
  await repo('AttendanceExemption').save({ employeeId: emp.id, effectiveFrom: '2026-01-01', effectiveTo: '2027-12-31', reasonCode: 'field_role', reason: 'نافذة اختبار معزولة', status: 'APPROVED',
    createdByUserId: admin.id, approvedByUserId: admin.id, approvedAt: new Date('2026-01-01T08:00:00Z'), terminatedFrom: null, overtimeEligibleOverride: null, unpaidLeaveDeductibleOverride: null,
    requiresCheckinForPresence: false })
  return emp
}
const runMigration = async () => { assert.match(database, NAME); for (const batch of migrate.splitBatches(fs.readFileSync(MIGRATION, 'utf8').replace(/\r\n/g, '\n'))) await pool.request().batch(batch) }
const tableExists = async () => (await pool.request().query(`SELECT OBJECT_ID(N'dbo.banks', N'U') AS id`)).recordset[0].id != null
const sheetOf = async (runId, user = admin) => ok(await request(user, 'GET', `/payroll/runs/${runId}/bank-sheet`), 200)
const issuesOf = sheet => Object.fromEntries(sheet.rows.map(row => [row.employeeId, row.issue]))
const moneyOf = sheet => [sheet.rows.map(row => [row.employeeId, row.bankAmount, row.cashAmount, row.netPay]), sheet.totals]

before(async () => {
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  const connection = { server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD, options: { encrypt: false, trustServerCertificate: true } }
  master = await new sql.ConnectionPool({ ...connection, database: 'master' }).connect()
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
  pool = await new sql.ConnectionPool({ ...connection, database }).connect()
  B.sa = await repo('Branch').save({ code: 'BK_SA', name: 'فرع الرياض', country: 'SA' })
  B.eg = await repo('Branch').save({ code: 'BK_EG', name: 'فرع القاهرة', country: 'EG' })
  admin = await repo('User').save({ email: 'admin@banks.invalid', displayName: 'Fixture admin', passwordHash: 'test-only', role: 'super_admin', scopeAllBranches: true, permissions: '[]' })
  scoped = await repo('User').save({ email: 'scoped@banks.invalid', displayName: 'Fixture branch settings', passwordHash: 'test-only', role: 'hr_manager', branchId: B.sa.id,
    permissions: JSON.stringify(['settings.manage', 'payroll.view']) })
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '1' }, { key: 'payroll.monthly_days', value: '30' }, { key: 'payroll.daily_hours', value: '8' },
    { key: 'payroll.exempt_overtime_eligible', value: 'false' }, { key: 'payroll.exempt_unpaid_leave_deductible', value: 'true' },
    { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' },
  ])
  E.rajhi = await employee(B.sa, SA('80'))
  E.unknownSa = await employee(B.sa, SA('99'))
  E.badIban = await employee(B.sa, 'SA0380')
  E.cash = await employee(B.sa, SA('99'), { payMethod: 'cash' })
  E.misr = await employee(B.eg, EG('0002'))
  E.unknownEg = await employee(B.eg, EG('0003'))
}, { timeout: 120000 })

after(async t => {
  if (pool) await pool.close()
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

test('BK-01: قبل ترحيل 138 الشاشة بتقول إن الجدول ناقص وكشف البنك شغال من غير تنبيه؛ والترحيل بيعمل الجدول بشكل الكيان وبيتكرر بأمان', async () => {
  const text = fs.readFileSync(MIGRATION)
  assert.equal(text.includes(Buffer.from('\r\n')), false, 'LF بس — git بيخزّن الملف LF')
  assert.notDeepEqual([...text.subarray(0, 3)], [0xef, 0xbb, 0xbf])
  assert.ok(String(text).match(/THROW \d+/g).every(code => /^THROW 1380\d\d$/.test(code)))
  assert.doesNotMatch(String(text), /\bDROP\b|\bTRUNCATE\b|\bDELETE\b/i)
  // شكل الكيان = شكل الترحيل: الملف بيعدّي على قاعدة synchronize من غير تغيير
  await runMigration()
  // قبل الترحيل (قاعدة الاختبار بس): الجدول مش موجود
  await pool.request().batch('DROP TABLE dbo.banks'); banks.resetBanksCache()
  assert.equal(await tableExists(), false)
  assert.deepEqual(ok(await request(admin, 'GET', S), 200), { available: false, canEdit: false, banks: [] })
  assert.deepEqual(answer(await request(admin, 'POST', S, { country: 'SA', ibanCode: '80', nameAr: 'مصرف الراجحي' })).slice(0, 1), [400])
  const run = ok(await request(admin, 'POST', '/payroll/runs/calculate-defined', { period: '2026-07', scopeType: 'CUSTOM', employeeIds: Object.values(E).map(emp => emp.id), name: 'بنوك قبل الترحيل' }), 201)
  B.run = run.id
  const sheet = await sheetOf(run.id)
  B.before = sheet
  assert.deepEqual(Object.entries(issuesOf(sheet)).filter(([, issue]) => issue).map(([id]) => Number(id)), [E.badIban.id], 'تنبيه الآيبان الغلط بس')
  await runMigration(); await runMigration()
  assert.equal(await tableExists(), true)
  assert.deepEqual(ok(await request(admin, 'GET', S), 200), { available: true, canEdit: true, banks: [] })
  // الجدول فاضي: الكشف زي ما كان بالحرف
  assert.deepEqual(await sheetOf(run.id), sheet)
})

test('BK-02: جدول البنوك — الإضافة والتعديل لحساب بكل الفروع بصلاحية الإعدادات، والدولة والكود فريدين وثابتين، ومفيش مسح', async () => {
  const rajhi = ok(await request(admin, 'POST', S, { country: 'sa', ibanCode: '80', nameAr: ' مصرف  الراجحي ', swiftCode: 'rjhisari' }), 201)
  assert.deepEqual(rajhi.banks.map(({ id: _id, ...row }) => row), [{ country: 'SA', ibanCode: '80', nameAr: 'مصرف الراجحي', nameEn: null, swiftCode: 'RJHISARI', isActive: true }])
  const id = rajhi.banks[0].id
  // مكرر، وقيم غلط، وتغيير الدولة أو الكود
  assert.deepEqual([(await request(admin, 'POST', S, { country: 'SA', ibanCode: '80', nameAr: 'تاني' })).status, (await request(admin, 'POST', S, { country: 'SA', ibanCode: '800', nameAr: 'بنك' })).status,
    (await request(admin, 'POST', S, { country: 'EG', ibanCode: '80', nameAr: 'بنك' })).status, (await request(admin, 'PATCH', `${S}/${id}`, { ibanCode: '81' })).status,
    (await request(admin, 'PATCH', `${S}/${id}`, {})).status, (await request(admin, 'PATCH', `${S}/987654`, { nameAr: 'بنك' })).status], [409, 400, 400, 400, 400, 404])
  // إضافتين مع بعض لنفس الكود: واحدة بس
  const race = await Promise.all([request(admin, 'POST', S, { country: 'EG', ibanCode: '0002', nameAr: 'بنك مصر' }), request(admin, 'POST', S, { country: 'EG', ibanCode: '0002', nameAr: 'بنك مصر' })])
  assert.deepEqual(race.map(response => response.status).sort(), [201, 409])
  assert.equal(await repo('Bank').count(), 2)
  // التعديل بالمبعوت بس، ومتسجّل في سجل التدقيق
  const edited = ok(await request(admin, 'PATCH', `${S}/${id}`, { nameEn: 'Al Rajhi Bank' }), 200).banks.find(row => row.id === id)
  assert.deepEqual([edited.nameAr, edited.nameEn, edited.swiftCode, edited.isActive], ['مصرف الراجحي', 'Al Rajhi Bank', 'RJHISARI', true])
  assert.deepEqual((await repo('AuditLog').find({ where: { entityType: 'bank' }, order: { id: 'ASC' } })).map(row => row.action), ['BANK_CREATED', 'BANK_CREATED', 'BANK_UPDATED'])
  // حساب الفرع بيشوف ومايعدّلش؛ ومن غير صلاحية الإعدادات 403؛ ومفيش مسار مسح
  const seen = ok(await request(scoped, 'GET', S), 200)
  assert.deepEqual([seen.canEdit, seen.banks.length], [false, 2])
  assert.deepEqual([(await request(scoped, 'POST', S, { country: 'SA', ibanCode: '10', nameAr: 'البنك الأهلي' })).status, (await request(scoped, 'PATCH', `${S}/${id}`, { isActive: false })).status], [403, 403])
  const plain = await repo('User').save({ email: 'plain@banks.invalid', displayName: 'plain', passwordHash: 'test-only', role: 'employee', branchId: B.sa.id, permissions: '["payroll.view"]' })
  assert.deepEqual([(await request(plain, 'GET', S)).status, (await request(admin, 'DELETE', `${S}/${id}`)).status], [403, 404])
})

test('BK-03: كشف البنك وشاشة الصرف — آيبان سليم كوده مش في الجدول متعلّم (السعودي والمصري)، من غير تغيير مبلغ، والتعطيل بيرجّع الدولة من غير تنبيه', async () => {
  const sheet = await sheetOf(B.run)
  const issues = issuesOf(sheet)
  assert.deepEqual([issues[E.rajhi.id], issues[E.misr.id], issues[E.cash.id], issues[E.badIban.id]], [null, null, null, issuesOf(B.before)[E.badIban.id]])
  assert.match(issues[E.unknownSa.id], /كود البنك في الآيبان \(99\) مش في جدول البنوك/)
  assert.match(issues[E.unknownEg.id], /كود البنك في الآيبان \(0003\) مش في جدول البنوك/)
  assert.deepEqual([moneyOf(sheet), sheet.issues.employees], [moneyOf(B.before), 3])
  // شاشة الصرف (للمسير المعتمد) بتبني صفوفها من نفس الدالة وبنفس جدول البنوك — متثبّتة في اختبار الوحدات BKU-06
  // مسير على فرعين مش ظاهر لحساب فرع واحد (قاعدة قايمة) — التنبيه مابيفتحش حاجة
  assert.equal((await request(scoped, 'GET', `/payroll/runs/${B.run}/bank-sheet`)).status, 403)
  // إضافة البنك الناقص بتشيل تنبيهه؛ وتعطيل كل بنوك مصر بيرجّع فروعها من غير تنبيه
  ok(await request(admin, 'POST', S, { country: 'SA', ibanCode: '99', nameAr: 'بنك تاني' }), 201)
  const misr = (await repo('Bank').findOneByOrFail({ country: 'EG', ibanCode: '0002' })).id
  ok(await request(admin, 'PATCH', `${S}/${misr}`, { isActive: false }), 200)
  const after = issuesOf(await sheetOf(B.run))
  assert.deepEqual([after[E.unknownSa.id], after[E.unknownEg.id], after[E.misr.id], after[E.badIban.id]], [null, null, null, issues[E.badIban.id]])
})
