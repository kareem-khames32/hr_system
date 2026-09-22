'use strict'
// ===== الفحص الذاتي لخادم البريد قبل فتح التحقق بخطوتين =====
// بيبعت رمزًا تجريبيًّا لعنوان واحد ويطبع بالحرف اللي خادم البريد قاله. بلا قاعدة بيانات وبلا API.
// السبب: التحقق بخطوتين لكل الحسابات؛ فتحه وخادم البريد مش شغّال = قفل الشركة كلها برّه النظام.
//
// الاستخدام (من فولدر api):
//   node scripts/mail-selftest.cjs kareem@maharahsa.com        ← تحقق من الإعداد + إرسال رسالة فحص
//   node scripts/mail-selftest.cjs --status                    ← اعرض إعداد SMTP بس (بلا إرسال)
//
// الإعداد كله من api/.env، وكلمة مرور البريد (SMTP_PASSWORD) مابتتطبعش ولا بتظهر في أي رسالة خطأ.
const path = require('path')
const apiRoot = path.resolve(__dirname, '..')
require('dotenv').config({ path: path.join(apiRoot, '.env'), quiet: true })
require(path.join(apiRoot, 'node_modules', 'ts-node')).register({
  project: path.join(apiRoot, 'tsconfig.json'),
  transpileOnly: true,
})
// نفس قارئ الإعداد اللي الخادم نفسه بيستخدمه — مصدر واحد للحقيقة
const { readMailConfig, mailConfigGaps, maskEmail } = require(path.join(apiRoot, 'src', 'auth', 'mail.service'))
const nodemailer = require('nodemailer')

const args = process.argv.slice(2)
const statusOnly = args.includes('--status')
const to = args.find((a) => !a.startsWith('--'))
const config = readMailConfig(process.env)
const gaps = mailConfigGaps(config)
const scrub = (value) => {
  let out = String(value ?? '')
  if (config.password && config.password.length >= 3) out = out.split(config.password).join('***')
  return out
}

;(async () => {
  console.log('===== إعداد البريد من api/.env =====')
  console.log(`SMTP_HOST                    : ${config.host || '(فاضي)'}`)
  console.log(`SMTP_PORT                    : ${config.port}`)
  console.log(`SMTP_SECURE (TLS من الأول)   : ${config.secure}`)
  console.log(`SMTP_REQUIRE_TLS (STARTTLS)  : ${config.requireTls}`)
  console.log(`SMTP_TLS_REJECT_UNAUTHORIZED : ${config.rejectUnauthorized}`)
  console.log(`SMTP_FROM                    : ${config.from || '(فاضي)'}`)
  console.log(`SMTP_USER                    : ${config.user || '(بلا مصادقة)'}`)
  console.log(`SMTP_PASSWORD                : ${config.password ? '(مضبوطة — مش بتتطبع)' : '(فاضية)'}`)
  console.log(`المهلة                        : ${config.timeoutMs} مللي`)
  console.log('')
  if (gaps.length) {
    console.log(`⛔ الإعداد ناقص: ${gaps.join(', ')} — التحقق بخطوتين مش هيتفتح والدخول هيتوقف لو فُتح.`)
    process.exit(1)
  }
  if (statusOnly) {
    console.log('(--status: مفيش إرسال)')
    return
  }
  if (!to || !to.includes('@')) {
    console.log('اكتب عنوان بريد للفحص: node scripts/mail-selftest.cjs someone@example.com')
    process.exit(1)
  }

  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: config.requireTls,
    tls: { rejectUnauthorized: config.rejectUnauthorized, servername: config.host },
    connectionTimeout: config.timeoutMs,
    greetingTimeout: config.timeoutMs,
    socketTimeout: config.timeoutMs,
    ...(config.user ? { auth: { user: config.user, pass: config.password } } : {}),
  })

  console.log('===== (1) التحقق من الاتصال والمصادقة (verify) =====')
  try {
    await transport.verify()
    console.log('✅ الاتصال والمصادقة سليمين')
  } catch (error) {
    console.log('⛔ فشل: ' + scrub(error && error.message))
    if (error && error.code) console.log('   code     : ' + error.code)
    if (error && error.response) console.log('   response : ' + scrub(error.response))
    console.log('')
    console.log('التحقق بخطوتين ممنوع يتفتح في الحالة دي.')
    process.exit(1)
  }

  console.log('')
  console.log(`===== (2) إرسال رسالة فحص إلى ${maskEmail(to)} =====`)
  const code = String(Math.floor(100000 + Math.random() * 900000))
  try {
    const info = await transport.sendMail({
      from: config.from,
      to,
      subject: 'فحص إرسال رمز الدخول — نظام الموارد البشرية',
      text: `ده فحص إعداد البريد. رمز تجريبي: ${code}\n\nوصلت الرسالة دي يعني إعداد SMTP سليم وينفع تفتح التحقق بخطوتين.`,
    })
    console.log('accepted  : ' + JSON.stringify(info.accepted || []))
    console.log('rejected  : ' + JSON.stringify(info.rejected || []))
    console.log('messageId : ' + (info.messageId || '(بلا معرّف)'))
    console.log('response  : ' + scrub(info.response || '(بلا رد نصي)'))
    if (!info.accepted || info.accepted.length === 0) {
      console.log('')
      console.log('⛔ الخادم ما قبلش العنوان — التحقق بخطوتين ممنوع يتفتح.')
      process.exit(1)
    }
    console.log('')
    console.log('✅ الرسالة اتقبلت من خادم البريد. افتح الصندوق وتأكد إنها وصلت فعلًا (مش في السبام)،')
    console.log('   وبعدها بس افتح «التحقق بخطوتين» من: الإعدادات ← سياسات النظام ← الدخول والأمان.')
  } catch (error) {
    console.log('⛔ فشل الإرسال: ' + scrub(error && error.message))
    if (error && error.code) console.log('   code     : ' + error.code)
    if (error && error.response) console.log('   response : ' + scrub(error.response))
    console.log('')
    console.log('التحقق بخطوتين ممنوع يتفتح في الحالة دي.')
    process.exit(1)
  }
})().catch((error) => {
  console.log('حصل خطأ: ' + scrub(error && error.message))
  process.exit(1)
})
