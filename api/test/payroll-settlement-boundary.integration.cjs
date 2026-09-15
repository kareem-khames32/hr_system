'use strict'
// SPEC①/ح٢-ب: SQL وHTTP حقيقيان في قاعدة عشوائية؛ لا تعديل لبيانات المصدر أو المراجعة.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_payroll_settlement_test_' + crypto.randomBytes(8).toString('hex')
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-settlement-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let master, app, ds, base, branch, otherBranch, admin, hr, outsider, created = false, sequence = 0
const repo = name => ds.getRepository(name)
const token = user => jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null,
  employeeId: user.employeeId ?? null, tokenVersion: user.tokenVersion ?? 0, permissions: JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: 'Bearer ' + token(user) } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const raw = await response.text(); return { status: response.status, body: raw ? JSON.parse(raw) : null }
}
async function fixture() {
  const employee = await repo('Employee').save({ employeeCode: 'SB' + ++sequence, fullName: 'موظف اختبار حدود التصفية', branchId: branch.id,
    joinDate: '2020-01-01', status: 'active', isActive: true, basicSalary: 2400, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, payMethod: 'cash' })
  const kase = await repo('OffboardingCase').save({ employeeId: employee.id, lastWorkingDay: '2099-07-10', status: 'IN_SETTLEMENT', terminationReason: 'termination' })
  await repo('ClearanceItem').save(['manager', 'custody', 'it', 'finance', 'hr'].map(party => ({ caseId: kase.id, party, label: party, status: 'DONE' })))
  const overtime = await repo('OvertimeEntry').save([
    { employeeId: employee.id, date: '2026-07-01', source: 'PRE_REQUESTED', payableHours: 2, rate: 1, status: 'APPROVED' },
    { employeeId: employee.id, date: '2026-06-01', source: 'PRE_REQUESTED', payableHours: 3, rate: 1, status: 'APPROVED' },
  ])
  const loan = await repo('Loan').save({ employeeId: employee.id, amount: 3000, status: 'DISBURSED' })
  const installments = await repo('LoanInstallment').save([
    { loanId: loan.id, dueDate: '2026-07-01', amount: 1000, paid: false },
    { loanId: loan.id, dueDate: '2026-08-01', amount: 2000, paid: false },
  ])
  return { employee, kase, overtime, loan, installments }
}
// الخطوة 16 (B3): اسم المسير فريد داخل الشهر لغير الملغى (فهرس UX_payroll_run_period_name)؛ كل مسير اصطناعي يأخذ رقمًا تسلسليًا.
let syntheticClaimNumber = 0
async function claim(f, status = 'CALCULATED', overrides = {}) {
  const run = await repo('PayrollRun').save({ name: `Synthetic existing claim ${++syntheticClaimNumber}`, scopeType: 'CUSTOM', employeeIds: JSON.stringify([f.employee.id]), period: '2026-07', startDate: '2026-06-23', endDate: '2026-07-22', status })
  const item = await repo('PayrollItem').save({ runId: run.id, employeeId: f.employee.id, basicSalary: 2400, overtimeHours: 2, overtimeAmount: 20,
    loanInstallments: 1000, netPay: 1420, payMethod: 'cash', breakdown: JSON.stringify({ overtimeEntryIds: [f.overtime[0].id], installmentIds: [f.installments[0].id] }), ...overrides })
  return { run, item }
}
async function recalc(f, expectedStatus = 201) {
  const result = await request(admin, 'POST', `/offboarding/${f.kase.id}/recalc-lines`)
  assert.equal(result.status, expectedStatus, JSON.stringify(result.body)); return result
}
const financialLines = rows => rows.filter(row => row.label.startsWith('أوفرتايم معتمد غير مصروف') || row.label === 'رصيد سلف متبقٍ')
before(async () => {
  assert.match(database, /^hr_payroll_settlement_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true } }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1'); ds = app.get(require('../node_modules/typeorm').DataSource)
  assert.equal(ds.options.database, database)
  const scheduler = app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry)
  for (const job of scheduler.getCronJobs().values()) job.stop()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  branch = await repo('Branch').save({ code: 'SETBOUND', name: 'Settlement boundary test' })
  otherBranch = await repo('Branch').save({ code: 'SETOTHER', name: 'Other synthetic branch' })
  admin = await repo('User').save({ email: 'admin@settlement-boundary.invalid', displayName: 'Fixture admin', passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  hr = await repo('User').save({ email: 'hr@settlement-boundary.invalid', displayName: 'Fixture HR', passwordHash: 'test-only', role: 'hr', branchId: branch.id, permissions: '["offboarding.manage"]' })
  outsider = await repo('User').save({ email: 'outside@settlement-boundary.invalid', displayName: 'Fixture outside', passwordHash: 'test-only', role: 'hr', branchId: otherBranch.id, permissions: '["settlement.edit","settlement.approve"]' })
  await repo('RequestsConfig').save([{ key: 'payroll.monthly_days', value: '30' }, { key: 'payroll.daily_hours', value: '8' }, { key: 'payroll.cycle_start_day', value: '23' },
    // حدود التصفية على راتب الملف؛ اختيار راتب الشهر من السجل مغطى في payroll-run-salary-period.integration.cjs.
    { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' }])
}, { timeout: 60000 })
after(async t => {
  if (app) await app.close()
  try {
    if (created) {
      assert.match(database, /^hr_payroll_settlement_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('database', database).query('SELECT DB_ID(@database) AS id')).recordset[0].id, null)
      t.diagnostic('Temporary settlement database removed and absence verified.')
    }
  } finally {
    if (master) await master.close()
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir())); assert.match(path.basename(uploads), /^hr-payroll-settlement-files-/)
    fs.rmSync(uploads, { recursive: true, force: true }); assert.equal(fs.existsSync(uploads), false)
  }
})

test('SPEC①/ح٢-ب: each of the four active payroll states excludes exact overtime/installment claims', async () => {
  for (const status of ['CALCULATED', 'IN_REVIEW', 'APPROVED', 'PAID']) {
    const f = await fixture(); await claim(f, status)
    const preview = await request(admin, 'GET', `/offboarding/preview?employeeId=${f.employee.id}&reason=termination&lastWorkingDay=2099-07-10`)
    assert.equal(preview.status, 200, JSON.stringify(preview.body))
    assert.deepEqual(financialLines(preview.body.lines).map(row => Number(row.amount)), [30, 2000])
    assert.equal(await repo('SettlementLine').count({ where: { caseId: f.kase.id } }), 0)
    await recalc(f)
    const stored = await repo('OffboardingCase').findOneByOrFail({ id: f.kase.id })
    assert.deepEqual(stored.settlementFinancialSnapshot.overtime.map(row => row.id), [f.overtime[1].id])
    assert.deepEqual(stored.settlementFinancialSnapshot.installments.map(row => row.id), [f.installments[1].id])
    assert.deepEqual(financialLines(await repo('SettlementLine').findBy({ caseId: f.kase.id })).map(row => Number(row.amount)), [30, 2000])
  }
})
test('SPEC①/ح٢-ب: DRAFT/CANCELLED payroll items do not reserve financial entries', async () => {
  for (const status of ['DRAFT', 'CANCELLED']) {
    const f = await fixture(); await claim(f, status); await recalc(f)
    const saved = await repo('OffboardingCase').findOneByOrFail({ id: f.kase.id })
    assert.equal(saved.settlementFinancialSnapshot.overtimeAmount, 50)
    assert.equal(saved.settlementFinancialSnapshot.installmentAmount, 3000)
  }
})
test('SPEC①/ح٢-ب: malformed historical payroll references reject regeneration and preserve every reviewed line', async () => {
  const f = await fixture(); await recalc(f)
  await request(admin, 'POST', `/offboarding/${f.kase.id}/lines`, { label: 'تسوية مراجعة يدوية', type: 'CREDIT', amount: 123 })
  const before = await repo('SettlementLine').find({ where: { caseId: f.kase.id }, order: { id: 'ASC' } })
  const existing = await claim(f, 'PAID', { breakdown: '{malformed' })
  await recalc(f, 409)
  assert.deepEqual(await repo('SettlementLine').find({ where: { caseId: f.kase.id }, order: { id: 'ASC' } }), before)
  await repo('PayrollItem').update(existing.item.id, { breakdown: JSON.stringify({ overtimeEntryIds: [], installmentIds: [] }) })
  await recalc(f, 409)
  assert.deepEqual(await repo('SettlementLine').find({ where: { caseId: f.kase.id }, order: { id: 'ASC' } }), before)
})
test('SPEC①/ح٢-ب: a payroll claim created after generation blocks approval without changing reviewed money', async () => {
  const f = await fixture(); await recalc(f)
  const before = await repo('SettlementLine').find({ where: { caseId: f.kase.id }, order: { id: 'ASC' } })
  await claim(f)
  const blocked = await request(admin, 'POST', `/offboarding/${f.kase.id}/approve-settlement`)
  assert.equal(blocked.status, 409, JSON.stringify(blocked.body))
  assert.equal((await repo('OffboardingCase').findOneByOrFail({ id: f.kase.id })).status, 'IN_SETTLEMENT')
  assert.deepEqual(await repo('SettlementLine').find({ where: { caseId: f.kase.id }, order: { id: 'ASC' } }), before)
  await recalc(f)
  assert.equal((await request(admin, 'POST', `/offboarding/${f.kase.id}/approve-settlement`)).status, 201)
})
test('SPEC①/ح٢-ب: concurrent approvals settle once, preserve exact references and do not invent payment state', async () => {
  const f = await fixture(); await recalc(f)
  const results = await Promise.all([1, 2].map(() => request(admin, 'POST', `/offboarding/${f.kase.id}/approve-settlement`)))
  assert.deepEqual(results.map(result => result.status).sort(), [201, 400])
  const saved = await repo('OffboardingCase').findOneByOrFail({ id: f.kase.id })
  assert.equal(saved.status, 'SETTLED'); assert.equal(saved.settlementFinancialSnapshot.overtime.length, 2)
  assert.ok(saved.settlementFinancialSnapshot.overtimeLineId); assert.ok(saved.settlementFinancialSnapshot.installmentLineId)
  for (const row of await repo('OvertimeEntry').findBy({ employeeId: f.employee.id })) { assert.equal(row.status, 'APPROVED'); assert.equal(row.payrollRunId, null) }
  assert.equal(await repo('LoanInstallment').count({ where: { loanId: f.loan.id, paid: false } }), 2)
  assert.equal((await request(admin, 'POST', `/offboarding/${f.kase.id}/withdraw`)).status, 409)
  assert.equal((await repo('OffboardingCase').findOneByOrFail({ id: f.kase.id })).status, 'SETTLED')
})
test('SPEC①/ح٢-ب: changed or deleted linked financial lines require regeneration; manual adjustments remain independent', async () => {
  const f = await fixture(); await recalc(f)
  const saved = await repo('OffboardingCase').findOneByOrFail({ id: f.kase.id })
  assert.equal((await request(admin, 'PATCH', `/offboarding/lines/${saved.settlementFinancialSnapshot.overtimeLineId}`, { amount: 45 })).status, 200)
  assert.equal((await request(admin, 'POST', `/offboarding/${f.kase.id}/approve-settlement`)).status, 409)
  await recalc(f)
  assert.equal((await request(admin, 'POST', `/offboarding/${f.kase.id}/lines`, { label: 'تسوية متفق عليها', type: 'DEBIT', amount: 5 })).status, 201)
  assert.equal((await request(admin, 'POST', `/offboarding/${f.kase.id}/approve-settlement`)).status, 201)
})
test('SPEC①/ح٢-ب: legacy financial settlement without snapshot requires explicit regeneration and keeps permissions', async () => {
  const f = await fixture()
  await repo('SettlementLine').save({ caseId: f.kase.id, label: 'رصيد سلف متبقٍ', type: 'DEBIT', amount: 3000, isAuto: true })
  assert.equal((await request(admin, 'POST', `/offboarding/${f.kase.id}/approve-settlement`)).status, 409)
  assert.equal((await request(null, 'POST', `/offboarding/${f.kase.id}/recalc-lines`)).status, 401)
  assert.equal((await request(hr, 'POST', `/offboarding/${f.kase.id}/recalc-lines`)).status, 403)
  assert.equal((await request(outsider, 'POST', `/offboarding/${f.kase.id}/approve-settlement`)).status, 404)
  await recalc(f)
  const detail = await request(hr, 'GET', `/offboarding/${f.kase.id}`)
  assert.equal(detail.status, 200); assert.equal(JSON.stringify(detail.body).includes('settlementFinancialSnapshot'), false)
  const list = await request(hr, 'GET', '/offboarding')
  assert.equal(list.status, 200); assert.equal(JSON.stringify(list.body).includes('settlementFinancialSnapshot'), false)
})

// الخطوة 16 (B3): اسم المسير فريد داخل الشهر لغير الملغى؛ كل مسير جديد يأخذ رقمًا تسلسليًا.
let settlementRunNumber = 0
const calculate = f => request(admin, 'POST', '/payroll/runs/calculate-defined', {
  period: '2026-07', scopeType: 'CUSTOM', employeeIds: [f.employee.id], name: `اختبار حدود التصفية والمسير ${++settlementRunNumber}`,
})
test('SPEC①/ح٢-ب: payroll after settlement excludes frozen claims and legacy ambiguity is refused', async () => {
  const f = await fixture(); await recalc(f)
  assert.equal((await request(admin, 'POST', `/offboarding/${f.kase.id}/approve-settlement`)).status, 201)
  const payroll = await calculate(f)
  assert.equal(payroll.status, 201, JSON.stringify(payroll.body))
  const item = payroll.body.items.find(row => row.employeeId === f.employee.id)
  assert.ok(item); assert.equal(Number(item.overtimeAmount), 0); assert.equal(Number(item.loanInstallments), 0)
  const breakdown = JSON.parse(item.breakdown)
  assert.deepEqual(breakdown.overtimeEntryIds, []); assert.deepEqual(breakdown.installmentIds, [])
  const legacy = await fixture()
  await repo('OffboardingCase').update(legacy.kase.id, { status: 'CLOSED' })
  await repo('SettlementLine').save({ caseId: legacy.kase.id, label: 'رصيد سلف متبقٍ', type: 'DEBIT', amount: 3000, isAuto: true })
  const rejected = await calculate(legacy)
  assert.equal(rejected.status, 409, JSON.stringify(rejected.body))
  assert.equal(await repo('PayrollItem').count({ where: { employeeId: legacy.employee.id } }), 0)
})
test('SPEC①/ح٢-ب: renaming a historical automatic settlement line cannot hide pending financial sources', async () => {
  const f = await fixture()
  await repo('OffboardingCase').update(f.kase.id, { status: 'CLOSED', settlementFinancialSnapshot: null })
  const original = await repo('SettlementLine').save({ caseId: f.kase.id, label: 'مستحقات ختامية بتسمية معدّلة', type: 'CREDIT', amount: 50, isAuto: true })
  const rejected = await calculate(f)
  assert.equal(rejected.status, 409, JSON.stringify(rejected.body))
  assert.match(JSON.stringify(rejected.body), /بلا مصادر مالية مثبتة/)
  assert.equal(await repo('PayrollItem').count({ where: { employeeId: f.employee.id } }), 0)
  assert.deepEqual({ ...await repo('SettlementLine').findOneByOrFail({ id: original.id }) }, original)
  assert.equal(await repo('OvertimeEntry').count({ where: { employeeId: f.employee.id, status: 'APPROVED' } }), 2)
  assert.equal(await repo('LoanInstallment').count({ where: { loanId: f.loan.id, paid: false } }), 2)
})
test('SPEC①/ح٢-ب: cancelling SETTLED legacy with a renamed automatic line cannot release untracked sources', async () => {
  const f = await fixture()
  await repo('OffboardingCase').update(f.kase.id, { status: 'SETTLED', settlementFinancialSnapshot: null })
  await repo('SettlementLine').save({ caseId: f.kase.id, label: 'عنوان قديم معدّل للمستحقات', type: 'CREDIT', amount: 50, isAuto: true })
  const rejected = await request(admin, 'POST', `/offboarding/${f.kase.id}/withdraw`)
  assert.equal(rejected.status, 409, JSON.stringify(rejected.body))
  const current = await repo('OffboardingCase').findOneByOrFail({ id: f.kase.id })
  assert.equal(current.status, 'SETTLED'); assert.equal(current.settlementFinancialSnapshot, null)
  assert.equal((await calculate(f)).status, 409)
  assert.equal(await repo('PayrollItem').count({ where: { employeeId: f.employee.id } }), 0)
})
test('SPEC①/ح٢-ب: all sources claimed by payroll cannot hide ambiguous automatic money behind an empty settlement snapshot', async () => {
  const f = await fixture()
  const original = await repo('SettlementLine').save({ caseId: f.kase.id, label: 'عنوان مراجعة قديم غير موثق', type: 'CREDIT', amount: 50, isAuto: true })
  await claim(f, 'CALCULATED', { overtimeHours: 5, overtimeAmount: 50, loanInstallments: 3000,
    breakdown: JSON.stringify({ overtimeEntryIds: f.overtime.map(row => row.id), installmentIds: f.installments.map(row => row.id) }) })
  const rejected = await request(admin, 'POST', `/offboarding/${f.kase.id}/approve-settlement`)
  assert.equal(rejected.status, 409, JSON.stringify(rejected.body))
  const current = await repo('OffboardingCase').findOneByOrFail({ id: f.kase.id })
  assert.equal(current.status, 'IN_SETTLEMENT'); assert.equal(current.settlementFinancialSnapshot, null)
  assert.deepEqual({ ...await repo('SettlementLine').findOneByOrFail({ id: original.id }) }, original)
  await recalc(f)
  assert.equal((await request(admin, 'POST', `/offboarding/${f.kase.id}/approve-settlement`)).status, 201)
})
test('SPEC①/ح٢-ب: historical automatic EOS with no pending financial sources still permits settlement approval', async () => {
  const f = await fixture()
  await repo('OvertimeEntry').update({ employeeId: f.employee.id }, { status: 'PAID' })
  await repo('LoanInstallment').update({ loanId: f.loan.id }, { paid: true })
  // HRC-07 (مختبر كاملًا في r1-daily-regressions): بند المكافأة الآلي التاريخي يُعرف ببادئة تسميته ويجب أن يطابق حساب السياسة الحالية؛
  // المختلف يُرفض، والمطابق لا يمنعه غياب مصادر مالية معلقة
  const historical = await repo('SettlementLine').save({ caseId: f.kase.id, label: 'مكافأة نهاية الخدمة (مراجعة سابقة)', type: 'CREDIT', amount: 1000, isAuto: true })
  const eos = require('../src/offboarding/eos'), service = app.get(require('../src/offboarding/offboarding.service').OffboardingService)
  const expected = eos.computeEos(2400, eos.serviceYears('2020-01-01', f.kase.lastWorkingDay), 'termination', await service.eosPolicy()).amount
  assert.ok(expected > 0); assert.notEqual(expected, 1000)
  const stale = await request(admin, 'POST', `/offboarding/${f.kase.id}/approve-settlement`)
  assert.equal(stale.status, 409, JSON.stringify(stale.body)); assert.match(stale.body.message, /مكافأة نهاية الخدمة/)
  await repo('SettlementLine').update(historical.id, { amount: expected })
  const approved = await request(admin, 'POST', `/offboarding/${f.kase.id}/approve-settlement`)
  assert.equal(approved.status, 201, JSON.stringify(approved.body))
  const current = await repo('OffboardingCase').findOneByOrFail({ id: f.kase.id })
  assert.equal(Number(current.settlementNet), expected)
  assert.deepEqual(current.settlementFinancialSnapshot.overtime, []); assert.deepEqual(current.settlementFinancialSnapshot.installments, [])
})
test('SPEC①/ح٢-ب: simultaneous payroll calculation and settlement approval cannot claim the same sources', async () => {
  const f = await fixture(); await recalc(f)
  const [approval, payroll] = await Promise.all([
    request(admin, 'POST', `/offboarding/${f.kase.id}/approve-settlement`), calculate(f),
  ])
  assert.equal(payroll.status, 201, JSON.stringify(payroll.body))
  assert.ok([201, 409].includes(approval.status), JSON.stringify(approval.body))
  const item = payroll.body.items.find(row => row.employeeId === f.employee.id), breakdown = JSON.parse(item.breakdown)
  const saved = await repo('OffboardingCase').findOneByOrFail({ id: f.kase.id })
  if (approval.status === 201) {
    assert.equal(saved.status, 'SETTLED')
    const reservedOt = new Set(saved.settlementFinancialSnapshot.overtime.map(row => row.id))
    const reservedInst = new Set(saved.settlementFinancialSnapshot.installments.map(row => row.id))
    assert.ok(breakdown.overtimeEntryIds.every(id => !reservedOt.has(id)))
    assert.ok(breakdown.installmentIds.every(id => !reservedInst.has(id)))
  } else {
    assert.equal(saved.status, 'IN_SETTLEMENT')
    assert.deepEqual(breakdown.overtimeEntryIds, [f.overtime[0].id])
    assert.deepEqual(breakdown.installmentIds, [f.installments[0].id])
  }
})
test('SPEC①/ح٢-ب: a later offboarding case cannot reclaim sources in an earlier settled snapshot', async () => {
  const f = await fixture(); await recalc(f)
  assert.equal((await request(admin, 'POST', `/offboarding/${f.kase.id}/approve-settlement`)).status, 201)
  await repo('OffboardingCase').update(f.kase.id, { status: 'CLOSED' })
  const subsequent = await repo('OffboardingCase').save({ employeeId: f.employee.id, lastWorkingDay: '2099-12-31', status: 'IN_SETTLEMENT', terminationReason: 'termination' })
  const next = { ...f, kase: subsequent }; await recalc(next)
  const snapshot = (await repo('OffboardingCase').findOneByOrFail({ id: subsequent.id })).settlementFinancialSnapshot
  assert.deepEqual(snapshot.overtime, []); assert.deepEqual(snapshot.installments, [])
  assert.equal(financialLines(await repo('SettlementLine').findBy({ caseId: subsequent.id })).length, 0)
})
