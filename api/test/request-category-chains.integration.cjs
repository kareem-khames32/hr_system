'use strict'
// سلسلة اعتماد لكل فئة جوّه «بانِي الطلبات» (طلب المالك 26 سبتمبر): «طلبات الإجازة كلها ماشية على نفس السيناريو —
// ليه كل نوع ليه سلسلته؟». على SQL حقيقي: ربط الفئة بسلسلة ونقل المختارين بس، تغيير سلسلة الفئة بينقل الماشيين عليها
// بس، الإجازات والحضور على نفس السلسلة، «خصّص» و«رجّعه»، نسخة الفرع من سلسلة الفئة بتسري على كل نوع ماشي عليها
// (resolveChain زي ما هو)، حساب الفرع مايغيّرش ربط الشركة، والاستخدام بنطاق الفرع. قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_category_chains_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_category_chains_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-category-chains-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, ds, master, base, created = false
const B = {}, E = {}, U = {}, C = {}, T = {}
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }

async function request(user, method, route, body) {
  const token = jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    tokenVersion: 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]'),
    ...(user.scopeAllBranches ? { scopeAllBranches: true } : {}) })
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const ok = (response, status = 200) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const refused = (response, status, pattern) => {
  assert.equal(response.status, status, JSON.stringify(response.body))
  if (pattern) assert.match(JSON.stringify(response.body), pattern)
}
const step = employeeId => [{ approverRole: 'specific_employee', specificEmployeeId: employeeId, slaDays: 2 }]
const chainOf = async code => (await repo('RequestType').findOneByOrFail({ code })).approvalChainId
const map = async (user = U.admin) => ok(await request(user, 'GET', '/settings/request-categories'))
const typeInfo = (body, code) => body.types.find(t => t.code === code)
const categoryInfo = (body, category) => body.categories.find(c => c.category === category)
// فئة الإجازات بتطلب تاريخين صحيحين عند التقديم — يوم اتنين جاي (يوم عمل، ومن غير أثر رجعي)
const LEAVE_FIELDS = [{ key: 'fromDate', label: 'من تاريخ', type: 'date', required: true }, { key: 'toDate', label: 'إلى تاريخ', type: 'date', required: true }]
const nextMonday = (() => { const d = new Date(); d.setUTCDate(d.getUTCDate() + 7 + ((8 - d.getUTCDay()) % 7)); return d.toISOString().slice(0, 10) })()
const LEAVE_CODES = new Set(['RC_L1', 'RC_L2', 'RC_L3', 'RC_NASR'])
/** يقدّم طلب ويرجّع معتمد أول خطوة محلولة (resolvedSteps) — نفس المسار الحقيقي بتاع resolveChain. */
async function firstApproverOf(user, typeCode) {
  const payload = LEAVE_CODES.has(typeCode) ? { fromDate: nextMonday, toDate: nextMonday } : {}
  const made = ok(await request(user, 'POST', '/requests', { typeCode, payload }), 201)
  ok(await request(user, 'POST', `/requests/${made.id}/submit`), 201)
  const saved = await repo('Request').findOneByOrFail({ id: made.id })
  return JSON.parse(saved.resolvedSteps)[0]?.approverEmployeeId ?? null
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

  B.maadi = await repo('Branch').save({ code: 'RC-M', name: 'فرع المعادي' })
  B.nasr = await repo('Branch').save({ code: 'RC-N', name: 'فرع النصر' })
  const employee = (code, fullName, branchId) => repo('Employee').save({ employeeCode: code, fullName, branchId, status: 'active', isActive: true, joinDate: '2024-01-01' })
  E.approverA = await employee('RC-001', 'معتمد سلسلة الإجازات', B.nasr.id)
  E.approverB = await employee('RC-002', 'معتمد السلسلة الجديدة', B.nasr.id)
  E.approverMaadi = await employee('RC-003', 'معتمد نسخة المعادي', B.maadi.id)
  E.approverOwn = await employee('RC-004', 'معتمد سلسلة نوع بعينه', B.nasr.id)
  E.approverOther = await employee('RC-005', 'معتمد السلسلة المخصّصة', B.nasr.id)
  E.maadi = await employee('RC-006', 'موظف المعادي', B.maadi.id)
  E.nasr = await employee('RC-007', 'موظف النصر', B.nasr.id)
  const user = (email, role, branchId, employeeId, permissions, extra = {}) => repo('User').save({ email, displayName: email, passwordHash: 'test-only',
    role, branchId, employeeId, permissions: JSON.stringify(permissions), ...extra })
  U.admin = await user('admin@category.test', 'super_admin', null, null, ['*'])
  U.maadi = await user('maadi@category.test', 'employee', B.maadi.id, E.maadi.id, [])
  U.nasr = await user('nasr@category.test', 'employee', B.nasr.id, E.nasr.id, [])
  // حساب فرع النصر بالصلاحيتين — بيشوف فرعه بس ومايغيّرش إعداد الشركة
  U.nasrHr = await user('nasr-hr@category.test', 'hr_manager', B.nasr.id, null, ['approval_chains.manage', 'request_types.manage'])
  // حساب «كل الفروع» بصلاحية أنواع الطلبات بس — يقرأ الخريطة ومايربطش سلاسل
  U.typesOnly = await user('types@category.test', 'hr_manager', null, null, ['request_types.manage'], { scopeAllBranches: true })
  for (const approver of [E.approverA, E.approverB, E.approverMaadi, E.approverOwn, E.approverOther]) {
    await user(`${approver.employeeCode.toLowerCase()}@category.test`, 'employee', approver.branchId, approver.id, [])
  }
  const chain = async (code, nameAr, approver) => ok(await request(U.admin, 'POST', '/settings/approval-chains', { code, nameAr, steps: step(approver.id) }), 201)
  C.A = await chain('RC_LEAVES', 'سلسلة الإجازات (الأساسية)', E.approverA)
  C.B = await chain('RC_NEW', 'سلسلة جديدة للإجازات', E.approverB)
  const type = async (code, nameAr, category, approver) => {
    const own = await chain(`RC_OWN_${code}`, `سلسلة ${nameAr}`, approver)
    return ok(await request(U.admin, 'POST', '/settings/request-types', { nameAr, category, code, destinationHandler: 'none',
      customFields: category === 'leaves' ? LEAVE_FIELDS : [], approvalChainId: own.id, visibleTo: { mode: 'all', ids: [] } }), 201)
  }
  T.L1 = await type('RC_L1', 'إجازة اختبار أولى', 'leaves', E.approverOwn)
  T.L2 = await type('RC_L2', 'إجازة اختبار تانية', 'leaves', E.approverOwn)
  T.L3 = await type('RC_L3', 'إجازة بسلسلة خاصة', 'leaves', E.approverOwn)
  T.T1 = await type('RC_T1', 'إذن اختبار', 'time_attendance', E.approverOwn)
  T.F1 = await type('RC_F1', 'طلب مالي اختبار', 'financial', E.approverOwn)
  T.LT1 = await type('RC_LT1', 'خطاب اختبار', 'letters', E.approverOwn)
  // باب «خصم» (مرآة البذرة): سلسلته في شاشته — مايتحسبش على الفئة
  T.door = await repo('RequestType').save({ code: 'PAYROLL_DEDUCTION', nameAr: 'خصم', category: 'financial', destinationHandler: 'none', phase: 'P1' })
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
  if (errors.length) throw new AggregateError(errors, 'category chains fixture cleanup failed')
})

test('RC-01: من غير أي ربط — كل فئة من غير سلسلة، وكل نوع على سلسلته، والباب المالي «ثابت» بسببه', async () => {
  const body = await map()
  for (const category of ['leaves', 'time_attendance', 'financial']) {
    const info = categoryInfo(body, category)
    assert.equal(info.chainId, null, category)
    assert.equal(info.following, 0)
  }
  assert.equal(typeInfo(body, 'RC_L1').mode, 'custom')
  assert.equal(typeInfo(body, 'RC_L1').usageCount, 0)
  assert.equal(typeInfo(body, 'RC_L1').lastRequestAt, null)
  assert.equal(typeInfo(body, 'PAYROLL_DEDUCTION').mode, 'fixed')
  assert.match(typeInfo(body, 'PAYROLL_DEDUCTION').fixedReason, /شاشة الخصومات/)
  // مفيش ولا صف ربط اتكتب لوحده (لا ترحيل آلي)
  assert.equal(await repo('RequestsConfig').countBy({ key: require('../node_modules/typeorm').Like('requests.category_chain.%') }), 0)
})

test('RC-02: ربط الإجازات بسلسلة موجودة ينقل المختارين بس — والتالت بيفضل على سلسلته', async () => {
  const own3 = await chainOf('RC_L3')
  const result = ok(await request(U.admin, 'PUT', '/settings/request-categories/leaves/chain', { chainId: C.A.id, repointTypeIds: [T.L1.id, T.L2.id] }))
  assert.equal(result.chainId, C.A.id)
  assert.equal(result.previousChainId, null)
  assert.deepEqual(result.repointed.map(t => t.code).sort(), ['RC_L1', 'RC_L2'])
  assert.equal(await chainOf('RC_L1'), C.A.id)
  assert.equal(await chainOf('RC_L2'), C.A.id)
  assert.equal(await chainOf('RC_L3'), own3, 'اللي ما اتعلّمش عليه فاضل على سلسلته')
  assert.equal((await repo('RequestsConfig').findOneByOrFail({ key: 'requests.category_chain.leaves' })).value, String(C.A.id))
  const body = await map()
  assert.equal(categoryInfo(body, 'leaves').chainId, C.A.id)
  assert.equal(categoryInfo(body, 'leaves').following, 2)
  assert.equal(typeInfo(body, 'RC_L1').mode, 'category')
  assert.equal(typeInfo(body, 'RC_L1').chainSharedWith, 1, 'L1 وL2 على نفس السلسلة')
  assert.equal(typeInfo(body, 'RC_L3').mode, 'custom')
  const summary = body.chains.find(c => c.id === C.A.id)
  assert.equal(summary.stepsCount, 1)
  assert.deepEqual(summary.stepRoles, ['specific_employee'])
})

test('RC-03: الحضور على نفس سلسلة الإجازات — «مشتركة مع» في الخريطة', async () => {
  ok(await request(U.admin, 'PUT', '/settings/request-categories/time_attendance/chain', { chainId: C.A.id, repointTypeIds: [T.T1.id] }))
  assert.equal(await chainOf('RC_T1'), C.A.id)
  const body = await map()
  assert.deepEqual(categoryInfo(body, 'leaves').sharedWith, ['time_attendance'])
  assert.deepEqual(categoryInfo(body, 'time_attendance').sharedWith, ['leaves'])
  assert.equal(typeInfo(body, 'RC_T1').mode, 'category')
})

test('RC-04: نسخة المعادي من سلسلة الفئة بتسري على كل نوع ماشي عليها (والحضور المشترك كمان) — والنوع الخاص لأ', async () => {
  C.Amaadi = ok(await request(U.admin, 'POST', '/settings/approval-chains', { code: C.A.code, nameAr: 'سلسلة الإجازات — المعادي',
    branchId: B.maadi.id, steps: step(E.approverMaadi.id) }), 201)
  assert.equal(await firstApproverOf(U.maadi, 'RC_L1'), E.approverMaadi.id)
  assert.equal(await firstApproverOf(U.maadi, 'RC_L2'), E.approverMaadi.id)
  assert.equal(await firstApproverOf(U.maadi, 'RC_T1'), E.approverMaadi.id, 'الحضور ماشي على نفس السلسلة فبياخد نسختها')
  assert.equal(await firstApproverOf(U.nasr, 'RC_L1'), E.approverA.id, 'النصر من غير نسخة على العامة')
  assert.equal(await firstApproverOf(U.maadi, 'RC_L3'), E.approverOwn.id, 'النوع الخاص مايتأثرش بنسخة سلسلة الفئة')
  const body = await map()
  assert.deepEqual(body.chains.find(c => c.id === C.A.id).branchVersions.map(v => v.branchId), [B.maadi.id])
})

test('RC-05: «خصّص سلسلة للطلب ده» بتنسخ الخطوات ونسخ الفروع — التوجيه مايتغيرش لحد ما تعدّلها، وتعديلها مايلمسش الباقيين', async () => {
  const result = ok(await request(U.admin, 'POST', `/settings/request-types/${T.L2.id}/customize-chain`), 201)
  assert.equal(result.previousChainId, C.A.id)
  assert.equal(result.chain.code, 'CH_RC_L2')
  assert.equal(result.chain.branchId, null)
  assert.equal(result.chain.stepsCount, 1)
  assert.equal(result.branchVersions, 1)
  C.L2own = result.chain
  assert.equal(await chainOf('RC_L2'), C.L2own.id)
  assert.equal(typeInfo(await map(), 'RC_L2').mode, 'custom')
  assert.equal(await firstApproverOf(U.maadi, 'RC_L2'), E.approverMaadi.id, 'نسخة المعادي اتنسخت معاها')
  assert.equal(await firstApproverOf(U.nasr, 'RC_L2'), E.approverA.id)
  ok(await request(U.admin, 'PATCH', `/settings/approval-chains/${C.L2own.id}/steps`, { steps: step(E.approverOther.id) }))
  assert.equal(await firstApproverOf(U.nasr, 'RC_L2'), E.approverOther.id)
  assert.equal(await firstApproverOf(U.nasr, 'RC_L1'), E.approverA.id, 'L1 لسه على سلسلة الفئة')
  // سلسلته بقت بتاعته لوحده: ضغطة تانية ماتعملش نسخة تانية
  refused(await request(U.admin, 'POST', `/settings/request-types/${T.L2.id}/customize-chain`), 400, /سلسلته الخاصة أصلًا/)
  // الباب المالي مالوش سلسلة خاصة
  refused(await request(U.admin, 'POST', `/settings/request-types/${T.door.id}/customize-chain`), 400, /شاشة الخصومات/)
})

test('RC-06: «رجّعه لسلسلة الفئة» — والسلسلة المخصّصة فاضلة في المكتبة', async () => {
  const result = ok(await request(U.admin, 'POST', `/settings/request-types/${T.L2.id}/follow-category`), 201)
  assert.equal(result.changed, true)
  assert.equal(result.previousChainId, C.L2own.id)
  assert.equal(await chainOf('RC_L2'), C.A.id)
  assert.equal(await firstApproverOf(U.nasr, 'RC_L2'), E.approverA.id)
  assert.ok(await repo('ApprovalChain').findOneBy({ id: C.L2own.id }), 'مفيش مسح')
  const again = ok(await request(U.admin, 'POST', `/settings/request-types/${T.L1.id}/follow-category`), 201)
  assert.equal(again.changed, false)
  refused(await request(U.admin, 'POST', `/settings/request-types/${T.LT1.id}/follow-category`), 400, /مالهاش سلسلة عامة لسه/)
})

test('RC-07: تغيير سلسلة الإجازات بينقل الماشيين عليها بس — الخاص فاضل، والحضور فاضل على سلسلته (نفس القديمة)', async () => {
  const own3 = await chainOf('RC_L3')
  const result = ok(await request(U.admin, 'PUT', '/settings/request-categories/leaves/chain', { chainId: C.B.id }))
  assert.equal(result.previousChainId, C.A.id)
  assert.deepEqual(result.repointed.map(t => [t.code, t.fromChainId]).sort(), [['RC_L1', C.A.id], ['RC_L2', C.A.id]])
  assert.equal(await chainOf('RC_L1'), C.B.id)
  assert.equal(await chainOf('RC_L2'), C.B.id)
  assert.equal(await chainOf('RC_L3'), own3)
  assert.equal(await chainOf('RC_T1'), C.A.id, 'نوع الحضور بيتبع فئته هو')
  const body = await map()
  assert.equal(categoryInfo(body, 'leaves').chainId, C.B.id)
  assert.equal(categoryInfo(body, 'time_attendance').chainId, C.A.id)
  assert.deepEqual(categoryInfo(body, 'leaves').sharedWith, [])
  assert.equal(await firstApproverOf(U.maadi, 'RC_L1'), E.approverB.id, 'السلسلة الجديدة مالهاش نسخة للمعادي')
})

test('RC-08: سلسلة جديدة للفئة بنسخ خطوات سلسلة (ونسخ فروعها) — والمالية ترجع «كل طلب بسلسلته» من غير ما حد يتحرك', async () => {
  const letters = ok(await request(U.admin, 'PUT', '/settings/request-categories/letters/chain', { copyFromChainId: C.A.id, repointTypeIds: [T.LT1.id] }))
  assert.equal(letters.createdChain.code, 'CAT_LETTERS')
  assert.equal(letters.createdChain.nameAr, 'سلسلة الخطابات والشهادات')
  assert.equal(letters.createdChain.stepsCount, 1)
  assert.equal(letters.createdChain.branchVersions, 1)
  assert.equal(await chainOf('RC_LT1'), letters.createdChain.id)
  assert.equal(await firstApproverOf(U.maadi, 'RC_LT1'), E.approverMaadi.id, 'نسخة المعادي اتنسخت للسلسلة الجديدة')
  assert.equal(await firstApproverOf(U.nasr, 'RC_LT1'), E.approverA.id)
  // المالية: سلسلة ثم شيلها — النوع فاضل على نفس السلسلة (مابيرجعش لحاجة مش موجودة)
  ok(await request(U.admin, 'PUT', '/settings/request-categories/financial/chain', { chainId: C.B.id, repointTypeIds: [T.F1.id] }))
  assert.equal(await chainOf('RC_F1'), C.B.id)
  const cleared = ok(await request(U.admin, 'PUT', '/settings/request-categories/financial/chain', { chainId: null }))
  assert.equal(cleared.chainId, null)
  assert.deepEqual(cleared.repointed, [])
  assert.equal(await chainOf('RC_F1'), C.B.id)
  assert.equal((await repo('RequestsConfig').findOneByOrFail({ key: 'requests.category_chain.financial' })).value, '')
  const body = await map()
  assert.equal(categoryInfo(body, 'financial').chainId, null)
  assert.equal(typeInfo(body, 'RC_F1').mode, 'custom')
})

test('RC-09: الرفض — سلسلة فرع أو معطّلة أو فاضية، نوع من فئة تانية، الباب المالي، الإضافي على سلسلة بلا معتمدين، وطلب ناقص', async () => {
  const leaves = '/settings/request-categories/leaves/chain'
  refused(await request(U.admin, 'PUT', leaves, { chainId: C.Amaadi.id }), 400, /لكل الشركة/)
  const off = ok(await request(U.admin, 'POST', '/settings/approval-chains', { code: 'RC_OFF', nameAr: 'سلسلة معطّلة', steps: step(E.approverA.id) }), 201)
  ok(await request(U.admin, 'PATCH', `/settings/approval-chains/${off.id}`, { isActive: false }))
  refused(await request(U.admin, 'PUT', leaves, { chainId: off.id }), 400, /معطّلة/)
  const empty = ok(await request(U.admin, 'POST', '/settings/approval-chains', { code: 'RC_EMPTY', nameAr: 'سلسلة فاضية', steps: [] }), 201)
  refused(await request(U.admin, 'PUT', leaves, { chainId: empty.id }), 400, /مالهاش خطوات/)
  refused(await request(U.admin, 'PUT', leaves, { copyFromChainId: empty.id }), 400, /مالهاش خطوات/)
  refused(await request(U.admin, 'PUT', leaves, { chainId: C.B.id, repointTypeIds: [T.T1.id] }), 400, /مش من فئة/)
  refused(await request(U.admin, 'PUT', '/settings/request-categories/financial/chain', { chainId: C.B.id, repointTypeIds: [T.door.id] }), 400, /شاشة الخصومات/)
  refused(await request(U.admin, 'PUT', leaves, {}), 400, /واحدة بس/)
  refused(await request(U.admin, 'PUT', leaves, { chainId: C.B.id, copyFromChainId: C.A.id }), 400, /واحدة بس/)
  refused(await request(U.admin, 'PUT', '/settings/request-categories/general/chain', { chainId: C.B.id }), 400, /الفئة غير صالحة/)
  refused(await request(U.admin, 'PUT', leaves, { chainId: 999999 }), 400, /مش موجودة/)
  // الإضافي: سلسلة تنفيذ فوري (فاضية) مرفوضة له بالذات
  const auto = ok(await request(U.admin, 'POST', '/settings/approval-chains', { code: 'RC_AUTO', nameAr: 'تنفيذ فوري', steps: [] }), 201)
  ok(await request(U.admin, 'PATCH', `/settings/approval-chains/${auto.id}`, { autoApprove: true }))
  const overtime = ok(await request(U.admin, 'POST', '/settings/request-types', { nameAr: 'إضافي اختبار', category: 'time_attendance', code: 'RC_OT',
    destinationHandler: 'overtime_entries', customFields: [], approvalChainId: C.A.id, visibleTo: { mode: 'all', ids: [] } }), 201)
  refused(await request(U.admin, 'PUT', '/settings/request-categories/time_attendance/chain', { chainId: auto.id, repointTypeIds: [overtime.id] }), 400, /الإضافي محتاج معتمدين/)
  assert.equal(await chainOf('RC_OT'), C.A.id, 'المعاملة اترجعت كلها')
  assert.equal(await chainOf('RC_T1'), C.A.id)
  assert.equal((await repo('RequestsConfig').findOneByOrFail({ key: 'requests.category_chain.time_attendance' })).value, String(C.A.id))
})

test('RC-10: حساب الفرع — يشوف الخريطة، ومايغيّرش ربط الشركة ولا نوع لكل الشركة، ويخصّص نوع فرعه بسلسلة لفرعه', async () => {
  const body = await map(U.nasrHr)
  assert.ok(typeInfo(body, 'RC_L1'))
  refused(await request(U.nasrHr, 'PUT', '/settings/request-categories/leaves/chain', { chainId: C.A.id }), 403, /لكل الشركة/)
  refused(await request(U.nasrHr, 'POST', `/settings/request-types/${T.L3.id}/customize-chain`), 403, /لكل الشركة/)
  refused(await request(U.nasrHr, 'POST', `/settings/request-types/${T.L3.id}/follow-category`), 403, /لكل الشركة/)
  assert.equal(await chainOf('RC_L1'), C.B.id, 'مفيش حاجة اتحركت')
  // نوع خاص بفرع النصر (سلسلته التلقائية لفرعه) ← يمشي على سلسلة الفئة ← يتخصّص بسلسلة لفرعه
  const branchType = ok(await request(U.nasrHr, 'POST', '/settings/request-types', { nameAr: 'إجازة فرع النصر', category: 'leaves', code: 'RC_NASR',
    destinationHandler: 'none', customFields: LEAVE_FIELDS, visibleTo: { mode: 'all', ids: [] } }), 201)
  assert.equal(branchType.branchId, B.nasr.id)
  ok(await request(U.nasrHr, 'POST', `/settings/request-types/${branchType.id}/follow-category`), 201)
  assert.equal(await chainOf('RC_NASR'), C.B.id)
  const custom = ok(await request(U.nasrHr, 'POST', `/settings/request-types/${branchType.id}/customize-chain`), 201)
  assert.equal(custom.chain.branchId, B.nasr.id, 'سلسلة نوع الفرع لفرعه')
  assert.equal(custom.branchVersions, 0)
  assert.equal(await firstApproverOf(U.nasr, 'RC_NASR'), E.approverB.id, 'نفس الخطوات اللي كان ماشي عليها')
  // حساب «كل الفروع» بصلاحية واحدة: يقرأ، ومايربطش
  assert.ok(typeInfo(await map(U.typesOnly), 'RC_L1'))
  refused(await request(U.typesOnly, 'PUT', '/settings/request-categories/leaves/chain', { chainId: C.A.id }), 403, /الصلاحيتين/)
  refused(await request(U.typesOnly, 'POST', `/settings/request-types/${T.L3.id}/customize-chain`), 403, /الصلاحيتين/)
})

test('RC-11: الاستخدام — عدد الطلبات وآخر طلب لكل نوع، وحساب الفرع يشوف طلبات فرعه بس', async () => {
  const all = await map()
  const count = async where => repo('Request').countBy(where)
  assert.equal(typeInfo(all, 'RC_L1').usageCount, await count({ typeCode: 'RC_L1' }))
  assert.ok(typeInfo(all, 'RC_L1').usageCount >= 4)
  assert.ok(typeInfo(all, 'RC_L1').lastRequestAt)
  assert.equal(typeInfo(all, 'RC_F1').usageCount, 0, 'مااستُخدمش')
  assert.equal(typeInfo(all, 'RC_F1').lastRequestAt, null)
  const branch = await map(U.nasrHr)
  assert.equal(typeInfo(branch, 'RC_L1').usageCount, await count({ typeCode: 'RC_L1', branchId: B.nasr.id }))
  assert.ok(typeInfo(branch, 'RC_L1').usageCount < typeInfo(all, 'RC_L1').usageCount)
  // نسخ فروع تانية ماتظهرش لحساب النصر
  const summary = branch.chains.find(c => c.id === (typeInfo(branch, 'RC_T1').approvalChainId))
  assert.deepEqual(summary.branchVersions, [])
})

test('RC-12: ربط الفئة مايتكتبش من إعدادات النظام العامة، وسلسلة الفئة ماتتنقلش لفرع حتى لو مفيش نوع عليها', async () => {
  refused(await request(U.admin, 'PATCH', '/settings/config', { key: 'requests.category_chain.leaves', value: String(C.A.id) }), 400, /بانِي الطلبات/)
  assert.equal((await repo('RequestsConfig').findOneByOrFail({ key: 'requests.category_chain.leaves' })).value, String(C.B.id))
  const training = ok(await request(U.admin, 'PUT', '/settings/request-categories/training/chain', { copyFromChainId: C.B.id }))
  assert.deepEqual(training.repointed, [])
  refused(await request(U.admin, 'PATCH', `/settings/approval-chains/${training.chainId}`, { branchId: B.maadi.id }), 400, /سلسلة فئة/)
  assert.equal((await repo('ApprovalChain').findOneByOrFail({ id: training.chainId })).branchId, null)
})
