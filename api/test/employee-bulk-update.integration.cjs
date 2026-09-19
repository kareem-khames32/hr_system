'use strict'
// تحديث بيانات مجموعة موظفين من ملف (Excel/CSV) على قاعدة SQL مؤقتة معزولة (synchronize) عبر HTTP:
// القالب (CSV وExcel ومملي ببيانات النطاق)، المعاينة من غير حفظ، التطبيق صف بصف عبر مسار تعديل الموظف:
// تغيير الراتب بمراجعة في سجل الأجر المؤرخ وسجل تغييرات، رقم بصمة مكرر مرفوض، عزل الفرع، ونقل الفرع بسجل فرع الموظف.
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
const ExcelJS = require('../node_modules/exceljs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_bulk_update_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-bulk-update-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const { localDateOf } = require('../src/attendance/attendance.service')
const { payrollPeriodOfDate } = require('../src/payroll/payroll-period')
let app, master, ds, base, admin, branchUser, created = false
let riyadh, jeddah, finance, sales, jeddahFinance, team
const people = {}
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
const today = () => localDateOf(new Date())
const period = () => payrollPeriodOfDate(today(), 1)

function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function template(user, body) {
  const response = await fetch(`${base}/employees/bulk-update/template`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(user)}` }, body: JSON.stringify(body) })
  return { status: response.status, type: response.headers.get('content-type'), disposition: response.headers.get('content-disposition'),
    buffer: Buffer.from(await response.arrayBuffer()) }
}
async function upload(user, step, content, fileName = 'data.csv', extra = {}) {
  const form = new FormData()
  form.append('file', new Blob([content]), fileName)
  for (const [key, value] of Object.entries(extra)) form.append(key, value)
  const response = await fetch(`${base}/employees/bulk-update/${step}`, { method: 'POST', headers: { Authorization: `Bearer ${token(user)}` }, body: form })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const ok = (response, status = 201) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const csv = rows => '﻿' + rows.map(row => row.join(',')).join('\r\n')
const fresh = id => repo('Employee').findOneByOrFail({ id })

async function employee(key, extra) {
  const n = Object.keys(people).length + 1
  people[key] = await repo('Employee').save({ employeeCode: key, fullName: `موظف الاختبار ${n}`, branchId: riyadh.id, departmentId: finance.id,
    teamId: team.id, joinDate: '2024-01-01', basicSalary: 5000, housingAllowance: 1000, transportAllowance: 0, otherAllowance: 0, currency: 'SAR',
    status: 'active', isActive: true, payMethod: 'cash', phone: '0501234567', nationality: 'سعودي', gender: 'male', birthDate: '1990-01-01',
    nationalId: `10000000${String(n).padStart(2, '0')}`, fingerprintCode: `FP-${n}`, jobTitle: 'محاسب', ...extra })
  return people[key]
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, /^hr_bulk_update_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
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
  riyadh = await repo('Branch').save({ code: 'BULK_RUH', name: 'الرياض' })
  jeddah = await repo('Branch').save({ code: 'BULK_JED', name: 'جدة' })
  finance = await repo('Department').save({ name: 'المالية', branchId: riyadh.id })
  sales = await repo('Department').save({ name: 'المبيعات', branchId: riyadh.id })
  jeddahFinance = await repo('Department').save({ name: 'المالية', branchId: jeddah.id })
  team = await repo('Team').save({ name: 'الحسابات', departmentId: finance.id })
  admin = await repo('User').save({ email: 'admin@bulk.invalid', displayName: 'admin', passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  branchUser = await repo('User').save({ email: 'branch@bulk.invalid', displayName: 'branch hr', passwordHash: 'test-only', role: 'hr',
    branchId: riyadh.id, permissions: JSON.stringify(['employees.view', 'employees.edit']) })
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '1' }, { key: 'payroll.monthly_days', value: '30' }, { key: 'payroll.daily_hours', value: '8' },
  ])
  await employee('BLK001')
  await employee('BLK002')
  await employee('BLK003', { branchId: jeddah.id, departmentId: jeddahFinance.id, teamId: null })
}, { timeout: 120000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_bulk_update_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try { fs.rmSync(uploads, { recursive: true, force: true }) } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Bulk update fixture cleanup failed')
})

test('القالب: CSV بعناوين الحقول المختارة ومملي بموظفين النطاق بس، وأعمدة الراتب محتاجة اعتماد المسير', async () => {
  const file = await template(admin, { fields: ['basicSalary', 'phone'], format: 'csv', employeeIds: [people.BLK001.id, people.BLK003.id] })
  assert.equal(file.status, 200)
  assert.match(file.type, /text\/csv/)
  assert.match(file.disposition, /filename\*=UTF-8''/)
  const text = file.buffer.toString('utf8')
  assert.ok(text.startsWith('﻿'))
  const lines = text.replace(/^﻿/, '').trim().split('\r\n')
  assert.equal(lines[0], 'كود الموظف,اسم الموظف,رقم الجوال,الراتب الأساسي,يسري من راتب شهر')
  assert.deepEqual(lines.slice(1).map(line => line.split(',')[0]), ['BLK001', 'BLK003'])
  assert.equal(lines[1].split(',')[3], '5000.00')

  const scoped = await template(branchUser, { fields: ['phone'], format: 'csv', employeeIds: [people.BLK001.id, people.BLK003.id] })
  assert.equal(scoped.status, 200)
  assert.deepEqual(scoped.buffer.toString('utf8').trim().split('\r\n').slice(1).map(line => line.split(',')[0]), ['BLK001'])
  const salaryDenied = await template(branchUser, { fields: ['basicSalary'], format: 'csv' })
  assert.equal(salaryDenied.status, 403)
  const unknown = await template(admin, { fields: ['password'], format: 'csv' })
  assert.equal(unknown.status, 400)
})

test('المعاينة مابتحفظش: التغيير القديم ← الجديد والأخطاء، وقاعدة البيانات زي ما هي', async () => {
  const preview = ok(await upload(admin, 'preview', csv([['كود الموظف', 'رقم الجوال', 'القسم', 'الجنس'],
    ['BLK001', '0559999999', 'المبيعات', ''], ['NOPE', '0551111111', '', ''], ['BLK002', '', 'التسويق', 'انثى']])))
  assert.deepEqual(preview.summary, { total: 3, ready: 1, unchanged: 0, error: 2 })
  const [first, missing, badDepartment] = preview.rows
  assert.equal(first.status, 'ready')
  assert.deepEqual(first.changes.map(change => [change.field, change.old, change.new]),
    [['phone', '0501234567', '0559999999'], ['department', 'المالية', 'المبيعات'], ['team', 'الحسابات', null]])
  assert.match(missing.errors[0], /«NOPE» مش موجود/)
  assert.match(badDepartment.errors[0], /القسم «التسويق» مش موجود في فرع «الرياض»/)
  assert.equal(first.update, undefined)
  const saved = await fresh(people.BLK001.id)
  assert.equal(saved.phone, '0501234567')
  assert.equal(saved.departmentId, finance.id)
})

test('تغيير الراتب من الملف: مراجعة جديدة في سجل الأجر المؤرخ + سجل تغييرات، والسبب والمرجع إجباريين', async () => {
  const content = csv([['كود الموظف', 'الراتب الأساسي', 'بدل السكن', 'رقم الجوال'], ['BLK001', '6500', '', '0558888888']])
  const noReason = await upload(admin, 'apply', content, 'salaries.csv', { salaryMonth: period() })
  assert.equal(noReason.status, 400)
  assert.match(noReason.body.message, /سبب تغيير الراتب/)
  assert.equal(Number((await fresh(people.BLK001.id)).basicSalary), 5000)

  const preview = ok(await upload(admin, 'preview', content, 'salaries.csv', { salaryMonth: period() }))
  assert.equal(preview.needs.salary, true)
  assert.equal(preview.rows[0].salaryMonth, period())
  const result = ok(await upload(admin, 'apply', content, 'salaries.csv',
    { salaryMonth: period(), salaryReason: 'زيادة سنوية', salaryEvidence: 'قرار 15/2026' }))
  assert.deepEqual(result.summary, { applied: 1, failed: 0, skipped: 0 })
  const saved = await fresh(people.BLK001.id)
  assert.equal(Number(saved.basicSalary), 6500)
  assert.equal(Number(saved.housingAllowance), 1000)
  assert.equal(saved.phone, '0558888888')
  const versions = await ds.query('SELECT [revision], [reason], [evidenceReference] FROM dbo.employee_salary_history_versions WHERE [employeeId]=@0', [people.BLK001.id])
  assert.deepEqual(versions, [{ revision: 1, reason: 'زيادة سنوية', evidenceReference: 'قرار 15/2026' }])
  const segments = await ds.query(`SELECT [effectivePayrollPeriod], CAST([basicSalary] AS nvarchar(40)) AS [basicSalary] FROM dbo.employee_salary_history h
    JOIN dbo.employee_salary_history_versions v ON v.[id]=h.[versionId] WHERE v.[employeeId]=@0`, [people.BLK001.id])
  assert.deepEqual(segments, [{ effectivePayrollPeriod: period(), basicSalary: '6500.00' }])
  const history = await repo('EmployeeStatusHistory').find({ where: { employeeId: people.BLK001.id }, order: { id: 'ASC' } })
  const salaryRow = history.find(row => row.fieldName === 'basicSalary')
  assert.ok(salaryRow)
  assert.equal(salaryRow.changeType, 'SALARY')
  assert.match(salaryRow.reason, /زيادة سنوية — يسري من راتب شهر/)
  const phoneRow = history.find(row => row.fieldName === 'phone')
  assert.ok(phoneRow, 'تغيير الجوال اتسجل في سجل التغييرات')
  assert.equal(phoneRow.reason, 'تحديث جماعي من ملف «salaries.csv»')

  // نفس الملف تاني = مفيش تغيير (مفيش مراجعة أجر جديدة)
  const again = ok(await upload(admin, 'apply', content, 'salaries.csv', { salaryMonth: period(), salaryReason: 'x', salaryEvidence: 'y' }))
  assert.deepEqual(again.summary, { applied: 0, failed: 0, skipped: 1 })
  assert.equal((await ds.query('SELECT COUNT(*) AS n FROM dbo.employee_salary_history_versions WHERE [employeeId]=@0', [people.BLK001.id]))[0].n, 1)
})

test('رقم بصمة مكرر مرفوض (مع موظف تاني أو صفين في الملف)، والصفوف السليمة بتتحفظ', async () => {
  const content = csv([['كود الموظف', 'رقم البصمة', 'الجنسية'], ['BLK002', 'FP-1', ''], ['BLK003', 'NEW-7', 'سعودي'], ['BLK001', '', 'سعودية']])
  const preview = ok(await upload(admin, 'preview', content))
  assert.equal(preview.rows[0].status, 'error')
  assert.match(preview.rows[0].errors[0], /رقم البصمة FP-1 مسجل لموظف تاني \(موظف الاختبار 1\)/)
  const result = ok(await upload(admin, 'apply', content))
  assert.deepEqual(result.rows.map(row => [row.code, row.status]), [['BLK002', 'skipped'], ['BLK003', 'applied'], ['BLK001', 'applied']])
  assert.equal((await fresh(people.BLK002.id)).fingerprintCode, 'FP-2')
  assert.equal((await fresh(people.BLK003.id)).fingerprintCode, 'NEW-7')
  assert.equal((await fresh(people.BLK001.id)).nationality, 'سعودية')

  const twice = ok(await upload(admin, 'preview', csv([['كود الموظف', 'رقم البصمة'], ['BLK001', 'SAME-9'], ['BLK002', 'SAME-9']])))
  assert.deepEqual(twice.rows.map(row => row.status), ['error', 'error'])
  assert.match(twice.rows[1].errors[0], /متكرر في الملف/)
})

test('عزل الفرع: موظف فرع تاني صف خطأ، والنقل لفرع تاني مرفوض لحساب الفرع', async () => {
  const content = csv([['كود الموظف', 'رقم الجوال', 'الفرع', 'القسم'], ['BLK003', '0551234567', '', ''], ['BLK002', '0552222222', 'جدة', 'المالية']])
  const preview = ok(await upload(branchUser, 'preview', content))
  assert.match(preview.rows[0].errors[0], /تبع فرع تاني/)
  assert.equal(preview.rows[0].employeeName, null)
  assert.match(preview.rows[1].errors.join(), /حساب الفرع مايقدرش ينقل/)
  const result = ok(await upload(branchUser, 'apply', content))
  assert.deepEqual(result.summary, { applied: 0, failed: 0, skipped: 2 })
  assert.equal((await fresh(people.BLK003.id)).phone, '0501234567')
  const salary = await upload(branchUser, 'preview', csv([['كود الموظف', 'الراتب الأساسي'], ['BLK002', '9000']]))
  assert.match(ok(salary).fileErrors[0], /اعتماد المسير/)
  assert.equal((await upload(branchUser, 'apply', csv([['كود الموظف', 'الراتب الأساسي'], ['BLK002', '9000']]))).status, 400)
})

test('نقل الفرع من الملف: بتاريخ سريان وسبب، يتسجل في سجل فرع الموظف وسجل التغييرات', async () => {
  const content = csv([['كود الموظف', 'الفرع', 'القسم'], ['BLK002', 'جدة', 'المالية']])
  const preview = ok(await upload(admin, 'preview', content))
  assert.equal(preview.needs.org, true)
  assert.equal(preview.rows[0].branchChange, true)
  assert.equal((await upload(admin, 'apply', content)).status, 400)
  const result = ok(await upload(admin, 'apply', content, 'move.csv', { orgEffectiveFrom: today(), orgReason: 'إعادة توزيع الفروع' }))
  assert.deepEqual(result.summary, { applied: 1, failed: 0, skipped: 0 })
  const saved = await fresh(people.BLK002.id)
  assert.equal(saved.branchId, jeddah.id)
  assert.equal(saved.departmentId, jeddahFinance.id)
  assert.equal(saved.teamId, null)
  const versions = await repo('AttendanceRuleVersion').find({ where: { sourceType: 'EMPLOYEE_ORG', sourceId: people.BLK002.id }, order: { version: 'ASC' } })
  assert.equal(versions.at(-1).effectiveFrom, today())
  assert.equal(versions.at(-1).reason, 'إعادة توزيع الفروع')
  const audit = await repo('EmployeeStatusHistory').find({ where: { employeeId: people.BLK002.id, fieldName: 'branchId' } })
  assert.equal(audit.length, 1)
  assert.equal(audit[0].reason, 'تحديث جماعي من ملف «move.csv»')
})

test('Excel: القالب المملي يتنزل ويتعدل ويترفع، والتطبيق على دفعات بأرقام الصفوف', async () => {
  const file = await template(admin, { fields: ['phone', 'gender', 'isGosiRegistered'], format: 'xlsx', employeeIds: [people.BLK001.id, people.BLK002.id] })
  assert.equal(file.status, 200)
  assert.match(file.type, /spreadsheetml/)
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(file.buffer)
  const sheet = workbook.getWorksheet('البيانات')
  assert.deepEqual(sheet.getRow(1).values.slice(1), ['كود الموظف', 'اسم الموظف', 'رقم الجوال', 'الجنس', 'مسجل في التأمينات'])
  assert.equal(sheet.getRow(2).getCell(1).value, 'BLK001')
  assert.equal(sheet.getRow(2).getCell(4).value, 'ذكر')
  assert.ok(workbook.getWorksheet('تعليمات'))
  sheet.getRow(2).getCell(5).value = 'نعم'
  sheet.getRow(3).getCell(3).value = 551231234 // رقم فقد صفره: 0551231234 مكتوب كرقم
  sheet.getRow(3).getCell(5).value = 'لا'
  const edited = Buffer.from(await workbook.xlsx.writeBuffer())
  const preview = ok(await upload(admin, 'preview', edited, 'edited.xlsx'))
  assert.equal(preview.format, 'xlsx')
  assert.deepEqual(preview.rows.map(row => [row.row, row.status]), [[2, 'ready'], [3, 'ready']])
  assert.deepEqual(preview.rows[1].changes.map(change => [change.field, change.new]), [['phone', '551231234'], ['isGosiRegistered', 'لا']])
  const firstBatch = ok(await upload(admin, 'apply', edited, 'edited.xlsx', { rows: '2' }))
  assert.deepEqual(firstBatch.rows.map(row => [row.row, row.status]), [[2, 'applied']])
  assert.equal((await fresh(people.BLK001.id)).isGosiRegistered, true)
  assert.equal((await fresh(people.BLK002.id)).isGosiRegistered, null)
  const secondBatch = ok(await upload(admin, 'apply', edited, 'edited.xlsx', { rows: '3' }))
  assert.deepEqual(secondBatch.summary, { applied: 1, failed: 0, skipped: 0 })
  assert.equal((await fresh(people.BLK002.id)).isGosiRegistered, false)
})
