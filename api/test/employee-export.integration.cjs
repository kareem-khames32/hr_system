'use strict'
// تصدير الموظفين لملف Excel (طلب المالك 24 سبتمبر): كل بيانات الملف وأولها كود البصمة. SQL حقيقي وHTTP فعلي في قاعدة
// اختبار عشوائية تُحذف في النهاية، والملف الناتج بيتفتح بـexceljs ويتقري خلية خلية:
//   - كود البصمة تاني عمود، و«0012» وجوال «0501234567» نص بأصفارهم (CSV كان بيخلي Excel يشيلها).
//   - التواريخ زي ما هي في القاعدة (مفيش زحزحة يوم بالمنطقة الزمنية).
//   - الراتب والبنك والتأمينات بس للي عنده payroll.view أو employees.edit.
//   - نطاق الفرع: موظف فرع تاني مابيطلعش حتى لو اتبعت رقمه، والترتيب زي الشاشة.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const ExcelJS = require('../node_modules/exceljs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_employee_export_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_employee_export_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-employee-export-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, ds, master, base, created = false
const B = {}, E = {}, U = {}
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }

async function exportAs(user, employeeIds) {
  const token = jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: null,
    tokenVersion: 0, permissions: JSON.parse(user.permissions || '[]'), ...(user.scopeAllBranches ? { scopeAllBranches: true } : {}) })
  const response = await fetch(`${base}/employees/export?ids=${employeeIds.join(',')}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!response.ok) return { status: response.status, body: await response.json().catch(() => null) }
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(Buffer.from(await response.arrayBuffer()))
  const sheet = workbook.getWorksheet('الموظفين')
  const headers = sheet.getRow(1).values.slice(1)
  const rows = []
  for (let r = 2; r <= sheet.rowCount; r++) {
    const values = sheet.getRow(r).values.slice(1)
    rows.push(Object.fromEntries(headers.map((header, index) => [header, values[index] ?? null])))
  }
  return { status: response.status, headers, rows, disposition: response.headers.get('content-disposition'), sheet }
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
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

  B.maadi = await repo('Branch').save({ code: 'EXP-M', name: 'فرع المعادي' })
  B.riyadh = await repo('Branch').save({ code: 'EXP-R', name: 'فرع الرياض' })
  const dept = await repo('Department').save({ name: 'الحسابات', branchId: B.maadi.id })
  const team = await repo('Team').save({ name: 'فريق الرواتب', departmentId: dept.id })
  E.manager = await repo('Employee').save({ employeeCode: 'EMP-0001', fullName: 'مدير الحسابات', branchId: B.maadi.id, status: 'active', isActive: true })
  E.first = await repo('Employee').save({ employeeCode: 'EMP-0002', fingerprintCode: '0012', fullName: 'أحمد محمد', fullNameEn: 'Ahmed Mohamed',
    nationalId: '29805011234567', nationality: 'EG', gender: 'male', birthDate: '1998-05-01', phone: '0501234567', email: 'ahmed@company.test',
    branchId: B.maadi.id, departmentId: dept.id, teamId: team.id, managerEmployeeId: E.manager.id, jobTitle: 'محاسب',
    joinDate: '2024-02-01', contractType: 'permanent', status: 'active', isActive: true,
    basicSalary: 6000, housingAllowance: 1200, transportAllowance: 600, payMethod: 'transfer', bankName: 'بنك الاختبار',
    iban: 'SA0380000000608010167519', isGosiRegistered: true })
  E.second = await repo('Employee').save({ employeeCode: 'EMP-0003', fingerprintCode: '7', fullName: 'سارة علي', branchId: B.maadi.id,
    status: 'suspended', isActive: true, joinDate: '2025-12-31' })
  E.other = await repo('Employee').save({ employeeCode: 'EMP-0004', fingerprintCode: '0099', fullName: 'موظف الرياض', branchId: B.riyadh.id, status: 'active', isActive: true })
  // حساب على مستوى الشركة = «نطاقه: كل الفروع» (scopeAllBranches)؛ من غيره الحساب بلا فرع نطاقه فاضي (branchScopeOf = -1)
  const user = (email, role, branchId, permissions, scopeAllBranches = false) => repo('User').save({ email, displayName: email,
    passwordHash: 'test-only', role, branchId, permissions: JSON.stringify(permissions), scopeAllBranches })
  U.finance = await user('finance@export.test', 'hr_manager', null, ['employees.view', 'payroll.view'], true)
  U.viewer = await user('viewer@export.test', 'hr_manager', null, ['employees.view'], true)
  U.unassigned = await user('unassigned@export.test', 'hr_manager', null, ['employees.view', 'payroll.view'])
  U.branch = await user('branch@export.test', 'hr_manager', B.maadi.id, ['employees.view', 'employees.edit'])
  U.none = await user('none@export.test', 'employee', null, [])
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try { fs.rmSync(uploads, { recursive: true, force: true }) } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'employee export fixture cleanup failed')
})

test('EX-01: كود البصمة تاني عمود، والأكواد والجوال والهوية نص بأصفارهم، والتواريخ زي ما هي، والأسماء بدل الأرقام', async () => {
  const file = await exportAs(U.finance, [E.first.id])
  assert.equal(file.status, 200)
  assert.match(file.disposition, /attachment; filename="employees\.xlsx"; filename\*=UTF-8''/)
  assert.deepEqual(file.headers.slice(0, 3), ['كود الموظف', 'كود البصمة', 'الاسم'])
  const row = file.rows[0]
  assert.equal(row['كود البصمة'], '0012', 'الأصفار الأولى في كود البصمة')
  assert.equal(row['الجوال'], '0501234567', 'الصفر الأولاني في الجوال')
  assert.equal(row['رقم الهوية / الإقامة'], '29805011234567', 'الهوية كاملة مش بصيغة علمية')
  assert.equal(file.sheet.getRow(2).getCell(2).type, ExcelJS.ValueType.String, 'خلية كود البصمة نص فعلًا')
  assert.equal(file.sheet.getColumn(2).numFmt, '@', 'العمود متنسق نص')
  assert.equal(row['تاريخ الميلاد'], '1998-05-01', 'مفيش زحزحة يوم')
  assert.equal(row['تاريخ التعيين'], '2024-02-01')
  assert.equal(row['الفرع'], 'فرع المعادي')
  assert.equal(row['القسم'], 'الحسابات')
  assert.equal(row['الفريق'], 'فريق الرواتب')
  assert.equal(row['المدير المباشر'], 'EMP-0001 — مدير الحسابات')
  assert.equal(row['النوع'], 'ذكر')
  assert.equal(row['نوع العقد'], 'دائم')
  assert.equal(row['الحالة'], 'نشط')
  // الماليات للي عنده payroll.view
  assert.equal(row['الراتب الأساسي'], 6000)
  assert.equal(row['بدل السكن'], 1200)
  assert.equal(row['طريقة الصرف'], 'تحويل بنكي')
  assert.equal(row['الآيبان'], 'SA0380000000608010167519')
  assert.equal(row['مسجل بالتأمينات'], 'نعم')
})

test('EX-02: من غير payroll.view ولا employees.edit مفيش أي عمود مالي — مش فاضي، مش موجود أصلًا', async () => {
  const file = await exportAs(U.viewer, [E.first.id])
  assert.equal(file.status, 200)
  for (const header of ['الراتب الأساسي', 'بدل السكن', 'بدل الانتقال', 'طريقة الصرف', 'مبلغ التحويل البنكي', 'البنك', 'الآيبان', 'رقم التأمينات', 'أجر التأمينات']) {
    assert.ok(!file.headers.includes(header), header)
  }
  assert.equal(file.rows[0]['كود البصمة'], '0012', 'باقي البيانات موجودة')
  assert.equal(file.rows[0]['الجوال'], '0501234567')
})

test('EX-03: نطاق الفرع: موظف فرع تاني مابيطلعش حتى لو رقمه اتبعت، والترتيب زي الشاشة', async () => {
  const branch = await exportAs(U.branch, [E.second.id, E.other.id, E.first.id])
  assert.equal(branch.status, 200)
  assert.deepEqual(branch.rows.map(row => row['كود الموظف']), ['EMP-0003', 'EMP-0002'], 'الرياض برّه، والترتيب زي ما اتبعت')
  assert.equal(branch.rows[0]['الحالة'], 'موقوف')
  assert.equal(branch.rows[0]['كود البصمة'], '7')
  assert.ok(branch.headers.includes('الراتب الأساسي'), 'employees.edit بيشوف الماليات زي ملف الموظف')
  const company = await exportAs(U.finance, [E.other.id, E.first.id])
  assert.deepEqual(company.rows.map(row => row['كود الموظف']), ['EMP-0004', 'EMP-0002'])
  assert.equal(company.rows[0]['كود البصمة'], '0099')
  // حساب بلا فرع ومش «كل الفروع»: نطاقه فاضي — الملف بيطلع بالعناوين بس، ولا موظف
  const unassigned = await exportAs(U.unassigned, [E.first.id, E.other.id])
  assert.equal(unassigned.status, 200)
  assert.deepEqual(unassigned.rows, [])
})

test('EX-04: من غير employees.view مرفوض، وقائمة فاضية أو أرقام غلط مرفوضة برسالة', async () => {
  assert.equal((await exportAs(U.none, [E.first.id])).status, 403)
  const empty = await exportAs(U.finance, [])
  assert.equal(empty.status, 400)
  assert.match(JSON.stringify(empty.body), /مفيش موظفين للتصدير/)
  assert.equal((await exportAs(U.finance, ['x'])).status, 400)
  assert.equal((await exportAs(U.finance, [0])).status, 400)
  assert.equal((await exportAs(U.finance, [E.first.id, '1e3'])).status, 400)
  assert.match(JSON.stringify((await exportAs(U.finance, Array.from({ length: 2001 }, (_, i) => i + 1))).body), /بحد أقصى 2000/)
})

test('EX-05: التصدير GET (قراءة بس) ومتعرّف قبل «:id» — مش بيتقري كأنه رقم موظف', () => {
  const source = fs.readFileSync(path.join(apiRoot, 'src/employees/employees.controller.ts'), 'utf8').replace(/\r\n/g, '\n')
  const exportAt = source.indexOf("@Get('export')"), byIdAt = source.indexOf("@Get(':id')")
  assert.ok(exportAt > 0 && byIdAt > exportAt, 'export قبل :id')
  assert.ok(source.slice(exportAt - 40, exportAt).includes("@Perm('employees.view')"))
})
