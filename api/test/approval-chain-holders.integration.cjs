'use strict'
// B1.11 على SQL حقيقي:
// D05 — تحذير محرر السلاسل: خطوة وظيفية مالهاش حساب نشط بيحملها في فرع. الحامل بصلاحياته النهائية (حزمة الدور، والمنح الفردي، والعمود
//   القديم، ناقص السحب) ونطاقه الفعّال؛ مدير النظام والحساب الموقوف مش حاملين؛ وقارئ الفرع مابيشوفش فرع برّه نطاقه.
// D12 — كشف «المدير المسجل غير قائد الفريق»: عرض بس، بنطاق الحساب.
// قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_chain_holders_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_chain_holders_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-chain-holders-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, ds, master, base, created = false
const B = {}, E = {}, U = {}, C = {}
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }

async function request(user, method, route, body) {
  const token = jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    tokenVersion: 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const ok = (response, status = 200) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const gapsOf = async (reader, chainId) => {
  const chain = ok(await request(reader, 'GET', '/settings/approval-chains')).find(item => item.id === chainId)
  assert.ok(chain, `السلسلة ${chainId} ظاهرة`)
  return chain.holderGaps.map(gap => `${gap.stepOrder}:${gap.kind}:${gap.role}:${gap.branches.map(branch => branch.name).join('+')}`)
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME,
    password: env.DB_PASSWORD, database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assert.equal(ds.options.database, database)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`

  B.riyadh = await repo('Branch').save({ code: 'CH-R', name: 'فرع الرياض التجريبي' })
  B.jeddah = await repo('Branch').save({ code: 'CH-J', name: 'فرع جدة التجريبي' })
  B.closed = await repo('Branch').save({ code: 'CH-X', name: 'فرع مقفول تجريبي', isActive: false })
  // دور مخصص حزمته فيها اعتماد المالية
  await repo('Role').save({ code: 'ch_finance', nameAr: 'محاسب تجريبي', permissions: JSON.stringify(['approve.finance']), isActive: true })
  const user = (email, role, branchId, permissions, extra = {}) => repo('User').save({ email, displayName: email, passwordHash: 'test-only',
    role, branchId, permissions: JSON.stringify(permissions), ...extra })
  U.admin = await user('admin@holders.test', 'super_admin', null, ['*'])
  U.riyadhHr = await user('riyadh-hr@holders.test', 'hr_manager', B.riyadh.id, ['approval_chains.manage', 'employees.view'])
  U.plain = await user('plain@holders.test', 'employee', B.riyadh.id, [])
  // مالية الرياض من حزمة الدور
  U.financeRiyadh = await user('finance-r@holders.test', 'ch_finance', B.riyadh.id, [])
  // مالية جدة: واحد اتسحبت منه، وواحد حسابه موقوف — الاتنين مش حاملين
  U.financeRevoked = await user('finance-revoked@holders.test', 'ch_finance', B.jeddah.id, [])
  await repo('UserPermissionOverride').save({ userId: U.financeRevoked.id, permission: 'approve.finance', effect: 'REVOKE' })
  U.financeInactive = await user('finance-off@holders.test', 'ch_finance', B.jeddah.id, [], { isActive: false })
  // التنفيذي في جدة بمنح فردي، وIT في جدة من العمود القديم
  U.execJeddah = await user('exec-j@holders.test', 'employee', B.jeddah.id, [])
  await repo('UserPermissionOverride').save({ userId: U.execJeddah.id, permission: 'approve.executive', effect: 'GRANT' })
  U.itJeddah = await user('it-j@holders.test', 'employee', B.jeddah.id, ['it'])

  C.chain = ok(await request(U.admin, 'POST', '/settings/approval-chains', { code: 'CH_HOLDERS', nameAr: 'سلسلة اختبار الحاملين', steps: [
    { approverRole: 'finance', slaDays: 2, escalateTo: 'executive' },
    { approverRole: 'it' },
    { approverRole: 'payroll_officer' },
  ] }), 201)
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
  if (errors.length) throw new AggregateError(errors, 'chain holders fixture cleanup failed')
})

test('CHI-01: الثغرات بالصلاحيات النهائية — حزمة الدور والمنح والعمود القديم بيحملوا، والمسحوبة والحساب الموقوف ومدير النظام لأ، والفرع المقفول مالوش تحذير', async () => {
  assert.deepEqual(await gapsOf(U.admin, C.chain.id), [
    '1:APPROVER:finance:فرع جدة التجريبي',
    '1:ESCALATION:executive:فرع الرياض التجريبي',
    '2:APPROVER:it:فرع الرياض التجريبي',
    '3:APPROVER:payroll_officer:فرع الرياض التجريبي+فرع جدة التجريبي',
  ])
})

test('CHI-02: قارئ الرياض بيشوف فرعه بس — ولا اسم فرع جدة في الرد', async () => {
  assert.deepEqual(await gapsOf(U.riyadhHr, C.chain.id), [
    '1:ESCALATION:executive:فرع الرياض التجريبي',
    '2:APPROVER:it:فرع الرياض التجريبي',
    '3:APPROVER:payroll_officer:فرع الرياض التجريبي',
  ])
  const body = ok(await request(U.riyadhHr, 'GET', '/settings/approval-chains'))
  assert.equal(JSON.stringify(body.map(chain => chain.holderGaps)).includes('جدة'), false)
})

test('CHI-03: حامل جديد بيقفل الثغرة فورًا، ونسخة فرع مفعّلة بتشيل فرعها من العامة وبتتفحص لوحدها، والتحذير مابيمنعش الحفظ', async () => {
  // اعتماد الرواتب لحساب على مستوى الشركة (كل الفروع) — بيغطي الفرعين
  U.payrollAll = await repo('User').save({ email: 'payroll-all@holders.test', displayName: 'payroll-all', passwordHash: 'test-only', role: 'employee',
    branchId: B.riyadh.id, scopeAllBranches: true, permissions: JSON.stringify(['approve.payroll']) })
  assert.deepEqual((await gapsOf(U.admin, C.chain.id)).filter(line => line.startsWith('3:')), [])
  // نسخة جدة بخطوة مالية بس: جدة بتخرج من العامة، والنسخة نفسها عليها تحذير المالية
  const copy = ok(await request(U.admin, 'POST', '/settings/approval-chains', { code: 'CH_HOLDERS', nameAr: 'سلسلة اختبار الحاملين — جدة', branchId: B.jeddah.id,
    steps: [{ approverRole: 'finance' }] }), 201)
  assert.deepEqual(await gapsOf(U.admin, C.chain.id), ['1:ESCALATION:executive:فرع الرياض التجريبي', '2:APPROVER:it:فرع الرياض التجريبي'])
  assert.deepEqual(await gapsOf(U.admin, copy.id), ['1:APPROVER:finance:فرع جدة التجريبي'])
  // قارئ الرياض مابيشوفش نسخة جدة أصلًا
  assert.equal(ok(await request(U.riyadhHr, 'GET', '/settings/approval-chains')).some(chain => chain.id === copy.id), false)
  // تعطيل النسخة بيرجّع جدة للعامة
  ok(await request(U.admin, 'PATCH', `/settings/approval-chains/${copy.id}`, { isActive: false }))
  assert.deepEqual(await gapsOf(U.admin, C.chain.id), ['1:APPROVER:finance:فرع جدة التجريبي', '1:ESCALATION:executive:فرع الرياض التجريبي', '2:APPROVER:it:فرع الرياض التجريبي'])
  assert.deepEqual(await gapsOf(U.admin, copy.id), [])
})

test('CHI-04 (D12): كشف «المدير المسجل غير قائد الفريق» — بنطاق الحساب، والقائد نفسه والمدير الفاضي والموقوف مش في الكشف، ومفيش أي تعديل', async () => {
  const department = await repo('Department').save({ name: 'قسم المبيعات التجريبي', branchId: B.riyadh.id })
  const employee = (code, fullName, branchId, extra = {}) => repo('Employee').save({ employeeCode: code, fullName, branchId, status: 'active', isActive: true,
    joinDate: '2024-01-01', ...extra })
  E.outsider = await employee('CH-900', 'مدير من جدة', B.jeddah.id)
  E.leader = await employee('CH-100', 'قائد الفريق', B.riyadh.id, { managerEmployeeId: E.outsider.id })
  E.other = await employee('CH-101', 'مدير مسجل تاني', B.riyadh.id)
  const team = await repo('Team').save({ name: 'فريق المبيعات التجريبي', departmentId: department.id, leaderEmployeeId: E.leader.id })
  const noLeader = await repo('Team').save({ name: 'فريق من غير قائد', departmentId: department.id })
  E.follows = await employee('CH-102', 'تابع للقائد', B.riyadh.id, { teamId: team.id, managerEmployeeId: E.leader.id })
  E.differs = await employee('CH-103', 'مديره غير القائد', B.riyadh.id, { teamId: team.id, managerEmployeeId: E.other.id })
  E.empty = await employee('CH-104', 'من غير مدير مسجل', B.riyadh.id, { teamId: team.id })
  E.outsideManager = await employee('CH-105', 'مديره من جدة', B.riyadh.id, { teamId: team.id, managerEmployeeId: E.outsider.id })
  E.jeddahMember = await employee('CH-106', 'عضو في جدة', B.jeddah.id, { teamId: team.id, managerEmployeeId: E.other.id })
  E.inactive = await employee('CH-107', 'موقوف', B.riyadh.id, { teamId: team.id, managerEmployeeId: E.other.id, isActive: false })
  E.noLeaderTeam = await employee('CH-108', 'في فريق من غير قائد', B.riyadh.id, { teamId: noLeader.id, managerEmployeeId: E.other.id })
  await repo('Employee').update(E.leader.id, { teamId: team.id })
  const before = (await repo('Employee').find({ order: { id: 'ASC' } })).map(row => [row.id, row.managerEmployeeId, row.teamId])

  const company = ok(await request(U.admin, 'GET', '/teams/manager-mismatches'))
  assert.deepEqual(company.rows.map(row => row.employeeCode), ['CH-103', 'CH-105', 'CH-106'])
  assert.equal(company.total, 3)
  const differs = company.rows.find(row => row.employeeId === E.differs.id)
  assert.deepEqual([differs.team, differs.recordedManager.fullName, differs.teamLeader.fullName],
    [{ id: team.id, name: 'فريق المبيعات التجريبي' }, 'مدير مسجل تاني', 'قائد الفريق'])

  const riyadh = ok(await request(U.riyadhHr, 'GET', '/teams/manager-mismatches'))
  assert.deepEqual(riyadh.rows.map(row => row.employeeCode), ['CH-103', 'CH-105'])
  const masked = riyadh.rows.find(row => row.employeeId === E.outsideManager.id).recordedManager
  assert.deepEqual(masked, { id: null, employeeCode: null, fullName: 'موظف خارج نطاق صلاحيتك', isActive: null })
  assert.equal(JSON.stringify(riyadh).includes('مدير من جدة'), false)
  assert.equal(JSON.stringify(riyadh).includes('عضو في جدة'), false)

  assert.equal((await request(U.plain, 'GET', '/teams/manager-mismatches')).status, 403)
  assert.deepEqual((await repo('Employee').find({ order: { id: 'ASC' } })).map(row => [row.id, row.managerEmployeeId, row.teamId]), before, 'الكشف مابيعدّلش حاجة')
})
