// الهيكل التنظيمي على قاعدة SQL مؤقتة معزولة (synchronize): «الإدارة التنفيذية» قسم واحد في الشركة ومعاه السكرتير التنفيذي،
// بيتضبطوا من حساب على مستوى الشركة بس، وحساب الفرع بيعدّل باقي حقول القسم عادي ومايشوفش أقسام فرع تاني.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_org_chart_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-org-chart-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, master, ds, base, admin, branchUser, cairo, riyadh, created = false, employeeNumber = 0
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function request(user, method, endpoint, body) {
  const response = await fetch(base + endpoint, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(user)}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
function expectStatus(response, status) {
  assert.equal(response.status, status, JSON.stringify(response.body))
  return response.body
}
const messageOf = response => [].concat(response.body?.message ?? []).join(' | ')
async function employee(branchId, overrides = {}) {
  const n = ++employeeNumber
  return repo('Employee').save({ employeeCode: `ORG${String(n).padStart(3, '0')}`, fullName: `موظف الهيكل ${n}`,
    branchId, joinDate: '2020-01-01', basicSalary: 9000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0,
    status: 'active', isActive: true, payMethod: 'transfer', ...overrides })
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, /^hr_org_chart_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME,
    password: env.DB_PASSWORD, database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assert.equal(ds.options.database, database)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  cairo = await repo('Branch').save({ code: 'ORG_CAI', name: 'القاهرة' })
  riyadh = await repo('Branch').save({ code: 'ORG_RUH', name: 'الرياض' })
  admin = await repo('User').save({ email: 'admin@org-chart.invalid', displayName: 'admin', passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  branchUser = await repo('User').save({ email: 'branch@org-chart.invalid', displayName: 'حساب فرع', passwordHash: 'test-only', role: 'hr', branchId: cairo.id,
    permissions: JSON.stringify(['org.manage']) })
}, { timeout: 90000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_org_chart_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try { fs.rmSync(uploads, { recursive: true, force: true }) } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Org chart fixture cleanup failed')
})

test('الإدارة التنفيذية: قسم واحد في الشركة، والسكرتير معاها بس ومش هو الرئيس التنفيذي', async () => {
  const ceo = await employee(cairo.id, { jobTitle: 'الرئيس التنفيذي' })
  const secretary = await employee(cairo.id, { jobTitle: 'سكرتير تنفيذي' })
  const execA = expectStatus(await request(admin, 'POST', '/departments', { name: 'الإدارة التنفيذية', branchId: cairo.id, managerEmployeeId: ceo.id,
    isExecutive: true, executiveSecretaryEmployeeId: secretary.id }), 201)
  assert.equal(execA.isExecutive, true)
  assert.equal(execA.executiveSecretaryEmployeeId, secretary.id)

  // السكرتير مايبقاش هو الرئيس التنفيذي
  const same = await request(admin, 'PATCH', `/departments/${execA.id}`, { executiveSecretaryEmployeeId: ceo.id })
  assert.equal(same.status, 400); assert.match(messageOf(same), /السكرتير التنفيذي مايبقاش/)
  // قسم عادي مالوش سكرتير تنفيذي
  const normal = expectStatus(await request(admin, 'POST', '/departments', { name: 'المالية', branchId: cairo.id }), 201)
  const noExec = await request(admin, 'PATCH', `/departments/${normal.id}`, { executiveSecretaryEmployeeId: secretary.id })
  assert.equal(noExec.status, 400); assert.match(messageOf(noExec), /للإدارة التنفيذية بس/)
  const missing = await request(admin, 'PATCH', `/departments/${execA.id}`, { executiveSecretaryEmployeeId: 999999 })
  assert.equal(missing.status, 400)

  // تعليم قسم تاني يشيل التعليم والسكرتير من الأول
  const execB = expectStatus(await request(admin, 'POST', '/departments', { name: 'مكتب الرئيس', branchId: riyadh.id }), 201)
  expectStatus(await request(admin, 'PATCH', `/departments/${execB.id}`, { isExecutive: true }), 200)
  const rows = await repo('Department').find({ order: { id: 'ASC' } })
  assert.deepEqual(rows.filter(r => r.isExecutive).map(r => r.id), [execB.id])
  assert.equal(rows.find(r => r.id === execA.id).executiveSecretaryEmployeeId, null)

  // شيل التعليم يمسح السكرتير
  expectStatus(await request(admin, 'PATCH', `/departments/${execB.id}`, { executiveSecretaryEmployeeId: secretary.id }), 200)
  expectStatus(await request(admin, 'PATCH', `/departments/${execB.id}`, { isExecutive: false }), 200)
  const cleared = await repo('Department').findOneBy({ id: execB.id })
  assert.equal(cleared.isExecutive, false); assert.equal(cleared.executiveSecretaryEmployeeId, null)
})

test('حساب الفرع: مايغيّرش الإدارة التنفيذية، بيعدّل باقي القسم عادي، ومايشوفش أقسام فرع تاني', async () => {
  const ceo = await employee(cairo.id)
  const exec = expectStatus(await request(admin, 'POST', '/departments', { name: 'الإدارة العليا', branchId: cairo.id, managerEmployeeId: ceo.id, isExecutive: true }), 201)
  const local = expectStatus(await request(branchUser, 'POST', '/departments', { name: 'قسم الفرع', branchId: cairo.id }), 201)
  assert.equal(local.isExecutive, false)

  const flag = await request(branchUser, 'PATCH', `/departments/${local.id}`, { isExecutive: true })
  assert.equal(flag.status, 403); assert.match(messageOf(flag), /لكل الشركة/)
  const createFlag = await request(branchUser, 'POST', '/departments', { name: 'قسم تنفيذي', branchId: cairo.id, isExecutive: true })
  assert.equal(createFlag.status, 403)
  const sec = await request(branchUser, 'PATCH', `/departments/${exec.id}`, { executiveSecretaryEmployeeId: (await employee(cairo.id)).id })
  assert.equal(sec.status, 403)
  // نفس القيم المبعوتة تاني بتتجاهل: تعديل الاسم يعدّي
  const renamed = expectStatus(await request(branchUser, 'PATCH', `/departments/${exec.id}`, { name: 'الإدارة التنفيذية للشركة', isExecutive: true, executiveSecretaryEmployeeId: null }), 200)
  assert.equal(renamed.name, 'الإدارة التنفيذية للشركة')
  assert.equal((await repo('Department').findOneBy({ id: exec.id })).isExecutive, true)

  const visible = expectStatus(await request(branchUser, 'GET', '/departments'), 200)
  assert.ok(visible.length > 0)
  assert.equal(visible.every(d => d.branchId === cairo.id), true, 'حساب الفرع مايشوفش أقسام فرع تاني')
})
