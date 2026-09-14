// Real SQL/HTTP/PDF regression coverage for general HR templates. Uses only its own temporary database.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_documents_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-documents-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, master, ds, base, created = false, admin, manager, editor, outsider, employee, otherEmployee, branch, otherBranch, subject, otherSubject
const repo = name => ds.getRepository(name)
const key = () => crypto.randomUUID()
function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null,
    employeeId: user.employeeId ?? null, tokenVersion: user.tokenVersion ?? 0,
    permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
function raw(user, method, url, body) {
  return fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
}
async function request(user, method, url, body) {
  const response = await raw(user, method, url, body)
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const draft = body => ({ title: 'نموذج موارد بشرية للاختبار', greeting: '', body, closing: 'اسم الموظف وتوقيعه: __________________', footer: 'نموذج اختبار — بيانات افتراضية' })
async function published(body, customFields = [], category = 'general') {
  const created = await request(admin, 'POST', '/hr-documents/templates', { name: `قالب اختبار ${key().slice(0, 8)}`, category, draft: draft(body), customFields })
  assert.equal(created.status, 201, JSON.stringify(created.body))
  const result = await request(admin, 'POST', `/hr-documents/templates/${created.body.id}/publish`, { version: created.body.version })
  assert.equal(result.status, 201, JSON.stringify(result.body))
  assert.ok(result.body.publishedRevision?.id)
  return result.body
}
const issueBody = (template, extra = {}) => ({ templateId: template.id, revisionId: template.publishedRevision.id, values: {}, idempotencyKey: key(), ...extra })
const countFiles = () => repo('StoredFile').count()
before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433),
    user: env.DB_USERNAME, password: env.DB_PASSWORD, database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  ds = app.get(require('../node_modules/typeorm').DataSource)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  branch = await repo('Branch').save({ name: 'Document test A', code: 'DOC_A' })
  otherBranch = await repo('Branch').save({ name: 'Document test B', code: 'DOC_B' })
  subject = await repo('Employee').save({ employeeCode: 'DOC001', fullName: 'موظف نموذج الاختبار', branchId: branch.id,
    nationalId: 'TEST-100', jobTitle: 'فني تشغيل', joinDate: '2020-01-01', contractNumber: 'CON-TEST-01', contractType: 'fixed_term',
    contractStart: '2026-01-01', contractEnd: '2026-12-31', basicSalary: 5000, currency: 'SAR', status: 'active' })
  otherSubject = await repo('Employee').save({ employeeCode: 'DOC002', fullName: 'Other branch employee', branchId: otherBranch.id, status: 'active' })
  const user = (email, role, branchId, employeeId, permissions = []) => repo('User').save({ email, displayName: email, passwordHash: 'test-only', role,
    branchId, employeeId, permissions: JSON.stringify(permissions) })
  admin = await user('admin@documents.invalid', 'super_admin', null, null)
  manager = await user('docs@documents.invalid', 'hr_manager', branch.id, null, ['documents.manage'])
  editor = await user('editor@documents.invalid', 'hr_manager', branch.id, null, ['documents.manage', 'employees.edit'])
  outsider = await user('otherhr@documents.invalid', 'hr_manager', otherBranch.id, null, ['documents.manage', 'employees.edit'])
  employee = await user('employee@documents.invalid', 'employee', branch.id, subject.id)
  otherEmployee = await user('otheremployee@documents.invalid', 'employee', otherBranch.id, otherSubject.id)
  await repo('RequestsConfig').save({ key: 'company.name', value: 'شركة النموذج — للاختبار فقط' })
}, { timeout: 60000 })
after(async () => {
  if (app) await app.close()
  if (created && master) {
    assert.match(database, /^hr_documents_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
    await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
  }
  if (master) await master.close()
  assert.equal(path.dirname(path.resolve(uploads)), os.tmpdir()); assert.match(path.basename(uploads), /^hr-documents-files-/)
  fs.rmSync(uploads, { recursive: true, force: true })
})

test('HR template permissions and validation prevent forged variables and null patches without changing letters', async () => {
  const letters = await repo('LetterTemplate').find({ order: { id: 'ASC' } })
  const bindings = await repo('LetterTemplateBinding').find({ order: { requestTypeCode: 'ASC' } })
  assert.equal((await request(null, 'GET', '/hr-documents/templates/catalog')).status, 401)
  assert.equal((await request(manager, 'GET', '/hr-documents/templates/catalog')).status, 403)
  assert.equal((await request(employee, 'GET', '/hr-documents/templates')).status, 403)
  for (const body of [
    { name: 'Test', category: 'not-real', draft: draft('مستند للتجربة فقط'), customFields: [] },
    { name: 'Test', category: 'general', draft: draft('{{employee.passwordHash}}'), customFields: [] },
    { name: 'Test', category: 'general', draft: draft('{{custom.value}}'), customFields: [{ key: 'custom.value', label: 'Value', required: true }, { key: 'custom.value', label: 'Duplicate', required: false }] },
    { name: 'Test', category: 'general', draft: draft('مستند للتجربة فقط'), customFields: [{ key: 'employee.fullName', label: 'Forged', required: false }] },
  ]) assert.equal((await request(admin, 'POST', '/hr-documents/templates', body)).status, 400)
  const template = await published('مستند موارد بشرية للتجربة فقط.')
  for (const field of ['name', 'category', 'draft', 'customFields', 'isActive']) {
    assert.equal((await request(admin, 'PATCH', `/hr-documents/templates/${template.id}`, { version: template.version, [field]: null })).status, 400)
  }
  assert.deepEqual(await repo('LetterTemplate').find({ order: { id: 'ASC' } }), letters)
  assert.deepEqual(await repo('LetterTemplateBinding').find({ order: { requestTypeCode: 'ASC' } }), bindings)
})

test('draft edits do not change publication, and stale versions cannot overwrite a template', async () => {
  const template = await published('النص المنشور الأصلي لهذا النموذج.')
  const update = await request(admin, 'PATCH', `/hr-documents/templates/${template.id}`, { version: template.version, draft: draft('نص جديد قيد الإعداد لا يصدر بعد.') })
  assert.equal(update.status, 200, JSON.stringify(update.body))
  assert.equal((await request(admin, 'PATCH', `/hr-documents/templates/${template.id}`, { version: template.version, name: 'stale' })).status, 409)
  const publishedCatalog = await request(manager, 'GET', '/hr-documents/templates')
  const visible = publishedCatalog.body.templates.find(row => row.id === template.id)
  assert.equal(visible.publishedRevision.content.body, 'النص المنشور الأصلي لهذا النموذج.')
  assert.ok(!JSON.stringify(visible).includes('قيد الإعداد'))
  const result = await request(admin, 'POST', `/hr-documents/templates/${template.id}/publish`, { version: update.body.version })
  assert.equal(result.status, 201, JSON.stringify(result.body))
  assert.equal(result.body.publishedRevision.revision, template.publishedRevision.revision + 1)
  assert.equal((await request(manager, 'POST', '/hr-documents/issue', issueBody(template))).status, 409)
})

test('sample preview is a real PDF and neither it nor employee preview creates records', { timeout: 30000 }, async () => {
  const before = await countFiles()
  const sample = await raw(admin, 'POST', '/hr-documents/templates/preview', { draft: draft('{{company.name}} — {{employee.fullName}} — {{contract.number}}'), customFields: [] })
  assert.equal(sample.status, 201)
  assert.match(sample.headers.get('content-type'), /application\/pdf/)
  assert.equal(Buffer.from(await sample.arrayBuffer()).subarray(0, 5).toString(), '%PDF-')
  const template = await published('{{company.name}}\nاسم الموظف: {{employee.fullName}}\nرقم العقد: {{contract.number}}', [], 'contract')
  const actual = await raw(manager, 'POST', '/hr-documents/preview', { templateId: template.id, revisionId: template.publishedRevision.id, employeeId: subject.id, values: {} })
  assert.equal(actual.status, 201)
  const pdf = Buffer.from(await actual.arrayBuffer())
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-')
  const output = path.resolve(apiRoot, '../output/pdf/hr-general-document-sample.pdf')
  fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, pdf)
  assert.equal(await countFiles(), before)
  assert.equal(await repo('HrIssuedDocument').count(), 0)
})

test('employee and custom fields are required only when referenced, with branch isolation before issuance', async () => {
  const template = await published('الموظف {{employee.fullName}}؛ مرجع النموذج {{custom.reference}}', [{ key: 'custom.reference', label: 'مرجع النموذج', required: true }])
  const count = await countFiles()
  for (const extra of [{}, { employeeId: subject.id }, { employeeId: subject.id, values: { 'custom.unknown': 'bad' } }]) {
    assert.equal((await request(manager, 'POST', '/hr-documents/issue', issueBody(template, extra))).status, 400)
  }
  assert.equal((await request(manager, 'POST', '/hr-documents/issue', issueBody(template, { employeeId: otherSubject.id, values: { 'custom.reference': 'R1' } }))).status, 403)
  assert.equal((await request(manager, 'POST', '/hr-documents/issue', issueBody(template, { employeeId: subject.id, values: { 'employee.fullName': 'Forged', 'custom.reference': 'R1' } }))).status, 400)
  const options = await request(manager, 'GET', '/hr-documents/employees')
  assert.ok(options.body.some(row => row.id === subject.id)); assert.ok(!options.body.some(row => row.id === otherSubject.id))
  assert.equal(await countFiles(), count)
})

test('issuance archives a PDF in employee documents and concurrent retries issue it only once', { timeout: 40000 }, async () => {
  const template = await published('الموظف {{employee.fullName}}، المرجع {{custom.reference}}.', [{ key: 'custom.reference', label: 'مرجع', required: true }])
  const body = issueBody(template, { employeeId: subject.id, values: { 'custom.reference': 'HR-TEST-01' } })
  const before = await countFiles(), docs = await repo('EmployeeDocument').count()
  const results = await Promise.all([request(manager, 'POST', '/hr-documents/issue', body), request(manager, 'POST', '/hr-documents/issue', body)])
  for (const result of results) assert.equal(result.status, 201, JSON.stringify(result.body))
  assert.equal(results[0].body.id, results[1].body.id)
  assert.equal(await countFiles(), before + 1)
  assert.equal(await repo('EmployeeDocument').count(), docs + 1)
  const issued = results[0].body
  const document = await repo('EmployeeDocument').findOneBy({ id: issued.employeeDocumentId })
  assert.equal(document.employeeId, subject.id); assert.equal(document.fileRef, issued.fileRef)
  const pdf = await raw(employee, 'GET', `/hr-documents/issued/${issued.id}/download`)
  assert.equal(pdf.status, 200); assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0, 5).toString(), '%PDF-')
  assert.equal((await raw(employee, 'GET', `/files/${issued.fileRef.slice(5)}`)).status, 200)
  assert.equal((await raw(otherEmployee, 'GET', `/files/${issued.fileRef.slice(5)}`)).status, 403)
  assert.ok([403, 404].includes((await raw(outsider, 'GET', `/hr-documents/issued/${issued.id}/download`)).status))
  assert.equal((await request(manager, 'POST', '/hr-documents/issue', { ...body, values: { 'custom.reference': 'changed' } })).status, 409)
})

test('a saved document keeps its bytes after template and employee changes; an idempotent retry returns that issuance', { timeout: 40000 }, async () => {
  const template = await published('هذه النسخة باسم {{employee.fullName}} وتبقى محفوظة.')
  const body = issueBody(template, { employeeId: subject.id })
  const first = await request(manager, 'POST', '/hr-documents/issue', body)
  assert.equal(first.status, 201, JSON.stringify(first.body))
  const hash = async () => crypto.createHash('sha256').update(Buffer.from(await (await raw(manager, 'GET', `/hr-documents/issued/${first.body.id}/download`)).arrayBuffer())).digest('hex')
  const originalHash = await hash()
  await repo('Employee').update(subject.id, { fullName: 'اسم معدل بعد الإصدار' })
  const update = await request(admin, 'PATCH', `/hr-documents/templates/${template.id}`, { version: template.version, draft: draft('صياغة جديدة لا تبدل النسخة السابقة.') })
  assert.equal((await request(admin, 'POST', `/hr-documents/templates/${template.id}/publish`, { version: update.body.version })).status, 201)
  const again = await request(manager, 'POST', '/hr-documents/issue', body)
  assert.equal(again.status, 201, JSON.stringify(again.body)); assert.equal(again.body.id, first.body.id)
  assert.equal(await hash(), originalHash)
  await repo('Employee').update(subject.id, { fullName: subject.fullName })
})

test('financial tokens and both PDF download paths enforce finance permission and current branch', { timeout: 40000 }, async () => {
  const template = await published('إفادة داخلية للموظف {{employee.fullName}} بمبلغ {{salary.total}} {{salary.currency}}.')
  const body = issueBody(template, { employeeId: subject.id })
  assert.equal((await request(manager, 'POST', '/hr-documents/issue', body)).status, 403)
  const { idempotencyKey, ...preview } = body
  assert.equal((await request(manager, 'POST', '/hr-documents/preview', preview)).status, 403)
  const result = await request(editor, 'POST', '/hr-documents/issue', body)
  assert.equal(result.status, 201, JSON.stringify(result.body))
  for (const route of [`/hr-documents/issued/${result.body.id}/download`, `/files/${result.body.fileRef.slice(5)}`]) {
    assert.equal((await raw(manager, 'GET', route)).status, 403)
    assert.equal((await raw(employee, 'GET', route)).status, 200)
    assert.ok([403, 404].includes((await raw(outsider, 'GET', route)).status))
  }
  await repo('Employee').update(subject.id, { branchId: otherBranch.id })
  assert.ok([403, 404].includes((await raw(editor, 'GET', `/files/${result.body.fileRef.slice(5)}`)).status))
  await repo('Employee').update(subject.id, { branchId: branch.id })
})

test('a general company document needs no employee and remains visible only in its branch scope', { timeout: 30000 }, async () => {
  const template = await published('مذكرة موارد بشرية عامة: {{custom.reference}}.', [{ key: 'custom.reference', label: 'موضوع المذكرة', required: true }])
  const count = await repo('EmployeeDocument').count()
  const result = await request(manager, 'POST', '/hr-documents/issue', issueBody(template, { values: { 'custom.reference': 'تنظيم الورشة التدريبية' } }))
  assert.equal(result.status, 201, JSON.stringify(result.body))
  assert.equal(result.body.employeeId, null); assert.equal(result.body.employeeDocumentId, null)
  assert.equal(await repo('EmployeeDocument').count(), count)
  assert.equal((await raw(manager, 'GET', `/files/${result.body.fileRef.slice(5)}`)).status, 200)
  assert.ok([403, 404].includes((await raw(outsider, 'GET', `/files/${result.body.fileRef.slice(5)}`)).status))
  const list = await request(manager, 'GET', '/hr-documents/issued')
  assert.ok(list.body.some(row => row.id === result.body.id))
  assert.ok(!(await request(outsider, 'GET', '/hr-documents/issued')).body.some(row => row.id === result.body.id))
  assert.ok(list.body.every(row => !('snapshot' in row) && !('values' in row)))
})

test('a database failure after PDF creation leaves no files or partial records and the same key can retry', { timeout: 40000 }, async () => {
  const template = await published('نسخة اختبار للتأكد من اكتمال الحفظ للموظف {{employee.fullName}}.')
  const body = issueBody(template, { employeeId: subject.id })
  const counts = async () => Promise.all(['StoredFile', 'EmployeeDocument', 'HrIssuedDocument'].map(name => repo(name).count()))
  const before = await counts()
  const diskFiles = () => fs.readdirSync(uploads, { recursive: true }).filter(name => name.endsWith('.pdf')).sort()
  const filesBefore = diskFiles()
  await ds.query("CREATE TRIGGER hr_docs_test_failure ON hr_issued_documents AFTER INSERT AS BEGIN THROW 51001, 'Intentional integration test failure', 1; END")
  try {
    assert.equal((await request(manager, 'POST', '/hr-documents/issue', body)).status, 500)
    assert.deepEqual(await counts(), before)
    assert.deepEqual(diskFiles(), filesBefore)
  } finally { await ds.query('DROP TRIGGER hr_docs_test_failure') }
  assert.equal((await request(manager, 'POST', '/hr-documents/issue', body)).status, 201)
  assert.deepEqual(await counts(), before.map(count => count + 1))
})
