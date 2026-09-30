'use strict'
// فلتر «الفرع ← الإدارة ← القسم ← الفريق» الموحد (طلب المالك 30 سبتمبر): GET /org/filter-context وتضييق الخادم بيه — إثبات حي بـSQL وHTTP
// فعليين على قاعدة مؤقتة عشوائية تُحذف في النهاية:
//  OFC-01) حساب فرع النصر: فرعه بس، ووحداته وفرقه المفعّلة بس، وموظفينه بكل حالاتهم (المنتهية خدمتهم والمؤرشفين) برقمهم ومكانهم من غير
//          أسماء؛ وأب الوحدة من فرع تاني («الإدارة التنفيذية» في الرئيسي) null — لا رقمه ولا اسمه ولا أي حاجة من فرع برّه نطاقه.
//  OFC-02) حساب الشركة كلها ومدير النظام: كل الفروع المفعّلة، والإدارة التنفيذية ظاهرة أب لأقسام الفروع التانية.
//  OFC-03) حساب فرعين: الأب في فرع جوه نطاقه بيظهر، والفرع التالت مابيظهرش.
//  OFC-04) الصلاحية: أي واحدة من صلاحيات عرض الشاشات تكفي، ومن غيرها 403، والحساب بلا فرع نطاقه فاضي.
//  OFC-05) تضييق الخادم بمعاملات الفلتر: سجل الإجازات والتعداد جوه النطاق بس، وفرع أو قسم برّه النطاق مابيرجّعش حاجة، والقيمة الغلط 400.
// قاعدة hr_org_filter_test_<16 hex> — لا مساس بقاعدة الشركة. التوكنات موقّعة محليًا بسر عشوائي.
// Run (من api/): node --test test/org-filter-context.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_org_filter_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_org_filter_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-org-filter-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const EXEC_NAME = 'الإدارة التنفيذية للمجموعة'
const VIEW_PERMS = ['employees.view', 'documents.manage', 'custody.assign', 'transfers.view', 'offboarding.manage', 'attendance.view_all',
  'attendance_exemption.view', 'leaves.view_all', 'leave_balances.manage', 'payroll.view', 'payroll.disburse', 'deductions.view', 'bonuses.view',
  'requests.view_all', 'reports.view', 'users.manage']
let app, ds, master, base, created = false
const B = {}, D = {}, E = {}, U = {}, T = {}
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }

function token(user) {
  const payload = { sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') }
  if (user.scopeAllBranches === true) payload.scopeAllBranches = true
  if (user.scopeBranchIds) payload.branchIds = JSON.parse(user.scopeBranchIds)
  return jwt.sign(payload)
}
async function request(user, method, route) {
  const headers = { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) }
  const response = await fetch(base + route, { method, headers })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null, text }
}
const ok = (response, status = 200) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const context = async user => ok(await request(user, 'GET', '/org/filter-context'))
const ids = rows => rows.map(row => row.id).sort((a, b) => a - b)
const byId = (rows, id) => rows.find(row => row.id === id)

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
  // لحاق الإقلاع (بعد 30 و60 ثانية) مهمتان خلفيتان مالهمش دعوة بالفلتر
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assert.equal(ds.options.database, database)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`

  await repo('RequestsConfig').save([{ key: 'attendance.weekend_days', value: 'FRI,SAT' }, { key: 'system.country', value: 'EG' }])
  const branch = (key, code, name, isActive = true) => repo('Branch').save({ code, name, country: 'EG', weekendDays: 'FRI,SAT', isActive }).then(row => { B[key] = row })
  await branch('main', 'OFC_MAIN', 'الفرع الرئيسي بالقاهرة')
  await branch('nasr', 'OFC_NASR', 'فرع مدينة نصر')
  await branch('maadi', 'OFC_MAADI', 'فرع المعادي الجديد')
  await branch('closed', 'OFC_CLOSED', 'فرع مقفول قديم', false)
  const department = (key, values) => repo('Department').save({ isActive: true, unitType: 'DEPARTMENT', ...values }).then(row => { D[key] = row })
  await department('exec', { name: EXEC_NAME, code: 'OFC_EXEC', branchId: B.main.id, unitType: 'ADMINISTRATION', isExecutive: true })
  await department('mainOffice', { name: 'مكتب الرئيس التنفيذي بالرئيسي', code: 'OFC_OFFICE', branchId: B.main.id, parentId: D.exec.id })
  // إدارة من فرع النصر تحت الإدارة التنفيذية (أب من فرع تاني)، وقسم نصر تحت التنفيذية على طول
  await department('nasrSales', { name: 'إدارة مبيعات النصر', code: 'OFC_SALES', branchId: B.nasr.id, parentId: D.exec.id, unitType: 'ADMINISTRATION' })
  await department('nasrRetail', { name: 'تجزئة النصر', code: 'OFC_RETAIL', branchId: B.nasr.id, parentId: D.nasrSales.id })
  await department('nasrCare', { name: 'خدمة عملاء النصر', code: 'OFC_CARE', branchId: B.nasr.id, parentId: D.exec.id })
  await department('nasrOld', { name: 'قسم نصر موقوف', code: 'OFC_OLD', branchId: B.nasr.id, isActive: false })
  await department('maadiOps', { name: 'تشغيل المعادي', code: 'OFC_MAADI', branchId: B.maadi.id })
  await department('closedDept', { name: 'قسم الفرع المقفول', code: 'OFC_CLOSED', branchId: B.closed.id })
  const team = (key, values) => repo('Team').save({ isActive: true, ...values }).then(row => { T[key] = row })
  await team('retail', { name: 'فريق معرض النصر', code: 'OFC_T_RETAIL', departmentId: D.nasrRetail.id })
  await team('retailOld', { name: 'فريق نصر موقوف', code: 'OFC_T_OLD', departmentId: D.nasrRetail.id, isActive: false })
  await team('underOld', { name: 'فريق تحت قسم موقوف', code: 'OFC_T_UNDER', departmentId: D.nasrOld.id })
  await team('main', { name: 'فريق مكتب الرئيس', code: 'OFC_T_MAIN', departmentId: D.mainOffice.id })
  let n = 0
  const employee = (key, fullName, branchKey, values = {}) => repo('Employee').save({ employeeCode: `OFC${String(++n).padStart(3, '0')}`, fullName,
    branchId: B[branchKey].id, joinDate: '2020-01-01', status: 'active', isActive: true, basicSalary: 9000, housingAllowance: 0,
    transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0, currency: 'EGP', payMethod: 'cash', ...values }).then(row => { E[key] = row })
  await employee('ceo', 'رئيس المجموعة التنفيذي', 'main', { departmentId: D.exec.id })
  await employee('mainStaff', 'موظف مكتب الرئيس', 'main', { departmentId: D.mainOffice.id, teamId: T.main.id })
  await employee('nasrHead', 'مدير مبيعات النصر', 'nasr', { departmentId: D.nasrSales.id })
  await employee('nasrSeller', 'بائع معرض النصر', 'nasr', { departmentId: D.nasrRetail.id, teamId: T.retail.id })
  await employee('nasrLeaver', 'بائع ساب الشغل', 'nasr', { departmentId: D.nasrRetail.id, status: 'terminated', isActive: false })
  await employee('nasrArchived', 'موظف خدمة مؤرشف', 'nasr', { departmentId: D.nasrCare.id, status: 'archived', isActive: false, archivedAt: new Date('2026-01-10T10:00:00Z') })
  await employee('nasrOldDept', 'موظف في قسم موقوف', 'nasr', { departmentId: D.nasrOld.id, teamId: T.underOld.id })
  await employee('nasrOldTeam', 'موظف في فريق موقوف', 'nasr', { departmentId: D.nasrRetail.id, teamId: T.retailOld.id })
  await employee('maadiStaff', 'موظف تشغيل المعادي', 'maadi', { departmentId: D.maadiOps.id })
  await employee('closedStaff', 'موظف الفرع المقفول', 'closed', { departmentId: D.closedDept.id })
  // إجازات معتمدة لتضييق سجل الإجازات
  for (const key of ['nasrHead', 'nasrSeller', 'nasrArchived', 'maadiStaff', 'mainStaff']) {
    await repo('Leave').save({ employeeId: E[key].id, leaveTypeCode: 'annual', fromDate: '2026-09-01', toDate: '2026-09-02', days: 2, status: 'APPROVED' })
  }
  const user = (key, role, values) => repo('User').save({ email: `${key}@org-filter.invalid`, displayName: key, passwordHash: 'test-only',
    role, branchId: null, permissions: '[]', ...values }).then(row => { U[key] = row })
  await user('admin', 'super_admin', { permissions: '["*"]' })
  await user('companyHr', 'hr_manager', { branchId: B.main.id, scopeAllBranches: true, permissions: JSON.stringify(['employees.view']) })
  await user('nasrHr', 'hr_manager', { branchId: B.nasr.id, permissions: JSON.stringify(['employees.view', 'leaves.view_all', 'reports.view']) })
  await user('multi', 'hr_manager', { branchId: B.nasr.id, scopeBranchIds: JSON.stringify([B.main.id, B.nasr.id]), permissions: JSON.stringify(['payroll.view']) })
  await user('leavesOnly', 'hr_manager', { branchId: B.nasr.id, permissions: JSON.stringify(['leaves.view_all']) })
  await user('noPerm', 'employee', { branchId: B.nasr.id, employeeId: E.nasrSeller.id, permissions: JSON.stringify(['attendance.view_own', 'requests.create']) })
  await user('noBranch', 'hr_manager', { permissions: JSON.stringify(['employees.view']) })
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
  if (errors.length) throw new AggregateError(errors, 'org filter fixture cleanup failed')
})

test('OFC-01: حساب فرع النصر — فرعه ووحداته وفرقه المفعّلة وموظفينه بكل حالاتهم، ومفيش رقم ولا اسم من فرع برّه نطاقه', async () => {
  const response = await request(U.nasrHr, 'GET', '/org/filter-context')
  const body = ok(response)
  assert.deepEqual(body.branches, [{ id: B.nasr.id, name: B.nasr.name }])
  // الوحدات المفعّلة في النصر بس، بالحقول دي بس
  assert.deepEqual(ids(body.units), [D.nasrSales.id, D.nasrRetail.id, D.nasrCare.id].sort((a, b) => a - b))
  for (const row of body.units) {
    assert.deepEqual(Object.keys(row).sort(), ['branchId', 'id', 'isExecutive', 'name', 'parentId', 'unitType'])
    assert.equal(row.branchId, B.nasr.id)
    assert.equal(row.isExecutive, false)
  }
  // الأب من فرع تاني (الإدارة التنفيذية في الرئيسي) null؛ الأب من نفس الفرع زي ما هو
  assert.equal(byId(body.units, D.nasrSales.id).parentId, null)
  assert.equal(byId(body.units, D.nasrCare.id).parentId, null)
  assert.equal(byId(body.units, D.nasrRetail.id).parentId, D.nasrSales.id)
  assert.equal(byId(body.units, D.nasrSales.id).unitType, 'ADMINISTRATION')
  assert.equal(byId(body.units, D.nasrRetail.id).unitType, 'DEPARTMENT')
  // الفرق المفعّلة تحت وحدة ظاهرة بس
  assert.deepEqual(body.teams, [{ id: T.retail.id, name: T.retail.name, departmentId: D.nasrRetail.id, branchId: B.nasr.id }])
  // موظفين النصر بكل حالاتهم، برقمهم ومكانهم بس
  assert.deepEqual(ids(body.employees), ['nasrHead', 'nasrSeller', 'nasrLeaver', 'nasrArchived', 'nasrOldDept', 'nasrOldTeam'].map(key => E[key].id).sort((a, b) => a - b))
  for (const row of body.employees) assert.deepEqual(Object.keys(row).sort(), ['branchId', 'departmentId', 'id', 'teamId'])
  assert.deepEqual(byId(body.employees, E.nasrSeller.id), { id: E.nasrSeller.id, branchId: B.nasr.id, departmentId: D.nasrRetail.id, teamId: T.retail.id })
  assert.deepEqual(byId(body.employees, E.nasrLeaver.id).departmentId, D.nasrRetail.id, 'المنتهية خدمته موجود عشان صفوفه القديمة تتفلتر')
  assert.deepEqual(byId(body.employees, E.nasrOldDept.id), { id: E.nasrOldDept.id, branchId: B.nasr.id, departmentId: null, teamId: null }, 'قسم موقوف = مش ظاهر')
  assert.equal(byId(body.employees, E.nasrOldTeam.id).teamId, null, 'فريق موقوف = مش ظاهر')
  // مفيش أي أثر لفرع برّه النطاق: لا أسماء ولا أرقام وحدات أو فرق أو فروع
  for (const name of [EXEC_NAME, D.mainOffice.name, D.maadiOps.name, B.main.name, B.maadi.name, B.closed.name, T.main.name, D.nasrOld.name]) {
    assert.equal(response.text.includes(name), false, name)
  }
  const foreignUnits = new Set([D.exec.id, D.mainOffice.id, D.maadiOps.id, D.closedDept.id, D.nasrOld.id])
  for (const row of body.units) { assert.ok(!foreignUnits.has(row.id)); assert.ok(!foreignUnits.has(row.parentId)) }
  for (const row of body.employees) {
    assert.ok(!foreignUnits.has(row.departmentId), `employee ${row.id}`)
    assert.equal(row.branchId, B.nasr.id)
    assert.ok(![T.main.id, T.retailOld.id, T.underOld.id].includes(row.teamId))
  }
  // ولا بيانات شخصية للموظفين
  for (const key of Object.keys(E)) assert.equal(response.text.includes(E[key].fullName), false, key)
  assert.equal(response.text.includes(E.nasrSeller.employeeCode), false)
})

test('OFC-02: حساب الشركة كلها ومدير النظام — كل الفروع المفعّلة، والإدارة التنفيذية ظاهرة أب لأقسام الفروع التانية', async () => {
  const body = await context(U.companyHr)
  assert.deepEqual(ids(body.branches), [B.main.id, B.nasr.id, B.maadi.id].sort((a, b) => a - b), 'الفرع المقفول مش في القايمة')
  const exec = byId(body.units, D.exec.id)
  assert.deepEqual([exec.name, exec.unitType, exec.isExecutive, exec.parentId], [EXEC_NAME, 'ADMINISTRATION', true, null])
  assert.equal(byId(body.units, D.nasrSales.id).parentId, D.exec.id, 'الأب ظاهر للحساب')
  assert.equal(byId(body.units, D.nasrCare.id).parentId, D.exec.id)
  assert.equal(byId(body.units, D.closedDept.id), undefined, 'وحدات الفرع المقفول مش ظاهرة')
  assert.equal(byId(body.units, D.nasrOld.id), undefined, 'الوحدة الموقوفة مش ظاهرة')
  assert.deepEqual(ids(body.teams), [T.retail.id, T.main.id].sort((a, b) => a - b))
  assert.equal(body.employees.length, Object.keys(E).length, 'كل الموظفين')
  assert.equal(byId(body.employees, E.closedStaff.id).departmentId, null, 'قسم في فرع مقفول = مش ظاهر')
  assert.equal(byId(body.employees, E.ceo.id).departmentId, D.exec.id)
  assert.deepEqual(await context(U.admin), body, 'مدير النظام نفس الشركة كلها')
})

test('OFC-03: حساب فرعين (الرئيسي والنصر) — الأب في فرع جوه نطاقه بيظهر، والمعادي لأ', async () => {
  const body = await context(U.multi)
  assert.deepEqual(ids(body.branches), [B.main.id, B.nasr.id].sort((a, b) => a - b))
  assert.equal(byId(body.units, D.nasrSales.id).parentId, D.exec.id)
  assert.equal(body.units.some(row => row.branchId === B.maadi.id), false)
  assert.equal(body.employees.some(row => row.id === E.maadiStaff.id), false)
})

test('OFC-04: الصلاحية — أي صلاحية عرض شاشة فيها الفلتر تكفي، ومن غيرها 403، والحساب بلا فرع نطاقه فاضي', async () => {
  const controller = fs.readFileSync(path.join(apiRoot, 'src', 'org', 'org.controller.ts'), 'utf8')
  for (const perm of VIEW_PERMS) assert.ok(controller.includes(`'${perm}'`), perm)
  assert.equal((await request(U.noPerm, 'GET', '/org/filter-context')).status, 403)
  assert.equal((await request(null, 'GET', '/org/filter-context')).status, 401)
  const leavesOnly = await context(U.leavesOnly)
  assert.deepEqual(ids(leavesOnly.branches), [B.nasr.id], 'صلاحية الإجازات لوحدها تكفي، بنفس النطاق')
  assert.deepEqual(await context(U.noBranch), { branches: [], units: [], teams: [], employees: [] })
})

test('OFC-05: تضييق الخادم بمعاملات الفلتر — جوه النطاق بس، والبرّه مابيرجّعش حاجة، والقيمة الغلط 400', async () => {
  const leaveIds = body => body.items.map(row => row.employeeId).sort((a, b) => a - b)
  const all = ok(await request(U.nasrHr, 'GET', '/leaves'))
  assert.deepEqual(leaveIds(all), [E.nasrHead.id, E.nasrSeller.id, E.nasrArchived.id].sort((a, b) => a - b))
  // إدارة مبيعات النصر بأقسامها (زي ما الواجهة بتبعتها): الإجازات والإحصاءات منها بس
  const sales = ok(await request(U.nasrHr, 'GET', `/leaves?departmentIds=${D.nasrSales.id},${D.nasrRetail.id}`))
  assert.deepEqual(leaveIds(sales), [E.nasrHead.id, E.nasrSeller.id].sort((a, b) => a - b))
  assert.equal(sales.stats.all, 2); assert.equal(sales.total, 2)
  assert.deepEqual(leaveIds(ok(await request(U.nasrHr, 'GET', `/leaves?teamId=${T.retail.id}`))), [E.nasrSeller.id])
  // برّه النطاق: مفيش صفوف (النطاق بيتطبّق الأول)
  assert.deepEqual(ok(await request(U.nasrHr, 'GET', `/leaves?branchId=${B.main.id}`)).items, [])
  assert.deepEqual(ok(await request(U.nasrHr, 'GET', `/leaves?departmentIds=${D.maadiOps.id}`)).items, [])
  assert.equal((await request(U.nasrHr, 'GET', '/leaves?departmentIds=abc')).status, 400)
  // التعداد: بالفلتر، والفرع برّه النطاق مرفوض زي باقي التقارير
  const headcount = ok(await request(U.nasrHr, 'GET', `/reports/headcount?departmentIds=${D.nasrRetail.id}`))
  const total = rows => rows.reduce((sum, row) => sum + Number(row.total), 0)
  assert.equal(total(headcount.byStatus), 3, 'تجزئة النصر: البائع واللي ساب الشغل واللي فريقه موقوف')
  assert.deepEqual(headcount.byDepartment.map(row => row.departmentName), [D.nasrRetail.name])
  assert.equal(total(ok(await request(U.nasrHr, 'GET', '/reports/headcount')).byStatus), 6)
  assert.equal((await request(U.nasrHr, 'GET', `/reports/headcount?branchId=${B.main.id}`)).status, 403)
  assert.equal(total(ok(await request(U.admin, 'GET', `/reports/headcount?branchId=${B.main.id}`)).byStatus), 2)
})

test('OFC-06: أعداد الطلبات — صاحب طلب قديم اتنقل لفرع برّه النطاق قسمه وفريقه الجداد مايبانوش من العدد (CR21-B01)', async () => {
  await repo('RequestType').save({ code: 'OFC_PERSONAL', nameAr: 'تحديث بيانات للاختبار', category: 'personal_data', destinationHandler: 'employee_record',
    requiredFields: '[]', isActive: true, isConfidential: false })
  // موظف في فرع النصر (في نطاق القارئ) قدّم طلب وهو في النصر، وبعدها اتنقل لقسم وفريق في المعادي (برّه نطاق القارئ)
  const mover = await repo('Employee').save({ employeeCode: 'OFC900', fullName: 'موظف اتنقل بعد الطلب', branchId: B.nasr.id, departmentId: D.nasrRetail.id,
    joinDate: '2020-01-01', status: 'active', isActive: true, basicSalary: 9000, currency: 'EGP', payMethod: 'cash' })
  await repo('Request').save({ typeCode: 'OFC_PERSONAL', requesterId: mover.id, branchId: B.nasr.id, status: 'UNDER_REVIEW', payload: '{}' })
  const maadiTeam = await repo('Team').save({ isActive: true, name: 'فريق تشغيل المعادي', code: 'OFC_T_MAADI', departmentId: D.maadiOps.id })
  await repo('Employee').update({ id: mover.id }, { branchId: B.maadi.id, departmentId: D.maadiOps.id, teamId: maadiTeam.id })
  const count = body => body.byType.reduce((sum, row) => sum + Number(row.total), 0)
  const all = ok(await request(U.nasrHr, 'GET', '/reports/requests'))
  assert.ok(count(all) >= 1, 'الطلب القديم بفرع النصر فاضل في إجمالي النصر من غير فلتر')
  const foreignDepartment = ok(await request(U.nasrHr, 'GET', `/reports/requests?departmentIds=${D.maadiOps.id}`))
  const foreignTeam = ok(await request(U.nasrHr, 'GET', `/reports/requests?teamId=${maadiTeam.id}`))
  const missing = ok(await request(U.nasrHr, 'GET', '/reports/requests?departmentIds=999999'))
  assert.deepEqual(foreignDepartment, missing, 'قسم برّه النطاق زي رقم مش موجود بالظبط')
  assert.equal(count(foreignTeam), 0, 'فريق برّه النطاق مابيعدّش حاجة')
  // جوه النطاق الفلتر شغال عادي: قسم التجزئة في النصر مابقاش فيه صاحب الطلب ده
  const ownRetail = ok(await request(U.nasrHr, 'GET', `/reports/requests?departmentIds=${D.nasrRetail.id}`))
  assert.equal(count(ownRetail), 0)
  // حساب الشركة كلها بيشوف مكانه الجديد عادي (جوه نطاقه)
  const companyWide = ok(await request(U.admin, 'GET', `/reports/requests?departmentIds=${D.maadiOps.id}`))
  assert.ok(count(companyWide) >= 1)
})
