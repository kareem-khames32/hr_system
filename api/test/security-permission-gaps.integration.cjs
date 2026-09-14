// SEC1 (خطة المراجعة 8-أ): ثغرات الصلاحيات قبل منح صلاحيات الرواتب وقبل التحويل.
// SQL + HTTP حقيقيان على قاعدة مؤقتة عشوائية تُنشأ وتُحذف في كل تشغيل — لا تلمس hr_system.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const { ROLE_PRESETS, SUPER_ADMIN_ONLY_GRANTS } = require('../src/auth/permissions')
const database = `hr_sec1_perm_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-sec1-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const today = require('../src/attendance/attendance.service').localDateOf(new Date())
const SENSITIVE = ['attendance_exemption.approve_executive', 'attendance_exemption.approve', 'payroll.reopen', 'payroll.cancel', 'overtime.adjust']
let app, ds, master, base, created = false, sequence = 0
let branchA, branchB, empA, empB, admin, hrManager, roleManager, editOnly, editApprove, docsOnly, docsFinance, docsOutsider, owner, payrollA
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
// jwtPermissions = الصلاحيات المحلولة داخل التوكن (زي auth.service.login) لمن صلاحياته من الدور
const token = user => jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null,
  employeeId: user.employeeId ?? null, tokenVersion: user.tokenVersion ?? 0,
  permissions: user.role === 'super_admin' ? ['*'] : (user.jwtPermissions ?? JSON.parse(user.permissions || '[]')) })
const raw = (user, method, route, body) => fetch(base + route, { method, headers: { 'Content-Type': 'application/json',
  ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
async function request(user, method, route, body) {
  const response = await raw(user, method, route, body)
  const text = await response.text()
  let parsed = null
  try { parsed = text ? JSON.parse(text) : null } catch { parsed = text }
  return { status: response.status, body: parsed }
}
const expect = (r, status) => { assert.equal(r.status, status, JSON.stringify(r.body)); return r.body }
const email = () => `sec1-${++sequence}-${crypto.randomBytes(3).toString('hex')}@sec1-test.example.com`

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql'); assert.match(database, /^hr_sec1_perm_test_[a-f0-9]{16}$/)
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
  branchA = await repo('Branch').save({ name: 'SEC1 branch 1', code: 'SEC1A' })
  branchB = await repo('Branch').save({ name: 'SEC1 branch 2', code: 'SEC1B' })
  const salary = { basicSalary: '6000.00', housingAllowance: '1500.00', transportAllowance: '500.00', phoneAllowance: '0.00',
    workNatureAllowance: '0.00', otherAllowance: '0.00', currency: 'SAR' }
  empA = await repo('Employee').save({ employeeCode: 'SEC1A01', fullName: 'موظف فرع 1 للاختبار', branchId: branchA.id, status: 'active',
    joinDate: '2020-01-01', jobTitle: 'فني', ...salary })
  empB = await repo('Employee').save({ employeeCode: 'SEC1B01', fullName: 'موظف فرع 2 للاختبار', branchId: branchB.id, status: 'active',
    joinDate: '2020-01-01', jobTitle: 'فني', ...salary })
  const user = (name, role, branchId, permissions, employeeId = null) => repo('User').save({ email: `${name}@sec1-fixture.example.com`,
    displayName: name, passwordHash: 'test-only', role, branchId, employeeId, permissions: JSON.stringify(permissions) })
  const hrPreset = ROLE_PRESETS.find(r => r.code === 'hr_manager').permissions
  admin = await user('admin', 'super_admin', null, ['*'])
  // عمود users.permissions للتجاوزات القديمة فقط (500 حرف) — صلاحيات hr_manager من دوره، والتوكن يحملها كاملة
  hrManager = { ...(await user('hrmanager', 'hr_manager', branchA.id, [])), jwtPermissions: hrPreset }
  roleManager = await user('rolemanager', 'hr', branchA.id, ['roles.manage'])
  editOnly = await user('editonly', 'hr', branchA.id, ['employees.view', 'employees.edit'])
  editApprove = await user('editapprove', 'hr', branchA.id, ['employees.view', 'employees.edit', 'payroll.approve'])
  docsOnly = await user('docsonly', 'hr', branchA.id, ['documents.manage'])
  docsFinance = await user('docsfinance', 'hr', branchA.id, ['documents.manage', 'payroll.view'])
  docsOutsider = await user('docsoutsider', 'hr', branchB.id, ['documents.manage', 'payroll.view'])
  owner = await user('owner', 'employee', branchA.id, [], empA.id)
  payrollA = await user('payroll1', 'hr', branchA.id, ['payroll.view', 'payroll.calculate'])
}, { timeout: 90000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (e) { errors.push(e) }
  try {
    if (created && master) {
      assert.match(database, /^hr_sec1_perm_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('db', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name=@db')).recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} removed.`)
    }
  } catch (e) { errors.push(e) }
  try { if (master) await master.close() } catch (e) { errors.push(e) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), os.tmpdir()); assert.match(path.basename(uploads), /^hr-sec1-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
  } catch (e) { errors.push(e) }
  if (errors.length) throw new AggregateError(errors, 'SEC1 fixture cleanup failed')
})

test('SEC-05: sensitive payroll/attendance grants are super-admin-only for accounts, overrides and roles', async () => {
  for (const perm of SENSITIVE) assert.ok(SUPER_ADMIN_ONLY_GRANTS.includes(perm), perm)
  // hr_manager (users.manage) لا ينشئ حساباً يحمل أيًّا منها — ولا يُحفظ شيء
  for (const perm of SENSITIVE) {
    for (const role of ['employee', 'branch_manager']) {
      const address = email()
      const r = await request(hrManager, 'POST', '/users', { email: address, password: 'Sec1-test-only-pass', displayName: 'حساب اختبار', role, permissions: [perm] })
      expect(r, 403)
      assert.equal(await repo('User').countBy({ email: address }), 0)
    }
  }
  // صلاحية غير حساسة ما زالت متاحة له (لم نغلق الإنشاء كله)
  const plain = expect(await request(hrManager, 'POST', '/users', { email: email(), password: 'Sec1-test-only-pass', displayName: 'حساب اختبار عادي', role: 'employee', permissions: ['overtime.confirm'] }), 201)
  // ولا يرفعها لاحقاً بتعديل الحساب أو بتجاوز GRANT
  for (const perm of ['payroll.cancel', 'attendance_exemption.approve_executive']) {
    expect(await request(hrManager, 'PATCH', `/users/${plain.id}`, { permissions: ['overtime.confirm', perm] }), 403)
    expect(await request(hrManager, 'PUT', `/users/${plain.id}/permissions`, { grants: [perm] }), 403)
  }
  assert.deepEqual(JSON.parse((await repo('User').findOneByOrFail({ id: plain.id })).permissions), ['overtime.confirm'])
  assert.equal(await repo('UserPermissionOverride').countBy({ userId: plain.id }), 0)
  // من يملك roles.manage دون أن يكون مدير نظام لا يصنع دوراً يحملها
  for (const perm of SENSITIVE) {
    expect(await request(roleManager, 'POST', '/roles', { code: `sec1_${perm.replace(/\W/g, '_')}`.slice(0, 30), nameAr: 'دور اختبار', permissions: [perm] }), 403)
  }
  // مدير النظام وحده يمنحها
  const granted = expect(await request(admin, 'POST', '/users', { email: email(), password: 'Sec1-test-only-pass', displayName: 'حساب اعتماد', role: 'employee', branchId: branchA.id, permissions: ['payroll.cancel', 'attendance_exemption.approve_executive'] }), 201)
  assert.deepEqual(JSON.parse(granted.permissions), ['payroll.cancel', 'attendance_exemption.approve_executive'])
  // كلمة مرور حساب يحملها لا يغيّرها hr_manager (السيطرة على الحساب = وراثة الصلاحية)
  expect(await request(hrManager, 'PATCH', `/users/${granted.id}`, { password: 'Another-test-pass-1' }), 403)
})

test('SEC-06: salary change and its context need payroll.approve on top of employees.edit', async () => {
  expect(await request(editOnly, 'GET', `/employees/${empA.id}/salary-change-context`), 403)
  const ctx = expect(await request(admin, 'GET', `/employees/${empA.id}/salary-change-context`), 200)
  // قاعدة المالك (الخطوة 13): التغيير يسري من راتب شهر كامل — شهر المسير الحالي من سياق التعديل نفسه
  const command = c => ({ expectedRevision: c.historyRevision, expectedCurrentSourceHash: c.currentSourceHash, effectivePayrollPeriod: c.currentPayrollPeriod,
    reason: 'قرار تعديل أجر للاختبار', evidenceReference: 'مرجع اختبار SEC1', salary: { ...c.current, basicSalary: '6500.00' } })
  const before = await ds.query('SELECT CAST(basicSalary AS nvarchar(40)) AS basic FROM employees WHERE id=@0', [empA.id])
  const versionsBefore = (await ds.query('SELECT COUNT(*) AS n FROM employee_salary_history_versions WHERE employeeId=@0', [empA.id]))[0].n
  expect(await request(editOnly, 'PATCH', `/employees/${empA.id}`, { salaryChange: command(ctx) }), 403)
  expect(await request(editOnly, 'PATCH', `/employees/${empA.id}`, { phone: '0500000001', salaryChange: command(ctx) }), 403)
  assert.deepEqual(await ds.query('SELECT CAST(basicSalary AS nvarchar(40)) AS basic FROM employees WHERE id=@0', [empA.id]), before)
  assert.equal((await ds.query('SELECT COUNT(*) AS n FROM employee_salary_history_versions WHERE employeeId=@0', [empA.id]))[0].n, versionsBefore)
  assert.notEqual((await repo('Employee').findOneByOrFail({ id: empA.id })).phone, '0500000001')
  // تعديل البيانات غير المالية ما زال بـemployees.edit وحدها
  expect(await request(editOnly, 'PATCH', `/employees/${empA.id}`, { phone: '0500000002' }), 200)
  // employees.edit + payroll.approve = المسار المعتمد يعمل
  const approvedCtx = expect(await request(editApprove, 'GET', `/employees/${empA.id}/salary-change-context`), 200)
  expect(await request(editApprove, 'PATCH', `/employees/${empA.id}`, { salaryChange: command(approvedCtx) }), 200)
  assert.equal((await ds.query('SELECT CAST(basicSalary AS nvarchar(40)) AS basic FROM employees WHERE id=@0', [empA.id]))[0].basic, '6500.00')
})

test('SEC-07: salary letters need the finance read check on /letters download and /files', async () => {
  const letter = async (letterType, requestId, templateRevisionId = null) => {
    const storedName = `letters/${crypto.randomUUID()}.pdf`, target = path.join(uploads, storedName)
    fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, Buffer.from('%PDF-1.4\n% SEC1 fixture only\n'))
    const file = await repo('StoredFile').save({ originalName: `letter-${letterType}.pdf`, storedName, mime: 'application/pdf', size: 30,
      entityType: 'letter', entityId: requestId, employeeId: empA.id })
    const row = await repo('LetterRequest').save({ requestId, employeeId: empA.id, letterType, purpose: 'اختبار', status: 'GENERATED',
      generatedPdfRef: `file:${file.id}`, templateId: null, templateRevisionId, contentSnapshot: null })
    return { routes: [`/letters/${row.id}/download`, `/files/${file.id}`] }
  }
  const content = body => ({ title: 'خطاب اختبار', greeting: 'إلى من يهمه الأمر،', body, closing: 'الموارد البشرية', footer: 'اختبار' })
  const template = await repo('LetterTemplate').save({ code: 'SEC1_TEMPLATE', name: 'قالب اختبار', version: 1, draft: content('نص') })
  const plainRevision = await repo('LetterTemplateRevision').save({ templateId: template.id, revision: 1, content: content('يعمل {{employee.fullName}} لدينا منذ {{employee.joinDate}}.') })
  const salaryRevision = await repo('LetterTemplateRevision').save({ templateId: template.id, revision: 2, content: content('إجمالي الراتب {{ salary.total }} {{salary.currency}}.') })
  const salaryLetter = await letter('SALARY', 93001, plainRevision.id)
  const bankLetter = await letter('BANK_LOAN', 93002, salaryRevision.id)
  const customSalary = await letter('EMPLOYMENT', 93003, salaryRevision.id)
  const experience = await letter('EXPERIENCE', 93004, plainRevision.id)
  const status = async (user, route) => (await raw(user, 'GET', route)).status
  for (const { routes } of [salaryLetter, bankLetter, customSalary]) {
    for (const route of routes) {
      assert.equal(await status(docsOnly, route), 403, `documents.manage only ${route}`)
      assert.equal(await status(docsFinance, route), 200, `documents.manage + payroll.view ${route}`)
      assert.equal(await status(owner, route), 200, `owner ${route}`)
      assert.equal(await status(docsOutsider, route), 403, `other branch ${route}`)
      assert.equal(await status(payrollA, route), 403, `payroll without documents.manage ${route}`)
    }
  }
  // الخطاب غير المالي باقٍ على سياسته: documents.manage في النطاق يكفي
  for (const route of experience.routes) {
    assert.equal(await status(docsOnly, route), 200, `non-financial ${route}`)
    assert.equal(await status(docsOutsider, route), 403, `non-financial other branch ${route}`)
  }
})

test('SEC-04: /obligations read, create and cancel enforce the employee branch scope', async () => {
  // الخطوة 25 (DD-05): الخصم المباشر في الدفتر مقفل للجميع — الخصم من «الخصومات المصنفة»؛ فحص النطاق هنا على قيود الإضافة
  expect(await request(admin, 'POST', '/obligations', { employeeId: empB.id, type: 'DEBIT', amount: 50, label: 'خصم مباشر مقفل' }), 403)
  const outOfScope = expect(await request(admin, 'POST', '/obligations', { employeeId: empB.id, type: 'CREDIT', amount: 50, label: 'قيد اختبار فرع 2' }), 201)
  expect(await request(payrollA, 'GET', `/obligations/employee/${empB.id}`), 403)
  const countB = await repo('EmployeeObligation').countBy({ employeeId: empB.id })
  expect(await request(payrollA, 'POST', '/obligations', { employeeId: empB.id, type: 'CREDIT', amount: 75, label: 'محاولة خارج النطاق' }), 403)
  assert.equal(await repo('EmployeeObligation').countBy({ employeeId: empB.id }), countB)
  expect(await request(payrollA, 'POST', `/obligations/${outOfScope.id}/cancel`), 403)
  assert.equal((await repo('EmployeeObligation').findOneByOrFail({ id: outOfScope.id })).status, 'PENDING')
  expect(await request(payrollA, 'GET', '/obligations/employee/99999999'), 404)
  // داخل النطاق يعمل كما هو
  const inScope = expect(await request(payrollA, 'POST', '/obligations', { employeeId: empA.id, type: 'CREDIT', amount: 25, label: 'قيد اختبار فرع 1' }), 201)
  const list = expect(await request(payrollA, 'GET', `/obligations/employee/${empA.id}`), 200)
  assert.ok(list.some(row => row.id === inScope.id))
  assert.equal(expect(await request(payrollA, 'POST', `/obligations/${inScope.id}/cancel`), 201).status, 'CANCELLED')
  // مدير النظام بلا نطاق
  assert.ok(expect(await request(admin, 'GET', `/obligations/employee/${empB.id}`), 200).some(row => row.id === outOfScope.id))
})
