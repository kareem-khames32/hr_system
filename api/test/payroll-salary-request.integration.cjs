'use strict'
// اختبارات SQL وHTTP الفعلية لطلب زيادة الأجر؛ كل الكتابات في قاعدة مؤقتة منفصلة.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_payroll_salary_request_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-salary-request-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const { localDateOf } = require('../src/attendance/attendance.service')
const { RequestsService } = require('../src/requests/requests.service')
const keys = ['basicSalary', 'housingAllowance', 'transportAllowance', 'phoneAllowance', 'workNatureAllowance', 'otherAllowance']
const amounts = ['6000.00', '1500.00', '500.00', '300.00', '200.00', '100.00']
const today = localDateOf(new Date())
const dayAfter = date => new Date(Date.parse(`${date}T12:00:00Z`) + 86400000).toISOString().slice(0, 10)
let app, master, ds, base, branch, otherBranch, admin, hr, executive, outsider, chain, type, created = false, employeeNumber = 0
const repo = name => ds.getRepository(name)
const decode = value => typeof value === 'string' ? JSON.parse(value) : value
function token(user) { return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null,
  employeeId: user.employeeId ?? null, tokenVersion: user.tokenVersion ?? 0, permissions: decode(user.permissions || '[]') }) }
async function request(user, method, url, body) {
  const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const content = await response.text()
  return { status: response.status, body: content ? JSON.parse(content) : null }
}
const ok = (response, status = 201) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const payload = extra => ({ newSalary: '6300.00', effectiveDate: today, reason: 'قرار زيادة راتب تجريبي موثق', ...extra })
async function employee(extra = {}) {
  return repo('Employee').save({ employeeCode: `SALREQ${String(++employeeNumber).padStart(4, '0')}`, fullName: 'موظف اختبار طلب الأجر',
    branchId: branch.id, joinDate: '2020-01-01', status: 'active', isActive: true, payMethod: 'transfer', currency: 'EGP',
    ...Object.fromEntries(keys.map((key, index) => [key, amounts[index]])), ...extra })
}
async function submit(emp, extra = {}, user = admin, typeCode = 'SALARY_INCREASE') {
  return ok(await request(user, 'POST', '/requests', { typeCode, onBehalfEmployeeId: emp.id, submit: true, payload: payload(extra) }))
}
async function act(user, req, action = 'APPROVE', comment) {
  return request(user, 'POST', `/requests/${req.id}/act`, { action, ...(comment ? { comment } : {}) })
}
async function current(emp) {
  const rows = await ds.query(`SELECT ${keys.map(key => `CAST([${key}] AS nvarchar(80)) AS [${key}]`).join(', ')}, [currency] FROM dbo.employees WHERE [id]=@0`, [emp.id])
  return rows[0]
}
async function history(emp) {
  return ds.query(`SELECT v.[revision], v.[createdBy], v.[evidenceReference], CONVERT(varchar(10), h.[effectiveFrom], 23) AS [effectiveFrom],
    CONVERT(varchar(10), h.[effectiveTo], 23) AS [effectiveTo], ${keys.map(key => `CAST(h.[${key}] AS nvarchar(80)) AS [${key}]`).join(', ')}
    FROM dbo.employee_salary_history_versions v JOIN dbo.employee_salary_history h ON h.[versionId]=v.[id] WHERE v.[employeeId]=@0 ORDER BY v.[revision],h.[sequence]`, [emp.id])
}
async function audit(emp) { return repo('EmployeeStatusHistory').find({ where: { employeeId: emp.id }, order: { id: 'ASC' } }) }
async function unchanged(emp, original) {
  assert.deepEqual(await current(emp), original)
  assert.equal((await history(emp)).length, 0); assert.equal((await audit(emp)).length, 0)
}
async function withDate(date, run) {
  const RealDate = global.Date, now = Date.parse(`${date}T12:00:00Z`)
  // تقديم الساعة داخل الاختبار فقط، دون تحديث تاريخ السريان المخزن أو تشغيل مؤقتات الخلفية.
  global.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : [now])) } static now() { return now } }
  try { return await run() } finally { global.Date = RealDate }
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, /^hr_payroll_salary_request_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME,
    password: env.DB_PASSWORD, database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => {}
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => {}
  ds = app.get(require('../node_modules/typeorm').DataSource); assert.equal(ds.options.database, database)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  branch = await repo('Branch').save({ name: 'فرع اختبار الأجر', code: 'SALARY_REQUEST' })
  otherBranch = await repo('Branch').save({ name: 'فرع آخر للاختبار', code: 'SALARY_OTHER' })
  const user = (name, role, permissions, branchId = branch.id) => repo('User').save({ email: `${name}@salary-request.invalid`, passwordHash: 'test-only', displayName: name, role, permissions: JSON.stringify(permissions), branchId })
  admin = await user('admin', 'super_admin', ['*']); hr = await user('hr', 'hr_manager', ['approve.hr', 'requests.create_on_behalf'])
  executive = await user('executive', 'employee', ['approve.executive']); outsider = await user('outsider', 'hr_manager', ['approve.hr', 'requests.create_on_behalf'], otherBranch.id)
  chain = await repo('ApprovalChain').save({ code: 'CH_SALARY_REQUEST_TEST', nameAr: 'سلسلة اختبار زيادة الأجر', requestTypeCode: 'SALARY_INCREASE' })
  await repo('ApprovalStep').save([{ chainId: chain.id, stepOrder: 1, approverRole: 'hr' },
    { chainId: chain.id, stepOrder: 2, approverRole: 'executive', thresholdField: 'increase_pct', thresholdOp: '>=', thresholdValue: 10 }])
  type = await repo('RequestType').save({ code: 'SALARY_INCREASE', nameAr: 'زيادة راتب', category: 'financial', destinationHandler: 'salary_update_history',
    approvalChainId: chain.id, requiredFields: '["newSalary","increase_pct"]', customFields: '[{"key":"newSalary","type":"number","label":"الراتب الجديد","required":true},{"key":"increase_pct","type":"number","label":"نسبة قديمة","required":true}]' })
}, { timeout: 90000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_payroll_salary_request_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name=@database')).recordset.length, 0)
      t.diagnostic(`تم التحقق من حذف قاعدة الاختبار: ${database}`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir())); assert.match(path.basename(uploads), /^hr-payroll-salary-request-files-/)
    fs.rmSync(uploads, { recursive: true, force: true }); assert.equal(fs.existsSync(uploads), false)
    t.diagnostic('تم التحقق من حذف مجلد مرفقات الاختبار المؤقت.')
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'تعذر إكمال تنظيف اختبار طلب الأجر')
})

test('HTTP catalog upgrades salary fields without changing the stored request catalog', async () => {
  const stored = await repo('RequestType').findOneByOrFail({ id: type.id })
  const catalog = ok(await request(admin, 'GET', '/requests/types'), 200)
  const item = catalog.find(row => row.code === 'SALARY_INCREASE')
  assert.deepEqual(decode(item.requiredFields), ['newSalary', 'effectiveDate', 'reason'])
  const fields = decode(item.customFields); assert.equal(fields.find(row => row.key === 'newSalary').type, 'text')
  assert.equal(fields.some(row => row.key === 'increase_pct'), false)
  assert.deepEqual(await repo('RequestType').findOneByOrFail({ id: type.id }), stored)
})

test('HTTP salary payload rejects missing dates, numeric money and forged server metadata before creating a draft', async () => {
  const emp = await employee(), before = await repo('Request').count(), original = await current(emp)
  for (const patch of [{ effectiveDate: '' }, { effectiveDate: '2026-02-30' }, { newSalary: 6300 }, { reason: '' }, { salaryChangeBasis: null }, { salaryChangeApproval: { actorUserId: admin.id } }]) {
    const response = await request(admin, 'POST', '/requests', { typeCode: 'SALARY_INCREASE', onBehalfEmployeeId: emp.id, submit: true, payload: payload(patch) })
    assert.equal(response.status, 400, JSON.stringify(response.body))
  }
  assert.equal(await repo('Request').count(), before); await unchanged(emp, original)
})

test('HTTP final approval writes one dated salary revision with six exact amounts and actual HR actor', async () => {
  const emp = await employee(), original = await current(emp), req = await submit(emp)
  assert.equal(req.status, 'UNDER_REVIEW'); assert.equal(decode(req.payload).increase_pct, '5.000000')
  const basis = decode(req.payload).salaryChangeBasis; assert.deepEqual(basis.salary, original); assert.equal(basis.stagedByUserId, admin.id)
  await unchanged(emp, original)
  const result = ok(await act(hr, req)); assert.equal(result.status, 'COMPLETED')
  assert.deepEqual(await current(emp), { ...original, basicSalary: '6300.00' })
  const rows = await history(emp); assert.equal(rows.length, 1); assert.equal(rows[0].effectiveFrom, today); assert.equal(rows[0].effectiveTo, null)
  assert.equal(rows[0].createdBy, hr.id); assert.equal(rows[0].evidenceReference, `request:${req.id}`)
  for (const key of keys.slice(1)) assert.equal(rows[0][key], original[key])
  const changes = await audit(emp); assert.equal(changes.length, 1); assert.equal(changes[0].changedByUserId, hr.id); assert.equal(changes[0].requestId, req.id)
  assert.equal(changes[0].oldValue, '6000.00'); assert.equal(changes[0].newValue, '6300.00')
  assert.equal((await request(admin, 'POST', `/requests/${req.id}/retry-execution`, {})).status, 400)
  assert.equal((await history(emp)).length, 1); assert.equal((await audit(emp)).length, 1)
})

test('server-derived ten percent retains executive approval despite forged caller percentage and scope cannot bypass it', async () => {
  const emp = await employee(), original = await current(emp), req = await submit(emp, { newSalary: '6600.00', increase_pct: '-10000' })
  assert.deepEqual(decode(req.resolvedSteps).map(row => row.role), ['hr', 'executive']); assert.equal(decode(req.payload).increase_pct, '10.000000')
  assert.equal((await act(outsider, req)).status, 403)
  const first = ok(await act(hr, req)); assert.equal(first.status, 'UNDER_REVIEW'); assert.equal(first.currentStep, 2)
  assert.equal((await act(hr, req)).status, 403); await unchanged(emp, original)
  const final = ok(await act(executive, req)); assert.equal(final.status, 'COMPLETED')
  assert.equal((await history(emp))[0].createdBy, executive.id); assert.equal((await audit(emp))[0].changedByUserId, executive.id)
})

test('future approved request leaves salary and history unchanged until scheduled effective date, then runs once', async () => {
  const emp = await employee(), original = await current(emp), effectiveDate = dayAfter(today), req = await submit(emp, { effectiveDate })
  const approved = ok(await act(hr, req)); assert.equal(approved.status, 'IN_EXECUTION'); assert.equal(decode(approved.payload).salaryChangeApproval.actorUserId, hr.id)
  await unchanged(emp, original)
  ok(await request(admin, 'POST', '/requests/engine/run-scheduled-transfers', {})); await unchanged(emp, original)
  await withDate(effectiveDate, async () => {
    const first = ok(await request(admin, 'POST', '/requests/engine/run-scheduled-transfers', {})); assert.equal(first.employmentExecuted, 1)
    const again = ok(await request(admin, 'POST', '/requests/engine/run-scheduled-transfers', {})); assert.equal(again.employmentExecuted, 0)
  })
  const stored = await repo('Request').findOneByOrFail({ id: req.id }); assert.equal(stored.status, 'COMPLETED')
  assert.deepEqual(await current(emp), { ...original, basicSalary: '6300.00' })
  const rows = await history(emp); assert.equal(rows.length, 1); assert.equal(rows[0].effectiveFrom, effectiveDate); assert.equal(rows[0].createdBy, hr.id)
  assert.equal((await audit(emp)).length, 1)
})

test('salary source drift rolls back final approval and returning/resubmitting rebuilds the source basis', async () => {
  const emp = await employee(), req = await submit(emp)
  await ds.query('UPDATE dbo.employees SET [phoneAllowance]=CAST(@1 AS decimal(18,2)) WHERE [id]=@0', [emp.id, '333.33'])
  const original = await current(emp), failed = await act(hr, req)
  assert.equal(failed.status, 409, JSON.stringify(failed.body)); assert.equal(failed.body.code, 'SALARY_REQUEST_SOURCE_CHANGED')
  assert.equal((await repo('Request').findOneByOrFail({ id: req.id })).status, 'UNDER_REVIEW'); assert.equal(await repo('RequestApproval').count({ where: { requestId: req.id } }), 0)
  await unchanged(emp, original)
  ok(await act(hr, req, 'RETURN', 'إعادة إثبات المكونات الحالية'))
  const resubmitted = ok(await request(admin, 'POST', `/requests/${req.id}/resubmit`, { payload: payload({ reason: 'مراجعة المكونات الحالية' }) }))
  assert.equal(decode(resubmitted.payload).salaryChangeBasis.salary.phoneAllowance, '333.33')
  ok(await act(hr, req)); assert.equal((await current(emp)).phoneAllowance, '333.33'); assert.equal((await history(emp))[0].phoneAllowance, '333.33')
})

test('employee branch drift and cross-branch submission cannot change financial data', async () => {
  const emp = await employee(), original = await current(emp)
  const foreign = await request(outsider, 'POST', '/requests', { typeCode: 'SALARY_INCREASE', onBehalfEmployeeId: emp.id, submit: true, payload: payload() })
  assert.equal(foreign.status, 403)
  const req = await submit(emp); await ds.query('UPDATE dbo.employees SET [branchId]=@1 WHERE [id]=@0', [emp.id, otherBranch.id])
  assert.equal((await act(hr, req)).status, 403); await unchanged(emp, original)
  assert.equal(await repo('RequestApproval').count({ where: { requestId: req.id } }), 0)
})

test('legacy undated request cannot be approved implicitly and can be returned for explicit dated resubmission', async () => {
  const emp = await employee(), original = await current(emp)
  const req = await repo('Request').save({ typeCode: 'SALARY_INCREASE', requesterId: emp.id, branchId: branch.id, createdByUserId: admin.id,
    status: 'UNDER_REVIEW', currentStep: 1, submittedAt: new Date(), payload: JSON.stringify({ newSalary: 6300, increase_pct: 5 }),
    resolvedSteps: JSON.stringify([{ stepOrder: 1, role: 'hr', approverEmployeeId: null, action: null, actedAt: null, dueAt: null, slaDays: null, escalateTo: null }]) })
  const failed = await act(hr, req); assert.equal(failed.status, 409, JSON.stringify(failed.body)); assert.equal(failed.body.code, 'SALARY_REQUEST_EFFECTIVE_DATE_REQUIRED')
  await unchanged(emp, original); assert.equal(await repo('RequestApproval').count({ where: { requestId: req.id } }), 0)
  ok(await act(hr, req, 'RETURN', 'مطلوب تاريخ سريان وسبب واضح'))
  const resubmitted = ok(await request(admin, 'POST', `/requests/${req.id}/resubmit`, { payload: payload() }))
  assert.equal(decode(resubmitted.payload).effectiveDate, today); assert.equal(decode(resubmitted.payload).salaryChangeBasis.historyRevision, 0)
  ok(await act(hr, req)); assert.equal((await history(emp))[0].effectiveFrom, today)
})

test('resubmission with owner-configured auto approval records the current actor rather than an older approval', async () => {
  const autoChain = await repo('ApprovalChain').save({ code: 'CH_SALARY_AUTO_TEST', nameAr: 'سلسلة اختبار إعادة التقديم', requestTypeCode: 'SALARY_TEST_AUTO' })
  await repo('ApprovalStep').save([{ chainId: autoChain.id, stepOrder: 1, approverRole: 'hr' }, { chainId: autoChain.id, stepOrder: 2, approverRole: 'executive' }])
  await repo('RequestType').save({ code: 'SALARY_TEST_AUTO', nameAr: 'زيادة مخصصة للاختبار', category: 'financial', destinationHandler: 'salary_update_history', approvalChainId: autoChain.id })
  const emp = await employee(), original = await current(emp), effectiveDate = dayAfter(today), req = await submit(emp, { effectiveDate }, admin, 'SALARY_TEST_AUTO')
  ok(await act(hr, req)); ok(await act(executive, req, 'RETURN', 'مراجعة قيم الطلب قبل إعادة التقديم'))
  await repo('ApprovalStep').delete({ chainId: autoChain.id }); await repo('ApprovalChain').update(autoChain.id, { autoApprove: true })
  const returned = ok(await request(admin, 'POST', `/requests/${req.id}/resubmit`, { payload: payload({ effectiveDate, reason: 'زيادة أعيدت للمراجعة' }) }))
  assert.equal(returned.status, 'IN_EXECUTION'); assert.equal(decode(returned.payload).salaryChangeApproval.actorUserId, admin.id)
  await unchanged(emp, original)
  await withDate(effectiveDate, async () => { ok(await request(admin, 'POST', '/requests/engine/run-scheduled-transfers', {})) })
  assert.equal((await repo('Request').findOneByOrFail({ id: req.id })).status, 'COMPLETED')
  assert.equal((await history(emp))[0].createdBy, admin.id); assert.equal((await audit(emp))[0].changedByUserId, admin.id)
})

test('concurrent final approval and retry leave one salary revision and one financial audit', async () => {
  const emp = await employee(), req = await submit(emp)
  const results = await Promise.all([act(hr, req), act(hr, req)])
  assert.equal(results.filter(row => row.status === 201).length, 1); assert.ok(results.some(row => [400, 409].includes(row.status)), JSON.stringify(results))
  const replays = await Promise.all([request(admin, 'POST', `/requests/${req.id}/retry-execution`, {}), request(admin, 'POST', `/requests/${req.id}/retry-execution`, {})])
  assert.ok(replays.every(row => row.status === 400))
  assert.equal((await history(emp)).length, 1); assert.equal((await audit(emp)).length, 1)
  assert.equal(await repo('RequestApproval').count({ where: { requestId: req.id, action: 'APPROVED' } }), 1)
})

test('request execution preserves cents above safe integer range in current salary, history and audit', async () => {
  const emp = await employee(); await ds.query('UPDATE dbo.employees SET [basicSalary]=CAST(@1 AS decimal(18,2)) WHERE [id]=@0', [emp.id, '9999999999999999.98'])
  const req = await submit(emp, { newSalary: '9999999999999999.99', increase_pct: '100' })
  assert.equal(decode(req.payload).increase_pct, '0.000000'); assert.deepEqual(decode(req.resolvedSteps).map(row => row.role), ['hr'])
  ok(await act(hr, req)); assert.equal((await current(emp)).basicSalary, '9999999999999999.99')
  assert.equal((await history(emp))[0].basicSalary, '9999999999999999.99'); assert.equal((await audit(emp))[0].oldValue, '9999999999999999.98')
})

test('authorized rejection recovers a stale future salary request without reversing money or allowing scheduled execution', async () => {
  const emp = await employee(), effectiveDate = dayAfter(today), req = await submit(emp, { effectiveDate })
  ok(await act(hr, req))
  await ds.query('UPDATE dbo.employees SET [phoneAllowance]=CAST(@1 AS decimal(18,2)) WHERE [id]=@0', [emp.id, '355.55'])
  const original = await current(emp), route = `/requests/${req.id}/reject-execution`
  assert.equal((await request(hr, 'POST', route, { comment: 'سبب إداري واضح' })).status, 403)
  const scopedOutsider = await repo('User').save({ ...outsider, permissions: '["settings.manage"]' })
  assert.equal((await request(scopedOutsider, 'POST', route, { comment: 'سبب إداري واضح' })).status, 403)
  assert.equal((await request(admin, 'POST', route, { comment: ' ' })).status, 400)
  const result = ok(await request(admin, 'POST', route, { comment: 'تغير المصدر؛ سيقدم قرار زيادة جديد للمراجعة' }))
  assert.equal(result.status, 'REJECTED'); await unchanged(emp, original)
  const decisions = await repo('RequestApproval').find({ where: { requestId: req.id }, order: { id: 'ASC' } })
  assert.equal(decisions.at(-1).action, 'REJECTED'); assert.equal(decisions.at(-1).approverId, admin.id); assert.match(decisions.at(-1).comment, /تغير المصدر/)
  await withDate(effectiveDate, async () => { const result = ok(await request(admin, 'POST', '/requests/engine/run-scheduled-transfers', {})); assert.equal(result.employmentExecuted, 0) })
  await unchanged(emp, original)
  const replacement = await submit(emp, { reason: 'قرار جديد بعد إغلاق الطلب السابق' }); ok(await act(hr, replacement))
  assert.equal((await current(emp)).phoneAllowance, '355.55')
  assert.equal((await request(admin, 'POST', `/requests/${replacement.id}/reject-execution`, { comment: 'لا يجوز عكس أجر منفذ' })).status, 400)
})

test('rejection guard refuses a scheduled-status salary request with any existing financial reference', async () => {
  const emp = await employee(), req = await submit(emp); ok(await act(hr, req))
  const original = await current(emp), before = await history(emp)
  // محاكاة حالة مخزنة متعارضة في قاعدة الاختبار لإثبات عدم عكس قرار كُتب فعليًا.
  await repo('Request').update(req.id, { status: 'IN_EXECUTION' })
  const response = await request(admin, 'POST', `/requests/${req.id}/reject-execution`, { comment: 'محاولة إلغاء حالة متعارضة' })
  assert.equal(response.status, 409, JSON.stringify(response.body)); assert.equal(response.body.code, 'SALARY_REQUEST_ALREADY_APPLIED')
  assert.deepEqual(await current(emp), original); assert.deepEqual(await history(emp), before)
  assert.equal(await repo('RequestApproval').count({ where: { requestId: req.id, action: 'REJECTED' } }), 0)
  await repo('Request').update(req.id, { status: 'COMPLETED' })
})

test('rejection guard also refuses legacy APPROVED salary status when its financial change already exists', async () => {
  const emp = await employee(), req = await submit(emp); ok(await act(hr, req))
  const original = await current(emp), before = await history(emp), changes = await audit(emp)
  await repo('Request').update(req.id, { status: 'APPROVED' })
  const response = await request(admin, 'POST', `/requests/${req.id}/reject-execution`, { comment: 'محاولة إلغاء حالة اعتماد قديمة متعارضة' })
  assert.equal(response.status, 409, JSON.stringify(response.body)); assert.equal(response.body.code, 'SALARY_REQUEST_ALREADY_APPLIED')
  assert.deepEqual(await current(emp), original); assert.deepEqual(await history(emp), before); assert.deepEqual(await audit(emp), changes)
  assert.equal((await repo('Request').findOneByOrFail({ id: req.id })).status, 'APPROVED')
  assert.equal(await repo('RequestApproval').count({ where: { requestId: req.id, action: 'REJECTED' } }), 0)
  await repo('Request').update(req.id, { status: 'COMPLETED' })
})

test('administrative rejection cannot use request ownership or wildcard permissions to cross the request branch', async () => {
  const emp = await employee(), req = await submit(emp, { effectiveDate: dayAfter(today) }); ok(await act(hr, req))
  const original = await current(emp), before = await repo('RequestApproval').find({ where: { requestId: req.id }, order: { id: 'ASC' } })
  await ds.query('UPDATE dbo.employees SET [branchId]=@1 WHERE [id]=@0', [emp.id, otherBranch.id])
  const owner = await repo('User').save({ email: 'owner-cross-branch@salary-request.invalid', passwordHash: 'test-only', displayName: 'صاحب طلب منقول',
    role: 'employee', employeeId: emp.id, branchId: otherBranch.id, permissions: '["settings.manage"]' })
  for (const permissions of ['["settings.manage"]', '["*"]']) {
    const actor = await repo('User').save({ ...owner, permissions })
    const response = await request(actor, 'POST', `/requests/${req.id}/reject-execution`, { comment: 'صاحب الطلب لا يتجاوز نطاق الإدارة' })
    assert.equal(response.status, 403, JSON.stringify(response.body))
  }
  await unchanged(emp, original)
  assert.equal((await repo('Request').findOneByOrFail({ id: req.id })).status, 'IN_EXECUTION')
  assert.deepEqual(await repo('RequestApproval').find({ where: { requestId: req.id }, order: { id: 'ASC' } }), before)
  // المالك العام يملك نطاقًا عالميًا صريحًا ويمكنه إغلاق القرار غير المنفذ.
  assert.equal(ok(await request(admin, 'POST', `/requests/${req.id}/reject-execution`, { comment: 'إغلاق إداري من النطاق العام' })).status, 'REJECTED')
})

test('salary requests do not create payroll, attendance, overtime, loans or offboarding effects', async () => {
  for (const name of ['PayrollRun', 'PayrollItem', 'PayrollRunMember', 'AttendanceDay', 'OvertimeEntry', 'Loan', 'OffboardingCase']) assert.equal(await repo(name).count(), 0, name)
})
