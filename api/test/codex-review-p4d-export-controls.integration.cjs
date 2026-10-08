'use strict'
// B4.8 (أ) على SQL حقيقي: الإخفاء الجزئي للهوية والآيبان (إعداد مقفول افتراضيًا) في ملف الموظف والقايمة وملف Excel، وتصدير بيانات موظف
// واحد كاملة (طلب اطلاع) بصلاحية «تعديل الموظفين» وبنطاق الفروع وبسطر تدقيق. قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const ExcelJS = require('../node_modules/exceljs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_employee_privacy_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_employee_privacy_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-employee-privacy-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const privacy = require('../src/employees/employee-privacy')
const IBAN = 'SA0380000000608010167519', ID = '2123456789', PASSPORT = 'A12345678'
let master, app, ds, base, admin, created = false
const B = {}, U = {}, E = {}
const repo = name => { assert.match(database, NAME); assert.equal(ds.options.database, database); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token(user) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const raw = await response.text(); return { status: response.status, body: raw ? JSON.parse(raw) : null }
}
const ok = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const setMasking = value => request(admin, 'PATCH', '/settings/config', { key: privacy.PARTIAL_MASKING_KEY, value })
const fields = row => [row.nationalId ?? null, row.passportNo ?? null, row.iban ?? null, row.nationalIdMasked ?? null, row.passportNoMasked ?? null, row.ibanMasked ?? null]
const fileOf = async user => fields(ok(await request(user, 'GET', `/employees/${E.target.id}`), 200))
const listOf = async user => fields(ok(await request(user, 'GET', '/employees'), 200).find(row => row.id === E.target.id))
const profileOf = async user => fields(ok(await request(user, 'GET', `/employees/${E.target.id}/profile`), 200).employee)
const historyOf = async user => { const row = ok(await request(user, 'GET', `/employees/${E.target.id}/history`), 200).find(entry => entry.fieldName === 'nationalId'); return [row.oldValue, row.newValue] }
const documentNumbers = async user => ok(await request(user, 'GET', `/employees/${E.target.id}/profile`), 200).documents.map(doc => doc.number)
async function exportRow(user) {
  const response = await fetch(`${base}/employees/export?ids=${E.target.id}`, { headers: { Authorization: 'Bearer ' + token(user) } })
  assert.equal(response.status, 200)
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(Buffer.from(await response.arrayBuffer()))
  const sheet = workbook.getWorksheet('الموظفين'), headers = sheet.getRow(1).values.slice(1), values = sheet.getRow(2).values.slice(1)
  const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? null]))
  return [row['رقم الهوية / الإقامة'], row['رقم الجواز'], row['الآيبان'] ?? null]
}
const account = (label, permissions, extra = {}) => repo('User').save({ email: `${label}@employee-privacy.invalid`, displayName: label, passwordHash: 'test-only', role: 'employee', branchId: B.one.id,
  permissions: JSON.stringify(permissions), ...extra })

before(async () => {
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true } }).connect()
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
  B.one = await repo('Branch').save({ code: 'EP_1', name: 'فرع الاختبار', country: 'SA' })
  B.two = await repo('Branch').save({ code: 'EP_2', name: 'فرع تاني', country: 'EG' })
  admin = await repo('User').save({ email: 'admin@employee-privacy.invalid', displayName: 'Fixture admin', passwordHash: 'test-only', role: 'super_admin', scopeAllBranches: true, permissions: '[]' })
  E.target = await repo('Employee').save({ employeeCode: 'EP1', fullName: 'موظف الخصوصية', branchId: B.one.id, joinDate: '2020-01-01', basicSalary: 9000, housingAllowance: 0, transportAllowance: 0,
    otherAllowance: 0, status: 'active', isActive: true, payMethod: 'transfer', bankName: 'بنك الموظف', iban: IBAN, nationalId: ID, passportNo: PASSPORT, nationality: 'مصري' })
  E.other = await repo('Employee').save({ employeeCode: 'EP2', fullName: 'موظف تاني', branchId: B.two.id, joinDate: '2021-01-01', basicSalary: 5000, housingAllowance: 0, transportAllowance: 0,
    otherAllowance: 0, status: 'active', isActive: true, payMethod: 'cash' })
  U.viewer = await account('viewer', ['employees.view'])
  U.payroll = await account('payroll', ['employees.view', 'payroll.view'])
  U.editor = await account('editor', ['employees.view', 'employees.edit'])
  U.self = await account('self', [], { employeeId: E.target.id })
  await require('../src/seed/seed-requests').seedRequests(ds)
  if (!(await repo('RequestsConfig').findOneBy({ key: privacy.PARTIAL_MASKING_KEY }))) await repo('RequestsConfig').save({ key: privacy.PARTIAL_MASKING_KEY, value: 'false' })
  await repo('RequestsConfig').update({ key: privacy.PARTIAL_MASKING_KEY }, { value: 'false' })
  // CR4-SELF: سطر تغيير هوية في سجل الموظف ومستند هوية برقمه — نفس حكم الإخفاء
  await repo('EmployeeStatusHistory').save({ employeeId: E.target.id, changeType: 'DATA', fieldName: 'nationalId', oldValue: '2000000001', newValue: ID, oldStatus: null, newStatus: 'change', reason: 'تصحيح رقم' })
  await repo('EmployeeDocument').save({ employeeId: E.target.id, docType: 'national_id', number: ID, issueDate: '2025-01-01', expiryDate: '2030-01-01' })
  U.docs = await account('docs', ['employees.view', 'documents.manage'])
}, { timeout: 120000 })

after(async t => {
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

const auditCount=()=>repo('AuditLog').countBy({action:'EMPLOYEE_DATA_EXPORT'})
test('P4D-P01: current parent request confidentiality hides both offboarding and closed employment period',async t=>{
 const type=await repo('RequestType').findOneByOrFail({code:'RESIGNATION'})
 const req=await repo('Request').save({typeCode:'RESIGNATION',requesterId:E.target.id,branchId:B.one.id,status:'COMPLETED',payload:'{"reason":"P4D_PARENT_REASON"}'})
 const parent=await repo('OffboardingCase').save({employeeId:E.target.id,resignationRequestId:req.id,lastWorkingDay:'2025-12-31',status:'CLOSED',notes:'P4D_PARENT_REASON'})
 const period=await repo('EmploymentPeriod').save({employeeId:E.target.id,periodNo:1,startDate:'2020-01-01',endDate:'2025-12-31',exitReason:'resignation',offboardingCaseId:parent.id,rehireReason:'Synthetic closed period',createdAt:new Date()})
 const flags=data=>['offboarding','employmentPeriods'].map((key,i)=>data.sections.find(s=>s.key===key).rows.some(r=>r.id===(i?period.id:parent.id)))
 await repo('RequestType').update({id:type.id},{isConfidential:false})
 assert.deepEqual(flags(ok(await request(U.editor,'GET','/employees/'+E.target.id+'/data-export'),200)),[true,true])
 await repo('RequestType').update({id:type.id},{isConfidential:true})
 const secret=ok(await request(U.editor,'GET','/employees/'+E.target.id+'/data-export'),200)
 assert.deepEqual(flags(secret),[false,false]);assert.equal(JSON.stringify(secret).includes('P4D_PARENT_REASON'),false)
 t.diagnostic(JSON.stringify({publicParentAndPeriod:[true,true],confidentialParentAndPeriod:[false,false]}))
})
test('P4D-R01: rollback after the audit insert leaves exactly one audit; retries bounded to three',async t=>{
 const original=ds.transaction;let calls=0,rejects=2
 ds.transaction=function(...args){const work=args.at(-1);if(typeof work!=='function'||!String(work).includes('EMPLOYEE_DATA_SECTIONS'))return original.apply(this,args)
  calls++;return original.call(this,async em=>{const result=await work(em);if(calls<=rejects)throw Object.assign(new Error('P4D synthetic deadlock after audit'),{driverError:{number:1205}});return result})}
 try{
  const before=await auditCount();ok(await request(U.editor,'GET','/employees/'+E.target.id+'/data-export'),200)
  assert.equal(calls,3);assert.equal(await auditCount()-before,1)
  calls=0;rejects=99;const beforeFail=await auditCount();assert.equal((await request(U.editor,'GET','/employees/'+E.target.id+'/data-export')).status,500)
  assert.equal(calls,3);assert.equal(await auditCount(),beforeFail)
  t.diagnostic(JSON.stringify({successAttempts:3,committedAudits:1,exhaustedAttempts:3,exhaustedAudits:0}))
 }finally{ds.transaction=original}
})
test('P4D-P02: public loan installments exported; confidential parent and foreign owner excluded',async t=>{
 const loan=await repo('Loan').save({employeeId:E.target.id,amount:1000,status:'ACTIVE'})
 const installment=await repo('LoanInstallment').save({loanId:loan.id,dueDate:'2026-12-01',amount:1000,paid:false})
 const data=ok(await request(U.editor,'GET','/employees/'+E.target.id+'/data-export'),200)
 assert.ok(data.sections.find(s=>s.key==='loans').rows.some(r=>r.id===loan.id))
 assert.ok(data.sections.find(s=>s.key==='loanInstallments').rows.some(r=>r.id===installment.id))
 assert.equal((await repo('LoanInstallment').countBy({id:installment.id})),1)
 
 const rt=await repo('RequestType').findOneByOrFail({code:'LOAN'})
 const source=await repo('Request').save({typeCode:'LOAN',requesterId:E.target.id,branchId:B.one.id,status:'COMPLETED',payload:'{}'})
 await repo('Loan').update({id:loan.id},{requestId:source.id});await repo('RequestType').update({id:rt.id},{isConfidential:true})
 const foreign=await repo('Loan').save({employeeId:E.other.id,amount:300,status:'ACTIVE'})
 const foreignPart=await repo('LoanInstallment').save({loanId:foreign.id,dueDate:'2026-12-01',amount:300,paid:false})
 const hidden=ok(await request(U.editor,'GET','/employees/'+E.target.id+'/data-export'),200)
 assert.ok(!hidden.sections.find(s=>s.key==='loanInstallments').rows.some(r=>r.id===installment.id||r.id===foreignPart.id))
 t.diagnostic(JSON.stringify({publicInstallment:true,confidentialInstallment:false,foreignInstallment:false}))
})
test('P4D-R02: a branch transfer between rolled-back attempt and retry causes a fresh 404 scope decision',async t=>{
 const original=ds.transaction;let calls=0,moved=false
 const before=await auditCount()
 ds.transaction=async function(...args){const work=args.at(-1);if(typeof work!=='function'||!String(work).includes('EMPLOYEE_DATA_SECTIONS'))return original.apply(this,args)
  calls++
  try{return await original.call(this,async em=>{const result=await work(em);if(calls===1)throw Object.assign(new Error('P4D scope retry'),{number:1205});return result})}
  catch(error){if(calls===1&&!moved){moved=true;const ctx=ok(await request(admin,'GET','/attendance/calendar-context?scope=EMPLOYEE&sourceId='+E.target.id),200)
   ok(await request(admin,'PATCH','/employees/'+E.target.id,{branchId:B.two.id,calendarChange:{effectiveFrom:'2026-10-01',reason:'P4D move between attempts',expectedRevision:ctx.revision,expectedCurrentSourceHash:ctx.currentSourceHash}}),200)}throw error}
 }
 try{const result=await request(U.editor,'GET','/employees/'+E.target.id+'/data-export');assert.equal(result.status,404);assert.equal(calls,2);assert.equal(await auditCount(),before)
  t.diagnostic(JSON.stringify({attempts:calls,status:result.status,audits:0,scopeReevaluated:true}))
 }finally{ds.transaction=original}
})
