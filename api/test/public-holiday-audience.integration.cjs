'use strict'
// «تسري على» للعطلة الرسمية (طلب المالك 26 سبتمبر: «اقدر اخصص الاجازات الرسمية علي ناس معينه») — إثبات حي بـSQL وHTTP
// فعليين على قاعدة مؤقتة معزولة تُحذف في النهاية:
//  1) ترحيل 20260926_070 عبر المُرحّل المجمّع نفسه على قاعدة فيها عطلات ونسخ تقويم عام قديمة (اتكتبت قبل العمود بمعادلة
//     البصمة المستقلة): عمود public_holidays.audience nvarchar(max) NULL بلا تعبئة، فرق مخطط الجدول صفر، إعادة التشغيل
//     مابتغيّرش حاجة، والشكل الغلط بيوقف التحقق بكوده (70002/70003/70004).
//  2) لا انحراف: القيم الحالية بعد الترحيل لسه مطابقة لآخر نسخة (بنفس البصمة المستقلة)، والحسم المالي الصارم شغال،
//     وتعديل التقويم (إضافة عطلة مخصصة) شغال على نفس النسخة، والنسخ القديمة زي ما هي بالحرف.
//  3) عطلة لموظف واحد: يومه عطلة ومابيتسجلش غياب، وزميله في نفس الفرع يومه شغل ويتسجل غياب لو مابصمش؛ الإجازة بتعدّ اليوم
//     للزميل وبتستبعده للمشمول؛ و/attendance/working-days وتقويم المسير الصارم متفقين.
//  4) أقسام (بالأقسام الفرعية) وفرق وفرع كامل؛ العطلة القديمة اللي للكل زي ما هي؛ تقويم الفرع بياخد «الفرع كله» بس.
//  5) تعديل «تسري على» بيعيد حساب الأيام (اللي خرج بيبقى غياب واللي دخل بيبقى عطلة)، والتحقق بيرفض الأرقام الغلط.
//  6) أمر «دوام يوم عطلة» على يوم عطلة مخصصة، وقوائم العرض (الموظف بيشوف اللي تخصه بس ومن غير أرقام حد تاني).
// قاعدة hr_public_holiday_audience_test_<16 hex> — لا مساس بقاعدة الشركة. التوكنات موقّعة محليًا بسر عشوائي.
// Run: node --test --test-concurrency=1 api/test/public-holiday-audience.integration.cjs
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

const database = `hr_public_holiday_audience_test_${crypto.randomBytes(8).toString('hex')}`
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-holiday-audience-migrations-'))
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-holiday-audience-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const MIGRATIONS = path.join(repoRoot, 'docs/migrations/payroll')
const FILE = '20260926_070_public_holiday_audience.sql'
const cal = require('../src/attendance/attendance-calendar-history')
const { resolveEmployeeCalendarDay, resolveBranchCalendarDay } = require('../src/attendance/attendance-calendar-resolver')
const { readPayrollLiveSchedule } = require('../src/payroll/payroll-live-schedule-provider')
const { AttendanceService } = require('../src/attendance/attendance.service')

// سبتمبر 2026 (الراحة الجمعة والسبت): 2 أربع، 3 خميس، 7 اتنين، 8 تلات، 9 أربع، 14 اتنين
const D1 = '2026-09-02', D1_NEXT = '2026-09-03', D_DEPT = '2026-09-07', D_BRANCH = '2026-09-08', D_ALL = '2026-09-09', D_TEAM = '2026-09-14'
const OLD_ALL = '2026-06-15'
let app, ds, master, pool, baseUrl, created = false
const B = {}, DEP = {}, T = {}, E = {}, U = {}, H = {}
let seededVersions = null

function assertDisposable() {
  assert.match(database, migrate.DISPOSABLE_DATABASE)
  assert.match(database, /^hr_public_holiday_audience_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system')
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function http(user, method, route, body) {
  const response = await fetch(baseUrl + route, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  let parsed = null
  try { parsed = text ? JSON.parse(text) : null } catch { parsed = text }
  return { status: response.status, body: parsed }
}
const expect = (r, status, note = '') => { assert.equal(r.status, status, `${note} ${JSON.stringify(r.body)}`.slice(0, 800)); return r.body }
const service = () => app.get(AttendanceService)
// البصمة بنفس المعادلة المستقلة اللي اتكتبت بيها النسخ القديمة: sha256 للـJSON بمفاتيح مرتبة
const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value
const sha = value => crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex')
const envelope = (version, effectiveFrom, data) => ({ schemaVersion: 1, data,
  contentHash: sha({ schemaVersion: 1, sourceType: 'CALENDAR_GLOBAL', sourceId: 0, version, effectiveFrom, data }) })
const calContext = async (scope = 'GLOBAL', id = 0) => expect(await http(U.admin, 'GET', `/attendance/calendar-context?scope=${scope}&sourceId=${id}`), 200)
async function calChange(from = '2026-08-01', scope = 'GLOBAL', id = 0) {
  const c = await calContext(scope, id)
  return { effectiveFrom: from, reason: 'قرار اختبار «تسري على» للعطلة الرسمية', expectedRevision: c.revision, expectedCurrentSourceHash: c.currentSourceHash }
}
const globalVersionRows = () => ds.query(`SELECT [id], [version], CONVERT(varchar(10), [effectiveFrom], 23) AS [effectiveFrom], [legacyBaseline], [snapshot]
  FROM dbo.attendance_rule_versions WHERE [sourceType] = 'CALENDAR_GLOBAL' ORDER BY [version]`)
const day = (emp, date) => repo('AttendanceDay').findOneBy({ employeeId: emp.id, date })
const strict = (emp, date) => ds.transaction(em => resolveEmployeeCalendarDay(em, emp.id, date, { strict: true }))
const runtime = (emp, date) => ds.transaction(em => resolveEmployeeCalendarDay(em, emp.id, date))
const branchDay = (branch, date) => ds.transaction(em => resolveBranchCalendarDay(em, branch.id, date))
const workingDays = async (emp, from, to) => expect(await http(U.admin, 'GET', `/attendance/working-days?from=${from}&to=${to}&employeeId=${emp.id}`), 200)
async function addHoliday(name, date, audience, extra = {}) {
  return expect(await http(U.admin, 'POST', '/catalogs/holidays', { name, date, country: 'EG', ...(audience === undefined ? {} : { audience }), calendarChange: await calChange(), ...extra }), 201)
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

  await repo('RequestsConfig').save([{ key: 'attendance.weekend_days', value: 'FRI,SAT' }, { key: 'system.country', value: 'EG' },
    { key: 'leave.max_backdate_days', value: '400' }, { key: 'attendance.grace_minutes', value: '0' }])
  B.a = await repo('Branch').save({ name: 'المعادي', code: 'HA_MAADI', country: 'EG', weekendDays: 'FRI,SAT' })
  B.b = await repo('Branch').save({ name: 'فرع الشروق', code: 'HA_SHOROUK', country: 'EG', weekendDays: 'FRI,SAT' })
  DEP.sales = await repo('Department').save({ name: 'المبيعات', code: 'HA_SALES', branchId: B.a.id })
  DEP.salesEast = await repo('Department').save({ name: 'مبيعات الشرق', code: 'HA_SALES_E', branchId: B.a.id, parentId: DEP.sales.id })
  DEP.store = await repo('Department').save({ name: 'المخازن', code: 'HA_STORE', branchId: B.a.id })
  DEP.bOffice = await repo('Department').save({ name: 'مكتب الشروق', code: 'HA_B_OFFICE', branchId: B.b.id })
  T.inventory = await repo('Team').save({ name: 'فريق الجرد', code: 'HA_INV', departmentId: DEP.store.id })
  let n = 0
  const employee = (fullName, branch, department, extra = {}) => repo('Employee').save({ employeeCode: `HA${String(++n).padStart(3, '0')}`, fullName,
    branchId: branch.id, departmentId: department.id, joinDate: '2024-01-01', status: 'active', isActive: true, basicSalary: 6000, housingAllowance: 0,
    transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0, currency: 'EGP', payMethod: 'cash', ...extra })
  E.x = await employee('موظف العطلة المخصصة', B.a, DEP.sales)          // المبيعات
  E.y = await employee('زميله في نفس الفرع', B.a, DEP.store, { teamId: T.inventory.id }) // المخازن — فريق الجرد
  E.z = await employee('موظف قسم فرعي', B.a, DEP.salesEast)             // مبيعات الشرق (فرعي من المبيعات)
  E.w = await employee('موظف مخازن بلا فريق', B.a, DEP.store)
  E.v = await employee('موظف الفرع التاني', B.b, DEP.bOffice)
  const user = (key, role, extra = {}) => repo('User').save({ email: `${key}@holiday-audience.invalid`, displayName: `حساب ${key}`, passwordHash: 'test-only',
    role, branchId: null, permissions: '[]', ...extra }).then(row => { U[key] = row })
  await user('admin', 'super_admin', { permissions: '["*"]' })
  await user('x', 'employee', { branchId: B.a.id, employeeId: E.x.id })
  await user('y', 'employee', { branchId: B.a.id, employeeId: E.y.id })
  await user('hrA', 'hr_manager', { branchId: B.a.id, permissions: JSON.stringify(['settings.manage', 'attendance.manage', 'attendance.view_all']) })
  // إجازة عارضة مدفوعة بأيام العمل (نفس شكل أنواع الإجازات في leave-contract)
  await repo('LeaveType').save({ code: 'CASUAL', nameAr: 'عارضة', balanceType: 'none', isPaid: true })
  const chain = await repo('ApprovalChain').save({ code: 'HA_LEAVE', nameAr: 'اعتماد إجازة اختبار', autoApprove: false })
  await repo('ApprovalStep').save({ chainId: chain.id, stepOrder: 1, approverRole: 'hr' })
  await repo('RequestType').save({ code: 'LEAVE_CASUAL', nameAr: 'إجازة عارضة', category: 'leaves', destinationHandler: 'leave_calendar_payroll',
    approvalChainId: chain.id, affectsBalance: false, requiredFields: '["fromDate","toDate","days"]', isActive: true })
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
      assert.equal(path.dirname(path.resolve(dir)), os.tmpdir()); assert.match(path.basename(dir), /^hr-holiday-audience-(migrations|files)-/)
      fs.rmSync(dir, { recursive: true, force: true })
    } catch (e) { errors.push(e) }
  }
  if (errors.length) throw new AggregateError(errors, 'public-holiday-audience fixture cleanup failed')
})

test('HA-M1: migration 070 through the real migrator on a database with old holidays and dated calendar versions — additive, zero schema delta, re-runnable, and a wrong shape stops with its code', async () => {
  const content = fs.readFileSync(path.join(MIGRATIONS, FILE), 'utf8')
  // من غير BOM (نهايات الأسطر في نسخة العمل بتتبع core.autocrlf — المُرحّل بيوحّدها قبل البصمة)
  assert.notEqual(content.charCodeAt(0), 0xfeff, 'من غير BOM')
  assert.deepEqual(migrate.forbiddenStatements(content), [])
  assert.deepEqual(migrate.throwCodes(content), [70001, 70002, 70003, 70004])
  assert.doesNotMatch(migrate.stripComments(content), /\b(UPDATE|DELETE|DROP|TRUNCATE|MERGE|INSERT)\b/i, 'إضافي فقط: بلا تعبئة ولا حذف')
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات')
  // متوافق مع SQL Server 2019: من غير دوال 2022
  assert.doesNotMatch(migrate.stripComments(content), /\b(GREATEST|LEAST|GENERATE_SERIES|DATETRUNC|JSON_OBJECT|JSON_ARRAY)\s*\(|IS\s+(?:NOT\s+)?DISTINCT\s+FROM/i)
  assert.equal((await ds.driver.createSchemaBuilder().log()).upQueries.length, 0, 'قاعدة synchronize مطابقة للكيانات قبل التجربة')

  // ما قبل الترحيل: القاعدة اتعملت بـsynchronize فالعمود موجود — نشيله ونكتب بيانات قديمة زي ما كانت على قاعدة الشركة
  assert.equal((await ds.query('SELECT COUNT(*) n FROM dbo.public_holidays'))[0].n, 0)
  assert.equal((await ds.query("SELECT COUNT(*) n FROM dbo.attendance_rule_versions WHERE [sourceType] = 'CALENDAR_GLOBAL'"))[0].n, 0)
  await pool.request().batch('ALTER TABLE dbo.public_holidays DROP COLUMN audience;')
  const insert = async (name, date) => (await ds.query('INSERT INTO dbo.public_holidays ([name], [date], [endDate], [country]) OUTPUT INSERTED.[id] VALUES (@0, @1, NULL, @2)',
    [name, date, 'EG']))[0].id
  H.old = { id: await insert('عطلة قديمة للكل', OLD_ALL), name: 'عطلة قديمة للكل', date: OLD_ALL, endDate: null, country: 'EG' }
  H.all = { id: await insert('عطلة للكل قبل الترحيل', D_ALL), name: 'عطلة للكل قبل الترحيل', date: D_ALL, endDate: null, country: 'EG' }
  // نسختين للتقويم العام بالشكل القديم (خمس مفاتيح للعطلة) وبالبصمة المستقلة — زي ما finishCalendarChange كتبهم قبل العمود
  const v0 = { weekendDays: 'FRI,SAT', holidays: [H.old], exceptions: [] }, v1 = { weekendDays: 'FRI,SAT', holidays: [H.old, H.all], exceptions: [] }
  await repo('AttendanceRuleVersion').save([
    { sourceType: 'CALENDAR_GLOBAL', sourceId: 0, version: 0, effectiveFrom: null, legacyBaseline: true, actorUserId: U.admin.id,
      reason: 'حفظ القيم السابقة دون افتراض تاريخ سريان قديم', snapshot: envelope(0, null, v0) },
    { sourceType: 'CALENDAR_GLOBAL', sourceId: 0, version: 1, effectiveFrom: '2026-06-01', legacyBaseline: false, actorUserId: U.admin.id,
      reason: 'إضافة عطلة قبل ترحيل 070', snapshot: envelope(1, '2026-06-01', v1) }])
  seededVersions = await globalVersionRows()
  const holidaysBefore = await ds.query('SELECT [id], [name], CONVERT(varchar(10), [date], 23) AS [date], [endDate], [country] FROM dbo.public_holidays ORDER BY [id]')

  const record = await migrate.apply({ database, base, trial: true, schemaDiff: false, quiet: true })
  assert.equal(record.mode, 'disposable')
  assert.equal(record.failed, undefined, JSON.stringify(record.failed))
  assert.equal(record.trial?.passed, true)
  assert.deepEqual(record.applied.map(item => path.basename(item.file)), [FILE])
  assert.equal(record.ledgerComplete, true)
  assert.deepEqual(record.columns.added.filter(column => !column.startsWith('app_schema_migrations.')), ['public_holidays.audience'])
  assert.deepEqual(record.columns.removedOrRenamed, [])
  assert.deepEqual(record.rowCounts.differences.filter(d => d.table !== 'app_schema_migrations'), [])

  // العمود: nvarchar(max) يقبل الفراغ بلا قيمة افتراضية؛ كل العطلات NULL (للكل زي ما كانت)؛ ولا صف ولا نسخة اتلمست؛ وفرق مخطط الجدول صفر
  const shape = async () => (await ds.query(`SELECT t.name type, c.max_length maxLength, c.is_nullable nullable, c.default_object_id df
    FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id
    WHERE c.object_id = OBJECT_ID('dbo.public_holidays') AND c.name = 'audience'`)).map(c => [c.type, c.maxLength, !!c.nullable, c.df])
  assert.deepEqual(await shape(), [['nvarchar', -1, true, 0]])
  assert.deepEqual(await ds.query('SELECT [id], [name], CONVERT(varchar(10), [date], 23) AS [date], [endDate], [country] FROM dbo.public_holidays ORDER BY [id]'), holidaysBefore)
  assert.equal((await ds.query('SELECT COUNT(*) n FROM dbo.public_holidays WHERE [audience] IS NOT NULL'))[0].n, 0, 'بلا تعبئة رجعية')
  assert.deepEqual(await globalVersionRows(), seededVersions, 'نسخ التقويم زي ما هي بالحرف')
  // فرق المخطط بين الكيانات والقاعدة بعد الترحيل = صفر (كل الجداول، مش public_holidays بس)
  const { upQueries } = await ds.driver.createSchemaBuilder().log()
  assert.deepEqual(upQueries.map(q => q.query), [])

  // إعادة المُرحّل: مفيش ملف معلق. ونص الترحيل نفسه مرتين برّه الدفتر: آمن للتكرار
  const replay = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.deepEqual(replay.pendingBefore, []); assert.deepEqual(replay.applied, []); assert.equal(replay.ledgerComplete, true)
  for (let round = 0; round < 2; round++) for (const batch of migrate.splitBatches(content)) await pool.request().batch(batch)
  assert.deepEqual(await shape(), [['nvarchar', -1, true, 0]])

  // عمود بنوع أو طول أو قيمة افتراضية غلط يوقف التحقق بكوده ومايسيبش أثر
  for (const [ddl, code] of [['ALTER TABLE dbo.public_holidays ALTER COLUMN audience varchar(max) NULL', 70002],
    ['ALTER TABLE dbo.public_holidays ALTER COLUMN audience nvarchar(400) NULL', 70003],
    ["ALTER TABLE dbo.public_holidays ADD CONSTRAINT DF_holiday_audience_test DEFAULT N'x' FOR audience", 70004]]) {
    const tx = new sql.Transaction(pool)
    await tx.begin()
    try {
      await new sql.Request(tx).batch(ddl)
      await assert.rejects(new sql.Request(tx).batch(migrate.splitBatches(content).at(-1)), error => { assert.equal(error.number, code, error.message); return true })
    } finally { try { await tx.rollback() } catch { /* أُجهضت من الخادم */ } }
  }
  assert.deepEqual(await shape(), [['nvarchar', -1, true, 0]])
})

test('HA-M2: no calendar drift after the column — the current global calendar still matches its latest version with the same fingerprint, strict resolution works, and calendar changes keep working', async () => {
  const context = await calContext()
  assert.equal(context.revision, 1); assert.equal(context.currentMatchesHistory, true); assert.equal(context.effectiveFrom, '2026-06-01')
  assert.equal(context.currentSourceHash, sha({ scope: 'GLOBAL', sourceId: 0, data: { weekendDays: 'FRI,SAT', holidays: [H.old, H.all], exceptions: [] } }),
    'بصمة القيم الحالية = نفس بصمة ما قبل الترحيل بالمعادلة المستقلة')
  for (const row of context.current.holidays) assert.deepEqual(Object.keys(row).sort(), ['country', 'date', 'endDate', 'id', 'name'])
  const source = await ds.transaction(em => cal.readCalendarSource(em, 'GLOBAL', 0))
  assert.equal(source.versions.length, 2); assert.equal(source.currentMatchesHistory, true)

  // جاهزية الحسم الصارم (فروع وموظفين بنسخ مؤرخة) — نفس خطوات شاشات التأكيد
  for (const branch of [B.a, B.b]) {
    expect(await http(U.admin, 'POST', '/attendance/calendar-context/confirm', { scope: 'BRANCH', sourceId: branch.id, calendarChange: await calChange('2026-06-01', 'BRANCH', branch.id) }), 201)
  }
  for (const emp of Object.values(E)) {
    expect(await http(U.admin, 'POST', '/attendance/calendar-context/confirm', { scope: 'EMPLOYEE', sourceId: emp.id, calendarChange: await calChange('2026-06-01', 'EMPLOYEE', emp.id) }), 201)
    expect(await http(U.admin, 'PATCH', `/employees/${emp.id}`, { workScheduleId: null, flexOverrideMode: 'INHERIT',
      attendanceEffectiveFrom: '2026-06-01', attendanceChangeReason: 'تأكيد أول تعريف دوام مسجل للاختبار' }), 200)
  }
  for (const emp of [E.x, E.v]) {
    const resolved = await strict(emp, D_ALL)
    assert.equal(resolved.state, 'AVAILABLE', JSON.stringify(resolved.issues)); assert.equal(resolved.dayKind, 'HOLIDAY')
  }
  assert.equal((await strict(E.x, '2026-09-10')).dayKind, 'WORKING')

  // تعديل تقويم على نفس النسخة: عطلة مخصصة بتتضاف (النسخة 2)، والعطلات القديمة في لقطتها زي ما هي من غير مفتاح
  H.forX = await addHoliday('عيد لموظف واحد', D1, { level: 'employees', branchId: B.a.id, employeeIds: [E.x.id] })
  assert.deepEqual(H.forX.audience, { level: 'employees', branchId: B.a.id, employeeIds: [E.x.id] })
  assert.equal(H.forX.audienceText, 'موظف واحد')
  const after = await calContext()
  assert.equal(after.revision, 2); assert.equal(after.currentMatchesHistory, true)
  const rows = await globalVersionRows()
  assert.deepEqual(rows.slice(0, 2), seededVersions, 'النسخ القديمة ماتغيرتش')
  const latest = JSON.parse(rows.at(-1).snapshot).data.holidays
  assert.deepEqual(latest.map(row => [row.id, 'audience' in row]), [[H.old.id, false], [H.all.id, false], [H.forX.id, true]])
  assert.deepEqual(latest.at(-1).audience, { level: 'employees', branchId: B.a.id, employeeIds: [E.x.id] })
  assert.equal((await ds.query('SELECT [audience] FROM dbo.public_holidays WHERE [id] = @0', [H.forX.id]))[0].audience,
    JSON.stringify({ level: 'employees', branchId: B.a.id, employeeIds: [E.x.id] }))
})

test('HA-01: a holiday for employee X only — X\'s day is a holiday with no absence; Y in the same branch works and gets an absence without a punch; strict payroll calendar agrees', async () => {
  const x = await service().computeDay(E.x.id, D1)
  const y = await service().computeDay(E.y.id, D1)
  assert.equal(x.status, 'holiday'); assert.equal(y.status, 'absent')
  assert.equal((await day(E.y, D1)).status, 'absent', 'الغياب اتسجل')
  assert.notEqual((await day(E.x, D1))?.status, 'absent')
  // التجسيد الليلي: غياب للزميل بس
  await repo('AttendanceDay').delete({ date: D1 })
  assert.equal(await service().materializeAbsences(E.x.id, D1, D1), 0)
  assert.equal(await service().materializeAbsences(E.y.id, D1, D1), 1)
  // الحسم الصارم (نفس اللي المسير بيقرا بيه) وقراءة جدول المسير
  assert.equal((await strict(E.x, D1)).dayKind, 'HOLIDAY'); assert.equal((await strict(E.y, D1)).dayKind, 'WORKING')
  for (const [emp, kind] of [[E.x, 'HOLIDAY'], [E.y, 'WORKING']]) {
    const schedule = await ds.transaction(em => readPayrollLiveSchedule(em, emp.id, '2026-09-01', '2026-09-10'))
    const row = schedule.data.days.find(item => item.date === D1)
    assert.equal(row.calendarState, 'AVAILABLE'); assert.equal(row.dayKind, kind)
    // دليل الوصف الحالي: العطلة مخصصة (مستواها وفرعها) من غير قائمة أرقام الموظفين
    const evidence = schedule.data.calendarEvidence.holidays.find(item => item.id === H.forX.id)
    assert.deepEqual(evidence.audience, { level: 'employees', branchId: B.a.id })
    assert.equal(schedule.data.calendarEvidence.holidays.find(item => item.id === H.all.id).audience, null)
  }
  // تقويم الفرع كله: اليوم شغل (العطلة مش للفرع كله)
  assert.equal((await branchDay(B.a, D1)).dayKind, 'WORKING')
})

test('HA-02: leave requests count the day for Y and skip it for X, and /attendance/working-days agrees', async () => {
  const x = await workingDays(E.x, D1, D1_NEXT), y = await workingDays(E.y, D1, D1_NEXT)
  assert.deepEqual([x.total, x.working, x.skipped], [2, 1, [D1]])
  assert.deepEqual([y.total, y.working, y.skipped], [2, 2, []])
  const leave = async user => {
    const made = expect(await http(user, 'POST', '/requests', { typeCode: 'LEAVE_CASUAL', submit: true, payload: { fromDate: D1, toDate: D1_NEXT, days: 2 } }), 201)
    return JSON.parse(made.payload)
  }
  const forX = await leave(U.x), forY = await leave(U.y)
  assert.equal(forX.days, 1); assert.deepEqual(forX.skippedHolidays, [D1])
  assert.equal(forY.days, 2); assert.deepEqual(forY.skippedHolidays, [])
  // من غير موظف (فرع المستخدم): العطلة المخصصة مابتخليش الفرع كله إجازة
  const branchWide = expect(await http(U.admin, 'GET', `/attendance/working-days?from=${D1}&to=${D1_NEXT}`), 200)
  assert.equal(branchWide.working, 2)
})

test('HA-03: department (with sub-departments), team and whole-branch audiences; the old everyone-holiday is unchanged; the branch calendar counts only «the whole branch»', async () => {
  H.sales = await addHoliday('عطلة قسم المبيعات', D_DEPT, { level: 'departments', branchId: B.a.id, departmentIds: [DEP.sales.id] })
  H.team = await addHoliday('عطلة فريق الجرد', D_TEAM, { level: 'teams', branchId: B.a.id, teamIds: [T.inventory.id] })
  H.branch = await addHoliday('عطلة فرع المعادي', D_BRANCH, { level: 'branch', branchId: B.a.id })
  assert.equal(H.sales.audienceText, 'فرع المعادي — قسم المبيعات'); assert.equal(H.branch.audienceText, 'فرع المعادي')
  assert.equal((await calContext()).currentMatchesHistory, true)
  const kinds = async date => Object.fromEntries(await Promise.all(Object.entries(E).map(async ([key, emp]) => [key, (await runtime(emp, date)).dayKind])))
  assert.deepEqual(await kinds(D_DEPT), { x: 'HOLIDAY', y: 'WORKING', z: 'HOLIDAY', w: 'WORKING', v: 'WORKING' }, 'القسم الفرعي (مبيعات الشرق) مشمول')
  assert.deepEqual(await kinds(D_TEAM), { x: 'WORKING', y: 'HOLIDAY', z: 'WORKING', w: 'WORKING', v: 'WORKING' })
  assert.deepEqual(await kinds(D_BRANCH), { x: 'HOLIDAY', y: 'HOLIDAY', z: 'HOLIDAY', w: 'HOLIDAY', v: 'WORKING' })
  assert.deepEqual(await kinds(D_ALL), { x: 'HOLIDAY', y: 'HOLIDAY', z: 'HOLIDAY', w: 'HOLIDAY', v: 'HOLIDAY' }, 'العطلة القديمة للكل زي ما هي')
  // الحسم الصارم لنفس الأيام
  assert.equal((await strict(E.z, D_DEPT)).dayKind, 'HOLIDAY'); assert.equal((await strict(E.w, D_TEAM)).dayKind, 'WORKING')
  // تقويم الفرع كله: «الفرع كله» والعطلة اللي للكل بس
  assert.equal((await branchDay(B.a, D_BRANCH)).dayKind, 'HOLIDAY'); assert.equal((await branchDay(B.b, D_BRANCH)).dayKind, 'WORKING')
  assert.equal((await branchDay(B.a, D_DEPT)).dayKind, 'WORKING'); assert.equal((await branchDay(B.a, D_TEAM)).dayKind, 'WORKING')
  assert.equal((await branchDay(B.b, D_ALL)).dayKind, 'HOLIDAY')
  // الحضور: المشمول عطلة، وغير المشمول غياب
  assert.equal((await service().computeDay(E.z.id, D_DEPT)).status, 'holiday')
  assert.equal((await service().computeDay(E.w.id, D_TEAM)).status, 'absent')
  assert.equal((await service().computeDay(E.v.id, D_BRANCH)).status, 'absent')
})

test('HA-04: editing «تسري على» recomputes the stored days (who left the audience becomes absent, who joined becomes a holiday); a rename keeps it; bad targets are rejected with nothing written', async () => {
  await service().computeDay(E.x.id, D1); await service().computeDay(E.y.id, D1)
  assert.deepEqual([(await day(E.x, D1)).status, (await day(E.y, D1)).status], ['holiday', 'absent'])
  const moved = expect(await http(U.admin, 'PATCH', `/catalogs/holidays/${H.forX.id}`, { audience: { level: 'employees', branchId: B.a.id, employeeIds: [E.y.id] },
    calendarChange: await calChange() }), 200)
  assert.deepEqual(moved.audience, { level: 'employees', branchId: B.a.id, employeeIds: [E.y.id] })
  assert.deepEqual([(await day(E.x, D1)).status, (await day(E.y, D1)).status], ['absent', 'holiday'], 'إعادة الحساب بعد التعديل')
  const renamed = expect(await http(U.admin, 'PATCH', `/catalogs/holidays/${H.forX.id}`, { name: 'عيد لموظف واحد (معدل)', calendarChange: await calChange() }), 200)
  assert.deepEqual(renamed.audience, moved.audience, 'التعديل من غير audience مابيغيرهاش')
  // «للكل» تاني بـnull
  const everyone = await addHoliday('عطلة تتحول للكل', '2026-09-16', { level: 'branch', branchId: B.b.id })
  const cleared = expect(await http(U.admin, 'PATCH', `/catalogs/holidays/${everyone.id}`, { audience: null, calendarChange: await calChange() }), 200)
  assert.equal(cleared.audience, null); assert.equal(cleared.audienceText, 'للكل')
  assert.equal((await ds.query('SELECT [audience] FROM dbo.public_holidays WHERE [id] = @0', [everyone.id]))[0].audience, null)
  assert.equal('audience' in (await calContext()).current.holidays.find(row => row.id === everyone.id), false, 'رجعت بالمفاتيح الخمسة')

  const before = await calContext(), count = await repo('PublicHoliday').count()
  for (const [audience, note] of [
    [{ level: 'employees', branchId: B.a.id, employeeIds: [99999999] }, 'موظف مش موجود'],
    [{ level: 'employees', branchId: B.a.id, employeeIds: [E.v.id] }, 'موظف فرع تاني'],
    [{ level: 'departments', branchId: B.a.id, departmentIds: [DEP.bOffice.id] }, 'قسم فرع تاني'],
    [{ level: 'teams', branchId: B.b.id, teamIds: [T.inventory.id] }, 'فريق فرع تاني'],
    [{ level: 'teams', branchId: B.a.id, teamIds: [] }, 'قائمة فاضية'],
    [{ level: 'branch', branchId: 99999999 }, 'فرع مش موجود'],
    [{ level: 'everyone' }, 'مستوى غلط'],
    ['employees', 'نص'],
  ]) {
    expect(await http(U.admin, 'POST', '/catalogs/holidays', { name: 'مرفوضة', date: '2026-09-17', country: 'EG', audience, calendarChange: await calChange() }), 400, note)
  }
  // حساب فرع مايعدّلش التقويم العام أصلًا (ولا عطلة مخصصة لفرعه)
  expect(await http(U.hrA, 'POST', '/catalogs/holidays', { name: 'مرفوضة', date: '2026-09-17', country: 'EG', audience: { level: 'branch', branchId: B.a.id },
    calendarChange: await calChange() }), 403)
  assert.deepEqual(await calContext(), before); assert.equal(await repo('PublicHoliday').count(), count)
})

test('HA-05: holiday-work orders — a targeted-holiday date is accepted when a targeted employee has the day off and rejected when nobody targeted does', async () => {
  const order = (targetLevel, extra) => http(U.admin, 'POST', '/attendance/holiday-work', { name: 'دوام يوم عطلة الجرد', targetLevel, branchId: B.a.id,
    dates: [D_TEAM], multiplier: 1.5, ...extra })
  expect(await order('employees', { employeeIds: [E.y.id] }), 201, 'عضو الفريق يومه عطلة')
  expect(await order('departments', { departmentIds: [DEP.store.id] }), 201, 'القسم فيه عضو الفريق')
  expect(await order('branch', {}), 201, 'الفرع فيه عضو الفريق')
  const rejected = expect(await order('employees', { employeeIds: [E.w.id] }), 400, 'مش عضو في الفريق')
  assert.match(JSON.stringify(rejected), /يوم عمل عادي/)
  expect(await order('departments', { departmentIds: [DEP.sales.id] }), 400)
})

test('HA-06: lists — managers see every holiday with its audience; an employee sees everyone-holidays and his own targeted ones only, without anyone else\'s ids', async () => {
  const all = expect(await http(U.admin, 'GET', '/catalogs/holidays'), 200)
  const byId = new Map(all.map(row => [row.id, row]))
  assert.deepEqual(byId.get(H.team.id).audience, { level: 'teams', branchId: B.a.id, teamIds: [T.inventory.id] })
  assert.equal(byId.get(H.team.id).audienceText, 'فرع المعادي — فريق الجرد')
  assert.equal(byId.get(H.all.id).audience, null); assert.equal(byId.get(H.all.id).audienceText, 'للكل')
  assert.ok(all.every(row => typeof row.audience !== 'string'), 'العمود الخام مابيطلعش')

  const mine = expect(await http(U.x, 'GET', '/catalogs/holidays'), 200)
  const ids = mine.map(row => row.id)
  assert.ok(ids.includes(H.all.id) && ids.includes(H.sales.id) && ids.includes(H.branch.id), 'للكل + قسمه + فرعه')
  assert.ok(!ids.includes(H.team.id) && !ids.includes(H.forX.id), 'عطلة الفريق وعطلة زميله مش ظاهرة')
  assert.ok(mine.every(row => !('audience' in row)), 'من غير أرقام حد تاني')
  assert.equal(mine.find(row => row.id === H.sales.id).targeted, true)

  const calendarOf = async user => expect(await http(user, 'GET', '/calendar?month=2026-09'), 200).holidays
  const own = await calendarOf(U.y)
  assert.ok(own.some(row => row.id === H.team.id && row.targeted && row.audienceText === 'فرع المعادي — فريق الجرد'))
  assert.ok(own.some(row => row.id === H.forX.id), 'بعد التعديل العطلة بقت لـY')
  assert.ok(!own.some(row => row.id === H.sales.id), 'عطلة قسم المبيعات مش لـY')
  assert.ok(own.every(row => !('audience' in row)))
  const scoped = await calendarOf(U.admin)
  for (const holiday of [H.forX, H.sales, H.team, H.branch, H.all]) assert.ok(scoped.some(row => row.id === holiday.id), `المدير بيشوف ${holiday.name}`)
})

test('HA-07: a branch-scoped settings account sees targeted holidays of its own branches only — in the holidays list and in the global calendar context — while the fingerprint stays the full one', async () => {
  // حساب إعدادات مقفول على فرع الشروق: عطلات المعادي المخصصة (وأرقام موظفيها) مش ظاهرة له، واللي للكل ظاهرة
  U.hrB = await repo('User').save({ email: 'hrB@holiday-audience.invalid', displayName: 'حساب hrB', passwordHash: 'test-only', role: 'hr_manager',
    branchId: B.b.id, permissions: JSON.stringify(['settings.view', 'attendance.manage']) })
  const targetedInA = [H.forX, H.sales, H.team, H.branch]
  const listB = expect(await http(U.hrB, 'GET', '/catalogs/holidays'), 200).map(row => row.id)
  assert.ok(listB.includes(H.all.id), 'اللي للكل ظاهرة')
  for (const holiday of targetedInA) assert.ok(!listB.includes(holiday.id), `${holiday.name} مش ظاهرة لحساب فرع تاني`)
  const listA = expect(await http(U.hrA, 'GET', '/catalogs/holidays'), 200).map(row => row.id)
  for (const holiday of targetedInA) assert.ok(listA.includes(holiday.id), `${holiday.name} ظاهرة لحساب فرعها`)
  const contextB = expect(await http(U.hrB, 'GET', '/attendance/calendar-context?scope=GLOBAL&sourceId=0'), 200)
  const full = await calContext()
  assert.ok(contextB.current.holidays.every(row => !row.audience || row.audience.branchId === B.b.id), 'مفيش تخصيص فرع تاني في السياق')
  assert.ok(full.current.holidays.some(row => row.audience && row.audience.branchId === B.a.id), 'حساب الشركة بيشوفها كاملة')
  assert.equal(contextB.currentSourceHash, full.currentSourceHash, 'البصمة على القيم كاملة زي ما هي')
})
