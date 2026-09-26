// قرار المالك 26 سبتمبر: «مدير الموارد البشرية قراره نهائي» — كل نوع كان مستثنى من الاعتماد الفوري لطلب الموارد البشرية نيابةً
// (المال وما يغيّر العقد) بيتعتمد وينفَّذ لحظة تقديمه، بنفس أثر اعتماده خطوة بخطوة: سجل تدقيق لكل خطوة باسم الفاعل، ونفس المعالج.
// الإضافي والسلفة وزيادة الأجر والنقل وتأجيل القسط لهم اختبارات في مجموعاتهم (payroll-overtime-request / loan-completion /
// payroll-salary-request / attendance-calendar-transfer / loan-installment-deferral). هنا: الترقية وتغيير المسمى والعقد والإعارة،
// والاستقالة بملف إنهاء الخدمة، والمصروفات والبدل والتسوية بقيود الدفتر — ومقابلها منشئ بلا سلطة الموارد البشرية وطلب الموارد البشرية لنفسها.
// قاعدة SQL مؤقتة فقط (hr_final_authority_test_<hex>) وتُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_final_authority_test_${crypto.randomBytes(8).toString('hex')}`
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const { localDateOf } = require('../src/attendance/attendance.service')
const today = localDateOf(new Date())
const inDays = days => localDateOf(new Date(Date.now() + days * 86400000))
const INSTANT = /اعتماد فوري — قدّمته الموارد البشرية نيابة عن الموظف/
let master, app, ds, base, created = false, sequence = 0
let branch, department, managerEmp, hrEmp, hr, desk, manager, executive, admin

function guarded() { assert.match(database, /^hr_final_authority_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE); if (ds) assert.equal(ds.options.database, database) }
const repo = name => { guarded(); return ds.getRepository(name) }
function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function request(user, method, url, body) {
  const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(user)}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const ok = (response, status = 201) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const person = (extra = {}) => repo('Employee').save({ employeeCode: `HRF${++sequence}`, fullName: `موظف السلطة النهائية ${sequence}`, branchId: branch.id,
  departmentId: department.id, managerEmployeeId: managerEmp?.id ?? null, joinDate: '2020-01-01', status: 'active', isActive: true, basicSalary: 6000,
  jobTitle: 'مسمى أصلي', contractType: 'fixed_term', contractStart: '2025-01-01', contractEnd: '2025-12-31', ...extra })
const onBehalf = (user, typeCode, emp, payload) => request(user, 'POST', '/requests', { typeCode, submit: true, onBehalfEmployeeId: emp.id, payload })
const act = (user, id, action = 'APPROVE', comment) => request(user, 'POST', `/requests/${id}/act`, { action, ...(comment ? { comment } : {}) })
async function assertInstant(result) {
  assert.ok(['COMPLETED', 'IN_EXECUTION'].includes(result.status), JSON.stringify(result))
  const steps = JSON.parse(result.resolvedSteps)
  assert.deepEqual(steps.map(step => [step.role, step.action]), [['direct_manager_of_requester', 'APPROVED'], ['hr', 'APPROVED'], ['executive', 'APPROVED']])
  const decisions = await repo('RequestApproval').find({ where: { requestId: result.id }, order: { step: 'ASC' } })
  assert.deepEqual(decisions.map(row => [row.step, row.approverId, row.action]), [[1, hr.id, 'APPROVED'], [2, hr.id, 'APPROVED'], [3, hr.id, 'APPROVED']])
  assert.ok(decisions.every(row => INSTANT.test(row.comment)))
}

before(async () => {
  guarded(); assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME || 'sa', password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', JWT_SECRET: secret, NODE_ENV: 'test' })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  ds = app.get(require('../node_modules/typeorm').DataSource); guarded()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  branch = await repo('Branch').save({ name: 'فرع السلطة النهائية', code: 'HRF_A', weekendDays: 'FRI,SAT' })
  department = await repo('Department').save({ name: 'قسم العمليات', branchId: branch.id })
  managerEmp = await person({ managerEmployeeId: null }); hrEmp = await person({ managerEmployeeId: null })
  await repo('Department').update(department.id, { managerEmployeeId: managerEmp.id })
  const user = (label, role, employeeId, permissions) => repo('User').save({ email: `${label}@hr-final-authority.invalid`, displayName: label, role, branchId: branch.id,
    employeeId, passwordHash: 'isolated-token-only', permissions: JSON.stringify(permissions) })
  hr = await user('مدير الموارد البشرية', 'hr_manager', hrEmp.id, ['requests.create_on_behalf', 'requests.view_all', 'approve.hr', 'employees.view'])
  // منشئ نيابةً بلا سلطة الموارد البشرية (زي مسؤول الرواتب)
  desk = await user('مسؤول الرواتب', 'employee', null, ['requests.create_on_behalf', 'requests.view_all'])
  manager = await user('المدير المباشر', 'employee', managerEmp.id, [])
  executive = await user('الإدارة التنفيذية', 'employee', null, ['approve.executive'])
  admin = await user('مدير النظام', 'super_admin', null, ['*'])
  const chain = await repo('ApprovalChain').save({ code: 'HRF_CHAIN', nameAr: 'مدير ثم موارد بشرية ثم تنفيذي', isActive: true, autoApprove: false })
  await repo('ApprovalStep').save([{ chainId: chain.id, stepOrder: 1, approverRole: 'direct_manager_of_requester' },
    { chainId: chain.id, stepOrder: 2, approverRole: 'hr' }, { chainId: chain.id, stepOrder: 3, approverRole: 'executive' }])
  for (const [code, category, destinationHandler, required] of [
    ['PROMOTION', 'employment_status', 'employee_update_promotions', ['toTitle']], ['TITLE_CHANGE', 'employment_status', 'employee_update', ['toTitle']],
    ['CONTRACT_RENEWAL', 'employment_status', 'contracts_register', []], ['SECONDMENT', 'employment_status', 'none', ['reason']],
    ['RESIGNATION', 'employment_status', 'employee_status', ['lastWorkingDate', 'reason']],
    ['EXPENSE_CLAIM', 'financial', 'expense_register', ['amount', 'description']], ['PER_DIEM', 'financial', 'payroll_allowance', ['amount']],
    ['DEDUCTION_OBJECTION', 'financial', 'payroll_adjustment', ['reason', 'amount']],
  ]) await repo('RequestType').save({ code, nameAr: code, category, destinationHandler, approvalChainId: chain.id, isActive: true, requiredFields: JSON.stringify(required) })
}, { timeout: 90000 })

after(async () => {
  try { if (app) await app.close() } finally {
    try {
      if (created && master) {
        guarded()
        await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
        assert.equal((await master.request().input('db', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name=@db')).recordset.length, 0)
      }
    } finally { if (master) await master.close() }
  }
})

test('Owner 26-Sep: promotion, title change, contract renewal and secondment HR files on behalf are approved at once and execute exactly as after the last approver', async () => {
  const promoted = await person()
  const promotion = ok(await onBehalf(hr, 'PROMOTION', promoted, { toTitle: 'مشرف أول' }))
  await assertInstant(promotion)
  assert.equal(promotion.status, 'COMPLETED'); assert.match(promotion.destinationRef, /^PR-/)
  assert.equal((await repo('Employee').findOneByOrFail({ id: promoted.id })).jobTitle, 'مشرف أول')
  const record = await repo('Promotion').findOneByOrFail({ requestId: promotion.id })
  assert.deepEqual([record.fromTitle, record.toTitle, record.employeeId], ['مسمى أصلي', 'مشرف أول', promoted.id])
  assert.ok(await repo('EmployeeStatusHistory').countBy({ requestId: promotion.id, employeeId: promoted.id }) >= 1)

  // المجدول يفضل مجدول: قرار الموارد البشرية لحظي، والتنفيذ بتاريخ السريان
  const retitled = await person()
  const future = ok(await onBehalf(hr, 'TITLE_CHANGE', retitled, { toTitle: 'محلل بيانات', effectiveDate: inDays(30) }))
  await assertInstant(future)
  assert.equal(future.status, 'IN_EXECUTION')
  assert.equal((await repo('Employee').findOneByOrFail({ id: retitled.id })).jobTitle, 'مسمى أصلي')
  await repo('Request').update(future.id, { payload: JSON.stringify({ toTitle: 'محلل بيانات', effectiveDate: today }) })
  assert.equal(ok(await request(admin, 'POST', '/requests/engine/run-scheduled-transfers', {})).employmentExecuted, 1)
  assert.equal((await repo('Request').findOneByOrFail({ id: future.id })).status, 'COMPLETED')
  assert.equal((await repo('Employee').findOneByOrFail({ id: retitled.id })).jobTitle, 'محلل بيانات')

  const renewed = await person()
  const renewal = ok(await onBehalf(hr, 'CONTRACT_RENEWAL', renewed, { contractStart: '2026-01-01', contractEnd: '2026-12-31', contractNumber: 'HRF-2026' }))
  await assertInstant(renewal)
  const contract = await repo('Employee').findOneByOrFail({ id: renewed.id })
  assert.deepEqual([contract.contractStart, contract.contractEnd, contract.contractNumber, contract.joinDate], ['2026-01-01', '2026-12-31', 'HRF-2026', '2020-01-01'])

  const seconded = await person()
  const secondment = ok(await onBehalf(hr, 'SECONDMENT', seconded, { reason: 'إعارة لجهة شريكة ثلاثة أشهر' }))
  await assertInstant(secondment)
  assert.equal(secondment.status, 'COMPLETED'); assert.match(secondment.destinationRef, /^REQ-/)
})

test('Owner 26-Sep: a resignation HR files on behalf is approved at once, puts the employee in notice period and opens the offboarding case', async () => {
  const leaver = await person()
  const lastWorkingDate = inDays(30)
  const resignation = ok(await onBehalf(hr, 'RESIGNATION', leaver, { lastWorkingDate, reason: 'ظروف عائلية تستدعي الانتقال' }))
  await assertInstant(resignation)
  assert.equal(resignation.status, 'COMPLETED'); assert.match(resignation.destinationRef, /^OFB-/)
  assert.equal((await repo('Employee').findOneByOrFail({ id: leaver.id })).status, 'notice_period')
  const kase = await repo('OffboardingCase').findOneByOrFail({ employeeId: leaver.id })
  assert.deepEqual([kase.resignationRequestId, kase.terminationReason, kase.lastWorkingDay, kase.status], [resignation.id, 'resignation', lastWorkingDate, 'IN_CLEARANCE'])
  assert.equal(await repo('ClearanceItem').countBy({ caseId: kase.id }), 5)
  const history = await repo('EmployeeStatusHistory').find({ where: { requestId: resignation.id } })
  assert.ok(history.length >= 1)
  // لا ملف إنهاء خدمة ثانٍ: الطلب المكرر يُرفض كله بلا مسودة ولا قرار
  const before = await repo('Request').countBy({ requesterId: leaver.id })
  assert.equal((await onBehalf(hr, 'RESIGNATION', leaver, { lastWorkingDate, reason: 'تقديم مكرر للاستقالة' })).status, 400)
  assert.equal(await repo('Request').countBy({ requesterId: leaver.id }), before)
})

test('Owner 26-Sep: money requests HR files on behalf are approved at once and post their ledger entries — expense, per diem and adjustment', async () => {
  const payee = await person()
  for (const [typeCode, payload, category, amount] of [
    ['EXPENSE_CLAIM', { amount: '350.50', description: 'تذاكر سفر لمهمة العميل' }, 'expense', 350.5],
    ['PER_DIEM', { amount: '200', reason: 'بدل انتداب يومين' }, 'allowance', 200],
    ['DEDUCTION_OBJECTION', { amount: '75', reason: 'خصم مكرر في مسير الشهر' }, 'adjustment', 75],
  ]) {
    const result = ok(await onBehalf(hr, typeCode, payee, payload))
    await assertInstant(result)
    assert.equal(result.status, 'COMPLETED', typeCode)
    const entries = await repo('EmployeeObligation').findBy({ sourceRequestId: result.id })
    assert.deepEqual(entries.map(row => [row.employeeId, row.type, row.category, Number(row.amount), row.status]), [[payee.id, 'CREDIT', category, amount, 'PENDING']], typeCode)
  }
})

test('Owner 26-Sep: a creator without HR authority keeps the whole chain for the same types and never approves his own; HR own resignation keeps its chain too', async () => {
  const payee = await person()
  const claim = ok(await onBehalf(desk, 'EXPENSE_CLAIM', payee, { amount: '120', description: 'مصروفات ضيافة لعميل' }))
  assert.deepEqual([claim.status, claim.currentStep], ['UNDER_REVIEW', 1])
  assert.equal(await repo('RequestApproval').countBy({ requestId: claim.id }), 0)
  assert.equal(await repo('EmployeeObligation').countBy({ sourceRequestId: claim.id }), 0)
  assert.equal((await act(desk, claim.id)).status, 403, 'the creator without HR authority does not approve his own')
  assert.equal(ok(await act(manager, claim.id)).currentStep, 2)
  assert.equal(ok(await act(hr, claim.id)).currentStep, 3)
  assert.equal(ok(await act(executive, claim.id)).status, 'COMPLETED')
  const decisions = await repo('RequestApproval').find({ where: { requestId: claim.id }, order: { step: 'ASC' } })
  assert.deepEqual(decisions.map(row => row.approverId), [manager.id, hr.id, executive.id])
  assert.equal(await repo('EmployeeObligation').countBy({ sourceRequestId: claim.id }), 1)
  // استقالة الموارد البشرية لنفسها كموظف: بلا اعتماد فوري، ولا تعتمدها بنفسها
  const own = ok(await request(hr, 'POST', '/requests', { typeCode: 'RESIGNATION', submit: true, payload: { lastWorkingDate: inDays(45), reason: 'فرصة عمل في مدينة أخرى' } }))
  assert.deepEqual([own.status, own.requesterId], ['UNDER_REVIEW', hrEmp.id])
  assert.equal(await repo('RequestApproval').countBy({ requestId: own.id }), 0)
  assert.equal((await act(hr, own.id)).status, 403)
  assert.equal((await repo('Employee').findOneByOrFail({ id: hrEmp.id })).status, 'active')
  assert.equal(ok(await request(hr, 'POST', `/requests/${own.id}/cancel`)).status, 'CANCELLED')
})
