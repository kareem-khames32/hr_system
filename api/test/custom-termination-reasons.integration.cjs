'use strict'
// أسباب إنهاء الخدمة من الإعدادات (قرار المالك 27 سبتمبر): الثمانية الأساسية ثابتة، والمالك بيضيف أسباب مخصصة
// بمسمى ونسبة من مكافأة نهاية الخدمة (الافتراضي «انقطاع عن العمل» بلا مكافأة). الاختبار على SQL حقيقي: القائمة
// الافتراضية، الإضافة والرفض، صلاحية الحفظ، فتح ملف بسبب مخصص ومكافأته بنسبته مقارنة بالإنهاء من صاحب العمل،
// الإيقاف، منع شيل سبب مستخدم وعدم تكرار الأكواد، الكود المش معروف مايتحسبش استقالة، القايمة كلها في صف واحد
// nvarchar(4000) بحد طول، والمسارات الأساسية زي ما هي. وقبلهم ترحيل 20260927_073 (توسيع requests_config.value من 500
// لـ4000) عبر المُرحّل المجمّع من الشكل القديم بصفوف قائمة: القيم زي ما هي، آمن للتكرار، والشكل الغلط يوقف بكوده.
// قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_termination_reasons_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_termination_reasons_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-termination-reasons-files-'))
const migrations = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-termination-reasons-migrations-'))
const MIGRATIONS = path.join(apiRoot, '..', 'docs/migrations/payroll')
const FILE = '20260927_073_requests_config_value_4000.sql'
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, ds, master, pool, base, created = false
const B = {}, E = {}, U = {}, K = {}
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }

const REASONS = '/offboarding/termination-reasons'
const KEY = 'offboarding.custom_termination_reasons'
// خدمة 2020-01-01 → 2024-12-31 = 5 سنين بالظبط: المكافأة الكاملة 12000 × (5 × 0.5) = 30000
const LWD = '2024-12-31'
const FULL = 30000

async function request(user, method, route, body) {
  const token = jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    tokenVersion: 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const ok = (response, status = 200) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const refused = (response, status, pattern) => {
  assert.equal(response.status, status, JSON.stringify(response.body))
  if (pattern) assert.match(JSON.stringify(response.body.message), pattern)
}
const customsOf = view => view.reasons.filter(reason => !reason.builtin)
const inputOf = view => customsOf(view).map(({ code, label, eosFactor, active }) => ({ code, label, eosFactor, active }))
const eosLine = lines => (lines ?? []).find(line => line.label.startsWith('مكافأة نهاية الخدمة'))
const preview = (employeeId, reason) =>
  request(U.admin, 'GET', `/offboarding/preview?${new URLSearchParams({ employeeId: String(employeeId), reason, lastWorkingDay: LWD })}`)
const open = (employeeId, reason) => request(U.admin, 'POST', '/offboarding', { employeeId, reason, lastWorkingDay: LWD })
/** يتمّ بنود الإخلاء الخمسة بحساب HR فيتبني بند التصفية، ويرجّع الملف بعدها. */
async function settle(caseId) {
  const detail = ok(await request(U.admin, 'GET', `/offboarding/${caseId}`))
  for (const item of detail.items) ok(await request(U.admin, 'POST', `/offboarding/items/${item.id}/complete`, {}), 201)
  const after = ok(await request(U.admin, 'GET', `/offboarding/${caseId}`))
  assert.equal(after.status, 'IN_SETTLEMENT')
  return after
}
const storedRows = async () => (await repo('RequestsConfig').find()).filter(row => row.key.startsWith(KEY))

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, NAME); assert.match(database, migrate.DISPOSABLE_DATABASE); assert.notEqual(database, env.DB_DATABASE)
  const connection = db => ({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME,
    password: env.DB_PASSWORD, database: db, options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 10000, requestTimeout: 120000 })
  master = await new sql.ConnectionPool(connection('master')).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assert.equal(ds.options.database, database)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  pool = await new sql.ConnectionPool(connection(database)).connect()
  fs.mkdirSync(path.join(migrations, 'payroll'), { recursive: true })
  fs.copyFileSync(path.join(MIGRATIONS, FILE), path.join(migrations, 'payroll', FILE))

  B.main = await repo('Branch').save({ code: 'TR-M', name: 'فرع اختبار أسباب الإنهاء' })
  const employee = (code, fullName) => repo('Employee').save({ employeeCode: code, fullName, branchId: B.main.id, status: 'active', isActive: true,
    joinDate: '2020-01-01', basicSalary: 12000 })
  E.half = await employee('TR-001', 'موظف سبب مخصص بنصف المكافأة')
  E.absence = await employee('TR-002', 'موظف انقطاع عن العمل')
  E.blocked = await employee('TR-003', 'موظف على سبب موقوف')
  E.resignation = await employee('TR-004', 'موظف استقالة موثقة')
  E.unknown = await employee('TR-005', 'موظف بكود مش معروف')
  E.plain = await employee('TR-006', 'موظف بلا صلاحيات')
  const user = (email, role, employeeId, permissions) => repo('User').save({ email, displayName: email, passwordHash: 'test-only',
    role, branchId: role === 'super_admin' ? null : B.main.id, employeeId, permissions: JSON.stringify(permissions) })
  U.admin = await user('admin@reasons.test', 'super_admin', null, ['*'])
  U.hrBranch = await user('hr@reasons.test', 'hr_manager', null, ['offboarding.manage'])
  U.settingsBranch = await user('settings@reasons.test', 'hr_manager', null, ['settings.manage'])
  U.plain = await user('plain@reasons.test', 'employee', E.plain.id, [])
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try { if (pool) await pool.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  for (const dir of [uploads, migrations]) {
    try {
      assert.equal(path.dirname(path.resolve(dir)), os.tmpdir()); assert.match(path.basename(dir), /^hr-termination-reasons-(files|migrations)-/)
      fs.rmSync(dir, { recursive: true, force: true })
    } catch (error) { errors.push(error) }
  }
  if (errors.length) throw new AggregateError(errors, 'termination reasons fixture cleanup failed')
})

test('TR-M1: ترحيل 073 عبر المُرحّل المجمّع من الشكل القديم nvarchar(500) NOT NULL بصفوف قائمة — توسيع بس، القيم زي ما هي، فرق المخطط صفر، آمن للتكرار، والشكل الغلط يوقف بكوده', async () => {
  const content = fs.readFileSync(path.join(MIGRATIONS, FILE), 'utf8')
  // الملف في المستودع LF؛ نسخة العمل على Windows بتبقى CRLF (core.autocrlf) والمُرحّل بيوحّدها قبل البصمة — فالفحص على نسخة المستودع
  assert.notEqual(content.charCodeAt(0), 0xfeff, 'من غير BOM'); assert.ok(!content.replace(/\r\n/g, '\n').includes('\r'), 'نهايات سطور سليمة')
  const indexed = require('node:child_process').execFileSync('git', ['ls-files', '--eol', '--', `docs/migrations/payroll/${FILE}`],
    { cwd: path.join(apiRoot, '..'), encoding: 'utf8' })
  assert.match(indexed, /^i\/lf\b/, 'LF في المستودع')
  assert.deepEqual(migrate.forbiddenStatements(content), [], 'ALTER COLUMN بسطر التصريح')
  assert.deepEqual(migrate.throwCodes(content), [73001, 73002, 73003])
  assert.doesNotMatch(migrate.stripComments(content), /\b(UPDATE|DELETE|DROP|TRUNCATE|MERGE|INSERT)\b/i, 'إضافي فقط: بلا تعديل بيانات')
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات والملف مقبول')
  assert.doesNotMatch(migrate.stripComments(content), /\b(GREATEST|LEAST|GENERATE_SERIES|DATETRUNC|JSON_OBJECT|JSON_ARRAY)\s*\(|IS\s+(?:NOT\s+)?DISTINCT\s+FROM/i, 'SQL Server 2019')
  assert.equal((await ds.driver.createSchemaBuilder().log()).upQueries.length, 0, 'قاعدة synchronize مطابقة للكيانات (value = nvarchar(4000))')

  const shape = async () => (await pool.request().query(`SELECT TYPE_NAME(c.system_type_id) AS type, c.max_length AS maxLength, c.is_nullable AS nullable,
    c.collation_name AS collation FROM sys.columns c WHERE c.object_id = OBJECT_ID(N'dbo.requests_config') AND c.name = N'value'`)).recordset[0]
  const values = async () => (await pool.request().query('SELECT [key], [value], DATALENGTH([value]) AS bytes FROM dbo.requests_config ORDER BY [key]')).recordset
  // ما قبل الترحيل: شكل قاعدة الشركة القديم بالظبط، وصفوف قائمة (المبذورة + قيم على الحد بعربي ومسافات وفاضية)
  const collation = (await shape()).collation
  await pool.request().batch('ALTER TABLE dbo.requests_config ALTER COLUMN [value] nvarchar(500) NOT NULL;')
  assert.deepEqual(await shape(), { type: 'nvarchar', maxLength: 1000, nullable: false, collation })
  const legacy = [['test.legacy_limit', 'ع'.repeat(499) + 'ز'], ['test.legacy_json', '[{"code":"x","label":"قديم"}]'],
    ['test.legacy_spaces', '  مسافات في الأول والآخر  '], ['test.legacy_empty', '']]
  for (const [key, value] of legacy) {
    await pool.request().input('key', sql.NVarChar, key).input('value', sql.NVarChar, value).query('INSERT INTO dbo.requests_config ([key], [value]) VALUES (@key, @value)')
  }
  const before = await values()
  assert.ok(before.length > legacy.length, 'المبذور موجود كمان')
  assert.equal(before.find(row => row.key === 'test.legacy_limit').bytes, 1000)

  const record = await migrate.apply({ database, base: migrations, trial: true, schemaDiff: false, quiet: true })
  assert.equal(record.mode, 'disposable')
  assert.equal(record.failed, undefined, JSON.stringify(record.failed))
  assert.equal(record.trial?.passed, true)
  assert.deepEqual(record.applied.map(item => path.basename(item.file)), [FILE])
  assert.deepEqual(record.applied[0].guard.widenedColumns, ['requests_config.value: nvarchar(500) → nvarchar(4000)'])
  assert.deepEqual(record.applied[0].guard.nullabilityChanges, [])
  assert.equal(record.ledgerComplete, true)
  assert.deepEqual(record.columns.added.filter(column => !column.startsWith('app_schema_migrations.')), [])
  assert.deepEqual(record.columns.removedOrRenamed, [])
  assert.deepEqual(record.rowCounts.differences.filter(d => d.table !== 'app_schema_migrations'), [])
  const widened = { type: 'nvarchar', maxLength: 8000, nullable: false, collation }
  assert.deepEqual(await shape(), widened, 'nvarchar(4000) NOT NULL بنفس الـcollation')
  assert.deepEqual(await values(), before, 'كل قيمة قائمة زي ما هي بالحرف')
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [], 'فرق المخطط مع الكيانات صفر (RequestsConfig وغيره)')

  // إعادة المُرحّل: مفيش ملف معلق. ونص الترحيل نفسه مرتين برّه الدفتر: آمن للتكرار
  const replay = await migrate.apply({ database, base: migrations, schemaDiff: false, quiet: true })
  assert.deepEqual(replay.pendingBefore, []); assert.deepEqual(replay.applied, []); assert.equal(replay.ledgerComplete, true)
  for (let round = 0; round < 2; round++) for (const batch of migrate.splitBatches(content)) await pool.request().batch(batch)
  assert.deepEqual(await shape(), widened)
  assert.deepEqual(await values(), before)

  // الشكل الغلط يوقف التحقق بكوده ومايسيبش أثر (كل حالة جوه معاملة بتترجع) — وnvarchar(max) مابيتضيّقش
  for (const [ddl, code, maxLength] of [
    ['ALTER TABLE dbo.requests_config ALTER COLUMN [value] nvarchar(4000) NULL', 73003, 8000],
    ['ALTER TABLE dbo.requests_config ALTER COLUMN [value] nvarchar(max) NOT NULL', 73002, -1],
    ['ALTER TABLE dbo.requests_config ALTER COLUMN [value] varchar(8000) NOT NULL', 73001, 8000]]) {
    const tx = new sql.Transaction(pool)
    await tx.begin()
    try {
      await new sql.Request(tx).batch(ddl)
      const batches = migrate.splitBatches(content)
      for (const batch of batches.slice(0, -1)) await new sql.Request(tx).batch(batch)
      const now = (await new sql.Request(tx).query(`SELECT max_length AS maxLength FROM sys.columns
        WHERE object_id = OBJECT_ID(N'dbo.requests_config') AND name = N'value'`)).recordset[0]
      assert.equal(now.maxLength, maxLength, `${ddl}: التوسيع ماتنفذش (والـmax ماتضيّقش)`)
      await assert.rejects(new sql.Request(tx).batch(batches.at(-1)), error => { assert.equal(error.number, code, error.message); return true })
    } finally { try { await tx.rollback() } catch { /* أُجهضت من الخادم */ } }
  }
  assert.deepEqual(await shape(), widened)
  assert.deepEqual(await values(), before)
  for (const [key] of legacy) await pool.request().input('key', sql.NVarChar, key).query('DELETE FROM dbo.requests_config WHERE [key] = @key')
})

test('TR-01: من غير إعداد — الثمانية الأساسية بمسمياتها ونسبها، و«انقطاع عن العمل» الافتراضي بلا مكافأة', async () => {
  assert.equal((await storedRows()).length, 0, 'المفتاح مش موجود: القائمة الافتراضية من الكود')
  const view = ok(await request(U.admin, 'GET', REASONS))
  assert.equal(view.canEdit, true)
  assert.deepEqual(view.reasons.filter(reason => reason.builtin).map(({ code, label, eosFactor, active }) => [code, label, eosFactor, active]), [
    ['resignation', 'استقالة موثقة', null, true], ['termination', 'إنهاء من صاحب العمل', '1', true], ['dismissal', 'فصل تأديبي', '0', true],
    ['contract_end', 'انتهاء مدة العقد', '1', true], ['retirement', 'تقاعد', '1', true], ['death', 'وفاة', '1', true],
    ['disability', 'عجز صحي', '1', true], ['force_majeure', 'قوة قاهرة', '1', true],
  ])
  assert.deepEqual(customsOf(view), [{ code: 'absence', label: 'انقطاع عن العمل', builtin: false, active: true, eosFactor: '0', usedByCases: 0 }])
  // فاتح ملفات الإنهاء بيقرا القائمة (للمعالج) من غير ما يقدر يعدّل، واللي مالوش أي من الصلاحيتين مرفوض
  assert.equal(ok(await request(U.hrBranch, 'GET', REASONS)).canEdit, false)
  assert.equal(ok(await request(U.settingsBranch, 'GET', REASONS)).canEdit, false, 'حساب فرع: الإعداد لكل الشركة')
  refused(await request(U.plain, 'GET', REASONS), 403)
})

test('TR-02: إضافة سبب مخصص — الكود من الخادم (custom_1) والمسمى متنضّف والنسبة رقم أو كسر', async () => {
  const current = ok(await request(U.admin, 'GET', REASONS))
  const saved = ok(await request(U.admin, 'PUT', REASONS, { reasons: [...inputOf(current),
    { label: '  إنهاء   خلال فترة التجربة ', eosFactor: ' 1 / 2 ' }] }))
  assert.deepEqual(customsOf(saved).map(({ code, label, eosFactor, active, usedByCases }) => [code, label, eosFactor, active, usedByCases]), [
    ['absence', 'انقطاع عن العمل', '0', true, 0], ['custom_1', 'إنهاء خلال فترة التجربة', '1/2', true, 0],
  ])
  // مخزنة JSON على المفتاح نفسه بالصيغة المتفق عليها، والعدّاد على آخر رقم اتولّد
  const rows = new Map((await storedRows()).map(row => [row.key, row.value]))
  assert.deepEqual(JSON.parse(rows.get(KEY)), [
    { code: 'absence', label: 'انقطاع عن العمل', eosFactor: '0', active: true },
    { code: 'custom_1', label: 'إنهاء خلال فترة التجربة', eosFactor: '1/2', active: true },
  ])
  assert.equal(rows.get(`${KEY}_seq`), '1')
  // النسبة رقم JSON بتتقبل وتتخزن نص
  const numeric = ok(await request(U.admin, 'PUT', REASONS, { reasons: [...inputOf(saved).map(row => row.code === 'custom_1' ? { ...row, eosFactor: 0.5 } : row)] }))
  assert.equal(customsOf(numeric).find(row => row.code === 'custom_1').eosFactor, '0.5')
  ok(await request(U.admin, 'PUT', REASONS, { reasons: inputOf(saved) }))
})

test('TR-03: المسمى المكرر (مع أساسي أو مخصص، من غير فرق حروف ولا مسافات) والمسمى أو النسبة الغلط مرفوضين والقائمة ما اتغيرتش', async () => {
  const current = inputOf(ok(await request(U.admin, 'GET', REASONS)))
  const put = extra => request(U.admin, 'PUT', REASONS, { reasons: [...current, ...extra] })
  refused(await put([{ label: 'استقالة موثقة', eosFactor: '1' }]), 400, /السبب الأساسي «استقالة موثقة»/)
  refused(await put([{ label: 'فصل تأديبي (م80)', eosFactor: '0' }]), 400, /السبب الأساسي «فصل تأديبي»/)
  refused(await put([{ label: 'انقطاع   عن  العمل', eosFactor: '0' }]), 400, /متكرر/)
  refused(await put([{ label: 'Mutual Agreement', eosFactor: '1' }, { label: 'mutual  agreement', eosFactor: '1' }]), 400, /متكرر/)
  refused(await put([{ label: 'أ', eosFactor: '1' }]), 400, /من 2 لـ 60 حرف/)
  refused(await put([{ label: 'س'.repeat(61), eosFactor: '1' }]), 400, /من 2 لـ 60 حرف/)
  refused(await put([{ label: '   ', eosFactor: '1' }]), 400, /فاضي/)
  for (const eosFactor of ['2', '-1', 'abc', '1/0', '', '1.5', '3/2']) {
    refused(await put([{ label: 'سبب بنسبة غلط', eosFactor }]), 400, /رقم من 0 لـ 1 أو كسر زي 1\/3/)
  }
  // الكود ثابت: مايتعملش كود جديد من برّه ولا يتعدل سبب أساسي من هنا
  refused(await put([{ code: 'custom_99', label: 'سبب بكود مخترع', eosFactor: '1' }]), 400, /مش لسبب مخصص موجود/)
  refused(await put([{ code: 'termination', label: 'إنهاء معدّل', eosFactor: '0' }]), 400, /مش لسبب مخصص موجود/)
  refused(await request(U.admin, 'PUT', REASONS, { reasons: [...current, current[0]] }), 400, /متكرر/)
  const after = ok(await request(U.admin, 'GET', REASONS))
  assert.deepEqual(customsOf(after).map(row => row.code), ['absence', 'custom_1'], 'كل الرفض ماكتبش حاجة')
})

test('TR-04: الحفظ لحساب على مستوى الشركة بصلاحية الإعدادات بس (403)، وPATCH /settings/config مايكتبش القائمة الخام', async () => {
  const current = inputOf(ok(await request(U.admin, 'GET', REASONS)))
  const body = { reasons: [...current, { label: 'سبب من حساب مش مسموح', eosFactor: '1' }] }
  refused(await request(U.hrBranch, 'PUT', REASONS, body), 403)
  refused(await request(U.plain, 'PUT', REASONS, body), 403)
  refused(await request(U.settingsBranch, 'PUT', REASONS, body), 403, /لكل الشركة/)
  for (const key of [KEY, KEY.toUpperCase(), `${KEY}_seq`]) {
    refused(await request(U.admin, 'PATCH', '/settings/config', { key, value: '[]' }), 400, /أسباب إنهاء الخدمة بتتعدل من «سياسات النظام»/)
  }
  assert.deepEqual(customsOf(ok(await request(U.admin, 'GET', REASONS))).map(row => row.code), ['absence', 'custom_1'])
})

test('TR-05: ملف بسبب مخصص — المكافأة بنسبته: 1/2 = نص مكافأة «الإنهاء من صاحب العمل» لنفس الموظف، و0 = بلا مكافأة', async () => {
  const termination = ok(await preview(E.half.id, 'termination'))
  assert.equal(eosLine(termination.lines).amount, FULL, 'المرجع: الإنهاء من صاحب العمل مكافأة كاملة')
  const half = ok(await preview(E.half.id, 'custom_1'))
  assert.equal(half.eos.factor, 0.5); assert.equal(half.eos.factorLabel, '1/2')
  assert.equal(eosLine(half.lines).amount, eosLine(termination.lines).amount / 2)
  const none = ok(await preview(E.absence.id, 'absence'))
  assert.equal(none.eos.factor, 0); assert.equal(eosLine(none.lines), undefined, 'بلا مكافأة = مفيش بند')

  const opened = ok(await open(E.half.id, 'custom_1'), 201)
  assert.equal(opened.terminationReason, 'custom_1')
  assert.equal(opened.terminationReasonLabel, 'إنهاء خلال فترة التجربة')
  K.half = opened.id
  const settled = await settle(K.half)
  const line = eosLine(settled.lines)
  assert.equal(line.amount, FULL / 2)
  assert.match(line.label, /^مكافأة نهاية الخدمة — إنهاء خلال فترة التجربة \(5\.00 سنة: 5×0\.5 شهر × 1\/2\)$/)
  const history = await repo('EmployeeStatusHistory').find({ where: { employeeId: E.half.id } })
  assert.ok(history.some(row => String(row.reason).startsWith('إنهاء خدمة (إنهاء خلال فترة التجربة)')), 'سجل التغييرات بمسمى السبب')

  K.absence = ok(await open(E.absence.id, 'absence'), 201).id
  assert.equal(eosLine((await settle(K.absence)).lines), undefined, 'انقطاع عن العمل: مفيش بند مكافأة')
  const list = ok(await request(U.admin, 'GET', '/offboarding'))
  assert.equal(list.find(row => row.id === K.absence).terminationReasonLabel, 'انقطاع عن العمل')
  const usage = new Map(customsOf(ok(await request(U.admin, 'GET', REASONS))).map(row => [row.code, row.usedByCases]))
  assert.deepEqual([usage.get('absence'), usage.get('custom_1')], [1, 1])
})

test('TR-06: السبب الموقوف مرفوض في ملف جديد ومعاينته، والملف القديم عليه بيفضل بمسماه ومكافأته', async () => {
  const current = inputOf(ok(await request(U.admin, 'GET', REASONS)))
  const view = ok(await request(U.admin, 'PUT', REASONS, { reasons: current.map(row => row.code === 'custom_1' ? { ...row, active: false } : row) }))
  assert.equal(customsOf(view).find(row => row.code === 'custom_1').active, false)
  refused(await open(E.blocked.id, 'custom_1'), 400, /سبب الإنهاء «إنهاء خلال فترة التجربة» موقوف/)
  refused(await preview(E.blocked.id, 'custom_1'), 400, /موقوف/)
  assert.equal((await repo('OffboardingCase').find({ where: { employeeId: E.blocked.id } })).length, 0)
  assert.equal((await repo('Employee').findOneByOrFail({ id: E.blocked.id })).status, 'active')
  refused(await open(E.blocked.id, 'no_such_reason'), 400, /سبب الإنهاء غير معروف/)
  refused(await open(E.blocked.id, 'Bad Code!'), 400, /سبب الإنهاء غير معروف/)

  const old = ok(await request(U.admin, 'GET', `/offboarding/${K.half}`))
  assert.equal(old.terminationReason, 'custom_1')
  assert.equal(old.terminationReasonLabel, 'إنهاء خلال فترة التجربة')
  assert.equal(ok(await request(U.admin, 'GET', '/offboarding')).find(row => row.id === K.half).terminationReasonLabel, 'إنهاء خلال فترة التجربة')
  const recalculated = ok(await request(U.admin, 'POST', `/offboarding/${K.half}/recalc-lines`, {}), 201)
  assert.equal(eosLine(recalculated.lines).amount, FULL / 2, 'الموقوف بيتحسب بنسبته لملفاته القديمة')
})

test('TR-07: السبب المستخدم مايتشالش (409)، والمش مستخدم بيتشال، والكود عمره ما بيتكرر', async () => {
  const current = inputOf(ok(await request(U.admin, 'GET', REASONS)))
  refused(await request(U.admin, 'PUT', REASONS, { reasons: current.filter(row => row.code !== 'custom_1') }), 409,
    /«إنهاء خلال فترة التجربة» عليه 1 ملف إنهاء خدمة — السبب المستخدم مايتشالش، عطّله بس/)
  refused(await request(U.admin, 'PUT', REASONS, { reasons: current.filter(row => row.code !== 'absence') }), 409, /«انقطاع عن العمل» عليه 1 ملف/)
  assert.deepEqual(customsOf(ok(await request(U.admin, 'GET', REASONS))).map(row => row.code), ['absence', 'custom_1'])

  const withTransfer = ok(await request(U.admin, 'PUT', REASONS, { reasons: [...current, { label: 'نقل خدمات', eosFactor: '1' }] }))
  assert.equal(customsOf(withTransfer).at(-1).code, 'custom_2')
  const removed = ok(await request(U.admin, 'PUT', REASONS, { reasons: current }))
  assert.deepEqual(customsOf(removed).map(row => row.code), ['absence', 'custom_1'], 'السبب المش مستخدم اتشال')
  const next = ok(await request(U.admin, 'PUT', REASONS, { reasons: [...current, { label: 'اتفاق الطرفين', eosFactor: '1/3' }] }))
  assert.deepEqual(customsOf(next).at(-1), { code: 'custom_3', label: 'اتفاق الطرفين', builtin: false, active: true, eosFactor: '1/3', usedByCases: 0 },
    'custom_2 اتشال ومايرجعش يتولّد')
  assert.equal((await repo('RequestsConfig').findOneByOrFail({ key: `${KEY}_seq` })).value, '3')
})

test('TR-08: المسارات الأساسية زي ما هي — الاستقالة بجدولها، والفصل بلا مكافأة، ومسمى بند المكافأة ماتغيرش', async () => {
  const resignation = ok(await preview(E.resignation.id, 'resignation'))
  assert.equal(resignation.eos.factorLabel, '2/3', '5 سنين = ثلثين المكافأة من جدول الاستقالة')
  assert.equal(eosLine(resignation.lines).amount, 20000)
  const dismissal = ok(await preview(E.resignation.id, 'dismissal'))
  assert.equal(dismissal.eos.factor, 0); assert.equal(eosLine(dismissal.lines), undefined)
  const kase = ok(await open(E.resignation.id, 'resignation'), 201)
  assert.equal(kase.terminationReasonLabel, 'استقالة موثقة')
  const line = eosLine((await settle(kase.id)).lines)
  assert.equal(line.amount, 20000)
  assert.equal(line.label, 'مكافأة نهاية الخدمة — استقالة (5.00 سنة: 5×0.5 شهر × 2/3)')
  // الملف القديم بلا سبب (قبل EMP-2) = استقالة — والافتراض ده للـNULL بس
  const service = app.get(require('../src/offboarding/offboarding.service').OffboardingService)
  const legacy = await service.buildSettlement({ id: 0, employeeId: E.unknown.id, lastWorkingDay: LWD, terminationReason: null }, true, true)
  assert.equal(eosLine(legacy).amount, 20000)
  assert.match(eosLine(legacy).label, /— استقالة \(/)
})

test('TR-09: الكود المش معروف مايتحسبش استقالة ولا مكافأة كاملة — 409 برسالة، والمسمى بيظهر زي ما هو', async () => {
  const service = app.get(require('../src/offboarding/offboarding.service').OffboardingService)
  await assert.rejects(service.buildSettlement({ id: 0, employeeId: E.unknown.id, lastWorkingDay: LWD, terminationReason: 'mystery_code' }, true, true),
    error => error.getStatus() === 409 && /«mystery_code»/.test(error.message))
  const kase = await repo('OffboardingCase').save({ employeeId: E.unknown.id, lastWorkingDay: LWD, status: 'IN_SETTLEMENT', terminationReason: 'mystery_code' })
  refused(await request(U.admin, 'POST', `/offboarding/${kase.id}/recalc-lines`, {}), 409, /مش موجود في «أسباب إنهاء الخدمة»/)
  assert.equal(await repo('SettlementLine').count({ where: { caseId: kase.id } }), 0)
  assert.equal(ok(await request(U.admin, 'GET', `/offboarding/${kase.id}`)).terminationReasonLabel, 'mystery_code')
})

test('TR-10: القايمة كلها في صف واحد nvarchar(4000) — الأطول من 500 حرف بتتحفظ وترجع بترتيبها، والأطول من 4000 مرفوضة 400 من غير ما تكتب حاجة، والحد 40 سبب', async () => {
  const current = inputOf(ok(await request(U.admin, 'GET', REASONS)))
  const onlyRows = async () => (await storedRows()).map(row => row.key).sort()
  const storedValue = async () => (await repo('RequestsConfig').findOneByOrFail({ key: KEY })).value
  const withCodes = (rows, first) => rows.map((row, index) => ({ code: `custom_${first + index}`, label: row.label, eosFactor: row.eosFactor, active: true }))

  // أطول من الحد القديم (500): صف واحد بقيمته كاملة، مفيش صفوف تكملة
  const many = Array.from({ length: 12 }, (_, index) => ({ label: `سبب اختبار السعة رقم ${index + 1} — صف إعداد واحد`, eosFactor: '0.25' }))
  const saved = ok(await request(U.admin, 'PUT', REASONS, { reasons: [...current, ...many] }))
  assert.deepEqual(customsOf(saved).map(row => row.label), [...current.map(row => row.label), ...many.map(row => row.label)])
  assert.deepEqual(customsOf(saved).slice(current.length).map(row => row.code), many.map((_, index) => `custom_${4 + index}`))
  assert.deepEqual(await onlyRows(), [KEY, `${KEY}_seq`], 'صف القايمة وعدّادها بس')
  const longValue = await storedValue()
  assert.ok(longValue.length > 500, `${longValue.length} حرف في صف واحد`)
  assert.equal(longValue, JSON.stringify([...current, ...withCodes(many, 4)]), 'القيمة المحفوظة = JSON القايمة كلها بترتيبها')
  ok(await request(U.admin, 'PUT', REASONS, { reasons: current }))

  // قريب من الحد: 27 سبب بمسمى 60 حرف (JSON بين 3000 و4000) — بيتحفظ في الصف نفسه
  const label = n => `سبب طويل رقم ${String(n).padStart(2, '0')} ` + 'ح'.repeat(44)
  const near = Array.from({ length: 27 }, (_, index) => ({ label: label(index + 1), eosFactor: '1/3' }))
  assert.ok(near.every(row => row.label.length === 60))
  const nearValue = JSON.stringify([...current, ...withCodes(near, 16)])
  assert.ok(nearValue.length > 3000 && nearValue.length <= 4000, `${nearValue.length}`)
  const full = ok(await request(U.admin, 'PUT', REASONS, { reasons: [...current, ...near] }))
  assert.equal(await storedValue(), nearValue)
  assert.deepEqual(await onlyRows(), [KEY, `${KEY}_seq`])

  // أكتر من 4000 حرف (35 سبب، تحت حد العدد 40): 400 برسالة، ومفيش حاجة اتكتبت ولا رقم كود اتصرف
  const extra = Array.from({ length: 5 }, (_, index) => ({ label: label(28 + index), eosFactor: '1/3' }))
  assert.ok(JSON.stringify([...inputOf(full), ...withCodes(extra, 43)]).length > 4000)
  refused(await request(U.admin, 'PUT', REASONS, { reasons: [...inputOf(full), ...extra] }), 400,
    /قايمة الأسباب كبرت عن المساحة المتاحة \(4000 حرف\) — احذف أسباب مش مستخدمة أو اختصر المسميات/)
  const unchanged = ok(await request(U.admin, 'GET', REASONS))
  assert.equal(unchanged.revision, full.revision); assert.equal(await storedValue(), nearValue)

  ok(await request(U.admin, 'PUT', REASONS, { reasons: current }))
  const again = ok(await request(U.admin, 'PUT', REASONS, { reasons: [...current, { label: 'سبب بعد الحد', eosFactor: '1' }] }))
  assert.equal(customsOf(again).at(-1).code, 'custom_43', 'الرفض ماصرفش أكواد، والمشالة مابترجعش')
  assert.equal((await repo('RequestsConfig').findOneByOrFail({ key: `${KEY}_seq` })).value, '43')
  ok(await request(U.admin, 'PUT', REASONS, { reasons: current }))
  const tooMany = Array.from({ length: 41 }, (_, index) => ({ label: `سبب زيادة ${index + 1}`, eosFactor: '1' }))
  refused(await request(U.admin, 'PUT', REASONS, { reasons: tooMany }), 400, /أقصى عدد للأسباب المخصصة 40/)
})

test('TR-11: الشاشات — المعالج بيعرض المخصص المفعّل، والملف بمسمى الخادم، و«أسباب إنهاء الخدمة» في سياسات النظام', () => {
  const read = file => fs.readFileSync(path.join(apiRoot, '..', file), 'utf8').replace(/\r\n/g, '\n')
  const web = require('../../src/lib/termination-reasons')
  const { TERMINATION_REASON_DISPLAY_LABELS } = require('../src/offboarding/termination-reasons')
  assert.deepEqual(web.TERMINATION_REASON_LABELS, TERMINATION_REASON_DISPLAY_LABELS, 'مسميات الأساسي في الشاشات والخادم واحدة')
  assert.equal(web.terminationReasonLabel('custom_1', 'إنهاء خلال فترة التجربة'), 'إنهاء خلال فترة التجربة')
  assert.equal(web.terminationReasonLabel('dismissal', 'فصل تأديبي (م80)'), 'فصل تأديبي', 'الأساسي بمسماه زي ما هو')
  assert.equal(web.terminationReasonLabel('legacy_code'), 'legacy_code'); assert.equal(web.terminationReasonLabel(null), '—')
  assert.deepEqual(web.activeCustomTerminationReasons([
    { code: 'termination', label: 'x', builtin: true, active: true, eosFactor: '1' },
    { code: 'absence', label: 'انقطاع عن العمل', builtin: false, active: true, eosFactor: '0' },
    { code: 'custom_1', label: 'موقوف', builtin: false, active: false, eosFactor: '1' },
  ]).map(row => row.code), ['absence'])
  assert.equal(web.customTerminationReasonsIssue([{ label: 'انقطاع عن العمل', eosFactor: '0' }, { label: 'نقل خدمات', eosFactor: '1/3' }]), null)
  assert.match(web.customTerminationReasonsIssue([{ label: 'استقالة موثقة', eosFactor: '1' }]), /مستخدم لسبب تاني/)
  assert.match(web.customTerminationReasonsIssue([{ label: 'نقل خدمات', eosFactor: '2' }]), /رقم من 0 لـ 1/)

  const terminate = read('src/app/employees/[id]/terminate/page.tsx')
  assert.ok(terminate.includes('setCustomReasons(activeCustomTerminationReasons(view.reasons))'))
  assert.ok(terminate.includes('{customReasons.map(item => <option key={item.code} value={item.code}>{item.label}</option>)}'))
  assert.ok(read('src/app/offboarding/[id]/page.tsx').includes('terminationReasonLabel(det.terminationReason, det.terminationReasonLabel)'))
  const policies = read('src/app/settings/policies/page.tsx')
  assert.ok(policies.includes("{g.title === 'المسير ونهاية الخدمة' && <TerminationReasonsBlock onSaveConfig={handleSave} pendingConfigCount={dirtyKeys.length} />}"))
  for (const text of ['<p className="text-sm font-medium text-gray-800">أسباب إنهاء الخدمة</p>', '{TERMINATION_REASON_FACTOR_HINT}',
    "reason.eosFactor === null ? 'جدول الاستقالة'", 'saveCustomTerminationReasons(rows.map(', 'عليه {row.usedByCases} ملف']) {
    assert.ok(policies.includes(text), text)
  }
  assert.equal(web.TERMINATION_REASON_FACTOR_HINT, 'النسبة من مكافأة نهاية الخدمة: 0 = بلا مكافأة، 1 = كاملة، أو كسر زي 1/3')
  assert.ok(policies.includes('eosFactor: eosFactor.trim(), active })), revision))'), 'الشاشة بترجّع بصمة القائمة مع الحفظ')
})

test('TR-12: شاشتين مفتوحتين — الحفظ ببصمة قديمة مرفوض 409 ومايرجّعش تعديل التانية، والبصمة الحالية بتعدّي', async () => {
  const first = ok(await request(U.admin, 'GET', REASONS))
  const second = ok(await request(U.admin, 'GET', REASONS))
  assert.equal(first.revision, second.revision)
  const changed = ok(await request(U.admin, 'PUT', REASONS, { revision: second.revision,
    reasons: inputOf(second).map(row => row.code === 'absence' ? { ...row, eosFactor: '1/4' } : row) }))
  assert.notEqual(changed.revision, first.revision)
  refused(await request(U.admin, 'PUT', REASONS, { revision: first.revision, reasons: inputOf(first) }), 409, /اتغيرت من حد تاني/)
  assert.equal(customsOf(ok(await request(U.admin, 'GET', REASONS))).find(row => row.code === 'absence').eosFactor, '1/4', 'تعديل الشاشة التانية فضل')
  const restored = ok(await request(U.admin, 'PUT', REASONS, { revision: changed.revision, reasons: inputOf(first) }))
  assert.equal(restored.revision, first.revision, 'البصمة من المحتوى')
})
