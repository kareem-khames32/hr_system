'use strict'
// المراجعة المستقلة 24 سبتمبر (CR2-B01): حساب مسير 500 موظف كان بيقع عند حفظ أعضائه — TypeORM بيحفظ المصفوفة كلها
// في INSERT واحد (500 × 6 أعمدة = 3,000 قيمة) وSQL Server بيرفض فوق 2,100 (الخطأ 8003)، فأي مسير فوق ~350 موظف كان
// بيفشل بعد ما يخلص الحساب كله. SQL حقيقي في قاعدة اختبار عشوائية تُحذف في النهاية:
//   ١) الحفظ الجماعي القديم بيقع فعلًا بـ8003 ومايسيبش صفوف (عشان الاختبار ده بيحرس الحاجة الصح).
//   ٢) saveInSqlBatches (اللي حفظ أعضاء المسير بقى بيستخدمها) بتحفظ الـ500.
//   ٣) التقسيم مابيكسرش الذرية: جوّه معاملة واحدة، فشل بعد الدفعات = ولا صف (حساب المسير كله معاملة واحدة).
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const { saveInSqlBatches, sqlBatchSize } = require('../src/common/sql-batches')
const database = `hr_sql_batches_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_sql_batches_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-sql-batches-files-'))
let app, ds, master, created = false
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME,
    password: env.DB_PASSWORD, database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: crypto.randomBytes(48).toString('hex'), UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  await app.init()
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assert.equal(ds.options.database, database)
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try { fs.rmSync(uploads, { recursive: true, force: true }) } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'sql batches fixture cleanup failed')
})

async function fiveHundredMembers(label) {
  const branch = await repo('Branch').save({ code: `SB-${label}`, name: `فرع دفعات ${label}` })
  const staff = Array.from({ length: 500 }, (_, i) => ({ employeeCode: `SB${label}${String(i).padStart(4, '0')}`, fullName: `موظف ${i}`, basicSalary: 7800, branchId: branch.id }))
  const employees = await repo('Employee').save(staff, { chunk: 50 })
  const run = await repo('PayrollRun').save({ name: `مسير دفعات ${label}`, period: '2026-10', startDate: '2026-09-23', endDate: '2026-10-22', status: 'DRAFT' })
  const members = employees.map(employee => repo('PayrollRunMember').create({ runId: run.id, employeeId: employee.id,
    snapshot: { employeeCode: employee.employeeCode, gross: 7800 }, membershipStatus: 'INCLUDED', inclusionSource: 'SCOPE', exclusionReason: null }))
  return { run, members }
}

test('SB-01: حفظ 500 عضو مسير في جملة واحدة بيقع بخطأ SQL Server 8003 ومايسيبش صفوف — ده اللي كان بيوقع المسير الكبير', async t => {
  const { run, members } = await fiveHundredMembers('A')
  let failure = null
  try { await repo('PayrollRunMember').save(members) } catch (error) { failure = { number: error.driverError?.number ?? error.number, message: String(error.message).split('\n')[0] } }
  t.diagnostic(JSON.stringify({ columnsPerRow: repo('PayrollRunMember').metadata.columns.length, failure }))
  assert.ok(failure, 'الحفظ الجماعي فوق 2,100 قيمة لازم يترفض')
  assert.equal(failure.number, 8003)
  assert.equal(await repo('PayrollRunMember').countBy({ runId: run.id }), 0)
}, { timeout: 180000 })

test('SB-02: saveInSqlBatches بتحفظ الـ500 على دفعات تحت الحد، بنفس البيانات بالظبط', async () => {
  const { run, members } = await fiveHundredMembers('B')
  assert.ok(500 > sqlBatchSize(repo('PayrollRunMember').metadata.columns.length), 'أكتر من دفعة فعلًا')
  const saved = await saveInSqlBatches(repo('PayrollRunMember'), members)
  assert.equal(saved.length, 500)
  assert.ok(saved.every(member => Number.isInteger(member.id) && member.id > 0))
  const rows = await repo('PayrollRunMember').find({ where: { runId: run.id }, order: { employeeId: 'ASC' } })
  assert.equal(rows.length, 500)
  assert.deepEqual(rows.map(row => row.employeeId), members.map(member => member.employeeId).sort((a, b) => a - b))
  assert.ok(rows.every(row => row.membershipStatus === 'INCLUDED' && row.snapshot?.gross === 7800))
}, { timeout: 180000 })

test('SB-03: الدفعات جوّه معاملة واحدة: فشل بعد آخر دفعة بيرجّع الكل — ولا عضو يفضل (زي حساب المسير)', async () => {
  const { run, members } = await fiveHundredMembers('C')
  await assert.rejects(ds.transaction(async em => {
    const saved = await saveInSqlBatches(em.getRepository('PayrollRunMember'), members)
    assert.equal(saved.length, 500)
    assert.equal(await em.getRepository('PayrollRunMember').countBy({ runId: run.id }), 500, 'جوّه المعاملة الكل موجود')
    throw new Error('فشل مقصود بعد الدفعات')
  }), /فشل مقصود بعد الدفعات/)
  assert.equal(await repo('PayrollRunMember').countBy({ runId: run.id }), 0, 'الرجوع شمل كل الدفعات')
}, { timeout: 180000 })
