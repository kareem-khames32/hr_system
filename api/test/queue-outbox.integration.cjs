'use strict'
// B2.3: الطابور والـoutbox على قاعدة SQL مؤقتة معزولة بتتمسح في الآخر (hr_queue_outbox_test_<16 hex>):
//  QO-01) حدث اتكتب في معاملة اترجعت مابيتسجلش ومابيتنفذش (معيار الخطة).
//  QO-02) الحدث المتوزع بيبقى مهمة لكل مستهلك مشترك في نوعه وبتتنفذ مرة؛ والنوع من غير مستهلك بيتعلّم «اتوزع» من غير مهام.
//  QO-03) مهمة فشلت بتتعاد بعد مهلة (مش فورًا)، وبعد الحد الأقصى DEAD برسالتها، و«إعادة» بترجعها.
//  QO-04) عاملين في نفس الوقت مابياخدوش نفس المهمة (READPAST)، ومنع التكرار بالمفتاح، ومهمة اتمسكت من عامل وقع بترجع.
//  QO-05) الأحداث الست من مصادرها الحقيقية: التعيين، واعتماد ورفض طلب، واعتماد مسير، ومستند هينتهي (مرة لكل تاريخ)، وانتهاء الخدمة.
//  QO-06) شاشة الطابور لحساب الشركة بس، و/health بالعدد بس.
// Run (من api/): node --test test/queue-outbox.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const { writeParityReasonsBeforeApproval } = require('./fixtures/payroll-parity-reasons.cjs')
const { employeeRequiredFields } = require('./helpers/employee-fixture.cjs')

const database = `hr_queue_outbox_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-queue-outbox-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const policyStart = '2026-05-23', attendanceEnd = '2026-08-22', period = '2026-08'
let app, master, ds, base, queue, created = false, employeeNumber = 0
const org = {}, users = {}

function assertDisposable() {
  assert.match(database, /^hr_queue_outbox_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
const query = (text, params = []) => { assertDisposable(); return ds.query(text, params) }
const token = user => jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false,
  permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  await writeParityReasonsBeforeApproval(request, user, method, route)
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
function expectStatus(response, status) {
  assert.equal(response.status, status, JSON.stringify(response.body))
  return response.body
}
const events = async type => query(`SELECT [id], [eventType], [entityType], [entityId], [payload], [eventKey], [dispatchedAt] FROM [outbox_events] WHERE [eventType] = @0 ORDER BY [id]`, [type])
const jobsOf = async jobType => query(`SELECT * FROM [jobs_queue] WHERE [jobType] = @0 ORDER BY [id]`, [jobType])
async function employee(salary, extra = {}) {
  const emp = await repo('Employee').save({ employeeCode: `QO${String(++employeeNumber).padStart(3, '0')}`, fullName: `موظف الطابور ${employeeNumber}`,
    branchId: org.branch.id, joinDate: '2020-01-01', basicSalary: salary, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0,
    currency: 'SAR', status: 'active', isActive: true, payMethod: 'transfer', ...extra })
  const rows = []
  for (let time = Date.parse(`${policyStart}T12:00:00Z`); time <= Date.parse(`${attendanceEnd}T12:00:00Z`); time += 86400000) {
    rows.push({ employeeId: emp.id, branchId: emp.branchId, date: new Date(time).toISOString().slice(0, 10), status: 'present', checkIn: '08:00', checkOut: '16:00',
      shiftName: 'وردية الطابور', shiftStart: '08:00', shiftEnd: '16:00', scheduleSource: 'override', workMinutes: 480, lateMinutes: 0, deductibleMinutes: 0, earlyLeaveMinutes: 0 })
  }
  await repo('AttendanceDay').save(rows, { chunk: 100 })
  return emp
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
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
  queue = app.get(require('../src/queue/queue.service').QueueService)
  // العامل مقفول في الاختبارات (NODE_ENV=test): الدورة بالإيد
  assert.equal(app.get(require('../src/queue/queue.worker').QueueWorker).enabled, false)
  for (const [key, value] of [['payroll.cycle_start_day', '23'], ['payroll.monthly_days', '30'], ['payroll.daily_hours', '8'],
    ['payroll.salary_evidence_mode', 'MONTHLY_HISTORY_OR_CURRENT_FILE'], ['attendance.weekend_days', 'FRI,SAT']]) {
    const config = repo('RequestsConfig')
    if (await config.findOneBy({ key })) await config.update({ key }, { value }); else await config.save({ key, value })
  }
  org.branch = await repo('Branch').save({ code: 'QO_A', name: 'فرع الطابور' })
  const user = (label, role, permissions, extra = {}) => repo('User').save({ email: `${label}@queue-outbox.invalid`, displayName: label, passwordHash: 'test-only',
    role, branchId: org.branch.id, permissions: JSON.stringify(permissions), ...extra })
  users.admin = await user('admin', 'super_admin', [], { branchId: null })
  users.admin2 = await user('admin2', 'super_admin', [], { branchId: null })
  users.branchSettings = await user('branch-settings', 'hr_manager', ['settings.manage'])
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
  try {
    assert.equal(path.dirname(path.resolve(uploads)), os.tmpdir()); assert.match(path.basename(uploads), /^hr-queue-outbox-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'queue outbox fixture cleanup failed')
})

test('QO-01: حدث اتكتب في معاملة اترجعت مابيتسجلش ومابيتنفذش', async () => {
  const { recordOutboxEvent } = require('../src/queue/outbox')
  const seen = []
  queue.registerHandler('test.rollback', async payload => { seen.push(payload) })
  queue.subscribe('EMPLOYEE_HIRED', 'test.rollback')
  await assert.rejects(ds.transaction(async em => {
    assert.equal(await recordOutboxEvent(em, { type: 'EMPLOYEE_HIRED', entityType: 'employee', entityId: 999001, payload: { employeeId: 999001 } }), true)
    throw new Error('العملية رجعت')
  }), /العملية رجعت/)
  assert.deepEqual((await events('EMPLOYEE_HIRED')).filter(row => row.entityId === '999001'), [])
  await queue.runOnce()
  assert.deepEqual(seen, [])
  assert.deepEqual(await jobsOf('test.rollback'), [])
})

test('QO-02: الحدث المتوزع مهمة لكل مستهلك وبتتنفذ مرة؛ والنوع من غير مستهلك بيتعلّم «اتوزع» من غير مهام', async () => {
  const { recordOutboxEvent } = require('../src/queue/outbox')
  const seen = []
  queue.registerHandler('test.first', async payload => { seen.push(['first', payload.event.entityId, payload.event.payload]) })
  queue.registerHandler('test.second', async payload => { seen.push(['second', payload.event.entityId]) })
  queue.subscribe('PAYROLL_RUN_APPROVED', 'test.first')
  queue.subscribe('PAYROLL_RUN_APPROVED', 'test.second')
  await ds.transaction(async em => {
    await recordOutboxEvent(em, { type: 'PAYROLL_RUN_APPROVED', entityType: 'payroll_run', entityId: 777, payload: { runId: 777, period: '2026-08' } })
    await recordOutboxEvent(em, { type: 'DOCUMENT_EXPIRING', entityType: 'employee_document', entityId: 5, payload: { documentId: 5 } })
  })
  const result = await queue.runOnce()
  assert.ok(result.dispatched >= 2)
  assert.deepEqual(seen.sort(), [['first', '777', { runId: 777, period: '2026-08' }], ['second', '777']].sort())
  const [event] = (await events('PAYROLL_RUN_APPROVED')).filter(row => row.entityId === '777')
  assert.ok(event.dispatchedAt)
  for (const jobType of ['test.first', 'test.second']) {
    const [job] = await jobsOf(jobType)
    assert.deepEqual([job.status, job.attempts, job.idempotencyKey, String(job.outboxEventId)], ['DONE', 1, `event:${event.id}:${jobType}`, String(event.id)])
  }
  const [unsubscribed] = (await events('DOCUMENT_EXPIRING')).filter(row => row.entityId === '5')
  assert.ok(unsubscribed.dispatchedAt, 'من غير مستهلك = اتوزع')
  // دورة تانية: مفيش تنفيذ تاني
  await queue.runOnce()
  assert.equal(seen.length, 2)
})

test('QO-03: مهمة فشلت بتتعاد بعد مهلة مش فورًا، وبعد الحد الأقصى DEAD برسالتها، و«إعادة» بترجعها', async () => {
  let calls = 0, healthy = false
  queue.registerHandler('test.flaky', async () => { calls++; if (!healthy) throw new Error(`فشل مقصود ${calls}`) }, { maxAttempts: 2 })
  assert.equal(await queue.enqueue(ds.manager, { jobType: 'test.flaky', payload: { n: 1 }, key: 'flaky:1' }), true)
  await queue.runOnce()
  let [job] = await jobsOf('test.flaky')
  assert.deepEqual([job.status, job.attempts, job.lastError], ['PENDING', 1, 'فشل مقصود 1'])
  const [{ delay }] = await query(`SELECT DATEDIFF(second, SYSUTCDATETIME(), [runAfter]) AS [delay] FROM [jobs_queue] WHERE [id] = @0`, [job.id])
  assert.ok(delay >= 20 && delay <= 31, `المهلة ${delay} ثانية`)
  await queue.runOnce()
  assert.equal(calls, 1, 'قبل المهلة مابتتعادش')
  // الوقت عدّى
  await query(`UPDATE [jobs_queue] SET [runAfter] = DATEADD(second, -1, SYSUTCDATETIME()) WHERE [id] = @0`, [job.id])
  await queue.runOnce();
  [job] = await jobsOf('test.flaky')
  assert.deepEqual([job.status, job.attempts, job.lastError, calls], ['DEAD', 2, 'فشل مقصود 2', 2])
  assert.ok(job.finishedAt)
  const overview = await queue.overview()
  assert.ok(overview.jobs.DEAD >= 1 && overview.dead.some(row => row.id === String(job.id) && row.lastError === 'فشل مقصود 2'))
  // إعادة المهمة الميتة من الشاشة (حساب الشركة)
  healthy = true
  expectStatus(await request(users.admin, 'POST', `/queue/jobs/${job.id}/retry`), 201)
  await queue.runOnce();
  [job] = await jobsOf('test.flaky')
  assert.deepEqual([job.status, job.attempts, calls], ['DONE', 1, 3])
  expectStatus(await request(users.admin, 'POST', `/queue/jobs/${job.id}/retry`), 404)
})

test('QO-04: عاملين مابياخدوش نفس المهمة، ومنع التكرار بالمفتاح، والمهمة المتمسكة من عامل وقع بترجع', async () => {
  const { QueueService } = require('../src/queue/queue.service')
  const handled = []
  queue.registerHandler('test.parallel', async payload => { handled.push(payload.n) })
  for (let n = 1; n <= 10; n++) assert.equal(await queue.enqueue(ds.manager, { jobType: 'test.parallel', payload: { n }, key: `parallel:${n}` }), true)
  assert.equal(await queue.enqueue(ds.manager, { jobType: 'test.parallel', payload: { n: 1 }, key: 'parallel:1' }), false, 'نفس المفتاح مرة واحدة')
  assert.equal((await jobsOf('test.parallel')).length, 10)
  const other = new QueueService(ds)
  Object.defineProperty(other, 'host', { value: 'other-worker:1' })
  other.registerHandler('test.parallel', async () => undefined)
  const [mine, theirs] = await Promise.all([queue.claim(6), other.claim(6)])
  const ids = [...mine, ...theirs].map(row => row.id)
  assert.equal(new Set(ids).size, ids.length, 'مفيش مهمة اتاخدت مرتين')
  assert.equal(ids.length, 10)
  // العامل التاني «وقع» ومهامه ماسكها: بعد المهلة بترجع PENDING
  await query(`UPDATE [jobs_queue] SET [lockedAt] = DATEADD(minute, -11, SYSUTCDATETIME()) WHERE [lockedBy] = N'other-worker:1'`)
  assert.equal(await queue.recoverStale(), theirs.length)
  // مهام العامل الأول نفسها اتمسكت برضه ووقف: نرجّعها بنفس الطريقة، وبعدين الكل بيخلص مرة واحدة
  await query(`UPDATE [jobs_queue] SET [lockedAt] = DATEADD(minute, -11, SYSUTCDATETIME()) WHERE [status] = N'RUNNING' AND [jobType] = N'test.parallel'`)
  await queue.recoverStale()
  await queue.runOnce({ limit: 20 })
  assert.deepEqual(handled.sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  assert.ok((await jobsOf('test.parallel')).every(row => row.status === 'DONE'))
})

test('QO-05: الأحداث الست من مصادرها الحقيقية في نفس معاملتها', async () => {
  // 1) تم التعيين: إضافة موظف من الشاشة
  const created = expectStatus(await request(users.admin, 'POST', '/employees', { ...(await employeeRequiredFields(ds, org.branch.id)), fullName: 'موظف تعيين الطابور',
    branchId: org.branch.id, joinDate: '2026-08-01', basicSalary: 5000, payMethod: 'cash' }), 201)
  const hired = (await events('EMPLOYEE_HIRED')).filter(row => row.entityId === String(created.id))
  assert.equal(hired.length, 1)
  assert.deepEqual(JSON.parse(hired[0].payload), { employeeId: created.id, branchId: org.branch.id, joinDate: '2026-08-01' })

  // 2) و3) اعتماد ورفض طلب بسلسلة خطوة HR
  const chain = await repo('ApprovalChain').save({ code: 'CHAIN_QO_DECISION', nameAr: 'اعتماد الطابور', isActive: true, autoApprove: false })
  await repo('ApprovalStep').save({ chainId: chain.id, stepOrder: 1, approverRole: 'hr' })
  const type = await repo('RequestType').save({ code: 'QO_DECISION', nameAr: 'طلب الطابور', category: 'personal_data', destinationHandler: 'none', approvalChainId: chain.id, isActive: true })
  const requester = await employee(4000)
  const requesterUser = await repo('User').save({ email: 'requester@queue-outbox.invalid', displayName: 'requester', passwordHash: 'test-only', role: 'employee',
    branchId: org.branch.id, employeeId: requester.id, permissions: '[]' })
  const submit = async () => expectStatus(await request(requesterUser, 'POST', '/requests', { typeCode: type.code, payload: { reason: 'حدث الطابور' }, submit: true }), 201)
  const approved = await submit(), rejected = await submit()
  expectStatus(await request(users.admin, 'POST', `/requests/${approved.id}/act`, { action: 'APPROVE', comment: 'اعتماد' }), 201)
  expectStatus(await request(users.admin, 'POST', `/requests/${rejected.id}/act`, { action: 'REJECT', comment: 'رفض للاختبار' }), 201)
  const approvedEvents = (await events('REQUEST_APPROVED')).filter(row => row.entityId === String(approved.id))
  const rejectedEvents = (await events('REQUEST_REJECTED')).filter(row => row.entityId === String(rejected.id))
  assert.deepEqual([approvedEvents.length, rejectedEvents.length], [1, 1])
  assert.deepEqual(JSON.parse(approvedEvents[0].payload), { requestId: approved.id, typeCode: 'QO_DECISION', requesterId: requester.id, branchId: org.branch.id })
  assert.equal((await events('REQUEST_REJECTED')).filter(row => row.entityId === String(approved.id)).length, 0)

  // 4) المسير اتعتمد
  const createdPolicy = expectStatus(await request(users.admin, 'POST', '/payroll/policies', { name: 'مجموعة الطابور', effectiveFrom: policyStart,
    settings: { defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 23, cycleEndMode: 'DERIVED', cycleEndDay: null } }), 201)
  const published = expectStatus(await request(users.admin, 'POST', `/payroll/policies/${createdPolicy.policy.id}/versions/${createdPolicy.versions[0].id}/publish`,
    { expectedRevision: createdPolicy.versions[0].revision, reason: 'نشر مجموعة لاختبار الطابور' }), 200)
  const worker = await employee(6000)
  let run = expectStatus(await request(users.admin, 'POST', '/payroll/runs', { name: 'مسير الطابور', policyVersionId: published.version.id, period, filters: { employeeIds: [worker.id] } }), 201)
  run = expectStatus(await request(users.admin, 'POST', `/payroll/runs/${run.id}/calculate`, {}), 201)
  const report = expectStatus(await request(users.admin2, 'GET', `/payroll/runs/${run.id}/unassigned`), 200)
  expectStatus(await request(users.admin2, 'POST', `/payroll/runs/${run.id}/unassigned-ack`, { reportHash: report.reportHash }), 201)
  assert.equal((await events('PAYROLL_RUN_APPROVED')).filter(row => row.entityId === String(run.id)).length, 0, 'قبل الاعتماد مفيش حدث')
  expectStatus(await request(users.admin2, 'POST', `/payroll/runs/${run.id}/approve`), 201)
  const runEvents = (await events('PAYROLL_RUN_APPROVED')).filter(row => row.entityId === String(run.id))
  assert.equal(runEvents.length, 1)
  assert.equal(JSON.parse(runEvents[0].payload).period, period)

  // 5) مستند هينتهي: مرة لكل مستند وتاريخ انتهاء، واللي بعد المدة أو موظفه مش نشط مالوش حدث
  const today = new Date().toLocaleDateString('en-CA')
  const plus = days => new Date(Date.parse(`${today}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10)
  const soon = await repo('EmployeeDocument').save({ employeeId: requester.id, docType: 'إقامة', expiryDate: plus(10) })
  await repo('EmployeeDocument').save({ employeeId: requester.id, docType: 'رخصة', expiryDate: plus(45) })
  const archived = await employee(3000, { isActive: false, status: 'terminated' })
  await repo('EmployeeDocument').save({ employeeId: archived.id, docType: 'إقامة', expiryDate: plus(5) })
  assert.equal(await queue.recordDocumentExpiryEvents(today), 1)
  assert.equal(await queue.recordDocumentExpiryEvents(today), 0, 'التشغيل التاني مابيكررش')
  const expiring = await events('DOCUMENT_EXPIRING')
  const mine = expiring.filter(row => row.entityId === String(soon.id))
  assert.deepEqual([mine.length, mine[0].eventKey], [1, `document-expiring:${soon.id}:${plus(10)}`])
  // التجديد بتاريخ جديد = حدث جديد
  await repo('EmployeeDocument').update(soon.id, { expiryDate: plus(20) })
  assert.equal(await queue.recordDocumentExpiryEvents(today), 1)

  // 6) الموظف انتهت خدمته: ملف تصفية معتمد آخر يوم عمل فيه عدّى
  const leaver = await employee(3500)
  const kase = await repo('OffboardingCase').save({ employeeId: leaver.id, lastWorkingDay: plus(-3), status: 'SETTLED', settlementDocRef: 'SET-QO-1' })
  const offboarding = app.get(require('../src/offboarding/offboarding.service').OffboardingService)
  assert.equal((await offboarding.finalizeDueFor()).finalized >= 1, true)
  const terminated = (await events('EMPLOYEE_TERMINATED')).filter(row => row.entityId === String(leaver.id))
  assert.deepEqual([terminated.length, terminated[0].eventKey], [1, `employee-terminated:${kase.id}`])
  assert.equal((await repo('Employee').findOneByOrFail({ id: leaver.id })).status, 'terminated')
  // الحمولة مراجع بس: من غير أسماء ولا مبالغ
  const all = await query('SELECT [payload] FROM [outbox_events]')
  for (const row of all) assert.equal(/موظف|راتب|salary|fullName|netPay/i.test(row.payload ?? ''), false, row.payload)
})

test('QO-06: شاشة الطابور لحساب الشركة بس، و/health بالعدد بس', async () => {
  const overview = expectStatus(await request(users.admin, 'GET', '/queue'), 200)
  assert.equal(overview.available, true)
  assert.deepEqual(Object.keys(overview.jobs).sort(), ['DEAD', 'DONE', 'PENDING', 'RUNNING'])
  expectStatus(await request(users.branchSettings, 'GET', '/queue'), 403)
  const health = await fetch(`${base}/health`).then(response => response.json())
  assert.deepEqual(Object.keys(health.queue).sort(), ['dead', 'pending', 'status'])
  assert.equal(JSON.stringify(health.queue).includes('test.'), false, 'من غير أنواع المهام')
})
