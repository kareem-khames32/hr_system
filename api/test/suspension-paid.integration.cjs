'use strict'
// B4.5 (د) على SQL حقيقي: الإيقاف الاحتياطي بأجر — مقفول افتراضيًا (كل إيقاف بيتخصم زي الأول)؛ مفتوح: إيقاف «بأجر» أيامه ماتتخصمش في المسير
// وباقي أثره زي ما هو، وحد المدة من حزمة دولة الفرع لما صفه «اتأكد» (مصر 60 يوم؛ السعودية من غير حد)، وترحيل 137 والشغل قبله.
// قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_suspension_paid_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_suspension_paid_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-suspension-paid-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/employees/employee-suspension-rules')
const MIGRATION = path.resolve(apiRoot, '..', 'docs', 'migrations', 'payroll', '20261009_137_suspension_paid.sql')
const KEY = rules.SUSPENSION_PAID_KEY
let master, pool, app, ds, base, admin, hr, created = false, sequence = 0
const B = {}
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false, permissions: JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token(user) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const raw = await response.text(); return { status: response.status, body: raw ? JSON.parse(raw) : null }
}
const ok = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const refused = (response, status, message) => { assert.equal(response.status, status, JSON.stringify(response.body)); assert.equal([].concat(response.body?.message ?? []).join(' | '), message) }
const setPaid = value => request(admin, 'PATCH', '/settings/config', { key: KEY, value })
// استثناء حضور طول السنة يعزل الحساب عن الغياب والتأخير (نفس تجهيز اختبار الإيقاف القايم)
async function employee(branch) {
  const emp = await repo('Employee').save({ employeeCode: 'SP' + ++sequence, fullName: 'موظف إيقاف بأجر ' + sequence, branchId: branch.id, joinDate: '2020-01-01',
    basicSalary: 9000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'cash' })
  await repo('AttendanceExemption').save({ employeeId: emp.id, effectiveFrom: '2026-01-01', effectiveTo: '2027-12-31', reasonCode: 'field_role',
    reason: 'نافذة اختبار معزولة', status: 'APPROVED', createdByUserId: admin.id, approvedByUserId: admin.id,
    approvedAt: new Date('2026-01-01T08:00:00Z'), terminatedFrom: null, overtimeEligibleOverride: null, unpaidLeaveDeductibleOverride: null, requiresCheckinForPresence: false })
  return emp
}
const suspend = (emp, fromDate, toDate, extra = {}, user = admin) => request(user, 'POST', `/employees/${emp.id}/suspensions`, { fromDate, toDate, reason: 'إيقاف أثناء التحقيق', ...extra })
const options = async (emp, user = admin) => ok(await request(user, 'GET', `/employees/${emp.id}/suspension-options`), 200)
async function runItem(emp, period) {
  const run = ok(await request(admin, 'POST', '/payroll/runs/calculate-defined', { period, scopeType: 'CUSTOM', employeeIds: [emp.id], name: `إيقاف بأجر ${crypto.randomUUID().slice(0, 8)}` }), 201)
  const item = run.items.find(row => row.employeeId === emp.id)
  assert.ok(item, 'الموظف في المسير')
  return { item, breakdown: JSON.parse(item.breakdown), runId: run.id }
}
const brief = ({ item, breakdown }) => [Number(item.unpaidLeaveDays), Number(item.unpaidLeaveDeduction), Number(item.absenceDays), Number(item.netPay),
  (breakdown.leaveDeductionLines ?? []).map(line => [line.code, line.days, line.amount]), breakdown.suspension?.days ?? null, breakdown.suspension?.dates?.length ?? 0]
const runMigration = async () => { assert.match(database, NAME); for (const batch of migrate.splitBatches(fs.readFileSync(MIGRATION, 'utf8').replace(/\r\n/g, '\n'))) await pool.request().batch(batch) }
const paidColumn = async () => (await pool.request().query(`SELECT t.[name] AS [type], c.[is_nullable] FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id]
  WHERE c.[object_id] = OBJECT_ID(N'dbo.employee_suspensions') AND c.[name] = N'isPaid'`)).recordset.map(row => Object.values(row).join(':'))
const verify = async key => {
  const pack = ok(await request(admin, 'GET', '/settings/statutory'), 200)
  for (const row of pack.keys.find(entry => entry.key === key).rows) if (!row.verified) ok(await request(admin, 'PATCH', `/settings/statutory/${row.id}`, { verified: true }), 200)
}

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
  B.eg = await repo('Branch').save({ code: 'SP_EG', name: 'فرع القاهرة', country: 'EG' })
  B.sa = await repo('Branch').save({ code: 'SP_SA', name: 'فرع الرياض', country: 'SA' })
  admin = await repo('User').save({ email: 'admin@suspension-paid.invalid', displayName: 'Fixture admin', passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  hr = await repo('User').save({ email: 'hr@suspension-paid.invalid', displayName: 'Fixture branch HR', passwordHash: 'test-only', role: 'hr_manager', branchId: B.eg.id,
    permissions: JSON.stringify(['employees.view', 'employees.edit']) })
  const { configSeed } = require('../src/seed/requests-seed.data')
  assert.deepEqual(configSeed.filter(row => row.key === KEY), [{ key: KEY, value: 'false' }], 'الإعداد مبذور مقفول')
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '1' }, { key: 'payroll.monthly_days', value: '30' }, { key: 'payroll.daily_hours', value: '8' },
    { key: 'payroll.exempt_overtime_eligible', value: 'false' }, { key: 'payroll.exempt_unpaid_leave_deductible', value: 'true' },
    { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' }, { key: KEY, value: 'false' },
  ])
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

test('PS-01: قبل ترحيل 137 الإيقاف العادي شغال وبيتخصم، و«بأجر» مش متاح وبيترفض؛ والترحيل بيضيف العمود بشكل الكيان وبيتكرر بأمان', async () => {
  const text = fs.readFileSync(MIGRATION)
  assert.equal(text.includes(Buffer.from('\r\n')), false, 'LF بس — git بيخزّن الملف LF')
  assert.notDeepEqual([...text.subarray(0, 3)], [0xef, 0xbb, 0xbf])
  assert.deepEqual([...new Set(String(text).match(/THROW \d+/g))], ['THROW 137001', 'THROW 137002', 'THROW 137003'])
  assert.doesNotMatch(String(text), /\bDROP\b|\bTRUNCATE\b|\bDELETE\b/i)
  assert.deepEqual(await paidColumn(), ['bit:true'])
  await runMigration()
  assert.deepEqual(await paidColumn(), ['bit:true'])
  // قبل الترحيل (قاعدة الاختبار بس): العمود مش موجود
  await pool.request().batch('ALTER TABLE dbo.employee_suspensions DROP COLUMN [isPaid]')
  ok(await setPaid('true'), 200)
  const emp = await employee(B.eg)
  assert.deepEqual(await options(emp), { paidAvailable: false, paidMaxDays: null })
  refused(await suspend(emp, '2026-03-02', '2026-03-04', { paid: true }), 400, rules.SUSPENSION_PAID_MIGRATION)
  assert.equal((await repo('EmployeeSuspension').countBy({ employeeId: emp.id })), 0, 'الرفض مابيسيبش إيقاف')
  const plain = ok(await suspend(emp, '2026-03-02', '2026-03-04'), 201)
  assert.equal(plain.paid, false)
  assert.deepEqual(ok(await request(admin, 'GET', `/employees/${emp.id}/suspensions`), 200).map(row => row.paid), [false])
  assert.deepEqual(brief(await runItem(emp, '2026-03')), [3, 900, 0, 8100, [['SUSPENSION', 3, 900]], 3, 3])
  // عمود بشكل تاني بيوقّف الترحيل
  await pool.request().batch('ALTER TABLE dbo.employee_suspensions ADD [isPaid] int NULL')
  await assert.rejects(runMigration(), error => (error.number ?? error.originalError?.info?.number) === 137002)
  await pool.request().batch('ALTER TABLE dbo.employee_suspensions DROP COLUMN [isPaid]')
  await runMigration(); await runMigration()
  assert.deepEqual(await paidColumn(), ['bit:true'])
  assert.deepEqual(await options(emp), { paidAvailable: true, paidMaxDays: null })
  ok(await setPaid('false'), 200)
})

test('PS-02: الإعداد مقفول (الافتراضي) — «بأجر» مش معروض وبيترفض، وكل إيقاف بيتخصم يوم بيوم زي الأول في فرع مصري وسعودي', async () => {
  for (const branch of [B.eg, B.sa]) {
    const emp = await employee(branch)
    assert.deepEqual(await options(emp), { paidAvailable: false, paidMaxDays: null })
    refused(await suspend(emp, '2026-04-05', '2026-04-09', { paid: true }), 400, rules.SUSPENSION_PAID_CLOSED)
    assert.equal(ok(await suspend(emp, '2026-04-05', '2026-04-09', { paid: false }), 201).paid, false)
    assert.deepEqual(brief(await runItem(emp, '2026-04')), [5, 1500, 0, 7500, [['SUSPENSION', 5, 1500]], 5, 5])
  }
  // المفتاح بقيمتين بس، ولحساب بكل الفروع
  assert.equal((await setPaid('yes')).status, 400)
  assert.equal((await request(hr, 'PATCH', '/settings/config', { key: KEY, value: 'true' })).status, 403)
})

test('PS-03: الإعداد مفتوح — إيقاف «بأجر» أيامه موقوفة ومش مخصومة في المسير والتراكم اليومي، والإيقاف العادي جنبه بيتخصم — مصر والسعودية', async () => {
  ok(await setPaid('true'), 200)
  for (const branch of [B.eg, B.sa]) {
    const emp = await employee(branch)
    assert.deepEqual(await options(emp), { paidAvailable: true, paidMaxDays: null })
    const paid = ok(await suspend(emp, '2026-05-03', '2026-05-07', { paid: true }), 201)
    assert.deepEqual([paid.paid, paid.state !== undefined], [true, true])
    const unpaid = ok(await suspend(emp, '2026-05-17', '2026-05-18'), 201)
    assert.equal(unpaid.paid, false)
    assert.deepEqual(ok(await request(admin, 'GET', `/employees/${emp.id}/suspensions`), 200).map(row => [row.fromDate, row.paid]), [['2026-05-17', false], ['2026-05-03', true]])
    assert.deepEqual((await repo('EmployeeStatusHistory').find({ where: { employeeId: emp.id, fieldName: 'suspension' }, order: { id: 'ASC' } })).map(row => row.newValue),
      ['إيقاف عن العمل 2026-05-03 → 2026-05-07 (احتياطي بأجر)', 'إيقاف عن العمل 2026-05-17 → 2026-05-18'])
    // المسير: 5 أيام بأجر من غير خصم + يومين عاديين بيتخصموا؛ والسبع أيام كلها موقوفة (مش غياب)
    assert.deepEqual(brief(await runItem(emp, '2026-05')), [2, 600, 0, 8400, [['SUSPENSION', 2, 600]], 2, 7])
    // إنهاء الإيقاف بأجر بدري بيفضل «بأجر» في السجل
    const ended = ok(await request(admin, 'POST', `/employees/${emp.id}/suspensions/${paid.id}/end`, { returnDate: '2026-05-06' }), 201)
    assert.deepEqual([ended.paid, ended.status, ended.toDate], [true, 'ENDED_EARLY', '2026-05-05'])
  }
  // موظف كل إيقافه بأجر: مفيش سطر إيقاف والصافي كامل
  const full = await employee(B.sa)
  ok(await suspend(full, '2026-06-01', '2026-06-30', { paid: true }), 201)
  const fullRun = await runItem(full, '2026-06')
  assert.deepEqual(brief(fullRun), [0, 0, 0, 9000, [], 0, 30])
  // التراكم اليومي (الراتب الحي): أيام الإيقاف بأجر موقوفة ومن غير مبلغ إيقاف؛ والإيقاف العادي بمبلغه
  const accrual = app.get(require('../src/payroll/payroll-daily-accrual.service').PayrollDailyAccrualService)
  const accrued = async run => {
    const totals = await accrual.accrueRun(run.runId, { upTo: '2026-12-31' })
    const rows = await repo('PayrollDailyAccrual').find({ where: { employeeId: run.item.employeeId } })
    assert.ok(rows.length, JSON.stringify(totals))
    return [rows.filter(row => row.isSuspended).length, rows.reduce((sum, row) => sum + Number(row.suspensionAmount), 0)]
  }
  assert.deepEqual(await accrued(fullRun), [30, 0])
  const mixed = await employee(B.eg)
  ok(await suspend(mixed, '2026-06-01', '2026-06-03', { paid: true }), 201)
  ok(await suspend(mixed, '2026-06-10', '2026-06-11'), 201)
  assert.deepEqual(await accrued(await runItem(mixed, '2026-06')), [5, 600])
  // حساب الفرع بيسجّل لموظف فرعه بس
  const mine = await employee(B.eg), other = await employee(B.sa)
  assert.equal(ok(await suspend(mine, '2026-07-01', '2026-07-02', { paid: true }, hr), 201).paid, true)
  assert.equal((await suspend(other, '2026-07-01', '2026-07-02', { paid: true }, hr)).status, 404)
  assert.equal((await request(hr, 'GET', `/employees/${other.id}/suspension-options`)).status, 404)
})

test('PS-04: حد مدة الإيقاف بأجر من حزمة دولة الفرع لما صفه «اتأكد» — مصر 60 يوم والسعودية من غير حد؛ و«محتاج تحقق» مايقيّدش', async () => {
  ok(await setPaid('true'), 200)
  const eg = await employee(B.eg), sa = await employee(B.sa)
  // الصف لسه «محتاج تحقق»: مفيش حد
  assert.deepEqual(await options(eg), { paidAvailable: true, paidMaxDays: null })
  assert.equal(ok(await suspend(eg, '2026-08-01', '2026-10-15', { paid: true }), 201).paid, true)
  await verify('eg.termination')
  const egTwo = await employee(B.eg)
  assert.deepEqual([await options(egTwo), await options(sa)], [{ paidAvailable: true, paidMaxDays: 60 }, { paidAvailable: true, paidMaxDays: null }])
  refused(await suspend(egTwo, '2026-08-01', '2026-09-30', { paid: true }), 400, rules.suspensionPaidTooLong(60))
  assert.equal(await repo('EmployeeSuspension').countBy({ employeeId: egTwo.id }), 0)
  // 60 يوم بالظبط مسموح، والإيقاف العادي (من غير أجر) مالوش الحد ده، والسعودية من غير حد
  assert.equal(ok(await suspend(egTwo, '2026-08-01', '2026-09-29', { paid: true }), 201).paid, true)
  const egThree = await employee(B.eg)
  assert.equal(ok(await suspend(egThree, '2026-08-01', '2026-10-15'), 201).paid, false)
  assert.equal(ok(await suspend(sa, '2026-08-01', '2026-10-15', { paid: true }), 201).paid, true)
  // الموظف المنقول بحد دولة فرعه الحالي
  const moved = await employee(B.sa)
  await repo('Employee').update({ id: moved.id }, { branchId: B.eg.id })
  refused(await suspend(moved, '2026-08-01', '2026-10-15', { paid: true }), 400, rules.suspensionPaidTooLong(60))
})
