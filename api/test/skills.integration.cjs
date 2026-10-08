'use strict'
// B5.4 (أ) على SQL حقيقي: المهارات — الموديول مقفول افتراضيًا، الترحيلات 155–157 (والأعمدة على employee_skills القايم من غير ما ملف الموظف يتأثر)،
// المكتبة، المهارات المطلوبة للوظيفة المعتمدة، تقييم مهارة الموظف (صاحب الصلاحية في نطاقه أو المدير المباشر)، ومصفوفة الفجوة.
// و(ب): الإحلال — الوظائف الحرجة وخلفاؤها (ترحيلي 158 و159)، بصلاحيته السرّية ونطاقه. قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const migrate = require('../scripts/db-migrate.cjs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_skills_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_skills_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-skills-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/skills/skills')
const succession = require('../src/skills/succession')
const MIGRATIONS = ['20261010_155_skills.sql', '20261010_156_position_skill_requirements.sql', '20261010_157_employee_skill_links.sql'].map(name => path.resolve(apiRoot, '..', 'docs', 'migrations', 'payroll', name))
const LINK_COLUMNS = ['skillId', 'source', 'assessedByUserId', 'assessedAt', 'validUntil']
let master, pool, app, ds, base, modules, created = false, sequence = 0
const B = {}, D = {}, E = {}, U = {}, P = {}, S = {}
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
const employee = (name, branch, extra = {}) => repo('Employee').save({ employeeCode: 'SK' + ++sequence, fullName: name, branchId: branch.id, joinDate: '2020-01-01',
  basicSalary: 5000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'cash', ...extra })
const account = (label, branch, permissions, extra = {}) => repo('User').save({ email: `${label}@skills.invalid`, displayName: 'حساب ' + label, passwordHash: 'test-only', role: 'employee', branchId: branch.id,
  permissions: JSON.stringify(permissions), ...extra })
const position = async (title, branch, department) => {
  const jobTitle = await repo('JobTitle').save({ title, isActive: true })
  return repo('ApprovedPosition').save({ jobTitleId: jobTitle.id, gradeId: null, branchId: branch.id, departmentId: department ? department.id : null, teamId: null, costCenterId: null, headcount: 3, status: 'ACTIVE', budget: null,
    createdAt: new Date() })
}
const seat = (person, post) => repo('PositionHolder').save({ employeeId: person.id, positionId: post.id, assignedByUserId: U.admin.id, assignedAt: new Date() })
const runMigrations = async () => { assert.match(database, NAME); for (const file of MIGRATIONS) for (const batch of migrate.splitBatches(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'))) await pool.request().batch(batch) }
const linkColumns = async () => (await pool.request().query(`SELECT c.[name], TYPE_NAME(c.[system_type_id]) AS [type], c.[max_length] AS [size], c.[is_nullable] AS [nullable] FROM sys.columns c
  WHERE c.[object_id] = OBJECT_ID(N'dbo.employee_skills') AND c.[name] IN (${LINK_COLUMNS.map(name => `N'${name}'`).join(', ')}) ORDER BY c.[name]`)).recordset.map(row => `${row.name}:${row.type}:${row.size}:${row.nullable ? 1 : 0}`)
const day = offset => new Date(Date.now() + offset * 86400000).toLocaleDateString('en-CA')
const assess = (user, person, skillId, body) => request(user, 'PUT', `/skills/employees/${person.id}/${skillId}`, body)
const rowOf = async (user, person, route = '/skills/matrix') => ok(await request(user, 'GET', route)).rows.find(row => row.employeeId === person.id)
const cellsOf = row => row.cells.map(cell => [cell.skillName, cell.required, cell.level, cell.status])

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
  B.riyadh = await repo('Branch').save({ code: 'SK_1', name: 'فرع الرياض', country: 'SA' })
  B.cairo = await repo('Branch').save({ code: 'SK_2', name: 'فرع القاهرة', country: 'EG' })
  D.plant = await repo('Department').save({ name: 'المصنع', code: 'SK_PL', branchId: B.riyadh.id })
  U.admin = await repo('User').save({ email: 'admin@skills.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', scopeAllBranches: true, permissions: '[]' })
  E.boss = await employee('مدير المصنع', B.riyadh); E.one = await employee('فني أول', B.riyadh, { managerEmployeeId: E.boss.id }); E.two = await employee('فني تاني', B.riyadh, { managerEmployeeId: E.boss.id })
  E.free = await employee('موظف من غير وظيفة', B.riyadh, { managerEmployeeId: E.boss.id }); E.cairo = await employee('فني القاهرة', B.cairo)
  U.boss = await account('boss', B.riyadh, [], { employeeId: E.boss.id }); U.one = await account('one', B.riyadh, [], { employeeId: E.one.id }); U.two = await account('two', B.riyadh, [], { employeeId: E.two.id })
  U.hr = await account('hr', B.riyadh, ['skills.manage', 'employees.view', 'employees.edit']); U.hrCairo = await account('hr-cairo', B.cairo, ['skills.manage'])
  E.hr = await employee('موظف الموارد البشرية', B.riyadh)
  U.hrSelf = await account('hr-self', B.riyadh, ['skills.manage'], { employeeId: E.hr.id })
  U.loose = await account('loose', B.riyadh, ['employees.view'])
  P.tech = await position('فني تشغيل', B.riyadh, D.plant); P.cairo = await position('فني صيانة', B.cairo, null); P.gone = await position('وظيفة ملغاة', B.riyadh, D.plant)
  await repo('ApprovedPosition').update({ id: P.gone.id }, { status: 'CANCELLED' })
  await seat(E.one, P.tech); await seat(E.two, P.tech); await seat(E.cairo, P.cairo)
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

test('SK-01: الموديول مقفول افتراضيًا = مفيش مسار؛ وقبل الترحيلات الشاشة بتقول ناقص وملف الموظف شغال زي ما هو؛ والترحيلات بشكل الكيانات وبتتكرر بأمان', async () => {
  assert.equal(await modules.isEnabled('skills'), false)
  assert.deepEqual([(await request(U.admin, 'GET', '/skills/catalog')).status, (await request(U.one, 'GET', '/skills/my')).status, (await request(U.boss, 'GET', '/skills/my-team')).status], [404, 404, 404])
  // المهارات بتعتمد على الوظائف المعتمدة
  assert.notEqual((await request(U.admin, 'PUT', '/modules/skills', { enabled: true })).status, 200)
  ok(await request(U.admin, 'PUT', '/modules/positions', { enabled: true })); ok(await request(U.admin, 'PUT', '/modules/skills', { enabled: true })); modules.invalidate()
  for (const migration of MIGRATIONS) {
    const text = fs.readFileSync(migration), code = path.basename(migration).split('_')[1]
    assert.equal(text.includes(Buffer.from('\r\n')), false, 'LF بس — git بيخزّن الملف LF')
    assert.notDeepEqual([...text.subarray(0, 3)], [0xef, 0xbb, 0xbf])
    assert.ok(String(text).match(/THROW \d+/g).every(found => new RegExp(`^THROW ${code}0\\d\\d$`).test(found)), code)
    assert.doesNotMatch(String(text), /\bDROP\b|\bTRUNCATE\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b/i)
  }
  // الترحيلات على جداول الكيانات (synchronize) بتعدّي = نفس الشكل
  const shape = ['assessedAt:datetime2:8:1', 'assessedByUserId:int:4:1', 'skillId:int:4:1', 'source:nvarchar:40:1', 'validUntil:date:3:1']
  assert.deepEqual(await linkColumns(), shape)
  await runMigrations()
  // قبل الترحيلات: الجدولين والأعمدة مش موجودين
  await pool.request().batch('DROP TABLE dbo.position_skill_requirements'); await pool.request().batch('DROP TABLE dbo.skills')
  for (const column of LINK_COLUMNS) await pool.request().batch(`ALTER TABLE dbo.employee_skills DROP COLUMN [${column}]`)
  rules.resetSkillsCache()
  assert.deepEqual(await linkColumns(), [])
  assert.deepEqual([ok(await request(U.admin, 'GET', '/skills/catalog')).ready, ok(await request(U.one, 'GET', '/skills/my')), ok(await request(U.boss, 'GET', '/skills/my-team'))], [false, { ready: false, row: null }, { rows: [] }])
  for (const [method, route, body] of [['POST', '/skills/catalog', { name: 'لحام' }], ['GET', '/skills/positions'], ['GET', '/skills/matrix'], ['PUT', `/skills/positions/${P.tech.id}`, { requirements: [] }],
    ['PUT', `/skills/employees/${E.one.id}/1`, { level: 'expert' }]]) refused(await request(U.admin, method, route, body), 400, rules.SKILLS_MIGRATION_MISSING)
  // ملف الموظف (المهارات الحرة) شغال قبل الترحيل: إضافة وقراءة وحذف
  const free = ok(await request(U.hr, 'POST', `/employees/${E.one.id}/skills`, { name: 'قيادة رافعة', level: 'advanced', yearsExperience: 4 }), 201)
  assert.deepEqual(ok(await request(U.hr, 'GET', `/employees/${E.one.id}/qualifications`)).skills.map(row => [row.name, row.level, row.yearsExperience]), [['قيادة رافعة', 'advanced', 4]])
  // عمود موجود بشكل غلط بيوقّف الترحيل
  await pool.request().batch('ALTER TABLE dbo.employee_skills ADD [skillId] nvarchar(10) NULL')
  await assert.rejects(runMigrations(), /157002|skillId/)
  await pool.request().batch('ALTER TABLE dbo.employee_skills DROP COLUMN [skillId]')
  await runMigrations(); await runMigrations()
  assert.deepEqual(await linkColumns(), shape)
  const ready = ok(await request(U.admin, 'GET', '/skills/catalog'))
  assert.deepEqual([ready.ready, ready.canEdit, ready.skills, ready.levels.map(level => level.code)], [true, true, [], ['beginner', 'intermediate', 'advanced', 'expert']])
  // المهارة الحرة لسه في ملف الموظف بعد الترحيل، ومن غير ربط
  assert.deepEqual(ok(await request(U.hr, 'GET', `/employees/${E.one.id}/qualifications`)).skills.map(row => row.id), [free.id])
  assert.equal((await pool.request().query(`SELECT [skillId] FROM dbo.employee_skills WHERE [id] = ${Number(free.id)}`)).recordset[0].skillId, null)
})

test('SK-02: المكتبة — تعريف للشركة كلها (الكتابة لحساب بكل الفروع)، بقيم متحكم فيها واسم مايتكررش، وبسطر تدقيق', async () => {
  assert.equal((await request(U.loose, 'GET', '/skills/catalog')).status, 403)
  assert.equal(ok(await request(U.hr, 'GET', '/skills/catalog')).canEdit, false)
  assert.equal((await request(U.hr, 'POST', '/skills/catalog', { name: 'لحام' })).status, 403)
  for (const [body, message] of [[{ name: 'ل' }, 'اسم المهارة من حرفين لحد 120 حرف'], [{ name: 'لحام', category: 'x'.repeat(81) }, 'التصنيف 80 حرف بالكتير'], [{ name: 'لحام', isActive: 'yes' }, '«مفعّلة» نعم أو لا']]) {
    refused(await request(U.admin, 'POST', '/skills/catalog', body), 400, message)
  }
  S.weld = ok(await request(U.admin, 'POST', '/skills/catalog', { name: '  لحام   كهربائي ', category: 'فني' }), 201).id
  S.safety = ok(await request(U.admin, 'POST', '/skills/catalog', { name: 'سلامة مهنية', category: 'شهادات', description: 'شهادة سارية' }), 201).id
  S.forklift = ok(await request(U.admin, 'POST', '/skills/catalog', { name: 'قيادة رافعة شوكية' }), 201).id
  S.old = ok(await request(U.admin, 'POST', '/skills/catalog', { name: 'مهارة قديمة' }), 201).id
  refused(await request(U.admin, 'POST', '/skills/catalog', { name: 'لحام كهربائي' }), 409, 'فيه مهارة بنفس الاسم')
  refused(await request(U.admin, 'PATCH', `/skills/catalog/${S.safety}`, { name: 'لحام كهربائي' }), 409, 'فيه مهارة بنفس الاسم')
  refused(await request(U.admin, 'PATCH', '/skills/catalog/999999', { name: 'حاجة' }), 404, rules.SKILL_NOT_FOUND)
  ok(await request(U.admin, 'PATCH', `/skills/catalog/${S.old}`, { name: 'مهارة قديمة', isActive: false }))
  assert.deepEqual(ok(await request(U.hr, 'GET', '/skills/catalog')).skills.map(row => [row.name, row.category, row.isActive]).sort((a, b) => a[0].localeCompare(b[0], 'ar')),
    [['لحام كهربائي', 'فني', true], ['سلامة مهنية', 'شهادات', true], ['قيادة رافعة شوكية', null, true], ['مهارة قديمة', null, false]].sort((a, b) => a[0].localeCompare(b[0], 'ar')))
  const audit = await pool.request().query(`SELECT [action], COUNT(*) AS n FROM dbo.audit_log WHERE [entityType] = N'skill' GROUP BY [action]`)
  assert.deepEqual(Object.fromEntries(audit.recordset.map(row => [row.action, Number(row.n)])), { SKILL_CREATED: 4, SKILL_UPDATED: 1 })
})

test('SK-03: المهارات المطلوبة للوظيفة — لوظائف نطاق الحساب (غيرها «مش موجودة»)، بتتكتب كلها مع بعض، ومهارة مقفولة أو متكررة مرفوضة', async () => {
  const list = async user => ok(await request(user, 'GET', '/skills/positions')).positions
  assert.deepEqual((await list(U.hr)).map(row => [row.id, row.title, row.branchName, row.departmentName, row.holders, row.requirements]), [[P.tech.id, 'فني تشغيل', 'فرع الرياض', 'المصنع', 2, []]])
  assert.deepEqual((await list(U.hrCairo)).map(row => row.id), [P.cairo.id])
  assert.deepEqual((await list(U.admin)).map(row => row.id).sort(), [P.tech.id, P.cairo.id].sort(), 'الملغاة مش في القايمة')
  const set = (user, id, requirements) => request(user, 'PUT', `/skills/positions/${id}`, { requirements })
  for (const [requirements, message] of [[{ skillId: S.weld }, 'المهارات المطلوبة قايمة (لحد 40 مهارة)'], [[{ skillId: S.weld, level: 'master' }], 'كل مهارة مطلوبة: اختار المهارة والمستوى'],
    [[{ skillId: S.weld, level: 'advanced' }, { skillId: S.weld, level: 'expert' }], 'المهارة متكررة في متطلبات الوظيفة'], [[{ skillId: S.old, level: 'advanced' }], 'مهارة من المهارات مش موجودة أو مقفولة'],
    [[{ skillId: 999999, level: 'advanced' }], 'مهارة من المهارات مش موجودة أو مقفولة']]) refused(await set(U.hr, P.tech.id, requirements), 400, message)
  // وظيفة فرع تاني، أو ملغاة، أو مش موجودة = «مش موجودة»
  for (const id of [P.cairo.id, P.gone.id, 999999]) refused(await set(U.hr, id, []), 404, rules.POSITION_NOT_FOUND)
  assert.equal((await set(U.loose, P.tech.id, [])).status, 403)
  ok(await set(U.hr, P.tech.id, [{ skillId: S.weld, level: 'advanced' }, { skillId: S.safety, level: 'intermediate' }, { skillId: S.forklift, level: 'beginner' }]))
  ok(await set(U.hr, P.tech.id, [{ skillId: S.weld, level: 'advanced' }, { skillId: S.safety, level: 'intermediate' }]))
  assert.deepEqual((await list(U.hr))[0].requirements, [{ skillId: S.weld, level: 'advanced' }, { skillId: S.safety, level: 'intermediate' }])
  assert.equal(await repo('PositionSkillRequirement').count({ where: { positionId: P.tech.id } }), 2)
  ok(await set(U.admin, P.cairo.id, [{ skillId: S.weld, level: 'beginner' }]))
  const audit = await pool.request().query(`SELECT COUNT(*) AS n FROM dbo.audit_log WHERE [action] = N'POSITION_SKILLS_SET'`)
  assert.equal(Number(audit.recordset[0].n), 3)
})

test('SK-04: تقييم المهارة — لصاحب الصلاحية في نطاقه أو للمدير المباشر (غيرهم «الموظف غير موجود»)، ومحدش بيقيّم نفسه، وصف واحد للموظف والمهارة بسطر تدقيق', async () => {
  for (const [body, message] of [[{ level: 'master' }, 'اختار المستوى: مبتدئ، متوسط، متقدم، أو خبير'], [{ level: 'expert', source: 'RUMOR' }, 'المصدر «تقييم» أو «شهادة»'],
    [{ level: 'expert', validUntil: day(30) }, 'تاريخ الصلاحية للشهادة بس'], [{ level: 'expert', source: 'CERTIFICATE', validUntil: '2026-13-01' }, 'تاريخ صلاحية الشهادة مش صحيح']]) {
    refused(await assess(U.hr, E.one, S.weld, body), 400, message)
  }
  // مين يقيّم: حساب من غير صلاحية ومش مديره، وحساب صلاحيته في فرع تاني، وزميله = «الموظف غير موجود»
  for (const user of [U.loose, U.hrCairo, U.two]) refused(await assess(user, E.one, S.weld, { level: 'expert' }), 404, rules.EMPLOYEE_NOT_FOUND)
  refused(await assess(U.hr, { id: 999999 }, S.weld, { level: 'expert' }), 404, rules.EMPLOYEE_NOT_FOUND)
  refused(await assess(U.hr, E.one, S.old, { level: 'expert' }), 404, rules.SKILL_NOT_FOUND)
  refused(await assess(U.hr, E.one, 999999, { level: 'expert' }), 404, rules.SKILL_NOT_FOUND)
  // محدش بيقيّم نفسه — حتى بالصلاحية
  refused(await assess(U.hrSelf, E.hr, S.weld, { level: 'expert' }), 403, 'ماينفعش تقيّم مهارتك بنفسك')
  refused(await assess(U.one, E.one, S.weld, { level: 'expert' }), 404, rules.EMPLOYEE_NOT_FOUND)
  // المدير المباشر بيقيّم مرؤوسه (من غير صلاحية)، وصاحب الصلاحية بيعدّل نفس الصف
  ok(await assess(U.boss, E.one, S.weld, { level: 'intermediate' }))
  ok(await assess(U.hr, E.one, S.weld, { level: 'advanced' }))
  ok(await assess(U.hr, E.one, S.safety, { level: 'expert', source: 'CERTIFICATE', validUntil: day(-1) }))
  const stored = (await pool.request().query(`SELECT [skillId], [name], [level], [source], [assessedByUserId], CONVERT(varchar(10), [validUntil], 23) AS [validUntil] FROM dbo.employee_skills
    WHERE [employeeId] = ${Number(E.one.id)} AND [skillId] IS NOT NULL ORDER BY [skillId]`)).recordset.map(row => Object.values(row))
  assert.deepEqual(stored, [[S.weld, 'لحام كهربائي', 'advanced', 'ASSESSMENT', U.hr.id, null], [S.safety, 'سلامة مهنية', 'expert', 'CERTIFICATE', U.hr.id, day(-1)]])
  // طلبين مع بعض لنفس الموظف والمهارة = صف واحد
  await Promise.all([assess(U.boss, E.two, S.weld, { level: 'beginner' }), assess(U.hr, E.two, S.weld, { level: 'expert' })])
  assert.equal(Number((await pool.request().query(`SELECT COUNT(*) AS n FROM dbo.employee_skills WHERE [employeeId] = ${Number(E.two.id)} AND [skillId] = ${Number(S.weld)}`)).recordset[0].n), 1)
  // المهارة المتقيّمة بتظهر في ملف الموظف مع مهاراته الحرة
  assert.deepEqual(ok(await request(U.hr, 'GET', `/employees/${E.one.id}/qualifications`)).skills.map(row => [row.name, row.level]).sort((a, b) => a[0].localeCompare(b[0], 'ar')),
    [['لحام كهربائي', 'advanced'], ['سلامة مهنية', 'expert'], ['قيادة رافعة', 'advanced']].sort((a, b) => a[0].localeCompare(b[0], 'ar')))
  // سطر التدقيق فيه القديم والجديد والمصدر ومين قيّم بأنهي صفة
  const audit = (await pool.request().query(`SELECT [before], [after] FROM dbo.audit_log WHERE [action] = N'EMPLOYEE_SKILL_ASSESSED' AND [entityId] = N'${Number(E.one.id)}' ORDER BY [id]`)).recordset
    .map(row => [row.before ? JSON.parse(row.before) : null, JSON.parse(row.after)])
  assert.deepEqual(audit.slice(0, 2), [[null, { skillId: S.weld, level: 'intermediate', source: 'ASSESSMENT', validUntil: null, by: 'MANAGER' }],
    [{ skillId: S.weld, level: 'intermediate', source: 'ASSESSMENT', validUntil: null }, { skillId: S.weld, level: 'advanced', source: 'ASSESSMENT', validUntil: null, by: 'RIGHT' }]])
})

test('SK-05: الفجوة — مستوفاة، أقل من المطلوب، مش متقيّمة، وشهادة منتهية؛ والمصفوفة بنطاق الحساب بفرع الموظف الحالي، وللمدير على مرؤوسيه، وللموظف على نفسه', async () => {
  await pool.request().query(`UPDATE dbo.employee_skills SET [level] = N'intermediate' WHERE [employeeId] = ${Number(E.two.id)} AND [skillId] = ${Number(S.weld)}`)
  const one = await rowOf(U.hr, E.one), two = await rowOf(U.hr, E.two)
  assert.deepEqual([one.positionTitle, cellsOf(one), one.gaps], ['فني تشغيل', [['لحام كهربائي', 'advanced', 'advanced', 'MET'], ['سلامة مهنية', 'intermediate', 'expert', 'EXPIRED']], 1])
  assert.deepEqual([cellsOf(two), two.gaps], [[['لحام كهربائي', 'advanced', 'intermediate', 'BELOW'], ['سلامة مهنية', 'intermediate', null, 'MISSING']], 2])
  assert.deepEqual(one.cells[1].statusLabel, 'شهادتها منتهية')
  // تجديد الشهادة بيقفل الفجوة
  ok(await assess(U.hr, E.one, S.safety, { level: 'expert', source: 'CERTIFICATE', validUntil: day(200) }))
  assert.equal((await rowOf(U.hr, E.one)).gaps, 0)
  // مهارة متقيّمة مش مطلوبة للوظيفة = «مهارات تانية»، والحرة مابتدخلش
  ok(await assess(U.hr, E.one, S.forklift, { level: 'beginner' }))
  assert.deepEqual((await rowOf(U.hr, E.one)).extra.map(item => [item.skillName, item.level]), [['قيادة رافعة شوكية', 'beginner']])
  // النطاق بفرع الموظف الحالي؛ واللي من غير وظيفة معتمدة مش في مصفوفة الصلاحية
  const names = async user => ok(await request(user, 'GET', '/skills/matrix')).rows.map(row => row.fullName).sort()
  assert.deepEqual([await names(U.hr), await names(U.hrCairo), (await names(U.admin)).length], [['فني أول', 'فني تاني'].sort(), ['فني القاهرة'], 3])
  await repo('Employee').update({ id: E.two.id }, { branchId: B.cairo.id })
  assert.deepEqual([await names(U.hr), await names(U.hrCairo)], [['فني أول'], ['فني القاهرة', 'فني تاني'].sort()])
  refused(await assess(U.hr, E.two, S.weld, { level: 'expert' }), 404, rules.EMPLOYEE_NOT_FOUND)
  await repo('Employee').update({ id: E.two.id }, { branchId: B.riyadh.id })
  assert.equal((await request(U.loose, 'GET', '/skills/matrix')).status, 403)
  // المدير: مرؤوسيه المباشرين كلهم (باللي من غير وظيفة)، ومحدش غيرهم
  const team = ok(await request(U.boss, 'GET', '/skills/my-team'))
  assert.deepEqual(team.rows.map(row => [row.fullName, row.positionTitle, row.cells.length]), [['فني أول', 'فني تشغيل', 2], ['فني تاني', 'فني تشغيل', 2], ['موظف من غير وظيفة', null, 0]])
  assert.deepEqual(ok(await request(U.one, 'GET', '/skills/my-team')).rows, [])
  // الموظف: فجوته هو بس
  const mine = ok(await request(U.two, 'GET', '/skills/my'))
  assert.deepEqual([mine.ready, mine.row.employeeId, cellsOf(mine.row)], [true, E.two.id, [['لحام كهربائي', 'advanced', 'intermediate', 'BELOW'], ['سلامة مهنية', 'intermediate', null, 'MISSING']]])
  refused(await request(U.hr, 'GET', '/skills/my'), 403, 'حسابك مش مربوط بملف موظف')
  // مرؤوس اتنقل لمدير تاني: المدير القديم مايقيّموش
  await repo('Employee').update({ id: E.two.id }, { managerEmployeeId: null })
  refused(await assess(U.boss, E.two, S.weld, { level: 'expert' }), 404, rules.EMPLOYEE_NOT_FOUND)
  // قفل الموديول: مفيش مسار
  ok(await request(U.admin, 'PUT', '/modules/skills', { enabled: false })); modules.invalidate()
  assert.deepEqual([(await request(U.hr, 'GET', '/skills/matrix')).status, (await assess(U.hr, E.one, S.weld, { level: 'expert' })).status, (await request(U.two, 'GET', '/skills/my')).status], [404, 404, 404])
  ok(await request(U.admin, 'PUT', '/modules/skills', { enabled: true })); modules.invalidate()
})

const SUCCESSION_MIGRATIONS = ['20261010_158_critical_positions.sql', '20261010_159_succession_nominations.sql'].map(name => path.resolve(apiRoot, '..', 'docs', 'migrations', 'payroll', name))
const runSuccessionMigrations = async () => { assert.match(database, NAME); for (const file of SUCCESSION_MIGRATIONS) for (const batch of migrate.splitBatches(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'))) await pool.request().batch(batch) }
const X = '/skills/succession'
const plan = async (user, positionId) => ok(await request(user, 'GET', X)).positions.find(row => row.id === positionId)
const mark = (user, positionId, body) => request(user, 'PUT', `${X}/positions/${positionId}`, body)
const nominate = (user, positionId, body) => request(user, 'POST', `${X}/positions/${positionId}/nominations`, body)

test('SK-06: الإحلال — سرّي بصلاحيته، وقبل الترحيلين الشاشة بتقول ناقص؛ الوظيفة الحرجة بسبب وفي نطاق الحساب؛ والمرشح على رأس العمل في النطاق ومش شاغل الوظيفة ومش متكرر', async () => {
  U.talent = await account('talent', B.riyadh, ['succession.manage']); U.talentCairo = await account('talent-cairo', B.cairo, ['succession.manage'])
  // صلاحية المهارات مش صلاحية الإحلال، والمرشح أو أي موظف مالوش مسار
  for (const user of [U.hr, U.loose, U.boss, U.one]) assert.equal((await request(user, 'GET', X)).status, 403)
  for (const migration of SUCCESSION_MIGRATIONS) {
    const text = fs.readFileSync(migration), code = path.basename(migration).split('_')[1]
    assert.equal(text.includes(Buffer.from('\r\n')), false, 'LF بس — git بيخزّن الملف LF')
    assert.notDeepEqual([...text.subarray(0, 3)], [0xef, 0xbb, 0xbf])
    assert.ok(String(text).match(/THROW \d+/g).every(found => new RegExp(`^THROW ${code}0\\d\\d$`).test(found)), code)
    assert.doesNotMatch(String(text), /\bDROP\b|\bTRUNCATE\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b/i)
  }
  await runSuccessionMigrations()
  await pool.request().batch('DROP TABLE dbo.succession_nominations'); await pool.request().batch('DROP TABLE dbo.critical_positions'); succession.resetSuccessionCache()
  assert.deepEqual((({ ready, positions, candidates }) => [ready, positions, candidates])(ok(await request(U.talent, 'GET', X))), [false, [], []])
  refused(await mark(U.talent, P.tech.id, { critical: true, reason: 'وظيفة تشغيل أساسية' }), 400, succession.SUCCESSION_MIGRATION_MISSING)
  refused(await nominate(U.talent, P.tech.id, { employeeId: E.free.id, readiness: 'READY_NOW' }), 400, succession.SUCCESSION_MIGRATION_MISSING)
  await runSuccessionMigrations(); await runSuccessionMigrations()
  const first = await plan(U.talent, P.tech.id)
  assert.deepEqual([first.critical, first.reason, first.nominations, first.requirements, first.holders, first.hiddenHolders], [false, null, [], 0, [], 0], 'تفاصيل الوظيفة للحرجة بس')
  assert.deepEqual(ok(await request(U.talent, 'GET', X)).readiness.map(row => row.code), ['READY_NOW', 'ONE_TO_TWO', 'THREE_PLUS'])
  // تعليم «حرجة»
  for (const [body, message] of [[{ critical: 'yes' }, '«حرجة» نعم أو لا'], [{ critical: true }, 'اكتب سبب اعتبار الوظيفة حرجة'], [{ critical: true, reason: 'x'.repeat(301) }, 'السبب 300 حرف بالكتير']]) refused(await mark(U.talent, P.tech.id, body), 400, message)
  for (const id of [P.cairo.id, P.gone.id, 999999]) refused(await mark(U.talent, id, { critical: true, reason: 'سبب' }), 404, rules.POSITION_NOT_FOUND)
  refused(await nominate(U.talent, P.tech.id, { employeeId: E.free.id, readiness: 'READY_NOW' }), 400, 'الوظيفة مش متعلّمة «حرجة» — علّمها الأول')
  ok(await mark(U.talent, P.tech.id, { critical: true, reason: '  وظيفة تشغيل   أساسية ' }))
  ok(await mark(U.talent, P.tech.id, { critical: true, reason: 'وظيفة تشغيل أساسية' }))
  assert.equal(await repo('CriticalPosition').count({ where: { positionId: P.tech.id } }), 1, 'صف واحد للوظيفة')
  const marked = await plan(U.talent, P.tech.id)
  assert.deepEqual([marked.critical, marked.reason, marked.requirements, marked.holders, marked.hiddenHolders], [true, 'وظيفة تشغيل أساسية', 2, ['فني أول', 'فني تاني'], 0])
  // الترشيح
  E.gone = await employee('موظف منتهي', B.riyadh, { status: 'terminated', isActive: false })
  for (const [body, message] of [[{ readiness: 'READY_NOW' }, 'اختار الموظف المرشح'], [{ employeeId: E.free.id, readiness: 'SOON' }, 'اختار درجة الجاهزية'], [{ employeeId: E.free.id, readiness: 'READY_NOW', note: 'x'.repeat(301) }, 'الملاحظة 300 حرف بالكتير']]) {
    refused(await nominate(U.talent, P.tech.id, body), 400, message)
  }
  for (const person of [E.cairo, E.gone, { id: 999999 }]) refused(await nominate(U.talent, P.tech.id, { employeeId: person.id, readiness: 'READY_NOW' }), 404, rules.EMPLOYEE_NOT_FOUND)
  refused(await nominate(U.talent, P.tech.id, { employeeId: E.one.id, readiness: 'READY_NOW' }), 400, 'الموظف شاغل الوظيفة نفسها — مايترشحش خليفة ليها')
  refused(await nominate(U.talentCairo, P.tech.id, { employeeId: E.free.id, readiness: 'READY_NOW' }), 404, rules.POSITION_NOT_FOUND)
  const a = ok(await nominate(U.talent, P.tech.id, { employeeId: E.free.id, readiness: 'READY_NOW', note: ' جاهز  يمسك ' }), 201), b = ok(await nominate(U.talent, P.tech.id, { employeeId: E.boss.id, readiness: 'ONE_TO_TWO' }), 201)
  assert.deepEqual([a.rank, b.rank], [1, 2]); S.nomA = a.id; S.nomB = b.id
  refused(await nominate(U.talent, P.tech.id, { employeeId: E.free.id, readiness: 'THREE_PLUS' }), 409, 'الموظف مرشح على الوظيفة دي قبل كده')
  const listed = (await plan(U.talent, P.tech.id)).nominations
  assert.deepEqual(listed.map(row => [row.rank, row.fullName, row.employeeId, row.readiness, row.readinessLabel, row.note, row.nominatedByName, row.hidden, row.gaps]),
    [[1, 'موظف من غير وظيفة', E.free.id, 'READY_NOW', 'جاهز الآن', 'جاهز يمسك', 'حساب talent', false, 2], [2, 'مدير المصنع', E.boss.id, 'ONE_TO_TWO', 'خلال سنة لسنتين', null, 'حساب talent', false, 2]])
  // فجوة المرشح عن مهارات الوظيفة الحرجة بتقل لما مهارته تتقيّم
  ok(await assess(U.hr, E.free, S.weld, { level: 'expert' }))
  assert.equal((await plan(U.talent, P.tech.id)).nominations[0].gaps, 1)
  // المرشحين المتاحين: موظفين نطاق الحساب اللي على رأس العمل بس
  const candidates = ok(await request(U.talent, 'GET', X)).candidates.map(row => row.id)
  assert.deepEqual([candidates.includes(E.free.id), candidates.includes(E.cairo.id), candidates.includes(E.gone.id)], [true, false, false])
})

test('SK-07: الإحلال — مرشح برّه نطاق القارئ من غير اسم ولا رقم؛ التعديل والشيل تحت نطاق الوظيفة ومن غير مسح؛ وشيل علامة «حرجة» بيخفي الخلفاء؛ والمرشح مايعرفش', async () => {
  // المرشح اتنقل لفرع تاني: قارئ فرع الوظيفة يشوفه «خارج نطاقك»، والحساب العام يشوفه كامل
  await repo('Employee').update({ id: E.free.id }, { branchId: B.cairo.id })
  const masked = (await plan(U.talent, P.tech.id)).nominations[0]
  assert.deepEqual([masked.hidden, masked.fullName, masked.employeeId, masked.employeeCode, masked.gaps, masked.rank], [true, succession.HIDDEN_NOMINEE, null, null, null, 1])
  assert.equal(JSON.stringify(await plan(U.talent, P.tech.id)).includes('موظف من غير وظيفة'), false)
  assert.deepEqual((({ hidden, fullName, employeeId }) => [hidden, fullName, employeeId])((await plan(U.admin, P.tech.id)).nominations[0]), [false, 'موظف من غير وظيفة', E.free.id])
  // قارئ الفرع التاني مايشوفش وظيفة الرياض أصلًا، حتى لو المرشح في فرعه
  assert.equal(await plan(U.talentCairo, P.tech.id), undefined)
  await repo('Employee').update({ id: E.free.id }, { branchId: B.riyadh.id })
  // التعديل: الجاهزية والملاحظة والترتيب
  const patch = (user, id, body) => request(user, 'PATCH', `${X}/nominations/${id}`, body)
  for (const [body, message] of [[{ readiness: 'SOON' }, 'اختار درجة الجاهزية'], [{ readiness: 'READY_NOW', rank: 0 }, 'الترتيب رقم صحيح من 1 لحد 10'], [{ readiness: 'READY_NOW', rank: 11 }, 'الترتيب رقم صحيح من 1 لحد 10']]) refused(await patch(U.talent, S.nomA, body), 400, message)
  for (const [user, id] of [[U.talentCairo, S.nomA], [U.talent, 999999]]) refused(await patch(user, id, { readiness: 'READY_NOW' }), 404, succession.NOMINATION_NOT_FOUND)
  assert.equal((await patch(U.hr, S.nomA, { readiness: 'READY_NOW' })).status, 403)
  ok(await patch(U.talent, S.nomA, { readiness: 'THREE_PLUS', note: 'محتاج تدريب', rank: 5 }))
  assert.deepEqual((await plan(U.talent, P.tech.id)).nominations.map(row => [row.rank, row.fullName, row.readiness, row.note]), [[2, 'مدير المصنع', 'ONE_TO_TWO', null], [5, 'موظف من غير وظيفة', 'THREE_PLUS', 'محتاج تدريب']])
  // الشيل: حالة «اتشال» بمين وإمتى، والصف باقي؛ والموظف يترشح تاني بصف جديد
  refused(await request(U.talentCairo, 'DELETE', `${X}/nominations/${S.nomA}`), 404, succession.NOMINATION_NOT_FOUND)
  ok(await request(U.talent, 'DELETE', `${X}/nominations/${S.nomA}`))
  refused(await request(U.talent, 'DELETE', `${X}/nominations/${S.nomA}`), 404, succession.NOMINATION_NOT_FOUND)
  refused(await patch(U.talent, S.nomA, { readiness: 'READY_NOW' }), 404, succession.NOMINATION_NOT_FOUND)
  const removed = await repo('SuccessionNomination').findOneByOrFail({ id: S.nomA })
  assert.deepEqual([removed.status, removed.removedByUserId, removed.removedAt != null], ['REMOVED', U.talent.id, true])
  assert.deepEqual((await plan(U.talent, P.tech.id)).nominations.map(row => row.fullName), ['مدير المصنع'])
  const again = ok(await nominate(U.talent, P.tech.id, { employeeId: E.free.id, readiness: 'READY_NOW' }), 201)
  assert.deepEqual([again.id !== S.nomA, again.rank], [true, 3])
  // طلبين مع بعض لنفس المرشح = ترشيح ساري واحد
  ok(await request(U.talent, 'DELETE', `${X}/nominations/${again.id}`))
  const twice = await Promise.all([nominate(U.talent, P.tech.id, { employeeId: E.free.id, readiness: 'READY_NOW' }), nominate(U.admin, P.tech.id, { employeeId: E.free.id, readiness: 'ONE_TO_TWO' })])
  assert.deepEqual(twice.map(response => response.status).sort(), [201, 409])
  assert.equal(await repo('SuccessionNomination').count({ where: { positionId: P.tech.id, employeeId: E.free.id, status: 'ACTIVE' } }), 1)
  // المرشح مايعرفش: مفيش مسار له، وفجوته ومصفوفة مديره من غير أي أثر للترشيح
  assert.equal((await request(U.boss, 'GET', X)).status, 403)
  for (const [user, route] of [[U.boss, '/skills/my'], [U.boss, '/skills/my-team'], [U.hr, '/skills/matrix']]) assert.doesNotMatch(JSON.stringify(ok(await request(user, 'GET', route))), /nominat|readiness|succession|critical/i)
  // شيل علامة «حرجة»: الخلفاء مابيتعرضوش (وصفوفهم باقية)، ورجوعها بيرجّعهم
  ok(await mark(U.talent, P.tech.id, { critical: false }))
  const plain = await plan(U.talent, P.tech.id)
  assert.deepEqual([plain.critical, plain.nominations, await repo('SuccessionNomination').count({ where: { positionId: P.tech.id, status: 'ACTIVE' } })], [false, [], 2])
  ok(await mark(U.talent, P.tech.id, { critical: true, reason: 'رجعت حرجة' }))
  assert.equal((await plan(U.talent, P.tech.id)).nominations.length, 2)
  const audit = await pool.request().query(`SELECT [action], COUNT(*) AS n FROM dbo.audit_log WHERE [action] LIKE N'SUCCESSION[_]%' OR [action] = N'POSITION_CRITICAL_SET' GROUP BY [action]`)
  assert.deepEqual(Object.fromEntries(audit.recordset.map(row => [row.action, Number(row.n)])), { POSITION_CRITICAL_SET: 4, SUCCESSION_NOMINATED: 4, SUCCESSION_REMOVED: 2, SUCCESSION_UPDATED: 1 })
})

test('SK-08: شبكة 9-box — ميزة فرعية مقفولة افتراضيًا؛ الأداء من آخر تقييم معلن والإمكانات تقدير لموظفين نطاق الحساب بس، صف واحد للموظف، وبصلاحية الإحلال', async () => {
  const N = `${X}/nine-box`, MIGRATION = path.resolve(apiRoot, '..', 'docs', 'migrations', 'payroll', '20261010_160_talent_potentials.sql')
  const migrate160 = async () => { assert.match(database, NAME); for (const batch of migrate.splitBatches(fs.readFileSync(MIGRATION, 'utf8').replace(/\r\n/g, '\n'))) await pool.request().batch(batch) }
  assert.equal(await modules.isFeatureEnabled(succession.NINE_BOX_FEATURE), false)
  assert.deepEqual([(await request(U.talent, 'GET', N)).status, (await request(U.talent, 'PUT', `${N}/${E.one.id}`, { potential: 'HIGH' })).status], [404, 404])
  ok(await request(U.admin, 'PUT', `/modules/features/${succession.NINE_BOX_FEATURE}`, { enabled: true })); modules.invalidate()
  const text = fs.readFileSync(MIGRATION)
  assert.equal(text.includes(Buffer.from('\r\n')), false, 'LF بس — git بيخزّن الملف LF')
  assert.ok(String(text).match(/THROW \d+/g).every(code => /^THROW 1600\d\d$/.test(code)))
  assert.doesNotMatch(String(text), /\bDROP\b|\bTRUNCATE\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b/i)
  await migrate160()
  await pool.request().batch('DROP TABLE dbo.talent_potentials'); succession.resetNineBoxCache()
  assert.deepEqual(ok(await request(U.talent, 'GET', N)), { ready: false, thresholds: { mediumFrom: 60, highFrom: 80 }, rows: [] })
  refused(await request(U.talent, 'PUT', `${N}/${E.one.id}`, { potential: 'HIGH' }), 400, succession.NINE_BOX_MIGRATION_MISSING)
  await migrate160(); await migrate160()
  // تقييمات: آخر معلن هو اللي بيتحسب؛ واللي لسه مااتعلنش مابيتحسبش
  const review = (person, status, finalScore) => repo('ReviewAssignment').save({ cycleId: 1, employeeId: person.id, branchId: person.branchId, managerEmployeeId: null, status, selfSubmittedAt: null, managerSubmittedAt: null,
    selfScore: null, managerScore: null, finalScore, createdAt: new Date() })
  await review(E.one, 'ACKNOWLEDGED', '55.00'); await review(E.one, 'ANNOUNCED', '85.00'); await review(E.two, 'ANNOUNCED', '70.00'); await review(E.boss, 'MANAGER_SUBMITTED', '90.00'); await review(E.cairo, 'ANNOUNCED', '40.00')
  const rows = async user => ok(await request(user, 'GET', N)).rows.map(row => [row.fullName, row.score, row.performance, row.potential, row.box])
  assert.deepEqual(await rows(U.talent), [['فني أول', 85, 'HIGH', null, null], ['فني تاني', 70, 'MEDIUM', null, null]])
  assert.deepEqual(await rows(U.talentCairo), [['فني القاهرة', 40, 'LOW', null, null]])
  // صلاحية المهارات مش كفاية، والموظف مالوش مسار
  for (const user of [U.hr, U.boss, U.one]) assert.equal((await request(user, 'GET', N)).status, 403)
  const rate = (user, person, body) => request(user, 'PUT', `${N}/${person.id}`, body)
  for (const [body, message] of [[{ potential: 'TOP' }, 'اختار تقدير الإمكانات: منخفض، متوسط، أو عالي'], [{ potential: 'HIGH', note: 'x'.repeat(301) }, 'الملاحظة 300 حرف بالكتير']]) refused(await rate(U.talent, E.one, body), 400, message)
  for (const person of [E.cairo, E.gone, { id: 999999 }]) refused(await rate(U.talent, person, { potential: 'HIGH' }), 404, rules.EMPLOYEE_NOT_FOUND)
  assert.equal((await rate(U.hr, E.one, { potential: 'HIGH' })).status, 403)
  ok(await rate(U.talent, E.one, { potential: 'HIGH', note: ' قيادي ' })); ok(await rate(U.talent, E.two, { potential: 'MEDIUM' })); ok(await rate(U.talent, E.two, { potential: 'LOW' })); ok(await rate(U.talent, E.boss, { potential: 'MEDIUM' }))
  await Promise.all([rate(U.talent, E.free, { potential: 'LOW' }), rate(U.admin, E.free, { potential: 'HIGH' })])
  assert.deepEqual([await repo('TalentPotential').count({ where: { employeeId: E.two.id } }), await repo('TalentPotential').count({ where: { employeeId: E.free.id } })], [1, 1])
  // الخانة = الإمكانات × الأداء؛ ومن غير تقييم معلن مفيش خانة
  assert.deepEqual((await rows(U.talent)).filter(row => row[0] !== 'موظف من غير وظيفة'), [['فني أول', 85, 'HIGH', 'HIGH', 9], ['فني تاني', 70, 'MEDIUM', 'LOW', 2], ['مدير المصنع', null, null, 'MEDIUM', null]])
  assert.equal(ok(await request(U.talent, 'GET', N)).rows.find(row => row.employeeId === E.one.id).note, 'قيادي')
  const audit = await pool.request().query(`SELECT COUNT(*) AS n FROM dbo.audit_log WHERE [action] = N'TALENT_POTENTIAL_SET'`)
  assert.equal(Number(audit.recordset[0].n), 6)
  // قفل الميزة: مفيش مسار، وباقي الإحلال شغال
  ok(await request(U.admin, 'PUT', `/modules/features/${succession.NINE_BOX_FEATURE}`, { enabled: false })); modules.invalidate()
  assert.deepEqual([(await request(U.talent, 'GET', N)).status, (await request(U.talent, 'GET', X)).status], [404, 200])
})
