'use strict'
// إثبات المحلل والقرائن من دون اتصال بقاعدة بيانات؛ لا يُسمح بهدف قائم عام.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const runner = require('../scripts/payroll-migrations.cjs')
const owner = runner.readMigrations().find(item => item.version === '20260913_006_payroll_policy_drafts')
const sources = [
  ['payroll_policy_components', 'FK_payroll_policy_component_version'],
  ['payroll_policy_parameters', 'FK_payroll_policy_parameter_version'],
  ['payroll_tier_sets', 'FK_payroll_tier_set_version'],
]
const managed = runner.managedPriorPayrollTables([owner])
const { getMetadataArgsStorage } = require('../node_modules/typeorm')
const { PayrollPolicyTier } = require('../src/payroll/payroll-policy-definition.entities.ts')
const tierChecks = getMetadataArgsStorage().checks.filter(check => check.target === PayrollPolicyTier)
const foreign = (table, name, target = 'dbo.payroll_policy_versions', column = 'versionId', referenced = 'id', actions = 'ON DELETE NO ACTION ON UPDATE NO ACTION') =>
  `CONSTRAINT [${name}] FOREIGN KEY ([${column}]) REFERENCES ${target} ([${referenced}]) ${actions}`
const create = (table, name, target, column, referenced, actions) => `CREATE TABLE dbo.[${table}]([id] INT NOT NULL,[versionId] INT NOT NULL,${foreign(table, name, target, column, referenced, actions)});`
const metadata = (table, name, target = 'payroll_policy_versions', column = 'versionId', referenced = 'id') => [{ tableName: table,
  foreignKeys: [{ name, columns: [{ databaseName: column }], referencedEntityMetadata: { tableName: target }, referencedColumns: [{ databaseName: referenced }], onDelete: 'NO ACTION', onUpdate: 'NO ACTION' }] }]

test('PL-03 prior table evidence requires the named 006 owner and an exact applied checksum when reading a ledger', () => {
  assert.deepEqual([...managed], ['payroll_policy_versions'])
  assert.deepEqual([...runner.managedPriorPayrollTables([])], [])
  assert.deepEqual([...runner.managedPriorPayrollTables([{ ...owner, version: '20260913_099_fake' }])], [])
  assert.deepEqual([...runner.managedPriorPayrollTables([{ ...owner, operations: [] }])], [])
  assert.deepEqual([...runner.managedPriorPayrollTables([owner], [])], [])
  assert.deepEqual([...runner.managedPriorPayrollTables([owner], [{ version: owner.version, checksum: '0'.repeat(64) }])], [])
  assert.deepEqual([...runner.managedPriorPayrollTables([owner], [{ version: owner.version, checksum: owner.checksum }])], ['payroll_policy_versions'])
})

test('PL-03 authored inline foreign keys permit only the three named version-owner relationships with prior evidence', () => {
  for (const [table, name] of sources) {
    assert.throws(() => runner.validateSql(create(table, name)), /managed prior/)
    const operations = runner.validateSql(create(table, name), managed)
    assert.equal(operations.length, 1); assert.equal(operations[0].kind, 'create-table')
    assert.equal(operations[0].foreignKeys[0].referencedTable, 'payroll_policy_versions')
  }
})

test('PL-03 authored FK exceptions cannot reach other existing tables, columns, sources, names or cascading actions', () => {
  const [table, name] = sources[0]
  for (const query of [create(table, name, 'dbo.employees'), create(table, name, 'dbo.payroll_policies'), create(table, name, 'dbo.payroll_schema_migrations'),
    create(table, name, 'other.payroll_policy_versions'), create(table, name, 'other.dbo.payroll_policy_versions'),
    create('unrelated_new_table', name), create('payroll_policy_tiers', name), create(table, 'FORGED_NAME'), create(table, name, undefined, 'id'), create(table, name, undefined, undefined, 'policyId'),
    create(table, name, undefined, undefined, undefined, 'ON DELETE CASCADE ON UPDATE NO ACTION'),
    create(table, name, undefined, undefined, undefined, 'ON DELETE NO ACTION ON UPDATE CASCADE'),
    create(table, name, undefined, undefined, undefined, 'ON DELETE SET NULL ON UPDATE NO ACTION'),
    create(table, name, undefined, undefined, undefined, ''),
    `ALTER TABLE dbo.${table} ADD ${foreign(table, name)};`, create(table, name) + 'UPDATE dbo.payroll_policy_versions SET revision=0;',
  ]) assert.throws(() => runner.validateSql(query, new Set([...managed, 'employees', 'payroll_policies'])), undefined, query)
})

test('PL-03 generated FK classification requires new source, managed target evidence and exact metadata', () => {
  for (const [table, name] of sources) {
    const query = `ALTER TABLE dbo.[${table}] ADD ${foreign(table, name)};`, fields = metadata(table, name), created = new Set([table])
    assert.equal(runner.classifyMetadataQuery(query, fields, created).safe, false)
    assert.equal(runner.classifyMetadataQuery(query, fields, new Set(), managed).safe, false)
    assert.equal(runner.classifyMetadataQuery(query, [], created, managed).safe, false)
    const result = runner.classifyMetadataQuery(query, fields, created, managed)
    assert.equal(result.safe, true); assert.equal(result.newTableForeignKeyEvidence.referencedMigration, owner.version)
    for (const fields of [metadata(table, 'OTHER_NAME'), metadata(table, name, 'employees'), metadata(table, name, undefined, 'id'), metadata(table, name, undefined, undefined, 'policyId')]) {
      assert.equal(runner.classifyMetadataQuery(query, fields, created, managed).safe, false)
    }
    for (const transformed of [query.replace('NO ACTION', 'CASCADE'), query.replace('dbo.[', 'other.['), query + ';DELETE dbo.payroll_policy_versions;']) {
      assert.equal(runner.classifyMetadataQuery(transformed, fields, created, managed).safe, false)
    }
  }
})

test('PL-03 new-to-new composite relationships retain create-order proof and strict actions', () => {
  const parent = 'CREATE TABLE dbo.payroll_tier_sets(id INT NOT NULL,versionId INT NOT NULL,CONSTRAINT UX_parent UNIQUE(versionId,id));'
  const child = 'CREATE TABLE dbo.payroll_policy_components(id INT NOT NULL,versionId INT NOT NULL,tierSetId INT NULL,CONSTRAINT FK_payroll_policy_component_tier_set FOREIGN KEY(versionId,tierSetId) REFERENCES dbo.payroll_tier_sets(versionId,id) ON DELETE NO ACTION ON UPDATE NO ACTION);'
  assert.doesNotThrow(() => runner.validateSql(parent + child, managed))
  assert.throws(() => runner.validateSql(child + parent, managed), /managed prior/)
  assert.throws(() => runner.validateSql(parent + child.replace('versionId,tierSetId', 'versionId'), managed), /counts must match/)
})

test('PL-03 file loading proves the earlier 006 owner instead of trusting arbitrary existing table names', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-fk-parser-'))
  try {
    const nextName = '20260913_008_payroll_policy_definitions.sql'
    fs.writeFileSync(path.join(directory, nextName), create(...sources[0]))
    assert.throws(() => runner.readMigrations(directory), /managed prior/)
    const ownerSql = fs.readFileSync(path.resolve(__dirname, '../../docs/migrations/payroll/' + owner.version + '.sql'), 'utf8')
    fs.writeFileSync(path.join(directory, '20260913_005_fake_owner.sql'), ownerSql)
    assert.throws(() => runner.readMigrations(directory), /managed prior/)
    fs.writeFileSync(path.join(directory, owner.version + '.sql'), ownerSql)
    const versions = runner.readMigrations(directory)
    assert.equal(versions[versions.length - 1].version, nextName.slice(0, -4))
    assert.equal(versions.find(item => item.version === owner.version).checksum, owner.checksum)
  } finally {
    const absolute = path.resolve(directory), prefix = path.resolve(os.tmpdir()) + path.sep
    assert.ok(absolute.startsWith(prefix)); assert.match(path.basename(absolute), /^hr-payroll-fk-parser-/)
    fs.rmSync(absolute, { recursive: true, force: true })
  }
})

test('PL-03 exact named CHECKs accept only the agreed bounds and method expressions on a newly created tier table', () => {
  assert.equal(tierChecks.length, 2)
  for (const check of tierChecks) {
    const query = `CREATE TABLE dbo.payroll_policy_tiers(id INT NOT NULL,CONSTRAINT [${check.name}] CHECK (${check.expression}));`
    const result = runner.validateSql(query)
    assert.equal(result[0].checks.length, 1); assert.equal(result[0].checks[0].name, check.name)
    for (const forged of [query.replace('dbo.payroll_policy_tiers', 'dbo.employees'), query.replace(check.name, 'CK_OTHER'),
      query.replace(check.expression, '1=1'), query.replace(check.expression, 'id >= 0'),
      query.replace(check.expression, 'EXISTS(SELECT 1 FROM dbo.employees)'), query.replace(check.expression, 'LEN(id)>0'),
      query.replace(check.expression, check.expression + ' OR 1=1'),
      query.replace(check.expression, check.expression.replace(/\[sequence\]|\[method\]/, '[employeeId]')),
      query.replace(check.expression, '1=1); DELETE dbo.payroll_policy_versions;--'),
    ]) assert.throws(() => runner.validateSql(forged), undefined, forged)
    assert.throws(() => runner.validateSql(`ALTER TABLE dbo.payroll_policy_tiers ADD CONSTRAINT [${check.name}] CHECK (${check.expression});`))
  }
})

test('PL-03 CHECK plan classification needs a new table and exact named metadata, never an existing-table exception', () => {
  for (const check of tierChecks) {
    const query = `ALTER TABLE dbo.payroll_policy_tiers ADD CONSTRAINT [${check.name}] CHECK (${check.expression});`
    const fields = [{ tableName: 'payroll_policy_tiers', checks: [check] }], created = new Set(['payroll_policy_tiers'])
    assert.equal(runner.classifyMetadataQuery(query, fields).safe, false)
    assert.equal(runner.classifyMetadataQuery(query, [], created).safe, false)
    assert.equal(runner.classifyMetadataQuery(query, [{ tableName: 'payroll_policy_tiers', checks: [{ ...check, expression: '1=1' }] }], created).safe, false)
    const result = runner.classifyMetadataQuery(query, fields, created)
    assert.equal(result.safe, true); assert.equal(result.newTableCheckEvidence.name, check.name)
    assert.equal(runner.classifyMetadataQuery(query.replace(check.expression, check.expression + ' OR 1=1'), fields, created).safe, false)
  }
})
