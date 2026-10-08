'use strict'
// B5.1 (ب) على SQL حقيقي: دورة الزيادات — الترحيلات 140–142، وخطوات الدورة، وورقة المدير (مرؤوسيه المباشرين بس ومن غير أرقام راتب)،
// والمراجعة بنطاق الفروع وبسبب مكتوب، والميزانية تحذير مش منع. مفيش راتب بيتغيّر. قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const migrate = require('../scripts/db-migrate.cjs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_comp_cycles_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_comp_cycles_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-comp-cycles-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/compensation/compensation-cycles')
const MIGRATIONS = ['20261009_140_compensation_cycles.sql', '20261009_141_compensation_budgets.sql', '20261009_142_compensation_proposals.sql', '20261010_181_compensation_writers.sql']
  .map(name => path.resolve(apiRoot, '..', 'docs', 'migrations', 'payroll', name))
const TABLES = ['compensation_cycles', 'compensation_budgets', 'compensation_proposals', 'compensation_writers']
let master, pool, app, ds, base, modules, created = false, sequence = 0, cycleId
const B = {}, D = {}, E = {}, U = {}
const repo = name => { assert.match(database, NAME); assert.equal(ds.options.database, database); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token(user) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const raw = await response.text(); return { status: response.status, body: raw ? JSON.parse(raw) : null }
}
const ok = (response, status = 200) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const employee = (name, branch, department, basicSalary, manager) => repo('Employee').save({ employeeCode: 'CC' + ++sequence, fullName: name, branchId: branch.id, departmentId: department.id,
  managerEmployeeId: manager ? manager.id : null, joinDate: '2020-01-01', basicSalary, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'cash' })
const account = (label, branch, permissions, person) => repo('User').save({ email: `${label}@comp-cycles.invalid`, displayName: 'حساب ' + label, passwordHash: 'test-only', role: 'employee',
  branchId: branch ? branch.id : null, employeeId: person ? person.id : null, permissions: JSON.stringify(permissions) })
const runMigrations = async () => { assert.match(database, NAME); for (const file of MIGRATIONS) for (const batch of migrate.splitBatches(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'))) await pool.request().batch(batch) }
const tablesPresent = async () => (await pool.request().query(`SELECT COUNT(*) AS n FROM sys.tables WHERE [name] IN (${TABLES.map(name => `N'${name}'`).join(', ')})`)).recordset[0].n
const C = '/compensation/cycles'
const lineOf = (detail, person) => detail.lines.find(row => row.employeeId === person.id)
const proposals = () => repo('CompensationProposal').find({ order: { id: 'ASC' } })
const basicOf = async person => Number((await repo('Employee').findOneByOrFail({ id: person.id })).basicSalary)

before(async () => {
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  const connection = { server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD, options: { encrypt: false, trustServerCertificate: true } }
  master = await new sql.ConnectionPool({ ...connection, database: 'master' }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  // مفيش رسالة بريد حقيقية بتطلع من الاختبار
  const mail = app.get(require('../src/auth/mail.service').MailService)
  mail.isConfigured = () => false
  mail.send = async () => { throw new Error('no mail in tests') }
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1'); ds = app.get(require('../node_modules/typeorm').DataSource)
  assert.equal(ds.options.database, database)
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  pool = await new sql.ConnectionPool({ ...connection, database }).connect()
  modules = app.get(require('../src/modules-registry/modules.service').ModulesService)
  await app.get(require('../src/settings/config-defaults.service').ConfigDefaultsService).onApplicationBootstrap()
  B.riyadh = await repo('Branch').save({ code: 'CC_1', name: 'فرع الرياض', country: 'SA' })
  B.cairo = await repo('Branch').save({ code: 'CC_2', name: 'فرع القاهرة', country: 'EG' })
  D.sales = await repo('Department').save({ name: 'إدارة المبيعات', code: 'CC-S', branchId: B.riyadh.id, unitType: 'ADMINISTRATION', isActive: true })
  D.retail = await repo('Department').save({ name: 'قسم التجزئة', code: 'CC-R', branchId: B.riyadh.id, parentId: D.sales.id, unitType: 'DEPARTMENT', isActive: true })
  D.cairo = await repo('Department').save({ name: 'قسم الحسابات', code: 'CC-C', branchId: B.cairo.id, unitType: 'DEPARTMENT', isActive: true })
  E.manager = await employee('مدير التجزئة', B.riyadh, D.retail, 12000, null)
  E.first = await employee('مرؤوس أول', B.riyadh, D.retail, 5000, E.manager)
  E.second = await employee('مرؤوس تاني', B.riyadh, D.retail, 6000, E.manager)
  E.otherManager = await employee('مدير تاني', B.riyadh, D.sales, 11000, null)
  E.outsider = await employee('موظف مش في الفريق', B.riyadh, D.sales, 7000, E.otherManager)
  E.cairoManager = await employee('مدير القاهرة', B.cairo, D.cairo, 20000, null)
  E.cairo = await employee('موظف القاهرة', B.cairo, D.cairo, 9000, E.cairoManager)
  U.admin = await repo('User').save({ email: 'admin@comp-cycles.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', scopeAllBranches: true, permissions: '[]' })
  U.hr = await account('hr', B.riyadh, ['compensation.manage', 'payroll.view'])
  U.hrNoPay = await account('hr-no-pay', B.riyadh, ['compensation.manage'])
  U.hrCairo = await account('hr-cairo', B.cairo, ['compensation.manage', 'payroll.view'])
  U.manager = await account('manager', B.riyadh, [], E.manager)
  U.cairoManager = await account('cairo-manager', B.cairo, [], E.cairoManager)
  U.first = await account('first', B.riyadh, [], E.first)
  U.plain = await account('plain', B.riyadh, ['employees.view', 'payroll.view'])
}, { timeout: 120000 })

after(async t => {
  if (app) await app.close()
  if (pool) await pool.close()
  try {
    if (created) {
      assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('database', database).query('SELECT DB_ID(@database) AS id')).recordset[0].id, null)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } finally {
    if (master) await master.close()
    fs.rmSync(uploads, { recursive: true, force: true })
  }
})

test('CC-01: الموديول مقفول = مفيش مسار؛ وقبل الترحيلات الشاشة بتقول ناقص وورقة المدير فاضية؛ والترحيلات بشكل الكيانات وبتتكرر بأمان', async () => {
  assert.notEqual((await request(U.admin, 'GET', C)).status, 200)
  assert.notEqual((await request(U.manager, 'GET', '/compensation/my-team')).status, 200)
  ok(await request(U.admin, 'PUT', '/modules/compensation', { enabled: true })); modules.invalidate()
  for (const file of MIGRATIONS) {
    const text = fs.readFileSync(file), code = path.basename(file).split('_')[1]
    assert.equal(text.includes(Buffer.from('\r\n')), false, 'LF بس — git بيخزّن الملف LF')
    assert.notDeepEqual([...text.subarray(0, 3)], [0xef, 0xbb, 0xbf])
    assert.ok(String(text).match(/THROW \d+/g).every(found => new RegExp(`^THROW ${code}0\\d\\d$`).test(found)), file)
    assert.doesNotMatch(String(text), /\bDROP\b|\bTRUNCATE\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b/i)
  }
  // شكل الكيانات = شكل الترحيلات: الملفات بتعدّي على قاعدة synchronize من غير تغيير
  await runMigrations()
  for (const table of [...TABLES].reverse()) await pool.request().batch(`DROP TABLE dbo.${table}`)
  rules.resetCompensationCyclesCache()
  assert.equal(await tablesPresent(), 0)
  assert.deepEqual(ok(await request(U.admin, 'GET', C)), { ready: false, cycles: [] })
  assert.deepEqual(ok(await request(U.manager, 'GET', '/compensation/my-team')), { cycles: [] })
  assert.equal((await request(U.admin, 'POST', C, { name: 'دورة قبل الترحيل', effectivePayrollPeriod: '2027-01' })).status, 400)
  assert.equal(ok(await request(U.admin, 'GET', '/compensation/bands')).basis, 'BASIC', 'سلّم الرواتب شغال من غير الجداول')
  await runMigrations(); await runMigrations()
  assert.equal(await tablesPresent(), 4)
  assert.deepEqual(ok(await request(U.admin, 'GET', C)), { ready: true, cycles: [] })
})

test('CC-02: الدورة — بصلاحية الموديول، وفتحها وتحريكها لحساب بكل الفروع، والخطوة من حالتها بس، وضغطتين مع بعض = واحدة، وبسطر تدقيق', async () => {
  assert.deepEqual([(await request(U.plain, 'GET', C)).status, (await request(U.manager, 'GET', C)).status, (await request(U.hr, 'POST', C, { name: 'دورة فرع', effectivePayrollPeriod: '2027-01' })).status,
    (await request(U.admin, 'POST', C, { name: '', effectivePayrollPeriod: '2027-01' })).status, (await request(U.admin, 'POST', C, { name: 'دورة', effectivePayrollPeriod: '2027-13' })).status], [403, 403, 403, 400, 400])
  const made = ok(await request(U.admin, 'POST', C, { name: 'زيادات 2027', effectivePayrollPeriod: '2027-01', note: 'الدورة السنوية' }), 201)
  cycleId = made.cycle.id
  assert.deepEqual([made.cycle.status, made.cycle.statusLabel, made.cycle.effectivePayrollPeriod, made.lines, made.canMove, made.canAdjust, made.canBudget], ['DRAFT', 'مسودة', '2027-01', [], true, false, true])
  // المسودة: مفيش ورقة مدير ولا اقتراح ولا تعديل
  assert.deepEqual(ok(await request(U.manager, 'GET', '/compensation/my-team')), { cycles: [] })
  assert.deepEqual([(await request(U.manager, 'PUT', `${C}/${cycleId}/my-team/${E.first.id}`, { amount: 300 })).status, (await request(U.hr, 'PUT', `${C}/${cycleId}/lines/${E.first.id}`, { amount: 300, note: 'سبب' })).status,
    (await request(U.admin, 'POST', `${C}/${cycleId}/steps/review`)).status, (await request(U.admin, 'POST', `${C}/${cycleId}/steps/approve`)).status, (await request(U.hr, 'POST', `${C}/${cycleId}/steps/open`)).status,
    (await request(U.admin, 'POST', `${C}/999999/steps/open`)).status], [400, 400, 400, 404, 403, 404])
  const both = await Promise.all([request(U.admin, 'POST', `${C}/${cycleId}/steps/open`), request(U.admin, 'POST', `${C}/${cycleId}/steps/open`)])
  assert.deepEqual(both.map(response => response.status).sort(), [201, 400])
  assert.equal(ok(await request(U.hr, 'GET', `${C}/${cycleId}`)).cycle.status, 'OPEN')
  assert.deepEqual((await repo('AuditLog').find({ where: { entityType: 'compensation_cycle' }, order: { id: 'ASC' } })).map(row => [row.action, row.category, row.entityId]),
    [['RAISE_CYCLE_CREATED', 'PAYROLL', String(cycleId)], ['RAISE_CYCLE_MOVED', 'PAYROLL', String(cycleId)]])
  assert.equal((await request(U.admin, 'GET', `${C}/999999`)).status, 404)
})

test('CC-03: ورقة المدير — مرؤوسيه المباشرين النشطين بس، والمبلغ اللي كتبه ومن غير أي رقم راتب، وغيرهم = مش موجود، واقتراحين مع بعض = سطر واحد', async () => {
  const sheet = ok(await request(U.manager, 'GET', '/compensation/my-team'))
  assert.deepEqual(sheet.cycles.map(row => [row.id, row.name, row.effectivePayrollPeriod, row.totals]), [[cycleId, 'زيادات 2027', '2027-01', [{ currency: 'SAR', amount: 0 }]]])
  assert.deepEqual(sheet.cycles[0].team.map(person => [person.employeeId, person.amount, person.currency]).sort((a, b) => a[0] - b[0]), [[E.first.id, null, 'SAR'], [E.second.id, null, 'SAR']])
  // اللي مالوش مرؤوسين (أو مالوش ملف موظف) مابيشوفش حتى إن فيه دورة
  assert.deepEqual([ok(await request(U.first, 'GET', '/compensation/my-team')), ok(await request(U.plain, 'GET', '/compensation/my-team'))], [{ cycles: [] }, { cycles: [] }])
  const P = person => `${C}/${cycleId}/my-team/${person.id}`
  assert.deepEqual([(await request(U.manager, 'PUT', P(E.outsider), { amount: 300 })).status, (await request(U.manager, 'PUT', P(E.cairo), { amount: 300 })).status, (await request(U.manager, 'PUT', P(E.manager), { amount: 300 })).status,
    (await request(U.manager, 'PUT', `${C}/${cycleId}/my-team/999999`, { amount: 300 })).status, (await request(U.first, 'PUT', P(E.second), { amount: 300 })).status, (await request(U.plain, 'PUT', P(E.first), { amount: 300 })).status,
    (await request(U.manager, 'PUT', P(E.first), { amount: -5 })).status, (await request(U.manager, 'PUT', P(E.first), { amount: 300.555 })).status, (await request(U.manager, 'PUT', P(E.first), { amount: '300' })).status,
    (await request(U.manager, 'PUT', P(E.first), {})).status, (await request(U.manager, 'PUT', `${C}/999999/my-team/${E.first.id}`, { amount: 300 })).status],
    [404, 404, 404, 404, 404, 403, 400, 400, 400, 400, 404])
  assert.equal((await proposals()).length, 0)
  const first = ok(await request(U.manager, 'PUT', P(E.first), { amount: 300, note: ' أداء ممتاز ' }))
  assert.deepEqual([first.cycles[0].team.find(person => person.employeeId === E.first.id), first.cycles[0].totals],
    [{ employeeId: E.first.id, fullName: 'مرؤوس أول', employeeCode: E.first.employeeCode, currency: 'SAR', amount: 300, note: 'أداء ممتاز', adjusted: false }, [{ currency: 'SAR', amount: 300 }]])
  // تعديل الاقتراح = نفس السطر
  ok(await request(U.manager, 'PUT', P(E.first), { amount: 350, note: 'أداء ممتاز' }))
  const pair = await Promise.all([request(U.manager, 'PUT', P(E.second), { amount: 200 }), request(U.manager, 'PUT', P(E.second), { amount: 250 })])
  assert.deepEqual(pair.map(response => response.status), [200, 200])
  const rows = await proposals()
  assert.deepEqual(rows.map(row => [row.employeeId, Number(row.currentBasic), Number(row.proposedAmount) === Number(row.finalAmount), row.proposedByUserId, row.adjustedByUserId, row.appliedAt]),
    [[E.first.id, 5000, true, U.manager.id, null, null], [E.second.id, 6000, true, U.manager.id, null, null]])
  assert.deepEqual([Number(rows[0].proposedAmount), [200, 250].includes(Number(rows[1].proposedAmount))], [350, true])
  // ورقة المدير مافيهاش أي رقم راتب
  const text = JSON.stringify(ok(await request(U.manager, 'GET', '/compensation/my-team')))
  assert.doesNotMatch(text, /basic|salary|5000|6000|percent/i)
  // مرؤوس اتأرشف أو اتنقل لمدير تاني = مابقاش في الورقة ومابيتقترحلوش
  await repo('Employee').update({ id: E.second.id }, { managerEmployeeId: E.otherManager.id })
  assert.equal((await request(U.manager, 'PUT', P(E.second), { amount: 900 })).status, 404)
  assert.deepEqual(ok(await request(U.manager, 'GET', '/compensation/my-team')).cycles[0].team.map(person => person.employeeId), [E.first.id])
  await repo('Employee').update({ id: E.second.id }, { managerEmployeeId: E.manager.id })
  // مفيش راتب اتغيّر ولا سجل راتب اتكتب
  assert.deepEqual([await basicOf(E.first), await basicOf(E.second), (await pool.request().query(`SELECT COUNT(*) AS n FROM dbo.employee_salary_history_versions`)).recordset[0].n], [5000, 6000, 0])
  assert.deepEqual((await repo('AuditLog').find({ where: { entityType: 'compensation_proposal' }, order: { id: 'ASC' } })).map(row => [row.action, row.entityId, row.branchId]).slice(0, 2),
    [['RAISE_PROPOSED', `${cycleId}:${E.first.id}`, B.riyadh.id], ['RAISE_PROPOSED', `${cycleId}:${E.first.id}`, B.riyadh.id]])
})

test('CC-04: المراجعة — سطور نطاق الحساب بفرع الموظف الحالي بس، والراتب لصاحب «عرض الرواتب»، والتعديل بسبب ومين عمله، واقتراح المدير بعده مابيغيّرش النهائي', async () => {
  ok(await request(U.cairoManager, 'PUT', `${C}/${cycleId}/my-team/${E.cairo.id}`, { amount: 1000 }))
  const proposedSecond = Number((await proposals()).find(row => row.employeeId === E.second.id).proposedAmount)
  const riyadh = ok(await request(U.hr, 'GET', `${C}/${cycleId}`))
  assert.deepEqual([riyadh.salaries, riyadh.canMove, riyadh.canAdjust, riyadh.lines.map(row => row.employeeId), riyadh.totals], [true, false, true, [E.first.id, E.second.id],
    [{ currency: 'SAR', count: 2, proposed: 350 + proposedSecond, final: 350 + proposedSecond }]])
  const line = lineOf(riyadh, E.first)
  assert.deepEqual([line.fullName, line.departmentName, line.currency, line.proposedAmount, line.proposedBy, line.note, line.finalAmount, line.adjusted, line.adjustedBy, line.currentBasic, line.newBasic, line.percent, line.basicChanged, line.active],
    ['مرؤوس أول', 'قسم التجزئة', 'SAR', 350, 'حساب manager', 'أداء ممتاز', 350, false, null, 5000, 5350, 7, false, true])
  assert.deepEqual(riyadh.candidates.map(row => row.employeeId).sort((a, b) => a - b), [E.manager.id, E.otherManager.id, E.outsider.id].sort((a, b) => a - b))
  // من غير «عرض الرواتب»: المبالغ بس
  const noPay = ok(await request(U.hrNoPay, 'GET', `${C}/${cycleId}`)), hidden = lineOf(noPay, E.first)
  assert.deepEqual([noPay.salaries, hidden.finalAmount, hidden.currentBasic, hidden.newBasic, hidden.percent, hidden.basicChanged], [false, 350, null, null, null, null])
  assert.doesNotMatch(JSON.stringify(noPay), /5000|6000|12000/)
  // حساب فرع تاني: سطور فرعه وإجمالياته ومرشحيه بس
  const cairo = ok(await request(U.hrCairo, 'GET', `${C}/${cycleId}`))
  assert.deepEqual([cairo.lines.map(row => [row.employeeId, row.currency, row.proposedBy]), cairo.totals, cairo.candidates.map(row => row.employeeId), cairo.budgets.map(row => row.departmentId)],
    [[[E.cairo.id, 'EGP', 'حساب cairo-manager']], [{ currency: 'EGP', count: 1, proposed: 1000, final: 1000 }], [E.cairoManager.id], [D.cairo.id]])
  assert.deepEqual(ok(await request(U.admin, 'GET', `${C}/${cycleId}`)).totals.map(row => [row.currency, row.count]).sort(), [['EGP', 1], ['SAR', 2]])
  const L = person => `${C}/${cycleId}/lines/${person.id}`
  assert.deepEqual([(await request(U.hr, 'PUT', L(E.first), { amount: 400 })).status, (await request(U.hr, 'PUT', L(E.first), { amount: 400, note: '  ' })).status, (await request(U.hr, 'PUT', L(E.first), { amount: 400.123, note: 'سبب' })).status,
    (await request(U.hr, 'PUT', L(E.cairo), { amount: 400, note: 'سبب' })).status, (await request(U.hr, 'PUT', `${C}/${cycleId}/lines/999999`, { amount: 400, note: 'سبب' })).status,
    (await request(U.plain, 'PUT', L(E.first), { amount: 400, note: 'سبب' })).status, (await request(U.manager, 'PUT', L(E.first), { amount: 400, note: 'سبب' })).status], [400, 400, 400, 404, 404, 403, 403])
  const adjusted = lineOf(ok(await request(U.hr, 'PUT', L(E.first), { amount: 400, note: 'توحيد مع الميزانية' })), E.first)
  assert.deepEqual([adjusted.proposedAmount, adjusted.proposedBy, adjusted.finalAmount, adjusted.adjusted, adjusted.adjustedBy, adjusted.adjustNote, adjusted.newBasic, adjusted.percent],
    [350, 'حساب manager', 400, true, 'حساب hr', 'توحيد مع الميزانية', 5400, 8])
  // المدير بيشوف إن اقتراحه اتعدّل (من غير الرقم)، واقتراحه الجديد مابيغيّرش النهائي
  const sheet = ok(await request(U.manager, 'PUT', `${C}/${cycleId}/my-team/${E.first.id}`, { amount: 500 }))
  assert.deepEqual(sheet.cycles[0].team.filter(person => person.employeeId === E.first.id).map(person => [person.amount, person.adjusted]), [[500, true]])
  assert.doesNotMatch(JSON.stringify(sheet), /400/)
  assert.deepEqual((await proposals()).filter(row => row.employeeId === E.first.id).map(row => [Number(row.proposedAmount), Number(row.finalAmount), row.adjustedByUserId]), [[500, 400, U.hr.id]])
  // المراجعة بتضيف سطر لموظف مالوش اقتراح (بسبب)، ولموظف مش نشط لأ
  const added = lineOf(ok(await request(U.hr, 'PUT', L(E.outsider), { amount: 150, note: 'تسكين على الدرجة' })), E.outsider)
  assert.deepEqual([added.proposedAmount, added.finalAmount, added.proposedBy, added.adjusted, added.note], [150, 150, 'حساب hr', false, 'تسكين على الدرجة'])
  await repo('Employee').update({ id: E.otherManager.id }, { status: 'terminated', isActive: false })
  assert.equal((await request(U.hr, 'PUT', L(E.otherManager), { amount: 100, note: 'سبب' })).status, 400)
  await repo('Employee').update({ id: E.otherManager.id }, { status: 'active', isActive: true })
  // اسم الحساب اللي برّه نطاق القارئ مابيطلعش: سطر كتبه مدير النظام (من غير فرع)
  ok(await request(U.admin, 'PUT', L(E.cairo), { amount: 900, note: 'قرار الإدارة' }))
  assert.deepEqual([lineOf(ok(await request(U.hrCairo, 'GET', `${C}/${cycleId}`)), E.cairo), lineOf(ok(await request(U.admin, 'GET', `${C}/${cycleId}`)), E.cairo)].map(row => [row.finalAmount, row.adjusted, row.adjustedBy]),
    [[900, true, null], [900, true, 'مدير النظام']])
  // الموظف اتنقل فرع: سطره بيتبع فرعه الحالي
  await repo('Employee').update({ id: E.outsider.id }, { branchId: B.cairo.id })
  assert.deepEqual([lineOf(ok(await request(U.hr, 'GET', `${C}/${cycleId}`)), E.outsider), lineOf(ok(await request(U.hrCairo, 'GET', `${C}/${cycleId}`)), E.outsider).finalAmount,
    (await request(U.hr, 'PUT', L(E.outsider), { amount: 175, note: 'سبب' })).status], [undefined, 150, 404])
  await repo('Employee').update({ id: E.outsider.id }, { branchId: B.riyadh.id })
  // Codex P5A-B03: القسم اتنقل لفرع برّه نطاق المراجع والموظف لسه في فرعه — رقم القسم واسمه مايتعرضوش، ومدير النظام شايفهم
  await repo('Department').update({ id: D.retail.id }, { branchId: B.cairo.id, name: 'قسم اتنقل للقاهرة' })
  const moved = ok(await request(U.hr, 'GET', `${C}/${cycleId}`)), movedLine = lineOf(moved, E.first)
  assert.deepEqual([movedLine.fullName, movedLine.departmentId, movedLine.departmentName, JSON.stringify(moved).includes('قسم اتنقل للقاهرة'), moved.budgets.some(row => row.departmentId === D.retail.id)],
    ['مرؤوس أول', null, null, false, false])
  assert.deepEqual((row => [row.departmentId, row.departmentName])(lineOf(ok(await request(U.admin, 'GET', `${C}/${cycleId}`)), E.first)), [D.retail.id, 'قسم اتنقل للقاهرة'])
  await repo('Department').update({ id: D.retail.id }, { branchId: B.riyadh.id, name: 'قسم التجزئة' })
  // الأساسي اتغيّر بعد آخر كتابة = علامة لصاحب «عرض الرواتب»
  await repo('Employee').update({ id: E.first.id }, { basicSalary: 5200 })
  assert.deepEqual([lineOf(ok(await request(U.hr, 'GET', `${C}/${cycleId}`)), E.first)].map(row => [row.currentBasic, row.newBasic, row.basicChanged]), [[5200, 5600, true]])
  await repo('Employee').update({ id: E.first.id }, { basicSalary: 5000 })
  const audit = (await repo('AuditLog').find({ where: { action: 'RAISE_ADJUSTED' }, order: { id: 'ASC' } })).map(row => [row.entityId, row.actorUserId, JSON.parse(row.before).finalAmount, JSON.parse(row.after).amount])
  assert.deepEqual(audit, [[`${cycleId}:${E.first.id}`, U.hr.id, 350, 400], [`${cycleId}:${E.cairo.id}`, U.admin.id, 1000, 900]])
})

test('CC-05: الميزانية — للوحدة في نطاق الحساب، بتغطي اللي تحتها، وعدّت = تحذير والسطر بيتحفظ؛ وتحت المراجعة المدير مابيقترحش؛ والملغاة مابتتعدّلش', async () => {
  const Bud = unit => `${C}/${cycleId}/budgets/${unit.id}`
  assert.deepEqual([(await request(U.hr, 'PUT', Bud(D.cairo), { amount: 500 })).status, (await request(U.hr, 'PUT', `${C}/${cycleId}/budgets/999999`, { amount: 500 })).status,
    (await request(U.hr, 'PUT', Bud(D.sales), { amount: -1 })).status, (await request(U.hr, 'PUT', Bud(D.sales), { amount: 'كتير' })).status, (await request(U.plain, 'PUT', Bud(D.sales), { amount: 500 })).status], [404, 404, 400, 400, 403])
  const second = Number((await proposals()).find(row => row.employeeId === E.second.id).finalAmount)
  const set = ok(await request(U.hr, 'PUT', Bud(D.sales), { amount: 1000 }))
  // إدارة المبيعات بتغطي قسم التجزئة (المرؤوسين) وموظفها المباشر
  assert.deepEqual(set.budgets.map(row => [row.departmentId, row.unitType, row.currency, row.budget, row.used, row.remaining, row.over]),
    [[D.sales.id, 'ADMINISTRATION', 'SAR', 1000, 400 + second + 150, 1000 - (400 + second + 150), false], [D.retail.id, 'DEPARTMENT', 'SAR', null, 400 + second, null, false]])
  // سطر بيعدّي الميزانية: بيتحفظ والشاشة بتحذّر
  const over = ok(await request(U.hr, 'PUT', `${C}/${cycleId}/lines/${E.outsider.id}`, { amount: 700, note: 'ترقية' }))
  assert.deepEqual([lineOf(over, E.outsider).finalAmount, over.budgets[0].used, over.budgets[0].remaining, over.budgets[0].over], [700, 400 + second + 700, 1000 - (400 + second + 700), true])
  // ضغطتين مع بعض على نفس الميزانية = صف واحد
  await Promise.all([request(U.hr, 'PUT', Bud(D.retail), { amount: 300 }), request(U.hr, 'PUT', Bud(D.retail), { amount: 320 })])
  assert.equal((await repo('CompensationBudget').find({ where: { cycleId, departmentId: D.retail.id } })).length, 1)
  assert.equal(ok(await request(U.hr, 'PUT', Bud(D.retail), { amount: null })).budgets[1].budget, null)
  assert.equal((await repo('CompensationBudget').count({ where: { cycleId } })), 1)
  // حساب القاهرة مابيشوفش ميزانيات الرياض
  assert.deepEqual(ok(await request(U.hrCairo, 'GET', `${C}/${cycleId}`)).budgets.map(row => [row.departmentId, row.budget, row.used]), [[D.cairo.id, null, 900]])
  // تحت المراجعة: المدير مابيقترحش وورقته فاضية، والمراجعة بتعدّل
  assert.equal(ok(await request(U.admin, 'POST', `${C}/${cycleId}/steps/review`), 201).cycle.status, 'REVIEW')
  assert.deepEqual([(await request(U.manager, 'PUT', `${C}/${cycleId}/my-team/${E.first.id}`, { amount: 999 })).status, ok(await request(U.manager, 'GET', '/compensation/my-team')).cycles.length,
    (await request(U.hr, 'PUT', `${C}/${cycleId}/lines/${E.first.id}`, { amount: 420, note: 'مراجعة نهائية' })).status], [400, 0, 200])
  assert.equal(ok(await request(U.admin, 'POST', `${C}/${cycleId}/steps/reopen`), 201).cycle.status, 'OPEN')
  // الملغاة: مفيش اقتراح ولا تعديل ولا ميزانية ولا خطوة
  assert.equal(ok(await request(U.admin, 'POST', `${C}/${cycleId}/steps/cancel`), 201).cycle.status, 'CANCELLED')
  assert.deepEqual([(await request(U.manager, 'PUT', `${C}/${cycleId}/my-team/${E.first.id}`, { amount: 999 })).status, (await request(U.hr, 'PUT', `${C}/${cycleId}/lines/${E.first.id}`, { amount: 430, note: 'سبب' })).status,
    (await request(U.hr, 'PUT', Bud(D.sales), { amount: 2000 })).status, (await request(U.admin, 'POST', `${C}/${cycleId}/steps/open`)).status], [400, 400, 400, 400])
  assert.deepEqual(ok(await request(U.admin, 'GET', C)).cycles.map(row => [row.id, row.status, row.statusLabel]), [[cycleId, 'CANCELLED', 'ملغاة']])
  // من أول الملف لآخره: ولا راتب اتغيّر
  assert.deepEqual([await basicOf(E.first), await basicOf(E.second), await basicOf(E.outsider), await basicOf(E.cairo), (await pool.request().query(`SELECT COUNT(*) AS n FROM dbo.employee_salary_history_versions`)).recordset[0].n],
    [5000, 6000, 7000, 9000, 0])
})

// ===== (ج) الاعتماد والتطبيق =====
const wide = (label, permissions) => repo('User').save({ email: `${label}@comp-cycles.invalid`, displayName: 'حساب ' + label, passwordHash: 'test-only', role: 'employee', branchId: null,
  scopeAllBranches: true, permissions: JSON.stringify(permissions) })
// شهر مسير عدّى (أكيد مش لاحق لشهر المسير الجاري)
const pastPeriod = () => { const date = new Date(Date.now() - 62 * 86400000); return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}` }
const step = (id, name) => request(U.admin, 'POST', `${C}/${id}/steps/${name}`)
const versions = async person => (await pool.request().input('id', person.id).query(`SELECT [revision], [reason], [evidenceReference], [createdBy] FROM dbo.employee_salary_history_versions WHERE [employeeId] = @id ORDER BY [revision]`)).recordset
const messageOf = response => (Array.isArray(response.body?.message) ? response.body.message.join(' ') : response.body?.message)
let applyCycle

test('CC-06: الاعتماد — بصلاحية اعتماد المسير ولحساب بكل الفروع، ومن حد ماقترحش: مش اللي بعتها للمراجعة ولا اللي كتب أو عدّل سطر؛ والرجوع قبل التطبيق', async () => {
  // ملفات الأجر كاملة بعملتها (زي ما تغيير الأجر بيشترط)
  for (const person of [E.first, E.second, E.outsider]) await repo('Employee').update({ id: person.id }, { currency: 'SAR', phoneAllowance: 0, workNatureAllowance: 0 })
  U.approver = await wide('approver', ['compensation.manage', 'payroll.view', 'payroll.approve'])
  U.writer = await wide('writer', ['compensation.manage', 'payroll.view', 'payroll.approve', 'employees.edit'])
  U.applier = await wide('applier', ['compensation.manage', 'payroll.view', 'payroll.approve', 'employees.edit'])
  U.branchApprover = await account('branch-approver', B.riyadh, ['compensation.manage', 'payroll.view', 'payroll.approve', 'employees.edit'])
  applyCycle = ok(await request(U.admin, 'POST', C, { name: 'دورة التطبيق', effectivePayrollPeriod: pastPeriod() }), 201).cycle.id
  const A = `${C}/${applyCycle}`
  // مسودة أو مفتوحة: مفيش اعتماد
  assert.equal((await request(U.approver, 'POST', `${A}/approve`)).status, 400)
  ok(await step(applyCycle, 'open'), 201)
  ok(await request(U.manager, 'PUT', `${A}/my-team/${E.first.id}`, { amount: 300 }))
  ok(await request(U.manager, 'PUT', `${A}/my-team/${E.second.id}`, { amount: 200 }))
  ok(await request(U.writer, 'PUT', `${A}/lines/${E.second.id}`, { amount: 250, note: 'توحيد' }))
  assert.equal((await request(U.approver, 'POST', `${A}/approve`)).status, 400, 'لسه مفتوحة')
  ok(await step(applyCycle, 'review'), 201)
  // بالصلاحية وبالنطاق
  assert.deepEqual([(await request(U.hr, 'POST', `${A}/approve`)).status, (await request(U.manager, 'POST', `${A}/approve`)).status, (await request(U.branchApprover, 'POST', `${A}/approve`)).status,
    (await request(U.approver, 'POST', `${C}/999999/approve`)).status], [403, 403, 403, 404])
  // اللي بعتها للمراجعة (مدير النظام هنا)، واللي عدّل سطر: مايعتمدوش
  const sent = await request(U.admin, 'POST', `${A}/approve`), wrote = await request(U.writer, 'POST', `${A}/approve`)
  assert.deepEqual([[sent.status, messageOf(sent)], [wrote.status, messageOf(wrote)]], [[403, rules.APPROVER_SENT_REVIEW], [403, rules.APPROVER_WROTE_LINE]])
  assert.equal((await repo('CompensationCycle').findOneByOrFail({ id: applyCycle })).status, 'REVIEW')
  // Codex P5A-B02: مراجع تاني حفظ نفس السطر بعد الكاتب الأول — الكاتب الأول لسه مايعتمدش (سجل الكاتبين مابيتمسحش)، والتاني كمان
  ok(await request(U.applier, 'PUT', `${A}/lines/${E.second.id}`, { amount: 250, note: 'نفس المبلغ من مراجع تاني' }))
  assert.equal((await repo('CompensationProposal').findOneByOrFail({ cycleId: applyCycle, employeeId: E.second.id })).adjustedByUserId, U.applier.id)
  const first = await request(U.writer, 'POST', `${A}/approve`), second = await request(U.applier, 'POST', `${A}/approve`)
  assert.deepEqual([[first.status, messageOf(first)], [second.status, messageOf(second)]], [[403, rules.APPROVER_WROTE_LINE], [403, rules.APPROVER_WROTE_LINE]])
  assert.deepEqual((await repo('CompensationWriter').find({ where: { cycleId: applyCycle }, order: { id: 'ASC' } })).map(row => row.userId), [U.manager.id, U.writer.id, U.applier.id])
  assert.equal((await repo('CompensationCycle').findOneByOrFail({ id: applyCycle })).status, 'REVIEW')
  // حد ماقترحش: بيعتمد — وضغطتين مع بعض = اعتماد واحد
  const both = await Promise.all([request(U.approver, 'POST', `${A}/approve`), request(U.approver, 'POST', `${A}/approve`)])
  assert.deepEqual(both.map(response => response.status).sort(), [201, 400])
  const approved = await repo('CompensationCycle').findOneByOrFail({ id: applyCycle })
  assert.deepEqual([approved.status, approved.approvedByUserId, approved.approvedAt instanceof Date], ['APPROVED', U.approver.id, true])
  // المعتمدة: مفيش اقتراح ولا تعديل ولا ميزانية ولا إلغاء
  assert.deepEqual([(await request(U.manager, 'PUT', `${A}/my-team/${E.first.id}`, { amount: 999 })).status, (await request(U.writer, 'PUT', `${A}/lines/${E.first.id}`, { amount: 999, note: 'سبب' })).status,
    (await request(U.writer, 'PUT', `${A}/budgets/${D.sales.id}`, { amount: 5000 })).status, (await step(applyCycle, 'cancel')).status], [400, 400, 400, 400])
  // الرجوع للمراجعة قبل التطبيق، وبعدها اعتماد تاني
  assert.deepEqual([(await request(U.hr, 'POST', `${A}/unapprove`)).status, (await request(U.branchApprover, 'POST', `${A}/unapprove`)).status], [403, 403])
  assert.equal(ok(await request(U.approver, 'POST', `${A}/unapprove`), 201).cycle.status, 'REVIEW')
  assert.equal((await request(U.approver, 'POST', `${A}/unapprove`)).status, 400)
  const detail = ok(await request(U.approver, 'POST', `${A}/approve`), 201)
  assert.deepEqual([detail.cycle.status, detail.canApprove, detail.canApply, detail.performance, detail.lines.map(row => row.performanceScore)], ['APPROVED', true, false, false, [null, null]])
  // دورة من غير أي زيادة: مافيش حاجة تتعتمد
  const empty = ok(await request(U.admin, 'POST', C, { name: 'دورة فاضية', effectivePayrollPeriod: pastPeriod() }), 201).cycle.id
  ok(await step(empty, 'open'), 201); ok(await request(U.manager, 'PUT', `${C}/${empty}/my-team/${E.first.id}`, { amount: 0 })); ok(await step(empty, 'review'), 201)
  const none = await request(U.approver, 'POST', `${C}/${empty}/approve`)
  assert.deepEqual([none.status, messageOf(none)], [400, rules.APPROVE_NO_LINES])
  ok(await step(empty, 'cancel'), 201)
  assert.deepEqual((await repo('AuditLog').find({ where: { entityType: 'compensation_cycle', entityId: String(applyCycle) }, order: { id: 'ASC' } })).map(row => row.action).filter(action => /APPROVED|UNAPPROVED/.test(action)),
    ['RAISE_CYCLE_APPROVED', 'RAISE_CYCLE_UNAPPROVED', 'RAISE_CYCLE_APPROVED'])
  // ولا راتب اتغيّر بالاعتماد
  assert.deepEqual([await basicOf(E.first), await basicOf(E.second), (await versions(E.first)).length], [5000, 6000, 0])
})

test('CC-07: التطبيق — من خدمة تاريخ الراتب، سطر سطر: الأساسي اللي اتغيّر بيترفض والباقي بيكمّل، ومابيتكررش، ومرجع الدورة على صف تاريخ الراتب، وضغطتين = مرة واحدة', async () => {
  const A = `${C}/${applyCycle}`
  // بالصلاحية: اعتماد المسير لوحده مايكفيش، ولا حساب فرع
  const needsEdit = await request(U.approver, 'POST', `${A}/apply`)
  assert.deepEqual([needsEdit.status, /تعديل الموظفين/.test(messageOf(needsEdit)), (await request(U.hr, 'POST', `${A}/apply`)).status, (await request(U.branchApprover, 'POST', `${A}/apply`)).status,
    (await request(U.applier, 'POST', `${C}/999999/apply`)).status], [403, true, 403, 403, 404])
  assert.deepEqual([await basicOf(E.first), (await versions(E.first)).length], [5000, 0])
  // أساسي المرؤوس التاني اتغيّر بعد المراجعة: سطره بيترفض، والأول بيتطبّق
  await repo('Employee').update({ id: E.second.id }, { basicSalary: 6100 })
  const first = ok(await request(U.applier, 'POST', `${A}/apply`), 201)
  assert.deepEqual([first.applied, first.refused.map(row => [row.employeeId, /اتغيّر بعد آخر مراجعة/.test(row.message)]), first.cycle.status], [1, [[E.second.id, true]], 'APPROVED'])
  assert.deepEqual([await basicOf(E.first), await basicOf(E.second)], [5300, 6100])
  const history = await versions(E.first)
  assert.deepEqual(history.map(row => [row.revision, row.evidenceReference, row.createdBy, /دورة التطبيق/.test(row.reason)]), [[1, `COMP-CYCLE-${applyCycle}`, U.applier.id, true]])
  const line = (await proposals()).find(row => row.cycleId === applyCycle && row.employeeId === E.first.id)
  assert.deepEqual([line.appliedAt instanceof Date, line.appliedByUserId, line.appliedRevision], [true, U.applier.id, 1])
  assert.deepEqual(first.lines.map(row => [row.employeeId, row.appliedAt !== null]), [[E.first.id, true], [E.second.id, false]])
  // سجل تغيير الملف اتكتب من خدمة تغيير الأجر نفسها
  assert.equal(Number((await pool.request().input('id', E.first.id).query(`SELECT COUNT(*) AS n FROM dbo.employee_status_history WHERE [employeeId] = @id AND [fieldName] = N'basicSalary'`)).recordset[0].n), 1)
  // فيه سطر اتطبّق: الدورة مابترجعش للمراجعة؛ وتطبيق تاني مابيكررش
  assert.equal((await request(U.approver, 'POST', `${A}/unapprove`)).status, 400)
  const again = ok(await request(U.applier, 'POST', `${A}/apply`), 201)
  assert.deepEqual([again.applied, again.refused.length, await basicOf(E.first), (await versions(E.first)).length], [0, 1, 5300, 1])
  // الأساسي رجع للي اتراجع عليه: السطر بيتطبّق والدورة «اتطبّقت» — وضغطتين مع بعض = مرة واحدة
  await repo('Employee').update({ id: E.second.id }, { basicSalary: 6000 })
  const pair = await Promise.all([request(U.applier, 'POST', `${A}/apply`), request(U.applier, 'POST', `${A}/apply`)])
  assert.deepEqual([pair.map(response => response.status === 201 || response.status === 400).every(Boolean), pair.filter(response => response.status === 201).reduce((sum, response) => sum + response.body.applied, 0)], [true, 1])
  assert.deepEqual([await basicOf(E.second), (await versions(E.second)).length, (await repo('CompensationCycle').findOneByOrFail({ id: applyCycle })).status], [6250, 1, 'APPLIED'])
  assert.equal((await request(U.applier, 'POST', `${A}/apply`)).status, 400, 'اتطبّقت خلاص')
  assert.deepEqual([await basicOf(E.first), await basicOf(E.second), await basicOf(E.outsider)], [5300, 6250, 7000], 'كل زيادة مرة واحدة، واللي مالوش سطر زي ما هو')
  assert.deepEqual((await repo('AuditLog').find({ where: { action: 'RAISE_APPLIED' }, order: { id: 'ASC' } })).map(row => [row.entityId, row.actorUserId, JSON.parse(row.after).evidenceReference]),
    [[`${applyCycle}:${E.first.id}`, U.applier.id, `COMP-CYCLE-${applyCycle}`], [`${applyCycle}:${E.second.id}`, U.applier.id, `COMP-CYCLE-${applyCycle}`]])
  assert.equal(await repo('AuditLog').count({ where: { action: 'RAISE_CYCLE_APPLIED' } }), 1)

  // دورة شهر سريانها لسه ماجاش: خدمة تاريخ الراتب بترفض كل سطر — ولا راتب بيتكتب، والموظف اللي ساب الشغل سطره بيترفض
  const future = ok(await request(U.admin, 'POST', C, { name: 'دورة السنة الجاية', effectivePayrollPeriod: '2099-01' }), 201).cycle.id
  ok(await step(future, 'open'), 201)
  ok(await request(U.manager, 'PUT', `${C}/${future}/my-team/${E.first.id}`, { amount: 100 }))
  ok(await step(future, 'review'), 201); ok(await request(U.approver, 'POST', `${C}/${future}/approve`), 201)
  const later = ok(await request(U.applier, 'POST', `${C}/${future}/apply`), 201)
  assert.deepEqual([later.applied, later.refused.map(row => [row.employeeId, /شهر لاحق/.test(row.message)]), later.cycle.status, await basicOf(E.first), (await versions(E.first)).length],
    [0, [[E.first.id, true]], 'APPROVED', 5300, 1])
  await repo('Employee').update({ id: E.first.id }, { status: 'terminated', isActive: false })
  const gone = ok(await request(U.applier, 'POST', `${C}/${future}/apply`), 201)
  assert.deepEqual([gone.applied, gone.refused.map(row => /مش على رأس العمل/.test(row.message))], [0, [true]])
  await repo('Employee').update({ id: E.first.id }, { status: 'active', isActive: true })

  // نتيجة الأداء في المراجعة: لو الموديول مفتوح وللي معاه صلاحيته
  await repo('ReviewAssignment').save({ cycleId: 1, employeeId: E.first.id, branchId: B.riyadh.id, managerEmployeeId: E.manager.id, status: 'APPROVED', selfSubmittedAt: null, managerSubmittedAt: null,
    selfScore: null, managerScore: null, finalScore: 92, createdAt: new Date() })
  const closed = ok(await request(U.admin, 'GET', `${C}/${future}`))
  assert.deepEqual([closed.performance, closed.lines[0].performanceScore], [false, null], 'موديول الأداء مقفول')
  ok(await request(U.admin, 'PUT', '/modules/performance', { enabled: true })); modules.invalidate()
  const seen = ok(await request(U.admin, 'GET', `${C}/${future}`)), unseen = ok(await request(U.approver, 'GET', `${C}/${future}`))
  assert.deepEqual([seen.performance, seen.lines.map(row => [row.performanceScore, row.performanceLabel]), unseen.performance, unseen.lines[0].performanceScore], [true, [[92, 'ممتاز']], false, null])
})
