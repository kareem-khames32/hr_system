// التأمينات الاجتماعية على قاعدة SQL مؤقتة معزولة (synchronize):
// المسير يخصم حصة الموظف سطرًا مستقلًا بنظام الفرع (سعودي/مصري/بدون) والاعتماد يقبل الصافي بعدها،
// والتقرير الشهري من المسير بفلتر الفرع وعزل حساب الفرع، والإعدادات ونظام الفرع لحساب على مستوى الشركة فقط.
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
const database = `hr_social_insurance_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-social-insurance-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const { writeParityReasonsBeforeApproval } = require('./fixtures/payroll-parity-reasons.cjs')
let app, master, ds, base, admin, approver, branchUser, saudiBranch, egyptBranch, plainBranch, created = false, employeeNumber = 0
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
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
function expectStatus(response, status) {
  assert.equal(response.status, status, JSON.stringify(response.body))
  return response.body
}
async function employee(branch, overrides = {}) {
  const n = ++employeeNumber
  const emp = await repo('Employee').save({ employeeCode: `SI${String(n).padStart(3, '0')}`, fullName: `موظف التأمينات ${n}`, nationality: 'سعودي',
    branchId: branch.id, joinDate: '2020-01-01', basicSalary: 9000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0,
    status: 'active', isActive: true, payMethod: 'transfer', ...overrides })
  // استثناء حضور طول السنة يعزل الحساب عن الغياب والتأخير
  await repo('AttendanceExemption').save({ employeeId: emp.id, effectiveFrom: '2026-01-01', effectiveTo: '2027-12-31', reasonCode: 'field_role',
    reason: 'نافذة اختبار التأمينات المعزولة', status: 'APPROVED', createdByUserId: admin.id, approvedByUserId: admin.id,
    approvedAt: new Date('2026-01-01T08:00:00Z'), terminatedFrom: null, overtimeEligibleOverride: null, unpaidLeaveDeductibleOverride: null, requiresCheckinForPresence: false })
  return emp
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, /^hr_social_insurance_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
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
  saudiBranch = await repo('Branch').save({ code: 'SI_SA', name: 'فرع الرياض', insuranceSystem: 'SAUDI' })
  egyptBranch = await repo('Branch').save({ code: 'SI_EG', name: 'فرع القاهرة', insuranceSystem: 'EGYPTIAN' })
  plainBranch = await repo('Branch').save({ code: 'SI_NONE', name: 'فرع بدون تأمينات' })
  admin = await repo('User').save({ email: 'admin@social-insurance.invalid', displayName: 'admin', passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  approver = await repo('User').save({ email: 'approver@social-insurance.invalid', displayName: 'approver', passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  branchUser = await repo('User').save({ email: 'branch@social-insurance.invalid', displayName: 'branch hr', passwordHash: 'test-only', role: 'hr_manager',
    branchId: saudiBranch.id, permissions: JSON.stringify(['payroll.view', 'payroll.policy.manage', 'org.manage']) })
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
      assert.match(database, /^hr_social_insurance_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try { fs.rmSync(uploads, { recursive: true, force: true }) } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Social insurance fixture cleanup failed')
})

test('المسير: حصة الموظف سطر مستقل بنظام الفرع، والاعتماد يقبل الصافي بعدها، والتقرير من المسير بعزل الفرع', async () => {
  const saudi = await employee(saudiBranch, { isGosiRegistered: true, gosiNumber: 'GOSI-1', gosiBaseSalary: 10000 })
  const resident = await employee(saudiBranch, { nationality: 'هندي', isGosiRegistered: true, gosiBaseSalary: 60000 })
  const unregistered = await employee(saudiBranch, { isGosiRegistered: false, gosiBaseSalary: 10000 })
  const egyptian = await employee(egyptBranch, { nationality: 'مصري', isGosiRegistered: true, basicSalary: 2000 })
  const noSystem = await employee(plainBranch, { isGosiRegistered: true, gosiBaseSalary: 5000 })

  const run = expectStatus(await request(admin, 'POST', '/payroll/runs/calculate-defined', { period: '2026-07', scopeType: 'CUSTOM',
    employeeIds: [saudi.id, resident.id, unregistered.id, egyptian.id, noSystem.id], name: `اختبار التأمينات ${crypto.randomUUID().slice(0, 8)}` }), 201)
  const itemOf = emp => run.items.find(row => row.employeeId === emp.id)
  const expected = [[saudi, 975, 8025], [resident, 0, 9000], [unregistered, 0, 9000], [egyptian, 297, 1703], [noSystem, 0, 9000]]
  for (const [emp, share, net] of expected) {
    const item = itemOf(emp)
    assert.ok(item, `الموظف ${emp.employeeCode} في المسير`)
    assert.equal(Number(item.socialInsuranceDeduction), share, emp.employeeCode)
    assert.equal(Number(item.netPay), net, emp.employeeCode)
  }
  const saudiDetail = JSON.parse(itemOf(saudi).breakdown).socialInsurance
  assert.equal(saudiDetail.kind, 'SOCIAL_INSURANCE'); assert.equal(saudiDetail.label, 'التأمينات الاجتماعية (حصة الموظف)')
  assert.deepEqual([saudiDetail.system, saudiDetail.category, saudiDetail.insuredSalary, saudiDetail.employerShare], ['SAUDI', 'SAUDI', 10000, 1175])
  const residentDetail = JSON.parse(itemOf(resident).breakdown).socialInsurance
  assert.deepEqual([residentDetail.category, residentDetail.insuredSalary, residentDetail.employerShare], ['NON_SAUDI', 45000, 900])
  const egyptDetail = JSON.parse(itemOf(egyptian).breakdown).socialInsurance
  assert.deepEqual([egyptDetail.salarySource, egyptDetail.insuredSalary, egyptDetail.employerShare], ['BASIC', 2700, 506.25])
  assert.equal(JSON.parse(itemOf(noSystem).breakdown).socialInsurance.skipReason, 'NO_SYSTEM')

  const payslip = expectStatus(await request(admin, 'GET', `/payroll/items/${itemOf(saudi).id}`), 200)
  assert.equal(Number(payslip.item.socialInsuranceDeduction), 975)

  // الاعتماد: خطة الأقساط وفحص الصافي بعد التأمينات
  const unassigned = expectStatus(await request(approver, 'GET', `/payroll/runs/${run.id}/unassigned`), 200)
  expectStatus(await request(approver, 'POST', `/payroll/runs/${run.id}/unassigned-ack`, { reportHash: unassigned.reportHash }), 201)
  expectStatus(await request(approver, 'POST', `/payroll/runs/${run.id}/approve`), 201)
  assert.equal((await repo('PayrollRun').findOneByOrFail({ id: run.id })).status, 'APPROVED')

  const report = expectStatus(await request(admin, 'GET', '/social-insurance/report?period=2026-07'), 200)
  assert.deepEqual(report.rows.map(row => [row.employeeCode, row.employeeShare, row.employerShare, row.source]).sort(),
    [[saudi.employeeCode, 975, 1175, 'PAYROLL'], [resident.employeeCode, 0, 900, 'PAYROLL'], [egyptian.employeeCode, 297, 506.25, 'PAYROLL']].sort())
  assert.deepEqual(report.totals, { employees: 3, insuredSalary: '57700.00', employeeShare: '1272.00', employerShare: '2581.25', total: '3853.25' })
  const egyptOnly = expectStatus(await request(admin, 'GET', `/social-insurance/report?period=2026-07&branchId=${egyptBranch.id}`), 200)
  assert.deepEqual(egyptOnly.rows.map(row => row.employeeId), [egyptian.id])
  // حساب الفرع يشوف فرعه بس، وفرع تاني ممنوع
  const scoped = expectStatus(await request(branchUser, 'GET', '/social-insurance/report?period=2026-07'), 200)
  assert.deepEqual(scoped.rows.map(row => row.branchId).filter(id => id !== saudiBranch.id), [])
  assert.equal((await request(branchUser, 'GET', `/social-insurance/report?period=2026-07&branchId=${egyptBranch.id}`)).status, 403)
  const scopedSettings = expectStatus(await request(branchUser, 'GET', '/social-insurance/settings'), 200)
  assert.equal(scopedSettings.canEdit, false); assert.deepEqual(scopedSettings.branches.map(branch => branch.id), [saudiBranch.id])
})

test('الإعدادات ونظام الفرع: لحساب على مستوى الشركة بس، والتحقق من القيم، والتقديري بالنسب الجديدة', async () => {
  const initial = expectStatus(await request(admin, 'GET', '/social-insurance/settings'), 200)
  assert.equal(initial.reviewedAt, null); assert.equal(initial.settings.saudiEmployeePct, 9.75); assert.equal(initial.canEdit, true)

  assert.equal((await request(branchUser, 'PUT', '/social-insurance/settings', { saudiEmployeePct: 10 })).status, 403)
  assert.equal((await request(branchUser, 'PATCH', `/branches/${saudiBranch.id}`, { insuranceSystem: 'NONE' })).status, 403)
  assert.equal((await repo('Branch').findOneByOrFail({ id: saudiBranch.id })).insuranceSystem, 'SAUDI')
  assert.equal((await request(admin, 'PATCH', `/branches/${plainBranch.id}`, { insuranceSystem: 'KUWAITI' })).status, 400)

  const bad = await request(admin, 'PUT', '/social-insurance/settings', { egyptianMinSalary: 20000 })
  assert.equal(bad.status, 400); assert.match([].concat(bad.body.message).join(' '), /الحد الأدنى للأجر أكبر/)
  const saved = expectStatus(await request(admin, 'PUT', '/social-insurance/settings', { saudiEmployeePct: '10', egyptianMaxSalary: 20000 }), 200)
  assert.equal(saved.settings.saudiEmployeePct, 10); assert.equal(saved.settings.egyptianMaxSalary, 20000); assert.match(saved.reviewedAt, /^\d{4}-\d{2}-\d{2}$/)

  const emp = await employee(saudiBranch, { isGosiRegistered: true, gosiBaseSalary: 3333.33 })
  const estimate = expectStatus(await request(admin, 'GET', `/social-insurance/report?period=2026-08&branchId=${saudiBranch.id}`), 200)
  const row = estimate.rows.find(r => r.employeeId === emp.id)
  assert.deepEqual([row.source, row.employeeShare, row.employerShare], ['ESTIMATE', 333.33, 391.66])
  expectStatus(await request(admin, 'PUT', '/social-insurance/settings', { saudiEmployeePct: 9.75, egyptianMaxSalary: 16700 }), 200)
})
