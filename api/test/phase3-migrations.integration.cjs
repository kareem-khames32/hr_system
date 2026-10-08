'use strict'
// ترحيلات المرحلة 3 اللي كل واحد فيها جدول جديد بقالب واحد (105–114) على قاعدة مؤقتة عشوائية بتتمسح في الآخر (hr_p3_migrations_test_<16 hex> — لا
// مساس بقاعدة الشركة):
//  P3M-1) فحص نصي لكل ملف: LF من غير BOM، من غير عبارة ممنوعة، وكودين THROW بتوعه، وأكواد THROW فريدة بين كل الملفات.
//  P3M-2) على قاعدة synchronize (الجداول من الكيانات): كل ملف بيعدّي من غير تغيير — يعني شكل الكيان = شكل الترحيل بالظبط (فحص «قبل» بيقف لو اختلف).
//  P3M-3) من غير الجدول: الملف بيعمله بنفس الشكل؛ وتشغيله تاني آمن؛ وجدول بنفس الاسم وبشكل تاني بيوقّف الترحيل قبل أي تغيير.
// Run (من api/): node --test test/phase3-migrations.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_p3_migrations_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_p3_migrations_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-p3-migrations-files-'))
const directory = path.resolve(apiRoot, '..', 'docs', 'migrations', 'payroll')
// الملف، وجدوله، وكوده
const FILES = [
  ['20261008_105_candidate_applications.sql', 'candidate_applications', 105], ['20261008_106_candidate_stage_log.sql', 'candidate_stage_log', 106],
  ['20261008_107_candidate_interviews.sql', 'candidate_interviews', 107], ['20261008_108_interview_scorecards.sql', 'interview_scorecards', 108],
  ['20261009_109_candidate_offers.sql', 'candidate_offers', 109], ['20261009_110_performance_goals.sql', 'performance_goals', 110],
  ['20261009_111_performance_goal_updates.sql', 'performance_goal_updates', 111], ['20261009_112_review_templates.sql', 'review_templates', 112],
  ['20261009_113_review_cycles.sql', 'review_cycles', 113], ['20261009_114_review_assignments.sql', 'review_assignments', 114],
  ['20261009_115_review_responses.sql', 'review_responses', 115], ['20261009_116_review_reward_suggestions.sql', 'review_reward_suggestions', 116],
  ['20261009_117_training_courses.sql', 'training_courses', 117], ['20261009_118_training_sessions.sql', 'training_sessions', 118],
  ['20261009_119_training_enrollments.sql', 'training_enrollments', 119], ['20261009_120_training_plans.sql', 'training_plans', 120],
  ['20261009_121_training_requirements.sql', 'training_requirements', 121], ['20261009_122_request_service_ratings.sql', 'request_service_ratings', 122],
  ['20261009_123_kb_articles.sql', 'kb_articles', 123], ['20261009_124_hr_cases.sql', 'hr_cases', 124],
  ['20261009_125_hr_case_parties.sql', 'hr_case_parties', 125], ['20261009_126_hr_case_events.sql', 'hr_case_events', 126],
  ['20261009_127_penalty_violations.sql', 'penalty_violations', 127], ['20261009_128_employee_penalties.sql', 'employee_penalties', 128],
  ['20261009_129_surveys.sql', 'surveys', 129], ['20261009_130_survey_invitations.sql', 'survey_invitations', 130], ['20261009_131_survey_responses.sql', 'survey_responses', 131],
]
let app, master, pool, created = false

function assertDisposable() { assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE) }
// نسخة الشغل ممكن تبقى CRLF على ويندوز؛ المهم LF في المستودع (بيتفحص من فهرس git)
const content = file => fs.readFileSync(path.join(directory, file), 'utf8').replace(/\r\n/g, '\n')
const runFile = async file => { assertDisposable(); for (const batch of migrate.splitBatches(content(file))) await pool.request().batch(batch) }
const columnsOf = async table => (await pool.request().input('table', sql.NVarChar, `dbo.${table}`).query(
  `SELECT c.[name], t.[name] AS [type], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity] FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id]
   WHERE c.[object_id] = OBJECT_ID(@table) ORDER BY c.[column_id]`)).recordset.map(row => Object.values(row).join(':'))
const errorNumber = async work => { try { await work(); return null } catch (error) { return error.number ?? error.originalError?.info?.number ?? String(error.message).slice(0, 80) } }

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
    assert.equal(path.dirname(path.resolve(uploads)), os.tmpdir()); assert.match(path.basename(uploads), /^hr-p3-migrations-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'phase 3 migrations fixture cleanup failed')
})

test('P3M-1: كل ملف LF من غير BOM ومن غير عبارة ممنوعة، وبكودين THROW بتوعه، والأكواد فريدة بين كل الملفات', () => {
  for (const [file, table, code] of FILES) {
    const text = content(file)
    assert.notDeepEqual([...fs.readFileSync(path.join(directory, file)).subarray(0, 3)], [0xef, 0xbb, 0xbf], `${file}: من غير BOM`)
    const indexed = require('node:child_process').execFileSync('git', ['ls-files', '--eol', '--', `docs/migrations/payroll/${file}`], { cwd: path.join(apiRoot, '..'), encoding: 'utf8' })
    assert.match(indexed, /^i\/lf\b/, `${file}: LF في المستودع — git add للملف قبل الفحص`)
    assert.deepEqual(migrate.forbiddenStatements(text), [], file)
    assert.deepEqual(migrate.throwCodes(text), [code * 1000 + 1, code * 1000 + 2], file)
    const statements = migrate.stripComments(text)
    assert.match(statements, new RegExp(`CREATE TABLE dbo\\.${table} \\(`), file)
    assert.doesNotMatch(statements, /\bDEFAULT\b/i, `${file}: من غير افتراضي`)
    assert.match(statements, /\bSET NOCOUNT ON;\s*\nGO\n/, file)
  }
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات')
})

test('P3M-2: على قاعدة synchronize كل ملف بيعدّي من غير تغيير — شكل الكيان = شكل الترحيل', async () => {
  for (const [file, table] of FILES) {
    const before = await columnsOf(table)
    assert.ok(before.length > 3, `${table}: الجدول اتعمل من الكيان`)
    assert.equal(await errorNumber(() => runFile(file)), null, `${file}: فحص «قبل» وقف على جدول الكيان — الشكلين مختلفين`)
    assert.deepEqual(await columnsOf(table), before, `${file}: مفيش تغيير`)
  }
})

test('P3M-3: من غير الجدول الملف بيعمله بنفس الشكل، وتشغيله تاني آمن، وجدول بشكل تاني بيوقّف الترحيل قبل أي تغيير', async () => {
  for (const [file, table, code] of FILES) {
    assertDisposable()
    const fromEntity = await columnsOf(table)
    await pool.request().batch(`DROP TABLE dbo.[${table}]`)
    assert.equal(await errorNumber(() => runFile(file)), null, `${file}: إنشاء`)
    assert.deepEqual(await columnsOf(table), fromEntity, `${file}: نفس شكل الكيان`)
    assert.equal(await errorNumber(() => runFile(file)), null, `${file}: تكرار`)
    // جدول بنفس الاسم وبشكل تاني (عمود زيادة): الترحيل بيقف بكوده الأول ومن غير ما يغيّر حاجة
    await pool.request().batch(`ALTER TABLE dbo.[${table}] ADD [strayColumn] int NULL`)
    const strayed = await columnsOf(table)
    assert.equal(await errorNumber(() => runFile(file)), code * 1000 + 1, `${file}: شكل تاني`)
    assert.deepEqual(await columnsOf(table), strayed, `${file}: مفيش تغيير بعد الوقوف`)
    await pool.request().batch(`ALTER TABLE dbo.[${table}] DROP COLUMN [strayColumn]`)
  }
})
