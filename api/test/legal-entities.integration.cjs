'use strict'
// B4.1-أ: الكيان القانوني على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر (hr_legal_entities_test_<16 hex>)، عبر HTTP بتوكنات موقّعة محليًا ومن غير كلمات مرور.
//  LE-01) الإدارة: لحساب نطاقه الشركة كلها بس؛ القيم؛ العملة عملة الدولة؛ الدولة مابتتغيّرش؛ آيبان دولة الكيان؛ الربط بكيان دولة الفرع بس؛
//         الإيقاف لكيان من غير فروع؛ النواقص والفروع غير المربوطة؛ وسطر تدقيق لكل كتابة.
//  LE-02) العملة: فرع له دولة عملته زي ما هي قبل الربط وبعده؛ فرع من غير دولة بياخد عملة كيانه؛ وتغيير دولة الفرع بيفك كيانه القديم.
//  LE-03) المسير: مسير جديد أو تعديل مسودة بيجمع كيانين مرفوض؛ مسير لكل كيان بيتعمل؛ والمسير المجمّع القايم ونسخته للشهر الجاي مابيتمنعوش
//         وبيظهر عليهم تحذير.
//  LE-04) (الجزء ب) مهمة الغياب: من غير كيان بمنطقة زمنية تشغيلة واحدة بتوقيت الخادم زي الأول؛ وكيان له منطقة «أمس» بتاعه بتوقيته وبحالته،
//         وفروعه برّه التشغيلة العامة؛ وفحص «لو متأخر» لكل مجموعة؛ ومسح المنطقة بيرجّع التشغيلة الواحدة.
// Run (من api/): node --test test/legal-entities.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_legal_entities_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_legal_entities_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-legal-entities-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/org/legal-entities')
const { readBranchCurrency } = require('../src/org/branch-currency-db')
const cycle23 = { defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 23, cycleEndMode: 'DERIVED', cycleEndDay: null }
let app, master, ds, base, created = false, employeeNumber = 0
const org = {}, users = {}, state = {}

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
const messageOf = response => [].concat(response.body?.message ?? []).join('، ')
const answer = response => [response.status, messageOf(response)]
const L = '/settings/legal-entities'
const link = (user, branchId, legalEntityId) => request(user, 'PUT', `${L}/branches/${branchId}`, { legalEntityId })
const linkOf = async branchId => (await ds.query('SELECT [legalEntityId] FROM [branches] WHERE [id] = @0', [branchId]))[0].legalEntityId
const currencies = async user => Object.fromEntries(expectStatus(await request(user, 'GET', '/settings/currency-context'), 200).branches.map(row => [row.id, row.currency]))
// تغيير دولة الفرع بيغيّر تقويمه: الأمر بتاريخ سريانه ونسخة المصدر المقروءة (C1)
async function countryChange(branchId, country, from) {
  const context = expectStatus(await request(users.admin, 'GET', `/attendance/calendar-context?scope=BRANCH&sourceId=${branchId}`), 200)
  return request(users.admin, 'PATCH', `/branches/${branchId}`, { country,
    calendarChange: { effectiveFrom: from, reason: 'تغيير دولة الفرع في اختبار الكيانات', expectedRevision: context.revision, expectedCurrentSourceHash: context.currentSourceHash } })
}
const audits = async action => (await ds.query('SELECT COUNT(*) AS [n] FROM [audit_log] WHERE [action] = @0', [action]))[0].n
async function employee(branch, department) {
  const n = ++employeeNumber
  const emp = await repo('Employee').save({ employeeCode: `LE${String(n).padStart(3, '0')}`, fullName: `موظف الكيانات ${n}`, branchId: branch.id, departmentId: department.id, joinDate: '2020-01-01',
    basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'transfer' })
  await repo('AttendanceExemption').save({ employeeId: emp.id, effectiveFrom: '2026-01-01', effectiveTo: '2027-12-31', reasonCode: 'field_role', reason: 'نافذة اختبار الكيانات المعزولة', status: 'APPROVED',
    createdByUserId: users.admin.id, approvedByUserId: users.admin.id, approvedAt: new Date('2026-01-01T08:00:00Z'), terminatedFrom: null, overtimeEligibleOverride: null, unpaidLeaveDeductibleOverride: null,
    requiresCheckinForPresence: false })
  return emp
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
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
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`

  org.riyadh = await repo('Branch').save({ code: 'LE_RUH', name: 'فرع الرياض', country: 'SA' })
  org.jeddah = await repo('Branch').save({ code: 'LE_JED', name: 'فرع جدة', country: 'SA' })
  org.cairo = await repo('Branch').save({ code: 'LE_CAI', name: 'فرع القاهرة', country: 'EG' })
  org.remote = await repo('Branch').save({ code: 'LE_REM', name: 'فرع من غير دولة' })
  org.deptRiyadh = await repo('Department').save({ name: 'قسم الرياض', branchId: org.riyadh.id, isActive: true })
  org.deptCairo = await repo('Department').save({ name: 'قسم القاهرة', branchId: org.cairo.id, isActive: true })
  const user = (label, role, branchId, permissions) => repo('User').save({ email: `${label}@legal-entities.invalid`, displayName: label, passwordHash: 'test-only', role, branchId,
    permissions: JSON.stringify(permissions), isActive: true })
  users.admin = await user('admin', 'super_admin', null, [])
  users.branchAdmin = await user('branch-admin', 'hr_manager', org.riyadh.id, ['settings.manage', 'payroll.view', 'payroll.calculate'])
  users.viewer = await user('viewer', 'hr_manager', null, ['payroll.view'])
  await repo('RequestsConfig').save([
    { key: 'system.currency', value: 'SAR' }, { key: 'payroll.cycle_start_day', value: '23' }, { key: 'payroll.monthly_days', value: '30' }, { key: 'payroll.daily_hours', value: '8' },
    { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' }, { key: 'payroll.exempt_overtime_eligible', value: 'false' }, { key: 'payroll.exempt_unpaid_leave_deductible', value: 'true' },
  ])
  const createdPolicy = expectStatus(await request(users.admin, 'POST', '/payroll/policies', { name: 'معادلة الكيانات', effectiveFrom: '2026-07-23', settings: cycle23 }), 201)
  const [draft] = createdPolicy.versions
  const published = expectStatus(await request(users.admin, 'POST', `/payroll/policies/${createdPolicy.policy.id}/versions/${draft.id}/publish`,
    { expectedRevision: draft.revision, reason: 'نشر معادلة اختبار الكيانات' }), 200)
  state.version = published.version.id
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created) {
      assertDisposable()
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  fs.rmSync(uploads, { recursive: true, force: true })
  if (errors.length) t.diagnostic(errors.map(error => error.message).join(' | '))
}, { timeout: 60000 })

test('LE-01: الإدارة — لحساب الشركة كلها بس، والقيم، والعملة عملة الدولة، والربط بكيان دولة الفرع، والإيقاف لكيان من غير فروع', async () => {
  // حساب فرع معاه صلاحية الإعدادات: بيانات الشركة مش ليه؛ ومن غير الصلاحية 403
  assert.deepEqual([(await request(users.branchAdmin, 'GET', L)).status, (await request(users.branchAdmin, 'POST', L, { name: 'كيان', country: 'SA' })).status, (await request(users.viewer, 'GET', L)).status,
    (await link(users.branchAdmin, org.riyadh.id, null)).status], [403, 403, 403, 403])
  const empty = expectStatus(await request(users.admin, 'GET', L), 200)
  assert.deepEqual([empty.available, empty.entities, empty.unlinkedBranches], [true, [], [{ id: org.riyadh.id, name: 'فرع الرياض', country: 'SA' }, { id: org.jeddah.id, name: 'فرع جدة', country: 'SA' },
    { id: org.cairo.id, name: 'فرع القاهرة', country: 'EG' }, { id: org.remote.id, name: 'فرع من غير دولة', country: null }]])

  const create = body => request(users.admin, 'POST', L, body)
  for (const [bad, message] of [[{ country: 'SA' }, rules.LEGAL_ENTITY_NAME], [{ name: 'ك', country: 'SA' }, rules.LEGAL_ENTITY_NAME], [{ name: 'كيان' }, rules.LEGAL_ENTITY_COUNTRY],
    [{ name: 'كيان', country: 'AE' }, rules.LEGAL_ENTITY_COUNTRY], [{ name: 'كيان', country: 'SA', timeZone: 'Riyadh' }, rules.LEGAL_ENTITY_TIME_ZONE],
    [{ name: 'كيان', country: 'SA', timeZone: 'Mars/Olympus' }, rules.LEGAL_ENTITY_TIME_ZONE], [{ name: 'كيان', country: 'SA', taxNumber: '1'.repeat(101) }, rules.LEGAL_ENTITY_TEXT],
    [{ name: 'كيان', country: 'SA', payrollIban: 'EG' + '1'.repeat(27) }, rules.LEGAL_ENTITY_IBAN], [{ name: 'كيان', country: 'SA', payrollIban: 'SA123' }, rules.LEGAL_ENTITY_IBAN],
    [{ name: 'كيان', country: 'SA', cycleStartDay: 29 }, rules.LEGAL_ENTITY_CYCLE_DAY], [{ name: 'كيان', country: 'SA', cycleStartDay: '5' }, rules.LEGAL_ENTITY_CYCLE_DAY]]) {
    assert.deepEqual(answer(await create(bad)), [400, message], JSON.stringify(bad))
  }
  assert.equal(await repo('LegalEntity').count(), 0)

  const iban = 'SA' + '4'.repeat(22)
  const sa = expectStatus(await create({ name: '  شركة   مهارة السعودية ', nameEn: 'Maharah KSA', country: 'sa', currency: 'EGP', timeZone: 'Asia/Riyadh', commercialRegister: '1010101010',
    payrollIban: ` sa${'4'.repeat(22)} `, cycleStartDay: 23 }), 201)
  assert.deepEqual([sa.name, sa.nameEn, sa.country, sa.currency, sa.timeZone, sa.commercialRegister, sa.payrollIban, sa.cycleStartDay, sa.isActive, sa.branches, sa.gaps],
    ['شركة مهارة السعودية', 'Maharah KSA', 'SA', 'SAR', 'Asia/Riyadh', '1010101010', iban, 23, true, [], ['الرقم الضريبي', 'رقم منشأة التأمينات', 'رقم قوى', 'رقم حماية الأجور']],
    'العملة عملة الدولة مش قيمة من العميل')
  const eg = expectStatus(await create({ name: 'شركة مهارة مصر', country: 'EG' }), 201)
  assert.deepEqual([eg.currency, eg.timeZone, eg.cycleStartDay, eg.gaps], ['EGP', null, null, ['السجل التجاري', 'الرقم الضريبي', 'رقم منشأة التأمينات', 'آيبان بنك الرواتب']])
  state.sa = sa.id; state.eg = eg.id

  // التعديل: المبعوت بس، والدولة مابتتغيّرش، والآيبان بدولة الكيان
  const patch = (id, body) => request(users.admin, 'PATCH', `${L}/${id}`, body)
  assert.deepEqual([answer(await patch(sa.id, {})), answer(await patch(sa.id, { name: 'شركة مهارة السعودية' })), answer(await patch(sa.id, { country: 'EG' })),
    answer(await patch(eg.id, { payrollIban: iban })), answer(await patch(999999, { name: 'كيان' }))],
  [[400, rules.LEGAL_ENTITY_NOTHING], [400, rules.LEGAL_ENTITY_NOTHING], [400, rules.LEGAL_ENTITY_COUNTRY_FIXED], [400, rules.LEGAL_ENTITY_IBAN], [404, rules.LEGAL_ENTITY_NOT_FOUND]])
  const edited = expectStatus(await patch(sa.id, { taxNumber: '300000000000003', insuranceNumber: '55555', qiwaNumber: '7-1234', wpsNumber: '900', timeZone: '', country: 'SA' }), 200)
  assert.deepEqual([edited.taxNumber, edited.insuranceNumber, edited.timeZone, edited.commercialRegister, edited.payrollIban, edited.currency, edited.gaps], ['300000000000003', '55555', null, '1010101010', iban, 'SAR', []])

  // الربط: كيان دولة الفرع بس؛ فرع من غير دولة بيتربط بأي كيان
  assert.deepEqual([answer(await link(users.admin, org.riyadh.id, eg.id)), answer(await link(users.admin, org.cairo.id, sa.id)), answer(await link(users.admin, 999999, sa.id)),
    answer(await link(users.admin, org.riyadh.id, 999999)), answer(await link(users.admin, org.riyadh.id, 'x'))],
  [[400, rules.LEGAL_ENTITY_BRANCH_COUNTRY], [400, rules.LEGAL_ENTITY_BRANCH_COUNTRY], [404, rules.LEGAL_ENTITY_BRANCH], [404, rules.LEGAL_ENTITY_NOT_FOUND], [404, rules.LEGAL_ENTITY_NOT_FOUND]])
  expectStatus(await link(users.admin, org.riyadh.id, sa.id), 200)
  expectStatus(await link(users.admin, org.jeddah.id, sa.id), 200)
  const linked = expectStatus(await link(users.admin, org.cairo.id, eg.id), 200)
  assert.deepEqual([linked.entities.map(row => row.branches.map(branch => branch.id)), linked.unlinkedBranches.map(row => row.id)], [[[org.riyadh.id, org.jeddah.id], [org.cairo.id]], [org.remote.id]])
  // الإيقاف: كيان مربوط بفروع مابيتوقفش؛ والموقوف مابيتربطش بيه
  assert.deepEqual(answer(await patch(eg.id, { isActive: false })), [409, rules.LEGAL_ENTITY_HAS_BRANCHES])
  const spare = expectStatus(await create({ name: 'كيان احتياطي', country: 'EG' }), 201)
  expectStatus(await patch(spare.id, { isActive: false }), 200)
  assert.deepEqual(answer(await link(users.admin, org.remote.id, spare.id)), [400, rules.LEGAL_ENTITY_INACTIVE])
  // فك الربط، وربط نفس الكيان تاني من غير سطر تدقيق زيادة
  expectStatus(await link(users.admin, org.jeddah.id, null), 200)
  assert.equal(await linkOf(org.jeddah.id), null)
  expectStatus(await link(users.admin, org.jeddah.id, sa.id), 200)
  const auditsBefore = await audits('BRANCH_LEGAL_ENTITY')
  expectStatus(await link(users.admin, org.jeddah.id, sa.id), 200)
  assert.deepEqual([await audits('BRANCH_LEGAL_ENTITY'), auditsBefore, await audits('LEGAL_ENTITY_CREATED'), await audits('LEGAL_ENTITY_UPDATED')], [auditsBefore, 5, 3, 2])
})

test('LE-02: العملة — فرع له دولة عملته زي ما هي، فرع من غير دولة بياخد عملة كيانه، وتغيير دولة الفرع بيفك كيانه القديم', async () => {
  // مربوطين بكيان دولتهم: نفس عملة الدولة؛ والفرع من غير دولة ومن غير كيان = عملة النظام
  assert.deepEqual(await currencies(users.admin), { [org.riyadh.id]: 'SAR', [org.jeddah.id]: 'SAR', [org.cairo.id]: 'EGP', [org.remote.id]: 'SAR' })
  // قرار صريح من المالك: فرع من غير دولة اتربط بكيان مصر ← عملته عملة الكيان
  expectStatus(await link(users.admin, org.remote.id, state.eg), 200)
  assert.deepEqual([(await currencies(users.admin))[org.remote.id], await readBranchCurrency(ds.manager, org.remote.id), await readBranchCurrency(ds.manager, org.riyadh.id), await readBranchCurrency(ds.manager, null)],
    ['EGP', 'EGP', 'SAR', 'SAR'])
  expectStatus(await link(users.admin, org.remote.id, null), 200)
  assert.equal((await currencies(users.admin))[org.remote.id], 'SAR')

  // دولة الفرع اتغيّرت: كيانه القديم بيتفك، وعملته تبع دولته الجديدة (زي قبل الكيانات)
  expectStatus(await countryChange(org.jeddah.id, 'EG', '2026-06-01'), 200)
  assert.deepEqual([await linkOf(org.jeddah.id), (await currencies(users.admin))[org.jeddah.id], expectStatus(await request(users.admin, 'GET', L), 200).unlinkedBranches.map(row => [row.id, row.country])],
    [null, 'EGP', [[org.jeddah.id, 'EG'], [org.remote.id, null]]])
  // تعديل تاني للفرع من غير تغيير الدولة مابيلمسش ربطه
  expectStatus(await link(users.admin, org.jeddah.id, state.eg), 200)
  expectStatus(await request(users.admin, 'PATCH', `/branches/${org.jeddah.id}`, { city: 'الجيزة' }), 200)
  assert.equal(await linkOf(org.jeddah.id), state.eg)
  expectStatus(await countryChange(org.jeddah.id, 'SA', '2026-06-02'), 200)
  assert.equal(await linkOf(org.jeddah.id), null)
  expectStatus(await link(users.admin, org.jeddah.id, state.sa), 200)
})

test('LE-03: المسير — جديد بيجمع كيانين مرفوض، مسير لكل كيان بيتعمل، والمجمّع القايم ونسخته مابيتمنعوش وعليهم تحذير', async () => {
  const eSa = await employee(org.riyadh, org.deptRiyadh), eEg = await employee(org.cairo, org.deptCairo)
  const draft = (body, user = users.admin) => request(user, 'POST', '/payroll/runs', { policyVersionId: state.version, period: '2026-08', ...body })
  const mixed = response => [response.status, response.body?.code, messageOf(response).includes('«شركة مهارة السعودية» و«شركة مهارة مصر»')]

  // مسير مجمّع قايم من قبل الربط: بنفكّ الربط، نعمله، ونرجّع الربط
  expectStatus(await link(users.admin, org.cairo.id, null), 200)
  const legacy = expectStatus(await draft({ name: 'مسير الشركة كلها', filters: { branchIds: [org.riyadh.id, org.cairo.id] } }), 201)
  assert.deepEqual(expectStatus(await request(users.admin, 'GET', '/payroll/runs/entity-warnings'), 200), { warnings: [] }, 'فرع من غير كيان مابيتحسبش')
  expectStatus(await link(users.admin, org.cairo.id, state.eg), 200)

  // جديد بيجمع كيانين: بالفروع، بالأقسام، بقايمة موظفين، وبالشركة كلها — نفس الرفض
  for (const filters of [{ branchIds: [org.riyadh.id, org.cairo.id] }, { departmentIds: [org.deptRiyadh.id, org.deptCairo.id] }, { employeeIds: [eSa.id, eEg.id] }, { allEmployees: true },
    { branchIds: [org.riyadh.id], includeEmployeeIds: [eEg.id] }]) {
    assert.deepEqual(mixed(await draft({ name: 'مسير مجمّع جديد', filters })), [400, 'PAYRUN-ENTITY-MIXED', true], JSON.stringify(filters))
  }
  assert.equal(await repo('PayrollRun').count(), 1, 'المرفوض مابيتحفظش')
  // مسير لكل كيان — وعملة كل واحد عملة كيانه
  const runSa = expectStatus(await draft({ name: 'مسير السعودية', filters: { branchIds: [org.riyadh.id, org.jeddah.id] } }), 201)
  const runEg = expectStatus(await draft({ name: 'مسير مصر', filters: { branchIds: [org.cairo.id] } }), 201)
  assert.deepEqual([await readBranchCurrency(ds.manager, org.riyadh.id), await readBranchCurrency(ds.manager, org.cairo.id)], ['SAR', 'EGP'])
  // تعديل مسودة لكيان واحد مايخلّيهاش مجمّعة؛ وتعديلها جوه كيانها بيعدّي
  assert.deepEqual(mixed(await request(users.admin, 'PATCH', `/payroll/runs/${runEg.id}`, { filters: { branchIds: [org.cairo.id, org.riyadh.id] } })), [400, 'PAYRUN-ENTITY-MIXED', true])
  expectStatus(await request(users.admin, 'PATCH', `/payroll/runs/${runSa.id}`, { filters: { branchIds: [org.riyadh.id] } }), 200)

  // المجمّع القايم: عليه تحذير، وبيتعدّل، وبيتنسخ للشهر الجاي
  const warned = expectStatus(await request(users.admin, 'GET', '/payroll/runs/entity-warnings'), 200).warnings
  assert.deepEqual(warned, [{ runId: legacy.id, name: 'مسير الشركة كلها', period: '2026-08', entities: ['شركة مهارة السعودية', 'شركة مهارة مصر'] }])
  expectStatus(await request(users.admin, 'PATCH', `/payroll/runs/${legacy.id}`, { name: 'مسير الشركة كلها (قديم)' }), 200)
  await ds.query(`UPDATE [payroll_runs] SET [status] = 'CALCULATED' WHERE [id] = @0`, [legacy.id])
  const next = expectStatus(await request(users.admin, 'POST', '/payroll/runs/create-next-period', { sourcePeriod: '2026-08' }), 201)
  assert.deepEqual(next.created.map(row => row.name).sort(), ['مسير السعودية', 'مسير الشركة كلها (قديم)', 'مسير مصر'].sort(), JSON.stringify(next.skipped))
  const later = expectStatus(await request(users.admin, 'GET', '/payroll/runs/entity-warnings'), 200).warnings
  assert.deepEqual(later.map(row => [row.name, row.period]).sort(), [['مسير الشركة كلها (قديم)', '2026-08'], ['مسير الشركة كلها (قديم)', '2026-09']])
  // حساب فرع: مسيرات نطاقه بس (ومفيش فيها مجمّع)؛ ومن غير صلاحية الرواتب 403
  assert.deepEqual([expectStatus(await request(users.branchAdmin, 'GET', '/payroll/runs/entity-warnings'), 200), (await request(users.branchAdmin, 'GET', L)).status], [{ warnings: [] }, 403])
})

test('LE-04: مهمة الغياب — تشغيلة واحدة بتوقيت الخادم من غير مناطق، وكيان له منطقة «أمس» بتاعه بتوقيته وبحالته وفروعه برّه العامة', async () => {
  const { localDateOf } = require('../src/attendance/attendance.service')
  const attendance = app.get(require('../src/attendance/attendance.service').AttendanceService)
  const KEY = 'attendance.absences_materialized_through'
  const dayBefore = ymd => { const d = new Date(`${ymd}T12:00:00`); d.setDate(d.getDate() - 1); return localDateOf(d) }
  // «أمس» في منطقة — بحساب مستقل عن الكود
  const yesterdayIn = zone => dayBefore(new Date().toLocaleDateString('en-CA', { timeZone: zone }))
  const stateOf = async key => (await repo('RequestsConfig').findOneBy({ key }))?.value ?? null
  const patchZone = (id, timeZone) => request(users.admin, 'PATCH', `${L}/${id}`, { timeZone })
  const calls = []
  const original = attendance.materializeAbsencesAll
  attendance.materializeAbsencesAll = async (from, to, scope = null, exclude = []) => { calls.push({ from, to, scope, exclude }); return { created: 0, failed: [], total: 1 } }
  try {
    // من غير كيان بمنطقة: تشغيلة واحدة للكل بتوقيت الخادم وبالحالة العامة — السلوك القايم
    const sysBefore = dayBefore(localDateOf(new Date()))
    const first = await attendance.materializeAbsencesCatchUp()
    const sysAfter = dayBefore(localDateOf(new Date()))
    assert.deepEqual([calls.length, calls[0].scope, calls[0].exclude, [sysBefore, sysAfter].includes(calls[0].to), first.to === calls[0].to, await stateOf(KEY) === calls[0].to,
      await stateOf(`${KEY}.entity.${state.sa}`), await stateOf(`${KEY}.entity.${state.eg}`)], [1, null, [], true, true, true, null, null])
    const system = calls[0].to

    // كيانين بمنطقتين بعيد عن بعض 25 ساعة: «أمس» بتاع كل واحد غير التاني دايمًا
    expectStatus(await patchZone(state.sa, 'Pacific/Kiritimati'), 200)
    expectStatus(await patchZone(state.eg, 'Pacific/Pago_Pago'), 200)
    calls.length = 0
    const ahead = [yesterdayIn('Pacific/Kiritimati')], behind = [yesterdayIn('Pacific/Pago_Pago')]
    await attendance.materializeAbsencesCatchUp()
    ahead.push(yesterdayIn('Pacific/Kiritimati')); behind.push(yesterdayIn('Pacific/Pago_Pago'))
    assert.equal(calls.length, 3)
    const [main, sa, eg] = calls
    assert.deepEqual([main.scope, main.exclude, sa.scope, sa.exclude, eg.scope, eg.exclude], [null, [org.riyadh.id, org.jeddah.id, org.cairo.id], [org.riyadh.id, org.jeddah.id], [], [org.cairo.id], []])
    assert.deepEqual([ahead.includes(sa.to), behind.includes(eg.to), sa.to > eg.to, sa.to >= main.to, main.to >= eg.to], [true, true, true, true, true], JSON.stringify([main.to, sa.to, eg.to]))
    assert.deepEqual([await stateOf(KEY), await stateOf(`${KEY}.entity.${state.sa}`), await stateOf(`${KEY}.entity.${state.eg}`)], [main.to, sa.to, eg.to], 'حالة لكل مجموعة')
    // أول تشغيل لكيان واخد منطقة بيبدأ من الحالة العامة قبل التشغيلة (مش من الأول): المدى مابيرجعش ورا أول أمس بتاعه
    assert.deepEqual([sa.from >= dayBefore(dayBefore(system)), eg.from === dayBefore(eg.to)], [true, true])

    // «لو متأخر»: كل مجموعة حالتها = أمس بتاعها ← مفيش تشغيل
    calls.length = 0
    assert.deepEqual([await attendance.materializeAbsencesCatchUp({ onlyIfBehind: true }), calls.length], [null, 0])
    // كيان حالته متأخرة لوحده: هو بس اللي بيتشغّل
    await repo('RequestsConfig').save({ key: `${KEY}.entity.${state.eg}`, value: dayBefore(dayBefore(dayBefore(eg.to))) })
    const late = await attendance.materializeAbsencesCatchUp({ onlyIfBehind: true })
    assert.deepEqual([calls.length, calls[0].scope, calls[0].from, late.to === calls[0].to, behind.concat(yesterdayIn('Pacific/Pago_Pago')).includes(calls[0].to)],
      [1, [org.cairo.id], dayBefore(dayBefore(eg.to)), true, true], 'من بعد آخر يوم مُنجز للكيان')

    // مسح المنطقة (أو إيقاف الكيان): فروعه بترجع للتشغيلة العامة
    expectStatus(await patchZone(state.sa, ''), 200)
    expectStatus(await patchZone(state.eg, null), 200)
    calls.length = 0
    await attendance.materializeAbsencesCatchUp()
    assert.deepEqual([calls.length, calls[0].scope, calls[0].exclude], [1, null, []])
  } finally {
    attendance.materializeAbsencesAll = original
  }
  // التشغيلة العامة بفروع مستبعدة: الموظفين النشطين برّه الفروع دي بس (الاستعلام الفعلي)
  const real = await attendance.materializeAbsencesAll('2020-01-01', '2020-01-01', null, [org.riyadh.id, org.jeddah.id])
  const all = await attendance.materializeAbsencesAll('2020-01-01', '2020-01-01')
  const inRiyadh = await repo('Employee').count({ where: { branchId: org.riyadh.id, isActive: true } })
  assert.deepEqual([all.total - real.total, inRiyadh > 0], [inRiyadh, true])
})
