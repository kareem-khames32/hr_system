// فرع الأصل (تدقيق الأدوار D3 — ترحيل 20260922_065): الترحيل نفسه ثم عزل الفروع في سجل الأصول ودورة العهدة —
// على قاعدة SQL مؤقتة عشوائية (hr_assets_branch_test_<hex>) تُنشأ بـsynchronize وتُحذف في النهاية.
// لا مساس بقاعدة الشركة. التوكنات موقّعة محليًّا بسر عشوائي — لا كلمات مرور ولا أسرار.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
// اسم القاعدة يلتزم بحارس البيئة (isDisposableTestDatabase): hr_<اسم>_test_<16 حرف hex>
const database = `hr_assets_branch_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-assets-branch-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const migrator = require('../scripts/db-migrate.cjs')
const { employeeRequiredFields } = require('./helpers/employee-fixture.cjs')
const MIGRATION = path.resolve(apiRoot, '../docs/migrations/payroll/20260922_065_assets_branch.sql')
const INDEX = 'IDX_b9a2d908e40ada723882053f98'

let app, master, ds, base, created = false, sequence = 0
let branchA, branchB, admin, allOfficer, officerA, officerB, emptyScope
let mgrA, a1, a2, mgrB, b1

function assertDisposable() {
  assert.match(database, /^hr_assets_branch_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
const query = (text, params) => { assertDisposable(); return ds.query(text, params) }
function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null,
    employeeId: user.employeeId ?? null, tokenVersion: user.tokenVersion ?? 0,
    // «نطاقه: كل الفروع» بيتكتب في التوكن لما يكون مفتوح بس (auth.service) — وbranchScopeOf بيقراه
    ...(user.scopeAllBranches === true ? { scopeAllBranches: true } : {}),
    permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json',
    ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
function expectStatus(response, status, note) {
  assert.equal(response.status, status, `${note ?? ''} ${JSON.stringify(response.body)}`)
  return response.body
}
// نفس الرد بالحرف (الحالة والجسم) — إثبات «لا كاشف وجود»
const sameReply = (real, missing, note) => assert.deepEqual([real.status, real.body], [missing.status, missing.body], note)

const user = (email, role, branchId, permissions, extra = {}) => repo('User').save({ email: `${email}@assets-branch.invalid`, displayName: email,
  passwordHash: 'test-only', role, branchId, permissions: JSON.stringify(permissions), ...extra })
async function staff(code, branch, overrides = {}) {
  const emp = await repo('Employee').save({ ...(await employeeRequiredFields(ds, branch.id)), employeeCode: code, fullName: `موظف ${code}`,
    branchId: branch.id, teamId: null, joinDate: '2020-01-01', basicSalary: 5000, housingAllowance: 0, transportAllowance: 0,
    phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'cash', ...overrides })
  const account = await user(code.toLowerCase(), 'employee', branch.id, [], { employeeId: emp.id })
  return { emp, user: account, id: emp.id }
}
const newAsset = async (actor, body = {}) => expectStatus(await request(actor, 'POST', '/assets',
  { name: `أصل اختبار ${++sequence}`, category: 'أجهزة', serialNumber: `SN-AB-${sequence}`, value: 1000, ...body }), 201, 'create asset:')
const assetRow = id => repo('Asset').findOneByOrFail({ id })
// عهدة نشطة كاملة من الشاشات: تسليم → استلام → اعتماد المدير
async function activeCustody(officer, asset, holder, manager) {
  const row = expectStatus(await request(officer, 'POST', '/custody/assign', { assetId: asset.id, employeeId: holder.id }), 201, 'assign:')
  expectStatus(await request(holder.user, 'POST', `/custody/${row.id}/acknowledge`), 201, 'acknowledge:')
  expectStatus(await request(manager.user, 'POST', `/custody/${row.id}/manager-confirm`), 201, 'manager-confirm:')
  return row
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433),
    user: env.DB_USERNAME, password: env.DB_PASSWORD, database: 'master',
    options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`

  branchA = await repo('Branch').save({ code: 'AB_A', name: 'فرع الأصول الأول' })
  branchB = await repo('Branch').save({ code: 'AB_B', name: 'فرع الأصول الثاني' })
  admin = await user('admin', 'super_admin', null, [])
  // حساب مش مدير نظام ونطاقه «كل الفروع» (users.scopeAllBranches): القاعدة بتحكم على ناتج branchScopeOf مش على اسم الدور
  allOfficer = await user('all-officer', 'hr_manager', branchA.id, ['custody.assign', 'employees.view'], { scopeAllBranches: true })
  officerA = await user('officer-a', 'branch_manager', branchA.id, ['custody.assign', 'employees.view'])
  officerB = await user('officer-b', 'branch_manager', branchB.id, ['custody.assign', 'employees.view'])
  // حساب بلا فرع وبلا «كل الفروع» = نطاق فاضي
  emptyScope = await user('empty-scope', 'hr_manager', null, ['custody.assign'])
  mgrA = await staff('AB_MGR_A', branchA)
  a1 = await staff('AB_A1', branchA, { managerEmployeeId: mgrA.id })
  a2 = await staff('AB_A2', branchA, { managerEmployeeId: mgrA.id })
  mgrB = await staff('AB_MGR_B', branchB)
  b1 = await staff('AB_B1', branchB, { managerEmployeeId: mgrB.id })
}, { timeout: 300000 })

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
  try { fs.rmSync(uploads, { recursive: true, force: true }) } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'assets branch fixture cleanup failed')
})

// ============================================================================
// 1) الترحيل 065 على القاعدة المؤقتة
// ============================================================================

test('M1 — ترحيل 065: إضافي، بيعبّي فرع الأصل المُسنَد من حامله الحالي بس، آمن للتكرار، وفرق المخطط مع الكيان صفر', async () => {
  const file = migrator.discover().find(item => item.version === '20260922_065_assets_branch')
  assert.ok(file, 'المُرحّل بيكتشف الملف')
  assert.deepEqual(migrator.analyze(migrator.discover()).problems, [], 'الفحص النصي للمُرحّل نضيف على كل الملفات (وأكواد THROW فريدة)')
  assert.deepEqual(migrator.throwCodes(file.content), [56651, 56652, 56653])
  assert.deepEqual(migrator.forbiddenStatements(file.content), [])
  const batches = migrator.executionUnits(file)
  assert.equal(batches.length, 5)

  // حالة ما قبل الترحيل: synchronize أنشأ العمود والفهرس من الكيان، فنشيلهم (قاعدة مؤقتة فقط) ونرجّع شكل جدول الشركة الحالي
  await query(`DROP INDEX [${INDEX}] ON dbo.assets`)
  await query('ALTER TABLE dbo.assets DROP COLUMN [branchId]')
  assert.equal((await query("SELECT COL_LENGTH(N'dbo.assets', N'branchId') AS n"))[0].n, null)
  const insert = async (name, status, holderId) => Number((await query(
    'INSERT INTO dbo.assets ([name], [category], [status], [currentHolderId]) OUTPUT INSERTED.[id] AS id VALUES (@0, @1, @2, @3)', [name, 'أجهزة', status, holderId]))[0].id)
  const heldA = await insert('قديم في عهدة فرع أ', 'ASSIGNED', a1.id)
  const heldB = await insert('قديم في عهدة فرع ب', 'ASSIGNED', b1.id)
  const free = await insert('قديم متاح بلا حامل', 'AVAILABLE', null)
  const retired = await insert('قديم متقاعد', 'RETIRED', null)
  const orphan = await insert('قديم حامله مش في جدول الموظفين', 'ASSIGNED', 99999999)
  const before = await query('SELECT COUNT(*) AS n FROM dbo.assets')

  // نفس تنفيذ المُرحّل: معاملة واحدة، XACT_ABORT ON، ودفعات مفصولة بـGO
  const run = async () => {
    const qr = ds.createQueryRunner(); await qr.connect(); await qr.startTransaction()
    try {
      const batch = text => new ds.driver.mssql.Request(qr.databaseConnection).batch(text)
      await batch('SET XACT_ABORT ON;')
      for (const part of batches) await batch(part)
      await qr.commitTransaction()
    } catch (error) { if (qr.isTransactionActive) await qr.rollbackTransaction(); throw error } finally { await qr.release() }
  }
  await run()
  const branchOf = async id => (await query('SELECT [branchId] AS b FROM dbo.assets WHERE [id] = @0', [id]))[0].b
  assert.deepEqual([await branchOf(heldA), await branchOf(heldB)], [branchA.id, branchB.id], 'الأصل المُسنَد أخد فرع حامله الحالي')
  assert.deepEqual([await branchOf(free), await branchOf(retired), await branchOf(orphan)], [null, null, null], 'الباقي فضل بلا فرع — مفيش فرع بيتخمَّن')
  assert.deepEqual(await query('SELECT COUNT(*) AS n FROM dbo.assets'), before, 'ولا صف اتشال ولا اتضاف')
  const column = (await query(`SELECT TYPE_NAME(c.system_type_id) AS t, c.is_nullable AS nullable, (SELECT COUNT(*) FROM sys.default_constraints d
    WHERE d.parent_object_id = c.object_id AND d.parent_column_id = c.column_id) AS defaults FROM sys.columns c WHERE c.object_id = OBJECT_ID(N'dbo.assets') AND c.name = N'branchId'`))[0]
  assert.deepEqual([column.t, column.nullable, column.defaults], ['int', true, 0])
  assert.equal((await query('SELECT COUNT(*) AS n FROM sys.indexes WHERE object_id = OBJECT_ID(N\'dbo.assets\') AND name = @0', [INDEX]))[0].n, 1)

  // آمن للتكرار: تشغيل تاني مايغيّرش حاجة، ومايدوسش على فرع اتحدد من الشاشة
  await query('UPDATE dbo.assets SET [branchId] = @0 WHERE [id] = @1', [branchB.id, heldA])
  await query('UPDATE dbo.assets SET [branchId] = @0 WHERE [id] = @1', [branchA.id, free])
  await run()
  assert.deepEqual([await branchOf(heldA), await branchOf(free), await branchOf(heldB), await branchOf(retired)], [branchB.id, branchA.id, branchB.id, null])
  // فرق المخطط مع كيانات TypeORM = صفر بعد الترحيل (نفس فحص plan/verify في المُرحّل)
  const { upQueries } = await ds.driver.createSchemaBuilder().log()
  assert.deepEqual(upQueries.map(item => item.query), [], 'اسم الفهرس ونوع العمود مطابقين للكيان بالحرف')
  // الكيان بيقرا العمود فعلًا، وننضّف صفوف الترحيل عشان السيناريوهات الجاية تبدأ من سجل فاضي
  assert.equal((await assetRow(heldB)).branchId, branchB.id)
  await repo('Asset').clear()
})

// ============================================================================
// 2) سجل الأصول: الختم بالفرع، والعزل، والأصل القديم اللي بلا فرع
// ============================================================================

let assetA, assetB, legacy

test('A1 — الأصل الجديد بيتختم بفرع اللي أضافه، وحساب الفرع يشوف ويعدّل أصول فرعه بس، وأصل الفرع التاني = نفس رد الغايب', async () => {
  assetA = await newAsset(officerA)
  assetB = await newAsset(officerB)
  assert.deepEqual([assetA.branchId, assetB.branchId], [branchA.id, branchB.id])
  expectStatus(await request(officerA, 'POST', '/assets', { name: 'لفرع تاني', category: 'أجهزة', branchId: branchB.id }), 403)
  assert.equal((await newAsset(officerA, { branchId: branchA.id })).branchId, branchA.id, 'نفس فرعه مقبول')
  // حساب كل الفروع: يختار الفرع، أو يسيبه بلا فرع؛ وفرع مش موجود مرفوض
  legacy = await newAsset(allOfficer)
  assert.equal(legacy.branchId, null)
  assert.equal((await newAsset(allOfficer, { branchId: branchB.id })).branchId, branchB.id)
  assert.equal((await newAsset(admin, { branchId: branchA.id })).branchId, branchA.id)
  expectStatus(await request(allOfficer, 'POST', '/assets', { name: 'فرع وهمي', category: 'أجهزة', branchId: 99999999 }), 400)
  // نطاق فاضي: لا يشوف ولا يضيف
  assert.deepEqual(expectStatus(await request(emptyScope, 'GET', '/assets'), 200), [])
  expectStatus(await request(emptyScope, 'POST', '/assets', { name: 'بلا فرع', category: 'أجهزة' }), 403)
  assert.deepEqual(expectStatus(await request(emptyScope, 'GET', '/assets/available'), 200), [])

  // القوائم
  const listA = expectStatus(await request(officerA, 'GET', '/assets'), 200)
  assert.ok(listA.every(row => row.branchId === branchA.id || row.branchId === null), 'فرع أ: أصوله + القديم اللي بلا فرع')
  assert.ok(listA.some(row => row.id === assetA.id && row.readOnly === false && row.branchName === branchA.name))
  assert.ok(listA.some(row => row.id === legacy.id && row.readOnly === true && row.branchName === null), 'الأصل اللي بلا فرع ظاهر قراءة بس')
  assert.equal(listA.some(row => row.id === assetB.id), false)
  const listB = expectStatus(await request(officerB, 'GET', '/assets'), 200)
  assert.deepEqual([listB.some(row => row.id === assetB.id), listB.some(row => row.id === assetA.id)], [true, false])
  const listAll = expectStatus(await request(allOfficer, 'GET', '/assets'), 200)
  assert.ok([assetA.id, assetB.id, legacy.id].every(id => listAll.some(row => row.id === id && row.readOnly === false)))

  // إعادة عيب التدقيق بالحرف: أمين عهدة فرع ب بيعدّل أصل فرع أ — كان 200 وغيّر الاسم
  const missingPatch = await request(officerB, 'PATCH', '/assets/99999999', { name: 'اسم من فرع تاني' })
  expectStatus(missingPatch, 404)
  sameReply(await request(officerB, 'PATCH', `/assets/${assetA.id}`, { name: 'اسم من فرع تاني' }), missingPatch, 'PATCH أصل فرع تاني = أصل غايب')
  assert.equal((await assetRow(assetA.id)).name, assetA.name, 'الاسم ماتغيّرش')
  for (const action of ['retire', 'reactivate']) {
    sameReply(await request(officerB, 'POST', `/assets/${assetA.id}/${action}`), await request(officerB, 'POST', `/assets/99999999/${action}`), action)
  }
  assert.equal((await assetRow(assetA.id)).status, 'AVAILABLE')
  // جوه الفرع شغال
  assert.equal(expectStatus(await request(officerA, 'PATCH', `/assets/${assetA.id}`, { name: 'لابتوب فرع أ', value: 2500 }), 200).name, 'لابتوب فرع أ')
  // الأصل القديم اللي بلا فرع: حساب الفرع شايفه فبياخد السبب الصريح (مش كاشف وجود)، وحساب كل الفروع يعدّله
  for (const attempt of [['PATCH', `/assets/${legacy.id}`, { name: 'تعديل من فرع' }], ['POST', `/assets/${legacy.id}/retire`, undefined]]) {
    const refused = expectStatus(await request(officerA, attempt[0], attempt[1], attempt[2]), 403)
    assert.match(refused.message, /مالوش فرع/)
  }
  assert.equal(expectStatus(await request(allOfficer, 'PATCH', `/assets/${legacy.id}`, { name: 'أصل قديم بلا فرع' }), 200).branchId, null)
  // تغيير الفرع مش لحساب الفرع
  expectStatus(await request(officerA, 'PATCH', `/assets/${assetA.id}`, { branchId: branchB.id }), 403)
  assert.equal((await assetRow(assetA.id)).branchId, branchA.id)

  // «المتاح» للخدمة الذاتية: أصول فرع صاحب الحساب بس (كانت بلا أي تقسيم)
  const availableA = expectStatus(await request(a1.user, 'GET', '/assets/available'), 200)
  assert.deepEqual([availableA.some(row => row.id === assetA.id), availableA.some(row => row.id === assetB.id), availableA.some(row => row.id === legacy.id)], [true, false, false])
  const availableAll = expectStatus(await request(allOfficer, 'GET', '/assets/available'), 200)
  assert.ok([assetA.id, assetB.id, legacy.id].every(id => availableAll.some(row => row.id === id)))
})

test('A2 — تحديد فرع الأصل: فردي ودفعة، لحساب نطاقه كل الفروع بس، وأصل في عهدة مايتنقلش لفرع غير فرع صاحبها', async () => {
  const pool = [await newAsset(allOfficer), await newAsset(allOfficer), await newAsset(admin)]
  assert.deepEqual(pool.map(row => row.branchId), [null, null, null])
  // أصل فرع أ في عهدة موظف فرع أ
  const held = await newAsset(officerA)
  const custody = expectStatus(await request(officerA, 'POST', '/custody/assign', { assetId: held.id, employeeId: a1.id }), 201)

  for (const blocked of [officerA, officerB, emptyScope]) {
    expectStatus(await request(blocked, 'POST', '/assets/branch', { assetIds: [pool[0].id], branchId: branchA.id }), 403, blocked.email)
  }
  expectStatus(await request(a1.user, 'POST', '/assets/branch', { assetIds: [pool[0].id], branchId: branchA.id }), 403, 'بلا صلاحية عهد')
  expectStatus(await request(allOfficer, 'POST', '/assets/branch', { assetIds: [], branchId: branchB.id }), 400)
  expectStatus(await request(allOfficer, 'POST', '/assets/branch', { assetIds: [pool[0].id], branchId: 99999999 }), 400)

  const bulk = expectStatus(await request(allOfficer, 'POST', '/assets/branch',
    { assetIds: [pool[0].id, pool[1].id, pool[1].id, assetB.id, held.id, 99999999], branchId: branchB.id }), 201)
  assert.deepEqual([bulk.branchId, bulk.updated, bulk.unchanged], [branchB.id, [pool[0].id, pool[1].id], [assetB.id]])
  assert.deepEqual(bulk.skipped.map(row => row.id), [held.id, 99999999])
  assert.match(bulk.skipped[0].reason, /عهدة موظف من فرع تاني/)
  assert.deepEqual([(await assetRow(pool[0].id)).branchId, (await assetRow(pool[1].id)).branchId, (await assetRow(held.id)).branchId], [branchB.id, branchB.id, branchA.id])

  // فردي: PATCH branchId
  assert.equal(expectStatus(await request(allOfficer, 'PATCH', `/assets/${pool[2].id}`, { branchId: branchA.id }), 200).branchId, branchA.id)
  expectStatus(await request(allOfficer, 'PATCH', `/assets/${pool[2].id}`, { branchId: 99999999 }), 400)
  expectStatus(await request(allOfficer, 'PATCH', `/assets/${held.id}`, { branchId: branchB.id }), 400, 'في عهدة مفتوحة لموظف فرع أ')
  // بعد التنظيف: فرع ب بقى يعدّل الأصل اللي كان بلا فرع، وفرع أ مابقاش شايفه
  assert.equal(expectStatus(await request(officerB, 'PATCH', `/assets/${pool[0].id}`, { value: 900 }), 200).branchId, branchB.id)
  expectStatus(await request(officerA, 'PATCH', `/assets/${pool[0].id}`, { value: 1 }), 404)
  // نقفل العهدة المفتوحة، وبعدها الأصل يتنقل عادي
  expectStatus(await request(officerA, 'POST', `/custody/${custody.id}/return`, { condition: 'لم تُستلم' }), 201)
  assert.equal(expectStatus(await request(admin, 'PATCH', `/assets/${held.id}`, { branchId: branchB.id }), 200).branchId, branchB.id)
})

// ============================================================================
// 3) دورة العهدة: جوه الفرع شغالة، وبين فرعين مرفوضة
// ============================================================================

test('C1 — دورة العهدة كاملة جوه الفرع: تسليم → استلام → اعتماد المدير → نقل → تسليم → إرجاع، والأصل فاضل في فرعه', async () => {
  const asset = await newAsset(officerA)
  const row = await activeCustody(officerA, asset, a1, mgrA)
  let saved = await assetRow(asset.id)
  assert.deepEqual([saved.status, saved.currentHolderId, saved.branchId], ['ASSIGNED', a1.id, branchA.id])
  assert.ok(expectStatus(await request(officerA, 'GET', '/custody'), 200).some(item => item.id === row.id))
  assert.equal(expectStatus(await request(officerB, 'GET', '/custody'), 200).some(item => item.id === row.id), false, 'فرع ب مايشوفش عهد فرع أ')
  assert.ok(expectStatus(await request(a1.user, 'GET', '/custody/mine'), 200).some(item => item.id === row.id))
  // نقل جوه الفرع من أمين عهدة الفرع
  const moved = expectStatus(await request(officerA, 'POST', `/custody/${row.id}/transfer`, { toEmployeeId: a2.id, note: 'نقل داخلي' }), 201)
  expectStatus(await request(a2.user, 'POST', `/custody/${moved.id}/acknowledge`), 201)
  assert.ok(expectStatus(await request(mgrA.user, 'GET', '/custody/pending-my-confirm'), 200).some(item => item.id === moved.id))
  expectStatus(await request(mgrA.user, 'POST', `/custody/${moved.id}/manager-confirm`), 201)
  saved = await assetRow(asset.id)
  assert.deepEqual([saved.currentHolderId, saved.branchId, (await repo('CustodyAssignment').findOneByOrFail({ id: row.id })).status], [a2.id, branchA.id, 'TRANSFERRED'])
  expectStatus(await request(a2.user, 'POST', `/custody/${moved.id}/handover`), 201)
  expectStatus(await request(officerA, 'POST', `/custody/${moved.id}/return`, { condition: 'سليمة' }), 201)
  saved = await assetRow(asset.id)
  assert.deepEqual([saved.status, saved.currentHolderId ?? null, saved.branchId], ['AVAILABLE', null, branchA.id])
  // شطب جوه الفرع
  const lost = await activeCustody(officerA, asset, a1, mgrA)
  assert.equal(expectStatus(await request(officerA, 'POST', `/custody/${lost.id}/write-off`, { lost: true }), 201).status, 'LOST')
  assert.deepEqual([(await assetRow(asset.id)).status, (await assetRow(asset.id)).branchId], ['RETIRED', branchA.id])
})

test('C2 — العهدة بين فرعين مرفوضة، وعهدة الفرع التاني = نفس رد الإسناد الغايب في كل إجراء', async () => {
  const ofA = await newAsset(officerA), ofB = await newAsset(officerB), unbranched = await newAsset(allOfficer)
  // التسليم
  expectStatus(await request(officerA, 'POST', '/custody/assign', { assetId: ofA.id, employeeId: b1.id }), 404, 'موظف فرع تاني')
  sameReply(await request(officerA, 'POST', '/custody/assign', { assetId: ofB.id, employeeId: a1.id }),
    await request(officerA, 'POST', '/custody/assign', { assetId: 99999999, employeeId: a1.id }), 'أصل فرع تاني = أصل غايب')
  assert.match(expectStatus(await request(officerA, 'POST', '/custody/assign', { assetId: unbranched.id, employeeId: a1.id }), 403).message, /مالوش فرع/)
  assert.match(expectStatus(await request(allOfficer, 'POST', '/custody/assign', { assetId: ofA.id, employeeId: b1.id }), 400).message, /جوه الفرع الواحد/)
  assert.equal(await repo('CustodyAssignment').countBy({ assetId: ofA.id }), 0)
  // أصل بلا فرع يسلّمه حساب كل الفروع، وبيتختم بفرع الموظف من لحظة التسليم
  const stamped = expectStatus(await request(allOfficer, 'POST', '/custody/assign', { assetId: unbranched.id, employeeId: b1.id }), 201)
  assert.equal((await assetRow(unbranched.id)).branchId, branchB.id)
  expectStatus(await request(b1.user, 'POST', `/custody/${stamped.id}/reject`, { reason: 'لم أطلب هذه العهدة' }), 201)

  // عهدة نشطة في فرع أ، ومحاولات فرع ب عليها
  const row = await activeCustody(officerA, ofA, a1, mgrA)
  const pending = expectStatus(await request(officerA, 'POST', '/custody/assign', { assetId: (await newAsset(officerA)).id, employeeId: a2.id }), 201)
  for (const [method, action, body] of [['POST', 'return', { condition: 'سليمة' }], ['POST', 'write-off', { lost: true }],
    ['POST', 'transfer', { toEmployeeId: b1.id }], ['POST', 'manager-confirm', undefined], ['POST', 'reject', { reason: 'إلغاء من فرع تاني' }]]) {
    for (const target of [row, pending]) {
      sameReply(await request(officerB, method, `/custody/${target.id}/${action}`, body), await request(officerB, method, `/custody/99999999/${action}`, body),
        `أمين عهدة فرع ب: ${action} على عهدة #${target.id} في فرع أ = إسناد غايب`)
    }
  }
  // موظف فرع تاني (بلا صلاحية) كمان مايعرفش وجودها؛ وزميل نفس الفرع بياخد السبب الصريح زي الأول
  for (const action of ['acknowledge', 'handover']) {
    sameReply(await request(b1.user, 'POST', `/custody/${pending.id}/${action}`), await request(b1.user, 'POST', `/custody/99999999/${action}`), action)
    assert.match(expectStatus(await request(a1.user, 'POST', `/custody/${pending.id}/${action}`), 403).message, /ليست باسمك/)
  }
  assert.deepEqual([(await repo('CustodyAssignment').findOneByOrFail({ id: row.id })).status, (await repo('CustodyAssignment').findOneByOrFail({ id: pending.id })).status],
    ['ACTIVE', 'PENDING_ACK'])
  // أمين عهدة فرع أ مايقدرش ينقل لموظف فرع ب: نفس رد الموظف الغايب (مايفشّيش موظفي الفروع التانية)
  sameReply(await request(officerA, 'POST', `/custody/${row.id}/transfer`, { toEmployeeId: b1.id }),
    await request(officerA, 'POST', `/custody/${row.id}/transfer`, { toEmployeeId: 99999999 }), 'مستلم من فرع تاني = مستلم غايب')
  assert.equal(await repo('CustodyAssignment').countBy({ assetId: ofA.id, status: 'PENDING_ACK' }), 0)

  // إسناد متعارض (بيانات مباشرة): أصل فرع أ بانتظار استلام موظف فرع ب بلا نقل ⇒ لا استلام ولا تنشيط
  const stray = await repo('CustodyAssignment').save({ assetId: (await newAsset(officerA)).id, employeeId: b1.id, status: 'PENDING_ACK' })
  assert.match(expectStatus(await request(b1.user, 'POST', `/custody/${stray.id}/acknowledge`), 400).message, /جوه الفرع الواحد/)
  await repo('CustodyAssignment').update(stray.id, { status: 'PENDING_MANAGER_CONFIRM' })
  assert.match(expectStatus(await request(mgrB.user, 'POST', `/custody/${stray.id}/manager-confirm`), 400).message, /جوه الفرع الواحد/)
})

test('C3 — نقل عهدة بين فرعين: من حساب نطاقه كل الفروع بس (مش بالدور)، والأصل بيتنقل لفرع المستلم لحظة اعتماد مديره', async () => {
  const asset = await newAsset(officerA)
  const source = await activeCustody(officerA, asset, a1, mgrA)
  // حساب كل الفروع هنا مش مدير نظام — القاعدة على ناتج branchScopeOf
  assert.equal(allOfficer.role, 'hr_manager')
  const moved = expectStatus(await request(allOfficer, 'POST', `/custody/${source.id}/transfer`, { toEmployeeId: b1.id, note: 'نقل للفرع التاني' }), 201)
  assert.deepEqual([moved.employeeId, moved.status], [b1.id, 'PENDING_ACK'])
  let saved = await assetRow(asset.id)
  assert.deepEqual([saved.currentHolderId, saved.branchId], [a1.id, branchA.id], 'الحامل الحالي مسؤول والأصل في فرعه لحد الاعتماد')
  // كل فرع شايف طرفه
  assert.ok(expectStatus(await request(officerB, 'GET', '/custody'), 200).some(item => item.id === moved.id))
  assert.ok(expectStatus(await request(officerA, 'GET', '/custody'), 200).some(item => item.id === source.id))
  // والنقل معلق: فرع الأصل مايتغيّرش بالإيد، وأمين عهدة فرع ب مايقفلش طرفه على أصل لسه تابع لفرع أ
  expectStatus(await request(allOfficer, 'PATCH', `/assets/${asset.id}`, { branchId: branchB.id }), 400)
  expectStatus(await request(officerB, 'POST', `/custody/${moved.id}/write-off`, { lost: true }), 403)
  // المستلم يستلم ومديره (حساب فرع ب) يعتمد
  expectStatus(await request(b1.user, 'POST', `/custody/${moved.id}/acknowledge`), 201)
  expectStatus(await request(mgrB.user, 'POST', `/custody/${moved.id}/manager-confirm`), 201)
  saved = await assetRow(asset.id)
  assert.deepEqual([saved.status, saved.currentHolderId, saved.branchId], ['ASSIGNED', b1.id, branchB.id], 'الأصل اتنقل لفرع المستلم')
  assert.equal((await repo('CustodyAssignment').findOneByOrFail({ id: source.id })).status, 'TRANSFERRED')
  // الأصل بقى أصل فرع ب: فرع أ مايعرفوش، وفرع ب يعدّله
  sameReply(await request(officerA, 'PATCH', `/assets/${asset.id}`, { name: 'x-من فرع أ' }), await request(officerA, 'PATCH', '/assets/99999999', { name: 'x-من فرع أ' }))
  assert.equal(expectStatus(await request(officerB, 'PATCH', `/assets/${asset.id}`, { name: 'أصل منقول لفرع ب' }), 200).branchId, branchB.id)
  // ومدير النظام نفسه ينقل بين فرعين كمان (نطاقه null)
  const back = expectStatus(await request(admin, 'POST', `/custody/${moved.id}/transfer`, { toEmployeeId: a2.id }), 201)
  expectStatus(await request(a2.user, 'POST', `/custody/${back.id}/reject`, { reason: 'مش محتاجها' }), 201)
  assert.deepEqual([(await assetRow(asset.id)).currentHolderId, (await assetRow(asset.id)).branchId], [b1.id, branchB.id])
})

test('C4 — الأصل القديم اللي بلا فرع: عهدته القائمة بتكمّل في فرع موظفها، وبيتختم بفرع حامله عند التنشيط وعند الإرجاع', async () => {
  // إسناد قديم معلّق على أصل بلا فرع (بيانات ما قبل الترحيل)
  const inflight = await repo('Asset').save({ name: 'قديم بإسناد معلّق', category: 'أجهزة', status: 'AVAILABLE' })
  const pendingRow = await repo('CustodyAssignment').save({ assetId: inflight.id, employeeId: a1.id, status: 'PENDING_ACK' })
  expectStatus(await request(a1.user, 'POST', `/custody/${pendingRow.id}/acknowledge`), 201)
  expectStatus(await request(mgrA.user, 'POST', `/custody/${pendingRow.id}/manager-confirm`), 201)
  assert.deepEqual([(await assetRow(inflight.id)).branchId, (await assetRow(inflight.id)).currentHolderId], [branchA.id, a1.id])
  // أصل مستورد بعد الترحيل: في عهدة نشطة وبلا فرع — أمين عهدة الفرع يرجّعه، والأصل بيرجع لمخزن فرع حامله
  const imported = await repo('Asset').save({ name: 'مستورد في عهدة نشطة', category: 'أجهزة', status: 'ASSIGNED', currentHolderId: a2.id })
  const activeRow = await repo('CustodyAssignment').save({ assetId: imported.id, employeeId: a2.id, status: 'ACTIVE' })
  assert.ok(expectStatus(await request(officerA, 'GET', '/assets'), 200).some(row => row.id === imported.id && row.readOnly === true))
  assert.equal(expectStatus(await request(officerB, 'GET', '/assets'), 200).some(row => row.id === imported.id), false, 'بلا فرع وحامله من فرع تاني ⇒ مايظهرش')
  expectStatus(await request(officerA, 'POST', `/custody/${activeRow.id}/return`, { condition: 'سليمة' }), 201)
  assert.deepEqual([(await assetRow(imported.id)).status, (await assetRow(imported.id)).branchId], ['AVAILABLE', branchA.id])
})

test('C5 — طلب العهدة (خدمة ذاتية): أصل فرع تاني أو أصل بلا فرع = نفس رد الأصل الغايب برقمه، وأصل الفرع يتقدّم عادي', async () => {
  await require('../src/seed/seed-requests').seedRequests(ds)
  const chain = await repo('ApprovalChain').findOneByOrFail({ code: 'CH_CUSTODY_REQUEST' })
  expectStatus(await request(admin, 'PATCH', `/settings/approval-chains/${chain.id}/steps`, { steps: [{ approverRole: 'direct_manager_of_requester', slaDays: 3 }] }), 200)
  const mine = await newAsset(officerA), foreign = await newAsset(officerB, { name: 'اسم سري لأصل فرع ب' }), unbranched = await newAsset(allOfficer, { name: 'اسم سري لأصل بلا فرع' })
  const submit = async ids => {
    const draft = expectStatus(await request(a1.user, 'POST', '/requests', { typeCode: 'CUSTODY_REQUEST', payload: { assetIds: ids } }), 201, 'draft:')
    return request(a1.user, 'POST', `/requests/${draft.id}/submit`)
  }
  const missing = await submit([99999999])
  expectStatus(missing, 400)
  assert.match(missing.body.message, /#99999999/)
  for (const asset of [foreign, unbranched]) {
    const refused = await submit([asset.id])
    assert.deepEqual([refused.status, refused.body.message], [400, missing.body.message.replace('#99999999', `#${asset.id}`)], 'نفس رد الغايب — بالرقم مش بالاسم')
    assert.ok(!refused.body.message.includes('سري'))
  }
  expectStatus(await submit([mine.id]), 201, 'أصل الفرع:')
})
