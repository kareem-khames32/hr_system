// مرفق الإجازة «مع الطلب» (attachmentTiming = WITH_REQUEST) على قاعدة SQL مؤقتة معزولة:
// نوع مرفقه مطلوب يرفض التقديم بلا ملف ويقبله معه، والاختياري يقبل الحالتين، و«فوق N يوم» يعضّ فوق N فقط،
// والمعتمِد يفتح الملف من مسار الملفات نفسه، ومسار «بعد الرجوع» (التذكير والمهلة والتحول بدون راتب) يفضل شغال.
// نفس الحقل في المسارين: payload.attachmentUrl عند التقديم و leaves.attachmentRef على سجل الإجازة.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
// اسم القاعدة يلتزم بحارس البيئة (isDisposableTestDatabase): hr_<اسم>_test_<16 حرف hex>
const database = `hr_leave_attach_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-leave-attach-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })

let app, master, ds, base, created = false
let admin, branch, dept, hrUser, mgr, mgrUser, colleague, employeeNumber = 0

function assertDisposable() {
  assert.match(database, /^hr_leave_attach_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null,
    employeeId: user.employeeId ?? null, tokenVersion: user.tokenVersion ?? 0,
    permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json',
    ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
function expectStatus(response, status, note) {
  assert.equal(response.status, status, `${note ?? ''} ${JSON.stringify(response.body)}`)
  return response.body
}
// رفع ملف حقيقي بنفس مسار الشاشات: POST /files/upload (متعدد الأجزاء) → مرجع file:N
async function uploadPdf(user, query = 'entityType=request') {
  const form = new FormData()
  form.append('file', new Blob([Buffer.from('%PDF-1.4\n% attachment fixture\n')], { type: 'application/pdf' }), 'report.pdf')
  const response = await fetch(`${base}/files/upload?${query}`, { method: 'POST',
    headers: { Authorization: `Bearer ${token(user)}` }, body: form })
  const body = await response.json()
  assert.equal(response.status, 201, JSON.stringify(body))
  return body.ref
}
const fileIdOf = ref => Number(String(ref).slice(5))
async function downloadStatus(user, ref) {
  const response = await fetch(`${base}/files/${fileIdOf(ref)}`, { headers: { Authorization: `Bearer ${token(user)}` } })
  await response.arrayBuffer()
  return response.status
}
async function employee(fullName, overrides = {}) {
  const n = ++employeeNumber
  return repo('Employee').save({ employeeCode: `ATT${String(n).padStart(3, '0')}`, fullName,
    branchId: branch.id, departmentId: dept.id, jobTitle: 'محاسب', joinDate: '2020-01-01',
    basicSalary: 9000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0,
    currency: 'SAR', status: 'active', isActive: true, payMethod: 'transfer', ...overrides })
}
const user = (email, displayName, role, permissions, extra = {}) =>
  repo('User').save({ email: `${email}@leave-attach.invalid`, displayName, passwordHash: 'test-only', role,
    branchId: branch.id, permissions: JSON.stringify(permissions), ...extra })
async function staff(email, displayName, overrides = {}) {
  const emp = await employee(displayName, overrides)
  const account = await user(email, displayName, 'employee', [], { employeeId: emp.id })
  return { emp, user: account, id: emp.id }
}
// طلب إجازة كامل: إنشاء ثم تقديم — يرجع ردّ التقديم كما هو (نفحص رفضه أو قبوله)
async function submitLeave(actor, payload) {
  const created = expectStatus(await request(actor, 'POST', '/requests', { typeCode: 'LEAVE', payload }), 201, 'create LEAVE:')
  const submitted = await request(actor, 'POST', `/requests/${created.id}/submit`)
  return { id: created.id, submitted }
}
const act = (actor, id, action) => request(actor, 'POST', `/requests/${id}/act`, { action })
const detailOf = async (actor, id) => expectStatus(await request(actor, 'GET', `/requests/${id}`), 200)
async function approveFully(id) {
  expectStatus(await act(mgrUser, id, 'APPROVE'), 201, 'manager approve:')
  expectStatus(await act(hrUser, id, 'APPROVE'), 201, 'hr approve:')
  return detailOf(hrUser, id)
}
const leaveOfRequest = id => repo('Leave').findOneByOrFail({ requestId: id })

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
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
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`

  branch = await repo('Branch').save({ code: 'ATT_B', name: 'فرع مرفقات الإجازات' })
  dept = await repo('Department').save({ name: 'قسم الاختبار', branchId: branch.id, isActive: true })
  admin = await repo('User').save({ email: 'admin@leave-attach.invalid', displayName: 'مدير النظام',
    passwordHash: 'test-only', role: 'super_admin', branchId: null, permissions: '[]' })
  await require('../src/seed/seed-requests').seedRequests(ds)
  await repo('RequestsConfig').save([{ key: 'attendance.weekend_days', value: 'FRI,SAT' }])

  hrUser = await user('hr', 'هدى — الموارد البشرية', 'hr_manager',
    ['leaves.view_all', 'leaves.revoke', 'employees.view', 'requests.view_all', 'documents.manage', 'requests.create_on_behalf'])
  const managerStaff = await staff('mgr', 'ماجد — المدير المباشر', { jobTitle: 'مدير' })
  mgr = managerStaff.emp; mgrUser = managerStaff.user
  colleague = await staff('colleague', 'زميل بعيد')

  // سلسلة اعتماد طلب الإجازة: المدير المباشر ثم الموارد البشرية (البذرة تنشئها فاضية)
  const chain = await repo('ApprovalChain').findOneByOrFail({ code: 'CH_LEAVE' })
  expectStatus(await request(admin, 'PATCH', `/settings/approval-chains/${chain.id}/steps`,
    { steps: [{ approverRole: 'direct_manager_of_requester', slaDays: 3 }, { approverRole: 'hr', slaDays: 3 }] }), 200, 'chain steps:')

  // أنواع الإجازات بقواعد المرفق الأربع (بلا رصيد، بأيام تقويم، فالأيام = المدى بالظبط)
  await repo('LeaveType').save([
    { code: 'ATT_REQ', nameAr: 'مرضية بمرفق مع الطلب', isPaid: true, balanceType: 'none', category: 'SICK',
      requiredAttachment: 'تقرير طبي', attachmentRule: 'REQUIRED', attachmentTiming: 'WITH_REQUEST', countingMode: 'ALL_DAYS', isActive: true },
    { code: 'ATT_OPT', nameAr: 'زواج بمرفق اختياري', isPaid: true, balanceType: 'none', category: 'OCCASION',
      requiredAttachment: 'عقد الزواج', attachmentRule: 'OPTIONAL', attachmentTiming: 'WITH_REQUEST', countingMode: 'ALL_DAYS', isActive: true },
    { code: 'ATT_ABOVE', nameAr: 'امتحانات بمرفق فوق يومين', isPaid: true, balanceType: 'none', category: 'OCCASION',
      requiredAttachment: 'إثبات قيد', attachmentRule: 'REQUIRED_ABOVE_DAYS', attachmentAboveDays: 2,
      attachmentTiming: 'WITH_REQUEST', countingMode: 'ALL_DAYS', isActive: true },
    { code: 'ATT_AFTER', nameAr: 'مرضية بمرفق بعد الرجوع', isPaid: true, balanceType: 'none', category: 'SICK',
      requiredAttachment: 'تقرير طبي', attachmentRule: 'REQUIRED', attachmentTiming: 'AFTER_RETURN',
      attachmentDeadlineDays: 7, countingMode: 'ALL_DAYS', isActive: true },
  ])
}, { timeout: 300000 })

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
  try {
    assert.match(path.basename(uploads), /^hr-leave-attach-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'leave attachment fixture cleanup failed')
})

test('مرفق مطلوب مع الطلب: التقديم بلا ملف مرفوض برسالة تسمّي المستند، ومعه مقبول ومخزّن في نفس الحقل', async t => {
  const emp = await staff('req-emp', 'سامي — مرفق مطلوب', { managerEmployeeId: mgr.id })

  // 1) بلا مرفق: مرفوض باسم النوع واسم المستند
  const without = await submitLeave(emp.user, { leaveTypeCode: 'ATT_REQ', fromDate: '2026-11-02', toDate: '2026-11-04', days: 1 })
  assert.equal(without.submitted.status, 400, JSON.stringify(without.submitted.body))
  assert.match(String(without.submitted.body?.message), /مرضية بمرفق مع الطلب/)
  assert.match(String(without.submitted.body?.message), /لازم ترفع تقرير طبي مع الطلب/)

  // 2) الاسم الخطأ (attachmentRef) يُرفض صراحةً — الحقل الواحد اسمه attachmentUrl
  const wrongName = await request(emp.user, 'POST', '/requests',
    { typeCode: 'LEAVE', payload: { leaveTypeCode: 'ATT_REQ', fromDate: '2026-11-02', toDate: '2026-11-04', days: 1, attachmentRef: 'file:1' } })
  assert.equal(wrongName.status, 400, JSON.stringify(wrongName.body))
  assert.match(String(wrongName.body?.message), /attachmentRef/)
  assert.match(String(wrongName.body?.message), /attachmentUrl/, 'الرفض يسمّي الحقل الصحيح بدل ما يخلّي المقدّم يخمّن')

  // 3) نص مكتوب بالإيد مكان المرجع: مرفوض — المرفق لازم ملف مرفوع فعلاً
  const textOnly = await submitLeave(emp.user,
    { leaveTypeCode: 'ATT_REQ', fromDate: '2026-11-02', toDate: '2026-11-04', days: 1, attachmentUrl: 'التقرير عندي في الدرج' })
  assert.equal(textOnly.submitted.status, 400, JSON.stringify(textOnly.submitted.body))
  assert.match(String(textOnly.submitted.body?.message), /لازم يكون ملف مرفوع فعلاً/)

  // 4) مع المرفق: مقبول، والمرجع محفوظ في payload.attachmentUrl
  const ref = await uploadPdf(emp.user)
  const withFile = await submitLeave(emp.user, { leaveTypeCode: 'ATT_REQ', fromDate: '2026-11-09', toDate: '2026-11-11', days: 1, attachmentUrl: ref })
  assert.equal(withFile.submitted.status, 201, JSON.stringify(withFile.submitted.body))
  const detail = await detailOf(hrUser, withFile.id)
  assert.equal(JSON.parse(detail.payload).attachmentUrl, ref)
  assert.equal(Number(JSON.parse(detail.payload).days), 3)

  // 5) المعتمِد الحالي (المدير) يفتح الملف، والغريب لا
  assert.equal(await downloadStatus(mgrUser, ref), 200, 'المدير المعتمِد يقرأ المرفق')
  assert.equal(await downloadStatus(hrUser, ref), 200, 'الموارد البشرية تقرأ المرفق')
  assert.equal(await downloadStatus(colleague.user, ref), 403, 'زميل غريب عن الطلب لا يقرأ المرفق')
  assert.equal(await downloadStatus(emp.user, ref), 200, 'صاحب الطلب يقرأ مرفقه')

  // 6) بعد الاعتماد: سجل الإجازة يحمل نفس المرجع في نفس حقل مسار «بعد الرجوع» — بلا موعد تسليم
  const done = await approveFully(withFile.id)
  assert.equal(done.status, 'COMPLETED')
  const leave = await leaveOfRequest(withFile.id)
  assert.equal(leave.attachmentRef, ref, 'مرجع الملف على سجل الإجازة (نفس حقل مسار بعد الرجوع)')
  assert.equal(leave.attachmentStatus, 'UPLOADED')
  assert.equal(leave.attachmentDueDate, null, 'مرفق مع الطلب = بلا مهلة تحويل بدون راتب')
  assert.equal(leave.isUnpaid, false)
  assert.equal(await downloadStatus(mgrUser, ref), 200, 'المعتمِد يقرأ المرفق بعد الاكتمال كذلك')

  // 7) مسار «بعد الرجوع» لا يستبدل مرفقًا جاء مع الطلب واعتمده المعتمِد
  const swap = await uploadPdf(emp.user, `entityType=leave_attachment&entityId=${leave.id}`)
  const refused = await request(emp.user, 'POST', `/leaves/${leave.id}/attachment`, { fileRef: swap })
  assert.equal(refused.status, 400, JSON.stringify(refused.body))
  assert.match(String(refused.body?.message), /لا تنتظر مرفقًا/)
  assert.equal((await repo('Leave').findOneByOrFail({ id: leave.id })).attachmentRef, ref)
  t.diagnostic('المرفق المطلوب مع الطلب: رفض بلا ملف، قبول معه، ونفس الحقل في الطلب وسجل الإجازة.')
})

test('الموارد البشرية نيابةً: نفس القاعدة — بلا ملف مرفوض، ومعه الإجازة تحمل المرجع', async () => {
  const emp = await staff('behalf-emp', 'هالة — نيابةً', { managerEmployeeId: mgr.id })
  const without = await request(hrUser, 'POST', '/requests', { typeCode: 'LEAVE', submit: true, onBehalfEmployeeId: emp.id,
    payload: { leaveTypeCode: 'ATT_REQ', fromDate: '2026-12-07', toDate: '2026-12-09', days: 1 } })
  assert.equal(without.status, 400, JSON.stringify(without.body))
  assert.match(String(without.body?.message), /لازم ترفع تقرير طبي مع الطلب/)

  // الملف مرفوع من الموارد البشرية لصاحب الإجازة (نفس نقطة الرفع)
  const ref = await uploadPdf(hrUser, `entityType=request&employeeId=${emp.id}`)
  const withFile = expectStatus(await request(hrUser, 'POST', '/requests', { typeCode: 'LEAVE', submit: true, onBehalfEmployeeId: emp.id,
    payload: { leaveTypeCode: 'ATT_REQ', fromDate: '2026-12-14', toDate: '2026-12-16', days: 1, attachmentUrl: ref } }), 201)
  const leave = await repo('Leave').findOneByOrFail({ requestId: withFile.id })
  assert.deepEqual([leave.attachmentRef, leave.attachmentStatus, leave.attachmentDueDate], [ref, 'UPLOADED', null])
})

test('مرفق اختياري مع الطلب: يُقبل بملف وبغير ملف', async () => {
  const emp = await staff('opt-emp', 'ليلى — مرفق اختياري', { managerEmployeeId: mgr.id })
  const without = await submitLeave(emp.user, { leaveTypeCode: 'ATT_OPT', fromDate: '2026-11-02', toDate: '2026-11-03', days: 1 })
  assert.equal(without.submitted.status, 201, JSON.stringify(without.submitted.body))
  const leaveWithout = await leaveOfRequest((await approveFully(without.id)).id)
  assert.deepEqual([leaveWithout.attachmentRef, leaveWithout.attachmentStatus], [null, null], 'بلا مرفق = بلا تتبع')

  const ref = await uploadPdf(emp.user)
  const withFile = await submitLeave(emp.user, { leaveTypeCode: 'ATT_OPT', fromDate: '2026-11-16', toDate: '2026-11-17', days: 1, attachmentUrl: ref })
  assert.equal(withFile.submitted.status, 201, JSON.stringify(withFile.submitted.body))
  const leave = await leaveOfRequest((await approveFully(withFile.id)).id)
  assert.deepEqual([leave.attachmentRef, leave.attachmentStatus], [ref, 'UPLOADED'])
})

test('«مطلوب فوق N يوم» مع الطلب: يعضّ فوق N فقط', async () => {
  const emp = await staff('above-emp', 'رامي — فوق يومين', { managerEmployeeId: mgr.id })
  // يومان (ليس فوق 2): يُقبل بلا مرفق
  const short = await submitLeave(emp.user, { leaveTypeCode: 'ATT_ABOVE', fromDate: '2026-11-02', toDate: '2026-11-03', days: 1 })
  assert.equal(short.submitted.status, 201, JSON.stringify(short.submitted.body))

  // ثلاثة أيام (فوق 2): يُرفض بلا مرفق
  const long = await submitLeave(emp.user, { leaveTypeCode: 'ATT_ABOVE', fromDate: '2026-11-09', toDate: '2026-11-11', days: 1 })
  assert.equal(long.submitted.status, 400, JSON.stringify(long.submitted.body))
  assert.match(String(long.submitted.body?.message), /لازم ترفع إثبات قيد مع الطلب/)

  // نفس الثلاثة أيام مع مرفق: يُقبل
  const ref = await uploadPdf(emp.user)
  const ok = await submitLeave(emp.user, { leaveTypeCode: 'ATT_ABOVE', fromDate: '2026-11-16', toDate: '2026-11-18', days: 1, attachmentUrl: ref })
  assert.equal(ok.submitted.status, 201, JSON.stringify(ok.submitted.body))
  const leave = await leaveOfRequest((await approveFully(ok.id)).id)
  assert.deepEqual([leave.attachmentRef, leave.attachmentStatus], [ref, 'UPLOADED'])
})

test('مرفق «بعد الرجوع» كما هو: التقديم بلا ملف مقبول، ثم تذكير ورفع، وانقضاء المهلة يحوّل الأيام بدون راتب', async t => {
  const emp = await staff('after-emp', 'نورا — بعد الرجوع', { managerEmployeeId: mgr.id })
  const missEmp = await staff('miss-emp', 'وليد — فوّت المهلة', { managerEmployeeId: mgr.id })
  const job = app.get(require('../src/requests/leave-attachment-deadline.job').LeaveAttachmentDeadlineJob)

  // التقديم بلا مرفق مقبول (المرفق بعد الرجوع)، والمهلة = toDate + 7
  const uploaded = await submitLeave(emp.user, { leaveTypeCode: 'ATT_AFTER', fromDate: '2026-11-02', toDate: '2026-11-04', days: 1 })
  assert.equal(uploaded.submitted.status, 201, JSON.stringify(uploaded.submitted.body))
  await approveFully(uploaded.id)
  const pending = await leaveOfRequest(uploaded.id)
  assert.deepEqual([pending.attachmentStatus, pending.attachmentDueDate, pending.attachmentRef, pending.isUnpaid],
    ['PENDING', '2026-11-11', null, false])

  const missed = await submitLeave(missEmp.user, { leaveTypeCode: 'ATT_AFTER', fromDate: '2026-11-02', toDate: '2026-11-04', days: 1 })
  assert.equal(missed.submitted.status, 201, JSON.stringify(missed.submitted.body))
  await approveFully(missed.id)
  const missedLeave = await leaveOfRequest(missed.id)

  // يوم الموعد نفسه: تذكير بلا تحويل
  const reminderRun = await job.run('2026-11-11')
  assert.deepEqual(reminderRun.missed, [])
  assert.ok(reminderRun.reminders.some(row => row.leaveId === pending.id), 'تذكير الإجازة المعلقة')

  // الرفع بعد الرجوع بنفس مسار الملفات ونفس الحقل
  const ref = await uploadPdf(emp.user, `entityType=leave_attachment&entityId=${pending.id}`)
  const afterUpload = expectStatus(await request(emp.user, 'POST', `/leaves/${pending.id}/attachment`, { fileRef: ref }), 201)
  assert.deepEqual([afterUpload.attachmentStatus, afterUpload.attachmentRef], ['UPLOADED', ref])

  // انقضاء المهلة على من لم يرفع: MISSED + isUnpaid، والمرفوع لا يُمس
  const missedRun = await job.run('2026-11-12')
  assert.deepEqual(missedRun.missed.map(row => row.leaveId), [missedLeave.id])
  const converted = await repo('Leave').findOneByOrFail({ id: missedLeave.id })
  assert.deepEqual([converted.attachmentStatus, converted.isUnpaid, converted.status], ['MISSED', true, 'APPROVED'])
  assert.equal((await repo('Leave').findOneByOrFail({ id: pending.id })).attachmentStatus, 'UPLOADED')
  expectStatus(await request(emp.user, 'POST', `/leaves/${missedLeave.id}/attachment`, { fileRef: ref }), 403)
  t.diagnostic('مسار «بعد الرجوع» كما هو: تذكير يوم الموعد، رفع بنفس الحقل، وتحويل بدون راتب بعد انقضاء المهلة.')
})
