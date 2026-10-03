'use strict'
// B1.7 — ضوابط الشخص الواحد على قاعدة SQL مؤقتة معزولة (synchronize)، عبر HTTP بتوكنات موقّعة محليًا ومن غير كلمات مرور:
//  OP-1) سجل تغييرات الصرف: تعديل الملف وExcel وطلب «تغيير حساب بنكي» والإنشاء → صف لكل حقل اتغيّر بمصدره ومين، والآيبان متخفي؛
//        ومفيش صف لو القيمة ماتغيرتش. وفي الطلب اللي نفّذ = آخر معتمد (وسجل التغييرات القديم بقى فيه اسمه).
//  OP-2) «اتغيّر إيه من آخر مسير»: الراتب (قبل وبعد) وتغيير الراتب والحساب البنكي ومين وإمتى، والجديد، والخارج من السلسلة، وبنطاق الفرع.
//  OP-3) «اللي غيّر مايعتمدش لوحده»: مقفول = بيعتمد زي النهارده ومن غير أي مفتاح جديد في الحدث؛ مفتوح = رفض بالرسالة وأرقام الموظفين،
//        وحد تاني بيعتمد، ومدير النظام بسبب (10 حروف على الأقل) بيعدّي ويتسجل في حدث الاعتماد.
//  OP-4) نفس الضابط في سلسلة الاعتماد: معتمد تاني قبله = بيعدّي؛ سلسلة بخطوة واحدة = رفض، ومدير النظام بسبب بيعدّي.
//  OP-5) المسار الأمني للحساب البنكي: مقفول = زي النهارده (التعديل بيغيّر، والطلب نيابةً بيتعتمد على طول)؛ مفتوح = التعديل وExcel مرفوضين
//        للآيبان والبنك (وطريقة الصرف مسموحة)، والطلب نيابةً بيمشي في سلسلته، ونفس الشخص مايعتمدش الخطوتين.
//  OP-6) فحوص النقل من التعديل وExcel: مقفول = زي النهارده؛ مفتوح = عهدة مفتوحة أو مدير مباشر في فرع تاني بيمنع النقل من غير أي تغيير.
// Run (من api/): node --test test/one-person-controls.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const { writeParityReasonsBeforeApproval } = require('./fixtures/payroll-parity-reasons.cjs')
const { employeeRequiredFields } = require('./helpers/employee-fixture.cjs')

const database = `hr_one_person_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_one_person_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-one-person-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const KEYS = { changers: 'payroll.approval.block_recent_changers', bank: 'payroll.bank_change.secure_path_always', transfer: 'employees.transfer_checks.enabled' }
const IBANS = ['SA0380000000608010167519', 'SA4420000001234567891234', 'SA1510000000000012345678', 'SA6980000204608016212908', 'SA2730000000000000123456',
  'SA9145000000123456789012', 'SA0710000000000000000001', 'SA5550000000000000000002']
const masked = iban => `****${iban.slice(-4)}`
const MONEY = ['basicSalary', 'housingAllowance', 'transportAllowance', 'phoneAllowance', 'workNatureAllowance', 'otherAllowance', 'workPressureAllowance']
let app, master, ds, base, created = false, sequence = 0
const B = {}, U = {}

function assertDisposable() { assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system'); if (ds) assert.equal(ds.options.database, database) }
const repo = name => { assertDisposable(); return ds.getRepository(name) }
const raw = (text, values = []) => { assertDisposable(); return ds.query(text, values) }
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
async function upload(user, step, content, fileName, extra = {}) {
  const form = new FormData()
  form.append('file', new Blob([content]), fileName)
  for (const [key, value] of Object.entries(extra)) form.append(key, value)
  const response = await fetch(`${base}/employees/bulk-update/${step}`, { method: 'POST', headers: { Authorization: `Bearer ${token(user)}` }, body: form })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const csv = rows => '﻿' + rows.map(row => row.join(',')).join('\r\n')
function expectStatus(response, status) { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const setting = (key, value) => repo('RequestsConfig').save({ key, value })
async function withSetting(key, action) {
  await setting(key, 'true')
  try { return await action() } finally { await setting(key, 'false') }
}
const today = () => new Date().toLocaleDateString('en-CA')
const datesOf = (from, to) => { const out = []; for (let t = Date.parse(`${from}T12:00:00Z`); t <= Date.parse(`${to}T12:00:00Z`); t += 86400000) out.push(new Date(t).toISOString().slice(0, 10)); return out }
const lastDay = period => new Date(Date.UTC(Number(period.slice(0, 4)), Number(period.slice(5, 7)), 0)).toISOString().slice(0, 10)

async function employee(branch, extra = {}) {
  const n = ++sequence
  return repo('Employee').save({ employeeCode: `OP${String(n).padStart(3, '0')}`, fullName: `موظف الضوابط ${n}`, branchId: branch.id, joinDate: '2020-01-01',
    basicSalary: 9000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0, status: 'active', isActive: true,
    payMethod: 'transfer', iban: IBANS[n % IBANS.length], bankName: 'البنك الأهلي', annualLeaveEntitled: false, ...extra })
}
async function present(emp, period) {
  await repo('AttendanceDay').save(datesOf(`${period}-01`, lastDay(period)).map(date => ({ employeeId: emp.id, branchId: emp.branchId, date, status: 'present',
    checkIn: '08:00', checkOut: '16:00', shiftName: 'وردية الضوابط', shiftStart: '08:00', shiftEnd: '16:00', scheduleSource: 'override', workMinutes: 480,
    lateMinutes: 0, deductibleMinutes: 0, earlyLeaveMinutes: 0 })), { chunk: 100 })
}
async function calculate(period, people, name) {
  for (const emp of people) {
    if (!(await repo('AttendanceDay').count({ where: { employeeId: emp.id, date: `${period}-01` } }))) await present(emp, period)
  }
  return expectStatus(await request(U.admin, 'POST', '/payroll/runs/calculate-defined', { period, scopeType: 'CUSTOM', employeeIds: people.map(emp => emp.id), name }), 201)
}
async function acknowledge(runId) {
  const report = expectStatus(await request(U.admin, 'GET', `/payroll/runs/${runId}/unassigned`), 200)
  expectStatus(await request(U.admin, 'POST', `/payroll/runs/${runId}/unassigned-ack`, { reportHash: report.reportHash }), 201)
}
async function approved(period, people, name, approver = U.boss) {
  const run = await calculate(period, people, name)
  await acknowledge(run.id)
  expectStatus(await request(approver, 'POST', `/payroll/runs/${run.id}/approve`), 201)
  return run
}
const approveEvent = async runId => (await repo('PayrollRunEvent').find({ where: { runId, eventType: 'APPROVED' }, order: { id: 'DESC' } }))[0]
const payload = event => typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload
const paymentRows = employeeId => raw(`SELECT [field], [oldValue], [newValue], [changedByUserId], [source], [requestId] FROM dbo.employee_payment_changes
  WHERE [employeeId] = @0 ORDER BY [id]`, [employeeId])
const shapeOf = rows => rows.map(row => [row.field, row.oldValue, row.newValue, row.changedByUserId, row.source, row.requestId])
const act = (user, id, extra = {}) => request(user, 'POST', `/requests/${id}/act`, { action: 'APPROVE', comment: 'مراجعة الحساب البنكي الجديد', ...extra })
async function transferTo(user, emp, branch, extra = {}) {
  const context = expectStatus(await request(U.admin, 'GET', `/attendance/calendar-context?scope=EMPLOYEE&sourceId=${emp.id}`), 200)
  return request(user, 'PATCH', `/employees/${emp.id}`, { branchId: branch.id, ...extra, calendarChange: { effectiveFrom: today(),
    reason: 'نقل لاختبار فحوص النقل', expectedRevision: context.revision, expectedCurrentSourceHash: context.currentSourceHash } })
}
async function monthlyHistory(actor, emp, periods) {
  const view = expectStatus(await request(U.admin, 'GET', `/payroll/employees/${emp.id}/salary-history`), 200)
  return request(actor, 'POST', `/payroll/employees/${emp.id}/salary-history/monthly`, { expectedRevision: view.revision,
    expectedCurrentSourceHash: view.currentSourceHash, reason: 'تثبيت الأجر لاختبار ضوابط الشخص الواحد', evidenceReference: 'قرار اختباري',
    periods: periods.map(([from, to, basicSalary]) => ({ effectivePayrollPeriod: from, effectiveToPayrollPeriod: to, currency: view.current?.currency ?? 'SAR',
      ...Object.fromEntries(MONEY.map(key => [key, key === 'basicSalary' ? basicSalary : '0.00'])) })) })
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME,
    password: env.DB_PASSWORD, database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource); assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  await app.get(require('../src/settings/config-defaults.service').ConfigDefaultsService).onApplicationBootstrap()
  B.a = await repo('Branch').save({ code: 'OPA', name: 'فرع الضوابط أ' })
  B.b = await repo('Branch').save({ code: 'OPB', name: 'فرع الضوابط ب' })
  const user = (email, role, branch, permissions, employeeId = null) => repo('User').save({ email: `${email}@one-person.invalid`, displayName: email, passwordHash: 'isolated-test-token-only',
    role, branchId: branch?.id ?? null, employeeId, permissions: JSON.stringify(permissions) })
  U.admin = await user('admin', 'super_admin', null, ['*'])
  U.boss = await user('boss', 'super_admin', null, ['*'])
  const hrEmployee = await employee(B.a), finEmployee = await employee(B.a)
  // صاحب الصلاحيات كلها في فرع أ: تعديل الموظفين والأجر والاعتماد والطلبات نيابةً وخطوتين الحساب البنكي (الموارد البشرية والمالية)
  U.hrA = await user('hr-a', 'hr_manager', B.a, ['employees.view', 'employees.edit', 'employees.create', 'payroll.view', 'payroll.approve',
    'requests.view_all', 'requests.create_on_behalf', 'approve.hr', 'approve.finance'], hrEmployee.id)
  U.finA = await user('fin-a', 'employee', B.a, ['approve.finance', 'requests.view_all'], finEmployee.id)
  U.approverA = await user('approver-a', 'employee', B.a, ['payroll.view', 'payroll.approve'])
  U.readerB = await user('reader-b', 'employee', B.b, ['payroll.view'])
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '1' }, { key: 'payroll.monthly_days', value: '30' }, { key: 'payroll.daily_hours', value: '8' },
    { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' }, { key: 'payroll.exempt_overtime_eligible', value: 'false' },
  ])
  const chain = await repo('ApprovalChain').save({ code: 'OP_BANK', nameAr: 'موافقة أمنية (موارد بشرية ثم مالية)', isActive: true, autoApprove: false })
  await repo('ApprovalStep').save([{ chainId: chain.id, stepOrder: 1, approverRole: 'hr' }, { chainId: chain.id, stepOrder: 2, approverRole: 'finance' }])
  await repo('RequestType').save({ code: 'BANK_ACCOUNT_CHANGE', nameAr: 'تغيير الحساب البنكي', category: 'personal_data', destinationHandler: 'payroll_bank_secure',
    approvalChainId: chain.id, isActive: true, requiredFields: JSON.stringify(['iban']) })
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assertDisposable()
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try { fs.rmSync(uploads, { recursive: true, force: true }) } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'one-person controls fixture cleanup failed')
})

test('OP-0: الإعدادات الأربعة مبذورة مقفولة ومسموح بيها في الإعدادات (true/false بس)', async () => {
  for (const key of [...Object.values(KEYS), 'overtime.auto_approve.exclude_manual']) {
    assert.equal((await repo('RequestsConfig').findOneBy({ key }))?.value, 'false', key)
    expectStatus(await request(U.admin, 'PATCH', '/settings/config', { key, value: 'maybe' }), 400)
    expectStatus(await request(U.admin, 'PATCH', '/settings/config', { key, value: 'true' }), 200)
    expectStatus(await request(U.admin, 'PATCH', '/settings/config', { key, value: 'false' }), 200)
  }
})

test('OP-1: سجل تغييرات الصرف — الملف وExcel والطلب والإنشاء بصف لكل حقل اتغيّر بمصدره ومين، والآيبان متخفي، ومن غير صف لو ماتغيرش', async () => {
  const emp = await employee(B.a)
  const [first, second, third] = [emp.iban, IBANS[1] === emp.iban ? IBANS[2] : IBANS[1], IBANS[3] === emp.iban ? IBANS[4] : IBANS[3]]
  // الملف: الآيبان بس اتغيّر
  expectStatus(await request(U.hrA, 'PATCH', `/employees/${emp.id}`, { iban: second, bankName: 'البنك الأهلي' }), 200)
  assert.deepEqual(shapeOf(await paymentRows(emp.id)), [['iban', masked(first), masked(second), U.hrA.id, 'PROFILE', null]])
  // نفس القيمة = مفيش صف
  expectStatus(await request(U.hrA, 'PATCH', `/employees/${emp.id}`, { iban: second }), 200)
  assert.equal((await paymentRows(emp.id)).length, 1)
  // طريقة الصرف ومبلغ التحويل
  expectStatus(await request(U.hrA, 'PATCH', `/employees/${emp.id}`, { payMethod: 'mixed', bankTransferAmount: 1500 }), 200)
  assert.deepEqual(shapeOf((await paymentRows(emp.id)).slice(1)), [['payMethod', 'transfer', 'mixed', U.hrA.id, 'PROFILE', null],
    ['bankTransferAmount', null, '1500.00', U.hrA.id, 'PROFILE', null]])
  // Excel: نفس الكتابة بمصدر ملف Excel
  const result = expectStatus(await upload(U.admin, 'apply', csv([['كود الموظف', 'اسم البنك'], [emp.employeeCode, 'بنك الراجحي']]), 'bank.csv'), 201)
  assert.deepEqual(result.summary, { applied: 1, failed: 0, skipped: 0 })
  assert.deepEqual(shapeOf((await paymentRows(emp.id)).slice(3)), [['bankName', 'البنك الأهلي', 'بنك الراجحي', U.admin.id, 'EXCEL', null]])
  // طلب «تغيير حساب بنكي»: الموارد البشرية ثم المالية — اللي نفّذ = آخر معتمد، ورقم الطلب
  const owner = await repo('User').save({ email: `owner-${emp.id}@one-person.invalid`, displayName: 'صاحب الطلب', passwordHash: 'isolated-test-token-only', role: 'employee',
    branchId: B.a.id, employeeId: emp.id, permissions: '[]' })
  const filed = expectStatus(await request(owner, 'POST', '/requests', { typeCode: 'BANK_ACCOUNT_CHANGE', submit: true, payload: { iban: third, bankName: 'بنك البلاد' } }), 201)
  expectStatus(await act(U.hrA, filed.id), 201)
  expectStatus(await act(U.finA, filed.id), 201)
  assert.equal((await repo('Employee').findOneByOrFail({ id: emp.id })).iban, third)
  assert.deepEqual(shapeOf((await paymentRows(emp.id)).slice(4)), [['iban', masked(second), masked(third), U.finA.id, 'REQUEST', filed.id],
    ['bankName', 'بنك الراجحي', 'بنك البلاد', U.finA.id, 'REQUEST', filed.id]])
  // سجل التغييرات القديم للطلب بقى فيه اللي نفّذ
  const legacy = await repo('EmployeeStatusHistory').findOneByOrFail({ employeeId: emp.id, fieldName: 'iban', requestId: filed.id })
  assert.equal(legacy.changedByUserId, U.finA.id)
  // الإنشاء: صف لكل حقل صرف متسجل (من غير القيم الفاضية)
  const hired = expectStatus(await request(U.hrA, 'POST', '/employees', { ...(await employeeRequiredFields(ds, B.a.id)), branchId: B.a.id, joinDate: '2026-01-01',
    basicSalary: 7000, payMethod: 'transfer', iban: first, bankName: 'البنك الأهلي' }), 201)
  assert.deepEqual(shapeOf(await paymentRows(hired.id)), [['iban', null, masked(first), U.hrA.id, 'CREATE', null], ['bankName', null, 'البنك الأهلي', U.hrA.id, 'CREATE', null],
    ['payMethod', null, 'transfer', U.hrA.id, 'CREATE', null]])
  // مفيش آيبان كامل في السجل خالص
  const all = await raw('SELECT [oldValue], [newValue] FROM dbo.employee_payment_changes')
  for (const iban of IBANS) assert.ok(!JSON.stringify(all).includes(iban.slice(4)), 'الآيبان متخفي')
})

let changesRun
test('OP-2: «اتغيّر إيه من آخر مسير» — الراتب قبل وبعد، وتغيير الراتب والآيبان بمين وإمتى، والجديد، والخارج، وبنطاق الفرع', async () => {
  const series = `مسير الضوابط ${crypto.randomUUID().slice(0, 6)}`
  const changed = await employee(B.a), steady = await employee(B.a), leaver = await employee(B.a)
  // أجر موثق من يناير (قبل المسير الأول) بإيد مدير النظام
  expectStatus(await monthlyHistory(U.admin, changed, [['2026-01', null, '9000.00']]), 201)
  const first = await approved('2026-05', [changed, steady, leaver], series)
  const approvedAt = (await repo('PayrollRun').findOneByOrFail({ id: first.id })).approvedAt
  // بعد اعتماده: الموارد البشرية بتغيّر الأجر من يونيو، والآيبان
  expectStatus(await monthlyHistory(U.hrA, changed, [['2026-01', '2026-05', '9000.00'], ['2026-06', null, '9500.00']]), 201)
  const newIban = IBANS.find(iban => iban !== changed.iban)
  expectStatus(await request(U.hrA, 'PATCH', `/employees/${changed.id}`, { iban: newIban }), 200)
  const newcomer = await employee(B.a)
  const run = changesRun = await calculate('2026-06', [changed, steady, newcomer], series)
  const view = expectStatus(await request(U.hrA, 'GET', `/payroll/runs/${run.id}/changes`), 200)
  assert.deepEqual([view.runId, view.period, view.previousSeriesPeriod], [run.id, '2026-06', '2026-05'])
  assert.deepEqual(view.counts, { changed: 1, new: 1, leavers: 1 })
  const row = view.rows.find(item => item.employeeId === changed.id)
  assert.deepEqual([row.isNew, row.previousPeriod, row.salary, row.payMethod], [false, '2026-05', { previous: 9000, current: 9500 }, null])
  assert.deepEqual(row.changes.map(change => [change.kind, change.field, change.oldValue, change.newValue, change.changedByUserId, change.changedByName, change.source]),
    [['SALARY', null, null, null, U.hrA.id, 'hr-a', null], ['PAYMENT', 'iban', masked(changed.iban), masked(newIban), U.hrA.id, 'hr-a', 'تعديل الملف']])
  for (const change of row.changes) assert.ok(Date.parse(change.changedAt) > approvedAt.getTime(), `${change.kind} بعد اعتماد المسير اللي فات`)
  assert.equal(row.changes[0].reason, 'تثبيت الأجر لاختبار ضوابط الشخص الواحد')
  const fresh = view.rows.find(item => item.employeeId === newcomer.id)
  assert.deepEqual([fresh.isNew, fresh.previousPeriod, fresh.changes], [true, null, []])
  assert.equal(view.rows.some(item => item.employeeId === steady.id), false, 'اللي ماتغيرش مابيظهرش')
  assert.deepEqual(view.leavers.map(item => [item.employeeId, item.employeeCode, item.fullName]), [[leaver.id, leaver.employeeCode, leaver.fullName]])
  // الرد من غير رقم المسير اللي فات (الشهر بس)
  assert.ok(!JSON.stringify(view).includes(`"previousRunId"`))
  // بنطاق الفرع: قارئ فرع ب مايوصلش للمسير
  assert.ok([403, 404].includes((await request(U.readerB, 'GET', `/payroll/runs/${run.id}/changes`)).status))
  // من غير صلاحية عرض الرواتب
  expectStatus(await request(U.finA, 'GET', `/payroll/runs/${run.id}/changes`), 403)
})

test('OP-3: «اللي غيّر مايعتمدش لوحده» — مقفول زي النهارده؛ مفتوح رفض برسالة، وحد تاني بيعتمد، ومدير النظام بسبب بيعدّي ويتسجل', async () => {
  // مقفول: الموارد البشرية اللي غيّرت الأجر والآيبان بتعتمد زي النهارده، والحدث من غير المفتاح الجديد
  await acknowledge(changesRun.id)
  expectStatus(await request(U.hrA, 'POST', `/payroll/runs/${changesRun.id}/approve`), 201)
  assert.equal('onePersonControl' in payload(await approveEvent(changesRun.id)), false)

  await withSetting(KEYS.changers, async () => {
    const series = `مسير الضابط ${crypto.randomUUID().slice(0, 6)}`
    const emp = await employee(B.a), other = await employee(B.a)
    await approved('2026-07', [emp, other], series)
    // الموارد البشرية بتغيّر آيبان موظف واحد في المسير الجاي
    expectStatus(await request(U.hrA, 'PATCH', `/employees/${emp.id}`, { iban: IBANS.find(iban => iban !== emp.iban) }), 200)
    let run = await calculate('2026-08', [emp, other], series)
    await acknowledge(run.id)
    const refused = await request(U.hrA, 'POST', `/payroll/runs/${run.id}/approve`)
    assert.equal(refused.status, 403, JSON.stringify(refused.body))
    assert.equal(refused.body.code, 'PAYRUN-RECENT-CHANGER'); assert.deepEqual(refused.body.employeeIds, [emp.id])
    assert.match(refused.body.message, /ماينفعش تعتمده لوحدك/); assert.doesNotMatch(refused.body.message, /سبب التعدّي/, 'السبب لمدير النظام بس')
    // السبب من غير مدير النظام مالوش أثر
    assert.equal((await request(U.hrA, 'POST', `/payroll/runs/${run.id}/approve`, { overrideReason: 'سبب طويل كفاية من الموارد البشرية' })).status, 403)
    assert.equal((await repo('PayrollRun').findOneByOrFail({ id: run.id })).status, 'CALCULATED')
    // حد تاني ماغيّرش حاجة بيعتمد عادي
    expectStatus(await request(U.approverA, 'POST', `/payroll/runs/${run.id}/approve`), 201)
    assert.equal('onePersonControl' in payload(await approveEvent(run.id)), false)

    // مدير النظام اللي غيّر: رفض، والسبب القصير مرفوض، و10 حروف بتعدّي وتتسجل
    expectStatus(await request(U.boss, 'PATCH', `/employees/${other.id}`, { iban: IBANS.find(iban => iban !== other.iban) }), 200)
    run = await calculate('2026-09', [emp, other], series)
    await acknowledge(run.id)
    const bossRefused = await request(U.boss, 'POST', `/payroll/runs/${run.id}/approve`)
    assert.equal(bossRefused.status, 403, JSON.stringify(bossRefused.body))
    assert.deepEqual(bossRefused.body.employeeIds, [other.id]); assert.match(bossRefused.body.message, /سبب التعدّي \(10 حروف على الأقل\)/)
    assert.equal((await request(U.boss, 'POST', `/payroll/runs/${run.id}/approve`, { overrideReason: 'قصير' })).status, 403)
    const reason = 'المدير المالي في إجازة والصرف مستعجل'
    expectStatus(await request(U.boss, 'POST', `/payroll/runs/${run.id}/approve`, { overrideReason: `  ${reason}  ` }), 201)
    assert.deepEqual(payload(await approveEvent(run.id)).onePersonControl, { changedEmployeeIds: [other.id], secondApprover: false, overrideReason: reason })
  })
})

test('OP-4: نفس الضابط في سلسلة الاعتماد — معتمد تاني قبله بيعدّي ويتسجل؛ سلسلة بخطوة واحدة رفض، ومدير النظام بسبب بيعدّي', async () => {
  await withSetting(KEYS.changers, async () => {
    const series = `مسير السلسلة ${crypto.randomUUID().slice(0, 6)}`
    const emp = await employee(B.a)
    await approved('2026-03', [emp], series)
    expectStatus(await request(U.hrA, 'PATCH', `/employees/${emp.id}`, { iban: IBANS.find(iban => iban !== emp.iban) }), 200)
    let run = await calculate('2026-04', [emp], series)
    // سلسلة المسير: معتمد فرع أ ثم الموارد البشرية (اللي غيّرت) = الاعتماد النهائي
    let config = expectStatus(await request(U.admin, 'GET', '/payroll/approval-chain/config'), 200)
    expectStatus(await request(U.admin, 'PUT', '/payroll/approval-chain/config/series', { seriesName: series, steps: [{ kind: 'USER', userId: U.approverA.id },
      { kind: 'USER', userId: U.hrA.id }], expectedRevision: config.overrides.find(row => row.seriesName === series)?.revision ?? 0 }), 200)
    await acknowledge(run.id)
    await writeParityReasonsBeforeApproval(request, U.admin, 'POST', `/payroll/runs/${run.id}/approve`)
    expectStatus(await request(U.approverA, 'POST', `/payroll/runs/${run.id}/approval-chain/approve`), 201)
    expectStatus(await request(U.hrA, 'POST', `/payroll/runs/${run.id}/approval-chain/approve`), 201)
    assert.equal((await repo('PayrollRun').findOneByOrFail({ id: run.id })).status, 'APPROVED')
    assert.deepEqual(payload(await approveEvent(run.id)).onePersonControl, { changedEmployeeIds: [emp.id], secondApprover: true, overrideReason: null })

    // سلسلة بخطوة واحدة صاحبها مدير النظام اللي غيّر: رفض، وبالسبب بيعدّي
    expectStatus(await request(U.boss, 'PATCH', `/employees/${emp.id}`, { iban: IBANS.find(iban => iban !== emp.iban && iban !== IBANS[0]) }), 200)
    run = await calculate('2026-05', [emp], series)
    config = expectStatus(await request(U.admin, 'GET', '/payroll/approval-chain/config'), 200)
    expectStatus(await request(U.admin, 'PUT', '/payroll/approval-chain/config/series', { seriesName: series, steps: [{ kind: 'USER', userId: U.boss.id }],
      expectedRevision: config.overrides.find(row => row.seriesName === series).revision }), 200)
    await acknowledge(run.id)
    await writeParityReasonsBeforeApproval(request, U.admin, 'POST', `/payroll/runs/${run.id}/approve`)
    const refused = await request(U.boss, 'POST', `/payroll/runs/${run.id}/approval-chain/approve`)
    assert.equal(refused.status, 403, JSON.stringify(refused.body)); assert.equal(refused.body.code, 'PAYRUN-RECENT-CHANGER')
    assert.equal((await repo('PayrollRun').findOneByOrFail({ id: run.id })).status, 'CALCULATED')
    assert.equal(await repo('PayrollRunApproval').count({ where: { runId: run.id } }), 0, 'الخطوة اترجعت مع الرفض')
    expectStatus(await request(U.boss, 'POST', `/payroll/runs/${run.id}/approval-chain/approve`, { overrideReason: 'سلسلة بخطوة واحدة والمراجع غايب' }), 201)
    assert.deepEqual(payload(await approveEvent(run.id)).onePersonControl, { changedEmployeeIds: [emp.id], secondApprover: false, overrideReason: 'سلسلة بخطوة واحدة والمراجع غايب' })
    // نشيل السلسلة الخاصة عشان باقي الاختبارات
    config = expectStatus(await request(U.admin, 'GET', '/payroll/approval-chain/config'), 200)
    expectStatus(await request(U.admin, 'PUT', '/payroll/approval-chain/config/series', { seriesName: series, steps: [],
      expectedRevision: config.overrides.find(row => row.seriesName === series).revision }), 200)
  })
})

test('OP-5: المسار الأمني للحساب البنكي — مقفول زي النهارده؛ مفتوح التعديل وExcel مرفوضين للآيبان والبنك، والطلب نيابةً في سلسلته، ونفس الشخص مايعتمدش الخطوتين', async () => {
  const emp = await employee(B.a)
  const target = IBANS.find(iban => iban !== emp.iban)
  // مقفول: الطلب نيابةً من صاحب سلطة الموارد البشرية بيتعتمد على طول (زي النهارده)
  const instant = expectStatus(await request(U.hrA, 'POST', '/requests', { typeCode: 'BANK_ACCOUNT_CHANGE', submit: true, onBehalfEmployeeId: emp.id,
    payload: { iban: target, bankName: 'بنك الجزيرة' } }), 201)
  assert.equal((await repo('Request').findOneByOrFail({ id: instant.id })).status, 'COMPLETED')
  assert.equal((await repo('Employee').findOneByOrFail({ id: emp.id })).iban, target)

  await withSetting(KEYS.bank, async () => {
    const before = await repo('Employee').findOneByOrFail({ id: emp.id })
    const other = IBANS.find(iban => iban !== before.iban)
    // الملف: الآيبان أو البنك مرفوضين برسالة الطلب، ومن غير أي كتابة
    for (const body of [{ iban: other }, { bankName: 'بنك آخر' }, { iban: other, fullName: before.fullName }]) {
      const refused = await request(U.hrA, 'PATCH', `/employees/${emp.id}`, body)
      assert.equal(refused.status, 400, JSON.stringify(refused.body)); assert.match(refused.body.message, /طلب «تغيير حساب بنكي»/)
    }
    // نفس القيمة مش تغيير — بيعدّي، وطريقة الصرف من الملف مسموحة وبتتسجل
    expectStatus(await request(U.hrA, 'PATCH', `/employees/${emp.id}`, { iban: before.iban, bankName: before.bankName }), 200)
    expectStatus(await request(U.hrA, 'PATCH', `/employees/${emp.id}`, { payMethod: 'cash' }), 200)
    const after = await repo('Employee').findOneByOrFail({ id: emp.id })
    assert.deepEqual([after.iban, after.bankName, after.payMethod], [before.iban, before.bankName, 'cash'])
    // Excel: الصف بيترفض والآيبان زي ما هو
    const sheet = await upload(U.admin, 'apply', csv([['كود الموظف', 'الآيبان'], [emp.employeeCode, other]]), 'iban.csv')
    assert.notEqual(sheet.body?.summary?.applied, 1, JSON.stringify(sheet.body))
    assert.equal((await repo('Employee').findOneByOrFail({ id: emp.id })).iban, before.iban)
    // الطلب نيابةً: مابيتعتمدش على طول — بيقف عند الموارد البشرية
    const filed = expectStatus(await request(U.hrA, 'POST', '/requests', { typeCode: 'BANK_ACCOUNT_CHANGE', submit: true, onBehalfEmployeeId: emp.id,
      payload: { iban: other, bankName: 'بنك الإنماء' } }), 201)
    let row = await repo('Request').findOneByOrFail({ id: filed.id })
    assert.notEqual(row.status, 'COMPLETED'); assert.equal(row.currentStep, 1)
    // الموارد البشرية بتعتمد خطوتها، ونفس الشخص (معاه صلاحية المالية) مايعتمدش الخطوة التانية
    expectStatus(await act(U.hrA, filed.id), 201)
    const twice = await act(U.hrA, filed.id)
    assert.equal(twice.status, 403, JSON.stringify(twice.body)); assert.match(twice.body.message, /لازم حد تاني يعتمد الخطوة دي/)
    row = await repo('Request').findOneByOrFail({ id: filed.id })
    assert.equal(row.currentStep, 2); assert.equal((await repo('Employee').findOneByOrFail({ id: emp.id })).iban, before.iban)
    // المالية (شخص تاني) بتعتمد، والتغيير بينزل
    expectStatus(await act(U.finA, filed.id), 201)
    assert.equal((await repo('Employee').findOneByOrFail({ id: emp.id })).iban, other)
  })
  // مقفول تاني: التعديل من الملف شغال زي الأول
  expectStatus(await request(U.hrA, 'PATCH', `/employees/${emp.id}`, { iban: emp.iban }), 200)
})

test('OP-6: فحوص النقل من التعديل وExcel — مقفول زي النهارده؛ مفتوح العهدة المفتوحة أو المدير في فرع تاني بيمنع النقل من غير أي تغيير', async () => {
  const manager = await employee(B.a)
  const withCustody = await employee(B.a), withManager = await employee(B.a, { managerEmployeeId: manager.id }), free = await employee(B.a)
  const asset = await repo('Asset').save({ name: 'لابتوب الضوابط', category: 'أجهزة', status: 'ASSIGNED', currentHolderId: withCustody.id })
  await repo('CustodyAssignment').save({ assetId: asset.id, employeeId: withCustody.id, status: 'ACTIVE' })
  // مقفول: النقل بالعهدة شغال زي النهارده
  const plain = await employee(B.a)
  await repo('CustodyAssignment').save({ assetId: asset.id, employeeId: plain.id, status: 'ACTIVE' })
  expectStatus(await transferTo(U.admin, plain, B.b), 200)
  assert.equal((await repo('Employee').findOneByOrFail({ id: plain.id })).branchId, B.b.id)

  await withSetting(KEYS.transfer, async () => {
    const custody = await transferTo(U.admin, withCustody, B.b)
    assert.equal(custody.status, 400, JSON.stringify(custody.body)); assert.match(custody.body.message, /عهدة مفتوحة/)
    const managed = await transferTo(U.admin, withManager, B.b)
    assert.equal(managed.status, 400, JSON.stringify(managed.body)); assert.match(managed.body.message, /المدير المباشر في فرع تاني/)
    for (const emp of [withCustody, withManager]) assert.equal((await repo('Employee').findOneByOrFail({ id: emp.id })).branchId, B.a.id)
    // شيل المدير مع النقل بيعدّي
    expectStatus(await transferTo(U.admin, withManager, B.b, { managerEmployeeId: null }), 200)
    // Excel: نفس الفحص
    const sheet = await upload(U.admin, 'apply', csv([['كود الموظف', 'الفرع'], [withCustody.employeeCode, B.b.name]]), 'move.csv',
      { orgEffectiveFrom: today(), orgReason: 'نقل جماعي لاختبار فحوص النقل' })
    assert.notEqual(sheet.body?.summary?.applied, 1, JSON.stringify(sheet.body))
    assert.equal((await repo('Employee').findOneByOrFail({ id: withCustody.id })).branchId, B.a.id)
    // من غير عهدة ولا مدير: النقل عادي
    expectStatus(await transferTo(U.admin, free, B.b), 200)
  })
})
