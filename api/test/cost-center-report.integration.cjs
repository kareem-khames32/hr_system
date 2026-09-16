// تقرير مراكز التكلفة وملف الشركة على قاعدة SQL مؤقتة معزولة (synchronize):
// 1) GET /reports/cost-centers: المسيرات المعتمدة/المصروفة للشهر (والمسودات بالاختيار)، مركز التكلفة والفرع من لقطة المسير، البند المعكوس مش محسوب،
//    حصة صاحب العمل من تفصيل البند، وحساب الفرع يشوف فرعه بس، ومن غير صلاحية الرواتب ممنوع.
// 2) PATCH /settings/config لمفاتيح ملف الشركة: صيغة الآيبان والبريد، وحساب الفرع ما يعدّلش.
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
const database = `hr_cost_center_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-cost-center-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, master, ds, base, created = false
const U = {}, B = {}, CC = {}, E = {}
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
const expectStatus = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const messageOf = response => [].concat(response.body?.message ?? []).join(' | ')

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, /^hr_cost_center_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
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

  B.a = await repo('Branch').save({ code: 'CC_A', name: 'فرع أ' })
  B.b = await repo('Branch').save({ code: 'CC_B', name: 'فرع ب' })
  CC.projects = await repo('CostCenter').save({ code: 'P1', name: 'المشاريع' })
  CC.admin = await repo('CostCenter').save({ code: 'AD', name: 'الإدارة' })
  const user = (email, role, branchId, permissions) => repo('User').save({ email, displayName: email, passwordHash: 'test-only', role, branchId,
    permissions: JSON.stringify(permissions) })
  U.admin = await user('admin@cc.invalid', 'super_admin', null, ['*'])
  U.branchA = await user('hr-a@cc.invalid', 'hr_manager', B.a.id, ['reports.view', 'payroll.view', 'settings.manage'])
  U.noPayroll = await user('rep@cc.invalid', 'hr_manager', B.a.id, ['reports.view'])
  const employee = (code, fullName, branchId, costCenterId) => repo('Employee').save({ employeeCode: code, fullName, branchId, costCenterId, joinDate: '2020-01-01',
    basicSalary: 5000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'transfer' })
  E.one = await employee('C1', 'أحمد', B.a.id, CC.projects.id)
  // ملفه الحالي على الإدارة، لكن لقطة المسير على المشاريع ⇒ يتحسب على المشاريع
  E.two = await employee('C2', 'بسمة', B.a.id, CC.admin.id)
  E.three = await employee('C3', 'كريم', B.b.id, CC.projects.id)
  E.four = await employee('C4', 'دينا', B.a.id, null)

  const run = (status, period, scopeType, extra = {}) => repo('PayrollRun').save({ status, period, scopeType, startDate: `${period}-01`, endDate: `${period}-28`, ...extra })
  const snap = (emp, branchId, costCenterId) => ({ version: 1, capturedAt: '2026-08-01T00:00:00.000Z', employeeCode: emp.employeeCode, fullName: emp.fullName,
    branchId, departmentId: null, teamId: null, costCenterId, coverFrom: null, coverTo: null, coverDays: null, prorataFactor: null, monthlyDays: 30,
    basicSalary: 5000, allowances: 0, gross: 5000, grossEarned: 5000 })
  const item = (runId, emp, money, extra = {}) => repo('PayrollItem').save({ runId, employeeId: emp.id, basicSalary: 5000, allowances: 0, payMethod: 'transfer', ...money, ...extra })
  const approved = await run('APPROVED', '2026-08', 'COMPANY')
  await repo('PayrollRunMember').save([
    { runId: approved.id, employeeId: E.one.id, snapshot: snap(E.one, B.a.id, CC.projects.id) },
    { runId: approved.id, employeeId: E.two.id, snapshot: snap(E.two, B.a.id, CC.projects.id) },
    { runId: approved.id, employeeId: E.four.id, snapshot: snap(E.four, B.a.id, null) },
  ])
  await item(approved.id, E.one, { latenessDeduction: 100.1, netPay: 4899.9 })
  await item(approved.id, E.two, { overtimeAmount: 250.55, socialInsuranceDeduction: 487.5, netPay: 4763.05,
    breakdown: JSON.stringify({ socialInsurance: { applies: true, employeeShare: 487.5, employerShare: 587.5 } }) })
  const reversedItem = await item(approved.id, E.four, { netPay: 5000 })
  const reversal = await run('PAID', '2026-08', 'CUSTOM', { runType: 'REVERSAL', parentRunId: approved.id })
  await repo('PayrollRunReversalLine').save({ reversalRunId: reversal.id, originalRunId: approved.id, originalItemId: reversedItem.id, employeeId: E.four.id,
    status: 'POSTED', netPay: 5000, itemSnapshot: '{}', itemHash: 'x'.repeat(64), createdByUserId: U.admin.id })
  // مسير قديم بلا لقطات: الفرع ومركز التكلفة من ملف الموظف
  const legacy = await run('PAID', '2026-08', 'BRANCH', { branchId: B.b.id, scopeIds: JSON.stringify([B.b.id]) })
  await item(legacy.id, E.three, { otherDeductions: 10.01, netPay: 4989.99 })
  const draft = await run('CALCULATED', '2026-08', 'BRANCH', { branchId: B.a.id, scopeIds: JSON.stringify([B.a.id]) })
  await item(draft.id, E.four, { netPay: 1234.56 })
  const cancelled = await run('CANCELLED', '2026-08', 'CUSTOM')
  await item(cancelled.id, E.one, { netPay: 9999 })
  const otherMonth = await run('APPROVED', '2026-07', 'COMPANY')
  await item(otherMonth.id, E.one, { netPay: 7777 })

  for (const key of ['company.payroll_iban', 'company.email']) {
    if (!(await repo('RequestsConfig').findOneBy({ key }))) await repo('RequestsConfig').save({ key, value: '' })
  }
}, { timeout: 90000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_cost_center_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try { fs.rmSync(uploads, { recursive: true, force: true }) } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Cost center fixture cleanup failed')
})

test('تقرير مراكز التكلفة: معتمد/مصروف بس، لقطة المسير، المعكوس مستبعد، حصة صاحب العمل', async () => {
  const report = expectStatus(await request(U.admin, 'GET', '/reports/cost-centers?period=2026-08'), 200)
  assert.equal(report.employerInsuranceAvailable, true)
  assert.deepEqual(report.centers.map(c => c.name), ['المشاريع'])
  const [projects] = report.centers
  assert.equal(projects.code, 'P1')
  assert.equal(projects.headcount, 3)
  assert.equal(projects.gross, '15250.55')
  assert.equal(projects.deductions, '597.61')
  assert.equal(projects.net, '14652.94')
  assert.equal(projects.employerInsurance, '587.50')
  assert.deepEqual(projects.employees.map(e => [e.fullName, e.branchName]).sort(), [['أحمد', 'فرع أ'], ['بسمة', 'فرع أ'], ['كريم', 'فرع ب']])
  assert.deepEqual(report.totals, { headcount: 3, gross: '15250.55', deductions: '597.61', net: '14652.94', employerInsurance: '587.50' })

  const withDraft = expectStatus(await request(U.admin, 'GET', '/reports/cost-centers?period=2026-08&includeDraft=true'), 200)
  assert.deepEqual(withDraft.centers.map(c => [c.name, c.headcount, c.net]), [['المشاريع', 3, '14652.94'], ['بدون مركز تكلفة', 1, '1234.56']])

  const filtered = expectStatus(await request(U.admin, 'GET', `/reports/cost-centers?period=2026-08&branchId=${B.b.id}`), 200)
  assert.deepEqual(filtered.totals, { headcount: 1, gross: '5000.00', deductions: '10.01', net: '4989.99', employerInsurance: '0.00' })

  const july = expectStatus(await request(U.admin, 'GET', '/reports/cost-centers?period=2026-07'), 200)
  assert.equal(july.totals.net, '7777.00')
  assert.equal((await request(U.admin, 'GET', '/reports/cost-centers?period=2026-13')).status, 400)
})

test('تقرير مراكز التكلفة: حساب الفرع يشوف فرعه بس، ومن غير صلاحية الرواتب ممنوع', async () => {
  const own = expectStatus(await request(U.branchA, 'GET', '/reports/cost-centers?period=2026-08'), 200)
  assert.equal(own.branchId, B.a.id)
  assert.deepEqual(own.totals, { headcount: 2, gross: '10250.55', deductions: '587.60', net: '9662.95', employerInsurance: '587.50' })
  assert.ok(own.centers.every(center => center.employees.every(employee => employee.branchName === 'فرع أ')))
  assert.equal((await request(U.branchA, 'GET', `/reports/cost-centers?period=2026-08&branchId=${B.b.id}`)).status, 403)
  assert.equal((await request(U.noPayroll, 'GET', '/reports/cost-centers?period=2026-08')).status, 403)
})

test('ملف الشركة: الآيبان والبريد بصيغة صحيحة، وحساب الفرع ما يعدّلش', async () => {
  const badIban = await request(U.admin, 'PATCH', '/settings/config', { key: 'company.payroll_iban', value: 'SA12' })
  assert.equal(badIban.status, 400); assert.match(messageOf(badIban), /الآيبان/)
  expectStatus(await request(U.admin, 'PATCH', '/settings/config', { key: 'company.payroll_iban', value: 'SA0380000000608010167519' }), 200)
  assert.equal((await repo('RequestsConfig').findOneByOrFail({ key: 'company.payroll_iban' })).value, 'SA0380000000608010167519')
  const badEmail = await request(U.admin, 'PATCH', '/settings/config', { key: 'company.email', value: 'hr@company' })
  assert.equal(badEmail.status, 400); assert.match(messageOf(badEmail), /البريد/)
  expectStatus(await request(U.admin, 'PATCH', '/settings/config', { key: 'company.email', value: '' }), 200)
  assert.equal((await request(U.branchA, 'PATCH', '/settings/config', { key: 'company.email', value: 'hr@company.com' })).status, 403)
})
