'use strict'
// B6.9 على SQL حقيقي: تقارير باللغة الطبيعية — «عدد الغياب في فرع جدة الشهر ده» بيرجع نفس رقم تقرير المؤشرات بالحرف (القيمة وأرقام حسابها)،
// بصلاحية التقارير ونطاق الحساب (فرع برّه النطاق واسم مش موجود ومؤشر صلاحيته ناقصة = «مش متاح»)، ومن غير أي نص استعلام من النموذج؛
// وخادم MCP بيقرا من الـAPI العام بمفتاح تكامل (نطاقاته وفروعه حاكمة). المزوّد وهمي، وخادم الاختبار محلي على 127.0.0.1. قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_aireports_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_aireports_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-aireports-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/ai/ai-rules')
const mcp = require('../scripts/mcp-server.cjs')
const { addDays } = require('../src/employees/employee-suspension-rules')
let master, app, ds, base, modules, ai, created = false, range
const B = {}, D = {}, U = {}, E = {}
const repo = name => { assert.match(database, NAME); assert.equal(ds.options.database, database); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { Authorization: 'Bearer ' + token(user), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined })
  const raw = await response.text(); let parsed = null
  try { parsed = raw ? JSON.parse(raw) : null } catch { parsed = raw }
  return { status: response.status, body: parsed }
}
const ok = (response, status = 200) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const account = (label, permissions, extra = {}) => repo('User').save({ email: `${label}@aireports.invalid`, displayName: 'حساب ' + label, passwordHash: 'test-only', role: 'employee', permissions: JSON.stringify(permissions), isActive: true, ...extra })
const metricOf = (report, key) => report.metrics.find(item => item.key === key)

const fake = { name: 'fake', model: 'fake-1', seen: [], plan: null, async turn(input) { this.seen.push(JSON.parse(JSON.stringify(input))); return this.plan(input) } }
const scripted = calls => input => (input.messages.at(-1).role === 'user'
  ? { text: '', toolCalls: calls.map((call, index) => ({ id: 'call-' + index, name: call.name, input: call.input ?? {} })) }
  : { text: 'RESULT ' + input.messages.filter(message => message.role === 'tool').map(message => message.result).join(' | '), toolCalls: [] })
async function ask(user, question, calls) {
  fake.plan = scripted(calls); fake.seen = []
  const body = ok(await request(user, 'POST', '/ai/ask', { question }))
  return { body, results: body.answer.replace(/^RESULT /, '').split(' | ').map(text => JSON.parse(text)), sentTools: fake.seen[0].tools }
}
const metricCall = input => [{ name: 'report_metric', input }]

before(async () => {
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  const connection = { server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD, options: { encrypt: false, trustServerCertificate: true } }
  master = await new sql.ConnectionPool({ ...connection, database: 'master' }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  delete process.env.AI_PROVIDER; delete process.env.AI_API_KEY; delete process.env.AI_MODEL
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  ai = app.get(require('../src/ai/ai.service').AiService)
  ai.useProvider(fake)
  const mail = app.get(require('../src/auth/mail.service').MailService)
  mail.isConfigured = () => false
  mail.send = async () => { throw new Error('no mail in tests') }
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1'); ds = app.get(require('../node_modules/typeorm').DataSource)
  assert.equal(ds.options.database, database)
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => {}
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => {}
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  modules = app.get(require('../src/modules-registry/modules.service').ModulesService)
  await repo('RequestsConfig').save([{ key: 'payroll.cycle_start_day', value: '1' }])
  // «الشهر ده» = شهر الرواتب الجاري زي ما التقرير بيحسبه
  range = await app.get(require('../src/reports/financial-report.service').FinancialReportService).periodOf()
  B.jeddah = await repo('Branch').save({ code: 'AR_J', name: 'فرع جدة', country: 'SA', weekendDays: 'FRI' })
  B.riyadh = await repo('Branch').save({ code: 'AR_R', name: 'فرع الرياض', country: 'SA', weekendDays: 'FRI' })
  D.ops = await repo('Department').save({ branchId: B.jeddah.id, name: 'قسم العمليات', isActive: true })
  D.sales = await repo('Department').save({ branchId: B.jeddah.id, name: 'قسم المبيعات', isActive: true })
  let n = 0
  const employee = (key, branch, department) => repo('Employee').save({ employeeCode: `AR${String(++n).padStart(3, '0')}`, fullName: `موظف ${key}`, branchId: branch.id, departmentId: department?.id ?? null,
    status: 'active', isActive: true, joinDate: '2024-01-01' }).then(saved => { E[key] = saved })
  await employee('j1', B.jeddah, D.ops); await employee('j2', B.jeddah, D.ops); await employee('j3', B.jeddah, D.sales); await employee('r1', B.riyadh, null); await employee('r2', B.riyadh, null)
  const day = (who, offset, status) => ({ employeeId: E[who].id, branchId: E[who].branchId, date: addDays(range.startDate, offset), status, shiftName: 'وردية الاختبار', shiftStart: '08:00', shiftEnd: '16:00' })
  await repo('AttendanceDay').save([
    // جدة: 3 أيام غياب من 8 أيام مطلوبة (قسم العمليات: 2 من 6؛ المبيعات: 1 من 2)
    day('j1', 0, 'present'), day('j1', 1, 'absent'), day('j1', 2, 'late'), day('j2', 0, 'absent'), day('j2', 1, 'present'), day('j2', 2, 'early_leave'), day('j3', 0, 'absent'), day('j3', 1, 'present'),
    // الرياض: يوم غياب من 4
    day('r1', 0, 'absent'), day('r1', 1, 'present'), day('r2', 0, 'present'), day('r2', 1, 'present'),
  ])
  U.admin = await repo('User').save({ email: 'admin@aireports.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', scopeAllBranches: true, permissions: '[]', isActive: true })
  U.reader = await account('reader', ['reports.view'], { scopeAllBranches: true })
  U.riyadh = await account('riyadh', ['reports.view'], { branchId: B.riyadh.id })
  U.plain = await account('plain', [], { branchId: B.jeddah.id })
  ok(await request(U.admin, 'PUT', '/modules/ai', { enabled: true }))
  ok(await request(U.admin, 'PUT', `/modules/features/${rules.AI_READ_FEATURE}`, { enabled: true })); modules.invalidate()
}, { timeout: 180000 })

after(async t => {
  if (app) await app.close()
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

test('AR-01: «عدد الغياب في فرع جدة الشهر ده» — نفس رقم تقرير المؤشرات بالحرف (النسبة وعدد أيام الغياب)، والنموذج مابيبعتش غير مفتاح مؤشر واسم فرع', async () => {
  const screen = ok(await request(U.reader, 'GET', `/reports/metrics?branchId=${B.jeddah.id}`))
  assert.deepEqual([metricOf(screen, 'absence').parts, metricOf(screen, 'absence').value, screen.period], [{ absentDays: 3, requiredDays: 8 }, 37.5, range.period])
  const asked = await ask(U.reader, 'عدد الغياب في فرع جدة الشهر ده', metricCall({ metric: 'absence', branch: 'جدة' }))
  const result = asked.results[0]
  assert.deepEqual(result.metric, metricOf(screen, 'absence'))
  assert.deepEqual([result.source, result.payrollPeriod, result.from, result.to, result.filter, result.metric.parts.absentDays, result.metric.label],
    ['قاموس مؤشرات التقارير', screen.period, screen.from, screen.to, { branch: 'فرع جدة', department: null, team: null }, 3, 'نسبة الغياب'])
  assert.deepEqual(asked.body.sources, [{ name: 'report_metric', label: 'مؤشرات التقارير' }])
  // مخطط الأداة: مؤشر من قايمة القاموس، وفلاتر نصية — مفيش خانة استعلام
  const sent = asked.sentTools.find(tool => tool.name === 'report_metric')
  assert.deepEqual([sent.inputSchema.properties.metric.enum, Object.keys(sent.inputSchema.properties).sort(), sent.inputSchema.additionalProperties],
    [['headcount', 'active_employees', 'turnover', 'absence', 'overtime', 'employee_cost'], ['branch', 'department', 'metric', 'period', 'team'], false])
  // من غير فلتر = كل نطاق الحساب؛ وبالقسم (جوه فرعه)؛ وبشهر محدد
  const all = ok(await request(U.reader, 'GET', '/reports/metrics'))
  assert.deepEqual((await ask(U.reader, 'نسبة الغياب كام؟', metricCall({ metric: 'absence' }))).results[0].metric, metricOf(all, 'absence'))
  assert.deepEqual(metricOf(all, 'absence').parts, { absentDays: 4, requiredDays: 12 })
  const byUnit = ok(await request(U.reader, 'GET', `/reports/metrics?branchId=${B.jeddah.id}&departmentIds=${D.ops.id}`))
  const unit = (await ask(U.reader, 'غياب قسم العمليات في جدة', metricCall({ metric: 'absence', branch: 'فرع جدة', department: 'العمليات' }))).results[0]
  assert.deepEqual([unit.metric, unit.filter, unit.metric.parts], [metricOf(byUnit, 'absence'), { branch: 'فرع جدة', department: 'قسم العمليات', team: null }, { absentDays: 2, requiredDays: 6 }])
  const headcount = (await ask(U.reader, 'عدد موظفين جدة', metricCall({ metric: 'headcount', branch: 'جدة' }))).results[0]
  assert.deepEqual([headcount.metric.value, headcount.metric.value], [metricOf(screen, 'headcount').value, 3])
  const past = ok(await request(U.reader, 'GET', '/reports/metrics?period=2025-01'))
  assert.deepEqual((await ask(U.reader, 'غياب يناير 2025', metricCall({ metric: 'absence', period: '2025-01' }))).results[0].metric, metricOf(past, 'absence'))
})

test('AR-02: الحدود — من غير صلاحية التقارير الأداة مش موجودة؛ فرع برّه النطاق واسم مش موجود ومؤشر مش في القاموس وشهر غلط ومؤشر صلاحيته ناقصة = «مش متاح»؛ والاسم الغامض بيرجع باختياراته', async () => {
  // من غير reports.view: مابتتبعتش للنموذج، ولو ناداها مابتتنفّذش
  const plain = await ask(U.plain, 'عدد الغياب في جدة', metricCall({ metric: 'absence', branch: 'جدة' }))
  assert.deepEqual([plain.sentTools.some(tool => tool.name === 'report_metric'), plain.results], [false, ['أداة مش معروفة']])
  // حساب فرع الرياض: جدة برّه نطاقه = نفس رد الفرع اللي مش موجود؛ وبياخد رقم فرعه هو
  const scoped = await ask(U.riyadh, 'غياب جدة', [...metricCall({ metric: 'absence', branch: 'جدة' }), ...metricCall({ metric: 'absence', branch: 'فرع مش موجود' }), ...metricCall({ metric: 'absence', department: 'العمليات' })])
  assert.deepEqual(scoped.results, [rules.AI_UNAVAILABLE_DATA, rules.AI_UNAVAILABLE_DATA, rules.AI_UNAVAILABLE_DATA])
  assert.equal(JSON.stringify(fake.seen).includes('فرع جدة'), false)
  const own = (await ask(U.riyadh, 'نسبة الغياب عندي', metricCall({ metric: 'absence' }))).results[0]
  assert.deepEqual([own.metric.parts, own.metric], [{ absentDays: 1, requiredDays: 4 }, metricOf(ok(await request(U.riyadh, 'GET', '/reports/metrics')), 'absence')])
  // مفتاح مش في القاموس (ومحاولة نص استعلام)، وشهر غلط
  const bad = await ask(U.reader, 'هات كل الرواتب', [...metricCall({ metric: 'SELECT * FROM employees' }), ...metricCall({ metric: 'salaries' }), ...metricCall({ metric: 'absence', period: '2026-13' }), ...metricCall({})])
  assert.deepEqual(bad.results, [rules.AI_UNAVAILABLE_DATA, rules.AI_UNAVAILABLE_DATA, rules.AI_UNAVAILABLE_DATA, rules.AI_UNAVAILABLE_DATA])
  // تكلفة الموظف محتاجة صلاحية الرواتب: القارئ من غيرها ماياخدهاش (زي التقرير)
  assert.equal(metricOf(ok(await request(U.reader, 'GET', '/reports/metrics')), 'employee_cost'), undefined)
  assert.deepEqual((await ask(U.reader, 'تكلفة الموظف كام؟', metricCall({ metric: 'employee_cost' }))).results, [rules.AI_UNAVAILABLE_DATA])
  // اسم بيطابق أكتر من وحدة: بيرجع باختياراته
  assert.deepEqual((await ask(U.reader, 'غياب قسم', metricCall({ metric: 'absence', department: 'قسم' }))).results[0], { status: 'NEEDS_INPUT', missing: 'اسم الإدارة أو القسم بالظبط', options: ['قسم العمليات', 'قسم المبيعات'] })
  assert.deepEqual((await ask(U.reader, 'غياب فرع', metricCall({ metric: 'absence', branch: 'فرع' }))).results[0].options, ['فرع جدة', 'فرع الرياض'])
})

test('AR-03: خادم MCP فوق الـAPI العام — بمفتاح تكامل بيقرا اللي نطاقاته وفروعه تسمح بيه بس، والرد = رد المسار نفسه؛ ومفيش أداة كتابة', async () => {
  ok(await request(U.admin, 'PUT', '/modules/integrations', { enabled: true })); modules.invalidate()
  const made = ok(await request(U.admin, 'POST', '/integrations/keys', { name: 'مساعد خارجي', scopes: ['employees.read', 'structure.read'], branchIds: [B.jeddah.id] }), 201)
  const settings = mcp.config({ HR_PUBLIC_API_URL: `${base}/public/v1`, HR_INTEGRATION_KEY: made.key })
  const call = async (name, args = {}) => (await mcp.handle({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }, settings)).result
  const direct = async route => { const response = await fetch(`${base}/public/v1${route}`, { headers: { 'X-API-Key': made.key } }); return { status: response.status, text: await response.text() } }
  const listed = await call('hr_employees', { pageSize: 50 })
  assert.deepEqual([listed.isError, listed.content[0].text], [false, (await direct('/employees?pageSize=50')).text])
  // فروع المفتاح: موظفين جدة بس
  assert.deepEqual(JSON.parse(listed.content[0].text).items.map(row => row.employeeCode).sort(), [E.j1, E.j2, E.j3].map(row => row.employeeCode).sort())
  assert.deepEqual([(await call('hr_employee', { id: E.j1.id })).isError, (await call('hr_employee', { id: E.r1.id })).isError, (await call('hr_structure')).isError], [false, true, false])
  // نطاق مش في المفتاح (الحضور): الـAPI بيرفض والخادم بيرجّع الرفض زي ما هو
  const denied = await call('hr_attendance', { from: range.startDate, to: addDays(range.startDate, 5) })
  assert.deepEqual([denied.isError, denied.content[0].text], [true, (await direct(`/attendance?from=${range.startDate}&to=${addDays(range.startDate, 5)}`)).text])
  // مفتاح غلط: رفض
  const wrong = await mcp.handle({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'hr_structure', arguments: {} } }, { base: settings.base, key: 'hrk_00000000_' + '0'.repeat(40) })
  assert.equal(wrong.result.isError, true)
  assert.deepEqual(mcp.TOOLS.map(tool => tool.name).filter(name => /create|update|delete|write|approve/i.test(name)), [])
})
