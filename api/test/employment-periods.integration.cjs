'use strict'
// B2.10: فترات الخدمة وإعادة التعيين، على قاعدة SQL مؤقتة معزولة بتتمسح في الآخر (hr_employment_periods_test_<16 hex>).
//  EP-01) الإرجاع القديم («العودة على رأس العمل»): موظف ملفه مُصفّى بيرجع بسبب مكتوب بس (من 5 حروف لـ500) والسبب في سجله؛
//         والمؤرشف أو المنتهي من غير تصفية زي ما هو؛ والحكم بالصلاحية والنطاق زي الأول.
//  EP-02) «إعادة تعيين» بعد سنة: فترة الخدمة القديمة اتسجّلت، وتاريخ التعيين اتحرّك والعقد القديم اتفضّى والحساب اتفتح بسطر تدقيق؛ ومكافأته ورصيده
//         ومعاينة تصفيته زي موظف جديد اتعيّن في نفس اليوم بالحرف، والمسير والحضور بيغطّوه من تاريخ المباشرة؛ ورصيد الفترة القديمة متجمّد بمفتاحها.
//  EP-03) الرفض: مش منتهي، من غير ملف مقفول، ملف مفتوح أو مجهول الحالة، أكتر من نهاية، تاريخ أو سبب غلط، تاريخ بدري أو بعيد، ومن غير
//         الصلاحية أو برّه النطاق — ومفيش حاجة بتتغيّر.
//  EP-04) المسير: المباشرة بعد نهاية شهر الرواتب اللي فيه آخر يوم عمل (بالدورة وبنهاية أي مسير بيغطّيه)، ومسير الشهر ده لازم يبقى معتمد والموظف فيه
//         (وبنده مش معكوس)، ومسير قديم لسه مااتعتمدش وهو داخل فيه بيمنع؛ وحد جاي من مسير القارئ مايشوفوش بيقفل الإتاحة عنده.
//  EP-05) رصيد الإجازات بعد إعادة التعيين: إجازة قديمة بتتلغى مابترجعش على الرصيد الجديد، والترحيل السنوي والإقفال والتجديد اليومي
//         مابيشوفوش صفوف الفترة المقفولة (بأساس السنة وبأساس ذكرى التعيين) — والنتيجة زي موظف جديد بنفس التاريخ.
//  EP-06) إعادة تعيين تانية بتقفل الفترة التانية بمفتاحها، وطلبين في نفس اللحظة واحد بس بينجح، وإعادة التعيين بتستنى قفل مالية الموظف.
//  EP-07) (CRP2V-B-B01) إجازة معتمدة بعد آخر يوم عمل بتمنع إعادة التعيين لحد ما تتلغى (ورصيدها بيرجع على الخدمة القديمة)؛ وتاريخ جوه فترة
//         مقفولة مالوش خصم ولا إرجاع؛ والخصم والإرجاع مابيستنوش صف موظف ممسوك (409).
//  EP-08) (CRP2V-B-B02) الترحيل السنوي والتجديد اليومي بيحكموا ويكتبوا وصف الموظف ممسوك وبقراءات بعد القفل: مُرحّل الفترة القديمة مايوصلش للجديدة.
//  EP-09) (CRP2V-B-B03) حساب المسير بيحكم على موظفيه ببيانات اتقرت بعد قفل المالية، واللي دخل النطاق بعد القراءة الأولى بيتقفل هو كمان.
//  EP-10) (CRP2V-B-B04) مرجع مسير مخفي عن القارئ (شهره أو نهايته) مابيظهرش في قراءة الفترات ولا في رفض إعادة التعيين، ولا بيتخمّن بتجربة تواريخ.
//  EP-11) (CRP2W-B01) أثر تعديل ملف الموظف على الرصيد (الرصيد الافتتاحي واستحقاق السنوي) جوه معاملة التعديل وتحت صف الموظف: إعادة التعيين
//         بتستنى، والنتيجة ترتيب كامل — رصيد افتتاحي من الخدمة القديمة مابيوصلش للفترة الجديدة.
//  EP-12) (CRP2W-B02) فحص الرصيد مابيكتبش صف (الصف الناقص بيتعمل وقت الخصم تحت القفل)، وصفوف السنة الناقصة بتتعمل وصف الموظف ممسوك
//         وبقراءة بعده: صف بمفتاح ذكرى تعيين قديمة مابيتكتبش بعد إعادة التعيين، واعتماد طلب قديم مابيصرفش بأكتر من المتاح.
//  EP-13) (CRP2W، مسح الصنف) معالج طلب بيحفظ كيان الموظف كله (حساب بنكي، ترقية، حالة وظيفية) بيقراه وصفه مقفول: اعتماد طلب قديم عبر
//         إعادة التعيين مابيرجّعش تاريخ التعيين القديم.
// Run (من api/): node --test test/employment-periods.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const { employeeRequiredFields } = require('./helpers/employee-fixture.cjs')

const database = `hr_employment_periods_test_${crypto.randomBytes(8).toString('hex')}`
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, master, ds, base, created = false, employeeNumber = 0
const org = {}, users = {}
const NEEDS_REASON = [400, 'الموظف ده خدمته انتهت وملفه اتصفّى. الإرجاع بيكمّل مدة خدمته ورصيد إجازاته من تاريخ تعيينه القديم — اكتب سبب الإرجاع (5 حروف على الأقل)']

function assertDisposable() {
  assert.match(database, /^hr_employment_periods_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
const query = (text, params = []) => { assertDisposable(); return ds.query(text, params) }
const payloadOf = user => ({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false,
  permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt.sign(payloadOf(user))}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  let parsed = null
  try { parsed = text ? JSON.parse(text) : null } catch { parsed = text }
  return { status: response.status, body: parsed }
}
function expectStatus(response, status) {
  assert.equal(response.status, status, JSON.stringify(response.body))
  return response.body
}
const answer = response => [response.status, [].concat(response.body?.message ?? []).join('، ')]
const employee = (extra = {}) => {
  const number = ++employeeNumber
  return repo('Employee').save({ employeeCode: `EP${String(number).padStart(3, '0')}`, fullName: `موظف الفترات ${number}`, branchId: org.branchA.id, joinDate: '2020-01-01',
    basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'transfer', ...extra })
}
const account = (label, role, permissions, extra = {}) => repo('User').save({ email: `${label}@employment-periods.invalid`, displayName: `حساب ${label}`, passwordHash: 'test-only',
  role, branchId: org.branchA.id, permissions: JSON.stringify(permissions), isActive: true, ...extra })
// موظف خدمته انتهت: منتهي وحسابه مقفول، وملف إنهاء بالحالة المطلوبة (أو من غير ملف)
async function ended(caseStatus, extra = {}) {
  const emp = await employee({ status: 'terminated', isActive: false, archivedAt: new Date(), ...extra })
  const login = await account(`ended${emp.id}`, 'employee', [], { employeeId: emp.id, isActive: false })
  const kase = caseStatus ? await repo('OffboardingCase').save({ employeeId: emp.id, lastWorkingDay: '2025-06-30', status: caseStatus, terminationReason: 'resignation' }) : null
  return { emp, login, kase }
}
const reactivate = (user, emp, body) => request(user, 'POST', `/employees/${emp.id}/reactivate`, body)
const stateOf = async ({ emp, login }) => {
  const [row, user] = [await repo('Employee').findOneByOrFail({ id: emp.id }), await repo('User').findOneByOrFail({ id: login.id })]
  return [row.status, row.isActive, user.isActive, user.tokenVersion]
}
const historyOf = emp => query(`SELECT [oldStatus], [newStatus], [reason], [changedByUserId] FROM [employee_status_history] WHERE [employeeId] = @0 ORDER BY [id]`, [emp.id])

// ===== «إعادة تعيين» =====
const TODAY = (() => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}` })()
const YEAR = TODAY.slice(0, 4), LAST_YEAR = String(Number(YEAR) - 1), NEXT_YEAR = String(Number(YEAR) + 1)
const plusDays = (day, days) => new Date(Date.parse(`${day}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10)
// موظف خدمته انتهت بملف إنهاء مقفول (آخر يوم عمل قابل للتغيير) وحسابه مقفول
async function settled(lastWorkingDay = `${LAST_YEAR}-06-30`, extra = {}) {
  const emp = await employee({ status: 'terminated', isActive: false, archivedAt: new Date(), archiveReason: 'انتهاء خدمة', ...extra })
  const login = await account(`settled${emp.id}`, 'employee', [], { employeeId: emp.id, isActive: false })
  const kase = await repo('OffboardingCase').save({ employeeId: emp.id, lastWorkingDay, status: 'CLOSED', terminationReason: 'resignation' })
  return { emp, login, kase }
}
const rehire = (user, emp, body) => request(user, 'POST', `/employees/${emp.id}/rehire`, body)
const periodsOf = (user, emp) => request(user, 'GET', `/employees/${emp.id}/employment-periods`)
const periodRows = emp => query(`SELECT [periodNo], CONVERT(varchar(10), [startDate], 23) AS [startDate], CONVERT(varchar(10), [endDate], 23) AS [endDate], [exitReason], [offboardingCaseId],
  [rehireReason], [rehiredByUserId] FROM [employment_periods] WHERE [employeeId] = @0 ORDER BY [periodNo]`, [emp.id])
const balanceRows = async emp => (await query(`SELECT [balanceType], [period], CAST([taken] AS float) AS [taken], CAST([openingDays] AS float) AS [openingDays],
  CAST([openingTaken] AS float) AS [openingTaken], CAST([adjustmentDays] AS float) AS [adjustmentDays] FROM [leave_balances] WHERE [employeeId] = @0 ORDER BY [balanceType], [period]`, [emp.id]))
  .map(row => [row.balanceType, row.period, row.taken, row.openingDays, row.openingTaken, row.adjustmentDays])
const balance = (emp, type, period, extra = {}) => repo('LeaveBalance').save({ employeeId: emp.id, balanceType: type, period, entitled: type === 'annual' ? 21 : 180, taken: 0, openingDays: 0, openingTaken: 0, ...extra })
// موظف جديد اتعيّن في التاريخ ده وله صفوف السنة الحالية — المرجع اللي المُعاد تعيينه لازم يطابقه
async function hiredOn(joinDate) {
  const emp = await employee({ joinDate })
  await balance(emp, 'annual', YEAR); await balance(emp, 'sick', YEAR)
  return emp
}
const withoutIdentity = views => views.map(({ employeeId, ...view }) => view)
const balancesOf = async emp => withoutIdentity(expectStatus(await request(users.admin, 'GET', `/leaves/balances/${emp.id}`), 200))
// معاينة تصفية الموظف لو خدمته انتهت في اليوم ده: مدة الخدمة، وشرائح المكافأة، وبنود التصفية (المكافأة وبدل الرصيد)
async function settlementPreview(emp, lastWorkingDay) {
  const body = expectStatus(await request(users.admin, 'GET', `/offboarding/preview?employeeId=${emp.id}&reason=termination&lastWorkingDay=${lastWorkingDay}`), 200)
  return { serviceYears: body.serviceYears, eos: body.eos, lines: body.lines.map(line => [line.label, line.type, Number(line.amount)]) }
}
const refusal = response => [response.status, response.body?.code ?? null]
const unchanged = async ({ emp, login }) => [await stateOf({ emp, login }), await periodRows(emp)]
const NOT_ENDED = ['terminated', false, false, 0]
let runNumber = 0
const run = extra => repo('PayrollRun').save({ name: `مسير اختبار الفترات ${++runNumber}`, period: `${LAST_YEAR}-06`, startDate: `${LAST_YEAR}-06-01`, endDate: `${LAST_YEAR}-06-30`, status: 'PAID', runType: 'REGULAR', ...extra })
// عضوية الموظف في المسير محفوظة بلقطة فرعه وقتها (الافتراضي فرع القارئ «أ»، فالقارئ يشوف المسير للموظف ده)
const member = (payrollRun, emp, membershipStatus = 'INCLUDED', branchId = org.branchA.id) =>
  repo('PayrollRunMember').save({ runId: payrollRun.id, employeeId: emp.id, membershipStatus, snapshot: { branchId } })
// الوعد خلص (نجاح أو فشل) جوه المهلة؟
const settledWithin = (promise, ms) => Promise.race([promise.then(() => true, () => true), new Promise(resolve => setTimeout(() => resolve(false), ms))])
// اتصال تاني ماسك صف الموظف (زي تعديل ملفه أو إعادة تعيينه) لحد release — المنادي بيفكّه في finally
async function holdEmployeeRow(emp) {
  assertDisposable()
  const runner = ds.createQueryRunner()
  await runner.connect()
  await runner.startTransaction()
  await runner.query('SELECT [id] FROM [employees] WITH (UPDLOCK, ROWLOCK) WHERE [id] = @0', [emp.id])
  return { runner, release: async () => { if (runner.isTransactionActive) await runner.rollbackTransaction(); if (!runner.isReleased) await runner.release() } }
}
const item = (payrollRun, emp) => repo('PayrollItem').save({ runId: payrollRun.id, employeeId: emp.id, basicSalary: 1000, netPay: 1000, payMethod: 'transfer' })
const setConfig = async (key, value) => {
  await query(`DELETE FROM [requests_config] WHERE [key] = @0`, [key])
  await query(`INSERT INTO [requests_config] ([key], [value]) VALUES (@0, @1)`, [key, value])
}
const leaves = () => app.get(require('../src/requests/leave-balances.service').LeaveBalancesService)

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  // مفيش رسالة بريد حقيقية بتطلع من الاختبار
  const { MailService } = require('../src/auth/mail.service')
  const mail = app.get(MailService)
  mail.isConfigured = () => false
  mail.send = async () => { throw new Error('no mail in tests') }
  assert.notEqual(mail.send, MailService.prototype.send)
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`

  org.branchA = await repo('Branch').save({ code: 'EP_A', name: 'فرع الفترات أ' })
  org.branchB = await repo('Branch').save({ code: 'EP_B', name: 'فرع الفترات ب' })
  users.admin = await account('admin', 'super_admin', [], { branchId: null, scopeAllBranches: true })
  users.archiver = await account('archiver', 'employee', ['employees.view', 'employees.archive'])
  users.viewer = await account('viewer', 'employee', ['employees.view', 'employees.edit'])
  users.farArchiver = await account('fararchiver', 'employee', ['employees.view', 'employees.archive'], { branchId: org.branchB.id })
  users.hirer = await account('hirer', 'employee', ['employees.view', 'employees.create'])
  users.farHirer = await account('farhirer', 'employee', ['employees.view', 'employees.create'], { branchId: org.branchB.id })
  users.creatorOnly = await account('creatoronly', 'employee', ['employees.create'])
  users.revoker = await account('revoker', 'employee', ['leaves.revoke'])
  // دورة الرواتب شهر ميلادي (الافتراضي في الاختبارات دي)، وسياسة الإجازات صريحة عشان الأرقام تبقى ثابتة
  await setConfig('payroll.cycle_start_day', '1')
  for (const [key, value] of [['leave.accrual_mode', 'monthly'], ['leave.probation_months', '0'], ['leave.annual_entitled', '21'], ['leave.sick_entitled', '180'],
    ['leave.carryover_max_days', '10'], ['leave.carryover_expiry_months', '3']]) await setConfig(key, value)
  const annual = await repo('LeaveType').findOneBy({ code: 'ANNUAL' })
  org.annualType = await repo('LeaveType').save({ ...(annual ?? { code: 'ANNUAL', nameAr: 'إجازة سنوية' }), category: 'ANNUAL', balanceType: 'annual', isActive: true, annualDays: 21,
    renewalBasis: 'YEAR_START', carryOverEnabled: true, carryOverMaxDays: 10, entitlementStartMonths: 0, firstYearProrated: true })
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
  if (errors.length) throw errors[0]
})

test('EP-01: الإرجاع القديم — موظف ملفه مُصفّى بيرجع بسبب مكتوب بس والسبب في سجله، ومن غير تصفية زي ما هو', async () => {
  // من غير تصفية (منتهي من غير ملف، أو ملفه اتلغى، أو مؤرشف): زي الأول بالحرف، من غير سبب
  for (const [caseStatus, extra, reason] of [[null, {}, 'عودة على رأس العمل بعد انتهاء خدمة'], ['CANCELLED', {}, 'عودة على رأس العمل بعد انتهاء خدمة'], [null, { status: 'archived' }, 'إعادة تفعيل من الأرشيف']]) {
    const plain = await ended(caseStatus, extra)
    expectStatus(await reactivate(users.archiver, plain.emp), 201)
    assert.deepEqual([await stateOf(plain), (await historyOf(plain.emp)).map(row => [row.newStatus, row.reason, row.changedByUserId])],
      [['active', true, true, 1], [['active', reason, users.archiver.id]]], String(caseStatus ?? extra.status ?? 'no case'))
  }
  // وسبب اختياري لو اتكتب بيتسجّل
  const noted = await ended(null)
  expectStatus(await reactivate(users.archiver, noted.emp, { reason: '  رجع بعد إجازة طويلة  ' }), 201)
  assert.deepEqual((await historyOf(noted.emp)).map(row => row.reason), ['عودة على رأس العمل بعد انتهاء خدمة — رجع بعد إجازة طويلة'])

  // ملف مُصفّى (مقفول، أو تصفيته معتمدة): من غير سبب مرفوض برسالته وكوده، ومفيش حاجة اتغيّرت
  for (const caseStatus of ['CLOSED', 'SETTLED']) {
    const settled = await ended(caseStatus)
    for (const body of [undefined, {}, { reason: '' }, { reason: '    ' }, { reason: 'قصير' }, { reason: 5 }, { reason: null }]) {
      const refused = await reactivate(users.archiver, settled.emp, body)
      assert.deepEqual([answer(refused), refused.body.code], [NEEDS_REASON, 'SETTLED_RETURN_REASON_REQUIRED'], `${caseStatus} ${JSON.stringify(body)}`)
    }
    assert.deepEqual(answer(await reactivate(users.archiver, settled.emp, { reason: 'س'.repeat(501) })), [400, 'سبب الإرجاع بحد أقصى 500 حرف'])
    assert.deepEqual([await stateOf(settled), await historyOf(settled.emp)], [['terminated', false, false, 0], []])
    // بسبب مكتوب: بيرجع، والسبب في سطر سجله باسم اللي رجّعه، وحسابه اتفتح وجلساته القديمة اتبطّلت
    const back = expectStatus(await reactivate(users.archiver, settled.emp, { reason: ' اتعيّن تاني بعقد جديد ' }), 201)
    assert.deepEqual([back.status, await stateOf(settled)], ['active', ['active', true, true, 1]])
    assert.deepEqual((await historyOf(settled.emp)).map(row => [row.oldStatus, row.newStatus, row.reason, row.changedByUserId]),
      [['terminated', 'active', 'عودة على رأس العمل بعد انتهاء خدمة — اتعيّن تاني بعقد جديد', users.archiver.id]])
    // ومؤرشف ملفه القديم مُصفّى: نفس الشرط
    await repo('Employee').update({ id: settled.emp.id }, { status: 'archived', isActive: false })
    assert.deepEqual(answer(await reactivate(users.archiver, settled.emp)), NEEDS_REASON)
    expectStatus(await reactivate(users.archiver, settled.emp, { reason: 'إرجاع من الأرشيف' }), 201)
  }
  // الصلاحية والنطاق والحالة زي الأول: من غير «أرشفة» 403، وبرّه النطاق «غير موجود»، وموظف نشط مرفوض — قبل أي سؤال عن السبب
  const guarded = await ended('CLOSED')
  assert.equal((await reactivate(users.viewer, guarded.emp, { reason: 'سبب مكتوب' })).status, 403)
  assert.deepEqual(answer(await reactivate(users.farArchiver, guarded.emp, { reason: 'سبب مكتوب' })), [404, 'الموظف غير موجود'])
  assert.deepEqual(await stateOf(guarded), ['terminated', false, false, 0])
  const working = await employee()
  await repo('OffboardingCase').save({ employeeId: working.id, lastWorkingDay: '2025-06-30', status: 'CLOSED', terminationReason: 'resignation' })
  assert.deepEqual(answer(await reactivate(users.archiver, working)), [400, 'الموظف ليس مؤرشفاً ولا منتهي الخدمة'])
  // CRP2V-A-N01: سبب بطول الحد (500 حرف) بيتقبل وبيتحفظ في سطر السجل كامل بآخره (التسمية مابتقصّوش)
  const wordy = await ended('CLOSED'), longReason = 'س'.repeat(476) + ' آخر جملة في السبب مهمة.'
  assert.equal(longReason.length, 500)
  expectStatus(await reactivate(users.archiver, wordy.emp, { reason: longReason }), 201)
  assert.deepEqual((await historyOf(wordy.emp)).map(row => row.reason), [longReason])
})

test('EP-02: إعادة تعيين بعد سنة — الفترة القديمة اتسجّلت، والمكافأة والرصيد ومعاينة التصفية زي موظف جديد بنفس التاريخ، والمسير والحضور من تاريخ المباشرة', async () => {
  const lastDay = `${LAST_YEAR}-06-30`, start = `${TODAY.slice(0, 7)}-01`, settleOn = `${YEAR}-12-31`
  const old = await settled(lastDay, { actualStartDate: '2020-01-05', salaryEntitlementStart: '2020-01-05', probationEndDate: '2020-04-01', contractType: 'fixed_term',
    contractStart: '2020-01-01', contractEnd: `${LAST_YEAR}-12-31`, contractNumber: 'C-77', contractDurationMonths: 72 })
  // رصيد الفترة القديمة: صف السنة اللي فاتت بمأخوذ ومُرحّل وتعديل، وصف السنة دي اللي الترحيل السنوي عمله بعد ما مشي (بمُرحّل ساري)، ومرضي، وسجل تعديل
  await balance(old.emp, 'annual', LAST_YEAR, { taken: 10, openingDays: 5, openingTaken: 5, adjustmentDays: 3 })
  await balance(old.emp, 'annual', YEAR, { openingDays: 8, openingExpiry: '2099-12-31' })
  await balance(old.emp, 'sick', LAST_YEAR, { taken: 4 })
  await balance(old.emp, 'sick', YEAR, { taken: 7 })
  await repo('LeaveBalanceAdjustment').save({ employeeId: old.emp.id, balanceType: 'annual', period: LAST_YEAR, idempotencyKey: crypto.randomUUID(), delta: 3, beforeAdjustment: 0, afterAdjustment: 3,
    beforeRemaining: 10, afterRemaining: 13, reason: 'تعديل في الفترة القديمة', actorUserId: users.admin.id })
  const bystander = await hiredOn('2021-01-01')
  // قبل إعادة التعيين: القراءة بتقول متاحة ومن أي تاريخ، ومعاينة تصفيته لسه بمدة خدمته القديمة كلها
  assert.deepEqual(expectStatus(await periodsOf(users.hirer, old.emp), 200), { ready: true, periods: [], current: { periodNo: 1, startDate: '2020-01-01' },
    rehire: { available: true, code: null, blocked: null, lastWorkingDay: lastDay, minStartDate: `${LAST_YEAR}-07-01`, maxStartDate: plusDays(TODAY, 366) } })
  assert.equal((await settlementPreview(old.emp, settleOn)).serviceYears, Number(YEAR) - 2020 + 1)

  const back = expectStatus(await rehire(users.hirer, old.emp, { startDate: start, reason: '  رجع بعقد جديد بعد سنة  ' }), 201)
  assert.deepEqual([back.id, back.employeeCode, back.status, String(back.joinDate).slice(0, 10)], [old.emp.id, old.emp.employeeCode, 'active', start])
  // الفترة المقفولة: من تاريخ التعيين القديم لآخر يوم عمل، بسبب الخروج وملف الإنهاء، وباسم اللي أعاد التعيين وسببه
  assert.deepEqual(await periodRows(old.emp), [{ periodNo: 1, startDate: '2020-01-01', endDate: lastDay, exitReason: 'resignation', offboardingCaseId: old.kase.id,
    rehireReason: 'رجع بعقد جديد بعد سنة', rehiredByUserId: users.hirer.id }])
  // ملف الموظف: تاريخ التعيين اتحرّك، وبدايات الفترة القديمة وعقدها اتفضّوا، ونوع العقد والكود زي ما هم، والحالة نشط
  const row = await repo('Employee').findOneByOrFail({ id: old.emp.id })
  assert.deepEqual([row.employeeCode, String(row.joinDate).slice(0, 10), row.actualStartDate, row.salaryEntitlementStart, row.probationEndDate, row.contractType, row.contractStart, row.contractEnd,
    row.contractNumber, row.contractDurationMonths, row.status, row.isActive, row.archivedAt, row.archiveReason],
    [old.emp.employeeCode, start, null, null, null, 'fixed_term', null, null, null, null, 'active', true, null, null])
  // سجل الموظف: كل قيمة اتغيّرت بقيمتها القديمة، وسطر الحالة، بنفس الملاحظة وباسم المنفّذ
  const note = `إعادة تعيين — فترة خدمة رقم 2 من ${start} (السابقة 2020-01-01 → ${lastDay}) — رجع بعقد جديد بعد سنة`
  const history = await repo('EmployeeStatusHistory').find({ where: { employeeId: old.emp.id }, order: { id: 'ASC' } })
  assert.deepEqual(history.map(change => [change.fieldName, change.oldValue, change.newValue, change.reason, change.changedByUserId]), [
    ['joinDate', '2020-01-01', start, note, users.hirer.id], ['actualStartDate', '2020-01-05', null, note, users.hirer.id], ['salaryEntitlementStart', '2020-01-05', null, note, users.hirer.id],
    ['probationEndDate', '2020-04-01', null, note, users.hirer.id], ['contractStart', '2020-01-01', null, note, users.hirer.id], ['contractEnd', `${LAST_YEAR}-12-31`, null, note, users.hirer.id],
    ['contractNumber', 'C-77', null, note, users.hirer.id], ['contractDurationMonths', 72, null, note, users.hirer.id], ['status', 'terminated', 'active', note, users.hirer.id]])
  // حساب الدخول اتفتح وجلساته القديمة اتبطّلت، بسطر تدقيق بالحالة قبل وبعد وباسم المنفّذ؛ وحدث «تم التعيين» اتسجّل مرة للفترة
  assert.deepEqual(await stateOf(old), ['active', true, true, 1])
  assert.deepEqual((await query(`SELECT [action], [actorUserId], [before], [after] FROM [audit_log] WHERE [entityType] = N'user' AND [action] = N'USER_UPDATED' AND [entityId] = @0`, [String(old.login.id)]))
    .map(entry => [entry.action, entry.actorUserId, JSON.parse(entry.before), JSON.parse(entry.after)]), [['USER_UPDATED', users.hirer.id, { isActive: false }, { isActive: true }]])
  assert.deepEqual((await query(`SELECT [eventType], [entityId], [payload] FROM [outbox_events] WHERE [eventKey] = @0`, [`employee-rehired:${old.emp.id}:2`]))
    .map(event => [event.eventType, event.entityId, JSON.parse(event.payload)]), [['EMPLOYEE_HIRED', String(old.emp.id), { employeeId: old.emp.id, branchId: org.branchA.id, joinDate: start, rehire: true }]])

  // رصيد الفترة القديمة وسجل تعديلاته متجمّدين بمفتاح الفترة بقيمهم، وصفوف السنة الحالية جديدة من صفر
  assert.deepEqual(await balanceRows(old.emp), [
    ['annual', YEAR, 0, 0, 0, 0], ['annual', `P1:${LAST_YEAR}`, 10, 5, 5, 3], ['annual', `P1:${YEAR}`, 0, 8, 0, 0],
    ['sick', YEAR, 0, 0, 0, 0], ['sick', `P1:${LAST_YEAR}`, 4, 0, 0, 0], ['sick', `P1:${YEAR}`, 7, 0, 0, 0]])
  assert.deepEqual((await query(`SELECT [period] FROM [leave_balance_adjustments] WHERE [employeeId] = @0`, [old.emp.id])).map(entry => entry.period), [`P1:${LAST_YEAR}`])
  assert.deepEqual(await balanceRows(bystander), [['annual', YEAR, 0, 0, 0, 0], ['sick', YEAR, 0, 0, 0, 0]], 'رصيد موظف تاني زي ما هو')
  // «زي موظف جديد اتعيّن في نفس اليوم» بالحرف: الرصيد المعروض، ومدة الخدمة وشرائح المكافأة وبنود التصفية (المكافأة وبدل الرصيد)
  const fresh = await hiredOn(start)
  assert.deepEqual(await balancesOf(old.emp), await balancesOf(fresh))
  const [mine, reference] = [await settlementPreview(old.emp, settleOn), await settlementPreview(fresh, settleOn)]
  assert.deepEqual(mine, reference)
  assert.ok(mine.serviceYears > 0 && mine.serviceYears < 1, `مدة الخدمة من تاريخ المباشرة الجديد: ${mine.serviceYears}`)
  assert.ok(mine.lines.some(([label]) => label.startsWith('بدل رصيد إجازات')) && mine.lines.every(([, , amount]) => amount > 0), JSON.stringify(mine.lines))

  // المسير والحضور بيغطّوه من تاريخ المباشرة: ملف الإنهاء القديم قبل البداية الحالية فمابيقفلش الخدمة ولا بيخرّجه من المسير
  const cases = await repo('OffboardingCase').find({ where: { employeeId: old.emp.id } })
  const { payrollEmploymentCoverage } = require('../src/payroll/payroll-employment')
  const monthEnd = plusDays(start, 27)
  const coverage = payrollEmploymentCoverage(row, cases, start, monthEnd)
  assert.deepEqual([coverage.coverFrom, coverage.coverTo, coverage.hireDate, coverage.leaveDate], [start, monthEnd, start, null])
  assert.equal(payrollEmploymentCoverage(row, cases, plusDays(start, -28), plusDays(start, -1)), null)
  const { employmentWindowOf } = require('../src/attendance/attendance-employment')
  assert.deepEqual(employmentWindowOf(row, cases.map(kase => kase.lastWorkingDay)), { from: start, to: null, toSource: null })
  // القراءة بعدها: فترة مقفولة، والحالية رقم 2، ومفيش «إعادة تعيين» لموظف على رأس العمل
  const view = expectStatus(await periodsOf(users.hirer, old.emp), 200)
  assert.deepEqual([view.periods.map(({ rehiredAt, ...period }) => period), view.periods.every(period => !Number.isNaN(Date.parse(period.rehiredAt))), view.current, view.rehire],
    [[{ periodNo: 1, startDate: '2020-01-01', endDate: lastDay, exitReason: 'resignation', rehireReason: 'رجع بعقد جديد بعد سنة' }], true, { periodNo: 2, startDate: start }, null])
  org.rehired = old
})

test('EP-03: الرفض — مش منتهي، من غير ملف مقفول، ملف مفتوح أو مجهول، أكتر من نهاية، تاريخ أو سبب غلط، بدري أو بعيد، ومن غير الصلاحية أو برّه النطاق', async () => {
  const lastDay = `${LAST_YEAR}-06-10`, good = { startDate: `${LAST_YEAR}-07-01`, reason: 'سبب مكتوب' }
  // الصلاحية والنطاق قبل أي حكم: من غير «إنشاء موظف» 403 (حتى بصلاحية الإرجاع القديم)، وبرّه النطاق «غير موجود»، والقراءة بصلاحية العرض وفي النطاق
  const guarded = await settled(lastDay)
  for (const user of [users.archiver, users.viewer]) assert.equal((await rehire(user, guarded.emp, good)).status, 403)
  assert.deepEqual(answer(await rehire(users.farHirer, guarded.emp, good)), [404, 'الموظف غير موجود'])
  assert.deepEqual(answer(await periodsOf(users.farHirer, guarded.emp)), [404, 'الموظف غير موجود'])
  assert.equal((await periodsOf(users.creatorOnly, guarded.emp)).status, 403)
  // المدخلات: تاريخ مش يوم حقيقي بالصيغة، وسبب ناقص أو طويل أو مش نص
  for (const startDate of [undefined, null, '', '2026/07/01', `${LAST_YEAR}-02-30`, `${LAST_YEAR}-7-1`, 20260701, `${LAST_YEAR}-07-01T00:00:00Z`]) {
    assert.deepEqual(answer(await rehire(users.hirer, guarded.emp, { ...good, startDate })), [400, 'تاريخ المباشرة الجديد مطلوب (يوم صحيح بصيغة YYYY-MM-DD)'], JSON.stringify(startDate))
  }
  for (const reason of [undefined, null, '', '    ', 'قصير', 5, 'س'.repeat(501)]) {
    assert.deepEqual(answer(await rehire(users.hirer, guarded.emp, { ...good, reason })), [400, 'سبب إعادة التعيين مطلوب (من 5 لـ500 حرف)'], String(JSON.stringify(reason)).slice(0, 40))
  }
  assert.deepEqual(answer(await rehire(users.hirer, guarded.emp, undefined)), [400, 'تاريخ المباشرة الجديد مطلوب (يوم صحيح بصيغة YYYY-MM-DD)'])
  // التاريخ: آخر يوم عمل نفسه، ويوم بعده جوه نفس شهر الرواتب (راتب الشهر ده اتحسب مع التصفية)، وآخر يوم في الشهر — مرفوضين برسالتهم؛ وأبعد من سنة قدام
  for (const startDate of [lastDay, `${LAST_YEAR}-06-11`, `${LAST_YEAR}-06-30`, '2019-01-01']) {
    const early = await rehire(users.hirer, guarded.emp, { ...good, startDate })
    assert.deepEqual([answer(early), early.body.code], [[400, `تاريخ المباشرة الجديد من ${LAST_YEAR}-07-01 أو بعده: آخر يوم عمل في خدمته القديمة ${lastDay}، وراتب شهر الرواتب اللي فيه اليوم ده اتحسب مع التصفية`],
      'REHIRE_START_TOO_EARLY'], startDate)
  }
  const late = await rehire(users.hirer, guarded.emp, { ...good, startDate: plusDays(TODAY, 367) })
  assert.deepEqual([answer(late), late.body.code], [[400, `تاريخ المباشرة الجديد بحد أقصى سنة قدام (${plusDays(TODAY, 366)})`], 'REHIRE_START_TOO_LATE'])
  assert.deepEqual(await unchanged(guarded), [NOT_ENDED, []])

  // حالة الموظف وملفاته
  const working = await employee()
  await repo('OffboardingCase').save({ employeeId: working.id, lastWorkingDay: lastDay, status: 'CLOSED', terminationReason: 'resignation' })
  assert.deepEqual(refusal(await rehire(users.hirer, working, good)), [400, 'REHIRE_NOT_ENDED'])
  assert.equal(expectStatus(await periodsOf(users.hirer, working), 200).rehire, null)
  // من غير ملف، أو ملفه اتلغى، أو مؤرشف من غير ملف: مفيش تصفية تثبت إن خدمته اتقفلت
  for (const [caseStatus, extra] of [[null, {}], ['CANCELLED', {}], [null, { status: 'archived' }]]) {
    const plain = await ended(caseStatus, extra)
    const refused = await rehire(users.hirer, plain.emp, good)
    assert.deepEqual([refusal(refused), /مالوش ملف إنهاء لفترة خدمته الحالية/.test(refused.body.message)], [[400, 'REHIRE_NO_CLOSED_CASE'], true], String(caseStatus ?? extra.status ?? 'no case'))
    const view = expectStatus(await periodsOf(users.hirer, plain.emp), 200).rehire
    assert.deepEqual([view.available, view.code, view.minStartDate], [false, 'REHIRE_NO_CLOSED_CASE', null])
    assert.deepEqual(await unchanged(plain), [[plain.emp.status, false, false, 0], []])
  }
  // ملف قديم آخر يوم عمل فيه قبل بداية الفترة الحالية بتاع فترة أقدم: مش ملف الفترة دي
  const older = await ended(null, { joinDate: `${LAST_YEAR}-08-01` })
  await repo('OffboardingCase').save({ employeeId: older.emp.id, lastWorkingDay: lastDay, status: 'CLOSED', terminationReason: 'resignation' })
  assert.deepEqual(refusal(await rehire(users.hirer, older.emp, { ...good, startDate: `${LAST_YEAR}-12-01` })), [400, 'REHIRE_NO_CLOSED_CASE'])
  // ملف لسه مفتوح (إخلاء، تصفية، أو معتمدة مستنية آخر يوم)، أو حالته مش معروفة، أو آخر يوم عمل فيه مش صالح
  for (const [caseStatus, code] of [['IN_CLEARANCE', 'REHIRE_OPEN_CASE'], ['IN_SETTLEMENT', 'REHIRE_OPEN_CASE'], ['SETTLED', 'REHIRE_OPEN_CASE'], ['ARCHIVED', 'REHIRE_CASE_UNKNOWN']]) {
    const open = await ended(caseStatus)
    const blocked = await rehire(users.hirer, open.emp, good)
    assert.deepEqual(refusal(blocked), [400, code], caseStatus)
    if (code === 'REHIRE_OPEN_CASE') assert.equal(blocked.body.message, 'للموظف ملف إنهاء خدمة لسه مفتوح — اقفله قبل إعادة التعيين')
    // ومعاه ملف مقفول سليم لنفس الفترة: المفتوح أو المجهول لسه بيمنع
    await repo('OffboardingCase').save({ employeeId: open.emp.id, lastWorkingDay: lastDay, status: 'CLOSED', terminationReason: 'resignation' })
    assert.deepEqual(refusal(await rehire(users.hirer, open.emp, good)), [400, code], `${caseStatus} + CLOSED`)
    assert.deepEqual(await unchanged(open), [NOT_ENDED, []])
  }
  // أكتر من ملف مقفول في نفس الفترة: نهاية الخدمة مش واحدة
  const twice = await settled(lastDay)
  await repo('OffboardingCase').save({ employeeId: twice.emp.id, lastWorkingDay: `${LAST_YEAR}-05-31`, status: 'CLOSED', terminationReason: 'termination' })
  assert.deepEqual(refusal(await rehire(users.hirer, twice.emp, good)), [400, 'REHIRE_AMBIGUOUS_END'])
  assert.deepEqual(await unchanged(twice), [NOT_ENDED, []])
  // موظف من غير تاريخ تعيين: الفترة بتتحسب من تاريخ إنشاء ملفه (نفس أساس نهاية الخدمة) — ملف إنهاء قبله مش بتاع الفترة دي
  const undated = await ended(null, { joinDate: null })
  await repo('OffboardingCase').save({ employeeId: undated.emp.id, lastWorkingDay: lastDay, status: 'CLOSED', terminationReason: 'resignation' })
  assert.deepEqual(refusal(await rehire(users.hirer, undated.emp, good)), [400, 'REHIRE_NO_CLOSED_CASE'])

  // حدود التاريخ المقبولة: أول يوم بعد شهر الرواتب، وآخر يوم مسموح قدام (مباشرة مستقبلية)
  const first = await settled(lastDay)
  expectStatus(await rehire(users.hirer, first.emp, good), 201)
  assert.deepEqual((await periodRows(first.emp)).map(period => [period.startDate, period.endDate]), [['2020-01-01', lastDay]])
  const future = await settled(lastDay)
  const ahead = expectStatus(await rehire(users.hirer, future.emp, { ...good, startDate: plusDays(TODAY, 366) }), 201)
  assert.deepEqual([ahead.status, String(ahead.joinDate).slice(0, 10), expectStatus(await periodsOf(users.hirer, future.emp), 200).current], ['active', plusDays(TODAY, 366), { periodNo: 2, startDate: plusDays(TODAY, 366) }])
})

test('EP-04: المسير — المباشرة بعد شهر الرواتب اللي فيه آخر يوم عمل، ومسير الشهر ده معتمد والموظف فيه، ومسير قديم لسه مااتعتمدش بيمنع', async () => {
  const lastDay = `${LAST_YEAR}-06-30`, good = { startDate: `${LAST_YEAR}-08-01`, reason: 'سبب مكتوب' }
  let fallback
  try {
  const gate = async emp => { const view = expectStatus(await periodsOf(users.hirer, emp), 200).rehire; return [view.available, view.code, view.minStartDate] }
  // النظام فيه مسير بدأ قبل آخر يوم عمل (لموظف تاني) والموظف ده مش في مسير معتمد لشهر آخر يوم عمل: راتب أيامه الأخيرة مش محسوم
  const other = await employee()
  const june = await run({ status: 'PAID' })
  await member(june, other)
  const open = await settled(lastDay)
  const refused = await rehire(users.hirer, open.emp, good)
  assert.deepEqual([refusal(refused), answer(refused)[1]], [[400, 'REHIRE_LAST_MONTH_OPEN'],
    `مسير شهر آخر يوم عمل (${lastDay}) لسه مااتعتمدش أو الموظف مش فيه — راتب أيامه الأخيرة مصدره المسير ده؛ اعتمده قبل إعادة التعيين`])
  assert.deepEqual(await gate(open.emp), [false, 'REHIRE_LAST_MONTH_OPEN', null])
  // نفس المسير لسه محسوب (مش معتمد) والموظف داخل فيه: مرفوض بسبب المسير المعلّق، بشهره بس (من غير رقمه ولا اسمه)
  const calculated = await run({ status: 'CALCULATED', name: 'مسير يونيو المعلّق' })
  const pendingMember = await member(calculated, open.emp)
  const pending = await rehire(users.hirer, open.emp, good)
  assert.deepEqual([refusal(pending), answer(pending)[1]], [[400, 'REHIRE_PENDING_OLD_RUN'],
    `الموظف داخل في مسير لسه مااتعتمدش بيغطّي أيام من خدمته القديمة (مسير شهر ${LAST_YEAR}-06) — اعتمده أو ألغيه قبل إعادة التعيين`])
  // مستبعد منه (مش داخل): المسير المعلّق مابيمنعش، وشهر آخر يوم عمل لسه مش محسوم
  await repo('PayrollRunMember').update({ id: pendingMember.id }, { membershipStatus: 'EXCLUDED' })
  assert.deepEqual(refusal(await rehire(users.hirer, open.emp, good)), [400, 'REHIRE_LAST_MONTH_OPEN'])
  // مسودة وله فيها بند: بيمنع؛ ومسير ملغي أو تكميلي معتمد مش مصدر راتب الشهر
  const draft = await run({ status: 'DRAFT', name: null, period: `${LAST_YEAR}-05`, startDate: `${LAST_YEAR}-05-01`, endDate: `${LAST_YEAR}-05-31`, branchId: org.branchA.id })
  await item(draft, open.emp)
  assert.deepEqual([refusal(await rehire(users.hirer, open.emp, good)), (await rehire(users.hirer, open.emp, good)).body.message],
    [[400, 'REHIRE_PENDING_OLD_RUN'], `الموظف داخل في مسير لسه مااتعتمدش بيغطّي أيام من خدمته القديمة (مسير شهر ${LAST_YEAR}-05) — اعتمده أو ألغيه قبل إعادة التعيين`])
  await repo('PayrollRun').update({ id: draft.id }, { status: 'CANCELLED' })
  await repo('PayrollRun').update({ id: calculated.id }, { status: 'CANCELLED' })
  await repo('PayrollRunMember').update({ id: pendingMember.id }, { membershipStatus: 'INCLUDED' })
  const supplementary = await run({ status: 'PAID', runType: 'SUPPLEMENTARY' })
  await member(supplementary, open.emp)
  assert.deepEqual(await gate(open.emp), [false, 'REHIRE_LAST_MONTH_OPEN', null])
  const may = await run({ status: 'PAID', period: `${LAST_YEAR}-05`, startDate: `${LAST_YEAR}-05-01`, endDate: `${LAST_YEAR}-05-31` })
  await member(may, open.emp)
  assert.deepEqual(await gate(open.emp), [false, 'REHIRE_LAST_MONTH_OPEN', null], 'مسير شهر أقدم مصروف مش مسير شهر آخر يوم عمل')
  // مسير الشهر المعتمد والموظف فيه (حتى مستبعد — قرار اتقفل): متاحة، من أول يوم بعد الشهر
  const mine = await member(june, open.emp, 'EXCLUDED')
  assert.deepEqual(await gate(open.emp), [true, null, `${LAST_YEAR}-07-01`])
  // وبند الموظف في المسير ده اتعكس (مستني تصحيح): مش محسوم تاني؛ والعكس الملغي مابيمنعش
  const paid = await item(june, open.emp)
  const reversal = await repo('PayrollRunReversalLine').save({ reversalRunId: supplementary.id, originalRunId: june.id, originalItemId: paid.id, employeeId: open.emp.id, status: 'POSTED', netPay: 1000,
    itemSnapshot: '{}', itemHash: 'x'.repeat(64), createdByUserId: users.admin.id })
  assert.deepEqual(await gate(open.emp), [false, 'REHIRE_LAST_MONTH_OPEN', null])
  await repo('PayrollRunReversalLine').update({ id: reversal.id }, { status: 'CANCELLED' })
  assert.deepEqual(await gate(open.emp), [true, null, `${LAST_YEAR}-07-01`])
  await repo('PayrollRunMember').delete({ id: mine.id })
  assert.deepEqual(await gate(open.emp), [true, null, `${LAST_YEAR}-07-01`], 'بند من غير صف عضوية كفاية')
  // مسير معتمد (مش مصروف) بيكفي
  await repo('PayrollRun').update({ id: june.id }, { status: 'APPROVED' })
  // مسير تاني بيغطّي آخر يوم عمل ونهايته أبعد، والموظف مش فيه: حساب الشركة شايفه فالحد بعد نهايته؛ والقارئ مش شايفه (مسير مش بتاع موظفه)،
  // فالإتاحة عنده مقفولة بسبب عام — وأي تاريخ بنفس الرفض، فمفيش نهاية مسير تتخمّن بتجربة تاريخ ورا تاريخ
  const wide = await run({ status: 'PAID', period: `${LAST_YEAR}-07`, startDate: `${LAST_YEAR}-06-16`, endDate: `${LAST_YEAR}-07-15` })
  const HIDDEN_RUN = 'أيام من خدمته القديمة داخلة في مسير خارج نطاق صلاحيتك — إعادة التعيين محتاجة حساب يشوف المسير ده'
  assert.deepEqual(await gate(open.emp), [false, 'REHIRE_HIDDEN_RUN', null])
  assert.equal(expectStatus(await periodsOf(users.admin, open.emp), 200).rehire.minStartDate, `${LAST_YEAR}-07-16`)
  for (const startDate of [`${LAST_YEAR}-07-10`, `${LAST_YEAR}-07-16`, `${LAST_YEAR}-09-01`]) {
    const hiddenRun = await rehire(users.hirer, open.emp, { ...good, startDate })
    assert.deepEqual([refusal(hiddenRun), hiddenRun.body.message], [[400, 'REHIRE_HIDDEN_RUN'], HIDDEN_RUN], startDate)
  }
  // والموظف فيه (عضويته بلقطة فرع القارئ): القارئ شايفه، ونهايته هي الحد، والرفض بتاريخه
  await member(wide, open.emp, 'EXCLUDED')
  assert.deepEqual(await gate(open.emp), [true, null, `${LAST_YEAR}-07-16`])
  assert.deepEqual(refusal(await rehire(users.hirer, open.emp, { ...good, startDate: `${LAST_YEAR}-07-15` })), [400, 'REHIRE_START_TOO_EARLY'])
  assert.deepEqual(await unchanged(open), [NOT_ENDED, []])
  expectStatus(await rehire(users.hirer, open.emp, { ...good, startDate: `${LAST_YEAR}-07-16` }), 201)
  // دورة رواتب من يوم 23: آخر يوم عمل 30 يونيو جوه شهر رواتب يوليو (23 يونيو → 22 يوليو)، فالمباشرة من 23 يوليو
  await repo('PayrollRun').update({ id: wide.id }, { status: 'CANCELLED' })
  await setConfig('payroll.cycle_start_day', '23')
  const cycled = await settled(lastDay)
  await member(june, cycled.emp)
  assert.deepEqual(await gate(cycled.emp), [true, null, `${LAST_YEAR}-07-23`])
  assert.deepEqual(refusal(await rehire(users.hirer, cycled.emp, { ...good, startDate: `${LAST_YEAR}-07-22` })), [400, 'REHIRE_START_TOO_EARLY'])
  expectStatus(await rehire(users.hirer, cycled.emp, { ...good, startDate: `${LAST_YEAR}-07-23` }), 201)
  // إعداد الدورة مش صالح: الافتراضي 23 (زي باقي النظام)
  await setConfig('payroll.cycle_start_day', 'غلط')
  fallback = await settled(lastDay)
  await member(june, fallback.emp)
  assert.deepEqual(await gate(fallback.emp), [true, null, `${LAST_YEAR}-07-23`])
  await setConfig('payroll.cycle_start_day', '1')
  // النظام مافيهوش مسير بدأ قبل آخر يوم عمل (ملف من قبل تشغيل الرواتب): متاحة من غير مسير
  const early = await settled('2019-12-31', { joinDate: '2015-01-01' })
  assert.deepEqual(await gate(early.emp), [true, null, '2020-01-01'])
  } finally {
    // تنضيف (حتى لو الاختبار وقف): مسيرات الاختبار ده ملغية ودورة الرواتب شهر ميلادي، فباقي الاختبارات على نظام من غير مسيرات
    await query(`UPDATE [payroll_runs] SET [status] = 'CANCELLED'`)
    await setConfig('payroll.cycle_start_day', '1')
  }
  const after = expectStatus(await periodsOf(users.hirer, fallback.emp), 200).rehire
  assert.deepEqual([after.available, after.code, after.minStartDate], [true, null, `${LAST_YEAR}-07-01`])
})

test('EP-05: رصيد الإجازات بعد إعادة التعيين — إجازة قديمة بتتلغى مابترجعش على الرصيد الجديد، والترحيل والإقفال والتجديد مابيشوفوش صفوف الفترة المقفولة', async () => {
  const lastDay = `${YEAR}-01-31`, start = `${YEAR}-02-01`, service = leaves()
  // نفس السنة الميلادية: صف السنة دي كان فيه مأخوذ ومُرحّل وتعديل من الفترة القديمة
  const old = await settled(lastDay)
  await balance(old.emp, 'annual', LAST_YEAR, { taken: 21 })
  await balance(old.emp, 'annual', YEAR, { taken: 6, openingDays: 5, openingTaken: 2, adjustmentDays: 3 })
  await balance(old.emp, 'sick', YEAR, { taken: 9 })
  const oldLeave = { employeeId: old.emp.id, fromDate: `${YEAR}-01-10`, days: 3, requestId: null }
  expectStatus(await rehire(users.hirer, old.emp, { startDate: start, reason: 'رجع في نفس السنة' }), 201)
  const frozen = [['annual', `P1:${LAST_YEAR}`, 21, 0, 0, 0], ['annual', `P1:${YEAR}`, 6, 5, 2, 3], ['sick', `P1:${YEAR}`, 9, 0, 0, 0]]
  const rowsOf = async emp => (await balanceRows(emp)).filter(row => !row[1].startsWith('P'))
  const frozenOf = async emp => (await balanceRows(emp)).filter(row => row[1].startsWith('P'))
  assert.deepEqual([await rowsOf(old.emp), await frozenOf(old.emp)], [[['annual', YEAR, 0, 0, 0, 0], ['sick', YEAR, 0, 0, 0, 0]], frozen])
  const fresh = await hiredOn(start)
  assert.deepEqual(await balancesOf(old.emp), await balancesOf(fresh))

  // رصيد جديد عليه تعديل وإجازة في الفترة الجديدة (نفس الحركات على المرجع)
  for (const emp of [old.emp, fresh]) {
    await repo('LeaveBalance').update({ employeeId: emp.id, balanceType: 'annual', period: YEAR }, { adjustmentDays: 5 })
    await ds.transaction(em => service.deduct(em, emp.id, 'annual', 2, start))
  }
  assert.deepEqual(await rowsOf(old.emp), [['annual', YEAR, 2, 0, 0, 5], ['sick', YEAR, 0, 0, 0, 0]])
  // إجازة من الفترة المقفولة بتتلغى: لا الرصيد الجديد بيتزوّد ولا الصف المتجمّد بيتغيّر
  await ds.transaction(em => service.restoreLeave(em, oldLeave, 'annual'))
  assert.deepEqual([await rowsOf(old.emp), await frozenOf(old.emp)], [[['annual', YEAR, 2, 0, 0, 5], ['sick', YEAR, 0, 0, 0, 0]], frozen])
  // وإجازة آخر يوم في الفترة المقفولة كمان، وإجازة من الفترة الجديدة بترجع عادي
  await ds.transaction(em => service.restoreLeave(em, { ...oldLeave, fromDate: lastDay, days: 1 }, 'annual'))
  assert.deepEqual((await rowsOf(old.emp))[0], ['annual', YEAR, 2, 0, 0, 5])
  await ds.transaction(em => service.restoreLeave(em, { ...oldLeave, fromDate: start, days: 1 }, 'annual'))
  assert.deepEqual((await rowsOf(old.emp))[0], ['annual', YEAR, 1, 0, 0, 5])
  await ds.transaction(em => service.restoreLeave(em, { employeeId: fresh.id, fromDate: start, days: 1, requestId: null }, 'annual'))
  // موظف ماتعيّنش تاني: إرجاع إجازته زي الأول (مفيش فترة مقفولة)
  const never = await hiredOn('2020-01-01')
  await repo('LeaveBalance').update({ employeeId: never.id, balanceType: 'annual', period: YEAR }, { taken: 4 })
  await ds.transaction(em => service.restoreLeave(em, { employeeId: never.id, fromDate: `${YEAR}-01-10`, days: 3, requestId: null }, 'annual'))
  assert.deepEqual((await rowsOf(never))[0], ['annual', YEAR, 1, 0, 0, 0])

  // القراءات الجماعية شغالة والصفوف المتجمّدة مش فيها: شاشة الأرصدة، ومعاينة إقفال السنة (السنة دي ليه صف، واللي فاتت لأ)
  assert.deepEqual(await balancesOf(old.emp), await balancesOf(fresh))
  const bulk = await service.bulkBalances(null)
  const bulkOf = emp => withoutIdentity(bulk.find(entry => entry.employee.id === emp.id).balances)
  assert.deepEqual([bulkOf(old.emp), bulkOf(old.emp).length], [bulkOf(fresh), 2])
  const closing = async year => (await service.yearEndPreview(year, null)).rows
  const figures = (rows, emp) => { const found = rows.find(entry => entry.employee.id === emp.id); if (!found) return null; const { employee: _employee, ...rest } = found; return rest }
  const thisYear = await closing(YEAR)
  assert.deepEqual(figures(thisYear, old.emp), figures(thisYear, fresh))
  assert.deepEqual([figures(thisYear, old.emp).used, figures(thisYear, old.emp).opening, figures(thisYear, old.emp).adjustments], [1, 0, 5])
  assert.equal(figures(await closing(LAST_YEAR), old.emp), null)
  // الترحيل السنوي: السنة اللي فاتت مابترحّلش حاجة من صفها المتجمّد، والسنة دي بترحّل متبقي الصف الجديد بس — زي المرجع
  await service.rollover(LAST_YEAR)
  assert.deepEqual(await rowsOf(old.emp), [['annual', YEAR, 1, 0, 0, 5], ['sick', YEAR, 0, 0, 0, 0]])
  await service.rollover(YEAR)
  const nextOf = async emp => (await rowsOf(emp)).filter(row => row[1] === NEXT_YEAR)
  assert.deepEqual(await nextOf(old.emp), await nextOf(fresh))
  assert.deepEqual((await nextOf(old.emp)).filter(row => row[0] === 'annual').map(row => row[3]), [10], 'المُرحّل من متبقي الصف الجديد بس وبسقفه')
  assert.deepEqual(await frozenOf(old.emp), frozen)

  // أساس «ذكرى التعيين»: صف الفترة القديمة بمفتاح تاريخ — متجمّد، والتجديد اليومي مابيرحّلش منه، والنتيجة زي المرجع
  await repo('LeaveType').update({ id: org.annualType.id }, { renewalBasis: 'HIRE_ANNIVERSARY' })
  try {
    const dated = await settled(lastDay, { joinDate: '2020-03-15' })
    await balance(dated.emp, 'annual', `${LAST_YEAR}-03-15`, { taken: 4, adjustmentDays: 5 })
    expectStatus(await rehire(users.hirer, dated.emp, { startDate: start, reason: 'رجع بأساس الذكرى' }), 201)
    const reference = await hiredOn(start)
    assert.deepEqual(await frozenOf(dated.emp), [['annual', `P1:${LAST_YEAR}-03-15`, 4, 0, 0, 5]])
    assert.deepEqual(await balancesOf(dated.emp), await balancesOf(reference))
    await service.renewBalancePeriods(TODAY)
    assert.deepEqual([await balancesOf(dated.emp), await frozenOf(dated.emp)], [await balancesOf(reference), [['annual', `P1:${LAST_YEAR}-03-15`, 4, 0, 0, 5]]])
    assert.deepEqual((await rowsOf(dated.emp)).map(row => row.slice(2)), (await rowsOf(reference)).map(row => row.slice(2)))
  } finally {
    await repo('LeaveType').update({ id: org.annualType.id }, { renewalBasis: 'YEAR_START' })
  }
})

test('EP-06: إعادة تعيين تانية بتقفل الفترة التانية بمفتاحها، وطلبين في نفس اللحظة واحد بس بينجح', async () => {
  // الموظف بتاع EP-02 (فترته التانية من أول الشهر ده) خدمته انتهت تاني بملف مقفول
  const again = org.rehired, secondStart = `${TODAY.slice(0, 7)}-01`, secondEnd = plusDays(TODAY, 20), thirdStart = plusDays(TODAY, 60)
  await repo('LeaveBalance').update({ employeeId: again.emp.id, balanceType: 'annual', period: YEAR }, { taken: 2 })
  await repo('Employee').update({ id: again.emp.id }, { status: 'terminated', isActive: false, archivedAt: new Date() })
  const second = await repo('OffboardingCase').save({ employeeId: again.emp.id, lastWorkingDay: secondEnd, status: 'CLOSED', terminationReason: 'contract_end' })
  const before = (await balanceRows(again.emp)).filter(row => row[1].startsWith('P1:'))
  expectStatus(await rehire(users.hirer, again.emp, { startDate: thirdStart, reason: 'عقد تالت' }), 201)
  assert.deepEqual((await periodRows(again.emp)).map(period => [period.periodNo, period.startDate, period.endDate, period.exitReason, period.offboardingCaseId]),
    [[1, '2020-01-01', `${LAST_YEAR}-06-30`, 'resignation', again.kase.id], [2, secondStart, secondEnd, 'contract_end', second.id]])
  const rows = await balanceRows(again.emp)
  assert.deepEqual(rows.filter(row => row[1].startsWith('P1:')), before, 'صفوف الفترة الأولى بمفتاحها زي ما هي')
  // صفوف الفترة التانية كلها (ومعاها صف السنة الجاية اللي الترحيل عمله) اتجمّدت بمفتاحها
  assert.deepEqual(rows.filter(row => row[1].startsWith('P2:')).map(row => [row[0], row[1], row[2]]),
    [['annual', `P2:${YEAR}`, 2], ['annual', `P2:${NEXT_YEAR}`, 0], ['sick', `P2:${YEAR}`, 0], ['sick', `P2:${NEXT_YEAR}`, 0]])
  assert.deepEqual(rows.filter(row => !row[1].startsWith('P')), [['annual', YEAR, 0, 0, 0, 0], ['sick', YEAR, 0, 0, 0, 0]])
  assert.deepEqual(expectStatus(await periodsOf(users.hirer, again.emp), 200).current, { periodNo: 3, startDate: thirdStart })
  // إجازة من الفترة التانية (بعد نهاية الأولى وقبل نهاية التانية) بتتلغى: آخر فترة مقفولة هي الحد، فرصيد الفترة التالتة مابيتغيّرش
  await repo('LeaveBalance').update({ employeeId: again.emp.id, balanceType: 'annual', period: YEAR }, { taken: 1 })
  await ds.transaction(em => leaves().restoreLeave(em, { employeeId: again.emp.id, fromDate: secondStart, days: 1, requestId: null }, 'annual'))
  assert.deepEqual((await balanceRows(again.emp)).filter(row => !row[1].startsWith('P'))[0], ['annual', YEAR, 1, 0, 0, 0])

  // طلبين في نفس اللحظة لنفس الموظف: واحد بينجح والتاني بيلاقيه على رأس العمل — فترة واحدة اتسجّلت
  const raced = await settled(`${LAST_YEAR}-06-30`)
  const answers = await Promise.all([1, 2].map(turn => rehire(users.hirer, raced.emp, { startDate: `${LAST_YEAR}-07-0${turn}`, reason: `محاولة ${turn}` })))
  assert.deepEqual(answers.map(refusal).sort((a, b) => a[0] - b[0]), [[201, null], [400, 'REHIRE_NOT_ENDED']])
  assert.equal((await periodRows(raced.emp)).length, 1)
  assert.deepEqual(await stateOf(raced), ['active', true, true, 1])

  // قفل مالية الموظف ممسوك (مسير بيتحسب أو تصفية شغالة عليه): إعادة التعيين بتستنى لحد ما يتفك، وبعدها بتحكم على الحالة المثبتة
  const held = await settled(`${LAST_YEAR}-06-30`)
  const holder = ds.createQueryRunner()
  await holder.connect()
  await holder.startTransaction()
  try {
    const [lock] = await holder.query(`DECLARE @result int; EXEC @result = sys.sp_getapplock @Resource = @0, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 0; SELECT @result AS [result]`,
      [`hr:employee-finance:${held.emp.id}`])
    assert.ok(Number(lock.result) >= 0, 'القفل اتمسك')
    let finished = false
    const waiting = rehire(users.hirer, held.emp, { startDate: `${LAST_YEAR}-07-01`, reason: 'مستني القفل' }).then(response => { finished = true; return response })
    await new Promise(resolve => setTimeout(resolve, 1500))
    assert.deepEqual([finished, await unchanged(held)], [false, [NOT_ENDED, []]], 'الطلب مستني القفل ومفيش حاجة اتكتبت')
    // والقفل ممسوك: ملف إنهاء جديد اتفتح للموظف (الحالة اتغيّرت تحت القفل) — الحكم بعد القفل بيشوفه
    await repo('OffboardingCase').save({ employeeId: held.emp.id, lastWorkingDay: `${LAST_YEAR}-06-30`, status: 'IN_SETTLEMENT', terminationReason: 'resignation' })
    await holder.commitTransaction()
    assert.deepEqual(refusal(await waiting), [400, 'REHIRE_OPEN_CASE'])
    assert.deepEqual(await unchanged(held), [NOT_ENDED, []])
  } finally {
    if (holder.isTransactionActive) await holder.rollbackTransaction()
    await holder.release()
  }
})

test('EP-07: إجازة معتمدة بعد آخر يوم عمل بتمنع إعادة التعيين لحد ما تتلغى، وتاريخ جوه فترة مقفولة مالوش خصم، والخصم والإرجاع مابيستنوش صف موظف ممسوك', async () => {
  const lastDay = `${YEAR}-01-31`, start = `${YEAR}-02-01`, service = leaves(), good = { startDate: start, reason: 'رجع في نفس السنة' }
  const old = await settled(lastDay)
  await balance(old.emp, 'annual', YEAR, { taken: 3 })
  // إجازة اتعتمدت في خدمته القديمة بتاريخ بعد آخر يوم عمل (مااتاخدتش): أيامها التلاتة مخصومة من رصيد خدمته القديمة (Codex CRP2V-B-B01)
  const leaveRow = (fromDate, toDate, extra = {}) => repo('Leave').save({ employeeId: old.emp.id, leaveTypeCode: 'ANNUAL', fromDate, toDate, days: 3, status: 'APPROVED',
    isUnpaid: false, period: 'FULL', ...extra })
  const future = await leaveRow(`${YEAR}-08-10`, `${YEAR}-08-12`)
  const refused = await rehire(users.hirer, old.emp, good)
  assert.deepEqual([refusal(refused), refused.body.message], [[400, 'REHIRE_FUTURE_LEAVES'],
    `للموظف إجازات معتمدة بعد آخر يوم عمل (${lastDay})، عددها 1 — ألغها قبل إعادة التعيين عشان رصيدها يرجع على خدمته القديمة`])
  const gateOf = async () => { const view = expectStatus(await periodsOf(users.hirer, old.emp), 200).rehire; return [view.available, view.code] }
  assert.deepEqual([await gateOf(), await unchanged(old), await balanceRows(old.emp)], [[false, 'REHIRE_FUTURE_LEAVES'], [NOT_ENDED, []], [['annual', YEAR, 3, 0, 0, 0]]])
  // الموارد البشرية بتلغيها قبل إعادة التعيين: رصيدها بيرجع على صف خدمته القديمة
  expectStatus(await request(users.revoker, 'POST', `/leaves/${future.id}/revoke`), 201)
  assert.deepEqual(await balanceRows(old.emp), [['annual', YEAR, 0, 0, 0, 0]])
  // إجازة بتعدّي آخر يوم عمل (بدأت قبله وبتخلص بعده) بتمنع زيها؛ واللي بتخلص في آخر يوم عمل نفسه، والملغية، لأ
  const spanning = await leaveRow(`${YEAR}-01-30`, `${YEAR}-02-02`)
  assert.deepEqual(await gateOf(), [false, 'REHIRE_FUTURE_LEAVES'])
  await repo('Leave').update({ id: spanning.id }, { toDate: lastDay })
  await leaveRow(`${YEAR}-03-01`, `${YEAR}-03-03`, { status: 'CANCELLED' })
  assert.deepEqual(await gateOf(), [true, null])
  expectStatus(await rehire(users.hirer, old.emp, good), 201)
  assert.deepEqual(await balanceRows(old.emp), [['annual', YEAR, 0, 0, 0, 0], ['annual', `P1:${YEAR}`, 0, 0, 0, 0], ['sick', YEAR, 0, 0, 0, 0]])

  // بعد إعادة التعيين: تاريخ جوه الفترة المقفولة (لحد آخر يوم عمل) مالوش رصيد يتخصم منه — في فحص التقديم وفي الخصم — وأول يوم بعدها عادي
  const CLOSED = error => error.getStatus?.() === 400 && error.message === `تاريخ الإجازة (${lastDay}) جوه فترة خدمة مقفولة للموظف (لحد ${lastDay}) — رصيد الفترة دي اتقفل مع تصفيتها`
  await assert.rejects(service.assertSufficient(old.emp.id, 'annual', 1, lastDay), CLOSED)
  await assert.rejects(ds.transaction(em => service.deduct(em, old.emp.id, 'annual', 1, lastDay)), CLOSED)
  await repo('LeaveBalance').update({ employeeId: old.emp.id, balanceType: 'annual', period: YEAR }, { adjustmentDays: 5 })
  await service.assertSufficient(old.emp.id, 'annual', 1, start)
  await ds.transaction(em => service.deduct(em, old.emp.id, 'annual', 1, start))
  assert.deepEqual((await balanceRows(old.emp))[0], ['annual', YEAR, 1, 0, 0, 5])
  // موظف ماتعيّنش تاني: مفيش فترة مقفولة، فتاريخ قديم زي الأول
  const never = await hiredOn('2020-01-01')
  await ds.transaction(em => service.deduct(em, never.id, 'sick', 1, `${YEAR}-01-05`))
  assert.deepEqual((await balanceRows(never)).filter(row => row[0] === 'sick'), [['sick', YEAR, 1, 0, 0, 0]])

  // الخصم والإرجاع مابيستنوش صف موظف ممسوك (ملفه بيتعدّل أو إعادة تعيينه شغالة): 409 «جرّب تاني» ومفيش حاجة اتكتبت؛ وبعد ما يتفك عادي
  const holder = await holdEmployeeRow(old.emp)
  try {
    const BUSY = error => error.getStatus?.() === 409 && error.message === 'ملف الموظف بيتعدّل دلوقتي — جرّب تاني بعد لحظة'
    const newLeave = { employeeId: old.emp.id, fromDate: start, days: 1, requestId: null }
    assert.equal(await settledWithin(assert.rejects(ds.transaction(em => service.deduct(em, old.emp.id, 'annual', 1, start)), BUSY), 5000), true, 'الخصم رد على طول')
    await assert.rejects(ds.transaction(em => service.deduct(em, old.emp.id, 'annual', 1, start)), BUSY)
    await assert.rejects(ds.transaction(em => service.restoreLeave(em, newLeave, 'annual')), BUSY)
    assert.deepEqual((await balanceRows(old.emp))[0], ['annual', YEAR, 1, 0, 0, 5])
  } finally { await holder.release() }
  await ds.transaction(em => service.restoreLeave(em, { employeeId: old.emp.id, fromDate: start, days: 1, requestId: null }, 'annual'))
  assert.deepEqual((await balanceRows(old.emp))[0], ['annual', YEAR, 0, 0, 0, 5])
})

test('EP-08: الترحيل السنوي والتجديد اليومي بيحكموا ويكتبوا وصف الموظف ممسوك — مُرحّل الفترة القديمة مايوصلش لرصيد الجديدة', async () => {
  const service = leaves(), { Repository } = require('../node_modules/typeorm')
  // (1) ترحيل وصل لحفظ صف السنة الجديدة بالمُرحّل وواقف هناك، وإعادة تعيين جت في اللحظة دي (Codex CRP2V-B-B02): بتستنى صف الموظف لحد ما
  //     الترحيل يخلّص، وبعدها بتجمّد الصف ده مع باقي صفوف الفترة القديمة — فرصيد الفترة الجديدة من غير مُرحّل
  const old = await settled(`${LAST_YEAR}-12-31`)
  await balance(old.emp, 'annual', LAST_YEAR, { taken: 0 })
  const original = Repository.prototype.save
  let entered, release, paused = false, job, rehired
  const reached = new Promise(resolve => { entered = resolve }), barrier = new Promise(resolve => { release = resolve })
  Repository.prototype.save = async function (row, ...rest) {
    if (!paused && row && row.employeeId === old.emp.id && row.period === YEAR && Number(row.openingDays) > 0) { paused = true; entered(); await barrier }
    return original.call(this, row, ...rest)
  }
  try {
    job = service.rollover(LAST_YEAR, [org.branchA.id]); job.catch(() => undefined)
    await Promise.race([reached, new Promise((_, reject) => setTimeout(() => reject(new Error('الترحيل ماوصلش لحفظ صف السنة الجديدة')), 20000))])
    rehired = rehire(users.hirer, old.emp, { startDate: `${YEAR}-01-01`, reason: 'رجع والترحيل شغال' })
    assert.equal(await settledWithin(rehired, 1500), false, 'إعادة التعيين مستنية الترحيل (صف الموظف ممسوك)')
    release()
    await job
    expectStatus(await rehired, 201)
  } finally {
    release(); Repository.prototype.save = original
    if (job) await job.catch(() => undefined)
    if (rehired) await rehired.catch(() => undefined)
  }
  assert.deepEqual((await balanceRows(old.emp)).filter(row => row[0] === 'annual'),
    [['annual', YEAR, 0, 0, 0, 0], ['annual', `P1:${LAST_YEAR}`, 0, 0, 0, 0], ['annual', `P1:${YEAR}`, 0, 10, 0, 0]])
  // وترحيل بييجي بعد إعادة التعيين: صف السنة اللي فاتت متجمّد وبرّه الخط الزمني، فمفيش مُرحّل
  await service.rollover(LAST_YEAR, [org.branchA.id])
  assert.deepEqual((await balanceRows(old.emp)).filter(row => row[0] === 'annual' && !row[1].startsWith('P')), [['annual', YEAR, 0, 0, 0, 0]])

  // (1b) والترحيل قرا صفوف السنة بالجملة، وقبل ما يوصل لصف الموظف إعادة تعيينه اتثبّتت (كاتب قرا قبلها وهيكتب بعدها): الحكم بعد القفل
  //      بيلاقي الصف اتجمّد وخرج من الخط الزمني — مفيش مُرحّل على رصيد الفترة الجديدة
  const crossedOver = await settled(`${LAST_YEAR}-12-31`)
  await balance(crossedOver.emp, 'annual', LAST_YEAR, { taken: 0 })
  const find = service.balances.find
  let crossed = false
  service.balances.find = async function (...args) {
    const rows = await find.apply(this, args)
    if (!crossed && rows.some(row => row.employeeId === crossedOver.emp.id && row.period === LAST_YEAR)) {
      crossed = true
      expectStatus(await rehire(users.hirer, crossedOver.emp, { startDate: `${YEAR}-01-01`, reason: 'اتثبّتت بعد قراءة الترحيل' }), 201)
    }
    return rows
  }
  try { await service.rollover(LAST_YEAR, [org.branchA.id]) } finally { service.balances.find = find }
  assert.deepEqual([crossed, (await balanceRows(crossedOver.emp)).filter(row => row[0] === 'annual')], [true, [['annual', YEAR, 0, 0, 0, 0], ['annual', `P1:${LAST_YEAR}`, 0, 0, 0, 0]]])

  // (2) التجديد اليومي: الموظف اللي محتاج كتابة بيتعاد حكمه وصفه ممسوك، وببياناته وصفوفه اللي اتقرت بعد القفل
  const stale = await hiredOn('2021-01-01')
  await repo('LeaveBalance').update({ employeeId: stale.id, balanceType: 'annual', period: YEAR }, { entitled: 15 })
  const entitledOf = async () => Number((await repo('LeaveBalance').findOneByOrFail({ employeeId: stale.id, balanceType: 'annual', period: YEAR })).entitled)
  const holder = await holdEmployeeRow(stale)
  let renewing
  try {
    renewing = service.renewBalancePeriods(TODAY); renewing.catch(() => undefined)
    assert.deepEqual([await settledWithin(renewing, 1500), await entitledOf()], [false, 15], 'التجديد مستني صف الموظف ومفيش حاجة اتكتبت')
    // وهو مستني: خدمة الموظف انتهت (اتغيّرت والصف ممسوك) — الحكم بعد القفل بيشوف كده ومابيكتبش
    await holder.runner.query(`UPDATE [employees] SET [status] = N'terminated', [isActive] = 0 WHERE [id] = @0`, [stale.id])
    await holder.runner.commitTransaction()
    await renewing
  } finally {
    await holder.release()
    if (renewing) await renewing.catch(() => undefined)
  }
  assert.equal(await entitledOf(), 15, 'مفيش كتابة بحكم اتاخد قبل القفل')
  // (2b) والتجديد قرا صف الموظف بالجملة، وهو مستني صفه الصف ده اتجمّد (اللي بتعمله إعادة التعيين وهي ماسكة الصف): الكتابة بصفوف اتقرت
  //      بعد القفل، فالصف المتجمّد مابيتلمسش
  const iced = await hiredOn('2021-01-01')
  await repo('LeaveBalance').update({ employeeId: iced.id, balanceType: 'annual', period: YEAR }, { entitled: 15 })
  const annualOf = async () => (await query(`SELECT [period], CAST([entitled] AS float) AS [entitled] FROM [leave_balances] WHERE [employeeId] = @0 AND [balanceType] = N'annual' ORDER BY [period]`, [iced.id]))
    .map(row => [row.period, row.entitled])
  const icedHolder = await holdEmployeeRow(iced)
  let renewingIced
  try {
    renewingIced = service.renewBalancePeriods(TODAY); renewingIced.catch(() => undefined)
    assert.equal(await settledWithin(renewingIced, 1500), false, 'التجديد مستني صف الموظف')
    await icedHolder.runner.query(`UPDATE [leave_balances] SET [period] = CONCAT(N'P1:', [period]) WHERE [employeeId] = @0`, [iced.id])
    await icedHolder.runner.commitTransaction()
    await renewingIced
  } finally {
    await icedHolder.release()
    if (renewingIced) await renewingIced.catch(() => undefined)
  }
  assert.deepEqual(await annualOf(), [[`P1:${YEAR}`, 15]])
  // وصف اتقرا قبل التجميد واتحفظ كله بعده (كاتب قديم بيحفظ الكيان كله): قيمته بتتكتب على نفس الصف، ومفتاحه المتجمّد مابيرجعش مفتاح سنة
  const fresh = await hiredOn('2021-01-01')
  const staleRow = await repo('LeaveBalance').findOneByOrFail({ employeeId: fresh.id, balanceType: 'annual', period: YEAR })
  await query(`UPDATE [leave_balances] SET [period] = CONCAT(N'P1:', [period]) WHERE [id] = @0`, [staleRow.id])
  staleRow.entitled = 18
  await repo('LeaveBalance').save(staleRow)
  assert.deepEqual(await query(`SELECT [period], CAST([entitled] AS float) AS [entitled] FROM [leave_balances] WHERE [id] = @0`, [staleRow.id]), [{ period: `P1:${YEAR}`, entitled: 18 }])
  // وموظف على رأس العمل استحقاقه المتخزّن قديم: التجديد بيزامنه عادي
  const plain = await hiredOn('2021-01-01')
  await repo('LeaveBalance').update({ employeeId: plain.id, balanceType: 'annual', period: YEAR }, { entitled: 15 })
  await service.renewBalancePeriods(TODAY)
  assert.equal(Number((await repo('LeaveBalance').findOneByOrFail({ employeeId: plain.id, balanceType: 'annual', period: YEAR })).entitled), 21)
})

test('EP-09: حساب المسير بيحكم على موظفيه ببيانات اتقرت بعد قفل المالية — إعادة تعيين اتثبّتت قبل القفل مابتتحسبش بحكم قديم', async () => {
  const { resolvePayrollRunMembership } = require('../src/payroll/payroll-run-membership')
  const { payrollRunDefinitionOf } = require('../src/payroll/payroll-run-definition')
  const lastDay = `${LAST_YEAR}-06-30`, bounds = month => ({ period: `${LAST_YEAR}-${month}`, startDate: `${LAST_YEAR}-${month}-01`, endDate: `${LAST_YEAR}-${month}-30` })
  try {
    const old = await settled(lastDay)
    // يونيو (شهر آخر يوم عمل) محسوم والموظف فيه؛ ومايو (شهر من خدمته القديمة) لسه مسودة ماتحسبتش ولا مرة، بقايمة فيها الموظف
    await member(await run({ status: 'PAID', ...bounds('06') }), old.emp, 'EXCLUDED')
    const may = await run({ status: 'DRAFT', ...bounds('05'), scopeType: 'CUSTOM', employeeIds: JSON.stringify([old.emp.id]), branchId: null })
    const input = (payrollRun, extra = {}) => ({ run: { id: payrollRun.id, period: payrollRun.period, startDate: String(payrollRun.startDate).slice(0, 10), endDate: String(payrollRun.endDate).slice(0, 10) },
      definition: payrollRunDefinitionOf(payrollRun), salaryEvidenceMode: 'MONTHLY_HISTORY_OR_CURRENT_FILE', today: TODAY, previousMembers: [], ...extra })
    const mine = result => result.rows.find(row => row.employee.id === old.emp.id)
    // من غير تغيير: الموظف المنتهي متغطّي في مايو لحد آخر الشهر (خدمته القديمة)
    const before = mine(await ds.transaction(em => resolvePayrollRunMembership(em, input(may))))
    assert.deepEqual([before.employee.status, before.coverage?.coverFrom, before.coverage?.coverTo], ['terminated', `${LAST_YEAR}-05-01`, `${LAST_YEAR}-05-30`])
    // الحساب قرا الموظف، وقبل ما قفل المالية يتمسك إعادة التعيين اتثبّتت (Codex CRP2V-B-B03): الحكم بعد القفل على البيانات الجديدة
    let calls = 0
    const after = mine(await ds.transaction(em => resolvePayrollRunMembership(em, input(may, { beforeEvaluate: async () => {
      if (++calls === 1) expectStatus(await rehire(users.hirer, old.emp, { startDate: `${LAST_YEAR}-07-01`, reason: 'اتثبّتت قبل قفل الحساب' }), 201)
    } }))))
    assert.deepEqual([calls, after.status, after.code, after.coverage, after.employee.status, String(after.employee.joinDate).slice(0, 10)],
      [1, 'EXCLUDED', 'EXC_JOINS_AFTER_PERIOD', null, 'active', `${LAST_YEAR}-07-01`])
    // وموظف دخل نطاق المسير بعد القراءة الأولى (اتعيّن في الفرع): بيتقفل ويتفحص فرعه هو كمان قبل الحكم عليه
    const april = await run({ status: 'DRAFT', ...bounds('04'), scopeType: 'BRANCH', scopeIds: JSON.stringify([org.branchB.id]), branchId: org.branchB.id })
    const seen = []
    let late
    const scoped = await ds.transaction(em => resolvePayrollRunMembership(em, input(april, { beforeEvaluate: async rows => {
      seen.push(rows.map(row => row.employee.id))
      if (seen.length === 1) late = await employee({ branchId: org.branchB.id })
    } })))
    assert.deepEqual([seen.length, seen[0].includes(late.id), seen[1].includes(late.id), scoped.rows.some(row => row.employee.id === late.id)], [2, false, true, true])
    // وموظف اتنقل فرع بعد القراءة الأولى (نفس الموظف، فرع جديد): الفرع الجديد بيتفحص هو كمان قبل الحكم
    const mover = await employee()
    const march = await run({ status: 'DRAFT', ...bounds('03'), scopeType: 'CUSTOM', employeeIds: JSON.stringify([mover.id]), branchId: null })
    const branches = []
    await ds.transaction(em => resolvePayrollRunMembership(em, input(march, { beforeEvaluate: async rows => {
      branches.push(rows.map(row => row.org.branchId))
      if (branches.length === 1) await repo('Employee').update({ id: mover.id }, { branchId: org.branchB.id })
    } })))
    assert.deepEqual(branches, [[org.branchA.id], [org.branchB.id]])
    // وبيانات بتتغيّر مع كل قراءة (موظف جديد بيدخل النطاق كل مرة): الحساب بيقف بعد 3 محاولات برد «أعد الحساب»، لا بيحكم بقراءة قديمة ولا بيلف للأبد
    const rounds = []
    await assert.rejects(ds.transaction(em => resolvePayrollRunMembership(em, input(april, { beforeEvaluate: async rows => {
      rounds.push(rows.length)
      await employee({ branchId: org.branchB.id })
    } }))), error => error.getStatus?.() === 409 && error.message === 'بيانات موظفي المسير بتتغيّر دلوقتي — أعد الحساب بعد لحظات')
    assert.deepEqual(rounds, [rounds[0], rounds[0] + 1, rounds[0] + 2])
    // ومن غير قفل (المعاينة): قراءة واحدة زي الأول
    const preview = await ds.transaction(em => resolvePayrollRunMembership(em, input(april)))
    assert.equal(preview.rows.some(row => row.employee.id === late.id), true)
  } finally { await query(`UPDATE [payroll_runs] SET [status] = 'CANCELLED'`) }
})

test('EP-10: مرجع مسير مخفي عن القارئ مابيظهرش في قراءة الفترات ولا في رفض إعادة التعيين — لا شهره ولا نهايته', async () => {
  const lastDay = `${LAST_YEAR}-06-30`, good = { startDate: `${LAST_YEAR}-08-01`, reason: 'سبب مكتوب' }
  try {
    const old = await settled(lastDay)
    // مسير أبريل لسه محسوب والموظف مشمول فيه، وعضويته محفوظة بلقطة فرع تاني (كان في الفرع ده وقتها): قارئ فرعه الحالي مايشوفش المسير ده
    const hidden = await run({ status: 'CALCULATED', period: `${LAST_YEAR}-04`, startDate: `${LAST_YEAR}-04-01`, endDate: `${LAST_YEAR}-04-30`, branchId: org.branchB.id })
    await member(hidden, old.emp, 'INCLUDED', org.branchB.id)
    const GENERIC = 'الموظف داخل في مسير لسه مااتعتمدش بيغطّي أيام من خدمته القديمة — لازم يتعتمد أو يتلغى قبل إعادة التعيين'
    const read = expectStatus(await periodsOf(users.hirer, old.emp), 200), refused = await rehire(users.hirer, old.emp, good)
    assert.deepEqual([read.rehire.code, read.rehire.blocked, refusal(refused), refused.body.message], ['REHIRE_PENDING_OLD_RUN', GENERIC, [400, 'REHIRE_PENDING_OLD_RUN'], GENERIC])
    for (const body of [read, refused.body]) assert.equal(JSON.stringify(body).includes(`${LAST_YEAR}-04`), false, 'شهر المسير المخفي مش في الرد (Codex CRP2V-B-B04)')
    // حساب الشركة (شايف كل المسيرات) بياخد نفس المنع بشهر المسير
    assert.equal(expectStatus(await periodsOf(users.admin, old.emp), 200).rehire.blocked,
      `الموظف داخل في مسير لسه مااتعتمدش بيغطّي أيام من خدمته القديمة (مسير شهر ${LAST_YEAR}-04) — اعتمده أو ألغيه قبل إعادة التعيين`)
    await repo('PayrollRun').update({ id: hidden.id }, { status: 'CANCELLED' })
    // مسير شهر آخر يوم عمل محسوم والموظف فيه بلقطة الفرع التاني، ونهايته أبعد من نهاية الدورة: الحد جاي من مسير القارئ مايشوفوش،
    // فالإتاحة عنده مقفولة بسبب عام من غير تاريخ ولا شهر، وأي تاريخ بنفس الرفض (مفيش نهاية تتخمّن بالتجربة)؛ وحساب الشركة شايف الحد وبيعيد التعيين
    const settledRun = await run({ status: 'PAID', period: `${LAST_YEAR}-07`, startDate: `${LAST_YEAR}-06-16`, endDate: `${LAST_YEAR}-07-15`, branchId: org.branchB.id })
    await member(settledRun, old.emp, 'INCLUDED', org.branchB.id)
    const HIDDEN_RUN = 'أيام من خدمته القديمة داخلة في مسير خارج نطاق صلاحيتك — إعادة التعيين محتاجة حساب يشوف المسير ده'
    const stateFor = async user => { const view = expectStatus(await periodsOf(user, old.emp), 200).rehire; return [view.available, view.code, view.blocked, view.minStartDate] }
    assert.deepEqual([await stateFor(users.hirer), await stateFor(users.admin)], [[false, 'REHIRE_HIDDEN_RUN', HIDDEN_RUN, null], [true, null, null, `${LAST_YEAR}-07-16`]])
    assert.equal(JSON.stringify(expectStatus(await periodsOf(users.hirer, old.emp), 200)).includes(`${LAST_YEAR}-07`), false, 'لا شهر المسير المخفي ولا نهايته في القراءة')
    for (const startDate of [`${LAST_YEAR}-07-10`, `${LAST_YEAR}-07-16`, `${LAST_YEAR}-12-01`]) {
      const hiddenRun = await rehire(users.hirer, old.emp, { ...good, startDate })
      assert.deepEqual([refusal(hiddenRun), hiddenRun.body.message, JSON.stringify(hiddenRun.body).includes(`${LAST_YEAR}-07`)], [[400, 'REHIRE_HIDDEN_RUN'], HIDDEN_RUN, false], startDate)
    }
    assert.deepEqual(await unchanged(old), [NOT_ENDED, []])
    // تاريخ قبل الحد من حساب الشركة: مرفوض بتاريخه (هو شايف المسير)، ومن الحد مقبول
    const early = await rehire(users.admin, old.emp, { ...good, startDate: `${LAST_YEAR}-07-15` })
    assert.deepEqual([refusal(early), early.body.message.includes(`${LAST_YEAR}-07-16`)], [[400, 'REHIRE_START_TOO_EARLY'], true])
    expectStatus(await rehire(users.admin, old.emp, { ...good, startDate: `${LAST_YEAR}-07-16` }), 201)
  } finally { await query(`UPDATE [payroll_runs] SET [status] = 'CANCELLED'`) }
})

test('EP-11: أثر تعديل الملف على الرصيد جوه معاملة التعديل وتحت صف الموظف — رصيد افتتاحي من الخدمة القديمة مابيوصلش للفترة الجديدة', async () => {
  const lastDay = `${YEAR}-01-31`, start = `${YEAR}-02-01`
  const employees = app.get(require('../src/employees/employees.service').EmployeesService)
  const edit = (emp, body) => request(users.admin, 'PATCH', `/employees/${emp.id}`, body)
  // توقيف تعديل الملف عند دخوله كتابة الرصيد (name)، وإعادة التعيين تيجي وهو واقف: لازم تستنى، والنتيجة ترتيب كامل (التعديل كله ثم إعادة التعيين)
  async function crossed(name, body) {
    const old = await settled(lastDay)
    await balance(old.emp, 'annual', YEAR)
    const original = employees[name]
    let entered, release, paused = false, job, rehired
    const reached = new Promise(resolve => { entered = resolve }), barrier = new Promise(resolve => { release = resolve })
    employees[name] = async function (em, id, ...rest) {
      if (!paused && id === old.emp.id) { paused = true; entered(); await barrier }
      return original.call(this, em, id, ...rest)
    }
    try {
      job = edit(old.emp, body); job.catch(() => undefined)
      await Promise.race([reached, new Promise((_, reject) => setTimeout(() => reject(new Error(`تعديل الملف ماوصلش لـ${name}`)), 20000))])
      rehired = rehire(users.hirer, old.emp, { startDate: start, reason: 'رجع والتعديل شغال' })
      assert.equal(await settledWithin(rehired, 1500), false, 'إعادة التعيين مستنية معاملة التعديل (قفل مالية الموظف)')
      release()
      expectStatus(await job, 200)
      expectStatus(await rehired, 201)
    } finally {
      release(); employees[name] = original
      if (job) await job.catch(() => undefined)
      if (rehired) await rehired.catch(() => undefined)
    }
    return old
  }
  // (1) رصيد افتتاحي 10 أيام ورقم عقد (Codex CRP2W-B01): الافتتاحي على صف الخدمة القديمة واتجمّد معاه، والفترة الجديدة من غيره، ورقم العقد
  //     القديم اتفضّى مع إعادة التعيين — مش نتيجة مخلوطة
  const opened = await crossed('openingBalanceIn', { openingBalanceDays: 10, openingBalanceExpiry: `${NEXT_YEAR}-12-31`, contractNumber: 'OLD-SERVICE-1' })
  assert.deepEqual((await balanceRows(opened.emp)).filter(row => row[0] === 'annual'), [['annual', YEAR, 0, 0, 0, 0], ['annual', `P1:${YEAR}`, 0, 10, 0, 0]])
  assert.deepEqual((({ contractNumber, joinDate }) => [contractNumber, String(joinDate).slice(0, 10)])(await repo('Employee').findOneByOrFail({ id: opened.emp.id })), [null, start])
  // (2) قفل استحقاق السنوي: المزامنة على صف الخدمة القديمة قبل التجميد
  const flagged = await crossed('annualEntitlementIn', { annualLeaveEntitled: false })
  const entitledOf = async emp => (await query(`SELECT [period], CAST([entitled] AS float) AS [entitled] FROM [leave_balances] WHERE [employeeId] = @0 AND [balanceType] = N'annual' ORDER BY [period]`, [emp.id]))
    .map(row => [row.period, row.entitled])
  assert.deepEqual(await entitledOf(flagged.emp), [[YEAR, 0], [`P1:${YEAR}`, 0]])
  // (3) والترتيب التاني كامل هو كمان: تعديل بعد إعادة التعيين بيكتب على الفترة الجديدة، والصف المتجمّد زي ما هو
  expectStatus(await edit(opened.emp, { openingBalanceDays: 4, openingBalanceExpiry: `${NEXT_YEAR}-12-31` }), 200)
  assert.deepEqual((await balanceRows(opened.emp)).filter(row => row[0] === 'annual'), [['annual', YEAR, 0, 4, 0, 0], ['annual', `P1:${YEAR}`, 0, 10, 0, 0]])
  // (4) كتابة الرصيد من تعديل الملف بتاخد صف الموظف (زي باقي كتّاب الرصيد): صف ممسوك = التعديل بيستنى ومفيش حاجة اتكتبت
  const waiting = await hiredOn('2021-01-01')
  const holder = await holdEmployeeRow(waiting)
  let pending
  try {
    pending = edit(waiting, { openingBalanceDays: 6, openingBalanceExpiry: `${NEXT_YEAR}-12-31` }); pending.catch(() => undefined)
    assert.deepEqual([await settledWithin(pending, 1500), (await balanceRows(waiting)).filter(row => row[0] === 'annual')], [false, [['annual', YEAR, 0, 0, 0, 0]]])
  } finally { await holder.release() }
  expectStatus(await pending, 200)
  assert.deepEqual((await balanceRows(waiting)).filter(row => row[0] === 'annual'), [['annual', YEAR, 0, 6, 0, 0]])
  // وموظف جديد من الشاشة: صفوف سنته ورصيده الافتتاحي زي الأول
  const created = expectStatus(await request(users.admin, 'POST', '/employees', { ...(await employeeRequiredFields(ds, org.branchA.id)), fullName: 'موظف جديد برصيد افتتاحي',
    branchId: org.branchA.id, joinDate: TODAY, basicSalary: 5000, currency: 'SAR', openingBalanceDays: 3, openingBalanceExpiry: `${NEXT_YEAR}-12-31` }), 201)
  assert.deepEqual((await balanceRows(created)).map(row => [row[0], row[1], row[3]]), [['annual', YEAR, 3], ['sick', YEAR, 0]])
})

test('EP-12: فحص الرصيد مابيكتبش صف، وصفوف السنة الناقصة تحت صف الموظف — صف بمفتاح ذكرى تعيين قديمة مابيتكتبش بعد إعادة التعيين', async () => {
  const service = leaves(), { Repository } = require('../node_modules/typeorm')
  const gateDate = `${NEXT_YEAR}-01-31`, start = `${YEAR}-02-01`
  const rowsOf = async emp => (await balanceRows(emp)).filter(row => !row[1].startsWith('P'))
  // المتاح زي ما بوابة الفحص بتحسبه (من غير ما تكتب صف): من رسالة رفض طلب أكبر من أي رصيد
  const availableAt = async (emp, date = gateDate) => {
    const refused = await service.assertSufficient(emp.id, 'annual', 9999, date).then(() => null, error => error.message)
    const found = /^الرصيد غير كافٍ: المتبقي ([\d.]+) يوم والمطلوب 9999$/.exec(refused ?? '')
    assert.ok(found, `رسالة الرفض: ${refused}`)
    return Number(found[1])
  }
  await repo('LeaveType').update({ id: org.annualType.id }, { renewalBasis: 'HIRE_ANNIVERSARY' })
  await setConfig('leave.accrual_mode', 'daily')
  try {
    // (1) فحص رصيد بدأ بسياق الخدمة القديمة (تعيين سبتمبر)، وإعادة التعيين (فبراير) اتثبّتت وهو واقف (Codex CRP2W-B02): الفحص بيكمّل من غير
    //     ما يكتب صف — فمفيش صف بمفتاح ذكرى سبتمبر بيغيّر استحقاق الفترة الجديدة، والمتاح زي موظف جديد اتعيّن في نفس اليوم
    const old = await settled(`${LAST_YEAR}-06-30`, { joinDate: '2020-09-01' })
    const reference = await hiredOn(start)
    const context = service.accrualContext
    let entered, release, paused = false, job
    const reached = new Promise(resolve => { entered = resolve }), barrier = new Promise(resolve => { release = resolve })
    service.accrualContext = async function (employeeId, ...rest) {
      const ctx = await context.call(this, employeeId, ...rest)
      if (!paused && employeeId === old.emp.id) { paused = true; entered(); await barrier }
      return ctx
    }
    try {
      job = service.assertSufficient(old.emp.id, 'annual', 1, gateDate); job.catch(() => undefined)
      await Promise.race([reached, new Promise((_, reject) => setTimeout(() => reject(new Error('فحص الرصيد ماوصلش لقراءة السياق')), 20000))])
      expectStatus(await rehire(users.hirer, old.emp, { startDate: start, reason: 'رجع وفحص الرصيد شغال' }), 201)
      release()
      await job.catch(() => undefined)
    } finally { release(); service.accrualContext = context }
    assert.deepEqual(await rowsOf(old.emp), await rowsOf(reference), 'صفوف الفترة الجديدة زي المرجع بالحرف')
    assert.equal((await balanceRows(old.emp)).some(row => row[1] === `${YEAR}-09-01` || row[1] === `${NEXT_YEAR}-09-01`), false, 'مفيش صف بذكرى التعيين القديمة')
    assert.equal(await availableAt(old.emp), await availableAt(reference), 'المتاح زي الموظف المرجع')
    assert.deepEqual(await rowsOf(old.emp), await rowsOf(reference), 'والفحص نفسه ماكتبش صف')

    // (2) الفحص نفسه مابيكتبش صف لأي موظف (كان بيعمل صف السنة الناقص)، وحكمه زي ما هو: الكفاية والنقص برسالته، والنوع من غير رصيد برسالته
    const plain = await hiredOn('2020-03-15')
    const before = await balanceRows(plain)
    await service.assertSufficient(plain.id, 'annual', 1, gateDate)
    await service.assertSufficient(plain.id, 'sick', 5, `${NEXT_YEAR}-06-01`)
    await assert.rejects(service.assertSufficient(plain.id, 'annual', 300, gateDate), error => error.getStatus?.() === 400 && /^الرصيد غير كافٍ: المتبقي /.test(error.message))
    await assert.rejects(service.assertSufficient(plain.id, 'hajj', 1, gateDate), error => error.getStatus?.() === 400 && error.message === `لا يوجد رصيد «hajj» للموظف في سنة ${NEXT_YEAR}`)
    assert.deepEqual(await balanceRows(plain), before, 'ولا صف اتكتب من الفحص')
    // والصف الناقص بيتعمل وقت الخصم نفسه (تحت قفل صف الموظف): بمفتاح ذكرى تعيينه
    await ds.transaction(em => service.deduct(em, plain.id, 'annual', 1, gateDate))
    assert.deepEqual((await balanceRows(plain)).filter(row => row[0] === 'annual' && row[2] === 1).map(row => row[1]), [`${YEAR}-03-15`])

    // (3) اعتماد طلب إجازة معلّق من قبل انتهاء الخدمة، واقف بعد فحص الرصيد وقبل تنفيذه، وإعادة التعيين اتثبّتت (دليل Codex التاني): التنفيذ
    //     بيتحكم بسياق الفترة الجديدة تحت القفل — مفيش إجازة بتتصرف بأكتر من المتاح للموظف المرجع، ومفيش صف بيفضل من المحاولة
    const pendingOld = await settled(`${LAST_YEAR}-06-30`, { joinDate: '2020-09-01' })
    const twin = await hiredOn(start)
    const type = await repo('RequestType').save({ code: 'EP12_ANNUAL', nameAr: 'إجازة سنوية (اختبار)', category: 'leaves', destinationHandler: 'leave_calendar_balance', affectsBalance: true, isActive: true })
    const pendingRequest = await repo('Request').save({ typeCode: 'LEAVE', definitionCode: type.code, requesterId: pendingOld.emp.id, createdByUserId: pendingOld.login.id, branchId: org.branchA.id,
      status: 'UNDER_REVIEW', currentStep: 1, resolvedSteps: JSON.stringify([{ stepOrder: 1, role: 'hr', approverEmployeeId: null, dueAt: null }]),
      payload: JSON.stringify({ leaveTypeCode: 'ANNUAL', fromDate: `${NEXT_YEAR}-01-29`, toDate: gateDate, days: 3, reason: 'طلب معلّق من قبل انتهاء الخدمة' }) })
    const approve = () => request(users.admin, 'POST', `/requests/${pendingRequest.id}/act`, { action: 'APPROVE' })
    const save = Repository.prototype.save
    let atLeave, go, held = false, acting
    const leaveReached = new Promise(resolve => { atLeave = resolve }), leaveBarrier = new Promise(resolve => { go = resolve })
    Repository.prototype.save = async function (row, ...rest) {
      if (!held && row && row.requestId === pendingRequest.id && row.leaveTypeCode === 'ANNUAL') { held = true; atLeave(); await leaveBarrier }
      return save.call(this, row, ...rest)
    }
    try {
      acting = approve(); acting.catch(() => undefined)
      await Promise.race([leaveReached, acting.then(response => { throw new Error('الاعتماد خلص قبل الوقفة: ' + JSON.stringify(response.body)) }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('الاعتماد ماوصلش لحفظ الإجازة')), 20000))])
      expectStatus(await rehire(users.hirer, pendingOld.emp, { startDate: start, reason: 'رجع والاعتماد شغال' }), 201)
      go()
      const crossedOver = await acting
      // الرفض من الخصم نفسه (تحت قفل صف الموظف وبسياق الفترة الجديدة)، مش من بوابة الفحص اللي عدّت بالسياق القديم
      assert.match(answer(crossedOver).join(' '), /^400 لم يُعتمد الطلب — الرصيد غير كافٍ عند التنفيذ — المتبقي /, JSON.stringify(crossedOver.body))
    } finally { go(); Repository.prototype.save = save; if (acting) await acting.catch(() => undefined) }
    const available = await availableAt(twin, `${NEXT_YEAR}-01-29`)
    assert.ok(available < 3, `المرجع عنده ${available} يوم`)
    assert.equal(await availableAt(pendingOld.emp, `${NEXT_YEAR}-01-29`), available)
    assert.deepEqual([await repo('Leave').countBy({ requestId: pendingRequest.id }), await rowsOf(pendingOld.emp)], [0, await rowsOf(twin)])
    // وتكرار الاعتماد: بيتحكم زي المرجع (الرصيد مش كفاية) ومفيش إجازة
    assert.equal((await approve()).status, 400)
    assert.deepEqual([await repo('Leave').countBy({ requestId: pendingRequest.id }), await rowsOf(pendingOld.emp)], [0, await rowsOf(twin)])
  } finally {
    await repo('LeaveType').update({ id: org.annualType.id }, { renewalBasis: 'YEAR_START' })
    await setConfig('leave.accrual_mode', 'monthly')
  }

  // (4) صفوف السنة الناقصة (بعد الترحيل والإقفال): الصف بيتعمل وصف موظفه ممسوك، وبتاريخ تعيينه وحالته اللي اتقروا بعد القفل
  const far = String(Number(NEXT_YEAR) + 1)
  const moved = await hiredOn('2021-01-01'), ended = await hiredOn('2021-01-01'), steady = await hiredOn('2021-01-01')
  const yearRows = async emp => (await balanceRows(emp)).filter(row => row[1] === far).map(row => row[0])
  const holders = [await holdEmployeeRow(moved), await holdEmployeeRow(ended)]
  let ensuring
  try {
    ensuring = service.ensureYearRows(far, [org.branchA.id]); ensuring.catch(() => undefined)
    assert.deepEqual([await settledWithin(ensuring, 1500), await yearRows(moved), await yearRows(ended)], [false, [], []], 'مستني صف الموظف ومفيش صف اتكتب')
    // وهو مستني: واحد تاريخ تعيينه بقى بعد السنة دي، والتاني خدمته انتهت — الحكم بعد القفل
    await holders[0].runner.query(`UPDATE [employees] SET [joinDate] = @1 WHERE [id] = @0`, [moved.id, `${Number(far) + 1}-03-01`])
    await holders[0].runner.commitTransaction()
    await holders[1].runner.query(`UPDATE [employees] SET [status] = N'terminated', [isActive] = 0 WHERE [id] = @0`, [ended.id])
    await holders[1].runner.commitTransaction()
    await ensuring
  } finally {
    for (const holder of holders) await holder.release()
    if (ensuring) await ensuring.catch(() => undefined)
  }
  assert.deepEqual([await yearRows(moved), await yearRows(ended), await yearRows(steady)], [[], [], ['annual', 'sick']])
})

test('EP-13: معالج طلب بيحفظ كيان الموظف كله بيقراه وصفه مقفول — اعتماد طلب قديم عبر إعادة التعيين مابيرجّعش تاريخ التعيين القديم', async () => {
  const lastDay = `${YEAR}-01-31`, start = `${YEAR}-02-01`, { Repository } = require('../node_modules/typeorm'), IBAN = 'SA4420000001234567891234'
  const old = await settled(lastDay)
  // طلب تغيير حساب بنكي معلّق من قبل انتهاء الخدمة (حالة محفوظة)، واعتماده واقف عند حفظ الموظف — بعد ما قرا صفه
  const type = await repo('RequestType').save({ code: 'EP13_BANK', nameAr: 'تغيير حساب بنكي (اختبار)', category: 'financial', destinationHandler: 'payroll_bank_secure', isActive: true })
  const pending = await repo('Request').save({ typeCode: type.code, definitionCode: type.code, requesterId: old.emp.id, createdByUserId: old.login.id, branchId: org.branchA.id,
    status: 'UNDER_REVIEW', currentStep: 1, resolvedSteps: JSON.stringify([{ stepOrder: 1, role: 'hr', approverEmployeeId: null, dueAt: null }]),
    payload: JSON.stringify({ iban: IBAN, bankName: 'بنك الاختبار', reason: 'حساب جديد' }) })
  const save = Repository.prototype.save
  let entered, release, paused = false, acting, rehired
  const reached = new Promise(resolve => { entered = resolve }), barrier = new Promise(resolve => { release = resolve })
  Repository.prototype.save = async function (row, ...rest) {
    if (!paused && row && row.id === old.emp.id && row.iban === IBAN && row.employeeCode === old.emp.employeeCode) { paused = true; entered(); await barrier }
    return save.call(this, row, ...rest)
  }
  try {
    acting = request(users.admin, 'POST', `/requests/${pending.id}/act`, { action: 'APPROVE' }); acting.catch(() => undefined)
    await Promise.race([reached, acting.then(response => { throw new Error('الاعتماد خلص قبل الوقفة: ' + JSON.stringify(response.body).slice(0, 300)) }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('الاعتماد ماوصلش لحفظ الموظف')), 20000))])
    rehired = rehire(users.hirer, old.emp, { startDate: start, reason: 'رجع واعتماد طلبه القديم شغال' })
    assert.equal(await settledWithin(rehired, 1500), false, 'إعادة التعيين مستنية صف الموظف (المعالج قراه بقفل)')
    release()
    expectStatus(await acting, 201)
    expectStatus(await rehired, 201)
  } finally {
    release(); Repository.prototype.save = save
    if (acting) await acting.catch(() => undefined)
    if (rehired) await rehired.catch(() => undefined)
  }
  // ترتيب كامل (الاعتماد ثم إعادة التعيين): الحساب البنكي الجديد اتحفظ، وتاريخ التعيين الجديد والحالة زي ما إعادة التعيين كتبتهم
  assert.deepEqual((({ iban, joinDate, status, isActive }) => [iban, String(joinDate).slice(0, 10), status, isActive])(await repo('Employee').findOneByOrFail({ id: old.emp.id })), [IBAN, start, 'active', true])
  assert.deepEqual((await periodRows(old.emp)).map(period => [period.periodNo, period.endDate]), [[1, lastDay]])
})
