'use strict'
// B3.13: الاستبيانات على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر (hr_surveys_test_<16 hex>)، عبر HTTP بتوكنات موقّعة محليًا ومن غير كلمات مرور.
// ولا رسالة بريد حقيقية.
//  SV-01) الإدارة: الموديول مقفول افتراضيًا؛ القيم (الأسئلة، الحد الأدنى، آخر يوم)؛ جمهور حساب الفروع؛ المسودة بتتعدّل والمفتوح لأ؛ والفتح بيعمل
//         دعوة لكل موظف حالي في الجمهور بمجموعته.
//  SV-02) السرية الحقيقية: الرد المجهول صف من غير موظف ولا ساعة ولا رابط بالدعوة (والدعوة باليوم بس)، ومن غير سطر تدقيق؛ مرة واحدة حتى مع
//         ضغطتين مع بعض؛ والنتايج: 4 ردود مابتعرضش، 6 بتعرض، ومجموعة أقل من الحد مابتظهرش ولا تتحسب بالطرح؛ والتعليقات بحدها.
//  SV-03) الاستبيان بالاسم بيسجّل الموظف؛ والمقفول واللي فات آخر يومه مابيتردّش عليهم.
// Run (من api/): node --test test/surveys.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_surveys_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_surveys_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-surveys-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/surveys/survey-rules')
const { localDateOf } = require('../src/attendance/attendance.service')
let app, master, ds, base, modules, created = false, employeeNumber = 0
const org = {}, users = {}, state = {}, d1 = [], d2 = []

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
const employee = (extra = {}) => repo('Employee').save({ employeeCode: `SV${String(++employeeNumber).padStart(3, '0')}`, fullName: `موظف الاستبيان ${employeeNumber}`, branchId: org.branchA.id,
  joinDate: '2020-01-01', basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'cash', ...extra })
const account = (label, permissions, extra = {}) => repo('User').save({ email: `${label}@surveys.invalid`, displayName: `حساب ${label}`, passwordHash: 'test-only',
  role: 'employee', branchId: org.branchA.id, permissions: JSON.stringify(permissions), isActive: true, ...extra })
/** موظف بحسابه */
async function member(extra) { const row = await employee(extra); return account(`m${row.id}`, [], { employeeId: row.id, branchId: row.branchId }) }
const questions = () => [{ label: 'راضي عن بيئة الشغل؟', type: 'rating' }, { label: 'ترشّح الشركة لصاحبك؟', type: 'enps' }, { label: 'أكتر حاجة محتاجة تتحسّن', type: 'choice', options: ['الرواتب', 'التدريب', 'المواصلات'] },
  { label: 'تعليقك', type: 'text', required: false }]
const branchAudience = branch => ({ mode: 'all', where: { mode: 'branches', ids: [branch.id] } })
const S = '/surveys'
const respond = (user, id, answers) => request(user, 'POST', `${S}/${id}/respond`, { answers })

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

  org.branchA = await repo('Branch').save({ code: 'SV_A', name: 'فرع الاستبيانات أ', country: 'SA' })
  org.branchB = await repo('Branch').save({ code: 'SV_B', name: 'فرع الاستبيانات ب', country: 'SA' })
  org.sales = await repo('Department').save({ name: 'قسم المبيعات', code: 'SV_SAL', branchId: org.branchA.id })
  org.support = await repo('Department').save({ name: 'قسم الدعم', code: 'SV_SUP', branchId: org.branchA.id })
  for (let index = 0; index < 6; index += 1) d1.push(await member({ departmentId: org.sales.id }))
  for (let index = 0; index < 4; index += 1) d2.push(await member({ departmentId: org.support.id }))
  users.b1 = await member({ branchId: org.branchB.id })
  await employee({ fullName: 'موظف منتهي', departmentId: org.sales.id, status: 'terminated', isActive: false })
  users.admin = await repo('User').save({ email: 'admin@surveys.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', branchId: null,
    scopeAllBranches: true, permissions: '[]', isActive: true })
  users.hr = await account('hr', ['surveys.manage'])
  users.hrB = await account('hr-b', ['surveys.manage'], { branchId: org.branchB.id })
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

test('SV-01: الإدارة — القيم وجمهور حساب الفروع، والمسودة بتتعدّل والمفتوح لأ، والفتح بيعمل دعوة لكل موظف حالي في الجمهور بمجموعته', async () => {
  assert.deepEqual([(await request(users.hr, 'GET', S)).status, (await request(d1[0], 'GET', S + '/mine')).status], [404, 404], 'مقفول لحد ما الشركة تفتحه')
  expectStatus(await request(users.admin, 'PUT', '/modules/surveys', { enabled: true }), 200); modules.invalidate()
  const body = (extra = {}) => ({ title: 'استبيان رضا الربع الأخير', kind: 'SATISFACTION', audience: branchAudience(org.branchA), questions: questions(), ...extra })
  assert.deepEqual([(await request(d1[0], 'GET', S)).status, (await request(d1[0], 'POST', S, body())).status], [403, 403])
  for (const [change, message] of [[{ title: 'اب' }, rules.SURVEY_TITLE], [{ kind: 'X' }, rules.SURVEY_KIND], [{ minGroup: 2 }, rules.SURVEY_MIN_GROUP], [{ minGroup: 51 }, rules.SURVEY_MIN_GROUP], [{ questions: [] }, rules.SURVEY_QUESTIONS],
    [{ questions: [{ label: 'ا', type: 'rating' }] }, rules.SURVEY_QUESTIONS], [{ questions: [{ label: 'سؤال', type: 'stars' }] }, rules.SURVEY_QUESTIONS], [{ questions: [{ label: 'سؤال', type: 'choice', options: ['واحد'] }] }, rules.SURVEY_QUESTIONS],
    [{ closeDate: '2020-01-01' }, rules.SURVEY_CLOSE_DATE], [{ closeDate: '2027-02-31' }, rules.SURVEY_CLOSE_DATE], [{ isAnonymous: 'yes' }, '«مجهول» نعم أو لا']]) {
    assert.deepEqual(answer(await request(users.hr, 'POST', S, body(change))), [400, message], JSON.stringify(change).slice(0, 60))
  }
  for (const audience of [null, branchAudience(org.branchB)]) assert.deepEqual(answer(await request(users.hr, 'POST', S, body({ audience }))), [403, rules.SURVEY_BRANCH_AUDIENCE], JSON.stringify(audience))
  assert.equal(await repo('Survey').count(), 0)
  const draft = expectStatus(await request(users.hr, 'POST', S, body({ title: '  استبيان   رضا الربع الأخير ' })), 201)
  assert.deepEqual([draft.title, draft.kindLabel, draft.isAnonymous, draft.minGroup, draft.status, draft.statusLabel, draft.invited, draft.questions.map(row => [row.key, row.type, row.required])],
    ['استبيان رضا الربع الأخير', 'رضا', true, 5, 'DRAFT', 'مسودة', 0, [['q1', 'rating', true], ['q2', 'enps', true], ['q3', 'choice', true], ['q4', 'text', false]]])
  state.id = draft.id
  // المسودة بتتعدّل بالخانات اللي اتبعتت؛ وفرع تاني مش شايفها
  const edited = expectStatus(await request(users.hr, 'PATCH', `${S}/${draft.id}`, { title: 'استبيان رضا فرع أ' }), 200)
  assert.deepEqual([edited.title, edited.questions.length, edited.minGroup], ['استبيان رضا فرع أ', 4, 5])
  assert.deepEqual([answer(await request(users.hrB, 'PATCH', `${S}/${draft.id}`, { title: 'تغيير' })), answer(await request(users.hrB, 'POST', `${S}/${draft.id}/open`)), expectStatus(await request(users.hrB, 'GET', S), 200).surveys],
    [[404, rules.SURVEY_NOT_FOUND], [404, rules.SURVEY_NOT_FOUND], []])
  // المسودة مالهاش دعوات ولا نتايج، والموظف مش شايفها
  assert.deepEqual([expectStatus(await request(d1[0], 'GET', S + '/mine'), 200).surveys, (await request(d1[0], 'GET', `${S}/${draft.id}`)).status, answer(await request(users.hr, 'GET', `${S}/${draft.id}/results`))],
    [[], 404, [400, rules.SURVEY_NOT_OPEN]])
  // الفتح: دعوة لكل موظف حالي في فرع أ (10) بقسمه وفرعه — من غير المنتهي وفرع ب
  const opened = expectStatus(await request(users.hr, 'POST', `${S}/${draft.id}/open`), 200)
  assert.deepEqual([opened.status, opened.invited, opened.responded], ['OPEN', 10, 0])
  const invitations = await repo('SurveyInvitation').find({ where: { surveyId: draft.id }, order: { id: 'ASC' } })
  assert.deepEqual([invitations.length, invitations.filter(row => row.departmentId === org.sales.id).length, invitations.filter(row => row.departmentId === org.support.id).length, invitations.every(row => row.branchId === org.branchA.id && row.respondedOn === null)],
    [10, 6, 4, true])
  assert.deepEqual([answer(await request(users.hr, 'POST', `${S}/${draft.id}/open`)), answer(await request(users.hr, 'PATCH', `${S}/${draft.id}`, { title: 'بعد الفتح' })), await repo('SurveyInvitation').count()],
    [[400, rules.SURVEY_NOT_DRAFT], [400, rules.SURVEY_NOT_DRAFT], 10])
  // جمهور من غير موظفين مابيتفتحش
  const empty = expectStatus(await request(users.admin, 'POST', S, body({ audience: { mode: 'employees', ids: ['987654'] } })), 201)
  assert.deepEqual(answer(await request(users.admin, 'POST', `${S}/${empty.id}/open`)), [400, rules.SURVEY_EMPTY_AUDIENCE])
})

test('SV-02: السرية الحقيقية — الرد المجهول من غير موظف ولا ساعة ولا رابط بالدعوة ولا سطر تدقيق، ومرة واحدة، والنتايج بالحد الأدنى ومن غير طرح', async () => {
  const id = state.id, today = localDateOf(new Date())
  const good = (rating = 4, enps = 9, choice = 'التدريب', text) => ({ q1: rating, q2: enps, q3: choice, ...(text ? { q4: text } : {}) })
  // «استبياناتي» والنموذج للمدعو بس
  const mine = expectStatus(await request(d1[0], 'GET', S + '/mine'), 200).surveys
  assert.deepEqual(mine.map(row => [row.id, row.title, row.isAnonymous, row.questionCount]), [[id, 'استبيان رضا فرع أ', true, 4]])
  assert.deepEqual([expectStatus(await request(users.b1, 'GET', S + '/mine'), 200).surveys, (await request(users.b1, 'GET', `${S}/${id}`)).status, answer(await respond(users.b1, id, good())), (await request(users.hr, 'GET', `${S}/${id}`)).status],
    [[], 404, [404, rules.SURVEY_NOT_FOUND], 404])
  const form = expectStatus(await request(d1[0], 'GET', `${S}/${id}`), 200)
  assert.deepEqual([form.isAnonymous, form.answered, form.open, form.questions[2].options], [true, false, true, ['الرواتب', 'التدريب', 'المواصلات']])
  // الإجابات: كل مطلوب، ومن نوعه، ومن غير مفتاح برّه الأسئلة — والمرفوض مابيكتبش ولا بيعلّم الدعوة
  for (const bad of [{}, { q1: 4, q2: 9 }, { ...good(), q1: 6 }, { ...good(), q1: 2.5 }, { ...good(), q2: 11 }, { ...good(), q3: 'حاجة تانية' }, { ...good(), q9: 1 }, { ...good(), q4: 'ت'.repeat(2001) }, 'نص']) {
    assert.deepEqual(answer(await respond(d1[0], id, bad)), [400, rules.SURVEY_ANSWERS], JSON.stringify(bad).slice(0, 60))
  }
  assert.deepEqual([await repo('SurveyResponse').count(), await repo('SurveyInvitation').count({ where: { surveyId: id } }) - (await repo('SurveyInvitation').find({ where: { surveyId: id } })).filter(row => row.respondedOn === null).length], [0, 0])
  const auditBefore = Number((await ds.query('SELECT COUNT(*) AS [n] FROM [audit_log]'))[0].n)
  assert.deepEqual(expectStatus(await respond(d1[0], id, good(5, 10, 'الرواتب', ' الرواتب محتاجة مراجعة ')), 200), { received: true })
  assert.deepEqual(answer(await respond(d1[0], id, good())), [409, rules.SURVEY_ANSWERED])
  // ضغطتين مع بعض: رد واحد
  const race = await Promise.all([respond(d1[1], id, good(4, 9)), respond(d1[1], id, good(1, 0))])
  assert.deepEqual([race.map(response => response.status).sort(), await repo('SurveyResponse').count()], [[200, 409], 2])

  // مفيش استعلام يربط رد بشخص: أعمدة الرد من غير حساب ولا دعوة ولا ساعة، والموظف فاضي، والدعوة باليوم بس ومن غير رقم رد، ومن غير سطر تدقيق
  const columns = async table => (await ds.query('SELECT [COLUMN_NAME] AS [name], [DATA_TYPE] AS [type] FROM INFORMATION_SCHEMA.COLUMNS WHERE [TABLE_NAME] = @0 ORDER BY [ORDINAL_POSITION]', [table])).map(row => `${row.name}:${row.type}`)
  assert.deepEqual(await columns('survey_responses'), ['id:int', 'surveyId:int', 'departmentId:int', 'branchId:int', 'employeeId:int', 'answers:nvarchar', 'submittedOn:date'])
  assert.deepEqual(await columns('survey_invitations'), ['id:int', 'surveyId:int', 'employeeId:int', 'departmentId:int', 'branchId:int', 'respondedOn:date', 'createdAt:datetime2'])
  const stored = await repo('SurveyResponse').find({ where: { surveyId: id }, order: { id: 'ASC' } })
  assert.deepEqual([stored.map(row => [row.employeeId, row.departmentId, row.branchId, String(row.submittedOn).slice(0, 10)]), JSON.parse(stored[0].answers)],
    [[[null, org.sales.id, org.branchA.id, today], [null, org.sales.id, org.branchA.id, today]], { q1: 5, q2: 10, q3: 'الرواتب', q4: 'الرواتب محتاجة مراجعة' }])
  assert.deepEqual((await repo('SurveyInvitation').find({ where: { surveyId: id, employeeId: d1[0].employeeId } })).map(row => String(row.respondedOn).slice(0, 10)), [today])
  assert.equal(Number((await ds.query('SELECT COUNT(*) AS [n] FROM [audit_log]'))[0].n), auditBefore, 'ولا سطر تدقيق للرد')
  assert.deepEqual(expectStatus(await request(d1[0], 'GET', S + '/mine'), 200).surveys, [], 'اللي رد مابيتطلبش منه تاني')

  // 4 ردود (أقل من الحد 5): مفيش نتايج خالص
  await respond(d1[2], id, good(3, 7, 'التدريب', 'محتاجين تدريب أكتر')); await respond(d1[3], id, good(4, 6, 'المواصلات'))
  const few = expectStatus(await request(users.hr, 'GET', `${S}/${id}/results`), 200)
  assert.deepEqual([few.total, few.visible, few.overall, few.groups, few.comments, few.survey.responded], [4, false, [], [], [], 4])
  // 6 ردود: بتعرض — الإجمالي وقسم المبيعات (6)، والتعليقات لسه تحت حدها (10)
  await respond(d1[4], id, good(5, 9, 'الرواتب')); await respond(d1[5], id, good(2, 10, 'التدريب'))
  const six = expectStatus(await request(users.hr, 'GET', `${S}/${id}/results`), 200)
  const raced = JSON.parse(stored[1].answers)
  const ratings = [5, raced.q1, 3, 4, 5, 2], enps = [10, raced.q2, 7, 6, 9, 10]
  const average = Math.round((ratings.reduce((sum, value) => sum + value, 0) / 6) * 100) / 100
  assert.deepEqual([six.total, six.visible, six.overall.map(row => [row.key, row.type, row.answered]), six.overall[0].average, six.overall[1].enps, six.overall[2].counts, six.groups.map(row => [row.name, row.count]), six.commentsHidden, six.comments],
    [6, true, [['q1', 'rating', 6], ['q2', 'enps', 6], ['q3', 'choice', 6]], average, rules.enpsScore(enps), [{ option: 'الرواتب', count: 2 }, { option: 'التدريب', count: 3 + (raced.q3 === 'التدريب' ? 0 : 0) }, { option: 'المواصلات', count: 1 }],
      [['قسم المبيعات', 6]], true, []])
  assert.equal(JSON.stringify(six).includes('موظف الاستبيان'), false, 'من غير أسماء')
  // قسم الدعم رد (4 — أقل من الحد): مابيظهرش؛ ولأن طرحه من الإجمالي يكشفه، قسم المبيعات بيتخفى كمان — والإجمالي لسه ظاهر
  for (const user of d2) await respond(user, id, good(1, 3, 'المواصلات', 'مفيش مواصلات'))
  const ten = expectStatus(await request(users.hr, 'GET', `${S}/${id}/results`), 200)
  assert.deepEqual([ten.total, ten.visible, ten.groups, ten.overall[0].answered, ten.commentsHidden], [10, true, [], 10, false])
  // التعليقات وصلت حدها (10): بتتعرض من غير مجموعة ولا ترتيب
  assert.deepEqual([ten.comments.map(row => row.key), [...ten.comments[0].texts].sort()], [['q4'], ['الرواتب محتاجة مراجعة', 'محتاجين تدريب أكتر', 'مفيش مواصلات', 'مفيش مواصلات', 'مفيش مواصلات', 'مفيش مواصلات'].sort()])
  // الحد إعداد: 11 ← التعليقات بتتخفى تاني
  await repo('RequestsConfig').save({ key: rules.SURVEY_COMMENT_MIN_KEY, value: '11' })
  assert.deepEqual([expectStatus(await request(users.hr, 'GET', `${S}/${id}/results`), 200).commentsHidden, (await request(users.hrB, 'GET', `${S}/${id}/results`)).status, (await request(d1[0], 'GET', `${S}/${id}/results`)).status], [true, 404, 403])
})

test('SV-03: الاستبيان بالاسم بيسجّل الموظف؛ والمقفول واللي فات آخر يومه مابيتردّش عليهم؛ والموديول المقفول', async () => {
  const named = expectStatus(await request(users.hr, 'POST', S, { title: 'تقييم دورة السلامة', kind: 'TRAINING', audience: branchAudience(org.branchA), isAnonymous: false, minGroup: 3, questions: [{ label: 'الدورة مفيدة؟', type: 'rating' }] }), 201)
  expectStatus(await request(users.hr, 'POST', `${S}/${named.id}/open`), 200)
  assert.equal(expectStatus(await request(d1[0], 'GET', `${S}/${named.id}`), 200).isAnonymous, false)
  expectStatus(await respond(d1[0], named.id, { q1: 5 }), 200)
  assert.deepEqual((await repo('SurveyResponse').find({ where: { surveyId: named.id } })).map(row => row.employeeId), [d1[0].employeeId], 'بالاسم: الموظف متسجّل')
  // آخر يوم فات
  await repo('Survey').update({ id: named.id }, { closeDate: localDateOf(new Date(Date.now() - 86400000)) })
  assert.deepEqual([answer(await respond(d1[1], named.id, { q1: 4 })), expectStatus(await request(d1[1], 'GET', `${S}/${named.id}`), 200).open, expectStatus(await request(d1[1], 'GET', S + '/mine'), 200).surveys.some(row => row.id === named.id)],
    [[400, rules.SURVEY_NOT_OPEN], false, false])
  // القفل: مفيش رد بعده، ومرة واحدة
  assert.deepEqual([expectStatus(await request(users.hr, 'POST', `${S}/${state.id}/close`), 200).status, answer(await request(users.hr, 'POST', `${S}/${state.id}/close`))], ['CLOSED', [400, rules.SURVEY_NOT_OPEN]])
  const late = await member({ departmentId: org.sales.id })
  assert.equal((await respond(late, state.id, { q1: 4, q2: 9, q3: 'التدريب' })).status, 404, 'اللي اتعيّن بعد الفتح مالوش دعوة')
  // والنتايج لسه بتتقري بعد القفل
  assert.equal(expectStatus(await request(users.hr, 'GET', `${S}/${state.id}/results`), 200).total, 10)
  expectStatus(await request(users.admin, 'PUT', '/modules/surveys', { enabled: false }), 200); modules.invalidate()
  try { assert.deepEqual([(await request(d1[0], 'GET', S + '/mine')).status, (await request(users.hr, 'GET', S)).status], [404, 404]) }
  finally { expectStatus(await request(users.admin, 'PUT', '/modules/surveys', { enabled: true }), 200); modules.invalidate() }
})
