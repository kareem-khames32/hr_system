// C6 / الخطوة 29 — تكامل حقيقي عبر AppModule وJWT وSQL في قاعدة مؤقتة فقط:
// سقف يُرفض عند التقديم ويُعاد فحصه عند كل خطوة اعتماد، سلفة استثنائية من الموارد البشرية، سداد مبكر جزئي بمبلغ ومرجع،
// رصيد PENDING_RECOVERY بعد تصفية لا تغطي السلفة، ودفتر يراه الموظف لنفسه فقط.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_loan_completion_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-loan-completion-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const { addMonths, loanCapWindow } = require('../src/loans/loan-caps')
let app, master, ds, base, created = false
const f = {}

function guarded() { assert.match(database, /^hr_loan_completion_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE); if (ds) assert.equal(ds.options.database, database) }
const repo = name => { guarded(); return ds.getRepository(name) }
const raw = async (text, values = []) => { guarded(); return ds.query(text, values) }
const localDate = (value = new Date()) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
const shiftDays = (days) => { const value = new Date(); value.setDate(value.getDate() + days); return localDate(value) }
function token(user) { return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null, tokenVersion: user.tokenVersion ?? 0, permissions: JSON.parse(user.permissions || '[]') }) }
async function http(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text(); return { status: response.status, body: text ? JSON.parse(text) : null }
}
function expect(result, status) { assert.equal(result.status, status, JSON.stringify(result.body)); return result.body }
const act = (user, id, extra = {}) => http(user, 'POST', `/requests/${id}/act`, { action: 'APPROVE', comment: 'قرار المعتمد', ...extra })
const policyBody = extra => ({ name: 'سياسة سلف الشركة', scopeType: 'COMPANY', flatCapAmount: '1500.00', maxOutstandingBalance: '100000.00', effectiveFrom: shiftDays(-10), ...extra })
async function requestRow(id) { return (await raw('SELECT id,status,currentStep,payload FROM requests WHERE id=@0', [id]))[0] }
async function loanOf(requestId) {
  return (await raw(`SELECT id,employeeId,CONVERT(varchar(40),amount) AS amount,CONVERT(varchar(40),requestedAmount) AS requestedAmount,isExceptional,exceptionalCategory,exceptionalReason,
    firstInstallmentPeriod,installmentMonths,capSnapshot,createdByUserId FROM loans WHERE requestId=@0`, [requestId]))[0]
}
async function installmentsOf(loanId) {
  return raw(`SELECT id,CONVERT(varchar(10),dueDate,23) AS dueDate,CONVERT(varchar(40),amount) AS amount,CONVERT(varchar(40),paidAmount) AS paidAmount,financialStatus,parentInstallmentId
    FROM loan_installments WHERE loanId=@0 ORDER BY id`, [loanId])
}
async function insertLoan(employeeId, amount, count, firstPeriod) {
  const loanId = (await raw("INSERT loans(employeeId,amount,status) OUTPUT INSERTED.id VALUES(@0,CAST(@1 AS decimal(18,2)),N'APPROVED')", [employeeId, amount]))[0].id
  const per = (Number(amount) / count).toFixed(2)
  for (let i = 0; i < count; i++) {
    const due = `${addMonths(firstPeriod, i)}-01`
    await raw("INSERT loan_installments(loanId,dueDate,amount,paid,paidAmount,financialStatus,financialRevision,originalDueDate) VALUES(@0,@1,CAST(@2 AS decimal(18,2)),0,CAST('0.00' AS decimal(18,2)),N'DUE',1,@1)", [loanId, due, per])
  }
  return loanId
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

  const loanChain = await repo('ApprovalChain').save({ code: 'C6_LOAN', nameAr: 'سلسلة السلف: المدير ثم الموارد البشرية', isActive: true, autoApprove: false })
  await repo('ApprovalStep').save([{ chainId: loanChain.id, stepOrder: 1, approverRole: 'direct_manager_of_requester' }, { chainId: loanChain.id, stepOrder: 2, approverRole: 'hr' }])
  const earlyChain = await repo('ApprovalChain').save({ code: 'C6_EARLY', nameAr: 'سلسلة السداد المبكر', isActive: true, autoApprove: false })
  await repo('ApprovalStep').save({ chainId: earlyChain.id, stepOrder: 1, approverRole: 'hr' })
  await repo('RequestType').save({ code: 'LOAN', nameAr: 'سلفة', category: 'financial', destinationHandler: 'loans_installments', requiredFields: '["amount","months"]', approvalChainId: loanChain.id, isActive: true })
  await repo('RequestType').save({ code: 'EARLY_LOAN_SETTLEMENT', nameAr: 'سداد سلفة مبكر', category: 'financial', destinationHandler: 'loans_installments', requiredFields: '["loanId"]', approvalChainId: earlyChain.id, isActive: true })

  f.branch = await repo('Branch').save({ code: 'C6B', name: 'فرع السلف' })
  f.department = await repo('Department').save({ code: 'C6D', name: 'قسم السلف', branchId: f.branch.id })
  const person = (code, extra = {}) => repo('Employee').save({ employeeCode: code, fullName: `موظف ${code}`, branchId: f.branch.id, departmentId: f.department.id,
    joinDate: '2020-01-01', basicSalary: 8000, housingAllowance: 2000, transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0,
    status: 'active', isActive: true, payMethod: 'cash', annualLeaveEntitled: false, ...extra })
  const user = (employee, suffix, permissions = [], role = 'employee') => repo('User').save({ employeeId: employee?.id ?? null, branchId: f.branch.id, email: `c6-${suffix}@test.invalid`,
    displayName: suffix, role, passwordHash: 'isolated-token-only', permissions: JSON.stringify(permissions) })
  f.managerEmployee = await person('C6M'); f.employee = await person('C6E', { managerEmployeeId: f.managerEmployee.id }); f.otherEmployee = await person('C6O')
  f.hrEmployee = await person('C6H1'); f.hr2Employee = await person('C6H2'); f.writerEmployee = await person('C6W')
  f.owner = await user(f.employee, 'owner'); f.other = await user(f.otherEmployee, 'other'); f.manager = await user(f.managerEmployee, 'manager')
  f.hr = await user(f.hrEmployee, 'hr1', ['requests.view_all', 'requests.create_on_behalf', 'approve.hr', 'loans.policies', 'loans.exceptional', 'loans.repay', 'payroll.view'])
  f.hr2 = await user(f.hr2Employee, 'hr2', ['requests.view_all', 'approve.hr', 'loans.cap_override', 'payroll.view'])
  f.writer = await user(f.writerEmployee, 'writer', ['loans.write_off', 'payroll.view'])
  f.admin = await user(null, 'admin', [], 'super_admin')
})

after(async () => {
  try { if (app) await app.close() } finally {
    try { if (created) await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`) } finally {
      await master?.close(); fs.rmSync(uploads, { recursive: true, force: true })
    }
  }
})

test('AD-01..07: a loan above the cap is refused at submit, and the cap is re-evaluated at every approval step (reduce, refuse override without permission, documented override)', async () => {
  expect(await http(f.owner, 'POST', '/loans/cap-policies', policyBody()), 403)
  const v1 = expect(await http(f.hr, 'POST', '/loans/cap-policies', policyBody()), 201)
  assert.deepEqual([v1.version, v1.flatCapAmount, v1.isActive], [1, '1500.00', true])
  expect(await http(f.hr, 'POST', '/loans/cap-policies', policyBody({ flatCapAmount: '0' })), 400)

  const preview = expect(await http(f.owner, 'GET', '/loans/cap-preview?amount=2000&months=4'), 200)
  assert.deepEqual([preview.effectiveCap, preview.governing, preview.allowed], ['1500.00', 'FLAT', false])

  const before = (await raw('SELECT COUNT(*) AS n FROM requests'))[0].n
  const refused = expect(await http(f.owner, 'POST', '/requests', { typeCode: 'LOAN', submit: true, payload: { amount: '2000.00', months: 4 } }), 400)
  assert.equal(refused.code, 'LOAN_CAP_EXCEEDED'); assert.match(refused.message, /السقف المقطوع/)
  assert.equal((await raw('SELECT COUNT(*) AS n FROM requests'))[0].n, before)
  expect(await http(f.owner, 'POST', '/requests', { typeCode: 'LOAN', submit: true, payload: { amount: '900.00', months: 3, capCheck: { forged: true } } }), 400)

  const submitted = expect(await http(f.owner, 'POST', '/requests', { typeCode: 'LOAN', submit: true, payload: { amount: '1200.00', months: 4 } }), 201)
  assert.equal(submitted.status, 'UNDER_REVIEW')
  const stagedPayload = JSON.parse((await requestRow(submitted.id)).payload)
  assert.deepEqual([stagedPayload.capCheck.stage, stagedPayload.capCheck.evaluation.effectiveCap, stagedPayload.capCheck.evaluation.policy.id], ['SUBMIT', '1500.00', v1.id])

  // نسخة جديدة بسقف أدنى تسري اليوم: السابقة تُقفل بالأمس وتبقى قابلة للاستعلام
  const v2 = expect(await http(f.hr, 'POST', `/loans/cap-policies/${v1.id}/versions`, policyBody({ flatCapAmount: '800.00', effectiveFrom: localDate(), reason: 'خفض السقف بقرار الإدارة' })), 201)
  assert.deepEqual([v2.version, v2.supersedesId, v2.policyKey], [2, v1.id, v1.policyKey])
  const policies = expect(await http(f.hr, 'GET', '/loans/cap-policies'), 200)
  assert.equal(policies.find(row => row.id === v1.id).effectiveTo, shiftDays(-1))

  const review = expect(await http(f.manager, 'GET', `/loans/requests/${submitted.id}/cap-review`), 200)
  assert.deepEqual([review.policyChanged, review.current.effectiveCap, review.current.allowed, review.submitted.effectiveCap], [true, '800.00', false, '1500.00'])
  expect(await http(f.other, 'GET', `/loans/requests/${submitted.id}/cap-review`), 404)

  const blocked = expect(await act(f.manager, submitted.id), 409)
  assert.deepEqual([blocked.code, blocked.maxApprovable, blocked.policyChanged], ['LOAN_CAP_EXCEEDED_AT_APPROVAL', '800.00', true])
  assert.deepEqual(blocked.options, ['REJECT', 'REDUCE'])
  expect(await act(f.manager, submitted.id, { capOverrideReason: 'حاجة ماسة للموظف موثقة' }), 403)
  assert.equal((await requestRow(submitted.id)).currentStep, 1)
  expect(await act(f.manager, submitted.id, { approvedAmount: '900.00', comment: 'تخفيض' }), 409)
  expect(await act(f.manager, submitted.id, { approvedAmount: '800.00', comment: 'تخفيض إلى السقف الجديد' }), 201)
  const afterStep1 = await requestRow(submitted.id), step1 = JSON.parse(afterStep1.payload)
  assert.deepEqual([afterStep1.status, afterStep1.currentStep, step1.amount, step1.approvedAmount, step1.capApprovals[0].decision], ['UNDER_REVIEW', 2, '1200.00', '800.00', 'REDUCED'])

  // سقف أدنى مرة أخرى بنفس يوم السريان: النسخة 2 تُعطَّل، والخطوة الثانية تُعاد فحصها
  expect(await http(f.hr, 'POST', `/loans/cap-policies/${v2.id}/versions`, policyBody({ flatCapAmount: '500.00', effectiveFrom: localDate(), reason: 'تشديد إضافي' })), 201)
  const v2After = expect(await http(f.hr, 'GET', '/loans/cap-policies'), 200).find(row => row.id === v2.id)
  assert.deepEqual([v2After.isActive, typeof v2After.deactivationReason], [false, 'string'])
  const blocked2 = expect(await act(f.hr, submitted.id), 409)
  assert.equal(blocked2.maxApprovable, '500.00')
  expect(await act(f.hr, submitted.id, { capOverrideReason: 'قصير' }), 403)
  expect(await act(f.hr2, submitted.id, { capOverrideReason: 'قصير' }), 400)
  expect(await act(f.hr2, submitted.id, { capOverrideReason: 'التزام علاجي موثق بمستند مرفق لدى الموارد البشرية' }), 201)
  assert.equal((await requestRow(submitted.id)).status, 'COMPLETED')
  const loan = await loanOf(submitted.id)
  assert.deepEqual([loan.amount, loan.requestedAmount, loan.installmentMonths, Boolean(loan.isExceptional)], ['800.00', '1200.00', 4, false])
  const snapshot = JSON.parse(loan.capSnapshot)
  assert.deepEqual(snapshot.capApprovals.map(row => [row.step, row.decision, row.amount]), [[1, 'REDUCED', '800.00'], [2, 'OVERRIDE', '800.00']])
  assert.match(snapshot.capApprovals[1].reason, /التزام علاجي/)
  assert.deepEqual((await installmentsOf(loan.id)).map(row => row.amount), ['200.00', '200.00', '200.00', '200.00'])
  f.cappedLoanId = loan.id

  // AD-04: الطلب المكتمل يحجز عداد الشهر
  expect(await http(f.hr, 'POST', '/loans/cap-policies', policyBody({ name: 'حد عدد الطلبات', scopeType: 'EMPLOYEES', scopeIds: [f.employee.id], flatCapAmount: '500.00', maxOutstandingBalance: null, maxRequestsPerMonth: 1, priority: 1 })), 201)
  const counted = expect(await http(f.owner, 'POST', '/requests', { typeCode: 'LOAN', submit: true, payload: { amount: '100.00', months: 1 } }), 400)
  assert.equal(counted.cap.violations[0].code, 'MONTHLY_COUNT_REACHED'); assert.equal(counted.cap.usage.requests, 1)
})

test('AD-09: the HR exceptional loan records reason, category and first installment month; employees cannot create it and its creator cannot approve it', async () => {
  const period = addMonths(loanCapWindow('PAYROLL_PERIOD', localDate(), 23).period, 2)
  const payload = { amount: '5000.00', months: 5, exceptional: true, exceptionalCategory: 'MEDICAL', reason: 'علاج طارئ لأحد أفراد الأسرة', firstInstallmentPeriod: period }
  expect(await http(f.owner, 'POST', '/requests', { typeCode: 'LOAN', submit: true, payload }), 403)
  expect(await http(f.owner, 'POST', '/requests', { typeCode: 'LOAN', submit: true, payload: { amount: '100.00', months: 1, firstInstallmentPeriod: period } }), 403)
  expect(await http(f.hr, 'POST', '/requests', { typeCode: 'LOAN', submit: true, onBehalfEmployeeId: f.employee.id, payload: { ...payload, reason: 'قصير' } }), 400)
  expect(await http(f.hr, 'POST', '/requests', { typeCode: 'LOAN', submit: true, onBehalfEmployeeId: f.employee.id, payload: { ...payload, exceptionalCategory: 'X' } }), 400)
  expect(await http(f.hr, 'POST', '/requests', { typeCode: 'LOAN', submit: true, onBehalfEmployeeId: f.employee.id, payload: { ...payload, firstInstallmentPeriod: '2001-01' } }), 400)

  const created = expect(await http(f.hr, 'POST', '/requests', { typeCode: 'LOAN', submit: true, onBehalfEmployeeId: f.employee.id, payload }), 201)
  const staged = JSON.parse((await requestRow(created.id)).payload)
  assert.deepEqual([staged.exceptional, staged.exceptionalBy, staged.capCheck.evaluation.allowed], [true, f.hr.id, false])
  assert.ok(Number(staged.capCheck.evaluation.excess) > 0)

  const review = expect(await http(f.manager, 'GET', `/loans/requests/${created.id}/cap-review`), 200)
  assert.deepEqual([review.exceptional, review.exceptionalReason, review.firstInstallmentPeriod], [true, payload.reason, period])
  expect(await act(f.manager, created.id), 201)
  const selfApproval = expect(await act(f.hr, created.id), 403)
  assert.equal(selfApproval.code, 'LOAN_EXCEPTIONAL_SELF_APPROVAL')
  expect(await act(f.hr2, created.id), 201)

  const loan = await loanOf(created.id)
  assert.deepEqual([loan.amount, Boolean(loan.isExceptional), loan.exceptionalCategory, loan.exceptionalReason, loan.firstInstallmentPeriod, loan.createdByUserId],
    ['5000.00', true, 'MEDICAL', payload.reason, period, f.hr.id])
  assert.deepEqual(JSON.parse(loan.capSnapshot).capApprovals.map(row => row.decision), ['EXCEPTIONAL', 'EXCEPTIONAL'])
  const rows = await installmentsOf(loan.id)
  assert.deepEqual(rows.map(row => [row.dueDate, row.amount]), [0, 1, 2, 3, 4].map(i => [`${addMonths(period, i)}-01`, '1000.00']))
  f.exceptionalLoanId = loan.id
})

test('AD-14: partial early repayment records amount and reference, keeps the ledger consistent, replays safely and refuses overpayment', async () => {
  const loanId = f.exceptionalLoanId
  const body = { amount: '1500.00', reference: 'RCPT-1001', method: 'CASH', mode: 'SHORTEN_TERM', reason: 'سداد نقدي بإيصال' }
  expect(await http(f.owner, 'POST', `/loans/${loanId}/repayments`, body), 403)
  const first = expect(await http(f.hr, 'POST', `/loans/${loanId}/repayments`, body), 201)
  assert.deepEqual([first.mode, first.amount, first.balanceAfter, first.replayed], ['SHORTEN_TERM', '1500.00', '3500.00', false])
  const [row] = await raw(`SELECT CONVERT(varchar(40),amount) AS amount,reference,method,mode,CONVERT(varchar(40),balanceBefore) AS balanceBefore,CONVERT(varchar(40),balanceAfter) AS balanceAfter,actorId,eventId
    FROM loan_repayments WHERE loanId=@0`, [loanId])
  assert.deepEqual([row.amount, row.reference, row.method, row.mode, row.balanceBefore, row.balanceAfter, row.actorId], ['1500.00', 'RCPT-1001', 'CASH', 'SHORTEN_TERM', '5000.00', '3500.00', f.hr.id])
  const [event] = await raw('SELECT action,actionKey FROM loan_installment_events WHERE id=@0', [row.eventId])
  assert.deepEqual([event.action, event.actionKey], ['EARLY_REPAYMENT', `repayment:${loanId}:RCPT-1001`])
  const rows = await installmentsOf(loanId)
  assert.deepEqual(rows.map(item => [item.amount, item.paidAmount, item.financialStatus]), [
    ['1000.00', '0.00', 'DUE'], ['1000.00', '0.00', 'DUE'], ['1000.00', '0.00', 'DUE'], ['1000.00', '500.00', 'PARTIAL'], ['1000.00', '1000.00', 'SETTLED'], ['500.00', '0.00', 'DUE']])
  assert.equal(rows[5].parentInstallmentId, rows[3].id)

  const replay = expect(await http(f.hr, 'POST', `/loans/${loanId}/repayments`, body), 201)
  assert.deepEqual([replay.replayed, replay.repaymentId], [true, first.repaymentId])
  expect(await http(f.hr, 'POST', `/loans/${loanId}/repayments`, { ...body, amount: '10.00' }), 409)
  const over = expect(await http(f.hr, 'POST', `/loans/${loanId}/repayments`, { ...body, reference: 'RCPT-1002', amount: '3500.01' }), 400)
  assert.deepEqual([over.code, over.closingAmount], ['LOAN_REPAYMENT_EXCEEDS_BALANCE', '3500.00'])

  const reduce = expect(await http(f.hr, 'POST', `/loans/${loanId}/repayments`, { ...body, reference: 'TRF-2002', method: 'BANK_TRANSFER', amount: '500.00', mode: 'REDUCE_INSTALLMENT' }), 201)
  assert.deepEqual([reduce.mode, reduce.balanceAfter], ['REDUCE_INSTALLMENT', '3000.00'])
  const ledger = expect(await http(f.hr, 'GET', `/loans/${loanId}/ledger`), 200)
  assert.deepEqual([ledger.remainingAmount, ledger.paidAmount, ledger.installments.filter(item => item.financialStatus === 'DUE').length], ['3000.00', '2000.00', 4])
  assert.deepEqual(ledger.repayments.map(item => [item.reference, item.amount, item.balanceAfter]), [['RCPT-1001', '1500.00', '3500.00'], ['TRF-2002', '500.00', '3000.00']])

  // عبر محرك الطلبات: السداد الجزئي بلا مرجع يُرفض عند التقديم، وبالمرجع يُنفذ عند الاعتماد ويسجل رقم الطلب
  expect(await http(f.owner, 'POST', '/requests', { typeCode: 'EARLY_LOAN_SETTLEMENT', submit: true, payload: { loanId, amount: '100.00' } }), 400)
  const early = expect(await http(f.owner, 'POST', '/requests', { typeCode: 'EARLY_LOAN_SETTLEMENT', submit: true, payload: { loanId, amount: '100.00', reference: 'TRX-77', method: 'BANK_TRANSFER', mode: 'SHORTEN_TERM' } }), 201)
  expect(await act(f.hr, early.id), 201)
  const [viaRequest] = await raw('SELECT CONVERT(varchar(40),amount) AS amount,reference,requestId FROM loan_repayments WHERE loanId=@0 AND reference=@1', [loanId, 'TRX-77'])
  assert.deepEqual([viaRequest.amount, viaRequest.requestId], ['100.00', early.id])
})

test('AD-15: the employee sees only his own loan ledger', async () => {
  const otherLoanId = await insertLoan(f.otherEmployee.id, '600.00', 3, addMonths(localDate().slice(0, 7), 1))
  const mine = expect(await http(f.owner, 'GET', '/loans/mine'), 200)
  assert.deepEqual(mine.map(loan => loan.id).sort((a, b) => a - b), [f.cappedLoanId, f.exceptionalLoanId].sort((a, b) => a - b))
  assert.ok(mine.every(loan => loan.employeeId === f.employee.id))
  const exceptional = mine.find(loan => loan.id === f.exceptionalLoanId)
  assert.deepEqual(exceptional.repayments.map(item => item.reference), ['RCPT-1001', 'TRF-2002', 'TRX-77'])
  assert.equal('capSnapshot' in exceptional, false); assert.equal('actorId' in exceptional.repayments[0], false)
  assert.ok(exceptional.events.every(item => ['PAYROLL_POSTED', 'DEFERRED', 'SETTLED_EARLY', 'EARLY_REPAYMENT'].includes(item.action)))
  expect(await http(f.owner, 'GET', `/loans/${otherLoanId}/ledger`), 404)
  expect(await http(f.owner, 'GET', '/loans'), 403)
  assert.equal(expect(await http(f.owner, 'GET', `/loans/${f.exceptionalLoanId}/ledger`), 200).id, f.exceptionalLoanId)
  assert.deepEqual(expect(await http(f.other, 'GET', '/loans/mine'), 200).map(loan => loan.id), [otherLoanId])
  assert.equal(expect(await http(f.hr, 'GET', `/loans/${otherLoanId}/ledger`), 200).employeeId, f.otherEmployee.id)
})

test('AD-13: a settlement that cannot cover the loan records PENDING_RECOVERY; write-off needs its own permission and a reason', async () => {
  // خدمة قصيرة (نحو سنة) فمكافأة نهاية الخدمة صغيرة؛ آخر يوم عمل لاحق فلا يُغلق الملف فورًا.
  const leaver = await repo('Employee').save({ employeeCode: 'C6T', fullName: 'موظف منتهي', branchId: f.branch.id, departmentId: f.department.id, joinDate: shiftDays(-400),
    basicSalary: 3000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'cash', annualLeaveEntitled: false })
  const loanId = await insertLoan(leaver.id, '30000.00', 3, addMonths(localDate().slice(0, 7), 1))
  const kase = await repo('OffboardingCase').save({ employeeId: leaver.id, lastWorkingDay: shiftDays(30), status: 'IN_SETTLEMENT', terminationReason: 'termination' })
  await repo('ClearanceItem').save(['manager', 'custody', 'it', 'finance', 'hr'].map(party => ({ caseId: kase.id, party, label: party, status: 'DONE' })))
  expect(await http(f.admin, 'POST', `/offboarding/${kase.id}/recalc-lines`), 201)
  expect(await http(f.admin, 'POST', `/offboarding/${kase.id}/approve-settlement`), 201)
  const lines = await raw('SELECT type,CONVERT(varchar(40),amount) AS amount,label FROM settlement_lines WHERE caseId=@0', [kase.id])
  const cents = text => BigInt(text.replace('.', ''))
  const credits = lines.filter(line => line.type === 'CREDIT').reduce((sum, line) => sum + cents(line.amount), 0n)
  const debits = lines.filter(line => line.type === 'DEBIT').reduce((sum, line) => sum + cents(line.amount), 0n)
  assert.ok(lines.some(line => line.type === 'DEBIT' && line.amount === '30000.00'))
  const [recovery] = await raw(`SELECT id,status,CONVERT(varchar(40),loanBalance) AS loanBalance,CONVERT(varchar(40),coveredAmount) AS coveredAmount,CONVERT(varchar(40),amount) AS amount
    FROM loan_recovery_balances WHERE caseId=@0`, [kase.id])
  const expected = debits - credits
  assert.ok(expected > 0n)
  assert.deepEqual([recovery.status, recovery.loanBalance, cents(recovery.amount), cents(recovery.coveredAmount) + cents(recovery.amount)], ['PENDING_RECOVERY', '30000.00', expected < 3000000n ? expected : 3000000n, 3000000n])
  assert.equal((await raw("SELECT COUNT(*) AS n FROM loan_installments WHERE loanId=@0 AND financialStatus='DUE'", [loanId]))[0].n, 3)

  const listed = expect(await http(f.hr, 'GET', '/loans/recoveries'), 200)
  assert.equal(listed.find(row => row.id === recovery.id).openAmount, recovery.amount)
  const collected = expect(await http(f.hr, 'POST', `/loans/recoveries/${recovery.id}/collect`, { amount: '100.00', reference: 'RCV-1', reason: 'تحصيل جزئي' }), 201)
  assert.deepEqual([collected.recoveredAmount, collected.status], ['100.00', 'PENDING_RECOVERY'])
  expect(await http(f.hr, 'POST', `/loans/recoveries/${recovery.id}/collect`, { amount: '999999.00', reference: 'RCV-2' }), 400)
  expect(await http(f.hr, 'POST', `/loans/recoveries/${recovery.id}/write-off`, { reason: 'تعذر التحصيل بعد المطالبة' }), 403)
  expect(await http(f.writer, 'POST', `/loans/recoveries/${recovery.id}/write-off`, { reason: 'قصير' }), 400)
  const written = expect(await http(f.writer, 'POST', `/loans/recoveries/${recovery.id}/write-off`, { reason: 'تعذر التحصيل بعد المطالبة الرسمية' }), 201)
  assert.equal(written.status, 'WRITTEN_OFF')
  assert.equal(cents(written.writtenOffAmount) + cents(written.recoveredAmount), cents(recovery.amount))
  const events = await raw('SELECT action,reference,reason,actorId FROM loan_recovery_events WHERE recoveryId=@0 ORDER BY id', [recovery.id])
  assert.deepEqual(events.map(row => row.action), ['CREATED', 'COLLECTED', 'WRITTEN_OFF'])
  assert.deepEqual([events[2].actorId, events[1].reference], [f.writer.id, 'RCV-1'])
})
