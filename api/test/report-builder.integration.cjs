'use strict'
// B5.9 على SQL حقيقي: بانِي التقارير — الميزة الفرعية مقفولة افتراضيًا، ترحيل 175، القاموس بصلاحيات القارئ، التشغيل بنطاق فرع الموظف الحالي وبصلاحية
// الحقل (عرضًا وفلترًا)، القيم معاملات، الطلبات السرّية برّه، والحفظ والمشاركة بأدوار بصلاحيات القارئ هو. قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const migrate = require('../scripts/db-migrate.cjs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_report_builder_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_report_builder_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-report-builder-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/reports/report-builder')
const MIGRATION = path.resolve(apiRoot, '..', 'docs', 'migrations', 'payroll', '20261010_175_report_definitions.sql')
let master, pool, app, ds, base, modules, created = false, sequence = 0
const B = {}, E = {}, U = {}, R = {}
const repo = name => { assert.match(database, NAME); assert.equal(ds.options.database, database); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token(user) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const raw = await response.text(); let parsed = null
  try { parsed = raw ? JSON.parse(raw) : null } catch { parsed = raw }
  return { status: response.status, body: parsed }
}
const ok = (response, status = 200) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const refused = (response, status, message) => { assert.deepEqual([response.status, response.body?.message], [status, message]) }
const employee = (name, branch, extra = {}) => repo('Employee').save({ employeeCode: 'RB' + ++sequence, fullName: name, branchId: branch.id, joinDate: '2020-01-01',
  basicSalary: 5000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'cash', ...extra })
const account = (label, branch, role, permissions) => repo('User').save({ email: `${label}@report-builder.invalid`, displayName: 'حساب ' + label, passwordHash: 'test-only', role, branchId: branch.id,
  permissions: JSON.stringify(permissions), isActive: true })
const runMigration = async () => { assert.match(database, NAME); for (const batch of migrate.splitBatches(fs.readFileSync(MIGRATION, 'utf8').replace(/\r\n/g, '\n'))) await pool.request().batch(batch) }
const P = '/reports/builder'
const run = (user, definition) => request(user, 'POST', `${P}/run`, definition)
const save = (user, body, id) => request(user, id ? 'PATCH' : 'POST', id ? `${P}/saved/${id}` : `${P}/saved`, body)
const runSaved = (user, id) => request(user, 'GET', `${P}/saved/${id}/run`)
const people = (columns, extra = {}) => ({ source: 'employees', columns, ...extra })
const READER = ['reports.view', 'reports.save', 'employees.view', 'attendance.view_all', 'leaves.view_all', 'requests.view_all']

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
  B.riyadh = await repo('Branch').save({ code: 'RB_1', name: 'فرع الرياض', country: 'SA' })
  B.cairo = await repo('Branch').save({ code: 'RB_2', name: 'فرع القاهرة', country: 'EG' })
  for (const [code, nameAr, isActive] of [['rb_lead', 'مسؤول تقارير', true], ['rb_analyst', 'محلل', true], ['rb_off', 'دور مقفول', false]]) await repo('Role').save({ code, nameAr, permissions: '[]', isSystem: false, isActive })
  U.admin = await repo('User').save({ email: 'admin@report-builder.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', scopeAllBranches: true, permissions: '[]', isActive: true })
  E.a = await employee('موظف أ', B.riyadh, { jobTitle: 'محاسب' }); E.b = await employee('موظف ب', B.riyadh, { jobTitle: 'مهندس', joinDate: '2022-05-01', basicSalary: 7000 })
  E.c = await employee('موظف ج', B.cairo, { jobTitle: 'محاسب', basicSalary: 4000 })
  U.rep = await account('rep', B.riyadh, 'rb_lead', READER); U.pay = await account('pay', B.riyadh, 'rb_analyst', ['reports.view', 'reports.save', 'employees.view', 'payroll.view'])
  U.viewer = await account('viewer', B.riyadh, 'rb_analyst', ['reports.view', 'employees.view']); U.cairo = await account('cairo', B.cairo, 'rb_analyst', ['reports.view', 'reports.save', 'employees.view'])
  U.bare = await account('bare', B.riyadh, 'rb_analyst', ['reports.view']); U.none = await account('none', B.riyadh, 'rb_analyst', ['employees.view', 'reports.save'])
  const day = (who, date, status, workMinutes, lateMinutes) => repo('AttendanceDay').save({ employeeId: who.id, branchId: who.branchId, date, shiftName: 'عام', shiftStart: '08:00', shiftEnd: '17:00', status, workMinutes, lateMinutes })
  await day(E.a, '2026-09-01', 'present', 480, 0); await day(E.a, '2026-09-02', 'late', 450, 30); await day(E.c, '2026-09-01', 'absent', 0, 0)
  await repo('Leave').save({ employeeId: E.a.id, leaveTypeCode: 'sick', fromDate: '2026-09-10', toDate: '2026-09-12', days: 3, period: 'FULL', isUnpaid: false, status: 'APPROVED' })
  await repo('Leave').save({ employeeId: E.c.id, leaveTypeCode: 'annual', fromDate: '2026-09-10', toDate: '2026-09-11', days: 2, period: 'FULL', isUnpaid: false, status: 'APPROVED' })
  for (const [code, nameAr, isConfidential] of [['RB_OPEN', 'طلب عادي للبانِي', false], ['RB_SECRET', 'طلب سري للبانِي', true]]) {
    await pool.request().query(`DELETE FROM dbo.request_types WHERE [code] = N'${code}'`)
    await repo('RequestType').save({ code, nameAr, category: 'OTHER', destinationHandler: 'record_only', isConfidential })
  }
  await repo('Request').save({ typeCode: 'RB_OPEN', requesterId: E.a.id, createdByUserId: U.admin.id, branchId: B.riyadh.id, status: 'PENDING' })
  await repo('Request').save({ typeCode: 'RB_SECRET', requesterId: E.a.id, createdByUserId: U.admin.id, branchId: B.riyadh.id, status: 'PENDING' })
  await repo('Request').save({ typeCode: 'RB_OPEN', requesterId: E.c.id, createdByUserId: U.admin.id, branchId: B.cairo.id, status: 'COMPLETED' })
  const paid = await repo('PayrollRun').save({ period: '2026-09', startDate: '2026-08-23', endDate: '2026-09-22', status: 'APPROVED', branchId: B.riyadh.id, name: 'مسير سبتمبر' })
  const draft = await repo('PayrollRun').save({ period: '2026-10', startDate: '2026-09-23', endDate: '2026-10-22', status: 'DRAFT', branchId: B.riyadh.id, name: 'مسير أكتوبر' })
  await repo('PayrollItem').save({ runId: paid.id, employeeId: E.a.id, basicSalary: 5000, netPay: 4800.5, payMethod: 'cash' })
  await repo('PayrollItem').save({ runId: draft.id, employeeId: E.a.id, basicSalary: 5000, netPay: 5000, payMethod: 'cash' })
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

test('RB-01: الميزة الفرعية مقفولة افتراضيًا = مفيش مسار؛ وقبل الترحيل البانِي بيشتغل والحفظ بيقول ناقص؛ والترحيل بشكل الكيان وبيتكرر بأمان', async () => {
  assert.equal(await modules.isFeatureEnabled(rules.REPORT_BUILDER_FEATURE), false)
  assert.deepEqual([(await request(U.rep, 'GET', P)).status, (await run(U.rep, people(['fullName']))).status, (await save(U.rep, {})).status, (await runSaved(U.rep, 1)).status], [404, 404, 404, 404])
  ok(await request(U.admin, 'PUT', `/modules/features/${rules.REPORT_BUILDER_FEATURE}`, { enabled: true })); modules.invalidate()
  const text = fs.readFileSync(MIGRATION)
  assert.equal(text.includes(Buffer.from('\r\n')), false, 'LF بس — git بيخزّن الملف LF')
  assert.notDeepEqual([...text.subarray(0, 3)], [0xef, 0xbb, 0xbf])
  assert.ok(String(text).match(/THROW \d+/g).every(found => /^THROW 1750\d\d$/.test(found)))
  assert.doesNotMatch(String(text), /\bDROP\b|\bTRUNCATE\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b/i)
  await runMigration()
  await pool.request().batch('DROP TABLE dbo.report_definitions'); rules.resetReportDefinitionsCache()
  const before = ok(await request(U.rep, 'GET', P))
  assert.deepEqual([before.ready, before.canSave, before.saved, before.rowsMax], [false, true, [], rules.ROWS_MAX])
  assert.equal(ok(await run(U.rep, people(['fullName'])), 201).rows.length, 2)
  refused(await save(U.rep, { name: 'تقرير', definition: people(['fullName']) }), 400, rules.REPORT_BUILDER_MIGRATION_MISSING)
  refused(await runSaved(U.rep, 1), 400, rules.REPORT_BUILDER_MIGRATION_MISSING)
  await runMigration(); await runMigration()
  assert.equal(ok(await request(U.rep, 'GET', P)).ready, true)
})

test('RB-02: القاموس بصلاحيات القارئ — المصدر بصلاحيته، وعمود الراتب بصلاحية حقله، ومن غير صلاحية مركز التقارير مفيش بانِي', async () => {
  assert.equal((await request(U.none, 'GET', P)).status, 403)
  assert.equal((await run(U.none, people(['fullName']))).status, 403)
  const mine = ok(await request(U.rep, 'GET', P))
  assert.deepEqual([mine.sources.map(row => row.key), mine.sources[0].columns.some(column => column.key === 'basicSalary'), mine.roles.map(row => row.code).filter(code => code.startsWith('rb_')).sort()],
    [['employees', 'attendance', 'leaves', 'requests'], false, ['rb_analyst', 'rb_lead']])
  const pay = ok(await request(U.pay, 'GET', P))
  assert.deepEqual([pay.sources.map(row => row.key), pay.sources[0].columns.find(column => column.key === 'basicSalary')],
    [['employees', 'payroll'], { key: 'basicSalary', label: 'الراتب الأساسي', type: 'money', group: false, sum: false, ops: ['eq', 'gte', 'lte'] }])
  const viewer = ok(await request(U.viewer, 'GET', P))
  assert.deepEqual([viewer.canSave, viewer.roles, viewer.sources.map(row => row.key), ok(await request(U.bare, 'GET', P)).sources], [false, [], ['employees'], []])
  // القاموس مابيطلّعش تعبيرات SQL ولا صلاحيات
  assert.equal(/"sql"|"perm"|dbo\.|\.\[/.test(JSON.stringify(mine.sources)), false)
})

test('RB-03: التشغيل — مفاتيح من القاموس بس وقيم معاملات، بنطاق فرع الموظف الحالي، وصلاحية الحقل عرضًا وفلترًا وتجميعًا؛ والسرّي والمسودة والمعكوس برّه', async () => {
  for (const [body, message] of [[{ source: 'users', columns: ['email'] }, 'اختار مصدر التقرير'], [people([]), 'اختار من عمود لحد 12 عمود'], [people(['passwordHash']), 'عمود من الأعمدة مش في المصدر أو مكرر'],
    [people(['fullName', 'fullName']), 'عمود من الأعمدة مش في المصدر أو مكرر'], [people(['fullName; DROP TABLE employees']), 'عمود من الأعمدة مش في المصدر أو مكرر'],
    [people(['fullName'], { filters: [{ column: 'iban', op: 'eq', value: 'x' }] }), 'فلتر على عمود مش في المصدر'], [people(['fullName'], { filters: [{ column: 'fullName', op: 'gte', value: 'x' }] }), 'الفلتر على «اسم الموظف» بعامل مش مناسب'],
    [people(['fullName'], { filters: [{ column: 'joinDate', op: 'gte', value: '2026-13-01' }] }), 'قيمة الفلتر على «تاريخ التعيين» مش صحيحة'], [people(['fullName'], { filters: [{ column: 'basicSalary', op: 'gte', value: '1 OR 1=1' }] }), 'قيمة الفلتر على «الراتب الأساسي» مش صحيحة'],
    [people(['fullName'], { groupBy: 'joinDate' }), 'التجميع بعمود مش بيتجمّع بيه'], [people(['fullName'], { filters: Array.from({ length: 9 }, () => ({ column: 'fullName', op: 'eq', value: 'x' })) }), 'الفلاتر قايمة لحد 8']]) refused(await run(U.rep, body), 400, message)
  const listed = ok(await run(U.rep, people(['employeeCode', 'fullName', 'jobTitle', 'branchName', 'joinDate'])), 201)
  assert.deepEqual([listed.headers.map(header => [header.key, header.label, header.type]), listed.rows, listed.truncated],
    [[['employeeCode', 'كود الموظف', 'text'], ['fullName', 'اسم الموظف', 'text'], ['jobTitle', 'المسمى الوظيفي', 'text'], ['branchName', 'الفرع', 'text'], ['joinDate', 'تاريخ التعيين', 'date']],
      [[E.a.employeeCode, 'موظف أ', 'محاسب', 'فرع الرياض', '2020-01-01'], [E.b.employeeCode, 'موظف ب', 'مهندس', 'فرع الرياض', '2022-05-01']], false])
  const names = async (user, extra) => ok(await run(user, people(['fullName'], extra)), 201).rows.map(row => row[0])
  assert.deepEqual([await names(U.cairo), await names(U.admin), await names(U.rep, { filters: [{ column: 'jobTitle', op: 'contains', value: 'حاس' }] }), await names(U.rep, { filters: [{ column: 'joinDate', op: 'gte', value: '2021-01-01' }] }),
    await names(U.rep, { filters: [{ column: 'status', op: 'eq', value: 'active' }, { column: 'jobTitle', op: 'eq', value: 'مهندس' }] })],
  [['موظف ج'], ['موظف أ', 'موظف ب', 'موظف ج'], ['موظف أ'], ['موظف ب'], ['موظف ب']])
  // القيمة معامل: نص SQL وحروف LIKE بتتعامل كنص
  assert.deepEqual([await names(U.rep, { filters: [{ column: 'fullName', op: 'eq', value: "x' OR '1'='1" }] }), await names(U.rep, { filters: [{ column: 'fullName', op: 'contains', value: '%' }] }),
    await names(U.rep, { filters: [{ column: 'jobTitle', op: 'contains', value: "'; DROP TABLE dbo.employees; --" }] }), await repo('Employee').count()], [[], [], [], 3])
  // تجميع: العدد لكل قيمة
  const grouped = ok(await run(U.admin, people(['fullName'], { groupBy: 'jobTitle' })), 201)
  assert.deepEqual([grouped.headers.map(header => header.key), grouped.rows], [['jobTitle', 'count'], [['محاسب', 2], ['مهندس', 1]]])
  // صلاحية الحقل: عرضًا وفلترًا (الفلتر بعمود محجوب بيكشفه)
  refused(await run(U.rep, people(['fullName', 'basicSalary'])), 403, rules.SOURCE_UNAVAILABLE)
  refused(await run(U.rep, people(['fullName'], { filters: [{ column: 'basicSalary', op: 'gte', value: 6000 }] })), 403, rules.SOURCE_UNAVAILABLE)
  assert.deepEqual(ok(await run(U.pay, people(['fullName', 'basicSalary'], { filters: [{ column: 'basicSalary', op: 'gte', value: 6000 }] })), 201).rows, [['موظف ب', '7000.00']])
  // مصدر مش في صلاحية القارئ
  refused(await run(U.cairo, { source: 'attendance', columns: ['fullName'] }), 403, rules.SOURCE_UNAVAILABLE)
  // صلاحية العرض لوحدها مابتشغّلش تعريف من البانِي (بتشغّل المحفوظ والمتشارك بس)
  assert.equal((await run(U.viewer, people(['fullName']))).status, 403)
  refused(await run(U.rep, { source: 'payroll', columns: ['netPay'] }), 403, rules.SOURCE_UNAVAILABLE)
  // الحضور والإجازات: بنطاق فرع الموظف
  assert.deepEqual(ok(await run(U.rep, { source: 'attendance', columns: ['fullName', 'date', 'status', 'workMinutes'] }), 201).rows, [['موظف أ', '2026-09-01', 'present', 480], ['موظف أ', '2026-09-02', 'late', 450]])
  const byStatus = ok(await run(U.rep, { source: 'attendance', columns: ['workMinutes', 'lateMinutes', 'fullName'], groupBy: 'status', filters: [{ column: 'date', op: 'lte', value: '2026-09-30' }] }), 201)
  assert.deepEqual([byStatus.headers.map(header => header.label), byStatus.rows], [['حالة اليوم', 'العدد', 'مجموع دقايق العمل', 'مجموع دقايق التأخير'], [['late', 1, 450, 30], ['present', 1, 480, 0]]])
  assert.deepEqual(ok(await run(U.rep, { source: 'leaves', columns: ['fullName', 'leaveType', 'fromDate', 'days'] }), 201).rows, [['موظف أ', 'sick', '2026-09-10', 3]])
  // الطلبات: النوع السرّي برّه المصدر حتى لمدير النظام
  assert.deepEqual([ok(await run(U.rep, { source: 'requests', columns: ['typeName', 'fullName', 'status'] }), 201).rows, ok(await run(U.admin, { source: 'requests', columns: ['typeName'], groupBy: 'typeName' }), 201).rows],
    [[['طلب عادي للبانِي', 'موظف أ', 'PENDING']], [['طلب عادي للبانِي', 2]]])
  // Codex P5A-B04: السرية بتعريف الطلب الفعلي — طلب نوعه العام عادي وتعريفه سري، وطلب نوعه العام سري وتعريفه عادي، وتأجيل قسط سلفة ونوع السلفة سري: كلهم برّه
  for (const [code, nameAr, isConfidential] of [['LOAN', 'سلفة', true], ['LOAN_INSTALLMENT_DEFER', 'تأجيل قسط سلفة', false]]) {
    await pool.request().query(`DELETE FROM dbo.request_types WHERE [code] = N'${code}'`)
    await repo('RequestType').save({ code, nameAr, category: 'OTHER', destinationHandler: 'record_only', isConfidential })
  }
  const hidden = []
  for (const row of [{ typeCode: 'RB_OPEN', definitionCode: 'RB_SECRET' }, { typeCode: 'RB_SECRET', definitionCode: 'RB_OPEN' }, { typeCode: 'LOAN_INSTALLMENT_DEFER' }, { typeCode: 'RB_OPEN', definitionCode: 'RB_GONE' }]) {
    hidden.push((await repo('Request').save({ ...row, requesterId: E.b.id, createdByUserId: U.admin.id, branchId: B.riyadh.id, status: 'PENDING' })).id)
  }
  const shownTo = async user => ok(await run(user, { source: 'requests', columns: ['typeName', 'fullName'] }), 201).rows
  assert.deepEqual([await shownTo(U.rep), (await shownTo(U.admin)).filter(row => row[1] === 'موظف ب'), ok(await run(U.admin, { source: 'requests', columns: ['typeName'], groupBy: 'fullName' }), 201).rows.map(row => row[0])],
    [[['طلب عادي للبانِي', 'موظف أ']], [], ['موظف أ', 'موظف ج']])
  // التأجيل بيرجع يتعرض لو نوع السلفة مابقاش سري (السرية موروثة مش ثابتة)
  await pool.request().query(`UPDATE dbo.request_types SET [isConfidential] = 0 WHERE [code] = N'LOAN'`)
  assert.deepEqual((await shownTo(U.admin)).filter(row => row[1] === 'موظف ب'), [['تأجيل قسط سلفة', 'موظف ب']])
  await repo('Request').delete(hidden)
  // الرواتب: المعتمد والمصروف بس، والمبلغ نص عشري
  assert.deepEqual(ok(await run(U.pay, { source: 'payroll', columns: ['period', 'runName', 'fullName', 'netPay'] }), 201).rows, [['2026-09', 'مسير سبتمبر', 'موظف أ', '4800.50']])
  // الموظف اتنقل لفرع برّه النطاق: صفوفه بتختفي من كل المصادر
  await pool.request().query(`UPDATE dbo.employees SET [branchId] = ${Number(B.cairo.id)} WHERE [id] = ${Number(E.a.id)}`)
  assert.deepEqual([await names(U.rep), ok(await run(U.rep, { source: 'attendance', columns: ['fullName'] }), 201).rows, ok(await run(U.pay, { source: 'payroll', columns: ['fullName'] }), 201).rows, (await names(U.cairo)).sort()],
    [['موظف ب'], [], [], ['موظف أ', 'موظف ج']])
  await pool.request().query(`UPDATE dbo.employees SET [branchId] = ${Number(B.riyadh.id)} WHERE [id] = ${Number(E.a.id)}`)
})

test('RB-04: الحفظ والمشاركة — بصلاحية الحفظ، لصاحبه، باسم مايتكررش وأدوار موجودة؛ والمشارَك معاه بيشغّله بصلاحياته ونطاقه هو، وعمود مش متاح له = التقرير كله مش متاح', async () => {
  const definition = people(['fullName', 'jobTitle'])
  assert.equal((await save(U.viewer, { name: 'تقرير', definition })).status, 403)
  for (const [body, message] of [[{ name: 'ت', definition }, 'اسم التقرير من حرفين لحد 120 حرف'], [{ name: 'تقرير', definition: people([]) }, 'اختار من عمود لحد 12 عمود'], [{ name: 'تقرير', definition, sharedRoles: 'x' }, 'أدوار المشاركة مش صحيحة'],
    [{ name: 'تقرير', definition, sharedRoles: ['rb_ghost'] }, 'دور من أدوار المشاركة مش موجود'], [{ name: 'تقرير', definition, sharedRoles: ['rb_off'] }, 'دور من أدوار المشاركة مش موجود']]) refused(await save(U.rep, body), 400, message)
  // صاحب التقرير مايحفظش عمود مش متاح له
  refused(await save(U.rep, { name: 'رواتب', definition: people(['fullName', 'basicSalary']) }), 403, rules.SOURCE_UNAVAILABLE)
  assert.equal(await repo('ReportDefinition').count(), 0)
  // طلبين بنفس الاسم مع بعض = تقرير واحد
  const both = await Promise.all([save(U.rep, { name: '  موظفين   النطاق ', definition, sharedRoles: ['rb_analyst'] }), save(U.rep, { name: 'موظفين النطاق', definition, sharedRoles: ['rb_analyst'] })])
  assert.deepEqual([both.map(response => response.status).sort(), await repo('ReportDefinition').count()], [[201, 409], 1])
  refused(both.find(response => response.status === 409), 409, 'عندك تقرير بنفس الاسم')
  R.people = both.find(response => response.status === 201).body.id
  R.salary = ok(await save(U.pay, { name: 'رواتب النطاق', definition: people(['fullName', 'basicSalary']), sharedRoles: ['rb_analyst', 'rb_lead'] }), 201).id
  R.private = ok(await save(U.rep, { name: 'تقرير خاص', definition: { source: 'attendance', columns: ['fullName', 'workMinutes'], groupBy: 'fullName' } }), 201).id
  const stored = await repo('ReportDefinition').findOne({ where: { id: R.people } })
  assert.deepEqual([stored.ownerUserId, stored.name, stored.source, JSON.parse(stored.definition), stored.sharedRoles], [U.rep.id, 'موظفين النطاق', 'employees', { columns: ['fullName', 'jobTitle'], filters: [], groupBy: null }, 'rb_analyst'])
  // صاحبه: تقاريره وتقرير متشارك مع دوره (الراتب مش متاح له: من غير تعريف)
  const mine = ok(await request(U.rep, 'GET', P)).saved
  assert.deepEqual(mine.map(row => [row.id, row.mine, row.available, row.definition !== null, row.sharedRoles]).sort((a, b) => a[0] - b[0]),
    [[R.people, true, true, true, ['rb_analyst']], [R.salary, false, false, false, []], [R.private, true, true, true, []]].sort((a, b) => a[0] - b[0]))
  // المشارَك معاه (دور محلل): بيشوف المتشارك مع دوره بس، ومايشوفش التقرير الخاص ولا أدوار المشاركة
  const shared = ok(await request(U.viewer, 'GET', P)).saved
  assert.deepEqual(shared.map(row => [row.id, row.mine, row.available, row.definition !== null, row.sharedRoles]).sort((a, b) => a[0] - b[0]), [[R.people, false, true, true, []], [R.salary, false, false, false, []]].sort((a, b) => a[0] - b[0]))
  // التشغيل بنطاق القارئ: محلل الرياض ومحلل القاهرة بيشوفوا موظفين فروعهم من نفس التقرير
  assert.deepEqual([ok(await runSaved(U.viewer, R.people)).rows, ok(await runSaved(U.cairo, R.people)).rows, ok(await runSaved(U.rep, R.people)).name],
    [[['موظف أ', 'محاسب'], ['موظف ب', 'مهندس']], [['موظف ج', 'محاسب']], 'موظفين النطاق'])
  // عمود مش متاح للقارئ = التقرير كله مش متاح؛ وصاحبه بصلاحيته بيشغّله
  for (const user of [U.viewer, U.rep, U.cairo]) refused(await runSaved(user, R.salary), 403, rules.DEFINITION_UNAVAILABLE)
  assert.deepEqual(ok(await runSaved(U.pay, R.salary)).rows, [['موظف أ', '5000.00'], ['موظف ب', '7000.00']])
  // تقرير مش متشارك مع دور القارئ «مش موجود»، وتعديل ومسح تقرير حد تاني كمان
  for (const user of [U.viewer, U.pay, U.cairo]) refused(await runSaved(user, R.private), 404, rules.DEFINITION_NOT_FOUND)
  refused(await runSaved(U.rep, 999999), 404, rules.DEFINITION_NOT_FOUND)
  refused(await save(U.pay, { name: 'موظفين النطاق', definition }, R.people), 404, rules.DEFINITION_NOT_FOUND)
  refused(await request(U.pay, 'DELETE', `${P}/saved/${R.people}`), 404, rules.DEFINITION_NOT_FOUND)
  // تعديل صاحبه: اسم تقرير تاني عنده مرفوض، وشيل المشاركة بيخفيه عن الدور
  refused(await save(U.rep, { name: 'تقرير خاص', definition }, R.people), 409, 'عندك تقرير بنفس الاسم')
  ok(await save(U.rep, { name: 'موظفين النطاق', definition: people(['fullName'], { filters: [{ column: 'jobTitle', op: 'eq', value: 'مهندس' }] }), sharedRoles: [] }, R.people))
  assert.deepEqual([ok(await runSaved(U.rep, R.people)).rows, (await runSaved(U.viewer, R.people)).status, ok(await request(U.viewer, 'GET', P)).saved.map(row => row.id)], [[['موظف ب']], 404, [R.salary]])
  // صاحب التقرير صلاحيته اتشالت: تقريره بيفضل عنده ومابيتشغّلش
  await pool.request().query(`UPDATE dbo.users SET [permissions] = N'["reports.view","reports.save","employees.view"]' WHERE [id] = ${Number(U.pay.id)}`)
  const demoted = { ...U.pay, permissions: '["reports.view","reports.save","employees.view"]' }
  refused(await runSaved(demoted, R.salary), 403, rules.DEFINITION_UNAVAILABLE)
  assert.deepEqual(ok(await request(demoted, 'GET', P)).saved.map(row => [row.id, row.mine, row.available]), [[R.salary, true, false]])
  ok(await request(demoted, 'DELETE', `${P}/saved/${R.salary}`))
  ok(await request(U.rep, 'DELETE', `${P}/saved/${R.private}`))
  assert.deepEqual((await repo('ReportDefinition').find()).map(row => row.id), [R.people])
  // قفل الميزة = المسارات بتختفي
  ok(await request(U.admin, 'PUT', `/modules/features/${rules.REPORT_BUILDER_FEATURE}`, { enabled: false })); modules.invalidate()
  assert.deepEqual([(await request(U.rep, 'GET', P)).status, (await runSaved(U.rep, R.people)).status], [404, 404])
})
