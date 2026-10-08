'use strict'
// B4.5 (ج) على SQL حقيقي: شرائح الإجازة السنوية بمدة الخدمة والسن (إعداد في نوع الإجازة)، وأقصى مرات طول الخدمة، وأنواع إجازات حزمة الدولة
// لفروعها (غير مفعّلة)، وترحيل 136 والشغل قبله. الافتراضي (من غير شرائح) = رصيد كل موظف زي الأول. قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_leave_tiers_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_leave_tiers_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-leave-tiers-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const MIGRATION = path.resolve(apiRoot, '..', 'docs', 'migrations', 'payroll', '20261009_136_leave_type_tiers.sql')
let master, pool, app, ds, base, admin, scoped, annual, created = false, sequence = 0
const B = {}, E = {}
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false, permissions: JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token(user) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const raw = await response.text(); return { status: response.status, body: raw ? JSON.parse(raw) : null }
}
const ok = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const refused = (response, status, message) => { assert.equal(response.status, status, JSON.stringify(response.body)); assert.match(String(response.body?.message), message) }
const local = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
// تاريخ قبل النهارده بسنين كاملة وعشر أيام (الخدمة أو السن = years بالظبط)
const yearsAgo = years => { const date = new Date(); date.setFullYear(date.getFullYear() - years); date.setDate(date.getDate() - 10); return local(date) }
const employee = (branch, serviceYears, age, extra = {}) => repo('Employee').save({ employeeCode: 'LT' + ++sequence, fullName: 'موظف شرائح ' + sequence, branchId: branch.id,
  joinDate: yearsAgo(serviceYears), birthDate: yearsAgo(age), status: 'active', isActive: true, basicSalary: 8000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, payMethod: 'cash', ...extra })
const annualOf = async emp => {
  const rows = ok(await request(admin, 'GET', `/leaves/balances/${emp.id}`), 200), row = rows.find(item => item.balanceType === 'annual')
  assert.ok(row, JSON.stringify(rows))
  return Number(row.annualEntitlement)
}
const allAnnual = async () => { const out = {}; for (const [name, emp] of Object.entries(E)) out[name] = await annualOf(emp); return out }
const types = async user => ok(await request(user ?? admin, 'GET', '/settings/leave-types'), 200)
const typeOf = async code => (await types()).find(row => row.code === code)
const patchType = (id, body, user = admin) => request(user, 'PATCH', `/settings/leave-types/${id}`, body)
const SUGGESTED = [{ country: 'EG', minServiceYears: null, minAge: null, days: 15 }, { country: 'EG', minServiceYears: 1, minAge: null, days: 21 }, { country: 'EG', minServiceYears: 10, minAge: null, days: 30 },
  { country: 'EG', minServiceYears: null, minAge: 50, days: 30 }, { country: 'SA', minServiceYears: null, minAge: null, days: 21 }, { country: 'SA', minServiceYears: 5, minAge: null, days: 30 }]
const BASE = { egNew: 25, egMid: 25, egSenior: 25, egOld: 25, saMid: 25, saSenior: 25, none: 25, notEntitled: 0 }
const runMigration = async () => { assert.match(database, NAME); for (const batch of migrate.splitBatches(fs.readFileSync(MIGRATION, 'utf8').replace(/\r\n/g, '\n'))) await pool.request().batch(batch) }
const extraColumns = async () => (await pool.request().query(`SELECT c.[name], t.[name] AS [type], c.[max_length], c.[is_nullable] FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id]
  WHERE c.[object_id] = OBJECT_ID(N'dbo.leave_types') AND c.[name] IN (N'entitlementTiers', N'maxTimesInService') ORDER BY c.[name]`)).recordset.map(row => Object.values(row).join(':'))

before(async () => {
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  const connection = { server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD, options: { encrypt: false, trustServerCertificate: true } }
  master = await new sql.ConnectionPool({ ...connection, database: 'master' }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  // مفيش رسالة بريد حقيقية بتطلع من الاختبار
  const { MailService } = require('../src/auth/mail.service')
  const mail = app.get(MailService)
  mail.isConfigured = () => false
  mail.send = async () => { throw new Error('no mail in tests') }
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1'); ds = app.get(require('../node_modules/typeorm').DataSource)
  assert.equal(ds.options.database, database)
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  pool = await new sql.ConnectionPool({ ...connection, database }).connect()
  B.eg = await repo('Branch').save({ code: 'LT_EG', name: 'فرع القاهرة', country: 'EG' })
  B.sa = await repo('Branch').save({ code: 'LT_SA', name: 'فرع الرياض', country: 'SA' })
  B.none = await repo('Branch').save({ code: 'LT_NO', name: 'فرع من غير دولة' })
  admin = await repo('User').save({ email: 'admin@leave-tiers.invalid', displayName: 'Fixture admin', passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  scoped = await repo('User').save({ email: 'scoped@leave-tiers.invalid', displayName: 'Fixture branch settings', passwordHash: 'test-only', role: 'hr_manager', branchId: B.eg.id,
    permissions: JSON.stringify(['settings.manage']) })
  E.egNew = await employee(B.eg, 0, 30)
  E.egMid = await employee(B.eg, 3, 30)
  E.egSenior = await employee(B.eg, 11, 35)
  E.egOld = await employee(B.eg, 2, 55)
  E.saMid = await employee(B.sa, 3, 55)
  E.saSenior = await employee(B.sa, 6, 30)
  E.none = await employee(B.none, 12, 60)
  E.notEntitled = await employee(B.sa, 12, 60, { annualLeaveEntitled: false })
  await require('../src/seed/seed-requests').seedRequests(ds)
  for (const emp of Object.values(E)) await require('../src/seed/seed-requests').ensureLeaveBalance(ds, emp.id)
  annual =await repo('LeaveType').findOneByOrFail({ code: 'ANNUAL' })
  // طلب الإجازة بيمشي في سلسلة بخطوة واحدة (البذرة بتعمل السلاسل فاضية)
  const chain = await repo('ApprovalChain').findOneByOrFail({ code: 'CH_LEAVE' })
  ok(await request(admin, 'PATCH', `/settings/approval-chains/${chain.id}/steps`, { steps: [{ approverRole: 'hr', slaDays: 3 }] }), 200)
}, { timeout: 180000 })

after(async t => {
  if (pool) await pool.close()
  if (app) await app.close()
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

test('LT-01: قبل ترحيل 136 الكود شغال من غير العمودين، والحفظ بقيمة ليهم بيترفض؛ والترحيل بيضيفهم بشكل الكيان وبيتكرر بأمان', async () => {
  const text = fs.readFileSync(MIGRATION)
  assert.equal(text.includes(Buffer.from('\r\n')), false, 'LF بس — git بيخزّن الملف LF')
  assert.notDeepEqual([...text.subarray(0, 3)], [0xef, 0xbb, 0xbf])
  assert.deepEqual([...new Set(String(text).match(/THROW \d+/g))], ['THROW 136001', 'THROW 136002', 'THROW 136003', 'THROW 136004'])
  assert.doesNotMatch(String(text), /\bDROP\b|\bTRUNCATE\b|\bDELETE\b/i)
  // شكل الكيان = شكل الترحيل: الملف بيعدّي على قاعدة synchronize من غير تغيير
  const shape = ['entitlementTiers:nvarchar:-1:true', 'maxTimesInService:int:4:true']
  assert.deepEqual(await extraColumns(), shape)
  await runMigration()
  assert.deepEqual(await extraColumns(), shape)
  // قبل الترحيل (قاعدة الاختبار بس): العمودين مش موجودين
  await pool.request().batch('ALTER TABLE dbo.leave_types DROP COLUMN [entitlementTiers], [maxTimesInService]')
  assert.deepEqual(await extraColumns(), [])
  ok(await patchType(annual.id, { category: 'ANNUAL', annualDays: 25, entitlementStartMonths: 0, firstYearProrated: false }), 200)
  assert.deepEqual(await allAnnual(), BASE)
  assert.deepEqual([(await typeOf('ANNUAL')).entitlementTiers, (await typeOf('HAJJ')).maxTimesInService], [null, null])
  assert.equal(ok(await request(admin, 'GET', '/settings/leave-types/statutory-pack'), 200).ready, false)
  refused(await patchType(annual.id, { entitlementTiers: SUGGESTED }), 400, /ترحيل 136/)
  ok(await patchType(annual.id, { entitlementTiers: [] }), 200)
  const marriage = await typeOf('MARRIAGE')
  refused(await patchType(marriage.id, { category: 'OCCASION', maxTimesInService: 2 }), 400, /ترحيل 136/)
  ok(await patchType(marriage.id, { category: 'OCCASION', maxTimesInService: null }), 200)
  // عمود بشكل تاني بيوقّف الترحيل قبل أي تغيير
  await pool.request().batch('ALTER TABLE dbo.leave_types ADD [maxTimesInService] bigint NULL')
  await assert.rejects(runMigration(), error => (error.number ?? error.originalError?.info?.number) === 136003)
  assert.deepEqual(await extraColumns(), ['maxTimesInService:bigint:8:true'])
  await pool.request().batch('ALTER TABLE dbo.leave_types DROP COLUMN [maxTimesInService]')
  await runMigration(); await runMigration()
  assert.deepEqual(await extraColumns(), shape)
  assert.equal(ok(await request(admin, 'GET', '/settings/leave-types/statutory-pack'), 200).ready, true)
  assert.deepEqual(await allAnnual(), BASE)
})

test('LT-02: من غير شرائح الرصيد زي الأول؛ بشرائح الحزمة كل موظف بياخد شريحة دولة فرعه وخدمته وسنّه — مصر والسعودية — وتفضيتها بترجّع أيام النوع', async () => {
  const pack = ok(await request(admin, 'GET', '/settings/leave-types/statutory-pack'), 200)
  assert.deepEqual(pack, { annual: { tiers: SUGGESTED, unverified: true }, ready: true })
  // الاقتراح قراءة بس: مفيش حاجة اتحفظت ولا رصيد اتغيّر
  assert.deepEqual([(await typeOf('ANNUAL')).entitlementTiers, await allAnnual()], [null, BASE])
  const saved = ok(await patchType(annual.id, { entitlementTiers: pack.annual.tiers }), 200)
  assert.deepEqual(JSON.parse(saved.entitlementTiers), SUGGESTED)
  assert.deepEqual(JSON.parse((await typeOf('ANNUAL')).entitlementTiers), SUGGESTED)
  // مصر: أول سنة 15، بعدها 21، 10 سنين أو سن 50 = 30. السعودية: 21 و30 بعد 5 سنين (والسن مالوش أثر). من غير دولة: أيام النوع. غير المستحق: صفر
  assert.deepEqual(await allAnnual(), { egNew: 15, egMid: 21, egSenior: 30, egOld: 30, saMid: 21, saSenior: 30, none: 25, notEntitled: 0 })
  // القايمة الجماعية بنفس الأرقام
  const list = ok(await request(admin, 'GET', '/leaves/balances'), 200)
  const listed = id => Number(list.find(row => row.employee.id === id).balances.find(row => row.balanceType === 'annual').annualEntitlement)
  assert.deepEqual([listed(E.egNew.id), listed(E.egSenior.id), listed(E.saSenior.id), listed(E.none.id)], [15, 30, 30, 25])
  // الموظف المنقول بياخد شريحة فرعه الحالي
  await repo('Employee').update({ id: E.saMid.id }, { branchId: B.eg.id })
  assert.equal(await annualOf(E.saMid), 30)
  await repo('Employee').update({ id: E.saMid.id }, { branchId: B.sa.id })
  assert.equal(await annualOf(E.saMid), 21)
  // تعديل تاني للنوع من غير ما الشرائح تتبعت مابيمسحهاش، وتحقق الخادم
  ok(await patchType(annual.id, { noticeDays: 0 }), 200)
  assert.equal(JSON.parse((await typeOf('ANNUAL')).entitlementTiers).length, 6)
  refused(await patchType(annual.id, { entitlementTiers: [{ days: 21 }] }), 400, /لازم دولة أو سنين خدمة أو سن/)
  refused(await patchType(annual.id, { entitlementTiers: [{ country: 'SA', minServiceYears: 5, days: 30 }, { country: 'SA', minServiceYears: 5, days: 35 }] }), 400, /مكررة/)
  refused(await patchType((await typeOf('MARRIAGE')).id, { entitlementTiers: [{ country: 'SA', days: 30 }] }), 400, /برصيد سنوي بس/)
  // حساب الفرع مايعدّلش نوع الشركة
  assert.notEqual((await patchType(annual.id, { entitlementTiers: [] }, scoped)).status, 200)
  assert.equal(JSON.parse((await typeOf('ANNUAL')).entitlementTiers).length, 6)
  // التفضية = أيام النوع لكل الموظفين
  assert.equal(ok(await patchType(annual.id, { entitlementTiers: [] }), 200).entitlementTiers, null)
  assert.deepEqual(await allAnnual(), BASE)
})

test('LT-03: أقصى مرات طول الخدمة — الإجازات المعتمدة والطلبات اللي في المسار بتتعدّ، والتالتة بتترفض؛ ومن غير حد مفيش رفض', async () => {
  const code = 'LT_TIMES'
  const type = ok(await request(admin, 'POST', '/settings/leave-types', { code, nameAr: 'وضع تجربة', category: 'OCCASION', maxDays: 120, countingMode: 'ALL_DAYS', maxTimesInService: 2 }), 201)
  assert.equal(type.maxTimesInService, 2)
  refused(await patchType(type.id, { oncePerService: true, maxTimesInService: 2 }), 400, /مش الاتنين/)
  refused(await patchType(annual.id, { maxTimesInService: 2 }), 400, /لإجازة المناسبة بس/)
  const account = await repo('User').save({ email: 'staff@leave-tiers.invalid', displayName: 'Fixture staff', passwordHash: 'test-only', role: 'employee', branchId: B.eg.id, employeeId: E.egMid.id, permissions: '[]' })
  const submit = async (fromDate, toDate) => {
    const draft = ok(await request(account, 'POST', '/requests', { typeCode: 'LEAVE', payload: { leaveTypeCode: code, fromDate, toDate, days: 1 } }), 201)
    return request(account, 'POST', `/requests/${draft.id}/submit`)
  }
  // إجازة معتمدة سابقة (مرة 1) + طلب في المسار (مرة 2) ← التالتة مرفوضة
  await repo('Leave').save({ employeeId: E.egMid.id, leaveTypeCode: code, fromDate: '2098-01-05', toDate: '2098-01-09', days: 5, status: 'APPROVED', period: 'FULL' })
  const second = await submit('2099-03-02', '2099-03-04')
  assert.equal(second.status, 201, JSON.stringify(second.body))
  refused(await submit('2099-06-01', '2099-06-03'), 400, /بحد أقصى 2 مرات طوال الخدمة/)
  // رفع الحد بيسمح، وتفضيته = من غير حد
  ok(await patchType(type.id, { maxTimesInService: 3 }), 200)
  const third = await submit('2099-06-01', '2099-06-03')
  assert.equal(third.status, 201, JSON.stringify(third.body))
  refused(await submit('2099-09-01', '2099-09-03'), 400, /بحد أقصى 3 مرات/)
  assert.equal(ok(await patchType(type.id, { maxTimesInService: null }), 200).maxTimesInService, null)
  const fourth = await submit('2099-09-01', '2099-09-03')
  assert.equal(fourth.status, 201, JSON.stringify(fourth.body))
})

test('LT-04: أنواع إجازات حزمة الدولة لفرع — غير مفعّلة وبأرقام الحزمة، لمصر والسعودية، ومابتتكررش، وبنطاق الحساب', async () => {
  const before = (await types()).length
  const eg = ok(await request(admin, 'POST', '/settings/leave-types/statutory-pack', { branchId: B.eg.id }), 201)
  const egCodes = ['MATERNITY', 'PATERNITY', 'HAJJ'].map(code => `${code}_EG_B${B.eg.id}`)
  assert.deepEqual(eg, { created: egCodes, existing: [], unverified: true })
  const brief = async codes => (await types()).filter(row => codes.includes(row.code)).map(row => [row.code.split('_')[0], row.branchId, row.isActive, row.category, row.isPaid, row.maxDays, row.maxTimesInService, row.oncePerService])
  assert.deepEqual(await brief(egCodes), [['MATERNITY', B.eg.id, false, 'OCCASION', true, 120, 3, false], ['PATERNITY', B.eg.id, false, 'OCCASION', true, 1, 3, false], ['HAJJ', B.eg.id, false, 'OCCASION', true, 30, null, true]])
  assert.match((await typeOf(egCodes[0])).description, /من حزمة الدولة \(محتاج تحقق\) — بحد أقصى 3 مرات طول الخدمة/)
  // تاني مرة: مفيش تكرار
  assert.deepEqual(ok(await request(admin, 'POST', '/settings/leave-types/statutory-pack', { branchId: B.eg.id }), 201), { created: [], existing: egCodes, unverified: true })
  const saCodes = ['MATERNITY', 'PATERNITY', 'MARRIAGE', 'BEREAVEMENT', 'BEREAVEMENT_SIBLING', 'HAJJ'].map(code => `${code}_SA_B${B.sa.id}`)
  assert.deepEqual(ok(await request(admin, 'POST', '/settings/leave-types/statutory-pack', { branchId: B.sa.id }), 201).created, saCodes)
  assert.deepEqual((await types()).filter(row => saCodes.includes(row.code)).map(row => [row.maxDays, row.maxTimesInService, row.oncePerService, row.isActive, row.branchId === B.sa.id]),
    [[84, null, false, false, true], [3, null, false, false, true], [5, null, false, false, true], [5, null, false, false, true], [3, null, false, false, true], [15, null, true, false, true]])
  assert.equal((await types()).length, before + 9)
  // فرع من غير دولة مالوش أنواع، وحساب الفرع لفرعه بس، والنوع غير المفعّل مايتطلبش
  refused(await request(admin, 'POST', '/settings/leave-types/statutory-pack', { branchId: B.none.id }), 400, /مافيهاش أنواع إجازات لدولة الفرع/)
  assert.equal((await request(scoped, 'POST', '/settings/leave-types/statutory-pack', { branchId: B.sa.id })).status, 403)
  assert.deepEqual(ok(await request(scoped, 'POST', '/settings/leave-types/statutory-pack', { branchId: B.eg.id }), 201).created, [])
  const account = await repo('User').findOneByOrFail({ email: 'staff@leave-tiers.invalid' })
  const draft = await request(account, 'POST', '/requests', { typeCode: 'LEAVE', payload: { leaveTypeCode: egCodes[0], fromDate: '2099-11-02', toDate: '2099-11-04', days: 1 } })
  const submitted = draft.status === 201 ? await request(account, 'POST', `/requests/${draft.body.id}/submit`) : draft
  refused(submitted, 400, /غير معروف أو معطل/)
  // الأنواع العامة الموجودة ماتلمستش
  assert.deepEqual([(await typeOf('MATERNITY')).maxDays, (await typeOf('MATERNITY')).isActive, (await typeOf('HAJJ')).oncePerService], [90, true, true])
})
