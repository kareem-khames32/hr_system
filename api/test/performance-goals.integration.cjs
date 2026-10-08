'use strict'
// B3.6: أهداف الأداء على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر (hr_perf_goals_test_<16 hex>)، عبر HTTP بتوكنات موقّعة محليًا ومن غير كلمات
// مرور. ولا رسالة بريد حقيقية.
//  PG-01) الموديول مقفول افتراضيًا (404)؛ وبعد الفتح: الموظف يقترح لنفسه، ومديره المباشر (من الهيكل) يعتمد أو يرفض بسبب، وصاحب الهدف مايعتمدش
//         لنفسه؛ والمدير بيعمل هدف لمرؤوسه «ساري»؛ واللي مالوش دور = غير موجود.
//  PG-02) التقدّم والتعديل والقفل والدليل: تحديث الفعلي بتعليق، تعديل في نص الفترة بسبب إجباري وبالخانات وبقبل/بعد، قفل، ومهمة مسؤولها صاحب الهدف
//         كدليل مرة واحدة؛ وكل حركة سطر في السجل.
//  PG-03) الموارد البشرية بالصلاحية وبنطاق الفروع: أهداف الأقسام والشركة، و«كل الأهداف» بالفرع الحالي لصاحب الهدف، والقراءة لأصحاب القسم والشركة.
// Run (من api/): node --test test/performance-goals.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_perf_goals_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_perf_goals_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-perf-goals-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/performance/goal-rules')
let app, master, ds, base, modules, created = false, employeeNumber = 0
const org = {}, users = {}, emps = {}, goals = {}

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
const employee = (extra = {}) => repo('Employee').save({ employeeCode: `PG${String(++employeeNumber).padStart(3, '0')}`, fullName: `موظف الأهداف ${employeeNumber}`, branchId: org.branchA.id,
  joinDate: '2020-01-01', basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'cash', ...extra })
const account = (label, permissions, extra = {}) => repo('User').save({ email: `${label}@perf-goals.invalid`, displayName: `حساب ${label}`, passwordHash: 'test-only',
  role: 'employee', branchId: org.branchA.id, permissions: JSON.stringify(permissions), isActive: true, ...extra })
const good = (extra = {}) => ({ title: 'زيادة المبيعات', kind: 'KPI', weight: 40, targetValue: 100, unit: 'عقد', periodStart: '2026-10-01', periodEnd: '2026-12-31', ...extra })
const make = (user, body) => request(user, 'POST', '/performance/goals', body)
const act = (user, id, step, body) => request(user, 'POST', `/performance/goals/${id}/${step}`, body)
const linesOf = async id => (await repo('PerformanceGoalUpdate').find({ where: { goalId: id }, order: { id: 'ASC' } })).map(line => line.kind)

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

  org.branchA = await repo('Branch').save({ code: 'PG_A', name: 'فرع الأهداف أ', country: 'SA' })
  org.branchB = await repo('Branch').save({ code: 'PG_B', name: 'فرع الأهداف ب السري', country: 'SA' })
  org.sales = await repo('Department').save({ name: 'قسم المبيعات', code: 'PG_SAL', branchId: org.branchA.id })
  org.other = await repo('Department').save({ name: 'قسم تاني', code: 'PG_OTH', branchId: org.branchA.id })
  org.bDepartment = await repo('Department').save({ name: 'قسم فرع ب', code: 'PG_BD', branchId: org.branchB.id })
  emps.boss = await employee({ fullName: 'مدير المبيعات', departmentId: org.sales.id })
  emps.rep = await employee({ fullName: 'مندوب أول', departmentId: org.sales.id, managerEmployeeId: emps.boss.id })
  emps.peer = await employee({ fullName: 'مندوب تاني', departmentId: org.sales.id, managerEmployeeId: emps.boss.id })
  emps.outsider = await employee({ fullName: 'موظف قسم تاني', departmentId: org.other.id })
  emps.b1 = await employee({ fullName: 'موظف فرع ب', branchId: org.branchB.id, departmentId: org.bDepartment.id })
  users.admin = await repo('User').save({ email: 'admin@perf-goals.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', branchId: null,
    scopeAllBranches: true, permissions: '[]', isActive: true })
  users.boss = await account('boss', [], { employeeId: emps.boss.id })
  users.rep = await account('rep', [], { employeeId: emps.rep.id })
  users.peer = await account('peer', [], { employeeId: emps.peer.id })
  users.outsider = await account('outsider', [], { employeeId: emps.outsider.id })
  users.hrA = await account('hr-a', ['performance.manage'])
  users.hrB = await account('hr-b', ['performance.manage'], { branchId: org.branchB.id })
  users.nobody = await account('nobody', [])
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
  try {
    assert.equal(path.dirname(path.resolve(uploads)), os.tmpdir()); assert.match(path.basename(uploads), /^hr-perf-goals-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'performance goals fixture cleanup failed')
})

test('PG-01: الموديول مقفول افتراضيًا؛ وبعد الفتح الموظف يقترح، ومديره المباشر يعتمد أو يرفض بسبب، واللي مالوش دور = غير موجود', async () => {
  // موديول جديد = مقفول: المسارات زي اللي مش موجودة
  assert.deepEqual([(await request(users.rep, 'GET', '/performance/goals/mine')).status, (await make(users.rep, good())).status], [404, 404])
  expectStatus(await request(users.admin, 'PUT', '/modules/performance', { enabled: true }), 200); modules.invalidate()
  assert.equal((await request(null, 'GET', '/performance/goals/mine')).status, 401)

  for (const [change, message] of [
    [{ title: 'ab' }, rules.GOAL_TITLE], [{ kind: 'OKR' }, rules.GOAL_KIND], [{ weight: 101 }, rules.GOAL_WEIGHT], [{ weight: 2.5 }, rules.GOAL_WEIGHT], [{ targetValue: '1.234' }, rules.GOAL_VALUE],
    [{ periodEnd: '2026-09-30' }, rules.GOAL_PERIOD], [{ periodStart: '2026-02-31' }, rules.GOAL_PERIOD], [{ ownerType: 'TEAM' }, rules.GOAL_OWNER], [{ unit: 'و'.repeat(31) }, 'الوحدة لا يتجاوز 30 حرف'],
  ]) assert.deepEqual(answer(await make(users.rep, good(change))), [400, message], JSON.stringify(change))
  assert.equal(await repo('PerformanceGoal').count(), 0)

  // الموظف يقترح لنفسه: «مقترح»
  const proposed = expectStatus(await make(users.rep, good()), 201)
  assert.deepEqual([proposed.status, proposed.statusLabel, proposed.employeeName, proposed.kindLabel, proposed.weight, proposed.targetValue, proposed.unit, proposed.actualValue, proposed.progressPercent, proposed.role,
    proposed.can], ['PROPOSED', 'مقترح', 'مندوب أول', 'مؤشر', 40, '100.00', 'عقد', null, null, 'owner', { decide: false, progress: false, change: false, close: true, evidence: false }])
  goals.first = proposed.id
  // صاحبه مايعتمدوش، وزميله والقسم التاني مايشوفوهوش، والموارد البشرية في فرع تاني برضه
  assert.deepEqual(answer(await act(users.rep, proposed.id, 'decision', { decision: 'approve' })), [403, rules.GOAL_FORBIDDEN])
  for (const stranger of [users.peer, users.outsider, users.hrB, users.nobody]) {
    assert.deepEqual([answer(await request(stranger, 'GET', '/performance/goals/' + proposed.id)), answer(await act(stranger, proposed.id, 'decision', { decision: 'approve' }))],
      [[404, rules.GOAL_NOT_FOUND], [404, rules.GOAL_NOT_FOUND]], stranger.email)
  }
  // المدير المباشر (من خانة المدير على الملف): شايفه في «فريقي»، وبيرفض بسبب أو يعتمد
  const team = expectStatus(await request(users.boss, 'GET', '/performance/goals/team'), 200)
  assert.deepEqual([team.manager, team.goals.map(goal => [goal.id, goal.role, goal.can.decide])], [true, [[proposed.id, 'manager', true]]])
  assert.deepEqual(expectStatus(await request(users.rep, 'GET', '/performance/goals/team'), 200).goals, [])
  assert.deepEqual(answer(await act(users.boss, proposed.id, 'decision', { decision: 'reject' })), [400, rules.GOAL_REASON])
  assert.equal((await act(users.boss, proposed.id, 'decision', { decision: 'maybe' })).status, 400)
  const approved = expectStatus(await act(users.boss, proposed.id, 'decision', { decision: 'approve' }), 200)
  assert.deepEqual([approved.status, approved.can.decide, approved.can.progress, approved.can.change], ['ACTIVE', false, true, true])
  assert.deepEqual(answer(await act(users.boss, proposed.id, 'decision', { decision: 'approve' })), [403, rules.GOAL_FORBIDDEN], 'الساري مابيتعتمدش تاني')
  // مقترح تاني بيترفض بسبب، وتالت صاحبه بيسحبه
  const second = expectStatus(await make(users.rep, good({ title: 'هدف هيترفض', weight: 10 })), 201)
  const rejected = expectStatus(await act(users.boss, second.id, 'decision', { decision: 'reject', reason: 'مش أولوية الربع ده' }), 200)
  assert.deepEqual([rejected.status, rejected.decisionReason, rejected.can], ['REJECTED', 'مش أولوية الربع ده', { decide: false, progress: false, change: false, close: false, evidence: false }])
  const third = expectStatus(await make(users.rep, good({ title: 'هدف هيتسحب', weight: 5 })), 201)
  assert.equal(expectStatus(await act(users.rep, third.id, 'status', { status: 'CANCELLED', note: 'غيّرت رأيي' }), 200).status, 'CANCELLED')
  assert.equal((await act(users.rep, proposed.id, 'status', { status: 'CANCELLED' })).status, 403, 'الساري مايتلغيش من صاحبه')

  // المدير بيعمل هدف لمرؤوسه «ساري»؛ ولموظف مش مرؤوسه = غير موجود؛ والموظف مايعملش لزميله
  const direct = expectStatus(await make(users.boss, good({ employeeId: emps.peer.id, title: 'هدف من المدير', weight: 60 })), 201)
  assert.deepEqual([direct.status, direct.employeeName, direct.role], ['ACTIVE', 'مندوب تاني', 'manager'])
  for (const [user, employeeId] of [[users.boss, emps.outsider.id], [users.rep, emps.peer.id], [users.boss, emps.b1.id], [users.boss, 987654]]) {
    assert.deepEqual(answer(await make(user, good({ employeeId }))), [404, 'الموظف غير موجود'])
  }
  assert.equal((await make(users.nobody, good())).status, 404, 'حساب من غير ملف موظف')
  const mine = expectStatus(await request(users.rep, 'GET', '/performance/goals/mine'), 200)
  assert.deepEqual([mine.available, mine.weightTotal, mine.goals.map(goal => goal.status)], [true, 40, ['CANCELLED', 'REJECTED', 'ACTIVE']])
  goals.direct = direct.id
})

test('PG-02: التقدّم والتعديل بسبب والقفل والمهمة الدليل — وكل حركة سطر في السجل', async () => {
  const id = goals.first
  // التقدّم: صاحب الهدف بتعليق، والنسبة من الفعلي على المستهدف
  assert.equal((await act(users.rep, id, 'progress', { note: 'من غير قيمة' })).status, 400)
  assert.equal((await act(users.rep, id, 'progress', { actualValue: 'كتير' })).status, 400)
  const progressed = expectStatus(await act(users.rep, id, 'progress', { actualValue: 25, note: ' أول شهر ' }), 200)
  assert.deepEqual([progressed.actualValue, progressed.progressPercent, progressed.updates[0].kind, progressed.updates[0].note, progressed.updates[0].actualValue, progressed.updates[0].byName],
    ['25.00', 25, 'PROGRESS', 'أول شهر', '25.00', 'حساب rep'])
  assert.equal(expectStatus(await act(users.boss, id, 'progress', { actualValue: '40.5' }), 200).progressPercent, 40.5)
  assert.deepEqual(answer(await act(users.peer, id, 'progress', { actualValue: 1 })), [404, rules.GOAL_NOT_FOUND])

  // التعديل في نص الفترة: للمدير، بسبب إجباري، وبالخانات المتغيّرة بس وبقبل/بعد
  const patch = (user, body) => request(user, 'PATCH', '/performance/goals/' + id, body)
  assert.deepEqual(answer(await patch(users.rep, { targetValue: 80, reason: 'السوق اتغيّر' })), [403, rules.GOAL_FORBIDDEN], 'صاحب الهدف مايعدّلش مستهدفه')
  assert.deepEqual(answer(await patch(users.boss, { targetValue: 80 })), [400, rules.GOAL_REASON])
  assert.deepEqual(answer(await patch(users.boss, { targetValue: 100, weight: 40, reason: 'من غير تغيير فعلي' })), [400, 'مفيش تعديل في الهدف'])
  assert.deepEqual(answer(await patch(users.boss, { periodEnd: '2026-09-01', reason: 'نهاية قبل البداية' })), [400, rules.GOAL_PERIOD])
  const changed = expectStatus(await patch(users.boss, { targetValue: 80, weight: 40, periodEnd: '2027-01-31', reason: 'السوق اتغيّر' }), 200)
  assert.deepEqual([changed.targetValue, changed.weight, changed.periodEnd, changed.title, changed.progressPercent], ['80.00', 40, '2027-01-31', 'زيادة المبيعات', 50.6])
  assert.deepEqual([changed.updates[0].kind, changed.updates[0].note, changed.updates[0].changes],
    ['CHANGE', 'السوق اتغيّر', { before: { targetValue: '100.00', periodEnd: '2026-12-31' }, after: { targetValue: '80.00', periodEnd: '2027-01-31' } }])

  // مهمة كدليل: مهمة مسؤولها صاحب الهدف، مرة واحدة؛ ومهمة حد تاني زي اللي مش موجودة
  const task = (assignee, title) => repo('Task').save({ title, description: null, assigneeEmployeeId: assignee, assigneeRole: null, branchId: org.branchA.id, createdByUserId: users.boss.id, dueDate: null,
    priority: 'NORMAL', status: 'DONE', requiresProof: false, proofNote: null, proofFileId: null, statusReason: null, createdAt: new Date(), updatedAt: new Date() })
  let mineTask, otherTask
  try { mineTask = await task(emps.rep.id, 'توقيع عقد العميل الكبير'); otherTask = await task(emps.peer.id, 'مهمة زميل') } catch (error) {
    // أعمدة جدول المهام اللي مش في القايمة دي: نكمّل بالأعمدة الإجبارية من الكيان
    const columns = ds.getMetadata('Task').columns.filter(column => !column.isNullable && !column.isGenerated).map(column => column.propertyName)
    throw new Error('task fixture needs columns: ' + columns.join(', ') + ' — ' + error.message)
  }
  assert.equal((await act(users.rep, id, 'evidence', { taskId: 'x' })).status, 400)
  for (const taskId of [otherTask.id, 987654]) assert.deepEqual(answer(await act(users.rep, id, 'evidence', { taskId })), [404, 'المهمة غير موجودة'])
  const linked = expectStatus(await act(users.rep, id, 'evidence', { taskId: mineTask.id }), 200)
  assert.deepEqual([linked.updates[0].kind, linked.updates[0].taskId, linked.updates[0].note], ['EVIDENCE', mineTask.id, 'توقيع عقد العميل الكبير'])
  assert.deepEqual(answer(await act(users.boss, id, 'evidence', { taskId: mineTask.id })), [409, 'المهمة دي مربوطة بالهدف قبل كده'])

  // الموظف اتنقل لمدير تاني بين الحكم والحفظ: المدير القديم مابقاش له دور
  await repo('Employee').update({ id: emps.rep.id }, { managerEmployeeId: emps.outsider.id })
  try {
    assert.deepEqual(answer(await act(users.boss, id, 'progress', { actualValue: 99 })), [404, rules.GOAL_NOT_FOUND])
    assert.equal(expectStatus(await request(users.outsider, 'GET', '/performance/goals/' + id), 200).role, 'manager', 'المدير الجديد شايفه')
  } finally { await repo('Employee').update({ id: emps.rep.id }, { managerEmployeeId: emps.boss.id }) }

  // القفل: للمدير؛ وبعده مفيش حركة
  assert.equal((await act(users.boss, id, 'status', { status: 'OPEN' })).status, 400)
  const done = expectStatus(await act(users.boss, id, 'status', { status: 'DONE', note: 'اتحقق قبل الميعاد' }), 200)
  assert.deepEqual([done.status, done.statusLabel, done.can], ['DONE', 'اتحقق', { decide: false, progress: false, change: false, close: false, evidence: false }])
  assert.equal((await act(users.rep, id, 'progress', { actualValue: 90 })).status, 403)
  assert.deepEqual(await linesOf(id), ['STATUS', 'STATUS', 'PROGRESS', 'PROGRESS', 'CHANGE', 'EVIDENCE', 'STATUS'])
  assert.equal((await repo('PerformanceGoal').findOneByOrFail({ id })).closedAt instanceof Date, true)
})

test('PG-03: الموارد البشرية بالصلاحية وبنطاق الفروع — أهداف الأقسام والشركة، و«كل الأهداف» بالفرع الحالي، والقراءة لأصحاب القسم والشركة', async () => {
  // هدف قسم: بالصلاحية وفي نطاق الفرع
  const department = expectStatus(await make(users.hrA, good({ ownerType: 'DEPARTMENT', departmentId: org.sales.id, title: 'هدف قسم المبيعات', weight: 100 })), 201)
  assert.deepEqual([department.status, department.departmentName, department.employeeId, department.role], ['ACTIVE', 'قسم المبيعات', null, 'hr'])
  for (const [user, departmentId] of [[users.hrA, org.bDepartment.id], [users.boss, org.sales.id], [users.hrB, org.sales.id], [users.hrA, 987654]]) {
    assert.deepEqual(answer(await make(user, good({ ownerType: 'DEPARTMENT', departmentId }))), [404, 'القسم غير موجود'])
  }
  // هدف شركة: لصاحب الصلاحية من غير قيد فروع بس
  assert.equal((await make(users.hrA, good({ ownerType: 'COMPANY', title: 'هدف الشركة' }))).status, 403)
  const company = expectStatus(await make(users.admin, good({ ownerType: 'COMPANY', title: 'هدف الشركة للسنة', weight: 100 })), 201)
  // هدف موظف تحت هدف القسم (الأب لازم قسم أو شركة ساري وقارئه شايفه)
  const child = expectStatus(await make(users.rep, good({ title: 'هدفي تحت هدف القسم', weight: 20, parentGoalId: department.id })), 201)
  assert.deepEqual([child.parentGoalId, child.parentTitle], [department.id, 'هدف قسم المبيعات'])
  for (const parentGoalId of [goals.direct, 987654]) assert.equal((await make(users.rep, good({ parentGoalId }))).status, 400)
  assert.equal((await make(users.outsider, good({ parentGoalId: department.id }))).status, 400, 'هدف قسم تاني مش للقارئ')

  // «أهدافي»: أهداف القسم والشركة السارية للقراءة بس
  const mine = expectStatus(await request(users.rep, 'GET', '/performance/goals/mine'), 200)
  assert.deepEqual(mine.shared.map(goal => [goal.title, goal.role, Object.values(goal.can).some(Boolean)]), [['هدف قسم المبيعات', 'viewer', false], ['هدف الشركة للسنة', 'viewer', false]])
  assert.deepEqual(expectStatus(await request(users.outsider, 'GET', '/performance/goals/mine'), 200).shared.map(goal => goal.title), ['هدف الشركة للسنة'])
  assert.equal(expectStatus(await request(users.rep, 'GET', '/performance/goals/' + department.id), 200).role, 'viewer')
  assert.deepEqual(answer(await request(users.outsider, 'GET', '/performance/goals/' + department.id)), [404, rules.GOAL_NOT_FOUND])
  assert.deepEqual(answer(await act(users.rep, department.id, 'progress', { actualValue: 5 })), [403, rules.GOAL_FORBIDDEN])
  assert.equal(expectStatus(await act(users.hrA, department.id, 'progress', { actualValue: 30 }), 200).actualValue, '30.00')

  // «كل الأهداف»: بالصلاحية؛ فرع أ شايف أهداف موظفينه وأقسامه (وهدف الشركة للقراءة)، وفرع ب مش شايفهم
  const all = expectStatus(await request(users.hrA, 'GET', '/performance/goals/all'), 200)
  assert.deepEqual([all.canManageCompany, all.goals.some(goal => goal.id === goals.first), all.goals.find(goal => goal.id === company.id).role, all.goals.find(goal => goal.id === department.id).role],
    [false, true, 'viewer', 'hr'])
  const other = expectStatus(await request(users.hrB, 'GET', '/performance/goals/all'), 200)
  assert.deepEqual(other.goals.map(goal => goal.id), [company.id])
  assert.deepEqual([(await request(users.boss, 'GET', '/performance/goals/all')).status, expectStatus(await request(users.admin, 'GET', '/performance/goals/all'), 200).canManageCompany], [403, true])
  // الموارد البشرية بتعتمد مقترح موظف في نطاقها، وبتعمل هدف لموظف مباشرة
  assert.equal(expectStatus(await act(users.hrA, child.id, 'decision', { decision: 'approve' }), 200).status, 'ACTIVE')
  assert.equal(expectStatus(await make(users.hrA, good({ employeeId: emps.outsider.id, title: 'هدف من الموارد البشرية' })), 201).status, 'ACTIVE')
  assert.deepEqual(answer(await make(users.hrA, good({ employeeId: emps.b1.id }))), [404, 'الموظف غير موجود'])
  // Codex P3K-B06: قسم الهدف الأب اتنقل لفرع ب وعنوان هدفه اتغيّر — موارد فرع أ لسه شايفة هدف موظفها التابع له، بس من غير رقم الأب ولا عنوانه
  // (اللي مايقدرش يقرا الأب مباشرة مايشوفوش من هدف تابع)؛ وصاحب الهدف اللي لسه في القسم شايف أبوه
  await repo('Department').update({ id: org.sales.id }, { branchId: org.branchB.id })
  await repo('PerformanceGoal').update({ id: department.id }, { title: 'SECRET-B هدف فرع ب' })
  try {
    const seenChild = expectStatus(await request(users.hrA, 'GET', '/performance/goals/' + child.id), 200), ownChild = expectStatus(await request(users.rep, 'GET', '/performance/goals/' + child.id), 200)
    assert.deepEqual([(await request(users.hrA, 'GET', '/performance/goals/' + department.id)).status, seenChild.parentGoalId, seenChild.parentTitle,
      JSON.stringify(expectStatus(await request(users.hrA, 'GET', '/performance/goals/all'), 200)).includes('SECRET-B'), ownChild.parentGoalId, ownChild.parentTitle],
    [404, null, null, false, department.id, 'SECRET-B هدف فرع ب'])
  } finally {
    await repo('Department').update({ id: org.sales.id }, { branchId: org.branchA.id })
    await repo('PerformanceGoal').update({ id: department.id }, { title: 'هدف قسم المبيعات' })
  }
  // الموظف اتنقل لفرع ب: الحكم بفرعه الحالي — موارد فرع أ مابقتش شايفة هدفه، وموارد فرع ب شايفاه
  await repo('Employee').update({ id: emps.rep.id }, { branchId: org.branchB.id })
  try {
    assert.equal(expectStatus(await request(users.hrA, 'GET', '/performance/goals/all'), 200).goals.some(goal => goal.id === goals.first), false)
    assert.deepEqual([(await request(users.hrA, 'GET', '/performance/goals/' + goals.first)).status, expectStatus(await request(users.hrB, 'GET', '/performance/goals/' + goals.first), 200).role], [404, 'hr'])
  } finally { await repo('Employee').update({ id: emps.rep.id }, { branchId: org.branchA.id }) }
  // B3.8-ب: خطة التحسين هدف بنوع خاص — المدير أو إدارة الأداء لموظف، من غير وزن، ومش الموظف لنفسه ولا لقسم
  const pipRule = require('../src/performance/goal-rules').GOAL_PIP
  assert.deepEqual([answer(await make(users.rep, good({ kind: 'PIP', weight: 0 }))), answer(await make(users.boss, good({ employeeId: emps.rep.id, kind: 'PIP', weight: 20 }))),
    answer(await make(users.hrA, good({ ownerType: 'DEPARTMENT', departmentId: org.sales.id, kind: 'PIP', weight: 0 })))], [[400, pipRule], [400, pipRule], [400, pipRule]])
  const pip = expectStatus(await make(users.boss, good({ employeeId: emps.rep.id, kind: 'PIP', weight: 0, title: 'خطة تحسين التزام المواعيد' })), 201)
  assert.deepEqual([pip.kind, pip.kindLabel, pip.status, pip.weight], ['PIP', 'خطة تحسين', 'ACTIVE', 0])
  assert.deepEqual(answer(await request(users.boss, 'PATCH', '/performance/goals/' + pip.id, { weight: 10, reason: 'تجربة وزن' })), [400, pipRule])
  // والموديول لما يتقفل المسارات بتتقفل
  expectStatus(await request(users.admin, 'PUT', '/modules/performance', { enabled: false }), 200); modules.invalidate()
  try { assert.equal((await request(users.rep, 'GET', '/performance/goals/mine')).status, 404) } finally { expectStatus(await request(users.admin, 'PUT', '/modules/performance', { enabled: true }), 200); modules.invalidate() }
})
