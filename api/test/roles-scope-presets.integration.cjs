'use strict'
// الأدوار ونطاق الفروع (قرارات المالك 22 سبتمبر بعد تدقيق الأدوار ROLES_AUDIT.md) — إثبات حي على قاعدة مؤقتة:
//  1) ترحيل 20260922_064 عبر المُرحّل المجمّع نفسه: العمود الجديد، الأدوار الثلاثة، وتضييق الحزم القديمة «فقط لو لسه مطابقة»
//     (صف معدَّل بإيد المالك مايتلمسش، وصف معاد ترتيبه بيتضيّق)، وجلسات الدور اللي اتغيّر بس هي اللي بتتقفل، وإعادة التشغيل لا تغيّر شيئًا.
//  2) كل دور جديد يعمل قائمته بالظبط وياخد 403 على كل جار (المال، الوحدات التانية، الإعدادات)، والحزم المضيّقة بتتصرف صح.
//  3) «نطاقه: كل الفروع»: الكيان → التوكن → الحارس. مفتوح = يشوف كل الفروع ويكتب إعداد الشركة «بالصلاحية» ويترفض «من غيرها»؛
//     مقفول = فرعه بس؛ غير مدير النظام مايفتحوش ولا يدير حسابًا مفتوحًا له؛ التوكن بيموت مع التغيير؛ والحساب القديم بلا فرع لسه مايشوفش حاجة.
//  4) شاشة الصلاحيات: السجل كامل بوحداته وشرحه ومين شايل كل صلاحية (واليتيمة متعلّمة)، ونسخ دور، والنهائي = دور ∪ منح − سحب.
// قاعدة hr_roles_scope_test_<16 hex> تُنشأ بـsynchronize وتُحذف في النهاية. لا مساس بقاعدة الشركة (hr_system).
// الجلسات من AuthService.issueSession نفسها (نفس توكن الدخول الحقيقي) بسر عشوائي — لا كلمات مرور ولا أسرار.
// Run: node --test --test-concurrency=1 api/test/roles-scope-presets.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(apiRoot, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const { ROLE_PRESETS, LEGACY_SHIPPED_ROLE_PRESETS, ALL_PERMISSIONS, SUPER_ADMIN_ONLY_GRANTS, PERMISSIONS } = require('../src/auth/permissions')
const { employeeRequiredFields } = require('./helpers/employee-fixture.cjs')

const database = `hr_roles_scope_test_${crypto.randomBytes(8).toString('hex')}`
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-roles-scope-migrations-'))
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-roles-scope-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const MIGRATIONS = path.join(repoRoot, 'docs/migrations/payroll')
const FILE = '20260922_064_roles_scope_and_presets.sql'
const DF_NAME = 'DF_20a6fc998d6589e92bb17fe0946'
const preset = code => ROLE_PRESETS.find(role => role.code === code)
const sorted = list => [...list].sort()

let app, ds, master, pool, baseUrl, created = false
let branchA, branchB, deptA, deptB
const u = {}, emp = {}, runs = {}

function assertDisposable() {
  assert.match(database, migrate.DISPOSABLE_DATABASE)
  assert.match(database, /^hr_roles_scope_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  assert.notEqual(database, 'hr_system')
  assert.notEqual(database, 'hr_review_pre_payroll')
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }

async function http(token, method, route, body) {
  const response = await fetch(baseUrl + route, { method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  let parsed = null
  try { parsed = text ? JSON.parse(text) : null } catch { parsed = text }
  return { status: response.status, body: parsed }
}
const expect = (r, status, note = '') => { assert.equal(r.status, status, `${note} ${JSON.stringify(r.body)}`.slice(0, 600)); return r.body }
// نفس جلسة الدخول الحقيقية بالظبط: AuthService.issueSession (الصلاحيات من الدور في القاعدة + التجاوزات، و«كل الفروع» من العمود)
async function session(user) {
  const row = await repo('User').findOneByOrFail({ id: user.id })
  const issued = await app.get(require('../src/auth/auth.service').AuthService).issueSession(row)
  return { token: issued.accessToken, user: issued.user, claims: jwt.decode(issued.accessToken) }
}
// كل نداء في القائمة لازم يرجّع الحالة دي بالظبط
async function allStatus(s, status, calls, who) {
  for (const [method, route, body] of calls) {
    const r = await http(s.token, method, route, body)
    assert.equal(r.status, status, `${who}: ${method} ${route} → ${r.status} (المتوقع ${status}) ${JSON.stringify(r.body).slice(0, 300)}`)
  }
}
// النداء وصل للهاندلر (الصلاحية موجودة): أي حالة غير 401/403
async function reaches(s, calls, who) {
  for (const [method, route, body] of calls) {
    const r = await http(s.token, method, route, body)
    assert.ok(![401, 403].includes(r.status), `${who}: ${method} ${route} → ${r.status} المفروض يعدّي الحارس ${JSON.stringify(r.body).slice(0, 300)}`)
  }
}
async function roleMap() {
  const rows = await ds.query('SELECT code, nameAr, isSystem, isActive, permissions FROM dbo.roles ORDER BY code')
  return Object.fromEntries(rows.map(row => [row.code, { nameAr: row.nameAr, isSystem: !!row.isSystem, isActive: !!row.isActive, raw: row.permissions, permissions: JSON.parse(row.permissions) }]))
}
async function tokenVersions() {
  const rows = await ds.query('SELECT id, tokenVersion FROM dbo.users ORDER BY id')
  return Object.fromEntries(rows.map(row => [row.id, row.tokenVersion]))
}
const branchesOf = rows => [...new Set(rows.map(row => row.branchId))].sort((a, b) => a - b)
// صفوف الرد سواء رجع مصفوفة أو كائن فيه مصفوفة واحدة (rows / items / data ...)
const rowsOf = body => Array.isArray(body) ? body : Object.values(body ?? {}).find(Array.isArray) ?? []

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  const connection = db => ({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME || 'sa', password: env.DB_PASSWORD,
    database: db, options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 10000, requestTimeout: 120000 })
  master = await new sql.ConnectionPool(connection('master')).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => {}
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => {}
  ds = app.get(require('../node_modules/typeorm').DataSource); assertDisposable()
  baseUrl = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  pool = await new sql.ConnectionPool(connection(database)).connect()
  fs.mkdirSync(path.join(base, 'payroll'), { recursive: true })
  fs.copyFileSync(path.join(MIGRATIONS, FILE), path.join(base, 'payroll', FILE))

  branchA = await repo('Branch').save({ name: 'فرع الأدوار أ', code: 'RSA' })
  branchB = await repo('Branch').save({ name: 'فرع الأدوار ب', code: 'RSB' })
  deptA = await repo('Department').save({ name: 'قسم أ', branchId: branchA.id, isActive: true })
  deptB = await repo('Department').save({ name: 'قسم ب', branchId: branchB.id, isActive: true })
  await require('../src/seed/seed-requests').seedRequests(ds)

  let n = 0
  const employee = async (branch, dept, overrides = {}) => repo('Employee').save({
    ...(await employeeRequiredFields(ds, branch.id)), employeeCode: `RS${String(++n).padStart(3, '0')}`, fullName: `موظف أدوار ${n}`,
    branchId: branch.id, departmentId: dept.id, teamId: null, joinDate: '2022-01-01', basicSalary: 6000, currency: 'SAR',
    status: 'active', isActive: true, payMethod: 'transfer', bankName: 'بنك الاختبار', iban: `SA00000000000000000010${String(n).padStart(2, '0')}`, ...overrides })
  emp.managerA = await employee(branchA, deptA, { jobTitle: 'مدير عمليات' })
  emp.a1 = await employee(branchA, deptA, { managerEmployeeId: emp.managerA.id })
  emp.a2 = await employee(branchA, deptA, { managerEmployeeId: emp.managerA.id })
  emp.spareA = await employee(branchA, deptA, { managerEmployeeId: emp.managerA.id })
  emp.b1 = await employee(branchB, deptB)

  // حالة جدول roles قبل الترحيل = حالة hr_system: الأدوار النظامية + الحزم اللي شحنها المستورد
  const role = (code, nameAr, permissions, isSystem = false) => repo('Role').save({ code, nameAr, isSystem, isActive: true, permissions: JSON.stringify(permissions) })
  for (const item of ROLE_PRESETS.filter(r => r.isSystem)) await role(item.code, item.nameAr, item.permissions, true)
  await role('payroll_manager', 'مدير الرواتب', LEGACY_SHIPPED_ROLE_PRESETS.payroll_manager)                      // مطابق بالحرف → يتضيّق
  await role('read_only', 'قراءة فقط', [...LEGACY_SHIPPED_ROLE_PRESETS.read_only].reverse())                        // نفس المجموعة بترتيب تاني → يتضيّق
  await role('data_entry', 'مدخل بيانات', [...LEGACY_SHIPPED_ROLE_PRESETS.data_entry, 'reports.view'])             // المالك عدّله → مايتلمسش
  await role('payroll_disburser', 'صرّاف (دور المالك)', ['payroll.view'])                                           // كود موجود قبل الترحيل → مايتلمسش

  const user = (key, roleCode, branchId, extra = {}) => repo('User').save({ email: `${key}@roles-scope.example.com`, displayName: `rs ${key}`,
    passwordHash: 'test-only', role: roleCode, branchId, employeeId: null, permissions: null, ...extra }).then(row => { u[key] = row })
  await user('admin', 'super_admin', null)
  await user('hrA', 'hr_manager', branchA.id)
  await user('hrB', 'hr_manager', branchB.id)
  await user('hrNone', 'hr_manager', null)                       // حساب قديم بلا فرع
  await user('payrollMgr', 'payroll_manager', branchA.id)
  await user('readOnly', 'read_only', branchA.id)
  await user('dataEntry', 'data_entry', branchA.id)
  await user('assetOfficer', 'asset_officer', branchA.id)
  await user('hrOfficer', 'hr_officer', branchA.id)
  await user('hrOfficerWide', 'hr_officer', branchA.id)
  await user('disburser', 'payroll_disburser', branchA.id)
  await user('staffA1', 'employee', branchA.id, { employeeId: emp.a1.id })
  await user('managerA', 'employee', branchA.id, { employeeId: emp.managerA.id })

  runs.calculated = await repo('PayrollRun').save({ name: 'مسير محسوب — أدوار', scopeType: 'BRANCH', branchId: branchA.id, scopeIds: null, employeeIds: null,
    period: '2026-09', startDate: '2026-08-23', endDate: '2026-09-22', status: 'CALCULATED', totalNet: 0 })
  runs.approved = await repo('PayrollRun').save({ name: 'مسير معتمد — أدوار', scopeType: 'BRANCH', branchId: branchA.id, scopeIds: null, employeeIds: null,
    period: '2026-08', startDate: '2026-07-23', endDate: '2026-08-22', status: 'APPROVED', totalNet: 0, approvedBy: u.admin.id, approvedAt: new Date() })
}, { timeout: 300000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (e) { errors.push(e) }
  try { if (pool) await pool.close() } catch (e) { errors.push(e) }
  try {
    if (created && master) {
      assertDisposable()
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('db', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name=@db')).recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} removed.`)
    }
  } catch (e) { errors.push(e) }
  try { if (master) await master.close() } catch (e) { errors.push(e) }
  for (const dir of [base, uploads]) {
    try {
      assert.equal(path.dirname(path.resolve(dir)), os.tmpdir()); assert.match(path.basename(dir), /^hr-roles-scope-(migrations|files)-/)
      fs.rmSync(dir, { recursive: true, force: true })
    } catch (e) { errors.push(e) }
  }
  if (errors.length) throw new AggregateError(errors, 'roles-scope fixture cleanup failed')
})

test('migration 064 through the real migrator: adds the column, inserts missing roles, trims only rows that still equal the shipped preset, kills only changed sessions, and re-runs change nothing', async () => {
  const content = fs.readFileSync(path.join(MIGRATIONS, FILE), 'utf8')
  // حالة ما قبل الترحيل: العمود مش موجود (القاعدة اتعملت بـsynchronize فالعمود موجود — نشيله ونسيب الترحيل يضيفه)
  await pool.request().batch(`ALTER TABLE dbo.users DROP CONSTRAINT [${DF_NAME}]; ALTER TABLE dbo.users DROP COLUMN scopeAllBranches;`)
  const rolesBefore = await roleMap(), versionsBefore = await tokenVersions()
  const [{ n: usersBefore }] = await ds.query('SELECT COUNT(*) n FROM dbo.users')
  assert.deepEqual(Object.keys(rolesBefore).sort(), ['branch_manager', 'data_entry', 'employee', 'hr_manager', 'payroll_disburser', 'payroll_manager', 'read_only', 'super_admin'])

  const record = await migrate.apply({ database, base, trial: true, schemaDiff: false, quiet: true })
  assert.equal(record.mode, 'disposable')
  assert.equal(record.failed, undefined, JSON.stringify(record.failed))
  assert.equal(record.trial?.passed, true)
  assert.deepEqual(record.applied.map(item => path.basename(item.file)), [FILE])
  assert.equal(record.ledgerComplete, true)
  assert.deepEqual(record.columns.added.filter(column => !column.startsWith('app_schema_migrations.')), ['users.scopeAllBranches'])
  assert.deepEqual(record.columns.removedOrRenamed, [])
  assert.deepEqual(record.rowCounts.differences.filter(d => d.table !== 'app_schema_migrations'), [{ table: 'roles', before: 8, after: 10, kind: 'row-count-changed' }])

  // (1) العمود: bit NOT NULL بقيد باسم TypeORM، كل الحسابات 0، وفرق المخطط لجدول users صفر
  const cols = await ds.query(`SELECT c.name, t.name type, c.is_nullable nullable, dc.name df FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id
    LEFT JOIN sys.default_constraints dc ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
    WHERE c.object_id = OBJECT_ID('dbo.users') AND c.name = 'scopeAllBranches'`)
  assert.deepEqual(cols.map(c => [c.name, c.type, !!c.nullable, c.df]), [['scopeAllBranches', 'bit', false, DF_NAME]])
  const [{ n: usersAfter, open }] = await ds.query('SELECT COUNT(*) n, SUM(CASE WHEN scopeAllBranches = 1 THEN 1 ELSE 0 END) [open] FROM dbo.users')
  assert.equal(usersAfter, usersBefore); assert.equal(open, 0, 'الترحيل مايفتحش نطاق أي حساب')
  const { upQueries } = await ds.driver.createSchemaBuilder().log()
  assert.deepEqual(upQueries.map(q => q.query).filter(q => /"users"|"roles"/.test(q)), [])

  // (2) الأدوار الجديدة: الناقص اتدرج بحزمته بالحرف، والموجود بنفس الكود ماتلمسش
  const roles = await roleMap()
  for (const code of ['asset_officer', 'hr_officer']) {
    assert.deepEqual(roles[code], { nameAr: preset(code).nameAr, isSystem: false, isActive: true, raw: JSON.stringify(preset(code).permissions), permissions: preset(code).permissions }, code)
  }
  assert.deepEqual(roles.payroll_disburser, rolesBefore.payroll_disburser, 'دور موجود بنفس الكود مايتلمسش')

  // (3) التضييق: المطابق بالحرف والمعاد ترتيبه اتضيّقوا للحزمة المعتمدة، والمعدَّل بإيد المالك ماتلمسش
  assert.equal(roles.payroll_manager.raw, JSON.stringify(preset('payroll_manager').permissions))
  assert.equal(roles.read_only.raw, JSON.stringify(preset('read_only').permissions))
  assert.deepEqual(roles.data_entry, rolesBefore.data_entry, 'صف معدَّل (فيه reports.view زيادة) مايتلمسش')
  assert.equal(roles.payroll_manager.nameAr, 'مدير الرواتب', 'الاسم اللي في القاعدة مايتغيّرش')
  for (const code of ['super_admin', 'hr_manager', 'branch_manager', 'employee']) assert.deepEqual(roles[code], rolesBefore[code], code)

  // الجلسات: مستخدمو الدور اللي اتغيّر بس
  const versions = await tokenVersions()
  for (const key of ['payrollMgr', 'readOnly']) assert.equal(versions[u[key].id], versionsBefore[u[key].id] + 1, key)
  for (const key of Object.keys(u).filter(k => !['payrollMgr', 'readOnly'].includes(k))) assert.equal(versions[u[key].id], versionsBefore[u[key].id], key)

  // إعادة المُرحّل: لا ملف معلق. وإعادة نص الترحيل نفسه خارج الدفتر مرتين: لا تحديث ولا رفع لإصدار الجلسات
  const replay = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.deepEqual(replay.pendingBefore, []); assert.deepEqual(replay.applied, []); assert.equal(replay.ledgerComplete, true)
  for (let round = 0; round < 2; round++) for (const batch of migrate.splitBatches(content)) await pool.request().batch(batch)
  assert.deepEqual(await roleMap(), roles)
  assert.deepEqual(await tokenVersions(), versions)

  // حزمة تالفة توقف الترحيل بكود واضح وماتغيّرش حاجة
  const tx = new sql.Transaction(pool)
  await tx.begin()
  try {
    await new sql.Request(tx).batch("UPDATE dbo.roles SET permissions = N'not-json' WHERE code = N'read_only'")
    await assert.rejects(new sql.Request(tx).batch(migrate.splitBatches(content).at(-1)), error => { assert.equal(error.number, 56643, error.message); return true })
  } finally { try { await tx.rollback() } catch { /* أُجهضت من الخادم */ } }
  assert.deepEqual(await roleMap(), roles)
})

test('migration 064 on a production-shaped database: SQL Server 2019 compatibility level and a database collation that differs from tempdb', async t => {
  // الإنتاج SQL Server 2019 وقد يكون ترتيب قاعدته غير ترتيب tempdb: مقارنة عمود جدول مؤقت بعمود قاعدة بتقع بـ«collation conflict»
  // لو الجدول المؤقت اتعرّف بلا COLLATE DATABASE_DEFAULT. قاعدة مؤقتة تانية بجدولي roles وusers بس (بلا تطبيق).
  const other = `hr_roles_collation_test_${crypto.randomBytes(8).toString('hex')}`
  assert.match(other, migrate.DISPOSABLE_DATABASE); assert.notEqual(other, env.DB_DATABASE); assert.notEqual(other, database)
  const content = fs.readFileSync(path.join(MIGRATIONS, FILE), 'utf8')
  let otherPool = null, made = false
  try {
    await master.request().query(`CREATE DATABASE [${other}] COLLATE Arabic_100_CS_AS`); made = true
    await master.request().query(`ALTER DATABASE [${other}] SET COMPATIBILITY_LEVEL = 150`)
    otherPool = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME || 'sa', password: env.DB_PASSWORD,
      database: other, options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 10000, requestTimeout: 120000 }).connect()
    const [meta] = (await otherPool.request().query(`SELECT CAST(DATABASEPROPERTYEX(DB_NAME(), 'Collation') AS nvarchar(128)) AS db,
      CAST(DATABASEPROPERTYEX(N'tempdb', 'Collation') AS nvarchar(128)) AS temp, (SELECT compatibility_level FROM sys.databases WHERE name = DB_NAME()) AS compat`)).recordset
    assert.equal(meta.db, 'Arabic_100_CS_AS'); assert.notEqual(meta.temp, meta.db); assert.equal(meta.compat, 150)
    t.diagnostic(`collation db=${meta.db} tempdb=${meta.temp} compatibility=${meta.compat}`)
    await otherPool.request().batch(`CREATE TABLE dbo.roles (id int IDENTITY(1,1) PRIMARY KEY, code nvarchar(50) NOT NULL UNIQUE, nameAr nvarchar(100) NOT NULL,
        permissions nvarchar(max) NOT NULL, isSystem bit NOT NULL DEFAULT 0, isActive bit NOT NULL DEFAULT 1);
      CREATE TABLE dbo.users (id int IDENTITY(1,1) PRIMARY KEY, email nvarchar(200) NOT NULL, [role] nvarchar(30) NOT NULL, tokenVersion int NOT NULL DEFAULT 0);`)
    const insertRole = (code, permissions) => otherPool.request().input('code', sql.NVarChar, code).input('perms', sql.NVarChar, JSON.stringify(permissions))
      .query("INSERT INTO dbo.roles (code, nameAr, permissions) VALUES (@code, N'دور', @perms)")
    await insertRole('payroll_manager', LEGACY_SHIPPED_ROLE_PRESETS.payroll_manager)
    await insertRole('read_only', LEGACY_SHIPPED_ROLE_PRESETS.read_only.map(perm => perm === 'payroll.view' ? 'Payroll.View' : perm)) // حالة أحرف مختلفة = مش مطابق بالحرف
    await insertRole('data_entry', LEGACY_SHIPPED_ROLE_PRESETS.data_entry)
    for (const [mail, roleCode] of [['a', 'payroll_manager'], ['b', 'read_only'], ['c', 'data_entry'], ['d', 'employee']]) {
      await otherPool.request().input('mail', sql.NVarChar, mail).input('role', sql.NVarChar, roleCode).query('INSERT INTO dbo.users (email, [role]) VALUES (@mail, @role)')
    }
    // ضابط سلبي: نفس الدفعة من غير COLLATE DATABASE_DEFAULT بتقع هنا بتعارض الترتيب (468) — فالاختبار ده بيمسك المشكلة فعلًا
    const naive = migrate.splitBatches(content).at(-1).replace(/ COLLATE DATABASE_DEFAULT/g, '')
    assert.notEqual(naive, migrate.splitBatches(content).at(-1))
    const tx = new sql.Transaction(otherPool)
    await tx.begin()
    try {
      await assert.rejects(new sql.Request(tx).batch(naive), error => { assert.equal(error.number, 468, error.message); return true })
    } finally { try { await tx.rollback() } catch { /* أُجهضت من الخادم */ } }
    assert.equal((await otherPool.request().query('SELECT COUNT(*) n FROM dbo.roles')).recordset[0].n, 3)

    for (let round = 0; round < 2; round++) for (const batch of migrate.splitBatches(content)) await otherPool.request().batch(batch)
    const rows = (await otherPool.request().query('SELECT code, permissions FROM dbo.roles ORDER BY code')).recordset
    const byCode = Object.fromEntries(rows.map(row => [row.code, JSON.parse(row.permissions)]))
    assert.deepEqual(Object.keys(byCode), ['asset_officer', 'data_entry', 'hr_officer', 'payroll_disburser', 'payroll_manager', 'read_only'])
    assert.deepEqual(byCode.payroll_manager, preset('payroll_manager').permissions)
    assert.deepEqual(byCode.data_entry, preset('data_entry').permissions)
    assert.ok(byCode.read_only.includes('Payroll.View') && byCode.read_only.length === 12, 'صف مش مطابق بالحرف (حالة أحرف) مايتلمسش')
    for (const code of ['asset_officer', 'hr_officer', 'payroll_disburser']) assert.deepEqual(byCode[code], preset(code).permissions, code)
    const users = (await otherPool.request().query('SELECT email, tokenVersion, scopeAllBranches FROM dbo.users ORDER BY email')).recordset
    assert.deepEqual(users.map(row => [row.email, row.tokenVersion, row.scopeAllBranches]), [['a', 1, false], ['b', 0, false], ['c', 1, false], ['d', 0, false]])
  } finally {
    try { if (otherPool) await otherPool.close() } catch { /* تجاهل */ }
    if (made) {
      assert.match(other, /^hr_roles_collation_test_[a-f0-9]{16}$/); assert.notEqual(other, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${other}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${other}]`)
      assert.equal((await master.request().input('db', sql.NVarChar, other).query('SELECT name FROM sys.databases WHERE name=@db')).recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${other} removed.`)
    }
  }
})

test('customised rows: the screen shows exactly what differs from the approved bundle, the row keeps its old power until fixed, and resetting it to the shipped preset lets the migration trim it', async () => {
  const admin = await session(u.admin)
  const listed = expect(await http(admin.token, 'GET', '/roles'), 200)
  const byCode = Object.fromEntries(listed.map(role => [role.code, role]))
  assert.deepEqual(byCode.data_entry.presetDiff, { extra: ['employees.archive', 'reports.view'], missing: [] }, 'اللي المالك يشيله بإيده')
  assert.deepEqual(byCode.payroll_disburser.presetDiff, { extra: [], missing: ['payroll.disburse'] })
  for (const code of ['payroll_manager', 'read_only', 'asset_officer', 'hr_officer', 'hr_manager', 'branch_manager', 'employee']) {
    assert.deepEqual(byCode[code].presetDiff, { extra: [], missing: [] }, code)
  }
  assert.equal(byCode.super_admin.presetDiff, null)

  // الصف المعدَّل لسه بيؤرشف (D4 قائم لحد ما المالك يشيلها) — على موظف احتياطي
  const before = await session(u.dataEntry)
  assert.ok(before.user.permissions.includes('employees.archive'))
  expect(await http(before.token, 'POST', `/employees/${emp.spareA.id}/archive`, { reason: 'إثبات أن الصف المعدَّل لم يُلمس' }), 201)
  expect(await http(admin.token, 'POST', `/employees/${emp.spareA.id}/reactivate`), 201)

  // المالك رجّع الدور للحزمة القديمة بالظبط → نص الترحيل بيضيّقه وجلسة مستخدمه بتتقفل
  await ds.query('UPDATE dbo.roles SET permissions = @0 WHERE code = @1', [JSON.stringify(LEGACY_SHIPPED_ROLE_PRESETS.data_entry), 'data_entry'])
  const versionsBefore = await tokenVersions()
  const content = fs.readFileSync(path.join(MIGRATIONS, FILE), 'utf8')
  for (const batch of migrate.splitBatches(content)) await pool.request().batch(batch)
  assert.equal((await roleMap()).data_entry.raw, JSON.stringify(preset('data_entry').permissions))
  const versions = await tokenVersions()
  assert.equal(versions[u.dataEntry.id], versionsBefore[u.dataEntry.id] + 1)
  for (const key of Object.keys(u).filter(k => k !== 'dataEntry')) assert.equal(versions[u[key].id], versionsBefore[u[key].id], key)
  expect(await http(before.token, 'GET', '/employees'), 401)

  // دور «صرّاف» اللي كان موجود: المالك بيكمّله من شاشة الأدوار (حفظ الحزمة المعتمدة) — وجلسات الدور بتتقفل
  const stale = await session(u.disburser)
  const patched = expect(await http(admin.token, 'PATCH', `/roles/${byCode.payroll_disburser.id}`, { nameAr: preset('payroll_disburser').nameAr, permissions: preset('payroll_disburser').permissions }), 200)
  assert.deepEqual(patched.permissions, ['payroll.view', 'payroll.disburse'])
  expect(await http(stale.token, 'GET', '/payroll/runs'), 401)
})

test('مسؤول الأصول: registers assets, hands custody over, receives it back and transfers it — and gets 403 on money, employee files, attendance, requests and settings', async () => {
  const s = await session(u.assetOfficer)
  assert.deepEqual(sorted(s.user.permissions), ['approve.custody', 'custody.assign'])
  assert.equal(s.claims.scopeAllBranches, undefined)

  // قائمته
  expect(await http(s.token, 'GET', '/assets'), 200)
  const asset = expect(await http(s.token, 'POST', '/assets', { name: 'لابتوب اختبار الأدوار', category: 'لابتوب', serialNumber: 'RS-SN-001', value: 4500, branchId: branchA.id }), 201)
  expect(await http(s.token, 'PATCH', `/assets/${asset.id}`, { name: 'لابتوب اختبار الأدوار — معدّل' }), 200)
  expect(await http(s.token, 'GET', '/assets/available'), 200)
  // منتقي الموظف بلا employees.view: الدليل المختصر، بفرعه بس، وبلا أي بيانات غير الاسم والكود
  const directory = expect(await http(s.token, 'GET', '/employees/directory'), 200)
  assert.ok(directory.some(row => row.id === emp.a1.id) && !directory.some(row => row.id === emp.b1.id))
  assert.deepEqual(Object.keys(directory[0]).sort(), ['employeeCode', 'fullName', 'id'])
  // التسليم: لموظف فرعه بس
  expect(await http(s.token, 'POST', '/custody/assign', { assetId: asset.id, employeeId: emp.b1.id }), 404)
  const custody = expect(await http(s.token, 'POST', '/custody/assign', { assetId: asset.id, employeeId: emp.a1.id }), 201)
  assert.ok(expect(await http(s.token, 'GET', '/custody'), 200).some(row => row.id === custody.id))
  // الموظف يأكد الاستلام ← مسؤول الأصول يعتمد ← العهدة سارية ← ينقلها لموظف تاني في فرعه
  expect(await http((await session(u.staffA1)).token, 'POST', `/custody/${custody.id}/acknowledge`), 201)
  expect(await http(s.token, 'POST', `/custody/${custody.id}/manager-confirm`), 201)
  assert.equal((await repo('CustodyAssignment').findOneByOrFail({ id: custody.id })).status, 'ACTIVE')
  const moved = expect(await http(s.token, 'POST', `/custody/${custody.id}/transfer`, { toEmployeeId: emp.a2.id, note: 'نقل اختبار' }), 201)
  assert.equal(moved.employeeId, emp.a2.id)
  // الاستلام (الإرجاع): أصل تاني يتسلّم ويرجع
  const second = expect(await http(s.token, 'POST', '/assets', { name: 'موبايل اختبار الأدوار', category: 'موبايل', branchId: branchA.id }), 201)
  const lent = expect(await http(s.token, 'POST', '/custody/assign', { assetId: second.id, employeeId: emp.a2.id }), 201)
  expect(await http(s.token, 'POST', `/custody/${lent.id}/return`, { condition: 'سليمة' }), 201)
  assert.equal((await repo('Asset').findOneByOrFail({ id: second.id })).status, 'AVAILABLE')

  // الجيران: كله 403
  await allStatus(s, 403, [
    // المال
    ['GET', '/payroll/runs'], ['POST', '/payroll/runs', {}], ['POST', `/payroll/runs/${runs.calculated.id}/calculate`], ['POST', `/payroll/runs/${runs.calculated.id}/approve`],
    ['POST', `/payroll/runs/${runs.approved.id}/pay`], ['GET', `/payroll/runs/${runs.approved.id}/bank-sheet`], ['GET', '/loans/recoveries'], ['GET', '/loans/cap-policies'],
    ['GET', `/obligations/employee/${emp.a1.id}`], ['POST', '/deductions/types', {}], ['POST', '/bonuses/types', {}], ['GET', '/reports/financial/payroll-register?period=2026-09'],
    ['PUT', '/social-insurance/settings', {}],
    // ملفات الموظفين
    ['GET', '/employees'], ['GET', `/employees/${emp.a1.id}`], ['GET', `/employees/${emp.a1.id}/profile`], ['POST', '/employees', {}], ['PATCH', `/employees/${emp.a1.id}`, { phone: '0500000000' }],
    ['POST', `/employees/${emp.a1.id}/archive`, {}], ['POST', '/documents', {}], ['POST', '/candidates', {}], ['GET', '/candidates'], ['GET', '/offboarding'], ['GET', '/transfers'],
    // الحضور والإجازات والطلبات
    ['GET', '/attendance/daily?date=2026-09-15'], ['GET', '/attendance/punches?from=2026-09-01&to=2026-09-02'], ['POST', '/attendance/punches/manual', {}], ['POST', '/attendance/recompute', {}],
    ['GET', '/leaves'], ['POST', '/leaves/1/revoke', {}], ['GET', '/attendance-exemptions'], ['GET', '/requests/all'],
    // الإعدادات والحسابات والتقارير
    ['GET', '/users'], ['GET', '/roles'], ['GET', '/permissions-registry'], ['GET', '/settings/config'], ['PATCH', '/settings/config', { key: 'leave.annual_entitled', value: '30' }],
    ['POST', '/catalogs/grades', { name: 'درجة' }], ['POST', '/branches', {}], ['POST', '/departments', {}], ['GET', '/settings/approval-chains'], ['GET', '/settings/request-types'],
    ['GET', '/dashboard/stats'], ['GET', '/reports/headcount'],
  ], 'asset_officer')
})

test('approve.custody finally has a carrier: the asset officer decides the «أمين العهدة» step end to end; the HR officer and the read-only role cannot decide anything', async () => {
  const admin = await session(u.admin)
  const make = async (code, approverRole) => {
    const chain = expect(await http(admin.token, 'POST', '/settings/approval-chains', { code: `RS_CHAIN_${code}`, nameAr: `سلسلة ${code}`, steps: [{ approverRole, slaDays: 2 }] }), 201)
    const type = expect(await http(admin.token, 'POST', '/settings/request-types', { nameAr: `طلب اختبار ${code}`, category: 'employee_relations', code: `RS_${code}`,
      destinationHandler: 'none', customFields: [{ key: 'note', label: 'ملاحظة', type: 'text', required: true }], approvalChainId: chain.id, visibleTo: { mode: 'all', ids: [] } }), 201)
    expect(await http(admin.token, 'PATCH', `/settings/request-types/${type.id}`, { isActive: true }), 200)
    const staff = await session(u.staffA1)
    const request = expect(await http(staff.token, 'POST', '/requests', { typeCode: `RS_${code}`, payload: { note: 'طلب لاختبار خطوة الاعتماد' } }), 201)
    const submitted = await http(staff.token, 'POST', `/requests/${request.id}/submit`)
    assert.ok(submitted.status < 300, JSON.stringify(submitted.body))
    assert.equal((await repo('Request').findOneByOrFail({ id: request.id })).status, 'UNDER_REVIEW')
    return request.id
  }
  const custodyRequest = await make('CUS', 'custody_officer')
  const hrRequest = await make('HR', 'hr')
  const act = (s, id) => http(s.token, 'POST', `/requests/${id}/act`, { action: 'APPROVE', comment: 'اعتماد اختبار' })

  const officer = await session(u.hrOfficer), readOnly = await session(u.readOnly), asset = await session(u.assetOfficer)
  // قراءة فقط = لا قرار على أي خطوة
  for (const s of [officer, readOnly]) for (const id of [custodyRequest, hrRequest]) expect(await act(s, id), 403)
  // مسؤول الأصول: خطوة أمين العهدة له، وخطوة الموارد البشرية لأ
  expect(await act(asset, hrRequest), 403)
  const decided = await act(asset, custodyRequest)
  assert.ok(decided.status < 300, JSON.stringify(decided.body))
  assert.notEqual((await repo('Request').findOneByOrFail({ id: custodyRequest })).status, 'UNDER_REVIEW')
  assert.equal((await repo('Request').findOneByOrFail({ id: hrRequest })).status, 'UNDER_REVIEW')
  // ومدير الموارد البشرية يقرر خطوته عادي (المقارنة)
  assert.ok((await act(await session(u.hrA), hrRequest)).status < 300)
})

test('مسؤول موارد بشرية: reads every HR module of his branch and cannot edit, cancel, approve or do anything an HR manager does', async () => {
  const s = await session(u.hrOfficer)
  assert.deepEqual(sorted(s.user.permissions), sorted(preset('hr_officer').permissions))

  const employees = expect(await http(s.token, 'GET', '/employees'), 200)
  assert.deepEqual(branchesOf(employees), [branchA.id])
  expect(await http(s.token, 'GET', `/employees/${emp.a1.id}`), 200)
  expect(await http(s.token, 'GET', `/employees/${emp.b1.id}`), 404) // فرع تاني = غير موجود
  await allStatus(s, 200, [
    ['GET', `/employees/${emp.a1.id}/profile`], ['GET', '/requests/all'], ['GET', '/attendance/daily?date=2026-09-15'], ['GET', '/leaves'], ['GET', '/attendance-exemptions'],
    ['GET', '/dashboard/stats'], ['GET', '/reports/headcount'], ['GET', '/transfers'], ['GET', '/calendar?month=2026-09'],
  ], 'hr_officer reads')

  await allStatus(s, 403, [
    // كل كتابة يعملها مدير الموارد البشرية
    ['POST', '/employees', {}], ['PATCH', `/employees/${emp.a1.id}`, { phone: '0500000000' }], ['POST', `/employees/${emp.a1.id}/archive`, {}], ['POST', `/employees/${emp.a1.id}/suspensions`, {}],
    ['POST', '/employees/bulk-update/apply', {}], ['POST', '/documents', {}], ['POST', '/hr-documents/issue', {}], ['POST', '/candidates', {}], ['POST', '/offboarding', {}],
    ['POST', '/attendance/punches/manual', {}], ['POST', '/attendance/recompute', {}], ['POST', '/attendance/schedule', {}], ['POST', '/attendance/overtime/1/confirm', {}],
    ['POST', '/attendance-exemptions', {}], ['POST', '/attendance-exemptions/1/approve', {}], ['POST', '/attendance-exemptions/1/cancel', {}],
    ['POST', '/leaves/1/revoke', {}], ['POST', '/leaves/year-end/2026/close', {}], ['POST', '/custody/assign', {}], ['GET', '/assets'], ['POST', '/assets', {}],
    ['POST', '/branches', {}], ['POST', '/departments', {}], ['POST', '/teams', {}],
    // المال
    ['GET', '/payroll/runs'], ['GET', `/payroll/runs/${runs.approved.id}/bank-sheet`], ['POST', `/payroll/runs/${runs.calculated.id}/approve`], ['POST', `/payroll/runs/${runs.approved.id}/pay`],
    ['GET', '/reports/financial/payroll-register?period=2026-09'], ['GET', '/loans/recoveries'], ['GET', `/obligations/employee/${emp.a1.id}`], ['POST', '/deductions/types', {}], ['POST', '/bonuses/types', {}],
    // الحسابات والإعدادات
    ['GET', '/users'], ['POST', '/users', {}], ['PATCH', `/users/${u.staffA1.id}`, { isActive: false }], ['GET', '/roles'], ['POST', '/roles', {}], ['GET', '/permissions-registry'],
    ['GET', '/settings/config'], ['PATCH', '/settings/config', { key: 'leave.annual_entitled', value: '30' }], ['POST', '/catalogs/grades', { name: 'درجة' }],
    ['POST', '/settings/approval-chains', {}], ['POST', '/settings/request-types', {}],
  ], 'hr_officer')
  // التقديم نيابة عن موظف محتاج requests.create_on_behalf
  const onBehalf = await http(s.token, 'POST', '/requests', { typeCode: 'RS_HR', payload: { note: 'نيابة' }, onBehalfEmployeeId: emp.a2.id })
  assert.equal(onBehalf.status, 403, JSON.stringify(onBehalf.body))
  // ومافيش ولا صف اتكتب باسمه
  assert.equal(await repo('Request').countBy({ createdByUserId: u.hrOfficer.id }), 0)
})

test('مسؤول صرف الرواتب: sees payroll runs and carries the disbursement permission — cannot calculate, approve, pay, reopen, cancel or touch any other module', async t => {
  const s = await session(u.disburser)
  assert.deepEqual(sorted(s.user.permissions), ['payroll.disburse', 'payroll.view'])
  expect(await http(s.token, 'GET', '/payroll/runs'), 200)
  await allStatus(s, 403, [
    ['POST', '/payroll/runs', {}], ['POST', `/payroll/runs/${runs.calculated.id}/calculate`], ['POST', `/payroll/runs/${runs.calculated.id}/approve`], ['POST', `/payroll/runs/${runs.approved.id}/pay`],
    ['POST', `/payroll/runs/${runs.approved.id}/reopen`, { reason: 'اختبار' }], ['POST', `/payroll/runs/${runs.calculated.id}/cancel`, { reason: 'اختبار' }], ['POST', `/payroll/runs/${runs.approved.id}/reversals`, {}],
    ['POST', '/obligations', {}], ['POST', '/payroll/policies', {}], ['PUT', '/social-insurance/settings', {}], ['POST', '/payroll/allowances/types', {}], ['POST', '/payroll/overview/waivers', {}],
    ['POST', `/payroll/employees/${emp.a1.id}/salary-history`, {}], ['POST', '/loans/cap-policies', {}], ['POST', '/loans/recoveries/1/collect', {}], ['POST', '/deductions/types', {}], ['POST', '/bonuses/types', {}],
    ['GET', '/employees'], ['PATCH', `/employees/${emp.a1.id}`, { phone: '0500000000' }], ['GET', '/assets'], ['POST', '/custody/assign', {}], ['GET', '/attendance/daily?date=2026-09-15'],
    ['POST', '/attendance/punches/manual', {}], ['GET', '/leaves'], ['GET', '/requests/all'], ['GET', '/reports/headcount'], ['GET', '/dashboard/stats'],
    ['GET', '/users'], ['GET', '/roles'], ['GET', '/settings/config'], ['PATCH', '/settings/config', { key: 'leave.annual_entitled', value: '30' }], ['POST', '/catalogs/grades', { name: 'درجة' }],
  ], 'payroll_disburser')
  // شاشة الصرف (يبنيها مسار الرواتب بالتوازي): لو المسارات موجودة، مسؤول الصرف يعدّي حارسها والباقون لأ
  const probe = await http(s.token, 'GET', '/payroll/disbursement/runs')
  if (probe.status === 404) { t.diagnostic('مسارات /payroll/disbursement لسه مش موجودة — اتخطّى فحصها'); return }
  t.diagnostic('مسارات /payroll/disbursement موجودة — اتفحص حارس payroll.disburse عليها')
  assert.ok(![401, 403].includes(probe.status), `GET /payroll/disbursement/runs → ${probe.status} ${JSON.stringify(probe.body)}`)
  await reaches(s, [['POST', '/payroll/disbursement/runs/99999999/mark', {}]], 'payroll_disburser')
  for (const key of ['payrollMgr', 'readOnly', 'hrOfficer', 'assetOfficer', 'dataEntry']) {
    await allStatus(await session(u[key]), 403, [['POST', '/payroll/disbursement/runs/99999999/mark', {}]], key)
  }
})

test('trimmed presets behave: payroll_manager calculates but never approves or pays; read_only reads and never writes or opens the bank sheet; data_entry edits and never archives', async () => {
  const payroll = await session(u.payrollMgr)
  assert.deepEqual(sorted(payroll.user.permissions), sorted(preset('payroll_manager').permissions))
  expect(await http(payroll.token, 'GET', '/payroll/runs'), 200)
  await reaches(payroll, [['POST', '/payroll/runs/99999999/calculate'], ['POST', '/payroll/runs', {}]], 'payroll_manager')
  await allStatus(payroll, 403, [
    ['POST', `/payroll/runs/${runs.calculated.id}/approve`], ['POST', `/payroll/runs/${runs.approved.id}/pay`], ['POST', `/payroll/runs/${runs.approved.id}/reopen`, { reason: 'اختبار' }],
    ['POST', `/payroll/runs/${runs.calculated.id}/cancel`, { reason: 'اختبار' }], ['GET', '/users'], ['PATCH', '/settings/config', { key: 'leave.annual_entitled', value: '30' }],
  ], 'payroll_manager')
  assert.equal((await repo('PayrollRun').findOneByOrFail({ id: runs.calculated.id })).status, 'CALCULATED')
  assert.equal((await repo('PayrollRun').findOneByOrFail({ id: runs.approved.id })).status, 'APPROVED')

  const readOnly = await session(u.readOnly)
  assert.deepEqual(sorted(readOnly.user.permissions), sorted(preset('read_only').permissions))
  await allStatus(readOnly, 200, [['GET', '/employees'], ['GET', '/leaves'], ['GET', '/requests/all'], ['GET', '/attendance/daily?date=2026-09-15'], ['GET', '/reports/headcount']], 'read_only reads')
  const punchesBefore = await repo('AttendancePunch').count()
  await allStatus(readOnly, 403, [
    ['POST', '/attendance/punches/manual', { reason: 'اختبار', punches: [{ employeeCode: emp.a1.fingerprintCode, timestamp: '2026-09-15 08:00:00' }] }], ['POST', '/attendance/recompute', { from: '2026-09-01', to: '2026-09-02' }],
    ['POST', '/custody/assign', { assetId: 1, employeeId: emp.a1.id }], ['POST', '/candidates', {}], ['POST', '/documents', {}],
    ['GET', '/payroll/runs'], ['GET', `/payroll/runs/${runs.approved.id}/bank-sheet`], ['GET', `/obligations/employee/${emp.a1.id}`], ['GET', '/reports/financial/payroll-register?period=2026-09'],
    ['PATCH', `/employees/${emp.a1.id}`, { phone: '0500000000' }], ['GET', '/users'], ['GET', '/settings/config'],
  ], 'read_only')
  assert.equal(await repo('AttendancePunch').count(), punchesBefore)

  const dataEntry = await session(u.dataEntry)
  assert.deepEqual(sorted(dataEntry.user.permissions), sorted(preset('data_entry').permissions))
  expect(await http(dataEntry.token, 'PATCH', `/employees/${emp.a2.id}`, { phone: '01234567890' }), 200)
  await allStatus(dataEntry, 403, [['POST', `/employees/${emp.a2.id}/archive`, { reason: 'اختبار' }], ['POST', `/employees/${emp.a2.id}/reactivate`], ['GET', '/payroll/runs']], 'data_entry')
  assert.equal((await repo('Employee').findOneByOrFail({ id: emp.a2.id })).status, 'active')
})

test('«نطاقه: كل الفروع»: entity → JWT → guard. On = every branch and company-wide writes WITH the permission, refused WITHOUT it; off = own branch; the token dies on every change', async () => {
  const admin = await session(u.admin)
  const config = async () => new Map(expect(await http(admin.token, 'GET', '/settings/config'), 200).map(row => [row.key, row.value]))
  const original = (await config()).get('leave.annual_entitled')

  // مقفول (الافتراضي): مدير موارد بشرية شايل settings.manage — فرعه بس، وإعداد الشركة مرفوض (السلوك القديم، فحص A3)
  let hr = await session(u.hrA)
  assert.equal(hr.claims.scopeAllBranches, undefined); assert.equal(hr.user.scopeAllBranches, false)
  assert.ok(hr.user.permissions.includes('settings.manage'))
  assert.deepEqual(branchesOf(expect(await http(hr.token, 'GET', '/employees'), 200)), [branchA.id])
  const refused = expect(await http(hr.token, 'PATCH', '/settings/config', { key: 'leave.annual_entitled', value: '25' }), 403)
  assert.match(refused.message, /لكل الشركة/)
  expect(await http(hr.token, 'POST', '/catalogs/grades', { name: 'درجة من حساب فرع', minSalary: 1000, maxSalary: 2000 }), 403)
  assert.equal((await config()).get('leave.annual_entitled'), original)

  // مدير النظام يفتحه: الإصدار يزيد، التوكن القديم يموت، والجديد شايل العلم
  const v0 = (await tokenVersions())[u.hrA.id]
  const opened = expect(await http(admin.token, 'PATCH', `/users/${u.hrA.id}`, { scopeAllBranches: true }), 200)
  assert.equal(opened.scopeAllBranches, true)
  assert.equal((await tokenVersions())[u.hrA.id], v0 + 1)
  expect(await http(hr.token, 'GET', '/employees'), 401)
  hr = await session(u.hrA)
  assert.equal(hr.claims.scopeAllBranches, true); assert.equal(hr.user.scopeAllBranches, true)
  assert.equal(hr.claims.branchId, branchA.id, 'الفرع الأصلي باقي')
  assert.deepEqual(branchesOf(expect(await http(hr.token, 'GET', '/employees'), 200)), [branchA.id, branchB.id])
  expect(await http(hr.token, 'GET', `/employees/${emp.b1.id}`), 200)
  assert.deepEqual(expect(await http(hr.token, 'GET', '/branches'), 200).map(b => b.id).sort((a, b) => a - b), [branchA.id, branchB.id])
  // D5: settings.manage رجعت حية — إعداد الشركة بيتكتب من حساب غير مدير النظام
  expect(await http(hr.token, 'PATCH', '/settings/config', { key: 'leave.annual_entitled', value: '25' }), 200)
  assert.equal((await config()).get('leave.annual_entitled'), '25')
  expect(await http(hr.token, 'POST', '/catalogs/grades', { name: 'درجة من حساب كل الفروع', minSalary: 1000, maxSalary: 2000 }), 201)
  // ولسه مش مدير نظام: الصلاحيات الحصرية اللي مش معاه مرفوضة، والنقل بين الفروع لمدير النظام بدوره
  expect(await http(hr.token, 'POST', '/roles', { code: 'rs_wide_attempt', nameAr: 'محاولة', permissions: [] }), 403)
  expect(await http(hr.token, 'POST', '/attendance-exemptions/1/approve-executive', { reason: 'اختبار' }), 403)

  // مفتوح من غير الصلاحية: «مسؤول موارد بشرية» (قراءة فقط) نطاقه كل الفروع — يشوف الكل ولا يكتب حاجة
  expect(await http(admin.token, 'PATCH', `/users/${u.hrOfficerWide.id}`, { scopeAllBranches: true }), 200)
  const wide = await session(u.hrOfficerWide)
  assert.equal(wide.claims.scopeAllBranches, true)
  assert.deepEqual(branchesOf(expect(await http(wide.token, 'GET', '/employees'), 200)), [branchA.id, branchB.id])
  await allStatus(wide, 403, [
    ['PATCH', '/settings/config', { key: 'leave.annual_entitled', value: '26' }], ['POST', '/catalogs/grades', { name: 'درجة بلا صلاحية' }], ['POST', '/deductions/types', {}], ['POST', '/bonuses/types', {}],
    ['POST', '/loans/cap-policies', {}], ['PUT', '/social-insurance/settings', {}], ['POST', '/payroll/rules/lateness-tier-sets', {}], ['POST', '/branches', {}],
    ['PATCH', `/employees/${emp.b1.id}`, { phone: '0500000000' }], ['POST', `/employees/${emp.b1.id}/archive`, {}], ['GET', '/payroll/runs'], ['GET', '/users'], ['GET', '/settings/config'],
  ], 'scope-all without permission')
  assert.equal((await config()).get('leave.annual_entitled'), '25')
  // النظير المقفول لنفس الدور: فرعه بس
  assert.deepEqual(branchesOf(expect(await http((await session(u.hrOfficer)).token, 'GET', '/employees'), 200)), [branchA.id])

  // توكن بقيمة غير true الحرفية = مقفول (حتى لو العمود مفتوح)
  const { iat: _iat, exp: _exp, ...claims } = hr.claims
  const forged = jwt.sign({ ...claims, scopeAllBranches: 'true' })
  assert.deepEqual(branchesOf(expect(await http(forged, 'GET', '/employees'), 200)), [branchA.id])
  expect(await http(forged, 'PATCH', '/settings/config', { key: 'leave.annual_entitled', value: '27' }), 403)

  // العمود اتقفل من برّه الشاشة (SQL مباشر بلا رفع للإصدار): التوكن اللي لسه شايل «كل الفروع» يموت
  await ds.query('UPDATE dbo.users SET scopeAllBranches = 0 WHERE id = @0', [u.hrOfficerWide.id])
  expect(await http(wide.token, 'GET', '/employees'), 401)
  assert.deepEqual(branchesOf(expect(await http((await session(u.hrOfficerWide)).token, 'GET', '/employees'), 200)), [branchA.id])

  // مدير النظام يقفله: الإصدار يزيد، التوكن يموت، ويرجع مقفول على فرعه وإعداد الشركة يترفض تاني
  const v1 = (await tokenVersions())[u.hrA.id]
  assert.equal(expect(await http(admin.token, 'PATCH', `/users/${u.hrA.id}`, { scopeAllBranches: false }), 200).scopeAllBranches, false)
  assert.equal((await tokenVersions())[u.hrA.id], v1 + 1)
  expect(await http(hr.token, 'GET', '/employees'), 401)
  hr = await session(u.hrA)
  assert.equal(hr.claims.scopeAllBranches, undefined)
  assert.deepEqual(branchesOf(expect(await http(hr.token, 'GET', '/employees'), 200)), [branchA.id])
  expect(await http(hr.token, 'GET', `/employees/${emp.b1.id}`), 404)
  expect(await http(hr.token, 'PATCH', '/settings/config', { key: 'leave.annual_entitled', value: '28' }), 403)
  // نفس القيمة مرة تانية = مفيش تغيير = الجلسة ماتتقفلش
  const v2 = (await tokenVersions())[u.hrA.id]
  expect(await http(admin.token, 'PATCH', `/users/${u.hrA.id}`, { scopeAllBranches: false }), 200)
  // (PATCH بلا أي حقل أمني تاني: الإصدار ثابت)
  assert.equal((await tokenVersions())[u.hrA.id], v2)
  expect(await http(admin.token, 'PATCH', '/settings/config', { key: 'leave.annual_entitled', value: original }), 200)
})

test('only the super admin grants it: an HR manager cannot switch it on or off, cannot create an account with it, and cannot manage an account that has it', async () => {
  const admin = await session(u.admin)
  let hr = await session(u.hrA)
  const before = await tokenVersions()
  // فتح على حساب في فرعه، وعلى حسابه هو، وإنشاء حساب مفتوح — كله مرفوض وماتغيّرش حاجة
  assert.match(expect(await http(hr.token, 'PATCH', `/users/${u.hrOfficer.id}`, { scopeAllBranches: true }), 403).message, /مدير النظام فقط/)
  assert.ok([400, 403].includes((await http(hr.token, 'PATCH', `/users/${u.hrA.id}`, { scopeAllBranches: true })).status))
  expect(await http(hr.token, 'POST', '/users', { email: 'wide-attempt@roles-scope.example.com', password: crypto.randomBytes(12).toString('base64url') + 'a1',
    displayName: 'محاولة فتح النطاق', role: 'employee', branchId: branchA.id, scopeAllBranches: true }), 403)
  assert.equal(await repo('User').countBy({ email: 'wide-attempt@roles-scope.example.com' }), 0)
  // قيمة غير منطقية مرفوضة من مدير النظام نفسه (DTO)
  expect(await http(admin.token, 'PATCH', `/users/${u.hrOfficer.id}`, { scopeAllBranches: 'true' }), 400)
  expect(await http(admin.token, 'PATCH', `/users/${u.hrOfficer.id}`, { scopeAllBranches: 1 }), 400)
  assert.deepEqual(await tokenVersions(), before)
  assert.equal(Number((await ds.query('SELECT COUNT(*) n FROM dbo.users WHERE scopeAllBranches = 1'))[0].n), 0)

  // حساب مفتوح له في فرع المدير: المدير يشوفه في القائمة ولا يقدر يلمسه (دور/صلاحيات/كلمة مرور/تعطيل/قفل النطاق)
  expect(await http(admin.token, 'PATCH', `/users/${u.hrOfficerWide.id}`, { scopeAllBranches: true }), 200)
  const listed = expect(await http(hr.token, 'GET', '/users'), 200)
  assert.equal(listed.find(row => row.id === u.hrOfficerWide.id).scopeAllBranches, true)
  assert.equal(listed.find(row => row.id === u.hrOfficer.id).scopeAllBranches, false)
  const locked = await tokenVersions()
  const secretWord = crypto.randomBytes(12).toString('base64url') + 'a1'
  for (const body of [{ scopeAllBranches: false }, { role: 'branch_manager' }, { password: secretWord }, { isActive: false }, { branchId: branchA.id, role: 'employee' }]) {
    assert.match(expect(await http(hr.token, 'PATCH', `/users/${u.hrOfficerWide.id}`, body), 403, JSON.stringify(Object.keys(body))).message, /مدير النظام فقط/)
  }
  expect(await http(hr.token, 'POST', '/users/temporary-password', { userIds: [u.hrOfficerWide.id], password: secretWord }), 403)
  expect(await http(hr.token, 'PUT', `/users/${u.hrOfficerWide.id}/permissions`, { grants: ['employees.edit'], revokes: [] }), 403)
  assert.deepEqual(await tokenVersions(), locked)
  assert.equal(await repo('UserPermissionOverride').countBy({ userId: u.hrOfficerWide.id }), 0)
  const row = await repo('User').findOneByOrFail({ id: u.hrOfficerWide.id })
  assert.deepEqual([row.role, row.isActive, row.scopeAllBranches, row.passwordHash], ['hr_officer', true, true, 'test-only'])

  // حتى حساب «كل الفروع» شايل users.manage مايفتحش النطاق لغيره
  expect(await http(admin.token, 'PATCH', `/users/${u.hrA.id}`, { scopeAllBranches: true }), 200)
  hr = await session(u.hrA)
  expect(await http(hr.token, 'PATCH', `/users/${u.hrOfficer.id}`, { scopeAllBranches: true }), 403)
  expect(await http(hr.token, 'PATCH', `/users/${u.hrB.id}`, { scopeAllBranches: true }), 403)
  // الترقية لمدير نظام بتقفل العلم (نطاقه كامل بدوره)، ومدير النظام مايتخزنش عليه
  expect(await http(admin.token, 'PATCH', `/users/${u.hrOfficerWide.id}`, { role: 'super_admin' }), 200)
  assert.equal((await repo('User').findOneByOrFail({ id: u.hrOfficerWide.id })).scopeAllBranches, false)
  expect(await http(admin.token, 'PATCH', `/users/${u.hrOfficerWide.id}`, { role: 'hr_officer' }), 200)
  assert.equal((await session(u.hrOfficerWide)).claims.scopeAllBranches, undefined, 'التنزيل من مدير نظام مايرجّعش النطاق مفتوح')
  expect(await http(admin.token, 'PATCH', `/users/${u.hrA.id}`, { scopeAllBranches: false }), 200)
})

test('fail-closed stays: a legacy account with no branch still sees nothing and writes nothing company-wide, whatever permissions it carries', async () => {
  const s = await session(u.hrNone)
  assert.equal(s.claims.branchId, null); assert.equal(s.claims.scopeAllBranches, undefined)
  assert.ok(s.user.permissions.includes('settings.manage') && s.user.permissions.includes('employees.view'))
  for (const route of ['/employees', '/employees/directory', '/branches', '/departments', '/users', '/payroll/runs', '/leaves', '/requests/all']) {
    assert.deepEqual(rowsOf(expect(await http(s.token, 'GET', route), 200, route)), [], route)
  }
  expect(await http(s.token, 'GET', `/employees/${emp.a1.id}`), 404)
  expect(await http(s.token, 'PATCH', `/employees/${emp.a1.id}`, { phone: '0500000000' }), 404)
  expect(await http(s.token, 'PATCH', '/settings/config', { key: 'leave.annual_entitled', value: '29' }), 403)
  expect(await http(s.token, 'POST', '/catalogs/grades', { name: 'درجة من حساب بلا فرع' }), 403)
  // ولو مدير النظام فتح له «كل الفروع» يبقى حساب شركة صريح (القرار بقى ظاهر ومقصود بدل «بلا فرع = كل حاجة»)
  const admin = await session(u.admin)
  expect(await http(admin.token, 'PATCH', `/users/${u.hrNone.id}`, { scopeAllBranches: true }), 200)
  assert.deepEqual(branchesOf(expect(await http((await session(u.hrNone)).token, 'GET', '/employees'), 200)), [branchA.id, branchB.id])
  expect(await http(admin.token, 'PATCH', `/users/${u.hrNone.id}`, { scopeAllBranches: false }), 200)
  assert.deepEqual(expect(await http((await session(u.hrNone)).token, 'GET', '/employees'), 200), [])
})

test('permissions screen API: the whole registry with module, description and carriers; orphans flagged; copy a role; effective = role ∪ grants − revokes', async () => {
  const admin = await session(u.admin)
  const registry = expect(await http(admin.token, 'GET', '/permissions-registry'), 200)
  assert.deepEqual(registry.map(entry => entry.key), ALL_PERMISSIONS, 'كل صلاحية في السجل معروضة، بترتيبه')
  for (const entry of registry) {
    assert.equal(entry.labelAr, PERMISSIONS[entry.key])
    assert.ok(entry.description && entry.groupLabelAr && entry.group !== 'other', entry.key)
    assert.equal(entry.superAdminOnly, SUPER_ADMIN_ONLY_GRANTS.includes(entry.key))
    assert.ok(Array.isArray(entry.carriedBy), entry.key)
  }
  const byKey = Object.fromEntries(registry.map(entry => [entry.key, entry]))
  assert.equal(byKey['payroll.disburse'].labelAr, 'تسجيل صرف الرواتب للموظفين (تم / لم يتم) بلا أي تعديل')
  assert.equal(byKey['payroll.chain_manage'].labelAr, 'ضبط سلسلة اعتماد المسير')
  assert.deepEqual(byKey['approve.custody'].carriedBy, [{ code: 'asset_officer', nameAr: 'مسؤول الأصول' }], 'approve.custody بقى لها دور')
  assert.deepEqual(byKey['payroll.disburse'].carriedBy.map(r => r.code), ['payroll_disburser'])
  assert.ok(!byKey['payroll.approve'].carriedBy.some(r => r.code === 'payroll_manager'))
  assert.ok(!byKey['employees.archive'].carriedBy.some(r => r.code === 'data_entry'))
  // اليتيمة = في السجل ومفيش دور مفعّل شايلها — متحسوبة بالظبط من الأدوار القائمة
  const roles = await roleMap()
  const carried = new Set(Object.values(roles).filter(role => role.isActive).flatMap(role => role.permissions))
  const orphans = registry.filter(entry => entry.carriedBy.length === 0).map(entry => entry.key)
  assert.deepEqual(sorted(orphans), sorted(ALL_PERMISSIONS.filter(key => !carried.has(key))))
  for (const key of ['payroll.chain_manage', 'loans.write_off', 'bonuses.exceed_cap', 'attendance_exemption.approve_executive', 'payroll.self_approval_licence']) assert.ok(orphans.includes(key), key)
  for (const key of ['approve.custody', 'payroll.disburse', 'custody.assign', 'employees.view']) assert.ok(!orphans.includes(key), key)

  // «نسخ دور»: دور جديد بنفس الصلاحيات — والدور المعطَّل مابيتحسبش شايل
  const listed = expect(await http(admin.token, 'GET', '/roles'), 200)
  const source = listed.find(role => role.code === 'asset_officer')
  const copy = expect(await http(admin.token, 'POST', '/roles', { code: 'asset_officer_copy', nameAr: `نسخة من ${source.nameAr}`, permissions: source.permissions }), 201)
  assert.deepEqual(copy.permissions, source.permissions); assert.equal(copy.isSystem, false)
  const afterCopy = expect(await http(admin.token, 'GET', '/permissions-registry'), 200).find(entry => entry.key === 'approve.custody')
  assert.deepEqual(afterCopy.carriedBy.map(r => r.code), ['asset_officer', 'asset_officer_copy'])
  expect(await http(admin.token, 'PATCH', `/roles/${copy.id}`, { isActive: false }), 200)
  assert.deepEqual(expect(await http(admin.token, 'GET', '/permissions-registry'), 200).find(entry => entry.key === 'approve.custody').carriedBy.map(r => r.code), ['asset_officer'])
  assert.equal(expect(await http(admin.token, 'GET', '/roles'), 200).find(role => role.code === 'asset_officer_copy').presetDiff, null, 'دور مخصص مالوش حزمة معتمدة')
  // غير مدير النظام بصلاحية roles.manage: ينسخ دورًا عاديًا، ومايقدرش ينسخ دورًا فيه صلاحيات حصرية
  expect(await http(admin.token, 'PUT', `/users/${u.hrB.id}/permissions`, { grants: ['roles.manage'], revokes: [] }), 200)
  const hrB = await session(u.hrB)
  expect(await http(hrB.token, 'POST', '/roles', { code: 'hr_officer_copy', nameAr: 'نسخة من مسؤول موارد بشرية', permissions: preset('hr_officer').permissions }), 201)
  assert.match(expect(await http(hrB.token, 'POST', '/roles', { code: 'hr_manager_copy', nameAr: 'نسخة من مدير الموارد', permissions: preset('hr_manager').permissions }), 403).message, /مدير النظام فقط/)
  assert.match(expect(await http(hrB.token, 'POST', '/roles', { code: 'chain_copy', nameAr: 'سلسلة الاعتماد', permissions: ['payroll.chain_manage'] }), 403).message, /ضبط سلسلة اعتماد المسير/)
  expect(await http(hrB.token, 'POST', '/roles', { code: 'unknown_perm', nameAr: 'صلاحية وهمية', permissions: ['payroll.disburse', 'payroll.nonexistent'] }), 400)

  // الصلاحيات النهائية لمستخدم = حزمة الدور ∪ المنح − السحب، بمكوّناتها
  const plain = expect(await http(admin.token, 'GET', `/users/${u.hrOfficer.id}/permissions`), 200)
  assert.deepEqual(sorted(plain.effective), sorted(preset('hr_officer').permissions))
  assert.deepEqual([plain.role, plain.grants, plain.revokes, plain.roleActive, plain.legacyGrants, plain.scopeAllBranches], ['hr_officer', [], [], true, [], false])
  assert.deepEqual(sorted(plain.rolePermissions), sorted(preset('hr_officer').permissions))
  const stale = await session(u.hrOfficer)
  const changed = expect(await http(admin.token, 'PUT', `/users/${u.hrOfficer.id}/permissions`, { grants: ['documents.manage'], revokes: ['reports.view', 'transfers.view'] }), 200)
  const expected = [...preset('hr_officer').permissions.filter(perm => !['reports.view', 'transfers.view'].includes(perm)), 'documents.manage']
  assert.deepEqual(sorted(changed.effective), sorted(expected))
  assert.deepEqual([changed.grants, sorted(changed.revokes)], [['documents.manage'], ['reports.view', 'transfers.view']])
  expect(await http(stale.token, 'GET', '/employees'), 401) // تغيّرت صلاحياته → جلسته اتقفلت
  const fresh = await session(u.hrOfficer)
  assert.deepEqual(sorted(fresh.user.permissions), sorted(expected))
  expect(await http(fresh.token, 'GET', '/reports/headcount'), 403)
  await reaches(fresh, [['POST', '/documents', {}]], 'granted documents.manage')
  expect(await http(admin.token, 'PUT', `/users/${u.hrOfficer.id}/permissions`, { grants: [], revokes: [] }), 200)
})
