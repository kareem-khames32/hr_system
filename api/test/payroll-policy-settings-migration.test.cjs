'use strict'
// ترحيل007 فوق نسخة006 بها بيانات وتاريخ مصطنع، دون تعبئة إعدادات الماضي من القيم الحية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const { pool, env } = require('../scripts/migrations-lib.cjs')
const runner = require('../scripts/payroll-migrations.cjs')
const entities = require('../src/payroll/payroll-policy.entities.ts')
const definitionEntities = require('../src/payroll/payroll-policy-definition.entities.ts')
const database = 'hr_payroll_migration_test_' + crypto.randomBytes(8).toString('hex')
const migrations = runner.readMigrations()
const baseline = migrations.find(item => item.version === '20260913_006_payroll_policy_drafts')
const addition = migrations.find(item => item.version === '20260913_007_payroll_policy_settings')
const definitions = migrations.find(item => item.version === '20260913_008_payroll_policy_definitions')
const collection = migrations.find(item => item.version === '20260913_010_payroll_collection_policy')
const versions = [baseline, addition, definitions, collection]
const columns = ['defaultPeriodType', 'cycleStartDay', 'cycleEndMode', 'cycleEndDay', 'baseDaysBasis', 'monthlyDays',
  'dailyHours', 'rateBase', 'roundingMode', 'roundingScale', 'divisionByZeroMode', 'maxDeductionPctOfGross',
  'minNetGuarantee', 'netFloorPct', 'carryOverExcess', 'skipAttendance', 'lateDeductionEnabled', 'currency']
let master, connection, ds, created = false, original
async function historical() {
  return (await connection.request().query(`SELECT * FROM dbo.payroll_policies ORDER BY id;
    SELECT id,policyId,versionNo,sourceVersionId,status,effectiveFrom,effectiveTo,contractVersion,metadata,revision,publishedAt,publishedBy,frozenAt,createdBy,updatedBy,createdAt,updatedAt FROM dbo.payroll_policy_versions ORDER BY id;
    SELECT *,CONVERT(varbinary(max),CONVERT(nvarchar(max),payload)) AS payloadBytes FROM dbo.payroll_policy_events ORDER BY id;
    SELECT * FROM dbo.policy_settings_canary;`)).recordsets
}
async function assertNotApplied() {
  const count = (await connection.request().query("SELECT COUNT(*) AS n FROM sys.columns WHERE object_id=OBJECT_ID('dbo.payroll_policy_versions') AND name=N'defaultPeriodType'")).recordset[0].n
  assert.equal(count, 0)
  assert.deepEqual((await connection.request().query('SELECT version,checksum FROM dbo.payroll_schema_migrations')).recordset,
    [{ version: baseline.version, checksum: baseline.checksum }])
  assert.deepEqual(await historical(), original)
}
before(async () => {
  assert.ok(collection)
  assert.ok(baseline); assert.ok(addition); assert.ok(definitions)
  assert.match(database, /^hr_payroll_migration_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
  master = await pool('master'); await master.request().query(`CREATE DATABASE [${database}]`); created = true
  connection = await pool(database)
  ds = await runner.openDataSource(database, [...Object.values(entities), ...Object.values(definitionEntities)])
  for (const operation of baseline.operations) await ds.query(operation.sql)
  await ds.query('CREATE TABLE dbo.payroll_schema_migrations(version nvarchar(150) NOT NULL PRIMARY KEY,checksum char(64) NOT NULL,appliedAt datetime2 NOT NULL DEFAULT SYSDATETIME())')
  await ds.query('INSERT dbo.payroll_schema_migrations(version,checksum) VALUES(@0,@1)', [baseline.version, baseline.checksum])
  await connection.request().batch(`CREATE TABLE dbo.policy_settings_canary(id int PRIMARY KEY,originalBytes varbinary(max) NOT NULL,amount decimal(18,2) NOT NULL);
    INSERT dbo.policy_settings_canary VALUES(71,0xFFEEDD000123,12500.17);
    INSERT dbo.payroll_policies(code,name,description,createdBy,updatedBy) VALUES(N'BASELINE_006',N'سياسة قديمة',N'لا تغير تاريخها',1,1);
    INSERT dbo.payroll_policy_versions(policyId,versionNo,status,effectiveFrom,metadata,createdBy,updatedBy) VALUES(1,1,N'DRAFT','2026-01-01',N'{"notes":"إعدادات غير محفوظة سابقاً"}',1,1);
    INSERT dbo.payroll_policy_versions(policyId,versionNo,sourceVersionId,status,effectiveFrom,effectiveTo,contractVersion,publishedAt,publishedBy,frozenAt,createdBy,updatedBy)
      VALUES(1,2,1,N'ACTIVE','2026-02-01','2026-12-31',N'LEGACY_V1','2026-01-31T12:30:01',1,'2026-02-28T15:15:15',1,1);
    INSERT dbo.payroll_policy_events(policyId,versionId,eventType,actorUserId,reason,payload) VALUES(1,2,N'LEGACY_FIXTURE',1,N'أثر تاريخي مصطنع',N'{"before":null,"after":{"value":30.15}}');`)
  original = await historical()
}, { timeout: 60000 })
after(async () => {
  if (ds?.isInitialized) await ds.destroy(); if (connection) await connection.close()
  if (created) {
    assert.match(database, /^hr_payroll_migration_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
    await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
    assert.equal((await master.request().input('database', database).query('SELECT DB_ID(@database) AS id')).recordset[0].id, null)
    console.log(JSON.stringify({ database, removed: true }))
  }
  if (master) await master.close()
})
test('PL-01/007: exactly eighteen explicit nullable additions match real metadata with no backfill', async () => {
  assert.equal(addition.operations.length, columns.length)
  for (const [i, operation] of addition.operations.entries()) {
    assert.equal(operation.kind, 'add-column'); assert.equal(operation.table, 'payroll_policy_versions')
    assert.match(operation.sql, new RegExp('ADD \\[' + columns[i] + '\\] ')); assert.match(operation.sql, / NULL;$/)
    assert.doesNotMatch(operation.sql, /\bDEFAULT\b|\bUPDATE\b|\bDROP\b|NOT NULL/i)
  }
  const diff = await runner.schemaDiff(ds)
  const settingsQueries = diff.filter(query => columns.some(column => query.includes('ADD "' + column + '" ')))
  assert.equal(settingsQueries.length, columns.length)
  for (const query of settingsQueries) {
    const result = runner.classifyMetadataQuery(query, ds.entityMetadatas)
    assert.equal(result.safe, true, query); assert.ok(result.nullableMetadataEvidence, query)
    assert.equal(result.nullableMetadataEvidence.table, 'payroll_policy_versions')
  }
})
test('PL-01/007: late DDL failure rolls back additions and retains baseline ledger and all historical values', async () => {
  const bad = { ...addition, operations: [...addition.operations.slice(0, 4), ...runner.validateSql('CREATE TABLE dbo.payroll_policies(id int NULL);')] }
  await assert.rejects(runner.applyDisposableTest(ds, [baseline, bad, definitions, collection]), /already an object|already exists/i)
  await assertNotApplied()
})
test('PL-01/007: an incomplete schema rolls back before commit', async () => {
  await assert.rejects(runner.applyDisposableTest(ds, [baseline, { ...addition, operations: addition.operations.slice(0, -1) }, definitions, collection]), /metadata drift remains/)
  await assertNotApplied()
})
test('PL-01/007: explicit historical 007 phase keeps eighteen NULL settings before completing 008 and 010 metadata', async () => {
  // نفصل لقطة007 قبل008؛ اختبار006 يطبق السلسلة كلها بالـrunner في معاملة واحدة أيضًا.
  const q = ds.createQueryRunner(); await q.connect(); await q.startTransaction()
  try {
    for (const operation of addition.operations) await q.query(operation.sql)
    await q.query('INSERT dbo.payroll_schema_migrations(version,checksum) VALUES(@0,@1)', [addition.version, addition.checksum])
    await q.commitTransaction()
  } catch (error) { if (q.isTransactionActive) await q.rollbackTransaction(); throw error }
  finally { await q.release() }
  assert.deepEqual(await historical(), original)
  const rows = (await connection.request().query('SELECT ' + columns.map(name => '[' + name + ']').join(',') + ' FROM dbo.payroll_policy_versions')).recordset
  assert.equal(rows.length, 2)
  for (const row of rows) for (const column of columns) assert.equal(row[column], null, column)
  const marker = (await connection.request().query("SELECT COL_LENGTH(N'dbo.payroll_policy_versions',N'catalogVersion') AS length")).recordset[0].length
  assert.equal(marker, null)
  const result = await runner.applyDisposableTest(ds, versions)
  assert.deepEqual(result.skipped, [baseline.version, addition.version]); assert.deepEqual(result.applied, [definitions.version, collection.version])
  assert.equal(result.existingColumnsAndCountsPreserved, true); assert.deepEqual(await runner.schemaDiff(ds), [])
  assert.deepEqual(await historical(), original)
})
test('PL-01/007: replay preserves explicitly edited new settings and rejects changed migration checksums', async () => {
  await connection.request().query(`UPDATE dbo.payroll_policy_versions SET defaultPeriodType=N'CUSTOM_DAY_RANGE',cycleStartDay=26,cycleEndMode=N'FIXED_DAY',cycleEndDay=25,
    baseDaysBasis=N'FIXED_30',monthlyDays=30,dailyHours=7.5,rateBase=N'BASIC',roundingMode=N'HALF_EVEN',roundingScale=4,divisionByZeroMode=N'FAIL_ROW',
    maxDeductionPctOfGross=45.1234,minNetGuarantee=2000.15,netFloorPct=15.4321,carryOverExcess=1,skipAttendance=1,lateDeductionEnabled=0,currency=N'EGP' WHERE id=2`)
  const beforeReplay = (await connection.request().query('SELECT * FROM dbo.payroll_policy_versions ORDER BY id; SELECT * FROM dbo.payroll_schema_migrations ORDER BY version')).recordsets
  for (let i = 0; i < 2; i++) {
    const result = await runner.applyDisposableTest(ds, versions); assert.deepEqual(result.applied, [])
    assert.deepEqual(result.skipped, versions.map(version => version.version))
  }
  await assert.rejects(runner.applyDisposableTest(ds, [baseline, { ...addition, checksum: '0'.repeat(64) }, definitions, collection]), /missing or has changed/)
  assert.deepEqual((await connection.request().query('SELECT * FROM dbo.payroll_policy_versions ORDER BY id; SELECT * FROM dbo.payroll_schema_migrations ORDER BY version')).recordsets, beforeReplay)
  assert.deepEqual(await historical(), original); assert.deepEqual(await runner.schemaDiff(ds), [])
})
