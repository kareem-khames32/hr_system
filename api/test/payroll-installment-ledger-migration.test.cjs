'use strict'
// 009 الحقيقي على قاعدة اختبار عشوائية؛ لا اتصال بالمصدر أو نسخة المراجعة.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const { pool, env, sql } = require('../scripts/migrations-lib.cjs')
const runner = require('../scripts/payroll-migrations.cjs')
const { LoanInstallment } = require('../src/requests/entities/financial.entities')
const { LoanInstallmentAllocation, LoanInstallmentEvent } = require('../src/payroll/payroll-installment-ledger.entities')
const policyEntities = require('../src/payroll/payroll-policy.entities')
const definitionEntities = require('../src/payroll/payroll-policy-definition.entities')

const database = 'hr_payroll_migration_test_' + crypto.randomBytes(8).toString('hex')
const allVersions = runner.readMigrations()
const historyVersions = allVersions.filter(row => ['20260913_006_payroll_policy_drafts', '20260913_007_payroll_policy_settings', '20260913_008_payroll_policy_definitions'].includes(row.version))
const addition = allVersions.find(row => row.version === '20260913_009_loan_installment_ledger')
const collection = allVersions.find(row => row.version === '20260913_010_payroll_collection_policy')
const versions = [...historyVersions, addition, collection]
const newColumns = ['paidAmount', 'financialStatus', 'financialRevision', 'parentInstallmentId', 'originalDueDate', 'paidAt']
const newTables = new Set(['loan_installment_allocations', 'loan_installment_events'])
let master, connection, ds, created = false, original, originalLedger, beforeColumns, oldPolicyVersionColumns, heldAllocationId
const query = async text => (await connection.request().query(text)).recordset
const oldRows = async () => (await connection.request().query(`
  SELECT id,loanId,dueDate,CAST(amount AS nvarchar(80)) AS amount,paid FROM dbo.loan_installments WHERE id<=2 ORDER BY id;
  SELECT *,CONVERT(varbinary(max),CONVERT(nvarchar(max),payload)) AS payloadBytes FROM dbo.payroll_policy_events ORDER BY id;
  SELECT * FROM dbo.payroll_policies ORDER BY id;
  SELECT ${oldPolicyVersionColumns.map(name => '[' + name + ']').join(',')} FROM dbo.payroll_policy_versions ORDER BY id;
  SELECT * FROM dbo.installment_migration_canary ORDER BY id;
`)).recordsets
const columnState = async () => query(`SELECT c.name,t.name AS type,c.max_length,c.precision,c.scale,c.is_nullable,c.is_identity,dc.name AS defaultName,dc.definition AS defaultValue
  FROM sys.columns c JOIN sys.types t ON t.user_type_id=c.user_type_id LEFT JOIN sys.default_constraints dc ON dc.object_id=c.default_object_id
  WHERE c.object_id=OBJECT_ID(N'dbo.loan_installments') ORDER BY c.column_id`)
async function assertAbsent() {
  for (const table of newTables) assert.equal((await query(`SELECT OBJECT_ID(N'dbo.${table}') AS id`))[0].id, null)
  assert.deepEqual(await columnState(), beforeColumns)
  assert.deepEqual(await query('SELECT * FROM dbo.payroll_schema_migrations ORDER BY version'), originalLedger)
  assert.deepEqual(await oldRows(), original)
}
async function allocation(installmentId, extra = {}) {
  const values = { payrollRunId: 10, deductedAmount: '400.00', carriedAmount: '600.00', status: 'HELD', sourceSnapshot: '{"version":1,"amount":"1000.00"}', ...extra }
  return (await connection.request().input('installmentId', sql.Int, installmentId).input('runId', sql.Int, values.payrollRunId)
    .input('deducted', sql.NVarChar(80), values.deductedAmount).input('carried', sql.NVarChar(80), values.carriedAmount)
    .input('status', sql.NVarChar(16), values.status).input('source', sql.NVarChar(sql.MAX), values.sourceSnapshot)
    .query(`INSERT dbo.loan_installment_allocations(installmentId,employeeId,payrollRunId,payrollSnapshotVersion,sourceRevision,deductedAmount,carriedAmount,continuationDueDate,outcome,status,sourceSnapshot)
      OUTPUT INSERTED.id VALUES(@installmentId,101,@runId,1,1,CAST(@deducted AS decimal(18,2)),CAST(@carried AS decimal(18,2)),'2026-10-01',N'PARTIAL',@status,@source)`)).recordset[0].id
}
async function event(actionKey, allocationId = null, payload = '{"before":"1000.00","after":"400.00"}') {
  return (await connection.request().input('key', sql.NVarChar(150), actionKey).input('allocation', sql.Int, allocationId).input('payload', sql.NVarChar(sql.MAX), payload)
    .query(`INSERT dbo.loan_installment_events(employeeId,loanId,installmentId,allocationId,action,actionKey,payload)
      OUTPUT INSERTED.id VALUES(101,1,1,@allocation,N'ALLOCATED',@key,@payload)`)).recordset[0].id
}

before(async () => {
  assert.equal(historyVersions.length, 3); assert.ok(addition); assert.ok(collection)
  assert.match(database, /^hr_payroll_migration_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
  master = await pool('master'); await master.request().query(`CREATE DATABASE [${database}]`); created = true
  connection = await pool(database)
  ds = await runner.openDataSource(database, [LoanInstallment, LoanInstallmentAllocation, LoanInstallmentEvent, ...Object.values(policyEntities), ...Object.values(definitionEntities)])
  // هذا الاختبار يثبت عقد009 (ومعه010)؛ عمودا عكس المسير في032 (C8) يُختبران مستقلًا ولا يُنسبان إلى009،
  // وأعمدة «طريقة الخصم» السبعة على payroll_policies في033 يطبقها المُرحّل المجمّع (db-migrate.cjs).
  const charge033 = ['lateDeductionEnabled', 'latenessTierSetId', 'earlyLeaveDeductionEnabled', 'shortfallEnabled', 'shortfallMode', 'shortfallValue', 'absencePenaltyDays']
  for (const metadata of ds.entityMetadatas) {
    const later = metadata.tableName === 'loan_installment_allocations' ? ['reversalRunId', 'reversedAt'] : metadata.tableName === 'payroll_policies' ? charge033 : []
    metadata.columns = metadata.columns.filter(column => !later.includes(column.databaseName))
    metadata.ownColumns = metadata.ownColumns.filter(column => !later.includes(column.databaseName))
  }
  const n = ds.namingStrategy
  await connection.request().batch(`CREATE TABLE dbo.loan_installments(
    id int NOT NULL IDENTITY(1,1),loanId int NOT NULL,dueDate date NOT NULL,amount decimal(18,2) NOT NULL,
    paid bit NOT NULL CONSTRAINT [${n.defaultConstraintName('loan_installments', 'paid')}] DEFAULT 0,
    CONSTRAINT [${n.primaryKeyName('loan_installments', ['id'])}] PRIMARY KEY(id));
    CREATE INDEX [${n.indexName('loan_installments', ['loanId'])}] ON dbo.loan_installments(loanId);
    INSERT dbo.loan_installments(loanId,dueDate,amount,paid) VALUES(1,'2026-09-01',1250.17,0),(2,'2026-08-01',999.99,1);
    CREATE TABLE dbo.installment_migration_canary(id int PRIMARY KEY,originalBytes varbinary(max) NOT NULL,note nvarchar(max) NOT NULL);
    INSERT dbo.installment_migration_canary VALUES(1,0x00FF12ABCE,N'بيانات تاريخية ثابتة');`)
  for (const version of historyVersions) for (const operation of version.operations) await ds.query(operation.sql)
  await ds.query('CREATE TABLE dbo.payroll_schema_migrations(version nvarchar(150) NOT NULL PRIMARY KEY,checksum char(64) NOT NULL,appliedAt datetime2 NOT NULL DEFAULT SYSDATETIME())')
  for (const version of historyVersions) await ds.query('INSERT dbo.payroll_schema_migrations(version,checksum) VALUES(@0,@1)', [version.version, version.checksum])
  await connection.request().batch(`INSERT dbo.payroll_policies(code,name,createdBy,updatedBy) VALUES(N'LEGACY_008',N'سياسة محفوظة',1,1);
    INSERT dbo.payroll_policy_versions(policyId,versionNo,effectiveFrom,metadata,createdBy,updatedBy,catalogVersion,engineVersion,definitionWarningAcknowledgements)
      VALUES(1,1,'2026-09-01',N'{"notes":"لقطة008"}',1,1,N'SRS_V1_20260913',N'SRS_ENGINE_V1_20260913',N'{"warning":"retained"}');
    INSERT dbo.payroll_policy_events(policyId,versionId,eventType,actorUserId,payload) VALUES(1,1,N'OLD_EVENT',1,N'{"kept":"١٢٣","money":"123.45"}');`)
  oldPolicyVersionColumns = (await query("SELECT name FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.payroll_policy_versions') ORDER BY column_id")).map(row => row.name)
  original = await oldRows(); originalLedger = await query('SELECT * FROM dbo.payroll_schema_migrations ORDER BY version'); beforeColumns = await columnState()
}, { timeout: 60000 })

after(async () => {
  if (ds?.isInitialized) await ds.destroy()
  if (connection) await connection.close()
  try {
    if (created) {
      assert.match(database, /^hr_payroll_migration_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('database', database).query('SELECT DB_ID(@database) AS id')).recordset[0].id, null)
      console.log(JSON.stringify({ database, removed: true }))
    }
  } finally { if (master) await master.close() }
})

test('009 contains only six nullable additions, two new tables and four indexes without historical backfill', async () => {
  const added = addition.operations.filter(row => row.kind === 'add-column')
  assert.equal(added.length, 6)
  added.forEach((row, index) => {
    assert.equal(row.table, 'loan_installments'); assert.match(row.sql, new RegExp(`ADD \\[${newColumns[index]}\\] `))
    assert.match(row.sql, / NULL;$/); assert.doesNotMatch(row.sql, /DEFAULT|NOT NULL/)
  })
  assert.deepEqual(new Set(addition.operations.filter(row => row.kind === 'create-table').map(row => row.table)), newTables)
  assert.equal(addition.operations.filter(row => row.kind === 'create-index').length, 4)
  assert.equal(addition.operations.flatMap(row => row.checks || []).length, 2)
  const keys = addition.operations.flatMap(row => row.foreignKeys || [])
  assert.equal(keys.length, 1); assert.equal(keys[0].referencedTable, 'loan_installment_allocations')
  await assertAbsent()
})

test('009 named CHECK allowlist rejects weakened expressions, SQL functions and existing-table ALTER constraints', () => {
  const create = addition.operations.find(row => row.table === 'loan_installment_allocations' && row.kind === 'create-table').sql
  assert.doesNotThrow(() => runner.validateSql(create))
  for (const forged of [
    create.replace('[deductedAmount] >= 0', '[deductedAmount] >= -1'),
    create.replace('[deductedAmount] >= 0', '[missing] >= 0'),
    create.replace('[deductedAmount] >= 0', 'ABS([deductedAmount]) >= 0'),
    create.replace("'RELEASED')", "'RELEASED','FORGED')"),
    create.replace('CK_loan_installment_allocation_amounts', 'CK_unknown'),
    create.replace('AND [carriedAmount] >= 0', 'OR 1=1'),
    create.replace('dbo.[loan_installment_allocations]', 'dbo.[loan_installments]'),
    create + ' UPDATE dbo.loan_installments SET paid=1;',
    'ALTER TABLE dbo.loan_installments ADD CONSTRAINT CK_loan_installment_allocation_amounts CHECK ([deductedAmount] >= 0 AND [carriedAmount] >= 0);',
  ]) assert.throws(() => runner.validateSql(forged), undefined, forged)
})

test('009 filter predicates remain closed and foreign keys cannot target legacy sources', () => {
  for (const predicate of ['releasedAt IS NULL', 'parentInstallmentId IS NOT NULL']) assert.doesNotThrow(() => runner.validateSql(`CREATE UNIQUE INDEX UX_test ON dbo.loan_installments(id) WHERE ${predicate};`))
  for (const predicate of ["releasedAt IS NULL AND status='HELD'", 'releasedAt IS NULL OR id=1', 'releasedAt IS NULL; DELETE FROM dbo.loans', 'COALESCE(releasedAt,NULL) IS NULL']) {
    assert.throws(() => runner.validateSql(`CREATE UNIQUE INDEX UX_test ON dbo.loan_installments(id) WHERE ${predicate};`))
  }
  const create = addition.operations.find(row => row.table === 'loan_installment_events' && row.kind === 'create-table').sql
  for (const target of ['loan_installments', 'loans', 'employees', 'payroll_runs']) assert.throws(() => runner.validateSql(create.replace('REFERENCES dbo.[loan_installment_allocations]', `REFERENCES dbo.[${target}]`)))
  assert.throws(() => runner.validateSql('ALTER TABLE dbo.loan_installments ADD requiredAmount decimal(18,2) NOT NULL;'))
})

test('009 metadata plan requires exact nullable additions and new-table CHECK/FK proof', async () => {
  const diff = await runner.schemaDiff(ds)
  let nullable = 0, collectionNullable = 0, foreignKeys = 0
  for (const text of diff) {
    const result = runner.classifyMetadataQuery(text, ds.entityMetadatas, newTables)
    assert.equal(result.safe, true, text)
    if (result.nullableMetadataEvidence?.table === 'loan_installments') nullable++
    if (result.nullableMetadataEvidence?.table === 'payroll_policy_versions') {
      assert.equal(result.nullableMetadataEvidence.column, 'collectionPolicy'); collectionNullable++
    }
    if (result.newTableForeignKeyEvidence) foreignKeys++
  }
  assert.equal(nullable, 6); assert.equal(collectionNullable, 1); assert.equal(foreignKeys, 1)
  for (const check of addition.operations.flatMap(row => row.checks || [])) {
    const text = `ALTER TABLE dbo.loan_installment_allocations ADD ${check.sql};`
    assert.throws(() => runner.validateSql(text))
    assert.equal(runner.classifyMetadataQuery(text, ds.entityMetadatas, newTables).safe, true)
    assert.equal(runner.classifyMetadataQuery(text, ds.entityMetadatas, new Set()).safe, false)
    assert.equal(runner.classifyMetadataQuery(text, [], newTables).safe, false)
  }
})

test('009 late failure rolls back new columns, tables, indexes, CHECKs and migration row preserving 008', async () => {
  const broken = { ...addition, operations: [...addition.operations, ...runner.validateSql('CREATE TABLE dbo.installment_migration_canary(id int NULL);')] }
  await assert.rejects(runner.applyDisposableTest(ds, [...historyVersions, broken, collection]), /already an object|already exists/i)
  await assertAbsent()
})

test('009 missing metadata index and forged CHECK metadata fail before commit', async () => {
  await assert.rejects(runner.applyDisposableTest(ds, [...historyVersions, { ...addition, operations: addition.operations.slice(0, -1) }, collection]), /metadata drift remains/)
  await assertAbsent()
  const check = ds.entityMetadatas.find(row => row.tableName === 'loan_installment_allocations').checks[0]
  const expression = check.expression
  try {
    check.expression = '1=1'
    await assert.rejects(runner.applyDisposableTest(ds, versions), /exact entity metadata/)
  } finally { check.expression = expression }
  await assertAbsent()
})

test('009 then 010 apply above immutable 008 with empty metadata diff and old values unchanged', async () => {
  const result = await runner.applyDisposableTest(ds, versions)
  assert.deepEqual(result.applied, [addition.version, collection.version]); assert.deepEqual(result.skipped, historyVersions.map(row => row.version))
  assert.equal(result.existingColumnsAndCountsPreserved, true); assert.deepEqual(await runner.schemaDiff(ds), [])
  assert.deepEqual(await oldRows(), original)
  assert.deepEqual((await columnState()).filter(row => !newColumns.includes(row.name)), beforeColumns)
  const history = await query('SELECT * FROM dbo.payroll_schema_migrations ORDER BY version')
  assert.deepEqual(history.slice(0, 3), originalLedger)
  assert.deepEqual((await query('SELECT paidAmount,financialStatus,financialRevision,parentInstallmentId,originalDueDate,paidAt FROM dbo.loan_installments ORDER BY id')),
    [Object.fromEntries(newColumns.map(name => [name, null])), Object.fromEntries(newColumns.map(name => [name, null]))])
  for (const table of newTables) assert.equal((await query(`SELECT COUNT(*) AS n FROM dbo.${table}`))[0].n, 0)
})

test('009 creates only the new-table FK and trusted named CHECKs with exact filtered indexes', async () => {
  const keys = await query("SELECT name,delete_referential_action_desc AS onDelete,update_referential_action_desc AS onUpdate,OBJECT_NAME(referenced_object_id) AS target FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.loan_installment_events')")
  assert.deepEqual(keys, [{ name: 'FK_loan_installment_event_allocation', onDelete: 'NO_ACTION', onUpdate: 'NO_ACTION', target: 'loan_installment_allocations' }])
  const checks = await query("SELECT name,is_disabled,is_not_trusted FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.loan_installment_allocations') ORDER BY name")
  assert.equal(checks.length, 2); for (const row of checks) { assert.equal(row.is_disabled, false); assert.equal(row.is_not_trusted, false) }
  assert.equal((await query("SELECT COUNT(*) AS n FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.loan_installments')"))[0].n, 0)
  const indexes = await query("SELECT name,is_unique,filter_definition FROM sys.indexes WHERE name IN(N'UX_loan_installments_parent',N'UX_loan_installment_allocation_active') ORDER BY name")
  assert.equal(indexes.length, 2)
  for (const row of indexes) assert.equal(row.is_unique, true)
  assert.match(indexes.find(row => row.name === 'UX_loan_installments_parent').filter_definition, /\[parentInstallmentId\] IS NOT NULL/i)
  assert.match(indexes.find(row => row.name === 'UX_loan_installment_allocation_active').filter_definition, /\[releasedAt\] IS NULL/i)
})

test('009 DEC18,2 columns preserve maximum cents through explicit nvarchar CASTs', async () => {
  const value = '9999999999999999.99'
  const installmentId = (await connection.request().input('money', sql.NVarChar(80), value)
    .query("INSERT dbo.loan_installments(loanId,dueDate,amount,paidAmount) OUTPUT INSERTED.id VALUES(3,'2026-09-01',CAST(@money AS decimal(18,2)),CAST(@money AS decimal(18,2)))")).recordset[0].id
  const allocationId = await allocation(installmentId, { deductedAmount: value, carriedAmount: value })
  const amounts = await query(`SELECT CAST(amount AS nvarchar(80)) AS amount,CAST(paidAmount AS nvarchar(80)) AS paidAmount FROM dbo.loan_installments WHERE id=${installmentId}`)
  assert.deepEqual(amounts, [{ amount: value, paidAmount: value }])
  assert.deepEqual(await query(`SELECT CAST(deductedAmount AS nvarchar(80)) AS deductedAmount,CAST(carriedAmount AS nvarchar(80)) AS carriedAmount FROM dbo.loan_installment_allocations WHERE id=${allocationId}`), [{ deductedAmount: value, carriedAmount: value }])
  await assert.rejects(allocation(9901, { deductedAmount: '10000000000000000.00' }), /overflow/i)
  assert.deepEqual(await oldRows(), original)
})

test('009 allocation CHECKs reject negative amounts and unknown status while required fields reject NULL', async () => {
  for (const extra of [{ deductedAmount: '-0.01' }, { carriedAmount: '-0.01' }, { status: 'FORGED' }]) await assert.rejects(allocation(9001, extra), /CHECK constraint/i)
  for (const extra of [{ deductedAmount: null }, { carriedAmount: null }, { status: null }, { sourceSnapshot: null }]) await assert.rejects(allocation(9001, extra), /Cannot insert the value NULL/i)
  for (const status of ['HELD', 'POSTED', 'RELEASED']) {
    const id = await allocation(9100 + ['HELD', 'POSTED', 'RELEASED'].indexOf(status), { deductedAmount: '0.00', carriedAmount: '0.00', status })
    assert.equal((await query(`SELECT status FROM dbo.loan_installment_allocations WHERE id=${id}`))[0].status, status)
  }
})

test('009 active claim race admits one holder and POSTED remains reserved until explicit release', async () => {
  const raced = await Promise.allSettled([allocation(9200, { payrollRunId: 10 }), allocation(9200, { payrollRunId: 11 })])
  assert.equal(raced.filter(row => row.status === 'fulfilled').length, 1); assert.equal(raced.filter(row => row.status === 'rejected').length, 1)
  heldAllocationId = raced.find(row => row.status === 'fulfilled').value
  await query(`UPDATE dbo.loan_installment_allocations SET status=N'POSTED',postedAt=SYSUTCDATETIME() WHERE id=${heldAllocationId}`)
  await assert.rejects(allocation(9200, { payrollRunId: 12 }), /duplicate/i)
  await query(`UPDATE dbo.loan_installment_allocations SET status=N'RELEASED',releasedAt=SYSUTCDATETIME() WHERE id=${heldAllocationId}`)
  const replacement = await allocation(9200, { payrollRunId: 12 })
  assert.notEqual(replacement, heldAllocationId)
  assert.equal((await query('SELECT COUNT(*) AS n FROM dbo.loan_installment_allocations WHERE installmentId=9200'))[0].n, 2)
  assert.equal((await query('SELECT COUNT(*) AS n FROM dbo.loan_installment_allocations WHERE installmentId=9200 AND releasedAt IS NULL'))[0].n, 1)
  assert.equal((await query(`SELECT sourceSnapshot FROM dbo.loan_installment_allocations WHERE id=${heldAllocationId}`))[0].sourceSnapshot, '{"version":1,"amount":"1000.00"}')
})

test('009 one continuation per parent is enforced under race and original amount remains on partial parent', async () => {
  const parent = (await query("INSERT dbo.loan_installments(loanId,dueDate,amount,paid,paidAmount,financialStatus,financialRevision,originalDueDate) OUTPUT INSERTED.id VALUES(4,'2026-09-01',1000,0,400,N'PARTIAL',2,'2026-09-01')"))[0].id
  const child = () => connection.request().input('parent', sql.Int, parent).query("INSERT dbo.loan_installments(loanId,dueDate,amount,paid,paidAmount,financialStatus,financialRevision,parentInstallmentId,originalDueDate) OUTPUT INSERTED.id VALUES(4,'2026-10-01',600,0,0,N'DUE',1,@parent,'2026-09-01')")
  const raced = await Promise.allSettled([child(), child()])
  assert.equal(raced.filter(row => row.status === 'fulfilled').length, 1); assert.equal(raced.filter(row => row.status === 'rejected').length, 1)
  const rows = await query(`SELECT CAST(amount AS nvarchar(80)) AS amount,CAST(paidAmount AS nvarchar(80)) AS paidAmount,paid,financialStatus,financialRevision,parentInstallmentId,CONVERT(varchar(10),originalDueDate,23) AS originalDueDate FROM dbo.loan_installments WHERE id=${parent} OR parentInstallmentId=${parent} ORDER BY id`)
  assert.deepEqual(rows, [
    { amount: '1000.00', paidAmount: '400.00', paid: false, financialStatus: 'PARTIAL', financialRevision: 2, parentInstallmentId: null, originalDueDate: '2026-09-01' },
    { amount: '600.00', paidAmount: '0.00', paid: false, financialStatus: 'DUE', financialRevision: 1, parentInstallmentId: parent, originalDueDate: '2026-09-01' },
  ])
  assert.deepEqual(await oldRows(), original)
})

test('009 event idempotency is unique under race and optional allocation FK protects referenced history', async () => {
  const raced = await Promise.allSettled([event('claim:event:once', heldAllocationId), event('claim:event:once', heldAllocationId)])
  assert.equal(raced.filter(row => row.status === 'fulfilled').length, 1); assert.equal(raced.filter(row => row.status === 'rejected').length, 1)
  await assert.rejects(event('missing:allocation', 2147483000), /FOREIGN KEY/i)
  await assert.rejects(query(`DELETE dbo.loan_installment_allocations WHERE id=${heldAllocationId}`), /REFERENCE constraint|FOREIGN KEY/i)
  await assert.rejects(event(null), /Cannot insert the value NULL/i)
  const payload = JSON.stringify({ reason: 'تفاصيل'.repeat(1800), amount: '9999999999999999.99' })
  const id = await event('manual:no:allocation', null, payload)
  const row = (await query(`SELECT allocationId,payload,createdAt FROM dbo.loan_installment_events WHERE id=${id}`))[0]
  assert.equal(row.allocationId, null); assert.equal(row.payload, payload); assert.ok(row.createdAt instanceof Date)
})

test('009 UTC defaults populate new audit records without backfilling historical paidAt', async () => {
  const clock = (await query('SELECT SYSUTCDATETIME() AS now'))[0].now
  const allocationId = await allocation(9300)
  const eventId = await event('utc:defaults', allocationId)
  const row = (await query(`SELECT a.claimedAt,a.releasedAt,a.postedAt,e.createdAt FROM dbo.loan_installment_allocations a JOIN dbo.loan_installment_events e ON e.allocationId=a.id WHERE a.id=${allocationId} AND e.id=${eventId}`))[0]
  assert.ok(row.claimedAt >= clock); assert.ok(row.createdAt >= clock); assert.equal(row.releasedAt, null); assert.equal(row.postedAt, null)
  assert.equal((await query('SELECT paidAt FROM dbo.loan_installments WHERE id=2'))[0].paidAt, null)
})

test('009 replay preserves installment amounts, released claims, audit payloads and all prior migration checksums', async () => {
  const snapshot = async () => {
    const result = []
    for (const table of ['loan_installments', ...newTables, 'payroll_schema_migrations']) result.push((await query(`SELECT (SELECT * FROM dbo.${table} ORDER BY ${table === 'payroll_schema_migrations' ? 'version' : 'id'} FOR JSON PATH,INCLUDE_NULL_VALUES) AS payload`))[0].payload)
    return result
  }
  const originalState = await snapshot()
  for (let index = 0; index < 2; index++) {
    const result = await runner.applyDisposableTest(ds, versions)
    assert.deepEqual(result.applied, []); assert.deepEqual(result.skipped, versions.map(row => row.version))
  }
  await assert.rejects(runner.applyDisposableTest(ds, [...historyVersions, { ...addition, checksum: '0'.repeat(64) }, collection]), /missing or has changed/)
  await assert.rejects(runner.applyDisposableTest(ds, [historyVersions[0], historyVersions[2], addition, collection]), /missing or has changed/)
  assert.deepEqual(await snapshot(), originalState); assert.deepEqual(await oldRows(), original); assert.deepEqual(await runner.schemaDiff(ds), [])
})
