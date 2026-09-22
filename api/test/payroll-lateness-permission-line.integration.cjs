// «إذن بخصم» سطر مستقل بجانب «التأخير» في قسيمة الراتب وجدول المسير — على قاعدة SQL مؤقتة معزولة (synchronize).
// العيب المقيس (PAYROLL_PROOF_2026-09-21 بند ٥/١): سطر «التأخير» كان بيجمع خصم الإذن بخصم جواه، فالموظف يقرأ «390 تأخير»
// وما يلاقيش في كشف حضوره 390 دقيقة تأخير، والإدارة ما تفرّقش بين تأخير وإذن. الفلوس كانت صح، النسبة بس غلط.
// الإثبات هنا: نفس الشهر (يومان تأخير 135 دقيقة + إذن بخصم 120 دقيقة) = عمود التأخير 390.00 كما هو،
// والصافي كما هو بالقرش، لكن القسيمة بقت سطرين: «التأخير» 270.00 و«إذن بخصم» 120.00، وعدّادا الدقائق منفصلان.
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
const database = `hr_payroll_permission_line_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-permission-line-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, master, ds, base, admin, branch, created = false, employeeNumber = 0
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
// شهر مسير في المستقبل (اليوم داخل سبتمبر 2026): تجسيد الغياب وإعادة حساب اليوم ما بيتجاوزانش اليوم،
// فصفوف الحضور المكتوبة للاختبار تُقرأ كما هي — نفس أسلوب باقي اختبارات المسير.
const PERIOD = '2026-10'
const LATE_DAYS = ['2026-10-05', '2026-10-12'], PERMISSION_DAY = '2026-10-29'
// الراتب 14400 على 30 يومًا و8 ساعات: سعر اليوم 480 وسعر الدقيقة 1.00 — فالأرقام تقرأ بالعين
const GROSS = 14400, LATE_MINUTES = 135, PERMISSION_MINUTES = 120
const LATENESS_ONLY = 270, PERMISSION_AMOUNT = 120, OLD_SINGLE_LINE = 390
const NET = GROSS - OLD_SINGLE_LINE

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
async function employee(overrides = {}) {
  const n = ++employeeNumber
  return repo('Employee').save({ employeeCode: `PRM${String(n).padStart(3, '0')}`, fullName: `موظف الإذن بخصم ${n}`, branchId: branch.id,
    joinDate: '2020-01-01', basicSalary: GROSS, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0,
    status: 'active', isActive: true, payMethod: 'transfer', ...overrides })
}
/** يوم حضور محسوب: الأساس حاضر كامل، والتخصيص يحدد التأخير أو الإذن بخصم. */
const attendanceDay = (emp, date, custom = {}) => ({ employeeId: emp.id, branchId: emp.branchId, date, status: 'present',
  checkIn: '08:00', checkOut: '16:00', shiftName: 'وردية اختبار الإذن بخصم', shiftStart: '08:00', shiftEnd: '16:00', scheduleSource: 'override',
  workMinutes: 480, lateMinutes: 0, deductibleMinutes: 0, earlyLeaveMinutes: 0, shortfallMinutes: 0, ...custom })
const totalsOf = item => JSON.parse(item.breakdown).attendanceDeductions.totals
const deduction = (lines, key) => lines.deductions.find(line => line.key === key)
const money = value => Number(Number(value).toFixed(2))

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, /^hr_payroll_permission_line_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
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
  branch = await repo('Branch').save({ code: 'PERMLINE', name: 'فرع اختبار الإذن بخصم' })
  admin = await repo('User').save({ email: 'admin@permission-line.invalid', displayName: 'admin', passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '1' }, { key: 'payroll.monthly_days', value: '30' }, { key: 'payroll.daily_hours', value: '8' },
    { key: 'payroll.late_deduction_enabled', value: 'true' }, { key: 'payroll.shortfall_enabled', value: 'true' },
    { key: 'payroll.shortfall_mode', value: 'MINUTES' }, { key: 'payroll.shortfall_value', value: '1' },
    { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' },
  ])
}, { timeout: 90000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_payroll_permission_line_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try { fs.rmSync(uploads, { recursive: true, force: true }) } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Payroll deducting-permission line fixture cleanup failed')
})

test('تأخير + إذن بخصم في شهر واحد: سطران في القسيمة مجموعهما = رقم «التأخير» القديم، والصافي وإجمالي الخصم كما هما', async t => {
  const emp = await employee()
  await repo('AttendanceDay').save([
    ...LATE_DAYS.map(date => attendanceDay(emp, date, { status: 'late', checkIn: '10:15', lateMinutes: LATE_MINUTES })),
    // حضر في وقته وانصرف مبكرًا بإذن معتمد «بخصم»: النقص مغطى بالإذن، فالمخصوم دقائق الإذن بس
    attendanceDay(emp, PERMISSION_DAY, { status: 'early_leave', checkOut: '14:00', earlyLeaveMinutes: PERMISSION_MINUTES,
      shortfallMinutes: PERMISSION_MINUTES, deductibleMinutes: PERMISSION_MINUTES,
      attendanceRuleSnapshot: { flexEnabled: false, paidPermissionShortfallCoveredMinutes: PERMISSION_MINUTES } }),
  ])
  const run = expectStatus(await request(admin, 'POST', '/payroll/runs/calculate-defined', { period: PERIOD, scopeType: 'CUSTOM',
    employeeIds: [emp.id], name: `اختبار سطر الإذن بخصم ${crypto.randomUUID().slice(0, 8)}` }), 201)
  const item = run.items.find(row => row.employeeId === emp.id)
  assert.ok(item)

  // ١) الفلوس ما اتحركتش قرشًا: عمود التأخير هو نفسه الرقم القديم، وكذلك إجمالي الخصم والصافي وصافي المسير
  assert.equal(money(item.latenessDeduction), OLD_SINGLE_LINE, 'عمود التأخير المحفوظ = 270 تأخير + 120 إذن بخصم كما كان')
  assert.equal(money(item.shortfallDeduction), 0, 'نقص يوم الإذن مغطى بالإذن فلا يُخصم مرتين')
  assert.equal(money(item.absenceDeduction) + money(item.unpaidLeaveDeduction) + money(item.otherDeductions), 0)
  assert.equal(money(item.netPay), NET, `الصافي = ${GROSS} − ${OLD_SINGLE_LINE}`)
  assert.equal(money(run.totalNet), NET, 'صافي المسير كما هو قبل التقسيم')

  // ٢) عدّادا الدقائق انقسموا: «دقائق التأخير» بقت التأخير الحقيقي بس (270 لا 390)
  assert.equal(Number(item.lateMinutes), LATE_MINUTES * 2, 'دقائق التأخير = التأخير الحقيقي وحده')
  const totals = totalsOf(item)
  assert.equal(totals.permissionMinutes, PERMISSION_MINUTES, 'دقائق الإذن بخصم عدّاد مستقل')
  assert.equal(Number(item.lateMinutes) + totals.permissionMinutes, 390, 'مجموعهما = الرقم القديم المُلخبط')

  // ٣) التقسيم المحفوظ مع البند (مسير معتمد أو مصروف يقرأ منه لاحقًا بلا إعادة حساب)
  assert.equal(money(totals.latenessOnlyDeduction), LATENESS_ONLY)
  assert.equal(money(totals.permissionDeduction), PERMISSION_AMOUNT)
  assert.equal(money(totals.latenessOnlyDeduction) + money(totals.permissionDeduction), money(totals.latenessDeduction))

  // ٤) القسيمة: سطران باسمهما، ومجموع كل سطور الخصم = أعمدة الخصم المحفوظة
  const payslip = expectStatus(await request(admin, 'GET', `/payroll/items/${item.id}`), 200)
  assert.deepEqual(payslip.lines.deductions.map(line => [line.key, line.name, line.amount]), [
    ['LATENESS', 'التأخير', LATENESS_ONLY], ['DEDUCT_PERMISSION', 'إذن بخصم', PERMISSION_AMOUNT],
  ])
  assert.equal(money(payslip.lines.totals.deductions), OLD_SINGLE_LINE, 'إجمالي الاستقطاعات كما كان')
  assert.equal(money(payslip.lines.totals.net), NET)

  // ٥) جدول المسير: عمود لكل سطر، ومجموع العمودين = عمود التأخير المحفوظ
  const runLines = expectStatus(await request(admin, 'GET', `/payroll/runs/${run.id}/lines`), 200)
  assert.deepEqual(runLines.columns.deductions.map(column => column.name), ['التأخير', 'إذن بخصم'])
  const row = runLines.rows.find(value => value.itemId === item.id)
  assert.equal(money(deduction(row, 'LATENESS').amount) + money(deduction(row, 'DEDUCT_PERMISSION').amount), money(item.latenessDeduction))

  // ٦) تقارير الشهر (كل بنود الاستقطاع لكل موظف): السطران منفصلان والإجمالي الكبير كما هو
  const month = expectStatus(await request(admin, 'GET', `/payroll/overview/lines?period=${PERIOD}`), 200)
  const monthRow = month.rows.find(value => value.itemId === item.id)
  assert.equal(money(deduction(monthRow, 'LATENESS').amount), LATENESS_ONLY)
  assert.equal(money(deduction(monthRow, 'DEDUCT_PERMISSION').amount), PERMISSION_AMOUNT)
  assert.equal(money(monthRow.totals.deductions), OLD_SINGLE_LINE)
  // «الاستقطاعات» بنوع الخصم (منظومة «شيل خصم»): التأخير نوع واحد يشمل إذنه — شيله يشيل الاثنين، فالإجمالي كما هو
  const deductions = expectStatus(await request(admin, 'GET', `/payroll/overview/deductions?period=${PERIOD}`), 200)
  assert.equal(money(deductions.totals.LATENESS), OLD_SINGLE_LINE)

  t.diagnostic(`قبل: سطر واحد «التأخير» 390.00 و«دقائق التأخير» 390. بعد: «التأخير» 270.00 (270 دقيقة) + «إذن بخصم» 120.00 (120 دقيقة)؛ الصافي ${NET} في الحالتين.`)
})

test('مسير بلا إذن بخصم: سطر «التأخير» وحده — لا عمود ولا سطر «إذن بخصم» بصفر', async () => {
  const emp = await employee()
  await repo('AttendanceDay').save(LATE_DAYS.map(date => attendanceDay(emp, date, { status: 'late', checkIn: '10:15', lateMinutes: LATE_MINUTES })))
  const run = expectStatus(await request(admin, 'POST', '/payroll/runs/calculate-defined', { period: PERIOD, scopeType: 'CUSTOM',
    employeeIds: [emp.id], name: `اختبار تأخير بلا إذن ${crypto.randomUUID().slice(0, 8)}` }), 201)
  const item = run.items.find(row => row.employeeId === emp.id)
  assert.equal(money(item.latenessDeduction), LATENESS_ONLY)
  assert.equal(money(item.netPay), GROSS - LATENESS_ONLY)
  assert.equal(totalsOf(item).permissionMinutes, 0)
  assert.equal(money(totalsOf(item).permissionDeduction), 0)
  const payslip = expectStatus(await request(admin, 'GET', `/payroll/items/${item.id}`), 200)
  assert.deepEqual(payslip.lines.deductions.map(line => [line.key, line.amount]), [['LATENESS', LATENESS_ONLY]])
  const runLines = expectStatus(await request(admin, 'GET', `/payroll/runs/${run.id}/lines`), 200)
  assert.deepEqual(runLines.columns.deductions.map(column => column.key), ['LATENESS'])
})

test('إلغاء خصم «تأخير يوم» للإذن: العمود ينزل للتأخير وحده — النسبة ما تتلخبطش والإذن ما يظهرش بمبلغ مش مخصوم', async () => {
  // إعفاء «تأخير يوم» بيسقط اليوم بشقيه (الشريحة والإذن)، فيوم الإذن المُعفى يخرج من العمود ومن سطره معًا:
  // بلا هذا الوعي كان سطر «إذن بخصم» هيقول 120 وسطر «التأخير» 150 — والحقيقة تأخير 270 وإذن صفر.
  const emp = await employee()
  await repo('AttendanceDay').save([
    ...LATE_DAYS.map(date => attendanceDay(emp, date, { status: 'late', checkIn: '10:15', lateMinutes: LATE_MINUTES })),
    attendanceDay(emp, PERMISSION_DAY, { status: 'early_leave', checkOut: '14:00', earlyLeaveMinutes: PERMISSION_MINUTES,
      shortfallMinutes: PERMISSION_MINUTES, deductibleMinutes: PERMISSION_MINUTES,
      attendanceRuleSnapshot: { flexEnabled: false, paidPermissionShortfallCoveredMinutes: PERMISSION_MINUTES } }),
  ])
  const name = `اختبار إلغاء تأخير يوم الإذن ${crypto.randomUUID().slice(0, 8)}`
  const first = expectStatus(await request(admin, 'POST', '/payroll/runs/calculate-defined', { period: PERIOD, scopeType: 'CUSTOM', employeeIds: [emp.id], name }), 201)
  assert.equal(money(first.items.find(row => row.employeeId === emp.id).latenessDeduction), OLD_SINGLE_LINE)
  await repo('PayrollFinancialExemption').save({ runId: first.id, period: PERIOD, employeeId: emp.id, scopeKind: 'SINGLE_ENTRY',
    targetKind: 'LATENESS_DAY', targetRef: PERMISSION_DAY, disposition: 'DROP', status: 'ACTIVE', grantorBasis: 'HR',
    reason: 'إلغاء خصم يوم الإذن بقرار الموارد البشرية لاختبار نسبة السطور', grantedByUserId: admin.id, estimatedAmount: PERMISSION_AMOUNT, revision: 1 })
  const run = expectStatus(await request(admin, 'POST', '/payroll/runs/calculate-defined', { runId: first.id, period: PERIOD, scopeType: 'CUSTOM',
    employeeIds: [emp.id], reason: 'تطبيق إلغاء خصم يوم الإذن' }), 201)
  const item = run.items.find(row => row.employeeId === emp.id)
  assert.equal(money(item.latenessDeduction), LATENESS_ONLY, 'خصم يوم الإذن اتشال فالعمود بقى التأخير وحده')
  assert.equal(money(item.netPay), GROSS - LATENESS_ONLY)
  assert.equal(money(totalsOf(item).permissionDeduction), 0, 'مفيش إذن مخصوم بعد الإلغاء')
  assert.equal(money(totalsOf(item).latenessOnlyDeduction), LATENESS_ONLY)
  const payslip = expectStatus(await request(admin, 'GET', `/payroll/items/${item.id}`), 200)
  assert.deepEqual(payslip.lines.deductions.map(line => [line.key, line.amount]), [['LATENESS', LATENESS_ONLY]])
})

test('بند مسير قديم محفوظ بلا تقسيم: القسيمة تعرض «التأخير» سطرًا واحدًا بالرقم القديم كما كانت', async () => {
  const emp = await employee()
  await repo('AttendanceDay').save(LATE_DAYS.map(date => attendanceDay(emp, date, { status: 'late', checkIn: '10:15', lateMinutes: LATE_MINUTES })))
  const run = expectStatus(await request(admin, 'POST', '/payroll/runs/calculate-defined', { period: PERIOD, scopeType: 'CUSTOM',
    employeeIds: [emp.id], name: `اختبار بند قديم ${crypto.randomUUID().slice(0, 8)}` }), 201)
  const item = run.items.find(row => row.employeeId === emp.id)
  // شكل البند المحفوظ قبل هذا التغيير: عمود واحد بالمجموع (390) وعدّاد دقائق واحد (390) وبلا تقسيم في التفصيل
  const legacy = JSON.parse(item.breakdown)
  delete legacy.attendanceDeductions.totals.latenessOnlyDeduction
  delete legacy.attendanceDeductions.totals.permissionDeduction
  delete legacy.attendanceDeductions.totals.permissionMinutes
  Object.assign(legacy.attendanceDeductions.totals, { lateMinutes: 390, latenessDeduction: OLD_SINGLE_LINE })
  legacy.attendanceDeductions.days[legacy.attendanceDeductions.days.length - 1].permissionAmount = PERMISSION_AMOUNT
  await repo('PayrollItem').update(item.id, { latenessDeduction: OLD_SINGLE_LINE, lateMinutes: 390,
    netPay: NET, breakdown: JSON.stringify(legacy) })
  const payslip = expectStatus(await request(admin, 'GET', `/payroll/items/${item.id}`), 200)
  assert.deepEqual(payslip.lines.deductions.map(line => [line.key, line.name, line.amount]), [['LATENESS', 'التأخير', OLD_SINGLE_LINE]],
    'المسير القديم يفضل سطرًا واحدًا — ولا سطر «إذن بخصم» بصفر')
  assert.equal(money(payslip.lines.totals.deductions), OLD_SINGLE_LINE)
  assert.equal(money(payslip.lines.totals.net), NET)
  const runLines = expectStatus(await request(admin, 'GET', `/payroll/runs/${run.id}/lines`), 200)
  assert.deepEqual(runLines.columns.deductions.map(column => column.key), ['LATENESS'])
})
