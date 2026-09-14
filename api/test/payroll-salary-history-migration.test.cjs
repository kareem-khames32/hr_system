'use strict'
// 011 على قاعدة عشوائية مستقلة: إثبات المخطط والتراجع وعدم تعبئة الأجور السابقة.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { pool, env, sql } = require('../scripts/migrations-lib.cjs')
const runner = require('../scripts/payroll-migrations.cjs')
const { Employee } = require('../src/employees/employee.entity')
const { EmployeeSalaryHistoryVersion, EmployeeSalaryHistory } = require('../src/payroll/payroll-salary-history.entities')
const database = 'hr_payroll_migration_test_' + crypto.randomBytes(8).toString('hex')
const addition = runner.readMigrations().find(item => item.version === '20260913_011_payroll_salary_history')
const tables = new Set(['employee_salary_history_versions', 'employee_salary_history'])
const fields = ['basicSalary', 'housingAllowance', 'transportAllowance', 'phoneAllowance', 'workNatureAllowance', 'otherAllowance']
let master, connection, ds, created = false, original, oldColumns, employeeId, employee2Id, headerId, segmentId
const query = async text => (await connection.request().query(text)).recordset
const originalRows = async () => (await connection.request().query(`
  SELECT CONVERT(varbinary(max),(SELECT * FROM dbo.employees ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS bytes;
  SELECT *,CONVERT(varbinary(max),breakdown) AS snapshotBytes FROM dbo.payroll_items ORDER BY id;
  SELECT * FROM dbo.salary_history_migration_canary ORDER BY id;
  SELECT * FROM dbo.app_schema_migrations ORDER BY version;`)).recordsets
const columns = async () => query(`SELECT OBJECT_NAME(c.object_id) AS tableName,c.name,t.name AS typeName,c.max_length,c.precision,c.scale,c.is_nullable,c.is_identity,
  dc.name AS defaultName,dc.definition AS defaultValue FROM sys.columns c JOIN sys.types t ON t.user_type_id=c.user_type_id
  LEFT JOIN sys.default_constraints dc ON dc.object_id=c.default_object_id
  WHERE c.object_id IN(OBJECT_ID(N'dbo.employees'),OBJECT_ID(N'dbo.payroll_items'),OBJECT_ID(N'dbo.salary_history_migration_canary'),OBJECT_ID(N'dbo.app_schema_migrations'))
  ORDER BY c.object_id,c.column_id`)
async function assertAbsent() {
  for (const name of tables) assert.equal((await query(`SELECT OBJECT_ID(N'dbo.${name}',N'U') AS id`))[0].id, null)
  assert.deepEqual(await query('SELECT version,checksum FROM dbo.payroll_schema_migrations'), [])
  assert.deepEqual(await originalRows(), original); assert.deepEqual(await columns(), oldColumns)
}
async function insertHeader(revision = 1, extra = {}) {
  const value = { employeeId, revision, reason: 'إثبات أجر مؤرخ من مستند اختباري', evidenceReference: 'test:salary-document:1',
    currentSourceHash: 'a'.repeat(64), contentHash: 'b'.repeat(64), createdBy: 3, ...extra }
  const request = connection.request()
  for (const [key, data] of Object.entries(value)) request.input(key, ['employeeId', 'revision', 'createdBy'].includes(key) ? sql.Int : sql.NVarChar(1000), data)
  return (await request.query(`INSERT dbo.employee_salary_history_versions(employeeId,revision,reason,evidenceReference,currentSourceHash,contentHash,createdBy)
    OUTPUT INSERTED.id VALUES(@employeeId,@revision,@reason,@evidenceReference,@currentSourceHash,@contentHash,@createdBy)`)).recordset[0].id
}
async function insertSegment(sequence = 1, extra = {}) {
  const value = { versionId: headerId, sequence, effectiveFrom: '2026-01-01', effectiveTo: null, currency: 'SAR',
    basicSalary: '9000.01', housingAllowance: '100.02', transportAllowance: '200.03', phoneAllowance: '300.04', workNatureAllowance: '400.05', otherAllowance: '500.06', ...extra }
  const request = connection.request()
  for (const [key, data] of Object.entries(value)) request.input(key, ['versionId', 'sequence'].includes(key) ? sql.Int : sql.NVarChar(1000), data)
  return (await request.query(`INSERT dbo.employee_salary_history(versionId,sequence,effectiveFrom,effectiveTo,currency,${fields.join(',')})
    OUTPUT INSERTED.id VALUES(@versionId,@sequence,@effectiveFrom,@effectiveTo,@currency,${fields.map(field => `CAST(@${field} AS decimal(18,2))`).join(',')})`)).recordset[0].id
}
async function newRows() {
  return (await connection.request().query(`SELECT CONVERT(varbinary(max),(SELECT * FROM dbo.employee_salary_history_versions ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS bytes;
    SELECT CONVERT(varbinary(max),(SELECT * FROM dbo.employee_salary_history ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS bytes;
    SELECT * FROM dbo.payroll_schema_migrations ORDER BY version;`)).recordsets
}

before(async () => {
  assert.ok(addition); assert.match(database, /^hr_payroll_migration_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
  master = await pool('master'); await master.request().query(`CREATE DATABASE [${database}]`); created = true
  connection = await pool(database)
  ds = await runner.openDataSource(database, [Employee, EmployeeSalaryHistoryVersion, EmployeeSalaryHistory])
  // هذا الاختبار يثبت عقد011 التاريخي؛ أعمدة012 تختبر مستقلًا ولا تُنسب إلى011.
  for (const metadata of ds.entityMetadatas) {
    const later = metadata.tableName === 'employee_salary_history_versions' ? ['contractVersion', 'cycleStartDay'] : metadata.tableName === 'employee_salary_history' ? ['effectivePayrollPeriod', 'effectiveToPayrollPeriod'] : []
    metadata.columns = metadata.columns.filter(column => !later.includes(column.databaseName))
    metadata.ownColumns = metadata.ownColumns.filter(column => !later.includes(column.databaseName))
  }
  // إنشاء جدول الموظف الصناعي من metadata الفعلية داخل القاعدة المؤقتة فقط، قبل تشغيل011.
  for (const generated of await runner.schemaDiff(ds)) {
    let operations
    try { operations = runner.validateSql(generated) } catch { continue }
    if (operations.length && operations.every(operation => operation.table === 'employees')) for (const operation of operations) await ds.query(operation.sql)
  }
  await connection.request().batch(`CREATE TABLE dbo.payroll_schema_migrations(version nvarchar(150) NOT NULL PRIMARY KEY,checksum char(64) NOT NULL,appliedAt datetime2 NOT NULL DEFAULT SYSDATETIME());
    CREATE TABLE dbo.payroll_items(id int PRIMARY KEY,netPay decimal(18,2) NOT NULL,breakdown nvarchar(max) NOT NULL);
    INSERT dbo.payroll_items VALUES(44,12500.17,N'{"net":"12500.17","original":"لا تغير"}');
    CREATE TABLE dbo.salary_history_migration_canary(id int PRIMARY KEY,originalBytes varbinary(max) NOT NULL,note nvarchar(100) NOT NULL);
    INSERT dbo.salary_history_migration_canary VALUES(1,0x00FFAABBCCDDEEFF,N'تاريخ مستقل ثابت');
    CREATE TABLE dbo.app_schema_migrations(version nvarchar(100) PRIMARY KEY,checksum char(64) NOT NULL);
    INSERT dbo.app_schema_migrations VALUES(N'prepayroll_fixture',REPLICATE('c',64));`)
  employeeId = (await query(`INSERT dbo.employees(employeeCode,fullName,branchId,joinDate,basicSalary,housingAllowance,transportAllowance,phoneAllowance,workNatureAllowance,otherAllowance)
    OUTPUT INSERTED.id VALUES(N'SALARY_HIST_1',N'موظف تاريخي',7,'2020-01-01',9999999999999999.99,100.01,200.02,NULL,NULL,300.03)`))[0].id
  employee2Id = (await query("INSERT dbo.employees(employeeCode,fullName,branchId,joinDate,basicSalary) OUTPUT INSERTED.id VALUES(N'SALARY_HIST_2',N'موظف آخر',8,'2021-02-01',7500.25)"))[0].id
  original = await originalRows(); oldColumns = await columns()
}, { timeout: 60000 })
after(async () => {
  try {
    if (ds?.isInitialized) await ds.destroy()
    if (connection) await connection.close()
  } finally {
    try {
      if (created) {
        assert.match(database, /^hr_payroll_migration_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
        await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
        assert.equal((await master.request().input('database', database).query('SELECT DB_ID(@database) AS id')).recordset[0].id, null)
        console.log(JSON.stringify({ database, removed: true }))
      }
    } finally { if (master) await master.close() }
  }
})

test('011 contains only two new tables and two unique indexes, with no existing-table writes or salary backfill', async () => {
  assert.equal(addition.operations.length, 4)
  assert.deepEqual(new Set(addition.operations.filter(operation => operation.kind === 'create-table').map(operation => operation.table)), tables)
  assert.equal(addition.operations.filter(operation => operation.kind === 'create-index').length, 2)
  assert.equal(addition.operations.flatMap(operation => operation.foreignKeys || []).length, 2)
  assert.ok(addition.operations.every(operation => tables.has(operation.table) && ['create-table', 'create-index'].includes(operation.kind)))
  const authored = fs.readFileSync(path.resolve(__dirname, '../../docs/migrations/payroll/20260913_011_payroll_salary_history.sql'), 'utf8')
  assert.doesNotMatch(authored, /\b(?:INSERT|MERGE|ALTER|DELETE\s+FROM|UPDATE\s+dbo|SELECT\s+INTO|DROP|TRUNCATE)\b/i)
  await assertAbsent()
})

test('011 employee FK exception is exact and does not permit unrelated legacy references, cascade or ALTER constraints', () => {
  const header = addition.operations[0].sql
  assert.doesNotThrow(() => runner.validateSql(header))
  for (const forged of [
    header.replace('FK_employee_salary_history_employee', 'FK_forged'),
    header.replace('dbo.[employee_salary_history_versions]', 'dbo.[other_salary_history]'),
    header.replace('REFERENCES dbo.[employees]', 'REFERENCES dbo.[users]'),
    header.replace('FOREIGN KEY ([employeeId])', 'FOREIGN KEY ([createdBy])'),
    header.replace('REFERENCES dbo.[employees] ([id])', 'REFERENCES dbo.[employees] ([branchId])'),
    header.replace('REFERENCES dbo.[employees]', 'REFERENCES otherdb.dbo.[employees]'),
    header.replace('ON DELETE NO ACTION', 'ON DELETE CASCADE'), header.replace('ON UPDATE NO ACTION', 'ON UPDATE CASCADE'),
    header.replace('ON DELETE NO ACTION', ''),
    'ALTER TABLE dbo.employee_salary_history_versions ADD CONSTRAINT FK_employee_salary_history_employee FOREIGN KEY(employeeId) REFERENCES dbo.employees(id) ON DELETE NO ACTION ON UPDATE NO ACTION;',
    header + ' UPDATE dbo.employees SET basicSalary=0;',
  ]) assert.throws(() => runner.validateSql(forged), undefined, forged)
})

test('011 metadata plans prove new source, exact employee INT primary key and both NO ACTION relationships', async () => {
  const diff = await runner.schemaDiff(ds), evidence = []
  for (const text of diff) {
    const classified = runner.classifyMetadataQuery(text, ds.entityMetadatas, tables)
    assert.equal(classified.safe, true, text)
    if (classified.newTableForeignKeyEvidence) evidence.push(classified.newTableForeignKeyEvidence)
  }
  assert.equal(evidence.length, 2)
  const salaryEvidence = evidence.find(item => item.name === 'FK_employee_salary_history_employee')
  assert.equal(salaryEvidence.existingEmployeePrimaryKeyEvidence, 'dbo.employees.id INT NOT NULL PRIMARY KEY')
  const fkSql = diff.find(text => text.includes('FK_employee_salary_history_employee'))
  assert.equal(runner.classifyMetadataQuery(fkSql, [], tables).safe, false)
  assert.equal(runner.classifyMetadataQuery(fkSql, ds.entityMetadatas, new Set()).safe, false)
  assert.equal(runner.classifyMetadataQuery(addition.operations[0].sql, [], tables).safe, false)
  const primary = ds.getMetadata(Employee).primaryColumns[0], previous = primary.type
  try { primary.type = 'bigint'; assert.equal(runner.classifyMetadataQuery(fkSql, ds.entityMetadatas, tables).safe, false) }
  finally { primary.type = previous }
})

test('011 transaction rejects forged FK metadata and absent target primary key before creating salary history', async () => {
  const fk = ds.getMetadata(EmployeeSalaryHistoryVersion).foreignKeys[0], name = fk.name
  try { fk.name = 'FORGED'; await assert.rejects(runner.applyDisposableTest(ds, [addition]), /exact entity metadata/) }
  finally { fk.name = name }
  await assertAbsent()
  const employeePk = ds.namingStrategy.primaryKeyName('employees', ['id'])
  await query(`ALTER TABLE dbo.employees DROP CONSTRAINT [${employeePk}]`)
  try { await assert.rejects(runner.applyDisposableTest(ds, [addition]), /single-column primary key/) }
  finally { await query(`ALTER TABLE dbo.employees ADD CONSTRAINT [${employeePk}] PRIMARY KEY(id)`) }
  await assertAbsent()
})

test('011 late DDL failure rolls back both new tables, indexes, constraints and independent migration entry', async () => {
  const broken = { ...addition, operations: [...addition.operations, ...runner.validateSql('CREATE TABLE dbo.salary_history_migration_canary(id int NULL);')] }
  await assert.rejects(runner.applyDisposableTest(ds, [broken]), /already an object|already exists/i)
  await assertAbsent()
})

test('011 incomplete schema cannot commit or leave a partial salary timeline', async () => {
  const broken = { ...addition, operations: addition.operations.slice(0, -1) }
  await assert.rejects(runner.applyDisposableTest(ds, [broken]), /metadata drift remains/)
  await assertAbsent()
})

test('011 applies with empty history, exact current metadata, unchanged employees and unchanged payroll bytes', async () => {
  const result = await runner.applyDisposableTest(ds, [addition])
  assert.deepEqual(result.applied, [addition.version]); assert.deepEqual(result.skipped, [])
  assert.equal(result.existingColumnsAndCountsPreserved, true); assert.deepEqual(await runner.schemaDiff(ds), [])
  for (const name of tables) assert.equal((await query(`SELECT COUNT(*) AS n FROM dbo.${name}`))[0].n, 0, 'No inferred current salary history')
  assert.deepEqual(await originalRows(), original); assert.deepEqual(await columns(), oldColumns)
  const amountColumns = await query("SELECT name,precision,scale,is_nullable FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.employee_salary_history') AND name IN(N'basicSalary',N'housingAllowance',N'transportAllowance',N'phoneAllowance',N'workNatureAllowance',N'otherAllowance') ORDER BY column_id")
  assert.deepEqual(amountColumns.map(row => row.name), fields)
  for (const row of amountColumns) { assert.equal(row.precision, 18); assert.equal(row.scale, 2); assert.equal(row.is_nullable, false) }
})

test('011 installed foreign keys are trusted NO ACTION and only the two new tables own them', async () => {
  const keys = await query(`SELECT name,OBJECT_NAME(parent_object_id) AS owner,OBJECT_NAME(referenced_object_id) AS target,
    delete_referential_action_desc AS onDelete,update_referential_action_desc AS onUpdate,is_disabled,is_not_trusted FROM sys.foreign_keys ORDER BY name`)
  assert.deepEqual(keys, [
    { name: 'FK_employee_salary_history_employee', owner: 'employee_salary_history_versions', target: 'employees', onDelete: 'NO_ACTION', onUpdate: 'NO_ACTION', is_disabled: false, is_not_trusted: false },
    { name: 'FK_employee_salary_history_version', owner: 'employee_salary_history', target: 'employee_salary_history_versions', onDelete: 'NO_ACTION', onUpdate: 'NO_ACTION', is_disabled: false, is_not_trusted: false },
  ])
})

test('011 revision and segment sequence admit only one concurrent writer per employee/version', async () => {
  const headers = await Promise.allSettled([insertHeader(1), insertHeader(1)])
  assert.equal(headers.filter(result => result.status === 'fulfilled').length, 1)
  assert.equal(headers.filter(result => result.status === 'rejected').length, 1)
  headerId = headers.find(result => result.status === 'fulfilled').value
  await insertHeader(1, { employeeId: employee2Id })
  const segments = await Promise.allSettled([insertSegment(1), insertSegment(1)])
  assert.equal(segments.filter(result => result.status === 'fulfilled').length, 1)
  assert.equal(segments.filter(result => result.status === 'rejected').length, 1)
  segmentId = segments.find(result => result.status === 'fulfilled').value
  assert.deepEqual(await originalRows(), original)
})

test('011 dates, nullable open end and all six maximum SQL amounts survive exact string reads', async () => {
  const maximum = '9999999999999999.99'
  const id = await insertSegment(2, { effectiveFrom: '2024-02-29', effectiveTo: '9999-12-31', ...Object.fromEntries(fields.map(field => [field, maximum])) })
  const row = (await query(`SELECT ${fields.map(field => `CAST([${field}] AS nvarchar(80)) AS [${field}]`).join(',')},CONVERT(varchar(10),effectiveFrom,23) AS effectiveFrom,CONVERT(varchar(10),effectiveTo,23) AS effectiveTo FROM dbo.employee_salary_history WHERE id=${id}`))[0]
  assert.deepEqual(row, { ...Object.fromEntries(fields.map(field => [field, maximum])), effectiveFrom: '2024-02-29', effectiveTo: '9999-12-31' })
  assert.equal((await query(`SELECT effectiveTo FROM dbo.employee_salary_history WHERE id=${segmentId}`))[0].effectiveTo, null)
  for (const field of fields) {
    await assert.rejects(insertSegment(50, { [field]: null }), /Cannot insert the value NULL/i)
    await assert.rejects(insertSegment(50, { [field]: '10000000000000000.00' }), /overflow/i)
  }
  await assert.rejects(insertSegment(50, { effectiveFrom: '2025-02-29' }), /conversion|date/i)
  assert.deepEqual(await originalRows(), original)
})

test('011 missing parents are rejected and referenced employee/history cannot cascade away', async () => {
  await assert.rejects(insertHeader(2, { employeeId: 2147483000 }), /FOREIGN KEY/i)
  await assert.rejects(insertSegment(50, { versionId: 2147483000 }), /FOREIGN KEY/i)
  await assert.rejects(query(`DELETE dbo.employees WHERE id=${employeeId}`), /REFERENCE constraint|FOREIGN KEY/i)
  await assert.rejects(query(`DELETE dbo.employee_salary_history_versions WHERE id=${headerId}`), /REFERENCE constraint|FOREIGN KEY/i)
  const values = (await query(`SELECT reason,evidenceReference,currentSourceHash,contentHash,createdBy,createdAt FROM dbo.employee_salary_history_versions WHERE id=${headerId}`))[0]
  assert.equal(values.reason, 'إثبات أجر مؤرخ من مستند اختباري'); assert.equal(values.evidenceReference, 'test:salary-document:1')
  assert.equal(values.currentSourceHash, 'a'.repeat(64)); assert.equal(values.contentHash, 'b'.repeat(64)); assert.equal(values.createdBy, 3)
  assert.ok(values.createdAt instanceof Date && Number.isFinite(values.createdAt.getTime()))
  assert.deepEqual(await originalRows(), original)
})

test('011 replay retains saved versions and rows exactly; missing or changed migration checksum is rejected', async () => {
  const saved = await newRows()
  for (let i = 0; i < 2; i++) {
    const result = await runner.applyDisposableTest(ds, [addition])
    assert.deepEqual(result.applied, []); assert.deepEqual(result.skipped, [addition.version])
  }
  await assert.rejects(runner.applyDisposableTest(ds, [{ ...addition, checksum: '0'.repeat(64) }]), /missing or has changed/)
  await assert.rejects(runner.applyDisposableTest(ds, []), /missing or has changed/)
  assert.deepEqual(await newRows(), saved); assert.deepEqual(await originalRows(), original)
  assert.deepEqual(await columns(), oldColumns); assert.deepEqual(await runner.schemaDiff(ds), [])
})
