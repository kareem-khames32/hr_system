'use strict'
// SEC2 (خطة المراجعة الخطوة 9، البند الأخير): منح payroll.reopen/payroll.cancel/payroll.policy.manage/attendance_exemption.*
// لأدوار محددة بأقل امتياز بعد إغلاق 8-أ. ترحيلات المنح الثلاثة (016_c1، 017_b2، 019_sec2) تمر عبر المُرحّل المجمّع نفسه
// على قاعدة مؤقتة hr_sec2_roles_test_<16 hex> بحالة أدوار hr_system قبلها، ثم HTTP حقيقي بتوكنات صلاحياتها محلولة من الدور في القاعدة.
// Run: node --test --test-concurrency=1 api/test/security-role-grants.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(apiRoot, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const { ROLE_PRESETS, SUPER_ADMIN_ONLY_GRANTS } = require('../src/auth/permissions')
const database = `hr_sec2_roles_test_${crypto.randomBytes(8).toString('hex')}`
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-sec2-roles-'))
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-sec2-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const MIGRATIONS = path.join(repoRoot, 'docs/migrations/payroll')
const migrationFile = pattern => {
  const names = fs.readdirSync(MIGRATIONS).filter(name => pattern.test(name))
  assert.equal(names.length, 1, `ملف ترحيل واحد يطابق ${pattern}`)
  return names[0]
}
const FILES = [
  migrationFile(/^\d{8}_\d{3}_c1_attendance_exemption_roles\.sql$/),
  migrationFile(/^\d{8}_\d{3}_b2_policy_manage_decision_settings\.sql$/),
  migrationFile(/^\d{8}_\d{3}_sec2_payroll_state_role_grants\.sql$/),
]
const STATE = ['payroll.reopen', 'payroll.cancel']
const EXEMPTION = ['attendance_exemption.view', 'attendance_exemption.manage', 'attendance_exemption.approve', 'attendance_exemption.approve_executive']
const WATCHED = [...STATE, 'payroll.policy.manage', 'overtime.adjust', ...EXEMPTION]
// القرار الموثق في PAYROLL_DECISIONS_2026-09-14.md (القسم 11): ما يُضاف لكل دور، ولا شيء لغيرهما
const GRANTED = {
  hr_manager: ['attendance_exemption.view', 'attendance_exemption.manage', 'attendance_exemption.approve', 'payroll.policy.manage', 'payroll.reopen', 'payroll.cancel', 'overtime.adjust'],
  branch_manager: ['attendance_exemption.view', 'attendance_exemption.manage'],
}
const preset = code => ROLE_PRESETS.find(role => role.code === code).permissions
// حالة hr_system قبل المنح: حزم الكود بلا المفاتيح المراقبة (hr_manager 33 مفتاحًا وbranch_manager 11 وقت الكتابة)
const PRE = {
  super_admin: { nameAr: 'مدير النظام', isSystem: true, isActive: true, permissions: ['*'] },
  hr_manager: { nameAr: 'مدير الموارد البشرية', isSystem: true, isActive: true, permissions: preset('hr_manager').filter(p => !WATCHED.includes(p)) },
  branch_manager: { nameAr: 'مدير فرع', isSystem: true, isActive: true, permissions: preset('branch_manager').filter(p => !WATCHED.includes(p)) },
  employee: { nameAr: 'موظف', isSystem: true, isActive: true, permissions: [] },
  payroll_officer: { nameAr: 'مسؤول رواتب', isSystem: false, isActive: true, permissions: ['payroll.view', 'payroll.calculate', 'reports.view'] },
  pr_test_sec2: { nameAr: 'مسؤول رواتب', isSystem: false, isActive: false, permissions: ['payroll.view', 'payroll.calculate', 'reports.view'] },
}
let app, ds, master, pool, base_url, created = false, sequence = 0
let branchA, branchB, admin, hr, hr2, bm, officer, staff
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
const email = () => `sec2-${++sequence}-${crypto.randomBytes(3).toString('hex')}@sec2-test.example.com`

// نفس auth.service.login: الصلاحيات تُحل من الدور في القاعدة + التجاوزات، والإصدار من الحساب
async function login(user) {
  const row = await repo('User').findOneByOrFail({ id: user.id })
  const permissions = await app.get(require('../src/auth/auth.service').AuthService).resolvePermissions(row)
  const token = jwt.sign({ sub: row.id, email: row.email, role: row.role, branchId: row.branchId ?? null, employeeId: row.employeeId ?? null,
    permissions, tokenVersion: row.tokenVersion ?? 0 })
  return { row, permissions, token }
}
async function request(session, method, route, body) {
  const response = await fetch(base_url + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  let parsed = null
  try { parsed = text ? JSON.parse(text) : null } catch { parsed = text }
  return { status: response.status, body: parsed }
}
const expect = (r, status) => { assert.equal(r.status, status, JSON.stringify(r.body)); return r.body }
async function roleMap() {
  const rows = await ds.query('SELECT code, isActive, permissions FROM dbo.roles ORDER BY code')
  return Object.fromEntries(rows.map(row => [row.code, { isActive: row.isActive, permissions: JSON.parse(row.permissions) }]))
}
async function tokenVersions() {
  const rows = await ds.query('SELECT id, tokenVersion FROM dbo.users ORDER BY id')
  return Object.fromEntries(rows.map(row => [row.id, row.tokenVersion]))
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, migrate.DISPOSABLE_DATABASE); assert.match(database, /^hr_sec2_roles_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  const connection = db => ({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME || 'sa', password: env.DB_PASSWORD,
    database: db, options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 10000, requestTimeout: 120000 })
  master = await new sql.ConnectionPool(connection('master')).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: false, abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => {}
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => {}
  ds = app.get(require('../node_modules/typeorm').DataSource); assert.equal(ds.options.database, database)
  base_url = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  pool = await new sql.ConnectionPool(connection(database)).connect()

  fs.mkdirSync(path.join(base, 'payroll'), { recursive: true })
  for (const file of FILES) fs.copyFileSync(path.join(MIGRATIONS, file), path.join(base, 'payroll', file))

  branchA = await repo('Branch').save({ name: 'SEC2 branch 1', code: 'SEC2A' })
  branchB = await repo('Branch').save({ name: 'SEC2 branch 2', code: 'SEC2B' })
  for (const [code, role] of Object.entries(PRE)) {
    const existing = await repo('Role').findOneBy({ code })
    await repo('Role').save({ ...(existing ?? {}), code, nameAr: role.nameAr, isSystem: role.isSystem, isActive: role.isActive, permissions: JSON.stringify(role.permissions) })
  }
  const user = (name, role, branchId) => repo('User').save({ email: `${name}@sec2-fixture.example.com`, displayName: name, passwordHash: 'test-only',
    role, branchId, employeeId: null, permissions: JSON.stringify([]) })
  admin = await user('admin', 'super_admin', null)
  hr = await user('hrmanager', 'hr_manager', branchA.id)
  hr2 = await user('hrmanager2', 'hr_manager', branchB.id)
  bm = await user('branchmanager', 'branch_manager', branchA.id)
  officer = await user('payrollofficer', 'payroll_officer', branchA.id)
  staff = await user('staff', 'employee', branchA.id)
}, { timeout: 120000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (e) { errors.push(e) }
  try { if (pool) await pool.close() } catch (e) { errors.push(e) }
  try {
    if (created && master) {
      assert.match(database, /^hr_sec2_roles_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('db', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name=@db')).recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} removed.`)
    }
  } catch (e) { errors.push(e) }
  try { if (master) await master.close() } catch (e) { errors.push(e) }
  for (const dir of [base, uploads]) {
    try {
      assert.equal(path.dirname(path.resolve(dir)), os.tmpdir()); assert.match(path.basename(dir), /^hr-sec2-(roles|files)-/)
      fs.rmSync(dir, { recursive: true, force: true })
    } catch (e) { errors.push(e) }
  }
  if (errors.length) throw new AggregateError(errors, 'SEC2 fixture cleanup failed')
})

test('SEC2 migrations: least-privilege grants, append-only, sessions of changed roles only; replay and re-run change nothing', async () => {
  // الشرط: 8-أ مغلقة قبل المنح — الصلاحيات الحساسة لا يمنحها إلا مدير النظام
  for (const perm of [...STATE, 'overtime.adjust', 'attendance_exemption.approve', 'attendance_exemption.approve_executive']) assert.ok(SUPER_ADMIN_ONLY_GRANTS.includes(perm), perm)
  assert.ok(STATE.every(perm => preset('hr_manager').includes(perm)), 'حزمة hr_manager في الكود تضم إعادة الفتح والإلغاء')
  assert.ok(!preset('hr_manager').includes('attendance_exemption.approve_executive'))
  assert.ok(WATCHED.every(perm => !preset('branch_manager').includes(perm) || GRANTED.branch_manager.includes(perm)))

  const rolesBefore = await roleMap()
  const versionsBefore = await tokenVersions()
  const staleHr = await login(hr)
  expect(await request(staleHr, 'GET', '/attendance-exemptions'), 403) // قبل المنح: لا صلاحية عرض

  const record = await migrate.apply({ database, base, trial: true, schemaDiff: false, quiet: true })
  assert.equal(record.mode, 'disposable')
  assert.equal(record.failed, undefined, JSON.stringify(record.failed))
  assert.equal(record.trial?.passed, true)
  assert.deepEqual(record.applied.map(item => path.basename(item.file)), FILES)
  assert.equal(record.ledgerComplete, true)

  const roles = await roleMap()
  for (const code of Object.keys(PRE)) {
    const beforePerms = rolesBefore[code].permissions, afterPerms = roles[code].permissions
    assert.deepEqual(afterPerms.slice(0, beforePerms.length), beforePerms, `${code}: إضافة فقط بلا حذف أو إعادة ترتيب`)
    assert.equal(new Set(afterPerms).size, afterPerms.length, `${code}: بلا تكرار`)
    assert.deepEqual(afterPerms.slice(beforePerms.length).sort(), [...(GRANTED[code] ?? [])].sort(), `${code}: المفاتيح المضافة = القرار`)
    assert.equal(roles[code].isActive, PRE[code].isActive)
  }
  // أقل امتياز: الاعتماد التنفيذي لا يحمله دور، وإعادة الفتح/الإلغاء لـhr_manager وحده
  for (const [code, role] of Object.entries(roles)) {
    if (role.permissions.includes('*')) continue
    assert.ok(!role.permissions.includes('attendance_exemption.approve_executive'), code)
    if (code !== 'hr_manager') assert.ok(STATE.every(perm => !role.permissions.includes(perm)), code)
  }

  // الصلاحيات داخل التوكن: جلسات الدور الذي تغيّر تُبطل، وغيرها لا يُمس
  const versions = await tokenVersions()
  for (const user of [hr, hr2, bm]) assert.ok(versions[user.id] > versionsBefore[user.id], `tokenVersion ${user.email}`)
  for (const user of [admin, officer, staff]) assert.equal(versions[user.id], versionsBefore[user.id], `tokenVersion ${user.email}`)
  expect(await request(staleHr, 'GET', '/attendance-exemptions'), 401)
  expect(await request(await login(hr), 'GET', '/attendance-exemptions'), 200)

  // إعادة المُرحّل: لا ملف معلق، والدفتر كامل
  const replay = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.deepEqual(replay.pendingBefore, []); assert.deepEqual(replay.applied, []); assert.equal(replay.ledgerComplete, true)

  // إعادة تشغيل نص ترحيل SEC2 نفسه خارج الدفتر: لا تحديث ولا رفع لإصدار الجلسات
  const content = fs.readFileSync(path.join(MIGRATIONS, FILES[2]), 'utf8')
  for (const batch of migrate.splitBatches(content)) await pool.request().batch(batch)
  assert.deepEqual(await roleMap(), roles)
  assert.deepEqual(await tokenVersions(), versions)

  // الفحوص بعد التطبيق ترفض حالة تخالف القرار — كل محاولة داخل معاملة تُرجع
  const attempt = async (setup, number) => {
    const tx = new sql.Transaction(pool)
    await tx.begin()
    try {
      await new sql.Request(tx).batch(setup)
      if (number === null) await new sql.Request(tx).batch(content)
      else await assert.rejects(new sql.Request(tx).batch(content), error => { assert.equal(error.number, number, error.message); return true })
    } finally {
      try { await tx.rollback() } catch { /* المعاملة أُجهضت من الخادم بالفعل */ }
    }
    assert.deepEqual(await roleMap(), roles)
    assert.deepEqual(await tokenVersions(), versions)
  }
  await attempt("UPDATE dbo.roles SET permissions = N'not-json' WHERE code = N'hr_manager'", 53901)
  await attempt("UPDATE dbo.roles SET permissions = JSON_MODIFY(permissions, 'append $', N'payroll.reopen') WHERE code = N'payroll_officer'", 53903)
  await attempt("UPDATE dbo.roles SET permissions = JSON_MODIFY(permissions, 'append $', N'payroll.cancel') WHERE code = N'branch_manager'", 53903)
  await attempt("UPDATE dbo.roles SET permissions = JSON_MODIFY(permissions, 'append $', N'attendance_exemption.approve_executive') WHERE code = N'hr_manager'", 53903)
  // الدور المعطل لا يمنح شيئًا فلا يوقف الترحيل
  await attempt("UPDATE dbo.roles SET permissions = JSON_MODIFY(permissions, 'append $', N'payroll.reopen') WHERE code = N'pr_test_sec2'", null)
})

test('SEC2 HTTP: hr_manager reopens and cancels with a reason; payroll officer and branch manager cannot; executive exemption approval and re-granting stay with super_admin', async () => {
  const [hrS, bmS, officerS, adminS] = await Promise.all([hr, bm, officer, admin].map(login))
  for (const perm of GRANTED.hr_manager) assert.ok(hrS.permissions.includes(perm), perm)
  assert.ok(!hrS.permissions.includes('attendance_exemption.approve_executive'))
  for (const perm of WATCHED.filter(p => !GRANTED.branch_manager.includes(p))) assert.ok(!bmS.permissions.includes(perm), `branch_manager ${perm}`)
  for (const perm of WATCHED) assert.ok(!officerS.permissions.includes(perm), `payroll_officer ${perm}`)

  // إعادة فتح المسير المعتمد ثم إلغاء المسودة
  const run = await repo('PayrollRun').save({ name: 'مسير اختبار SEC2', scopeType: 'BRANCH', branchId: branchA.id, scopeIds: null, employeeIds: null,
    period: '2026-09', startDate: '2026-08-23', endDate: '2026-09-22', status: 'APPROVED', totalNet: 0, approvedBy: admin.id, approvedAt: new Date() })
  const reason = { reason: 'تصحيح بعد الاعتماد لاختبار SEC2' }
  for (const session of [officerS, bmS]) {
    expect(await request(session, 'POST', `/payroll/runs/${run.id}/reopen`, reason), 403)
    expect(await request(session, 'POST', `/payroll/runs/${run.id}/cancel`, reason), 403)
  }
  assert.equal((await repo('PayrollRun').findOneByOrFail({ id: run.id })).status, 'APPROVED')
  expect(await request(hrS, 'POST', `/payroll/runs/${run.id}/reopen`, { reason: '   ' }), 400)
  const reopened = expect(await request(hrS, 'POST', `/payroll/runs/${run.id}/reopen`, reason), 201)
  assert.equal(reopened.status, 'CALCULATED'); assert.equal(reopened.approvedBy, null)
  const cancelled = expect(await request(hrS, 'POST', `/payroll/runs/${run.id}/cancel`, reason), 201)
  assert.equal(cancelled.status, 'CANCELLED')
  const events = await repo('PayrollRunEvent').find({ where: { runId: run.id }, order: { id: 'ASC' } })
  assert.deepEqual(events.map(event => [event.eventType, event.actorUserId, event.reason]), [['REOPENED', hr.id, reason.reason], ['CANCELLED', hr.id, reason.reason]])

  // نشر السياسات: hr_manager يتجاوز بوابة الصلاحية (الجسم الفارغ يُرفض بالتحقق)، والباقون 403
  expect(await request(officerS, 'POST', '/payroll/policies', {}), 403)
  expect(await request(bmS, 'POST', '/payroll/policies', {}), 403)
  expect(await request(hrS, 'POST', '/payroll/policies', {}), 400)

  // استثناء الحضور: مدير الفرع يعرض ولا يعتمد، الموارد البشرية تعتمد، والتنفيذي لمدير النظام وحده
  const note = { reason: 'اعتماد اختبار SEC2' }
  expect(await request(bmS, 'GET', '/attendance-exemptions'), 200)
  expect(await request(officerS, 'GET', '/attendance-exemptions'), 403)
  expect(await request(bmS, 'POST', '/attendance-exemptions/99999999/approve', note), 403)
  expect(await request(hrS, 'POST', '/attendance-exemptions/99999999/approve', note), 404)
  expect(await request(hrS, 'POST', '/attendance-exemptions/99999999/approve-executive', note), 403)
  expect(await request(adminS, 'POST', '/attendance-exemptions/99999999/approve-executive', note), 404)

  // المنح للدور لا يفتح التمرير: hr_manager (users.manage) لا ينشئ حسابًا بدوره ولا يمنح أيًّا منها بتجاوز
  for (const body of [{ role: 'hr_manager' }, { role: 'employee', permissions: ['payroll.reopen'] }, { role: 'employee', permissions: ['payroll.cancel'] },
    { role: 'employee', permissions: ['attendance_exemption.approve_executive'] }, { role: 'employee', permissions: ['overtime.adjust'] }]) {
    const address = email()
    expect(await request(hrS, 'POST', '/users', { email: address, password: 'Sec2-test-only-pass', displayName: 'حساب اختبار', branchId: branchA.id, ...body }), 403)
    assert.equal(await repo('User').countBy({ email: address }), 0)
  }
  const plain = expect(await request(hrS, 'POST', '/users', { email: email(), password: 'Sec2-test-only-pass', displayName: 'حساب اختبار عادي', branchId: branchA.id, role: 'branch_manager' }), 201)
  expect(await request(hrS, 'PUT', `/users/${plain.id}/permissions`, { grants: ['payroll.reopen'] }), 403)
  assert.equal(await repo('UserPermissionOverride').countBy({ userId: plain.id }), 0)
})
