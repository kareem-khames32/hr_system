// الإذن على SQL حقيقي في قاعدة عشوائية بتتمسح: (1) محرك الحضور بيعذر فترة الإذن المعتمدة بالظبط والباقي تأخير/انصراف بدري عادي
// (2) رصيد الإذن الشهري بالدقايق (ساعتين = ساعة + ساعة أو ساعتين مرة واحدة) والحد للمرة الواحدة بيتفرضوا عند التقديم.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_permission_window_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-permission-window-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const dateAfter = (date, offset) => { const v = new Date(`${date}T12:00:00`); v.setDate(v.getDate() + offset); return iso(v) }
// يوم أربع فات (مش ويك إند ومش النهارده) عشان اليوم يتحسب ويتحفظ
let day = dateAfter(iso(new Date()), -2)
while (new Date(`${day}T12:00:00`).getDay() !== 3) day = dateAfter(day, -1)
let app, master, ds, base, admin, branch, shift, morningType, eveningType, monthlyType, deductibleType, created = false, sequence = 0
const repo = name => ds.getRepository(name)

async function http(user, method, route, body) {
  const token = jwt.sign({ sub: user.id, email: user.email, role: user.role, employeeId: user.employeeId ?? null,
    branchId: user.branchId ?? null, tokenVersion: 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
  const response = await fetch(base + route, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, /^hr_permission_window_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433),
    user: env.DB_USERNAME, password: env.DB_PASSWORD, database: 'master',
    options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  ds = app.get(require('../node_modules/typeorm').DataSource); assert.equal(ds.options.database, database)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  admin = await repo('User').save({ email: 'admin@permission-window.invalid', displayName: 'مراجع اختبار الإذن',
    passwordHash: 'isolated-test-token-only', role: 'super_admin', permissions: '["*"]' })
  await repo('RequestsConfig').save(Object.entries({
    'attendance.weekend_days': 'FRI,SAT', 'attendance.grace_minutes': '0',
    'attendance.flex.count_early_work_toward_required': 'false', 'attendance.flex.prorate_window_on_partial_leave': 'false',
    'attendance.flex.shortfall_grace_minutes': '10', 'attendance.flex.unpaid_break_minutes': '0',
    'attendance.flex.max_session_minutes': '900', 'attendance.flex.window_supersedes_grace': 'true',
  }).map(([key, value]) => ({ key, value })))
  branch = await repo('Branch').save({ code: 'PERMWIN', name: 'فرع اختبار الإذن', weekendDays: 'FRI,SAT' })
  // وردية ثابتة 09:00 → 18:00 بسماح 15 دقيقة
  const madeShift = await http(admin, 'POST', '/catalogs/shifts', { name: 'وردية اختبار الإذن', startTime: '09:00', endTime: '18:00',
    shiftMode: 'fixed', graceMinutes: 15, flexEnabled: false, flexWindowMinutes: 60, requiredWorkMinutes: 540,
    effectiveFrom: dateAfter(day, -14), changeReason: 'وردية مؤرخة لاختبار فترة الإذن' })
  assert.equal(madeShift.status, 201, JSON.stringify(madeShift.body)); shift = madeShift.body
  morningType = await repo('PermissionType').save({ nameAr: 'إذن تأخير صباحي', isDeductible: false, coverage: 'morning', isActive: true })
  eveningType = await repo('PermissionType').save({ nameAr: 'إذن انصراف مبكر', isDeductible: false, coverage: 'evening', isActive: true })
  // قرار المالك: ساعتين في الشهر — ساعة + ساعة أو ساعتين مرة واحدة
  monthlyType = await repo('PermissionType').save({ nameAr: 'إذن شخصي ساعتين في الشهر', isDeductible: false, coverage: 'both',
    maxDurationMinutes: 120, monthlyFreeMinutes: 120, isActive: true })
  // النوع بخصم: خانة الدقائق المجانية مقفولة في الإعدادات، فقيمة قديمة فيها ماتقفلش التقديم
  deductibleType = await repo('PermissionType').save({ nameAr: 'إذن بخصم', isDeductible: true, coverage: 'both',
    monthlyFreeMinutes: 30, isActive: true })
  if (!(await repo('RequestType').findOneBy({ code: 'PERMISSION' }))) {
    const chain = await repo('ApprovalChain').save({ code: 'PERMWIN_CHAIN', nameAr: 'اعتماد إذن الاختبار', isActive: true, autoApprove: false })
    await repo('ApprovalStep').save({ chainId: chain.id, stepOrder: 1, approverRole: 'executive' })
    await repo('RequestType').save({ code: 'PERMISSION', nameAr: 'استئذان', category: 'time_attendance', isActive: true,
      approvalChainId: chain.id, destinationHandler: 'attendance_log', requiredFields: '["date","from","to"]' })
  }
}, { timeout: 90000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_permission_window_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name=@database')
      assert.equal(found.recordset.length, 0); t.diagnostic(`Cleanup verified: ${database} removed.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir())); assert.match(path.basename(uploads), /^hr-permission-window-files-/)
    fs.rmSync(uploads, { recursive: true, force: true }); assert.equal(fs.existsSync(uploads), false)
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Permission window cleanup failed')
})

async function employee() {
  const n = ++sequence
  const emp = await repo('Employee').save({ employeeCode: `PERMWIN${n}`, fingerprintCode: `PERMWIN${n}`, fullName: `موظف اختبار الإذن ${n}`,
    branchId: branch.id, joinDate: '2020-01-01', basicSalary: 9000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0,
    workNatureAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'cash' })
  const user = await repo('User').save({ email: `permwin${n}@permission-window.invalid`, displayName: emp.fullName, employeeId: emp.id,
    branchId: branch.id, passwordHash: 'isolated-test-token-only', role: 'employee', permissions: '[]' })
  return { emp, user }
}
// يوم بإذن معتمد (زي ما بيوصل بعد الاعتماد) وبصمتين، ويرجع صف الحضور المحفوظ
async function attendanceWith(type, from, to, checkIn, checkOut) {
  const { emp } = await employee()
  const assigned = await http(admin, 'POST', '/attendance/schedule/day', { employeeId: emp.id, date: day, shiftId: shift.id })
  assert.equal(assigned.status, 201, JSON.stringify(assigned.body))
  await repo('Request').save({ requesterId: emp.id, typeCode: 'PERMISSION', status: 'APPROVED', branchId: branch.id,
    payload: JSON.stringify({ date: day, from, to, permissionTypeId: type.id, permissionType: type.nameAr }) })
  const punched = await http(admin, 'POST', '/attendance/punches/manual', { reason: 'بصمات اختبار الإذن',
    punches: [checkIn, checkOut].map(time => ({ employeeCode: emp.fingerprintCode, timestamp: new Date(`${day}T${time}:00`).toISOString() })) })
  assert.equal(punched.status, 201, JSON.stringify(punched.body))
  return repo('AttendanceDay').findOneByOrFail({ employeeId: emp.id, date: day })
}

test('إذن صباحي ساعة (09:00–10:00) ووصول 10:30: الإذن بيغطي الساعة والـ30 دقيقة الباقية تأخير عادي', { timeout: 30000 }, async () => {
  const row = await attendanceWith(morningType, '09:00', '10:00', '10:30', '18:00')
  assert.equal(row.lateMinutes, 30); assert.equal(row.rawLateMinutes, 90); assert.equal(row.unexcusedLateMinutes, 30)
  assert.equal(row.excusedMinutes, 60); assert.equal(row.earlyLeaveMinutes, 0); assert.equal(row.status, 'late')
})

test('إذن صباحي ساعتين (09:00–11:00) ووصول 11:00: مفيش تأخير', { timeout: 30000 }, async () => {
  const row = await attendanceWith(morningType, '09:00', '11:00', '11:00', '18:00')
  assert.equal(row.lateMinutes, 0); assert.equal(row.excusedMinutes, 120); assert.equal(row.status, 'present')
})

test('إذن مسائي ساعة (17:00–18:00) وخروج 17:00: مفيش انصراف بدري', { timeout: 30000 }, async () => {
  const row = await attendanceWith(eveningType, '17:00', '18:00', '09:00', '17:00')
  assert.equal(row.earlyLeaveMinutes, 0); assert.equal(row.lateMinutes, 0); assert.equal(row.shortfallMinutes, 0)
  assert.equal(row.status, 'present')
})

test('إذن مسائي ساعة (17:00–18:00) وخروج 16:30: انصراف بدري 30 دقيقة للجزء اللي برا الإذن', { timeout: 30000 }, async () => {
  const row = await attendanceWith(eveningType, '17:00', '18:00', '09:00', '16:30')
  assert.equal(row.earlyLeaveMinutes, 30); assert.equal(row.shortfallMinutes, 30); assert.equal(row.excusedMinutes, 60)
  assert.equal(row.status, 'early_leave')
})

test('رصيد ساعتين في الشهر: ساعة + ساعة أو ساعتين مرة واحدة، والزيادة والحد للمرة الواحدة بيترفضوا', { timeout: 30000 }, async () => {
  const { user } = await employee()
  const send = (date, from, to, type = monthlyType) => http(user, 'POST', '/requests', { typeCode: 'PERMISSION', submit: true,
    payload: { date, from, to, permissionTypeId: type.id } })
  // نوفمبر: ساعة + ساعة، وبعدها ولا ربع ساعة
  assert.equal((await send('2026-11-02', '09:00', '10:00')).status, 201)
  assert.equal((await send('2026-11-03', '16:00', '17:00')).status, 201)
  const over = await send('2026-11-04', '09:00', '09:15')
  assert.equal(over.status, 400, JSON.stringify(over.body))
  assert.match(over.body.message, /120 دقيقة في الشهر/); assert.match(over.body.message, /الباقي 0 دقيقة/)
  // ديسمبر: ساعتين مرة واحدة، وبعدها مفيش
  assert.equal((await send('2026-12-01', '09:00', '11:00')).status, 201)
  assert.equal((await send('2026-12-02', '09:00', '09:15')).status, 400)
  // يناير: ساعة ونص + نص ساعة = 120 بالظبط مقبولة، وبعدها لأ
  assert.equal((await send('2027-01-04', '09:00', '10:30')).status, 201)
  const partial = await send('2027-01-05', '09:00', '10:00')
  assert.equal(partial.status, 400); assert.match(partial.body.message, /الباقي 30 دقيقة/)
  assert.equal((await send('2027-01-05', '09:00', '09:30')).status, 201)
  // أكتر من الحد للمرة الواحدة (120) في شهر فاضي
  const long = await send('2027-02-01', '09:00', '11:15')
  assert.equal(long.status, 400); assert.match(long.body.message, /الحد الأقصى/)
})

test('وقت الإذن لازم يكون صالح: من غير نهاية أو نفس الوقت بيترفض، والنوع بخصم مالوش رصيد دقايق عند التقديم', { timeout: 30000 }, async () => {
  const { user } = await employee()
  const send = (payload) => http(user, 'POST', '/requests', { typeCode: 'PERMISSION', submit: true, payload })
  const missing = await send({ date: '2026-11-10', from: '09:00', to: '', permissionTypeId: morningType.id })
  assert.equal(missing.status, 400, JSON.stringify(missing.body))
  const garbled = await send({ date: '2026-11-10', from: '09:00', to: 'بعد الضهر', permissionTypeId: morningType.id })
  assert.equal(garbled.status, 400); assert.match(garbled.body.message, /وقت بداية ونهاية الإذن/)
  const same = await send({ date: '2026-11-10', from: '09:00', to: '09:00', permissionTypeId: morningType.id })
  assert.equal(same.status, 400); assert.match(same.body.message, /بعد وقت البداية/)
  for (const date of ['2026-11-11', '2026-11-12']) {
    const paid = await send({ date, from: '09:00', to: '10:00', permissionTypeId: deductibleType.id })
    assert.equal(paid.status, 201, JSON.stringify(paid.body))
  }
})
