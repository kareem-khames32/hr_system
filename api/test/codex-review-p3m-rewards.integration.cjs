'use strict'
// B3.8-ب: مكافآت نتيجة التقييم على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر (hr_perf_rewards_test_<16 hex>)، عبر HTTP بتوكنات موقّعة محليًا ومن غير
// كلمات مرور. ولا رسالة بريد حقيقية.
//  RW-01) الاقتراح: إدارة الأداء (ومعاها إدارة المكافآت) بتقترح مكافآت دورة بقاعدة (تقدير ← قيمة) بنطاق الفروع — للتقييمات المعتمدة والمعلنة اللي
//         موظفها له مدير مباشر وتقديره له قيمة، ومرة واحدة. ولا طلب مكافأة ولا قيد في الدفتر بيتعمل من الاقتراح.
//  RW-02) التقديم: المدير الموجّه له الاقتراح بس هو اللي بيقدّم — طلب مكافأة باسمه بموديول المكافآت وسلسلته، مرة واحدة حتى مع ضغطتين مع بعض؛
//         رفض المكافآت بيرجّع الاقتراح؛ ولا قيد في الدفتر قبل آخر اعتماد في سلسلة المكافأة؛ وصرف النظر؛ والموديول المقفول.
//  RW-03) (CRP3K / Codex P3K-B08-01) طلب المكافأة ثبت والرد وقع: الاقتراح بيتربط بطلبه بعلامته، وإعادة المحاولة مابتعملش طلب تاني حتى لو
//         فحص التكرار في المكافآت مقفول.
// Run (من api/): node --test test/performance-rewards.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_perf_rewards_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_perf_rewards_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-perf-rewards-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rewards = require('../src/performance/review-rewards.service')
const rules = require('../src/performance/review-rules')
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
const employee = (extra = {}) => repo('Employee').save({ employeeCode: `RW${String(++employeeNumber).padStart(3, '0')}`, fullName: `موظف المكافآت ${employeeNumber}`, branchId: org.branchA.id,
  departmentId: org.sales.id, teamId: null, managerEmployeeId: null, joinDate: '2020-01-01', basicSalary: 9000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0,
  otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'cash', ...extra })
const account = (label, permissions, extra = {}) => repo('User').save({ email: `${label}@perf-rewards.invalid`, displayName: `حساب ${label}`, passwordHash: 'test-only',
  role: 'employee', branchId: org.branchA.id, permissions: JSON.stringify(permissions), isActive: true, ...extra })
const assign = (employeeId, status, finalScore, managerEmployeeId = emps.boss.id) => repo('ReviewAssignment').save({ cycleId: state.cycle, employeeId, branchId: org.branchA.id, managerEmployeeId, status,
  selfSubmittedAt: null, managerSubmittedAt: new Date(), selfScore: null, managerScore: finalScore, finalScore, createdAt: new Date() })
const count = name => repo(name).count()
const R = '/performance/rewards'

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

  org.branchA = await repo('Branch').save({ code: 'RW_A', name: 'فرع المكافآت أ', country: 'SA' })
  org.branchB = await repo('Branch').save({ code: 'RW_B', name: 'فرع المكافآت ب', country: 'SA' })
  org.sales = await repo('Department').save({ name: 'قسم المبيعات', code: 'RW_SAL', branchId: org.branchA.id })
  emps.boss = await employee({ fullName: 'مدير المبيعات' })
  emps.other = await employee({ fullName: 'مدير تاني' })
  emps.rep = await employee({ fullName: 'مندوب ممتاز', managerEmployeeId: emps.boss.id })
  emps.peer = await employee({ fullName: 'مندوب جيد جدًا', managerEmployeeId: emps.boss.id })
  emps.lone = await employee({ fullName: 'ممتاز من غير مدير' })
  emps.low = await employee({ fullName: 'مندوب ضعيف', managerEmployeeId: emps.boss.id })
  users.admin = await repo('User').save({ email: 'admin@perf-rewards.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', branchId: null,
    scopeAllBranches: true, permissions: '[]', isActive: true })
  users.boss = await account('boss', [], { employeeId: emps.boss.id })
  users.other = await account('other', [], { employeeId: emps.other.id })
  users.rep = await account('rep', [], { employeeId: emps.rep.id })
  // إدارة الأداء ومعاها إدارة المكافآت (من غير سلطة الموارد البشرية: اقتراحها مابيتعتمدش لحظتها)؛ وواحدة من غير المكافآت؛ وواحدة في فرع ب
  users.hrA = await account('hr-a', ['performance.manage', 'bonuses.manage'])
  users.hrOnly = await account('hr-only', ['performance.manage'])
  users.hrB = await account('hr-b', ['performance.manage', 'bonuses.manage'], { branchId: org.branchB.id })
  users.payHr = await account('pay-hr', ['bonuses.view', 'bonuses.approve'])
  expectStatus(await request(users.admin, 'PUT', '/modules/performance', { enabled: true }), 200); modules.invalidate()
  state.type = expectStatus(await request(users.admin, 'POST', '/bonuses/types', { code: 'REVIEW', nameAr: 'مكافأة أداء سنوي', calcMethod: 'FIXED_AMOUNT' }), 201).id
  // دورة اتطلقت على فرع أ بنتايجها: ممتاز معلن، جيد جدًا معتمد، ممتاز من غير مدير، ضعيف، والمدير نفسه لسه ماتعتمدش
  state.cycle = (await repo('ReviewCycle').save({ name: 'تقييم السنة', kind: 'ANNUAL', templateId: 1, periodStart: '2026-01-01', periodEnd: '2026-12-31', audienceMode: 'BRANCHES',
    audienceIds: JSON.stringify([org.branchA.id]), branchIds: JSON.stringify([org.branchA.id]), selfDueDate: '2027-01-10', managerDueDate: '2027-01-20', status: 'ACTIVE',
    templateSnapshot: JSON.stringify({ ratingMax: 5, sections: [] }), launchedAt: new Date(), launchedByUserId: users.admin.id, createdByUserId: users.admin.id, createdAt: new Date(), closedAt: null })).id
  state.rep = (await assign(emps.rep.id, 'ANNOUNCED', '95.00')).id
  state.peer = (await assign(emps.peer.id, 'APPROVED', '78.00')).id
  state.lone = (await assign(emps.lone.id, 'ACKNOWLEDGED', '92.00', null)).id
  state.low = (await assign(emps.low.id, 'ANNOUNCED', '40.00')).id
  await assign(emps.boss.id, 'COMPLETED', '99.00', null)
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

async function newReviewSuggestion(){
 const e=await employee({managerEmployeeId:emps.boss.id}),a=await assign(e.id,'ANNOUNCED','95.00')
 expectStatus(await request(users.hrA,'POST',R+'/cycles/'+state.cycle,{bonusTypeId:state.type,targetPeriod:'2026-12',values:{A:'123'}}),200)
 return {e,s:await repo('ReviewRewardSuggestion').findOneByOrFail({assignmentId:a.id})}
}
test('P3M-R01 control: detail failure after financial commit links one bonus',async()=>{
 await repo('RequestsConfig').update({key:'bonuses.duplicate_window_hours'},{value:'0'})
 const {e,s}=await newReviewSuggestion(),b=app.get(require('../src/payroll/bonuses.service').BonusesService),original=b.detail
 b.detail=async()=>{throw Error('Synthetic post-commit read failure')}
 let result;try{result=await request(users.boss,'POST',R+'/'+s.id+'/submit')}finally{b.detail=original}
 assert.equal(result.status,200);const saved=await repo('ReviewRewardSuggestion').findOneByOrFail({id:s.id});assert.equal(saved.status,'SUBMITTED');assert.ok(saved.bonusRequestId)
 assert.equal((await request(users.boss,'POST',R+'/'+s.id+'/submit')).status,409);assert.equal(await repo('BonusRequest').count({where:{employeeId:e.id}}),1)
 console.log('REVIEW_MEASURE '+JSON.stringify({case:'R01',first:result.status,retry:409,bonusRequests:1,linked:true}))
})
test('P3M-R02: identical manual marker cannot replace the suggested financial value',async()=>{
 const {e,s}=await newReviewSuggestion()
 const manual=expectStatus(await request(users.boss,'POST','/bonuses',{employeeId:e.id,bonusTypeId:state.type,inputValue:'7',targetPeriod:'2026-12',reason:'Manual unrelated request '+rewards.rewardMarker(s.id)}),201)
 const result=expectStatus(await request(users.boss,'POST',R+'/'+s.id+'/submit'),200)
 assert.notEqual(result.bonusRequestId,manual.id)
 const stored=await repo('BonusRequest').findOneByOrFail({id:result.bonusRequestId});assert.equal(Number(stored.inputValue),123);assert.equal(Number(s.inputValue),123)
 assert.equal(await repo('BonusRequest').count({where:{employeeId:e.id}}),2)
 console.log('REVIEW_MEASURE '+JSON.stringify({case:'R02',suggested:123,linkedValue:Number(stored.inputValue),linkedManual:false,requests:2}))
})

test('P3M-R03: failure after link update rolls back the request and releases the attempt',async()=>{
 const {e,s}=await newReviewSuggestion(),svc=app.get(require('../src/payroll/bonuses.service').BonusesService),create=svc.create;let hit=false
 svc.create=async function(user,dto,hooks){return create.call(this,user,dto,{afterSave:async(em,id)=>{assert.equal(em.queryRunner.isTransactionActive,true);await hooks.afterSave(em,id);hit=true;throw Error('Synthetic failure after linking inside financial transaction')}})}
 let first;try{first=await request(users.boss,'POST',R+'/'+s.id+'/submit')}finally{svc.create=create}
 assert.equal(hit,true);assert.equal(first.status,500)
 const stored=await repo('ReviewRewardSuggestion').findOneByOrFail({id:s.id});assert.equal(stored.status,'SUGGESTED');assert.equal(stored.bonusRequestId,null)
 assert.equal(await repo('BonusRequest').count({where:{employeeId:e.id}}),0)
 const retry=await request(users.boss,'POST',R+'/'+s.id+'/submit');assert.equal(retry.status,200);assert.equal(await repo('BonusRequest').count({where:{employeeId:e.id}}),1)
 console.log('REVIEW_MEASURE '+JSON.stringify({case:'R03',first:500,rolledBack:true,released:true,retry:200,requests:1}))
})

test('P3M-R04: stale live writer cannot commit after another attempt takes its claim',async()=>{
 const {e,s}=await newReviewSuggestion(),svc=app.get(require('../src/payroll/bonuses.service').BonusesService),create=svc.create,realNow=Date.now
 let enter,release,pending,hit=false;const entered=new Promise(r=>enter=r),gate=new Promise(r=>release=r)
 svc.create=async function(...args){if(!hit){hit=true;enter();await gate}return create.apply(this,args)}
 try{
  pending=request(users.boss,'POST',R+'/'+s.id+'/submit')
  await Promise.race([entered,pending.then(()=>{throw Error('Missed claim barrier')}),new Promise((_,reject)=>{const t=setTimeout(()=>reject(Error('Claim barrier timeout')),10000);t.unref()})])
  assert.equal((await request(users.boss,'POST',R+'/'+s.id+'/submit')).status,409)
  const before=await repo('ReviewRewardSuggestion').findOneByOrFail({id:s.id})
  // Simulate passage of time without rewriting the old attempt's stored token.
  Date.now=()=>realNow()+11*60000
  const mine=expectStatus(await request(users.boss,'GET',R+'/mine'),200).suggestions.find(x=>x.id===s.id);assert.equal(mine.canSubmit,true)
  const second=expectStatus(await request(users.boss,'POST',R+'/'+s.id+'/submit'),200)
  Date.now=realNow
  const current=await repo('ReviewRewardSuggestion').findOneByOrFail({id:s.id});assert.notEqual(current.decidedAt.getTime(),before.decidedAt.getTime())
  release();const first=await pending;assert.equal(first.status,409)
  const final=await repo('ReviewRewardSuggestion').findOneByOrFail({id:s.id});assert.equal(final.status,'SUBMITTED');assert.equal(final.bonusRequestId,second.bonusRequestId)
  assert.equal(await repo('BonusRequest').count({where:{employeeId:e.id}}),1)
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'R04',oldWriter:409,newWriter:200,requests:1,oldTokenUnmodified:true}))
 }finally{Date.now=realNow;release();if(pending)await pending;svc.create=create}
})

test('P3M-R05: hook failure after instant approval rolls back ledger, request, audit and notification outbox',async()=>{
 const e=await employee(),svc=app.get(require('../src/payroll/bonuses.service').BonusesService);let hit=false
 const known=['BonusRequest','EmployeeObligation','AuditLog','OutboxEvent'],before=Object.fromEntries(await Promise.all(known.map(async n=>[n,await repo(n).count()])))
 await assert.rejects(()=>svc.create(payloadOf(users.admin),{employeeId:e.id,bonusTypeId:state.type,inputValue:'123',reason:'Synthetic instant approval rollback',targetPeriod:'2026-12'}, {afterSave:async(em,id)=>{
  const row=await em.getRepository('BonusRequest').findOneByOrFail({id});assert.equal(row.status,'APPROVED');assert.ok(await em.getRepository('EmployeeObligation').count({where:{employeeId:e.id}}));hit=true;throw Error('Synthetic instant approval hook failure')
 }}),/Synthetic instant approval hook failure/)
 assert.equal(hit,true);for(const n of known)assert.equal(await repo(n).count(),before[n],n)
 console.log('REVIEW_MEASURE '+JSON.stringify({case:'R05',approvedInside:true,rollbackTables:known}))
})

test('P3M-R06: an abandoned stale claim can be retried but cannot be dismissed',async()=>{
 const {s}=await newReviewSuggestion()
 await repo('ReviewRewardSuggestion').update({id:s.id},{status:'CLAIMED',decidedByUserId:users.boss.id,decidedAt:new Date(Date.now()-11*60000)})
 const mine=expectStatus(await request(users.boss,'GET',R+'/mine'),200).suggestions.find(x=>x.id===s.id)
 assert.equal(mine.canSubmit,true)
 const denied=await request(users.boss,'POST',R+'/'+s.id+'/dismiss');assert.equal(denied.status,409)
 assert.equal((await request(users.hrA,'POST',R+'/'+s.id+'/dismiss')).status,409)
 console.log('REVIEW_MEASURE '+JSON.stringify({case:'R06',staleRetryAvailable:true,ownerDismiss:409,managerDismiss:409}))
})
