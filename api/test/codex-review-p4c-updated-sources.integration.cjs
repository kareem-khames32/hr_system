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

async function privateType(code,handler,required=[]){const chain=await repo('ApprovalChain').save({code:code+'_CHAIN',nameAr:'Synthetic private chain',isActive:true,autoApprove:true});return repo('RequestType').save({code,nameAr:code,category:'personal_data',destinationHandler:handler,approvalChainId:chain.id,isActive:true,isConfidential:true,requiredFields:JSON.stringify(required)})}
async function maskedAndExported(req,marker,section){
 const permissions=JSON.stringify(['employees.view','employees.edit','requests.view_all']);await repo('User').update({id:U.editor.id},{permissions});U.editor.permissions=permissions
 assert.equal(JSON.stringify(ok(await request(U.editor,'GET','/requests/'+req.id),200)).includes(marker),false)
 const data=ok(await request(U.editor,'GET','/employees/'+E.target.id+'/data-export'),200)
 assert.ok(!data.sections.find(s=>s.key==='requests').rows.some(r=>r.id===req.id))
 assert.equal(JSON.stringify(data.sections.find(s=>s.key==='changeHistory')).includes(marker),false)
 return data.sections.find(s=>s.key===section).rows
}
test('P4C-S01: confidential dependent removal copies reason onto an existing unlinked row',async t=>{
 ok(await request(admin,'PUT','/modules/dependents',{enabled:true}),200);app.get(require('../src/modules-registry/modules.service').ModulesService).invalidate()
 const dependent=ok(await request(admin,'POST','/dependents',{employeeId:E.target.id,nameAr:'Synthetic dependent',relation:'SON',birthDate:'2020-01-01'}),201)
 const rt=await privateType('P4C_DEP_REMOVE','dependents_update',['reason'])
 const marker='P4C_PRIVATE_DEPENDENT_REMOVAL_REASON'
 const req=ok(await request(U.self,'POST','/requests',{typeCode:rt.code,payload:{dependentAction:'حذف معال',dependent:'Synthetic dependent — ابن (#'+dependent.id+')',reason:marker},submit:true}),201)
 assert.equal(req.status,'COMPLETED')
 const rows=await maskedAndExported(req,marker,'dependents'),leaked=rows.find(r=>r.id===dependent.id)
 assert.ok(leaked);assert.equal(leaked.removeReason,marker);assert.equal(leaked.requestId,null)
 t.diagnostic(JSON.stringify({requestHidden:true,historyHidden:true,section:'dependents',privateReasonExported:true,creationRequestId:leaked.requestId}))
})
test('P4C-S02: confidential custody loss copies description onto the old assignment',async t=>{
 const asset=await repo('Asset').save({name:'Synthetic asset',category:'Equipment',branchId:B.one.id,currentHolderId:E.target.id,status:'ASSIGNED',value:200})
 const assignment=await repo('CustodyAssignment').save({assetId:asset.id,employeeId:E.target.id,status:'ACTIVE',condition:'Public original condition'})
 const rt=await privateType('P4C_CUSTODY_LOSS','custody_finance',['assignmentId','description'])
 const marker='P4C_PRIVATE_CUSTODY_LOSS_DESCRIPTION'
 const req=ok(await request(U.self,'POST','/requests',{typeCode:rt.code,payload:{assignmentId:assignment.id,description:marker},submit:true}),201)
 assert.equal(req.status,'COMPLETED')
 const rows=await maskedAndExported(req,marker,'custody'),leaked=rows.find(r=>r.id===assignment.id)
 assert.ok(leaked);assert.equal(leaked.condition,marker);assert.equal(leaked.requestId,null)
 t.diagnostic(JSON.stringify({requestHidden:true,section:'custody',privateDescriptionExported:true,creationRequestId:leaked.requestId}))
})
test('P4C-S03: confidential archive request copies its reason into the exported employee',async t=>{
 const rt=await privateType('P4C_ARCHIVE','employee_status',['newStatus','reason'])
 const marker='P4C_PRIVATE_ARCHIVE_REASON'
 const req=ok(await request(U.self,'POST','/requests',{typeCode:rt.code,payload:{newStatus:'archived',reason:marker},submit:true}),201)
 assert.equal(req.status,'COMPLETED')
 assert.equal(JSON.stringify(ok(await request(U.editor,'GET','/requests/'+req.id),200)).includes(marker),false)
 const data=ok(await request(U.editor,'GET','/employees/'+E.target.id+'/data-export'),200)
 assert.equal(JSON.stringify(data.sections.find(s=>s.key==='requests')).includes(marker),false)
 assert.equal(JSON.stringify(data.sections.find(s=>s.key==='changeHistory')).includes(marker),false)
 assert.equal(data.employee.archiveReason,marker)
 t.diagnostic(JSON.stringify({requestHidden:true,historyHidden:true,section:'employee.archiveReason',privateReasonExported:true}))
})
