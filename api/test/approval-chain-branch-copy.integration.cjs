'use strict'
// «نسخة خاصة بفرع» لسلسلة اعتماد (طلب المالك 24 سبتمبر): نفس نوع الطلب بسلسلة مختلفة في كل فرع — الإجازة في المعادي
// غير النصر. الشاشة بقت بتعمل نسخة بنفس كود السلسلة العامة لفرع بعينه؛ الاختبار ده بيثبت على SQL حقيقي إن ده
// فعلًا بيغيّر مسار الطلب: طلب موظف المعادي بيروح لمعتمد نسخة المعادي، والنصر (من غير نسخة) للعامة، وتعطيل النسخة
// يرجّع المعادي للعامة، وحساب الفرع مايعملش نسخة لفرع تاني. قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_chain_branch_copy_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_chain_branch_copy_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-chain-branch-copy-files-'))
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
const ok = (response, status = 201) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
/** يقدّم طلب من النوع المخصّص ويرجّع معتمد أول خطوة محلولة (resolvedSteps). */
async function firstApproverOf(user) {
  const created = ok(await request(user, 'POST', '/requests', { typeCode: 'BR_REQ', payload: {} }))
  ok(await request(user, 'POST', `/requests/${created.id}/submit`), 201)
  const saved = await repo('Request').findOneByOrFail({ id: created.id })
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

  B.maadi = await repo('Branch').save({ code: 'BR-M', name: 'فرع المعادي' })
  B.nasr = await repo('Branch').save({ code: 'BR-N', name: 'فرع النصر' })
  const employee = (code, fullName, branchId) => repo('Employee').save({ employeeCode: code, fullName, branchId, status: 'active', isActive: true, joinDate: '2024-01-01' })
  E.approverGeneral = await employee('BR-001', 'معتمد السلسلة العامة', B.nasr.id)
  E.approverMaadi = await employee('BR-002', 'معتمد نسخة المعادي', B.maadi.id)
  E.approverNasr = await employee('BR-003', 'معتمد نسخة النصر', B.nasr.id)
  E.maadi = await employee('BR-004', 'موظف المعادي', B.maadi.id)
  E.nasr = await employee('BR-005', 'موظف النصر', B.nasr.id)
  const user = (email, role, branchId, employeeId, permissions) => repo('User').save({ email, displayName: email, passwordHash: 'test-only',
    role, branchId, employeeId, permissions: JSON.stringify(permissions) })
  U.admin = await user('admin@chain.test', 'super_admin', null, null, ['*'])
  U.maadi = await user('maadi@chain.test', 'employee', B.maadi.id, E.maadi.id, [])
  U.nasr = await user('nasr@chain.test', 'employee', B.nasr.id, E.nasr.id, [])
  U.nasrHr = await user('nasr-hr@chain.test', 'hr_manager', B.nasr.id, null, ['approval_chains.manage'])
  // المعتمدين ليهم حسابات (الاعتماد بيتسجل على حساب المعتمد)
  for (const approver of [E.approverGeneral, E.approverMaadi, E.approverNasr]) {
    await user(`${approver.employeeCode.toLowerCase()}@chain.test`, 'employee', approver.branchId, approver.id, [])
  }
  const step = employeeId => [{ approverRole: 'specific_employee', specificEmployeeId: employeeId, slaDays: 2 }]
  C.general = ok(await request(U.admin, 'POST', '/settings/approval-chains', { code: 'BR_TEST', nameAr: 'سلسلة طلب الاختبار', steps: step(E.approverGeneral.id) }))
  ok(await request(U.admin, 'POST', '/settings/request-types', { nameAr: 'طلب اختبار نسخ الفروع', category: 'employee_relations',
    code: 'BR_REQ', destinationHandler: 'none', customFields: [], approvalChainId: C.general.id, visibleTo: { mode: 'all', ids: [] } }))
  C.step = step
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
  if (errors.length) throw new AggregateError(errors, 'chain branch copy fixture cleanup failed')
})

test('BC-01: من غير نسخ — الفرعين على السلسلة العامة', async () => {
  assert.equal(await firstApproverOf(U.maadi), E.approverGeneral.id)
  assert.equal(await firstApproverOf(U.nasr), E.approverGeneral.id)
})

test('BC-02: نسخة للمعادي بنفس الكود: طلب المعادي لمعتمدها، والنصر فاضل على العامة، ونسخة تانية لنفس الفرع مرفوضة', async () => {
  C.maadi = ok(await request(U.admin, 'POST', '/settings/approval-chains', { code: 'BR_TEST', nameAr: 'سلسلة طلب الاختبار — فرع المعادي',
    branchId: B.maadi.id, steps: C.step(E.approverMaadi.id) }))
  assert.equal(C.maadi.branchId, B.maadi.id)
  assert.equal(await firstApproverOf(U.maadi), E.approverMaadi.id, 'موظف المعادي على نسخة فرعه')
  assert.equal(await firstApproverOf(U.nasr), E.approverGeneral.id, 'النصر من غير نسخة على العامة')
  const duplicate = await request(U.admin, 'POST', '/settings/approval-chains', { code: 'BR_TEST', nameAr: 'نسخة مكررة',
    branchId: B.maadi.id, steps: C.step(E.approverMaadi.id) })
  assert.equal(duplicate.status, 400)
  assert.match(JSON.stringify(duplicate.body), /مستخدم بالفعل/)
})

test('BC-03: تعطيل نسخة المعادي يرجّع طلبات المعادي للعامة، وتفعيلها يرجّعها لنسختها', async () => {
  ok(await request(U.admin, 'PATCH', `/settings/approval-chains/${C.maadi.id}`, { isActive: false }), 200)
  assert.equal(await firstApproverOf(U.maadi), E.approverGeneral.id)
  ok(await request(U.admin, 'PATCH', `/settings/approval-chains/${C.maadi.id}`, { isActive: true }), 200)
  assert.equal(await firstApproverOf(U.maadi), E.approverMaadi.id)
})

test('BC-04: حساب فرع النصر يعمل نسخة لفرعه بس — مش للمعادي، ونسخة النصر بتاخد طلبات النصر', async () => {
  const foreign = await request(U.nasrHr, 'POST', '/settings/approval-chains', { code: 'BR_TEST', nameAr: 'نسخة من فرع تاني',
    branchId: B.maadi.id, steps: C.step(E.approverNasr.id) })
  assert.equal(foreign.status, 403)
  ok(await request(U.nasrHr, 'POST', '/settings/approval-chains', { code: 'BR_TEST', nameAr: 'سلسلة طلب الاختبار — فرع النصر',
    branchId: B.nasr.id, steps: C.step(E.approverNasr.id) }))
  assert.equal(await firstApproverOf(U.nasr), E.approverNasr.id)
  assert.equal(await firstApproverOf(U.maadi), E.approverMaadi.id, 'المعادي على نسخته زي ما هو')
})

test('BC-05: الشاشة: «نسخة خاصة بفرع» شغالة بنفس الكود مقفول، والفروع اللي مالهاش نسخة بس', () => {
  const page = fs.readFileSync(path.join(apiRoot, '..', 'src/app/settings/approvals/page.tsx'), 'utf8').replace(/\r\n/g, '\n')
  assert.ok(!page.includes('title="النسخ في مرحلة لاحقة"'), 'زرار النسخ المقفول راح')
  assert.ok(page.includes('onClick={() => handleOpenBranchCopy(chain)}'))
  assert.ok(page.includes('disabled={!!editingChain || !!copyOf}'), 'الكود مقفول على كود العامة')
  assert.ok(page.includes('{(copyOf ? branchesWithoutVersion(copyOf) : branches).map((b) => ('), 'الفروع اللي مالهاش نسخة بس')
  // «كل الفروع (دورة عامة)» لحساب على مستوى الشركة (أو دورة عامة مفتوحة أصلًا)؛ حساب الفروع يختار فرع من فروعه
  assert.ok(page.includes(`{!copyOf && (isCompanyWideUser(getCurrentUser()) || formData.branchId === 'all') && <option value="all">كل الفروع (دورة عامة)</option>}`))
  // جوّه تعديل السلسلة الأساسية نفسها: جدول «سلسلة مختلفة لكل فرع» — المكان اللي المالك دخله ومالقاش فيه الفروع
  assert.ok(page.includes('<p className="text-sm font-medium text-gray-800">سلسلة مختلفة لكل فرع</p>'))
  assert.ok(page.includes('onClick={() => leaveGeneralFor(() => handleOpenBranchCopy(editingChain, b.id))}>'), 'اعمل سلسلة خاصة للفرع')
  assert.ok(page.includes('onClick={() => leaveGeneralFor(() => handleOpenModal(version))}>'), 'تعديل سلسلة الفرع')
  assert.ok(page.includes('const scope = branchScopeOfUser(getCurrentUser())'))
  assert.ok(page.includes('const rows = branches.filter((b) => canSeeBranch(scope, b.id))'), 'حساب الفروع يشوف فروعه بس (فرع أو أكتر)')
  // تعديلات مش محفوظة على العامة ماتضيعش لما ينقل لسلسلة فرع
  assert.ok(page.includes('if (editingChain && JSON.stringify(formData) !== openedForm) {'))
})
