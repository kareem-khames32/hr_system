'use strict'
// B6.3 (أ) على SQL حقيقي: التكاملات — الموديول مقفول افتراضيًا، إدارة المفاتيح بصلاحيتها ولحساب بكل الفروع، المفتاح بيظهر مرة وبيتخزن بصمة،
// والـAPI العام `/public/v1` بمفتاح صالح ونطاق قراءة ونطاق فروع جوه جملة القراءة (بفرع الموظف الحالي)، من غير بيانات حساسة، وحد طلبات.
// قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const migrate = require('../scripts/db-migrate.cjs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_public_api_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_public_api_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-public-api-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/integrations/integration-keys')
const guard = require('../src/integrations/integration-key.guard')
const MIGRATION = path.resolve(apiRoot, '..', 'docs', 'migrations', 'payroll', '20261011_183_integration_keys.sql')
let master, pool, app, ds, base, modules, created = false
const B = {}, U = {}, E = {}, K = {}
const repo = name => { assert.match(database, NAME); assert.equal(ds.options.database, database); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function send(method, route, headers = {}, body) {
  const response = await fetch(base + route, { method, headers: { ...headers, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined })
  const raw = await response.text(); let parsed = null
  try { parsed = raw ? JSON.parse(raw) : null } catch { parsed = raw }
  return { status: response.status, body: parsed }
}
const request = (user, method, route, body) => send(method, route, { Authorization: 'Bearer ' + token(user) }, body)
/** نداء للـAPI العام بمفتاح تكامل (في ترويسة Authorization) */
const call = (key, route, method = 'GET') => send(method, '/public/v1' + route, key ? { Authorization: 'Bearer ' + key } : {})
const ok = (response, status = 200) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const refused = (response, status, message) => assert.deepEqual([response.status, response.body?.message], [status, message])
const runMigration = async () => { assert.match(database, NAME); for (const batch of migrate.splitBatches(fs.readFileSync(MIGRATION, 'utf8').replace(/\r\n/g, '\n'))) await pool.request().batch(batch) }
const employee = (code, name, branch, extra = {}) => repo('Employee').save({ employeeCode: code, fullName: name, branchId: branch.id, joinDate: '2022-03-01', basicSalary: 9000, status: 'active', isActive: true,
  nationalId: '2990101' + code.replace(/\D/g, '').padStart(7, '0'), phone: '+966500000000', iban: 'SA4420000001234567891234', email: `${code.toLowerCase()}@public-api.invalid`, jobTitle: 'محاسب', ...extra })
const account = (label, permissions, extra = {}) => repo('User').save({ email: `${label}@public-api.invalid`, displayName: 'حساب ' + label, passwordHash: 'test-only', role: 'employee', permissions: JSON.stringify(permissions), isActive: true, ...extra })
const makeKey = async (name, scopes, branchIds = null) => ok(await request(U.admin, 'POST', '/integrations/keys', { name, scopes, branchIds }), 201)

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
  // قاعدة قبل ترحيل 183: المزامنة عملت الجدول من الكيان، فبيتشال عشان نبدأ من شكل قاعدة ماتطبّقش عليها
  await pool.request().batch('DROP TABLE dbo.integration_keys')
  B.riyadh = await repo('Branch').save({ code: 'PA_1', name: 'فرع الرياض', nameEn: 'Riyadh', country: 'SA' })
  B.cairo = await repo('Branch').save({ code: 'PA_2', name: 'فرع القاهرة', nameEn: 'Cairo', country: 'EG' })
  await repo('Department').save({ name: 'المالية', nameEn: 'Finance', branchId: B.riyadh.id, isActive: true })
  await repo('Department').save({ name: 'المبيعات', branchId: B.cairo.id, isActive: true })
  U.admin = await repo('User').save({ email: 'admin@public-api.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', scopeAllBranches: true, permissions: '[]', isActive: true })
  U.wide = await account('wide', ['integrations.manage'], { scopeAllBranches: true })
  U.branch = await account('branch', ['integrations.manage'], { branchId: B.riyadh.id })
  U.plain = await account('plain', ['settings.manage'], { scopeAllBranches: true })
  E.r1 = await employee('PA-001', 'موظف الرياض الأول', B.riyadh, { fullNameEn: 'Riyadh One' })
  E.r2 = await employee('PA-002', 'موظف الرياض التاني', B.riyadh, { status: 'terminated', isActive: false })
  E.c1 = await employee('PA-003', 'موظف القاهرة', B.cairo)
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

test('PA-01: الموديول مقفول افتراضيًا = مفيش مسار (إدارة ولا عام)؛ وقبل ترحيل 183 الشاشة بتقول ناقص والإنشاء مرفوض؛ والترحيل بشكل الكيان وبيتكرر بأمان', async () => {
  assert.equal(await modules.isEnabled('integrations'), false)
  const anyKey = rules.generateKey().key
  assert.deepEqual([(await request(U.admin, 'GET', '/integrations/keys')).status, (await request(U.admin, 'POST', '/integrations/keys', { name: 'نظام', scopes: ['employees.read'] })).status,
    (await call(anyKey, '/employees')).status, (await call(null, '/openapi.json')).status], [404, 404, 404, 404])
  ok(await request(U.admin, 'PUT', '/modules/integrations', { enabled: true })); modules.invalidate()
  const text = fs.readFileSync(MIGRATION)
  assert.equal(text.includes(Buffer.from('\r\n')), false, 'LF بس')
  assert.notDeepEqual([...text.subarray(0, 3)], [0xef, 0xbb, 0xbf])
  assert.ok(String(text).match(/THROW \d+/g).every(found => /^THROW 1830\d\d$/.test(found)))
  assert.doesNotMatch(String(text), /\bDROP\b|\bTRUNCATE\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b/i)
  const empty = ok(await request(U.admin, 'GET', '/integrations/keys'))
  assert.deepEqual([empty.available, empty.keys, empty.scopes.map(scope => scope.key)], [false, [], [...rules.INTEGRATION_SCOPES]])
  refused(await request(U.admin, 'POST', '/integrations/keys', { name: 'نظام المحاسبة', scopes: ['employees.read'] }), 409, rules.INTEGRATIONS_MIGRATION_MISSING)
  refused(await call(anyKey, '/employees'), 401, rules.KEY_INVALID)
  await runMigration(); await runMigration()
  assert.equal(ok(await request(U.admin, 'GET', '/integrations/keys')).available, true)
})

test('PA-02: إدارة المفاتيح — بصلاحيتها ولحساب بكل الفروع؛ القيم بتتفحص؛ المفتاح بيظهر مرة في رد الإنشاء وبيتخزن بصمة؛ والإلغاء مرة واحدة', async () => {
  assert.deepEqual([(await request(U.plain, 'GET', '/integrations/keys')).status, (await request(U.plain, 'POST', '/integrations/keys', { name: 'نظام', scopes: ['employees.read'] })).status,
    (await request(U.branch, 'GET', '/integrations/keys')).status, (await request(U.branch, 'POST', '/integrations/keys', { name: 'نظام', scopes: ['employees.read'] })).status], [403, 403, 403, 403])
  for (const [body, message] of [[{ name: 'ا', scopes: ['employees.read'] }, 'اسم المفتاح من حرفين لحد 120 حرف'], [{ name: 'نظام', scopes: [] }, 'اختار نطاق قراءة واحد على الأقل'],
    [{ name: 'نظام', scopes: ['employees.write'] }, 'نطاق قراءة مش معروف'], [{ name: 'نظام', scopes: ['employees.read'], branchIds: ['x'] }, 'الفروع أرقام فروع صحيحة'],
    [{ name: 'نظام', scopes: ['employees.read'], branchIds: [999999] }, 'فرع من الفروع مش موجود']]) refused(await request(U.admin, 'POST', '/integrations/keys', body), 400, message)
  assert.equal(await repo('IntegrationKey').count(), 0)
  K.all = ok(await request(U.wide, 'POST', '/integrations/keys', { name: '  نظام   المحاسبة ', scopes: ['structure.read', 'employees.read'], branchIds: null }), 201)
  assert.match(K.all.key, /^hrk_[a-f0-9]{8}_[a-f0-9]{40}$/)
  assert.deepEqual([K.all.name, K.all.keyPrefix, K.all.scopes, K.all.branchIds, K.all.isActive], ['نظام المحاسبة', K.all.key.slice(0, 12), ['employees.read', 'structure.read'], null, true])
  const stored = await repo('IntegrationKey').findOneByOrFail({ id: K.all.id })
  // في القاعدة البصمة والبادئة بس
  assert.deepEqual([stored.keyHash, stored.keyPrefix, JSON.stringify(stored).includes(K.all.key), stored.createdByUserId], [rules.hashKey(K.all.key), K.all.key.slice(4, 12), false, U.wide.id])
  const listed = ok(await request(U.admin, 'GET', '/integrations/keys')).keys
  assert.deepEqual([listed.length, Object.keys(listed[0]).sort(), JSON.stringify(listed).includes(stored.keyHash)],
    [1, ['branchIds', 'createdAt', 'id', 'isActive', 'keyPrefix', 'lastUsedAt', 'name', 'revokedAt', 'scopes'], false])
  K.riyadh = await makeKey('نظام الرياض', ['employees.read', 'structure.read'], [B.riyadh.id])
  K.structure = await makeKey('نظام الهيكل', ['structure.read'])
  K.gone = await makeKey('نظام قديم', ['employees.read'])
  assert.deepEqual([ok(await request(U.admin, 'DELETE', `/integrations/keys/${K.gone.id}`)), ok(await request(U.admin, 'DELETE', `/integrations/keys/${K.gone.id}`)), (await request(U.admin, 'DELETE', '/integrations/keys/999999')).status],
    [{ id: K.gone.id, revoked: true }, { id: K.gone.id, revoked: false }, 404])
  const gone = await repo('IntegrationKey').findOneByOrFail({ id: K.gone.id })
  assert.deepEqual([gone.isActive, gone.revokedByUserId, gone.revokedAt != null], [false, U.admin.id, true])
})

test('PA-03: الـAPI العام — مفتاح صالح بس (ناقص وغلط وملغي نفس الرد)، والنطاق المطلوب، وفروع المفتاح جوه القراءة بفرع الموظف الحالي، ومن غير بيانات حساسة، وللقراءة بس', async () => {
  const wrong = rules.generateKey().key, sameShape = K.all.key.slice(0, -1) + (K.all.key.endsWith('0') ? '1' : '0')
  for (const key of [null, 'abc', wrong, sameShape, K.gone.key]) refused(await call(key, '/employees'), 401, rules.KEY_INVALID)
  refused(await call(K.structure.key, '/employees'), 403, rules.KEY_SCOPE_MISSING)
  refused(await call(K.structure.key, `/employees/${E.r1.id}`), 403, rules.KEY_SCOPE_MISSING)
  // كل الفروع
  const all = ok(await call(K.all.key, '/employees'))
  assert.deepEqual([all.page, all.pageSize, all.total, all.items.map(row => row.id)], [1, 50, 3, [E.r1.id, E.r2.id, E.c1.id]])
  assert.deepEqual(all.items[0], { id: E.r1.id, employeeCode: 'PA-001', fullName: 'موظف الرياض الأول', fullNameEn: 'Riyadh One', jobTitle: 'محاسب', email: 'pa-001@public-api.invalid', branchId: B.riyadh.id,
    departmentId: null, teamId: null, managerEmployeeId: null, status: 'active', joinDate: '2022-03-01' })
  // ولا خانة حساسة في أي رد
  for (const hidden of ['basicSalary', 'nationalId', 'iban', 'phone', '9000', 'SA4420000001234567891234', '+966500000000', '2990101']) assert.equal(JSON.stringify(all).includes(hidden), false, hidden)
  // مفتاح الرياض: موظفين الرياض بس؛ والقاهرة = مش موجود زي رقم مش موجود
  const riyadh = ok(await call(K.riyadh.key, '/employees'))
  assert.deepEqual([riyadh.total, riyadh.items.map(row => row.id)], [2, [E.r1.id, E.r2.id]])
  assert.equal(ok(await call(K.riyadh.key, `/employees/${E.r1.id}`)).employeeCode, 'PA-001')
  const outside = await call(K.riyadh.key, `/employees/${E.c1.id}`), missing = await call(K.riyadh.key, '/employees/999999')
  assert.deepEqual([outside.status, outside.body, missing.status], [404, missing.body, 404])
  assert.deepEqual(ok(await call(K.riyadh.key, `/employees?branchId=${B.cairo.id}`)).items, [])
  // الفلاتر والصفحات
  assert.deepEqual([ok(await call(K.all.key, '/employees?status=terminated')).items.map(row => row.id), ok(await call(K.all.key, `/employees?branchId=${B.cairo.id}`)).items.map(row => row.id)], [[E.r2.id], [E.c1.id]])
  const second = ok(await call(K.all.key, '/employees?page=2&pageSize=2')), beyond = ok(await call(K.all.key, '/employees?page=9&pageSize=2'))
  assert.deepEqual([second.items.map(row => row.id), second.total, beyond.items, beyond.total], [[E.c1.id], 3, [], 3])
  for (const query of ['status=fired', 'page=0', 'pageSize=201', 'branchId=x']) assert.equal((await call(K.all.key, '/employees?' + query)).status, 400, query)
  // الموظف اتنقل للقاهرة: بيخرج من مفتاح الرياض (الحكم بفرعه الحالي)
  await repo('Employee').update({ id: E.r2.id }, { branchId: B.cairo.id })
  assert.deepEqual([ok(await call(K.riyadh.key, '/employees')).items.map(row => row.id), (await call(K.riyadh.key, `/employees/${E.r2.id}`)).status], [[E.r1.id], 404])
  await repo('Employee').update({ id: E.r2.id }, { branchId: B.riyadh.id })
  // الهيكل بنطاق المفتاح
  const structure = ok(await call(K.riyadh.key, '/structure')), whole = ok(await call(K.structure.key, '/structure'))
  assert.deepEqual([structure.branches.map(row => [row.code, row.nameEn]), structure.departments.map(row => [row.name, row.branchId]), whole.branches.length, whole.departments.length],
    [[['PA_1', 'Riyadh']], [['المالية', B.riyadh.id]], 2, 2])
  // وصف المسارات لأي مفتاح صالح، ونفس المفتاح في ترويسة X-API-Key
  const spec = ok(await call(K.structure.key, '/openapi.json'))
  assert.deepEqual([spec.openapi, Object.keys(spec.paths)], ['3.0.3', ['/employees', '/employees/{id}', '/structure']])
  assert.equal((await send('GET', '/public/v1/structure', { 'X-API-Key': K.structure.key })).status, 200)
  // للقراءة بس: مفيش مسار كتابة
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) assert.equal((await call(K.all.key, '/employees', method)).status, 404, method)
  // «آخر استخدام» اتسجّل، وتوكن مستخدم مش مفتاح
  assert.ok((await repo('IntegrationKey').findOneByOrFail({ id: K.all.id })).lastUsedAt)
  refused(await send('GET', '/public/v1/employees', { Authorization: 'Bearer ' + token(U.admin) }), 401, rules.KEY_INVALID)
})

test('PA-04: حد الطلبات لكل مفتاح — بعد الحد 429، ومفتاح تاني لسه شغال؛ وقفل الموديول بيقفل الـAPI العام', async () => {
  const limited = await makeKey('نظام كتير الطلبات', ['structure.read']), calm = await makeKey('نظام هادي', ['structure.read'])
  const statuses = []
  for (let index = 0; index < guard.KEY_REQUESTS_PER_MINUTE + 2; index++) statuses.push((await call(limited.key, '/structure')).status)
  assert.deepEqual([statuses.slice(0, guard.KEY_REQUESTS_PER_MINUTE).every(status => status === 200), statuses.slice(guard.KEY_REQUESTS_PER_MINUTE)], [true, [429, 429]])
  refused(await call(limited.key, '/structure'), 429, rules.KEY_RATE_LIMITED)
  assert.equal((await call(calm.key, '/structure')).status, 200)
  ok(await request(U.admin, 'PUT', '/modules/integrations', { enabled: false })); modules.invalidate()
  assert.deepEqual([(await call(calm.key, '/structure')).status, (await request(U.admin, 'GET', '/integrations/keys')).status], [404, 404])
})
