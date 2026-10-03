'use strict'
// B1.13 على SQL حقيقي: /api/health من غير دخول بيقول حالة القاعدة وملخص المهام المجدولة (عدد بس، من غير أسماء ولا أخطاء).
// قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_ops_health_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_ops_health_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-ops-health-files-'))
let master, app, ds, base, created = false

before(async () => {
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true } }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: crypto.randomBytes(48).toString('hex'), UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  await app.listen(0, '127.0.0.1'); ds = app.get(require('../node_modules/typeorm').DataSource)
  assert.equal(ds.options.database, database)
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
}, { timeout: 120000 })

after(async t => {
  if (app) await app.close()
  try {
    if (created) {
      assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('database', database).query('SELECT DB_ID(@database) AS id')).recordset[0].id, null)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } finally {
    if (master) await master.close()
    fs.rmSync(uploads, { recursive: true, force: true })
  }
})

test('OH-01: من غير دخول — القاعدة شغالة، والمهام سليمة، وبعد فشل آخر تشغيل لمهمة مفعّلة «failing» بالعدد من غير اسم المهمة ولا الخطأ', async () => {
  const read = async () => { const response = await fetch(`${base}/health`); assert.equal(response.status, 200); return response.json() }
  const healthy = await read()
  assert.deepEqual([healthy.status, healthy.db, healthy.jobs], ['ok', 'up', { status: 'ok', failing: 0 }])
  await ds.query(`INSERT dbo.scheduled_job_runs([jobId],[slot],[status],[startedAt],[finishedAt],[durationMs],[error],[host])
    VALUES (N'attendance.materialize-absences', N'202610030100', N'FAILED', SYSUTCDATETIME(), SYSUTCDATETIME(), 12, N'تفاصيل خطأ داخلية سرية', N'test-host')`)
  const failing = await read()
  assert.deepEqual([failing.status, failing.db, failing.jobs], ['ok', 'up', { status: 'failing', failing: 1 }])
  const body = JSON.stringify(failing)
  for (const secret of ['materialize', 'تجسيد', 'تفاصيل خطأ', 'test-host']) assert.equal(body.includes(secret), false, secret)
})
