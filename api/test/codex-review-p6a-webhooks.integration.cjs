'use strict'
// B6.3 (ج) على SQL حقيقي: الـwebhooks — نقاط استقبال بصلاحيتها ولحساب بكل الفروع، سر التوقيع مرة واحدة ومختوم في القاعدة، والتوزيع من الـoutbox القايم:
// حدث تعديل الموظف من مساره الفعلي، رسالة موقّعة بمراجع بس، نطاق فروع النقطة بفرع الموظف الحالي (وقت التوزيع ووقت الإرسال)، إعادة محاولة بعد فشل،
// من غير تتبّع تحويل، والنقطة الواقفة والموديول المقفول مفيش إرسال. المستقبِل خادم محلي على 127.0.0.1 جوه الاختبار (مفيش اتصال برّه الجهاز).
// قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto'), http = require('node:http')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const migrate = require('../scripts/db-migrate.cjs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_webhooks_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_webhooks_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-webhooks-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/integrations/webhooks')
const { recordOutboxEvent } = require('../src/queue/outbox')
const MIGRATION = path.resolve(apiRoot, '..', 'docs', 'migrations', 'payroll', '20261011_184_webhook_endpoints.sql')
let master, pool, app, ds, base, modules, queue, receiver, target, created = false
const B = {}, U = {}, E = {}, W = {}
// المستقبِل المحلي: بيسجّل كل طلب وبيرد بالحالة المطلوبة
const received = []
let respond = { status: 200, location: null }
const repo = name => { assert.match(database, NAME); assert.equal(ds.options.database, database); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { Authorization: 'Bearer ' + token(user), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined })
  const raw = await response.text(); let parsed = null
  try { parsed = raw ? JSON.parse(raw) : null } catch { parsed = raw }
  return { status: response.status, body: parsed }
}
const ok = (response, status = 200) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const refused = (response, status, message) => assert.deepEqual([response.status, response.body?.message], [status, message])
const runMigration = async () => { assert.match(database, NAME); for (const batch of migrate.splitBatches(fs.readFileSync(MIGRATION, 'utf8').replace(/\r\n/g, '\n'))) await pool.request().batch(batch) }
const employee = (code, name, branch) => repo('Employee').save({ employeeCode: code, fullName: name, branchId: branch.id, joinDate: '2022-03-01', basicSalary: 9000, status: 'active', isActive: true })
const account = (label, permissions, extra = {}) => repo('User').save({ email: `${label}@webhooks.invalid`, displayName: 'حساب ' + label, passwordHash: 'test-only', role: 'employee', permissions: JSON.stringify(permissions), isActive: true, ...extra })
const emit = (type, payload, entityId) => ds.transaction(em => recordOutboxEvent(em, { type, entityType: type === 'PAYROLL_RUN_APPROVED' ? 'payroll_run' : 'employee', entityId, payload }))
/** دورتين للطابور: الأولى بتوزّع الحدث وتشغّل «التوزيع»، والتانية بتشغّل «الإرسال» */
const drain = async () => { await queue.runOnce({ limit: 200 }); return queue.runOnce({ limit: 200 }) }
const hookJobs = async () => (await pool.request().query(`SELECT [jobType], [status], [attempts] FROM dbo.jobs_queue WHERE [jobType] = N'${rules.WEBHOOK_DELIVER_JOB}' ORDER BY [id]`)).recordset
const endpointRow = id => repo('WebhookEndpoint').findOneByOrFail({ id })
const makeEndpoint = async (name, events, branchIds = null) => ok(await request(U.admin, 'POST', '/integrations/webhooks', { name, url: target, events, branchIds }), 201)

before(async () => {
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  const connection = { server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD, options: { encrypt: false, trustServerCertificate: true } }
  master = await new sql.ConnectionPool({ ...connection, database: 'master' }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  // «محلي مسموح» للاختبار: المستقبِل على 127.0.0.1 وبـhttp
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads, HR_WEBHOOKS_ALLOW_LOCAL: '1' })
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
  queue = app.get(require('../src/queue/queue.service').QueueService)
  receiver = http.createServer((incoming, response) => {
    const chunks = []
    incoming.on('data', chunk => chunks.push(chunk))
    incoming.on('end', () => {
      received.push({ path: incoming.url, method: incoming.method, headers: incoming.headers, body: Buffer.concat(chunks).toString('utf8') })
      if (incoming.url === '/redirected') { response.writeHead(200); response.end('ok'); return }
      response.writeHead(respond.status, respond.location ? { Location: respond.location } : {}); response.end('ok')
    })
  })
  await new Promise(resolve => receiver.listen(0, '127.0.0.1', resolve))
  target = `http://127.0.0.1:${receiver.address().port}/hook`
  // قاعدة قبل ترحيل 184: المزامنة عملت الجدول من الكيان، فبيتشال عشان نبدأ من شكل قاعدة ماتطبّقش عليها
  await pool.request().batch('DROP TABLE dbo.webhook_endpoints')
  B.riyadh = await repo('Branch').save({ code: 'WH_1', name: 'فرع الرياض', country: 'SA' })
  B.cairo = await repo('Branch').save({ code: 'WH_2', name: 'فرع القاهرة', country: 'EG' })
  U.admin = await repo('User').save({ email: 'admin@webhooks.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', scopeAllBranches: true, permissions: '[]', isActive: true })
  U.branch = await account('branch', ['integrations.manage'], { branchId: B.riyadh.id })
  U.plain = await account('plain', ['settings.manage'], { scopeAllBranches: true })
  E.r1 = await employee('WH-001', 'موظف الرياض', B.riyadh); E.c1 = await employee('WH-002', 'موظف القاهرة', B.cairo)
}, { timeout: 120000 })

after(async t => {
  if (receiver) await new Promise(resolve => receiver.close(resolve))
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

test('WH-01: الموديول مقفول = مفيش مسار ومفيش إرسال؛ قبل ترحيل 184 الشاشة بتقول ناقص والإنشاء مرفوض؛ والترحيل بشكل الكيان وبيتكرر بأمان', async () => {
  assert.deepEqual([(await request(U.admin, 'GET', '/integrations/webhooks')).status, (await request(U.admin, 'POST', '/integrations/webhooks', { name: 'نظام', url: target, events: ['employee.hired'] })).status], [404, 404])
  ok(await request(U.admin, 'PUT', '/modules/integrations', { enabled: true })); modules.invalidate()
  const text = fs.readFileSync(MIGRATION)
  assert.equal(text.includes(Buffer.from('\r\n')), false, 'LF بس')
  assert.ok(String(text).match(/THROW \d+/g).every(found => /^THROW 1840\d\d$/.test(found)))
  assert.doesNotMatch(String(text), /\bDROP\b|\bTRUNCATE\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b/i)
  const empty = ok(await request(U.admin, 'GET', '/integrations/webhooks'))
  assert.deepEqual([empty.available, empty.endpoints, empty.events.map(event => event.key)], [false, [], [...rules.WEBHOOK_EVENT_NAMES]])
  refused(await request(U.admin, 'POST', '/integrations/webhooks', { name: 'نظام المحاسبة', url: target, events: ['employee.hired'] }), 409, rules.WEBHOOKS_MIGRATION_MISSING)
  // حدث قبل الترحيل: مفيش مهمة إرسال ومفيش طلب
  await emit('EMPLOYEE_HIRED', { employeeId: E.r1.id, branchId: B.riyadh.id }, E.r1.id); await drain()
  assert.deepEqual([received.length, (await hookJobs()).length], [0, 0])
  await runMigration(); await runMigration()
  assert.equal(ok(await request(U.admin, 'GET', '/integrations/webhooks')).available, true)
})

test('WH-02: الإدارة — بصلاحيتها ولحساب بكل الفروع؛ العنوان لازم https عام (العنوان الداخلي والمحلي مرفوض من غير «محلي مسموح»)؛ السر بيظهر مرة ومختوم في القاعدة؛ والإيقاف والتشغيل', async () => {
  const good = { name: 'نظام المحاسبة', url: target, events: ['employee.hired'] }
  assert.deepEqual([(await request(U.plain, 'GET', '/integrations/webhooks')).status, (await request(U.plain, 'POST', '/integrations/webhooks', good)).status, (await request(U.branch, 'POST', '/integrations/webhooks', good)).status,
    (await request(U.branch, 'PATCH', '/integrations/webhooks/1', { isActive: false })).status], [403, 403, 403, 403])
  // من غير «محلي مسموح» (زي الإنتاج): http والعناوين الداخلية مرفوضة
  process.env.HR_WEBHOOKS_ALLOW_LOCAL = '0'
  try {
    for (const [url, message] of [[target, 'عنوان نقطة الاستقبال لازم يبدأ بـhttps://'], ['https://localhost/hook', 'عنوان نقطة الاستقبال لازم يكون اسم نطاق عام'], ['https://10.0.0.5/hook', 'عنوان نقطة الاستقبال ماينفعش يكون عنوان داخلي'],
      ['https://169.254.169.254/latest/meta-data', 'عنوان نقطة الاستقبال ماينفعش يكون عنوان داخلي'], ['https://user:pass@hooks.example.com/hr', 'العنوان من غير اسم مستخدم ولا كلمة سر']])
      refused(await request(U.admin, 'POST', '/integrations/webhooks', { ...good, url }), 400, message)
  } finally { process.env.HR_WEBHOOKS_ALLOW_LOCAL = '1' }
  for (const [body, message] of [[{ ...good, name: 'ا' }, 'اسم نقطة الاستقبال من حرفين لحد 120 حرف'], [{ ...good, events: [] }, 'اختار حدث واحد على الأقل'], [{ ...good, events: ['employee.deleted'] }, 'حدث مش معروف'],
    [{ ...good, branchIds: [999999] }, 'فرع من الفروع مش موجود']]) refused(await request(U.admin, 'POST', '/integrations/webhooks', body), 400, message)
  assert.equal(await repo('WebhookEndpoint').count(), 0)
  W.all = await makeEndpoint('نظام المحاسبة', ['employee.updated', 'employee.hired', 'payroll.approved'])
  assert.match(W.all.secret, /^whsec_[a-f0-9]{48}$/)
  const stored = await endpointRow(W.all.id)
  assert.deepEqual([W.all.events, W.all.branchIds, W.all.isActive, stored.secret.includes(W.all.secret), rules.openWebhookSecret(stored.secret, secret), stored.createdByUserId], [['employee.hired', 'employee.updated', 'payroll.approved'], null, true, false, W.all.secret, U.admin.id])
  const listed = ok(await request(U.admin, 'GET', '/integrations/webhooks')).endpoints
  assert.deepEqual([listed.length, Object.keys(listed[0]).sort(), JSON.stringify(listed).includes(W.all.secret), JSON.stringify(listed).includes(stored.secret)],
    [1, ['branchIds', 'createdAt', 'events', 'failures', 'id', 'isActive', 'lastAttemptAt', 'lastStatus', 'name', 'url'], false, false])
  assert.deepEqual([ok(await request(U.admin, 'PATCH', `/integrations/webhooks/${W.all.id}`, { isActive: false })).isActive, ok(await request(U.admin, 'PATCH', `/integrations/webhooks/${W.all.id}`, { isActive: true })).isActive,
    (await request(U.admin, 'PATCH', `/integrations/webhooks/${W.all.id}`, { isActive: 'yes' })).status, (await request(U.admin, 'PATCH', '/integrations/webhooks/999999', { isActive: false })).status], [false, true, 400, 404])
})

test('WH-03: الإرسال — تعديل موظف من مساره بيطلع رسالة موقّعة بمراجع بس؛ نطاق فروع النقطة بفرع الموظف الحالي وقت التوزيع ووقت الإرسال؛ ومفيش تكرار', async () => {
  W.riyadh = await makeEndpoint('نظام الرياض', ['employee.updated', 'payroll.approved'], [B.riyadh.id])
  received.length = 0
  // تعديل فعلي من مسار ملف الموظف (الحدث بيتسجّل جوه معاملته)
  ok(await request(U.admin, 'PATCH', `/employees/${E.c1.id}`, { fullNameEn: 'Cairo Employee' }))
  await drain()
  // موظف القاهرة: النقطة العامة بس
  assert.equal(received.length, 1)
  const [first] = received, body = JSON.parse(first.body)
  assert.deepEqual([first.method, first.path, first.headers['content-type'], first.headers['x-hr-event'], body.type, body.data, /^evt_\d+$/.test(body.id), Object.keys(body)], ['POST', '/hook', 'application/json', 'employee.updated', 'employee.updated', { employeeId: E.c1.id }, true, ['id', 'type', 'occurredAt', 'data']])
  // التوقيع بسر النقطة على «الوقت.الجسم»، وبسر تاني مش مطابق
  const now = Math.floor(Date.now() / 1000)
  assert.deepEqual([rules.verifySignature(W.all.secret, first.headers['x-hr-signature'], first.body, now), rules.verifySignature(W.riyadh.secret, first.headers['x-hr-signature'], first.body, now)], [true, false])
  // ولا اسم ولا راتب في الرسالة
  for (const hidden of ['موظف القاهرة', 'Cairo Employee', '9000', 'WH-002']) assert.equal(first.body.includes(hidden), false, hidden)
  assert.deepEqual([(await endpointRow(W.all.id)).lastStatus, (await endpointRow(W.all.id)).failures, (await endpointRow(W.riyadh.id)).lastStatus], ['HTTP 200', 0, null])
  // موظف الرياض: النقطتين
  received.length = 0
  ok(await request(U.admin, 'PATCH', `/employees/${E.r1.id}`, { fullNameEn: 'Riyadh Employee' }))
  await drain()
  assert.deepEqual(received.map(item => JSON.parse(item.body).data.employeeId), [E.r1.id, E.r1.id])
  assert.deepEqual(received.map(item => rules.verifySignature(W.all.secret, item.headers['x-hr-signature'], item.body, now + 5)).sort(), [false, true])
  // الموظف خرج من فروع النقطة بين التوزيع والإرسال: رسالتها بتتساب
  received.length = 0
  await emit('EMPLOYEE_UPDATED', { employeeId: E.r1.id, branchId: B.riyadh.id }, E.r1.id)
  await queue.runOnce({ limit: 200 })
  await repo('Employee').update({ id: E.r1.id }, { branchId: B.cairo.id })
  await queue.runOnce({ limit: 200 })
  assert.equal(received.length, 1)
  assert.equal(rules.verifySignature(W.all.secret, received[0].headers['x-hr-signature'], received[0].body, now + 10), true)
  await repo('Employee').update({ id: E.r1.id }, { branchId: B.riyadh.id })
  // دورة تانية على نفس الأحداث: مفيش إرسال تاني
  received.length = 0
  await drain()
  assert.equal(received.length, 0)
  // حدث مش مشتركة فيه أي نقطة (إنهاء خدمة)
  await emit('EMPLOYEE_TERMINATED', { employeeId: E.r1.id, branchId: B.riyadh.id }, E.r1.id); await drain()
  assert.equal(received.length, 0)
})

test('WH-04: الفشل وإعادة المحاولة والتحويل — رد غير 2xx بيرجّع المهمة للطابور والنقطة بتسجّل الفشل؛ بعد النجاح العدّاد بيتصفّر؛ والتحويل مابيتتبعش', async () => {
  received.length = 0
  respond = { status: 500, location: null }
  await emit('EMPLOYEE_HIRED', { employeeId: E.c1.id, branchId: B.cairo.id }, E.c1.id); await drain()
  const failed = (await hookJobs()).at(-1), afterFail = await endpointRow(W.all.id)
  assert.deepEqual([received.length, failed.status, failed.attempts, afterFail.lastStatus, afterFail.failures], [1, 'PENDING', 1, 'HTTP 500', 1])
  // المحاولة الجاية بعد التأخير: بنقرّب ميعادها ونشغّل الطابور
  respond = { status: 204, location: null }
  await pool.request().query(`UPDATE dbo.jobs_queue SET [runAfter] = DATEADD(minute, -1, SYSUTCDATETIME()) WHERE [jobType] = N'${rules.WEBHOOK_DELIVER_JOB}' AND [status] = N'PENDING'`)
  await queue.runOnce({ limit: 200 })
  const done = (await hookJobs()).at(-1), afterOk = await endpointRow(W.all.id)
  assert.deepEqual([received.length, done.status, done.attempts, afterOk.lastStatus, afterOk.failures, JSON.parse(received[1].body).id === JSON.parse(received[0].body).id], [2, 'DONE', 2, 'HTTP 204', 0, true])
  // تحويل: مابيتتبعش (العنوان التاني مايتطلبش) وبيتحسب فشل
  received.length = 0
  respond = { status: 302, location: target.replace('/hook', '/redirected') }
  await emit('EMPLOYEE_HIRED', { employeeId: E.c1.id, branchId: B.cairo.id }, E.c1.id); await drain()
  assert.deepEqual([received.map(item => item.path), (await endpointRow(W.all.id)).lastStatus, (await hookJobs()).at(-1).status], [['/hook'], 'HTTP 302', 'PENDING'])
  respond = { status: 200, location: null }
  await pool.request().query(`UPDATE dbo.jobs_queue SET [status] = N'DONE' WHERE [jobType] = N'${rules.WEBHOOK_DELIVER_JOB}' AND [status] = N'PENDING'`)
})

test('WH-05: المسير والنقطة الواقفة والموديول — اعتماد مسير بيوصل للنقطة اللي فيه موظف من فروعها بس؛ النقطة الواقفة والموديول المقفول مفيش إرسال', async () => {
  received.length = 0
  const run = await repo('PayrollRun').save({ name: 'مسير أكتوبر', period: '2026-10', startDate: '2026-10-01', endDate: '2026-10-28', status: 'APPROVED' })
  await repo('PayrollItem').save({ runId: run.id, employeeId: E.c1.id, basicSalary: 9000, allowances: 0, netPay: 8000, payMethod: 'cash' })
  await emit('PAYROLL_RUN_APPROVED', { runId: run.id, period: '2026-10', branchId: null }, run.id); await drain()
  // مسير كله من القاهرة: النقطة العامة بس
  assert.deepEqual(received.map(item => JSON.parse(item.body)).map(body => [body.type, body.data]), [['payroll.approved', { runId: run.id, period: '2026-10' }]])
  assert.equal(received[0].body.includes('8000'), false)
  received.length = 0
  await repo('PayrollItem').save({ runId: run.id, employeeId: E.r1.id, basicSalary: 9000, allowances: 0, netPay: 8500, payMethod: 'cash' })
  await emit('PAYROLL_RUN_APPROVED', { runId: run.id, period: '2026-10', branchId: null }, run.id); await drain()
  assert.equal(received.length, 2)
  // نقطة واقفة: مفيش إرسال ليها
  received.length = 0
  ok(await request(U.admin, 'PATCH', `/integrations/webhooks/${W.riyadh.id}`, { isActive: false }))
  await emit('PAYROLL_RUN_APPROVED', { runId: run.id, period: '2026-10', branchId: null }, run.id); await drain()
  assert.equal(received.length, 1)
  // الموديول اتقفل بين التوزيع والإرسال: الرسالة بتتساب؛ وبعده مفيش توزيع
  received.length = 0
  await emit('EMPLOYEE_HIRED', { employeeId: E.c1.id, branchId: B.cairo.id }, E.c1.id)
  await queue.runOnce({ limit: 200 })
  ok(await request(U.admin, 'PUT', '/modules/integrations', { enabled: false })); modules.invalidate()
  await queue.runOnce({ limit: 200 })
  await emit('EMPLOYEE_HIRED', { employeeId: E.c1.id, branchId: B.cairo.id }, E.c1.id); await drain()
  assert.equal(received.length, 0)
})

test('P6A-W01: hostname is resolved again after the public-address check (local TLS receiver only)', async t => {
  ok(await request(U.admin,'PUT','/modules/integrations',{enabled:true}));modules.invalidate();
  const https=require('node:https'),dns=require('node:dns/promises'),cp=require('node:child_process');
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'p6a-tls-')),keyFile=path.join(folder,'key.pem'),certFile=path.join(folder,'cert.pem');
  cp.execFileSync('C:/Program Files/Git/mingw64/bin/openssl.exe',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',keyFile,'-out',certFile,'-days','1','-subj','/CN=p6a-rebind.invalid'],{stdio:'ignore'});
  let delivered=0,checked=0,resolved=0;
  const tls=https.createServer({key:fs.readFileSync(keyFile),cert:fs.readFileSync(certFile)},(req,res)=>{delivered++;req.resume();req.on('end',()=>{res.writeHead(200);res.end('ok')})});
  await new Promise(r=>tls.listen(0,'127.0.0.1',r));const port=tls.address().port;setTimeout(()=>tls.close(),20000).unref();
  const service=app.get(require('../src/integrations/webhooks.service').WebhooksService),nativeFetch=global.fetch,lookup=dns.lookup,localFlag=process.env.HR_WEBHOOKS_ALLOW_LOCAL;
  const hook=await makeEndpoint('P6A DNS rebind',['employee.updated'],[B.riyadh.id]);
  await repo('WebhookEndpoint').update(hook.id,{url:`https://p6a-rebind.invalid:${port}/hook`});
  process.env.HR_WEBHOOKS_ALLOW_LOCAL='0';
  dns.lookup=async(host,options)=>{assert.equal(host,'p6a-rebind.invalid');checked++;return [{address:'93.184.216.34',family:4}]};
  // Same URL and request options passed by product. Emulate the HTTP client's DNS
  // resolution with a local-only dial. The first checked answer is never supplied
  // to this client by the product, so a changed answer is consumed independently.
  global.fetch=(url,options)=>{
    const targetUrl=new URL(url);if(targetUrl.hostname!=='p6a-rebind.invalid')return nativeFetch(url,options);
    assert.equal(checked,1);assert.equal(options.redirect,'manual');assert.equal(options.dispatcher,undefined);resolved++;
    return new Promise((resolve,reject)=>{const req=https.request({hostname:'127.0.0.1',port,path:targetUrl.pathname,method:options.method,headers:options.headers,ca:fs.readFileSync(certFile),servername:'p6a-rebind.invalid'},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve(new Response(Buffer.concat(chunks),{status:res.statusCode})))});req.on('error',reject);req.end(options.body)});
  };
  try{
    const outcome=await service.deliver({endpointId:hook.id,eventId:'p6a-dns',type:'employee.updated',occurredAt:new Date().toISOString(),data:{employeeId:E.r1.id}},{attempt:1,maxAttempts:8});
    assert.deepEqual([checked,resolved,delivered,outcome],[1,1,1,'SENT']);
    t.diagnostic(JSON.stringify({checkedPublicAddress:true,secondResolution:true,localReceiverRequests:delivered,outcome}));
  }finally{global.fetch=nativeFetch;dns.lookup=lookup;process.env.HR_WEBHOOKS_ALLOW_LOCAL=localFlag;await new Promise(r=>tls.close(r));fs.rmSync(folder,{recursive:true,force:true})}
});
