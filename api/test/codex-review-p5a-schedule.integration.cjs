'use strict'
// B5.5 (ج) على SQL حقيقي: تبديل الوردية بموافقة الطرف التاني — الميزة الفرعية مقفولة افتراضيًا والتبديل زي الأول، ترحيل 166، صف الموافقة عند كل تقديم،
// قرار الطرف التاني، وشرط موافقته عند تنفيذ التبديل بعد الاعتماد النهائي. قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const migrate = require('../scripts/db-migrate.cjs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_swap_consents_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_swap_consents_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-swap-consents-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/attendance/swap-consents')
const MIGRATION = path.resolve(apiRoot, '..', 'docs', 'migrations', 'payroll', '20261010_166_shift_swap_consents.sql')
let master, pool, app, ds, base, modules, created = false, sequence = 0
const B = {}, E = {}, U = {}, S = {}
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
const employee = (name, branch) => repo('Employee').save({ employeeCode: 'SW' + ++sequence, fullName: name, branchId: branch.id, joinDate: '2020-01-01',
  basicSalary: 5000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'cash' })
const account = (label, branch, permissions, extra = {}) => repo('User').save({ email: `${label}@swap-consents.invalid`, displayName: 'حساب ' + label, passwordHash: 'test-only', role: 'employee', branchId: branch.id,
  permissions: JSON.stringify(permissions), isActive: true, ...extra })
const runMigration = async () => { assert.match(database, NAME); for (const batch of migrate.splitBatches(fs.readFileSync(MIGRATION, 'utf8').replace(/\r\n/g, '\n'))) await pool.request().batch(batch) }
const ymd = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const W = (() => { const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() - date.getDay() + 14); return ymd(date) })()
const day = offset => { const date = new Date(`${W}T12:00:00`); date.setDate(date.getDate() + offset); return ymd(date) }
const C = '/attendance/swap-consents'
const ask = (user, date, partner) => request(user, 'POST', '/requests', { typeCode: 'SHIFT_SWAP', payload: { date, withEmployeeId: partner.id }, submit: true })
const act = (user, id, action, comment) => request(user, 'POST', `/requests/${id}/act`, { action, ...(comment ? { comment } : {}) })
const decide = (user, id, body) => request(user, 'POST', `${C}/${id}`, body)
const consentOf = id => repo('ShiftSwapConsent').findOne({ where: { requestId: id } })
const statusOf = async id => (await repo('Request').findOneByOrFail({ id })).status
const overrideOf = async (person, date) => (await repo('ScheduleDayOverride').findOne({ where: { employeeId: person.id, date } }))?.shiftId ?? null
const wrapped = message => `لم يُعتمد الطلب — ${message}. الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات`

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
  B.main = await repo('Branch').save({ code: 'SW_1', name: 'الفرع الرئيسي', country: 'SA' })
  U.admin = await repo('User').save({ email: 'admin@swap-consents.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', scopeAllBranches: true, permissions: '[]', isActive: true })
  E.a = await employee('موظف أ', B.main); E.b = await employee('موظف ب', B.main); E.c = await employee('موظف ج', B.main)
  U.a = await account('a', B.main, [], { employeeId: E.a.id }); U.b = await account('b', B.main, [], { employeeId: E.b.id }); U.c = await account('c', B.main, [], { employeeId: E.c.id })
  U.approver = await account('approver', B.main, ['approve.hr', 'requests.view_all'], { scopeAllBranches: true })
  S.early = await repo('Shift').save({ name: 'صباحي', startTime: '08:00', endTime: '16:00', shiftMode: 'fixed', isActive: true, branchId: null })
  S.late = await repo('Shift').save({ name: 'ليلي', startTime: '22:00', endTime: '06:00', shiftMode: 'fixed', isActive: true, branchId: null })
  S.mid = await repo('Shift').save({ name: 'مسائي', startTime: '14:00', endTime: '22:00', shiftMode: 'fixed', isActive: true, branchId: null })
  for (const [person, shift] of [[E.a, S.early], [E.b, S.late], [E.c, S.mid]]) await repo('ScheduleEntry').save({ weekStart: W, employeeId: person.id, shiftId: shift.id, shiftName: shift.name, startTime: shift.startTime, endTime: shift.endTime })
  const chain = await repo('ApprovalChain').save({ code: 'SW_HR', nameAr: 'سلسلة تبديل الوردية', isActive: true, autoApprove: false })
  await repo('ApprovalStep').save({ chainId: chain.id, stepOrder: 1, approverRole: 'hr' })
  await repo('RequestType').save({ code: 'SHIFT_SWAP', nameAr: 'تبديل وردية', category: 'time_attendance', destinationHandler: 'shift_schedule', approvalChainId: chain.id, isActive: true, requiredFields: JSON.stringify(['date', 'withEmployeeId']) })
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
test('P5A-S01: ten submissions exhaust pool while reading swap feature after real settings write',async t=>{
 assert.equal(await modules.isFeatureEnabled(rules.SWAP_CONSENT_FEATURE),false)
 for(const [person,shift] of [[E.a,S.early],[E.b,S.late]])await repo('ScheduleEntry').save({weekStart:day(7),employeeId:person.id,shiftId:shift.id,shiftName:shift.name,startTime:shift.startTime,endTime:shift.endTime})
 const drafts=[];for(let i=0;i<10;i++)drafts.push(ok(await request(U.a,'POST','/requests',{typeCode:'SHIFT_SWAP',payload:{date:day(i+1),withEmployeeId:E.b.id},submit:false}),201))
 const pool=ds.driver.master.pool;assert.equal(pool.max,10)
 const feature=modules.isFeatureEnabled,write=modules.write,invalidate=modules.invalidate
 const all=latch(),release=latch(),committed=latch(),releaseSetting=latch(),invalidated=latch();let entered=0,timer,pending,setting,occupied
 const timeout=pool.acquireTimeoutMillis;pool.acquireTimeoutMillis=2000
 modules.isFeatureEnabled=async function(key){if(key===rules.SWAP_CONSENT_FEATURE&&entered<10){if(++entered===10)all.resolve();await release.promise}return feature.call(this,key)}
 modules.write=async function(work){await write.call(this,work);committed.resolve();await releaseSetting.promise}
 modules.invalidate=function(){invalidate.call(this);invalidated.resolve()}
 try{
  setting=request(U.admin,'PUT','/modules/features/'+rules.SWAP_CONSENT_FEATURE,{enabled:false})
  await Promise.race([committed.promise,setting.then(r=>{throw Error('settings missed barrier '+r.status)})])
  const calls=[];pending=Promise.all([]);for(let i=0;i<drafts.length;i++){calls.push(request(U.a,'POST','/requests/'+drafts[i].id+'/submit',{}));pending=Promise.all(calls);const until=Date.now()+5000;while(entered<i+1&&Date.now()<until)await new Promise(r=>setTimeout(r,20));assert.equal(entered,i+1,'submission '+i+' must reach feature read')}
  await Promise.race([all.promise,pending.then(()=>{throw Error('completed before barrier')}),new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('all barriers not reached: '+entered)),8000))]);clearTimeout(timer)
  occupied={max:pool.max,used:pool.numUsed(),free:pool.numFree()}
  releaseSetting.resolve();await invalidated.promise;release.resolve()
  const result=await pending;const settingResult=await setting
  assert.equal(occupied.used,10);assert.equal(occupied.free,0);assert.equal(result.some(r=>r.status===500),true)
  ok(await request(U.a,'POST','/requests/'+drafts[0].id+'/submit',{}),201)
  t.diagnostic(JSON.stringify({id:'P5A-S01',featureOff:true,occupied,statuses:result.map(r=>r.status),settingStatus:settingResult.status}))
 }finally{clearTimeout(timer);release.resolve();releaseSetting.resolve();await Promise.allSettled([pending,setting].filter(Boolean));modules.isFeatureEnabled=feature;modules.write=write;modules.invalidate=invalidate;pool.acquireTimeoutMillis=timeout}
})
