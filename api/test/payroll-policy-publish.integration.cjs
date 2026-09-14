// الخطوة 15: محرر مجموعة السياسة (إنشاء + نسخ + إعدادات + دورة) ونشرها بصلاحية payroll.policy.manage.
// قاعدة SQL مؤقتة معزولة (hr_policy_publish_test_<hex>) تُحذف في النهاية؛ لا يلمس الاختبار hr_system.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_policy_publish_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-policy-publish-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const endpoint = '/payroll/policies'
let app, ds, master, base, created = false
let admin, hrManager, calculateOnly, otherBranchManager, branchA, branchB

function assertDisposable() {
  assert.match(database, /^hr_policy_publish_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
function repo(name) { assertDisposable(); return ds.getRepository(name) }
const plain = value => JSON.parse(JSON.stringify(value))
function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: null,
    tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
function expectStatus(response, status) { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const cycle23 = { defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 23, cycleEndMode: 'DERIVED', cycleEndDay: null }
const versionRoute = (policyId, versionId, suffix = '') => `${endpoint}/${policyId}/versions/${versionId}${suffix}`

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
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  // ترحيل 022: مشغلات التجميد نفسها على القاعدة المؤقتة (المزامنة لا تنشئ مشغلات)؛ كل مسارات الخدمة في هذا الاختبار تمر عبرها.
  const migration = fs.readFileSync(path.resolve(apiRoot, '..', 'docs', 'migrations', 'payroll', '20260914_022_b2_policy_seal_freeze.sql'), 'utf8')
  const triggerBatches = migration.split(/^\s*GO\s*$/m).map(text => text.trim()).filter(text => /^(?:--[^\n]*\n\s*)*CREATE OR ALTER TRIGGER/i.test(text))
  assert.equal(triggerBatches.length, 6)
  for (const batch of triggerBatches) await ds.query(batch)
  assert.equal((await ds.query(`SELECT COUNT(*) AS n FROM sys.triggers WHERE [name] LIKE N'TR[_]payroll[_]%frozen' AND [is_disabled] = 0`))[0].n, 6)
  branchA = await repo('Branch').save({ code: 'PUBLISH_A', name: 'فرع القاهرة' })
  branchB = await repo('Branch').save({ code: 'PUBLISH_B', name: 'فرع آخر' })
  const user = (label, role, branchId, permissions) => repo('User').save({ email: `${label}@policy-publish-test.invalid`,
    displayName: label, passwordHash: 'test-only', role, branchId, permissions: JSON.stringify(permissions) })
  admin = await user('admin', 'super_admin', null, [])
  hrManager = await user('hr-manager', 'hr_manager', branchA.id, ['payroll.view', 'payroll.calculate', 'payroll.approve', 'payroll.policy.manage'])
  calculateOnly = await user('payroll-officer', 'payroll_officer', branchA.id, ['payroll.view', 'payroll.calculate'])
  otherBranchManager = await user('hr-branch-b', 'hr_manager', branchB.id, ['payroll.view', 'payroll.calculate', 'payroll.policy.manage'])
}, { timeout: 90000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assertDisposable()
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const remaining = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(remaining.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.match(path.basename(uploads), /^hr-policy-publish-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Policy publish fixture cleanup failed')
})

test('Acceptance: HR creates «مجموعة القاهرة» with cycle 23 → 22 and publishes it; the version freezes; a payroll.calculate-only user cannot', async () => {
  const body = { code: 'CAIRO', name: 'مجموعة القاهرة', effectiveFrom: '2026-09-23', settings: cycle23, metadata: { title: 'النسخة الأولى', notes: null } }
  expectStatus(await request(calculateOnly, 'POST', endpoint, body), 403)
  assert.equal(await repo('PayrollPolicy').count(), 0, 'a denied create must not leave a row')

  const createdPolicy = expectStatus(await request(hrManager, 'POST', endpoint, body), 201)
  const policyId = createdPolicy.policy.id, [draft] = createdPolicy.versions
  assert.equal(createdPolicy.policy.name, 'مجموعة القاهرة'); assert.equal(createdPolicy.policy.branchId, branchA.id)
  assert.equal(draft.status, 'DRAFT'); assert.equal(draft.settingsStatus, 'COMPLETE')
  assert.deepEqual([draft.defaultPeriodType, draft.cycleStartDay, draft.cycleEndMode, draft.cycleEndDay, Number(draft.monthlyDays)], ['CUSTOM_DAY_RANGE', 23, 'DERIVED', null, 30])
  assert.equal(createdPolicy.capabilities.canPublish, true)

  const officerView = expectStatus(await request(calculateOnly, 'GET', `${endpoint}/${policyId}`), 200)
  assert.equal(officerView.capabilities.canEdit, false); assert.equal(officerView.capabilities.canPublish, false)
  const officerCheck = expectStatus(await request(calculateOnly, 'GET', versionRoute(policyId, draft.id, '/publish-check')), 200)
  assert.equal(officerCheck.publishable, true); assert.equal(officerCheck.canPublish, false)

  const check = expectStatus(await request(hrManager, 'GET', versionRoute(policyId, draft.id, '/publish-check')), 200)
  assert.equal(check.publishable, true, JSON.stringify(check.issues)); assert.equal(check.canPublish, true)
  assert.equal(check.cycle, 'من يوم 23 إلى يوم 22 من الشهر التالي')
  assert.deepEqual(check.periods, [
    { reference: '2026-10', startDate: '2026-09-23', endDate: '2026-10-22' },
    { reference: '2026-11', startDate: '2026-10-23', endDate: '2026-11-22' },
    { reference: '2026-12', startDate: '2026-11-23', endDate: '2026-12-22' },
  ])
  assert.ok(check.warnings.some(warning => warning.code === 'POLICY_DEFINITION_MISSING'))

  const publishBody = { expectedRevision: draft.revision, reason: 'اعتماد مجموعة القاهرة بدورة 23 إلى 22' }
  const denied = [
    ['POST', versionRoute(policyId, draft.id, '/publish'), publishBody],
    ['PATCH', versionRoute(policyId, draft.id), { expectedRevision: draft.revision, reason: 'محاولة تعديل', settings: { dailyHours: 9 } }],
    ['POST', `${endpoint}/${policyId}/versions`, { expectedRevision: draft.revision, reason: 'محاولة نسخ', sourceVersionId: draft.id }],
    ['PATCH', `${endpoint}/${policyId}`, { expectedRevision: 1, reason: 'محاولة تسمية', name: 'اسم آخر' }],
    ['POST', `${endpoint}/${policyId}/archive`, { expectedRevision: 1, reason: 'محاولة أرشفة' }],
  ]
  const beforeDenied = plain(await repo('PayrollPolicyVersion').find({ order: { id: 'ASC' } }))
  for (const [method, route, payload] of denied) expectStatus(await request(calculateOnly, method, route, payload), 403)
  assert.deepEqual(plain(await repo('PayrollPolicyVersion').find({ order: { id: 'ASC' } })), beforeDenied)
  assert.equal((await repo('PayrollPolicy').findOneByOrFail({ id: policyId })).name, 'مجموعة القاهرة')

  const published = expectStatus(await request(hrManager, 'POST', versionRoute(policyId, draft.id, '/publish'), publishBody), 200)
  assert.equal(published.version.status, 'ACTIVE'); assert.ok(published.version.frozenAt); assert.ok(published.version.publishedAt)
  assert.equal(published.version.publishedBy, hrManager.id); assert.equal(published.version.revision, draft.revision + 1)
  assert.match(published.contentHash, /^[a-f0-9]{64}$/)
  // الختم صف مستقل للنسخة (لا داخل الحدث فقط)، ووقت النشر والتجميد والختم بساعة UTC في القاعدة ولحظة صحيحة في الـAPI.
  assert.equal(published.version.contentHash, published.contentHash)
  const seal = await repo('PayrollPolicyVersionSeal').findOneByOrFail({ versionId: draft.id })
  assert.equal(seal.contentHash, published.contentHash); assert.equal(seal.sealedBy, hrManager.id); assert.equal(seal.sealVersion, 'POLICY_SEAL_V1_20260914')
  const [clock] = await ds.query(`SELECT CONVERT(varchar(23), v.[publishedAt], 126) AS publishedAt, CONVERT(varchar(23), v.[frozenAt], 126) AS frozenAt,
    CONVERT(varchar(23), v.[updatedAt], 126) AS updatedAt, CONVERT(varchar(23), s.[sealedAt], 126) AS sealedAt, CONVERT(varchar(23), SYSUTCDATETIME(), 126) AS utcNow
    FROM [payroll_policy_versions] v INNER JOIN [payroll_policy_version_seals] s ON s.[versionId] = v.[id] WHERE v.[id] = @0`, [draft.id])
  const utc = value => Date.parse(`${value}Z`)
  for (const column of ['publishedAt', 'frozenAt', 'updatedAt', 'sealedAt']) assert.ok(Math.abs(utc(clock[column]) - utc(clock.utcNow)) < 120000, `${column}: raw ${clock[column]} vs UTC now ${clock.utcNow} (offset ${new Date().getTimezoneOffset()} min)`)
  assert.ok(Math.abs(Date.parse(published.version.publishedAt) - utc(clock.publishedAt)) < 1000, `API ${published.version.publishedAt} vs raw ${clock.publishedAt}`)
  assert.ok(Math.abs(Date.parse(published.version.sealedAt) - utc(clock.sealedAt)) < 1000, `API ${published.version.sealedAt} vs raw ${clock.sealedAt}`)
  const frozen = plain(await repo('PayrollPolicyVersion').findOneByOrFail({ id: draft.id }))

  const again = expectStatus(await request(hrManager, 'POST', versionRoute(policyId, draft.id, '/publish'), { expectedRevision: frozen.revision, reason: 'نشر مكرر' }), 409)
  assert.equal(again.code, 'POLICY_PUBLISH_BLOCKED'); assert.ok(again.issues.some(issue => issue.code === 'POLICY_VERSION_NOT_DRAFT'))
  const edited = expectStatus(await request(hrManager, 'PATCH', versionRoute(policyId, draft.id), { expectedRevision: frozen.revision, reason: 'ساعات اليوم 9 لنسخة لاحقة', settings: { dailyHours: 9 } }), 200)
  assert.equal(edited.editKind, 'CLONED'); assert.equal(edited.version.status, 'DRAFT'); assert.equal(edited.version.versionNo, 2)
  assert.equal(Number(edited.version.dailyHours), 9); assert.equal(edited.version.cycleStartDay, 23)
  assert.deepEqual(plain(await repo('PayrollPolicyVersion').findOneByOrFail({ id: draft.id })), frozen, 'the published version must stay frozen')
  const frozenCheck = expectStatus(await request(hrManager, 'GET', versionRoute(policyId, draft.id, '/publish-check')), 200)
  assert.equal(frozenCheck.integrity.matches, true); assert.equal(frozenCheck.integrity.contentHash, published.contentHash)
  assert.equal(frozenCheck.integrity.currentContentHash, published.contentHash)

  const events = expectStatus(await request(hrManager, 'GET', `${endpoint}/${policyId}/events`), 200)
  assert.deepEqual(events.map(row => row.eventType), ['CREATED', 'PUBLISHED', 'VERSION_CLONED'])
  assert.equal(events[1].actorUserId, hrManager.id); assert.equal(events[1].payload.contentHash, published.contentHash)
  assert.equal(events[1].reason, publishBody.reason)
  // خارج نطاق الفرع: لا فحص ولا نشر لسياسة فرع آخر حتى مع الصلاحية.
  expectStatus(await request(otherBranchManager, 'GET', versionRoute(policyId, edited.version.id, '/publish-check')), 403)
  expectStatus(await request(otherBranchManager, 'POST', versionRoute(policyId, edited.version.id, '/publish'), { expectedRevision: edited.version.revision, reason: 'نشر من فرع آخر' }), 403)
})

test('Publishing checks cycle alignment, closes the previous published version at a cycle end and refuses approved periods', async () => {
  const createdPolicy = expectStatus(await request(hrManager, 'POST', endpoint, { code: 'ALEX', name: 'مجموعة الإسكندرية', effectiveFrom: '2026-09-23', settings: cycle23 }), 201)
  const policyId = createdPolicy.policy.id
  const v1 = expectStatus(await request(hrManager, 'POST', versionRoute(policyId, createdPolicy.versions[0].id, '/publish'), { expectedRevision: 1, reason: 'نشر أول' }), 200).version
  let v2 = expectStatus(await request(hrManager, 'POST', `${endpoint}/${policyId}/versions`, { sourceVersionId: v1.id, expectedRevision: v1.revision, reason: 'نسخة الشهر التالي' }), 201).version

  let check = expectStatus(await request(hrManager, 'GET', versionRoute(policyId, v2.id, '/publish-check')), 200)
  assert.equal(check.publishable, false); assert.ok(check.issues.some(issue => issue.code === 'POLICY_VERSION_OVERLAP'), JSON.stringify(check.issues))

  v2 = expectStatus(await request(hrManager, 'PATCH', versionRoute(policyId, v2.id), { expectedRevision: v2.revision, reason: 'بداية الشهر التقويمي', effectiveFrom: '2026-10-01' }), 200).version
  const blocked = expectStatus(await request(hrManager, 'POST', versionRoute(policyId, v2.id, '/publish'), { expectedRevision: v2.revision, reason: 'نشر غير محاذٍ' }), 409)
  const misaligned = blocked.issues.find(issue => issue.code === 'POLICY_EFFECTIVE_FROM_NOT_CYCLE_START')
  assert.ok(misaligned, JSON.stringify(blocked)); assert.equal(misaligned.suggestion, '2026-10-23')
  assert.equal((await repo('PayrollPolicyVersion').findOneByOrFail({ id: v2.id })).status, 'DRAFT')

  v2 = expectStatus(await request(hrManager, 'PATCH', versionRoute(policyId, v2.id), { expectedRevision: v2.revision, reason: 'محاذاة بداية الدورة', effectiveFrom: misaligned.suggestion }), 200).version
  check = expectStatus(await request(hrManager, 'GET', versionRoute(policyId, v2.id, '/publish-check')), 200)
  assert.equal(check.publishable, true, JSON.stringify(check.issues))
  assert.deepEqual(check.supersedes.map(row => [row.versionNo, row.newEffectiveTo]), [[1, '2026-10-22']])
  const firstBefore = plain(await repo('PayrollPolicyVersion').findOneByOrFail({ id: v1.id }))
  const published = expectStatus(await request(hrManager, 'POST', versionRoute(policyId, v2.id, '/publish'), { expectedRevision: v2.revision, reason: 'نشر نسخة أكتوبر' }), 200)
  assert.equal(published.version.effectiveFrom, '2026-10-23')
  // الإيقاف مشتق: صف النسخة الأولى المجمد لم يتغير (لا نهاية سريان ولا مراجعة)، والعرض يعطي نهايتها الفعلية.
  assert.deepEqual(plain(await repo('PayrollPolicyVersion').findOneByOrFail({ id: v1.id })), firstBefore)
  assert.equal(firstBefore.status, 'ACTIVE'); assert.equal(firstBefore.effectiveTo, null)
  const viewOf = async id => expectStatus(await request(hrManager, 'GET', `${endpoint}/${policyId}`), 200).versions.find(row => row.id === id)
  assert.deepEqual([(await viewOf(v1.id)).effectiveUntil, (await viewOf(v1.id)).supersededByVersionId], ['2026-10-22', v2.id])
  assert.deepEqual([(await viewOf(v2.id)).effectiveUntil, (await viewOf(v2.id)).supersededByVersionId], [null, null])
  const events = expectStatus(await request(hrManager, 'GET', `${endpoint}/${policyId}/events`), 200)
  const superseded = events.find(row => row.eventType === 'VERSION_SUPERSEDED' && row.versionId === v1.id)
  assert.ok(superseded, JSON.stringify(events.map(row => row.eventType)))
  assert.deepEqual([superseded.payload.supersededByVersionId, superseded.payload.effectiveUntil, superseded.payload.versionRowChanged], [v2.id, '2026-10-22', false])
  // نسخة ثالثة من 23 نوفمبر توقف الثانية وحدها؛ الأولى متوقفة فعليًا قبلها فلا تُحسب متداخلة (مقارنة بالنهاية الفعلية لا المعلنة).
  let v3 = expectStatus(await request(hrManager, 'POST', `${endpoint}/${policyId}/versions`, { sourceVersionId: v2.id, expectedRevision: published.version.revision, reason: 'نسخة نوفمبر' }), 201).version
  v3 = expectStatus(await request(hrManager, 'PATCH', versionRoute(policyId, v3.id), { expectedRevision: v3.revision, reason: 'بداية نوفمبر', effectiveFrom: '2026-11-23' }), 200).version
  check = expectStatus(await request(hrManager, 'GET', versionRoute(policyId, v3.id, '/publish-check')), 200)
  assert.equal(check.publishable, true, JSON.stringify(check.issues))
  assert.deepEqual(check.supersedes.map(row => [row.versionNo, row.newEffectiveTo]), [[2, '2026-11-22']])
  const secondBefore = plain(await repo('PayrollPolicyVersion').findOneByOrFail({ id: v2.id }))
  expectStatus(await request(hrManager, 'POST', versionRoute(policyId, v3.id, '/publish'), { expectedRevision: v3.revision, reason: 'نشر نسخة نوفمبر' }), 200)
  assert.deepEqual(plain(await repo('PayrollPolicyVersion').findOneByOrFail({ id: v2.id })), secondBefore)
  assert.deepEqual([(await viewOf(v1.id)).effectiveUntil, (await viewOf(v2.id)).effectiveUntil, (await viewOf(v3.id)).effectiveUntil], ['2026-10-22', '2026-11-22', null])

  const giza = expectStatus(await request(hrManager, 'POST', endpoint, { code: 'GIZA', name: 'مجموعة الجيزة', effectiveFrom: '2026-09-23', settings: cycle23 }), 201)
  await repo('PayrollRun').save({ name: 'مسير معتمد بمجموعة الجيزة', branchId: branchA.id, scopeType: 'BRANCH', scopeIds: JSON.stringify([branchA.id]),
    employeeIds: JSON.stringify([]), policyId: giza.policy.id, period: '2026-10', startDate: '2026-09-23', endDate: '2026-10-22', status: 'APPROVED',
    totalNet: 0, approvedBy: admin.id, approvedAt: new Date('2026-10-23T08:00:00Z'), snapshotVersion: 0 })
  const locked = expectStatus(await request(hrManager, 'GET', versionRoute(giza.policy.id, giza.versions[0].id, '/publish-check')), 200)
  assert.equal(locked.publishable, false); assert.ok(locked.issues.some(issue => issue.code === 'POLICY_PERIOD_LOCKED'), JSON.stringify(locked.issues))

  // متى رُبطت المسيرات بنسخة السياسة (عمود policyVersionId من الخطوة 16/19) يشمل القفل مسيرًا مربوطًا بالنسخة وحدها.
  await ds.query('ALTER TABLE [payroll_runs] ADD [policyVersionId] int NULL')
  const aswan = expectStatus(await request(hrManager, 'POST', endpoint, { code: 'ASWAN', name: 'مجموعة أسوان', effectiveFrom: '2026-09-23', settings: cycle23 }), 201)
  const versionRun = await repo('PayrollRun').save({ name: 'مسير مصروف بنسخة أسوان', branchId: branchA.id, scopeType: 'BRANCH', scopeIds: JSON.stringify([branchA.id]),
    employeeIds: JSON.stringify([]), policyId: null, period: '2026-11', startDate: '2026-10-23', endDate: '2026-11-22', status: 'PAID',
    totalNet: 0, approvedBy: admin.id, approvedAt: new Date('2026-11-23T08:00:00Z'), snapshotVersion: 0 })
  await ds.query('UPDATE [payroll_runs] SET [policyVersionId] = @0 WHERE [id] = @1', [aswan.versions[0].id, versionRun.id])
  const byVersion = expectStatus(await request(hrManager, 'GET', versionRoute(aswan.policy.id, aswan.versions[0].id, '/publish-check')), 200)
  const lockedByVersion = byVersion.issues.find(issue => issue.code === 'POLICY_PERIOD_LOCKED')
  assert.ok(lockedByVersion && lockedByVersion.message.includes(`#${versionRun.id}`), JSON.stringify(byVersion.issues))
})

test('Reviewer defect: a fixed end day that breaks contiguity cannot be created, saved or published; start − 1 equals the derived cycle; codes are generated', async () => {
  const policiesBefore = await repo('PayrollPolicy').count()
  for (const cycleEndDay of [23, 25]) {
    const refused = expectStatus(await request(hrManager, 'POST', endpoint, { name: 'دورة مكسورة', effectiveFrom: '2026-09-23', settings: { ...cycle23, cycleEndMode: 'FIXED_DAY', cycleEndDay } }), 400)
    assert.match(JSON.stringify(refused), /cycleEndDay/); assert.match(JSON.stringify(refused), /اليوم 22/)
  }
  assert.equal(await repo('PayrollPolicy').count(), policiesBefore, 'a refused cycle must not leave a policy row')

  // بلا كود: كود فريد مولّد لكل مجموعة في اليوم نفسه، والكود المكرر صراحة يُرفض برسالة واضحة.
  const fixed = expectStatus(await request(hrManager, 'POST', endpoint, { name: 'مجموعة طنطا', effectiveFrom: '2026-09-23', settings: { ...cycle23, cycleEndMode: 'FIXED_DAY', cycleEndDay: 22 } }), 201)
  const derived = expectStatus(await request(hrManager, 'POST', endpoint, { name: 'مجموعة دمياط', code: '', effectiveFrom: '2026-09-23', settings: cycle23 }), 201)
  const now = new Date(), today = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  for (const created of [fixed, derived]) assert.match(created.policy.code, new RegExp(`^PS-${today}-\\d{2}$`))
  assert.notEqual(fixed.policy.code, derived.policy.code)
  const duplicate = expectStatus(await request(hrManager, 'POST', endpoint, { code: fixed.policy.code, name: 'مكرر', effectiveFrom: '2026-09-23', settings: cycle23 }), 409)
  assert.equal(duplicate.code, 'POLICY_CODE_EXISTS')

  const fixedCheck = expectStatus(await request(hrManager, 'GET', versionRoute(fixed.policy.id, fixed.versions[0].id, '/publish-check')), 200)
  const derivedCheck = expectStatus(await request(hrManager, 'GET', versionRoute(derived.policy.id, derived.versions[0].id, '/publish-check')), 200)
  assert.equal(fixedCheck.publishable, true, JSON.stringify(fixedCheck.issues))
  assert.deepEqual(fixedCheck.periods, derivedCheck.periods); assert.equal(fixedCheck.cycle, 'من يوم 23 إلى يوم 22 من الشهر التالي')

  const draftBefore = plain(await repo('PayrollPolicyVersion').findOneByOrFail({ id: fixed.versions[0].id }))
  expectStatus(await request(hrManager, 'PATCH', versionRoute(fixed.policy.id, fixed.versions[0].id), { expectedRevision: 1, reason: 'يوم نهاية 25', settings: { cycleEndDay: 25 } }), 400)
  expectStatus(await request(hrManager, 'PATCH', versionRoute(fixed.policy.id, fixed.versions[0].id), { expectedRevision: 1, reason: 'بداية 25 بنهاية 22', settings: { cycleStartDay: 25 } }), 400)
  assert.deepEqual(plain(await repo('PayrollPolicyVersion').findOneByOrFail({ id: fixed.versions[0].id })), draftBefore)

  // صف مخزن بدورة مكسورة (تجاوز الخدمة): المراجعة تعرض التداخل بتواريخه وتمنع النشر.
  const brokenId = derived.versions[0].id
  await ds.query(`UPDATE [payroll_policy_versions] SET [cycleEndMode] = N'FIXED_DAY', [cycleEndDay] = 23 WHERE [id] = @0`, [brokenId])
  try {
    const broken = expectStatus(await request(hrManager, 'GET', versionRoute(derived.policy.id, brokenId, '/publish-check')), 200)
    assert.equal(broken.publishable, false)
    for (const code of ['POLICY_SETTINGS_INCOMPLETE', 'POLICY_CYCLE_INVALID', 'POLICY_CYCLE_NOT_CONTIGUOUS']) assert.ok(broken.issues.some(issue => issue.code === code), `${code}: ${JSON.stringify(broken.issues)}`)
    assert.deepEqual(broken.issues.find(issue => issue.code === 'POLICY_CYCLE_NOT_CONTIGUOUS').details[0],
      { kind: 'OVERLAP', previousReference: '2026-09', nextReference: '2026-10', from: '2026-09-23', to: '2026-09-23' })
    const blocked = expectStatus(await request(hrManager, 'POST', versionRoute(derived.policy.id, brokenId, '/publish'), { expectedRevision: 1, reason: 'نشر دورة مكسورة' }), 409)
    assert.equal(blocked.code, 'POLICY_PUBLISH_BLOCKED')
    assert.equal((await repo('PayrollPolicyVersion').findOneByOrFail({ id: brokenId })).status, 'DRAFT')
  } finally { await ds.query(`UPDATE [payroll_policy_versions] SET [cycleEndMode] = N'DERIVED', [cycleEndDay] = NULL WHERE [id] = @0`, [brokenId]) }

  // افتراضات الإنشاء: يوم النهاية الثابت لا ينفصل عن يوم البداية بتعديل مفتاح واحد.
  const keys = ['payroll.cycle_start_day', 'payroll.policy.cycle_end_mode', 'payroll.policy.cycle_end_day', 'payroll.policy.default_period_type']
  const originalConfig = plain(await repo('RequestsConfig').findBy({ key: require('../node_modules/typeorm').In(keys) }))
  assert.equal(originalConfig.length, keys.length, JSON.stringify(originalConfig))
  const config = async (key, value) => request(admin, 'PATCH', '/settings/config', { key, value })
  try {
    expectStatus(await config('payroll.policy.default_period_type', 'CUSTOM_DAY_RANGE'), 200)
    expectStatus(await config('payroll.cycle_start_day', '23'), 200)
    expectStatus(await config('payroll.policy.cycle_end_mode', 'DERIVED'), 200)
    expectStatus(await config('payroll.policy.cycle_end_day', 'null'), 200)
    assert.match(JSON.stringify(expectStatus(await config('payroll.policy.cycle_end_mode', 'FIXED_DAY'), 400)), /22/)
    expectStatus(await config('payroll.policy.cycle_end_day', '22'), 200)
    expectStatus(await config('payroll.policy.cycle_end_mode', 'FIXED_DAY'), 200)
    assert.match(JSON.stringify(expectStatus(await config('payroll.cycle_start_day', '25'), 400)), /اليوم 24/)
    assert.equal((await repo('RequestsConfig').findOneByOrFail({ key: 'payroll.cycle_start_day' })).value, '23')
  } finally { await repo('RequestsConfig').save(originalConfig) }
})

test('Migration 022 triggers keep a published version, its definition rows and its seal frozen; direct tampering shows as a seal mismatch', async () => {
  const created = expectStatus(await request(hrManager, 'POST', endpoint, { name: 'مجموعة المنصورة', effectiveFrom: '2026-09-23', settings: cycle23 }), 201)
  const policyId = created.policy.id, versionId = created.versions[0].id
  expectStatus(await request(hrManager, 'POST', versionRoute(policyId, versionId, '/publish'), { expectedRevision: 1, reason: 'نشر لاختبار المشغلات' }), 200)
  const before = plain(await repo('PayrollPolicyVersion').findOneByOrFail({ id: versionId }))
  const sealBefore = plain(await repo('PayrollPolicyVersionSeal').findOneByOrFail({ versionId }))
  const refused = async (statement, params, number) => assert.rejects(ds.query(statement, params), error => {
    assert.equal(Number(error.driverError?.number ?? error.number), number, String(error.message)); return true
  })
  await refused('UPDATE [payroll_policy_versions] SET [dailyHours] = [dailyHours] + 1 WHERE [id] = @0', [versionId], 51232)
  await refused(`UPDATE [payroll_policy_versions] SET [effectiveTo] = '2026-10-22' WHERE [id] = @0`, [versionId], 51232)
  await refused(`UPDATE [payroll_policy_versions] SET [status] = N'DRAFT', [frozenAt] = NULL, [publishedAt] = NULL, [publishedBy] = NULL WHERE [id] = @0`, [versionId], 51232)
  await refused(`UPDATE [payroll_policy_versions] SET [status] = N'DRAFT' WHERE [id] = @0`, [versionId], 51233)
  await refused(`UPDATE [payroll_policy_versions] SET [metadata] = N'{"title":"عبث","notes":null}' WHERE [id] = @0`, [versionId], 51231)
  await refused(`INSERT INTO [payroll_policy_parameters] ([versionId], [code], [nameAr], [value], [unit], [isActive]) VALUES (@0, N'TAMPER', N'عبث', 1, N'SAR', 1)`, [versionId], 51234)
  await refused(`UPDATE [payroll_policy_version_seals] SET [contentHash] = REPLICATE(N'0', 64) WHERE [versionId] = @0`, [versionId], 51238)
  // عمود غير محتوى (من عدّل آخرًا) لا يُمنع؛ المشغل لا يعطل التدقيق.
  await ds.query('UPDATE [payroll_policy_versions] SET [updatedBy] = [updatedBy] WHERE [id] = @0', [versionId])
  assert.deepEqual(plain(await repo('PayrollPolicyVersion').findOneByOrFail({ id: versionId })), before)
  assert.deepEqual(plain(await repo('PayrollPolicyVersionSeal').findOneByOrFail({ versionId })), sealBefore)
  assert.equal(await repo('PayrollPolicyParameter').countBy({ versionId }), 0)

  // عبث يتجاوز المشغل (تعطيله يدويًا) يظهر في مراجعة النشر لأن البصمة المعاد حسابها لا تطابق الختم.
  const [{ dailyHours }] = await ds.query('SELECT CAST([dailyHours] AS varchar(20)) AS dailyHours FROM [payroll_policy_versions] WHERE [id] = @0', [versionId])
  const bypass = async value => {
    await ds.query('DISABLE TRIGGER [TR_payroll_policy_version_frozen] ON [payroll_policy_versions]')
    try { await ds.query('UPDATE [payroll_policy_versions] SET [dailyHours] = CAST(@0 AS decimal(5,2)) WHERE [id] = @1', [value, versionId]) }
    finally { await ds.query('ENABLE TRIGGER [TR_payroll_policy_version_frozen] ON [payroll_policy_versions]') }
  }
  await bypass('9.5')
  try {
    const tampered = expectStatus(await request(hrManager, 'GET', versionRoute(policyId, versionId, '/publish-check')), 200)
    assert.equal(tampered.integrity.matches, false); assert.equal(tampered.integrity.contentHash, sealBefore.contentHash)
    assert.ok(tampered.warnings.some(warning => warning.code === 'POLICY_CONTENT_SEAL_MISMATCH'), JSON.stringify(tampered.warnings))
  } finally { await bypass(dailyHours) }
  const restored = expectStatus(await request(hrManager, 'GET', versionRoute(policyId, versionId, '/publish-check')), 200)
  assert.equal(restored.integrity.matches, true); assert.ok(!restored.warnings.some(warning => warning.code.startsWith('POLICY_CONTENT_SEAL')))
})
