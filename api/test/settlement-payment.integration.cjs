'use strict'
// B1.8c على SQL حقيقي: تسجيل صرف التصفية المعتمدة — التاريخ والطريقة والمرجع ومين، مرة واحدة، بصلاحية «اعتماد التصفية» في فرع الموظف.
// قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_settlement_payment_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_settlement_payment_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-settlement-payment-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let master, app, ds, base, created = false, sequence = 0
const B = {}, U = {}
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null,
  employeeId: user.employeeId ?? null, tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token(user) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const raw = await response.text(); return { status: response.status, body: raw ? JSON.parse(raw) : null }
}
const ok = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const localDate = (value = new Date()) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
const shift = days => { const value = new Date(); value.setDate(value.getDate() + days); return localDate(value) }
const paidColumns = id => ds.query(`SELECT CONVERT(nvarchar(10), [settlementPaidAt], 23) AS [paidAt], [settlementPaidByUserId] AS [by], [settlementPaymentMethod] AS [method],
  [settlementPaymentReference] AS [reference], [status], CAST([settlementNet] AS nvarchar(40)) AS [net] FROM [offboarding_cases] WHERE [id]=@0`, [id]).then(rows => rows[0])

async function settledCase(lastWorkingDay = '2099-07-10') {
  const employee = await repo('Employee').save({ employeeCode: 'SP' + ++sequence, fullName: 'موظف اختبار صرف التصفية', branchId: B.a.id,
    joinDate: '2020-01-01', status: 'active', isActive: true, basicSalary: 2400, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, payMethod: 'cash' })
  const kase = await repo('OffboardingCase').save({ employeeId: employee.id, lastWorkingDay, status: 'IN_SETTLEMENT', terminationReason: 'termination' })
  await repo('ClearanceItem').save(['manager', 'custody', 'it', 'finance', 'hr'].map(party => ({ caseId: kase.id, party, label: party, status: 'DONE' })))
  ok(await request(U.admin, 'POST', `/offboarding/${kase.id}/recalc-lines`), 201)
  return { employee, kase }
}

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
  B.a = await repo('Branch').save({ code: 'SP_A', name: 'فرع صرف التصفية' })
  B.b = await repo('Branch').save({ code: 'SP_B', name: 'فرع تاني' })
  const user = (email, role, branch, permissions) => repo('User').save({ email: `${email}@settlement-payment.invalid`, displayName: email, passwordHash: 'test-only',
    role, branchId: branch?.id ?? null, permissions: JSON.stringify(permissions) })
  U.admin = await user('admin', 'super_admin', null, ['*'])
  U.approver = await user('approver', 'hr', B.a, ['settlement.approve', 'offboarding.manage'])
  U.editor = await user('editor', 'hr', B.a, ['settlement.edit', 'offboarding.manage'])
  U.outsider = await user('outsider', 'hr', B.b, ['settlement.approve', 'offboarding.manage'])
  U.hrOnly = await user('hr-only', 'hr', B.a, ['offboarding.manage'])
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

test('SP-01: قبل الاعتماد مرفوض، ومن غير «اعتماد التصفية» 403، وبرّه الفرع 404 — ومفيش أي كتابة', async () => {
  const f = await settledCase()
  const early = await request(U.approver, 'POST', `/offboarding/${f.kase.id}/settlement-payment`, { date: localDate(), method: 'CASH' })
  assert.equal(early.status, 400, JSON.stringify(early.body))
  assert.match(JSON.stringify(early.body), /بعد اعتمادها/)
  ok(await request(U.approver, 'POST', `/offboarding/${f.kase.id}/approve-settlement`), 201)
  assert.equal((await request(U.editor, 'POST', `/offboarding/${f.kase.id}/settlement-payment`, { date: localDate(), method: 'CASH' })).status, 403)
  assert.equal((await request(U.outsider, 'POST', `/offboarding/${f.kase.id}/settlement-payment`, { date: localDate(), method: 'CASH' })).status, 404)
  const row = await paidColumns(f.kase.id)
  assert.deepEqual([row.paidAt, row.by, row.method, row.reference, row.status], [null, null, null, null, 'SETTLED'])
})

test('SP-02: التاريخ (مش بكره ولا قبل الاعتماد) والطريقة والمرجع، والتسجيل مرة واحدة، والتفاصيل بتعرضه للي بيشوف المبالغ بس — والصافي والحالة زي ما هم', async () => {
  const f = await settledCase()
  ok(await request(U.approver, 'POST', `/offboarding/${f.kase.id}/approve-settlement`), 201)
  const before = await paidColumns(f.kase.id)
  const url = `/offboarding/${f.kase.id}/settlement-payment`
  for (const [body, pattern] of [
    [{ date: shift(1), method: 'CASH' }, /النهارده أو قبله/],
    [{ date: shift(-1), method: 'CASH' }, /قبل اعتماد التصفية/],
    [{ date: '2026-02-30', method: 'CASH' }, /YYYY-MM-DD/],
    [{ date: localDate(), method: 'BANK_TRANSFER' }, /مرجع الصرف/],
    [{ date: localDate(), method: 'CHEQUE', reference: '   ' }, /مرجع الصرف/],
    [{ date: localDate(), method: 'GOLD' }, /طريقة الصرف/],
  ]) {
    const rejected = await request(U.approver, 'POST', url, body)
    assert.equal(rejected.status, 400, JSON.stringify(body))
    assert.match(JSON.stringify(rejected.body), pattern, JSON.stringify(body))
  }
  assert.deepEqual(await paidColumns(f.kase.id), before)

  const detail = ok(await request(U.approver, 'POST', url, { date: localDate(), method: 'BANK_TRANSFER', reference: ' TRX-SP-1 ' }), 201)
  assert.deepEqual(detail.settlementPayment, { paidAt: localDate(), method: 'BANK_TRANSFER', methodLabel: 'تحويل بنكي', reference: 'TRX-SP-1',
    paidByUserId: U.approver.id, paidByName: 'approver' })
  assert.equal(detail.settlementPaymentReady, true)
  const after = await paidColumns(f.kase.id)
  assert.deepEqual([after.paidAt, after.by, after.method, after.reference, after.status, after.net], [localDate(), U.approver.id, 'BANK_TRANSFER', 'TRX-SP-1', 'SETTLED', before.net])
  const again = await request(U.admin, 'POST', url, { date: localDate(), method: 'CASH' })
  assert.equal(again.status, 409, JSON.stringify(again.body))
  assert.equal(again.body.code, 'SETTLEMENT_ALREADY_PAID')
  assert.deepEqual(await paidColumns(f.kase.id), after)
  // اللي مابيشوفش المبالغ (موارد بشرية من غير صلاحية التصفية) مابياخدش بيانات الصرف
  const hrView = ok(await request(U.hrOnly, 'GET', `/offboarding/${f.kase.id}`), 200)
  assert.equal('settlementPayment' in hrView, false)
  assert.equal(hrView.canViewSettlement, false)
})

test('SP-03: الملف المقفول بعد الاعتماد (آخر يوم عمل عدّى) بيتسجل صرفه نقدي من غير مرجع', async () => {
  const f = await settledCase('2026-07-10')
  ok(await request(U.approver, 'POST', `/offboarding/${f.kase.id}/approve-settlement`), 201)
  assert.equal((await paidColumns(f.kase.id)).status, 'CLOSED')
  const detail = ok(await request(U.approver, 'POST', `/offboarding/${f.kase.id}/settlement-payment`, { date: localDate(), method: 'CASH' }), 201)
  assert.deepEqual([detail.settlementPayment.method, detail.settlementPayment.methodLabel, detail.settlementPayment.reference], ['CASH', 'نقدي', null])
})
