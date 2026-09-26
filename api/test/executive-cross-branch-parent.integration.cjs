'use strict'
// «الإدارة التنفيذية فوق كل الفروع» (طلب المالك 27 سبتمبر: «الإدارة التنفيذية في الفرع الرئيسي، ولما بحط تحتها قسم من فرع
// النصر السيستم بيرفض»). إثبات حي بـSQL وHTTP فعليين على قاعدة مؤقتة عشوائية تُحذف في النهاية:
//  1) قسم من فرع تاني تحت الإدارة التنفيذية: إنشاء وتعديل ينجحوا، وأي أب تاني من فرع مختلف مرفوض بنفس الرسالة القديمة.
//  2) النطاق: حساب فرع مايربطش قسم تحت الإدارة التنفيذية وفرعها برّه نطاقه (403 إنشاء وتعديل)؛ حساب نطاقه يغطيها يقدر.
//  3) القسم العادي عمره ما يبقى أب لقسم من فرع تاني: شيل تعليم الإدارة التنفيذية (صريح أو ضمني بتعليم قسم تاني) مرفوض
//     والرسالة بتسمّي قسم منهم، ومفيش حاجة بتتغير؛ ونقل الإدارة التنفيذية نفسها لفرع تاني عادي وأقسامها في فروعها.
//  4) الدائرة لسه مرفوضة.
//  5) الحسابات جوه الفرع: عطلة أقسام لفرع على الإدارة التنفيذية ماتوصلش لموظف فرع تاني تحتها، ومسير على الإدارة التنفيذية
//     مايسحبش موظفي فرع تاني، والخصومات/المكافآت (مسار القسم وأقسامه الفرعية وسلطة مدير القسم) جوه الفرع، وقوائم حساب الفرع
//     ماتكشفش اسم الإدارة التنفيذية (فرع برّه نطاقه).
// قاعدة hr_exec_cross_branch_test_<16 hex> — لا مساس بقاعدة الشركة. التوكنات موقّعة محليًا بسر عشوائي.
// Run (من api/): node --test test/executive-cross-branch-parent.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_exec_cross_branch_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_exec_cross_branch_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-exec-cross-branch-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
// سبتمبر 2026 (الراحة الجمعة والسبت): 15 تلات و16 أربع — أيام شغل عادية
const HOLIDAY_MAIN = '2026-09-15', HOLIDAY_NASR = '2026-09-16'
const EXEC_NAME = 'الإدارة التنفيذية للمجموعة'
let app, ds, master, base, created = false
const B = {}, D = {}, E = {}, U = {}, T = {}
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }

function token(user) {
  const payload = { sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') }
  // نطاق الحساب في التوكن زي auth.service: «كل الفروع» أو الفروع المختارة بعلامات صح
  if (user.scopeAllBranches === true) payload.scopeAllBranches = true
  if (user.scopeBranchIds) payload.branchIds = JSON.parse(user.scopeBranchIds)
  return jwt.sign(payload)
}
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(user)}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const ok = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const messageOf = response => [].concat(response.body?.message ?? []).join(' | ')
const refused = (response, status, message) => {
  assert.equal(response.status, status, JSON.stringify(response.body))
  if (typeof message === 'string') assert.equal(messageOf(response), message)
  else if (message) assert.match(messageOf(response), message)
}
// صورة كاملة لجدول الأقسام: «مفيش حاجة اتغيرت» بعد أي رفض
const departmentRows = () => ds.query(`SELECT [id], [name], [branchId], [parentId], [managerEmployeeId], [isActive], [isExecutive], [executiveSecretaryEmployeeId]
  FROM [departments] ORDER BY [id]`)

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
  B.main = await repo('Branch').save({ code: 'EXB_MAIN', name: 'الفرع الرئيسي', country: 'EG', weekendDays: 'FRI,SAT' })
  B.nasr = await repo('Branch').save({ code: 'EXB_NASR', name: 'فرع النصر', country: 'EG', weekendDays: 'FRI,SAT' })
  B.maadi = await repo('Branch').save({ code: 'EXB_MAADI', name: 'المعادي', country: 'EG', weekendDays: 'FRI,SAT' })
  let n = 0
  const employee = (fullName, branch) => repo('Employee').save({ employeeCode: `EXB${String(++n).padStart(3, '0')}`, fullName, branchId: branch.id,
    joinDate: '2020-01-01', status: 'active', isActive: true, basicSalary: 9000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0,
    workNatureAllowance: 0, otherAllowance: 0, currency: 'EGP', payMethod: 'cash' })
  E.ceo = await employee('الرئيس التنفيذي', B.main)
  E.secretary = await employee('السكرتير التنفيذي', B.main)
  E.mainStaff = await employee('موظف مكتب الرئيس', B.main)
  E.nasrHead = await employee('مدير مبيعات النصر', B.nasr)
  E.nasrStaff = await employee('موظف مبيعات النصر', B.nasr)
  E.nasrSub = await employee('موظف التجزئة بالنصر', B.nasr)
  // الهيكل: الإدارة التنفيذية (الرئيسي) ← مكتب الرئيس (الرئيسي) + مبيعات النصر (النصر) ← التجزئة (النصر)
  const department = values => repo('Department').save({ isActive: true, ...values })
  D.exec = await department({ name: EXEC_NAME, code: 'EXB_EXEC', branchId: B.main.id, managerEmployeeId: E.ceo.id, isExecutive: true,
    executiveSecretaryEmployeeId: E.secretary.id })
  D.mainChild = await department({ name: 'مكتب الرئيس التنفيذي', code: 'EXB_OFFICE', branchId: B.main.id, parentId: D.exec.id })
  D.nasrTop = await department({ name: 'مبيعات النصر', code: 'EXB_NASR_SALES', branchId: B.nasr.id, parentId: D.exec.id, managerEmployeeId: E.nasrHead.id })
  D.nasrSub = await department({ name: 'تجزئة النصر', code: 'EXB_NASR_RETAIL', branchId: B.nasr.id, parentId: D.nasrTop.id })
  D.nasrOther = await department({ name: 'مخازن النصر', code: 'EXB_NASR_STORE', branchId: B.nasr.id })
  D.nasrLonely = await department({ name: 'صيانة النصر', code: 'EXB_NASR_MAINT', branchId: B.nasr.id })
  D.maadiRoot = await department({ name: 'إدارة المعادي', code: 'EXB_MAADI', branchId: B.maadi.id })
  T.nasr = await repo('Team').save({ name: 'فريق مبيعات النصر', code: 'EXB_T_NASR', departmentId: D.nasrTop.id, isActive: true })
  for (const [emp, dept] of [[E.ceo, D.exec], [E.secretary, D.exec], [E.mainStaff, D.mainChild], [E.nasrHead, D.nasrTop], [E.nasrStaff, D.nasrTop], [E.nasrSub, D.nasrSub]]) {
    await repo('Employee').update(emp.id, { departmentId: dept.id })
    emp.departmentId = dept.id
  }
  const user = (key, role, values) => repo('User').save({ email: `${key}@exec-cross-branch.invalid`, displayName: key, passwordHash: 'test-only',
    role, branchId: null, permissions: '[]', ...values }).then(row => { U[key] = row })
  await user('admin', 'super_admin', { permissions: '["*"]' })
  await user('nasrHr', 'hr_manager', { branchId: B.nasr.id,
    permissions: JSON.stringify(['org.manage', 'deductions.view', 'deductions.manage', 'bonuses.view', 'bonuses.manage']) })
  // نطاقه الرئيسي والنصر بعلامات صح: يقدر يربط قسم نصر تحت الإدارة التنفيذية (فرعها جوه نطاقه)
  await user('multi', 'hr_manager', { branchId: B.nasr.id, scopeBranchIds: JSON.stringify([B.main.id, B.nasr.id]), permissions: JSON.stringify(['org.manage']) })
  // الرئيس التنفيذي بحساب «كل الفروع» — سلطته الهيكلية كمدير الإدارة التنفيذية جوه فرعها بس
  await user('ceo', 'employee', { branchId: B.main.id, employeeId: E.ceo.id, scopeAllBranches: true })
  await user('mainStaff', 'employee', { branchId: B.main.id, employeeId: E.mainStaff.id })
  await user('nasrStaff', 'employee', { branchId: B.nasr.id, employeeId: E.nasrStaff.id })
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
  try { fs.rmSync(uploads, { recursive: true, force: true }) } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'executive cross-branch fixture cleanup failed')
})

test('EX-01: قسم من فرع تاني تحت الإدارة التنفيذية — الإنشاء والتعديل ينجحوا، وقسم الفرع يفضل أب لأقسام فرعه', async () => {
  const createdDept = ok(await request(U.admin, 'POST', '/departments', { name: 'تسويق النصر', branchId: B.nasr.id, parentId: D.exec.id }), 201)
  assert.deepEqual([createdDept.branchId, createdDept.parentId, createdDept.isExecutive], [B.nasr.id, D.exec.id, false])
  const moved = ok(await request(U.admin, 'PATCH', `/departments/${D.nasrOther.id}`, { parentId: D.exec.id }), 200)
  assert.deepEqual([moved.branchId, moved.parentId], [B.nasr.id, D.exec.id])
  const sub = ok(await request(U.admin, 'POST', '/departments', { name: 'إعلانات النصر', branchId: B.nasr.id, parentId: createdDept.id }), 201)
  assert.equal(sub.parentId, createdDept.id)
  // حساب نطاقه يغطي فرع الإدارة التنفيذية (الرئيسي + النصر) بيربط عادي
  const byMulti = ok(await request(U.multi, 'POST', '/departments', { name: 'خدمة عملاء النصر', branchId: B.nasr.id, parentId: D.exec.id }), 201)
  assert.equal(byMulti.parentId, D.exec.id)
  // حساب فرع النصر بيعدّل قسمه اللي تحت الإدارة التنفيذية والشاشة بتبعت الأب القائم زي ما هو — مايتقفلش ولا الأب يتشال
  const renamed = ok(await request(U.nasrHr, 'PATCH', `/departments/${createdDept.id}`, { name: 'تسويق النصر والإعلان', parentId: D.exec.id }), 200)
  assert.deepEqual([renamed.name, renamed.parentId], ['تسويق النصر والإعلان', D.exec.id])
  const stored = await repo('Department').findOneByOrFail({ id: createdDept.id })
  assert.deepEqual([stored.branchId, stored.parentId], [B.nasr.id, D.exec.id])
  D.created = createdDept
})

test('EX-02: أب من فرع مختلف غير الإدارة التنفيذية لسه مرفوض بنفس الرسالة القديمة — ومفيش حاجة بتتكتب', async () => {
  const before = await departmentRows()
  refused(await request(U.admin, 'POST', '/departments', { name: 'قسم متقاطع', branchId: B.nasr.id, parentId: D.mainChild.id }), 400, 'القسم الأب في فرع مختلف')
  // قسم فرع تحت الإدارة التنفيذية مايبقاش أب لقسم من فرع تالت
  refused(await request(U.admin, 'POST', '/departments', { name: 'قسم معادي تحت النصر', branchId: B.maadi.id, parentId: D.nasrTop.id }), 400, 'القسم الأب في فرع مختلف')
  refused(await request(U.admin, 'PATCH', `/departments/${D.maadiRoot.id}`, { parentId: D.mainChild.id }), 400, 'القسم الأب في فرع مختلف — اختر أباً من فرع القسم نفسه')
  refused(await request(U.admin, 'PATCH', `/departments/${D.maadiRoot.id}`, { parentId: D.nasrTop.id }), 400, 'القسم الأب في فرع مختلف — اختر أباً من فرع القسم نفسه')
  // نقل قسم نصر عادي لفرع تاني وأبوه (قسم نصر عادي) فاضل في النصر
  refused(await request(U.admin, 'PATCH', `/departments/${D.nasrSub.id}`, { branchId: B.maadi.id }), 400, 'القسم الأب في فرع مختلف — اختر أباً من فرع القسم نفسه')
  assert.deepEqual(await departmentRows(), before)
})

test('EX-03: حساب فرع النصر مايربطش قسم تحت الإدارة التنفيذية (فرعها برّه نطاقه) — 403 في الإنشاء والتعديل', async () => {
  const before = await departmentRows()
  refused(await request(U.nasrHr, 'POST', '/departments', { name: 'محاولة من حساب النصر', branchId: B.nasr.id, parentId: D.exec.id }), 403,
    'القسم الأب خارج نطاق فرعك')
  refused(await request(U.nasrHr, 'PATCH', `/departments/${D.nasrLonely.id}`, { parentId: D.exec.id }), 403, 'القسم الأب خارج نطاق فرعك')
  assert.deepEqual(await departmentRows(), before, 'مفيش قسم اتعمل ولا أب اتغير')
  // والإدارة التنفيذية نفسها مش ظاهرة لحساب النصر: قايمة أقسامه فرعه بس
  const visible = ok(await request(U.nasrHr, 'GET', '/departments'), 200)
  assert.ok(visible.length > 0)
  assert.equal(visible.every(row => row.branchId === B.nasr.id), true)
  assert.equal(JSON.stringify(visible).includes(EXEC_NAME), false)
  refused(await request(U.nasrHr, 'PATCH', `/departments/${D.exec.id}`, { name: 'محاولة' }), 404)
})

test('EX-04: شيل تعليم الإدارة التنفيذية وتحتها أقسام من فروع تانية مرفوض — صريح وضمني — والرسالة بتسمّي قسم منهم ومفيش حاجة بتتغير', async () => {
  const before = await departmentRows()
  const explicit = await request(U.admin, 'PATCH', `/departments/${D.exec.id}`, { isExecutive: false })
  refused(explicit, 400, new RegExp(`مينفعش تشيل «الإدارة التنفيذية» من «${EXEC_NAME}» وتحتها أقسام من فروع تانية زي «مبيعات النصر» \\(فرع النصر\\)`))
  assert.match(messageOf(explicit), /انقل الأقسام دي الأول/)
  // ضمني: تعليم قسم تاني بيشيل التعليم من الإدارة التنفيذية الحالية — تعديل وإنشاء
  const implicit = await request(U.admin, 'PATCH', `/departments/${D.maadiRoot.id}`, { isExecutive: true })
  refused(implicit, 400, new RegExp(`مينفعش تعلّم قسم تاني «إدارة تنفيذية» و«${EXEC_NAME}» \\(الإدارة التنفيذية الحالية\\) تحتها أقسام من فروع تانية زي «مبيعات النصر»`))
  assert.match(messageOf(implicit), /انقل الأقسام دي الأول/)
  refused(await request(U.admin, 'POST', '/departments', { name: 'إدارة تنفيذية جديدة', branchId: B.maadi.id, isExecutive: true }), 400, /مينفعش تعلّم قسم تاني «إدارة تنفيذية»/)
  // قسم فرع تحت الإدارة التنفيذية يتعلّم هو الإدارة التنفيذية: أبوه (الإدارة التنفيذية الحالية) هيبقى قسم عادي فوق فرع تاني
  refused(await request(U.admin, 'PATCH', `/departments/${D.nasrTop.id}`, { isExecutive: true }), 400, /الإدارة التنفيذية مايبقاش أبوها من فرع تاني/)
  refused(await request(U.admin, 'POST', '/departments', { name: 'تنفيذية تحت التنفيذية', branchId: B.nasr.id, parentId: D.exec.id, isExecutive: true }), 400,
    /الإدارة التنفيذية مايبقاش أبوها من فرع تاني/)
  const after = await departmentRows()
  assert.deepEqual(after, before, 'التعليم والسكرتير والأبوّة زي ما هم')
  assert.deepEqual(after.filter(row => row.isExecutive === true).map(row => [row.id, row.executiveSecretaryEmployeeId]), [[D.exec.id, E.secretary.id]])
})

test('EX-05: نقل الإدارة التنفيذية نفسها لفرع تاني عادي وأقسامها في فروعها؛ نقل قسم عادي بيسيب أقسامه الفرعية لسه مرفوض', async () => {
  const moved = ok(await request(U.admin, 'PATCH', `/departments/${D.exec.id}`, { branchId: B.maadi.id }), 200)
  assert.deepEqual([moved.branchId, moved.isExecutive], [B.maadi.id, true])
  const children = await repo('Department').find({ where: { parentId: D.exec.id }, order: { id: 'ASC' } })
  assert.ok(children.some(row => row.id === D.mainChild.id && row.branchId === B.main.id), 'مكتب الرئيس فاضل في الرئيسي تحتها')
  assert.ok(children.some(row => row.id === D.nasrTop.id && row.branchId === B.nasr.id), 'مبيعات النصر فاضلة في النصر تحتها')
  // قسم عادي: مبيعات النصر (أبوها الإدارة التنفيذية) ليها «تجزئة النصر» في النصر — نقلها للمعادي مرفوض بالرسالة القديمة
  refused(await request(U.admin, 'PATCH', `/departments/${D.nasrTop.id}`, { branchId: B.maadi.id }), 400,
    'للقسم أقسام فرعية في فرعه الحالي (مثل «تجزئة النصر») — انقلها أو غيّر أبها قبل نقله لفرع آخر')
  const back = ok(await request(U.admin, 'PATCH', `/departments/${D.exec.id}`, { branchId: B.main.id }), 200)
  assert.equal(back.branchId, B.main.id)
})

test('EX-06: الدائرة لسه مرفوضة — حتى عبر أقسام الفروع اللي تحت الإدارة التنفيذية', async () => {
  const before = await departmentRows()
  refused(await request(U.admin, 'PATCH', `/departments/${D.exec.id}`, { parentId: D.exec.id }), 400, 'القسم لا يكون أباً لنفسه')
  refused(await request(U.admin, 'PATCH', `/departments/${D.exec.id}`, { parentId: D.mainChild.id }), 400, 'القسم الأب المختار تابع لهذا القسم — لا يكون الهيكل دائرياً')
  refused(await request(U.admin, 'PATCH', `/departments/${D.nasrTop.id}`, { parentId: D.nasrSub.id }), 400, 'القسم الأب المختار تابع لهذا القسم — لا يكون الهيكل دائرياً')
  // الإدارة التنفيذية تحت قسم نصر تابع ليها: أب من فرع تاني مش إدارة تنفيذية — مرفوض قبل ما يلف
  refused(await request(U.admin, 'PATCH', `/departments/${D.exec.id}`, { parentId: D.nasrSub.id }), 400, 'القسم الأب في فرع مختلف — اختر أباً من فرع القسم نفسه')
  assert.deepEqual(await departmentRows(), before)
})

test('EX-07: عطلة أقسام للفرع الرئيسي على الإدارة التنفيذية ماتوصلش لموظف النصر تحتها — وعطلة النصر على قسمه بتشمل قسمه الفرعي', async () => {
  const change = async () => {
    const context = ok(await request(U.admin, 'GET', '/attendance/calendar-context?scope=GLOBAL&sourceId=0'), 200)
    return { effectiveFrom: '2026-08-01', reason: 'اختبار الإدارة التنفيذية فوق الفروع', expectedRevision: context.revision, expectedCurrentSourceHash: context.currentSourceHash }
  }
  ok(await request(U.admin, 'POST', '/catalogs/holidays', { name: 'عطلة الإدارة التنفيذية', date: HOLIDAY_MAIN, country: 'EG',
    audience: { level: 'departments', branchId: B.main.id, departmentIds: [D.exec.id] }, calendarChange: await change() }), 201)
  ok(await request(U.admin, 'POST', '/catalogs/holidays', { name: 'عطلة مبيعات النصر', date: HOLIDAY_NASR, country: 'EG',
    audience: { level: 'departments', branchId: B.nasr.id, departmentIds: [D.nasrTop.id] }, calendarChange: await change() }), 201)
  const attendance = app.get(require('../src/attendance/attendance.service').AttendanceService)
  const kind = async (emp, date) => (await attendance.calendarDay(emp.id, date)).dayKind
  assert.equal(await kind(E.ceo, HOLIDAY_MAIN), 'HOLIDAY')
  assert.equal(await kind(E.mainStaff, HOLIDAY_MAIN), 'HOLIDAY', 'القسم الفرعي في نفس الفرع تبع أبوه')
  assert.equal(await kind(E.nasrStaff, HOLIDAY_MAIN), 'WORKING', 'موظف النصر تحت الإدارة التنفيذية مش في عطلة الفرع الرئيسي')
  assert.equal(await kind(E.nasrSub, HOLIDAY_MAIN), 'WORKING')
  assert.equal(await kind(E.nasrSub, HOLIDAY_NASR), 'HOLIDAY', 'مسار النصر جوه فرعه شغال')
  assert.equal(await kind(E.mainStaff, HOLIDAY_NASR), 'WORKING')
  // قايمة العطلات للموظف العادي: اللي تخصه بس
  const names = async user => ok(await request(user, 'GET', '/catalogs/holidays'), 200).map(row => row.name)
  assert.ok((await names(U.mainStaff)).includes('عطلة الإدارة التنفيذية'))
  const nasrList = await names(U.nasrStaff)
  assert.equal(nasrList.includes('عطلة الإدارة التنفيذية'), false)
  assert.ok(nasrList.includes('عطلة مبيعات النصر'))
})

test('EX-08: مسير على الإدارة التنفيذية مايسحبش موظفي فرع تاني تحتها، ومسير قسم النصر بياخد قسمه الفرعي', async () => {
  const policy = ok(await request(U.admin, 'POST', '/payroll/policies', { name: 'مجموعة اختبار الإدارة التنفيذية', effectiveFrom: '2026-07-23',
    settings: { defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 23, cycleEndMode: 'DERIVED', cycleEndDay: null } }), 201)
  const [version] = policy.versions
  const published = ok(await request(U.admin, 'POST', `/payroll/policies/${policy.policy.id}/versions/${version.id}/publish`,
    { expectedRevision: version.revision, reason: 'نشر مجموعة اختبار الإدارة التنفيذية' }), 200)
  const preview = filters => request(U.admin, 'POST', '/payroll/runs/membership-preview', { policyVersionId: published.version.id, period: '2026-08', filters })
  const members = body => new Set([...body.included, ...body.excluded].map(row => row.employeeId))
  const executive = members(ok(await preview({ departmentIds: [D.exec.id] }), 201))
  for (const emp of [E.ceo, E.secretary, E.mainStaff]) assert.ok(executive.has(emp.id), emp.fullName)
  for (const emp of [E.nasrHead, E.nasrStaff, E.nasrSub]) assert.equal(executive.has(emp.id), false, emp.fullName)
  const nasr = members(ok(await preview({ departmentIds: [D.nasrTop.id] }), 201))
  assert.deepEqual([E.nasrHead, E.nasrStaff, E.nasrSub].map(emp => nasr.has(emp.id)), [true, true, true])
  assert.equal(nasr.has(E.mainStaff.id), false)
  // فريق قسم النصر مش من أقسام الإدارة التنفيذية الفرعية (الرابط لفرع تاني مابيتعدّاش) — نفس رد «فلاتر غير مترابطة»
  const unlinked = await preview({ departmentIds: [D.exec.id], teamIds: [T.nasr.id] })
  assert.equal(unlinked.status, 400, JSON.stringify(unlinked.body)); assert.equal(unlinked.body.code, 'PAYRUN-FILTER-UNLINKED')
  ok(await preview({ departmentIds: [D.nasrTop.id], teamIds: [T.nasr.id] }), 201)
})

test('EX-09: الخصومات والمكافآت — مسار القسم وأقسامه الفرعية وسلطة مدير القسم جوه الفرع، وقوايم حساب النصر ماتكشفش الإدارة التنفيذية', async () => {
  for (const route of ['/deductions/candidates', '/bonuses/candidates']) {
    const rows = ok(await request(U.nasrHr, 'GET', route), 200)
    assert.ok(rows.length > 0, route)
    assert.equal(rows.every(row => row.branchId === B.nasr.id), true, route)
    assert.deepEqual(rows.find(row => row.id === E.nasrStaff.id).departmentPath.map(item => item.id), [D.nasrTop.id], route)
    assert.deepEqual(rows.find(row => row.id === E.nasrSub.id).departmentPath.map(item => item.id), [D.nasrSub.id, D.nasrTop.id], route)
    assert.equal(JSON.stringify(rows).includes(EXEC_NAME), false, `${route}: اسم قسم من فرع برّه النطاق`)
  }
  // الرئيس التنفيذي (حساب «كل الفروع»): «مدير قسم» على الإدارة التنفيذية وأقسامها في فرعها بس — مش على أقسام النصر تحتها
  const ceoCandidates = ok(await request(U.ceo, 'GET', '/deductions/candidates'), 200)
  const ceoIds = ceoCandidates.map(row => row.id)
  assert.ok(ceoIds.includes(E.mainStaff.id))
  assert.deepEqual(ceoCandidates.find(row => row.id === E.mainStaff.id).bases, ['DEPARTMENT_MANAGER'])
  for (const emp of [E.nasrHead, E.nasrStaff, E.nasrSub]) assert.equal(ceoIds.includes(emp.id), false, emp.fullName)
  // خصم جماعي بالقسم على الإدارة التنفيذية: موظفي فرعها بس
  const type = ok(await request(U.admin, 'POST', '/deductions/types', { code: 'EXB_COMMITMENT', nameAr: 'خصم التزام — اختبار الإدارة التنفيذية',
    category: 'DISCIPLINARY', calcMethod: 'DAYS_OF_SALARY', creatorScopes: ['DEPARTMENT_MANAGER', 'HR'], approvalSteps: ['HR'], escalationDays: '1',
    escalationStep: 'DEPARTMENT_MANAGER' }), 201)
  const incidentDate = new Date(Date.now() - 3 * 86400000).toLocaleDateString('en-CA')
  const bulk = ok(await request(U.admin, 'POST', '/deductions/preview', { deductionTypeId: type.id, inputValue: '1', incidentDate,
    reason: 'تأخر متكرر عن اجتماع التسليم الصباحي للفريق', targetPeriod: '2026-12', selection: { mode: 'DEPARTMENT', ids: [D.exec.id] } }), 201)
  const bulkIds = bulk.rows.map(row => row.employeeId)
  for (const emp of [E.ceo, E.secretary, E.mainStaff]) assert.ok(bulkIds.includes(emp.id), emp.fullName)
  for (const emp of [E.nasrHead, E.nasrStaff, E.nasrSub]) assert.equal(bulkIds.includes(emp.id), false, emp.fullName)
})

test('EX-10: بعد نقل أقسام الفروع التانية من تحت الإدارة التنفيذية شيل التعليم بيعدّي — القاعدة مابتقفلش أكتر من اللازم', async () => {
  const foreign = await repo('Department').find({ where: { parentId: D.exec.id }, order: { id: 'ASC' } })
  for (const row of foreign.filter(item => item.branchId !== B.main.id)) {
    ok(await request(U.admin, 'PATCH', `/departments/${row.id}`, { parentId: null }), 200)
  }
  const unflagged = ok(await request(U.admin, 'PATCH', `/departments/${D.exec.id}`, { isExecutive: false }), 200)
  assert.deepEqual([unflagged.isExecutive, unflagged.executiveSecretaryEmployeeId], [false, null])
  // وتعليم قسم تاني من غير أقسام فروع تحته عادي
  const flagged = ok(await request(U.admin, 'PATCH', `/departments/${D.maadiRoot.id}`, { isExecutive: true }), 200)
  assert.equal(flagged.isExecutive, true)
  assert.deepEqual((await repo('Department').find({ where: { isExecutive: true } })).map(row => row.id), [D.maadiRoot.id])
})
