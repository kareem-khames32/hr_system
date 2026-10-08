'use strict'
// B5.10 على SQL حقيقي: 360 (ترشيح واعتماد، تقييم للمدير، رد من غير مقيّم ولا وقت، ونتيجة بعد قفل الدورة وبحد أدنى)، واجتماعات 1:1 (أجندة وملاحظات ومهام
// وتقويم)، والتقدير بين الزملاء — تلات ميزات فرعية مقفولة افتراضيًا، وترحيلات 176–180. قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const migrate = require('../scripts/db-migrate.cjs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_people_feedback_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_people_feedback_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-people-feedback-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/performance/people-feedback')
const TABLES = ['feedback360_invites', 'feedback360_responses', 'one_on_ones', 'one_on_one_actions', 'recognitions']
const MIGRATIONS = TABLES.map((table, index) => path.resolve(apiRoot, '..', 'docs', 'migrations', 'payroll', `20261010_${176 + index}_${table}.sql`))
let master, pool, app, ds, base, modules, created = false, sequence = 0
const B = {}, E = {}, U = {}, C = {}, I = {}, M = {}
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
const employee = (name, branch, extra = {}) => repo('Employee').save({ employeeCode: 'PF' + ++sequence, fullName: name, branchId: branch.id, joinDate: '2020-01-01',
  basicSalary: 5000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'cash', ...extra })
const account = (label, branch, permissions, who) => repo('User').save({ email: `${label}@people-feedback.invalid`, displayName: 'حساب ' + label, passwordHash: 'test-only', role: 'employee', branchId: branch.id,
  permissions: JSON.stringify(permissions), isActive: true, ...(who ? { employeeId: who.id } : {}) })
const runMigrations = async () => { assert.match(database, NAME); for (const file of MIGRATIONS) for (const batch of migrate.splitBatches(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'))) await pool.request().batch(batch) }
const ymd = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const day = offset => { const date = new Date(); date.setDate(date.getDate() + offset); return ymd(date) }
const F = '/performance/feedback360', O = '/performance/one-on-ones', R = '/performance/recognitions'
const cycle = async (name, status, people) => {
  const row = await repo('ReviewCycle').save({ name, kind: 'ANNUAL', templateId: 1, periodStart: '2026-01-01', periodEnd: '2026-12-31', audienceMode: 'COMPANY', selfDueDate: '2026-12-01', managerDueDate: '2026-12-15',
    status, createdByUserId: U.admin.id, createdAt: new Date() })
  for (const who of people) await repo('ReviewAssignment').save({ cycleId: row.id, employeeId: who.id, branchId: who.branchId, managerEmployeeId: who.managerEmployeeId ?? null, status: 'OPEN', createdAt: new Date() })
  return row.id
}
const nominate = (user, cycleId, ids) => request(user, 'POST', `${F}/my/nominations`, { cycleId, reviewerEmployeeIds: ids })
const decide = (user, id, action) => request(user, 'POST', `${F}/invites/${id}/decision`, { action })
const respond = (user, id, body) => request(user, 'POST', `${F}/invites/${id}/respond`, body)
const results = (user, cycleId, who) => request(user, 'GET', `${F}/results?cycleId=${cycleId}&employeeId=${who.id}`)
const inviteOf = async (subject, reviewer, relation = 'PEER') => (await repo('Feedback360Invite').findOne({ where: { subjectEmployeeId: subject.id, reviewerEmployeeId: reviewer.id, relation } }))
const columnsOf = async table => (await pool.request().query(`SELECT COLUMN_NAME AS name FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = N'${table}' ORDER BY ORDINAL_POSITION`)).recordset.map(row => row.name)

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
  B.riyadh = await repo('Branch').save({ code: 'PF_1', name: 'فرع الرياض', country: 'SA' })
  B.cairo = await repo('Branch').save({ code: 'PF_2', name: 'فرع القاهرة', country: 'EG' })
  U.admin = await repo('User').save({ email: 'admin@people-feedback.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', scopeAllBranches: true, permissions: '[]', isActive: true })
  E.boss = await employee('المدير', B.riyadh); E.other = await employee('مدير تاني', B.riyadh)
  for (const key of ['s', 'r2', 'r3', 'r4']) E[key] = await employee('مرؤوس ' + key, B.riyadh, { managerEmployeeId: E.boss.id })
  for (const key of ['c1', 'c2', 'c3']) E[key] = await employee('زميل ' + key, B.riyadh, { managerEmployeeId: E.other.id })
  E.x = await employee('موظف القاهرة', B.cairo); E.gone = await employee('موظف منتهي', B.riyadh, { status: 'terminated', isActive: false })
  for (const key of ['boss', 's', 'r2', 'r3', 'r4', 'c1', 'c2', 'c3', 'gone']) U[key] = await account(key, B.riyadh, [], E[key])
  U.x = await account('x', B.cairo, [], E.x)
  U.hr = await account('hr', B.riyadh, ['performance.manage']); U.hrCairo = await account('hr-cairo', B.cairo, ['performance.manage'])
  C.open = await cycle('تقييم 2026', 'ACTIVE', [E.s, E.boss, E.r2]); C.draft = await cycle('دورة مسودة', 'DRAFT', [E.s])
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


test('P5A-F01: close does not serialize with feedback response',async t=>{
 ok(await request(U.admin,'PUT','/modules/performance',{enabled:true}));ok(await request(U.admin,'PUT','/modules/features/'+rules.FEEDBACK360_FEATURE,{enabled:true}));modules.invalidate()
 const people=[E.c1,E.c2,E.c3,E.r2],users=[U.c1,U.c2,U.c3,U.r2]
 const ids=[];for(const who of people)ids.push((await repo('Feedback360Invite').save({cycleId:C.open,subjectEmployeeId:E.s.id,reviewerEmployeeId:who.id,relation:'PEER',status:'APPROVED',responded:false,createdByUserId:U.admin.id,createdAt:new Date()})).id)
 for(let i=0;i<3;i++)ok(await respond(users[i],ids[i],{rating:2}),201)
 const proto=require('../node_modules/typeorm').Repository.prototype, original=proto.save
 let entered,release;const hit=new Promise(r=>entered=r),gate=new Promise(r=>release=r);let trapped=false
 proto.save=async function(...args){if(!trapped&&this.metadata.tableName==='feedback360_responses'){trapped=true;entered();await gate}return original.apply(this,args)}
 const pending=respond(users[3],ids[3],{rating:5,strengths:'PRIVATE_LAST_RESPONSE'});let before,after,closing
 try{
  await Promise.race([hit,pending.then(()=>{throw Error('response completed before barrier')}),new Promise((_,r)=>setTimeout(()=>r(Error('barrier timeout')),8000))])
  closing=await request(U.admin,'POST','/performance/reviews/cycles/'+C.open+'/close',{});ok(closing,200)
  before=ok(await results(U.hr,C.open,E.s));release();ok(await pending,201);after=ok(await results(U.hr,C.open,E.s))
 }finally{release();proto.save=original;await pending.catch(()=>{})}
 const a=before.summaries.find(x=>x.relation==='PEER'),b=after.summaries.find(x=>x.relation==='PEER')
 assert.deepEqual([a.count,b.count],[3,4]);assert.equal(b.strengths.includes('PRIVATE_LAST_RESPONSE'),true)
 t.diagnostic(JSON.stringify({id:'P5A-F01',closeStatus:closing.status,counts:[a.count,b.count],inferredRating:b.average*b.count-a.average*a.count}))
})
test('P5A-F02: optional comment below minimum is published',async t=>{
 const result=ok(await results(U.hr,C.open,E.s)),peer=result.summaries.find(x=>x.relation==='PEER')
 assert.equal(peer.strengths.length,1);t.diagnostic(JSON.stringify({id:'P5A-F02',responses:peer.count,comments:peer.strengths.length}))
})
test('P5A-F03: calendar changes its default shape',async t=>{
 assert.equal(await modules.isFeatureEnabled(rules.ONE_ON_ONE_FEATURE),false)
 const cal=ok(await request(U.s,'GET','/calendar?month=2026-10'))
 assert.deepEqual(cal.meetings,[]);t.diagnostic(JSON.stringify({id:'P5A-F03',featureOff:true,addedMeetings:true}))
})
