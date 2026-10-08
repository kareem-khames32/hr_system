'use strict'
// B3.12: لائحة الجزاءات على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر (hr_penalties_test_<16 hex>)، عبر HTTP بتوكنات موقّعة محليًا ومن غير كلمات
// مرور. ولا رسالة بريد حقيقية.
//  PN-01) اللائحة: المخالفة بدرجات تكرارها (القيم)، ونوع الخصم لخصم الأيام، بالصلاحية؛ والموديول مقفول افتراضيًا.
//  PN-02) التوقيع: رقم التكرار في المدة (إعداد) تحت قفل الموظف ومطابق للمعاينة، بنطاق الفروع؛ أول مرة إنذار وتاني مرة خصم يومين ← **خصم مصنّف
//         من النوع الموجود** في سلسلته، مربوط بالقضية؛ ورفض الخصومات مابيسيبش جزاء؛ والملغى مابيتحسبش في التكرار؛ و«جزاءاتي» للموظف.
// Run (من api/): node --test test/penalties.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_penalties_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_penalties_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-penalties-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/cases/penalties.service')
let app, master, ds, base, modules, created = false, employeeNumber = 0
const org = {}, users = {}, emps = {}, state = {}

function assertDisposable() {
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
const payloadOf = user => ({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false,
  permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${jwt.sign(payloadOf(user))}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const expectStatus = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const messageOf = response => [].concat(response.body?.message ?? []).join('، ')
const answer = response => [response.status, messageOf(response)]
const employee = (extra = {}) => repo('Employee').save({ employeeCode: `PN${String(++employeeNumber).padStart(3, '0')}`, fullName: `موظف الجزاءات ${employeeNumber}`, branchId: org.branchA.id,
  departmentId: null, teamId: null, managerEmployeeId: null, joinDate: '2020-01-01', basicSalary: 9000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0,
  otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'cash', ...extra })
const account = (label, permissions, extra = {}) => repo('User').save({ email: `${label}@penalties.invalid`, displayName: `حساب ${label}`, passwordHash: 'test-only',
  role: 'employee', branchId: org.branchA.id, permissions: JSON.stringify(permissions), isActive: true, ...extra })
const { localDateOf } = require('../src/attendance/attendance.service')
const dayAgo = days => localDateOf(new Date(Date.now() - days * 86400000))
const P = '/penalties'

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
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
  for (const cron of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) cron.stop()
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  modules = app.get(require('../src/modules-registry/modules.service').ModulesService)
  await app.get(require('../src/settings/config-defaults.service').ConfigDefaultsService).onApplicationBootstrap()
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '1' }, { key: 'payroll.monthly_days', value: '30' }, { key: 'payroll.daily_hours', value: '8' },
    { key: 'payroll.policy.default_period_type', value: 'CALENDAR_MONTH' }, { key: 'payroll.policy.min_net_guarantee', value: 'null' },
    { key: 'payroll.policy.net_floor_pct', value: 'null' }, { key: 'payroll.policy.max_deduction_pct_of_gross', value: 'null' },
    { key: 'loan.insufficient_net_behavior', value: 'PARTIAL_THEN_CARRY' }, { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' },
  ])

  org.branchA = await repo('Branch').save({ code: 'PN_A', name: 'فرع الجزاءات أ', country: 'SA' })
  org.branchB = await repo('Branch').save({ code: 'PN_B', name: 'فرع الجزاءات ب', country: 'SA' })
  emps.late = await employee({ fullName: 'موظف متأخر' })
  emps.other = await employee({ fullName: 'موظف تاني' })
  emps.b1 = await employee({ fullName: 'موظف فرع ب', branchId: org.branchB.id })
  users.admin = await repo('User').save({ email: 'admin@penalties.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', branchId: null,
    scopeAllBranches: true, permissions: '[]', isActive: true })
  // صاحب اللائحة ومعاه إدارة الخصومات (من غير سلطة الموارد البشرية: خصمه بيمشي في سلسلته)؛ وواحد من غير الخصومات؛ وواحد في فرع ب
  users.hr = await account('hr', ['cases.penalties', 'cases.investigate', 'deductions.view', 'deductions.manage'])
  users.bare = await account('bare', ['cases.penalties'])
  users.hrB = await account('hr-b', ['cases.penalties', 'deductions.manage'], { branchId: org.branchB.id })
  users.late = await account('late', [], { employeeId: emps.late.id })
  expectStatus(await request(users.admin, 'PUT', '/modules/cases', { enabled: true }), 200); modules.invalidate()
  state.daysType = expectStatus(await request(users.admin, 'POST', '/deductions/types', { code: 'PENALTY_DAYS', nameAr: 'جزاء تأديبي بالأيام', category: 'DISCIPLINARY', calcMethod: 'DAYS_OF_SALARY',
    creatorScopes: ['HR'], approvalSteps: ['HR'] }), 201).id
  state.fixedType = expectStatus(await request(users.admin, 'POST', '/deductions/types', { code: 'FIXED_FINE', nameAr: 'غرامة ثابتة', category: 'DISCIPLINARY', calcMethod: 'FIXED_AMOUNT', creatorScopes: ['HR'],
    approvalSteps: ['HR'] }), 201).id
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created) {
      assertDisposable()
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  fs.rmSync(uploads, { recursive: true, force: true })
  if (errors.length) t.diagnostic(errors.map(error => error.message).join(' | '))
}, { timeout: 60000 })

test('PN-01: اللائحة — مخالفة بدرجات تكرارها ونوع خصمها، بالصلاحية، والتعديل بالخانات', async () => {
  const V = P + '/violations'
  const body = (extra = {}) => ({ category: 'الانضباط', name: 'التأخير عن موعد الدوام', steps: [{ action: 'WARNING' }, { action: 'DEDUCT_DAYS', days: 2 }, { action: 'SUSPENSION', days: 3 }, { action: 'TERMINATION' }],
    deductionTypeId: state.daysType, ...extra })
  assert.deepEqual([(await request(users.late, 'GET', V)).status, (await request(users.late, 'POST', V, body())).status], [403, 403])
  for (const [change, message] of [[{ category: 'ا' }, rules.PENALTY_NAME], [{ name: 'اب' }, rules.PENALTY_NAME], [{ steps: [] }, rules.PENALTY_STEPS], [{ steps: [{ action: 'FINE' }] }, rules.PENALTY_STEPS],
    [{ steps: [{ action: 'DEDUCT_DAYS' }] }, rules.PENALTY_STEPS], [{ steps: [{ action: 'DEDUCT_DAYS', days: 31 }] }, rules.PENALTY_STEPS], [{ steps: [{ action: 'DEDUCT_DAYS', days: 0.3 }] }, rules.PENALTY_STEPS],
    [{ steps: [{ action: 'SUSPENSION', days: 1.5 }] }, rules.PENALTY_STEPS], [{ steps: [{ action: 'WARNING', days: 1 }] }, rules.PENALTY_STEPS], [{ steps: Array(5).fill({ action: 'WARNING' }) }, rules.PENALTY_STEPS],
    [{ deductionTypeId: null }, rules.PENALTY_DEDUCTION_TYPE], [{ deductionTypeId: state.fixedType }, rules.PENALTY_DEDUCTION_TYPE], [{ deductionTypeId: 987654 }, rules.PENALTY_DEDUCTION_TYPE]]) {
    assert.deepEqual(answer(await request(users.hr, 'POST', V, body(change))), [400, message], JSON.stringify(change).slice(0, 70))
  }
  assert.equal(await repo('PenaltyViolation').count(), 0)
  const made = expectStatus(await request(users.hr, 'POST', V, body({ name: '  التأخير   عن موعد الدوام ' })), 200)
  assert.deepEqual([made.windowDays, made.deductionTypes.map(row => row.nameAr), made.violations.map(row => [row.category, row.name, row.deductionTypeName, row.isActive, row.steps.map(step => [step.occurrenceLabel, step.label])])],
    [180, ['جزاء تأديبي بالأيام'], [['الانضباط', 'التأخير عن موعد الدوام', 'جزاء تأديبي بالأيام', true,
      [['التكرار الأول', 'إنذار كتابي'], ['التكرار التاني', 'خصم أيام (2 يوم)'], ['التكرار التالت', 'إيقاف عن العمل (3 يوم)'], ['التكرار الرابع', 'فصل']]]]])
  state.violation = made.violations[0].id
  // مخالفة إنذارات بس: من غير نوع خصم
  const warnOnly = expectStatus(await request(users.hr, 'POST', V, { category: 'السلوك', name: 'مخالفة الزي', steps: [{ action: 'WARNING' }], deductionTypeId: state.daysType }), 200).violations.find(row => row.name === 'مخالفة الزي')
  assert.deepEqual([warnOnly.deductionTypeId, warnOnly.steps.length], [null, 1])
  state.warnOnly = warnOnly.id
  // التعديل بالخانات اللي اتبعتت بس
  const edited = expectStatus(await request(users.hr, 'PATCH', V + '/' + state.warnOnly, { isActive: false }), 200).violations.find(row => row.id === state.warnOnly)
  assert.deepEqual([edited.name, edited.isActive, edited.steps.length], ['مخالفة الزي', false, 1])
  assert.deepEqual(answer(await request(users.hr, 'PATCH', V + '/987654', { isActive: false })), [404, rules.PENALTY_VIOLATION_NOT_FOUND])
})

test('PN-02: التوقيع — التكرار في المدة ومطابق للمعاينة، وخصم الأيام خصم مصنّف في سلسلته مربوط بالقضية، ورفض الخصومات مابيسيبش جزاء، والملغى مابيتحسبش', async () => {
  const period = localDateOf(new Date()).slice(0, 7)
  const body = (extra = {}) => ({ employeeId: emps.late.id, violationId: state.violation, incidentDate: dayAgo(10), ...extra })
  // المعاينة: بالصلاحية وبالنطاق والقيم
  assert.deepEqual([(await request(users.late, 'POST', P + '/preview', body())).status, (await request(users.late, 'POST', P, body())).status], [403, 403])
  for (const [change, message] of [[{ employeeId: emps.b1.id }, rules.PENALTY_EMPLOYEE], [{ employeeId: 987654 }, rules.PENALTY_EMPLOYEE], [{ violationId: state.warnOnly }, rules.PENALTY_VIOLATION_NOT_FOUND],
    [{ violationId: 987654 }, rules.PENALTY_VIOLATION_NOT_FOUND], [{ incidentDate: '2026-02-31' }, rules.PENALTY_DATE], [{ incidentDate: localDateOf(new Date(Date.now() + 2 * 86400000)) }, rules.PENALTY_DATE]]) {
    assert.deepEqual(answer(await request(users.hr, 'POST', P + '/preview', body(change))), [400, message], JSON.stringify(change))
  }
  const first = expectStatus(await request(users.hr, 'POST', P + '/preview', body()), 200)
  assert.deepEqual([first.employeeName, first.occurrence, first.occurrenceLabel, first.action, first.label, first.needsPeriod, first.windowDays], ['موظف متأخر', 1, 'التكرار الأول', 'WARNING', 'إنذار كتابي', false, 180])
  assert.equal(await repo('EmployeePenalty').count(), 0, 'المعاينة مابتكتبش')
  // التوقيع لازم يطابق المعاينة
  assert.deepEqual([answer(await request(users.hr, 'POST', P, body())), answer(await request(users.hr, 'POST', P, body({ expectedOccurrence: 2 })))], [[409, rules.PENALTY_CHANGED], [409, rules.PENALTY_CHANGED]])
  const warned = expectStatus(await request(users.hr, 'POST', P, body({ expectedOccurrence: 1, note: ' اتأخر ساعة ' })), 201)
  assert.deepEqual([warned.employeeName, warned.violationName, warned.occurrence, warned.label, warned.status, warned.deductionRequestId, warned.note], ['موظف متأخر', 'التأخير عن موعد الدوام', 1, 'إنذار كتابي', 'ACTIVE', null, 'اتأخر ساعة'])
  assert.equal(await repo('DeductionRequest').count(), 0, 'الإنذار مالوش أثر مالي')
  // ضغطتين مع بعض بنفس رقم التكرار: واحدة بس
  const race = await Promise.all([request(users.hr, 'POST', P, body({ employeeId: emps.other.id, expectedOccurrence: 1 })), request(users.hr, 'POST', P, body({ employeeId: emps.other.id, expectedOccurrence: 1 }))])
  assert.deepEqual([race.map(response => response.status).sort(), await repo('EmployeePenalty').count({ where: { employeeId: emps.other.id } })], [[201, 409], 1])

  // تاني مرة: خصم يومين — محتاج شهر المسير، وبيتعمل خصم مصنّف من النوع الموجود في سلسلته، مربوط بالقضية
  const second = expectStatus(await request(users.hr, 'POST', P + '/preview', body({ incidentDate: dayAgo(3) })), 200)
  assert.deepEqual([second.occurrence, second.label, second.needsPeriod], [2, 'خصم أيام (2 يوم)', true])
  assert.deepEqual(answer(await request(users.hr, 'POST', P, body({ incidentDate: dayAgo(3), expectedOccurrence: 2 }))), [400, rules.PENALTY_PERIOD])
  // ملف قضية اتقرر فيها بجزاء على الموظف ده، والحساب مطّلع عليها
  const caseId = expectStatus(await request(users.hr, 'POST', '/cases', { kind: 'VIOLATION', title: 'تكرار التأخير', respondentEmployeeId: emps.late.id }), 201).id
  const officer = await employee({ fullName: 'محقق' })
  await account('officer', [], { employeeId: officer.id })
  expectStatus(await request(users.hr, 'POST', `/cases/${caseId}/investigator`, { employeeId: officer.id }), 200)
  // قضية لسه ماتقررش فيها، أو مش للموظف ده، أو الحساب مش مطّلع عليها: نفس الرد
  for (const wrong of [caseId, 987654]) assert.deepEqual(answer(await request(users.hr, 'POST', P, body({ incidentDate: dayAgo(3), expectedOccurrence: 2, targetPeriod: period, caseId: wrong }))), [400, rules.PENALTY_CASE], String(wrong))
  expectStatus(await request(users.hr, 'POST', `/cases/${caseId}/events`, { kind: 'NOTICE', body: 'منسوب إليك تكرار التأخير' }), 200)
  expectStatus(await request(users.hr, 'POST', `/cases/${caseId}/events`, { kind: 'DEFENSE', body: 'ظروف مواصلات', employeeId: emps.late.id }), 200)
  expectStatus(await request(users.hr, 'POST', `/cases/${caseId}/decision`, { outcome: 'PENALTY', note: 'خصم يومين بحسب اللائحة' }), 200)
  assert.deepEqual(answer(await request(users.hr, 'POST', P, body({ employeeId: emps.other.id, incidentDate: dayAgo(3), expectedOccurrence: 2, targetPeriod: period, caseId }))), [400, rules.PENALTY_CASE], 'القضية مش لموظف تاني')
  // صاحب اللائحة من غير إدارة الخصومات: الخصومات بترفض — والجزاء مابيتسجّلش
  const before = await repo('EmployeePenalty').count()
  const refused = await request(users.bare, 'POST', P, body({ incidentDate: dayAgo(3), expectedOccurrence: 2, targetPeriod: period }))
  assert.deepEqual([refused.status >= 400, await repo('EmployeePenalty').count(), await repo('DeductionRequest').count()], [true, before, 0], JSON.stringify(refused.body))
  const fined = expectStatus(await request(users.hr, 'POST', P, body({ incidentDate: dayAgo(3), expectedOccurrence: 2, targetPeriod: period, caseId })), 201)
  assert.deepEqual([fined.occurrence, fined.action, fined.days, fined.label, fined.caseId, fined.deductionRequestId > 0], [2, 'DEDUCT_DAYS', 2, 'خصم أيام (2 يوم)', caseId, true])
  const deduction = await repo('DeductionRequest').findOneByOrFail({ id: fined.deductionRequestId })
  assert.deepEqual([deduction.employeeId, deduction.deductionTypeId, Number(deduction.inputValue), deduction.status, deduction.creatorUserId, deduction.targetPeriod,
    deduction.reason.includes('التأخير عن موعد الدوام') && deduction.reason.includes(`ملف قضية رقم ${caseId}`)], [emps.late.id, state.daysType, 2, 'IN_APPROVAL', users.hr.id, period, true])
  assert.equal(await repo('EmployeeObligation').count(), 0, 'ولا قيد في الدفتر قبل اعتماد سلسلة الخصم')
  // وملف القضية اتسجّل فيه التنفيذ
  const file = expectStatus(await request(users.hr, 'GET', `/cases/${caseId}`), 200)
  assert.deepEqual([file.events.at(-1).kindLabel, file.events.at(-1).body], ['تغيير حالة', 'تنفيذ القرار — التأخير عن موعد الدوام — التكرار التاني: خصم أيام (2 يوم)'])

  // السجل بالنطاق؛ و«جزاءاتي» للموظف من غير الملاحظات الداخلية
  const register = expectStatus(await request(users.hr, 'GET', P + `?employeeId=${emps.late.id}`), 200).penalties
  assert.deepEqual(register.map(row => [row.occurrence, row.label, row.status]), [[2, 'خصم أيام (2 يوم)', 'ACTIVE'], [1, 'إنذار كتابي', 'ACTIVE']])
  assert.deepEqual([expectStatus(await request(users.hrB, 'GET', P), 200).penalties, (await request(users.hr, 'GET', P + '?employeeId=x')).status], [[], 400])
  const mine = expectStatus(await request(users.late, 'GET', P + '/mine'), 200).penalties
  assert.deepEqual([mine.map(row => [row.violationName, row.occurrenceLabel, row.label]), 'note' in mine[0], 'caseId' in mine[0]],
    [[['التأخير عن موعد الدوام', 'التكرار التاني', 'خصم أيام (2 يوم)'], ['التأخير عن موعد الدوام', 'التكرار الأول', 'إنذار كتابي']], false, false])
  // الإلغاء بسبب وبالنطاق ومرة واحدة — والملغى مابيتحسبش في التكرار
  const cancel = (user, id, reason) => request(user, 'POST', P + `/${id}/cancel`, { reason })
  assert.deepEqual([answer(await cancel(users.hr, warned.id, 'ا')), answer(await cancel(users.hrB, warned.id, 'سبب واضح')), answer(await cancel(users.hr, 987654, 'سبب واضح'))],
    [[400, rules.PENALTY_CANCEL_REASON], [404, rules.PENALTY_NOT_FOUND], [404, rules.PENALTY_NOT_FOUND]])
  const cancelled = expectStatus(await cancel(users.hr, warned.id, 'اتسجّل بالغلط'), 200)
  assert.deepEqual([cancelled.status, cancelled.statusLabel, cancelled.cancelReason], ['CANCELLED', 'ملغى', 'اتسجّل بالغلط'])
  assert.deepEqual(answer(await cancel(users.hr, warned.id, 'تاني مرة')), [409, rules.PENALTY_CANCELLED])
  assert.equal(expectStatus(await request(users.hr, 'POST', P + '/preview', body({ incidentDate: dayAgo(1) })), 200).occurrence, 2, 'السابق الساري واحد بس (الخصم)')
  // المدة إعداد: واقعة قديمة برّه المدة مابتتحسبش
  await repo('RequestsConfig').save({ key: rules.PENALTY_WINDOW_KEY, value: '2' })
  const narrow = expectStatus(await request(users.hr, 'POST', P + '/preview', body({ incidentDate: dayAgo(0) })), 200)
  assert.deepEqual([narrow.windowDays, narrow.occurrence], [2, 1])
  // الموديول لما يتقفل المسارات بتتقفل
  expectStatus(await request(users.admin, 'PUT', '/modules/cases', { enabled: false }), 200); modules.invalidate()
  try { assert.deepEqual([(await request(users.hr, 'GET', P)).status, (await request(users.late, 'GET', P + '/mine')).status], [404, 404]) }
  finally { expectStatus(await request(users.admin, 'PUT', '/modules/cases', { enabled: true }), 200); modules.invalidate() }
})
