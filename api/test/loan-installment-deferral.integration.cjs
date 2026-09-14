// الطلب الحقيقي عبر AppModule وJWT وSQL في قاعدة عشوائية فقط؛ لا مصدر ولا نسخة مراجعة.
const { test, before, after, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_loan_deferral_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-loan-deferral-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const { seedLoanInstallmentDeferralOnly } = require('../src/seed/seed-requests')
let app, master, ds, base, created = false, sequence = 0, loanType, deferralType, globalChain, canary, canaryEmployeeId, canaryLoanId
function guarded() { assert.match(database, /^hr_loan_deferral_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE); if (ds) assert.equal(ds.options.database, database) }
const repo = name => { guarded(); return ds.getRepository(name) }
const raw = async (text, values = []) => { guarded(); return ds.query(text, values) }
function month(offset = 0) { const now = new Date(), value = new Date(now.getFullYear(), now.getMonth() + offset, 1, 12); return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}` }
function token(user) { return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null, tokenVersion: user.tokenVersion ?? 0, permissions: JSON.parse(user.permissions || '[]') }) }
async function http(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text(); return { status: response.status, body: text ? JSON.parse(text) : null }
}
function expect(result, status) { assert.equal(result.status, status, JSON.stringify(result.body)); return result.body }
const approve = (user, id, extra = {}) => http(user, 'POST', `/requests/${id}/act`, { action: 'APPROVE', comment: 'قرار فعلي من المعتمد', ...extra })
const payload = (f, extra = {}) => ({ loanId: f.loanId, installmentId: f.installmentId, toPeriod: month(1), reason: 'تأجيل اختياري للقسط', ...extra })
const submit = (f, extra = {}, actor = f.owner) => http(actor, 'POST', '/requests', { typeCode: 'LOAN_INSTALLMENT_DEFER', submit: true, payload: payload(f, extra) })
async function position(id) { return (await raw('SELECT id,loanId,CONVERT(varchar(10),dueDate,23) AS dueDate,CAST(amount AS nvarchar(80)) AS amount,paid,CAST(paidAmount AS nvarchar(80)) AS paidAmount,financialStatus,financialRevision,parentInstallmentId,CONVERT(varchar(10),originalDueDate,23) AS originalDueDate FROM loan_installments WHERE id=@0', [id]))[0] }
async function protectedSnapshot() {
  const result = {}
  result.employee = await raw('SELECT * FROM employees WHERE id=@0', [canaryEmployeeId])
  result.loan = await raw('SELECT id,employeeId,CAST(amount AS nvarchar(80)) AS amount,status FROM loans WHERE id=@0', [canaryLoanId])
  result.installments = await raw('SELECT id,CAST(amount AS nvarchar(80)) AS amount,CAST(paidAmount AS nvarchar(80)) AS paidAmount,dueDate,paid,financialStatus,financialRevision,parentInstallmentId,originalDueDate,paidAt FROM loan_installments WHERE loanId=@0 ORDER BY id', [canaryLoanId])
  result.config = await repo('RequestsConfig').find({ order: { key: 'ASC' } })
  return JSON.parse(JSON.stringify(result))
}
async function fixture(amount = '1266.00', { threshold = '1500.00', thresholdOp = '>=' } = {}) {
  const n = ++sequence
  const branch = await repo('Branch').save({ code: `LD${n}`, name: `فرع تأجيل${n}` })
  const department = await repo('Department').save({ code: `LDD${n}`, name: `قسم${n}`, branchId: branch.id })
  const person = (suffix, extra = {}) => repo('Employee').save({ employeeCode: `LD${n}${suffix}`, fullName: `موظف${n}${suffix}`, branchId: branch.id, departmentId: department.id,
    joinDate: '2020-01-01', basicSalary: 10000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0,
    status: 'active', isActive: true, payMethod: 'cash', annualLeaveEntitled: false, ...extra })
  const managerEmployee = await person('M'), employee = await person('E', { managerEmployeeId: managerEmployee.id }), financeEmployee = await person('F')
  const user = (person, suffix, permissions = []) => repo('User').save({ employeeId: person.id, branchId: branch.id, email: `ld-${n}-${suffix}@test.invalid`, displayName: person.fullName,
    role: 'employee', passwordHash: 'isolated-token-only', permissions: JSON.stringify(permissions) })
  const owner = await user(employee, 'owner'), manager = await user(managerEmployee, 'manager', ['requests.view_all']), finance = await user(financeEmployee, 'finance', ['requests.view_all', 'approve.finance'])
  const chain = await repo('ApprovalChain').save({ code: globalChain.code, branchId: branch.id, nameAr: `سلسلة سلف الفرع${n}`, requestTypeCode: 'LOAN', isActive: true, autoApprove: false })
  await repo('ApprovalStep').save({ chainId: chain.id, stepOrder: 1, approverRole: 'direct_manager_of_requester' })
  await raw('INSERT approval_steps(chainId,stepOrder,approverRole,isParallel,thresholdField,thresholdOp,thresholdValue,canDelegate) VALUES(@0,2,N\'finance\',0,N\'amount\',@2,CAST(@1 AS decimal(18,2)),1)', [chain.id, threshold, thresholdOp])
  const loanId = (await raw('INSERT loans(employeeId,amount,status) OUTPUT INSERTED.id VALUES(@0,CAST(@1 AS decimal(18,2)),N\'APPROVED\')', [employee.id, amount]))[0].id
  const installmentId = (await raw('INSERT loan_installments(loanId,dueDate,amount,paid) OUTPUT INSERTED.id VALUES(@0,@1,CAST(@2 AS decimal(18,2)),0)', [loanId, `${month()}-01`, amount]))[0].id
  return { branch, employee, owner, manager, finance, chain, loanId, installmentId }
}

before(async () => {
  guarded(); assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1'); ds = app.get(require('../node_modules/typeorm').DataSource); guarded()
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  await app.get(require('../src/settings/config-defaults.service').ConfigDefaultsService).onApplicationBootstrap()
  globalChain = await repo('ApprovalChain').save({ code: 'OWNER_LIVE_LOAN', nameAr: 'سلسلة السلفة الفعلية', isActive: true, autoApprove: false, requestTypeCode: 'LOAN' })
  await repo('ApprovalStep').save({ chainId: globalChain.id, stepOrder: 1, approverRole: 'executive' })
  loanType = await repo('RequestType').save({ code: 'LOAN', nameAr: 'سلفة خاصة', category: 'financial', destinationHandler: 'loans_installments', requiredFields: '["amount","months"]', approvalChainId: globalChain.id, isActive: true })
  const beforeType = await repo('RequestType').findOneByOrFail({ id: loanType.id })
  const seeded = await seedLoanInstallmentDeferralOnly(ds); assert.equal(seeded.created, true)
  assert.deepEqual(await repo('RequestType').findOneByOrFail({ id: loanType.id }), beforeType)
  deferralType = await repo('RequestType').findOneByOrFail({ id: seeded.typeId })
  await app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp()
  await app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).catchUpIfBehind()
  const protectedBranch = await repo('Branch').save({ code: 'LDCANARY', name: 'فرع التاريخ المحفوظ' })
  const protectedEmployee = await repo('Employee').save({ employeeCode: 'LDCANARY', fullName: 'تاريخ مستقل', branchId: protectedBranch.id,
    joinDate: '2020-01-01', basicSalary: 0, status: 'active', isActive: true, payMethod: 'cash', annualLeaveEntitled: false })
  canaryEmployeeId = protectedEmployee.id
  canaryLoanId = (await raw('INSERT loans(employeeId,amount,status) OUTPUT INSERTED.id VALUES(@0,CAST(N\'9999999999999999.99\' AS decimal(18,2)),N\'SETTLED\')', [canaryEmployeeId]))[0].id
  await raw('INSERT loan_installments(loanId,dueDate,amount,paid) VALUES(@0,N\'2020-01-01\',CAST(N\'9999999999999999.99\' AS decimal(18,2)),1)', [canaryLoanId])
  canary = await protectedSnapshot()
}, { timeout: 60000 })

afterEach(async () => { if (canary) assert.deepEqual(await protectedSnapshot(), canary) })
after(async () => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) { guarded(); await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('name', database).query('SELECT DB_ID(@name) AS id')).recordset[0].id, null); console.log(JSON.stringify({ database, removed: true })) }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try { const target = path.resolve(uploads), parent = path.resolve(os.tmpdir()); assert.equal(path.dirname(target), parent); assert.match(path.basename(target), /^hr-loan-deferral-files-/); fs.rmSync(target, { recursive: true, force: true }) } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'تعذر تنظيف موارد اختبار التأجيل')
})

test('HTTP catalog exposes the effective LOAN branch chain seeded without changing its owner configuration', async () => {
  const f = await fixture(), listed = expect(await http(f.owner, 'GET', '/requests/types'), 200)
  const type = listed.find(row => row.code === 'LOAN_INSTALLMENT_DEFER')
  assert.equal(type.approvalChainId, globalChain.id); assert.equal(type.approvalChainName, f.chain.nameAr)
  assert.equal(type.destinationSupported, true); assert.deepEqual(JSON.parse(type.requiredFields), ['loanId', 'installmentId', 'toPeriod', 'reason'])
  assert.equal((await seedLoanInstallmentDeferralOnly(ds)).created, false)
})

test('HTTP create draft then submit freezes source amount and follows one actual branch approver below threshold', async () => {
  const f = await fixture()
  const draft = expect(await http(f.owner, 'POST', '/requests', { typeCode: 'LOAN_INSTALLMENT_DEFER', payload: payload(f), submit: false }), 201)
  assert.equal(draft.status, 'DRAFT'); assert.equal(JSON.parse(draft.payload).amount, undefined)
  const submitted = expect(await http(f.owner, 'POST', `/requests/${draft.id}/submit`), 201)
  assert.equal(submitted.status, 'UNDER_REVIEW')
  const staged = JSON.parse(submitted.payload); assert.equal(staged.amount, '1266.00'); assert.equal(staged.deferralEvidence.sourceRevision, 1)
  assert.deepEqual(JSON.parse(submitted.resolvedSteps).map(row => row.role), ['direct_manager_of_requester'])
  const done = expect(await approve(f.manager, draft.id), 201); assert.equal(done.status, 'COMPLETED')
  assert.equal((await position(f.installmentId)).financialStatus, 'DEFERRED')
  const child = await repo('LoanInstallment').findOneByOrFail({ parentInstallmentId: f.installmentId })
  assert.equal(child.dueDate, `${month(1)}-01`); assert.equal((await position(child.id)).amount, '1266.00')
  const event = await repo('LoanInstallmentEvent').findOneByOrFail({ requestId: draft.id }); assert.equal(event.actorId, f.manager.id)
  assert.equal(event.action, 'DEFERRED'); assert.equal(JSON.parse(event.payload).before.remainingAmount, '1266.00')
})

test('HTTP amount threshold adds Finance and cannot execute after only the manager approves', async () => {
  const f = await fixture('2000.00'), pending = expect(await submit(f), 201)
  assert.deepEqual(JSON.parse(pending.resolvedSteps).map(row => row.role), ['direct_manager_of_requester', 'finance'])
  const reviewed = expect(await approve(f.manager, pending.id), 201); assert.equal(reviewed.status, 'UNDER_REVIEW')
  assert.equal((await position(f.installmentId)).financialStatus, null)
  expect(await approve(f.owner, pending.id), 403)
  assert.equal(expect(await approve(f.finance, pending.id), 201).status, 'COMPLETED')
})

test('HTTP a one-cent difference at DEC18,2 maximum still includes the conditional financial approver', async () => {
  const f = await fixture('9999999999999999.99', { threshold: '9999999999999999.98', thresholdOp: '>' })
  const pending = expect(await submit(f), 201)
  assert.equal(JSON.parse(pending.payload).amount, '9999999999999999.99')
  assert.deepEqual(JSON.parse(pending.resolvedSteps).map(row => row.role), ['direct_manager_of_requester', 'finance'])
  expect(await approve(f.manager, pending.id), 201); expect(await approve(f.finance, pending.id), 201)
  const child = await repo('LoanInstallment').findOneByOrFail({ parentInstallmentId: f.installmentId })
  assert.equal((await position(child.id)).amount, '9999999999999999.99')
})

test('HTTP rejects forged client evidence and money on create without retaining a draft', async () => {
  const f = await fixture(), count = await repo('Request').count({ where: { requesterId: f.employee.id } })
  for (const extra of [{ amount: '1.00' }, { deferralEvidence: { amount: '1.00' } }, { sourceRevision: 1 }, { approvedBy: f.manager.id }, { employeeId: f.employee.id }, { status: 'APPROVED' }]) expect(await submit(f, extra), 400)
  assert.equal(await repo('Request').count({ where: { requesterId: f.employee.id } }), count)
  assert.equal((await position(f.installmentId)).financialStatus, null)
})

test('HTTP ownership, employee-on-behalf privilege and cross-branch approval are enforced', async () => {
  const own = await fixture('2000.00'), other = await fixture()
  expect(await submit(own, {}, other.owner), 400)
  expect(await http(other.owner, 'POST', '/requests', { typeCode: 'LOAN_INSTALLMENT_DEFER', submit: true, onBehalfEmployeeId: own.employee.id, payload: payload(own) }), 403)
  const pending = expect(await submit(own), 201)
  expect(await approve(other.manager, pending.id), 403); expect(await approve(own.owner, pending.id), 403)
  expect(await approve(own.manager, pending.id), 201); expect(await approve(other.finance, pending.id), 403)
  expect(await approve(own.finance, pending.id), 201)
  expect(await http(null, 'POST', '/requests', { typeCode: 'LOAN_INSTALLMENT_DEFER', payload: payload(other) }), 401)
})

test('HTTP RETURN then resubmit rebuilds source evidence and approval conditions while refusing forged evidence patches', async () => {
  const f = await fixture(), pending = expect(await submit(f), 201)
  assert.equal(expect(await approve(f.manager, pending.id, { action: 'RETURN', comment: 'يرجى تغيير شهر التأجيل' }), 201).status, 'RETURNED_FOR_INFO')
  expect(await http(f.owner, 'POST', `/requests/${pending.id}/resubmit`, { payload: { amount: '1.00' } }), 400)
  assert.equal((await repo('Request').findOneByOrFail({ id: pending.id })).status, 'RETURNED_FOR_INFO')
  await raw('UPDATE loan_installments SET amount=CAST(N\'2000.00\' AS decimal(18,2)),financialRevision=2 WHERE id=@0', [f.installmentId])
  const resubmitted = expect(await http(f.owner, 'POST', `/requests/${pending.id}/resubmit`, { payload: { toPeriod: month(2), reason: 'التأجيل بعد إعادة المراجعة' } }), 201)
  assert.equal(JSON.parse(resubmitted.payload).deferralEvidence.sourceRevision, 2); assert.equal(JSON.parse(resubmitted.payload).amount, '2000.00')
  assert.deepEqual(JSON.parse(resubmitted.resolvedSteps).map(row => row.role), ['direct_manager_of_requester', 'finance'])
  expect(await approve(f.manager, pending.id), 201); expect(await approve(f.finance, pending.id), 201)
  assert.equal((await repo('LoanInstallment').findOneByOrFail({ parentInstallmentId: f.installmentId })).dueDate, `${month(2)}-01`)
})

test('HTTP changing amount without revision after submission is rejected atomically at final approval', async () => {
  const f = await fixture(), pending = expect(await submit(f), 201)
  await raw('UPDATE loan_installments SET amount=CAST(N\'1400.00\' AS decimal(18,2)) WHERE id=@0', [f.installmentId])
  expect(await approve(f.manager, pending.id), 409)
  const request = await repo('Request').findOneByOrFail({ id: pending.id }); assert.equal(request.status, 'UNDER_REVIEW')
  assert.equal(await repo('RequestApproval').count({ where: { requestId: pending.id, action: 'APPROVED' } }), 0)
  assert.equal(await repo('LoanInstallmentEvent').count({ where: { requestId: pending.id } }), 0)
  assert.equal(await repo('LoanInstallment').count({ where: { parentInstallmentId: f.installmentId } }), 0)
})

test('HTTP two independent approvals cannot defer the same installment twice', async () => {
  const f = await fixture(), first = expect(await submit(f), 201), second = expect(await submit(f, { reason: 'طلب آخر على نفس القسط' }), 201)
  const results = await Promise.all([approve(f.manager, first.id), approve(f.manager, second.id)])
  assert.equal(results.filter(row => row.status === 201).length, 1, JSON.stringify(results))
  assert.equal(results.filter(row => row.status === 400 || row.status === 409).length, 1)
  assert.equal(await repo('LoanInstallment').count({ where: { parentInstallmentId: f.installmentId } }), 1)
  assert.equal(await repo('LoanInstallmentEvent').count({ where: { installmentId: f.installmentId, action: 'DEFERRED' } }), 1)
})

test('HTTP explicit new loans conserve cents and reject sub-unit installments and excess schedule length before approval', async () => {
  const f = await fixture()
  const createLoan = (amount, months) => http(f.owner, 'POST', '/requests', { typeCode: 'LOAN', submit: true, payload: { amount, months } })
  for (const values of [['1.99', 2], ['10000.00', 1001], ['2.001', 1]]) expect(await createLoan(...values), 400)
  const pending = expect(await createLoan('1000.00', 7), 201); assert.equal(JSON.parse(pending.payload).amount, '1000.00')
  expect(await approve(f.manager, pending.id), 201)
  const loan = await repo('Loan').findOneByOrFail({ requestId: pending.id })
  const amounts = await raw('SELECT CAST(amount AS nvarchar(80)) AS amount FROM loan_installments WHERE loanId=@0 ORDER BY id', [loan.id])
  assert.deepEqual(amounts.map(row => row.amount), ['142.85', '142.85', '142.85', '142.85', '142.85', '142.85', '142.90'])
})

test('HTTP custom early-settlement handler uses real approval and closes only the requesting employee loan', async () => {
  const f = await fixture(), type = await repo('RequestType').save({ code: `CUSTOM_EARLY_${sequence}`, nameAr: 'سداد مبكر مخصص', category: 'financial', destinationHandler: 'loan_early_settlement',
    requiredFields: '["loanId"]', approvalChainId: globalChain.id, isActive: true })
  const draft = expect(await http(f.owner, 'POST', '/requests', { typeCode: type.code, submit: true, payload: { loanId: f.loanId, reason: 'سداد الموظف الرصيد كاملًا' } }), 201)
  expect(await approve(f.manager, draft.id), 201)
  assert.equal((await position(f.installmentId)).financialStatus, 'SETTLED')
  assert.equal((await position(f.installmentId)).paidAmount, '1266.00')
  assert.equal((await repo('Loan').findOneByOrFail({ id: f.loanId })).status, 'SETTLED')
  const event = await repo('LoanInstallmentEvent').findOneByOrFail({ requestId: draft.id }); assert.equal(event.action, 'SETTLED_EARLY'); assert.equal(event.actorId, f.manager.id)
})

test('HTTP creation cannot push total open installments beyond the allocator limit at final approval', async () => {
  const f = await fixture()
  const pending = expect(await http(f.owner, 'POST', '/requests', { typeCode: 'LOAN', submit: true, payload: { amount: '1000.00', months: 1000 } }), 201)
  const response = await approve(f.manager, pending.id); expect(response, 400); assert.match(response.body.message, /1000/)
  assert.equal((await repo('Request').findOneByOrFail({ id: pending.id })).status, 'UNDER_REVIEW')
  assert.equal(await repo('Loan').count({ where: { requestId: pending.id } }), 0)
  assert.equal(await repo('LoanInstallment').count({ where: { loanId: f.loanId } }), 1)
})

test('HTTP deferral and custom early settlement wait for Finance before locking the Request row', async () => {
  for (const alias of [false, true]) {
    const f = await fixture()
    let submitted
    if (alias) {
      const type = await repo('RequestType').save({ code: `LOCK_EARLY_${sequence}`, nameAr: 'سداد بفحص القفل', category: 'financial', destinationHandler: 'loan_early_settlement', requiredFields: '["loanId"]', approvalChainId: globalChain.id, isActive: true })
      submitted = expect(await http(f.owner, 'POST', '/requests', { typeCode: type.code, submit: true, payload: { loanId: f.loanId } }), 201)
    } else submitted = expect(await submit(f), 201)
    const barrier = ds.createQueryRunner(), probe = ds.createQueryRunner()
    let action, committed = false
    try {
      await barrier.connect(); await barrier.startTransaction()
      const spid = (await barrier.query('SELECT @@SPID AS spid'))[0].spid
      const locked = await barrier.query("DECLARE @result int; EXEC @result=sys.sp_getapplock @Resource=@0,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=5000; SELECT @result AS result", [`hr:employee-finance:${f.employee.id}`])
      assert.ok(locked[0].result >= 0)
      action = approve(f.manager, submitted.id)
      const deadline = Date.now() + 6000
      let waiting = false
      while (Date.now() < deadline) {
        const waiters = (await master.request().input('spid', sql.Int, spid).input('database', sql.NVarChar, database)
          .query("SELECT session_id FROM sys.dm_exec_requests WHERE database_id=DB_ID(@database) AND blocking_session_id=@spid AND wait_type LIKE 'LCK%' ")).recordset
        if (waiters.length) { waiting = true; break }
        await new Promise(resolve => setTimeout(resolve, 25))
      }
      assert.equal(waiting, true, 'approval must be waiting on the actual employee Finance lock')
      await probe.connect(); await probe.startTransaction()
      const row = await probe.query('SELECT id FROM requests WITH (UPDLOCK,ROWLOCK,NOWAIT) WHERE id=@0', [submitted.id])
      assert.equal(row[0].id, submitted.id, 'approval must not hold the request row while waiting for Finance')
      await probe.rollbackTransaction()
      await barrier.commitTransaction(); committed = true
      expect(await action, 201)
    } finally {
      if (probe.isTransactionActive) await probe.rollbackTransaction()
      if (!committed && barrier.isTransactionActive) await barrier.rollbackTransaction()
      if (action) await Promise.allSettled([action])
      await probe.release(); await barrier.release()
    }
  }
})
