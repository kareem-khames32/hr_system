// «إنشاء مسيرات الشهر الجديد» وبنود الاستحقاقات والاستقطاعات (طلب المالك 19 سبتمبر) على قاعدة SQL مؤقتة معزولة (synchronize) تُحذف في النهاية:
// - مسودة لكل مسير عادي غير ملغى في شهر المصدر بنفس الاسم والمعادلة (أحدث نسخة منشورة سارية) والفلاتر والقائمة والاستبعادات بأسبابها،
//   والموجود بنفس الاسم يتخطى، والمعاينة ما بتحفظش، والضغط مرتين ما يعملش شهرين، وحساب الفرع يعمل فرعه بس.
// - بنود كل موظف في المسير والقسيمة وتابتي الشهر بأسمائها، ومجموعها = أعمدة البند المحفوظة.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_payroll_next_period_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-next-period-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const cycle23 = { defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 23, cycleEndMode: 'DERIVED', cycleEndDay: null }
let app, master, ds, base, created = false
let admin, hrA, hrB, viewer, branchA, branchB, deptA, deptB, policy, employeeNumber = 0

function assertDisposable() {
  assert.match(database, /^hr_payroll_next_period_test_[a-f0-9]{16}$/)
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
async function employee(branch, department, overrides = {}) {
  const n = ++employeeNumber
  const emp = await repo('Employee').save({ employeeCode: `NXP${String(n).padStart(3, '0')}`, fullName: `موظف الشهر الجديد ${n}`, branchId: branch.id,
    departmentId: department.id, joinDate: '2020-01-01', basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0,
    workNatureAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'transfer', ...overrides })
  // استثناء حضور طول السنة يعزل الحساب عن الغياب والتأخير
  await repo('AttendanceExemption').save({ employeeId: emp.id, effectiveFrom: '2026-01-01', effectiveTo: '2027-12-31', reasonCode: 'field_role',
    reason: 'نافذة اختبار الشهر الجديد المعزولة', status: 'APPROVED', createdByUserId: admin.id, approvedByUserId: admin.id,
    approvedAt: new Date('2026-01-01T08:00:00Z'), terminatedFrom: null, overtimeEligibleOverride: null, unpaidLeaveDeductibleOverride: null, requiresCheckinForPresence: false })
  return emp
}
const createDraft = async (body, user = admin) => expectStatus(await request(user, 'POST', '/payroll/runs', body), 201)
const nextPeriod = (user, body = {}) => request(user, 'POST', '/payroll/runs/create-next-period', body)
const definitionOf = run => JSON.parse(run.definition)
const cents = value => Math.round(Number(value ?? 0) * 100)
const sumCents = lines => lines.reduce((sum, line) => sum + cents(line.amount), 0)

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
  branchA = await repo('Branch').save({ code: 'NXP_A', name: 'فرع القاهرة' })
  branchB = await repo('Branch').save({ code: 'NXP_B', name: 'فرع الجيزة' })
  deptA = await repo('Department').save({ name: 'قسم القاهرة', branchId: branchA.id, isActive: true })
  deptB = await repo('Department').save({ name: 'قسم الجيزة', branchId: branchB.id, isActive: true })
  const user = (label, role, branchId, permissions) => repo('User').save({ email: `${label}@next-period-test.invalid`, displayName: label,
    passwordHash: 'test-only', role, branchId, permissions: JSON.stringify(permissions) })
  admin = await user('admin', 'super_admin', null, [])
  hrA = await user('hr-a', 'hr_manager', branchA.id, ['payroll.view', 'payroll.calculate'])
  hrB = await user('hr-b', 'hr_manager', branchB.id, ['payroll.view', 'payroll.calculate'])
  viewer = await user('viewer', 'hr_manager', null, ['payroll.view'])
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '23' }, { key: 'payroll.monthly_days', value: '30' }, { key: 'payroll.daily_hours', value: '8' },
    { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' }, { key: 'payroll.exempt_overtime_eligible', value: 'false' },
    { key: 'payroll.exempt_unpaid_leave_deductible', value: 'true' },
  ])
  const createdPolicy = expectStatus(await request(admin, 'POST', '/payroll/policies', { name: 'معادلة الشركة', effectiveFrom: '2026-07-23', settings: cycle23 }), 201)
  const [draft] = createdPolicy.versions
  const published = expectStatus(await request(admin, 'POST', `/payroll/policies/${createdPolicy.policy.id}/versions/${draft.id}/publish`,
    { expectedRevision: draft.revision, reason: 'نشر معادلة اختبار الشهر الجديد' }), 200)
  policy = { id: createdPolicy.policy.id, v1: published.version }
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
  if (errors.length) throw new AggregateError(errors, 'Payroll next-period fixture cleanup failed')
})

test('إنشاء مسيرات الشهر الجديد: مسودة لكل مسير بنفس تعريفه، والموجود يتخطى، والمعاينة ما بتحفظش، والضغط تاني ما يعملش شهر زيادة، وحساب الفرع فرعه بس', async () => {
  const a1 = await employee(branchA, deptA), a2 = await employee(branchA, deptA), b1 = await employee(branchB, deptB)
  const v1 = policy.v1.id
  const runA = await createDraft({ name: 'مسير فرع القاهرة', policyVersionId: v1, period: '2026-08', filters: { branchIds: [branchA.id] },
    exclusions: [{ employeeId: a2.id, reason: 'إجازة طويلة بدون راتب' }] })
  const runB = await createDraft({ name: 'مسير فرع الجيزة', policyVersionId: v1, period: '2026-08', filters: { branchIds: [branchB.id] } })
  const runL = await createDraft({ name: 'مسير قائمة الإدارة', policyVersionId: v1, period: '2026-08', filters: { employeeIds: [a1.id, b1.id] } })
  const runX = await createDraft({ name: 'مسير ملغى', policyVersionId: v1, period: '2026-08', filters: { branchIds: [branchA.id] } })
  expectStatus(await request(admin, 'POST', `/payroll/runs/${runX.id}/cancel`, { reason: 'تجربة ملغاة' }), 201)
  // الشهر اتحسب (المسير الأول خلص حسابه): هو شهر المصدر الافتراضي — المسودات لوحدها مش مصدر
  await ds.query(`UPDATE [payroll_runs] SET [status] = 'CALCULATED' WHERE [id] = @0`, [runA.id])
  // مسير الجيزة لسبتمبر اتعمل يدوي قبل كده بنفس الاسم
  const manualB = await createDraft({ name: 'مسير فرع الجيزة', policyVersionId: v1, period: '2026-09', filters: { branchIds: [branchB.id] } })

  assert.equal((await nextPeriod(viewer, { dryRun: true })).status, 403, 'العرض بس ما يعملش مسيرات')
  assert.equal((await nextPeriod(admin, { sourcePeriod: '2026-13' })).status, 400)

  const runsBefore = await repo('PayrollRun').count()
  const plan = expectStatus(await nextPeriod(admin, { dryRun: true }), 201)
  assert.equal(plan.dryRun, true)
  assert.deepEqual([plan.sourcePeriod, plan.targetPeriod], ['2026-08', '2026-09'])
  assert.deepEqual(plan.sourcePeriods, ['2026-09', '2026-08'])
  assert.deepEqual(plan.created.map(row => [row.sourceRunId, row.name, row.runId, row.policyName, row.versionNo]),
    [[runA.id, 'مسير فرع القاهرة', null, 'معادلة الشركة', 1], [runL.id, 'مسير قائمة الإدارة', null, 'معادلة الشركة', 1]])
  assert.deepEqual(plan.skipped.map(row => [row.sourceRunId, row.code, row.existingRunId]), [[runB.id, 'PAYRUN-NEXT-EXISTS', manualB.id]])
  assert.ok(!plan.created.some(row => row.sourceRunId === runX.id) && !plan.skipped.some(row => row.sourceRunId === runX.id), 'الملغى مش مصدر')
  assert.equal(await repo('PayrollRun').count(), runsBefore, 'المعاينة ما بتحفظش حاجة')

  const result = expectStatus(await nextPeriod(admin, { sourcePeriod: plan.sourcePeriod }), 201)
  assert.equal(result.dryRun, false)
  assert.deepEqual(result.created.map(row => row.sourceRunId), [runA.id, runL.id])
  assert.deepEqual(result.skipped.map(row => row.code), ['PAYRUN-NEXT-EXISTS'])
  for (const row of result.created) {
    const source = await repo('PayrollRun').findOneByOrFail({ id: row.sourceRunId })
    const copy = await repo('PayrollRun').findOneByOrFail({ id: row.runId })
    assert.deepEqual([copy.status, copy.period, copy.startDate, copy.endDate, copy.name, copy.policyVersionId, copy.runType ?? 'REGULAR'],
      ['DRAFT', '2026-09', '2026-08-23', '2026-09-22', source.name, v1, 'REGULAR'])
    assert.deepEqual(definitionOf(copy).filters, definitionOf(source).filters, 'نفس الفلاتر والقائمة')
    assert.deepEqual(definitionOf(copy).exclusions.map(e => [e.employeeId, e.reason]), definitionOf(source).exclusions.map(e => [e.employeeId, e.reason]), 'نفس المستبعدين بأسبابهم')
    assert.deepEqual([copy.scopeType, copy.scopeIds, copy.employeeIds], [source.scopeType, source.scopeIds, source.employeeIds])
    const [event] = await repo('PayrollRunEvent').findBy({ runId: copy.id, eventType: 'DRAFT_CREATED' })
    assert.equal(event.payload.copiedFromRunId, source.id, 'حدث الإنشاء بيقول اتنسخ من أنهي مسير')
  }
  assert.deepEqual(definitionOf(await repo('PayrollRun').findOneByOrFail({ id: result.created[0].runId })).exclusions.map(e => e.employeeId), [a2.id])

  // الضغط تاني: الشهر الجديد كله مسودات فمصدره لسه أغسطس، وكل حاجة موجودة
  const again = expectStatus(await nextPeriod(admin), 201)
  assert.deepEqual([again.sourcePeriod, again.targetPeriod, again.created.length], ['2026-08', '2026-09', 0])
  assert.deepEqual(again.skipped.map(row => row.code), ['PAYRUN-NEXT-EXISTS', 'PAYRUN-NEXT-EXISTS', 'PAYRUN-NEXT-EXISTS'])
  assert.equal(await repo('PayrollRun').count({ where: { period: '2026-09' } }), 3)

  // مسير محسوب لشهر بعيد محفوظ من تجربة ما يبقاش شهر المصدر الافتراضي (يفضل متاح بالاختيار)
  const now = new Date(), future = `${now.getFullYear() + 1}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const { id: _sourceId, createdAt: _createdAt, ...sourceA } = await repo('PayrollRun').findOneByOrFail({ id: runA.id })
  await repo('PayrollRun').save({ ...sourceA, name: 'مسير تجربة بعيد', period: future, startDate: `${future}-01`, endDate: `${future}-28`, status: 'CALCULATED' })
  const withFuture = expectStatus(await nextPeriod(admin, { dryRun: true }), 201)
  assert.deepEqual([withFuture.sourcePeriod, withFuture.targetPeriod, withFuture.sourcePeriods[0]], ['2026-08', '2026-09', future])

  // حساب فرع القاهرة: مصدره مسير فرعه بس (الجيزة والقائمة المختلطة مش ظاهرين له)
  const branchPlan = expectStatus(await nextPeriod(hrA, { dryRun: true }), 201)
  assert.deepEqual([branchPlan.sourcePeriod, branchPlan.targetPeriod], ['2026-08', '2026-09'])
  assert.deepEqual(branchPlan.created, [])
  assert.deepEqual(branchPlan.skipped.map(row => [row.sourceRunId, row.code]), [[runA.id, 'PAYRUN-NEXT-EXISTS']])

  // نسخة معادلة جديدة من 23 سبتمبر: أكتوبر ياخدها، وسبتمبر يفضل على الأولى
  let v2 = expectStatus(await request(admin, 'POST', `/payroll/policies/${policy.id}/versions`, { sourceVersionId: v1, expectedRevision: policy.v1.revision, reason: 'نسخة أكتوبر' }), 201).version
  v2 = expectStatus(await request(admin, 'PATCH', `/payroll/policies/${policy.id}/versions/${v2.id}`, { expectedRevision: v2.revision, reason: 'تبدأ أكتوبر', effectiveFrom: '2026-09-23' }), 200).version
  v2 = expectStatus(await request(admin, 'POST', `/payroll/policies/${policy.id}/versions/${v2.id}/publish`, { expectedRevision: v2.revision, reason: 'نشر نسخة أكتوبر' }), 200).version
  const october = expectStatus(await nextPeriod(hrA, { sourcePeriod: '2026-09' }), 201)
  assert.deepEqual([october.sourcePeriod, october.targetPeriod], ['2026-09', '2026-10'])
  assert.deepEqual(october.created.map(row => [row.name, row.versionNo]), [['مسير فرع القاهرة', 2]])
  assert.deepEqual(october.skipped, [])
  const octoberRun = await repo('PayrollRun').findOneByOrFail({ id: october.created[0].runId })
  assert.deepEqual([octoberRun.policyVersionId, octoberRun.startDate, octoberRun.endDate], [v2.id, '2026-09-23', '2026-10-22'])
  assert.deepEqual(definitionOf(octoberRun).filters.branchIds, [branchA.id])
  assert.deepEqual((await repo('PayrollRun').findBy({ period: '2026-10' })).map(run => run.name), ['مسير فرع القاهرة'], 'فرع الجيزة والقائمة ما اتعملوش من حساب القاهرة')
  // حساب الجيزة ما يشوفش شهر فيه مسيرات القاهرة بس
  assert.equal((await nextPeriod(hrB, { sourcePeriod: '2026-10' })).status, 400)
})

test('بنود المسير والقسيمة وتابتي الشهر: كل استحقاق واستقطاع باسمه ومجموعها = أعمدة البند، وعزل الفروع', async () => {
  const emp = await employee(branchA, deptA, { basicSalary: 9000, housingAllowance: 1000, transportAllowance: 500 })
  const type = expectStatus(await request(admin, 'POST', '/payroll/allowances/types', { name: 'بدل وجبات' }), 201)
  expectStatus(await request(admin, 'POST', '/payroll/allowances/grants', { period: '2026-11', allowanceTypeId: type.id, amount: '300', targetLevel: 'employees',
    branchId: branchA.id, employeeIds: [emp.id], reason: 'وجبات نوفمبر' }), 201)
  await repo('EmployeeObligation').save({ employeeId: emp.id, type: 'DEBIT', category: 'fine', amount: 150, label: 'غرامة تأخير تسليم', status: 'PENDING',
    targetPeriod: '2026-11', createdByUserId: admin.id })
  const run = expectStatus(await request(admin, 'POST', '/payroll/runs/calculate-defined', { period: '2026-11', scopeType: 'CUSTOM', employeeIds: [emp.id],
    name: `مسير البنود ${crypto.randomUUID().slice(0, 8)}` }), 201)
  const item = run.items.find(row => row.employeeId === emp.id)
  assert.ok(item, 'الموظف في المسير')

  const table = expectStatus(await request(admin, 'GET', `/payroll/runs/${run.id}/lines`), 200)
  assert.deepEqual(table.columns.earnings.map(column => [column.key, column.name]), [['BASIC', 'الأساسي'], ['SALARY:HOUSING', 'بدل السكن'],
    ['SALARY:TRANSPORT', 'بدل الانتقال'], ['ALLOWANCE:بدل وجبات', 'بدل وجبات']])
  assert.deepEqual(table.columns.deductions.map(column => [column.key, column.name]), [['DEBIT:fine', 'غرامة']])
  const row = table.rows.find(line => line.itemId === item.id)
  assert.deepEqual(row.earnings.map(line => [line.name, line.amount]), [['الأساسي', 9000], ['بدل السكن', 1000], ['بدل الانتقال', 500], ['بدل وجبات', 300]])
  assert.deepEqual(row.deductions.map(line => [line.name, line.amount]), [['غرامة', 150]])
  const earningColumns = ['basicSalary', 'allowances', 'overtimeAmount', 'otherAdditions'].reduce((sum, key) => sum + cents(item[key]), 0)
  const deductionColumns = ['latenessDeduction', 'shortfallDeduction', 'absenceDeduction', 'unpaidLeaveDeduction', 'loanInstallments', 'otherDeductions', 'socialInsuranceDeduction']
    .reduce((sum, key) => sum + cents(item[key]), 0)
  assert.deepEqual([sumCents(row.earnings), cents(row.totals.earnings)], [earningColumns, earningColumns])
  assert.deepEqual([sumCents(row.deductions), cents(row.totals.deductions)], [deductionColumns, deductionColumns])
  assert.equal(cents(row.totals.net), cents(item.netPay))
  assert.equal(cents(row.totals.earnings) - cents(row.totals.deductions), cents(item.netPay), 'الصافي = الاستحقاقات − الاستقطاعات')

  const payslip = expectStatus(await request(admin, 'GET', `/payroll/items/${item.id}`), 200)
  assert.deepEqual(payslip.lines, { earnings: row.earnings, deductions: row.deductions, totals: row.totals }, 'القسيمة بنفس بنود الجدول')

  const month = expectStatus(await request(admin, 'GET', '/payroll/overview/lines?period=2026-11'), 200)
  const monthRow = month.rows.find(line => line.itemId === item.id)
  assert.deepEqual([monthRow.fullName, monthRow.branchName, monthRow.runId], [emp.fullName, 'فرع القاهرة', run.id])
  assert.deepEqual(monthRow.earnings, row.earnings)
  assert.ok(month.columns.earnings.some(column => column.key === 'ALLOWANCE:بدل وجبات'))

  // عزل الفروع: حساب الجيزة ما يشوفش بنود مسير القاهرة ولا صفوفها في الشهر
  assert.equal((await request(hrB, 'GET', `/payroll/runs/${run.id}/lines`)).status, 403)
  assert.deepEqual(expectStatus(await request(hrB, 'GET', '/payroll/overview/lines?period=2026-11'), 200).rows, [])
  assert.equal(expectStatus(await request(hrA, 'GET', '/payroll/overview/lines?period=2026-11'), 200).rows.length, 1)
})
