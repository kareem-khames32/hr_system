'use strict'
// B4.3 — بنود الراتب على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر (hr_salary_items_test_<16 hex> — من غير مساس بقاعدة الشركة):
//  SI-01) الإقلاع بيضيف بذرة البنود مرة واحدة بترتيب القسيمة الحالي، والعرض بصلاحية الإعدادات.
//  SI-02) مسير حقيقي: القسيمة وجدول المسير وسطور الشهر بترتيب الجدول؛ تعديل الترتيب (لحساب الشركة بس، بسطر تدقيق) بيرتّب السطور والأعمدة
//         والمبالغ والمجاميع والصافي زي ما هي بالقرش، و«خاضع» مابيغيّرش مبلغ، والبذرة مابتلمسش المتعدّل.
//  SI-03) ترحيل 135: فحص نصي، وعلى قاعدة synchronize بيعدّي من غير تغيير شكل، ومن غير الجدول الكود شغال بالترتيب الثابت والترحيل بيعمله
//         بنفس الشكل والبذرة بتتضاف بعده، والتكرار آمن.
// Run (من api/): node --test test/salary-items.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_salary_items_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_salary_items_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-salary-items-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const items = require('../src/payroll/salary-items')
const { future } = require('./fixtures/future-calendar.cjs')
const PERIOD = future('2026-10')
const LATE_DAYS = [future('2026-10-05'), future('2026-10-12')], PERMISSION_DAY = future('2026-10-29')
const directory = path.resolve(apiRoot, '..', 'docs', 'migrations', 'payroll')
const FILE = '20261009_135_salary_items.sql'
const S = '/settings/salary-items'
let app, master, pool, ds, base, branch, seeder, created = false
const users = {}, state = {}

function assertDisposable() {
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(user)}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const expectStatus = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const answer = response => [response.status, response.body?.code ?? null]
const audits = async () => (await ds.query(`SELECT COUNT(*) AS [n] FROM [audit_log] WHERE [action] = N'SALARY_ITEM_UPDATED'`))[0].n
const content = () => fs.readFileSync(path.join(directory, FILE), 'utf8').replace(/\r\n/g, '\n')
const runFile = async () => { assertDisposable(); for (const batch of migrate.splitBatches(content())) await pool.request().batch(batch) }
const errorNumber = async work => { try { await work(); return null } catch (error) { return error.number ?? error.originalError?.info?.number ?? String(error.message).slice(0, 80) } }
const columnsOf = async () => { assertDisposable(); return (await pool.request().query(
  `SELECT c.[name], t.[name] AS [type], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity] FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id]
   WHERE c.[object_id] = OBJECT_ID(N'dbo.salary_items') ORDER BY c.[column_id]`)).recordset.map(row => Object.values(row).join(':')) }
const attendanceDay = (emp, date, custom = {}) => ({ employeeId: emp.id, branchId: emp.branchId, date, status: 'present',
  checkIn: '08:00', checkOut: '16:00', shiftName: 'وردية اختبار بنود الراتب', shiftStart: '08:00', shiftEnd: '16:00', scheduleSource: 'override',
  workMinutes: 480, lateMinutes: 0, deductibleMinutes: 0, earlyLeaveMinutes: 0, shortfallMinutes: 0, ...custom })
const keys = list => list.map(line => line.key)
const plain = list => list.map(line => `${line.key}|${line.name}|${line.amount}`).sort()
/** القسيمة وجدول المسير وسطور الشهر لبند الاختبار */
async function views() {
  const payslip = expectStatus(await request(users.admin, 'GET', `/payroll/items/${state.itemId}`), 200)
  const run = expectStatus(await request(users.admin, 'GET', `/payroll/runs/${state.runId}/lines`), 200)
  const month = expectStatus(await request(users.admin, 'GET', `/payroll/overview/lines?period=${PERIOD}`), 200)
  return { payslip: payslip.lines, run, runRow: run.rows.find(row => row.itemId === state.itemId), month, monthRow: month.rows.find(row => row.itemId === state.itemId) }
}
const stored = async () => (await ds.query(`SELECT CONVERT(varchar(40), [netPay]) AS [netPay], CONVERT(varchar(40), [allowances]) AS [allowances], CONVERT(varchar(40), [latenessDeduction]) AS [latenessDeduction],
  [breakdown] FROM [payroll_items] WHERE [id] = @0`, [state.itemId]))[0]

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  const connection = { server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }
  master = await new sql.ConnectionPool({ ...connection, database: 'master' }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  // مفيش رسالة بريد حقيقية بتطلع من الاختبار
  const { MailService } = require('../src/auth/mail.service')
  const mail = app.get(MailService)
  mail.isConfigured = () => false
  mail.send = async () => { throw new Error('no mail in tests') }
  assert.notEqual(mail.send, MailService.prototype.send)
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  pool = await new sql.ConnectionPool({ ...connection, database }).connect()
  seeder = app.get(require('../src/payroll/salary-items.service').SalaryItemsService)

  branch = await repo('Branch').save({ code: 'SITEMS', name: 'فرع اختبار بنود الراتب' })
  const user = (label, role, branchId, permissions) => repo('User').save({ email: `${label}@salary-items.invalid`, displayName: label, passwordHash: 'test-only', role, branchId,
    permissions: JSON.stringify(permissions), isActive: true })
  users.admin = await user('admin', 'super_admin', null, [])
  users.company = await repo('User').save({ ...(await user('company', 'hr_manager', null, ['settings.manage'])), scopeAllBranches: true })
  users.branchAdmin = await user('branch-admin', 'hr_manager', branch.id, ['settings.manage', 'payroll.view'])
  users.viewer = await user('viewer', 'hr_manager', null, ['payroll.view'])
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '1' }, { key: 'payroll.monthly_days', value: '30' }, { key: 'payroll.daily_hours', value: '8' },
    { key: 'payroll.late_deduction_enabled', value: 'true' }, { key: 'payroll.shortfall_enabled', value: 'true' },
    { key: 'payroll.shortfall_mode', value: 'MINUTES' }, { key: 'payroll.shortfall_value', value: '1' },
    { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' },
  ])
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try { if (pool) await pool.close() } catch (error) { errors.push(error) }
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
    assert.equal(path.dirname(path.resolve(uploads)), os.tmpdir()); assert.match(path.basename(uploads), /^hr-salary-items-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'salary items fixture cleanup failed')
}, { timeout: 60000 })

test('SI-01: الإقلاع بيضيف بذرة البنود مرة واحدة بترتيب القسيمة الحالي، والعرض بصلاحية الإعدادات', async () => {
  const seed = items.SALARY_ITEM_SEED
  assert.equal(await repo('SalaryItem').count(), seed.length)
  assert.equal(await seeder.seed(), 0, 'الموجود مابيتكررش')
  assert.equal(await repo('SalaryItem').count(), seed.length)
  const list = expectStatus(await request(users.admin, 'GET', S), 200)
  assert.deepEqual([list.available, list.canEdit], [true, true])
  const shown = ({ id, ...row }) => row
  assert.deepEqual(list.items.map(shown), [...seed].sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code)).map(row => ({ ...row })))
  assert.ok(list.items.every(row => Number.isInteger(row.id)))
  // حساب فرع معاه الصلاحية: يشوف ومايعدّلش؛ ومن غير الصلاحية 403
  const scoped = expectStatus(await request(users.branchAdmin, 'GET', S), 200)
  assert.deepEqual([scoped.canEdit, scoped.items.length], [false, seed.length])
  assert.equal(expectStatus(await request(users.company, 'GET', S), 200).canEdit, true)
  assert.equal((await request(users.viewer, 'GET', S)).status, 403)
  state.ids = Object.fromEntries(list.items.map(row => [row.code, row.id]))
})

test('SI-02: مسير حقيقي — القسيمة وجدول المسير بترتيب الجدول، وتعديل الترتيب بيرتّب من غير ما يغيّر مبلغ، والتعديل لحساب الشركة بسطر تدقيق', async () => {
  const emp = await repo('Employee').save({ employeeCode: 'SIT001', fullName: 'موظف بنود الراتب', branchId: branch.id, joinDate: '2020-01-01', basicSalary: 12000, housingAllowance: 1500,
    transportAllowance: 900, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0, workPressureAllowance: 300, status: 'active', isActive: true, payMethod: 'transfer' })
  await repo('AttendanceDay').save([
    ...LATE_DAYS.map(date => attendanceDay(emp, date, { status: 'late', checkIn: '10:15', lateMinutes: 135 })),
    attendanceDay(emp, PERMISSION_DAY, { status: 'early_leave', checkOut: '14:00', earlyLeaveMinutes: 120, shortfallMinutes: 120, deductibleMinutes: 120,
      attendanceRuleSnapshot: { flexEnabled: false, paidPermissionShortfallCoveredMinutes: 120 } }),
  ])
  const run = expectStatus(await request(users.admin, 'POST', '/payroll/runs/calculate-defined', { period: PERIOD, scopeType: 'CUSTOM', employeeIds: [emp.id], name: 'مسير اختبار بنود الراتب' }), 201)
  state.runId = run.id; state.itemId = run.items.find(row => row.employeeId === emp.id).id

  // بترتيب البذرة = ترتيب القسيمة قبل الجدول
  const first = await views(), row = await stored()
  assert.deepEqual(keys(first.payslip.earnings), ['BASIC', 'SALARY:HOUSING', 'SALARY:TRANSPORT', 'SALARY:WORK_PRESSURE'])
  assert.deepEqual(keys(first.payslip.deductions), ['LATENESS', 'DEDUCT_PERMISSION'])
  assert.deepEqual([keys(first.run.columns.earnings), keys(first.run.columns.deductions)], [keys(first.payslip.earnings), keys(first.payslip.deductions)])
  assert.deepEqual([keys(first.month.columns.earnings), keys(first.month.columns.deductions)], [keys(first.payslip.earnings), keys(first.payslip.deductions)])
  assert.deepEqual([first.runRow.earnings, first.monthRow.earnings, first.runRow.deductions], [first.payslip.earnings, first.payslip.earnings, first.payslip.deductions])

  // التعديل: حساب فرع ومن غير صلاحية مرفوض، والقيم الغلط، و«مفيش تغيير»، وبند مش موجود
  const patch = (user, code, body) => request(user, 'PATCH', `${S}/${state.ids[code]}`, body)
  assert.deepEqual([(await patch(users.branchAdmin, 'WORK_PRESSURE', { sortOrder: 5 })).status, (await patch(users.viewer, 'WORK_PRESSURE', { sortOrder: 5 })).status], [403, 403])
  for (const [body, code] of [[{ sortOrder: '5' }, 'SALARY_ITEM_ORDER'], [{ sortOrder: -1 }, 'SALARY_ITEM_ORDER'], [{ sortOrder: 10000 }, 'SALARY_ITEM_ORDER'], [{ sortOrder: 1.5 }, 'SALARY_ITEM_ORDER'],
    [{ insurable: 'yes' }, 'SALARY_ITEM_FLAG'], [{ taxable: 1 }, 'SALARY_ITEM_FLAG'], [{}, 'SALARY_ITEM_NOTHING'], [{ sortOrder: 16, taxable: true }, 'SALARY_ITEM_NOTHING'],
    [{ nameAr: 'اسم تاني', kind: 'DEDUCTION' }, 'SALARY_ITEM_NOTHING']]) {
    assert.deepEqual(answer(await patch(users.admin, 'WORK_PRESSURE', body)), [400, code], JSON.stringify(body))
  }
  assert.deepEqual(answer(await request(users.admin, 'PATCH', `${S}/999999`, { sortOrder: 5 })), [404, 'SALARY_ITEM_NOT_FOUND'])
  assert.equal(await audits(), 0, 'المرفوض مابيكتبش')

  // بدل ضغط العمل قبل السكن، والإذن بخصم قبل التأخير — من حساب الشركة (مش لازم مدير النظام)
  const moved = expectStatus(await patch(users.company, 'WORK_PRESSURE', { sortOrder: 5 }), 200)
  assert.deepEqual(moved.items.slice(0, 3).map(item => [item.code, item.sortOrder]), [['BASIC', 0], ['WORK_PRESSURE', 5], ['HOUSING', 11]])
  expectStatus(await patch(users.admin, 'DEDUCT_PERMISSION', { sortOrder: 99 }), 200)
  const second = await views()
  assert.deepEqual(keys(second.payslip.earnings), ['BASIC', 'SALARY:WORK_PRESSURE', 'SALARY:HOUSING', 'SALARY:TRANSPORT'])
  assert.deepEqual(keys(second.payslip.deductions), ['DEDUCT_PERMISSION', 'LATENESS'])
  for (const view of [second.run, second.month]) {
    assert.deepEqual([keys(view.columns.earnings), keys(view.columns.deductions)], [keys(second.payslip.earnings), keys(second.payslip.deductions)])
  }
  assert.deepEqual([second.runRow.earnings, second.monthRow.deductions], [second.payslip.earnings, second.payslip.deductions])
  // المبالغ والمجاميع والصافي والمحفوظ زي ما هم بالقرش
  assert.deepEqual([plain(second.payslip.earnings), plain(second.payslip.deductions), second.payslip.totals], [plain(first.payslip.earnings), plain(first.payslip.deductions), first.payslip.totals])
  assert.deepEqual([second.runRow.totals, second.monthRow.totals], [first.runRow.totals, first.monthRow.totals])
  assert.deepEqual(await stored(), row, 'بند المسير المحفوظ مااتلمسش')

  // «خاضع» مابيغيّرش مبلغ؛ وكل تعديل بسطر تدقيق وباسم اللي عدّل
  const flagged = expectStatus(await patch(users.admin, 'HOUSING', { taxable: false, insurable: false, sortOrder: 11 }), 200)
  assert.deepEqual(flagged.items.filter(item => item.code === 'HOUSING').map(item => [item.taxable, item.insurable, item.sortOrder]), [[false, false, 11]])
  const third = await views()
  assert.deepEqual([third.payslip, third.runRow.totals], [second.payslip, second.runRow.totals])
  assert.deepEqual(await stored(), row)
  assert.equal(await audits(), 3)
  const [audit] = await ds.query(`SELECT TOP 1 [actorUserId], [entityId], [before], [after] FROM [audit_log] WHERE [action] = N'SALARY_ITEM_UPDATED' ORDER BY [id] DESC`)
  assert.deepEqual([audit.actorUserId, audit.entityId, JSON.parse(audit.before), JSON.parse(audit.after)],
    [users.admin.id, String(state.ids.HOUSING), { taxable: true, insurable: true }, { taxable: false, insurable: false }])
  const edited = await repo('SalaryItem').findOneByOrFail({ code: 'WORK_PRESSURE' })
  assert.deepEqual([edited.sortOrder, edited.updatedByUserId, edited.updatedAt instanceof Date, edited.nameAr], [5, users.company.id, true, 'بدل ضغط العمل'])
  // البذرة مابتلمسش المتعدّل
  assert.equal(await seeder.seed(), 0)
  assert.equal((await repo('SalaryItem').findOneByOrFail({ code: 'WORK_PRESSURE' })).sortOrder, 5)
})

test('SI-03: ترحيل 135 — فحص نصي، وشكل الكيان = شكل الترحيل، ومن غير الجدول الكود شغال بالترتيب الثابت، والترحيل بيعمله والبذرة بعده، والتكرار آمن', async () => {
  const text = content()
  assert.notDeepEqual([...fs.readFileSync(path.join(directory, FILE)).subarray(0, 3)], [0xef, 0xbb, 0xbf], 'من غير BOM')
  const indexed = require('node:child_process').execFileSync('git', ['ls-files', '--eol', '--', `docs/migrations/payroll/${FILE}`], { cwd: path.join(apiRoot, '..'), encoding: 'utf8' })
  assert.match(indexed, /^i\/lf\b/, 'LF في المستودع — git add للملف قبل الفحص')
  assert.deepEqual(migrate.forbiddenStatements(text), [])
  assert.deepEqual(migrate.throwCodes(text), [135001, 135002])
  assert.doesNotMatch(migrate.stripComments(text), /\bINSERT\b|\bUPDATE\b|\bDEFAULT\b/i, 'جدول بس: الصفوف بيضيفها الخادم وقت الإقلاع')
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات')

  // على قاعدة synchronize: الملف بيعدّي من غير تغيير — شكل الكيان = شكل الترحيل
  const shape = await columnsOf(), count = await repo('SalaryItem').count()
  assert.equal(shape.length, 13)
  assert.equal(await errorNumber(runFile), null, 'فحص «قبل» وقف — الشكلين مختلفين')
  assert.deepEqual([await columnsOf(), await repo('SalaryItem').count()], [shape, count])

  // من غير الجدول (قبل الترحيل) — قاعدة التجربة بس: القسيمة بالترتيب الثابت، والشاشة بتقول الترحيل ناقص، والتعديل مرفوض، والبذرة مابتعملش حاجة
  assertDisposable()
  await pool.request().batch('DROP TABLE dbo.salary_items')
  items.resetSalaryItemsCache()
  const legacy = await views()
  assert.deepEqual([keys(legacy.payslip.earnings), keys(legacy.payslip.deductions)], [['BASIC', 'SALARY:HOUSING', 'SALARY:TRANSPORT', 'SALARY:WORK_PRESSURE'], ['LATENESS', 'DEDUCT_PERMISSION']])
  assert.deepEqual(keys(legacy.run.columns.earnings), keys(legacy.payslip.earnings))
  assert.deepEqual(expectStatus(await request(users.admin, 'GET', S), 200), { available: false, canEdit: false, items: [] })
  assert.deepEqual(answer(await request(users.admin, 'PATCH', `${S}/${state.ids.HOUSING}`, { sortOrder: 3 })), [400, 'SALARY_ITEMS_MIGRATION_MISSING'])
  assert.equal(await seeder.seed(), 0)

  // الترحيل بيعمل الجدول بنفس شكل الكيان، والبذرة بتتضاف بعده مرة واحدة، والتكرار آمن
  assert.equal(await errorNumber(runFile), null)
  assert.deepEqual(await columnsOf(), shape)
  items.resetSalaryItemsCache()
  assert.deepEqual([await seeder.seed(), await seeder.seed()], [items.SALARY_ITEM_SEED.length, 0])
  for (let round = 0; round < 2; round++) assert.equal(await errorNumber(runFile), null)
  assert.deepEqual([await columnsOf(), await repo('SalaryItem').count()], [shape, items.SALARY_ITEM_SEED.length])
  assert.deepEqual(keys((await views()).payslip.earnings), ['BASIC', 'SALARY:HOUSING', 'SALARY:TRANSPORT', 'SALARY:WORK_PRESSURE'])
  // بقفل الجدول نسختين بيقلعوا مع بعض مابيكرروش كود
  await pool.request().batch(`DELETE FROM dbo.salary_items WHERE [code] IN (N'OVERTIME', N'LOAN')`)
  const added = await Promise.all([seeder.seed(), seeder.seed(), seeder.seed()])
  assert.equal(added.reduce((sum, value) => sum + value, 0), 2)
  assert.equal((await ds.query('SELECT COUNT(*) AS [n], COUNT(DISTINCT [code]) AS [codes] FROM dbo.salary_items'))[0].codes, items.SALARY_ITEM_SEED.length)
  assert.equal(await repo('SalaryItem').count(), items.SALARY_ITEM_SEED.length)
})
