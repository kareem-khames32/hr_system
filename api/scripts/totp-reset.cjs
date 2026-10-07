'use strict'
// ===== مفتاح الطوارئ: إعادة ضبط تطبيق المصادقة (TOTP) لحساب من ترمينال الخادم بلا ما التطبيق يشتغل =====
// السبب: مدير النظام موبايله ضاع ومفيش مدير نظام تاني يعيد له الضبط من الشاشة = مقفول برّه النظام.
// السكربت ده بيمسح صف الحساب من user_totp مباشرة على القاعدة: دخوله الجاي بكلمة السر (ورمز البريد لو مفتوح)، ولو دوره إلزامي
// بيفعّل تطبيق المصادقة من جديد أول ما يدخل.
//
// الاستخدام (من فولدر api):
//   node scripts/totp-reset.cjs someone@company.com            ← امسح سر تطبيق المصادقة للحساب ده
//   node scripts/totp-reset.cjs someone@company.com --status   ← اعرض حالته بس (قراءة، مابيغيّرش حاجة)
//
// مابيطبعش ولا بيحفظ أي سر ولا كلمة مرور، ولا بيلمس أي حساب تاني ولا أي جدول تاني.
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true })
const sql = require('mssql')

const args = process.argv.slice(2)
const wantStatus = args.includes('--status')
const emails = args.filter((a) => !a.startsWith('--'))
const unknown = args.filter((a) => a.startsWith('--') && a !== '--status')

;(async () => {
  if (unknown.length || emails.length !== 1 || !emails[0].includes('@')) {
    console.log('الاستخدام: node scripts/totp-reset.cjs <بريد الحساب> [--status]')
    process.exit(1)
  }
  const email = emails[0].trim().toLowerCase()
  const database = process.env.DB_DATABASE || 'hr_system'
  const pool = await sql.connect({
    server: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 1433),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database,
    options: { encrypt: false, trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false' },
  })
  try {
    console.log(`القاعدة: ${database}`)
    const table = await pool.request().query("SELECT OBJECT_ID(N'dbo.user_totp', N'U') AS id")
    if (table.recordset[0].id === null) {
      console.log('جدول user_totp مش موجود (ترحيل 20261007_102 مااتطبقش) — مفيش تطبيق مصادقة على أي حساب.')
      return
    }
    const users = await pool.request().input('email', sql.NVarChar, email).query('SELECT [id], [role], [isActive] FROM dbo.users WHERE [email] = @email')
    if (users.recordset.length !== 1) {
      console.log(`مفيش حساب واحد بالبريد ${email} (لقيت ${users.recordset.length}).`)
      process.exitCode = 1
      return
    }
    const user = users.recordset[0]
    const rows = await pool.request().input('userId', sql.Int, user.id).query('SELECT [confirmedAt], [lockedUntil] FROM dbo.user_totp WHERE [userId] = @userId')
    const state = rows.recordset.length === 0 ? 'مش مفعّل' : rows.recordset[0].confirmedAt ? 'مفعّل' : 'تفعيل لسه مااتأكدش'
    console.log(`الحساب ${email} (الدور ${user.role}${user.isActive ? '' : '، معطّل'}): تطبيق المصادقة ${state}`)
    if (wantStatus || rows.recordset.length === 0) return
    const removed = await pool.request().input('userId', sql.Int, user.id).query('DELETE FROM dbo.user_totp WHERE [userId] = @userId')
    console.log(`اتمسح (${removed.rowsAffected[0]} صف). الدخول الجاي من غير رمز التطبيق؛ ولو الدور إلزامي هيفعّل من جديد.`)
  } finally {
    await pool.close()
  }
})().catch((error) => {
  console.error('تعذّر التنفيذ:', error && error.message)
  process.exit(1)
})
