'use strict'
// B-ADD.16: البريد (صندوق Exchange بتاع الموظف جوه النظام) على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر (hr_mailbox_test_<16 hex>)، عبر HTTP
// بتوكنات موقّعة محليًا. خادم البريد مزيّف على 127.0.0.1 (test/fixtures/fake-exchange.cjs): «افتح بريدك» بيعدّي عليه فعلًا بالمكتبة الحقيقية
// (تحدي NTLMv2 وGetFolder)، وباقي نداءات البريد متبدّلة عند حدّ خدمة EWS بصناديق في الذاكرة بتتأكد من كلمة السر. ولا اتصال بيطلع برّه الجهاز،
// ولا رسالة حقيقية، وكل كلمات السر هنا قيم اختبار واضحة.
//  MB-01) الموديول مقفول افتراضيًا: كل المسارات 404، وبتتفتح لما يتفعّل.
//  MB-02) البريد مش مضبوط على الخادم: الحالة بتقول، والمسارات 503 بكود ثابت.
//  MB-03) «افتح بريدك» على السلك: مقفول ← 428؛ كلمة غلط مرفوضة ومعدودة (خمسة = قفل)؛ الصح بتفتح والمفتاح في cookie بس؛ وخادم واقف مش محاولة.
//  MB-04) المخزن عبر HTTP: مفتاح حساب أو جلسة تانية مايفتحش؛ والقفل والخروج وتغيير إصدار التوكن ونهاية التوكن ورفض خادم البريد بيمسحوه.
//  MB-05) العزل: كل نداء بهوية صاحب الجلسة؛ معرّف رسالة أو مرفق حد تاني = غير موجود؛ وصندوق حد تاني بـmbx = مرفوض قبل أي نداء.
//  MB-06) الصناديق المشتركة: الإدارة بالصلاحية، والفتح للمضاف عليه بس، وخادم البريد له الكلمة الأخيرة؛ وقبل الترحيل 192 وبعده.
//  MB-07) الإرسال: نموذج متعدد الأجزاء بمرفق باسم عربي، والهوية من الجلسة، والقيم الغلط مرفوضة.
//  MB-08) «الدخول بحساب الشركة» بيمسك كلمة السر للجلسة (لما الموديول مفعّل) والبريد بيفتح من غير نموذج؛ والخروج بيمسح.
//  MB-09) ولا كلمة سر في أي رد ولا سطر سجل ولا طلب على السلك ولا عمود في القاعدة.
// Run (من api/): node --test test/mailbox.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto'), http = require('node:http')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const { startFakeExchange } = require('./fixtures/fake-exchange.cjs')
const database = `hr_mailbox_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_mailbox_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-mailbox-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/mailbox/mailbox-rules')
const MIGRATION = path.join(apiRoot, '..', 'docs/migrations/payroll/20261012_192_mailbox.sql')
const TABLES = ['mail_accounts', 'mail_shared_mailboxes', 'mail_shared_mailbox_users']
// قيم اختبار واضحة إنها مش كلمات سر حقيقية (عشوائية لكل تشغيل عشان البحث عنها في المخرجات يبقى له معنى)
const fakeSecret = label => `fake-${label}-${crypto.randomBytes(6).toString('hex')}-ممم`
const PASS = { a: fakeSecret('a'), b: fakeSecret('b'), manager: fakeSecret('manager'), domain: fakeSecret('domain'), wrong: fakeSecret('wrong'), changed: fakeSecret('changed') }
const id = label => Buffer.from(`mailbox-test-${label}-0000000000`).toString('base64')
const SHARED = 'info@mailbox.invalid'
let app, master, ds, base, modules, ews, vault, sessions, fake, pool, created = false, employeeNumber = 0
const org = {}, users = {}, emps = {}, state = {}
const logs = [], responses = [], calls = []
const accounts = new Map()          // اسم الدخول ← كلمة السر على «خادم البريد»
const fullAccess = { [SHARED]: [] } // مين له صلاحية على الصندوق المشترك على «خادم البريد»
const boxes = {}                    // صناديق «خادم البريد» في الذاكرة

function assertDisposable() {
  assert.match(database, NAME); assert.match(database, migrate.DISPOSABLE_DATABASE)
  assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system')
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
const payloadOf = (user, extra = {}) => ({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false,
  permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]'), ...extra })
const tokenOf = (user, extra, options) => jwt.sign(payloadOf(user, extra), options)
/** طلب HTTP. who: حساب (توكن Bearer) أو { token } أو null. options: cookie (مفتاح البريد)، headers، form (متعدد الأجزاء)، raw (الجسم بايتات) */
async function request(who, method, route, body, options = {}) {
  const token = who ? who.token ?? tokenOf(who) : null
  const headers = { ...(options.form ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.cookie ? { Cookie: options.cookie } : {}), ...(options.headers ?? {}) }
  const response = await fetch(base + route, { method, headers, ...(options.form ? { body: options.form } : body === undefined ? {} : { body: JSON.stringify(body) }) })
  const buffer = Buffer.from(await response.arrayBuffer()), text = buffer.toString('utf8')
  const setCookie = response.headers.getSetCookie()
  responses.push(`${method} ${route} → ${response.status}\n${JSON.stringify([...response.headers])}\n${text}`)
  let parsed = null
  try { parsed = text ? JSON.parse(text) : null } catch { parsed = null }
  return { status: response.status, body: parsed, text, buffer, headers: response.headers, setCookie }
}
const expectStatus = (response, status) => { assert.equal(response.status, status, response.text.slice(0, 400)); return response.body }
const codeOf = response => [response.status, response.body?.code]
const employee = (extra = {}) => repo('Employee').save({ employeeCode: `MB${String(++employeeNumber).padStart(3, '0')}`, fullName: `موظف البريد ${employeeNumber}`, branchId: org.branch.id,
  joinDate: '2020-01-01', basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'cash', ...extra })
const account = (label, permissions, extra = {}) => repo('User').save({ email: `${label}@mailbox.invalid`, displayName: `حساب ${label}`, passwordHash: 'test-only',
  role: 'employee', branchId: org.branch.id, permissions: JSON.stringify(permissions), isActive: true, ...extra })
const M = '/mail'
const keyCookieOf = response => {
  const line = response.setCookie.find(value => value.startsWith('hr_mail_key='))
  return line ? line.split(';')[0] : null
}
/** «افتح بريدك» وبيرجّع cookie المفتاح */
async function unlock(who, password) {
  const response = await request(who, 'POST', M + '/unlock', { password })
  assert.equal(response.status, 200, response.text)
  const cookie = keyCookieOf(response)
  assert.match(cookie, /^hr_mail_key=[A-Za-z0-9_-]{43}$/)
  return cookie
}
const scopeOf = (user, extra = {}) => ({ userId: user.id, tokenVersion: user.tokenVersion ?? 0, sid: extra.sid ?? null })
const auditRows = action => ds.query('SELECT [action], [summary], [actorUserId], [before], [after] FROM [audit_log] WHERE [action] = @0 ORDER BY [id]', [action])
const shape = async () => {
  const tables = {}
  for (const table of TABLES) {
    tables[table] = {
      columns: await ds.query(`SELECT c.name AS columnName, t.name AS type, c.max_length AS maxLength, c.is_nullable AS nullable, c.is_identity AS isIdentity
        FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id WHERE c.object_id = OBJECT_ID(@0) ORDER BY c.column_id`, [`dbo.${table}`]),
      indexes: await ds.query(`SELECT i.name, i.is_unique AS isUnique, i.has_filter AS hasFilter,
          STUFF((SELECT ',' + c.name FROM sys.index_columns ic JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
            WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id ORDER BY ic.key_ordinal FOR XML PATH('')), 1, 1, '') AS [columns]
        FROM sys.indexes i WHERE i.object_id = OBJECT_ID(@0) AND i.name IS NOT NULL ORDER BY i.name`, [`dbo.${table}`]),
    }
  }
  return tables
}

// ===== «خادم البريد» عند حدّ خدمة EWS: صناديق في الذاكرة، وكل نداء بيتسجّل بهويته وبيتأكد من كلمة السر =====
function installExchangeStubs() {
  const { MailAuthRejected } = require('../src/mailbox/ews.service')
  const { ForbiddenException, NotFoundException } = require('../node_modules/@nestjs/common')
  const notFound = () => new NotFoundException({ statusCode: 404, code: 'MAIL_ITEM_NOT_FOUND', message: rules.MAIL_ITEM_NOT_FOUND })
  const open = (method, who, detail = {}) => {
    calls.push({ method, userId: who.userId, login: who.login, target: who.target ?? null, ...detail })
    const login = String(who.login).toLowerCase()
    if (!accounts.has(login) || accounts.get(login) !== who.password) throw new MailAuthRejected()
    if (who.target && !(fullAccess[who.target] ?? []).includes(login)) throw new ForbiddenException({ statusCode: 403, code: 'MAIL_NO_ACCESS', message: rules.MAIL_NO_ACCESS })
    const box = boxes[who.target ?? login]
    if (!box) throw new NotFoundException({ statusCode: 404, code: 'MAIL_NO_MAILBOX', message: rules.MAIL_NO_MAILBOX })
    return box
  }
  const rowOf = message => ({ id: message.id, subject: message.subject, from: message.from, to: message.to.map(entry => entry.name).join('; '), date: message.date, isRead: message.isRead,
    hasAttachments: message.attachments.length > 0, important: false, flagged: message.flagged, preview: message.preview })
  ews.folders = async who => {
    const box = open('folders', who)
    return { wellKnown: ['inbox', 'drafts', 'sent', 'deleted', 'junk'].map(key => ({ key, id: id(`${box.name}-${key}`), name: key, unread: key === 'inbox' ? box.messages.filter(m => !m.isRead).length : 0,
      total: key === 'inbox' ? box.messages.length : 0 })), custom: [], rootIds: [] }
  }
  ews.list = async (who, folder, offset, limit, query) => {
    const box = open('list', who, { folder, offset, limit, query })
    return { total: box.messages.length, more: false, items: box.messages.slice(offset, offset + limit).map(rowOf) }
  }
  ews.searchAll = async (who, limit, query) => {
    const box = open('searchAll', who, { limit, query })
    return { total: box.messages.length, more: false, truncated: false, items: box.messages.map(message => ({ ...rowOf(message), folder: { key: 'inbox', name: 'inbox' } })) }
  }
  ews.conversations = async (who, folder, offset, limit, unreadOnly) => {
    const box = open('conversations', who, { folder, offset, limit, unreadOnly })
    return { total: box.messages.length, more: false, items: box.messages.map(message => ({ id: message.conversationId, subject: message.subject, senders: [message.from.name], recipients: message.to.map(entry => entry.name),
      date: message.date, count: 1, unread: message.isRead ? 0 : 1, hasAttachments: message.attachments.length > 0, important: false, flagged: message.flagged, preview: message.preview })) }
  }
  ews.conversation = async (who, conversationId, folder) => {
    const box = open('conversation', who, { conversationId, folder })
    const found = box.messages.filter(message => message.conversationId === conversationId)
    if (!found.length) throw notFound()
    return found.map(message => ({ id: message.id, subject: message.subject, from: message.from, to: message.to.map(entry => entry.name).join('; '), cc: '', date: message.date, isRead: message.isRead,
      hasAttachments: message.attachments.length > 0, preview: message.preview }))
  }
  ews.conversationAction = async (who, conversationId, folder, action) => {
    const box = open('conversationAction', who, { conversationId, folder, action })
    const found = box.messages.filter(message => message.conversationId === conversationId)
    if (!found.length) throw notFound()
    for (const message of found) {
      if (action.isRead !== undefined) message.isRead = action.isRead
      if (action.flagged !== undefined) message.flagged = action.flagged
    }
    if (action.remove) box.messages = box.messages.filter(message => message.conversationId !== conversationId)
  }
  const one = (method, who, messageId, detail) => {
    const box = open(method, who, { messageId, ...detail })
    const message = box.messages.find(item => item.id === messageId)
    if (!message) throw notFound()
    return { box, message }
  }
  ews.message = async (who, messageId, peek) => {
    const { message } = one('message', who, messageId, { peek })
    if (!peek) message.isRead = true
    return { id: message.id, subject: message.subject, from: message.from, to: message.to, cc: [], date: message.date, important: false, flagged: message.flagged, html: message.html, uniqueHtml: '',
      attachments: message.attachments.map(item => ({ id: item.id, name: item.name, size: item.data.length, contentType: item.contentType })) }
  }
  ews.update = async (who, messageId, patch) => {
    const { message } = one('update', who, messageId, { patch })
    if (patch.isRead !== undefined) message.isRead = patch.isRead
    if (patch.flagged !== undefined) message.flagged = patch.flagged
  }
  ews.remove = async (who, messageId) => {
    const { box, message } = one('remove', who, messageId)
    box.messages = box.messages.filter(item => item !== message)
  }
  ews.attachment = async (who, messageId, attachmentId) => {
    const { message } = one('attachment', who, messageId, { attachmentId })
    const found = message.attachments.find(item => item.id === attachmentId)
    if (!found) throw notFound()
    return { name: found.name, contentType: found.contentType, data: found.data }
  }
  ews.send = async (who, input) => {
    const box = open('send', who, { input })
    box.sent.push(input)
  }
  ews.contacts = async (who, q) => {
    open('contacts', who, { q })
    return [{ displayName: 'جهة من دليل البريد', email: 'directory.person@mailbox.invalid' }]
  }
  for (const method of ['folders', 'list', 'searchAll', 'conversations', 'conversation', 'conversationAction', 'message', 'update', 'remove', 'attachment', 'send', 'contacts']) {
    assert.notEqual(ews[method], Object.getPrototypeOf(ews)[method], method)
  }
}
const mailbox = (name, messages) => ({ name, sent: [], messages: messages.map((message, index) => ({ conversationId: id(`${name}-conv-${index}`), date: `2026-10-1${index}T08:00:00.000Z`, isRead: false, flagged: false,
  preview: 'معاينة', html: '<p>نص الرسالة</p>', to: [{ name: 'مستلم', address: 'someone@mailbox.invalid' }], attachments: [], ...message })) })

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  fake = await startFakeExchange(accounts, 3)
  assert.match(fake.url, /^http:\/\/127\.0\.0\.1:\d+\/EWS\/Exchange\.asmx$/)
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads, FRONTEND_URL: 'http://localhost:3000',
    AUTH_FAILURE_DELAY_MS: '0', SESSION_COOKIE_SAMESITE: '', SESSION_COOKIE_SECURE: '',
    // خادم البريد المزيّف على نفس الجهاز — أي قيمة في api/.env مابتتقريش
    MAIL_EWS_URL: fake.url, MAIL_EWS_ENABLED: 'true', MAIL_EWS_DOMAIN: '', MAIL_EWS_TLS_REJECT_UNAUTHORIZED: 'true', MAIL_EWS_TIMEOUT_MS: '8000' })
  // كل سطور سجل الخادم بتتجمّع (للتأكد إن مفيش كلمة سر فيها)
  const capture = level => (...parts) => { logs.push(`${level} ${parts.map(part => (typeof part === 'string' ? part : part instanceof Error ? `${part.message}\n${part.stack}` : JSON.stringify(part))).join(' ')}`) }
  const logger = { log: capture('LOG'), error: capture('ERROR'), warn: capture('WARN'), debug: capture('DEBUG'), verbose: capture('VERBOSE'), fatal: capture('FATAL') }
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger, abortOnError: false })
  // Review harness disables the logger; restore the fixture's memory-only sink before testing secrets.
  app.useLogger(logger); require('../node_modules/@nestjs/common').Logger.overrideLogger(logger)
  // مفيش رسالة بريد حقيقية ولا اتصال دليل حقيقي بيطلع من الاختبار
  const { MailService } = require('../src/auth/mail.service')
  const mail = app.get(MailService)
  mail.isConfigured = () => false
  mail.send = async () => { throw new Error('no mail in tests') }
  assert.notEqual(mail.send, MailService.prototype.send)
  const { DirectoryAuthError, normalizeDomainLogin } = require('../src/auth/directory.types')
  const directory = app.get(require('../src/auth/directory.service').DirectoryService)
  directory.client = () => { throw new Error('الاختبار حاول يفتح اتصال LDAP حقيقي') }
  directory.isConfigured = () => true
  state.directory = new Map()
  directory.authenticate = async (username, password) => {
    const name = normalizeDomainLogin(username, 'corp.invalid')
    const found = name && state.directory.get(name.upn)
    if (!found || !password || found.password !== password) throw new DirectoryAuthError('INVALID_CREDENTIALS', 'fake: بيانات غلط')
    return { objectGuid: found.objectGuid, sAMAccountName: name.sam, userPrincipalName: name.upn, mail: found.mail, displayName: found.displayName, employeeId: found.employeeId ?? null, disabled: false }
  }
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const cron of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) cron.stop()
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  modules = app.get(require('../src/modules-registry/modules.service').ModulesService)
  ews = app.get(require('../src/mailbox/ews.service').EwsService)
  vault = app.get(require('../src/mailbox/mail-vault.service').MailVaultService)
  sessions = app.get(require('../src/auth/user-sessions.service').UserSessionsService)
  // الإعداد اللي الخادم شغال بيه هو المزيّف المحلي، والتحقق من الشهادة مفتوح
  assert.deepEqual([ews.config.enabled, ews.config.url, ews.config.rejectUnauthorized, ews.config.domain], [true, fake.url, true, ''])
  await app.get(require('../src/settings/config-defaults.service').ConfigDefaultsService).onApplicationBootstrap()
  pool = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database, options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 10000, requestTimeout: 120000 }).connect()

  org.branch = await repo('Branch').save({ code: 'MB_A', name: 'فرع البريد', country: 'SA' })
  emps.a = await employee({ fullName: 'موظف أ' })
  emps.b = await employee({ fullName: 'موظف ب' })
  emps.domain = await employee({ fullName: 'سامي — بحساب الشركة', email: 'sami.mail@mailbox.invalid' })
  users.admin = await repo('User').save({ email: 'admin@mailbox.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', branchId: null,
    scopeAllBranches: true, permissions: '[]', isActive: true })
  users.a = await account('a', [], { employeeId: emps.a.id })
  users.b = await account('b', [], { employeeId: emps.b.id })
  users.manager = await account('manager', ['mail.shared.manage'])
  users.plain = await account('plain', [])
  // «خادم البريد»: حساب لكل موظف بكلمة سره، وصندوقه
  accounts.set('a@mailbox.invalid', PASS.a); accounts.set('b@mailbox.invalid', PASS.b); accounts.set('manager@mailbox.invalid', PASS.manager); accounts.set('sami@corp.invalid', PASS.domain)
  boxes['a@mailbox.invalid'] = mailbox('a', [
    { id: id('a-1'), subject: 'عقد المورد — سري', from: { name: 'مدير المشتريات', address: 'buyer@mailbox.invalid' },
      attachments: [{ id: id('a-1-att') + id('a-1-att'), name: 'عقد المورد.pdf', contentType: 'application/pdf', data: Buffer.from('%PDF-1.4 test attachment of mailbox a') }] },
    { id: id('a-2'), subject: 'محضر الاجتماع', from: { name: 'السكرتارية', address: 'office@mailbox.invalid' } }])
  boxes['b@mailbox.invalid'] = mailbox('b', [{ id: id('b-1'), subject: 'رسالة ب', from: { name: 'زميل', address: 'peer@mailbox.invalid' } }])
  boxes['manager@mailbox.invalid'] = mailbox('manager', [])
  boxes['sami@corp.invalid'] = mailbox('sami', [{ id: id('sami-1'), subject: 'أهلًا سامي', from: { name: 'الموارد البشرية', address: 'hr@mailbox.invalid' } }])
  boxes[SHARED] = mailbox('info', [{ id: id('info-1'), subject: 'استفسار عميل', from: { name: 'عميل', address: 'client@elsewhere.invalid' } }])
}, { timeout: 240000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try { if (pool) await pool.close() } catch (error) { errors.push(error) }
  try { if (fake) await fake.close() } catch (error) { errors.push(error) }
  try {
    if (created) {
      assertDisposable()
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  fs.rmSync(uploads, { recursive: true, force: true })
  if (errors.length) t.diagnostic(errors.map(error => error.message).join(' | '))
}, { timeout: 60000 })

test('MB-01: الموديول مقفول افتراضيًا — كل مسارات البريد 404 حتى لمدير النظام، وبتتفتح لما يتفعّل', async () => {
  const routes = [['GET', '/status'], ['GET', '/folders'], ['POST', '/unlock'], ['POST', '/lock'], ['GET', '/messages'], ['GET', '/unread'], ['GET', '/shared'], ['POST', '/send']]
  for (const who of [users.admin, users.a, null]) {
    for (const [method, route] of routes) assert.equal((await request(who, method, M + route, method === 'POST' ? { password: PASS.a } : undefined)).status, 404, `${who?.email} ${method} ${route}`)
  }
  assert.equal(expectStatus(await request(users.a, 'GET', '/modules/enabled'), 200).modules.includes('mail'), false)
  assert.equal(fake.requests.length, 0, 'ولا طلب وصل لخادم البريد')
  expectStatus(await request(users.admin, 'PUT', '/modules/mail', { enabled: true }), 200); modules.invalidate()
  assert.equal(expectStatus(await request(users.a, 'GET', '/modules/enabled'), 200).modules.includes('mail'), true)
  // مفعّل: من غير دخول 401، ومع الدخول الحالة بترجع
  assert.equal((await request(null, 'GET', M + '/status')).status, 401)
  assert.deepEqual(expectStatus(await request(users.a, 'GET', M + '/status'), 200), { configured: true, unlocked: false, login: 'a@mailbox.invalid', address: 'a@mailbox.invalid', canManageShared: false })
  assert.equal(expectStatus(await request(users.manager, 'GET', M + '/status'), 200).canManageShared, true)
})

test('MB-02: البريد مش مضبوط على الخادم — الحالة بتقول، وكل مسار 503 بكود ثابت، ومفيش طلب بيطلع', async () => {
  const before = fake.requests.length
  ews.config.enabled = false
  try {
    assert.deepEqual(expectStatus(await request(users.a, 'GET', M + '/status'), 200), { configured: false, unlocked: false, login: 'a@mailbox.invalid', address: 'a@mailbox.invalid', canManageShared: false })
    for (const [method, route, body] of [['GET', '/folders'], ['GET', '/messages'], ['GET', '/unread'], ['POST', '/unlock', { password: PASS.a }]]) {
      const response = await request(users.a, method, M + route, body)
      assert.deepEqual([...codeOf(response), response.body.message], [503, 'MAIL_NOT_CONFIGURED', rules.MAIL_NOT_CONFIGURED], route)
    }
  } finally { ews.config.enabled = true }
  assert.equal(fake.requests.length, before)
})

test('MB-03: «افتح بريدك» على السلك — المقفول 428، والغلط مرفوض ومعدود (خمسة = قفل ربع ساعة)، والصح بيفتح والمفتاح في cookie بس', async () => {
  // مقفول: كل مسارات الصندوق 428 بكود MAIL_LOCKED (مش 401 — الواجهة بتعتبر 401 نهاية الجلسة)
  for (const route of ['/folders', '/messages', '/conversations', '/unread', '/contacts?q=ab', `/message?id=${encodeURIComponent(id('a-1'))}`]) {
    const response = await request(users.a, 'GET', M + route)
    assert.deepEqual([...codeOf(response), response.body.message], [428, 'MAIL_LOCKED', rules.MAIL_LOCKED], route)
  }
  // القيم
  for (const bad of [{}, { password: '' }, { password: 5 }, { password: ['x'] }, { password: 'x'.repeat(401) }]) assert.deepEqual(codeOf(await request(users.a, 'POST', M + '/unlock', bad)), [400, 'MAIL_PASSWORD_REQUIRED'])
  assert.equal(fake.logins.length, 0, 'القيمة الفاضية مابتوصلش لخادم البريد')

  // كلمة غلط: خادم البريد بيرفضها (تحدي NTLMv2 حقيقي)، مفيش cookie، والمحاولة اتعدّت
  const wrong = await request(users.a, 'POST', M + '/unlock', { password: PASS.wrong })
  assert.deepEqual([...codeOf(wrong), wrong.body.message, wrong.setCookie], [400, 'MAIL_BAD_PASSWORD', rules.MAIL_BAD_PASSWORD, []])
  assert.deepEqual(fake.logins.at(-1), { user: 'a@mailbox.invalid', domain: '', ok: false, anchor: null }, 'الدخول باسم الحساب نفسه — مش من الطلب')
  // اسم دخول أو حساب في الطلب متجاهل: الهوية من التوكن
  const spoof = await request(users.a, 'POST', M + '/unlock?userId=' + users.b.id + '&login=b@mailbox.invalid', { password: PASS.b, login: 'b@mailbox.invalid', username: 'b@mailbox.invalid', userId: users.b.id })
  assert.deepEqual([codeOf(spoof), fake.logins.at(-1).user], [[400, 'MAIL_BAD_PASSWORD'], 'a@mailbox.invalid'], 'كلمة سر ب مع جلسة أ = دخول باسم أ، ومرفوض')
  for (let attempt = 3; attempt <= 4; attempt++) assert.deepEqual(codeOf(await request(users.a, 'POST', M + '/unlock', { password: PASS.wrong })), [400, 'MAIL_BAD_PASSWORD'])
  const fifth = await request(users.a, 'POST', M + '/unlock', { password: PASS.wrong })
  assert.deepEqual(codeOf(fifth), [429, 'MAIL_UNLOCK_LOCKED'])
  assert.ok(new Date(fifth.body.lockedUntil).getTime() > Date.now() + 14 * 60_000)
  // مقفول: حتى الكلمة الصح مابتتجرّبش (ولا طلب بيوصل لخادم البريد)، وحساب تاني مش مقفول
  const seen = fake.logins.length
  assert.deepEqual([codeOf(await request(users.a, 'POST', M + '/unlock', { password: PASS.a })), fake.logins.length], [[429, 'MAIL_UNLOCK_LOCKED'], seen])
  assert.deepEqual((await auditRows('MAIL_UNLOCK_LOCKED')).map(row => [row.actorUserId, row.summary]), [[users.a.id, '«افتح بريدك» اتقفل 15 دقيقة بعد 5 محاولات غلط']])
  state.keyB = await unlock(users.b, PASS.b)
  vault.attempts.reset(users.a.id)

  // خادم البريد واقف: 503 ومش محاولة غلط
  const closed = await new Promise(resolve => { const server = http.createServer(); server.listen(0, '127.0.0.1', () => { const { port } = server.address(); server.close(() => resolve(port)) }) })
  ews.config.url = `http://127.0.0.1:${closed}/EWS/Exchange.asmx`
  try {
    for (let attempt = 0; attempt < 6; attempt++) assert.deepEqual(codeOf(await request(users.a, 'POST', M + '/unlock', { password: PASS.a })), [503, 'MAIL_UNAVAILABLE'])
  } finally { ews.config.url = fake.url }

  // الصح: بيفتح، والرد من غير المفتاح، والمفتاح cookie مابتتقريش من سكربت الصفحة ولمسارات البريد بس
  const ok = await request(users.a, 'POST', M + '/unlock', { password: PASS.a })
  assert.deepEqual([ok.status, ok.body], [200, { unlocked: true }])
  assert.equal(ok.setCookie.length, 1)
  assert.match(ok.setCookie[0], /^hr_mail_key=[A-Za-z0-9_-]{43}; Path=\/api\/mail; HttpOnly; SameSite=Strict$/)
  state.keyA = keyCookieOf(ok)
  assert.equal(ok.text.includes(state.keyA.split('=')[1]), false)
  assert.deepEqual(fake.logins.at(-1), { user: 'a@mailbox.invalid', domain: '', ok: true, anchor: null })
  assert.deepEqual((await auditRows('MAIL_UNLOCKED')).map(row => row.actorUserId).sort(), [users.a.id, users.b.id].sort())
  // مفتوح بالمفتاح بس: من غيره لسه مقفول
  assert.equal(expectStatus(await request(users.a, 'GET', M + '/status', undefined, { cookie: state.keyA }), 200).unlocked, true)
  assert.equal(expectStatus(await request(users.a, 'GET', M + '/status'), 200).unlocked, false)
  assert.deepEqual(expectStatus(await request(users.a, 'GET', M + '/unread?userId=' + users.b.id + '&login=b@mailbox.invalid', undefined, { cookie: state.keyA }), 200), { unread: 3 })
  assert.equal(fake.logins.at(-1).user, 'a@mailbox.invalid')
  assert.deepEqual(codeOf(await request(users.a, 'GET', M + '/unread')), [428, 'MAIL_LOCKED'])
  // كلمة السر عمرها ما عدّت على السلك لخادم البريد (NTLM بيبعت رد التحدي بس)
  assert.ok(fake.requests.length >= 10)
  for (const value of Object.values(PASS)) assert.equal(fake.requests.some(entry => entry.includes(value)), false)
})

test('MB-04: المخزن عبر HTTP — مفتاح حساب أو جلسة تانية مايفتحش؛ والقفل والخروج وتغيير إصدار التوكن ونهاية التوكن ورفض خادم البريد بيمسحوه', async () => {
  installExchangeStubs()
  const folders = (who, cookie) => request(who, 'GET', M + '/folders', undefined, cookie ? { cookie } : {})
  // مفتاح أ مع جلسة ب (والعكس)، ومفتاح متلاعب فيه: مقفول — ونص كل واحد سليم بمفتاحه
  const tampered = state.keyA.slice(0, -1) + (state.keyA.endsWith('A') ? 'B' : 'A')
  assert.deepEqual([codeOf(await folders(users.b, state.keyA)), codeOf(await folders(users.a, state.keyB)), codeOf(await folders(users.a, tampered)), codeOf(await folders(users.a, 'hr_mail_key=short'))],
    [[428, 'MAIL_LOCKED'], [428, 'MAIL_LOCKED'], [428, 'MAIL_LOCKED'], [428, 'MAIL_LOCKED']])
  assert.deepEqual([(await folders(users.a, state.keyA)).status, (await folders(users.b, state.keyB)).status], [200, 200])
  assert.deepEqual(calls.filter(call => call.method === 'folders').map(call => [call.userId, call.login]), [[users.a.id, 'a@mailbox.invalid'], [users.b.id, 'b@mailbox.invalid']])

  // جلستين لنفس الحساب: كل جلسة بنصها ومفتاحها
  const sid1 = await sessions.open({ id: users.a.id, tokenVersion: 0 }), sid2 = await sessions.open({ id: users.a.id, tokenVersion: 0 })
  assert.ok(sid1 && sid2 && sid1 !== sid2)
  const session1 = { token: tokenOf(users.a, { sid: sid1 }) }, session2 = { token: tokenOf(users.a, { sid: sid2 }) }
  const key1 = await unlock(session1, PASS.a)
  assert.deepEqual([codeOf(await folders(session2, key1)), (await folders(session1, key1)).status, codeOf(await folders(session1, state.keyA))], [[428, 'MAIL_LOCKED'], 200, [428, 'MAIL_LOCKED']])
  assert.equal((await folders(users.a, state.keyA)).status, 200, 'والجلسة من غير رقم بنصها')

  // «قفل البريد»: النص بيتمسح والـcookie بتتمسح، والجلسة نفسها لسه شغالة
  const locked = await request(session1, 'POST', M + '/lock', undefined, { cookie: key1 })
  assert.deepEqual([locked.status, locked.body, locked.setCookie], [200, { unlocked: false }, ['hr_mail_key=; Path=/api/mail; HttpOnly; SameSite=Strict; Max-Age=0']])
  assert.deepEqual([codeOf(await folders(session1, key1)), expectStatus(await request(session1, 'GET', M + '/status', undefined, { cookie: key1 }), 200).unlocked], [[428, 'MAIL_LOCKED'], false])

  // الخروج: نص الجلسة بيتمسح من الخادم، والـcookie بتتمسح من المتصفح؛ وتوكن مزوّر مايمسحش بريد حد
  const key2 = await unlock(session2, PASS.a)
  assert.equal(vault.has(scopeOf(users.a, { sid: sid2 })), true)
  const forged = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret: crypto.randomBytes(48).toString('hex') }).sign(payloadOf(users.a, { sid: sid2 }))
  expectStatus(await request({ token: forged }, 'POST', '/auth/logout'), 200)
  assert.equal(vault.has(scopeOf(users.a, { sid: sid2 })), true, 'توكن بتوقيع غلط مامسحش حاجة')
  const out = await request(session2, 'POST', '/auth/logout')
  assert.deepEqual([out.status, out.setCookie], [200, ['hr_mail_key=; Path=/api/mail; HttpOnly; SameSite=Strict; Max-Age=0']])
  assert.equal(vault.has(scopeOf(users.a, { sid: sid2 })), false)
  assert.equal((await folders(session2, key2)).status, 401, 'والجلسة نفسها انتهت')
  assert.equal(vault.has(scopeOf(users.a)), true, 'جلسة تانية لنفس الحساب مااتأثرتش')

  // نهاية التوكن: النص مايعيش بعدها
  const short = { token: tokenOf(users.b, { sid: undefined }, { expiresIn: 2 }) }
  await unlock(short, PASS.b)
  assert.equal(vault.has(scopeOf(users.b)), true)
  await new Promise(resolve => setTimeout(resolve, 2300))
  assert.equal(vault.has(scopeOf(users.b)), false)
  state.keyB = await unlock(users.b, PASS.b)

  // إصدار التوكن اتغيّر (كلمة مرور أو صلاحية أو تعطيل): النص القديم مابيتفتحش وبيتمسح
  await repo('User').update({ id: users.b.id }, { tokenVersion: 1 })
  const bumped = { ...users.b, tokenVersion: 1 }
  assert.equal((await folders(users.b, state.keyB)).status, 401, 'التوكن القديم مات')
  assert.deepEqual([codeOf(await folders(bumped, state.keyB)), vault.has(scopeOf(users.b))], [[428, 'MAIL_LOCKED'], false])
  users.b = bumped
  state.keyB = await unlock(users.b, PASS.b)

  // كلمة السر اتغيّرت على خادم البريد وسط الجلسة: الخادم بيرفض ← النص بيتمسح والبريد «مقفول» برسالته، والكلمة الجديدة بتفتح
  accounts.set('b@mailbox.invalid', PASS.changed)
  const rejected = await folders(users.b, state.keyB)
  assert.deepEqual([...codeOf(rejected), rejected.body.message, vault.has(scopeOf(users.b))], [428, 'MAIL_LOCKED', rules.MAIL_PASSWORD_REJECTED, false])
  assert.deepEqual(codeOf(await request(users.b, 'POST', M + '/unlock', { password: PASS.b })), [400, 'MAIL_BAD_PASSWORD'])
  state.keyB = await unlock(users.b, PASS.changed)
  assert.equal((await folders(users.b, state.keyB)).status, 200)
})

test('MB-05: العزل — كل نداء بهوية صاحب الجلسة؛ ومعرّف رسالة أو مرفق حد تاني = غير موجود؛ وصندوق حد تاني بـmbx مرفوض قبل أي نداء', async () => {
  const a = { cookie: state.keyA }, b = { cookie: state.keyB }
  const q = value => encodeURIComponent(value)
  // أ بيقرا صندوقه
  const listA = expectStatus(await request(users.a, 'GET', M + '/messages?folder=inbox&limit=10', undefined, a), 200)
  assert.deepEqual(listA.items.map(item => item.subject), ['عقد المورد — سري', 'محضر الاجتماع'])
  assert.deepEqual(expectStatus(await request(users.a, 'GET', M + '/conversations', undefined, a), 200).items.length, 2)
  assert.equal(expectStatus(await request(users.a, 'GET', M + `/conversation?id=${q(id('a-conv-0'))}&folder=inbox`, undefined, a), 200)[0].subject, 'عقد المورد — سري')
  const opened = expectStatus(await request(users.a, 'GET', M + `/message?id=${q(id('a-1'))}&peek=1`, undefined, a), 200)
  assert.deepEqual([opened.subject, opened.html, opened.attachments.map(item => item.name)], ['عقد المورد — سري', '<p>نص الرسالة</p>', ['عقد المورد.pdf']])
  assert.equal(calls.at(-1).peek, true)
  // المرفق: تنزيل بنوع محايد واسمه من غير تخمين النوع
  const attachmentId = opened.attachments[0].id
  const file = await request(users.a, 'GET', M + `/attachment?id=${q(id('a-1'))}&att=${q(attachmentId)}`, undefined, a)
  assert.deepEqual([file.status, file.headers.get('content-type'), file.headers.get('x-content-type-options'), file.buffer.toString()],
    [200, 'application/octet-stream', 'nosniff', '%PDF-1.4 test attachment of mailbox a'])
  assert.equal(file.headers.get('content-disposition'), `attachment; filename*=UTF-8''${encodeURIComponent('عقد المورد.pdf')}`)

  // ب بيجرّب معرّفات أ: خادم البريد بيدوّر في صندوق ب (هوية الجلسة) فمابيلاقيش حاجة
  const mark = calls.length
  for (const [method, route, body] of [['GET', `/message?id=${q(id('a-1'))}`], ['GET', `/message?id=${q(id('a-1'))}&peek=1`], ['PATCH', `/message?id=${q(id('a-1'))}`, { isRead: true }],
    ['DELETE', `/message?id=${q(id('a-1'))}`], ['GET', `/attachment?id=${q(id('a-1'))}&att=${q(attachmentId)}`], ['GET', `/conversation?id=${q(id('a-conv-0'))}`],
    ['PATCH', `/conversation?id=${q(id('a-conv-0'))}`, { flagged: true }], ['DELETE', `/conversation?id=${q(id('a-conv-0'))}`]]) {
    const response = await request(users.b, method, M + route, body, b)
    assert.deepEqual(codeOf(response), [404, 'MAIL_ITEM_NOT_FOUND'], `${method} ${route}`)
    assert.equal(response.text.includes('عقد المورد'), false)
  }
  assert.deepEqual([...new Set(calls.slice(mark).map(call => `${call.userId}|${call.login}|${call.target}`))], [`${users.b.id}|b@mailbox.invalid|null`], 'كل النداءات بهوية ب')
  assert.equal(boxes['a@mailbox.invalid'].messages.length, 2, 'ولا رسالة من صندوق أ اتلمست')
  assert.deepEqual(boxes['a@mailbox.invalid'].messages.map(message => [message.isRead, message.flagged]), [[false, false], [false, false]])
  // معاملات بتحاول تغيّر الهوية: متجاهلة
  const spoofed = expectStatus(await request(users.b, 'GET', M + `/messages?userId=${users.a.id}&login=a@mailbox.invalid&username=a@mailbox.invalid&email=a@mailbox.invalid&sub=${users.a.id}`, undefined, b), 200)
  assert.deepEqual([spoofed.items.map(item => item.subject), calls.at(-1).login], [['رسالة ب'], 'b@mailbox.invalid'])
  // صندوق أ الشخصي بـmbx: مش صندوق مشترك متعرّف لب ← مرفوض قبل ما أي نداء يطلع
  const before = calls.length
  for (const route of ['/folders', '/messages', '/conversations', '/unread', `/message?id=${q(id('a-1'))}`, `/attachment?id=${q(id('a-1'))}&att=${q(attachmentId)}`]) {
    assert.deepEqual(codeOf(await request(users.b, 'GET', M + route + (route.includes('?') ? '&' : '?') + 'mbx=a@mailbox.invalid', undefined, b)), [403, 'MAIL_NO_ACCESS'], route)
  }
  assert.deepEqual(codeOf(await request(users.b, 'DELETE', M + `/message?id=${q(id('a-1'))}&mbx=A@Mailbox.INVALID`, undefined, b)), [403, 'MAIL_NO_ACCESS'])
  assert.deepEqual([calls.length, fake.logins.filter(login => login.anchor).length], [before, 0], 'ولا نداء لخادم البريد')

  // قيم غلط: مرفوضة قبل خادم البريد
  for (const route of ['/message?id=short', '/message', `/message?id=${q(id('a-1') + ' x')}`, `/conversation?id=${q('../../etc')}`, `/attachment?id=${q(id('a-1'))}&att=x`, `/attachment?id=${q(id('a-1'))}`]) {
    assert.deepEqual(codeOf(await request(users.a, 'GET', M + route, undefined, a)), [400, 'MAIL_BAD_ID'], route)
  }
  for (const mbx of ['nope', 'a@', 'a b@x.invalid']) assert.deepEqual(codeOf(await request(users.a, 'GET', M + `/folders?mbx=${q(mbx)}`, undefined, a)), [400, 'MAIL_BAD_ADDRESS'], mbx)
  assert.equal(calls.length, before)

  // القراءة والتعليم والعلم والحذف على صندوق صاحبه
  expectStatus(await request(users.a, 'GET', M + `/message?id=${q(id('a-2'))}`, undefined, a), 200)
  assert.deepEqual([calls.at(-1).peek, boxes['a@mailbox.invalid'].messages[1].isRead], [false, true])
  expectStatus(await request(users.a, 'PATCH', M + `/message?id=${q(id('a-2'))}`, { isRead: false, flagged: true, extra: 'ignored', folder: 5 }, a), 200)
  assert.deepEqual([calls.at(-1).patch, boxes['a@mailbox.invalid'].messages[1].flagged], [{ isRead: false, flagged: true, folder: undefined }, true])
  expectStatus(await request(users.a, 'PATCH', M + `/conversation?id=${q(id('a-conv-1'))}&folder=inbox`, { isRead: true }, a), 200)
  assert.deepEqual(calls.at(-1).action, { isRead: true, flagged: undefined, moveTo: undefined })
  // البحث: نص الخانة بيتفكّ في الخادم، و«كل المجلدات» مسار لوحده
  expectStatus(await request(users.a, 'GET', M + `/messages?folder=inbox&search=${q('from:sami عقد')}&attach=1&after=2026-10-01`, undefined, a), 200)
  assert.deepEqual([calls.at(-1).method, calls.at(-1).query], ['list', { text: 'عقد', from: 'sami', to: '', subject: '', after: '2026-10-01', before: undefined, attachments: true, unreadOnly: false }])
  assert.equal(expectStatus(await request(users.a, 'GET', M + `/messages?scope=all&search=${q('عقد')}&limit=500`, undefined, a), 200).items[0].folder.key, 'inbox')
  assert.deepEqual([calls.at(-1).method, calls.at(-1).limit], ['searchAll', 100])
  expectStatus(await request(users.a, 'GET', M + '/messages?scope=all', undefined, a), 200)
  assert.equal(calls.at(-1).method, 'list', 'من غير كلمة بحث = قايمة المجلد')
  // إكمال العناوين من دليل خادم البريد بدخول الموظف
  assert.deepEqual([expectStatus(await request(users.a, 'GET', M + '/contacts?q=a', undefined, a), 200), expectStatus(await request(users.a, 'GET', M + '/contacts?q=' + q('جهة'), undefined, a), 200)],
    [[], [{ displayName: 'جهة من دليل البريد', email: 'directory.person@mailbox.invalid' }]])
  assert.deepEqual([calls.at(-1).method, calls.at(-1).login, calls.at(-1).q], ['contacts', 'a@mailbox.invalid', 'جهة'])
})

test('MB-06: الصناديق المشتركة — الإدارة بالصلاحية، والفتح للمضاف عليه بس، وخادم البريد له الكلمة الأخيرة؛ وقبل الترحيل 192 وبعده', async () => {
  const a = { cookie: state.keyA }, b = { cookie: state.keyB }
  const S = M + '/shared'
  // الإدارة بالصلاحية
  for (const who of [users.a, users.plain]) {
    assert.deepEqual([(await request(who, 'GET', S)).status, (await request(who, 'GET', S + '/users?q=حساب')).status, (await request(who, 'POST', S, { address: SHARED, name: 'صندوق', userIds: [who.id] })).status,
      (await request(who, 'PATCH', S + '/1', { name: 'x' })).status, (await request(who, 'DELETE', S + '/1')).status], [403, 403, 403, 403, 403], who.email)
  }
  assert.deepEqual(expectStatus(await request(users.manager, 'GET', S), 200), { available: true, mailboxes: [] })
  assert.deepEqual(expectStatus(await request(users.manager, 'GET', S + '/users?q=' + encodeURIComponent('حساب a')), 200), [{ id: users.a.id, displayName: 'حساب a', email: 'a@mailbox.invalid' }])
  assert.deepEqual(expectStatus(await request(users.manager, 'GET', S + '/users?q=x'), 200), [])
  // القيم
  for (const [body, code] of [[{ address: 'nope', name: 'صندوق' }, 'MAIL_SHARED_ADDRESS'], [{ address: SHARED, name: 'ص' }, 'MAIL_SHARED_NAME'], [{ address: SHARED, name: 'صندوق', userIds: [987654] }, 'MAIL_SHARED_USERS'],
    [{ address: SHARED, name: 'صندوق', userIds: 'all' }, 'MAIL_SHARED_USERS']]) assert.deepEqual(codeOf(await request(users.manager, 'POST', S, body)), [400, code], JSON.stringify(body))
  const createdView = expectStatus(await request(users.manager, 'POST', S, { address: ' Info@Mailbox.INVALID ', name: ' صندوق  الاستفسارات ', userIds: [users.a.id] }), 201)
  const row = createdView.mailboxes[0]
  assert.deepEqual([row.address, row.name, row.isActive, row.users.map(user => user.id)], [SHARED, 'صندوق الاستفسارات', true, [users.a.id]])
  assert.deepEqual(codeOf(await request(users.manager, 'POST', S, { address: 'INFO@mailbox.invalid', name: 'تاني' })), [409, 'MAIL_SHARED_DUPLICATE'])
  assert.equal((await request(users.manager, 'PATCH', S + '/987654', { name: 'مش موجود' })).status, 404)

  // أ مضاف: الصندوق تحت مجلداته؛ ب لأ
  fullAccess[SHARED] = ['a@mailbox.invalid']
  assert.deepEqual(expectStatus(await request(users.a, 'GET', M + '/folders', undefined, a), 200).shared, [{ address: SHARED, name: 'صندوق الاستفسارات' }])
  assert.deepEqual(expectStatus(await request(users.b, 'GET', M + '/folders', undefined, b), 200).shared, [])
  const sharedFolders = expectStatus(await request(users.a, 'GET', M + `/folders?mbx=${SHARED}`, undefined, a), 200)
  assert.deepEqual([sharedFolders.shared, sharedFolders.wellKnown[0].total, calls.at(-1).target, calls.at(-1).login], [undefined, 1, SHARED, 'a@mailbox.invalid'], 'بدخول أ نفسه على الصندوق المشترك')
  assert.equal(expectStatus(await request(users.a, 'GET', M + `/messages?mbx=${encodeURIComponent('INFO@Mailbox.invalid')}`, undefined, a), 200).items[0].subject, 'استفسار عميل')
  // «غير المقروء» على السلك لصندوق مشترك: الطلب بيتوجّه لصندوقه
  expectStatus(await request(users.a, 'GET', M + `/unread?mbx=${SHARED}`, undefined, a), 200)
  assert.deepEqual([fake.logins.at(-1).user, fake.logins.at(-1).anchor], ['a@mailbox.invalid', SHARED])
  let before = calls.length
  assert.deepEqual([codeOf(await request(users.b, 'GET', M + `/folders?mbx=${SHARED}`, undefined, b)), codeOf(await request(users.b, 'GET', M + `/messages?mbx=${SHARED}`, undefined, b)), calls.length],
    [[403, 'MAIL_NO_ACCESS'], [403, 'MAIL_NO_ACCESS'], before], 'ب مش مضاف: مرفوض قبل خادم البريد')
  // ب اتضاف في النظام بس مالوش صلاحية على خادم البريد: خادم البريد هو اللي بيرفض (بدخول ب)
  const both = expectStatus(await request(users.manager, 'PATCH', S + `/${row.id}`, { userIds: [users.a.id, users.b.id] }), 200)
  assert.deepEqual(both.mailboxes[0].users.map(user => user.id).sort(), [users.a.id, users.b.id].sort())
  assert.deepEqual([codeOf(await request(users.b, 'GET', M + `/folders?mbx=${SHARED}`, undefined, b)), calls.at(-1).login, calls.at(-1).target], [[403, 'MAIL_NO_ACCESS'], 'b@mailbox.invalid', SHARED])
  // موقوف: مابيظهرش ومابيتفتحش لحد
  expectStatus(await request(users.manager, 'PATCH', S + `/${row.id}`, { isActive: false, name: 'استفسارات العملاء' }), 200)
  before = calls.length
  assert.deepEqual([expectStatus(await request(users.a, 'GET', M + '/folders', undefined, a), 200).shared, codeOf(await request(users.a, 'GET', M + `/folders?mbx=${SHARED}`, undefined, a)), calls.length],
    [[], [403, 'MAIL_NO_ACCESS'], before + 1])
  assert.equal((await request(users.manager, 'PATCH', S + `/${row.id}`, { isActive: 'yes' })).status, 400)
  expectStatus(await request(users.manager, 'PATCH', S + `/${row.id}`, { isActive: true, userIds: [users.a.id] }), 200)
  assert.equal(expectStatus(await request(users.a, 'GET', M + `/folders?mbx=${SHARED}`, undefined, a), 200).wellKnown.length, 5)
  // سجل التدقيق: مين عرّف وغيّر (من غير أي محتوى بريد)
  assert.deepEqual([(await auditRows('MAIL_SHARED_MAILBOX_CREATED')).map(entry => entry.actorUserId), (await auditRows('MAIL_SHARED_MAILBOX_CHANGED')).length], [[users.manager.id], 3])

  // ===== قبل ترحيل 192: صندوق الموظف نفسه شغال، ومفيش صناديق مشتركة، والشاشة بتقول إن الترحيل ناقص، وكل كتابة مرفوضة =====
  const synchronized = await shape()
  assert.deepEqual(TABLES.map(table => synchronized[table].columns.length), [4, 8, 5])
  assert.deepEqual(TABLES.map(table => synchronized[table].indexes.map(index => index.name)), [['PK_mail_accounts', 'UX_mail_accounts_user'], ['PK_mail_shared_mailboxes', 'UX_mail_shared_mailboxes_address'],
    ['PK_mail_shared_mailbox_users', 'UX_mail_shared_mailbox_users_pair']])
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(query => query.query), [], 'الكيانات والقاعدة بنفس الشكل')
  assertDisposable()
  await pool.request().batch(TABLES.map(table => `DROP TABLE dbo.${table};`).join(' '))
  require('../src/mailbox/mailbox-store').resetMailboxTablesCache()
  assert.deepEqual(expectStatus(await request(users.manager, 'GET', S), 200), { available: false, message: rules.MAILBOX_MIGRATION_MISSING, mailboxes: [] })
  for (const [method, route, body] of [['POST', S, { address: 'new@mailbox.invalid', name: 'جديد' }], ['PATCH', S + `/${row.id}`, { name: 'اسم' }], ['DELETE', S + `/${row.id}`]]) {
    const refused = await request(users.manager, method, route, body)
    assert.deepEqual([refused.status, refused.body.message], [400, rules.MAILBOX_MIGRATION_MISSING], method)
  }
  assert.deepEqual([expectStatus(await request(users.a, 'GET', M + '/folders', undefined, a), 200).shared, codeOf(await request(users.a, 'GET', M + `/folders?mbx=${SHARED}`, undefined, a))], [[], [403, 'MAIL_NO_ACCESS']])
  assert.equal(expectStatus(await request(users.a, 'GET', M + '/status', undefined, a), 200).login, 'a@mailbox.invalid', 'اسم الدخول = بريد الحساب')
  assert.equal(expectStatus(await request(users.a, 'GET', M + '/messages', undefined, a), 200).items.length, 2)
  // الترحيل: بيعمل الجداول بنفس شكل الكيانات والفرق صفر، وآمن للتكرار، وعملية شغالة من قبله بتشوفه أول ما يتطبق
  const runFile = async () => { for (const batch of migrate.splitBatches(fs.readFileSync(MIGRATION, 'utf8').replace(/\r\n/g, '\n'))) await pool.request().batch(batch) }
  await runFile()
  assert.deepEqual(await shape(), synchronized, 'نفس شكل synchronize بالحرف')
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(query => query.query), [])
  assert.deepEqual(expectStatus(await request(users.manager, 'GET', S), 200), { available: true, mailboxes: [] })
  const again = expectStatus(await request(users.manager, 'POST', S, { address: SHARED, name: 'صندوق الاستفسارات', userIds: [users.a.id] }), 201).mailboxes[0]
  for (let round = 0; round < 2; round++) await runFile()
  assert.deepEqual([await shape(), (await ds.query('SELECT COUNT(*) AS [n] FROM [mail_shared_mailbox_users]'))[0].n], [synchronized, 1])
  // جدول بنفس الاسم وبشكل تاني: الترحيل بيقف بكوده من غير ما يلمسه
  await pool.request().batch('DROP TABLE dbo.mail_accounts; CREATE TABLE dbo.mail_accounts ([id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_mail_accounts] PRIMARY KEY, [userId] int NOT NULL);')
  await assert.rejects(runFile(), error => Number(error.number) === 192001)
  assert.equal(Number((await ds.query(`SELECT COUNT(*) AS [n] FROM sys.columns WHERE [object_id] = OBJECT_ID(N'dbo.mail_accounts')`))[0].n), 2)
  await pool.request().batch('DROP TABLE dbo.mail_accounts;')
  await runFile()
  assert.deepEqual(await shape(), synchronized)
  // الحذف: التعريف بيتشال من النظام
  assert.deepEqual(expectStatus(await request(users.manager, 'DELETE', S + `/${again.id}`), 200), { available: true, mailboxes: [] })
  assert.deepEqual([expectStatus(await request(users.a, 'GET', M + '/folders', undefined, a), 200).shared, (await auditRows('MAIL_SHARED_MAILBOX_REMOVED')).length], [[], 1])
  state.sharedRow = expectStatus(await request(users.manager, 'POST', S, { address: SHARED, name: 'صندوق الاستفسارات', userIds: [users.a.id] }), 201).mailboxes[0]
})

test('MB-07: الإرسال — نموذج متعدد الأجزاء بمرفق باسم عربي، والهوية من الجلسة، والقيم الغلط مرفوضة قبل خادم البريد', async () => {
  const a = { cookie: state.keyA }, b = { cookie: state.keyB }
  const send = (who, payload, files = [], options = {}, route = '/send') => {
    const form = new FormData()
    if (payload !== undefined) form.append('payload', typeof payload === 'string' ? payload : JSON.stringify(payload))
    for (const [name, content] of files) form.append('attachments', new Blob([content]), name)
    return request(who, 'POST', M + route, undefined, { ...options, form })
  }
  const sent = await send(users.a, { mode: 'new', to: ['client@elsewhere.invalid'], cc: ['peer@mailbox.invalid'], subject: 'عرض السعر', html: '<p>مرفق العرض</p>', from: 'b@mailbox.invalid', userId: users.b.id },
    [['عرض السعر.pdf', '%PDF-1.4 offer']], a)
  assert.deepEqual([sent.status, sent.body], [200, { ok: true }])
  const call = calls.at(-1)
  assert.deepEqual([call.method, call.userId, call.login, call.target], ['send', users.a.id, 'a@mailbox.invalid', null], 'المرسل صاحب الجلسة — خانة from في الطلب متجاهلة')
  assert.deepEqual(call.input, { mode: 'new', refId: undefined, to: ['client@elsewhere.invalid'], cc: ['peer@mailbox.invalid'], bcc: [], subject: 'عرض السعر', html: '<p>مرفق العرض</p>',
    attachments: [{ name: 'عرض السعر.pdf', base64: Buffer.from('%PDF-1.4 offer').toString('base64') }] })
  assert.equal(boxes['a@mailbox.invalid'].sent.length, 1)
  // رد على رسالة من صندوقه، ومن غير مرفقات
  expectStatus(await send(users.a, { mode: 'replyAll', refId: id('a-1'), to: ['buyer@mailbox.invalid'], subject: 'RE: عقد المورد', html: 'تمام' }, [], a), 200)
  assert.deepEqual([calls.at(-1).input.mode, calls.at(-1).input.refId, calls.at(-1).input.attachments], ['replyAll', id('a-1'), []])
  // من الصندوق المشترك: للمضاف عليه بس
  expectStatus(await send(users.a, { to: ['client@elsewhere.invalid'], subject: 'رد الاستفسار', html: 'شكرًا' }, [], a, `/send?mbx=${SHARED}`), 200)
  assert.deepEqual([calls.at(-1).target, calls.at(-1).login, boxes[SHARED].sent.length], [SHARED, 'a@mailbox.invalid', 1])
  const before = calls.length
  assert.deepEqual(codeOf(await send(users.b, { to: ['client@elsewhere.invalid'], subject: 'x', html: 'x' }, [], b, `/send?mbx=${SHARED}`)), [403, 'MAIL_NO_ACCESS'])
  // القيم الغلط
  for (const [payload, code] of [[{ subject: 'من غير مستلم' }, 'MAIL_NO_RECIPIENTS'], [{ to: ['مش عنوان'] }, 'MAIL_BAD_ADDRESS'], [{ mode: 'reply', to: ['x@y.invalid'] }, 'MAIL_BAD_ID'],
    [{ mode: 'forward', refId: 'short', to: ['x@y.invalid'] }, 'MAIL_BAD_ID'], ['{not json', 'MAIL_BAD_PAYLOAD'], [undefined, 'MAIL_BAD_PAYLOAD'], ['[]', 'MAIL_BAD_PAYLOAD']]) {
    assert.deepEqual(codeOf(await send(users.a, payload, [], a)), [400, code], JSON.stringify(payload))
  }
  assert.equal((await send(users.a, { to: ['x@y.invalid'] }, Array.from({ length: 21 }, (_, index) => [`f${index}.txt`, 'x']), a)).status, 400, 'أكتر من 20 مرفق')
  // مقفول: مفيش إرسال
  assert.deepEqual(codeOf(await send(users.a, { to: ['x@y.invalid'] }, [])), [428, 'MAIL_LOCKED'])
  assert.deepEqual([calls.length, boxes['a@mailbox.invalid'].sent.length], [before, 2], 'ولا نداء إرسال من الطلبات المرفوضة')
})

test('MB-08: «الدخول بحساب الشركة» بيمسك كلمة السر للجلسة لما الموديول مفعّل للحساب — البريد بيفتح من غير نموذج؛ والخروج بيمسح', async () => {
  state.directory.set('sami@corp.invalid', { objectGuid: '11111111-2222-3333-4444-555555555555', password: PASS.domain, mail: 'sami.mail@mailbox.invalid', displayName: 'سامي من الدليل' })
  const login = (body, options) => request(null, 'POST', '/auth/login/domain', body, options)
  // كلمة غلط: مفيش جلسة ولا مفتاح
  const bad = await login({ username: 'sami', password: PASS.wrong, cookieSession: true })
  assert.deepEqual([bad.status, bad.setCookie], [401, []])

  // الموديول مقفول: الدخول زي ما هو بالحرف — مفيش مفتاح بريد ولا اسم دخول بيتسجّل
  expectStatus(await request(users.admin, 'PUT', '/modules/mail', { enabled: false }), 200); modules.invalidate()
  const closed = await login({ username: 'sami', password: PASS.domain, cookieSession: true })
  assert.equal(closed.status, 201, closed.text)
  assert.deepEqual([closed.setCookie.length, closed.setCookie[0].startsWith('hr_session='), (await ds.query('SELECT COUNT(*) AS [n] FROM [mail_accounts]'))[0].n], [1, true, 0])
  const closedSession = closed.setCookie[0].split(';')[0]
  const closedOut = await request(null, 'POST', '/auth/logout', undefined, { cookie: closedSession, headers: { 'X-CSRF-Token': closed.body.csrfToken } })
  assert.deepEqual([closedOut.status, closedOut.setCookie.length], [200, 2], 'cookie الجلسة اتمسحت (ومفتاح البريد لو كان فيه)')
  expectStatus(await request(users.admin, 'PUT', '/modules/mail', { enabled: true }), 200); modules.invalidate()

  // الموديول مفعّل: جلسة cookie + مفتاح البريد في نفس الرد، والرد من غير توكن ولا مفتاح ولا كلمة سر
  const opened = await login({ username: 'sami', password: PASS.domain, cookieSession: true })
  assert.equal(opened.status, 201, opened.text)
  assert.equal(opened.setCookie.length, 2)
  assert.match(opened.setCookie[0], /^hr_session=[^;]+; Path=\/; HttpOnly; SameSite=Strict$/)
  assert.match(opened.setCookie[1], /^hr_mail_key=[A-Za-z0-9_-]{43}; Path=\/api\/mail; HttpOnly; SameSite=Strict$/)
  assert.deepEqual([Object.keys(opened.body).sort(), opened.body.user.email, opened.body.user.domainAccount], [['csrfToken', 'user'], 'sami.mail@mailbox.invalid', true])
  const key = opened.setCookie[1].split(';')[0].split('=')[1]
  assert.equal(opened.text.includes(key), false)
  const cookie = opened.setCookie.map(value => value.split(';')[0]).join('; ')
  users.domain = await repo('User').findOneByOrFail({ email: 'sami.mail@mailbox.invalid' })
  // اسم الدخول في المجال اتسجّل (الاسم بس)
  assert.deepEqual(await ds.query('SELECT [userId], [login] FROM [mail_accounts]'), [{ userId: users.domain.id, login: 'sami@corp.invalid' }])
  // البريد مفتوح من غير «افتح بريدك»: الهوية = اسمه في المجال، وكلمة السر اللي دخل بيها وصلت لخادم البريد صح
  assert.deepEqual(expectStatus(await request(null, 'GET', M + '/status', undefined, { cookie }), 200),
    { configured: true, unlocked: true, login: 'sami@corp.invalid', address: 'sami.mail@mailbox.invalid', canManageShared: false })
  assert.equal(expectStatus(await request(null, 'GET', M + '/messages', undefined, { cookie }), 200).items[0].subject, 'أهلًا سامي')
  assert.deepEqual([calls.at(-1).userId, calls.at(-1).login], [users.domain.id, 'sami@corp.invalid'])
  assert.deepEqual(expectStatus(await request(null, 'GET', M + '/unread', undefined, { cookie }), 200), { unread: 3 })
  assert.deepEqual(fake.logins.at(-1), { user: 'sami@corp.invalid', domain: '', ok: true, anchor: null }, 'على السلك برد تحدي كلمة السر اللي دخل بيها')
  // جلسة cookie: طلب الكتابة على البريد محتاج رمز CSRF بتاع الجلسة زي أي كتابة
  assert.deepEqual(codeOf(await request(null, 'POST', M + '/lock', undefined, { cookie })), [403, 'CSRF_TOKEN_INVALID'])
  assert.equal(expectStatus(await request(null, 'GET', M + '/status', undefined, { cookie }), 200).unlocked, true)
  // من غير مفتاح البريد (cookie الجلسة لوحدها): مقفول
  assert.deepEqual(codeOf(await request(null, 'GET', M + '/messages', undefined, { cookie: opened.setCookie[0].split(';')[0] })), [428, 'MAIL_LOCKED'])

  // الخروج: الـcookie الاتنين بيتمسحوا، والنص بيتمسح من الخادم
  const payload = jwt.decode(opened.setCookie[0].split(';')[0].split('=')[1])
  const scope = { userId: payload.sub, tokenVersion: payload.tokenVersion ?? 0, sid: payload.sid ?? null }
  assert.equal(vault.has(scope), true)
  const out = await request(null, 'POST', '/auth/logout', undefined, { cookie, headers: { 'X-CSRF-Token': opened.body.csrfToken } })
  assert.deepEqual([out.status, out.setCookie], [200, ['hr_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0', 'hr_mail_key=; Path=/api/mail; HttpOnly; SameSite=Strict; Max-Age=0']])
  assert.deepEqual([vault.has(scope), (await request(null, 'GET', M + '/status', undefined, { cookie })).status], [false, 401])

  // جلسة توكن (سكربت): التوكن في الرد زي ما هو، ومفتاح البريد cookie برضه
  const bearer = await login({ username: 'CORP\\sami', password: PASS.domain })
  assert.equal(bearer.status, 201, bearer.text)
  assert.deepEqual([typeof bearer.body.accessToken, bearer.setCookie.length, bearer.setCookie[0].startsWith('hr_mail_key=')], ['string', 1, true])
  const viaToken = { token: bearer.body.accessToken }
  assert.equal(expectStatus(await request(viaToken, 'GET', M + '/messages', undefined, { cookie: bearer.setCookie[0].split(';')[0] }), 200).items.length, 1)
  // «افتح بريدك» بعد كده (جلسة تانية من غير مسك): بيدخل خادم البريد بالاسم المسجّل، مش ببريد الحساب
  const fresh = { ...users.domain, permissions: '[]' }
  assert.deepEqual(codeOf(await request(fresh, 'GET', M + '/messages')), [428, 'MAIL_LOCKED'])
  const freshKey = await unlock(fresh, PASS.domain)
  assert.equal(fake.logins.at(-1).user, 'sami@corp.invalid')
  assert.equal(expectStatus(await request(fresh, 'GET', M + '/messages', undefined, { cookie: freshKey }), 200).items.length, 1)
})

test('MB-09: ولا كلمة سر في أي رد ولا سطر سجل ولا طلب على السلك ولا عمود في القاعدة', async () => {
  const secrets = [...new Set(Object.values(PASS).concat([...accounts.values()]))]
  assert.ok(secrets.length >= 5 && responses.length > 150 && fake.requests.length > 20, `${secrets.length} ${responses.length} ${fake.requests.length}`)
  // المفاتيح اللي اتبعتت للمتصفح: في ترويسة Set-Cookie بس، وعمرها ما ظهرت في جسم رد ولا في سجل
  const keys = [...new Set(responses.flatMap(entry => [...entry.matchAll(/hr_mail_key=([A-Za-z0-9_-]{43})/g)].map(match => match[1])))]
  assert.ok(keys.length >= 8, String(keys.length))
  for (const value of secrets) {
    assert.equal(responses.some(entry => entry.includes(value)), false, 'كلمة سر في رد')
    assert.equal(logs.some(entry => entry.includes(value)), false, 'كلمة سر في سطر سجل')
    assert.equal(fake.requests.some(entry => entry.includes(value)), false, 'كلمة سر على السلك')
    assert.equal(calls.some(entry => JSON.stringify(entry).includes(value)), false, 'كلمة سر في سجل نداءات الاختبار')
  }
  for (const key of keys) {
    assert.equal(logs.some(entry => entry.includes(key)), false, 'مفتاح في سطر سجل')
    assert.equal(responses.some(entry => entry.split('\n').slice(2).join('\n').includes(key)), false, 'مفتاح في جسم رد')
  }
  // القاعدة: كل عمود نصي في كل جدول فيه صفوف
  const columns = await ds.query(`SELECT t.[name] AS [tableName], c.[name] AS [columnName] FROM sys.tables t
    INNER JOIN sys.columns c ON c.[object_id] = t.[object_id] INNER JOIN sys.types ty ON ty.[user_type_id] = c.[user_type_id]
    WHERE ty.[name] IN (N'nvarchar', N'varchar', N'nchar', N'char', N'ntext', N'text')
      AND EXISTS (SELECT 1 FROM sys.partitions p WHERE p.[object_id] = t.[object_id] AND p.[index_id] IN (0, 1) AND p.[rows] > 0)`)
  const byTable = new Map()
  for (const column of columns) byTable.set(column.tableName, [...(byTable.get(column.tableName) ?? []), column.columnName])
  assert.ok(byTable.has('audit_log') && byTable.has('mail_accounts') && byTable.has('users') && byTable.size > 8, [...byTable.keys()].join(','))
  const needles = [...secrets, ...keys]
  let scanned = 0
  for (const [table, names] of byTable) {
    for (let offset = 0; offset < needles.length; offset += 20) {
      const part = needles.slice(offset, offset + 20)
      const where = names.map(name => part.map((_, index) => `CHARINDEX(@${index}, CAST([${name}] AS nvarchar(max))) > 0`).join(' OR ')).join(' OR ')
      const [found] = await ds.query(`SELECT COUNT(*) AS [n] FROM [${table}] WHERE ${where}`, part)
      assert.equal(Number(found.n), 0, `سر أو مفتاح محفوظ في جدول ${table}`)
      scanned++
    }
  }
  assert.ok(scanned >= byTable.size)
  // وسجل الخادم مافيهوش أخطاء من مسارات البريد (غير الخادم الواقف المقصود في MB-03)
  const errors = logs.filter(entry => entry.startsWith('ERROR') && /EWS|Mailbox|Mail(Vault|Session)/.test(entry))
  assert.ok(errors.length === 6 && errors.every(entry => entry.includes('EWS: مفيش رد من خادم البريد')), errors.join('\n').slice(0, 600))
})
