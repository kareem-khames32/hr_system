'use strict'
// B3.1-ب: بوابة التهيئة قبل المباشرة — دخول حقيقي (كلمات سر عشوائية بتتولد وقت التشغيل) وHTTP وSQL فعليين في قاعدة اختبار عشوائية
// بتتمسح في الآخر (hr_preboarding_test_<16 hex>). ولا رسالة بريد حقيقية.
//  PB-01) الميزة مقفولة (الافتراضي): حساب موظف مباشرته لسه جاية بيدخل جلسة عادية بالحرف.
//  PB-02) الميزة مفتوحة: جلسته بتاريخ المباشرة ومن غير صلاحيات، بتفتح شاشات التهيئة بس (403 بكود على الباقي)، حتى لو دوره إداري؛
//         واللي باشر أو مباشرته النهارده، ومدير النظام، وحساب من غير موظف، ومنتهي الخدمة: جلسة عادية.
//  PB-03) العلامة بتاريخها: من يوم المباشرة مالهاش أثر من غير دخول جديد، وتاريخ المباشرة الفعلي بيسبق تاريخ الالتحاق، والدخول الجاي
//         بعد تغيير التاريخ أو قفل الميزة جلسة عادية.
// Run (من api/): node --test test/preboarding.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const bcrypt = require('../node_modules/bcryptjs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_preboarding_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_preboarding_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-preboarding-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/auth/preboarding')
// كلمات سر الاختبار بتتولد عشوائي (مش ثابتة في الملف)
const passwordOf = () => `T-${crypto.randomBytes(9).toString('base64url')}`
const ymd = value => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
const inDays = n => { const day = new Date(); day.setDate(day.getDate() + n); return ymd(day) }
const today = inDays(0)
let app, master, ds, base, created = false
const U = {}, P = {}, E = {}, B = {}

const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
async function http(method, route, body, headers = {}) {
  const response = await fetch(base + route, { method, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const expect = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body ?? null)); return response.body }
const bearer = token => ({ Authorization: `Bearer ${token}` })
const login = async key => expect(await http('POST', '/auth/login', { email: U[key].email, password: P[key] }), 201)
const get = (token, route) => http('GET', route, undefined, bearer(token))
// توكن محلي لحساب (من غير رقم جلسة) — لمدير النظام ولتجربة علامة بتاريخ معيّن
const signed = (key, extra = {}) => jwt.sign({ sub: U[key].id, email: U[key].email, role: U[key].role, branchId: U[key].branchId ?? null, employeeId: U[key].employeeId ?? null,
  tokenVersion: 0, permissions: U[key].role === 'super_admin' ? ['*'] : [], ...extra })
const feature = on => http('PUT', '/modules/features/onboarding.preboarding', { enabled: on }, bearer(signed('root')))
// شاشات التهيئة (مسموحة)، ومسارات تانية بيفتحها أي موظف عادي (مقفولة في بوابة التهيئة)
const ALLOWED = ['/auth/me', '/auth/session', '/auth/sessions', '/modules/enabled', '/policies/mine', '/policies/pending', '/hiring-documents/mine', '/documents', '/tasks/mine',
  '/tasks/mine/count', '/notifications']
const CLOSED = ['/notifications/preferences', '/tasks/team', '/tasks/assignees']

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql'); assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads, AUTH_FAILURE_DELAY_MS: '20',
    FRONTEND_URL: 'http://localhost:3000' })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  // ولا رسالة بريد حقيقية
  const { MailService } = require('../src/auth/mail.service')
  const mail = app.get(MailService)
  mail.isConfigured = () => false
  mail.send = async () => { throw new Error('no mail in tests') }
  assert.notEqual(mail.send, MailService.prototype.send)
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => {}
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => {}
  ds = app.get(require('../node_modules/typeorm').DataSource); assert.equal(ds.options.database, database)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  B.a = await repo('Branch').save({ code: 'PBA', name: 'فرع بوابة التهيئة', country: 'EG', weekendDays: 'FRI' })
  let n = 0
  const employee = async (key, extra) => { E[key] = await repo('Employee').save({ employeeCode: `PB${String(++n).padStart(3, '0')}`, fullName: `موظف تهيئة ${key}`, branchId: B.a.id,
    status: 'active', isActive: true, ...extra }) }
  await employee('future', { joinDate: inDays(10) })
  await employee('manager', { joinDate: inDays(4) })
  await employee('actual', { joinDate: inDays(-3), actualStartDate: inDays(6) })
  await employee('today', { joinDate: today })
  await employee('old', { joinDate: '2024-01-01' })
  await employee('gone', { joinDate: inDays(12), status: 'archived', isActive: false })
  await employee('boss', { joinDate: inDays(20) })
  const account = async (key, role, employeeKey, permissions = []) => {
    P[key] = passwordOf()
    U[key] = await repo('User').save({ email: `${key}@preboarding.invalid`, displayName: `حساب ${key}`, role, permissions: JSON.stringify(permissions), isActive: true,
      branchId: role === 'super_admin' ? null : B.a.id, employeeId: employeeKey ? E[employeeKey].id : null, passwordHash: await bcrypt.hash(P[key], 10) })
  }
  await account('future', 'employee', 'future')
  await account('manager', 'hr_manager', 'manager', ['employees.view', 'documents.manage', 'settings.manage'])
  await account('actual', 'employee', 'actual')
  await account('today', 'employee', 'today')
  await account('old', 'employee', 'old')
  await account('gone', 'employee', 'gone')
  await account('none', 'employee', null)
  await account('root', 'super_admin', 'boss')
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('db', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name=@db')).recordset.length, 0)
      t.diagnostic(`تحقق حذف قاعدة الاختبار: ${database}`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir())); assert.match(path.basename(uploads), /^hr-preboarding-files-/)
    fs.rmSync(uploads, { recursive: true, force: true }); assert.equal(fs.existsSync(uploads), false)
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'تعذر تنظيف بيئة اختبار بوابة التهيئة')
})

test('P3M-B01: preboarding restricts structural managers to their own assigned work',async()=>{
 expect(await feature(true),200)
 const e=await repo('Employee').save({employeeCode:'P3M_REPORT',fullName:'Synthetic subordinate',branchId:B.a.id,managerEmployeeId:E.manager.id,status:'active',isActive:true,joinDate:'2020-01-01'})
 const now=new Date(),task=await repo('Task').save({title:'PRIVATE_SUBORDINATE_TASK',description:'Confidential work of another employee',assigneeEmployeeId:e.id,assigneeRole:null,branchId:B.a.id,createdByUserId:U.root.id,priority:'NORMAL',status:'OPEN',dueDate:inDays(2),requiresProof:false,createdAt:now,updatedAt:now})
 const roleTask=await repo('Task').save({title:'HR role control',assigneeEmployeeId:null,assigneeRole:'hr',branchId:B.a.id,createdByUserId:U.root.id,priority:'NORMAL',status:'OPEN',dueDate:inDays(2),requiresProof:false,createdAt:now,updatedAt:now})
 const session=await login('manager');assert.ok(session.user.preboardingUntil);assert.equal(session.user.role,'employee');assert.deepEqual(session.user.permissions,[])
 assert.equal((await get(session.accessToken,'/tasks/'+roleTask.id)).status,404)
 const shown=await get(session.accessToken,'/tasks/'+task.id);assert.equal(shown.status,404);assert.equal(JSON.stringify(shown.body).includes('PRIVATE_SUBORDINATE_TASK'),false)
 for(const route of ['/tasks','/tasks/team','/tasks/report','/tasks/'+task.id+'/log']) assert.equal((await get(session.accessToken,route)).status,403,route)
 const own=await repo('Task').save({...task,id:undefined,title:'OWN_PREBOARDING_CONTROL',assigneeEmployeeId:E.manager.id})
 assert.equal((await get(session.accessToken,'/tasks/'+own.id)).status,200)
 const mine=await get(session.accessToken,'/tasks/mine');assert.equal(mine.status,200);assert.equal(JSON.stringify(mine.body).includes('PRIVATE_SUBORDINATE_TASK'),false)
 assert.equal((await http('POST','/tasks/'+task.id+'/status',{status:'DONE'},bearer(session.accessToken))).status,404)
 assert.equal((await http('POST','/tasks/'+own.id+'/status',{status:'DONE'},bearer(session.accessToken))).status,201)
 console.log('REVIEW_MEASURE '+JSON.stringify({case:'B01',role:session.user.role,preboarding:true,roleTask:404,subordinateTask:shown.status}))
})

test('P3M-B02: restricted manager cannot read a task proof even as its creator and uploader',async()=>{
 const session=await login('manager'),other=E.old,now=new Date(),bytes=Buffer.from('%PDF-1.4\nSynthetic preboarding proof\n')
 const stored='p3m-preboarding-proof.pdf';fs.writeFileSync(path.join(uploads,stored),bytes)
 const file=await repo('StoredFile').save({originalName:stored,storedName:stored,mime:'application/pdf',size:bytes.length,entityType:'task',entityId:null,uploadedBy:U.manager.id,employeeId:null})
 const task=await repo('Task').save({title:'PRIVATE_CREATED_BY_MANAGER',description:'Protected creator proof',assigneeEmployeeId:other.id,assigneeRole:null,branchId:B.a.id,createdByUserId:U.manager.id,priority:'NORMAL',status:'DONE',requiresProof:true,proofFileId:file.id,createdAt:now,updatedAt:now,closedAt:now})
 const download=async()=>{const r=await fetch(base+'/files/'+file.id,{headers:bearer(session.accessToken)});await r.arrayBuffer();return r.status}
 assert.equal((await get(session.accessToken,'/tasks/'+task.id)).status,404);assert.equal(await download(),404)
 await repo('Task').update({id:task.id},{assigneeEmployeeId:E.manager.id})
 assert.equal((await get(session.accessToken,'/tasks/'+task.id)).status,200);assert.equal(await download(),200)
 console.log('REVIEW_MEASURE '+JSON.stringify({case:'B02',foreignCreatorTask:404,foreignUploadedProof:404,ownTask:200,ownProof:200}))
})
