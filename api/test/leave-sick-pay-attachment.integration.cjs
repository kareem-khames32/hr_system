// الإجازة المرضية بأجر متدرج في المسير + مرفق «بعد الرجوع» (قرار المالك 16 سبتمبر) على قاعدة SQL مؤقتة معزولة:
// ترتيب أيام المرض في السنة ونسبة أجرها وسطر خصمها في التفصيل والقسيمة، حالة المرفق عند كتابة الإجازة المعتمدة،
// الرفع من الموظف والموارد البشرية، والمهمة اليومية (تذكير ثم MISSED وisUnpaid فيخصمها المسير مرة واحدة).
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
const database = `hr_leave_sick_pay_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-leave-sick-pay-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, master, ds, base, admin, hr, hrOther, branch, otherBranch, created = false, employeeNumber = 0
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
const ymdPlus = days => new Date(Date.now() + days * 86400000).toLocaleDateString('en-CA')
function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function request(user, method, endpoint, body) {
  const response = await fetch(base + endpoint, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
function expectStatus(response, status) {
  assert.equal(response.status, status, JSON.stringify(response.body))
  return response.body
}
async function uploadPdf(user, leaveId) {
  const form = new FormData()
  form.append('file', new Blob([Buffer.from('%PDF-1.4\n% medical report fixture\n')], { type: 'application/pdf' }), 'medical-report.pdf')
  const response = await fetch(`${base}/files/upload?entityType=leave_attachment&entityId=${leaveId}`, { method: 'POST', headers: { Authorization: `Bearer ${token(user)}` }, body: form })
  const body = await response.json()
  assert.equal(response.status, 201, JSON.stringify(body))
  return body.ref
}
async function employee(overrides = {}) {
  const emp = await repo('Employee').save({ employeeCode: `SCK${String(++employeeNumber).padStart(3, '0')}`, fullName: `موظف المرضية ${employeeNumber}`,
    branchId: branch.id, joinDate: '2020-01-01', basicSalary: 9000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0,
    status: 'active', isActive: true, payMethod: 'transfer', ...overrides })
  // استثناء حضور معتمد طوال السنة يعزل الحساب عن الغياب والتأخير؛ الإجازة بلا أجر تبقى مخصومة (exempt_unpaid_leave_deductible)
  await repo('AttendanceExemption').save({ employeeId: emp.id, effectiveFrom: '2026-01-01', effectiveTo: '2027-12-31', reasonCode: 'field_role',
    reason: 'نافذة اختبار الإجازة المرضية المعزولة', status: 'APPROVED', createdByUserId: admin.id, approvedByUserId: admin.id,
    approvedAt: new Date('2026-01-01T08:00:00Z'), terminatedFrom: null, overtimeEligibleOverride: null, unpaidLeaveDeductibleOverride: null, requiresCheckinForPresence: false })
  return emp
}
const sickLeave = (emp, fromDate, toDate, extra = {}) => repo('Leave').save({ employeeId: emp.id, leaveTypeCode: 'SICK_T', fromDate, toDate,
  days: Math.round((Date.parse(toDate) - Date.parse(fromDate)) / 86400000) + 1, period: 'FULL', isUnpaid: false, status: 'APPROVED', ...extra })
async function calculate(period, employees) {
  return expectStatus(await request(admin, 'POST', '/payroll/runs/calculate-defined', { period, scopeType: 'CUSTOM', employeeIds: employees.map(e => e.id),
    name: `اختبار المرضية ${crypto.randomUUID().slice(0, 8)}` }), 201)
}
const itemOf = (run, emp) => { const found = run.items.find(row => row.employeeId === emp.id); assert.ok(found, emp.employeeCode); return found }
async function assertUnpaidParity(run, emp) {
  const report = JSON.parse((await repo('PayrollRun').findOneByOrFail({ id: run.id })).parityReport)
  const row = report?.rows?.find(r => r.employeeId === emp.id)
  const unpaid = row?.components?.find(c => c.code === 'UNPAID_LEAVE')
  assert.ok(unpaid, 'shadow parity row for the unpaid-leave column')
  assert.equal(unpaid.policy, unpaid.legacy, 'the policy engine computes the same unpaid + sick amount')
}
async function approveLeave(emp, typeCode, fromDate, toDate, days, extraPayload = {}) {
  const payload = { leaveTypeCode: typeCode, leaveType: typeCode, fromDate, toDate, days, ...extraPayload }
  const req = await repo('Request').save({ typeCode: 'LEAVE', requesterId: emp.id, branchId: emp.branchId, createdByUserId: admin.id, status: 'APPROVED',
    payload: JSON.stringify(payload), submittedAt: new Date() })
  const { DestinationsService } = require('../src/requests/destinations.service')
  const result = await ds.transaction(em => app.get(DestinationsService).execute(em, req,
    { code: 'LEAVE', nameAr: 'طلب إجازة', category: 'leaves', destinationHandler: 'leave_no_balance' }))
  assert.equal(result.completed, true)
  return repo('Leave').findOneByOrFail({ requestId: req.id })
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, /^hr_leave_sick_pay_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
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
  branch = await repo('Branch').save({ code: 'SICK_TEST', name: 'فرع اختبار المرضية' })
  otherBranch = await repo('Branch').save({ code: 'SICK_OTHER', name: 'فرع آخر' })
  admin = await repo('User').save({ email: 'admin@sick-pay.invalid', displayName: 'admin', passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  const hrPerms = JSON.stringify(['leaves.view_all', 'leaves.revoke', 'documents.manage'])
  hr = await repo('User').save({ email: 'hr@sick-pay.invalid', displayName: 'hr', passwordHash: 'test-only', role: 'hr_manager', branchId: branch.id, permissions: hrPerms })
  hrOther = await repo('User').save({ email: 'hr-other@sick-pay.invalid', displayName: 'hr-other', passwordHash: 'test-only', role: 'hr_manager', branchId: otherBranch.id, permissions: hrPerms })
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '1' }, { key: 'payroll.monthly_days', value: '30' }, { key: 'payroll.daily_hours', value: '8' },
    { key: 'payroll.exempt_overtime_eligible', value: 'false' }, { key: 'payroll.exempt_unpaid_leave_deductible', value: 'true' },
    { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' },
  ])
  await repo('LeaveType').save([
    { code: 'SICK_T', nameAr: 'مرضية اختبار', isPaid: true, balanceType: 'sick', requiredAttachment: 'تقرير طبي', category: 'SICK',
      sickPayTiers: '[{"fromDay":1,"toDay":30,"payPercent":100},{"fromDay":31,"toDay":90,"payPercent":75},{"fromDay":91,"toDay":null,"payPercent":0}]',
      attachmentRule: 'REQUIRED', attachmentTiming: 'AFTER_RETURN', attachmentDeadlineDays: 7 },
    { code: 'SICK_ABOVE', nameAr: 'مرضية فوق يومين', isPaid: true, balanceType: 'sick', requiredAttachment: 'تقرير طبي', category: 'SICK',
      sickPayTiers: null, attachmentRule: 'REQUIRED_ABOVE_DAYS', attachmentAboveDays: 2, attachmentTiming: 'AFTER_RETURN', attachmentDeadlineDays: 7 },
  ])
}, { timeout: 90000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_leave_sick_pay_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.match(path.basename(uploads), /^hr-leave-sick-pay-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Sick pay fixture cleanup failed')
})

test('attachment after return: PENDING on approval, uploads by the employee and HR, daily reminder, then MISSED + isUnpaid deducted once by payroll', async t => {
  const emp = await employee()
  const self = await repo('User').save({ email: 'emp@sick-pay.invalid', displayName: 'emp', passwordHash: 'test-only', role: 'employee', branchId: branch.id, employeeId: emp.id, permissions: '[]' })
  const other = await employee({ fullName: 'زميل' })
  const colleague = await repo('User').save({ email: 'colleague@sick-pay.invalid', displayName: 'colleague', passwordHash: 'test-only', role: 'employee', branchId: branch.id, employeeId: other.id, permissions: '[]' })
  const { LeaveAttachmentDeadlineJob } = require('../src/requests/leave-attachment-deadline.job')
  const job = app.get(LeaveAttachmentDeadlineJob)

  // 1) كتابة الإجازة المعتمدة: PENDING بموعد toDate + 7؛ النوع «فوق يومين» بيومين لا يُتتبع؛ المرفق مع الطلب = UPLOADED
  const july = await approveLeave(emp, 'SICK_T', '2026-07-06', '2026-07-08', 3)
  assert.deepEqual([july.attachmentStatus, july.attachmentDueDate, july.attachmentRef, july.isUnpaid], ['PENDING', '2026-07-15', null, false])
  const soon = await approveLeave(emp, 'SICK_T', ymdPlus(1), ymdPlus(2), 2)
  assert.deepEqual([soon.attachmentStatus, soon.attachmentDueDate], ['PENDING', ymdPlus(9)])
  const hrTarget = await approveLeave(emp, 'SICK_T', ymdPlus(5), ymdPlus(6), 2)
  const short = await approveLeave(emp, 'SICK_ABOVE', ymdPlus(10), ymdPlus(11), 2)
  assert.equal(short.attachmentStatus, null, 'REQUIRED_ABOVE_DAYS with days not above the limit is not tracked')
  const withFile = await approveLeave(other, 'SICK_ABOVE', ymdPlus(10), ymdPlus(12), 3, { attachmentUrl: 'file:999' })
  assert.deepEqual([withFile.attachmentStatus, withFile.attachmentRef], ['UPLOADED', 'file:999'])

  // 2) التذكير: يوم الموعد نفسه ليس متأخرًا؛ الإشعار للموظف وللموارد البشرية في فرعها فقط
  const reminderRun = await job.run('2026-07-15')
  assert.deepEqual(reminderRun.missed, [])
  assert.ok(reminderRun.reminders.some(row => row.leaveId === july.id))
  assert.equal((await repo('Leave').findOneByOrFail({ id: july.id })).attachmentStatus, 'PENDING')
  const mine = expectStatus(await request(self, 'GET', '/notifications'), 200)
  assert.ok(mine.some(n => n.title === 'ارفع مرفق إجازتك' && n.body.includes(ymdPlus(9))), JSON.stringify(mine))
  const hrNotes = expectStatus(await request(hr, 'GET', '/notifications'), 200)
  assert.ok(hrNotes.some(n => n.title === 'مرفقات إجازات معلقة'), JSON.stringify(hrNotes))
  assert.ok(!expectStatus(await request(hrOther, 'GET', '/notifications'), 200).some(n => n.title === 'مرفقات إجازات معلقة'), 'another branch HR is not reminded')

  // 3) الرفع: زميل ممنوع، HR فرع آخر لا يرى الإجازة، الموظف نفسه يرفع، HR الفرع يرفع لإجازة أخرى
  const selfRef = await uploadPdf(self, soon.id)
  expectStatus(await request(colleague, 'POST', `/leaves/${soon.id}/attachment`, { fileRef: selfRef }), 403)
  expectStatus(await request(hrOther, 'POST', `/leaves/${soon.id}/attachment`, { fileRef: selfRef }), 404)
  expectStatus(await request(self, 'POST', `/leaves/${soon.id}/attachment`, { fileRef: 'nope' }), 400)
  const uploaded = expectStatus(await request(self, 'POST', `/leaves/${soon.id}/attachment`, { fileRef: selfRef }), 201)
  assert.deepEqual([uploaded.attachmentStatus, uploaded.attachmentRef], ['UPLOADED', selfRef])
  const colleagueRef = await uploadPdf(colleague, other.id)
  expectStatus(await request(hr, 'POST', `/leaves/${hrTarget.id}/attachment`, { fileRef: colleagueRef }), 403)
  const hrRef = await uploadPdf(hr, hrTarget.id)
  assert.equal(expectStatus(await request(hr, 'POST', `/leaves/${hrTarget.id}/attachment`, { fileRef: hrRef }), 201).attachmentStatus, 'UPLOADED')
  expectStatus(await request(self, 'POST', `/leaves/${short.id}/attachment`, { fileRef: selfRef }), 400)
  const mineAfter = expectStatus(await request(self, 'GET', '/leaves/mine'), 200)
  assert.equal(mineAfter.find(l => l.id === soon.id).attachmentStatus, 'UPLOADED')

  // 4) بعد الموعد بلا رفع: MISSED وisUnpaid؛ المرفوع لا يُمس؛ التشغيل الثاني لا يكرر؛ الرفع بعدها مرفوض؛ الإشعار للطرفين
  const missedRun = await job.run('2026-07-16')
  assert.deepEqual(missedRun.missed.map(row => row.leaveId), [july.id])
  const missed = await repo('Leave').findOneByOrFail({ id: july.id })
  assert.deepEqual([missed.attachmentStatus, missed.isUnpaid, missed.status], ['MISSED', true, 'APPROVED'])
  assert.equal((await repo('Leave').findOneByOrFail({ id: soon.id })).attachmentStatus, 'UPLOADED')
  assert.deepEqual((await job.run('2026-07-17')).missed, [])
  expectStatus(await request(self, 'POST', `/leaves/${july.id}/attachment`, { fileRef: selfRef }), 400)
  const selfPayload = { sub: self.id, role: self.role, branchId: self.branchId, employeeId: emp.id, permissions: [] }
  assert.ok((await job.notificationsFor(selfPayload, '2026-07-16')).some(n => n.id === `leave-attachment-missed-${july.id}`))
  const hrPayload = { sub: hr.id, role: hr.role, branchId: branch.id, employeeId: null, permissions: JSON.parse(hr.permissions) }
  assert.ok((await job.notificationsFor(hrPayload, '2026-07-16')).some(n => n.id === `leave-attachment-missed-hr-${july.id}` && n.body.includes(emp.fullName)))

  // 5) المسير: الأيام الثلاثة تُخصم بدون راتب (900) مرة واحدة، ولا سطر خصم مرضي عليها
  const run = await calculate('2026-07', [emp])
  const item = itemOf(run, emp), breakdown = JSON.parse(item.breakdown)
  assert.equal(Number(item.unpaidLeaveDays), 3)
  assert.equal(Number(item.unpaidLeaveDeduction), 900)
  assert.equal(Number(item.netPay), 8100)
  assert.deepEqual(breakdown.leaveDeductionLines.map(l => [l.code, l.amount]), [['UNPAID_LEAVE', 900]])
  assert.deepEqual(breakdown.sickLeave.days.map(d => [d.dayNumber, d.status]), [[1, 'UNPAID'], [2, 'UNPAID'], [3, 'UNPAID']])
  t.diagnostic('Manual: 9000 − 3 × 300 (MISSED sick days now unpaid) = 8100; no tier deduction on top.')
})

test('sick pay tiers: days 31-40 of the year at 75% deduct 750 as their own line; an isUnpaid sick day is not charged twice', async t => {
  const emp = await employee()
  await sickLeave(emp, '2026-01-05', '2026-02-03') // الأيام 1-30 بأجر كامل
  const june = await sickLeave(emp, '2026-06-01', '2026-06-10') // الأيام 31-40 بـ75%
  const unpaid = await sickLeave(emp, '2026-06-15', '2026-06-16', { isUnpaid: true, attachmentStatus: 'MISSED', attachmentDueDate: '2026-06-23' })
  const run = await calculate('2026-06', [emp])
  const item = itemOf(run, emp), breakdown = JSON.parse(item.breakdown)
  assert.equal(Number(item.unpaidLeaveDays), 2)
  assert.equal(Number(item.unpaidLeaveDeduction), 1350)
  assert.equal(Number(item.netPay), 7650)
  assert.deepEqual(breakdown.leaveDeductionLines, [
    { code: 'UNPAID_LEAVE', label: 'إجازة بدون راتب', days: 2, payPercent: 0, amount: 600 },
    { code: 'SICK_LEAVE_75', label: 'خصم إجازة مرضية (بنسبة أجر 75%)', days: 10, payPercent: 75, amount: 750 },
  ])
  assert.deepEqual(breakdown.sickLeave.days.map(d => d.dayNumber), [31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42])
  assert.deepEqual(breakdown.sickLeave.leaveIds.sort((a, b) => a - b), [june.id, unpaid.id].sort((a, b) => a - b))
  assert.equal(breakdown.sickLeave.amount, 750)
  await assertUnpaidParity(run, emp)
  const payslip = expectStatus(await request(admin, 'GET', `/payroll/items/${item.id}`), 200)
  assert.deepEqual(payslip.leaveDeductions.map(l => [l.label, l.amount]), [['إجازة بدون راتب', 600], ['خصم إجازة مرضية (بنسبة أجر 75%)', 750]])
  t.diagnostic('Manual: day rate 300; 10 days × 300 × 25% = 750 (sick) + 2 unpaid days × 300 = 600; net 9000 − 1350 = 7650.')
})

test('sick pay tiers: crossing day 90 splits into 75% and 0% lines; fully paid sick days add nothing', async t => {
  const crossing = await employee()
  await sickLeave(crossing, '2026-01-01', '2026-03-29') // 88 يومًا
  await sickLeave(crossing, '2026-06-01', '2026-06-04') // 89-90 بـ75%، 91-92 بلا أجر
  const paidOnly = await employee()
  await sickLeave(paidOnly, '2026-06-01', '2026-06-05') // 1-5 بأجر كامل
  const run = await calculate('2026-06', [crossing, paidOnly])
  const crossingItem = itemOf(run, crossing), lines = JSON.parse(crossingItem.breakdown).leaveDeductionLines
  assert.deepEqual(lines.map(l => [l.label, l.days, l.amount]), [['خصم إجازة مرضية (بنسبة أجر 75%)', 2, 150], ['خصم إجازة مرضية (بنسبة أجر 0%)', 2, 600]])
  assert.equal(Number(crossingItem.unpaidLeaveDays), 0)
  assert.equal(Number(crossingItem.unpaidLeaveDeduction), 750)
  assert.equal(Number(crossingItem.netPay), 8250)
  await assertUnpaidParity(run, crossing)
  const paidItem = itemOf(run, paidOnly), paidBreakdown = JSON.parse(paidItem.breakdown)
  assert.equal(Number(paidItem.unpaidLeaveDeduction), 0)
  assert.equal(Number(paidItem.netPay), 9000)
  assert.deepEqual(paidBreakdown.leaveDeductionLines, [])
  assert.deepEqual(paidBreakdown.sickLeave.days.map(d => d.status), ['NONE', 'NONE', 'NONE', 'NONE', 'NONE'])
  t.diagnostic('Manual: 2 × 300 × 25% = 150 + 2 × 300 × 100% = 600 → 750; five fully paid days → 0.')
})
