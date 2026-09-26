'use strict'
// «مدير المدير المباشر» (طلب المالك 27 سبتمبر): خطوة اعتماد جديدة = المدير المباشر لمدير مقدّم الطلب المباشر.
// الاختبار على SQL حقيقي وHTTP: الموظف العادي بيروح لمدير مديره، ومدير تحت الرئيس التنفيذي مباشرة الخطوة بتقع على
// الرئيس نفسه ومابتتكررش (مش لمدير فرعه اللي تحته)، والبيانات الناقصة أو الدايرة بتوقف التقديم برسالة، والسرّي
// مابيروحش للمدير المباشر من الباب ده، والدور مش مقبول كجهة تصعيد. قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_skip_level_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_skip_level_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-skip-level-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, ds, master, base, created = false
const B = {}, E = {}, U = {}, C = {}
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }

async function request(user, method, route, body) {
  const token = jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    tokenVersion: 0, ...(user.scopeAllBranches ? { scopeAllBranches: true } : {}),
    permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const ok = (response, status = 201) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
/** يقدّم طلب ويرجّع رد التقديم (الحالة والخطوات المحلولة) */
async function submit(user, typeCode = 'MDM_REQ') {
  const draft = ok(await request(user, 'POST', '/requests', { typeCode, payload: {} }))
  return request(user, 'POST', `/requests/${draft.id}/submit`)
}
const stepsOf = async id => JSON.parse((await repo('Request').findOneByOrFail({ id })).resolvedSteps).map(step => [step.role, step.approverEmployeeId])
const approve = (user, id) => request(user, 'POST', `/requests/${id}/act`, { action: 'APPROVE' })

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

  B.main = await repo('Branch').save({ code: 'MDM-MAIN', name: 'الفرع الرئيسي' })
  B.nasr = await repo('Branch').save({ code: 'MDM-NASR', name: 'فرع النصر' })
  const employee = (code, fullName, branchId, managerEmployeeId = null) => repo('Employee').save({ employeeCode: code, fullName, branchId,
    managerEmployeeId, status: 'active', isActive: true, joinDate: '2024-01-01' })
  E.ceo = await employee('MDM-CEO', 'الرئيس التنفيذي', B.main.id)
  // مدير الفرع الرئيسي تحت الرئيس في الواقع — التدرّج كان هيوديله خطوة «مدير المدير» بتاعة الرئيس لو مفيش قاعدة رأس الشركة
  E.mainBranchManager = await employee('MDM-BM', 'مدير الفرع الرئيسي', B.main.id, E.ceo.id)
  await repo('Branch').update({ id: B.main.id }, { managerEmployeeId: E.mainBranchManager.id })
  await repo('Department').save({ name: 'الإدارة التنفيذية', branchId: B.main.id, isExecutive: true, managerEmployeeId: E.ceo.id })
  E.director = await employee('MDM-DIR', 'مدير إدارة النصر', B.nasr.id, E.ceo.id)
  E.leader = await employee('MDM-LEAD', 'قائد فريق النصر', B.nasr.id, E.director.id)
  E.staff = await employee('MDM-STAFF', 'موظف النصر', B.nasr.id, E.leader.id)
  E.orphanManager = await employee('MDM-ORPH', 'مدير من غير مدير', B.nasr.id)
  E.orphanStaff = await employee('MDM-OSTAFF', 'موظف مديره ناقص', B.nasr.id, E.orphanManager.id)
  E.loopA = await employee('MDM-LOOPA', 'موظف الدايرة أ', B.nasr.id)
  E.loopB = await employee('MDM-LOOPB', 'موظف الدايرة ب', B.nasr.id, E.loopA.id)
  await repo('Employee').update({ id: E.loopA.id }, { managerEmployeeId: E.loopB.id })
  E.chairman = await employee('MDM-CHAIR', 'رئيس مجلس الإدارة', B.main.id)

  const user = (key, emp, extra = {}) => repo('User').save({ email: `${key}@mdm.test`, displayName: key, passwordHash: 'test-only',
    role: 'employee', branchId: emp.branchId, employeeId: emp.id, permissions: '[]', ...extra }).then(saved => { U[key] = saved })
  U.admin = await repo('User').save({ email: 'admin@mdm.test', displayName: 'admin', passwordHash: 'test-only', role: 'super_admin', branchId: null,
    employeeId: null, permissions: JSON.stringify(['*']) })
  // حساب الرئيس على مستوى الشركة: بيعتمد طلبات فروع تانية (النطاق نفسه ماتغيّرش)
  await user('ceo', E.ceo, { scopeAllBranches: true })
  await user('chairman', E.chairman, { scopeAllBranches: true })
  for (const key of ['director', 'leader', 'staff', 'orphanStaff', 'loopA', 'mainBranchManager']) await user(key, E[key])

  const chain = async (code, steps) => ok(await request(U.admin, 'POST', '/settings/approval-chains', { code, nameAr: `سلسلة ${code}`, steps }))
  C.main = await chain('MDM_CHAIN', [{ approverRole: 'direct_manager_of_requester' }, { approverRole: 'manager_of_direct_manager' }])
  C.only = await chain('MDM_ONLY', [{ approverRole: 'manager_of_direct_manager' }])
  C.secret = await chain('MDM_SECRET', [{ approverRole: 'direct_manager_of_requester' }, { approverRole: 'manager_of_direct_manager' }])
  const type = async (code, chainId) => ok(await request(U.admin, 'POST', '/settings/request-types', { nameAr: `طلب ${code}`, category: 'employee_relations',
    code, destinationHandler: 'none', customFields: [], approvalChainId: chainId, visibleTo: { mode: 'all', ids: [] } }))
  await type('MDM_REQ', C.main.id)
  await type('MDM_ONLY_REQ', C.only.id)
  await type('MDM_SECRET_REQ', C.secret.id)
  await repo('RequestType').update({ code: 'MDM_SECRET_REQ' }, { isConfidential: true })
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
  if (errors.length) throw new AggregateError(errors, 'skip-level fixture cleanup failed')
})

test('MDM-01: موظف عادي — المدير المباشر ثم مدير مديره، وكل واحد بيعتمد خطوته بس', async () => {
  const submitted = ok(await submit(U.staff))
  assert.equal(submitted.status, 'UNDER_REVIEW')
  assert.deepEqual(await stepsOf(submitted.id), [['direct_manager_of_requester', E.leader.id], ['manager_of_direct_manager', E.director.id]])
  assert.equal((await approve(U.director, submitted.id)).status, 403, 'مدير المدير مايعتمدش قبل دوره')
  ok(await approve(U.leader, submitted.id))
  assert.equal((await approve(U.leader, submitted.id)).status, 403, 'المدير المباشر مايعتمدش خطوة مديره')
  const done = ok(await approve(U.director, submitted.id))
  assert.ok(['APPROVED', 'COMPLETED'].includes(done.status), done.status)
  // صندوق مدير المدير فضي بعد ما اعتمد
  assert.equal(ok(await request(U.director, 'GET', '/requests/inbox'), 200).length, 0)
})

test('MDM-02: قائد فريق — مدير مديره المسجّل (الرئيس في فرع تاني) بيعتمد من حسابه اللي على مستوى الشركة', async () => {
  const submitted = ok(await submit(U.leader))
  assert.deepEqual(await stepsOf(submitted.id), [['direct_manager_of_requester', E.director.id], ['manager_of_direct_manager', E.ceo.id]])
  ok(await approve(U.director, submitted.id))
  const inbox = ok(await request(U.ceo, 'GET', '/requests/inbox'), 200)
  assert.ok(inbox.some(row => row.id === submitted.id), 'الطلب في صندوق الرئيس')
  assert.ok(['APPROVED', 'COMPLETED'].includes(ok(await approve(U.ceo, submitted.id)).status))
})

test('MDM-03: مدير تحت الرئيس مباشرة — الخطوة بتقع على الرئيس (مش مدير الفرع اللي تحته) ومابتتكررش', async () => {
  const submitted = ok(await submit(U.director))
  assert.deepEqual(await stepsOf(submitted.id), [['direct_manager_of_requester', E.ceo.id]], 'الرئيس مرة واحدة بس')
  assert.ok(['APPROVED', 'COMPLETED'].includes(ok(await approve(U.ceo, submitted.id)).status))
  // سلسلة فيها «مدير المدير المباشر» لوحدها: الرئيس هو صاحبها
  const only = ok(await submit(U.director, 'MDM_ONLY_REQ'))
  assert.deepEqual(await stepsOf(only.id), [['manager_of_direct_manager', E.ceo.id]])
  assert.equal((await approve(U.mainBranchManager, only.id)).status, 403, 'مدير الفرع الرئيسي مش صاحب الخطوة')
  assert.ok(['APPROVED', 'COMPLETED'].includes(ok(await approve(U.ceo, only.id)).status))
})

test('MDM-04: لو الرئيس له مدير مسجّل في ملفه، الخطوة بتروحله هو', async () => {
  await repo('Employee').update({ id: E.ceo.id }, { managerEmployeeId: E.chairman.id })
  try {
    const submitted = ok(await submit(U.director))
    assert.deepEqual(await stepsOf(submitted.id), [['direct_manager_of_requester', E.ceo.id], ['manager_of_direct_manager', E.chairman.id]])
  } finally {
    await repo('Employee').update({ id: E.ceo.id }, { managerEmployeeId: null })
  }
})

test('MDM-05: مدير مباشر مالوش مدير (بيانات ناقصة) — التقديم بيقف برسالة باسمه', async () => {
  const refused = await submit(U.orphanStaff)
  assert.equal(refused.status, 400, JSON.stringify(refused.body))
  assert.match(JSON.stringify(refused.body), /مدير من غير مدير/)
  assert.equal(await repo('Request').countBy({ requesterId: E.orphanStaff.id, status: 'UNDER_REVIEW' }), 0)
})

test('MDM-06: دايرة في الهيكل (مدير المدير = مقدّم الطلب) — التقديم بيقف', async () => {
  const refused = await submit(U.loopA)
  assert.equal(refused.status, 400, JSON.stringify(refused.body))
  assert.match(JSON.stringify(refused.body), /مقدّم الطلب نفسه/)
})

test('MDM-07: السرّي — مابيروحش للمدير المباشر، ولا من باب «مدير المدير» لما يقع عليه', async () => {
  const staff = ok(await submit(U.staff, 'MDM_SECRET_REQ'))
  assert.deepEqual(await stepsOf(staff.id), [['manager_of_direct_manager', E.director.id]], 'مدير المدير فضل، والمدير المباشر اتخطّى')
  // مدير تحت الرئيس: المدير المباشر = الرئيس، و«مدير المدير» وقع على الرئيس نفسه → الاتنين اتخطّوا، والسلسلة وقفت (مش تنفيذ من غير اعتماد)
  const director = await submit(U.director, 'MDM_SECRET_REQ')
  assert.equal(director.status, 400, JSON.stringify(director.body))
  assert.match(JSON.stringify(director.body), /لم تُحدَّد خطوات الاعتماد/)
})

test('MDM-08: «مدير المدير المباشر» مش مقبول كجهة تصعيد (إنشاء السلسلة وتعديل الخطوة)', async () => {
  const create = await request(U.admin, 'POST', '/settings/approval-chains', { code: 'MDM_ESC', nameAr: 'تصعيد مرفوض',
    steps: [{ approverRole: 'hr', slaDays: 2, escalateTo: 'manager_of_direct_manager' }] })
  assert.equal(create.status, 400, JSON.stringify(create.body))
  assert.match(JSON.stringify(create.body), /مش كجهة تصعيد/)
  const step = await repo('ApprovalStep').findOneByOrFail({ chainId: C.main.id, stepOrder: 1 })
  assert.equal((await request(U.admin, 'PATCH', `/settings/approval-steps/${step.id}`, { escalateTo: 'manager_of_direct_manager' })).status, 400)
  assert.equal((await repo('ApprovalStep').findOneByOrFail({ id: step.id })).escalateTo, null)
})

test('MDM-09: الشاشة — الاختيار ظاهر بعد «المدير المباشر» ومش في قايمة التصعيد، وتسميته في الصناديق', () => {
  const model = require('../../src/components/approvals/chainEditorModel.ts')
  const roles = Object.keys(model.roleLabels)
  assert.equal(model.roleLabels.manager_of_direct_manager, 'مدير المدير المباشر')
  assert.equal(roles.indexOf('manager_of_direct_manager'), roles.indexOf('direct_manager_of_requester') + 1)
  assert.ok(model.roleLabels.department_manager_of_requester, '«مدير القسم» زي ما هو')
  assert.ok(!model.escalationRoles.some(([id]) => id === 'manager_of_direct_manager'))
  assert.equal(model.chainStepsText([{ approverRole: 'direct_manager_of_requester' }, { approverRole: 'manager_of_direct_manager' }]), 'المدير المباشر ← مدير المدير المباشر')
  for (const file of ['src/app/approvals-inbox/page.tsx', 'src/app/requests/page.tsx', 'src/app/requests-console/page.tsx']) {
    assert.ok(fs.readFileSync(path.join(apiRoot, '..', file), 'utf8').includes("manager_of_direct_manager: 'مدير المدير المباشر',"), file)
  }
})
