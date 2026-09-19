// «تابة البدلات» على قاعدة SQL مؤقتة معزولة (synchronize):
// أنواع البدلات (شركة/فرع) وعزل الفروع، وصرف بدل على فريق = سطر للموظف ده بس + إضافة في الدفتر،
// والمسير المحسوب بياخده في «إضافات أخرى» والصافي والقسيمة باسم البدل، والإلغاء + إعادة الحساب يشيله،
// والمسير المعتمد ما بيتغيرش والإلغاء بعد الاعتماد مرفوض.
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
const database = `hr_payroll_allowances_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-allowances-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, master, ds, base, admin, approver, branchUser, branchA, branchB, deptA, teamA1, teamA2, created = false, employeeNumber = 0
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
  const emp = await repo('Employee').save({ employeeCode: `ALW${String(n).padStart(3, '0')}`, fullName: `موظف البدل ${n}`,
    branchId: branchA.id, departmentId: deptA.id, joinDate: '2020-01-01', basicSalary: 9000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0,
    status: 'active', isActive: true, payMethod: 'transfer', ...overrides })
  // استثناء حضور طول السنة يعزل الحساب عن الغياب والتأخير
  await repo('AttendanceExemption').save({ employeeId: emp.id, effectiveFrom: '2026-01-01', effectiveTo: '2027-12-31', reasonCode: 'field_role',
    reason: 'نافذة اختبار البدلات المعزولة', status: 'APPROVED', createdByUserId: admin.id, approvedByUserId: admin.id,
    approvedAt: new Date('2026-01-01T08:00:00Z'), terminatedFrom: null, overtimeEligibleOverride: null, unpaidLeaveDeductibleOverride: null, requiresCheckinForPresence: false })
  return emp
}
const itemOf = (rows, id) => rows.find(row => row.employeeId === id)

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, /^hr_payroll_allowances_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
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
  branchA = await repo('Branch').save({ code: 'ALLOW_A', name: 'فرع البدل أ' })
  branchB = await repo('Branch').save({ code: 'ALLOW_B', name: 'فرع البدل ب' })
  deptA = await repo('Department').save({ name: 'قسم أ', branchId: branchA.id })
  teamA1 = await repo('Team').save({ name: 'فريق أ1', departmentId: deptA.id })
  teamA2 = await repo('Team').save({ name: 'فريق أ2', departmentId: deptA.id })
  admin = await repo('User').save({ email: 'admin@allowances.invalid', displayName: 'admin', passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  approver = await repo('User').save({ email: 'approver@allowances.invalid', displayName: 'approver', passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  branchUser = await repo('User').save({ email: 'branch@allowances.invalid', displayName: 'مسؤول فرع ب', passwordHash: 'test-only', role: 'hr',
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
      assert.match(database, /^hr_payroll_allowances_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try { fs.rmSync(uploads, { recursive: true, force: true }) } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Payroll allowances fixture cleanup failed')
})

let transport
test('أنواع البدلات: الشركة لحساب الشركة، وحساب الفرع يضيف لفرعه ويشوف الشركة + فرعه بس، وبدل العطلات محجوز', async () => {
  transport = expectStatus(await request(admin, 'POST', '/payroll/allowances/types', { name: 'بدل انتقالات إضافي', code: 'transport_extra' }), 201)
  assert.equal(transport.code, 'TRANSPORT_EXTRA'); assert.equal(transport.branchId, null); assert.equal(transport.isActive, true)
  assert.equal((await request(admin, 'POST', '/payroll/allowances/types', { name: 'بدل انتقالات إضافي' })).status, 400, 'نفس الاسم مرفوض')
  assert.equal((await request(admin, 'POST', '/payroll/allowances/types', { name: 'بدل دوام أيام العطلات' })).status, 400, 'بدل العطلات بيتحسب لوحده')
  // حساب الفرع: من غير فرع = فرعه، وفرع تاني ممنوع
  const local = expectStatus(await request(branchUser, 'POST', '/payroll/allowances/types', { name: 'بدل سكن مؤقت' }), 201)
  assert.equal(local.branchId, branchB.id); assert.ok(local.code.startsWith('ALW-'))
  assert.equal((await request(branchUser, 'POST', '/payroll/allowances/types', { name: 'بدل تاني', branchId: branchA.id })).status, 403)
  const hidden = expectStatus(await request(admin, 'POST', '/payroll/allowances/types', { name: 'بدل خاص بفرع أ', branchId: branchA.id }), 201)
  const branchList = expectStatus(await request(branchUser, 'GET', '/payroll/allowances/types'), 200)
  assert.deepEqual(branchList.map(row => row.id).sort((x, y) => x - y), [transport.id, local.id].sort((x, y) => x - y))
  assert.equal(branchList.find(row => row.id === transport.id).canEdit, false)
  // حساب الفرع ما يوقفش نوع الشركة ولا يشوف نوع فرع تاني
  assert.equal((await request(branchUser, 'PATCH', `/payroll/allowances/types/${transport.id}`, { isActive: false })).status, 403)
  assert.equal((await request(branchUser, 'PATCH', `/payroll/allowances/types/${hidden.id}`, { isActive: false })).status, 404)
  const stopped = expectStatus(await request(branchUser, 'PATCH', `/payroll/allowances/types/${local.id}`, { isActive: false }), 200)
  assert.equal(stopped.isActive, false)
  assert.equal(expectStatus(await request(admin, 'GET', '/payroll/allowances/types'), 200).length, 3)
})

test('صرف بدل على فريق: يدخل المسير المحسوب إضافة باسم البدل والصافي والقسيمة، والإلغاء + إعادة الحساب يشيله، وعزل الفرع', async () => {
  const inTeam = await employee({ teamId: teamA1.id })
  const otherTeam = await employee({ teamId: teamA2.id })
  const body = { period: '2026-07', allowanceTypeId: transport.id, amount: '250.50', targetLevel: 'teams', branchId: branchA.id, teamIds: [teamA1.id], reason: 'مواصلات مشروع يوليو' }

  // حساب الفرع: لا الشركة كلها ولا فرع تاني
  assert.equal((await request(branchUser, 'POST', '/payroll/allowances/grants', { ...body, targetLevel: 'company' })).status, 403)
  assert.equal((await request(branchUser, 'POST', '/payroll/allowances/grants', body)).status, 403)
  // فريق مش تبع الفرع المختار، ومبلغ غلط
  assert.equal((await request(admin, 'POST', '/payroll/allowances/grants', { ...body, branchId: branchB.id })).status, 400)
  assert.equal((await request(admin, 'POST', '/payroll/allowances/grants', { ...body, amount: '10.555' })).status, 400)

  const grant = expectStatus(await request(admin, 'POST', '/payroll/allowances/grants', body), 201)
  assert.equal(grant.created, 1); assert.equal(grant.total, 250.5); assert.deepEqual(grant.recalculateRuns, [])
  // نفس البدل لنفس الموظف في نفس الشهر ما يتكررش
  assert.equal((await request(admin, 'POST', '/payroll/allowances/grants', body)).status, 400)
  const obligations = await repo('EmployeeObligation').findBy({ employeeId: inTeam.id })
  assert.equal(obligations.length, 1)
  assert.equal(obligations[0].type, 'CREDIT'); assert.equal(obligations[0].category, 'allowance'); assert.equal(obligations[0].label, 'بدل انتقالات إضافي')
  assert.equal(obligations[0].targetPeriod, '2026-07'); assert.equal(Number(obligations[0].amount), 250.5)
  assert.equal(await repo('EmployeeObligation').countBy({ employeeId: otherTeam.id }), 0, 'الفريق التاني مالوش بدل')

  let listed = expectStatus(await request(admin, 'GET', '/payroll/allowances/grants?period=2026-07'), 200)
  assert.equal(listed.rows.length, 1); assert.equal(listed.rows[0].state, 'PENDING'); assert.equal(listed.totals.amount, 250.5)
  assert.equal(listed.grants[0].targetText, 'فرع البدل أ — فرق: فريق أ1')
  assert.deepEqual(expectStatus(await request(branchUser, 'GET', '/payroll/allowances/grants?period=2026-07'), 200).rows, [], 'فرع ب ما يشوفش بدلات فرع أ')

  const run = expectStatus(await request(admin, 'POST', '/payroll/runs/calculate-defined', { period: '2026-07', scopeType: 'CUSTOM',
    employeeIds: [inTeam.id, otherTeam.id], name: `اختبار البدل ${crypto.randomUUID().slice(0, 8)}` }), 201)
  const withAllowance = itemOf(run.items, inTeam.id), without = itemOf(run.items, otherTeam.id)
  assert.equal(Number(withAllowance.otherAdditions), 250.5, 'البدل في إضافات المسير')
  assert.equal(Number(without.otherAdditions), 0)
  assert.equal(Math.round((Number(withAllowance.netPay) - Number(without.netPay)) * 100), 25050, 'الصافي زاد بمبلغ البدل بالظبط')
  const lines = JSON.parse(withAllowance.breakdown).obligationLines
  assert.deepEqual(lines.map(line => [line.id, line.type, line.collected]), [[obligations[0].id, 'CREDIT', 250.5]])
  // القسيمة: تفصيل الإضافة باسم البدل
  const payslip = expectStatus(await request(admin, 'GET', `/payroll/items/${withAllowance.id}`), 200)
  assert.deepEqual(payslip.obligationDetails.map(row => [row.type, row.category, row.label, row.collected]), [['CREDIT', 'allowance', 'بدل انتقالات إضافي', '250.50']])

  listed = expectStatus(await request(admin, 'GET', '/payroll/allowances/grants?period=2026-07'), 200)
  assert.equal(listed.rows[0].state, 'IN_RUN'); assert.equal(listed.rows[0].runId, run.id); assert.equal(listed.rows[0].canCancel, true)

  // بدل اتضاف بعد الحساب: محتاج إعادة حساب، والرد بيقول أنهي مسير
  const late = expectStatus(await request(admin, 'POST', '/payroll/allowances/grants', { period: '2026-07', allowanceTypeId: transport.id, amount: '100',
    targetLevel: 'employees', branchId: branchA.id, employeeIds: [otherTeam.id], reason: 'إضافة متأخرة' }), 201)
  assert.deepEqual(late.recalculateRuns.map(row => row.id), [run.id])
  listed = expectStatus(await request(admin, 'GET', '/payroll/allowances/grants?period=2026-07'), 200)
  assert.equal(listed.rows.find(row => row.employeeId === otherTeam.id).state, 'NEEDS_RECALC')
  assert.equal(listed.totals.amount, 350.5); assert.equal(listed.totals.count, 2)

  // إلغاء سطر: حساب فرع تاني ما يشوفوش، والإلغاء بيقول يتعاد حساب أنهي مسير
  const line = listed.rows.find(row => row.employeeId === inTeam.id)
  assert.equal((await request(branchUser, 'POST', `/payroll/allowances/lines/${line.id}/cancel`)).status, 404)
  const cancelled = expectStatus(await request(admin, 'POST', `/payroll/allowances/lines/${line.id}/cancel`), 201)
  assert.equal(cancelled.status, 'CANCELLED'); assert.deepEqual(cancelled.recalculateRuns.map(row => row.id), [run.id])
  assert.equal((await repo('EmployeeObligation').findOneByOrFail({ id: obligations[0].id })).status, 'CANCELLED')

  const recalculated = expectStatus(await request(admin, 'POST', '/payroll/runs/calculate-defined', { runId: run.id, period: '2026-07', scopeType: 'CUSTOM',
    employeeIds: [inTeam.id, otherTeam.id], reason: 'بعد تعديل البدلات' }), 201)
  assert.equal(Number(itemOf(recalculated.items, inTeam.id).otherAdditions), 0, 'بعد الإلغاء وإعادة الحساب البدل اتشال')
  assert.equal(Number(itemOf(recalculated.items, otherTeam.id).otherAdditions), 100, 'البدل المتأخر دخل بعد إعادة الحساب')
  listed = expectStatus(await request(admin, 'GET', '/payroll/allowances/grants?period=2026-07'), 200)
  assert.equal(listed.rows.find(row => row.employeeId === inTeam.id).state, 'CANCELLED')
  assert.equal(listed.rows.find(row => row.employeeId === otherTeam.id).state, 'IN_RUN')
  assert.equal(listed.totals.amount, 100)
})

test('المسير المعتمد ما بيتغيرش: الإلغاء بعد الاعتماد مرفوض، وإلغاء الدفعة بيسيب المحجوز', async () => {
  const emp = await employee({ teamId: teamA2.id })
  const second = await employee({ teamId: teamA2.id })
  const grant = expectStatus(await request(admin, 'POST', '/payroll/allowances/grants', { period: '2026-08', allowanceTypeId: transport.id, amount: '75',
    targetLevel: 'employees', branchId: branchA.id, employeeIds: [emp.id, second.id], reason: 'بدل أغسطس' }), 201)
  assert.equal(grant.created, 2)
  const run = expectStatus(await request(admin, 'POST', '/payroll/runs/calculate-defined', { period: '2026-08', scopeType: 'CUSTOM',
    employeeIds: [emp.id], name: `اختبار اعتماد البدل ${crypto.randomUUID().slice(0, 8)}` }), 201)
  assert.equal(Number(itemOf(run.items, emp.id).otherAdditions), 75)
  const report = expectStatus(await request(approver, 'GET', `/payroll/runs/${run.id}/unassigned`), 200)
  expectStatus(await request(approver, 'POST', `/payroll/runs/${run.id}/unassigned-ack`, { reportHash: report.reportHash }), 201)
  expectStatus(await request(approver, 'POST', `/payroll/runs/${run.id}/approve`), 201)

  let listed = expectStatus(await request(admin, 'GET', '/payroll/allowances/grants?period=2026-08'), 200)
  const approvedLine = listed.rows.find(row => row.employeeId === emp.id)
  assert.equal(approvedLine.state, 'APPROVED'); assert.equal(approvedLine.runId, run.id); assert.equal(approvedLine.canCancel, false)
  const refused = await request(admin, 'POST', `/payroll/allowances/lines/${approvedLine.id}/cancel`)
  assert.equal(refused.status, 409, JSON.stringify(refused.body))

  // إلغاء الدفعة كلها: اللي في المسير المعتمد يفضل، والباقي يتلغي
  const result = expectStatus(await request(admin, 'POST', `/payroll/allowances/grants/${grant.id}/cancel`), 201)
  assert.equal(result.cancelled, 1); assert.equal(result.locked, 1)
  listed = expectStatus(await request(admin, 'GET', '/payroll/allowances/grants?period=2026-08'), 200)
  assert.equal(listed.rows.find(row => row.employeeId === emp.id).state, 'APPROVED')
  assert.equal(listed.rows.find(row => row.employeeId === second.id).state, 'CANCELLED')
  const detail = expectStatus(await request(admin, 'GET', `/payroll/runs/${run.id}`), 200)
  assert.equal(Number(itemOf(detail.items, emp.id).otherAdditions), 75, 'المعتمد زي ما هو')
})
