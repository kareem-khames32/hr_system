'use strict'
// B5.9 على SQL حقيقي: بانِي التقارير — الميزة الفرعية مقفولة افتراضيًا، ترحيل 175، القاموس بصلاحيات القارئ، التشغيل بنطاق فرع الموظف الحالي وبصلاحية
// الحقل (عرضًا وفلترًا)، القيم معاملات، الطلبات السرّية برّه، والحفظ والمشاركة بأدوار بصلاحيات القارئ هو. قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const migrate = require('../scripts/db-migrate.cjs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_report_builder_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_report_builder_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-report-builder-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/reports/report-builder')
const MIGRATION = path.resolve(apiRoot, '..', 'docs', 'migrations', 'payroll', '20261010_175_report_definitions.sql')
let master, pool, app, ds, base, modules, created = false, sequence = 0
const B = {}, E = {}, U = {}, R = {}
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
const employee = (name, branch, extra = {}) => repo('Employee').save({ employeeCode: 'RB' + ++sequence, fullName: name, branchId: branch.id, joinDate: '2020-01-01',
  basicSalary: 5000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'cash', ...extra })
const account = (label, branch, role, permissions) => repo('User').save({ email: `${label}@report-builder.invalid`, displayName: 'حساب ' + label, passwordHash: 'test-only', role, branchId: branch.id,
  permissions: JSON.stringify(permissions), isActive: true })
const runMigration = async () => { assert.match(database, NAME); for (const batch of migrate.splitBatches(fs.readFileSync(MIGRATION, 'utf8').replace(/\r\n/g, '\n'))) await pool.request().batch(batch) }
const P = '/reports/builder'
const run = (user, definition) => request(user, 'POST', `${P}/run`, definition)
const save = (user, body, id) => request(user, id ? 'PATCH' : 'POST', id ? `${P}/saved/${id}` : `${P}/saved`, body)
const runSaved = (user, id) => request(user, 'GET', `${P}/saved/${id}/run`)
const people = (columns, extra = {}) => ({ source: 'employees', columns, ...extra })
const READER = ['reports.view', 'reports.save', 'employees.view', 'attendance.view_all', 'leaves.view_all', 'requests.view_all']

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
  B.riyadh = await repo('Branch').save({ code: 'RB_1', name: 'فرع الرياض', country: 'SA' })
  B.cairo = await repo('Branch').save({ code: 'RB_2', name: 'فرع القاهرة', country: 'EG' })
  for (const [code, nameAr, isActive] of [['rb_lead', 'مسؤول تقارير', true], ['rb_analyst', 'محلل', true], ['rb_off', 'دور مقفول', false]]) await repo('Role').save({ code, nameAr, permissions: '[]', isSystem: false, isActive })
  U.admin = await repo('User').save({ email: 'admin@report-builder.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', scopeAllBranches: true, permissions: '[]', isActive: true })
  E.a = await employee('موظف أ', B.riyadh, { jobTitle: 'محاسب' }); E.b = await employee('موظف ب', B.riyadh, { jobTitle: 'مهندس', joinDate: '2022-05-01', basicSalary: 7000 })
  E.c = await employee('موظف ج', B.cairo, { jobTitle: 'محاسب', basicSalary: 4000 })
  U.rep = await account('rep', B.riyadh, 'rb_lead', READER); U.pay = await account('pay', B.riyadh, 'rb_analyst', ['reports.view', 'reports.save', 'employees.view', 'payroll.view'])
  U.viewer = await account('viewer', B.riyadh, 'rb_analyst', ['reports.view', 'employees.view']); U.cairo = await account('cairo', B.cairo, 'rb_analyst', ['reports.view', 'reports.save', 'employees.view'])
  U.bare = await account('bare', B.riyadh, 'rb_analyst', ['reports.view']); U.none = await account('none', B.riyadh, 'rb_analyst', ['employees.view', 'reports.save'])
  const day = (who, date, status, workMinutes, lateMinutes) => repo('AttendanceDay').save({ employeeId: who.id, branchId: who.branchId, date, shiftName: 'عام', shiftStart: '08:00', shiftEnd: '17:00', status, workMinutes, lateMinutes })
  await day(E.a, '2026-09-01', 'present', 480, 0); await day(E.a, '2026-09-02', 'late', 450, 30); await day(E.c, '2026-09-01', 'absent', 0, 0)
  await repo('Leave').save({ employeeId: E.a.id, leaveTypeCode: 'sick', fromDate: '2026-09-10', toDate: '2026-09-12', days: 3, period: 'FULL', isUnpaid: false, status: 'APPROVED' })
  await repo('Leave').save({ employeeId: E.c.id, leaveTypeCode: 'annual', fromDate: '2026-09-10', toDate: '2026-09-11', days: 2, period: 'FULL', isUnpaid: false, status: 'APPROVED' })
  for (const [code, nameAr, isConfidential] of [['RB_OPEN', 'طلب عادي للبانِي', false], ['RB_SECRET', 'طلب سري للبانِي', true]]) {
    await pool.request().query(`DELETE FROM dbo.request_types WHERE [code] = N'${code}'`)
    await repo('RequestType').save({ code, nameAr, category: 'OTHER', destinationHandler: 'record_only', isConfidential })
  }
  await repo('Request').save({ typeCode: 'RB_OPEN', requesterId: E.a.id, createdByUserId: U.admin.id, branchId: B.riyadh.id, status: 'PENDING' })
  await repo('Request').save({ typeCode: 'RB_SECRET', requesterId: E.a.id, createdByUserId: U.admin.id, branchId: B.riyadh.id, status: 'PENDING' })
  await repo('Request').save({ typeCode: 'RB_OPEN', requesterId: E.c.id, createdByUserId: U.admin.id, branchId: B.cairo.id, status: 'COMPLETED' })
  const paid = await repo('PayrollRun').save({ period: '2026-09', startDate: '2026-08-23', endDate: '2026-09-22', status: 'APPROVED', branchId: B.riyadh.id, name: 'مسير سبتمبر' })
  const draft = await repo('PayrollRun').save({ period: '2026-10', startDate: '2026-09-23', endDate: '2026-10-22', status: 'DRAFT', branchId: B.riyadh.id, name: 'مسير أكتوبر' })
  await repo('PayrollItem').save({ runId: paid.id, employeeId: E.a.id, basicSalary: 5000, netPay: 4800.5, payMethod: 'cash' })
  await repo('PayrollItem').save({ runId: draft.id, employeeId: E.a.id, basicSalary: 5000, netPay: 5000, payMethod: 'cash' })
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


test('P5A-R01: confidential definition is still included by builder',async t=>{
 ok(await request(U.admin,'PUT','/modules/features/'+rules.REPORT_BUILDER_FEATURE,{enabled:true})); modules.invalidate()
 await repo('RequestType').save({code:'LEAVE',nameAr:'Public leave umbrella',category:'leave',destinationHandler:'leave_no_balance',isConfidential:false,isActive:true})
 await repo('RequestType').update({code:'RB_SECRET'},{destinationHandler:'leave_no_balance',category:'leave',isActive:true,requiredFields:JSON.stringify(['leaveTypeCode','leaveType','fromDate','toDate'])})
 const self=await account('self',B.riyadh,'employee',[]);self.employeeId=E.a.id;await repo('User').update(self.id,{employeeId:E.a.id})
 const row=ok(await request(self,'POST','/requests',{typeCode:'LEAVE',definitionCode:'RB_SECRET',payload:{leaveTypeCode:'annual',fromDate:'2026-09-10',toDate:'2026-09-11'},submit:false}),201)
 assert.equal((await repo('Request').findOneByOrFail({id:row.id})).definitionCode,'RB_SECRET')
 const result=ok(await run(U.rep,{source:'requests',columns:['fullName','typeName','status'],filters:[{column:'status',op:'eq',value:'DRAFT'}]}),201)
 assert.equal(result.rows.length,1);assert.equal(result.rows[0][0],E.a.fullName)
 t.diagnostic(JSON.stringify({id:'P5A-R01',confidentialDefinition:true,exportedRows:result.rows.length}))
})
