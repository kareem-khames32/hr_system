'use strict'
// B4.1-أ: ترحيلي 133 (جدول الكيانات القانونية) و134 (ربط الفروع وتعبئة الكيانات) على قاعدة مؤقتة عشوائية بتتمسح في الآخر
// (hr_legal_entities_migration_test_<16 hex> — من غير مساس بقاعدة الشركة):
//  LEM-1) فحص نصي: LF من غير BOM، من غير عبارة ممنوعة، وأكواد THROW بتاعة كل ملف، وفريدة بين كل الملفات.
//  LEM-2) على قاعدة synchronize (الجدول والعمود من الكيانات): الملفين بيعدّوا من غير تغيير شكل — شكل الكيان = شكل الترحيل.
//  LEM-3) من غير الجدول والعمود: الترحيلين بيعملوهم، والتعبئة بتعمل كيان لكل دولة من بيانات الشركة وتربط كل فرع بكيان دولته؛ والتكرار آمن؛
//         و134 قبل 133 بيقف، وعمود بشكل تاني بيوقّف 134 قبل أي تغيير.
//  LEM-4) شركة فروعها في دولة واحدة: كيانها بياخد السجل والرقم الضريبي كمان.
// Run (من api/): node --test test/legal-entities-migration.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_legal_entities_migration_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_legal_entities_migration_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-legal-entities-migration-files-'))
const directory = path.resolve(apiRoot, '..', 'docs', 'migrations', 'payroll')
const TABLE_FILE = '20261009_133_legal_entities.sql', LINK_FILE = '20261009_134_branch_legal_entity.sql'
const SA_IBAN = 'SA' + '7'.repeat(22)
let app, master, pool, created = false

function assertDisposable() { assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE) }
const content = file => fs.readFileSync(path.join(directory, file), 'utf8').replace(/\r\n/g, '\n')
const runFile = async file => { assertDisposable(); for (const batch of migrate.splitBatches(content(file))) await pool.request().batch(batch) }
const query = async (text, inputs = {}) => { assertDisposable(); const request = pool.request(); for (const [key, value] of Object.entries(inputs)) request.input(key, value); return (await request.query(text)).recordset }
const columnsOf = async table => (await query(
  `SELECT c.[name], t.[name] AS [type], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity] FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id]
   WHERE c.[object_id] = OBJECT_ID(@table) ORDER BY c.[column_id]`, { table: `dbo.${table}` })).map(row => Object.values(row).join(':'))
const linkColumn = async () => (await columnsOf('branches')).find(row => row.startsWith('legalEntityId:')) ?? null
const errorNumber = async work => { try { await work(); return null } catch (error) { return error.number ?? error.originalError?.info?.number ?? String(error.message).slice(0, 80) } }
const config = async rows => { for (const [key, value] of Object.entries(rows)) await query(`IF EXISTS (SELECT 1 FROM dbo.requests_config WHERE [key] = @key) UPDATE dbo.requests_config SET [value] = @value WHERE [key] = @key
  ELSE INSERT INTO dbo.requests_config ([key], [value]) VALUES (@key, @value)`, { key, value }) }
const branch = async (code, country) => (await query(`INSERT INTO dbo.branches ([name], [code], [country], [insuranceSystem], [isActive], [isHeadquarters]) OUTPUT INSERTED.[id] VALUES (@name, @code, @country, N'NONE', 1, 0)`,
  { name: `فرع ${code}`, code, country }))[0].id
const entities = () => query(`SELECT [id], [name], [nameEn], [country], [currency], [timeZone], [commercialRegister], [taxNumber], [insuranceNumber], [qiwaNumber], [payrollBankName], [payrollIban], [wpsNumber],
  [cycleStartDay], [isActive] FROM dbo.legal_entities ORDER BY [country] DESC, [id]`)
const links = async () => Object.fromEntries((await query('SELECT b.[code], e.[country] FROM dbo.branches b LEFT JOIN dbo.legal_entities e ON e.[id] = b.[legalEntityId] ORDER BY b.[id]')).map(row => [row.code, row.country]))
// قاعدة التجربة بس: رجوع لحالة «قبل الترحيلين»
const reset = async () => { assertDisposable(); await pool.request().batch('UPDATE dbo.branches SET [legalEntityId] = NULL'); await pool.request().batch('ALTER TABLE dbo.branches DROP COLUMN [legalEntityId]'); await pool.request().batch('DROP TABLE dbo.[legal_entities]') }

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  const connection = { server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }
  master = await new sql.ConnectionPool({ ...connection, database: 'master' }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: crypto.randomBytes(48).toString('hex'), UPLOADS_ROOT: uploads })
  // التطبيق بيقوم مرة عشان synchronize يعمل الجداول من الكيانات، وبيتقفل قبل تشغيل الملفات
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  const { MailService } = require('../src/auth/mail.service')
  const mail = app.get(MailService)
  mail.isConfigured = () => false
  mail.send = async () => { throw new Error('no mail in tests') }
  await app.init()
  await app.close(); app = null
  pool = await new sql.ConnectionPool({ ...connection, database }).connect()
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
    assert.equal(path.dirname(path.resolve(uploads)), os.tmpdir()); assert.match(path.basename(uploads), /^hr-legal-entities-migration-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'legal entities migration fixture cleanup failed')
})

test('LEM-1: الملفين LF من غير BOM ومن غير عبارة ممنوعة، وأكواد THROW بتاعتهم فريدة بين كل الملفات', () => {
  for (const [file, codes] of [[TABLE_FILE, [133001, 133002]], [LINK_FILE, [134001, 134002, 134003, 134011, 134012, 134013]]]) {
    const text = content(file)
    assert.notDeepEqual([...fs.readFileSync(path.join(directory, file)).subarray(0, 3)], [0xef, 0xbb, 0xbf], `${file}: من غير BOM`)
    const indexed = require('node:child_process').execFileSync('git', ['ls-files', '--eol', '--', `docs/migrations/payroll/${file}`], { cwd: path.join(apiRoot, '..'), encoding: 'utf8' })
    assert.match(indexed, /^i\/lf\b/, `${file}: LF في المستودع — git add للملف قبل الفحص`)
    assert.deepEqual(migrate.forbiddenStatements(text), [], file)
    assert.deepEqual(migrate.throwCodes(text), codes, file)
    assert.match(migrate.stripComments(text), /\bSET NOCOUNT ON;\s*\nGO\n/, file)
  }
  const link = migrate.stripComments(content(LINK_FILE))
  assert.match(link, /ALTER TABLE dbo\.branches ADD \[legalEntityId\] int NULL;/)
  assert.doesNotMatch(link, /\bDEFAULT\b/i, 'العمود من غير افتراضي')
  assert.doesNotMatch(link, /UPDATE dbo\.requests_config|INSERT INTO dbo\.requests_config/i, 'مفاتيح الشركة مابتتغيّرش')
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات')
})

test('LEM-2: على قاعدة synchronize الملفين بيعدّوا من غير تغيير شكل — شكل الكيان = شكل الترحيل', async () => {
  const table = await columnsOf('legal_entities'), column = await linkColumn()
  assert.ok(table.length === 16 && column, 'الجدول والعمود اتعملوا من الكيانات')
  assert.equal(await errorNumber(() => runFile(TABLE_FILE)), null, 'فحص «قبل» وقف على جدول الكيان — الشكلين مختلفين')
  assert.equal(await errorNumber(() => runFile(LINK_FILE)), null, 'فحص «قبل» وقف على عمود الكيان — الشكلين مختلفين')
  assert.deepEqual([await columnsOf('legal_entities'), await linkColumn(), (await entities()).length], [table, column, 0], 'من غير فروع مفيش كيانات')
})

test('LEM-3: من غير الجدول والعمود الترحيلين بيعملوهم، والتعبئة كيان لكل دولة من بيانات الشركة وكل فرع بكيان دولته، والتكرار آمن', async () => {
  const table = await columnsOf('legal_entities'), column = await linkColumn()
  await reset()
  await config({ 'company.name': '  شركة مهارة  ', 'company.name_en': 'Maharah', 'company.commercial_register': '1010101010', 'company.vat_number': '300000000000003',
    'company.gosi_establishment_number': '55555', 'company.eg_insurance_establishment_number': '77777', 'company.qiwa_establishment_number': '7-1234', 'company.payroll_bank_name': 'بنك الرياض',
    'company.payroll_iban': SA_IBAN.toLowerCase(), 'company.wps_establishment_id': '900' })
  await branch('M_RUH', 'SA'); await branch('M_JED', ' sa '); await branch('M_CAI', 'EG'); await branch('M_NONE', null); await branch('M_DXB', 'AE')
  const configBefore = await query(`SELECT [key], [value] FROM dbo.requests_config WHERE [key] LIKE N'company.%' ORDER BY [key]`)

  // 134 قبل 133 بيقف من غير ما يضيف العمود
  assert.deepEqual([await errorNumber(() => runFile(LINK_FILE)), await linkColumn()], [134001, null])
  assert.equal(await errorNumber(() => runFile(TABLE_FILE)), null)
  assert.deepEqual(await columnsOf('legal_entities'), table, 'نفس شكل الكيان')
  // عمود بنفس الاسم وبشكل تاني: 134 بيقف قبل أي تغيير
  await pool.request().batch('ALTER TABLE dbo.branches ADD [legalEntityId] nvarchar(10) NULL')
  assert.deepEqual([await errorNumber(() => runFile(LINK_FILE)), (await entities()).length], [134003, 0])
  await pool.request().batch('ALTER TABLE dbo.branches DROP COLUMN [legalEntityId]')

  assert.equal(await errorNumber(() => runFile(LINK_FILE)), null)
  assert.equal(await linkColumn(), column, 'نفس شكل عمود الكيان')
  const rows = (await entities()).map(({ id: _id, ...row }) => row)
  assert.deepEqual(rows, [
    { name: 'شركة مهارة', nameEn: 'Maharah', country: 'SA', currency: 'SAR', timeZone: null, commercialRegister: '1010101010', taxNumber: '300000000000003', insuranceNumber: '55555', qiwaNumber: '7-1234',
      payrollBankName: 'بنك الرياض', payrollIban: SA_IBAN, wpsNumber: '900', cycleStartDay: null, isActive: true },
    { name: 'شركة مهارة', nameEn: 'Maharah', country: 'EG', currency: 'EGP', timeZone: null, commercialRegister: null, taxNumber: null, insuranceNumber: '77777', qiwaNumber: null,
      payrollBankName: null, payrollIban: null, wpsNumber: null, cycleStartDay: null, isActive: true },
  ], 'أرقام السعودية لكيان السعودية، ورقم التأمينات المصري لكيان مصر، والباقي فاضي')
  assert.deepEqual(await links(), { M_RUH: 'SA', M_JED: 'SA', M_CAI: 'EG', M_NONE: null, M_DXB: null })
  assert.deepEqual(await query(`SELECT [key], [value] FROM dbo.requests_config WHERE [key] LIKE N'company.%' ORDER BY [key]`), configBefore, 'مفاتيح الشركة زي ما هي')

  // التكرار: مفيش كيان تاني، وفرع اتفك ربطه بيتربط (الملف بيتطبق مرة واحدة من المُرحّل — التكرار هنا للأمان)
  const first = await entities()
  assert.equal(await errorNumber(() => runFile(TABLE_FILE)), null)
  assert.equal(await errorNumber(() => runFile(LINK_FILE)), null)
  assert.deepEqual([await entities(), await links()], [first,{ M_RUH: 'SA', M_JED: 'SA', M_CAI: 'EG', M_NONE: null, M_DXB: null }])
  // فرع جديد لدولة لها كيان: مابيتعملش كيان تاني
  await branch('M_ALX', 'EG')
  assert.equal(await errorNumber(() => runFile(LINK_FILE)), null)
  assert.deepEqual([(await entities()).length, (await links()).M_ALX], [2, 'EG'])
})

test('LEM-4: شركة فروعها في دولة واحدة — كيانها بياخد السجل والرقم الضريبي كمان، والآيبان بدولته', async () => {
  await reset()
  await pool.request().batch(`UPDATE dbo.branches SET [country] = N'EG' WHERE [country] IS NOT NULL`)
  await config({ 'company.payroll_iban': 'EG' + '3'.repeat(27), 'company.payroll_bank_name': 'بنك مصر', 'company.name': '' })
  assert.equal(await errorNumber(() => runFile(TABLE_FILE)), null)
  assert.equal(await errorNumber(() => runFile(LINK_FILE)), null)
  const rows = (await entities()).map(({ id: _id, ...row }) => row)
  assert.deepEqual(rows, [{ name: 'كيان مصر', nameEn: 'Maharah', country: 'EG', currency: 'EGP', timeZone: null, commercialRegister: '1010101010', taxNumber: '300000000000003', insuranceNumber: '77777',
    qiwaNumber: null, payrollBankName: 'بنك مصر', payrollIban: 'EG' + '3'.repeat(27), wpsNumber: null, cycleStartDay: null, isActive: true }])
  assert.deepEqual(Object.values(await links()).filter(Boolean).length, 5, 'كل فرع له دولة اتربط')
})
