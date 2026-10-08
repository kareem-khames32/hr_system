'use strict'
// B3.7: دورات التقييم على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر (hr_perf_reviews_test_<16 hex>)، عبر HTTP بتوكنات موقّعة محليًا ومن غير كلمات
// مرور. ولا رسالة بريد حقيقية.
//  RV-01) النماذج والدورات: القيم (الأقسام وأوزانها وبنودها، التواريخ، الجمهور)، ونطاق الفروع (دورة «كل الشركة» لحساب من غير قيد فروع بس؛ ودورة
//         فرع تاني = غير موجودة)، والإطلاق: تكليف لكل موظف شغال في الجمهور بمديره المباشر، ونسخة النموذج بتتجمّد، ومرة واحدة.
//  RV-02) التقييم: الموظف بيسلّم تقييمه الذاتي ومديره المقيِّم بيسلّم تقييمه — مرة واحدة؛ الإجابات على النموذج المتجمّد وأهداف الفترة؛ الدرجة بالأوزان
//         (أرقام معروفة)؛ لوحة الأدلة (حضور، مهام، أهداف) بتتجمّد مع الرد؛ والموظف مايشوفش تقييم مديره قبل الإعلان؛ واللي مالوش حق = غير موجود.
//  RV-03) إدارة الأداء: تكليفات الدورة بدرجاتها بنطاق الفروع، وقفل الدورة بيوقّف التسليم، والموديول المقفول بيقفل المسارات.
// Run (من api/): node --test test/performance-reviews.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_perf_reviews_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_perf_reviews_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-perf-reviews-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/performance/review-rules')
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
const employee = (extra = {}) => repo('Employee').save({ employeeCode: `RV${String(++employeeNumber).padStart(3, '0')}`, fullName: `موظف التقييم ${employeeNumber}`, branchId: org.branchA.id,
  joinDate: '2020-01-01', basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'cash', ...extra })
const account = (label, permissions, extra = {}) => repo('User').save({ email: `${label}@perf-reviews.invalid`, displayName: `حساب ${label}`, passwordHash: 'test-only',
  role: 'employee', branchId: org.branchA.id, permissions: JSON.stringify(permissions), isActive: true, ...extra })
const sections = () => [
  { title: 'الأهداف', kind: 'GOALS', weight: 50 },
  { title: 'الجدارات', kind: 'COMPETENCIES', weight: 50, items: [{ label: 'التعاون', type: 'rating' }, { label: 'الالتزام', type: 'rating' }, { label: 'ملاحظات', type: 'text', required: false }] },
]
const cycleBody = (extra = {}) => ({ name: 'تقييم الربع الأخير', kind: 'ANNUAL', templateId: state.template, periodStart: '2026-10-01', periodEnd: '2026-12-31', selfDueDate: '2027-01-10',
  managerDueDate: '2027-01-20', audienceMode: 'DEPARTMENTS', audienceIds: [org.sales.id], ...extra })
const R = '/performance/reviews'

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

  org.branchA = await repo('Branch').save({ code: 'RV_A', name: 'فرع التقييم أ', country: 'SA' })
  org.branchB = await repo('Branch').save({ code: 'RV_B', name: 'فرع التقييم ب السري', country: 'SA' })
  org.sales = await repo('Department').save({ name: 'قسم المبيعات', code: 'RV_SAL', branchId: org.branchA.id })
  org.bDepartment = await repo('Department').save({ name: 'قسم فرع ب', code: 'RV_BD', branchId: org.branchB.id })
  emps.boss = await employee({ fullName: 'مدير المبيعات', departmentId: org.sales.id })
  emps.rep = await employee({ fullName: 'مندوب أول', departmentId: org.sales.id, managerEmployeeId: emps.boss.id })
  emps.peer = await employee({ fullName: 'مندوب تاني', departmentId: org.sales.id, managerEmployeeId: emps.boss.id })
  emps.gone = await employee({ fullName: 'موظف منتهي', departmentId: org.sales.id, status: 'terminated', isActive: false })
  emps.b1 = await employee({ fullName: 'موظف فرع ب', branchId: org.branchB.id, departmentId: org.bDepartment.id })
  users.admin = await repo('User').save({ email: 'admin@perf-reviews.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', branchId: null,
    scopeAllBranches: true, permissions: '[]', isActive: true })
  users.boss = await account('boss', [], { employeeId: emps.boss.id })
  users.rep = await account('rep', [], { employeeId: emps.rep.id })
  users.peer = await account('peer', [], { employeeId: emps.peer.id })
  users.hrA = await account('hr-a', ['performance.manage'])
  users.hrB = await account('hr-b', ['performance.manage'], { branchId: org.branchB.id })
  users.nobody = await account('nobody', [])
  expectStatus(await request(users.admin, 'PUT', '/modules/performance', { enabled: true }), 200); modules.invalidate()
  // أهداف المندوب في الفترة (وزن 60 و40)، وهدف برّه الفترة، وهدف مقترح — الاتنين الأخيرين مش من بنود التقييم
  const goal = (extra) => repo('PerformanceGoal').save({ ownerType: 'EMPLOYEE', employeeId: emps.rep.id, departmentId: null, branchId: org.branchA.id, parentGoalId: null, kind: 'GOAL', title: 'هدف',
    description: null, weight: 0, targetValue: null, unit: null, actualValue: null, periodStart: '2026-10-01', periodEnd: '2026-12-31', status: 'ACTIVE', proposedByUserId: users.boss.id,
    decidedByUserId: users.boss.id, decidedAt: new Date(), decisionReason: null, createdAt: new Date(), closedAt: null, ...extra })
  state.g1 = (await goal({ title: 'زيادة المبيعات', weight: 60, targetValue: '100.00', actualValue: '80.00', unit: 'عقد' })).id
  state.g2 = (await goal({ title: 'رضا العملاء', weight: 40, status: 'DONE' })).id
  await goal({ title: 'هدف السنة اللي فاتت', weight: 50, periodStart: '2025-01-01', periodEnd: '2025-12-31' })
  await goal({ title: 'هدف لسه مقترح', weight: 50, status: 'PROPOSED' })
  // حضور المندوب في الفترة: حاضر، متأخر 15 دقيقة، غايب — ويوم برّه الفترة
  const attended = (date, status, lateMinutes = 0) => repo('AttendanceDay').save({ employeeId: emps.rep.id, branchId: org.branchA.id, date, shiftName: 'صباحي', shiftStart: '08:00', shiftEnd: '17:00', status, lateMinutes })
  await attended('2026-10-05', 'present'); await attended('2026-10-06', 'late', 15); await attended('2026-10-07', 'absent'); await attended('2026-09-30', 'absent')
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
    assert.equal(path.dirname(path.resolve(uploads)), os.tmpdir()); assert.match(path.basename(uploads), /^hr-perf-reviews-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'performance reviews fixture cleanup failed')
})

test('RV-01: النماذج والدورات — القيم، ونطاق الفروع، والإطلاق بتكليف لكل موظف شغال بمديره ونسخة نموذج متجمّدة', async () => {
  // النماذج: بالصلاحية بس، والأقسام بأوزان مجموعها 100، وقسم أهداف واحد، والقسم الموزون فيه بند تقدير
  assert.deepEqual([(await request(users.boss, 'GET', R + '/templates')).status, (await request(users.boss, 'POST', R + '/templates', { name: 'نموذج', sections: sections() })).status], [403, 403])
  const template = (change) => request(users.hrA, 'POST', R + '/templates', { name: 'نموذج سنوي', ratingMax: 5, sections: sections(), ...change })
  for (const [change, message] of [
    [{ name: 'ab' }, rules.REVIEW_NAME], [{ ratingMax: 2 }, rules.REVIEW_RATING_MAX], [{ ratingMax: 11 }, rules.REVIEW_RATING_MAX], [{ sections: [] }, rules.REVIEW_SECTIONS],
    [{ sections: [{ title: 'الأهداف', kind: 'GOALS', weight: 60 }, sections()[1]] }, rules.REVIEW_SECTIONS], [{ sections: [sections()[0], sections()[0]] }, rules.REVIEW_SECTION],
    [{ sections: [{ title: 'أسئلة', kind: 'QUESTIONS', weight: 100, items: [{ label: 'رأيك', type: 'text' }] }] }, rules.REVIEW_ITEMS], [{ sections: [{ title: 'x', kind: 'GOALS', weight: 100 }] }, rules.REVIEW_SECTION],
    [{ sections: [{ title: 'جدارات', kind: 'COMPETENCIES', weight: 100, items: [] }] }, rules.REVIEW_ITEMS], [{ sections: [{ title: 'جدارات', kind: 'SKILLS', weight: 100, items: [{ label: 'بند', type: 'rating' }] }] }, rules.REVIEW_SECTION],
  ]) assert.deepEqual(answer(await template(change)), [400, message], JSON.stringify(change).slice(0, 70))
  const made = expectStatus(await template({}), 201)
  assert.deepEqual([made.ratingMax, made.isActive, made.sections.map(section => [section.key, section.kind, section.weight, section.items.map(item => [item.key, item.type, item.required])])],
    [5, true, [['s1', 'GOALS', 50, []], ['s2', 'COMPETENCIES', 50, [['s2i1', 'rating', true], ['s2i2', 'rating', true], ['s2i3', 'text', false]]]]])
  state.template = made.id

  // الدورات: التواريخ والجمهور والنطاق
  const cycle = (user, change) => request(user, 'POST', R + '/cycles', cycleBody(change))
  for (const [change, status, message] of [
    [{ name: '' }, 400, rules.REVIEW_NAME], [{ kind: 'MONTHLY' }, 400, rules.REVIEW_KIND], [{ periodEnd: '2026-09-30' }, 400, rules.REVIEW_DATES], [{ managerDueDate: '2027-01-05' }, 400, rules.REVIEW_DATES],
    [{ audienceMode: 'TEAMS' }, 400, rules.REVIEW_AUDIENCE], [{ audienceIds: [] }, 400, rules.REVIEW_AUDIENCE], [{ templateId: 987654 }, 400, 'اختار نموذج تقييم متاح'],
    [{ audienceIds: [org.bDepartment.id] }, 404, 'القسم غير موجود'], [{ audienceMode: 'BRANCHES', audienceIds: [org.branchB.id] }, 404, 'الفرع غير موجود'], [{ audienceMode: 'COMPANY', audienceIds: undefined }, 403, 'دورة لكل الشركة لصاحب الصلاحية من غير قيد فروع — اختار فروعك أو أقسامك'],
  ]) assert.deepEqual(answer(await cycle(users.hrA, change)), [status, message], JSON.stringify(change).slice(0, 70))
  assert.equal(await repo('ReviewCycle').count(), 0)
  const draft = expectStatus(await cycle(users.hrA, {}), 201)
  assert.deepEqual([draft.status, draft.statusLabel, draft.kindLabel, draft.templateName, draft.audienceMode, draft.audienceIds, draft.counts], ['DRAFT', 'مسودة', 'سنوي', 'نموذج سنوي', 'DEPARTMENTS', [org.sales.id],
    { total: 0, self: 0, manager: 0, noManager: 0 }])
  state.cycle = draft.id
  const company = expectStatus(await cycle(users.admin, { name: 'دورة كل الشركة', audienceMode: 'COMPANY', audienceIds: undefined }), 201)
  // النطاق: فرع ب مش شايف دورة فرع أ ولا دورة الشركة؛ وفرع أ مش شايف دورة الشركة
  assert.deepEqual(expectStatus(await request(users.hrB, 'GET', R + '/cycles'), 200).cycles, [])
  assert.deepEqual(expectStatus(await request(users.hrA, 'GET', R + '/cycles'), 200).cycles.map(row => row.id), [draft.id])
  assert.deepEqual(expectStatus(await request(users.admin, 'GET', R + '/cycles'), 200).cycles.map(row => row.id), [company.id, draft.id])
  for (const stranger of [users.hrB]) assert.deepEqual(answer(await request(stranger, 'POST', R + `/cycles/${draft.id}/launch`)), [404, rules.REVIEW_CYCLE_NOT_FOUND])
  assert.equal((await request(users.boss, 'POST', R + `/cycles/${draft.id}/launch`)).status, 403)

  // الإطلاق: تكليف لكل موظف شغال في القسم (المنتهي لأ)، بمديره المباشر؛ والمدير نفسه من غير مدير؛ والنسخة بتتجمّد؛ ومرة واحدة
  const launched = expectStatus(await request(users.hrA, 'POST', R + `/cycles/${draft.id}/launch`), 200)
  assert.deepEqual([launched.status, launched.counts], ['ACTIVE', { total: 3, self: 0, manager: 0, noManager: 1 }])
  const rows = await repo('ReviewAssignment').find({ where: { cycleId: draft.id }, order: { employeeId: 'ASC' } })
  assert.deepEqual(rows.map(row => [row.employeeId, row.managerEmployeeId, row.branchId, row.status]),
    [[emps.boss.id, null, org.branchA.id, 'OPEN'], [emps.rep.id, emps.boss.id, org.branchA.id, 'OPEN'], [emps.peer.id, emps.boss.id, org.branchA.id, 'OPEN']])
  assert.deepEqual(answer(await request(users.hrA, 'POST', R + `/cycles/${draft.id}/launch`)), [400, 'الدورة اتطلقت قبل كده'])
  assert.equal(await repo('ReviewAssignment').count({ where: { cycleId: draft.id } }), 3)
  // تعديل النموذج بعد الإطلاق مابيغيّرش نسخة الدورة
  expectStatus(await request(users.hrA, 'PATCH', R + `/templates/${made.id}`, { name: 'نموذج سنوي معدّل', ratingMax: 10 }), 200)
  assert.equal(JSON.parse((await repo('ReviewCycle').findOneByOrFail({ id: draft.id })).templateSnapshot).ratingMax, 5)
  assert.equal((await request(users.hrA, 'PATCH', R + '/templates/987654', { name: 'مش موجود' })).status, 404)
  state.rep = rows[1].id; state.peer = rows[2].id; state.boss = rows[0].id
})

test('RV-02: التقييم الذاتي وتقييم المدير — مرة واحدة، على النموذج المتجمّد وأهداف الفترة، والدرجة بالأوزان، والأدلة بتتجمّد مع الرد', async () => {
  const mine = expectStatus(await request(users.rep, 'GET', R + '/mine'), 200)
  assert.deepEqual([mine.available, mine.reviews.map(row => [row.id, row.cycleName, row.selfSubmitted, row.managerScore])], [true, [[state.rep, 'تقييم الربع الأخير', false, null]]])
  assert.deepEqual(expectStatus(await request(users.boss, 'GET', R + '/team'), 200).reviews.map(row => [row.id, row.employeeName]).sort(), [[state.rep, 'مندوب أول'], [state.peer, 'مندوب تاني']].sort())
  assert.deepEqual([expectStatus(await request(users.rep, 'GET', R + '/team'), 200).reviews, expectStatus(await request(users.nobody, 'GET', R + '/mine'), 200).reviews], [[], []])

  // النموذج: نسخة الدورة، وأهداف الفترة بس (السارية والمتحققة)، ولوحة الأدلة الحيّة
  const form = expectStatus(await request(users.rep, 'GET', R + '/' + state.rep), 200)
  assert.deepEqual([form.relation, form.canSubmit, form.template.ratingMax, form.goals.map(goal => [goal.id, goal.weight]), form.self, form.manager],
    ['self', true, 5, [[state.g1, 60], [state.g2, 40]], null, null])
  assert.deepEqual([form.evidence.attendance, form.evidence.goals.length, form.evidence.period],
    [{ days: 3, byStatus: { present: 1, late: 1, absent: 1 }, lateDays: 1, lateMinutes: 15 }, 2, { from: '2026-10-01', to: '2026-12-31' }])
  for (const stranger of [users.peer, users.hrB, users.nobody]) {
    assert.deepEqual([answer(await request(stranger, 'GET', R + '/' + state.rep)), answer(await request(stranger, 'POST', R + `/${state.rep}/submit`, { answers: {} }))],
      [[404, rules.REVIEW_NOT_FOUND], [404, rules.REVIEW_NOT_FOUND]], stranger.email)
  }
  assert.equal((await request(users.hrA, 'POST', R + `/${state.rep}/submit`, { answers: {} })).status, 404, 'إدارة الأداء من غير ملف موظف مابتسلّمش تقييم')

  // الإجابات: كل بند مطلوب، والتقدير من 1 لـ5، وكل هدف من أهداف الفترة، ومفيش مفتاح برّه النموذج
  const good = { sections: { s2: { s2i1: { rating: 3 }, s2i2: { rating: 5 }, s2i3: { text: ' شغل كويس ' } } }, goals: { [state.g1]: { rating: 4, comment: 'قريب من المستهدف' }, [state.g2]: { rating: 5 } } }
  const submit = (user, id, answers, comment) => request(user, 'POST', R + `/${id}/submit`, { answers, comment })
  for (const bad of [
    {}, { sections: good.sections }, { ...good, goals: { [state.g1]: { rating: 4 } } }, { ...good, sections: { s2: { s2i1: { rating: 3 } } } }, { ...good, sections: { s2: { ...good.sections.s2, s2i1: { rating: 6 } } } },
    { ...good, sections: { s2: { ...good.sections.s2, s2i1: { rating: 2.5 } } } }, { ...good, sections: { ...good.sections, s9: {} } }, { ...good, sections: { s2: { ...good.sections.s2, extra: { rating: 1 } } } },
    { ...good, goals: { ...good.goals, 987654: { rating: 3 } } }, { ...good, goals: { ...good.goals, [state.g2]: { rating: 0 } } }, 'نص',
  ]) assert.deepEqual(answer(await submit(users.rep, state.rep, bad)), [400, rules.REVIEW_ANSWERS], JSON.stringify(bad).slice(0, 70))
  assert.equal(await repo('ReviewResponse').count(), 0)
  // الدرجة: الأهداف (4×60 + 5×40) ÷ 100 = 4.4 من 5 = 88؛ الجدارات (3 + 5) ÷ 2 = 4 من 5 = 80؛ الكلي بالنص والنص = 84
  const self = expectStatus(await submit(users.rep, state.rep, good, ' سنة كويسة '), 200)
  assert.deepEqual([self.selfSubmitted, self.selfScore, self.canSubmit, self.self.score, self.self.comment, self.self.answers.sections.s2.s2i3, self.manager, self.status], [true, 84, false, 84, 'سنة كويسة', { text: 'شغل كويس' }, null, 'OPEN'])
  assert.deepEqual(answer(await submit(users.rep, state.rep, good)), [409, rules.REVIEW_SUBMITTED])
  // الأدلة اتجمّدت مع الرد: حضور جديد بعد التسليم مابيغيّرش اللي الموظف سلّم عليه
  await repo('AttendanceDay').save({ employeeId: emps.rep.id, branchId: org.branchA.id, date: '2026-10-08', shiftName: 'صباحي', shiftStart: '08:00', shiftEnd: '17:00', status: 'absent', lateMinutes: 0 })
  assert.equal(expectStatus(await request(users.rep, 'GET', R + '/' + state.rep), 200).evidence.attendance.days, 3, 'نسخة الموظف المتجمّدة')

  // المدير: شايف تقييم الموظف الذاتي، والأدلة الحيّة (4 أيام)، وبيسلّم — الأهداف 3 و3 = 60، الجدارات 4 و4 = 80، الكلي 70
  const bossForm = expectStatus(await request(users.boss, 'GET', R + '/' + state.rep), 200)
  assert.deepEqual([bossForm.relation, bossForm.canSubmit, bossForm.self.score, bossForm.evidence.attendance.days, bossForm.employeeName], ['manager', true, 84, 4, 'مندوب أول'])
  assert.equal((await submit(users.rep, state.rep, good)).status, 409, 'الموظف مايسلّمش تقييم المدير')
  const managed = expectStatus(await submit(users.boss, state.rep, { sections: { s2: { s2i1: { rating: 4 }, s2i2: { rating: 4 } } }, goals: { [state.g1]: { rating: 3 }, [state.g2]: { rating: 3 } } }, 'محتاج يركّز على العقود'), 200)
  assert.deepEqual([managed.managerSubmitted, managed.managerScore, managed.finalScore, managed.status, managed.statusLabel, managed.manager.score], [true, 70, 70, 'COMPLETED', 'المدير سلّم', 70])
  assert.equal((await submit(users.boss, state.rep, good)).status, 409)
  // الموظف مايشوفش تقييم مديره ولا الدرجة النهائية قبل الإعلان
  const after = expectStatus(await request(users.rep, 'GET', R + '/' + state.rep), 200)
  assert.deepEqual([after.manager, after.managerScore, after.finalScore, after.self.score, after.status], [null, null, null, 84, 'COMPLETED'])
  assert.deepEqual(expectStatus(await request(users.rep, 'GET', R + '/mine'), 200).reviews.map(row => [row.managerScore, row.finalScore]), [[null, null]])
  const stored = await repo('ReviewResponse').find({ where: { assignmentId: state.rep }, order: { id: 'ASC' } })
  assert.deepEqual(stored.map(row => [row.relation, Number(row.score), JSON.parse(row.evidence).attendance.days, row.submittedByUserId]), [['SELF', 84, 3, users.rep.id], ['MANAGER', 70, 4, users.boss.id]])
  // موظف من غير أهداف في الفترة: قسم الأهداف بيخرج والدرجة من الجدارات بس
  const peer = expectStatus(await submit(users.peer, state.peer, { sections: { s2: { s2i1: { rating: 5 }, s2i2: { rating: 4 } } } }), 200)
  assert.deepEqual([peer.goals, peer.selfScore], [[], 90])
  // المدير نفسه (من غير مدير مقيِّم): بيسلّم الذاتي بس
  assert.equal(expectStatus(await request(users.boss, 'GET', R + '/' + state.boss), 200).relation, 'self')
})

test('RV-03: إدارة الأداء — تكليفات الدورة بدرجاتها بنطاق الفروع، وقفل الدورة بيوقّف التسليم، والموديول المقفول بيقفل المسارات', async () => {
  const list = expectStatus(await request(users.hrA, 'GET', R + `/cycles/${state.cycle}/assignments`), 200)
  assert.deepEqual(list.assignments.map(row => [row.employeeName, row.managerName, row.hasManager, row.status, row.selfScore, row.managerScore, row.finalScore]),
    [['مدير المبيعات', null, false, 'OPEN', null, null, null], ['مندوب أول', 'مدير المبيعات', true, 'COMPLETED', 84, 70, 70], ['مندوب تاني', 'مدير المبيعات', true, 'OPEN', 90, null, null]])
  assert.deepEqual(list.cycle.counts, { total: 3, self: 2, manager: 1, noManager: 1 })
  assert.deepEqual([answer(await request(users.hrB, 'GET', R + `/cycles/${state.cycle}/assignments`)), (await request(users.boss, 'GET', R + `/cycles/${state.cycle}/assignments`)).status], [[404, rules.REVIEW_CYCLE_NOT_FOUND], 403])
  // إدارة الأداء بتفتح نموذج أي تكليف في نطاقها وشايفة الردّين
  const seen = expectStatus(await request(users.hrA, 'GET', R + '/' + state.rep), 200)
  assert.deepEqual([seen.relation, seen.self.score, seen.manager.score, seen.canSubmit], ['hr', 84, 70, false])
  // موظف اتنقل لفرع ب: الحكم بفرعه الحالي — مش في قايمة فرع أ ولا نموذجه
  await repo('Employee').update({ id: emps.rep.id }, { branchId: org.branchB.id })
  try {
    assert.equal(expectStatus(await request(users.hrA, 'GET', R + `/cycles/${state.cycle}/assignments`), 200).assignments.some(row => row.employeeName === 'مندوب أول'), false)
    assert.equal((await request(users.hrA, 'GET', R + '/' + state.rep)).status, 404)
  } finally { await repo('Employee').update({ id: emps.rep.id }, { branchId: org.branchA.id }) }
  // القفل: للدورة الشغالة بس، وبعده مفيش تسليم
  assert.deepEqual(answer(await request(users.hrB, 'POST', R + `/cycles/${state.cycle}/close`)), [404, rules.REVIEW_CYCLE_NOT_FOUND])
  assert.equal(expectStatus(await request(users.hrA, 'POST', R + `/cycles/${state.cycle}/close`), 200).status, 'CLOSED')
  assert.equal((await request(users.hrA, 'POST', R + `/cycles/${state.cycle}/close`)).status, 400)
  assert.deepEqual(answer(await request(users.boss, 'POST', R + `/${state.peer}/submit`, { answers: { sections: { s2: { s2i1: { rating: 3 }, s2i2: { rating: 3 } } } } })), [400, 'الدورة مش شغالة — مفيش تسليم'])
  assert.equal(expectStatus(await request(users.boss, 'GET', R + '/' + state.peer), 200).canSubmit, false)
  expectStatus(await request(users.admin, 'PUT', '/modules/performance', { enabled: false }), 200); modules.invalidate()
  try {
    assert.deepEqual([(await request(users.rep, 'GET', R + '/mine')).status, (await request(users.hrA, 'GET', R + '/cycles')).status], [404, 404])
  } finally { expectStatus(await request(users.admin, 'PUT', '/modules/performance', { enabled: true }), 200); modules.invalidate() }
})
