'use strict'
// ترحيل B2.10 (20261006_095) على قاعدة مؤقتة عشوائية بتتمسح في الآخر (hr_employment_periods_migration_test_<16 hex> — لا مساس بقاعدة الشركة):
//  EPM-1) فحص نصي: من غير BOM، وLF في المستودع، ومفيش عبارة ممنوعة، وأكواد THROW فريدة، ومتوافق مع SQL Server 2019، وقاعدة synchronize
//         بنفس الشكل (الأعمدة والفهارس) وفرقها صفر.
//  EPM-2) من غير الجدول: ملف الموظف والإرجاع القديم شغالين، والفترات «مش متاحة» من غير خطأ، و«إعادة تعيين» مرفوضة برسالة الترحيل، وإرجاع رصيد
//         إجازة شغال؛ وجدول أو فهرس قديم بنفس الاسم وبشكل تاني (عمود بنوع أو طول أو إلزام غلط، أو بافتراضي، أو عمود زيادة، مفتاح باسم تاني،
//         فهرس على عمود تاني أو مش فريد أو بترتيب معكوس) = الترحيل بيقف قبل أي تغيير؛ والمُرحّل (بروفة ثم تطبيق) بيعمل الجدول بنفس الشكل
//         والفرق صفر، وبعده — من غير إعادة تشغيل ولا مهلة — «إعادة تعيين» بتشتغل.
//  EPM-3) آمن للتكرار.
// Run (من api/): node --test test/employment-periods-migration.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_employment_periods_migration_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_employment_periods_migration_test_[a-f0-9]{16}$/
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-employment-periods-migrations-'))
const MIGRATIONS = path.join(apiRoot, '..', 'docs/migrations/payroll')
const FILE = '20261006_095_employment_periods.sql'
const TABLE = 'employment_periods'
let app, ds, master, pool, service, rules, created = false
const made = {}

function assertDisposable() {
  assert.match(database, migrate.DISPOSABLE_DATABASE); assert.match(database, NAME)
  assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system')
  if (ds) assert.equal(ds.options.database, database)
}
const content = file => fs.readFileSync(path.join(MIGRATIONS, file), 'utf8').replace(/\r\n/g, '\n')
const runFile = async file => { for (const batch of migrate.splitBatches(content(file))) await pool.request().batch(batch) }
const shape = async () => ({
  columns: (await ds.query(`SELECT c.name AS columnName, t.name AS type, c.max_length AS maxLength, c.is_nullable AS nullable, c.is_identity AS isIdentity, c.default_object_id AS defaultId
    FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id WHERE c.object_id = OBJECT_ID(@0) ORDER BY c.column_id`, [`dbo.${TABLE}`]))
    .map(row => [row.columnName, row.type, row.maxLength, row.nullable, row.isIdentity, row.defaultId]),
  indexes: (await ds.query(`SELECT i.name, i.is_unique AS isUnique, i.has_filter AS hasFilter,
      STUFF((SELECT ',' + c.name FROM sys.index_columns ic JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
        WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id ORDER BY ic.key_ordinal FOR XML PATH('')), 1, 1, '') AS [columns]
    FROM sys.indexes i WHERE i.object_id = OBJECT_ID(@0) AND i.name IS NOT NULL ORDER BY i.name`, [`dbo.${TABLE}`]))
    .map(row => [row.name, row.columns, row.isUnique, row.hasFilter]),
})
const dropTable = () => pool.request().batch(`IF OBJECT_ID(N'dbo.${TABLE}', N'U') IS NOT NULL DROP TABLE dbo.${TABLE};`)
let number = 0
// موظف خدمته انتهت بملف إنهاء مقفول (أو من غير ملف)
async function ended(caseStatus) {
  const emp = await ds.getRepository('Employee').save({ employeeCode: `EPM${String(++number).padStart(3, '0')}`, fullName: `موظف ترحيل الفترات ${number}`, branchId: made.branch.id,
    joinDate: '2020-01-01', basicSalary: 5000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'terminated', isActive: false,
    archivedAt: new Date(), payMethod: 'cash' })
  if (caseStatus) await ds.getRepository('OffboardingCase').save({ employeeId: emp.id, lastWorkingDay: '2025-06-30', status: caseStatus, terminationReason: 'resignation' })
  return emp
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  const connection = db => ({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: db, options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 10000, requestTimeout: 120000 })
  master = await new sql.ConnectionPool(connection('master')).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: crypto.randomBytes(48).toString('hex') })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  // مفيش رسالة بريد حقيقية بتطلع من الاختبار
  const { MailService } = require('../src/auth/mail.service')
  const mail = app.get(MailService)
  mail.isConfigured = () => false
  mail.send = async () => { throw new Error('no mail in tests') }
  assert.notEqual(mail.send, MailService.prototype.send)
  await app.init()
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource); assertDisposable()
  service = app.get(require('../src/employees/employees.service').EmployeesService)
  rules = require('../src/employees/employment-periods')
  pool = await new sql.ConnectionPool(connection(database)).connect()
  fs.mkdirSync(path.join(base, 'payroll'), { recursive: true })
  fs.copyFileSync(path.join(MIGRATIONS, FILE), path.join(base, 'payroll', FILE))
  made.branch = await ds.getRepository('Branch').save({ code: 'EPM_A', name: 'فرع ترحيل الفترات' })
  made.actor = await ds.getRepository('User').save({ email: 'hr@employment-periods-migration.invalid', displayName: 'موارد', passwordHash: 'test-only', role: 'employee',
    permissions: JSON.stringify(['employees.view', 'employees.create', 'employees.archive']), isActive: true, branchId: made.branch.id })
  // دورة الرواتب شهر ميلادي: شهر آخر يوم عمل (2025-06-30) بيخلص في نفس اليوم
  await ds.query(`DELETE FROM [requests_config] WHERE [key] = N'payroll.cycle_start_day'`)
  await ds.query(`INSERT INTO [requests_config] ([key], [value]) VALUES (N'payroll.cycle_start_day', N'1')`)
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try { if (pool) await pool.close() } catch (error) { errors.push(error) }
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
    assert.equal(path.dirname(path.resolve(base)), os.tmpdir()); assert.match(path.basename(base), /^hr-employment-periods-migrations-/)
    fs.rmSync(base, { recursive: true, force: true })
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'employment periods migration fixture cleanup failed')
})

test('EPM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر', async () => {
  const raw = fs.readFileSync(path.join(MIGRATIONS, FILE))
  assert.notDeepEqual([...raw.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'من غير BOM')
  const indexed = require('node:child_process').execFileSync('git', ['ls-files', '--eol', '--', `docs/migrations/payroll/${FILE}`], { cwd: path.join(apiRoot, '..'), encoding: 'utf8' })
  assert.match(indexed, /^i\/lf\b/, 'LF في المستودع — git add للملف قبل الفحص')
  const text = content(FILE)
  assert.match(text, /^-- 20261006_095: /)
  assert.deepEqual(migrate.forbiddenStatements(text), [])
  assert.deepEqual(migrate.throwCodes(text), [95001, 95002, 95003, 95004])
  const statements = migrate.stripComments(text)
  assert.doesNotMatch(statements, /\b(?:DROP|TRUNCATE|MERGE|INSERT|DELETE)\b|\bUPDATE\s+(?:dbo\.)?\[?\w/i, 'جدول جديد بس')
  assert.doesNotMatch(statements, /\b(GREATEST|LEAST|GENERATE_SERIES|DATETRUNC|JSON_OBJECT|JSON_ARRAY)\s*\(|IS\s+(?:NOT\s+)?DISTINCT\s+FROM/i, 'SQL Server 2019')
  assert.match(statements, /\bSET NOCOUNT ON;\s*\nGO\n/)
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات')
  const current = await shape()
  assert.deepEqual(current.columns, [
    ['id', 'int', 4, false, true, 0], ['employeeId', 'int', 4, false, false, 0], ['periodNo', 'int', 4, false, false, 0], ['startDate', 'date', 3, false, false, 0],
    ['endDate', 'date', 3, false, false, 0], ['exitReason', 'nvarchar', 120, true, false, 0], ['offboardingCaseId', 'int', 4, true, false, 0], ['rehireReason', 'nvarchar', 1000, false, false, 0],
    ['rehiredByUserId', 'int', 4, true, false, 0], ['createdAt', 'datetime2', 8, false, false, 0]])
  assert.deepEqual(current.indexes, [['PK_employment_periods', 'id', true, false], ['UX_employment_periods_employee_no', 'employeeId,periodNo', true, false]])
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
  // الجدول اللي synchronize عمله بيعدّي تحقق الترحيل الكامل (قبل وبعد)، والترحيل مابيغيّرش فيه حاجة
  await runFile(FILE)
  assert.deepEqual(await shape(), current)
})

test('EPM-2: من غير الجدول الفترات «مش متاحة» وإعادة التعيين مرفوضة برسالتها؛ والمُرحّل بيعمل الجدول بنفس الشكل والفرق صفر، وبعده الإجراء بيشتغل من غير إعادة تشغيل', async () => {
  const synchronized = await shape()
  assertDisposable()
  await dropTable()
  rules.resetEmploymentPeriodsCache()
  // قبل الترحيل: ملف الموظف والإرجاع القديم شغالين، والفترات «مش متاحة» من غير خطأ، و«إعادة تعيين» مرفوضة برسالة الترحيل
  assert.equal(await rules.employmentPeriodsReady(ds.manager), false)
  const settled = await ended('CLOSED'), plain = await ended(null)
  assert.deepEqual(await service.employmentPeriods(settled.id, null), { ready: false, periods: [], current: { periodNo: 1, startDate: '2020-01-01' }, rehire: null })
  await assert.rejects(service.employmentPeriods(settled.id + 900, null), /الموظف غير موجود/)
  await assert.rejects(service.rehire(settled.id, { startDate: '2026-07-01', reason: 'قبل الترحيل' }, null, made.actor.id),
    error => error.getStatus() === 409 && error.getResponse().code === 'EMPLOYMENT_PERIODS_MIGRATION_MISSING' && /ترحيل 20261006_095/.test(error.message))
  assert.equal((await ds.getRepository('Employee').findOneByOrFail({ id: settled.id })).status, 'terminated')
  assert.equal((await service.reactivate(plain.id, null, made.actor.id)).status, 'active')
  assert.equal(await rules.closedServiceThrough(ds.manager, settled.id), null)
  // إرجاع رصيد إجازة من غير الجدول: زي الأول
  await ds.getRepository('LeaveBalance').save({ employeeId: settled.id, balanceType: 'annual', period: '2025', entitled: 21, taken: 5, openingDays: 0, openingTaken: 0 })
  await ds.transaction(em => app.get(require('../src/requests/leave-balances.service').LeaveBalancesService)
    .restoreLeave(em, { employeeId: settled.id, fromDate: '2025-03-02', days: 2, requestId: null }, 'annual'))
  assert.equal(Number((await ds.getRepository('LeaveBalance').findOneByOrFail({ employeeId: settled.id, balanceType: 'annual', period: '2025' })).taken), 3)

  // جدول أو فهرس قديم بنفس الاسم وبشكل تاني: الترحيل بيقف برسالته قبل أي تغيير
  const objects = async () => ({ ...(await shape()), tables: (await ds.query(`SELECT [name] FROM sys.tables WHERE [name] = N'${TABLE}'`)).map(row => row.name) })
  const refused = async (setup, message) => {
    await dropTable()
    for (const statement of [].concat(setup)) await pool.request().batch(statement)
    const before = await objects()
    await assert.rejects(runFile(FILE), message, [].concat(setup).join(' ').slice(0, 200))
    assert.deepEqual(await objects(), before, `الترحيل المرفوض مالمسش حاجة: ${[].concat(setup).join(' ').slice(0, 160)}`)
  }
  const table = (changes = {}) => `CREATE TABLE dbo.${TABLE} ([id] ${changes.id ?? 'int IDENTITY(1,1) NOT NULL'} CONSTRAINT [${changes.pk ?? 'PK_employment_periods'}] PRIMARY KEY, [employeeId] ${changes.employeeId ?? 'int NOT NULL'},
    [periodNo] ${changes.periodNo ?? 'int NOT NULL'}, [startDate] ${changes.startDate ?? 'date NOT NULL'}, [endDate] ${changes.endDate ?? 'date NOT NULL'}, [exitReason] ${changes.exitReason ?? 'nvarchar(60) NULL'},
    [offboardingCaseId] ${changes.offboardingCaseId ?? 'int NULL'}, [rehireReason] ${changes.rehireReason ?? 'nvarchar(500) NOT NULL'}, [rehiredByUserId] int NULL,
    [createdAt] ${changes.createdAt ?? 'datetime2 NOT NULL'}${changes.extra ?? ''});`
  const TABLE_SHAPE = /20261006_095: جدول employment_periods موجود وشكله مش شكل فترات الخدمة/
  await refused(`CREATE TABLE dbo.${TABLE} ([id] int NOT NULL, [name] nvarchar(50) NULL);`, TABLE_SHAPE)
  // نفس الأعمدة وعمود واحد بنوع أو طول أو دقة أو إلزام غلط، أو بافتراضي، أو من غير هوية، أو عمود زيادة، أو المفتاح باسم تاني
  for (const changes of [{ startDate: 'datetime2 NOT NULL' }, { endDate: 'date NULL' }, { exitReason: 'nvarchar(30) NULL' }, { exitReason: 'varchar(60) NULL' }, { exitReason: 'varchar(120) NULL' }, { rehireReason: 'nvarchar(500) NULL' },
    { rehireReason: 'nvarchar(max) NOT NULL' }, { offboardingCaseId: 'int NOT NULL' }, { periodNo: 'bigint NOT NULL' }, { employeeId: 'int NULL' }, { createdAt: 'datetime2(3) NOT NULL' },
    { periodNo: 'int NOT NULL CONSTRAINT [DF_test_period_no] DEFAULT 1' }, { id: 'int NOT NULL' }, { extra: ', [note] nvarchar(50) NULL' }, { pk: 'PK_other_name' }]) {
    await refused(table(changes), TABLE_SHAPE)
  }
  // جدول سليم وفهرس بنفس الاسم: على عمود تاني، أو مش فريد، أو بعمود زيادة، أو بعمود مضمّن، أو بفلتر، أو بترتيب معكوس
  const PAIR_INDEX = /20261006_095: فهرس UX_employment_periods_employee_no موجود ومش فريد على الموظف ورقم الفترة بالترتيب/
  for (const definition of ['UNIQUE INDEX [UX_employment_periods_employee_no] ON dbo.employment_periods ([periodNo], [employeeId])', 'UNIQUE INDEX [UX_employment_periods_employee_no] ON dbo.employment_periods ([employeeId])',
    'INDEX [UX_employment_periods_employee_no] ON dbo.employment_periods ([employeeId], [periodNo])', 'UNIQUE INDEX [UX_employment_periods_employee_no] ON dbo.employment_periods ([employeeId], [periodNo], [startDate])',
    'UNIQUE INDEX [UX_employment_periods_employee_no] ON dbo.employment_periods ([employeeId], [periodNo]) INCLUDE ([endDate])',
    'UNIQUE INDEX [UX_employment_periods_employee_no] ON dbo.employment_periods ([employeeId], [periodNo]) WHERE [offboardingCaseId] IS NOT NULL']) {
    await refused([table(), `CREATE ${definition};`], PAIR_INDEX)
  }
  // وجدول سليم موجود من غير فهرسه: الترحيل بيكمّل الناقص بس
  await dropTable()
  await pool.request().batch(table())
  await runFile(FILE)
  assert.deepEqual(await shape(), synchronized, 'الجدول السليم الموجود اتكمّل بفهرسه')
  await dropTable()

  const record = await migrate.apply({ database, base, trial: true, schemaDiff: false, quiet: true })
  assert.equal(record.mode, 'disposable')
  assert.equal(record.failed, undefined, JSON.stringify(record.failed))
  assert.equal(record.trial?.passed, true)
  assert.deepEqual(record.applied.map(item => path.basename(item.file)), [FILE])
  assert.equal(record.ledgerComplete, true)
  assert.deepEqual(record.columns.removedOrRenamed, [])
  assert.deepEqual(await shape(), synchronized, 'نفس شكل synchronize بالحرف')
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
  const plan = await migrate.plan({ database, base })
  assert.equal(plan.readOnly, true); assert.equal(plan.pendingCount, 0); assert.deepEqual(plan.problems, [])
  assert.equal(plan.schemaDiffCount, 0, JSON.stringify(plan.schemaDiff))

  // بعد الترحيل والخادم شغال: من غير إعادة تشغيل ولا مهلة (النتيجة «مش موجود» مابتتحفظش)
  const back = await service.rehire(settled.id, { startDate: '2026-07-01', reason: 'بعد الترحيل' }, null, made.actor.id)
  assert.deepEqual([back.status, String(back.joinDate).slice(0, 10)], ['active', '2026-07-01'])
  const view = await service.employmentPeriods(settled.id, null)
  assert.deepEqual([view.ready, view.periods.map(row => [row.periodNo, row.startDate, row.endDate, row.exitReason, row.rehireReason]), view.current],
    [true, [[1, '2020-01-01', '2025-06-30', 'resignation', 'بعد الترحيل']], { periodNo: 2, startDate: '2026-07-01' }])
})

test('EPM-3: آمن للتكرار', async () => {
  const replay = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.deepEqual(replay.pendingBefore, []); assert.deepEqual(replay.applied, []); assert.equal(replay.ledgerComplete, true)
  const snapshot = async () => ({ shape: await shape(), rows: await ds.query(`SELECT * FROM [${TABLE}] ORDER BY [id]`) })
  const before = await snapshot()
  assert.equal(before.rows.length, 1)
  for (let round = 0; round < 2; round++) await runFile(FILE)
  assert.deepEqual(await snapshot(), before)
})
