'use strict'
// B-ADD.5: قنوات الإشعارات (البريد والواتساب) على قاعدة SQL مؤقتة معزولة بتتمسح في الآخر (hr_codex_p7d_channels_test_<16 hex>).
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

const database = `hr_codex_p7d_channels_test_${crypto.randomBytes(8).toString('hex')}`
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
  assert.match(database, /^hr_codex_p7d_channels_test_[a-f0-9]{16}$/)
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
test('P7D-N01: daily digest respects an event email channel disabled before sending', async t => {
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
  t.diagnostic(JSON.stringify({ case: 'P7D-N01', channelDisabled: true, emailSent: false }));
});
test('P7D-N02: WhatsApp contact write holds the employee lock until commit', async t => {
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
    t.diagnostic(JSON.stringify({case:'P7D-N02',response:response.status,transferWaited:true,afterTransfer:retry.status}));
  } finally { Repository.prototype.findOne = original; await transfer; await repo('Employee').update({ id: emps.requester.id }, { branchId: org.branchA.id }); }
});

test('P7D-N03 closure: the next recipient respects email disabled during the batch', async t => {
  await setting('notifications.email.enabled','true'); await setting('notifications.quiet_hours','');
  expectStatus(await rule('request.pending_approval',{email:true}),200);
  const manager2=await employee(), requester2=await employee({managerEmployeeId:manager2.id});
  const m2=await account('p7d-manager2','employee',[],{employeeId:manager2.id});
  const r2=await account('p7d-requester2','employee',[],{employeeId:requester2.id});
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
    const sent=await notifications.sendDigests(); assert.equal(disabled,true); assert.equal(sent,1);
    assert.equal(mailbox.sent.length,1);
    assert.equal((await deliveriesOf('request',reqs[1].id,'EMAIL'))[0].status,'SKIPPED');
    assert.equal((await channels.ruleOf('request.pending_approval')).rule.email,false);
    t.diagnostic(JSON.stringify({case:'P7D-N03',firstRecipientSent:1,adminDisabledBeforeSecond:true,secondRecipientStillSent:0}));
  } finally { mail.send=send; }
});
test('P7D-N04: failed digest rechecks the event rule on its next attempt', async t => {
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
  t.diagnostic(JSON.stringify({case:'P7D-N04',retrySent:0,status:'SKIPPED'}));
});

test('P7D-N05: transfer before the contact lock rejects the write without changing the saved number', async t => {
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
    t.diagnostic(JSON.stringify({case:'P7D-N05',transferCommittedBeforeLock:true,status:404,numberUnchanged:true}));
  }finally{EntityManager.prototype.query=original;await repo('Employee').update({id:emps.requester.id},{branchId:org.branchA.id});}
});

async function mixedDigest(label){
  await setting('notifications.email.enabled','true');await setting('notifications.quiet_hours','');
  for(const code of ['request.pending_approval','task.assigned'])expectStatus(await rule(code,{email:true}),200);
  for(const category of ['approval','task'])expectStatus(await request(users.manager,'PATCH','/notifications/preferences',{category,channel:'EMAIL',mode:'DIGEST'}),200);
  const req=await submit(users.requester,types.general);
  const task=expectStatus(await request(users.admin,'POST','/tasks',{title:label,assigneeEmployeeId:emps.manager.id}),201);
  await drain();
  assert.equal((await deliveriesOf('request',req.id,'EMAIL'))[0].status,'DIGEST');
  const delivery=(await deliveriesOf('task',task.id,'EMAIL'))[0];assert.equal(delivery.status,'DIGEST');
  expectStatus(await rule('task.assigned',{email:false}),200);clear();
  return {req,task,delivery};
}
test('P7D-N06: mixed digest retains open events and skips only the closed event', async t=>{
  const {req,task}=await mixedDigest('P7D mixed hidden task');
  assert.equal(await notifications.sendDigests(),1);assert.equal(mailbox.sent.length,1);
  assert.equal(mailbox.sent[0].text.includes('P7D mixed hidden task'),false);
  assert.ok(mailbox.sent[0].text.includes(types.general.nameAr));
  assert.equal((await deliveriesOf('request',req.id,'EMAIL'))[0].status,'SENT');
  assert.equal((await deliveriesOf('task',task.id,'EMAIL'))[0].status,'SKIPPED');
  t.diagnostic(JSON.stringify({case:'P7D-N06',messages:1,openEvent:'SENT',closedEvent:'SKIPPED'}));
});
// Closure of the old N07: mail handover must precede the delayed skipped-row write.
test('P7D-N07 closure: handover precedes a blocked skip-record write', async t=>{
  const {req,task,delivery}=await mixedDigest('P7D blocked hidden task');
  const {Repository}=require('../node_modules/typeorm'),original=Repository.prototype.update;
  const locker=ds.createQueryRunner();await locker.connect();await locker.startTransaction();
  let hit=false,writeCompleted=false,blockedWrite;
  Repository.prototype.update=async function(criteria,partial){
    if(!hit&&this.manager.connection===ds&&this.metadata.name==='NotificationDelivery'&&partial?.status==='SKIPPED'){
      hit=true;
      await locker.query('SELECT [id] FROM [notification_deliveries] WITH (UPDLOCK,ROWLOCK,HOLDLOCK) WHERE [id]=@0',[delivery.id]);
      blockedWrite=original.call(this,criteria,partial).then(r=>{writeCompleted=true;return r;});
      await new Promise(r=>setTimeout(r,200));assert.equal(writeCompleted,false,'real SQL write must be blocked');
      assert.equal(mailbox.sent.length,1,'handover already happened before skipped-row write');
      expectStatus(await rule('request.pending_approval',{email:false}),200);
      assert.equal((await channels.ruleOf('request.pending_approval')).rule.email,false);
      assert.equal(mailbox.sent.length,1,'admin save is after handover');
      await locker.commitTransaction();
      return blockedWrite;
    }
    return original.call(this,criteria,partial);
  };
  try{
    const sent=await notifications.sendDigests();assert.equal(hit,true);assert.equal(sent,1);
    assert.equal(mailbox.sent.length,1);assert.ok(mailbox.sent[0].text.includes(types.general.nameAr));
    assert.equal((await deliveriesOf('request',req.id,'EMAIL'))[0].status,'SENT');
    assert.equal((await deliveriesOf('task',task.id,'EMAIL'))[0].status,'SKIPPED');
    t.diagnostic(JSON.stringify({case:'P7D-N07',realSqlWait:true,handoverBeforeAdminSave:true,eventEmail:false,messagesBeforeSave:1,requestStatus:'SENT'}));
  }finally{Repository.prototype.update=original;if(locker.isTransactionActive)await locker.rollbackTransaction();if(blockedWrite)await Promise.allSettled([blockedWrite]);await locker.release();}
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

