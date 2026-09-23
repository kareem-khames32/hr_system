'use strict'
// تقوية التحقق بخطوتين بعد مراجعة Codex — بلا قاعدة بيانات وبلا أي اتصال.
// المستودع الوهمي هنا **صارم**: بينفّذ شرط الـWHERE بالكامل (بما فيه attempts وcodeHash)، وأي عامل
// بحث مش مدعوم بيرمي بصوت عالي — فماينفعش تحديث مشروط «ينجح» وهو المفروض يفشل.
//
// اللي بيتأكد هنا:
//   G) بوابة الإعداد تلات حالات: مفتوح، مقفول، ومش معروف — والمفتاح الغايب/الفاضي مقفول زي ما هو
//   F) فشل قراءة الإعداد = رفض دخول في المسارين، بلا جلسة ولا بريد ولا حالة معلَّقة (فشل مقفول)
//   A) عدّ المحاولات المتوازية: 12 رمز غلط في نفس اللحظة = العدّاد 5 والحالة مقفولة، والصح مرفوض
//   S) رمز استبدلته إعادة إرسال وإحنا بنقارن: مرفوض، والحالة مابتُستهلكش، والرمز الجديد شغّال
//   R) المتتابع زي ما هو بالحرف: القفل عند المحاولة الخامسة
// الملفات على القرص CRLF — كل قراءة مصدر بتتطبّع.
// Run: node --test api/test/two-factor-hardening.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const net = require('node:net')
net.Socket.prototype.connect = function () { throw new Error('الاختبار ده ممنوع يفتح اتصال') }
net.Server.prototype.listen = function () { throw new Error('الاختبار ده ممنوع يفتح مستمع') }
process.env.NODE_ENV = 'test'
const apiRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(apiRoot, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
require('../node_modules/@nestjs/common').Logger.overrideLogger(false)
const bcryptjs = require('../node_modules/bcryptjs')
const { FindOperator } = require('../node_modules/typeorm')
const { AuthService } = require('../src/auth/auth.service')
const { OTP, TwoFactorService } = require('../src/auth/two-factor.service')
const { MailSendError } = require('../src/auth/mail.service')

const read = (...parts) => fs.readFileSync(path.join(repoRoot, ...parts), 'utf8').replace(/\r\n/g, '\n')
const isArabic = (text) => /[؀-ۿ]/.test(String(text))

// ===== مستودع حالات الدخول: صف واحد مشترك، وشرط WHERE منفَّذ بالكامل =====
const matchValue = (actual, expected) => {
  if (expected instanceof FindOperator) {
    if (expected.type === 'isNull') return actual === null || actual === undefined
    throw new Error(`عامل بحث غير مدعوم في المستودع الوهمي: ${expected.type}`)
  }
  if (actual instanceof Date && expected instanceof Date) return actual.getTime() === expected.getTime()
  return actual === expected
}
function challengeRepository() {
  let row = null
  const reads = { findOne: 0, update: 0 }
  const matches = (where) => Object.entries(where ?? {}).every(([key, value]) => matchValue(row[key], value))
  return {
    stats: reads,
    get row() { return row },
    async insert(value) { row = { id: 1, ...value }; return { identifiers: [{ id: 1 }] } },
    async findOne({ where }) { reads.findOne++; return row && matches(where) ? { ...row } : null },
    async update(where, patch) {
      reads.update++
      if (!row || !matches(where)) return { affected: 0 }
      Object.assign(row, patch)
      return { affected: 1 }
    },
    async delete() { return { affected: 0 } },
  }
}

const identity = { id: 7, email: 'gate@example.invalid', displayName: 'حساب اختبار', role: 'employee',
  branchId: 1, employeeId: 1, isActive: true, permissions: '[]', tokenVersion: 0 }

/** مزوّدون وهميون على الحدود الخارجية بس: الدليل والبريد وموقّع الجلسة. الخدمتان حقيقيتان. */
function harness({ configValue = 'true', configThrows = false } = {}) {
  const stats = { sessions: 0, mails: 0, loginWrites: 0 }
  const sent = []
  const challenges = challengeRepository()
  const config = { async findOne() {
    if (configThrows) throw new Error('فشل مصطنع في قراءة مفتاح التحقق بخطوتين')
    return configValue === null ? null : { value: configValue }
  } }
  const mail = {
    isConfigured: () => true,
    status: () => ({ configured: true, missing: [] }),
    async send(message) { stats.mails++; sent.push(message.text.match(/\d{6}/)[0]); return { response: '250 ok', messageId: null } },
  }
  const users = { async update() { stats.loginWrites++ }, createQueryBuilder() {
    const q = { addSelect: () => q, where: () => q, getOne: async () => ({ ...identity }) }
    return q
  } }
  const twoFactor = new TwoFactorService(challenges, config, mail)
  const auth = new AuthService(users, { async findOne() { return null } }, { async find() { return [] } },
    { async signAsync() { stats.sessions++; return 'fake-session' } }, twoFactor,
    { async authenticate() { return { mail: identity.email } }, isConfigured: () => true,
      status: () => ({ enabled: false, configured: false, missing: [] }) },
    { async resolveUser() { return { ...identity } } }, mail)
  return { auth, twoFactor, challenges, stats, sent, get code() { return sent[sent.length - 1] } }
}

/**
 * يحبس كل مقارنات bcrypt الجارية لحد ما يوصل عددها `count`، وبعدها يسيبها كلها في نفس اللحظة.
 * ده بيجبر كل المحاولات المتوازية تقرا الصف قبل ما أي واحدة تكتب — أقصى تداخل ممكن.
 * المستودع مالوش علاقة: التوقيت بس اللي بيتغيّر.
 */
function releaseTogether(count) {
  const original = bcryptjs.compare
  let arrived = 0
  let open
  const gate = new Promise((resolve) => { open = resolve })
  bcryptjs.compare = async (value, hash) => {
    const result = await original.call(bcryptjs, value, hash)
    if (++arrived >= count) open()
    await gate
    return result
  }
  return () => { bcryptjs.compare = original }
}

/** يوقف أول مقارنة bcrypt عند نتيجتها لحد ما نسيبها — نافذة «تحقق جارٍ» بلا لمس المستودع. */
function holdFirstCompare() {
  const original = bcryptjs.compare
  let reached
  let open
  const arrived = new Promise((resolve) => { reached = resolve })
  const gate = new Promise((resolve) => { open = resolve })
  let first = true
  bcryptjs.compare = async (value, hash) => {
    const result = await original.call(bcryptjs, value, hash)
    if (first) { first = false; reached(); await gate }
    return result
  }
  return { arrived, release: () => open(), restore: () => { bcryptjs.compare = original } }
}

const wrongCodeFor = (code) => String((Number(code) + 7) % 1000000).padStart(6, '0')

// ============================================================================
// G) بوابة الإعداد — تلات حالات
// ============================================================================

test('2FG1 — المفتاح الغايب أو الفاضي أو غير true = مقفول (قيمة مقروءة بنجاح، مش فشل قراءة)', async () => {
  assert.equal(await harness({ configValue: null }).twoFactor.gate(), 'DISABLED')
  assert.equal(await harness({ configValue: '' }).twoFactor.gate(), 'DISABLED')
  assert.equal(await harness({ configValue: '   ' }).twoFactor.gate(), 'DISABLED')
  assert.equal(await harness({ configValue: 'false' }).twoFactor.gate(), 'DISABLED')
  assert.equal(await harness({ configValue: '1' }).twoFactor.gate(), 'DISABLED')
  assert.equal(await harness({ configValue: ' TRUE ' }).twoFactor.gate(), 'ENABLED')
  assert.equal(await harness({ configValue: 'true' }).twoFactor.gate(), 'ENABLED')
})

test('2FG2 — فشل القراءة = UNKNOWN، مش DISABLED (الحالتان ممنوع يتلخبطوا)', async () => {
  assert.equal(await harness({ configThrows: true }).twoFactor.gate(), 'UNKNOWN')
  // والفرق معلن في النوع نفسه: تلات قيم بأسمائها
  const source = read('api/src/auth/two-factor.service.ts')
  assert.match(source, /TwoFactorGate = 'ENABLED' \| 'DISABLED' \| 'UNKNOWN'/)
  // مفيش أي رجوع بـfalse من مسار الخطأ (السبب الأصلي للثغرة)
  assert.doesNotMatch(source, /isEnabled/)
})

// ============================================================================
// F) فشل القراءة = رفض دخول، بلا جلسة
// ============================================================================

test('2FF1 — فشل قراءة الإعداد: مسار حساب الشركة مرفوض 503 برسالة عربية بالسبب، ومفيش جلسة ولا بريد', async () => {
  const h = harness({ configThrows: true })
  const refused = await h.auth.domainLogin('someone', 'secret').then(() => null, (error) => error)
  assert.ok(refused, 'الدخول لازم يُرفض')
  assert.equal(refused.getStatus(), 503)
  assert.ok(isArabic(refused.message), refused.message)
  assert.match(refused.message, /إعداد التحقق بخطوتين|الدخول موقوف/)
  assert.deepEqual(h.stats, { sessions: 0, mails: 0, loginWrites: 0 })
  assert.equal(h.challenges.row, null, 'ممنوع حالة معلَّقة تتعمل')
})

test('2FF2 — ونفس الشيء لمسار البريد وكلمة المرور (نفس الدالة المشتركة)', async () => {
  const h = harness({ configThrows: true })
  const password = 'Str0ng-Pass-For-Test'
  h.auth.withPasswordState = () => ({
    addSelect: () => h.auth.withPasswordState(),
    where: () => h.auth.withPasswordState(),
    getOne: async () => ({ ...identity, passwordHash: bcryptjs.hashSync(password, 4) }),
  })
  const refused = await h.auth.login(identity.email, password).then(() => null, (error) => error)
  assert.ok(refused, 'الدخول لازم يُرفض')
  assert.equal(refused.getStatus(), 503)
  assert.equal(h.stats.sessions, 0)
  assert.equal(h.stats.loginWrites, 0, 'ممنوع حتى تسجيل آخر دخول')
})

test('2FF3 — حالة الأمان بتقول «مش معروف» صراحةً ومابتقولش مقفول، وبلا أي سر', async () => {
  const unknown = await harness({ configThrows: true }).auth.securityStatus()
  assert.equal(unknown.twoFactorState, 'UNKNOWN')
  assert.equal(unknown.twoFactorEnabled, false, 'مفتوح = ENABLED بس')
  const open = await harness({ configValue: 'true' }).auth.securityStatus()
  assert.deepEqual([open.twoFactorState, open.twoFactorEnabled], ['ENABLED', true])
  const closed = await harness({ configValue: 'false' }).auth.securityStatus()
  assert.deepEqual([closed.twoFactorState, closed.twoFactorEnabled], ['DISABLED', false])
  assert.doesNotMatch(JSON.stringify(unknown), /password|Password/)
})

test('2FF4 — المصدر: الرفض قبل أي إصدار جلسة، وقراءة الحالة مرة واحدة في مسار الدخول', () => {
  const auth = read('api/src/auth/auth.service.ts')
  const body = auth.slice(auth.indexOf('private async finishLogin'), auth.indexOf('private httpFor'))
  assert.ok(body.indexOf("gate === 'UNKNOWN'") > 0, 'حالة «مش معروف» لازم تتفصل صريحة')
  assert.ok(
    body.indexOf("gate === 'UNKNOWN'") < body.indexOf('return this.issueSession(user)'),
    'الرفض لازم يسبق أي إصدار جلسة'
  )
  assert.match(body, /ServiceUnavailableException/)
})

// ============================================================================
// A) عدّ المحاولات المتوازية
// ============================================================================

test('2FA1 — 12 رمز غلط في نفس اللحظة: العدّاد بيوصل الحد بالظبط والحالة تتقفل، والرمز الصح يُرفض', async () => {
  const h = harness()
  const pending = await h.auth.domainLogin('someone', 'secret')
  const wrong = wrongCodeFor(h.code)
  const restore = releaseTogether(12)
  let results
  try {
    results = await Promise.allSettled(
      Array.from({ length: 12 }, () => h.twoFactor.verify(pending.challengeToken, wrong))
    )
  } finally { restore() }
  assert.equal(results.filter((r) => r.status === 'rejected').length, 12, 'كل الاستدعاءات لازم تُرفض')
  // الاختبار ده فعلًا بيمرّ على مسار التعارض: الـ12 قرأوا نفس القيمة، فلازم تحديثات اتفشلت وأُعيدت
  assert.ok(h.challenges.stats.update > 12, `تحديثات = ${h.challenges.stats.update} — المفروض فيها إعادات`)
  assert.equal(h.challenges.row.attempts, OTP.maxAttempts, 'كل محاولة متوازية لازم تتعدّ لحد الحد')
  assert.ok(h.challenges.row.lockedAt, 'الحالة لازم تتقفل')
  // والرمز الصح بعد القفل مايفتحش جلسة
  const afterLock = await h.twoFactor.verify(pending.challengeToken, h.code).then(() => null, (e) => e)
  assert.equal(afterLock.code, 'LOCKED')
  assert.equal(h.stats.sessions, 0)
  assert.equal(h.challenges.row.consumedAt, null)
})

test('2FA2 — رمزان صحيحان متوازيان: استهلاك واحد بالظبط وجلسة واحدة', async () => {
  const h = harness()
  const pending = await h.auth.domainLogin('someone', 'secret')
  const restore = releaseTogether(4)
  let results
  try {
    results = await Promise.allSettled(
      Array.from({ length: 4 }, () => h.auth.verifyTwoFactor(pending.challengeToken, h.code))
    )
  } finally { restore() }
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1, 'جلسة واحدة بالظبط')
  assert.equal(h.stats.sessions, 1)
  for (const rejected of results.filter((r) => r.status === 'rejected')) {
    assert.equal(rejected.reason.getStatus(), 401)
  }
})

test('2FR1 — المتتابع زي ما هو: القفل عند المحاولة الخامسة والعدّاد بيوصلها بالظبط', async () => {
  const h = harness()
  const pending = await h.auth.domainLogin('someone', 'secret')
  const wrong = wrongCodeFor(h.code)
  for (let i = 1; i <= OTP.maxAttempts; i++) {
    const error = await h.twoFactor.verify(pending.challengeToken, wrong).then(() => null, (e) => e)
    assert.ok(error, `محاولة ${i}`)
    assert.equal(h.challenges.row.attempts, i)
    assert.equal(!!h.challenges.row.lockedAt, i === OTP.maxAttempts)
    assert.equal(error.code, i === OTP.maxAttempts ? 'LOCKED' : 'WRONG_CODE')
    if (i < OTP.maxAttempts) assert.match(error.message, new RegExp(`باقي لك ${OTP.maxAttempts - i} محاولة`))
  }
})

// ============================================================================
// S) رمز استبدلته إعادة إرسال
// ============================================================================

test('2FS1 — إعادة الإرسال بتُبطل الرمز القديم حتى لتحقق جارٍ، والحالة مابتُستهلكش', async () => {
  const h = harness()
  const pending = await h.auth.domainLogin('someone', 'secret')
  const oldCode = h.code
  // المهلة عدّت: إعادة الإرسال مسموحة
  h.challenges.row.lastSentAt = new Date(Date.now() - (OTP.resendCooldownSeconds + 1) * 1000)
  const hold = holdFirstCompare()
  let outcome
  try {
    const inFlight = h.auth.verifyTwoFactor(pending.challengeToken, oldCode).then(() => null, (e) => e)
    await hold.arrived
    await h.twoFactor.resend(pending.challengeToken)
    assert.notEqual(h.code, oldCode, 'إعادة الإرسال لازم تبعت رمزًا مختلفًا')
    hold.release()
    outcome = await inFlight
  } finally { hold.restore() }
  assert.ok(outcome, 'الرمز القديم لازم يُرفض بعد إعادة الإرسال')
  assert.equal(outcome.getStatus(), 401)
  assert.ok(isArabic(outcome.message), outcome.message)
  assert.equal(h.stats.sessions, 0, 'ممنوع أي جلسة من رمز مستبدل')
  assert.equal(h.challenges.row.consumedAt, null, 'الحالة لازم تفضل صالحة للرمز الجديد')
  // والرمز الجديد شغّال عادي
  const session = await h.auth.verifyTwoFactor(pending.challengeToken, h.code)
  assert.ok(session.accessToken)
  assert.equal(h.stats.sessions, 1)
})

test('2FS2 — المصدر: الاستهلاك مشروط بالـhash اللي قورن، والمقارنة حرفية في JS كمان', () => {
  const source = read('api/src/auth/two-factor.service.ts')
  assert.match(source, /\{ id: row\.id, codeHash: row\.codeHash, consumedAt: IsNull\(\), lockedAt: IsNull\(\) \}/)
  assert.match(source, /fresh\.codeHash !== row\.codeHash/)
  // وعدّ المحاولات مشروط بالقيمة المقروءة، مش تعيين محسوب في JS على نسخة قديمة
  assert.match(source, /\{ id, attempts: current\.attempts, consumedAt: IsNull\(\), lockedAt: IsNull\(\) \}/)
  assert.doesNotMatch(source, /await this\.challenges\.update\(\{ id: row\.id \}, \{ attempts/)
  // والصف بيتقرا تاني بعد المقارنة قبل أي قرار
  const verify = source.slice(source.indexOf('async verify('), source.indexOf('private assertOpen('))
  assert.ok(verify.indexOf('bcrypt.compare') < verify.indexOf('await this.reread(row.id)'))
})
