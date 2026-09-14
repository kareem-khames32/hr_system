'use strict'
// EX-09/13: SQL003 and the real resolver run only on a random disposable SQL database.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto')
const { pool, env } = require('../scripts/migrations-lib.cjs')
const runner = require('../scripts/payroll-migrations.cjs')
const { AttendanceExemption, AttendanceExemptionEvent } = require('../src/attendance/attendance-exemption.entities')
const { loadAttendanceExemptions, exemptionOnDate } = require('../src/attendance/attendance-exemption-resolver')
const database = 'hr_payroll_migration_test_' + crypto.randomBytes(8).toString('hex')
const file = path.resolve(__dirname, '../../docs/migrations/payroll/20260912_003_attendance_exemptions.sql')
const content = fs.readFileSync(file, 'utf8')
const version = { version: path.basename(file, '.sql'), checksum: runner.digest(content), operations: runner.validateSql(content) }
let master, connection, ds, created = false
function assertDisposable() {
  assert.match(database, /^hr_payroll_migration_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
function repo(entity) { assertDisposable(); return ds.getRepository(entity) }
async function originalRows() {
  return (await connection.request().query('SELECT * FROM dbo.exemption_canary ORDER BY id')).recordset
}
async function saveWindow(employeeId, extra = {}) {
  return repo(AttendanceExemption).save({ employeeId, effectiveFrom: '2026-06-01', effectiveTo: null,
    reasonCode: 'field_role', reason: 'قرار اصطناعي لاختبار نافذة الاستثناء', createdByUserId: 11,
    status: 'APPROVED', approvedByUserId: 12, approvedAt: new Date('2026-05-31T12:00:00Z'), ...extra })
}
before(async () => {
  assertDisposable()
  master = await pool('master')
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  connection = await pool(database)
  ds = await runner.openDataSource(database, [AttendanceExemption, AttendanceExemptionEvent])
  assertDisposable()
  await connection.request().batch('CREATE TABLE dbo.exemption_canary(id int PRIMARY KEY, originalBytes varbinary(MAX) NOT NULL, originalAmount decimal(18,2) NOT NULL); INSERT dbo.exemption_canary VALUES(1,0xF1E2D3C4,4567.89);')
}, { timeout: 60000 })
after(async t => {
  const errors = []
  try { if (ds?.isInitialized) await ds.destroy() } catch (error) { errors.push(error) }
  try { if (connection) await connection.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assertDisposable()
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('database', database).query('SELECT DB_ID(@database) AS id')).recordset[0].id, null)
      t.diagnostic(`Cleanup verified: ${database} was removed and DB_ID is NULL.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Attendance exemption fixture cleanup failed')
})

test('EX-09 SQL003 contains only new tables/indexes and a later DDL failure rolls back everything', async () => {
  assert.deepEqual(version.operations.map(operation => operation.kind), ['create-table', 'create-index', 'create-table', 'create-index'])
  const original = await originalRows()
  const broken = { ...version, operations: [...version.operations, ...runner.validateSql('CREATE TABLE dbo.exemption_canary(id int NULL);')] }
  await assert.rejects(runner.applyDisposableTest(ds, [broken]), /already an object|already exists/i)
  const tables = (await connection.request().query("SELECT OBJECT_ID('dbo.attendance_exemptions') AS exemptions, OBJECT_ID('dbo.attendance_exemption_events') AS events, OBJECT_ID('dbo.payroll_schema_migrations') AS ledger")).recordset[0]
  assert.deepEqual(tables, { exemptions: null, events: null, ledger: null })
  assert.deepEqual(await originalRows(), original)
})

test('EX-09 SQL003 matches all entity metadata, preserves old bytes and uses pending/null policy defaults', async () => {
  const original = await originalRows()
  const applied = await runner.applyDisposableTest(ds, [version])
  assert.deepEqual(applied.applied, [version.version])
  assert.deepEqual(await runner.schemaDiff(ds), [])
  assert.deepEqual(await originalRows(), original)
  const pending = await repo(AttendanceExemption).save({ employeeId: 100, effectiveFrom: '2026-06-01', reasonCode: 'other',
    reason: 'نافذة جديدة غير معتمدة في قاعدة الاختبار', createdByUserId: 11 })
  assert.equal(pending.status, 'PENDING')
  assert.equal(pending.effectiveTo, null)
  assert.equal(pending.overtimeEligibleOverride, null)
  assert.equal(pending.unpaidLeaveDeductibleOverride, null)
  assert.equal(pending.requiresCheckinForPresence, false)
  assert.equal(pending.approvedByUserId, null)
  assert.equal(pending.executiveApprovedByUserId, null)
  assert.equal(pending.terminatedFrom, null)
  assert.ok(pending.createdAt instanceof Date)
  assert.ok(pending.updatedAt instanceof Date)
})

test('EX-13 SQL resolver loads approved historical windows without restoring exemption on the termination date', async () => {
  const first = await saveWindow(201, { terminatedFrom: '2026-06-16', terminationReason: 'إنهاء اصطناعي في منتصف الفترة', terminatedByUserId: 12 })
  const second = await saveWindow(201, { effectiveFrom: '2026-06-16', effectiveTo: '2026-06-30' })
  await saveWindow(201, { status: 'PENDING', approvedByUserId: null, approvedAt: null })
  await saveWindow(201, { status: 'REJECTED' })
  await saveWindow(201, { status: 'CANCELLED' })
  const june = await loadAttendanceExemptions(ds.manager, 201, '2026-06-01', '2026-06-30')
  assert.deepEqual(june.map(row => row.id), [first.id, second.id])
  assert.equal(exemptionOnDate(june, '2026-06-15').id, first.id)
  assert.equal(exemptionOnDate(june, '2026-06-16').id, second.id)
  assert.deepEqual((await loadAttendanceExemptions(ds.manager, 201, '2026-06-16', '2026-06-16')).map(row => row.id), [second.id])
  assert.deepEqual(await loadAttendanceExemptions(ds.manager, 201, '2026-07-01', '2026-07-31'), [])
})

test('EX-09 SQL resolver rejects a one-day approved overlap and permits a replacement from the termination date', async () => {
  const first = await saveWindow(301, { effectiveTo: '2026-06-16' })
  const second = await saveWindow(301, { effectiveFrom: '2026-06-16' })
  await assert.rejects(loadAttendanceExemptions(ds.manager, 301, '2026-06-01', '2026-06-30'), error => error?.getStatus?.() === 409)
  await repo(AttendanceExemption).update(first.id, { terminatedFrom: '2026-06-16' })
  const windows = await loadAttendanceExemptions(ds.manager, 301, '2026-06-01', '2026-06-30')
  assert.deepEqual(windows.map(row => row.id), [first.id, second.id])
  assert.equal(exemptionOnDate(windows, '2026-06-16').id, second.id)
  await assert.rejects(loadAttendanceExemptions(ds.manager, 0, '2026-06-01', '2026-06-30'), error => error?.getStatus?.() === 400)
  await assert.rejects(loadAttendanceExemptions(ds.manager, 301, '2026-06-30', '2026-06-01'), error => error?.getStatus?.() === 400)
})

test('EX-09 SQL003 replay preserves decisions, historical termination, audit payloads and original data', async () => {
  const saved = await repo(AttendanceExemption).findOneByOrFail({ employeeId: 100 })
  await repo(AttendanceExemptionEvent).save({ exemptionId: saved.id, actorUserId: 11, eventType: 'CREATED',
    reason: 'إنشاء اصطناعي موثق', payload: { before: null, after: { status: saved.status, effectiveFrom: saved.effectiveFrom } } })
  const all = async () => ({ windows: await repo(AttendanceExemption).find({ order: { id: 'ASC' } }),
    events: await repo(AttendanceExemptionEvent).find({ order: { id: 'ASC' } }), original: await originalRows() })
  const preserved = await all()
  const replay = await runner.applyDisposableTest(ds, [version])
  assert.deepEqual(replay.applied, [])
  assert.deepEqual(replay.skipped, [version.version])
  assert.deepEqual(await all(), preserved)
  assert.deepEqual(await runner.schemaDiff(ds), [])
})
