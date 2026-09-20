// قرار المالك (20 سبتمبر): المسير قائمة دائمة باسمها — على قاعدة SQL مؤقتة معزولة (synchronize) تُحذف في النهاية:
// (أ) «أضفهم لمسير…» من تبويب «موظفين ليس لديهم مسير»: الموظف يبقى عضوًا دائمًا، ويظهر في مسير الشهر الجديد المنسوخ.
// (ب) «نقل لمسير آخر» من شهر مختار ورايح: الشهر السابق المعتمد والشهر اللاحق المعتمد ما يتغيروش.
// (ج) «شيل خصم» لموظف واحد من مسار شاشة المسير: الخصم يتشال ويتغير الصافي بمقداره بعد إعادة الحساب.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_payroll_membership_moves_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-membership-moves-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const cycle23 = { defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 23, cycleEndMode: 'DERIVED', cycleEndDay: null }
let app, master, ds, base, created = false
let admin, branchA, deptSales, deptOps, deptLoose, policyVersionId, employeeNumber = 0

function assertDisposable() {
  assert.match(database, /^hr_payroll_membership_moves_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: null,
    tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(user)}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
function expectStatus(response, status) { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
async function employee(department, overrides = {}) {
  const n = ++employeeNumber
  const emp = await repo('Employee').save({ employeeCode: `MOV${String(n).padStart(3, '0')}`, fullName: `موظف العضوية ${n}`, branchId: branchA.id,
    departmentId: department.id, joinDate: '2020-01-01', basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0,
    workNatureAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'transfer', ...overrides })
  // استثناء حضور طول المدة يعزل الحساب عن الغياب والتأخير، فالفرق في الصافي يبقى الخصم المقصود وحده
  await repo('AttendanceExemption').save({ employeeId: emp.id, effectiveFrom: '2026-01-01', effectiveTo: '2028-12-31', reasonCode: 'field_role',
    reason: 'نافذة اختبار العضوية المعزولة', status: 'APPROVED', createdByUserId: admin.id, approvedByUserId: admin.id,
    approvedAt: new Date('2026-01-01T08:00:00Z'), terminatedFrom: null, overtimeEligibleOverride: null, unpaidLeaveDeductibleOverride: null, requiresCheckinForPresence: false })
  return emp
}
const draft = async (name, period, filters) =>
  expectStatus(await request(admin, 'POST', '/payroll/runs', { name, policyVersionId, period, filters }), 201)
const runRow = id => repo('PayrollRun').findOneByOrFail({ id })
const definitionOf = run => JSON.parse(run.definition)
const setStatus = (id, status) => ds.query(`UPDATE [payroll_runs] SET [status] = @1 WHERE [id] = @0`, [id, status])
const cents = value => Math.round(Number(value ?? 0) * 100)
const unassigned = async period => expectStatus(await request(admin, 'GET', `/payroll/overview/unassigned?period=${period}`), 200)

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
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  branchA = await repo('Branch').save({ code: 'MOV_A', name: 'فرع المعادي' })
  deptSales = await repo('Department').save({ name: 'قسم المبيعات', branchId: branchA.id, isActive: true })
  deptOps = await repo('Department').save({ name: 'قسم العمليات', branchId: branchA.id, isActive: true })
  deptLoose = await repo('Department').save({ name: 'قسم بلا مسير', branchId: branchA.id, isActive: true })
  admin = await repo('User').save({ email: 'admin@membership-moves-test.invalid', displayName: 'admin', passwordHash: 'test-only',
    role: 'super_admin', branchId: null, permissions: JSON.stringify([]) })
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '23' }, { key: 'payroll.monthly_days', value: '30' }, { key: 'payroll.daily_hours', value: '8' },
    { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' }, { key: 'payroll.exempt_overtime_eligible', value: 'false' },
    { key: 'payroll.exempt_unpaid_leave_deductible', value: 'true' },
  ])
  const createdPolicy = expectStatus(await request(admin, 'POST', '/payroll/policies', { name: 'معادلة الشركة', effectiveFrom: '2026-07-23', settings: cycle23 }), 201)
  const [version] = createdPolicy.versions
  const published = expectStatus(await request(admin, 'POST', `/payroll/policies/${createdPolicy.policy.id}/versions/${version.id}/publish`,
    { expectedRevision: version.revision, reason: 'نشر معادلة اختبار العضوية' }), 200)
  policyVersionId = published.version.id
}, { timeout: 120000 })

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
  if (errors.length) throw new AggregateError(errors, 'Payroll membership-moves fixture cleanup failed')
})

test('(أ) «أضفهم لمسير…» من تبويب بلا مسير: عضوية دائمة، التبويب يفضى، ومسير الشهر الجديد بينسخها', async () => {
  const inSales = await employee(deptSales)
  const loose = await employee(deptLoose)
  const run = await draft('مسير المبيعات', '2026-08', { branchIds: [branchA.id], departmentIds: [deptSales.id] })

  const before = await unassigned('2026-08')
  assert.equal(before.rows.find(row => row.employeeId === loose.id)?.reasonCode, 'OUT_OF_ALL_RUNS', 'الموظف بلا مسير قبل الإضافة')
  assert.equal(before.rows.find(row => row.employeeId === inSales.id)?.reasonCode, 'DRAFT_NOT_CALCULATED', 'موظف القسم داخل نطاق المسودة بالفلتر')
  assert.ok(before.openRuns.some(row => row.id === run.id), 'المسير المفتوح معروض كوجهة')

  // السبب مطلوب، والقائمة مش فاضية
  assert.equal((await request(admin, 'POST', `/payroll/runs/${run.id}/members`, { employeeIds: [loose.id], reason: 'ي' })).status, 400)
  assert.equal((await request(admin, 'POST', `/payroll/runs/${run.id}/members`, { employeeIds: [], reason: 'ضمّه للمبيعات' })).status, 400)

  const added = expectStatus(await request(admin, 'POST', `/payroll/runs/${run.id}/members`, { employeeIds: [loose.id], reason: 'قرار المالك: يتحاسب مع المبيعات' }), 201)
  assert.deepEqual([added.added, added.removed, added.recalculated], [[loose.id], [], false], 'مسودة: بتتعدل بلا إعادة حساب')
  assert.deepEqual(definitionOf(await runRow(run.id)).filters.includeEmployeeIds, [loose.id], 'الاسم في قائمة الإضافة الدائمة')
  assert.deepEqual(definitionOf(await runRow(run.id)).filters.departmentIds, [deptSales.id], 'فلتر القسم زي ما هو (الإضافة OR مش AND)')

  const preview = expectStatus(await request(admin, 'GET', `/payroll/runs/${run.id}/membership-preview`), 200)
  assert.ok(preview.included.some(row => row.employeeId === loose.id) && preview.included.some(row => row.employeeId === inSales.id), 'الاتنين داخل المسير')

  const afterAdd = await unassigned('2026-08')
  assert.equal(afterAdd.rows.find(row => row.employeeId === loose.id)?.reasonCode, 'DRAFT_NOT_CALCULATED', 'بقى داخل نطاق المسودة')
  const calculated = expectStatus(await request(admin, 'POST', `/payroll/runs/${run.id}/calculate`, {}), 201)
  assert.ok(calculated.items.some(item => item.employeeId === loose.id), 'له بند في المسير بعد الحساب')
  assert.ok(!(await unassigned('2026-08')).rows.some(row => row.employeeId === loose.id), 'التبويب فضي منه')

  // مسير الشهر الجديد ينسخ القائمة الدائمة كما هي، فالعضوية تستمر بلا إعادة إضافة
  const next = expectStatus(await request(admin, 'POST', '/payroll/runs/create-next-period', { sourcePeriod: '2026-08' }), 201)
  const copy = next.created.find(row => row.name === 'مسير المبيعات')
  assert.ok(copy, JSON.stringify(next))
  const copied = await runRow(copy.runId)
  assert.deepEqual([copied.period, copied.status], ['2026-09', 'DRAFT'])
  assert.deepEqual(definitionOf(copied).filters.includeEmployeeIds, [loose.id], 'العضوية الدائمة اتنسخت للشهر الجديد')
  const nextPreview = expectStatus(await request(admin, 'GET', `/payroll/runs/${copy.runId}/membership-preview`), 200)
  assert.ok(nextPreview.included.some(row => row.employeeId === loose.id), 'موجود في مسير الشهر التالي')
})

test('(ب) «نقل لمسير آخر» من شهر مختار ورايح: الشهر المعتمد قبله وبعده ما يتغيرش', async () => {
  const mover = await employee(deptOps)
  const ops = {
    jan: await draft('مسير العمليات', '2027-01', { branchIds: [branchA.id], departmentIds: [deptOps.id] }),
    feb: await draft('مسير العمليات', '2027-02', { branchIds: [branchA.id], departmentIds: [deptOps.id] }),
    mar: await draft('مسير العمليات', '2027-03', { branchIds: [branchA.id], departmentIds: [deptOps.id] }),
    apr: await draft('مسير العمليات', '2027-04', { branchIds: [branchA.id], departmentIds: [deptOps.id] }),
  }
  const nasr = {
    jan: await draft('مسير فرع النصر', '2027-01', { employeeIds: [(await employee(deptSales)).id] }),
    feb: await draft('مسير فرع النصر', '2027-02', { employeeIds: [(await employee(deptSales)).id] }),
    mar: await draft('مسير فرع النصر', '2027-03', { employeeIds: [(await employee(deptSales)).id] }),
  }
  // يناير معتمد (قبل شهر النقل)، وأبريل معتمد (بعده) — الاتنين ممنوع يتغيروا
  for (const id of [ops.jan.id, nasr.jan.id, ops.apr.id]) await setStatus(id, 'APPROVED')
  const janOpsBefore = definitionOf(await runRow(ops.jan.id))
  const aprOpsBefore = definitionOf(await runRow(ops.apr.id))

  // النقل بين شهرين مختلفين مرفوض، والنقل لنفس المسير مرفوض
  assert.equal((await request(admin, 'POST', `/payroll/runs/${nasr.mar.id}/members`, { employeeIds: [mover.id], reason: 'شهر مختلف', fromRunId: ops.feb.id })).status, 400)
  assert.equal((await request(admin, 'POST', `/payroll/runs/${ops.feb.id}/members`, { employeeIds: [mover.id], reason: 'نفس المسير', fromRunId: ops.feb.id })).status, 400)

  const moved = expectStatus(await request(admin, 'POST', `/payroll/runs/${nasr.feb.id}/members`,
    { employeeIds: [mover.id], reason: 'اتنقل لفرع النصر من فبراير', fromRunId: ops.feb.id }), 201)
  assert.deepEqual([moved.fromPeriod, moved.added, moved.removed], ['2027-02', [mover.id], [mover.id]])
  assert.deepEqual(moved.moved.map(row => [row.from.id, row.to.id]), [[ops.feb.id, nasr.feb.id]])
  assert.deepEqual(moved.lockedRuns.map(row => [row.id, row.period, row.status]), [[ops.apr.id, '2027-04', 'APPROVED']], 'الشهر المعتمد اللاحق يتقال ولا يتغير')

  // فبراير ومارس: خرج من العمليات (استبعاد بسببه) ودخل فرع النصر (قائمة دائمة)
  for (const id of [ops.feb.id, ops.mar.id]) {
    const definition = definitionOf(await runRow(id))
    assert.deepEqual(definition.exclusions.map(row => [row.employeeId, row.reason]), [[mover.id, 'اتنقل لفرع النصر من فبراير']], `استبعاد في ${id}`)
    assert.ok(!definition.filters.includeEmployeeIds.includes(mover.id))
  }
  for (const id of [nasr.feb.id, nasr.mar.id]) {
    assert.ok(definitionOf(await runRow(id)).filters.employeeIds.includes(mover.id), `القائمة الدائمة في ${id}`)
  }
  // يناير المعتمد (قبل شهر النقل) وأبريل المعتمد (بعده) كما هما بالحرف
  assert.deepEqual(definitionOf(await runRow(ops.jan.id)), janOpsBefore, 'يناير المعتمد ما اتغيرش')
  assert.deepEqual(definitionOf(await runRow(ops.apr.id)), aprOpsBefore, 'أبريل المعتمد ما اتغيرش')
  assert.ok(!definitionOf(await runRow(nasr.jan.id)).filters.employeeIds.includes(mover.id), 'يناير فرع النصر المعتمد ما اتغيرش')

  // مسير الشهر الجديد من مارس: العضوية الجديدة بتكمل لوحدها
  const next = expectStatus(await request(admin, 'POST', '/payroll/runs/create-next-period', { sourcePeriod: '2027-03' }), 201)
  const nasrApril = next.created.find(row => row.name === 'مسير فرع النصر')
  assert.ok(nasrApril, JSON.stringify(next))
  assert.ok(definitionOf(await runRow(nasrApril.runId)).filters.employeeIds.includes(mover.id), 'العضوية كملت في الشهر الجديد')
})

test('(ج) «شيل خصم» لموظف واحد من مسار شاشة المسير: البند يختفي والصافي يزيد بمقداره', async () => {
  const emp = await employee(deptSales, { basicSalary: 9000 })
  await repo('EmployeeObligation').save({ employeeId: emp.id, type: 'DEBIT', category: 'fine', amount: 150, label: 'غرامة تأخير تسليم',
    status: 'PENDING', targetPeriod: '2027-06', createdByUserId: admin.id })
  const run = await draft('مسير شيل الخصم', '2027-06', { employeeIds: [emp.id] })
  const calculated = expectStatus(await request(admin, 'POST', `/payroll/runs/${run.id}/calculate`, {}), 201)
  const before = calculated.items.find(item => item.employeeId === emp.id)
  assert.equal(cents(before.otherDeductions), 15000, 'الغرامة مخصومة')
  const linesBefore = expectStatus(await request(admin, 'GET', `/payroll/runs/${run.id}/lines`), 200)
  const rowBefore = linesBefore.rows.find(row => row.itemId === before.id)
  assert.ok(rowBefore.deductions.some(line => line.key === 'DEBIT:fine' && cents(line.amount) === 15000), 'بند الغرامة باسمه في صف الموظف')

  // نفس نداء نافذة «شيل خصم» للبنود اللي مالهاش إعفاء مالي بنوعها: قاعدة على الموظف لشهر المسير، ثم إعادة الحساب
  const waiver = expectStatus(await request(admin, 'POST', '/payroll/overview/waivers', { period: '2027-06', kind: 'OTHER', targetLevel: 'employees',
    branchId: branchA.id, employeeIds: [emp.id], reason: 'المالك شال الغرامة' }), 201)
  assert.ok(waiver.recalculateRuns.some(row => row.id === run.id), 'المسير المفتوح يتقال إنه يتحسب تاني')
  const after = expectStatus(await request(admin, 'POST', `/payroll/runs/${run.id}/recalculate`, { reason: 'بعد شيل الغرامة' }), 201)
  const item = after.items.find(row => row.employeeId === emp.id)
  assert.equal(cents(item.otherDeductions), 0, 'الخصم اتشال')
  assert.equal(cents(item.netPay) - cents(before.netPay), 15000, 'الصافي زاد بمقدار الخصم بالضبط')
  const linesAfter = expectStatus(await request(admin, 'GET', `/payroll/runs/${run.id}/lines`), 200)
  assert.ok(!linesAfter.rows.find(row => row.itemId === item.id).deductions.some(line => line.key === 'DEBIT:fine'), 'البند اختفى من صف الموظف')
})
