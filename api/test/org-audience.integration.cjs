// B-ADD.1: الاستهداف الموحد — اختيار إدارة واحدة بيطبّق على موظفيها بس (هي واللي تحتها جوه فرعها) في كل مكان اتبنى في الخطة:
// المعاينة، الإعلانات، السياسات، قاعدة المعرفة، الاستبيانات، وتفعيل الموديولات؛ ومعاه «الكل ماعدا…»، ونطاق حساب الفروع، والقديم زي ما هو.
// HTTP وSQL فعليان في قاعدة اختبار عشوائية تُحذف بعد الانتهاء. ولا رسالة بريد حقيقية: send متبدّلة على النسخة نفسها.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_orgaudience_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-orgaudience-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const { localDateOf } = require('../src/attendance/attendance.service')
let app, ds, master, base, created = false, today
const U = {}, E = {}, B = {}, D = {}, T = {}

const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
const query = (text, params) => { assert.equal(ds.options.database, database); return ds.query(text, params) }
const claims = user => ({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, ...(user.scopeAllBranches === true ? { scopeAllBranches: true } : {}),
  permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function call(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt.sign(claims(user))}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const expect = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body ?? null)); return response.body }
const messageOf = response => [].concat(response.body?.message ?? []).join('، ')
const names = (...keys) => keys.map(key => E[key].fullName).sort()
const units = (branch, ...list) => ({ mode: 'all', ids: [], where: { mode: 'units', ids: list.map(unit => unit.id).sort((a, b) => a - b), branchId: branch.id } })
const teams = (branch, ...list) => ({ mode: 'all', ids: [], where: { mode: 'teams', ids: list.map(team => team.id).sort((a, b) => a - b), branchId: branch.id } })
const preview = async (user, audience) => expect(await call(user, 'POST', '/org/audience-preview', { audience }), 200)
const previewNames = async (user, audience) => (await preview(user, audience)).employees.map(row => row.fullName).sort()
const boardTitles = async user => expect(await call(user, 'GET', '/announcements/board'), 200).items.map(item => item.title)

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql'); assert.match(database, /^hr_orgaudience_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads,
    FRONTEND_URL: 'https://hr.example.invalid' })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  // ولا رسالة بريد حقيقية من اختبار
  const { MailService } = require('../src/auth/mail.service')
  const mail = app.get(MailService)
  mail.isConfigured = () => false
  mail.send = async () => { throw new Error('no mail from tests') }
  assert.notEqual(mail.send, MailService.prototype.send)
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => {}
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => {}
  ds = app.get(require('../node_modules/typeorm').DataSource); assert.equal(ds.options.database, database)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  today = localDateOf(new Date())
  B.a = await repo('Branch').save({ code: 'OAA', name: 'فرع الاستهداف أ', country: 'EG', weekendDays: 'FRI' })
  B.b = await repo('Branch').save({ code: 'OAB', name: 'فرع الاستهداف ب', country: 'EG', weekendDays: 'FRI' })
  // فرع أ: إدارة المبيعات (فوق قسمين) وإدارة المالية (فوق قسم)؛ فرع ب: قسم واحد
  const unit = async (key, branch, name, extra = {}) => { D[key] = await repo('Department').save({ branchId: branch.id, name, unitType: 'DEPARTMENT', ...extra }) }
  await unit('sales', B.a, 'إدارة المبيعات', { unitType: 'ADMINISTRATION' })
  await unit('retail', B.a, 'قسم التجزئة', { parentId: D.sales.id })
  await unit('wholesale', B.a, 'قسم الجملة', { parentId: D.sales.id })
  await unit('finance', B.a, 'إدارة المالية', { unitType: 'ADMINISTRATION' })
  await unit('accounts', B.a, 'قسم الحسابات', { parentId: D.finance.id })
  await unit('other', B.b, 'قسم فرع ب')
  T.shop = await repo('Team').save({ name: 'فريق المحل', departmentId: D.retail.id })
  let n = 0
  const employee = async (key, branch, extra = {}) => { E[key] = await repo('Employee').save({ employeeCode: `OA${String(++n).padStart(3, '0')}`, fullName: `موظف استهداف ${key}`,
    branchId: branch.id, status: 'active', isActive: true, joinDate: '2024-01-01', ...extra }) }
  await employee('retail1', B.a, { departmentId: D.retail.id, teamId: T.shop.id })
  await employee('retail2', B.a, { departmentId: D.retail.id })
  await employee('wholesale1', B.a, { departmentId: D.wholesale.id })
  await employee('salesHead', B.a, { departmentId: D.sales.id })
  await employee('accounts1', B.a, { departmentId: D.accounts.id })
  await employee('loose', B.a)
  await employee('b1', B.b, { departmentId: D.other.id })
  await employee('gone', B.a, { departmentId: D.retail.id, status: 'archived', isActive: false })
  const account = (key, role, permissions, extra = {}) => repo('User').save({ email: `${key}@orgaudience.invalid`, displayName: `حساب ${key}`, passwordHash: 'test-only',
    role, permissions: JSON.stringify(permissions), isActive: true, ...extra }).then(saved => { U[key] = saved })
  await account('admin', 'super_admin', ['*'])
  await account('hr', 'employee', ['announcements.manage', 'policies.manage', 'helpdesk.manage', 'surveys.manage'], { scopeAllBranches: true })
  await account('hrA', 'employee', ['announcements.manage', 'helpdesk.manage', 'surveys.manage'], { branchId: B.a.id })
  await account('plain', 'employee', [], { branchId: B.a.id })
  for (const key of ['retail1', 'retail2', 'wholesale1', 'salesHead', 'accounts1', 'loose', 'b1']) await account(key, 'employee', [], { branchId: E[key].branchId, employeeId: E[key].id })
  await account('tasksAll', 'employee', ['tasks.manage'], { scopeAllBranches: true })
  await account('tasksA', 'employee', ['tasks.assign_any'], { branchId: B.a.id, employeeId: E.loose.id })
  for (const key of ['announcements', 'surveys', 'helpdesk']) expect(await call(U.admin, 'PUT', `/modules/${key}`, { enabled: true }), 200)
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_orgaudience_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('db', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name=@db')).recordset.length, 0)
      t.diagnostic(`تحقق حذف قاعدة الاختبار: ${database}`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir())); assert.match(path.basename(uploads), /^hr-orgaudience-files-/)
    fs.rmSync(uploads, { recursive: true, force: true }); assert.equal(fs.existsSync(uploads), false)
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'تعذر تنظيف بيئة اختبار الاستهداف الموحد')
})

test('OA-01: the preview counts and names an audience at every level, inside the asker\'s branch scope only', async () => {
  // الشركة كلها = الحاليين بس (المؤرشف برّه)
  assert.deepEqual(await previewNames(U.hr, null), names('retail1', 'retail2', 'wholesale1', 'salesHead', 'accounts1', 'loose', 'b1'))
  // إدارة واحدة = موظفينها واللي في الأقسام اللي تحتها بس
  assert.deepEqual(await previewNames(U.hr, units(B.a, D.sales)), names('retail1', 'retail2', 'wholesale1', 'salesHead'))
  assert.deepEqual(await previewNames(U.hr, units(B.a, D.finance)), names('accounts1'))
  // قسم واحد، وفريق واحد، وفرع
  assert.deepEqual(await previewNames(U.hr, units(B.a, D.retail)), names('retail1', 'retail2'))
  assert.deepEqual(await previewNames(U.hr, teams(B.a, T.shop)), names('retail1'))
  assert.deepEqual(await previewNames(U.hr, { mode: 'all', ids: [], where: { mode: 'branches', ids: [B.b.id] } }), names('b1'))
  // موظفين بالاسم من فرع
  assert.deepEqual(await previewNames(U.hr, { mode: 'employees', ids: [String(E.loose.id), String(E.b1.id)], where: { mode: 'branches', ids: [B.a.id] } }), names('loose'))
  // «الكل ماعدا…»
  assert.deepEqual(await previewNames(U.hr, { ...units(B.a, D.sales), exclude: [E.retail2.id] }), names('retail1', 'wholesale1', 'salesHead'))
  assert.deepEqual((await preview(U.hr, { mode: 'all', ids: [], where: null, exclude: [E.b1.id, E.loose.id] })).count, 5)
  // الشكل القديم «أقسام محددة» بيطابق برقم القسم بالحرف (من غير اللي تحته) — زي ما كان
  assert.deepEqual(await previewNames(U.hr, { mode: 'all', ids: [], where: { mode: 'departments', ids: [D.sales.id] } }), names('salesHead'))
  // وحدة فرعها المكتوب غير فرعها الحقيقي مابتطابقش حد
  assert.equal((await preview(U.hr, units(B.b, D.sales))).count, 0)
  // حساب الفروع: نطاقه بس — حتى لو طلب الشركة كلها أو فرع تاني
  assert.deepEqual(await previewNames(U.hrA, null), names('retail1', 'retail2', 'wholesale1', 'salesHead', 'accounts1', 'loose'))
  assert.equal((await preview(U.hrA, { mode: 'all', ids: [], where: { mode: 'branches', ids: [B.b.id] } })).count, 0)
  // السياق: شجرة النطاق والأسماء للي بيحدد جمهور بس
  const context = expect(await call(U.hrA, 'GET', '/org/audience-context'), 200)
  assert.deepEqual([context.branches.map(row => row.id), context.employees.map(row => row.fullName).sort(), context.units.find(row => row.id === D.sales.id).unitType],
    [[B.a.id], names('retail1', 'retail2', 'wholesale1', 'salesHead', 'accounts1', 'loose'), 'ADMINISTRATION'])
  for (const [method, route, body] of [['GET', '/org/audience-context'], ['POST', '/org/audience-preview', { audience: null }]]) expect(await call(U.plain, method, route, body), 403)
  expect(await call(U.hr, 'POST', '/org/audience-preview', { audience: 'x' }), 400)
})

test('OA-02: an announcement for one administration reaches its people only; exclusion; a branch account targets units of its own branches only', async () => {
  const make = async (user, title, audience) => expect(await call(user, 'POST', '/announcements', { title, body: `نص ${title}`, audience }), 201)
  const publish = async (user, row) => expect(await call(user, 'POST', `/announcements/${row.id}/publish`), 201)
  const sales = await make(U.hr, 'لإدارة المبيعات', units(B.a, D.sales))
  assert.deepEqual(sales.audience, units(B.a, D.sales))
  await publish(U.hr, sales)
  const seen = {}
  for (const key of ['retail1', 'retail2', 'wholesale1', 'salesHead', 'accounts1', 'loose', 'b1']) seen[key] = (await boardTitles(U[key])).includes('لإدارة المبيعات')
  assert.deepEqual(seen, { retail1: true, retail2: true, wholesale1: true, salesHead: true, accounts1: false, loose: false, b1: false })
  // تقرير القراءة = جمهورها بالظبط، والقراءة من برّه الجمهور «غير موجود»
  const report = expect(await call(U.hr, 'GET', `/announcements/${sales.id}/report`), 200)
  assert.deepEqual([report.summary.audience, report.rows.map(row => row.fullName).sort()], [4, names('retail1', 'retail2', 'wholesale1', 'salesHead')])
  expect(await call(U.accounts1, 'POST', `/announcements/${sales.id}/read`), 404)
  expect(await call(U.retail1, 'POST', `/announcements/${sales.id}/read`), 201)
  // «الكل ماعدا…»: المستثنى مابيشوفش ولا بيتعدّ
  const except = await make(U.hr, 'المبيعات ماعدا واحد', { ...units(B.a, D.sales), exclude: [E.retail2.id] })
  await publish(U.hr, except)
  assert.deepEqual([(await boardTitles(U.retail2)).includes('المبيعات ماعدا واحد'), (await boardTitles(U.retail1)).includes('المبيعات ماعدا واحد'),
    expect(await call(U.hr, 'GET', `/announcements/${except.id}/report`), 200).summary.audience], [false, true, 3])
  // فريق
  const shop = await make(U.hr, 'لفريق المحل', teams(B.a, T.shop))
  await publish(U.hr, shop)
  assert.deepEqual([(await boardTitles(U.retail1)).includes('لفريق المحل'), (await boardTitles(U.retail2)).includes('لفريق المحل')], [true, false])
  // حساب الفروع: إدارات وفرق فرعه مسموح، وفرع تاني أو وحدة مش تبع الفرع المكتوب مرفوض
  const mine = await make(U.hrA, 'من حساب الفرع لإدارة المالية', units(B.a, D.finance))
  assert.ok(expect(await call(U.hrA, 'GET', '/announcements'), 200).items.some(item => item.id === mine.id))
  expect(await call(U.hrA, 'POST', '/announcements', { title: 'فرع تاني', body: 'نص', audience: units(B.b, D.other) }), 403)
  const wrong = await call(U.hr, 'POST', '/announcements', { title: 'وحدة مش تبع الفرع', body: 'نص', audience: units(B.b, D.sales) })
  assert.deepEqual([wrong.status, /مش موجود أو مش تبع الفرع/.test(messageOf(wrong))], [400, true])
  expect(await call(U.hr, 'POST', '/announcements', { title: 'مستثنى مش موجود', body: 'نص', audience: { ...units(B.a, D.sales), exclude: [999999] } }), 400)
  expect(await call(U.hr, 'POST', '/announcements', { title: 'وحدات من غير فرع', body: 'نص', audience: { mode: 'all', ids: [], where: { mode: 'units', ids: [D.sales.id] } } }), 400)
  // القديم زي ما هو: «فروع محددة» بنفس نصها المحفوظ بالحرف
  const old = await make(U.hr, 'لفرع ب بالشكل القديم', { mode: 'all', ids: [], where: { mode: 'branches', ids: [B.b.id] } })
  assert.equal((await repo('Announcement').findOneByOrFail({ id: old.id })).audience, JSON.stringify({ mode: 'all', ids: [], where: { mode: 'branches', ids: [B.b.id] } }))
})

test('OA-03: a policy, a knowledge article and a survey for one administration apply to its people only', async () => {
  // السياسة (غير إلزامية عشان بوابة الإقرار ماتقفلش الباقي)
  const policy = expect(await call(U.hr, 'POST', '/policies', { title: 'سياسة إدارة المبيعات', isMandatory: false, graceDays: 0, audience: units(B.a, D.sales) }), 201)
  expect(await call(U.hr, 'POST', `/policies/${policy.id}/versions`, { bodyText: 'نص السياسة', effectiveDate: today }), 201)
  const mine = async user => JSON.stringify(expect(await call(user, 'GET', '/policies/mine'), 200)).includes('سياسة إدارة المبيعات')
  assert.deepEqual([await mine(U.wholesale1), await mine(U.salesHead), await mine(U.accounts1), await mine(U.b1)], [true, true, false, false])
  const report = expect(await call(U.hr, 'GET', `/policies/${policy.id}/report`), 200)
  assert.equal(report.summary.audience, 4)
  // تعديل الجمهور باستثناء: المستثنى خرج
  expect(await call(U.hr, 'PATCH', `/policies/${policy.id}`, { audience: { ...units(B.a, D.sales), exclude: [E.wholesale1.id] } }), 200)
  assert.deepEqual([await mine(U.wholesale1), await mine(U.salesHead)], [false, true])
  expect(await call(U.hr, 'PATCH', `/policies/${policy.id}`, { audience: units(B.b, D.sales) }), 400)

  // مقال قاعدة المعرفة
  const article = expect(await call(U.hrA, 'POST', '/helpdesk/articles', { title: 'مقال لإدارة المالية', body: 'نص المقال', audience: units(B.a, D.finance), isPublished: true }), 201)
  const reads = async user => JSON.stringify(expect(await call(user, 'GET', '/helpdesk/articles'), 200)).includes('مقال لإدارة المالية')
  assert.deepEqual([await reads(U.accounts1), await reads(U.retail1), await reads(U.b1)], [true, false, false])
  assert.ok(JSON.stringify(expect(await call(U.hrA, 'GET', '/helpdesk/articles/manage'), 200)).includes(`"id":${article.id}`))
  expect(await call(U.hrA, 'POST', '/helpdesk/articles', { title: 'مقال فرع تاني', body: 'نص', audience: units(B.b, D.other), isPublished: true }), 403)

  // الاستبيان: المدعوين = جمهور الإدارة وقت الفتح، ماعدا المستثنى
  const survey = expect(await call(U.hr, 'POST', '/surveys', { title: 'استبيان إدارة المبيعات', kind: 'SATISFACTION', isAnonymous: true, minGroup: 3,
    audience: { ...units(B.a, D.sales), exclude: [E.salesHead.id] }, questions: [{ label: 'رأيك في الإدارة', type: 'rating', required: true }] }), 201)
  const opened = await call(U.hr, 'POST', `/surveys/${survey.id}/open`)
  assert.deepEqual([[200, 201].includes(opened.status), opened.body?.invited], [true, 3], JSON.stringify(opened.body ?? null).slice(0, 300))
  const invited = (await query('SELECT [employeeId] FROM [survey_invitations] WHERE [surveyId] = @0 ORDER BY [employeeId]', [survey.id])).map(row => Number(row.employeeId))
  assert.deepEqual(invited, [E.retail1.id, E.retail2.id, E.wholesale1.id].sort((a, b) => a - b))
})

test('OA-04: a module opened for one administration is on for its people only (and whoever is excluded by name is out)', async () => {
  const on = async user => (await call(user, 'GET', '/surveys/mine')).status
  expect(await call(U.admin, 'PUT', '/modules/surveys', { audience: { ...units(B.a, D.sales), exclude: [E.retail2.id] } }), 200)
  assert.deepEqual([await on(U.retail1), await on(U.wholesale1), await on(U.salesHead), await on(U.retail2), await on(U.accounts1), await on(U.b1)], [200, 200, 200, 404, 404, 404])
  const row = await repo('SystemModule').findOneByOrFail({ key: 'surveys' })
  assert.equal(row.audience, JSON.stringify({ ...units(B.a, D.sales), exclude: [E.retail2.id] }))
  expect(await call(U.admin, 'PUT', '/modules/surveys', { audience: units(B.b, D.sales) }), 400)
  // رجوع «للكل»
  expect(await call(U.admin, 'PUT', '/modules/surveys', { audience: null }), 200)
  assert.deepEqual([await on(U.retail2), await on(U.b1)], [200, 200])
})

test('OA-05: a group task gives every employee of the audience their own task, inside the assigner\'s branch scope, and only to permission holders', async () => {
  const group = (user, audience, extra = {}) => call(user, 'POST', '/tasks/group', { title: 'مهمة جماعية', description: 'تفاصيل', priority: 'NORMAL', audience, ...extra })
  const assigned = async ids => (await query(`SELECT [assigneeEmployeeId] FROM [tasks] WHERE [id] IN (${ids.map(Number).join(',')}) ORDER BY [assigneeEmployeeId]`)).map(row => Number(row.assigneeEmployeeId))
  const idsOf = (...keys) => keys.map(key => E[key].id).sort((a, b) => a - b)
  // إدارة واحدة ماعدا واحد: كل موظف مهمته
  const sales = expect(await group(U.tasksAll, { ...units(B.a, D.sales), exclude: [E.retail2.id] }), 201)
  assert.deepEqual([sales.created, sales.skipped, await assigned(sales.taskIds)], [3, [], idsOf('retail1', 'wholesale1', 'salesHead')])
  // المهمة بتوصل لصاحبها في «مهامي» ومابتوصلش للمستثنى
  const mine = async user => JSON.stringify(expect(await call(user, 'GET', '/tasks/mine'), 200)).includes('مهمة جماعية')
  assert.deepEqual([await mine(U.retail1), await mine(U.retail2), await mine(U.accounts1)], [true, false, false])
  assert.equal(Number((await query(`SELECT COUNT(*) AS [n] FROM [outbox_events] WHERE [eventType] = N'TASK_ASSIGNED'`))[0].n), 3, 'حدث «مهمة جديدة عليك» لكل واحد')
  // حساب الفروع: «الشركة كلها» = نطاقه بس، وهو نفسه مش من المكلَّفين
  const scoped = expect(await group(U.tasksA, null), 201)
  assert.deepEqual([scoped.created, await assigned(scoped.taskIds)], [5, idsOf('retail1', 'retail2', 'wholesale1', 'salesHead', 'accounts1')])
  // فرع برّه نطاقه: مفيش حد
  const outside = await group(U.tasksA, { mode: 'all', ids: [], where: { mode: 'branches', ids: [B.b.id] } })
  assert.deepEqual([outside.status, /مفيش موظفين/.test(messageOf(outside))], [400, true])
  // من غير صلاحية، وجمهور بشكل مش من المنتقي، ووحدة مش تبع فرعها: مرفوضين ومن غير مهام
  const before = Number((await query('SELECT COUNT(*) AS [n] FROM [tasks]'))[0].n)
  expect(await group(U.retail1, units(B.a, D.sales)), 403)
  expect(await group(U.tasksAll, { mode: 'roles', ids: ['hr'], where: null }), 400)
  expect(await group(U.tasksAll, units(B.b, D.sales)), 400)
  expect(await group(U.tasksAll, units(B.a, D.sales), { dueDate: '2020-01-01' }), 400)
  assert.equal(Number((await query('SELECT COUNT(*) AS [n] FROM [tasks]'))[0].n), before)
})
