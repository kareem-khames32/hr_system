'use strict'
// إثبات012 على نسخة011 صناعية ذات سجلات فعلية؛ لا ترحيل على المصدر أو قاعدة المراجعة.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict'), crypto = require('node:crypto'), fs = require('node:fs'), path = require('node:path')
const { pool, env } = require('../scripts/migrations-lib.cjs'), runner = require('../scripts/payroll-migrations.cjs')
const { Employee } = require('../src/employees/employee.entity')
const { EmployeeSalaryHistoryVersion, EmployeeSalaryHistory } = require('../src/payroll/payroll-salary-history.entities')
const { salaryHistoryContentHash, salaryCurrentSourceHash, readSalaryHistory, appendMonthlySalaryHistoryRevision } = require('../src/payroll/payroll-salary-history')
const { selectPayrollPeriodSalary, PAYROLL_MONTHLY_SALARY_HISTORY_VERSION } = require('../src/payroll/payroll-period-salary')
const versions = runner.readMigrations(), old = versions.find(v => v.version === '20260913_011_payroll_salary_history'), addition = versions.find(v => v.version === '20260914_012_payroll_salary_reference_period')
const database = 'hr_payroll_migration_test_' + crypto.randomBytes(8).toString('hex')
const money = { basicSalary: '9999999999999999.99', housingAllowance: '9007199254740991.23', transportAllowance: '200.03', phoneAllowance: '300.04', workNatureAllowance: '400.05', otherAllowance: '500.06' }
const fields = Object.keys(money), legacy = { ...money, currency: 'EGP', effectiveFrom: '2020-01-01', effectiveTo: null }
let master, ds, created = false, employeeId, headerId, original, currentHash, legacyHash
const query = (text, args) => ds.query(text, args)
async function oldBytes() {
  return {
    employee: (await query('SELECT CONVERT(varbinary(max),(SELECT * FROM dbo.employees ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS bytes'))[0].bytes,
    header: (await query('SELECT CONVERT(varbinary(max),(SELECT id,employeeId,revision,reason,evidenceReference,currentSourceHash,contentHash,createdBy,createdAt FROM dbo.employee_salary_history_versions WHERE id=@0 FOR JSON PATH,INCLUDE_NULL_VALUES)) AS bytes', [headerId]))[0].bytes,
    rows: (await query(`SELECT CONVERT(varbinary(max),(SELECT id,versionId,sequence,effectiveFrom,effectiveTo,currency,${fields.join(',')} FROM dbo.employee_salary_history WHERE versionId=@0 ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS bytes`, [headerId]))[0].bytes,
    payroll: (await query('SELECT CONVERT(varbinary(max),(SELECT * FROM dbo.monthly_migration_canary ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS bytes'))[0].bytes,
  }
}
async function absent() {
  const columns = await query("SELECT name FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.employee_salary_history_versions') AND name IN(N'contractVersion',N'cycleStartDay') UNION ALL SELECT name FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.employee_salary_history') AND name IN(N'effectivePayrollPeriod',N'effectiveToPayrollPeriod')")
  assert.deepEqual(columns, []); assert.deepEqual(await query('SELECT version,checksum FROM dbo.payroll_schema_migrations'), [{ version: old.version, checksum: old.checksum }])
  assert.deepEqual(await oldBytes(), original)
}
before(async () => {
  assert.ok(old); assert.ok(addition); assert.match(database, /^hr_payroll_migration_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
  master = await pool('master'); await master.request().query(`CREATE DATABASE [${database}]`); created = true
  ds = await runner.openDataSource(database, [Employee, EmployeeSalaryHistoryVersion, EmployeeSalaryHistory])
  for (const generated of await runner.schemaDiff(ds)) {
    let operations
    try { operations = runner.validateSql(generated) } catch { continue }
    if (operations.length && operations.every(operation => operation.table === 'employees')) for (const operation of operations) await query(operation.sql)
  }
  // إعداد المخطط التاريخي كما نُشر في011 قبل الترحيل الجديد، وتسجيل checksum الحقيقي له.
  for (const operation of old.operations) await query(operation.sql)
  await query('CREATE TABLE dbo.payroll_schema_migrations(version nvarchar(150) NOT NULL PRIMARY KEY,checksum char(64) NOT NULL,appliedAt datetime2 NOT NULL DEFAULT SYSDATETIME())')
  await query('INSERT dbo.payroll_schema_migrations(version,checksum) VALUES(@0,@1)', [old.version, old.checksum])
  await query('CREATE TABLE dbo.monthly_migration_canary(id int PRIMARY KEY, snapshotBytes varbinary(max) NOT NULL, amount decimal(18,2) NOT NULL)')
  await query('INSERT dbo.monthly_migration_canary VALUES(1,0x00FFAABBCCDDEEFF,12345.67)')
  employeeId = (await query(`INSERT dbo.employees(employeeCode,fullName,branchId,joinDate,currency,${fields.join(',')}) OUTPUT INSERTED.id VALUES(N'MIG_MONTHLY',N'دليل تاريخي أصلي',7,'2020-01-01',N'EGP',${fields.map((_, i) => `CAST(@${i} AS decimal(18,2))`).join(',')})`, fields.map(key => money[key])))[0].id
  currentHash = salaryCurrentSourceHash({ ...money, currency: 'EGP' })
  legacyHash = salaryHistoryContentHash({ employeeId, revision: 1, reason: 'دليل قديم', evidenceReference: 'legacy:salary:1', currentSourceHash: currentHash, segments: [legacy] })
  headerId = (await query('INSERT dbo.employee_salary_history_versions(employeeId,revision,reason,evidenceReference,currentSourceHash,contentHash,createdBy) OUTPUT INSERTED.id VALUES(@0,1,@1,@2,@3,@4,9)', [employeeId, 'دليل قديم', 'legacy:salary:1', currentHash, legacyHash]))[0].id
  await query(`INSERT dbo.employee_salary_history(versionId,sequence,effectiveFrom,effectiveTo,currency,${fields.join(',')}) VALUES(@0,1,'2020-01-01',NULL,N'EGP',${fields.map((_, i) => `CAST(@${i + 1} AS decimal(18,2))`).join(',')})`, [headerId, ...fields.map(key => money[key])])
  original = await oldBytes()
}, { timeout: 60000 })
after(async t => {
  try { if (ds?.isInitialized) await ds.destroy() }
  finally {
    try {
      if (created) {
        assert.match(database, /^hr_payroll_migration_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
        await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
        assert.equal((await master.request().input('database', database).query('SELECT DB_ID(@database) AS id')).recordset[0].id, null)
        t.diagnostic(`Cleanup verified: ${database} removed.`)
      }
    } finally { if (master) await master.close() }
  }
})

test('012 يضيف أربعة أعمدةnullable فقط دون تعديل011 أو تعبئة شهر مفترض', async () => {
  assert.equal(addition.operations.length, 4); assert.ok(addition.operations.every(op => op.kind === 'add-column' && / NULL;$/i.test(op.sql)))
  assert.deepEqual(addition.operations.map(op => op.table), ['employee_salary_history_versions', 'employee_salary_history_versions', 'employee_salary_history', 'employee_salary_history'])
  assert.equal(runner.digest(fs.readFileSync(path.resolve(__dirname, '../../docs/migrations/payroll/20260913_011_payroll_salary_history.sql'), 'utf8')), old.checksum)
  assert.doesNotMatch(addition.operations.map(op => op.sql).join('\n'), /\b(?:DEFAULT|INSERT|UPDATE|DELETE|DROP|MERGE|CHECK|FOREIGN)\b/i)
  const plans = await runner.schemaDiff(ds); assert.equal(plans.length, 4)
  for (const plan of plans) assert.equal(runner.classifyMetadataQuery(plan, ds.entityMetadatas).safe, true)
  await absent()
})
test('فشلDDL بعد الإضافات يعيد الأعمدة والـledger والسجلات الأصلية', async () => {
  const broken = { ...addition, operations: [...addition.operations, ...runner.validateSql('CREATE TABLE dbo.monthly_migration_canary(id int NULL);')] }
  await assert.rejects(runner.applyDisposableTest(ds, [old, broken]), /already an object|already exists/i)
  await absent()
})
test('ترحيل غير مكتمل لا يثبت حتى لو نجحت بعض الأعمدة', async () => {
  await assert.rejects(runner.applyDisposableTest(ds, [old, { ...addition, operations: addition.operations.slice(0, -1) }]), /metadata drift remains/)
  await absent()
})
test('الترحيل يحفظ bytes السجل القديم ومبالغه وhashV1 وتبقى أعمدة الشهرnull', async () => {
  const result = await runner.applyDisposableTest(ds, [old, addition])
  assert.deepEqual(result.applied, [addition.version]); assert.deepEqual(result.skipped, [old.version]); assert.deepEqual(await runner.schemaDiff(ds), [])
  assert.deepEqual(await oldBytes(), original)
  assert.deepEqual(await query('SELECT contractVersion,cycleStartDay FROM employee_salary_history_versions WHERE id=@0', [headerId]), [{ contractVersion: null, cycleStartDay: null }])
  assert.deepEqual(await query('SELECT effectivePayrollPeriod,effectiveToPayrollPeriod FROM employee_salary_history WHERE versionId=@0', [headerId]), [{ effectivePayrollPeriod: null, effectiveToPayrollPeriod: null }])
  const history = await ds.transaction('SERIALIZABLE', em => readSalaryHistory(em, employeeId))
  assert.equal(history.version.contentHash, legacyHash); assert.equal(history.version.contractVersion, null); assert.deepEqual(history.segments, [legacy])
  assert.throws(() => selectPayrollPeriodSalary(history, '2026-09'), error => error.code === 'SALARY_PAYROLL_PERIOD_EVIDENCE_REQUIRED')
})
test('بعد012 تحفظ مراجعة شهرية دقيقة جديدة ويظل أصلV1 بلا تعديل', async () => {
  const h = await ds.transaction('SERIALIZABLE', em => appendMonthlySalaryHistoryRevision(em, { employeeId, createdBy: 9, reason: 'قرار شهري صريح', evidenceReference: 'monthly:document',
    currentSourceHash: currentHash, cycleStartDay: 23, periods: [{ ...money, basicSalary: '10000.00', currency: 'EGP', effectivePayrollPeriod: '2026-09', effectiveToPayrollPeriod: null }] }))
  assert.equal(h.revision, 2); assert.equal(h.version.contractVersion, PAYROLL_MONTHLY_SALARY_HISTORY_VERSION)
  assert.equal(selectPayrollPeriodSalary(h, '2026-09').segment.basicSalary, '10000.00')
  assert.equal(selectPayrollPeriodSalary(h, '2026-09').segment.housingAllowance, '9007199254740991.23')
  assert.deepEqual(await oldBytes(), original)
})
test('إعادة الترحيل آمنة وتغييرchecksum لا يغير بيانات المراجعات', async () => {
  const before = await query('SELECT * FROM employee_salary_history_versions ORDER BY id'), rows = await query('SELECT * FROM employee_salary_history ORDER BY id')
  const result = await runner.applyDisposableTest(ds, [old, addition])
  assert.deepEqual(result.applied, []); assert.deepEqual(result.skipped, [old.version, addition.version])
  await assert.rejects(runner.applyDisposableTest(ds, [old, { ...addition, checksum: '0'.repeat(64) }]), /missing or has changed/)
  assert.deepEqual(await query('SELECT * FROM employee_salary_history_versions ORDER BY id'), before); assert.deepEqual(await query('SELECT * FROM employee_salary_history ORDER BY id'), rows)
  assert.deepEqual(await oldBytes(), original)
})
