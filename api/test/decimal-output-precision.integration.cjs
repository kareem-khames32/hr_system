'use strict'
// دقة المبالغ بعد الحفظ (اتكشف من ملاحظة مراجعة Codex CRP2B-B-N01)، على قاعدة SQL مؤقتة معزولة بتتمسح في الآخر:
// TypeORM على SQL Server كان بيرجّع بعد INSERT قيم الأعمدة اللي ليها قيمة افتراضية في متغير جدول بنوع `decimal` من غير خانات عشرية،
// فالكائن اللي في الذاكرة بياخد 123 بدل 123.45، وأي save تاني لنفس الكائن بيكتب المقرّب في القاعدة.
//  DP-01) متغير جدول الإخراج بنفس دقة العمود الحقيقي، لكل جدول في النظام فيه عمود عشري بقيمة افتراضية.
//  DP-02) بند مسير بكسور: الكائن بعد الحفظ = المحفوظ = اللي اتبعت، وحفظه تاني (من غير تعديل، وبتعديل عمود تاني) مابيغيّرش ولا قرش.
//  DP-03) إنشاء موظف من الشاشة ببدلات فيها كسور (الإنشاء بيحفظ الكائن مرتين): المحفوظ بالقرش.
//  DP-04) حدث حساب المسير بيخزن «إضافات أخرى» بكسورها زي البند المحفوظ (ملاحظة المراجعة بالحرف).
// Run (من api/): node --test test/decimal-output-precision.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const { employeeRequiredFields } = require('./helpers/employee-fixture.cjs')

const database = `hr_decimal_precision_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_decimal_precision_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-decimal-precision-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, master, ds, base, admin, branch, created = false

function assertDisposable() { assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system'); if (ds) assert.equal(ds.options.database, database) }
const repo = name => { assertDisposable(); return ds.getRepository(name) }
const query = (text, params = []) => { assertDisposable(); return ds.query(text, params) }
async function request(method, route, body) {
  const token = jwt.sign({ sub: admin.id, email: admin.email, role: 'super_admin', branchId: null, employeeId: null, tokenVersion: 0, permissions: ['*'] })
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const ok = (response, status = 200) => { assert.equal(response.status, status, JSON.stringify(response.body)?.slice(0, 700)); return response.body }

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource); assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  await app.get(require('../src/settings/config-defaults.service').ConfigDefaultsService).onApplicationBootstrap()
  branch = await repo('Branch').save({ code: 'DPA', name: 'فرع دقة المبالغ' })
  admin = await repo('User').save({ email: 'admin@decimal-precision.invalid', displayName: 'admin', passwordHash: 'test-only', role: 'super_admin', branchId: null, permissions: '[]' })
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
  if (errors.length) throw new AggregateError(errors, 'decimal precision fixture cleanup failed')
})

test('DP-01: متغير جدول الإخراج بنفس دقة العمود — لكل جدول فيه عمود عشري بيرجع بعد الإدخال', t => {
  const decimals = column => column.type === 'decimal' || column.type === 'numeric'
  let tables = 0, columns = 0
  for (const metadata of ds.entityMetadatas) {
    const returning = metadata.getInsertionReturningColumns().filter(decimals)
    if (!returning.length) continue
    tables++
    const declaration = ds.driver.buildTableVariableDeclaration('@OutputTable', metadata.getInsertionReturningColumns())
    for (const column of returning) {
      columns++
      const precision = column.precision ?? null, scale = column.scale ?? null
      // العمود المعرّف بدقة لازم يتعرّف بيها في متغير الجدول، مش decimal لوحدها (= من غير خانات عشرية)
      if (precision !== null && scale !== null) {
        assert.ok(declaration.includes(`"${column.databaseName}" ${column.type}(${precision},${scale})`), `${metadata.tableName}.${column.databaseName}: ${declaration}`)
      }
    }
  }
  t.diagnostic(JSON.stringify({ tablesWithReturnedDecimals: tables, returnedDecimalColumns: columns }))
  assert.ok(tables >= 5 && columns >= 10, 'الفحص ماشي على جداول النظام الحقيقية')
  const items = ds.driver.buildTableVariableDeclaration('@OutputTable', ds.getMetadata('PayrollItem').getInsertionReturningColumns())
  assert.match(items, /"otherAdditions" decimal\(18,2\)/)
  assert.doesNotMatch(items, /" decimal[,)]/)
})

test('DP-02: بند مسير بكسور — الكائن بعد الحفظ = المحفوظ، والحفظ التاني مابيغيّرش ولا قرش', async () => {
  const items = repo('PayrollItem')
  const sent = { otherAdditions: 123.45, otherDeductions: 77.5, loanInstallments: 0.01, socialInsuranceDeduction: 585.99 }
  const item = items.create({ runId: 900001, employeeId: 1, basicSalary: 6000, allowances: 0, netPay: 5459.95, absenceDays: 0, unpaidLeaveDays: 0, payMethod: 'cash', ...sent })
  await items.save(item)
  const memory = Object.fromEntries(Object.keys(sent).map(key => [key, Number(item[key])]))
  assert.deepEqual(memory, sent, 'الكائن بعد الحفظ بنفس اللي اتبعت')
  const stored = async () => { const [row] = await query('SELECT * FROM [payroll_items] WHERE [id] = @0', [item.id]); return Object.fromEntries(Object.keys(sent).map(key => [key, Number(row[key])])) }
  assert.deepEqual(await stored(), sent)
  // نفس الكائن يتحفظ تاني من غير أي تعديل من الكود، وبعدين بتعديل عمود تاني خالص
  await items.save(item)
  assert.deepEqual(await stored(), sent, 'الحفظ التاني مايكتبش مبالغ مقرّبة')
  item.payMethod = 'transfer'
  await items.save(item)
  assert.deepEqual(await stored(), sent)
  assert.equal((await query('SELECT [payMethod] FROM [payroll_items] WHERE [id] = @0', [item.id]))[0].payMethod, 'transfer')
  // نص سنت بيتقرّب في القاعدة على خانتين (نوع العمود) — والكائن بياخد قيمة القاعدة
  const half = items.create({ runId: 900001, employeeId: 2, basicSalary: 1, allowances: 0, netPay: 1, absenceDays: 0, unpaidLeaveDays: 0, payMethod: 'cash', otherAdditions: 10.505 })
  await items.save(half)
  const [row] = await query('SELECT CONVERT(varchar(30), [otherAdditions]) AS [value] FROM [payroll_items] WHERE [id] = @0', [half.id])
  assert.equal(Number(half.otherAdditions), Number(row.value))
})

test('DP-03: إنشاء موظف ببدلات فيها كسور — المحفوظ بالقرش (الإنشاء بيحفظ الكائن مرتين)', async () => {
  const amounts = { basicSalary: 4500.5, housingAllowance: 1250.5, transportAllowance: 300.25, otherAllowance: 99.99, workPressureAllowance: 10.1 }
  const made = ok(await request('POST', '/employees', { ...(await employeeRequiredFields(ds, branch.id)), branchId: branch.id, joinDate: '2026-01-01', payMethod: 'cash', ...amounts }), 201)
  const [row] = await query(`SELECT ${Object.keys(amounts).map(key => `CONVERT(varchar(30), [${key}]) AS [${key}]`).join(', ')} FROM [employees] WHERE [id] = @0`, [made.id])
  assert.deepEqual(Object.fromEntries(Object.keys(amounts).map(key => [key, Number(row[key])])), amounts)
  const read = ok(await request('GET', `/employees/${made.id}`))
  for (const [key, value] of Object.entries(amounts)) assert.equal(Number(read[key]), value, key)
})

test('DP-04 (CRP2B-B-N01): حدث حساب المسير بيخزن أعمدة المبالغ بكسورها زي البند المحفوظ', async () => {
  const emp = await repo('Employee').save({ ...(await employeeRequiredFields(ds, branch.id)), employeeCode: 'DP900', fullName: 'موظف دقة المبالغ', branchId: branch.id, joinDate: '2020-01-01',
    basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'cash', annualLeaveEntitled: false })
  const config = repo('RequestsConfig')
  for (const [key, value] of [['payroll.cycle_start_day', '1'], ['payroll.monthly_days', '30'], ['payroll.salary_evidence_mode', 'MONTHLY_HISTORY_OR_CURRENT_FILE']]) {
    if (await config.findOneBy({ key })) await config.update({ key }, { value }); else await config.save({ key, value })
  }
  const period = '2026-07'
  await repo('AttendanceDay').save(Array.from({ length: 31 }, (_unused, index) => ({ employeeId: emp.id, branchId: branch.id, date: `${period}-${String(index + 1).padStart(2, '0')}`, status: 'present',
    checkIn: '08:00', checkOut: '16:00', shiftName: 'وردية', shiftStart: '08:00', shiftEnd: '16:00', scheduleSource: 'override', workMinutes: 480, lateMinutes: 0, deductibleMinutes: 0, earlyLeaveMinutes: 0 })), { chunk: 50 })
  ok(await request('POST', '/obligations', { employeeId: emp.id, type: 'CREDIT', amount: 123.45, label: 'قيد بكسور', category: 'allowance', effectiveDate: `${period}-01` }), 201)
  const run = ok(await request('POST', '/payroll/runs/calculate-defined', { period, scopeType: 'CUSTOM', employeeIds: [emp.id], name: 'مسير دقة المبالغ' }), 201)
  const item = await repo('PayrollItem').findOneByOrFail({ runId: run.id, employeeId: emp.id })
  assert.deepEqual([Number(item.otherAdditions), Number(item.netPay)], [123.45, 6123.45])
  const event = await repo('PayrollRunEvent').findOne({ where: { runId: run.id }, order: { id: 'DESC' } })
  const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload
  const saved = payload.after.items[0]
  for (const column of ds.getMetadata('PayrollItem').columns.filter(column => column.type === 'decimal').map(column => column.propertyName)) {
    assert.equal(Number(saved[column] ?? 0), Number(item[column] ?? 0), `عمود ${column} في الحدث`)
  }
})
