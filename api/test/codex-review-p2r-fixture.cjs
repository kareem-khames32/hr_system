'use strict'
// Fixture helper. Requires the review preload (which refuses real HTTP listeners).
const assert = require('node:assert/strict'), crypto = require('node:crypto'), fs = require('node:fs'), path = require('node:path')
const root = path.resolve(__dirname, '..')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(root, '.env')))
const sql = require('../node_modules/mssql')
const { safeDatabase } = require('./codex-review-round5-harness.cjs')
module.exports = async function fixture(label, options = {}) {
  const database = `hr_codex_${label}_test_${crypto.randomBytes(8).toString('hex')}`
  function assertDisposable() { safeDatabase(database); if (ds) assert.equal(ds.options.database, database) }
  let master, app, ds, created = false
  const close = async () => {
    if (app) await app.close()
    if (created) {
      assertDisposable()
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('n', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name=@n')
      assert.equal(found.recordset.length, 0)
      console.log(JSON.stringify({ cleanupVerified: database }))
    }
    if (master) await master.close()
  }
  try {
    assertDisposable()
    master = await new sql.ConnectionPool({ server: 'localhost', port: 1433, user: env.DB_USERNAME, password: env.DB_PASSWORD,
      database: 'master', connectionTimeout: 5000, requestTimeout: 300000, options: { encrypt: false, trustServerCertificate: true } }).connect()
    await master.request().query(`CREATE DATABASE [${database}]`); created = true
    if(options.rcsi === true) { assertDisposable(); await master.request().query(`ALTER DATABASE [${database}] SET READ_COMMITTED_SNAPSHOT ON`) }
    Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', QUEUE_WORKER: 'off', UPLOADS_ROOT: path.join(__dirname,'codex-review-p2r-tmp','independent-uploads'), JWT_SECRET: crypto.randomBytes(48).toString('hex') })
    app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: false })
    // Instance substitutions before app.init or enabling notification email.
    const mail=app.get(require('../src/auth/mail.service').MailService)
    const mailbox={sent:[],attempts:[],configured:true,hold:null,failure:null}
    mail.isConfigured=()=>mailbox.configured
    mail.send=async message=>{mailbox.attempts.push({...message});if(mailbox.hold)await mailbox.hold;if(mailbox.failure)throw mailbox.failure;mailbox.sent.push({...message});return{accepted:[message.to],rejected:[],messageId:'review-only',response:'250 synthetic'}}
    assert.notEqual(mail.send,require('../src/auth/mail.service').MailService.prototype.send)
    app.get(require('../node_modules/@nestjs/config').ConfigService).set('FRONTEND_URL','https://hr.example.invalid')
    app.setGlobalPrefix('api')
    app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
    await app.init()
    ds = app.get(require('../node_modules/typeorm').DataSource)
    assertDisposable()
    const repo = name => { assertDisposable(); return ds.getRepository(name) }
    const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret: process.env.JWT_SECRET })
    const admin = await repo('User').save({ email: 'reviewer@codex.invalid', displayName: 'Review Admin', passwordHash: 'not-a-password', role: 'super_admin', permissions: '[]' })
    const approver = await repo('User').save({ email: 'approver@codex.invalid', displayName: 'Review Approver', passwordHash: 'not-a-password', role: 'super_admin', permissions: '[]' })
    const request = async (method, route, body, actor = admin) => {
      const token = actor ? jwt.sign({ sub: actor.id, email: actor.email, role: actor.role, branchId: actor.branchId ?? null,
        scopeAllBranches: actor.scopeAllBranches === true, ...(actor.legacyToken ? {} : { branchIds: require('../src/auth/guards').effectiveBranchScope(actor) ?? undefined }), employeeId: actor.employeeId ?? null, tokenVersion: actor.tokenVersion || 0, permissions: actor.role === 'super_admin' ? ['*'] : JSON.parse(actor.permissions || '[]') }) : null
      const r = await fetch('http://127.0.0.1:1/api' + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? {Authorization: 'Bearer ' + token} : {}) },
        ...(body == null ? {} : { body: JSON.stringify(body) }) })
      return { status: r.status, body: await r.json() }
    }
    const ok = async (method, route, body, actor = admin) => {
      const r = await request(method, route, body, actor)
      assert.ok(r.status >= 200 && r.status < 300, `${method} ${route}: ${r.status} ${JSON.stringify(r.body)}`)
      return r.body
    }
    const setting = async (key, value) => { const old = await repo('RequestsConfig').findOneBy({key}); await repo('RequestsConfig').save({ ...(old || {}), key, value: String(value) }) }
    const policy = async () => {
      await setting('payroll.salary_evidence_mode', 'MONTHLY_HISTORY_OR_CURRENT_FILE')
      await setting('payroll.cycle_start_day', '23')
      await setting('payroll.monthly_days', '30'); await setting('payroll.daily_hours', '8')
      const p = await ok('POST', '/payroll/policies', { name: 'Independent Review Policy', effectiveFrom: '2026-01-23', settings: {
        defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 23, cycleEndMode: 'DERIVED', cycleEndDay: null, dailyHours: 8 } })
      return (await ok('POST', `/payroll/policies/${p.policy.id}/versions/${p.versions[0].id}/publish`, {
        expectedRevision: p.versions[0].revision, reason: 'Independent disposable test' })).version.id
    }
    const approve = async id => {
      const { writeParityReasonsBeforeApproval } = require('./fixtures/payroll-parity-reasons.cjs')
      const adapt = (user, method, route, body) => request(method, route, body, user)
      await writeParityReasonsBeforeApproval(adapt, approver, 'POST', `/payroll/runs/${id}/approve`)
      const report = await ok('GET', `/payroll/runs/${id}/unassigned`, null, approver)
      await ok('POST', `/payroll/runs/${id}/unassigned-ack`, { reportHash: report.reportHash }, approver)
      return ok('POST', `/payroll/runs/${id}/approve`, {}, approver)
    }
    return { database, app, ds, master, mailbox, repo, admin, approver, request, ok, setting, policy, approve, assertDisposable, close }
  } catch (error) { await close(); throw error }
}
