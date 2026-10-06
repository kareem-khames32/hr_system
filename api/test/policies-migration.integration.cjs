'use strict'
// ترحيل B2.7-أ (20261005_091) على قاعدة مؤقتة عشوائية بتتمسح في الآخر (hr_policies_migration_test_<16 hex> — لا مساس بقاعدة الشركة):
//  PM-1) فحص نصي: من غير BOM، وLF في المستودع، ومفيش عبارة ممنوعة، وأكواد THROW فريدة، ومتوافق مع SQL Server 2019، وقاعدة synchronize
//        بنفس الشكل (الجداول التلاتة بأعمدتها وفهارسها) وفرقها صفر.
//  PM-2) من غير الجداول: الشاشات «مستنية الترحيل» والإدارة مرفوضة برسالتها ومفيش بوابة والنداء العادي شغال؛ وجدول قديم بشكل تاني =
//        الترحيل بيقف من غير ما يلمسه ولا ينشئ الباقي؛ والمُرحّل (بروفة ثم تطبيق) بيعمل نفس الشكل والفرق صفر؛ وبعده النشر والإقرار
//        والبوابة شغالين، والنسخة المنشورة والإقرار مابيتعدلوش ولا بيتمسحوا (المشغّلين).
//  PM-3) آمن للتكرار.
// Run (من api/): node --test test/policies-migration.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_policies_migration_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_policies_migration_test_[a-f0-9]{16}$/
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-policies-migrations-'))
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-policies-mfiles-'))
const MIGRATIONS = path.join(apiRoot, '..', 'docs/migrations/payroll')
const FILE = '20261005_091_policies.sql'
const TABLES = ['policies', 'policy_versions', 'policy_acknowledgements']
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, ds, master, pool, http, rules, gate, created = false
const made = {}, users = {}

function assertDisposable() {
  assert.match(database, migrate.DISPOSABLE_DATABASE); assert.match(database, NAME)
  assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system')
  if (ds) assert.equal(ds.options.database, database)
}
const content = file => fs.readFileSync(path.join(MIGRATIONS, file), 'utf8').replace(/\r\n/g, '\n')
const runFile = async file => { for (const batch of migrate.splitBatches(content(file))) await pool.request().batch(batch) }
const shape = async () => {
  const out = {}
  for (const table of TABLES) {
    out[table] = {
      columns: (await ds.query(`SELECT c.name AS columnName, t.name AS type, c.max_length AS maxLength, c.is_nullable AS nullable, c.is_identity AS isIdentity, c.default_object_id AS defaultId
        FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id WHERE c.object_id = OBJECT_ID(N'dbo.${table}') ORDER BY c.column_id`))
        .map(row => [row.columnName, row.type, row.maxLength, row.nullable, row.isIdentity, row.defaultId]),
      indexes: (await ds.query(`SELECT i.name, i.is_unique AS isUnique, i.has_filter AS hasFilter,
          STUFF((SELECT ',' + c.name FROM sys.index_columns ic JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
            WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id ORDER BY ic.key_ordinal FOR XML PATH('')), 1, 1, '') AS [columns]
        FROM sys.indexes i WHERE i.object_id = OBJECT_ID(N'dbo.${table}') AND i.name IS NOT NULL ORDER BY i.name`))
        .map(row => [row.name, row.columns, row.isUnique, row.hasFilter]),
      checks: (await ds.query(`SELECT name FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.${table}') ORDER BY name`)).map(row => row.name),
    }
  }
  return out
}
const triggers = async () => (await ds.query(`SELECT t.name, OBJECT_NAME(t.parent_id) AS [table], t.is_instead_of_trigger AS insteadOf, t.is_disabled AS disabled
  FROM sys.triggers t WHERE t.name LIKE N'TR[_]policy%' ORDER BY t.name`)).map(row => [row.name, row.table, row.insteadOf, row.disabled])
// «قبل الترحيل»: الجداول التلاتة مش موجودة (على القاعدة المؤقتة بس)
async function dropPolicySchema() {
  assertDisposable()
  for (const table of [...TABLES].reverse()) await pool.request().batch(`IF OBJECT_ID(N'dbo.${table}', N'U') IS NOT NULL DROP TABLE dbo.${table};`)
  rules.resetPolicySchemaCache()
  await gate.changed()
}
const payloadOf = user => ({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false,
  permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(http + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt.sign(payloadOf(user))}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
function expectStatus(response, status) {
  assert.equal(response.status, status, JSON.stringify(response.body))
  return response.body
}
const messageOf = response => [].concat(response.body?.message ?? []).join('، ')
const localDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const day = offset => { const date = new Date(); date.setDate(date.getDate() + offset); return localDate(date) }

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  const connection = db => ({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: db, options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 10000, requestTimeout: 120000 })
  master = await new sql.ConnectionPool(connection('master')).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads, FRONTEND_URL: 'https://hr.example.invalid/' })
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
  ds = app.get(require('../node_modules/typeorm').DataSource); assertDisposable()
  http = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  rules = require('../src/policies/policy-rules')
  gate = app.get(require('../src/policies/policy-gate').PolicyGate)
  // العلامة في الاختبار بتتحكم فيها الاختبارات نفسها: من غير التحديث الدوري
  gate.stopBackgroundRefresh()
  pool = await new sql.ConnectionPool(connection(database)).connect()
  fs.mkdirSync(path.join(base, 'payroll'), { recursive: true })
  fs.copyFileSync(path.join(MIGRATIONS, FILE), path.join(base, 'payroll', FILE))

  made.branch = await ds.getRepository('Branch').save({ code: 'PM_A', name: 'فرع ترحيل السياسات' })
  made.staff = await ds.getRepository('Employee').save({ employeeCode: 'PM001', fullName: 'موظف PM001', branchId: made.branch.id, joinDate: '2020-01-01', basicSalary: 5000,
    housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'cash' })
  const account = (label, extra = {}) => ds.getRepository('User').save({ email: `${label}@policies-migration.invalid`, displayName: `حساب ${label}`, passwordHash: 'test-only',
    role: 'employee', branchId: made.branch.id, permissions: '[]', isActive: true, ...extra })
  users.admin = await account('admin', { role: 'super_admin', branchId: null, scopeAllBranches: true })
  users.staff = await account('staff', { employeeId: made.staff.id })
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
  for (const dir of [base, uploads]) {
    try {
      assert.equal(path.dirname(path.resolve(dir)), os.tmpdir()); assert.match(path.basename(dir), /^hr-policies-(migrations|mfiles)-/)
      fs.rmSync(dir, { recursive: true, force: true })
    } catch (error) { errors.push(error) }
  }
  if (errors.length) throw new AggregateError(errors, 'policies migration fixture cleanup failed')
})

test('PM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر', async () => {
  const raw = fs.readFileSync(path.join(MIGRATIONS, FILE))
  assert.notDeepEqual([...raw.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'من غير BOM')
  const indexed = require('node:child_process').execFileSync('git', ['ls-files', '--eol', '--', `docs/migrations/payroll/${FILE}`], { cwd: path.join(apiRoot, '..'), encoding: 'utf8' })
  assert.match(indexed, /^i\/lf\b/, 'LF في المستودع — git add للملف قبل الفحص')
  const text = content(FILE)
  assert.match(text, /^-- 20261005_091: /)
  assert.deepEqual(migrate.forbiddenStatements(text), [])
  assert.deepEqual([...migrate.throwCodes(text)].sort((a, b) => a - b), [91001, 91002, 91003, 91004, 91005, 91010, 91011])
  const statements = migrate.stripComments(text)
  assert.doesNotMatch(statements, /\b(?:DROP|TRUNCATE|MERGE|INSERT)\b|\bUPDATE\s+(?:dbo\.)?\[?\w|\bDELETE\s+FROM\b/i, 'جداول ومشغّلين جداد بس، من غير تعبئة (UPDATE وDELETE في قايمة أحداث المشغّل بس)')
  assert.doesNotMatch(statements, /\bDEFAULT\b/i, 'من غير افتراضي (زي الكيانات)')
  assert.doesNotMatch(statements, /\b(GREATEST|LEAST|GENERATE_SERIES|DATETRUNC|JSON_OBJECT|JSON_ARRAY)\s*\(|IS\s+(?:NOT\s+)?DISTINCT\s+FROM/i, 'SQL Server 2019')
  assert.match(statements, /\bSET NOCOUNT ON;\s*\nGO\n/)
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات')
  assert.deepEqual(await shape(), {
    policies: {
      columns: [['id', 'int', 4, false, true, 0], ['title', 'nvarchar', 400, false, false, 0], ['category', 'nvarchar', 200, true, false, 0], ['audience', 'nvarchar', 4000, true, false, 0],
        ['isMandatory', 'bit', 1, false, false, 0], ['graceDays', 'int', 4, false, false, 0], ['graceFrom', 'date', 3, true, false, 0], ['status', 'nvarchar', 40, false, false, 0], ['createdByUserId', 'int', 4, false, false, 0],
        ['createdAt', 'datetime2', 8, false, false, 0], ['withdrawnAt', 'datetime2', 8, true, false, 0], ['withdrawnByUserId', 'int', 4, true, false, 0]],
      indexes: [['PK_policies', 'id', true, false]], checks: [],
    },
    policy_versions: {
      columns: [['id', 'int', 4, false, true, 0], ['policyId', 'int', 4, false, false, 0], ['versionNo', 'int', 4, false, false, 0], ['bodyText', 'nvarchar', -1, true, false, 0],
        ['fileId', 'int', 4, true, false, 0], ['contentHash', 'nvarchar', 128, false, false, 0], ['effectiveDate', 'date', 3, false, false, 0], ['isMaterial', 'bit', 1, false, false, 0],
        ['publishedAt', 'datetime2', 8, false, false, 0], ['publishedByUserId', 'int', 4, false, false, 0]],
      indexes: [['PK_policy_versions', 'id', true, false], ['UQ_policy_versions_number', 'policyId,versionNo', true, false]], checks: ['CK_policy_versions_content'],
    },
    policy_acknowledgements: {
      columns: [['id', 'int', 4, false, true, 0], ['policyId', 'int', 4, false, false, 0], ['versionId', 'int', 4, false, false, 0], ['employeeId', 'int', 4, false, false, 0],
        ['userId', 'int', 4, false, false, 0], ['acknowledgedAt', 'datetime2', 8, false, false, 0], ['contentHash', 'nvarchar', 128, false, false, 0], ['ip', 'nvarchar', 128, true, false, 0],
        ['userAgent', 'nvarchar', 600, true, false, 0]],
      indexes: [['IX_policy_acknowledgements_employee', 'employeeId,policyId', false, false], ['PK_policy_acknowledgements', 'id', true, false],
        ['UQ_policy_acknowledgements_version_employee', 'versionId,employeeId', true, false]], checks: [],
    },
  })
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
})

test('PM-2: من غير الجداول الشاشات «مستنية الترحيل» ومفيش بوابة؛ وجدول قديم بشكل تاني بيوقّف الترحيل؛ والمُرحّل بيعمل نفس الشكل والفرق صفر، وبعده النشر والإقرار شغالين والمشغّلين بيمنعوا التعديل والمسح', async () => {
  const synchronized = await shape()
  await dropPolicySchema()
  assert.deepEqual(await shape(), Object.fromEntries(TABLES.map(table => [table, { columns: [], indexes: [], checks: [] }])))
  assert.equal(await rules.policySchemaReady(ds.manager), false)

  // قبل الترحيل: الشاشات «مش متاح» من غير خطأ، والإدارة مرفوضة برسالتها، والقراءة والإقرار زي اللي مش موجود
  assert.deepEqual(expectStatus(await request(users.admin, 'GET', '/policies'), 200), { available: false, canManage: true, policies: [] })
  assert.deepEqual(expectStatus(await request(users.staff, 'GET', '/policies/mine'), 200), { available: false, policies: [] })
  assert.deepEqual(expectStatus(await request(users.staff, 'GET', '/policies/pending'), 200), { blocked: false, policies: [] })
  const refused = await request(users.admin, 'POST', '/policies', { title: 'سياسة قبل الترحيل' })
  assert.deepEqual([refused.status, messageOf(refused)], [400, rules.POLICY_MIGRATION_MISSING])
  assert.match(rules.POLICY_MIGRATION_MISSING, /20261005_091/)
  for (const [user, method, route, body] of [[users.admin, 'GET', '/policies/1'], [users.admin, 'GET', '/policies/1/report'], [users.staff, 'GET', '/policies/versions/1'],
    [users.staff, 'POST', '/policies/versions/1/acknowledge', { contentHash: 'a'.repeat(64) }]]) {
    const response = await request(user, method, route, body)
    assert.deepEqual([response.status, messageOf(response)], [404, rules.POLICY_NOT_FOUND], route)
  }
  // ومفيش بوابة: النداء العادي شغال
  assert.equal(gate.active(), false)
  expectStatus(await request(users.staff, 'GET', '/requests/mine'), 200)

  // جدول قديم بشكل تاني: الترحيل بيقف برسالته ومابيلمسوش ولا بينشئ الباقي
  await pool.request().batch('CREATE TABLE dbo.policies ([id] int NOT NULL, [name] nvarchar(50) NULL);')
  await assert.rejects(runFile(FILE), /20261005_091: جدول policies موجود وأعمدته مش أعمدة السياسة الـ12/)
  assert.deepEqual((await ds.query(`SELECT c.name FROM sys.columns c WHERE c.object_id = OBJECT_ID(N'dbo.policies') ORDER BY c.column_id`)).map(row => row.name), ['id', 'name'])
  assert.deepEqual((await ds.query(`SELECT OBJECT_ID(N'dbo.policy_versions', N'U') AS [versions], OBJECT_ID(N'dbo.policy_acknowledgements', N'U') AS [acknowledgements]`))[0],
    { versions: null, acknowledgements: null })
  await dropPolicySchema()

  const record = await migrate.apply({ database, base, trial: true, schemaDiff: false, quiet: true })
  assert.equal(record.mode, 'disposable')
  assert.equal(record.failed, undefined, JSON.stringify(record.failed))
  assert.equal(record.trial?.passed, true)
  assert.deepEqual(record.applied.map(item => path.basename(item.file)), [FILE])
  assert.equal(record.ledgerComplete, true)
  assert.deepEqual(record.columns.removedOrRenamed, [])
  assert.deepEqual(await shape(), synchronized, 'نفس شكل synchronize بالحرف')
  assert.deepEqual(await triggers(), [['TR_policy_acknowledgements_append_only', 'policy_acknowledgements', true, false], ['TR_policy_versions_frozen', 'policy_versions', true, false]])
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
  const plan = await migrate.plan({ database, base })
  assert.equal(plan.readOnly, true); assert.equal(plan.pendingCount, 0); assert.deepEqual(plan.problems, [])
  assert.equal(plan.schemaDiffCount, 0, JSON.stringify(plan.schemaDiff))

  // بعد الترحيل: السياسة بتتنشر، والبوابة بتقفل اللي عدّى مهلته، والإقرار بيفتح
  rules.resetPolicySchemaCache()
  const policy = expectStatus(await request(users.admin, 'POST', '/policies', { title: 'سياسة بعد الترحيل', isMandatory: true, graceDays: 0 }), 201)
  const version = expectStatus(await request(users.admin, 'POST', `/policies/${policy.id}/versions`, { bodyText: 'نص السياسة', effectiveDate: day(0) }), 201)
  assert.equal(gate.active(), true)
  assert.equal((await request(users.staff, 'GET', '/requests/mine')).body.code, rules.POLICY_ACK_REQUIRED)
  expectStatus(await request(users.staff, 'POST', `/policies/versions/${version.id}/acknowledge`, { contentHash: version.contentHash }), 201)
  expectStatus(await request(users.staff, 'GET', '/requests/mine'), 200)
  // والنسخة المنشورة والإقرار مابيتعدلوش ولا بيتمسحوا من القاعدة نفسها
  await assert.rejects(pool.request().query(`UPDATE dbo.policy_versions SET [bodyText] = N'تلاعب' WHERE [id] = ${Number(version.id)}`), /91010|مابتتعدلش/)
  await assert.rejects(pool.request().query(`DELETE FROM dbo.policy_versions WHERE [id] = ${Number(version.id)}`), /91010|مابتتعدلش/)
  await assert.rejects(pool.request().query(`UPDATE dbo.policy_acknowledgements SET [contentHash] = N'تلاعب' WHERE [versionId] = ${Number(version.id)}`), /91011|إضافة بس/)
  await assert.rejects(pool.request().query(`DELETE FROM dbo.policy_acknowledgements WHERE [versionId] = ${Number(version.id)}`), /91011|إضافة بس/)
  // ونسخة من غير محتوى، أو بنص وملف مع بعض، القاعدة نفسها بترفضها
  for (const [body, fileId] of [['NULL', 'NULL'], ["N'نص'", '7']]) {
    await assert.rejects(pool.request().query(`INSERT dbo.policy_versions ([policyId], [versionNo], [bodyText], [fileId], [contentHash], [effectiveDate], [isMaterial], [publishedAt], [publishedByUserId])
      VALUES (${Number(policy.id)}, 99, ${body}, ${fileId}, N'x', '2026-01-01', 1, SYSDATETIME(), 1)`), /CK_policy_versions_content/)
  }
  assert.deepEqual((await ds.query('SELECT [bodyText], [contentHash] FROM [policy_versions] WHERE [id] = @0', [version.id]))[0], { bodyText: 'نص السياسة', contentHash: version.contentHash })
  assert.equal(Number((await ds.query('SELECT COUNT(*) AS [n] FROM [policy_acknowledgements] WHERE [versionId] = @0 AND [contentHash] = @1', [version.id, version.contentHash]))[0].n), 1)
  // وبيانات السياسة نفسها بتتعدل، ونسخة جديدة بتتنشر، والسحب شغال (المشغّلين على النسخ والإقرارات بس)
  expectStatus(await request(users.admin, 'PATCH', `/policies/${policy.id}`, { graceDays: 3 }), 200)
  expectStatus(await request(users.admin, 'POST', `/policies/${policy.id}/versions`, { bodyText: 'نسخة تانية', effectiveDate: day(0) }), 201)
  expectStatus(await request(users.admin, 'POST', `/policies/${policy.id}/withdraw`), 201)
})

test('PM-3: آمن للتكرار', async () => {
  const replay = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.deepEqual(replay.pendingBefore, []); assert.deepEqual(replay.applied, []); assert.equal(replay.ledgerComplete, true)
  const snapshot = async () => ({ shape: await shape(), triggers: await triggers(),
    policies: await ds.query('SELECT [id], [status], [graceDays] FROM [policies] ORDER BY [id]'),
    versions: await ds.query('SELECT [id], [versionNo], [contentHash] FROM [policy_versions] ORDER BY [id]'),
    acknowledgements: await ds.query('SELECT [id], [versionId], [employeeId], [contentHash] FROM [policy_acknowledgements] ORDER BY [id]') })
  const before = await snapshot()
  assert.deepEqual([before.policies.length, before.versions.length, before.acknowledgements.length], [1, 2, 1])
  for (let round = 0; round < 2; round++) await runFile(FILE)
  assert.deepEqual(await snapshot(), before)
})
