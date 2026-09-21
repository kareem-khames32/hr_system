// اختبار شامل (الموجة أ) قبل التشغيل الفعلي: ملف الموظف + الحضور، على قاعدة SQL مؤقتة معزولة (synchronize) تُحذف في النهاية.
// لا تلمس hr_system ولا hr_review_pre_payroll إطلاقًا — نفس حارس assertDisposable الموجود في payroll-overview-filters.integration.cjs.
//
// (أ) إضافة موظف: مجموعة بيانات كاملة ترجع كما أُرسلت، ومصفوفة تحقق (حقول ناقصة/هوية/آيبان/جوال/بريد/تواريخ/تكرار/كود مرسل/طريقة صرف/رمز دولة)،
//     وتوليد الكود متسلسل بلا فجوات تحت التزامن، وعزل الفروع في الإضافة والقراءة والتعديل.
// (ب) الحضور: شهر حقيقي بمواقف (يوم عادي، تأخير، انصراف مبكر، تأخير بإذن معتمد، غياب بلا طلب، غياب بإجازة، بصمة ناقصة،
//     الساعة المرنة، إضافي بطلب معتمد + اعتماد متأخر بعد قفل الفترة، دوام يوم عطلة بالاكتشاف وبأمر HR، يوم داخل إيقاف)،
//     واتساق التقارير والملخص مع صفوف الأيام بفلاتر «من/إلى» باليوم وبالشهر.
// (ج) الخدمة الذاتية: موظف عادي يشوف حضوره هو بس.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const { writeParityReasonsBeforeApproval } = require('./fixtures/payroll-parity-reasons.cjs')
// اسم القاعدة المؤقتة لازم يطابق حارس البيئة نفسه (DISPOSABLE_DATABASE_PATTERN: hr_<اسم>_test_<16 hex>)
// وإلا الإقلاع بـDB_SYNCHRONIZE=true يُرفض — فالاسم hr_fulltest_attendance_test_<16 hex>
const database = `hr_fulltest_attendance_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-fulltest-attendance-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })

// ===== تقويم الاختبار: أغسطس 2026، والعطلة الأسبوعية الجمعة والسبت =====
// 2026-08-01 سبت ⇒ أيام العمل الأحد→الخميس. دورة الرواتب تبدأ 23 ⇒ شهر «2026-08» = 2026-07-23 → 2026-08-22.
const D_NORMAL = '2026-08-03'        // اثنين — يوم كامل عادي
const D_LATE = '2026-08-04'          // ثلاثاء — تأخير
const D_EARLY = '2026-08-05'         // أربعاء — انصراف مبكر
const D_PERM = '2026-08-06'          // خميس — تأخير بإذن معتمد
const D_WEEKEND_AUTO = '2026-08-07'  // جمعة — دوام عطلة مكتشف
const D_ABSENT = '2026-08-10'        // اثنين — غياب بلا طلب
const D_LEAVE = '2026-08-11'         // ثلاثاء — غياب مغطى بإجازة معتمدة
const D_MISSING = '2026-08-12'       // أربعاء — بصمة دخول بلا خروج
const D_FLEX_IN = '2026-08-13'       // خميس — وصول داخل نافذة المرونة
const D_WEEKEND_ORDER = '2026-08-14' // جمعة — دوام عطلة بأمر HR
const D_FLEX_OUT = '2026-08-16'      // أحد — وصول بعد نافذة المرونة
const D_OT = '2026-08-17'            // اثنين — إضافي بطلب معتمد
const D_SUSPEND = '2026-08-18'       // ثلاثاء — يوم داخل إيقاف عن العمل
const D_OT_LATE = '2026-08-19'       // أربعاء — إضافي اعتُمد بعد قفل فترته
const D_IN_CYCLE_ONLY = '2026-07-27' // اثنين — داخل شهر الرواتب 2026-08 وخارج شهر التقويم
const D_IN_MONTH_ONLY = '2026-08-25' // ثلاثاء — داخل شهر التقويم 2026-08 وخارج شهر الرواتب
const PERIOD = '2026-08', NEXT_PERIOD = '2026-09'
const CYCLE_FROM = '2026-07-23', CYCLE_TO = '2026-08-22'

let app, master, ds, base, created = false
let admin, approver, hrA, hrB, branchA, branchB, deptA, deptB, teamA, gradeA, costCenterA, workScheduleA
let fixedShift, flexShift, morningPermissionType
let employeeNumber = 0, runNumber = 0

function assertDisposable() {
  assert.match(database, /^hr_fulltest_attendance_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function request(user, method, route, body) {
  await writeParityReasonsBeforeApproval(request, user, method, route)
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(user)}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
function expectStatus(response, status) { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const query = (route, params) => `${route}?${new URLSearchParams(params).toString()}`

// مجمّع تحقّقات: فشل واحد ما يخفيش الباقي — كل المشاكل تظهر في رسالة واحدة آخر الاختبار
function checker() {
  const problems = []
  return {
    check(label, fn) { try { fn() } catch (error) { problems.push(`${label} → ${error.message}`) } },
    done() { if (problems.length) assert.fail(`${problems.length} تحقّق فشل:\n  - ${problems.join('\n  - ')}`) },
  }
}

let idSequence = 0
const uniqueDigits = () => String(Date.now()).slice(-5) + String(++idSequence % 10000).padStart(4, '0')
/** الحقول الإجبارية بقيم صالحة (سعودي: هوية 10 أرقام تبدأ بـ1) — الكود يولّده النظام. */
function requiredFields(overrides = {}) {
  const digits = uniqueDigits()
  return {
    fullName: `موظف الاختبار ${++employeeNumber}`, nationality: 'سعودي', gender: 'male', birthDate: '1990-01-01',
    phone: '0501234567', nationalId: `1${digits}`, fingerprintCode: `7${digits}`, jobTitle: 'محاسب',
    branchId: branchA.id, departmentId: deptA.id, joinDate: '2026-01-01', basicSalary: 9000,
    ...overrides,
  }
}
const createEmployee = (user, overrides = {}) => request(user, 'POST', '/employees', requiredFields(overrides))
async function apiEmployee(overrides = {}) { return expectStatus(await createEmployee(admin, overrides), 201) }

/** موظف حضور: وردية ثابتة مسنودة على كل أيام الاختبار + حساب خدمة ذاتية. */
async function attendanceEmployee(shift, dates, overrides = {}) {
  // أجر التعيين موثّق من شهر الاختبار نفسه، وإلا المسير يرفض تسعير الإضافي (OT_SALARY_MONTH_EVIDENCE_REQUIRED)
  const emp = await apiEmployee({ salaryEffectivePayrollPeriod: PERIOD, ...overrides })
  expectStatus(await request(admin, 'POST', '/attendance/schedule/day/bulk',
    { employeeIds: [emp.id], dates, shiftId: shift.id }), 201)
  const user = await repo('User').save({ email: `self${emp.id}@fulltest-attendance.invalid`, displayName: emp.fullName,
    passwordHash: 'isolated-test-token-only', role: 'employee', branchId: emp.branchId, employeeId: emp.id, permissions: '[]' })
  return { emp, user }
}
async function punch(emp, date, times) {
  const punches = times.map(clock => ({ employeeCode: emp.fingerprintCode, timestamp: new Date(`${date}T${clock}:00`).toISOString() }))
  return expectStatus(await request(admin, 'POST', '/attendance/punches/manual', { punches, reason: 'بصمات اختبار شامل في قاعدة معزولة' }), 201)
}
const dayRow = (employeeId, date) => repo('AttendanceDay').findOne({ where: { employeeId, date } })
const recompute = async date => expectStatus(await request(admin, 'POST', `/attendance/recompute?date=${date}`), 201)
const overtimeEntries = (employeeId, date) => repo('OvertimeEntry').find({ where: { employeeId, date }, order: { id: 'ASC' } })

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME,
    password: env.DB_PASSWORD, database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`

  branchA = await repo('Branch').save({ code: 'FTA', name: 'فرع الاختبار أ', country: 'SA', weekendDays: 'FRI,SAT' })
  branchB = await repo('Branch').save({ code: 'FTB', name: 'فرع الاختبار ب', country: 'SA', weekendDays: 'FRI,SAT' })
  deptA = await repo('Department').save({ name: 'قسم العمليات', branchId: branchA.id, isActive: true })
  deptB = await repo('Department').save({ name: 'قسم فرع ب', branchId: branchB.id, isActive: true })
  teamA = await repo('Team').save({ name: 'فريق الشمال', departmentId: deptA.id, isActive: true })
  gradeA = await repo('Grade').save({ name: 'الدرجة الخامسة', minSalary: 5000, maxSalary: 20000, isActive: true })
  costCenterA = await repo('CostCenter').save({ code: 'CC-FT', name: 'مركز تكلفة الاختبار', isActive: true })
  workScheduleA = await repo('WorkSchedule').save({ name: 'جدول الاختبار', weekendDays: 'FRI,SAT', startTime: '09:00', endTime: '18:00',
    isDefault: false, isActive: true, branchId: null })

  admin = await repo('User').save({ email: 'admin@fulltest-attendance.invalid', displayName: 'مدير النظام', passwordHash: 'isolated-test-token-only',
    role: 'super_admin', branchId: null, employeeId: null, permissions: JSON.stringify(['*']) })
  // فصل المهام: من يعتمد المسير غير من احتسبه (PAYRUN-STATE-003)
  approver = await repo('User').save({ email: 'approver@fulltest-attendance.invalid', displayName: 'معتمد المسير', passwordHash: 'isolated-test-token-only',
    role: 'super_admin', branchId: null, employeeId: null, permissions: JSON.stringify(['*']) })
  const branchPerms = JSON.stringify(['employees.view', 'employees.create', 'employees.edit', 'employees.archive',
    'attendance.manage', 'attendance.view_all', 'overtime.confirm', 'reports.view', 'requests.view_all', 'payroll.view'])
  hrA = await repo('User').save({ email: 'hr-a@fulltest-attendance.invalid', displayName: 'موارد بشرية أ', passwordHash: 'isolated-test-token-only',
    role: 'hr_manager', branchId: branchA.id, employeeId: null, permissions: branchPerms })
  hrB = await repo('User').save({ email: 'hr-b@fulltest-attendance.invalid', displayName: 'موارد بشرية ب', passwordHash: 'isolated-test-token-only',
    role: 'hr_manager', branchId: branchB.id, employeeId: null, permissions: branchPerms })

  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '23' }, { key: 'payroll.monthly_days', value: '30' }, { key: 'payroll.daily_hours', value: '8' },
    { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' }, { key: 'payroll.exempt_overtime_eligible', value: 'false' },
    { key: 'payroll.exempt_unpaid_leave_deductible', value: 'true' },
    // السماحية العامة 30 والوردية 10 — قيمتان مختلفتان عمدًا حتى يثبت الاختبار أن سماحية الوردية هي السارية بلا جمع
    { key: 'attendance.weekend_days', value: 'FRI,SAT' }, { key: 'attendance.grace_minutes', value: '30' },
    { key: 'overtime.request_backdate_days', value: '400' }, { key: 'leave.annual_entitled', value: '21' },
  ])

  // ورديتان مؤرختان: ثابتة 09:00→18:00 بسماحية 10 دقائق، ومرنة بنافذة 60 دقيقة
  fixedShift = expectStatus(await request(admin, 'POST', '/catalogs/shifts', { name: 'وردية ثابتة للاختبار', startTime: '09:00', endTime: '18:00',
    shiftMode: 'fixed', graceMinutes: 10, flexEnabled: false, flexWindowMinutes: null, requiredWorkMinutes: 540, isActive: true,
    effectiveFrom: '2026-01-01', changeReason: 'وردية ثابتة لاختبار الموجة أ' }), 201)
  flexShift = expectStatus(await request(admin, 'POST', '/catalogs/shifts', { name: 'وردية مرنة للاختبار', startTime: '09:00', endTime: '18:00',
    shiftMode: 'flexible', graceMinutes: 10, flexEnabled: true, flexWindowMinutes: 60, requiredWorkMinutes: 540, isActive: true,
    effectiveFrom: '2026-01-01', changeReason: 'وردية مرنة لاختبار الساعة المرنة' }), 201)
  morningPermissionType = await repo('PermissionType').save({ nameAr: 'إذن تأخير صباحي', isDeductible: false, coverage: 'morning', isActive: true })

  // أنواع الطلبات المستخدمة: استئذان، عمل إضافي، دوام يوم عطلة — كلها بخطوة اعتماد موارد بشرية واحدة
  for (const [code, nameAr, handler, fields] of [
    ['PERMISSION', 'استئذان', 'attendance_log', ['date', 'from', 'to']],
    ['OVERTIME', 'عمل إضافي', 'overtime_entries', ['date', 'hours']],
    ['HOLIDAY_WORK', 'دوام يوم عطلة', 'holiday_work', ['dates']],
  ]) {
    if (await repo('RequestType').findOneBy({ code })) continue
    const chain = await repo('ApprovalChain').save({ code: `FT_${code}`, nameAr: `اعتماد ${nameAr}`, requestTypeCode: code, isActive: true, autoApprove: false })
    await repo('ApprovalStep').save({ chainId: chain.id, stepOrder: 1, approverRole: 'hr' })
    await repo('RequestType').save({ code, nameAr, category: 'time_attendance', isActive: true, approvalChainId: chain.id,
      destinationHandler: handler, requiredFields: JSON.stringify(fields) })
  }
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assertDisposable()
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try { fs.rmSync(uploads, { recursive: true, force: true }) } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Full-test (employees + attendance) fixture cleanup failed')
})

// ============================================================
// (أ) إضافة الموظف
// ============================================================

test('أ1 — مجموعة بيانات كاملة: كل قيمة أُرسلت ترجع كما هي عند القراءة', async () => {
  const digits = uniqueDigits()
  const payload = {
    fingerprintCode: `9${digits}`, fullName: 'سعيد عبدالله القحطاني', fullNameEn: 'Saeed Abdullah Alqahtani',
    email: `saeed.${digits}@fulltest.invalid`, personalEmail: `saeed.personal.${digits}@fulltest.invalid`,
    phone: '0512345678', phoneAlt: '0512345679', nationalId: `1${digits}`, passportNo: `A${digits}`, passportExpiry: '2030-05-20',
    birthDate: '1988-04-12', birthPlace: 'الرياض', gender: 'male', maritalStatus: 'married', nationality: 'سعودي',
    address: 'حي النرجس، شارع الأمير', country: 'SA', postalCode: '13323',
    emergencyContactName: 'أم سعيد', emergencyRelation: 'زوجة', emergencyContactPhone: '0512345670', emergencyPhoneAlt: '0512345671',
    jobTitle: 'مدير مشروع', branchId: branchA.id, departmentId: deptA.id, teamId: teamA.id, costCenterId: costCenterA.id,
    workScheduleId: workScheduleA.id, flexOverrideMode: 'DISABLED', attendanceEffectiveFrom: '2024-03-15',
    attendanceChangeReason: 'إسناد جدول العمل عند إنشاء الملف', annualLeaveEntitled: true,
    joinDate: '2024-03-15', salaryEntitlementStart: '2024-04-01', actualStartDate: '2024-03-18', workType: 'full_time',
    probationEndDate: '2024-06-18', recruitmentSource: 'إعلان', gradeId: gradeA.id, workLocation: 'المقر الرئيسي',
    contractType: 'fixed_term', contractStart: '2024-03-15', contractEnd: '2027-03-14', contractNumber: `CT-${digits}`,
    contractDurationMonths: 36, noticePeriodDays: 60, status: 'active', currency: 'SAR', salaryCycle: 'monthly',
    basicSalary: 12000, housingAllowance: 3000, transportAllowance: 800, phoneAllowance: 150, workNatureAllowance: 250,
    otherAllowance: 100, payMethod: 'mixed', bankTransferAmount: 10000.5, bankName: 'بنك الاختبار', bankBranch: 'فرع العليا',
    iban: 'SA0380000000608010167519', gosiNumber: `GOSI-${digits}`, isGosiRegistered: true, gosiBaseSalary: 15000,
    openingBalanceDays: 7, openingBalanceExpiry: '2026-12-31',
    salaryEffectivePayrollPeriod: NEXT_PERIOD, salaryEvidenceReference: `عقد CT-${digits}`,
  }
  const saved = expectStatus(await request(admin, 'POST', '/employees', payload), 201)
  const read = expectStatus(await request(admin, 'GET', `/employees/${saved.id}`), 200)
  const { check, done } = checker()
  const dateOnly = value => value == null ? null : String(value instanceof Date ? value.toISOString() : value).slice(0, 10)
  const text = ['fingerprintCode', 'fullName', 'fullNameEn', 'email', 'personalEmail', 'phone', 'phoneAlt', 'nationalId', 'passportNo',
    'birthPlace', 'gender', 'maritalStatus', 'nationality', 'address', 'country', 'postalCode', 'emergencyContactName', 'emergencyRelation',
    'emergencyContactPhone', 'emergencyPhoneAlt', 'jobTitle', 'workType', 'recruitmentSource', 'workLocation', 'contractType',
    'contractNumber', 'status', 'currency', 'salaryCycle', 'payMethod', 'bankName', 'bankBranch', 'iban', 'gosiNumber']
  for (const key of text) check(`الحقل ${key}`, () => assert.equal(read[key], payload[key]))
  const dates = ['passportExpiry', 'birthDate', 'joinDate', 'salaryEntitlementStart', 'actualStartDate', 'probationEndDate', 'contractStart', 'contractEnd']
  for (const key of dates) check(`التاريخ ${key}`, () => assert.equal(dateOnly(read[key]), payload[key]))
  const numbers = ['branchId', 'departmentId', 'teamId', 'costCenterId', 'gradeId', 'contractDurationMonths', 'noticePeriodDays',
    'basicSalary', 'housingAllowance', 'transportAllowance', 'phoneAllowance', 'workNatureAllowance', 'otherAllowance',
    'bankTransferAmount', 'gosiBaseSalary']
  for (const key of numbers) check(`الرقم ${key}`, () => assert.equal(Number(read[key]), Number(payload[key])))
  check('workScheduleId (مؤرخ)', () => assert.equal(Number(read.workScheduleId), workScheduleA.id))
  check('flexOverrideMode (مؤرخ)', () => assert.equal(read.flexOverrideMode, 'DISABLED'))
  check('annualLeaveEntitled', () => assert.equal(read.annualLeaveEntitled, true))
  check('isGosiRegistered', () => assert.equal(read.isGosiRegistered, true))
  check('الكود يولّده النظام بصيغة EMP-####', () => assert.match(String(read.employeeCode), /^EMP-\d{4}$/))
  // الرصيد الافتتاحي حقل حمولة — أثره على طبقة الرصيد السنوي
  const annual = await repo('LeaveBalance').findOne({ where: { employeeId: saved.id, balanceType: 'annual', period: String(new Date().getFullYear()) } })
  check('الرصيد الافتتاحي 7 أيام على رصيد السنوي', () => assert.equal(Number(annual?.openingDays), 7))
  check('صلاحية الرصيد الافتتاحي', () => assert.equal(dateOnly(annual?.openingExpiry), '2026-12-31'))
  // «يسري من راتب شهر» ومرجعه — سجل الأجر المؤرخ
  const history = await ds.query(`SELECT TOP 1 h.[effectivePayrollPeriod], v.[evidenceReference] FROM dbo.employee_salary_history h
    INNER JOIN dbo.employee_salary_history_versions v ON v.[id] = h.[versionId]
    WHERE v.[employeeId] = @0 ORDER BY v.[id] DESC, h.[sequence] DESC`, [saved.id]).catch(error => [{ error: error.message }])
  check('أجر التعيين موثّق من الشهر المرسل', () => assert.equal(history[0]?.effectivePayrollPeriod, NEXT_PERIOD, JSON.stringify(history[0])))
  check('مرجع أجر التعيين محفوظ كما أُرسل', () => assert.equal(history[0]?.evidenceReference, payload.salaryEvidenceReference, JSON.stringify(history[0])))
  done()
})

test('أ2 — مصفوفة التحقق عند الإضافة: كل مدخل غلط يُرفض برسالة، والكود المرسل يُتجاهل', async () => {
  const { check, done } = checker()
  const reject = async (label, overrides, expected = 400) => {
    const response = await createEmployee(admin, overrides)
    check(label, () => assert.equal(response.status, expected, JSON.stringify(response.body)))
    return response
  }
  // حقول إجبارية ناقصة
  for (const [field, value] of [['fullName', undefined], ['birthDate', undefined], ['gender', undefined], ['nationality', undefined],
    ['nationalId', undefined], ['phone', undefined], ['fingerprintCode', undefined], ['joinDate', undefined],
    ['departmentId', undefined], ['jobTitle', undefined], ['basicSalary', undefined]]) {
    await reject(`حقل إجباري ناقص: ${field}`, { [field]: value })
  }
  // أشكال غلط
  await reject('هوية سعودي بـ9 أرقام', { nationalId: '123456789' })
  await reject('هوية سعودي تبدأ بـ2', { nationalId: '2123456789' })
  await reject('هوية بحروف', { nationalId: '1abcdefghi' })
  await reject('آيبان غير صالح', { iban: '12345', payMethod: 'transfer', bankName: 'بنك' })
  await reject('جوال غير صالح', { phone: '123' })
  await reject('بريد غير صالح', { email: 'not-an-email' })
  await reject('تاريخ ميلاد في المستقبل', { birthDate: '2030-01-01' })
  await reject('الاسم بالإنجليزي في خانة الاسم العربي', { fullName: 'Saeed Alqahtani' })
  await reject('اسم واحد بالعربي', { fullName: 'سعيد' })
  await reject('راتب أساسي صفر', { basicSalary: 0 })
  await reject('نهاية العقد قبل بدايته', { contractStart: '2026-05-01', contractEnd: '2026-04-01' })
  await reject('بداية استحقاق الراتب قبل التعيين', { joinDate: '2026-01-01', salaryEntitlementStart: '2025-12-01' })
  await reject('قسم من فرع آخر', { branchId: branchA.id, departmentId: deptB.id })
  await reject('«نقدي + بنك» بلا مبلغ تحويل', { payMethod: 'mixed', bankName: 'بنك', iban: 'SA0380000000608010167519' })
  await reject('«نقدي + بنك» بمبلغ سالب', { payMethod: 'mixed', bankTransferAmount: -100, bankName: 'بنك', iban: 'SA0380000000608010167519' })
  await reject('«نقدي + بنك» بمبلغ صفر', { payMethod: 'mixed', bankTransferAmount: 0, bankName: 'بنك', iban: 'SA0380000000608010167519' })
  await reject('تحويل بنكي بلا اسم بنك', { payMethod: 'transfer', iban: 'SA0380000000608010167519' })
  await reject('تحويل بنكي بلا آيبان', { payMethod: 'transfer', bankName: 'بنك' })


  // التكرار
  const first = await apiEmployee()
  const dupId = await createEmployee(admin, { nationalId: first.nationalId })
  check('تكرار رقم الهوية يُرفض 409', () => assert.equal(dupId.status, 409, JSON.stringify(dupId.body)))
  const dupFp = await createEmployee(admin, { fingerprintCode: first.fingerprintCode })
  check('تكرار رقم البصمة يُرفض 409', () => assert.equal(dupFp.status, 409, JSON.stringify(dupFp.body)))

  // كود مرسل من العميل يُتجاهل، والنظام يولّد EMP-####
  const supplied = expectStatus(await createEmployee(admin, { employeeCode: 'CLIENT-999' }), 201)
  check('كود الموظف المرسل من العميل يُتجاهل', () => assert.notEqual(supplied.employeeCode, 'CLIENT-999'))
  check('الكود المولّد بصيغة EMP-####', () => assert.match(String(supplied.employeeCode), /^EMP-\d{4}$/))

  // رمز الدولة ISO (SA) — النموذج بقى يخزّن رمزًا بدل اسم
  const iso = await createEmployee(admin, { country: 'SA' })
  check('رمز الدولة ISO مقبول', () => assert.equal(iso.status, 201, JSON.stringify(iso.body)))
  if (iso.status === 201) check('رمز الدولة يُحفظ كما هو', () => assert.equal(iso.body.country, 'SA'))
  done()
})

test('أ3 — توليد الكود متسلسل بلا فجوات ولا تكرار تحت الإنشاء المتزامن', async () => {
  const before = (await repo('Employee').find({ select: { employeeCode: true } }))
    .map(row => Number(/^EMP-?(\d+)$/.exec(String(row.employeeCode))?.[1] ?? 0))
  const maxBefore = Math.max(0, ...before)
  const batch = 6
  const responses = await Promise.all(Array.from({ length: batch }, () => createEmployee(admin)))
  const { check, done } = checker()
  check('كل الإنشاءات المتزامنة نجحت', () => assert.deepEqual(responses.map(r => r.status), Array(batch).fill(201),
    JSON.stringify(responses.map(r => r.body?.message ?? r.status))))
  const codes = responses.filter(r => r.status === 201).map(r => r.body.employeeCode).sort()
  check('لا تكرار في الأكواد', () => assert.equal(new Set(codes).size, codes.length, codes.join(',')))
  const numbers = codes.map(code => Number(/^EMP-(\d+)$/.exec(code)[1])).sort((a, b) => a - b)
  check('متسلسلة بلا فجوات بعد أكبر رقم قائم', () =>
    assert.deepEqual(numbers, Array.from({ length: numbers.length }, (_, i) => maxBefore + 1 + i), codes.join(',')))
  done()
})

test('أ4 — عزل الفروع: حساب فرع أ لا ينشئ ولا يقرأ ولا يعدّل موظف فرع ب', async t => {
  const { check, done } = checker()
  const inB = await apiEmployee({ branchId: branchB.id, departmentId: deptB.id })
  // القراءة
  const read = await request(hrA, 'GET', `/employees/${inB.id}`)
  check('قراءة موظف فرع آخر تُرفض', () => assert.equal(read.status, 404, JSON.stringify(read.body)))
  const list = expectStatus(await request(hrA, 'GET', '/employees'), 200)
  check('القائمة لا تحتوي موظف الفرع الآخر', () => assert.equal(list.some(row => row.id === inB.id), false))
  // التعديل
  const patch = await request(hrA, 'PATCH', `/employees/${inB.id}`, { jobTitle: 'مسمى جديد' })
  check('تعديل موظف فرع آخر يُرفض', () => assert.equal(patch.status, 404, JSON.stringify(patch.body)))
  // الإنشاء: الفرع المرسل يُستبدل بنطاق المستخدم (الكنترولر) — فالموظف لا يقع في فرع ب
  const createInB = await request(hrA, 'POST', '/employees', requiredFields({ branchId: branchB.id, departmentId: deptB.id }))
  t.diagnostic(`إنشاء بفرع خارج النطاق → HTTP ${createInB.status}، الفرع المحفوظ ${createInB.body?.branchId ?? '—'} (نطاق المستخدم ${branchA.id}، المرسل ${branchB.id})`)
  check('إنشاء داخل فرع آخر لا ينجح كما أُرسل', () => assert.notEqual(
    createInB.status === 201 ? createInB.body.branchId : -1, branchB.id, JSON.stringify(createInB.body)))
  // نفس المحاولة بقسم من فرع المستخدم: الكنترولر بيستبدل الفرع بنطاق المستخدم — نرصد هل بيرفض ولا بيصحّح بصمت
  const silent = await request(hrA, 'POST', '/employees', requiredFields({ branchId: branchB.id, departmentId: deptA.id }))
  t.diagnostic(`إنشاء بفرع خارج النطاق وقسم داخل النطاق → HTTP ${silent.status}، الفرع المحفوظ ${silent.body?.branchId ?? '—'}`)
  check('الموظف لا يُحفظ أبدًا في فرع خارج نطاق المستخدم', () =>
    assert.notEqual(silent.status === 201 ? silent.body.branchId : -1, branchB.id, JSON.stringify(silent.body)))
  // نقل موظف من فرعه خارج النطاق
  const mine = await apiEmployee()
  const move = await request(hrA, 'PATCH', `/employees/${mine.id}`, { branchId: branchB.id })
  check('نقل الموظف خارج نطاق الفرع يُرفض 403', () => assert.equal(move.status, 403, JSON.stringify(move.body)))
  done()
})

test('أ5 — حدود التعديل والتعيين المستقبلي: التكرار يُرفض، والكود لا يُعدَّل، ولا غياب قبل التعيين', async t => {
  const { check, done } = checker()
  const one = await apiEmployee()
  const two = await apiEmployee()
  const dupId = await request(admin, 'PATCH', `/employees/${two.id}`, { nationalId: one.nationalId })
  check('تعديل برقم هوية مستخدم يُرفض 409', () => assert.equal(dupId.status, 409, JSON.stringify(dupId.body)))
  const dupFp = await request(admin, 'PATCH', `/employees/${two.id}`, { fingerprintCode: one.fingerprintCode })
  check('تعديل برقم بصمة مستخدم يُرفض 409', () => assert.equal(dupFp.status, 409, JSON.stringify(dupFp.body)))
  expectStatus(await request(admin, 'PATCH', `/employees/${two.id}`, { employeeCode: 'HACK-1' }), 200)
  const afterCode = expectStatus(await request(admin, 'GET', `/employees/${two.id}`), 200)
  check('كود الموظف لا يُعدَّل من العميل', () => assert.equal(afterCode.employeeCode, two.employeeCode))
  const clearRequired = await request(admin, 'PATCH', `/employees/${two.id}`, { nationalId: '' })
  check('مسح حقل إجباري في التعديل يُرفض', () => assert.equal(clearRequired.status, 400, JSON.stringify(clearRequired.body)))

  // التعيين المستقبلي: نرصد القبول/الرفض ثم نثبت النتيجة المالية المهمة — لا غياب قبل يوم التعيين
  const future = await createEmployee(admin, { joinDate: '2026-12-01' })
  t.diagnostic(`تاريخ تعيين في المستقبل (2026-12-01) → HTTP ${future.status} ${JSON.stringify(future.body?.message ?? future.body?.employeeCode ?? '')}`)
  check('تاريخ تعيين في المستقبل: القرار واضح (قبول أو رفض 400)', () => assert.ok([201, 400].includes(future.status), JSON.stringify(future.body)))
  if (future.status === 201) {
    expectStatus(await request(admin, 'POST', `/attendance/recompute?date=${D_NORMAL}`), 201)
    const early = await dayRow(future.body.id, D_NORMAL)
    check('الموظف المعيَّن مستقبلاً: لا صف غياب قبل تاريخ تعيينه', () => assert.equal(early, null, JSON.stringify(early)))
  }
  // هل في سقف أعلى لتاريخ التعيين؟ (غلطة كتابة في السنة)
  const absurd = await createEmployee(admin, { joinDate: '2126-01-01' })
  t.diagnostic(`تاريخ تعيين بعد 100 سنة (2126-01-01) → HTTP ${absurd.status} ${JSON.stringify(absurd.body?.message ?? absurd.body?.employeeCode ?? '')}`)
  check('تاريخ تعيين بعد 100 سنة: النظام يرد بقرار واضح (لا 500)', () => assert.ok([201, 400].includes(absurd.status), JSON.stringify(absurd.body)))
  done()
})

// ============================================================
// (ب) الحضور — شهر حقيقي من المواقف
// ============================================================

const SCHEDULED_DAYS = [D_IN_CYCLE_ONLY, D_NORMAL, D_LATE, D_EARLY, D_PERM, D_WEEKEND_AUTO, D_ABSENT, D_LEAVE, D_MISSING,
  D_FLEX_IN, D_WEEKEND_ORDER, D_FLEX_OUT, D_OT, D_SUSPEND, D_OT_LATE, D_IN_MONTH_ONLY]
let core, flex, holidayAuto, holidayOrder, overtimeSelf, lateOvertime, suspended

test('ب1 — يوم عادي، تأخير، انصراف مبكر، وتأخير مغطى بإذن معتمد (بلا خصم)', async () => {
  core = await attendanceEmployee(fixedShift, SCHEDULED_DAYS, { joinDate: '2026-01-01' })
  await punch(core.emp, D_NORMAL, ['09:00', '18:00'])
  await punch(core.emp, D_LATE, ['09:45', '18:00'])
  await punch(core.emp, D_EARLY, ['09:00', '17:00'])
  // إذن صباحي معتمد 09:00→10:00 ثم وصول 10:00
  await repo('Request').save({ requesterId: core.emp.id, typeCode: 'PERMISSION', status: 'APPROVED', branchId: branchA.id,
    payload: JSON.stringify({ date: D_PERM, from: '09:00', to: '10:00', permissionTypeId: morningPermissionType.id, permissionType: morningPermissionType.nameAr }) })
  await punch(core.emp, D_PERM, ['10:00', '18:00'])

  const { check, done } = checker()
  const normal = await dayRow(core.emp.id, D_NORMAL)
  check('يوم عادي: حاضر', () => assert.equal(normal.status, 'present'))
  check('يوم عادي: بلا تأخير', () => assert.equal(normal.lateMinutes, 0))
  check('يوم عادي: بلا انصراف مبكر', () => assert.equal(normal.earlyLeaveMinutes, 0))
  check('يوم عادي: 540 دقيقة عمل', () => assert.equal(normal.workMinutes, 540))

  const late = await dayRow(core.emp.id, D_LATE)
  check('تأخير: الحالة late', () => assert.equal(late.status, 'late'))
  check('تأخير: 45 دقيقة (السماحية 10 عتبة لا تُخصم من الرقم)', () => assert.equal(late.lateMinutes, 45))
  check('تأخير: السماحية السارية = سماحية الوردية 10 لا العامة 30', () => assert.equal(late.graceUsed, 10))

  const early = await dayRow(core.emp.id, D_EARLY)
  check('انصراف مبكر: الحالة early_leave', () => assert.equal(early.status, 'early_leave'))
  check('انصراف مبكر: 60 دقيقة', () => assert.equal(early.earlyLeaveMinutes, 60))
  check('انصراف مبكر: بلا تأخير', () => assert.equal(early.lateMinutes, 0))

  const perm = await dayRow(core.emp.id, D_PERM)
  check('تأخير بإذن: بلا خصم تأخير', () => assert.equal(perm.lateMinutes, 0))
  check('تأخير بإذن: 60 دقيقة معذورة', () => assert.equal(perm.excusedMinutes, 60))
  check('تأخير بإذن: التأخير الخام مسجّل 60', () => assert.equal(perm.rawLateMinutes, 60))
  check('تأخير بإذن: الحالة حاضر', () => assert.equal(perm.status, 'present'))
  check('تأخير بإذن: لا دقائق قابلة للخصم', () => assert.equal(perm.deductibleMinutes, 0))
  done()
})

test('ب2 — غياب بلا طلب، غياب مغطى بإجازة معتمدة، وبصمة ناقصة', async () => {
  // إجازة معتمدة تغطي يوم كامل
  await repo('Leave').save({ employeeId: core.emp.id, leaveTypeCode: 'ANNUAL', fromDate: D_LEAVE, toDate: D_LEAVE,
    days: 1, period: 'FULL', isUnpaid: false, status: 'APPROVED' })
  await punch(core.emp, D_MISSING, ['09:00'])
  for (const date of [D_ABSENT, D_LEAVE]) expectStatus(await request(admin, 'POST', `/attendance/recompute?date=${date}`), 201)

  const { check, done } = checker()
  const absent = await dayRow(core.emp.id, D_ABSENT)
  check('غياب بلا طلب: صف محفوظ', () => assert.ok(absent, 'لا يوجد صف حضور ليوم الغياب'))
  check('غياب بلا طلب: الحالة absent', () => assert.equal(absent?.status, 'absent'))
  const leave = await dayRow(core.emp.id, D_LEAVE)
  check('غياب بإجازة معتمدة: الحالة leave لا absent', () => assert.equal(leave?.status, 'leave'))
  check('غياب بإجازة معتمدة: بلا خصم تأخير', () => assert.equal(Number(leave?.lateMinutes ?? 0), 0))
  const missing = await dayRow(core.emp.id, D_MISSING)
  check('بصمة ناقصة: الحالة missing_punch', () => assert.equal(missing?.status, 'missing_punch'))
  check('بصمة ناقصة: بصمة الدخول محفوظة', () => assert.equal(String(missing?.checkIn ?? '').slice(0, 5), '09:00'))
  check('بصمة ناقصة: لا بصمة خروج', () => assert.equal(missing?.checkOut ?? null, null))
  done()
})

test('ب3 — الساعة المرنة: النافذة تعفي داخلها، وبعدها التأخير كامل بلا سماحية مُضافة مرتين', async () => {
  flex = await attendanceEmployee(flexShift, [D_FLEX_IN, D_FLEX_OUT], { joinDate: '2026-01-01' })
  await punch(flex.emp, D_FLEX_IN, ['09:50', '18:50'])   // داخل نافذة 60 دقيقة (تنتهي 10:00)
  await punch(flex.emp, D_FLEX_OUT, ['10:05', '19:05'])  // بعد النافذة بـ5 دقائق

  const { check, done } = checker()
  const inside = await dayRow(flex.emp.id, D_FLEX_IN)
  check('داخل النافذة: بلا تأخير', () => assert.equal(inside.lateMinutes, 0))
  check('داخل النافذة: الحالة حاضر', () => assert.equal(inside.status, 'present'))
  check('داخل النافذة: النتيجة WITHIN_WINDOW', () => assert.equal(inside.flexOutcome, 'WITHIN_WINDOW'))
  check('داخل النافذة: لا نقص ساعات', () => assert.equal(inside.shortfallMinutes, 0))

  const outside = await dayRow(flex.emp.id, D_FLEX_OUT)
  check('بعد النافذة: النتيجة AFTER_WINDOW', () => assert.equal(outside.flexOutcome, 'AFTER_WINDOW'))
  check('بعد النافذة: التأخير 65 دقيقة من بداية الوردية (لا 55 بسماحية مكررة ولا 5 من نهاية النافذة)',
    () => assert.equal(outside.lateMinutes, 65))
  check('بعد النافذة: التأخير الخام 65', () => assert.equal(outside.rawLateMinutes, 65))
  check('بعد النافذة: أكمل الساعات المطلوبة فلا نقص', () => assert.equal(outside.shortfallMinutes, 0))
  done()
})

test('ب4 — دوام يوم عطلة: المكتشف من البصمة، وأمر HR يحوّله لبدل دوام العطلات بدل الإضافي ومرة واحدة', async () => {
  holidayAuto = await attendanceEmployee(fixedShift, [D_WEEKEND_AUTO], { joinDate: '2026-01-01' })
  holidayOrder = await attendanceEmployee(fixedShift, [D_WEEKEND_ORDER], { joinDate: '2026-01-01' })
  await punch(holidayAuto.emp, D_WEEKEND_AUTO, ['10:00', '14:00'])
  await punch(holidayOrder.emp, D_WEEKEND_ORDER, ['10:00', '14:00'])

  const { check, done } = checker()
  const autoDay = await dayRow(holidayAuto.emp.id, D_WEEKEND_AUTO)
  check('يوم الجمعة: الحالة holiday', () => assert.equal(autoDay.status, 'holiday'))
  check('يوم الجمعة: 240 دقيقة عمل', () => assert.equal(autoDay.workMinutes, 240))
  check('يوم الجمعة: بلا تأخير ولا انصراف مبكر', () => assert.equal(autoDay.lateMinutes + autoDay.earlyLeaveMinutes, 0))
  const autoOt = (await overtimeEntries(holidayAuto.emp.id, D_WEEKEND_AUTO)).filter(row => row.status !== 'REJECTED')
  check('بلا أمر: الإضافي يُكتشف من البصمة مرة واحدة', () => assert.equal(autoOt.length, 1, JSON.stringify(autoOt)))
  check('بلا أمر: مصدره BIOMETRIC_DETECTED', () => assert.equal(autoOt[0]?.source, 'BIOMETRIC_DETECTED'))
  check('بلا أمر: 4 ساعات مكتشفة', () => assert.equal(Number(autoOt[0]?.hoursActual), 4))
  check('بلا أمر: مُضاعِف الويك إند 1.5', () => assert.equal(Number(autoOt[0]?.rate), 1.5))

  // أمر «دوام يوم عطلة» من HR لنفس اليوم
  const order = expectStatus(await request(hrA, 'POST', '/attendance/holiday-work', { name: 'جرد يوم الجمعة', targetLevel: 'employees',
    branchId: branchA.id, employeeIds: [holidayOrder.emp.id], dates: [D_WEEKEND_ORDER] }), 201).order
  expectStatus(await request(admin, 'POST', `/attendance/recompute?date=${D_WEEKEND_ORDER}`), 201)
  const orderedOt = (await overtimeEntries(holidayOrder.emp.id, D_WEEKEND_ORDER)).filter(row => !['REJECTED', 'CANCELLED'].includes(row.status))
  check('بأمر HR: لا يبقى إضافي مكتشف فعّال (بدل دوام العطلات بدله)', () => assert.deepEqual(orderedOt.map(r => r.status), [], JSON.stringify(orderedOt)))
  const detail = expectStatus(await request(hrA, 'GET', `/attendance/holiday-work/${order.id}`), 200).order
  const lines = (detail.rows ?? []).filter(line => String(line.date).slice(0, 10) === D_WEEKEND_ORDER)
  check('بأمر HR: اليوم يظهر في تفصيل الأمر مرة واحدة', () => assert.equal(lines.length, 1, JSON.stringify(detail)))
  check('بأمر HR: 4 ساعات في تفصيل الأمر ومحسوبة', () => assert.deepEqual([Number(lines[0]?.hours), lines[0]?.counted], [4, true], JSON.stringify(lines[0])))
  check('بأمر HR: اليوم محسوب مرة واحدة في ملخص الأمر', () =>
    assert.deepEqual([detail.summary?.countedDays, detail.summary?.totalHours], [1, 4], JSON.stringify(detail.summary)))
  const orderedDay = await dayRow(holidayOrder.emp.id, D_WEEKEND_ORDER)
  check('بأمر HR: اليوم يفضل holiday بمدته', () => assert.deepEqual([orderedDay.status, orderedDay.workMinutes], ['holiday', 240]))

  // إعادة الحساب لا تكرّر: لا قيد إضافي جديد ولا سطر ثاني في الأمر
  expectStatus(await request(admin, 'POST', `/attendance/recompute?date=${D_WEEKEND_ORDER}`), 201)
  const afterAgain = expectStatus(await request(hrA, 'GET', `/attendance/holiday-work/${order.id}`), 200).order
  check('إعادة الحساب: الأمر لسه بيوم واحد بـ4 ساعات', () =>
    assert.deepEqual([afterAgain.summary?.countedDays, afterAgain.summary?.totalHours], [1, 4], JSON.stringify(afterAgain.summary)))
  const stillNoOt = (await overtimeEntries(holidayOrder.emp.id, D_WEEKEND_ORDER)).filter(row => !['REJECTED', 'CANCELLED'].includes(row.status))
  check('إعادة الحساب: لا يظهر إضافي مكتشف لليوم من جديد', () => assert.deepEqual(stillNoOt.map(r => r.status), []))
  const orders = expectStatus(await request(hrA, 'GET', '/attendance/holiday-work'), 200)
  const forAuto = (orders.orders ?? []).filter(row => (row.dates ?? []).includes(D_WEEKEND_AUTO))
  check('اليوم المكتشف بلا أمر: مالوش أمر دوام عطلة (فلا بدل + إضافي معًا)', () => assert.deepEqual(forAuto, []))
  done()
})

test('ب5 — يوم داخل فترة إيقاف عن العمل: يُتخطى ولا يُحفظ غيابًا (فلا يُخصم مرتين)', async () => {
  suspended = await attendanceEmployee(fixedShift, [D_SUSPEND], { joinDate: '2026-01-01' })
  // غياب محفوظ قبل تسجيل الإيقاف
  expectStatus(await request(admin, 'POST', `/attendance/recompute?date=${D_SUSPEND}`), 201)
  const before = await dayRow(suspended.emp.id, D_SUSPEND)
  const { check, done } = checker()
  check('قبل الإيقاف: اليوم غياب محفوظ', () => assert.equal(before?.status, 'absent'))

  expectStatus(await request(hrA, 'POST', `/employees/${suspended.emp.id}/suspensions`,
    { fromDate: D_SUSPEND, toDate: D_SUSPEND, reason: 'إيقاف عن العمل للتحقيق — اختبار معزول' }), 201)
  expectStatus(await request(admin, 'POST', `/attendance/recompute?date=${D_SUSPEND}`), 201)
  const after = await dayRow(suspended.emp.id, D_SUSPEND)
  check('بعد الإيقاف: صف الغياب اتشال', () => assert.equal(after, null, JSON.stringify(after)))
  const monthly = expectStatus(await request(hrA, 'GET', query('/attendance/monthly',
    { employeeId: suspended.emp.id, from: CYCLE_FROM, to: CYCLE_TO })), 200)
  check('الكشف: يوم الإيقاف ليس ضمن الغياب', () =>
    assert.equal(monthly.days.some(row => String(row.date).slice(0, 10) === D_SUSPEND && row.status === 'absent'), false))
  done()
})

test('ب6 — إضافي بطلب معتمد: يُحتسب مرة واحدة، والمعتمد بعد قفل فترته يدخل أول مسير مفتوح بعده بلا تكرار', async t => {
  overtimeSelf = await attendanceEmployee(fixedShift, [D_OT], { joinDate: '2026-01-01' })
  lateOvertime = await attendanceEmployee(fixedShift, [D_OT_LATE], { joinDate: '2026-01-01' })
  const { check, done } = checker()

  // (1) إضافي عادي: بصمة 09:00→20:00 (عمل 660، المطلوب 540 ⇒ 120 دقيقة إضافي مكتشف) ثم طلب صريح معتمد
  await punch(overtimeSelf.emp, D_OT, ['09:00', '20:00'])
  const detected = (await overtimeEntries(overtimeSelf.emp.id, D_OT)).filter(row => row.status === 'DETECTED')
  check('الكشف من البصمة طلّع قيدًا واحدًا', () => assert.equal(detected.length, 1, JSON.stringify(detected)))
  check('الكشف: ساعتان', () => assert.equal(Number(detected[0]?.hoursActual), 2))
  if (detected.length === 1) {
    expectStatus(await request(hrA, 'POST', `/attendance/overtime/${detected[0].id}/confirm`, { approve: false, reason: 'سيُقدَّم طلب إضافي صريح' }), 201)
  }
  const submitted = expectStatus(await request(overtimeSelf.user, 'POST', '/requests',
    { typeCode: 'OVERTIME', submit: true, payload: { date: D_OT, hours: 2, reason: 'إغلاق شهري' } }), 201)
  expectStatus(await request(hrA, 'POST', `/requests/${submitted.id}/act`, { action: 'APPROVE', comment: 'اعتماد الإضافي' }), 201)
  const allOt = await overtimeEntries(overtimeSelf.emp.id, D_OT)
  const approved = allOt.filter(row => ['APPROVED', 'PAID'].includes(row.status))
  check('بعد الاعتماد: قيد إضافي معتمد واحد فقط', () => assert.equal(approved.length, 1,
    JSON.stringify(allOt.map(row => [row.id, row.source, row.status, row.hoursActual]))))
  check('بعد الاعتماد: ساعتان', () => assert.equal(Number(approved[0]?.hoursActual ?? approved[0]?.payableHours), 2))

  // (2) الاعتماد المتأخر: مسير الفترة يُحسب ويُعتمد قبل اعتماد الطلب
  await punch(lateOvertime.emp, D_OT_LATE, ['09:00', '20:00'])
  const lateDetected = (await overtimeEntries(lateOvertime.emp.id, D_OT_LATE)).filter(row => row.status === 'DETECTED')
  if (lateDetected.length === 1) {
    expectStatus(await request(hrA, 'POST', `/attendance/overtime/${lateDetected[0].id}/confirm`, { approve: false, reason: 'سيُقدَّم طلب إضافي صريح' }), 201)
  }
  const lateRequest = expectStatus(await request(lateOvertime.user, 'POST', '/requests',
    { typeCode: 'OVERTIME', submit: true, payload: { date: D_OT_LATE, hours: 2, reason: 'جرد متأخر' } }), 201)
  const augustRun = expectStatus(await request(admin, 'POST', '/payroll/runs/calculate-defined',
    { period: PERIOD, scopeType: 'CUSTOM', employeeIds: [lateOvertime.emp.id], name: `مسير الاختبار ${++runNumber}` }), 201)
  const augustItem = augustRun.items.find(row => row.employeeId === lateOvertime.emp.id)
  check('مسير الفترة قبل الاعتماد: بلا إضافي', () => assert.equal(Number(augustItem?.overtimeAmount ?? 0), 0))
  const report = expectStatus(await request(approver, 'GET', `/payroll/runs/${augustRun.id}/unassigned`), 200)
  expectStatus(await request(approver, 'POST', `/payroll/runs/${augustRun.id}/unassigned-ack`, { reportHash: report.reportHash }), 201)
  expectStatus(await request(approver, 'POST', `/payroll/runs/${augustRun.id}/approve`), 201)
  expectStatus(await request(hrA, 'POST', `/requests/${lateRequest.id}/act`, { action: 'APPROVE', comment: 'اعتماد متأخر بعد قفل الفترة' }), 201)

  const nextRun = expectStatus(await request(admin, 'POST', '/payroll/runs/calculate-defined',
    { period: NEXT_PERIOD, scopeType: 'CUSTOM', employeeIds: [lateOvertime.emp.id], name: `مسير الاختبار ${++runNumber}` }), 201)
  const nextItem = nextRun.items.find(row => row.employeeId === lateOvertime.emp.id)
  check('المسير المفتوح التالي التقط الإضافي المتأخر', () => assert.ok(Number(nextItem?.overtimeAmount) > 0,
    `المبلغ ${nextItem?.overtimeAmount}، الساعات ${nextItem?.overtimeHours}`))
  check('المسير المفتوح التالي: ساعتان', () => assert.equal(Number(nextItem?.overtimeHours), 2))
  const recalculated = expectStatus(await request(admin, 'POST', '/payroll/runs/calculate-defined',
    { runId: nextRun.id, period: NEXT_PERIOD, scopeType: 'CUSTOM', employeeIds: [lateOvertime.emp.id], reason: 'إعادة حساب' }), 201)
  const again = recalculated.items.find(row => row.employeeId === lateOvertime.emp.id)
  check('إعادة الحساب لا تضاعف الإضافي', () => assert.equal(Number(again?.overtimeAmount), Number(nextItem?.overtimeAmount)))
  const approvedAugust = expectStatus(await request(admin, 'GET', `/payroll/runs/${augustRun.id}`), 200)
  check('المسير المعتمد ما اتغيرش', () => assert.equal(Number(approvedAugust.items.find(row => row.employeeId === lateOvertime.emp.id)?.overtimeAmount ?? 0), 0))

  // بعد اعتماد المسير المفتوح: القيد اتصرف فمفيش صرف تاني في أي مسير لاحق
  const nextReport = expectStatus(await request(approver, 'GET', `/payroll/runs/${nextRun.id}/unassigned`), 200)
  expectStatus(await request(approver, 'POST', `/payroll/runs/${nextRun.id}/unassigned-ack`, { reportHash: nextReport.reportHash }), 201)
  expectStatus(await request(approver, 'POST', `/payroll/runs/${nextRun.id}/approve`), 201)
  const entry = await repo('OvertimeEntry').findOneBy({ requestId: lateRequest.id })
  t.diagnostic(`قيد الإضافي بعد اعتماد المسير: status=${entry?.status}، payrollRunId=${entry?.payrollRunId ?? '—'} (PAID تتسجّل عند الصرف لا الاعتماد)`)
  check('بعد الاعتماد: القيد ما اتلغاش ولا رجع مكتشفًا', () => assert.ok(['APPROVED', 'PAID'].includes(String(entry?.status)), JSON.stringify(entry?.status)))
  const claimedItem = await repo('PayrollItem').findOneBy({ runId: nextRun.id, employeeId: lateOvertime.emp.id })
  const claimedIds = JSON.parse(claimedItem?.breakdown || '{}').overtimeEntryIds ?? []
  check('المسير المعتمد حجز القيد باسمه (فمفيش مسير تاني ياخده)', () => assert.deepEqual(claimedIds, [entry?.id], JSON.stringify(claimedIds)))
  const third = await request(admin, 'POST', '/payroll/runs/calculate-defined',
    { period: '2026-10', scopeType: 'CUSTOM', employeeIds: [lateOvertime.emp.id], name: `مسير الاختبار ${++runNumber}` })
  t.diagnostic(`مسير الفترة التالية (2026-10) → HTTP ${third.status}`)
  if (third.status === 201) {
    const thirdItem = third.body.items.find(row => row.employeeId === lateOvertime.emp.id)
    check('مسير لاحق لا يصرف نفس الإضافي مرة تانية', () => assert.equal(Number(thirdItem?.overtimeAmount ?? 0), 0,
      JSON.stringify({ amount: thirdItem?.overtimeAmount, hours: thirdItem?.overtimeHours })))
  }
  done()
})

test('ب7 — التقارير والملخص متسقة مع صفوف الأيام، وفلاتر «من/إلى» باليوم تختلف عن فلتر الشهر', async () => {
  // يوم داخل شهر الرواتب وخارج شهر التقويم، ويوم العكس — للتمييز بين الفلترين
  await punch(core.emp, D_IN_CYCLE_ONLY, ['09:00', '18:00'])
  await punch(core.emp, D_IN_MONTH_ONLY, ['09:00', '18:00'])
  const { check, done } = checker()

  const context = expectStatus(await request(hrA, 'GET', `/attendance/payroll-month?period=${PERIOD}`), 200)
  check('شهر الرواتب 2026-08 = 07-23 → 08-22', () => assert.deepEqual([context.from, context.to], [CYCLE_FROM, CYCLE_TO]))

  const byRange = expectStatus(await request(hrA, 'GET', query('/attendance/monthly', { employeeId: core.emp.id, from: CYCLE_FROM, to: CYCLE_TO })), 200)
  const byMonth = expectStatus(await request(hrA, 'GET', query('/attendance/monthly', { employeeId: core.emp.id, month: PERIOD })), 200)
  const dates = payload => payload.days.map(row => String(row.date).slice(0, 10))
  check('المدى باليوم: حدوده من الطلب', () => assert.deepEqual([byRange.from, byRange.to], [CYCLE_FROM, CYCLE_TO]))
  check('المدى باليوم يشمل يوم 07-27', () => assert.ok(dates(byRange).includes(D_IN_CYCLE_ONLY)))
  check('المدى باليوم لا يشمل يوم 08-25', () => assert.equal(dates(byRange).includes(D_IN_MONTH_ONLY), false))
  check('فلتر الشهر يشمل يوم 08-25', () => assert.ok(dates(byMonth).includes(D_IN_MONTH_ONLY)))
  check('فلتر الشهر لا يشمل يوم 07-27', () => assert.equal(dates(byMonth).includes(D_IN_CYCLE_ONLY), false))

  // الملخص = عدّ صفوف الأيام نفسها
  const count = (payload, status) => payload.days.filter(row => row.status === status).length
  const sum = (payload, field) => payload.days.reduce((total, row) => total + Number(row[field] ?? 0), 0)
  for (const [key, status] of [['present', 'present'], ['late', 'late'], ['absent', 'absent'], ['earlyLeave', 'early_leave'],
    ['leave', 'leave'], ['holiday', 'holiday'], ['missingPunch', 'missing_punch']]) {
    check(`الملخص ${key} = عدّ الصفوف`, () => assert.equal(byRange.summary[key], count(byRange, status)))
  }
  check('الملخص: مجموع دقائق التأخير', () => assert.equal(byRange.summary.totalLateMinutes, sum(byRange, 'lateMinutes')))
  check('الملخص: مجموع دقائق العمل', () => assert.equal(byRange.summary.totalWorkMinutes, sum(byRange, 'workMinutes')))

  // تقرير الحضور المجمّع يطابق الكشف — بنفس المدى وبفلتر الشهر
  const reportRange = expectStatus(await request(hrA, 'GET', query('/reports/attendance', { from: CYCLE_FROM, to: CYCLE_TO })), 200)
  const mine = reportRange.find(row => row.employeeId === core.emp.id)
  check('تقرير الحضور يحتوي الموظف', () => assert.ok(mine, JSON.stringify(reportRange.map(r => r.employeeId))))
  check('تقرير الحضور: أيام الحضور = الكشف', () => assert.equal(Number(mine?.presentDays), byRange.summary.present))
  check('تقرير الحضور: أيام التأخير = الكشف', () => assert.equal(Number(mine?.lateDays), byRange.summary.late))
  check('تقرير الحضور: أيام الغياب = الكشف', () => assert.equal(Number(mine?.absentDays), byRange.summary.absent))
  check('تقرير الحضور: الانصراف المبكر = الكشف', () => assert.equal(Number(mine?.earlyLeaveDays), byRange.summary.earlyLeave))
  check('تقرير الحضور: الإجازة = الكشف', () => assert.equal(Number(mine?.leaveDays), byRange.summary.leave))
  check('تقرير الحضور: مجموع دقائق التأخير = الكشف', () => assert.equal(Number(mine?.totalLateMinutes), byRange.summary.totalLateMinutes))
  const reportMonth = expectStatus(await request(hrA, 'GET', query('/reports/attendance', { month: PERIOD })), 200)
  const mineMonth = reportMonth.find(row => row.employeeId === core.emp.id)
  check('تقرير الشهر التقويمي = كشف نفس الفلتر', () => assert.equal(Number(mineMonth?.presentDays), byMonth.summary.present))
  check('تقرير الشهر التقويمي: الغياب = كشف نفس الفلتر', () => assert.equal(Number(mineMonth?.absentDays), byMonth.summary.absent))
  check('الفلتران يقيسان مدى مختلفًا فعلاً (الغياب)', () => assert.notEqual(Number(mineMonth?.absentDays), Number(mine?.absentDays)))

  // مدى غلط يُرفض برسالة واضحة
  const reversed = await request(hrA, 'GET', query('/reports/attendance', { from: CYCLE_TO, to: CYCLE_FROM }))
  check('«إلى» قبل «من» يُرفض 400', () => assert.equal(reversed.status, 400, JSON.stringify(reversed.body)))
  const halfRange = await request(hrA, 'GET', query('/reports/attendance', { from: CYCLE_FROM }))
  check('«من» بلا «إلى» يُرفض 400', () => assert.equal(halfRange.status, 400, JSON.stringify(halfRange.body)))

  // السجل اليومي لنفس اليوم يطابق الصف المحفوظ
  const daily = expectStatus(await request(hrA, 'GET', `/attendance/daily?date=${D_LATE}`), 200)
  const dailyRow = daily.find(row => row.employeeId === core.emp.id)
  check('السجل اليومي: نفس حالة الصف', () => assert.equal(dailyRow?.status, 'late'))
  check('السجل اليومي: نفس دقائق التأخير', () => assert.equal(Number(dailyRow?.lateMinutes), 45))
  done()
})

test('ب8 — فلاتر المدى على سجل الإضافي والكشف، وعزل الفرع في قراءة الحضور', async () => {
  const { check, done } = checker()
  // سجل الإضافي: بالمدى وبالشهر، ونصف مدى مرفوض
  const otRange = expectStatus(await request(hrA, 'GET', query('/attendance/overtime', { from: CYCLE_FROM, to: CYCLE_TO })), 200)
  check('سجل الإضافي بالمدى: حدوده من الطلب', () => assert.deepEqual([otRange.from, otRange.to], [CYCLE_FROM, CYCLE_TO]))
  check('سجل الإضافي بالمدى يشمل يوم الإضافي المعتمد', () =>
    assert.ok(otRange.entries.some(row => String(row.date).slice(0, 10) === D_OT), JSON.stringify(otRange.entries.map(r => [r.date, r.status]))))
  const otMonth = expectStatus(await request(hrA, 'GET', query('/attendance/overtime', { month: '2026-07' })), 200)
  check('سجل الإضافي بشهر يوليو لا يشمل أيام أغسطس', () =>
    assert.equal(otMonth.entries.some(row => String(row.date).slice(0, 10).startsWith('2026-08')), false))
  const otHalf = await request(hrA, 'GET', query('/attendance/overtime', { from: CYCLE_FROM }))
  check('سجل الإضافي: «من» بلا «إلى» يُرفض 400', () => assert.equal(otHalf.status, 400, JSON.stringify(otHalf.body)))

  // الكشف: نصف مدى، مدى مقلوب، ومدى أطول من السقف
  const half = await request(hrA, 'GET', query('/attendance/monthly', { employeeId: core.emp.id, from: CYCLE_FROM }))
  check('الكشف: «من» بلا «إلى» يُرفض 400', () => assert.equal(half.status, 400, JSON.stringify(half.body)))
  const reversed = await request(hrA, 'GET', query('/attendance/monthly', { employeeId: core.emp.id, from: CYCLE_TO, to: CYCLE_FROM }))
  check('الكشف: «إلى» قبل «من» يُرفض 400', () => assert.equal(reversed.status, 400, JSON.stringify(reversed.body)))
  const tooLong = await request(hrA, 'GET', query('/attendance/monthly', { employeeId: core.emp.id, from: '2024-01-01', to: '2026-08-22' }))
  check('الكشف: مدى أطول من 366 يوم يُرفض 400', () => assert.equal(tooLong.status, 400, JSON.stringify(tooLong.body)))
  const badMonth = await request(hrA, 'GET', query('/attendance/monthly', { employeeId: core.emp.id, month: '2026-13' }))
  check('الكشف: شهر غير صالح يُرفض 400', () => assert.equal(badMonth.status, 400, JSON.stringify(badMonth.body)))

  // عزل الفرع في قراءة الحضور
  const crossBranch = await request(hrB, 'GET', query('/attendance/monthly', { employeeId: core.emp.id, from: CYCLE_FROM, to: CYCLE_TO }))
  check('حساب فرع ب لا يقرأ كشف موظف فرع أ', () => assert.ok([400, 403, 404].includes(crossBranch.status), JSON.stringify(crossBranch.body)))
  const dailyB = expectStatus(await request(hrB, 'GET', `/attendance/daily?date=${D_LATE}`), 200)
  check('السجل اليومي لفرع ب لا يحتوي موظفي فرع أ', () => assert.equal(dailyB.some(row => row.employeeId === core.emp.id), false))
  const reportB = expectStatus(await request(hrB, 'GET', query('/reports/attendance', { from: CYCLE_FROM, to: CYCLE_TO })), 200)
  check('تقرير فرع ب لا يحتوي موظفي فرع أ', () => assert.equal(reportB.some(row => row.employeeId === core.emp.id), false))
  done()
})

test('ب9 — حواف: غياب مُجسَّد ثم إجازة معتمدة، حد السماحية بالضبط، وبصمة مستقبلية أو خارج الفرع', async () => {
  const edge = await attendanceEmployee(fixedShift, [D_NORMAL, D_LATE, D_EARLY, D_ABSENT, D_PERM], { joinDate: '2026-01-01' })
  const { check, done } = checker()
  // سماحية الوردية (10) هي السارية — السماحية العامة (30) لا تُطبَّق فوقها ولا بدلاً منها
  await punch(edge.emp, D_PERM, ['09:20', '18:00'])
  const shiftGrace = await dayRow(edge.emp.id, D_PERM)
  check('وصول 09:20 مع سماحية وردية 10 وعامة 30: تأخير 20 دقيقة', () => assert.equal(shiftGrace.lateMinutes, 20))
  check('السماحية المسجلة على اليوم = 10 (الوردية)', () => assert.equal(shiftGrace.graceUsed, 10))

  // حد السماحية 10 دقائق: 09:10 بالضبط لا تأخير، و09:11 تأخير 11 دقيقة (لا 1 ولا 21)
  await punch(edge.emp, D_NORMAL, ['09:10', '18:00'])
  await punch(edge.emp, D_LATE, ['09:11', '18:00'])
  await punch(edge.emp, D_EARLY, ['09:30', '17:30'])
  const atGrace = await dayRow(edge.emp.id, D_NORMAL)
  check('09:10 بالضبط على سماحية 10: لا تأخير', () => assert.equal(atGrace.lateMinutes, 0))
  check('09:10: التأخير الخام مسجّل 10 للشفافية', () => assert.equal(atGrace.rawLateMinutes, 10))
  const overGrace = await dayRow(edge.emp.id, D_LATE)
  check('09:11: التأخير 11 دقيقة كاملة (السماحية عتبة لا خصم)', () => assert.equal(overGrace.lateMinutes, 11))
  const both = await dayRow(edge.emp.id, D_EARLY)
  check('تأخير وانصراف مبكر في نفس اليوم: الاتنين مسجلين', () =>
    assert.deepEqual([both.lateMinutes, both.earlyLeaveMinutes, both.status], [30, 30, 'late']))

  // غياب اتجسّد الأول ثم اتعتمدت إجازة تغطيه — الصف لازم يتقلب «إجازة» وحده وإلا يتخصم غيابًا
  expectStatus(await request(admin, 'POST', `/attendance/recompute?date=${D_ABSENT}`), 201)
  const beforeLeave = await dayRow(edge.emp.id, D_ABSENT)
  check('قبل الإجازة: اليوم غياب محفوظ', () => assert.equal(beforeLeave?.status, 'absent'))
  await repo('Leave').save({ employeeId: edge.emp.id, leaveTypeCode: 'ANNUAL', fromDate: D_ABSENT, toDate: D_ABSENT,
    days: 1, period: 'FULL', isUnpaid: false, status: 'APPROVED' })
  const ledger = expectStatus(await request(hrA, 'GET', query('/attendance/monthly',
    { employeeId: edge.emp.id, from: CYCLE_FROM, to: CYCLE_TO })), 200)
  const row = ledger.days.find(day => String(day.date).slice(0, 10) === D_ABSENT)
  check('بعد اعتماد إجازة تغطي يوم غياب مُجسَّد: الكشف يقلبه «إجازة» لا «غياب»',
    () => assert.equal(row?.status, 'leave', JSON.stringify(row && [row.date, row.status])))

  // بصمة في المستقبل مرفوضة، وبصمة موظف خارج نطاق الفرع مرفوضة
  const tomorrow = new Date(Date.now() + 36 * 3600 * 1000).toISOString()
  const futurePunch = await request(admin, 'POST', '/attendance/punches/manual',
    { punches: [{ employeeCode: edge.emp.fingerprintCode, timestamp: tomorrow }], reason: 'بصمة مستقبلية' })
  check('بصمة بوقت في المستقبل مرفوضة 400', () => assert.equal(futurePunch.status, 400, JSON.stringify(futurePunch.body)))
  const crossPunch = await request(hrB, 'POST', '/attendance/punches/manual',
    { punches: [{ employeeCode: edge.emp.fingerprintCode, timestamp: new Date(`${D_NORMAL}T09:00:00`).toISOString() }], reason: 'بصمة خارج الفرع' })
  check('إدخال بصمة لموظف فرع آخر مرفوض', () => assert.ok([400, 403].includes(crossPunch.status), JSON.stringify(crossPunch.body)))
  done()
})

// ============================================================
// (ج) الخدمة الذاتية
// ============================================================

test('ج1 — موظف عادي (خدمة ذاتية): يشوف حضوره هو بس، ولا يقرأ غيره ولا التقارير', async () => {
  const { check, done } = checker()
  const self = core.user
  const mine = await request(self, 'GET', query('/attendance/monthly', { employeeId: core.emp.id, from: CYCLE_FROM, to: CYCLE_TO }))
  check('يقرأ كشفه هو', () => assert.equal(mine.status, 200, JSON.stringify(mine.body)))
  if (mine.status === 200) {
    check('كشفه هو بنفس الصفوف', () => assert.ok(mine.body.days.some(row => String(row.date).slice(0, 10) === D_LATE && row.status === 'late')))
  }
  const other = await request(self, 'GET', query('/attendance/monthly', { employeeId: flex.emp.id, from: CYCLE_FROM, to: CYCLE_TO }))
  check('لا يقرأ كشف غيره', () => assert.ok([400, 403].includes(other.status), JSON.stringify(other.body)))
  const daily = await request(self, 'GET', `/attendance/daily?date=${D_LATE}`)
  check('لا يفتح السجل اليومي للنطاق', () => assert.equal(daily.status, 403, JSON.stringify(daily.body)))
  const report = await request(self, 'GET', query('/reports/attendance', { from: CYCLE_FROM, to: CYCLE_TO }))
  check('لا يفتح تقرير الحضور المجمّع', () => assert.equal(report.status, 403, JSON.stringify(report.body)))
  const otherEmployee = await request(self, 'GET', `/employees/${flex.emp.id}`)
  check('لا يقرأ ملف موظف آخر', () => assert.equal(otherEmployee.status, 403, JSON.stringify(otherEmployee.body)))
  const ownFile = await request(self, 'GET', `/employees/${core.emp.id}`)
  check('يقرأ ملفه هو', () => assert.equal(ownFile.status, 200, JSON.stringify(ownFile.body)))
  const myToday = await request(self, 'GET', '/attendance/my-today')
  check('«يومي» متاح له', () => assert.equal(myToday.status, 200, JSON.stringify(myToday.body)))
  const punchOther = await request(self, 'POST', '/attendance/punches/manual',
    { punches: [{ employeeCode: flex.emp.fingerprintCode, timestamp: new Date(`${D_NORMAL}T09:00:00`).toISOString() }], reason: 'محاولة' })
  check('لا يُدخل بصمات يدوية', () => assert.equal(punchOther.status, 403, JSON.stringify(punchOther.body)))
  done()
})
