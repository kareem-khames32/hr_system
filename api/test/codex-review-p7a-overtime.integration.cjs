// B-ADD.2: فترة الإضافي بجمهور (الاستهداف الموحد) — فترة لفريق واحد مابتفتحش الإضافي لحد برّه الفريق، والإدارة بتشمل اللي تحتها،
// و«الكل ماعدا…»، ونطاق حساب الفروع، والفترات من غير جمهور زي ما هي، وقبل الترحيل 186 مفيش جماهير؛ وملف الترحيل نفسه على جدول الكيان.
// HTTP وSQL فعليان في قاعدة اختبار عشوائية تُحذف بعد الانتهاء. ولا رسالة بريد حقيقية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_otaudience_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-otaudience-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const MIGRATION = path.join(apiRoot, '..', 'docs/migrations/payroll/20261011_186_overtime_period_audiences.sql')
let app, ds, master, base, attendance, created = false
const U = {}, E = {}, B = {}, D = {}, T = {}
const DAY = '2026-03-10', FROM = '2026-03-01', TO = '2026-03-31'

const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
const query = (text, params) => { assert.equal(ds.options.database, database); return ds.query(text, params) }
const claims = user => ({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, ...(user.scopeAllBranches === true ? { scopeAllBranches: true } : {}),
  permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function call(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt.sign(claims(user))}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const expect = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body ?? null).slice(0, 400)); return response.body }
const messageOf = response => [].concat(response.body?.message ?? []).join('، ')
const period = (name, effect, extra = {}) => ({ name, fromDate: FROM, toDate: TO, effect, ...extra })
const make = async (user, body) => expect(await call(user, 'POST', '/attendance/overtime-periods', body), 201)
const open = key => attendance.isOvertimeOpen(DAY, E[key].branchId, E[key].id)
const openFor = async (...keys) => Object.fromEntries(await Promise.all(keys.map(async key => [key, await open(key)])))
const ALL = ['retail1', 'retail2', 'wholesale1', 'salesHead', 'accounts1', 'b1']
const setting = async (key, value) => {
  const configs = repo('RequestsConfig'), found = await configs.findOne({ where: { key } })
  await configs.save({ ...(found ?? {}), key, value })
}
const clear = async () => { await query('DELETE FROM [overtime_period_audiences]'); await query('DELETE FROM [overtime_periods]') }
const batches = () => fs.readFileSync(MIGRATION, 'utf8').replace(/\r\n/g, '\n').split(/^\s*GO\s*$/m).map(part => part.trim()).filter(Boolean)
const migrate = async () => { for (const batch of batches()) await query(batch) }
test('P7A-O01: updating an overtime audience needs a second pooled connection while holding its transaction', async t => {
  const row = await make(U.hr, period('P7A pool', 'OPEN', { audience: { level: 'teams', branchId: B.a.id, teamIds: [T.shop.id] } }));
  const { EntityManager } = require('../node_modules/typeorm');
  const original = EntityManager.prototype.getRepository;
  let externalReads = 0, inTransaction = false;
  const manager = attendance.overtimePeriods.manager, tx = manager.transaction;
  manager.transaction = function(...args) { const cb = args.pop(); return tx.call(this, ...args, async em => { inTransaction = true; try { return await cb(em); } finally { inTransaction = false; } }); };
  EntityManager.prototype.getRepository = function(target) {
    if (inTransaction && this.connection === ds && !this.queryRunner?.isTransactionActive && (target.name || target) === 'OvertimePeriodAudience') externalReads++;
    return original.call(this, target);
  };
  try {
    expect(await call(U.hr, 'PATCH', `/attendance/overtime-periods/${row.id}`, { name: 'P7A renamed' }), 200);
    assert.ok(externalReads > 0);
    t.diagnostic(JSON.stringify({ case: 'P7A-O01', externalAudienceReadsInsideTransaction: externalReads }));
  } finally { EntityManager.prototype.getRepository = original; manager.transaction = tx; await clear(); }
});
test('P7A-O02: ten concurrent overtime updates exhaust the pool on the new audience reader', async t => {
  const ids = [];
  for (let n = 0; n < 10; n++) ids.push((await make(U.hr, period('P7A pool ' + n, 'OPEN', { branchId: B.a.id }))).id);
  // Warm the readiness probe outside all transactions, matching normal deployment.
  await attendance.listOvertimePeriods(claims(U.hr));
  const original = attendance.overtimePeriodAudiences, pool = ds.driver.master.pool, previous = pool.acquireTimeoutMillis;
  let enter = 0, release;
  const gate = new Promise(resolve => { release = resolve; }), pending = [];
  pool.acquireTimeoutMillis = 1500;
  attendance.overtimePeriodAudiences = async function(...args) { enter++; await gate; return original.apply(this, args); };
  try {
    for (let n = 0; n < 10; n++) {
      pending.push(call(U.hr, 'PATCH', `/attendance/overtime-periods/${ids[n]}`, { name: 'P7A edit ' + n }));
      const until = Date.now() + 6000;
      while (enter < n + 1 && Date.now() < until) await new Promise(resolve => setTimeout(resolve, 10));
      assert.equal(enter, n + 1);
    }
    assert.equal(pool.numUsed(), 10); assert.equal(pool.numFree(), 0);
    release();
    const responses = await Promise.all(pending);
    assert.ok(responses.some(row => row.status === 500), 'Defect: a transaction-bound read would succeed with the same held pool');
    t.diagnostic(JSON.stringify({ case: 'P7A-O02', occupied: 10, statuses: responses.map(row => row.status) }));
  } finally { release(); await Promise.allSettled(pending); attendance.overtimePeriodAudiences = original; pool.acquireTimeoutMillis = previous; await clear(); }
}, { timeout: 30000 });

test('P7A-O03: overtime list exposes a team current name after its department changes branch', async t => {
  const made = await make(U.hrA, period('P7A reference', 'OPEN', { audience: { level: 'teams', branchId: B.a.id, teamIds: [T.shop.id] } }));
  try {
    await repo('Team').update({ id: T.shop.id }, { departmentId: D.other.id, name: 'P7A private team in B' });
    const rows = expect(await call(U.hrA, 'GET', '/attendance/overtime-periods'), 200);
    assert.ok(rows.find(row => row.id === made.id).audienceText.includes('P7A private team in B'));
    t.diagnostic(JSON.stringify({ case: 'P7A-O03', foreignTeamNameDisclosed: true }));
  } finally { await repo('Team').update({ id: T.shop.id }, { departmentId: D.retail.id, name: T.shop.name }); await clear(); }
});

test('P7A-O04 control: ten audience reads using their already-held transaction do not exhaust the pool', async t => {
  const { AsyncLocalStorage } = require('node:async_hooks');
  const local = new AsyncLocalStorage(), ids = [];
  for (let n = 0; n < 10; n++) ids.push((await make(U.hr, period('P7A bound ' + n, 'OPEN', { branchId: B.a.id }))).id);
  await attendance.listOvertimePeriods(claims(U.hr));
  const original = attendance.overtimePeriodAudiences, manager = attendance.overtimePeriods.manager, tx = manager.transaction;
  const pool = ds.driver.master.pool, previous = pool.acquireTimeoutMillis;
  let enter = 0, release; const gate = new Promise(resolve => { release = resolve; }), pending = [];
  pool.acquireTimeoutMillis = 1500;
  manager.transaction = function(...args) { const cb = args.pop(); return tx.call(this, ...args, em => local.run(em, () => cb(em))); };
  attendance.overtimePeriodAudiences = async function(...args) {
    const em = local.getStore(); if (!em) return original.apply(this, args);
    enter++; await gate;
    const scoped = Object.create(this); scoped.overtimePeriods = em.getRepository(this.overtimePeriods.target);
    return original.apply(scoped, args);
  };
  try {
    for (let n = 0; n < 10; n++) {
      pending.push(call(U.hr, 'PATCH', `/attendance/overtime-periods/${ids[n]}`, { name: 'P7A bound edit ' + n }));
      const until = Date.now() + 6000;
      while (enter < n + 1 && Date.now() < until) await new Promise(resolve => setTimeout(resolve, 10));
      assert.equal(enter, n + 1);
    }
    assert.equal(pool.numUsed(), 10); release();
    const responses = await Promise.all(pending); assert.deepEqual(responses.map(row => row.status), Array(10).fill(200));
    t.diagnostic(JSON.stringify({ case: 'P7A-O04', occupied: 10, statuses: responses.map(row => row.status) }));
  } finally { release(); await Promise.allSettled(pending); manager.transaction = tx; attendance.overtimePeriodAudiences = original; pool.acquireTimeoutMillis = previous; await clear(); }
}, { timeout: 30000 });

test('P7A-M01 control: migration 186 rejects an unexpected column before changing the table', async t => {
  await clear(); await migrate(); await migrate();
  await query('ALTER TABLE [overtime_period_audiences] ADD [p7aUnexpected] int NULL');
  try {
    await assert.rejects(migrate);
    assert.notEqual((await query("SELECT COL_LENGTH('overtime_period_audiences','p7aUnexpected') AS n"))[0].n, null);
  } finally { await query('ALTER TABLE [overtime_period_audiences] DROP COLUMN [p7aUnexpected]'); }
  await migrate();
  t.diagnostic(JSON.stringify({ case: 'P7A-M01', rejectsWrongShapeWithoutRepairingIt: true }));
});

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql'); assert.match(database, /^hr_otaudience_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads,
    FRONTEND_URL: 'https://hr.example.invalid' })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  const { MailService } = require('../src/auth/mail.service')
  const mail = app.get(MailService)
  mail.isConfigured = () => false
  mail.send = async () => { throw new Error('no mail from tests') }
  assert.notEqual(mail.send, MailService.prototype.send)
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => {}
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => {}
  ds = app.get(require('../node_modules/typeorm').DataSource); assert.equal(ds.options.database, database)
  attendance = app.get(require('../src/attendance/attendance.service').AttendanceService)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  B.a = await repo('Branch').save({ code: 'OTA', name: 'فرع الإضافي أ', country: 'EG', weekendDays: 'FRI' })
  B.b = await repo('Branch').save({ code: 'OTB', name: 'فرع الإضافي ب', country: 'EG', weekendDays: 'FRI' })
  const unit = async (key, branch, name, extra = {}) => { D[key] = await repo('Department').save({ branchId: branch.id, name, unitType: 'DEPARTMENT', ...extra }) }
  await unit('sales', B.a, 'إدارة المبيعات', { unitType: 'ADMINISTRATION' })
  await unit('retail', B.a, 'قسم التجزئة', { parentId: D.sales.id })
  await unit('wholesale', B.a, 'قسم الجملة', { parentId: D.sales.id })
  await unit('accounts', B.a, 'قسم الحسابات')
  await unit('other', B.b, 'قسم فرع ب')
  T.shop = await repo('Team').save({ name: 'فريق المحل', departmentId: D.retail.id })
  let n = 0
  const employee = async (key, branch, extra = {}) => { E[key] = await repo('Employee').save({ employeeCode: `OT${String(++n).padStart(3, '0')}`, fullName: `موظف إضافي ${key}`,
    branchId: branch.id, status: 'active', isActive: true, joinDate: '2024-01-01', ...extra }) }
  await employee('retail1', B.a, { departmentId: D.retail.id, teamId: T.shop.id })
  await employee('retail2', B.a, { departmentId: D.retail.id })
  await employee('wholesale1', B.a, { departmentId: D.wholesale.id })
  await employee('salesHead', B.a, { departmentId: D.sales.id })
  await employee('accounts1', B.a, { departmentId: D.accounts.id })
  await employee('b1', B.b, { departmentId: D.other.id })
  const account = (key, role, permissions, extra = {}) => repo('User').save({ email: `${key}@otaudience.invalid`, displayName: `حساب ${key}`, passwordHash: 'test-only',
    role, permissions: JSON.stringify(permissions), isActive: true, ...extra }).then(saved => { U[key] = saved })
  await account('admin', 'super_admin', ['*'])
  await account('hr', 'employee', ['attendance.manage'], { scopeAllBranches: true })
  await account('hrA', 'employee', ['attendance.manage'], { branchId: B.a.id })
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_otaudience_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('db', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name=@db')).recordset.length, 0)
      t.diagnostic(`تحقق حذف قاعدة الاختبار: ${database}`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir())); assert.match(path.basename(uploads), /^hr-otaudience-files-/)
    fs.rmSync(uploads, { recursive: true, force: true }); assert.equal(fs.existsSync(uploads), false)
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'تعذر تنظيف بيئة اختبار جمهور فترة الإضافي')
})

test('OTA-01: an open period for one team opens overtime for that team only; whoever is outside it is judged as if the period did not exist', async () => {
  // ملف الترحيل على جدول الكيان (اللي synchronize عمله): نفس الشكل = مفيش رفض، ومرتين (آمن للتكرار)
  await migrate(); await migrate()
  await setting('overtime.enabled', 'false')
  assert.deepEqual(await openFor(...ALL), { retail1: false, retail2: false, wholesale1: false, salesHead: false, accounts1: false, b1: false }, 'الإعداد العام مقفول ومفيش فترات')
  const made = await make(U.hr, period('إضافي فريق المحل', 'OPEN', { audience: { level: 'teams', branchId: B.a.id, teamIds: [T.shop.id] } }))
  assert.deepEqual([made.branchId, made.audience], [B.a.id, { level: 'teams', branchId: B.a.id, teamIds: [T.shop.id] }])
  assert.deepEqual(await openFor(...ALL), { retail1: true, retail2: false, wholesale1: false, salesHead: false, accounts1: false, b1: false })
  // من غير موظف (سؤال عن الفرع كله): فترة الفريق مابتفتحش الفرع
  assert.equal(await attendance.isOvertimeOpen(DAY, B.a.id), false)
  const listed = expect(await call(U.hr, 'GET', '/attendance/overtime-periods'), 200)
  assert.deepEqual(listed.map(row => [row.id, row.audienceText, row.audienceInvalid]), [[made.id, 'فرع الإضافي أ — فريق المحل', false]])
  await clear()
})

test('OTA-02: an administration covers the departments under it, the excluded employee stays out, and a closed period closes for its audience only', async () => {
  await setting('overtime.enabled', 'false')
  const sales = await make(U.hr, period('إضافي إدارة المبيعات', 'OPEN', { autoApprove: true,
    audience: { level: 'departments', branchId: B.a.id, departmentIds: [D.sales.id], excludeEmployeeIds: [E.retail2.id] } }))
  assert.deepEqual(await openFor(...ALL), { retail1: true, retail2: false, wholesale1: true, salesHead: true, accounts1: false, b1: false })
  assert.equal(expect(await call(U.hr, 'GET', '/attendance/overtime-periods'), 200)[0].audienceText, 'فرع الإضافي أ — قسم إدارة المبيعات (ماعدا موظف واحد)')
  // تعديل الجمهور لقسم واحد: اللي برّه القسم رجع مقفول
  const narrowed = expect(await call(U.hr, 'PATCH', `/attendance/overtime-periods/${sales.id}`, { audience: { level: 'departments', branchId: B.a.id, departmentIds: [D.wholesale.id] } }), 200)
  assert.equal(typeof narrowed.recompute?.recomputed, 'number', 'تغيير الجمهور بيعيد حساب أيام الفترة')
  assert.deepEqual(await openFor(...ALL), { retail1: false, retail2: false, wholesale1: true, salesHead: false, accounts1: false, b1: false })
  // شيل الجمهور (null) = الفترة لفرعها كله زي زمان
  expect(await call(U.hr, 'PATCH', `/attendance/overtime-periods/${sales.id}`, { audience: null }), 200)
  assert.deepEqual([await openFor(...ALL), Number((await query('SELECT COUNT(*) AS [n] FROM [overtime_period_audiences]'))[0].n)],
    [{ retail1: true, retail2: true, wholesale1: true, salesHead: true, accounts1: true, b1: false }, 0])
  await clear()
  // المقفولة لجمهور: الإعداد العام مفتوح، والقفل على موظفين بالاسم بس
  await setting('overtime.enabled', 'true')
  await make(U.hr, period('قفل لاتنين', 'CLOSED', { audience: { level: 'employees', branchId: B.a.id, employeeIds: [E.accounts1.id, E.retail1.id] } }))
  assert.deepEqual(await openFor(...ALL), { retail1: false, retail2: true, wholesale1: true, salesHead: true, accounts1: false, b1: true })
  await clear()
})

test('OTA-03: a branch account sets an audience inside its branches only; wrong ids and a company-wide exclusion are refused; periods without an audience are as before', async () => {
  await setting('overtime.enabled', 'false')
  const mine = await make(U.hrA, period('من حساب الفرع', 'OPEN', { audience: { level: 'departments', branchId: B.a.id, departmentIds: [D.accounts.id] } }))
  assert.equal(await open('accounts1'), true)
  expect(await call(U.hrA, 'POST', '/attendance/overtime-periods', period('فرع تاني', 'OPEN', { audience: { level: 'branch', branchId: B.b.id, excludeEmployeeIds: [E.b1.id] } })), 403)
  const foreign = await call(U.hr, 'POST', '/attendance/overtime-periods', period('قسم مش تبع الفرع', 'OPEN', { audience: { level: 'departments', branchId: B.b.id, departmentIds: [D.sales.id] } }))
  assert.deepEqual([foreign.status, /مش موجود أو مش تبع الفرع/.test(messageOf(foreign))], [400, true])
  const wide = await call(U.hr, 'POST', '/attendance/overtime-periods', period('الكل ماعدا', 'OPEN', { audience: { level: 'company', excludeEmployeeIds: [E.b1.id] } }))
  assert.deepEqual([wide.status, /اختار فرع/.test(messageOf(wide))], [400, true])
  const renamed = await call(U.hr, 'POST', '/attendance/overtime-periods', period('من غير فرع', 'OPEN', { audience: { level: 'teams', teamIds: [T.shop.id] } }))
  assert.deepEqual([renamed.status, /فترة الإضافي/.test(messageOf(renamed)), /العطلة/.test(messageOf(renamed))], [400, true, false])
  expect(await call(U.hr, 'POST', '/attendance/overtime-periods', period('مستثنى مش موجود', 'OPEN', { audience: { level: 'branch', branchId: B.a.id, excludeEmployeeIds: [999999] } })), 400)
  assert.equal(Number((await query('SELECT COUNT(*) AS [n] FROM [overtime_periods]'))[0].n), 1, 'المرفوض ماكتبش فترة')
  // تغيير فرع فترة ليها جمهور من غير الجمهور مرفوض
  const moved = await call(U.hr, 'PATCH', `/attendance/overtime-periods/${mine.id}`, { branchId: B.b.id })
  assert.deepEqual([moved.status, /جمهور من فرع تاني/.test(messageOf(moved))], [400, true])
  // الحذف بيشيل الجمهور
  expect(await call(U.hrA, 'DELETE', `/attendance/overtime-periods/${mine.id}`), 200)
  assert.equal(Number((await query('SELECT COUNT(*) AS [n] FROM [overtime_period_audiences]'))[0].n), 0)
  // فترة من غير جمهور: فرعها كله؛ وفترة كل الفروع: الكل — زي زمان
  await make(U.hr, period('فرع ب كله', 'OPEN', { branchId: B.b.id }))
  assert.deepEqual(await openFor(...ALL), { retail1: false, retail2: false, wholesale1: false, salesHead: false, accounts1: false, b1: true })
  await make(U.hr, period('كل الفروع', 'OPEN'))
  assert.deepEqual(await openFor(...ALL), { retail1: true, retail2: true, wholesale1: true, salesHead: true, accounts1: true, b1: true })
  assert.equal(Number((await query('SELECT COUNT(*) AS [n] FROM [overtime_period_audiences]'))[0].n), 0)
  await clear()
})

test('OTA-04: a damaged audience never opens overtime, and before migration 186 periods behave as before and an audience is refused', async () => {
  await setting('overtime.enabled', 'false')
  const team = await make(U.hr, period('فريق المحل', 'OPEN', { audience: { level: 'teams', branchId: B.a.id, teamIds: [T.shop.id] } }))
  await query(`UPDATE [overtime_period_audiences] SET [audience] = N'{"level":"teams"}' WHERE [periodId] = @0`, [team.id])
  assert.deepEqual([await open('retail1'), expect(await call(U.hr, 'GET', '/attendance/overtime-periods'), 200)[0].audienceInvalid], [false, true], 'جمهور تالف: المفتوحة مابتفتحش لحد')
  await clear()
  await setting('overtime.enabled', 'true')
  const closed = await make(U.hr, period('قفل فريق', 'CLOSED', { audience: { level: 'teams', branchId: B.a.id, teamIds: [T.shop.id] } }))
  await query(`UPDATE [overtime_period_audiences] SET [audience] = N'x' WHERE [periodId] = @0`, [closed.id])
  assert.deepEqual(await openFor('retail1', 'accounts1', 'b1'), { retail1: false, accounts1: false, b1: true }, 'جمهور تالف: المقفولة بتقفل فرعها كله')
  await clear()
  // قبل الترحيل: مفيش جدول = الفترات بفرعها، وتحديد جمهور مرفوض برسالته
  const { resetOvertimeAudienceCache, OVERTIME_AUDIENCE_MIGRATION_MISSING } = require('../src/attendance/attendance.service')
  await query('DROP TABLE [overtime_period_audiences]'); resetOvertimeAudienceCache()
  await setting('overtime.enabled', 'false')
  await make(U.hr, period('فرع أ قبل الترحيل', 'OPEN', { branchId: B.a.id }))
  assert.deepEqual(await openFor('retail1', 'accounts1', 'b1'), { retail1: true, accounts1: true, b1: false })
  const refused = await call(U.hr, 'POST', '/attendance/overtime-periods', period('جمهور قبل الترحيل', 'OPEN', { audience: { level: 'teams', branchId: B.a.id, teamIds: [T.shop.id] } }))
  assert.deepEqual([refused.status, messageOf(refused)], [400, OVERTIME_AUDIENCE_MIGRATION_MISSING])
  assert.equal(expect(await call(U.hr, 'GET', '/attendance/overtime-periods'), 200).length, 1)
  // الترحيل بيعمل الجدول، وبعده الجمهور بيتحفظ
  await migrate(); resetOvertimeAudienceCache()
  await make(U.hr, period('بعد الترحيل', 'CLOSED', { audience: { level: 'employees', branchId: B.a.id, employeeIds: [E.retail1.id] } }))
  assert.deepEqual(await openFor('retail1', 'accounts1'), { retail1: false, accounts1: true })
})
