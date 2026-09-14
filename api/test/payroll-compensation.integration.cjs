// SPEC⑥ / batch1 item5: six independent salary components through real SQL + Nest HTTP.
// Every fixture lives in a disposable database. Source/review databases are never written.
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
const database = `hr_payroll_comp_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-comp-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const period = '2026-07', startDate = '2026-06-23', endDate = '2026-07-22'
const codes = ['BASIC', 'HOUSING', 'TRANSPORT', 'PHONE', 'WORK_NATURE', 'OTHER']
const keys = ['basicSalary', 'housingAllowance', 'transportAllowance', 'phoneAllowance', 'workNatureAllowance', 'otherAllowance']
const monthly = [6000, 1500, 500, 300, 200, 100]
let app, master, ds, base, admin, approver, branch, created = false, employeeNumber = 0
const repo = name => ds.getRepository(name)
const number = value => Number(value)
const cents = values => values.reduce((total, value) => total + Math.round(Number(value) * 100), 0)
const breakdown = item => JSON.parse(item.breakdown)

function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null,
    employeeId: user.employeeId ?? null, tokenVersion: user.tokenVersion ?? 0,
    permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function request(user, method, url, body) {
  const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json',
    ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
function employeeData(overrides = {}) {
  return { employeeCode: `COMP${String(++employeeNumber).padStart(3, '0')}`,
    fullName: 'موظف اختبار مكونات الأجر', branchId: branch.id, joinDate: '2020-01-01',
    ...Object.fromEntries(keys.map((key, i) => [key, monthly[i]])),
    status: 'active', payMethod: 'transfer', currency: 'EGP', ...overrides }
}
async function employee(overrides = {}) { return repo('Employee').save(employeeData(overrides)) }
function dates(from, to) {
  const result = []
  for (let at = Date.parse(`${from}T12:00:00Z`); at <= Date.parse(`${to}T12:00:00Z`); at += 86400000) {
    result.push(new Date(at).toISOString().slice(0, 10))
  }
  return result
}
async function attendance(emp, from = startDate, to = endDate, absentDates = []) {
  const rows = dates(from, to).filter(date => !absentDates.includes(date)).map(date => ({
    employeeId: emp.id, branchId: emp.branchId, date, status: 'present',
    checkIn: '08:00', checkOut: '16:00', shiftName: 'وردية مكونات الأجر', shiftStart: '08:00', shiftEnd: '16:00',
    scheduleSource: 'override', lateMinutes: 0, deductibleMinutes: 0, earlyLeaveMinutes: 0, workMinutes: 480,
  }))
  if (rows.length) await repo('AttendanceDay').save(rows)
  for (const date of absentDates) {
    await repo('ScheduleDayOverride').save({ employeeId: emp.id, date, shiftName: 'وردية مكونات الأجر', startTime: '08:00', endTime: '16:00' })
  }
}
async function calculate(employees, extra = {}, range = { startDate, endDate }) {
  const response = await request(admin, 'POST', '/payroll/runs/calculate-defined', {
    period, scopeType: 'CUSTOM', employeeIds: employees.map(emp => emp.id), name: 'اختبار مكونات الأجر — قاعدة مؤقتة', ...extra,
  })
  assert.equal(response.status, 201, JSON.stringify(response.body))
  assert.equal(response.body.startDate, range.startDate)
  assert.equal(response.body.endDate, range.endDate)
  const persisted = await request(admin, 'GET', `/payroll/runs/${response.body.id}`)
  assert.equal(persisted.status, 200)
  assert.deepEqual(persisted.body, response.body, 'HTTP GET must return the saved calculation')
  return response.body
}
function itemFor(run, emp) {
  const item = run.items.find(row => row.employeeId === emp.id)
  assert.ok(item, `Payroll item missing for ${emp.employeeCode}`)
  return item
}
function assertComponents(run, emp, expectedMonthly, expectedEarned) {
  const item = itemFor(run, emp), details = breakdown(item)
  const member = run.members.find(row => row.employeeId === emp.id)
  assert.ok(member?.snapshot)
  const saved = member.snapshot
  for (const [name, data] of [['breakdown', details], ['snapshot', saved]]) {
    assert.deepEqual(data.monthlyComponents.map(number), expectedMonthly, `${name}: monthly components`)
    assert.deepEqual(data.earnedComponents.map(number), expectedEarned, `${name}: earned components`)
    assert.equal(data.salaryComponents.length, 6, `${name}: every component has one stored line`)
    assert.deepEqual(data.salaryComponents.map(row => row.code), codes)
    assert.deepEqual(data.salaryComponents.map(row => number(row.monthlyAmount)), expectedMonthly)
    assert.deepEqual(data.salaryComponents.map(row => number(row.earnedAmount)), expectedEarned)
    for (const row of data.salaryComponents) {
      assert.match(row.nameAr, /[\u0600-\u06ff]/, `${row.code} has a stored Arabic label`)
      assert.match(row.nameEn, /[a-z]/i, `${row.code} has a stored English label`)
    }
    assert.equal(cents(data.salaryComponents.map(row => row.monthlyAmount)), Math.round(number(data.gross) * 100))
    assert.equal(cents(data.salaryComponents.map(row => row.earnedAmount)), Math.round(number(data.grossEarned) * 100))
  }
  assert.deepEqual(saved.salaryComponents, details.salaryComponents, 'Member and payslip breakdown must use the same immutable lines')
  assert.equal(number(saved.basicSalary), expectedMonthly[0], 'Member basic salary is the full monthly amount')
  assert.equal(number(item.basicSalary), expectedEarned[0], 'Item basic salary is the earned amount')
  assert.equal(Math.round(number(item.allowances) * 100), cents(expectedEarned.slice(1)))
  return details
}
function deductionsAreZero(item) {
  for (const key of ['absenceDays', 'absenceDeduction', 'lateMinutes', 'latenessDeduction', 'unpaidLeaveDays', 'unpaidLeaveDeduction']) {
    assert.equal(number(item[key]), 0, key)
  }
}
// قاعدة المالك: تغيير الراتب يسري من راتب شهر كامل. الافتراضي شهر مسير هذه المجموعة حتى تقرأه إعادة الحساب؛
// التعديل بعد اعتماد المسير يسري من شهر المسير الجاري فلا يمس الشهر المعتمد.
const currentPayrollMonth = require('../src/payroll/payroll-period').payrollPeriodOfDate(require('../src/attendance/attendance.service').localDateOf(new Date()), 23)
async function patchEmployee(emp, change, effectivePayrollPeriod = period) {
  const metadata = await request(admin, 'GET', `/employees/${emp.id}/salary-change-context`)
  assert.equal(metadata.status, 200, JSON.stringify(metadata.body))
  const c = metadata.body, fields = { ...change }, salary = { ...c.current }
  for (const key of [...keys, 'currency']) if (Object.hasOwn(fields, key)) {
    salary[key] = String(fields[key]); delete fields[key]
  }
  const response = await request(admin, 'PATCH', `/employees/${emp.id}`, { ...fields, salaryChange: {
    expectedRevision: c.historyRevision, expectedCurrentSourceHash: c.currentSourceHash, effectivePayrollPeriod,
    reason: 'تعديل مكونات الأجر بعد فترة الاختبار', evidenceReference: 'اختبار مكونات الأجر', salary,
  } })
  assert.equal(response.status, 200, JSON.stringify(response.body))
  return repo('Employee').findOneByOrFail({ id: emp.id })
}

// الخطوة 18 (B3): الاعتماد يتطلب إقرارًا بتقرير «موظفون بلا مسير» لنسخة الحساب الحالية بنطاق المعتمد.
async function acknowledgeUnassigned(user, runId) {
  const report = await request(user, 'GET', `/payroll/runs/${runId}/unassigned`)
  assert.equal(report.status, 200, JSON.stringify(report.body))
  const ack = await request(user, 'POST', `/payroll/runs/${runId}/unassigned-ack`, { reportHash: report.body.reportHash })
  assert.equal(ack.status, 201, JSON.stringify(ack.body))
}
before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, /^hr_payroll_comp_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  // Connect to master first: an unavailable SQL Server cannot create or touch any fixture data.
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433),
    user: env.DB_USERNAME, password: env.DB_PASSWORD, database: 'master',
    options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  assert.equal((await master.request().query('SELECT 1 AS ready')).recordset[0].ready, 1)
  await master.request().query(`CREATE DATABASE [${database}]`)
  created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assert.equal(ds.options.database, database)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  branch = await repo('Branch').save({ name: 'Compensation fixture branch', code: 'COMPENSATION' })
  const makeAdmin = email => repo('User').save({ email, displayName: 'Compensation fixture admin', passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  admin = await makeAdmin('admin@payroll-compensation.invalid')
  approver = await makeAdmin('approver@payroll-compensation.invalid')
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '23' }, { key: 'payroll.monthly_days', value: '30' },
    // هذه المجموعة تختبر مكونات راتب الملف؛ اختيار راتب الشهر من السجل مغطى في payroll-run-salary-period.integration.cjs.
    { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' },
    { key: 'payroll.daily_hours', value: '8' }, { key: 'payroll.late_deduction_enabled', value: 'true' },
    { key: 'attendance.absence_penalty_days', value: '1' }, { key: 'attendance.weekend_days', value: 'FRI,SAT' },
  ])
}, { timeout: 60000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_payroll_comp_test_[a-f0-9]{16}$/)
      assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0, 'Disposable database removal must be verified')
      t.diagnostic(`Cleanup verified: ${database} no longer exists in sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir()))
    assert.match(path.basename(uploads), /^hr-payroll-comp-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
    assert.equal(fs.existsSync(uploads), false, 'Disposable uploads removal must be verified')
    t.diagnostic('Cleanup verified: the temporary uploads directory was removed.')
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Compensation fixture cleanup failed')
})

test('SPEC⑥: all six independent components appear once in the full salary, SQL snapshot and HTTP payslip', async t => {
  const emp = await employee()
  await attendance(emp)
  const run = await calculate([emp]), item = itemFor(run, emp)
  const details = assertComponents(run, emp, monthly, monthly)
  assert.equal(number(item.basicSalary), 6000)
  assert.equal(number(item.allowances), 2600)
  assert.equal(number(item.netPay), 8600)
  assert.equal(number(run.totalNet), 8600)
  assert.equal(details.gross, 8600); assert.equal(details.grossEarned, 8600)
  assert.equal(details.coverDays, 30); assert.equal(details.prorataFactor, 1)
  deductionsAreZero(item)
  const stored = await repo('PayrollRunMember').findOneByOrFail({ runId: run.id, employeeId: emp.id })
  assert.deepEqual(stored.snapshot.salaryComponents, details.salaryComponents)
  const slip = await request(admin, 'GET', `/payroll/items/${item.id}`)
  assert.equal(slip.status, 200, JSON.stringify(slip.body))
  assert.deepEqual(breakdown(slip.body.item).salaryComponents, details.salaryComponents)
  t.diagnostic('Manual: 6000 + 1500 + 500 + 300 + 200 + 100 = 8600; the five allowances total 2600.')
})

test('SPEC⑥ F1: HTTP employee creation accepts phone and work nature without manufacturing otherAllowance', async () => {
  // الخطوة 13: الإنشاء يوثّق أجر التعيين «يسري من راتب شهر»؛ تاريخ التعيين قديم (2020) فالافتراض الشهر الجاري،
  // ومسير هذا الاختبار لشهر سابق فيُختار شهره صراحةً (من له سجل شهري لا يرجع لراتب الملف).
  const input = { ...employeeData(), salaryEffectivePayrollPeriod: period }
  delete input.otherAllowance
  const createdEmployee = await request(admin, 'POST', '/employees', input)
  assert.equal(createdEmployee.status, 201, JSON.stringify(createdEmployee.body))
  const emp = await repo('Employee').findOneByOrFail({ id: createdEmployee.body.id })
  assert.equal(number(emp.phoneAllowance), 300); assert.equal(number(emp.workNatureAllowance), 200)
  assert.equal(number(emp.otherAllowance ?? 0), 0, 'Independent OTHER must not be synthesized from PHONE + WORK_NATURE')
  await attendance(emp)
  const run = await calculate([emp])
  assertComponents(run, emp, [6000, 1500, 500, 300, 200, 0], [6000, 1500, 500, 300, 200, 0])
  assert.equal(number(itemFor(run, emp).netPay), 8500)
})

test('SPEC⑥ F2/F3: HTTP phone-only updates and zeroing both split allowances preserve independent OTHER', async () => {
  const emp = await employee()
  await attendance(emp)
  let run = await calculate([emp])
  for (const [change, expected] of [
    [{ phoneAllowance: 450 }, [6000, 1500, 500, 450, 200, 100]],
    [{ phoneAllowance: 0 }, [6000, 1500, 500, 0, 200, 100]],
    [{ workNatureAllowance: 0 }, [6000, 1500, 500, 0, 0, 100]],
  ]) {
    const updated = await patchEmployee(emp, change)
    assert.deepEqual(keys.map(key => number(updated[key])), expected)
    assert.equal(number(updated.otherAllowance), 100, 'A split-allowance edit must not overwrite the independent other allowance')
    assert.deepEqual((await request(admin, 'GET', `/payroll/runs/${run.id}`)).body, run, 'Changing an employee must not silently recalculate payroll')
    run = await calculate([emp], { runId: run.id, reason: 'مراجعة تعديل بدل مستقل عبر API' })
    assertComponents(run, emp, expected, expected)
    assert.equal(number(itemFor(run, emp).netPay), cents(expected) / 100)
  }
  assert.equal(number(itemFor(run, emp).netPay), 8100, 'Zero phone and work nature leave only the genuine 100 OTHER')
})

test('SPEC⑥: OTHER equal to PHONE plus WORK_NATURE is still independent money and is not deduplicated', async () => {
  const emp = await employee({ phoneAllowance: 300, workNatureAllowance: 500, otherAllowance: 800 })
  await attendance(emp)
  const initial = await calculate([emp])
  assertComponents(initial, emp, [6000, 1500, 500, 300, 500, 800], [6000, 1500, 500, 300, 500, 800])
  assert.equal(number(itemFor(initial, emp).allowances), 3600)
  assert.equal(number(itemFor(initial, emp).netPay), 9600, '300 PHONE + 500 WORK_NATURE + 800 OTHER = 1600, without max() or deduplication')
  const updated = await patchEmployee(emp, { phoneAllowance: 0 })
  assert.equal(number(updated.otherAllowance), 800); assert.equal(number(updated.workNatureAllowance), 500)
  const recalculated = await calculate([emp], { runId: initial.id, reason: 'إلغاء الهاتف مع إبقاء البدلات الأخرى المستقلة' })
  assertComponents(recalculated, emp, [6000, 1500, 500, 0, 500, 800], [6000, 1500, 500, 0, 500, 800])
  assert.equal(number(itemFor(recalculated, emp).netPay), 9300)
})

test('SPEC⑥ / PR-06: swapping PHONE and OTHER with the same gross is captured as a changed employee in recalculation audit', async () => {
  const emp = await employee()
  await attendance(emp)
  const initial = await calculate([emp])
  await patchEmployee(emp, { phoneAllowance: 100, otherAllowance: 300 })
  const recalculated = await calculate([emp], { runId: initial.id, reason: 'نقل القيمة بين بدلين مستقلين دون تغيير الإجمالي' })
  assert.equal(number(itemFor(initial, emp).netPay), 8600)
  assert.equal(number(itemFor(recalculated, emp).netPay), 8600)
  assert.equal(recalculated.snapshotVersion, initial.snapshotVersion + 1)
  assertComponents(recalculated, emp, [6000, 1500, 500, 100, 200, 300], [6000, 1500, 500, 100, 200, 300])
  const events = await request(admin, 'GET', `/payroll/runs/${initial.id}/events`)
  assert.equal(events.status, 200, JSON.stringify(events.body))
  const changed = events.body.find(event => event.eventType === 'RECALCULATED')
  assert.ok(changed)
  assert.deepEqual(changed.payload.diff.changedEmployeeIds, [emp.id])
  const before = changed.payload.before.members.find(member => member.employeeId === emp.id).snapshot.salaryComponents
  const after = changed.payload.after.members.find(member => member.employeeId === emp.id).snapshot.salaryComponents
  assert.deepEqual(before.map(row => number(row.monthlyAmount)), monthly)
  assert.deepEqual(after.map(row => number(row.monthlyAmount)), [6000, 1500, 500, 100, 200, 300])
  assert.equal(number(changed.payload.before.totalNet), number(changed.payload.after.totalNet))
})

test('SPEC⑥ / PR-10: joining July 1 prorates all six components by 22/30 while monthly day/hour rates stay whole', async t => {
  const emp = await employee({ joinDate: '2026-07-01' })
  await attendance(emp, '2026-07-01', endDate)
  const run = await calculate([emp]), item = itemFor(run, emp)
  const details = assertComponents(run, emp, monthly, [4400, 1100, 366.67, 220, 146.67, 73.33])
  assert.equal(details.coverFrom, '2026-07-01'); assert.equal(details.coverTo, endDate); assert.equal(details.coverDays, 22)
  assert.equal(details.monthlyDays, 30); assert.equal(details.prorataFactor, 0.733333)
  assert.equal(details.dayRate, 286.67); assert.equal(details.hourRate, 35.83)
  assert.equal(details.gross, 8600); assert.equal(details.grossEarned, 6306.67)
  assert.equal(number(item.netPay), 6306.67)
  deductionsAreZero(item)
  t.diagnostic('Manual: 8600 × 22 / 30 = 6306.67; daily basis remains 8600 / 30 = 286.666… and hourly basis 35.833….')
})

test('SPEC⑥: partial salary still uses all six full-month components for one absence, 48 late minutes and one overtime hour', async t => {
  const emp = await employee({ joinDate: '2026-07-01' })
  await attendance(emp, '2026-07-01', endDate, ['2026-07-08'])
  await repo('AttendanceDay').update({ employeeId: emp.id, date: '2026-07-09' }, { lateMinutes: 48 })
  const ot = await repo('OvertimeEntry').save({ employeeId: emp.id, date: '2026-07-10', source: 'PRE_REQUESTED',
    hoursRequested: 1, payableHours: 1, rate: 1.5, status: 'APPROVED' })
  const run = await calculate([emp]), item = itemFor(run, emp), details = breakdown(item)
  assert.equal(details.grossEarned, 6306.67); assert.equal(details.dayRate, 286.67)
  assert.equal(number(item.absenceDays), 1); assert.equal(number(item.absenceDeduction), 286.67)
  assert.equal(number(item.lateMinutes), 48); assert.equal(number(item.latenessDeduction), 28.67)
  assert.equal(number(item.overtimeHours), 1); assert.equal(number(item.overtimeAmount), 53.75)
  assert.equal(number(item.netPay), 6045.08)
  assert.deepEqual(details.absentDates, ['2026-07-08']); assert.deepEqual(details.overtimeEntryIds, [ot.id])
  assert.equal((await repo('OvertimeEntry').findOneByOrFail({ id: ot.id })).status, 'APPROVED')
  t.diagnostic('Manual: 6306.67 − 286.67 − 28.67 + 53.75 = 6045.08. Rates use 8600, not the partial gross.')
})

test('SPEC⑥ / PR-10: eighteen days in a 31-day cycle use /30; complete 31- and 28-day cycles earn every full component', async t => {
  const partial = await employee({ joinDate: '2026-08-05' }), full31 = await employee()
  await attendance(partial, '2026-08-05', '2026-08-22')
  await attendance(full31, '2026-07-23', '2026-08-22')
  const longRun = await calculate([partial, full31], { period: '2026-08' }, { startDate: '2026-07-23', endDate: '2026-08-22' })
  assertComponents(longRun, partial, monthly, [3600, 900, 300, 180, 120, 60])
  assertComponents(longRun, full31, monthly, monthly)
  assert.equal(breakdown(itemFor(longRun, partial)).coverDays, 18)
  assert.equal(number(itemFor(longRun, partial).netPay), 5160)
  assert.equal(number(itemFor(longRun, full31).netPay), 8600)
  assert.equal(number(longRun.totalNet), 13760)
  const config = await repo('RequestsConfig').findOneByOrFail({ key: 'payroll.cycle_start_day' })
  try {
    await repo('RequestsConfig').update({ key: config.key }, { value: '1' })
    const full28 = await employee()
    await attendance(full28, '2026-02-01', '2026-02-28')
    const shortRun = await calculate([full28], { period: '2026-02' }, { startDate: '2026-02-01', endDate: '2026-02-28' })
    assertComponents(shortRun, full28, monthly, monthly)
    assert.equal(breakdown(itemFor(shortRun, full28)).coverDays, 28)
    assert.equal(breakdown(itemFor(shortRun, full28)).prorataFactor, 1)
    assert.equal(number(itemFor(shortRun, full28).netPay), 8600)
  } finally { await repo('RequestsConfig').save(config) }
  t.diagnostic('Manual: 8600 × 18/30 = 5160, even in a 31-day cycle; a complete 31-day or 28-day cycle pays 8600.')
})

test('SPEC⑥ / PR-10: six half-cent components reconcile to gross without a duplicate or lost rounding adjustment', async () => {
  const emp = await employee({ joinDate: '2026-07-20', ...Object.fromEntries(keys.map(key => [key, 10.15])) })
  await attendance(emp, '2026-07-20', endDate)
  const run = await calculate([emp]), item = itemFor(run, emp), details = breakdown(item)
  assert.equal(details.gross, 60.9); assert.equal(details.grossEarned, 6.09)
  assert.equal(number(item.netPay), 6.09)
  assert.equal(cents(details.earnedComponents), 609)
  assert.equal(cents([item.basicSalary, item.allowances]), 609)
  assert.ok(details.earnedComponents.every(value => number(value) >= 0))
  assertComponents(run, emp, [10.15, 10.15, 10.15, 10.15, 10.15, 10.15], details.earnedComponents.map(number))
  assert.equal(cents(details.salaryComponents.map(row => row.earnedAmount)), 609)
  assert.equal(number(run.totalNet), 6.09)
})

test('SPEC⑥: approved member snapshot and employee payslip keep original component values after later salary edits', async () => {
  const emp = await employee()
  await attendance(emp)
  const owner = await repo('User').save({ email: `owner-${emp.id}@payroll-compensation.invalid`, displayName: 'Fixture employee',
    passwordHash: 'test-only', role: 'employee', branchId: branch.id, employeeId: emp.id, permissions: '[]' })
  const run = await calculate([emp]), item = itemFor(run, emp)
  await acknowledgeUnassigned(approver, run.id)
  const approved = await request(approver, 'POST', `/payroll/runs/${run.id}/approve`)
  assert.equal(approved.status, 201, JSON.stringify(approved.body))
  const beforeRun = await request(admin, 'GET', `/payroll/runs/${run.id}`)
  const beforeSlip = await request(owner, 'GET', `/payroll/items/${item.id}`)
  assert.equal(beforeSlip.status, 200, JSON.stringify(beforeSlip.body))
  const beforeMember = await repo('PayrollRunMember').findOneByOrFail({ runId: run.id, employeeId: emp.id })
  const beforeItem = await repo('PayrollItem').findOneByOrFail({ id: item.id })
  await patchEmployee(emp, { fullName: 'اسم الموظف بعد اعتماد المسير', phoneAllowance: 999, workNatureAllowance: 888, otherAllowance: 777 }, currentPayrollMonth)
  assert.deepEqual((await request(admin, 'GET', `/payroll/runs/${run.id}`)).body, beforeRun.body)
  const afterSlip = await request(owner, 'GET', `/payroll/items/${item.id}`)
  assert.equal(afterSlip.status, 200); assert.deepEqual(afterSlip.body, beforeSlip.body)
  assert.equal(afterSlip.body.identitySource, 'SNAPSHOT')
  assert.deepEqual(breakdown(afterSlip.body.item).salaryComponents.map(row => number(row.monthlyAmount)), monthly)
  assert.deepEqual(await repo('PayrollRunMember').findOneByOrFail({ id: beforeMember.id }), beforeMember)
  assert.deepEqual(await repo('PayrollItem').findOneByOrFail({ id: item.id }), beforeItem)
  const mine = await request(owner, 'GET', '/payroll/my-payslips')
  assert.equal(mine.status, 200)
  assert.deepEqual(breakdown(mine.body.find(row => row.item.id === item.id).item).salaryComponents, breakdown(item).salaryComponents)
})

test('SPEC⑥: null PHONE/WORK_NATURE plus genuine OTHER remain six explicit lines without guessing or rewriting legacy values', async () => {
  const emp = await employee({ phoneAllowance: null, workNatureAllowance: null })
  await attendance(emp)
  const beforeEmployee = await repo('Employee').findOneByOrFail({ id: emp.id })
  const run = await calculate([emp])
  assertComponents(run, emp, [6000, 1500, 500, 0, 0, 100], [6000, 1500, 500, 0, 0, 100])
  assert.equal(number(itemFor(run, emp).netPay), 8100)
  assert.deepEqual(await repo('Employee').findOneByOrFail({ id: emp.id }), beforeEmployee)
})

test('SPEC⑥: HTTP settlement preview and saved EOS agree with the payroll gross for all six independent components', async t => {
  const emp = await employee({ joinDate: '2024-07-23', annualLeaveEntitled: false })
  await attendance(emp)
  const run = await calculate([emp]), item = itemFor(run, emp)
  const linesBeforePreview = await repo('SettlementLine').count()
  const preview = await request(admin, 'GET', `/offboarding/preview?employeeId=${emp.id}&reason=termination&lastWorkingDay=${endDate}`)
  assert.equal(preview.status, 200, JSON.stringify(preview.body))
  assert.equal(preview.body.serviceYears, 2)
  assert.equal(preview.body.eos.fullMonths, 1)
  assert.equal(preview.body.eos.factor, 1)
  assert.equal(preview.body.lines.length, 1, JSON.stringify(preview.body.lines))
  assert.equal(number(preview.body.lines[0].amount), 8600)
  assert.equal(number(preview.body.lines[0].amount), breakdown(item).gross)
  assert.equal(await repo('SettlementLine').count(), linesBeforePreview, 'HTTP preview must not create settlement lines')
  const kase = await repo('OffboardingCase').save({ employeeId: emp.id, lastWorkingDay: endDate, status: 'IN_SETTLEMENT', terminationReason: 'termination' })
  const recalc = await request(admin, 'POST', `/offboarding/${kase.id}/recalc-lines`)
  assert.equal(recalc.status, 201, JSON.stringify(recalc.body))
  const lines = await repo('SettlementLine').findBy({ caseId: kase.id })
  assert.equal(lines.length, 1, JSON.stringify(lines)); assert.equal(number(lines[0].amount), 8600)
  assert.equal(lines[0].type, 'CREDIT'); assert.equal(lines[0].isAuto, true)
  t.diagnostic('Manual EOS agreement: 2024-07-23 → 2026-07-22 = 2 years; 2 × 0.5 × full gross 8600 = 8600.')
})

test('SPEC⑥: invalid negative PHONE or WORK_NATURE is rejected over HTTP without changing stored compensation or payroll', async () => {
  const emp = await employee()
  await attendance(emp)
  const run = await calculate([emp])
  const beforeEmployee = await repo('Employee').findOneByOrFail({ id: emp.id })
  for (const field of ['phoneAllowance', 'workNatureAllowance']) {
    const rejected = await request(admin, 'PATCH', `/employees/${emp.id}`, { [field]: -1 })
    assert.equal(rejected.status, 400, JSON.stringify(rejected.body))
    assert.deepEqual(await repo('Employee').findOneByOrFail({ id: emp.id }), beforeEmployee)
    assert.deepEqual((await request(admin, 'GET', `/payroll/runs/${run.id}`)).body, run)
  }
})
