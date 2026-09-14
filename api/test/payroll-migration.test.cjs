'use strict'
// بيانات صناعية وقاعدة عشوائية فقط؛ لا إقلاع للتطبيق ولا كتابة على المصدر/المراجعة.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { pool, env } = require('../scripts/migrations-lib.cjs')
const { EntitySchema } = require('../node_modules/typeorm')
const runner = require('../scripts/payroll-migrations.cjs')
const database = 'hr_payroll_migration_test_' + crypto.randomBytes(8).toString('hex')
let master, connection, ds, created = false
const canarySchema = new EntitySchema({ name: 'PayrollMigrationCanary', tableName: 'payroll_migration_canary', columns: {
  id: { type: 'int', primary: true }, originalBytes: { type: 'varbinary', length: 'MAX' },
  note: { type: 'nvarchar', length: 80 }, optionalPolicyId: { type: 'int', nullable: true },
  optedOut: { type: 'bit', default: false },
} })
const newSchema = new EntitySchema({ name: 'PayrollMigrationNew', tableName: 'payroll_migration_new', columns: {
  id: { type: 'int', primary: true, generated: true }, label: { type: 'nvarchar', length: 100, nullable: true },
}, indices: [{ name: 'IDX_payroll_migration_new_label', columns: ['label'] }] })
const migration = content => ({ version: '20260912_001_test_additions', checksum: runner.digest(content), operations: runner.validateSql(content) })
let good
before(async () => {
  assert.match(database, /^hr_payroll_migration_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
  master = await pool('master'); await master.request().query(`CREATE DATABASE [${database}]`); created = true
  connection = await pool(database)
  await connection.request().batch("CREATE TABLE dbo.payroll_migration_canary(id int NOT NULL,originalBytes varbinary(max) NOT NULL,note nvarchar(80) NOT NULL); INSERT dbo.payroll_migration_canary VALUES(71,0x00AB12CD,N'Original immutable canary')")
  ds = await runner.openDataSource(database, [canarySchema, newSchema])
  // أسماء القيود يجب أن تطابق metadata، دون تنفيذ أي SQL يقترحه TypeORM.
  const naming = ds.namingStrategy
  await connection.request().query(`ALTER TABLE dbo.payroll_migration_canary ADD CONSTRAINT [${naming.primaryKeyName('payroll_migration_canary', ['id'])}] PRIMARY KEY(id)`)
  good = migration(`
    ALTER TABLE dbo.payroll_migration_canary ADD optionalPolicyId int NULL;
    ALTER TABLE dbo.payroll_migration_canary ADD optedOut bit NOT NULL CONSTRAINT [${naming.defaultConstraintName('payroll_migration_canary', 'optedOut')}] DEFAULT 0;
    CREATE TABLE dbo.payroll_migration_new (id int NOT NULL IDENTITY(1,1),label nvarchar(100) NULL,CONSTRAINT [${naming.primaryKeyName('payroll_migration_new', ['id'])}] PRIMARY KEY(id));
    CREATE INDEX IDX_payroll_migration_new_label ON dbo.payroll_migration_new(label);
  `)
}, { timeout: 60000 })
after(async () => {
  if (ds?.isInitialized) await ds.destroy(); if (connection) await connection.close()
  if (created) {
    assert.match(database, /^hr_payroll_migration_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
    await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
    assert.equal((await master.request().input('database', database).query('SELECT DB_ID(@database) AS id')).recordset[0].id, null, 'Disposable database must be absent after cleanup')
  }
  if (master) await master.close()
})
const bytes = async () => (await connection.request().query('SELECT id,originalBytes,note FROM dbo.payroll_migration_canary ORDER BY id')).recordset

test('PAY-MIG guards reject source, arbitrary clones and unverified manifests', () => {
  const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../docs/prepayrollmigration/review-database.json'), 'utf8'))
  assert.doesNotThrow(() => runner.assertTarget(manifest, manifest.database))
  for (const target of [env.DB_DATABASE, 'master', database, 'hr_review_pre_payroll_20991231235959_12345678']) assert.throws(() => runner.assertTarget(manifest, target), /forbidden|Only/)
  for (const key of ['copyOnly', 'checksumVerified', 'restored']) assert.throws(() => runner.assertTarget({ ...manifest, [key]: false }, manifest.database))
})
test('PAY-MIG filtered indexes accept only IS NULL or IS NOT NULL without broader predicates', () => {
  for (const predicate of ['releasedAt IS NULL', 'releasedAt IS NOT NULL']) {
    const sql = `CREATE UNIQUE INDEX UQ_active_test ON dbo.claim_test(employeeId,startDate,endDate) WHERE ${predicate};`
    assert.equal(runner.validateSql(sql)[0].kind, 'create-index')
  }
  for (const predicate of ['releasedAt IS NULL OR employeeId IS NULL', 'releasedAt IS NULL AND employeeId IS NOT NULL',
    'releasedAt = NULL', 'releasedAt IS NULL WITH (DROP_EXISTING=ON)', 'releasedAt IS NULL; DROP TABLE dbo.claim_test',
  ]) assert.throws(() => runner.validateSql(`CREATE UNIQUE INDEX UQ_active_test ON dbo.claim_test(employeeId) WHERE ${predicate};`))
})
test('PAY-MIG accepts omitted NULL only in generated plans with exact nullable metadata evidence', async () => {
  const actualDiff = await runner.schemaDiff(ds)
  const generated = actualDiff.find(query => /ADD "optionalPolicyId" int\s*$/i.test(query))
  assert.ok(generated, 'Real TypeORM diff must demonstrate its implicit-NULL format')
  assert.throws(() => runner.validateSql(generated), /explicitly allow NULL/, 'Authored SQL must still spell out NULL')
  assert.deepEqual(runner.classifyMetadataQuery(generated, ds.entityMetadatas), {
    safe: true, nullableMetadataEvidence: { table: 'payroll_migration_canary', column: 'optionalPolicyId' },
  })
  const proof = [{ tableName: 'offboarding_cases', columns: [{ databaseName: 'settlementFinancialSnapshot', isNullable: true }] }]
  const source = 'ALTER TABLE "offboarding_cases" ADD "settlementFinancialSnapshot" ntext'
  assert.equal(runner.classifyMetadataQuery(source, proof).safe, true)
  assert.throws(() => runner.validateSql(source), /explicitly allow NULL/)
  assert.equal(runner.classifyMetadataQuery(source, []).safe, false)
  assert.equal(runner.classifyMetadataQuery(source, [{ ...proof[0], columns: [{ ...proof[0].columns[0], isNullable: false }] }]).safe, false)
  for (const unsafe of [source + ' NOT NULL', source + '; DELETE FROM dbo.offboarding_cases;',
    'ALTER TABLE dbo.offboarding_cases ALTER COLUMN settlementFinancialSnapshot ntext NULL',
    'ALTER TABLE dbo.offboarding_cases ADD unknownColumn ntext',
    'ALTER TABLE otherDatabase.dbo.offboarding_cases ADD settlementFinancialSnapshot ntext',
  ]) assert.equal(runner.classifyMetadataQuery(unsafe, proof).safe, false, unsafe)
})
test('PAY-MIG rejects destructive, data-writing, disguised and cross-database SQL before execution', async () => {
  const original = await bytes()
  for (const sql of [
    'DROP TABLE dbo.payroll_migration_canary;',
    'ALTER TABLE dbo.payroll_migration_canary DROP COLUMN note;',
    'ALTER TABLE dbo.payroll_migration_canary ALTER COLUMN note nvarchar(20);',
    "EXEC sys.sp_rename 'dbo.payroll_migration_canary.note','newNote','COLUMN';",
    "UPDATE dbo.payroll_migration_canary SET note=N'changed';",
    'DELETE FROM dbo.payroll_migration_canary;',
    'TRUNCATE TABLE dbo.payroll_migration_canary;',
    'ALTER TABLE dbo.payroll_migration_canary ADD requiredPolicyId int NOT NULL;',
    'ALTER TABLE dbo.payroll_migration_canary ADD requiredPolicyId int;',
    'ALTER TABLE dbo.payroll_migration_canary ADD requiredPolicyId int NOT NULL DEFAULT NULL;',
    'ALTER TABLE dbo.payroll_migration_canary ADD newId int NOT NULL IDENTITY(1,1);',
    "ALTER TABLE dbo.payroll_migration_canary ADD x nvarchar(30) NULL; /* allowed first */ DELETE FROM dbo.payroll_migration_canary;",
    "CREATE TABLE dbo.x (id int NULL); EXEC(N'DROP TABLE dbo.payroll_migration_canary');",
    'CREATE TABLE otherDb.dbo.x(id int NULL);',
    'CREATE TABLE otherSchema.x(id int NULL);',
    'CREATE INDEX bad ON dbo.payroll_migration_canary(id) WITH (DROP_EXISTING=ON);',
    'ALTER TABLE dbo.payroll_migration_canary ADD CONSTRAINT bad CHECK(id<1);',
    'CREATE TABLE dbo.payroll_schema_migrations(id int NULL);',
    'ALTER TABLE dbo.app_schema_migrations ADD fake int NULL;',
    'SELECT * INTO dbo.copy FROM dbo.payroll_migration_canary;',
    "ALTER TABLE dbo.payroll_migration_canary ADD x int NULL DEFAULT dbo.userDefinedFunction();",
    'CREATE TABLE dbo.x(id int NULL) CREATE TABLE dbo.y(id int NULL);',
  ]) assert.throws(() => runner.validateSql(sql), undefined, sql)
  assert.deepEqual(await bytes(), original)
  assert.doesNotThrow(() => runner.validateSql("/* DROP TABLE; nested /* comment */ */ CREATE TABLE dbo.safe (id int NULL, note nvarchar(100) NULL DEFAULT N'DROP; UPDATE ''quoted''');"))
  assert.doesNotThrow(() => runner.validateSql('ALTER TABLE dbo.x ADD amount decimal(18,2) NOT NULL DEFAULT ((-1.25));'))
})
test('PAY-MIG failure after earlier DDL rolls back the whole batch and the independent ledger', async () => {
  const original = await bytes()
  const bad = { ...good, operations: [...good.operations, ...runner.validateSql('CREATE TABLE dbo.payroll_migration_canary(id int NULL);')] }
  await assert.rejects(runner.applyDisposableTest(ds, [bad]), /already an object|already exists/i)
  const state = (await connection.request().query("SELECT COL_LENGTH('dbo.payroll_migration_canary','optionalPolicyId') AS optionalColumn,OBJECT_ID('dbo.payroll_migration_new') AS newTable,OBJECT_ID('dbo.payroll_schema_migrations') AS ledger")).recordset[0]
  assert.deepEqual(state, { optionalColumn: null, newTable: null, ledger: null })
  assert.deepEqual(await bytes(), original)
})
test('PAY-MIG metadata mismatch rolls back additive SQL before commit', async () => {
  const original = await bytes()
  const incomplete = { ...good, operations: good.operations.slice(0, 2) }
  await assert.rejects(runner.applyDisposableTest(ds, [incomplete]), /metadata drift remains/)
  const state = (await connection.request().query("SELECT COL_LENGTH('dbo.payroll_migration_canary','optionalPolicyId') AS optionalColumn,OBJECT_ID('dbo.payroll_schema_migrations') AS ledger")).recordset[0]
  assert.deepEqual(state, { optionalColumn: null, ledger: null }); assert.deepEqual(await bytes(), original)
})
test('PAY-MIG additive apply and replay preserve original bytes, old columns and new review data', async () => {
  const original = await bytes(), result = await runner.applyDisposableTest(ds, [good])
  assert.deepEqual(result.applied, [good.version]); assert.equal(result.schemaMatches, true)
  assert.deepEqual(await runner.schemaDiff(ds), []); assert.deepEqual(await bytes(), original)
  assert.deepEqual((await connection.request().query('SELECT optionalPolicyId,optedOut FROM dbo.payroll_migration_canary')).recordset, [{ optionalPolicyId: null, optedOut: false }])
  await connection.request().query("INSERT dbo.payroll_migration_new(label) VALUES(N'Created after migration'); UPDATE dbo.payroll_migration_canary SET optionalPolicyId=91")
  const beforeReplay = (await connection.request().query('SELECT * FROM dbo.payroll_migration_canary; SELECT * FROM dbo.payroll_migration_new; SELECT * FROM dbo.payroll_schema_migrations')).recordsets
  for (let i = 0; i < 2; i++) { const replay = await runner.applyDisposableTest(ds, [good]); assert.deepEqual(replay.applied, []); assert.deepEqual(replay.skipped, [good.version]) }
  assert.deepEqual((await connection.request().query('SELECT * FROM dbo.payroll_migration_canary; SELECT * FROM dbo.payroll_migration_new; SELECT * FROM dbo.payroll_schema_migrations')).recordsets, beforeReplay)
  assert.deepEqual(await runner.schemaDiff(ds), [])
})
test('PAY-MIG changed or missing published SQL is rejected without overwriting review rows', async () => {
  const original = await bytes()
  await assert.rejects(runner.applyDisposableTest(ds, [{ ...good, checksum: '0'.repeat(64) }]), /missing or has changed/)
  await assert.rejects(runner.applyDisposableTest(ds, []), /missing or has changed/)
  assert.deepEqual(await bytes(), original)
  assert.deepEqual((await connection.request().query('SELECT optionalPolicyId FROM dbo.payroll_migration_canary')).recordset, [{ optionalPolicyId: 91 }])
})
