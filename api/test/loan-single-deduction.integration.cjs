// قرار المالك 30 سبتمبر: السلفة العادية بتتخصم مرة واحدة (شهر واحد)؛ التقسيط للسلفة الاستثنائية بس (loans.exceptional).
// تكامل حقيقي عبر AppModule وJWT وSQL في قاعدة مؤقتة خاصة بالاختبار فقط: تقديم الموظف، والمسودة، والنيابة (باعتماد فوري وبدونه)،
// ومعاينة السقف، وطلب معلّق قبل القرار بيتعتمد بأشهره المحفوظة، وقائمة السلف ودفتر الموظف بنوع السلفة.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_loan_single_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-loan-single-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const { addMonths, loanCapWindow } = require('../src/loans/loan-caps')
const REGULAR_ONLY = 'السلفة العادية بتتخصم مرة واحدة؛ التقسيط للسلفة الاستثنائية بس'
let app, master, ds, base, created = false
const f = {}

function guarded() { assert.match(database, /^hr_loan_single_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE); if (ds) assert.equal(ds.options.database, database) }
const repo = name => { guarded(); return ds.getRepository(name) }
const raw = async (text, values = []) => { guarded(); return ds.query(text, values) }
const localDate = (value = new Date()) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
function token(user) { return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null, tokenVersion: user.tokenVersion ?? 0, permissions: JSON.parse(user.permissions || '[]') }) }
async function http(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(user)}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text(); return { status: response.status, body: text ? JSON.parse(text) : null }
}
function expect(result, status) { assert.equal(result.status, status, JSON.stringify(result.body)); return result.body }
const loan = (user, payload, extra = {}) => http(user, 'POST', '/requests', { typeCode: 'LOAN', submit: true, payload, ...extra })
const act = (user, id) => http(user, 'POST', `/requests/${id}/act`, { action: 'APPROVE', comment: 'اعتماد السلفة' })
const requestCount = async () => (await raw('SELECT COUNT(*) AS n FROM requests'))[0].n
async function storedPayload(id) { return JSON.parse((await raw('SELECT payload FROM requests WHERE id=@0', [id]))[0].payload) }
async function loanOf(requestId) {
  return (await raw(`SELECT id,CONVERT(varchar(40),amount) AS amount,isExceptional,installmentMonths FROM loans WHERE requestId=@0`, [requestId]))[0]
}
async function installmentsOf(loanId) {
  return raw('SELECT CONVERT(varchar(10),dueDate,23) AS dueDate,CONVERT(varchar(40),amount) AS amount FROM loan_installments WHERE loanId=@0 ORDER BY id', [loanId])
}
function refusedAsInstallments(body) {
  assert.equal(body.code, 'LOAN_REGULAR_SINGLE_DEDUCTION', JSON.stringify(body))
  assert.equal(body.message, REGULAR_ONLY)
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

  const chain = await repo('ApprovalChain').save({ code: 'SINGLE_LOAN', nameAr: 'سلسلة السلف: المدير ثم الموارد البشرية', isActive: true, autoApprove: false })
  await repo('ApprovalStep').save([{ chainId: chain.id, stepOrder: 1, approverRole: 'direct_manager_of_requester' }, { chainId: chain.id, stepOrder: 2, approverRole: 'hr' }])
  // نفس إعداد البذرة: amount وmonths في الحقول المطلوبة — والشهر الغايب لازم يعدّي
  await repo('RequestType').save({ code: 'LOAN', nameAr: 'سلفة', category: 'financial', destinationHandler: 'loans_installments', requiredFields: '["amount","months"]', approvalChainId: chain.id, isActive: true })

  f.branch = await repo('Branch').save({ code: 'SGL_B', name: 'فرع السلفة الواحدة' })
  f.department = await repo('Department').save({ code: 'SGL_D', name: 'قسم السلفة الواحدة', branchId: f.branch.id })
  const person = (code, extra = {}) => repo('Employee').save({ employeeCode: code, fullName: `موظف ${code}`, branchId: f.branch.id, departmentId: f.department.id,
    joinDate: '2020-01-01', basicSalary: 8000, housingAllowance: 2000, transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0,
    status: 'active', isActive: true, payMethod: 'cash', annualLeaveEntitled: false, ...extra })
  const user = (employee, suffix, permissions = [], role = 'employee') => repo('User').save({ employeeId: employee?.id ?? null, branchId: f.branch.id,
    email: `sgl-${suffix}@test.invalid`, displayName: suffix, role, passwordHash: 'isolated-token-only', permissions: JSON.stringify(permissions) })
  f.managerEmployee = await person('SGLM'); f.employee = await person('SGLE', { managerEmployeeId: f.managerEmployee.id })
  f.hrEmployee = await person('SGLH'); f.deskEmployee = await person('SGLK')
  f.owner = await user(f.employee, 'owner'); f.manager = await user(f.managerEmployee, 'manager')
  // صاحب قرار الموارد البشرية (اعتماد فوري نيابةً) ومعاه السلفة الاستثنائية
  f.hr = await user(f.hrEmployee, 'hr', ['requests.view_all', 'requests.create_on_behalf', 'approve.hr', 'loans.exceptional', 'payroll.view'])
  // تقديم نيابةً بلا صلاحية السلفة الاستثنائية وبلا اعتماد فوري
  f.desk = await user(f.deskEmployee, 'desk', ['requests.view_all', 'requests.create_on_behalf'])
  const cycle = Number((await repo('RequestsConfig').findOneBy({ key: 'payroll.cycle_start_day' }))?.value ?? 23)
  f.firstPeriod = addMonths(loanCapWindow('PAYROLL_PERIOD', localDate(), cycle).period, 1)
}, { timeout: 60000 })

after(async () => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      guarded()
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('name', database).query('SELECT DB_ID(@name) AS id')).recordset[0].id, null)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir())); assert.match(path.basename(uploads), /^hr-loan-single-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'تعذر تنظيف موارد اختبار السلفة الواحدة')
})

test('the employee: a regular loan with more than one month is refused (direct and draft submit, nothing left behind); one month or no month at all is one deduction', async () => {
  const before = await requestCount()
  refusedAsInstallments(expect(await loan(f.owner, { amount: '500.00', months: 3 }), 400))
  refusedAsInstallments(expect(await loan(f.owner, { amount: '500.00', months: '2' }), 400))
  assert.equal(await requestCount(), before, 'a refused direct submission leaves no draft')
  // المسودة بتتحفظ، والتقديم بتاعها هو اللي بيترفض وبتفضل مسودة
  const draft = expect(await loan(f.owner, { amount: '500.00', months: 4 }, { submit: false }), 201)
  assert.equal(draft.status, 'DRAFT')
  refusedAsInstallments(expect(await http(f.owner, 'POST', `/requests/${draft.id}/submit`), 400))
  assert.equal((await raw('SELECT status FROM requests WHERE id=@0', [draft.id]))[0].status, 'DRAFT')

  const missing = expect(await loan(f.owner, { amount: '400.00' }), 201)
  assert.equal(missing.status, 'UNDER_REVIEW')
  assert.equal((await storedPayload(missing.id)).months, 1, 'a missing month is stored as one deduction')
  const one = expect(await loan(f.owner, { amount: '300.00', months: 1 }), 201)
  assert.equal((await storedPayload(one.id)).months, 1)
  f.pendingRegularId = missing.id
})

test('HR on behalf: the same rule — more than one month refused, a missing month is approved at once as one installment', async () => {
  const before = await requestCount()
  refusedAsInstallments(expect(await loan(f.hr, { amount: '200.00', months: 2 }, { onBehalfEmployeeId: f.employee.id }), 400))
  refusedAsInstallments(expect(await loan(f.desk, { amount: '200.00', months: 6 }, { onBehalfEmployeeId: f.employee.id }), 400))
  assert.equal(await requestCount(), before)
  const done = expect(await loan(f.hr, { amount: '200.00' }, { onBehalfEmployeeId: f.employee.id }), 201)
  assert.equal(done.status, 'COMPLETED')
  const row = await loanOf(done.id)
  assert.deepEqual([row.amount, Boolean(row.isExceptional), row.installmentMonths], ['200.00', false, 1])
  assert.deepEqual((await installmentsOf(row.id)).map(item => item.amount), ['200.00'])
  f.regularLoanId = row.id
})

test('an exceptional loan keeps its installments for loans.exceptional, and is refused without it (the employee and on-behalf without the permission)', async () => {
  const payload = { amount: '1200.00', months: 4, exceptional: true, exceptionalCategory: 'MEDICAL', reason: 'علاج طارئ موثق بتقرير طبي', firstInstallmentPeriod: f.firstPeriod }
  const before = await requestCount()
  expect(await loan(f.owner, payload), 403)
  expect(await loan(f.desk, payload, { onBehalfEmployeeId: f.employee.id }), 403)
  assert.equal(await requestCount(), before)
  const done = expect(await loan(f.hr, payload, { onBehalfEmployeeId: f.employee.id }), 201)
  assert.equal(done.status, 'COMPLETED')
  const row = await loanOf(done.id)
  assert.deepEqual([row.amount, Boolean(row.isExceptional), row.installmentMonths], ['1200.00', true, 4])
  assert.deepEqual((await installmentsOf(row.id)).map(item => [item.dueDate, item.amount]), [0, 1, 2, 3].map(i => [`${addMonths(f.firstPeriod, i)}-01`, '300.00']))
  f.exceptionalLoanId = row.id
})

test('the cap preview: more than one month only for loans.exceptional; one month or none works for everyone', async () => {
  refusedAsInstallments(expect(await http(f.owner, 'GET', '/loans/cap-preview?amount=100&months=3'), 400))
  refusedAsInstallments(expect(await http(f.desk, 'GET', `/loans/cap-preview?employeeId=${f.employee.id}&amount=100&months=2`), 400))
  assert.equal(expect(await http(f.owner, 'GET', '/loans/cap-preview?amount=100'), 200).months, 1)
  assert.equal(expect(await http(f.owner, 'GET', '/loans/cap-preview?amount=100&months=1'), 200).months, 1)
  assert.equal(expect(await http(f.hr, 'GET', `/loans/cap-preview?employeeId=${f.employee.id}&amount=100&months=3`), 200).months, 3)
})

test('a regular request submitted before the rule and still pending is approved with its stored months (existing loans untouched)', async () => {
  // طلب معلّق من قبل القرار: حمولته المحفوظة 3 أشهر (نحاكيها في القاعدة المؤقتة) — الاعتماد مابيعيدش فحص الشهر
  await raw("UPDATE requests SET payload=JSON_MODIFY(payload,'$.months',3) WHERE id=@0", [f.pendingRegularId])
  const regularBefore = await installmentsOf(f.regularLoanId), exceptionalBefore = await installmentsOf(f.exceptionalLoanId)
  expect(await act(f.manager, f.pendingRegularId), 201)
  expect(await act(f.hr, f.pendingRegularId), 201)
  assert.equal((await raw('SELECT status FROM requests WHERE id=@0', [f.pendingRegularId]))[0].status, 'COMPLETED')
  const row = await loanOf(f.pendingRegularId)
  assert.deepEqual([row.amount, Boolean(row.isExceptional), row.installmentMonths], ['400.00', false, 3])
  assert.deepEqual((await installmentsOf(row.id)).map(item => item.amount), ['133.33', '133.33', '133.34'])
  f.legacyLoanId = row.id
  assert.deepEqual(await installmentsOf(f.regularLoanId), regularBefore)
  assert.deepEqual(await installmentsOf(f.exceptionalLoanId), exceptionalBefore)
})

test('the loans list and the employee ledger carry the loan kind (exceptional flag and installment count)', async () => {
  const listed = expect(await http(f.hr, 'GET', '/loans'), 200)
  const kind = id => { const row = listed.find(item => item.id === id); return [row.isExceptional, row.installmentMonths] }
  assert.deepEqual(kind(f.exceptionalLoanId), [true, 4])
  assert.deepEqual(kind(f.regularLoanId), [false, 1])
  assert.deepEqual(kind(f.legacyLoanId), [false, 3])
  const mine = expect(await http(f.owner, 'GET', '/loans/mine'), 200)
  assert.deepEqual(mine.map(item => [item.id, item.isExceptional, item.installmentMonths]).sort((a, b) => a[0] - b[0]),
    [[f.regularLoanId, false, 1], [f.exceptionalLoanId, true, 4], [f.legacyLoanId, false, 3]].sort((a, b) => a[0] - b[0]))
})
