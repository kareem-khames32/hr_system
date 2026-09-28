'use strict'
// رقم الهوية / الإقامة أو رقم جواز السفر (قرار المالك 28 سبتمبر): أغلب الموظفين بجنسيات مختلفة، فمفيش قواعد دولة —
// أي هوية أو أي جواز، وواحد منهم يكفي. على قاعدة SQL مؤقتة عشوائية (synchronize) عبر HTTP بتوكنات موقّعة محليًا:
// الإنشاء بالجواز لوحده أو بهوية بأي صيغة، الاتنين فاضيين 400، تكرار الجواز 409 على القيمة المطبّعة (والمحفوظ القديم
// بمسافات أو أرقام عربية بيتطابق)، مسح واحد في التعديل والتاني موجود، ملف قديم من غير الاتنين، التحديث الجماعي من ملف
// (الجواز عمود جديد، قاعدة «واحد منهم» لكل صف، والتكرار جوه الملف)، وإخفاء اسم صاحب الرقم لحساب فرع تاني زي ما هو.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const ExcelJS = require('../node_modules/exceljs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_identity_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_identity_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-identity-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, ds, master, base, created = false, sequence = 0
const B = {}, D = {}, U = {}
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }

const REQUIRED = 'لازم رقم الهوية / الإقامة أو رقم جواز السفر — واحد منهم على الأقل'
const NATIONAL_ID_FORMAT = 'رقم الهوية / الإقامة: حروف إنجليزية وأرقام وشرطة بس (من 3 لـ 50)'
const PASSPORT_FORMAT = 'رقم جواز السفر: حروف إنجليزية وأرقام وشرطة بس (من 3 لـ 40)'

function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    tokenVersion: 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(user)}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
async function upload(user, step, content, fileName = 'identity.csv') {
  const form = new FormData()
  form.append('file', new Blob([content]), fileName)
  const response = await fetch(`${base}/employees/bulk-update/${step}`, { method: 'POST', headers: { Authorization: `Bearer ${token(user)}` }, body: form })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const ok = (response, status = 201) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const messages = response => [].concat(response.body?.message ?? [])
const csv = rows => String.fromCharCode(0xfeff) + rows.map(row => row.join(',')).join('\r\n')
const fresh = id => repo('Employee').findOneByOrFail({ id })

/** بيانات إضافة كاملة من غير رقم هوية ولا جواز — كل اختبار بيحدد الهوية بنفسه. */
function complete(extra = {}) {
  const n = ++sequence
  return { fingerprintCode: `ID-FP-${n}`, fullName: 'خالد عبدالله العتيبي', phone: '+966501234567', birthDate: '1992-03-15', gender: 'male',
    nationality: 'هندي', jobTitle: 'محاسب', branchId: B.riyadh.id, departmentId: D.riyadh.id, joinDate: '2026-01-01', basicSalary: 7000,
    currency: 'SAR', ...extra }
}
/** موظف مسجل مباشرة في القاعدة (زي الملفات القديمة المُرحّلة) — ممكن من غير هوية ولا جواز أو بقيم مش مطبّعة. */
async function legacy(extra = {}) {
  const n = ++sequence
  return repo('Employee').save({ employeeCode: `LEG-${String(n).padStart(3, '0')}`, fullName: `موظف قديم ${n}`, branchId: B.riyadh.id,
    departmentId: D.riyadh.id, joinDate: '2020-01-01', basicSalary: 5000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0,
    currency: 'SAR', status: 'active', isActive: true, payMethod: 'cash', phone: '0501234567', jobTitle: 'فني', fingerprintCode: `LEG-FP-${n}`,
    nationalId: null, passportNo: null, ...extra })
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME,
    password: env.DB_PASSWORD, database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assert.equal(ds.options.database, database)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`

  B.riyadh = await repo('Branch').save({ code: 'ID-RUH', name: 'فرع الرياض' })
  B.jeddah = await repo('Branch').save({ code: 'ID-JED', name: 'فرع جدة' })
  D.riyadh = await repo('Department').save({ name: 'المالية', branchId: B.riyadh.id })
  D.jeddah = await repo('Department').save({ name: 'المبيعات', branchId: B.jeddah.id })
  U.admin = await repo('User').save({ email: 'admin@identity.test', displayName: 'admin', passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  U.riyadhHr = await repo('User').save({ email: 'hr@identity.test', displayName: 'riyadh hr', passwordHash: 'test-only', role: 'hr',
    branchId: B.riyadh.id, permissions: JSON.stringify(['employees.view', 'employees.create', 'employees.edit']) })
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '1' }, { key: 'payroll.monthly_days', value: '30' }, { key: 'payroll.daily_hours', value: '8' },
    { key: 'payroll.exempt_overtime_eligible', value: 'false' }, { key: 'payroll.exempt_unpaid_leave_deductible', value: 'true' },
    { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' },
  ])
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try { fs.rmSync(uploads, { recursive: true, force: true }) } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'national id or passport fixture cleanup failed')
})

test('ID-01: الإنشاء بالجواز لوحده، أو بهوية بأي صيغة لوحدها (حروف وشرطة وطول أجنبي) — والمحفوظ مطبّع', async () => {
  const passportOnly = ok(await request(U.admin, 'POST', '/employees', complete({ passportNo: ' p ١٢٣٤٥٦٧ ' })))
  let saved = await fresh(passportOnly.id)
  assert.equal(saved.passportNo, 'P1234567', 'من غير مسافات، أرقام لاتينية، حروف كبيرة')
  assert.equal(saved.nationalId, null)
  // المسارات اللي بتقرا الملف مابتقعش على موظف من غير هوية
  assert.equal(ok(await request(U.admin, 'GET', `/employees/${passportOnly.id}`), 200).passportNo, 'P1234567')
  ok(await request(U.admin, 'GET', `/employees/${passportOnly.id}/profile`), 200)
  assert.ok(ok(await request(U.admin, 'GET', '/employees'), 200).some(row => row.id === passportOnly.id))

  const foreignId = ok(await request(U.admin, 'POST', '/employees', complete({ nationalId: 'ab-1234-xyz', nationality: 'فلبيني' })))
  saved = await fresh(foreignId.id)
  assert.equal(saved.nationalId, 'AB-1234-XYZ'); assert.equal(saved.passportNo, null)
  // من غير قاعدة دولة: 7 خانات لسعودي، أو 18 رقم لمصري — مقبولين
  assert.equal((await fresh(ok(await request(U.admin, 'POST', '/employees', complete({ nationalId: 'K12-345', nationality: 'سعودي' }))).id)).nationalId, 'K12-345')
  assert.equal((await fresh(ok(await request(U.admin, 'POST', '/employees', complete({ nationalId: '123456789012345678', nationality: 'مصري' }))).id)).nationalId,
    '123456789012345678')
  const both = ok(await request(U.admin, 'POST', '/employees', complete({ nationalId: '2987654321', passportNo: 'N 7654321' })))
  saved = await fresh(both.id)
  assert.equal(saved.nationalId, '2987654321'); assert.equal(saved.passportNo, 'N7654321')
})

test('ID-02: الاتنين فاضيين = 400 برسالة واحدة، والشكل الغلط 400 برسالته', async () => {
  const before = await repo('Employee').count()
  for (const identity of [{}, { nationalId: '', passportNo: '   ' }, { nationalId: null, passportNo: null }]) {
    const missing = await request(U.admin, 'POST', '/employees', complete(identity))
    assert.equal(missing.status, 400, JSON.stringify(identity))
    assert.deepEqual(messages(missing), [REQUIRED], 'رسالة واحدة للاتنين')
  }
  // مع حقول تانية ناقصة: نفس الرسالة الواحدة جنب باقي الناقص
  const partial = await request(U.admin, 'POST', '/employees', { fullName: 'سارة علي', branchId: B.riyadh.id })
  assert.equal(partial.status, 400)
  assert.equal(messages(partial).filter(message => message === REQUIRED).length, 1)
  assert.equal(messages(partial).filter(message => /رقم الهوية|جواز/.test(message)).length, 1)

  const badId = await request(U.admin, 'POST', '/employees', complete({ nationalId: '12/34' }))
  assert.equal(badId.status, 400); assert.deepEqual(messages(badId), [NATIONAL_ID_FORMAT])
  const badPassport = await request(U.admin, 'POST', '/employees', complete({ passportNo: 'A1' }))
  assert.equal(badPassport.status, 400); assert.deepEqual(messages(badPassport), [PASSPORT_FORMAT])
  const tooLong = await request(U.admin, 'POST', '/employees', complete({ passportNo: 'X'.repeat(41) }))
  assert.equal(tooLong.status, 400); assert.deepEqual(messages(tooLong), [PASSPORT_FORMAT])
  assert.equal(await repo('Employee').count(), before, 'ولا موظف اتحفظ')
})

test('ID-03: التكرار على القيمة المطبّعة — «a 123» و«A123» نفس الجواز (409)، والمحفوظ القديم بمسافات وأرقام عربية بيتطابق', async () => {
  const holder = ok(await request(U.admin, 'POST', '/employees', complete({ passportNo: 'a 123', fullName: 'صاحب الجواز الأول' })))
  assert.equal((await fresh(holder.id)).passportNo, 'A123')
  const duplicate = await request(U.admin, 'POST', '/employees', complete({ passportNo: 'A123' }))
  assert.equal(duplicate.status, 409, JSON.stringify(duplicate.body))
  assert.equal(duplicate.body.message, 'رقم الجواز A123 مسجل لموظف آخر (صاحب الجواز الأول)')
  // هوية أحد تاني كرقم جواز مش تكرار (كل رقم بيتقارن بعموده)
  ok(await request(U.admin, 'POST', '/employees', complete({ nationalId: 'A123' })))

  // ملفات قديمة قبل القرار: قيم مش مطبّعة في القاعدة — التفرد بيقارن بعد تطبيع الطرفين
  const oldPassport = await legacy({ passportNo: 'b ٤٥٦', fullName: 'جواز قديم' })
  const oldId = await legacy({ nationalId: ' 2468 1357 ', fullName: 'هوية قديمة' })
  const hidden = String.fromCharCode(0x200f), nbsp = String.fromCharCode(0xa0), thin = String.fromCharCode(0x2009)
  await legacy({ passportNo: `c${nbsp}7${thin}89${hidden}`, fullName: 'جواز منسوخ من مستند' })
  const passportClash = await request(U.admin, 'POST', '/employees', complete({ passportNo: 'B456' }))
  assert.equal(passportClash.status, 409); assert.equal(passportClash.body.message, 'رقم الجواز B456 مسجل لموظف آخر (جواز قديم)')
  const idClash = await request(U.admin, 'POST', '/employees', complete({ nationalId: `24681357${hidden}` }))
  assert.equal(idClash.status, 409); assert.equal(idClash.body.message, 'رقم الهوية / الإقامة 24681357 مسجل لموظف آخر (هوية قديمة)')
  const markClash = await request(U.admin, 'POST', '/employees', complete({ passportNo: 'C789' }))
  assert.equal(markClash.status, 409); assert.equal(markClash.body.message, 'رقم الجواز C789 مسجل لموظف آخر (جواز منسوخ من مستند)')

  // التعديل لرقم موظف تاني مرفوض كمان، ومن غير ما يتحفظ
  const other = ok(await request(U.admin, 'POST', '/employees', complete({ nationalId: 'OTHER-1' })))
  const patchClash = await request(U.admin, 'PATCH', `/employees/${other.id}`, { passportNo: 'a1 2 3' })
  assert.equal(patchClash.status, 409); assert.equal(patchClash.body.message, 'رقم الجواز A123 مسجل لموظف آخر (صاحب الجواز الأول)')
  assert.equal((await fresh(other.id)).passportNo, null)
  assert.equal((await fresh(oldPassport.id)).passportNo, 'b ٤٥٦', 'القراءة مابتعدلش المحفوظ')
  assert.equal((await fresh(oldId.id)).nationalId, ' 2468 1357 ')
})

test('ID-04: التعديل — مسح واحد والتاني موجود مسموح، مسح الاتنين 400، ونفس الرقم بشكل تاني مش تغيير', async () => {
  const emp = ok(await request(U.admin, 'POST', '/employees', complete({ nationalId: 'EDIT-ID-1', passportNo: 'EDIT-P-1' })))
  ok(await request(U.admin, 'PATCH', `/employees/${emp.id}`, { nationalId: null }), 200)
  let saved = await fresh(emp.id)
  assert.equal(saved.nationalId, null); assert.equal(saved.passportNo, 'EDIT-P-1')

  const clearLast = await request(U.admin, 'PATCH', `/employees/${emp.id}`, { passportNo: '' })
  assert.equal(clearLast.status, 400); assert.deepEqual(messages(clearLast), [REQUIRED])
  assert.equal((await fresh(emp.id)).passportNo, 'EDIT-P-1', 'الرفض مابيغيرش حاجة')

  // هوية جديدة ومسح الجواز في نفس الحفظة = الموظف فاضل بواحد
  ok(await request(U.admin, 'PATCH', `/employees/${emp.id}`, { nationalId: 'edit id 2', passportNo: null }), 200)
  saved = await fresh(emp.id)
  assert.equal(saved.nationalId, 'EDITID2'); assert.equal(saved.passportNo, null)

  const clearBoth = await request(U.admin, 'PATCH', `/employees/${emp.id}`, { nationalId: '', passportNo: null })
  assert.equal(clearBoth.status, 400); assert.deepEqual(messages(clearBoth), [REQUIRED])
  const badFormat = await request(U.admin, 'PATCH', `/employees/${emp.id}`, { passportNo: 'P/1' })
  assert.equal(badFormat.status, 400); assert.deepEqual(messages(badFormat), [PASSPORT_FORMAT])
  // نفس الرقم بحروف صغيرة ومسافات = مش تغيير (ولا بيتفحص تكراره)، والمحفوظ بيفضل مطبّع
  ok(await request(U.admin, 'PATCH', `/employees/${emp.id}`, { nationalId: ' editid2 ', phone: '0551112233' }), 200)
  saved = await fresh(emp.id)
  assert.equal(saved.nationalId, 'EDITID2'); assert.equal(saved.phone, '0551112233')
})

test('ID-05: ملف قديم من غير هوية ولا جواز يفتح ويحفظ باقي حقوله، وقيمة مكررة من قبل القرار مابتمنعش الحفظ', async () => {
  const old = await legacy({ fullName: 'موظف مُرحّل من غير هوية' })
  ok(await request(U.admin, 'PATCH', `/employees/${old.id}`, { phone: '0559998877', jobTitle: 'فني أول' }), 200)
  // نفس اللي شاشة التعديل بتبعته لملف ناقص (الخانات الفاضية مش متبعتة)
  ok(await request(U.admin, 'PATCH', `/employees/${old.id}`, { fullName: old.fullName, nationality: 'باكستاني', gender: 'male' }), 200)
  let saved = await fresh(old.id)
  assert.equal(saved.phone, '0559998877'); assert.equal(saved.nationality, 'باكستاني')
  assert.equal(saved.nationalId, null); assert.equal(saved.passportNo, null)
  ok(await request(U.admin, 'GET', `/employees/${old.id}`), 200)
  // رقم جديد لازم يبقى بالشكل الصح، وبعدها الملف كمل
  const bad = await request(U.admin, 'PATCH', `/employees/${old.id}`, { passportNo: 'Z9' })
  assert.equal(bad.status, 400); assert.deepEqual(messages(bad), [PASSPORT_FORMAT])
  ok(await request(U.admin, 'PATCH', `/employees/${old.id}`, { passportNo: 'z 99' }), 200)
  assert.equal((await fresh(old.id)).passportNo, 'Z99')

  // موظفين قدام بنفس الجواز (قبل التفرد): تعديل حقل تاني والجواز متبعت زي ما هو = يتحفظ؛ تغييره لرقم مستخدم = 409
  const first = await legacy({ passportNo: 'SHARED-9', fullName: 'قديم أول' })
  const second = await legacy({ passportNo: 'shared-9', fullName: 'قديم تاني' })
  ok(await request(U.admin, 'PATCH', `/employees/${second.id}`, { passportNo: 'SHARED-9', phone: '0554443322' }), 200)
  saved = await fresh(second.id)
  assert.equal(saved.phone, '0554443322')
  const taken = await request(U.admin, 'PATCH', `/employees/${first.id}`, { passportNo: 'P1234567' })
  assert.equal(taken.status, 409); assert.match(taken.body.message, /^رقم الجواز P1234567 مسجل لموظف آخر/)
})

test('ID-06: التحديث الجماعي من ملف — الجواز عمود جديد، الهوية بأي صيغة، واحد منهم لكل صف، والتكرار (موظف تاني وجوه الملف)', async () => {
  const e1 = await legacy({ employeeCode: 'BLK-ID-1', nationalId: '1011111111' })
  const e2 = await legacy({ employeeCode: 'BLK-ID-2', passportNo: 'p 2222' })
  const e3 = await legacy({ employeeCode: 'BLK-ID-3', nationalId: '1033333333', passportNo: 'P3333' })
  const e4 = await legacy({ employeeCode: 'BLK-ID-4' })
  const e5 = await legacy({ employeeCode: 'BLK-ID-5', nationalId: '1055555555' })
  const e6 = await legacy({ employeeCode: 'BLK-ID-6', nationalId: '1066666666' })
  const content = csv([
    ['كود الموظف', 'رقم الهوية / الإقامة', 'رقم الجواز', 'رقم الجوال'],
    ['BLK-ID-1', 'مسح', 'n 5551', ''], // مسح الهوية مع جواز جديد
    ['BLK-ID-2', '', 'مسح', ''], // مسح الوحيد اللي موجود
    ['BLK-ID-3', 'ab-99-cd', 'P 3333', '0557776655'], // هوية بأي صيغة، والجواز نفسه بمسافة (مش تغيير)
    ['BLK-ID-4', 'dup-1', '', '0551230000'], // ملف قديم من غير الاتنين + نفس هوية الصف الجاي
    ['BLK-ID-5', 'DUP-1', '', ''],
    ['BLK-ID-6', '', 'b456', ''], // جواز محفوظ لموظف قديم بشكل «b ٤٥٦»
  ])
  const preview = ok(await upload(U.admin, 'preview', content))
  assert.deepEqual(preview.columns.map(column => column.key), ['code', 'nationalId', 'passportNo', 'phone'])
  const byCode = Object.fromEntries(preview.rows.map(row => [row.code, row]))
  assert.equal(byCode['BLK-ID-1'].status, 'ready')
  assert.deepEqual(byCode['BLK-ID-1'].changes.map(change => [change.field, change.old, change.new]), [['nationalId', '1011111111', null], ['passportNo', null, 'N5551']])
  assert.deepEqual(byCode['BLK-ID-2'].errors, [REQUIRED])
  assert.equal(byCode['BLK-ID-3'].status, 'ready')
  assert.deepEqual(byCode['BLK-ID-3'].changes.map(change => change.field), ['phone', 'nationalId'])
  assert.deepEqual(byCode['BLK-ID-4'].errors, ['رقم الهوية / الإقامة DUP-1 متكرر في الملف (الصفوف 5، 6)'])
  assert.deepEqual(byCode['BLK-ID-5'].errors, ['رقم الهوية / الإقامة DUP-1 متكرر في الملف (الصفوف 5، 6)'])
  assert.deepEqual(byCode['BLK-ID-6'].errors, ['رقم الجواز B456 مسجل لموظف تاني (جواز قديم) — مايتكررش'])
  assert.deepEqual(preview.summary, { total: 6, ready: 2, unchanged: 0, error: 4 })
  assert.equal((await fresh(e1.id)).nationalId, '1011111111', 'المعاينة مابتحفظش')

  const result = ok(await upload(U.admin, 'apply', content))
  assert.deepEqual(result.summary, { applied: 2, failed: 0, skipped: 4 })
  let saved = await fresh(e1.id)
  assert.equal(saved.nationalId, null); assert.equal(saved.passportNo, 'N5551')
  saved = await fresh(e3.id)
  assert.equal(saved.nationalId, 'AB-99-CD'); assert.equal(saved.passportNo, 'P3333'); assert.equal(saved.phone, '0557776655')
  assert.equal((await fresh(e2.id)).passportNo, 'p 2222')
  assert.equal((await fresh(e4.id)).nationalId, null); assert.equal((await fresh(e5.id)).nationalId, '1055555555')
  assert.equal((await fresh(e6.id)).passportNo, null)
  const audit = await repo('EmployeeStatusHistory').find({ where: { employeeId: e1.id }, order: { id: 'ASC' } })
  assert.deepEqual(audit.filter(row => ['nationalId', 'passportNo'].includes(row.fieldName)).map(row => [row.fieldName, row.reason]),
    [['nationalId', 'تحديث جماعي من ملف «identity.csv»'], ['passportNo', 'تحديث جماعي من ملف «identity.csv»']])

  // ملف قديم من غير الاتنين: صف بيعدّل الجوال بس بيتحفظ
  ok(await upload(U.admin, 'apply', csv([['كود الموظف', 'رقم الجوال', 'Passport No'], ['BLK-ID-4', '0550000044', '']])))
  assert.equal((await fresh(e4.id)).phone, '0550000044')

  // القالب: الجواز عمود بعد الهوية، مملي بالقيم الحالية
  const response = await fetch(`${base}/employees/bulk-update/template`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(U.admin)}` },
    body: JSON.stringify({ fields: ['passportNo', 'nationalId'], format: 'csv', employeeIds: [e1.id, e3.id] }) })
  assert.equal(response.status, 200)
  const lines = Buffer.from(await response.arrayBuffer()).toString('utf8').replace(/^\uFEFF/, '').trim().split('\r\n')
  assert.equal(lines[0], 'كود الموظف,اسم الموظف,رقم الهوية / الإقامة,رقم جواز السفر')
  assert.deepEqual(lines.slice(1).map(line => line.split(',').slice(2)), [['', 'N5551'], ['AB-99-CD', 'P3333']])
})

test('ID-07: إخفاء اسم صاحب الرقم المكرر لحساب فرع تاني زي ما هو — في الإضافة والتعديل والملف', async () => {
  const jeddah = await legacy({ fullName: 'موظفة فرع جدة', branchId: B.jeddah.id, departmentId: D.jeddah.id, nationalId: 'JED-ID-7', passportNo: 'JED-P-7' })
  assert.ok(jeddah.id)
  const byBranch = await request(U.riyadhHr, 'POST', '/employees', complete({ passportNo: 'jed-p-7' }))
  assert.equal(byBranch.status, 409); assert.equal(byBranch.body.message, 'رقم الجواز JED-P-7 مسجل لموظف آخر')
  const idByBranch = await request(U.riyadhHr, 'POST', '/employees', complete({ nationalId: 'jed-id-7' }))
  assert.equal(idByBranch.status, 409); assert.equal(idByBranch.body.message, 'رقم الهوية / الإقامة JED-ID-7 مسجل لموظف آخر')
  const byAdmin = await request(U.admin, 'POST', '/employees', complete({ passportNo: 'JED-P-7' }))
  assert.equal(byAdmin.status, 409); assert.equal(byAdmin.body.message, 'رقم الجواز JED-P-7 مسجل لموظف آخر (موظفة فرع جدة)')

  const mine = await legacy({ employeeCode: 'RUH-ID-7', nationalId: 'RUH-ID-7' })
  const patch = await request(U.riyadhHr, 'PATCH', `/employees/${mine.id}`, { passportNo: 'JED-P-7' })
  assert.equal(patch.status, 409); assert.equal(patch.body.message, 'رقم الجواز JED-P-7 مسجل لموظف آخر')
  const preview = ok(await upload(U.riyadhHr, 'preview', csv([['كود الموظف', 'رقم جواز السفر'], ['RUH-ID-7', 'JED-P-7']])))
  assert.deepEqual(preview.rows[0].errors, ['رقم الجواز JED-P-7 مسجل لموظف تاني — مايتكررش'])
  assert.doesNotMatch(JSON.stringify([byBranch.body, idByBranch.body, patch.body, preview.rows]), /موظفة فرع جدة/)
})

test('ID-08: التصدير لموظف بالجواز بس — عمود الهوية فاضي وعمود الجواز بقيمته', async () => {
  const emp = ok(await request(U.admin, 'POST', '/employees', complete({ passportNo: 'EXP-12345' })))
  const response = await fetch(`${base}/employees/export?ids=${emp.id}`, { headers: { Authorization: `Bearer ${token(U.admin)}` } })
  assert.equal(response.status, 200)
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(Buffer.from(await response.arrayBuffer()))
  const sheet = workbook.getWorksheet('الموظفين')
  const headers = sheet.getRow(1).values.slice(1)
  const values = sheet.getRow(2).values.slice(1)
  const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? null]))
  assert.ok(row['رقم الهوية / الإقامة'] === null || row['رقم الهوية / الإقامة'] === '', JSON.stringify(row['رقم الهوية / الإقامة']))
  assert.equal(row['رقم الجواز'], 'EXP-12345')
})
