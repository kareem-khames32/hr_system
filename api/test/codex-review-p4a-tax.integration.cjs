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


test('P4A-F01: API activation accepts a verified successor but payroll deducts with its unverified predecessor',async t=>{
 const defs=repo('StatutoryDefinition');const old=await defs.findOneByOrFail({country:'EG',key:tax.EG_TAX_BRACKETS_KEY});assert.equal(old.verified,false)
 const values=Object.fromEntries((await repo('StatutoryValue').findBy({definitionId:old.id})).map(x=>[x.code,Number(x.value)]))
 expectStatus(await request(users.admin,'POST','/settings/statutory',{country:'EG',key:old.key,effectiveFrom:'2026-06-01',values,verified:true}),201)
 for(const row of await defs.findBy({country:'EG',key:tax.EG_TAX_HIGH_INCOME_KEY}))if(!row.verified)expectStatus(await request(users.admin,'PATCH','/settings/statutory/'+row.id,{verified:true}),200)
 expectStatus(await request(users.admin,'PUT','/settings/statutory/calculators/EG_SALARY_TAX',{enabled:true,startPeriod:'2026-01'}),200)
 const may=await runFor('2026-05',[state.full]);const item=itemOf(may,state.full),snapshot=statutoryOf(item)
 assert.equal(snapshot.egTax.tableVerified,false);assert.equal(snapshot.egTax.tableEffectiveFrom,String(old.effectiveFrom).slice(0,10));assert.ok(snapshot.egTax.tax>0)
 await approve(may.id)
 t.diagnostic(JSON.stringify({oldVerified:old.verified,tableVerified:snapshot.egTax.tableVerified,tax:snapshot.egTax.tax,net:Number(item.netPay),approved:true}))
 const june=await runFor('2026-06',[state.raised]);assert.equal(statutoryOf(itemOf(june,state.raised)).egTax.tableVerified,true)
})
test('P4A-F03: cancelled previous-month draft remains in tax of an approved later month',async t=>{
 const emp=await employee(org.cairo,{basicSalary:50000})
 const first=await runFor('2026-08',[emp],'P4A prior month')
 await repo('Employee').update({id:emp.id},{basicSalary:15000})
 const second=await runFor('2026-09',[emp],'P4A current month')
 const one=statutoryOf(itemOf(first,emp)).egTax,two=statutoryOf(itemOf(second,emp)).egTax
 assert.ok(one.tax>1482.5);assert.ok(two.tax<1482.5)
 expectStatus(await request(users.admin,'POST','/payroll/runs/'+first.id+'/cancel',{reason:'Only the second alternative is intended for payment'}),201)
 await approve(second.id)
 const reference=await employee(org.cairo),referenceRun=await runFor('2026-09',[reference],'P4A reference without cancelled income'),referenceTax=statutoryOf(itemOf(referenceRun,reference)).egTax.tax
 assert.equal(referenceTax,1482.5);assert.notEqual(two.tax,referenceTax)
 t.diagnostic(JSON.stringify({firstTax:one.tax,secondTax:two.tax,referenceTax,ytdNetIncome:two.ytdNetIncome,days:two.days,firstCancelled:true,secondApproved:true}))
})

