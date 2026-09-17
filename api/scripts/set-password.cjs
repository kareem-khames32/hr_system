// تعيين كلمة مرور لمستخدم من الجهاز نفسه (للمالك): الكلمة بتتكتب مخفية في الترمينال ومش بتتطبع ولا بتتحفظ غير كـ hash.
// الاستخدام (من فولدر api):  node scripts/set-password.cjs admin@company.com
// بيفعّل الحساب ويلغي أي جلسات قديمة (tokenVersion + 1).
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true })
const sql = require('mssql')
const bcrypt = require('bcryptjs')

function askHidden(question) {
  return new Promise((resolve) => {
    const stdin = process.stdin
    process.stdout.write(question)
    let value = ''
    stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding('utf8')
    const onData = (ch) => {
      if (ch === '\r' || ch === '\n') {
        stdin.setRawMode(false); stdin.pause(); stdin.removeListener('data', onData)
        process.stdout.write('\n'); resolve(value)
      } else if (ch === '') {
        process.stdout.write('\n'); process.exit(1)
      } else if (ch === '' || ch === '') {
        value = value.slice(0, -1)
      } else {
        value += ch
      }
    }
    stdin.on('data', onData)
  })
}

;(async () => {
  const email = (process.argv[2] || '').trim().toLowerCase()
  if (!email) { console.log('اكتب الإيميل: node scripts/set-password.cjs admin@company.com'); process.exit(1) }
  if (!process.stdin.isTTY) { console.log('شغّله من ترمينال عادي عشان تكتب الباسورد مخفي'); process.exit(1) }
  const pool = await sql.connect({
    server: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 1433),
    user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE || 'hr_system',
    options: { encrypt: false, trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false' },
  })
  const found = await pool.request().input('email', email).query('SELECT id, role FROM users WHERE LOWER(email) = @email')
  if (!found.recordset.length) { console.log('مفيش مستخدم بالإيميل ده'); process.exit(1) }
  const first = await askHidden('الباسورد الجديد: ')
  if (first.length < 8) { console.log('الباسورد لازم 8 حروف على الأقل'); process.exit(1) }
  const second = await askHidden('اكتبه تاني: ')
  if (first !== second) { console.log('الباسوردين مش زي بعض'); process.exit(1) }
  const hash = await bcrypt.hash(first, 10)
  await pool.request().input('id', found.recordset[0].id).input('hash', hash)
    .query('UPDATE users SET passwordHash = @hash, isActive = 1, tokenVersion = tokenVersion + 1 WHERE id = @id')
  console.log(`تم: الحساب ${email} (${found.recordset[0].role}) بقى يدخل بالباسورد الجديد`)
  await pool.close()
})().catch((e) => { console.log('حصل خطأ:', String(e.message || e).replace(/password=[^;]*/gi, '')); process.exit(1) })
