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
  await repo('RequestType').save({ code: 'EXPENSE_REPORT', nameAr: 'تقرير مصروفات', category: 'financial', destinationHandler: rules.EXPENSE_REPORT_HANDLER, approvalChainId: chain.id, isActive: true,
    requiredFields: JSON.stringify(['reportId']) })
  await repo('RequestType').save({ code: 'TRAVEL_ADVANCE', nameAr: 'سلفة مأمورية', category: 'financial', destinationHandler: advanceRules.TRAVEL_ADVANCE_HANDLER, approvalChainId: chain.id, isActive: true,
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


const identity=user=>jwt.verify(token(user))
const setAudience=(key,audience)=>modules.setModule(identity(U.admin),key,{audience})
test('P5C-M01: transaction reader matches cached reader for audiences, privileges, dependencies and disabled modules',async t=>{
 const d=await repo('Department').save({name:'Review department',branchId:B.riyadh.id,managerEmployeeId:E.one.id})
 const team=await repo('Team').save({name:'Review team',departmentId:d.id,leaderEmployeeId:E.one.id})
 await repo('Employee').update({id:E.one.id},{departmentId:d.id,teamId:team.id})
 const cases=[
  ['roles',{mode:'roles',ids:['employee']},[true,true,true,true,true]],
  ['employees',{mode:'employees',ids:[E.one.id]},[true,false,false,false,true]],
  ['departments',{mode:'departments',ids:[d.id]},[true,false,false,false,true]],
  ['branch',{mode:'all',where:{mode:'branches',ids:[B.riyadh.id]}},[true,true,false,true,true]],
  ['team',{mode:'all',where:{mode:'teams',ids:[team.id]}},[true,false,false,false,true]],
  ['department-manager',{mode:'positions',ids:['DEPARTMENT_MANAGERS']},[true,false,false,false,true]],
  ['team-leader',{mode:'positions',ids:['TEAM_LEADERS']},[true,false,false,false,true]],
 ]
 const users=[U.one,U.two,U.cairo,U.loose,U.admin],checked=[]
 for(const [label,audience,expected] of cases){await setAudience('expenses',audience);modules.invalidate();const old=[],fresh=[]
  for(const user of users){old.push(await modules.allowedFor('expenses',identity(user)));fresh.push(await ds.transaction(em=>modules.allowedForIn(em,'expenses',identity(user))))}
  assert.deepEqual(old,expected,label);assert.deepEqual(fresh,old,label);checked.push(label)
 }
 await setAudience('attendance',{mode:'employees',ids:[E.one.id]});modules.invalidate()
 for(const [user,expected] of [[U.one,true],[U.two,false],[U.admin,true]]){assert.equal(await modules.allowedFor('shifts',identity(user)),expected);assert.equal(await ds.transaction(em=>modules.allowedForIn(em,'shifts',identity(user))),expected)}
 await modules.setModule(identity(U.admin),'expenses',{enabled:false});modules.invalidate()
 for(const user of [identity(U.one),identity(U.admin),null]){assert.equal(await modules.allowedFor('expenses',user),false);assert.equal(await ds.transaction(em=>modules.allowedForIn(em,'expenses',user)),false)}
 await modules.setModule(identity(U.admin),'expenses',{enabled:true,audience:null});await setAudience('attendance',null);modules.invalidate()
 t.diagnostic(JSON.stringify({id:'P5C-M01',audienceCases:checked,comparisons:41,matched:true}))
})
test('P5C-M02: employee location and organization reads use the transaction connection and see its writes',async t=>{
 await setAudience('expenses',{mode:'all',where:{mode:'branches',ids:[B.riyadh.id]}});modules.invalidate()
 assert.equal(await modules.allowedFor('expenses',identity(U.one)),true)
 const external=ds.getRepository;let calls=0
 await ds.transaction(async em=>{
  await em.getRepository(require('../src/employees/employee.entity').Employee).update({id:E.one.id},{branchId:B.cairo.id})
  ds.getRepository=function(){calls++;throw Error('External repository called within transaction')}
  try{assert.equal(await modules.allowedForIn(em,'expenses',identity(U.one)),false)}finally{ds.getRepository=external}
  await em.getRepository(require('../src/employees/employee.entity').Employee).update({id:E.one.id},{branchId:B.riyadh.id})
 })
 assert.equal(calls,0);await setAudience('expenses',null);modules.invalidate()
 t.diagnostic(JSON.stringify({id:'P5C-M02',movedEmployeeAllowed:false,externalRepositoryCalls:calls}))
})
test('P5C-M03: draft submit enforces module audience after cached admission changes',async t=>{
 ok(await request(U.admin,'PUT','/modules/features/'+rules.EXPENSE_REPORTS_FEATURE,{enabled:true}))
 const cat=await repo('ExpenseCategory').save({name:'Audience expense',limitMode:'BLOCK',receiptRequired:false,isActive:true,updatedByUserId:U.admin.id,updatedAt:new Date()})
 const id=await newReport(U.one,'Module gate'),added=ok(await line(U.one,id,{categoryId:cat.id,amount:15}),201)
 const draft=ok(await request(U.one,'POST','/requests',{typeCode:'EXPENSE_REPORT',payload:{reportId:id},submit:false}),201)
 await setAudience('expenses',{mode:'employees',ids:[E.cairo.id]});modules.invalidate()
 const denied=await request(U.one,'POST','/requests/'+draft.id+'/submit',{});assert.equal(denied.status,404)
 assert.equal((await repo('Request').findOneByOrFail({id:draft.id})).status,'DRAFT');assert.equal((await entries(draft.id)).length,0)
 await setAudience('expenses',null);modules.invalidate();ok(await request(U.one,'POST','/requests/'+draft.id+'/submit',{}),201)
 assert.equal((await request(U.one,'PATCH',M+'/reports/'+id+'/lines/'+added.id,{categoryId:cat.id,amount:900,expenseDate:day(-2)})).status,409)
 t.diagnostic(JSON.stringify({id:'P5C-M03',outsideAudience:404,requestStillDraft:true,editUnderReview:409}))
})
test('P5C-M04: both missing 076 tables match defaults in the same transaction; new expense feature stays closed',async t=>{
 await ds.query("EXEC sp_rename 'dbo.system_modules', 'codex_review_old_modules'")
 await ds.query("EXEC sp_rename 'dbo.system_module_features', 'codex_review_old_features'")
 try{modules.invalidate();const registry=require('../src/modules-registry/registry')
  for(const module of ['platform','expenses','shifts','performance']){
   const wanted=registry.moduleEnabled({modules:{},features:{}},module)
   assert.equal(await modules.allowedFor(module,identity(U.one)),wanted)
   assert.equal(await ds.transaction(em=>modules.allowedForIn(em,module,identity(U.one))),wanted)
  }
  assert.equal(await ds.transaction(em=>modules.isFeatureEnabledIn(em,rules.EXPENSE_REPORTS_FEATURE)),false)
  assert.equal((await request(U.one,'GET',M)).status,404)
 }finally{await ds.query("EXEC sp_rename 'dbo.codex_review_old_modules', 'system_modules'");await ds.query("EXEC sp_rename 'dbo.codex_review_old_features', 'system_module_features'");modules.invalidate()}
 t.diagnostic(JSON.stringify({id:'P5C-M04',missing076:true,expenseFeature:false,expenseRoute:404}))
})
