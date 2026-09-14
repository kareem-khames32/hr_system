'use strict'
// SQL004 is exercised only in its own randomly named disposable SQL database.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto')
const { pool, env } = require('../scripts/migrations-lib.cjs')
const { Table } = require('../node_modules/typeorm')
const runner = require('../scripts/payroll-migrations.cjs')
const { Shift, WorkSchedule } = require('../src/assets/assets.entities')
const { AttendanceDay } = require('../src/attendance/attendance.entities')
const { PayrollItem } = require('../src/payroll/payroll.entities')
const { AttendanceRuleVersion } = require('../src/attendance/attendance-rule.entities')
const { appendAttendanceRuleVersion, resolveAttendanceRule, validateAttendanceFlexSource } = require('../src/attendance/attendance-rule-history')
const database = 'hr_payroll_migration_test_' + crypto.randomBytes(8).toString('hex')
const file = path.resolve(__dirname, '../../docs/migrations/payroll/20260913_004_attendance_flex_history.sql')
const content = fs.readFileSync(file, 'utf8')
const version = { version: path.basename(file, '.sql'), checksum: runner.digest(content), operations: runner.validateSql(content) }
const additions = {
  shifts: ['flexEnabled', 'flexWindowMinutes', 'requiredWorkMinutes'],
  work_schedules: ['flexEnabled', 'flexWindowMinutes', 'requiredWorkMinutes'],
  attendance_days: ['rawLateMinutes', 'unexcusedLateMinutes', 'shortfallMinutes', 'countedWorkMinutes', 'earlyArrivalMinutes',
    'flexOutcome', 'attendanceReviewRequired', 'attendanceReviewReason', 'attendanceRuleSnapshot'],
  payroll_items: ['shortfallMinutes', 'shortfallDeduction'],
}
let master, connection, ds, created = false
function disposable() {
  assert.match(database, /^hr_payroll_migration_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
const original = async () => (await connection.request().query('SELECT id,name,startTime,endTime,shiftMode,requiredHours FROM dbo.shifts ORDER BY id; SELECT * FROM dbo.flex_canary ORDER BY id;')).recordsets
before(async () => {
  disposable()
  master = await pool('master')
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  connection = await pool(database)
  ds = await runner.openDataSource(database, [Shift, WorkSchedule, AttendanceDay, PayrollItem, AttendanceRuleVersion])
  const qr = ds.createQueryRunner()
  try {
    // Build the existing metadata with only the new columns omitted. No synchronize.
    for (const entity of [Shift, WorkSchedule, AttendanceDay, PayrollItem]) {
      const metadata = ds.getMetadata(entity)
      const table = Table.create(metadata, ds.driver)
      table.columns = table.columns.filter(column => !additions[metadata.tableName].includes(column.name))
      await qr.createTable(table, true, true, true)
    }
  } finally { await qr.release() }
  await connection.request().batch("CREATE TABLE dbo.flex_canary(id int PRIMARY KEY, originalBytes varbinary(MAX) NOT NULL, amount decimal(18,2) NOT NULL); INSERT dbo.flex_canary VALUES(1,0xF0A123B4,7654.32); INSERT dbo.shifts(name,startTime,endTime,shiftMode) VALUES(N'Legacy flexible source','09:00','18:00','flexible');")
}, { timeout: 60000 })
after(async t => {
  const errors = []
  try { if (ds?.isInitialized) await ds.destroy() } catch (error) { errors.push(error) }
  try { if (connection) await connection.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      disposable()
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('database', database).query('SELECT DB_ID(@database) AS id')).recordset[0].id, null)
      t.diagnostic(`Cleanup verified: ${database} removed; DB_ID is NULL.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Flexible attendance fixture cleanup failed')
})

test('FX SQL004 is additive and rolls back a later DDL failure without touching old source bytes', async () => {
  assert.equal(version.operations.filter(operation => operation.kind === 'add-column').length, 17)
  assert.equal(version.operations.filter(operation => operation.kind === 'create-table').length, 1)
  assert.equal(version.operations.filter(operation => operation.kind === 'create-index').length, 2)
  const old = await original()
  const broken = { ...version, operations: [...version.operations, ...runner.validateSql('CREATE TABLE dbo.flex_canary(id int NULL);')] }
  await assert.rejects(runner.applyDisposableTest(ds, [broken]), /already an object|already exists/i)
  assert.deepEqual(await original(), old)
  const shape = (await connection.request().query("SELECT COL_LENGTH('dbo.shifts','flexEnabled') AS flexEnabled, OBJECT_ID('dbo.attendance_rule_versions') AS versions")).recordset[0]
  assert.deepEqual(shape, { flexEnabled: null, versions: null })
})

test('FX SQL004 matches TypeORM exactly and preserves legacy NULL rather than inventing a flexible window', async () => {
  const old = await original()
  assert.deepEqual((await runner.applyDisposableTest(ds, [version])).applied, [version.version])
  assert.deepEqual(await runner.schemaDiff(ds), [])
  assert.deepEqual(await original(), old)
  const legacy = await ds.getRepository(Shift).findOneByOrFail({ id: 1 })
  assert.equal(legacy.flexEnabled, null)
  assert.equal(legacy.flexWindowMinutes, null)
  assert.equal(legacy.requiredWorkMinutes, null)
  assert.throws(() => validateAttendanceFlexSource(legacy), error => error.getStatus() === 400)
  assert.equal(await ds.getRepository(AttendanceRuleVersion).count(), 0)
})

test('FX09 baseline carries no invented effective date and an earlier day keeps its original version', async () => {
  const before = { startTime: '09:00', endTime: '18:00', flexEnabled: false, flexWindowMinutes: null, requiredWorkMinutes: null }
  const snapshot = { ...before, flexEnabled: true, flexWindowMinutes: 60, requiredWorkMinutes: 540 }
  const first = await ds.transaction(em => appendAttendanceRuleVersion(em, { sourceType: 'SHIFT', sourceId: 1, before, snapshot,
    effectiveFrom: '2026-07-08', actorUserId: 10, reason: 'Explicit test window' }))
  const july8 = await resolveAttendanceRule(ds.manager, 'SHIFT', 1, '2026-07-08', before)
  await ds.transaction(em => appendAttendanceRuleVersion(em, { sourceType: 'SHIFT', sourceId: 1, before: snapshot,
    snapshot: { ...snapshot, startTime: '08:00', endTime: '17:00' }, effectiveFrom: '2026-07-09', actorUserId: 11, reason: 'Next effective version' }))
  assert.equal(july8.versionId, first.id)
  assert.deepEqual(await resolveAttendanceRule(ds.manager, 'SHIFT', 1, '2026-07-08', before), july8)
  const baseline = await resolveAttendanceRule(ds.manager, 'SHIFT', 1, '2026-07-07', before)
  assert.equal(baseline.legacyBaseline, true)
  assert.equal(baseline.effectiveFrom, null)
  assert.deepEqual(baseline.snapshot, before)
  assert.equal((await resolveAttendanceRule(ds.manager, 'SHIFT', 1, '2026-07-09', before)).snapshot.startTime, '08:00')
  const created = await ds.transaction(em => appendAttendanceRuleVersion(em, { sourceType: 'WORK_SCHEDULE', sourceId: 91, before: null,
    snapshot, effectiveFrom: '2026-07-10', reason: 'Future creation', actorUserId: 10 }))
  assert.equal(created.version, 1)
  assert.equal((await resolveAttendanceRule(ds.manager, 'WORK_SCHEDULE', 91, '2026-07-09', snapshot)).unavailable, true)
})

test('FX09 unique source version rejects a duplicate without modifying prior snapshots', async () => {
  const rows = await ds.getRepository(AttendanceRuleVersion).find({ where: { sourceType: 'SHIFT', sourceId: 1 }, order: { version: 'ASC' } })
  const { id, createdAt, ...duplicate } = rows[0]
  await assert.rejects(ds.getRepository(AttendanceRuleVersion).save(duplicate), /duplicate|unique/i)
  assert.deepEqual(await ds.getRepository(AttendanceRuleVersion).find({ where: { sourceType: 'SHIFT', sourceId: 1 }, order: { version: 'ASC' } }), rows)
})

test('FX SQL004 replay preserves every stored version and old financial bytes', async () => {
  const saved = await ds.getRepository(AttendanceRuleVersion).find({ order: { id: 'ASC' } })
  const old = await original()
  const replay = await runner.applyDisposableTest(ds, [version])
  assert.deepEqual(replay.applied, [])
  assert.deepEqual(replay.skipped, [version.version])
  assert.deepEqual(await ds.getRepository(AttendanceRuleVersion).find({ order: { id: 'ASC' } }), saved)
  assert.deepEqual(await original(), old)
  assert.deepEqual(await runner.schemaDiff(ds), [])
})
