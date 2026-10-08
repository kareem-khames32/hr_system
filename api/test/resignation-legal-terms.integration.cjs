'use strict'
// B4.5 (هـ) على SQL حقيقي: المدد القانونية على طلب الاستقالة (ورا حساب قانوني مقفول افتراضيًا؛ عرض بس، من غير اعتماد ولا رفض تلقائي)
// بدولة فرع الموظف — مصر والسعودية — وتنبيه الحد الأدنى للأجور بنطاق الحساب. قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_resignation_terms_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_resignation_terms_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-resignation-terms-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const calc = require('../src/statutory/statutory-calculators.service')
const terms = require('../src/requests/resignation-legal-terms')
const { localDateOf } = require('../src/attendance/attendance.service')
let master, app, ds, base, admin, created = false, sequence = 0
const B = {}, S = {}
const repo = name => { assert.match(database, NAME); assert.equal(ds.options.database, database); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token(user) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const raw = await response.text(); return { status: response.status, body: raw ? JSON.parse(raw) : null }
}
const ok = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const answer = response => [response.status, [].concat(response.body?.message ?? []).join('، ')]
const today = () => localDateOf(new Date())
const plusDays = (date, days) => new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10)
function plusMonths(date, months) {
  const [year, month, day] = date.split('-').map(Number), total = year * 12 + month - 1 + months, y = Math.floor(total / 12), m = total % 12
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(Math.min(day, new Date(Date.UTC(y, m + 1, 0)).getUTCDate())).padStart(2, '0')}`
}
// موظف بحساب خدمة ذاتية
async function staff(branch, salary = 9000, extra = {}) {
  const emp = await repo('Employee').save({ employeeCode: 'RT' + ++sequence, fullName: 'موظف الاستقالة ' + sequence, branchId: branch.id, joinDate: '2020-01-01', basicSalary: salary,
    housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'cash', ...extra })
  const user = await repo('User').save({ email: `staff${sequence}@resignation-terms.invalid`, displayName: emp.fullName, passwordHash: 'test-only', role: 'employee', branchId: branch.id,
    employeeId: emp.id, permissions: '[]' })
  return { emp, user }
}
async function resign(person, lastWorkingDate) {
  const draft = ok(await request(person.user, 'POST', '/requests', { typeCode: 'RESIGNATION', payload: { lastWorkingDate, reason: 'ظروف شخصية' } }), 201)
  const before = ok(await request(person.user, 'GET', `/requests/${draft.id}`), 200)
  ok(await request(person.user, 'POST', `/requests/${draft.id}/submit`), 201)
  return { id: draft.id, draft: before }
}
const detail = async (user, id) => ok(await request(user, 'GET', `/requests/${id}`), 200)
const enable = enabled => request(admin, 'PUT', '/settings/statutory/calculators/RESIGNATION_LEGAL_TERMS', { enabled })
const verify = async key => {
  const pack = ok(await request(admin, 'GET', '/settings/statutory'), 200)
  for (const row of pack.keys.find(entry => entry.key === key).rows) if (!row.verified) ok(await request(admin, 'PATCH', `/settings/statutory/${row.id}`, { verified: true }), 200)
}

before(async () => {
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true } }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  // مفيش رسالة بريد حقيقية بتطلع من الاختبار
  const { MailService } = require('../src/auth/mail.service')
  const mail = app.get(MailService)
  mail.isConfigured = () => false
  mail.send = async () => { throw new Error('no mail in tests') }
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1'); ds = app.get(require('../node_modules/typeorm').DataSource)
  assert.equal(ds.options.database, database)
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  B.eg = await repo('Branch').save({ code: 'RT_EG', name: 'فرع القاهرة', country: 'EG' })
  B.sa = await repo('Branch').save({ code: 'RT_SA', name: 'فرع الرياض', country: 'SA' })
  B.none = await repo('Branch').save({ code: 'RT_NO', name: 'فرع من غير دولة' })
  admin = await repo('User').save({ email: 'admin@resignation-terms.invalid', displayName: 'Fixture admin', passwordHash: 'test-only', role: 'super_admin', scopeAllBranches: true, permissions: '[]' })
  await require('../src/seed/seed-requests').seedRequests(ds)
  // الاستقالة بتمشي في سلسلة بخطوة واحدة (البذرة بتعمل السلاسل فاضية)
  const type = await repo('RequestType').findOneByOrFail({ code: 'RESIGNATION' })
  ok(await request(admin, 'PATCH', `/settings/approval-chains/${type.approvalChainId}/steps`, { steps: [{ approverRole: 'hr', slaDays: 3 }] }), 200)
  S.eg = await staff(B.eg); S.sa = await staff(B.sa); S.none = await staff(B.none)
}, { timeout: 180000 })

after(async t => {
  if (app) await app.close()
  try {
    if (created) {
      assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('database', database).query('SELECT DB_ID(@database) AS id')).recordset[0].id, null)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } finally {
    if (master) await master.close()
    fs.rmSync(uploads, { recursive: true, force: true })
  }
})

test('RT-01: الحساب مقفول (الافتراضي) — تفاصيل طلب الاستقالة من غير بطاقة المدد في الدولتين؛ والتفعيل مرفوض وصفوفه «محتاج تحقق»', async () => {
  for (const person of [S.eg, S.sa]) {
    person.request = await resign(person, plusDays(today(), 20))
    for (const viewer of [admin, person.user]) assert.equal('resignationTerms' in await detail(viewer, person.request.id), false)
  }
  const listed = ok(await request(admin, 'GET', '/settings/statutory/calculators'), 200)
  assert.deepEqual((listed.calculators ?? listed).find(row => row.code === 'RESIGNATION_LEGAL_TERMS').blockers, [calc.CALCULATOR_UNVERIFIED])
  assert.deepEqual(answer(await enable(true)), [400, calc.CALCULATOR_UNVERIFIED])
  assert.equal((await request(S.eg.user, 'PUT', '/settings/statutory/calculators/RESIGNATION_LEGAL_TERMS', { enabled: true })).status, 403)
})

test('RT-02: الحساب مفتوح — المدد بدولة فرع الموظف: مصر 3 شهور و10 أيام، السعودية 30 و30؛ عرض بس من غير اعتماد ولا رفض تلقائي', async () => {
  await verify('eg.termination'); await verify('sa.termination')
  ok(await enable(true), 200)
  const day = today()
  const eg = { country: 'EG', noticeLabel: '3 شهور', noticeEndsOn: plusMonths(day, 3), shortNotice: true, replyDays: 10, replyDeadline: plusDays(day, 10), replyOverdue: false }
  const sa = { country: 'SA', noticeLabel: '30 يوم', noticeEndsOn: plusDays(day, 30), shortNotice: true, replyDays: 30, replyDeadline: plusDays(day, 30), replyOverdue: false }
  // المعتمد وصاحب الطلب بيشوفوا نفس البطاقة
  for (const viewer of [admin, S.eg.user]) assert.deepEqual((await detail(viewer, S.eg.request.id)).resignationTerms, eg)
  for (const viewer of [admin, S.sa.user]) assert.deepEqual((await detail(viewer, S.sa.request.id)).resignationTerms, sa)
  // المسودة (قبل التقديم) من غير بطاقة، وفرع من غير دولة من غير بطاقة
  assert.equal('resignationTerms' in S.eg.request.draft, false)
  const none = await resign(S.none, plusDays(day, 20))
  assert.equal('resignationTerms' in await detail(admin, none.id), false)
  // آخر يوم عمل بعد الإخطار القانوني: مش «إخطار قصير»
  const long = await staff(B.sa)
  const longRequest = await resign(long, plusDays(day, 45))
  assert.equal((await detail(admin, longRequest.id)).resignationTerms.shortNotice, false)
  // المهلة عدّت (التقديم من 40 يوم): علامة بس — الطلب لسه في المسار، والموظف لسه على رأس العمل، ومفيش ملف إخلاء طرف
  const submitted = new Date(Date.now() - 40 * 86400000)
  await repo('Request').update({ id: S.sa.request.id }, { submittedAt: submitted })
  const overdue = await detail(admin, S.sa.request.id)
  const from = localDateOf(submitted)
  assert.deepEqual(overdue.resignationTerms, { ...sa, noticeEndsOn: plusDays(from, 30), replyDeadline: plusDays(from, 30), shortNotice: plusDays(day, 20) < plusDays(from, 30), replyOverdue: true })
  assert.deepEqual([['SUBMITTED', 'UNDER_REVIEW'].includes(overdue.status), (await repo('Employee').findOneByOrFail({ id: S.sa.emp.id })).status, await repo('OffboardingCase').countBy({ employeeId: S.sa.emp.id })], [true, 'active', 0])
  // الموظف المنقول ببطاقة دولة فرعه الحالي
  await repo('Employee').update({ id: long.emp.id }, { branchId: B.eg.id })
  assert.equal((await detail(admin, longRequest.id)).resignationTerms.country, 'EG')
  // طلب اتقرر فيه (مرفوض) من غير بطاقة، وطلب مش استقالة من غير بطاقة
  ok(await request(admin, 'POST', `/requests/${S.eg.request.id}/act`, { action: 'REJECT', comment: 'محتاجين نراجع الموضوع' }), 201)
  assert.equal('resignationTerms' in await detail(admin, S.eg.request.id), false)
  // قفل الحساب بيرجّع التفاصيل زي ما كانت
  ok(await enable(false), 200)
  assert.equal('resignationTerms' in await detail(admin, S.sa.request.id), false)
})

test('RT-03: تنبيه الحد الأدنى للأجور — موظفين فروع مصر اللي إجماليهم تحت الحد، بنطاق الحساب وبصلاحية الرواتب، وقراءة بس', async () => {
  const low = await staff(B.eg, 6000, { housingAllowance: 500 })
  await staff(B.eg, 7000)
  await staff(B.eg, 3000, { isActive: false, status: 'terminated' })
  await staff(B.sa, 2000)
  const report = ok(await request(admin, 'GET', '/social-insurance/minimum-wage-alerts'), 200)
  assert.deepEqual([report.asOf, report.minimums.map(row => [row.country, row.amount, row.key, row.verified])], [today(), [['EG', 7000, 'eg.minimum_wage', false]]])
  assert.deepEqual(report.employees, [{ employeeId: low.emp.id, fullName: low.emp.fullName, employeeCode: low.emp.employeeCode, branchName: 'فرع القاهرة', country: 'EG', gross: 6500, minimum: 7000, shortfall: 500 }])
  // حساب فرع السعودية: مفيش حد أدنى ولا موظفين؛ وحساب فرع مصر بيشوف موظفه؛ ومن غير صلاحية الرواتب 403
  const viewer = (label, branch, permissions) => repo('User').save({ email: `${label}@resignation-terms.invalid`, displayName: label, passwordHash: 'test-only', role: 'hr_manager', branchId: branch.id,
    permissions: JSON.stringify(permissions) })
  assert.deepEqual(ok(await request(await viewer('pay-sa', B.sa, ['payroll.view']), 'GET', '/social-insurance/minimum-wage-alerts'), 200), { asOf: today(), minimums: [], employees: [] })
  assert.deepEqual(ok(await request(await viewer('pay-eg', B.eg, ['payroll.view']), 'GET', '/social-insurance/minimum-wage-alerts'), 200).employees.map(row => row.employeeId), [low.emp.id])
  assert.equal((await request(await viewer('no-pay', B.eg, ['employees.view']), 'GET', '/social-insurance/minimum-wage-alerts')).status, 403)
  // رفع الراتب للحد بيشيله من التنبيه، والتقرير ماكتبش حاجة
  await repo('Employee').update({ id: low.emp.id }, { housingAllowance: 1000 })
  assert.deepEqual(ok(await request(admin, 'GET', '/social-insurance/minimum-wage-alerts'), 200).employees, [])
  assert.equal(Number((await repo('Employee').findOneByOrFail({ id: low.emp.id })).basicSalary), 6000)
})
