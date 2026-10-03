'use strict'
// B2.1 على SQL حقيقي: سجل التدقيق المركزي — الفئات الست، وقبل وبعد (البنكي متخفي والمفاتيح الحساسة نجوم)، والـIP، والمعاملة اللي رجعت من غير سطر،
// والبحث بالصلاحية والنطاق والاحتفاظ. قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_audit_log_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_audit_log_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-audit-log-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let master, app, ds, base, created = false
const B = {}, U = {}, E = {}
const IBANS = ['SA0380000000608010167519', 'SA4420000001234567891234', 'SA1510000000000012345678']
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null,
  employeeId: user.employeeId ?? null, tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body, headers = {}) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token(user), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const raw = await response.text(); return { status: response.status, body: raw ? JSON.parse(raw) : null }
}
const ok = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const rows = (where, params = []) => ds.query(`SELECT * FROM [audit_log] WHERE ${where} ORDER BY [id]`, params)
const json = value => value == null ? null : JSON.parse(value)

before(async () => {
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true } }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1'); ds = app.get(require('../node_modules/typeorm').DataSource)
  assert.equal(ds.options.database, database)
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  B.a = await repo('Branch').save({ code: 'AU_A', name: 'فرع التدقيق أ' })
  B.b = await repo('Branch').save({ code: 'AU_B', name: 'فرع التدقيق ب' })
  const user = (email, role, branch, permissions) => repo('User').save({ email: `${email}@audit-log.invalid`, displayName: email, passwordHash: 'test-only',
    role, branchId: branch?.id ?? null, permissions: JSON.stringify(permissions) })
  U.admin = await user('admin', 'super_admin', null, ['*'])
  U.hrA = await user('hr-a', 'hr_manager', B.a, ['employees.view', 'employees.edit', 'payroll.view'])
  U.auditorA = await user('auditor-a', 'employee', B.a, ['audit.view'])
  U.plain = await user('plain', 'employee', B.a, [])
  const employee = (code, branch) => repo('Employee').save({ employeeCode: code, fullName: `موظف ${code}`, branchId: branch.id, joinDate: '2020-01-01',
    basicSalary: 9000, status: 'active', isActive: true, payMethod: 'transfer', iban: IBANS[0], bankName: 'البنك الأهلي' })
  E.a = await employee('AU-1', B.a)
  E.b = await employee('AU-2', B.b)
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

test('AU-01 (معيار الخطة): تغيير آيبان (قبل وبعد متخفيين)، وقفل وفتح موديول، وتصدير تقرير رواتب — التلاتة في السجل بمين والـIP', async () => {
  ok(await request(U.hrA, 'PATCH', `/employees/${E.a.id}`, { iban: IBANS[1] }), 200)
  const [bank] = await rows(`[category] = N'BANK_PAYROLL' AND [action] = N'BANK_CHANGED' AND [entityId] = @0`, [String(E.a.id)])
  assert.ok(bank, 'تغيير الآيبان في السجل')
  assert.deepEqual([json(bank.before).iban, json(bank.after).iban, bank.actorUserId, bank.branchId], [`****${IBANS[0].slice(-4)}`, `****${IBANS[1].slice(-4)}`, U.hrA.id, B.a.id])
  assert.equal(JSON.stringify(bank).includes(IBANS[1]), false, 'الآيبان كامل مايتسجلش')
  assert.ok(bank.ip, 'الـIP من الطلب')

  ok(await request(U.admin, 'PUT', '/modules/recruitment', { enabled: false }), 200)
  ok(await request(U.admin, 'PUT', '/modules/recruitment', { enabled: true }), 200)
  const modules = await rows(`[category] = N'SETTINGS' AND [entityType] = N'module' AND [entityId] = N'recruitment'`)
  assert.deepEqual(modules.map(row => [row.action, json(row.after).enabled, row.actorUserId]), [['MODULE_DISABLED', false, U.admin.id], ['MODULE_ENABLED', true, U.admin.id]])

  ok(await request(U.hrA, 'POST', '/audit/exports', { screen: '/payroll/reports', filename: 'payroll-2026-09.csv', rows: 12 }, { 'User-Agent': 'audit-test-agent' }), 201)
  const [exported] = await rows(`[category] = N'EXPORT' AND [actorUserId] = @0`, [U.hrA.id])
  assert.deepEqual([exported.action, json(exported.after), exported.branchId, exported.userAgent], ['SCREEN_EXPORT', { screen: '/payroll/reports', filename: 'payroll-2026-09.csv', rows: 12 }, B.a.id, 'audit-test-agent'])
  assert.equal((await request(U.hrA, 'POST', '/audit/exports', { screen: '', filename: 'x.csv', rows: 1 })).status, 400)
})

test('AU-02: الدخول، والإعداد بقيمته قبل وبعد (والمفتاح الحساس نجوم)، والدور بصلاحياته، ومنح الحساب، وحدث المسير — كلهم في السجل', async () => {
  const security = app.get(require('../src/auth/login-security.service').LoginSecurityService)
  await security.record({ userId: U.hrA.id, identifier: U.hrA.email, method: 'PASSWORD', outcome: 'BAD_PASSWORD', context: { ip: '10.9.8.7', userAgent: 'login-agent' } })
  const [login] = await rows(`[category] = N'LOGIN' AND [entityId] = @0`, [String(U.hrA.id)])
  assert.deepEqual([login.action, login.ip, login.userAgent, login.branchId], ['BAD_PASSWORD', '10.9.8.7', 'login-agent', B.a.id])

  ok(await request(U.admin, 'PATCH', '/settings/config', { key: 'audit.retention_months', value: '36' }), 200)
  const [retention] = await rows(`[action] = N'CONFIG_CHANGED' AND [entityId] = N'audit.retention_months'`)
  assert.deepEqual([json(retention.before).value, json(retention.after).value, retention.actorUserId, retention.branchId], ['24', '36', U.admin.id, null])
  ok(await request(U.admin, 'PATCH', '/settings/config', { key: 'attendance.device_key', value: crypto.randomBytes(24).toString('hex') }), 200)
  const [device] = await rows(`[action] = N'CONFIG_CHANGED' AND [entityId] = N'attendance.device_key'`)
  assert.deepEqual([json(device.after).value], ['***'], 'المفتاح الحساس مايتسجلش')

  const role = await repo('Role').save({ code: 'au_role', nameAr: 'دور تدقيق', permissions: JSON.stringify(['employees.view']), isActive: true })
  ok(await request(U.admin, 'PATCH', `/roles/${role.id}`, { permissions: ['employees.view', 'reports.view'] }), 200)
  const [roleRow] = await rows(`[action] = N'ROLE_UPDATED' AND [entityId] = N'au_role'`)
  assert.deepEqual([json(roleRow.before).permissions, json(roleRow.after).permissions], [['employees.view'], ['employees.view', 'reports.view']])

  ok(await request(U.admin, 'PUT', `/users/${U.plain.id}/permissions`, { grants: ['reports.view'], revokes: [] }), 200)
  const [grant] = await rows(`[action] = N'USER_PERMISSIONS_SET' AND [entityId] = @0`, [String(U.plain.id)])
  assert.deepEqual([json(grant.before), json(grant.after), grant.branchId], [{ grants: [], revokes: [] }, { grants: ['reports.view'], revokes: [] }, B.a.id])

  const run = await repo('PayrollRun').save({ name: 'مسير تدقيق', period: '2026-09', startDate: '2026-08-23', endDate: '2026-09-22', status: 'DRAFT', scopeType: 'BRANCH',
    scopeIds: JSON.stringify([B.a.id]), branchId: B.a.id })
  await repo('PayrollRunEvent').save({ runId: run.id, eventType: 'APPROVED', actorUserId: U.admin.id, reason: 'اعتماد تجربة', payload: { big: 'x'.repeat(5000) } })
  const [runEvent] = await rows(`[category] = N'PAYROLL' AND [entityId] = @0`, [String(run.id)])
  assert.deepEqual([runEvent.action, runEvent.branchId, runEvent.after], ['APPROVED', B.a.id, null], 'الحمولة مابتتنسخش')
})

test('AU-03: عملية رجعت (rollback) مالهاش سطر', async () => {
  const run = await repo('PayrollRun').save({ name: 'مسير رجوع', period: '2026-10', startDate: '2026-09-23', endDate: '2026-10-22', status: 'DRAFT', scopeType: 'COMPANY' })
  await assert.rejects(ds.transaction(async em => {
    await em.getRepository('PayrollRunEvent').save({ runId: run.id, eventType: 'CALCULATED', actorUserId: U.admin.id, reason: null, payload: null })
    assert.equal((await em.query(`SELECT COUNT(*) AS n FROM [audit_log] WHERE [entityId] = @0 AND [category] = N'PAYROLL'`, [String(run.id)]))[0].n, 1)
    throw new Error('rollback')
  }), /rollback/)
  assert.equal((await rows(`[category] = N'PAYROLL' AND [entityId] = @0`, [String(run.id)])).length, 0)
})

test('AU-04: البحث بصلاحية «سجل التدقيق» وبنطاق الفرع، والاحتفاظ: القديم في «منتهي الاحتفاظ» بس', async () => {
  // صلاحيات U.plain اتغيرت في AU-02 (tokenVersion زاد) — توكن جديد
  Object.assign(U.plain, await repo('User').findOneByOrFail({ id: U.plain.id }))
  assert.equal((await request(U.plain, 'GET', '/audit')).status, 403)
  ok(await request(U.hrA, 'PATCH', `/employees/${E.a.id}`, { iban: IBANS[2] }), 200)
  ok(await request(U.admin, 'PATCH', `/employees/${E.b.id}`, { iban: IBANS[1] }), 200)
  const company = ok(await request(U.admin, 'GET', '/audit?category=BANK_PAYROLL&pageSize=200'), 200)
  assert.deepEqual(new Set(company.rows.map(row => Number(row.entityId))), new Set([E.a.id, E.b.id]))
  const branch = ok(await request(U.auditorA, 'GET', '/audit?pageSize=200'), 200)
  assert.ok(branch.rows.length > 0)
  assert.ok(branch.rows.every(row => row.branchId === B.a.id), 'حساب الفرع بيشوف أحداث فرعه بس (ولا أحداث الشركة)')
  assert.equal(branch.rows.some(row => row.entityId === String(E.b.id) && row.category === 'BANK_PAYROLL'), false)
  assert.equal(branch.rows.some(row => row.category === 'SETTINGS'), false)
  const first = branch.rows.find(row => row.category === 'BANK_PAYROLL')
  assert.deepEqual([first.categoryLabel, typeof first.before, first.actorName], ['البيانات البنكية والرواتب', 'object', 'hr-a'])

  // حدث أقدم من مدة الاحتفاظ (36 شهر بعد AU-02) — مكتوب مباشرة لأن التطبيق مابيكتبش تاريخ قديم
  const old = new Date(); old.setMonth(old.getMonth() - 40)
  await ds.query(`INSERT [audit_log]([at],[category],[action],[entityType],[entityId],[actorUserId],[branchId],[summary])
    VALUES (@0, N'LOGIN', N'SUCCESS', N'user', @1, @1, @2, N'دخول قديم')`, [old, String(U.hrA.id), B.a.id])
  const current = ok(await request(U.admin, 'GET', '/audit?q=' + encodeURIComponent('دخول قديم')), 200)
  assert.equal(current.total, 0)
  const expired = ok(await request(U.admin, 'GET', '/audit?expired=true&q=' + encodeURIComponent('دخول قديم')), 200)
  assert.deepEqual([expired.total, expired.expired, expired.retentionMonths], [1, true, 36])
  assert.equal((await request(U.admin, 'GET', '/audit?category=NOPE')).status, 400)
})
