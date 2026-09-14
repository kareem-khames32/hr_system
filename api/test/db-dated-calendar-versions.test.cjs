// Run: node --test --test-concurrency=1 api/test/db-dated-calendar-versions.test.cjs
// ترحيل 20260914_013 (نسخ التقويم والفرع وجدول العمل المؤرخة) على قاعدة مؤقتة hr_dated_versions_test_<16 hex>
// تُنشأ بمزامنة الكيانات (مسموحة للقواعد المؤقتة فقط) وتُحذف بعد الاختبار. يمر عبر المُرحّل المجمّع نفسه.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(apiRoot, '..')
const migrate = require('../scripts/db-migrate.cjs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const typeorm = require('../node_modules/typeorm')

const SOURCE = path.join(repoRoot, 'docs/migrations/payroll/20260914_013_db_dated_calendar_versions.cjs')
const migration013 = require(SOURCE)
const database = `hr_dated_versions_test_${crypto.randomBytes(8).toString('hex')}`
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-dated-versions-'))
let master, ds, created = false
const fixture = {}

function entityFiles(dir, out = []) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name)
    if (item.isDirectory()) entityFiles(file, out)
    else if (/\.entit(?:y|ies)\.ts$/.test(item.name)) out.push(file)
  }
  return out
}

test('cycleStart: the payroll cycle containing a date, wrapping to the previous month and year', () => {
  assert.equal(migration013.cycleStart('2026-04-23', 23), '2026-04-23')
  assert.equal(migration013.cycleStart('2026-04-22', 23), '2026-03-23')
  assert.equal(migration013.cycleStart('2026-01-10', 23), '2025-12-23')
  assert.equal(migration013.cycleStart('2026-12-31', 23), '2026-12-23')
  assert.equal(migration013.cycleStart('2026-03-01', 1), '2026-03-01')
})

before(async () => {
  assert.match(database, migrate.DISPOSABLE_DATABASE); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME || 'sa',
    password: env.DB_PASSWORD, database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 10000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`)
  created = true
  for (const file of entityFiles(path.join(apiRoot, 'src'))) require(file)
  ds = new typeorm.DataSource({ type: 'mssql', host: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), username: env.DB_USERNAME || 'sa',
    password: env.DB_PASSWORD, database, options: { encrypt: false, trustServerCertificate: true },
    entities: [...new Set(typeorm.getMetadataArgsStorage().tables.map(t => t.target))], synchronize: true, logging: false })
  await ds.initialize()
  assert.equal(ds.options.database, database)
  const repo = name => ds.getRepository(name)
  fixture.admin = await repo('User').save({ email: `admin-${crypto.randomBytes(3).toString('hex')}@test.local`, passwordHash: 'x', displayName: 'مدير اختبار', role: 'super_admin', branchId: null })
  await repo('RequestsConfig').save([{ key: 'payroll.cycle_start_day', value: '23' }, { key: 'attendance.weekend_days', value: 'FRI,SAT' }])
  fixture.branchA = await repo('Branch').save({ name: 'فرع اختبار أ', code: 'DVA' })
  fixture.branchB = await repo('Branch').save({ name: 'فرع اختبار ب', code: 'DVB' })
  fixture.schedule = await repo('WorkSchedule').save({ name: 'جدول اختبار', weekendDays: 'FRI,SAT', startTime: '08:00', endTime: '17:00', isDefault: true })
  fixture.withSchedule = await repo('Employee').save({ employeeCode: 'DV1', fullName: 'موظف بجدول', branchId: fixture.branchA.id, workScheduleId: fixture.schedule.id, status: 'active', joinDate: '2025-01-01' })
  fixture.noSchedule = await repo('Employee').save({ employeeCode: 'DV2', fullName: 'موظف بلا جدول', branchId: fixture.branchB.id, status: 'active', joinDate: '2025-01-01' })
  // employees.branchId غير قابل لـNULL في الكيان (وفي hr_system)؛ مسار «موظف بلا فرع» في 013 دفاعي،
  // فنفتح العمود في هذه القاعدة المؤقتة فقط لنثبت أنه يُبلَّغ عنه ولا يُخترع فرع
  fixture.noBranch = await repo('Employee').save({ employeeCode: 'DV3', fullName: 'موظف بلا فرع', branchId: fixture.branchA.id, status: 'active', joinDate: '2025-01-01' })
  for (const index of await ds.query(`SELECT i.name FROM sys.indexes i JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
      JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id WHERE i.object_id = OBJECT_ID(N'dbo.employees') AND c.name = N'branchId' AND i.is_primary_key = 0`)) {
    await ds.query(`DROP INDEX [${index.name}] ON dbo.employees`)
  }
  await ds.query('ALTER TABLE dbo.employees ALTER COLUMN branchId int NULL')
  await ds.query('UPDATE dbo.employees SET branchId = NULL WHERE id = @0', [fixture.noBranch.id])
  fixture.noBranch.branchId = null
  // أقدم يوم حضور 2026-01-10، وأقدم بداية مسير 2026-01-05 → بداية الدورة 2025-12-23 (التفاف للسنة السابقة)
  await repo('AttendanceDay').save({ employeeId: fixture.withSchedule.id, branchId: fixture.branchA.id, date: '2026-01-10', status: 'present',
    shiftName: 'صباحي', shiftStart: '08:00', shiftEnd: '17:00', checkIn: '08:00', checkOut: '17:00' })
  await ds.query(`INSERT INTO dbo.payroll_runs (period, startDate, endDate, status) VALUES (N'2026-01', '2026-01-05', '2026-01-22', N'CALCULATED')`)
  fs.mkdirSync(path.join(base, 'payroll'), { recursive: true })
  fs.copyFileSync(SOURCE, path.join(base, 'payroll', path.basename(SOURCE)))
})

after(async () => {
  if (ds?.isInitialized) await ds.destroy()
  if (created) await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
  if (master) await master.close()
  fs.rmSync(base, { recursive: true, force: true })
})

const versionsOf = (sourceType, sourceId) => ds.query(`SELECT version, CONVERT(varchar(10), effectiveFrom, 23) AS effectiveFrom, legacyBaseline, actorUserId, reason, snapshot
  FROM dbo.attendance_rule_versions WHERE sourceType=@0 AND sourceId=@1 ORDER BY version`, [sourceType, sourceId])
// الغلاف {schemaVersion, data, contentHash}: البصمة تشمل رقم النسخة وتاريخ السريان، فالقيم تُقارن من data
const data = snapshot => { const value = JSON.parse(snapshot); assert.deepEqual(Object.keys(value).sort(), ['contentHash', 'data', 'schemaVersion']); return value.data }

test('first run: dated versions from the start of the earliest recorded payroll cycle; employees without a branch are reported, not invented', async () => {
  const record = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.equal(record.ok, true, JSON.stringify(record.failed))
  const result = record.applied[0].result
  assert.equal(result.earliestRecordedDate, '2026-01-05')
  assert.equal(result.cycleStartDay, 23)
  assert.equal(result.effectiveFrom, '2025-12-23')
  assert.equal(result.actorUserId, fixture.admin.id)
  assert.deepEqual(result.created, { CALENDAR_GLOBAL: 1, CALENDAR_BRANCH: 2, WORK_SCHEDULE: 1, EMPLOYEE_ORG: 2, EMPLOYEE: 3 })
  assert.deepEqual(result.skipped, [])
  assert.deepEqual(result.unresolved.map(item => [item.employeeId, item.source]), [[fixture.noBranch.id, 'EMPLOYEE_ORG']])
  assert.ok(record.applied[0].guard.tables > 0, 'the script ran under the runtime guard')

  for (const [type, id] of [['CALENDAR_GLOBAL', 0], ['CALENDAR_BRANCH', fixture.branchA.id], ['CALENDAR_BRANCH', fixture.branchB.id],
    ['EMPLOYEE_ORG', fixture.withSchedule.id], ['EMPLOYEE_ORG', fixture.noSchedule.id]]) {
    const rows = await versionsOf(type, id)
    assert.deepEqual(rows.map(r => [r.version, r.effectiveFrom, !!r.legacyBaseline]), [[0, null, true], [1, '2025-12-23', false]], `${type}:${id}`)
    // النسخة المؤرخة = القيم الحالية نفسها (لا تغيير قيمة داخل أي فترة مقفلة)
    assert.deepEqual(data(rows[1].snapshot), data(rows[0].snapshot), `${type}:${id} values unchanged`)
    assert.match(rows[1].reason, /ترحيل 20260914_013/)
  }
  assert.equal((await versionsOf('EMPLOYEE_ORG', fixture.noBranch.id)).length, 0)
  const employeeRule = await versionsOf('EMPLOYEE', fixture.withSchedule.id)
  assert.equal(employeeRule.at(-1).effectiveFrom, '2025-12-23')
  assert.equal(JSON.parse(employeeRule.at(-1).snapshot).workScheduleId, fixture.schedule.id)
  assert.equal((await versionsOf('WORK_SCHEDULE', fixture.schedule.id)).at(-1).effectiveFrom, '2025-12-23')
})

test('strict calendar resolution works from the effective date and still reports missing versions before it', async () => {
  const { resolveEmployeeCalendarDay } = require('../src/attendance/attendance-calendar-resolver')
  const resolve = (employee, date) => ds.transaction('SERIALIZABLE', em => resolveEmployeeCalendarDay(em, employee.id, date, { strict: true }))
  for (const date of ['2025-12-23', '2026-01-12', '2026-09-14']) {
    const day = await resolve(fixture.withSchedule, date)
    assert.doesNotMatch(JSON.stringify(day), /CALENDAR_VERSION_MISSING/, date)
  }
  assert.match(JSON.stringify(await resolve(fixture.withSchedule, '2025-12-22')), /CALENDAR_VERSION_MISSING/)
})

test('second run skips every source that already has versions and reports the same unresolved employee', async () => {
  fs.copyFileSync(SOURCE, path.join(base, 'payroll', '20260914_099_t_dated_again.cjs'))
  const countBefore = (await ds.query('SELECT COUNT(*) AS n FROM dbo.attendance_rule_versions'))[0].n
  const record = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.equal(record.ok, true, JSON.stringify(record.failed))
  const result = record.applied[0].result
  assert.deepEqual(result.created, { CALENDAR_GLOBAL: 0, CALENDAR_BRANCH: 0, WORK_SCHEDULE: 0, EMPLOYEE_ORG: 0, EMPLOYEE: 0 })
  assert.equal(result.skipped.length, 9)
  assert.deepEqual(result.unresolved.map(item => item.employeeId), [fixture.noBranch.id])
  assert.equal((await ds.query('SELECT COUNT(*) AS n FROM dbo.attendance_rule_versions'))[0].n, countBefore)
})
