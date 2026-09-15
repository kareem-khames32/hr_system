'use strict'
// SPEC①: نطبق SQL002 الحقيقي على جدول عضوية قديم في قاعدة مؤقتة فقط.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto')
const { pool, env } = require('../scripts/migrations-lib.cjs')
const { IsNull } = require('../node_modules/typeorm')
const runner = require('../scripts/payroll-migrations.cjs')
const { PayrollRun, PayrollRunMember } = require('../src/payroll/payroll.entities')
const { PayrollPeriodClaim, PayrollRunEvent } = require('../src/payroll/payroll-membership.entities')
const database = 'hr_payroll_migration_test_' + crypto.randomBytes(8).toString('hex')
const file = path.resolve(__dirname, '../../docs/migrations/payroll/20260912_002_membership_claims_events.sql')
const content = fs.readFileSync(file, 'utf8')
const version = { version: path.basename(file, '.sql'), checksum: runner.digest(content), operations: runner.validateSql(content) }
let master, connection, ds, created = false
const repo = entity => ds.getRepository(entity)
async function legacyRows() {
  return (await connection.request().query('SELECT id,name,scopeType,scopeIds,employeeIds,branchId,policyId,period,startDate,endDate,status,totalNet,approvedBy,approvedAt,paidAt,createdAt FROM dbo.payroll_runs ORDER BY id; SELECT id,runId,employeeId FROM dbo.payroll_run_members WHERE employeeId=101 ORDER BY id; SELECT * FROM dbo.membership_canary ORDER BY id;')).recordsets
}
before(async () => {
  assert.match(database, /^hr_payroll_migration_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
  master = await pool('master'); await master.request().query(`CREATE DATABASE [${database}]`); created = true
  connection = await pool(database)
  // هذا الاختبار يثبت عقد002 التاريخي؛ ما أضافته025–032 إلى payroll_runs (نسخة السياسة وتعريف المسير واللقطة ووضع المحرك والصرف والتكافؤ والتصحيح) يُختبر مستقلًا ولا يُنسب إلى002.
  // علاقة policyVersion تمنع بناء metadata دون كيانات السياسة، فتُنزع مع الأعمدة والفهارس اللاحقة من سجل decorators في عملية هذا الملف وحدها.
  const laterRunColumns = ['policyVersionId', 'definition', 'paidBy', 'payChannel', 'payReference', 'calculatedBy', 'calculatedAt', 'parityExcludedReason', 'parityExcludedBy', 'parityExcludedAt',
    'policySnapshot', 'policySnapshotHash', 'engineMode', 'parityReport', 'runType', 'parentRunId', 'correctionReason']
  const storage = require('../node_modules/typeorm').getMetadataArgsStorage()
  const prune = (list, drop) => { for (let index = list.length - 1; index >= 0; index--) if (drop(list[index])) list.splice(index, 1) }
  prune(storage.columns, row => row.target === PayrollRun && laterRunColumns.includes(row.propertyName))
  prune(storage.relations, row => row.target === PayrollRun && row.propertyName === 'policyVersion')
  prune(storage.joinColumns, row => row.target === PayrollRun && row.propertyName === 'policyVersion')
  prune(storage.indices, row => row.target === PayrollRun && ['UX_payroll_run_period_name', 'IX_payroll_runs_parent'].includes(row.name))
  ds = await runner.openDataSource(database, [PayrollRun, PayrollRunMember, PayrollPeriodClaim, PayrollRunEvent])
  const n = ds.namingStrategy
  await connection.request().batch(`
    CREATE TABLE dbo.payroll_runs (
      id int NOT NULL IDENTITY(1,1),name nvarchar(200) NULL,scopeType nvarchar(20) NOT NULL CONSTRAINT [${n.defaultConstraintName('payroll_runs', 'scopeType')}] DEFAULT 'BRANCH',
      scopeIds nvarchar(MAX) NULL,employeeIds nvarchar(MAX) NULL,branchId int NULL,policyId int NULL,period nvarchar(7) NOT NULL,
      startDate date NOT NULL,endDate date NOT NULL,status nvarchar(20) NOT NULL CONSTRAINT [${n.defaultConstraintName('payroll_runs', 'status')}] DEFAULT 'CALCULATED',
      totalNet decimal(18,2) NOT NULL CONSTRAINT [${n.defaultConstraintName('payroll_runs', 'totalNet')}] DEFAULT 0,approvedBy int NULL,approvedAt datetime NULL,paidAt datetime NULL,
      createdAt datetime2 NOT NULL CONSTRAINT [${n.defaultConstraintName('payroll_runs', 'createdAt')}] DEFAULT GETDATE(),
      CONSTRAINT [${n.primaryKeyName('payroll_runs', ['id'])}] PRIMARY KEY(id)
    );
    CREATE INDEX [${n.indexName('payroll_runs', ['branchId'])}] ON dbo.payroll_runs(branchId);
    CREATE TABLE dbo.payroll_run_members (
      id int NOT NULL IDENTITY(1,1),runId int NOT NULL,employeeId int NOT NULL,
      CONSTRAINT [${n.primaryKeyName('payroll_run_members', ['id'])}] PRIMARY KEY(id),
      CONSTRAINT [${n.uniqueConstraintName('payroll_run_members', ['runId', 'employeeId'])}] UNIQUE(runId,employeeId)
    );
    CREATE INDEX [${n.indexName('payroll_run_members', ['runId'])}] ON dbo.payroll_run_members(runId);
    CREATE INDEX [${n.indexName('payroll_run_members', ['employeeId'])}] ON dbo.payroll_run_members(employeeId);
    CREATE TABLE dbo.membership_canary(id int PRIMARY KEY,originalBytes varbinary(MAX) NOT NULL);
    INSERT dbo.membership_canary VALUES(1,0xF0E1D2C3);
    INSERT dbo.payroll_runs(name,branchId,period,startDate,endDate,totalNet) VALUES(N'Original synthetic run',3,'2026-07','2026-06-23','2026-07-22',6000);
    INSERT dbo.payroll_run_members(runId,employeeId) VALUES(1,101);
  `)
}, { timeout: 60000 })
after(async t => {
  if (ds?.isInitialized) await ds.destroy(); if (connection) await connection.close()
  try {
    if (created) {
      assert.match(database, /^hr_payroll_migration_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('database', database).query('SELECT DB_ID(@database) AS id')).recordset[0].id, null)
      t.diagnostic('Membership migration test database removed and absence verified.')
    }
  } finally { if (master) await master.close() }
})
test('SPEC① SQL002 uses additive statements only and transactional failure preserves old tables', async () => {
  assert.deepEqual(version.operations.map(operation => operation.kind), ['add-column', 'add-column', 'add-column', 'add-column', 'add-column', 'create-table', 'create-index', 'create-index', 'create-table', 'create-index'])
  const original = await legacyRows()
  const broken = { ...version, operations: [...version.operations, ...runner.validateSql('CREATE TABLE dbo.payroll_runs(id int NULL);')] }
  await assert.rejects(runner.applyDisposableTest(ds, [broken]), /already an object|already exists/i)
  const schema = (await connection.request().query("SELECT COL_LENGTH('dbo.payroll_runs','snapshotVersion') AS runVersion,COL_LENGTH('dbo.payroll_run_members','snapshot') AS snapshot,OBJECT_ID('dbo.payroll_period_claims') AS claims,OBJECT_ID('dbo.payroll_run_events') AS events,OBJECT_ID('dbo.payroll_schema_migrations') AS ledger")).recordset[0]
  assert.deepEqual(schema, { runVersion: null, snapshot: null, claims: null, events: null, ledger: null })
  assert.deepEqual(await legacyRows(), original)
})
test('SPEC① SQL002 preserves historical NULL snapshots and adds defaults without changing original row values', async () => {
  const original = await legacyRows()
  const applied = await runner.applyDisposableTest(ds, [version])
  assert.deepEqual(applied.applied, [version.version]); assert.deepEqual(await runner.schemaDiff(ds), [])
  assert.deepEqual(await legacyRows(), original)
  const old = await repo(PayrollRunMember).findOneByOrFail({ employeeId: 101 })
  assert.equal(old.snapshot, null); assert.equal(old.membershipStatus, null); assert.equal(old.inclusionSource, null); assert.equal(old.exclusionReason, null)
  assert.equal((await repo(PayrollRun).findOneByOrFail({ id: 1 })).snapshotVersion, 0)
  assert.equal(await repo(PayrollPeriodClaim).count(), 0, 'Migration must not invent old approval claims')
  assert.equal(await repo(PayrollRunEvent).count(), 0, 'Migration must not invent historical actors or events')
  const added = await repo(PayrollRunMember).save({ runId: 1, employeeId: 102 })
  assert.equal(added.membershipStatus, 'INCLUDED'); assert.equal(added.inclusionSource, 'SCOPE'); assert.equal(added.snapshot, null)
})
test('SPEC① active-date unique index rejects concurrent identical claims and preserves released history', async () => {
  const index = (await connection.request().query("SELECT is_unique AS isUnique,filter_definition AS predicate FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.payroll_period_claims') AND name='UQ_payroll_claim_active_dates'")).recordset[0]
  assert.equal(index.isUnique, true); assert.match(index.predicate, /\[releasedAt\] IS NULL/i)
  const claim = { employeeId: 101, runId: 1, periodKey: '2026-07', startDate: '2026-06-23', endDate: '2026-07-22' }
  const raced = await Promise.allSettled([repo(PayrollPeriodClaim).save({ ...claim }), repo(PayrollPeriodClaim).save({ ...claim, runId: 2 })])
  assert.equal(raced.filter(result => result.status === 'fulfilled').length, 1)
  assert.equal(raced.filter(result => result.status === 'rejected').length, 1)
  const active = await repo(PayrollPeriodClaim).findOneByOrFail({ employeeId: 101, releasedAt: IsNull() })
  assert.ok(active.claimedAt instanceof Date)
  await repo(PayrollPeriodClaim).update(active.id, { releasedAt: new Date('2026-07-25T12:00:00Z') })
  const replacement = await repo(PayrollPeriodClaim).save({ ...claim, runId: 3 })
  assert.notEqual(replacement.id, active.id)
  assert.equal(await repo(PayrollPeriodClaim).count({ where: { employeeId: 101 } }), 2)
  assert.equal(await repo(PayrollPeriodClaim).count({ where: { employeeId: 101, releasedAt: IsNull() } }), 1)
  assert.ok((await repo(PayrollPeriodClaim).findOneByOrFail({ id: active.id })).releasedAt)
  // القيد يميز حدود الفترة حرفيًا؛ التداخل المختلف يحتاج فحص الخدمة تحت القفل.
  await repo(PayrollPeriodClaim).save({ ...claim, runId: 4, startDate: '2026-07-01', endDate: '2026-07-31' })
  assert.equal(await repo(PayrollPeriodClaim).count({ where: { employeeId: 101, releasedAt: IsNull() } }), 2)
})
test('SPEC① replay preserves saved member snapshot, run version, released claims and event payloads', async () => {
  const member = await repo(PayrollRunMember).findOneByOrFail({ employeeId: 102 })
  const snapshot = { version: 1, capturedAt: '2026-07-23T12:00:00Z', employeeCode: 'SYN102', fullName: 'Synthetic member snapshot',
    branchId: 3, departmentId: null, teamId: null, costCenterId: null, coverFrom: '2026-07-01', coverTo: '2026-07-22', coverDays: 22,
    prorataFactor: 22 / 30, monthlyDays: 30, basicSalary: 6000, allowances: 1000, gross: 7000, grossEarned: 5133.33,
    monthlyComponents: [6000, 1000], earnedComponents: [4400, 733.33], manualReason: 'Synthetic inclusion', salaryMode: 'ATTENDANCE_BASED' }
  await repo(PayrollRunMember).update(member.id, { snapshot, inclusionSource: 'MANUAL_INCLUDE' })
  await repo(PayrollRun).update(1, { snapshotVersion: 1 })
  await repo(PayrollRunEvent).save({ runId: 1, eventType: 'RECALCULATED', actorUserId: 77, reason: 'Synthetic revision', payload: { snapshotVersion: 1, included: [102] } })
  const readAll = async () => ({ members: await repo(PayrollRunMember).find({ order: { id: 'ASC' } }), runs: await repo(PayrollRun).find({ order: { id: 'ASC' } }),
    claims: await repo(PayrollPeriodClaim).find({ order: { id: 'ASC' } }), events: await repo(PayrollRunEvent).find({ order: { id: 'ASC' } }), legacy: await legacyRows() })
  const beforeReplay = await readAll()
  for (let i = 0; i < 2; i++) { const replay = await runner.applyDisposableTest(ds, [version]); assert.deepEqual(replay.applied, []); assert.deepEqual(replay.skipped, [version.version]) }
  assert.deepEqual(await readAll(), beforeReplay)
  assert.deepEqual((await repo(PayrollRunMember).findOneByOrFail({ id: member.id })).snapshot, snapshot)
  assert.deepEqual(await runner.schemaDiff(ds), [])
})
