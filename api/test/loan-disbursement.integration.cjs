'use strict'
// B1.8 (السلف) على قاعدة SQL مؤقتة معزولة (synchronize)، عبر HTTP بتوكنات موقّعة محليًا ومن غير كلمات مرور:
//  LD-1) الإعدادين مبذورين مقفولين ومسموح بيهم في الإعدادات، والصلاحية الجديدة loans.disburse في الكتالوج وموديول السلف.
//  LD-2) أول قسط (D10): المقفول = أول الشهر الميلادي اللي بعد التقديم (زي النهارده)؛ المفتوح = فترة المسير اللي بعد فترة التقديم،
//        وعند التنفيذ الشهر المختوم بيتزق لفترة بعد الاعتماد لو الاعتماد اتأخر؛ واختيار الموارد البشرية والاستثنائية زي ما هم. وطلب حقيقي من أوله لآخره.
//  LD-3) تسجيل الصرف: الصلاحية والنطاق، التاريخ في المستقبل والطريقة والمرجع، مرة واحدة بس، ومين وإمتى، والحالة «تم الصرف».
//  LD-4) «لازم تتصرف الأول»: مقفول = السلفة الجديدة بتتخصم زي النهارده؛ مفتوح = السلفة الجديدة بتتعلّم، وأقساطها مابتنزلش المسير
//        (بتفضل مستحقة)، وبعد تسجيل الصرف بتنزل أول مسير؛ والسلفة القديمة بتتخصم عادي.
// Run (من api/): node --test test/loan-disbursement.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const { writeParityReasonsBeforeApproval } = require('./fixtures/payroll-parity-reasons.cjs')

const database = `hr_loan_disbursement_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_loan_disbursement_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-loan-disbursement-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const KEYS = { first: 'loan.first_installment_after_approval_period', gate: 'loans.require_disbursement_before_deduction' }
const localDate = (value = new Date()) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
const tomorrow = () => { const value = new Date(); value.setDate(value.getDate() + 1); return localDate(value) }
let app, master, ds, base, created = false, sequence = 0
const B = {}, U = {}

function assertDisposable() { assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system'); if (ds) assert.equal(ds.options.database, database) }
const repo = name => { assertDisposable(); return ds.getRepository(name) }
const raw = (text, values = []) => { assertDisposable(); return ds.query(text, values) }
function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function request(user, method, endpoint, body) {
  await writeParityReasonsBeforeApproval(request, user, method, endpoint)
  const response = await fetch(base + endpoint, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(user)}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
function expectStatus(response, status) { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const setting = (key, value) => repo('RequestsConfig').save({ key, value })
async function withSettings(values, action) {
  const previous = []
  for (const [key, value] of Object.entries(values)) { previous.push(await repo('RequestsConfig').findOneBy({ key })); await setting(key, value) }
  try { return await action() } finally { for (const row of previous) await repo('RequestsConfig').save(row) }
}
async function employee(branch = B.a, extra = {}) {
  const n = ++sequence
  return repo('Employee').save({ employeeCode: `LD${String(n).padStart(3, '0')}`, fullName: `موظف السلف ${n}`, branchId: branch.id, joinDate: '2020-01-01',
    basicSalary: 9000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0, status: 'active', isActive: true,
    payMethod: 'cash', annualLeaveEntitled: false, ...extra })
}
const userFor = (emp, suffix, permissions = [], role = 'employee', branch = B.a) => repo('User').save({ email: `ld-${suffix}@loan-disbursement.invalid`, displayName: suffix,
  passwordHash: 'isolated-test-token-only', role, branchId: branch?.id ?? null, employeeId: emp?.id ?? null, permissions: JSON.stringify(permissions) })
async function insertLoan(employeeId, amount, firstPeriod, requiresDisbursement = null) {
  const [row] = await raw(`INSERT loans(employeeId,amount,status,firstInstallmentPeriod,installmentMonths,requiresDisbursement) OUTPUT INSERTED.id
    VALUES(@0,CAST(@1 AS decimal(18,2)),N'APPROVED',@2,1,@3)`, [employeeId, amount, firstPeriod, requiresDisbursement])
  await raw(`INSERT loan_installments(loanId,dueDate,amount,paid,paidAmount,financialStatus,financialRevision,originalDueDate)
    VALUES(@0,@1,CAST(@2 AS decimal(18,2)),0,CAST('0.00' AS decimal(18,2)),N'DUE',1,@1)`, [row.id, `${firstPeriod}-01`, amount])
  return row.id
}
const loanRow = async id => (await raw(`SELECT [id],[status],CONVERT(varchar(10),[disbursedAt],23) AS [disbursedAt],[requiresDisbursement],[disbursedByUserId],
  [disbursementMethod],[disbursementReference],[firstInstallmentPeriod] FROM [loans] WHERE [id]=@0`, [id]))[0]
const installmentsOf = loanId => raw(`SELECT [id],CONVERT(varchar(10),[dueDate],23) AS [dueDate],[financialStatus],CONVERT(varchar(40),[paidAmount]) AS [paidAmount]
  FROM [loan_installments] WHERE [loanId]=@0 ORDER BY [id]`, [loanId])
// مسير فترة P لموظفين (دورة من يوم 1 = الشهر الميلادي)، حضور كامل
async function calculate(period, people) {
  const last = new Date(Date.UTC(Number(period.slice(0, 4)), Number(period.slice(5, 7)), 0)).getUTCDate()
  for (const emp of people) {
    if (await repo('AttendanceDay').count({ where: { employeeId: emp.id, date: `${period}-01` } })) continue
    await repo('AttendanceDay').save(Array.from({ length: last }, (_, index) => ({ employeeId: emp.id, branchId: emp.branchId, date: `${period}-${String(index + 1).padStart(2, '0')}`,
      status: 'present', checkIn: '08:00', checkOut: '16:00', shiftName: 'وردية السلف', shiftStart: '08:00', shiftEnd: '16:00', scheduleSource: 'override', workMinutes: 480,
      lateMinutes: 0, deductibleMinutes: 0, earlyLeaveMinutes: 0 })), { chunk: 100 })
  }
  return expectStatus(await request(U.admin, 'POST', '/payroll/runs/calculate-defined', { period, scopeType: 'CUSTOM', employeeIds: people.map(emp => emp.id),
    name: `مسير السلف ${crypto.randomUUID().slice(0, 8)}` }), 201)
}
const itemOf = (run, emp) => run.items.find(row => row.employeeId === emp.id)
const planOf = item => JSON.parse(item.breakdown).installmentPlan

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME,
    password: env.DB_PASSWORD, database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource); assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  await app.get(require('../src/settings/config-defaults.service').ConfigDefaultsService).onApplicationBootstrap()
  B.a = await repo('Branch').save({ code: 'LDA', name: 'فرع السلف أ' })
  B.b = await repo('Branch').save({ code: 'LDB', name: 'فرع السلف ب' })
  U.admin = await userFor(null, 'admin', ['*'], 'super_admin', null)
  U.boss = await userFor(null, 'boss', ['*'], 'super_admin', null)
  U.hr = await userFor(await employee(), 'hr', ['requests.view_all', 'approve.hr', 'payroll.view'], 'hr_manager')
  U.finance = await userFor(await employee(), 'finance', ['loans.disburse', 'payroll.view'])
  U.financeB = await userFor(await employee(B.b), 'finance-b', ['loans.disburse', 'payroll.view'], 'employee', B.b)
  U.viewer = await userFor(await employee(), 'viewer', ['payroll.view'])
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '1' }, { key: 'payroll.monthly_days', value: '30' }, { key: 'payroll.daily_hours', value: '8' },
    { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' }, { key: 'payroll.exempt_overtime_eligible', value: 'false' },
    { key: 'loan.insufficient_net_behavior', value: 'PARTIAL_THEN_CARRY' },
  ])
  const chain = await repo('ApprovalChain').save({ code: 'LD_LOAN', nameAr: 'سلسلة السلف: الموارد البشرية', isActive: true, autoApprove: false })
  await repo('ApprovalStep').save({ chainId: chain.id, stepOrder: 1, approverRole: 'hr' })
  await repo('RequestType').save({ code: 'LOAN', nameAr: 'سلفة', category: 'financial', destinationHandler: 'loans_installments', requiredFields: '["amount","months"]',
    approvalChainId: chain.id, isActive: true })
  expectStatus(await request(U.admin, 'POST', '/loans/cap-policies', { name: 'سقف السلف', scopeType: 'COMPANY', flatCapAmount: '50000.00', maxOutstandingBalance: '100000.00',
    effectiveFrom: '2020-01-01' }), 201)
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assertDisposable()
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try { fs.rmSync(uploads, { recursive: true, force: true }) } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'loan disbursement fixture cleanup failed')
})

test('LD-1: الإعدادين مقفولين ومسموح بيهم (true/false بس)، وloans.disburse في الكتالوج وموديول السلف', async () => {
  for (const key of Object.values(KEYS)) {
    assert.equal((await repo('RequestsConfig').findOneBy({ key }))?.value, 'false', key)
    expectStatus(await request(U.admin, 'PATCH', '/settings/config', { key, value: 'maybe' }), 400)
  }
  const { PERMISSIONS, PERMISSION_DESCRIPTIONS, PERMISSION_MODULES } = require('../src/auth/permissions')
  assert.ok(PERMISSIONS['loans.disburse'] && PERMISSION_DESCRIPTIONS['loans.disburse'])
  assert.ok(PERMISSION_MODULES.find(row => row.key === 'loans').permissions.includes('loans.disburse'))
  assert.ok(require('../src/modules-registry/registry').MODULES.loans.permissions.includes('loans.disburse'))
})

test('LD-2: أول قسط (D10) — المقفول زي النهارده، والمفتوح فترة المسير اللي بعد فترة التقديم وبيتزق لو الاعتماد اتأخر؛ واختيار الموارد البشرية والاستثنائية زي ما هم', async () => {
  const { loanDefaultFirstInstallmentPeriod, loanExecutionFirstInstallmentPeriod } = require('../src/loans/loan-request-caps')
  await withSettings({ 'payroll.cycle_start_day': '23' }, async () => {
    // مقفول: الشهر الميلادي التالي (تقديم 25 أكتوبر = نوفمبر، في نفس فترة مسيره 23 أكتوبر ← 22 نوفمبر)
    assert.equal(await loanDefaultFirstInstallmentPeriod(ds.manager, '2026-10-25'), '2026-11')
    assert.equal(await loanDefaultFirstInstallmentPeriod(ds.manager, '2026-10-10'), '2026-11')
    assert.equal(await loanExecutionFirstInstallmentPeriod(ds.manager, {}, '2026-11', '2026-10-25'), '2026-11')
    await withSettings({ [KEYS.first]: 'true' }, async () => {
      assert.equal(await loanDefaultFirstInstallmentPeriod(ds.manager, '2026-10-25'), '2026-12', 'فترة التقديم نوفمبر ← أول قسط ديسمبر')
      assert.equal(await loanDefaultFirstInstallmentPeriod(ds.manager, '2026-10-10'), '2026-11', 'قبل يوم 23 زي الأول')
      // الاعتماد اتأخر لفترة الشهر المختوم أو بعدها: يتزق؛ قبلها: زي ما هو
      assert.equal(await loanExecutionFirstInstallmentPeriod(ds.manager, {}, '2026-11', '2026-10-25'), '2026-12')
      assert.equal(await loanExecutionFirstInstallmentPeriod(ds.manager, {}, '2026-11', '2026-12-01'), '2027-01')
      assert.equal(await loanExecutionFirstInstallmentPeriod(ds.manager, {}, '2026-12', '2026-10-25'), '2026-12')
      // اختيار الموارد البشرية والاستثنائية زي ما هم
      assert.equal(await loanExecutionFirstInstallmentPeriod(ds.manager, { firstInstallmentPeriodBy: U.hr.id }, '2026-11', '2026-10-25'), '2026-11')
      assert.equal(await loanExecutionFirstInstallmentPeriod(ds.manager, { exceptional: true }, '2026-11', '2026-10-25'), '2026-11')
    })
  })
  // من أوله لآخره بدورة تبدأ يوم 1 (فترة المسير = الشهر الميلادي): الإعداد مفتوح وقت الاعتماد بيزق الشهر المختوم لو وقع في فترة الاعتماد
  const today = localDate(), current = today.slice(0, 7)
  const { addMonths } = require('../src/loans/loan-caps')
  const owner = await employee(), ownerUser = await userFor(owner, `owner-${owner.id}`)
  const filed = expectStatus(await request(ownerUser, 'POST', '/requests', { typeCode: 'LOAN', submit: true, payload: { amount: '600.00' } }), 201)
  const stamped = JSON.parse((await raw('SELECT [payload] FROM [requests] WHERE [id]=@0', [filed.id]))[0].payload).firstInstallmentPeriod
  assert.equal(stamped, addMonths(current, 1), 'المقفول وقت التقديم: الشهر الميلادي التالي')
  // الختم القديم في فترة الاعتماد نفسها (سجل قديم): اتعمل لما الإعداد مقفول، والإعداد اتفتح قبل الاعتماد
  await raw("UPDATE [requests] SET [payload]=JSON_MODIFY([payload], '$.firstInstallmentPeriod', @1) WHERE [id]=@0", [filed.id, current])
  await withSettings({ [KEYS.first]: 'true' }, async () => expectStatus(await request(U.hr, 'POST', `/requests/${filed.id}/act`, { action: 'APPROVE', comment: 'اعتماد السلفة' }), 201))
  const [loan] = await raw('SELECT [id],[firstInstallmentPeriod] FROM [loans] WHERE [requestId]=@0', [filed.id])
  assert.equal(loan.firstInstallmentPeriod, addMonths(current, 1), 'اتزق لفترة بعد فترة الاعتماد')
  assert.deepEqual((await installmentsOf(loan.id)).map(row => row.dueDate), [`${addMonths(current, 1)}-01`])
})

test('LD-3: تسجيل صرف السلفة — الصلاحية والنطاق والمدخلات، مرة واحدة بس، ومين وإمتى والحالة', async () => {
  const emp = await employee()
  const loanId = await insertLoan(emp.id, '900.00', '2026-03')
  const body = { date: localDate(), method: 'BANK_TRANSFER', reference: 'TRX-LD-1' }
  expectStatus(await request(U.viewer, 'POST', `/loans/${loanId}/disbursement`, body), 403)
  expectStatus(await request(U.financeB, 'POST', `/loans/${loanId}/disbursement`, body), 404)
  for (const [bad, code] of [[{ ...body, date: tomorrow() }, 'LOAN_DISBURSEMENT_DATE'], [{ ...body, date: '2026-02-30' }, 'LOAN_DISBURSEMENT_DATE'],
    [{ ...body, method: 'GOLD' }, 'LOAN_DISBURSEMENT_METHOD'], [{ ...body, reference: '' }, 'LOAN_DISBURSEMENT_REFERENCE'], [{ ...body, method: 'CHEQUE', reference: '  ' }, 'LOAN_DISBURSEMENT_REFERENCE'],
    [{ ...body, reference: 'x'.repeat(101) }, 'LOAN_DISBURSEMENT_REFERENCE']]) {
    const refused = await request(U.finance, 'POST', `/loans/${loanId}/disbursement`, bad)
    assert.equal(refused.status, 400, JSON.stringify(refused.body)); assert.equal(refused.body.code, code)
  }
  assert.equal((await loanRow(loanId)).disbursedAt, null, 'الرفض من غير كتابة')
  const ledger = expectStatus(await request(U.finance, 'POST', `/loans/${loanId}/disbursement`, body), 201)
  assert.deepEqual([ledger.id, ledger.status, ledger.disbursementMethod, ledger.disbursementReference, ledger.disbursedByUserId],
    [loanId, 'DISBURSED', 'BANK_TRANSFER', 'TRX-LD-1', U.finance.id])
  const row = await loanRow(loanId)
  assert.deepEqual([row.status, row.disbursedAt, row.disbursedByUserId, row.disbursementMethod, row.disbursementReference], ['DISBURSED', localDate(), U.finance.id, 'BANK_TRANSFER', 'TRX-LD-1'])
  const again = await request(U.finance, 'POST', `/loans/${loanId}/disbursement`, { ...body, reference: 'TRX-LD-2' })
  assert.equal(again.status, 409, JSON.stringify(again.body)); assert.equal(again.body.code, 'LOAN_ALREADY_DISBURSED')
  assert.equal((await loanRow(loanId)).disbursementReference, 'TRX-LD-1')
  // النقدي من غير مرجع، وسلفة مسددة بتفضل مسددة
  const settled = await insertLoan(emp.id, '100.00', '2026-01')
  await raw("UPDATE [loans] SET [status]=N'SETTLED' WHERE [id]=@0", [settled])
  expectStatus(await request(U.finance, 'POST', `/loans/${settled}/disbursement`, { date: '2026-01-01', method: 'CASH' }), 201)
  assert.deepEqual([(await loanRow(settled)).status, (await loanRow(settled)).disbursementReference], ['SETTLED', null])
  // دفتر الموظف نفسه: الطريقة من غير المرجع ومين
  const own = await userFor(emp, `own-${emp.id}`)
  const mine = expectStatus(await request(own, 'GET', `/loans/${loanId}/ledger`), 200)
  assert.deepEqual([mine.disbursementMethod, 'disbursementReference' in mine, 'disbursedByUserId' in mine], ['BANK_TRANSFER', false, false])
})

test('LD-4: «لازم تتصرف الأول» — مقفول زي النهارده؛ مفتوح السلفة الجديدة أقساطها بتفضل مستحقة لحد تسجيل الصرف وبعده بتنزل؛ والقديمة بتتخصم عادي', async () => {
  const today = localDate(), current = today.slice(0, 7)
  const { addMonths } = require('../src/loans/loan-caps')
  const next = addMonths(current, 1)
  // مقفول: طلب حقيقي = السلفة مش متعلّمة
  const plainOwner = await employee(), plainUser = await userFor(plainOwner, `plain-${plainOwner.id}`)
  const plain = expectStatus(await request(plainUser, 'POST', '/requests', { typeCode: 'LOAN', submit: true, payload: { amount: '700.00' } }), 201)
  expectStatus(await request(U.hr, 'POST', `/requests/${plain.id}/act`, { action: 'APPROVE', comment: 'اعتماد' }), 201)
  const [plainLoan] = await raw('SELECT [id] FROM [loans] WHERE [requestId]=@0', [plain.id])
  assert.equal((await loanRow(plainLoan.id)).requiresDisbursement, null)
  // مفتوح: طلب حقيقي = السلفة متعلّمة
  const gatedOwner = await employee(), gatedUser = await userFor(gatedOwner, `gated-${gatedOwner.id}`)
  let gatedLoanId
  await withSettings({ [KEYS.gate]: 'true' }, async () => {
    const filed = expectStatus(await request(gatedUser, 'POST', '/requests', { typeCode: 'LOAN', submit: true, payload: { amount: '800.00' } }), 201)
    expectStatus(await request(U.hr, 'POST', `/requests/${filed.id}/act`, { action: 'APPROVE', comment: 'اعتماد' }), 201)
    gatedLoanId = (await raw('SELECT [id] FROM [loans] WHERE [requestId]=@0', [filed.id]))[0].id
    assert.equal((await loanRow(gatedLoanId)).requiresDisbursement, true)
  })
  // سلفة قديمة (من غير وسم) لنفس الموظف بتتخصم عادي حتى والإعداد مفتوح
  const legacyLoanId = await insertLoan(gatedOwner.id, '300.00', next)
  // مسير الشهر الجاي: السلفة المتعلّمة مابتتخصمش وبتفضل مستحقة، والقديمة والعادية بيتخصموا
  let run = await calculate(next, [plainOwner, gatedOwner])
  assert.equal(Number(itemOf(run, plainOwner).loanInstallments), 700)
  assert.equal(Number(itemOf(run, gatedOwner).loanInstallments), 300)
  const [gatedInstallment] = await installmentsOf(gatedLoanId)
  assert.deepEqual(planOf(itemOf(run, gatedOwner)).undisbursedDeferredIds, [gatedInstallment.id])
  assert.equal(planOf(itemOf(run, plainOwner)).undisbursedDeferredIds, undefined, 'من غيرها الخطة من غير الحقل')
  // الإعداد اتقفل بعد كده: الوسم بيفضل على السلفة (اتعملت والإعداد مفتوح)
  run = expectStatus(await request(U.admin, 'POST', `/payroll/runs/${run.id}/recalculate`, { reason: 'إعادة حساب بعد قفل الإعداد' }), 201)
  assert.equal(Number(itemOf(run, gatedOwner).loanInstallments), 300)
  // تسجيل الصرف ← إعادة الحساب بتنزل القسط
  expectStatus(await request(U.finance, 'POST', `/loans/${gatedLoanId}/disbursement`, { date: today, method: 'CASH' }), 201)
  run = expectStatus(await request(U.admin, 'POST', `/payroll/runs/${run.id}/recalculate`, { reason: 'إعادة حساب بعد تسجيل صرف السلفة' }), 201)
  assert.equal(Number(itemOf(run, gatedOwner).loanInstallments), 1100)
  assert.equal(planOf(itemOf(run, gatedOwner)).undisbursedDeferredIds, undefined)
  assert.deepEqual((await installmentsOf(legacyLoanId)).map(row => row.financialStatus), ['DUE'], 'الحساب مابيكتبش في الأقساط')
})
