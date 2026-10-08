'use strict'
// B4.5 (ب) على SQL حقيقي: الحد القانوني لمعامل الإضافي من حزمة الدولة — الإعداد مقفول = معامل الشركة بالحرف (ونفس بصمة الأدلة)، ومفتوح = الأعلى
// من معامل الشركة والحد القانوني لدولة فرع الموظف، بلقطة الحد اللي اتطبق. التفعيل من مسار «حزمة الدولة» (مدير النظام + الصفوف «اتأكد»).
// قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_overtime_legal_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_overtime_legal_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-overtime-legal-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const calc = require('../src/statutory/statutory-calculators.service')
let master, app, ds, base, admin, attendance, created = false, sequence = 0
const B = {}, E = {}, D = {}
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, permissions: JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token(user) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const raw = await response.text(); return { status: response.status, body: raw ? JSON.parse(raw) : null }
}
const ok = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const employee = (branch, extra = {}) => repo('Employee').save({ employeeCode: 'OTL' + ++sequence, fullName: 'موظف حد الإضافي ' + sequence, branchId: branch.id, joinDate: '2020-01-01', status: 'active', isActive: true,
  basicSalary: 6000, housingAllowance: 2000, transportAllowance: 0, otherAllowance: 0, payMethod: 'cash', ...extra })
// الأدلة قراءة بس (مابتحفظش صفوف): المعامل ولقطة الحد القانوني وبصمة الأدلة
const evidenceOf = async (emp, date) => { const evidence = await attendance.overtimeEvidence(emp.id, date); return { multiplier: evidence.policy.multiplier, legal: evidence.policy.legalMinimum ?? null, kind: evidence.dayKind, fingerprint: evidence.fingerprint } }
const setCompany = (key, value) => request(admin, 'PATCH', '/settings/config', { key: `overtime.${key}`, value })
const verify = async key => {
  const pack = ok(await request(admin, 'GET', '/settings/statutory'), 200)
  for (const row of pack.keys.find(entry => entry.key === key).rows) if (!row.verified) ok(await request(admin, 'PATCH', `/settings/statutory/${row.id}`, { verified: true }), 200)
}
const enable = enabled => request(admin, 'PUT', '/settings/statutory/calculators/OVERTIME_LEGAL_MINIMUM', { enabled })

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
  attendance = app.get(require('../src/attendance/attendance.service').AttendanceService)
  B.eg = await repo('Branch').save({ code: 'OTL_EG', name: 'فرع القاهرة', country: 'EG' })
  B.sa = await repo('Branch').save({ code: 'OTL_SA', name: 'فرع الرياض', country: 'SA' })
  B.none = await repo('Branch').save({ code: 'OTL_NO', name: 'فرع من غير دولة' })
  admin = await repo('User').save({ email: 'admin@overtime-legal.invalid', displayName: 'Fixture admin', passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  E.eg = await employee(B.eg); E.sa = await employee(B.sa); E.none = await employee(B.none)
  // كل الأجر أساسي: الحد السعودي = 1 + 50% = 1.5
  E.saBasic = await employee(B.sa, { basicSalary: 8000, housingAllowance: 0 })
  // يوم عمل ويوم راحة من أسبوع واحد (بنوع اليوم من تقويم النظام نفسه)
  for (let day = 1; day <= 7 && !(D.weekday && D.weekend); day++) {
    const date = `2026-09-0${day}`, kind = (await evidenceOf(E.eg, date)).kind
    if (kind === 'WEEKDAY') D.weekday ??= date
    if (kind === 'WEEKEND') D.weekend ??= date
  }
  assert.ok(D.weekday && D.weekend, JSON.stringify(D))
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


test('P4A-F02: verified current rule enables historical unverified overtime pricing',async t=>{
 const old=await repo('StatutoryDefinition').findOneByOrFail({key:'eg.overtime',country:'EG'});assert.equal(old.verified,false)
 const values=Object.fromEntries((await repo('StatutoryValue').findBy({definitionId:old.id})).map(x=>[x.code,Number(x.value)]))
 ok(await request(admin,'POST','/settings/statutory',{country:'EG',key:old.key,effectiveFrom:'2026-10-01',values,verified:true}),201)
 await verify('sa.overtime');ok(await enable(true),200)
 const result=await evidenceOf(E.eg,D.weekend)
 assert.equal(result.multiplier,2);assert.equal(result.legal.verified,false)
 t.diagnostic(JSON.stringify({date:D.weekend,multiplier:result.multiplier,legalVerified:result.legal.verified,companyMultiplier:result.legal.companyMultiplier}))
})

