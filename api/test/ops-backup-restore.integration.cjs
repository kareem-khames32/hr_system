'use strict'
// B1.13 على SQL حقيقي: النسخ الاحتياطي وتجربة الاسترجاع على قاعدة مؤقتة عشوائية (hr_opsbackup_test_<16 hex>) بتتمسح في الآخر —
// لا مساس بقاعدة الشركة. نسخة كاملة متحقق منها + نسخة برّه ببصمة مطابقة + المرفوعات (الجديد بس، من غير حذف) + مسح القديم بالاسم بس،
// والاسترجاع على قاعدة تجربة بالفحص وعدد الصفوف، وقاعدة التجربة بتتمسح؛ ونسخ الـlog (SIMPLE = شرح، FULL من غير أساس = رسالة، بعد الأساس = نسخة).
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const ops = require('../scripts/ops-backup.cjs')
const restore = require('../scripts/ops-restore-check.cjs')
const migrate = require('../scripts/db-migrate.cjs')

const database = `hr_opsbackup_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_opsbackup_test_[a-f0-9]{16}$/
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-ops-backup-'))
const dir = path.join(root, 'daily'), offsite = path.join(root, 'offsite'), uploads = path.join(root, 'uploads')
let master, created = false
const rehearsals = async () => (await master.request().query("SELECT name FROM sys.databases WHERE name LIKE 'hr[_]migrate[_]rehearsal[_]%'")).recordset.map(row => row.name)

before(async () => {
  assert.match(database, NAME); assert.match(database, migrate.DISPOSABLE_DATABASE); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, requestTimeout: 300000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  await master.request().query(`ALTER DATABASE [${database}] SET RECOVERY SIMPLE`)
  await master.request().batch(`USE [${database}];
    CREATE TABLE dbo.employees (id int IDENTITY PRIMARY KEY, fullName nvarchar(100) NOT NULL);
    CREATE TABLE dbo.app_schema_migrations (id int IDENTITY PRIMARY KEY, [file] nvarchar(200) NOT NULL, appliedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME());
    INSERT dbo.employees(fullName) VALUES (N'موظف تجربة 1'), (N'موظف تجربة 2'), (N'موظف تجربة 3');
    INSERT dbo.app_schema_migrations([file]) VALUES (N'payroll/20261003_083_settlement_payment.sql');
    USE master;`)
  fs.mkdirSync(path.join(uploads, 'employees', '7'), { recursive: true })
  fs.writeFileSync(path.join(uploads, 'employees', '7', 'contract.pdf'), 'pdf-bytes-1')
  fs.writeFileSync(path.join(uploads, 'logo.png'), 'png-bytes')
}, { timeout: 120000 })

after(async t => {
  const errors = []
  try {
    if (created && master) {
      assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`USE master; IF DB_ID(N'${database}') IS NOT NULL BEGIN ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]; END`)
      assert.equal((await master.request().input('d', database).query('SELECT DB_ID(@d) AS id')).recordset[0].id, null)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try { assert.equal(path.dirname(root), os.tmpdir()); fs.rmSync(root, { recursive: true, force: true }) } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'ops backup fixture cleanup failed')
})

test('OB-01: النسخة الكاملة متحقق منها، ونسخة برّه ببصمة مطابقة، والمرفوعات اتنسخت؛ والمرة التانية بتنسخ الجديد بس ومن غير حذف', { timeout: 300000 }, async () => {
  const first = await ops.backup({ database, dir, offsite, uploads })
  assert.equal(first.database, database)
  assert.match(path.basename(first.full.file), new RegExp(`^${database}_daily_\\d{14}_[a-f0-9]{8}\\.bak$`))
  assert.deepEqual([first.full.copyOnly, first.full.checksums, first.full.verifyOnly], [true, true, 'passed'])
  assert.equal(migrate.fileSha256(first.full.file), first.full.sha256)
  assert.equal(first.offsite.sha256, first.full.sha256)
  assert.ok(fs.existsSync(first.offsite.file))
  assert.deepEqual([first.uploads.copied, first.uploads.skipped, first.uploads.missingSource], [2, 0, false])
  assert.equal(fs.readFileSync(path.join(offsite, 'uploads', 'employees', '7', 'contract.pdf'), 'utf8'), 'pdf-bytes-1')

  // ملف جديد + ملف اتمسح من المصدر: الجديد بس بيتنسخ، والممسوح بيفضل في النسخة
  fs.writeFileSync(path.join(uploads, 'employees', '7', 'id-card.png'), 'id-bytes')
  fs.rmSync(path.join(uploads, 'logo.png'))
  const second = await ops.backup({ database, dir, offsite, uploads })
  assert.deepEqual([second.uploads.copied, second.uploads.skipped], [1, 1])
  assert.ok(fs.existsSync(path.join(offsite, 'uploads', 'logo.png')), 'مفيش حذف من النسخة')
  assert.notEqual(second.full.file, first.full.file)
})

test('OB-02: تجربة الاسترجاع على قاعدة باسم مؤقت — CHECKDB وعدد الجداول والصفوف وسجل الترحيلات — والقاعدة المؤقتة بتتمسح، وقاعدة الشركة مابتتلمسش', { timeout: 300000 }, async () => {
  const before = await rehearsals()
  const result = await restore.restoreCheck({ database, dir })
  assert.equal(result.source, database)
  assert.match(result.restoredAs, migrate.REHEARSAL_DATABASE)
  assert.deepEqual([result.checkDb, result.tables, result.rows, result.keyTables.employees, result.migrations.applied], ['passed', 2, 4, 3, 1])
  assert.equal(path.basename(result.file), path.basename(restore.latestDaily(dir, database)), 'آخر نسخة')
  assert.deepEqual(await rehearsals(), before, 'قاعدة التجربة اتمسحت')
  assert.equal((await master.request().input('d', result.restoredAs).query('SELECT DB_ID(@d) AS id')).recordset[0].id, null)
})

test('OB-03: مسح القديم بالاسم بس، ورفض أي قاعدة مش الشركة ولا مؤقتة، ورفض مكان «برّه» هو نفس مجلد النسخ', { timeout: 300000 }, async () => {
  const old = path.join(dir, `${database}_daily_20200101000000_deadbeef.bak`), other = path.join(dir, 'notes-2020.txt')
  fs.writeFileSync(old, 'old'); fs.writeFileSync(other, 'keep')
  const past = new Date(Date.now() - 40 * 86_400_000)
  fs.utimesSync(old, past, past); fs.utimesSync(other, past, past)
  assert.deepEqual(ops.pruneOld(dir, database, 30), [path.basename(old)])
  assert.ok(fs.existsSync(other), 'ملف مش بتاع السكربت مابيتمسحش')
  assert.ok(fs.readdirSync(dir).some(name => /_daily_\d{14}_[a-f0-9]{8}\.bak$/.test(name)), 'النسخ الجديدة فضلت')

  await assert.rejects(ops.backup({ database: 'hr_review_pre_payroll_20260914', dir }), /مش قاعدة الشركة/)
  await assert.rejects(ops.backup({ database: 'master', dir }), /مش قاعدة الشركة/)
  await assert.rejects(ops.backup({ database, dir, offsite: dir }), /مكان تاني/)
  assert.throws(() => ops.parseArgs(['--keep-days']), /محتاج قيمة/)
  assert.deepEqual(ops.parseArgs(['--log', '--keep-days', '14', '--dir', 'x']), { log: true, keepDays: '14', dir: 'x' })
  await assert.rejects(migrate.restoreCopy(master, 'x.bak', env.DB_DATABASE), /قاعدة مؤقتة فقط/)
})

test('OB-04: نسخ الـlog — SIMPLE شرح من غير فشل، وFULL من غير أساس رسالة واضحة، وبعد الأساس نسخة متحقق منها', { timeout: 300000 }, async () => {
  const simple = await ops.backup({ database, dir, log: true })
  assert.deepEqual([simple.log.status, simple.log.recoveryModel], ['SKIPPED', 'SIMPLE'])
  assert.match(simple.log.message, /قرار المالك/)
  await master.request().query(`ALTER DATABASE [${database}] SET RECOVERY FULL`)
  await assert.rejects(ops.backup({ database, dir, log: true }), /--log-base/)
  const base = await ops.backup({ database, dir, offsite, logBase: true })
  assert.deepEqual([base.log.status, base.log.kind], ['DONE', 'LOG_BASE'])
  const log = await ops.backup({ database, dir, offsite, log: true })
  assert.deepEqual([log.log.status, log.log.kind], ['DONE', 'LOG'])
  assert.match(path.basename(log.log.file), new RegExp(`^${database}_log_\\d{14}_[a-f0-9]{8}\\.trn$`))
  assert.equal(migrate.fileSha256(log.log.file), log.log.sha256)
  assert.equal(log.log.offsite.sha256, log.log.sha256)
})
