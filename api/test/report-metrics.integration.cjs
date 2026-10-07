// B2.13 (أ): قاموس المؤشرات والتصدير من الخادم. «عدد الموظفين النشطين» نفس الرقم في اللوحة والتقرير والتصدير، وباقي المؤشرات
// بأرقام محسوبة باليد، والتصدير Excel وPDF بنفس صلاحية ونطاق التقرير وبسطر في التدقيق.
// HTTP وSQL فعليان في قاعدة اختبار عشوائية تُحذف بعد الانتهاء.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const ExcelJS = require('../node_modules/exceljs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_report_metrics_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-report-metrics-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const { localDateOf } = require('../src/attendance/attendance.service')
const { addDays } = require('../src/employees/employee-suspension-rules')
const { METRICS } = require('../src/reports/metrics')
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const PERIOD = '2026-08'
let app, ds, master, base, created = false, admin, reader, plain, branchA, branchB, range, downloads = 0
const people = {}

const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
const claims = user => ({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: null,
  tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
const expect = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body ?? null)); return response.body }
async function call(user, route) {
  const response = await fetch(base + route, { headers: { Authorization: `Bearer ${jwt.sign(claims(user))}` } })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
async function download(user, route) {
  const response = await fetch(base + route, { headers: { Authorization: `Bearer ${jwt.sign(claims(user))}` } })
  const bytes = Buffer.from(await response.arrayBuffer())
  if (response.status === 200) downloads += 1
  return { status: response.status, type: response.headers.get('content-type') ?? '', disposition: response.headers.get('content-disposition') ?? '',
    cache: response.headers.get('cache-control') ?? '', bytes, body: response.status === 200 ? null : JSON.parse(bytes.toString('utf8') || 'null') }
}
// صفوف أول ورقة في ملف Excel (الصف الأول = العناوين)
async function sheetRows(bytes) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(bytes)
  const sheet = workbook.worksheets[0], rows = []
  sheet.eachRow(row => rows.push(row.values.slice(1).map(value => value ?? null)))
  return { name: sheet.name, rightToLeft: sheet.views[0]?.rightToLeft === true, rows }
}
const metric = (report, key) => report.metrics.find(item => item.key === key)

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql'); assert.match(database, /^hr_report_metrics_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  // ولا رسالة بريد حقيقية من اختبار
  const mail = app.get(require('../src/auth/mail.service').MailService)
  mail.isConfigured = () => false; mail.send = async () => { throw new Error('no mail in tests') }
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => {}
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => {}
  ds = app.get(require('../node_modules/typeorm').DataSource); assert.equal(ds.options.database, database)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  await repo('RequestsConfig').save([{ key: 'payroll.cycle_start_day', value: '1' }, { key: 'company.name', value: 'شركة اختبار المؤشرات' }])
  range = await app.get(require('../src/payroll/payroll.service').PayrollService).periodRange(PERIOD)
  branchA = await repo('Branch').save({ code: 'RMA', name: 'فرع المؤشرات أ', country: 'EG', weekendDays: 'FRI' })
  branchB = await repo('Branch').save({ code: 'RMB', name: 'فرع المؤشرات ب', country: 'EG', weekendDays: 'FRI' })
  const department = await repo('Department').save({ branchId: branchA.id, name: 'قسم المؤشرات' })
  admin = await repo('User').save({ email: 'admin@report-metrics.invalid', displayName: 'مدير اختبار المؤشرات', passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  reader = await repo('User').save({ email: 'reader@report-metrics.invalid', displayName: 'قارئ تقارير الفرع أ', passwordHash: 'test-only', role: 'employee',
    branchId: branchA.id, permissions: '["reports.view","dashboard.view_all"]' })
  plain = await repo('User').save({ email: 'plain@report-metrics.invalid', displayName: 'حساب من غير تقارير', passwordHash: 'test-only', role: 'employee',
    branchId: branchA.id, permissions: '[]' })
  let n = 0
  const employee = (key, branch, status, extra = {}) => repo('Employee').save({ employeeCode: `RM${String(++n).padStart(3, '0')}`, fullName: `موظف مؤشرات ${key}`,
    branchId: branch.id, departmentId: branch.id === branchA.id ? department.id : null, status, isActive: true, joinDate: '2024-01-01', ...extra })
    .then(saved => { people[key] = saved })
  const start = range.startDate
  await employee('a1', branchA, 'active'); await employee('a2', branchA, 'active'); await employee('a3', branchA, 'active')
  await employee('a4', branchA, 'probation'); await employee('a5', branchA, 'notice_period')
  await employee('a6', branchA, 'suspended', { isActive: false })
  // خرج جوه الفترة (تاريخ الأرشفة) — وخرج قبلها
  await employee('a7', branchA, 'archived', { isActive: false, archivedAt: new Date(`${addDays(start, 5)}T10:00:00`) })
  await employee('a8', branchA, 'terminated', { isActive: false, archivedAt: new Date(`${addDays(start, -10)}T10:00:00`) })
  // اتعيّن جوه الفترة
  await employee('a9', branchA, 'active', { joinDate: addDays(start, 3) })
  await employee('b1', branchB, 'active'); await employee('b2', branchB, 'active')
  // a3 موقوف بفترة النهارده: حالته المحفوظة «نشط» والمعروضة «موقوف»
  const today = localDateOf(new Date())
  await repo('EmployeeSuspension').save({ employeeId: people.a3.id, fromDate: addDays(today, -1), toDate: addDays(today, 1), plannedToDate: addDays(today, 1),
    reason: 'إيقاف اختبار المؤشرات', status: 'ACTIVE', createdByUserId: admin.id })
  // أيام الحضور في الفترة
  const day = (who, offset, status) => ({ employeeId: people[who].id, branchId: people[who].branchId, date: addDays(start, offset), status,
    shiftName: 'وردية الاختبار', shiftStart: '08:00', shiftEnd: '16:00' })
  await repo('AttendanceDay').save([
    day('a1', 1, 'present'), day('a1', 2, 'present'), day('a1', 3, 'late'), day('a1', 4, 'absent'),
    day('a2', 1, 'early_leave'), day('a2', 2, 'absent'), day('a2', 3, 'leave'), day('a2', 4, 'holiday'),
    // غياب قبل المباشرة (مش غياب) ثم حضور
    day('a9', 1, 'absent'), day('a9', 4, 'present'),
    day('b1', 1, 'absent'), day('b1', 2, 'present'),
  ])
  const overtime = (who, offset, status, payableHours) => ({ employeeId: people[who].id, date: addDays(start, offset), source: 'PRE_REQUESTED', hoursActual: payableHours,
    payableHours, status })
  await repo('OvertimeEntry').save([overtime('a1', 2, 'APPROVED', 2.5), overtime('a2', 3, 'PAID', 1.5), overtime('a2', 4, 'REJECTED', 4), overtime('b1', 2, 'APPROVED', 1)])
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_report_metrics_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('db', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name=@db')).recordset.length, 0)
      t.diagnostic(`تحقق حذف قاعدة الاختبار: ${database}`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir())); assert.match(path.basename(uploads), /^hr-report-metrics-files-/)
    fs.rmSync(uploads, { recursive: true, force: true }); assert.equal(fs.existsSync(uploads), false)
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'تعذر تنظيف بيئة اختبار المؤشرات')
})

test('RM-01: the active-employees number is the same on the dashboard, in the report, in the metrics and in the export', async () => {
  // الحاليين: a1 a2 a3 a4 a5 a9 + b1 b2 = 8 (الموقوف يدويًا بملف مقفول، والمؤرشف، والمنتهية خدمته برّه). النشطين: a1 a2 a9 b1 b2 = 5 (a3 موقوف بفترة)
  const dashboard = expect(await call(admin, '/dashboard/stats'), 200)
  assert.deepEqual(dashboard.employees, { total: 8, active: 5, probation: 1 })
  const report = expect(await call(admin, '/reports/headcount'), 200)
  assert.deepEqual(report.summary, { headcount: 8, active: 5 })
  assert.deepEqual(report.byBranch.map(row => [row.branchName, row.total, row.active]).sort(), [['فرع المؤشرات أ', 6, 3], ['فرع المؤشرات ب', 2, 2]])
  assert.deepEqual(report.byDepartment, [{ departmentName: 'قسم المؤشرات', total: 6 }])
  assert.deepEqual(Object.fromEntries(report.byStatus.map(row => [row.status, row.total])),
    { active: 5, suspended: 2, probation: 1, notice_period: 1, archived: 1, terminated: 1 })
  const metrics = expect(await call(admin, `/reports/metrics?period=${PERIOD}`), 200)
  assert.equal(metric(metrics, 'headcount').value, 8)
  assert.equal(metric(metrics, 'active_employees').value, 5)
  const file = await download(admin, '/reports/export?report=headcount&format=xlsx')
  assert.equal(file.status, 200); assert.equal(file.type, XLSX); assert.equal(file.cache, 'no-store')
  assert.match(file.disposition, /^attachment; filename="report-headcount\.xlsx"; filename\*=UTF-8''/)
  const sheet = await sheetRows(file.bytes)
  assert.equal(sheet.rightToLeft, true)
  assert.deepEqual(sheet.rows[0], ['النوع', 'الاسم/الحالة', 'الإجمالي', 'النشطون'])
  assert.deepEqual(sheet.rows[1], ['الإجمالي', 'الموظفون الحاليون', 8, 5])
  // عمود «النشطون» فاضي في صفوف الحالات
  assert.deepEqual(sheet.rows.find(row => row[0] === 'حالة' && row[1] === 'موقوف'), ['حالة', 'موقوف', 2])
  // قارئ فرع واحد: نفس الرقم في التلاتة، وفرع غيره مش ظاهر في أي واحد
  assert.deepEqual(expect(await call(reader, '/dashboard/stats'), 200).employees, { total: 6, active: 3, probation: 1 })
  const scoped = expect(await call(reader, '/reports/headcount'), 200)
  assert.deepEqual(scoped.summary, { headcount: 6, active: 3 })
  assert.deepEqual(scoped.byBranch, [{ branchName: 'فرع المؤشرات أ', total: 6, active: 3 }])
  const scopedFile = await download(reader, '/reports/export?report=headcount&format=xlsx')
  assert.equal(scopedFile.status, 200)
  const scopedRows = (await sheetRows(scopedFile.bytes)).rows
  assert.deepEqual(scopedRows[1], ['الإجمالي', 'الموظفون الحاليون', 6, 3])
  assert.equal(scopedRows.some(row => String(row[1]).includes('فرع المؤشرات ب')), false)
  expect(await call(reader, `/reports/headcount?branchId=${branchB.id}`), 403)
  expect(await download(reader, `/reports/export?report=headcount&format=xlsx&branchId=${branchB.id}`), 403)
  // الفلتر الموحد بيضيّق الأرقام التلاتة مع بعض
  assert.deepEqual(expect(await call(admin, `/reports/headcount?branchId=${branchB.id}`), 200).summary, { headcount: 2, active: 2 })
  assert.equal(metric(expect(await call(admin, `/reports/metrics?period=${PERIOD}&branchId=${branchB.id}`), 200), 'active_employees').value, 2)
})

test('RM-02: turnover, absence and overtime follow the dictionary definitions, inside the reader scope', async () => {
  const company = expect(await call(admin, `/reports/metrics?period=${PERIOD}`), 200)
  assert.deepEqual({ period: company.period, from: company.from, to: company.to }, { period: PERIOD, from: range.startDate, to: range.endDate })
  // كل المؤشرات بتعريفها المكتوب (الواجهة بتعرضه جنب الرقم)
  assert.deepEqual(company.metrics.map(item => item.key), METRICS.map(item => item.key))
  for (const item of company.metrics) assert.equal(item.definition, METRICS.find(entry => entry.key === item.key).definition)
  // الدوران: أول الفترة 9 (a1..a7 + b1 b2)، وآخرها 9 (a1..a6 + a9 + b1 b2)، وخرج واحد (a7) = 1 ÷ 9
  assert.deepEqual(metric(company, 'turnover').parts, { leavers: 1, atStart: 9, atEnd: 9 })
  assert.equal(metric(company, 'turnover').value, 11.11)
  // الغياب: 3 أيام من 9 مطلوبين (غياب a9 قبل مباشرته مش غياب، والإجازة والعطلة برّه المقام)
  assert.deepEqual(metric(company, 'absence').parts, { absentDays: 3, requiredDays: 9 })
  assert.equal(metric(company, 'absence').value, 33.33)
  // نفس عدد أيام الغياب في تقرير الحضور لنفس الأيام (تعريف واحد)
  const attendance = expect(await call(admin, `/reports/attendance?from=${range.startDate}&to=${range.endDate}`), 200)
  assert.equal(attendance.reduce((sum, row) => sum + Number(row.absentDays), 0), 3)
  // الإضافي: المعتمد والمصروف بس (المرفوض برّه)
  assert.equal(metric(company, 'overtime').value, 5)
  assert.deepEqual(metric(company, 'overtime').parts, { entries: 3 })
  // تكلفة الموظف: مفيش مسيرات معتمدة في الشهر = مفيش رقم
  assert.deepEqual({ value: metric(company, 'employee_cost').value, byCurrency: metric(company, 'employee_cost').byCurrency }, { value: null, byCurrency: [] })
  // قارئ الفرع أ: أرقام فرعه بس، ومن غير مؤشر الفلوس (مفيش صلاحية عرض الرواتب)
  const scoped = expect(await call(reader, `/reports/metrics?period=${PERIOD}`), 200)
  assert.equal(metric(scoped, 'employee_cost'), undefined)
  assert.deepEqual(metric(scoped, 'turnover').parts, { leavers: 1, atStart: 7, atEnd: 7 })
  assert.equal(metric(scoped, 'turnover').value, 14.29)
  assert.deepEqual(metric(scoped, 'absence').parts, { absentDays: 2, requiredDays: 7 })
  assert.equal(metric(scoped, 'overtime').value, 4)
  expect(await call(reader, `/reports/metrics?period=${PERIOD}&branchId=${branchB.id}`), 403)
  expect(await call(admin, '/reports/metrics?period=2026-8'), 400)
  // من غير فترة = شهر الرواتب الجاري
  const current = expect(await call(admin, '/reports/metrics'), 200)
  assert.match(current.period, /^\d{4}-\d{2}$/)
  assert.ok(current.from <= current.to)
  expect(await call(plain, '/reports/metrics'), 403)
})

test('RM-03: every report exports from the server as Excel and PDF with the report\'s own permission and scope, and each export is audited', async () => {
  const auditBefore = await repo('AuditLog').count({ where: { action: 'REPORT_EXPORT' } }), downloadsBefore = downloads
  const days = `from=${range.startDate}&to=${range.endDate}`
  const heads = {
    [`report=attendance&${days}`]: ['الرقم الوظيفي', 'الموظف', 'أيام الحضور', 'أيام التأخير', 'أيام الغياب', 'انصراف مبكر', 'دقائق التأخير', 'دقائق العمل'],
    'report=leaves&year=2026': ['نوع الإجازة', 'عدد الطلبات', 'إجمالي الأيام'],
    'report=payroll': ['رقم المسير', 'الاسم', 'الفترة', 'النطاق', 'الحالة', 'الموظفون', 'الصافي'],
    [`report=overtime&${days}`]: ['الموظف', 'الحالة', 'عدد السجلات', 'الساعات الفعلية', 'الساعات المستحقة', 'قيمة المعتمد'],
    'report=requests': ['الفئة', 'مكتملة', 'قيد المراجعة', 'مرفوضة', 'أخرى', 'الإجمالي'],
    [`report=metrics&period=${PERIOD}`]: ['المؤشر', 'القيمة', 'التعريف'],
  }
  for (const [query, head] of Object.entries(heads)) {
    const file = await download(admin, `/reports/export?${query}`)
    assert.equal(file.status, 200, `${query}: ${JSON.stringify(file.body)}`); assert.equal(file.type, XLSX)
    assert.deepEqual((await sheetRows(file.bytes)).rows[0], head, query)
  }
  // محتوى: صف a1 في تصدير الحضور = صفه في التقرير، والمؤشرات بقيمها
  const attendance = (await sheetRows((await download(admin, `/reports/export?report=attendance&${days}`)).bytes)).rows
  assert.deepEqual(attendance.find(row => row[0] === people.a1.employeeCode), [people.a1.employeeCode, people.a1.fullName, 2, 1, 1, 0, 0, 0])
  const metrics = (await sheetRows((await download(admin, `/reports/export?report=metrics&period=${PERIOD}`)).bytes)).rows
  assert.deepEqual(metrics.find(row => row[0] === 'الموظفون النشطون').slice(0, 2), ['الموظفون النشطون', '5'])
  assert.deepEqual(metrics.find(row => row[0] === 'دوران العمالة').slice(0, 2), ['دوران العمالة', '11.11%'])
  // الإضافي لقارئ من غير صلاحية الرواتب: من غير عمود المبلغ
  const overtime = (await sheetRows((await download(reader, `/reports/export?report=overtime&${days}`)).bytes)).rows
  assert.deepEqual(overtime[0], ['الموظف', 'الحالة', 'عدد السجلات', 'الساعات الفعلية', 'الساعات المستحقة'])
  assert.equal(overtime.some(row => String(row[0]).includes('b1')), false, 'موظف فرع تاني مش في تصدير قارئ الفرع')
  // الفلتر الموحد على صفوف الموظفين: فرع (ب) فيه صف b1 بس، وقسم الفرع (أ) مافيهوش b1
  const inB = (await sheetRows((await download(admin, `/reports/export?report=attendance&${days}&branchId=${branchB.id}`)).bytes)).rows
  assert.deepEqual(inB.slice(1).map(row => row[0]), [people.b1.employeeCode])
  const inDepartment = (await sheetRows((await download(admin, `/reports/export?report=overtime&${days}&departmentIds=${people.a1.departmentId}`)).bytes)).rows
  assert.deepEqual(inDepartment.slice(1).map(row => row[0]).sort(), [people.a1.fullName, people.a2.fullName, people.a2.fullName].sort())
  // PDF: ملف PDF فعلي
  const pdf = await download(admin, '/reports/export?report=headcount&format=pdf')
  assert.equal(pdf.status, 200, JSON.stringify(pdf.body)); assert.equal(pdf.type, 'application/pdf')
  assert.equal(pdf.bytes.subarray(0, 5).toString(), '%PDF-')
  assert.match(pdf.disposition, /filename="report-headcount\.pdf"/)
  // الرفض من نفس مكان التقرير
  for (const [user, query, status] of [
    [admin, 'report=nothing', 400], [admin, 'report=headcount&format=csv', 400], [admin, 'report=attendance', 400], [admin, 'report=leaves', 400],
    [admin, 'report=headcount&report=leaves', 400], [plain, 'report=headcount', 403], [reader, 'report=payroll', 403],
    [reader, `report=attendance&${days}&branchId=${branchB.id}`, 403],
  ]) assert.equal((await download(user, `/reports/export?${query}`)).status, status, query)
  // سطر تدقيق لكل تصدير ناجح، بالتقرير والصيغة وعدد الصفوف
  const audit = await repo('AuditLog').find({ where: { action: 'REPORT_EXPORT' }, order: { id: 'ASC' } })
  assert.equal(audit.length - auditBefore, downloads - downloadsBefore)
  const last = audit.filter(row => String(row.after).includes('"format":"pdf"')).pop()
  assert.equal(last.category, 'EXPORT'); assert.equal(Number(last.actorUserId), admin.id); assert.equal(last.entityId, '/reports')
  const after = JSON.parse(last.after)
  assert.deepEqual({ screen: after.screen, report: after.report, format: after.format }, { screen: '/reports', report: 'headcount', format: 'pdf' })
  assert.ok(after.rows > 0); assert.match(after.filename, /^تقرير القوى العاملة-\d{4}-\d{2}-\d{2}\.pdf$/)
})
