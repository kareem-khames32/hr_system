// خط bank-pay-codes (قرار المالك 16 سبتمبر) على قاعدة SQL مؤقتة معزولة (synchronize):
// 1) كود الموظف يولّده النظام EMP#### (أكبر موجود + 1) حتى مع إضافتين متزامنتين، والكود المرسل يتجاهل في الإضافة والتعديل.
// 2) البصمات تتربط برقم البصمة وحده — الكود الوظيفي مش مفتاح بصمة.
// 3) طريقة الصرف «نقدي + بنك»: مبلغ البنك والبنك/الآيبان إجباريين، والتقسيم على القسيمة وكشف البنوك بعزل الفروع.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_bank_pay_codes_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-bank-pay-codes-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, master, ds, base, admin, branchA, branchB, departmentA, created = false, n = 0
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function request(user, method, endpoint, body) {
  const response = await fetch(base + endpoint, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(user)}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
function expectStatus(response, status) {
  assert.equal(response.status, status, JSON.stringify(response.body))
  return response.body
}
const messageOf = response => [].concat(response.body?.message ?? []).join(' | ')
const complete = (extra = {}) => ({ employeeCode: `IGNORED${++n}`, fingerprintCode: `FP${n}`, fullName: 'خالد عبدالله العتيبي',
  phone: '+966501234567', nationalId: `10${String(n).padStart(8, '0')}`, birthDate: '1992-03-15', gender: 'male', nationality: 'سعودي',
  jobTitle: 'محاسب', departmentId: departmentA.id, branchId: branchA.id, joinDate: '2026-01-01', basicSalary: 7000, currency: 'SAR', payMethod: 'cash', ...extra })
const bank = { bankName: 'مصرف الراجحي', iban: 'SA0380000000608010167519' }
async function seeded(branch, overrides = {}) {
  const k = ++n
  const emp = await repo('Employee').save({ employeeCode: `SEED${k}`, fingerprintCode: `SFP${k}`, fullName: `موظف كشف ${k}`, branchId: branch.id,
    joinDate: '2020-01-01', basicSalary: 9000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, ...overrides })
  await repo('AttendanceExemption').save({ employeeId: emp.id, effectiveFrom: '2026-01-01', effectiveTo: '2027-12-31', reasonCode: 'field_role',
    reason: 'نافذة اختبار كشف البنوك', status: 'APPROVED', createdByUserId: admin.id, approvedByUserId: admin.id,
    approvedAt: new Date('2026-01-01T08:00:00Z'), terminatedFrom: null, overtimeEligibleOverride: null, unpaidLeaveDeductibleOverride: null, requiresCheckinForPresence: false })
  return emp
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, /^hr_bank_pay_codes_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME,
    password: env.DB_PASSWORD, database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assert.equal(ds.options.database, database)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  branchA = await repo('Branch').save({ code: 'BANK_A', name: 'فرع الكشف أ' })
  branchB = await repo('Branch').save({ code: 'BANK_B', name: 'فرع الكشف ب' })
  departmentA = await repo('Department').save({ name: 'قسم الكشف', branchId: branchA.id })
  admin = await repo('User').save({ email: 'admin@bank-sheet.invalid', displayName: 'admin', passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '1' }, { key: 'payroll.monthly_days', value: '30' }, { key: 'payroll.daily_hours', value: '8' },
    { key: 'payroll.exempt_overtime_eligible', value: 'false' }, { key: 'payroll.exempt_unpaid_leave_deductible', value: 'true' },
    { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' },
  ])
}, { timeout: 90000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_bank_pay_codes_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try { fs.rmSync(uploads, { recursive: true, force: true }) } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Bank pay codes fixture cleanup failed')
})

test('كود الموظف من النظام: أكبر EMP#### + 1 حتى مع إضافتين متزامنتين، والكود المرسل يتجاهل في الإضافة والتعديل', async () => {
  await seeded(branchA, { employeeCode: 'EMP0007' })
  await seeded(branchA, { employeeCode: 'WAVE-02' })
  await seeded(branchA, { employeeCode: 'EMP12X' })
  const [one, two] = await Promise.all([request(admin, 'POST', '/employees', complete()), request(admin, 'POST', '/employees', complete())])
  const codes = [expectStatus(one, 201).employeeCode, expectStatus(two, 201).employeeCode].sort()
  assert.deepEqual(codes, ['EMP0008', 'EMP0009'])
  const third = expectStatus(await request(admin, 'POST', '/employees', complete({ employeeCode: 'EMP9999' })), 201)
  assert.equal(third.employeeCode, 'EMP0010')
  const patched = expectStatus(await request(admin, 'PATCH', `/employees/${third.id}`, { employeeCode: 'HACKED', phone: '0501234568' }), 200)
  assert.equal(patched.employeeCode, 'EMP0010'); assert.equal(patched.phone, '0501234568')
  assert.equal((await repo('Employee').findOneByOrFail({ id: third.id })).employeeCode, 'EMP0010')
})

test('البصمات برقم البصمة وحده: كود الموظف مبيربطش بصمة، ورقم البصمة بيربط', async () => {
  const emp = expectStatus(await request(admin, 'POST', '/employees', complete({ fingerprintCode: 'PUNCH77' })), 201)
  const day = '2026-08-03'
  await request(admin, 'POST', '/attendance/punches/manual', { reason: 'اختبار ربط الكود الوظيفي',
    punches: [{ employeeCode: emp.employeeCode, timestamp: new Date(`${day}T08:00:00`).toISOString() }] })
  expectStatus(await request(admin, 'POST', '/attendance/punches/manual', { reason: 'اختبار ربط رقم البصمة',
    punches: [{ employeeCode: 'PUNCH77', timestamp: new Date(`${day}T17:00:00`).toISOString() }] }), 201)
  const byCode = await repo('AttendancePunch').find({ where: { employeeCode: emp.employeeCode } })
  assert.ok(byCode.every(punch => punch.employeeId == null), 'الكود الوظيفي مش مفتاح بصمة')
  const byFingerprint = await repo('AttendancePunch').find({ where: { employeeCode: 'PUNCH77' } })
  assert.equal(byFingerprint.length, 1); assert.equal(byFingerprint[0].employeeId, emp.id)
})

test('طريقة الصرف: «نقدي + بنك» تحتاج مبلغ بنك > 0 وبنك وآيبان، والتحويل يحتاج البنك، والنقدي لا', async () => {
  const noAmount = await request(admin, 'POST', '/employees', complete({ payMethod: 'mixed', ...bank }))
  assert.equal(noAmount.status, 400); assert.match(messageOf(noAmount), /مبلغ التحويل البنكي/)
  const zero = await request(admin, 'POST', '/employees', complete({ payMethod: 'mixed', bankTransferAmount: 0, ...bank }))
  assert.equal(zero.status, 400)
  const noBank = await request(admin, 'POST', '/employees', complete({ payMethod: 'mixed', bankTransferAmount: 1500 }))
  assert.equal(noBank.status, 400); assert.match(messageOf(noBank), /اسم البنك مطلوب/)
  const noIban = await request(admin, 'POST', '/employees', complete({ payMethod: 'transfer', bankName: bank.bankName }))
  assert.equal(noIban.status, 400); assert.match(messageOf(noIban), /الآيبان مطلوب/)
  const mixed = expectStatus(await request(admin, 'POST', '/employees', complete({ payMethod: 'mixed', bankTransferAmount: 1500.75, ...bank })), 201)
  assert.equal(mixed.payMethod, 'mixed'); assert.equal(Number(mixed.bankTransferAmount), 1500.75)
  // التحويل لنقدي يمسح مبلغ البنك
  const cash = expectStatus(await request(admin, 'PATCH', `/employees/${mixed.id}`, { payMethod: 'cash' }), 200)
  assert.equal(cash.payMethod, 'cash'); assert.equal(cash.bankTransferAmount, null)
  const back = await request(admin, 'PATCH', `/employees/${mixed.id}`, { payMethod: 'mixed' })
  assert.equal(back.status, 400); assert.match(messageOf(back), /مبلغ التحويل البنكي/)
  // ملف قديم «تحويل» بلا بنك يحفظ باقي حقوله
  const legacy = await seeded(branchA, { payMethod: 'transfer' })
  expectStatus(await request(admin, 'PATCH', `/employees/${legacy.id}`, { payMethod: 'transfer', jobTitle: 'فني' }), 200)
})

test('كشف البنوك والقسيمة: تحويل بنكي X — نقدي Y، وإجمالي كل بنك، وحساب فرع تاني ممنوع', async () => {
  const mixed = await seeded(branchA, { payMethod: 'mixed', bankTransferAmount: 3000, ...bank })
  const transfer = await seeded(branchA, { payMethod: 'transfer', bankName: 'البنك الأهلي', iban: 'SA4420000001234567891234' })
  const cash = await seeded(branchA, { payMethod: 'cash' })
  const run = expectStatus(await request(admin, 'POST', '/payroll/runs/calculate-defined', { period: '2026-07', scopeType: 'CUSTOM',
    employeeIds: [mixed.id, transfer.id, cash.id], name: `كشف البنوك ${crypto.randomUUID().slice(0, 8)}` }), 201)
  const net = id => Number(run.items.find(item => item.employeeId === id).netPay)
  assert.ok(net(mixed.id) > 3000, `صافي المختلط ${net(mixed.id)}`)

  const sheet = expectStatus(await request(admin, 'GET', `/payroll/runs/${run.id}/bank-sheet`), 200)
  const row = id => sheet.rows.find(r => r.employeeId === id)
  assert.deepEqual([row(mixed.id).bankAmount, row(mixed.id).cashAmount], [3000, Math.round((net(mixed.id) - 3000) * 100) / 100])
  assert.deepEqual([row(transfer.id).bankAmount, row(transfer.id).cashAmount], [net(transfer.id), 0])
  assert.deepEqual([row(cash.id).bankAmount, row(cash.id).cashAmount], [0, net(cash.id)])
  assert.equal(row(mixed.id).iban, bank.iban); assert.equal(row(mixed.id).employeeCode, mixed.employeeCode)
  assert.deepEqual(sheet.banks.map(b => [b.bankName, b.employees, b.total]).sort(), [['البنك الأهلي', 1, net(transfer.id)], [bank.bankName, 1, 3000]].sort())
  assert.equal(sheet.totals.employees, 3)
  assert.equal(Math.round(sheet.totals.bank * 100) + Math.round(sheet.totals.cash * 100), Math.round(sheet.totals.net * 100))

  const item = run.items.find(i => i.employeeId === mixed.id)
  const payslip = expectStatus(await request(admin, 'GET', `/payroll/items/${item.id}`), 200)
  assert.equal(payslip.employee.payMethod, 'mixed')
  assert.deepEqual(payslip.employee.paySplit, { bank: 3000, cash: row(mixed.id).cashAmount })

  const userOf = (name, branch) => repo('User').save({ email: `${name}@bank-sheet.invalid`, displayName: name, passwordHash: 'test-only', role: 'hr',
    branchId: branch.id, permissions: JSON.stringify(['payroll.view']) })
  const hrA = await userOf('hr-a', branchA), hrB = await userOf('hr-b', branchB)
  const scoped = expectStatus(await request(hrA, 'GET', `/payroll/runs/${run.id}/bank-sheet`), 200)
  assert.deepEqual(scoped.rows.map(r => r.employeeId).sort(), [mixed.id, transfer.id, cash.id].sort())
  const other = await request(hrB, 'GET', `/payroll/runs/${run.id}/bank-sheet`)
  assert.equal(other.status, 403, JSON.stringify(other.body))
})
