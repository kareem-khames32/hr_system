'use strict'
// B4.4 (ب) — الخصومات القانونية المصرية في المسير على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر (hr_payroll_statutory_test_<16 hex>):
//  PS-01) الإعدادين مقفولين (الافتراضي): البند زي ما هو بالحرف — مفيش breakdown.statutory والصافي والسطور زي الأول.
//  PS-02) الإعدادين مفتوحين: راتب 15,000 ← ضريبة 1,482.50 وصندوق الشهداء 7.50 بيتطرحوا من الصافي ويتسجّلوا بلقطة الحساب، وسطرين في القسيمة
//         وجدول المسير، والفرع السعودي زي ما هو، والمسير بيتعتمد، والمعاينة بتعرض المحفوظ.
//  PS-03) التراكمي: الشهر التاني بياخد اللي اتسجّل في الأول، والزيادة بتتسوّى، وإعادة الحساب بنفس الأرقام، وفترة قبل «فترة البداية» من غير ضريبة.
//  PS-04) قارئ الرصيد التراكمي: مسير تكميلي لنفس الفترة مابيعدّش أيامها تاني، والبند اللي اتعكس صرفه والمسير الملغى برّه.
// مفيش مسار في المنتج بيفتح الإعدادين في الدفعة دي (بييجي مع التقارير في الجزء ج) — الاختبار بيكتب مفاتيحهم مباشرة.
// Run (من api/): node --test test/payroll-statutory.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_payroll_statutory_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_payroll_statutory_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-statutory-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const run = require('../src/payroll/payroll-statutory-run')
const tax = require('../src/payroll/eg-salary-tax')
let app, master, ds, base, created = false, employeeNumber = 0
const org = {}, users = {}, state = {}

function assertDisposable() {
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(user)}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const expectStatus = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
async function employee(branch, overrides = {}) {
  const n = ++employeeNumber
  const emp = await repo('Employee').save({ employeeCode: `PST${String(n).padStart(3, '0')}`, fullName: `موظف الخصم القانوني ${n}`, nationality: 'مصري', branchId: branch.id, joinDate: '2020-01-01',
    basicSalary: 15000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0, gosiBaseSalary: 15000, isGosiRegistered: true,
    status: 'active', isActive: true, payMethod: 'transfer', ...overrides })
  await repo('AttendanceExemption').save({ employeeId: emp.id, effectiveFrom: '2026-01-01', effectiveTo: '2027-12-31', reasonCode: 'field_role', reason: 'نافذة اختبار الخصم القانوني المعزولة', status: 'APPROVED',
    createdByUserId: users.admin.id, approvedByUserId: users.admin.id, approvedAt: new Date('2026-01-01T08:00:00Z'), terminatedFrom: null, overtimeEligibleOverride: null, unpaidLeaveDeductibleOverride: null,
    requiresCheckinForPresence: false })
  return emp
}
const runFor = async (period, employees, name) => expectStatus(await request(users.admin, 'POST', '/payroll/runs/calculate-defined', { period, scopeType: 'CUSTOM', employeeIds: employees.map(emp => emp.id),
  name: name ?? `مسير الخصم القانوني ${period} ${crypto.randomUUID().slice(0, 8)}` }), 201)
const itemOf = (result, emp) => result.items.find(row => row.employeeId === emp.id)
const statutoryOf = item => JSON.parse(item.breakdown).statutory
const settings = rows => repo('RequestsConfig').save(Object.entries(rows).map(([key, value]) => ({ key, value })))
const CALCULATOR_KEYS = ['eg.salary_tax.brackets', 'eg.salary_tax.high_income', 'eg.martyrs_fund', 'eg.health_insurance']
const verify = (verified, keys = CALCULATOR_KEYS) => ds.query(`UPDATE [statutory_definitions] SET [verified] = @0 WHERE [key] IN (${keys.map((_, index) => `@${index + 1}`).join(', ')})`, [verified ? 1 : 0, ...keys])
const ytdOf = ({ sourceItemIds, ...figures }) => figures
const approve = async runId => {
  const unassigned = expectStatus(await request(users.approver, 'GET', `/payroll/runs/${runId}/unassigned`), 200)
  expectStatus(await request(users.approver, 'POST', `/payroll/runs/${runId}/unassigned-ack`, { reportHash: unassigned.reportHash }), 201)
  return expectStatus(await request(users.approver, 'POST', `/payroll/runs/${runId}/approve`), 201)
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  // مفيش رسالة بريد حقيقية بتطلع من الاختبار
  const { MailService } = require('../src/auth/mail.service')
  const mail = app.get(MailService)
  mail.isConfigured = () => false
  mail.send = async () => { throw new Error('no mail in tests') }
  assert.notEqual(mail.send, MailService.prototype.send)
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`

  org.cairo = await repo('Branch').save({ code: 'PST_CAI', name: 'فرع القاهرة', country: 'EG', insuranceSystem: 'EGYPTIAN' })
  org.riyadh = await repo('Branch').save({ code: 'PST_RUH', name: 'فرع الرياض', country: 'SA', insuranceSystem: 'NONE' })
  const user = label => repo('User').save({ email: `${label}@payroll-statutory.invalid`, displayName: label, passwordHash: 'test-only', role: 'super_admin', branchId: null, permissions: '["*"]', isActive: true })
  users.admin = await user('admin'); users.approver = await user('approver')
  await settings({ 'payroll.cycle_start_day': '1', 'payroll.monthly_days': '30', 'payroll.daily_hours': '8', 'payroll.exempt_overtime_eligible': 'false',
    'payroll.exempt_unpaid_leave_deductible': 'true', 'payroll.salary_evidence_mode': 'MONTHLY_HISTORY_OR_CURRENT_FILE' })
  // P4A-B01: الحساب بيقرا صف «اتأكد» بس — صفوف الضريبة وصندوق الشهداء والتأمين الصحي متراجعة في الاختبار ده (زي ما التفعيل بيشترط)
  await verify(true)
  state.full = await employee(org.cairo)
  state.raised = await employee(org.cairo)
  state.saudi = await employee(org.riyadh, { nationality: 'سعودي', gosiBaseSalary: null, isGosiRegistered: false })
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assertDisposable()
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), os.tmpdir()); assert.match(path.basename(uploads), /^hr-payroll-statutory-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'payroll statutory fixture cleanup failed')
}, { timeout: 60000 })


const ack = async id => { const r=expectStatus(await request(users.approver,'GET','/payroll/runs/'+id+'/unassigned'),200);expectStatus(await request(users.approver,'POST','/payroll/runs/'+id+'/unassigned-ack',{reportHash:r.reportHash}),201) }
test('P4B-F01: activation rejects historical unverified rows; forced seed state cannot price them',async t=>{
 const defs=repo('StatutoryDefinition'),old=await defs.findOneByOrFail({country:'EG',key:tax.EG_TAX_BRACKETS_KEY})
 await defs.update({id:old.id},{verified:false})
 const values=Object.fromEntries((await repo('StatutoryValue').findBy({definitionId:old.id})).map(x=>[x.code,Number(x.value)]))
 expectStatus(await request(users.admin,'POST','/settings/statutory',{country:'EG',key:old.key,effectiveFrom:'2026-06-01',values,verified:true}),201)
 const blocked=await request(users.admin,'PUT','/settings/statutory/calculators/EG_SALARY_TAX',{enabled:true,startPeriod:'2026-01'})
 assert.equal(blocked.status,400);assert.match(JSON.stringify(blocked.body),/محتاج تحقق/)
 await settings({[run.EG_TAX_ENABLED_KEY]:'true',[run.EG_TAX_START_PERIOD_KEY]:'2026-01'})
 const may=await runFor('2026-05',[state.full]);assert.equal(statutoryOf(itemOf(may,state.full)),undefined)
 const june=await runFor('2026-06',[state.raised]);assert.equal(statutoryOf(itemOf(june,state.raised)).egTax.tableVerified,true)
 await defs.update({id:old.id},{verified:true})
 expectStatus(await request(users.admin,'PUT','/settings/statutory/calculators/EG_SALARY_TAX',{enabled:false}),200)
 expectStatus(await request(users.admin,'PUT','/settings/statutory/calculators/EG_SALARY_TAX',{enabled:true,startPeriod:'2026-01'}),200)
 t.diagnostic(JSON.stringify({activation:blocked.status,historicalTax:false,verifiedSuccessorTax:true}))
})
test('P4B-F02: cancelling a calculated tax source blocks approval until actual recalculation',async t=>{
 const emp=await employee(org.cairo,{basicSalary:50000}),first=await runFor('2026-08',[emp])
 await repo('Employee').update({id:emp.id},{basicSalary:15000})
 const second=await runFor('2026-09',[emp]);assert.deepEqual(statutoryOf(itemOf(second,emp)).egTax.sourceItemIds,[itemOf(first,emp).id])
 await ack(second.id)
 const before=await request(users.approver,'POST','/payroll/runs/'+second.id+'/approve');assert.equal(before.body.code,'PAYRUN-TAX-SOURCES-CHANGED')
 expectStatus(await request(users.admin,'POST','/payroll/runs/'+first.id+'/cancel',{reason:'P4B cancel the obsolete calculation'}),201)
 const blocked=await request(users.approver,'POST','/payroll/runs/'+second.id+'/approve');assert.equal(blocked.status,409);assert.equal(blocked.body.code,'PAYRUN-TAX-SOURCES-CHANGED')
 const fresh=expectStatus(await request(users.admin,'POST','/payroll/runs/'+second.id+'/recalculate',{reason:'P4B recompute after cancellation'}),201)
 assert.deepEqual(statutoryOf(itemOf(fresh,emp)).egTax.sourceItemIds,[]);assert.equal(statutoryOf(itemOf(fresh,emp)).egTax.tax,1482.5)
 await approve(second.id)
 const later=await runFor('2026-10',[emp]);await approve(later.id)
 const reopen=await request(users.admin,'POST','/payroll/runs/'+second.id+'/reopen',{reason:'P4B source cannot change under approved dependent'})
 assert.equal(reopen.status,409);assert.equal(reopen.body.code,'PAYRUN-TAX-HAS-DEPENDENTS')
 t.diagnostic(JSON.stringify({unfinalizedSource:before.status,cancelledSource:blocked.status,recalculatedTax:1482.5,dependentReopen:reopen.status}))
})
test('P4B-F03: missing source IDs in a legacy snapshot force recalculation',async()=>{
 const emp=await employee(org.cairo),r=await runFor('2026-07',[emp]),item=itemOf(r,emp),b=JSON.parse(item.breakdown)
 delete b.statutory.egTax.sourceItemIds;await repo('PayrollItem').update({id:item.id},{breakdown:JSON.stringify(b)})
 await ack(r.id);const blocked=await request(users.approver,'POST','/payroll/runs/'+r.id+'/approve')
 assert.equal(blocked.status,409);assert.equal(blocked.body.code,'PAYRUN-TAX-SOURCES-CHANGED')
})
test('P4B-F04: final approval and source reopening serialize in both actual request orders',async t=>{
 const results=[]
 for(const order of ['approve-first','reopen-first']){
  const emp=await employee(org.cairo),source=await runFor('2026-08',[emp]);await approve(source.id)
  const dependent=await runFor('2026-09',[emp]);await ack(dependent.id)
  const key=order==='approve-first'?'egTaxSourcesIssue':'egTaxDependentsIssue',original=run[key],target=order==='approve-first'?dependent.id:source.id
  let reached,release,hit=false;const arrived=new Promise(r=>reached=r),gate=new Promise(r=>release=r)
  run[key]=async function(em,r,...args){if(!hit&&r.id===target){hit=true;reached();await gate}return original.call(this,em,r,...args)}
  const ap=()=>request(users.approver,'POST','/payroll/runs/'+dependent.id+'/approve'),re=()=>request(users.admin,'POST','/payroll/runs/'+source.id+'/reopen',{reason:'P4B concurrent reopen source'})
  const first=(order==='approve-first'?ap:re)();let second
  try{await Promise.race([arrived,first.then(()=>{throw Error('tax locking barrier not reached')})]);let done=false;second=(order==='approve-first'?re:ap)().then(r=>{done=true;return r})
   await new Promise(r=>setTimeout(r,650));assert.equal(done,false);release()
   const a=await first,b=await second;expectStatus(a,201);assert.equal(b.status,409)
   assert.equal(b.body.code,order==='approve-first'?'PAYRUN-TAX-HAS-DEPENDENTS':'PAYRUN-TAX-SOURCES-CHANGED')
   results.push({order,first:a.status,second:b.status,waited:true})
  }finally{release();run[key]=original;await first;if(second)await second}
 }
 t.diagnostic(JSON.stringify(results))
})
test('P4B-F05: reversal after dependent approval removes both historical income and tax from the next calculation',async t=>{
 const emp=await employee(org.cairo),source=await runFor('2026-08',[emp]);await approve(source.id)
 expectStatus(await request(users.approver,'POST','/payroll/runs/'+source.id+'/pay',{channel:'BANK_TRANSFER',reference:'P4B synthetic payment'}),201)
 const dep=await runFor('2026-09',[emp]);await approve(dep.id)
 const saved=await repo('PayrollItem').findOneByOrFail({runId:dep.id,employeeId:emp.id})
 const preview=expectStatus(await request(users.admin,'POST','/payroll/runs/'+source.id+'/reversal-preview',{employeeIds:[emp.id]}),201)
 assert.equal(preview.blocked,false,JSON.stringify(preview.blockers))
 const rev=expectStatus(await request(users.admin,'POST','/payroll/runs/'+source.id+'/reversals',{employeeIds:[emp.id],reason:'P4B reverse synthetic source after later approval',previewHash:preview.previewHash}),201)
 expectStatus(await request(users.approver,'POST','/payroll/runs/'+rev.id+'/approve'),201)
 expectStatus(await request(users.approver,'POST','/payroll/runs/'+rev.id+'/pay',{channel:'CASH',reference:'P4B synthetic reversal'}),201)
 assert.equal((await repo('PayrollItem').findOneByOrFail({id:saved.id})).breakdown,saved.breakdown)
 const next=await runFor('2026-10',[emp]),snapshot=statutoryOf(itemOf(next,emp)).egTax,prior=JSON.parse(saved.breakdown).statutory.egTax
 assert.deepEqual(snapshot.sourceItemIds,[saved.id]);assert.equal(snapshot.ytdNetIncome,prior.netIncome);assert.equal(snapshot.ytdTax,prior.tax)
 await approve(next.id)
 t.diagnostic(JSON.stringify({reversal:rev.id,dependentUnchanged:true,nextSources:snapshot.sourceItemIds,ytdIncome:snapshot.ytdNetIncome,ytdTax:snapshot.ytdTax}))
})
test('P4B-F06: the final approval-chain step also enforces finalized tax sources',async t=>{
 const final=await repo('User').save({email:'p4b-final@review.invalid',displayName:'Synthetic final approver',passwordHash:'unused',role:'super_admin',permissions:'["*"]',isActive:true})
 const emp=await employee(org.cairo),source=await runFor('2026-08',[emp]),dep=await runFor('2026-09',[emp])
 expectStatus(await request(users.admin,'PUT','/payroll/approval-chain/config/company',{steps:[{kind:'USER',userId:users.approver.id},{kind:'USER',userId:final.id}]}),200)
 expectStatus(await request(users.approver,'POST','/payroll/runs/'+dep.id+'/approval-chain/approve',{}),201)
 const denied=await request(final,'POST','/payroll/runs/'+dep.id+'/approval-chain/approve',{})
 assert.equal(denied.status,409);assert.equal(denied.body.code,'PAYRUN-TAX-SOURCES-CHANGED')
 assert.equal((await repo('PayrollRun').findOneByOrFail({id:dep.id})).status,'CALCULATED')
 t.diagnostic(JSON.stringify({lastStep:denied.status,code:denied.body.code,sourceStatus:source.status}))
})

