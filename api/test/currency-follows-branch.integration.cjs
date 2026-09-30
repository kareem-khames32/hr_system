'use strict'
// العملة تبع الفرع (قرار المالك 30 سبتمبر): «لو الفرع مصري يبقى كله مصري، ولو سعودي يبقى كله سعودي، وده من الإعدادات». على قاعدة SQL
// مؤقتة عشوائية (synchronize) عبر HTTP بتوكنات موقّعة محليًا: سياق العملة لأي مستخدم داخل (موظف، موارد بشرية على فرعين، حساب كل
// الفروع) من غير أسماء ولا فروع برّه النطاق؛ عملة الموظف من فرعه في الإضافة، والتعديل العادي مابيعيدش كتابتها، والنقل لفرع عملته
// مختلفة (من الملف أو بطلب نقل منفّذ) بيغيّرها، وتغيير الأجر بيتسجل بعملة الفرع؛ تأمينات دولة الفرع بس؛ وعملة معادلات الرواتب من
// فرعها أو عملة النظام. العملة تسمية بس: المبالغ نفسها ماتتحولش أبدًا.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const ExcelJS = require('../node_modules/exceljs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const { employeeRequiredFields } = require('./helpers/employee-fixture.cjs')
const database = `hr_currency_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_currency_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-currency-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const today = require('../src/attendance/attendance.service').localDateOf(new Date())
const dateAfter = (date, days) => new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10)
const baseline = dateAfter(today, -3)
const MONEY = ['basicSalary', 'housingAllowance', 'transportAllowance', 'phoneAllowance', 'workNatureAllowance', 'otherAllowance', 'workPressureAllowance']
let app, ds, master, base, created = false, sequence = 0
const B = {}, D = {}, T = {}, U = {}
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }

function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]'),
    ...(user.scopeAllBranches ? { scopeAllBranches: true } : {}), ...(user.scopeBranchIds ? { branchIds: JSON.parse(user.scopeBranchIds) } : {}) })
}
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const ok = (response, status = 201) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const fresh = id => repo('Employee').findOneByOrFail({ id })
const setConfig = (key, value) => repo('RequestsConfig').save({ key, value })
const contextOf = user => request(user, 'GET', '/settings/currency-context')

async function calendarCommand(scope, sourceId, date = baseline) {
  const context = ok(await request(U.admin, 'GET', `/attendance/calendar-context?scope=${scope}&sourceId=${sourceId}`), 200)
  return { effectiveFrom: date, reason: 'تأكيد التقويم لاختبار العملة', expectedRevision: context.revision, expectedCurrentSourceHash: context.currentSourceHash }
}
const confirm = async (scope, sourceId, date = baseline) =>
  ok(await request(U.admin, 'POST', '/attendance/calendar-context/confirm', { scope, sourceId, calendarChange: await calendarCommand(scope, sourceId, date) }))

/** موظف بالإضافة (POST /employees) — الخادم بيحط العملة وبيوثّق أجر التعيين. */
async function hire(branch, extra = {}, actor = U.admin) {
  return ok(await request(actor, 'POST', '/employees', { ...(await employeeRequiredFields(ds, branch.id)), branchId: branch.id,
    joinDate: '2026-01-01', basicSalary: 7000, housingAllowance: 500, ...extra }))
}
/** ملف قديم متسجل مباشرة (بعملته المحفوظة زي ما هي) وجاهز لتغيير الفرع المؤرخ: تقويمه وإسناد دوامه متأكدين. */
async function legacy(branch, extra = {}) {
  const n = ++sequence
  const emp = await repo('Employee').save({ employeeCode: `CURL${String(n).padStart(3, '0')}`, fullName: `موظف قديم ${n}`, branchId: branch.id,
    departmentId: D[branch.code].id, teamId: T[branch.code].id, joinDate: '2020-01-01', status: 'active', isActive: true, payMethod: 'cash',
    basicSalary: '6000.00', housingAllowance: '1000.00', transportAllowance: '0.00', phoneAllowance: '0.00', workNatureAllowance: '0.00',
    otherAllowance: '0.00', currency: 'SAR', ...extra })
  await confirm('EMPLOYEE', emp.id)
  ok(await request(U.admin, 'PATCH', `/employees/${emp.id}`, { workScheduleId: null, flexOverrideMode: 'INHERIT',
    attendanceEffectiveFrom: baseline, attendanceChangeReason: 'تأكيد الإسناد الحالي في التاريخ الموثق' }), 200)
  return emp
}
const salaryContext = async emp => ok(await request(U.admin, 'GET', `/employees/${emp.id}/salary-change-context`), 200)
const history = async emp => ok(await request(U.admin, 'GET', `/payroll/employees/${emp.id}/salary-history`), 200)
async function salaryCommand(emp, change = {}) {
  const c = await salaryContext(emp)
  return { expectedRevision: c.historyRevision, expectedCurrentSourceHash: c.currentSourceHash, effectivePayrollPeriod: c.currentPayrollPeriod,
    reason: 'قرار تعديل الأجر لاختبار العملة', evidenceReference: 'قرار اختباري', salary: { ...c.current, ...change } }
}
/** تثبيت السجل الشهري من شاشة «سجل الأجر» بنفس الشهور والمبالغ وبعملة مختارة (الملف من غير سجل: أجره الحالي من الشهر الجاري). */
async function redocument(emp, currency) {
  const view = await history(emp), month = (await salaryContext(emp)).currentPayrollPeriod
  const rows = view.segments.length ? view.segments : [{ ...view.current, effectivePayrollPeriod: month, effectiveToPayrollPeriod: null }]
  const periods = rows.map(row => ({ effectivePayrollPeriod: row.effectivePayrollPeriod, effectiveToPayrollPeriod: row.effectiveToPayrollPeriod,
    currency, ...Object.fromEntries(MONEY.map(key => [key, row[key] ?? '0.00'])) }))
  return ok(await request(U.admin, 'POST', `/payroll/employees/${emp.id}/salary-history/monthly`, { expectedRevision: view.revision,
    expectedCurrentSourceHash: view.currentSourceHash, reason: 'تثبيت الأجر بعملة الفرع الجديد', evidenceReference: 'قرار النقل', periods }))
}
async function exportRows(employeeIds) {
  const response = await fetch(`${base}/employees/export?ids=${employeeIds.join(',')}`, { headers: { Authorization: `Bearer ${token(U.admin)}` } })
  assert.equal(response.status, 200)
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(Buffer.from(await response.arrayBuffer()))
  const sheet = workbook.getWorksheet('الموظفين'), headers = sheet.getRow(1).values.slice(1), rows = []
  for (let r = 2; r <= sheet.rowCount; r++) {
    const values = sheet.getRow(r).values.slice(1)
    rows.push(Object.fromEntries(headers.map((header, index) => [header, values[index] ?? null])))
  }
  return rows
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME,
    password: env.DB_PASSWORD, database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => {}
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => {}
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assert.equal(ds.options.database, database)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`

  // المالك شغال في مصر: عملة النظام جنيه. فرعين مصريين وفرع سعودي وفرع قديم من غير دولة
  B.cairo = await repo('Branch').save({ code: 'CUR-CAI', name: 'فرع القاهرة للعملة', country: 'EG', weekendDays: 'FRI' })
  B.alex = await repo('Branch').save({ code: 'CUR-ALX', name: 'فرع الإسكندرية للعملة', country: 'EG', weekendDays: 'FRI' })
  B.riyadh = await repo('Branch').save({ code: 'CUR-RUH', name: 'فرع الرياض للعملة', country: 'SA', weekendDays: 'FRI' })
  B.legacy = await repo('Branch').save({ code: 'CUR-OLD', name: 'فرع قديم من غير دولة', weekendDays: 'FRI' })
  for (const branch of Object.values(B)) {
    D[branch.code] = await repo('Department').save({ name: `قسم ${branch.name}`, branchId: branch.id })
    T[branch.code] = await repo('Team').save({ name: `فريق ${branch.name}`, departmentId: D[branch.code].id })
  }
  await repo('RequestsConfig').save([{ key: 'system.currency', value: 'EGP' }, { key: 'payroll.cycle_start_day', value: '23' },
    { key: 'attendance.weekend_days', value: 'FRI' }, { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' }])
  const user = (name, role, branchId, permissions, extra = {}) => repo('User').save({ email: `${name}@currency.invalid`, displayName: name,
    passwordHash: 'test-only', role, branchId, permissions: JSON.stringify(permissions), ...extra })
  U.admin = await user('admin', 'super_admin', null, ['*'])
  U.hrCairo = await user('hr-cairo', 'hr', B.cairo.id, ['employees.view', 'employees.create', 'employees.edit', 'payroll.approve', 'payroll.view', 'org.manage'])
  U.hrTwo = await user('hr-two', 'hr', B.cairo.id, ['employees.view'], { scopeBranchIds: JSON.stringify([B.cairo.id, B.riyadh.id]) })
  U.companyWide = await user('company', 'hr', null, ['employees.view'], { scopeAllBranches: true })
  U.nobody = await user('no-branch', 'hr', null, ['employees.view'])
  // طلب النقل: سلسلة ونوع (مدير النظام بيقدّمه نيابةً فيتعتمد وينفَّذ لحظتها)
  const chain = await repo('ApprovalChain').save({ code: 'CURRENCY_TRANSFER', nameAr: 'اعتماد نقل اختباري', requestTypeCode: 'TRANSFER' })
  await repo('ApprovalStep').save({ chainId: chain.id, stepOrder: 1, approverRole: 'hr' })
  await repo('RequestType').save({ code: 'TRANSFER', nameAr: 'نقل موظف', category: 'employment_status', destinationHandler: 'transfers_effective_date',
    approvalChainId: chain.id, requiredFields: '["toTeamId","effectiveDate"]' })
  await confirm('GLOBAL', 0)
  for (const branch of Object.values(B)) await confirm('BRANCH', branch.id)
  ok(await request(U.admin, 'POST', '/catalogs/work-schedules', { name: 'جدول العملة الافتراضي', startTime: '08:00', endTime: '16:00',
    weekendDays: 'FRI', isDefault: true, isActive: true, flexEnabled: false, requiredWorkMinutes: 480, effectiveFrom: baseline, changeReason: 'تأكيد ساعات الاختبار' }))
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir())); assert.match(path.basename(uploads), /^hr-currency-files-/)
    fs.rmSync(uploads, { recursive: true, force: true }); assert.equal(fs.existsSync(uploads), false)
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'currency fixture cleanup failed')
})

test('CUR-01: سياق العملة لأي مستخدم داخل — الموظف بعملة فرعه، والموارد البشرية بفروع نطاقها بس، وكل الفروع للحساب العام، من غير أسماء', async () => {
  const cairo = await hire(B.cairo), riyadh = await hire(B.riyadh)
  const employeeUser = await repo('User').save({ email: 'emp-cairo@currency.invalid', displayName: 'موظف القاهرة', passwordHash: 'test-only',
    role: 'employee', branchId: B.cairo.id, employeeId: cairo.id, permissions: '[]' })
  // الموظف من غير أي صلاحية (كان بياخد «ر.س» ثابتة من غير ما يسأل الخادم)
  assert.deepEqual(ok(await contextOf(employeeUser), 200), { defaultCurrency: 'EGP', ownCurrency: 'EGP', branches: [{ id: B.cairo.id, currency: 'EGP' }] })
  const saudiUser = await repo('User').save({ email: 'emp-riyadh@currency.invalid', displayName: 'موظف الرياض', passwordHash: 'test-only',
    role: 'employee', branchId: B.riyadh.id, employeeId: riyadh.id, permissions: '[]' })
  assert.deepEqual(ok(await contextOf(saudiUser), 200), { defaultCurrency: 'EGP', ownCurrency: 'SAR', branches: [{ id: B.riyadh.id, currency: 'SAR' }] })

  // موارد بشرية على فرعين: الفرعين دول بس — الإسكندرية والفرع القديم مايظهروش، ومفيش اسم فرع ولا أي بيان تاني
  const two = ok(await contextOf(U.hrTwo), 200)
  assert.deepEqual(two, { defaultCurrency: 'EGP', ownCurrency: null, branches: [{ id: B.cairo.id, currency: 'EGP' }, { id: B.riyadh.id, currency: 'SAR' }] })
  for (const row of two.branches) assert.deepEqual(Object.keys(row).sort(), ['currency', 'id'])
  assert.doesNotMatch(JSON.stringify(two), /فرع/)

  // حساب كل الفروع ومدير النظام: كل الفروع، والفرع من غير دولة بعملة النظام
  const all = [{ id: B.cairo.id, currency: 'EGP' }, { id: B.alex.id, currency: 'EGP' }, { id: B.riyadh.id, currency: 'SAR' }, { id: B.legacy.id, currency: 'EGP' }]
  assert.deepEqual(ok(await contextOf(U.companyWide), 200).branches, all)
  assert.deepEqual(ok(await contextOf(U.admin), 200), { defaultCurrency: 'EGP', ownCurrency: null, branches: all })
  // حساب مش مربوط بفرع = ولا فرع (مش «الكل»)، ومن غير دخول = 401
  assert.deepEqual(ok(await contextOf(U.nobody), 200), { defaultCurrency: 'EGP', ownCurrency: null, branches: [] })
  assert.equal((await contextOf(null)).status, 401)

  // عملة النظام بتتغير: الفرع القديم بيتبعها، والمصري والسعودي ثابتين بدولتهم
  await setConfig('system.currency', 'SAR')
  try {
    const changed = ok(await contextOf(U.admin), 200)
    assert.equal(changed.defaultCurrency, 'SAR')
    assert.deepEqual(changed.branches.map(row => row.currency), ['EGP', 'EGP', 'SAR', 'SAR'])
  } finally { await setConfig('system.currency', 'EGP') }
})

test('CUR-02: الإضافة بعملة الفرع — العملة المبعوتة بتتجاهل (حتى AED)، وأجر التعيين في سجل الأجر بنفس العملة', async () => {
  const cairo = await hire(B.cairo, { currency: 'SAR' })
  assert.equal((await fresh(cairo.id)).currency, 'EGP')
  assert.deepEqual((await history(cairo)).segments.map(row => row.currency), ['EGP'])
  const riyadh = await hire(B.riyadh, { currency: 'EGP' })
  assert.equal((await fresh(riyadh.id)).currency, 'SAR')
  assert.deepEqual((await history(riyadh)).segments.map(row => row.currency), ['SAR'])
  const old = await hire(B.legacy, { currency: 'AED' })
  assert.equal((await fresh(old.id)).currency, 'EGP', 'فرع من غير دولة = عملة النظام، وAED مابقتش ترفض الإضافة')
  // حساب الفرع بيضيف في فرعه بنفس القاعدة
  assert.equal((await fresh((await hire(B.cairo, { currency: 'SAR' }, U.hrCairo)).id)).currency, 'EGP')
})

test('CUR-03: التعديل العادي بيتجاهل العملة ومابيعيدش كتابة المحفوظ، والنقل بين فرعين بنفس العملة مابيلمسهاش', async () => {
  const emp = await legacy(B.cairo)
  const before = await salaryContext(emp)
  ok(await request(U.admin, 'PATCH', `/employees/${emp.id}`, { phone: '01000000001', currency: 'EGP' }), 200)
  assert.equal((await fresh(emp.id)).currency, 'SAR', 'العملة المحفوظة جزء من الأجر الموثق — التعديل غير المالي مابيكتبهاش')
  assert.deepEqual(await salaryContext(emp), before)
  ok(await request(U.admin, 'PATCH', `/employees/${emp.id}`, { branchId: B.alex.id, departmentId: D[B.alex.code].id, teamId: T[B.alex.code].id,
    calendarChange: await calendarCommand('EMPLOYEE', emp.id, today) }), 200)
  const moved = await fresh(emp.id)
  assert.equal(moved.branchId, B.alex.id); assert.equal(moved.currency, 'SAR', 'مصر ← مصر: عملة الفرع ماتغيرتش')
  assert.equal(await repo('EmployeeStatusHistory').countBy({ employeeId: emp.id, fieldName: 'currency' }), 0)
  // العرض مابيعتمدش على المحفوظ: التصدير بعملة الفرع
  assert.equal((await exportRows([emp.id]))[0]['العملة'], 'EGP')
})

test('CUR-04: تغيير الأجر بيتسجل بعملة الفرع — العملة المبعوتة بتتجاهل، والملف القديم بعملة غلط بيتظبط من خلال سجل الأجر', async () => {
  const emp = await legacy(B.cairo)
  ok(await request(U.admin, 'PATCH', `/employees/${emp.id}`, { salaryChange: await salaryCommand(emp, { basicSalary: '6500.00', currency: 'SAR' }) }), 200)
  const saved = await fresh(emp.id), view = await history(emp)
  assert.equal(saved.currency, 'EGP'); assert.equal(Number(saved.basicSalary), 6500)
  assert.deepEqual(view.segments.map(row => [row.currency, row.basicSalary]), [['EGP', '6500.00']])
  assert.equal(view.version.currentSourceHash, view.currentSourceHash, 'السجل متثبّت على الملف الجديد — مفيش انحراف')
  const audit = await repo('EmployeeStatusHistory').findOneByOrFail({ employeeId: emp.id, fieldName: 'currency' })
  assert.deepEqual([audit.oldValue, audit.newValue, audit.changeType], ['SAR', 'EGP', 'SALARY'])
  // التغيير التالي بيمشي عادي
  ok(await request(U.admin, 'PATCH', `/employees/${emp.id}`, { salaryChange: await salaryCommand(emp, { basicSalary: '6600.00' }) }), 200)
  assert.deepEqual((await history(emp)).segments.map(row => [row.currency, row.basicSalary]), [['EGP', '6600.00']])
})

test('CUR-05: النقل من الملف لفرع عملته مختلفة بيغيّر العملة (تسمية بس) ويتسجل، وتغيير الأجر بعدها بيقول يثبّت سجل الأجر بالعملة الجديدة', async () => {
  const emp = await legacy(B.cairo, { currency: 'EGP' })
  await redocument(emp, 'EGP')
  const before = await fresh(emp.id)
  ok(await request(U.admin, 'PATCH', `/employees/${emp.id}`, { branchId: B.riyadh.id, departmentId: D[B.riyadh.code].id, teamId: T[B.riyadh.code].id,
    calendarChange: await calendarCommand('EMPLOYEE', emp.id, today) }), 200)
  const moved = await fresh(emp.id)
  assert.equal(moved.branchId, B.riyadh.id); assert.equal(moved.currency, 'SAR')
  for (const key of MONEY) assert.equal(String(moved[key]), String(before[key]), `${key}: مفيش تحويل مبالغ`)
  const audit = await repo('EmployeeStatusHistory').findOneByOrFail({ employeeId: emp.id, fieldName: 'currency' })
  assert.deepEqual([audit.oldValue, audit.newValue], ['EGP', 'SAR']); assert.match(audit.reason, /عملة الفرع الجديد/)
  // سجل الأجر لسه بالجنيه: الحكم زي ما هو (409) بس الرسالة بتقول يعمل إيه
  const blocked = await request(U.admin, 'PATCH', `/employees/${emp.id}`, { salaryChange: await salaryCommand(emp, { basicSalary: '7100.00' }) })
  assert.equal(blocked.status, 409, JSON.stringify(blocked.body)); assert.equal(blocked.body.code, 'SALARY_CHANGE_HISTORY_SOURCE_CHANGED')
  assert.match(blocked.body.message, /ثبّت أجره بالعملة الجديدة من «سجل الأجر» الأول/)
  // تثبيت السجل بالريال من شاشة سجل الأجر، وبعدها تغيير الأجر بيمشي
  await redocument(emp, 'SAR')
  ok(await request(U.admin, 'PATCH', `/employees/${emp.id}`, { salaryChange: await salaryCommand(emp, { basicSalary: '7100.00' }) }), 200)
  assert.deepEqual((await history(emp)).segments.map(row => row.currency), ['SAR'])
})

test('CUR-06: النقل لفرع عملته مختلفة مع تغيير أجر في نفس الحفظ — التغيير نفسه بيكتب العملة الجديدة في سجل الأجر من غير انحراف', async () => {
  const emp = await legacy(B.cairo, { currency: 'EGP' })
  await redocument(emp, 'EGP')
  ok(await request(U.admin, 'PATCH', `/employees/${emp.id}`, { branchId: B.riyadh.id, departmentId: D[B.riyadh.code].id, teamId: T[B.riyadh.code].id,
    calendarChange: await calendarCommand('EMPLOYEE', emp.id, today), salaryChange: await salaryCommand(emp, { basicSalary: '8000.00' }) }), 200)
  const moved = await fresh(emp.id), view = await history(emp)
  assert.equal(moved.currency, 'SAR'); assert.equal(Number(moved.basicSalary), 8000)
  assert.equal(view.segments.at(-1).currency, 'SAR'); assert.equal(view.version.currentSourceHash, view.currentSourceHash)
  assert.equal(await repo('EmployeeStatusHistory').countBy({ employeeId: emp.id, fieldName: 'currency' }), 1, 'سطر عملة واحد من تغيير الأجر')
  ok(await request(U.admin, 'PATCH', `/employees/${emp.id}`, { salaryChange: await salaryCommand(emp, { basicSalary: '8100.00' }) }), 200)
})

test('CUR-07: طلب نقل منفّذ لفرع عملته مختلفة بيغيّر العملة ويتسجل على الطلب، والنقل لفرع بنفس العملة مابيلمسهاش', async () => {
  const emp = await legacy(B.cairo, { currency: 'EGP' })
  const done = ok(await request(U.admin, 'POST', '/requests', { typeCode: 'TRANSFER', onBehalfEmployeeId: emp.id, submit: true,
    payload: { toTeamId: T[B.riyadh.code].id, effectiveDate: today } }))
  assert.equal(done.status, 'COMPLETED')
  const moved = await fresh(emp.id)
  assert.equal(moved.branchId, B.riyadh.id); assert.equal(moved.currency, 'SAR')
  const audit = await repo('EmployeeStatusHistory').findOneByOrFail({ employeeId: emp.id, fieldName: 'currency' })
  assert.deepEqual([audit.oldValue, audit.newValue, audit.requestId], ['EGP', 'SAR', done.id])
  // مصر ← مصر: ملف قديم بعملة محفوظة غلط يفضل زي ما هو (بيتظبط مع أول تغيير أجر موثق)
  const same = await legacy(B.cairo)
  assert.equal(ok(await request(U.admin, 'POST', '/requests', { typeCode: 'TRANSFER', onBehalfEmployeeId: same.id, submit: true,
    payload: { toTeamId: T[B.alex.code].id, effectiveDate: today } })).status, 'COMPLETED')
  assert.deepEqual([(await fresh(same.id)).branchId, (await fresh(same.id)).currency], [B.alex.id, 'SAR'])
})

test('CUR-08: تأمينات دولة الفرع بس — الإنشاء والتعديل بيترفضوا برسالة، والفرع القائم المختلف مابيتغيرش لوحده وبيحفظ باقي حقوله', async () => {
  const create = body => request(U.admin, 'POST', '/branches', { name: `فرع تأمينات ${++sequence}`, code: `CUR-INS-${sequence}`, ...body })
  let refused = await create({ country: 'EG', insuranceSystem: 'SAUDI' })
  assert.equal(refused.status, 400); assert.match(refused.body.message, /فرع مصر تأميناته «بدون تأمينات» أو «التأمينات المصرية» بس/)
  refused = await create({ country: 'SA', insuranceSystem: 'EGYPTIAN' })
  assert.equal(refused.status, 400); assert.match(refused.body.message, /فرع السعودية تأميناته «بدون تأمينات» أو «التأمينات السعودية» بس/)
  refused = await create({ country: 'KW' })
  assert.equal(refused.status, 400); assert.match(refused.body.message, /دولة الفرع يا مصر \(EG\) يا السعودية \(SA\)/)
  const egypt = ok(await create({ country: 'eg', insuranceSystem: 'EGYPTIAN' }))
  assert.equal(egypt.country, 'EG', 'الرمز بيتحفظ بحروف كبيرة')
  ok(await create({ country: 'SA', insuranceSystem: 'SAUDI' }))
  ok(await create({}), 201)

  // تغيير الدولة لسعودي وتأميناته مصرية: مرفوض قبل أي حاجة، والفرع زي ما هو
  const changed = await request(U.admin, 'PATCH', `/branches/${egypt.id}`, { country: 'SA', calendarChange: await calendarCommand('BRANCH', egypt.id, today) })
  assert.equal(changed.status, 400); assert.match(changed.body.message, /فرع السعودية تأميناته/)
  assert.equal((await repo('Branch').findOneByOrFail({ id: egypt.id })).country, 'EG')

  // فرع قائم مختلف (قبل القاعدة): مابيتغيرش لوحده، وبيحفظ باقي حقوله بنفس نظام تأميناته، وتصحيحه مسموح
  const mismatched = await repo('Branch').save({ code: 'CUR-MIS', name: 'فرع قديم مختلف', country: 'EG', insuranceSystem: 'SAUDI' })
  ok(await request(U.admin, 'PATCH', `/branches/${mismatched.id}`, { name: 'فرع قديم مختلف بعد التعديل', insuranceSystem: 'SAUDI' }), 200)
  assert.equal((await repo('Branch').findOneByOrFail({ id: mismatched.id })).insuranceSystem, 'SAUDI', 'مفيش تغيير تلقائي لنظام تأمينات بيحرك فلوس')
  const wrongFix = await request(U.admin, 'PATCH', `/branches/${mismatched.id}`, { insuranceSystem: 'SAUDI', phone: '0100' })
  assert.equal(wrongFix.status, 200, 'نفس القيمة المحفوظة مش تغيير')
  ok(await request(U.admin, 'PATCH', `/branches/${mismatched.id}`, { insuranceSystem: 'EGYPTIAN' }), 200)
  assert.equal((await repo('Branch').findOneByOrFail({ id: mismatched.id })).insuranceSystem, 'EGYPTIAN')

  // رمز قديم غير مصر والسعودية يفضل طول ما ماتغيّرش، والجديد منه مرفوض
  const gulf = await repo('Branch').save({ code: 'CUR-AE', name: 'فرع برمز قديم', country: 'AE' })
  ok(await request(U.admin, 'PATCH', `/branches/${gulf.id}`, { name: 'فرع برمز قديم معدل', country: 'ae' }), 200)
  assert.equal((await repo('Branch').findOneByOrFail({ id: gulf.id })).country, 'AE')
  assert.equal((await request(U.admin, 'PATCH', `/branches/${gulf.id}`, { country: 'KW', calendarChange: await calendarCommand('BRANCH', gulf.id, today) })).status, 400)
  assert.deepEqual((ok(await contextOf(U.admin), 200)).branches.find(row => row.id === gulf.id), { id: gulf.id, currency: 'EGP' }, 'الرمز القديم = عملة النظام')
})

test('CUR-09: عملة معادلات الرواتب من الخادم — معادلات كل الشركة بعملة النظام، ومعادلات الفرع بعملة فرعها، والمبعوت بيتفحص ويتجاهل', async () => {
  const create = body => request(U.admin, 'POST', '/payroll/policies', { name: `معادلات عملة ${++sequence}`, effectiveFrom: '2026-07-01', ...body })
  const company = ok(await create({ settings: { currency: 'SAR' } }))
  assert.equal(company.policy.branchId, null); assert.equal(company.versions[0].currency, 'EGP')
  const saudi = ok(await create({ branchId: B.riyadh.id, settings: { currency: 'EGP' } }))
  assert.equal(saudi.versions[0].currency, 'SAR')
  const egypt = ok(await create({ branchId: B.cairo.id }))
  assert.equal(egypt.versions[0].currency, 'EGP')
  // تعديل الإعدادات: العملة بتفضل عملة الفرع مهما اتبعت
  const patched = ok(await request(U.admin, 'PATCH', `/payroll/policies/${saudi.policy.id}/versions/${saudi.versions[0].id}`, { expectedRevision: 1,
    reason: 'تعديل ساعات اليوم', settings: { dailyHours: 7.5, currency: 'EGP' } }), 200)
  assert.equal(patched.version.currency, 'SAR'); assert.equal(Number(patched.version.dailyHours), 7.5)
  // القيمة المبعوتة لسه بتتفحص (مفيش قبول لقيمة غلط)
  assert.equal((await create({ settings: { currency: 'USD' } })).status, 400)
})

test('CUR-10: مستند الموارد البشرية بيطبع عملة فرع الموظف مش العمود المحفوظ في ملفه', async () => {
  const emp = await legacy(B.cairo)
  assert.equal((await fresh(emp.id)).currency, 'SAR')
  const created = ok(await request(U.admin, 'POST', '/hr-documents/templates', { name: 'إفادة راتب لاختبار العملة', category: 'general', customFields: [],
    draft: { title: 'إفادة راتب', greeting: '', body: 'إجمالي راتب {{employee.fullName}}: {{salary.total}} {{salary.currency}}.', closing: 'التوقيع', footer: 'اختبار العملة' } }))
  const template = ok(await request(U.admin, 'POST', `/hr-documents/templates/${created.id}/publish`, { version: created.version }))
  const issued = ok(await request(U.admin, 'POST', '/hr-documents/issue', { templateId: template.id, revisionId: template.publishedRevision.id,
    values: {}, idempotencyKey: crypto.randomUUID(), employeeId: emp.id }))
  const document = await repo('HrIssuedDocument').findOneByOrFail({ id: issued.id })
  assert.equal(document.snapshot.values['salary.currency'], 'EGP')
  assert.equal(document.snapshot.values['salary.total'], '7000.00')
})
