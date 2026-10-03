'use strict'
// B1.4 — المهام المجدولة على قاعدة SQL مؤقتة معزولة (hr_scheduled_jobs_test_<16 hex>) — لا مساس بقاعدة الشركة:
//  SJ-1) نسختين من الـAPI على نفس القاعدة (كل نسخة باتصالاتها = جلسات SQL منفصلة زي processين) بيشغّلوا نفس المهمة في نفس اللحظة:
//        الشغل مرة واحدة، وتشغيل تاني في نفس الدقيقة بيتعدّى، والدقيقة الجاية بتشتغل. التجسيد اليومي ولحاقه مابيتداخلوش.
//        وبدوال الجدولة الحقيقية (ScheduledJobsRunner) في النسختين: التصعيد الحقيقي اتنادى مرة واحدة.
//  SJ-2) الفشل بيتسجل «فشلت» برسالته والمهمة الجاية بتشتغل، والموديول المقفول مفيش تشغيل ولا صف، والمهمة الأساسية بتشتغل دايمًا.
//  SJ-3) شاشة المهام لحساب الشركة بإدارة الإعدادات (والحساب بفرع أو من غير الصلاحية 403)، ومسح الأقدم من 30 يوم.
//  SJ-4) ترحيل 079: LF من غير BOM، وأكواده فريدة، والأسماء بتاعة الكيان وفرقها صفر. قبله المهام شغالة بقفلها من غير سجل،
//        والمُرحّل بيضيف الجدول من غير فرق مخطط، وآمن للتكرار.
// Run (من api/): node --test test/scheduled-jobs.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_scheduled_jobs_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_scheduled_jobs_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-scheduled-jobs-files-'))
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-scheduled-jobs-migrations-'))
const MIGRATIONS = path.join(apiRoot, '..', 'docs/migrations/payroll')
const FILE = '20261003_079_scheduled_job_runs.sql'
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let appA, appB, dsA, master, pool, url, created = false
const sleep = ms => new Promise(done => setTimeout(done, ms))

function assertDisposable() {
  assert.match(database, migrate.DISPOSABLE_DATABASE); assert.match(database, NAME)
  assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system')
  if (dsA) assert.equal(dsA.options.database, database)
}
const { ScheduledJobsService } = require('../src/scheduler/scheduled-jobs.service')
const { ScheduledJobsRunner } = require('../src/scheduler/scheduled-jobs.runner')
const { SCHEDULED_JOB_IDS } = require('../src/scheduler/scheduled-jobs')
const { systemTimeZone } = require('../src/scheduler/schedule-time-zone')
const { RequestsService } = require('../src/requests/requests.service')
const { ModulesService } = require('../src/modules-registry/modules.service')
const { effectiveBranchScope } = require('../src/auth/guards')
const jobsOf = app => app.get(ScheduledJobsService)
const runs = (where = '1 = 1', params = []) => dsA.query(`SELECT [jobId], [slot], [status], [durationMs], [error], [host] FROM dbo.scheduled_job_runs WHERE ${where} ORDER BY [id]`, params)

function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    scopeAllBranches: user.scopeAllBranches === true, branchIds: effectiveBranchScope(user) ?? undefined, tokenVersion: user.tokenVersion ?? 0,
    permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function http(user, method, route) {
  const response = await fetch(url + route, { method, headers: { Authorization: `Bearer ${token(user)}` } })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
async function boot() {
  const app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  // لحاق الإقلاع (بعد 30-60 ثانية) مالوش دعوة بالاختبار
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  app.get(require('../src/requests/leave-attachment-deadline.job').LeaveAttachmentDeadlineJob).daily = async () => undefined
  return app
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  const connection = db => ({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: db, options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 10000, requestTimeout: 120000 })
  master = await new sql.ConnectionPool(connection('master')).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  appA = await boot()
  dsA = appA.get(require('../node_modules/typeorm').DataSource); assertDisposable()
  url = `http://127.0.0.1:${appA.getHttpServer().address().port}/api`
  // النسخة التانية على نفس القاعدة من غير ما تلمس المخطط
  process.env.DB_SYNCHRONIZE = 'false'
  appB = await boot()
  assert.equal(appB.get(require('../node_modules/typeorm').DataSource).options.database, database)
  pool = await new sql.ConnectionPool(connection(database)).connect()
  fs.mkdirSync(path.join(base, 'payroll'), { recursive: true })
  fs.copyFileSync(path.join(MIGRATIONS, FILE), path.join(base, 'payroll', FILE))
}, { timeout: 240000 })

after(async t => {
  const errors = []
  for (const app of [appB, appA]) { try { if (app) await app.close() } catch (error) { errors.push(error) } }
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
  for (const dir of [base, uploads]) {
    try {
      assert.equal(path.dirname(path.resolve(dir)), os.tmpdir()); assert.match(path.basename(dir), /^hr-scheduled-jobs-(migrations|files)-/)
      fs.rmSync(dir, { recursive: true, force: true })
    } catch (error) { errors.push(error) }
  }
  if (errors.length) throw new AggregateError(errors, 'scheduled jobs fixture cleanup failed')
})

const NOW = new Date('2026-10-29T21:30:00.000Z')
const later = minutes => new Date(NOW.getTime() + minutes * 60_000)

test('SJ-1: نسختين من الـAPI — نفس المهمة في نفس اللحظة بتشتغل مرة واحدة، وتاني في نفس الدقيقة بيتعدّى، والدقيقة الجاية بتشتغل', { timeout: 120000 }, async () => {
  let calls = 0
  const work = async () => { calls++; await sleep(400) }
  const outcomes = await Promise.all([jobsOf(appA).tick('requests.escalations', work, NOW), jobsOf(appB).tick('requests.escalations', work, NOW)])
  assert.deepEqual(outcomes.sort(), ['BUSY', 'SUCCEEDED'])
  assert.equal(calls, 1)
  // النسخة التانية بعد ما الأولى خلصت، في نفس الدقيقة: بتتعدّى
  assert.equal(await jobsOf(appB).tick('requests.escalations', work, NOW), 'DUPLICATE')
  assert.equal(calls, 1)
  assert.equal(await jobsOf(appB).tick('requests.escalations', work, later(1)), 'SUCCEEDED')
  assert.equal(calls, 2)
  const rows = await runs("[jobId] = N'requests.escalations'")
  assert.deepEqual(rows.map(row => [row.slot, row.status]), [['2026-10-29T21:30Z', 'SUCCEEDED'], ['2026-10-29T21:31Z', 'SUCCEEDED']])
  assert.ok(rows.every(row => row.durationMs >= 0 && /:\d+$/.test(row.host)))
  // التجسيد اليومي ولحاقه بيشتركوا في قفل واحد: مابيتداخلوش حتى من نسختين
  let inside = 0, overlap = false
  const guarded = async () => { inside++; if (inside > 1) overlap = true; await sleep(300); inside-- }
  const both = await Promise.all([jobsOf(appA).tick('attendance.materialize-absences', guarded, NOW), jobsOf(appB).tick('attendance.materialize-absences.catch-up', guarded, NOW)])
  assert.equal(overlap, false)
  assert.deepEqual(both.sort(), ['BUSY', 'SUCCEEDED'])
  // دوال الجدولة الحقيقية في النسختين في نفس اللحظة: التصعيد الحقيقي اتنادى مرة واحدة
  const called = []
  const restore = [appA, appB].map(app => {
    const service = app.get(RequestsService), original = service.runEscalations
    service.runEscalations = async function (...args) { called.push(app === appA ? 'A' : 'B'); await sleep(400); return original.apply(this, args) }
    return () => { service.runEscalations = original }
  })
  try {
    // بعيد عن آخر الدقيقة (الخانة بالدقيقة)
    while (new Date().getSeconds() > 50) await sleep(500)
    const real = await Promise.all([appA.get(ScheduledJobsRunner).escalations(), appB.get(ScheduledJobsRunner).escalations()])
    assert.deepEqual(real.sort(), ['BUSY', 'SUCCEEDED'])
    assert.equal(called.length, 1)
  } finally { for (const undo of restore) undo() }
})

test('SJ-2: الفشل بيتسجل «فشلت» برسالته والجاية بتشتغل، والموديول المقفول مفيش تشغيل ولا صف، والأساسية بتشتغل دايمًا', async () => {
  const jobs = jobsOf(appA)
  assert.equal(await jobs.tick('payroll.deductions-sla', async () => { throw new Error('فشل مقصود في اختبار المهام') }, NOW), 'FAILED')
  assert.equal(await jobs.tick('payroll.deductions-sla', async () => undefined, later(1)), 'SUCCEEDED')
  assert.deepEqual((await runs("[jobId] = N'payroll.deductions-sla'")).map(row => [row.status, row.error]), [['FAILED', 'فشل مقصود في اختبار المهام'], ['SUCCEEDED', null]])
  const modules = appA.get(ModulesService), original = modules.jobEnabled
  modules.jobEnabled = async () => false
  try {
    assert.equal(await jobs.tick('leave.year-start', async () => { throw new Error('مايتشغلش') }, NOW), 'DISABLED')
    assert.equal(await jobs.tick('scheduler.prune-runs', async () => undefined, NOW), 'SUCCEEDED', 'المهمة الأساسية مالهاش موديول')
  } finally { modules.jobEnabled = original }
  assert.deepEqual(await runs("[jobId] = N'leave.year-start'"), [])
})

test('SJ-3: شاشة المهام لحساب الشركة بإدارة الإعدادات (الفرع ومن غير الصلاحية 403)، ومسح الأقدم من 30 يوم', async () => {
  const branch = await dsA.getRepository('Branch').save({ code: 'SJB', name: 'فرع المهام' })
  const account = extra => dsA.getRepository('User').save({ email: `sj-${crypto.randomBytes(4).toString('hex')}@scheduled-jobs.invalid`, displayName: 'حساب المهام',
    passwordHash: 'test-only', role: 'employee', ...extra })
  const company = await account({ scopeAllBranches: true, permissions: JSON.stringify(['settings.manage']) })
  const branchOnly = await account({ branchId: branch.id, permissions: JSON.stringify(['settings.manage']) })
  const plain = await account({ scopeAllBranches: true, permissions: '[]' })
  const view = await http(company, 'GET', '/scheduled-jobs')
  assert.equal(view.status, 200, JSON.stringify(view.body))
  assert.deepEqual([view.body.available, view.body.timeZone, view.body.jobs.map(job => job.id)], [true, systemTimeZone(), SCHEDULED_JOB_IDS])
  const escalations = view.body.jobs.find(job => job.id === 'requests.escalations')
  assert.equal(escalations.lastRun.status, 'SUCCEEDED')
  assert.ok(escalations.recent.length >= 2 && escalations.nextRunAt && escalations.last24h.runs >= 2)
  const sla = view.body.jobs.find(job => job.id === 'payroll.deductions-sla')
  assert.deepEqual([sla.lastFailure.status, sla.lastFailure.error, sla.lastRun.status], ['FAILED', 'فشل مقصود في اختبار المهام', 'SUCCEEDED'])
  assert.equal((await http(branchOnly, 'GET', '/scheduled-jobs')).status, 403)
  assert.equal((await http(plain, 'GET', '/scheduled-jobs')).status, 403)
  // المسح: الأقدم من 30 يوم بس
  await dsA.query(`INSERT INTO dbo.scheduled_job_runs ([jobId], [slot], [status], [startedAt]) VALUES (N'requests.escalations', N'2026-01-01T00:00Z', N'SUCCEEDED', DATEADD(day, -31, SYSUTCDATETIME()))`)
  const total = (await dsA.query('SELECT COUNT(*) AS n FROM dbo.scheduled_job_runs'))[0].n
  assert.equal(await jobsOf(appA).prune(), 1)
  assert.equal((await dsA.query('SELECT COUNT(*) AS n FROM dbo.scheduled_job_runs'))[0].n, total - 1)
})

const shape = async () => ({
  columns: await dsA.query(`SELECT c.name AS columnName, t.name AS type, c.max_length AS maxLength, c.is_nullable AS nullable, c.is_identity AS isIdentity
    FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id WHERE c.object_id = OBJECT_ID('dbo.scheduled_job_runs') ORDER BY c.column_id`),
  keys: await dsA.query(`SELECT name, type FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID('dbo.scheduled_job_runs') ORDER BY name`),
  indexes: await dsA.query(`SELECT i.name, i.is_unique AS isUnique, ic.key_ordinal AS ordinal, c.name AS columnName FROM sys.indexes i
    JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
    JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
    WHERE i.object_id = OBJECT_ID('dbo.scheduled_job_runs') AND i.is_primary_key = 0 ORDER BY i.name, ic.key_ordinal`),
})
const col = (columnName, type, maxLength, nullable, isIdentity = false) => ({ columnName, type, maxLength, nullable, isIdentity })
const EXPECTED_SHAPE = {
  columns: [col('id', 'int', 4, false, true), col('jobId', 'nvarchar', 160, false), col('slot', 'nvarchar', 40, false), col('status', 'nvarchar', 24, false),
    col('startedAt', 'datetime2', 8, false), col('finishedAt', 'datetime2', 8, true), col('durationMs', 'int', 4, true), col('error', 'nvarchar', 1000, true),
    col('host', 'nvarchar', 240, true)],
  keys: [{ name: 'PK_scheduled_job_runs', type: 'PK' }],
  indexes: [{ name: 'IX_scheduled_job_runs_started', isUnique: false, ordinal: 1, columnName: 'startedAt' },
    { name: 'UX_scheduled_job_runs_slot', isUnique: true, ordinal: 1, columnName: 'jobId' }, { name: 'UX_scheduled_job_runs_slot', isUnique: true, ordinal: 2, columnName: 'slot' }],
}
const content = () => fs.readFileSync(path.join(MIGRATIONS, FILE), 'utf8').replace(/\r\n/g, '\n')

test('SJ-4: ترحيل 079 — الملف سليم والأسماء بتاعة الكيان، وقبله المهام شغالة بقفلها من غير سجل، والمُرحّل بيضيف الجدول من غير فرق، وآمن للتكرار', { timeout: 180000 }, async () => {
  const raw = fs.readFileSync(path.join(MIGRATIONS, FILE))
  assert.notDeepEqual([...raw.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'من غير BOM')
  const indexed = require('node:child_process').execFileSync('git', ['ls-files', '--eol', '--', `docs/migrations/payroll/${FILE}`], { cwd: path.join(apiRoot, '..'), encoding: 'utf8' })
  assert.match(indexed, /^i\/lf\b/, 'LF في المستودع — git add للملف قبل الفحص')
  const text = content()
  assert.match(text, /^-- 20261003_079: /)
  assert.deepEqual(migrate.forbiddenStatements(text), [])
  assert.deepEqual(migrate.throwCodes(text), [79001, 79002, 79003, 79004, 79005])
  assert.doesNotMatch(migrate.stripComments(text), /\b(DELETE|DROP|TRUNCATE|MERGE|UPDATE|INSERT)\b/i, 'بلا مسح ولا تعديل ولا بيانات')
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات')
  const meta = dsA.getMetadata('ScheduledJobRun')
  assert.deepEqual([meta.tableName, meta.primaryColumns[0].primaryKeyConstraintName], ['scheduled_job_runs', 'PK_scheduled_job_runs'])
  assert.deepEqual(await shape(), EXPECTED_SHAPE)
  assert.deepEqual((await dsA.driver.createSchemaBuilder().log()).upQueries.map(query => query.query), [])

  // قبل الترحيل: المهمة شغالة بقفلها (التداخل لسه ممنوع) والسجل بس اللي ناقص، والشاشة بتقول كده
  await pool.request().batch('DROP TABLE dbo.scheduled_job_runs')
  let calls = 0
  const work = async () => { calls++; await sleep(300) }
  const outcomes = await Promise.all([jobsOf(appA).tick('requests.escalations', work, later(10)), jobsOf(appB).tick('requests.escalations', work, later(10))])
  assert.deepEqual([outcomes.sort(), calls], [['BUSY', 'SUCCEEDED'], 1])
  assert.equal((await jobsOf(appA).overview()).available, false)
  assert.equal(await jobsOf(appA).prune(), 0)

  const record = await migrate.apply({ database, base, trial: true, schemaDiff: false, quiet: true })
  assert.equal(record.failed, undefined, JSON.stringify(record.failed))
  assert.equal(record.trial?.passed, true)
  assert.deepEqual(record.applied.map(item => path.basename(item.file)), [FILE])
  assert.deepEqual(await shape(), EXPECTED_SHAPE)
  assert.deepEqual((await dsA.driver.createSchemaBuilder().log()).upQueries.map(query => query.query), [])
  const plan = await migrate.plan({ database, base })
  assert.equal(plan.pendingCount, 0); assert.deepEqual(plan.problems, [])
  assert.equal(plan.schemaDiffCount, 0, JSON.stringify(plan.schemaDiff))
  // آمن للتكرار، والسجل رجع يشتغل
  for (let round = 0; round < 2; round++) for (const batch of migrate.splitBatches(content())) await pool.request().batch(batch)
  assert.deepEqual(await shape(), EXPECTED_SHAPE)
  assert.equal(await jobsOf(appB).tick('requests.escalations', work, later(11)), 'SUCCEEDED')
  assert.deepEqual((await runs()).map(row => [row.jobId, row.status]), [['requests.escalations', 'SUCCEEDED']])
})
