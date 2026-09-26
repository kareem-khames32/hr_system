'use strict'
// «بدل ضغط العمل» (قرار المالك 26 سبتمبر) — إثبات حي بـSQL وHTTP فعليين على قاعدة مؤقتة معزولة تُحذف في النهاية:
// «نعمله في مكان الراتب … عشان يبقى ظاهر للموظف في بيانات راتبه، بس مايتحسبش على البدل ده مؤثرات — المؤثرات بتبقى على الإجمالي
//  بخلاف بدل ضغط العمل: لا إضافي ولا خصومات»، ومش داخل في مكافأة نهاية الخدمة.
//  M1) ترحيل 20260926_071 عبر المُرحّل المجمّع على قاعدة فيها موظف وسجل أجر شهري قديم ببصماته القديمة: عمودين decimal(18,2) NOT NULL
//      بصفر افتراضي باسم قيد TypeORM، فرق المخطط صفر، البصمات القديمة فاضلة مطابقة (ولا انحراف)، آمن للتكرار، والشكل الغلط يوقف بكوده.
//  A) 6000 + بدل 1000 بغياب يوم وتأخير ونقص ساعات ويوم بلا أجر وإضافي وخصم مصنف بالأيام وسقف خصم 7% وتأمينات:
//     كل سعر وخصم وسقف وأساس تأمينات على 6000 (مش 7000)، والـ1000 مصروفة كاملة، والصافي = الحساب باليد، وسطر القسيمة «بدل ضغط العمل».
//  B) ديون أكبر من الراتب + قسط سلفة (والتانية: ديون تسيب 200 والقسط ياخدهم): الـ1000 مصروفة كاملة، والاعتماد والصرف شغالين،
//     والموظف بيشوف السطر في قسيمته وبدله في ملفه.
//  C) المعيَّن في نص الفترة: البدل بيتناسب بأيام خدمته زي الراتب بالحرف (1000 × 22/30 = 733.33).
//  D) تغيير البدل بسجل الأجر المؤرخ من شهر: أكتوبر 1000 ونوفمبر 1500 — نفس تأريخ أي مكوّن (الراتب مايتقسمش جوه الشهر).
//  E) مكافأة نهاية الخدمة في معاينة التصفية = موظف مقارنة من غير البدل، و«راتب آخر شهر» فيها = صافي بند المسير شامل البدل.
//  G) التحديث الجماعي من Excel: كود الموظف + «بدل ضغط العمل» = تغيير مؤرخ في سجل الأجر وسجل التغييرات، والمسير التالي بيصرفه.
//  N) البدل مابيغطيش صافي مؤثرات سالب (إجازة بلا أجر أكبر من الراتب): الاعتماد بيترفض زي ما كان رغم إن الصافي المصروف موجب.
//  P) تغيير أجر من عميل قديم مابيبعتش البدل = البدل الحالي زي ما هو (مش صفر).
//  L) موظف قديم من غير بدل: البند والتفصيل واللقطة زي ما كانوا بالحرف (ست سطور، ولا حقل جديد).
// قاعدة hr_work_pressure_test_<16 hex> — لا مساس بقاعدة الشركة. التوكنات موقّعة محليًا بسر عشوائي.
// Run: node --test --test-concurrency=1 api/test/payroll-work-pressure-allowance.integration.cjs
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
const { payrollLiveSourceContent } = require('../src/payroll/payroll-live-source-contract')
const { readSalaryHistory, readSalaryHistoryCurrent } = require('../src/payroll/payroll-salary-history')
const { PAYROLL_MONTHLY_SALARY_HISTORY_VERSION: V2 } = require('../src/payroll/payroll-period-salary')
const { payrollPeriodOfDate } = require('../src/payroll/payroll-period')
const { localDateOf } = require('../src/attendance/attendance.service')
const { writeParityReasonsBeforeApproval } = require('./fixtures/payroll-parity-reasons.cjs')

const database = `hr_work_pressure_test_${crypto.randomBytes(8).toString('hex')}`
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-work-pressure-migrations-'))
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-work-pressure-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const MIGRATIONS = path.join(repoRoot, 'docs/migrations/payroll')
const FILE = '20260926_071_employee_work_pressure_allowance.sql'
const DF = { employees: 'DF_a224ba42fd335e5eea40372899f', history: 'DF_b73bb8b205dde1f6de240e81f73' }
// شهور مسير في المستقبل (اليوم داخل سبتمبر 2026، الدورة من يوم 1): تجسيد الغياب وإعادة حساب اليوم ما بيتجاوزانش اليوم،
// فصفوف الحضور المكتوبة للاختبار تُقرأ كما هي — نفس أسلوب باقي اختبارات المسير.
const OCT = '2026-10', NOV = '2026-11'
const SIX = { basicSalary: '6000.00', housingAllowance: '0.00', transportAllowance: '0.00', phoneAllowance: '0.00', workNatureAllowance: '0.00', otherAllowance: '0.00' }
let app, ds, master, pool, baseUrl, created = false, employeeNumber = 0, runNumber = 0
const B = {}, E = {}, U = {}, R = {}

function assertDisposable() {
  assert.match(database, migrate.DISPOSABLE_DATABASE)
  assert.match(database, /^hr_work_pressure_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system')
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function http(user, method, route, body) {
  await writeParityReasonsBeforeApproval(http, user, method, route)
  const response = await fetch(baseUrl + route, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  let parsed = null
  try { parsed = text ? JSON.parse(text) : null } catch { parsed = text }
  return { status: response.status, body: parsed }
}
const expect = (r, status, note = '') => { assert.equal(r.status, status, `${note} ${JSON.stringify(r.body)}`.slice(0, 1500)); return r.body }
const money = value => Number(Number(value).toFixed(2))
const breakdown = item => JSON.parse(item.breakdown)
const itemOf = (run, emp) => { const row = run.items.find(item => item.employeeId === emp.id); assert.ok(row, `بند ${emp.employeeCode}`); return row }
const memberOf = (run, emp) => { const row = run.members.find(member => member.employeeId === emp.id); assert.ok(row?.snapshot, `عضو ${emp.employeeCode}`); return row.snapshot }
async function employee(extra = {}) {
  const n = ++employeeNumber
  return repo('Employee').save({ employeeCode: `WP${String(n).padStart(3, '0')}`, fullName: `موظف بدل ضغط العمل ${n}`, branchId: B.main.id, joinDate: '2024-10-01',
    basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0, workPressureAllowance: 0,
    currency: 'EGP', status: 'active', isActive: true, payMethod: 'cash', annualLeaveEntitled: false, nationality: 'مصري', ...extra })
}
const attendanceDay = (emp, date, custom = {}) => ({ employeeId: emp.id, branchId: emp.branchId, date, status: 'present',
  checkIn: '08:00', checkOut: '16:00', shiftName: 'وردية اختبار بدل ضغط العمل', shiftStart: '08:00', shiftEnd: '16:00', scheduleSource: 'override',
  workMinutes: 480, lateMinutes: 0, deductibleMinutes: 0, earlyLeaveMinutes: 0, shortfallMinutes: 0, ...custom })
async function calc(period, emps, extra = {}) {
  return expect(await http(U.admin, 'POST', '/payroll/runs/calculate-defined', { period, scopeType: 'CUSTOM', employeeIds: emps.map(emp => emp.id),
    name: `مسير اختبار بدل ضغط العمل ${++runNumber}`, ...extra }), 201, `حساب ${period}`)
}
const setConfig = (key, value) => repo('RequestsConfig').save({ key, value })
const lineOf = (lines, key) => lines.find(line => line.key === key)

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
  await app.get(require('../src/settings/config-defaults.service').ConfigDefaultsService).onApplicationBootstrap()
  for (const [key, value] of [['payroll.cycle_start_day', '1'], ['payroll.monthly_days', '30'], ['payroll.daily_hours', '8'],
    ['payroll.late_deduction_enabled', 'true'], ['payroll.shortfall_enabled', 'true'], ['payroll.shortfall_mode', 'MINUTES'], ['payroll.shortfall_value', '1'],
    ['attendance.absence_penalty_days', '1'], ['attendance.weekend_days', 'FRI,SAT'], ['payroll.policy.min_net_guarantee', 'null'],
    ['payroll.policy.net_floor_pct', 'null'], ['payroll.policy.max_deduction_pct_of_gross', 'null'], ['loan.insufficient_net_behavior', 'PARTIAL_THEN_CARRY'],
    // وضع انتقالي صريح: من غير سجل شهري = راتب الملف (موسوم غير موثق)؛ ومن له سجل شهري بيتقري منه دايمًا
    ['payroll.salary_evidence_mode', 'MONTHLY_HISTORY_OR_CURRENT_FILE']]) await setConfig(key, value)
  // المستخدم نفسه يحتسب ويعتمد في هذه المجموعة (رخصة الشركة الصغيرة الموثقة) — فصل المهام مختبر في payroll-run-screen
  await require('./fixtures/payroll-small-company-approval.cjs').allowSmallCompanyApproval(repo)
  B.main = await repo('Branch').save({ name: 'فرع بدل ضغط العمل', code: 'WP_MAIN', country: 'EG', insuranceSystem: 'EGYPTIAN' })
  const user = (key, role, extra = {}) => repo('User').save({ email: `${key}@work-pressure.invalid`, displayName: `حساب ${key}`, passwordHash: 'test-only',
    role, branchId: null, permissions: '[]', ...extra }).then(row => { U[key] = row })
  await user('admin', 'super_admin', { permissions: '["*"]' })
  await user('approver', 'super_admin', { permissions: '["*"]' })
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
      assert.equal(path.dirname(path.resolve(dir)), os.tmpdir()); assert.match(path.basename(dir), /^hr-work-pressure-(migrations|files)-/)
      fs.rmSync(dir, { recursive: true, force: true })
    } catch (e) { errors.push(e) }
  }
  if (errors.length) throw new AggregateError(errors, 'work-pressure fixture cleanup failed')
})

test('WP-M1: migration 071 through the real migrator on a database with an old employee and old monthly salary history — additive, zero schema delta, old fingerprints intact, re-runnable, and a wrong shape stops with its code', async () => {
  const content = fs.readFileSync(path.join(MIGRATIONS, FILE), 'utf8')
  assert.notEqual(content.charCodeAt(0), 0xfeff, 'من غير BOM')
  assert.deepEqual(migrate.forbiddenStatements(content), [])
  assert.deepEqual(migrate.throwCodes(content), [71001, 71002, 71003, 71004, 71005, 71006])
  assert.doesNotMatch(migrate.stripComments(content), /\b(UPDATE|DELETE|DROP|TRUNCATE|MERGE|INSERT)\b/i, 'إضافي فقط: بلا تعبئة ولا حذف')
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات والملف مقبول')
  assert.doesNotMatch(migrate.stripComments(content), /\b(GREATEST|LEAST|GENERATE_SERIES|DATETRUNC|JSON_OBJECT|JSON_ARRAY)\s*\(|IS\s+(?:NOT\s+)?DISTINCT\s+FROM/i, 'SQL Server 2019')
  assert.equal((await ds.driver.createSchemaBuilder().log()).upQueries.length, 0, 'قاعدة synchronize مطابقة للكيانات قبل التجربة')

  // ما قبل الترحيل: القاعدة اتعملت بـsynchronize فالعمودين موجودين — نشيلهم ونكتب بيانات قديمة زي ما كانت على قاعدة الشركة
  await pool.request().batch(`ALTER TABLE dbo.employees DROP CONSTRAINT [${DF.employees}]; ALTER TABLE dbo.employees DROP COLUMN [workPressureAllowance];
    ALTER TABLE dbo.employee_salary_history DROP CONSTRAINT [${DF.history}]; ALTER TABLE dbo.employee_salary_history DROP COLUMN [workPressureAllowance];`)
  const legacyId = (await ds.query(`INSERT INTO dbo.employees ([employeeCode], [fullName], [branchId], [joinDate], [currency], [basicSalary], [housingAllowance],
    [transportAllowance], [phoneAllowance], [workNatureAllowance], [otherAllowance], [status], [isActive], [payMethod], [annualLeaveEntitled], [nationality])
    OUTPUT INSERTED.[id] VALUES (N'WPLEGACY', N'موظف قديم قبل البدل', @0, '2024-10-01', N'EGP', 6000, 0, 0, 0, 0, 0, N'active', 1, N'cash', 0, N'مصري')`, [B.main.id]))[0].id
  // سجل أجر شهري بالبصمات بالمعادلة القديمة بالحرف (ست مكونات) — زي ما كتبها الكود قبل ترحيل 071
  const currentSourceHash = payrollLiveSourceContent({ ...SIX, currency: 'EGP' }).contentHash
  const createdAt = '2026-09-20T10:00:00.000Z'
  const segment = { ...SIX, currency: 'EGP', effectivePayrollPeriod: '2026-08', effectiveToPayrollPeriod: null, effectiveFrom: '2026-08-01', effectiveTo: null }
  const header = { employeeId: legacyId, revision: 1, reason: 'أجر موثق قبل ترحيل 071', evidenceReference: 'عقد قديم WPLEGACY', currentSourceHash, cycleStartDay: 1, createdBy: U.admin.id, createdAt }
  const contentHash = payrollLiveSourceContent({ schemaVersion: V2, contractVersion: V2, ...header, segments: [segment] }).contentHash
  const versionId = (await ds.query(`INSERT INTO dbo.employee_salary_history_versions ([employeeId], [revision], [reason], [evidenceReference], [currentSourceHash], [contentHash],
    [createdBy], [contractVersion], [cycleStartDay], [createdAt]) OUTPUT INSERTED.[id] VALUES (@0, 1, @1, @2, @3, @4, @5, @6, 1, CAST(@7 AS datetime2))`,
  [legacyId, header.reason, header.evidenceReference, currentSourceHash, contentHash, U.admin.id, V2, createdAt]))[0].id
  await ds.query(`INSERT INTO dbo.employee_salary_history ([versionId], [sequence], [effectiveFrom], [effectiveTo], [currency], [effectivePayrollPeriod], [effectiveToPayrollPeriod],
    [basicSalary], [housingAllowance], [transportAllowance], [phoneAllowance], [workNatureAllowance], [otherAllowance]) VALUES (@0, 1, '2026-08-01', NULL, N'EGP', N'2026-08', NULL, 6000, 0, 0, 0, 0, 0)`, [versionId])
  const employeesBefore = await ds.query('SELECT COUNT(*) AS n FROM dbo.employees')

  const record = await migrate.apply({ database, base, trial: true, schemaDiff: false, quiet: true })
  assert.equal(record.mode, 'disposable')
  assert.equal(record.failed, undefined, JSON.stringify(record.failed))
  assert.equal(record.trial?.passed, true)
  assert.deepEqual(record.applied.map(item => path.basename(item.file)), [FILE])
  assert.equal(record.ledgerComplete, true)
  assert.deepEqual(record.columns.added.filter(column => !column.startsWith('app_schema_migrations.')).sort(),
    ['employee_salary_history.workPressureAllowance', 'employees.workPressureAllowance'])
  assert.deepEqual(record.columns.removedOrRenamed, [])
  assert.deepEqual(record.rowCounts.differences.filter(d => d.table !== 'app_schema_migrations'), [])

  const shape = async () => ds.query(`SELECT OBJECT_NAME(c.object_id) AS tbl, t.name AS type, c.precision, c.scale, c.is_nullable AS nullable, d.name AS df, d.definition
    FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id LEFT JOIN sys.default_constraints d ON d.object_id = c.default_object_id
    WHERE c.name = 'workPressureAllowance' AND c.object_id IN (OBJECT_ID('dbo.employees'), OBJECT_ID('dbo.employee_salary_history')) ORDER BY OBJECT_NAME(c.object_id)`)
  const expected = [{ tbl: 'employee_salary_history', type: 'decimal', precision: 18, scale: 2, nullable: false, df: DF.history, definition: '((0))' },
    { tbl: 'employees', type: 'decimal', precision: 18, scale: 2, nullable: false, df: DF.employees, definition: '((0))' }]
  assert.deepEqual(await shape(), expected)
  // الصفوف القائمة بالصفر الافتراضي (مفيش تعبئة)، ومفيش صف اتضاف أو اتشال، وفرق المخطط مع الكيانات = صفر (كل الجداول)
  assert.deepEqual(await ds.query('SELECT COUNT(*) AS n FROM dbo.employees'), employeesBefore)
  assert.equal((await ds.query('SELECT COUNT(*) AS n FROM dbo.employees WHERE [workPressureAllowance] <> 0'))[0].n, 0)
  assert.equal((await ds.query('SELECT COUNT(*) AS n FROM dbo.employee_salary_history WHERE [workPressureAllowance] <> 0'))[0].n, 0)
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
  // البصمات القديمة: السجل بيتقري ببصمته المحفوظة، والأجر الحالي مطابق للمصدر اللي اتوثق بيه (مفيش انحراف يوقف تغيير الأجر)
  const history = await ds.transaction('SERIALIZABLE', em => readSalaryHistory(em, legacyId))
  assert.equal(history.version.contentHash, contentHash); assert.equal(history.segments[0].workPressureAllowance, '0.00')
  const current = await ds.transaction('SERIALIZABLE', em => readSalaryHistoryCurrent(em, legacyId))
  assert.equal(current.currentSourceHash, currentSourceHash); assert.equal(current.current.workPressureAllowance, '0.00')
  E.legacy = await repo('Employee').findOneByOrFail({ id: legacyId })

  // إعادة المُرحّل: مفيش ملف معلق. ونص الترحيل نفسه مرتين برّه الدفتر: آمن للتكرار
  const replay = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.deepEqual(replay.pendingBefore, []); assert.deepEqual(replay.applied, []); assert.equal(replay.ledgerComplete, true)
  for (let round = 0; round < 2; round++) for (const batch of migrate.splitBatches(content)) await pool.request().batch(batch)
  assert.deepEqual(await shape(), expected)

  // شكل غلط يوقف التحقق بكوده ومايسيبش أثر (كل حالة جوه معاملة بتترجع)
  for (const [ddl, code] of [
    [`ALTER TABLE dbo.employees DROP CONSTRAINT [${DF.employees}]; ALTER TABLE dbo.employees ALTER COLUMN [workPressureAllowance] decimal(18,2) NULL`, 71002],
    [`EXEC sp_rename N'dbo.${DF.employees}', N'DF_work_pressure_wrong_name', N'OBJECT'`, 71003],
    [`ALTER TABLE dbo.employees DROP CONSTRAINT [${DF.employees}]; ALTER TABLE dbo.employees ADD CONSTRAINT [${DF.employees}] DEFAULT 1 FOR [workPressureAllowance]`, 71003],
    [`ALTER TABLE dbo.employee_salary_history DROP CONSTRAINT [${DF.history}]; ALTER TABLE dbo.employee_salary_history ALTER COLUMN [workPressureAllowance] decimal(19,2) NOT NULL`, 71005],
    [`ALTER TABLE dbo.employee_salary_history DROP CONSTRAINT [${DF.history}]`, 71006]]) {
    const tx = new sql.Transaction(pool)
    await tx.begin()
    try {
      await new sql.Request(tx).batch(ddl)
      await assert.rejects(new sql.Request(tx).batch(migrate.splitBatches(content).at(-1)), error => { assert.equal(error.number, code, error.message); return true })
    } finally { try { await tx.rollback() } catch { /* أُجهضت من الخادم */ } }
  }
  assert.deepEqual(await shape(), expected)
})

test('WP-A: 6000 + 1000 with an absent day, lateness, shortfall, one unpaid day, overtime, a typed day-deduction, a 7% cap and social insurance — every base is 6000 and the 1000 is paid whole', async t => {
  // صرف مختلط (تحويل ثابت 5000 والباقي نقدي) عشان كشف البنك والدفتر المالي يثبتوا إن الصافي شامل البدل بيتقسم زي أي صافي
  const emp = await employee({ workPressureAllowance: 1000, isGosiRegistered: true, payMethod: 'mixed', bankTransferAmount: 5000, bankName: 'مصرف الراجحي',
    iban: 'SA0380000000608010167519' })
  E.a = emp
  const incidentDate = new Date(Date.now() - 3 * 86400000).toLocaleDateString('en-CA')
  // خصم مصنف مسعّر بالأيام: يوم واحد من راتب شهر الاستهداف = 6000 ÷ 30 = 200.00 (لو البدل داخل كان 233.33)
  const type = expect(await http(U.admin, 'POST', '/deductions/types', { code: 'WP_DAYS', nameAr: 'خصم التزام بالأيام', category: 'DISCIPLINARY',
    calcMethod: 'DAYS_OF_SALARY', creatorScopes: ['HR'], approvalSteps: ['HR'], escalationDays: null }), 201)
  const deduction = expect(await http(U.admin, 'POST', '/deductions', { deductionTypeId: type.id, inputValue: '1', incidentDate, employeeId: emp.id, targetPeriod: OCT,
    reason: 'تأخر متكرر عن تسليم تقرير الوردية الصباحية' }), 201)
  assert.equal(deduction.estimatedAmount, '200.00', 'تسعير الخصم بالأيام على 6000 مش 7000')
  // المُنشئ هو الموارد البشرية وخطوة الاعتماد الوحيدة هي الموارد البشرية ⇒ بيتعتمد عند الإنشاء؛ السعر النهائي بيتعاد على راتب الشهر
  const approved = deduction.status === 'APPROVED' ? deduction
    : expect(await http(U.approver, 'POST', `/deductions/${deduction.id}/approve`, { expectedRevision: deduction.revision, reason: 'موثق بمحضر الوردية' }), 201)
  assert.equal(approved.status, 'APPROVED'); assert.equal(approved.finalAmount, '200.00'); assert.equal(approved.obligations[0].amount, '200.00')

  await repo('AttendanceDay').save([
    attendanceDay(emp, '2026-10-05', { status: 'absent', checkIn: null, checkOut: null, workMinutes: 0 }),
    attendanceDay(emp, '2026-10-06', { status: 'late', checkIn: '08:48', lateMinutes: 48, workMinutes: 432 }),
    attendanceDay(emp, '2026-10-07', { checkOut: '15:30', workMinutes: 450, shortfallMinutes: 30 }),
  ])
  await repo('Leave').save({ employeeId: emp.id, leaveTypeCode: 'UNPAID', fromDate: '2026-10-08', toDate: '2026-10-08', days: 1, period: 'FULL', isUnpaid: true, status: 'APPROVED' })
  await repo('OvertimeEntry').save({ employeeId: emp.id, date: '2026-10-12', source: 'PRE_REQUESTED', hoursRequested: 2, payableHours: 2, rate: 1.5, status: 'APPROVED' })
  await setConfig('payroll.policy.max_deduction_pct_of_gross', '7')
  let run
  try { run = await calc(OCT, [emp]) } finally { await setConfig('payroll.policy.max_deduction_pct_of_gross', 'null') }
  R.a = run
  const item = itemOf(run, emp), detail = breakdown(item), snapshot = memberOf(run, emp)

  // الأسس: سعر اليوم والساعة والإجمالي المستحق على 6000
  assert.equal(detail.gross, 6000); assert.equal(detail.grossEarned, 6000)
  assert.equal(detail.dayRate, 200, 'سعر اليوم 6000/30 (مش 233.33)'); assert.equal(detail.hourRate, 25, 'سعر الساعة 200/8 (مش 29.16)')
  assert.deepEqual(detail.monthlyComponents, [6000, 0, 0, 0, 0, 0], 'مصفوفة المكونات الست زي ما هي')
  assert.deepEqual(detail.workPressureAllowance, { monthlyAmount: 1000, earnedAmount: 1000 })
  // كل خصم وإضافي بسعر 6000
  assert.equal(money(item.absenceDeduction), 200, 'غياب يوم × 200'); assert.equal(Number(item.absenceDays), 1)
  assert.equal(money(item.latenessDeduction), 20, '48 دقيقة × 6000/30/8/60'); assert.equal(Number(item.lateMinutes), 48)
  assert.equal(money(item.shortfallDeduction), 12.5, '30 دقيقة نقص × سعر الدقيقة'); assert.equal(Number(item.shortfallMinutes), 30)
  assert.equal(money(item.unpaidLeaveDeduction), 200, 'يوم بلا أجر × 200 — البدل مابيتخصمش منه'); assert.equal(Number(item.unpaidLeaveDays), 1)
  assert.equal(money(item.overtimeAmount), 75, 'ساعتين × 25 × 1.5 (مش 87.50)'); assert.equal(Number(item.overtimeHours), 2)
  // السقف 7% من 6000 = 420 (مش 490): الحضور 232.50 وبعده الخصم المصنف 187.50 والباقي 12.50 مرحّل
  assert.equal(detail.netProtection.cap, '420.000000'); assert.equal(detail.netProtection.balanceBeforeDeductions, '5875.00')
  const typed = detail.obligationLines.find(line => line.typed)
  assert.deepEqual([typed.amount, typed.collected, typed.carried], [200, 187.5, 12.5])
  assert.equal(money(item.otherDeductions), 187.5)
  // التأمينات على الأساسي 6000 (المصري 11%) = 660 — البدل مش أساس تأمينات
  assert.equal(detail.socialInsurance.baseSalary, 6000); assert.equal(detail.socialInsurance.salarySource, 'BASIC'); assert.equal(money(item.socialInsuranceDeduction), 660)
  // المصروف: البدل كامل جوه البدلات والصافي
  assert.equal(money(item.basicSalary), 6000); assert.equal(money(item.allowances), 1000, 'البدلات المصروفة = بدل ضغط العمل')
  const net = 6000 + 75 - 20 - 12.5 - 200 - 200 - 187.5 - 660 + 1000
  assert.equal(net, 5795); assert.equal(money(item.netPay), 5795, 'الصافي = الحساب باليد'); assert.equal(money(run.totalNet), 5795)
  // اللقطة والسطر المحفوظ
  assert.equal(snapshot.gross, 6000); assert.deepEqual(snapshot.workPressureAllowance, { monthlyAmount: 1000, earnedAmount: 1000 })
  assert.equal(snapshot.salarySource.amounts.workPressureAllowance, '1000.00')
  assert.deepEqual(detail.salaryComponents.at(-1), { code: 'WORK_PRESSURE', nameAr: 'بدل ضغط العمل', nameEn: 'Work Pressure Allowance', monthlyAmount: 1000, earnedAmount: 1000 })
  assert.deepEqual(snapshot.salaryComponents, detail.salaryComponents)
  // قسيمة الراتب: سطر «بدل ضغط العمل» في الاستحقاقات، والمجاميع = الأعمدة
  const slip = expect(await http(U.admin, 'GET', `/payroll/items/${item.id}`), 200)
  assert.deepEqual(slip.lines.earnings.map(line => [line.key, line.name, line.amount]),
    [['BASIC', 'الأساسي', 6000], ['SALARY:WORK_PRESSURE', 'بدل ضغط العمل', 1000], ['OVERTIME', 'الإضافي', 75]])
  assert.deepEqual(slip.lines.deductions.map(line => [line.key, line.amount]),
    [['LATENESS', 20], ['SHORTFALL', 12.5], ['ABSENCE', 200], ['UNPAID_LEAVE', 200], ['TYPED:خصم التزام بالأيام', 187.5], ['SOCIAL_INSURANCE', 660]])
  assert.deepEqual(slip.lines.totals, { earnings: 7075, deductions: 1280, net: 5795 })
  const lines = expect(await http(U.admin, 'GET', `/payroll/runs/${run.id}/lines`), 200)
  assert.ok(lines.columns.earnings.some(column => column.key === 'SALARY:WORK_PRESSURE' && column.name === 'بدل ضغط العمل'), 'عمود في جدول المسير')
  // كشف البنك: التحويل الثابت 5000 والباقي نقدي 795 — المجموع = الصافي 5795 شامل البدل
  const sheet = expect(await http(U.admin, 'GET', `/payroll/runs/${run.id}/bank-sheet`), 200)
  const sheetRow = sheet.rows.find(row => row.employeeId === emp.id)
  assert.deepEqual([sheetRow.netPay, sheetRow.bankAmount, sheetRow.cashAmount], [5795, 5000, 795], 'تقسيم بنك/نقدي على الصافي شامل البدل')
  // الدفتر المالي (كشف الرواتب): البدل عمود لوحده جوه البدلات، والإجمالي والصافي والبنك والنقدي شاملينه
  const register = expect(await http(U.admin, 'GET', `/reports/financial/payroll-register?period=${OCT}&includeDraft=true`), 200)
  const registerRow = register.rows.find(row => row.runId === run.id && row.employeeId === emp.id)
  assert.deepEqual([registerRow.basic, registerRow.allowances, registerRow.allowanceBuckets.WORK_PRESSURE, registerRow.gross, registerRow.net, registerRow.bank, registerRow.cash],
    ['6000.00', '1000.00', '1000.00', '7075.00', '5795.00', '5000.00', '795.00'])
  assert.ok(register.columns.allowanceBuckets.some(column => column.key === 'WORK_PRESSURE' && column.label === 'بدل ضغط العمل'), 'عمود «بدل ضغط العمل» في الدفتر')
  t.diagnostic('باليد: 6000 + إضافي 75 − تأخير 20 − نقص 12.50 − غياب 200 − بلا أجر 200 − مصنف 187.50 (سقف 420 − 232.50) − تأمينات 660 = 4795 + البدل 1000 = 5795.00')
})

test('WP-B: debts bigger than the salary plus a loan installment — the 1000 is still paid whole; approval, payment, the employee payslip and profile all carry it', async t => {
  const b1 = await employee({ workPressureAllowance: 1000 }), b2 = await employee({ workPressureAllowance: 1000 })
  const debit = (emp, amount) => repo('EmployeeObligation').save({ employeeId: emp.id, type: 'DEBIT', category: 'custody_shortfall', amount, label: 'عجز عهدة اختبار',
    status: 'PENDING', effectiveDate: '2026-10-01' })
  const loan = async emp => {
    const row = await repo('Loan').save({ employeeId: emp.id, amount: 1500, status: 'DISBURSED' })
    await repo('LoanInstallment').save({ loanId: row.id, dueDate: '2026-10-10', amount: 500, paid: false, paidAmount: '0.00', financialStatus: 'DUE', financialRevision: 1 })
    return row
  }
  const debt1 = await debit(b1, 9000), debt2 = await debit(b2, 5800)
  await loan(b1); await loan(b2)
  const run = await calc(OCT, [b1, b2])
  const one = itemOf(run, b1), two = itemOf(run, b2)
  // b1: الدين 9000 أكبر من الراتب — الحماية بتاخد الـ6000 كلها وتسيب 3000 مرحّلين، والقسط مالوش مكان، والبدل كامل
  assert.equal(money(one.otherDeductions), 6000); assert.equal(money(one.loanInstallments), 0)
  assert.deepEqual(breakdown(one).obligationLines.map(line => [line.id, line.collected, line.carried]), [[debt1.id, 6000, 3000]])
  assert.equal(money(one.allowances), 1000); assert.equal(money(one.netPay), 1000, 'البدل مصروف كامل رغم إن الخصومات أكبر من الراتب')
  // b2: الدين يسيب 200 من الست والقسط ياخدهم بس — مايوصلش للبدل
  assert.equal(money(two.otherDeductions), 5800); assert.equal(money(two.loanInstallments), 200, 'القسط من الـ200 الباقية من الست بس')
  assert.equal(breakdown(two).installmentPlan.context.netBeforeLoans, '200.00'); assert.equal(breakdown(two).installmentPlan.context.earnedFixedGross, '6000.00')
  assert.equal(money(two.netPay), 1000, 'القسط ماخدش من البدل')
  // الاعتماد بيعيد التحقق من خطة الأقساط (بيطرح البدل من البدلات والصافي قبل المقارنة) والصرف بيرحّل ويستهلك صح
  const report = expect(await http(U.admin, 'GET', `/payroll/runs/${run.id}/unassigned`), 200)
  expect(await http(U.admin, 'POST', `/payroll/runs/${run.id}/unassigned-ack`, { reportHash: report.reportHash }), 201)
  expect(await http(U.admin, 'POST', `/payroll/runs/${run.id}/approve`), 201, 'اعتماد')
  expect(await http(U.admin, 'POST', `/payroll/runs/${run.id}/pay`, { channel: 'CASH', reference: `WP-${run.id}` }), 201, 'صرف')
  const installment = await repo('LoanInstallment').findOneByOrFail({ loanId: (await repo('Loan').findOneByOrFail({ employeeId: b2.id })).id, dueDate: '2026-10-10' })
  assert.equal(money(installment.paidAmount), 200, 'اتسدد من القسط 200 بس')
  assert.equal((await repo('EmployeeObligation').findOneByOrFail({ id: debt2.id })).status, 'APPLIED')
  // الموظف: قسيمته المنشورة فيها السطر، وملفه فيه البدل
  const self = await repo('User').save({ email: 'b1@work-pressure.invalid', displayName: 'موظف b1', passwordHash: 'test-only', role: 'employee', branchId: B.main.id, employeeId: b1.id, permissions: '[]' })
  const slip = expect(await http(self, 'GET', `/payroll/items/${one.id}`), 200)
  assert.deepEqual(lineOf(slip.lines.earnings, 'SALARY:WORK_PRESSURE'), { key: 'SALARY:WORK_PRESSURE', name: 'بدل ضغط العمل', amount: 1000 })
  assert.equal(slip.lines.totals.net, 1000)
  const profile = expect(await http(self, 'GET', `/employees/${b1.id}/profile`), 200)
  assert.equal(money(profile.employee.workPressureAllowance), 1000, 'ظاهر للموظف في بيانات راتبه')
  const stranger = await repo('User').save({ email: 'nofinance@work-pressure.invalid', displayName: 'بلا مالية', passwordHash: 'test-only', role: 'hr_officer', branchId: B.main.id,
    employeeId: null, permissions: JSON.stringify(['employees.view']) })
  const hidden = expect(await http(stranger, 'GET', `/employees/${b1.id}`), 200)
  assert.equal('workPressureAllowance' in hidden, false, 'محجوب زي باقي البيانات المالية')
  t.diagnostic('b1: دين 9000 → اتحصل 6000 ورحّل 3000، القسط 0، الصافي = البدل 1000. b2: دين 5800 وقسط 200 من الست، الصافي = البدل 1000.')
})

test('WP-C: a joiner mid-period gets the allowance prorated by the same service-day rule as the salary; the control without it differs by exactly that amount', async t => {
  const joiner = await employee({ joinDate: '2026-10-10', workPressureAllowance: 1000 }), control = await employee({ joinDate: '2026-10-10' })
  const run = await calc(OCT, [joiner, control])
  const item = itemOf(run, joiner), detail = breakdown(item), base = itemOf(run, control)
  assert.equal(detail.coverDays, 22); assert.equal(detail.coverFrom, '2026-10-10')
  assert.equal(money(item.basicSalary), 4400, '6000 × 22/30'); assert.equal(detail.dayRate, 200, 'سعر اليوم على الشهر كامل')
  assert.deepEqual(detail.workPressureAllowance, { monthlyAmount: 1000, earnedAmount: 733.33 }, '1000 × 22/30 = 733.333… مقصوص')
  assert.equal(money(item.allowances), 733.33); assert.equal(money(item.netPay), 5133.33)
  assert.equal(money(base.netPay), 4400); assert.equal(money(item.netPay) * 100 - money(base.netPay) * 100, 73333)
  t.diagnostic('المعيَّن 10 أكتوبر: 22 يوم خدمة ÷ 30 — الراتب 4400.00 والبدل 733.33 بنفس القاعدة.')
})

test('WP-D: a dated change of the allowance is a dated salary change — October pays 1000 and November 1500 from the monthly salary history', async () => {
  const emp = await employee()
  const context = expect(await http(U.admin, 'GET', `/payroll/employees/${emp.id}/salary-history`), 200)
  assert.equal(context.current.workPressureAllowance, '0.00')
  const saved = expect(await http(U.admin, 'POST', `/payroll/employees/${emp.id}/salary-history/monthly`, { expectedRevision: context.revision,
    expectedCurrentSourceHash: context.currentSourceHash, reason: 'إقرار بدل ضغط العمل ثم زيادته من نوفمبر', evidenceReference: 'قرار WP-D',
    periods: [{ effectivePayrollPeriod: OCT, effectiveToPayrollPeriod: OCT, currency: 'EGP', ...SIX, workPressureAllowance: '1000' },
      { effectivePayrollPeriod: NOV, effectiveToPayrollPeriod: null, currency: 'EGP', ...SIX, workPressureAllowance: '1500' }] }), 201)
  assert.deepEqual(saved.segments.map(row => [row.effectivePayrollPeriod, row.workPressureAllowance, row.basicSalary]), [[OCT, '1000.00', '6000.00'], [NOV, '1500.00', '6000.00']])
  const october = await calc(OCT, [emp]), november = await calc(NOV, [emp])
  for (const [run, amount] of [[october, 1000], [november, 1500]]) {
    const item = itemOf(run, emp), snapshot = memberOf(run, emp)
    assert.equal(snapshot.salarySource.kind, 'MONTHLY_HISTORY')
    assert.equal(snapshot.salarySource.amounts.workPressureAllowance, `${amount}.00`)
    assert.equal(breakdown(item).dayRate, 200, 'سعر اليوم على الست في الشهرين')
    assert.equal(money(item.allowances), amount); assert.equal(money(item.netPay), 6000 + amount)
  }
  assert.equal(memberOf(october, emp).salarySource.effectivePayrollPeriod, OCT); assert.equal(memberOf(november, emp).salarySource.effectivePayrollPeriod, NOV)
})

test('WP-E: end of service in the settlement preview equals a control employee without the allowance; the last-month salary line carries it through the run item', async t => {
  const withAllowance = await employee({ workPressureAllowance: 1000 }), control = await employee()
  const run = await calc(OCT, [withAllowance, control])
  const eos = rows => rows.filter(row => String(row.label).startsWith('مكافأة نهاية الخدمة'))
  const salaryLine = rows => rows.find(row => String(row.label).startsWith('راتب آخر شهر'))
  const preview = async emp => expect(await http(U.admin, 'GET', `/offboarding/preview?employeeId=${emp.id}&reason=termination&lastWorkingDay=2026-10-31`), 200).lines
  const [a, b] = [await preview(withAllowance), await preview(control)]
  assert.equal(eos(a).length, 1); assert.deepEqual(eos(a).map(row => money(row.amount)), eos(b).map(row => money(row.amount)), 'المكافأة على الست بس')
  assert.equal(money(salaryLine(a).amount), money(itemOf(run, withAllowance).netPay)); assert.equal(money(salaryLine(a).amount), 7000)
  assert.equal(money(salaryLine(b).amount), 6000)
  t.diagnostic(`مكافأة نهاية الخدمة للاتنين ${money(eos(a)[0].amount)}؛ راتب آخر شهر 7000 مقابل 6000 (البدل بيوصل التصفية جوه صافي بند المسير بس).`)
})

test('WP-G: bulk update from Excel — employee code + «بدل ضغط العمل» is a dated salary change with audit, and the next run pays it', async () => {
  const emp = await employee({ employeeCode: 'WPBULK' })
  const template = await fetch(`${baseUrl}/employees/bulk-update/template`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(U.admin)}` },
    body: JSON.stringify({ fields: ['workPressureAllowance'], format: 'xlsx', employeeIds: [emp.id] }) })
  assert.equal(template.status, 200)
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(Buffer.from(await template.arrayBuffer()))
  const sheet = workbook.getWorksheet('البيانات')
  assert.deepEqual(sheet.getRow(1).values.slice(1), ['كود الموظف', 'اسم الموظف', 'بدل ضغط العمل', 'يسري من راتب شهر'])
  assert.equal(sheet.getRow(2).getCell(1).value, 'WPBULK')
  sheet.getRow(2).getCell(3).value = 1200
  const edited = Buffer.from(await workbook.xlsx.writeBuffer())
  const month = payrollPeriodOfDate(localDateOf(new Date()), 1)
  const upload = async (step, extra = {}) => {
    const form = new FormData()
    form.append('file', new Blob([edited]), 'work-pressure.xlsx')
    for (const [key, value] of Object.entries(extra)) form.append(key, value)
    const response = await fetch(`${baseUrl}/employees/bulk-update/${step}`, { method: 'POST', headers: { Authorization: `Bearer ${token(U.admin)}` }, body: form })
    return { status: response.status, body: JSON.parse(await response.text()) }
  }
  const preview = expect(await upload('preview', { salaryMonth: month }), 201)
  assert.deepEqual(preview.rows.map(row => [row.code, row.status]), [['WPBULK', 'ready']])
  assert.deepEqual(preview.rows[0].changes.map(change => [change.field, change.new]), [['workPressureAllowance', '1200.00']])
  const applied = expect(await upload('apply', { salaryMonth: month, salaryReason: 'إقرار بدل ضغط العمل', salaryEvidence: 'قرار المالك 26 سبتمبر' }), 201)
  assert.deepEqual(applied.summary, { applied: 1, failed: 0, skipped: 0 })
  assert.equal(money((await repo('Employee').findOneByOrFail({ id: emp.id })).workPressureAllowance), 1200)
  const segments = await ds.query(`SELECT h.[effectivePayrollPeriod], CAST(h.[workPressureAllowance] AS nvarchar(40)) AS [workPressureAllowance], CAST(h.[basicSalary] AS nvarchar(40)) AS [basicSalary]
    FROM dbo.employee_salary_history h JOIN dbo.employee_salary_history_versions v ON v.[id]=h.[versionId] WHERE v.[employeeId]=@0`, [emp.id])
  assert.deepEqual(segments, [{ effectivePayrollPeriod: month, workPressureAllowance: '1200.00', basicSalary: '6000.00' }])
  const change = (await repo('EmployeeStatusHistory').find({ where: { employeeId: emp.id } })).find(row => row.fieldName === 'workPressureAllowance')
  assert.ok(change, 'سجل التغييرات'); assert.equal(change.changeType, 'SALARY'); assert.match(change.reason, /إقرار بدل ضغط العمل — يسري من راتب شهر/)
  const run = await calc(OCT, [emp])
  assert.equal(memberOf(run, emp).salarySource.kind, 'MONTHLY_HISTORY')
  assert.equal(money(itemOf(run, emp).allowances), 1200); assert.equal(money(itemOf(run, emp).netPay), 7200)
})

test('WP-N: the allowance never covers a negative effect net — unpaid leave beyond the salary still blocks approval although the paid net is positive', async () => {
  // أكتوبر 31 يوم كله بلا أجر: 31 × 200 = 6200 أكبر من المستحق 6000 ⇒ صافي المؤثرات −200؛ البدل بيتضاف فوقه (800) بس مابيغطيهوش
  const emp = await employee({ workPressureAllowance: 1000 })
  await repo('Leave').save({ employeeId: emp.id, leaveTypeCode: 'UNPAID', fromDate: '2026-10-01', toDate: '2026-10-31', days: 31, period: 'FULL', isUnpaid: true, status: 'APPROVED' })
  const run = await calc(OCT, [emp]), item = itemOf(run, emp)
  assert.equal(money(item.unpaidLeaveDeduction), 6200); assert.equal(money(item.netPay), 800)
  assert.ok(breakdown(item).netProtection.warnings.some(warning => warning.code === 'NET_NEGATIVE_PROTECTED_ONLY'))
  const report = expect(await http(U.admin, 'GET', `/payroll/runs/${run.id}/unassigned`), 200)
  expect(await http(U.admin, 'POST', `/payroll/runs/${run.id}/unassigned-ack`, { reportHash: report.reportHash }), 201)
  const blocked = await http(U.admin, 'POST', `/payroll/runs/${run.id}/approve`)
  assert.equal(blocked.status, 409, JSON.stringify(blocked.body)); assert.equal(blocked.body.code, 'PAYRUN-NET-NEGATIVE'); assert.deepEqual(blocked.body.employeeIds, [emp.id])
})

test('WP-P: a salary change sent without the allowance (an older client) keeps the current allowance instead of zeroing it', async () => {
  const emp = await employee({ workPressureAllowance: 700 })
  const context = expect(await http(U.admin, 'GET', `/employees/${emp.id}/salary-change-context`), 200)
  assert.equal(context.current.workPressureAllowance, '700.00')
  const { workPressureAllowance: _omitted, ...olderClient } = context.current
  expect(await http(U.admin, 'PATCH', `/employees/${emp.id}`, { salaryChange: { expectedRevision: context.historyRevision, expectedCurrentSourceHash: context.currentSourceHash,
    effectivePayrollPeriod: context.currentPayrollPeriod, reason: 'زيادة الأساسي من شاشة قديمة', evidenceReference: 'قرار WP-P', salary: { ...olderClient, basicSalary: '6500.00' } } }), 200)
  const saved = await repo('Employee').findOneByOrFail({ id: emp.id })
  assert.equal(money(saved.basicSalary), 6500); assert.equal(money(saved.workPressureAllowance), 700, 'البدل فضل زي ما هو')
  const history = expect(await http(U.admin, 'GET', `/payroll/employees/${emp.id}/salary-history`), 200)
  assert.deepEqual(history.segments.map(row => [row.basicSalary, row.workPressureAllowance]), [['6500.00', '700.00']])
  assert.equal((await repo('EmployeeStatusHistory').find({ where: { employeeId: emp.id } })).some(row => row.fieldName === 'workPressureAllowance'), false, 'مفيش تغيير اتسجل على البدل')
})

test('WP-L: an employee without the allowance (the old one from before 071) keeps the item, breakdown and snapshot exactly as before', async () => {
  const fresh = await employee()
  const run = await calc(OCT, [E.legacy, fresh])
  for (const emp of [E.legacy, fresh]) {
    const item = itemOf(run, emp), detail = breakdown(item), snapshot = memberOf(run, emp)
    assert.equal(money(item.netPay), 6000); assert.equal(money(item.allowances), 0)
    assert.equal('workPressureAllowance' in detail, false, 'مفيش حقل جديد في التفصيل'); assert.equal('workPressureAllowance' in snapshot, false)
    assert.equal(detail.salaryComponents.length, 6, 'ست سطور زي ما كانت'); assert.equal('workPressureAllowance' in snapshot.salarySource.amounts, false)
  }
  assert.equal(memberOf(run, E.legacy).salarySource.kind, 'MONTHLY_HISTORY', 'السجل القديم (قبل 071) بيتقري ببصمته')
})
