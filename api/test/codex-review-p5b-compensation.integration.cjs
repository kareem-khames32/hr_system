'use strict'
// B5.1 (ب) على SQL حقيقي: دورة الزيادات — الترحيلات 140–142، وخطوات الدورة، وورقة المدير (مرؤوسيه المباشرين بس ومن غير أرقام راتب)،
// والمراجعة بنطاق الفروع وبسبب مكتوب، والميزانية تحذير مش منع. مفيش راتب بيتغيّر. قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const migrate = require('../scripts/db-migrate.cjs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_comp_cycles_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_comp_cycles_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-comp-cycles-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/compensation/compensation-cycles')
const MIGRATIONS = ['20261009_140_compensation_cycles.sql', '20261009_141_compensation_budgets.sql', '20261009_142_compensation_proposals.sql']
  .map(name => path.resolve(apiRoot, '..', 'docs', 'migrations', 'payroll', name))
const TABLES = ['compensation_cycles', 'compensation_budgets', 'compensation_proposals']
let master, pool, app, ds, base, modules, created = false, sequence = 0, cycleId
const B = {}, D = {}, E = {}, U = {}
const repo = name => { assert.match(database, NAME); assert.equal(ds.options.database, database); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token(user) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const raw = await response.text(); return { status: response.status, body: raw ? JSON.parse(raw) : null }
}
const ok = (response, status = 200) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const employee = (name, branch, department, basicSalary, manager) => repo('Employee').save({ employeeCode: 'CC' + ++sequence, fullName: name, branchId: branch.id, departmentId: department.id,
  managerEmployeeId: manager ? manager.id : null, joinDate: '2020-01-01', basicSalary, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'cash' })
const account = (label, branch, permissions, person) => repo('User').save({ email: `${label}@comp-cycles.invalid`, displayName: 'حساب ' + label, passwordHash: 'test-only', role: 'employee',
  branchId: branch ? branch.id : null, employeeId: person ? person.id : null, permissions: JSON.stringify(permissions) })
const runMigrations = async () => { assert.match(database, NAME); for (const file of MIGRATIONS) for (const batch of migrate.splitBatches(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'))) await pool.request().batch(batch) }
const tablesPresent = async () => (await pool.request().query(`SELECT COUNT(*) AS n FROM sys.tables WHERE [name] IN (${TABLES.map(name => `N'${name}'`).join(', ')})`)).recordset[0].n
const C = '/compensation/cycles'
const lineOf = (detail, person) => detail.lines.find(row => row.employeeId === person.id)
const proposals = () => repo('CompensationProposal').find({ order: { id: 'ASC' } })
const basicOf = async person => Number((await repo('Employee').findOneByOrFail({ id: person.id })).basicSalary)

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
  await app.get(require('../src/settings/config-defaults.service').ConfigDefaultsService).onApplicationBootstrap()
  B.riyadh = await repo('Branch').save({ code: 'CC_1', name: 'فرع الرياض', country: 'SA' })
  B.cairo = await repo('Branch').save({ code: 'CC_2', name: 'فرع القاهرة', country: 'EG' })
  D.sales = await repo('Department').save({ name: 'إدارة المبيعات', code: 'CC-S', branchId: B.riyadh.id, unitType: 'ADMINISTRATION', isActive: true })
  D.retail = await repo('Department').save({ name: 'قسم التجزئة', code: 'CC-R', branchId: B.riyadh.id, parentId: D.sales.id, unitType: 'DEPARTMENT', isActive: true })
  D.cairo = await repo('Department').save({ name: 'قسم الحسابات', code: 'CC-C', branchId: B.cairo.id, unitType: 'DEPARTMENT', isActive: true })
  E.manager = await employee('مدير التجزئة', B.riyadh, D.retail, 12000, null)
  E.first = await employee('مرؤوس أول', B.riyadh, D.retail, 5000, E.manager)
  E.second = await employee('مرؤوس تاني', B.riyadh, D.retail, 6000, E.manager)
  E.otherManager = await employee('مدير تاني', B.riyadh, D.sales, 11000, null)
  E.outsider = await employee('موظف مش في الفريق', B.riyadh, D.sales, 7000, E.otherManager)
  E.cairoManager = await employee('مدير القاهرة', B.cairo, D.cairo, 20000, null)
  E.cairo = await employee('موظف القاهرة', B.cairo, D.cairo, 9000, E.cairoManager)
  U.admin = await repo('User').save({ email: 'admin@comp-cycles.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', scopeAllBranches: true, permissions: '[]' })
  U.hr = await account('hr', B.riyadh, ['compensation.manage', 'payroll.view'])
  U.hrNoPay = await account('hr-no-pay', B.riyadh, ['compensation.manage'])
  U.hrCairo = await account('hr-cairo', B.cairo, ['compensation.manage', 'payroll.view'])
  U.manager = await account('manager', B.riyadh, [], E.manager)
  U.cairoManager = await account('cairo-manager', B.cairo, [], E.cairoManager)
  U.first = await account('first', B.riyadh, [], E.first)
  U.plain = await account('plain', B.riyadh, ['employees.view', 'payroll.view'])
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


test('P5B-C01: compensation hides moved department identity',async t=>{
 ok(await request(U.admin,'PUT','/modules/compensation',{enabled:true}));modules.invalidate()
 const made=ok(await request(U.admin,'POST',C,{name:'Review raise cycle',effectivePayrollPeriod:'2027-01'}),201)
 const id=made.cycle.id
 ok(await request(U.admin,'POST',C+'/'+id+'/steps/open',{}),201)
 ok(await request(U.manager,'PUT',C+'/'+id+'/my-team/'+E.first.id,{amount:100,note:'test'}))
 ok(await request(U.admin,'PATCH','/departments/'+D.retail.id,{branchId:B.cairo.id,parentId:null,name:'PRIVATE_CAIRO_DEPARTMENT'}))
 const line=lineOf(ok(await request(U.hr,'GET',C+'/'+id)),E.first)
 assert.equal(line.departmentId,null);assert.equal(line.departmentName,null)
 t.diagnostic(JSON.stringify({id:'P5B-C01',foreignDepartmentId:line.departmentId,leaked:false}))
})

test('P5B-C02: prior line adjuster remains blocked after another edit',async t=>{
 await repo('Department').update(D.retail.id,{branchId:B.riyadh.id})
 const made=ok(await request(U.admin,'POST',C,{name:'Review separation cycle',effectivePayrollPeriod:'2027-01'}),201),id=made.cycle.id
 const reviewer=await account('reviewer',null,['compensation.manage']);reviewer.scopeAllBranches=true;await repo('User').update(reviewer.id,{scopeAllBranches:true})
 ok(await request(U.admin,'POST',C+'/'+id+'/steps/open',{}),201)
 ok(await request(U.manager,'PUT',C+'/'+id+'/my-team/'+E.first.id,{amount:100,note:'manager'}))
 ok(await request(U.admin,'PUT',C+'/'+id+'/lines/'+E.first.id,{amount:500,note:'admin edit'}))
 ok(await request(reviewer,'POST',C+'/'+id+'/steps/review',{}),201)
 assert.equal((await request(U.admin,'POST',C+'/'+id+'/approve',{})).status,403)
 ok(await request(U.hr,'PUT',C+'/'+id+'/lines/'+E.first.id,{amount:500,note:'same amount'}))
 const approved=await request(U.admin,'POST',C+'/'+id+'/approve',{});assert.equal(approved.status,403)
 assert.equal((await repo('CompensationCycle').findOneByOrFail({id})).status,'REVIEW');assert.ok(await repo('CompensationWriter').count({where:{cycleId:id,userId:U.admin.id}}))
 t.diagnostic(JSON.stringify({id:'P5B-C02',blockedBeforeSecondEdit:true,previousAuthorApproved:false}))
})

test('P5B-C03: missing 181 blocks cycles then migration accepts exact shape and refuses malformed shape',async t=>{
 const rule=require('../src/compensation/compensation-cycles');await ds.query('DROP TABLE dbo.compensation_writers');rule.resetCompensationCyclesCache()
 const list=ok(await request(U.admin,'GET',C));assert.equal(list.ready,false)
 const existing=await repo('CompensationCycle').findOne({where:{status:'REVIEW'}});assert.ok(existing)
 assert.equal((await request(U.admin,'POST',C+'/'+existing.id+'/approve',{})).status,400)
 assert.equal((await request(U.admin,'POST',C,{name:'No migration',effectivePayrollPeriod:'2027-02'})).status,400)
 const sql=fs.readFileSync(path.resolve(apiRoot,'../docs/migrations/payroll/20261010_181_compensation_writers.sql'),'utf8').replace(/\r\n/g,'\n'),run=async()=>{for(const batch of migrate.splitBatches(sql))await ds.query(batch)}
 await run();await run();rule.resetCompensationCyclesCache();assert.equal((await request(U.admin,'GET',C)).body.ready,true)
 await ds.query('ALTER TABLE dbo.compensation_writers ADD codex_review_extra int NULL');try{await assert.rejects(run)}finally{await ds.query('ALTER TABLE dbo.compensation_writers DROP COLUMN codex_review_extra')}
 await run();t.diagnostic(JSON.stringify({id:'P5B-C03',before181:'blocked',applied:true,repeated:true,malformedRejected:true}))
})
