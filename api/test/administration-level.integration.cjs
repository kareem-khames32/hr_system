'use strict'
// مستوى «الإدارة» فوق القسم ومعتمد «مدير الإدارة» (قرار المالك 27 سبتمبر: الهيكل «الإدارة ← القسم ← الفريق») — إثبات حي بـSQL وHTTP
// فعليين على قاعدة مؤقتة عشوائية تُحذف في النهاية (hr_administration_level_test_<16 hex> — لا مساس بقاعدة الشركة). التوكنات موقّعة محليًا
// بسر عشوائي. الإدارة نوع وحدة على شجرة الأقسام (departments.unitType، ترحيل 072):
//  AL-01) إنشاء إدارة وأقسام تحتها وقسم فرعي، والإدارة التنفيذية بتتعمل «إدارة» لوحدها، وإدارة فرع تحت الإدارة التنفيذية من فرع تاني.
//  AL-02) قواعد الأب: إدارة تحت قسم أو تحت إدارة مش تنفيذية، وقسم تحت إدارة فرع تاني، وتحويل قسم لإدارة وأبوه مايصلحش، وقيمة نوع غلط
//         (الـDTO والخدمة) — كلهم مرفوضين برسائل واضحة ومفيش حاجة بتتكتب.
//  AL-03) المسموح: تحويل قسم رئيسي أو تحت الإدارة التنفيذية لإدارة والعكس، وتحويل إدارة لقسم وأقسامها بتبقى أقسام فرعية، وإدارات تحت
//         إدارة بتتحول قسم مرفوضة (بيانات قديمة)، والهيكل القائم بيتعدّل عادي من غير تعديل إجباري.
//  AL-04) الإدارة التنفيذية: «إدارة» دايمًا، ومالهاش أب، وشيل تعليمها (صريح أو ضمني) مرفوض طول ما تحتها إدارات — ومفيش حاجة بتتكتب.
//  AL-05..AL-09) «مدير الإدارة»: التوجيه العادي، وقسم فرعي على مستويين، ومدير الإدارة هو مقدّم الطلب بيطلع للإدارة التنفيذية (برابطها لفرع
//         تاني) وبيعتمد من حساب «كل الفروع»، والإيقاف (مفيش قسم / مفيش إدارة / الإدارة مالهاش مدير / المدير الوحيد هو مقدّم الطلب)،
//         والسرّي مابيتخطّاهاش، والدور مش مقبول كجهة تصعيد.
//  AL-10) فلتر المسير وجمهور العطلات على إدارة بيشمل أقسامها في فرعها بس.
//  AL-11) «الإدارة» في بطاقة صاحب الطلب: الاسم لنطاق فرعها، والإدارة التنفيذية برّه النطاق باسمها العام، وحجب orgHidden.
//  AL-12) حساب الفرع: إدارة في فرعه وقسم تحتها، والربط تحت الإدارة التنفيذية برّه نطاقه 403، والقائمة ماتكشفش اسمها.
//  AL-13) تعليم قسم «إدارة تنفيذية» بيخلّيه «إدارة» تلقائي، والتنفيذية القديمة إدارة عادية تتحول قسم وأقسامها فرعية.
// Run (من api/): node --test test/administration-level.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_administration_level_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_administration_level_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-administration-level-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
// سبتمبر 2026 (الراحة الجمعة والسبت): 20 أحد و21 اتنين — أيام شغل عادية
const HOLIDAY_SALES = '2026-09-20', HOLIDAY_EXEC = '2026-09-21'
const EXEC_NAME = 'الإدارة التنفيذية للمجموعة'
const UNIT_TYPE_MESSAGE = 'نوع الوحدة لازم يكون «إدارة» (ADMINISTRATION) أو «قسم» (DEPARTMENT)'
const EXECUTIVE_HAS_NO_PARENT = '«الإدارة التنفيذية» فوق كل الإدارات والأقسام، فمالهاش أب — خليها إدارة رئيسية (من غير أب)'
const EXECUTIVE_IS_ADMINISTRATION = '«الإدارة التنفيذية» نوعها «إدارة» دايمًا — مينفعش تتحول «قسم»'
const MOVE_ADMINISTRATIONS = 'خلّي الإدارات دي رئيسية (من غير أب) الأول'
const underAdministrationRule = (name, word) => `الإدارة مابتتحطش تحت «${name}» (${word}) — الإدارة بتبقى رئيسية (من غير أب) أو تحت «الإدارة التنفيذية» بس`
let app, ds, master, base, created = false
const B = {}, D = {}, E = {}, U = {}, C = {}, R = {}
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }

function token(user) {
  const payload = { sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') }
  if (user.scopeAllBranches === true) payload.scopeAllBranches = true
  return jwt.sign(payload)
}
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(user)}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const ok = (response, status = 201) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const messageOf = response => [].concat(response.body?.message ?? []).join(' | ')
const refused = (response, status, message) => {
  assert.equal(response.status, status, JSON.stringify(response.body))
  if (typeof message === 'string') assert.equal(messageOf(response), message)
  else if (message) assert.match(messageOf(response), message)
}
// صورة كاملة لجدول الأقسام: «مفيش حاجة اتغيرت» بعد أي رفض
const departmentRows = () => ds.query(`SELECT [id], [name], [branchId], [parentId], [unitType], [managerEmployeeId], [isExecutive]
  FROM [departments] ORDER BY [id]`)
const draftOf = async (user, typeCode) => ok(await request(user, 'POST', '/requests', { typeCode, payload: {} }))
const submitNew = async (user, typeCode = 'AL_REQ') => request(user, 'POST', `/requests/${(await draftOf(user, typeCode)).id}/submit`)
const stepsOf = async id => JSON.parse((await repo('Request').findOneByOrFail({ id })).resolvedSteps).map(step => [step.role, step.approverEmployeeId])
const approve = (user, id) => request(user, 'POST', `/requests/${id}/act`, { action: 'APPROVE' })

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system')
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME,
    password: env.DB_PASSWORD, database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  // لحاق الإقلاع (بعد 30 و60 ثانية) مهمتان خلفيتان مالهمش دعوة بالهيكل
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assert.equal(ds.options.database, database)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`

  await repo('RequestsConfig').save([
    { key: 'attendance.weekend_days', value: 'FRI,SAT' }, { key: 'system.country', value: 'EG' },
    { key: 'payroll.cycle_start_day', value: '23' }, { key: 'payroll.monthly_days', value: '30' }, { key: 'payroll.daily_hours', value: '8' },
    { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' }, { key: 'payroll.late_deduction_enabled', value: 'true' },
    { key: 'attendance.absence_penalty_days', value: '1' },
  ])
  B.main = await repo('Branch').save({ code: 'AL_MAIN', name: 'الفرع الرئيسي', country: 'EG', weekendDays: 'FRI,SAT' })
  B.nasr = await repo('Branch').save({ code: 'AL_NASR', name: 'فرع النصر', country: 'EG', weekendDays: 'FRI,SAT' })
  B.maadi = await repo('Branch').save({ code: 'AL_MAADI', name: 'فرع المعادي', country: 'EG', weekendDays: 'FRI,SAT' })
  let n = 0
  const employee = (fullName, branch, extra = {}) => repo('Employee').save({ employeeCode: `AL${String(++n).padStart(3, '0')}`, fullName, branchId: branch.id,
    joinDate: '2020-01-01', status: 'active', isActive: true, basicSalary: 9000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0,
    workNatureAllowance: 0, otherAllowance: 0, currency: 'EGP', payMethod: 'cash', ...extra })
  E.ceo = await employee('الرئيس التنفيذي', B.main)
  E.execOffice = await employee('موظف مكتب الرئيس', B.main)
  E.opsHead = await employee('مدير إدارة العمليات', B.main)
  E.opsStaff = await employee('موظف التشغيل', B.main)
  E.salesHead = await employee('مدير إدارة المبيعات', B.nasr)
  E.retailLead = await employee('رئيس فريق التجزئة', B.nasr)
  E.salesStaff = await employee('موظف التجزئة', B.nasr)
  E.subStaff = await employee('موظف فروع التجزئة', B.nasr)
  E.nasrExecStaff = await employee('موظف خدمة عملاء النصر', B.nasr)
  E.noDept = await employee('موظف من غير قسم', B.nasr)
  E.noAdminStaff = await employee('أمين مخازن المعادي', B.maadi)
  E.noMgrStaff = await employee('محاسب المعادي', B.maadi)
  // المدير المباشر المسجّل لموظف التجزئة (لخطوة «المدير المباشر» جنب «مدير الإدارة»)
  await repo('Employee').update({ id: E.salesStaff.id }, { managerEmployeeId: E.retailLead.id })

  const user = (key, role, values) => repo('User').save({ email: `${key}@administration-level.invalid`, displayName: key, passwordHash: 'test-only',
    role, branchId: null, permissions: '[]', ...values }).then(row => { U[key] = row })
  await user('admin', 'super_admin', { permissions: '["*"]' })
  // حساب فرع النصر: الأقسام وعرض الطلبات في فرعه بس
  await user('nasrHr', 'hr_manager', { branchId: B.nasr.id, permissions: JSON.stringify(['org.manage', 'requests.view_all']) })
  // الرئيس التنفيذي بحساب «كل الفروع» (بيعتمد طلبات فروع تانية)
  await user('ceo', 'employee', { branchId: B.main.id, employeeId: E.ceo.id, scopeAllBranches: true })
  for (const key of ['opsHead', 'opsStaff', 'salesHead', 'retailLead', 'salesStaff', 'subStaff', 'nasrExecStaff', 'noDept', 'noAdminStaff', 'noMgrStaff']) {
    await user(key, 'employee', { branchId: E[key].branchId, employeeId: E[key].id })
  }

  const chain = async (code, steps) => ok(await request(U.admin, 'POST', '/settings/approval-chains', { code, nameAr: `سلسلة ${code}`, steps }))
  const type = async (code, chainId) => ok(await request(U.admin, 'POST', '/settings/request-types', { nameAr: `طلب ${code}`, category: 'employee_relations',
    code, destinationHandler: 'none', customFields: [], approvalChainId: chainId, visibleTo: { mode: 'all', ids: [] } }))
  C.only = await chain('AL_CHAIN', [{ approverRole: 'administration_manager_of_requester' }])
  C.both = await chain('AL_BOTH_CHAIN', [{ approverRole: 'direct_manager_of_requester' }, { approverRole: 'administration_manager_of_requester' }])
  C.secret = await chain('AL_SECRET_CHAIN', [{ approverRole: 'direct_manager_of_requester' }, { approverRole: 'administration_manager_of_requester' }])
  await type('AL_REQ', C.only.id)
  await type('AL_BOTH', C.both.id)
  await type('AL_SECRET', C.secret.id)
  await repo('RequestType').update({ code: 'AL_SECRET' }, { isConfidential: true })
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), os.tmpdir()); assert.match(path.basename(uploads), /^hr-administration-level-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'administration-level fixture cleanup failed')
})

test('AL-01: إدارة وأقسامها وقسم فرعي؛ الإدارة التنفيذية بتتعمل «إدارة» لوحدها؛ وإدارة فرع تحت الإدارة التنفيذية من فرع تاني', async () => {
  const create = async (values, status = 201) => ok(await request(U.admin, 'POST', '/departments', values), status)
  // الإدارة التنفيذية من غير نوع مبعوت: التعليم بيخلّيها «إدارة»
  D.exec = await create({ name: EXEC_NAME, code: 'AL_EXEC', branchId: B.main.id, isExecutive: true, managerEmployeeId: E.ceo.id })
  assert.deepEqual([D.exec.unitType, D.exec.isExecutive], ['ADMINISTRATION', true])
  D.execOffice = await create({ name: 'مكتب الرئيس', code: 'AL_OFFICE', branchId: B.main.id, parentId: D.exec.id })
  // إدارة في فرع النصر تحت الإدارة التنفيذية (فرع تاني — قاعدة الفروع القائمة)، وأقسامها وقسم فرعي على مستويين
  D.sales = await create({ name: 'إدارة المبيعات', code: 'AL_SALES', branchId: B.nasr.id, parentId: D.exec.id, unitType: 'ADMINISTRATION',
    managerEmployeeId: E.salesHead.id })
  D.retail = await create({ name: 'التجزئة', code: 'AL_RETAIL', branchId: B.nasr.id, parentId: D.sales.id })
  D.retailSub = await create({ name: 'فروع التجزئة', code: 'AL_RETAIL_SUB', branchId: B.nasr.id, parentId: D.retail.id })
  D.nasrUnderExec = await create({ name: 'خدمة عملاء النصر', code: 'AL_NASR_CARE', branchId: B.nasr.id, parentId: D.exec.id })
  // إدارة رئيسية في الفرع الرئيسي وقسم تحتها، وإدارة من غير مدير، وقسم رئيسي من غير إدارة
  D.ops = await create({ name: 'إدارة العمليات', code: 'AL_OPS', branchId: B.main.id, unitType: 'ADMINISTRATION', managerEmployeeId: E.opsHead.id })
  D.opsDept = await create({ name: 'التشغيل', code: 'AL_OPS_RUN', branchId: B.main.id, parentId: D.ops.id })
  D.noMgr = await create({ name: 'إدارة المعادي', code: 'AL_MAADI_ADM', branchId: B.maadi.id, unitType: 'ADMINISTRATION' })
  D.noMgrDept = await create({ name: 'حسابات المعادي', code: 'AL_MAADI_ACC', branchId: B.maadi.id, parentId: D.noMgr.id })
  D.maadiRoot = await create({ name: 'مخازن المعادي', code: 'AL_MAADI_STORE', branchId: B.maadi.id })
  assert.deepEqual([D.sales, D.ops, D.noMgr].map(d => [d.unitType, d.isExecutive]), [['ADMINISTRATION', false], ['ADMINISTRATION', false], ['ADMINISTRATION', false]])
  assert.deepEqual([D.execOffice, D.retail, D.retailSub, D.nasrUnderExec, D.opsDept, D.noMgrDept, D.maadiRoot].map(d => d.unitType), Array(7).fill('DEPARTMENT'))
  assert.deepEqual([D.retail.parentId, D.retailSub.parentId], [D.sales.id, D.retail.id])
  // القائمة بترجّع النوع
  const listed = ok(await request(U.admin, 'GET', '/departments'), 200)
  assert.equal(listed.find(row => row.id === D.sales.id).unitType, 'ADMINISTRATION')
  assert.equal(listed.find(row => row.id === D.retailSub.id).unitType, 'DEPARTMENT')
  // الموظفين في وحداتهم (رئيس فريق التجزئة في التجزئة، ومدير المبيعات على الإدارة مباشرة)
  for (const [emp, dept] of [[E.ceo, D.exec], [E.execOffice, D.execOffice], [E.opsHead, D.ops], [E.opsStaff, D.opsDept], [E.salesHead, D.sales],
    [E.retailLead, D.retail], [E.salesStaff, D.retail], [E.subStaff, D.retailSub], [E.nasrExecStaff, D.nasrUnderExec], [E.noAdminStaff, D.maadiRoot],
    [E.noMgrStaff, D.noMgrDept]]) {
    await repo('Employee').update({ id: emp.id }, { departmentId: dept.id })
    emp.departmentId = dept.id
  }
})

test('AL-02: قواعد الأب — إدارة تحت قسم أو إدارة عادية، قسم تحت إدارة فرع تاني، تحويل لإدارة وأبوه مايصلحش، ونوع غلط: كله مرفوض ومفيش حاجة بتتكتب', async () => {
  const before = await departmentRows()
  refused(await request(U.admin, 'POST', '/departments', { name: 'إدارة تحت قسم', branchId: B.nasr.id, parentId: D.retail.id, unitType: 'ADMINISTRATION' }), 400,
    underAdministrationRule('التجزئة', 'قسم'))
  refused(await request(U.admin, 'POST', '/departments', { name: 'إدارة تحت إدارة', branchId: B.nasr.id, parentId: D.sales.id, unitType: 'ADMINISTRATION' }), 400,
    underAdministrationRule('إدارة المبيعات', 'إدارة'))
  refused(await request(U.admin, 'PATCH', `/departments/${D.ops.id}`, { parentId: D.execOffice.id }), 400, underAdministrationRule('مكتب الرئيس', 'قسم'))
  // قسم تحت إدارة فرع تاني (مش التنفيذية): قاعدة الفروع القائمة بنفس رسايلها
  refused(await request(U.admin, 'POST', '/departments', { name: 'قسم متقاطع', branchId: B.main.id, parentId: D.sales.id }), 400, 'القسم الأب في فرع مختلف')
  refused(await request(U.admin, 'PATCH', `/departments/${D.opsDept.id}`, { parentId: D.sales.id }), 400, 'القسم الأب في فرع مختلف — اختر أباً من فرع القسم نفسه')
  // تحويل قسم لإدارة: أبوه لازم يصلح أب لإدارة
  refused(await request(U.admin, 'PATCH', `/departments/${D.retailSub.id}`, { unitType: 'ADMINISTRATION' }), 400, underAdministrationRule('التجزئة', 'قسم'))
  refused(await request(U.admin, 'PATCH', `/departments/${D.retail.id}`, { unitType: 'ADMINISTRATION' }), 400, underAdministrationRule('إدارة المبيعات', 'إدارة'))
  // قيمة غلط: الـDTO بيرفضها، والخدمة كمان (null بيعدّي من @IsOptional)
  refused(await request(U.admin, 'POST', '/departments', { name: 'نوع غلط', branchId: B.nasr.id, unitType: 'TEAM' }), 400, UNIT_TYPE_MESSAGE)
  refused(await request(U.admin, 'PATCH', `/departments/${D.retail.id}`, { unitType: 'TEAM' }), 400, UNIT_TYPE_MESSAGE)
  refused(await request(U.admin, 'PATCH', `/departments/${D.retail.id}`, { unitType: null }), 400, UNIT_TYPE_MESSAGE)
  assert.deepEqual(await departmentRows(), before)
})

test('AL-03: المسموح — تحويل قسم رئيسي أو تحت الإدارة التنفيذية لإدارة والعكس، وإدارة لقسم وأقسامها فرعية، والهيكل القائم بيتعدّل من غير إجبار', async () => {
  const patch = (dept, body) => request(U.admin, 'PATCH', `/departments/${dept.id}`, body)
  assert.equal(ok(await patch(D.maadiRoot, { unitType: 'ADMINISTRATION' }), 200).unitType, 'ADMINISTRATION')
  assert.equal(ok(await patch(D.maadiRoot, { unitType: 'DEPARTMENT' }), 200).unitType, 'DEPARTMENT')
  // قسم فرع تحت الإدارة التنفيذية من فرع تاني يتحول إدارة (الأب التنفيذي يصلح للإدارة) ويرجع
  assert.equal(ok(await patch(D.nasrUnderExec, { unitType: 'ADMINISTRATION' }), 200).unitType, 'ADMINISTRATION')
  assert.equal(ok(await patch(D.nasrUnderExec, { unitType: 'DEPARTMENT' }), 200).unitType, 'DEPARTMENT')
  // إدارة تتحول قسم: قسمها فاضل تحتها وبقى قسم فرعي، وترجع إدارة (رئيسية)
  assert.equal(ok(await patch(D.noMgr, { unitType: 'DEPARTMENT' }), 200).unitType, 'DEPARTMENT')
  assert.equal((await repo('Department').findOneByOrFail({ id: D.noMgrDept.id })).parentId, D.noMgr.id)
  assert.equal(ok(await patch(D.noMgr, { unitType: 'ADMINISTRATION' }), 200).unitType, 'ADMINISTRATION')
  // إدارة تحتها إدارة (بيانات قديمة اتكتبت من برّه القواعد) مابتتحولش قسم
  const legacy = await repo('Department').save({ name: 'إدارة قديمة تحت إدارة', code: 'AL_LEGACY', branchId: B.main.id, parentId: D.ops.id,
    unitType: 'ADMINISTRATION', isActive: true })
  try {
    const before = await departmentRows()
    refused(await patch(D.ops, { unitType: 'DEPARTMENT' }), 400,
      `مينفعش «إدارة العمليات» تتحول «قسم» وتحتها إدارات زي «إدارة قديمة تحت إدارة» — الإدارة مابتتحطش تحت قسم: ${MOVE_ADMINISTRATIONS}`)
    assert.deepEqual(await departmentRows(), before)
    // والبيانات القديمة نفسها مابتمنعش تعديل باقي الحقول (الهيكل بيتفحص لما يتغيّر بس)
    assert.equal(ok(await patch(legacy, { name: 'إدارة قديمة — اسم جديد' }), 200).name, 'إدارة قديمة — اسم جديد')
  } finally {
    await repo('Department').update({ id: legacy.id }, { parentId: null })
  }
  // الشاشة بتبعت الأب والنوع القائمين مع أي تعديل: مايتقفلش
  const renamed = ok(await patch(D.retailSub, { name: 'فروع التجزئة', parentId: D.retail.id, unitType: 'DEPARTMENT', branchId: B.nasr.id }), 200)
  assert.deepEqual([renamed.parentId, renamed.unitType], [D.retail.id, 'DEPARTMENT'])
  const execSame = ok(await patch(D.exec, { name: EXEC_NAME, parentId: null, unitType: 'ADMINISTRATION', isExecutive: true, branchId: B.main.id }), 200)
  assert.deepEqual([execSame.unitType, execSame.isExecutive], ['ADMINISTRATION', true])
})

test('AL-04: الإدارة التنفيذية «إدارة» دايمًا ومالهاش أب، وشيل تعليمها (صريح أو ضمني) مرفوض طول ما تحتها إدارات', async () => {
  const before = await departmentRows()
  refused(await request(U.admin, 'PATCH', `/departments/${D.exec.id}`, { unitType: 'DEPARTMENT' }), 400, EXECUTIVE_IS_ADMINISTRATION)
  refused(await request(U.admin, 'POST', '/departments', { name: 'تنفيذية قسم', branchId: B.maadi.id, isExecutive: true, unitType: 'DEPARTMENT' }), 400,
    EXECUTIVE_IS_ADMINISTRATION)
  refused(await request(U.admin, 'PATCH', `/departments/${D.exec.id}`, { parentId: D.ops.id }), 400, EXECUTIVE_HAS_NO_PARENT)
  refused(await request(U.admin, 'POST', '/departments', { name: 'تنفيذية تحت إدارة', branchId: B.main.id, parentId: D.ops.id, isExecutive: true }), 400,
    EXECUTIVE_HAS_NO_PARENT)
  refused(await request(U.admin, 'PATCH', `/departments/${D.opsDept.id}`, { isExecutive: true }), 400, EXECUTIVE_HAS_NO_PARENT)
  refused(await request(U.admin, 'PATCH', `/departments/${D.exec.id}`, { isExecutive: false }), 400,
    `مينفعش تشيل «الإدارة التنفيذية» من «${EXEC_NAME}» وتحتها إدارات زي «إدارة المبيعات» — الإدارة مابتتحطش غير تحت «الإدارة التنفيذية»: ${MOVE_ADMINISTRATIONS}`)
  refused(await request(U.admin, 'PATCH', `/departments/${D.ops.id}`, { isExecutive: true }), 400,
    `مينفعش تعلّم قسم تاني «إدارة تنفيذية» و«${EXEC_NAME}» (الإدارة التنفيذية الحالية) تحتها إدارات زي «إدارة المبيعات» — ${MOVE_ADMINISTRATIONS}`)
  refused(await request(U.admin, 'POST', '/departments', { name: 'تنفيذية جديدة', branchId: B.maadi.id, isExecutive: true }), 400,
    /مينفعش تعلّم قسم تاني «إدارة تنفيذية»/)
  assert.deepEqual(await departmentRows(), before)
})

test('AL-05: «مدير الإدارة» — موظف قسم تحت إدارة بيروح لمديرها، وهو بس اللي بيعتمد', async () => {
  const submitted = ok(await submitNew(U.salesStaff))
  assert.equal(submitted.status, 'UNDER_REVIEW')
  assert.deepEqual(await stepsOf(submitted.id), [['administration_manager_of_requester', E.salesHead.id]])
  assert.ok(ok(await request(U.salesHead, 'GET', '/requests/inbox'), 200).some(row => row.id === submitted.id), 'الطلب في صندوق مدير الإدارة')
  assert.equal((await approve(U.retailLead, submitted.id)).status, 403, 'المدير المباشر مش صاحب الخطوة')
  assert.equal((await approve(U.ceo, submitted.id)).status, 403, 'الرئيس التنفيذي مش صاحب الخطوة')
  assert.ok(['APPROVED', 'COMPLETED'].includes(ok(await approve(U.salesHead, submitted.id)).status))
  R.sales = submitted
  // وموظف قسم تحت إدارة العمليات بيروح لمديرها
  const ops = ok(await submitNew(U.opsStaff))
  assert.deepEqual(await stepsOf(ops.id), [['administration_manager_of_requester', E.opsHead.id]])
})

test('AL-06: قسم فرعي على مستويين تحت الإدارة — نفس مدير الإدارة', async () => {
  const submitted = ok(await submitNew(U.subStaff))
  assert.deepEqual(await stepsOf(submitted.id), [['administration_manager_of_requester', E.salesHead.id]])
})

test('AL-07: مدير الإدارة هو مقدّم الطلب — الخطوة بتطلع للإدارة التنفيذية برابطها لفرع تاني، والرئيس بيعتمد من حساب «كل الفروع»', async () => {
  const submitted = ok(await submitNew(U.salesHead))
  assert.deepEqual(await stepsOf(submitted.id), [['administration_manager_of_requester', E.ceo.id]])
  assert.ok(ok(await request(U.ceo, 'GET', '/requests/inbox'), 200).some(row => row.id === submitted.id), 'الطلب في صندوق الرئيس')
  assert.ok(['APPROVED', 'COMPLETED'].includes(ok(await approve(U.ceo, submitted.id)).status))
  // قسم فرع النصر تحت الإدارة التنفيذية مباشرة: إدارته هي الإدارة التنفيذية
  R.nasrExec = ok(await submitNew(U.nasrExecStaff))
  assert.deepEqual(await stepsOf(R.nasrExec.id), [['administration_manager_of_requester', E.ceo.id]])
})

test('AL-08: الإيقاف برسالة بتسمّي الوحدة — مفيش قسم، مفيش إدارة، الإدارة مالهاش مدير، المدير الوحيد هو مقدّم الطلب', async () => {
  for (const [key, message] of [
    ['noDept', 'مقدّم الطلب مش مسجّل في قسم، فمفيش «مدير الإدارة» — سجّل قسمه في ملفه أو عدّل سلسلة الاعتماد'],
    ['noAdminStaff', 'قسم مقدّم الطلب «مخازن المعادي» مش تحت أي إدارة، فمفيش «مدير الإدارة» — حطّ القسم تحت إدارة من «الإدارات والأقسام» أو عدّل سلسلة الاعتماد'],
    ['noMgrStaff', 'الإدارة «إدارة المعادي» مالهاش مدير — حدّد مدير الإدارة من «الإدارات والأقسام» أو عدّل سلسلة الاعتماد'],
    ['opsHead', 'مقدّم الطلب هو نفسه مدير «إدارة العمليات» ومفيش إدارة فوقها ليها مدير غيره — عدّل سلسلة الاعتماد أو حطّ الإدارة تحت «الإدارة التنفيذية»'],
  ]) {
    const draft = await draftOf(U[key], 'AL_REQ')
    refused(await request(U[key], 'POST', `/requests/${draft.id}/submit`), 400, message)
    const stored = await repo('Request').findOneByOrFail({ id: draft.id })
    assert.deepEqual([stored.status, stored.resolvedSteps, stored.submittedAt], ['DRAFT', null, null], key)
    assert.equal(await repo('RequestApproval').countBy({ requestId: draft.id }), 0, key)
  }
  // مدير الإدارة الأعلى ناقص وهو اللي الصعود وصله: الرسالة بتسمّيه هو
  await repo('Department').update({ id: D.exec.id }, { managerEmployeeId: null })
  try {
    refused(await submitNew(U.salesHead), 400, `الإدارة «${EXEC_NAME}» مالهاش مدير — حدّد مدير الإدارة من «الإدارات والأقسام» أو عدّل سلسلة الاعتماد`)
  } finally {
    await repo('Department').update({ id: D.exec.id }, { managerEmployeeId: E.ceo.id })
  }
})

test('AL-09: السرّي مابيتخطّاش «مدير الإدارة» (زي «مدير القسم»)، والدور مش مقبول كجهة تصعيد', async () => {
  const both = ok(await submitNew(U.salesStaff, 'AL_BOTH'))
  assert.deepEqual(await stepsOf(both.id), [['direct_manager_of_requester', E.retailLead.id], ['administration_manager_of_requester', E.salesHead.id]])
  const secret = ok(await submitNew(U.salesStaff, 'AL_SECRET'))
  assert.deepEqual(await stepsOf(secret.id), [['administration_manager_of_requester', E.salesHead.id]], 'المدير المباشر اتخطّى ومدير الإدارة فضل')
  const create = await request(U.admin, 'POST', '/settings/approval-chains', { code: 'AL_ESC', nameAr: 'تصعيد مرفوض',
    steps: [{ approverRole: 'hr', slaDays: 2, escalateTo: 'administration_manager_of_requester' }] })
  refused(create, 400, '«مدير الإدارة» بيتحط كخطوة اعتماد في السلسلة، مش كجهة تصعيد — اختار جهة تصعيد تانية')
  const replaced = await request(U.admin, 'PATCH', `/settings/approval-chains/${C.both.id}/steps`,
    { steps: [{ approverRole: 'hr', slaDays: 2, escalateTo: 'administration_manager_of_requester' }] })
  refused(replaced, 400, '«مدير الإدارة» بيتحط كخطوة اعتماد في السلسلة، مش كجهة تصعيد — اختار جهة تصعيد تانية')
  const step = await repo('ApprovalStep').findOneByOrFail({ chainId: C.both.id, stepOrder: 1 })
  assert.equal((await request(U.admin, 'PATCH', `/settings/approval-steps/${step.id}`, { escalateTo: 'administration_manager_of_requester' })).status, 400)
  assert.equal((await repo('ApprovalStep').findOneByOrFail({ id: step.id })).escalateTo, null)
  assert.deepEqual((await repo('ApprovalStep').find({ where: { chainId: C.both.id }, order: { stepOrder: 'ASC' } })).map(row => row.approverRole),
    ['direct_manager_of_requester', 'administration_manager_of_requester'], 'السلسلة زي ما هي')
})

test('AL-10: فلتر المسير وجمهور العطلات على إدارة بيشملوا أقسامها — في فرعها بس', async () => {
  const change = async () => {
    const context = ok(await request(U.admin, 'GET', '/attendance/calendar-context?scope=GLOBAL&sourceId=0'), 200)
    return { effectiveFrom: '2026-08-01', reason: 'اختبار مستوى الإدارة', expectedRevision: context.revision, expectedCurrentSourceHash: context.currentSourceHash }
  }
  ok(await request(U.admin, 'POST', '/catalogs/holidays', { name: 'عطلة إدارة المبيعات', date: HOLIDAY_SALES, country: 'EG',
    audience: { level: 'departments', branchId: B.nasr.id, departmentIds: [D.sales.id] }, calendarChange: await change() }))
  ok(await request(U.admin, 'POST', '/catalogs/holidays', { name: 'عطلة الإدارة التنفيذية', date: HOLIDAY_EXEC, country: 'EG',
    audience: { level: 'departments', branchId: B.main.id, departmentIds: [D.exec.id] }, calendarChange: await change() }))
  const attendance = app.get(require('../src/attendance/attendance.service').AttendanceService)
  const kind = async (emp, date) => (await attendance.calendarDay(emp.id, date)).dayKind
  for (const emp of [E.salesHead, E.retailLead, E.salesStaff, E.subStaff]) assert.equal(await kind(emp, HOLIDAY_SALES), 'HOLIDAY', emp.fullName)
  assert.equal(await kind(E.nasrExecStaff, HOLIDAY_SALES), 'WORKING', 'قسم نصر تحت الإدارة التنفيذية مش من أقسام إدارة المبيعات')
  for (const emp of [E.ceo, E.execOffice]) assert.equal(await kind(emp, HOLIDAY_EXEC), 'HOLIDAY', emp.fullName)
  for (const emp of [E.salesHead, E.salesStaff, E.subStaff, E.nasrExecStaff, E.opsStaff]) {
    assert.equal(await kind(emp, HOLIDAY_EXEC), 'WORKING', `${emp.fullName}: عطلة الإدارة التنفيذية جوه فرعها بس`)
  }

  const policy = ok(await request(U.admin, 'POST', '/payroll/policies', { name: 'مجموعة اختبار مستوى الإدارة', effectiveFrom: '2026-07-23',
    settings: { defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 23, cycleEndMode: 'DERIVED', cycleEndDay: null } }))
  const [version] = policy.versions
  const published = ok(await request(U.admin, 'POST', `/payroll/policies/${policy.policy.id}/versions/${version.id}/publish`,
    { expectedRevision: version.revision, reason: 'نشر مجموعة اختبار مستوى الإدارة' }), 200)
  const preview = filters => request(U.admin, 'POST', '/payroll/runs/membership-preview', { policyVersionId: published.version.id, period: '2026-08', filters })
  const members = body => new Set([...body.included, ...body.excluded].map(row => row.employeeId))
  const sales = members(ok(await preview({ departmentIds: [D.sales.id] })))
  for (const emp of [E.salesHead, E.retailLead, E.salesStaff, E.subStaff]) assert.ok(sales.has(emp.id), emp.fullName)
  for (const emp of [E.nasrExecStaff, E.ceo, E.opsStaff]) assert.equal(sales.has(emp.id), false, emp.fullName)
  const executive = members(ok(await preview({ departmentIds: [D.exec.id] })))
  for (const emp of [E.ceo, E.execOffice]) assert.ok(executive.has(emp.id), emp.fullName)
  for (const emp of [E.salesHead, E.salesStaff, E.subStaff, E.nasrExecStaff]) assert.equal(executive.has(emp.id), false, `${emp.fullName}: فرع تاني`)
  const ops = members(ok(await preview({ departmentIds: [D.ops.id] })))
  assert.deepEqual([E.opsHead, E.opsStaff, E.ceo].map(emp => ops.has(emp.id)), [true, true, false])
})

test('AL-11: «الإدارة» في بطاقة صاحب الطلب — الاسم لنطاق فرعها، والإدارة التنفيذية برّه النطاق باسمها العام، ومحجوبة مع orgHidden', async () => {
  const card = async (user, id) => ok(await request(user, 'GET', `/requests/${id}`), 200)
  assert.equal((await card(U.salesHead, R.sales.id)).requester.administrationName, 'إدارة المبيعات')
  assert.equal((await card(U.admin, R.sales.id)).requester.administrationName, 'إدارة المبيعات')
  // موظف نصر تحت الإدارة التنفيذية (فرعها الرئيسي): حساب النصر وصاحب الطلب نفسه يشوفوا الاسم العام، ومدير النظام والرئيس الاسم المسجّل
  for (const user of [U.nasrHr, U.nasrExecStaff]) {
    const detail = await card(user, R.nasrExec.id)
    assert.equal(detail.requester.administrationName, 'الإدارة التنفيذية')
    assert.equal(JSON.stringify(detail).includes(EXEC_NAME), false, 'اسم وحدة في فرع برّه النطاق')
  }
  assert.equal((await card(U.admin, R.nasrExec.id)).requester.administrationName, EXEC_NAME)
  assert.equal((await card(U.ceo, R.nasrExec.id)).requester.administrationName, EXEC_NAME)
  // الموظف اتنقل لفرع برّه نطاق حساب النصر: البطاقة الاسم والكود بس — والإدارة محجوبة زي باقي التنظيم
  await repo('Employee').update({ id: E.salesStaff.id }, { branchId: B.maadi.id })
  try {
    const moved = (await card(U.nasrHr, R.sales.id)).requester
    assert.deepEqual([moved.orgHidden, moved.administrationName, moved.departmentName, moved.jobTitle], [true, null, null, null])
  } finally {
    await repo('Employee').update({ id: E.salesStaff.id }, { branchId: B.nasr.id })
  }
})

test('AL-12: حساب الفرع — إدارة في فرعه وقسم تحتها، والربط تحت الإدارة التنفيذية برّه نطاقه 403، والقائمة ماتكشفش اسمها', async () => {
  const local = ok(await request(U.nasrHr, 'POST', '/departments', { name: 'إدارة النصر المحلية', branchId: B.nasr.id, unitType: 'ADMINISTRATION' }))
  assert.equal(local.unitType, 'ADMINISTRATION')
  const child = ok(await request(U.nasrHr, 'POST', '/departments', { name: 'مشتريات النصر', branchId: B.nasr.id, parentId: local.id }))
  assert.deepEqual([child.unitType, child.parentId], ['DEPARTMENT', local.id])
  const before = await departmentRows()
  refused(await request(U.nasrHr, 'POST', '/departments', { name: 'إدارة تحت التنفيذية', branchId: B.nasr.id, parentId: D.exec.id, unitType: 'ADMINISTRATION' }),
    403, 'القسم الأب خارج نطاق فرعك')
  refused(await request(U.nasrHr, 'PATCH', `/departments/${local.id}`, { isExecutive: true }), 403, /لكل الشركة/)
  assert.deepEqual(await departmentRows(), before)
  // إدارة المبيعات (تحت الإدارة التنفيذية المستخبية عنه): الشاشة بتبعت الأب والنوع القائمين — مايتقفلش
  const renamed = ok(await request(U.nasrHr, 'PATCH', `/departments/${D.sales.id}`, { name: 'إدارة المبيعات', parentId: D.exec.id, unitType: 'ADMINISTRATION' }), 200)
  assert.deepEqual([renamed.parentId, renamed.unitType], [D.exec.id, 'ADMINISTRATION'])
  const visible = ok(await request(U.nasrHr, 'GET', '/departments'), 200)
  assert.equal(visible.every(row => row.branchId === B.nasr.id), true)
  assert.equal(JSON.stringify(visible).includes(EXEC_NAME), false)
  assert.equal(visible.find(row => row.id === D.sales.id).unitType, 'ADMINISTRATION')
})

test('AL-13: تعليم قسم «إدارة تنفيذية» بيخلّيه «إدارة» تلقائي، والتنفيذية القديمة إدارة عادية تتحول قسم وأقسامها فرعية', async () => {
  // الإدارات والأقسام اللي من فروع تانية تحت الإدارة التنفيذية تبقى رئيسية الأول (غير كده التعليم الضمني مرفوض — AL-04)
  ok(await request(U.admin, 'PATCH', `/departments/${D.sales.id}`, { parentId: null }), 200)
  ok(await request(U.admin, 'PATCH', `/departments/${D.nasrUnderExec.id}`, { parentId: null }), 200)
  const flagged = ok(await request(U.admin, 'PATCH', `/departments/${D.maadiRoot.id}`, { isExecutive: true }), 200)
  assert.deepEqual([flagged.isExecutive, flagged.unitType], [true, 'ADMINISTRATION'])
  const old = await repo('Department').findOneByOrFail({ id: D.exec.id })
  assert.deepEqual([old.isExecutive, old.unitType], [false, 'ADMINISTRATION'])
  refused(await request(U.admin, 'PATCH', `/departments/${D.maadiRoot.id}`, { unitType: 'DEPARTMENT' }), 400, EXECUTIVE_IS_ADMINISTRATION)
  const demoted = ok(await request(U.admin, 'PATCH', `/departments/${D.exec.id}`, { unitType: 'DEPARTMENT' }), 200)
  assert.equal(demoted.unitType, 'DEPARTMENT')
  assert.equal((await repo('Department').findOneByOrFail({ id: D.execOffice.id })).parentId, D.exec.id, 'مكتب الرئيس بقى قسم فرعي تحته')
  assert.deepEqual((await repo('Department').find({ where: { isExecutive: true } })).map(row => row.id), [D.maadiRoot.id])
})
