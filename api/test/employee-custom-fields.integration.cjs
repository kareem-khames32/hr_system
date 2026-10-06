'use strict'
// B2.9-ب: الحقول المخصصة على ملف الموظف، على قاعدة SQL مؤقتة معزولة بتتمسح في الآخر (hr_custom_fields_test_<16 hex>).
//  EF-01) تعريف الحقول من الإعدادات («إدارة الإعدادات» بس): الأنواع الخمسة، والمفتاح الفريد وحدوده، والنوع والمفتاح مابيتغيّروش،
//         والتعطيل بيخبّي الحقل وقيمه بتفضل، وكل تغيير في سجل التدقيق.
//  EF-02) قراءة قيم الموظف بقاعدة ملفه: صاحب الملف، أو «عرض الموظفين» في نطاق فروعه (غيره 403، وبرّه النطاق «غير موجود»)؛ والحقل
//         المقيّد للي معاه «تعديل الموظفين» بس: لا تعريفه ولا قيمته لغيره، ولا لصاحب الملف.
//  EF-03) الحفظ بـ«تعديل الموظفين» في النطاق: كل نوع بقيمته، والغلط برسالته من غير أي كتابة، والإلزامي مايتفضّاش، والمفتاح المجهول مرفوض.
//  EF-04) شرط الجمهور بالحقل المخصص: نوع الطلب بيظهر ويتقدّم للي قيمته من القايمة بس؛ والحفظ بيدقق الحقل والقيم؛ وحقل اتعطّل أو بقى
//         مقيّد = مفيش حد من الجمهور؛ وشاشة الخصم بنفس المقيّم.
//  EF-05) الحقول بحد أقصى 50، والمعطّل محسوب.
//  EF-06) القراءة والحفظ تحت قفل واحد باسم الموظف (Codex CRP2T-B-B01): قيمة اتحفظت بعد ما القراءة بدأت مابترجعش فيها، والحفظ بيستنى
//         القراءة، والقراءتين مابيوقفوش بعض، واللي مايلاقيش القفل «حاول تاني» من غير أي كتابة.
// Run (من api/): node --test test/employee-custom-fields.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_custom_fields_test_${crypto.randomBytes(8).toString('hex')}`
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, master, ds, base, created = false, employeeNumber = 0
const org = {}, users = {}, emps = {}, types = {}, fields = {}
const NOT_FOUND = [404, 'الموظف غير موجود'], NO_VIEW = [403, 'لا تملك صلاحية عرض الموظفين'], REFUSED = [403, 'هذا النوع من الطلبات غير متاح لك']

function assertDisposable() {
  assert.match(database, /^hr_custom_fields_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
const query = (text, params = []) => { assertDisposable(); return ds.query(text, params) }
const payloadOf = user => ({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false,
  permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt.sign(payloadOf(user))}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  let parsed = null
  try { parsed = text ? JSON.parse(text) : null } catch { parsed = text }
  return { status: response.status, body: parsed }
}
function expectStatus(response, status) {
  assert.equal(response.status, status, JSON.stringify(response.body))
  return response.body
}
const answer = response => [response.status, [].concat(response.body?.message ?? []).join('، ')]
const employee = (extra = {}) => {
  const number = ++employeeNumber
  return repo('Employee').save({ employeeCode: `EF${String(number).padStart(3, '0')}`, fullName: `موظف الحقول ${number}`, branchId: org.branchA.id, joinDate: '2020-01-01',
    basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'transfer', ...extra })
}
const account = (label, role, permissions, extra = {}) => repo('User').save({ email: `${label}@custom-fields.invalid`, displayName: `حساب ${label}`, passwordHash: 'test-only',
  role, branchId: org.branchA.id, permissions: JSON.stringify(permissions), isActive: true, ...extra })
const define = (user, body) => request(user, 'POST', '/settings/employee-fields', body)
const redefine = (user, field, body) => request(user, 'PATCH', `/settings/employee-fields/${field.id}`, body)
const read = (user, emp) => request(user, 'GET', `/employees/${emp.id}/custom-fields`)
const write = (user, emp, values) => request(user, 'PUT', `/employees/${emp.id}/custom-fields`, { values })
// مفتاح الحقل ← قيمته في الرد
const valuesOf = body => Object.fromEntries(body.fields.map(field => [field.fieldKey, field.value]))
const stored = emp => query(`SELECT f.[fieldKey], v.[textValue], v.[numberValue], v.[dateValue], v.[updatedByUserId] FROM [employee_custom_values] v
  INNER JOIN [employee_custom_fields] f ON f.[id] = v.[fieldId] WHERE v.[employeeId] = @0 ORDER BY f.[id]`, [emp.id])
const setAudience = (type, visibleTo) => request(users.admin, 'PATCH', `/settings/request-types/${type.id}`, { visibleTo })
const storedAudience = async type => (await repo('RequestType').findOneByOrFail({ id: type.id })).visibleTo
const sees = async (user, type) => JSON.stringify(expectStatus(await request(user, 'GET', '/requests/types'), 200)).includes(`"code":"${type.code}"`)
const submit = (user, type) => request(user, 'POST', '/requests', { typeCode: type.code, payload: { reason: 'طلب للاختبار' }, submit: true })

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret })
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
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`

  org.branchA = await repo('Branch').save({ code: 'EF_A', name: 'فرع الحقول أ' })
  org.branchB = await repo('Branch').save({ code: 'EF_B', name: 'فرع الحقول ب' })
  emps.manager = await employee()
  const under = { managerEmployeeId: emps.manager.id }
  emps.own = await employee(under)
  emps.peer = await employee(under)
  emps.third = await employee(under)
  emps.far = await employee({ branchId: org.branchB.id })
  users.admin = await account('admin', 'super_admin', [], { branchId: null, scopeAllBranches: true })
  users.settings = await account('settings', 'employee', ['settings.manage'])
  users.viewer = await account('viewer', 'employee', ['employees.view'])
  users.editor = await account('editor', 'employee', ['employees.view', 'employees.edit'])
  users.farEditor = await account('fareditor', 'employee', ['employees.view', 'employees.edit'], { branchId: org.branchB.id })
  users.builder = await account('builder', 'employee', ['request_types.manage'])
  users.editOnly = await account('editonly', 'employee', ['employees.edit'])
  for (const key of ['manager', 'own', 'peer', 'third']) users[key] = await account(key, 'employee', [], { employeeId: emps[key].id })
  const chain = await repo('ApprovalChain').save({ code: 'EF_DIRECT', nameAr: 'سلسلة الحقول', isActive: true, autoApprove: false })
  await repo('ApprovalStep').save({ chainId: chain.id, stepOrder: 1, approverRole: 'direct_manager_of_requester' })
  const type = (code, nameAr) => repo('RequestType').save({ code, nameAr, category: 'personal_data', destinationHandler: 'none', approvalChainId: chain.id, isActive: true })
  types.sized = await type('EF_SIZED', 'طلب لمقاس معيّن')
  types.deduction = await type('PAYROLL_DEDUCTION', 'خصم')
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assertDisposable()
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  if (errors.length) throw errors[0]
})

test('EF-01: تعريف الحقول — «إدارة الإعدادات» بس، والأنواع الخمسة، والمفتاح والنوع ثابتين، والتعطيل بيخبّي والقيم بتفضل، والتغيير في التدقيق', async () => {
  // من غير الصلاحية: لا قراءة ولا إنشاء ولا تعديل
  for (const user of [users.viewer, users.editor, users.own]) {
    assert.deepEqual([(await request(user, 'GET', '/settings/employee-fields')).status, (await define(user, { fieldKey: 'nope', label: 'ممنوع', type: 'TEXT' })).status], [403, 403])
  }
  assert.deepEqual(expectStatus(await request(users.settings, 'GET', '/settings/employee-fields'), 200), { available: true, fields: [] })
  fields.nickname = expectStatus(await define(users.settings, { fieldKey: 'nickname', label: ' اللقب ', type: 'TEXT' }), 201)
  assert.deepEqual(fields.nickname, { id: fields.nickname.id, fieldKey: 'nickname', label: 'اللقب', type: 'TEXT', options: [], required: false, restricted: false, sortOrder: 1, isActive: true })
  fields.size = expectStatus(await define(users.settings, { fieldKey: 'uniform_size', label: 'مقاس الزي', type: 'CHOICE', options: [' S ', 'M', 'M', '', 'L'], required: true }), 201)
  assert.deepEqual([fields.size.options, fields.size.required, fields.size.sortOrder], [['S', 'M', 'L'], true, 2])
  fields.car = expectStatus(await define(users.settings, { fieldKey: 'has_car', label: 'معاه عربية', type: 'YESNO' }), 201)
  fields.shoe = expectStatus(await define(users.settings, { fieldKey: 'shoe_size', label: 'مقاس الحذاء', type: 'NUMBER', sortOrder: 10 }), 201)
  fields.license = expectStatus(await define(users.settings, { fieldKey: 'license_expiry', label: 'انتهاء الرخصة', type: 'DATE' }), 201)
  fields.note = expectStatus(await define(users.settings, { fieldKey: 'hr_note', label: 'ملاحظة الموارد', type: 'TEXT', restricted: true }), 201)
  fields.band = expectStatus(await define(users.settings, { fieldKey: 'risk_band', label: 'تصنيف داخلي', type: 'CHOICE', options: ['أ', 'ب'], restricted: true }), 201)
  // الترتيب التلقائي بعد أكبر ترتيب موجود
  assert.deepEqual([fields.shoe.sortOrder, fields.license.sortOrder, fields.note.restricted, fields.band.options], [10, 11, true, ['أ', 'ب']])
  for (const [body, status, message] of [
    [{ fieldKey: 'nickname', label: 'لقب تاني', type: 'TEXT' }, 409, 'فيه حقل بنفس المفتاح'],
    [{ fieldKey: 'Bad-Key', label: 'مفتاح غلط', type: 'TEXT' }, 400, 'مفتاح الحقل: حروف إنجليزي صغيرة وأرقام و_ ، ويبدأ بحرف (من حرفين لـ40)'],
    [{ fieldKey: '1abc', label: 'مفتاح غلط', type: 'TEXT' }, 400, 'مفتاح الحقل: حروف إنجليزي صغيرة وأرقام و_ ، ويبدأ بحرف (من حرفين لـ40)'],
    [{ label: 'من غير مفتاح', type: 'TEXT' }, 400, 'مفتاح الحقل: حروف إنجليزي صغيرة وأرقام و_ ، ويبدأ بحرف (من حرفين لـ40)'],
    [{ fieldKey: 'kind', label: 'نوع غلط', type: 'FILE' }, 400, 'نوع الحقل: نص، رقم، تاريخ، اختيار، أو نعم/لا'],
    [{ fieldKey: 'kind', label: 'ن', type: 'TEXT' }, 400, 'اسم الحقل من حرفين لـ100 حرف'],
    [{ fieldKey: 'kind', label: 'اختيار فاضي', type: 'CHOICE', options: [' ', ''] }, 400, 'حقل «اختيار» محتاج اختيار واحد على الأقل'],
    [{ fieldKey: 'kind', label: 'اختيار من غير قايمة', type: 'CHOICE' }, 400, 'حقل «اختيار» محتاج اختيار واحد على الأقل'],
    [{ fieldKey: 'kind', label: 'اختيارات كتير', type: 'CHOICE', options: Array.from({ length: 31 }, (_, index) => `اختيار ${index}`) }, 400, 'الاختيارات بحد أقصى 30، وكل اختيار 100 حرف'],
  ]) assert.deepEqual(answer(await define(users.settings, body)), [status, message], JSON.stringify(body).slice(0, 80))
  assert.equal(await repo('EmployeeCustomField').count(), 7, 'المرفوض ماتكتبش')
  // التعديل: الاسم والإلزام والتقييد والاختيارات والترتيب؛ والمفتاح والنوع ثابتين
  const renamed = expectStatus(await redefine(users.settings, fields.nickname, { label: 'الاسم الحركي', sortOrder: 3 }), 200)
  assert.deepEqual([renamed.label, renamed.sortOrder, renamed.fieldKey, renamed.type], ['الاسم الحركي', 3, 'nickname', 'TEXT'])
  for (const body of [{ fieldKey: 'other' }, { type: 'NUMBER' }]) assert.deepEqual(answer(await redefine(users.settings, fields.nickname, body)), [400, 'مفتاح الحقل ونوعه مابيتغيّروش بعد إنشائه'])
  assert.deepEqual(answer(await redefine(users.settings, fields.size, { options: [] })), [400, 'حقل «اختيار» محتاج اختيار واحد على الأقل'])
  assert.deepEqual(answer(await redefine(users.settings, fields.nickname, { sortOrder: 1.5 })), [400, 'الترتيب رقم صحيح'])
  assert.deepEqual(answer(await redefine(users.settings, { id: fields.band.id + 900 }, { label: 'مش موجود' })), [404, 'الحقل غير موجود'])
  assert.equal((await redefine(users.viewer, fields.nickname, { label: 'ممنوع' })).status, 403)
  // اختيارات حقل نص مابتتخزّنش
  assert.deepEqual(expectStatus(await redefine(users.settings, fields.nickname, { options: ['x'] }), 200).options, [])
  // القايمة بالترتيب ثم الرقم
  const listed = expectStatus(await request(users.settings, 'GET', '/settings/employee-fields'), 200)
  assert.deepEqual(listed.fields.map(field => [field.fieldKey, field.sortOrder]), [['uniform_size', 2], ['nickname', 3], ['has_car', 3], ['shoe_size', 10], ['license_expiry', 11], ['hr_note', 12], ['risk_band', 13]])
  // سجل التدقيق: حدث لكل إنشاء وتعديل ناجح، بمنفّذه
  const audit = await query(`SELECT [action], [category], [actorUserId], [entityId] FROM [audit_log] WHERE [entityType] = N'employee_custom_field' ORDER BY [id]`)
  assert.deepEqual([audit.filter(row => row.action === 'EMPLOYEE_FIELD_CREATED').length, audit.filter(row => row.action === 'EMPLOYEE_FIELD_UPDATED').length], [7, 2])
  assert.ok(audit.every(row => row.category === 'SETTINGS' && row.actorUserId === users.settings.id))
})

test('EF-02: قراءة قيم الموظف بقاعدة ملفه — صاحبه أو «عرض الموظفين» في نطاقه، والمقيّد للي يعدّل الملف بس', async () => {
  const visible = ['uniform_size', 'nickname', 'has_car', 'shoe_size', 'license_expiry'], all = [...visible, 'hr_note', 'risk_band']
  // صاحب الملف: حقوله غير المقيّدة، ومن غير تعديل
  const mine = expectStatus(await read(users.own, emps.own), 200)
  assert.deepEqual([mine.available, mine.canEdit, mine.fields.map(field => field.fieldKey), mine.fields.every(field => field.value === null)], [true, false, visible, true])
  // موظف من غير صلاحية على ملف غيره: نفس رد ملف الموظف (403)، لرقم موجود أو لأ
  assert.deepEqual([answer(await read(users.own, emps.peer)), answer(await read(users.own, { id: emps.far.id + 900 }))], [NO_VIEW, NO_VIEW])
  // «عرض الموظفين»: في نطاقه من غير المقيّد؛ وبرّه نطاقه «غير موجود» زي رقم مش موجود
  const viewed = expectStatus(await read(users.viewer, emps.own), 200)
  assert.deepEqual([viewed.canEdit, viewed.fields.map(field => field.fieldKey)], [false, visible])
  assert.deepEqual([answer(await read(users.viewer, emps.far)), answer(await read(users.viewer, { id: emps.far.id + 900 }))], [NOT_FOUND, NOT_FOUND])
  // «تعديل الموظفين»: كل الحقول ومنها المقيّد؛ وبرّه نطاقه «غير موجود»
  const edited = expectStatus(await read(users.editor, emps.own), 200)
  assert.deepEqual([edited.canEdit, edited.fields.map(field => field.fieldKey), edited.fields.find(field => field.fieldKey === 'hr_note').restricted], [true, all, true])
  assert.deepEqual([answer(await read(users.farEditor, emps.own)), (await read(users.farEditor, emps.far)).status], [NOT_FOUND, 200])
  // صاحب الملف حسابه على فرع غير فرع ملفه (ربط قديم): ملفه «غير موجود» زي GET /employees/:id
  const drifted = await account('drifted', 'employee', [], { employeeId: emps.far.id })
  assert.deepEqual([answer(await read(drifted, emps.far)), answer(await request(drifted, 'GET', `/employees/${emps.far.id}`))], [NOT_FOUND, NOT_FOUND])
})

test('EF-03: الحفظ — «تعديل الموظفين» في النطاق، وكل نوع بقيمته، والغلط من غير أي كتابة، والإلزامي مايتفضّاش', async () => {
  // مين يحفظ: من غير «تعديل الموظفين» 403 (حتى صاحب الملف)، وبرّه النطاق أو رقم مش موجود «غير موجود»
  for (const user of [users.own, users.viewer]) assert.equal((await write(user, emps.own, { nickname: 'ممنوع' })).status, 403)
  assert.deepEqual([answer(await write(users.farEditor, emps.own, { nickname: 'ممنوع' })), answer(await write(users.editor, { id: emps.far.id + 900 }, { nickname: 'ممنوع' }))], [NOT_FOUND, NOT_FOUND])
  assert.deepEqual(await stored(emps.own), [])
  const saved = expectStatus(await write(users.editor, emps.own, { nickname: ' أبو علي ', uniform_size: 'M', has_car: 'yes', shoe_size: '42.5', license_expiry: '2027-01-31', hr_note: 'ملاحظة داخلية', risk_band: 'ب' }), 200)
  assert.deepEqual(valuesOf(saved), { uniform_size: 'M', nickname: 'أبو علي', has_car: true, shoe_size: 42.5, license_expiry: '2027-01-31', hr_note: 'ملاحظة داخلية', risk_band: 'ب' })
  assert.ok((await stored(emps.own)).every(row => row.updatedByUserId === users.editor.id))
  // «تعديل الموظفين» من غير «عرض الموظفين»: الحفظ بيرجّع رده (مفيش حفظ اتثبّت وبعده 403)، والقراءة لوحدها لسه محتاجة «العرض»
  const blind = expectStatus(await write(users.editOnly, emps.own, { shoe_size: '42.5' }), 200)
  assert.deepEqual([blind.canEdit, valuesOf(blind).hr_note, (await read(users.editOnly, emps.own)).status], [true, 'ملاحظة داخلية', 403])
  // صاحب الملف و«عرض الموظفين» بيشوفوا القيم غير المقيّدة بس
  const expected = { uniform_size: 'M', nickname: 'أبو علي', has_car: true, shoe_size: 42.5, license_expiry: '2027-01-31' }
  assert.deepEqual([valuesOf(expectStatus(await read(users.own, emps.own), 200)), valuesOf(expectStatus(await read(users.viewer, emps.own), 200))], [expected, expected])
  // قيمة غلط أو مفتاح مجهول: الرسالة، ومفيش ولا قيمة في الطلب اتكتبت (حتى الصح اللي قبلها)
  const before = await stored(emps.own)
  for (const [values, message] of [
    [{ nickname: 'تغيير', uniform_size: 'XL' }, '«مقاس الزي»: اختار قيمة من القايمة'],
    [{ nickname: 'تغيير', shoe_size: 'abc' }, '«مقاس الحذاء»: رقم غير صحيح'],
    [{ shoe_size: '1e5' }, '«مقاس الحذاء»: رقم غير صحيح'], [{ shoe_size: '42.12345' }, '«مقاس الحذاء»: رقم غير صحيح'],
    [{ nickname: 'تغيير', license_expiry: '2027-02-30' }, '«انتهاء الرخصة»: تاريخ غير صحيح'], [{ license_expiry: '31/01/2027' }, '«انتهاء الرخصة»: تاريخ غير صحيح'],
    [{ has_car: 'maybe' }, '«معاه عربية»: نعم أو لا'], [{ has_car: 1 }, '«معاه عربية»: نعم أو لا'],
    [{ nickname: 'ن'.repeat(501) }, '«الاسم الحركي»: نص بحد أقصى 500 حرف'], [{ nickname: 5 }, '«الاسم الحركي»: نص بحد أقصى 500 حرف'],
    [{ nickname: 'تغيير', salary_hint: 'x' }, 'حقل غير معروف أو متعطّل: salary_hint'], [{ constructor: 'x' }, 'حقل غير معروف أو متعطّل: constructor'],
    [{ nickname: 'تغيير', uniform_size: null }, '«مقاس الزي» حقل إلزامي'], [{ uniform_size: '  ' }, '«مقاس الزي» حقل إلزامي'],
  ]) assert.deepEqual(answer(await write(users.editor, emps.own, values)), [400, message], JSON.stringify(values).slice(0, 80))
  for (const body of [undefined, { values: null }, { values: ['x'] }, { values: 'x' }]) {
    assert.deepEqual(answer(await request(users.editor, 'PUT', `/employees/${emps.own.id}/custom-fields`, body)), [400, 'قيم الحقول بصيغة غير صحيحة'], JSON.stringify(body))
  }
  assert.deepEqual(await stored(emps.own), before)
  // المبعوت بس بيتغيّر؛ وقيمة فاضية لحقل غير إلزامي بتشيل سطره؛ ونعم/لا بقيمته المنطقية
  const trimmed = expectStatus(await write(users.editor, emps.own, { nickname: '', has_car: false, shoe_size: 43 }), 200)
  assert.deepEqual(valuesOf(trimmed), { uniform_size: 'M', nickname: null, has_car: false, shoe_size: 43, license_expiry: '2027-01-31', hr_note: 'ملاحظة داخلية', risk_band: 'ب' })
  assert.deepEqual((await stored(emps.own)).map(row => row.fieldKey), ['uniform_size', 'has_car', 'shoe_size', 'license_expiry', 'hr_note', 'risk_band'])
  // موظف محدش حفظ قيمه: أي حفظ ليه لازم يسيب الإلزامي بقيمة
  assert.deepEqual(answer(await write(users.editor, emps.peer, { nickname: 'من غير مقاس' })), [400, '«مقاس الزي» حقل إلزامي'])
  assert.deepEqual(await stored(emps.peer), [])
  assert.deepEqual(valuesOf(expectStatus(await write(users.editor, emps.peer, { nickname: 'بمقاس', uniform_size: 'L' }), 200)).uniform_size, 'L')
  // حقل اتعطّل: مابيرجعش ومايتحفظش، وقيمته المتخزّنة بتفضل وبترجع لما يتفعّل
  expectStatus(await redefine(users.settings, fields.shoe, { isActive: false }), 200)
  assert.deepEqual([Object.keys(valuesOf(expectStatus(await read(users.editor, emps.own), 200))).includes('shoe_size'), answer(await write(users.editor, emps.own, { shoe_size: 44 }))],
    [false, [400, 'حقل غير معروف أو متعطّل: shoe_size']])
  assert.equal((await stored(emps.own)).find(row => row.fieldKey === 'shoe_size').numberValue, 43)
  expectStatus(await redefine(users.settings, fields.shoe, { isActive: true }), 200)
  assert.equal(valuesOf(expectStatus(await read(users.editor, emps.own), 200)).shoe_size, 43)
  // اختيار اتشال من القايمة: القيمة القديمة بتفضل معروضة، واختيارها من جديد مرفوض
  expectStatus(await redefine(users.settings, fields.size, { options: ['S', 'L'] }), 200)
  assert.deepEqual([valuesOf(expectStatus(await read(users.own, emps.own), 200)).uniform_size, answer(await write(users.editor, emps.own, { uniform_size: 'M' }))], ['M', [400, '«مقاس الزي»: اختار قيمة من القايمة']])
  expectStatus(await redefine(users.settings, fields.size, { options: ['S', 'M', 'L'] }), 200)
})

test('EF-04: شرط الجمهور بالحقل المخصص — للي قيمته من القايمة بس، والحفظ بيدقق، وحقل اتعطّل أو بقى مقيّد = مفيش حد', async () => {
  // الحقول المتاحة للشرط: نشطة، غير مقيّدة، «اختيار» أو «نعم/لا» — لبانِي الأنواع ولمدير الإعدادات بس
  const options = expectStatus(await request(users.builder, 'GET', '/settings/employee-fields/audience'), 200)
  assert.deepEqual(options, [{ fieldKey: 'uniform_size', label: 'مقاس الزي', type: 'CHOICE', options: ['S', 'M', 'L'] }, { fieldKey: 'has_car', label: 'معاه عربية', type: 'YESNO', options: ['yes', 'no'] }])
  assert.deepEqual([(await request(users.settings, 'GET', '/settings/employee-fields/audience')).status, (await request(users.viewer, 'GET', '/settings/employee-fields/audience')).status,
    (await request(users.builder, 'GET', '/settings/employee-fields')).status], [200, 403, 403])
  // الحفظ: حقل متاح وقيم من قايمته، وشرط واحد لكل حقل
  const kept = await storedAudience(types.sized)
  for (const [conditions, message] of [
    [[{ field: 'custom', key: 'nickname', values: ['x'] }], 'حقل مخصص مش متاح لشروط الجمهور (لازم يكون نشط وغير مقيّد، ونوعه اختيار أو نعم/لا)'],
    [[{ field: 'custom', key: 'risk_band', values: ['أ'] }], 'حقل مخصص مش متاح لشروط الجمهور (لازم يكون نشط وغير مقيّد، ونوعه اختيار أو نعم/لا)'],
    [[{ field: 'custom', key: 'nope', values: ['x'] }], 'حقل مخصص مش متاح لشروط الجمهور (لازم يكون نشط وغير مقيّد، ونوعه اختيار أو نعم/لا)'],
    [[{ field: 'custom', values: ['M'] }], 'حقل مخصص مش متاح لشروط الجمهور (لازم يكون نشط وغير مقيّد، ونوعه اختيار أو نعم/لا)'],
    [[{ field: 'custom', key: 'uniform_size', values: ['M', 'XL'] }], 'قيمة مش في قايمة الحقل «مقاس الزي»'],
    [[{ field: 'custom', key: 'has_car', values: [true] }], 'قيمة مش في قايمة الحقل «معاه عربية»'],
    [[{ field: 'custom', key: 'uniform_size', values: [] }], 'اختار قيمة واحدة على الأقل لكل شرط في شروط الجمهور'],
    [[{ field: 'custom', key: 'uniform_size', values: ['M'] }, { field: 'custom', key: 'uniform_size', values: ['L'] }], 'كل صفة ليها شرط واحد في شروط الجمهور'],
  ]) assert.deepEqual(answer(await setAudience(types.sized, { mode: 'all', ids: [], conditions })), [400, message], JSON.stringify(conditions))
  assert.equal(await storedAudience(types.sized), kept, 'المرفوض ماغيّرش المتخزّن')
  const conditions = [{ field: 'custom', key: 'uniform_size', values: ['M', 'M'] }, { field: 'custom', key: 'has_car', values: ['no'] }]
  expectStatus(await setAudience(types.sized, { mode: 'all', ids: [], conditions }), 200)
  assert.equal(await storedAudience(types.sized), JSON.stringify({ mode: 'all', ids: [], conditions: [{ field: 'custom', key: 'uniform_size', values: ['M'] }, { field: 'custom', key: 'has_car', values: ['no'] }] }))
  // صاحب القيم (M، ومن غير عربية) من الجمهور؛ والتاني مقاسه L، والتالت من غير قيم، وحساب من غير موظف: برّه. والمالك وبانِي الأنواع زي قواعدهم
  assert.deepEqual(await Promise.all(['own', 'peer', 'third', 'viewer', 'builder', 'admin'].map(key => sees(users[key], types.sized))), [true, false, false, false, true, true])
  expectStatus(await submit(users.own, types.sized), 201)
  for (const key of ['peer', 'third']) assert.deepEqual(answer(await submit(users[key], types.sized)), REFUSED, key)
  // العضوية بقيمة الموظف دلوقتي
  expectStatus(await write(users.editor, emps.peer, { uniform_size: 'M', has_car: 'no' }), 200)
  assert.equal(await sees(users.peer, types.sized), true)
  expectStatus(await submit(users.peer, types.sized), 201)
  expectStatus(await write(users.editor, emps.peer, { has_car: 'yes' }), 200)
  assert.deepEqual([await sees(users.peer, types.sized), answer(await submit(users.peer, types.sized))], [false, REFUSED])
  // مسودة وصاحبها من الجمهور، وبعدها حقل الشرط اتقيّد أو قيمته اتغيّرت: أول تقديم مرفوض زي الإنشاء (Codex CRP2T-B-B02)، ولما يرجع بتتقدم
  const draft = expectStatus(await request(users.own, 'POST', '/requests', { typeCode: types.sized.code, payload: { reason: 'مسودة للاختبار' }, submit: false }), 201)
  const send = () => request(users.own, 'POST', `/requests/${draft.id}/submit`, {})
  expectStatus(await redefine(users.settings, fields.car, { restricted: true }), 200)
  assert.deepEqual([answer(await submit(users.own, types.sized)), answer(await send()), (await repo('Request').findOneByOrFail({ id: draft.id })).status], [REFUSED, REFUSED, 'DRAFT'])
  expectStatus(await redefine(users.settings, fields.car, { restricted: false }), 200)
  expectStatus(await write(users.editor, emps.own, { uniform_size: 'S' }), 200)
  assert.deepEqual(answer(await send()), REFUSED)
  expectStatus(await write(users.editor, emps.own, { uniform_size: 'M' }), 200)
  assert.equal(expectStatus(await send(), 201).status, 'UNDER_REVIEW')
  // شاشة الخصم (نفس المقيّم) بتقرا قيم الحقول لما جمهور النوع فيه شرط عليها
  const money = app.get(require('../src/payroll/typed-deductions.service').TypedDeductionsService)
  const visible = async user => { try { await money.assertMoneyRequestVisible(ds.manager, payloadOf(user), 'PAYROLL_DEDUCTION', 'الخصم'); return true } catch (error) { return error.message } }
  expectStatus(await setAudience(types.deduction, { mode: 'all', ids: [], conditions: [{ field: 'custom', key: 'uniform_size', values: ['M'] }] }), 200)
  assert.deepEqual(await Promise.all([users.own, users.third, users.viewer, users.admin].map(visible)), [true, 'طلب الخصم غير متاح لك', 'طلب الخصم غير متاح لك', true])
  // حقل الشرط اتعطّل، أو بقى مقيّد: مفيش حد من الجمهور (الشرط مابيفتحش)، ولما يرجع بيرجعوا
  for (const [off, on] of [[{ isActive: false }, { isActive: true }], [{ restricted: true }, { restricted: false }]]) {
    expectStatus(await redefine(users.settings, fields.size, off), 200)
    assert.deepEqual([await sees(users.own, types.sized), answer(await submit(users.own, types.sized)), await visible(users.own)], [false, REFUSED, 'طلب الخصم غير متاح لك'], JSON.stringify(off))
    expectStatus(await redefine(users.settings, fields.size, on), 200)
    assert.equal(await sees(users.own, types.sized), true, JSON.stringify(on))
  }
})

test('EF-05: الحقول بحد أقصى 50، والمعطّل محسوب', async () => {
  const count = await repo('EmployeeCustomField').count()
  await repo('EmployeeCustomField').save(Array.from({ length: 50 - count }, (_, index) => ({ fieldKey: `filler_${index}`, label: `حقل زيادة ${index}`, type: 'TEXT', options: null,
    required: false, restricted: false, sortOrder: 100 + index, isActive: index % 2 === 0, createdAt: new Date() })))
  assert.deepEqual(answer(await define(users.settings, { fieldKey: 'one_too_many', label: 'حقل فوق الحد', type: 'TEXT' })), [400, 'الحقول المخصصة بحد أقصى 50'])
  assert.equal(await repo('EmployeeCustomField').count(), 50)
})

test('EF-06: القراءة والحفظ تحت قفل واحد باسم الموظف — قيمة اتحفظت بعد بداية القراءة مابترجعش فيها، واللي مايلاقيش القفل «حاول تاني»', async () => {
  const { Repository } = require('../node_modules/typeorm')
  const BUSY = [409, 'بيانات الموظف الإضافية بتتعدّل دلوقتي — حاول تاني بعد لحظة']
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
  const until = async (ready, label) => { for (let waited = 0; waited < 8000 && !(await ready()); waited += 50) await wait(50); assert.ok(await ready(), label) }
  const blockedOnLock = async () => Number((await query(`SELECT COUNT(*) AS [n] FROM sys.dm_exec_requests WHERE [database_id] = DB_ID() AND [wait_type] LIKE N'LCK[_]M[_]%' AND [wait_resource] LIKE N'APPLICATION:%'`))[0].n)
  const field = expectStatus(await redefine(users.settings, fields.nickname, { restricted: false }), 200)
  expectStatus(await write(users.editor, emps.third, { uniform_size: 'S', nickname: 'قبل القراءة' }), 200)
  // القراءة واقفة بعد ما قرت تعريف الحقول (غير مقيّد). في الوقت ده الحقل اتقيّد، وحفظ قيمة جديدة بدأ: الحفظ بيستنى القراءة
  const find = Repository.prototype.find
  let enter, release, hit = false, reader, writer, second
  const entered = new Promise(resolve => { enter = resolve }), held = new Promise(resolve => { release = resolve })
  Repository.prototype.find = async function (options) {
    const rows = await find.call(this, options)
    if (!hit && this.metadata.tableName === 'employee_custom_fields' && this.manager.queryRunner?.isTransactionActive) { hit = true; enter(); await held }
    return rows
  }
  try {
    reader = read(users.viewer, emps.third)
    await entered
    expectStatus(await redefine(users.settings, field, { restricted: true }), 200)
    writer = write(users.editor, emps.third, { nickname: 'بعد التقييد' })
    await until(async () => (await blockedOnLock()) === 1, 'الحفظ واقف على قفل قيم الموظف')
    // قراءة موظف تاني مالهاش علاقة بالقفل ده
    assert.equal((await read(users.viewer, emps.own)).status, 200)
    assert.equal((await repo('EmployeeCustomValue').findOneByOrFail({ employeeId: emps.third.id, fieldId: field.id })).textValue, 'قبل القراءة', 'الحفظ لسه ماكتبش')
    release()
    const [seen, saved] = [await reader, await writer]
    // القارئ قرا التعريف قبل التقييد: القيمة القديمة بس، والجديدة عمرها ما رجعتله
    assert.deepEqual([seen.status, valuesOf(seen.body).nickname, JSON.stringify(seen.body).includes('بعد التقييد')], [200, 'قبل القراءة', false])
    assert.deepEqual([saved.status, valuesOf(saved.body).nickname], [200, 'بعد التقييد'])
  } finally {
    release()
    Repository.prototype.find = find
    await Promise.allSettled([reader, writer, second].filter(Boolean))
  }
  // وبعدها العارض مايشوفش الحقل المقيّد ولا قيمته
  const after = expectStatus(await read(users.viewer, emps.third), 200)
  assert.deepEqual(['nickname' in valuesOf(after), JSON.stringify(after).includes('بعد التقييد')], [false, false])
  // قراءتين مع بعض مابيوقفوش بعض (قفل القراءة مشترك)
  hit = false
  let both
  const paused = new Promise(resolve => { enter = resolve }), gate = new Promise(resolve => { release = resolve })
  Repository.prototype.find = async function (options) {
    const rows = await find.call(this, options)
    if (!hit && this.metadata.tableName === 'employee_custom_fields' && this.manager.queryRunner?.isTransactionActive) { hit = true; enter(); await gate }
    return rows
  }
  try {
    both = read(users.editor, emps.third)
    await paused
    assert.equal((await read(users.editor, emps.third)).status, 200, 'قراءة تانية خلصت والأولى لسه ماسكة القفل')
    release()
    assert.equal((await both).status, 200)
  } finally { release(); Repository.prototype.find = find; await Promise.allSettled([both].filter(Boolean)) }
  // القفل ممسوك من اتصال تاني (حصري): القراءة والحفظ «حاول تاني» بعد المهلة، ومن غير أي كتابة
  const holder = ds.createQueryRunner()
  await holder.connect()
  await holder.startTransaction()
  try {
    const [taken] = await holder.query(`DECLARE @result int
      EXEC @result = sys.sp_getapplock @Resource = @0, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 0
      SELECT @result AS [result]`, [`hr:employee-custom-values:${emps.third.id}`])
    assert.ok(Number(taken.result) >= 0)
    const before = await stored(emps.third)
    const [busyRead, busyWrite, other] = await Promise.all([read(users.editor, emps.third), write(users.editor, emps.third, { uniform_size: 'L' }), read(users.editor, emps.own)])
    assert.deepEqual([answer(busyRead), answer(busyWrite), other.status], [BUSY, BUSY, 200])
    assert.deepEqual(await stored(emps.third), before)
  } finally {
    if (holder.isTransactionActive) await holder.rollbackTransaction()
    await holder.release()
  }
  assert.equal(valuesOf(expectStatus(await write(users.editor, emps.third, { uniform_size: 'L' }), 200)).uniform_size, 'L')
  expectStatus(await redefine(users.settings, field, { restricted: false }), 200)
})
