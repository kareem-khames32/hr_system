'use strict'
// B3.1-ج: قرار فترة التجربة على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر (hr_probation_test_<16 hex>)، عبر HTTP بتوكنات موقّعة محليًا
// ومن غير كلمات مرور. ولا رسالة بريد حقيقية.
//  PR-01) القايمة: الموارد البشرية بنطاق فروعها، والمدير المباشر مرؤوسيه (ولو في فرع تاني: من غير الفرع)، والأقرب نهاية أولًا، والمدة
//         الافتراضية لملف من غير تاريخ.
//  PR-02) القرار: تثبيت (الحالة «نشط»)، تمديد (تاريخ بعد الحالي وبسبب)، إنهاء (القرار ومهمة على الموارد البشرية) — في سجل تغييرات
//         الموظف؛ للمدير المباشر أو الموارد البشرية في فرع الموظف بس؛ وصف اتغيّر بعد الحكم = 409.
//  PR-03) المهمة اليومية: مهمة القرار على المدير (ومن غيره: الموارد البشرية) مرة لكل تاريخ نهاية، وبتتقفل لما القرار يتسجّل.
// Run (من api/): node --test test/probation.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_probation_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_probation_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-probation-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/onboarding/probation')
const ymd = value => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
const inDays = n => { const day = new Date(); day.setDate(day.getDate() + n); return ymd(day) }
const today = inDays(0)
let app, master, ds, base, probation, created = false, n = 0
const U = {}, E = {}, B = {}

const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
const claims = user => ({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null, tokenVersion: 0,
  permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function call(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt.sign(claims(user))}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const expect = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body ?? null)); return response.body }
const answer = response => [response.status, [].concat(response.body?.message ?? []).join('، ')]
const list = async user => expect(await call(user, 'GET', '/probation'), 200)
const decide = (user, employee, body) => call(user, 'POST', `/probation/${employee.id}/decision`, body)
const fileOf = async key => { const row = await repo('Employee').findOneByOrFail({ id: E[key].id }); return [row.status, row.probationEndDate ? String(row.probationEndDate).slice(0, 10) : null] }
const history = async key => (await repo('EmployeeStatusHistory').find({ where: { employeeId: E[key].id }, order: { id: 'ASC' } }))
  .map(row => [row.fieldName, row.oldValue ?? null, row.newValue ?? null, row.reason, row.changedByUserId])
const tasksFor = async title => (await repo('Task').find({ where: { title }, order: { id: 'ASC' } }))
  .map(task => [task.assigneeEmployeeId, task.assigneeRole, task.branchId, String(task.dueDate).slice(0, 10), task.status])
const config = async (key, value) => { const row = await repo('RequestsConfig').findOneBy({ key }); await repo('RequestsConfig').save(row ? { ...row, value } : { key, value }) }
const employee = async (key, branch, extra = {}) => { E[key] = await repo('Employee').save({ employeeCode: `PR${String(++n).padStart(3, '0')}`, fullName: `موظف تجربة ${key}`,
  branchId: branch.id, status: 'probation', isActive: true, joinDate: inDays(-20), ...extra }) }

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql'); assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  // ولا رسالة بريد حقيقية
  const { MailService } = require('../src/auth/mail.service')
  const mail = app.get(MailService)
  mail.isConfigured = () => false
  mail.send = async () => { throw new Error('no mail in tests') }
  assert.notEqual(mail.send, MailService.prototype.send)
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => {}
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => {}
  ds = app.get(require('../node_modules/typeorm').DataSource); assert.equal(ds.options.database, database)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  probation = app.get(require('../src/onboarding/probation.service').ProbationService)
  B.a = await repo('Branch').save({ code: 'PRA', name: 'فرع التجربة أ', country: 'EG', weekendDays: 'FRI' })
  B.b = await repo('Branch').save({ code: 'PRB', name: 'فرع التجربة ب السري', country: 'EG', weekendDays: 'FRI' })
  await employee('boss', B.a, { status: 'active', joinDate: '2022-01-01' })
  await employee('p1', B.a, { managerEmployeeId: E.boss.id, probationEndDate: inDays(10) })
  await employee('p2', B.a, { probationEndDate: inDays(40) })
  await employee('p3', B.b, { managerEmployeeId: E.boss.id, probationEndDate: inDays(5) })
  await employee('p4', B.a, { probationEndDate: null })
  await employee('steady', B.a, { status: 'active', managerEmployeeId: E.boss.id, joinDate: '2023-01-01' })
  await employee('gone', B.a, { isActive: false, status: 'archived', probationEndDate: inDays(3) })
  const account = (key, role, branch, permissions, employeeKey) => repo('User').save({ email: `${key}@probation.invalid`, displayName: `حساب ${key}`, passwordHash: 'test-only', role,
    permissions: JSON.stringify(permissions), isActive: true, branchId: branch ? branch.id : null, employeeId: employeeKey ? E[employeeKey].id : null }).then(saved => { U[key] = saved })
  await account('admin', 'super_admin', null, ['*'])
  await account('hrA', 'hr_manager', B.a, ['employees.view', 'employees.edit', 'approve.hr'])
  await account('hrB', 'hr_manager', B.b, ['employees.view', 'employees.edit', 'approve.hr'])
  await account('viewer', 'employee', B.a, ['employees.view'])
  await account('boss', 'employee', B.a, [], 'boss')
  await account('plain', 'employee', B.a, [], 'steady')
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('db', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name=@db')).recordset.length, 0)
      t.diagnostic(`تحقق حذف قاعدة الاختبار: ${database}`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir())); assert.match(path.basename(uploads), /^hr-probation-files-/)
    fs.rmSync(uploads, { recursive: true, force: true }); assert.equal(fs.existsSync(uploads), false)
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'تعذر تنظيف بيئة اختبار فترة التجربة')
})

test('PR-01: the list follows the reader — HR by branch scope, the direct manager his own reports, nearest end first, with the default duration for a file without an end date', async () => {
  const hr = await list(U.hrA)
  assert.deepEqual([hr.today, hr.noticeDays, hr.defaultDays, hr.canManageSettings], [today, 14, 0, false])
  assert.deepEqual(hr.employees.map(row => [row.id, row.probationEndDate, row.daysLeft, row.endFromDefault, row.canDecide, row.branchName]),
    [[E.p1.id, inDays(10), 10, false, true, 'فرع التجربة أ'], [E.p2.id, inDays(40), 40, false, true, 'فرع التجربة أ'], [E.p4.id, null, null, false, true, 'فرع التجربة أ']])
  assert.doesNotMatch(JSON.stringify(hr), /السري|موظف تجربة p3|موظف تجربة gone|موظف تجربة steady/)
  // المدير المباشر: مرؤوسيه تحت التجربة بس؛ اللي في فرع برّه نطاقه بالاسم من غير رقم الفرع ولا اسمه
  const boss = await list(U.boss)
  assert.deepEqual(boss.employees.map(row => [row.id, row.branchId, row.branchName, row.canDecide]), [[E.p3.id, null, null, true], [E.p1.id, B.a.id, 'فرع التجربة أ', true]])
  assert.doesNotMatch(JSON.stringify(boss), /السري/)
  // عرض الموظفين من غير تعديل: بيشوف ومايقررش؛ وحساب من غير الاتنين: فاضي؛ ومدير النظام: الكل
  assert.deepEqual((await list(U.viewer)).employees.map(row => [row.id, row.canDecide]), [[E.p1.id, false], [E.p2.id, false], [E.p4.id, false]])
  assert.deepEqual((await list(U.plain)).employees, [])
  assert.deepEqual((await list(U.admin)).employees.map(row => row.id), [E.p3.id, E.p1.id, E.p2.id, E.p4.id])
  assert.equal((await list(U.admin)).canManageSettings, true)
  // مدة افتراضية: الملف اللي من غير تاريخ نهايته = الالتحاق + المدة
  await config(rules.PROBATION_DAYS_KEY, '90')
  const defaulted = (await list(U.hrA)).employees.find(row => row.id === E.p4.id)
  assert.deepEqual([defaulted.probationEndDate, defaulted.endFromDefault, defaulted.daysLeft], [inDays(70), true, 70])
  assert.equal((await list(U.hrA)).employees.find(row => row.id === E.p1.id).endFromDefault, false, 'التاريخ المكتوب بيسبق')
  await config(rules.PROBATION_DAYS_KEY, '0')
})

test('PR-02: confirm, extend and terminate are recorded in the employee change log, by the direct manager or HR of the employee\'s branch only, and a row that changed after the judgment is refused', async () => {
  // مين يقرر: برّه النطاق ومش مرؤوس = غير موجود؛ جوه النطاق من غير حق = مرفوض
  assert.deepEqual(answer(await decide(U.hrB, E.p1, { decision: 'CONFIRM' })), [404, 'الموظف غير موجود'])
  assert.deepEqual(answer(await decide(U.hrA, E.p3, { decision: 'CONFIRM' })), [404, 'الموظف غير موجود'])
  assert.deepEqual(answer(await decide(U.admin, { id: 999999 }, { decision: 'CONFIRM' })), [404, 'الموظف غير موجود'])
  for (const user of [U.viewer, U.plain]) assert.equal((await decide(user, E.p1, { decision: 'CONFIRM' })).status, 403)
  assert.equal((await decide(U.boss, E.p2, { decision: 'CONFIRM' })).status, 403, 'مش مرؤوسه')
  assert.equal((await decide(U.boss, E.boss, { decision: 'CONFIRM' })).status, 403, 'مش لنفسه')
  // المدخلات
  assert.equal((await decide(U.hrA, E.p1, { decision: 'PROMOTE' })).status, 400)
  for (const body of [{ decision: 'EXTEND', reason: 'محتاج وقت' }, { decision: 'EXTEND', newEndDate: inDays(10), reason: 'محتاج وقت' }, { decision: 'EXTEND', newEndDate: inDays(-1), reason: 'محتاج وقت' },
    { decision: 'EXTEND', newEndDate: '2027-02-31', reason: 'محتاج وقت' }, { decision: 'EXTEND', newEndDate: inDays(30) }, { decision: 'EXTEND', newEndDate: inDays(30), reason: 'ق' },
    { decision: 'TERMINATE' }, { decision: 'TERMINATE', reason: '  ' }, { decision: 'CONFIRM', reason: 'س'.repeat(301) }]) {
    assert.equal((await decide(U.hrA, E.p1, body)).status, 400, JSON.stringify(body))
  }
  assert.deepEqual(answer(await decide(U.hrA, E.steady, { decision: 'CONFIRM' })), [400, rules.PROBATION_NOT_ON])
  assert.deepEqual([await fileOf('p1'), await history('p1')], [['probation', inDays(10)], []], 'المرفوض مالمسش حاجة')

  // تمديد من المدير المباشر
  assert.deepEqual(expect(await decide(U.boss, E.p1, { decision: 'EXTEND', newEndDate: inDays(30), reason: '  محتاج   شهر كمان  ' }), 200),
    { employeeId: E.p1.id, decision: 'EXTEND', status: 'probation', probationEndDate: inDays(30) })
  assert.deepEqual(await fileOf('p1'), ['probation', inDays(30)])
  assert.deepEqual(await history('p1'), [['probationEndDate', inDays(10), inDays(30), 'تمديد فترة التجربة: محتاج شهر كمان', U.boss.id]])
  // صف اتغيّر بعد الحكم (المدير اتشال من على الملف والقرار في الطريق): 409 ومن غير تغيير
  const resolver = probation.resolver, realReports = resolver.directReportsOf
  resolver.directReportsOf = async function (...args) {
    const reports = await realReports.apply(this, args)
    await repo('Employee').update({ id: E.p1.id }, { managerEmployeeId: null })
    return reports
  }
  try { assert.deepEqual(answer(await decide(U.boss, E.p1, { decision: 'CONFIRM' })), [409, rules.PROBATION_CHANGED]) } finally { resolver.directReportsOf = realReports }
  assert.deepEqual([await fileOf('p1'), (await history('p1')).length], [['probation', inDays(30)], 1])
  assert.equal((await decide(U.boss, E.p1, { decision: 'CONFIRM' })).status, 403, 'مابقاش مديره')
  await repo('Employee').update({ id: E.p1.id }, { managerEmployeeId: E.boss.id })
  // تثبيت من الموارد البشرية: الحالة «نشط»، والتاريخ زي ما هو، وبرّه القايمة، ومرة تانية مرفوض
  assert.deepEqual(expect(await decide(U.hrA, E.p1, { decision: 'CONFIRM', reason: 'أداء ممتاز' }), 200),
    { employeeId: E.p1.id, decision: 'CONFIRM', status: 'active', probationEndDate: inDays(30) })
  assert.deepEqual(await fileOf('p1'), ['active', inDays(30)])
  assert.deepEqual((await history('p1'))[1], ['status', 'probation', 'active', 'تثبيت بعد فترة التجربة: أداء ممتاز', U.hrA.id])
  assert.equal((await list(U.hrA)).employees.some(row => row.id === E.p1.id), false)
  assert.deepEqual(answer(await decide(U.hrA, E.p1, { decision: 'CONFIRM' })), [400, rules.PROBATION_NOT_ON])
  // تثبيت من غير سبب
  expect(await decide(U.hrA, E.p2, { decision: 'CONFIRM' }), 200)
  assert.deepEqual((await history('p2'))[0], ['status', 'probation', 'active', 'تثبيت بعد فترة التجربة', U.hrA.id])

  // إنهاء من المدير المباشر لمرؤوس في فرع تاني: القرار بيتسجّل، والحالة زي ما هي، ومهمة على الموارد البشرية في فرع الموظف (مرة واحدة)
  const tasks = await repo('Task').count()
  assert.deepEqual(expect(await decide(U.boss, E.p3, { decision: 'TERMINATE', reason: 'غياب متكرر من غير إذن' }), 200),
    { employeeId: E.p3.id, decision: 'TERMINATE', status: 'probation', probationEndDate: inDays(5) })
  assert.deepEqual(await fileOf('p3'), ['probation', inDays(5)])
  assert.deepEqual(await history('p3'), [['probationDecision', null, 'TERMINATE', 'قرار إنهاء في فترة التجربة: غياب متكرر من غير إذن', U.boss.id]])
  assert.deepEqual(await tasksFor(rules.terminationTaskTitle(E.p3)), [[null, 'hr', B.b.id, today, 'OPEN']])
  expect(await decide(U.hrB, E.p3, { decision: 'TERMINATE', reason: 'تأكيد القرار' }), 200)
  assert.equal(await repo('Task').count(), tasks + 1, 'مهمة واحدة مفتوحة للموظف')
})

test('PR-03: the daily job opens one decision task per end date on the direct manager (or HR), and the recorded decision closes it', async () => {
  await employee('q1', B.a, { managerEmployeeId: E.boss.id, probationEndDate: inDays(9) })
  await employee('q2', B.a, { probationEndDate: inDays(14) })
  await employee('q3', B.a, { managerEmployeeId: E.boss.id, probationEndDate: inDays(15) })
  await employee('q4', B.a, { managerEmployeeId: E.boss.id, probationEndDate: inDays(-2) })
  const title = key => rules.probationTaskTitle(E[key])
  const events = async () => Number((await ds.query(`SELECT COUNT(*) AS [n] FROM [outbox_events] WHERE [eventType] = N'TASK_ASSIGNED'`))[0].n)
  const before = await events()
  // خلال أيام التنبيه (14): q1 على مديره، وq2 من غير مدير على الموارد البشرية، وp3 (باقي له 5) على مديره؛ وq3 لسه بدري، وq4 عدّت، وp4 من غير تاريخ
  assert.equal(await probation.raiseDecisionTasks(), 3)
  assert.deepEqual([await tasksFor(title('q1')), await tasksFor(title('q2')), await tasksFor(title('p3'))],
    [[[E.boss.id, null, B.a.id, inDays(9), 'OPEN']], [[null, 'hr', B.a.id, inDays(14), 'OPEN']], [[E.boss.id, null, B.b.id, inDays(5), 'OPEN']]])
  for (const key of ['q3', 'q4', 'p4']) assert.deepEqual(await tasksFor(title(key)), [], key)
  assert.equal(await events() - before, 3)
  assert.match((await repo('Task').findOneByOrFail({ title: title('q1') })).description, new RegExp(inDays(9)))
  // نفس اليوم تاني: ولا مهمة؛ وبكرة: q3 دخل النافذة
  assert.equal(await probation.raiseDecisionTasks(), 0)
  assert.equal(await probation.raiseDecisionTasks(inDays(1)), 1)
  assert.deepEqual(await tasksFor(title('q3')), [[E.boss.id, null, B.a.id, inDays(15), 'OPEN']])
  // تمديد q1: مهمته اتقفلت، والتاريخ الجديد (جوه النافذة) بياخد مهمة جديدة
  expect(await decide(U.boss, E.q1, { decision: 'EXTEND', newEndDate: inDays(12), reason: 'تقييم تاني' }), 200)
  assert.deepEqual(await tasksFor(title('q1')), [[E.boss.id, null, B.a.id, inDays(9), 'DONE']])
  assert.equal(await probation.raiseDecisionTasks(), 1)
  assert.deepEqual(await tasksFor(title('q1')), [[E.boss.id, null, B.a.id, inDays(9), 'DONE'], [E.boss.id, null, B.a.id, inDays(12), 'OPEN']])
  // تثبيت q2: مهمة الموارد البشرية اتقفلت بملاحظتها ومين قفلها
  expect(await decide(U.hrA, E.q2, { decision: 'CONFIRM' }), 200)
  const closed = await repo('Task').findOneByOrFail({ title: title('q2') })
  assert.deepEqual([closed.status, closed.statusNote, closed.closedByUserId], ['DONE', 'اتسجّل قرار فترة التجربة', U.hrA.id])
  assert.equal(await probation.raiseDecisionTasks(), 0, 'اللي اتثبّت مابياخدش مهمة')
  // أيام التنبيه صفر = من غير مهام
  await config(rules.PROBATION_NOTICE_KEY, '0')
  await employee('q5', B.a, { managerEmployeeId: E.boss.id, probationEndDate: inDays(3) })
  assert.equal(await probation.raiseDecisionTasks(), 0)
  await config(rules.PROBATION_NOTICE_KEY, '14')
  assert.equal(await probation.raiseDecisionTasks(), 1)
  // المهمة متسجّلة في قايمة المهام المجدولة، وتبع موديول التهيئة
  assert.ok(require('../src/scheduler/scheduled-jobs').SCHEDULED_JOB_IDS.includes(rules.PROBATION_JOB))
  assert.deepEqual(require('../src/modules-registry/registry').MODULES.onboarding.jobs, [rules.PROBATION_JOB])
})
