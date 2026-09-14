// الخطوة 9 (مسار R2): ترحيل 20260914_021 على قاعدة SQL مؤقتة عشوائية (جداول مصغرة بالأعمدة التي يلمسها الترحيل فقط).
// يثبت: القيم المؤقتة في الفارغ فقط مع سطر تدقيق، تعطيل «تجديد عقد» مشروط بنقص البيانات، الأرضية والسقف تستبدل null فقط،
// إعادة التشغيل لا تغير شيئًا، والطلب المفتوح يوقف الملف كله (THROW 54101). لا اتصال بقاعدة الشركة.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(apiRoot, '..')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
const { COMPANY_NAME_PLACEHOLDER, JOB_TITLE_PLACEHOLDER } = require('../src/common/data-placeholders')

const database = `hr_r2_step9_test_${crypto.randomBytes(8).toString('hex')}`
const migration = fs.readFileSync(path.join(repoRoot, 'docs/migrations/payroll/20260914_021_r2_step9_data_completion.sql'), 'utf8')
const batches = migration.split(/^\s*GO\s*$/m).map(part => part.trim()).filter(Boolean)
let master, pool, created = false

function assertDisposable() {
  assert.match(database, /^hr_r2_step9_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
}
const connection = name => ({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME || 'sa', password: env.DB_PASSWORD,
  database: name, options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 10000 })
const rows = async query => { assertDisposable(); return (await pool.request().query(query)).recordset }

// نفس دلالة المُرحّل: الملف كله في معاملة واحدة مع XACT_ABORT، والدفعات مفصولة بـ GO
async function applyMigration() {
  assertDisposable()
  const transaction = new sql.Transaction(pool)
  await transaction.begin()
  try {
    await new sql.Request(transaction).batch('SET XACT_ABORT ON')
    for (const batch of batches) await new sql.Request(transaction).batch(batch)
    await transaction.commit()
  } catch (error) {
    try { await transaction.rollback() } catch { /* المعاملة أُلغيت بـ XACT_ABORT */ }
    throw error
  }
}

async function resetFixture({ openRenewal = false, completeContracts = false, floor = 'null', companyName = '' } = {}) {
  assertDisposable()
  await pool.request().batch(`
    IF OBJECT_ID('dbo.requests_config') IS NULL CREATE TABLE dbo.requests_config ([key] nvarchar(100) NOT NULL PRIMARY KEY, [value] nvarchar(500) NULL);
    IF OBJECT_ID('dbo.employees') IS NULL CREATE TABLE dbo.employees (id int NOT NULL PRIMARY KEY, status nvarchar(20) NOT NULL, jobTitle nvarchar(100) NULL,
      contractType nvarchar(20) NULL, contractEnd date NULL);
    IF OBJECT_ID('dbo.employee_status_history') IS NULL CREATE TABLE dbo.employee_status_history (id int IDENTITY(1,1) PRIMARY KEY, employeeId int NOT NULL,
      oldStatus nvarchar(100) NULL, newStatus nvarchar(100) NOT NULL, changedAt datetime2 NOT NULL, reason nvarchar(500) NULL, requestId int NULL,
      changeType nvarchar(20) NULL, fieldName nvarchar(60) NULL, oldValue ntext NULL, newValue ntext NULL, changedByUserId int NULL);
    IF OBJECT_ID('dbo.request_types') IS NULL CREATE TABLE dbo.request_types (code nvarchar(60) NOT NULL PRIMARY KEY, isActive bit NOT NULL);
    IF OBJECT_ID('dbo.requests') IS NULL CREATE TABLE dbo.requests (id int IDENTITY(1,1) PRIMARY KEY, typeCode nvarchar(60) NOT NULL, status nvarchar(30) NOT NULL);
  `)
  await pool.request().batch(`
    UPDATE dbo.requests SET status = N'COMPLETED';
    UPDATE dbo.employee_status_history SET reason = N'fixture-old';
    MERGE dbo.requests_config AS t USING (VALUES (N'company.name', N'${companyName}'), (N'payroll.policy.net_floor_pct', N'${floor}'),
      (N'payroll.policy.max_deduction_pct_of_gross', N'null'), (N'payroll.policy.min_net_guarantee', N'null')) AS s([key], [value])
      ON t.[key] = s.[key] WHEN MATCHED THEN UPDATE SET [value] = s.[value] WHEN NOT MATCHED THEN INSERT ([key], [value]) VALUES (s.[key], s.[value]);
    MERGE dbo.employees AS t USING (VALUES
      (1, N'active', NULL, NULL, NULL), (2, N'active', N'   ', NULL, NULL), (3, N'active', N'محاسب', N'fixed_term', '2027-01-31'),
      (4, N'terminated', NULL, N'permanent', NULL)) AS s(id, status, jobTitle, contractType, contractEnd)
      ON t.id = s.id WHEN MATCHED THEN UPDATE SET status = s.status, jobTitle = s.jobTitle, contractType = s.contractType, contractEnd = s.contractEnd
      WHEN NOT MATCHED THEN INSERT (id, status, jobTitle, contractType, contractEnd) VALUES (s.id, s.status, s.jobTitle, s.contractType, s.contractEnd);
    MERGE dbo.request_types AS t USING (VALUES (N'CONTRACT_RENEWAL', 1), (N'CONTRACT_TYPE_CHANGE', 1)) AS s(code, isActive)
      ON t.code = s.code WHEN MATCHED THEN UPDATE SET isActive = s.isActive WHEN NOT MATCHED THEN INSERT (code, isActive) VALUES (s.code, s.isActive);
  `)
  if (completeContracts) await pool.request().batch(`UPDATE dbo.employees SET contractType = N'permanent', contractEnd = NULL WHERE status = N'active' AND id <> 3`)
  if (openRenewal) await pool.request().batch(`INSERT INTO dbo.requests (typeCode, status) VALUES (N'CONTRACT_RENEWAL', N'UNDER_REVIEW')`)
}

before(async () => {
  assertDisposable()
  master = await new sql.ConnectionPool(connection('master')).connect()
  await master.request().query(`CREATE DATABASE [${database}]`)
  created = true
  pool = await new sql.ConnectionPool(connection(database)).connect()
}, { timeout: 60000 })

after(async t => {
  const errors = []
  try { if (pool) await pool.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assertDisposable()
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} removed.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'R2 step9 migration fixture cleanup failed')
})

test('ترحيل 021: القيم المؤقتة في الفارغ فقط بسطر تدقيق، «تجديد عقد» معطّل مع نقص البيانات، والأرضية والسقف 50 — وإعادة التشغيل لا تغير شيئًا', async () => {
  await resetFixture()
  await applyMigration()
  const config = Object.fromEntries((await rows(`SELECT [key], [value] FROM dbo.requests_config`)).map(row => [row.key, row.value]))
  assert.equal(config['company.name'], COMPANY_NAME_PLACEHOLDER)
  assert.equal(config['payroll.policy.net_floor_pct'], '50')
  assert.equal(config['payroll.policy.max_deduction_pct_of_gross'], '50')
  assert.equal(config['payroll.policy.min_net_guarantee'], 'null', 'الحد المطلق لا يُخترع')
  const employees = await rows(`SELECT id, jobTitle FROM dbo.employees ORDER BY id`)
  assert.deepEqual(employees.map(row => row.jobTitle), [JOB_TITLE_PLACEHOLDER, JOB_TITLE_PLACEHOLDER, 'محاسب', JOB_TITLE_PLACEHOLDER])
  const audit = await rows(`SELECT employeeId, changeType, fieldName, newStatus, CAST(oldValue AS nvarchar(100)) AS oldValue, CAST(newValue AS nvarchar(100)) AS newValue
    FROM dbo.employee_status_history WHERE reason LIKE N'ترحيل 20260914_021%' ORDER BY employeeId`)
  assert.deepEqual(audit.map(row => row.employeeId), [1, 2, 4])
  assert.ok(audit.every(row => row.changeType === 'TITLE' && row.fieldName === 'jobTitle' && row.newStatus === 'change' && row.newValue === JOB_TITLE_PLACEHOLDER))
  assert.equal(audit.find(row => row.employeeId === 2).oldValue, '   ', 'القيمة القديمة محفوظة كما كانت')
  const types = Object.fromEntries((await rows(`SELECT code, isActive FROM dbo.request_types`)).map(row => [row.code, row.isActive]))
  assert.equal(types.CONTRACT_RENEWAL, false)
  assert.equal(types.CONTRACT_TYPE_CHANGE, true, 'تغيير نوع العقد طريق استكمال البيانات')

  await applyMigration()
  assert.equal((await rows(`SELECT COUNT(*) AS n FROM dbo.employee_status_history WHERE reason LIKE N'ترحيل 20260914_021%'`))[0].n, 3, 'لا أسطر تدقيق مكررة')
  assert.equal((await rows(`SELECT [value] FROM dbo.requests_config WHERE [key] = N'company.name'`))[0].value, COMPANY_NAME_PLACEHOLDER)
})

test('ترحيل 021: قيمة ضبطها المالك لا تُلمس، والنوع يبقى مفعّلًا لو اكتملت بيانات العقود', async () => {
  await resetFixture({ completeContracts: true, floor: '35.5', companyName: 'شركة المالك' })
  await pool.request().batch(`UPDATE dbo.employees SET jobTitle = N'مدير' WHERE id IN (1, 2, 4)`)
  const before = (await rows(`SELECT COUNT(*) AS n FROM dbo.employee_status_history`))[0].n
  await applyMigration()
  const config = Object.fromEntries((await rows(`SELECT [key], [value] FROM dbo.requests_config`)).map(row => [row.key, row.value]))
  assert.equal(config['company.name'], 'شركة المالك')
  assert.equal(config['payroll.policy.net_floor_pct'], '35.5')
  assert.equal(config['payroll.policy.max_deduction_pct_of_gross'], '50')
  assert.equal((await rows(`SELECT COUNT(*) AS n FROM dbo.employee_status_history`))[0].n, before, 'لا مسمى فارغ = لا سطر تدقيق')
  assert.equal((await rows(`SELECT isActive FROM dbo.request_types WHERE code = N'CONTRACT_RENEWAL'`))[0].isActive, true)
})

test('ترحيل 021: طلب تجديد عقد مفتوح يوقف الملف كله (THROW 54101) ولا يبقى أي أثر جزئي', async () => {
  await resetFixture({ openRenewal: true })
  await assert.rejects(applyMigration(), error => error?.number === 54101 || /54101|طلب تجديد عقد مفتوح/.test(String(error?.message)))
  assert.equal((await rows(`SELECT [value] FROM dbo.requests_config WHERE [key] = N'company.name'`))[0].value, '', 'الدفعة الأولى رُجعت')
  assert.equal((await rows(`SELECT COUNT(*) AS n FROM dbo.employees WHERE jobTitle IS NULL`))[0].n, 2)
  assert.equal((await rows(`SELECT isActive FROM dbo.request_types WHERE code = N'CONTRACT_RENEWAL'`))[0].isActive, true)
})
