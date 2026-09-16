// قرارا المالك 16 سبتمبر على قاعدة SQL مؤقتة معزولة (synchronize):
// 1) الحقول الإجبارية عند إضافة موظف عبر HTTP (الرسائل، رقم الهوية حسب الجنسية، التفرد) وأن ملفًا قديمًا ناقصًا يحفظ باقي حقوله.
// 2) الإيقاف عن العمل لفترة: الحالة «موقوف» مشتقة من التواريخ في القائمة والملف، السجل، التداخل، الإنهاء المبكر والإلغاء،
//    أيام الإيقاف ليست غيابًا (صف غياب قديم يُشال وتجسيد الغياب يتخطاها)، والمسير يخصمها يومًا بيوم بسطر «أيام إيقاف عن العمل».
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_employee_suspension_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-employee-suspension-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, master, ds, base, admin, branch, department, created = false, employeeNumber = 0
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
const { localDateOf } = require('../src/attendance/attendance.service')
const { addDays } = require('../src/employees/employee-suspension-rules')
const today = () => localDateOf(new Date())
function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function request(user, method, endpoint, body) {
  const response = await fetch(base + endpoint, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(user)}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
function expectStatus(response, status) {
  assert.equal(response.status, status, JSON.stringify(response.body))
  return response.body
}
const messageOf = response => [].concat(response.body?.message ?? []).join(' | ')
async function employee(overrides = {}) {
  const n = ++employeeNumber
  return repo('Employee').save({ employeeCode: `SUS${String(n).padStart(3, '0')}`, fullName: `موظف الإيقاف ${n}`,
    branchId: branch.id, joinDate: '2020-01-01', basicSalary: 9000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0,
    status: 'active', isActive: true, payMethod: 'transfer', ...overrides })
}
const complete = (extra = {}) => ({ employeeCode: `NEW${++employeeNumber}`, fingerprintCode: `FP${employeeNumber}`, fullName: 'خالد عبدالله العتيبي',
  phone: '+966501234567', nationalId: `10${String(employeeNumber).padStart(8, '0')}`, birthDate: '1992-03-15', gender: 'male', nationality: 'سعودي',
  jobTitle: 'محاسب', departmentId: department.id, branchId: branch.id, joinDate: '2026-01-01', basicSalary: 7000, currency: 'SAR', ...extra })

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, /^hr_employee_suspension_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
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
  branch = await repo('Branch').save({ code: 'SUSP_TEST', name: 'فرع اختبار الإيقاف' })
  department = await repo('Department').save({ name: 'قسم الإيقاف', branchId: branch.id })
  admin = await repo('User').save({ email: 'admin@suspension.invalid', displayName: 'admin', passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '1' }, { key: 'payroll.monthly_days', value: '30' }, { key: 'payroll.daily_hours', value: '8' },
    { key: 'payroll.exempt_overtime_eligible', value: 'false' }, { key: 'payroll.exempt_unpaid_leave_deductible', value: 'true' },
    { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' },
  ])
}, { timeout: 90000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_employee_suspension_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try { fs.rmSync(uploads, { recursive: true, force: true }) } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Employee suspension fixture cleanup failed')
})

test('إضافة موظف: الحقول الإجبارية برسائل واضحة، الهوية بطول الجنسية وفريدة، ورقم البصمة فريد', async () => {
  const missing = await request(admin, 'POST', '/employees', { employeeCode: 'REQ001', fullName: 'سارة علي', branchId: branch.id })
  assert.equal(missing.status, 400)
  for (const text of ['الجنسية مطلوبة', 'رقم البصمة مطلوب', 'الجنس مطلوب', 'تاريخ الميلاد مطلوب', 'رقم الجوال مطلوب', 'رقم الهوية / الإقامة مطلوب',
    'القسم مطلوب', 'المسمى الوظيفي مطلوب', 'تاريخ التعيين مطلوب', 'الراتب الأساسي مطلوب']) assert.ok(messageOf(missing).includes(text), text)

  const saudiWithIqama = await request(admin, 'POST', '/employees', complete({ nationalId: '2123456789' }))
  assert.equal(saudiWithIqama.status, 400); assert.equal(messageOf(saudiWithIqama), 'رقم الهوية الوطنية للسعودي 10 أرقام ويبدأ بـ1')
  const residentWrong = await request(admin, 'POST', '/employees', complete({ nationality: 'أردني', nationalId: '1123456789' }))
  assert.equal(residentWrong.status, 400); assert.equal(messageOf(residentWrong), 'رقم الإقامة لغير السعودي 10 أرقام ويبدأ بـ2')
  const englishName = await request(admin, 'POST', '/employees', complete({ fullName: 'Khaled Otaibi' }))
  assert.equal(englishName.status, 400); assert.equal(messageOf(englishName), 'الاسم الكامل لازم يكون بالعربي')

  const first = expectStatus(await request(admin, 'POST', '/employees', complete({ nationalId: '1098765432', fingerprintCode: 'FP-UNIQ' })), 201)
  assert.equal(first.nationality, 'سعودي'); assert.equal(first.fingerprintCode, 'FP-UNIQ')
  const egyptian = expectStatus(await request(admin, 'POST', '/employees', complete({ nationality: 'مصري', nationalId: '29001011234567' })), 201)
  assert.equal(egyptian.nationalId, '29001011234567')
  const dupId = await request(admin, 'POST', '/employees', complete({ nationalId: '1098765432' }))
  assert.equal(dupId.status, 409); assert.match(messageOf(dupId), /رقم الهوية \/ الإقامة 1098765432 مسجل لموظف آخر/)
  const dupFingerprint = await request(admin, 'POST', '/employees', complete({ fingerprintCode: 'FP-UNIQ' }))
  assert.equal(dupFingerprint.status, 409); assert.match(messageOf(dupFingerprint), /رقم البصمة FP-UNIQ مستخدم بالفعل/)
})

test('تعديل ملف قديم ناقص: باقي الحقول تتحفظ، والمسح أو تغيير الجنسية المخالف أو «موقوف» بلا تواريخ مرفوض', async () => {
  const legacy = await employee({ nationalId: '29505051234567', jobTitle: 'فني', nationality: null, gender: null, birthDate: null, phone: null })
  const saved = expectStatus(await request(admin, 'PATCH', `/employees/${legacy.id}`, { phone: '0501234567', fullName: legacy.fullName, nationalId: legacy.nationalId }), 200)
  assert.equal(saved.phone, '0501234567')
  const cleared = await request(admin, 'PATCH', `/employees/${legacy.id}`, { jobTitle: null })
  assert.equal(cleared.status, 400); assert.equal(messageOf(cleared), 'المسمى الوظيفي مطلوب ولا يمكن مسحه')
  const wrongNationality = await request(admin, 'PATCH', `/employees/${legacy.id}`, { nationality: 'سعودي' })
  assert.equal(wrongNationality.status, 400); assert.equal(messageOf(wrongNationality), 'رقم الهوية الوطنية للسعودي 10 أرقام ويبدأ بـ1')
  expectStatus(await request(admin, 'PATCH', `/employees/${legacy.id}`, { nationality: 'مصري' }), 200)
  const flip = await request(admin, 'PATCH', `/employees/${legacy.id}`, { status: 'suspended' })
  assert.equal(flip.status, 400); assert.match(messageOf(flip), /«إيقاف مؤقت» بتاريخ من وإلى وسبب/)
  const stored = await repo('Employee').findOneByOrFail({ id: legacy.id })
  assert.equal(stored.status, 'active'); assert.equal(stored.isActive, true)
})

test('الإيقاف عن العمل: «موقوف» من التواريخ في القائمة والملف، السجل، التداخل، الغياب القديم يُشال، والإنهاء المبكر والإلغاء', async () => {
  const emp = await employee()
  const d = offset => addDays(today(), offset)
  // يوم فات اتسجل غياب قبل الإيقاف (بلا بصمة) + يوم بحضور فعلي يفضل كما هو
  await repo('AttendanceDay').save({ employeeId: emp.id, branchId: branch.id, date: d(-1), shiftName: 'اختبار', shiftStart: '09:00', shiftEnd: '17:00', status: 'absent' })
  await repo('AttendanceDay').save({ employeeId: emp.id, branchId: branch.id, date: d(-2), shiftName: 'اختبار', shiftStart: '09:00', shiftEnd: '17:00', status: 'present', checkIn: '09:00', checkOut: '17:00' })

  const bad = await request(admin, 'POST', `/employees/${emp.id}/suspensions`, { fromDate: d(3), toDate: d(1), reason: 'تحقيق' })
  assert.equal(bad.status, 400); assert.equal(messageOf(bad), 'نهاية الإيقاف لازم تكون في نفس يوم البداية أو بعده')
  const current = expectStatus(await request(admin, 'POST', `/employees/${emp.id}/suspensions`, { fromDate: d(-2), toDate: d(3), reason: 'تحقيق إداري في مخالفة' }), 201)
  assert.equal(current.state, 'CURRENT'); assert.equal(current.plannedToDate, d(3))
  assert.equal(await repo('AttendanceDay').countBy({ employeeId: emp.id, date: d(-1) }), 0, 'صف الغياب القديم اتشال — اليوم إيقاف مش غياب')
  assert.equal(await repo('AttendanceDay').countBy({ employeeId: emp.id, date: d(-2) }), 1, 'يوم ببصمة لا يُلمس')

  const overlap = await request(admin, 'POST', `/employees/${emp.id}/suspensions`, { fromDate: d(3), toDate: d(5), reason: 'تحقيق تاني' })
  assert.equal(overlap.status, 409); assert.match(messageOf(overlap), /يوجد إيقاف تاني متداخل/)

  const row = expectStatus(await request(admin, 'GET', '/employees'), 200).find(item => item.id === emp.id)
  assert.equal(row.status, 'suspended'); assert.equal(row.storedStatus, 'active'); assert.equal(row.suspension.id, current.id)
  const profile = expectStatus(await request(admin, 'GET', `/employees/${emp.id}/profile`), 200)
  assert.equal(profile.employee.status, 'suspended'); assert.equal(profile.employee.suspensions.length, 1)
  const stored = await repo('Employee').findOneByOrFail({ id: emp.id })
  assert.equal(stored.status, 'active', 'الحالة المحفوظة لا تتغير'); assert.equal(stored.isActive, true)
  // الحفظ من شاشة التعديل بـ«موقوف» المعروضة = بلا تغيير
  expectStatus(await request(admin, 'PATCH', `/employees/${emp.id}`, { status: 'suspended', phone: '0550000000' }), 200)
  assert.equal((await repo('Employee').findOneByOrFail({ id: emp.id })).status, 'active')

  // تجسيد الغياب يتخطى أيام الإيقاف (قبل ما يوصل للتقويم أصلًا)
  const { AttendanceService } = require('../src/attendance/attendance.service')
  assert.equal(await app.get(AttendanceService).materializeAbsences(emp.id, d(-1), d(-1)), 0)
  assert.equal(await repo('AttendanceDay').countBy({ employeeId: emp.id, date: d(-1) }), 0)

  // إيقاف قادم منفصل ثم إلغاؤه قبل بدايته
  const upcoming = expectStatus(await request(admin, 'POST', `/employees/${emp.id}/suspensions`, { fromDate: d(10), toDate: d(12), reason: 'قرار لاحق' }), 201)
  assert.equal(upcoming.state, 'UPCOMING')
  const cancelled = expectStatus(await request(admin, 'POST', `/employees/${emp.id}/suspensions/${upcoming.id}/end`, { returnDate: d(10), reason: 'اتلغى القرار' }), 201)
  assert.equal(cancelled.status, 'CANCELLED'); assert.equal(cancelled.state, 'CANCELLED')

  // إنهاء الساري بدري: يرجع النهارده، آخر يوم إيقاف امبارح، والحالة ترجع «نشط»
  const late = await request(admin, 'POST', `/employees/${emp.id}/suspensions/${current.id}/end`, { returnDate: d(9) })
  assert.equal(late.status, 400); assert.match(messageOf(late), /بعد نهاية الإيقاف/)
  const ended = expectStatus(await request(admin, 'POST', `/employees/${emp.id}/suspensions/${current.id}/end`, { returnDate: today(), reason: 'انتهى التحقيق' }), 201)
  assert.equal(ended.status, 'ENDED_EARLY'); assert.equal(ended.toDate, d(-1)); assert.equal(ended.plannedToDate, d(3))
  assert.equal(expectStatus(await request(admin, 'GET', `/employees/${emp.id}`), 200).status, 'active')
  const history = expectStatus(await request(admin, 'GET', `/employees/${emp.id}/suspensions`), 200)
  assert.deepEqual(history.map(item => item.status).sort(), ['CANCELLED', 'ENDED_EARLY'])
  const changes = await repo('EmployeeStatusHistory').findBy({ employeeId: emp.id, fieldName: 'suspension' })
  assert.equal(changes.length, 4, 'تسجيل + إيقاف قادم + إلغاء + إنهاء')
  assert.ok(changes.every(change => change.changeType === 'DATA'), 'لا يدخل سجل الحالة الذي يقرأه مزود التوظيف')

  const terminated = await employee({ status: 'terminated', isActive: false })
  const refused = await request(admin, 'POST', `/employees/${terminated.id}/suspensions`, { fromDate: d(1), toDate: d(2), reason: 'تحقيق' })
  assert.equal(refused.status, 400); assert.match(messageOf(refused), /على رأس العمل/)
  const beforeHire = await request(admin, 'POST', `/employees/${emp.id}/suspensions`, { fromDate: '2019-12-30', toDate: '2020-01-02', reason: 'تحقيق' })
  assert.equal(beforeHire.status, 400); assert.match(messageOf(beforeHire), /قبل تاريخ بدء عمل الموظف/)
})

test('مراجعة 16 سبتمبر: إيقاف منتهي يتلغى، والتداخل مع إجازة معتمدة أو مسير معتمد مرفوض على SQL حقيقية', async () => {
  const emp = await employee()
  const d = offset => addDays(today(), offset)
  // أثر رجعي غلط انتهى: يتلغى من السجل (قبل الإصلاح كان «انتهى بالفعل» للأبد)
  const finished = expectStatus(await request(admin, 'POST', `/employees/${emp.id}/suspensions`, { fromDate: d(-15), toDate: d(-11), reason: 'اتسجل على موظف غلط' }), 201)
  assert.equal(finished.state, 'FINISHED')
  const late = await request(admin, 'POST', `/employees/${emp.id}/suspensions/${finished.id}/end`, { returnDate: d(-5) })
  assert.equal(late.status, 400); assert.match(messageOf(late), /انتهى بالفعل .* تقدر تلغيه/)
  const cancelled = expectStatus(await request(admin, 'POST', `/employees/${emp.id}/suspensions/${finished.id}/end`, { returnDate: d(-15), reason: 'تصحيح' }), 201)
  assert.equal(cancelled.status, 'CANCELLED')

  await repo('Leave').save({ employeeId: emp.id, leaveTypeCode: 'ANNUAL', fromDate: d(20), toDate: d(24), days: 5, period: 'FULL', isUnpaid: false, status: 'APPROVED' })
  const overLeave = await request(admin, 'POST', `/employees/${emp.id}/suspensions`, { fromDate: d(18), toDate: d(30), reason: 'تحقيق إداري' })
  assert.equal(overLeave.status, 409); assert.match(messageOf(overLeave), /إجازة معتمدة .* الغي الإجازة أو قصّرها الأول/)

  // مسير معتمد يغطي أيام الموظف: لا تسجيل ولا مسح لصفوف الغياب
  const run = await repo('PayrollRun').save({ name: `مسير معتمد ${crypto.randomUUID().slice(0, 8)}`, period: d(-40).slice(0, 7), startDate: d(-45), endDate: d(-31), status: 'APPROVED' })
  await repo('PayrollItem').save({ runId: run.id, employeeId: emp.id, basicSalary: 9000, netPay: 9000, payMethod: 'transfer' })
  await repo('AttendanceDay').save({ employeeId: emp.id, branchId: branch.id, date: d(-40), shiftName: 'اختبار', shiftStart: '09:00', shiftEnd: '17:00', status: 'absent' })
  const closed = await request(admin, 'POST', `/employees/${emp.id}/suspensions`, { fromDate: d(-41), toDate: d(-38), reason: 'تحقيق إداري' })
  assert.equal(closed.status, 409, JSON.stringify(closed.body)); assert.match(messageOf(closed), /داخل مسير رواتب معتمد أو مصروف/)
  assert.equal(await repo('AttendanceDay').countBy({ employeeId: emp.id, date: d(-40) }), 1, 'صف الغياب اللي اتخصم في المسير المعتمد باقي')
})

test('المسير: أيام الإيقاف تُخصم يومًا بيوم بسطر «أيام إيقاف عن العمل» بلا ازدواج مع إجازة بدون راتب', async t => {
  const emp = await employee()
  // استثناء حضور طول السنة يعزل الحساب عن الغياب والتأخير
  await repo('AttendanceExemption').save({ employeeId: emp.id, effectiveFrom: '2026-01-01', effectiveTo: '2027-12-31', reasonCode: 'field_role',
    reason: 'نافذة اختبار الإيقاف المعزولة', status: 'APPROVED', createdByUserId: admin.id, approvedByUserId: admin.id,
    approvedAt: new Date('2026-01-01T08:00:00Z'), terminatedFrom: null, overtimeEligibleOverride: null, unpaidLeaveDeductibleOverride: null, requiresCheckinForPresence: false })
  expectStatus(await request(admin, 'POST', `/employees/${emp.id}/suspensions`, { fromDate: '2026-07-05', toDate: '2026-07-09', reason: 'إيقاف تأديبي' }), 201)
  await repo('Leave').save({ employeeId: emp.id, leaveTypeCode: 'UNPAID', fromDate: '2026-07-09', toDate: '2026-07-10', days: 2, period: 'FULL', isUnpaid: true, status: 'APPROVED' })

  const run = expectStatus(await request(admin, 'POST', '/payroll/runs/calculate-defined', { period: '2026-07', scopeType: 'CUSTOM', employeeIds: [emp.id],
    name: `اختبار الإيقاف ${crypto.randomUUID().slice(0, 8)}` }), 201)
  const item = run.items.find(row => row.employeeId === emp.id)
  assert.ok(item, 'الموظف في المسير')
  const breakdown = JSON.parse(item.breakdown)
  assert.equal(Number(item.unpaidLeaveDays), 6, '4 أيام إيقاف (09/07 إجازة) + يومين إجازة')
  assert.equal(Number(item.unpaidLeaveDeduction), 1800)
  assert.equal(Number(item.absenceDays), 0, 'أيام الإيقاف مش غياب')
  assert.equal(Number(item.netPay), 7200)
  assert.deepEqual(breakdown.leaveDeductionLines, [
    { code: 'UNPAID_LEAVE', label: 'إجازة بدون راتب', days: 2, payPercent: 0, amount: 600 },
    { code: 'SUSPENSION', label: 'أيام إيقاف عن العمل', days: 4, payPercent: 0, amount: 1200 },
  ])
  assert.deepEqual(breakdown.suspension.dates, ['2026-07-05', '2026-07-06', '2026-07-07', '2026-07-08', '2026-07-09'])
  assert.equal(breakdown.suspension.days, 4)
  const payslip = expectStatus(await request(admin, 'GET', `/payroll/items/${item.id}`), 200)
  assert.deepEqual(payslip.leaveDeductions.map(line => [line.label, line.days, line.amount]), [['إجازة بدون راتب', 2, 600], ['أيام إيقاف عن العمل', 4, 1200]])
  const report = JSON.parse((await repo('PayrollRun').findOneByOrFail({ id: run.id })).parityReport)
  const unpaid = report?.rows?.find(r => r.employeeId === emp.id)?.components?.find(c => c.code === 'UNPAID_LEAVE')
  if (unpaid) assert.equal(unpaid.policy, unpaid.legacy, 'محرك السياسة يحسب نفس عمود بدون راتب')
  t.diagnostic('Manual: day rate 9000/30 = 300; suspension 5 days minus 09/07 (already unpaid leave) = 4 × 300 = 1200; leave 2 × 300 = 600; net 9000 − 1800 = 7200.')
})
