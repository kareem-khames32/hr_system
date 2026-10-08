'use strict'
// B4.6 (أ) على SQL حقيقي: تقرير نسبة السعودة لكل كيان قانوني سعودي (قراءة بس، لحساب بكل الفروع)، ونوعي مستند «رخصة عمل» و«توثيق العقد في قوى»
// في كتالوج المستندات (بيتبذروا وقت الإقلاع، وبياخدوا خانات المستند العادية). قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_saudization_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_saudization_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-saudization-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/payroll/saudization-report')
const { localDateOf } = require('../src/attendance/attendance.service')
let master, app, ds, base, admin, created = false, sequence = 0
const B = {}
const repo = name => { assert.match(database, NAME); assert.equal(ds.options.database, database); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token(user) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const raw = await response.text(); return { status: response.status, body: raw ? JSON.parse(raw) : null }
}
const ok = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const employee = (branch, nationality, extra = {}) => repo('Employee').save({ employeeCode: 'SZ' + ++sequence, fullName: 'موظف السعودة ' + sequence, branchId: branch.id, nationality,
  joinDate: '2020-01-01', basicSalary: 8000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'cash', ...extra })

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
  admin = await repo('User').save({ email: 'admin@saudization.invalid', displayName: 'Fixture admin', passwordHash: 'test-only', role: 'super_admin', scopeAllBranches: true, permissions: '[]' })
  B.riyadh = await repo('Branch').save({ code: 'SZ_RUH', name: 'فرع الرياض', country: 'SA' })
  B.jeddah = await repo('Branch').save({ code: 'SZ_JED', name: 'فرع جدة', country: 'SA' })
  B.free = await repo('Branch').save({ code: 'SZ_FREE', name: 'فرع الدمام', country: 'SA' })
  B.cairo = await repo('Branch').save({ code: 'SZ_CAI', name: 'فرع القاهرة', country: 'EG' })
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

test('SZ-01: نسبة السعودة لكل كيان قانوني سعودي — النشطين بس، وفروع مصر برّه، وفروع من غير كيان في مجموعة؛ ولحساب بكل الفروع بصلاحية الرواتب', async () => {
  const S = '/social-insurance/saudization'
  // من غير موظفين: تقرير فاضي
  assert.deepEqual(ok(await request(admin, 'GET', S), 200), { asOf: localDateOf(new Date()), entities: [] })
  // كيان للرياض وجدة مع بعض، والدمام من غير كيان
  const entity = ok(await request(admin, 'POST', '/settings/legal-entities', { name: 'شركة الاختبار السعودية', country: 'SA', currency: 'SAR' }), 201)
  const entityId = entity.id ?? entity.entity?.id ?? (await repo('LegalEntity').findOneByOrFail({ name: 'شركة الاختبار السعودية' })).id
  for (const branch of [B.riyadh, B.jeddah]) ok(await request(admin, 'PUT', `/settings/legal-entities/branches/${branch.id}`, { legalEntityId: entityId }), 200)
  await employee(B.riyadh, 'سعودي'); await employee(B.riyadh, 'سعودي'); await employee(B.riyadh, 'مصري')
  await employee(B.jeddah, 'سعودية'); await employee(B.jeddah, 'هندي'); await employee(B.jeddah, 'يمني', { status: 'probation' })
  await employee(B.jeddah, 'سعودي', { isActive: false, status: 'terminated' })
  await employee(B.free, 'سعودي'); await employee(B.free, null)
  await employee(B.cairo, 'سعودي'); await employee(B.cairo, 'مصري')
  const report = ok(await request(admin, 'GET', S), 200)
  assert.deepEqual(report.entities, [
    { entityId, name: 'شركة الاختبار السعودية', headcount: 6, saudis: 3, unknownNationality: 0, percent: 50 },
    { entityId: null, name: rules.SAUDIZATION_NO_ENTITY, headcount: 2, saudis: 1, unknownNationality: 1, percent: 50 }])
  // حساب فرع مايشوفش أعداد فروع تانية؛ ومن غير صلاحية الرواتب 403
  const viewer = (label, permissions) => repo('User').save({ email: `${label}@saudization.invalid`, displayName: label, passwordHash: 'test-only', role: 'hr_manager', branchId: B.riyadh.id,
    permissions: JSON.stringify(permissions) })
  const scoped = await request(await viewer('pay', ['payroll.view']), 'GET', S)
  assert.deepEqual([scoped.status, scoped.body.message], [403, rules.SAUDIZATION_COMPANY_ONLY])
  assert.equal((await request(await viewer('none', ['employees.view']), 'GET', S)).status, 403)
})

test('SZ-02: «رخصة عمل» و«توثيق العقد في قوى» في كتالوج المستندات بعد الإقلاع، وبيتسجّلوا على الموظف برقمهم وتاريخ انتهائهم', async () => {
  const types = await repo('DocType').find({ where: [{ code: 'work_permit' }, { code: 'qiwa_contract' }, { code: 'iqama' }], order: { code: 'ASC' } })
  assert.deepEqual(types.map(row => [row.code, row.nameAr, row.isActive]), [['iqama', 'إقامة', true], ['qiwa_contract', 'توثيق العقد في قوى', true], ['work_permit', 'رخصة عمل', true]])
  const emp = await employee(B.riyadh, 'مصري')
  const { assertDocTypes } = require('../src/assets/doc-types')
  await assertDocTypes(ds.manager, ['work_permit', 'qiwa_contract'], { activeOnly: true })
  const saved = await repo('EmployeeDocument').save({ employeeId: emp.id, docType: 'work_permit', number: 'WP-12345', issueDate: '2026-01-01', expiryDate: '2027-01-01' })
  const read = await repo('EmployeeDocument').findOneByOrFail({ id: saved.id })
  assert.deepEqual([read.docType, read.number, String(read.expiryDate).slice(0, 10)], ['work_permit', 'WP-12345', '2027-01-01'])
})
