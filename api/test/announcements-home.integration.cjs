// B-ADD.4: الإعلانات تظهر وتوصل — إعلان لقسم واحد: موظفين القسم بس وصلهم إشعار «إعلان جديد» وشافوه في لوحتهم (المثبّت أولًا)،
// والقراءة بتتسجّل، ونسبة القراءة في قايمة الإدارة وتقرير «مين ماقراش» صح.
// HTTP وSQL فعليان في قاعدة اختبار عشوائية تُحذف بعد الانتهاء. ولا رسالة بريد حقيقية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_annhome_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-annhome-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, ds, master, base, queue, created = false
const U = {}, E = {}, B = {}, D = {}

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
const units = (branch, ...list) => ({ mode: 'all', ids: [], where: { mode: 'units', ids: list.map(unit => unit.id).sort((a, b) => a - b), branchId: branch.id } })
const make = async (user, title, audience, extra = {}) => expect(await call(user, 'POST', '/announcements', { title, body: `نص ${title}`, audience, ...extra }), 201)
const publish = async (user, row) => expect(await call(user, 'POST', `/announcements/${row.id}/publish`), 201)
const board = async user => expect(await call(user, 'GET', '/announcements/board'), 200).items
async function drain() {
  for (let round = 0; round < 6; round++) {
    const result = await queue.runOnce({ limit: 200 })
    if (!result.dispatched && !result.done && !result.retried && !result.dead) return
  }
}
const notified = async id => (await query(`SELECT n.[recipientUserId] FROM [notifications] n WHERE n.[entityType] = N'announcement' AND n.[entityId] = @0 AND n.[eventCode] = N'announcement.published'
  AND n.[inApp] = 1 ORDER BY n.[recipientUserId]`, [String(id)])).map(row => Number(row.recipientUserId))
const usersOf = (...keys) => keys.map(key => U[key].id).sort((a, b) => a - b)
const inAppTexts = async user => {
  const listed = expect(await call(user, 'GET', '/notifications'), 200)
  return JSON.stringify((listed.items ?? listed).filter(item => item.category === 'announcement'))
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql'); assert.match(database, /^hr_annhome_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
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
  queue = app.get(require('../src/queue/queue.service').QueueService)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  B.a = await repo('Branch').save({ code: 'AHA', name: 'فرع اللوحة أ', country: 'EG', weekendDays: 'FRI' })
  B.b = await repo('Branch').save({ code: 'AHB', name: 'فرع اللوحة ب', country: 'EG', weekendDays: 'FRI' })
  D.sales = await repo('Department').save({ branchId: B.a.id, name: 'قسم المبيعات', unitType: 'DEPARTMENT' })
  D.stores = await repo('Department').save({ branchId: B.a.id, name: 'قسم المخازن', unitType: 'DEPARTMENT' })
  let n = 0
  const employee = async (key, branch, extra = {}) => { E[key] = await repo('Employee').save({ employeeCode: `AH${String(++n).padStart(3, '0')}`, fullName: `موظف لوحة ${key}`,
    branchId: branch.id, status: 'active', isActive: true, joinDate: '2024-01-01', ...extra }) }
  await employee('s1', B.a, { departmentId: D.sales.id }); await employee('s2', B.a, { departmentId: D.sales.id }); await employee('s3', B.a, { departmentId: D.sales.id })
  await employee('w1', B.a, { departmentId: D.stores.id }); await employee('b1', B.b)
  const account = (key, role, permissions, extra = {}) => repo('User').save({ email: `${key}@annhome.invalid`, displayName: `حساب ${key}`, passwordHash: 'test-only',
    role, permissions: JSON.stringify(permissions), isActive: true, ...extra }).then(saved => { U[key] = saved })
  await account('admin', 'super_admin', ['*'])
  await account('hr', 'employee', ['announcements.manage'], { scopeAllBranches: true })
  for (const key of ['s1', 's2', 's3', 'w1', 'b1']) await account(key, 'employee', [], { branchId: E[key].branchId, employeeId: E[key].id })
  expect(await call(U.admin, 'PUT', '/modules/announcements', { enabled: true }), 200)
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_annhome_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('db', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name=@db')).recordset.length, 0)
      t.diagnostic(`تحقق حذف قاعدة الاختبار: ${database}`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir())); assert.match(path.basename(uploads), /^hr-annhome-files-/)
    fs.rmSync(uploads, { recursive: true, force: true }); assert.equal(fs.existsSync(uploads), false)
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'تعذر تنظيف بيئة اختبار إعلانات اللوحة')
})

test('AH-01: an announcement for one department notifies its employees only, shows on their board (pinned first), and the read rate is right', async () => {
  const general = await make(U.hr, 'إعلان عام قديم', null)
  await publish(U.hr, general)
  const sales = await make(U.hr, 'إعلان قسم المبيعات', units(B.a, D.sales), { pinned: true, requiresRead: true })
  await publish(U.hr, sales)
  await drain()
  // الإشعار داخل النظام لموظفين القسم بس
  assert.deepEqual(await notified(sales.id), usersOf('s1', 's2', 's3'))
  assert.deepEqual(await notified(general.id), usersOf('s1', 's2', 's3', 'w1', 'b1'))
  assert.deepEqual([(await inAppTexts(U.s1)).includes('إعلان قسم المبيعات'), (await inAppTexts(U.w1)).includes('إعلان قسم المبيعات')], [true, false])
  // اللوحة: المثبّت أولًا، وغير المقري «جديد» (read = false)، واللي برّه القسم مايشوفوش
  assert.deepEqual((await board(U.s1)).map(item => [item.title, item.pinned, item.requiresRead, item.read]), [['إعلان قسم المبيعات', true, true, false], ['إعلان عام قديم', false, false, false]])
  assert.deepEqual((await board(U.w1)).map(item => item.title), ['إعلان عام قديم'])
  // «قريت» بتتسجّل مرة، واللي برّه الجمهور «غير موجود»
  expect(await call(U.s1, 'POST', `/announcements/${sales.id}/read`), 201)
  expect(await call(U.s1, 'POST', `/announcements/${sales.id}/read`), 201)
  expect(await call(U.w1, 'POST', `/announcements/${sales.id}/read`), 404)
  expect(await call(U.b1, 'POST', `/announcements/${general.id}/read`), 201)
  assert.deepEqual((await board(U.s1)).map(item => [item.title, item.read]), [['إعلان قسم المبيعات', true], ['إعلان عام قديم', false]])
  assert.equal(Number((await query('SELECT COUNT(*) AS [n] FROM [announcement_reads] WHERE [announcementId] = @0', [sales.id]))[0].n), 1)
  // نسبة القراءة في قايمة الإدارة = جمهور الإعلان دلوقتي واللي قروا منهم
  const stats = async user => Object.fromEntries(expect(await call(user, 'GET', '/announcements'), 200).items.map(item => [item.title, item.readStats]))
  assert.deepEqual(await stats(U.hr), { 'إعلان قسم المبيعات': { audience: 3, read: 1 }, 'إعلان عام قديم': { audience: 5, read: 1 } })
  // «مين ماقراش»: تقرير الإعلان
  const report = expect(await call(U.hr, 'GET', `/announcements/${sales.id}/report`), 200)
  assert.deepEqual([report.summary, report.rows.filter(row => !row.readAt).map(row => row.fullName).sort()], [{ audience: 3, read: 1 }, [E.s2.fullName, E.s3.fullName].sort()])
  // المسودة والمسحوب من غير نسبة
  await make(U.hr, 'مسودة', null)
  expect(await call(U.hr, 'POST', `/announcements/${general.id}/withdraw`), 201)
  const later = await stats(U.hr)
  assert.deepEqual([later['مسودة'], later['إعلان عام قديم'], later['إعلان قسم المبيعات']], [null, null, { audience: 3, read: 1 }])
})
