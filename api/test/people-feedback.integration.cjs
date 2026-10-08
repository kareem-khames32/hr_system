'use strict'
// B5.10 على SQL حقيقي: 360 (ترشيح واعتماد، تقييم للمدير، رد من غير مقيّم ولا وقت، ونتيجة بعد قفل الدورة وبحد أدنى)، واجتماعات 1:1 (أجندة وملاحظات ومهام
// وتقويم)، والتقدير بين الزملاء — تلات ميزات فرعية مقفولة افتراضيًا، وترحيلات 176–180. قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const migrate = require('../scripts/db-migrate.cjs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_people_feedback_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_people_feedback_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-people-feedback-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/performance/people-feedback')
const TABLES = ['feedback360_invites', 'feedback360_responses', 'one_on_ones', 'one_on_one_actions', 'recognitions']
const MIGRATIONS = TABLES.map((table, index) => path.resolve(apiRoot, '..', 'docs', 'migrations', 'payroll', `20261010_${176 + index}_${table}.sql`))
let master, pool, app, ds, base, modules, created = false, sequence = 0
const B = {}, E = {}, U = {}, C = {}, I = {}, M = {}
const repo = name => { assert.match(database, NAME); assert.equal(ds.options.database, database); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token(user) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const raw = await response.text(); let parsed = null
  try { parsed = raw ? JSON.parse(raw) : null } catch { parsed = raw }
  return { status: response.status, body: parsed }
}
const ok = (response, status = 200) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const refused = (response, status, message) => { assert.deepEqual([response.status, response.body?.message], [status, message]) }
const employee = (name, branch, extra = {}) => repo('Employee').save({ employeeCode: 'PF' + ++sequence, fullName: name, branchId: branch.id, joinDate: '2020-01-01',
  basicSalary: 5000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'cash', ...extra })
const account = (label, branch, permissions, who) => repo('User').save({ email: `${label}@people-feedback.invalid`, displayName: 'حساب ' + label, passwordHash: 'test-only', role: 'employee', branchId: branch.id,
  permissions: JSON.stringify(permissions), isActive: true, ...(who ? { employeeId: who.id } : {}) })
const runMigrations = async () => { assert.match(database, NAME); for (const file of MIGRATIONS) for (const batch of migrate.splitBatches(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'))) await pool.request().batch(batch) }
const ymd = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const day = offset => { const date = new Date(); date.setDate(date.getDate() + offset); return ymd(date) }
const F = '/performance/feedback360', O = '/performance/one-on-ones', R = '/performance/recognitions'
const cycle = async (name, status, people) => {
  const row = await repo('ReviewCycle').save({ name, kind: 'ANNUAL', templateId: 1, periodStart: '2026-01-01', periodEnd: '2026-12-31', audienceMode: 'COMPANY', selfDueDate: '2026-12-01', managerDueDate: '2026-12-15',
    status, createdByUserId: U.admin.id, createdAt: new Date() })
  for (const who of people) await repo('ReviewAssignment').save({ cycleId: row.id, employeeId: who.id, branchId: who.branchId, managerEmployeeId: who.managerEmployeeId ?? null, status: 'OPEN', createdAt: new Date() })
  return row.id
}
const nominate = (user, cycleId, ids) => request(user, 'POST', `${F}/my/nominations`, { cycleId, reviewerEmployeeIds: ids })
const decide = (user, id, action) => request(user, 'POST', `${F}/invites/${id}/decision`, { action })
const respond = (user, id, body) => request(user, 'POST', `${F}/invites/${id}/respond`, body)
const results = (user, cycleId, who) => request(user, 'GET', `${F}/results?cycleId=${cycleId}&employeeId=${who.id}`)
const inviteOf = async (subject, reviewer, relation = 'PEER') => (await repo('Feedback360Invite').findOne({ where: { subjectEmployeeId: subject.id, reviewerEmployeeId: reviewer.id, relation } }))
const columnsOf = async table => (await pool.request().query(`SELECT COLUMN_NAME AS name FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = N'${table}' ORDER BY ORDINAL_POSITION`)).recordset.map(row => row.name)

before(async () => {
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  const connection = { server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD, options: { encrypt: false, trustServerCertificate: true } }
  master = await new sql.ConnectionPool({ ...connection, database: 'master' }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  // مفيش رسالة بريد حقيقية بتطلع من الاختبار
  const mail = app.get(require('../src/auth/mail.service').MailService)
  mail.isConfigured = () => false
  mail.send = async () => { throw new Error('no mail in tests') }
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1'); ds = app.get(require('../node_modules/typeorm').DataSource)
  assert.equal(ds.options.database, database)
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  pool = await new sql.ConnectionPool({ ...connection, database }).connect()
  modules = app.get(require('../src/modules-registry/modules.service').ModulesService)
  B.riyadh = await repo('Branch').save({ code: 'PF_1', name: 'فرع الرياض', country: 'SA' })
  B.cairo = await repo('Branch').save({ code: 'PF_2', name: 'فرع القاهرة', country: 'EG' })
  U.admin = await repo('User').save({ email: 'admin@people-feedback.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', scopeAllBranches: true, permissions: '[]', isActive: true })
  E.boss = await employee('المدير', B.riyadh); E.other = await employee('مدير تاني', B.riyadh)
  for (const key of ['s', 'r2', 'r3', 'r4']) E[key] = await employee('مرؤوس ' + key, B.riyadh, { managerEmployeeId: E.boss.id })
  for (const key of ['c1', 'c2', 'c3']) E[key] = await employee('زميل ' + key, B.riyadh, { managerEmployeeId: E.other.id })
  E.x = await employee('موظف القاهرة', B.cairo); E.gone = await employee('موظف منتهي', B.riyadh, { status: 'terminated', isActive: false })
  for (const key of ['boss', 's', 'r2', 'r3', 'r4', 'c1', 'c2', 'c3', 'gone']) U[key] = await account(key, B.riyadh, [], E[key])
  U.x = await account('x', B.cairo, [], E.x)
  U.hr = await account('hr', B.riyadh, ['performance.manage']); U.hrCairo = await account('hr-cairo', B.cairo, ['performance.manage'])
  C.open = await cycle('تقييم 2026', 'ACTIVE', [E.s, E.boss, E.r2]); C.draft = await cycle('دورة مسودة', 'DRAFT', [E.s])
}, { timeout: 120000 })

after(async t => {
  if (app) await app.close()
  if (pool) await pool.close()
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

test('PF-01: الميزات التلاتة مقفولة افتراضيًا = مفيش مسار؛ وقبل الترحيلات الشاشات بتقول ناقص ومفيش كتابة؛ والترحيلات بشكل الكيانات وبتتكرر بأمان', async () => {
  ok(await request(U.admin, 'PUT', '/modules/performance', { enabled: true })); modules.invalidate()
  const features = [rules.FEEDBACK360_FEATURE, rules.ONE_ON_ONE_FEATURE, rules.RECOGNITION_FEATURE]
  assert.deepEqual(await Promise.all(features.map(feature => modules.isFeatureEnabled(feature))), [false, false, false])
  assert.deepEqual([(await request(U.s, 'GET', `${F}/my`)).status, (await request(U.boss, 'GET', `${F}/team`)).status, (await request(U.s, 'GET', O)).status, (await request(U.s, 'GET', R)).status, (await request(U.hr, 'DELETE', `${R}/1`)).status], [404, 404, 404, 404, 404])
  for (const feature of features) ok(await request(U.admin, 'PUT', `/modules/features/${feature}`, { enabled: true }))
  modules.invalidate()
  for (const migration of MIGRATIONS) {
    const text = fs.readFileSync(migration), code = path.basename(migration).split('_')[1]
    assert.equal(text.includes(Buffer.from('\r\n')), false, 'LF بس — git بيخزّن الملف LF')
    assert.notDeepEqual([...text.subarray(0, 3)], [0xef, 0xbb, 0xbf])
    assert.ok(String(text).match(/THROW \d+/g).every(found => new RegExp(`^THROW ${code}0\\d\\d$`).test(found)), code)
    assert.doesNotMatch(String(text), /\bDROP\b|\bTRUNCATE\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b/i)
  }
  await runMigrations()
  for (const table of TABLES) await pool.request().batch(`DROP TABLE dbo.${table}`)
  rules.resetPeopleFeedbackCache()
  assert.deepEqual([ok(await request(U.s, 'GET', `${F}/my`)).ready, ok(await request(U.boss, 'GET', `${F}/team`)).ready, ok(await request(U.s, 'GET', O)).ready, ok(await request(U.s, 'GET', R)).ready], [false, false, false, false])
  refused(await nominate(U.s, C.open, [E.c1.id]), 400, rules.FEEDBACK360_MIGRATION_MISSING)
  refused(await request(U.boss, 'POST', O, { employeeId: E.s.id, meetingDate: day(3) }), 400, rules.ONE_ON_ONE_MIGRATION_MISSING)
  refused(await request(U.s, 'POST', R, { toEmployeeId: E.c1.id, message: 'شكرًا على المساعدة' }), 400, rules.RECOGNITION_MIGRATION_MISSING)
  await runMigrations(); await runMigrations()
  // السرية في شكل الجدول: الرد من غير مقيّم ولا دعوة ولا وقت، والدعوة من غير وقت الرد
  assert.deepEqual([await columnsOf('feedback360_responses'), await columnsOf('feedback360_invites')],
    [['id', 'cycleId', 'subjectEmployeeId', 'relation', 'rating', 'strengths', 'improvements'], ['id', 'cycleId', 'subjectEmployeeId', 'reviewerEmployeeId', 'relation', 'status', 'responded', 'createdByUserId', 'decidedByUserId', 'createdAt']])
})

test('PF-02: ترشيح الزملاء — لدورة مفتوحة للموظف فيها تكليف، من زملاء فرعه على رأس العمل (مش نفسه ولا مديره)، وقراره للمدير المباشر دلوقتي أو صاحب الصلاحية في نطاقه', async () => {
  for (const [body, message] of [[{ reviewerEmployeeIds: [E.c1.id] }, 'اختار دورة التقييم'], [{ cycleId: C.open, reviewerEmployeeIds: [] }, 'رشّح من زميل لحد 8 زملاء من غير تكرار'],
    [{ cycleId: C.open, reviewerEmployeeIds: [E.c1.id, E.c1.id] }, 'رشّح من زميل لحد 8 زملاء من غير تكرار'], [{ cycleId: C.open, reviewerEmployeeIds: ['x'] }, 'رشّح من زميل لحد 8 زملاء من غير تكرار']])
    refused(await request(U.s, 'POST', `${F}/my/nominations`, body), 400, message)
  refused(await nominate(U.hr, C.open, [E.c1.id]), 403, 'حسابك مش مربوط بملف موظف')
  refused(await nominate(U.gone, C.open, [E.c1.id]), 403, 'ملفك مش على رأس العمل')
  // من غير تكليف، أو دورة مش مفتوحة
  for (const [user, id] of [[U.c1, C.open], [U.s, C.draft], [U.s, 999999]]) refused(await nominate(user, id, [E.c2.id]), 409, rules.CYCLE_NOT_OPEN)
  // نفسه، مديره، فرع تاني، منتهي، مش موجود = «غير موجود»
  for (const id of [E.s.id, E.boss.id, E.x.id, E.gone.id, 999999]) refused(await nominate(U.s, C.open, [E.c1.id, id]), 404, rules.EMPLOYEE_NOT_FOUND)
  assert.equal(await repo('Feedback360Invite').count(), 0)
  // طلبين مع بعض بنفس الزميل = ترشيح واحد
  const both = await Promise.all([nominate(U.s, C.open, [E.c1.id]), nominate(U.s, C.open, [E.c1.id])])
  assert.deepEqual([both.map(response => response.status).sort(), await repo('Feedback360Invite').count()], [[201, 409], 1])
  ok(await nominate(U.s, C.open, [E.c2.id, E.c3.id, E.r2.id]), 201)
  refused(await nominate(U.s, C.open, [E.r3.id, E.c2.id]), 409, 'زميل من دول مترشّح قبل كده')
  const mine = ok(await request(U.s, 'GET', `${F}/my`))
  assert.deepEqual([mine.cycles, mine.nominations.map(row => [row.reviewerName, row.status]), mine.colleagues.map(row => row.id).sort((a, b) => a - b), mine.toGive, Object.keys(mine.nominations[0]).sort().join(',')],
    [[{ id: C.open, name: 'تقييم 2026' }], [['زميل c1', 'PENDING'], ['زميل c2', 'PENDING'], ['زميل c3', 'PENDING'], ['مرؤوس r2', 'PENDING']],
      [E.other.id, E.r2.id, E.r3.id, E.r4.id, E.c1.id, E.c2.id, E.c3.id].sort((a, b) => a - b), [], 'cycleId,id,reviewerName,status,statusLabel'])
  for (const key of ['c1', 'c2', 'c3', 'r2']) I[key] = (await inviteOf(E.s, E[key])).id
  // «ترشيحات مستنية قراري»: للمدير المباشر وصاحب الصلاحية في نطاقه بس
  const pending = async user => ok(await request(user, 'GET', `${F}/team`)).pending.map(row => row.id)
  assert.deepEqual([await pending(U.boss), await pending(U.hr), await pending(U.c1), await pending(U.hrCairo), await pending(U.s)], [[I.c1, I.c2, I.c3, I.r2], [I.c1, I.c2, I.c3, I.r2], [], [], []])
  refused(await request(U.boss, 'POST', `${F}/invites/${I.c1}/decision`, { action: 'X' }), 400, 'القرار: اعتماد أو رفض')
  for (const user of [U.c1, U.hrCairo, U.s, U.other ?? U.c2]) refused(await decide(user, I.c1, 'APPROVE'), 404, rules.INVITE_NOT_FOUND)
  refused(await decide(U.boss, 999999, 'APPROVE'), 404, rules.INVITE_NOT_FOUND)
  // المدير اتغيّر بعد الترشيح: المدير القديم مابقاش له قرار
  await pool.request().query(`UPDATE dbo.employees SET [managerEmployeeId] = ${Number(E.other.id)} WHERE [id] = ${Number(E.s.id)}`)
  refused(await decide(U.boss, I.c1, 'APPROVE'), 404, rules.INVITE_NOT_FOUND)
  await pool.request().query(`UPDATE dbo.employees SET [managerEmployeeId] = ${Number(E.boss.id)} WHERE [id] = ${Number(E.s.id)}`)
  ok(await decide(U.boss, I.c1, 'APPROVE'), 201); ok(await decide(U.boss, I.c2, 'APPROVE'), 201); ok(await decide(U.hr, I.c3, 'APPROVE'), 201); ok(await decide(U.boss, I.r2, 'REJECT'), 201)
  refused(await decide(U.boss, I.c1, 'REJECT'), 409, 'الترشيح ده اتاخد فيه قرار قبل كده')
  assert.deepEqual([(await repo('Feedback360Invite').find({ order: { id: 'ASC' } })).map(row => [row.status, row.decidedByUserId]), ok(await request(U.c1, 'GET', `${F}/my`)).toGive.map(row => [row.id, row.subjectName, row.relationLabel]),
    ok(await request(U.r2, 'GET', `${F}/my`)).toGive], [[['APPROVED', U.boss.id], ['APPROVED', U.boss.id], ['APPROVED', U.hr.id], ['REJECTED', U.boss.id]], [[I.c1, 'مرؤوس s', 'زملاء']], []])
})

test('PF-03: الرد والنتيجة — رد واحد لكل دعوة معتمدة والدورة مفتوحة، من غير مقيّم ولا وقت ولا سطر تدقيق؛ والنتيجة بعد قفل الدورة، بحد أدنى للردود، ومش للموظف نفسه', async () => {
  const good = { rating: 4, strengths: '  متعاون   وسريع ', improvements: 'التوثيق' }
  for (const [body, message] of [[{}, 'الدرجة رقم صحيح من 1 لـ5'], [{ rating: 6 }, 'الدرجة رقم صحيح من 1 لـ5'], [{ rating: 3.5 }, 'الدرجة رقم صحيح من 1 لـ5'], [{ rating: 3, strengths: 'x'.repeat(1001) }, 'التعليق 1000 حرف بالكتير']])
    refused(await respond(U.c1, I.c1, body), 400, message)
  for (const [user, id] of [[U.c2, I.c1], [U.s, I.c1], [U.boss, I.c1], [U.c1, 999999]]) refused(await respond(user, id, good), 404, rules.INVITE_NOT_FOUND)
  refused(await respond(U.r2, I.r2, good), 409, 'الدعوة مش معتمدة')
  ok(await respond(U.c1, I.c1, { ...good, reviewerEmployeeId: E.boss.id, subjectEmployeeId: E.boss.id }), 201)
  refused(await respond(U.c1, I.c1, good), 409, 'رديت على الدعوة دي قبل كده')
  // ردين مع بعض على نفس الدعوة = رد واحد
  const both = await Promise.all([respond(U.c2, I.c2, { rating: 5, strengths: 'أمين' }), respond(U.c2, I.c2, { rating: 5, strengths: 'أمين' })])
  assert.deepEqual([both.map(response => response.status).sort(), await repo('Feedback360Response').count()], [[201, 409], 2])
  const stored = await repo('Feedback360Response').find({ order: { id: 'ASC' } })
  assert.deepEqual([stored[0].subjectEmployeeId, stored[0].relation, stored[0].rating, stored[0].strengths, stored[0].improvements, (await repo('Feedback360Invite').findOne({ where: { id: I.c1 } })).responded,
    Number((await pool.request().query(`SELECT COUNT(*) AS n FROM dbo.audit_log WHERE [entityType] LIKE N'feedback%'`)).recordset[0].n)], [E.s.id, 'PEER', 4, 'متعاون وسريع', 'التوثيق', true, 0])
  // تقييم المدير من مرؤوسيه: بصلاحيته وفي نطاقه، و3 مرؤوسين على الأقل
  assert.equal((await request(U.boss, 'POST', `${F}/upward`, { cycleId: C.open, subjectEmployeeId: E.boss.id })).status, 403)
  refused(await request(U.hr, 'POST', `${F}/upward`, {}), 400, 'اختار الدورة والمدير')
  refused(await request(U.hrCairo, 'POST', `${F}/upward`, { cycleId: C.open, subjectEmployeeId: E.boss.id }), 404, rules.EMPLOYEE_NOT_FOUND)
  refused(await request(U.hr, 'POST', `${F}/upward`, { cycleId: C.open, subjectEmployeeId: E.other.id }), 409, 'دورة التقييم مش مفتوحة أو الموظف مالوش تكليف فيها')
  refused(await request(U.hr, 'POST', `${F}/upward`, { cycleId: C.open, subjectEmployeeId: E.s.id }), 409, 'تقييم المدير محتاج 3 مرؤوسين مباشرين على الأقل (حد السرية)')
  assert.deepEqual([ok(await request(U.hr, 'POST', `${F}/upward`, { cycleId: C.open, subjectEmployeeId: E.boss.id }), 201), ok(await request(U.hr, 'POST', `${F}/upward`, { cycleId: C.open, subjectEmployeeId: E.boss.id }), 201)],
    [{ invited: 4, total: 4 }, { invited: 0, total: 4 }])
  for (const [key, rating] of [['s', 5], ['r2', 3], ['r3', 4]]) ok(await respond(U[key], (await inviteOf(E.boss, E[key], 'UPWARD')).id, { rating, improvements: key === 's' ? 'يوزّع الشغل بدري' : undefined }), 201)
  ok(await respond(U.c3, I.c3, { rating: 3, strengths: 'دقيق' }), 201)
  // الدورة لسه مفتوحة: مفيش نتيجة
  assert.deepEqual((({ closed, summaries, minGroup }) => [closed, summaries, minGroup])(ok(await results(U.boss, C.open, E.s))), [false, [], 3])
  await pool.request().query(`UPDATE dbo.review_cycles SET [status] = N'CLOSED' WHERE [id] = ${Number(C.open)}`)
  refused(await respond(U.r4, (await inviteOf(E.boss, E.r4, 'UPWARD')).id, { rating: 2 }), 409, 'دورة التقييم اتقفلت')
  // Codex P5A-B05: رد وإغلاق مع بعض — الرد يا إما قبل الإغلاق يا إما مرفوض، وبعد الإغلاق عدد الردود ثابت بين قراءتين
  {
    const racing = await cycle('دورة السباق', 'ACTIVE', [E.s])
    await repo('Feedback360Invite').save(['c1', 'c2', 'c3'].map(key => ({ cycleId: racing, subjectEmployeeId: E.s.id, reviewerEmployeeId: E[key].id, relation: 'PEER', status: 'APPROVED', responded: false, createdByUserId: U.s.id, decidedByUserId: U.boss.id, createdAt: new Date() })))
    const invites = await repo('Feedback360Invite').find({ where: { cycleId: racing }, order: { id: 'ASC' } })
    const outcomes = await Promise.all([respond(U.c1, invites[0].id, { rating: 5 }), request(U.admin, 'POST', `/performance/reviews/cycles/${racing}/close`), respond(U.c2, invites[1].id, { rating: 1 }), respond(U.c3, invites[2].id, { rating: 3 })])
    assert.equal(outcomes[1].status < 300, true, JSON.stringify(outcomes[1].body))
    const stored = await repo('Feedback360Response').count({ where: { cycleId: racing } })
    assert.equal(stored, [outcomes[0], outcomes[2], outcomes[3]].filter(response => response.status === 201).length)
    assert.deepEqual([outcomes[0], outcomes[2], outcomes[3]].filter(response => response.status !== 201).map(response => [response.status, response.body.message]).filter(row => row[1] !== 'دورة التقييم اتقفلت'), [])
    // بعد الإغلاق: مفيش رد بيدخل، والعدد زي ما هو
    for (const [user, invite] of [[U.c1, invites[0]], [U.c2, invites[1]], [U.c3, invites[2]]]) assert.notEqual((await respond(user, invite.id, { rating: 4 })).status, 201)
    assert.equal(await repo('Feedback360Response').count({ where: { cycleId: racing } }), stored)
  }
  // بعد القفل: الزملاء 3 ردود = معروضة (التعليقات أبجديًا)، والمرؤوسين صفر = مخفية من غير عدد
  const forS = ok(await results(U.boss, C.open, E.s))
  assert.deepEqual([forS.closed, forS.employeeName, forS.summaries], [true, 'مرؤوس s', [
    // P5A-N01: تعليق التحسين الوحيد مابيتعرضش (قايمته أقل من الحد)
    { relation: 'PEER', label: 'زملاء', hidden: false, count: 3, average: 4, strengths: ['أمين', 'دقيق', 'متعاون وسريع'], improvements: [] },
    { relation: 'UPWARD', label: 'مرؤوسين', hidden: true, count: null, average: null, strengths: [], improvements: [] }]])
  const forBoss = ok(await results(U.hr, C.open, E.boss))
  assert.deepEqual(forBoss.summaries.map(row => [row.relation, row.hidden, row.count, row.average, row.improvements]), [['PEER', true, null, null, []], ['UPWARD', false, 3, 4, []]])
  assert.equal(JSON.stringify(forBoss).includes('يوزّع الشغل بدري'), false)
  // ردين بس = مخفية (ولا العدد ولا التعليقات)
  for (const rating of [1, 2]) await repo('Feedback360Response').save({ cycleId: C.open, subjectEmployeeId: E.r2.id, relation: 'PEER', rating, strengths: 'تعليق مايتعرضش', improvements: null })
  const few = ok(await results(U.boss, C.open, E.r2))
  assert.deepEqual([few.summaries.map(row => [row.hidden, row.count]), JSON.stringify(few).includes('تعليق مايتعرضش')], [[[true, null], [true, null]], false])
  // مش للموظف نفسه ولا لزميل ولا لفرع تاني؛ والمدير مايقراش نتيجته
  for (const [user, who] of [[U.s, E.s], [U.c1, E.s], [U.hrCairo, E.s], [U.boss, E.boss], [U.boss, E.c1]]) refused(await results(user, C.open, who), 404, rules.EMPLOYEE_NOT_FOUND)
  refused(await results(U.boss, 999999, E.s), 404, 'دورة التقييم مش موجودة')
  const team = ok(await request(U.boss, 'GET', `${F}/team`))
  assert.deepEqual([team.canManage, team.people.filter(row => row.cycleId === C.open).map(row => [row.cycleId, row.cycleStatus, row.fullName]), ok(await request(U.hr, 'GET', `${F}/team`)).people.filter(row => row.cycleId === C.open).length,
    ok(await request(U.c1, 'GET', `${F}/team`)).people],
    [false, [[C.open, 'CLOSED', 'مرؤوس r2'], [C.open, 'CLOSED', 'مرؤوس s']], 3, []])
})

test('PF-04: اجتماعات 1:1 — بيحددها المدير المباشر دلوقتي، لطرفيها بس؛ الأجندة للطرفين والباقي للمدير؛ مهمة المتابعة في محرك المهام؛ وبتظهر في تقويم الطرفين', async () => {
  const good = { employeeId: E.s.id, meetingDate: day(3), meetingTime: '14:30', agenda: '  متابعة   الأهداف ' }
  for (const [body, message] of [[{ ...good, employeeId: 'x' }, 'اختار الموظف'], [{ ...good, meetingDate: day(-1) }, 'تاريخ الاجتماع من النهارده'], [{ ...good, meetingDate: '2026-02-30' }, 'تاريخ الاجتماع من النهارده'],
    [{ ...good, meetingTime: '25:00' }, 'وقت الاجتماع بصيغة 14:30'], [{ ...good, agenda: 'x'.repeat(1001) }, 'الأجندة 1000 حرف بالكتير']]) refused(await request(U.boss, 'POST', O, body), 400, message)
  refused(await request(U.hr, 'POST', O, good), 403, 'حسابك مش مربوط بملف موظف')
  // مش مرؤوسه المباشر، نفسه، منتهي، مش موجود = «غير موجود»
  for (const [user, id] of [[U.boss, E.c1.id], [U.boss, E.boss.id], [U.s, E.boss.id], [U.c1, E.s.id], [U.boss, 999999]]) refused(await request(user, 'POST', O, { ...good, employeeId: id }), 404, rules.EMPLOYEE_NOT_FOUND)
  M.one = ok(await request(U.boss, 'POST', O, good), 201).id
  M.gone = ok(await request(U.boss, 'POST', O, { employeeId: E.r2.id, meetingDate: day(3) }), 201).id
  const mine = ok(await request(U.s, 'GET', O)), boss = ok(await request(U.boss, 'GET', O))
  assert.deepEqual([mine.reports, mine.meetings.map(row => [row.id, row.role, row.withName, row.meetingDate, row.meetingTime, row.agenda, row.notes, row.status, row.actions]), boss.reports.map(row => row.id).sort((a, b) => a - b),
    boss.meetings.map(row => [row.id, row.role, row.withName]).sort((a, b) => a[0] - b[0]), ok(await request(U.c1, 'GET', O)).meetings],
  [[], [[M.one, 'EMPLOYEE', 'المدير', day(3), '14:30', 'متابعة الأهداف', null, 'SCHEDULED', []]], [E.s.id, E.r2.id, E.r3.id, E.r4.id].sort((a, b) => a - b), [[M.one, 'MANAGER', 'مرؤوس s'], [M.gone, 'MANAGER', 'مرؤوس r2']], []])
  // التعديل: طرف تالت «مش موجود»؛ الموظف للأجندة بس؛ المدير للباقي
  for (const [body, message] of [[{}, 'مفيش تعديل'], [{ meetingDate: '2026-13-01' }, 'تاريخ الاجتماع مش صحيح'], [{ status: 'X' }, 'حالة الاجتماع مش صحيحة'], [{ notes: 'x'.repeat(2001) }, 'الملاحظات 2000 حرف بالكتير']])
    refused(await request(U.boss, 'PATCH', `${O}/${M.one}`, body), 400, message)
  for (const user of [U.c1, U.r2, U.hr.employeeId ? U.hr : U.c2]) refused(await request(user, 'PATCH', `${O}/${M.one}`, { agenda: 'x' }), 404, rules.MEETING_NOT_FOUND)
  refused(await request(U.boss, 'PATCH', `${O}/999999`, { agenda: 'x' }), 404, rules.MEETING_NOT_FOUND)
  ok(await request(U.s, 'PATCH', `${O}/${M.one}`, { agenda: 'متابعة الأهداف + طلب تدريب' }))
  for (const body of [{ notes: 'ملاحظة' }, { status: 'DONE' }, { meetingDate: day(5) }, { agenda: 'أجندة', meetingTime: '09:00' }]) refused(await request(U.s, 'PATCH', `${O}/${M.one}`, body), 403, 'التاريخ والملاحظات والحالة بيعدّلها المدير')
  ok(await request(U.boss, 'PATCH', `${O}/${M.one}`, { notes: '  اتفقنا على   خطة ', meetingTime: '15:00' }))
  const saved = await repo('OneOnOne').findOne({ where: { id: M.one } })
  assert.deepEqual([saved.agenda, saved.notes, saved.meetingTime, saved.status, String(saved.meetingDate).slice(0, 10)], ['متابعة الأهداف + طلب تدريب', 'اتفقنا على خطة', '15:00', 'SCHEDULED', day(3)])
  // مهمة المتابعة: المدير بس، في محرك المهام بحدث التكليف
  const action = { title: ' تسجيل  في دورة ', assignee: 'EMPLOYEE', dueDate: day(10) }
  for (const [body, message] of [[{ ...action, title: 'ab' }, 'اكتب المهمة (من 3 حروف لحد 150)'], [{ ...action, assignee: 'HR' }, 'المهمة على الموظف أو المدير'], [{ ...action, dueDate: day(-1) }, 'موعد المهمة تاريخ من النهارده']])
    refused(await request(U.boss, 'POST', `${O}/${M.one}/actions`, body), 400, message)
  refused(await request(U.s, 'POST', `${O}/${M.one}/actions`, action), 403, 'مهام المتابعة بيفتحها المدير')
  refused(await request(U.c1, 'POST', `${O}/${M.one}/actions`, action), 404, rules.MEETING_NOT_FOUND)
  const first = ok(await request(U.boss, 'POST', `${O}/${M.one}/actions`, action), 201).taskId
  const second = ok(await request(U.boss, 'POST', `${O}/${M.one}/actions`, { title: 'مراجعة الميزانية', assignee: 'MANAGER', dueDate: day(10) }), 201).taskId
  const tasks = await repo('Task').find({ order: { id: 'ASC' } })
  assert.deepEqual(tasks.map(task => [task.id, task.title, task.assigneeEmployeeId, task.assigneeRole, task.branchId, task.createdByUserId, task.status, String(task.dueDate).slice(0, 10)]),
    [[first, 'متابعة اجتماع 1:1: تسجيل في دورة', E.s.id, null, B.riyadh.id, U.boss.id, 'OPEN', day(10)], [second, 'متابعة اجتماع 1:1: مراجعة الميزانية', E.boss.id, null, B.riyadh.id, U.boss.id, 'OPEN', day(10)]])
  assert.deepEqual((await pool.request().query(`SELECT [entityId] FROM dbo.outbox_events WHERE [eventType] = N'TASK_ASSIGNED' ORDER BY [id]`)).recordset.map(row => Number(row.entityId)), [first, second])
  assert.deepEqual(ok(await request(U.s, 'GET', O)).meetings[0].actions.map(item => [item.taskId, item.open, item.mine]), [[first, true, true], [second, true, false]])
  // التقويم: للطرفين بس، والملغي مابيظهرش
  ok(await request(U.boss, 'PATCH', `${O}/${M.gone}`, { status: 'CANCELLED' }))
  refused(await request(U.boss, 'POST', `${O}/${M.gone}/actions`, action), 409, 'الاجتماع ملغي')
  const month = day(3).slice(0, 7), calendar = async user => ok(await request(user, 'GET', `/calendar?month=${month}`)).meetings
  assert.deepEqual([await calendar(U.s), await calendar(U.boss), await calendar(U.c1), await calendar(U.r2)],
    [[{ id: M.one, date: day(3), time: '15:00', withName: 'المدير', role: 'EMPLOYEE' }], [{ id: M.one, date: day(3), time: '15:00', withName: 'مرؤوس s', role: 'MANAGER' }], [], []])
  // بعد «اتعمل»: الملاحظات بس؛ والمدير القديم بيفضل طرف في اجتماعه بعد تغيير المدير
  ok(await request(U.boss, 'PATCH', `${O}/${M.one}`, { status: 'DONE' }))
  refused(await request(U.s, 'PATCH', `${O}/${M.one}`, { agenda: 'تعديل متأخر' }), 409, 'الاجتماع اتقفل — ملاحظاته بس اللي بتتعدّل')
  refused(await request(U.boss, 'PATCH', `${O}/${M.one}`, { status: 'SCHEDULED' }), 409, 'الاجتماع اتقفل — ملاحظاته بس اللي بتتعدّل')
  await pool.request().query(`UPDATE dbo.employees SET [managerEmployeeId] = ${Number(E.other.id)} WHERE [id] = ${Number(E.s.id)}`)
  ok(await request(U.boss, 'PATCH', `${O}/${M.one}`, { notes: 'ملاحظة بعد الاجتماع' }))
  refused(await request(U.boss, 'POST', O, good), 404, rules.EMPLOYEE_NOT_FOUND)
  await pool.request().query(`UPDATE dbo.employees SET [managerEmployeeId] = ${Number(E.boss.id)} WHERE [id] = ${Number(E.s.id)}`)
  // الميزة مقفولة: التقويم من غير اجتماعات
  ok(await request(U.admin, 'PUT', `/modules/features/${rules.ONE_ON_ONE_FEATURE}`, { enabled: false })); modules.invalidate()
  // P5A-N02: والميزة مقفولة رد التقويم من غير مفتاح الاجتماعات (شكله اللي قبل الميزة بالحرف)
  const closedCalendar = ok(await request(U.s, 'GET', `/calendar?month=${month}`))
  assert.deepEqual([Object.keys(closedCalendar).sort(), (await request(U.s, 'GET', O)).status], [['from', 'holidays', 'leaves', 'month', 'to', 'weekendDays'], 404])
})

test('PF-05: التقدير — كلمة شكر لزميل على رأس العمل في فرع المرسل الحالي بحد في اليوم، في قايمة الفرع بس؛ والإخفاء بصلاحيته في نطاقه وبسطر تدقيق', async () => {
  for (const [body, message] of [[{ message: 'شكرًا جزيلًا' }, 'اختار الزميل'], [{ toEmployeeId: E.c1.id, message: 'شكر' }, 'اكتب كلمة الشكر (من 5 حروف لحد 500)'], [{ toEmployeeId: E.c1.id, message: 'x'.repeat(501) }, 'اكتب كلمة الشكر (من 5 حروف لحد 500)']])
    refused(await request(U.s, 'POST', R, body), 400, message)
  refused(await request(U.hr, 'POST', R, { toEmployeeId: E.c1.id, message: 'شكرًا على المساعدة' }), 403, 'حسابك مش مربوط بملف موظف')
  refused(await request(U.gone, 'POST', R, { toEmployeeId: E.c1.id, message: 'شكرًا على المساعدة' }), 403, 'ملفك مش على رأس العمل')
  // نفسه، فرع تاني، منتهي، مش موجود = «غير موجود»
  for (const id of [E.s.id, E.x.id, E.gone.id, 999999]) refused(await request(U.s, 'POST', R, { toEmployeeId: id, message: 'شكرًا على المساعدة' }), 404, rules.EMPLOYEE_NOT_FOUND)
  assert.equal(await repo('Recognition').count(), 0)
  const first = ok(await request(U.s, 'POST', R, { toEmployeeId: E.c1.id, message: '  شكرًا على   مساعدتك في الجرد ', branchId: B.cairo.id, fromEmployeeId: E.boss.id }), 201).id
  const stored = await repo('Recognition').findOne({ where: { id: first } })
  assert.deepEqual([stored.fromEmployeeId, stored.toEmployeeId, stored.branchId, stored.message, stored.hiddenByUserId], [E.s.id, E.c1.id, B.riyadh.id, 'شكرًا على مساعدتك في الجرد', null])
  const feed = async user => ok(await request(user, 'GET', R))
  const mine = await feed(U.s), received = await feed(U.c1)
  assert.deepEqual([mine.canSend, mine.canModerate, mine.perDay, mine.colleagues.some(row => row.id === E.s.id || row.id === E.x.id || row.id === E.gone.id), mine.feed.map(row => [row.id, row.fromName, row.toName, row.message, row.fromMe, row.toMe]),
    received.feed.map(row => [row.toMe, row.fromMe]), (await feed(U.x)).feed, (({ canSend, canModerate, feed: rows }) => [canSend, canModerate, rows.length])(await feed(U.hr)), (await feed(U.hrCairo)).feed],
  [true, false, 5, false, [[first, 'مرؤوس s', 'زميل c1', 'شكرًا على مساعدتك في الجرد', true, false]], [[true, false]], [], [false, true, 1], []])
  // المستلم اتنقل من الفرع: الكلمة فاضلة في قايمة الفرع من غير اسمه
  await pool.request().query(`UPDATE dbo.employees SET [branchId] = ${Number(B.cairo.id)} WHERE [id] = ${Number(E.c1.id)}`)
  assert.deepEqual([(await feed(U.s)).feed.map(row => [row.fromName, row.toName]), (await feed(U.c1)).feed], [[['مرؤوس s', 'زميل سابق في الفرع']], []])
  await pool.request().query(`UPDATE dbo.employees SET [branchId] = ${Number(B.riyadh.id)} WHERE [id] = ${Number(E.c1.id)}`)
  // حد اليوم
  for (let index = 1; index < rules.RECOGNITIONS_PER_DAY; index++) ok(await request(U.s, 'POST', R, { toEmployeeId: E.c2.id, message: `شكرًا على الدعم رقم ${index}` }), 201)
  refused(await request(U.s, 'POST', R, { toEmployeeId: E.c3.id, message: 'شكرًا على المساعدة' }), 409, '5 كلمات شكر في اليوم بالكتير')
  // الإخفاء
  assert.equal((await request(U.s, 'DELETE', `${R}/${first}`)).status, 403)
  refused(await request(U.hrCairo, 'DELETE', `${R}/${first}`), 404, 'كلمة الشكر مش موجودة')
  ok(await request(U.hr, 'DELETE', `${R}/${first}`))
  refused(await request(U.hr, 'DELETE', `${R}/${first}`), 404, 'كلمة الشكر مش موجودة')
  assert.deepEqual([(await feed(U.s)).feed.some(row => row.id === first), (await feed(U.s)).feed.length, (await repo('Recognition').findOne({ where: { id: first } })).hiddenByUserId,
    (await pool.request().query(`SELECT [action] FROM dbo.audit_log WHERE [entityType] = N'recognition'`)).recordset.map(row => row.action)], [false, 4, U.hr.id, ['RECOGNITION_HIDDEN']])
  ok(await request(U.admin, 'PUT', `/modules/features/${rules.RECOGNITION_FEATURE}`, { enabled: false })); modules.invalidate()
  assert.equal((await request(U.s, 'GET', R)).status, 404)
})
