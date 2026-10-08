'use strict'
// B5.1 (أ) على SQL حقيقي: موديول «تخطيط الزيادات وسلّم الرواتب» مقفول افتراضيًا، وتقرير سلّم الرواتب (نطاق الدرجة ومنتصفه ونسبة المقارنة)
// بصلاحية عرض الرواتب وبنطاق فروع الحساب، وأساس المقارنة إعداد. قراءة بس. قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_salary_bands_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_salary_bands_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-salary-bands-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/compensation/salary-bands')
let master, app, ds, base, admin, modules, created = false, sequence = 0
const B = {}, G = {}, E = {}, U = {}
const repo = name => { assert.match(database, NAME); assert.equal(ds.options.database, database); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token(user) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const raw = await response.text(); return { status: response.status, body: raw ? JSON.parse(raw) : null }
}
const ok = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const employee = (branch, grade, basicSalary, extra = {}) => repo('Employee').save({ employeeCode: 'SB' + ++sequence, fullName: 'موظف السلّم ' + sequence, branchId: branch.id, gradeId: grade ? grade.id : null,
  joinDate: '2020-01-01', basicSalary, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'cash', ...extra })
const account = (label, branch, permissions) => repo('User').save({ email: `${label}@salary-bands.invalid`, displayName: label, passwordHash: 'test-only', role: 'employee', branchId: branch.id,
  permissions: JSON.stringify(permissions) })
const BANDS = '/compensation/bands'

before(async () => {
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true } }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  // مفيش رسالة بريد حقيقية بتطلع من الاختبار
  const { MailService } = require('../src/auth/mail.service')
  const mail = app.get(MailService)
  mail.isConfigured = () => false
  mail.send = async () => { throw new Error('no mail in tests') }
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1'); ds = app.get(require('../node_modules/typeorm').DataSource)
  assert.equal(ds.options.database, database)
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  modules = app.get(require('../src/modules-registry/modules.service').ModulesService)
  await app.get(require('../src/settings/config-defaults.service').ConfigDefaultsService).onApplicationBootstrap()
  B.one = await repo('Branch').save({ code: 'SB_1', name: 'فرع الرياض', country: 'SA' })
  B.two = await repo('Branch').save({ code: 'SB_2', name: 'فرع القاهرة', country: 'EG' })
  admin = await repo('User').save({ email: 'admin@salary-bands.invalid', displayName: 'Fixture admin', passwordHash: 'test-only', role: 'super_admin', scopeAllBranches: true, permissions: '[]' })
  G.third = await repo('Grade').save({ name: 'الدرجة الثالثة', minSalary: 5000, maxSalary: 9000, isActive: true })
  G.open = await repo('Grade').save({ name: 'درجة من غير نطاق', minSalary: null, maxSalary: null, isActive: true })
  E.below = await employee(B.one, G.third, 4000, { housingAllowance: 1500 })
  E.within = await employee(B.one, G.third, 7000)
  E.above = await employee(B.one, G.third, 9500)
  E.noBand = await employee(B.one, G.open, 6000)
  E.noGrade = await employee(B.one, null, 6000)
  E.other = await employee(B.two, G.third, 8000)
  await employee(B.one, G.third, 3000, { isActive: false, status: 'terminated' })
  U.payroll = await account('payroll', B.one, ['payroll.view'])
  U.manage = await account('manage', B.one, ['compensation.manage'])
  U.plain = await account('plain', B.one, ['employees.view'])
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

test('SB-01: الموديول مقفول افتراضيًا — تقرير السلّم مش متاح حتى لمدير النظام لحد ما يتفتح', async () => {
  assert.equal(await modules.isEnabled('compensation'), false)
  assert.notEqual((await request(admin, 'GET', BANDS)).status, 200)
  ok(await request(admin, 'PUT', '/modules/compensation', { enabled: true }), 200); modules.invalidate()
  assert.equal(ok(await request(admin, 'GET', BANDS), 200).basis, 'BASIC')
})

test('SB-02: سلّم الرواتب — نطاق الدرجة ومنتصفه، ونسبة المقارنة والموقع لكل موظف نشط، بصلاحية عرض الرواتب وبنطاق فروع الحساب', async () => {
  const all = ok(await request(admin, 'GET', BANDS), 200)
  assert.deepEqual([all.basis, all.basisLabel, all.withoutGrade], ['BASIC', rules.BAND_BASIS_LABELS.BASIC, 1])
  assert.deepEqual(all.grades.map(row => [row.name, row.band, row.headcount, row.below, row.above]),
    [['الدرجة الثالثة', { min: 5000, mid: 7000, max: 9000 }, 4, 1, 1], ['درجة من غير نطاق', null, 1, 0, 0]])
  const byId = rows => Object.fromEntries(rows.map(row => [row.employeeId, [row.salary, row.compaRatio, row.position, row.gradeName]]))
  assert.deepEqual(byId(all.employees), {
    [E.below.id]: [4000, 0.57, 'BELOW', 'الدرجة الثالثة'], [E.within.id]: [7000, 1, 'WITHIN', 'الدرجة الثالثة'], [E.above.id]: [9500, 1.36, 'ABOVE', 'الدرجة الثالثة'],
    [E.noBand.id]: [6000, null, null, 'درجة من غير نطاق'], [E.noGrade.id]: [6000, null, null, null], [E.other.id]: [8000, 1.14, 'WITHIN', 'الدرجة الثالثة'] })
  assert.equal(all.employees.find(row => row.employeeId === E.below.id).positionLabel, 'تحت الأدنى')
  // حساب الفرع: موظفين فرعه بس، وأعداد الدرجة من نطاقه (مفيش أعداد فروع تانية)
  const mine = ok(await request(U.payroll, 'GET', BANDS), 200)
  assert.deepEqual([mine.employees.map(row => row.employeeId).sort((a, b) => a - b), mine.grades[0].headcount], [[E.below.id, E.within.id, E.above.id, E.noBand.id, E.noGrade.id].sort((a, b) => a - b), 3])
  // الأرقام رواتب: إدارة الدورات لوحدها أو عرض الموظفين مايكفوش
  assert.deepEqual([(await request(U.manage, 'GET', BANDS)).status, (await request(U.plain, 'GET', BANDS)).status], [403, 403])
})

test('SB-03: أساس المقارنة إعداد — الإجمالي بيغيّر راتب المقارنة ونسبته، والتقرير قراءة بس', async () => {
  assert.equal((await request(admin, 'PATCH', '/settings/config', { key: rules.BAND_BASIS_KEY, value: 'NET' })).status, 400)
  ok(await request(admin, 'PATCH', '/settings/config', { key: rules.BAND_BASIS_KEY, value: 'GROSS' }), 200)
  const gross = ok(await request(admin, 'GET', BANDS), 200)
  const below = gross.employees.find(row => row.employeeId === E.below.id)
  assert.deepEqual([gross.basis, below.salary, below.compaRatio, below.position, gross.grades[0].below], ['GROSS', 5500, 0.79, 'WITHIN', 0])
  ok(await request(admin, 'PATCH', '/settings/config', { key: rules.BAND_BASIS_KEY, value: 'BASIC' }), 200)
  assert.equal(Number((await repo('Employee').findOneByOrFail({ id: E.below.id })).basicSalary), 4000)
})
