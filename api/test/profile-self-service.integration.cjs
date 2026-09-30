'use strict'
// «ملفي الشخصي» (قرار المالك 30 سبتمبر): «تعديل الملف» = طلب «تحديث بيانات شخصية» بيمشي في سلسلة اعتماده ويتطبق بعد الاعتماد النهائي
// بنفس قواعد تعديل الموارد البشرية، والصورة الشخصية من غير اعتماد (PUT /employees/me/photo). على قاعدة SQL مؤقتة عشوائية
// (hr_profile_test_<hex>، synchronize) عبر HTTP بتوكنات موقّعة محليًا، وبتتمسح في الآخر:
//   PD-01 التقديم مابيطبقش حاجة → الاعتماد بيطبق الخانات المتغيرة بس + سجل تغييرات لكل خانة (والكتالوج بكل الخانات بأسماء عربية)
//   PD-02 القيم الغلط بتترفض من التقديم (ومفيش مسودة)، والطلب اللي بقى غلط وقت الاعتماد بيترفض ومفيش حاجة بتتطبق
//   PD-03 تفرد رقم الهوية والجواز: من التقديم، ووقت الاعتماد تاني (طلبين لنفس الرقم، ومتزامنين تحت قفل الهوية) — من غير أسماء
//   PD-04 البنك والراتب والفرع والأكواد وبريد العمل مرفوضين (حتى لو اتعرّفوا حقول في النوع)
//   PD-05 الصورة: ملفي أنا بس، صورة بس، ورافعها أنا — وصاحبها والموارد البشرية في النطاق بيشوفوها
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_profile_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_profile_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-profile-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const { PERSONAL_DATA_FIELDS } = require('../src/employees/employee-personal-data')
const { IDENTITY_REQUIRED_MESSAGE, NATIONAL_ID_FORMAT_MESSAGE } = require('../src/employees/employee-required-fields')
let app, ds, master, base, created = false, sequence = 0
const B = {}, D = {}, E = {}, U = {}
let chain

function guarded() { assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE); if (ds) assert.equal(ds.options.database, database) }
const repo = name => { guarded(); return ds.getRepository(name) }
function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    tokenVersion: 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(user)}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  let parsed = null
  try { parsed = text ? JSON.parse(text) : null } catch { parsed = text }
  return { status: response.status, body: parsed }
}
async function upload(user, { type = 'image/png', name = 'me.png', entityType = 'employee_photo', employeeId } = {}) {
  const form = new FormData()
  form.append('file', new Blob([Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex')], { type }), name)
  const query = new URLSearchParams({ entityType, ...(employeeId ? { employeeId: String(employeeId) } : {}) })
  const response = await fetch(`${base}/files/upload?${query}`, { method: 'POST', headers: { Authorization: `Bearer ${token(user)}` }, body: form })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const ok = (response, status = 201) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const message = response => [].concat(response.body?.message ?? []).join('، ')
const fresh = id => repo('Employee').findOneByOrFail({ id })
const submit = (user, payload) => request(user, 'POST', '/requests', { typeCode: 'PERSONAL_DATA_UPDATE', submit: true, payload })
const approve = (user, id) => request(user, 'POST', `/requests/${id}/act`, { action: 'APPROVE' })
const personal = ['fullName', 'fullNameEn', 'birthDate', 'birthPlace', 'gender', 'nationality', 'maritalStatus', 'nationalId', 'passportNo',
  'passportExpiry', 'phone', 'phoneAlt', 'personalEmail', 'address', 'postalCode', 'emergencyContactName', 'emergencyRelation',
  'emergencyContactPhone', 'emergencyPhoneAlt']

/** موظف كامل الملف في فرع الرياض + حساب دخوله (موظف عادي بلا صلاحيات) */
async function person(extra = {}, branch = 'riyadh') {
  const n = ++sequence
  const employee = await repo('Employee').save({ employeeCode: `PRF-${String(n).padStart(3, '0')}`, fingerprintCode: `PRF-FP-${n}`,
    fullName: 'سالم أحمد الغامدي', fullNameEn: 'Salem Ahmed', birthDate: '1990-05-10', gender: 'male', nationality: 'سعودي', maritalStatus: 'single',
    nationalId: `10${String(n).padStart(8, '0')}`, passportNo: null, phone: '0501234567', address: 'الرياض', branchId: B[branch].id,
    departmentId: D[branch].id, joinDate: '2020-01-01', basicSalary: 7000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0,
    currency: 'SAR', status: 'active', isActive: true, jobTitle: 'محاسب', payMethod: 'transfer', bankName: 'بنك الراجحي',
    iban: 'SA0380000000608010167519', ...extra })
  const user = await repo('User').save({ email: `person${n}@profile.test`, displayName: employee.fullName, passwordHash: 'isolated-token-only',
    role: 'employee', branchId: employee.branchId, employeeId: employee.id, permissions: '[]' })
  return { employee, user }
}
/** طلب في صندوق الموارد البشرية مباشرة (زي طلب اتقدّم قبل ما البيانات تتغير) */
const queued = (employee, payload) => repo('Request').save({ typeCode: 'PERSONAL_DATA_UPDATE', requesterId: employee.id, branchId: employee.branchId,
  status: 'UNDER_REVIEW', currentStep: 1, resolvedSteps: JSON.stringify([{ stepOrder: 1, role: 'hr', approverEmployeeId: null, actedAt: null }]),
  payload: JSON.stringify(payload), submittedAt: new Date() })

before(async () => {
  guarded(); assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME || 'sa',
    password: env.DB_PASSWORD, database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  ds = app.get(require('../node_modules/typeorm').DataSource); guarded()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`

  B.riyadh = await repo('Branch').save({ code: 'PRF-RUH', name: 'فرع الرياض' })
  B.jeddah = await repo('Branch').save({ code: 'PRF-JED', name: 'فرع جدة' })
  D.riyadh = await repo('Department').save({ name: 'المالية', branchId: B.riyadh.id })
  D.jeddah = await repo('Department').save({ name: 'المبيعات', branchId: B.jeddah.id })
  E.hr = await repo('Employee').save({ employeeCode: 'PRF-HR', fullName: 'هدى محمد الموارد', branchId: B.riyadh.id, departmentId: D.riyadh.id,
    joinDate: '2019-01-01', status: 'active', isActive: true, nationalId: 'HR-ID-1', phone: '0500000001' })
  // الموارد البشرية في الرياض: معتمد «تحديث بيانات شخصية» ويشوف الموظفين (ومعاها تعديلهم عشان ترفع ملف لموظف تاني)
  U.hr = await repo('User').save({ email: 'hr@profile.test', displayName: 'موارد الرياض', passwordHash: 'isolated-token-only', role: 'employee',
    branchId: B.riyadh.id, employeeId: E.hr.id, permissions: JSON.stringify(['approve.hr', 'employees.view', 'employees.edit']) })
  U.jeddahHr = await repo('User').save({ email: 'hr-jed@profile.test', displayName: 'موارد جدة', passwordHash: 'isolated-token-only', role: 'employee',
    branchId: B.jeddah.id, permissions: JSON.stringify(['approve.hr', 'employees.view']) })
  U.admin = await repo('User').save({ email: 'admin@profile.test', displayName: 'admin', passwordHash: 'isolated-token-only', role: 'super_admin', permissions: '["*"]' })
  chain = await repo('ApprovalChain').save({ code: 'CHAIN_HR', nameAr: 'اعتماد الموارد البشرية', isActive: true, autoApprove: false })
  await repo('ApprovalStep').save({ chainId: chain.id, stepOrder: 1, approverRole: 'hr' })
  await repo('RequestType').save({ code: 'PERSONAL_DATA_UPDATE', nameAr: 'تحديث بيانات شخصية', category: 'personal_data', destinationHandler: 'employee_record',
    approvalChainId: chain.id, isActive: true, requiredFields: '[]' })
  await repo('RequestType').save({ code: 'BANK_ACCOUNT_CHANGE', nameAr: 'تغيير الحساب البنكي', category: 'personal_data', destinationHandler: 'payroll_bank_secure',
    approvalChainId: chain.id, isActive: true, requiredFields: JSON.stringify(['iban']) })
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      guarded()
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try { fs.rmSync(uploads, { recursive: true, force: true }) } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'profile self-service fixture cleanup failed')
})

test('PD-01: the request applies nothing until the final approval, then writes only the changed fields with one change-log row each', async () => {
  const { employee, user } = await person()
  // الكتالوج: كل الخانات بأسماء عربية، ومفيش خانة إلزامية في الطلب (بيتبعت اللي اتغير بس)
  const catalog = ok(await request(user, 'GET', '/requests/types'), 200)
  const type = catalog.find(row => row.code === 'PERSONAL_DATA_UPDATE')
  const fields = JSON.parse(type.customFields)
  assert.deepEqual(fields.map(field => field.key), personal)
  assert.ok(fields.every(field => /[؀-ۿ]/.test(field.label) && !field.required), JSON.stringify(fields))
  assert.deepEqual(fields.find(field => field.key === 'gender').options, ['male', 'female'])
  assert.equal(fields.find(field => field.key === 'birthDate').type, 'date')
  assert.deepEqual(JSON.parse(type.requiredFields), [])
  assert.deepEqual(PERSONAL_DATA_FIELDS.map(field => field.key), personal)
  // طول كل خانة = طول عمودها في employees
  const meta = ds.getMetadata(require('../src/employees/employee.entity').Employee)
  for (const field of PERSONAL_DATA_FIELDS.filter(item => item.kind !== 'date')) {
    assert.equal(Number(meta.findColumnWithPropertyName(field.key).length), field.max, field.key)
  }

  const before = await fresh(employee.id)
  const payload = { fullName: 'سالم أحمد عبدالله الغامدي', fullNameEn: 'Salem Ahmed Alghamdi', birthDate: '1990-05-11', birthPlace: 'جدة',
    gender: 'male', nationality: 'سعودي', maritalStatus: 'married', passportNo: ' n 123 45 ', passportExpiry: '2031-01-31', phone: '0559876543',
    phoneAlt: '0112345678', personalEmail: 'salem.personal@example.com', address: 'الرياض — حي العليا', postalCode: '12211',
    emergencyContactName: 'أحمد الغامدي', emergencyRelation: 'parent', emergencyContactPhone: '+966501112233', emergencyPhoneAlt: '0503334444' }
  const submitted = ok(await submit(user, payload))
  assert.deepEqual([submitted.status, submitted.currentStep], ['UNDER_REVIEW', 1])
  assert.deepEqual(await fresh(employee.id), before, 'nothing applied before approval')
  assert.equal(await repo('EmployeeStatusHistory').countBy({ employeeId: employee.id }), 0)
  // صاحب الطلب مايعتمدش طلبه
  assert.equal((await approve(user, submitted.id)).status, 403)

  const approved = ok(await approve(U.hr, submitted.id))
  assert.equal(approved.status, 'COMPLETED'); assert.match(approved.destinationRef, /^EMP-/)
  const saved = await fresh(employee.id)
  const expected = { ...payload, passportNo: 'N12345' }
  for (const key of personal) if (key !== 'nationalId') assert.equal(saved[key], expected[key], key)
  assert.equal(saved.nationalId, before.nationalId)
  // البنك والراتب والبيانات الوظيفية ماتلمستش
  for (const key of ['iban', 'bankName', 'basicSalary', 'branchId', 'departmentId', 'jobTitle', 'email', 'employeeCode', 'fingerprintCode', 'joinDate', 'status']) {
    assert.deepEqual(saved[key], before[key], key)
  }
  const history = await repo('EmployeeStatusHistory').find({ where: { requestId: submitted.id }, order: { id: 'ASC' } })
  // الجنس والجنسية مابعتوش تغيير (نفس القيمة) — مالهمش سطر
  assert.deepEqual(history.map(row => row.fieldName), personal.filter(key => !['gender', 'nationality', 'nationalId'].includes(key)))
  assert.ok(history.every(row => row.employeeId === employee.id && row.reason === 'تحديث بيانات معتمد' && row.changeType === 'DATA'))
  const passport = history.find(row => row.fieldName === 'passportNo')
  assert.deepEqual([passport.oldValue, passport.newValue], [null, 'N12345'])
  const name = history.find(row => row.fieldName === 'fullName')
  assert.deepEqual([name.oldValue, name.newValue], ['سالم أحمد الغامدي', 'سالم أحمد عبدالله الغامدي'])
})

test('PD-02: invalid values are refused at submission with an Arabic message and leave no request; a request invalid at approval applies nothing', async () => {
  const { employee, user } = await person({ passportNo: 'OWN-P-2' })
  const before = await fresh(employee.id)
  const requests = await repo('Request').countBy({ requesterId: employee.id })
  const today = new Date().toLocaleDateString('en-CA')
  for (const [payload, expected] of [
    [{ fullName: 'John Smith' }, /^الاسم الكامل لازم يكون بالعربي$/],
    [{ fullName: 'محمد' }, /الاسم الأول واسم العائلة على الأقل/],
    [{ fullName: null }, /^الاسم الكامل بالعربي مطلوب ولا يمكن مسحه$/],
    [{ phone: 'abc' }, /^رقم الجوال غير صالح — /],
    [{ phone: null }, /^رقم الجوال مطلوب ولا يمكن مسحه$/],
    [{ birthDate: today }, /^تاريخ الميلاد لازم يكون قبل النهارده$/],
    [{ birthDate: '1990-02-30' }, /^تاريخ الميلاد غير صحيح — /],
    [{ birthDate: null }, /^تاريخ الميلاد مطلوب ولا يمكن مسحه$/],
    [{ gender: 'x' }, /^الجنس: اختار من القايمة/],
    [{ nationality: null }, /^الجنسية مطلوبة ولا يمكن مسحها$/],
    [{ maritalStatus: 'engaged' }, /^الحالة الاجتماعية: اختار من القايمة/],
    [{ nationalId: 'AB/12' }, new RegExp(`^${NATIONAL_ID_FORMAT_MESSAGE.replace(/[()]/g, '\\$&')}$`)],
    [{ nationalId: null, passportNo: null }, new RegExp(`^${IDENTITY_REQUIRED_MESSAGE}$`)],
    [{ passportExpiry: '2031-13-01' }, /^تاريخ انتهاء الجواز غير صحيح — /],
    [{ personalEmail: 'not-an-email' }, /^البريد الشخصي غير صالح — /],
    [{ emergencyContactPhone: 'call me' }, /^رقم جهة الطوارئ غير صالح — /],
    [{ emergencyRelation: 'friend' }, /^صلة القرابة: اختار من القايمة/],
    [{ address: 'x'.repeat(501) }, /أطول من الحد المسموح \(500/],
    [{ phone: before.phone, address: '' }, /^لم تتغير أي بيانات في الطلب/],
  ]) {
    const response = await submit(user, payload)
    assert.equal(response.status, 400, `${JSON.stringify(payload)} → ${JSON.stringify(response.body)}`)
    assert.match(message(response), expected, JSON.stringify(payload))
  }
  assert.equal(await repo('Request').countBy({ requesterId: employee.id }), requests, 'a refused submission leaves no draft')
  assert.deepEqual(await fresh(employee.id), before)
  // مسح واحد من الاتنين والتاني فاضل = مسموح
  const clearOne = ok(await submit(user, { nationalId: null }))
  ok(await approve(U.hr, clearOne.id))
  assert.deepEqual([(await fresh(employee.id)).nationalId, (await fresh(employee.id)).passportNo], [null, 'OWN-P-2'])

  // طلب اتقدّم صح وبقى غلط وقت الاعتماد: رفض بالسبب، الطلب فاضل في الصندوق، ومفيش قرار ولا تعديل ولا سطر سجل
  for (const [payload, reason] of [
    [{ fullName: 'John Smith' }, 'الاسم الكامل لازم يكون بالعربي'],
    [{ passportNo: null }, IDENTITY_REQUIRED_MESSAGE],
    [{ phone: '12', address: 'عنوان جديد مع جوال غلط' }, 'رقم الجوال غير صالح'],
    [{ phone: before.phone }, 'لم تتغير أي بيانات في الطلب'],
  ]) {
    const row = await queued(employee, payload)
    const snapshot = await fresh(employee.id)
    const result = await approve(U.hr, row.id)
    assert.equal(result.status, 400, JSON.stringify(result.body))
    assert.ok(message(result).startsWith(`لم يُعتمد الطلب — ${reason}`), message(result))
    assert.match(message(result), /الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات/)
    assert.equal((await repo('Request').findOneByOrFail({ id: row.id })).status, 'UNDER_REVIEW')
    assert.equal(await repo('RequestApproval').countBy({ requestId: row.id }), 0)
    assert.equal(await repo('EmployeeStatusHistory').countBy({ requestId: row.id }), 0)
    assert.deepEqual(await fresh(employee.id), snapshot, 'nothing applied — not even the valid address next to the bad phone')
  }
})

test('PD-03: national ID and passport stay unique — at submission, again at the final approval, and under two simultaneous approvals', async () => {
  const holder = await person({ nationalId: 'TAKEN-ID-1', passportNo: 'TAKEN-P-1', fullName: 'صاحب الأرقام المحجوزة' })
  await person({ nationalId: 'JED-ID-9', fullName: 'موظفة فرع جدة' }, 'jeddah')
  const { employee, user } = await person()
  const requests = await repo('Request').countBy({ requesterId: employee.id })
  const leaks = []
  for (const [payload, expected] of [
    [{ nationalId: 'taken-id-1' }, 'رقم الهوية / الإقامة TAKEN-ID-1 مسجل لموظف آخر — راجع الرقم'],
    [{ passportNo: ' taken-p-١ ' }, 'رقم الجواز TAKEN-P-1 مسجل لموظف آخر — راجع الرقم'],
    [{ nationalId: 'jed-id-9' }, 'رقم الهوية / الإقامة JED-ID-9 مسجل لموظف آخر — راجع الرقم'],
  ]) {
    const response = await submit(user, payload)
    assert.equal(response.status, 400, JSON.stringify(response.body)); assert.equal(message(response), expected)
    leaks.push(response.body)
  }
  assert.equal(await repo('Request').countBy({ requesterId: employee.id }), requests)
  // الرسائل مابتقولش اسم صاحب الرقم ولا فرعه ولا رقمه في النظام
  assert.doesNotMatch(JSON.stringify(leaks), new RegExp(`موظفة فرع جدة|جدة|صاحب الأرقام|"${holder.employee.id}"|${holder.employee.employeeCode}`))

  // طلبين لموظفين مختلفين بنفس الجواز الجديد: الاتنين عدّوا التقديم، والتاني بيترفض وقت الاعتماد
  const peer = await person()
  const mine = ok(await submit(user, { passportNo: 'NEW-P-77', phone: '0551112222' }))
  const theirs = ok(await submit(peer.user, { passportNo: 'new-p-77' }))
  assert.equal(ok(await approve(U.hr, mine.id)).status, 'COMPLETED')
  const refused = await approve(U.hr, theirs.id)
  assert.equal(refused.status, 400)
  assert.equal(message(refused), 'لم يُعتمد الطلب — رقم الجواز NEW-P-77 مسجل لموظف آخر — راجع الرقم. الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات')
  assert.equal((await fresh(peer.employee.id)).passportNo, null)
  assert.equal((await repo('Request').findOneByOrFail({ id: theirs.id })).status, 'UNDER_REVIEW')
  assert.equal((await fresh(employee.id)).passportNo, 'NEW-P-77')

  // اعتمادين في نفس اللحظة لنفس رقم الهوية الجديد: قفل الهوية بيخلي واحد بس يعدّي
  const a = await person(), b = await person()
  const first = ok(await submit(a.user, { nationalId: 'RACE-ID-5' }))
  const second = ok(await submit(b.user, { nationalId: 'race-id-5' }))
  const results = await Promise.all([approve(U.hr, first.id), approve(U.hr, second.id)])
  assert.deepEqual(results.map(result => result.status).sort(), [201, 400], JSON.stringify(results.map(result => result.body)))
  assert.match(message(results.find(result => result.status === 400)), /رقم الهوية \/ الإقامة RACE-ID-5 مسجل لموظف آخر/)
  const holders = await repo('Employee').countBy({ nationalId: 'RACE-ID-5' })
  assert.equal(holders, 1)
})

test('PD-03b: the final approval of an identity change waits on the same identity lock as the HR edit (hr:employees:identity)', async () => {
  const { employee, user } = await person()
  const pending = ok(await submit(user, { passportNo: 'LOCKED-P-3' }))
  const pool = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME || 'sa',
    password: env.DB_PASSWORD, database, options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  let approval, settled = false, tx = null
  try {
    guarded()
    tx = new sql.Transaction(pool)
    await tx.begin()
    const got = await new sql.Request(tx).query(`DECLARE @r int;
      EXEC @r = sys.sp_getapplock @Resource = 'hr:employees:identity', @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 5000;
      SELECT @r AS r`)
    assert.ok(got.recordset[0].r >= 0, 'the test holds the identity lock')
    approval = approve(U.hr, pending.id).finally(() => { settled = true })
    let waiting = 0
    for (const deadline = Date.now() + 10000; Date.now() < deadline && !settled && !waiting;) {
      waiting = (await pool.request().query(`SELECT COUNT(*) AS n FROM sys.dm_exec_requests WHERE database_id = DB_ID() AND wait_type LIKE 'LCK%'`)).recordset[0].n
      if (!waiting) await new Promise(done => setTimeout(done, 25))
    }
    assert.ok(waiting > 0 && !settled, 'the approval waits for the identity lock instead of saving')
    assert.equal((await fresh(employee.id)).passportNo, null)
    await tx.commit(); tx = null
    const result = ok(await approval)
    assert.equal(result.status, 'COMPLETED')
    assert.equal((await fresh(employee.id)).passportNo, 'LOCKED-P-3')
  } finally {
    // الفشل في النص مايسيبش القفل ماسك (وإلا الاعتماد والإغلاق يستنوا على طول)
    if (tx) await tx.rollback().catch(() => undefined)
    if (approval) await approval.catch(() => undefined)
    await pool.close()
  }
})

test('PD-04: bank, salary, org, codes, dates and the work email are refused — even when configured as a field of the type', async () => {
  const { employee, user } = await person()
  const before = await fresh(employee.id)
  const requests = await repo('Request').countBy({ requesterId: employee.id })
  const bank = await submit(user, { iban: 'SA4420000001234567891234' })
  assert.equal(bank.status, 400); assert.equal(message(bank), 'الحساب البنكي مش بيتغير من «تحديث بيانات شخصية» — قدّم طلب «تغيير الحساب البنكي»')
  for (const key of ['bankName', 'payMethod']) {
    assert.match(message(await submit(user, { [key]: 'x', phone: '0551234000' })), /قدّم طلب «تغيير الحساب البنكي»/, key)
  }
  for (const [key, value] of [['basicSalary', 9000], ['housingAllowance', 500], ['branchId', B.jeddah.id], ['departmentId', D.jeddah.id],
    ['jobTitle', 'مدير'], ['managerEmployeeId', 1], ['employeeCode', 'X-1'], ['fingerprintCode', '999'], ['joinDate', '2019-01-01'],
    ['status', 'active'], ['email', 'me@work.test'], ['country', 'EG']]) {
    const response = await submit(user, { [key]: value, phone: '0551234000' })
    assert.equal(response.status, 400, key)
    assert.equal(message(response), `الطلب فيه بيانات مش بتتعدل من «تحديث بيانات شخصية» (${key}) — البيانات الوظيفية والراتب والأكواد والتواريخ بتتعدل من الموارد البشرية`)
  }
  // مفتاح مش عمود موظف أصلًا: رفض القايمة البيضاء المعتاد
  assert.match(message(await submit(user, { favouriteColor: 'blue' })), /^حقول غير معرّفة لنوع «تحديث بيانات شخصية»: favouriteColor/)
  assert.equal(await repo('Request').countBy({ requesterId: employee.id }), requests)
  assert.deepEqual(await fresh(employee.id), before)

  // نوع على نفس الوجهة متعرّف فيه «iban» و«basicSalary» كحقول: برضه مرفوضين (المعالج مابيطبقهمش)
  await repo('RequestType').save({ code: 'PERSONAL_CUSTOM', nameAr: 'بيانات مخصصة', category: 'personal_data', destinationHandler: 'employee_record',
    approvalChainId: chain.id, isActive: true, requiredFields: '[]',
    customFields: JSON.stringify([{ key: 'iban', label: 'الآيبان', type: 'text' }, { key: 'basicSalary', label: 'الراتب', type: 'text' }]) })
  const configuredBank = await request(user, 'POST', '/requests', { typeCode: 'PERSONAL_CUSTOM', submit: true, payload: { iban: 'SA4420000001234567891234' } })
  assert.equal(configuredBank.status, 400); assert.match(message(configuredBank), /قدّم طلب «تغيير الحساب البنكي»/)
  const configuredSalary = await request(user, 'POST', '/requests', { typeCode: 'PERSONAL_CUSTOM', submit: false, payload: { basicSalary: 1 } })
  assert.equal(configuredSalary.status, 400, 'not even as a draft')
  assert.equal(await repo('Request').countBy({ requesterId: employee.id }), requests)
})

test('PD-05: the self photo endpoint — own employee only, image only, uploaded by the caller; the owner and in-scope HR see it', async () => {
  const { employee, user } = await person()
  const other = await person({ fullName: 'زميل في نفس الفرع' })
  const jeddah = await person({}, 'jeddah')
  // موظف عادي من غير employees.edit: يرفع صورته ويربطها بملفه من غير اعتماد
  const photo = ok(await upload(user))
  assert.deepEqual(ok(await request(user, 'PUT', '/employees/me/photo', { fileId: photo.id }), 200), { photoFileId: photo.id })
  assert.equal((await fresh(employee.id)).photoFileId, photo.id)
  assert.equal((await repo('StoredFile').findOneByOrFail({ id: photo.id })).employeeId, employee.id)
  // صاحبها والموارد البشرية في النطاق بيشوفوها؛ موارد فرع تاني وزميل عادي لأ
  const view = async viewer => (await fetch(`${base}/files/${photo.id}`, { headers: { Authorization: `Bearer ${token(viewer)}` } })).status
  assert.equal(await view(user), 200)
  assert.equal(await view(U.hr), 200)
  assert.equal(await view(U.jeddahHr), 403)
  assert.equal(await view(other.user), 403)

  // ملف رفعه حد تاني (حتى لو صورة موظف) = 404 زي الملف الغايب، والصورة ماتتغيرش
  const theirs = ok(await upload(other.user))
  const stolen = await request(user, 'PUT', '/employees/me/photo', { fileId: theirs.id })
  const missing = await request(user, 'PUT', '/employees/me/photo', { fileId: 99999999 })
  assert.equal(stolen.status, 404); assert.deepEqual(stolen.body, missing.body)
  assert.equal((await fresh(employee.id)).photoFileId, photo.id)
  // صورة بس، ومرفوعة كصورة موظف
  const pdf = ok(await upload(user, { type: 'application/pdf', name: 'cv.pdf', entityType: 'document' }))
  const notImage = await request(user, 'PUT', '/employees/me/photo', { fileId: pdf.id })
  assert.equal(notImage.status, 400); assert.equal(message(notImage), 'الملف ده مش صورة شخصية — ارفع صورة JPG أو PNG أو WEBP')
  const docImage = ok(await upload(user, { entityType: 'document' }))
  assert.equal((await request(user, 'PUT', '/employees/me/photo', { fileId: docImage.id })).status, 400)
  assert.equal((await upload(user, { type: 'application/pdf', name: 'fake.pdf' })).status, 400, 'the upload itself refuses a non-image employee photo')

  // مايقدرش يستهدف موظف تاني: مفيش مسار برقم موظف، والرقم في الجسم بيتشال
  assert.equal((await request(user, 'PUT', `/employees/${other.employee.id}/photo`, { fileId: photo.id })).status, 404)
  const second = ok(await upload(user))
  ok(await request(user, 'PUT', '/employees/me/photo', { fileId: second.id, employeeId: other.employee.id }), 200)
  assert.equal((await fresh(other.employee.id)).photoFileId, null)
  assert.equal((await fresh(employee.id)).photoFileId, second.id)
  // صورة زميل مربوطة بملفه مابتتاخدش، حتى لو اللي بيطلب رفع الملف (الموارد البشرية رفعتها له)
  const forOther = ok(await upload(U.hr, { employeeId: other.employee.id }))
  ok(await request(U.hr, 'PATCH', `/employees/${other.employee.id}`, { photoFileId: forOther.id }), 200)
  const taken = await request(U.hr, 'PUT', '/employees/me/photo', { fileId: forOther.id })
  assert.equal(taken.status, 400); assert.equal(message(taken), 'الصورة دي مربوطة بموظف تاني — ارفع صورتك من جديد')
  assert.equal((await fresh(E.hr.id)).photoFileId, null)
  assert.equal((await fresh(other.employee.id)).photoFileId, forOther.id)

  // المسح، والطلب الناقص، والحساب اللي مالوش ملف موظف
  assert.equal((await request(user, 'PUT', '/employees/me/photo', {})).status, 400)
  assert.equal((await request(user, 'PUT', '/employees/me/photo', { fileId: 'abc' })).status, 400)
  assert.deepEqual(ok(await request(user, 'PUT', '/employees/me/photo', { fileId: null }), 200), { photoFileId: null })
  assert.equal((await fresh(employee.id)).photoFileId, null)
  const noEmployee = await request(U.admin, 'PUT', '/employees/me/photo', { fileId: null })
  assert.equal(noEmployee.status, 400); assert.match(message(noEmployee), /^حسابك مش مربوط بملف موظف/)
  assert.equal((await fresh(jeddah.employee.id)).photoFileId, null)
})
