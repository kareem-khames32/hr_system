'use strict'
// ترحيل008 فوق تاريخ007 على قاعدة عشوائية فقط؛ نثبت سلامة التراجع والملكية وقيود SQL.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const { pool, env } = require('../scripts/migrations-lib.cjs')
const runner = require('../scripts/payroll-migrations.cjs')
const policyEntities = require('../src/payroll/payroll-policy.entities.ts')
const definitionEntities = require('../src/payroll/payroll-policy-definition.entities.ts')
const database = 'hr_payroll_migration_test_' + crypto.randomBytes(8).toString('hex')
const allVersions = runner.readMigrations()
const versions = allVersions.filter(item => ['20260913_006_payroll_policy_drafts', '20260913_007_payroll_policy_settings', '20260913_008_payroll_policy_definitions', '20260913_010_payroll_collection_policy'].includes(item.version))
const [baseline, settings, addition, collection] = versions
const newTables = new Set(['payroll_policy_components', 'payroll_policy_parameters', 'payroll_tier_sets', 'payroll_policy_tiers'])
const newColumns = ['catalogVersion', 'engineVersion', 'definitionWarningAcknowledgements']
let master, connection, ds, created = false, original, oldVersionColumns, originalLedger, setA, setB, componentId, parameterId, tierId
const query = async sql => (await connection.request().query(sql)).recordset
const historical = async () => (await connection.request().query(`SELECT * FROM dbo.payroll_policies ORDER BY id;
  SELECT ${oldVersionColumns.map(name => '[' + name + ']').join(',')} FROM dbo.payroll_policy_versions ORDER BY id;
  SELECT *,CONVERT(varbinary(max),CONVERT(nvarchar(max),payload)) AS payloadBytes FROM dbo.payroll_policy_events ORDER BY id;
  SELECT * FROM dbo.policy_definition_canary ORDER BY id;`)).recordsets
const assertAbsent = async () => {
  for (const table of newTables) assert.equal((await query(`SELECT OBJECT_ID(N'dbo.${table}') AS id`))[0].id, null)
  assert.equal((await query("SELECT COUNT(*) AS n FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.payroll_policy_versions') AND name IN(N'catalogVersion',N'engineVersion',N'definitionWarningAcknowledgements')"))[0].n, 0)
  assert.deepEqual(await query('SELECT * FROM dbo.payroll_schema_migrations ORDER BY version'), originalLedger)
  assert.deepEqual(await historical(), original)
}
const definitionsSnapshot = async () => {
  const records = []
  for (const table of newTables) records.push((await query(`SELECT (SELECT * FROM dbo.${table} ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES) AS payload`))[0].payload)
  records.push((await query('SELECT (SELECT * FROM dbo.payroll_schema_migrations ORDER BY version FOR JSON PATH) AS payload'))[0].payload)
  return records
}
before(async () => {
  assert.equal(versions.length, 4); assert.match(database, /^hr_payroll_migration_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
  master = await pool('master'); await master.request().query(`CREATE DATABASE [${database}]`); created = true
  connection = await pool(database)
  ds = await runner.openDataSource(database, [...Object.values(policyEntities), ...Object.values(definitionEntities)])
  for (const version of [baseline, settings]) for (const operation of version.operations) await ds.query(operation.sql)
  await ds.query('CREATE TABLE dbo.payroll_schema_migrations(version nvarchar(150) NOT NULL PRIMARY KEY,checksum char(64) NOT NULL,appliedAt datetime2 NOT NULL DEFAULT SYSDATETIME())')
  for (const version of [baseline, settings]) await ds.query('INSERT dbo.payroll_schema_migrations(version,checksum) VALUES(@0,@1)', [version.version, version.checksum])
  await connection.request().batch(`CREATE TABLE dbo.policy_definition_canary(id int PRIMARY KEY,originalBytes varbinary(max) NOT NULL,amount decimal(18,2) NOT NULL);
    INSERT dbo.policy_definition_canary VALUES(91,0x00FFCEAD1122,12500.17);
    INSERT dbo.payroll_policies(code,name,description,createdBy,updatedBy) VALUES(N'BASELINE_007',N'سياسة تاريخية',N'تاريخ غير قابل للتعبئة ضمنيًا',1,1);
    INSERT dbo.payroll_policy_versions(policyId,versionNo,status,effectiveFrom,metadata,createdBy,updatedBy) VALUES(1,1,N'DRAFT','2026-01-01',N'{"title":"قبل التعريفات"}',1,1);
    INSERT dbo.payroll_policy_versions(policyId,versionNo,sourceVersionId,status,effectiveFrom,effectiveTo,contractVersion,publishedAt,publishedBy,frozenAt,createdBy,updatedBy,
      defaultPeriodType,cycleStartDay,cycleEndMode,cycleEndDay,baseDaysBasis,monthlyDays,dailyHours,rateBase,roundingMode,roundingScale,divisionByZeroMode,maxDeductionPctOfGross,minNetGuarantee,netFloorPct,carryOverExcess,skipAttendance,lateDeductionEnabled,currency)
      VALUES(1,2,1,N'ACTIVE','2026-02-01','2026-12-31',N'LEGACY_V1','2026-01-31T12:30:01',1,'2026-02-28T15:15:15',1,1,
      N'CUSTOM_DAY_RANGE',26,N'FIXED_DAY',25,N'FIXED_30',30,7.5,N'BASIC',N'HALF_EVEN',4,N'FAIL_ROW',45.1234,2000.15,15.4321,1,1,0,N'EGP');
    INSERT dbo.payroll_policy_events(policyId,versionId,eventType,actorUserId,reason,payload) VALUES(1,2,N'LEGACY_FIXTURE',1,N'تاريخ007',N'{"value":30.15,"notes":"محتوى عربي ثابت"}');`)
  oldVersionColumns = (await query("SELECT name FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.payroll_policy_versions') ORDER BY column_id")).map(row => row.name)
  original = await historical(); originalLedger = await query('SELECT * FROM dbo.payroll_schema_migrations ORDER BY version')
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

test('PL-03/008 begins from explicit historical 007 settings and adds only three nullable markers plus four new tables', async () => {
  assert.equal(original[1][1].dailyHours, 7.5); assert.equal(original[1][1].roundingMode, 'HALF_EVEN')
  assert.equal(original[1][1].contractVersion, 'LEGACY_V1'); assert.equal(original[1][1].definitionWarningAcknowledgements, undefined)
  assert.deepEqual(addition.operations.filter(operation => operation.kind === 'add-column').map(operation => operation.table), Array(3).fill('payroll_policy_versions'))
  for (const [index, operation] of addition.operations.filter(operation => operation.kind === 'add-column').entries()) {
    assert.match(operation.sql, new RegExp('ADD \\[' + newColumns[index] + '\\] ')); assert.match(operation.sql, / NULL;$/); assert.doesNotMatch(operation.sql, /DEFAULT|NOT NULL/)
  }
  assert.deepEqual(new Set(addition.operations.filter(operation => operation.kind === 'create-table').map(operation => operation.table)), newTables)
  assert.equal(addition.operations.flatMap(operation => operation.foreignKeys || []).length, 5)
  assert.equal(addition.operations.flatMap(operation => operation.checks || []).length, 2)
  await assertAbsent()
})

test('PL-03/008 current SQL metadata diff permits only newly created sources with exact managed-owner and CHECK evidence', async () => {
  const diff = await runner.schemaDiff(ds), managed = runner.managedPriorPayrollTables(versions, originalLedger)
  let managedKeys = 0
  for (const query of diff) {
    const result = runner.classifyMetadataQuery(query, ds.entityMetadatas, newTables, managed)
    assert.equal(result.safe, true, query)
    if (result.newTableForeignKeyEvidence?.referencedMigration) managedKeys++
  }
  assert.equal(managedKeys, 3)
})

test('PL-03/008 late DDL failure rolls back every new table, FK, CHECK, nullable column and ledger row', async () => {
  const bad = { ...addition, operations: [...addition.operations, ...runner.validateSql('CREATE TABLE dbo.policy_definition_canary(id int NULL);')] }
  await assert.rejects(runner.applyDisposableTest(ds, [baseline, settings, bad, collection]), /already an object|already exists/i)
  await assertAbsent()
})

test('PL-03/008 missing metadata and mismatched managed FK or CHECK definitions prevent commit', async () => {
  await assert.rejects(runner.applyDisposableTest(ds, [baseline, settings, { ...addition, operations: addition.operations.slice(0, -1) }, collection]), /metadata drift remains/)
  await assertAbsent()
  const key = ds.entityMetadatas.find(metadata => metadata.tableName === 'payroll_tier_sets').foreignKeys.find(key => key.name === 'FK_payroll_tier_set_version')
  const keyName = key.name
  try { key.name = 'FORGED_METADATA'; await assert.rejects(runner.applyDisposableTest(ds, versions), /exact entity metadata/) } finally { key.name = keyName }
  await assertAbsent()
  const check = ds.entityMetadatas.find(metadata => metadata.tableName === 'payroll_policy_tiers').checks[0]
  const expression = check.expression
  try { check.expression = '1=1'; await assert.rejects(runner.applyDisposableTest(ds, versions), /exact entity metadata/) } finally { check.expression = expression }
  await assertAbsent()
})

test('PL-03/008 applies above 007 without backfill or history changes and leaves complete current metadata', async () => {
  const result = await runner.applyDisposableTest(ds, versions)
  assert.deepEqual(result.applied, [addition.version, collection.version]); assert.deepEqual(result.skipped, [baseline.version, settings.version])
  assert.equal(result.existingColumnsAndCountsPreserved, true); assert.deepEqual(await historical(), original)
  assert.deepEqual(await runner.schemaDiff(ds), [])
  for (const row of await query('SELECT catalogVersion,engineVersion,definitionWarningAcknowledgements FROM dbo.payroll_policy_versions')) assert.deepEqual(row, { catalogVersion: null, engineVersion: null, definitionWarningAcknowledgements: null })
  for (const table of newTables) assert.equal((await query(`SELECT COUNT(*) AS n FROM dbo.${table}`))[0].n, 0)
  const checks = await query("SELECT name,is_disabled,is_not_trusted FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.payroll_policy_tiers')")
  assert.equal(checks.length, 2); for (const check of checks) { assert.equal(check.is_disabled, false); assert.equal(check.is_not_trusted, false) }
  const keys = await query('SELECT name,delete_referential_action_desc AS onDelete,update_referential_action_desc AS onUpdate FROM sys.foreign_keys')
  assert.equal(keys.length, 9); for (const key of keys) { assert.equal(key.onDelete, 'NO_ACTION'); assert.equal(key.onUpdate, 'NO_ACTION') }
})

test('PL-03/008 creates valid linked definitions and retains decimal strings at SQL precision boundaries', async () => {
  const setColumns = 'versionId,code,nameAr,inputUnit,applicationBasis,tierApplicationMode,graceMode,graceMinutes,allowGraceOnFlexibleShift,allowShiftGraceOverride,noMatchBehavior,secondsRoundingMode,minutesRoundingMode,roundingUnitMinutes,isActive'
  const setValues = "N'SET_A',N'شرائح',N'MINUTES',N'PER_DAY',N'WHOLE',N'NONE',0,0,0,N'NO_DEDUCTION',N'FLOOR',N'FLOOR',1,1"
  setA = (await query(`INSERT dbo.payroll_tier_sets(${setColumns}) OUTPUT INSERTED.id VALUES(1,${setValues})`))[0].id
  setB = (await query(`INSERT dbo.payroll_tier_sets(${setColumns}) OUTPUT INSERTED.id VALUES(2,${setValues})`))[0].id
  componentId = (await query(`INSERT dbo.payroll_policy_components(versionId,code,nameAr,componentType,stage,sequence,valueSource,unit,prorationMode,tierSetId,carryOverEligible,exemptible,showOnPayslip,isActive)
    OUTPUT INSERTED.id VALUES(1,N'TEST_COMPONENT',N'بند',N'DEDUCTION',3,1,N'TIERED',N'CURRENCY',N'NONE',${setA},0,1,1,1)`))[0].id
  parameterId = (await query("INSERT dbo.payroll_policy_parameters(versionId,code,nameAr,value,unit,isActive) OUTPUT INSERTED.id VALUES(1,N'FACTOR',N'معامل',CAST(N'999999999999.123456' AS decimal(18,6)),N'SCALAR',1)"))[0].id
  tierId = (await query(`INSERT dbo.payroll_policy_tiers(tierSetId,sequence,fromValue,toValue,method,isActive) OUTPUT INSERTED.id VALUES(${setA},1,0,NULL,N'NONE',1)`))[0].id
  assert.equal((await query(`SELECT CAST(value AS nvarchar(80)) AS value FROM dbo.payroll_policy_parameters WHERE id=${parameterId}`))[0].value, '999999999999.123456')
  await query(`UPDATE dbo.payroll_policy_components SET amount=CAST(N'9999999999999999.99' AS decimal(18,2)) WHERE id=${componentId}`)
  assert.equal((await query(`SELECT CAST(amount AS nvarchar(80)) AS amount FROM dbo.payroll_policy_components WHERE id=${componentId}`))[0].amount, '9999999999999999.99')
  await query(`UPDATE dbo.payroll_policy_components SET amount=NULL WHERE id=${componentId}`)
  assert.deepEqual(await historical(), original)
})

test('PL-03/008 SQL foreign keys reject orphan owners and cross-version tier references, including direct SQL writes', async () => {
  for (const sql of [`UPDATE dbo.payroll_policy_components SET tierSetId=${setB} WHERE id=${componentId}`,
    `UPDATE dbo.payroll_policy_components SET versionId=999999 WHERE id=${componentId}`,
    `UPDATE dbo.payroll_policy_parameters SET versionId=999999 WHERE id=${parameterId}`,
    `UPDATE dbo.payroll_tier_sets SET versionId=999999 WHERE id=${setB}`,
    `UPDATE dbo.payroll_policy_tiers SET tierSetId=999999 WHERE id=${tierId}`,
    `DELETE dbo.payroll_tier_sets WHERE id=${setA}`,
  ]) await assert.rejects(connection.request().query(sql), /constraint/i)
  assert.equal((await query(`SELECT tierSetId FROM dbo.payroll_policy_components WHERE id=${componentId}`))[0].tierSetId, setA)
})

test('PL-03/008 unique codes and sequences remain scoped to their version, stage and tier set', async () => {
  for (const sql of [
    `INSERT dbo.payroll_policy_parameters(versionId,code,nameAr,value,unit,isActive) VALUES(1,N'FACTOR',N'مكرر',1,N'SCALAR',1)`,
    `UPDATE dbo.payroll_tier_sets SET versionId=1 WHERE id=${setB}`,
    `INSERT dbo.payroll_policy_tiers(tierSetId,sequence,fromValue,toValue,method,isActive) VALUES(${setA},1,0,NULL,N'NONE',1)`,
    `INSERT dbo.payroll_policy_components(versionId,code,nameAr,componentType,stage,sequence,valueSource,unit,prorationMode,carryOverEligible,exemptible,showOnPayslip,isActive) VALUES(1,N'TEST_COMPONENT',N'مكرر',N'INFO',1,2,N'FIXED',N'CURRENCY',N'NONE',0,0,1,1)`,
    `INSERT dbo.payroll_policy_components(versionId,code,nameAr,componentType,stage,sequence,valueSource,unit,prorationMode,carryOverEligible,exemptible,showOnPayslip,isActive) VALUES(1,N'OTHER_COMPONENT',N'مكرر',N'INFO',3,1,N'FIXED',N'CURRENCY',N'NONE',0,0,1,1)`,
  ]) await assert.rejects(connection.request().query(sql), /duplicate|constraint/i)
  assert.equal((await query("SELECT COUNT(*) AS n FROM dbo.payroll_tier_sets WHERE code=N'SET_A'"))[0].n, 2)
})

test('PL-03/008 CHECK enforces complete method fields with no SQL UNKNOWN/null escape', async () => {
  const invalid = ["method=N'UNKNOWN'", "method=N'MULTIPLIER'", "method=N'MULTIPLIER',multiplier=0", "method=N'MULTIPLIER',multiplier=-1",
    "method=N'MULTIPLIER',multiplier=1.5,dayFraction=0.25", "method=N'DAY_FRACTION'", "method=N'DAY_FRACTION',dayFraction=0",
    "method=N'DAY_FRACTION',dayFraction=1.0001", "method=N'FIXED_AMOUNT'", "method=N'FIXED_AMOUNT',fixedAmount=0",
    "method=N'FIXED_AMOUNT',fixedAmount=-1", "method=N'FORMULA'", "method=N'FORMULA',formula=N''", "method=N'FORMULA',formula=N'   '",
    "method=N'NONE',multiplier=1", "method=N'RATE_1_1',formula=N'1'", "sequence=0", "fromValue=-1", "toValue=0"]
  for (const change of invalid) {
    await assert.rejects(connection.request().query(`UPDATE dbo.payroll_policy_tiers SET ${change} WHERE id=${tierId}`), /CHECK constraint/i, change)
    assert.equal((await query(`SELECT method FROM dbo.payroll_policy_tiers WHERE id=${tierId}`))[0].method, 'NONE')
  }
  for (const change of ["method=N'NONE'", "method=N'RATE_1_1'", "method=N'MULTIPLIER',multiplier=1.5", "method=N'DAY_FRACTION',dayFraction=0.25",
    "method=N'FIXED_AMOUNT',fixedAmount=125.50", "method=N'FORMULA',formula=N'BASE_SALARY * 10%'"]) {
    await query(`UPDATE dbo.payroll_policy_tiers SET ${change} WHERE id=${tierId}`)
    await query(`UPDATE dbo.payroll_policy_tiers SET method=N'NONE',multiplier=NULL,dayFraction=NULL,fixedAmount=NULL,formula=NULL WHERE id=${tierId}`)
  }
})

test('PL-03/008 replay preserves definition bytes, historical settings and ledger checksums', async () => {
  const beforeReplay = await definitionsSnapshot()
  for (let index = 0; index < 2; index++) {
    const result = await runner.applyDisposableTest(ds, versions)
    assert.deepEqual(result.applied, []); assert.deepEqual(result.skipped, versions.map(version => version.version))
  }
  await assert.rejects(runner.applyDisposableTest(ds, [baseline, settings, { ...addition, checksum: '0'.repeat(64) }, collection]), /missing or has changed/)
  assert.deepEqual(await definitionsSnapshot(), beforeReplay); assert.deepEqual(await historical(), original)
  assert.deepEqual(await runner.schemaDiff(ds), [])
})
