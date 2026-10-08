'use strict'
// B5.6 على SQL حقيقي: بصمة الموبايل — الميزة الفرعية مقفولة افتراضيًا، ترحيلي 167 و168، مواقع البصمة بنطاق الفرع، والحكم على الخادم (نطاق، دقة، وقت الخادم،
// مهلة بين بصمتين)، وتسجيل كل محاولة، ودخول البصمة المقبولة من مسار البصمات القايم. قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const migrate = require('../scripts/db-migrate.cjs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_mobile_punch_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_mobile_punch_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-mobile-punch-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/attendance/mobile-punch')
const MIGRATIONS = ['20261010_167_punch_sites.sql', '20261010_168_mobile_punch_attempts.sql'].map(name => path.resolve(apiRoot, '..', 'docs', 'migrations', 'payroll', name))
let master, pool, app, ds, base, modules, created = false, sequence = 0
const B = {}, E = {}, U = {}, S = {}
const repo = name => { assert.match(database, NAME); assert.equal(ds.options.database, database); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token(user) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const raw = await response.text(); let parsed = null
  try { parsed = raw ? JSON.parse(raw) : null } catch { parsed = raw }
  return { status: response.status, body: parsed }
}
const ok = (response, status = 200) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const refused = (response, status, message) => { assert.deepEqual([response.status, response.body?.message], [status, message]) }
const employee = (name, branch, extra = {}) => repo('Employee').save({ employeeCode: 'MP' + ++sequence, fullName: name, branchId: branch.id, joinDate: '2020-01-01',
  basicSalary: 5000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'cash', ...extra })
const account = (label, branch, permissions, extra = {}) => repo('User').save({ email: `${label}@mobile-punch.invalid`, displayName: 'حساب ' + label, passwordHash: 'test-only', role: 'employee', branchId: branch.id,
  permissions: JSON.stringify(permissions), isActive: true, ...extra })
const runMigrations = async () => { assert.match(database, NAME); for (const file of MIGRATIONS) for (const batch of migrate.splitBatches(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'))) await pool.request().batch(batch) }
const P = '/attendance/mobile-punch'
// موقع المصنع ونقط حواليه
const SITE = { latitude: 24.7136, longitude: 46.6753 }
const INSIDE = { latitude: 24.7137, longitude: 46.6754, accuracy: 12.4 }
const OUTSIDE = { latitude: 24.72, longitude: 46.6753, accuracy: 10 }
const punch = (user, body) => request(user, 'POST', P, body)
const saveSite = (user, body, id) => request(user, id ? 'PATCH' : 'POST', id ? `${P}/sites/${id}` : `${P}/sites`, body)
const attemptsOf = async person => (await repo('MobilePunchAttempt').find({ where: { employeeId: person.id }, order: { id: 'ASC' } })).map(row => [row.outcome, row.siteId, row.accuracyMeters, row.distanceMeters])
const punchesOf = person => repo('AttendancePunch').find({ where: { employeeId: person.id }, order: { id: 'ASC' } })
const cool = person => pool.request().query(`UPDATE dbo.mobile_punch_attempts SET [createdAt] = DATEADD(MINUTE, -5, [createdAt]) WHERE [employeeId] = ${Number(person.id)}`)

before(async () => {
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  const connection = { server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD, options: { encrypt: false, trustServerCertificate: true } }
  master = await new sql.ConnectionPool({ ...connection, database: 'master' }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  // مفيش رسالة بريد حقيقية بتطلع من الاختبار
  const mail = app.get(require('../src/auth/mail.service').MailService)
  mail.isConfigured = () => false
  mail.send = async () => { throw new Error('no mail in tests') }
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1'); ds = app.get(require('../node_modules/typeorm').DataSource)
  assert.equal(ds.options.database, database)
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  pool = await new sql.ConnectionPool({ ...connection, database }).connect()
  modules = app.get(require('../src/modules-registry/modules.service').ModulesService)
  B.riyadh = await repo('Branch').save({ code: 'MP_1', name: 'فرع الرياض', country: 'SA' })
  B.cairo = await repo('Branch').save({ code: 'MP_2', name: 'فرع القاهرة', country: 'EG' })
  U.admin = await repo('User').save({ email: 'admin@mobile-punch.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', scopeAllBranches: true, permissions: '[]', isActive: true })
  E.one = await employee('موظف أول', B.riyadh, { fingerprintCode: '9001' }); E.bare = await employee('موظف من غير بصمة', B.riyadh)
  E.cairo = await employee('موظف القاهرة', B.cairo, { fingerprintCode: '9003' }); E.gone = await employee('موظف منتهي', B.riyadh, { fingerprintCode: '9004', status: 'terminated', isActive: false })
  E.racer = await employee('موظف مستعجل', B.riyadh, { fingerprintCode: '9005' })
  U.one = await account('one', B.riyadh, [], { employeeId: E.one.id }); U.bare = await account('bare', B.riyadh, [], { employeeId: E.bare.id }); U.cairo = await account('cairo', B.cairo, [], { employeeId: E.cairo.id })
  U.gone = await account('gone', B.riyadh, [], { employeeId: E.gone.id }); U.racer = await account('racer', B.riyadh, [], { employeeId: E.racer.id })
  U.mgr = await account('mgr', B.riyadh, ['attendance.manage', 'attendance.view_all']); U.mgrCairo = await account('mgr-cairo', B.cairo, ['attendance.manage', 'attendance.view_all'])
  U.viewer = await account('viewer', B.riyadh, ['attendance.view_all'])
}, { timeout: 120000 })

after(async t => {
  if (app) await app.close()
  if (pool) await pool.close()
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


test('P5A-M01: accepted mobile punch is attached to a different fingerprint owner',async t=>{
 ok(await request(U.admin,'PUT','/modules/features/'+rules.MOBILE_PUNCH_FEATURE,{enabled:true})); modules.invalidate()
 ok(await saveSite(U.mgr,{name:'Review factory',branchId:B.riyadh.id,...SITE,radiusMeters:150}),201)
 const service=app.get(require('../src/attendance/attendance.service').AttendanceService), original=service.ingest
 let hit=false
 service.ingest=async function(...args){if(!hit){hit=true;ok(await request(U.admin,'PATCH','/employees/'+E.one.id,{fingerprintCode:'9011'}));ok(await request(U.admin,'PATCH','/employees/'+E.cairo.id,{fingerprintCode:'9001'}))}return original.apply(this,args)}
 let result;try{result=await punch(U.one,INSIDE)}finally{service.ingest=original}
 const own=await punchesOf(E.one), other=await punchesOf(E.cairo)
 assert.equal(hit,true);ok(result,201);assert.equal(own.length,0);assert.equal(other.length,1)
 t.diagnostic(JSON.stringify({id:'P5A-M01',status:result.status,ownPunches:own.length,otherEmployeePunches:other.length}))
})
