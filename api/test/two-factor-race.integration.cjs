'use strict'
// تقوية التحقق بخطوتين على **SQL Server حقيقي** (قاعدة مؤقتة تُحذف في النهاية) — Nest + TypeORM + HTTP.
// الحدود الخارجية بس مزيّفة: authenticate على الدليل وsend على البريد؛ كل قراءة وكتابة للحالة المعلَّقة
// بتروح للقاعدة فعلًا. بانيا عميل LDAP ونقل SMTP مستبدلين برمي استثناء، فمفيش خروج للشبكة.
//
// اللي بيتأكد هنا (اللي المستودع الوهمي عمره ما يثبته):
//   R1) فشل قراءة مفتاح التحقق **من القاعدة نفسها** (الجدول مش موجود لحظيًّا) = رفض 503 بلا جلسة
//   R2) 12 تحقق متوازي برمز غلط، كل واحد بقراءته الخاصة وباتصاله الخاص: العدّاد 5 بالظبط والحالة تتقفل
//   R3) نفس السيناريو عبر HTTP (12 طلب في نفس اللحظة) — نفس النتيجة
//   R4) إعادة إرسال وسط تحقق جارٍ: الرمز القديم مرفوض، والحالة مش مستهلكة، والرمز الجديد شغّال
//   R5) 6 تحققات متوازية بالرمز **الصح**: جلسة واحدة بالظبط
//   R7) 8 إعادات إرسال في نفس اللحظة: رسالة واحدة بالظبط، والعدّاد مش بيضيع، والحد المعلن مايتخطاش
// Run: node --test --test-concurrency=1 api/test/two-factor-race.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const bcryptjs = require('../node_modules/bcryptjs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_2fa_race_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-2fa-race-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const TWO_FACTOR_KEY = 'auth.two_factor_enabled'
const pass = () => `T${crypto.randomBytes(9).toString('base64url')}9`

let app, ds, master, baseUrl, created = false
let twoFactorService, OTP, MailSendError
let adminUser, adminPassword
const mailbox = []

function assertDisposable() {
  assert.match(database, migrate.DISPOSABLE_DATABASE)
  assert.match(database, /^hr_2fa_race_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  assert.notEqual(database, 'hr_system')
  assert.notEqual(database, 'hr_review_pre_payroll')
  if (ds) assert.equal(ds.options.database, database)
}
const repo = (name) => { assertDisposable(); return ds.getRepository(name) }

async function http(method, route, body) {
  const response = await fetch(baseUrl + route, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const text = await response.text()
  let parsed = null
  try { parsed = text ? JSON.parse(text) : null } catch { parsed = text }
  return { status: response.status, body: parsed }
}
const expect = (r, status, note) => { assert.equal(r.status, status, `${note ?? ''} ${JSON.stringify(r.body)}`); return r.body }
const msg = (r) => { const m = r?.body?.message; return Array.isArray(m) ? m.join(' | ') : String(m ?? JSON.stringify(r?.body ?? '')) }
const isArabic = (text) => /[؀-ۿ]/.test(String(text))
const login = () => http('POST', '/auth/login', { email: adminUser.email, password: adminPassword })
const verifyHttp = (challengeToken, code) => http('POST', '/auth/login/verify', { challengeToken, code })

const lastCode = () => {
  const last = mailbox[mailbox.length - 1]
  assert.ok(last, 'مفيش رسالة اتبعت')
  const found = /رمز الدخول(?: الجديد)?: (\d{6})/.exec(last.text)
  assert.ok(found, 'مفيش رمز في الرسالة')
  return found[1]
}
const wrongCodeFor = (code) => String((Number(code) + 7) % 1000000).padStart(6, '0')
const challengeRow = async (token) => {
  const [row] = await ds.query('SELECT * FROM dbo.login_challenges WHERE [token] = @0', [token])
  return row
}
/** حالة معلَّقة جديدة على القاعدة + الرمز اللي اتبعت فعلًا */
const openChallenge = async () => {
  mailbox.length = 0
  const pending = expect(await login(), 201, 'login:')
  assert.equal(pending.twoFactor, true)
  return { token: pending.challengeToken, code: lastCode() }
}

/**
 * يحبس كل مقارنات bcrypt لحد ما يوصل عددها `count`، وبعدها يسيبها كلها معًا: كل الاستدعاءات
 * المتوازية تقرا صف الحالة من SQL **قبل** ما أي واحدة تكتب — أقصى تداخل ممكن على اتصالات حقيقية.
 * المستودع والقاعدة مالهمش علاقة: التوقيت بس اللي بيتغيّر.
 */
function releaseTogether(count) {
  const original = bcryptjs.compare
  let arrived = 0, open
  const gate = new Promise((resolve) => { open = resolve })
  bcryptjs.compare = async (value, hash) => {
    const result = await original.call(bcryptjs, value, hash)
    if (++arrived >= count) open()
    await gate
    return result
  }
  return () => { bcryptjs.compare = original }
}
/**
 * نفس الفكرة لإعادة الإرسال: يحبس كل عمليات bcrypt.hash لحد ما يوصل عددها `count` وبعدها يسيبها معًا.
 * الـhash في `resend` بيحصل **بعد** قراءة صف الحالة و**قبل** حجز الخانة، فكل الطلبات المتوازية بتكون
 * قرأت نفس الصف من SQL قبل ما أي واحدة تكتب — أقصى تداخل ممكن على اتصالات حقيقية.
 */
function releaseHashesTogether(count) {
  const original = bcryptjs.hash
  let arrived = 0, open
  const gate = new Promise((resolve) => { open = resolve })
  bcryptjs.hash = async (value, rounds) => {
    const result = await original.call(bcryptjs, value, rounds)
    if (++arrived >= count) open()
    await gate
    return result
  }
  return () => { bcryptjs.hash = original }
}
/** يوقف أول مقارنة عند نتيجتها — نافذة «تحقق جارٍ» حقيقية بلا لمس المستودع. */
function holdFirstCompare() {
  const original = bcryptjs.compare
  let reached, open, first = true
  const arrived = new Promise((resolve) => { reached = resolve })
  const gate = new Promise((resolve) => { open = resolve })
  bcryptjs.compare = async (value, hash) => {
    const result = await original.call(bcryptjs, value, hash)
    if (first) { first = false; reached(); await gate }
    return result
  }
  return { arrived, release: () => open(), restore: () => { bcryptjs.compare = original } }
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  const connection = (db) => ({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433),
    user: env.DB_USERNAME || 'sa', password: env.DB_PASSWORD, database: db,
    options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 10000, requestTimeout: 180000 })
  master = await new sql.ConnectionPool(connection('master')).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test',
    JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  for (const key of ['AD_HOST', 'AD_ENABLED', 'AD_BASE_DN', 'AD_UPN_SUFFIX', 'AD_BIND_DN', 'AD_BIND_PASSWORD',
    'SMTP_HOST', 'SMTP_FROM', 'SMTP_USER', 'SMTP_PASSWORD']) delete process.env[key]

  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule,
    { logger: false, abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => {}
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => {}
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assertDisposable()
  baseUrl = `http://127.0.0.1:${app.getHttpServer().address().port}/api`

  ;({ MailSendError } = require('../src/auth/mail.service'))
  ;({ OTP } = require('../src/auth/two-factor.service'))
  twoFactorService = app.get(require('../src/auth/two-factor.service').TwoFactorService)
  const directoryService = app.get(require('../src/auth/directory.service').DirectoryService)
  const mailService = app.get(require('../src/auth/mail.service').MailService)
  directoryService.client = () => { throw new Error('الاختبار حاول يفتح اتصال LDAP حقيقي') }
  mailService.transporter = () => { throw new Error('الاختبار حاول يفتح اتصال SMTP حقيقي') }
  mailService.isConfigured = () => true
  mailService.send = async (message) => {
    mailbox.push({ ...message, at: new Date() })
    return { accepted: [message.to], rejected: [], messageId: '<fake@test>', response: '250 2.0.0 OK fake' }
  }

  adminPassword = pass()
  adminUser = await repo('User').save({ email: 'admin@race2fa.invalid', displayName: 'مدير النظام',
    passwordHash: await bcryptjs.hash(adminPassword, 10), role: 'super_admin', branchId: null, permissions: JSON.stringify([]) })
  await ds.query('UPDATE dbo.requests_config SET [value] = @1 WHERE [key] = @0', [TWO_FACTOR_KEY, 'true'])
}, { timeout: 300000 })

after(async (t) => {
  const errors = []
  try { if (app) await app.close() } catch (e) { errors.push(e) }
  try {
    if (created && master) {
      assert.match(database, /^hr_2fa_race_test_[a-f0-9]{16}$/)
      assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (e) { errors.push(e) }
  try { if (master) await master.close() } catch (e) { errors.push(e) }
  try { fs.rmSync(uploads, { recursive: true, force: true }) } catch (e) { errors.push(e) }
  if (errors.length) throw new AggregateError(errors, '2FA race fixture cleanup failed')
})

// ============================================================================
// R1) فشل قراءة المفتاح من القاعدة نفسها = رفض، بلا جلسة
// ============================================================================

test('R1 — جدول الإعدادات مش موجود لحظيًّا: الدخول مرفوض 503 بلا جلسة ولا بريد ولا حالة معلَّقة', async () => {
  const [{ n: challengesBefore }] = await ds.query('SELECT COUNT(*) n FROM dbo.login_challenges')
  mailbox.length = 0
  // فشل قراءة حقيقي على مستوى القاعدة: الاستعلام نفسه بيرمي «Invalid object name»
  await ds.query("EXEC sp_rename 'dbo.requests_config', 'requests_config_hidden'")
  let refused
  try {
    refused = await login()
    // ومسار حساب الشركة بيمر على نفس الدالة — بيُرفض قبل أي جلسة كذلك
    const [{ n: during }] = await ds.query('SELECT COUNT(*) n FROM dbo.login_challenges')
    assert.equal(during, challengesBefore, 'ممنوع حالة معلَّقة تتعمل وقراءة الإعداد فاشلة')
  } finally {
    await ds.query("EXEC sp_rename 'dbo.requests_config_hidden', 'requests_config'")
  }
  assert.equal(refused.status, 503, JSON.stringify(refused.body))
  assert.equal(refused.body.accessToken, undefined, 'ممنوع أي توكن جلسة')
  assert.equal(refused.body.challengeToken, undefined)
  assert.ok(isArabic(msg(refused)), msg(refused))
  assert.match(msg(refused), /إعداد التحقق بخطوتين/)
  assert.equal(mailbox.length, 0, 'مفيش بريد اتبعت')
  // ومفيش تسجيل «آخر دخول» لحساب ما دخلش
  const [row] = await ds.query('SELECT lastLoginAt FROM dbo.users WHERE id = @0', [adminUser.id])
  assert.equal(row.lastLoginAt, null)
  // وبعد ما القراءة ترجع: الدخول بيشتغل عادي (الرفض كان بسبب القراءة بس)
  const pending = expect(await login(), 201, 'after restore:')
  assert.equal(pending.twoFactor, true)
})

// ============================================================================
// R2/R3) عدّ المحاولات المتوازية على SQL حقيقي
// ============================================================================

test('R2 — 12 تحقق متوازي برمز غلط على القاعدة: العدّاد 5 بالظبط، القفل مكتوب، والرمز الصح مرفوض', async t => {
  const { token, code } = await openChallenge()
  const wrong = wrongCodeFor(code)
  const restore = releaseTogether(12)
  let results
  try {
    results = await Promise.allSettled(Array.from({ length: 12 }, () => twoFactorService.verify(token, wrong)))
  } finally { restore() }
  const row = await challengeRow(token)
  t.diagnostic(JSON.stringify({ rejected: results.filter((r) => r.status === 'rejected').length,
    attempts: row.attempts, locked: !!row.lockedAt, consumed: !!row.consumedAt }))
  assert.equal(results.filter((r) => r.status === 'rejected').length, 12, 'كل الاستدعاءات لازم تُرفض')
  assert.equal(row.attempts, OTP.maxAttempts, 'العدّاد لازم يوصل الحد المعلن بالظبط — مفيش محاولة ضايعة')
  assert.ok(row.lockedAt, 'الحالة لازم تتقفل')
  assert.equal(row.consumedAt, null)
  // القفل حقيقي: الرمز الصح بعده مايفتحش جلسة
  const afterLock = await verifyHttp(token, code)
  assert.equal(afterLock.status, 401)
  assert.equal(afterLock.body.accessToken, undefined)
  assert.match(msg(afterLock), /اتقفل|المحاولات/)
})

test('R3 — ونفس الشيء عبر HTTP: 12 طلب تحقق في نفس اللحظة بيقفلوا الحالة عند الحد', async t => {
  const { token, code } = await openChallenge()
  const wrong = wrongCodeFor(code)
  const restore = releaseTogether(12)
  let responses
  try {
    responses = await Promise.all(Array.from({ length: 12 }, () => verifyHttp(token, wrong)))
  } finally { restore() }
  const row = await challengeRow(token)
  t.diagnostic(JSON.stringify({ statuses: responses.map((r) => r.status), attempts: row.attempts, locked: !!row.lockedAt }))
  for (const response of responses) {
    assert.equal(response.status, 401, JSON.stringify(response.body))
    assert.equal(response.body.accessToken, undefined)
  }
  assert.equal(row.attempts, OTP.maxAttempts)
  assert.ok(row.lockedAt)
})

test('R4 — الحد المعلن نفسه: 4 غلط متوازية مابتقفلش، والخامسة هي اللي تقفل', async () => {
  const { token, code } = await openChallenge()
  const wrong = wrongCodeFor(code)
  const restore = releaseTogether(OTP.maxAttempts - 1)
  try {
    await Promise.allSettled(Array.from({ length: OTP.maxAttempts - 1 }, () => twoFactorService.verify(token, wrong)))
  } finally { restore() }
  const before = await challengeRow(token)
  assert.equal(before.attempts, OTP.maxAttempts - 1)
  assert.equal(before.lockedAt, null, 'ممنوع القفل قبل استنفاد الحد')
  // والرمز الصح لسه شغّال على المحاولة الأخيرة (نفس سلوك النهاردة)
  const session = expect(await verifyHttp(token, code), 200, 'last chance:')
  assert.ok(session.accessToken)
})

// ============================================================================
// R5) إعادة إرسال وسط تحقق جارٍ
// ============================================================================

test('R5 — إعادة إرسال وسط تحقق جارٍ: الرمز القديم مرفوض، الحالة مش مستهلكة، والجديد شغّال', async t => {
  const { token, code: oldCode } = await openChallenge()
  // المهلة عدّت على القاعدة نفسها
  await ds.query('UPDATE dbo.login_challenges SET [lastSentAt] = DATEADD(second, -120, [lastSentAt]) WHERE [token] = @0', [token])
  const oldHash = (await challengeRow(token)).codeHash
  const hold = holdFirstCompare()
  let outcome
  try {
    const inFlight = verifyHttp(token, oldCode)
    await hold.arrived
    expect(await http('POST', '/auth/login/resend', { challengeToken: token }), 200, 'resend:')
    const newCode = lastCode()
    assert.notEqual(newCode, oldCode)
    const replaced = await challengeRow(token)
    assert.notEqual(replaced.codeHash, oldHash, 'إعادة الإرسال لازم تبدّل الـhash')
    // ليه الشرط القديم ما كانش كافيًا — مقيس على SQL نفسه، بلا لمس أي صف:
    // شرط الاستهلاك القديم (id + consumedAt + lockedAt) لسه بيطابق الصف بعد استبدال الرمز،
    // والشرط الجديد (بإضافة الـhash اللي قورن) مابيطابقهوش. وده كمان بيثبت إن المقارنة على
    // الـcollation بتفرّق بين الـhash القديم والجديد فعلًا.
    const [oldGuard] = await ds.query(
      'SELECT COUNT(*) n FROM dbo.login_challenges WHERE id = @0 AND consumedAt IS NULL AND lockedAt IS NULL',
      [replaced.id]
    )
    const [newGuard] = await ds.query(
      'SELECT COUNT(*) n FROM dbo.login_challenges WHERE id = @0 AND codeHash = @1 AND consumedAt IS NULL AND lockedAt IS NULL',
      [replaced.id, oldHash]
    )
    t.diagnostic(JSON.stringify({ oldConsumeGuardMatches: oldGuard.n, newConsumeGuardMatches: newGuard.n }))
    assert.equal(oldGuard.n, 1, 'الشرط القديم كان لسه بيطابق الصف — ده سبب قبول الرمز المستبدل')
    assert.equal(newGuard.n, 0, 'الشرط الجديد لازم يرفض الـhash اللي اتبدّل')
    hold.release()
    outcome = await inFlight
    t.diagnostic(JSON.stringify({ oldCodeStatus: outcome.status }))
    assert.equal(outcome.status, 401, 'الرمز القديم ممنوع يُقبل بعد إعادة الإرسال')
    assert.equal(outcome.body.accessToken, undefined)
    assert.ok(isArabic(msg(outcome)), msg(outcome))
    const row = await challengeRow(token)
    assert.equal(row.consumedAt, null, 'الحالة لازم تفضل صالحة للرمز الجديد')
    assert.equal(row.attempts, 0, 'رمز مستبدل مش محاولة تخمين')
    // والرمز الجديد بيفتح الجلسة عادي
    const session = expect(await verifyHttp(token, newCode), 200, 'new code:')
    assert.ok(session.accessToken)
  } finally { hold.restore() }
})

// ============================================================================
// R6) رمز صح متوازي — جلسة واحدة
// ============================================================================

test('R6 — 6 تحققات متوازية بالرمز الصح: جلسة واحدة بالظبط والباقي 401', async t => {
  const { token, code } = await openChallenge()
  const restore = releaseTogether(6)
  let responses
  try {
    responses = await Promise.all(Array.from({ length: 6 }, () => verifyHttp(token, code)))
  } finally { restore() }
  const sessions = responses.filter((r) => r.status === 200)
  t.diagnostic(JSON.stringify({ statuses: responses.map((r) => r.status) }))
  assert.equal(sessions.length, 1, 'استهلاك مرة واحدة بس')
  assert.ok(sessions[0].body.accessToken)
  for (const rejected of responses.filter((r) => r.status !== 200)) {
    assert.equal(rejected.status, 401)
    assert.equal(rejected.body.accessToken, undefined)
  }
  const row = await challengeRow(token)
  assert.ok(row.consumedAt)
})

// ============================================================================
// R7) إعادة إرسال متوازية — الحد المعلن مايتخطاش (نفس أسلوب إثبات عدّ المحاولات)
// ============================================================================

test('R7 — 8 إعادات إرسال في نفس اللحظة: رسالة واحدة بالظبط، والعدّاد مش بيضيع، وإجمالي الرسايل = الحد المعلن', async t => {
  const { token } = await openChallenge()
  const sentOnLogin = mailbox.length
  // المهلة عدّت على القاعدة نفسها (مفيش انتظار حقيقي)
  const cooldownPassed = () => ds.query(
    'UPDATE dbo.login_challenges SET [lastSentAt] = DATEADD(second, -120, [lastSentAt]) WHERE [token] = @0', [token])
  const resendOnce = () => http('POST', '/auth/login/resend', { challengeToken: token })
  /** ثمانية طلبات بيقروا الصف كلهم قبل ما أي واحد يكتب — وقتها بس واحد يكسب الخانة */
  const burst = async (size) => {
    await cooldownPassed()
    const before = mailbox.length
    const waited = Math.floor((Date.now() - new Date((await challengeRow(token)).lastSentAt).getTime()) / 1000)
    const restore = releaseHashesTogether(size)
    let responses
    try { responses = await Promise.all(Array.from({ length: size }, resendOnce)) } finally { restore() }
    const row = await challengeRow(token)
    return { responses, waited, messages: [...new Set(responses.filter(r => r.status !== 200).map(msg))],
      mails: mailbox.length - before, resendCount: row.resendCount, locked: !!row.lockedAt, consumed: !!row.consumedAt }
  }

  const first = await burst(8)
  t.diagnostic(JSON.stringify({ statuses: first.responses.map(r => r.status), mails: first.mails,
    resendCount: first.resendCount, waitedSeconds: first.waited, messages: first.messages }))
  assert.equal(first.mails, 1, 'ثمانية طلبات في نفس اللحظة = رسالة واحدة بالظبط (الخانة تُحجز قبل الإرسال)')
  assert.equal(first.resendCount, 1, 'العدّاد لازم يطابق عدد الرسايل — مفيش زيادة ضايعة')
  assert.equal(first.responses.filter(r => r.status === 200).length, 1, 'واحد بس بينجح')
  for (const refused of first.responses.filter(r => r.status !== 200)) {
    assert.equal(refused.status, 429, JSON.stringify(refused.body))
    assert.ok(isArabic(msg(refused)), msg(refused))
    assert.equal(refused.body.accessToken, undefined)
  }
  assert.equal(first.locked, false, 'ضغط إعادة الإرسال ممنوع يقفل طلب الدخول')
  assert.equal(first.consumed, false)

  // ونفس الشيء لكل خانة لحد الحد المعلن: كل دفعة رسالة واحدة وعدّاد واحد
  for (let claimed = 2; claimed <= OTP.maxResends; claimed++) {
    const next = await burst(8)
    assert.equal(next.mails, 1, `الدفعة ${claimed}: رسالة واحدة بالظبط`)
    assert.equal(next.resendCount, claimed, `الدفعة ${claimed}: العدّاد بيوصل ${claimed} بالظبط`)
  }
  assert.equal(mailbox.length - sentOnLogin, OTP.maxResends, 'إجمالي رسايل إعادة الإرسال = الحد المعلن بالظبط، مهما كان التوازي')

  // وبعد استنفاد الحد: ولا رسالة واحدة تانية حتى لو المهلة عدّت و8 طلبات جوا معًا
  await cooldownPassed()
  const overLimit = await Promise.all(Array.from({ length: 8 }, resendOnce))
  const afterLimit = await challengeRow(token)
  t.diagnostic(JSON.stringify({ statuses: overLimit.map(r => r.status), resendCount: afterLimit.resendCount, mails: mailbox.length - sentOnLogin }))
  for (const refused of overLimit) {
    assert.equal(refused.status, 429, JSON.stringify(refused.body))
    assert.match(msg(refused), /أقصى عدد/)
  }
  assert.equal(mailbox.length - sentOnLogin, OTP.maxResends, 'الحد المعلن هو سقف الرسايل — مفيش رسالة بعده')
  assert.equal(afterLimit.resendCount, OTP.maxResends)
  // وآخر رمز اتبعت لسه شغّال: الحجز قبل الإرسال ما خلاش حالة معلَّقة نصف مكتوبة
  const session = expect(await verifyHttp(token, lastCode()), 200, 'last resent code:')
  assert.ok(session.accessToken)
})
