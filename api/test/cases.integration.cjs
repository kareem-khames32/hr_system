'use strict'
// B3.11: ملفات القضايا على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر (hr_cases_test_<16 hex>)، عبر HTTP بتوكنات موقّعة محليًا ومن غير كلمات مرور.
// ولا رسالة بريد حقيقية.
//  CS-01) السرية وتعارض المصالح: الموديول مقفول افتراضيًا؛ فتح قضية بالصلاحية وبموظفين نطاق الحساب؛ الملف للمطّلعين عليه بس (صاحب الصلاحية
//         اللي مش متضاف = غير موجودة، ومفيش قايمة عامة)؛ والمشكو في حقه أو مديره المباشر مايتضافوش مطّلعين ولا محققين.
//  CS-02) الدورة: محقق ← إخطار ومحضر دفاع ← أدلة وجلسات ← قرار (غير الحفظ مابيعدّيش من غير إخطار ودفاع) ← إقفال؛ والطرف بيشوف اللي له بس
//         (الشاكي حالة شكواه؛ المشكو في حقه بعد إخطاره)؛ والاعتراض في المهلة ومرة واحدة وبيرجّع المقفولة للمراجعة.
//  CS-03) من الطلب: «شكوى» بوجهة «فتح ملف قضية» ← الاعتماد النهائي بيفتح ملف واحد: مقدّم الطلب شاكي، والمعتمد أول مطّلع.
//  CS-05) (CRP3K / Codex P3K-B11) المطّلع شخص مش حساب: حساب اتغيّر ربطه (للمشكو في حقه أو لأي موظف تاني) مابقاش مطّلع في أي باب، وتعارض
//         المصالح بيتعاد بالهوية الحالية، وإضافته من جديد بقرار مطّلع.
// Run (من api/): node --test test/cases.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_cases_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_cases_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-cases-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/cases/case-rules')
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
const employee = (extra = {}) => repo('Employee').save({ employeeCode: `CS${String(++employeeNumber).padStart(3, '0')}`, fullName: `موظف القضايا ${employeeNumber}`, branchId: org.branchA.id,
  joinDate: '2020-01-01', basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'cash', ...extra })
const account = (label, permissions, extra = {}) => repo('User').save({ email: `${label}@cases.invalid`, displayName: `حساب ${label}`, passwordHash: 'test-only',
  role: 'employee', branchId: org.branchA.id, permissions: JSON.stringify(permissions), isActive: true, ...extra })
const C = '/cases'
const post = (user, id, step, body) => request(user, 'POST', `${C}/${id}/${step}`, body)

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

  org.branchA = await repo('Branch').save({ code: 'CS_A', name: 'فرع القضايا أ', country: 'SA' })
  org.branchB = await repo('Branch').save({ code: 'CS_B', name: 'فرع القضايا ب', country: 'SA' })
  emps.boss = await employee({ fullName: 'مدير المشكو في حقه' })
  emps.accused = await employee({ fullName: 'المشكو في حقه', managerEmployeeId: emps.boss.id })
  emps.victim = await employee({ fullName: 'الشاكي' })
  emps.witness = await employee({ fullName: 'الشاهد' })
  emps.officer = await employee({ fullName: 'محقق مستقل' })
  emps.hrLead = await employee({ fullName: 'مسؤول الموارد البشرية' })
  emps.b1 = await employee({ fullName: 'موظف فرع ب', branchId: org.branchB.id })
  users.admin = await repo('User').save({ email: 'admin@cases.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', branchId: null,
    scopeAllBranches: true, permissions: '[]', isActive: true })
  users.hr = await account('hr', ['cases.investigate'], { employeeId: emps.hrLead.id })
  users.hrOther = await account('hr-other', ['cases.investigate'])
  users.officer = await account('officer', [], { employeeId: emps.officer.id })
  users.boss = await account('boss', ['cases.investigate'], { employeeId: emps.boss.id })
  users.accused = await account('accused', [], { employeeId: emps.accused.id })
  users.victim = await account('victim', [], { employeeId: emps.victim.id })
  users.witness = await account('witness', [], { employeeId: emps.witness.id })
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

test('CS-01: السرية وتعارض المصالح — فتح قضية بالصلاحية، والملف للمطّلعين عليه بس، والمشكو في حقه أو مديره مايتضافوش', async () => {
  assert.deepEqual([(await request(users.hr, 'GET', C)).status, (await request(users.victim, 'GET', C + '/mine')).status], [404, 404], 'مقفول لحد ما الشركة تفتحه')
  expectStatus(await request(users.admin, 'PUT', '/modules/cases', { enabled: true }), 200); modules.invalidate()
  const body = (extra = {}) => ({ kind: 'COMPLAINT', title: 'شكوى سوء معاملة', description: 'تفاصيل الشكوى', complainantEmployeeId: emps.victim.id, respondentEmployeeId: emps.accused.id, ...extra })
  assert.deepEqual([(await request(users.officer, 'POST', C, body())).status, (await request(users.victim, 'POST', C, body())).status], [403, 403])
  for (const [change, message] of [[{ kind: 'X' }, rules.CASE_KIND], [{ title: 'اب' }, rules.CASE_TITLE], [{ description: 'ن'.repeat(10001) }, rules.CASE_TEXT], [{ respondentEmployeeId: emps.b1.id }, rules.CASE_EMPLOYEE],
    [{ complainantEmployeeId: 987654 }, rules.CASE_EMPLOYEE]]) assert.deepEqual(answer(await request(users.hr, 'POST', C, body(change))), [400, message], JSON.stringify(change).slice(0, 60))
  // مدير المشكو في حقه مايفتحش قضيته (هيبقى مطّلع عليها): تعارض مصالح — ومفيش حاجة اتكتبت
  assert.deepEqual([answer(await request(users.boss, 'POST', C, body())), await repo('HrCase').count()], [[400, rules.CASE_CONFLICT], 0])
  const opened = expectStatus(await request(users.hr, 'POST', C, body({ title: '  شكوى   سوء معاملة ' })), 201)
  assert.deepEqual([opened.title, opened.kindLabel, opened.status, opened.statusLabel, opened.parties.map(row => [row.roleLabel, row.employeeName]), opened.handlers.map(row => [row.name, row.investigator]), opened.events],
    ['شكوى سوء معاملة', 'شكوى', 'OPEN', 'مفتوحة', [['شاكي', 'الشاكي'], ['مشكو في حقه', 'المشكو في حقه']], [['حساب hr', false]], []])
  state.id = opened.id
  // الملف للمطّلعين عليه بس: صاحب الصلاحية اللي مش متضاف، ومدير النظام، والأطراف = غير موجودة؛ وقايمته فاضية
  for (const stranger of [users.hrOther, users.admin, users.victim, users.accused, users.boss, users.officer]) {
    assert.deepEqual([answer(await request(stranger, 'GET', `${C}/${opened.id}`)), answer(await post(stranger, opened.id, 'events', { kind: 'NOTE', body: 'محاولة' })), expectStatus(await request(stranger, 'GET', C), 200).cases],
      [[404, rules.CASE_NOT_FOUND], [404, rules.CASE_NOT_FOUND], []], stranger.email)
  }
  const mine = expectStatus(await request(users.hr, 'GET', C), 200)
  assert.deepEqual([mine.canOpen, mine.cases.map(row => [row.id, row.statusLabel, row.investigating]), expectStatus(await request(users.officer, 'GET', C), 200).canOpen], [true, [[opened.id, 'مفتوحة', false]], false])
  // تعارض المصالح: المشكو في حقه ومديره المباشر مايتضافوش مطّلعين ولا محققين؛ وموظف من غير حساب أو برّه النطاق مايتضافش
  for (const blocked of [emps.accused.id, emps.boss.id]) {
    assert.deepEqual([answer(await post(users.hr, opened.id, 'handlers', { employeeId: blocked })), answer(await post(users.hr, opened.id, 'investigator', { employeeId: blocked }))],
      [[400, rules.CASE_CONFLICT], [400, rules.CASE_CONFLICT]], String(blocked))
  }
  assert.deepEqual([answer(await post(users.hr, opened.id, 'handlers', { employeeId: emps.b1.id })), answer(await post(users.hr, opened.id, 'handlers', { employeeId: 987654 }))],
    [[400, rules.CASE_EMPLOYEE], [400, rules.CASE_EMPLOYEE]])
  const lonely = await employee({ fullName: 'موظف من غير حساب' })
  assert.deepEqual(answer(await post(users.hr, opened.id, 'handlers', { employeeId: lonely.id })), [400, rules.CASE_HANDLER])
  assert.equal(await repo('HrCaseParty').count({ where: { caseId: opened.id, role: 'HANDLER' } }), 1, 'المرفوض ماكتبش حاجة')
  // إضافة مشكو في حقه تاني مديره من المطّلعين = تعارض برضه
  const reportOfHr = await employee({ fullName: 'مرؤوس مسؤول الموارد البشرية', managerEmployeeId: emps.hrLead.id })
  assert.deepEqual(answer(await post(users.hr, opened.id, 'parties', { employeeId: reportOfHr.id, role: 'RESPONDENT' })), [400, rules.CASE_CONFLICT])
  assert.deepEqual([answer(await post(users.hr, opened.id, 'parties', { employeeId: emps.witness.id, role: 'JUDGE' })), answer(await post(users.hr, opened.id, 'parties', { employeeId: emps.victim.id, role: 'COMPLAINANT' }))],
    [[400, rules.CASE_PARTY_ROLE], [400, rules.CASE_PARTY_EXISTS]])
  const withWitness = expectStatus(await post(users.hr, opened.id, 'parties', { employeeId: emps.witness.id, role: 'WITNESS' }), 200)
  assert.deepEqual(withWitness.parties.map(row => row.roleLabel), ['شاكي', 'مشكو في حقه', 'شاهد'])
})

test('CS-02: الدورة — محقق، إخطار ودفاع، قرار بشرطه، إقفال؛ والطرف شايف اللي له بس؛ والاعتراض في المهلة ومرة واحدة', async () => {
  const id = state.id
  // قبل المحقق: مفيش قرار؛ وتعيين محقق (بيبقى مطّلع) بيبدأ التحقيق
  assert.deepEqual(answer(await post(users.hr, id, 'decision', { outcome: 'DISMISSED', note: 'مفيش دليل' })), [400, rules.CASE_NO_INVESTIGATOR])
  const assigned = expectStatus(await post(users.hr, id, 'investigator', { employeeId: emps.officer.id }), 200)
  assert.deepEqual([assigned.status, assigned.investigatorName, assigned.handlers.map(row => [row.name, row.investigator]), assigned.events.map(row => [row.kindLabel, row.body])],
    ['INVESTIGATING', 'حساب officer', [['حساب hr', false], ['حساب officer', true]], [['تغيير حالة', 'تعيين محقق: حساب officer']]])
  assert.equal(expectStatus(await request(users.officer, 'GET', `${C}/${id}`), 200).title, 'شكوى سوء معاملة', 'المحقق بقى مطّلع')
  // الأطراف قبل الإخطار: الشاكي شايف حالة شكواه؛ المشكو في حقه والشاهد مش شايفين حاجة
  const seen = async user => expectStatus(await request(user, 'GET', C + '/mine'), 200).cases
  assert.deepEqual([(await seen(users.victim)).map(row => [row.id, row.roleLabel, row.title, row.statusLabel, row.outcomeLabel, row.notices, row.canObject]), await seen(users.accused), await seen(users.witness)],
    [[[id, 'شاكي', 'شكوى سوء معاملة', 'تحقيق', null, [], false]], [], []])
  // الأحداث: القيم، والإفادة والدفاع لأطراف القضية (والدفاع للمشكو في حقه)
  const event = (user, body) => post(user, id, 'events', body)
  for (const [body, message] of [[{ kind: 'DECISION', body: 'قرار' }, rules.CASE_EVENT_KIND], [{ kind: 'NOTE', body: '  ' }, rules.CASE_TEXT], [{ kind: 'STATEMENT', body: 'إفادة' }, rules.CASE_EVENT_PARTY],
    [{ kind: 'STATEMENT', body: 'إفادة', employeeId: emps.officer.id }, rules.CASE_EVENT_PARTY], [{ kind: 'DEFENSE', body: 'دفاع', employeeId: emps.victim.id }, rules.CASE_EVENT_PARTY]]) {
    assert.deepEqual(answer(await event(users.officer, body)), [400, message], JSON.stringify(body))
  }
  expectStatus(await event(users.officer, { kind: 'STATEMENT', body: 'شفت اللي حصل يوم 3', employeeId: emps.witness.id }), 200)
  expectStatus(await event(users.officer, { kind: 'EVIDENCE', body: 'رسايل متبادلة بتاريخ 3 أكتوبر' }), 200)
  // قرار غير الحفظ من غير إخطار ومحضر دفاع مرفوض
  assert.deepEqual(answer(await post(users.officer, id, 'decision', { outcome: 'WARNING', note: 'ثبتت المخالفة' })), [400, rules.CASE_DUE_PROCESS])
  expectStatus(await event(users.officer, { kind: 'NOTICE', body: 'منسوب إليك سوء معاملة زميل يوم 3 أكتوبر — احضر جلسة التحقيق' }), 200)
  assert.deepEqual(answer(await post(users.officer, id, 'decision', { outcome: 'WARNING', note: 'ثبتت المخالفة' })), [400, rules.CASE_DUE_PROCESS], 'إخطار من غير دفاع')
  // بعد الإخطار: المشكو في حقه شايف نص الإخطار بس (لا العنوان ولا الشاكي ولا الملف)
  const noticed = (await seen(users.accused))[0]
  assert.deepEqual([noticed.id, noticed.roleLabel, noticed.title, noticed.notices.map(row => row.body), noticed.statusLabel, noticed.outcomeLabel, noticed.canObject],
    [id, 'مشكو في حقه', null, ['منسوب إليك سوء معاملة زميل يوم 3 أكتوبر — احضر جلسة التحقيق'], 'تحقيق', null, false])
  assert.equal(JSON.stringify(noticed).includes('الشاكي'), false)
  assert.equal((await request(users.accused, 'GET', `${C}/${id}`)).status, 404, 'الملف نفسه للمطّلعين بس')
  expectStatus(await event(users.officer, { kind: 'DEFENSE', body: 'ماقصدتش، وكان سوء تفاهم', employeeId: emps.accused.id }), 200)
  expectStatus(await event(users.officer, { kind: 'SESSION', body: 'محضر جلسة 5 أكتوبر: حضر الطرفين' }), 200)
  // الاعتراض قبل القرار مرفوض
  assert.deepEqual(answer(await post(users.accused, id, 'objection', { reason: 'معترض' })), [400, rules.CASE_NOT_DECIDED])
  for (const [body, message] of [[{ outcome: 'JAIL', note: 'x y z' }, rules.CASE_OUTCOME], [{ outcome: 'WARNING' }, rules.CASE_TEXT]]) assert.deepEqual(answer(await post(users.officer, id, 'decision', body)), [400, message])
  const decided = expectStatus(await post(users.officer, id, 'decision', { outcome: 'WARNING', note: 'ثبتت المخالفة — إنذار كتابي' }), 200)
  assert.deepEqual([decided.status, decided.outcome, decided.outcomeLabel, decided.outcomeNote, decided.events.at(-1).kindLabel, decided.events.at(-1).body],
    ['DECIDED', 'WARNING', 'إنذار', 'ثبتت المخالفة — إنذار كتابي', 'قرار', 'إنذار: ثبتت المخالفة — إنذار كتابي'])
  assert.deepEqual(decided.events.map(row => row.kind), ['STATUS', 'STATEMENT', 'EVIDENCE', 'NOTICE', 'DEFENSE', 'SESSION', 'DECISION'])
  // الشاكي شايف النتيجة من غير تفاصيلها؛ والمشكو في حقه شايف القرار وله مهلة اعتراض
  const victimView = (await seen(users.victim))[0], accusedView = (await seen(users.accused))[0]
  assert.deepEqual([victimView.statusLabel, victimView.outcomeLabel, victimView.outcomeNote, victimView.canObject], ['اتقرر فيها', 'إنذار', null, false])
  assert.deepEqual([accusedView.outcomeLabel, accusedView.outcomeNote, accusedView.canObject, Math.round((new Date(accusedView.objectionUntil) - Date.now()) / 86400000)], ['إنذار', 'ثبتت المخالفة — إنذار كتابي', true, rules.CASE_OBJECTION_DEFAULT])
  // الإقفال، وبعده مفيش إضافة
  assert.equal(expectStatus(await post(users.hr, id, 'close'), 200).status, 'CLOSED')
  assert.deepEqual([answer(await post(users.hr, id, 'close')), answer(await event(users.officer, { kind: 'NOTE', body: 'بعد الإقفال' })), answer(await post(users.hr, id, 'parties', { employeeId: emps.officer.id, role: 'WITNESS' }))],
    [[400, rules.CASE_CLOSED], [400, rules.CASE_CLOSED], [400, rules.CASE_CLOSED]])
  // الاعتراض: المشكو في حقه بس (غيره = غير موجودة)، في المهلة، ومرة واحدة — وبيرجّع المقفولة للمراجعة
  for (const stranger of [users.victim, users.witness, users.hr]) assert.deepEqual(answer(await post(stranger, id, 'objection', { reason: 'معترض' })), [404, rules.CASE_NOT_FOUND], stranger.email)
  assert.equal((await post(users.accused, id, 'objection', {})).status, 400)
  const objected = expectStatus(await post(users.accused, id, 'objection', { reason: 'الإنذار قاسي على سوء تفاهم' }), 200).cases[0]
  assert.deepEqual([objected.objected, objected.canObject, objected.statusLabel], [true, false, 'اتقرر فيها'])
  assert.deepEqual(answer(await post(users.accused, id, 'objection', { reason: 'تاني' })), [409, rules.CASE_OBJECTED])
  const reviewed = expectStatus(await request(users.officer, 'GET', `${C}/${id}`), 200)
  assert.deepEqual([reviewed.status, reviewed.events.at(-1).kindLabel, reviewed.events.at(-1).employeeName, reviewed.events.at(-1).body], ['DECIDED', 'اعتراض', 'المشكو في حقه', 'الإنذار قاسي على سوء تفاهم'])
  // المهلة إعداد: بعد ما تعدّي مفيش اعتراض
  const second = expectStatus(await request(users.hr, 'POST', C, { kind: 'VIOLATION', title: 'مخالفة لائحة', respondentEmployeeId: emps.accused.id }), 201).id
  expectStatus(await post(users.hr, second, 'investigator', { employeeId: emps.officer.id }), 200)
  expectStatus(await post(users.officer, second, 'events', { kind: 'NOTICE', body: 'إخطار' }), 200)
  expectStatus(await post(users.officer, second, 'decision', { outcome: 'DISMISSED', note: 'مفيش دليل كفاية' }), 200)
  await repo('HrCase').update({ id: second }, { decidedAt: new Date(Date.now() - 8 * 86400000) })
  assert.deepEqual([answer(await post(users.accused, second, 'objection', { reason: 'معترض' })), (await seen(users.accused)).find(row => row.id === second).canObject], [[400, rules.CASE_OBJECTION_LATE], false])
  await repo('RequestsConfig').save({ key: rules.CASE_OBJECTION_KEY, value: '30' })
  assert.equal((await seen(users.accused)).find(row => row.id === second).canObject, true)
  // الموديول لما يتقفل المسارات بتتقفل
  expectStatus(await request(users.admin, 'PUT', '/modules/cases', { enabled: false }), 200); modules.invalidate()
  try { assert.deepEqual([(await request(users.officer, 'GET', `${C}/${id}`)).status, (await request(users.accused, 'GET', C + '/mine')).status], [404, 404]) }
  finally { expectStatus(await request(users.admin, 'PUT', '/modules/cases', { enabled: true }), 200); modules.invalidate() }
})

test('CS-03: من الطلب — «شكوى» بوجهة «فتح ملف قضية»: الاعتماد النهائي بيفتح ملف واحد، مقدّم الطلب شاكي والمعتمد أول مطّلع', async () => {
  const links = require('../src/cases/case-requests')
  const chain = await repo('ApprovalChain').save({ code: 'CS_HR', nameAr: 'سلسلة الشكاوى', isActive: true, autoApprove: false })
  await repo('ApprovalStep').save({ chainId: chain.id, stepOrder: 1, approverRole: 'hr' })
  await repo('RequestType').save({ code: 'GRIEVANCE', nameAr: 'تظلم/شكوى', category: 'employee_relations', destinationHandler: links.CASE_REQUEST_HANDLER, approvalChainId: chain.id, isActive: true, isConfidential: true,
    requiredFields: JSON.stringify(['reason']) })
  users.approver = await account('approver', ['approve.hr', 'requests.view_all'])
  const sent = expectStatus(await request(users.victim, 'POST', '/requests', { typeCode: 'GRIEVANCE', payload: { reason: 'مديري بيتعمّد يأخّر إجازاتي' }, submit: true }), 201)
  assert.equal(await repo('HrCase').count({ where: { requestId: sent.id } }), 0, 'التقديم مابيفتحش قضية')
  expectStatus(await request(users.approver, 'POST', `/requests/${sent.id}/act`, { action: 'APPROVE' }), 201)
  const opened = await repo('HrCase').findOneByOrFail({ requestId: sent.id })
  const done = await repo('Request').findOneByOrFail({ id: sent.id })
  assert.deepEqual([opened.kind, opened.title, opened.description, opened.status, opened.openedByUserId, done.status, done.destinationRef],
    ['COMPLAINT', 'تظلم/شكوى', 'مديري بيتعمّد يأخّر إجازاتي', 'OPEN', 0, 'COMPLETED', `CASE-${opened.id}`])
  assert.deepEqual((await repo('HrCaseParty').find({ where: { caseId: opened.id }, order: { id: 'ASC' } })).map(row => [row.role, row.userId, row.employeeId]),
    [['HANDLER', users.approver.id, null], ['COMPLAINANT', null, emps.victim.id]])
  // المعتمد هو المطّلع؛ وصاحب الصلاحية التاني مش شايفها؛ والشاكي شايف حالتها
  const file = expectStatus(await request(users.approver, 'GET', `${C}/${opened.id}`), 200)
  assert.deepEqual([file.fromRequest, file.parties.map(row => [row.roleLabel, row.employeeName]), file.handlers.map(row => row.name)], [true, [['شاكي', 'الشاكي']], ['حساب approver']])
  assert.equal((await request(users.hr, 'GET', `${C}/${opened.id}`)).status, 404)
  assert.ok(expectStatus(await request(users.victim, 'GET', C + '/mine'), 200).cases.some(row => row.id === opened.id && row.statusLabel === 'مفتوحة'))
  // الموديول مقفول: نوع الطلب بالوجهة دي مابيظهرش في التقديم
  expectStatus(await request(users.admin, 'PUT', '/modules/cases', { enabled: false }), 200); modules.invalidate()
  try { assert.equal(expectStatus(await request(users.victim, 'GET', '/requests/types'), 200).some(row => row.code === 'GRIEVANCE'), false) }
  finally { expectStatus(await request(users.admin, 'PUT', '/modules/cases', { enabled: true }), 200); modules.invalidate() }
})

// ملف PNG صغير حقيقي (فحص نوع الملف بيقرا المحتوى)
function png(shade = 255) {
  const zlib = require('node:zlib')
  const chunk = (kind, data) => {
    const length = Buffer.alloc(4); length.writeUInt32BE(data.length)
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(Buffer.concat([Buffer.from(kind), data])) >>> 0)
    return Buffer.concat([length, Buffer.from(kind), data, crc])
  }
  const header = Buffer.alloc(13); header.writeUInt32BE(1, 0); header.writeUInt32BE(1, 4); header[8] = 8; header[9] = 2
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(Buffer.from([0, shade, 0, 0]))), chunk('IEND', Buffer.alloc(0))])
}
async function upload(user, search = 'entityType=case', bytes = png()) {
  const form = new FormData()
  form.append('file', new Blob([bytes], { type: 'image/png' }), 'evidence.png')
  const response = await fetch(`${base}/files/upload?${search}`, { method: 'POST', headers: { Authorization: `Bearer ${jwt.sign(payloadOf(user))}` }, body: form })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const download = async (user, fileId) => (await fetch(`${base}/files/${fileId}`, { headers: { Authorization: `Bearer ${jwt.sign(payloadOf(user))}` } })).status

test('CS-04: مرفق الدليل — رفعه للمطّلعين على قضية بس، وبيتربط بحدثه تحت قفل القضية مرة واحدة، وتحميله بحكم القضية نفسها (حتى لرافعه)', async () => {
  // قضية جديدة مفتوحة للمرفقات: مطّلعها الموارد البشرية بس
  const id = expectStatus(await request(users.hr, 'POST', C, { kind: 'OTHER', title: 'قضية المرفقات', respondentEmployeeId: emps.accused.id }), 201).id
  // الرفع: للمطّلع على قضية بس؛ ومن غير رقم كيان ولا موظف
  assert.deepEqual([(await upload(users.victim)).status, (await upload(users.accused)).status, (await upload(users.hrOther)).status, (await upload(users.hr, `entityType=case&entityId=${id}`)).status,
    (await upload(users.hr, `entityType=case&employeeId=${emps.accused.id}`)).status], [403, 403, 403, 400, 400])
  const fileId = expectStatus(await upload(users.hr), 201).id
  const stored = await repo('StoredFile').findOneByOrFail({ id: fileId })
  assert.deepEqual([stored.entityType, stored.entityId ?? null, stored.employeeId ?? null, stored.uploadedBy], ['case', null, null, users.hr.id], 'مش تبع موظف، ولسه مااتربطش')
  // قبل الربط: لرافعه بس
  assert.deepEqual([await download(users.hr, fileId), await download(users.officer, fileId), await download(users.admin, fileId), await download(users.accused, fileId)], [200, 404, 404, 404])
  // الربط بحدث: ملف «قضية» رفعه الحساب نفسه ولسه مااتربطش
  const other = expectStatus(await upload(users.approver), 201).id
  const plain = expectStatus(await upload(users.hr, 'entityType=request'), 201).id
  for (const bad of [other, plain, 987654, 'x']) assert.deepEqual(answer(await post(users.hr, id, 'events', { kind: 'EVIDENCE', body: 'صورة المحادثة', fileId: bad })), [400, rules.CASE_ATTACHMENT_INVALID], String(bad))
  assert.equal(await repo('HrCaseEvent').count({ where: { caseId: id } }), 0, 'المرفوض ماكتبش حدث')
  const attached = expectStatus(await post(users.hr, id, 'events', { kind: 'EVIDENCE', body: 'صورة المحادثة', fileId }), 200)
  assert.deepEqual([attached.events.at(-1).file, (await repo('StoredFile').findOneByOrFail({ id: fileId })).entityId], [{ id: fileId, name: 'evidence.png' }, id])
  // الملف مايتربطش مرتين (ولا بقضية تانية)
  assert.deepEqual(answer(await post(users.hr, id, 'events', { kind: 'NOTE', body: 'تاني', fileId })), [400, rules.CASE_ATTACHMENT_INVALID])
  // التحميل بحكم القضية: المطّلعين عليها بس — والمحقق لما يتضاف بيشوف؛ وصاحب الصلاحية التاني ومدير النظام والأطراف لأ
  assert.deepEqual([await download(users.hr, fileId), await download(users.officer, fileId), await download(users.hrOther, fileId), await download(users.admin, fileId), await download(users.accused, fileId)],
    [200, 404, 404, 404, 404])
  expectStatus(await post(users.hr, id, 'investigator', { employeeId: emps.officer.id }), 200)
  assert.equal(await download(users.officer, fileId), 200)
  // الموديول مقفول: لا رفع ولا تحميل
  expectStatus(await request(users.admin, 'PUT', '/modules/cases', { enabled: false }), 200); modules.invalidate()
  try { assert.deepEqual([(await upload(users.hr)).status, await download(users.hr, fileId)], [403, 404]) }
  finally { expectStatus(await request(users.admin, 'PUT', '/modules/cases', { enabled: true }), 200); modules.invalidate() }
})

test('CS-05: المطّلع شخص مش حساب — حساب اتغيّر ربطه مابقاش مطّلع، والتعارض بالهوية الحالية، والإضافة من جديد بقرار مطّلع', async () => {
  const handlerEmp = await employee({ fullName: 'مطّلع هيتغيّر ربطه' }), respondent = await employee({ fullName: 'مشكو في حقه تاني' })
  const complainant = await employee({ fullName: 'SECRET-COMPLAINANT شاكي سري' }), stranger = await employee({ fullName: 'موظف تالت' })
  let handler = await account('handler5', ['cases.investigate'], { employeeId: handlerEmp.id })
  const made = expectStatus(await request(handler, 'POST', C, { kind: 'VIOLATION', title: 'بلاغ سري', description: 'تفاصيل سرية', complainantEmployeeId: complainant.id, respondentEmployeeId: respondent.id }), 201)
  const membership = () => repo('HrCaseParty').findOneByOrFail({ caseId: made.id, role: 'HANDLER', userId: handler.id })
  assert.equal((await membership()).employeeId, handlerEmp.id, 'العضوية متسجّلة بموظف الحساب')
  // تغيير ربط الحساب (التوكن الجديد شايل الموظف الجديد)
  const relink = async employeeId => { await repo('User').update({ id: handler.id }, { employeeId }); handler = await repo('User').findOneByOrFail({ id: handler.id }) }
  const doors = async () => {
    const read = await request(handler, 'GET', `${C}/${made.id}`)
    return [read.status, JSON.stringify(read.body).includes('SECRET-COMPLAINANT'), expectStatus(await request(handler, 'GET', C), 200).cases.some(row => row.id === made.id),
      (await post(handler, made.id, 'events', { kind: 'NOTICE', body: 'إخطار' })).status === 404, (await post(handler, made.id, 'handlers', { employeeId: emps.officer.id })).status === 404]
  }
  const open = [200, true, true, false, false], closed = [404, false, false, true, true]
  assert.deepEqual(await doors(), open)

  // الحساب بقى للمشكو في حقه: ولا باب (قراءة، قايمة، كتابة، إضافة مطّلع) — ومدير النظام اللي مش متضاف زي ما هو
  await relink(respondent.id)
  assert.deepEqual([await doors(), (await request(users.admin, 'GET', `${C}/${made.id}`)).status], [closed, 404])
  // ولأي موظف تاني مالوش علاقة بالقضية: برضه مش مطّلع — العضوية للشخص اللي اتضاف
  await relink(stranger.id)
  assert.deepEqual(await doors(), closed)
  // رجع لصاحبه: مطّلع تاني بنفس الصف
  await relink(handlerEmp.id)
  assert.deepEqual((await doors()).slice(0, 3), [200, true, true])

  // تعارض المصالح بالهوية الحالية: المطّلع بقى المدير المباشر للمشكو في حقه
  await repo('Employee').update({ id: respondent.id }, { managerEmployeeId: handlerEmp.id })
  assert.deepEqual((await doors()).slice(0, 3), [404, false, false])
  await repo('Employee').update({ id: respondent.id }, { managerEmployeeId: null })
  assert.equal((await request(handler, 'GET', `${C}/${made.id}`)).status, 200)

  // مطّلع تاني بيضيف الحساب بهويته الجديدة: الصف بيتحدّث بموظفه الحالي ومابيتكررش؛ والصف القديم مابيوقّفش شغل باقي المطّلعين
  expectStatus(await post(handler, made.id, 'handlers', { employeeId: emps.hrLead.id }), 200)
  await relink(stranger.id)
  assert.equal((await request(handler, 'GET', `${C}/${made.id}`)).status, 404)
  expectStatus(await post(users.hr, made.id, 'events', { kind: 'NOTICE', body: 'إخطار من مطّلع تاني' }), 200)
  expectStatus(await post(users.hr, made.id, 'handlers', { employeeId: stranger.id }), 200)
  assert.deepEqual([(await membership()).employeeId, await repo('HrCaseParty').count({ where: { caseId: made.id, role: 'HANDLER', userId: handler.id } }), (await request(handler, 'GET', `${C}/${made.id}`)).status], [stranger.id, 1, 200])
  // صف مطّلع حسابه بقى للمشكو في حقه مابيوقّفش إضافة مطّلع جديد بسبب «تعارض»
  await relink(respondent.id)
  expectStatus(await post(users.hr, made.id, 'handlers', { employeeId: emps.officer.id }), 200)
  assert.equal((await request(handler, 'GET', `${C}/${made.id}`)).status, 404)
})
