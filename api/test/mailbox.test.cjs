'use strict'
// B-ADD.16: البريد (صندوق Exchange بتاع الموظف جوه النظام) — فحص من غير قاعدة ولا شبكة (الدورة الفعلية في mailbox.integration.cjs):
//  MU-01) مخزن كلمة سر الجلسة: نص من غير مفتاحه مابيتفكش، ومفتاح غلط أو جلسة تانية بيفشل، والعمر بيتجدد مع الاستخدام وبيخلص، والخروج بيمسحه.
//  MU-02) cookie المفتاح: HttpOnly ولمسارات البريد بس وبنفس SameSite و Secure بتوع الجلسة، ومن غير عمر (cookie جلسة متصفح).
//  MU-03) محاولات «افتح بريدك»: خمسة غلط = قفل ربع ساعة.
//  MU-04) إعداد الخادم من البيئة بس: https إلزامي، والتحقق من الشهادة مفتوح إلا بقفل صريح، واسم الدخول.
//  MU-05) قيم الطلب: العناوين والمعرّفات والصندوق المشترك وجسم الإرسال واسم المرفق.
//  MU-06) البحث الدقيق: الإملاءات العربية، وfrom:/to:/subject:، وقيد Exchange.
//  MU-07) الربط: موديول جديد مقفول، وصلاحية الصناديق المشتركة، والمسارات بحراسها، ونقط ربط الدخول والخروج، والترحيل، والواجهة.
//  MU-08) خدمة EWS: مفيش كلمة سر بتتحفظ بين الطلبات ولا بتتسجّل، وحارس «ولا اتصال حقيقي من اختبار»، وترجمة أخطاء Exchange.
// Run (من api/): node --test test/mailbox.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const vaultRules = require('../src/mailbox/mail-vault')
const rules = require('../src/mailbox/mailbox-rules')
const search = require('../src/mailbox/search')
const { MODULES } = require('../src/modules-registry/registry')
const root = path.resolve(__dirname, '..', '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n')
const refuses = (work, code, label) => assert.throws(work, error => error?.getStatus?.() === 400 && error.getResponse().code === code, label)
// قيمة اختبار واضحة إنها مش كلمة سر حقيقية
const FAKE = 'not-a-real-secret-ممم-1'
const SERVICE_FILES = ['mail-vault.ts', 'mail-vault.service.ts', 'mail-session.service.ts', 'mailbox.service.ts', 'mailbox.controller.ts', 'ews.service.ts', 'shared-mailboxes.service.ts',
  'mailbox-store.ts', 'mailbox-rules.ts', 'search.ts', 'mailbox.entities.ts', 'mailbox.module.ts']

test('MU-01: the session vault — ciphertext is useless without the browser key, a wrong key or another session fails, the life slides and ends, logout drops it', () => {
  let now = 1_000_000
  const HOUR = 3_600_000
  const vault = new vaultRules.MailVault(() => 8 * HOUR, () => now)
  const scope = { userId: 7, tokenVersion: 2, sid: 'session-a' }
  const key = vault.store(scope, FAKE)
  assert.match(key, /^[A-Za-z0-9_-]{43}$/, 'مفتاح 256 بت')
  assert.equal(vault.read(scope, key), FAKE)
  // اللي في ذاكرة الخادم: نص مشفّر بس — لا كلمة السر ولا المفتاح
  const entries = [...vault.entries.values()]
  assert.equal(entries.length, 1)
  const stored = Buffer.concat(entries.map(entry => entry.blob))
  assert.equal(stored.includes(Buffer.from(FAKE, 'utf8')), false, 'النص المخزّن مش كلمة السر')
  assert.equal(stored.includes(Buffer.from(key, 'base64url')), false, 'المفتاح مش محفوظ عند الخادم')
  assert.deepEqual(Object.keys(entries[0]).sort(), ['blob', 'expiresAt', 'hardExpiresAt', 'tokenVersion', 'userId'])
  assert.equal([...vault.entries.keys()].some(slot => slot.includes('7') && slot.length < 20), false)
  assert.match([...vault.entries.keys()][0], /^[a-f0-9]{64}$/, 'اسم الخانة مايكشفش الحساب')
  // من غير مفتاح، أو بمفتاح غلط أو متلاعب فيه: مفيش حاجة
  const other = new vaultRules.MailVault(() => HOUR).store(scope, FAKE)
  for (const bad of [null, undefined, '', 'x', key.slice(0, 42), key + 'A', other, key.slice(0, 20) + (key[20] === 'A' ? 'B' : 'A') + key.slice(21), 42, {}]) assert.equal(vault.read(scope, bad), null, String(bad))
  // النص مربوط بالجلسة: نفس المفتاح مع حساب تاني، أو رقم جلسة تاني، أو إصدار توكن تاني = مفيش
  assert.equal(vault.read({ ...scope, userId: 8 }, key), null)
  assert.equal(vault.read({ ...scope, sid: 'session-b' }, key), null)
  assert.equal(vault.read({ ...scope, sid: null }, key), null)
  assert.equal(vault.read(scope, key), FAKE, 'والجلسة الصح لسه شغالة')
  // نص منقول لخانة جلسة تانية (حتى بنفس المفتاح) مابيتفكش: بيانات التوثيق جزء من التشفير
  const moved = new vaultRules.MailVault(() => HOUR, () => now)
  const [slotB] = (() => { moved.store({ ...scope, sid: 'session-b' }, 'placeholder-value'); return [...moved.entries.keys()] })()
  moved.entries.get(slotB).blob = entries[0].blob
  assert.equal(moved.read({ ...scope, sid: 'session-b' }, key), null)
  // جلستين لنفس الحساب: كل واحدة بنصها ومفتاحها
  const keyB = vault.store({ ...scope, sid: 'session-b' }, FAKE + '-b')
  assert.deepEqual([vault.read(scope, key), vault.read({ ...scope, sid: 'session-b' }, keyB), vault.read(scope, keyB), vault.size], [FAKE, FAKE + '-b', null, 2])

  // العمر من آخر استخدام: قراءة صح قبل النهاية بتجدده، ومن غير استخدام بيخلص
  now += 8 * HOUR - 1
  assert.equal(vault.read(scope, key), FAKE)
  now += 8 * HOUR - 1
  assert.equal(vault.read(scope, key), FAKE, 'اتجدد')
  assert.equal(vault.has({ ...scope, sid: 'session-b' }), false, 'الجلسة التانية مااتستخدمتش فخلص عمرها')
  now += 8 * HOUR
  assert.deepEqual([vault.has(scope), vault.read(scope, key), vault.size], [false, null, 0])
  // قراءة بمفتاح غلط مابتجددش العمر
  const key2 = vault.store(scope, FAKE)
  now += 8 * HOUR - 1
  assert.equal(vault.read(scope, 'A'.repeat(43)), null)
  now += 2
  assert.equal(vault.read(scope, key2), null)
  // نهاية التوكن نفسه: الخانة ماتعيش بعدها حتى لو بتتستخدم
  const key3 = vault.store(scope, FAKE, now + HOUR)
  now += HOUR - 1
  assert.equal(vault.read(scope, key3), FAKE)
  now += 1
  assert.equal(vault.read(scope, key3), null)

  // الخروج بيمسح نص الجلسة دي بس؛ ومسح الحساب بيمسح كل جلساته؛ وحساب تاني مابيتأثرش
  const a = vault.store(scope, FAKE), b = vault.store({ ...scope, sid: 'session-b' }, FAKE), c = vault.store({ userId: 9, tokenVersion: 0, sid: null }, FAKE)
  assert.equal(vault.drop(scope), true)
  assert.deepEqual([vault.read(scope, a), vault.read({ ...scope, sid: 'session-b' }, b), vault.drop(scope)], [null, FAKE, false])
  assert.equal(vault.dropUser(7), 1)
  assert.deepEqual([vault.read({ ...scope, sid: 'session-b' }, b), vault.read({ userId: 9, tokenVersion: 0, sid: null }, c), vault.size], [null, FAKE, 1])
  // إصدار التوكن اتغيّر (كلمة مرور، صلاحية، تعطيل): نص الإصدار القديم بيتمسح مع أول لمسة للحساب
  const old = vault.store(scope, FAKE)
  assert.equal(vault.has({ ...scope, tokenVersion: 3 }), false)
  assert.deepEqual([vault.read(scope, old), vault.size], [null, 1], 'القديم اتمسح')
  // التنضيف الدوري
  vault.store(scope, FAKE)
  now += 9 * HOUR
  assert.deepEqual([vault.sweep(), vault.size], [2, 0])
  assert.deepEqual(vaultRules.vaultScopeOf({ sub: 5 }), { userId: 5, tokenVersion: 0, sid: null })
  assert.deepEqual(vaultRules.vaultScopeOf({ sub: 5, tokenVersion: 4, sid: 'x' }), { userId: 5, tokenVersion: 4, sid: 'x' })
})

test('MU-02: the key cookie — HttpOnly, mail routes only, the session SameSite and Secure, and no lifetime (a browser-session cookie)', () => {
  const plain = { sameSite: 'Strict', secure: false }, https = { sameSite: 'Strict', secure: true }
  assert.equal(vaultRules.mailKeyCookieHeader('KEY', plain), 'hr_mail_key=KEY; Path=/api/mail; HttpOnly; SameSite=Strict')
  assert.equal(vaultRules.mailKeyCookieHeader('KEY', https), '__Secure-hr_mail_key=KEY; Path=/api/mail; HttpOnly; SameSite=Strict; Secure')
  assert.equal(vaultRules.mailKeyCookieHeader('KEY', { sameSite: 'None', secure: true }), '__Secure-hr_mail_key=KEY; Path=/api/mail; HttpOnly; SameSite=None; Secure')
  assert.equal(vaultRules.clearedMailKeyCookieHeader(plain), 'hr_mail_key=; Path=/api/mail; HttpOnly; SameSite=Strict; Max-Age=0')
  assert.equal(vaultRules.clearedMailKeyCookieHeader(https), '__Secure-hr_mail_key=; Path=/api/mail; HttpOnly; SameSite=Strict; Secure; Max-Age=0')
  assert.doesNotMatch(vaultRules.mailKeyCookieHeader('KEY', https), /Max-Age|Expires|Domain/i, 'المفتاح مابيتكتبش على قرص الجهاز')
  // الافتراضي من إعداد cookie الجلسة: Strict
  const { sessionCookieOptions } = require('../src/auth/session-cookie')
  assert.equal(vaultRules.mailKeyCookieHeader('KEY', sessionCookieOptions({})), 'hr_mail_key=KEY; Path=/api/mail; HttpOnly; SameSite=Strict')
  assert.equal(vaultRules.mailKeyCookieName(sessionCookieOptions({ FRONTEND_URL: 'https://hr.example.invalid' })), '__Secure-hr_mail_key')
  // والبادئة العامة للخادم هي نفس بادئة مسار الـcookie
  assert.match(read('api/src/main.ts'), /app\.setGlobalPrefix\('api'\)/)
  assert.equal(vaultRules.MAIL_KEY_COOKIE_PATH, '/api/mail')
})

test('MU-03: unlock attempts — five wrong passwords in a row lock the form for fifteen minutes, per account', () => {
  let now = 0
  const attempts = new vaultRules.UnlockAttempts(() => now)
  assert.deepEqual(vaultRules.MAIL_UNLOCK_LIMIT, { maxAttempts: 5, minutes: 15 })
  for (let count = 1; count <= 4; count++) assert.deepEqual(attempts.fail(3), { count, lockedUntil: null })
  assert.equal(attempts.lockedUntil(3), null)
  assert.deepEqual(attempts.fail(3), { count: 5, lockedUntil: 15 * 60_000 })
  assert.deepEqual([attempts.lockedUntil(3), attempts.lockedUntil(4)], [15 * 60_000, null], 'حساب تاني مش مقفول')
  now = 15 * 60_000 - 1
  assert.equal(attempts.lockedUntil(3), 15 * 60_000)
  now = 15 * 60_000
  assert.equal(attempts.lockedUntil(3), null, 'القفل خلص والعداد بدأ من الأول')
  assert.deepEqual(attempts.fail(3), { count: 1, lockedUntil: null })
  attempts.fail(3); attempts.reset(3)
  assert.deepEqual(attempts.fail(3), { count: 1, lockedUntil: null }, 'فتح صح بيصفّر العداد')
  // أقل من حد قفل الدخول نفسه (عشان المجال مايقفلش حساب الموظف)
  assert.ok(vaultRules.MAIL_UNLOCK_LIMIT.maxAttempts < require('../src/auth/login-security').LOCKOUT_DEFAULTS.maxAttempts)
})

test('MU-04: the server settings come from the environment only — https required, certificate checking on unless switched off explicitly, and the login name', () => {
  const cfg = env => rules.readMailboxConfig(env)
  assert.deepEqual([cfg({}).enabled, cfg({}).gaps, cfg({ MAIL_EWS_URL: '   ' }).enabled], [false, ['MAIL_EWS_URL'], false])
  const good = cfg({ MAIL_EWS_URL: ' https://mail.example.invalid/EWS/Exchange.asmx ' })
  assert.deepEqual([good.enabled, good.url, good.domain, good.rejectUnauthorized, good.timeoutMs, good.gaps], [true, 'https://mail.example.invalid/EWS/Exchange.asmx', '', true, 30000, []])
  // http مرفوض إلا لخادم على نفس الجهاز؛ وعنوان فيه اسم مستخدم أو مش عنوان = مش مضبوط
  for (const bad of ['http://mail.example.invalid/EWS/Exchange.asmx', 'ftp://mail.example.invalid/x', 'https://user:pw@mail.example.invalid/EWS', 'mail.example.invalid', 'javascript:alert(1)']) {
    assert.deepEqual([cfg({ MAIL_EWS_URL: bad }).enabled, cfg({ MAIL_EWS_URL: bad }).url], [false, ''], bad)
  }
  for (const local of ['http://127.0.0.1:8080/EWS/Exchange.asmx', 'http://localhost:1/EWS/Exchange.asmx']) assert.equal(cfg({ MAIL_EWS_URL: local }).enabled, true, local)
  assert.equal(cfg({ MAIL_EWS_URL: good.url, MAIL_EWS_ENABLED: 'false' }).enabled, false)
  // التحقق من الشهادة: مقفول بس بـ«false» صريحة
  for (const value of [undefined, '', 'true', '0', 'no', 'off', 'FALSE ']) {
    assert.equal(cfg({ MAIL_EWS_URL: good.url, MAIL_EWS_TLS_REJECT_UNAUTHORIZED: value }).rejectUnauthorized, String(value).trim().toLowerCase() !== 'false', String(value))
  }
  assert.equal(rules.mailboxInsecureWarning(good), null)
  assert.match(rules.mailboxInsecureWarning(cfg({ MAIL_EWS_URL: good.url, MAIL_EWS_TLS_REJECT_UNAUTHORIZED: 'false' })), /MAIL_EWS_TLS_REJECT_UNAUTHORIZED=false/)
  assert.equal(rules.mailboxInsecureWarning(cfg({ MAIL_EWS_TLS_REJECT_UNAUTHORIZED: 'false' })), null, 'مش مضبوط = مفيش تحذير')
  assert.deepEqual([cfg({ MAIL_EWS_URL: good.url, MAIL_EWS_DOMAIN: 'CORP' }).domain, cfg({ MAIL_EWS_URL: good.url, MAIL_EWS_DOMAIN: 'bad domain\\x' }).domain,
    cfg({ MAIL_EWS_URL: good.url, MAIL_EWS_TIMEOUT_MS: '5000' }).timeoutMs, cfg({ MAIL_EWS_URL: good.url, MAIL_EWS_TIMEOUT_MS: '5' }).timeoutMs], ['CORP', '', 5000, 30000])
  assert.deepEqual(rules.mailboxConfigFrom(key => ({ MAIL_EWS_URL: good.url, MAIL_EWS_DOMAIN: 'CORP' })[key]).domain, 'CORP')
  assert.deepEqual([...rules.MAILBOX_ENV_KEYS], ['MAIL_EWS_URL', 'MAIL_EWS_ENABLED', 'MAIL_EWS_DOMAIN', 'MAIL_EWS_TLS_REJECT_UNAUTHORIZED', 'MAIL_EWS_TIMEOUT_MS'])
  // اسم الدخول: الـUPN زي ما هو، ومع اسم المجال القصير DOMAIN\user
  assert.deepEqual([rules.ewsCredentialName('sami@corp.invalid', ''), rules.ewsCredentialName('sami@corp.invalid', 'CORP'), rules.ewsCredentialName(' sami ', 'CORP')],
    ['sami@corp.invalid', 'CORP\\sami', 'CORP\\sami'])
  assert.deepEqual(['http://127.0.0.1:9/x', 'http://localhost/x', 'https://mail.example.invalid/x', 'nonsense'].map(rules.testNetworkAllowed), [true, true, false, false])
  // المفاتيح موثّقة في مثال البيئة من غير قيم حقيقية
  const example = read('api/.env.example')
  for (const key of rules.MAILBOX_ENV_KEYS) assert.match(example, new RegExp(`^# ${key}=`, 'm'), key)
  assert.match(example, /^# MAIL_EWS_URL=https:\/\/mail\.example\.com\/EWS\/Exchange\.asmx$/m)
})

test('MU-05: request values — addresses, Exchange ids, the shared mailbox, the compose body and the uploaded file name', () => {
  assert.deepEqual(rules.cleanAddresses([' a@x.invalid ', 'b@y.invalid', 'a@x.invalid']), ['a@x.invalid', 'b@y.invalid'])
  assert.deepEqual([rules.cleanAddresses(undefined), rules.cleanAddresses([])], [[], []])
  for (const bad of [['x'], ['a@b'], ['a b@x.invalid'], ['a@x.invalid, b@x.invalid'], ['<a@x.invalid>'], [5], Array(201).fill('a@x.invalid')]) refuses(() => rules.cleanAddresses(bad), 'MAIL_BAD_ADDRESS', JSON.stringify(bad).slice(0, 40))
  const id = 'AAMkAGZha2VmYWtlZmFrZWZha2VmYWtlZmFrZQ=='
  assert.equal(rules.cleanEwsId(id), id)
  for (const bad of [undefined, null, '', 'short', 'a'.repeat(513), id + ' OR 1=1', '../../' + id, `${id}<x>`, 12345678901234567890]) refuses(() => rules.cleanEwsId(bad), 'MAIL_BAD_ID', String(bad).slice(0, 30))
  assert.equal(rules.cleanAttachmentId('A'.repeat(600)), 'A'.repeat(600))
  for (const bad of [undefined, '', 'short', 'A'.repeat(2049), 'has space ' + 'A'.repeat(30)]) refuses(() => rules.cleanAttachmentId(bad), 'MAIL_BAD_ID', String(bad).slice(0, 20))
  assert.deepEqual([rules.cleanTarget(undefined), rules.cleanTarget(''), rules.cleanTarget(null), rules.cleanTarget(' Info@Corp.INVALID ')], [undefined, undefined, undefined, 'info@corp.invalid'])
  for (const bad of ['info', 'info@', 7, ['info@corp.invalid'], { a: 1 }]) refuses(() => rules.cleanTarget(bad), 'MAIL_BAD_ADDRESS', JSON.stringify(bad))
  assert.deepEqual(['7', '0', '500', '-1', '2.5', 'x', undefined, ['3']].map(value => rules.intParam(value, 50, 1, 100)), [7, 1, 100, 50, 50, 50, 50, 50])

  const compose = body => rules.cleanCompose(JSON.stringify(body))
  assert.deepEqual(compose({ to: ['a@x.invalid'], subject: 'موضوع', html: '<p>نص</p>', extra: 'ignored', userId: 9, from: 'boss@x.invalid' }),
    { mode: 'new', refId: undefined, to: ['a@x.invalid'], cc: [], bcc: [], subject: 'موضوع', html: '<p>نص</p>' }, 'مفيش خانة مرسل ولا حساب بتتاخد من الطلب')
  assert.deepEqual(compose({ mode: 'replyAll', refId: id, cc: ['c@x.invalid'] }), { mode: 'replyAll', refId: id, to: [], cc: ['c@x.invalid'], bcc: [], subject: '', html: '' })
  assert.equal(compose({ mode: 'weird', to: ['a@x.invalid'] }).mode, 'new')
  assert.deepEqual([compose({ to: ['a@x.invalid'], subject: 's'.repeat(600) }).subject.length, compose({ to: ['a@x.invalid'], html: 'h'.repeat(2_000_100) }).html.length], [500, 2_000_000])
  refuses(() => compose({ subject: 'x' }), 'MAIL_NO_RECIPIENTS')
  refuses(() => compose({ mode: 'reply', to: ['a@x.invalid'] }), 'MAIL_BAD_ID', 'رد من غير الرسالة الأصلية')
  refuses(() => compose({ to: ['nope'] }), 'MAIL_BAD_ADDRESS')
  for (const bad of ['{not json', '[]', '"text"', 'null', undefined]) refuses(() => rules.cleanCompose(bad), 'MAIL_BAD_PAYLOAD', String(bad))
  // multer بيقرا الاسم latin1: الاسم العربي بيرجع، ومن غير مسار
  const arabic = 'تقرير الربع.pdf'
  assert.deepEqual([rules.uploadedFileName(Buffer.from(arabic, 'utf8').toString('latin1')), rules.uploadedFileName('..\\..\\evil/name.txt'), rules.uploadedFileName(''), rules.uploadedFileName(undefined)],
    [arabic, '.._.._evil_name.txt', 'attachment', 'attachment'])
  assert.equal(rules.uploadedFileName('n'.repeat(500)).length, 200)

  assert.deepEqual([rules.cleanSharedAddress(' Info@Corp.INVALID '), rules.cleanSharedName('  صندوق   الاستفسارات '), rules.cleanSharedUserIds([3, 1, 3])], ['info@corp.invalid', 'صندوق الاستفسارات', [3, 1]])
  for (const bad of ['', 'info', null, 5]) refuses(() => rules.cleanSharedAddress(bad), 'MAIL_SHARED_ADDRESS', String(bad))
  for (const bad of ['', 'ا', null, 'ن'.repeat(201)]) refuses(() => rules.cleanSharedName(bad), 'MAIL_SHARED_NAME', String(bad).slice(0, 10))
  for (const bad of [undefined, 'x', [0], [-1], [1.5], ['1'], Array.from({ length: 201 }, (_, index) => index + 1)]) refuses(() => rules.cleanSharedUserIds(bad), 'MAIL_SHARED_USERS', JSON.stringify(bad)?.slice(0, 20))
})

test('MU-06: exact search — Arabic spellings, the from:/to:/subject: prefixes of the box, and the Exchange restriction', () => {
  assert.deepEqual(search.arabicVariants('احمد'), ['احمد', 'أحمد', 'إحمد', 'آحمد'])
  assert.ok(search.arabicVariants('الاداره').includes('الإدارة'), 'همزة بعد «ال» وتاء مربوطة في الآخر')
  assert.deepEqual(search.arabicVariants('مستشفي'), ['مستشفي', 'مستشفى'])
  assert.deepEqual(search.arabicVariants('مُحَمَّد'), ['محمد'], 'التشكيل متجاهل')
  assert.deepEqual(search.arabicVariants('report'), ['report'])
  assert.ok(search.arabicVariants('احمد اسامه ابراهيم علي').length <= 16, 'بحد أقصى')
  assert.deepEqual(search.terms('عقد "شركة النور" 2026'), ['عقد', 'شركة النور', '2026'])
  assert.equal(search.terms('a b c d e f g h i j').length, 8)
  const box = search.parseBox('from:sami عقد subject:"تجديد العقد" من:نورا الى:ali@x.invalid other:kept')
  assert.deepEqual([search.terms(box.text), box.from, box.to, box.subject], [['عقد', 'other:kept'], 'sami نورا', 'ali@x.invalid', '"تجديد العقد"'], 'بادئة مش معروفة بتفضل كلمة بحث')
  const query = search.mailQueryOf({ search: 'from:sami عقد', from: 'noura', after: '2026-10-01', before: 'x', attach: '1', unread: 'yes', scope: 'all' })
  assert.deepEqual(query, { text: 'عقد', from: 'sami noura', to: '', subject: '', after: '2026-10-01', before: undefined, attachments: true, unreadOnly: false })
  assert.deepEqual([search.isEmptyQuery(search.mailQueryOf({})), search.isEmptyQuery(query), search.isEmptyQuery(search.mailQueryOf({ search: ['x'], from: 5 }))], [true, false, true])
  assert.deepEqual([search.riyadhDayMs('2026-10-12'), search.riyadhDayMs('2026-10-12', 1), search.riyadhDayMs('12-10-2026'), search.riyadhDayMs('2026-13-45')],
    [Date.parse('2026-10-11T21:00:00Z'), Date.parse('2026-10-12T21:00:00Z'), null, null])
  // قيد Exchange بالمكتبة الحقيقية (من غير أي اتصال): فاضي = null، وكلمة واحدة = «أي واحد من» الخانات، وأكتر من شرط = «كلهم»
  const ews = require('../node_modules/ews-javascript-api')
  assert.equal(search.buildFilter(ews, search.mailQueryOf({})), null)
  const one = search.buildFilter(ews, search.mailQueryOf({ search: 'report' }))
  assert.ok(one instanceof ews.SearchFilter.SearchFilterCollection)
  assert.deepEqual([one.LogicalOperator, one.Count], [ews.LogicalOperator.Or, 6], 'الموضوع والنص والمرسل (اسم وعنوان) والمستلمين (إلى ونسخة)')
  const many = search.buildFilter(ews, query)
  assert.deepEqual([many.LogicalOperator, many.Count], [ews.LogicalOperator.And, 5], 'كلمة + مرسلين اتنين + من تاريخ + بمرفقات')
  assert.ok(search.buildFilter(ews, search.mailQueryOf({ unread: '1' })) instanceof ews.SearchFilter.IsEqualTo)
})

test('MU-07: wiring — a new closed module outside the presets, the shared-mailbox permission, guarded routes, the login and logout hooks, the migration, and the screen', () => {
  const module = MODULES.mail
  assert.deepEqual([module.nameAr, module.defaultEnabled, module.core, module.preset, module.permissions, module.routes, module.dependsOn, module.jobs, module.requestTypes],
    ['البريد', false, false, null, ['mail.shared.manage'], ['/mail'], [], [], []])
  const { routeOwner, modulesOfPreset } = require('../src/modules-registry/registry')
  assert.deepEqual([routeOwner('/mail').module, modulesOfPreset('full').includes('mail')], ['mail', false], 'مابيتفعّلش مع باقة')
  const { PERMISSIONS, PERMISSION_MODULES, PERMISSION_DESCRIPTIONS, ROLE_PRESETS } = require('../src/auth/permissions')
  assert.deepEqual([PERMISSIONS['mail.shared.manage'], PERMISSION_MODULES.find(unit => unit.key === 'mail').permissions, typeof PERMISSION_DESCRIPTIONS?.['mail.shared.manage']],
    ['إدارة صناديق البريد المشتركة', ['mail.shared.manage'], 'string'])
  for (const code of ['employee', 'branch_manager', 'hr_manager']) assert.equal(ROLE_PRESETS.find(role => role.code === code).permissions.includes('mail.shared.manage'), false, code)
  assert.equal(rules.MAIL_SHARED_PERMISSION, 'mail.shared.manage')

  // المسارات: الموديول والدخول على الكنترولر كله؛ وإدارة الصناديق المشتركة بالصلاحية؛ ومفيش معامل بيختار حساب أو اسم دخول
  const controller = read('api/src/mailbox/mailbox.controller.ts')
  assert.match(controller, /@RequireModule\('mail'\)\n@UseGuards\(JwtAuthGuard, RolesGuard\)\n@Controller\('mail'\)/)
  assert.equal(controller.split("@Perm('mail.shared.manage')").length - 1, 5)
  for (const route of ["@Get('shared')", "@Get('shared/users')", "@Post('shared')", "@Patch('shared/:id')", "@Delete('shared/:id')"]) {
    const at = controller.indexOf(route)
    assert.ok(at > 0 && controller.slice(at - 40, at).includes("@Perm('mail.shared.manage')"), route)
  }
  for (const route of ['status', 'unlock', 'lock', 'folders', 'messages', 'conversations', 'conversation', 'message', 'attachment', 'send', 'unread', 'contacts']) assert.ok(new RegExp(`@(Get|Post|Patch|Delete)\\('${route}'\\)`).test(controller), route)
  assert.doesNotMatch(controller, /@Query\('(?:user|userId|login|username|email|account|password)'\)|@Param\('(?:user|userId|login)'/, 'الهوية من الجلسة بس')
  assert.doesNotMatch(controller, /cache-key/, 'من غير تخزين على جهاز الموظف في النسخة دي')
  // كل نداء على Exchange بيعدّي من run (هوية صاحب الجلسة) — مفيش نداء مباشر للخدمة من الكنترولر
  assert.equal((controller.match(/this\.ews\.\w+\(/g) || []).length, (controller.match(/this\.mailbox\.run\(user, browserKeyOf\(req\), [^\n]*\(who\) =>/g) || []).length + 1, 'نداءات EWS كلها جوه run (والبحث في كل المجلدات في نفس run)')
  assert.match(controller, /res\.setHeader\('Content-Type', 'application\/octet-stream'\)\n\s+res\.setHeader\('Content-Disposition', `attachment; filename\*=UTF-8''\$\{encodeURIComponent\(file\.name \|\| 'attachment'\)\}`\)\n\s+res\.setHeader\('X-Content-Type-Options', 'nosniff'\)/)
  assert.match(controller, /const key = await this\.mailbox\.unlock\(user, dto\?\.password\)\n\s+appendSetCookie\(res, mailKeyCookieHeader\(key, sessionCookieOptions\(\)\)\)\n\s+return \{ unlocked: true \}/, 'المفتاح في الـcookie بس')

  // الهوية: الحساب من التوكن، وكلمة السر من مخزن الجلسة، واسم الدخول من المسجّل للحساب
  const service = read('api/src/mailbox/mailbox.service.ts')
  const identity = service.slice(service.indexOf('private async identity('), service.indexOf('async run<T>('))
  const order = ['this.assertConfigured()', 'this.vault.read(vaultScopeOf(user), browserKey)', 'if (password === null) throw locked(MAIL_LOCKED)', 'await this.shared.allowed(user.sub, target)',
    'return { userId: user.sub, login: await this.loginOf(user), password, target }'].map(part => identity.indexOf(part))
  assert.ok(order.every((at, index) => at > 0 && (index === 0 || at > order[index - 1])), JSON.stringify(order))
  assert.match(service, /return \(await readMailLogin\(this\.ds\.manager, user\.sub\)\) \?\? user\.email/)
  assert.match(service, /if \(!\(error instanceof MailAuthRejected\)\) throw error\n\s+this\.vault\.drop\(vaultScopeOf\(user\)\)\n\s+throw locked\(MAIL_PASSWORD_REJECTED\)/)
  assert.match(service, /HttpException\(\{ statusCode: 428, code: 'MAIL_LOCKED', message \}, 428\)/, 'مش 401: الواجهة بتعتبر 401 نهاية الجلسة نفسها')
  const unlock = service.slice(service.indexOf('async unlock('), service.indexOf('lock(user: JwtPayload)'))
  const steps = ['this.assertConfigured()', 'attempts.lockedUntil(user.sub)', 'await this.ews.unread(', 'attempts.fail(user.sub)', 'attempts.reset(user.sub)', 'this.vault.store(vaultScopeOf(user), secret,'].map(part => unlock.indexOf(part))
  assert.ok(steps.every((at, index) => at > 0 && (index === 0 || at > steps[index - 1])), JSON.stringify(steps))
  assert.doesNotMatch(unlock, /recordAudit\([^)]*secret/, 'كلمة السر مش في سطر تدقيق')

  // نقط الربط بالدخول والخروج — والسطور المثبّتة في اختبارات الجلسة زي ما هي
  const auth = read('api/src/auth/auth.controller.ts'), authService = read('api/src/auth/auth.service.ts'), authModule = read('api/src/auth/auth.module.ts')
  assert.match(auth, /const delivered = this\.deliver\(res, await this\.auth\.domainLogin\(dto\.username, dto\.password, \{ ip, userAgent \}, \{ cookie \}\), cookie, dto\.remember === true\)\n[^\n]*\n\s+await this\.mailSession\.afterDomainLogin\(res, delivered, dto\.password\)\n\s+return delivered/)
  assert.match(auth, /if \(cookie !== null\) res\.setHeader\('Set-Cookie', clearedSessionCookieHeader\(options\)\)\n[^\n]*\n\s+await this\.mailSession\.afterLogout\(res, bearer \?\? cookie\)\n\s+return \{ ok: true \}/)
  assert.equal(auth.split('this.mailSession.').length - 1, 2, 'الدخول بحساب الشركة والخروج بس')
  assert.match(authService, /const user = await this\.domain\.resolveUser\(directoryUser\)\n[^\n]*\n\s+await this\.mailSession\?\.rememberLogin\(user\.id, directoryUser\.userPrincipalName\)/)
  assert.equal(authService.split('this.mailSession').length - 1, 1, 'الاسم بس — كلمة السر مابتعدّيش من AuthService للبريد')
  assert.match(authModule, /MailVaultService, MailSessionService\],\n/)
  const session = read('api/src/mailbox/mail-session.service.ts')
  assert.match(session, /if \(payload\.mustChangePassword === true \|\| payload\.totpSetupRequired === true \|\| preboardingActive\(payload\)\) return\n\s+if \(!\(await this\.modules\.allowedFor\(MAIL_MODULE, payload\)\)\) return\n\s+const key = this\.vault\.store\(/, 'لما الموديول مفعّل للحساب بس')
  assert.match(session, /const payload = await this\.jwt\.verifyAsync<JwtPayload>\(token\)\.catch\(\(\) => null\)\n\s+if \(payload && Number\.isSafeInteger\(payload\.sub\)\) this\.vault\.drop\(vaultScopeOf\(payload\)\)/, 'توكن سليم التوقيع بس')
  assert.match(read('api/src/app.module.ts'), /\n    MailboxModule,\n/)

  // الترحيل 192: من غير BOM، إضافي بس، وأكواده فريدة بين كل الملفات؛ والكيانات من غير افتراضي
  const migrate = require('../scripts/db-migrate.cjs')
  const file = path.join(root, 'docs/migrations/payroll/20261012_192_mailbox.sql'), raw = fs.readFileSync(file)
  assert.notDeepEqual([...raw.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'من غير BOM')
  // نهايات السطور في النسخة المسحوبة بتتبع إعداد git على الجهاز (autocrlf) — المحتوى هو اللي بيتفحص
  const sqlText = raw.toString('utf8').replace(/\r\n/g, '\n')
  assert.equal(sqlText.includes('\r'), false, 'من غير CR لوحده')
  assert.match(sqlText, /^-- 20261012_192: /)
  assert.deepEqual([migrate.forbiddenStatements(sqlText), migrate.throwCodes(sqlText)], [[], [192001, 192002, 192003, 192004, 192005, 192006]])
  const statements = migrate.stripComments(sqlText)
  assert.doesNotMatch(statements, /\b(?:DROP|TRUNCATE|MERGE|INSERT|DELETE|ALTER)\b|\bUPDATE\s+(?:dbo\.)?\[?\w/i, 'جداول جديدة بس')
  assert.doesNotMatch(statements, /password|secret|body|html/i, 'ولا عمود لكلمة سر ولا لرسالة')
  assert.deepEqual([...statements.matchAll(/CREATE TABLE dbo\.(\w+)/g)].map(match => match[1]), ['mail_accounts', 'mail_shared_mailboxes', 'mail_shared_mailbox_users'])
  assert.deepEqual(migrate.analyze(migrate.discover()).problems.filter(problem => /192/.test(JSON.stringify(problem))), [])
  const entities = read('api/src/mailbox/mailbox.entities.ts')
  assert.doesNotMatch(entities, /default:|CreateDateColumn|UpdateDateColumn/, 'من غير افتراضي (زي الترحيل)')
  assert.deepEqual([...entities.matchAll(/@Entity\('(\w+)'\)/g)].map(match => match[1]), ['mail_accounts', 'mail_shared_mailboxes', 'mail_shared_mailbox_users'])
  assert.match(read('api/src/mailbox/mailbox-store.ts'), /if \(ready === true\) return true\n/, 'النتيجة السلبية مابتتحفظش: عملية شغالة من قبل الترحيل بتشوفه أول ما يتطبق')

  // الواجهة: الشاشة في القايمة والعنوان والقاموس؛ ونص الرسالة معزول؛ والكاش في ذاكرة الصفحة بس
  assert.ok(read('src/components/layout/Sidebar.tsx').includes("{ label: 'البريد', href: '/mail' },"))
  assert.ok(read('src/components/layout/pageTitles.ts').includes("['/mail', 'البريد'],"))
  assert.match(read('src/i18n/en.ts'), /^\s*'البريد': 'Mail',$/m)
  const body = read('src/app/mail/MessageBody.tsx')
  const sandbox = /sandbox="([^"]*)"/.exec(body)?.[1]
  assert.equal(sandbox, 'allow-popups allow-popups-to-escape-sandbox', 'من غير allow-scripts ولا allow-same-origin ولا allow-forms')
  assert.match(body, /default-src 'none'; style-src 'unsafe-inline'; font-src data:; img-src data: \$\{images \? 'https: http:' : ''\}/, 'الصور البعيدة مقفولة لحد ما القارئ يطلبها')
  assert.match(body, /srcDoc=\{doc\}/)
  assert.doesNotMatch(body, /dangerouslySetInnerHTML|contentDocument|contentWindow/)
  const web = fs.readdirSync(path.join(root, 'src/app/mail')).filter(name => /\.tsx?$/.test(name)).map(name => [name, read(`src/app/mail/${name}`)])
  assert.ok(web.length >= 8, String(web.length))
  for (const [name, text] of web) {
    assert.doesNotMatch(text, /dangerouslySetInnerHTML/, `${name}: نص الرسالة مابيتحطش في صفحة النظام`)
    assert.doesNotMatch(text, /indexedDB|IndexedDB|caches\.open/, `${name}: من غير تخزين على القرص`)
    assert.doesNotMatch(text, /(^|[\s"'`:!])-?(?:(?:mr|ml|pr|pl|right|left)-[a-z0-9.\[]|text-(?:right|left)(?![a-z-])|(?:rounded|border)-(?:tr|tl|br|bl|r|l)(?![a-z]))/, `${name}: كلاسات اتجاه منطقية بس`)
  }
  const cache = read('src/app/mail/cache.ts'), api = read('src/lib/mail-api.ts')
  assert.doesNotMatch(cache + api, /localStorage|sessionStorage/, 'محتوى البريد في ذاكرة الصفحة بس')
  assert.match(cache, /export function ownCaches\(owner: string \| null\)/)
  assert.match(api, /export const unlockMailbox = \(password: string\) => apiFetch<\{ unlocked: boolean \}>\('\/mail\/unlock', \{ method: 'POST', body: JSON\.stringify\(\{ password \}\) \}\)/)
  // كلمة السر في حالة النموذج بس وبتتمسح بعد الإرسال
  const unlockForm = read('src/app/mail/UnlockForm.tsx')
  assert.match(unlockForm, /type="password"/)
  assert.match(unlockForm, /autoComplete="current-password"/)
  assert.match(unlockForm, /finally \{\s+setPassword\(''\)/)
  assert.doesNotMatch(unlockForm, /localStorage|sessionStorage|console\./)
})

test('MU-08: the EWS service — no password is kept between requests or logged, the no-real-network guard for tests, and Exchange errors translated', () => {
  const source = read('api/src/mailbox/ews.service.ts')
  // المكتبة بتتحمّل عند أول استخدام: مفيش import وقت التشغيل
  assert.match(source, /^import type \* as Ews from 'ews-javascript-api'$/m)
  assert.match(source, /^import type \{ XhrApi \} from '@ewsjs\/xhr'$/m)
  assert.doesNotMatch(source, /^import \{[^}]*\} from '(?:ews-javascript-api|@ewsjs\/xhr)'/m)
  // مفيش عميل محفوظ ولا بصمة لكلمة السر: الناقل لكل نداء، والعدّاد من غير سر
  assert.doesNotMatch(source, /fingerprint|createHash|clients = new Map/)
  assert.match(source, /private readonly slots = new Map<number, \{ active: number; queue: \(\(\) => void\)\[\] \}>\(\)/)
  assert.match(source, /svc\.XHRApi = this\.transport\(who\) as never/)
  assert.match(source, /if \(process\.env\.NODE_ENV === 'test' && !testNetworkAllowed\(this\.config\.url\)\) \{\n\s+throw new Error\(/)
  assert.match(source, /svc\.Url = new E\.Uri\(this\.config\.url\)/, 'عنوان الخادم من الإعداد بس')
  assert.equal((source.match(/new E\.Uri\(/g) || []).length, 1)
  assert.match(source, /rejectUnauthorized: this\.config\.rejectUnauthorized/)
  // ولا سطر سجل في ملفات البريد كلها بياخد كلمة سر أو مفتاح
  for (const name of SERVICE_FILES) {
    const text = read(`api/src/mailbox/${name}`)
    for (const row of text.split('\n').filter(row => /\b(?:log|logger)\.(?:log|warn|error|debug|verbose)\(|console\./.test(row))) {
      // السر مسموح في سطر سجل في مكان واحد بس: قايمة «امسح دول» بتاعة scrubSecrets
      const line = row.replace(/, \[(?:secret|who\.password)\]\)/g, ')')
      assert.doesNotMatch(line, /\$\{[^}]*\b(?:password|secret|browserKey|key)\b[^}]*\}/i, `${name}: ${line.trim().slice(0, 90)}`)
      assert.ok(!/\$\{[^}]*(?:message|error|err|cause)\b/i.test(line) || /scrubSecrets|slice\(0, \d+\)/.test(line), `${name}: نص خطأ في السجل من غير مسح أو حد: ${line.trim().slice(0, 90)}`)
    }
    assert.doesNotMatch(text, /console\.(log|warn|error|debug)/, name)
  }
  // مفيش كتابة لكلمة السر في قاعدة: المخزن في الذاكرة بس
  for (const name of ['mail-vault.ts', 'mail-vault.service.ts']) assert.doesNotMatch(read(`api/src/mailbox/${name}`), /typeorm|\.query\(|Repository|writeFile|appendFile/, name)

  const { EwsService, MailAuthRejected } = require('../src/mailbox/ews.service')
  const service = (env, mode = 'test') => { const before = process.env.NODE_ENV; process.env.NODE_ENV = mode; try { return new EwsService({ get: key => env[key] }) } finally { process.env.NODE_ENV = before } }
  const who = { userId: 1, login: 'sami@corp.invalid', password: FAKE }
  // من غير إعداد: 503 بكود ثابت قبل أي تحميل أو اتصال
  const off = service({})
  assert.equal(off.isConfigured(), false)
  assert.throws(() => off.serviceFor(who), error => error.getStatus() === 503 && error.getResponse().code === 'MAIL_NOT_CONFIGURED')
  // في الاختبار: عنوان برّه الجهاز = رفض صريح قبل أي اتصال
  const remote = service({ MAIL_EWS_URL: 'https://mail.example.invalid/EWS/Exchange.asmx' })
  const before = process.env.NODE_ENV
  process.env.NODE_ENV = 'test'
  try { assert.throws(() => remote.transport(who), /اتصال Exchange حقيقي/) } finally { process.env.NODE_ENV = before }
  // ترجمة الأخطاء، ونص الخطأ في السجل ممسوح منه السر
  const logged = []
  remote.log.error = line => logged.push(String(line))
  const mapped = message => { try { remote.fail({ message }, who) } catch (error) { return error instanceof MailAuthRejected ? 'REJECTED' : `${error.getStatus()} ${error.getResponse().code}` } }
  assert.deepEqual(['ErrorAccessDenied: no', 'The user does not have permission', 'ErrorNonExistentMailbox', 'Too many concurrent connections opened', 'ErrorItemNotFound: gone', '401 Unauthorized',
    `socket closed while sending ${FAKE}`].map(mapped),
  ['403 MAIL_NO_ACCESS', '403 MAIL_NO_ACCESS', '404 MAIL_NO_MAILBOX', '503 MAIL_BUSY', '404 MAIL_ITEM_NOT_FOUND', 'REJECTED', '503 MAIL_UNAVAILABLE'])
  assert.equal(logged.length, 1)
  assert.equal(logged[0].includes(FAKE), false, 'السر اتمسح من سطر السجل')
  assert.match(logged[0], /socket closed while sending \*\*\*/)
  // خطأ HTTP جاهز بيعدّي زي ما هو
  const { BadRequestException } = require('../node_modules/@nestjs/common')
  const ready = new BadRequestException({ code: 'MAIL_BAD_ID', message: 'x' })
  assert.throws(() => remote.fail(ready, who), error => error === ready)
})
