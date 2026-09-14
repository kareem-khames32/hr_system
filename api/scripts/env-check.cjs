'use strict'
// فحص بيئة التشغيل على قاعدة الشركة — لا يطبع أي قيمة سرية أبدًا (أطوال ومقارنات فقط).
// التشغيل: node api/scripts/env-check.cjs [--launch]
//   --launch  يشغّل Chrome عبر puppeteer ويولّد PDF تجريبيًا في الذاكرة للتأكد من الإقلاع فعليًا.
const fs = require('node:fs')
const os = require('node:os')
const net = require('node:net')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(apiRoot, '..')
const dotenv = require('../node_modules/dotenv')

const read = file => (fs.existsSync(file) ? dotenv.parse(fs.readFileSync(file)) : null)
const env = read(path.join(apiRoot, '.env'))
const example = read(path.join(apiRoot, '.env.example'))
const results = []
const check = (ok, label, detail = '') => results.push({ ok: !!ok, label, detail })
const note = (label, detail = '') => results.push({ ok: true, note: true, label, detail })

if (!env) {
  console.error('FAIL api/.env غير موجود')
  process.exit(1)
}

// 1) المزامنة التلقائية مقفولة
check(env.DB_SYNCHRONIZE === 'false', 'DB_SYNCHRONIZE=false', env.DB_SYNCHRONIZE === 'false' ? '' : 'القيمة الحالية ليست false')

// 2) سر JWT: موجود وطويل ومختلف عن المثال وعن نسخة ما قبل التدوير (دون طباعة)
const secret = env.JWT_SECRET || ''
check(secret.length >= 64, 'JWT_SECRET طويل', `الطول ${secret.length} حرفًا`)
check(/^[a-f0-9]{96}$/.test(secret), 'JWT_SECRET بصيغة 48 بايت hex عشوائية')
check(!!example && secret !== example.JWT_SECRET, 'JWT_SECRET مختلف عن قيمة api/.env.example')
const backupEnv = read('D:/projects/hr_system_backups/pre-payroll-2026-09-14/api.env.backup')
if (backupEnv) check(secret !== backupEnv.JWT_SECRET, 'JWT_SECRET مختلف عن السر المحفوظ في نسخة ما قبل الرواتب (تم التدوير)')
let deviceKeyWeakness = null, DEVICE_KEY_PLACEHOLDER = null, DEVICE_KEY_MIN_LENGTH = 24
try {
  require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
  const { validateEnv, isKnownPlaceholderSecret } = require('../src/auth/jwt-secret')
  ;({ deviceKeyWeakness, DEVICE_KEY_PLACEHOLDER, DEVICE_KEY_MIN_LENGTH } = require('../src/attendance/device-key'))
  check(!isKnownPlaceholderSecret(secret), 'JWT_SECRET ليس قيمة منشورة/قالبًا معروفًا')
  validateEnv({ ...env, NODE_ENV: env.NODE_ENV || 'development' })
  check(true, 'validateEnv يقبل api/.env الحالي (حارس الإقلاع)')
} catch (error) {
  // الرسالة من الحارس نفسه ولا تحتوي قيمة السر
  check(false, 'validateEnv يقبل api/.env الحالي (حارس الإقلاع)', String(error.message).slice(0, 200))
}

// 3) المنطقة الزمنية
let tzOk = false
try { tzOk = !!env.TZ && new Intl.DateTimeFormat('en-US', { timeZone: env.TZ }).resolvedOptions().timeZone === env.TZ } catch { tzOk = false }
check(tzOk, 'TZ منطقة IANA صالحة', env.TZ || 'غير مضبوط')

// 4) مجلد الملفات المرفوعة مطلق وموجود ولا يضيع أي ملف مخزن
const uploads = env.UPLOADS_ROOT || ''
const uploadsAbs = !!uploads && path.isAbsolute(uploads)
const uploadsDir = uploadsAbs && fs.existsSync(uploads) && fs.statSync(uploads).isDirectory()
let fileCount = 0
function walk(dir) { for (const item of fs.readdirSync(dir, { withFileTypes: true })) item.isDirectory() ? walk(path.join(dir, item.name)) : fileCount++ }
if (uploadsDir) walk(uploads)
check(uploadsAbs && uploadsDir, 'UPLOADS_ROOT مسار مطلق لمجلد موجود', `${uploads || 'غير مضبوط'} — ${fileCount} ملف`)
const legacyUploads = path.join(apiRoot, 'uploads')
if (uploadsDir && fs.existsSync(legacyUploads)) {
  check(path.resolve(uploads).toLowerCase() === path.resolve(legacyUploads).toLowerCase(), 'UPLOADS_ROOT يشير لنفس مجلد api/uploads القائم (لا ملفات مفقودة)')
}

// 5) Chrome الخاص بـpuppeteer موجود على الجهاز
let chrome = env.PUPPETEER_EXECUTABLE_PATH || ''
if (!chrome) { try { chrome = require('../node_modules/puppeteer').executablePath() } catch { chrome = '' } }
check(!!chrome && fs.existsSync(chrome) && fs.statSync(chrome).isFile(), 'مسار Chrome لـpuppeteer موجود', chrome || 'غير معروف')
if (chrome && path.resolve(chrome).toLowerCase().startsWith(path.resolve(os.homedir()).toLowerCase())) {
  note('مسار Chrome داخل ملف المستخدم الحالي', `يعمل فقط لو شغّل ${os.userInfo().username} الـAPI؛ لمستخدم آخر اضبط PUPPETEER_EXECUTABLE_PATH على مسار له`)
}

// 6) ربط الـAPI محليًا
check(['127.0.0.1', '::1', 'localhost'].includes(env.API_HOST || '127.0.0.1'), 'API_HOST محلي', env.API_HOST || '127.0.0.1 (افتراضي)')

// 7) .env.example يعكس المفاتيح غير السرية
if (example) {
  check(example.DB_SYNCHRONIZE === 'false', '.env.example: DB_SYNCHRONIZE=false')
  for (const key of ['TZ', 'UPLOADS_ROOT', 'API_HOST']) check(key in example, `.env.example يحتوي ${key}`)
} else check(false, 'api/.env.example موجود')

// 8) خادم الويب للتطوير مربوط محليًا (السكربت + لا يستجيب على عناوين الشبكة)
let devScript = ''
try { devScript = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')).scripts?.dev || '' } catch { devScript = '' }
check(/(?:^|\s)(?:-H|--hostname)\s+(?:127\.0\.0\.1|localhost|::1)(?:\s|$)/.test(devScript), 'سكربت الويب npm run dev مربوط على 127.0.0.1', devScript || 'غير موجود')

const probe = (host, port) => new Promise(resolve => {
  const socket = net.createConnection({ host, port })
  const done = value => { socket.destroy(); resolve(value) }
  socket.setTimeout(1500, () => done(false))
  socket.once('connect', () => done(true))
  socket.once('error', () => done(false))
})
async function exposure() {
  const lanAddresses = Object.values(os.networkInterfaces()).flat().filter(a => a && !a.internal && a.family === 'IPv4').map(a => a.address)
  for (const [port, label] of [[Number(env.PORT || 4000), 'الـAPI'], [3000, 'خادم الويب']]) {
    const local = await probe('127.0.0.1', port)
    if (!local) { note(`${label} لا يعمل الآن على ${port}`, 'فحص التعرض للشبكة مؤجل لحين تشغيله'); continue }
    const exposed = []
    for (const address of lanAddresses) if (await probe(address, port)) exposed.push(address)
    check(!exposed.length, `${label} (${port}) لا يستجيب على عناوين الشبكة`, exposed.length ? `يستجيب على ${exposed.join(', ')}` : `${lanAddresses.length} عنوان شبكة مفحوص`)
  }
}

// 9) مفتاح جهاز البصمة في قاعدة الشركة: ≥24 حرفًا وليس القيمة المنشورة (مقارنة داخل SQL — القيمة لا تُقرأ للعميل)
async function deviceKey() {
  let pool
  try {
    const mssql = require('../node_modules/mssql')
    pool = await new mssql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME || 'sa',
      password: env.DB_PASSWORD, database: env.DB_DATABASE || 'hr_system', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 8000 }).connect()
    const rows = (await pool.request().input('placeholder', DEVICE_KEY_PLACEHOLDER || 'zk-device-key-change-me').query(`SELECT LEN(LTRIM(RTRIM([value]))) AS len,
      CASE WHEN LTRIM(RTRIM([value])) = @placeholder THEN 1 ELSE 0 END AS isPlaceholder FROM dbo.requests_config WHERE [key] = N'attendance.device_key'`)).recordset
    if (!rows.length) { check(false, 'مفتاح جهاز البصمة مضبوط في القاعدة', 'المفتاح غير موجود في requests_config'); return }
    const { len, isPlaceholder } = rows[0]
    check(!isPlaceholder, 'مفتاح جهاز البصمة ليس القيمة المنشورة في الريبو', isPlaceholder ? 'ما زال القيمة المبذورة القديمة' : '')
    check(Number(len) >= DEVICE_KEY_MIN_LENGTH, `مفتاح جهاز البصمة ≥${DEVICE_KEY_MIN_LENGTH} حرفًا`, `الطول ${len}`)
  } catch (error) {
    check(false, 'مفتاح جهاز البصمة في القاعدة', `تعذر الفحص: ${String(error.message).split(env.DB_PASSWORD || '\u0000').join('***').slice(0, 160)}`)
  } finally { if (pool) await pool.close() }
}

async function launch() {
  if (!process.argv.includes('--launch')) return
  try {
    const puppeteer = require('../node_modules/puppeteer')
    const browser = await puppeteer.launch({ headless: true, ...(env.PUPPETEER_EXECUTABLE_PATH ? { executablePath: env.PUPPETEER_EXECUTABLE_PATH } : {}) })
    try {
      const page = await browser.newPage()
      await page.setContent('<html dir="rtl"><body><h1>اختبار</h1></body></html>')
      const pdf = await page.pdf({ format: 'A4' })
      check(pdf.length > 500 && Buffer.from(pdf).subarray(0, 4).toString() === '%PDF', 'puppeteer يشغّل Chrome ويولّد PDF', `${pdf.length} بايت، ${await browser.version()}`)
    } finally { await browser.close() }
  } catch (error) {
    check(false, 'puppeteer يشغّل Chrome ويولّد PDF', String(error.message).slice(0, 200))
  }
}

;(async () => {
  await deviceKey()
  await exposure()
  await launch()
  for (const r of results) console.log(`${r.note ? 'NOTE' : r.ok ? 'OK  ' : 'FAIL'} ${r.label}${r.detail ? ' — ' + r.detail : ''}`)
  const checks = results.filter(r => !r.note)
  const failed = checks.filter(r => !r.ok).length
  console.log(failed ? `${failed} فحص فشل من ${checks.length}` : `كل الفحوص نجحت (${checks.length})`)
  process.exitCode = failed ? 1 : 0
})()
