'use strict'
// 010 فوق تاريخ006–009 الحقيقي في قاعدة عشوائية فقط؛ لا اتصال بالمصدر أو نسخة المراجعة.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const { pool, env, sql } = require('../scripts/migrations-lib.cjs')
const runner = require('../scripts/payroll-migrations.cjs')
const { LoanInstallment } = require('../src/requests/entities/financial.entities')
const { LoanInstallmentAllocation, LoanInstallmentEvent } = require('../src/payroll/payroll-installment-ledger.entities')
const policyEntities = require('../src/payroll/payroll-policy.entities')
const definitionEntities = require('../src/payroll/payroll-policy-definition.entities')
const { inspectPayrollCollectionPolicy } = require('../src/payroll/payroll-collection-policy')

const database = 'hr_payroll_migration_test_' + crypto.randomBytes(8).toString('hex')
const allVersions = runner.readMigrations()
const historyVersions = allVersions.filter(row => ['20260913_006_payroll_policy_drafts', '20260913_007_payroll_policy_settings', '20260913_008_payroll_policy_definitions', '20260913_009_loan_installment_ledger'].includes(row.version))
const addition = allVersions.find(row => row.version === '20260913_010_payroll_collection_policy')
const versions = [...historyVersions, addition]
const historicalTables = ['payroll_policies', 'payroll_policy_versions', 'payroll_policy_events', 'payroll_policy_components', 'payroll_policy_parameters', 'payroll_tier_sets', 'payroll_policy_tiers', 'loan_installments', 'loan_installment_allocations', 'loan_installment_events', 'collection_migration_canary']
let master, connection, ds, created = false, oldVersionColumns, original, originalLedger, beforeColumns, savedPolicy
const query = async text => (await connection.request().query(text)).recordset
const historical = async () => {
  const result = []
  for (const table of historicalTables) {
    const columns = table === 'payroll_policy_versions' ? oldVersionColumns.map(name => '[' + name + ']').join(',') : '*'
    result.push((await query(`SELECT (SELECT ${columns} FROM dbo.${table} ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES) AS payload`))[0].payload)
  }
  return result
}
const columnState = async () => query(`SELECT t.name AS tableName,c.name,tv.name AS type,c.max_length,c.precision,c.scale,c.is_nullable,c.is_identity,dc.name AS defaultName,dc.definition AS defaultValue
  FROM sys.tables t JOIN sys.columns c ON c.object_id=t.object_id JOIN sys.types tv ON tv.user_type_id=c.user_type_id
  LEFT JOIN sys.default_constraints dc ON dc.object_id=c.default_object_id
  WHERE t.is_ms_shipped=0 ORDER BY t.name,c.column_id`)
async function assertAbsent() {
  assert.equal((await query("SELECT COUNT(*) AS n FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.payroll_policy_versions') AND name=N'collectionPolicy'"))[0].n, 0)
  assert.deepEqual(await columnState(), beforeColumns)
  assert.deepEqual(await query('SELECT * FROM dbo.payroll_schema_migrations ORDER BY version'), originalLedger)
  assert.deepEqual(await historical(), original)
}
async function writeCollection(text) {
  await connection.request().input('value', sql.NVarChar(sql.MAX), text).query('UPDATE dbo.payroll_policy_versions SET collectionPolicy=@value WHERE id=1')
}

before(async () => {
  assert.equal(historyVersions.length, 4); assert.ok(addition)
  assert.match(database, /^hr_payroll_migration_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
  master = await pool('master'); await master.request().query(`CREATE DATABASE [${database}]`); created = true
  connection = await pool(database)
  ds = await runner.openDataSource(database, [LoanInstallment, LoanInstallmentAllocation, LoanInstallmentEvent, ...Object.values(policyEntities), ...Object.values(definitionEntities)])
  const n = ds.namingStrategy
  await connection.request().batch(`CREATE TABLE dbo.loan_installments(
    id int NOT NULL IDENTITY(1,1),loanId int NOT NULL,dueDate date NOT NULL,amount decimal(18,2) NOT NULL,
    paid bit NOT NULL CONSTRAINT [${n.defaultConstraintName('loan_installments', 'paid')}] DEFAULT 0,
    CONSTRAINT [${n.primaryKeyName('loan_installments', ['id'])}] PRIMARY KEY(id));
    CREATE INDEX [${n.indexName('loan_installments', ['loanId'])}] ON dbo.loan_installments(loanId);
    INSERT dbo.loan_installments(loanId,dueDate,amount,paid) VALUES(1,'2026-09-01',1000.17,0),(2,'2026-08-01',999.99,1);
    CREATE TABLE dbo.collection_migration_canary(id int PRIMARY KEY,originalBytes varbinary(max) NOT NULL,note nvarchar(max) NOT NULL);
    INSERT dbo.collection_migration_canary VALUES(1,0x00FFCE1200AB,N'بيانات تاريخية لا تتغير');`)
  for (const version of historyVersions) for (const operation of version.operations) await ds.query(operation.sql)
  await ds.query('CREATE TABLE dbo.payroll_schema_migrations(version nvarchar(150) NOT NULL PRIMARY KEY,checksum char(64) NOT NULL,appliedAt datetime2 NOT NULL DEFAULT SYSDATETIME())')
  for (const version of historyVersions) await ds.query('INSERT dbo.payroll_schema_migrations(version,checksum) VALUES(@0,@1)', [version.version, version.checksum])
  await connection.request().batch(`INSERT dbo.payroll_policies(code,name,createdBy,updatedBy) VALUES(N'HISTORICAL_009',N'سياسة تاريخية دون قرار تحصيل',1,1);
    INSERT dbo.payroll_policy_versions(policyId,versionNo,status,effectiveFrom,metadata,createdBy,updatedBy,catalogVersion,engineVersion,definitionWarningAcknowledgements,
      defaultPeriodType,cycleStartDay,cycleEndMode,baseDaysBasis,monthlyDays,dailyHours,rateBase,roundingMode,roundingScale,divisionByZeroMode,maxDeductionPctOfGross,minNetGuarantee,netFloorPct,carryOverExcess,skipAttendance,lateDeductionEnabled,currency)
      VALUES(1,1,N'ACTIVE','2026-09-01',N'{"notes":"لقطة009"}',1,1,N'SRS_V1_20260913',N'SRS_ENGINE_V1_20260913',N'["retained-warning"]',
      N'CUSTOM_DAY_RANGE',23,N'DERIVED',N'FIXED_30',30,7.5,N'GROSS',N'HALF_EVEN',2,N'FAIL_ROW',45.1234,2000.15,15.4321,1,0,1,N'EGP');
    INSERT dbo.payroll_policy_versions(policyId,versionNo,sourceVersionId,effectiveFrom,metadata,createdBy,updatedBy)
      VALUES(1,2,1,'2026-10-01',N'{"notes":"مسودة تاريخية"}',1,1);
    INSERT dbo.payroll_policy_events(policyId,versionId,eventType,actorUserId,payload) VALUES(1,1,N'PAST_EVENT',1,N'{"kept":"١٢٣","money":"123.45"}');
    INSERT dbo.payroll_policy_parameters(versionId,code,nameAr,value,unit,isActive) VALUES(1,N'OLD_FACTOR',N'قيمة سابقة',CAST(N'999999999999.123456' AS decimal(18,6)),N'SCALAR',1);
    INSERT dbo.loan_installment_allocations(installmentId,employeeId,payrollRunId,payrollSnapshotVersion,sourceRevision,deductedAmount,carriedAmount,continuationDueDate,outcome,status,sourceSnapshot,postedAt)
      VALUES(1,101,44,2,1,400.01,600.16,'2026-10-01',N'PARTIAL',N'POSTED',N'{"original":"1000.17","paid":"400.01"}','2026-09-01T12:00:00');
    INSERT dbo.loan_installment_events(employeeId,loanId,installmentId,allocationId,payrollRunId,action,actionKey,payload)
      VALUES(101,1,1,1,44,N'POSTED',N'past:posting:44:1',N'{"preserved":"أثر القسط السابق","money":"400.01"}');`)
  oldVersionColumns = (await query("SELECT name FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.payroll_policy_versions') ORDER BY column_id")).map(row => row.name)
  original = await historical(); originalLedger = await query('SELECT * FROM dbo.payroll_schema_migrations ORDER BY version'); beforeColumns = await columnState()
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

test('010 discovers exactly one nullable NVARCHAR(MAX) column with no default, table, index or backfill', async () => {
  assert.equal(addition.operations.length, 1)
  const operation = addition.operations[0]
  assert.equal(operation.kind, 'add-column'); assert.equal(operation.table, 'payroll_policy_versions')
  assert.equal(operation.sql, 'ALTER TABLE dbo.[payroll_policy_versions] ADD [collectionPolicy] NVARCHAR(MAX) NULL;')
  assert.doesNotMatch(operation.sql, /DEFAULT|UPDATE|NOT NULL|CREATE|DROP/i)
  const field = ds.entityMetadatas.find(row => row.tableName === 'payroll_policy_versions').columns.find(row => row.databaseName === 'collectionPolicy')
  assert.equal(field.type, 'nvarchar'); assert.equal(field.length.toUpperCase(), 'MAX'); assert.equal(field.isNullable, true); assert.equal(field.default, undefined)
  await assertAbsent()
})

test('010 metadata diff is only its nullable field and omitted NULL still requires exact field nullable evidence', async () => {
  const diff = await runner.schemaDiff(ds)
  assert.equal(diff.length, 1)
  assert.match(diff[0], /ALTER TABLE "payroll_policy_versions" ADD "collectionPolicy" nvarchar\(MAX\)/i)
  const result = runner.classifyMetadataQuery(diff[0], ds.entityMetadatas)
  assert.equal(result.safe, true)
  assert.deepEqual(result.nullableMetadataEvidence, { table: 'payroll_policy_versions', column: 'collectionPolicy' })
  assert.equal(runner.classifyMetadataQuery(diff[0], []).safe, false)
  assert.equal(runner.classifyMetadataQuery(diff[0].replace('collectionPolicy', 'forgedCollection'), ds.entityMetadatas).safe, false)
  assert.equal(runner.classifyMetadataQuery(diff[0] + ' NOT NULL', ds.entityMetadatas).safe, false)
  assert.equal(runner.classifyMetadataQuery(diff[0] + '; UPDATE dbo.payroll_policy_versions SET revision=0;', ds.entityMetadatas).safe, false)
  console.log(JSON.stringify({ migration: addition.version, beforeQueries: diff.length, unsafeDrift: 0 }))
})

test('010 does not widen authored SQL permission to writes, destructive changes, cross-database names or required columns', () => {
  for (const text of [
    'UPDATE dbo.payroll_policy_versions SET collectionPolicy=N\'{}\';',
    'DELETE FROM dbo.payroll_policy_versions;',
    'DROP TABLE dbo.payroll_policy_versions;',
    'ALTER TABLE dbo.payroll_policy_versions ALTER COLUMN collectionPolicy nvarchar(4000) NULL;',
    'ALTER TABLE dbo.payroll_policy_versions ADD collectionPolicy nvarchar(MAX) NOT NULL;',
    'ALTER TABLE source_database.dbo.payroll_policy_versions ADD collectionPolicy nvarchar(MAX) NULL;',
    'ALTER TABLE dbo.payroll_schema_migrations ADD collectionPolicy nvarchar(MAX) NULL;',
    addition.operations[0].sql + ' EXEC sp_executesql N\'SELECT 1\';',
  ]) assert.throws(() => runner.validateSql(text), undefined, text)
})

test('010 disposable execution guards reject source, retained-review and unguarded database handles before queries', async () => {
  const attempted = []
  const fake = databaseName => ({ options: { database: databaseName }, createQueryRunner() { attempted.push(databaseName); throw new Error('must not connect') } })
  for (const target of [env.DB_DATABASE, 'hr_review_pre_payroll_20260913010101_aabbccdd', 'unguarded_test_database']) {
    await assert.rejects(runner.applyDisposableTest(fake(target), versions), /Disposable test database required/)
  }
  assert.deepEqual(attempted, [])
})

test('010 late SQL failure rolls back its column and ledger row with all historical policy and loan bytes intact', async () => {
  const broken = { ...addition, operations: [...addition.operations, ...runner.validateSql('CREATE TABLE dbo.collection_migration_canary(id int NULL);')] }
  await assert.rejects(runner.applyDisposableTest(ds, [...historyVersions, broken]), /already an object|already exists/i)
  await assertAbsent()
})

test('010 a truncated column type cannot pass full metadata validation or leave a partial migration', async () => {
  const wrongType = { ...addition, operations: runner.validateSql('ALTER TABLE dbo.payroll_policy_versions ADD collectionPolicy NVARCHAR(4000) NULL;') }
  await assert.rejects(runner.applyDisposableTest(ds, [...historyVersions, wrongType]), /metadata drift remains/)
  await assertAbsent()
})

test('010 an unrelated additive operation cannot substitute for required policy metadata', async () => {
  const missing = { ...addition, operations: runner.validateSql('ALTER TABLE dbo.collection_migration_canary ADD unrelatedField NVARCHAR(MAX) NULL;') }
  await assert.rejects(runner.applyDisposableTest(ds, [...historyVersions, missing]), /metadata drift remains/)
  await assertAbsent()
})

test('010 commits above immutable 006–009 with every prior field preserved, historical NULL and no remaining schema queries', async () => {
  const result = await runner.applyDisposableTest(ds, versions)
  assert.deepEqual(result.applied, [addition.version]); assert.deepEqual(result.skipped, historyVersions.map(row => row.version))
  assert.equal(result.existingColumnsAndCountsPreserved, true)
  assert.deepEqual(await historical(), original)
  assert.deepEqual((await columnState()).filter(row => !(row.tableName === 'payroll_policy_versions' && row.name === 'collectionPolicy')), beforeColumns)
  const added = (await columnState()).find(row => row.tableName === 'payroll_policy_versions' && row.name === 'collectionPolicy')
  assert.equal(added.type, 'nvarchar'); assert.equal(added.max_length, -1); assert.equal(added.is_nullable, true); assert.equal(added.defaultName, null); assert.equal(added.is_identity, false)
  assert.deepEqual(await query('SELECT collectionPolicy FROM dbo.payroll_policy_versions ORDER BY id'), [{ collectionPolicy: null }, { collectionPolicy: null }])
  const stored = await ds.getRepository(policyEntities.PayrollPolicyVersion).findOneByOrFail({ id: 1 })
  assert.equal(stored.collectionPolicy, null)
  assert.deepEqual((await query('SELECT * FROM dbo.payroll_schema_migrations ORDER BY version')).slice(0, 4), originalLedger)
  const diff = await runner.schemaDiff(ds)
  assert.deepEqual(diff, [])
  console.log(JSON.stringify({ migration: addition.version, finalSchemaQueries: diff.length, unsafeDrift: 0, historyPreserved: 4 }))
})

test('010 stores long Arabic non-policy JSON and decimal strings exactly, and recognizes only the complete textual policy shape', async () => {
  const encoded = JSON.stringify({ note: 'تفاصيل قرار التحصيل'.repeat(800), amount: '9999999999999999.99', enabled: false, optional: null })
  assert.ok(encoded.length > 4000)
  await writeCollection(encoded)
  const row = (await query('SELECT collectionPolicy,CONVERT(varbinary(max),collectionPolicy) AS bytes,DATALENGTH(collectionPolicy) AS byteLength FROM dbo.payroll_policy_versions WHERE id=1'))[0]
  assert.equal(row.collectionPolicy, encoded); assert.deepEqual(row.bytes, Buffer.from(encoded, 'utf16le')); assert.equal(row.byteLength, String(Buffer.byteLength(encoded, 'utf16le')))
  assert.deepEqual((await ds.getRepository(policyEntities.PayrollPolicyVersion).findOneByOrFail({ id: 1 })).collectionPolicy, { storageState: 'INVALID_COLLECTION_JSON', rawValue: encoded })
  assert.equal((await ds.getRepository(policyEntities.PayrollPolicyVersion).findOneByOrFail({ id: 2 })).collectionPolicy, null)
  savedPolicy = { schemaVersion: 'SRS_COLLECTION_V1_20260913', classifications: [], collectionOrder: [] }
  await writeCollection(JSON.stringify(savedPolicy))
  const valid = (await ds.getRepository(policyEntities.PayrollPolicyVersion).findOneByOrFail({ id: 1 })).collectionPolicy
  assert.deepEqual(valid, savedPolicy)
  assert.equal(inspectPayrollCollectionPolicy({ components: [], parameters: [], tierSets: [] }, valid).state, 'COMPLETE')
  assert.deepEqual(await historical(), original)
})

test('010 malformed JSON, JSON null and non-object values stay INVALID and clone/save preserves their original bytes', async () => {
  const definition = { components: [], parameters: [], tierSets: [] }
  assert.equal(inspectPayrollCollectionPolicy(definition, null).state, 'MISSING')
  const invalidValues = ['{"broken":"قرار غير مكتمل"', ' null ', ' 42 ', ' false ', ' "نص" ', ' [ ] ',
    ' {"storageState":"INVALID_COLLECTION_JSON","rawValue":"نص مغلف سابقًا"} ',
    ' {"unexpected":9007199254740993,"overflow":1e999,"nested":{"money":12345678901234567890.01}} ',
    '{"schemaVersion":"SRS_COLLECTION_V1_20260913","classifications":[{"componentCode":"LOAN","kind":9007199254740993}],"collectionOrder":["LOAN"]}',
    '{"schemaVersion":"SRS_COLLECTION_V1_20260913","classifications":[],"collectionOrder":[],"unexpected":9007199254740993}',
    '{"schemaVersion":"SRS_COLLECTION_V1_20260913","classifications":[]}']
  for (const [index, rawValue] of invalidValues.entries()) {
    await writeCollection(rawValue)
    const source = await ds.getRepository(policyEntities.PayrollPolicyVersion).findOneByOrFail({ id: 1 })
    const envelope = { storageState: 'INVALID_COLLECTION_JSON', rawValue }
    assert.deepEqual(source.collectionPolicy, envelope)
    assert.equal(inspectPayrollCollectionPolicy(definition, source.collectionPolicy).state, 'INVALID')
    // الحفظ الحقيقي يمر بالـtransformer، ثم نرجع معاملة النسخة لكي تبقى assertions التاريخية كاملة.
    const q = ds.createQueryRunner(); await q.connect(); await q.startTransaction()
    try {
      const repository = q.manager.getRepository(policyEntities.PayrollPolicyVersion)
      const clone = await repository.save(repository.create({ ...source, id: undefined, versionNo: 100 + index, sourceVersionId: source.id }))
      assert.notEqual(clone.id, source.id)
      const stored = (await q.query('SELECT collectionPolicy,CONVERT(varbinary(max),collectionPolicy) AS bytes FROM dbo.payroll_policy_versions WHERE id=@0', [clone.id]))[0]
      assert.equal(stored.collectionPolicy, rawValue); assert.deepEqual(stored.bytes, Buffer.from(rawValue, 'utf16le'))
      const loaded = await repository.findOneByOrFail({ id: clone.id })
      assert.deepEqual(loaded.collectionPolicy, envelope)
      assert.equal(inspectPayrollCollectionPolicy(definition, loaded.collectionPolicy).state, 'INVALID')
    } finally {
      if (q.isTransactionActive) await q.rollbackTransaction()
      await q.release()
    }
    assert.deepEqual(await historical(), original)
  }
  await writeCollection(JSON.stringify(savedPolicy))
  assert.deepEqual((await ds.getRepository(policyEntities.PayrollPolicyVersion).findOneByOrFail({ id: 1 })).collectionPolicy, savedPolicy)
  assert.deepEqual(await historical(), original)
})

test('010 replay preserves collection bytes, all earlier checksums and rejects changed or missing migration history', async () => {
  const replayState = async () => (await connection.request().query('SELECT id,CONVERT(varbinary(max),collectionPolicy) AS collectionBytes FROM dbo.payroll_policy_versions ORDER BY id; SELECT * FROM dbo.payroll_schema_migrations ORDER BY version')).recordsets
  const snapshot = await replayState()
  for (let index = 0; index < 2; index++) {
    const result = await runner.applyDisposableTest(ds, versions)
    assert.deepEqual(result.applied, []); assert.deepEqual(result.skipped, versions.map(row => row.version))
  }
  await assert.rejects(runner.applyDisposableTest(ds, [...historyVersions, { ...addition, checksum: '0'.repeat(64) }]), /missing or has changed/)
  await assert.rejects(runner.applyDisposableTest(ds, [...historyVersions.slice(0, 3), addition]), /missing or has changed/)
  await assert.rejects(runner.applyDisposableTest(ds, historyVersions), /missing or has changed/)
  assert.deepEqual(await replayState(), snapshot); assert.deepEqual(await historical(), original); assert.deepEqual(await runner.schemaDiff(ds), [])
})
