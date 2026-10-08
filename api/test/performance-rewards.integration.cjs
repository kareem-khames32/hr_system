'use strict'
// B3.8-ب: مكافآت نتيجة التقييم على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر (hr_perf_rewards_test_<16 hex>)، عبر HTTP بتوكنات موقّعة محليًا ومن غير
// كلمات مرور. ولا رسالة بريد حقيقية.
//  RW-01) الاقتراح: إدارة الأداء (ومعاها إدارة المكافآت) بتقترح مكافآت دورة بقاعدة (تقدير ← قيمة) بنطاق الفروع — للتقييمات المعتمدة والمعلنة اللي
//         موظفها له مدير مباشر وتقديره له قيمة، ومرة واحدة. ولا طلب مكافأة ولا قيد في الدفتر بيتعمل من الاقتراح.
//  RW-02) التقديم: المدير الموجّه له الاقتراح بس هو اللي بيقدّم — طلب مكافأة باسمه بموديول المكافآت وسلسلته، مرة واحدة حتى مع ضغطتين مع بعض؛
//         رفض المكافآت بيرجّع الاقتراح؛ ولا قيد في الدفتر قبل آخر اعتماد في سلسلة المكافأة؛ وصرف النظر؛ والموديول المقفول.
//  RW-03) (CRP3K / Codex P3K-B08-01) طلب المكافأة ثبت والرد وقع: الاقتراح بيتربط بطلبه بعلامته، وإعادة المحاولة مابتعملش طلب تاني حتى لو
//         فحص التكرار في المكافآت مقفول.
// Run (من api/): node --test test/performance-rewards.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_perf_rewards_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_perf_rewards_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-perf-rewards-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rewards = require('../src/performance/review-rewards.service')
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
const employee = (extra = {}) => repo('Employee').save({ employeeCode: `RW${String(++employeeNumber).padStart(3, '0')}`, fullName: `موظف المكافآت ${employeeNumber}`, branchId: org.branchA.id,
  departmentId: org.sales.id, teamId: null, managerEmployeeId: null, joinDate: '2020-01-01', basicSalary: 9000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0,
  otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'cash', ...extra })
const account = (label, permissions, extra = {}) => repo('User').save({ email: `${label}@perf-rewards.invalid`, displayName: `حساب ${label}`, passwordHash: 'test-only',
  role: 'employee', branchId: org.branchA.id, permissions: JSON.stringify(permissions), isActive: true, ...extra })
const assign = (employeeId, status, finalScore, managerEmployeeId = emps.boss.id) => repo('ReviewAssignment').save({ cycleId: state.cycle, employeeId, branchId: org.branchA.id, managerEmployeeId, status,
  selfSubmittedAt: null, managerSubmittedAt: new Date(), selfScore: null, managerScore: finalScore, finalScore, createdAt: new Date() })
const count = name => repo(name).count()
const R = '/performance/rewards'

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

  org.branchA = await repo('Branch').save({ code: 'RW_A', name: 'فرع المكافآت أ', country: 'SA' })
  org.branchB = await repo('Branch').save({ code: 'RW_B', name: 'فرع المكافآت ب', country: 'SA' })
  org.sales = await repo('Department').save({ name: 'قسم المبيعات', code: 'RW_SAL', branchId: org.branchA.id })
  emps.boss = await employee({ fullName: 'مدير المبيعات' })
  emps.other = await employee({ fullName: 'مدير تاني' })
  emps.rep = await employee({ fullName: 'مندوب ممتاز', managerEmployeeId: emps.boss.id })
  emps.peer = await employee({ fullName: 'مندوب جيد جدًا', managerEmployeeId: emps.boss.id })
  emps.lone = await employee({ fullName: 'ممتاز من غير مدير' })
  emps.low = await employee({ fullName: 'مندوب ضعيف', managerEmployeeId: emps.boss.id })
  users.admin = await repo('User').save({ email: 'admin@perf-rewards.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', branchId: null,
    scopeAllBranches: true, permissions: '[]', isActive: true })
  users.boss = await account('boss', [], { employeeId: emps.boss.id })
  users.other = await account('other', [], { employeeId: emps.other.id })
  users.rep = await account('rep', [], { employeeId: emps.rep.id })
  // إدارة الأداء ومعاها إدارة المكافآت (من غير سلطة الموارد البشرية: اقتراحها مابيتعتمدش لحظتها)؛ وواحدة من غير المكافآت؛ وواحدة في فرع ب
  users.hrA = await account('hr-a', ['performance.manage', 'bonuses.manage'])
  users.hrOnly = await account('hr-only', ['performance.manage'])
  users.hrB = await account('hr-b', ['performance.manage', 'bonuses.manage'], { branchId: org.branchB.id })
  users.payHr = await account('pay-hr', ['bonuses.view', 'bonuses.approve'])
  expectStatus(await request(users.admin, 'PUT', '/modules/performance', { enabled: true }), 200); modules.invalidate()
  state.type = expectStatus(await request(users.admin, 'POST', '/bonuses/types', { code: 'REVIEW', nameAr: 'مكافأة أداء سنوي', calcMethod: 'FIXED_AMOUNT' }), 201).id
  // دورة اتطلقت على فرع أ بنتايجها: ممتاز معلن، جيد جدًا معتمد، ممتاز من غير مدير، ضعيف، والمدير نفسه لسه ماتعتمدش
  state.cycle = (await repo('ReviewCycle').save({ name: 'تقييم السنة', kind: 'ANNUAL', templateId: 1, periodStart: '2026-01-01', periodEnd: '2026-12-31', audienceMode: 'BRANCHES',
    audienceIds: JSON.stringify([org.branchA.id]), branchIds: JSON.stringify([org.branchA.id]), selfDueDate: '2027-01-10', managerDueDate: '2027-01-20', status: 'ACTIVE',
    templateSnapshot: JSON.stringify({ ratingMax: 5, sections: [] }), launchedAt: new Date(), launchedByUserId: users.admin.id, createdByUserId: users.admin.id, createdAt: new Date(), closedAt: null })).id
  state.rep = (await assign(emps.rep.id, 'ANNOUNCED', '95.00')).id
  state.peer = (await assign(emps.peer.id, 'APPROVED', '78.00')).id
  state.lone = (await assign(emps.lone.id, 'ACKNOWLEDGED', '92.00', null)).id
  state.low = (await assign(emps.low.id, 'ANNOUNCED', '40.00')).id
  await assign(emps.boss.id, 'COMPLETED', '99.00', null)
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

test('RW-01: الاقتراح — بقاعدة تقدير ← قيمة، بنطاق الفروع وبصلاحيتين، للي له مدير مباشر وتقدير بقيمة، ومرة واحدة، ومن غير أي أثر مالي', async () => {
  const C = R + '/cycles/' + state.cycle
  const good = { bonusTypeId: state.type, targetPeriod: '2026-12', values: { A: '500', B: 250, C: '' } }
  // النتايج: المعتمد والمعلن بس، بتقديراتهم؛ وأنواع المكافآت لحامل إدارة المكافآت بس
  const seen = expectStatus(await request(users.hrA, 'GET', C), 200)
  assert.deepEqual(seen.rows.map(row => [row.employeeName, row.managerName, row.status, row.finalScore, row.band, row.suggestion]),
    [['مندوب ممتاز', 'مدير المبيعات', 'ANNOUNCED', 95, 'A', null], ['مندوب جيد جدًا', 'مدير المبيعات', 'APPROVED', 78, 'B', null], ['ممتاز من غير مدير', null, 'ACKNOWLEDGED', 92, 'A', null],
      ['مندوب ضعيف', 'مدير المبيعات', 'ANNOUNCED', 40, 'E', null]])
  assert.deepEqual([seen.canSuggest, seen.types.map(type => [type.id, type.nameAr, type.calcMethod])], [true, [[state.type, 'مكافأة أداء سنوي', 'FIXED_AMOUNT']]])
  const bare = expectStatus(await request(users.hrOnly, 'GET', C), 200)
  assert.deepEqual([bare.canSuggest, bare.types, bare.rows.length], [false, [], 4])
  assert.deepEqual([answer(await request(users.hrB, 'GET', C)), (await request(users.boss, 'GET', C)).status, answer(await request(users.hrB, 'POST', C, good)), (await request(users.boss, 'POST', C, good)).status],
    [[404, rules.REVIEW_CYCLE_NOT_FOUND], 403, [404, rules.REVIEW_CYCLE_NOT_FOUND], 403])
  // القيم
  assert.deepEqual(answer(await request(users.hrOnly, 'POST', C, good)), [403, rewards.REWARD_BONUS_PERMISSION])
  for (const [change, message] of [[{ targetPeriod: '2026-13' }, rewards.REWARD_PERIOD], [{ targetPeriod: undefined }, rewards.REWARD_PERIOD], [{ values: {} }, rewards.REWARD_VALUES], [{ values: { Z: '5' } }, rewards.REWARD_VALUES],
    [{ values: { A: '-5' } }, rewards.REWARD_VALUES], [{ values: { A: 'x' } }, rewards.REWARD_VALUES], [{ values: 'نص' }, rewards.REWARD_VALUES], [{ values: { A: '' } }, rewards.REWARD_VALUES],
    [{ bonusTypeId: 987654 }, rewards.REWARD_TYPE], [{ bonusTypeId: 'x' }, rewards.REWARD_TYPE]]) {
    assert.deepEqual(answer(await request(users.hrA, 'POST', C, { ...good, ...change })), [400, message], JSON.stringify(change))
  }
  // نوع مايقترحهوش المدير المباشر مش من الاختيارات
  const hrType = expectStatus(await request(users.admin, 'POST', '/bonuses/types', { code: 'HR_ONLY', nameAr: 'مكافأة من الموارد البشرية بس', calcMethod: 'FIXED_AMOUNT', creatorScopes: ['HR'] }), 201).id
  assert.deepEqual([answer(await request(users.hrA, 'POST', C, { ...good, bonusTypeId: hrType })), expectStatus(await request(users.hrA, 'GET', C), 200).types.length], [[400, rewards.REWARD_TYPE], 1])
  assert.deepEqual([await count('ReviewRewardSuggestion'), await count('BonusRequest')], [0, 0])

  // الاقتراح: الممتاز 500 والجيد جدًا 250؛ اللي من غير مدير واللي تقديره من غير قيمة بيتعدّوا — ولا طلب مكافأة ولا قيد
  const before = [await count('BonusRequest'), await count('EmployeeObligation')]
  const made = expectStatus(await request(users.hrA, 'POST', C, good), 200)
  assert.deepEqual([made.created, made.skipped], [2, { exists: 0, noValue: 1, noManager: 1 }])
  assert.deepEqual(made.rows.map(row => row.suggestion && [row.suggestion.status, row.suggestion.typeName, row.suggestion.inputValue, row.suggestion.targetPeriod, row.suggestion.bandLabel, row.suggestion.bonusRequestId]),
    [['SUGGESTED', 'مكافأة أداء سنوي', '500', '2026-12', 'ممتاز', null], ['SUGGESTED', 'مكافأة أداء سنوي', '250', '2026-12', 'جيد جدًا', null], null, null])
  assert.deepEqual([await count('BonusRequest'), await count('EmployeeObligation')], before, 'الاقتراح مالوش أثر مالي')
  const stored = await repo('ReviewRewardSuggestion').find({ order: { id: 'ASC' } })
  assert.deepEqual(stored.map(row => [row.assignmentId, row.employeeId, row.managerEmployeeId, row.band, Number(row.finalScore), Number(row.inputValue), row.createdByUserId]),
    [[state.rep, emps.rep.id, emps.boss.id, 'A', 95, 500, users.hrA.id], [state.peer, emps.peer.id, emps.boss.id, 'B', 78, 250, users.hrA.id]])
  assert.equal(Number((await ds.query('SELECT COUNT(*) AS [n] FROM [audit_log] WHERE [action] = @0', ['REVIEW_REWARDS_SUGGESTED']))[0].n), 1)
  // مرة واحدة: تاني اقتراح مابيكررش
  const again = expectStatus(await request(users.hrA, 'POST', C, good), 200)
  assert.deepEqual([again.created, again.skipped, await count('ReviewRewardSuggestion')], [0, { exists: 2, noValue: 1, noManager: 1 }, 2])
  state.repSuggestion = stored[0].id; state.peerSuggestion = stored[1].id
})

test('RW-02: التقديم — المدير الموجّه له بس، بطلب مكافأة باسمه في سلسلتها ومرة واحدة، ورفض المكافآت بيرجّع الاقتراح، ولا قيد قبل آخر اعتماد، وصرف النظر', async () => {
  const C = R + '/cycles/' + state.cycle
  const submit = (user, id) => request(user, 'POST', R + `/${id}/submit`)
  // الاقتراحات بتظهر للمدير الموجّهة له بس
  const mine = expectStatus(await request(users.boss, 'GET', R + '/mine'), 200).suggestions
  assert.deepEqual(mine.map(row => [row.id, row.employeeName, row.cycleName, row.bandLabel, row.typeName, row.inputValue, row.status, row.canSubmit]),
    [[state.peerSuggestion, 'مندوب جيد جدًا', 'تقييم السنة', 'جيد جدًا', 'مكافأة أداء سنوي', '250', 'SUGGESTED', true], [state.repSuggestion, 'مندوب ممتاز', 'تقييم السنة', 'ممتاز', 'مكافأة أداء سنوي', '500', 'SUGGESTED', true]])
  for (const stranger of [users.rep, users.other, users.hrA]) {
    assert.deepEqual([expectStatus(await request(stranger, 'GET', R + '/mine'), 200).suggestions, answer(await submit(stranger, state.repSuggestion))], [[], [404, rewards.REWARD_NOT_FOUND]], stranger.email)
  }
  assert.deepEqual(answer(await submit(users.boss, 987654)), [404, rewards.REWARD_NOT_FOUND])
  // المدير بيقدّم: طلب مكافأة باسمه للموظف في سلسلة اعتمادها — ولا قيد في الدفتر
  const done = expectStatus(await submit(users.boss, state.repSuggestion), 200)
  const bonus = await repo('BonusRequest').findOneByOrFail({ id: done.bonusRequestId })
  assert.deepEqual([bonus.employeeId, bonus.creatorUserId, bonus.scopeBasis, bonus.status, Number(bonus.estimatedAmount), bonus.targetPeriod, bonus.reason, bonus.obligationId],
    [emps.rep.id, users.boss.id, 'DIRECT_MANAGER', 'IN_APPROVAL', 500, '2026-12', `نتيجة دورة التقييم «تقييم السنة» — تقدير ممتاز (95 من 100) ${rewards.rewardMarker(state.repSuggestion)}`, null])
  assert.deepEqual([await count('EmployeeObligation'), done.suggestions.find(row => row.id === state.repSuggestion).status], [0, 'SUBMITTED'], 'ولا قيد قبل اعتماد السلسلة')
  assert.deepEqual(answer(await submit(users.boss, state.repSuggestion)), [409, rewards.REWARD_TAKEN])
  // ضغطتين مع بعض: طلب مكافأة واحد
  const race = await Promise.all([submit(users.boss, state.peerSuggestion), submit(users.boss, state.peerSuggestion)])
  assert.deepEqual([race.map(response => response.status).sort(), await repo('BonusRequest').count({ where: { employeeId: emps.peer.id } })], [[200, 409], 1])
  // إدارة الأداء شايفة الاقتراح اتقدّم وحالة طلبه
  const tracked = expectStatus(await request(users.hrA, 'GET', C), 200).rows[0].suggestion
  assert.deepEqual([tracked.status, tracked.bonusRequestId, tracked.bonusStatus, tracked.bonusStatusLabel], ['SUBMITTED', bonus.id, 'IN_APPROVAL', 'قيد الاعتماد'])
  // آخر اعتماد في سلسلة المكافأة هو اللي بيعمل القيد
  for (let step = 0; step < 4 && (await repo('BonusRequest').findOneByOrFail({ id: bonus.id })).status === 'IN_APPROVAL'; step += 1) {
    assert.equal(await count('EmployeeObligation'), 0, 'ولا قيد والسلسلة لسه ماخلصتش')
    expectStatus(await request(users.admin, 'POST', `/bonuses/${bonus.id}/approve`, { expectedRevision: (await repo('BonusRequest').findOneByOrFail({ id: bonus.id })).revision }), 201)
  }
  assert.deepEqual([await count('EmployeeObligation'), expectStatus(await request(users.hrA, 'GET', C), 200).rows[0].suggestion.bonusStatus], [1, 'APPROVED'])

  // رفض المكافآت بيرجّع الاقتراح: المدير اتغيّر بعد الاقتراح ← المدير القديم برّه النطاق
  await repo('Employee').update({ id: emps.lone.id }, { managerEmployeeId: emps.boss.id })
  assert.equal(expectStatus(await request(users.hrA, 'POST', C, { bonusTypeId: state.type, targetPeriod: '2026-12', values: { A: '500' } }), 200).created, 1)
  const lone = await repo('ReviewRewardSuggestion').findOneByOrFail({ assignmentId: state.lone })
  await repo('Employee').update({ id: emps.lone.id }, { managerEmployeeId: emps.other.id })
  const refused = await submit(users.boss, lone.id)
  assert.deepEqual([refused.status, refused.body.code, (await repo('ReviewRewardSuggestion').findOneByOrFail({ id: lone.id })).status, await repo('BonusRequest').count({ where: { employeeId: emps.lone.id } })],
    [403, 'BONUS_OUT_OF_SCOPE', 'SUGGESTED', 0])
  // صرف النظر: إدارة الأداء في نطاقها (مش فرع تاني ولا حد غريب)، ومرة واحدة — وبعده الاقتراح يتعمل من جديد للمدير الحالي
  assert.deepEqual([answer(await request(users.hrB, 'POST', R + `/${lone.id}/dismiss`)), answer(await request(users.rep, 'POST', R + `/${lone.id}/dismiss`))], [[404, rewards.REWARD_NOT_FOUND], [404, rewards.REWARD_NOT_FOUND]])
  expectStatus(await request(users.hrA, 'POST', R + `/${lone.id}/dismiss`), 200)
  assert.deepEqual([answer(await request(users.hrA, 'POST', R + `/${lone.id}/dismiss`)), answer(await submit(users.boss, lone.id)), answer(await request(users.hrA, 'POST', R + `/${state.repSuggestion}/dismiss`))],
    [[409, rewards.REWARD_TAKEN], [409, rewards.REWARD_TAKEN], [409, rewards.REWARD_TAKEN]])
  assert.equal(expectStatus(await request(users.hrA, 'POST', C, { bonusTypeId: state.type, targetPeriod: '2026-12', values: { A: '500' } }), 200).created, 1)
  const fresh = expectStatus(await request(users.other, 'GET', R + '/mine'), 200).suggestions
  assert.deepEqual(fresh.map(row => [row.employeeName, row.status]), [['ممتاز من غير مدير', 'SUGGESTED']])
  // المدير نفسه بيصرف النظر عن اقتراح موجّه له
  expectStatus(await request(users.other, 'POST', R + `/${fresh[0].id}/dismiss`), 200)
  assert.deepEqual(expectStatus(await request(users.other, 'GET', R + '/mine'), 200).suggestions, [])
  // موديول الأداء مقفول: المسارات مقفولة
  expectStatus(await request(users.admin, 'PUT', '/modules/performance', { enabled: false }), 200); modules.invalidate()
  try {
    assert.deepEqual([(await request(users.boss, 'GET', R + '/mine')).status, (await request(users.hrA, 'GET', C)).status], [404, 404])
  } finally { expectStatus(await request(users.admin, 'PUT', '/modules/performance', { enabled: true }), 200); modules.invalidate() }
})

test('RW-03: طلب المكافأة ثبت والرد وقع — الاقتراح بيتربط بطلبه، وإعادة المحاولة مابتعملش طلب تاني حتى لو فحص التكرار مقفول', async () => {
  const C = R + '/cycles/' + state.cycle
  const submit = (user, id) => request(user, 'POST', R + `/${id}/submit`)
  const bonuses = () => repo('BonusRequest').count({ where: { employeeId: emps.lone.id } })
  assert.equal(expectStatus(await request(users.hrA, 'POST', C, { bonusTypeId: state.type, targetPeriod: '2026-12', values: { A: '500' } }), 200).created, 1)
  const row = expectStatus(await request(users.other, 'GET', R + '/mine'), 200).suggestions.find(entry => entry.status === 'SUGGESTED')
  // فحص التكرار في المكافآت مقفول (إعداد مسموح): مفتاح عدم التكرار هو علامة الاقتراح نفسها
  await repo('RequestsConfig').save({ key: 'bonuses.duplicate_window_hours', value: '0' })
  const service = app.get(require('../src/performance/review-rewards.service').ReviewRewardsService)
  const original = service.bonuses.create
  let calls = 0
  const before = await bonuses()
  let firstId
  // (1) الطلب بيتحفظ وبعدها القراءة بتقع: الرد كان بيرجّع الاقتراح «مقترح» من غير رابط
  service.bonuses.create = async function (...args) { calls += 1; await original.apply(this, args); throw new Error('read failed after commit') }
  try {
    const done = expectStatus(await submit(users.other, row.id), 200)
    firstId = done.bonusRequestId
    const stored = await repo('ReviewRewardSuggestion').findOneByOrFail({ id: row.id })
    const bonus = await repo('BonusRequest').findOneByOrFail({ id: firstId })
    assert.deepEqual([calls, stored.status, stored.bonusRequestId, await bonuses(), bonus.reason.endsWith(rewards.rewardMarker(row.id)), bonus.employeeId], [1, 'SUBMITTED', firstId, before + 1, true, emps.lone.id])
    assert.deepEqual([answer(await submit(users.other, row.id)), calls, await bonuses()], [[409, rewards.REWARD_TAKEN], 1, before + 1])
  } finally { service.bonuses.create = original }
  const reset = () => repo('ReviewRewardSuggestion').update({ id: row.id }, { status: 'SUGGESTED', bonusRequestId: null, decidedByUserId: null, decidedAt: null })
  const stored = () => repo('ReviewRewardSuggestion').findOneByOrFail({ id: row.id })
  const canSubmit = async () => expectStatus(await request(users.other, 'GET', R + '/mine'), 200).suggestions.find(entry => entry.id === row.id).canSubmit
  const latch = () => { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }
  // (2) Codex P3L-B03 (R02): العلامة في السبب مش مرجع — طلب قديم من نفس المدير شايل علامة الاقتراح مابيتربطش: الاقتراح بيتعمل له طلبه هو بقيمته
  await reset()
  service.bonuses.create = async function (...args) { calls += 1; return original.apply(this, args) }
  try {
    const second = expectStatus(await submit(users.other, row.id), 200)
    const made = await repo('BonusRequest').findOneByOrFail({ id: second.bonusRequestId })
    assert.deepEqual([second.bonusRequestId !== firstId, Number(made.inputValue), calls, await bonuses(), (await stored()).bonusRequestId], [true, 500, 2, before + 2, second.bonusRequestId])
  } finally { service.bonuses.create = original }
  // (3) Codex P3L-B04 (R03): كتابة الربط فشلت بعد حفظ الطلب — الطلب نفسه بيرجع (معاملة واحدة)، والحجز بيتفك، والإعادة بتنجح بطلب واحد
  await reset()
  let failures = 0
  service.bonuses.create = async function (user, dto, hooks) {
    return original.call(this, user, dto, { afterSave: async (em, id) => { await hooks.afterSave(em, id); if (!failures++) throw new Error('link write failed') } })
  }
  try {
    const broken = await submit(users.other, row.id)
    assert.deepEqual([broken.status, (await stored()).status, (await stored()).bonusRequestId, await bonuses(), await canSubmit()], [500, 'SUGGESTED', null, before + 2, true], 'الطلب رجع مع فشل ربطه')
    const retried = expectStatus(await submit(users.other, row.id), 200)
    assert.deepEqual([(await stored()).status, (await stored()).bonusRequestId, await bonuses()], ['SUBMITTED', retried.bonusRequestId, before + 3])
  } finally { service.bonuses.create = original }
  // (4) حجز اتقطع (الخادم وقع قبل الربط والفك): الجاري بيرفض، والقديم بيتاخد بعد المدة
  await repo('ReviewRewardSuggestion').update({ id: row.id }, { status: 'CLAIMED', bonusRequestId: null, decidedByUserId: users.other.id, decidedAt: new Date() })
  assert.deepEqual([answer(await submit(users.other, row.id)), await canSubmit(), await bonuses()], [[409, rewards.REWARD_TAKEN], false, before + 3])
  await repo('ReviewRewardSuggestion').update({ id: row.id }, { decidedAt: new Date(Date.now() - (rewards.REWARD_CLAIM_MINUTES + 1) * 60000) })
  assert.equal(await canSubmit(), true)
  const taken = expectStatus(await submit(users.other, row.id), 200)
  assert.deepEqual([(await stored()).status, (await stored()).bonusRequestId, await bonuses()], ['SUBMITTED', taken.bonusRequestId, before + 4])
  // (5) محاولة اتأخرت لحد ما حجزها اتاخد: طلبها بيرجع (ربطها مشروط بحجزها هي) — طلب واحد للاقتراح
  await reset()
  const entered = latch(), release = latch()
  let hit = false
  service.bonuses.create = async function (...args) { if (!hit) { hit = true; entered.resolve(); await release.promise } return original.apply(this, args) }
  try {
    const late = submit(users.other, row.id)
    await entered.promise
    await repo('ReviewRewardSuggestion').update({ id: row.id }, { decidedAt: new Date(Date.now() - (rewards.REWARD_CLAIM_MINUTES + 1) * 60000) })
    const winner = expectStatus(await submit(users.other, row.id), 200)
    release.resolve()
    const lost = await late
    assert.deepEqual([answer(lost), (await stored()).status, (await stored()).bonusRequestId, await bonuses()], [[409, rewards.REWARD_TAKEN], 'SUBMITTED', winner.bonusRequestId, before + 5])
  } finally { release.resolve(); service.bonuses.create = original }
})
