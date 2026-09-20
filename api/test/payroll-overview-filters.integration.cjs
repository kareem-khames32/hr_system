// طلب المالك (20 سبتمبر) على قاعدة SQL مؤقتة معزولة (synchronize) تُحذف في النهاية:
// (أ) فلاتر «المدرجين بالمسير» و«موظفين ليس لديهم مسير» والجدول الموحد — كلها في الخادم وبتشتغل مع بعض، والعدد بيعكس الفلتر.
// (ب) الجدول الموحد: كل موظفي الشهر بعمود «المسير»، ومنظور «الكل / المدرجين / بلا مسير».
// (ج) «نقل لمسير…» لاختيار مختلط في نداء واحد: اللي في مسير يتنقل، واللي بلا مسير يتضاف، والمقفول والخارج عن النطاق يتخطى بسببه.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_payroll_overview_filters_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-overview-filters-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const cycle23 = { defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 23, cycleEndMode: 'DERIVED', cycleEndDay: null }
let app, master, ds, base, created = false
let admin, branchA, branchB, deptSales, deptOps, deptOther, teamNorth, teamSouth, policyVersionId, employeeNumber = 0

function assertDisposable() {
  assert.match(database, /^hr_payroll_overview_filters_test_[a-f0-9]{16}$/)
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
async function employee(overrides = {}) {
  const n = ++employeeNumber
  const emp = await repo('Employee').save({ employeeCode: `FIL${String(n).padStart(3, '0')}`, fullName: `موظف الفلاتر ${n}`, branchId: branchA.id,
    departmentId: deptSales.id, teamId: null, jobTitle: 'محاسب', joinDate: '2020-01-01', basicSalary: 6000, housingAllowance: 0,
    transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active',
    isActive: true, payMethod: 'transfer', ...overrides })
  await repo('AttendanceExemption').save({ employeeId: emp.id, effectiveFrom: '2026-01-01', effectiveTo: '2028-12-31', reasonCode: 'field_role',
    reason: 'نافذة اختبار الفلاتر المعزولة', status: 'APPROVED', createdByUserId: admin.id, approvedByUserId: admin.id,
    approvedAt: new Date('2026-01-01T08:00:00Z'), terminatedFrom: null, overtimeEligibleOverride: null, unpaidLeaveDeductibleOverride: null, requiresCheckinForPresence: false })
  return emp
}
const draft = async (name, period, filters) =>
  expectStatus(await request(admin, 'POST', '/payroll/runs', { name, policyVersionId, period, filters }), 201)
const runRow = id => repo('PayrollRun').findOneByOrFail({ id })
const definitionOf = run => JSON.parse(run.definition)
const setStatus = (id, status) => ds.query(`UPDATE [payroll_runs] SET [status] = @1 WHERE [id] = @0`, [id, status])
const query = (route, params) => `${route}?${new URLSearchParams(params).toString()}`
const roster = async (user, params) => expectStatus(await request(user, 'GET', query('/payroll/overview/roster', params)), 200)
const unassigned = async (user, params) => expectStatus(await request(user, 'GET', query('/payroll/overview/unassigned', params)), 200)
const included = async (user, params) => expectStatus(await request(user, 'GET', query('/payroll/overview/included', params)), 200)
const ids = rows => rows.map(row => row.employeeId).sort((a, b) => a - b)

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
  branchA = await repo('Branch').save({ code: 'FIL_A', name: 'فرع المعادي' })
  branchB = await repo('Branch').save({ code: 'FIL_B', name: 'فرع النصر' })
  deptSales = await repo('Department').save({ name: 'قسم المبيعات', branchId: branchA.id, isActive: true })
  deptOps = await repo('Department').save({ name: 'قسم العمليات', branchId: branchA.id, isActive: true })
  deptOther = await repo('Department').save({ name: 'قسم فرع النصر', branchId: branchB.id, isActive: true })
  teamNorth = await repo('Team').save({ name: 'فريق الشمال', departmentId: deptSales.id, isActive: true })
  teamSouth = await repo('Team').save({ name: 'فريق الجنوب', departmentId: deptSales.id, isActive: true })
  admin = await repo('User').save({ email: 'admin@overview-filters-test.invalid', displayName: 'admin', passwordHash: 'test-only',
    role: 'super_admin', branchId: null, permissions: JSON.stringify([]) })
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '23' }, { key: 'payroll.monthly_days', value: '30' }, { key: 'payroll.daily_hours', value: '8' },
    { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' }, { key: 'payroll.exempt_overtime_eligible', value: 'false' },
    { key: 'payroll.exempt_unpaid_leave_deductible', value: 'true' },
  ])
  const createdPolicy = expectStatus(await request(admin, 'POST', '/payroll/policies', { name: 'معادلة الفلاتر', effectiveFrom: '2026-07-23', settings: cycle23 }), 201)
  const [version] = createdPolicy.versions
  const published = expectStatus(await request(admin, 'POST', `/payroll/policies/${createdPolicy.policy.id}/versions/${version.id}/publish`,
    { expectedRevision: version.revision, reason: 'نشر معادلة اختبار الفلاتر' }), 200)
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
  if (errors.length) throw new AggregateError(errors, 'Payroll overview-filters fixture cleanup failed')
})

test('(أ) فلاتر «بلا مسير»: الاسم والكود والفرع والقسم والفريق والمسمى والحالة وتاريخ التعيين — كلها مع بعض والعدد بيعكسها', async () => {
  const period = '2026-08'
  const sales = await employee({ fullName: 'أحمد المبيعات', teamId: teamNorth.id, jobTitle: 'مندوب مبيعات', joinDate: '2024-03-15' })
  const ops = await employee({ fullName: 'منى العمليات', departmentId: deptOps.id, jobTitle: 'محاسب', joinDate: '2025-06-01' })
  const south = await employee({ fullName: 'سعيد الجنوب', teamId: teamSouth.id, jobTitle: 'مندوب مبيعات', joinDate: '2026-01-10' })
  const nasr = await employee({ fullName: 'خالد النصر', branchId: branchB.id, departmentId: deptOther.id, jobTitle: 'سائق', joinDate: '2023-02-02' })
  const probation = await employee({ fullName: 'ياسر التجربة', status: 'probation', jobTitle: 'محاسب', joinDate: '2026-07-01' })
  const mine = [sales.id, ops.id, south.id, nasr.id, probation.id]

  const all = await unassigned(admin, { period })
  const onlyMine = rows => ids(rows.filter(row => mine.includes(row.employeeId)))
  assert.deepEqual(onlyMine(all.rows), [...mine].sort((a, b) => a - b), 'الكل بلا مسير قبل أي فلتر')
  assert.equal(all.total, all.rows.length, 'بلا فلتر: الظاهر = الإجمالي')
  assert.ok(all.jobTitleOptions.includes('مندوب مبيعات') && all.jobTitleOptions.includes('سائق'), 'قائمة المسميات من صفوف الشهر')
  assert.ok(all.reasonOptions.includes('OUT_OF_ALL_RUNS'), 'قائمة الأسباب')

  assert.deepEqual(onlyMine((await unassigned(admin, { period, search: 'منى' })).rows), [ops.id], 'بحث بالاسم')
  assert.deepEqual(onlyMine((await unassigned(admin, { period, search: sales.employeeCode.toLowerCase() })).rows), [sales.id], 'بحث بالكود بلا حساسية للحالة')
  assert.deepEqual(onlyMine((await unassigned(admin, { period, branchId: branchB.id })).rows), [nasr.id], 'فلتر الفرع')
  assert.deepEqual(onlyMine((await unassigned(admin, { period, departmentId: deptOps.id })).rows), [ops.id], 'فلتر القسم')
  assert.deepEqual(onlyMine((await unassigned(admin, { period, teamId: teamNorth.id })).rows), [sales.id], 'فلتر الفريق')
  assert.deepEqual(onlyMine((await unassigned(admin, { period, jobTitle: 'مندوب مبيعات' })).rows), [sales.id, south.id].sort((a, b) => a - b), 'فلتر المسمى')
  assert.deepEqual(onlyMine((await unassigned(admin, { period, statuses: 'probation' })).rows), [probation.id], 'فلتر الحالة الوظيفية')
  assert.deepEqual(onlyMine((await unassigned(admin, { period, hiredFrom: '2024-01-01', hiredTo: '2025-12-31' })).rows),
    [sales.id, ops.id].sort((a, b) => a - b), 'مدى تاريخ التعيين')

  // الفلاتر مع بعض: مندوب مبيعات في فريق الجنوب اتعيّن 2026
  const combined = await unassigned(admin, { period, jobTitle: 'مندوب مبيعات', teamId: teamSouth.id, hiredFrom: '2026-01-01', hiredTo: '2026-12-31', statuses: 'active' })
  assert.deepEqual(onlyMine(combined.rows), [south.id])
  assert.equal(combined.rows.length, 1, 'العدد بيعكس الفلاتر')
  assert.ok(combined.total > combined.rows.length, 'الإجمالي قبل الفلترة أكبر')
  // فلتر ما يطابقش حد = صفر صفوف بلا خطأ
  assert.equal((await unassigned(admin, { period, jobTitle: 'مندوب مبيعات', departmentId: deptOps.id })).rows.length, 0)
})

test('(ب) الجدول الموحد: كل موظفي الشهر بعمود «المسير»، والمنظور بيفرز المدرجين من بلا مسير، وفلتر المسير للمدرجين', async () => {
  const period = '2026-09'
  const inRun = await employee({ fullName: 'حسن المدرج', departmentId: deptOps.id, jobTitle: 'فني' })
  const outside = await employee({ fullName: 'ليلى بلا مسير', departmentId: deptOps.id, jobTitle: 'فني' })
  const run = await draft('مسير الفنيين', period, { employeeIds: [inRun.id] })
  expectStatus(await request(admin, 'POST', `/payroll/runs/${run.id}/calculate`, {}), 201)

  const all = await roster(admin, { period, jobTitle: 'فني' })
  assert.deepEqual(ids(all.rows), [inRun.id, outside.id].sort((a, b) => a - b), 'الاتنين في جدول واحد')
  const assignedRow = all.rows.find(row => row.employeeId === inRun.id)
  assert.deepEqual([assignedRow.runId, assignedRow.runName], [run.id, 'مسير الفنيين'], 'عمود المسير باسمه')
  const unassignedRow = all.rows.find(row => row.employeeId === outside.id)
  assert.deepEqual([unassignedRow.runId, unassignedRow.runName], [null, null], '«بلا مسير»')
  assert.ok(unassignedRow.reasonCode, 'سبب عدم الإدراج ظاهر في الجدول الموحد')
  assert.equal(all.counts.all, all.counts.assigned + all.counts.unassigned, 'عدّادات المنظور متسقة')

  assert.deepEqual(ids((await roster(admin, { period, jobTitle: 'فني', membership: 'assigned' })).rows), [inRun.id])
  assert.deepEqual(ids((await roster(admin, { period, jobTitle: 'فني', membership: 'unassigned' })).rows), [outside.id])
  assert.deepEqual(ids((await roster(admin, { period, jobTitle: 'فني', runId: run.id })).rows), [inRun.id], 'فلتر «في أنهي مسير»')
  assert.deepEqual(ids((await roster(admin, { period, jobTitle: 'فني', reasonCode: unassignedRow.reasonCode })).rows), [outside.id], 'فلتر سبب عدم الإدراج')
  assert.deepEqual(ids((await included(admin, { period, jobTitle: 'فني', runId: run.id })).rows), [inRun.id], 'نفس فلتر المسير في تبويب المدرجين')
  assert.equal((await included(admin, { period, jobTitle: 'فني', search: 'ليلى' })).rows.length, 0, 'المدرجين ما فيهمش اللي بلا مسير')

  // وجهات النقل: المسير المفتوح بفترته ومعادلته
  const targets = expectStatus(await request(admin, 'GET', `/payroll/overview/run-targets?period=${period}`), 200)
  const target = targets.targets.find(row => row.id === run.id)
  assert.ok(target, JSON.stringify(targets))
  assert.equal(target.policyName, 'معادلة الفلاتر')
  assert.deepEqual([target.period, target.startDate, target.endDate], [period, '2026-08-23', '2026-09-22'])
})

test('(ج) «نقل لمسير…» لاختيار مختلط في نداء واحد: نقل وإضافة ومتخطى بسببه لكل موظف', async () => {
  const period = '2027-05'
  const mover = await employee({ fullName: 'عمر المنقول', departmentId: deptOps.id, jobTitle: 'مشرف' })
  const stays = await employee({ fullName: 'فادي الباقي', departmentId: deptOps.id, jobTitle: 'مشرف' })
  const loose = await employee({ fullName: 'سميرة بلا مسير', departmentId: deptOps.id, jobTitle: 'مشرف' })
  const locked = await employee({ fullName: 'طارق المقفول', departmentId: deptOps.id, jobTitle: 'مشرف' })
  const already = await employee({ fullName: 'نادر الموجود', departmentId: deptOps.id, jobTitle: 'مشرف' })

  const source = await draft('مسير المشرفين', period, { employeeIds: [mover.id, stays.id] })
  const lockedRun = await draft('مسير مقفول', period, { employeeIds: [locked.id] })
  const target = await draft('مسير فرع النصر', period, { employeeIds: [already.id] })
  await setStatus(lockedRun.id, 'APPROVED')

  const bulk = expectStatus(await request(admin, 'POST', `/payroll/runs/${target.id}/members/bulk`,
    { employeeIds: [mover.id, loose.id, locked.id, already.id], reason: 'توحيد المشرفين على مسير فرع النصر' }), 201)
  const outcome = id => bulk.results.find(row => row.employeeId === id)
  assert.equal(outcome(mover.id).outcome, 'MOVED', JSON.stringify(bulk.results))
  assert.equal(outcome(mover.id).fromRunId, source.id)
  assert.equal(outcome(loose.id).outcome, 'ADDED')
  assert.equal(outcome(locked.id).outcome, 'SKIPPED')
  assert.match(outcome(locked.id).skipReason, /معتمد|مصروف/, 'سبب التخطي بالعربي: الشهر المقفول')
  assert.equal(outcome(already.id).outcome, 'SKIPPED')
  assert.match(outcome(already.id).skipReason, /أصلًا/, 'سبب التخطي: موجود في المسير ده أصلًا')
  assert.deepEqual([bulk.moved, bulk.added, bulk.skipped.sort((a, b) => a - b)],
    [[mover.id], [loose.id], [locked.id, already.id].sort((a, b) => a - b)])
  for (const row of bulk.results) assert.ok(row.fullName, 'اسم الموظف في النتيجة')

  // التعريف بعد النداء: الاتنين في المسير الهدف، والمنقول خرج من مسيره، والمقفول ما اتغيرش
  const targetDefinition = definitionOf(await runRow(target.id))
  for (const id of [mover.id, loose.id]) {
    assert.ok(targetDefinition.filters.employeeIds.includes(id) || targetDefinition.filters.includeEmployeeIds.includes(id), `${id} في المسير الهدف`)
  }
  assert.ok(!definitionOf(await runRow(source.id)).filters.employeeIds.includes(mover.id), 'خرج من مسيره القديم')
  assert.deepEqual(definitionOf(await runRow(lockedRun.id)).filters.employeeIds, [locked.id], 'المسير المعتمد ما اتغيرش')

  // الجدول الموحد بيعكس النتيجة فورًا (المسير المسودة بيتحسب أول ما ينضاف له حد، فعموده بيبان)
  expectStatus(await request(admin, 'POST', `/payroll/runs/${target.id}/calculate`, {}), 201)
  const after = await roster(admin, { period, jobTitle: 'مشرف' })
  const runOf = id => after.rows.find(row => row.employeeId === id)?.runId
  assert.equal(runOf(mover.id), target.id, JSON.stringify(after.rows.map(row => [row.employeeId, row.runId])))
  assert.equal(runOf(loose.id), target.id)

  // السبب مطلوب والقائمة مش فاضية (نفس تحقق النداء المفرد)
  assert.equal((await request(admin, 'POST', `/payroll/runs/${target.id}/members/bulk`, { employeeIds: [loose.id], reason: 'ي' })).status, 400)
  assert.equal((await request(admin, 'POST', `/payroll/runs/${target.id}/members/bulk`, { employeeIds: [], reason: 'سبب كافي' })).status, 400)
})

test('(د) حساب الفرع: الفلاتر والنقل بنطاق فرعه بس، والموظف بره الفرع يتخطى بسببه', async () => {
  const period = '2027-08'
  const branchUser = await repo('User').save({ email: 'branch@overview-filters-test.invalid', displayName: 'محاسب المعادي', passwordHash: 'test-only',
    role: 'hr', branchId: branchA.id, permissions: JSON.stringify(['payroll.view', 'payroll.calculate']) })
  const inBranch = await employee({ fullName: 'هدى المعادي', departmentId: deptOps.id, jobTitle: 'أمين مخزن' })
  const otherBranch = await employee({ fullName: 'رامي النصر', branchId: branchB.id, departmentId: deptOther.id, jobTitle: 'أمين مخزن' })
  const run = await draft('مسير أمناء المخازن', period, { branchIds: [branchA.id], departmentIds: [deptOps.id] })

  const scoped = await roster(branchUser, { period, jobTitle: 'أمين مخزن' })
  assert.deepEqual(ids(scoped.rows), [inBranch.id], 'حساب الفرع يشوف فرعه بس')
  assert.equal((await roster(branchUser, { period, jobTitle: 'أمين مخزن', branchId: branchB.id })).rows.length, 0, 'فلتر فرع تاني ما يكسرش النطاق')
  assert.ok((await roster(admin, { period, jobTitle: 'أمين مخزن' })).rows.length >= 2, 'حساب الشركة يشوف الاتنين')

  const bulk = expectStatus(await request(branchUser, 'POST', `/payroll/runs/${run.id}/members/bulk`,
    { employeeIds: [inBranch.id, otherBranch.id], reason: 'ضم أمناء المخازن للمسير' }), 201)
  const outcome = id => bulk.results.find(row => row.employeeId === id)
  assert.equal(outcome(inBranch.id).outcome, 'ADDED')
  assert.equal(outcome(otherBranch.id).outcome, 'SKIPPED')
  assert.match(outcome(otherBranch.id).skipReason, /نطاق فرعك/, 'الموظف بره الفرع يتخطى بسببه مش برفض النداء كله')
})
