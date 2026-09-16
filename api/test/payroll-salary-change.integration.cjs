// Real SQL + HTTP. Each run creates and removes its own random disposable database.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_salary_change_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-salary-change-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const keys = ['basicSalary', 'housingAllowance', 'transportAllowance', 'phoneAllowance', 'workNatureAllowance', 'otherAllowance']
const today = require('../src/attendance/attendance.service').localDateOf(new Date())
// قاعدة المالك: تغيير الراتب يسري من راتب شهر كامل؛ دورة الشركة المبذورة 23.
const { payrollPeriodOfDate, shiftPayrollPeriod } = require('../src/payroll/payroll-period')
const currentMonth = payrollPeriodOfDate(today, 23)
const baseSalary = { basicSalary: '6000.00', housingAllowance: '1500.00', transportAllowance: '500.00',
  phoneAllowance: '300.00', workNatureAllowance: '200.00', otherAllowance: '100.00', currency: 'EGP' }
let app, ds, master, base, created = false, sequence = 0, branchA, branchB, admin, editor, outsider, viewer
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
const expect = (r, status) => { assert.equal(r.status, status, JSON.stringify(r.body)); return r.body }
async function request(user, method, route, body) {
  const token = user && jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null,
    employeeId: user.employeeId ?? null, tokenVersion: user.tokenVersion ?? 0,
    permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  return { status: response.status, body: await response.json() }
}
async function employee(extra = {}) {
  const emp = await repo('Employee').save({ employeeCode: `SCH${++sequence}`, fullName: 'موظف اختبار سريان الأجر',
    branchId: branchA.id, status: 'active', joinDate: '2020-01-01', ...baseSalary, ...extra })
  return emp
}
const context = async (emp, actor = editor) => expect(await request(actor, 'GET', `/employees/${emp.id}/salary-change-context`), 200)
async function command(emp, salary = {}, extra = {}, actor = editor) {
  const c = await context(emp, actor)
  return { expectedRevision: c.historyRevision, expectedCurrentSourceHash: c.currentSourceHash,
    effectivePayrollPeriod: currentMonth, reason: 'قرار تعديل الأجر للاختبار', evidenceReference: 'قرار داخلي اختباري',
    salary: { ...c.current, ...salary }, ...extra }
}
async function patch(emp, salaryChange, other = {}, actor = editor) {
  return request(actor, 'PATCH', `/employees/${emp.id}`, { ...other, salaryChange })
}
async function history(emp) { return expect(await request(admin, 'GET', `/payroll/employees/${emp.id}/salary-history`), 200) }
async function snapshot(emp) {
  const result = {}
  for (const table of ['employees', 'employee_salary_history_versions', 'employee_status_history']) {
    const filter = table === 'employees' ? '[id]=@0' : '[employeeId]=@0'
    result[table] = (await ds.query(`SELECT (SELECT * FROM [${table}] WHERE ${filter} ORDER BY id FOR JSON PATH, INCLUDE_NULL_VALUES) AS data`, [emp.id]))[0].data
  }
  result.history = (await ds.query('SELECT (SELECT * FROM employee_salary_history WHERE versionId IN (SELECT id FROM employee_salary_history_versions WHERE employeeId=@0) ORDER BY id FOR JSON PATH, INCLUDE_NULL_VALUES) AS data', [emp.id]))[0].data
  return result
}
before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql'); assert.match(database, /^hr_salary_change_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433),
    user: env.DB_USERNAME, password: env.DB_PASSWORD, database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: false, abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => {}
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => {}
  ds = app.get(require('../node_modules/typeorm').DataSource); assert.equal(ds.options.database, database)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  branchA = await repo('Branch').save({ name: 'Salary fixture A', code: 'SALA' })
  branchB = await repo('Branch').save({ name: 'Salary fixture B', code: 'SALB' })
  const user = (name, role, branchId, permissions) => repo('User').save({ email: `${name}@salary-change.invalid`, displayName: name,
    passwordHash: 'test-only', role, branchId, permissions: JSON.stringify(permissions) })
  admin = await user('admin', 'super_admin', null, ['*'])
  // تغيير الأجر وسياقه = employees.edit + payroll.approve (SEC-06)
  editor = await user('editor', 'hr', branchA.id, ['employees.edit', 'payroll.approve'])
  outsider = await user('other', 'hr', branchB.id, ['employees.edit', 'payroll.approve'])
  viewer = await user('viewer', 'hr', branchA.id, ['employees.view', 'payroll.view'])
})
after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (e) { errors.push(e) }
  try {
    if (created && master) {
      assert.match(database, /^hr_salary_change_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('db', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name=@db')).recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} removed.`)
    }
  } catch (e) { errors.push(e) }
  try { if (master) await master.close() } catch (e) { errors.push(e) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir())); assert.match(path.basename(uploads), /^hr-salary-change-files-/)
    fs.rmSync(uploads, { recursive: true, force: true }); assert.equal(fs.existsSync(uploads), false)
    t.diagnostic('Cleanup verified: temporary uploads removed.')
  } catch (e) { errors.push(e) }
  if (errors.length) throw new AggregateError(errors, 'Salary change fixture cleanup failed')
})

test('salary metadata uses employees.edit + payroll.approve authority, branch scope and exact SQL amounts', async () => {
  const editOnly = await repo('User').save({ email: 'editonly@salary-change.invalid', displayName: 'editonly', passwordHash: 'test-only',
    role: 'hr', branchId: branchA.id, permissions: JSON.stringify(['employees.edit']) })
  const emp = await employee()
  await ds.query("UPDATE employees SET basicSalary=CAST('9007199254740991.23' AS decimal(18,2)), phoneAllowance=NULL, currency=NULL WHERE id=@0", [emp.id])
  const c = await context(emp)
  assert.equal(c.current.basicSalary, '9007199254740991.23'); assert.equal(c.current.phoneAllowance, null)
  assert.equal(c.current.currency, null); assert.equal(c.historyRevision, 0); assert.match(c.currentSourceHash, /^[a-f0-9]{64}$/)
  expect(await request(viewer, 'GET', `/employees/${emp.id}/salary-change-context`), 403)
  expect(await request(editOnly, 'GET', `/employees/${emp.id}/salary-change-context`), 403)
  expect(await request(editOnly, 'PATCH', `/employees/${emp.id}`, { salaryChange: await command(emp, { basicSalary: '6100.00' }) }), 403)
  expect(await request(outsider, 'GET', `/employees/${emp.id}/salary-change-context`), 404)
  expect(await request(null, 'GET', `/employees/${emp.id}/salary-change-context`), 401)
})

test('nonfinancial PATCH never rewrites huge or nullable salary values and needs no history date', async () => {
  const emp = await employee()
  await ds.query("UPDATE employees SET basicSalary=CAST('9007199254740991.23' AS decimal(18,2)), phoneAllowance=NULL, currency=NULL WHERE id=@0", [emp.id])
  const before = await context(emp)
  expect(await request(editor, 'PATCH', `/employees/${emp.id}`, { fullName: 'الاسم بعد التعديل', phone: '01234567890' }), 200)
  assert.deepEqual(await context(emp), before)
  assert.equal((await repo('Employee').findOneByOrFail({ id: emp.id })).fullName, 'الاسم بعد التعديل')
})

test('unchanged legacy financial fields may accompany other edits; changed fields need dated command', async () => {
  const emp = await employee()
  expect(await request(editor, 'PATCH', `/employees/${emp.id}`, { basicSalary: 6000, phoneAllowance: 300, currency: 'EGP', jobTitle: 'عنوان وظيفة' }), 200)
  const before = await snapshot(emp)
  const r = await request(editor, 'PATCH', `/employees/${emp.id}`, { phoneAllowance: 301, jobTitle: 'لن يحفظ' })
  assert.equal(expect(r, 400).code, 'SALARY_CHANGE_EFFECTIVE_DATE_REQUIRED')
  assert.deepEqual(await snapshot(emp), before)
})

test('profile salary update atomically records all six values, currency, effective date and real actor', async () => {
  const emp = await employee(), newSalary = { basicSalary: '7000.12', housingAllowance: '1234.56', transportAllowance: '333.33',
    phoneAllowance: '11.11', workNatureAllowance: '22.22', otherAllowance: '44.44', currency: 'SAR' }
  expect(await patch(emp, await command(emp, newSalary), { jobTitle: 'وظيفة جديدة' }), 200)
  const c = await context(emp), h = await history(emp)
  assert.deepEqual(c.current, newSalary); assert.equal(c.historyRevision, 1)
  assert.equal(h.segments.length, 1)
  assert.deepEqual({ ...h.segments[0], effectiveFrom: undefined }, { ...newSalary, effectivePayrollPeriod: currentMonth, effectiveToPayrollPeriod: null, effectiveFrom: undefined, effectiveTo: null })
  assert.equal(h.version.contractVersion, 'SALARY_PAYROLL_PERIOD_HISTORY_V2_20260914'); assert.equal(h.version.cycleStartDay, 23)
  assert.equal(c.currentPayrollPeriod, currentMonth); assert.equal(c.cycleStartDay, 23); assert.equal(c.historyContract, 'MONTHLY')
  assert.equal(h.version.createdBy, editor.id); assert.equal(h.version.currentSourceHash, c.currentSourceHash)
  const audit = await repo('EmployeeStatusHistory').findBy({ employeeId: emp.id, changeType: 'SALARY' })
  assert.equal(audit.length, 7)
  for (const row of audit) { assert.equal(row.changedByUserId, editor.id); assert.equal(row.newValue, newSalary[row.fieldName]); assert.ok(row.reason.includes(`يسري من راتب شهر ${currentMonth}`)) }
  assert.equal(await repo('PayrollRun').count(), 0); assert.equal(await repo('EmployeeObligation').count(), 0)
})

test('first-change prior salary coverage requires explicit confirmation month and retains the exact old values', async () => {
  const emp = await employee()
  expect(await patch(emp, await command(emp, { basicSalary: '6500.00' }, { effectivePayrollPeriod: '2026-06', previousEffectivePayrollPeriod: '2026-01' })), 200)
  const h = await history(emp)
  assert.equal(h.segments.length, 2)
  assert.deepEqual(h.segments[0], { ...baseSalary, effectivePayrollPeriod: '2026-01', effectiveToPayrollPeriod: '2026-05', effectiveFrom: '2025-12-23', effectiveTo: '2026-05-22' })
  assert.equal(h.segments[1].effectivePayrollPeriod, '2026-06'); assert.equal(h.segments[1].effectiveFrom, '2026-05-23'); assert.equal(h.segments[1].basicSalary, '6500.00')
})

test('later-month profile salary is rejected without changing current salary or history', async () => {
  const emp = await employee(), before = await snapshot(emp)
  assert.equal(expect(await patch(emp, await command(emp, { basicSalary: '7000' }, { effectivePayrollPeriod: '9999-01' })), 400).code, 'SALARY_CHANGE_FUTURE_REQUIRES_REQUEST')
  assert.equal(expect(await patch(emp, await command(emp, { basicSalary: '7000' }, { effectivePayrollPeriod: shiftPayrollPeriod(currentMonth, 1) })), 400).code, 'SALARY_CHANGE_FUTURE_REQUIRES_REQUEST')
  assert.deepEqual(await snapshot(emp), before)
})

test('a daily-dated salary history must be converted to payroll months before a profile change', async () => {
  const emp = await employee(), c = await context(emp)
  expect(await request(admin, 'POST', `/payroll/employees/${emp.id}/salary-history`, { expectedRevision: 0, expectedCurrentSourceHash: c.currentSourceHash,
    reason: 'دليل يومي قديم', evidenceReference: 'عقد قديم', segments: [{ ...baseSalary, effectiveFrom: '2026-01-01', effectiveTo: null }] }), 201)
  assert.equal((await context(emp)).historyContract, 'DAILY')
  const before = await snapshot(emp)
  assert.equal(expect(await patch(emp, await command(emp, { basicSalary: '7000.00' })), 409).code, 'SALARY_CHANGE_MONTHLY_HISTORY_REQUIRED')
  assert.deepEqual(await snapshot(emp), before)
})

test('nested salary DTO rejects missing, numeric, negative and subcent values plus impossible dates atomically', async () => {
  const emp = await employee(), valid = await command(emp, { basicSalary: '7000' }), before = await snapshot(emp)
  const invalid = [null, { ...valid, salary: null }, { ...valid, salary: { ...valid.salary, basicSalary: 7000 } },
    { ...valid, salary: { ...valid.salary, basicSalary: '-1' } }, { ...valid, salary: { ...valid.salary, basicSalary: '7000.001' } },
    { ...valid, salary: { ...valid.salary, currency: null } }, { ...valid, effectivePayrollPeriod: '2026-13' }, { ...valid, effectivePayrollPeriod: today },
    { ...valid, effectivePayrollPeriod: undefined, effectiveDate: today },
    { ...valid, reason: ' ' }, { ...valid, expectedRevision: '0' }, { ...valid, previousEffectivePayrollPeriod: null }]
  for (const value of invalid) expect(await patch(emp, value, { jobTitle: 'ممنوع حفظه' }), 400)
  expect(await patch(emp, valid, { basicSalary: 7000 }), 400)
  assert.deepEqual(await snapshot(emp), before)
})

test('two concurrent profile changes from one context allow exactly one save', async () => {
  const emp = await employee(), cmd = await command(emp, { basicSalary: '7000.00' })
  const results = await Promise.all([patch(emp, cmd), patch(emp, { ...cmd, salary: { ...cmd.salary, basicSalary: '8000.00' } })])
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409])
  assert.equal((await context(emp)).historyRevision, 1)
  assert.equal(await repo('EmployeeStatusHistory').countBy({ employeeId: emp.id, fieldName: 'basicSalary' }), 1)
})

test('stale current salary and stale history revision each reject without lost updates', async () => {
  const emp = await employee(), cmd = await command(emp, { basicSalary: '7000.00' })
  await ds.query('UPDATE employees SET phoneAllowance=301 WHERE id=@0', [emp.id])
  assert.equal(expect(await patch(emp, cmd), 409).code, 'SALARY_HISTORY_CURRENT_SOURCE_CHANGED')
  expect(await patch(emp, await command(emp, { basicSalary: '7000.00' })), 200)
  assert.equal(expect(await patch(emp, cmd), 409).code, 'SALARY_HISTORY_REVISION_CONFLICT')
})

test('history insertion failure rolls salary, audit and accompanying nonfinancial update back together', async () => {
  const emp = await employee(), cmd = await command(emp, { basicSalary: '7000.00' }, { reason: 'TEST_REJECT_AT_HISTORY_INSERT' })
  const before = await snapshot(emp)
  await ds.query("ALTER TABLE employee_salary_history_versions ADD CONSTRAINT CK_salary_change_test_failure CHECK (reason <> N'TEST_REJECT_AT_HISTORY_INSERT')")
  try { expect(await patch(emp, cmd, { jobTitle: 'لا يحفظ عند الفشل' }), 500); assert.deepEqual(await snapshot(emp), before) }
  finally { await ds.query('ALTER TABLE employee_salary_history_versions DROP CONSTRAINT CK_salary_change_test_failure') }
})

test('a rejected attachment after salary persistence rolls back salary, history, audit and profile together', async () => {
  const emp = await employee(), cmd = await command(emp, { basicSalary: '7000.00' }), before = await snapshot(emp)
  const response = await patch(emp, cmd, { fullName: 'اسم لا يحفظ', contractFileRef: 'file:2147483647' })
  assert.ok([400, 403, 404].includes(response.status), JSON.stringify(response.body))
  assert.deepEqual(await snapshot(emp), before)
})

test('salary writes and audit preserve SQL decimal cents beyond JavaScript safe integers', async () => {
  const emp = await employee()
  expect(await patch(emp, await command(emp, { basicSalary: '9007199254740991.23' })), 200)
  assert.equal((await context(emp)).current.basicSalary, '9007199254740991.23')
  assert.equal((await history(emp)).segments[0].basicSalary, '9007199254740991.23')
  const audit = await repo('EmployeeStatusHistory').findOneByOrFail({ employeeId: emp.id, fieldName: 'basicSalary' })
  assert.equal(audit.newValue, '9007199254740991.23')
})

test('approved membership and paid items prevent retrospective salary changes without touching payroll', async () => {
  for (const status of ['APPROVED', 'PAID']) {
    const emp = await employee(), run = await repo('PayrollRun').save({ period: '2026-06', startDate: '2026-06-01', endDate: '2026-06-30', status })
    if (status === 'APPROVED') await repo('PayrollRunMember').save({ runId: run.id, employeeId: emp.id, membershipStatus: 'INCLUDED' })
    else await repo('PayrollItem').save({ runId: run.id, employeeId: emp.id, basicSalary: 6000, netPay: 8600, payMethod: 'transfer' })
    const before = await snapshot(emp), savedRun = await repo('PayrollRun').findOneByOrFail({ id: run.id })
    assert.equal(expect(await patch(emp, await command(emp, { basicSalary: '7000' }, { effectivePayrollPeriod: '2026-06' })), 409).code, 'SALARY_CHANGE_CLOSED_PERIOD')
    assert.deepEqual(await snapshot(emp), before); assert.deepEqual(await repo('PayrollRun').findOneByOrFail({ id: run.id }), savedRun)
    expect(await patch(emp, await command(emp, { basicSalary: '7000' }, { effectivePayrollPeriod: '2026-07' })), 200)
  }
})

test('excluded member without a payslip does not block an otherwise open salary date', async () => {
  const emp = await employee(), run = await repo('PayrollRun').save({ period: '2026-06', startDate: '2026-06-01', endDate: '2026-06-30', status: 'APPROVED' })
  await repo('PayrollRunMember').save({ runId: run.id, employeeId: emp.id, membershipStatus: 'EXCLUDED' })
  expect(await patch(emp, await command(emp, { basicSalary: '7000' }, { effectivePayrollPeriod: '2026-06' })), 200)
})

test('settled employment blocks changing the salary of that settled service', async () => {
  const emp = await employee()
  await repo('OffboardingCase').save({ employeeId: emp.id, lastWorkingDay: '2026-07-31', status: 'SETTLED', terminationReason: 'termination' })
  const before = await snapshot(emp)
  assert.equal(expect(await patch(emp, await command(emp, { basicSalary: '7000' }, { effectivePayrollPeriod: '2026-06' })), 409).code, 'SALARY_CHANGE_CLOSED_PERIOD')
  assert.deepEqual(await snapshot(emp), before)
})

test('editing a historical payroll month preserves later monthly decisions and the correct current salary', async () => {
  const emp = await employee(), c = await context(emp)
  const monthRow = (extra) => ({ ...baseSalary, effectiveToPayrollPeriod: null, ...extra })
  expect(await request(admin, 'POST', `/payroll/employees/${emp.id}/salary-history/monthly`, { expectedRevision: 0,
    expectedCurrentSourceHash: c.currentSourceHash, reason: 'إثبات الشهور السابقة', evidenceReference: 'عقود اختبار',
    periods: [monthRow({ basicSalary: '5000.00', effectivePayrollPeriod: '2026-01', effectiveToPayrollPeriod: '2026-06' }),
      monthRow({ effectivePayrollPeriod: '2026-07' })] }), 201)
  expect(await patch(emp, await command(emp, { basicSalary: '5500.00' }, { effectivePayrollPeriod: '2026-04' })), 200)
  const h = await history(emp)
  assert.deepEqual(h.segments.map(row => [row.effectivePayrollPeriod, row.effectiveToPayrollPeriod, row.basicSalary]), [
    ['2026-01', '2026-03', '5000.00'], ['2026-04', '2026-06', '5500.00'], ['2026-07', null, '6000.00']])
  assert.deepEqual((await context(emp)).current, baseSalary)
  assert.equal(await repo('EmployeeStatusHistory').countBy({ employeeId: emp.id, changeType: 'SALARY' }), 0)
})

test('salary drift outside a documented history requires reconciliation before another profile change', async () => {
  const emp = await employee()
  expect(await patch(emp, await command(emp, { basicSalary: '7000.00' })), 200)
  await ds.query('UPDATE employees SET basicSalary=7100 WHERE id=@0', [emp.id])
  const before = await snapshot(emp)
  assert.equal(expect(await patch(emp, await command(emp, { basicSalary: '7200.00' })), 409).code, 'SALARY_CHANGE_HISTORY_SOURCE_CHANGED')
  assert.deepEqual(await snapshot(emp), before)
})

test('resending the identical current period with refreshed context makes no duplicate history or audit', async () => {
  const emp = await employee()
  expect(await patch(emp, await command(emp, { basicSalary: '7000.00' })), 200)
  const before = await snapshot(emp)
  expect(await patch(emp, await command(emp)), 200)
  assert.deepEqual(await snapshot(emp), before)
})

test('missing history schema explains the prerequisite while nonfinancial edits continue to work', async () => {
  const emp = await employee(), cmd = await command(emp, { basicSalary: '7000.00' })
  await ds.query("EXEC sp_rename 'employee_salary_history_versions', 'employee_salary_history_versions_test_hidden'")
  try {
    assert.equal(expect(await request(editor, 'GET', `/employees/${emp.id}/salary-change-context`), 409).code, 'SALARY_HISTORY_SCHEMA_MISSING')
    expect(await request(editor, 'PATCH', `/employees/${emp.id}`, { fullName: 'تعديل غير مالي دون ترحيل' }), 200)
    assert.equal(expect(await patch(emp, cmd), 409).code, 'SALARY_HISTORY_SCHEMA_MISSING')
  } finally { await ds.query("EXEC sp_rename 'employee_salary_history_versions_test_hidden', 'employee_salary_history_versions'") }
})

test('dated schedule and status changes retain existing behavior without round-tripping salary amounts', async () => {
  const emp = await employee(), c = await context(emp)
  const schedule = await repo('WorkSchedule').save({ name: 'جدول اختبار حفظ جزئي', startTime: '09:00', endTime: '18:00', isActive: true })
  expect(await request(editor, 'PATCH', `/employees/${emp.id}`, { workScheduleId: schedule.id,
    attendanceEffectiveFrom: today, attendanceChangeReason: 'قرار تغيير جدول الاختبار', status: 'probation' }), 200)
  // الإيقاف بقى مؤرخًا بمساره المستقل؛ تغيير الحالة المسموح في نفس الحفظ هو «تحت التجربة»
  const stored = await repo('Employee').findOneByOrFail({ id: emp.id })
  assert.equal(stored.workScheduleId, schedule.id); assert.equal(stored.status, 'probation'); assert.equal(stored.isActive, true)
  assert.deepEqual(await context(emp), c)
  const rules = await repo('AttendanceRuleVersion').findBy({ sourceType: 'EMPLOYEE', sourceId: emp.id })
  assert.ok(rules.length > 0)
})
