'use strict'
// B-ADD.5: قنوات الإشعارات (البريد والواتساب) على قاعدة SQL مؤقتة معزولة بتتمسح في الآخر (hr_notify_channels_test_<16 hex>).
// مفيش رسالة حقيقية بتطلع: البريد مستبدل على نسخة MailService نفسها، ونداء Meta دالة تجريبية (channels.http) — ولا طلب شبكة برّه الجهاز.
//  NC-01) الافتراضي = سلوك النظام الحالي: القنوات مقفولة، وكل حدث بقاعدته الافتراضية، والشاشة لمدير النظام بس (403 لغيره و401 من غير دخول).
//  NC-02) خادم البريد من الشاشة: كلمة السر مختومة في القاعدة ومابترجعش في أي رد ولا في سجل التدقيق، والإعداد المحفوظ بياخد مكان إعداد الخادم
//         من غير إعادة تشغيل ويرجع له لما يتقفل، والتحقق من الخانات، ورسالة التجربة.
//  NC-03) الواتساب من الشاشة: التوكن مختوم ومابيرجعش، وربط قالب Meta بالحدث بمتغيرات الحدث بس، ورسالة التجربة على خادم Meta بس.
//  NC-04) «خلص لما»: طلب مستني اعتماد وصل للمعتمد على البريد والواتساب، والسجل بيقول «اتبعتت» على الاتنين.
//  NC-05) الطلب السري: القالب العام على القناتين — لا نوع ولا اسم — ومستلمه مخفي في السجل.
//  NC-06) حدث من غير قالب واتساب «اتخطّى»، ومستلم من غير رقم «اتخطّى»، وموبايل الملف بياخد مكانه لما الإدارة تفتح الاختيار بس.
//  NC-07) اختيار المستخدم «مقفول» محترم على الواتساب، و«إلزامي» بيلغيه (والملخص اليومي كمان)، وصفحة المستخدم بتقول إيه الإلزامي.
//  NC-08) ساعات الهدوء بتأجّل الواتساب، وفشل المزوّد: إعادة محاولة، والرقم المرفوض «فشل» من غير إعادة، والتوكن المرفوض بيوقّف الإرسال.
//  NC-09) القناة المقفولة = ولا صف؛ واللي اتقفلت قبل الإرسال «اتخطّى»؛ وجدول الحدث × القناة بيقفل البريد أو داخل النظام للحدث لوحده.
//  NC-10) رقم واتساب الموظف (بنطاق الفروع والصلاحية)، ومين ناقصه رقم أو بريد.
//  NC-11) البحث في سجل الإرسال: القناة والحالة والحدث واسم المستلم والتاريخ والصفحات، واسم مستلم السري مابيطابقش.
//  NC-12) القالب الإنجليزي للي لغة حسابه إنجليزي، والباقي عربي.
// Run (من api/): node --test test/notification-channels.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_notify_channels_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-notify-channels-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const FRONTEND = 'https://hr.example.invalid'
// قيم اختبار بس (مش أسرار حقيقية)
const MAIL_PASSWORD = `mail-${crypto.randomBytes(9).toString('hex')}`, WA_TOKEN = `EAAtest${crypto.randomBytes(12).toString('hex')}`
const PHONE_ID = '100200300400500'
let app, master, ds, base, queue, notifications, channels, mail, created = false, employeeNumber = 0
const org = {}, users = {}, emps = {}, types = {}
const mailbox = { attempts: [], sent: [], failure: null, configured: true }
// نداءات Meta التجريبية: كل طلب، والرد اللي الدالة هترجّعه
const meta = { calls: [], respond: null }

function assertDisposable() {
  assert.match(database, /^hr_notify_channels_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system')
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
const query = (text, params = []) => { assertDisposable(); return ds.query(text, params) }
const token = user => jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false,
  permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
function expectStatus(response, status) {
  assert.equal(response.status, status, JSON.stringify(response.body))
  return response.body
}
async function setting(key, value) {
  const config = repo('RequestsConfig')
  if (await config.findOneBy({ key })) await config.update({ key }, { value }); else await config.save({ key, value })
}
async function employee(extra = {}) {
  const number = ++employeeNumber
  return repo('Employee').save({ employeeCode: `NC${String(number).padStart(3, '0')}`, fullName: `موظف القنوات ${number}`, branchId: org.branchA.id, joinDate: '2020-01-01',
    basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'transfer', ...extra })
}
const account = (label, role, permissions, extra = {}) => repo('User').save({ email: `${label}@channels.invalid`, displayName: `حساب ${label}`, passwordHash: 'test-only',
  role, branchId: org.branchA.id, permissions: JSON.stringify(permissions), isActive: true, ...extra })
async function drain() {
  for (let round = 0; round < 6; round++) {
    const result = await queue.runOnce({ limit: 200 })
    if (!result.dispatched && !result.done && !result.retried && !result.dead) return
  }
}
const submit = async (user, type) => expectStatus(await request(user, 'POST', '/requests', { typeCode: type.code, payload: { reason: 'طلب للاختبار فيه محتوى خاص' }, submit: true }), 201)
const act = async (user, id, action, comment) => expectStatus(await request(user, 'POST', `/requests/${id}/act`, { action, comment }), 201)
const deliveriesOf = (entityType, entityId, channel) => query(`SELECT d.[id], d.[channel], d.[status], d.[attempts], d.[address], d.[subject], d.[body], d.[detail], d.[sentAt],
    n.[recipientUserId], n.[eventCode]
  FROM [notification_deliveries] d INNER JOIN [notifications] n ON n.[id] = d.[notificationId]
  WHERE n.[entityType] = @0 AND n.[entityId] = @1 AND (@2 IS NULL OR d.[channel] = @2) ORDER BY d.[id]`, [entityType, String(entityId), channel ?? null])
const whatsappJobs = () => query(`SELECT [id], [status], [attempts], [lastError], DATEDIFF(second, SYSUTCDATETIME(), [runAfter]) AS [delay], JSON_VALUE([payload], '$.deliveryId') AS [deliveryId]
  FROM [jobs_queue] WHERE [jobType] = N'notifications.whatsapp' ORDER BY [id]`)
const clear = () => { mailbox.attempts.length = 0; mailbox.sent.length = 0; meta.calls.length = 0 }
const admin = (method, route, body) => request(users.admin, method, route, body)
const state = async () => expectStatus(await admin('GET', '/notification-channels'), 200)
const eventOf = (body, code) => body.events.find(event => event.code === code)
const rule = (code, change) => admin('PUT', `/notification-channels/events/${code}`, { inApp: true, email: true, whatsapp: false, mandatory: false, ...change })
const MAIL = { preset: 'MICROSOFT_365', host: 'smtp.office365.com', port: 587, encryption: 'STARTTLS', user: 'hr@channels.invalid', fromName: 'الموارد البشرية', fromAddress: 'hr@channels.invalid' }
const WHATSAPP = { provider: 'META_CLOUD', phoneNumber: '+966 50 000 0000', phoneNumberId: PHONE_ID, businessAccountId: '900800700600', apiVersion: 'v21.0', defaultCountryCode: '966', fallbackToPhone: false }
const PENDING_BINDING = { templateName: 'approval_pending', languageCode: 'ar', variables: ['request.type', 'request.requester', 'link'] }
const sentBody = call => JSON.parse(call.body)
const parametersOf = call => sentBody(call).template.components[0].parameters.map(item => item.text)
test('P7B-N01: daily digest respects an event email channel disabled before sending', async t => {
  await setting('notifications.email.enabled', 'true');
  await setting('notifications.quiet_hours', '');
  expectStatus(await rule('request.pending_approval', { email: true }), 200);
  expectStatus(await request(users.manager, 'PATCH', '/notifications/preferences', { category: 'approval', channel: 'EMAIL', mode: 'DIGEST' }), 200);
  const req = await submit(users.requester, types.general);
  await drain();
  assert.equal((await deliveriesOf('request', req.id, 'EMAIL'))[0]?.status, 'DIGEST');
  expectStatus(await rule('request.pending_approval', { email: false }), 200);
  clear();
  const sent = await notifications.sendDigests();
  assert.equal(sent, 0);
  assert.equal((await deliveriesOf('request', req.id, 'EMAIL'))[0]?.status, 'SKIPPED');
  assert.equal(mailbox.sent.length,0);
  t.diagnostic(JSON.stringify({ case: 'P7B-N01', channelDisabled: true, emailSent: false }));
});
test('P7B-N02: WhatsApp contact write holds the employee lock until commit', async t => {
  const { Repository } = require('../node_modules/typeorm');
  const original = Repository.prototype.findOne;
  let hit = false, transfer, completed = false;
  Repository.prototype.findOne = async function(...args) {
    if (!hit && this.manager.connection === ds && this.metadata.name === 'EmployeeWhatsappNumber' && this.manager.queryRunner?.isTransactionActive) {
      hit = true;
      transfer = repo('Employee').update({ id: emps.requester.id }, { branchId: org.branchB.id }).then(()=>{completed=true;});
      await new Promise(r=>setTimeout(r,200)); assert.equal(completed,false,'transfer waits for contact write');
    }
    return original.apply(this, args);
  };
  try {
    const response = await request(users.hrA, 'PUT', `/notification-channels/contacts/${emps.requester.id}`, { whatsappNumber: '+966500009999' });
    assert.equal(hit, true); await transfer;
    const row = await repo('EmployeeWhatsappNumber').findOneBy({ employeeId: emps.requester.id });
    assert.equal(row?.number, '966500009999');
    assert.equal((await repo('Employee').findOneBy({ id: emps.requester.id })).branchId, org.branchB.id);
    const retry=await request(users.hrA,'PUT',`/notification-channels/contacts/${emps.requester.id}`,{whatsappNumber:'+966500008888'});
    expectStatus(retry,404); assert.equal((await repo('EmployeeWhatsappNumber').findOneBy({employeeId:emps.requester.id})).number,'966500009999');
    t.diagnostic(JSON.stringify({case:'P7B-N02',response:response.status,transferWaited:true,afterTransfer:retry.status}));
  } finally { Repository.prototype.findOne = original; await transfer; await repo('Employee').update({ id: emps.requester.id }, { branchId: org.branchA.id }); }
});

test('P7B-N03 defect: the next recipient uses the previous event rule after admin disables email during a batch', async t => {
  await setting('notifications.email.enabled','true'); await setting('notifications.quiet_hours','');
  expectStatus(await rule('request.pending_approval',{email:true}),200);
  const manager2=await employee(), requester2=await employee({managerEmployeeId:manager2.id});
  const m2=await account('p7b-manager2','employee',[],{employeeId:manager2.id});
  const r2=await account('p7b-requester2','employee',[],{employeeId:requester2.id});
  for(const user of [users.manager,m2]) expectStatus(await request(user,'PATCH','/notifications/preferences',{category:'approval',channel:'EMAIL',mode:'DIGEST'}),200);
  const reqs=[await submit(users.requester,types.general),await submit(r2,types.general)]; await drain();
  for(const req of reqs) assert.equal((await deliveriesOf('request',req.id,'EMAIL'))[0].status,'DIGEST');
  clear(); const send=mail.send; let disabled=false;
  mail.send=async message=>{
    const result=await send(message);
    if(!disabled){ expectStatus(await rule('request.pending_approval',{email:false}),200); disabled=true; }
    return result;
  };
  try {
    const sent=await notifications.sendDigests(); assert.equal(disabled,true); assert.equal(sent,2);
    assert.equal(mailbox.sent.length,2);
    assert.equal((await channels.ruleOf('request.pending_approval')).rule.email,false);
    t.diagnostic(JSON.stringify({case:'P7B-N03',firstRecipientSent:1,adminDisabledBeforeSecond:true,secondRecipientStillSent:1}));
  } finally { mail.send=send; }
});
test('P7B-N04: failed digest rechecks the event rule on its next attempt', async t => {
  expectStatus(await rule('request.pending_approval',{email:true}),200);
  const req=await submit(users.requester,types.general); await drain(); clear();
  mailbox.failure='simulated temporary test failure';
  try { assert.equal(await notifications.sendDigests(),0); }
  finally { mailbox.failure=null; }
  assert.equal((await deliveriesOf('request',req.id,'EMAIL'))[0].status,'DIGEST');
  expectStatus(await rule('request.pending_approval',{email:false}),200); clear();
  assert.equal(await notifications.sendDigests(),0);
  assert.equal(mailbox.sent.length,0);
  assert.equal((await deliveriesOf('request',req.id,'EMAIL'))[0].status,'SKIPPED');
  t.diagnostic(JSON.stringify({case:'P7B-N04',retrySent:0,status:'SKIPPED'}));
});

test('P7B-N05: transfer before the contact lock rejects the write without changing the saved number', async t => {
  const {EntityManager}=require('../node_modules/typeorm'),original=EntityManager.prototype.query;
  const before=await repo('EmployeeWhatsappNumber').findOneBy({employeeId:emps.requester.id});
  let hit=false;
  EntityManager.prototype.query=async function(sql,...args){
    if(!hit && this.connection===ds && this.queryRunner?.isTransactionActive && /FROM \[employees\] WITH \(UPDLOCK, ROWLOCK\) WHERE \[id\] = @0/.test(sql)){
      hit=true; await repo('Employee').update({id:emps.requester.id},{branchId:org.branchB.id});
    }
    return original.call(this,sql,...args);
  };
  try{
    expectStatus(await request(users.hrA,'PUT','/notification-channels/contacts/'+emps.requester.id,{whatsappNumber:'+966500007777'}),404);
    assert.equal(hit,true);assert.equal((await repo('EmployeeWhatsappNumber').findOneBy({employeeId:emps.requester.id}))?.number,before?.number);
    t.diagnostic(JSON.stringify({case:'P7B-N05',transferCommittedBeforeLock:true,status:404,numberUnchanged:true}));
  }finally{EntityManager.prototype.query=original;await repo('Employee').update({id:emps.requester.id},{branchId:org.branchA.id});}
});

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads, FRONTEND_URL: `${FRONTEND}/` })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  // البريد التجريبي قبل أي حاجة: مفيش رسالة حقيقية بتطلع من الاختبار، وأي محاولة لفتح اتصال SMTP بتفشّل الاختبار
  const { MailService, MailSendError } = require('../src/auth/mail.service')
  mail = app.get(MailService)
  mail.isConfigured = () => mailbox.configured
  mail.transporter = () => { throw new Error('الاختبار حاول يفتح اتصال SMTP حقيقي') }
  mail.send = async message => {
    mailbox.attempts.push(message)
    if (mailbox.failure) throw new MailSendError(mailbox.failure, true)
    mailbox.sent.push(message)
    return { accepted: [message.to], rejected: [], messageId: `test-${mailbox.sent.length}`, response: '250 OK (test)' }
  }
  assert.notEqual(mail.send, MailService.prototype.send)
  // نداء Meta التجريبي قبل أي حاجة: مفيش طلب بيطلع برّه الجهاز
  channels = app.get(require('../src/notifications/channels/notification-channels.service').NotificationChannelsService)
  const { metaHttp } = require('../src/notifications/channels/whatsapp-meta')
  channels.http = async call => { meta.calls.push(call); return meta.respond ? meta.respond(call) : { status: 200, body: JSON.stringify({ messages: [{ id: `wamid.test${meta.calls.length}` }] }) } }
  assert.notEqual(channels.http, metaHttp)
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  queue = app.get(require('../src/queue/queue.service').QueueService)
  notifications = app.get(require('../src/notifications/notifications.service').NotificationsService)
  assert.equal(app.get(require('../src/queue/queue.worker').QueueWorker).enabled, false)
  await setting('company.name', 'شركة الاختبار')

  org.branchA = await repo('Branch').save({ code: 'NC_A', name: 'فرع القنوات أ' })
  org.branchB = await repo('Branch').save({ code: 'NC_B', name: 'فرع القنوات ب' })
  emps.manager = await employee({ phone: '0551112233' })
  emps.requester = await employee({ managerEmployeeId: emps.manager.id })
  emps.hrA = await employee({ managerEmployeeId: emps.manager.id })
  emps.other = await employee({ branchId: org.branchB.id, email: 'other.work@channels.invalid' })
  emps.noAccount = await employee()
  users.admin = await account('admin', 'super_admin', [], { branchId: null })
  users.manager = await account('manager', 'employee', [], { employeeId: emps.manager.id })
  users.requester = await account('requester', 'employee', [], { employeeId: emps.requester.id })
  users.hrA = await account('hr-a', 'hr_manager', ['employees.view', 'employees.edit'], { employeeId: emps.hrA.id })
  users.hrB = await account('hr-b', 'employee', ['employees.view', 'employees.edit'], { branchId: org.branchB.id, employeeId: emps.other.id, email: 'hr.b' })
  // صاحب «إدارة الإعدادات» على كل الفروع بس مش مدير النظام
  users.settings = await account('settings', 'employee', ['settings.manage'], { branchId: null, scopeAllBranches: true })

  const chain = await repo('ApprovalChain').save({ code: 'CHAIN_NC', nameAr: 'سلسلة القنوات', isActive: true, autoApprove: false })
  await repo('ApprovalStep').save([{ chainId: chain.id, stepOrder: 1, approverRole: 'direct_manager_of_requester', slaDays: 1, escalateTo: 'hr' }, { chainId: chain.id, stepOrder: 2, approverRole: 'hr' }])
  types.general = await repo('RequestType').save({ code: 'NC_GENERAL', nameAr: 'طلب قنوات عام', category: 'personal_data', destinationHandler: 'none', approvalChainId: chain.id, isActive: true })
  const secretChain = await repo('ApprovalChain').save({ code: 'CHAIN_NC_SECRET', nameAr: 'سلسلة السري', isActive: true, autoApprove: false })
  await repo('ApprovalStep').save({ chainId: secretChain.id, stepOrder: 1, approverRole: 'hr' })
  types.secret = await repo('RequestType').save({ code: 'NC_SECRET', nameAr: 'بلاغ داخلي حساس', category: 'personal_data', destinationHandler: 'none', approvalChainId: secretChain.id,
    isActive: true, isConfidential: true })
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assertDisposable()
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), os.tmpdir()); assert.match(path.basename(uploads), /^hr-notify-channels-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'notification channels fixture cleanup failed')
})

test('NC-01: الافتراضي = سلوك النظام الحالي، والشاشة لمدير النظام بس', async () => {
  const initial = await state()
  assert.equal(initial.available, true)
  assert.deepEqual([initial.email.enabled, initial.email.passwordSet, initial.email.notificationsEnabled, initial.email.active.source], [false, false, false, 'env'])
  assert.deepEqual([initial.whatsapp.enabled, initial.whatsapp.tokenSet, initial.whatsapp.settings.fallbackToPhone], [false, false, false])
  assert.equal(initial.events.length, require('../src/notifications/notification-events').NOTIFICATION_EVENT_CODES.length)
  // من غير صف محفوظ: داخل النظام والبريد زي ما هم، والواتساب مقفول، ومفيش حدث إلزامي
  for (const event of initial.events) assert.deepEqual([event.inApp, event.email, event.whatsapp, event.mandatory, event.customized, event.whatsappTemplates], [true, true, false, false, false, { ar: null, en: null }], event.code)
  assert.equal(Number((await query('SELECT (SELECT COUNT(*) FROM [notification_channel_settings]) + (SELECT COUNT(*) FROM [notification_event_rules]) + (SELECT COUNT(*) FROM [employee_whatsapp_numbers]) AS [n]'))[0].n), 0)
  // الإعداد لمدير النظام بس: صاحب «إدارة الإعدادات» على كل الفروع مش كفاية، ولا مدير الموارد البشرية ولا الموظف
  for (const [method, route, body] of [['GET', '/notification-channels'], ['PUT', '/notification-channels/email', MAIL], ['POST', '/notification-channels/email/test', { to: 'x@channels.invalid' }],
    ['PUT', '/notification-channels/whatsapp', WHATSAPP], ['POST', '/notification-channels/whatsapp/test', { to: '+966500000001', eventCode: 'request.pending_approval' }],
    ['PUT', '/notification-channels/events/request.pending_approval', { inApp: true, email: true, whatsapp: true, mandatory: false }]]) {
    assert.equal(expectStatus(await request(users.settings, method, route, body), 403).message, 'قنوات الإشعارات لمدير النظام بس', route)
    expectStatus(await request(users.hrA, method, route, body), 403)
    expectStatus(await request(users.requester, method, route, body), 403)
    expectStatus(await request(null, method, route, body), 401)
  }
  assert.equal(Number((await query('SELECT COUNT(*) AS [n] FROM [notification_channel_settings]'))[0].n), 0)
  // والمحرك زي ما هو: البريد مقفول = ولا صف ولا رسالة؛ ومفتوح = بريد للمعتمد ومن غير أي صف واتساب
  const quiet = await submit(users.requester, types.general)
  await drain()
  assert.deepEqual([mailbox.attempts.length, meta.calls.length, (await deliveriesOf('request', quiet.id)).length], [0, 0, 0])
  await setting('notifications.email.enabled', 'true')
  const req = await submit(users.requester, types.general)
  await drain()
  assert.deepEqual((await deliveriesOf('request', req.id)).map(row => [row.channel, row.status, row.recipientUserId]), [['EMAIL', 'SENT', users.manager.id]])
  assert.deepEqual([mailbox.sent.map(message => message.to), meta.calls.length], [['manager@channels.invalid'], 0])
  const mine = expectStatus(await request(users.manager, 'GET', '/notifications/preferences'), 200)
  assert.deepEqual([mine.whatsappEnabled, mine.locked, mine.mandatory, mine.contact], [false, [], {}, { email: 'manager@channels.invalid', whatsapp: null }])
  assert.deepEqual(Object.keys(mine.categories[0]).sort(), ['email', 'inApp', 'key', 'label'], 'شكل صف الفئة القايم زي ما هو')
})

test('NC-02: خادم البريد من الشاشة — كلمة السر مختومة ومابترجعش، والإعداد المحفوظ بياخد مكان إعداد الخادم من غير إعادة تشغيل', async () => {
  const envHost = mail.config.host
  for (const [body, text] of [[{ ...MAIL, host: 'bad host' }, /اسم خادم البريد/], [{ ...MAIL, host: 'http://smtp.example.com' }, /اسم خادم البريد/], [{ ...MAIL, port: 70000 }, /منفذ/],
    [{ ...MAIL, encryption: 'NONE' }, /تشفير/], [{ ...MAIL, fromAddress: 'مش بريد' }, /عنوان المرسل/], [{ ...MAIL, fromName: 'اسم "مكسور"' }, /اسم المرسل/], [{ ...MAIL, preset: 'YAHOO' }, /نوع خادم البريد/],
    [{ ...MAIL, password: 'سطر\nتاني' }, /كلمة سر البريد/]]) {
    assert.match(expectStatus(await admin('PUT', '/notification-channels/email', body), 400).message, text)
  }
  // مستخدم من غير كلمة سر: الإعداد مايتفعّلش
  assert.match(expectStatus(await admin('PUT', '/notification-channels/email', { ...MAIL, enabled: true }), 400).message, /اكتب كلمة سر البريد/)
  const saved = expectStatus(await admin('PUT', '/notification-channels/email', { ...MAIL, enabled: true, password: MAIL_PASSWORD }), 200)
  assert.deepEqual([saved.email.enabled, saved.email.passwordSet, saved.email.passwordReadable, saved.email.settings], [true, true, true, MAIL])
  assert.deepEqual(saved.email.active, { configured: true, server: 'smtp.office365.com:587', from: '"الموارد البشرية" <hr@channels.invalid>', source: 'screen' })
  assert.equal(JSON.stringify(saved).includes(MAIL_PASSWORD), false, 'كلمة السر مابترجعش في الرد')
  assert.equal(JSON.stringify(await state()).includes(MAIL_PASSWORD), false)
  // في القاعدة مختومة (AES-GCM بمفتاح مشتق من سر الخادم): لا نص ولا base64 لكلمة السر
  const [row] = await query(`SELECT [enabled], [config], [secret] FROM [notification_channel_settings] WHERE [channel] = N'EMAIL'`)
  assert.match(row.secret, /^n1\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/)
  assert.equal([row.secret, row.config].some(text => text.includes(MAIL_PASSWORD) || text.includes(Buffer.from(MAIL_PASSWORD).toString('base64'))), false)
  assert.equal(require('../src/notifications/channels/channel-rules').openChannelSecret(row.secret, secret), MAIL_PASSWORD)
  assert.equal(require('../src/notifications/channels/channel-rules').openChannelSecret(row.secret, 'سر خادم تاني'), null)
  // الإعداد الشغال في MailService بقى المحفوظ — من غير إعادة تشغيل — وTLS إلزامي وشهادة الخادم بتتفحص
  assert.deepEqual([mail.config.host, mail.config.port, mail.config.secure, mail.config.requireTls, mail.config.rejectUnauthorized, mail.config.user, mail.config.password],
    ['smtp.office365.com', 587, false, true, true, 'hr@channels.invalid', MAIL_PASSWORD])
  // سجل التدقيق: مين غيّر إيه — من غير كلمة السر
  const audits = await query(`SELECT [action], [entityType], [entityId], [actorUserId], [summary], [before], [after] FROM [audit_log] WHERE [action] = N'NOTIFICATION_CHANNEL_CHANGED' ORDER BY [id]`)
  assert.equal(audits.length, 1)
  assert.deepEqual([audits[0].entityType, audits[0].entityId, audits[0].actorUserId], ['notification_channel', 'EMAIL', users.admin.id])
  assert.deepEqual(JSON.parse(audits[0].after), { enabled: true, ...MAIL, sealedValueSet: true, sealedValueChanged: true })
  assert.equal(JSON.stringify(audits).includes(MAIL_PASSWORD), false)
  // حفظ من غير كلمة سر = المحفوظة زي ما هي؛ واختيار جاهز تاني بيتحفظ
  const google = expectStatus(await admin('PUT', '/notification-channels/email', { ...MAIL, preset: 'GOOGLE_WORKSPACE', host: 'smtp.gmail.com', port: 465, encryption: 'SSL', enabled: true }), 200)
  assert.deepEqual([google.email.passwordSet, google.email.active.server], [true, 'smtp.gmail.com:465'])
  assert.deepEqual([mail.config.secure, mail.config.requireTls, mail.config.password], [true, false, MAIL_PASSWORD])
  // رسالة التجربة بالإعداد الشغال — العنوان متخفي في الرد وفي التدقيق
  clear()
  assert.match(expectStatus(await admin('POST', '/notification-channels/email/test', { to: 'مش عنوان' }), 400).message, /عنوان بريد صالح/)
  const tested = expectStatus(await admin('POST', '/notification-channels/email/test', { to: 'owner@channels.invalid' }), 201)
  assert.deepEqual([tested.ok, tested.to, tested.source], [true, 'ow***@channels.invalid', 'screen'])
  assert.deepEqual(mailbox.sent.map(message => [message.to, message.subject]), [['owner@channels.invalid', 'رسالة تجربة من نظام الموارد البشرية']])
  mailbox.failure = '535 5.7.3 Authentication unsuccessful for hr@channels.invalid | code=EAUTH'
  const failed = expectStatus(await admin('POST', '/notification-channels/email/test', { to: 'owner@channels.invalid' }), 201)
  mailbox.failure = null
  assert.equal(failed.ok, false)
  assert.match(failed.detail, /Authentication unsuccessful for h\*+@channels\.invalid/)
  assert.equal(failed.detail.includes('hr@channels.invalid'), false, 'سبب الفشل من غير عنوان كامل')
  assert.equal(Number((await query(`SELECT COUNT(*) AS [n] FROM [audit_log] WHERE [action] = N'NOTIFICATION_CHANNEL_TESTED' AND [entityId] = N'EMAIL' AND [summary] LIKE N'%ow***@channels.invalid%'`))[0].n), 2)
  // مسح كلمة السر والإعداد مفعّل بمستخدم = مرفوض؛ وقفل الإعداد بيرجّع إعداد الخادم
  assert.match(expectStatus(await admin('PUT', '/notification-channels/email', { ...MAIL, enabled: true, password: '' }), 400).message, /اكتب كلمة سر البريد/)
  const off = expectStatus(await admin('PUT', '/notification-channels/email', { ...MAIL, enabled: false, password: '' }), 200)
  assert.deepEqual([off.email.enabled, off.email.passwordSet, off.email.active.source], [false, false, 'env'])
  assert.equal(mail.config.host, envHost)
  assert.equal((await query(`SELECT [secret] FROM [notification_channel_settings] WHERE [channel] = N'EMAIL'`))[0].secret, null)
})

test('NC-03: الواتساب من الشاشة — التوكن مختوم ومابيرجعش، وربط قالب Meta بمتغيرات الحدث، ورسالة التجربة على خادم Meta بس', async () => {
  for (const [body, text] of [[{ ...WHATSAPP, phoneNumberId: 'abc' }, /Phone number ID/], [{ ...WHATSAPP, apiVersion: 'latest' }, /إصدار/], [{ ...WHATSAPP, provider: 'TWILIO' }, /مزوّد/],
    [{ ...WHATSAPP, defaultCountryCode: 'sa' }, /كود الدولة/], [{ ...WHATSAPP, defaultCountryCode: '', phoneNumber: '0500000000' }, /رقم واتساب الشركة/]]) {
    assert.match(expectStatus(await admin('PUT', '/notification-channels/whatsapp', body), 400).message, text)
  }
  assert.match(expectStatus(await admin('PUT', '/notification-channels/whatsapp', { ...WHATSAPP, enabled: true }), 400).message, /اكتب توكن الواتساب/)
  const saved = expectStatus(await admin('PUT', '/notification-channels/whatsapp', { ...WHATSAPP, enabled: false, token: WA_TOKEN }), 200)
  assert.deepEqual([saved.whatsapp.enabled, saved.whatsapp.tokenSet, saved.whatsapp.tokenReadable, saved.whatsapp.settings.phoneNumber, saved.whatsapp.settings.phoneNumberId],
    [false, true, true, '966500000000', PHONE_ID])
  assert.equal(JSON.stringify(saved).includes(WA_TOKEN), false, 'التوكن مابيرجعش في الرد')
  const [row] = await query(`SELECT [config], [secret] FROM [notification_channel_settings] WHERE [channel] = N'WHATSAPP'`)
  assert.match(row.secret, /^n1\./)
  assert.equal([row.secret, row.config].some(text => text.includes(WA_TOKEN)), false)
  const [audit] = await query(`SELECT TOP (1) [before], [after] FROM [audit_log] WHERE [action] = N'NOTIFICATION_CHANNEL_CHANGED' AND [entityId] = N'WHATSAPP' ORDER BY [id] DESC`)
  assert.equal(JSON.stringify(audit).includes(WA_TOKEN), false)
  assert.equal(JSON.parse(audit.after).sealedValueSet, true)
  // ربط القالب: اسم Meta وكود اللغة ومتغيرات الحدث نفسه بس
  for (const [binding, text] of [[{ ...PENDING_BINDING, templateName: 'Approval Pending' }, /اسم قالب الواتساب/], [{ ...PENDING_BINDING, languageCode: 'arabic' }, /كود لغة/],
    [{ ...PENDING_BINDING, variables: ['payslip.period'] }, /متغير غير معروف/], [{ ...PENDING_BINDING, variables: 'link' }, /قايمة/]]) {
    assert.match(expectStatus(await rule('request.pending_approval', { whatsappTemplates: { ar: binding } }), 400).message, text)
  }
  // التجربة قبل الربط مرفوضة، ومفيش نداء بيطلع
  clear()
  assert.match(expectStatus(await admin('POST', '/notification-channels/whatsapp/test', { to: '+966500000009', eventCode: 'request.pending_approval' }), 400).message, /اربط قالب واتساب/)
  const bound = expectStatus(await rule('request.pending_approval', { whatsappTemplates: { ar: PENDING_BINDING } }), 200)
  assert.deepEqual([eventOf(bound, 'request.pending_approval').whatsappTemplates.ar, eventOf(bound, 'request.pending_approval').customized, eventOf(bound, 'request.pending_approval').whatsapp],
    [PENDING_BINDING, true, false])
  assert.match(expectStatus(await admin('POST', '/notification-channels/whatsapp/test', { to: '12345', eventCode: 'request.pending_approval' }), 400).message, /رقم واتساب دولي/)
  assert.equal(meta.calls.length, 0)
  // التجربة والقناة لسه مقفولة: نداء واحد لخادم Meta بالتوكن في الترويسة بس، وبقيم توضيحية
  const tested = expectStatus(await admin('POST', '/notification-channels/whatsapp/test', { to: '+966 50 000 0009', eventCode: 'request.pending_approval' }), 201)
  assert.deepEqual([tested.ok, tested.to], [true, '+9665******09'])
  assert.equal(meta.calls.length, 1)
  const [call] = meta.calls
  assert.equal(call.url, `https://graph.facebook.com/v21.0/${PHONE_ID}/messages`)
  assert.deepEqual([call.headers.Authorization, call.body.includes(WA_TOKEN)], [`Bearer ${WA_TOKEN}`, false])
  assert.deepEqual([sentBody(call).messaging_product, sentBody(call).to, sentBody(call).type, sentBody(call).template.name, sentBody(call).template.language], ['whatsapp', '966500000009', 'template', 'approval_pending', { code: 'ar' }])
  assert.deepEqual(parametersOf(call), ['إجازة سنوية', 'سارة أحمد — بيانات توضيحية', 'https://hr.example.invalid/requests'])
  // فشل Meta بيرجع بسببه من غير التوكن
  meta.respond = () => ({ status: 401, body: JSON.stringify({ error: { message: `Invalid OAuth access token ${WA_TOKEN}`, code: 190 } }) })
  const failed = expectStatus(await admin('POST', '/notification-channels/whatsapp/test', { to: '+966500000009', eventCode: 'request.pending_approval' }), 201)
  meta.respond = null
  assert.equal(failed.ok, false)
  assert.match(failed.detail, /Meta 401 code=190/)
  assert.equal(failed.detail.includes(WA_TOKEN), false)
  // النداء الحقيقي نفسه مابيطلعش لأي عنوان غير خادم Meta
  const { metaHttp } = require('../src/notifications/channels/whatsapp-meta')
  for (const url of ['https://example.invalid/v21.0/1/messages', 'http://graph.facebook.com/v21.0/1/messages', 'https://graph.facebook.com.evil.invalid/x', 'https://graph.facebook.com:8443/x']) {
    await assert.rejects(metaHttp({ url, headers: {}, body: '{}', timeoutMs: 1000 }), /خادم Meta/, url)
  }
})

test('NC-04: «خلص لما» — طلب مستني اعتماد وصل للمعتمد على البريد والواتساب، والسجل بيقول اتبعتت', async () => {
  // رقم المعتمد في ملفه، والقناة مفتوحة، والواتساب مفتوح للحدث
  expectStatus(await request(users.hrA, 'PUT', `/notification-channels/contacts/${emps.manager.id}`, { whatsappNumber: '+966 55 111 2233' }), 200)
  expectStatus(await admin('PUT', '/notification-channels/whatsapp', { ...WHATSAPP, enabled: true }), 200)
  assert.equal(await channels.whatsapp.enabled(), true)
  expectStatus(await rule('request.pending_approval', { whatsapp: true }), 200)
  clear()
  const req = await submit(users.requester, types.general)
  await drain()
  const rows = await deliveriesOf('request', req.id)
  assert.deepEqual(rows.map(row => [row.channel, row.status, row.attempts, row.recipientUserId, row.address, row.detail]),
    [['EMAIL', 'SENT', 1, users.manager.id, 'ma*****@channels.invalid', null], ['WHATSAPP', 'SENT', 1, users.manager.id, '+9665******33', null]])
  assert.ok(rows.every(row => row.sentAt && row.subject === null && row.body === null), 'النص المجهّز بيتمسح بعد الإرسال')
  assert.deepEqual(mailbox.sent.map(message => message.to), ['manager@channels.invalid'])
  assert.equal(meta.calls.length, 1)
  assert.deepEqual([sentBody(meta.calls[0]).to, sentBody(meta.calls[0]).template.name], ['966551112233', 'approval_pending'])
  assert.deepEqual(parametersOf(meta.calls[0]), ['طلب قنوات عام', emps.requester.fullName, `${FRONTEND}/approvals-inbox?request=${req.id}`])
  assert.equal(meta.calls[0].body.includes('محتوى خاص'), false, 'محتوى الطلب مابيتبعتش')
  // السجل بيقول اتبعتت على الاتنين — من غير رقم ولا عنوان كامل
  const log = expectStatus(await admin('GET', '/notifications/deliveries?event=request.pending_approval&status=SENT'), 200)
  const mine = log.rows.filter(row => row.recipientUserId === users.manager.id).slice(0, 2)
  assert.deepEqual(mine.map(row => [row.channel, row.status, row.address]).sort(), [['EMAIL', 'SENT', 'ma*****@channels.invalid'], ['WHATSAPP', 'SENT', '+9665******33']])
  assert.equal(JSON.stringify(log).includes('966551112233'), false)
  assert.deepEqual([log.whatsappEnabled, log.whatsappCounts.SENT], [true, 1])
  // مهمة اتعادت لنفس الرسالة مابتبعتش تاني
  await notifications.sendWhatsapp(String(rows[1].id), { attempt: 1, maxAttempts: 10 })
  assert.equal(meta.calls.length, 1)
  const prefs = expectStatus(await request(users.manager, 'GET', '/notifications/preferences'), 200)
  assert.deepEqual([prefs.whatsappEnabled, prefs.whatsapp.approval, prefs.contact], [true, 'ON', { email: 'manager@channels.invalid', whatsapp: '+966551112233' }])
})

test('NC-05: الطلب السري — القالب العام على القناتين من غير نوع ولا اسم، ومستلمه مخفي في السجل', async () => {
  // السري مايقبلش متغير النوع ولا اسم صاحب الطلب حتى في ربط الواتساب
  assert.match(expectStatus(await rule('request.confidential', { whatsapp: true, whatsappTemplates: { ar: { templateName: 'confidential_update', languageCode: 'ar', variables: ['request.type'] } } }), 400).message, /متغير غير معروف/)
  expectStatus(await rule('request.confidential', { whatsapp: true, whatsappTemplates: { ar: { templateName: 'confidential_update', languageCode: 'ar', variables: ['recipient.name', 'link'] } } }), 200)
  expectStatus(await request(users.hrA, 'PUT', `/notification-channels/contacts/${emps.hrA.id}`, { whatsappNumber: '+966552223344' }), 200)
  clear()
  const req = await submit(users.requester, types.secret)
  await drain()
  const rows = (await deliveriesOf('request', req.id)).filter(row => row.recipientUserId === users.hrA.id)
  assert.deepEqual(rows.map(row => [row.channel, row.status, row.eventCode]), [['EMAIL', 'SENT', 'request.confidential'], ['WHATSAPP', 'SENT', 'request.confidential']])
  const call = meta.calls.find(item => sentBody(item).to === '966552223344')
  assert.equal(sentBody(call).template.name, 'confidential_update')
  assert.deepEqual(parametersOf(call), ['حساب hr-a', `${FRONTEND}/approvals-inbox?request=${req.id}`])
  for (const text of [call.body, ...mailbox.sent.map(message => `${message.subject}\n${message.text}`)]) {
    assert.equal(['بلاغ داخلي حساس', emps.requester.fullName, 'محتوى خاص'].some(hidden => text.includes(hidden)), false, text)
  }
  const log = expectStatus(await admin('GET', '/notifications/deliveries?event=request.confidential'), 200)
  assert.ok(log.rows.length >= 2 && log.rows.every(row => row.recipientUserId === null && row.recipientName === null && row.address === null))
})

test('NC-06: حدث من غير قالب واتساب «اتخطّى»، ومستلم من غير رقم «اتخطّى»، وموبايل الملف بياخد مكانه لما الإدارة تفتح الاختيار بس', async () => {
  // «قرار طلبك» مفتوح له الواتساب من غير قالب مربوط
  expectStatus(await rule('request.decided', { whatsapp: true }), 200)
  clear()
  const req = await submit(users.requester, types.general)
  await drain()
  await act(users.manager, req.id, 'REJECT', 'رفض')
  await drain()
  const decided = (await deliveriesOf('request', req.id)).filter(row => row.eventCode === 'request.decided')
  assert.deepEqual(decided.map(row => [row.channel, row.status, row.detail, row.address]),
    [['EMAIL', 'SENT', null, 're*******@channels.invalid'], ['WHATSAPP', 'SKIPPED', 'الحدث مالوش قالب واتساب مربوط', null]])
  assert.equal(meta.calls.filter(call => sentBody(call).template.name !== 'approval_pending').length, 0)
  // المعتمد من غير رقم واتساب: «اتخطّى» بسببه — وموبايله المحلي مابيتستعملش من غير ما الإدارة تفتح الاختيار
  expectStatus(await request(users.hrA, 'PUT', `/notification-channels/contacts/${emps.manager.id}`, { whatsappNumber: '' }), 200)
  clear()
  const noNumber = await submit(users.requester, types.general)
  await drain()
  const skipped = (await deliveriesOf('request', noNumber.id, 'WHATSAPP'))[0]
  assert.deepEqual([skipped.status, skipped.detail, skipped.address, meta.calls.length], ['SKIPPED', 'مفيش رقم واتساب في ملف الموظف', null, 0])
  // الاختيار مفتوح: موبايل الملف (05…) بيتحوّل بكود الدولة الافتراضي
  expectStatus(await admin('PUT', '/notification-channels/whatsapp', { ...WHATSAPP, enabled: true, fallbackToPhone: true }), 200)
  const viaPhone = await submit(users.requester, types.general)
  await drain()
  const sent = (await deliveriesOf('request', viaPhone.id, 'WHATSAPP'))[0]
  assert.deepEqual([sent.status, sent.address, sentBody(meta.calls.at(-1)).to], ['SENT', '+9665******33', '966551112233'])
  expectStatus(await admin('PUT', '/notification-channels/whatsapp', { ...WHATSAPP, enabled: true }), 200)
  expectStatus(await request(users.hrA, 'PUT', `/notification-channels/contacts/${emps.manager.id}`, { whatsappNumber: '+966551112233' }), 200)
})

test('NC-07: اختيار المستخدم «مقفول» محترم على الواتساب، و«إلزامي» بيلغيه، وصفحة المستخدم بتقول إيه الإلزامي', async () => {
  const prefer = (channel, mode) => request(users.manager, 'PATCH', '/notifications/preferences', { category: 'approval', channel, mode })
  assert.equal(expectStatus(await prefer('WHATSAPP', 'DIGEST'), 400).message, 'الملخص اليومي للبريد بس')
  const off = expectStatus(await prefer('WHATSAPP', 'OFF'), 200)
  assert.deepEqual([off.whatsapp.approval, off.categories.find(row => row.key === 'approval').email], ['OFF', 'ON'])
  expectStatus(await prefer('EMAIL', 'DIGEST'), 200)
  clear()
  const req = await submit(users.requester, types.general)
  await drain()
  assert.deepEqual((await deliveriesOf('request', req.id)).map(row => [row.channel, row.status, row.detail]),
    [['EMAIL', 'DIGEST', null], ['WHATSAPP', 'SKIPPED', 'المستخدم قافل واتساب الفئة دي']])
  assert.deepEqual([mailbox.attempts.length, meta.calls.length], [0, 0])
  // الإدارة علّمت الحدث «إلزامي»: القفل والملخص مابيتطبقوش عليه
  const mandatory = expectStatus(await rule('request.pending_approval', { whatsapp: true, mandatory: true }), 200)
  assert.equal(eventOf(mandatory, 'request.pending_approval').mandatory, true)
  const forced = await submit(users.requester, types.general)
  await drain()
  assert.deepEqual((await deliveriesOf('request', forced.id)).map(row => [row.channel, row.status]), [['EMAIL', 'SENT'], ['WHATSAPP', 'SENT']])
  assert.deepEqual([mailbox.sent.length, meta.calls.length], [1, 1])
  // صفحة المستخدم: الحدث الإلزامي باسمه؛ والفئة مش مقفولة كلها (التصعيد لسه اختياري)
  let mine = expectStatus(await request(users.manager, 'GET', '/notifications/preferences'), 200)
  assert.deepEqual([mine.mandatory, mine.locked], [{ approval: ['طلب بانتظار اعتمادك'] }, []])
  // كل أحداث الفئة إلزامية = الفئة مقفولة والقفل مابيتحفظش
  expectStatus(await rule('request.escalated', { mandatory: true }), 200)
  mine = expectStatus(await request(users.manager, 'GET', '/notifications/preferences'), 200)
  assert.deepEqual([mine.mandatory.approval, mine.locked], [['طلب بانتظار اعتمادك', 'طلب تم تصعيده لك'], ['approval']])
  assert.match(expectStatus(await prefer('WHATSAPP', 'OFF'), 400).message, /إلزامية من الإدارة/)
  expectStatus(await prefer('WHATSAPP', 'ON'), 200)
  // رجوع القاعدة للافتراضي من غير ربط = الصف بيتمسح
  const reset = expectStatus(await rule('request.escalated', {}), 200)
  assert.equal(eventOf(reset, 'request.escalated').customized, false)
  assert.equal(Number((await query(`SELECT COUNT(*) AS [n] FROM [notification_event_rules] WHERE [eventCode] = N'request.escalated'`))[0].n), 0)
  expectStatus(await rule('request.pending_approval', { whatsapp: true }), 200)
  expectStatus(await prefer('EMAIL', 'ON'), 200)
  assert.ok(Number((await query(`SELECT COUNT(*) AS [n] FROM [audit_log] WHERE [action] = N'NOTIFICATION_EVENT_RULE_CHANGED'`))[0].n) >= 6)
})

test('NC-08: ساعات الهدوء بتأجّل الواتساب، وفشل المزوّد: إعادة محاولة، والرقم المرفوض «فشل» من غير إعادة، والتوكن المرفوض بيوقّف الإرسال', async () => {
  const now = new Date()
  const clock = offset => {
    const minute = (((now.getHours() * 60 + now.getMinutes() + offset) % 1440) + 1440) % 1440
    return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
  }
  await setting('notifications.quiet_hours', `${clock(-60)}-${clock(120)}`)
  clear()
  const quiet = await submit(users.requester, types.general)
  await drain()
  const [waiting] = await deliveriesOf('request', quiet.id, 'WHATSAPP')
  assert.deepEqual([waiting.status, meta.calls.length, mailbox.attempts.length], ['PENDING', 0, 0])
  const job = (await whatsappJobs()).find(row => row.deliveryId === String(waiting.id))
  assert.ok(job.status === 'PENDING' && job.delay > 3600 && job.delay <= 2 * 3600 + 90, `مهمة الواتساب متأجلة ${job.delay} ثانية`)
  // المهمة اتسحبت جوه ساعات الهدوء برضه: بتتأجل تاني ومابتبعتش
  await notifications.sendWhatsapp(String(waiting.id), { attempt: 1, maxAttempts: 10 })
  assert.equal(meta.calls.length, 0)
  await setting('notifications.quiet_hours', '')
  // عطل عند Meta (500): المحاولة بتتسجل والمهمة بتتعاد
  meta.respond = () => ({ status: 500, body: JSON.stringify({ error: { message: 'Internal error', code: 131000 } }) })
  await assert.rejects(notifications.sendWhatsapp(String(waiting.id), { attempt: 1, maxAttempts: 10 }), /تعذر إرسال واتساب الإشعار: Meta 500 code=131000/)
  let [row] = await deliveriesOf('request', quiet.id, 'WHATSAPP')
  assert.deepEqual([row.status, row.attempts, row.detail], ['PENDING', 1, 'Meta 500 code=131000: Internal error'])
  // آخر محاولة = «فشل» بسببه
  await assert.rejects(notifications.sendWhatsapp(String(waiting.id), { attempt: 10, maxAttempts: 10 }))
  ;[row] = await deliveriesOf('request', quiet.id, 'WHATSAPP')
  assert.deepEqual([row.status, row.attempts], ['FAILED', 2])
  // الرقم مش على واتساب (131026): «فشل» من أول مرة ومن غير إعادة، والسبب من غير الرقم الكامل
  meta.respond = () => ({ status: 400, body: JSON.stringify({ error: { message: 'Message undeliverable to 966551112233', code: 131026 } }) })
  const rejected = await submit(users.requester, types.general)
  await drain()
  ;[row] = await deliveriesOf('request', rejected.id, 'WHATSAPP')
  assert.deepEqual([row.status, row.attempts], ['FAILED', 1])
  assert.match(row.detail, /^Meta 400 code=131026: Message undeliverable to \+9665\*+33$/)
  assert.equal((await whatsappJobs()).find(item => item.deliveryId === String(row.id)).status, 'DONE')
  // التوكن اترفض (401): الإرسال بيقف دقيقة — الرسالة اللي بعدها بتفشل فورًا من غير نداء، والبريد ماشي عادي
  meta.respond = () => ({ status: 401, body: JSON.stringify({ error: { message: 'Error validating access token', code: 190 } }) })
  const first = await submit(users.requester, types.general)
  await drain()
  const callsAfterFirst = meta.calls.length
  const second = await submit(users.requester, types.general)
  await drain()
  assert.equal(meta.calls.length, callsAfterFirst, 'والمزوّد واقف مفيش نداء جديد')
  ;[row] = await deliveriesOf('request', second.id, 'WHATSAPP')
  assert.deepEqual([row.status, row.detail], ['PENDING', 'مزوّد الواتساب مش بيرد — الإرسال واقف دقيقة وهيتجرّب تاني'])
  assert.deepEqual((await deliveriesOf('request', second.id, 'EMAIL')).map(item => item.status), ['SENT'])
  assert.equal((await repo('Request').findOneByOrFail({ id: first.id })).status, 'UNDER_REVIEW', 'فشل الواتساب مابيلمسش الطلب')
  // المزوّد رجع: المهمة اللي اتعادت بتبعت
  meta.respond = null
  notifications.resumeWhatsapp()
  await notifications.sendWhatsapp(String(row.id), { attempt: 2, maxAttempts: 10 })
  ;[row] = await deliveriesOf('request', second.id, 'WHATSAPP')
  assert.deepEqual([row.status, row.detail], ['SENT', null])
  await query(`UPDATE [jobs_queue] SET [status] = N'DONE' WHERE [jobType] = N'notifications.whatsapp' AND [status] <> N'DONE'`)
})

test('NC-09: القناة المقفولة = ولا صف؛ واللي اتقفلت قبل الإرسال «اتخطّى»؛ وجدول الحدث × القناة بيقفل البريد أو داخل النظام للحدث لوحده', async () => {
  // البريد مقفول للحدث ده بس: واتساب من غير بريد
  expectStatus(await rule('request.pending_approval', { whatsapp: true, email: false }), 200)
  clear()
  const onlyWhatsapp = await submit(users.requester, types.general)
  await drain()
  assert.deepEqual((await deliveriesOf('request', onlyWhatsapp.id)).map(row => [row.channel, row.status]), [['WHATSAPP', 'SENT']])
  assert.equal(mailbox.attempts.length, 0)
  // بريد الشركة مقفول والواتساب مفتوح: الحدث لسه بيتوزع على الواتساب (ماكانش بيتوزع أصلًا والبريد مقفول)
  await setting('notifications.email.enabled', 'false')
  expectStatus(await rule('request.pending_approval', { whatsapp: true }), 200)
  const emailClosed = await submit(users.requester, types.general)
  await drain()
  assert.deepEqual((await deliveriesOf('request', emailClosed.id)).map(row => [row.channel, row.status]), [['WHATSAPP', 'SENT']])
  await setting('notifications.email.enabled', 'true')
  // رسالة متأجلة (ساعات هدوء) والقناة اتقفلت للحدث، أو اتقفلت خالص، قبل ما تطلع
  const far = new Date(Date.now() + 3 * 3600_000), clock = date => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  await setting('notifications.quiet_hours', `${clock(new Date(Date.now() - 3600_000))}-${clock(far)}`)
  const delayedA = await submit(users.requester, types.general), delayedB = await submit(users.requester, types.general)
  await drain()
  await setting('notifications.quiet_hours', '')
  clear()
  expectStatus(await rule('request.pending_approval', { whatsapp: false }), 200)
  const [pendingA] = await deliveriesOf('request', delayedA.id, 'WHATSAPP')
  // طلب أحدث لنفس الحدث على كيان تاني مابيلغيش ده: كل طلب بإشعاره
  await notifications.sendWhatsapp(String(pendingA.id), { attempt: 1, maxAttempts: 10 })
  assert.deepEqual((await deliveriesOf('request', delayedA.id, 'WHATSAPP')).map(row => [row.status, row.detail, row.body]), [['SKIPPED', 'القناة اتقفلت للحدث ده من «قنوات الإشعارات» قبل الإرسال', null]])
  expectStatus(await rule('request.pending_approval', { whatsapp: true }), 200)
  expectStatus(await admin('PUT', '/notification-channels/whatsapp', { ...WHATSAPP, enabled: false }), 200)
  const [pendingB] = await deliveriesOf('request', delayedB.id, 'WHATSAPP')
  await notifications.sendWhatsapp(String(pendingB.id), { attempt: 1, maxAttempts: 10 })
  assert.deepEqual((await deliveriesOf('request', delayedB.id, 'WHATSAPP')).map(row => [row.status, row.detail]), [['SKIPPED', 'الواتساب اتقفل من الإعدادات قبل الإرسال']])
  assert.equal(meta.calls.length, 0)
  // القناة مقفولة: ولا صف واتساب جديد
  const closed = await submit(users.requester, types.general)
  await drain()
  assert.deepEqual((await deliveriesOf('request', closed.id)).map(row => row.channel), ['EMAIL'])
  assert.equal(meta.calls.length, 0)
  await query(`UPDATE [jobs_queue] SET [status] = N'DONE' WHERE [status] <> N'DONE'`)
  expectStatus(await admin('PUT', '/notification-channels/whatsapp', { ...WHATSAPP, enabled: true }), 200)
  // حدث ليه عنصر مخزّن في القايمة: «داخل النظام» بيتقفل له من الجدول (والعدّاد المحسوب مالوش اختيار)
  const auth = app.get(require('../src/auth/auth.service').AuthService)
  const [payload] = await auth.accountPayloads([await repo('User').findOneByOrFail({ id: users.manager.id })])
  const deliver = (id, code) => notifications.deliver({ event: { id: String(id), type: 'TEST', entityType: 'schedule_publication', entityId: String(id), payload: {} }, code, category: 'schedule', kind: 'info',
    recipients: [payload], entityType: 'schedule_publication', entityId: id, link: '/notifications', values: { 'schedule.week': '2026-10-11' } })
  assert.equal(await deliver(910001, 'schedule.published'), 1)
  assert.deepEqual((await deliveriesOf('schedule_publication', 910001)).map(row => [row.channel, row.status]), [['IN_APP', 'SENT'], ['EMAIL', 'PENDING']])
  expectStatus(await rule('schedule.published', { inApp: false }), 200)
  assert.equal(await deliver(910002, 'schedule.published'), 1)
  assert.deepEqual((await deliveriesOf('schedule_publication', 910002)).map(row => [row.channel, row.status, row.detail]),
    [['IN_APP', 'SKIPPED', 'الإشعار داخل النظام مقفول للحدث ده من «قنوات الإشعارات»'], ['EMAIL', 'PENDING', null]])
  assert.equal((await query(`SELECT [inApp] FROM [notifications] WHERE [entityType] = N'schedule_publication' AND [entityId] = N'910002'`))[0].inApp, false)
  // كل القنوات مقفولة للحدث = ولا صف
  expectStatus(await rule('schedule.published', { inApp: false, email: false }), 200)
  assert.equal(await deliver(910003, 'schedule.published'), 0)
  // العدّاد المحسوب: «داخل النظام» بيفضل مفتوح حتى لو الطلب قال مقفول
  assert.equal(eventOf(expectStatus(await rule('request.decided', { inApp: false, whatsapp: true }), 200), 'request.decided').inApp, true)
  await query(`UPDATE [jobs_queue] SET [status] = N'DONE' WHERE [status] <> N'DONE'`)
})

test('NC-10: رقم واتساب الموظف بنطاق الفروع والصلاحية، ومين ناقصه رقم أو بريد', async () => {
  const contact = (user, id, method = 'GET', body) => request(user, method, `/notification-channels/contacts/${id}`, body)
  expectStatus(await contact(users.requester, emps.manager.id), 403)
  expectStatus(await contact(null, emps.manager.id), 401)
  // موظف برّه نطاق فروع القارئ = مش موجود (قراءة وكتابة)
  assert.equal(expectStatus(await contact(users.hrB, emps.manager.id), 404).message, 'الموظف غير موجود')
  expectStatus(await contact(users.hrB, emps.manager.id, 'PUT', { whatsappNumber: '+966500000111' }), 404)
  expectStatus(await contact(users.hrA, 999999), 404)
  assert.deepEqual(expectStatus(await contact(users.hrA, emps.manager.id), 200), { available: true, whatsappNumber: '+966551112233', email: null, phone: '0551112233' })
  for (const bad of ['12', 'abc', '+0123456789']) assert.match(expectStatus(await contact(users.hrA, emps.requester.id, 'PUT', { whatsappNumber: bad }), 400).message, /رقم الواتساب لازم يتكتب دولي/)
  // المحلي بيتحوّل بكود الدولة الافتراضي، والأرقام العربية مقبولة
  assert.equal(expectStatus(await contact(users.hrA, emps.requester.id, 'PUT', { whatsappNumber: '٠٥٥ ٤٤٤ ٥٥٦٦' }), 200).whatsappNumber, '+966554445566')
  const [audit] = await query(`SELECT TOP (1) [summary], [after], [branchId] FROM [audit_log] WHERE [action] = N'EMPLOYEE_WHATSAPP_CHANGED' ORDER BY [id] DESC`)
  assert.deepEqual([audit.summary, JSON.parse(audit.after), audit.branchId], ['تعديل رقم واتساب موظف', { whatsapp: '+9665******66' }, org.branchA.id])
  assert.equal(expectStatus(await contact(users.hrA, emps.requester.id, 'PUT', { whatsappNumber: null }), 200).whatsappNumber, null)

  // مين ناقصه: بصلاحية عرض الموظفين وبنطاق الفروع
  expectStatus(await request(users.requester, 'GET', '/notification-channels/missing-contacts'), 403)
  const all = expectStatus(await admin('GET', '/notification-channels/missing-contacts'), 200)
  assert.deepEqual(all.counts, { employees: 5, noAccount: 1, noEmail: 1, noWhatsapp: 3 })
  const named = Object.fromEntries(all.rows.map(row => [row.id, [row.noAccount, row.noEmail, row.noWhatsapp]]))
  assert.deepEqual(named, { [emps.requester.id]: [false, false, true], [emps.other.id]: [false, false, true], [emps.noAccount.id]: [true, true, true] })
  // حساب دخوله مش عنوان (hr.b) بس بريد ملفه صالح = مش ناقصه بريد
  const branchB = expectStatus(await request(users.hrB, 'GET', '/notification-channels/missing-contacts'), 200)
  assert.deepEqual([branchB.counts, branchB.rows.map(row => row.id)], [{ employees: 1, noAccount: 0, noEmail: 0, noWhatsapp: 1 }, [emps.other.id]])
  assert.equal(JSON.stringify(branchB).includes(emps.manager.fullName), false, 'موظفين الفرع التاني مش في الرد')
})

test('NC-11: البحث في سجل الإرسال — القناة والحالة والحدث واسم المستلم والتاريخ والصفحات، واسم مستلم السري مابيطابقش', async () => {
  const log = async search => expectStatus(await admin('GET', `/notifications/deliveries?${new URLSearchParams(search)}`), 200)
  for (const user of [users.requester, users.hrA]) expectStatus(await request(user, 'GET', '/notifications/deliveries?channel=WHATSAPP'), 403)
  const whatsapp = await log({ channel: 'WHATSAPP' })
  assert.ok(whatsapp.total > 5 && whatsapp.rows.every(row => row.channel === 'WHATSAPP'))
  assert.equal(whatsapp.total, Number((await query(`SELECT COUNT(*) AS [n] FROM [notification_deliveries] WHERE [channel] = N'WHATSAPP'`))[0].n))
  const failed = await log({ channel: 'WHATSAPP', status: 'FAILED' })
  assert.ok(failed.rows.length >= 2 && failed.rows.every(row => row.status === 'FAILED' && row.detail))
  const decided = await log({ event: 'request.decided' })
  assert.ok(decided.rows.length > 0 && decided.rows.every(row => row.event === 'قرار على طلبك'))
  // باسم المستلم: إشعارات المعتمد بس — وإشعار الطلب السري بتاع «حساب hr-a» مابيطابقش (مستلمه مخفي)
  const byName = await log({ recipient: 'manager' })
  assert.ok(byName.total > 0 && byName.rows.every(row => row.recipientName === 'حساب manager'))
  assert.equal((await log({ recipient: 'hr-a' })).rows.some(row => row.recipientUserId === null), false)
  assert.equal((await log({ recipient: 'hr-a', event: 'request.confidential' })).total, 0)
  assert.equal((await log({ recipient: '%' })).total, 0, 'علامات LIKE نص عادي')
  // التاريخ: النهارده فيه كل حاجة، وبكرة مفيهوش
  const day = offset => { const date = new Date(Date.now() + offset * 86_400_000); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
  const everything = await log({})
  assert.equal((await log({ from: day(0), to: day(0) })).total, everything.total)
  assert.equal((await log({ from: day(1) })).total, 0)
  assert.equal((await log({ to: day(-1) })).total, 0)
  // الصفحات: 100 في الصفحة، والصفحة التانية بتكمّل من غير تكرار
  assert.deepEqual([everything.page, everything.pageSize], [1, 100])
  if (everything.total > 100) {
    const second = await log({ page: 2 })
    assert.equal(second.rows.length, Math.min(100, everything.total - 100))
    assert.equal(second.rows.some(row => everything.rows.some(first => first.id === row.id)), false)
  }
  assert.deepEqual(Object.keys(everything.rows[0]).sort(), ['address', 'attempts', 'channel', 'createdAt', 'detail', 'event', 'id', 'recipientName', 'recipientUserId', 'sentAt', 'status'])
  assert.equal(/966551112233|manager@channels\.invalid|"body"|"subject"/.test(JSON.stringify(everything)), false)
})

test('NC-12: القالب الإنجليزي للي لغة حسابه إنجليزي، والباقي عربي', async () => {
  const put = (language, body) => admin('PUT', `/notifications/templates/request.pending_approval/EMAIL${language ? `?language=${language}` : ''}`, body)
  assert.match(expectStatus(await put('fr', { title: 'Titre', body: 'Texte' }), 400).message, /لغة القالب/)
  const english = expectStatus(await put('en', { title: 'Request awaiting your approval: {{request.type}}', body: 'Hello {{recipient.name}},\n{{request.requester}} is waiting.\n{{link}}' }), 200)
  assert.equal(english.language, 'en')
  const template = english.events.find(event => event.code === 'request.pending_approval').templates.EMAIL
  assert.deepEqual([template.customized, template.title, template.default.title], [true, 'Request awaiting your approval: {{request.type}}', 'طلب بانتظار اعتمادك: {{request.type}}'])
  // النص العربي زي ما هو
  const arabic = expectStatus(await admin('GET', '/notifications/templates'), 200)
  assert.deepEqual([arabic.language, arabic.events.find(event => event.code === 'request.pending_approval').templates.EMAIL.customized], ['ar', false])
  const [audit] = await query(`SELECT TOP (1) [entityId] FROM [audit_log] WHERE [action] = N'NOTIFICATION_TEMPLATE_CHANGED' ORDER BY [id] DESC`)
  assert.equal(audit.entityId, 'request.pending_approval:EMAIL:en')
  // وقالب واتساب إنجليزي للحدث نفسه
  expectStatus(await rule('request.pending_approval', { whatsapp: true, whatsappTemplates: { en: { templateName: 'approval_pending_en', languageCode: 'en_US', variables: ['request.type'] } } }), 200)
  clear()
  const arabicRun = await submit(users.requester, types.general)
  await drain()
  assert.equal(mailbox.sent.at(-1).subject, 'طلب بانتظار اعتمادك: طلب قنوات عام')
  assert.deepEqual([sentBody(meta.calls.at(-1)).template.name, sentBody(meta.calls.at(-1)).template.language.code], ['approval_pending', 'ar'])
  assert.ok(arabicRun.id)
  await query('UPDATE dbo.users SET [language] = N\'en\' WHERE [id] = @0', [users.manager.id])
  clear()
  await submit(users.requester, types.general)
  await drain()
  assert.equal(mailbox.sent.at(-1).subject, 'Request awaiting your approval: طلب قنوات عام')
  assert.ok(mailbox.sent.at(-1).text.startsWith('Hello حساب manager,'))
  assert.deepEqual([sentBody(meta.calls.at(-1)).template.name, sentBody(meta.calls.at(-1)).template.language.code, parametersOf(meta.calls.at(-1))], ['approval_pending_en', 'en_US', ['طلب قنوات عام']])
  // الرجوع للنص العربي
  const reset = expectStatus(await admin('DELETE', '/notifications/templates/request.pending_approval/EMAIL?language=en'), 200)
  assert.equal(reset.events.find(event => event.code === 'request.pending_approval').templates.EMAIL.customized, false)
  assert.equal(Number((await query('SELECT COUNT(*) AS [n] FROM [notification_templates]'))[0].n), 0)
})
