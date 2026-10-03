'use strict'
// B1.8b على SQL حقيقي: التصفية بتلم قيود الدفتر المعلّقة اللي المسير مش هياخدها، ورا إعداد مقفول (مقفول = التصفية زي ما كانت).
// قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_settlement_obligations_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_settlement_obligations_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-settlement-obligations-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let master, app, ds, base, branch, admin, created = false, sequence = 0, runNumber = 0
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null,
  employeeId: user.employeeId ?? null, tokenVersion: user.tokenVersion ?? 0, permissions: JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token(user) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const raw = await response.text(); return { status: response.status, body: raw ? JSON.parse(raw) : null }
}
const ok = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const setCollect = async value => ok(await request(admin, 'PATCH', '/settings/config', { key: 'settlement.collect_pending_obligations', value }), 200)
const obligationLines = rows => rows.filter(row => row.label.startsWith('قيود دفتر معلّقة'))
  .map(row => `${row.type}:${Number(row.amount).toFixed(2)}:${row.label}`).sort()

// آخر يوم عمل 10 يوليو 2099 (فترة المسير 23 يونيو ← 22 يوليو، فمفيش إنهاء فوري بعد الاعتماد)
async function fixture() {
  const employee = await repo('Employee').save({ employeeCode: 'SPO' + ++sequence, fullName: 'موظف اختبار قيود التصفية', branchId: branch.id,
    joinDate: '2020-01-01', status: 'active', isActive: true, basicSalary: 2400, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, payMethod: 'cash' })
  const kase = await repo('OffboardingCase').save({ employeeId: employee.id, lastWorkingDay: '2099-07-10', status: 'IN_SETTLEMENT', terminationReason: 'termination' })
  await repo('ClearanceItem').save(['manager', 'custody', 'it', 'finance', 'hr'].map(party => ({ caseId: kase.id, party, label: party, status: 'DONE' })))
  const reserving = await repo('PayrollRun').save({ name: `مسير حجز ${++runNumber}`, scopeType: 'CUSTOM', employeeIds: JSON.stringify([employee.id]),
    period: '2099-08', startDate: '2099-07-23', endDate: '2099-08-22', status: 'APPROVED' })
  const save = (type, category, amount, label, extra = {}) => repo('EmployeeObligation').save({ employeeId: employee.id, type, category, amount, label, status: 'PENDING', ...extra })
  const o = {
    nextInstallment: await save('DEBIT', 'deduction', 300, 'قسط خصم مصنف لشهر جاي', { targetPeriod: '2099-08' }),
    carried: await save('DEBIT', 'deduction', 125.5, 'باقي مترحّل بعد حماية الصافي', { targetPeriod: '2099-08', effectiveDate: '2099-07-23' }),
    laterBonus: await save('CREDIT', 'bonus', 500, 'مكافأة لشهر لاحق', { targetPeriod: '2099-09' }),
    sameMonth: await save('DEBIT', 'fine', 200, 'غرامة شهر آخر يوم', { targetPeriod: '2099-07' }),
    immediate: await save('DEBIT', 'manual', 50, 'قيد فوري'),
    reserved: await save('DEBIT', 'deduction', 70, 'محجوز لمسير معتمد', { targetPeriod: '2099-08', reservedPayrollRunId: reserving.id }),
    cancelled: await save('DEBIT', 'deduction', 80, 'ملغي', { targetPeriod: '2099-08', status: 'CANCELLED' }),
    suspended: await save('DEBIT', 'deduction', 90, 'معلق لقرار', { targetPeriod: '2099-08', status: 'SUSPENDED' }),
  }
  return { employee, kase, o }
}
const recalc = async f => ok(await request(admin, 'POST', `/offboarding/${f.kase.id}/recalc-lines`), 201)
const lastMonthRun = (f, status) => repo('PayrollRun').save({ name: `مسير آخر شهر ${++runNumber}`, scopeType: 'CUSTOM', employeeIds: JSON.stringify([f.employee.id]),
  period: '2099-07', startDate: '2099-06-23', endDate: '2099-07-22', status })
  .then(run => repo('PayrollItem').save({ runId: run.id, employeeId: f.employee.id, basicSalary: 2400, netPay: 800, payMethod: 'cash', breakdown: JSON.stringify({}) }).then(() => run))
const statuses = async f => Object.fromEntries(await Promise.all(Object.entries(f.o).map(async ([key, row]) => {
  const saved = await repo('EmployeeObligation').findOneByOrFail({ id: row.id })
  return [key, `${saved.status}${saved.appliedPayrollRunId ? ':run' : ''}`]
})))

before(async () => {
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true } }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1'); ds = app.get(require('../node_modules/typeorm').DataSource)
  assert.equal(ds.options.database, database)
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  branch = await repo('Branch').save({ code: 'SPO', name: 'فرع اختبار قيود التصفية' })
  admin = await repo('User').save({ email: 'admin@settlement-obligations.invalid', displayName: 'Fixture admin', passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  for (const [key, value] of [['payroll.monthly_days', '30'], ['payroll.daily_hours', '8'], ['payroll.cycle_start_day', '23'],
    ['payroll.salary_evidence_mode', 'MONTHLY_HISTORY_OR_CURRENT_FILE']]) {
    const found = await repo('RequestsConfig').findOneBy({ key })
    if (found) await repo('RequestsConfig').update({ key }, { value }); else await repo('RequestsConfig').save({ key, value })
  }
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

test('SPO-01: الإعداد مقفول افتراضيًا — التصفية زي ما كانت: مفيش بند قيود، واللقطة من غير مفاتيح القيود، والقيود زي ما هي', async () => {
  const seeded = await repo('RequestsConfig').findOneBy({ key: 'settlement.collect_pending_obligations' })
  assert.equal(seeded?.value, 'false')
  const f = await fixture(); const before = await statuses(f)
  await recalc(f)
  assert.deepEqual(obligationLines(await repo('SettlementLine').findBy({ caseId: f.kase.id })), [])
  const snapshot = (await repo('OffboardingCase').findOneByOrFail({ id: f.kase.id })).settlementFinancialSnapshot
  assert.equal('obligations' in snapshot, false)
  ok(await request(admin, 'POST', `/offboarding/${f.kase.id}/approve-settlement`), 201)
  assert.deepEqual(await statuses(f), before)
})

test('SPO-02: مفتوح — القيود اللي شهرها بعد آخر شهر بتدخل بندين، واللي في شهر آخر يوم والمسير لسه مش معتمد والمحجوز والملغي والمعلّق لأ؛ والاعتماد بيعلّمها مستهلكة', async () => {
  await setCollect('true')
  try {
    const f = await fixture()
    // مسير آخر شهر لسه محسوب (مش معتمد): غرامة الشهر والقيد الفوري هياخدهم المسير
    await lastMonthRun(f, 'CALCULATED')
    await recalc(f)
    assert.deepEqual(obligationLines(await repo('SettlementLine').findBy({ caseId: f.kase.id })),
      ['CREDIT:500.00:قيود دفتر معلّقة — إضافات (1)', 'DEBIT:425.50:قيود دفتر معلّقة — خصومات (2)'])
    const snapshot = (await repo('OffboardingCase').findOneByOrFail({ id: f.kase.id })).settlementFinancialSnapshot
    assert.deepEqual(snapshot.obligations.map(row => row.id), [f.o.nextInstallment.id, f.o.carried.id, f.o.laterBonus.id])
    assert.deepEqual([snapshot.obligationDebitAmount, snapshot.obligationCreditAmount], [425.5, 500])
    assert.ok(snapshot.obligationDebitLineId && snapshot.obligationCreditLineId)
    // المعاينة من غير ملف بتعرض نفس البندين
    const preview = ok(await request(admin, 'GET', `/offboarding/preview?employeeId=${f.employee.id}&reason=termination&lastWorkingDay=2099-07-10`), 200)
    assert.deepEqual(obligationLines(preview.lines), ['CREDIT:500.00:قيود دفتر معلّقة — إضافات (1)', 'DEBIT:425.50:قيود دفتر معلّقة — خصومات (2)'])

    ok(await request(admin, 'POST', `/offboarding/${f.kase.id}/approve-settlement`), 201)
    assert.deepEqual(await statuses(f), { nextInstallment: 'APPLIED', carried: 'APPLIED', laterBonus: 'APPLIED', sameMonth: 'PENDING', immediate: 'PENDING',
      reserved: 'PENDING', cancelled: 'CANCELLED', suspended: 'SUSPENDED' })
    const applied = await repo('EmployeeObligation').findOneByOrFail({ id: f.o.carried.id })
    assert.deepEqual([Number(applied.appliedAmount), applied.appliedPayrollRunId, !!applied.appliedAt], [125.5, null, true])
    // إلغاء الملف المعتمد اللي سوّى قيود مرفوض
    const withdraw = await request(admin, 'POST', `/offboarding/${f.kase.id}/withdraw`)
    assert.equal(withdraw.status, 409, JSON.stringify(withdraw.body))
    assert.match(JSON.stringify(withdraw.body), /سوّت قيود دفتر/)
    assert.equal((await repo('OffboardingCase').findOneByOrFail({ id: f.kase.id })).status, 'SETTLED')
  } finally { await setCollect('false') }
})

test('SPO-03: مسير آخر شهر معتمد — قيد شهر آخر يوم والقيد الفوري اللي برّه المسير بيتلموا كمان (مفيش مسير هياخدهم)', async () => {
  await setCollect('true')
  try {
    const f = await fixture()
    await lastMonthRun(f, 'APPROVED')
    await recalc(f)
    assert.deepEqual(obligationLines(await repo('SettlementLine').findBy({ caseId: f.kase.id })),
      ['CREDIT:500.00:قيود دفتر معلّقة — إضافات (1)', 'DEBIT:675.50:قيود دفتر معلّقة — خصومات (4)'])
    ok(await request(admin, 'POST', `/offboarding/${f.kase.id}/approve-settlement`), 201)
    const after = await statuses(f)
    assert.deepEqual([after.sameMonth, after.immediate, after.reserved], ['APPLIED', 'APPLIED', 'PENDING'])
  } finally { await setCollect('false') }
})

test('SPO-04: قيد اتلغى بعد التوليد، أو الإعداد اتفتح بعد التوليد — الاعتماد 409 «أعد توليد البنود» من غير أي تغيير', async () => {
  await setCollect('true')
  try {
    const f = await fixture()
    await recalc(f)
    const lines = await repo('SettlementLine').find({ where: { caseId: f.kase.id }, order: { id: 'ASC' } })
    await repo('EmployeeObligation').update({ id: f.o.nextInstallment.id }, { status: 'CANCELLED' })
    const before = await statuses(f)
    const rejected = await request(admin, 'POST', `/offboarding/${f.kase.id}/approve-settlement`)
    assert.equal(rejected.status, 409, JSON.stringify(rejected.body))
    assert.match(JSON.stringify(rejected.body), /أعد توليد البنود/)
    assert.deepEqual(await statuses(f), before)
    assert.equal((await repo('OffboardingCase').findOneByOrFail({ id: f.kase.id })).status, 'IN_SETTLEMENT')
    assert.deepEqual(await repo('SettlementLine').find({ where: { caseId: f.kase.id }, order: { id: 'ASC' } }), lines)
    // بعد إعادة التوليد: البند من غير الملغي، والاعتماد بيعدّي
    await recalc(f)
    assert.deepEqual(obligationLines(await repo('SettlementLine').findBy({ caseId: f.kase.id })),
      ['CREDIT:500.00:قيود دفتر معلّقة — إضافات (1)', 'DEBIT:125.50:قيود دفتر معلّقة — خصومات (1)'])
    ok(await request(admin, 'POST', `/offboarding/${f.kase.id}/approve-settlement`), 201)
  } finally { await setCollect('false') }

  // الإعداد اتفتح بعد توليد البنود وهو مقفول
  const g = await fixture()
  await recalc(g)
  await setCollect('true')
  try {
    const rejected = await request(admin, 'POST', `/offboarding/${g.kase.id}/approve-settlement`)
    assert.equal(rejected.status, 409, JSON.stringify(rejected.body))
    assert.equal((await repo('EmployeeObligation').findOneByOrFail({ id: g.o.nextInstallment.id })).status, 'PENDING')
  } finally { await setCollect('false') }
})

test('SPO-05: بند القيود المعدّل يدويًا بيترفض عند الاعتماد، والتسوية اليدوية جنبه مسموحة', async () => {
  await setCollect('true')
  try {
    const f = await fixture()
    await recalc(f)
    const snapshot = (await repo('OffboardingCase').findOneByOrFail({ id: f.kase.id })).settlementFinancialSnapshot
    ok(await request(admin, 'PATCH', `/offboarding/lines/${snapshot.obligationDebitLineId}`, { amount: 400 }), 200)
    assert.equal((await request(admin, 'POST', `/offboarding/${f.kase.id}/approve-settlement`)).status, 409)
    await recalc(f)
    ok(await request(admin, 'POST', `/offboarding/${f.kase.id}/lines`, { label: 'مسامحة جزء من الغرامة', type: 'CREDIT', amount: 25.5 }), 201)
    ok(await request(admin, 'POST', `/offboarding/${f.kase.id}/approve-settlement`), 201)
    assert.equal((await repo('EmployeeObligation').findOneByOrFail({ id: f.o.nextInstallment.id })).status, 'APPLIED')
  } finally { await setCollect('false') }
})
