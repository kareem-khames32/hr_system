// الخطوة 9 (مسار R2 — إعادة العمل بعد المراجعة): ترحيل 20260914_024 بعد 021 على قاعدة SQL مؤقتة عشوائية
// (جداول مصغرة بالأعمدة التي يلمسها الترحيلان فقط). يثبت: إرجاع اسم الشركة والمسميات الأصلية من سطر تدقيق 021 مع سطر تدقيق جديد،
// إرجاع الأرضية والسقف null، إرجاع بيانات فحص الموظف 1 فقط لو كانت قيم الفحص بالضبط، قيم المالك لا تُلمس، إعادة التشغيل لا تغير شيئًا،
// والموظف 1 المشمول في مسير غير ملغى يوقف الملف كله (THROW 54112). لا اتصال بقاعدة الشركة.
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

const database = `hr_r2b_step9_test_${crypto.randomBytes(8).toString('hex')}`
const batchesOf = file => fs.readFileSync(path.join(repoRoot, 'docs/migrations/payroll', file), 'utf8').split(/^\s*GO\s*$/m).map(part => part.trim()).filter(Boolean)
const m021 = batchesOf('20260914_021_r2_step9_data_completion.sql')
const m024 = batchesOf('20260914_024_r2b_step9_placeholder_restore.sql')
const CHECK_REASON = '0 — سريان 2026-09-01 — 2'
let master, pool, created = false

function assertDisposable() {
  assert.match(database, /^hr_r2b_step9_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
}
const connection = name => ({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME || 'sa', password: env.DB_PASSWORD,
  database: name, options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 10000 })
const rows = async query => { assertDisposable(); return (await pool.request().query(query)).recordset }
const config = async () => Object.fromEntries((await rows(`SELECT [key], [value] FROM dbo.requests_config`)).map(row => [row.key, row.value]))

// نفس دلالة المُرحّل: الملف كله في معاملة واحدة مع XACT_ABORT، والدفعات مفصولة بـ GO
async function apply(batches) {
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

async function resetFixture({ companyName = '', floor = 'null', cap = 'null', employee1Basic = 10000, historyReason = '0', employee1Run = null } = {}) {
  assertDisposable()
  await pool.request().batch(`
    IF OBJECT_ID('dbo.requests_config') IS NOT NULL DROP TABLE dbo.requests_config;
    IF OBJECT_ID('dbo.employees') IS NOT NULL DROP TABLE dbo.employees;
    IF OBJECT_ID('dbo.employee_status_history') IS NOT NULL DROP TABLE dbo.employee_status_history;
    IF OBJECT_ID('dbo.request_types') IS NOT NULL DROP TABLE dbo.request_types;
    IF OBJECT_ID('dbo.requests') IS NOT NULL DROP TABLE dbo.requests;
    IF OBJECT_ID('dbo.employee_salary_history_versions') IS NOT NULL DROP TABLE dbo.employee_salary_history_versions;
    IF OBJECT_ID('dbo.payroll_run_members') IS NOT NULL DROP TABLE dbo.payroll_run_members;
    IF OBJECT_ID('dbo.payroll_runs') IS NOT NULL DROP TABLE dbo.payroll_runs;
    CREATE TABLE dbo.requests_config ([key] nvarchar(100) NOT NULL PRIMARY KEY, [value] nvarchar(500) NULL);
    CREATE TABLE dbo.employees (id int NOT NULL PRIMARY KEY, status nvarchar(20) NOT NULL, jobTitle nvarchar(100) NULL, contractType nvarchar(30) NULL,
      contractStart date NULL, contractEnd date NULL, joinDate date NULL, basicSalary decimal(18,2) NULL, housingAllowance decimal(18,2) NOT NULL DEFAULT 0,
      transportAllowance decimal(18,2) NOT NULL DEFAULT 0, phoneAllowance decimal(18,2) NULL, workNatureAllowance decimal(18,2) NULL,
      otherAllowance decimal(18,2) NOT NULL DEFAULT 0, currency nvarchar(10) NULL);
    CREATE TABLE dbo.employee_status_history (id int IDENTITY(1,1) PRIMARY KEY, employeeId int NOT NULL, oldStatus nvarchar(100) NULL, newStatus nvarchar(100) NOT NULL,
      changedAt datetime2 NOT NULL, reason nvarchar(500) NULL, requestId int NULL, changeType nvarchar(20) NULL, fieldName nvarchar(60) NULL,
      oldValue ntext NULL, newValue ntext NULL, changedByUserId int NULL);
    CREATE TABLE dbo.request_types (code nvarchar(60) NOT NULL PRIMARY KEY, isActive bit NOT NULL);
    CREATE TABLE dbo.requests (id int IDENTITY(1,1) PRIMARY KEY, typeCode nvarchar(60) NOT NULL, status nvarchar(30) NOT NULL);
    CREATE TABLE dbo.employee_salary_history_versions (id int IDENTITY(1,1) PRIMARY KEY, employeeId int NOT NULL, revision int NOT NULL,
      reason nvarchar(500) NOT NULL, evidenceReference nvarchar(200) NOT NULL, contractVersion nvarchar(60) NULL);
    CREATE TABLE dbo.payroll_runs (id int NOT NULL PRIMARY KEY, status nvarchar(20) NOT NULL);
    CREATE TABLE dbo.payroll_run_members (id int IDENTITY(1,1) PRIMARY KEY, runId int NOT NULL, employeeId int NOT NULL, membershipStatus nvarchar(20) NOT NULL);
  `)
  await pool.request().batch(`
    INSERT INTO dbo.requests_config ([key], [value]) VALUES (N'company.name', N'${companyName}'), (N'payroll.policy.net_floor_pct', N'${floor}'),
      (N'payroll.policy.max_deduction_pct_of_gross', N'${cap}'), (N'payroll.policy.min_net_guarantee', N'null');
    -- الموظف 1 بقيم فحص 13:33 UTC كما على hr_system، و2 بلا مسمى، و3 مسمى حقيقي، و4 مسافات، و5 منتهٍ بلا مسمى
    INSERT INTO dbo.employees (id, status, jobTitle, contractType, contractStart, contractEnd, joinDate, basicSalary, housingAllowance, transportAllowance,
      phoneAllowance, workNatureAllowance, otherAllowance, currency) VALUES
      (1, N'active', N'مدير النظام', NULL, '2026-09-01', '2027-08-31', '2026-09-01', ${employee1Basic}, 5000, 2500, 1000, 200, 300, N'EGP'),
      (2, N'active', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, NULL, NULL, 0, NULL),
      (3, N'active', N'محاسب', N'fixed_term', '2026-01-01', '2027-01-31', '2026-01-01', 7000, 0, 0, 0, 0, 0, N'SAR'),
      (4, N'active', N'   ', NULL, NULL, NULL, NULL, NULL, 0, 0, NULL, NULL, 0, NULL),
      (5, N'terminated', NULL, N'permanent', NULL, NULL, NULL, NULL, 0, 0, NULL, NULL, 0, NULL);
    INSERT INTO dbo.employee_status_history (employeeId, newStatus, changedAt, reason, changeType, fieldName, oldValue, newValue, changedByUserId) VALUES
      (1, N'change', '2026-09-14T13:33:42', N'${CHECK_REASON}', N'SALARY', N'basicSalary', NULL, N'"10000.00"', 1),
      (1, N'change', '2026-09-14T13:33:42', N'تعديل من ملف الموظف', N'CONTRACT', N'contractEnd', NULL, N'"2027-08-31"', 1);
    INSERT INTO dbo.employee_salary_history_versions (employeeId, revision, reason, evidenceReference, contractVersion) VALUES (1, 1, N'${historyReason}', N'2', NULL);
    INSERT INTO dbo.request_types (code, isActive) VALUES (N'CONTRACT_RENEWAL', 1), (N'CONTRACT_TYPE_CHANGE', 1);
    INSERT INTO dbo.payroll_runs (id, status) VALUES (24, N'CANCELLED'), (30, N'CALCULATED');
    INSERT INTO dbo.payroll_run_members (runId, employeeId, membershipStatus) VALUES (24, 1, N'EXCLUDED'), (24, 3, N'INCLUDED');
  `)
  if (employee1Run) await pool.request().batch(`INSERT INTO dbo.payroll_run_members (runId, employeeId, membershipStatus) VALUES (${employee1Run}, 1, N'INCLUDED')`)
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
  if (errors.length) throw new AggregateError(errors, 'R2b step9 restore fixture cleanup failed')
})

test('ترحيل 024 بعد 021: اسم الشركة والمسميات تعود لقيمها الأصلية بسطر تدقيق، الأرضية والسقف null، والموظف 1 يعود لما قبل الفحص — وإعادة التشغيل لا تغير شيئًا', async () => {
  await resetFixture()
  await apply(m021)
  assert.equal((await config())['company.name'], COMPANY_NAME_PLACEHOLDER, 'حالة hr_system بعد 021')
  assert.equal((await config())['payroll.policy.net_floor_pct'], '50')

  await apply(m024)
  const after = await config()
  assert.equal(after['company.name'], '', 'الفارغ الأصلي')
  assert.equal(after['payroll.policy.net_floor_pct'], 'null')
  assert.equal(after['payroll.policy.max_deduction_pct_of_gross'], 'null')
  assert.equal(after['payroll.policy.min_net_guarantee'], 'null')
  const titles = await rows(`SELECT id, jobTitle FROM dbo.employees ORDER BY id`)
  assert.deepEqual(titles.map(row => row.jobTitle), ['مدير النظام', null, 'محاسب', '   ', null], 'القيمة القديمة من سطر تدقيق 021 بالضبط')
  const restoreRows = await rows(`SELECT employeeId, changeType, fieldName, CAST(oldValue AS nvarchar(200)) AS oldValue, CAST(newValue AS nvarchar(200)) AS newValue
    FROM dbo.employee_status_history WHERE reason LIKE N'ترحيل 20260914[_]024%' AND fieldName = N'jobTitle' ORDER BY employeeId`)
  assert.deepEqual(restoreRows.map(row => [row.employeeId, row.changeType, row.oldValue, row.newValue]),
    [[2, 'TITLE', JOB_TITLE_PLACEHOLDER, null], [4, 'TITLE', JOB_TITLE_PLACEHOLDER, '   '], [5, 'TITLE', JOB_TITLE_PLACEHOLDER, null]])

  const employee1 = (await rows(`SELECT basicSalary, housingAllowance, transportAllowance, phoneAllowance, workNatureAllowance, otherAllowance, currency,
    CONVERT(varchar(10), joinDate, 23) AS joinDate, contractStart, contractEnd, jobTitle FROM dbo.employees WHERE id = 1`))[0]
  assert.deepEqual({ ...employee1, housingAllowance: Number(employee1.housingAllowance), transportAllowance: Number(employee1.transportAllowance), otherAllowance: Number(employee1.otherAllowance) },
    { basicSalary: null, housingAllowance: 0, transportAllowance: 0, phoneAllowance: null, workNatureAllowance: null, otherAllowance: 0, currency: null,
      joinDate: null, contractStart: null, contractEnd: null, jobTitle: 'مدير النظام' })
  const audit1 = await rows(`SELECT changeType, fieldName, CAST(oldValue AS nvarchar(40)) AS oldValue, CAST(newValue AS nvarchar(40)) AS newValue
    FROM dbo.employee_status_history WHERE employeeId = 1 AND reason LIKE N'ترحيل 20260914[_]024%' ORDER BY id`)
  assert.equal(audit1.length, 10)
  assert.deepEqual(audit1.find(row => row.fieldName === 'basicSalary'), { changeType: 'SALARY', fieldName: 'basicSalary', oldValue: '"10000.00"', newValue: null })
  assert.deepEqual(audit1.find(row => row.fieldName === 'housingAllowance'), { changeType: 'SALARY', fieldName: 'housingAllowance', oldValue: '"5000.00"', newValue: '"0.00"' })
  assert.deepEqual(audit1.find(row => row.fieldName === 'joinDate'), { changeType: 'DATA', fieldName: 'joinDate', oldValue: '"2026-09-01"', newValue: null })
  assert.equal((await rows(`SELECT COUNT(*) AS n FROM dbo.employee_salary_history_versions WHERE employeeId = 1`))[0].n, 1, 'سجل الأجر الملحق لا يُحذف')

  const auditCount = (await rows(`SELECT COUNT(*) AS n FROM dbo.employee_status_history`))[0].n
  await apply(m024)
  assert.equal((await rows(`SELECT COUNT(*) AS n FROM dbo.employee_status_history`))[0].n, auditCount, 'لا أسطر تدقيق مكررة')
  assert.equal((await config())['company.name'], '')
  // 021 على البيانات المُرجعة يعيد القيم المؤقتة — ولهذا 024 بعده في الدفتر؛ ترتيب الملفات بالاسم يضمن ذلك
  assert.ok('20260914_021_r2_step9_data_completion.sql' < '20260914_024_r2b_step9_placeholder_restore.sql')
})

test('ترحيل 024: قيم المالك لا تُلمس — اسم حقيقي، أرضية 35.5، ملف الموظف 1 بعد تعديل حقيقي، وسجل أجر بسبب حقيقي', async () => {
  await resetFixture({ companyName: 'شركة المالك', floor: '35.5', cap: '40', employee1Basic: 12000 })
  const before = (await rows(`SELECT COUNT(*) AS n FROM dbo.employee_status_history`))[0].n
  await apply(m024)
  const after = await config()
  assert.equal(after['company.name'], 'شركة المالك')
  assert.equal(after['payroll.policy.net_floor_pct'], '35.5')
  assert.equal(after['payroll.policy.max_deduction_pct_of_gross'], '40')
  assert.equal(Number((await rows(`SELECT basicSalary FROM dbo.employees WHERE id = 1`))[0].basicSalary), 12000, 'ليست قيم الفحص بالضبط')
  assert.equal((await rows(`SELECT COUNT(*) AS n FROM dbo.employee_status_history`))[0].n, before, 'بلا قيمة مؤقتة ولا قيم فحص = بلا سطر تدقيق')

  await resetFixture({ historyReason: 'قرار زيادة موثق' })
  await apply(m024)
  assert.equal(Number((await rows(`SELECT basicSalary FROM dbo.employees WHERE id = 1`))[0].basicSalary), 10000, 'مراجعة أجر بسبب حقيقي = قرار لا يُلمس')

  // قيمة مؤقتة حُفظت بلا سطر تدقيق من 021: المسمى الحقيقي غير معروف ← NULL مع سطر تدقيق
  await resetFixture()
  await pool.request().batch(`UPDATE dbo.employees SET jobTitle = N'${JOB_TITLE_PLACEHOLDER}' WHERE id = 3`)
  await apply(m024)
  assert.equal((await rows(`SELECT jobTitle FROM dbo.employees WHERE id = 3`))[0].jobTitle, null)
  const row = (await rows(`SELECT CAST(oldValue AS nvarchar(200)) AS oldValue, CAST(newValue AS nvarchar(200)) AS newValue FROM dbo.employee_status_history
    WHERE employeeId = 3 AND reason LIKE N'ترحيل 20260914[_]024%'`))
  assert.deepEqual(row, [{ oldValue: JOB_TITLE_PLACEHOLDER, newValue: null }])
})

test('ترحيل 024: الموظف 1 مشمول بقيم الفحص في مسير غير ملغى يوقف الملف كله (THROW 54112) ولا يبقى أي أثر جزئي', async () => {
  await resetFixture({ employee1Run: 30 })
  await apply(m021)
  await assert.rejects(apply(m024), error => error?.number === 54112 || /54112|مشمول في مسير غير ملغى/.test(String(error?.message)))
  assert.equal((await config())['company.name'], COMPANY_NAME_PLACEHOLDER, 'الدفعة الأولى رُجعت')
  assert.equal((await config())['payroll.policy.net_floor_pct'], '50')
  assert.equal((await rows(`SELECT COUNT(*) AS n FROM dbo.employees WHERE jobTitle = N'${JOB_TITLE_PLACEHOLDER}'`))[0].n, 3)
  assert.equal(Number((await rows(`SELECT basicSalary FROM dbo.employees WHERE id = 1`))[0].basicSalary), 10000)
  assert.equal((await rows(`SELECT COUNT(*) AS n FROM dbo.employee_status_history WHERE reason LIKE N'ترحيل 20260914[_]024%'`))[0].n, 0)
})
