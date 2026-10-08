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


const latch=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve}}
test('P5C-E03: ten expense submissions succeed with all pool connections held',async t=>{
 ok(await request(U.admin,'PUT','/modules/features/'+rules.EXPENSE_REPORTS_FEATURE,{enabled:true}));modules.invalidate()
 const cat=await repo('ExpenseCategory').save({name:'Pool expense',limitMode:'BLOCK',receiptRequired:false,isActive:true,updatedByUserId:U.admin.id,updatedAt:new Date()});const drafts=[];for(let i=0;i<10;i++){const id=await newReport(U.one,'Pool '+i);ok(await line(U.one,id,{categoryId:cat.id,amount:5}),201);drafts.push(ok(await request(U.one,'POST','/requests',{typeCode:'EXPENSE_REPORT',payload:{reportId:id},submit:false}),201))}
 const pool=ds.driver.master.pool;assert.equal(pool.max,10)
 const feature=modules.isFeatureEnabledIn,write=modules.write,invalidate=modules.invalidate
 const all=latch(),release=latch(),committed=latch(),releaseSetting=latch(),invalidated=latch();let entered=0,timer,pending,setting,occupied
 const timeout=pool.acquireTimeoutMillis;pool.acquireTimeoutMillis=2000
 modules.isFeatureEnabledIn=async function(em,key){assert.equal(em.queryRunner.isTransactionActive,true);if(key===rules.EXPENSE_REPORTS_FEATURE&&entered<10){if(++entered===10)all.resolve();await release.promise}return feature.call(this,em,key)}
 modules.write=async function(work){await write.call(this,work);committed.resolve();await releaseSetting.promise}
 modules.invalidate=function(){invalidate.call(this);invalidated.resolve()}
 try{
  setting=request(U.admin,'PUT','/modules/features/'+rules.EXPENSE_REPORTS_FEATURE,{enabled:true})
  await Promise.race([committed.promise,setting.then(r=>{throw Error('settings missed barrier '+r.status)})])
  const calls=[];pending=Promise.all([]);for(let i=0;i<drafts.length;i++){calls.push(request(U.one,'POST','/requests/'+drafts[i].id+'/submit',{}));pending=Promise.all(calls);const until=Date.now()+5000;while(entered<i+1&&Date.now()<until)await new Promise(r=>setTimeout(r,20));assert.equal(entered,i+1,'submission '+i+' must reach feature read')}
  await Promise.race([all.promise,pending.then(()=>{throw Error('completed before barrier')}),new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('all barriers not reached: '+entered)),8000))]);clearTimeout(timer)
  occupied={max:pool.max,used:pool.numUsed(),free:pool.numFree()}
  releaseSetting.resolve();await invalidated.promise;release.resolve()
  const result=await pending;const settingResult=await setting
  assert.equal(occupied.used,10);assert.equal(occupied.free,0);assert.deepEqual(result.map(r=>r.status),Array(10).fill(201));ok(settingResult)
   t.diagnostic(JSON.stringify({id:'P5C-E03',featureOn:true,occupied,statuses:result.map(r=>r.status),settingStatus:settingResult.status}))
 }finally{clearTimeout(timer);release.resolve();releaseSetting.resolve();await Promise.allSettled([pending,setting].filter(Boolean));modules.isFeatureEnabledIn=feature;modules.write=write;modules.invalidate=invalidate;pool.acquireTimeoutMillis=timeout}
})

test('P5C-E10: ten expense submissions succeed including audience reads with all pool connections held',async t=>{
 ok(await request(U.admin,'PUT','/modules/features/'+rules.EXPENSE_REPORTS_FEATURE,{enabled:true}));modules.invalidate()
 await modules.setModule(jwt.verify(token(U.admin)),'expenses',{audience:{mode:'all',where:{mode:'branches',ids:[B.riyadh.id]}}});modules.invalidate()
 const cat=await repo('ExpenseCategory').save({name:'Audience pool expense',limitMode:'BLOCK',receiptRequired:false,isActive:true,updatedByUserId:U.admin.id,updatedAt:new Date()});const drafts=[];for(let i=0;i<10;i++){const id=await newReport(U.one,'Pool '+i);ok(await line(U.one,id,{categoryId:cat.id,amount:5}),201);drafts.push(ok(await request(U.one,'POST','/requests',{typeCode:'EXPENSE_REPORT',payload:{reportId:id},submit:false}),201))}
 const pool=ds.driver.master.pool;assert.equal(pool.max,10)
 const feature=modules.allowedForIn,write=modules.write,invalidate=modules.invalidate
 const all=latch(),release=latch(),committed=latch(),releaseSetting=latch(),invalidated=latch();let entered=0,timer,pending,setting,occupied
 const timeout=pool.acquireTimeoutMillis;pool.acquireTimeoutMillis=2000
 modules.allowedForIn=async function(em,key,user){assert.equal(em.queryRunner.isTransactionActive,true);if(key==='expenses'&&entered<10){if(++entered===10)all.resolve();await release.promise}return feature.call(this,em,key,user)}
 modules.write=async function(work){await write.call(this,work);committed.resolve();await releaseSetting.promise}
 modules.invalidate=function(){invalidate.call(this);invalidated.resolve()}
 try{
  setting=request(U.admin,'PUT','/modules/features/'+rules.EXPENSE_REPORTS_FEATURE,{enabled:true})
  await Promise.race([committed.promise,setting.then(r=>{throw Error('settings missed barrier '+r.status)})])
  const calls=[];pending=Promise.all([]);for(let i=0;i<drafts.length;i++){calls.push(request(U.one,'POST','/requests/'+drafts[i].id+'/submit',{}));pending=Promise.all(calls);const until=Date.now()+5000;while(entered<i+1&&Date.now()<until)await new Promise(r=>setTimeout(r,20));assert.equal(entered,i+1,'submission '+i+' must reach feature read')}
  await Promise.race([all.promise,pending.then(()=>{throw Error('completed before barrier')}),new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('all barriers not reached: '+entered)),8000))]);clearTimeout(timer)
  occupied={max:pool.max,used:pool.numUsed(),free:pool.numFree()}
  releaseSetting.resolve();await invalidated.promise;release.resolve()
  const result=await pending;const settingResult=await setting
  assert.equal(occupied.used,10);assert.equal(occupied.free,0);assert.deepEqual(result.map(r=>r.status),Array(10).fill(201));ok(settingResult)
   t.diagnostic(JSON.stringify({id:'P5C-E10',featureOn:true,occupied,statuses:result.map(r=>r.status),settingStatus:settingResult.status}))
 }finally{clearTimeout(timer);release.resolve();releaseSetting.resolve();await Promise.allSettled([pending,setting].filter(Boolean));modules.allowedForIn=feature;modules.write=write;modules.invalidate=invalidate;pool.acquireTimeoutMillis=timeout}
})
