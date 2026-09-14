// SQL وHTTP حقيقيان داخل قاعدة عشوائية مستقلة، بلا اتصال بقاعدة المصدر أو المراجعة.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql'), env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_month_salary_test_${crypto.randomBytes(8).toString('hex')}`, uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-month-salary-files-'))
const secret = crypto.randomBytes(48).toString('hex'), jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const { selectPayrollPeriodSalary: select, PAYROLL_MONTHLY_SALARY_HISTORY_VERSION: contractVersion } = require('../src/payroll/payroll-period-salary')
const { readSalaryHistory: read, readSalaryHistoryCurrent: readCurrent } = require('../src/payroll/payroll-salary-history')
const money = { basicSalary: '10000.00', housingAllowance: '1000.00', transportAllowance: '200.00', phoneAllowance: '30.00', workNatureAllowance: '40.00', otherAllowance: '50.00' }
const keys = Object.keys(money), period = (patch = {}) => ({ ...money, currency: 'EGP', effectivePayrollPeriod: '2026-09', effectiveToPayrollPeriod: null, ...patch })
let app, ds, master, base, created = false, sequence = 0, branchA, branchB, admin, editor, outsider, viewer
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
const expect = (r, status) => { assert.equal(r.status, status, JSON.stringify(r.body)); return r.body }
async function request(user, method, route, body) {
  const token = user && jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null,
    employeeId: null, tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  return { status: response.status, body: await response.json() }
}
const route = emp => `/payroll/employees/${emp.id}/salary-history`
const detail = async (emp, user = editor) => expect(await request(user, 'GET', route(emp)), 200)
async function employee(extra = {}) { return repo('Employee').save({ employeeCode: `MTH${++sequence}`, fullName: 'موظف اختبار الراتب الشهري', branchId: branchA.id,
  status: 'active', joinDate: '2020-01-01', ...money, basicSalary: '8000.00', currency: 'EGP', ...extra }) }
async function command(emp, periods = [period()], extra = {}) {
  const h = await detail(emp)
  return { expectedRevision: h.revision, expectedCurrentSourceHash: h.currentSourceHash, reason: 'قرار راتب شهر سبتمبر', evidenceReference: 'document:monthly:1', periods, ...extra }
}
const submit = (emp, body, user = editor) => request(user, 'POST', route(emp) + '/monthly', body)
async function snapshot(emp) {
  const result = {}
  for (const table of ['employees', 'employee_salary_history_versions', 'employee_status_history']) {
    result[table] = (await ds.query(`SELECT (SELECT * FROM [${table}] WHERE [${table === 'employees' ? 'id' : 'employeeId'}]=@0 ORDER BY id FOR JSON PATH, INCLUDE_NULL_VALUES) AS data`, [emp.id]))[0].data
  }
  result.rows = (await ds.query('SELECT (SELECT * FROM employee_salary_history WHERE versionId IN (SELECT id FROM employee_salary_history_versions WHERE employeeId=@0) ORDER BY id FOR JSON PATH, INCLUDE_NULL_VALUES) AS data', [emp.id]))[0].data
  return result
}
before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql'); assert.match(database, /^hr_month_salary_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: false, abortOnError: false })
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => {}
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => {}
  ds = app.get(require('../node_modules/typeorm').DataSource); assert.equal(ds.options.database, database)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  branchA = await repo('Branch').save({ name: 'Monthly fixture A', code: 'MTHA' }); branchB = await repo('Branch').save({ name: 'Monthly fixture B', code: 'MTHB' })
  const user = (name, role, branchId, permissions) => repo('User').save({ email: `${name}@monthly-salary.invalid`, displayName: name, passwordHash: 'test-only', role, branchId, permissions: JSON.stringify(permissions) })
  admin = await user('admin', 'super_admin', null, ['*']); editor = await user('editor', 'hr', branchA.id, ['payroll.view', 'payroll.approve'])
  outsider = await user('other', 'hr', branchB.id, ['payroll.view', 'payroll.approve']); viewer = await user('viewer', 'hr', branchA.id, ['payroll.view'])
  await repo('RequestsConfig').save({ key: 'payroll.cycle_start_day', value: '23' })
}, { timeout: 60000 })
after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (e) { errors.push(e) }
  try {
    if (created && master) {
      assert.match(database, /^hr_month_salary_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('db', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name=@db')).recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} removed.`)
    }
  } catch (e) { errors.push(e) }
  try { if (master) await master.close() } catch (e) { errors.push(e) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir())); assert.match(path.basename(uploads), /^hr-month-salary-files-/)
    fs.rmSync(uploads, { recursive: true, force: true }); assert.equal(fs.existsSync(uploads), false)
  } catch (e) { errors.push(e) }
  if (errors.length) throw new AggregateError(errors, 'Monthly salary fixture cleanup failed')
})

test('HTTP يثبت شهر سبتمبر ودورته وفاعله دون تعديل الموظف أو الرواتب أو التدقيق المالي', async () => {
  const emp = await employee(), before = await snapshot(emp), result = expect(await submit(emp, await command(emp)), 201)
  assert.equal(result.version.contractVersion, contractVersion); assert.equal(result.version.cycleStartDay, 23); assert.equal(result.version.createdBy, editor.id)
  assert.equal(result.segments[0].effectiveFrom, '2026-08-23'); assert.equal(result.current.basicSalary, '8000.00')
  assert.equal(result.compatibilityDatesDerived, true); assert.equal(result.payrollChanged, false); assert.equal(result.retroAdjustmentsCreated, false)
  const after = await snapshot(emp); assert.equal(after.employees, before.employees); assert.equal(after.employee_status_history, before.employee_status_history)
  for (const entity of ['PayrollRun', 'PayrollItem', 'EmployeeObligation']) assert.equal(await repo(entity).count(), 0)
  assert.equal(select(await detail(emp), '2026-09').segment.basicSalary, '10000.00')
})
test('القراءة والحفظ يفرضان الصلاحية ونطاق الفرع حتى لحامل إذن الاعتماد', async () => {
  const emp = await employee(), body = await command(emp), before = await snapshot(emp)
  expect(await submit(emp, body, outsider), 403); expect(await submit(emp, body, viewer), 403); expect(await submit(emp, body, null), 401)
  expect(await request(outsider, 'GET', route(emp)), 403)
  assert.deepEqual(await snapshot(emp), before)
  const otherBranch = await employee({ branchId: branchB.id }), c = await detail(otherBranch, admin)
  expect(await submit(otherBranch, { ...body, expectedRevision: c.revision, expectedCurrentSourceHash: c.currentSourceHash }, admin), 201)
})
test('المراجعة والبصمة تمنعان الحفظ المتقادم والتنافس لا ينشئ مراجعتين', async () => {
  const emp = await employee(), body = await command(emp)
  const responses = await Promise.all([submit(emp, body), submit(emp, body)])
  assert.deepEqual(responses.map(r => r.status).sort(), [201, 409]); assert.equal((await detail(emp)).revision, 1)
  const stale = await command(emp)
  await ds.query('UPDATE employees SET housingAllowance=1100 WHERE id=@0', [emp.id])
  assert.equal(expect(await submit(emp, stale), 409).code, 'SALARY_HISTORY_CURRENT_SOURCE_CHANGED')
  assert.equal((await detail(emp)).revision, 1)
})
test('SQL يحتفظ بكل أرقامDECIMAL ويثبت أكتوبر دون تسريب راتبه إلى سبتمبر', async () => {
  const emp = await employee(), result = expect(await submit(emp, await command(emp, [period({ effectiveToPayrollPeriod: '2026-09', phoneAllowance: '9007199254740991.23' }),
    period({ effectivePayrollPeriod: '2026-10', basicSalary: '9999999999999999.99' })])), 201)
  const h = await ds.transaction('SERIALIZABLE', em => read(em, emp.id))
  assert.equal(select(h, '2026-09').segment.basicSalary, '10000.00'); assert.equal(select(h, '2026-09').segment.phoneAllowance, '9007199254740991.23')
  assert.equal(select(h, '2026-10').segment.basicSalary, '9999999999999999.99'); assert.equal(h.version.contentHash, result.version.contentHash)
})
test('تغيير إعداد الدورة لاحقًا لا يعيد تفسير المراجعة أو الشهر المثبت', async () => {
  const emp = await employee(), saved = expect(await submit(emp, await command(emp)), 201)
  try {
    await repo('RequestsConfig').save({ key: 'payroll.cycle_start_day', value: '1' })
    const h = await detail(emp); assert.equal(h.version.cycleStartDay, 23); assert.equal(h.version.contentHash, saved.version.contentHash)
    assert.equal(select(h, '2026-09').segment.effectiveFrom, '2026-08-23')
  } finally { await repo('RequestsConfig').save({ key: 'payroll.cycle_start_day', value: '23' }) }
})
test('الحدود والحقول المحقونة والدورة الغائبة ترفض بلا أي حفظ', async () => {
  const emp = await employee(), base = await command(emp), before = await snapshot(emp)
  for (const periods of [[period({ effectiveFrom: '2026-09-01' })], [period({ basicSalary: '1.001' })], [period({ effectivePayrollPeriod: '2026-13' })],
    [period({ effectiveToPayrollPeriod: '2026-08' })], [period(), period({ effectivePayrollPeriod: '2026-10' })]]) expect(await submit(emp, { ...base, periods }), 400)
  expect(await submit(emp, { ...base, cycleStartDay: 1 }), 400)
  try { await repo('RequestsConfig').delete({ key: 'payroll.cycle_start_day' }); assert.equal(expect(await submit(emp, base), 409).code, 'SALARY_PAYROLL_CYCLE_INVALID') }
  finally { await repo('RequestsConfig').save({ key: 'payroll.cycle_start_day', value: '23' }) }
  assert.deepEqual(await snapshot(emp), before)
})
test('فشل حفظ الصفوف يعيد رأس المراجعة أيضًا ولا يترك دليلًا جزئيًا', async () => {
  const emp = await employee(), body = await command(emp), before = await snapshot(emp)
  await ds.query("CREATE TRIGGER monthly_salary_test_failure ON dbo.employee_salary_history AFTER INSERT AS BEGIN THROW 50001, 'monthly fixture rollback', 1; END")
  try { expect(await submit(emp, body), 500) } finally { await ds.query('DROP TRIGGER dbo.monthly_salary_test_failure') }
  assert.deepEqual(await snapshot(emp), before)
})
test('التحويل الشهري الصريح يحفظ المراجعة اليومية القديمة ويرفض التخفيض الصامت إلىV1', async () => {
  const emp = await employee(), c = await detail(emp), legacy = { ...money, currency: 'EGP', effectiveFrom: '2026-01-01', effectiveTo: null }
  const old = expect(await request(editor, 'POST', route(emp), { expectedRevision: c.revision, expectedCurrentSourceHash: c.currentSourceHash,
    reason: 'دليل يومي قديم', evidenceReference: 'old:document', segments: [legacy] }), 201)
  const oldRows = await ds.query('SELECT * FROM employee_salary_history WHERE versionId=@0', [old.version.id])
  const newer = expect(await submit(emp, await command(emp)), 201)
  assert.equal(newer.revision, 2); assert.deepEqual(await ds.query('SELECT * FROM employee_salary_history WHERE versionId=@0', [old.version.id]), oldRows)
  assert.equal((await ds.query('SELECT contentHash FROM employee_salary_history_versions WHERE id=@0', [old.version.id]))[0].contentHash, old.version.contentHash)
  const before = await snapshot(emp)
  const bad = await request(editor, 'POST', route(emp), { expectedRevision: newer.revision, expectedCurrentSourceHash: newer.currentSourceHash,
    reason: 'محاولة يومية', evidenceReference: 'wrong:contract', segments: [legacy] })
  assert.equal(expect(bad, 409).code, 'SALARY_HISTORY_MONTHLY_REQUIRED'); assert.deepEqual(await snapshot(emp), before)
})
test('قارئ التعويضات يستخدم شهر سبتمبر كاملًا من دليلHTTP ولا يخلطه بزيادة أكتوبر', async () => {
  const emp = await employee()
  expect(await submit(emp, await command(emp, [period({ effectiveToPayrollPeriod: '2026-09' }), period({ effectivePayrollPeriod: '2026-10', basicSalary: '15000.00' })])), 201)
  const result = await ds.transaction('SERIALIZABLE', async em => {
    const current = await readCurrent(em, emp.id)
    return require('../src/payroll/payroll-live-compensation-provider').readPayrollLiveCompensation(em, emp.id, '2026-08-23', '2026-09-22',
      { state: 'AVAILABLE', data: { coverage: { from: '2026-08-23', to: '2026-09-22', days: 31 } }, issues: [], sourceRefs: ['coverage:fixture'] },
      { state: 'AVAILABLE', data: { current: Object.fromEntries(keys.map(key => [key, current.current[key]])), currency: current.current.currency }, issues: [], sourceRefs: [`employee:${emp.id}`] }, 'EGP')
  })
  assert.equal(result.state, 'AVAILABLE', JSON.stringify(result))
  assert.equal(result.data.selectedSalary.salary.basicSalary, '10000.00')
  assert.equal(result.data.referencePeriod, '2026-09')
  assert.equal(result.data.datedSegments.length, 1); assert.equal(result.data.datedSegments[0].from, '2026-08-23'); assert.equal(result.data.datedSegments[0].to, '2026-09-22')
})
test('بصمةV2 تكشف تغيير الفاعل أو توقيت الإثبات المخزن دون إعادة اعتماد', async () => {
  const emp = await employee(), saved = expect(await submit(emp, await command(emp)), 201)
  const assertCorrupt = async () => assert.equal(expect(await request(editor, 'GET', route(emp)), 409).code, 'SALARY_HISTORY_INVALID')
  try {
    await ds.query('UPDATE employee_salary_history_versions SET createdBy=@0 WHERE id=@1', [admin.id, saved.version.id])
    await assertCorrupt()
    await ds.query('UPDATE employee_salary_history_versions SET createdBy=@0,createdAt=DATEADD(second,1,createdAt) WHERE id=@1', [saved.version.createdBy, saved.version.id])
    await assertCorrupt()
    await ds.query('UPDATE employee_salary_history_versions SET createdAt=DATEADD(nanosecond,100,CAST(@0 AS datetime2)) WHERE id=@1', [saved.version.createdAt, saved.version.id])
    await assertCorrupt()
  } finally {
    await ds.query('UPDATE employee_salary_history_versions SET createdBy=@0,createdAt=CAST(@1 AS datetime2) WHERE id=@2', [saved.version.createdBy, saved.version.createdAt, saved.version.id])
  }
  assert.equal((await detail(emp)).version.contentHash, saved.version.contentHash)
})
