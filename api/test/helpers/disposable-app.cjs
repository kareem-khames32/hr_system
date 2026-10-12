'use strict'
// مساعد اختبارات التكامل لإضافات المالك (12 أكتوبر 2026): بيقوّم AppModule على قاعدة SQL مؤقتة عشوائية (hr_<tag>_test_<16 hex>)
// وبيمسحها في الآخر ويتأكد إنها اتمسحت. نفس نمط الاختبارات القايمة بالحرف (توكنات موقّعة محليًا من غير كلمات مرور، ومفيش بريد
// حقيقي) — متجمّع في مكان واحد بدل ما يتكرر في كل ملف. الاستخدام:
//   const { disposableApp } = require('./helpers/disposable-app.cjs')
//   const t = disposableApp('work_extension'); before(t.start, { timeout: 90000 }); after(t.stop)
//   … t.repo('Employee') · t.request(user, 'PATCH', '/employees/1', body) · t.expectStatus(response, 200) · t.ds · t.app
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..', '..')
require('../../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../../node_modules/reflect-metadata')
const sql = require('../../node_modules/mssql')

function disposableApp(tag, extraEnv = {}) {
  assert.match(tag, /^[a-z][a-z0-9_]{2,30}$/)
  const env = require('../../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
  const database = `hr_${tag}_test_${crypto.randomBytes(8).toString('hex')}`
  const NAME = new RegExp(`^hr_${tag}_test_[a-f0-9]{16}$`)
  const uploads = fs.mkdtempSync(path.join(os.tmpdir(), `hr-${tag.replace(/_/g, '-')}-files-`))
  const secret = crypto.randomBytes(48).toString('hex')
  const jwt = new (require('../../node_modules/@nestjs/jwt').JwtService)({ secret })
  const t = { database, app: null, ds: null, base: '', master: null }
  let created = false

  function assertDisposable() {
    assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
    if (t.ds) assert.equal(t.ds.options.database, database)
  }
  t.repo = name => { assertDisposable(); return t.ds.getRepository(name) }
  t.query = (text, params) => { assertDisposable(); return t.ds.query(text, params) }
  t.payloadOf = user => ({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false,
    permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
  t.request = async (user, method, route, body) => {
    const response = await fetch(t.base + route, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${jwt.sign(t.payloadOf(user))}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
    const text = await response.text()
    let parsed = null
    try { parsed = text ? JSON.parse(text) : null } catch { parsed = text }
    return { status: response.status, body: parsed }
  }
  t.expectStatus = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
  t.user = (overrides = {}) => t.repo('User').save({ email: `${crypto.randomBytes(5).toString('hex')}@${tag.replace(/_/g, '-')}.invalid`, displayName: 'حساب اختبار',
    passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]', ...overrides })

  t.start = async () => {
    assert.equal(env.DB_TYPE || 'mssql', 'mssql'); assertDisposable()
    t.master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME,
      password: env.DB_PASSWORD, database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
    await t.master.request().query(`CREATE DATABASE [${database}]`); created = true
    Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads, ...extraEnv })
    t.app = await require('../../node_modules/@nestjs/core').NestFactory.create(require('../../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
    t.app.setGlobalPrefix('api')
    t.app.useGlobalPipes(new (require('../../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
    await t.app.listen(0, '127.0.0.1')
    for (const job of t.app.get(require('../../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
    t.ds = t.app.get(require('../../node_modules/typeorm').DataSource)
    assert.equal(t.ds.options.database, database)
    t.base = `http://127.0.0.1:${t.app.getHttpServer().address().port}/api`
  }

  t.stop = async context => {
    const errors = []
    try { if (t.app) await t.app.close() } catch (error) { errors.push(error) }
    try {
      if (created && t.master) {
        assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
        await t.master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
        const found = await t.master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
        assert.equal(found.recordset.length, 0)
        context?.diagnostic?.(`Cleanup verified: ${database} is absent from sys.databases.`)
      }
    } catch (error) { errors.push(error) }
    try { if (t.master) await t.master.close() } catch (error) { errors.push(error) }
    try { fs.rmSync(uploads, { recursive: true, force: true }) } catch (error) { errors.push(error) }
    if (errors.length) throw new AggregateError(errors, `${tag} fixture cleanup failed`)
  }
  return t
}

module.exports = { disposableApp, apiRoot }
