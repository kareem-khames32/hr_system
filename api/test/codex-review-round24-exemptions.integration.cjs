// C3 / الخطوة 26: الإعفاء المالي (EX-01..08) من الأول للآخر على قاعدة SQL مؤقتة (hr_codex_r24_exemptions_test_<hex>):
// قبول الخطوة — «إعفاء موظف من خصم» يظهر في القسيمة بالمبلغ الأصلي والمبلغ بعد الإعفاء والسبب — ومعه: كل الخصومات مع بقاء النظامي،
// تأجيل القسط لا إسقاطه، إسقاط وتأجيل الخصم المصنف عند الصرف، الاحتواء، إعادة الحساب قبل الاعتماد، المسير المعتمد، نطاق مدير القسم
// وسقفه واعتماد الموارد البشرية، فصل المهام (النفس، المُنشئ، المانح)، الإلغاء وإعادة الإعفاء، حدود الموظف والتهدئة ونسبة المانح، إعادة الفتح، الإلغاء، والتقرير.
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
const database = `hr_codex_r24_exemptions_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-exemptions-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const { writeParityReasonsBeforeApproval } = require('./fixtures/payroll-parity-reasons.cjs')
let app, ds, master, base, created = false, sequence = 0
const org = {}, people = {}, users = {}, types = {}

const today = new Date()
const ym = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
const period = ym(today)
const nextPeriod = ym(new Date(today.getFullYear(), today.getMonth() + 1, 1))
const day = n => `${period}-${String(n).padStart(2, '0')}`
const incidentDate = new Date(Date.now() - 3 * 86400000).toLocaleDateString('en-CA')
const REASON = 'عطل حافلة الشركة صباح اليوم بمحضر الموارد البشرية الرسمي'

function assertDisposable() {
  assert.match(database, /^hr_codex_r24_exemptions_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
function repo(name) { assertDisposable(); return ds.getRepository(name) }
function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    scopeAllBranches: user.scopeAllBranches === true, tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function request(user, method, route, body) {
  await writeParityReasonsBeforeApproval(request, user, method, route)
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
function expectStatus(response, status, code) {
  assert.equal(response.status, status, JSON.stringify(response.body))
  if (code) assert.equal(response.body?.code, code, JSON.stringify(response.body))
  return response.body
}
async function setConfig(key, value) {
  const config = repo('RequestsConfig')
  if (await config.findOneBy({ key })) await config.update({ key }, { value })
  else await config.save({ key, value })
}
async function employee(code, overrides = {}) {
  return repo('Employee').save({ employeeCode: code, fullName: `موظف ${code}`, branchId: org.branch.id, departmentId: org.department.id, teamId: null,
    managerEmployeeId: null, joinDate: '2020-01-01', basicSalary: 9000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0,
    workNatureAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'transfer', currency: 'SAR', ...overrides })
}
// حضور محسوب ثابت لكل أيام الشهر (لا غياب مجسّد) مع أيام تأخير وغياب محددة
async function attendance(emp, { late = [], absent = [] } = {}) {
  const rows = []
  const days = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  for (let n = 1; n <= days; n++) {
    const date = day(n)
    if (absent.includes(date)) {
      rows.push({ employeeId: emp.id, branchId: emp.branchId, date, status: 'absent', checkIn: null, checkOut: null, shiftName: 'وردية اختبار الإعفاء', shiftStart: '08:00', shiftEnd: '16:00',
        scheduleSource: 'override', workMinutes: 0, lateMinutes: 0, deductibleMinutes: 0, earlyLeaveMinutes: 0 })
      continue
    }
    const minutes = late.includes(date) ? 60 : 0
    rows.push({ employeeId: emp.id, branchId: emp.branchId, date, status: minutes ? 'late' : 'present', checkIn: minutes ? '09:00' : '08:00', checkOut: '16:00',
      shiftName: 'وردية اختبار الإعفاء', shiftStart: '08:00', shiftEnd: '16:00', scheduleSource: 'override', workMinutes: 480, lateMinutes: minutes, deductibleMinutes: 0, earlyLeaveMinutes: 0 })
  }
  await repo('AttendanceDay').save(rows, { chunk: 100 })
}
async function calc(emps, runPeriod = period) {
  return expectStatus(await request(users.hr, 'POST', '/payroll/runs/calculate-defined', { period: runPeriod, scopeType: 'CUSTOM', employeeIds: emps.map(emp => emp.id),
    name: `مسير اختبار الإعفاء ${++sequence}` }), 201)
}
const recalc = async run => expectStatus(await request(users.hr, 'POST', `/payroll/runs/${run.id}/recalculate`, { reason: 'إعادة حساب بعد قرارات الإعفاء المالي' }), 201)
const itemOf = (run, emp) => { const row = run.items.find(item => item.employeeId === emp.id); assert.ok(row, `item for ${emp.employeeCode}`); return row }
async function transition(run, action, body) {
  if (action === 'approve') {
    const report = expectStatus(await request(users.hr, 'GET', `/payroll/runs/${run.id}/unassigned`), 200)
    expectStatus(await request(users.hr, 'POST', `/payroll/runs/${run.id}/unassigned-ack`, { reportHash: report.reportHash }), 201)
  }
  const payload = action === 'pay' && body === undefined ? { channel: 'BANK_TRANSFER', reference: `EX-TEST-${run.id}` } : body
  return request(users.hr, 'POST', `/payroll/runs/${run.id}/${action}`, payload)
}
async function deduction(creator, approver, emp, type, amount) {
  const request1 = expectStatus(await request(creator, 'POST', '/deductions', { employeeId: emp.id, deductionTypeId: type.id, inputValue: amount, incidentDate,
    reason: 'مخالفة موثقة في تقرير الجودة الأسبوعي للقسم', targetPeriod: period, confirmNotDuplicate: true }), 201)
  // قرار المالك 26 سبتمبر: خصم صاحب سلطة الموارد البشرية (hr_manager) بيتعتمد لحظة إنشائه؛ غيره يعتمده المعتمِد
  if (request1.status !== 'APPROVED') {
    const detail = expectStatus(await request(approver, 'GET', `/deductions/${request1.id}`), 200)
    const approved = expectStatus(await request(approver, 'POST', `/deductions/${request1.id}/approve`, { expectedRevision: detail.revision }), 201)
    assert.equal(approved.status, 'APPROVED', JSON.stringify(approved))
  }
  const [obligation] = await repo('EmployeeObligation').findBy({ deductionRequestId: request1.id })
  assert.ok(obligation)
  return { request: request1, obligation }
}
const exemption = (run, emp, extra) => ({ runId: run.id, employeeId: emp.id, reason: REASON, ...extra })
async function grant(user, input, status = 201, code) {
  const preview = await request(user, 'POST', '/payroll/exemptions/preview', input)
  if (preview.status !== 200 && preview.status !== 201) return expectStatus(preview, status, code)
  return expectStatus(await request(user, 'POST', '/payroll/exemptions', { ...input, previewHash: preview.body.previewHash }), status, code)
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
  await app.get(require('../src/settings/config-defaults.service').ConfigDefaultsService).onApplicationBootstrap()
  for (const [key, value] of [['payroll.cycle_start_day', '1'], ['payroll.monthly_days', '30'], ['payroll.daily_hours', '8'], ['payroll.policy.default_period_type', 'CALENDAR_MONTH'],
    ['payroll.policy.min_net_guarantee', 'null'], ['payroll.policy.net_floor_pct', 'null'], ['payroll.policy.max_deduction_pct_of_gross', 'null'],
    ['loan.insufficient_net_behavior', 'PARTIAL_THEN_CARRY'], ['payroll.salary_evidence_mode', 'MONTHLY_HISTORY_OR_CURRENT_FILE'], ['attendance.absence_penalty_days', '1'],
    // نسبة المانح تُختبر صراحةً في المجموعة الثانية؛ مسير بموظف واحد يجعل أي إعفاء 100% من خصوماته
    ['financial_exemptions.max_pct_per_grantor', '0']]) await setConfig(key, value)
  await require('./fixtures/payroll-small-company-approval.cjs').allowSmallCompanyApproval(repo)
  org.branch = await repo('Branch').save({ code: 'EX_A', name: 'فرع الإعفاءات' })
  org.department = await repo('Department').save({ branchId: org.branch.id, name: 'قسم التشغيل', code: 'EX_DA' })
  const user = (label, role, employeeId, permissions = []) => repo('User').save({ email: `${label}@exemptions.invalid`, displayName: label, passwordHash: 'test-only', role,
    branchId: org.branch.id, employeeId, permissions: JSON.stringify(permissions) })
  people.branchManager = await employee('EX_BM')
  people.dm = await employee('EX_DM', { managerEmployeeId: people.branchManager.id })
  people.manager = await employee('EX_MG', { managerEmployeeId: people.dm.id })
  people.e1 = await employee('EX_E1', { managerEmployeeId: people.manager.id })
  people.e2 = await employee('EX_E2', { managerEmployeeId: people.manager.id })
  people.e3 = await employee('EX_E3', { managerEmployeeId: people.manager.id })
  await repo('Department').update(org.department.id, { managerEmployeeId: people.dm.id })
  await repo('Branch').update(org.branch.id, { managerEmployeeId: people.branchManager.id })
  const payroll = ['payroll.view', 'payroll.calculate', 'payroll.approve', 'payroll.pay', 'payroll.reopen', 'payroll.cancel']
  users.hr = await user('hr', 'hr_manager', null, [...payroll, 'deductions.view', 'deductions.approve', 'deductions.manage',
    'financial_exemption.view', 'financial_exemption.grant', 'financial_exemption.approve', 'financial_exemption.override_limits'])
  users.hr2 = await user('hr2', 'hr_manager', null, ['payroll.view', 'deductions.view', 'deductions.approve', 'financial_exemption.view', 'financial_exemption.grant',
    'financial_exemption.approve', 'financial_exemption.override_limits'])
  // مانح/مُنشئ بأساس «الموارد البشرية» (الصلاحيات نفسها) من غير سلطة الموارد البشرية: فصل المهام وحد نسبة المانح يسريان عليه.
  // قرار المالك 26 سبتمبر: صاحب السلطة (hr_manager) قراره نهائي — اختباره المخصص آخر الملف
  users.desk = await user('exemption-desk', 'employee', null, ['payroll.view', 'deductions.view', 'deductions.manage', 'financial_exemption.view', 'financial_exemption.grant',
    'financial_exemption.approve', 'financial_exemption.override_limits'])
  users.dm = await user('department-manager', 'employee', people.dm.id)
  users.manager = await user('direct-manager', 'employee', people.manager.id)
  users.e1 = await user('employee-e1', 'employee', people.e1.id)
  users.e2 = await user('employee-e2', 'employee', people.e2.id)
  // أنواع الخصومات لكل الشركة: بتتضاف من حساب على مستوى الشركة، وموارد الفرع (hr) تشتغل عليها بس
  users.admin = await repo('User').save({ email: 'admin@exemptions.invalid', displayName: 'admin', passwordHash: 'test-only', role: 'super_admin', branchId: null, employeeId: null, permissions: '[]' })
  expectStatus(await request(users.hr, 'POST', '/deductions/types', { code: 'EX_BRANCH_HR', nameAr: 'من حساب فرع', category: 'PERFORMANCE', calcMethod: 'FIXED_AMOUNT' }), 403)
  types.quality = expectStatus(await request(users.admin, 'POST', '/deductions/types', { code: 'EX_QUALITY', nameAr: 'خصم جودة', category: 'PERFORMANCE', calcMethod: 'FIXED_AMOUNT',
    creatorScopes: ['DIRECT_MANAGER', 'HR'], approvalSteps: ['HR'], escalationDays: null, isExemptable: true }), 201)
  types.statutory = expectStatus(await request(users.admin, 'POST', '/deductions/types', { code: 'EX_STATUTORY', nameAr: 'استقطاع نظامي', category: 'STATUTORY', calcMethod: 'FIXED_AMOUNT',
    creatorScopes: ['HR'], approvalSteps: ['HR'], escalationDays: null, maxPctOfGross: null }), 201)
  assert.equal(types.statutory.isExemptable, false)
  await seedIndependent()
}, { timeout: 180000 })

after(async () => {
  try { if (app) await app.close() } finally {
    try {
      if (master && created) {
        await master.request().query(`IF DB_ID(N'${database}') IS NOT NULL BEGIN ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]; END`)
        const left = await master.request().query(`SELECT name FROM sys.databases WHERE name = N'${database}'`)
        assert.equal(left.recordset.length, 0)
      }
    } finally { if (master) await master.close(); fs.rmSync(uploads, { recursive: true, force: true }) }
  }
})

const independent = {}
async function seedIndependent(){
  const x=independent
  x.ownerDepartment=await repo('Department').save({branchId:org.branch.id,name:'جهة اختبار مستقلة'})
  x.ownerEmployee=await employee('R24-OWNER',{departmentId:x.ownerDepartment.id})
  await repo('Department').update(x.ownerDepartment.id,{managerEmployeeId:x.ownerEmployee.id})
  x.owner=await repo('User').save({email:'owner@r24.invalid',displayName:'مالك النوع',passwordHash:'test-only',role:'employee',branchId:org.branch.id,employeeId:x.ownerEmployee.id,permissions:'[]'})
  x.noEmployee=await repo('User').save({email:'unlinked@r24.invalid',displayName:'غير مرتبط',passwordHash:'test-only',role:'employee',branchId:org.branch.id,permissions:'[]'})
  const type=async(code,ownerDepartmentId)=>expectStatus(await request(users.admin,'POST','/deductions/types',{code,nameAr:code,category:'PERFORMANCE',calcMethod:'FIXED_AMOUNT',creatorScopes:['HR'],approvalSteps:['HR'],escalationDays:null,isExemptable:true,ownerDepartmentId}),201)
  x.owned=await type('R24_OWNER',x.ownerDepartment.id);x.dual=await type('R24_DUAL',org.department.id)
  x.employee=await employee('R24-TARGET',{managerEmployeeId:people.manager.id})
  await attendance(x.employee,{late:[day(6)]})
  x.ownedDebit=await deduction(users.hr,users.hr2,x.employee,x.owned,'147.89')
  x.dualDebit=await deduction(users.hr,users.hr2,x.employee,x.dual,'123.45')
  x.otherDebit=await deduction(users.hr,users.hr2,x.employee,types.quality,'98.76')
  const loan=await repo('Loan').save({employeeId:x.employee.id,amount:666,status:'DISBURSED'})
  x.installment=await repo('LoanInstallment').save({loanId:loan.id,dueDate:day(10),amount:333,paid:false})
  x.run=await calc([x.employee])
  x.foreignBranch=await repo('Branch').save({code:'R24-SECRET',name:'فرع خارجي محجوب'})
  x.foreignDepartment=await repo('Department').save({branchId:x.foreignBranch.id,name:'قسم خارجي محجوب'})
  x.far=await employee('R24-FAR',{fullName:'موظف سري خارج نطاق المالك',branchId:x.foreignBranch.id,departmentId:x.foreignDepartment.id,basicSalary:8543.21})
  x.near=await employee('R24-NEAR',{departmentId:org.department.id})
  await attendance(x.far);await attendance(x.near)
  x.farDebit=await deduction(users.admin,users.admin,x.far,x.owned,'147.89')
  x.shared=expectStatus(await request(users.admin,'POST','/payroll/runs/calculate-defined',{period,scopeType:'CUSTOM',employeeIds:[x.far.id,x.near.id],name:'مسير فرعين لاختبار الجهة'}),201)
  await repo('Department').update(x.foreignDepartment.id,{managerEmployeeId:people.dm.id})
  x.exclusive=await employee('R24-EXCLUSIVE',{fullName:'حالة فرع خارجي فقط',branchId:x.foreignBranch.id,departmentId:x.foreignDepartment.id})
  await attendance(x.exclusive)
  x.exclusiveRun=expectStatus(await request(users.admin,'POST','/payroll/runs/calculate-defined',{period,scopeType:'CUSTOM',employeeIds:[x.exclusive.id],name:'مسير الفرع الخارجي السري R24'}),201)
}

test('CR24 exemption candidate response is the union of legitimate bases, and unlinked users have no implicit role',async t=>{
  const x=independent,route=`/payroll/exemptions/runs/${x.run.id}/candidates?employeeId=${x.employee.id}`
  const hr=expectStatus(await request(users.hr,'GET',route),200)
  assert.equal(hr.typedObligations.length,3);assert.equal(hr.installments.length,1);assert.equal(hr.dayRate,'300.00')
  const dual=expectStatus(await request(users.dm,'GET',route),200)
  assert.deepEqual(dual.bases,['DEPARTMENT_MANAGER','FUNCTION_OWNER']);assert.equal(dual.dayRate,'300.00')
  assert.deepEqual(dual.typedObligations.map(r=>r.obligationId),[x.dualDebit.obligation.id]);assert.deepEqual(dual.installments,[]);assert.equal(dual.unpaidLeave,null)
  assert.deepEqual(dual.attendanceDays,hr.attendanceDays)
  const owner=expectStatus(await request(x.owner,'GET',route),200)
  assert.deepEqual(owner.bases,['FUNCTION_OWNER']);assert.equal(owner.dayRate,null);assert.deepEqual(owner.attendanceDays,[])
  assert.deepEqual(owner.typedObligations.map(r=>[r.obligationId,r.amount]),[[x.ownedDebit.obligation.id,'147.89']])
  expectStatus(await request(x.noEmployee,'GET',route),403)
  await setConfig('financial_exemptions.department_manager_enabled','false')
  try{
    const disabled=expectStatus(await request(users.dm,'GET',route),200)
    assert.deepEqual(disabled.bases,['FUNCTION_OWNER']);assert.equal(disabled.dayRate,null);assert.deepEqual(disabled.attendanceDays,[])
  }finally{await setConfig('financial_exemptions.department_manager_enabled','true')}
  t.diagnostic(JSON.stringify({case:'exemption-basis-union',hrTypes:3,dualTypes:1,ownerTypes:1,hrDayRate:hr.dayRate,noEmployeeStatus:403}))
})

test('CR24 owning a deduction type must not reveal an employee outside the viewer branch through candidates',async t=>{
  const x=independent,route=`/payroll/exemptions/runs/${x.shared.id}/candidates`
  const list=await request(x.owner,'GET',route),detail=await request(x.owner,'GET',`${route}?employeeId=${x.far.id}`)
  const exposed=list.body.employees?.filter(e=>e.employeeId===x.far.id)??[]
  t.diagnostic(JSON.stringify({case:'function-owner-foreign-candidates',listStatus:list.status,foreignEmployees:exposed,detailStatus:detail.status,detailEmployee:detail.body.employee,detailTyped:detail.body.typedObligations,expectedBranch:x.owner.branchId,employeeBranch:x.far.branchId}))
  assert.equal(exposed.length,0,'The owned type must not broaden branch scope')
  assert.notEqual(detail.status,200,'The foreign employee detail must be hidden')
})

test('CR24 both structural bases reject foreign preview and direct grant without identifying data',async t=>{
  const x=independent
  const candidates=`/payroll/exemptions/runs/${x.shared.id}/candidates`
  const inputs=[
    [users.dm,exemption(x.shared,x.far,{scopeKind:'DEDUCTION_TYPE',targetKind:'LATENESS'})],
    [x.owner,exemption(x.shared,x.far,{scopeKind:'SINGLE_ENTRY',targetKind:'OBLIGATION',targetRef:String(x.farDebit.obligation.id)})],
  ]
  const count=await repo('PayrollFinancialExemption').count(), evidence=[]
  for(const [actor,input] of inputs){
    const list=expectStatus(await request(actor,'GET',candidates),200)
    assert.ok(!list.employees.some(e=>e.employeeId===x.far.id))
    const responses=[await request(actor,'GET',`${candidates}?employeeId=${x.far.id}`),await request(actor,'POST','/payroll/exemptions/preview',input),await request(actor,'POST','/payroll/exemptions',{...input,previewHash:'0'.repeat(64)})]
    for(const r of responses){
      expectStatus(r,403,'EXEMPTION_OUT_OF_SCOPE')
      assert.ok(!JSON.stringify(r.body).includes(x.far.fullName));assert.ok(!JSON.stringify(r.body).includes(x.far.employeeCode))
      assert.ok(!('employeeId' in r.body));assert.ok(!('obligationId' in r.body));assert.ok(!('amount' in r.body))
    }
    evidence.push({actor:actor===users.dm?'department-manager':'function-owner',statuses:responses.map(r=>r.status)})
  }
  assert.equal(await repo('PayrollFinancialExemption').count(),count)
  t.diagnostic(JSON.stringify({case:'foreign-mutations-denied',evidence,rowsInserted:0}))
})

test('CR24 authorized structural grants keep amounts, and foreign exemptions stay outside lists and mine',async t=>{
  const x=independent
  await setConfig('financial_exemptions.cooldown_hours','0')
  await setConfig('financial_exemptions.max_per_employee_year','0')
  const ownerInput=exemption(x.run,x.employee,{scopeKind:'SINGLE_ENTRY',targetKind:'OBLIGATION',targetRef:String(x.ownedDebit.obligation.id)})
  x.ownerGrant=await grant(x.owner,ownerInput)
  assert.equal(x.ownerGrant.estimatedAmount,'147.89');assert.equal(x.ownerGrant.status,'PENDING_APPROVAL')
  x.dmGrant=await grant(users.dm,exemption(x.run,x.employee,{scopeKind:'SINGLE_ENTRY',targetKind:'LATENESS_DAY',targetRef:day(6)}))
  assert.equal(x.dmGrant.grantorBasis,'DEPARTMENT_MANAGER');assert.equal(x.dmGrant.status,'PENDING_APPROVAL')
  assert.ok(Number(x.dmGrant.estimatedAmount)>0)
  const allOwner=await repo('User').save({email:'owner-all@r24.invalid',displayName:'مالك النوع كل الفروع',passwordHash:'test-only',role:'employee',scopeAllBranches:true,employeeId:x.ownerEmployee.id,permissions:'[]'})
  const allDetail=expectStatus(await request(allOwner,'GET',`/payroll/exemptions/runs/${x.shared.id}/candidates?employeeId=${x.far.id}`),200)
  assert.deepEqual(allDetail.bases,['FUNCTION_OWNER'])
  x.foreignGrant=await grant(allOwner,exemption(x.shared,x.far,{scopeKind:'SINGLE_ENTRY',targetKind:'OBLIGATION',targetRef:String(x.farDebit.obligation.id)}))
  assert.equal(x.foreignGrant.estimatedAmount,'147.89')
  // A real attendance grant in B, so manager visibility cannot pass by merely hiding TYPED grants.
  await repo('AttendanceDay').update({employeeId:x.far.id,date:day(6)},{status:'late',lateMinutes:60,checkIn:'09:00'})
  expectStatus(await request(users.admin,'POST',`/payroll/runs/${x.shared.id}/recalculate`,{reason:'إثبات إعفاء حضور خارج نطاق الفرع'}),201)
  x.foreignAttendance=await grant(users.admin,exemption(x.shared,x.far,{scopeKind:'SINGLE_ENTRY',targetKind:'LATENESS_DAY',targetRef:day(6)}))
  for(const actor of [users.dm,x.owner]){
    for(const route of ['/payroll/exemptions',`/payroll/exemptions?employeeId=${x.far.id}`,`/payroll/exemptions/runs/${x.shared.id}`]){
      const response=expectStatus(await request(actor,'GET',route),200)
      assert.ok(!JSON.stringify(response).includes(x.far.fullName));assert.ok(!JSON.stringify(response).includes(x.far.employeeCode))
      const rows=Array.isArray(response)?response:response.exemptions
      assert.ok(!rows.some(r=>r.employeeId===x.far.id))
    }
    for(const row of [x.foreignGrant,x.foreignAttendance])expectStatus(await request(actor,'GET',`/payroll/exemptions/${row.id}`),403,'EXEMPTION_FORBIDDEN')
    assert.deepEqual(expectStatus(await request(actor,'GET','/payroll/exemptions/mine'),200),[])
  }
  const employeeUser=await repo('User').save({email:'target-self@r24.invalid',displayName:'صاحب الإعفاء',passwordHash:'test-only',role:'employee',branchId:org.branch.id,employeeId:x.employee.id,permissions:'[]'})
  const own=expectStatus(await request(employeeUser,'GET','/payroll/exemptions/mine'),200)
  assert.deepEqual(own.map(r=>r.id).sort((a,b)=>a-b),[x.ownerGrant.id,x.dmGrant.id].sort((a,b)=>a-b))
  assert.ok(!JSON.stringify(own).includes(x.far.fullName))
  assert.deepEqual(expectStatus(await request(x.noEmployee,'GET','/payroll/exemptions/mine'),200),[])
  const grantable=expectStatus(await request(users.dm,'GET','/payroll/exemptions/grantable-runs'),200)
  assert.ok(!grantable.some(r=>r.id===x.exclusiveRun.id))
  assert.equal(grantable.find(r=>r.id===x.shared.id).candidates,1)
  t.diagnostic(JSON.stringify({case:'authorized-grants-and-read-scope',ownerAmount:x.ownerGrant.estimatedAmount,departmentAmount:x.dmGrant.estimatedAmount,companyOwnerAmount:x.foreignGrant.estimatedAmount,ownRows:own.length,sharedCandidates:1}))
})

test('CR24 foreign-only run metadata must not pass an out-of-scope structural department relationship',async t=>{
  const x=independent,results=[]
  for(const suffix of ['/candidates','']){
    const r=await request(users.dm,'GET',`/payroll/exemptions/runs/${x.exclusiveRun.id}${suffix}`)
    results.push({route:suffix||'run-view',status:r.status,body:{run:r.body.run,employees:r.body.employees,exemptions:r.body.exemptions,permissions:r.body.permissions}})
  }
  // Same viewer and persisted run, changing only the cross-branch structural relation.
  const controls=[]
  await repo('Department').update(x.foreignDepartment.id,{managerEmployeeId:null})
  try{
    for(const suffix of ['/candidates','']){
      const r=await request(users.dm,'GET',`/payroll/exemptions/runs/${x.exclusiveRun.id}${suffix}`)
      expectStatus(r,403,'EXEMPTION_RUN_OUT_OF_SCOPE');controls.push({route:suffix||'run-view',status:r.status,body:r.body})
    }
  }finally{await repo('Department').update(x.foreignDepartment.id,{managerEmployeeId:people.dm.id})}
  assert.equal(await repo('PayrollFinancialExemption').countBy({runId:x.exclusiveRun.id,grantedByUserId:users.dm.id}),0)
  t.diagnostic(JSON.stringify({case:'foreign-only-exemption-run',viewerBranch:org.branch.id,employeeBranch:x.foreignBranch.id,viewerPermissions:JSON.parse(users.dm.permissions),ownHistoricalGrants:0,results,withoutStructuralRelationship:controls}))
  for(const r of results){assert.equal(r.status,403,'Foreign-only run must be denied before returning its identifying metadata');assert.ok(!JSON.stringify(r.body).includes(x.exclusiveRun.name))}
})

