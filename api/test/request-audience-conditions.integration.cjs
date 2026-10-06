'use strict'
// B2.9-أ: شروط صفات الموظف في جمهور نوع الطلب، على قاعدة SQL مؤقتة معزولة بتتمسح في الآخر (hr_audience_test_<16 hex>).
//  AD-01) «خلص لما» بتاع الخطة: نوع طلب للسعوديين على عقد محدد المدة بيظهر ويتقدّم للي ينطبق عليه بس؛ والمالك وبانِي الأنواع والتقديم
//         نيابةً زي قواعدهم؛ والعضوية بصفات الموظف دلوقتي.
//  AD-02) الحفظ: الشروط بتتدقق (صفة معروفة، قيم معروفة، درجة موجودة، تاريخ صحيح)، والشكل المتخزّن من غير شروط زي ما هو بالحرف.
//  AD-03) الدرجة وتاريخ التعيين، وشاشة الخصم (نفس المقيّم) بتقرا صفات الموظف لما الجمهور فيه شروط.
// Run (من api/): node --test test/request-audience-conditions.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_audience_test_${crypto.randomBytes(8).toString('hex')}`
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, master, ds, base, created = false, employeeNumber = 0
const org = {}, users = {}, emps = {}, types = {}, grades = {}
const REFUSED = [403, 'هذا النوع من الطلبات غير متاح لك']

function assertDisposable() {
  assert.match(database, /^hr_audience_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
const payloadOf = user => ({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false,
  permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt.sign(payloadOf(user))}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  let parsed = null
  try { parsed = text ? JSON.parse(text) : null } catch { parsed = text }
  return { status: response.status, body: parsed }
}
function expectStatus(response, status) {
  assert.equal(response.status, status, JSON.stringify(response.body))
  return response.body
}
const answer = response => [response.status, [].concat(response.body?.message ?? []).join('، ')]
const employee = (extra = {}) => {
  const number = ++employeeNumber
  return repo('Employee').save({ employeeCode: `AD${String(number).padStart(3, '0')}`, fullName: `موظف الجمهور ${number}`, branchId: org.branch.id, joinDate: '2020-01-01',
    basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'transfer', ...extra })
}
const account = (label, role, permissions, extra = {}) => repo('User').save({ email: `${label}@audience.invalid`, displayName: `حساب ${label}`, passwordHash: 'test-only',
  role, branchId: org.branch.id, permissions: JSON.stringify(permissions), isActive: true, ...extra })
const setAudience = (type, visibleTo) => request(users.admin, 'PATCH', `/settings/request-types/${type.id}`, { visibleTo })
const storedAudience = async type => (await repo('RequestType').findOneByOrFail({ id: type.id })).visibleTo
const sees = async (user, type) => JSON.stringify(expectStatus(await request(user, 'GET', '/requests/types'), 200)).includes(`"code":"${type.code}"`)
const submit = (user, type, extra = {}) => request(user, 'POST', '/requests', { typeCode: type.code, payload: { reason: 'طلب للاختبار' }, submit: true, ...extra })

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  // مفيش رسالة بريد حقيقية بتطلع من الاختبار
  const { MailService } = require('../src/auth/mail.service')
  const mail = app.get(MailService)
  mail.isConfigured = () => false
  mail.send = async () => { throw new Error('no mail in tests') }
  assert.notEqual(mail.send, MailService.prototype.send)
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`

  org.branch = await repo('Branch').save({ code: 'AD_A', name: 'فرع الجمهور' })
  grades.senior = await repo('Grade').save({ name: 'درجة أولى للاختبار', isActive: true })
  grades.junior = await repo('Grade').save({ name: 'درجة تانية للاختبار', isActive: true })
  emps.manager = await employee({ nationality: 'سعودي', contractType: 'permanent' })
  const under = { managerEmployeeId: emps.manager.id }
  emps.saudiFixed = await employee({ ...under, nationality: 'سعودي', contractType: 'fixed_term', gradeId: grades.senior.id, joinDate: '2025-03-01' })
  emps.saudiPermanent = await employee({ ...under, nationality: 'سعودية', contractType: 'permanent', gradeId: grades.junior.id, joinDate: '2021-01-01' })
  emps.egyptFixed = await employee({ ...under, nationality: 'مصري', contractType: 'fixed_term', gradeId: grades.senior.id, joinDate: '2019-01-01' })
  emps.blank = await employee({ ...under, nationality: null, contractType: null, gradeId: null, joinDate: null })
  emps.builder = await employee({ ...under, nationality: 'مصري', contractType: 'permanent' })
  users.admin = await account('admin', 'super_admin', [], { branchId: null, scopeAllBranches: true })
  for (const key of ['manager', 'saudiFixed', 'saudiPermanent', 'egyptFixed', 'blank']) users[key] = await account(key.toLowerCase(), 'employee', [], { employeeId: emps[key].id })
  users.builder = await account('builder', 'employee', ['request_types.manage'], { employeeId: emps.builder.id })
  users.proxy = await account('proxy', 'employee', ['requests.create_on_behalf'])
  users.unlinked = await account('unlinked', 'employee', [])
  const chain = await repo('ApprovalChain').save({ code: 'AD_DIRECT', nameAr: 'سلسلة الجمهور', isActive: true, autoApprove: false })
  await repo('ApprovalStep').save({ chainId: chain.id, stepOrder: 1, approverRole: 'direct_manager_of_requester' })
  const type = (code, nameAr) => repo('RequestType').save({ code, nameAr, category: 'personal_data', destinationHandler: 'none', approvalChainId: chain.id, isActive: true })
  types.saudiFixed = await type('AD_SAUDI_FIXED', 'طلب للسعوديين على عقد محدد المدة')
  types.open = await type('AD_OPEN', 'طلب للكل')
  types.graded = await type('AD_GRADED', 'طلب بدرجة وتاريخ تعيين')
  types.deduction = await type('PAYROLL_DEDUCTION', 'خصم')
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assertDisposable()
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  if (errors.length) throw errors[0]
})

test('AD-01: نوع طلب للسعوديين على عقد محدد المدة — بيظهر ويتقدّم للي ينطبق عليه بس، والعضوية بصفات الموظف دلوقتي', async () => {
  const conditions = [{ field: 'nationality', values: ['SAUDI'] }, { field: 'contractType', values: ['fixed_term'] }]
  expectStatus(await setAudience(types.saudiFixed, { mode: 'all', ids: [], conditions }), 200)
  assert.equal(await storedAudience(types.saudiFixed), JSON.stringify({ mode: 'all', ids: [], conditions }))
  // الكتالوج: للي ينطبق عليه؛ والمالك وبانِي الأنواع بيشوفوه؛ والنوع المفتوح للكل زي ما هو
  const viewers = ['saudiFixed', 'saudiPermanent', 'egyptFixed', 'blank', 'unlinked', 'builder', 'admin']
  assert.deepEqual(await Promise.all(viewers.map(key => sees(users[key], types.saudiFixed))), [true, false, false, false, false, true, true])
  assert.deepEqual(await Promise.all(['saudiPermanent', 'egyptFixed', 'blank'].map(key => sees(users[key], types.open))), [true, true, true])
  // التقديم: نفس الحكم، وبانِي الأنواع مايقدّمش برّه الجمهور
  expectStatus(await submit(users.saudiFixed, types.saudiFixed), 201)
  for (const key of ['saudiPermanent', 'egyptFixed', 'blank', 'builder']) assert.deepEqual(answer(await submit(users[key], types.saudiFixed)), REFUSED, key)
  expectStatus(await submit(users.egyptFixed, types.open), 201)
  // التقديم نيابةً مابيحكموش جمهور النوع (قرار المالك ج1)
  expectStatus(await submit(users.proxy, types.saudiFixed, { onBehalfEmployeeId: emps.egyptFixed.id }), 201)
  // العضوية وقت الاستخدام: عقد الموظف اتغيّر لمحدد المدة فبقى من الجمهور، ورجع دائم فخرج
  try {
    await repo('Employee').update({ id: emps.saudiPermanent.id }, { contractType: 'fixed_term' })
    assert.equal(await sees(users.saudiPermanent, types.saudiFixed), true)
    expectStatus(await submit(users.saudiPermanent, types.saudiFixed), 201)
  } finally { await repo('Employee').update({ id: emps.saudiPermanent.id }, { contractType: 'permanent' }) }
  assert.deepEqual([await sees(users.saudiPermanent, types.saudiFixed), answer(await submit(users.saudiPermanent, types.saudiFixed))], [false, REFUSED])
})

test('AD-02: الحفظ — الشروط بتتدقق، والشكل المتخزّن من غير شروط زي ما هو بالحرف', async () => {
  const kept = await storedAudience(types.saudiFixed)
  for (const [conditions, message] of [
    ['x', 'شروط صفات الموظف غير صالحة'], [{ field: 'nationality' }, 'شروط صفات الموظف غير صالحة'],
    [[{ field: 'religion', values: ['x'] }], 'صفة غير معروفة في شروط الجمهور'],
    [[{ field: 'nationality', values: ['SAUDI'] }, { field: 'nationality', values: ['EGYPTIAN'] }], 'كل صفة ليها شرط واحد في شروط الجمهور'],
    [[{ field: 'nationality', values: [] }], 'اختار قيمة واحدة على الأقل لكل شرط في شروط الجمهور'], [[{ field: 'contractType' }], 'اختار قيمة واحدة على الأقل لكل شرط في شروط الجمهور'],
    [[{ field: 'nationality', values: ['UNKNOWN'] }], 'جنسية غير معروفة في شروط الجمهور'], [[{ field: 'contractType', values: ['fixed_term', 'forever'] }], 'نوع عقد غير معروف في شروط الجمهور'],
    [[{ field: 'grade', values: [0] }], 'درجة غير صحيحة في شروط الجمهور'], [[{ field: 'grade', values: [grades.senior.id, grades.junior.id + 900] }], 'درجة من الدرجات المختارة غير موجودة'],
    [[{ field: 'joinDate', op: 'after', value: '2024-01-01' }], 'شرط تاريخ التعيين: «قبل» أو «من» بتاريخ صحيح'], [[{ field: 'joinDate', op: 'from', value: '2025-02-30' }], 'شرط تاريخ التعيين: «قبل» أو «من» بتاريخ صحيح'],
    [[{ field: 'joinDate', op: 'before' }], 'شرط تاريخ التعيين: «قبل» أو «من» بتاريخ صحيح'],
  ]) {
    assert.deepEqual(answer(await setAudience(types.saudiFixed, { mode: 'all', ids: [], conditions })), [400, message], JSON.stringify(conditions))
  }
  assert.equal(await storedAudience(types.saudiFixed), kept, 'المرفوض ماغيّرش المتخزّن')
  // من غير شروط (غايبة أو فاضية): الشكل القديم بالحرف، مع «فين» ومن غيره
  expectStatus(await setAudience(types.open, { mode: 'all', ids: [] }), 200)
  assert.equal(await storedAudience(types.open), '{"mode":"all","ids":[]}')
  expectStatus(await setAudience(types.open, { mode: 'all', ids: [], conditions: [], where: { mode: 'branches', ids: [org.branch.id] } }), 200)
  assert.equal(await storedAudience(types.open), JSON.stringify({ mode: 'all', ids: [], where: { mode: 'branches', ids: [org.branch.id] } }))
  // والشروط الأربعة مع «فين»، بقيم متكررة بتتوحّد
  const all = [{ field: 'nationality', values: ['SAUDI', 'SAUDI', 'RESIDENT'] }, { field: 'contractType', values: ['fixed_term'] },
    { field: 'grade', values: [String(grades.senior.id)] }, { field: 'joinDate', op: 'from', value: '2024-01-01', values: ['ignored'] }]
  expectStatus(await setAudience(types.open, { mode: 'all', ids: [], conditions: all, where: { mode: 'branches', ids: [org.branch.id] } }), 200)
  assert.equal(await storedAudience(types.open), JSON.stringify({ mode: 'all', ids: [], where: { mode: 'branches', ids: [org.branch.id] },
    conditions: [{ field: 'nationality', values: ['SAUDI', 'RESIDENT'] }, { field: 'contractType', values: ['fixed_term'] }, { field: 'grade', values: [grades.senior.id] }, { field: 'joinDate', op: 'from', value: '2024-01-01' }] }))
  expectStatus(await setAudience(types.open, { mode: 'all', ids: [] }), 200)
})

test('AD-03: الدرجة وتاريخ التعيين، وشاشة الخصم بتقرا صفات الموظف لما جمهور النوع فيه شروط', async () => {
  expectStatus(await setAudience(types.graded, { mode: 'all', ids: [], conditions: [{ field: 'grade', values: [grades.senior.id] }, { field: 'joinDate', op: 'from', value: '2020-01-01' }] }), 200)
  // درجة أولى ومتعيّن من 2020: السعودي المحدد المدة بس (المصري درجته أولى بس متعيّن 2019، والسعودية درجتها تانية، والفاضي من غير درجة)
  assert.deepEqual(await Promise.all(['saudiFixed', 'egyptFixed', 'saudiPermanent', 'blank'].map(key => sees(users[key], types.graded))), [true, false, false, false])
  expectStatus(await setAudience(types.graded, { mode: 'all', ids: [], conditions: [{ field: 'joinDate', op: 'before', value: '2020-01-01' }] }), 200)
  assert.deepEqual(await Promise.all(['saudiFixed', 'egyptFixed', 'saudiPermanent', 'blank'].map(key => sees(users[key], types.graded))), [false, true, false, false])
  // شاشة الخصم (نفس المقيّم): من غير شروط متاحة للكل، وبشرط جنسية للي ينطبق عليه بس — وحساب من غير موظف برّه
  const money = app.get(require('../src/payroll/typed-deductions.service').TypedDeductionsService)
  const visible = async user => { try { await money.assertMoneyRequestVisible(ds.manager, payloadOf(user), 'PAYROLL_DEDUCTION', 'الخصم'); return true } catch (error) { return error.message } }
  assert.deepEqual(await Promise.all([users.saudiFixed, users.egyptFixed, users.unlinked].map(visible)), [true, true, true])
  expectStatus(await setAudience(types.deduction, { mode: 'all', ids: [], conditions: [{ field: 'nationality', values: ['SAUDI'] }] }), 200)
  assert.deepEqual(await Promise.all([users.saudiFixed, users.egyptFixed, users.blank, users.unlinked, users.admin].map(visible)),
    [true, 'طلب الخصم غير متاح لك', 'طلب الخصم غير متاح لك', 'طلب الخصم غير متاح لك', true])
})
