'use strict'
// B2.11 — الوظائف المعتمدة (موديول positions الاختياري) على قاعدة مؤقتة عشوائية بتتمسح في الآخر (hr_positions_test_<16 hex> — لا مساس بقاعدة
// الشركة ولا بريد):
//  PS-01) الموديول مقفول افتراضيًا: مساراته 404، والتعيين زي ما هو وخانة الوظيفة بتتجاهل. وبعد تفعيله: الصلاحيات (عرض / إدارة)، والنطاق.
//  PS-02) إنشاء وظيفة: المدخلات والروابط (المسمى من الكتالوج، القسم تبع الفرع، الفريق تبع القسم)، وفرع برّه النطاق زي اللي مش موجود،
//         وسطر في سجل التدقيق. والتعديل: العدد والحالة والميزانية والمسمى، والوحدة مابتتغيّرش، وسجل تغيير العدد.
//  PS-03) «المشغول» محسوب: المربوط، وخدمته ماانتهتش، ولسه في وحدتها — انتهاء الخدمة والنقل بيحرّروا المقعد لوحدهم؛ وأرقام المجمّدة والملغية.
//  PS-04) تقرير «معتمد / مشغول / شاغر / زيادة» لكل قسم صحيح، وموظفين من غير وظيفة، وفي نطاق القارئ بس.
//  PS-05) ربط موظف قايم وفكّه: في نطاق الحساب، وفي وحدة الوظيفة، ونشطة، وموظف خدمته انتهت مرفوض، والنقل من وظيفة لتانية، ورابط قديم
//         بيتفكّ؛ وموظف اتنقل برّه النطاق مابيتسمّاش.
//  PS-06) التعيين والإنفاذ مقفول: الخانة اختيارية، والتعيين على وظيفة مليانة بيعدّي «زيادة»؛ ووظيفة فرع تاني أو قسم تاني أو مش نشطة مرفوضة
//         والموظف مابيتعملش.
//  PS-07) التعيين والإنفاذ مفعّل («خلص لما»): من غير وظيفة مرفوض، وعلى مليانة مرفوض، وعلى اللي فيها شاغر مقبول؛ وتعيينين في نفس اللحظة على
//         آخر مقعد واحد بس بيعدّي؛ ونفس الحكم على الربط من الشاشة.
//  PS-08) قايمة الاختيار في نموذج التعيين: النشطة في الفرع بأرقامها، لصاحب «تعيين موظف جديد»، وفرع برّه النطاق فاضي.
//  PS-09) التوليد من الموجود: المعاينة (تتعمل / متخطّى بسببه)، والتطبيق (وظيفة بعدد موظفيها ومربوطين)، وآمن للتكرار، وفي النطاق بس.
// Run (من api/): node --test test/positions.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const { requiredEmployeeFields } = require('./helpers/employee-fixture.cjs')

const database = `hr_positions_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-positions-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, master, ds, base, modules, created = false, employeeNumber = 0
const org = {}, users = {}, emps = {}, catalog = {}, made = {}
const NOT_FOUND = 'الوظيفة المعتمدة غير موجودة'
const NOT_IN_BRANCH = 'الوظيفة المعتمدة غير موجودة في فرع الموظف'
const OTHER_UNIT = 'الوظيفة دي تبع قسم أو فريق غير اللي الموظف فيه'
const REQUIRED = 'اختار الوظيفة المعتمدة: التعيين من غير وظيفة معتمدة مقفول (من إعدادات الموديولات)'

function assertDisposable() {
  assert.match(database, /^hr_positions_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
const query = (text, params = []) => { assertDisposable(); return ds.query(text, params) }
const payloadOf = user => ({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false,
  permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
const token = user => jwt.sign(payloadOf(user))
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(user)}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
function expectStatus(response, status) {
  assert.equal(response.status, status, JSON.stringify(response.body))
  return response.body
}
const messageOf = response => [].concat(response.body?.message ?? []).join('، ')
const answer = response => [response.status, messageOf(response)]
async function employee(extra = {}) {
  const number = ++employeeNumber
  return repo('Employee').save({ employeeCode: `PS${String(number).padStart(3, '0')}`, fullName: `موظف الوظائف ${number}`, branchId: org.branchA.id, joinDate: '2020-01-01',
    basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'cash', ...extra })
}
const account = (label, permissions, extra = {}) => repo('User').save({ email: `${label}@positions.invalid`, displayName: `حساب ${label}`, passwordHash: 'test-only',
  role: 'employee', branchId: org.branchA.id, permissions: JSON.stringify(permissions), isActive: true, ...extra })
const setModule = async enabled => { expectStatus(await request(users.admin, 'PUT', '/modules/positions', { enabled }), 200); modules.invalidate() }
const setEnforce = async enabled => { expectStatus(await request(users.admin, 'PUT', '/modules/features/positions.enforce_on_hiring', { enabled }), 200); modules.invalidate() }
const createPosition = async (user, body) => expectStatus(await request(user, 'POST', '/positions', body), 201)
const list = async user => expectStatus(await request(user, 'GET', '/positions'), 200)
const rowOf = async (user, id) => (await list(user)).positions.find(row => row.id === id) ?? null
const counts = row => [row.approved, row.occupied, row.vacant, row.over]
const lineOf = (body, branch, department) => body.summary.find(line => line.branchId === branch.id && line.departmentId === (department ? department.id : null)) ?? null
const holderOf = async employeeId => (await query('SELECT [positionId] FROM [position_holders] WHERE [employeeId] = @0', [employeeId]))[0]?.positionId ?? null
const audits = async action => Number((await query('SELECT COUNT(*) AS [n] FROM [audit_log] WHERE [action] = @0', [action]))[0].n)
// حمولة موظف جديد كاملة (الحقول الإجبارية بقيم فريدة من مساعد الاختبارات): محاسب في قسم المالية بفرع أ
function hirePayload(extra = {}) {
  return { ...requiredEmployeeFields({ jobTitle: 'محاسب' }), fullName: 'معيّن جديد', joinDate: '2026-10-01', branchId: org.branchA.id, departmentId: org.finance.id, basicSalary: 5000, ...extra }
}
const hire = (user, extra) => request(user, 'POST', '/employees', hirePayload(extra))
const employeesNamed = async prefix => Number((await query(`SELECT COUNT(*) AS [n] FROM [employees] WHERE [fullName] LIKE @0`, [`${prefix}%`]))[0].n)
// اتصال تاني بيمسك صف لحد ما `count` طلب يقفوا عليه وبعدها يسيبه: اللي واقفين بيكمّلوا في نفس اللحظة
async function releaseTogether(lockSql, params, count, start, atLeast = 1) {
  assertDisposable()
  const holder = ds.createQueryRunner()
  await holder.connect()
  await holder.startTransaction()
  try {
    await holder.query(lockSql, params)
    const pending = start()
    let blocked = 0
    for (let waited = 0; waited < 8000 && blocked < Math.max(count, atLeast); waited += 50) {
      await new Promise(resolve => setTimeout(resolve, 50))
      blocked = Number((await query('SELECT COUNT(*) AS [n] FROM sys.dm_exec_requests WHERE [database_id] = DB_ID() AND [blocking_session_id] <> 0'))[0].n)
    }
    assert.ok(blocked >= atLeast, `${atLeast} طلب على الأقل واقف على الصف الممسوك (${blocked})`)
    await holder.commitTransaction()
    return await pending
  } finally {
    if (holder.isTransactionActive) await holder.rollbackTransaction()
    await holder.release()
  }
}

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
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  modules = app.get(require('../src/modules-registry/modules.service').ModulesService)
  await app.get(require('../src/settings/config-defaults.service').ConfigDefaultsService).onApplicationBootstrap()

  // فرع أ: قسم المالية (وفيه فريق الحسابات) وقسم المبيعات؛ وفرع ب. والكتالوج: مسميين نشطين ومسمى مقفول، ودرجة، ومركز تكلفة.
  org.branchA = await repo('Branch').save({ code: 'PS_A', name: 'فرع الوظائف أ', country: 'SA' })
  org.branchB = await repo('Branch').save({ code: 'PS_B', name: 'فرع الوظائف ب', country: 'SA' })
  org.finance = await repo('Department').save({ name: 'قسم المالية', code: 'PS_FIN', branchId: org.branchA.id })
  org.sales = await repo('Department').save({ name: 'قسم المبيعات', code: 'PS_SAL', branchId: org.branchA.id })
  org.bDepartment = await repo('Department').save({ name: 'قسم فرع ب', code: 'PS_BD', branchId: org.branchB.id })
  org.team = await repo('Team').save({ name: 'فريق الحسابات', code: 'PS_T', departmentId: org.finance.id })
  catalog.accountant = await repo('JobTitle').save({ title: 'محاسب', isActive: true })
  catalog.seller = await repo('JobTitle').save({ title: 'مندوب مبيعات', isActive: true })
  catalog.closed = await repo('JobTitle').save({ title: 'مسمى مقفول', isActive: false })
  catalog.grade = await repo('Grade').save({ name: 'الدرجة الخامسة', isActive: true })
  catalog.center = await repo('CostCenter').save({ code: 'CC-PS', name: 'مركز المالية', isActive: true })
  emps.a1 = await employee({ departmentId: org.finance.id, jobTitle: 'محاسب' })
  emps.a2 = await employee({ departmentId: org.finance.id, jobTitle: ' محاسب  ' })
  emps.t1 = await employee({ departmentId: org.finance.id, teamId: org.team.id, jobTitle: 'محاسب' })
  emps.s1 = await employee({ departmentId: org.sales.id, jobTitle: 'مندوب مبيعات' })
  emps.free = await employee({ departmentId: org.sales.id, jobTitle: 'مسمى حر مش في الكتالوج' })
  emps.gone = await employee({ departmentId: org.finance.id, jobTitle: 'محاسب', status: 'terminated', isActive: false })
  emps.b1 = await employee({ branchId: org.branchB.id, departmentId: org.bDepartment.id, jobTitle: 'محاسب' })
  users.admin = await repo('User').save({ email: 'admin@positions.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', branchId: null,
    scopeAllBranches: true, permissions: '[]', isActive: true })
  users.hrA = await account('hr-a', ['positions.view', 'positions.manage', 'employees.create', 'employees.view'])
  users.viewerA = await account('viewer-a', ['positions.view'])
  users.hrB = await account('hr-b', ['positions.view', 'positions.manage', 'employees.create'], { branchId: org.branchB.id })
  users.creator = await account('creator', ['employees.create'])
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
    assert.equal(path.dirname(path.resolve(uploads)), os.tmpdir()); assert.match(path.basename(uploads), /^hr-positions-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
  } catch (error) { errors.push(error) }
  if (errors.length) throw errors[0]
})

test('PS-01: الموديول مقفول افتراضيًا — مساراته مقفولة والتعيين زي ما هو؛ وبعد التفعيل الصلاحيات والنطاق', async () => {
  // مقفول من غير أي صف في القاعدة: حتى مدير النظام
  for (const [method, route] of [['GET', '/positions'], ['GET', '/positions/options?branchId=1'], ['GET', '/positions/form'], ['GET', '/positions/generate'], ['POST', '/positions/generate']]) {
    assert.equal((await request(users.admin, method, route)).status, 404, `${method} ${route}`)
  }
  assert.equal((await request(users.admin, 'POST', '/positions', { jobTitleId: catalog.accountant.id, branchId: org.branchA.id, headcount: 1 })).status, 404)
  // والتعيين زي ما هو: خانة الوظيفة بتتجاهل حتى لو رقمها مش موجود
  const hired = expectStatus(await hire(users.creator, { positionId: 987654 }), 201)
  assert.equal(await holderOf(hired.id), null)
  made.plainHire = hired

  await setModule(true)
  // القراءة: عرض أو إدارة. الكتابة: إدارة. من غير صلاحية 403
  for (const user of [users.hrA, users.viewerA, users.admin]) assert.deepEqual((({ available, positions }) => [available, positions])(await list(user)), [true, []], user.email)
  for (const user of [users.creator, users.nobody]) assert.equal((await request(user, 'GET', '/positions')).status, 403, user.email)
  assert.deepEqual([(await list(users.hrA)).canManage, (await list(users.viewerA)).canManage, (await list(users.hrA)).enforce], [true, false, false])
  const body = { jobTitleId: catalog.accountant.id, branchId: org.branchA.id, headcount: 1 }
  for (const user of [users.viewerA, users.creator, users.nobody]) assert.equal((await request(user, 'POST', '/positions', body)).status, 403, user.email)
  for (const [method, route] of [['GET', '/positions/form'], ['GET', '/positions/generate'], ['POST', '/positions/generate']]) {
    assert.equal((await request(users.viewerA, method, route)).status, 403, `${method} ${route}`)
  }
  // بيانات النموذج: فروع نطاق الحساب بأقسامها وفرقها، والكتالوجات النشطة بس
  const form = expectStatus(await request(users.hrA, 'GET', '/positions/form'), 200)
  assert.deepEqual(form.branches.map(row => row.id), [org.branchA.id])
  assert.deepEqual(form.departments.map(row => row.id).sort((a, b) => a - b), [org.finance.id, org.sales.id])
  assert.deepEqual([form.teams.map(row => row.id), form.jobTitles.map(row => row.title).sort(), form.grades.length, form.costCenters.length],
    [[org.team.id], ['محاسب', 'مندوب مبيعات'], 1, 1])
  assert.deepEqual(expectStatus(await request(users.hrB, 'GET', '/positions/form'), 200).branches.map(row => row.id), [org.branchB.id])
})

test('PS-02: إنشاء وظيفة وتعديلها — المدخلات والروابط، وفرع برّه النطاق زي اللي مش موجود، والوحدة مابتتغيّرش، وسجل التدقيق', async () => {
  const good = { jobTitleId: catalog.accountant.id, branchId: org.branchA.id, departmentId: org.finance.id, headcount: 2 }
  const bad = [
    [{ ...good, jobTitleId: 999999 }, 400, 'المسمى الوظيفي غير موجود في كتالوج المسميات'],
    [{ ...good, jobTitleId: catalog.closed.id }, 400, 'المسمى الوظيفي غير موجود في كتالوج المسميات'],
    [{ ...good, gradeId: 999999 }, 400, 'الدرجة غير موجودة'],
    [{ ...good, costCenterId: 999999 }, 400, 'مركز التكلفة غير موجود'],
    [{ ...good, departmentId: org.bDepartment.id }, 400, 'القسم مش تبع الفرع ده'],
    [{ ...good, departmentId: org.sales.id, teamId: org.team.id }, 400, 'الفريق مش تبع القسم ده'],
    [{ ...good, departmentId: null, teamId: org.team.id }, 400, 'الفريق محتاج قسمه: اختار القسم الأول'],
    [{ ...good, budget: '-5' }, 400, 'الميزانية رقم مش سالب بخانتين عشريتين بالكتير'],
    [{ ...good, budget: '10.123' }, 400, 'الميزانية رقم مش سالب بخانتين عشريتين بالكتير'],
    // فرع برّه نطاق الحساب زي الفرع اللي مش موجود
    [{ ...good, branchId: org.branchB.id, departmentId: null }, 404, 'الفرع غير موجود'],
    [{ ...good, branchId: 999999, departmentId: null }, 404, 'الفرع غير موجود'],
  ]
  for (const [body, status, message] of bad) assert.deepEqual(answer(await request(users.hrA, 'POST', '/positions', body)), [status, message], JSON.stringify(body))
  for (const headcount of [0, -1, 1.5, 10001]) assert.equal((await request(users.hrA, 'POST', '/positions', { ...good, headcount })).status, 400, String(headcount))
  assert.equal((await request(users.hrA, 'POST', '/positions', { ...good, status: 'OPEN' })).status, 400)
  assert.equal(Number((await query('SELECT COUNT(*) AS [n] FROM [positions]'))[0].n), 0, 'ولا وظيفة اتعملت من المرفوض')

  const before = await audits('POSITION_CREATED')
  const position = await createPosition(users.hrA, { ...good, gradeId: catalog.grade.id, costCenterId: catalog.center.id, budget: '12000.5' })
  assert.deepEqual([position.code, position.title, position.gradeName, position.branchName, position.departmentName, position.teamName, position.costCenterName, position.headcount,
    position.status, position.statusLabel, position.budget], [`P-${String(position.id).padStart(4, '0')}`, 'محاسب', 'الدرجة الخامسة', 'فرع الوظائف أ', 'قسم المالية', null, 'مركز المالية', 2,
    'ACTIVE', 'نشطة', '12000.50'])
  assert.deepEqual(counts(position), [2, 0, 2, 0])
  assert.equal(await audits('POSITION_CREATED'), before + 1)
  made.accountants = position
  // برّه النطاق: زي اللي مش موجودة — قراءة وتعديل وربط
  for (const [method, route, body] of [['GET', `/positions/${position.id}`], ['PATCH', `/positions/${position.id}`, { headcount: 9 }], ['POST', `/positions/${position.id}/holders`, { employeeId: emps.b1.id }],
    ['GET', '/positions/999999'], ['PATCH', '/positions/999999', { headcount: 9 }]]) {
    assert.deepEqual(answer(await request(users.hrB, method, route, body)), [404, NOT_FOUND], `${method} ${route}`)
  }
  assert.equal(await rowOf(users.hrB, position.id), null)
  assert.equal((await request(users.viewerA, 'PATCH', `/positions/${position.id}`, { headcount: 9 })).status, 403)

  // التعديل: العدد والحالة والميزانية والمسمى والدرجة ومركز التكلفة؛ وسطر تدقيق بقبل وبعد
  const edits = await audits('POSITION_UPDATED')
  let now = expectStatus(await request(users.hrA, 'PATCH', `/positions/${position.id}`, { headcount: 3, budget: null, gradeId: null }), 200)
  assert.deepEqual([now.headcount, now.budget, now.gradeId, now.costCenterId], [3, null, null, catalog.center.id])
  assert.equal(await audits('POSITION_UPDATED'), edits + 1)
  const [log] = await query(`SELECT TOP 1 [summary], [before], [after] FROM [audit_log] WHERE [action] = N'POSITION_UPDATED' ORDER BY [id] DESC`)
  assert.match(log.summary, /العدد من 2 لـ3/)
  assert.deepEqual([JSON.parse(log.before).headcount, JSON.parse(log.after).headcount], [2, 3])
  // من غير تغيير: ولا سطر
  expectStatus(await request(users.hrA, 'PATCH', `/positions/${position.id}`, { headcount: 3 }), 200)
  assert.equal(await audits('POSITION_UPDATED'), edits + 1)
  // الوحدة مابتتغيّرش (ونفس القيمة مقبولة)
  for (const body of [{ branchId: org.branchB.id }, { departmentId: org.sales.id }, { departmentId: null }, { teamId: org.team.id }]) {
    assert.deepEqual(answer(await request(users.hrA, 'PATCH', `/positions/${position.id}`, body)), [400, 'وحدة الوظيفة (الفرع والقسم والفريق) مابتتغيّرش: الغي الوظيفة واعمل واحدة جديدة'], JSON.stringify(body))
  }
  expectStatus(await request(users.hrA, 'PATCH', `/positions/${position.id}`, { branchId: org.branchA.id, departmentId: org.finance.id, teamId: null }), 200)
  for (const body of [{ jobTitleId: catalog.closed.id }, { gradeId: 999999 }, { costCenterId: 999999 }, { headcount: 0 }, { status: 'OPEN' }, { budget: 'كتير' }]) {
    assert.equal((await request(users.hrA, 'PATCH', `/positions/${position.id}`, body)).status, 400, JSON.stringify(body))
  }
  now = expectStatus(await request(users.hrA, 'PATCH', `/positions/${position.id}`, { headcount: 2 }), 200)
  assert.equal(now.headcount, 2)
})

test('PS-03: «المشغول» محسوب — المربوط، وخدمته ماانتهتش، ولسه في وحدتها؛ وأرقام المجمّدة والملغية', async () => {
  const id = made.accountants.id
  const link = (user, employeeId, position = id) => request(user, 'POST', `/positions/${position}/holders`, { employeeId })
  expectStatus(await link(users.hrA, emps.a1.id), 201)
  expectStatus(await link(users.hrA, emps.a2.id), 201)
  assert.deepEqual(counts(await rowOf(users.hrA, id)), [2, 2, 0, 0])
  // انتهاء الخدمة بيحرّر المقعد لوحده (من غير ما مسار الإنهاء يتلمس)، والرجوع بيشغله تاني
  await repo('Employee').update({ id: emps.a2.id }, { status: 'terminated' })
  assert.deepEqual(counts(await rowOf(users.hrA, id)), [2, 1, 1, 0])
  await repo('Employee').update({ id: emps.a2.id }, { status: 'archived' })
  assert.deepEqual(counts(await rowOf(users.hrA, id)), [2, 1, 1, 0])
  for (const status of ['active', 'probation', 'notice_period', 'suspended']) {
    await repo('Employee').update({ id: emps.a2.id }, { status })
    assert.deepEqual(counts(await rowOf(users.hrA, id)), [2, 2, 0, 0], status)
  }
  // والنقل لقسم تاني أو فرع تاني بيحرّره
  await repo('Employee').update({ id: emps.a2.id }, { departmentId: org.sales.id })
  assert.deepEqual(counts(await rowOf(users.hrA, id)), [2, 1, 1, 0])
  await repo('Employee').update({ id: emps.a2.id }, { departmentId: org.finance.id, branchId: org.branchB.id })
  assert.deepEqual(counts(await rowOf(users.hrA, id)), [2, 1, 1, 0])
  await repo('Employee').update({ id: emps.a2.id }, { branchId: org.branchA.id })
  assert.deepEqual(counts(await rowOf(users.hrA, id)), [2, 2, 0, 0])
  // وظيفة على فريق: اللي في القسم برّه الفريق مش في وحدتها
  const team = await createPosition(users.hrA, { jobTitleId: catalog.accountant.id, branchId: org.branchA.id, departmentId: org.finance.id, teamId: org.team.id, headcount: 1 })
  assert.deepEqual(answer(await link(users.hrA, emps.a1.id, team.id)), [400, OTHER_UNIT])
  expectStatus(await link(users.hrA, emps.t1.id, team.id), 201)
  assert.deepEqual(counts(await rowOf(users.hrA, team.id)), [1, 1, 0, 0])
  // والخروج من الفريق (وهو لسه في القسم) بيحرّر مقعد وظيفة الفريق
  await repo('Employee').update({ id: emps.t1.id }, { teamId: null })
  assert.deepEqual(counts(await rowOf(users.hrA, team.id)), [1, 0, 1, 0])
  await repo('Employee').update({ id: emps.t1.id }, { teamId: org.team.id })
  assert.deepEqual(counts(await rowOf(users.hrA, team.id)), [1, 1, 0, 0])
  made.team = team
  // المجمّدة: معتمدة ومن غير شاغر. والملغية: معتمدها صفر وشاغليها زيادة
  expectStatus(await request(users.hrA, 'PATCH', `/positions/${id}`, { headcount: 5, status: 'FROZEN' }), 200)
  assert.deepEqual(counts(await rowOf(users.hrA, id)), [5, 2, 0, 0])
  expectStatus(await request(users.hrA, 'PATCH', `/positions/${id}`, { status: 'CANCELLED' }), 200)
  assert.deepEqual(counts(await rowOf(users.hrA, id)), [0, 2, 0, 2])
  // وعدد أقل من الشاغلين مسموح وبيظهر زيادة
  expectStatus(await request(users.hrA, 'PATCH', `/positions/${id}`, { headcount: 1, status: 'ACTIVE' }), 200)
  assert.deepEqual(counts(await rowOf(users.hrA, id)), [1, 2, 0, 1])
  expectStatus(await request(users.hrA, 'PATCH', `/positions/${id}`, { headcount: 3 }), 200)
  assert.deepEqual(counts(await rowOf(users.hrA, id)), [3, 2, 1, 0])
})

test('PS-04: تقرير «معتمد / مشغول / شاغر / زيادة» لكل قسم صحيح، وموظفين من غير وظيفة، وفي نطاق القارئ بس', async () => {
  // المالية: محاسبين (3 معتمد، 2 مشغول) + وظيفة الفريق (1 معتمد، 1 مشغول) = 4 / 3 / 1 / 0، ومن غير وظيفة: المعيّن في PS-01 (في المالية) بس
  const body = await list(users.hrA)
  const finance = lineOf(body, org.branchA, org.finance)
  assert.deepEqual([finance.branchName, finance.departmentName, finance.approved, finance.occupied, finance.vacant, finance.over, finance.unassigned],
    ['فرع الوظائف أ', 'قسم المالية', 4, 3, 1, 0, 1])
  // المبيعات: ولا وظيفة، وموظفين اتنين من غير وظيفة — السطر ظاهر باسمه
  const sales = lineOf(body, org.branchA, org.sales)
  assert.deepEqual([sales.departmentName, sales.approved, sales.occupied, sales.vacant, sales.over, sales.unassigned], ['قسم المبيعات', 0, 0, 0, 0, 2])
  // اللي خدمته انتهت مش «من غير وظيفة»، وفرع تاني مش في تقرير الحساب
  assert.equal(body.summary.some(line => line.branchId === org.branchB.id), false)
  assert.deepEqual(body.summary.map(line => line.departmentId).sort((a, b) => a - b), [org.finance.id, org.sales.id])
  // وحساب الفرع التاني: سطر قسمه بموظفه اللي من غير وظيفة، ومن غير أي حاجة من فرع أ
  const other = await list(users.hrB)
  assert.deepEqual(other.positions, [])
  assert.deepEqual(other.summary.map(line => [line.branchId, line.departmentId, line.approved, line.unassigned]), [[org.branchB.id, org.bDepartment.id, 0, 1]])
  // ومدير النظام شايف الكل
  assert.equal((await list(users.admin)).summary.length, 3)
  // وظيفة على مستوى الفرع (من غير قسم): سطرها «على مستوى الفرع»
  const wide = await createPosition(users.hrA, { jobTitleId: catalog.seller.id, branchId: org.branchA.id, headcount: 2 })
  const branchLine = lineOf(await list(users.hrA), org.branchA, null)
  assert.deepEqual([branchLine.departmentName, branchLine.approved, branchLine.vacant], [null, 2, 2])
  made.wide = wide
})

test('PS-05: ربط موظف قايم وفكّه — النطاق، والوحدة، والحالة، والنقل من وظيفة لتانية، والرابط القديم', async () => {
  const id = made.accountants.id
  const link = (user, employeeId, position = id) => request(user, 'POST', `/positions/${position}/holders`, { employeeId })
  const unlink = (user, employeeId, position = id) => request(user, 'DELETE', `/positions/${position}/holders/${employeeId}`)
  // موظف برّه نطاق الحساب أو مش موجود: نفس الرد
  for (const employeeId of [emps.b1.id, 999999]) assert.deepEqual(answer(await link(users.hrA, employeeId)), [404, 'الموظف غير موجود'], String(employeeId))
  assert.deepEqual(answer(await link(users.hrA, emps.gone.id)), [400, 'الموظف خدمته انتهت: مايتربطش بوظيفة'])
  assert.deepEqual(answer(await link(users.hrA, emps.s1.id)), [400, OTHER_UNIT])
  assert.equal((await link(users.viewerA, emps.t1.id)).status, 403)
  // التفاصيل: الشاغلين بأسمائهم، واللي ينفع يتربطوا (وحدة الوظيفة، مش عليها) لصاحب الإدارة بس
  let detail = expectStatus(await request(users.hrA, 'GET', `/positions/${id}`), 200)
  assert.deepEqual(detail.holders.map(row => [row.employeeId, row.fullName, row.seated, row.note]), [[emps.a1.id, emps.a1.fullName, true, null], [emps.a2.id, emps.a2.fullName, true, null]])
  assert.deepEqual(detail.linkable.map(row => row.id).sort((a, b) => a - b), [emps.t1.id, made.plainHire.id].sort((a, b) => a - b))
  const forViewer = expectStatus(await request(users.viewerA, 'GET', `/positions/${id}`), 200)
  assert.deepEqual([forViewer.canManage, forViewer.linkable, forViewer.holders.length], [false, [], 2])
  // وظيفة على مستوى الفرع: أي موظف في الفرع. والنقل من وظيفة لتانية: الرابط القديم بيتشال
  const before = await audits('POSITION_HOLDER_SET')
  detail = expectStatus(await link(users.hrA, emps.a2.id, made.wide.id), 201)
  assert.deepEqual([await holderOf(emps.a2.id), detail.holders.map(row => row.employeeId), await audits('POSITION_HOLDER_SET')], [made.wide.id, [emps.a2.id], before + 1])
  assert.deepEqual(counts(await rowOf(users.hrA, id)), [3, 1, 2, 0])
  // نفس الربط تاني: من غير أثر ولا سطر
  expectStatus(await link(users.hrA, emps.a2.id, made.wide.id), 201)
  assert.equal(await audits('POSITION_HOLDER_SET'), before + 1)
  // وظيفة مش نشطة ماتستقبلش
  expectStatus(await request(users.hrA, 'PATCH', `/positions/${made.wide.id}`, { status: 'FROZEN' }), 200)
  assert.deepEqual(answer(await link(users.hrA, emps.s1.id, made.wide.id)), [400, 'الوظيفة دي مجمّدة: مفيش تعيين عليها'])
  expectStatus(await request(users.hrA, 'PATCH', `/positions/${made.wide.id}`, { status: 'ACTIVE' }), 200)
  // رابط قديم (موظف خدمته انتهت): ظاهر بحالته ومش محسوب، وبيتفكّ
  await repo('Employee').update({ id: emps.a2.id }, { status: 'terminated' })
  detail = expectStatus(await request(users.hrA, 'GET', `/positions/${made.wide.id}`), 200)
  assert.deepEqual(detail.holders.map(row => [row.employeeId, row.seated, row.note]), [[emps.a2.id, false, 'خدمته انتهت']])
  assert.equal(detail.occupied, 0)
  // موظف اتنقل برّه نطاق الحساب: مابيتسمّاش، وفكّه زي اللي مش مربوط
  await repo('Employee').update({ id: emps.a2.id }, { status: 'active', branchId: org.branchB.id })
  detail = expectStatus(await request(users.hrA, 'GET', `/positions/${made.wide.id}`), 200)
  assert.deepEqual([detail.holders, detail.occupied], [[], 0])
  assert.deepEqual(answer(await unlink(users.hrA, emps.a2.id, made.wide.id)), [404, 'الموظف مش مربوط بالوظيفة دي'])
  assert.deepEqual(answer(await unlink(users.hrA, emps.s1.id, made.wide.id)), [404, 'الموظف مش مربوط بالوظيفة دي'])
  await repo('Employee').update({ id: emps.a2.id }, { branchId: org.branchA.id })
  const removed = await audits('POSITION_HOLDER_REMOVED')
  detail = expectStatus(await unlink(users.hrA, emps.a2.id, made.wide.id), 200)
  assert.deepEqual([detail.holders, await holderOf(emps.a2.id), await audits('POSITION_HOLDER_REMOVED')], [[], null, removed + 1])
  assert.equal((await unlink(users.viewerA, emps.a1.id)).status, 403)
  assert.deepEqual(answer(await unlink(users.hrB, emps.a1.id)), [404, NOT_FOUND])
  // رجّع a2 على وظيفة المحاسبين لباقي الاختبارات
  expectStatus(await link(users.hrA, emps.a2.id), 201)
  assert.deepEqual(counts(await rowOf(users.hrA, id)), [3, 2, 1, 0])
})

test('PS-06: التعيين والإنفاذ مقفول — الخانة اختيارية والمليانة «زيادة»؛ ووظيفة فرع تاني أو قسم تاني أو مش نشطة مرفوضة والموظف مابيتعملش', async () => {
  const id = made.accountants.id
  // من غير وظيفة: مقبول
  const free = expectStatus(await hire(users.creator), 201)
  assert.equal(await holderOf(free.id), null)
  // على وظيفة فيها شاغر
  const seated = expectStatus(await hire(users.creator, { positionId: id }), 201)
  assert.equal(await holderOf(seated.id), id)
  assert.deepEqual(counts(await rowOf(users.hrA, id)), [3, 3, 0, 0])
  // على مليانة: بيعدّي وبيظهر زيادة
  const extra = expectStatus(await hire(users.creator, { positionId: id }), 201)
  assert.equal(await holderOf(extra.id), id)
  assert.deepEqual(counts(await rowOf(users.hrA, id)), [3, 4, 0, 1])
  // المرفوض: الموظف مابيتعملش أصلًا
  const people = await employeesNamed('معيّن جديد')
  const otherBranch = await createPosition(users.hrB, { jobTitleId: catalog.accountant.id, branchId: org.branchB.id, headcount: 5 })
  made.otherBranch = otherBranch
  for (const [extraBody, status, message] of [
    [{ positionId: otherBranch.id }, 400, NOT_IN_BRANCH],
    [{ positionId: 999999 }, 400, NOT_IN_BRANCH],
    [{ positionId: id, departmentId: org.sales.id, jobTitle: 'مندوب مبيعات' }, 400, OTHER_UNIT],
    [{ positionId: made.team.id }, 400, OTHER_UNIT],
  ]) assert.deepEqual(answer(await hire(users.creator, extraBody)), [status, message], JSON.stringify(extraBody))
  expectStatus(await request(users.hrA, 'PATCH', `/positions/${id}`, { status: 'FROZEN' }), 200)
  assert.deepEqual(answer(await hire(users.creator, { positionId: id })), [400, 'الوظيفة دي مجمّدة: مفيش تعيين عليها'])
  expectStatus(await request(users.hrA, 'PATCH', `/positions/${id}`, { status: 'CANCELLED' }), 200)
  assert.deepEqual(answer(await hire(users.creator, { positionId: id })), [400, 'الوظيفة دي ملغية: مفيش تعيين عليها'])
  expectStatus(await request(users.hrA, 'PATCH', `/positions/${id}`, { status: 'ACTIVE' }), 200)
  assert.equal((await hire(users.creator, { positionId: 'abc' })).status, 400)
  assert.equal(await employeesNamed('معيّن جديد'), people, 'ولا موظف اتعمل من التعيين المرفوض')
})

test('PS-07: التعيين والإنفاذ مفعّل — من غير وظيفة مرفوض، وعلى مليانة مرفوض، وعلى اللي فيها شاغر مقبول؛ وتعيينين على آخر مقعد واحد بس', async () => {
  const id = made.accountants.id
  await setEnforce(true)
  assert.equal((await list(users.hrA)).enforce, true)
  const people = await employeesNamed('معيّن جديد')
  assert.deepEqual(answer(await hire(users.creator)), [400, REQUIRED])
  // مليانة (3 معتمد و4 مشغول): مرفوض برقمها
  assert.deepEqual(answer(await hire(users.creator, { positionId: id })), [409, 'الوظيفة دي مليانة: معتمد لها 3 ومشغول 4'])
  assert.equal(await employeesNamed('معيّن جديد'), people)
  // «خلص لما»: فيها شاغر = مقبول، ولما تتملي = مرفوض
  expectStatus(await request(users.hrA, 'PATCH', `/positions/${id}`, { headcount: 5 }), 200)
  const ok = expectStatus(await hire(users.creator, { positionId: id }), 201)
  assert.equal(await holderOf(ok.id), id)
  assert.deepEqual(counts(await rowOf(users.hrA, id)), [5, 5, 0, 0])
  assert.deepEqual(answer(await hire(users.creator, { positionId: id })), [409, 'الوظيفة دي مليانة: معتمد لها 5 ومشغول 5'])
  // تعيينين في نفس اللحظة على آخر مقعد: واحد بس
  expectStatus(await request(users.hrA, 'PATCH', `/positions/${id}`, { headcount: 6 }), 200)
  const racing = await releaseTogether('SELECT [id] FROM [positions] WITH (UPDLOCK, ROWLOCK) WHERE [id] = @0', [id], 1,
    () => Promise.all([hire(users.creator, { positionId: id }), hire(users.creator, { positionId: id })]))
  assert.deepEqual(racing.map(response => response.status).sort(), [201, 409], JSON.stringify(racing.map(response => response.body?.message)))
  assert.deepEqual(counts(await rowOf(users.hrA, id)), [6, 6, 0, 0])
  // ربطين في نفس اللحظة على آخر مقعد: الاتنين بيقفوا على صف الوظيفة، وواحد بس بياخده
  expectStatus(await request(users.hrA, 'PATCH', `/positions/${id}`, { headcount: 7 }), 200)
  const linkOf = employeeId => request(users.hrA, 'POST', `/positions/${id}/holders`, { employeeId })
  const twoLinks = await releaseTogether('SELECT [id] FROM [positions] WITH (UPDLOCK, ROWLOCK) WHERE [id] = @0', [id], 2, () => Promise.all([linkOf(made.plainHire.id), linkOf(emps.t1.id)]), 2)
  assert.deepEqual(twoLinks.map(response => response.status).sort(), [201, 409], JSON.stringify(twoLinks.map(response => response.body?.message)))
  assert.deepEqual(counts(await rowOf(users.hrA, id)), [7, 7, 0, 0])
  // تعيين وربط على آخر مقعد: الربط واقف بعد ما عدّ الشاغلين (وصف الوظيفة معاه)، والتعيين لازم يستناه على صف الوظيفة — واحد بس بياخده
  expectStatus(await request(users.hrA, 'PATCH', `/positions/${id}`, { headcount: 8 }), 200)
  const loser = twoLinks[0].status === 409 ? made.plainHire.id : emps.t1.id
  const positions = app.get(require('../src/positions/positions.service').PositionsService), occupiedOf = positions.occupiedOf
  const latch = () => { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }
  const counted = latch(), go = latch()
  let held = false
  positions.occupiedOf = async function (...args) {
    const result = await occupiedOf.apply(this, args)
    // مسار الربط بس (بيعدّ من غير الموظف نفسه)، وأول مرة
    if (!held && args[2]) { held = true; counted.resolve(); await go.promise }
    return result
  }
  let linking, hiring
  try {
    linking = linkOf(loser); linking.catch(() => undefined)
    // لو الربط خلص من غير ما يقف عند العدّ (العدّ اتغيّر شكله) الاختبار بيقع بدل ما يستنى
    await Promise.race([counted.promise, linking.then(response => { throw new Error('الربط خلص قبل الوقفة: ' + JSON.stringify(response.body).slice(0, 200)) })])
    hiring = hire(users.creator, { positionId: id }); hiring.catch(() => undefined)
    let blocked = 0
    for (let waited = 0; waited < 8000 && blocked < 1; waited += 50) {
      await new Promise(resolve => setTimeout(resolve, 50))
      blocked = Number((await query('SELECT COUNT(*) AS [n] FROM sys.dm_exec_requests WHERE [database_id] = DB_ID() AND [blocking_session_id] <> 0'))[0].n)
    }
    assert.ok(blocked >= 1, 'التعيين واقف على صف الوظيفة اللي الربط ماسكه')
    go.resolve()
    const [linked, hired] = await Promise.all([linking, hiring])
    assert.deepEqual([linked.status, hired.status], [201, 409], JSON.stringify([linked.body?.message, hired.body?.message]))
    assert.deepEqual(counts(await rowOf(users.hrA, id)), [8, 8, 0, 0])
  } finally {
    go.resolve()
    await Promise.allSettled([linking, hiring].filter(Boolean))
    positions.occupiedOf = occupiedOf
  }
  // ونفس الحكم على الربط من الشاشة: مليانة مرفوضة، ونقل شاغلها نفسه مقبول
  assert.deepEqual(answer(await request(users.hrA, 'POST', `/positions/${id}/holders`, { employeeId: emps.s1.id })), [400, OTHER_UNIT])
  const spare = await employee({ departmentId: org.finance.id, jobTitle: 'محاسب' })
  assert.deepEqual(answer(await request(users.hrA, 'POST', `/positions/${id}/holders`, { employeeId: spare.id })), [409, 'الوظيفة دي مليانة: معتمد لها 8 ومشغول 8'])
  await repo('Employee').update({ id: spare.id }, { status: 'terminated' })
  expectStatus(await request(users.hrA, 'POST', `/positions/${id}/holders`, { employeeId: emps.a1.id }), 201)
  // والموديول مقفول: الإنفاذ مابيمسكش (الميزة تبع موديولها)
  await setModule(false)
  const closed = expectStatus(await hire(users.creator), 201)
  assert.equal(await holderOf(closed.id), null)
  await setModule(true)
  await setEnforce(false)
})

test('PS-08: قايمة الاختيار في نموذج التعيين — النشطة في الفرع بأرقامها، لصاحب «تعيين موظف جديد»، وفرع برّه النطاق فاضي', async () => {
  const options = (user, branchId) => request(user, 'GET', `/positions/options?branchId=${branchId}`)
  const body = expectStatus(await options(users.creator, org.branchA.id), 200)
  assert.deepEqual([body.available, body.enforce], [true, false])
  assert.deepEqual(body.positions.map(row => row.id).sort((a, b) => a - b), [made.accountants.id, made.team.id, made.wide.id].sort((a, b) => a - b))
  const accountants = body.positions.find(row => row.id === made.accountants.id)
  assert.deepEqual([accountants.code, accountants.title, accountants.departmentId, accountants.teamId, accountants.headcount, accountants.occupied, accountants.vacant],
    [made.accountants.code, 'محاسب', org.finance.id, null, 8, 8, 0])
  assert.equal('budget' in accountants, false, 'الميزانية مش في قايمة التعيين')
  // المجمّدة والملغية برّه القايمة
  expectStatus(await request(users.hrA, 'PATCH', `/positions/${made.wide.id}`, { status: 'FROZEN' }), 200)
  assert.equal(expectStatus(await options(users.creator, org.branchA.id), 200).positions.some(row => row.id === made.wide.id), false)
  expectStatus(await request(users.hrA, 'PATCH', `/positions/${made.wide.id}`, { status: 'ACTIVE' }), 200)
  // فرع برّه النطاق، أو رقم مش صحيح: فاضي
  for (const branchId of [org.branchB.id, 999999, 'abc']) assert.deepEqual(expectStatus(await options(users.creator, branchId), 200).positions, [], String(branchId))
  assert.deepEqual(expectStatus(await options(users.hrB, org.branchB.id), 200).positions.map(row => row.id), [made.otherBranch.id])
  assert.equal((await options(users.nobody, org.branchA.id)).status, 403)
  for (const user of [users.viewerA, users.hrA]) assert.equal((await options(user, org.branchA.id)).status, 200, user.email)
})

test('PS-09: التوليد من الموجود — المعاينة والتطبيق، وآمن للتكرار، وفي النطاق بس', async () => {
  const preview = user => request(user, 'GET', '/positions/generate')
  const plan = expectStatus(await preview(users.hrA), 200)
  const groupOf = (body, department, title) => body.groups.find(group => group.departmentId === (department ? department.id : null) && group.title === title) ?? null
  // المبيعات: «مندوب مبيعات» (s1) له وظيفة على مستوى الفرع مش على القسم — فبتتعمل له وظيفة قسم؛ و«مسمى حر» متخطّى
  const seller = groupOf(plan, org.sales, 'مندوب مبيعات'), loose = groupOf(plan, org.sales, 'مسمى حر مش في الكتالوج')
  assert.deepEqual([seller.action, seller.employees, seller.branchName, seller.departmentName], ['create', 1, 'فرع الوظائف أ', 'قسم المبيعات'])
  assert.deepEqual([loose.action, loose.reason, loose.employees], ['skip', 'المسمى مش في كتالوج المسميات', 1])
  // المالية: محاسبين من غير وظيفة (المعيّنين من غير وظيفة) ولهم وظيفة قايمة في نفس القسم — متخطّى بسببه
  const accountants = groupOf(plan, org.finance, 'محاسب')
  assert.deepEqual([accountants.action, accountants.reason], ['skip', 'فيه وظيفة معتمدة بنفس المسمى في نفس الوحدة — اربطهم بيها من الشاشة'])
  assert.equal(plan.groups.some(group => group.branchId === org.branchB.id), false, 'فرع برّه النطاق مش في المعاينة')
  assert.deepEqual([plan.totals.create, plan.totals.createEmployees, plan.totals.skip], [1, 1, plan.groups.length - 1])
  assert.equal((await preview(users.viewerA)).status, 403)
  // التطبيق: وظيفة نشطة على القسم بعدد موظفيها ومربوطين بيها، وسطر تدقيق
  const positions = Number((await query('SELECT COUNT(*) AS [n] FROM [positions]'))[0].n)
  const done = expectStatus(await request(users.hrA, 'POST', '/positions/generate'), 201)
  assert.deepEqual(done, { created: 1, linked: 1 })
  const [generated] = await query('SELECT TOP 1 * FROM [positions] ORDER BY [id] DESC')
  assert.deepEqual([generated.jobTitleId, generated.branchId, generated.departmentId, generated.teamId, generated.headcount, generated.status],
    [catalog.seller.id, org.branchA.id, org.sales.id, null, 1, 'ACTIVE'])
  assert.equal(await holderOf(emps.s1.id), generated.id)
  assert.equal(Number((await query('SELECT COUNT(*) AS [n] FROM [positions]'))[0].n), positions + 1)
  assert.equal(await audits('POSITIONS_GENERATED'), 1)
  // آمن للتكرار: ولا وظيفة جديدة
  assert.deepEqual(expectStatus(await request(users.hrA, 'POST', '/positions/generate'), 201), { created: 0, linked: 0 })
  assert.equal(await audits('POSITIONS_GENERATED'), 1)
  // وحساب الفرع التاني: موظفه «محاسب» وله وظيفة فرع (مش قسم) — بتتعمل له وظيفة قسمه؛ ومالوش أي أثر على فرع أ
  const other = expectStatus(await preview(users.hrB), 200)
  assert.deepEqual(other.groups.map(group => [group.branchId, group.departmentId, group.title, group.action]), [[org.branchB.id, org.bDepartment.id, 'محاسب', 'create']])
  assert.deepEqual(expectStatus(await request(users.hrB, 'POST', '/positions/generate'), 201), { created: 1, linked: 1 })
  assert.deepEqual((await list(users.hrA)).positions.every(row => row.branchId === org.branchA.id), true)
})

test('PS-10: حالة الموديول والإنفاذ بتتقري قبل معاملة التعيين ومعاملة الربط مش جواها (درس Codex CRP2Y-B02)', async () => {
  // قراءة خدمة الموديولات من مخزنها محتاجة اتصال تاني لو كاشها فاضي، والمعاملة ماسكة اتصالها: معاملات كتير كانت هتستنفد المخزن
  const { EntityManager } = require('../node_modules/typeorm')
  const transaction = EntityManager.prototype.transaction, enabled = modules.isEnabled, feature = modules.isFeatureEnabled
  const OURS = ['positions', 'positions.enforce_on_hiring']
  let open = 0, inside = 0, before = 0
  const count = key => { if (!OURS.includes(key)) return; if (open > 0) inside++; else before++ }
  EntityManager.prototype.transaction = async function (...args) { open++; try { return await transaction.apply(this, args) } finally { open-- } }
  modules.isEnabled = async function (...args) { count(args[0]); return enabled.apply(this, args) }
  modules.isFeatureEnabled = async function (...args) { count(args[0]); return feature.apply(this, args) }
  try {
    const position = await createPosition(users.hrA, { jobTitleId: catalog.accountant.id, branchId: org.branchA.id, departmentId: org.sales.id, headcount: 3 })
    const hired = expectStatus(await hire(users.creator, { positionId: position.id, departmentId: org.sales.id }), 201)
    assert.equal(await holderOf(hired.id), position.id)
    expectStatus(await request(users.hrA, 'POST', `/positions/${position.id}/holders`, { employeeId: emps.free.id }), 201)
    expectStatus(await request(users.hrA, 'DELETE', `/positions/${position.id}/holders/${emps.free.id}`), 200)
    assert.equal(inside, 0, 'ولا قراءة لحالة الموديول أو الإنفاذ ومعاملة مفتوحة')
    assert.ok(before >= 3, `الحالة اتقرت قبل المعاملات (${before})`)
  } finally {
    EntityManager.prototype.transaction = transaction
    modules.isEnabled = enabled
    modules.isFeatureEnabled = feature
  }
})
