'use strict'
// B3.12: لائحة الجزاءات على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر (hr_penalties_test_<16 hex>)، عبر HTTP بتوكنات موقّعة محليًا ومن غير كلمات
// مرور. ولا رسالة بريد حقيقية.
//  PN-01) اللائحة: المخالفة بدرجات تكرارها (القيم)، ونوع الخصم لخصم الأيام، بالصلاحية؛ والموديول مقفول افتراضيًا.
//  PN-03) (CRP3K / Codex P3K-B12) بصمة المعاينة بتغطّي الجزاء نفسه (تعديل اللائحة بعد المعاينة = 409)؛ وجزاء الخصم «حجز» لحد ما طلب خصمه يثبت:
//         توقيع تاني لنفس الموظف والمخالفة بيستنى، والحجز المقطوع بيتشال، والطلب اللي ثبت والرد وقع بيتربط من غير طلب تاني.
//  PN-02) التوقيع: رقم التكرار في المدة (إعداد) تحت قفل الموظف ومطابق للمعاينة، بنطاق الفروع؛ أول مرة إنذار وتاني مرة خصم يومين ← **خصم مصنّف
//         من النوع الموجود** في سلسلته، مربوط بالقضية؛ ورفض الخصومات مابيسيبش جزاء؛ والملغى مابيتحسبش في التكرار؛ و«جزاءاتي» للموظف.
// Run (من api/): node --test test/penalties.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_penalties_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_penalties_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-penalties-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/cases/penalties.service')
let app, master, ds, base, modules, created = false, employeeNumber = 0
const org = {}, users = {}, emps = {}, state = {}

function assertDisposable() {
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
const payloadOf = user => ({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false,
  permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${jwt.sign(payloadOf(user))}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const expectStatus = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const messageOf = response => [].concat(response.body?.message ?? []).join('، ')
const answer = response => [response.status, messageOf(response)]
const employee = (extra = {}) => repo('Employee').save({ employeeCode: `PN${String(++employeeNumber).padStart(3, '0')}`, fullName: `موظف الجزاءات ${employeeNumber}`, branchId: org.branchA.id,
  departmentId: null, teamId: null, managerEmployeeId: null, joinDate: '2020-01-01', basicSalary: 9000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0,
  otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'cash', ...extra })
const account = (label, permissions, extra = {}) => repo('User').save({ email: `${label}@penalties.invalid`, displayName: `حساب ${label}`, passwordHash: 'test-only',
  role: 'employee', branchId: org.branchA.id, permissions: JSON.stringify(permissions), isActive: true, ...extra })
const { localDateOf } = require('../src/attendance/attendance.service')
const dayAgo = days => localDateOf(new Date(Date.now() - days * 86400000))
const P = '/penalties'

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
  for (const cron of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) cron.stop()
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  modules = app.get(require('../src/modules-registry/modules.service').ModulesService)
  await app.get(require('../src/settings/config-defaults.service').ConfigDefaultsService).onApplicationBootstrap()
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '1' }, { key: 'payroll.monthly_days', value: '30' }, { key: 'payroll.daily_hours', value: '8' },
    { key: 'payroll.policy.default_period_type', value: 'CALENDAR_MONTH' }, { key: 'payroll.policy.min_net_guarantee', value: 'null' },
    { key: 'payroll.policy.net_floor_pct', value: 'null' }, { key: 'payroll.policy.max_deduction_pct_of_gross', value: 'null' },
    { key: 'loan.insufficient_net_behavior', value: 'PARTIAL_THEN_CARRY' }, { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' },
  ])

  org.branchA = await repo('Branch').save({ code: 'PN_A', name: 'فرع الجزاءات أ', country: 'SA' })
  org.branchB = await repo('Branch').save({ code: 'PN_B', name: 'فرع الجزاءات ب', country: 'SA' })
  emps.late = await employee({ fullName: 'موظف متأخر' })
  emps.other = await employee({ fullName: 'موظف تاني' })
  emps.b1 = await employee({ fullName: 'موظف فرع ب', branchId: org.branchB.id })
  users.admin = await repo('User').save({ email: 'admin@penalties.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', branchId: null,
    scopeAllBranches: true, permissions: '[]', isActive: true })
  // صاحب اللائحة ومعاه إدارة الخصومات (من غير سلطة الموارد البشرية: خصمه بيمشي في سلسلته)؛ وواحد من غير الخصومات؛ وواحد في فرع ب
  users.hr = await account('hr', ['cases.penalties', 'cases.investigate', 'deductions.view', 'deductions.manage'])
  users.bare = await account('bare', ['cases.penalties'])
  users.hrB = await account('hr-b', ['cases.penalties', 'deductions.manage'], { branchId: org.branchB.id })
  users.late = await account('late', [], { employeeId: emps.late.id })
  expectStatus(await request(users.admin, 'PUT', '/modules/cases', { enabled: true }), 200); modules.invalidate()
  state.daysType = expectStatus(await request(users.admin, 'POST', '/deductions/types', { code: 'PENALTY_DAYS', nameAr: 'جزاء تأديبي بالأيام', category: 'DISCIPLINARY', calcMethod: 'DAYS_OF_SALARY',
    creatorScopes: ['HR'], approvalSteps: ['HR'] }), 201).id
  state.fixedType = expectStatus(await request(users.admin, 'POST', '/deductions/types', { code: 'FIXED_FINE', nameAr: 'غرامة ثابتة', category: 'DISCIPLINARY', calcMethod: 'FIXED_AMOUNT', creatorScopes: ['HR'],
    approvalSteps: ['HR'] }), 201).id
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created) {
      assertDisposable()
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  fs.rmSync(uploads, { recursive: true, force: true })
  if (errors.length) t.diagnostic(errors.map(error => error.message).join(' | '))
}, { timeout: 60000 })

const p3mLatch=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve}}
const p3mBounded=p=>Promise.race([p,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error('Penalty barrier missed')),10000);timer.unref()})])
async function p3mPenalty(name){const e=await employee(),v=expectStatus(await request(users.hr,'POST',P+'/violations',{category:'Synthetic discipline',name,steps:[{action:'DEDUCT_DAYS',days:1},{action:'DEDUCT_DAYS',days:2}],deductionTypeId:state.daysType}),200).violations.find(x=>x.name===name);return {e,v,input:{employeeId:e.id,violationId:v.id,incidentDate:dayAgo(1),targetPeriod:dayAgo(1).slice(0,7)}}}
const p3mPreview=async input=>expectStatus(await request(users.hr,'POST',P+'/preview',input),200)
test('P3M-P01 control: changed penalty rejects old fingerprint',async()=>{
 const {e,v,input}=await p3mPenalty('Fingerprint control'),seen=await p3mPreview(input)
 expectStatus(await request(users.hr,'PATCH',P+'/violations/'+v.id,{steps:[{action:'DEDUCT_DAYS',days:2}]}),200)
 const rejected=await request(users.hr,'POST',P,{...input,expectedFingerprint:seen.fingerprint});assert.equal(rejected.status,409);assert.equal(await repo('EmployeePenalty').count({where:{employeeId:e.id}}),0)
 console.log('REVIEW_MEASURE '+JSON.stringify({case:'P01',staleFingerprint:409,penalties:0}))
})
test('P3M-P02 control: pending failure cannot increase concurrent recurrence',async()=>{
 const {e,v,input}=await p3mPenalty('Pending control'),seen=await p3mPreview(input),svc=app.get(require('../src/payroll/typed-deductions.service').TypedDeductionsService),original=svc.create,entered=p3mLatch(),release=p3mLatch();let pending
 svc.create=async function(actor,...args){if(actor.sub===users.bare.id){entered.resolve();await release.promise}return original.call(this,actor,...args)}
 try{
  pending=request(users.bare,'POST',P,{...input,expectedFingerprint:seen.fingerprint});await p3mBounded(Promise.race([entered.promise,pending.then(()=>{throw Error('No pending barrier')})]))
  const interim=await p3mPreview(input);assert.equal(interim.occurrence,1)
  assert.equal((await request(users.hr,'POST',P,{...input,expectedFingerprint:interim.fingerprint})).status,409)
  release.resolve();assert.equal((await pending).status,403)
  const final=expectStatus(await request(users.hr,'POST',P,{...input,expectedFingerprint:interim.fingerprint}),201);assert.equal(final.occurrence,1);assert.equal(final.days,1)
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'P02',concurrent:409,failedFirst:403,finalOccurrence:1,days:1}))
 }finally{release.resolve();if(pending)await pending;svc.create=original}
})
test('P3M-P03: expired reservation fences its live writer and prevents a second deduction',async()=>{
 await repo('RequestsConfig').update({key:'deductions.duplicate_window_hours'},{value:'0'})
 const {e,v,input}=await p3mPenalty('Expired live reservation'),seen=await p3mPreview(input),svc=app.get(require('../src/payroll/typed-deductions.service').TypedDeductionsService),original=svc.create,entered=p3mLatch(),release=p3mLatch();let pending,hit=false
 svc.create=async function(...args){if(!hit){hit=true;entered.resolve();await release.promise}return original.apply(this,args)}
 try{
  pending=request(users.hr,'POST',P,{...input,expectedFingerprint:seen.fingerprint});await p3mBounded(Promise.race([entered.promise,pending.then(()=>{throw Error('No pending barrier')})]))
  const old=await repo('EmployeePenalty').findOneByOrFail({employeeId:e.id,status:'PENDING'})
  // Advance only this reservation's age to model an operation suspended beyond the declared ten minutes.
  await repo('EmployeePenalty').update({id:old.id},{createdAt:new Date(Date.now()-11*60000)})
  const current=await p3mPreview(input),second=expectStatus(await request(users.hr,'POST',P,{...input,expectedFingerprint:current.fingerprint}),201)
  assert.equal(await repo('EmployeePenalty').findOneBy({id:old.id}),null)
  release.resolve();const first=await pending
  const count=await repo('DeductionRequest').count({where:{employeeId:e.id}}),rows=await repo('EmployeePenalty').find({where:{employeeId:e.id}})
  assert.equal(first.status,409);assert.equal(count,1);assert.equal(rows.length,1);assert.equal(rows[0].occurrence,1)
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'P03',firstStatus:first.status,secondStatus:201,remainingPenalties:rows.length,financialRequests:count,oldReservationDeleted:true}))
 }finally{release.resolve();if(pending)await pending;svc.create=original}
})

test('P3M-P04: manual marker cannot recover a failed penalty using an unrelated request',async()=>{
 const {e,v,input}=await p3mPenalty('Forged marker recovery'),seen=await p3mPreview(input),svc=app.get(require('../src/payroll/typed-deductions.service').TypedDeductionsService),original=svc.create,entered=p3mLatch(),release=p3mLatch();let hit=false,pending
 svc.create=async function(...args){if(!hit){hit=true;entered.resolve();await release.promise;throw Error('Synthetic failure before requested financial save')}return original.apply(this,args)}
 try{
  pending=request(users.hr,'POST',P,{...input,expectedFingerprint:seen.fingerprint});await p3mBounded(Promise.race([entered.promise,pending.then(()=>{throw Error('No recovery barrier')})]))
  const reservation=await repo('EmployeePenalty').findOneByOrFail({employeeId:e.id,status:'PENDING'})
  const manual=expectStatus(await request(users.hr,'POST','/deductions',{employeeId:e.id,deductionTypeId:state.fixedType,inputValue:'7',incidentDate:input.incidentDate,targetPeriod:input.targetPeriod,reason:'Manual unrelated request '+rules.penaltyMarker(reservation.id)}),201)
  release.resolve();const result=await pending
  assert.equal(result.status,500);assert.equal(await repo('EmployeePenalty').count({where:{employeeId:e.id}}),0)
  const money=await repo('DeductionRequest').findOneByOrFail({id:manual.id});assert.equal(money.deductionTypeId,state.fixedType);assert.equal(Number(money.inputValue),7);assert.equal(await repo('DeductionRequest').count({where:{employeeId:e.id}}),1)
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'P04',manualHttp:201,penaltyHttp:500,penalties:0,manualLinked:false}))
 }finally{release.resolve();if(pending)await pending;svc.create=original}
})

test('P3M-P05: penalty hook failure after instant approval rolls back finance and link together',async()=>{
 const {e,input}=await p3mPenalty('Instant deduction rollback'),seen=await p3mPreview(input),svc=app.get(require('../src/payroll/typed-deductions.service').TypedDeductionsService),create=svc.create;let hit=false
 let financeId
 const obligations=await repo('EmployeeObligation').count(),events=await repo('OutboxEvent').count()
 svc.create=async function(user,dto,hooks){return create.call(this,user,dto,{afterSave:async(em,id)=>{
  const row=await em.getRepository('DeductionRequest').findOneByOrFail({id});assert.equal(row.status,'APPROVED')
  assert.ok(await em.getRepository('EmployeeObligation').count({where:{employeeId:e.id}}));await hooks.afterSave(em,id)
  const linked=await em.getRepository('EmployeePenalty').findOneByOrFail({employeeId:e.id});assert.equal(linked.status,'ACTIVE');assert.equal(linked.deductionRequestId,id)
  hit=true;financeId=id;throw Error('Synthetic penalty hook failure after instant approval')
 }})}
 let failed;try{failed=await request(users.admin,'POST',P,{...input,expectedFingerprint:seen.fingerprint})}finally{svc.create=create}
 assert.equal(failed.status,500);assert.equal(hit,true)
 assert.equal(await repo('EmployeePenalty').count({where:{employeeId:e.id}}),0);assert.equal(await repo('DeductionRequest').count({where:{employeeId:e.id}}),0)
 assert.equal(await repo('EmployeeObligation').count(),obligations);assert.equal(await repo('OutboxEvent').count(),events)
 const audits=await repo('AuditLog').find({where:{entityId:String(financeId)}})
 assert.equal(audits.some(x=>x.entityType==='deduction_request'),false)
 const done=expectStatus(await request(users.admin,'POST',P,{...input,expectedFingerprint:seen.fingerprint}),201)
 assert.equal(done.status,'ACTIVE');assert.equal(await repo('DeductionRequest').count({where:{employeeId:e.id}}),1)
 console.log('REVIEW_MEASURE '+JSON.stringify({case:'P05',approvedInside:true,linkAndFinanceRolledBack:true,retry:201}))
})
