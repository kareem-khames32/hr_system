'use strict'
// B4.5 (د) على SQL حقيقي: الحد القانوني لغرامات الشهر في لائحة الجزاءات — مقفول افتراضيًا (اللائحة زي ما هي)، وبيتفتح من مسار الحسابات
// القانونية بس (صف الحزمة «اتأكد»)؛ مفتوح: جزاء خصم أيام لموظف فرعه في السعودية بيترفض لو أيامه لوحده أو مع غرامات نفس شهر الخصم عدّت
// الحد (5 أيام)، ومصر من غير حد. قاعدة اختبار عشوائية تُحذف في النهاية، بتوكنات موقّعة محليًا ومن غير بريد حقيقي.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_penalty_fine_cap_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_penalty_fine_cap_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-penalty-fine-cap-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const calc = require('../src/statutory/statutory-calculators.service')
const cap = require('../src/cases/penalty-fine-cap')
const { localDateOf } = require('../src/attendance/attendance.service')
let app, master, ds, base, admin, created = false, employeeNumber = 0
const org = {}, V = {}
const repo = name => { assert.match(database, NAME); assert.equal(ds.options.database, database); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false, permissions: ['*'] })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(user)}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const ok = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const answer = response => [response.status, [].concat(response.body?.message ?? []).join('، ')]
const employee = branch => repo('Employee').save({ employeeCode: `FC${String(++employeeNumber).padStart(3, '0')}`, fullName: `موظف الغرامات ${employeeNumber}`, branchId: branch.id,
  joinDate: '2020-01-01', basicSalary: 9000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'cash' })
const P = '/penalties'
const today = () => localDateOf(new Date())
const period = () => today().slice(0, 7)
const nextPeriod = () => { const [year, month] = period().split('-').map(Number); return month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}` }
const target = (emp, violationId) => ({ employeeId: emp.id, violationId, incidentDate: today() })
const preview = async (emp, violationId) => ok(await request(admin, 'POST', P + '/preview', target(emp, violationId)), 200)
const apply = async (emp, violationId, targetPeriod = period()) => request(admin, 'POST', P, { ...target(emp, violationId), targetPeriod, expectedFingerprint: (await preview(emp, violationId)).fingerprint })
const active = async emp => (await repo('EmployeePenalty').find({ where: { employeeId: emp.id }, order: { id: 'ASC' } })).map(row => [Number(row.days), row.status])
const enable = enabled => request(admin, 'PUT', '/settings/statutory/calculators/PENALTY_FINE_CAP', { enabled })
const verify = async key => {
  const pack = ok(await request(admin, 'GET', '/settings/statutory'), 200)
  for (const row of pack.keys.find(entry => entry.key === key).rows) if (!row.verified) ok(await request(admin, 'PATCH', `/settings/statutory/${row.id}`, { verified: true }), 200)
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql'); assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
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
  assert.equal(ds.options.database, database)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  await app.get(require('../src/settings/config-defaults.service').ConfigDefaultsService).onApplicationBootstrap()
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '1' }, { key: 'payroll.monthly_days', value: '30' }, { key: 'payroll.daily_hours', value: '8' },
    { key: 'payroll.policy.default_period_type', value: 'CALENDAR_MONTH' }, { key: 'payroll.policy.min_net_guarantee', value: 'null' },
    { key: 'payroll.policy.net_floor_pct', value: 'null' }, { key: 'payroll.policy.max_deduction_pct_of_gross', value: 'null' },
    { key: 'loan.insufficient_net_behavior', value: 'PARTIAL_THEN_CARRY' }, { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' },
  ])
  org.sa = await repo('Branch').save({ code: 'FC_SA', name: 'فرع الرياض', country: 'SA' })
  org.eg = await repo('Branch').save({ code: 'FC_EG', name: 'فرع القاهرة', country: 'EG' })
  admin = await repo('User').save({ email: 'admin@fine-cap.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', branchId: null, scopeAllBranches: true, permissions: '[]', isActive: true })
  ok(await request(admin, 'PUT', '/modules/cases', { enabled: true }), 200); app.get(require('../src/modules-registry/modules.service').ModulesService).invalidate()
  const daysType = ok(await request(admin, 'POST', '/deductions/types', { code: 'PENALTY_DAYS', nameAr: 'جزاء تأديبي بالأيام', category: 'DISCIPLINARY', calcMethod: 'DAYS_OF_SALARY',
    creatorScopes: ['HR'], approvalSteps: ['HR'] }), 201).id
  for (const [name, days] of [['one', 1], ['two', 2], ['three', 3], ['six', 6]]) {
    const label = `غرامة ${name}`
    V[name] = ok(await request(admin, 'POST', P + '/violations', { category: 'الغرامات', name: label, steps: [{ action: 'DEDUCT_DAYS', days }], deductionTypeId: daysType }), 200).violations.find(row => row.name === label).id
  }
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created) {
      assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('database', database).query('SELECT DB_ID(@database) AS id')).recordset[0].id, null)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  fs.rmSync(uploads, { recursive: true, force: true })
  if (errors.length) throw new AggregateError(errors, 'fixture cleanup failed')
}, { timeout: 60000 })

test('FC-01: الإعداد مقفول (الافتراضي) — اللائحة زي ما هي في فرع سعودي ومصري، والتفعيل مرفوض و«محتاج تحقق» ومن الإعدادات العامة', async () => {
  for (const branch of [org.sa, org.eg]) {
    const emp = await employee(branch)
    assert.equal('fineCap' in await preview(emp, V.six), false, 'المعاينة من غير خانة الحد')
    ok(await apply(emp, V.six), 201)
    ok(await apply(emp, V.three), 201)
    assert.deepEqual(await active(emp), [[6, 'ACTIVE'], [3, 'ACTIVE']])
  }
  const listed = ok(await request(admin, 'GET', '/settings/statutory/calculators'), 200)
  const entry = (listed.calculators ?? listed).find(row => row.code === 'PENALTY_FINE_CAP')
  assert.deepEqual([entry.enabled, entry.blockers], [false, [calc.CALCULATOR_UNVERIFIED]])
  assert.deepEqual(answer(await enable(true)), [400, calc.CALCULATOR_UNVERIFIED])
  assert.deepEqual(answer(await request(admin, 'PATCH', '/settings/config', { key: cap.PENALTY_FINE_CAP_KEY, value: 'true' })).slice(0, 1), [(await repo('RequestsConfig').findOneBy({ key: cap.PENALTY_FINE_CAP_KEY })) ? 400 : 404])
})

test('FC-02: الإعداد مفتوح — السعودية: جزاء أكبر من الحد مرفوض، وغرامات شهر الخصم بتتجمّع لحد الحد، وشهر تاني مسموح، والملغى برّه العدّ؛ ومصر من غير حد', async () => {
  await verify('sa.deduction_caps')
  ok(await enable(true), 200)
  const sa = await employee(org.sa)
  // جزاء 6 أيام لوحده أكبر من الحد: المعاينة بتعلّمه والتوقيع مرفوض من غير كتابة
  assert.deepEqual((await preview(sa, V.six)).fineCap, { maxDays: 5, exceeded: true })
  assert.deepEqual(answer(await apply(sa, V.six)), [400, cap.fineOverCap(6, 5)])
  assert.deepEqual([await active(sa), await repo('DeductionRequest').countBy({ employeeId: sa.id })], [[], 0])
  // 3 + 2 = 5 في نفس الشهر مسموح، واليوم السادس مرفوض على الشهر ده ومسموح على الشهر اللي بعده
  assert.deepEqual((await preview(sa, V.three)).fineCap, { maxDays: 5, exceeded: false })
  const three = ok(await apply(sa, V.three), 201)
  ok(await apply(sa, V.two), 201)
  assert.deepEqual(answer(await apply(sa, V.one)), [400, cap.fineMonthOverCap(period(), 6, 5)])
  assert.deepEqual([await active(sa), await repo('DeductionRequest').countBy({ employeeId: sa.id })], [[[3, 'ACTIVE'], [2, 'ACTIVE']], 2])
  ok(await apply(sa, V.one, nextPeriod()), 201)
  // إلغاء جزاء بيفضّي مكانه في شهره
  const other = await employee(org.sa)
  const first = ok(await apply(other, V.three), 201)
  ok(await apply(other, V.two), 201)
  assert.equal((await apply(other, V.one)).status, 400)
  ok(await request(admin, 'POST', `${P}/${first.id}/cancel`, { reason: 'اتلغى بعد التظلم' }), 200)
  ok(await apply(other, V.one), 201)
  assert.deepEqual(await active(other), [[3, 'CANCELLED'], [2, 'ACTIVE'], [1, 'ACTIVE']])
  // مصر: مفيش رقم غرامات في الحزمة = من غير حد
  const eg = await employee(org.eg)
  assert.equal('fineCap' in await preview(eg, V.six), false)
  ok(await apply(eg, V.six), 201)
  ok(await apply(eg, V.three), 201)
  // الموظف المنقول بحد دولة فرعه الحالي
  const moved = await employee(org.eg)
  await repo('Employee').update({ id: moved.id }, { branchId: org.sa.id })
  assert.deepEqual(answer(await apply(moved, V.six)), [400, cap.fineOverCap(6, 5)])
  // الجزاءات الموقّعة قبل التفعيل زي ما هي، وطول ما الحساب مفتوح صف الحزمة مايرجعش «محتاج تحقق»
  assert.equal(three.status, 'ACTIVE')
  assert.equal(await repo('EmployeePenalty').countBy({ days: '6.00', status: 'ACTIVE' }), 3, 'اتنين قبل التفعيل وواحد لمصر بعده')
  const row = ok(await request(admin, 'GET', '/settings/statutory'), 200).keys.find(entry => entry.key === 'sa.deduction_caps').rows[0]
  assert.deepEqual(answer(await request(admin, 'PATCH', `/settings/statutory/${row.id}`, { verified: false })), [400, calc.CALCULATOR_ROW_IN_USE])
  // قفل الحساب بيرجّع اللائحة زي ما كانت
  ok(await enable(false), 200)
  assert.equal('fineCap' in await preview(sa, V.six), false)
})
