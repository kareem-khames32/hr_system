'use strict'
// B6.1 (ب) على SQL حقيقي: مستوردات تجهيز العميل من Excel — الهيكل (فروع وأقسام) والموظفين: قالب، معاينة من غير كتابة بتقرير أخطاء بالصف، وتطبيق بخدمات
// الإنشاء القايمة؛ لحساب بكل الفروع بصلاحية الإعدادات؛ والموجود بيتخطّى (إعادة رفع نفس الملف آمنة). قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_setup_import_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_setup_import_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-setup-import-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/setup-import/setup-import')
const { writeBulkWorkbook } = require('../src/employees/employee-bulk-update.sheet')
let master, pool, app, ds, base, created = false
const B = {}, U = {}
const repo = name => { assert.match(database, NAME); assert.equal(ds.options.database, database); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
const ok = (response, status = 200) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const refused = (response, status, message) => { assert.deepEqual([response.status, response.body?.message], [status, message]) }
/** ملف Excel بعناوين القالب (أو عناوين مبعوتة) وصفوفه */
const sheet = (kind, rows, headers) => writeBulkWorkbook({ columns: (headers ?? rules.IMPORT_COLUMNS[kind].map(column => column.header)).map(header => ({ header, width: 16, text: true })), rows, references: [], instructions: [] })
async function send(user, kind, step, buffer, fileName = 'import.xlsx') {
  const form = new FormData()
  if (buffer) form.append('file', new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName)
  const response = await fetch(`${base}/setup-import/${kind}/${step}`, { method: 'POST', headers: { Authorization: 'Bearer ' + token(user) }, body: form })
  const raw = await response.text(); let parsed = null
  try { parsed = raw ? JSON.parse(raw) : null } catch { parsed = raw }
  return { status: response.status, body: parsed, type: response.headers.get('content-type') }
}
const structure = rows => sheet('structure', rows)
const person = (print, name, extra = {}) => { const row = { fingerprintCode: print, fullName: name, fullNameEn: '', birthDate: '1990-05-10', gender: 'ذكر', nationality: 'مصري', nationalId: `2900510${String(print).padStart(7, '0')}`, passportNo: '',
  phone: '+201001234567', joinDate: '2024-01-15', branchCode: 'RUH', department: 'المالية', jobTitle: 'محاسب', basicSalary: '8000', ...extra }
  return rules.IMPORT_COLUMNS.employees.map(column => row[column.key]) }

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
  B.old = await repo('Branch').save({ code: 'OLD', name: 'فرع قديم', country: 'SA' })
  await repo('Department').save({ name: 'قسم قديم', branchId: B.old.id, isActive: true })
  U.admin = await repo('User').save({ email: 'admin@setup-import.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', scopeAllBranches: true, permissions: '[]', isActive: true })
  U.branch = await repo('User').save({ email: 'branch@setup-import.invalid', displayName: 'مدير فرع', passwordHash: 'test-only', role: 'employee', branchId: B.old.id, permissions: JSON.stringify(['settings.manage', 'employees.edit']), isActive: true })
  // (ج) حساب بكل الفروع بصلاحية الإعدادات بس — من غير صلاحيات الأرصدة والسلف
  U.setup = await repo('User').save({ email: 'setup@setup-import.invalid', displayName: 'مسؤول تجهيز', passwordHash: 'test-only', role: 'employee', scopeAllBranches: true, permissions: JSON.stringify(['settings.manage']), isActive: true })
  // حساب بكل الفروع بصلاحيات استيراد السلف من غير سلطة الموارد البشرية: طلباته بالنيابة بتستنى سلسلتها
  U.desk = await repo('User').save({ email: 'desk@setup-import.invalid', displayName: 'مكتب التجهيز', passwordHash: 'test-only', role: 'employee', scopeAllBranches: true,
    permissions: JSON.stringify(['settings.manage', 'requests.create_on_behalf', 'loans.exceptional']), isActive: true })
  const chain = await repo('ApprovalChain').save({ code: 'SETUP_LOAN', nameAr: 'سلسلة السلف', isActive: true, autoApprove: false })
  await repo('ApprovalStep').save({ chainId: chain.id, stepOrder: 1, approverRole: 'hr' })
  await repo('RequestType').save({ code: 'LOAN', nameAr: 'سلفة', category: 'financial', destinationHandler: 'loans_installments', requiredFields: '["amount","months"]', approvalChainId: chain.id, isActive: true })
  U.plain = await repo('User').save({ email: 'plain@setup-import.invalid', displayName: 'حساب عادي', passwordHash: 'test-only', role: 'employee', branchId: B.old.id, permissions: JSON.stringify(['employees.edit']), isActive: true })
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

test('SI-01: الصلاحية والملف — بصلاحية الإعدادات ولحساب بكل الفروع؛ القالب بعناوينه؛ وملف بعناوين غلط أو فاضي مرفوض قبل أي حاجة', async () => {
  const good = await structure([['RUH', 'فرع الرياض', 'SA', 'المالية']])
  assert.deepEqual([(await send(U.plain, 'structure', 'preview', good)).status, (await send(U.branch, 'structure', 'preview', good)).status, (await send(U.branch, 'structure', 'apply', good)).status,
    (await send(U.branch, 'employees', 'template')).status], [403, 403, 403, 403])
  refused(await send(U.admin, 'payroll', 'preview', good), 400, 'نوع الاستيراد مش معروف')
  refused(await send(U.admin, 'structure', 'preview'), 400, 'ارفع ملف القالب')
  const template = await send(U.admin, 'employees', 'template')
  assert.deepEqual([template.status, template.type], [200, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
  for (const [file, message] of [[await sheet('structure', [['RUH', 'x']], ['كود الفرع', 'عمود غريب']), 'عمود مش في القالب: عمود غريب'], [await sheet('structure', [['x']], ['اسم الفرع']), 'أعمدة ناقصة: كود الفرع'],
    [await structure([]), 'الملف مافيهوش صفوف بيانات']]) refused(await send(U.admin, 'structure', 'preview', file), 400, message)
  assert.equal(await repo('Branch').count(), 1)
})

test('SI-02: الهيكل — المعاينة مابتكتبش وبتقول الجديد والموجود والأخطاء بالصف؛ ملف فيه خطأ مابيتطبقش منه حاجة؛ والتطبيق بخدمة الفروع والأقسام، وإعادة الرفع بتتخطّى الموجود', async () => {
  const bad = await structure([['RUH', 'فرع الرياض', 'SA', 'المالية'], ['RUH', '', '', 'المبيعات'], ['RUH', '', '', 'المالية'], ['JED', '', 'SA', 'المالية'], ['x', 'فرع', 'US', ''], ['OLD', '', '', 'قسم قديم'], ['', 'من غير كود', 'SA', '']])
  const preview = ok(await send(U.admin, 'structure', 'preview', bad))
  assert.deepEqual([preview.kind, preview.total, preview.toCreate, preview.existing, preview.withErrors, preview.canApply, preview.rows.map(row => [row.row, row.status, row.errors])],
    ['structure', 7, 2, 1, 4, false, [[2, 'NEW', []], [3, 'NEW', []], [4, 'ERROR', ['القسم ده مكرر في الملف لنفس الفرع']], [5, 'ERROR', ['«اسم الفرع» مطلوب لفرع جديد']],
      [6, 'ERROR', ['«كود الفرع» من حرفين لحد 20: حروف إنجليزي وأرقام وشرطة', '«الدولة» EG أو SA']], [8, 'ERROR', ['«كود الفرع» مطلوب']]]])
  // المعاينة ماكتبتش، وتطبيق ملف فيه أخطاء مابيكتبش برضه
  const refusedApply = await send(U.admin, 'structure', 'apply', bad)
  assert.deepEqual([refusedApply.status, refusedApply.body.message, refusedApply.body.report.withErrors, await repo('Branch').count(), await repo('Department').count()],
    [400, 'الملف فيه 4 صف بأخطاء — صلّحها وارفعه تاني (مفيش حاجة اتحفظت)', 4, 1, 1])
  const good = await structure([['RUH', 'فرع الرياض', 'SA', 'المالية'], ['RUH', '', '', 'المبيعات'], ['CAI', 'فرع القاهرة', 'eg', ''], ['OLD', '', '', 'قسم قديم'], ['OLD', '', '', 'قسم جديد']])
  assert.deepEqual((({ toCreate, existing, withErrors, canApply }) => [toCreate, existing, withErrors, canApply])(ok(await send(U.admin, 'structure', 'preview', good))), [4, 1, 0, true])
  assert.deepEqual(ok(await send(U.admin, 'structure', 'apply', good)), { kind: 'structure', total: 5, created: 4, existing: 1, stoppedAt: null })
  const branches = await repo('Branch').find({ order: { id: 'ASC' } }), departments = await repo('Department').find({ order: { id: 'ASC' } })
  B.ruh = branches.find(row => row.code === 'RUH'); B.cai = branches.find(row => row.code === 'CAI')
  assert.deepEqual([branches.map(row => [row.code, row.name, row.country]), departments.map(row => [row.name, row.branchId])],
    [[['OLD', 'فرع قديم', 'SA'], ['RUH', 'فرع الرياض', 'SA'], ['CAI', 'فرع القاهرة', 'EG']], [['قسم قديم', B.old.id], ['المالية', B.ruh.id], ['المبيعات', B.ruh.id], ['قسم جديد', B.old.id]]])
  // إعادة رفع نفس الملف: كله موجود ومفيش حاجة تتعمل
  const again = ok(await send(U.admin, 'structure', 'preview', good))
  assert.deepEqual([again.toCreate, again.existing, again.canApply, ok(await send(U.admin, 'structure', 'apply', good)).created, await repo('Branch').count(), await repo('Department').count()], [0, 5, false, 0, 3, 4])
})

test('SI-03: الموظفين — نفس قواعد إنشاء الموظف في المعاينة (الإلزام والشكل والفرع والقسم والتكرار)، والتطبيق بخدمة إنشاء الموظف (الكود بيتولّد)، والموجود برقم بصمته بيتخطّى', async () => {
  const bad = await sheet('employees', [person(1001, 'محمد أحمد علي حسن'), person(1001, 'سعيد محمود عبد الله', { nationalId: '29005109999999' }), person(1003, 'خالد سمير فتحي نور', { branchCode: 'NOPE' }), person(1004, 'ياسر كمال رضا عمر', { department: 'قسم مش موجود' }),
    person(1005, 'هاني فؤاد صبحي عز', { gender: 'x', basicSalary: 'كتير' }), person(1006, '', { phone: '' }), person(1007, 'عمرو حسين جلال طه', { nationalId: '', passportNo: '' })])
  const preview = ok(await send(U.admin, 'employees', 'preview', bad))
  assert.deepEqual([preview.total, preview.toCreate, preview.withErrors, preview.canApply], [7, 1, 6, false])
  const errorsOf = row => preview.rows.find(item => item.row === row).errors
  assert.deepEqual([errorsOf(3), errorsOf(4), errorsOf(5), errorsOf(6), errorsOf(7)], [['«رقم البصمة» مكرر في الملف (الصف 2)'], ['«كود الفرع» مش موجود — ارفع ملف الهيكل الأول'], ['«القسم» مش موجود في الفرع ده — ارفع ملف الهيكل الأول'],
    ['«الجنس» ذكر أو أنثى', '«الراتب الأساسي» رقم بكسرين بالكتير'], ['«الاسم الكامل بالعربي» مطلوب', '«رقم الجوال» مطلوب']])
  assert.equal(errorsOf(8).length, 1, JSON.stringify(errorsOf(8)))
  assert.equal((await send(U.admin, 'employees', 'apply', bad)).status, 400)
  assert.equal(await repo('Employee').count(), 0)
  const good = await sheet('employees', [person(1001, 'محمد أحمد علي حسن'), person(1002, 'سعيد محمود عبد الله', { department: 'المبيعات', gender: 'أنثى', basicSalary: '9,500.50' }),
    person(1003, 'خالد سمير فتحي نور', { branchCode: 'old', department: 'قسم قديم', nationalId: '', passportNo: 'A1234567' })])
  assert.deepEqual((({ toCreate, withErrors, canApply }) => [toCreate, withErrors, canApply])(ok(await send(U.admin, 'employees', 'preview', good))), [3, 0, true])
  const applied = ok(await send(U.admin, 'employees', 'apply', good))
  assert.deepEqual(applied, { kind: 'employees', total: 3, created: 3, existing: 0, stoppedAt: null }, JSON.stringify(applied))
  const saved = await repo('Employee').find({ order: { fingerprintCode: 'ASC' } })
  assert.deepEqual(saved.map(row => [row.fingerprintCode, row.fullName, row.branchId, row.gender, Number(row.basicSalary), /^EMP-\d+$/.test(row.employeeCode), String(row.joinDate).slice(0, 10)]),
    [['1001', 'محمد أحمد علي حسن', B.ruh.id, 'male', 8000, true, '2024-01-15'], ['1002', 'سعيد محمود عبد الله', B.ruh.id, 'female', 9500.5, true, '2024-01-15'], ['1003', 'خالد سمير فتحي نور', B.old.id, 'male', 8000, true, '2024-01-15']])
  // إعادة الرفع مع موظف جديد وهوية مستخدمة: الموجود بيتخطّى، والهوية المكررة خطأ
  const more = await sheet('employees', [person(1001, 'محمد أحمد علي حسن'), person(1010, 'طارق نبيل شوقي زكي'), person(1011, 'مازن عادل فهمي سعد', { nationalId: saved[1].nationalId })])
  const second = ok(await send(U.admin, 'employees', 'preview', more))
  assert.deepEqual([second.toCreate, second.existing, second.withErrors, second.rows.find(row => row.status === 'ERROR').errors], [1, 1, 1, ['رقم الهوية أو الجواز مسجّل لموظف تاني']])
  assert.equal(await repo('Employee').count(), 3)
})

const http = async (user, route) => { const response = await fetch(base + route, { headers: { Authorization: 'Bearer ' + token(user) } }); return { status: response.status, body: await response.json().catch(() => null) } }
const remainingOf = async (employee, type) => { const view = ok(await http(U.admin, '/leaves/balances/' + employee.id)).find(row => row.balanceType === type); assert.ok(view, `no ${type} balance for ${employee.fingerprintCode}`); return Math.round((view.remaining - view.deficit) * 100) / 100 }

test('SI-04: (ج) الأرصدة الافتتاحية — بصلاحية الأرصدة فوق صلاحية الإعدادات؛ المعاينة مابتكتبش؛ والتطبيق بخدمة تعديل الرصيد (سبب وسجل) لحد ما المتبقي يساوي الملف؛ واللي رصيده زي الملف بيتخطّى', async () => {
  const people = Object.fromEntries((await repo('Employee').find()).map(row => [row.fingerprintCode, row]))
  const before = { a: await remainingOf(people['1001'], 'annual'), b: await remainingOf(people['1002'], 'annual'), c: await remainingOf(people['1003'], 'sick') }
  const target = { a: before.a + 3.5, c: before.c + 2 }
  refused(await send(U.setup, 'balances', 'preview', await sheet('balances', [['1001', 'سنوية', '10']])), 403, 'استيراد الأرصدة محتاج صلاحية إدارة أرصدة الإجازات')
  const bad = await sheet('balances', [['1001', 'سنوية', String(target.a)], ['1001', 'سنوي', '3'], ['9999', 'مرضية', '5'], ['1002', 'عارضة', '4'], ['1003', 'مرضية', '-1']])
  const preview = ok(await send(U.admin, 'balances', 'preview', bad))
  assert.deepEqual([preview.total, preview.toCreate, preview.withErrors, preview.canApply, preview.rows.map(row => [row.row, row.status, row.errors])],
    [5, 1, 4, false, [[2, 'NEW', []], [3, 'ERROR', ['الموظف والنوع ده مكررين في الملف (الصف 2)']], [4, 'ERROR', ['«رقم البصمة» مش لموظف موجود — ارفع ملف الموظفين الأول']], [5, 'ERROR', ['«نوع الرصيد» سنوية أو مرضية']],
      [6, 'ERROR', ['«الرصيد المتبقي بالأيام» رقم من صفر بكسرين بالكتير']]]])
  assert.deepEqual([(await send(U.admin, 'balances', 'apply', bad)).status, await repo('LeaveBalanceAdjustment').count(), await remainingOf(people['1001'], 'annual')], [400, 0, before.a])
  const good = await sheet('balances', [['1001', 'سنوية', String(target.a)], ['1002', 'سنوية', String(before.b)], ['1003', 'مرضية', String(target.c)]])
  assert.deepEqual((({ toCreate, existing, withErrors, canApply }) => [toCreate, existing, withErrors, canApply])(ok(await send(U.admin, 'balances', 'preview', good))), [2, 1, 0, true])
  assert.deepEqual(ok(await send(U.admin, 'balances', 'apply', good)), { kind: 'balances', total: 3, created: 2, existing: 1, stoppedAt: null })
  assert.deepEqual([await remainingOf(people['1001'], 'annual'), await remainingOf(people['1002'], 'annual'), await remainingOf(people['1003'], 'sick')], [target.a, before.b, target.c])
  const adjustments = await repo('LeaveBalanceAdjustment').find({ order: { id: 'ASC' } })
  assert.deepEqual(adjustments.map(row => [row.employeeId, row.balanceType, Number(row.delta), row.reason, row.actorUserId]),
    [[people['1001'].id, 'annual', 3.5, rules.OPENING_BALANCE_REASON, U.admin.id], [people['1003'].id, 'sick', 2, rules.OPENING_BALANCE_REASON, U.admin.id]])
  // إعادة رفع نفس الملف: كل الأرصدة زي الملف — مفيش تعديل تاني
  const again = ok(await send(U.admin, 'balances', 'preview', good))
  assert.deepEqual([again.toCreate, again.existing, again.canApply, ok(await send(U.admin, 'balances', 'apply', good)).created, await repo('LeaveBalanceAdjustment').count()], [0, 3, false, 0, 2])
})

test('SI-05: (ج) السلف القائمة — بصلاحيتَي النيابة والاستثنائية؛ كل صف طلب سلفة بالنيابة بحكم النيابة القايم (من غير سلطة الموارد البشرية بيستنى سلسلته ومفيش سلفة، وبسلطتها بيتعتمد باسم اللي رفع)؛ والطلب القايم بيتخطّى', async () => {
  const people = Object.fromEntries((await repo('Employee').find()).map(row => [row.fingerprintCode, row]))
  const next = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1), period = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
  refused(await send(U.setup, 'loans', 'preview', await sheet('loans', [['1001', '6000', '6', period]])), 403, 'استيراد السلف محتاج صلاحية تقديم الطلبات بالنيابة وصلاحية السلفة الاستثنائية')
  const bad = await sheet('loans', [['1001', '6000', '6', period], ['1001', '6,000.00', '6', period], ['9999', '100', '1', period], ['1002', '0', '2', period], ['1003', '500', '0', period], ['1003', '500', '2', '2020-01'], ['1003', '500', '2', 'قريب']])
  const preview = ok(await send(U.admin, 'loans', 'preview', bad))
  assert.deepEqual([preview.total, preview.toCreate, preview.withErrors, preview.canApply, preview.rows.map(row => [row.row, row.status, row.errors])],
    [7, 1, 6, false, [[2, 'NEW', []], [3, 'ERROR', ['نفس السلفة مكررة في الملف (الصف 2)']], [4, 'ERROR', ['«رقم البصمة» مش لموظف موجود — ارفع ملف الموظفين الأول']], [5, 'ERROR', ['«المتبقي من السلفة» رقم أكبر من صفر بكسرين بالكتير']],
      [6, 'ERROR', ['«عدد الأقساط المتبقية» رقم صحيح من 1 لـ120']], [7, 'ERROR', ['«شهر أول قسط» فات — اكتب الشهر الحالي أو اللي بعده']], [8, 'ERROR', ['«شهر أول قسط» بصيغة YYYY-MM']]]])
  assert.deepEqual([(await send(U.admin, 'loans', 'apply', bad)).status, await repo('Request').count()], [400, 0])
  const good = await sheet('loans', [['1001', '6000', '6', period], ['1002', '1,500.50', '1', period]])
  const applied = ok(await send(U.desk, 'loans', 'apply', good))
  assert.deepEqual(applied, { kind: 'loans', total: 2, created: 2, existing: 0, stoppedAt: null }, JSON.stringify(applied))
  const requests = await repo('Request').find({ order: { id: 'ASC' } })
  assert.deepEqual(requests.map(row => { const payload = JSON.parse(row.payload); return [row.typeCode, row.requesterId, row.createdByUserId, row.status, payload.amount, payload.months, payload.exceptional,
    payload.exceptionalCategory, payload.firstInstallmentPeriod, payload.reason] }),
  [['LOAN', people['1001'].id, U.desk.id, 'UNDER_REVIEW', '6000.00', 6, true, 'OTHER', period, rules.LEGACY_LOAN_REASON], ['LOAN', people['1002'].id, U.desk.id, 'UNDER_REVIEW', '1500.50', 1, true, 'OTHER', period, rules.LEGACY_LOAN_REASON]])
  // من غير سلطة الموارد البشرية: مفيش سلفة ولا قسط ولا قرار من غير اعتماد السلسلة
  assert.deepEqual([await repo('Loan').count(), await repo('LoanInstallment').count(), await repo('RequestApproval').count()], [0, 0, 0])
  // إعادة الرفع مع صف جديد من صاحب سلطة الموارد البشرية: الطلب القايم بيتخطّى، والجديد بيتعتمد باسمه (حكم النيابة القايم) وسلفته بتتسجّل بأقساطها
  const more = await sheet('loans', [['1001', '6000', '6', period], ['1003', '900', '3', period]])
  const second = ok(await send(U.admin, 'loans', 'preview', more))
  assert.deepEqual([second.toCreate, second.existing, second.withErrors, await repo('Request').count()], [1, 1, 0, 2])
  assert.deepEqual(ok(await send(U.admin, 'loans', 'apply', more)), { kind: 'loans', total: 2, created: 1, existing: 1, stoppedAt: null })
  const last = (await repo('Request').find({ order: { id: 'DESC' }, take: 1 }))[0]
  const loans = await repo('Loan').find(), installments = await repo('LoanInstallment').find({ order: { dueDate: 'ASC' } }), decisions = await repo('RequestApproval').find()
  assert.deepEqual([last.requesterId, last.status, loans.map(row => [row.requestId, row.employeeId, Number(row.amount), row.installmentMonths, row.firstInstallmentPeriod]), installments.map(row => [row.loanId, Number(row.amount), String(row.dueDate).slice(0, 7)])[0],
    installments.length, decisions.map(row => [row.requestId, row.approverId, row.action])],
  [people['1003'].id, 'COMPLETED', [[last.id, people['1003'].id, 900, 3, period]], [loans[0].id, 300, period], 3, [[last.id, U.admin.id, 'APPROVED']]])
  // الملف نفسه تاني: الاتنين موجودين
  const third = ok(await send(U.admin, 'loans', 'preview', more))
  assert.deepEqual([third.toCreate, third.existing, third.canApply, await repo('Request').count(), await repo('Loan').count()], [0, 2, false, 3, 1])
})

test('P6A-I01: settings-only account can create an employee despite original route refusing it', async t => {
  const dep=await repo('Department').findOneByOrFail({branchId:B.old.id}); const data=person('69001','\u0645\u062D\u0645\u062F \u0623\u062D\u0645\u062F \u0639\u0644\u064A \u062D\u0633\u0646',{branchCode:'OLD',department:dep.name});
  const direct=await fetch(base+'/employees',{method:'POST',headers:{Authorization:'Bearer '+token(U.setup),'Content-Type':'application/json'},body:JSON.stringify({fullName:'P6A direct'})});
  assert.equal(direct.status,403);
  const result=await send(U.setup,'employees','apply',await sheet('employees',[data]));
  assert.equal(result.status,200,JSON.stringify(result.body));assert.equal(result.body.created,1,JSON.stringify(result.body));
  assert.ok(await repo('Employee').findOneBy({fingerprintCode:'69001'}));
  t.diagnostic(JSON.stringify({direct:direct.status,import:result.status,created:result.body.created}));
});


test('P6A-I03: balance import bypasses the leave module audience while the original adjustment route refuses',async t=>{
 const mods=app.get(require('../src/modules-registry/modules.service').ModulesService);
 const manager=await repo('User').save({email:'p6a-balances@setup-import.invalid',displayName:'P6A balance import',passwordHash:'test-only',role:'employee',scopeAllBranches:true,permissions:JSON.stringify(['settings.manage','leave_balances.manage']),isActive:true});
 const employee=await repo('Employee').findOneByOrFail({fingerprintCode:'69001'});
 await mods.setModule({sub:U.admin.id,role:'super_admin',permissions:['*'],scopeAllBranches:true},'leave',{enabled:true,audience:{mode:'roles',ids:['hr_manager']}});mods.invalidate();
 try{
 const direct=await fetch(base+'/leaves/balances/'+employee.id+'/adjust',{method:'POST',headers:{Authorization:'Bearer '+token(manager),'Content-Type':'application/json'},body:'{}'});assert.equal(direct.status,404);
 const result=await send(manager,'balances','apply',await sheet('balances',[['69001','annual','17']]));assert.equal(result.status,200,JSON.stringify(result.body));assert.equal(result.body.created,1);
 assert.equal(await remainingOf(employee,'annual'),17);t.diagnostic(JSON.stringify({direct:direct.status,import:result.status,balance:17}));
 }finally{await mods.setModule({sub:U.admin.id,role:'super_admin',permissions:['*'],scopeAllBranches:true},'leave',{audience:{mode:'all'}});mods.invalidate()}
});

test('P6A-I04: settings-only account can create organization structure despite original route refusal',async t=>{
 const direct=await fetch(base+'/branches',{method:'POST',headers:{Authorization:'Bearer '+token(U.setup),'Content-Type':'application/json'},body:JSON.stringify({name:'P6A branch',code:'P6AI4',country:'EG'})});assert.equal(direct.status,403);
 const done=await send(U.setup,'structure','apply',await structure([['P6AI4','P6A imported branch','EG','P6A imported department']]));assert.equal(done.status,200,JSON.stringify(done.body));assert.equal(done.body.created,1);
 assert.ok(await repo('Branch').findOneBy({code:'P6AI4'}));t.diagnostic(JSON.stringify({direct:direct.status,import:done.status,created:done.body.created}));
});
