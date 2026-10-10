'use strict'
// B-ADD.5: قنوات الإشعارات — القواعد النقية وتوصيل الشاشة، من غير قاعدة بيانات ومن غير أي اتصال (لا SMTP ولا Meta).
//  NCU-01) ختم الأسرار: AES-GCM بمفتاح مشتق من سر الخادم، وكل ختم مختلف، والنص المتغيّر أو سر خادم تاني = null.
//  NCU-02) إعداد خادم البريد: الاختيارات الجاهزة، والتحقق، وTLS إلزامي وشهادة الخادم بتتفحص دايمًا.
//  NCU-03) MailService: الإعداد المحفوظ بياخد مكان إعداد الخادم ويرجع له، والاتصال بيتبني تاني من غير إعادة تشغيل، ورمز الدخول على نفس المسار.
//  NCU-04) رقم الواتساب: E.164، والمحلي بكود الدولة، والتخفية.
//  NCU-05) ربط قالب Meta: متغيرات الحدث بس (السري من غير نوع ولا اسم)، وقيم المتغيرات نظيفة.
//  NCU-06) مزوّد Meta: شكل الطلب، وتصنيف الفشل (مرفوضة، المزوّد واقف، تتعاد)، والسبب من غير التوكن ولا رقم كامل، والعنوان خادم Meta بس.
//  NCU-07) قاعدة الحدث × القناة الافتراضية = سلوك النظام الحالي، وفحص الترحيل: الناقص بيتفحص مع كل نداء والموجود بيتحفظ.
//  NCU-08) توصيل الشاشة: المسارات بصلاحياتها (مدير النظام بس للإعداد)، وعميل الـAPI، والقايمة والعنوان والترجمة، والأسرار مابتتعرضش.
// Run (من api/): node --test test/notification-channels.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const root = path.join(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')
const rules = require('../src/notifications/channels/channel-rules')
const meta = require('../src/notifications/channels/whatsapp-meta')
const events = require('../src/notifications/notification-events')
const refused = (work, text) => assert.throws(work, error => error.getStatus?.() === 400 && text.test(error.message), String(text))

test('NCU-01: ختم الأسرار — بمفتاح مشتق من سر الخادم، وكل ختم مختلف، والمتغيّر أو سر خادم تاني = null', () => {
  const server = crypto.randomBytes(32).toString('hex'), value = `قيمة-${crypto.randomBytes(8).toString('hex')}`
  const sealed = rules.sealChannelSecret(value, server)
  assert.match(sealed, /^n1\.[A-Za-z0-9+/=]{16}\.[A-Za-z0-9+/=]{24}\.[A-Za-z0-9+/=]+$/)
  assert.equal(sealed.includes(value), false)
  assert.notEqual(rules.sealChannelSecret(value, server), sealed, 'IV جديد كل مرة')
  assert.equal(rules.openChannelSecret(sealed, server), value)
  assert.equal(rules.openChannelSecret(sealed, `${server}x`), null)
  const parts = sealed.split('.')
  parts[3] = Buffer.from('نص تاني').toString('base64')
  for (const broken of [parts.join('.'), sealed.replace(/^n1/, 'w1'), 'n1.a.b', '', null, 5]) assert.equal(rules.openChannelSecret(broken, server), null)
  // نفس مصدر المفتاح بتاع أسرار الـwebhook وتطبيق المصادقة (سر الخادم)، من غير متغير بيئة جديد
  const service = read('api/src/notifications/channels/notification-channels.service.ts')
  assert.match(service, /return this\.config\.getOrThrow<string>\('JWT_SECRET'\)/)
  assert.equal(/process\.env/.test(service + read('api/src/notifications/channels/channel-rules.ts')), false)
  // السر الجاي من الشاشة: مش مبعوت = المحفوظ زي ما هو، فاضي = مسح، وبالحرف من غير تنضيف
  assert.deepEqual([rules.incomingSecret(undefined, 'س'), rules.incomingSecret(null, 'س'), rules.incomingSecret('', 'س'), rules.incomingSecret('  ab c  ', 'س')], [undefined, null, null, '  ab c  '])
  refused(() => rules.incomingSecret('سطر\nتاني', 'كلمة سر البريد'), /كلمة سر البريد غير صالح/)
  refused(() => rules.incomingSecret(12345, 'توكن الواتساب'), /توكن الواتساب غير صالح/)
})

test('NCU-02: إعداد خادم البريد — الاختيارات الجاهزة، والتحقق، وTLS إلزامي وشهادة الخادم بتتفحص', () => {
  assert.deepEqual(Object.keys(rules.MAIL_PRESETS), ['SMTP', 'MICROSOFT_365', 'GOOGLE_WORKSPACE'])
  assert.deepEqual([rules.MAIL_PRESETS.MICROSOFT_365.host, rules.MAIL_PRESETS.MICROSOFT_365.port, rules.MAIL_PRESETS.MICROSOFT_365.encryption], ['smtp.office365.com', 587, 'STARTTLS'])
  assert.deepEqual([rules.MAIL_PRESETS.GOOGLE_WORKSPACE.host, rules.MAIL_PRESETS.GOOGLE_WORKSPACE.port], ['smtp.gmail.com', 587])
  assert.deepEqual(Object.keys(rules.MAIL_ENCRYPTIONS), ['STARTTLS', 'SSL'], 'مفيش اختيار «من غير تشفير»')
  const input = { preset: 'SMTP', host: ' Mail.Example.COM ', port: '587', encryption: 'STARTTLS', user: ' hr ', fromName: ' الموارد البشرية ', fromAddress: ' hr@example.com ', password: 'x', extra: 1 }
  const clean = rules.cleanMailSettings(input)
  assert.deepEqual(clean, { preset: 'SMTP', host: 'mail.example.com', port: 587, encryption: 'STARTTLS', user: 'hr', fromName: 'الموارد البشرية', fromAddress: 'hr@example.com' })
  assert.equal(rules.cleanMailSettings({ ...input, host: '10.0.0.5' }).host, '10.0.0.5', 'خادم داخلي بعنوانه مسموح (مرحّل بريد الشركة)')
  for (const [change, text] of [[{ host: '' }, /اسم خادم البريد/], [{ host: 'smtp.example.com:587' }, /اسم خادم البريد/], [{ host: 'smtp.example.com/x' }, /اسم خادم البريد/], [{ port: 0 }, /منفذ/],
    [{ port: 1.5 }, /منفذ/], [{ encryption: 'PLAIN' }, /تشفير/], [{ user: 'a\nb' }, /مستخدم/], [{ fromName: 'x<y>' }, /اسم المرسل/], [{ fromAddress: 'hr' }, /عنوان المرسل/], [{ preset: 'X' }, /نوع خادم/]]) {
    refused(() => rules.cleanMailSettings({ ...input, ...change }), text)
  }
  assert.equal(rules.storedMailSettings('{bad json'), null)
  assert.equal(rules.storedMailSettings(JSON.stringify({ host: 'x' })), null)
  const starttls = rules.mailConfigOf(clean, 'pw'), ssl = rules.mailConfigOf({ ...clean, encryption: 'SSL', port: 465, fromName: '' }, null)
  assert.deepEqual(starttls, { host: 'mail.example.com', port: 587, secure: false, requireTls: true, rejectUnauthorized: true, user: 'hr', password: 'pw', from: '"الموارد البشرية" <hr@example.com>', timeoutMs: 15000 })
  assert.deepEqual([ssl.secure, ssl.requireTls, ssl.rejectUnauthorized, ssl.password, ssl.from], [true, false, true, '', 'hr@example.com'])
})

test('NCU-03: MailService — الإعداد المحفوظ بياخد مكان إعداد الخادم ويرجع له، والاتصال بيتبني تاني من غير إعادة تشغيل', async () => {
  const { MailService } = require('../src/auth/mail.service')
  const env = { SMTP_HOST: 'env.example.invalid', SMTP_FROM: 'env@example.invalid' }
  const built = []
  class Probe extends MailService {
    // بديل الاتصال الحقيقي: بيسجّل الإعداد اللي الاتصال اتبنى بيه ومابيفتحش أي اتصال
    transporter() {
      if (!this.transport) { built.push(this.config.host); this.transport = { sendMail: async options => ({ accepted: [options.to], rejected: [], messageId: 'probe', response: `250 via ${this.config.host}` }) } }
      return this.transport
    }
  }
  const mail = new Probe({ get: key => env[key] })
  assert.deepEqual([mail.isConfigured(), mail.status().source, mail.status().server], [true, 'env', 'env.example.invalid:587'])
  assert.equal((await mail.send({ to: 'a@example.invalid', subject: 's', text: 't' })).response, '250 via env.example.invalid')
  const stored = rules.mailConfigOf(rules.cleanMailSettings({ host: 'screen.example.invalid', port: 465, encryption: 'SSL', user: 'u', fromAddress: 'screen@example.invalid' }), 'pw')
  mail.useStoredConfig(stored)
  assert.deepEqual([mail.status().source, mail.status().server, mail.status().from, mail.status().secure, mail.status().authConfigured], ['screen', 'screen.example.invalid:465', 'screen@example.invalid', true, true])
  assert.equal(JSON.stringify(mail.status()).includes('pw'), false, 'الملخص من غير كلمة السر')
  // رمز الدخول (two-factor) بينادي send نفسها: بيطلع من الخادم المحفوظ من أول رسالة
  assert.equal((await mail.send({ to: 'a@example.invalid', subject: 's', text: 't' })).response, '250 via screen.example.invalid')
  // نفس الإعداد تاني = الاتصال القايم بيفضل
  mail.useStoredConfig({ ...stored })
  await mail.send({ to: 'a@example.invalid', subject: 's', text: 't' })
  assert.deepEqual(built, ['env.example.invalid', 'screen.example.invalid'])
  mail.useStoredConfig(null)
  assert.deepEqual([mail.status().source, (await mail.send({ to: 'a@example.invalid', subject: 's', text: 't' })).response], ['env', '250 via env.example.invalid'])
  // المصدر (القاعدة) بيتقري قبل الإرسال كل MAIL_STORED_REFRESH_MS: نسخة تانية من الخادم بتشوف التغيير؛ وفشل القراءة بيسيب الإعداد الحالي
  let source = stored, reads = 0
  mail.setStoredSource(async () => { reads++; if (source === 'boom') throw new Error('القاعدة مش بترد'); return source })
  await mail.send({ to: 'a@example.invalid', subject: 's', text: 't' })
  assert.deepEqual([reads, mail.status().source], [1, 'screen'])
  await mail.send({ to: 'a@example.invalid', subject: 's', text: 't' })
  assert.equal(reads, 1, 'جوه المهلة مفيش قراءة تانية')
  source = 'boom'
  await mail.refreshStoredConfig(true)
  assert.deepEqual([reads, mail.status().source], [2, 'screen'])
  source = null
  await mail.refreshStoredConfig(true)
  assert.equal(mail.status().source, 'env')
  // من غير إعداد خالص: الإعداد المحفوظ لوحده كفاية
  const bare = new Probe({ get: () => undefined })
  assert.equal(bare.isConfigured(), false)
  bare.useStoredConfig(stored)
  assert.equal(bare.isConfigured(), true)
  const service = read('api/src/auth/mail.service.ts')
  assert.match(service, /async send\(message: MailMessage\): Promise<MailSendResult> \{\n\s+await this\.refreshStoredConfig\(\)/)
})

test('NCU-04: رقم الواتساب — E.164، والمحلي بكود الدولة، والتخفية', () => {
  const normal = rules.normalizeWhatsappNumber
  assert.deepEqual(['+966 50 123 4567', '00966501234567', '966501234567', '(966) 50-123.4567', '+٩٦٦٥٠١٢٣٤٥٦٧', 966501234567].map(value => normal(value)), Array(6).fill('966501234567'))
  assert.equal(normal('0501234567'), null, 'محلي من غير كود دولة افتراضي')
  assert.equal(normal('0501234567', '966'), '966501234567')
  assert.equal(normal('+201001234567', '966'), '201001234567', 'الدولي مابيتغيّرش بالكود الافتراضي')
  for (const bad of ['', '   ', '12345', '+0123456789', '+9665012345678901', 'abc', '+966-50-abc', null, undefined, {}, '50 1234 567x']) assert.equal(normal(bad, '966'), null, String(bad))
  assert.deepEqual([rules.maskPhone('966501234567'), rules.maskPhone('201001234567'), rules.maskPhone('12345'), rules.maskPhone(''), rules.maskPhone(null)], ['+9665******67', '+2010******67', '+1****', '', ''])
  // إعداد الواتساب: المعرّفات أرقام بس، والإصدار بشكله، ورقم الشركة دولي
  const settings = rules.cleanWhatsappSettings({ phoneNumber: '0500000000', phoneNumberId: ' 123456789 ', businessAccountId: '', defaultCountryCode: '+966', fallbackToPhone: 'yes', token: 'x' })
  assert.deepEqual(settings, { provider: 'META_CLOUD', phoneNumber: '966500000000', phoneNumberId: '123456789', businessAccountId: '', apiVersion: 'v21.0', defaultCountryCode: '966', fallbackToPhone: false })
  for (const [change, text] of [[{ phoneNumberId: '12-34' }, /Phone number ID/], [{ businessAccountId: 'waba' }, /WABA/], [{ apiVersion: 'v21' }, /إصدار/], [{ apiVersion: '../v21.0' }, /إصدار/],
    [{ defaultCountryCode: '0' }, /كود الدولة/], [{ provider: 'OTHER' }, /مزوّد/]]) {
    refused(() => rules.cleanWhatsappSettings({ phoneNumberId: '123456789', ...change }), text)
  }
  assert.equal(rules.storedWhatsappSettings('{}'), null)
})

test('NCU-05: ربط قالب Meta — متغيرات الحدث بس (السري من غير نوع ولا اسم)، وقيم المتغيرات نظيفة', () => {
  const binding = rules.cleanWhatsappBinding('request.pending_approval', { templateName: ' approval_pending ', languageCode: 'ar', variables: ['request.type', 'link', 'request.type'], extra: true })
  assert.deepEqual(binding, { templateName: 'approval_pending', languageCode: 'ar', variables: ['request.type', 'link', 'request.type'] })
  assert.equal(rules.cleanWhatsappBinding('task.assigned', { templateName: 'task_new', languageCode: 'en_US', variables: [] }).languageCode, 'en_US')
  for (const [code, value, text] of [['request.pending_approval', { templateName: 'Approval', languageCode: 'ar', variables: [] }, /اسم قالب الواتساب/],
    ['request.pending_approval', { templateName: 'a b', languageCode: 'ar', variables: [] }, /اسم قالب الواتساب/], ['request.pending_approval', { templateName: 'ok', languageCode: 'AR', variables: [] }, /كود لغة/],
    ['request.pending_approval', { templateName: 'ok', languageCode: 'ar', variables: Array(11).fill('link') }, /قايمة لحد 10/], ['request.pending_approval', { templateName: 'ok', languageCode: 'ar' }, /قايمة/],
    // الأمان: السري مايقبلش نوع الطلب ولا اسم صاحبه ولا القرار؛ والقسيمة مالهاش متغير مبلغ أصلًا
    ['request.confidential', { templateName: 'ok', languageCode: 'ar', variables: ['request.type'] }, /متغير غير معروف/],
    ['request.confidential', { templateName: 'ok', languageCode: 'ar', variables: ['request.requester'] }, /متغير غير معروف/],
    ['payroll.payslip_available', { templateName: 'ok', languageCode: 'ar', variables: ['payslip.net'] }, /متغير غير معروف/],
    ['request.decided', { templateName: 'ok', languageCode: 'ar', variables: ['constructor'] }, /متغير غير معروف/]]) {
    refused(() => rules.cleanWhatsappBinding(code, value), text)
  }
  assert.deepEqual(events.NOTIFICATION_EVENTS['request.confidential'].variables.map(variable => variable.key), ['recipient.name', 'company.name', 'link'])
  for (const code of events.NOTIFICATION_EVENT_CODES) {
    assert.equal(events.NOTIFICATION_EVENTS[code].variables.some(variable => /amount|net|salary|مبلغ|صافي/i.test(`${variable.key} ${variable.label}`)), false, `${code}: من غير متغير مبلغ`)
  }
  // المحفوظ: لغة بلغة، واللي مابقاش صالح بيتساب
  const stored = JSON.stringify({ ar: binding, en: { templateName: 'BAD NAME', languageCode: 'en', variables: [] }, fr: binding })
  assert.deepEqual(rules.storedWhatsappBindings('request.pending_approval', stored), { ar: binding })
  assert.deepEqual(rules.storedWhatsappBindings('request.pending_approval', null), {})
  // القيم: السطر الجديد والـtab والمسافات المتكررة بتتنضّف، والفاضي والمتغير اللي مش موجود «-»، ومن مفاتيح القيم نفسها بس
  const values = { 'request.type': 'إجازة\n\tسنوية   طويلة', link: '' }
  assert.deepEqual(rules.whatsappParameters({ templateName: 't', languageCode: 'ar', variables: ['request.type', 'link', 'request.requester', 'constructor'] }, values), ['إجازة سنوية طويلة', '-', '-', '-'])
  assert.equal(rules.whatsappParameters({ templateName: 't', languageCode: 'ar', variables: ['link'] }, { link: 'x'.repeat(900) })[0].length, 500)
})

test('NCU-06: مزوّد Meta — شكل الطلب، وتصنيف الفشل، والسبب من غير التوكن ولا رقم كامل، والعنوان خادم Meta بس', async () => {
  const settings = rules.cleanWhatsappSettings({ phoneNumberId: '123456789', apiVersion: 'v21.0' })
  const binding = { templateName: 'approval_pending', languageCode: 'ar', variables: ['request.type'] }
  const token = `EAAtest${crypto.randomBytes(8).toString('hex')}`
  const message = { settings, token, to: '966501234567', binding, parameters: ['إجازة'] }
  const built = meta.metaTemplateRequest(message)
  assert.equal(built.url, 'https://graph.facebook.com/v21.0/123456789/messages')
  assert.deepEqual(JSON.parse(built.body), { messaging_product: 'whatsapp', recipient_type: 'individual', to: '966501234567', type: 'template',
    template: { name: 'approval_pending', language: { code: 'ar' }, components: [{ type: 'body', parameters: [{ type: 'text', text: 'إجازة' }] }] } })
  assert.equal('components' in JSON.parse(meta.metaTemplateRequest({ ...message, parameters: [] }).body).template, false, 'قالب من غير متغيرات')
  assert.equal(built.body.includes(token), false)
  const calls = []
  const reply = (status, body) => async call => { calls.push(call); return { status, body: typeof body === 'string' ? body : JSON.stringify(body) } }
  assert.deepEqual(await meta.metaCloudProvider.send(message, reply(200, { messages: [{ id: 'wamid.X' }] })), { messageId: 'wamid.X' })
  assert.deepEqual([calls[0].headers.Authorization, calls[0].headers['Content-Type'], calls[0].timeoutMs, calls[0].url], [`Bearer ${token}`, 'application/json', 15000, built.url])
  const failure = async http => { try { await meta.metaCloudProvider.send(message, http); return null } catch (error) { return error } }
  const kinds = async (status, body) => { const error = await failure(reply(status, body)); assert.ok(error instanceof meta.WhatsappSendError); return [error.rejected, error.unreachable] }
  // مرفوضة (الإعادة مش هتغيّر): الرقم مش على واتساب، القالب مش موجود أو متغيراته مش مطابقة
  for (const code of [131026, 132000, 132001, 132012, 100]) assert.deepEqual(await kinds(400, { error: { message: 'x', code } }), [true, false], String(code))
  assert.deepEqual(await kinds(404, 'not json'), [true, false])
  // المزوّد واقف: التوكن غلط أو منتهي
  assert.deepEqual(await kinds(401, { error: { message: 'x', code: 190 } }), [false, true])
  assert.deepEqual(await kinds(400, { error: { message: 'x', code: 190 } }), [false, true])
  assert.deepEqual(await kinds(403, {}), [false, true])
  // تتعاد: حد المعدل وأعطال Meta
  assert.deepEqual(await kinds(429, { error: { message: 'x', code: 130429 } }), [false, false])
  assert.deepEqual(await kinds(503, 'Service Unavailable'), [false, false])
  // مفيش رد أصلًا: المزوّد مش بيرد
  const network = await failure(async () => { throw Object.assign(new Error(`connect ETIMEDOUT with ${token}`), { code: 'ETIMEDOUT' }) })
  assert.deepEqual([network.rejected, network.unreachable], [false, true])
  assert.match(network.detail, /تعذر الوصول لخادم Meta: .*code=ETIMEDOUT/)
  // السبب من غير التوكن ومن غير رقم كامل
  const leaky = await failure(reply(400, { error: { message: `Bad token ${token} for 966501234567`, code: 131026, error_data: { details: 'Recipient 966501234567 not on WhatsApp' } } }))
  assert.equal(leaky.detail.includes(token) || leaky.detail.includes('966501234567'), false, leaky.detail)
  assert.match(leaky.detail, /^Meta 400 code=131026: Bad token \*\*\* for \+9665\*+67 — Recipient \+9665\*+67 not on WhatsApp$/)
  assert.ok(network.detail.includes('***') && !network.detail.includes(token))
  // النداء الحقيقي: https على graph.facebook.com بس — أي عنوان تاني بيترفض قبل ما يطلع
  for (const url of ['https://evil.example.invalid/v21.0/1/messages', 'http://graph.facebook.com/v21.0/1/messages', 'https://graph.facebook.com@evil.example.invalid/x', 'https://graph.facebook.com:444/x', 'مش عنوان']) {
    await assert.rejects(meta.metaHttp({ url, headers: {}, body: '{}', timeoutMs: 500 }), /خادم Meta|عنوان غير صالح/, url)
  }
  assert.equal(rules.WHATSAPP_API_HOST, 'graph.facebook.com')
  assert.deepEqual(Object.keys(meta.WHATSAPP_PROVIDER_IMPLEMENTATIONS), Object.keys(rules.WHATSAPP_PROVIDERS))
})

test('NCU-07: القاعدة الافتراضية = سلوك النظام الحالي، وفحص الترحيل: الناقص بيتفحص مع كل نداء والموجود بيتحفظ', async () => {
  assert.deepEqual({ ...rules.DEFAULT_EVENT_RULE }, { inApp: true, email: true, whatsapp: false, mandatory: false })
  assert.ok(Object.isFrozen(rules.DEFAULT_EVENT_RULE))
  assert.deepEqual(rules.cleanEventRule({ inApp: false, email: true, whatsapp: true, mandatory: true, other: 1 }), { inApp: false, email: true, whatsapp: true, mandatory: true })
  refused(() => rules.cleanEventRule({ inApp: 'true', email: true, whatsapp: true, mandatory: true }), /مفتوح أو مقفول/)
  refused(() => rules.cleanEventRule({ email: true }), /مفتوح أو مقفول/)
  // قنوات القوالب النصية زي ما هي، والواتساب قناة توصيل زيادة
  assert.deepEqual([...events.NOTIFICATION_CHANNELS], ['IN_APP', 'EMAIL'])
  assert.deepEqual([...events.NOTIFICATION_DELIVERY_CHANNELS], ['IN_APP', 'EMAIL', 'WHATSAPP'])
  assert.deepEqual(events.NOTIFICATION_DELIVERY_CHANNEL_LABELS, { IN_APP: 'داخل النظام', EMAIL: 'البريد', WHATSAPP: 'الواتساب' })
  assert.deepEqual([...events.NOTIFICATION_TEMPLATE_LANGUAGES], ['ar', 'en'])
  rules.resetNotificationChannelTablesCache()
  let applied = false, queries = 0
  const em = { query: async () => { queries++; return [{ ready: applied ? 1 : 0 }] } }
  try {
    assert.equal(await rules.notificationChannelTablesReady(em), false)
    assert.equal(await rules.notificationChannelTablesReady(em), false)
    assert.equal(queries, 2, 'النتيجة السلبية مابتتحفظش')
    applied = true
    assert.equal(await rules.notificationChannelTablesReady(em), true)
    assert.equal(await rules.notificationChannelTablesReady(em), true)
    assert.equal(queries, 3, 'الموجود بيتحفظ: من غير استعلام تاني')
  } finally { rules.resetNotificationChannelTablesCache() }
  // المحرك: مهمة الواتساب بنفس مسار البريد (دالة واحدة)، والقاعدة بتتسأل وقت التوزيع ووقت الإرسال
  const engine = read('api/src/notifications/notifications.service.ts')
  assert.match(engine, /export const NOTIFICATIONS_WHATSAPP_JOB = 'notifications\.whatsapp'/)
  assert.match(engine, /async sendEmail\([^)]*\): Promise<void> \{\n\s+await this\.sendOutbound\(this\.emailDriver, deliveryId, context\)/)
  assert.match(engine, /async sendWhatsapp\([^)]*\): Promise<void> \{\n\s+await this\.sendOutbound\(this\.whatsappDriver, deliveryId, context\)/)
  assert.equal((engine.match(/private async attemptOutbound\(/g) || []).length, 1)
  assert.equal((engine.match(/const stale = await this\.staleReason\(notification, user\)/g) || []).length, 1, 'فحص «لسه صحيح» مرة واحدة للقناتين')
  assert.match(engine, /const \{ rule, bindings \} = await this\.channels\.ruleOf\(input\.code\)/)
  assert.match(engine, /const modeOf = \(channel: string\): NotificationMode => rule\.mandatory \? 'ON' : /)
  assert.match(engine, /const mode = setup\?\.rule\.mandatory \? 'ON' : /)
})

test('NCU-08: توصيل الشاشة — المسارات بصلاحياتها، وعميل الـAPI، والقايمة والعنوان والترجمة، والأسرار مابتتعرضش', () => {
  const controller = read('api/src/notifications/channels/notification-channels.controller.ts')
  assert.match(controller, /@RequireModule\('notifications'\)\s+@UseGuards\(JwtAuthGuard, RolesGuard\)\s+@Controller\('notification-channels'\)/)
  // الإعداد: «إدارة الإعدادات» على المسار، وفوقها مدير النظام نفسه
  for (const route of ['@Get()', "@Put('email')", "@Post('email/test')", "@Put('whatsapp')", "@Post('whatsapp/test')", "@Put('events/:code')"]) {
    const at = controller.indexOf(route)
    assert.ok(at > 0, route)
    const handler = controller.slice(at, at + 330)
    assert.match(handler, /@Perm\('settings\.manage'\)/, route)
    assert.match(handler, /systemAdminOnly\(user\)/, route)
  }
  assert.match(controller, /if \(user\.role !== 'super_admin' && !\(user\.permissions \?\? \[\]\)\.includes\('\*'\)\) throw new ForbiddenException\('قنوات الإشعارات لمدير النظام بس'\)/)
  // بيانات الموظفين: بصلاحيات الموظفين نفسها (والنطاق في الخدمة)
  assert.match(controller, /@Get\('missing-contacts'\)\s+@Perm\('employees\.view'\)/)
  assert.match(controller, /@Get\('contacts\/:employeeId'\)\s+@Perm\('employees\.view'\)/)
  assert.match(controller, /@Put\('contacts\/:employeeId'\)\s+@Perm\('employees\.edit'\)/)
  assert.equal((controller.match(/@(Get|Put|Post|Patch|Delete)\(/g) || []).length, 9)
  assert.equal((controller.match(/@Perm\(/g) || []).length, 9, 'كل مسار عليه صلاحية')
  const service = read('api/src/notifications/channels/notification-channels.service.ts')
  assert.match(service, /inBranchScope\(branchScopeOf\(user\), employee\.branchId\)\) throw new NotFoundException\(EMPLOYEE_NOT_FOUND\)/)
  assert.match(service, /andBranchScopeSql\('e\.\[branchId\]', branchScopeOf\(user\), params\)/)
  // الرد من غير أسرار: «متسجّل» بس، والتدقيق بمفاتيح مابتتخفاش ومن غير قيمة السر
  assert.match(service, /passwordSet: !!emailRow\?\.secret,/)
  assert.match(service, /tokenSet: !!whatsappRow\?\.secret,/)
  assert.equal(/secret: (emailRow|whatsappRow|row)\b|password: (row|settings)|token: setup\.token,|token: row/.test(service.replace(/token: setup\.token, to, binding, parameters \}/, '')), false)
  assert.match(service, /sealedValueSet: !!item\.secret/)

  const client = read('src/lib/notification-channels-api.ts')
  for (const marker of ["apiFetch<ApiNotificationChannels>('/notification-channels')", "'/notification-channels/email', { method: 'PUT'", "'/notification-channels/email/test', { method: 'POST'",
    "'/notification-channels/whatsapp', { method: 'PUT'", "'/notification-channels/whatsapp/test', { method: 'POST'", '`/notification-channels/events/${encodeURIComponent(code)}`',
    "apiFetch<ApiMissingContacts>('/notification-channels/missing-contacts')", '`/notification-channels/contacts/${employeeId}`', '`/notifications/deliveries${text ? `?${text}` : \'\'}`',
    '`/notifications/templates?language=${language}`']) assert.ok(client.includes(marker), marker)
  assert.deepEqual(Object.keys(require('../../src/lib/notification-channels-api').DELIVERY_CHANNEL_LABELS), [...events.NOTIFICATION_DELIVERY_CHANNELS])

  const page = read('src/app/settings/notification-channels/page.tsx')
  for (const marker of ['data-channels-email', 'data-channels-whatsapp', 'data-channels-events', 'data-channels-missing', 'data-channels-log', 'data-event-channel-matrix', 'data-secret-state',
    'data-mail-test', 'data-whatsapp-test', 'data-log-filters', 'data-channels-unavailable', 'data-channels-admin-only', 'ابعت رسالة تجربة', 'دايمًا (عدّاد محسوب)', 'متسجّل ✓', 'مش متسجّل']) {
    assert.ok(page.includes(marker), marker)
  }
  assert.match(page, /const TAB_LABELS: Record<Tab, string> = \{ email: 'البريد', whatsapp: 'الواتساب', events: 'الأحداث والقوالب', missing: 'مين ناقصه بيانات', log: 'سجل الإرسال' \}/)
  // خانة السر كتابة بس: نوعها password وقيمتها من حالة الصفحة مش من رد الخادم، وبتتبعت لما تتكتب بس
  assert.equal((page.match(/type="password" autoComplete="new-password"/g) || []).length, 2)
  assert.match(page, /\.\.\.\(clearPassword \? \{ password: '' \} : password \? \{ password \} : \{\}\)/)
  assert.match(page, /\.\.\.\(clearToken \? \{ token: '' \} : token \? \{ token \} : \{\}\)/)
  assert.equal(/settings\.(password|token)|email\.password\b|whatsapp\.token\b/.test(page), false)
  // نفس محرر القوالب بتاع B2.4 (مش نسخة تانية)، واللوحة القديمة بتودّي للشاشة
  assert.match(page, /import \{ TemplateEditor \} from '@\/components\/NotificationsAdminPanel'/)
  assert.ok(read('src/components/NotificationsAdminPanel.tsx').includes('href="/settings/notification-channels"'))
  // القايمة والعنوان والترجمة
  assert.match(read('src/components/layout/Sidebar.tsx'), /\{ label: 'قنوات الإشعارات', href: '\/settings\/notification-channels', perm: 'settings\.manage' \}/)
  assert.match(read('src/components/layout/pageTitles.ts'), /\['\/settings\/notification-channels', 'قنوات الإشعارات'\]/)
  assert.match(read('src/i18n/en.ts'), /'قنوات الإشعارات': 'Notification channels',/)
  assert.equal(require('../src/modules-registry/registry').routeAvailable('/settings/notification-channels', { modules: ['platform', 'notifications'], features: [] }) !== false, true)
  // ملف الموظف وصفحة اختيارات المستخدم
  assert.match(read('src/app/employees/[id]/page.tsx'), /<EmployeeWhatsappCard employeeId=\{employee\.id\} \/>/)
  const card = read('src/components/NotificationPreferences.tsx')
  for (const marker of ['data-notification-mandatory', 'data-notification-contact', 'إلزامي من الإدارة ومابيتقفلش', 'كلّم الموارد البشرية لتعديلهم', "changeWhatsapp(category.key, event.target.checked ? 'ON' : 'OFF')"]) assert.ok(card.includes(marker), marker)
  assert.equal(/ترحيل|187/.test(card), false, 'من غير رقم ترحيل في شاشة الموظف')
})
