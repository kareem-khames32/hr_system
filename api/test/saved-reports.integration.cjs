// B2.13 (ب): التقرير المحفوظ (فلاتر باسم، لصاحبه بس) والتقرير المجدول بالبريد (بهوية صاحبه وقت الإرسال).
// HTTP وSQL فعليان في قاعدة اختبار عشوائية تُحذف بعد الانتهاء. ولا رسالة بريد حقيقية: send متبدّلة على النسخة نفسها.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const ExcelJS = require('../node_modules/exceljs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_saved_reports_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-saved-reports-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const { localDateOf } = require('../src/attendance/attendance.service')
const { addDays } = require('../src/employees/employee-suspension-rules')
const { NOTIFICATIONS_EMAIL_ENABLED_KEY } = require('../src/notifications/notifications.service')
const rules = require('../src/reports/saved-reports')
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
let app, ds, master, base, created = false, admin, reader, other, plain, viewer, saver, branchA, branchB, saved, mail
const outbox = []
let mailFails = false

const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
const claims = user => ({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: null,
  tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function call(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt.sign(claims(user))}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const type = response.headers.get('content-type') ?? ''
  if (!type.includes('json')) return { status: response.status, type, bytes: Buffer.from(await response.arrayBuffer()), body: null }
  const text = await response.text()
  return { status: response.status, type, body: text ? JSON.parse(text) : null }
}
const expect = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body ?? null)); return response.body }
const messageOf = response => [].concat(response.body?.message ?? []).join('، ')
async function sheetRows(bytes) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(bytes)
  const rows = []
  workbook.worksheets[0].eachRow(row => rows.push(row.values.slice(1).map(value => value ?? null)))
  return rows
}
const at = hour => { const now = new Date(); now.setHours(hour, 0, 0, 0); return now }
const rowOf = id => repo('SavedReport').findOneByOrFail({ id })
const sentOn = async id => { const row = await rowOf(id); return row.lastSentOn ? String(row.lastSentOn).slice(0, 10) : null }
const scheduledAudits = () => repo('AuditLog').count({ where: { action: 'REPORT_EXPORT' } })
const setMail = async on => {
  const configs = repo('RequestsConfig'), found = await configs.findOne({ where: { key: NOTIFICATIONS_EMAIL_ENABLED_KEY } })
  await configs.save({ ...(found ?? {}), key: NOTIFICATIONS_EMAIL_ENABLED_KEY, value: on ? 'true' : 'false' })
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql'); assert.match(database, /^hr_saved_reports_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  // ولا رسالة بريد حقيقية: الإرسال بيتسجّل في outbox بس
  const { MailService } = require('../src/auth/mail.service')
  mail = app.get(MailService)
  mail.isConfigured = () => true
  mail.send = async message => {
    if (mailFails) throw new Error('خادم البريد مش بيرد (اختبار)')
    outbox.push(message)
    return { accepted: [message.to], rejected: [], messageId: 'test', response: 'ok' }
  }
  assert.notEqual(mail.send, MailService.prototype.send)
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => {}
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => {}
  ds = app.get(require('../node_modules/typeorm').DataSource); assert.equal(ds.options.database, database)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  saved = app.get(require('../src/reports/saved-reports.service').SavedReportsService)
  await repo('RequestsConfig').save([{ key: 'payroll.cycle_start_day', value: '1' }, { key: 'company.name', value: 'شركة اختبار التقارير المحفوظة' }])
  branchA = await repo('Branch').save({ code: 'SRA', name: 'فرع التقارير أ', country: 'EG', weekendDays: 'FRI' })
  branchB = await repo('Branch').save({ code: 'SRB', name: 'فرع التقارير ب', country: 'EG', weekendDays: 'FRI' })
  const account = (label, role, permissions, extra = {}) => repo('User').save({ email: `${label}@saved-reports.invalid`, displayName: `حساب ${label}`, passwordHash: 'test-only',
    role, permissions: JSON.stringify(permissions), isActive: true, ...extra })
  admin = await account('admin', 'super_admin', ['*'])
  reader = await account('reader', 'employee', ['reports.view', 'reports.save'], { branchId: branchA.id })
  other = await account('other', 'employee', ['reports.view', 'reports.save'], { branchId: branchA.id })
  plain = await account('plain', 'employee', [], { branchId: branchA.id })
  // عرض بس (زي أدوار «قراءة فقط»)، وحفظ من غير مركز التقارير
  viewer = await account('viewer', 'employee', ['reports.view'], { branchId: branchA.id })
  saver = await account('saver', 'employee', ['reports.save'], { branchId: branchA.id })
  let n = 0
  const employee = branch => repo('Employee').save({ employeeCode: `SR${String(++n).padStart(3, '0')}`, fullName: `موظف تقارير ${n}`, branchId: branch.id, status: 'active',
    isActive: true, joinDate: '2024-01-01' })
  for (const branch of [branchA, branchA, branchA, branchB, branchB]) await employee(branch)
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_saved_reports_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('db', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name=@db')).recordset.length, 0)
      t.diagnostic(`تحقق حذف قاعدة الاختبار: ${database}`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir())); assert.match(path.basename(uploads), /^hr-saved-reports-files-/)
    fs.rmSync(uploads, { recursive: true, force: true }); assert.equal(fs.existsSync(uploads), false)
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'تعذر تنظيف بيئة اختبار التقارير المحفوظة')
})

test('SR-01: a saved report is named filters judged by the report\'s own rules, and it belongs to its owner only', async () => {
  const mine = expect(await call(admin, 'POST', '/reports/saved', { name: '  قوى   الفرع ب ', report: 'headcount', branchId: branchB.id }), 201)
  assert.deepEqual({ name: mine.name, report: mine.report, reportTitle: mine.reportTitle, period: mine.period, filtered: mine.filtered, frequency: mine.frequency, format: mine.format,
    lastSentOn: mine.lastSentOn, lastError: mine.lastError },
  { name: 'قوى الفرع ب', report: 'headcount', reportTitle: 'تقرير القوى العاملة', period: null, filtered: true, frequency: 'NONE', format: 'xlsx', lastSentOn: null, lastError: null })
  const theirs = expect(await call(reader, 'POST', '/reports/saved', { name: 'حضور فرعي', report: 'attendance', period: 'previous', frequency: 'DAILY', format: 'pdf' }), 201)
  assert.deepEqual([theirs.period, theirs.filtered, theirs.frequency, theirs.format], ['previous', false, 'DAILY', 'pdf'])
  // الفلاتر محفوظة بعد الحكم: فرع القارئ مقبول، وفرع برّه نطاقه وتقرير الرواتب من غير صلاحيته مرفوضين من نفس مكان التقرير
  expect(await call(reader, 'POST', '/reports/saved', { name: 'قوى فرعي', report: 'headcount', branchId: branchA.id, departmentIds: [], teamId: null }), 201)
  assert.deepEqual(JSON.parse((await repo('SavedReport').findOneByOrFail({ ownerUserId: reader.id, name: 'قوى فرعي' })).filters),
    { branchId: branchA.id, departmentIds: null, teamId: null, period: 'current' })
  expect(await call(reader, 'POST', '/reports/saved', { name: 'فرع غيري', report: 'headcount', branchId: branchB.id }), 403)
  expect(await call(reader, 'POST', '/reports/saved', { name: 'رواتب', report: 'payroll' }), 403)
  for (const body of [{ name: 'x', report: 'headcount' }, { name: 'تقرير', report: 'nothing' }, { name: 'تقرير', report: 'headcount', frequency: 'HOURLY' },
    { name: 'تقرير', report: 'headcount', format: 'csv' }, { name: 'تقرير', report: 'headcount', branchId: 'abc' }, { report: 'headcount' }, { name: 'ت'.repeat(121), report: 'headcount' }]) {
    expect(await call(admin, 'POST', '/reports/saved', body), 400)
  }
  // نفس الاسم لنفس الحساب مرفوض، ولحساب تاني مقبول
  assert.deepEqual([(await call(reader, 'POST', '/reports/saved', { name: 'حضور فرعي', report: 'leaves' })).status,
    messageOf(await call(reader, 'POST', '/reports/saved', { name: 'حضور فرعي', report: 'leaves' }))], [409, rules.SAVED_REPORT_NAME_TAKEN])
  expect(await call(other, 'POST', '/reports/saved', { name: 'حضور فرعي', report: 'attendance' }), 201)
  // كل حساب بيشوف تقاريره بس، وتقرير حساب تاني = غير موجود (حتى لمدير النظام)
  const listed = expect(await call(reader, 'GET', '/reports/saved'), 200)
  assert.deepEqual(listed.items.map(item => item.name), ['حضور فرعي', 'قوى فرعي'])
  assert.deepEqual([listed.ready, listed.max, listed.sendHour], [true, rules.SAVED_REPORTS_MAX, rules.SAVED_REPORT_SEND_HOUR])
  assert.deepEqual(expect(await call(admin, 'GET', '/reports/saved'), 200).items.map(item => item.name), ['قوى الفرع ب'])
  for (const [user, id] of [[reader, mine.id], [admin, theirs.id], [other, theirs.id]]) {
    for (const [method, route, body] of [['PATCH', `/reports/saved/${id}`, { frequency: 'NONE' }], ['DELETE', `/reports/saved/${id}`], ['GET', `/reports/saved/${id}/export`]]) {
      const response = await call(user, method, route, body)
      assert.deepEqual([response.status, messageOf(response)], [404, rules.SAVED_REPORT_NOT_FOUND], `${method} ${route}`)
    }
  }
  assert.deepEqual([messageOf(await call(reader, 'GET', '/reports/saved/999999/export')), (await rowOf(theirs.id)).frequency], [rules.SAVED_REPORT_NOT_FOUND, 'DAILY'])
  expect(await call(plain, 'GET', '/reports/saved'), 403)
  expect(await call(plain, 'POST', '/reports/saved', { name: 'تقرير', report: 'headcount' }), 403)
  // صلاحية العرض لوحدها: قراءة بس — ولا مسار كاتب (حفظ، تعديل، حذف)؛ وصلاحية الحفظ من غير مركز التقارير مابتكتبش برضه
  const viewing = expect(await call(viewer, 'GET', '/reports/saved'), 200)
  assert.deepEqual([viewing.canSave, viewing.items], [false, []])
  assert.equal(listed.canSave, true)
  const totalRows = () => repo('SavedReport').count()
  const rowsBefore = await totalRows()
  for (const user of [viewer, saver]) {
    for (const [method, route, body] of [['POST', '/reports/saved', { name: 'تقرير عرض', report: 'headcount' }], ['PATCH', `/reports/saved/${theirs.id}`, { frequency: 'NONE' }],
      ['DELETE', `/reports/saved/${theirs.id}`]]) expect(await call(user, method, route, body), 403)
  }
  expect(await call(saver, 'GET', '/reports/saved'), 403)
  assert.deepEqual([await totalRows(), (await rowOf(theirs.id)).frequency], [rowsBefore, 'DAILY'])
  // التعديل: الاسم والدورية والصيغة بس
  const changed = expect(await call(reader, 'PATCH', `/reports/saved/${theirs.id}`, { name: 'حضور الشهر اللي فات', frequency: 'WEEKLY', format: 'xlsx', report: 'payroll', branchId: branchB.id }), 200)
  assert.deepEqual([changed.name, changed.frequency, changed.format, changed.report], ['حضور الشهر اللي فات', 'WEEKLY', 'xlsx', 'attendance'])
  assert.deepEqual(JSON.parse((await rowOf(theirs.id)).filters), { branchId: null, departmentIds: null, teamId: null, period: 'previous' })
  expect(await call(reader, 'PATCH', `/reports/saved/${theirs.id}`, { frequency: 'YEARLY' }), 400)
  expect(await call(reader, 'PATCH', `/reports/saved/${theirs.id}`, { name: 'قوى فرعي' }), 409)
  // الحد: 30 تقرير للحساب
  const count = await repo('SavedReport').count({ where: { ownerUserId: other.id } })
  await repo('SavedReport').save(Array.from({ length: rules.SAVED_REPORTS_MAX - count }, (_, index) => ({ ownerUserId: other.id, name: `حشو ${index}`, reportKey: 'headcount',
    filters: '{}', frequency: 'NONE', format: 'xlsx', lastSentOn: null, lastError: null, createdAt: new Date() })))
  assert.deepEqual([(await call(other, 'POST', '/reports/saved', { name: 'زيادة', report: 'headcount' })).status,
    messageOf(await call(other, 'POST', '/reports/saved', { name: 'زيادة', report: 'headcount' }))], [400, rules.SAVED_REPORTS_FULL])
  await repo('SavedReport').delete({ ownerUserId: other.id })
  // الحذف
  expect(await call(reader, 'DELETE', `/reports/saved/${theirs.id}`), 200)
  expect(await call(reader, 'DELETE', `/reports/saved/${theirs.id}`), 404)
})

test('SR-02: the owner downloads a saved report with its saved filters, under the permissions held now', async () => {
  const mine = expect(await call(admin, 'GET', '/reports/saved'), 200).items.find(item => item.name === 'قوى الفرع ب')
  const audits = await scheduledAudits()
  const file = await call(admin, 'GET', `/reports/saved/${mine.id}/export`)
  assert.equal(file.status, 200); assert.equal(file.type, XLSX)
  assert.deepEqual((await sheetRows(file.bytes))[1], ['الإجمالي', 'الموظفون الحاليون', 2, 2], 'فلتر الفرع (ب) المحفوظ متطبق')
  const pdf = await call(admin, 'GET', `/reports/saved/${mine.id}/export?format=pdf`)
  assert.equal(pdf.status, 200); assert.equal(pdf.bytes.subarray(0, 5).toString(), '%PDF-')
  expect(await call(admin, 'GET', `/reports/saved/${mine.id}/export?format=csv`), 400)
  assert.equal(await scheduledAudits() - audits, 2)
  const last = await repo('AuditLog').findOne({ where: { action: 'REPORT_EXPORT' }, order: { id: 'DESC' } })
  const after = JSON.parse(last.after)
  assert.deepEqual([after.report, after.format, after.savedReportId, after.scheduled, Number(last.actorUserId)], ['headcount', 'pdf', mine.id, undefined, admin.id])
  // تقرير فلتره بقى برّه نطاق صاحبه: التنزيل مرفوض من دالة التقرير (مش بيتجاهل الفلتر)
  const scoped = (await repo('SavedReport').findOneByOrFail({ ownerUserId: reader.id, name: 'قوى فرعي' })).id
  assert.deepEqual((await sheetRows((await call(reader, 'GET', `/reports/saved/${scoped}/export`)).bytes))[1], ['الإجمالي', 'الموظفون الحاليون', 3, 3])
  await repo('User').update({ id: reader.id }, { branchId: branchB.id })
  reader.branchId = branchB.id
  expect(await call(reader, 'GET', `/reports/saved/${scoped}/export`), 403)
  await repo('User').update({ id: reader.id }, { branchId: branchA.id })
  reader.branchId = branchA.id
})

test('SR-03: a scheduled report goes to its owner by mail once when due, built with the owner\'s identity at send time', async () => {
  const today = localDateOf(new Date())
  const scoped = await repo('SavedReport').findOneByOrFail({ ownerUserId: reader.id, name: 'قوى فرعي' })
  const company = expect(await call(admin, 'GET', '/reports/saved'), 200).items.find(item => item.name === 'قوى الفرع ب')
  expect(await call(reader, 'PATCH', `/reports/saved/${scoped.id}`, { frequency: 'DAILY' }), 200)
  const audits = await scheduledAudits()
  // البريد مقفول من الإعدادات (الافتراضي): ولا ملف بيتبني ولا سطر تدقيق، والمستحق بيفضل مستحق
  assert.equal(expect(await call(reader, 'GET', '/reports/saved'), 200).mailReady, false)
  assert.deepEqual(await saved.sendDue(at(9)), { due: 1, sent: 0, failed: 0, skipped: 'mail' })
  assert.deepEqual([outbox.length, await sentOn(scoped.id), await scheduledAudits() - audits], [0, null, 0])
  await setMail(true)
  assert.equal(expect(await call(reader, 'GET', '/reports/saved'), 200).mailReady, true)
  // قبل ساعة الإرسال: ولا حاجة
  assert.deepEqual(await saved.sendDue(at(rules.SAVED_REPORT_SEND_HOUR - 1)), { due: 0, sent: 0, failed: 0, skipped: 'hour' })
  assert.equal(outbox.length, 0)
  // من ساعة الإرسال: رسالة واحدة لصاحب التقرير بالملف، والتقرير اللي من غير دورية مابيتبعتش
  assert.deepEqual(await saved.sendDue(at(rules.SAVED_REPORT_SEND_HOUR)), { due: 1, sent: 1, failed: 0, skipped: null })
  assert.equal(outbox.length, 1)
  const message = outbox[0]
  assert.equal(message.to, reader.email); assert.equal(message.subject, 'تقرير مجدول: قوى فرعي')
  // تاريخ اليوم في نص الرسالة مش رقم من التقرير (من غير شيله الاختبار بيفشل في أي يوم فيه الرقم 3)
  assert.doesNotMatch(message.text.replace(today, ''), /3|موظف تقارير/, 'جسم الرسالة من غير أرقام التقرير')
  assert.equal(message.attachments.length, 1)
  assert.deepEqual([message.attachments[0].contentType, message.attachments[0].filename], [XLSX, `تقرير القوى العاملة-${today}.xlsx`])
  assert.deepEqual((await sheetRows(message.attachments[0].content))[1], ['الإجمالي', 'الموظفون الحاليون', 3, 3], 'بنطاق صاحبه وفلتره')
  assert.deepEqual([await sentOn(scoped.id), (await rowOf(scoped.id)).lastError, await sentOn(company.id)], [today, null, null])
  const audit = await repo('AuditLog').findOne({ where: { action: 'REPORT_EXPORT' }, order: { id: 'DESC' } })
  assert.deepEqual([JSON.parse(audit.after).scheduled, JSON.parse(audit.after).savedReportId, Number(audit.actorUserId)], [true, scoped.id, reader.id])
  assert.match(audit.summary, /^إرسال مجدول /)
  assert.equal(await scheduledAudits() - audits, 1)
  // نفس اليوم مرة تانية: مابيتبعتش تاني
  assert.deepEqual(await saved.sendDue(at(15)), { due: 0, sent: 0, failed: 0, skipped: 'nothing' })
  assert.equal(outbox.length, 1)

  const makeDue = lastSentOn => repo('SavedReport').update({ id: scoped.id }, { lastSentOn, lastError: null })
  const refusedWith = async pattern => {
    const before = { mails: outbox.length, audits: await scheduledAudits() }
    assert.deepEqual(await saved.sendDue(at(9)), { due: 1, sent: 0, failed: 1, skipped: null })
    const row = await rowOf(scoped.id)
    assert.match(String(row.lastError), pattern)
    assert.deepEqual([outbox.length, await scheduledAudits(), String(row.lastSentOn).slice(0, 10)], [before.mails, before.audits, addDays(today, -1)], 'ولا رسالة ولا سطر تدقيق، ولسه مستحق')
  }
  // صاحب التقرير اتنقل: فلتر فرعه القديم بقى برّه نطاقه، فالتقرير مابيتبعتش (مش بيتبعت بنطاق قديم)
  await makeDue(addDays(today, -1))
  await repo('User').update({ id: reader.id }, { branchId: branchB.id })
  await refusedWith(/فرع/)
  await repo('User').update({ id: reader.id }, { branchId: branchA.id })
  // فقد صلاحية التقارير
  await repo('User').update({ id: reader.id }, { permissions: '[]' })
  await refusedWith(/صلاحية التقارير/)
  // أو فقد صلاحية الحفظ والجدولة بس
  await repo('User').update({ id: reader.id }, { permissions: '["reports.view"]' })
  await refusedWith(/صلاحية التقارير وجدولتها/)
  await repo('User').update({ id: reader.id }, { permissions: '["reports.view","reports.save"]' })
  // حسابه اتقفل
  await repo('User').update({ id: reader.id }, { isActive: false })
  await refusedWith(/مقفول/)
  await repo('User').update({ id: reader.id }, { isActive: true })
  // خادم البريد وقع: السبب بيتسجّل، والمحاولة الجاية بتبعت وبتمسحه
  mailFails = true
  // صاحب التقرير بيشوف رسالة عامة (تفاصيل خادم البريد في لوج الخادم بس)
  await refusedWith(/^تعذّر إرسال البريد؛ هيتجرّب تاني في الفحص الجاي$/)
  assert.equal(expect(await call(reader, 'GET', '/reports/saved'), 200).items.find(item => item.id === scoped.id).lastError, rules.SAVED_REPORT_MAIL_FAILED)
  mailFails = false
  assert.deepEqual(await saved.sendDue(at(10)), { due: 1, sent: 1, failed: 0, skipped: null })
  assert.deepEqual([outbox.length, await sentOn(scoped.id), (await rowOf(scoped.id)).lastError], [2, today, null])

  // «كل 7 أيام» و«أول كل شهر» من آخر إرسال
  const due = async (frequency, lastSentOn) => {
    await repo('SavedReport').update({ id: scoped.id }, { frequency, lastSentOn })
    return (await saved.sendDue(at(9))).sent
  }
  assert.equal(await due('WEEKLY', addDays(today, -6)), 0)
  assert.equal(await due('WEEKLY', addDays(today, -7)), 1)
  assert.equal(await due('MONTHLY', `${today.slice(0, 7)}-01` === today ? today : `${today.slice(0, 7)}-01`), 0)
  assert.equal(await due('MONTHLY', addDays(`${today.slice(0, 7)}-01`, -1)), 1)
  assert.equal(await due('NONE', null), 0)
  // تقرير بصيغة PDF: المرفق PDF فعلي
  await repo('SavedReport').update({ id: scoped.id }, { frequency: 'DAILY', format: 'pdf', lastSentOn: null })
  assert.equal((await saved.sendDue(at(9))).sent, 1)
  const pdf = outbox[outbox.length - 1].attachments[0]
  assert.deepEqual([pdf.contentType, pdf.content.subarray(0, 5).toString(), pdf.filename.endsWith('.pdf')], ['application/pdf', '%PDF-', true])
  // تقرير اتمسح أو اتوقف والحلقة لسه مابدأتش فيه: مابيتبعتش (الصف بيتقري تاني قبل البناء)
  await repo('SavedReport').update({ id: scoped.id }, { frequency: 'DAILY', lastSentOn: null })
  const stale = await repo('SavedReport').save({ ownerUserId: reader.id, name: 'هيتمسح قبل الإرسال', reportKey: 'headcount', filters: '{}', frequency: 'DAILY', format: 'xlsx',
    lastSentOn: null, lastError: null, createdAt: new Date() })
  const realFind = mail.send, mails = outbox.length
  mail.send = async message => {
    // أول رسالة في الحلقة: صاحب التقرير التاني بيمسحه قبل ما دوره ييجي
    await repo('SavedReport').delete({ id: stale.id })
    return realFind(message)
  }
  try {
    assert.deepEqual(await saved.sendDue(at(9)), { due: 1, sent: 1, failed: 0, skipped: null })
  } finally { mail.send = realFind }
  assert.equal(outbox.length - mails, 1)
  // تغيير الدورية بيمسح سبب التعذّر القديم
  await repo('SavedReport').update({ id: scoped.id }, { lastError: 'سبب قديم' })
  assert.equal(expect(await call(reader, 'PATCH', `/reports/saved/${scoped.id}`, { frequency: 'WEEKLY' }), 200).lastError, null)
  // موديول/مهمة التقارير: المهمة متسجلة في قايمة المهام المجدولة
  assert.ok(require('../src/scheduler/scheduled-jobs').SCHEDULED_JOB_IDS.includes('reports.scheduled'))
})

test('SR-04 (CRP3D): the owner is judged again after the file is built — a file built with a withdrawn scope or right does not go out', async () => {
  const today = localDateOf(new Date())
  const wide = await repo('User').save({ email: 'wide@saved-reports.invalid', displayName: 'حساب wide', passwordHash: 'test-only', role: 'employee',
    permissions: JSON.stringify(['reports.view', 'reports.save']), isActive: true, branchId: null, scopeAllBranches: true })
  const report = await repo('SavedReport').save({ ownerUserId: wide.id, name: 'قوى كل الفروع', reportKey: 'headcount', filters: '{}', frequency: 'DAILY', format: 'xlsx',
    lastSentOn: null, lastError: null, createdAt: new Date() })
  const realBuild = saved.build
  // تغيير بيحصل بعد أول بناء للملف وقبل الإرسال
  const during = async change => {
    let done = false, builds = 0
    saved.build = async function (...args) { const file = await realBuild.apply(this, args); builds += 1; if (!done) { done = true; await change() } return file }
    try { return { ...(await saved.sendDue(at(9))), builds } } finally { saved.build = realBuild }
  }
  const mails = outbox.length, audits = await scheduledAudits()
  // من غير تغيير: بناء واحد
  assert.deepEqual(await during(async () => {}), { due: 1, sent: 1, failed: 0, skipped: null, builds: 1 })
  assert.deepEqual((await sheetRows(outbox[outbox.length - 1].attachments[0].content))[1], ['الإجمالي', 'الموظفون الحاليون', 5, 5])
  // النطاق اتضيّق والملف بيتبني: اللي بيطلع ملف اتبنى بالنطاق الجديد (3 مش 5)، وسطر تدقيق واحد للملف اللي طلع
  await repo('SavedReport').update({ id: report.id }, { lastSentOn: addDays(today, -1) })
  assert.deepEqual(await during(() => repo('User').update({ id: wide.id }, { scopeAllBranches: false, branchId: branchA.id })), { due: 1, sent: 1, failed: 0, skipped: null, builds: 2 })
  assert.equal(outbox.length - mails, 2)
  assert.deepEqual((await sheetRows(outbox[outbox.length - 1].attachments[0].content))[1], ['الإجمالي', 'الموظفون الحاليون', 3, 3])
  assert.doesNotMatch(JSON.stringify(await sheetRows(outbox[outbox.length - 1].attachments[0].content)), new RegExp(branchB.name))
  assert.equal(await scheduledAudits() - audits, 2)
  // صلاحية الجدولة اتسحبت والملف بيتبني: ولا رسالة ولا سطر تدقيق، والسبب متسجّل
  await repo('SavedReport').update({ id: report.id }, { lastSentOn: addDays(today, -1) })
  const state = { mails: outbox.length, audits: await scheduledAudits() }
  assert.deepEqual(await during(() => repo('User').update({ id: wide.id }, { permissions: '["reports.view"]' })), { due: 1, sent: 0, failed: 1, skipped: null, builds: 1 })
  assert.match(String((await rowOf(report.id)).lastError), /صلاحية التقارير وجدولتها/)
  // والحساب اتقفل والملف بيتبني
  await repo('User').update({ id: wide.id }, { permissions: '["reports.view","reports.save"]' })
  assert.deepEqual(await during(() => repo('User').update({ id: wide.id }, { isActive: false })), { due: 1, sent: 0, failed: 1, skipped: null, builds: 1 })
  assert.match(String((await rowOf(report.id)).lastError), /مقفول/)
  await repo('User').update({ id: wide.id }, { isActive: true })
  // هوية بتتغيّر مع كل بناء: التقرير بيستنى الفحص الجاي (3 محاولات بناء بالكتير)
  let flips = 0
  saved.build = async function (...args) {
    const file = await realBuild.apply(this, args)
    await repo('User').update({ id: wide.id }, { branchId: ++flips % 2 ? branchB.id : branchA.id })
    return file
  }
  try { assert.deepEqual(await saved.sendDue(at(9)), { due: 1, sent: 0, failed: 1, skipped: null }) } finally { saved.build = realBuild }
  assert.deepEqual([flips, (await rowOf(report.id)).lastError], [3, rules.SAVED_REPORT_OWNER_CHANGING])
  assert.deepEqual([outbox.length, await scheduledAudits(), await sentOn(report.id)], [state.mails, state.audits, addDays(today, -1)])
  await repo('SavedReport').delete({ id: report.id })
})
