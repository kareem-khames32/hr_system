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


test('P5C-E01: first expense submission without a human approval is rejected',async t=>{
 ok(await request(U.admin,'PUT','/modules/features/'+rules.EXPENSE_REPORTS_FEATURE,{enabled:true}));modules.invalidate()
 const cat=await repo('ExpenseCategory').save({name:'Review expense',limitMode:'BLOCK',receiptRequired:false,isActive:true,updatedByUserId:U.admin.id,updatedAt:new Date()})
 const chain=ok(await request(U.admin,'POST','/settings/approval-chains',{code:'P5C_AUTO',nameAr:'Review automatic',steps:[]}),201)
 ok(await request(U.admin,'PATCH','/settings/approval-chains/'+chain.id,{autoApprove:true}))
 const type=await repo('RequestType').findOneByOrFail({code:'EXPENSE_REPORT'})
 ok(await request(U.admin,'PATCH','/settings/request-types/'+type.id,{approvalChainId:chain.id}))
 const id=await newReport(U.one)
 ok(await line(U.one,id,{categoryId:cat.id,amount:123}),201)
 const submitted=await send(U.one,id);assert.equal(submitted.status,400);assert.equal(submitted.body.message,rules.HUMAN_APPROVAL_REQUIRED)
 const actual=await repo('EmployeeObligation').find({where:{employeeId:E.one.id}})
 assert.equal(actual.length,0)
 const approvals=await repo('RequestApproval').count()
 assert.equal(approvals,0)
 t.diagnostic(JSON.stringify({id:'P5C-E01',money:0,ledgerRows:actual.length,humanApprovals:approvals}))
})

test('P5C-E02: return invalidates old approval; a fresh review posts the revised amount once',async t=>{
 const chain=ok(await request(U.admin,'POST','/settings/approval-chains',{code:'P5C_REVIEW',nameAr:'Review amount',steps:[{approverRole:'finance'},{approverRole:'hr'}]}),201)
 const type=await repo('RequestType').findOneByOrFail({code:'EXPENSE_REPORT'});ok(await request(U.admin,'PATCH','/settings/request-types/'+type.id,{approvalChainId:chain.id}))
 const reviewer=await account('review-amount',B.riyadh,['approve.finance','requests.view_all'])
 const cat=await repo('ExpenseCategory').findOneByOrFail({name:'Review expense'}),id=await newReport(U.one,'Returned amount')
 const added=ok(await line(U.one,id,{categoryId:cat.id,amount:123}),201),sent=ok(await send(U.one,id),201)
 ok(await act(reviewer,sent.id,'APPROVE'),201);assert.equal((await repo('Request').findOneByOrFail({id:sent.id})).status,'UNDER_REVIEW')
 ok(await act(U.admin,sent.id,'RETURN','Review needed'),201)
 ok(await request(U.one,'PATCH',M+'/reports/'+id+'/lines/'+added.id,{categoryId:cat.id,amount:999,expenseDate:day(-2)}))
 ok(await request(U.admin,'PATCH','/settings/approval-chains/'+chain.id+'/steps',{steps:[]}))
 ok(await request(U.admin,'PATCH','/settings/approval-chains/'+chain.id,{autoApprove:true}))
 const approvalsBefore=await repo('RequestApproval').count({where:{requestId:sent.id,action:'APPROVED'}})
 const again=await request(U.one,'POST','/requests/'+sent.id+'/resubmit',{});assert.equal(again.status,400);assert.equal(again.body.message,rules.HUMAN_APPROVAL_REQUIRED)
 const ledger=await entries(sent.id);assert.equal(ledger.length,0);assert.equal((await repo('Request').findOneByOrFail({id:sent.id})).status,'RETURNED_FOR_INFO')
 assert.equal(await repo('RequestApproval').count({where:{requestId:sent.id,action:'APPROVED'}}),approvalsBefore)
 t.diagnostic(JSON.stringify({id:'P5C-E02',reviewedAmount:123,postedAmount:0,oldApprovals:approvalsBefore,newApprovals:0,status:again.status}))
 ok(await request(U.admin,'PATCH','/settings/approval-chains/'+chain.id+'/steps',{steps:[{approverRole:'finance'},{approverRole:'hr'}]}))
 ok(await request(U.admin,'PATCH','/settings/approval-chains/'+chain.id,{autoApprove:false}))
 ok(await request(U.one,'POST','/requests/'+sent.id+'/resubmit',{}),201)
 assert.equal((await entries(sent.id)).length,0)
 ok(await act(reviewer,sent.id,'APPROVE'),201);ok(await act(U.admin,sent.id,'APPROVE'),201)
 const final=await entries(sent.id);assert.equal(final.length,1);assert.equal(Number(final[0].amount),999)
 const duplicate=await act(U.admin,sent.id,'APPROVE');assert.notEqual(duplicate.status,201);assert.equal((await entries(sent.id)).length,1)
 t.diagnostic(JSON.stringify({id:'P5C-E02-fresh-round',postedAmount:999,ledgerRows:1}))
})
test('P5C-E04: conditional steps disappearing cannot reuse an approval before return',async t=>{
 const chain=ok(await request(U.admin,'POST','/settings/approval-chains',{code:'P5C_CONDITIONAL',nameAr:'Review amount',steps:[{approverRole:'finance',thresholdField:'amount',thresholdOp:'<',thresholdValue:500},{approverRole:'hr',thresholdField:'amount',thresholdOp:'<',thresholdValue:500}]}),201)
 ok(await request(U.admin,'PATCH','/settings/approval-chains/'+chain.id,{autoApprove:true}))
 const type=await repo('RequestType').findOneByOrFail({code:'EXPENSE_REPORT'});ok(await request(U.admin,'PATCH','/settings/request-types/'+type.id,{approvalChainId:chain.id}))
 const reviewer=await account('review-conditional',B.riyadh,['approve.finance','requests.view_all'])
 const cat=await repo('ExpenseCategory').findOneByOrFail({name:'Review expense'}),id=await newReport(U.one,'Returned amount')
 const added=ok(await line(U.one,id,{categoryId:cat.id,amount:123}),201),sent=ok(await send(U.one,id),201)
 ok(await act(reviewer,sent.id,'APPROVE'),201);assert.equal((await repo('Request').findOneByOrFail({id:sent.id})).status,'UNDER_REVIEW')
 ok(await act(U.admin,sent.id,'RETURN','Review needed'),201)
 ok(await request(U.one,'PATCH',M+'/reports/'+id+'/lines/'+added.id,{categoryId:cat.id,amount:999,expenseDate:day(-2)}))
 const approvalsBefore=await repo('RequestApproval').count({where:{requestId:sent.id,action:'APPROVED'}})
 const again=await request(U.one,'POST','/requests/'+sent.id+'/resubmit',{});assert.equal(again.status,400);assert.equal(again.body.message,rules.HUMAN_APPROVAL_REQUIRED)
 const ledger=await entries(sent.id);assert.equal(ledger.length,0);assert.equal((await repo('Request').findOneByOrFail({id:sent.id})).status,'RETURNED_FOR_INFO')
 assert.equal(await repo('RequestApproval').count({where:{requestId:sent.id,action:'APPROVED'}}),approvalsBefore)
 t.diagnostic(JSON.stringify({id:'P5C-E04',reviewedAmount:123,postedAmount:0,oldApprovals:approvalsBefore,newApprovals:0,status:again.status}))
})

test('P5C-E05: authorized human HR on-behalf submission succeeds',async t=>{
 const chain=ok(await request(U.admin,'POST','/settings/approval-chains',{code:'P5C_ONBEHALF',nameAr:'Human review',steps:[{approverRole:'hr'}]}),201)
 const type=await repo('RequestType').findOneByOrFail({code:'EXPENSE_REPORT'});ok(await request(U.admin,'PATCH','/settings/request-types/'+type.id,{approvalChainId:chain.id}))
 const cat=await repo('ExpenseCategory').findOneByOrFail({name:'Review expense'}),id=await newReport(U.one,'Reviewed by HR')
 ok(await line(U.one,id,{categoryId:cat.id,amount:222}),201)
 const result=await request(U.admin,'POST','/requests',{typeCode:'EXPENSE_REPORT',onBehalfEmployeeId:E.one.id,payload:{reportId:id},submit:true})
 ok(result,201);const ledger=await entries(result.body.id);assert.equal(ledger.length,1);assert.equal(Number(ledger[0].amount),222)
 t.diagnostic(JSON.stringify({id:'P5C-E05',status:result.status,validHumanOnBehalfAccepted:true}))
})

test('P5C-E06: custom expense and travel handlers cannot bypass first human approval',async t=>{
 const chain=await repo('ApprovalChain').findOneByOrFail({code:'P5C_AUTO'}),cat=await repo('ExpenseCategory').findOneByOrFail({name:'Review expense'}),id=await newReport(U.one,'Custom expense')
 ok(await line(U.one,id,{categoryId:cat.id,amount:17}),201)
 for(const [code,destinationHandler,payload] of [['P5C_CUSTOM_EXPENSE',rules.EXPENSE_REPORT_HANDLER,{reportId:id}],['P5C_CUSTOM_ADVANCE',advanceRules.TRAVEL_ADVANCE_HANDLER,{amount:30,reason:'Review travel'}]]){
  ok(await request(U.admin,'POST','/settings/request-types',{code,nameAr:code,category:'financial',destinationHandler,approvalChainId:chain.id}),201)
  const result=await request(U.one,'POST','/requests',{typeCode:code,payload,submit:true})
  assert.equal(result.status,400);assert.equal(result.body.message,rules.HUMAN_APPROVAL_REQUIRED)
 }
 t.diagnostic(JSON.stringify({id:'P5C-E06',customExpense:400,customAdvance:400}))
})
