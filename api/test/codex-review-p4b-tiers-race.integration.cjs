'use strict'
// B4.5 (ج) على SQL حقيقي: شرائح الإجازة السنوية بمدة الخدمة والسن (إعداد في نوع الإجازة)، وأقصى مرات طول الخدمة، وأنواع إجازات حزمة الدولة
// لفروعها (غير مفعّلة)، وترحيل 136 والشغل قبله. الافتراضي (من غير شرائح) = رصيد كل موظف زي الأول. قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_leave_tiers_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_leave_tiers_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-leave-tiers-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const MIGRATION = path.resolve(apiRoot, '..', 'docs', 'migrations', 'payroll', '20261009_136_leave_type_tiers.sql')
let master, pool, app, ds, base, admin, scoped, annual, created = false, sequence = 0
const B = {}, E = {}
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false, permissions: JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token(user) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const raw = await response.text(); return { status: response.status, body: raw ? JSON.parse(raw) : null }
}
const ok = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const refused = (response, status, message) => { assert.equal(response.status, status, JSON.stringify(response.body)); assert.match(String(response.body?.message), message) }
const local = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
// تاريخ قبل النهارده بسنين كاملة وعشر أيام (الخدمة أو السن = years بالظبط)
const yearsAgo = years => { const date = new Date(); date.setFullYear(date.getFullYear() - years); date.setDate(date.getDate() - 10); return local(date) }
const employee = (branch, serviceYears, age, extra = {}) => repo('Employee').save({ employeeCode: 'LT' + ++sequence, fullName: 'موظف شرائح ' + sequence, branchId: branch.id,
  joinDate: yearsAgo(serviceYears), birthDate: yearsAgo(age), status: 'active', isActive: true, basicSalary: 8000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, payMethod: 'cash', ...extra })
const annualOf = async emp => {
  const rows = ok(await request(admin, 'GET', `/leaves/balances/${emp.id}`), 200), row = rows.find(item => item.balanceType === 'annual')
  assert.ok(row, JSON.stringify(rows))
  return Number(row.annualEntitlement)
}
const allAnnual = async () => { const out = {}; for (const [name, emp] of Object.entries(E)) out[name] = await annualOf(emp); return out }
const types = async user => ok(await request(user ?? admin, 'GET', '/settings/leave-types'), 200)
const typeOf = async code => (await types()).find(row => row.code === code)
const patchType = (id, body, user = admin) => request(user, 'PATCH', `/settings/leave-types/${id}`, body)
const SUGGESTED = [{ country: 'EG', minServiceYears: null, minAge: null, days: 15 }, { country: 'EG', minServiceYears: 1, minAge: null, days: 21 }, { country: 'EG', minServiceYears: 10, minAge: null, days: 30 },
  { country: 'EG', minServiceYears: null, minAge: 50, days: 30 }, { country: 'SA', minServiceYears: null, minAge: null, days: 21 }, { country: 'SA', minServiceYears: 5, minAge: null, days: 30 }]
const BASE = { egNew: 25, egMid: 25, egSenior: 25, egOld: 25, saMid: 25, saSenior: 25, none: 25, notEntitled: 0 }
const runMigration = async () => { assert.match(database, NAME); for (const batch of migrate.splitBatches(fs.readFileSync(MIGRATION, 'utf8').replace(/\r\n/g, '\n'))) await pool.request().batch(batch) }
const extraColumns = async () => (await pool.request().query(`SELECT c.[name], t.[name] AS [type], c.[max_length], c.[is_nullable] FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id]
  WHERE c.[object_id] = OBJECT_ID(N'dbo.leave_types') AND c.[name] IN (N'entitlementTiers', N'maxTimesInService') ORDER BY c.[name]`)).recordset.map(row => Object.values(row).join(':'))

before(async () => {
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  const connection = { server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD, options: { encrypt: false, trustServerCertificate: true } }
  master = await new sql.ConnectionPool({ ...connection, database: 'master' }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  // مفيش رسالة بريد حقيقية بتطلع من الاختبار
  const { MailService } = require('../src/auth/mail.service')
  const mail = app.get(MailService)
  mail.isConfigured = () => false
  mail.send = async () => { throw new Error('no mail in tests') }
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1'); ds = app.get(require('../node_modules/typeorm').DataSource)
  assert.equal(ds.options.database, database)
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  pool = await new sql.ConnectionPool({ ...connection, database }).connect()
  B.eg = await repo('Branch').save({ code: 'LT_EG', name: 'فرع القاهرة', country: 'EG' })
  B.sa = await repo('Branch').save({ code: 'LT_SA', name: 'فرع الرياض', country: 'SA' })
  B.none = await repo('Branch').save({ code: 'LT_NO', name: 'فرع من غير دولة' })
  admin = await repo('User').save({ email: 'admin@leave-tiers.invalid', displayName: 'Fixture admin', passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  scoped = await repo('User').save({ email: 'scoped@leave-tiers.invalid', displayName: 'Fixture branch settings', passwordHash: 'test-only', role: 'hr_manager', branchId: B.eg.id,
    permissions: JSON.stringify(['settings.manage']) })
  E.egNew = await employee(B.eg, 0, 30)
  E.egMid = await employee(B.eg, 3, 30)
  E.egSenior = await employee(B.eg, 11, 35)
  E.egOld = await employee(B.eg, 2, 55)
  E.saMid = await employee(B.sa, 3, 55)
  E.saSenior = await employee(B.sa, 6, 30)
  E.none = await employee(B.none, 12, 60)
  E.notEntitled = await employee(B.sa, 12, 60, { annualLeaveEntitled: false })
  await require('../src/seed/seed-requests').seedRequests(ds)
  for (const emp of Object.values(E)) await require('../src/seed/seed-requests').ensureLeaveBalance(ds, emp.id)
  annual =await repo('LeaveType').findOneByOrFail({ code: 'ANNUAL' })
  // طلب الإجازة بيمشي في سلسلة بخطوة واحدة (البذرة بتعمل السلاسل فاضية)
  const chain = await repo('ApprovalChain').findOneByOrFail({ code: 'CH_LEAVE' })
  ok(await request(admin, 'PATCH', `/settings/approval-chains/${chain.id}/steps`, { steps: [{ approverRole: 'hr', slaDays: 3 }] }), 200)
}, { timeout: 180000 })

after(async t => {
  if (pool) await pool.close()
  if (app) await app.close()
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


test('P4B-L01: stale employee tier facts survive employee lock and inflate historic row and carry',async t=>{
 ok(await patchType(annual.id,{category:'ANNUAL',balanceType:'annual',entitlementTiers:[{country:'EG',minServiceYears:null,minAge:null,days:30},{country:'SA',minServiceYears:null,minAge:null,days:15}],carryOverEnabled:true,carryOverMaxDays:60}),200)
 const svc=app.get(require('../src/requests/leave-balances.service').LeaveBalancesService),orig=svc.lockEmployee,target=E.egMid
 let reached,release,paused=false;const arrived=new Promise(r=>reached=r),gate=new Promise(r=>release=r)
 svc.lockEmployee=async function(em,id,...rest){if(id===target.id&&!paused){paused=true;reached();await gate}return orig.call(this,em,id,...rest)}
 const pending=svc.ensureYearRows('2025')
 try{
 await Promise.race([arrived,pending.then(()=>{throw Error('year-row creation ended before barrier')})])
 const ctx=ok(await request(admin,'GET','/attendance/calendar-context?scope=EMPLOYEE&sourceId='+target.id),200)
 ok(await request(admin,'PATCH','/employees/'+target.id,{branchId:B.sa.id,calendarChange:{effectiveFrom:'2026-10-01',reason:'Synthetic country change after tier facts',expectedRevision:ctx.revision,expectedCurrentSourceHash:ctx.currentSourceHash}}),200)
 release();await pending;svc.lockEmployee=orig
 const row=await repo('LeaveBalance').findOneByOrFail({employeeId:target.id,balanceType:'annual',period:'2025'})
 const reference=await repo('LeaveBalance').findOneByOrFail({employeeId:E.saMid.id,balanceType:'annual',period:'2025'})
 assert.equal(Number(row.entitled),15);assert.equal(Number(reference.entitled),15)
 await svc.rollover('2025')
 const next=await repo('LeaveBalance').findOneByOrFail({employeeId:target.id,balanceType:'annual',period:'2026'})
 const nextRef=await repo('LeaveBalance').findOneByOrFail({employeeId:E.saMid.id,balanceType:'annual',period:'2026'})
 assert.equal(Number(next.openingDays),15);assert.equal(Number(nextRef.openingDays),15)
 t.diagnostic(JSON.stringify({currentCountry:'SA',staleHistoricEntitlement:Number(row.entitled),referenceEntitlement:Number(reference.entitled),carry:Number(next.openingDays),referenceCarry:Number(nextRef.openingDays)}))
 }finally{release();svc.lockEmployee=orig;await pending}
})


