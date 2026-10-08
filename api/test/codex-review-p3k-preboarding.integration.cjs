'use strict'
// B3.1-ب: بوابة التهيئة قبل المباشرة — دخول حقيقي (كلمات سر عشوائية بتتولد وقت التشغيل) وHTTP وSQL فعليين في قاعدة اختبار عشوائية
// بتتمسح في الآخر (hr_preboarding_test_<16 hex>). ولا رسالة بريد حقيقية.
//  PB-01) الميزة مقفولة (الافتراضي): حساب موظف مباشرته لسه جاية بيدخل جلسة عادية بالحرف.
//  PB-02) الميزة مفتوحة: جلسته بتاريخ المباشرة ومن غير صلاحيات، بتفتح شاشات التهيئة بس (403 بكود على الباقي)، حتى لو دوره إداري؛
//         واللي باشر أو مباشرته النهارده، ومدير النظام، وحساب من غير موظف، ومنتهي الخدمة: جلسة عادية.
//  PB-03) العلامة بتاريخها: من يوم المباشرة مالهاش أثر من غير دخول جديد، وتاريخ المباشرة الفعلي بيسبق تاريخ الالتحاق، والدخول الجاي
//         بعد تغيير التاريخ أو قفل الميزة جلسة عادية.
// Run (من api/): node --test test/preboarding.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const bcrypt = require('../node_modules/bcryptjs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_preboarding_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_preboarding_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-preboarding-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/auth/preboarding')
// كلمات سر الاختبار بتتولد عشوائي (مش ثابتة في الملف)
const passwordOf = () => `T-${crypto.randomBytes(9).toString('base64url')}`
const ymd = value => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
const inDays = n => { const day = new Date(); day.setDate(day.getDate() + n); return ymd(day) }
const today = inDays(0)
let app, master, ds, base, created = false
const U = {}, P = {}, E = {}, B = {}

const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
async function http(method, route, body, headers = {}) {
  const response = await fetch(base + route, { method, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const expect = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body ?? null)); return response.body }
const bearer = token => ({ Authorization: `Bearer ${token}` })
const login = async key => expect(await http('POST', '/auth/login', { email: U[key].email, password: P[key] }), 201)
const get = (token, route) => http('GET', route, undefined, bearer(token))
// توكن محلي لحساب (من غير رقم جلسة) — لمدير النظام ولتجربة علامة بتاريخ معيّن
const signed = (key, extra = {}) => jwt.sign({ sub: U[key].id, email: U[key].email, role: U[key].role, branchId: U[key].branchId ?? null, employeeId: U[key].employeeId ?? null,
  tokenVersion: 0, permissions: U[key].role === 'super_admin' ? ['*'] : [], ...extra })
const feature = on => http('PUT', '/modules/features/onboarding.preboarding', { enabled: on }, bearer(signed('root')))
// شاشات التهيئة (مسموحة)، ومسارات تانية بيفتحها أي موظف عادي (مقفولة في بوابة التهيئة)
const ALLOWED = ['/auth/me', '/auth/session', '/auth/sessions', '/modules/enabled', '/policies/mine', '/policies/pending', '/hiring-documents/mine', '/documents', '/tasks/mine',
  '/tasks/mine/count', '/notifications']
const CLOSED = ['/notifications/preferences', '/tasks/team', '/tasks/assignees']

test('P3K-B01: a preboarding HR manager still reads and completes HR role tasks',{timeout:120000},async()=>{
 expect(await feature(true),200)
 const now=new Date(), task=await repo('Task').save({title:'CONFIDENTIAL_HR_TASK',description:'HR work before start',assigneeEmployeeId:null,assigneeRole:'hr',branchId:B.a.id,createdByUserId:U.root.id,priority:'NORMAL',status:'OPEN',dueDate:inDays(2),requiresProof:false,createdAt:now,updatedAt:now})
 const session=await login('manager');assert.deepEqual(session.user.permissions,[]);assert.ok(session.user.preboardingUntil)
 const shown=await get(session.accessToken,'/tasks/'+task.id)
 assert.equal(shown.status,200)
 const changed=await http('POST','/tasks/'+task.id+'/status',{status:'DONE'},bearer(session.accessToken))
 assert.equal(changed.status,201,JSON.stringify(changed.body))
 assert.equal((await repo('Task').findOneByOrFail({id:task.id})).status,'DONE')
 console.log('REVIEW_MEASURE '+JSON.stringify({case:'B01',preboarding:true,permissions:[],roleTaskRead:shown.status,roleTaskComplete:changed.status}))
})

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql'); assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads, AUTH_FAILURE_DELAY_MS: '20',
    FRONTEND_URL: 'http://localhost:3000' })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  // ولا رسالة بريد حقيقية
  const { MailService } = require('../src/auth/mail.service')
  const mail = app.get(MailService)
  mail.isConfigured = () => false
  mail.send = async () => { throw new Error('no mail in tests') }
  assert.notEqual(mail.send, MailService.prototype.send)
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => {}
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => {}
  ds = app.get(require('../node_modules/typeorm').DataSource); assert.equal(ds.options.database, database)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  B.a = await repo('Branch').save({ code: 'PBA', name: 'فرع بوابة التهيئة', country: 'EG', weekendDays: 'FRI' })
  let n = 0
  const employee = async (key, extra) => { E[key] = await repo('Employee').save({ employeeCode: `PB${String(++n).padStart(3, '0')}`, fullName: `موظف تهيئة ${key}`, branchId: B.a.id,
    status: 'active', isActive: true, ...extra }) }
  await employee('future', { joinDate: inDays(10) })
  await employee('manager', { joinDate: inDays(4) })
  await employee('actual', { joinDate: inDays(-3), actualStartDate: inDays(6) })
  await employee('today', { joinDate: today })
  await employee('old', { joinDate: '2024-01-01' })
  await employee('gone', { joinDate: inDays(12), status: 'archived', isActive: false })
  await employee('boss', { joinDate: inDays(20) })
  const account = async (key, role, employeeKey, permissions = []) => {
    P[key] = passwordOf()
    U[key] = await repo('User').save({ email: `${key}@preboarding.invalid`, displayName: `حساب ${key}`, role, permissions: JSON.stringify(permissions), isActive: true,
      branchId: role === 'super_admin' ? null : B.a.id, employeeId: employeeKey ? E[employeeKey].id : null, passwordHash: await bcrypt.hash(P[key], 10) })
  }
  await account('future', 'employee', 'future')
  await account('manager', 'hr_manager', 'manager', ['employees.view', 'documents.manage', 'settings.manage'])
  await account('actual', 'employee', 'actual')
  await account('today', 'employee', 'today')
  await account('old', 'employee', 'old')
  await account('gone', 'employee', 'gone')
  await account('none', 'employee', null)
  await account('root', 'super_admin', 'boss')
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('db', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name=@db')).recordset.length, 0)
      t.diagnostic(`تحقق حذف قاعدة الاختبار: ${database}`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir())); assert.match(path.basename(uploads), /^hr-preboarding-files-/)
    fs.rmSync(uploads, { recursive: true, force: true }); assert.equal(fs.existsSync(uploads), false)
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'تعذر تنظيف بيئة اختبار بوابة التهيئة')
})

test('PB-01: with the feature closed (the default) an account whose employee has not started yet gets an ordinary session', async () => {
  const session = await login('future')
  assert.deepEqual(['preboardingUntil' in session.user, 'preboardingUntil' in jwt.verify(session.accessToken)], [false, false])
  for (const route of [...ALLOWED, ...CLOSED]) expect(await get(session.accessToken, route), 200)
  // والحساب الإداري بصلاحياته
  const manager = await login('manager')
  assert.deepEqual(manager.user.permissions.includes('employees.view'), true)
  expect(await get(manager.accessToken, '/employees'), 200)
})

test('PB-02: with the feature open the session carries the start date and no permissions, and opens the pre-boarding screens only — whatever the role', async () => {
  expect(await feature(true), 200)
  const session = await login('future')
  const claims = jwt.verify(session.accessToken)
  assert.deepEqual([session.user.preboardingUntil, claims.preboardingUntil, session.user.permissions, claims.permissions], [inDays(10), inDays(10), [], []])
  for (const route of ALLOWED) expect(await get(session.accessToken, route), 200)
  assert.equal(expect(await get(session.accessToken, '/auth/session'), 200).user.preboardingUntil, inDays(10))
  expect(await http('PATCH', '/notifications/read', {}, bearer(session.accessToken)), 200)
  assert.equal(expect(await get(session.accessToken, '/hiring-documents/mine'), 200).employeeLinked, true)
  for (const route of [...CLOSED, '/employees', '/onboarding', '/users', `/employees/${E.future.id}`]) {
    const refused = await get(session.accessToken, route)
    assert.deepEqual([refused.status, refused.body.code], [403, rules.PREBOARDING_ONLY], route)
    assert.equal(refused.body.message, rules.preboardingMessage(inDays(10)))
  }
  const write = await http('POST', '/tasks', { title: 'مهمة من بوابة التهيئة' }, bearer(session.accessToken))
  assert.deepEqual([write.status, write.body.code], [403, rules.PREBOARDING_ONLY])
  assert.equal(await repo('Task').count(), 0)

  // دور إداري مباشرته لسه جاية: نفس البوابة، ومن غير صلاحياته (مستندات غيره وملفات الموظفين مش مفتوحة له)
  await repo('EmployeeDocument').save({ employeeId: E.old.id, docType: 'passport', number: 'SECRET-PB' })
  const manager = await login('manager')
  assert.deepEqual([manager.user.preboardingUntil, manager.user.permissions, manager.user.role], [inDays(4), [], 'hr_manager'])
  assert.deepEqual([(await get(manager.accessToken, '/employees')).body.code, (await get(manager.accessToken, '/onboarding/templates')).body.code], [rules.PREBOARDING_ONLY, rules.PREBOARDING_ONLY])
  const documents = expect(await get(manager.accessToken, '/documents'), 200)
  assert.doesNotMatch(JSON.stringify(documents), /SECRET-PB/, 'مستنداته هو بس')

  // اللي باشر، أو مباشرته النهارده، ومدير النظام، وحساب من غير موظف، ومنتهي الخدمة: جلسة عادية
  for (const key of ['today', 'old', 'none', 'gone', 'root']) {
    const plain = await login(key)
    assert.deepEqual(['preboardingUntil' in plain.user, 'preboardingUntil' in jwt.verify(plain.accessToken)], [false, false], key)
    expect(await get(plain.accessToken, '/notifications/preferences'), 200)
  }
  assert.deepEqual((await login('root')).user.permissions, ['*'])
})

test('PB-03: the mark follows its date — inert from the start day without a new login; the actual start date wins; a later login after the date moved or the feature closed is ordinary', async () => {
  // تاريخ المباشرة الفعلي (لسه جاي) بيسبق تاريخ الالتحاق (فات)
  assert.equal((await login('actual')).user.preboardingUntil, inDays(6))
  // علامة تاريخها بكرة قافلة، وعلامة تاريخها النهارده أو فات مالهاش أثر (نفس التوكن بيفتح من يوم المباشرة)، وعلامة مش تاريخ مابتقفلش
  assert.equal((await get(signed('future', { preboardingUntil: inDays(1) }), '/tasks/team')).body.code, rules.PREBOARDING_ONLY)
  for (const until of [today, inDays(-1), 'soon', 20261001]) expect(await get(signed('future', { preboardingUntil: until }), '/tasks/team'), 200)
  assert.equal(expect(await get(signed('future', { preboardingUntil: today }), '/auth/session'), 200).user.preboardingUntil, undefined)
  assert.deepEqual([rules.preboardingActive({ preboardingUntil: '2026-10-20' }, '2026-10-19'), rules.preboardingActive({ preboardingUntil: '2026-10-20' }, '2026-10-20'),
    rules.preboardingActive({}, '2026-10-19'), rules.preboardingActive(null, '2026-10-19')], [true, false, false, false])
  // الموارد البشرية قدّمت تاريخ المباشرة للنهارده: الدخول الجاي جلسة عادية
  await repo('Employee').update({ id: E.future.id }, { joinDate: today })
  const started = await login('future')
  assert.equal('preboardingUntil' in started.user, false)
  expect(await get(started.accessToken, '/tasks/team'), 200)
  await repo('Employee').update({ id: E.future.id }, { joinDate: inDays(10) })
  assert.equal((await login('future')).user.preboardingUntil, inDays(10))
  // الميزة اتقفلت، أو موديول التهيئة اتقفل: الدخول الجاي جلسة عادية بصلاحيات الدور
  expect(await feature(false), 200)
  const manager = await login('manager')
  assert.deepEqual(['preboardingUntil' in manager.user, manager.user.permissions.includes('employees.view')], [false, true])
  expect(await feature(true), 200)
  assert.equal((await login('manager')).user.preboardingUntil, inDays(4))
  expect(await http('PUT', '/modules/onboarding', { enabled: false }, bearer(signed('root'))), 200)
  assert.equal('preboardingUntil' in (await login('manager')).user, false)
})
