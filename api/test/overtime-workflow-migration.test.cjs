'use strict'
// ترحيل الإضافي يُختبر حصرياً على قاعدة عشوائية؛ لا تُفتح قاعدة التطبيق للكتابة.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto')
const { pool, env } = require('../scripts/migrations-lib.cjs')
const { Table } = require('../node_modules/typeorm')
const runner = require('../scripts/payroll-migrations.cjs')
const { OvertimeEntry } = require('../src/requests/entities/attendance.entities')
const { OvertimeDayClaim, OvertimeEntryEvent } = require('../src/requests/entities/overtime-workflow.entities')
const { assertOvertimeDayAvailable, claimOvertimeDay, releaseOvertimeDayClaim, appendOvertimeEvent } = require('../src/requests/overtime-day-claims')
const { lockPayrollEmployees } = require('../src/payroll/payroll-settlement-boundary')
const database = 'hr_payroll_migration_test_' + crypto.randomBytes(8).toString('hex')
const file = path.resolve(__dirname, '../../docs/migrations/payroll/20260913_005_overtime_workflow.sql')
const content = fs.readFileSync(file, 'utf8')
const version = { version: path.basename(file, '.sql'), checksum: runner.digest(content), operations: runner.validateSql(content) }
const additions = ['calculationSnapshot', 'approvedMinutes', 'hourlyRateSnapshot', 'amountSnapshot', 'originalPeriod', 'deferredFromRunId']
let master, connection, ds, created = false
function disposable() {
  assert.match(database, /^hr_payroll_migration_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
const original = async () => (await connection.request().query('SELECT id,employeeId,date,hoursRequested,hoursActual,payableHours,rate,status,payrollRunId FROM dbo.overtime_entries ORDER BY id; SELECT * FROM dbo.ot_canary;')).recordsets
before(async () => {
  disposable()
  master = await pool('master')
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  connection = await pool(database)
  ds = await runner.openDataSource(database, [OvertimeEntry, OvertimeDayClaim, OvertimeEntryEvent])
  const qr = ds.createQueryRunner()
  try {
    const table = Table.create(ds.getMetadata(OvertimeEntry), ds.driver)
    table.columns = table.columns.filter(column => !additions.includes(column.name))
    await qr.createTable(table, true, true, true)
  } finally { await qr.release() }
  await connection.request().batch("CREATE TABLE dbo.ot_canary(id int PRIMARY KEY, originalBytes varbinary(MAX) NOT NULL, amount decimal(18,2) NOT NULL); INSERT dbo.ot_canary VALUES(1,0xF011AACC,9876.54); INSERT dbo.overtime_entries(employeeId,date,source,hoursRequested,hoursActual,payableHours,rate,status,payrollRunId) VALUES(7,'2026-07-08','PRE_REQUESTED',2,2,2,1.5,'APPROVED',NULL),(7,'2026-07-08','PRE_REQUESTED',1,1,1,1.5,'APPROVED',NULL);")
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
  if (errors.length) throw new AggregateError(errors, 'Overtime migration fixture cleanup failed')
})

test('OT SQL005 contains only six nullable additions and separate claim/event tables', () => {
  assert.equal(version.operations.filter(operation => operation.kind === 'add-column').length, 6)
  assert.equal(version.operations.filter(operation => operation.kind === 'create-table').length, 2)
  assert.equal(version.operations.filter(operation => operation.kind === 'create-index').length, 3)
  for (const sql of ['DROP TABLE dbo.overtime_entries;', 'ALTER TABLE dbo.overtime_entries ALTER COLUMN rate decimal(18,6);',
    'UPDATE dbo.overtime_entries SET payableHours=0;', 'ALTER TABLE dbo.overtime_entries ADD invented int;']) assert.throws(() => runner.validateSql(sql))
})

test('OT SQL005 later DDL failure rolls back additions and preserves old duplicate entries', async () => {
  const old = await original()
  const broken = { ...version, operations: [...version.operations, ...runner.validateSql('CREATE TABLE dbo.ot_canary(id int NULL);')] }
  await assert.rejects(runner.applyDisposableTest(ds, [broken]), /already an object|already exists/i)
  assert.deepEqual(await original(), old)
  assert.deepEqual((await connection.request().query("SELECT COL_LENGTH('dbo.overtime_entries','approvedMinutes') AS minutes, OBJECT_ID('dbo.overtime_day_claims') AS claims")).recordset[0], { minutes: null, claims: null })
})

test('OT SQL005 matches metadata and leaves every historical snapshot NULL without backfill', async () => {
  const old = await original()
  assert.deepEqual((await runner.applyDisposableTest(ds, [version])).applied, [version.version])
  assert.deepEqual(await runner.schemaDiff(ds), [])
  assert.deepEqual(await original(), old)
  for (const row of await ds.getRepository(OvertimeEntry).find()) for (const field of additions) assert.equal(row[field], null)
  assert.equal(await ds.getRepository(OvertimeDayClaim).count(), 0)
  assert.equal(await ds.getRepository(OvertimeEntryEvent).count(), 0)
})

test('OT runtime guard rejects historical active duplicates without deleting either row', async () => {
  const old = await original()
  await assert.rejects(assertOvertimeDayAvailable(ds.manager, 7, '2026-07-08'), error => error.getStatus() === 409)
  assert.deepEqual(await original(), old)
})

test('OT filtered unique guard permits a replacement only after release and preserves immutable events', async () => {
  let entryId
  await ds.transaction(async em => {
    await lockPayrollEmployees(em, [8])
    const entry = await em.getRepository(OvertimeEntry).save({ employeeId: 8, date: '2026-07-09', source: 'PRE_REQUESTED', status: 'SUBMITTED' })
    entryId = entry.id
    await claimOvertimeDay(em, entry)
    await appendOvertimeEvent(em, { entryId, eventType: 'SUBMITTED', actorUserId: 91, payload: { requestedMinutes: 135 } })
  })
  await assert.rejects(ds.getRepository(OvertimeDayClaim).save({ employeeId: 8, workDate: '2026-07-09', entryId: 999, releasedAt: null }), /duplicate|unique/i)
  const before = await ds.getRepository(OvertimeEntryEvent).find()
  await ds.transaction(async em => {
    await lockPayrollEmployees(em, [8])
    await em.getRepository(OvertimeEntry).update(entryId, { status: 'CANCELLED' })
    await releaseOvertimeDayClaim(em, entryId)
    const replacement = await em.getRepository(OvertimeEntry).save({ employeeId: 8, date: '2026-07-09', source: 'PRE_REQUESTED', status: 'SUBMITTED' })
    await claimOvertimeDay(em, replacement)
  })
  assert.equal(await ds.getRepository(OvertimeDayClaim).count(), 2)
  assert.deepEqual(await ds.getRepository(OvertimeEntryEvent).find(), before)
})

test('OT SQL005 replay preserves all legacy values and existing audit bytes', async () => {
  const old = await original(), events = await ds.getRepository(OvertimeEntryEvent).find()
  const replay = await runner.applyDisposableTest(ds, [version])
  assert.deepEqual(replay.applied, [])
  assert.deepEqual(replay.skipped, [version.version])
  assert.deepEqual(await original(), old)
  assert.deepEqual(await ds.getRepository(OvertimeEntryEvent).find(), events)
  assert.deepEqual(await runner.schemaDiff(ds), [])
})
