// الخطوات 16–18 (B3): تعريف المسير كمسودة (اسم + نسخة سياسة منشورة + فترة من دورتها + فلاتر مترابطة + قائمة + استبعادات بسبب)،
// ومعاينة العضوية للقراءة فقط، وتقرير «موظفون بلا مسير» وإقراره قبل الاعتماد.
// SQL وHTTP حقيقيان داخل قاعدة مؤقتة عشوائية (hr_run_definition_test_<hex>) تُحذف في النهاية؛ لا اتصال بـhr_system.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const { IsNull } = require('../node_modules/typeorm')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_run_definition_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-run-definition-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const period = '2026-08', startDate = '2026-07-23', endDate = '2026-08-22'
const cycle23 = { defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 23, cycleEndMode: 'DERIVED', cycleEndDay: null }
let app, master, ds, base, created = false
let admin, hrA, officerA, viewer, branchA, branchB, policyOne, policyTwo, unpublishedVersionId
let employeeNumber = 0, orgNumber = 0

function assertDisposable() {
  assert.match(database, /^hr_run_definition_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: null,
    tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
// الخطوة 20 (B4): قبل اعتماد مسير يُكتب سبب لكل رمز في تقرير التكافؤ (هذه المجموعة لا تختبر التكافؤ نفسه)
const { writeParityReasonsBeforeApproval } = require('./fixtures/payroll-parity-reasons.cjs')
async function request(user, method, route, body) {
  await writeParityReasonsBeforeApproval(request, user, method, route)
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
function expectStatus(response, status) { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }

// عدد الصفوف الفعلي في كل جداول القاعدة (COUNT_BIG لكل جدول، لا تقدير sys.partitions).
async function tableCounts() {
  assertDisposable()
  const tables = await ds.query(`SELECT s.name AS schemaName, t.name AS tableName FROM sys.tables t INNER JOIN sys.schemas s ON s.schema_id = t.schema_id ORDER BY s.name, t.name`)
  const counts = {}
  for (const row of tables) {
    const [count] = await ds.query(`SELECT COUNT_BIG(*) AS n FROM [${row.schemaName}].[${row.tableName}]`)
    counts[`${row.schemaName}.${row.tableName}`] = Number(count.n)
  }
  return counts
}
async function org(branch) {
  const number = ++orgNumber
  const department = await repo('Department').save({ name: `قسم تعريف المسير ${number}`, branchId: branch.id, isActive: true })
  const team = await repo('Team').save({ name: `فريق تعريف المسير ${number}`, departmentId: department.id, isActive: true })
  return { branch, department, team }
}
async function employee(unit, overrides = {}) {
  const emp = await repo('Employee').save({ employeeCode: `RDF${String(++employeeNumber).padStart(3, '0')}`, fullName: `موظف تعريف المسير ${employeeNumber}`,
    branchId: unit.branch.id, departmentId: unit.department.id, teamId: unit.team.id, joinDate: '2020-01-01',
    basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0,
    currency: 'SAR', status: 'active', isActive: true, payMethod: 'transfer', ...overrides })
  // حضور محسوب ثابت يعزل الاختبار عن سياسة الغياب.
  const rows = []
  const from = emp.joinDate > startDate ? emp.joinDate : startDate
  for (let time = Date.parse(`${from}T12:00:00Z`); time <= Date.parse(`${endDate}T12:00:00Z`); time += 86400000) {
    rows.push({ employeeId: emp.id, branchId: emp.branchId, date: new Date(time).toISOString().slice(0, 10), status: 'present', checkIn: '08:00', checkOut: '16:00',
      shiftName: 'وردية اختبار التعريف', shiftStart: '08:00', shiftEnd: '16:00', scheduleSource: 'override', workMinutes: 480, lateMinutes: 0, deductibleMinutes: 0, earlyLeaveMinutes: 0 })
  }
  if (rows.length) await repo('AttendanceDay').save(rows)
  return emp
}
async function publishedPolicy(name, extra = {}) {
  const created = expectStatus(await request(admin, 'POST', '/payroll/policies', { name, effectiveFrom: startDate, settings: cycle23, ...extra }), 201)
  const [version] = created.versions
  const published = expectStatus(await request(admin, 'POST', `/payroll/policies/${created.policy.id}/versions/${version.id}/publish`,
    { expectedRevision: version.revision, reason: `نشر ${name} لاختبار تعريف المسير` }), 200)
  return { policyId: created.policy.id, versionId: published.version.id }
}
const createDraft = async (body, user = admin) => expectStatus(await request(user, 'POST', '/payroll/runs', body), 201)
const calculateDraft = async (run, user = admin, body = {}) => expectStatus(await request(user, 'POST', `/payroll/runs/${run.id}/calculate`, body), 201)
function memberOf(run, emp) {
  const row = run.members.find(member => member.employeeId === emp.id)
  assert.ok(row, `missing membership for ${emp.employeeCode}`)
  return row
}
async function acknowledge(run, user = admin) {
  const report = expectStatus(await request(user, 'GET', `/payroll/runs/${run.id}/unassigned`), 200)
  return expectStatus(await request(user, 'POST', `/payroll/runs/${run.id}/unassigned-ack`, { reportHash: report.reportHash }), 201)
}

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
  // لحاق الإقلاع (بعد 30 و60 ثانية) مهمتان خلفيتان لا علاقة لهما بالمسير؛ تعطيلهما يجعل مقارنة عدد الصفوف في كل الجداول حتمية.
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  branchA = await repo('Branch').save({ code: 'RDEF_A', name: 'فرع القاهرة' })
  branchB = await repo('Branch').save({ code: 'RDEF_B', name: 'فرع الجيزة' })
  const user = (label, role, branchId, permissions) => repo('User').save({ email: `${label}@run-definition-test.invalid`, displayName: label,
    passwordHash: 'test-only', role, branchId, permissions: JSON.stringify(permissions) })
  admin = await user('admin', 'super_admin', null, [])
  hrA = await user('hr-a', 'hr_manager', branchA.id, ['payroll.view', 'payroll.calculate', 'payroll.approve', 'payroll.cancel'])
  officerA = await user('officer-a', 'payroll_officer', branchA.id, ['payroll.view', 'payroll.calculate'])
  viewer = await user('viewer-a', 'hr_manager', branchA.id, ['payroll.view'])
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '23' }, { key: 'payroll.monthly_days', value: '30' }, { key: 'payroll.daily_hours', value: '8' },
    // راتب الملف في الوضع الانتقالي؛ اختيار راتب الشهر من السجل مغطى في payroll-run-salary-period.integration.cjs.
    { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' }, { key: 'payroll.late_deduction_enabled', value: 'true' },
    { key: 'attendance.absence_penalty_days', value: '1' }, { key: 'attendance.weekend_days', value: 'FRI,SAT' },
  ])
  // الخطوة 22 (B5): المستخدم نفسه يحتسب ويعتمد في هذه المجموعة — رخصة الشركة الصغيرة الموثقة (فصل المهام مختبر في payroll-run-screen)
  await require('./fixtures/payroll-small-company-approval.cjs').allowSmallCompanyApproval(repo)
  policyOne = await publishedPolicy('مجموعة القاهرة')
  policyTwo = await publishedPolicy('مجموعة الإدارة العليا')
  unpublishedVersionId = expectStatus(await request(admin, 'POST', '/payroll/policies', { name: 'مسودة سياسة غير منشورة', effectiveFrom: startDate, settings: cycle23 }), 201).versions[0].id
}, { timeout: 120000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assertDisposable()
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const remaining = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(remaining.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.match(path.basename(uploads), /^hr-run-definition-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Run definition fixture cleanup failed')
})

test('Step 16 acceptance: two drafts for the same branch and month under two policy sets, period from the policy cycle, unique name per month, new run separate from recalculation', async () => {
  const unit = await org(branchA)
  const e1 = await employee(unit), e2 = await employee(unit), e3 = await employee(unit)
  const scope = { branchIds: [branchA.id], departmentIds: [unit.department.id] }
  const first = await createDraft({ name: 'مسير فرع القاهرة — أغسطس', policyVersionId: policyOne.versionId, period, filters: scope,
    exclusions: [{ employeeId: e3.id, reason: 'يُصرف في مسير المجموعة الثانية' }] })
  assert.deepEqual([first.status, first.startDate, first.endDate, first.policyVersionId, first.policyId], ['DRAFT', startDate, endDate, policyOne.versionId, policyOne.policyId])
  assert.deepEqual([first.members.length, first.items.length, first.snapshotVersion], [0, 0, 0])
  assert.deepEqual([first.selection.mode, first.selection.filters.branchIds, first.selection.exclusions.map(row => [row.employeeId, row.reason])],
    ['FILTERS', [branchA.id], [[e3.id, 'يُصرف في مسير المجموعة الثانية']]])
  assert.equal(first.policyVersion.versionId, policyOne.versionId)
  const second = await createDraft({ name: 'مسير المجموعة الثانية — أغسطس', policyVersionId: policyTwo.versionId, period, filters: { ...scope, employeeIds: [e3.id] } })
  assert.deepEqual([second.status, second.selection.mode, second.policyVersionId, second.startDate, second.endDate], ['DRAFT', 'FILTERED_LIST', policyTwo.versionId, startDate, endDate])

  const counts = await tableCounts()
  const duplicate = expectStatus(await request(admin, 'POST', '/payroll/runs', { name: '  مسير فرع القاهرة — أغسطس ', policyVersionId: policyTwo.versionId, period, filters: scope }), 409)
  assert.equal(duplicate.code, 'PAYRUN-NAME-DUPLICATE'); assert.match(duplicate.message, /مسير فرع القاهرة — أغسطس/)
  assert.deepEqual(await tableCounts(), counts, 'a refused duplicate name writes nothing')
  // الفهرس الفريد في القاعدة نفسها، لا فحص الخدمة وحده.
  await assert.rejects(repo('PayrollRun').insert({ name: first.name, period, startDate, endDate, scopeType: 'BRANCH', status: 'CALCULATED', totalNet: 0, snapshotVersion: 0 }),
    error => /UX_payroll_run_period_name/.test(String(error.message)))
  const september = await createDraft({ name: first.name, policyVersionId: policyOne.versionId, period: '2026-09', filters: scope })
  assert.deepEqual([september.startDate, september.endDate], ['2026-08-23', '2026-09-22'])
  expectStatus(await request(admin, 'POST', `/payroll/runs/${september.id}/cancel`, { reason: 'مسودة للتحقق من تحرير الاسم' }), 201)
  const reused = await createDraft({ name: first.name, policyVersionId: policyOne.versionId, period: '2026-09', filters: scope })
  expectStatus(await request(admin, 'POST', `/payroll/runs/${reused.id}/cancel`, { reason: 'تنظيف مسودة الاختبار' }), 201)

  expectStatus(await request(admin, 'POST', `/payroll/runs/${first.id}/recalculate`, { reason: 'المسودة لم تُحتسب بعد' }), 400)
  const calculated = await calculateDraft(first)
  assert.deepEqual([calculated.status, calculated.snapshotVersion], ['CALCULATED', 1])
  assert.deepEqual([memberOf(calculated, e1).membershipStatus, memberOf(calculated, e2).membershipStatus], ['INCLUDED', 'INCLUDED'])
  const excluded = memberOf(calculated, e3)
  assert.deepEqual([excluded.membershipStatus, excluded.exclusionReason, excluded.snapshot.manualReason], ['EXCLUDED', 'EXC_MANUAL_EXCLUSION', 'يُصرف في مسير المجموعة الثانية'])
  assert.deepEqual(calculated.items.map(item => item.employeeId).sort((a, b) => a - b), [e1.id, e2.id].sort((a, b) => a - b))
  expectStatus(await request(admin, 'POST', `/payroll/runs/${first.id}/calculate`, {}), 400)
  expectStatus(await request(admin, 'POST', `/payroll/runs/${first.id}/recalculate`, {}), 400)
  const other = await calculateDraft(second)
  assert.deepEqual(other.members.map(row => [row.employeeId, row.membershipStatus]), [[e3.id, 'INCLUDED']])
  assert.equal(other.conflicts.length, 0, 'the two runs of the same branch and month do not overlap in membership')
  const recalculated = expectStatus(await request(admin, 'POST', `/payroll/runs/${first.id}/recalculate`, { reason: 'إعادة حساب بعد مراجعة الحضور' }), 201)
  assert.equal(recalculated.snapshotVersion, 2)
  const events = expectStatus(await request(admin, 'GET', `/payroll/runs/${first.id}/events`), 200)
  assert.deepEqual(events.map(row => row.eventType), ['DRAFT_CREATED', 'CALCULATED', 'RECALCULATED'])
  const sameMonth = await repo('PayrollRun').find({ where: { period, status: 'CALCULATED' } })
  assert.deepEqual(sameMonth.filter(row => [first.id, second.id].includes(row.id)).map(row => row.policyVersionId).sort((a, b) => a - b),
    [policyOne.versionId, policyTwo.versionId].sort((a, b) => a - b))
})

test('Step 16 acceptance: membership follows the organisation on the last day; a transferred employee is recorded TRANSFERRED_OUT in the old run', async () => {
  const { appendEmployeeOrgCalendar } = require('../src/attendance/attendance-calendar-history')
  const cairo = await org(branchA), giza = await org(branchB)
  const mover = await employee(cairo), stayer = await employee(cairo)
  const old = await calculateDraft(await createDraft({ name: 'مسير قسم النقل — أغسطس', policyVersionId: policyOne.versionId, period,
    filters: { branchIds: [branchA.id], departmentIds: [cairo.department.id] } }))
  assert.equal(memberOf(old, mover).membershipStatus, 'INCLUDED')
  // نقل منفذ بسريان داخل الفترة: ملف الموظف الجديد + نسخة فرع مؤرخة + حركة النقل (ما يكتبه تنفيذ النقل نفسه).
  await ds.transaction(async em => {
    await em.getRepository('Employee').update({ id: mover.id }, { branchId: branchB.id, departmentId: giza.department.id, teamId: giza.team.id })
    await appendEmployeeOrgCalendar(em, { employeeId: mover.id, beforeBranchId: branchA.id, branchId: branchB.id, effectiveFrom: '2026-08-10',
      reason: 'نقل معتمد لاختبار العضوية', actorUserId: admin.id })
    await em.getRepository('Transfer').save({ employeeId: mover.id, fromTeam: cairo.team.id, toTeam: giza.team.id, effectiveDate: '2026-08-10', status: 'EXECUTED', executedAt: new Date() })
  })
  const recalculated = expectStatus(await request(admin, 'POST', `/payroll/runs/${old.id}/recalculate`, { reason: 'انتقال موظف خارج القسم' }), 201)
  const moved = memberOf(recalculated, mover)
  assert.deepEqual([moved.membershipStatus, moved.exclusionReason, moved.snapshot.branchId, moved.snapshot.departmentId],
    ['EXCLUDED', 'TRANSFERRED_OUT', branchA.id, cairo.department.id], 'the old run keeps his in-scope organisation and records why he left')
  assert.deepEqual([moved.snapshot.transferredOut.lastInScopeDate, moved.snapshot.transferredOut.branchId, moved.snapshot.transferredOut.departmentId],
    ['2026-08-09', branchB.id, giza.department.id])
  assert.equal(memberOf(recalculated, stayer).membershipStatus, 'INCLUDED')
  assert.ok(!recalculated.items.some(item => item.employeeId === mover.id))
  const events = expectStatus(await request(admin, 'GET', `/payroll/runs/${old.id}/events`), 200)
  assert.deepEqual(events.at(-1).payload.diff.removedEmployeeIds, [mover.id])

  const gizaPreview = expectStatus(await request(admin, 'POST', '/payroll/runs/membership-preview', { policyVersionId: policyTwo.versionId, period,
    filters: { branchIds: [branchB.id], departmentIds: [giza.department.id] } }), 201)
  const joined = gizaPreview.included.find(row => row.employeeId === mover.id)
  assert.ok(joined, JSON.stringify(gizaPreview.excluded))
  assert.deepEqual([joined.branchId, joined.departmentId, joined.orgDate, joined.draftConflicts.length], [branchB.id, giza.department.id, endDate, 0])
  const oldPreview = expectStatus(await request(admin, 'POST', '/payroll/runs/membership-preview', { policyVersionId: policyOne.versionId, period,
    filters: { branchIds: [branchA.id], departmentIds: [cairo.department.id] } }), 201)
  const out = oldPreview.excluded.find(row => row.employeeId === mover.id)
  assert.deepEqual([out.code, out.transferredOut.lastInScopeDate], ['TRANSFERRED_OUT', '2026-08-09'])
})

test('Step 16 acceptance: an empty scope is refused unless confirmed with a reason; unknown list ids are refused with the id; exclusions need a reason; filters must be linked', async () => {
  const unit = await org(branchA), otherUnit = await org(branchB)
  const worker = await employee(unit)
  const emptyTeam = await repo('Team').save({ name: 'فريق بلا موظفين', departmentId: unit.department.id, isActive: true })
  const base = { policyVersionId: policyOne.versionId, period }
  const before = await tableCounts()
  const empty = expectStatus(await request(admin, 'POST', '/payroll/runs', { ...base, name: 'نطاق فارغ', filters: { branchIds: [branchA.id], teamIds: [emptyTeam.id] } }), 400)
  assert.equal(empty.code, 'PAYRUN-SCOPE-EMPTY')
  assert.equal(expectStatus(await request(admin, 'POST', '/payroll/runs', { ...base, name: 'نطاق فارغ', filters: { branchIds: [branchA.id], teamIds: [emptyTeam.id] }, confirmEmptyScope: true }), 400).code,
    'PAYRUN-SCOPE-EMPTY-REASON')
  const unknown = expectStatus(await request(admin, 'POST', '/payroll/runs', { ...base, name: 'قائمة برقم غير موجود', filters: { employeeIds: [worker.id, 987654] } }), 400)
  assert.equal(unknown.code, 'PAYRUN-SCOPE-UNKNOWN-IDS'); assert.match(unknown.message, /987654/); assert.deepEqual(unknown.employeeIds, [987654])
  assert.match(expectStatus(await request(admin, 'POST', '/payroll/runs', { ...base, name: 'فرع غير موجود', filters: { branchIds: [876543] } }), 400).message, /876543/)
  assert.equal(expectStatus(await request(admin, 'POST', '/payroll/runs', { ...base, name: 'فريق من فرع آخر', filters: { branchIds: [branchA.id], teamIds: [otherUnit.team.id] } }), 400).code,
    'PAYRUN-FILTER-UNLINKED')
  assert.equal(expectStatus(await request(admin, 'POST', '/payroll/runs', { ...base, name: 'استبعاد بلا سبب', filters: { branchIds: [branchA.id], departmentIds: [unit.department.id] },
    exclusions: [{ employeeId: worker.id, reason: '  ' }] }), 400).code, 'PAYRUN-EXCLUSION-REASON')
  expectStatus(await request(admin, 'POST', '/payroll/runs', { ...base, name: 'استبعاد بلا حقل سبب', filters: { branchIds: [branchA.id] }, exclusions: [{ employeeId: worker.id }] }), 400)
  assert.equal(expectStatus(await request(admin, 'POST', '/payroll/runs', { ...base, name: 'بلا نطاق', filters: {} }), 400).code, 'PAYRUN-SCOPE-REQUIRED')
  assert.equal(expectStatus(await request(admin, 'POST', '/payroll/runs', { ...base, policyVersionId: unpublishedVersionId, name: 'نسخة غير منشورة', filters: { branchIds: [branchA.id] } }), 400).code,
    'PAYRUN-POLICY-NOT-PUBLISHED')
  assert.equal(expectStatus(await request(admin, 'POST', '/payroll/runs', { ...base, period: '2026-07', name: 'قبل سريان السياسة', filters: { branchIds: [branchA.id] } }), 400).code,
    'PAYRUN-POLICY-PERIOD')
  expectStatus(await request(officerA, 'POST', '/payroll/runs', { ...base, name: 'فرع خارج النطاق', filters: { branchIds: [branchB.id] } }), 403)
  expectStatus(await request(viewer, 'POST', '/payroll/runs', { ...base, name: 'بلا صلاحية حساب', filters: { branchIds: [branchA.id] } }), 403)
  assert.deepEqual(await tableCounts(), before, 'refused definitions must not write anything')

  const confirmed = await createDraft({ ...base, name: 'نطاق فارغ مؤكد', filters: { branchIds: [branchA.id], teamIds: [emptyTeam.id] }, confirmEmptyScope: true,
    emptyScopeReason: 'فريق جديد يبدأ الشهر القادم' })
  assert.equal(confirmed.selection.emptyScope.reason, 'فريق جديد يبدأ الشهر القادم')
  assert.equal((await calculateDraft(confirmed)).members.length, 0)
  // مستخدم الفرع: نطاقه يُحصر بفرعه تلقائيًا، والتعديل مسموح في المسودة فقط.
  const officerDraft = await createDraft({ ...base, name: 'مسودة موظف الرواتب', filters: { departmentIds: [unit.department.id] } }, officerA)
  assert.deepEqual(officerDraft.selection.filters.branchIds, [branchA.id])
  const updated = expectStatus(await request(officerA, 'PATCH', `/payroll/runs/${officerDraft.id}`, { exclusions: [{ employeeId: worker.id, reason: 'إجازة بدون راتب طويلة' }] }), 200)
  assert.deepEqual(updated.selection.exclusions.map(row => [row.employeeId, row.reason]), [[worker.id, 'إجازة بدون راتب طويلة']])
  assert.equal(updated.selection.exclusions[0].byUserId, officerA.id)
  await calculateDraft(updated, officerA)
  assert.equal(expectStatus(await request(officerA, 'PATCH', `/payroll/runs/${officerDraft.id}`, { name: 'اسم بعد الحساب' }), 400).code, 'PAYRUN-STATE-001')
})

test('Step 17 acceptance: the membership preview is read-only with codes, coverage, factor and the 30-day basis; an employee in an approved run is excluded instead of stopping the run', async () => {
  const unit = await org(branchA)
  const regular = await employee(unit)
  const joiner = await employee(unit, { joinDate: '2026-08-08' })
  const unpaid = await employee(unit, { basicSalary: 0 })
  const booked = await employee(unit)
  const broken = await employee(unit, { status: 'terminated', isActive: false })
  const archived = await employee(unit, { status: 'archived', isActive: false })
  const approvedRun = await calculateDraft(await createDraft({ name: 'مسير الإدارة العليا — أغسطس', policyVersionId: policyTwo.versionId, period, filters: { employeeIds: [booked.id] } }))
  await acknowledge(approvedRun)
  assert.equal(expectStatus(await request(admin, 'POST', `/payroll/runs/${approvedRun.id}/approve`), 201).status, 'APPROVED')

  const definition = { policyVersionId: policyOne.versionId, period, filters: { branchIds: [branchA.id], departmentIds: [unit.department.id] } }
  const before = await tableCounts()
  const preview = expectStatus(await request(admin, 'POST', '/payroll/runs/membership-preview', definition), 201)
  const again = expectStatus(await request(admin, 'POST', '/payroll/runs/membership-preview', definition), 201)
  const report = expectStatus(await request(admin, 'GET', `/payroll/unassigned-report?period=${period}`), 200)
  assert.deepEqual(await tableCounts(), before, 'the preview and the report must leave every table row count unchanged')
  assert.equal(again.previewHash, preview.previewHash)
  assert.equal(preview.readOnly, true)
  assert.deepEqual(preview.basis, { monthlyDays: 30, dayBasis: 'FIXED_30' })
  assert.deepEqual([preview.run.startDate, preview.run.endDate, preview.run.policy.versionId], [startDate, endDate, policyOne.versionId])
  const included = id => preview.included.find(row => row.employeeId === id)
  const excluded = id => preview.excluded.find(row => row.employeeId === id)
  assert.deepEqual([included(regular.id).coverDays, included(regular.id).prorataFactor, included(regular.id).partial, included(regular.id).monthlyGross, included(regular.id).earnedGross],
    [31, 1, false, 6000, 6000])
  assert.deepEqual([included(joiner.id).coverFrom, included(joiner.id).coverDays, included(joiner.id).prorataFactor, included(joiner.id).earnedGross, included(joiner.id).monthlyDays, included(joiner.id).dayBasis],
    ['2026-08-08', 15, 0.5, 3000, 30, 'FIXED_30'])
  assert.equal(excluded(unpaid.id).code, 'NO_SALARY_DEFINED')
  assert.deepEqual([excluded(booked.id).code, excluded(booked.id).otherRun.otherRunId, excluded(booked.id).otherRun.status], ['EXC_ALREADY_IN_RUN', approvedRun.id, 'APPROVED'])
  assert.equal(excluded(broken.id).code, 'EXC_EMPLOYMENT_DATA_INVALID'); assert.ok(excluded(broken.id).dataProblem); assert.match(excluded(broken.id).message, new RegExp(broken.employeeCode))
  assert.equal(excluded(archived.id).code, 'ARCHIVED')
  assert.equal(preview.totals.candidates, 6); assert.equal(preview.totals.included + preview.totals.excluded, 6)
  assert.deepEqual([preview.totals.partial, preview.totals.alreadyInRun, preview.totals.dataProblems], [1, 1, 1])
  assert.ok(preview.excluded.every(row => row.code), 'every excluded row carries a code')
  assert.ok(report.rows.some(row => row.employeeId === broken.id && row.reasonCode === 'DATA_PROBLEM'))

  // مشكلة بيانات تمنع الحساب برسالة فيها رقم الموظف حتى تُصحح أو يُستبعد بسبب مكتوب.
  const draft = await createDraft({ ...definition, name: 'مسودة فيها مشكلة بيانات' })
  const blockedCounts = await tableCounts()
  assert.match(expectStatus(await request(admin, 'POST', `/payroll/runs/${draft.id}/calculate`, {}), 400).message, new RegExp(broken.employeeCode))
  assert.deepEqual(await tableCounts(), blockedCounts)
  const fixed = expectStatus(await request(admin, 'PATCH', `/payroll/runs/${draft.id}`, { exclusions: [{ employeeId: broken.id, reason: 'تاريخ آخر يوم عمل ناقص — يُصحح ويُصرف في مسير تكميلي' }] }), 200)
  const storedCounts = await tableCounts()
  const stored = expectStatus(await request(admin, 'GET', `/payroll/runs/${fixed.id}/membership-preview`), 200)
  assert.deepEqual(await tableCounts(), storedCounts)
  assert.equal(stored.excluded.find(row => row.employeeId === broken.id).code, 'EXC_MANUAL_EXCLUSION')
  const calculated = await calculateDraft(fixed)
  const bookedMember = memberOf(calculated, booked)
  assert.deepEqual([bookedMember.membershipStatus, bookedMember.exclusionReason, bookedMember.snapshot.alreadyInRun.otherRunId], ['EXCLUDED', 'EXC_ALREADY_IN_RUN', approvedRun.id])
  assert.deepEqual(calculated.items.map(item => item.employeeId).sort((a, b) => a - b), [regular.id, joiner.id].sort((a, b) => a - b))
  assert.equal(memberOf(calculated, joiner).snapshot.prorataFactor, 0.5)
  assert.equal(memberOf(calculated, unpaid).exclusionReason, 'NO_SALARY_DEFINED')
  const claims = await repo('PayrollPeriodClaim').find({ where: { employeeId: booked.id, releasedAt: IsNull() } })
  assert.deepEqual(claims.map(row => row.runId), [approvedRun.id], 'the approved run keeps the only claim')
})

test('Step 18 acceptance: approval is refused until someone acknowledges the unassigned report; every employee without a run appears with a reason', async () => {
  const unit = await org(branchB), outside = await org(branchB)
  const paid = await employee(unit), skipped = await employee(unit), forgotten = await employee(outside)
  const run = await calculateDraft(await createDraft({ name: 'مسير فرع الجيزة — أغسطس', policyVersionId: policyOne.versionId, period,
    filters: { branchIds: [branchB.id], departmentIds: [unit.department.id] }, exclusions: [{ employeeId: skipped.id, reason: 'تسوية نهاية خدمة منفصلة' }] }))
  let report = expectStatus(await request(admin, 'GET', `/payroll/runs/${run.id}/unassigned`), 200)
  const row = id => report.rows.find(item => item.employeeId === id)
  assert.equal(row(paid.id), undefined)
  assert.deepEqual([row(skipped.id).reasonCode, row(skipped.id).runs[0].runId, row(skipped.id).runs[0].exclusionReason], ['EXCLUDED_IN_RUN', run.id, 'EXC_MANUAL_EXCLUSION'])
  assert.match(row(skipped.id).reasonText, /مسير فرع الجيزة — أغسطس/)
  assert.deepEqual([row(forgotten.id).reasonCode, row(forgotten.id).coverDays], ['OUT_OF_ALL_RUNS', 31])
  assert.ok(report.rows.every(item => item.reasonCode && item.reasonText))
  assert.equal(report.totals.employed, report.totals.assigned + report.totals.unassigned)
  assert.deepEqual([report.acknowledgement.required, report.acknowledgement.current, report.acknowledgement.canAcknowledge], [true, null, true])

  // الخطوة 20 (B4): أسباب تقرير التكافؤ تُكتب صراحة قبل لقطة العدّ، فالاعتماد المرفوض بعدها يبقى لا يكتب شيئًا
  await writeParityReasonsBeforeApproval(request, admin, 'POST', `/payroll/runs/${run.id}/approve`)
  const counts = await tableCounts()
  assert.equal(expectStatus(await request(admin, 'POST', `/payroll/runs/${run.id}/approve`), 409).code, 'PAYRUN-UNASSIGNED-ACK-REQUIRED')
  expectStatus(await request(viewer, 'POST', `/payroll/runs/${run.id}/unassigned-ack`, { reportHash: report.reportHash }), 403)
  expectStatus(await request(hrA, 'POST', `/payroll/runs/${run.id}/unassigned-ack`, { reportHash: report.reportHash }), 403)
  assert.equal(expectStatus(await request(admin, 'POST', `/payroll/runs/${run.id}/unassigned-ack`, { reportHash: '0'.repeat(64) }), 409).code, 'PAYRUN-UNASSIGNED-STALE')
  assert.deepEqual(await tableCounts(), counts, 'refused approvals and acknowledgements write nothing')
  assert.equal((await repo('PayrollRun').findOneByOrFail({ id: run.id })).status, 'CALCULATED')

  report = expectStatus(await request(admin, 'POST', `/payroll/runs/${run.id}/unassigned-ack`, { reportHash: report.reportHash, note: 'الموظف المنسي يُضاف لمسير تكميلي' }), 201)
  assert.equal(report.acknowledgement.current.note, 'الموظف المنسي يُضاف لمسير تكميلي')
  // موظف جديد على رأس العمل بلا مسير بعد الإقرار يُسقطه.
  const late = await employee(outside)
  assert.equal(expectStatus(await request(admin, 'POST', `/payroll/runs/${run.id}/approve`), 409).code, 'PAYRUN-UNASSIGNED-ACK-STALE')
  report = expectStatus(await request(admin, 'GET', `/payroll/runs/${run.id}/unassigned`), 200)
  assert.equal(report.acknowledgement.stale, true)
  assert.ok(report.rows.some(item => item.employeeId === late.id && item.reasonCode === 'OUT_OF_ALL_RUNS'))
  await acknowledge(run)
  assert.equal(expectStatus(await request(admin, 'POST', `/payroll/runs/${run.id}/approve`), 201).status, 'APPROVED')
  const events = expectStatus(await request(admin, 'GET', `/payroll/runs/${run.id}/events`), 200)
  const acks = await repo('PayrollRunUnassignedAck').find({ where: { runId: run.id }, order: { id: 'ASC' } })
  assert.equal(acks.length, 2)
  assert.equal(events.find(item => item.eventType === 'APPROVED').payload.unassignedAckId, acks[1].id)
  assert.equal(events.filter(item => item.eventType === 'UNASSIGNED_ACKNOWLEDGED').length, 2)

  // إقرار مستخدم فرع لا يغطي معتمدًا على مستوى الشركة، وإعادة الحساب تُسقط الإقرار.
  const own = await org(branchA)
  await employee(own)
  const branchRun = await calculateDraft(await createDraft({ name: 'مسير قسم فرعي — أغسطس', policyVersionId: policyOne.versionId, period, filters: { departmentIds: [own.department.id] } }, hrA), hrA)
  await acknowledge(branchRun, hrA)
  assert.equal(expectStatus(await request(admin, 'POST', `/payroll/runs/${branchRun.id}/approve`), 409).code, 'PAYRUN-UNASSIGNED-ACK-REQUIRED')
  expectStatus(await request(hrA, 'POST', `/payroll/runs/${branchRun.id}/recalculate`, { reason: 'إعادة حساب بعد الإقرار' }), 201)
  assert.equal(expectStatus(await request(hrA, 'POST', `/payroll/runs/${branchRun.id}/approve`), 409).code, 'PAYRUN-UNASSIGNED-ACK-REQUIRED')
  await acknowledge(branchRun, hrA)
  assert.equal(expectStatus(await request(hrA, 'POST', `/payroll/runs/${branchRun.id}/approve`), 201).status, 'APPROVED')
})

test('Review fixes: a branch-owned policy stays inside its branch; a branch user cannot probe ids of another branch; the recalculation reason has an Arabic code; a draft re-checks its policy when calculated', async () => {
  const unitA = await org(branchA), unitB = await org(branchB)
  const inA = await employee(unitA), inB = await employee(unitB)
  const branchPolicy = await publishedPolicy('مجموعة فرع القاهرة فقط', { branchId: branchA.id })
  const owned = { policyVersionId: branchPolicy.versionId, period }
  const counts = await tableCounts()
  const outside = expectStatus(await request(admin, 'POST', '/payroll/runs/membership-preview', { ...owned, filters: { branchIds: [branchB.id] } }), 400)
  assert.equal(outside.code, 'PAYRUN-POLICY-BRANCH'); assert.match(outside.message, /فرع القاهرة/)
  for (const filters of [{ allEmployees: true }, { branchIds: [branchA.id, branchB.id] }, { departmentIds: [unitB.department.id] }, { employeeIds: [inB.id] }]) {
    assert.equal(expectStatus(await request(admin, 'POST', '/payroll/runs/membership-preview', { ...owned, filters }), 400).code, 'PAYRUN-POLICY-BRANCH', JSON.stringify(filters))
  }
  assert.equal(expectStatus(await request(admin, 'POST', '/payroll/runs', { ...owned, name: 'سياسة فرع على فرع آخر', filters: { branchIds: [branchB.id] } }), 400).code, 'PAYRUN-POLICY-BRANCH')
  assert.deepEqual(await tableCounts(), counts, 'refused branch-policy definitions write nothing')
  const inside = expectStatus(await request(admin, 'POST', '/payroll/runs/membership-preview', { ...owned, filters: { branchIds: [branchA.id], departmentIds: [unitA.department.id] } }), 201)
  assert.deepEqual(inside.included.map(row => row.employeeId), [inA.id])
  const ownDraft = await createDraft({ ...owned, name: 'مسودة سياسة فرع القاهرة', filters: { branchIds: [branchA.id], departmentIds: [unitA.department.id] } })
  expectStatus(await request(admin, 'PATCH', `/payroll/runs/${ownDraft.id}`, { filters: { branchIds: [branchB.id] } }), 400)

  // مستخدم فرع القاهرة: معرّف من فرع الجيزة يُرد مثل المعرّف غير الموجود (لا 201 بنطاق فارغ، ولا اسم قسم في الرسالة).
  const probe = { policyVersionId: policyOne.versionId, period }
  const missing = expectStatus(await request(officerA, 'POST', '/payroll/runs/membership-preview', { ...probe, filters: { employeeIds: [987650] } }), 400)
  const foreign = expectStatus(await request(officerA, 'POST', '/payroll/runs/membership-preview', { ...probe, filters: { employeeIds: [inB.id] } }), 400)
  assert.deepEqual([missing.code, foreign.code], ['PAYRUN-SCOPE-UNKNOWN-IDS', 'PAYRUN-SCOPE-UNKNOWN-IDS'])
  assert.equal(foreign.message.replace(String(inB.id), '#'), missing.message.replace('987650', '#'), 'another branch employee gets exactly the missing-id answer')
  assert.deepEqual(foreign.employeeIds, [inB.id])
  const foreignDepartment = expectStatus(await request(officerA, 'POST', '/payroll/runs', { ...probe, name: 'قسم فرع آخر', filters: { departmentIds: [unitB.department.id] } }), 400)
  assert.equal(foreignDepartment.code, 'PAYRUN-SCOPE-UNKNOWN-IDS'); assert.ok(!foreignDepartment.message.includes(unitB.department.name), foreignDepartment.message)
  const foreignTeam = expectStatus(await request(officerA, 'POST', '/payroll/runs/membership-preview', { ...probe, filters: { teamIds: [unitB.team.id] } }), 400)
  assert.equal(foreignTeam.code, 'PAYRUN-SCOPE-UNKNOWN-IDS'); assert.ok(!foreignTeam.message.includes(unitB.team.name), foreignTeam.message)
  assert.equal(expectStatus(await request(officerA, 'POST', '/payroll/runs/membership-preview', { ...probe, filters: { departmentIds: [unitA.department.id] },
    exclusions: [{ employeeId: inB.id, reason: 'استبعاد موظف من فرع آخر' }] }), 400).code, 'PAYRUN-SCOPE-UNKNOWN-IDS')
  assert.ok(expectStatus(await request(officerA, 'POST', '/payroll/runs/membership-preview', { ...probe, filters: { employeeIds: [inA.id] } }), 201).included.some(row => row.employeeId === inA.id))
  expectStatus(await request(admin, 'POST', '/payroll/runs/membership-preview', { ...probe, filters: { employeeIds: [inB.id] } }), 201)
  // من له نسخة فرع مؤرخة في فرع القاهرة (انتقل منه) معروف لمستخدم الفرع.
  const { appendEmployeeOrgCalendar } = require('../src/attendance/attendance-calendar-history')
  const leaver = await employee(unitB)
  await ds.transaction(async em => appendEmployeeOrgCalendar(em, { employeeId: leaver.id, beforeBranchId: branchA.id, branchId: branchB.id, effectiveFrom: '2026-08-15',
    reason: 'انتقال سابق من فرع القاهرة', actorUserId: admin.id }))
  const leaverPreview = expectStatus(await request(officerA, 'POST', '/payroll/runs/membership-preview', { ...probe, filters: { employeeIds: [leaver.id] } }), 201)
  const leaverRow = leaverPreview.excluded.find(row => row.employeeId === leaver.id)
  assert.deepEqual([leaverRow?.code, leaverRow?.transferredOut?.lastInScopeDate], ['TRANSFERRED_OUT', '2026-08-14'], JSON.stringify(leaverPreview.excluded))

  // إعادة الحساب بلا سبب أو بسبب غير نصي: كود عربي موحد، لا رسالة class-validator.
  const run = await calculateDraft(await createDraft({ name: 'مسير سبب إعادة الحساب', ...probe, filters: { branchIds: [branchA.id], departmentIds: [unitA.department.id] } }))
  for (const body of [{}, { reason: 5 }, { reason: '   ' }]) {
    const refused = expectStatus(await request(admin, 'POST', `/payroll/runs/${run.id}/recalculate`, body), 400)
    assert.equal(refused.code, 'PAYRUN-REASON-001', JSON.stringify(body)); assert.match(refused.message, /سبب/); assert.doesNotMatch(String(refused.message), /must be/)
  }

  // المسودة تُراجع نسختها عند الاحتساب: أرشفة السياسة بعد حفظ المسودة تمنع احتسابها بلا أي كتابة.
  const policyDetail = expectStatus(await request(admin, 'GET', `/payroll/policies/${branchPolicy.policyId}`), 200)
  expectStatus(await request(admin, 'POST', `/payroll/policies/${branchPolicy.policyId}/archive`, { expectedRevision: policyDetail.policy.revision, reason: 'أرشفة بعد حفظ مسودة مرتبطة' }), 201)
  const beforeCalculate = await tableCounts()
  assert.equal(expectStatus(await request(admin, 'POST', `/payroll/runs/${ownDraft.id}/calculate`, {}), 400).code, 'PAYRUN-POLICY-NOT-PUBLISHED')
  assert.deepEqual(await tableCounts(), beforeCalculate, 'a refused draft calculation writes nothing')
  assert.equal((await repo('PayrollRun').findOneByOrFail({ id: ownDraft.id })).status, 'DRAFT')
})

test('Review fixes: a department/team edit from the employee file (no transfer) does not move the employee in past periods', async () => {
  const oldUnit = await org(branchA), newUnit = await org(branchA)
  const editor = await employee(oldUnit)
  expectStatus(await request(admin, 'PATCH', `/employees/${editor.id}`, { departmentId: newUnit.department.id, teamId: newUnit.team.id }), 200)
  const logged = await repo('EmployeeStatusHistory').find({ where: { employeeId: editor.id } })
  assert.deepEqual(logged.filter(row => ['departmentId', 'teamId'].includes(row.fieldName)).map(row => row.fieldName).sort(), ['departmentId', 'teamId'])
  const base = { policyVersionId: policyOne.versionId }
  // أغسطس انتهى قبل التعديل: عضويته بالقسم القديم.
  const august = expectStatus(await request(admin, 'POST', '/payroll/runs/membership-preview', { ...base, period, filters: { branchIds: [branchA.id], departmentIds: [oldUnit.department.id] } }), 201)
  const kept = august.included.find(row => row.employeeId === editor.id)
  assert.ok(kept, JSON.stringify(august.excluded))
  assert.deepEqual([kept.departmentId, kept.teamId], [oldUnit.department.id, oldUnit.team.id])
  const augustNew = expectStatus(await request(admin, 'POST', '/payroll/runs/membership-preview', { ...base, period, filters: { branchIds: [branchA.id], departmentIds: [newUnit.department.id] } }), 201)
  assert.ok(![...augustNew.included, ...augustNew.excluded].some(row => row.employeeId === editor.id), 'the new department does not claim him for a past period')
  // الشهر الذي فيه يوم التعديل (نهايته بعده): عضويته بالقسم الجديد.
  const today = new Date()
  const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const current = localToday.slice(8) >= '23' ? new Date(today.getFullYear(), today.getMonth() + 1, 1) : today
  const currentPeriod = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`
  const now = expectStatus(await request(admin, 'POST', '/payroll/runs/membership-preview', { ...base, period: currentPeriod, filters: { branchIds: [branchA.id], departmentIds: [newUnit.department.id] } }), 201)
  const moved = [...now.included, ...now.excluded].find(row => row.employeeId === editor.id)
  assert.ok(moved, JSON.stringify(now.totals))
  assert.equal(moved.departmentId, newUnit.department.id)
})
