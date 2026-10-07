'use strict'
// B2.4: كتالوج أحداث الإشعارات وقوالبه — اختبارات نقية بلا قاعدة بيانات.
//  NE-01) الكتالوج متسق: كل حدث بفئة معروفة وقالب لكل قناة، والنص الافتراضي بيستعمل متغيرات الحدث بس وبيعدّي من تحقق التعديل.
//  NE-02) تحقق نص القالب: متغير مش بتاع الحدث، وصيغة ناقصة، وعنوان بسطرين، وطول زيادة = مرفوض.
//  NE-03) تعويض المتغيرات: المتغير من غير قيمة فاضي، والعنوان سطر واحد، والقيمة اللي فيها أقواس مابتتفسّرش تاني.
//  NE-04) ساعات الهدوء: الشكل، والنافذة اللي بتعدّي نص الليل، وآخرها.
//  NE-05) عنوان البريد: شكل بس، واسم الدخول اللي مش عنوان مرفوض.
//  NE-06) الخصوصية: مفيش قالب فيه متغير مبلغ، والطلب السري من غير نوع ولا اسم ولا قرار.
// Run (من api/): node --test test/notification-events.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const events = require('../src/notifications/notification-events')

const TOKEN = /\{\{\s*([a-zA-Z][a-zA-Z0-9._]*)\s*\}\}/g
const used = text => [...text.matchAll(TOKEN)].map(match => match[1])

test('NE-01: الكتالوج متسق — فئة معروفة، وقالب لكل قناة، والنص الافتراضي بمتغيرات الحدث بس', () => {
  assert.deepEqual(events.NOTIFICATION_EVENT_CODES, ['request.pending_approval', 'request.escalated', 'request.decided', 'request.returned', 'request.confidential', 'payroll.payslip_available',
    // B2.15: «مستندك هينتهي» (بريد؛ جوه النظام العنصر المحسوب القايم)
    'document.expiring', 'task.assigned', 'task.due_soon', 'task.overdue', 'comment.mentioned'])
  assert.deepEqual([...events.NOTIFICATION_CHANNELS], ['IN_APP', 'EMAIL'])
  assert.deepEqual(Object.keys(events.NOTIFICATION_CATEGORIES), ['approval', 'request', 'payroll', 'task', 'comment', 'document'])
  for (const code of events.NOTIFICATION_EVENT_CODES) {
    const def = events.notificationEventDef(code)
    assert.ok(events.isNotificationCategory(def.category), code)
    assert.ok(['success', 'error', 'warning', 'info'].includes(def.kind), code)
    const allowed = def.variables.map(variable => variable.key)
    assert.equal(new Set(allowed).size, allowed.length, `${code}: متغير مكرر`)
    for (const variable of def.variables) assert.ok(variable.label && variable.sample, `${code}: ${variable.key}`)
    for (const channel of events.NOTIFICATION_CHANNELS) {
      const template = def.templates[channel]
      for (const key of [...used(template.title), ...used(template.body)]) assert.ok(allowed.includes(key), `${code}/${channel}: ${key}`)
      // النص الافتراضي نفسه بيعدّي من تحقق التعديل (المدير يقدر يحفظه زي ما هو)
      assert.deepEqual(events.validateNotificationTemplate(code, template), { title: template.title, body: template.body.trim() })
      assert.ok(template.title.length <= events.NOTIFICATION_TITLE_MAX && template.body.length <= events.NOTIFICATION_BODY_MAX)
    }
    // البريد دايمًا بلينك الفتح
    assert.ok(used(def.templates.EMAIL.body).includes('link'), `${code}: بريد من غير لينك`)
  }
  // الأحداث اللي ليها عنصر محسوب في القايمة (العدّاد وقرار طلبك) مابتتخزنش للقايمة؛ القسيمة، وإشارة التعليق (B2.8)
  assert.deepEqual(events.NOTIFICATION_EVENT_CODES.filter(code => events.notificationEventDef(code).storedInApp), ['payroll.payslip_available', 'comment.mentioned'])
  assert.equal(events.isNotificationEvent('request.unknown'), false)
  assert.equal(events.isNotificationEvent('toString'), false)
  assert.equal(events.isNotificationCategory('constructor'), false)
})

test('NE-02: تحقق نص القالب — متغير مش بتاع الحدث، وصيغة ناقصة، وعنوان بسطرين، وطول زيادة', () => {
  const check = (code, value) => events.validateNotificationTemplate(code, value)
  assert.deepEqual(check('request.decided', { title: ' قرار {{request.type}} ', body: 'نص {{ request.decision }}\n{{link}}' }), { title: 'قرار {{request.type}}', body: 'نص {{ request.decision }}\n{{link}}' })
  for (const [value, pattern] of [
    [{ title: 'قرار {{request.requester}}', body: 'نص' }, /متغير غير معروف في القالب: request\.requester/],
    [{ title: 'قرار', body: 'نص {{payslip.period}}' }, /متغير غير معروف/],
    [{ title: 'قرار', body: 'نص {{request.type' }, /صيغة متغير غير مكتملة/],
    [{ title: 'قرار }}', body: 'نص' }, /صيغة متغير غير مكتملة/],
    [{ title: 'قرار {{}}', body: 'نص' }, /صيغة متغير غير مكتملة/],
    [{ title: 'سطر\nتاني', body: 'نص' }, /عنوان القالب سطر واحد/],
    [{ title: 'ق', body: 'نص' }, /عنوان القالب مطلوب/],
    [{ title: 'قرار', body: ' ' }, /نص القالب مطلوب/],
    [{ title: 'ع'.repeat(301), body: 'نص' }, /عنوان القالب مطلوب وبحد أقصى 300 حرف/],
    [{ title: 'قرار', body: 'ن'.repeat(2001) }, /نص القالب مطلوب وبحد أقصى 2000 حرف/],
    [{ title: 5, body: 'نص' }, /عنوان القالب مطلوب/],
    [null, /بيانات القالب غير صالحة/], [['قرار', 'نص'], /بيانات القالب غير صالحة/], ['نص', /بيانات القالب غير صالحة/],
  ]) assert.throws(() => check('request.decided', value), pattern, JSON.stringify(value).slice(0, 60))
  // السري مايقبلش متغير النوع ولا الاسم ولا القرار حتى من المحرر
  for (const key of ['request.type', 'request.requester', 'request.decision']) {
    assert.throws(() => check('request.confidential', { title: `سري {{${key}}}`, body: 'نص' }), /متغير غير معروف/, key)
  }
})

test('NE-03: تعويض المتغيرات — من غير قيمة فاضي، والعنوان سطر واحد، والقيمة مابتتفسّرش تاني', () => {
  const render = events.renderNotificationText
  assert.deepEqual(render({ title: 'طلب {{request.type}} من {{ request.requester }}', body: 'أهلًا {{recipient.name}}\n{{link}}\n' },
    { 'request.type': 'إجازة', 'request.requester': 'سارة', 'recipient.name': 'أحمد', link: 'https://hr.example.invalid/x' }),
  { title: 'طلب إجازة من سارة', body: 'أهلًا أحمد\nhttps://hr.example.invalid/x' })
  assert.deepEqual(render({ title: 'طلب {{request.type}}', body: '{{missing}}—{{link}}' }, {}), { title: 'طلب', body: '—' })
  // قيمة فيها سطر جديد ماتكسرش العنوان (حقن رأس بريد)، وقيمة فيها أقواس مابتتعوّضش تاني
  assert.equal(render({ title: 'طلب {{request.type}}', body: 'x' }, { 'request.type': 'إجازة\r\nBcc: someone@example.invalid' }).title, 'طلب إجازة Bcc: someone@example.invalid')
  assert.equal(render({ title: '{{request.type}}', body: 'x' }, { 'request.type': '{{link}}', link: 'سر' }).title, '{{link}}')
  assert.equal(render({ title: '{{request.type}}', body: 'x' }, { 'request.type': 'ط'.repeat(500) }).title.length, 300)
  // مفتاح من سلسلة الوراثة مش قيمة
  assert.equal(render({ title: 'a{{constructor}}b{{toString}}c', body: 'x' }, {}).title, 'abc')
})

test('NE-04: ساعات الهدوء — الشكل، والنافذة اللي بتعدّي نص الليل، وآخرها', () => {
  const { parseQuietHours, quietHoursEnd } = events
  assert.deepEqual(parseQuietHours('22:00-07:00'), { from: 1320, to: 420 })
  assert.deepEqual(parseQuietHours(' 00:00-23:59 '), { from: 0, to: 1439 })
  for (const value of ['', null, undefined, 'oops', '22:00', '25:00-07:00', '22:60-07:00', '22:00-22:00', '22:00 - 07:00', '2:00-7:00', '22:00-07:00x']) assert.equal(parseQuietHours(value), null, String(value))
  const at = (hour, minute = 0) => new Date(2026, 9, 5, hour, minute, 30)
  const night = parseQuietHours('22:00-07:00'), noon = parseQuietHours('12:00-14:30')
  assert.equal(quietHoursEnd(at(12), null), null)
  assert.equal(quietHoursEnd(at(21, 59), night), null, 'قبل البداية')
  assert.equal(quietHoursEnd(at(7), night), null, 'عند النهاية بالظبط = برّه')
  // في الجزء المسائي: النهاية بكرة الصبح. وفي الجزء الصباحي: النهاية النهارده
  assert.deepEqual(quietHoursEnd(at(22), night), new Date(2026, 9, 6, 7, 0, 0, 0))
  assert.deepEqual(quietHoursEnd(at(23, 30), night), new Date(2026, 9, 6, 7, 0, 0, 0))
  assert.deepEqual(quietHoursEnd(at(3, 15), night), new Date(2026, 9, 5, 7, 0, 0, 0))
  assert.deepEqual(quietHoursEnd(at(12), noon), new Date(2026, 9, 5, 14, 30, 0, 0))
  assert.deepEqual(quietHoursEnd(at(14, 29), noon), new Date(2026, 9, 5, 14, 30, 0, 0))
  assert.equal(quietHoursEnd(at(14, 30), noon), null)
  assert.equal(quietHoursEnd(at(11, 59), noon), null)
  // النهاية دايمًا بعد دلوقتي
  for (let hour = 0; hour < 24; hour++) for (const window of [night, noon]) { const end = quietHoursEnd(at(hour), window); if (end) assert.ok(end.getTime() > at(hour).getTime()) }
})

test('NE-05: عنوان البريد — شكل بس، واسم الدخول اللي مش عنوان مرفوض، والعنوان الداخلي بعد أي عنوان تاني', () => {
  const pick = events.pickNotificationAddress
  assert.equal(pick('user@example.invalid', 'file@example.invalid'), 'user@example.invalid', 'بريد الحساب الأول')
  assert.equal(pick('hr.grant', 'file@example.invalid'), 'file@example.invalid', 'اسم دخول مش عنوان ← بريد الملف')
  // حساب مجال بريده داخلي (اسم دخول المجال): بريد الملف الحقيقي هو اللي بيتاخد، ولو مفيش غيره بيتجرّب
  assert.equal(pick('user@company.local', 'user@company.example'), 'user@company.example')
  assert.equal(pick('user@company.example', 'user@company.local'), 'user@company.example')
  assert.equal(pick('user@company.LOCAL', null), 'user@company.LOCAL')
  assert.equal(pick('user@corp.internal', ' file@company.example '), 'file@company.example')
  assert.equal(pick(null, undefined), null)
  assert.equal(pick('hr.grant', 'DOMAIN\\user'), null)
  const ok = events.deliverableEmail
  assert.equal(ok(' user.name+tag@example.invalid '), 'user.name+tag@example.invalid')
  for (const value of ['', null, undefined, 'hr.grant', 'DOMAIN\\user', 'user@', '@example.invalid', 'user@host', 'a b@example.invalid', 'user@example.invalid, other@example.invalid',
    'user@example.invalid;x', '<user@example.invalid>', 'user@exa mple.invalid', `${'a'.repeat(200)}@example.invalid`, 'user@example.invalid\r\nBcc: x@example.invalid']) {
    assert.equal(ok(value), null, String(value))
  }
})

test('NE-06: الخصوصية — مفيش متغير مبلغ في أي حدث، والطلب السري من غير نوع ولا اسم ولا قرار', () => {
  for (const code of events.NOTIFICATION_EVENT_CODES) {
    const def = events.notificationEventDef(code)
    for (const variable of def.variables) assert.equal(/amount|net|salary|مبلغ|صافي|راتب/i.test(`${variable.key} ${variable.label}`), false, `${code}: ${variable.key}`)
  }
  const secret = events.notificationEventDef('request.confidential')
  assert.deepEqual(secret.variables.map(variable => variable.key), ['recipient.name', 'company.name', 'link'])
  for (const channel of events.NOTIFICATION_CHANNELS) {
    const text = `${secret.templates[channel].title}\n${secret.templates[channel].body}`
    assert.equal(/request\./.test(text), false)
  }
  // القسيمة: الشهر بس
  assert.deepEqual(events.notificationEventDef('payroll.payslip_available').variables.map(variable => variable.key), ['payslip.period', 'recipient.name', 'company.name', 'link'])
})
