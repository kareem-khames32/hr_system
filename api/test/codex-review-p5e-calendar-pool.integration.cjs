'use strict'
// B5.3 (أ) على SQL حقيقي: تقارير المصروفات — الميزة الفرعية مقفولة افتراضيًا، الترحيلات 149–151، الفئات وحدودها، البنود والإيصالات، التقديم كطلب
// (الخادم بيثبّت الإجمالي والبنود)، الإرجاع والرفض، والاعتماد النهائي بقيد دائن واحد في الدفتر. و(ب): سلفة المأمورية (ترحيل 152) — طلبها، تسجيل
// صرفها، ربطها بتقرير، وتسويتها في اعتماده (دائن أو مدين أو من غير قيد)، وبند إخلاء الطرف. و(ج): حد الفئة بالدرجة (ترحيل 153)، وأسعار البدل اليومي
// (154) وبند البدل اليومي المحسوب من الخادم. قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const migrate = require('../scripts/db-migrate.cjs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_expense_reports_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_expense_reports_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-expense-reports-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/expenses/expense-reports')
const advanceRules = require('../src/expenses/travel-advances')
const { openOffboardingCase } = require('../src/offboarding/offboarding-open')
const MIGRATIONS = ['20261009_149_expense_categories.sql', '20261009_150_expense_reports.sql', '20261009_151_expense_lines.sql', '20261009_152_travel_advances.sql', '20261009_153_expense_category_limits.sql',
  '20261009_154_per_diem_rates.sql'].map(name => path.resolve(apiRoot, '..', 'docs', 'migrations', 'payroll', name))
const TABLES = ['expense_categories', 'expense_reports', 'expense_lines', 'travel_advances', 'expense_category_limits', 'per_diem_rates']
let master, pool, app, ds, base, modules, created = false, sequence = 0
const B = {}, E = {}, U = {}, C = {}, G = {}
const repo = name => { assert.match(database, NAME); assert.equal(ds.options.database, database); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token(user) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const raw = await response.text(); let parsed = null
  try { parsed = raw ? JSON.parse(raw) : null } catch { parsed = raw }
  return { status: response.status, body: parsed }
}
const ok = (response, status = 200) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const refused = (response, status, message) => { assert.deepEqual([response.status, response.body?.message], [status, message]) }
const employee = (name, branch) => repo('Employee').save({ employeeCode: 'EX' + ++sequence, fullName: name, branchId: branch.id, joinDate: '2020-01-01',
  basicSalary: 5000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'cash' })
const account = (label, branch, permissions, extra = {}) => repo('User').save({ email: `${label}@expense-reports.invalid`, displayName: 'حساب ' + label, passwordHash: 'test-only', role: 'employee', branchId: branch.id,
  permissions: JSON.stringify(permissions), ...extra })
const runMigrations = async () => { assert.match(database, NAME); for (const file of MIGRATIONS) for (const batch of migrate.splitBatches(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'))) await pool.request().batch(batch) }
const tablesExist = async () => (await pool.request().query(`SELECT ${TABLES.map(name => `OBJECT_ID(N'dbo.${name}', N'U') AS [${name}]`).join(', ')}`)).recordset[0]
const day = offset => new Date(Date.now() + offset * 86400000).toLocaleDateString('en-CA')
const file = (user, employeeId, entityType = 'request') => repo('StoredFile').save({ originalName: 'receipt.pdf', storedName: `2026-10/${crypto.randomUUID()}.pdf`, mime: 'application/pdf', size: 10, entityType,
  uploadedBy: user.id, employeeId })
const M = '/expenses/my'
const mine = async user => ok(await request(user, 'GET', M))
const reportOf = async (user, id) => (await mine(user)).reports.find(row => row.id === id)
const newReport = async (user, title = 'مأمورية') => ok(await request(user, 'POST', `${M}/reports`, { title }), 201).id
const line = (user, reportId, body) => request(user, 'POST', `${M}/reports/${reportId}/lines`, { expenseDate: day(-2), ...body })
const send = (user, reportId, extra = {}) => request(user, 'POST', '/requests', { typeCode: 'EXPENSE_REPORT', payload: { reportId, ...extra }, submit: true })
const act = (user, id, action, note) => request(user, 'POST', `/requests/${id}/act`, { action, ...(note ? { comment: note } : {}) })
const entries = requestId => repo('EmployeeObligation').find({ where: { sourceRequestId: requestId } })

before(async () => {
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  const connection = { server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD, options: { encrypt: false, trustServerCertificate: true } }
  master = await new sql.ConnectionPool({ ...connection, database: 'master' }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  // مفيش رسالة بريد حقيقية بتطلع من الاختبار
  const mail = app.get(require('../src/auth/mail.service').MailService)
  mail.isConfigured = () => false
  mail.send = async () => { throw new Error('no mail in tests') }
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1'); ds = app.get(require('../node_modules/typeorm').DataSource)
  assert.equal(ds.options.database, database)
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  pool = await new sql.ConnectionPool({ ...connection, database }).connect()
  modules = app.get(require('../src/modules-registry/modules.service').ModulesService)
  B.riyadh = await repo('Branch').save({ code: 'EX_1', name: 'فرع الرياض', country: 'SA' })
  B.cairo = await repo('Branch').save({ code: 'EX_2', name: 'فرع القاهرة', country: 'EG' })
  U.admin = await repo('User').save({ email: 'admin@expense-reports.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', scopeAllBranches: true, permissions: '[]' })
  E.one = await employee('موظف أول', B.riyadh); E.two = await employee('موظف تاني', B.riyadh); E.cairo = await employee('موظف القاهرة', B.cairo)
  U.one = await account('one', B.riyadh, [], { employeeId: E.one.id }); U.two = await account('two', B.riyadh, [], { employeeId: E.two.id }); U.cairo = await account('cairo', B.cairo, [], { employeeId: E.cairo.id })
  U.finance = await account('finance', B.riyadh, ['expenses.manage']); U.financeCairo = await account('finance-cairo', B.cairo, ['expenses.manage'])
  U.approver = await account('approver', B.riyadh, ['approve.hr', 'requests.view_all'], { scopeAllBranches: true })
  U.loose = await account('loose', B.riyadh, [])
  const chain = await repo('ApprovalChain').save({ code: 'EX_HR', nameAr: 'سلسلة تقارير المصروفات', isActive: true, autoApprove: false })
  await repo('ApprovalStep').save({ chainId: chain.id, stepOrder: 1, approverRole: 'hr' })
  await seeded('RequestType',{ code: 'EXPENSE_REPORT', nameAr: 'تقرير مصروفات', category: 'financial', destinationHandler: rules.EXPENSE_REPORT_HANDLER, approvalChainId: chain.id, isActive: true,
    requiredFields: JSON.stringify(['reportId']) })
  await seeded('RequestType',{ code: 'TRAVEL_ADVANCE', nameAr: 'سلفة مأمورية', category: 'financial', destinationHandler: advanceRules.TRAVEL_ADVANCE_HANDLER, approvalChainId: chain.id, isActive: true,
    requiredFields: JSON.stringify(['amount', 'reason']) })
}, { timeout: 120000 })

after(async t => {
  if (app) await app.close()
  if (pool) await pool.close()
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


const latch=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve}}
let attendance,casual,holiday,chain
async function seeded(name,row){return repo(name).save({...await repo(name).findOneBy({code:row.code}),...row})}
async function calendarSetup(){
 attendance=app.get(require('../src/attendance/attendance.service').AttendanceService)
 await repo('Branch').update({id:B.riyadh.id},{weekendDays:'FRI,SAT'})
 chain=await repo('ApprovalChain').findOneByOrFail({code:'EX_HR'})
 casual=await seeded('LeaveType',{code:'CASUAL',nameAr:'Review leave',isPaid:true,balanceType:'none',backdateAllowed:false,countingMode:'WORKING_DAYS'})
 await seeded('RequestType',{code:'LEAVE_CASUAL',nameAr:'Review leave',category:'leaves',destinationHandler:'leave_calendar_payroll',approvalChainId:chain.id,affectsBalance:false,requiredFields:'["fromDate","toDate"]',isActive:true})
 holiday=await seeded('RequestType',{code:'HOLIDAY_WORK',nameAr:'Review holiday',category:'time_attendance',destinationHandler:'holiday_work',approvalChainId:chain.id,requiredFields:'["dates","reason"]',isActive:true})
 await repo('PublicHoliday').save({name:'Review holiday',date:'2026-12-30',country:'SA',audience:null})
}
async function drafts(code,payload){const out=[];for(let i=0;i<10;i++)out.push(ok(await request(U.one,'POST','/requests',{typeCode:code,payload,submit:false}),201).id);return out}
async function fullPool(target,method,ids,expected){
 const original=target[method],release=latch(),p=ds.driver.master.pool,timeout=p.acquireTimeoutMillis,pending=[];let entered=0;p.acquireTimeoutMillis=2000
 target[method]=async function(...args){if(entered<10){entered++;await release.promise}return original.apply(this,args)}
 try{for(let i=0;i<10;i++){pending.push(request(U.one,'POST','/requests/'+ids[i]+'/submit',{}).then(r=>{if(entered<i+1)console.log(JSON.stringify({REVIEW_MEASURE:method,early:r}));return r}));const end=Date.now()+6000;while(entered<i+1&&Date.now()<end)await new Promise(r=>setTimeout(r,20));assert.equal(entered,i+1,'barrier '+method)}const occupied={used:p.numUsed(),free:p.numFree()};assert.deepEqual(occupied,{used:10,free:0});release.resolve();const result=await Promise.all(pending);assert.deepEqual(result.map(r=>r.status),Array(10).fill(expected),JSON.stringify(result.map(r=>r.body?.message)));return{occupied,statuses:result.map(r=>r.status)}}finally{release.resolve();await Promise.allSettled(pending);target[method]=original;p.acquireTimeoutMillis=timeout}
}
async function calendarPool(method,ids){
 const batch=attendance.batchScope,release=latch(),p=ds.driver.master.pool,timeout=p.acquireTimeoutMillis,pending=[],seen=new Set();let entered=0;p.acquireTimeoutMillis=2000
 attendance.batchScope=function(em){assert.equal(em.queryRunner.isTransactionActive,true);const scope=batch.call(this,em),original=scope[method];scope[method]=async function(...args){if(!seen.has(em.queryRunner)){seen.add(em.queryRunner);entered++;await release.promise}return original.apply(this,args)};return scope}
 try{for(let i=0;i<10;i++){pending.push(request(U.one,'POST','/requests/'+ids[i]+'/submit',{}).then(r=>{if(entered<i+1)console.log(JSON.stringify({REVIEW_MEASURE:method,early:r}));return r}));const end=Date.now()+6000;while(entered<i+1&&Date.now()<end)await new Promise(r=>setTimeout(r,20));assert.equal(entered,i+1,'calendar barrier')}const occupied={used:p.numUsed(),free:p.numFree()};assert.deepEqual(occupied,{used:10,free:0});release.resolve();const result=await Promise.all(pending);assert.deepEqual(result.map(r=>r.status),Array(10).fill(201),JSON.stringify(result.map(r=>r.body?.message)));return{occupied,statuses:result.map(r=>r.status)}}finally{release.resolve();await Promise.allSettled(pending);attendance.batchScope=batch;p.acquireTimeoutMillis=timeout}
}
test('P5E-L01: transaction calendar matches ordinary calendar across holiday/weekend/year boundary',async t=>{
 await calendarSetup()
 await calendarSetup()
 const dates=['2026-12-28','2026-12-30','2027-01-01','2027-01-04'],old=[]
 for(const date of dates)old.push(await attendance.calendarDay(E.one.id,date))
 const days=await attendance.workingDaysForEmployee(E.one.id,'2026-12-28','2027-01-04')
 await ds.transaction(async em=>{const scoped=attendance.batchScope(em);for(let i=0;i<dates.length;i++)assert.deepEqual(await scoped.calendarDay(E.one.id,dates[i]),old[i]);assert.deepEqual(await scoped.workingDaysForEmployee(E.one.id,'2026-12-28','2027-01-04'),days)})
 assert.equal(days.total,8);assert.equal(days.working,5)
 t.diagnostic(JSON.stringify({id:'P5E-L01',days,matched:true}))
})
test('P5E-L02: leave calendar and year-split calls complete with a full pool',async t=>{
 const ids=await drafts('LEAVE_CASUAL',{fromDate:'2026-12-28',toDate:'2027-01-04'})
 const result=await calendarPool('workingDaysForEmployee',ids)
 for(const id of ids){const p=JSON.parse((await repo('Request').findOneByOrFail({id})).payload);assert.equal(p.days,5);assert.deepEqual(p.daysByYear,{'2026':3,'2027':2})}
 t.diagnostic(JSON.stringify({id:'P5E-L02',...result,days:5}))
})
test('P5E-L03: holiday calendar lookup completes with a full pool and rejects an ordinary workday',async t=>{
 const ids=await drafts('HOLIDAY_WORK',{dates:['2026-10-02'],reason:'Synthetic weekend work'})
 t.diagnostic(JSON.stringify({id:'P5E-L03',...await calendarPool('calendarDay',ids)}))
 const bad=await request(U.one,'POST','/requests',{typeCode:'HOLIDAY_WORK',payload:{dates:['2026-10-05'],reason:'Synthetic ordinary day'},submit:true});assert.equal(bad.status,400)
})
test('P5E-L04: default backdate-policy read uses the held transaction connection inside leave submit',async t=>{
 await repo('LeaveType').update({id:casual.id},{backdateAllowed:true,backdateMaxDays:null})
 const ids=await drafts('LEAVE_CASUAL',{fromDate:'2027-02-01',toDate:'2027-02-01'}),balances=app.get(require('../src/requests/requests.service').RequestsService).leaveBalances
 const result=await fullPool(balances,'maxBackdateDays',ids,201)
 t.diagnostic(JSON.stringify({id:'P5E-L04',...result,closed:true}))
})
test('P5E-L05: balance sufficiency reads use the held transaction connection inside leave submit',async t=>{
 await seeded('LeaveType',{code:'ANNUAL',nameAr:'Review annual',isPaid:true,balanceType:'annual',backdateAllowed:false,countingMode:'WORKING_DAYS',annualDays:100,entitlementStartMonths:0})
 await seeded('RequestType',{code:'LEAVE_ANNUAL',nameAr:'Review annual',category:'leaves',destinationHandler:'leave_calendar_balance',approvalChainId:chain.id,affectsBalance:true,requiredFields:'["fromDate","toDate"]',isActive:true})
 const ids=await drafts('LEAVE_ANNUAL',{fromDate:'2027-03-01',toDate:'2027-03-01'}),balances=app.get(require('../src/requests/requests.service').RequestsService).leaveBalances
 const result=await fullPool(balances,'assertSufficient',ids,201)
 t.diagnostic(JSON.stringify({id:'P5E-L05',...result,closed:true}))
})
