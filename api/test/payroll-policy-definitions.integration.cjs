// اختبارات تخزين تعريف السياسة كاملًا ومعاملاته وشرائحه، بقاعدة SQL عشوائية معزولة ودون أي احتساب مالي.
const { test, before, after, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_payroll_policy_definitions_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-policy-definitions-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const endpoint = '/payroll/policies'
let app, ds, master, base, created = false, sequence = 0, canary
let admin, managerA, managerB, starA, unassigned, viewerA, noPermission
let branchA, branchB, departmentA, departmentB, teamA, teamB, employeeA, employeeB, costCenter, inactiveCostCenter
const definitionTables = ['payroll_policy_components', 'payroll_policy_parameters', 'payroll_tier_sets', 'payroll_policy_tiers']
const definitionEntities = ['PayrollPolicyComponent', 'PayrollPolicyParameter', 'PayrollTierSet', 'PayrollPolicyTier']
function component(code, extra = {}) {
  return { code, nameAr: `بند ${code}`, componentType: 'EARNING', stage: 1, sequence: 1, valueSource: 'FIXED',
    conditionFormula: null, unit: 'CURRENCY', prorationMode: 'NONE', amount: '100.00', fieldPath: null,
    missingFieldBehavior: null, varCode: null, multiplier: null, percent: null, baseCode: null, tierSetCode: null,
    formula: null, ledgerCategory: null, ledgerDirection: null, ledgerPartialPayment: null, minAmount: null,
    maxAmount: null, capPctOfBase: null, capBaseCode: null, roundingMode: null, roundingScale: null,
    deductionPriority: null, carryOverEligible: false, rollupTo: null, exemptible: true, showOnPayslip: true,
    isActive: true, ...extra }
}
function netComponent() {
  return component('NET', { componentType: 'INFO', stage: 6, valueSource: 'SYS_NET', amount: null, exemptible: false })
}
function tier(sequence, fromValue, toValue, extra = {}) {
  return { sequence, fromValue, toValue, method: 'RATE_1_1', multiplier: null, dayFraction: null,
    fixedAmount: null, formula: null, label: `شريحة ${sequence}`, isActive: true, ...extra }
}
function tierSet(code = 'LATE_SET', extra = {}) {
  return { code, nameAr: 'طقم تأخير الاختبار', description: 'شرائح صريحة بدون أثر مالي', inputVar: 'LATE_MINUTES', inputFormula: null,
    inputUnit: 'MINUTES', applicationBasis: 'PER_DAY', tierApplicationMode: 'WHOLE', graceMode: 'NONE', graceMinutes: 0,
    graceMaxUsesPerPeriod: null, allowGraceOnFlexibleShift: false, allowShiftGraceOverride: false,
    noMatchBehavior: 'NO_DEDUCTION', maxDailyDeductionDayFraction: '1.0000', maxPeriodDeductionDayFraction: null,
    secondsRoundingMode: 'FLOOR', minutesRoundingMode: 'FLOOR', roundingUnitMinutes: 1, roundingMode: null, roundingScale: null,
    isActive: true, tiers: [tier(10, '0', '60'), tier(20, '60', null, { method: 'MULTIPLIER', multiplier: '1.500' })], ...extra }
}
function wholeDefinition() {
  return { parameters: [{ code: 'FACTOR', nameAr: 'معامل صريح', value: '1.250000', unit: 'SCALAR', isActive: true }],
    tierSets: [tierSet()], components: [
      component('FIXED_PAY', { sequence: 1 }),
      component('HOUSING_PAY', { sequence: 2, valueSource: 'EMPLOYEE_FIELD', amount: null, fieldPath: 'housingAllowance', missingFieldBehavior: 'ZERO' }),
      component('PERCENT_PAY', { sequence: 3, valueSource: 'PERCENT_OF', amount: null, percent: '12.3456', baseCode: 'COMP[FIXED_PAY]' }),
      component('OT_PAY', { stage: 2, sequence: 1, valueSource: 'SYSTEM_VAR', amount: null, varCode: 'OT_AMOUNT' }),
      component('FORMULA_PAY', { stage: 2, sequence: 2, valueSource: 'FORMULA', amount: null, formula: 'COMP[PERCENT_PAY] * PARAM[FACTOR]',
        conditionFormula: 'BASE_SALARY >= 0', minAmount: '0.29', maxAmount: '1234.56', capPctOfBase: '20.1234', capBaseCode: 'GROSS_SALARY',
        roundingMode: 'HALF_EVEN', roundingScale: 4 }),
      component('EXTERNAL_PAY', { stage: 2, sequence: 3, valueSource: 'EXTERNAL', amount: null }),
      component('LATE_DED', { componentType: 'DEDUCTION', stage: 3, sequence: 1, valueSource: 'TIERED', amount: null, tierSetCode: 'LATE_SET', deductionPriority: 1, carryOverEligible: true }),
      component('LEDGER_DED', { componentType: 'DEDUCTION', stage: 5, sequence: 1, valueSource: 'LEDGER', amount: null,
        ledgerCategory: '*', ledgerDirection: 'DEBIT', ledgerPartialPayment: 'ALLOW_PARTIAL', deductionPriority: 2 }),
      netComponent(),
    ] }
}
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, canonical(child)]))
  if (typeof value === 'string' && /^-?\d+\.\d+$/.test(value)) return value.replace(/0+$/, '').replace(/\.$/, '')
  return value
}

function assertDisposable() {
  assert.match(database, /^hr_payroll_policy_definitions_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
function repo(name) { assertDisposable(); return ds.getRepository(name) }
function plain(value) { return JSON.parse(JSON.stringify(value)) }
function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null,
    employeeId: user.employeeId ?? null, tokenVersion: user.tokenVersion ?? 0,
    permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json',
    ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
function expectStatus(response, status) { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
function definition(overrides = {}) {
  return { code: `PL01_${++sequence}`, name: `سياسة اختبار ${sequence}`, effectiveFrom: '2026-07-01',
    metadata: { title: 'مسودة الموارد البشرية', notes: 'بيانات وصفية بلا محرك مالي' }, ...overrides }
}
async function create(overrides = {}, user = admin) {
  return expectStatus(await request(user, 'POST', endpoint, definition(overrides)), 201)
}
async function detail(id, user = admin) { return expectStatus(await request(user, 'GET', `${endpoint}/${id}`), 200) }
async function events(id, user = admin) {
  const result = expectStatus(await request(user, 'GET', `${endpoint}/${id}/events`), 200)
  assert.ok(Array.isArray(result), JSON.stringify(result))
  return result
}
async function policySnapshot() {
  const result = {}
  for (const name of ['PayrollPolicy', 'PayrollPolicyVersion', 'PayrollPolicyEvent']) {
    result[name] = plain(await repo(name).find({ order: { id: 'ASC' } }))
  }
  for (const table of definitionTables) result[table] = await rawRows(table)
  return result
}
async function rawRows(table, versionId) {
  assertDisposable()
  assert.match(table, /^payroll_[a-z_]+$/)
  // JSON يكوّنه SQL ويظل نصًا: لا نمرر DECIMAL كبيرًا عبر Number أثناء مقارنة التاريخ.
  const filter = versionId == null ? '' : table === 'payroll_policy_tiers'
    ? 'WHERE [tierSetId] IN (SELECT [id] FROM [payroll_tier_sets] WHERE [versionId]=@0)' : 'WHERE [versionId] = @0'
  const result = await ds.query(`SELECT (SELECT * FROM [${table}] ${filter}
    ORDER BY [id] FOR JSON PATH, INCLUDE_NULL_VALUES) AS [snapshot]`, versionId == null ? [] : [versionId])
  return result[0].snapshot
}
function definitionRoute(policyId, versionId) { return `${endpoint}/${policyId}/versions/${versionId}/definition` }
async function readDefinition(policyId, versionId, actor = admin) {
  return request(actor, 'GET', definitionRoute(policyId, versionId))
}
async function validateDefinition(policyId, versionId, definition, extra = {}, actor = admin) {
  return request(actor, 'POST', `${definitionRoute(policyId, versionId)}/validate`, { definition, ...extra })
}
async function saveDefinition(policyId, versionId, definition, extra = {}, actor = admin) {
  return request(actor, 'PATCH', definitionRoute(policyId, versionId), { expectedRevision: 1,
    reason: 'حفظ تعريف سياسة اختبار كامل', definition, ...extra })
}
async function saveValid(policyId, versionId, definition, extra = {}, actor = admin) {
  const before = await policySnapshot()
  const preview = expectStatus(await validateDefinition(policyId, versionId, definition, { autoOrder: extra.autoOrder ?? false }, actor), 200)
  assert.equal(preview.valid, true)
  assert.ok(Array.isArray(preview.requiredAcknowledgements))
  assert.deepEqual(await policySnapshot(), before, 'Validation wrote definition rows')
  return expectStatus(await saveDefinition(policyId, versionId, definition, { ...extra,
    acknowledgedWarnings: preview.requiredAcknowledgements }, actor), 200)
}
async function populated(definition = wholeDefinition(), actor = admin) {
  const initial = await create({}, actor)
  return saveValid(initial.policy.id, initial.versions[0].id, definition, {}, actor)
}
async function sourceSnapshot(versionId) {
  const result = { version: plain(await repo('PayrollPolicyVersion').findOneByOrFail({ id: versionId })) }
  for (const table of definitionTables) result[table] = await rawRows(table, versionId)
  return result
}
async function assertCopiedRelations(sourceId, targetId) {
  const sourceSets = await repo('PayrollTierSet').findBy({ versionId: sourceId })
  const targetSets = await repo('PayrollTierSet').findBy({ versionId: targetId })
  assert.equal(sourceSets.length, targetSets.length)
  const targetSetIds = new Set(targetSets.map(set => set.id))
  for (const set of sourceSets) {
    const target = targetSets.find(row => row.code === set.code)
    assert.ok(target); assert.notEqual(target.id, set.id)
  }
  for (const entity of definitionEntities) {
    const source = await childIds(entity, sourceId)
    const target = await childIds(entity, targetId)
    assert.equal(target.length, source.length, entity)
    const sourceIds = new Set(source.map(row => row.id))
    for (const row of target) {
      assert.ok(!sourceIds.has(row.id), `${entity} reused a historical identity`)
      if (row.tierSetId != null) assert.ok(targetSetIds.has(row.tierSetId), `${entity} still refers to a source tier set`)
    }
  }
}
async function childIds(entity, versionId) {
  return entity === 'PayrollPolicyTier'
    ? ds.query('SELECT t.id,t.tierSetId FROM payroll_policy_tiers t INNER JOIN payroll_tier_sets s ON s.id=t.tierSetId WHERE s.versionId=@0 ORDER BY t.id', [versionId])
    : repo(entity).findBy({ versionId })
}
async function financialSnapshot() {
  const result = {}
  // تحفظ المقارنة كل أعمدة السجلات، بما فيها نص لقطة القسيمة، وتكشف أي إدراج جانبي أيضاً.
  for (const name of ['Employee', 'PayrollRun', 'PayrollItem', 'PayrollRunMember', 'PayrollRunEvent',
    'OvertimeEntry', 'OvertimeEntryEvent', 'EmployeeObligation', 'Loan', 'LoanInstallment', 'LatenessTier']) {
    result[name] = plain(await repo(name).find({ order: { id: 'ASC' } }))
  }
  result.RequestsConfig = plain(await repo('RequestsConfig').find({ order: { key: 'ASC' } }))
  return result
}
async function concurrentBehindPolicyLock(resource, actions) {
  // نثبت وصول الطلبين إلى انتظار SQL فعلي قبل تحرير القفل، فلا يعتمد الاختبار على سرعة HTTP.
  const runner = ds.createQueryRunner()
  let pending = [], committed = false
  try {
    await runner.connect(); await runner.startTransaction()
    const [{ spid }] = await runner.query('SELECT @@SPID AS spid')
    const result = await runner.query(`DECLARE @result int;
      EXEC @result = sys.sp_getapplock @Resource = @0, @LockMode = 'Exclusive',
        @LockOwner = 'Transaction', @LockTimeout = 5000;
      SELECT @result AS lockResult;`, [`hr:payroll:policy:${resource}`])
    assert.ok(Number(result[0].lockResult) >= 0)
    pending = actions.map(action => action())
    const deadline = Date.now() + 6000
    let waiting = []
    while (Date.now() < deadline) {
      const result = await master.request().input('blocker', sql.Int, spid).input('testDatabase', sql.NVarChar, database).query(`
        WITH waiting AS (
          SELECT session_id, blocking_session_id, wait_type FROM sys.dm_exec_requests
          WHERE database_id=DB_ID(@testDatabase) AND wait_type LIKE 'LCK%'
        ), blocked AS (
          SELECT session_id, blocking_session_id, wait_type, 1 AS depth FROM waiting WHERE blocking_session_id=@blocker
          UNION ALL
          SELECT w.session_id, w.blocking_session_id, w.wait_type, b.depth+1
          FROM waiting w INNER JOIN blocked b ON w.blocking_session_id=b.session_id
        ) SELECT DISTINCT session_id, blocking_session_id, wait_type, depth FROM blocked OPTION (MAXRECURSION 20)`)
      waiting = result.recordset
      if (waiting.length >= actions.length) break
      await new Promise(resolve => setTimeout(resolve, 25))
    }
    assert.ok(waiting.length >= actions.length, `Expected ${actions.length} SQL waiters, observed ${JSON.stringify(waiting)}`)
    process.stdout.write(`# Policy SQL barrier ${actions.length} operations: ${JSON.stringify(waiting)}\n`)
    await runner.commitTransaction(); committed = true
    return await Promise.all(pending)
  } finally {
    if (!committed && runner.isTransactionActive) await runner.rollbackTransaction()
    await Promise.allSettled(pending)
    await runner.release()
  }
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433),
    user: env.DB_USERNAME, password: env.DB_PASSWORD, database: 'master',
    options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  branchA = await repo('Branch').save({ code: 'POLICY_A', name: 'فرع السياسات الأول' })
  branchB = await repo('Branch').save({ code: 'POLICY_B', name: 'فرع السياسات الثاني' })
  departmentA = await repo('Department').save({ branchId: branchA.id, name: 'قسم الفرع الأول', code: 'POLICY_DA' })
  departmentB = await repo('Department').save({ branchId: branchB.id, name: 'قسم الفرع الثاني', code: 'POLICY_DB' })
  teamA = await repo('Team').save({ departmentId: departmentA.id, name: 'فريق الفرع الأول', code: 'POLICY_TA' })
  teamB = await repo('Team').save({ departmentId: departmentB.id, name: 'فريق الفرع الثاني', code: 'POLICY_TB' })
  costCenter = await repo('CostCenter').save({ code: 'POLICY_CC', name: 'مركز تكلفة عام', isActive: true })
  inactiveCostCenter = await repo('CostCenter').save({ code: 'POLICY_CC_OFF', name: 'مركز تكلفة متوقف', isActive: false })
  const user = (label, role, branchId = null, permissions = []) => repo('User').save({ email: `${label}@policy-test.invalid`,
    displayName: label, passwordHash: 'test-only', role, branchId, permissions: JSON.stringify(permissions) })
  admin = await user('admin', 'super_admin')
  const permissions = ['payroll.view', 'payroll.calculate', 'payroll.policy.manage']
  managerA = await user('manager-a', 'hr_manager', branchA.id, permissions)
  managerB = await user('manager-b', 'hr_manager', branchB.id, permissions)
  starA = await user('star-a', 'hr_manager', branchA.id, ['*'])
  unassigned = await user('unassigned', 'hr_manager', null, ['*'])
  viewerA = await user('viewer-a', 'hr_manager', branchA.id, ['payroll.view'])
  noPermission = await user('no-permission', 'hr_manager', branchA.id, [])
  const employee = (code, branchId, departmentId, teamId) => repo('Employee').save({ employeeCode: code, fullName: code,
    branchId, departmentId, teamId, joinDate: '2020-01-01', basicSalary: 9000, housingAllowance: 0,
    transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0,
    status: 'active', isActive: true, payMethod: 'cash' })
  employeeA = await employee('POLICY_CANARY_A', branchA.id, departmentA.id, teamA.id)
  employeeB = await employee('POLICY_CANARY_B', branchB.id, departmentB.id, teamB.id)
  const run = await repo('PayrollRun').save({ name: 'مسير مصروف يجب ألا يتغير', branchId: branchA.id,
    scopeType: 'BRANCH', scopeIds: JSON.stringify([branchA.id]), employeeIds: JSON.stringify([employeeA.id]),
    policyId: null, period: '2026-07', startDate: '2026-07-01', endDate: '2026-07-31', status: 'PAID',
    totalNet: 9084.38, approvedBy: admin.id, approvedAt: new Date('2026-08-01T08:00:00Z'),
    paidAt: new Date('2026-08-01T09:00:00Z'), snapshotVersion: 0 })
  const overtime = await repo('OvertimeEntry').save({ employeeId: employeeA.id, date: '2026-07-08',
    source: 'PRE_REQUESTED', status: 'PAID', hoursRequested: 1.5, hoursActual: 1.5, payableHours: 1.5,
    rate: 1.5, payrollRunId: run.id })
  await repo('PayrollItem').save({ runId: run.id, employeeId: employeeA.id, basicSalary: 9000, allowances: 0,
    overtimeHours: 1.5, overtimeAmount: 84.38, netPay: 9084.38, payMethod: 'cash',
    breakdown: JSON.stringify({ canary: 'يجب حفظ هذا النص كما هو', overtimeEntryIds: [overtime.id], monthlyDays: 30 }) })
  await repo('LatenessTier').save({ fromMinutes: 1, toMinutes: null, mode: 'MINUTES', value: 0, isActive: true, label: 'شريحة قديمة لا يغيرها تخزين التعريف الجديد' })
  canary = await financialSnapshot()
}, { timeout: 60000 })

afterEach(async () => { if (canary) assert.deepEqual(await financialSnapshot(), canary, 'Policy operation mutated financial source rows') })
after(async t => {
  const errors = []
  try { if (canary) assert.deepEqual(await financialSnapshot(), canary) } catch (error) { errors.push(error) }
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
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir()))
    assert.match(path.basename(uploads), /^hr-payroll-policy-definitions-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
    assert.equal(fs.existsSync(uploads), false)
    t.diagnostic('Cleanup verified: the temporary uploads directory was removed.')
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Policy fixture cleanup failed')
})

test('PL-03: empty historical definition remains MISSING without fabricated catalog, engine or system component', async () => {
  const initial = await create(), policyId = initial.policy.id, versionId = initial.versions[0].id
  const snapshot = await policySnapshot()
  const read = expectStatus(await readDefinition(policyId, versionId), 200)
  assert.equal(read.definitionStatus, 'MISSING')
  assert.equal(read.catalogVersion, null)
  assert.equal(read.engineVersion, null)
  assert.deepEqual(read.definition, { parameters: [], tierSets: [], components: [] })
  assert.deepEqual(await policySnapshot(), snapshot)
  const changed = expectStatus(await request(admin, 'PATCH', `${endpoint}/${policyId}/versions/${versionId}`, {
    expectedRevision: 1, reason: 'تعديل عنوان قديم فقط', metadata: { title: 'لم نعرّف أي بنود بعد' } }), 200)
  assert.equal(changed.version.catalogVersion, null)
  assert.equal(changed.version.engineVersion, null)
  const copied = expectStatus(await request(admin, 'POST', `${endpoint}/${policyId}/versions`, {
    expectedRevision: 2, sourceVersionId: versionId, reason: 'استنساخ تعريف قديم فارغ' }), 201)
  const copy = expectStatus(await readDefinition(policyId, copied.version.id), 200)
  assert.equal(copy.definitionStatus, 'MISSING')
  assert.equal(copy.catalogVersion, null)
  assert.equal(copy.engineVersion, null)
  assert.deepEqual(copy.definition, read.definition)
})

test('PL-03: full definition saves all eight sources, parameters and tiers atomically and freezes catalog markers', async () => {
  const desired = wholeDefinition(), saved = await populated(desired)
  assert.equal(saved.editKind, 'UPDATED')
  assert.equal(saved.definitionStatus, 'COMPLETE')
  assert.equal(saved.version.revision, 2)
  assert.equal(saved.catalogVersion, 'SRS_V1_20260913')
  assert.equal(typeof saved.engineVersion, 'string')
  assert.ok(saved.engineVersion.length > 0)
  const read = expectStatus(await readDefinition(saved.policyId, saved.versionId), 200)
  assert.deepEqual(canonical(read.definition), canonical(desired))
  assert.deepEqual(canonical(saved.definition), canonical(desired))
  assert.deepEqual(new Set(read.definition.components.map(row => row.valueSource)),
    new Set(['FIXED', 'EMPLOYEE_FIELD', 'PERCENT_OF', 'SYSTEM_VAR', 'FORMULA', 'EXTERNAL', 'TIERED', 'LEDGER', 'SYS_NET']))
  const stored = await repo('PayrollPolicyVersion').findOneByOrFail({ id: saved.versionId })
  assert.equal(stored.catalogVersion, saved.catalogVersion)
  assert.equal(stored.engineVersion, saved.engineVersion)
  assert.equal((await repo('PayrollPolicy').findOneByOrFail({ id: saved.policyId })).revision, 1)
  const event = (await events(saved.policyId)).find(row => row.reason === 'حفظ تعريف سياسة اختبار كامل')
  assert.ok(event)
  assert.equal(event.actorUserId, admin.id)
  for (const marker of ['FIXED_PAY', 'LEDGER_DED', 'LATE_SET', 'FACTOR']) assert.ok(JSON.stringify(event.payload).includes(marker))
})

test('PL-03: SQL decimal storage and HTTP round trips preserve monetary cents and six-place values beyond Number precision', async () => {
  const desired = wholeDefinition()
  desired.components[0].amount = '9007199254740991.91'
  desired.parameters[0].value = '90071992547.409991'
  const currencySet = tierSet('CURRENCY_SET', { inputVar: 'BONUS_TOTAL', inputUnit: 'CURRENCY', applicationBasis: 'PERIOD_ACCUMULATED',
    maxDailyDeductionDayFraction: null, tiers: [tier(10, '0', '90071992547.409991', { method: 'NONE' }),
      tier(20, '90071992547.409991', null, { method: 'NONE' })] })
  desired.tierSets.push(currencySet)
  const saved = await populated(desired)
  const read = expectStatus(await readDefinition(saved.policyId, saved.versionId), 200)
  assert.equal(read.definition.components.find(row => row.code === 'FIXED_PAY').amount, '9007199254740991.91')
  assert.equal(read.definition.parameters[0].value, '90071992547.409991')
  assert.equal(read.definition.tierSets.find(row => row.code === 'CURRENCY_SET').tiers[0].toValue, '90071992547.409991')
  const [money] = await ds.query('SELECT CAST(amount AS nvarchar(60)) AS amount FROM payroll_policy_components WHERE versionId=@0 AND code=@1', [saved.versionId, 'FIXED_PAY'])
  assert.equal(money.amount, '9007199254740991.91')
  const [parameter] = await ds.query('SELECT CAST(value AS nvarchar(60)) AS value FROM payroll_policy_parameters WHERE versionId=@0 AND code=@1', [saved.versionId, 'FACTOR'])
  assert.equal(parameter.value, '90071992547.409991')
})

test('PL-03: replacing a complete draft persists only the new full collection and preserves financial sources', async () => {
  const saved = await populated(), desired = wholeDefinition()
  desired.components = desired.components.filter(row => row.code !== 'EXTERNAL_PAY')
  desired.components[0].nameAr = 'مبلغ ثابت بعد الاستبدال'
  desired.components[0].amount = '0.29'
  desired.parameters[0].value = '2.000001'
  const updated = await saveValid(saved.policyId, saved.versionId, desired, { expectedRevision: 2 })
  assert.equal(updated.editKind, 'UPDATED')
  assert.equal(updated.versionId, saved.versionId)
  assert.equal(updated.version.revision, 3)
  assert.deepEqual(canonical(updated.definition), canonical(desired))
  assert.equal(await repo('PayrollPolicyComponent').countBy({ versionId: saved.versionId, code: 'EXTERNAL_PAY' }), 0)
  assert.equal(await repo('PayrollPolicyParameter').countBy({ versionId: saved.versionId }), 1)
  assert.equal(await repo('PayrollTierSet').countBy({ versionId: saved.versionId }), 1)
  assert.equal((await childIds('PayrollPolicyTier', saved.versionId)).length, 2)
})

test('PL-03: branch/global ownership and genuine JWT permissions separate read validation from definition writes', async () => {
  const global = await create(), own = await create({}, managerA), foreign = await create({}, managerB)
  const desired = wholeDefinition(), snapshot = await policySnapshot()
  expectStatus(await readDefinition(own.policy.id, own.versions[0].id, null), 401)
  expectStatus(await readDefinition(own.policy.id, own.versions[0].id, noPermission), 403)
  expectStatus(await readDefinition(own.policy.id, own.versions[0].id, viewerA), 200)
  for (const actor of [managerA, starA]) {
    expectStatus(await readDefinition(global.policy.id, global.versions[0].id, actor), 200)
    expectStatus(await readDefinition(foreign.policy.id, foreign.versions[0].id, actor), 403)
    expectStatus(await validateDefinition(global.policy.id, global.versions[0].id, desired, {}, actor), 200)
    expectStatus(await validateDefinition(foreign.policy.id, foreign.versions[0].id, desired, {}, actor), 403)
    expectStatus(await saveDefinition(global.policy.id, global.versions[0].id, desired, {}, actor), 403)
    expectStatus(await saveDefinition(foreign.policy.id, foreign.versions[0].id, desired, {}, actor), 403)
  }
  expectStatus(await validateDefinition(own.policy.id, own.versions[0].id, desired, {}, viewerA), 403)
  expectStatus(await saveDefinition(own.policy.id, own.versions[0].id, desired, {}, viewerA), 403)
  expectStatus(await readDefinition(global.policy.id, global.versions[0].id, unassigned), 403)
  expectStatus(await readDefinition(own.policy.id, foreign.versions[0].id), 404)
  expectStatus(await saveDefinition(own.policy.id, foreign.versions[0].id, desired), 404)
  assert.deepEqual(await policySnapshot(), snapshot)
  const saved = await saveValid(own.policy.id, own.versions[0].id, desired, {}, starA)
  assert.equal(saved.definitionStatus, 'COMPLETE')
})

test('PL-03: forged fields, partial collection, irrelevant source fields and invalid exact decimals reject before any replacement', async () => {
  const saved = await populated(), snapshot = await policySnapshot()
  const mutations = [
    definition => { delete definition.parameters },
    definition => { definition.components[0].id = 999 },
    definition => { definition.components[0].versionId = saved.versionId },
    definition => { definition.tierSets[0].id = 999 },
    definition => { definition.tierSets[0].tiers[0].tierSetId = 999 },
    definition => { definition.parameters[0].createdBy = managerB.id },
    definition => { definition.components[0].amount = 100 },
    definition => { definition.components[0].amount = '0.001' },
    definition => { definition.components[0].amount = '10000000000000000.00' },
    definition => { definition.parameters[0].value = '1.0000001' },
    definition => { definition.components[0].fieldPath = 'nationalId' },
    definition => { definition.components.find(row => row.valueSource === 'EMPLOYEE_FIELD').fieldPath = 'iban' },
    definition => { definition.components[0].dependencies = [] },
    definition => { definition.components[0].valueSource = 'SCRIPT' },
    definition => { definition.components.find(row => row.code === 'NET').formula = '1' },
  ]
  for (const mutate of mutations) {
    const definition = wholeDefinition(); mutate(definition)
    expectStatus(await validateDefinition(saved.policyId, saved.versionId, definition), 400)
    expectStatus(await saveDefinition(saved.policyId, saved.versionId, definition, { expectedRevision: 2 }), 400)
    assert.deepEqual(await policySnapshot(), snapshot)
  }
  for (const field of [{ revision: 99 }, { catalogVersion: 'FORGED' }, { engineVersion: 'FORGED' }, { status: 'ACTIVE' }]) {
    expectStatus(await saveDefinition(saved.policyId, saved.versionId, wholeDefinition(), { expectedRevision: 2, ...field }), 400)
  }
  assert.deepEqual(await policySnapshot(), snapshot)
})

test('PL-03 and LT-04: gaps, overlap, missing open end and disabling a required tier reject the whole snapshot', async () => {
  const saved = await populated(), snapshot = await policySnapshot()
  for (const mutate of [
    tiers => { tiers[1].fromValue = '62' },
    tiers => { tiers[1].fromValue = '50' },
    tiers => { tiers[1].toValue = '120' },
    tiers => { tiers[0].toValue = null },
    tiers => { tiers[1].isActive = false },
    tiers => { tiers[0].fromValue = '0.5' },
    tiers => { tiers[1].multiplier = '0' },
  ]) {
    const definition = wholeDefinition(); mutate(definition.tierSets[0].tiers)
    expectStatus(await validateDefinition(saved.policyId, saved.versionId, definition), 400)
    expectStatus(await saveDefinition(saved.policyId, saved.versionId, definition, { expectedRevision: 2 }), 400)
    assert.deepEqual(await policySnapshot(), snapshot)
  }
})

test('PL-03: concurrent full replacements serialize by version revision and emit only the winning definition event', async () => {
  const saved = await populated(), versionId = saved.versionId
  const beforeEvents = await events(saved.policyId)
  const candidates = ['111.11', '222.22'].map(amount => { const definition = wholeDefinition(); definition.components[0].amount = amount; return definition })
  const responses = await concurrentBehindPolicyLock(saved.policyId, candidates.map((definition, index) => () => saveDefinition(saved.policyId, versionId,
    definition, { expectedRevision: 2, reason: `تعريف متزامن ${index}` })))
  assert.deepEqual(responses.map(result => result.status).sort(), [200, 409], JSON.stringify(responses))
  const winner = responses.find(result => result.status === 200).body
  const read = expectStatus(await readDefinition(saved.policyId, versionId), 200)
  assert.equal(read.revision, 3)
  assert.deepEqual(read.definition, winner.definition)
  const afterEvents = await events(saved.policyId)
  assert.equal(afterEvents.length, beforeEvents.length + 1)
  assert.equal(afterEvents.filter(event => event.reason?.startsWith('تعريف متزامن')).length, 1)
})

test('LT-04: a decreasing bracket requires current hashed acknowledgements and records the accepted warning with the reason', async () => {
  const initial = await create(), policyId = initial.policy.id, versionId = initial.versions[0].id, definition = wholeDefinition()
  definition.tierSets[0].tiers = [tier(10, '0', '120', { method: 'MULTIPLIER', multiplier: '1.500' }),
    tier(20, '120', null, { method: 'DAY_FRACTION', dayFraction: '0.2500' })]
  const before = await policySnapshot()
  const preview = expectStatus(await validateDefinition(policyId, versionId, definition), 200)
  assert.ok(preview.warnings.some(warning => warning.code === 'TIER_MONOTONIC_DECREASE'), JSON.stringify(preview))
  assert.ok(preview.requiredAcknowledgements.length > 0)
  for (const id of preview.requiredAcknowledgements) assert.match(id, /^[a-f0-9]{64}$/)
  const missing = expectStatus(await saveDefinition(policyId, versionId, definition), 409)
  assert.equal(missing.code, 'POLICY_DEFINITION_ACKNOWLEDGEMENT_REQUIRED')
  assert.deepEqual(await policySnapshot(), before)
  const reason = 'أقر صراحة بتحذير تناقص الخصم في تعريف الاختبار'
  const saved = expectStatus(await saveDefinition(policyId, versionId, definition,
    { reason, acknowledgedWarnings: preview.requiredAcknowledgements }), 200)
  assert.deepEqual(saved.acknowledgedWarnings, preview.requiredAcknowledgements)
  assert.equal(saved.definitionStatus, 'COMPLETE')
  assert.equal(expectStatus(await readDefinition(policyId, versionId), 200).definitionStatus, 'COMPLETE')
  const event = (await events(policyId)).find(row => row.reason === reason)
  assert.ok(event)
  for (const id of preview.requiredAcknowledgements) assert.ok(JSON.stringify(event.payload).includes(id))
  const changed = plain(definition); changed.tierSets[0].tiers[1].dayFraction = '0.2000'
  const newer = expectStatus(await validateDefinition(policyId, versionId, changed), 200)
  assert.notDeepEqual(newer.requiredAcknowledgements, preview.requiredAcknowledgements)
  const snapshot = await policySnapshot()
  const stale = expectStatus(await saveDefinition(policyId, versionId, changed, { expectedRevision: 2, acknowledgedWarnings: preview.requiredAcknowledgements }), 409)
  assert.equal(stale.code, 'POLICY_DEFINITION_ACKNOWLEDGEMENT_REQUIRED')
  assert.deepEqual(await policySnapshot(), snapshot)
})

test('PL-03: explicit full settings and full definition initialize a missing legacy draft in one atomic revision', async () => {
  const initial = await create(), policyId = initial.policy.id, versionId = initial.versions[0].id
  const keys = ['defaultPeriodType', 'cycleStartDay', 'cycleEndMode', 'cycleEndDay', 'baseDaysBasis', 'monthlyDays', 'dailyHours',
    'rateBase', 'roundingMode', 'roundingScale', 'divisionByZeroMode', 'maxDeductionPctOfGross', 'minNetGuarantee', 'netFloorPct',
    'carryOverExcess', 'skipAttendance', 'lateDeductionEnabled', 'currency']
  const settings = Object.fromEntries(keys.map(key => [key, initial.versions[0][key]]))
  await repo('PayrollPolicyVersion').update(versionId, Object.fromEntries(keys.map(key => [key, null])))
  const before = await policySnapshot(), invalid = wholeDefinition(); invalid.components.pop()
  expectStatus(await saveDefinition(policyId, versionId, invalid, { settings }), 400)
  assert.deepEqual(await policySnapshot(), before)
  const definition = wholeDefinition()
  const preview = expectStatus(await validateDefinition(policyId, versionId, definition, { settings }), 200)
  assert.deepEqual(await policySnapshot(), before)
  const saved = expectStatus(await saveDefinition(policyId, versionId, definition,
    { settings, acknowledgedWarnings: preview.requiredAcknowledgements }), 200)
  assert.equal(saved.version.revision, 2)
  assert.equal(saved.version.settingsStatus, 'COMPLETE')
  assert.equal(saved.definitionStatus, 'COMPLETE')
  for (const key of keys) assert.deepEqual(saved.version[key], settings[key], key)
  assert.deepEqual(canonical(saved.definition), canonical(definition))
})

test('LT-04: settings may remove a prior warning, but reintroducing it requires candidate preview and atomic acknowledged save', async () => {
  const definition = wholeDefinition()
  definition.tierSets[0].tiers = [tier(10, '0', '120', { method: 'MULTIPLIER', multiplier: '1.500' }),
    tier(20, '120', null, { method: 'DAY_FRACTION', dayFraction: '0.2500' })]
  const saved = await populated(definition)
  assert.ok(saved.acknowledgedWarnings.length > 0)
  const noWarning = expectStatus(await request(admin, 'PATCH', `${endpoint}/${saved.policyId}/versions/${saved.versionId}`, {
    expectedRevision: 2, reason: 'زوال التناقص بعد تغيير ساعات اليوم', settings: { dailyHours: 20 } }), 200)
  assert.equal(noWarning.version.revision, 3)
  const read = expectStatus(await readDefinition(saved.policyId, saved.versionId), 200)
  assert.equal(read.definitionStatus, 'COMPLETE')
  assert.equal(read.acknowledgedWarnings.length, 0)
  const settingsEvent = (await events(saved.policyId)).find(event => event.reason === 'زوال التناقص بعد تغيير ساعات اليوم')
  assert.ok(settingsEvent)
  assert.deepEqual(settingsEvent.payload.before.definitionWarningAcknowledgements, saved.acknowledgedWarnings)
  assert.deepEqual(settingsEvent.payload.after.definitionWarningAcknowledgements, [])
  const snapshot = await policySnapshot()
  expectStatus(await request(admin, 'PATCH', `${endpoint}/${saved.policyId}/versions/${saved.versionId}`, {
    expectedRevision: 3, reason: 'يظهر تحذير جديد دون إقرار', settings: { dailyHours: 8 } }), 409)
  assert.deepEqual(await policySnapshot(), snapshot)
  const preview = expectStatus(await validateDefinition(saved.policyId, saved.versionId, definition, { settings: { dailyHours: 8 } }), 200)
  assert.ok(preview.requiredAcknowledgements.length > 0)
  assert.deepEqual(await policySnapshot(), snapshot)
  const updated = expectStatus(await saveDefinition(saved.policyId, saved.versionId, definition, {
    expectedRevision: 3, settings: { dailyHours: 8 }, acknowledgedWarnings: preview.requiredAcknowledgements,
    reason: 'اعتماد تحذير الإعدادات والتعريف معًا' }), 200)
  assert.equal(updated.version.revision, 4)
  assert.equal(updated.version.dailyHours, 8)
  assert.equal(updated.definitionStatus, 'COMPLETE')
  assert.deepEqual(updated.acknowledgedWarnings, preview.requiredAcknowledgements)
})

test('PL-03: ACTIVE, frozen and ARCHIVED saves copy all children and remap relationships without rewriting source rows', async () => {
  for (const kind of ['ACTIVE', 'FROZEN_DRAFT', 'ARCHIVED']) {
    const saved = await populated(), sourceId = saved.versionId
    await repo('PayrollPolicyVersion').update(sourceId, { status: kind === 'FROZEN_DRAFT' ? 'DRAFT' : kind,
      frozenAt: kind === 'FROZEN_DRAFT' ? new Date('2026-07-01T08:00:00Z') : null })
    const source = await sourceSnapshot(sourceId)
    const desired = wholeDefinition(); desired.components[0].amount = '123.45'
    const changed = await saveValid(saved.policyId, sourceId, desired, { expectedRevision: 2 })
    assert.equal(changed.editKind, 'CLONED')
    assert.notEqual(changed.versionId, sourceId)
    assert.equal(changed.version.versionNo, 2)
    assert.equal(changed.version.revision, 1)
    assert.equal(changed.version.status, 'DRAFT')
    assert.equal(changed.version.sourceVersionId, sourceId)
    assert.deepEqual(canonical(changed.definition), canonical(desired))
    assert.deepEqual(await sourceSnapshot(sourceId), source)
    await assertCopiedRelations(sourceId, changed.versionId)
  }
})

test('PL-03: full clone and settings copy on write preserve all definition fields, catalog markers and exact decimal strings', async () => {
  const desired = wholeDefinition(); desired.components[0].amount = '9007199254740991.91'; desired.parameters[0].value = '90071992547.409991'
  const saved = await populated(desired), sourceId = saved.versionId
  await repo('PayrollPolicyVersion').update(sourceId, { status: 'ACTIVE', frozenAt: new Date('2026-07-01T08:00:00Z') })
  const original = await sourceSnapshot(sourceId)
  const clone = expectStatus(await request(admin, 'POST', `${endpoint}/${saved.policyId}/versions`, {
    sourceVersionId: sourceId, expectedRevision: 2, reason: 'استنساخ المعاملات والشرائح والبنود كلها' }), 201)
  const copied = expectStatus(await readDefinition(saved.policyId, clone.version.id), 200)
  assert.deepEqual(canonical(copied.definition), canonical(desired))
  assert.equal(copied.catalogVersion, saved.catalogVersion)
  assert.equal(copied.engineVersion, saved.engineVersion)
  await assertCopiedRelations(sourceId, clone.version.id)
  const settings = expectStatus(await request(admin, 'PATCH', `${endpoint}/${saved.policyId}/versions/${sourceId}`, {
    expectedRevision: 2, reason: 'تغيير ساعات اليوم مع حفظ تعريف المصدر', settings: { dailyHours: 9 } }), 200)
  assert.equal(settings.editKind, 'CLONED')
  const changed = expectStatus(await readDefinition(saved.policyId, settings.version.id), 200)
  assert.deepEqual(canonical(changed.definition), canonical(desired))
  assert.equal(changed.catalogVersion, saved.catalogVersion)
  assert.equal(changed.engineVersion, saved.engineVersion)
  await assertCopiedRelations(sourceId, settings.version.id)
  assert.deepEqual(await sourceSnapshot(sourceId), original)
})

test('PL-03: settings changes revalidate stored formula rounding atomically while metadata edits retain definition children', async () => {
  const desired = wholeDefinition(); desired.components.find(row => row.code === 'FORMULA_PAY').formula = 'BASE_SALARY / ROUND(0.5, 0)'
  desired.components.find(row => row.code === 'FORMULA_PAY').roundingMode = null
  desired.components.find(row => row.code === 'FORMULA_PAY').roundingScale = null
  // ROUND(0.5, 0) = 1 بـHALF_UP (الافتراضي القديم) وصفر بـFLOOR وDOWN؛ افتراضي النسخة الجديدة بقى DOWN (قرار المالك 16 سبتمبر)
  // فالمقام صفر من البداية — لذلك النسخة تُنشأ بـHALF_UP صراحةً، والتحويل لأي نمط يصفّر المقام يُرفض ذريًا.
  const initial = await create({ settings: { roundingMode: 'HALF_UP' } })
  const saved = await saveValid(initial.policy.id, initial.versions[0].id, desired), sourceId = saved.versionId
  const before = await policySnapshot()
  for (const roundingMode of ['FLOOR', 'DOWN']) {
    const rejected = expectStatus(await request(admin, 'PATCH', `${endpoint}/${saved.policyId}/versions/${sourceId}`, {
      expectedRevision: 2, reason: 'نمط تقريب يجعل المقام صفراً', settings: { roundingMode } }), 400)
    assert.equal(rejected.code, 'CONSTANT_DIVISION_BY_ZERO', JSON.stringify(rejected))
    assert.deepEqual(await policySnapshot(), before)
  }
  const children = {}
  for (const table of definitionTables) children[table] = await rawRows(table, sourceId)
  const updated = expectStatus(await request(admin, 'PATCH', `${endpoint}/${saved.policyId}/versions/${sourceId}`, {
    expectedRevision: 2, reason: 'وصف فقط دون استبدال الأبناء', metadata: { notes: 'لم نغير أي مصدر أو شريحة' } }), 200)
  assert.equal(updated.version.revision, 3)
  for (const table of definitionTables) assert.equal(await rawRows(table, sourceId), children[table])
})

test('PL-03: audit event failure rolls back deletion and reinsertion and every new child of copy on write', async () => {
  const saved = await populated(), active = await populated()
  await repo('PayrollPolicyVersion').update(active.versionId, { status: 'ACTIVE' })
  const snapshot = await policySnapshot()
  const changed = wholeDefinition(); changed.components[0].amount = '999.99'; changed.parameters[0].value = '2.123456'
  await ds.query(`CREATE TRIGGER [TR_policy_definition_test_reject_event] ON [payroll_policy_events] AFTER INSERT AS
    BEGIN SET NOCOUNT ON; THROW 51000, 'POLICY_DEFINITION_TEST_EVENT_FAILURE', 1; END`)
  app.useLogger(false)
  try {
    for (const target of [saved, active]) {
      const result = await saveDefinition(target.policyId, target.versionId, changed, { expectedRevision: 2 })
      assert.ok(result.status >= 500, JSON.stringify(result))
      assert.deepEqual(await policySnapshot(), snapshot)
    }
    const clone = await request(admin, 'POST', `${endpoint}/${active.policyId}/versions`, {
      sourceVersionId: active.versionId, expectedRevision: 2, reason: 'فشل حدث الاستنساخ الكامل' })
    assert.ok(clone.status >= 500, JSON.stringify(clone))
    assert.deepEqual(await policySnapshot(), snapshot)
  } finally { await ds.query('DROP TRIGGER IF EXISTS [TR_policy_definition_test_reject_event]'); app.useLogger(['error']) }
})

test('PL-03: full-settings and SRS requirements reject save or preview without inventing historical settings or catalog stamps', async () => {
  for (const fields of [{ contractVersion: 'LEGACY_V1' }, { monthlyDays: null }, { monthlyDays: 29 }]) {
    const initial = await create(), policyId = initial.policy.id, versionId = initial.versions[0].id
    await repo('PayrollPolicyVersion').update(versionId, fields)
    const before = await policySnapshot()
    const read = expectStatus(await readDefinition(policyId, versionId), 200)
    assert.equal(read.definitionStatus, 'MISSING')
    expectStatus(await validateDefinition(policyId, versionId, wholeDefinition()), 409)
    expectStatus(await saveDefinition(policyId, versionId, wholeDefinition()), 409)
    assert.deepEqual(await policySnapshot(), before)
  }
})

test('PL-03: archived identity remains readable and previewable but cannot accept a replacement definition', async () => {
  const saved = await populated()
  expectStatus(await request(admin, 'POST', `${endpoint}/${saved.policyId}/archive`, { expectedRevision: 1, reason: 'حفظ تاريخ التعريف المؤرشف' }), 201)
  const before = await policySnapshot()
  const read = expectStatus(await readDefinition(saved.policyId, saved.versionId), 200)
  assert.equal(read.definitionStatus, 'COMPLETE')
  expectStatus(await validateDefinition(saved.policyId, saved.versionId, wholeDefinition()), 200)
  expectStatus(await saveDefinition(saved.policyId, saved.versionId, wholeDefinition(), { expectedRevision: 2 }), 409)
  assert.deepEqual(await policySnapshot(), before)
})

test('PL-03 and PL-06: dependencies from base, condition, tier input and parameters protect the final full collection; auto-order saves only a valid proposal', async () => {
  const saved = await populated(), before = await policySnapshot()
  const invalid = [
    definition => { definition.components.find(row => row.code === 'PERCENT_PAY').baseCode = 'COMP[FORMULA_PAY]' },
    definition => { definition.components[0].conditionFormula = 'COMP[PERCENT_PAY] > 0' },
    definition => { definition.tierSets[0].inputVar = null; definition.tierSets[0].inputFormula = 'COMP[LEDGER_DED]' },
    definition => { definition.parameters[0].isActive = false },
    definition => { definition.components = definition.components.filter(row => row.code !== 'PERCENT_PAY') },
    definition => { definition.components.find(row => row.code === 'FIXED_PAY').isActive = false },
  ]
  for (const mutate of invalid) {
    const definition = wholeDefinition(); mutate(definition)
    expectStatus(await saveDefinition(saved.policyId, saved.versionId, definition, { expectedRevision: 2, autoOrder: true }), 400)
    assert.deepEqual(await policySnapshot(), before)
  }
  const forward = wholeDefinition()
  forward.components.find(row => row.code === 'FIXED_PAY').sequence = 3
  forward.components.find(row => row.code === 'PERCENT_PAY').sequence = 1
  expectStatus(await validateDefinition(saved.policyId, saved.versionId, forward), 400)
  const preview = expectStatus(await validateDefinition(saved.policyId, saved.versionId, forward, { autoOrder: true }), 200)
  const fixed = preview.definition.components.find(row => row.code === 'FIXED_PAY')
  const percent = preview.definition.components.find(row => row.code === 'PERCENT_PAY')
  assert.ok(fixed.sequence < percent.sequence)
  assert.deepEqual(await policySnapshot(), before)
  const updated = expectStatus(await saveDefinition(saved.policyId, saved.versionId, forward,
    { expectedRevision: 2, autoOrder: true, acknowledgedWarnings: preview.requiredAcknowledgements }), 200)
  assert.deepEqual(canonical(updated.definition), canonical(preview.definition))
  assert.equal(updated.definitionStatus, 'COMPLETE')
  assert.equal(expectStatus(await readDefinition(saved.policyId, saved.versionId), 200).definitionStatus, 'COMPLETE')
})
