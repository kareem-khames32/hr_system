// «شيل خصم» وتبويبات شاشة المسير على قاعدة SQL مؤقتة معزولة (synchronize):
// قاعدة على فريق بتشيل خصم الإجازة بدون راتب عن موظفي الفريق بس عند الحساب، والإلغاء + إعادة الحساب يرجّعه،
// وحساب الفرع ما يعملش قاعدة للشركة أو لفرع تاني وما يشوفش موظفين فرع تاني في التبويبات.
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
const database = `hr_payroll_waivers_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-waivers-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, master, ds, base, admin, branchUser, branchA, branchB, deptA, teamA1, teamA2, created = false, employeeNumber = 0
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
async function employee(overrides = {}) {
  const n = ++employeeNumber
  const emp = await repo('Employee').save({ employeeCode: `WAV${String(n).padStart(3, '0')}`, fullName: `موظف الشيل ${n}`,
    branchId: branchA.id, departmentId: deptA.id, joinDate: '2020-01-01', basicSalary: 9000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0,
    status: 'active', isActive: true, payMethod: 'transfer', ...overrides })
  // استثناء حضور طول السنة يعزل الحساب عن الغياب والتأخير
  await repo('AttendanceExemption').save({ employeeId: emp.id, effectiveFrom: '2026-01-01', effectiveTo: '2027-12-31', reasonCode: 'field_role',
    reason: 'نافذة اختبار الشيل المعزولة', status: 'APPROVED', createdByUserId: admin.id, approvedByUserId: admin.id,
    approvedAt: new Date('2026-01-01T08:00:00Z'), terminatedFrom: null, overtimeEligibleOverride: null, unpaidLeaveDeductibleOverride: null, requiresCheckinForPresence: false })
  await repo('Leave').save({ employeeId: emp.id, leaveTypeCode: 'UNPAID', fromDate: '2026-07-09', toDate: '2026-07-10', days: 2, period: 'FULL', isUnpaid: true, status: 'APPROVED' })
  return emp
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, /^hr_payroll_waivers_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
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
  branchA = await repo('Branch').save({ code: 'WAIVE_A', name: 'فرع الشيل أ' })
  branchB = await repo('Branch').save({ code: 'WAIVE_B', name: 'فرع الشيل ب' })
  deptA = await repo('Department').save({ name: 'قسم أ', branchId: branchA.id })
  teamA1 = await repo('Team').save({ name: 'فريق أ1', departmentId: deptA.id })
  teamA2 = await repo('Team').save({ name: 'فريق أ2', departmentId: deptA.id })
  admin = await repo('User').save({ email: 'admin@waivers.invalid', displayName: 'admin', passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  branchUser = await repo('User').save({ email: 'branch@waivers.invalid', displayName: 'مسؤول فرع ب', passwordHash: 'test-only', role: 'hr',
    branchId: branchB.id, permissions: '["payroll.view","payroll.calculate"]' })
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
      assert.match(database, /^hr_payroll_waivers_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try { fs.rmSync(uploads, { recursive: true, force: true }) } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Payroll waivers fixture cleanup failed')
})

test('شيل خصم على فريق: يتطبق عند الحساب على الفريق بس، والتبويبات بتعرضه، والإلغاء + إعادة الحساب يرجّعه، وعزل الفرع', async () => {
  const inTeam = await employee({ teamId: teamA1.id })
  const otherTeam = await employee({ teamId: teamA2.id })

  // حساب الفرع: لا الشركة كلها ولا فرع تاني
  const company = await request(branchUser, 'POST', '/payroll/overview/waivers', { period: '2026-07', kind: 'UNPAID_LEAVE', targetLevel: 'company', reason: 'تجربة' })
  assert.equal(company.status, 403, JSON.stringify(company.body))
  const foreign = await request(branchUser, 'POST', '/payroll/overview/waivers', { period: '2026-07', kind: 'UNPAID_LEAVE', targetLevel: 'branch', branchId: branchA.id, reason: 'تجربة' })
  assert.equal(foreign.status, 403, JSON.stringify(foreign.body))
  // فريق مش تبع الفرع المختار مرفوض
  const wrongTeam = await request(admin, 'POST', '/payroll/overview/waivers', { period: '2026-07', kind: 'UNPAID_LEAVE', targetLevel: 'teams', branchId: branchB.id, teamIds: [teamA1.id], reason: 'تجربة' })
  assert.equal(wrongTeam.status, 400, JSON.stringify(wrongTeam.body))

  const waiver = expectStatus(await request(admin, 'POST', '/payroll/overview/waivers', { period: '2026-07', kind: 'UNPAID_LEAVE', targetLevel: 'teams',
    branchId: branchA.id, teamIds: [teamA1.id], reason: 'قرار الإدارة لشهر يوليو' }), 201)
  assert.deepEqual(waiver.recalculateRuns, [])
  const listed = expectStatus(await request(admin, 'GET', '/payroll/overview/waivers?period=2026-07'), 200)
  assert.equal(listed.length, 1); assert.equal(listed[0].kind, 'UNPAID_LEAVE'); assert.match(listed[0].targetText, /فريق أ1/)
  assert.deepEqual(expectStatus(await request(branchUser, 'GET', '/payroll/overview/waivers?period=2026-07'), 200), [], 'فرع ب ما يشوفش قاعدة فرع أ')

  const run = expectStatus(await request(admin, 'POST', '/payroll/runs/calculate-defined', { period: '2026-07', scopeType: 'CUSTOM',
    employeeIds: [inTeam.id, otherTeam.id], name: `اختبار الشيل ${crypto.randomUUID().slice(0, 8)}` }), 201)
  const itemOf = (rows, id) => rows.find(row => row.employeeId === id)
  assert.equal(Number(itemOf(run.items, inTeam.id).unpaidLeaveDeduction), 0, 'الفريق المشال مالوش خصم')
  assert.equal(Number(itemOf(run.items, otherTeam.id).unpaidLeaveDeduction), 600, 'الفريق التاني بيتخصم 2 × 300')

  const included = expectStatus(await request(admin, 'GET', '/payroll/overview/included?period=2026-07'), 200)
  assert.deepEqual(included.rows.map(row => row.employeeId).sort((a, b) => a - b), [inTeam.id, otherTeam.id].sort((a, b) => a - b))
  assert.equal(included.rows[0].branchName, 'فرع الشيل أ'); assert.equal(included.rows[0].departmentName, 'قسم أ')
  const deductions = expectStatus(await request(admin, 'GET', '/payroll/overview/deductions?period=2026-07'), 200)
  assert.deepEqual(deductions.rows.filter(row => row.kind === 'UNPAID_LEAVE').map(row => [row.employeeId, row.amount]), [[otherTeam.id, 600]])
  assert.equal(deductions.totals.UNPAID_LEAVE, 600)
  expectStatus(await request(admin, 'GET', '/payroll/overview/conflicts?period=2026-07'), 200)
  expectStatus(await request(admin, 'GET', '/payroll/overview/unassigned?period=2026-07'), 200)
  // عزل الفرع في التبويبات
  assert.deepEqual(expectStatus(await request(branchUser, 'GET', '/payroll/overview/included?period=2026-07'), 200).rows, [])
  assert.deepEqual(expectStatus(await request(branchUser, 'GET', '/payroll/overview/deductions?period=2026-07'), 200).rows, [])

  // حساب الفرع ما يلغيش قاعدة فرع تاني
  assert.equal((await request(branchUser, 'POST', `/payroll/overview/waivers/${waiver.id}/cancel`)).status, 404)
  expectStatus(await request(admin, 'POST', `/payroll/overview/waivers/${waiver.id}/cancel`), 201)
  const recalculated = expectStatus(await request(admin, 'POST', '/payroll/runs/calculate-defined', { runId: run.id, period: '2026-07', scopeType: 'CUSTOM',
    employeeIds: [inTeam.id, otherTeam.id], reason: 'إلغاء شيل الخصم' }), 201)
  assert.equal(Number(itemOf(recalculated.items, inTeam.id).unpaidLeaveDeduction), 600, 'بعد الإلغاء وإعادة الحساب الخصم رجع')
})

test('شيل أقساط السلف لموظف: القسط ما يتخصمش ويفضل مستحق، والمسير يتعتمد بخطة الأقساط المشالة', async () => {
  const emp = await employee({ teamId: teamA2.id })
  const loan = await repo('Loan').save({ employeeId: emp.id, amount: 500, status: 'DISBURSED', disbursedAt: new Date('2026-06-01T08:00:00Z') })
  const installment = await repo('LoanInstallment').save({ loanId: loan.id, dueDate: '2026-08-01', amount: 500, paid: false })
  expectStatus(await request(admin, 'POST', '/payroll/overview/waivers', { period: '2026-08', kind: 'LOAN', targetLevel: 'employees',
    branchId: branchA.id, employeeIds: [emp.id], reason: 'ظروف الموظف' }), 201)
  const run = expectStatus(await request(admin, 'POST', '/payroll/runs/calculate-defined', { period: '2026-08', scopeType: 'CUSTOM',
    employeeIds: [emp.id], name: `اختبار شيل السلفة ${crypto.randomUUID().slice(0, 8)}` }), 201)
  const item = run.items.find(row => row.employeeId === emp.id)
  assert.equal(Number(item.loanInstallments), 0)
  assert.deepEqual(JSON.parse(item.breakdown).installmentPlan.waivedDeferredIds, [installment.id])
  const approver = await repo('User').save({ email: 'approver@waivers.invalid', displayName: 'approver', passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  const report = expectStatus(await request(approver, 'GET', `/payroll/runs/${run.id}/unassigned`), 200)
  expectStatus(await request(approver, 'POST', `/payroll/runs/${run.id}/unassigned-ack`, { reportHash: report.reportHash }), 201)
  expectStatus(await request(approver, 'POST', `/payroll/runs/${run.id}/approve`), 201)
  const after = await repo('LoanInstallment').findOneByOrFail({ id: installment.id })
  assert.equal(after.paid, false, 'القسط لسه مستحق لمسير لاحق')
  assert.equal(await repo('LoanInstallmentAllocation').countBy({ installmentId: installment.id }), 0)
})
