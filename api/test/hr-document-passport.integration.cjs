// قرار المالك 30 سبتمبر: موظف بجواز بس (من غير رقم هوية) يطلعله مستند موارد بشرية وخطاب.
// متغيرا «رقم الجواز» و«رقم الهوية أو الجواز» (الهوية لو موجودة وإلا الجواز) في مستندات الموارد البشرية والخطابات،
// و«رقم الهوية» الفاضي يفضل مرفوض برسالة بتقول يستخدم «رقم الهوية أو الجواز».
// تكامل حقيقي عبر AppModule وJWT وSQL في قاعدة مؤقتة خاصة بالاختبار فقط.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_passport_docs_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-passport-docs-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, master, ds, base, created = false
const f = {}
const PASSPORT = 'P-TEST-7788', NATIONAL = 'ID-TEST-1122', OTHER_PASSPORT = 'P-TEST-3344'

function guarded() { assert.match(database, /^hr_passport_docs_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE); if (ds) assert.equal(ds.options.database, database) }
const repo = name => { guarded(); return ds.getRepository(name) }
function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function http(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(user)}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  let parsed = null
  try { parsed = text ? JSON.parse(text) : null } catch { parsed = text }
  return { status: response.status, body: parsed }
}
function expect(result, status) { assert.equal(result.status, status, JSON.stringify(result.body)); return result.body }
const draft = body => ({ title: 'إفادة بيانات الهوية', greeting: '', body, closing: 'إدارة الموارد البشرية', footer: 'مستند اختبار' })
async function published(body) {
  const template = expect(await http(f.admin, 'POST', '/hr-documents/templates', { name: `قالب جواز ${crypto.randomUUID().slice(0, 8)}`, category: 'certificate', draft: draft(body), customFields: [] }), 201)
  return expect(await http(f.admin, 'POST', `/hr-documents/templates/${template.id}/publish`, { version: template.version }), 201)
}
const issue = (template, employeeId) => http(f.manager, 'POST', '/hr-documents/issue', { templateId: template.id, revisionId: template.publishedRevision.id, employeeId, values: {}, idempotencyKey: crypto.randomUUID() })
const isolated = value => `⁦${value}⁩`

before(async () => {
  guarded(); assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1'); ds = app.get(require('../node_modules/typeorm').DataSource); guarded()
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  f.branch = await repo('Branch').save({ code: 'PASS_B', name: 'فرع اختبار الجواز' })
  const person = (code, extra) => repo('Employee').save({ employeeCode: code, fullName: `موظف ${code}`, branchId: f.branch.id, jobTitle: 'فني تشغيل',
    joinDate: '2021-03-01', basicSalary: 5000, currency: 'SAR', status: 'active', isActive: true, ...extra })
  f.passportOnly = await person('PASS01', { nationalId: null, passportNo: PASSPORT })
  f.withId = await person('PASS02', { nationalId: NATIONAL, passportNo: OTHER_PASSPORT })
  f.neither = await person('PASS03', { nationalId: null, passportNo: null })
  const user = (email, role, permissions = []) => repo('User').save({ email, displayName: email, passwordHash: 'isolated-token-only', role,
    branchId: role === 'super_admin' ? null : f.branch.id, employeeId: null, permissions: JSON.stringify(permissions) })
  f.admin = await user('admin@passport-docs.invalid', 'super_admin')
  f.manager = await user('docs@passport-docs.invalid', 'hr_manager', ['documents.manage'])
  await repo('RequestsConfig').save({ key: 'company.name', value: 'شركة اختبار الجواز' })
}, { timeout: 60000 })

after(async () => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      guarded()
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('name', database).query('SELECT DB_ID(@name) AS id')).recordset[0].id, null)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir())); assert.match(path.basename(uploads), /^hr-passport-docs-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'تعذر تنظيف موارد اختبار الجواز')
})

test('the HR document and letter template editors list «رقم الجواز» and «رقم الهوية أو الجواز» next to «رقم الهوية»', async () => {
  for (const route of ['/hr-documents/templates/catalog', '/letters/templates']) {
    const variables = expect(await http(f.admin, 'GET', route), 200).variables
    const label = key => variables.find(variable => variable.key === key)?.label
    assert.deepEqual([label('employee.nationalId'), label('employee.passportNo'), label('employee.identityNumber')], ['رقم الهوية', 'رقم الجواز', 'رقم الهوية أو الجواز'], route)
  }
})

test('a passport-only employee issues a document with «رقم الهوية أو الجواز»: the ID when present, otherwise the passport, printed left-to-right', { timeout: 60000 }, async () => {
  const template = await published('رقم الهوية أو الجواز: {{employee.identityNumber}} — رقم الجواز: {{employee.passportNo}}')
  const passport = expect(await issue(template, f.passportOnly.id), 201)
  const passportRow = await repo('HrIssuedDocument').findOneByOrFail({ id: passport.id })
  assert.deepEqual(passportRow.snapshot.values, { 'employee.identityNumber': PASSPORT, 'employee.passportNo': PASSPORT })
  assert.ok(passportRow.snapshot.content.body.includes(`رقم الهوية أو الجواز: ${isolated(PASSPORT)}`), passportRow.snapshot.content.body)
  // عنده الاتنين: «الهوية أو الجواز» = الهوية، و«رقم الجواز» = الجواز
  const both = expect(await issue(template, f.withId.id), 201)
  assert.deepEqual((await repo('HrIssuedDocument').findOneByOrFail({ id: both.id })).snapshot.values, { 'employee.identityNumber': NATIONAL, 'employee.passportNo': OTHER_PASSPORT })
  // لا هوية ولا جواز: الرفض زي أي بيان مطلوب ناقص، ومفيش ملف اتعمل
  const files = await repo('StoredFile').count()
  const refused = expect(await issue(await published('رقم الهوية أو الجواز: {{employee.identityNumber}}'), f.neither.id), 400)
  assert.match(refused.message, /بيان مطلوب غير متوفر: رقم الهوية أو الجواز \(employee\.identityNumber\)/)
  assert.equal(await repo('StoredFile').count(), files)
})

test('an empty «رقم الهوية» is still refused, and the message tells the user to use «رقم الهوية أو الجواز»', async () => {
  const template = await published('رقم الهوية: {{employee.nationalId}}')
  const refused = expect(await issue(template, f.passportOnly.id), 400)
  assert.match(refused.message, /^بيان مطلوب غير متوفر: رقم الهوية \(employee\.nationalId\)/)
  assert.match(refused.message, /استخدم في القالب «رقم الهوية أو الجواز» بدل «رقم الهوية»/)
  // غيره من البيانات الناقصة مالوش التلميح ده
  const other = expect(await issue(await published('الجواز: {{employee.passportNo}}'), f.neither.id), 400)
  assert.doesNotMatch(other.message, /رقم الهوية أو الجواز/)
  expect(await issue(template, f.withId.id), 201)
})

test('a letter for a passport-only employee prints the passport through «رقم الهوية أو الجواز»', { timeout: 60000 }, async () => {
  const catalog = expect(await http(f.admin, 'GET', '/letters/templates'), 200)
  const employment = catalog.templates.find(template => template.code === 'LETTER_EMPLOYMENT')
  const body = 'تشهد {{company.name}} بأن {{employee.fullName}}، رقم الهوية أو الجواز {{employee.identityNumber}}، يعمل لدينا منذ {{employee.joinDate}}.'
  const updated = expect(await http(f.admin, 'PATCH', `/letters/templates/${employment.id}`, { version: employment.version, draft: { ...employment.draft, body } }), 200)
  expect(await http(f.admin, 'POST', `/letters/templates/${employment.id}/publish`, { version: updated.version }), 201)
  const letters = app.get(require('../src/letters/letters.service').LettersService)
  const generate = async employee => {
    const request = await repo('Request').save({ typeCode: 'LETTER_EMPLOYMENT', requesterId: employee.id, branchId: f.branch.id, status: 'APPROVED', payload: JSON.stringify({ purpose: 'تقديمه لجهة حكومية' }) })
    await ds.transaction(em => letters.generate(em, request, { code: 'LETTER_EMPLOYMENT' }, { purpose: 'تقديمه لجهة حكومية' }))
    return (await repo('LetterRequest').findOneByOrFail({ requestId: request.id })).contentSnapshot.content.body
  }
  assert.ok((await generate(f.passportOnly)).includes(`رقم الهوية أو الجواز ${isolated(PASSPORT)}`))
  assert.ok((await generate(f.withId)).includes(`رقم الهوية أو الجواز ${isolated(NATIONAL)}`))
})
