'use strict'
// B4.8 (أ) على SQL حقيقي: الإخفاء الجزئي للهوية والآيبان (إعداد مقفول افتراضيًا) في ملف الموظف والقايمة وملف Excel، وتصدير بيانات موظف
// واحد كاملة (طلب اطلاع) بصلاحية «تعديل الموظفين» وبنطاق الفروع وبسطر تدقيق. قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const ExcelJS = require('../node_modules/exceljs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_employee_privacy_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_employee_privacy_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-employee-privacy-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const privacy = require('../src/employees/employee-privacy')
const IBAN = 'SA0380000000608010167519', ID = '2123456789', PASSPORT = 'A12345678'
let master, app, ds, base, admin, created = false
const B = {}, U = {}, E = {}
const repo = name => { assert.match(database, NAME); assert.equal(ds.options.database, database); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token(user) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const raw = await response.text(); return { status: response.status, body: raw ? JSON.parse(raw) : null }
}
const ok = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const setMasking = value => request(admin, 'PATCH', '/settings/config', { key: privacy.PARTIAL_MASKING_KEY, value })
const fields = row => [row.nationalId ?? null, row.passportNo ?? null, row.iban ?? null, row.nationalIdMasked ?? null, row.passportNoMasked ?? null, row.ibanMasked ?? null]
const fileOf = async user => fields(ok(await request(user, 'GET', `/employees/${E.target.id}`), 200))
const listOf = async user => fields(ok(await request(user, 'GET', '/employees'), 200).find(row => row.id === E.target.id))
const profileOf = async user => fields(ok(await request(user, 'GET', `/employees/${E.target.id}/profile`), 200).employee)
const historyOf = async user => { const row = ok(await request(user, 'GET', `/employees/${E.target.id}/history`), 200).find(entry => entry.fieldName === 'nationalId'); return [row.oldValue, row.newValue] }
const documentNumbers = async user => ok(await request(user, 'GET', `/employees/${E.target.id}/profile`), 200).documents.map(doc => doc.number)
async function exportRow(user) {
  const response = await fetch(`${base}/employees/export?ids=${E.target.id}`, { headers: { Authorization: 'Bearer ' + token(user) } })
  assert.equal(response.status, 200)
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(Buffer.from(await response.arrayBuffer()))
  const sheet = workbook.getWorksheet('الموظفين'), headers = sheet.getRow(1).values.slice(1), values = sheet.getRow(2).values.slice(1)
  const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? null]))
  return [row['رقم الهوية / الإقامة'], row['رقم الجواز'], row['الآيبان'] ?? null]
}
const account = (label, permissions, extra = {}) => repo('User').save({ email: `${label}@employee-privacy.invalid`, displayName: label, passwordHash: 'test-only', role: 'employee', branchId: B.one.id,
  permissions: JSON.stringify(permissions), ...extra })

before(async () => {
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true } }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  // مفيش رسالة بريد حقيقية بتطلع من الاختبار
  const { MailService } = require('../src/auth/mail.service')
  const mail = app.get(MailService)
  mail.isConfigured = () => false
  mail.send = async () => { throw new Error('no mail in tests') }
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1'); ds = app.get(require('../node_modules/typeorm').DataSource)
  assert.equal(ds.options.database, database)
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  B.one = await repo('Branch').save({ code: 'EP_1', name: 'فرع الاختبار', country: 'SA' })
  B.two = await repo('Branch').save({ code: 'EP_2', name: 'فرع تاني', country: 'EG' })
  admin = await repo('User').save({ email: 'admin@employee-privacy.invalid', displayName: 'Fixture admin', passwordHash: 'test-only', role: 'super_admin', scopeAllBranches: true, permissions: '[]' })
  E.target = await repo('Employee').save({ employeeCode: 'EP1', fullName: 'موظف الخصوصية', branchId: B.one.id, joinDate: '2020-01-01', basicSalary: 9000, housingAllowance: 0, transportAllowance: 0,
    otherAllowance: 0, status: 'active', isActive: true, payMethod: 'transfer', bankName: 'بنك الموظف', iban: IBAN, nationalId: ID, passportNo: PASSPORT, nationality: 'مصري' })
  E.other = await repo('Employee').save({ employeeCode: 'EP2', fullName: 'موظف تاني', branchId: B.two.id, joinDate: '2021-01-01', basicSalary: 5000, housingAllowance: 0, transportAllowance: 0,
    otherAllowance: 0, status: 'active', isActive: true, payMethod: 'cash' })
  U.viewer = await account('viewer', ['employees.view'])
  U.payroll = await account('payroll', ['employees.view', 'payroll.view'])
  U.editor = await account('editor', ['employees.view', 'employees.edit'])
  U.self = await account('self', [], { employeeId: E.target.id })
  await require('../src/seed/seed-requests').seedRequests(ds)
  if (!(await repo('RequestsConfig').findOneBy({ key: privacy.PARTIAL_MASKING_KEY }))) await repo('RequestsConfig').save({ key: privacy.PARTIAL_MASKING_KEY, value: 'false' })
  await repo('RequestsConfig').update({ key: privacy.PARTIAL_MASKING_KEY }, { value: 'false' })
  // CR4-SELF: سطر تغيير هوية في سجل الموظف ومستند هوية برقمه — نفس حكم الإخفاء
  await repo('EmployeeStatusHistory').save({ employeeId: E.target.id, changeType: 'DATA', fieldName: 'nationalId', oldValue: '2000000001', newValue: ID, oldStatus: null, newStatus: 'change', reason: 'تصحيح رقم' })
  await repo('EmployeeDocument').save({ employeeId: E.target.id, docType: 'national_id', number: ID, issueDate: '2025-01-01', expiryDate: '2030-01-01' })
  U.docs = await account('docs', ['employees.view', 'documents.manage'])
}, { timeout: 120000 })

after(async t => {
  if (app) await app.close()
  try {
    if (created) {
      assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('database', database).query('SELECT DB_ID(@database) AS id')).recordset[0].id, null)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } finally {
    if (master) await master.close()
    fs.rmSync(uploads, { recursive: true, force: true })
  }
})

test('EP-01: الإعداد مقفول (الافتراضي) — الهوية كاملة لكل من يشوف الموظف، والآيبان مشيول عن غير المصرّح له بالمالية، ومفيش خانات مخفية', async () => {
  const FULL = [ID, PASSPORT, IBAN, null, null, null], NO_FINANCE = [ID, PASSPORT, null, null, null, null]
  for (const read of [fileOf, listOf, profileOf]) {
    assert.deepEqual([await read(U.viewer), await read(U.payroll), await read(U.editor)], [NO_FINANCE, FULL, FULL], read.name)
  }
  assert.deepEqual(await fileOf(U.self), FULL)
  assert.deepEqual([await exportRow(U.viewer), await exportRow(U.editor)], [[ID, PASSPORT, null], [ID, PASSPORT, IBAN]])
  // CR4-SELF: سجل تغيير الهوية وأرقام المستندات كاملين زي الأول
  assert.deepEqual([await historyOf(U.viewer), await documentNumbers(U.viewer)], [['2000000001', ID], [ID]])
})

test('EP-02: الإعداد مفتوح — الهوية والجواز بآخر 4 خانات لغير صاحب الملف واللي بيعدّل، والآيبان مخفي لغير المصرّح له بالمالية — في الملف والقايمة وملف Excel', async () => {
  ok(await setMasking('true'), 200)
  const MASKED_ID = '•••••• 6789', MASKED_PASSPORT = '•••••• 5678', MASKED_IBAN = 'SA•• •••• 7519'
  const FULL = [ID, PASSPORT, IBAN, null, null, null]
  for (const read of [fileOf, listOf, profileOf]) {
    assert.deepEqual(await read(U.viewer), [null, null, null, MASKED_ID, MASKED_PASSPORT, MASKED_IBAN], read.name)
    assert.deepEqual(await read(U.payroll), [null, null, IBAN, MASKED_ID, MASKED_PASSPORT, null], read.name)
    assert.deepEqual(await read(U.editor), FULL, read.name)
  }
  assert.deepEqual([await fileOf(U.self), await fileOf(admin)], [FULL, FULL])
  // CR4-SELF: السجل والمستندات بنفس الحكم — المخفي لغير صاحب الملف واللي بيعدّل (ومدير المستندات بيشوف أرقامها)
  assert.deepEqual([await historyOf(U.viewer), await historyOf(U.payroll), await historyOf(U.editor), await historyOf(U.self)],
    [['•••••• 0001', MASKED_ID], ['•••••• 0001', MASKED_ID], ['2000000001', ID], ['2000000001', ID]])
  assert.deepEqual([await documentNumbers(U.viewer), await documentNumbers(U.editor), await documentNumbers(U.docs), await documentNumbers(U.self)], [[MASKED_ID], [ID], [ID], [ID]])
  assert.doesNotMatch(JSON.stringify(ok(await request(U.viewer, 'GET', `/employees/${E.target.id}/profile`), 200)), new RegExp(`${ID}|${PASSPORT}|${IBAN}|2000000001`))
  // ملف Excel بنفس الحكم (والآيبان عمود مالي: مش موجود أصلًا لغير المصرّح)
  assert.deepEqual([await exportRow(U.viewer), await exportRow(U.payroll), await exportRow(U.editor)], [[MASKED_ID, MASKED_PASSPORT, null], [MASKED_ID, MASKED_PASSPORT, IBAN], [ID, PASSPORT, IBAN]])
  // التعديل مابيتأثرش: اللي بيعدّل بيحفظ خانة تانية والهوية والآيبان زي ما هم
  ok(await request(U.editor, 'PATCH', `/employees/${E.target.id}`, { jobTitle: 'محاسب أول' }), 200)
  const saved = await repo('Employee').findOneByOrFail({ id: E.target.id })
  assert.deepEqual([saved.nationalId, saved.passportNo, saved.iban, saved.jobTitle], [ID, PASSPORT, IBAN, 'محاسب أول'])
  // المفتاح بقيمتين بس، ولحساب بكل الفروع
  assert.deepEqual([(await setMasking('maybe')).status, (await request(U.editor, 'PATCH', '/settings/config', { key: privacy.PARTIAL_MASKING_KEY, value: 'false' })).status], [400, 403])
  ok(await setMasking('false'), 200)
  assert.deepEqual(await fileOf(U.viewer), [ID, PASSPORT, null, null, null, null])
})

test('EP-03: تصدير بيانات الموظف — ملف الموظف وكل سجلاته، بصلاحية «تعديل الموظفين» وبنطاق الفروع، وبسطر تدقيق، ومن غير بيانات دخول', async () => {
  await repo('EmployeeDocument').save({ employeeId: E.target.id, docType: 'iqama', number: 'IQ-1', issueDate: '2026-01-01', expiryDate: '2027-01-01' })
  await repo('Leave').save({ employeeId: E.target.id, leaveTypeCode: 'ANNUAL', fromDate: '2026-03-01', toDate: '2026-03-03', days: 3, period: 'FULL', isUnpaid: false, status: 'APPROVED' })
  await repo('EmployeeSuspension').save({ employeeId: E.target.id, fromDate: '2026-04-01', toDate: '2026-04-02', plannedToDate: '2026-04-02', reason: 'إيقاف تجربة', status: 'ACTIVE' })
  await repo('Leave').save({ employeeId: E.other.id, leaveTypeCode: 'ANNUAL', fromDate: '2026-03-01', toDate: '2026-03-01', days: 1, period: 'FULL', isUnpaid: false, status: 'APPROVED' })
  // طلب عادي وطلب سرّي (شكوى) للموظف نفسه
  await repo('Request').save({ typeCode: 'LEAVE', requesterId: E.target.id, branchId: B.one.id, status: 'SUBMITTED', payload: '{"note":"طلب عادي"}' })
  await repo('Request').save({ typeCode: 'GRIEVANCE', requesterId: E.target.id, branchId: B.one.id, status: 'SUBMITTED', isConfidential: true, payload: '{"description":"شكوى سرّية جدًا"}' })
  const route = `/employees/${E.target.id}/data-export`
  // من غير «تعديل الموظفين» 403 (حتى صاحب الملف)، وموظف برّه نطاق الحساب «غير موجود»
  assert.deepEqual([(await request(U.viewer, 'GET', route)).status, (await request(U.payroll, 'GET', route)).status, (await request(U.self, 'GET', route)).status,
    (await request(U.editor, 'GET', `/employees/${E.other.id}/data-export`)).status, (await request(admin, 'GET', '/employees/987654/data-export')).status], [403, 403, 403, 404, 404])
  assert.equal(await repo('AuditLog').countBy({ action: 'EMPLOYEE_DATA_EXPORT' }), 0, 'الرفض مابيتسجّلش تصدير')
  const data = ok(await request(U.editor, 'GET', route), 200)
  assert.deepEqual([data.employeeId, data.employee.fullName, data.employee.nationalId, data.employee.iban, /^\d{4}-\d{2}-\d{2}T/.test(data.exportedAt)], [E.target.id, 'موظف الخصوصية', ID, IBAN, true])
  const counts = Object.fromEntries(data.sections.map(section => [section.key, section.count]))
  assert.deepEqual([counts.documents, counts.leaves, counts.suspensions, counts.payrollItems, counts.requests], [2, 1, 1, 0, 1])
  // CR4-SELF: الطلب السرّي برّه الملف (والعادي جوّه)، وقسم الجزاءات محتاج صلاحيته — اللي اتشال متقال من غير أعداد
  assert.deepEqual(data.sections.find(section => section.key === 'requests').rows.map(row => row.typeCode), ['LEAVE'])
  assert.doesNotMatch(JSON.stringify(data), /شكوى سرّية جدًا|GRIEVANCE/)
  assert.deepEqual([data.omitted, 'penalties' in counts, data.excluded.includes('الطلبات السرّية')], [[{ key: 'penalties', label: 'الجزاءات', reason: 'محتاج صلاحية لائحة الجزاءات' }], false, true])
  const withPenalties = ok(await request(admin, 'GET', route), 200)
  assert.deepEqual([withPenalties.omitted, withPenalties.sections.some(section => section.key === 'penalties'), withPenalties.sections.find(section => section.key === 'requests').count], [[], true, 1])
  // سجلات الموظف ده بس
  assert.ok(data.sections.every(section => section.rows.every(row => (row.employeeId ?? row.requesterId) === E.target.id)))
  assert.deepEqual(data.sections.find(section => section.key === 'documents').rows.map(row => row.number), [ID, 'IQ-1'])
  assert.equal(data.sections.find(section => section.key === 'leaves').label, 'الإجازات')
  // ولا كلمة مرور ولا حساب دخول في الملف
  assert.doesNotMatch(JSON.stringify(data), /passwordHash|test-only|totpSecret/)
  const audit = await repo('AuditLog').find({ where: { action: 'EMPLOYEE_DATA_EXPORT' }, order: { id: 'ASC' } })
  assert.deepEqual(audit.map(row => [row.category, Number(row.entityId), row.actorUserId, row.branchId]), [['EXPORT', E.target.id, U.editor.id, B.one.id], ['EXPORT', E.target.id, admin.id, B.one.id]])
  // التصدير قراءة بس
  assert.deepEqual([await repo('Leave').countBy({ employeeId: E.target.id }), await repo('EmployeeDocument').countBy({ employeeId: E.target.id })], [1, 2])
})
