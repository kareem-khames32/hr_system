'use strict'
// B4.6 (ج) على SQL حقيقي: «عرض التاريخ الهجري جنب الميلادي» إعداد لكل كيان قانوني — مقفول لكل الكيانات افتراضيًا؛ بيتفعّل من مسار الكيانات
// بس (لحساب بكل الفروع، تحت قفل، وبسطر تدقيق)، وكل حساب بيتحكم له بفروعه هو: فرع في كيان مفعّل = هجري؛ غيره = ميلادي بس.
// قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_hijri_display_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_hijri_display_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-hijri-display-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const hijri = require('../src/org/hijri-display')
const L = '/settings/legal-entities'
let master, app, ds, base, admin, created = false
const B = {}, U = {}, X = {}
const repo = name => { assert.match(database, NAME); assert.equal(ds.options.database, database); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token(user) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const raw = await response.text(); return { status: response.status, body: raw ? JSON.parse(raw) : null }
}
const ok = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const answer = response => [response.status, [].concat(response.body?.message ?? []).join('، ')]
const display = async user => ok(await request(user, 'GET', `${L}/display`), 200)
const all = async () => Object.fromEntries(await Promise.all(Object.entries({ admin, ...U }).map(async ([name, user]) => [name, (await display(user)).hijri])))
const setHijri = (id, enabled, user = admin) => request(user, 'PUT', `${L}/${id}/hijri-display`, { enabled })
const stored = async () => (await repo('RequestsConfig').findOneBy({ key: hijri.HIJRI_DISPLAY_KEY }))?.value ?? null
const account = (label, branch, permissions = []) => repo('User').save({ email: `${label}@hijri-display.invalid`, displayName: label, passwordHash: 'test-only', role: 'employee',
  branchId: branch ? branch.id : null, permissions: JSON.stringify(permissions) })

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
  admin = await repo('User').save({ email: 'admin@hijri-display.invalid', displayName: 'Fixture admin', passwordHash: 'test-only', role: 'super_admin', scopeAllBranches: true, permissions: '[]' })
  B.riyadh = await repo('Branch').save({ code: 'HJ_RUH', name: 'فرع الرياض', country: 'SA' })
  B.jeddah = await repo('Branch').save({ code: 'HJ_JED', name: 'فرع جدة', country: 'SA' })
  B.cairo = await repo('Branch').save({ code: 'HJ_CAI', name: 'فرع القاهرة', country: 'EG' })
  B.free = await repo('Branch').save({ code: 'HJ_FREE', name: 'فرع من غير كيان', country: 'SA' })
  for (const [key, name, country, branches] of [['sa', 'كيان السعودية', 'SA', [B.riyadh, B.jeddah]], ['eg', 'كيان مصر', 'EG', [B.cairo]]]) {
    ok(await request(admin, 'POST', L, { name, country }), 201)
    X[key] = (await repo('LegalEntity').findOneByOrFail({ name })).id
    for (const branch of branches) ok(await request(admin, 'PUT', `${L}/branches/${branch.id}`, { legalEntityId: X[key] }), 200)
  }
  U.riyadh = await account('riyadh', B.riyadh)
  U.cairo = await account('cairo', B.cairo)
  U.free = await account('free', B.free)
  U.settings = await account('settings', B.riyadh, ['settings.manage'])
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

test('HJ-01: الافتراضي — مقفول لكل الكيانات: كل الحسابات ميلادي بس، والإعداد مش مكتوب، والكيانات بتقول إنه مقفول', async () => {
  assert.deepEqual(await all(), { admin: false, riyadh: false, cairo: false, free: false, settings: false })
  assert.equal(await stored(), null)
  assert.deepEqual(ok(await request(admin, 'GET', L), 200).entities.map(row => [row.name, row.hijriDisplay]), [['كيان السعودية', false], ['كيان مصر', false]])
  // من غير تسجيل دخول مفيش إعداد
  assert.equal((await fetch(base + `${L}/display`)).status, 401)
})

test('HJ-02: التفعيل لكيان — لحساب بكل الفروع بصلاحية الإعدادات، وبالقيم الصح، ومن مسار الكيانات بس، وبسطر تدقيق', async () => {
  assert.deepEqual([(await setHijri(X.sa, true, U.riyadh)).status, (await setHijri(X.sa, true, U.settings)).status, answer(await setHijri(X.sa, 'yes')).slice(0, 1), (await setHijri(987654, true)).status],
    [403, 403, [400], 404])
  assert.equal(await stored(), null, 'الرفض مابيكتبش')
  const saved = ok(await setHijri(X.sa, true), 200)
  assert.deepEqual([saved.id, saved.hijriDisplay, await stored()], [X.sa, true, String(X.sa)])
  // نفس القيمة تاني = مفيش تغيير
  assert.equal((await setHijri(X.sa, true)).status, 400)
  assert.deepEqual((await repo('AuditLog').find({ where: { action: 'LEGAL_ENTITY_HIJRI_DISPLAY' } })).map(row => [Number(row.entityId), row.actorUserId]), [[X.sa, admin.id]])
  // شاشة الإعدادات العامة مابتكتبش المفتاح
  assert.deepEqual(answer(await request(admin, 'PATCH', '/settings/config', { key: hijri.HIJRI_DISPLAY_KEY, value: '1,2,3' })), [400, hijri.HIJRI_DISPLAY_REFUSAL])
  assert.equal(await stored(), String(X.sa))
})

test('HJ-03: كل حساب بفروعه — فرع في كيان مفعّل بيشوف الهجري، وفرع كيان تاني أو من غير كيان ميلادي بس، وحساب بكل الفروع لو أي كيان مفعّل', async () => {
  assert.deepEqual(await all(), { admin: true, riyadh: true, cairo: false, free: false, settings: true })
  assert.deepEqual(ok(await request(admin, 'GET', L), 200).entities.map(row => [row.name, row.hijriDisplay]), [['كيان السعودية', true], ['كيان مصر', false]])
  // تفعيلين مع بعض لكيانين: الاتنين بيتحفظوا (مفيش كتابة فوق كتابة)
  ok(await setHijri(X.sa, false), 200)
  const race = await Promise.all([setHijri(X.sa, true), setHijri(X.eg, true)])
  assert.deepEqual([race.map(response => response.status), await stored()], [[200, 200], [X.sa, X.eg].sort((a, b) => a - b).join(',')])
  assert.deepEqual(await all(), { admin: true, riyadh: true, cairo: true, free: false, settings: true })
  // الموظف المنقول (حسابه على فرع تاني) بيتحكم له بفرعه الجديد؛ وفك ربط الفرع من كيانه بيرجّعه ميلادي
  ok(await setHijri(X.eg, false), 200)
  await repo('User').update({ id: U.cairo.id }, { branchId: B.jeddah.id })
  U.cairo = await repo('User').findOneByOrFail({ id: U.cairo.id })
  assert.equal((await display(U.cairo)).hijri, true)
  ok(await request(admin, 'PUT', `${L}/branches/${B.riyadh.id}`, { legalEntityId: null }), 200)
  assert.deepEqual([(await display(U.riyadh)).hijri, (await display(U.cairo)).hijri], [false, true])
  // قفل آخر كيان: الكل ميلادي بس
  ok(await setHijri(X.sa, false), 200)
  assert.deepEqual([await stored(), await all()], ['', { admin: false, riyadh: false, cairo: false, free: false, settings: false }])
})
