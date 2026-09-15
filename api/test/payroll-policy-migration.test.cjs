'use strict'
// ترحيل السياسات على قاعدة عشوائية فقط، مع إثبات حفظ الصفوف القديمة والتراجع الكامل.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { pool, env } = require('../scripts/migrations-lib.cjs')
const runner = require('../scripts/payroll-migrations.cjs')
const { EntitySchema } = require('../node_modules/typeorm')
const entities = require('../src/payroll/payroll-policy.entities.ts')
const definitionEntities = require('../src/payroll/payroll-policy-definition.entities.ts')
const CHARGE_RULE_COLUMNS_033 = ['lateDeductionEnabled', 'latenessTierSetId', 'earlyLeaveDeductionEnabled', 'shortfallEnabled', 'shortfallMode', 'shortfallValue', 'absencePenaltyDays']
const database = 'hr_payroll_migration_test_' + crypto.randomBytes(8).toString('hex')
const canary = new EntitySchema({ name: 'PolicyMigrationCanary', tableName: 'policy_migration_canary', columns: {
  id: { type: 'int', primary: true }, originalBytes: { type: 'varbinary', length: 'MAX' }, amount: { type: 'decimal', precision: 18, scale: 2 },
} })
const version = runner.readMigrations().find(item => item.version === '20260913_006_payroll_policy_drafts')
// نختبر المخطط الحالي مع سلسلة الترحيل كاملة؛ يبقى محتوى006 وقيوده مستقلين بلا تعديل.
const settingsVersion = runner.readMigrations().find(item => item.version === '20260913_007_payroll_policy_settings')
const definitionVersion = runner.readMigrations().find(item => item.version === '20260913_008_payroll_policy_definitions')
const collectionVersion = runner.readMigrations().find(item => item.version === '20260913_010_payroll_collection_policy')
const versions = [version, settingsVersion, definitionVersion, collectionVersion]
const names = new Set(['payroll_policies', 'payroll_policy_versions', 'payroll_policy_events'])
const currentNames = new Set([...names, 'payroll_policy_components', 'payroll_policy_parameters', 'payroll_tier_sets', 'payroll_policy_tiers'])
let master, connection, ds, created = false, original, diff
const bytes = async () => (await connection.request().query('SELECT * FROM dbo.policy_migration_canary ORDER BY id')).recordset
const absent = async () => {
  const state = (await connection.request().query("SELECT OBJECT_ID(N'dbo.payroll_policies') AS policy,OBJECT_ID(N'dbo.payroll_policy_versions') AS version,OBJECT_ID(N'dbo.payroll_policy_events') AS event,OBJECT_ID(N'dbo.payroll_schema_migrations') AS ledger")).recordset[0]
  assert.deepEqual(state, { policy: null, version: null, event: null, ledger: null })
  for (const table of [...currentNames].filter(table => !names.has(table))) assert.equal((await connection.request().query(`SELECT OBJECT_ID(N'dbo.${table}') AS id`)).recordset[0].id, null)
  assert.deepEqual(await bytes(), original)
}
before(async () => {
  assert.ok(collectionVersion)
  assert.ok(version); assert.ok(settingsVersion); assert.ok(definitionVersion); assert.match(database, /^hr_payroll_migration_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
  master = await pool('master'); await master.request().query(`CREATE DATABASE [${database}]`); created = true
  connection = await pool(database)
  ds = await runner.openDataSource(database, [canary, ...Object.values(entities), ...Object.values(definitionEntities)])
  // هذا الاختبار يثبت عقد006–010؛ أعمدة «طريقة الخصم» السبعة على payroll_policies في033 يطبقها المُرحّل المجمّع (db-migrate.cjs) ولا تُنسب إلى هذه السلسلة.
  for (const metadata of ds.entityMetadatas) {
    const later = metadata.tableName === 'payroll_policies' ? CHARGE_RULE_COLUMNS_033 : []
    metadata.columns = metadata.columns.filter(column => !later.includes(column.databaseName))
    metadata.ownColumns = metadata.ownColumns.filter(column => !later.includes(column.databaseName))
  }
  const key = ds.namingStrategy.primaryKeyName('policy_migration_canary', ['id'])
  await connection.request().batch(`CREATE TABLE dbo.policy_migration_canary(id int NOT NULL,originalBytes varbinary(max) NOT NULL,amount decimal(18,2) NOT NULL,CONSTRAINT [${key}] PRIMARY KEY(id)); INSERT dbo.policy_migration_canary VALUES(71,0x00FF102ABC,12500.17)`)
  original = await bytes(); diff = await runner.schemaDiff(ds)
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
test('PL-MIG 006 creates only three new tables and four restrictive relationships', () => {
  assert.equal(version.operations.length, 7)
  assert.deepEqual(new Set(version.operations.filter(op => op.kind === 'create-table').map(op => op.table)), names)
  assert.equal(version.operations.flatMap(op => op.foreignKeys || []).length, 4)
  assert.equal(version.operations.some(op => op.kind === 'add-column'), false)
  const content = fs.readFileSync(path.resolve(__dirname, '../../docs/migrations/payroll/20260913_006_payroll_policy_drafts.sql'), 'utf8')
  assert.doesNotThrow(() => runner.validateSql(content))
})
test('PL-MIG rejects foreign keys to existing tables and all cascading or disguised operations', () => {
  const prefix = 'CREATE TABLE dbo.new_parent(id int NOT NULL,CONSTRAINT PK_new_parent PRIMARY KEY(id));'
  const child = (target = 'dbo.new_parent', actions = 'ON DELETE NO ACTION ON UPDATE NO ACTION') => `CREATE TABLE dbo.new_child(id int NOT NULL,parentId int NULL,CONSTRAINT FK_new_child FOREIGN KEY(parentId) REFERENCES ${target}(id) ${actions});`
  assert.doesNotThrow(() => runner.validateSql(prefix + child()))
  assert.doesNotThrow(() => runner.validateSql('CREATE TABLE dbo.new_parent(id int NOT NULL,parentId int NULL,CONSTRAINT FK_self FOREIGN KEY(parentId) REFERENCES dbo.new_parent(id) ON DELETE NO ACTION ON UPDATE NO ACTION);'))
  for (const sql of [child(), prefix + child('dbo.employees'), prefix + child('other.dbo.new_parent'), prefix + child('other.new_parent'),
    prefix + child('dbo.payroll_schema_migrations'), prefix + child('dbo.new_parent', 'ON DELETE CASCADE ON UPDATE NO ACTION'),
    prefix + child('dbo.new_parent', 'ON DELETE NO ACTION ON UPDATE CASCADE'), prefix + child('dbo.new_parent', 'ON DELETE SET NULL ON UPDATE NO ACTION'),
    prefix + child('dbo.new_parent', ''), child() + prefix,
    prefix + 'ALTER TABLE dbo.employees ADD CONSTRAINT FK_existing FOREIGN KEY(id) REFERENCES dbo.new_parent(id) ON DELETE NO ACTION ON UPDATE NO ACTION;',
    prefix + child().replace('FOREIGN KEY(parentId)', 'FOREIGN KEY(parentId,id)'), prefix + child() + 'DELETE FROM dbo.employees;',
  ]) assert.throws(() => runner.validateSql(sql), undefined, sql)
})
test('PL-MIG generated foreign-key plans require both new tables and exact metadata evidence', () => {
  const foreignKeys = diff.filter(query => /ADD CONSTRAINT .* FOREIGN KEY/i.test(query))
  assert.equal(foreignKeys.length, 9)
  for (const query of foreignKeys) {
    assert.throws(() => runner.validateSql(query), undefined, 'Authored ALTER foreign keys stay forbidden')
    assert.equal(runner.classifyMetadataQuery(query, ds.entityMetadatas).safe, false)
    assert.equal(runner.classifyMetadataQuery(query, [], currentNames).safe, false)
    const result = runner.classifyMetadataQuery(query, ds.entityMetadatas, currentNames)
    assert.equal(result.safe, true, query); assert.ok(result.newTableForeignKeyEvidence)
    const missingTarget = new Set([...currentNames].filter(name => name !== result.newTableForeignKeyEvidence.referencedTable))
    assert.equal(runner.classifyMetadataQuery(query, ds.entityMetadatas, missingTarget).safe, false)
    for (const forged of [query.replace('ON DELETE NO ACTION', 'ON DELETE CASCADE'), query.replace(/CONSTRAINT "([^"]+)"/, 'CONSTRAINT "forged"'), query + '; DELETE FROM dbo.policy_migration_canary;']) {
      assert.equal(runner.classifyMetadataQuery(forged, ds.entityMetadatas, currentNames).safe, false, forged)
    }
  }
  for (const query of diff) assert.equal(runner.classifyMetadataQuery(query, ds.entityMetadatas, currentNames).safe, true, query)
})
test('PL-MIG a late SQL failure rolls back all policy DDL, constraints and ledger', async () => {
  const bad = { ...version, operations: [...version.operations, ...runner.validateSql('CREATE TABLE dbo.policy_migration_canary(id int NULL);')] }
  await assert.rejects(runner.applyDisposableTest(ds, [bad, settingsVersion, definitionVersion, collectionVersion]), /already an object|already exists/i)
  await absent()
})
test('PL-MIG incomplete schema rolls back before commit', async () => {
  await assert.rejects(runner.applyDisposableTest(ds, [{ ...version, operations: version.operations.slice(0, -1) }, settingsVersion, definitionVersion, collectionVersion]), /metadata drift remains/)
  await absent()
})
test('PL-MIG 006 through 008 then 010 match complete policy metadata and preserve old column definitions and rows', async () => {
  const result = await runner.applyDisposableTest(ds, versions)
  assert.deepEqual(result.applied, versions.map(item => item.version)); assert.equal(result.existingColumnsAndCountsPreserved, true)
  assert.deepEqual(await runner.schemaDiff(ds), []); assert.deepEqual(await bytes(), original)
  const keys = (await connection.request().query("SELECT name,delete_referential_action_desc AS onDelete,update_referential_action_desc AS onUpdate FROM sys.foreign_keys ORDER BY name")).recordset
  assert.equal(keys.length, 9); for (const key of keys) { assert.equal(key.onDelete, 'NO_ACTION'); assert.equal(key.onUpdate, 'NO_ACTION') }
})
test('PL-MIG SQL enforces unique policy codes, unique version numbers and all four foreign keys', async () => {
  await connection.request().batch("INSERT dbo.payroll_policies(code,name,createdBy,updatedBy) VALUES(N'POLICY_TEST',N'Test',1,1); INSERT dbo.payroll_policy_versions(policyId,versionNo,effectiveFrom,createdBy,updatedBy) VALUES(1,1,'2026-09-01',1,1); INSERT dbo.payroll_policy_events(policyId,versionId,eventType,actorUserId,payload) VALUES(1,1,N'CREATED',1,N'{}')")
  for (const sql of ["INSERT dbo.payroll_policies(code,name,createdBy,updatedBy) VALUES(N'POLICY_TEST',N'Duplicate',1,1)",
    "INSERT dbo.payroll_policy_versions(policyId,versionNo,effectiveFrom,createdBy,updatedBy) VALUES(1,1,'2026-09-01',1,1)",
    "INSERT dbo.payroll_policy_versions(policyId,versionNo,effectiveFrom,createdBy,updatedBy) VALUES(999999,1,'2026-09-01',1,1)",
    "UPDATE dbo.payroll_policy_versions SET sourceVersionId=999999 WHERE id=1",
    "INSERT dbo.payroll_policy_events(policyId,eventType,actorUserId,payload) VALUES(999999,N'INVALID',1,N'{}')",
    "INSERT dbo.payroll_policy_events(policyId,versionId,eventType,actorUserId,payload) VALUES(1,999999,N'INVALID',1,N'{}')",
    'DELETE FROM dbo.payroll_policies WHERE id=1', 'DELETE FROM dbo.payroll_policy_versions WHERE id=1',
  ]) await assert.rejects(connection.request().query(sql), /constraint|duplicate/i)
  assert.deepEqual(await bytes(), original)
})
test('PL-MIG replays preserve policy data and audit bytes and detect checksum changes', async () => {
  const sql = 'SELECT * FROM dbo.payroll_policies; SELECT * FROM dbo.payroll_policy_versions; SELECT * FROM dbo.payroll_policy_events; SELECT * FROM dbo.payroll_schema_migrations'
  const beforeReplay = (await connection.request().query(sql)).recordsets
  for (let i = 0; i < 2; i++) {
    const result = await runner.applyDisposableTest(ds, versions); assert.deepEqual(result.applied, []); assert.deepEqual(result.skipped, versions.map(item => item.version))
  }
  await assert.rejects(runner.applyDisposableTest(ds, [{ ...version, checksum: '0'.repeat(64) }, settingsVersion, definitionVersion, collectionVersion]), /missing or has changed/)
  assert.deepEqual((await connection.request().query(sql)).recordsets, beforeReplay)
  assert.deepEqual(await bytes(), original); assert.deepEqual(await runner.schemaDiff(ds), [])
})
