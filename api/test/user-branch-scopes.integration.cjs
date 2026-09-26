'use strict'
// «نطاق الفروع» بعلامات صح لحساب الدخول (طلب المالك 26 سبتمبر) — إثبات حي على قاعدة مؤقتة:
//  1) ترحيل 20260926_068 عبر المُرحّل المجمّع نفسه: عمود users.scopeBranchIds nvarchar(400) NULL بلا تعبئة، فرق مخطط users صفر،
//     وإعادة التشغيل مابتغيّرش حاجة، وعمود بشكل غلط بيوقف التحقق بكوده (68002 / 68003).
//  2) شاشة المستخدمين: الفروع لازم تكون موجودة وبلا تكرار؛ [فرعه الأصلي] بيتخزن NULL و[] / null بيرجّعه لفرعه؛ «كل الفروع» بيمسح
//     المختارة؛ حساب الفروع يدّي فروع جوه نطاقه بس ومايفتحش «كل الفروع»؛ الحساب على مستوى الشركة يدّي أي فروع؛ والحساب اللي نطاقه
//     أوسع من المنفّذ مايديروش (دور، كلمة مرور، تعطيل، فروع، صلاحيات).
//  3) حساب نطاقه [أ، ب] يشوف أ وب ومايشوفش ج: الموظفين والهيكل والطلبات والحضور والمسيرات وسلاسل الاعتماد؛ ومايكتبش على ج
//     (موظف، نقل، طلب نيابة، بصمة يدوية، مسير، نسخة سلسلة) — والكتابة جوه أ وب شغالة (وأكتر من فرع = لازم يختار الفرع).
//  4) التقارير بالـSQL الخام (لوحة التحكم، التعداد، الحضور، الطلبات، الإجازات، تصدير Excel) بتعد أ وب مع بعض وعمرها ما بتعد ج.
//  5) الحساب غير المسند (مش مدير نظام ولا «كل الفروع» ولا له فرع) مايشوفش ولا يكتب حاجة — النطاق الفاضي عمره ما بقى «الكل».
//  6) التوكن: الفروع راكبة فيه (branchIds)؛ تغييرها من الشاشة بيزوّد tokenVersion ويموّت التوكن القديم؛ تضييقها بـSQL مباشر من غير
//     الإصدار بيموّته برضه (حزام JwtStrategy)؛ والتوسيع بيستنى الدخول الجاي؛ والتوكن القديم الشكل (بلا branchIds) = فرعه بس.
// قاعدة hr_user_branch_scopes_test_<16 hex> تُنشأ بـsynchronize وتُحذف في النهاية. لا مساس بقاعدة الشركة (hr_system).
// الجلسات من AuthService.issueSession نفسها (نفس توكن الدخول الحقيقي) بسر عشوائي — لا كلمات مرور حقيقية ولا أسرار.
// Run: node --test --test-concurrency=1 api/test/user-branch-scopes.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(apiRoot, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const ExcelJS = require('../node_modules/exceljs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const { employeeRequiredFields } = require('./helpers/employee-fixture.cjs')

const database = `hr_user_branch_scopes_test_${crypto.randomBytes(8).toString('hex')}`
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-user-branch-scopes-migrations-'))
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-user-branch-scopes-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const MIGRATIONS = path.join(repoRoot, 'docs/migrations/payroll')
const FILE = '20260926_068_user_branch_scopes.sql'
// كلمة مرور عشوائية لكل نداء (الحسابات بتتعمل وتتحذف مع القاعدة المؤقتة)
const randomPassword = () => crypto.randomBytes(12).toString('base64url') + 'a1'

let app, ds, master, pool, baseUrl, created = false
let D, YEAR
const B = {}, E = {}, U = {}, R = {}, RUN = {}, CH = {}

function assertDisposable() {
  assert.match(database, migrate.DISPOSABLE_DATABASE)
  assert.match(database, /^hr_user_branch_scopes_test_[a-f0-9]{16}$/)
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
const messageOf = r => { const m = r?.message ?? r?.body?.message; return Array.isArray(m) ? m.join(' ') : String(m ?? '') }
// نفس جلسة الدخول الحقيقية بالظبط: AuthService.issueSession (الصلاحيات من حزمة الدور، والنطاق من effectiveBranchScope)
async function session(user) {
  const row = await repo('User').findOneByOrFail({ id: user.id })
  const issued = await app.get(require('../src/auth/auth.service').AuthService).issueSession(row)
  return { token: issued.accessToken, user: issued.user, claims: jwt.decode(issued.accessToken) }
}
const rowsOf = body => Array.isArray(body) ? body : Object.values(body ?? {}).find(Array.isArray) ?? []
const sortNum = list => [...list].sort((a, b) => a - b)
const branchesOf = rows => sortNum([...new Set(rows.map(row => row.branchId))])
const idsOf = rows => rows.map(row => row.id)
const storedScope = async user => (await ds.query('SELECT scopeBranchIds FROM dbo.users WHERE id = @0', [user.id]))[0].scopeBranchIds
const tokenVersion = async user => (await ds.query('SELECT tokenVersion FROM dbo.users WHERE id = @0', [user.id]))[0].tokenVersion
const localDate = (offset = 0) => {
  const d = new Date(); d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
// ملف Excel اللي بيطلع من شاشة الموظفين: عدد الصفوف ونص كل الخلايا (عشان نشوف أرقام البصمة اللي فيه)
async function exportAs(token, ids) {
  const response = await fetch(`${baseUrl}/employees/export?ids=${ids.join(',')}`, { headers: { Authorization: `Bearer ${token}` } })
  assert.equal(response.status, 200)
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(Buffer.from(await response.arrayBuffer()))
  const sheet = workbook.worksheets[0]
  const cells = []
  sheet.eachRow(row => row.eachCell(cell => cells.push(String(cell.value ?? ''))))
  return { rows: Math.max(sheet.rowCount - 1, 0), text: cells.join('\n') }
}

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

  D = localDate(-3); YEAR = D.slice(0, 4)
  B.a = await repo('Branch').save({ name: 'فرع النطاق أ', code: 'SCA' })
  B.b = await repo('Branch').save({ name: 'فرع النطاق ب', code: 'SCB' })
  B.c = await repo('Branch').save({ name: 'فرع النطاق ج', code: 'SCC' })
  let n = 0
  const employee = async (branch, overrides = {}) => repo('Employee').save({
    ...(await employeeRequiredFields(ds, branch.id)), employeeCode: `SC${String(++n).padStart(3, '0')}`, fullName: `موظف نطاق ${n}`,
    branchId: branch.id, teamId: null, joinDate: '2022-01-01', basicSalary: 6000, currency: 'SAR', status: 'active', isActive: true, payMethod: 'cash', ...overrides })
  E.a1 = await employee(B.a)
  E.b1 = await employee(B.b)
  E.c1 = await employee(B.c)
  E.approver = await employee(B.a)

  const user = (key, role, branchId, extra = {}) => repo('User').save({ email: `${key}@branch-scopes.example.com`, displayName: `حساب ${key}`,
    passwordHash: 'test-only', role, branchId, employeeId: null, permissions: null, ...extra }).then(row => { U[key] = row })
  await user('admin', 'super_admin', null)
  await user('multi', 'hr_manager', B.a.id)                              // فرعه الأصلي أ — بياخد [أ، ب] من الشاشة
  await user('hrA', 'hr_manager', B.a.id)                                // فرع واحد: أ
  await user('hrB', 'hr_manager', B.b.id)                                // فرع واحد: ب
  await user('wide', 'hr_manager', B.a.id, { scopeAllBranches: true })   // «كل الفروع» من غير ما يكون مدير نظام
  await user('hrNone', 'hr_manager', null)                               // غير مسند: لا فرع ولا «كل الفروع»
  await user('staffA', 'employee', B.a.id)
  await user('staffB', 'employee', B.b.id)
  await user('staffC', 'employee', B.c.id)

  // سلسلة عامة ونسخة لفرع ج، ونوع طلب بسيط (وجهة none) — للطلبات والتقارير
  const admin = await session(U.admin)
  CH.step = employeeId => [{ approverRole: 'specific_employee', specificEmployeeId: employeeId, slaDays: 2 }]
  CH.general = expect(await http(admin.token, 'POST', '/settings/approval-chains', { code: 'SC_TEST', nameAr: 'سلسلة اختبار النطاق', steps: CH.step(E.approver.id) }), 201)
  CH.c = expect(await http(admin.token, 'POST', '/settings/approval-chains', { code: 'SC_TEST', nameAr: 'سلسلة اختبار النطاق — فرع ج',
    branchId: B.c.id, steps: CH.step(E.c1.id) }), 201)
  expect(await http(admin.token, 'POST', '/settings/request-types', { nameAr: 'طلب اختبار النطاق', category: 'employee_relations', code: 'SC_REQ',
    destinationHandler: 'none', customFields: [], approvalChainId: CH.general.id, visibleTo: { mode: 'all', ids: [] } }), 201)

  const request = emp => repo('Request').save({ typeCode: 'SC_REQ', requesterId: emp.id, branchId: emp.branchId, status: 'UNDER_REVIEW', payload: '{}', submittedAt: new Date() })
  R.a = await request(E.a1)
  R.b = await request(E.b1)
  R.c = await request(E.c1)
  for (const emp of [E.a1, E.b1, E.c1]) {
    await repo('AttendanceDay').save({ employeeId: emp.id, branchId: emp.branchId, date: D, checkIn: '09:00', checkOut: '17:00', shiftName: 'دوام اختبار النطاق',
      shiftStart: '09:00', shiftEnd: '17:00', status: 'present', workMinutes: 480 })
    await repo('LeaveBalance').save({ employeeId: emp.id, balanceType: 'annual', period: YEAR, entitled: 21, taken: 0 })
  }
  // مسيرات قديمة الشكل (بلا أعضاء): نطاقها من فرعها أو من scopeIds — فترة بعيدة عن يوم الحضور
  const run = (name, extra) => repo('PayrollRun').save({ name, scopeType: 'BRANCH', branchId: null, scopeIds: null, employeeIds: null, period: '2026-06',
    startDate: '2026-05-23', endDate: '2026-06-22', status: 'CALCULATED', totalNet: 0, ...extra })
  RUN.a = await run('مسير نطاق أ', { branchId: B.a.id })
  RUN.b = await run('مسير نطاق ب', { branchId: B.b.id })
  RUN.c = await run('مسير نطاق ج', { branchId: B.c.id })
  RUN.ab = await run('مسير نطاق أ و ب', { scopeIds: JSON.stringify([B.a.id, B.b.id]) })
  RUN.ac = await run('مسير نطاق أ و ج', { scopeIds: JSON.stringify([B.a.id, B.c.id]) })
  RUN.company = await run('مسير الشركة كلها', { scopeType: 'COMPANY' })
  RUN.bCancel = await run('مسير نطاق ب للإلغاء', { branchId: B.b.id })
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
      assert.equal(path.dirname(path.resolve(dir)), os.tmpdir()); assert.match(path.basename(dir), /^hr-user-branch-scopes-(migrations|files)-/)
      fs.rmSync(dir, { recursive: true, force: true })
    } catch (e) { errors.push(e) }
  }
  if (errors.length) throw new AggregateError(errors, 'user-branch-scopes fixture cleanup failed')
})

test('migration 068 through the real migrator: adds users.scopeBranchIds nvarchar(400) NULL, backfills nothing, zero users schema delta, re-runs change nothing', async () => {
  const content = fs.readFileSync(path.join(MIGRATIONS, FILE), 'utf8')
  assert.deepEqual(migrate.forbiddenStatements(content), [])
  assert.deepEqual(migrate.throwCodes(content), [68001, 68002, 68003, 68004])
  assert.doesNotMatch(migrate.stripComments(content), /\b(UPDATE|DELETE|DROP|TRUNCATE|MERGE)\b/i, 'إضافي فقط: بلا تعبئة ولا حذف')
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات')
  // ما قبل الترحيل: القاعدة اتعملت بـsynchronize فالعمود موجود — نشيله ونسيب الترحيل يضيفه
  await pool.request().batch('ALTER TABLE dbo.users DROP COLUMN scopeBranchIds;')
  const [{ n: usersBefore }] = await ds.query('SELECT COUNT(*) n FROM dbo.users')

  const record = await migrate.apply({ database, base, trial: true, schemaDiff: false, quiet: true })
  assert.equal(record.mode, 'disposable')
  assert.equal(record.failed, undefined, JSON.stringify(record.failed))
  assert.equal(record.trial?.passed, true)
  assert.deepEqual(record.applied.map(item => path.basename(item.file)), [FILE])
  assert.equal(record.ledgerComplete, true)
  assert.deepEqual(record.columns.added.filter(column => !column.startsWith('app_schema_migrations.')), ['users.scopeBranchIds'])
  assert.deepEqual(record.columns.removedOrRenamed, [])
  assert.deepEqual(record.rowCounts.differences.filter(d => d.table !== 'app_schema_migrations'), [])

  // العمود: nvarchar(400) = 800 بايت، يقبل الفراغ، بلا قيد افتراضي؛ كل الحسابات NULL (فرعها الأصلي زي الأول)؛ وفرق مخطط users صفر
  const shape = async () => (await ds.query(`SELECT t.name type, c.max_length maxLength, c.is_nullable nullable, c.default_object_id df
    FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id
    WHERE c.object_id = OBJECT_ID('dbo.users') AND c.name = 'scopeBranchIds'`)).map(c => [c.type, c.maxLength, !!c.nullable, c.df])
  assert.deepEqual(await shape(), [['nvarchar', 800, true, 0]])
  const [{ n: usersAfter, chosen }] = await ds.query('SELECT COUNT(*) n, SUM(CASE WHEN scopeBranchIds IS NOT NULL THEN 1 ELSE 0 END) chosen FROM dbo.users')
  assert.equal(usersAfter, usersBefore)
  assert.equal(chosen, 0, 'بلا تعبئة رجعية: محدش نطاقه اتغيّر من الترحيل')
  const { upQueries } = await ds.driver.createSchemaBuilder().log()
  assert.deepEqual(upQueries.map(q => q.query).filter(q => /"users"/.test(q)), [])

  // إعادة المُرحّل: مفيش ملف معلق. ونص الترحيل نفسه مرتين برّه الدفتر: آمن للتكرار
  const replay = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.deepEqual(replay.pendingBefore, []); assert.deepEqual(replay.applied, []); assert.equal(replay.ledgerComplete, true)
  for (let round = 0; round < 2; round++) for (const batch of migrate.splitBatches(content)) await pool.request().batch(batch)
  assert.deepEqual(await shape(), [['nvarchar', 800, true, 0]])

  // عمود بنوع أو طول غلط يوقف التحقق بكوده ومايسيبش أثر
  for (const [ddl, code] of [['ALTER TABLE dbo.users ALTER COLUMN scopeBranchIds varchar(400) NULL', 68002],
    ['ALTER TABLE dbo.users ALTER COLUMN scopeBranchIds nvarchar(200) NULL', 68003]]) {
    const tx = new sql.Transaction(pool)
    await tx.begin()
    try {
      await new sql.Request(tx).batch(ddl)
      await assert.rejects(new sql.Request(tx).batch(migrate.splitBatches(content).at(-1)), error => { assert.equal(error.number, code, error.message); return true })
    } finally { try { await tx.rollback() } catch { /* أُجهضت من الخادم */ } }
  }
  assert.deepEqual(await shape(), [['nvarchar', 800, true, 0]])
})

test('users API «نطاق الفروع»: existing branches only and no duplicates, [home] is stored as NULL, [] / null reset to home, «كل الفروع» clears the list, and every change bumps tokenVersion', async () => {
  const admin = await session(U.admin)
  const v0 = await tokenVersion(U.multi)
  const granted = expect(await http(admin.token, 'PATCH', `/users/${U.multi.id}`, { scopeBranchIds: [B.b.id, B.a.id] }), 200)
  assert.deepEqual(granted.scopeBranchIds, [B.a.id, B.b.id])
  assert.deepEqual(granted.branchIds, [B.a.id, B.b.id])
  assert.equal(await storedScope(U.multi), JSON.stringify([B.a.id, B.b.id]))
  assert.equal(await tokenVersion(U.multi), v0 + 1, 'تغيير الفروع بيبطّل الجلسات')
  // نفس الفروع تاني = مفيش تغيير = الجلسات ماتتقفلش
  expect(await http(admin.token, 'PATCH', `/users/${U.multi.id}`, { scopeBranchIds: [B.a.id, B.b.id] }), 200)
  assert.equal(await tokenVersion(U.multi), v0 + 1)

  // مرفوض: فرع مش موجود، تكرار، رقم مش صحيح موجب، نص، مش مصفوفة — ومفيش حاجة اتكتبت
  const untouched = [await storedScope(U.staffA), await tokenVersion(U.staffA)]
  assert.match(messageOf(expect(await http(admin.token, 'PATCH', `/users/${U.staffA.id}`, { scopeBranchIds: [B.a.id, 99999999] }), 400)), /غير موجود/)
  for (const bad of [[B.a.id, B.a.id], [0], [-3], [1.5], 'x', [String(B.a.id)], {}]) {
    expect(await http(admin.token, 'PATCH', `/users/${U.staffA.id}`, { scopeBranchIds: bad }), 400, JSON.stringify(bad))
  }
  assert.deepEqual([await storedScope(U.staffA), await tokenVersion(U.staffA)], untouched)

  // فرعه الأصلي لوحده = «فرعه بس» شكل واحد: بيتخزن NULL ومابيبطّلش جلسة
  const vb = await tokenVersion(U.staffB)
  const home = expect(await http(admin.token, 'PATCH', `/users/${U.staffB.id}`, { scopeBranchIds: [B.b.id] }), 200)
  assert.deepEqual([home.scopeBranchIds, home.branchIds], [[], [B.b.id]])
  assert.equal(await storedScope(U.staffB), null)
  assert.equal(await tokenVersion(U.staffB), vb)
  // فروع مش فيها الفرع الأصلي مسموحة: النطاق = المختارة بالظبط
  assert.deepEqual(expect(await http(admin.token, 'PATCH', `/users/${U.staffB.id}`, { scopeBranchIds: [B.c.id] }), 200).branchIds, [B.c.id])
  assert.deepEqual((await session(U.staffB)).claims.branchIds, [B.c.id])
  // [] و null = يرجع لفرعه الأصلي (NULL)
  for (const reset of [[], null]) {
    expect(await http(admin.token, 'PATCH', `/users/${U.staffB.id}`, { scopeBranchIds: [B.a.id, B.c.id] }), 200)
    const back = expect(await http(admin.token, 'PATCH', `/users/${U.staffB.id}`, { scopeBranchIds: reset }), 200)
    assert.deepEqual([back.scopeBranchIds, back.branchIds], [[], [B.b.id]], JSON.stringify(reset))
    assert.equal(await storedScope(U.staffB), null)
  }
  // «كل الفروع» (مدير النظام بس) بيمسح الفروع المختارة — والتوكن مابيشيلش فروع؛ والقفل بيرجّعه لفرعه
  const all = expect(await http(admin.token, 'PATCH', `/users/${U.staffB.id}`, { scopeAllBranches: true, scopeBranchIds: [B.a.id, B.b.id] }), 200)
  assert.deepEqual([all.scopeAllBranches, all.scopeBranchIds, all.branchIds], [true, [], null])
  assert.equal(await storedScope(U.staffB), null)
  const allSession = await session(U.staffB)
  assert.equal(allSession.claims.scopeAllBranches, true); assert.equal(allSession.claims.branchIds, undefined)
  expect(await http(admin.token, 'PATCH', `/users/${U.staffB.id}`, { scopeAllBranches: false }), 200)
  assert.deepEqual((await session(U.staffB)).claims.branchIds, [B.b.id])

  // الإنشاء: نفس التحقق والتخزين (مرتبة تصاعدي)
  const made = expect(await http(admin.token, 'POST', '/users', { email: 'created-multi@branch-scopes.example.com', password: randomPassword(),
    displayName: 'حساب جديد على فرعين', role: 'employee', branchId: B.c.id, scopeBranchIds: [B.c.id, B.a.id] }), 201)
  assert.deepEqual([made.branchId, made.scopeBranchIds, made.branchIds], [B.c.id, [B.a.id, B.c.id], [B.a.id, B.c.id]])
  expect(await http(admin.token, 'POST', '/users', { email: 'created-bad@branch-scopes.example.com', password: randomPassword(),
    displayName: 'حساب بفرع مش موجود', role: 'employee', branchId: B.c.id, scopeBranchIds: [99999999] }), 400)
  assert.equal(await repo('User').countBy({ email: 'created-bad@branch-scopes.example.com' }), 0)
})

test('users API: a branch-scoped admin grants only branches inside its own scope and never «كل الفروع»; a company-wide admin grants any; a wider account is off-limits to a narrower admin', async () => {
  const admin = await session(U.admin)
  const multi = await session(U.multi)
  assert.deepEqual(multi.claims.branchIds, [B.a.id, B.b.id])
  // القائمة: حسابات فروعه (بفرعها الأصلي) بس، وكل صف بنطاقه الفعّال
  const listed = expect(await http(multi.token, 'GET', '/users'), 200)
  assert.deepEqual(branchesOf(listed), [B.a.id, B.b.id])
  assert.ok(idsOf(listed).includes(U.staffB.id) && !idsOf(listed).includes(U.staffC.id) && !idsOf(listed).includes(U.hrNone.id))
  assert.deepEqual(listed.find(row => row.id === U.multi.id).branchIds, [B.a.id, B.b.id])

  const body = (key, extra) => ({ email: `${key}@branch-scopes.example.com`, password: randomPassword(), displayName: `حساب ${key}`, role: 'employee', ...extra })
  assert.match(messageOf(expect(await http(multi.token, 'POST', '/users', body('outside', { branchId: B.a.id, scopeBranchIds: [B.a.id, B.c.id] })), 403)), /جوه نطاقك/)
  assert.match(messageOf(expect(await http(multi.token, 'POST', '/users', body('wide-attempt', { branchId: B.a.id, scopeAllBranches: true })), 403)), /مدير النظام فقط/)
  assert.match(messageOf(expect(await http(multi.token, 'POST', '/users', body('no-branch', {})), 400)), /أكتر من فرع/)
  expect(await http(multi.token, 'POST', '/users', body('home-c', { branchId: B.c.id })), 403)
  for (const key of ['outside', 'wide-attempt', 'no-branch', 'home-c']) {
    assert.equal(await repo('User').countBy({ email: `${key}@branch-scopes.example.com` }), 0, key)
  }
  const made = expect(await http(multi.token, 'POST', '/users', body('inside', { branchId: B.b.id, scopeBranchIds: [B.a.id, B.b.id] })), 201)
  assert.deepEqual([made.branchId, made.branchIds], [B.b.id, [B.a.id, B.b.id]])

  // التعديل: فروع جوه نطاقه أيوه، برّه لأ، وحساب فرع ج «غير موجود» أصلًا
  expect(await http(multi.token, 'PATCH', `/users/${U.staffA.id}`, { scopeBranchIds: [B.b.id] }), 200)
  assert.equal(await storedScope(U.staffA), JSON.stringify([B.b.id]))
  assert.match(messageOf(expect(await http(multi.token, 'PATCH', `/users/${U.staffA.id}`, { scopeBranchIds: [B.b.id, B.c.id] }), 403)), /جوه نطاقك/)
  expect(await http(multi.token, 'PATCH', `/users/${U.staffA.id}`, { branchId: B.c.id }), 403)
  expect(await http(multi.token, 'PATCH', `/users/${U.staffA.id}`, { scopeAllBranches: true }), 403)
  expect(await http(multi.token, 'PATCH', `/users/${U.staffC.id}`, { scopeBranchIds: [B.a.id] }), 404)
  assert.equal(await storedScope(U.staffA), JSON.stringify([B.b.id]))
  // ولا أحد يغيّر فروعه هو
  assert.match(messageOf(expect(await http(multi.token, 'PATCH', `/users/${U.multi.id}`, { scopeBranchIds: [B.a.id] }), 400)), /بنفسك/)
  assert.equal(await storedScope(U.multi), JSON.stringify([B.a.id, B.b.id]))

  // الأضيق: حساب فرع أ بس شايف حسابات فرعه الأصلي أ، بس اللي نطاقه فيه فرع برّه أ مايديروش خالص
  const hrA = await session(U.hrA)
  assert.deepEqual(expect(await http(hrA.token, 'GET', '/users'), 200).find(row => row.id === U.multi.id).branchIds, [B.a.id, B.b.id])
  const versions = [await tokenVersion(U.multi), await tokenVersion(U.staffA)]
  for (const target of [U.multi, U.staffA]) {
    for (const patch of [{ role: 'branch_manager' }, { password: randomPassword() }, { isActive: false }, { scopeBranchIds: [B.a.id] }]) {
      assert.match(messageOf(expect(await http(hrA.token, 'PATCH', `/users/${target.id}`, patch), 403, JSON.stringify(Object.keys(patch)))), /فروع برّه نطاقك/)
    }
    assert.match(messageOf(expect(await http(hrA.token, 'POST', '/users/temporary-password', { userIds: [target.id], password: randomPassword() }), 403)), /فروع برّه نطاقك/)
    assert.match(messageOf(expect(await http(hrA.token, 'PUT', `/users/${target.id}/permissions`, { grants: ['employees.edit'], revokes: [] }), 403)), /فروع برّه نطاقك/)
  }
  assert.deepEqual([await tokenVersion(U.multi), await tokenVersion(U.staffA)], versions)
  assert.equal(await repo('UserPermissionOverride').countBy({ userId: U.multi.id }), 0)
  const multiRow = await repo('User').findOneByOrFail({ id: U.multi.id })
  assert.deepEqual([multiRow.role, multiRow.isActive, multiRow.passwordHash], ['hr_manager', true, 'test-only'])

  // «كل الفروع» (مش مدير نظام) يدّي أي فروع — بس مايفتحش «كل الفروع» لغيره
  const wide = await session(U.wide)
  assert.equal(wide.claims.scopeAllBranches, true); assert.equal(wide.claims.branchIds, undefined)
  assert.deepEqual(expect(await http(wide.token, 'PATCH', `/users/${U.staffA.id}`, { scopeBranchIds: [B.a.id, B.b.id, B.c.id] }), 200).branchIds, [B.a.id, B.b.id, B.c.id])
  expect(await http(wide.token, 'PATCH', `/users/${U.staffA.id}`, { scopeAllBranches: true }), 403)
  // ودلوقتي حساب [أ، ب] نفسه مايديرش staffA (بقى فيه ج)
  assert.match(messageOf(expect(await http(multi.token, 'PATCH', `/users/${U.staffA.id}`, { scopeBranchIds: [B.a.id] }), 403)), /فروع برّه نطاقك/)
  expect(await http(admin.token, 'PATCH', `/users/${U.staffA.id}`, { scopeBranchIds: null }), 200)
  assert.equal(await storedScope(U.staffA), null)
})

test('a user scoped to [A, B] sees A and B but never C: employees, org, requests, attendance, payroll runs and approval chains', async () => {
  const s = await session(U.multi)
  assert.deepEqual(s.claims.branchIds, [B.a.id, B.b.id]); assert.deepEqual(s.user.branchIds, [B.a.id, B.b.id])
  expect(await http(s.token, 'GET', '/auth/me'), 200)
  // الموظفين والهيكل
  const employees = expect(await http(s.token, 'GET', '/employees'), 200)
  assert.deepEqual(branchesOf(employees), [B.a.id, B.b.id])
  assert.ok(idsOf(employees).includes(E.a1.id) && idsOf(employees).includes(E.b1.id) && !idsOf(employees).includes(E.c1.id))
  expect(await http(s.token, 'GET', `/employees/${E.b1.id}`), 200)
  expect(await http(s.token, 'GET', `/employees/${E.c1.id}`), 404)
  assert.ok(!idsOf(expect(await http(s.token, 'GET', '/employees/directory'), 200)).includes(E.c1.id))
  assert.deepEqual(sortNum(idsOf(expect(await http(s.token, 'GET', '/branches'), 200))), [B.a.id, B.b.id])
  assert.deepEqual(branchesOf(expect(await http(s.token, 'GET', '/departments'), 200)), [B.a.id, B.b.id])
  // الطلبات
  const requests = idsOf(expect(await http(s.token, 'GET', '/requests/all'), 200))
  assert.ok(requests.includes(R.a.id) && requests.includes(R.b.id) && !requests.includes(R.c.id))
  expect(await http(s.token, 'GET', `/requests/${R.b.id}`), 200)
  // برّه النطاق = «غير موجود» زي الرقم اللي مش موجود (مراجعة Codex الجولة 4 — N02)
  expect(await http(s.token, 'GET', `/requests/${R.c.id}`), 404)
  // الحضور
  const daily = expect(await http(s.token, 'GET', `/attendance/daily?date=${D}`), 200)
  const dailyIds = daily.map(row => row.employeeId)
  assert.ok(dailyIds.includes(E.a1.id) && dailyIds.includes(E.b1.id) && !dailyIds.includes(E.c1.id))
  assert.ok(daily.every(row => [B.a.id, B.b.id].includes(row.branchId)))
  expect(await http(s.token, 'GET', `/attendance/monthly?employeeId=${E.b1.id}&month=${D.slice(0, 7)}`), 200)
  expect(await http(s.token, 'GET', `/attendance/monthly?employeeId=${E.c1.id}&month=${D.slice(0, 7)}`), 400)
  // المسيرات: فرع أ، فرع ب، والمسير اللي على الاتنين؛ مش ج ولا أ+ج ولا الشركة
  const runs = idsOf(expect(await http(s.token, 'GET', '/payroll/runs'), 200))
  for (const key of ['a', 'b', 'ab', 'bCancel']) assert.ok(runs.includes(RUN[key].id), key)
  for (const key of ['c', 'ac', 'company']) assert.ok(!runs.includes(RUN[key].id), key)
  expect(await http(s.token, 'GET', `/payroll/runs/${RUN.c.id}`), 403)
  expect(await http(s.token, 'GET', `/payroll/runs/${RUN.ac.id}`), 403)
  expect(await http(s.token, 'GET', `/payroll/runs/${RUN.ab.id}`), 200)
  // حساب فرع واحد (ب): نفس القاعدة القديمة بالحرف — مسير أ و ب مش ليه
  const single = await session(U.hrB)
  assert.deepEqual(single.claims.branchIds, [B.b.id])
  const singleRuns = idsOf(expect(await http(single.token, 'GET', '/payroll/runs'), 200))
  assert.ok(singleRuns.includes(RUN.b.id) && !singleRuns.includes(RUN.ab.id) && !singleRuns.includes(RUN.a.id))
  expect(await http(single.token, 'GET', `/payroll/runs/${RUN.ab.id}`), 403)
  assert.deepEqual(branchesOf(expect(await http(single.token, 'GET', '/employees'), 200)), [B.b.id])
  // سلاسل الاعتماد: العامة ونسخ فروعه، ونسخة فرع ج لأ
  const chains = idsOf(expect(await http(s.token, 'GET', '/settings/approval-chains'), 200))
  assert.ok(chains.includes(CH.general.id) && !chains.includes(CH.c.id))
})

test('the [A, B] user writes inside A and B but never into C: employees, transfers, requests on behalf, manual punches, payroll runs, branch approval chains', async () => {
  const s = await session(U.multi)
  // موظف جديد: فرع ج ممنوع، ومن غير فرع مرفوض (الفرع إجباري في النموذج أصلًا — ولحساب أكتر من فرع مفيش اختيار صامت)، وفرع ب ماشي
  const newEmployee = async (branch, extra = {}) => ({ ...(await employeeRequiredFields(ds, branch.id)), fullName: 'موظف جديد في النطاق',
    joinDate: '2026-01-01', basicSalary: 6000, currency: 'SAR', payMethod: 'cash', ...extra })
  const employeesBefore = await repo('Employee').count()
  assert.match(messageOf(expect(await http(s.token, 'POST', '/employees', await newEmployee(B.c, { branchId: B.c.id })), 403)), /برّه فروعك/)
  assert.match(messageOf(expect(await http(s.token, 'POST', '/employees', await newEmployee(B.b)), 400)), /الفرع مطلوب|أكتر من فرع/)
  assert.equal(await repo('Employee').count(), employeesBefore)
  const hired = expect(await http(s.token, 'POST', '/employees', await newEmployee(B.b, { branchId: B.b.id })), 201)
  assert.equal(hired.branchId, B.b.id)
  // تعديل: موظف ج «غير موجود»، ونقل موظف لفرع ج ممنوع، وتعديل موظف ب ماشي
  expect(await http(s.token, 'PATCH', `/employees/${E.c1.id}`, { phone: '0501112233' }), 404)
  assert.match(messageOf(expect(await http(s.token, 'PATCH', `/employees/${E.a1.id}`, { branchId: B.c.id }), 403)), /خارج نطاق فروعك/)
  assert.equal((await repo('Employee').findOneByOrFail({ id: E.a1.id })).branchId, B.a.id)
  assert.equal(expect(await http(s.token, 'PATCH', `/employees/${E.b1.id}`, { phone: '0501112233' }), 200).phone, '0501112233')
  // طلب نيابة: موظف ج ممنوع، موظف ب ماشي
  assert.match(messageOf(expect(await http(s.token, 'POST', '/requests', { typeCode: 'SC_REQ', payload: {}, onBehalfEmployeeId: E.c1.id }), 403)), /خارج نطاق فروعك/)
  assert.equal(expect(await http(s.token, 'POST', '/requests', { typeCode: 'SC_REQ', payload: {}, onBehalfEmployeeId: E.b1.id }), 201).branchId, B.b.id)
  // بصمة يدوية: دفعة فيها موظف ج مرفوضة كلها، وموظف ب لوحده ماشي
  const punchOf = emp => ({ employeeCode: emp.fingerprintCode, timestamp: `${D} 09:05:00` })
  const punchesBefore = await repo('AttendancePunch').count()
  assert.match(messageOf(expect(await http(s.token, 'POST', '/attendance/punches/manual', { punches: [punchOf(E.b1), punchOf(E.c1)], reason: 'اختبار نطاق الفروع' }), 403)), /خارج نطاق فروعك/)
  assert.equal(await repo('AttendancePunch').count(), punchesBefore)
  expect(await http(s.token, 'POST', '/attendance/punches/manual', { punches: [punchOf(E.b1)], reason: 'اختبار نطاق الفروع' }), 201)
  assert.equal(await repo('AttendancePunch').count(), punchesBefore + 1)
  // المسيرات: مسير ج ممنوع ومايتلمسش، ومسير ب بيتلغي
  assert.match(messageOf(expect(await http(s.token, 'POST', `/payroll/runs/${RUN.c.id}/cancel`, { reason: 'اختبار نطاق الفروع' }), 403)), /خارج الفرع المسموح/)
  assert.equal((await repo('PayrollRun').findOneByOrFail({ id: RUN.c.id })).status, 'CALCULATED')
  const cancelled = await http(s.token, 'POST', `/payroll/runs/${RUN.bCancel.id}/cancel`, { reason: 'اختبار نطاق الفروع' })
  assert.ok([200, 201].includes(cancelled.status), JSON.stringify(cancelled.body).slice(0, 400))
  assert.equal((await repo('PayrollRun').findOneByOrFail({ id: RUN.bCancel.id })).status, 'CANCELLED')
  // نسخة سلسلة لفرع: فرع ب ماشي، فرع ج ممنوع، والسلسلة العامة ونسخة ج لحساب على مستوى الشركة بس
  const versionB = expect(await http(s.token, 'POST', '/settings/approval-chains', { code: 'SC_TEST', nameAr: 'سلسلة اختبار النطاق — فرع ب',
    branchId: B.b.id, steps: CH.step(E.b1.id) }), 201)
  assert.equal(versionB.branchId, B.b.id)
  expect(await http(s.token, 'POST', '/settings/approval-chains', { code: 'SC_TEST', nameAr: 'نسخة لفرع برّه النطاق', branchId: B.c.id, steps: CH.step(E.c1.id) }), 403)
  expect(await http(s.token, 'PATCH', `/settings/approval-chains/${CH.c.id}`, { isActive: false }), 403)
  expect(await http(s.token, 'PATCH', `/settings/approval-chains/${CH.general.id}`, { isActive: false }), 403)
  assert.equal((await repo('ApprovalChain').findOneByOrFail({ id: CH.c.id })).isActive, true)
  const listed = idsOf(expect(await http(s.token, 'GET', '/settings/approval-chains'), 200))
  assert.ok(listed.includes(versionB.id) && !listed.includes(CH.c.id))
})

test('raw-SQL report paths (dashboard, /reports/*, Excel export) count A and B together and never C; a single-branch account keeps its one branch', async () => {
  const s = await session(U.multi)
  const [{ n: employeesAB }] = await ds.query(`SELECT COUNT(*) n FROM dbo.employees WHERE isActive = 1 AND status NOT IN ('archived', 'terminated') AND branchId IN (@0, @1)`, [B.a.id, B.b.id])
  const [{ n: requestsAB }] = await ds.query('SELECT COUNT(*) n FROM dbo.requests WHERE branchId IN (@0, @1)', [B.a.id, B.b.id])
  const [{ n: requestsAll }] = await ds.query('SELECT COUNT(*) n FROM dbo.requests')
  assert.ok(requestsAll > requestsAB, 'فيه طلبات في ج فعلًا')
  // لوحة التحكم
  const stats = expect(await http(s.token, 'GET', '/dashboard/stats'), 200)
  assert.equal(stats.employees.total, employeesAB)
  assert.equal(stats.org.branches, 2)
  assert.equal(stats.requests.total, requestsAB)
  assert.ok(stats.payrollRuns.every(run => [B.a.id, B.b.id].includes(run.branchId)))
  expect(await http(s.token, 'GET', '/dashboard/attendance-trend?period=week'), 200)
  // التعداد
  const headcount = expect(await http(s.token, 'GET', '/reports/headcount'), 200)
  assert.deepEqual(headcount.byBranch.map(row => row.branchName).sort(), [B.a.name, B.b.name].sort())
  // الحضور: الفرعين، وفلتر فرع من فروعه، وفرع برّه نطاقه مرفوض
  const attendanceIds = expect(await http(s.token, 'GET', `/reports/attendance?from=${D}&to=${D}`), 200).map(row => row.employeeId)
  assert.ok(attendanceIds.includes(E.a1.id) && attendanceIds.includes(E.b1.id) && !attendanceIds.includes(E.c1.id))
  assert.deepEqual(expect(await http(s.token, 'GET', `/reports/attendance?from=${D}&to=${D}&branchId=${B.b.id}`), 200).map(row => row.employeeId), [E.b1.id])
  assert.match(messageOf(expect(await http(s.token, 'GET', `/reports/attendance?from=${D}&to=${D}&branchId=${B.c.id}`), 403)), /فروعه/)
  // الطلبات والإجازات
  const byType = expect(await http(s.token, 'GET', '/reports/requests'), 200).byType
  assert.equal(byType.reduce((sum, row) => sum + Number(row.total), 0), requestsAB)
  const balanceIds = expect(await http(s.token, 'GET', `/reports/leaves?year=${YEAR}`), 200).balances.map(row => row.employeeId)
  assert.ok(balanceIds.includes(E.a1.id) && balanceIds.includes(E.b1.id) && !balanceIds.includes(E.c1.id))
  // تقرير الرواتب «موظفون بلا مسير» (payroll-reports: شرط IN بمعاملات): موظفين أ وب بس
  const unassignedIds = expect(await http(s.token, 'GET', `/reports/payroll/unassigned?from=${D}&to=${D}`), 200).rows.map(row => row.employeeId)
  assert.ok(unassignedIds.includes(E.a1.id) && unassignedIds.includes(E.b1.id) && !unassignedIds.includes(E.c1.id))
  // تصدير Excel بأرقام موظفين من التلات فروع: اللي برّه النطاق بيسقط
  const exported = await exportAs(s.token, [E.a1.id, E.b1.id, E.c1.id])
  assert.equal(exported.rows, 2)
  assert.ok(exported.text.includes(E.a1.fingerprintCode) && exported.text.includes(E.b1.fingerprintCode) && !exported.text.includes(E.c1.fingerprintCode))
  // فرع واحد: فرعه بس زي الأول، ومدير النظام بيشوف التلاتة
  const single = await session(U.hrB)
  assert.deepEqual(expect(await http(single.token, 'GET', '/reports/headcount'), 200).byBranch.map(row => row.branchName), [B.b.name])
  assert.equal((await exportAs(single.token, [E.a1.id, E.b1.id, E.c1.id])).rows, 1)
  const admin = await session(U.admin)
  assert.deepEqual(expect(await http(admin.token, 'GET', '/reports/headcount'), 200).byBranch.map(row => row.branchName).sort(), [B.a.name, B.b.name, B.c.name].sort())
  assert.equal((await exportAs(admin.token, [E.a1.id, E.b1.id, E.c1.id])).rows, 3)
})

test('payroll «موظفون بلا مسير» on a run for [A, B]: the report covers exactly both branches, the acknowledgement is stored per branch, and it never counts for the company scope', async () => {
  const s = await session(U.multi)
  const view = expect(await http(s.token, 'GET', `/payroll/runs/${RUN.ab.id}/unassigned`), 200)
  assert.equal(view.scopeBranchId, null); assert.deepEqual(view.scopeBranchIds, [B.a.id, B.b.id])
  const ids = view.rows.map(row => row.employeeId)
  assert.ok(ids.includes(E.a1.id) && ids.includes(E.b1.id) && !ids.includes(E.c1.id))
  assert.equal(view.acknowledgement.current, null); assert.equal(view.acknowledgement.canAcknowledge, true)
  expect(await http(s.token, 'POST', `/payroll/runs/${RUN.ab.id}/unassigned-ack`, { reportHash: view.reportHash, note: 'مراجعة الفرعين' }), 201)
  // صف إقرار لكل فرع (العمود رقم فرع واحد) ببصمة تقرير الفرع ده
  const acks = await repo('PayrollRunUnassignedAck').find({ where: { runId: RUN.ab.id }, order: { id: 'ASC' } })
  assert.deepEqual(acks.map(ack => ack.scopeBranchId), [B.a.id, B.b.id])
  assert.notEqual(acks[0].reportHash, acks[1].reportHash)
  const acknowledged = expect(await http(s.token, 'GET', `/payroll/runs/${RUN.ab.id}/unassigned`), 200)
  assert.equal(acknowledged.acknowledgement.current?.id, acks[1].id); assert.equal(acknowledged.acknowledgement.stale, false)
  // إقرار الفروع مايغطيش نطاق الشركة، وبصمة تقرير الشركة غير بصمة تقرير الفرعين (والشكل القديم للشركة من غير scopeBranchIds)
  const admin = await session(U.admin)
  const company = expect(await http(admin.token, 'GET', `/payroll/runs/${RUN.ab.id}/unassigned`), 200)
  assert.equal(company.scopeBranchId, null); assert.equal(company.scopeBranchIds, undefined)
  assert.notEqual(company.reportHash, view.reportHash)
  assert.equal(company.acknowledgement.current, null); assert.equal(company.acknowledgement.stale, true)
})

test('an unassigned non-admin (no branch, not «all branches») sees nothing and writes nothing — the empty scope never means «all»', async () => {
  const s = await session(U.hrNone)
  assert.equal(s.claims.branchId, null); assert.equal(s.claims.scopeAllBranches, undefined)
  assert.deepEqual(s.claims.branchIds, []); assert.deepEqual(s.user.branchIds, [])
  assert.ok(s.user.permissions.includes('employees.view') && s.user.permissions.includes('users.manage'), 'الصلاحيات موجودة — النطاق هو اللي فاضي')
  expect(await http(s.token, 'GET', '/auth/me'), 200)
  for (const route of ['/employees', '/employees/directory', '/branches', '/departments', '/users', '/payroll/runs', '/requests/all',
    `/attendance/daily?date=${D}`, `/reports/attendance?from=${D}&to=${D}`]) {
    assert.deepEqual(rowsOf(expect(await http(s.token, 'GET', route), 200, route)), [], route)
  }
  const stats = expect(await http(s.token, 'GET', '/dashboard/stats'), 200)
  assert.deepEqual([stats.employees.total, stats.org.branches, stats.org.departments, stats.requests.total, stats.payrollRuns.length], [0, 0, 0, 0, 0])
  assert.deepEqual(expect(await http(s.token, 'GET', '/reports/headcount'), 200).byBranch, [])
  assert.deepEqual(expect(await http(s.token, 'GET', '/reports/requests'), 200).byType, [])
  assert.deepEqual(expect(await http(s.token, 'GET', `/reports/leaves?year=${YEAR}`), 200).balances, [])
  assert.equal((await exportAs(s.token, [E.a1.id, E.b1.id, E.c1.id])).rows, 0)
  expect(await http(s.token, 'GET', `/employees/${E.a1.id}`), 404)
  expect(await http(s.token, 'GET', `/requests/${R.a.id}`), 404)
  expect(await http(s.token, 'GET', `/payroll/runs/${RUN.a.id}`), 403)
  // ولا كتابة
  const employeesBefore = await repo('Employee').count()
  assert.match(messageOf(expect(await http(s.token, 'POST', '/employees', { ...(await employeeRequiredFields(ds, B.a.id)), fullName: 'موظف من حساب غير مسند',
    branchId: B.a.id, joinDate: '2026-01-01', basicSalary: 6000, currency: 'SAR', payMethod: 'cash' }), 403)), /مش مربوط بفرع/)
  assert.equal(await repo('Employee').count(), employeesBefore)
  expect(await http(s.token, 'PATCH', `/employees/${E.a1.id}`, { phone: '0500000000' }), 404)
  expect(await http(s.token, 'POST', '/attendance/punches/manual', { punches: [{ employeeCode: E.a1.fingerprintCode, timestamp: `${D} 10:00:00` }], reason: 'اختبار' }), 403)
  expect(await http(s.token, 'POST', '/requests', { typeCode: 'SC_REQ', payload: {}, onBehalfEmployeeId: E.a1.id }), 403)
  expect(await http(s.token, 'POST', `/payroll/runs/${RUN.a.id}/cancel`, { reason: 'اختبار نطاق الفروع' }), 403)
  assert.equal((await repo('PayrollRun').findOneByOrFail({ id: RUN.a.id })).status, 'CALCULATED')
  expect(await http(s.token, 'POST', '/settings/approval-chains', { code: 'SC_TEST', nameAr: 'نسخة من حساب غير مسند', branchId: B.a.id, steps: CH.step(E.a1.id) }), 403)
  expect(await http(s.token, 'POST', '/users', { email: 'from-unassigned@branch-scopes.example.com', password: randomPassword(), displayName: 'حساب من حساب غير مسند',
    role: 'employee', branchId: B.a.id }), 403)
})

test('the scope rides in the token: a scopeBranchIds change bumps tokenVersion and kills the old session, narrowing behind the screen kills it too, widening waits for the next login', async () => {
  const admin = await session(U.admin)
  const old = await session(U.multi)
  assert.deepEqual(old.claims.branchIds, [B.a.id, B.b.id])
  expect(await http(old.token, 'GET', '/auth/me'), 200)
  const v0 = await tokenVersion(U.multi)
  // من الشاشة: فرع أ بس (= فرعه الأصلي → بيتخزن NULL) — الإصدار يزيد والتوكن القديم يموت فورًا
  const narrowed = expect(await http(admin.token, 'PATCH', `/users/${U.multi.id}`, { scopeBranchIds: [B.a.id] }), 200)
  assert.deepEqual(narrowed.branchIds, [B.a.id])
  assert.equal(await storedScope(U.multi), null)
  assert.equal(await tokenVersion(U.multi), v0 + 1)
  for (const route of ['/auth/me', '/employees']) expect(await http(old.token, 'GET', route), 401, route)
  const fresh = await session(U.multi)
  assert.deepEqual(fresh.claims.branchIds, [B.a.id])
  assert.deepEqual(branchesOf(expect(await http(fresh.token, 'GET', '/employees'), 200)), [B.a.id])
  // توكن قديم الشكل (قبل branchIds) بنفس الإصدار: فرعه الأصلي بس — عمره ما بيوسّع
  const { iat: _iat, exp: _exp, branchIds: _branchIds, ...legacyClaims } = fresh.claims
  assert.deepEqual(branchesOf(expect(await http(jwt.sign(legacyClaims), 'GET', '/employees'), 200)), [B.a.id])

  // حزام JwtStrategy: التضييق بـSQL مباشر (من غير رفع الإصدار) بيموّت التوكن اللي شايل فرع اتشال
  expect(await http(admin.token, 'PATCH', `/users/${U.multi.id}`, { scopeBranchIds: [B.a.id, B.b.id] }), 200)
  const wideToken = await session(U.multi)
  assert.deepEqual(wideToken.claims.branchIds, [B.a.id, B.b.id])
  const version = await tokenVersion(U.multi)
  await ds.query('UPDATE dbo.users SET scopeBranchIds = @0 WHERE id = @1', [JSON.stringify([B.b.id]), U.multi.id])
  assert.equal(await tokenVersion(U.multi), version)
  expect(await http(wideToken.token, 'GET', '/employees'), 401)
  // والتوسيع بـSQL مابيموّتش التوكن الأضيق — بيفضل على فروعه لحد الدخول الجاي (فشل مقفول)
  const narrowToken = await session(U.multi)
  assert.deepEqual(narrowToken.claims.branchIds, [B.b.id])
  await ds.query('UPDATE dbo.users SET scopeBranchIds = @0 WHERE id = @1', [JSON.stringify([B.a.id, B.b.id]), U.multi.id])
  assert.deepEqual(branchesOf(expect(await http(narrowToken.token, 'GET', '/employees'), 200)), [B.b.id])
  // وتوكن بفرع مش في نطاق الحساب في القاعدة (ج) بيموت حتى لو الإصدار مطابق
  const { iat: _iat2, exp: _exp2, ...claims } = narrowToken.claims
  expect(await http(jwt.sign({ ...claims, branchIds: [B.a.id, B.b.id, B.c.id] }), 'GET', '/employees'), 401)
  assert.deepEqual(branchesOf(expect(await http((await session(U.multi)).token, 'GET', '/employees'), 200)), [B.a.id, B.b.id])
})

test('round-4 review: out of scope reads exactly like «not found» (requests, attendance exemptions), and a C-only shift or work-schedule history stays hidden', async () => {
  // مراجعة Codex الجولة 4 (N01 وN02): حساب [أ، ب] معاه إعدادات النظام وعرض الطلبات وإدارة الاستثناءات
  U.r4 = await repo('User').save({ email: 'r4@branch-scopes.example.com', displayName: 'حساب r4', passwordHash: 'test-only', role: 'hr_manager',
    branchId: B.a.id, employeeId: null, scopeBranchIds: JSON.stringify([B.a.id, B.b.id]),
    permissions: JSON.stringify(['settings.manage', 'requests.view_all', 'attendance_exemption.manage']) })
  const s = await session(U.r4), admin = await session(U.admin)
  assert.deepEqual(s.claims.branchIds, [B.a.id, B.b.id])
  // الطلب في ج = نفس رد الرقم اللي مش موجود بالحرف
  const hiddenRequest = await http(s.token, 'GET', `/requests/${R.c.id}`), missingRequest = await http(s.token, 'GET', '/requests/99999999')
  assert.deepEqual([hiddenRequest.status, messageOf(hiddenRequest)], [404, messageOf(missingRequest)])
  assert.equal(missingRequest.status, 404)
  expect(await http(s.token, 'GET', `/requests/${R.b.id}`), 200)
  // استثناء حضور لموظف في ج = نفس رد الموظف اللي مش موجود
  const exemption = employeeId => ({ employeeId, effectiveFrom: D, reasonCode: 'field_role', reason: 'سبب اختبار موثق وواضح يتجاوز عشرين حرفًا لاتخاذ القرار' })
  const hiddenEmployee = await http(s.token, 'POST', '/attendance-exemptions', exemption(E.c1.id))
  const missingEmployee = await http(s.token, 'POST', '/attendance-exemptions', exemption(99999999))
  assert.deepEqual([hiddenEmployee.status, messageOf(hiddenEmployee)], [404, messageOf(missingEmployee)])
  // تاريخ وردية وجدول عمل خاصين بفرع ج: غير موجودين لحساب [أ، ب]، وظاهرين لمدير النظام؛ والتعريف العام ظاهر للكل
  const change = { effectiveFrom: D, changeReason: 'اختبار نطاق تاريخ تعريفات الدوام' }
  const shiftBody = name => ({ name, startTime: '09:00', endTime: '17:00', shiftMode: 'fixed', graceMinutes: 10, flexEnabled: false,
    flexWindowMinutes: 60, requiredWorkMinutes: 480, ...change })
  const shiftC = expect(await http(admin.token, 'POST', '/catalogs/shifts', { ...shiftBody('وردية فرع ج'), branchId: B.c.id }), 201)
  const shiftAll = expect(await http(admin.token, 'POST', '/catalogs/shifts', shiftBody('وردية لكل الشركة')), 201)
  const scheduleC = expect(await http(admin.token, 'POST', '/catalogs/work-schedules', { name: 'جدول فرع ج', startTime: '09:00', endTime: '17:00',
    weekendDays: 'FRI,SAT', isActive: true, flexEnabled: false, requiredWorkMinutes: 480, branchId: B.c.id, ...change }), 201)
  assert.deepEqual([(await repo('Shift').findOneByOrFail({ id: shiftC.id })).branchId, (await repo('WorkSchedule').findOneByOrFail({ id: scheduleC.id })).branchId,
    (await repo('Shift').findOneByOrFail({ id: shiftAll.id })).branchId], [B.c.id, B.c.id, null])
  for (const route of [`/attendance-rules/SHIFT/${shiftC.id}/history`, `/attendance-rules/WORK_SCHEDULE/${scheduleC.id}/history`]) {
    expect(await http(s.token, 'GET', route), 404, route)
    assert.ok(expect(await http(admin.token, 'GET', route), 200, route).length >= 1)
  }
  assert.ok(expect(await http(s.token, 'GET', `/attendance-rules/SHIFT/${shiftAll.id}/history`), 200).length >= 1)
})
