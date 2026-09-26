'use strict'
// «البدل الثابت الشهري» (بدل ضغط عمل — طلب المالك 26 سبتمبر) من الأول للآخر على قاعدة SQL مؤقتة معزولة
// (hr_payroll_recurring_allowances_test_<16 hex>) — لا اتصال بـhr_system. الإثبات:
//  1) ترحيل 20260926_071 عبر المُرحّل المجمّع نفسه: الجدول بأسماء قيود TypeORM، فرق المخطط صفر، إعادة التشغيل آمنة،
//     والشكل الغلط يوقف التحقق بكوده.
//  2) موظف راتبه 6000 + بدل ثابت 1000، عليه غياب يوم وتأخير ساعة ونقص نص ساعة وإجازة بدون راتب يوم وإضافي ساعتين وخصم مصنف
//     يوم من الراتب، وسقف الخصم 5%: سعر اليوم 200 وسعر الساعة 25 (مش 233.33 و29.16)، وكل خصم وسقف الخصم (300 مش 350) على
//     الراتب من غير البدل، والبدل بيتصرف كامل سطر باسمه، والصافي = 6575 بالحساب اليدوي — والقسيمة وجدول المسير وكشف البنك والتقرير.
//  3) المنضم في نص الشهر بياخده بنسبة أيامه (10 أيام = 333.33)، واللي مش في الخدمة الشهر ده ما ياخدوش.
//  4) إعادة الحساب ما بتكررش القيد؛ اعتماد ← صرف ← الشهر اللي بعده بياخده تاني؛ الإيقاف بيشيل الشهور اللي ما اتعتمدتش بس،
//     والاعتماد بيرفض مسير اتحسب قبل إضافة/إيقاف بدل ثابت لحد ما يتعاد حسابه، وإلغاء مسير ما بيسيبش قيد يتيم.
//  5) عزل الفروع: حساب فرع تاني ما يشوفش ولا يسند ولا يوقف، وصلاحية العرض بس ما تسندش.
//  6) مساحة الخصم والأقساط: خصم أكبر من الراتب ما بياكلش البدل الثابت (بيتصرف كامل)، وبدل الشهر الواحد جوه المساحة زي ما كان.
//  7) مكافأة نهاية الخدمة على الراتب من غير البدل.
// Run: node --test --test-concurrency=1 api/test/payroll-recurring-allowances.integration.cjs
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

const database = `hr_payroll_recurring_allowances_test_${crypto.randomBytes(8).toString('hex')}`
const migrationsBase = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-recurring-migrations-'))
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-recurring-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const MIGRATIONS = path.join(repoRoot, 'docs/migrations/payroll')
const FILE = '20260926_071_recurring_allowances.sql'
const TABLE = 'payroll_recurring_allowances'
const COLUMNS = ['id', 'employeeId', 'branchId', 'allowanceTypeId', 'typeName', 'amount', 'fromPeriod', 'untilPeriod', 'targetLevel', 'reason', 'status',
  'stoppedFromPeriod', 'stopReason', 'stoppedByUserId', 'stoppedAt', 'createdByUserId', 'createdAt']
// شهور مسير في المستقبل (اليوم سبتمبر 2026): تجسيد الغياب وإعادة حساب اليوم ما بيتجاوزانش النهارده، فصفوف الحضور المكتوبة للاختبار
// تُقرأ كما هي — نفس أسلوب باقي اختبارات المسير. الدورة من يوم 1 فالشهر = الشهر الميلادي.
const JAN = '2027-01', FEB = '2027-02', MAR = '2027-03', APR = '2027-04'
const REASON = 'بدل ضغط عمل لفريق مشروع 2027 بقرار الإدارة'
let app, ds, master, pool, base, created = false, employeeNumber = 0
const org = {}, users = {}, people = {}, types = {}, runs = {}, assigned = {}

function assertDisposable() {
  assert.match(database, migrate.DISPOSABLE_DATABASE)
  assert.match(database, /^hr_payroll_recurring_allowances_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  assert.notEqual(database, 'hr_system')
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
const query = (text, params = []) => { assertDisposable(); return ds.query(text, params) }
function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(user)}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  let parsed = null
  try { parsed = text ? JSON.parse(text) : null } catch { parsed = text }
  return { status: response.status, body: parsed }
}
function expectStatus(response, status, code) {
  assert.equal(response.status, status, JSON.stringify(response.body).slice(0, 1500))
  if (code) assert.equal(response.body?.code, code, JSON.stringify(response.body).slice(0, 1500))
  return response.body
}
async function setConfig(key, value) {
  const config = repo('RequestsConfig')
  if (await config.findOneBy({ key })) await config.update({ key }, { value })
  else await config.save({ key, value })
}
const money = value => Number(Number(value).toFixed(2))
const itemOf = (run, emp) => { const row = run.items.find(item => item.employeeId === emp.id); assert.ok(row, `مفيش بند للموظف ${emp.employeeCode}`); return row }
const breakdownOf = item => JSON.parse(item.breakdown)
async function employee(overrides = {}) {
  return repo('Employee').save({ employeeCode: `RCA${String(++employeeNumber).padStart(3, '0')}`, fullName: `موظف البدل الثابت ${employeeNumber}`,
    branchId: org.branchA.id, departmentId: org.deptA.id, joinDate: '2020-01-01', basicSalary: 6000, housingAllowance: 0, transportAllowance: 0,
    phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'transfer', ...overrides })
}
/** يوم حضور محسوب: الأساس حاضر كامل على وردية 8 ساعات، والتخصيص يحدد الغياب أو التأخير أو النقص. */
const attendanceDay = (emp, date, custom = {}) => ({ employeeId: emp.id, branchId: emp.branchId, date, status: 'present', checkIn: '08:00', checkOut: '16:00',
  shiftName: 'وردية اختبار البدل الثابت', shiftStart: '08:00', shiftEnd: '16:00', scheduleSource: 'override', workMinutes: 480, lateMinutes: 0,
  deductibleMinutes: 0, earlyLeaveMinutes: 0, shortfallMinutes: 0, ...custom })
/** قيود البدل الثابت في الدفتر (كل الحالات) للموظفين. */
const recurringCredits = employeeIds => query(`SELECT [id], [employeeId], [type], [category], [label], [sourceRef], CONVERT(varchar(40), [amount]) AS [amount], [status],
    [targetPeriod], [reservedPayrollRunId], [appliedPayrollRunId]
  FROM [employee_obligations] WHERE [sourceRef] LIKE N'recurring-allowance:%' AND [employeeId] IN (${employeeIds.map(Number).join(', ')}) ORDER BY [id]`)
const calc = async (period, emps, name) => expectStatus(await request(users.admin, 'POST', '/payroll/runs/calculate-defined', { period, scopeType: 'CUSTOM',
  employeeIds: emps.map(emp => emp.id), name: `${name} ${crypto.randomUUID().slice(0, 6)}` }), 201)
const recalc = async (run, emps, reason) => expectStatus(await request(users.admin, 'POST', '/payroll/runs/calculate-defined', { runId: run.id, period: run.period,
  scopeType: 'CUSTOM', employeeIds: emps.map(emp => emp.id), reason }), 201)
// فصل المهام: اللي احتسب المسير (admin) غير اللي بيعتمد ويصرف (approver)
const approve = run => request(users.approver, 'POST', `/payroll/runs/${run.id}/approve`)
const pay = run => request(users.approver, 'POST', `/payroll/runs/${run.id}/pay`, { channel: 'BANK_TRANSFER', reference: `RCA-${run.id}` })
const listOf = async (user, period) => expectStatus(await request(user, 'GET', `/payroll/allowances/recurring?period=${period}`), 200)
const rowOf = (list, emp, typeId = types.pressure.id) => { const row = list.rows.find(entry => entry.employeeId === emp.id && entry.allowanceTypeId === typeId); assert.ok(row, `مفيش صف لـ${emp.employeeCode}`); return row }
const stop = (user, id, body) => request(user, 'POST', `/payroll/allowances/recurring/${id}/stop`, body)
const sorted = list => [...list].sort((a, b) => a - b)

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
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  pool = await new sql.ConnectionPool(connection(database)).connect()
  fs.mkdirSync(path.join(migrationsBase, 'payroll'), { recursive: true })
  fs.copyFileSync(path.join(MIGRATIONS, FILE), path.join(migrationsBase, 'payroll', FILE))
  await app.get(require('../src/settings/config-defaults.service').ConfigDefaultsService).onApplicationBootstrap()
  for (const [key, value] of [['payroll.cycle_start_day', '1'], ['payroll.monthly_days', '30'], ['payroll.daily_hours', '8'],
    ['payroll.salary_evidence_mode', 'MONTHLY_HISTORY_OR_CURRENT_FILE'], ['payroll.late_deduction_enabled', 'true'],
    ['payroll.shortfall_enabled', 'true'], ['payroll.shortfall_mode', 'MINUTES'], ['payroll.shortfall_value', '1'], ['attendance.absence_penalty_days', '1'],
    // سقف الخصم 5% من الراتب المستحق (للإثبات إنه على الراتب من غير البدل)، ومن غير أرضية صافي
    ['payroll.policy.max_deduction_pct_of_gross', '5'], ['payroll.policy.min_net_guarantee', 'null'], ['payroll.policy.net_floor_pct', 'null'],
    ['loan.insufficient_net_behavior', 'PARTIAL_THEN_CARRY']]) await setConfig(key, value)
  assert.equal((await repo('RequestsConfig').findOneByOrFail({ key: 'payroll.approval_self_approval_allowed' })).value, 'false')

  org.branchA = await repo('Branch').save({ code: 'RCA_A', name: 'فرع البدل الثابت أ' })
  org.branchB = await repo('Branch').save({ code: 'RCA_B', name: 'فرع البدل الثابت ب' })
  org.deptA = await repo('Department').save({ name: 'قسم المشروع', branchId: org.branchA.id })
  org.deptB = await repo('Department').save({ name: 'قسم فرع ب', branchId: org.branchB.id })
  const user = (label, role, extra = {}) => repo('User').save({ email: `${label}@recurring-allowances.invalid`, displayName: label, passwordHash: 'test-only',
    role, permissions: '[]', ...extra })
  users.admin = await user('admin', 'super_admin', { permissions: '["*"]' })
  users.approver = await user('approver', 'super_admin', { permissions: '["*"]' })
  users.branchB = await user('branch-b', 'hr', { branchId: org.branchB.id, permissions: '["payroll.view","payroll.calculate"]' })
  users.viewer = await user('viewer-a', 'hr', { branchId: org.branchA.id, permissions: '["payroll.view"]' })

  people.e1 = await employee()                                 // 6000 + بدل 1000، عليه كل المؤثرات في يناير
  people.e2 = await employee({ joinDate: '2027-01-22' })       // منضم 22 يناير = 10 أيام من دورة 31 يوم
  people.e3 = await employee({ joinDate: '2027-02-10' })       // مش في الخدمة في يناير خالص
  people.e4 = await employee({ basicSalary: 1000 })            // مساحة الخصم: بدل ثابت 500 + خصم 1200 + قسط سلفة
  people.e5 = await employee({ basicSalary: 1000 })            // المقارنة: بدل شهر واحد 500 + خصم 1200 (السلوك القائم)
  people.control = await employee()                            // نفس راتب e1 ونفس تعيينه من غير بدل (نهاية الخدمة)
  people.b1 = await employee({ branchId: org.branchB.id, departmentId: org.deptB.id, basicSalary: 4000 })

  // مؤثرات يناير على e1: غياب يوم، تأخير ساعة، نقص نص ساعة، إجازة بدون راتب يوم، إضافي ساعتين معتمد (سجل قديم بلا لقطة = سعر ساعة المسير)
  const { e1 } = people
  await repo('AttendanceDay').save([
    attendanceDay(e1, '2027-01-11', { status: 'absent', checkIn: null, checkOut: null, workMinutes: 0 }),
    attendanceDay(e1, '2027-01-12', { status: 'late', checkIn: '09:00', lateMinutes: 60, workMinutes: 420 }),
    attendanceDay(e1, '2027-01-13', { checkOut: '15:30', workMinutes: 450, shortfallMinutes: 30 }),
  ])
  await repo('Leave').save({ employeeId: e1.id, leaveTypeCode: 'UNPAID', fromDate: '2027-01-20', toDate: '2027-01-20', days: 1, period: 'FULL', isUnpaid: true, status: 'APPROVED' })
  await repo('OvertimeEntry').save({ employeeId: e1.id, date: '2027-01-05', source: 'BIOMETRIC_DETECTED', status: 'APPROVED', hoursActual: 2, hoursRequested: 2,
    payableHours: 2, rate: 1.5 })
  // خصم مصنف «يوم من الراتب» بنوعه ودورته — الموارد البشرية بتعتمده لحظتها
  types.penalty = expectStatus(await request(users.admin, 'POST', '/deductions/types', { code: 'RCA_DAYS', nameAr: 'جزاء بالأيام', category: 'DISCIPLINARY',
    calcMethod: 'DAYS_OF_SALARY', creatorScopes: ['HR'], approvalSteps: ['HR'], escalationDays: null }), 201)
  const typed = expectStatus(await request(users.admin, 'POST', '/deductions', { deductionTypeId: types.penalty.id, inputValue: '1',
    incidentDate: new Date(Date.now() - 3 * 86400000).toLocaleDateString('en-CA'), reason: 'تأخير متكرر في تسليم مرحلة المشروع حسب محضر الإدارة',
    employeeId: e1.id, targetPeriod: JAN }), 201)
  assert.equal(typed.status, 'APPROVED')
  assert.deepEqual(typed.obligations.map(row => [row.type, row.amount, row.targetPeriod]), [['DEBIT', '200.00', JAN]], 'يوم من راتب 6000 = 200 (مش 233.33)')
  types.pressure = expectStatus(await request(users.admin, 'POST', '/payroll/allowances/types', { name: 'بدل ضغط عمل', code: 'WORK_PRESSURE' }), 201)
}, { timeout: 300000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (e) { errors.push(e) }
  try { if (pool) await pool.close() } catch (e) { errors.push(e) }
  try {
    if (created && master) {
      assertDisposable()
      await master.request().query(`IF DB_ID(N'${database}') IS NOT NULL BEGIN ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]; END`)
      assert.equal((await master.request().input('db', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @db')).recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} removed.`)
    }
  } catch (e) { errors.push(e) }
  try { if (master) await master.close() } catch (e) { errors.push(e) }
  for (const dir of [migrationsBase, uploads]) {
    try {
      assert.equal(path.dirname(path.resolve(dir)), os.tmpdir()); assert.match(path.basename(dir), /^hr-payroll-recurring-(migrations|files)-/)
      fs.rmSync(dir, { recursive: true, force: true })
    } catch (e) { errors.push(e) }
  }
  if (errors.length) throw new AggregateError(errors, 'payroll recurring allowances fixture cleanup failed')
})

test('ترحيل 071 عبر المُرحّل الحقيقي: جدول payroll_recurring_allowances بأسماء قيود TypeORM، فرق المخطط صفر، إعادة التشغيل آمنة، والشكل الغلط يوقف التحقق بكوده', async () => {
  const content = fs.readFileSync(path.join(MIGRATIONS, FILE), 'utf8')
  assert.notEqual(content.charCodeAt(0), 0xFEFF, 'بلا BOM')
  assert.deepEqual(migrate.forbiddenStatements(content), [])
  assert.deepEqual(migrate.throwCodes(content), [71001, 71002, 71003, 71004, 71005])
  assert.doesNotMatch(migrate.stripComments(content), /\b(UPDATE|DELETE|DROP|TRUNCATE|MERGE)\b/i, 'إضافي فقط: بلا تعبئة ولا حذف')
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات')
  // synchronize عمل الجدول (فاضي لسه): نشيله ونسيب الترحيل يعمله
  assert.equal((await query(`SELECT COUNT(*) AS n FROM dbo.${TABLE}`))[0].n, 0)
  await pool.request().batch(`DROP TABLE dbo.${TABLE};`)

  const record = await migrate.apply({ database, base: migrationsBase, trial: true, schemaDiff: false, quiet: true })
  assert.equal(record.mode, 'disposable')
  assert.equal(record.failed, undefined, JSON.stringify(record.failed))
  assert.equal(record.trial?.passed, true)
  assert.deepEqual(record.applied.map(item => path.basename(item.file)), [FILE])
  assert.equal(record.ledgerComplete, true)
  assert.deepEqual(record.columns.removedOrRenamed, [])
  assert.deepEqual(record.columns.added.filter(column => !column.startsWith('app_schema_migrations.')).sort(), COLUMNS.map(column => `${TABLE}.${column}`).sort())
  assert.deepEqual(record.rowCounts.differences.filter(d => d.table !== 'app_schema_migrations'), [{ table: TABLE, before: null, after: 0, kind: 'new-table' }])
  // فرق مخطط TypeORM للجدول صفر: أسماء المفتاح والفهارس والقيم الافتراضية والأنواع مطابقة للكيان بالحرف
  const { upQueries } = await ds.driver.createSchemaBuilder().log()
  assert.deepEqual(upQueries.map(q => q.query).filter(q => q.includes(TABLE)), [])
  const constraints = (await query(`SELECT name FROM sys.objects WHERE parent_object_id = OBJECT_ID(N'dbo.${TABLE}') AND type IN ('PK', 'D') ORDER BY name`)).map(row => row.name)
  assert.deepEqual(constraints, ['DF_225c8c1cc8f767d1a3ca0e70ee5', 'DF_6e085202ba7cdf7f78663abf7c2', 'PK_payroll_recurring_allowances'])

  // إعادة المُرحّل: مفيش ملف معلق. ونص الترحيل نفسه مرتين برّه الدفتر: آمن للتكرار
  const replay = await migrate.apply({ database, base: migrationsBase, schemaDiff: false, quiet: true })
  assert.deepEqual(replay.pendingBefore, []); assert.deepEqual(replay.applied, []); assert.equal(replay.ledgerComplete, true)
  for (let round = 0; round < 2; round++) for (const batch of migrate.splitBatches(content)) await pool.request().batch(batch)
  // عمود بنوع غلط أو فهرس ناقص يوقف التحقق بكوده ومايسيبش أثر
  for (const [ddl, code] of [[`ALTER TABLE dbo.${TABLE} ALTER COLUMN amount decimal(18,4) NOT NULL`, 71005],
    [`EXEC sp_rename N'dbo.${TABLE}.IX_payroll_recurring_allowances_type', N'IX_payroll_recurring_allowances_other', N'INDEX'`, 71003],
    [`ALTER TABLE dbo.${TABLE} ALTER COLUMN untilPeriod nvarchar(7) NOT NULL`, 71005]]) {
    const tx = new sql.Transaction(pool)
    await tx.begin()
    try {
      await new sql.Request(tx).batch(ddl)
      await assert.rejects(new sql.Request(tx).batch(migrate.splitBatches(content).at(-1)), error => { assert.equal(error.number, code, error.message); return true })
    } finally { try { await tx.rollback() } catch { /* أُجهضت من الخادم */ } }
  }
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query).filter(q => q.includes(TABLE)), [])
})

test('إسناد «بدل ضغط عمل» ثابت: موظفين بالاسم من شهر، والتكرار في شهور متقاطعة بيتخطّى، والتحقق، وعزل الفروع والصلاحيات، والشهر المتوقع قبل الحساب', async () => {
  const { e1, e2, e3, e4, b1 } = people
  const body = { allowanceTypeId: types.pressure.id, amount: '1000', targetLevel: 'employees', branchId: org.branchA.id, employeeIds: [e1.id, e2.id, e3.id],
    fromPeriod: JAN, untilPeriod: null, reason: REASON }
  const post = (user, overrides = {}) => request(user, 'POST', '/payroll/allowances/recurring', { ...body, ...overrides })
  // تحقق: النهاية قبل البداية، مبلغ بثلاث منازل، شهر غلط، سبب فاضي
  expectStatus(await post(users.admin, { untilPeriod: '2026-12' }), 400)
  expectStatus(await post(users.admin, { amount: '10.555' }), 400)
  expectStatus(await post(users.admin, { fromPeriod: '2027-13' }), 400)
  expectStatus(await post(users.admin, { reason: '   ' }), 400)
  // صلاحية العرض بس ما تسندش، وحساب فرع ب ما يسندش لفرع أ ولا للشركة كلها
  expectStatus(await post(users.viewer), 403)
  expectStatus(await post(users.branchB), 403)
  expectStatus(await post(users.branchB, { targetLevel: 'company', branchId: null, employeeIds: [] }), 403)
  assert.equal(await repo('PayrollRecurringAllowance').count(), 0)

  const created = expectStatus(await post(users.admin), 201)
  assert.deepEqual([created.created, created.skippedDuplicates, created.amount, created.monthlyTotal, created.fromPeriod, created.untilPeriod], [3, 0, 1000, 3000, JAN, null])
  assert.deepEqual(created.recalculateRuns, [], 'مفيش مسير مفتوح لسه')
  // نفس البدل لنفس الموظفين في شهور متقاطعة مرفوض، ومع موظف جديد القديم بيتخطّى
  expectStatus(await post(users.admin, { fromPeriod: '2027-06', untilPeriod: '2027-08' }), 400)
  const second = expectStatus(await post(users.admin, { amount: '500', employeeIds: [e3.id, e4.id] }), 201)
  assert.deepEqual([second.created, second.skippedDuplicates], [1, 1])
  const rows = await repo('PayrollRecurringAllowance').find({ order: { id: 'ASC' } })
  assert.deepEqual(rows.map(row => [row.employeeId, Number(row.amount), row.fromPeriod, row.untilPeriod, row.status, row.typeName, row.targetLevel, row.branchId]), [
    [e1.id, 1000, JAN, null, 'ACTIVE', 'بدل ضغط عمل', 'employees', org.branchA.id], [e2.id, 1000, JAN, null, 'ACTIVE', 'بدل ضغط عمل', 'employees', org.branchA.id],
    [e3.id, 1000, JAN, null, 'ACTIVE', 'بدل ضغط عمل', 'employees', org.branchA.id], [e4.id, 500, JAN, null, 'ACTIVE', 'بدل ضغط عمل', 'employees', org.branchA.id]])
  for (const row of rows) assigned[row.employeeId] = row
  assert.deepEqual(await recurringCredits([e1.id, e2.id, e3.id, e4.id]), [], 'ولا قيد في الدفتر لسه: القيد بيتعمل وقت حساب مسير الشهر')

  // حساب فرع ب: يسند لموظف فرعه (بنوع الشركة)، ويشوف فرعه بس، وإسناد فرع أ عنده «مش موجود»
  expectStatus(await post(users.branchB, { amount: '300', branchId: org.branchB.id, employeeIds: [b1.id] }), 201)
  assert.deepEqual((await listOf(users.branchB, JAN)).rows.map(row => row.employeeId), [b1.id])
  expectStatus(await stop(users.branchB, assigned[e1.id].id, { reason: 'محاولة من فرع تاني' }), 404)
  assert.equal((await repo('PayrollRecurringAllowance').findOneByOrFail({ id: assigned[e1.id].id })).status, 'ACTIVE')

  // مدير النظام يشوف الكل؛ الشهر قبل الحساب بمبلغه المتوقع: المنضم 22 يناير بنسبة 10 أيام، واللي بيبدأ فبراير مش في الخدمة
  const list = await listOf(users.admin, JAN)
  assert.deepEqual(sorted(list.rows.map(row => row.employeeId)), sorted([e1.id, e2.id, e3.id, e4.id, b1.id]))
  const month = emp => { const { state, amount } = rowOf(list, emp).month; return [state, amount] }
  assert.deepEqual([month(e1), month(e2), month(e3), month(e4)], [['PENDING', 1000], ['PENDING', 333.33], ['NOT_IN_SERVICE', 0], ['PENDING', 500]])
  assert.deepEqual(list.totals, { count: 4, employees: 4, amount: 2133.33 })
  assert.deepEqual([rowOf(list, e1).phase, rowOf(list, e1).canStop, rowOf(list, e1).defaultStopFrom, rowOf(list, e1).lastPeriod], ['ACTIVE', true, JAN, null])
})

test('مسير يناير: راتب 6000 + بدل ثابت 1000 — الإضافي وكل خصم وسقف الخصم على الراتب من غير البدل، والبدل كامل سطر باسمه، والصافي 6575 باليد', async () => {
  const { e1, e2, e3 } = people
  runs.jan = await calc(JAN, [e1, e2, e3], 'مسير يناير — بدل ضغط العمل')
  const item = itemOf(runs.jan, e1), bd = breakdownOf(item)
  // الأساس = الراتب لوحده: سعر اليوم 200 وسعر الساعة 25 (لو البدل جوه كانوا 233.33 و29.16)
  assert.deepEqual([bd.gross, bd.dayRate, bd.hourRate, bd.monthlyDays, bd.periodDays], [6000, 200, 25, 30, 31])
  assert.equal(money(item.basicSalary), 6000)
  assert.equal(money(item.overtimeAmount), 75, 'الإضافي ساعتين × 1.5 × 25 (مش 87.50)')
  assert.deepEqual(bd.overtime.map(row => [row.hourlyRate, row.amount]), [[25, 75]])
  assert.deepEqual([item.lateMinutes, money(item.latenessDeduction)], [60, 25], 'التأخير 60 دقيقة × 6000÷30÷8÷60 (مش 29.16)')
  assert.deepEqual([item.shortfallMinutes, money(item.shortfallDeduction)], [30, 12.5], 'النقص 30 دقيقة × نفس سعر الدقيقة (مش 14.58)')
  assert.deepEqual([item.absenceDays, money(item.absenceDeduction)], [1, 200], 'الغياب يوم × 200 (مش 233.33)')
  assert.deepEqual([Number(item.unpaidLeaveDays), money(item.unpaidLeaveDeduction)], [1, 200], 'الإجازة بدون راتب يوم × 200 (مش 233.33)')
  // سقف الخصم 5% من 6000 = 300 (مش 350 من 7000): الحضور 237.50 كامل، والخصم المصنف (200) ياخد الباقي 62.50 ويترحّل 137.50
  assert.equal(bd.netProtection.cap, '300.000000')
  assert.equal(bd.netProtection.balanceBeforeDeductions, '5875.00', '6000 + 75 إضافي − 200 إجازة بدون راتب — البدل مش جوه الرصيد')
  assert.equal(bd.netProtection.creditsOutsideBase, '1000.00')
  const debit = bd.obligationLines.filter(line => line.type === 'DEBIT')
  assert.deepEqual(debit.map(line => [line.amount, line.collected, line.carried, line.typed]), [[200, 62.5, 137.5, true]])
  assert.equal(money(item.otherDeductions), 62.5)
  // البدل: قيد CREDIT واحد بمرجعه الثابت ومبلغه كامل، سطر لوحده، ومش داخل أي أساس
  const [credit, ...extra] = await recurringCredits([e1.id])
  assert.deepEqual(extra, [])
  assert.deepEqual([credit.type, credit.category, credit.label, credit.amount, credit.status, credit.targetPeriod, credit.sourceRef],
    ['CREDIT', 'allowance', 'بدل ضغط عمل', '1000.00', 'PENDING', JAN, `recurring-allowance:${assigned[e1.id].id}:${JAN}`])
  assert.deepEqual(bd.obligationLines.filter(line => line.type === 'CREDIT').map(line => [line.id, line.amount, line.collected, line.carried]), [[credit.id, 1000, 1000, 0]])
  assert.deepEqual(bd.recurringAllowances.lines.map(line => [line.assignmentId, line.name, line.monthlyAmount, line.amount, line.prorated, line.obligationId, line.status]),
    [[assigned[e1.id].id, 'بدل ضغط عمل', 1000, 1000, false, credit.id, 'IN_RUN']])
  assert.equal(money(item.otherAdditions), 1000)
  // الصافي باليد: 6000 + 75 + 1000 − 25 − 12.50 − 200 − 200 − 62.50 = 6575
  assert.deepEqual([money(item.socialInsuranceDeduction), money(item.loanInstallments)], [0, 0])
  assert.equal(money(item.netPay), 6000 + 75 + 1000 - 25 - 12.5 - 200 - 200 - 62.5)
  assert.equal(money(item.netPay), 6575)
  // القسيمة وجدول المسير: البدل سطر باسمه في الاستحقاقات
  const payslip = expectStatus(await request(users.admin, 'GET', `/payroll/items/${item.id}`), 200)
  assert.deepEqual(payslip.lines.earnings.map(line => [line.key, line.amount]), [['BASIC', 6000], ['OVERTIME', 75], ['ALLOWANCE:بدل ضغط عمل', 1000]])
  assert.deepEqual([money(payslip.lines.totals.earnings), money(payslip.lines.totals.net)], [7075, 6575])
  const runLines = expectStatus(await request(users.admin, 'GET', `/payroll/runs/${runs.jan.id}/lines`), 200)
  assert.ok(runLines.columns.earnings.some(column => column.key === 'ALLOWANCE:بدل ضغط عمل' && column.name === 'بدل ضغط عمل'), JSON.stringify(runLines.columns.earnings))
  // كشف البنك: الصافي كله (بالبدل) تحويل
  const sheet = expectStatus(await request(users.admin, 'GET', `/payroll/runs/${runs.jan.id}/bank-sheet`), 200)
  assert.deepEqual(sheet.rows.filter(row => row.employeeId === e1.id).map(row => [row.netPay, row.bankAmount, row.cashAmount]), [[6575, 6575, 0]])

  // المنضم 22 يناير: 10 أيام = الراتب 2000 والبدل 1000 × 10 ÷ 30 = 333.33 (مقصوص) — نفس تناسب الراتب بالحرف
  const joiner = itemOf(runs.jan, e2), joinerBd = breakdownOf(joiner)
  assert.deepEqual([joinerBd.coverFrom, joinerBd.coverTo, joinerBd.coverDays], ['2027-01-22', '2027-01-31', 10])
  assert.equal(money(joiner.basicSalary), 2000)
  assert.deepEqual(joinerBd.recurringAllowances.lines.map(line => [line.monthlyAmount, line.amount, line.prorated, line.coverDays, line.status]), [[1000, 333.33, true, 10, 'IN_RUN']])
  assert.deepEqual([money(joiner.otherAdditions), money(joiner.netPay)], [333.33, 2333.33])
  // اللي بيبدأ شغله في فبراير: مش في الخدمة في يناير = لا بند ولا قيد
  assert.equal(runs.jan.items.some(row => row.employeeId === e3.id), false)
  assert.equal(runs.jan.members.find(row => row.employeeId === e3.id)?.membershipStatus, 'EXCLUDED')
  assert.deepEqual(await recurringCredits([e3.id]), [])
})

test('إعادة الحساب ما بتكررش: نفس القيدين بالحرف، والقائمة بتقول «محسوب في مسير لسه ما اتعتمدش»', async () => {
  const { e1, e2, e3 } = people
  const before = await recurringCredits([e1.id, e2.id])
  assert.equal(before.length, 2)
  runs.jan = await recalc(runs.jan, [e1, e2, e3], 'إعادة حساب يناير للتأكد إن البدل الثابت ما بيتكررش')
  assert.deepEqual(await recurringCredits([e1.id, e2.id]), before, 'لا قيد جديد ولا ملغى ولا مبلغ اتغير')
  assert.equal(money(itemOf(runs.jan, e1).netPay), 6575)
  assert.equal(money(itemOf(runs.jan, e2).otherAdditions), 333.33)
  const list = await listOf(users.admin, JAN)
  assert.deepEqual(['state', 'runId', 'amount'].map(key => rowOf(list, e1).month[key]), ['IN_RUN', runs.jan.id, 1000])
  assert.deepEqual(['state', 'amount'].map(key => rowOf(list, e2).month[key]), ['IN_RUN', 333.33])
})

test('اعتماد ← صرف ← فبراير بياخده تاني؛ الإيقاف بيشيل الشهور اللي ما اتعتمدتش بس، والاعتماد بيرفض مسير اتحسب قبل الإيقاف لحد إعادة حسابه', async () => {
  const { e1, e2, e3 } = people
  expectStatus(await approve(runs.jan), 201)
  assert.equal(rowOf(await listOf(users.admin, JAN), e1).month.state, 'APPROVED')
  // يناير في مسير معتمد: الإيقاف منه مرفوض
  expectStatus(await stop(users.admin, assigned[e1.id].id, { reason: 'تجربة إيقاف شهر معتمد', fromPeriod: JAN }), 400)
  expectStatus(await pay(runs.jan), 201)
  assert.deepEqual((await recurringCredits([e1.id, e2.id])).map(row => [row.status, row.appliedPayrollRunId]), [['APPLIED', runs.jan.id], ['APPLIED', runs.jan.id]])
  const janList = await listOf(users.admin, JAN)
  assert.deepEqual([rowOf(janList, e1).month.state, rowOf(janList, e1).paidMonths], ['PAID', [JAN]])
  // التقرير المالي: البدل في «بدلات إضافية» سطر باسمه، والصافي زي المسير
  const register = expectStatus(await request(users.admin, 'GET', `/reports/financial/payroll-register?period=${JAN}`), 200)
  const e1Row = register.rows.find(row => row.employeeId === e1.id)
  assert.equal(Number(e1Row.additions.allowance), 1000)
  assert.ok(e1Row.lines.some(line => line.type === 'CREDIT' && line.key === 'allowance' && line.label === 'بدل ضغط عمل' && Number(line.amount) === 1000))
  assert.equal(Number(e1Row.net), 6575)

  // فبراير: قيد جديد لشهره (يناير المصروف ما بيترحّلش)، والشهر كامل = المبلغ كامل، واللي انضم 10 فبراير بنسبة 19 يوم
  runs.feb = await calc(FEB, [e1, e2, e3], 'مسير فبراير — بدل ضغط العمل')
  const febCredits = (await recurringCredits([e1.id, e2.id, e3.id])).filter(row => row.targetPeriod === FEB).sort((a, b) => a.employeeId - b.employeeId)
  assert.deepEqual(febCredits.map(row => [row.employeeId, row.amount, row.status]), [[e1.id, '1000.00', 'PENDING'], [e2.id, '1000.00', 'PENDING'], [e3.id, '633.33', 'PENDING']])
  assert.equal(money(itemOf(runs.feb, e1).otherAdditions), 1000)
  assert.equal(money(itemOf(runs.feb, e2).otherAdditions), 1000, 'فبراير 28 يوم كامل = المبلغ كامل')
  assert.deepEqual(breakdownOf(itemOf(runs.feb, e3)).recurringAllowances.lines.map(line => [line.coverDays, line.amount, line.prorated]), [[19, 633.33, true]])

  // إيقاف بدل e1: السبب إجباري؛ الافتراضي من أول شهر لسه ما اتعتمدش (فبراير) — قيد فبراير يتشال ويناير المصروف زي ما هو
  expectStatus(await stop(users.admin, assigned[e1.id].id, { reason: '' }), 400)
  const stopped = expectStatus(await stop(users.admin, assigned[e1.id].id, { reason: 'انتهى ضغط العمل في المشروع' }), 201)
  assert.deepEqual([stopped.status, stopped.stoppedFromPeriod, stopped.cancelledMonths], ['STOPPED', FEB, [FEB]])
  assert.deepEqual(stopped.recalculateRuns.map(run => [run.id, run.period]), [[runs.feb.id, FEB]])
  assert.deepEqual((await recurringCredits([e1.id])).map(row => [row.targetPeriod, row.status]), [[JAN, 'APPLIED'], [FEB, 'CANCELLED']])
  expectStatus(await stop(users.admin, assigned[e1.id].id, { reason: 'مرة تانية' }), 400)
  // المسير المحسوب قبل الإيقاف ما يتعتمدش لحد ما يتعاد حسابه
  expectStatus(await approve(runs.feb), 409, 'PAYRUN-RECURRING-ALLOWANCE-CHANGED')
  runs.feb = await recalc(runs.feb, [e1, e2, e3], 'إعادة الحساب بعد إيقاف بدل ضغط العمل')
  const febE1 = itemOf(runs.feb, e1)
  assert.equal(money(febE1.otherAdditions), 0, 'الموقوف ما بياخدش فبراير')
  assert.equal(breakdownOf(febE1).recurringAllowances, undefined)
  // باقي الشهر عادي: الخصم المصنف المرحّل من يناير (137.50) بيتحصّل، من غير بدل
  assert.deepEqual([money(febE1.otherDeductions), money(febE1.netPay)], [137.5, 5862.5])
  assert.deepEqual((await recurringCredits([e1.id])).map(row => [row.targetPeriod, row.status]), [[JAN, 'APPLIED'], [FEB, 'CANCELLED']], 'ولا قيد جديد لفبراير')
  expectStatus(await approve(runs.feb), 201)
  expectStatus(await pay(runs.feb), 201)
  // يناير المصروف ما اتغيرش
  const janDetail = expectStatus(await request(users.admin, 'GET', `/payroll/runs/${runs.jan.id}`), 200)
  assert.deepEqual([money(itemOf(janDetail, e1).otherAdditions), money(itemOf(janDetail, e1).netPay)], [1000, 6575])
  const febList = await listOf(users.admin, FEB)
  const e1Row2 = rowOf(febList, e1)
  assert.deepEqual([e1Row2.status, e1Row2.phase, e1Row2.stoppedFromPeriod, e1Row2.stopReason, e1Row2.paidMonths, e1Row2.coversPeriod, e1Row2.canStop, e1Row2.lastPeriod],
    ['STOPPED', 'STOPPED', FEB, 'انتهى ضغط العمل في المشروع', [JAN], false, false, JAN])
  assert.deepEqual(rowOf(febList, e2).paidMonths, [JAN, FEB])
  assert.deepEqual(['state', 'amount'].map(key => rowOf(febList, e3).month[key]), ['PAID', 633.33])
})

test('بدل ثابت اتضاف بعد حساب المسير: الرد بيقول أعد حساب مين والاعتماد بيرفض لحد إعادة الحساب؛ الإيقاف من شهر جاي؛ وإلغاء مسير ما بيسيبش قيد يتيم', async () => {
  const { e2, e3 } = people
  runs.mar = await calc(MAR, [e2, e3], 'مسير مارس — بدل ضغط العمل')
  // قيد شهر لسه ما اتعتمدش ما يدخلش مسير شهر تاني (بيتصرف مع راتب شهره بس): مسودة أبريل لـe3 ومارس لسه محسوب = بدل أبريل لوحده
  const early = await calc(APR, [e3], 'مسير أبريل مبكر')
  assert.deepEqual(breakdownOf(itemOf(early, e3)).obligationLines.filter(line => line.type === 'CREDIT').map(line => line.amount), [1000])
  assert.equal(money(itemOf(early, e3).otherAdditions), 1000, 'مش 2000 (مارس + أبريل)')
  const cancelledEarly = await request(users.admin, 'POST', `/payroll/runs/${early.id}/cancel`, { reason: 'مسودة أبريل المبكرة اتعملت للتجربة بس' })
  assert.ok([200, 201].includes(cancelledEarly.status), JSON.stringify(cancelledEarly.body).slice(0, 500))
  assert.deepEqual((await recurringCredits([e3.id])).filter(row => [MAR, APR].includes(row.targetPeriod)).map(row => [row.targetPeriod, row.status]),
    [[MAR, 'PENDING'], [APR, 'CANCELLED']], 'إلغاء مسودة أبريل شال قيد أبريل بس، وقيد مارس فاضل مع مسيره')
  types.housing = expectStatus(await request(users.admin, 'POST', '/payroll/allowances/types', { name: 'بدل سكن ثابت' }), 201)
  const housingBody = { allowanceTypeId: types.housing.id, amount: '250.75', targetLevel: 'employees', branchId: org.branchA.id, employeeIds: [e2.id],
    fromPeriod: MAR, untilPeriod: APR, reason: 'بدل سكن مؤقت لشهرين' }
  // شهور مسيرها اتصرف للموظف (يناير وفبراير) ما بتتغيرش: الإسناد منها مرفوض برسالة بتقول يبدأ من إمتى
  const locked = await request(users.admin, 'POST', '/payroll/allowances/recurring', { ...housingBody, fromPeriod: JAN })
  assert.equal(locked.status, 400, JSON.stringify(locked.body))
  assert.match(String(locked.body.message), /مسير 2027-02 معتمد أو اتصرف لـموظف من المختارين — ابدأ البدل من 2027-03/)
  assert.equal(await repo('PayrollRecurringAllowance').countBy({ allowanceTypeId: types.housing.id }), 0)
  const late = expectStatus(await request(users.admin, 'POST', '/payroll/allowances/recurring', housingBody), 201)
  assert.deepEqual(late.recalculateRuns.map(run => [run.id, run.period]), [[runs.mar.id, MAR]])
  const marList = await listOf(users.admin, MAR)
  const housing = rowOf(marList, e2, types.housing.id)
  assert.deepEqual([housing.month.state, housing.month.runId, housing.lastPeriod], ['NEEDS_RECALC', runs.mar.id, APR])
  expectStatus(await approve(runs.mar), 409, 'PAYRUN-RECURRING-ALLOWANCE-CHANGED')
  runs.mar = await recalc(runs.mar, [e2, e3], 'إعادة الحساب بعد إضافة بدل السكن الثابت')
  const marE2 = itemOf(runs.mar, e2)
  assert.deepEqual(breakdownOf(marE2).recurringAllowances.lines.map(line => [line.name, line.amount]).sort(), [['بدل سكن ثابت', 250.75], ['بدل ضغط عمل', 1000]].sort())
  assert.equal(money(marE2.otherAdditions), 1250.75)
  const payslip = expectStatus(await request(users.admin, 'GET', `/payroll/items/${marE2.id}`), 200)
  assert.deepEqual(payslip.lines.earnings.filter(line => line.key.startsWith('ALLOWANCE:')).map(line => [line.name, line.amount]).sort(), [['بدل سكن ثابت', 250.75], ['بدل ضغط عمل', 1000]].sort(),
    'كل بدل ثابت سطر باسمه')
  expectStatus(await approve(runs.mar), 201)
  // إيقاف بدل السكن من أبريل (شهر لسه جاي): مارس المعتمد ما يتغيرش، ومفيش شهر يتشال
  const stopHousing = expectStatus(await stop(users.admin, housing.id, { reason: 'رجع للسكن الأصلي', fromPeriod: APR }), 201)
  assert.deepEqual([stopHousing.stoppedFromPeriod, stopHousing.cancelledMonths, stopHousing.recalculateRuns], [APR, [], []])
  assert.equal(money(itemOf(expectStatus(await request(users.admin, 'GET', `/payroll/runs/${runs.mar.id}`), 200), e2).otherAdditions), 1250.75)

  // إلغاء مسير مفتوح: قيد شهره المُدار يتلغي (ما يفضلش قيد يتيم مستني في الدفتر)، والمسير الجديد لنفس الشهر بيعمل قيد جديد
  runs.aprilDraft = await calc(APR, [e2], 'مسير أبريل — للإلغاء')
  const aprilBefore = (await recurringCredits([e2.id])).filter(row => row.targetPeriod === APR)
  assert.deepEqual(aprilBefore.map(row => [row.label, row.amount, row.status]), [['بدل ضغط عمل', '1000.00', 'PENDING']], 'بدل السكن موقوف من أبريل')
  const cancelled = await request(users.admin, 'POST', `/payroll/runs/${runs.aprilDraft.id}/cancel`, { reason: 'مسير أبريل اتعمل بالغلط قبل ميعاده' })
  assert.ok([200, 201].includes(cancelled.status), JSON.stringify(cancelled.body).slice(0, 500))
  assert.deepEqual((await recurringCredits([e2.id])).filter(row => row.targetPeriod === APR).map(row => [row.id, row.status]), [[aprilBefore[0].id, 'CANCELLED']])
  const redo = await calc(APR, [e2], 'مسير أبريل')
  const aprilAfter = (await recurringCredits([e2.id])).filter(row => row.targetPeriod === APR && row.status !== 'CANCELLED')
  assert.equal(aprilAfter.length, 1)
  assert.notEqual(aprilAfter[0].id, aprilBefore[0].id)
  assert.equal(money(itemOf(redo, e2).otherAdditions), 1000)
})

test('نهاية الخدمة على الراتب من غير البدل الثابت: نفس الراتب ونفس التعيين = نفس المكافأة', async () => {
  const eosOf = async emp => {
    const preview = expectStatus(await request(users.admin, 'GET', `/offboarding/preview?employeeId=${emp.id}&reason=termination&lastWorkingDay=2027-01-31`), 200)
    const line = (preview.lines ?? []).find(row => String(row.label).startsWith('مكافأة نهاية الخدمة'))
    assert.ok(line, JSON.stringify(preview).slice(0, 800))
    return Number(line.amount)
  }
  const withAllowance = await eosOf(people.e1), control = await eosOf(people.control)
  assert.ok(withAllowance > 0)
  assert.equal(withAllowance, control, 'البدل الثابت (اللي اتصرف في يناير) مش داخل أجر مكافأة نهاية الخدمة')
})

test('مساحة الخصم والأقساط: خصم أكبر من الراتب ما بياكلش البدل الثابت (بيتصرف كامل)، وبدل الشهر الواحد جوه المساحة زي ما كان', async () => {
  const { e4, e5 } = people
  // من غير سقف ولا أرضية: الخصم بياخد لحد الراتب
  await setConfig('payroll.policy.max_deduction_pct_of_gross', 'null')
  for (const emp of [e4, e5]) {
    await repo('EmployeeObligation').save({ employeeId: emp.id, type: 'DEBIT', category: 'custody_shortfall', amount: 1200, label: 'قيمة عهدة مفقودة (اختبار)',
      status: 'PENDING', effectiveDate: '2027-01-01', targetPeriod: JAN, sourceRef: `asset:rca-${emp.id}` })
  }
  // قسط سلفة مستحق على e4: خطة الأقساط على الصافي من غير البدل، والاعتماد لازم يطابقها
  const loan = await repo('Loan').save({ employeeId: e4.id, amount: 300, status: 'DISBURSED', disbursedAt: new Date('2026-12-01T08:00:00Z') })
  await repo('LoanInstallment').save({ loanId: loan.id, dueDate: '2027-01-10', amount: 300, paid: false })
  const grant = expectStatus(await request(users.admin, 'POST', '/payroll/allowances/grants', { period: JAN, allowanceTypeId: types.pressure.id, amount: '500',
    targetLevel: 'employees', branchId: org.branchA.id, employeeIds: [e5.id], reason: 'بدل شهر واحد للمقارنة' }), 201)
  assert.equal(grant.created, 1)
  const run = await calc(JAN, [e4, e5], 'مسير يناير — مساحة الخصم')
  const fixed = itemOf(run, e4), oneMonth = itemOf(run, e5)
  // البدل الثابت برّه المساحة: الخصم ياخد الراتب كله (1000) ويترحّل 200، والقسط ما لقاش مساحة، والصافي = البدل كامل
  assert.deepEqual([money(fixed.otherAdditions), money(fixed.otherDeductions), money(fixed.loanInstallments), money(fixed.netPay)], [500, 1000, 0, 500])
  const fixedBd = breakdownOf(fixed)
  assert.deepEqual(fixedBd.obligationLines.filter(line => line.type === 'DEBIT').map(line => [line.collected, line.carried]), [[1000, 200]])
  assert.deepEqual([fixedBd.netProtection.creditsOutsideBase, fixedBd.netProtection.balanceBeforeDeductions], ['500.00', '1000.00'])
  assert.ok(fixedBd.installmentPlan, 'في خطة أقساط للشهر')
  assert.equal(fixedBd.installmentPlan.context.netBeforeLoans, '0.00', 'الأقساط على الصافي من غير البدل')
  // بدل الشهر الواحد (السلوك القائم — ما اتغيرش): جوه المساحة فالخصم بياخد منه
  assert.deepEqual([money(oneMonth.otherAdditions), money(oneMonth.otherDeductions), money(oneMonth.netPay)], [500, 1200, 300])
  assert.equal(breakdownOf(oneMonth).netProtection.creditsOutsideBase, undefined)
  // الاعتماد بيطابق خطة الأقساط على الصافي من غير البدل الثابت (مفيش «لا تطابق خطة الأقساط المحفوظة»)
  expectStatus(await approve(run), 201)
  expectStatus(await pay(run), 201)
  assert.deepEqual((await recurringCredits([e4.id])).map(row => [row.targetPeriod, row.status, row.appliedPayrollRunId]), [[JAN, 'APPLIED', run.id]])
})
