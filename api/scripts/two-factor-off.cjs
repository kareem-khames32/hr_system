'use strict'
// ===== مفتاح الطوارئ: قفل/فتح التحقق بخطوتين من ترمينال الخادم بلا ما التطبيع يشتغل =====
// السبب: التحقق بخطوتين لكل الحسابات + خادم بريد واقع = الشركة كلها، والمالك نفسه، مقفولين برّه النظام.
// السكربت ده بيكتب مفتاح واحد في requests_config مباشرة على القاعدة، فمابيحتاجش API ولا جلسة ولا كلمة مرور،
// وبيسري على أول محاولة دخول بعده فورًا (المفتاح بيتقرا من القاعدة كل دخول بلا كاش).
//
// الاستخدام (من فولدر api):
//   node scripts/two-factor-off.cjs              ← اقفل التحقق بخطوتين (الدخول يرجع بريد + كلمة مرور بس)
//   node scripts/two-factor-off.cjs --status     ← اعرض الحالة بس (قراءة، مابيغيّرش حاجة)
//   node scripts/two-factor-off.cjs --on         ← افتحه تاني (بيحذّر لو SMTP_HOST مش مضبوط في .env)
//
// مابيطبعش ولا بيحفظ أي كلمة مرور، ولا بيلمس أي حساب ولا أي صف تاني.
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true })
const sql = require('mssql')

const KEY = 'auth.two_factor_enabled'
const args = process.argv.slice(2)
const wantStatus = args.includes('--status')
const wantOn = args.includes('--on')
const unknown = args.filter((a) => !['--status', '--on'].includes(a))

;(async () => {
  if (unknown.length) {
    console.log(`وسيط غير معروف: ${unknown.join(' ')}`)
    console.log('الاستخدام: node scripts/two-factor-off.cjs [--status | --on]')
    process.exit(1)
  }
  const database = process.env.DB_DATABASE || 'hr_system'
  const pool = await sql.connect({
    server: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 1433),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database,
    options: { encrypt: false, trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false' },
  })
  const read = async () => {
    const found = await pool.request().input('key', sql.NVarChar, KEY)
      .query('SELECT [value] FROM dbo.requests_config WHERE [key] = @key')
    return found.recordset.length ? String(found.recordset[0].value ?? '').trim() : null
  }
  const current = await read()
  const isOn = (current ?? '').toLowerCase() === 'true'
  const openPending = async () => {
    // الجدول ممكن ما يكونش اتعمل لسه (الترحيل 066 ما اتطبقش) — مش خطأ
    try {
      const rows = await pool.request().query(
        'SELECT COUNT(*) n FROM dbo.login_challenges WHERE [consumedAt] IS NULL AND [lockedAt] IS NULL AND [expiresAt] > SYSUTCDATETIME()'
      )
      return Number(rows.recordset[0].n)
    } catch {
      return null
    }
  }

  console.log(`القاعدة: ${database}`)
  console.log(`المفتاح ${KEY}: ${current === null ? 'غير موجود (= مقفول)' : current}`)
  console.log(`التحقق بخطوتين: ${isOn ? 'مفتوح ✅' : 'مقفول'}`)
  const pending = await openPending()
  if (pending !== null) console.log(`حالات دخول معلَّقة سارية الآن: ${pending}`)
  else console.log('جدول login_challenges مش موجود (ترحيل 066 ما اتطبقش) — التحقق بخطوتين مايشتغلش أصلًا')

  if (wantStatus) {
    console.log('(--status: قراءة بس — مفيش أي تغيير)')
    await pool.close()
    return
  }

  const target = wantOn ? 'true' : 'false'
  if (wantOn && !String(process.env.SMTP_HOST || '').trim()) {
    console.log('')
    console.log('⛔ SMTP_HOST مش مضبوط في api/.env — لو فتحته كده محدش هيقدر يدخل (مفيش رمز بيتبعت).')
    console.log('   اضبط البريد الأول وافحصه: node scripts/mail-selftest.cjs <عنوان>')
    await pool.close()
    process.exit(1)
  }
  if (current === target) {
    console.log('')
    console.log(`مفيش تغيير — المفتاح أصلًا ${target}`)
    await pool.close()
    return
  }

  if (current === null) {
    await pool.request().input('key', sql.NVarChar, KEY).input('value', sql.NVarChar, target)
      .query('INSERT INTO dbo.requests_config ([key], [value]) VALUES (@key, @value)')
  } else {
    await pool.request().input('key', sql.NVarChar, KEY).input('value', sql.NVarChar, target)
      .query('UPDATE dbo.requests_config SET [value] = @value WHERE [key] = @key')
  }
  // الحالات المعلَّقة المفتوحة بتتقفل: محدش يفضل واقف في نص الخطوة التانية بعد التغيير
  try {
    await pool.request().query(
      'UPDATE dbo.login_challenges SET [consumedAt] = SYSUTCDATETIME() WHERE [consumedAt] IS NULL AND [lockedAt] IS NULL'
    )
  } catch {
    /* الجدول مش موجود — مفيش حالات معلَّقة أصلًا */
  }
  const after = await read()
  console.log('')
  console.log(`تم: ${KEY} = ${after}`)
  console.log(
    target === 'false'
      ? 'التحقق بخطوتين مقفول دلوقتي — الدخول بالبريد وكلمة المرور (والدخول بحساب الشركة) بيفتح جلسة على طول، من غير إعادة تشغيل.'
      : 'التحقق بخطوتين مفتوح دلوقتي — كل دخول هيطلب رمز على البريد. لو البريد وقع: node scripts/two-factor-off.cjs'
  )
  await pool.close()
})().catch((e) => {
  const secret = process.env.DB_PASSWORD
  let message = String(e.message || e).replace(/password=[^;]*/gi, 'password=***')
  if (secret && secret.length >= 3) message = message.split(secret).join('***')
  console.log('حصل خطأ:', message)
  process.exit(1)
})
