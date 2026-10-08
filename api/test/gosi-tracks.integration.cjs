// B1.5 — التأمينات السعودية بمسارين وحدود الأجر المصري المؤرخة، على قاعدة SQL مؤقتة معزولة (synchronize):
//  GT-1) المسير: المسار الجديد على 10,000 في يوليو 2026 = 1,075.00 و1,275.00، والقديم 975.00 و1,175.00، ويونيو بنسب يونيو حتى بعد
//        إعادة الحساب، ويناير 2027 المصري بحد 19,300 وديسمبر 2026 بحد 16,700، والمسير المعتمد مابيتغيرش لما يتفتح.
//  GT-2) خانة الملف: الحفظ والمسح والتحقق وسجل التغييرات وإخفاؤها عن غير المالية.
//  GT-3) الإعدادات: «الأساسي + السكن»، والقيم المؤرخة في الشاشة، وتاريخ قرار حدود مصر (حفظ من غير تغييرها مابيلمسوش).
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
const { localDateOf } = require('../src/attendance/attendance.service')
const database = `hr_gosi_tracks_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-gosi-tracks-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const { writeParityReasonsBeforeApproval } = require('./fixtures/payroll-parity-reasons.cjs')
let app, master, ds, base, admin, approver, viewer, saudiBranch, egyptBranch, created = false, employeeNumber = 0
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function request(user, method, endpoint, body) {
  await writeParityReasonsBeforeApproval(request, user, method, endpoint)
  const response = await fetch(base + endpoint, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(user)}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
function expectStatus(response, status) {
  assert.equal(response.status, status, JSON.stringify(response.body))
  return response.body
}
async function employee(branch, overrides = {}) {
  const n = ++employeeNumber
  const emp = await repo('Employee').save({ employeeCode: `GT${String(n).padStart(3, '0')}`, fullName: `موظف المسارين ${n}`, nationality: 'سعودي',
    branchId: branch.id, joinDate: '2020-01-01', basicSalary: 9000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0,
    status: 'active', isActive: true, payMethod: 'transfer', isGosiRegistered: true, ...overrides })
  // استثناء حضور يعزل الحساب عن الغياب والتأخير
  await repo('AttendanceExemption').save({ employeeId: emp.id, effectiveFrom: '2026-01-01', effectiveTo: '2027-12-31', reasonCode: 'field_role',
    reason: 'نافذة اختبار مسارين التأمينات المعزولة', status: 'APPROVED', createdByUserId: admin.id, approvedByUserId: admin.id,
    approvedAt: new Date('2026-01-01T08:00:00Z'), terminatedFrom: null, overtimeEligibleOverride: null, unpaidLeaveDeductibleOverride: null, requiresCheckinForPresence: false })
  return emp
}
const runFor = async (period, employees) => expectStatus(await request(admin, 'POST', '/payroll/runs/calculate-defined', { period, scopeType: 'CUSTOM',
  employeeIds: employees.map(emp => emp.id), name: `مسارين التأمينات ${period} ${crypto.randomUUID().slice(0, 8)}` }), 201)
const itemOf = (run, emp) => run.items.find(row => row.employeeId === emp.id)
const shares = (run, emp) => { const item = itemOf(run, emp), detail = JSON.parse(item.breakdown).socialInsurance
  return { deduction: Number(item.socialInsuranceDeduction), employer: detail.employerShare, insured: detail.insuredSalary, track: detail.track ?? null, from: detail.ratesEffectiveFrom ?? null } }
const configValue = async key => (await repo('RequestsConfig').findOneBy({ key }))?.value

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, /^hr_gosi_tracks_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME,
    password: env.DB_PASSWORD, database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assert.equal(ds.options.database, database)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  saudiBranch = await repo('Branch').save({ code: 'GT_SA', name: 'فرع جدة', insuranceSystem: 'SAUDI' })
  egyptBranch = await repo('Branch').save({ code: 'GT_EG', name: 'فرع الإسكندرية', insuranceSystem: 'EGYPTIAN' })
  admin = await repo('User').save({ email: 'admin@gosi-tracks.invalid', displayName: 'admin', passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  approver = await repo('User').save({ email: 'approver@gosi-tracks.invalid', displayName: 'approver', passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  // يشوف الموظفين من غير المالية
  viewer = await repo('User').save({ email: 'viewer@gosi-tracks.invalid', displayName: 'viewer', passwordHash: 'test-only', role: 'hr_manager',
    branchId: saudiBranch.id, permissions: JSON.stringify(['employees.view']) })
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '1' }, { key: 'payroll.monthly_days', value: '30' }, { key: 'payroll.daily_hours', value: '8' },
    { key: 'payroll.exempt_overtime_eligible', value: 'false' }, { key: 'payroll.exempt_unpaid_leave_deductible', value: 'true' },
    { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' },
  ])
}, { timeout: 90000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_gosi_tracks_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try { fs.rmSync(uploads, { recursive: true, force: true }) } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'GOSI tracks fixture cleanup failed')
})

test('GT-1: المسير بالمسارين وبالقيمة السارية في آخر يوم في الفترة، وحدود مصر المؤرخة، والمسير المعتمد مابيتغيرش لما يتفتح', async () => {
  // البيانات الأولية اتضافت وقت الإقلاع (محتاجة تحقق)
  // B4.2 زوّد مفاتيح مرجعية تانية في البذرة — المفتاحين اللي الحساب بيقراهم 7 صفوف زي ما هم
  assert.equal(await repo('StatutoryDefinition').count(), require('../src/statutory/statutory-data').STATUTORY_SEED.length)
  assert.equal(await repo('StatutoryDefinition').count({ where: [{ key: 'sa.gosi.new_track' }, { key: 'eg.insurance.wage_limits' }] }), 7)
  assert.equal(await repo('StatutoryDefinition').countBy({ verified: true }), 0)
  const fresh = await employee(saudiBranch, { gosiBaseSalary: 10000 })
  const old = await employee(saudiBranch, { gosiBaseSalary: 10000 })
  const resident = await employee(saudiBranch, { nationality: 'هندي', gosiBaseSalary: 10000 })
  const cairo = await employee(egyptBranch, { nationality: 'مصري', gosiBaseSalary: 25000, basicSalary: 30000 })
  for (const emp of [fresh, resident]) {
    expectStatus(await request(admin, 'PATCH', `/employees/${emp.id}`, { gosiFirstRegisteredAt: '2024-07-03' }), 200)
  }

  const july = await runFor('2026-07', [fresh, old, resident, cairo])
  assert.deepEqual(shares(july, fresh), { deduction: 1075, employer: 1275, insured: 10000, track: 'NEW', from: '2026-07-03' })
  assert.deepEqual(shares(july, old), { deduction: 975, employer: 1175, insured: 10000, track: 'OLD', from: null })
  assert.deepEqual(shares(july, resident), { deduction: 0, employer: 200, insured: 10000, track: null, from: null })
  assert.deepEqual(shares(july, cairo), { deduction: 1837, employer: 3131.25, insured: 16700, track: null, from: '2026-01-01' })
  assert.equal(Number(itemOf(july, fresh).netPay), 9000 - 1075)

  // يونيو 2026: نسب يوليو 2025، وإعادة الحساب بعد ما يوليو 2026 بقى ساري مابتغيرهاش
  const june = await runFor('2026-06', [fresh])
  assert.deepEqual(shares(june, fresh), { deduction: 1025, employer: 1225, insured: 10000, track: 'NEW', from: '2025-07-03' })
  const recalculated = expectStatus(await request(admin, 'POST', `/payroll/runs/${june.id}/recalculate`, { reason: 'إعادة حساب يونيو بعد سريان نسب يوليو' }), 201)
  assert.deepEqual(shares(recalculated, fresh), shares(june, fresh))

  // حدود الأجر المصري: ديسمبر 2026 بحد 2026، ويناير 2027 بحد 19,300 من غير ما حد يلمس الشاشة
  assert.deepEqual(shares(await runFor('2026-12', [cairo]), cairo), { deduction: 1837, employer: 3131.25, insured: 16700, track: null, from: '2026-01-01' })
  assert.deepEqual(shares(await runFor('2027-01', [cairo]), cairo), { deduction: 2123, employer: 3618.75, insured: 19300, track: null, from: '2027-01-01' })

  // اعتماد يوليو، ثم الموظف يرجع للمسار القديم (الخانة اتفضّت) والمسير يتفتح تاني: البند زي ما اتحسب بالحرف
  const unassigned = expectStatus(await request(approver, 'GET', `/payroll/runs/${july.id}/unassigned`), 200)
  expectStatus(await request(approver, 'POST', `/payroll/runs/${july.id}/unassigned-ack`, { reportHash: unassigned.reportHash }), 201)
  expectStatus(await request(approver, 'POST', `/payroll/runs/${july.id}/approve`), 201)
  const approvedItem = await repo('PayrollItem').findOneByOrFail({ runId: july.id, employeeId: fresh.id })
  expectStatus(await request(admin, 'PATCH', `/employees/${fresh.id}`, { gosiFirstRegisteredAt: null }), 200)
  expectStatus(await request(admin, 'POST', `/payroll/runs/${july.id}/reopen`, { reason: 'إعادة فتح بعد تعديل خانة التأمينات' }), 201)
  const reopened = await repo('PayrollItem').findOneByOrFail({ runId: july.id, employeeId: fresh.id })
  assert.deepEqual([reopened.socialInsuranceDeduction, reopened.netPay, reopened.breakdown], [approvedItem.socialInsuranceDeduction, approvedItem.netPay, approvedItem.breakdown])
  // التقرير بيقرا من المسير (المسار اللي اتحسب بيه)
  const report = expectStatus(await request(admin, 'GET', `/social-insurance/report?period=2026-07&branchId=${saudiBranch.id}`), 200)
  const row = report.rows.find(r => r.employeeId === fresh.id)
  assert.deepEqual([row.source, row.track, row.employeePct, row.employeeShare, row.ratesEffectiveFrom, row.ratesVerified], ['PAYROLL', 'NEW', 10.75, 1075, '2026-07-03', false])
  assert.equal(report.rows.find(r => r.employeeId === old.id).track, 'OLD')
})

test('GT-2: خانة «تاريخ أول تسجيل في التأمينات» — الحفظ والمسح والتحقق وسجل التغييرات، ومخفية عن غير المالية', async () => {
  const emp = await employee(saudiBranch, { gosiBaseSalary: 8000 })
  const shown = async user => (await request(user, 'GET', `/employees/${emp.id}`)).body
  assert.equal((await shown(admin)).gosiFirstRegisteredAt, null)
  const saved = expectStatus(await request(admin, 'PATCH', `/employees/${emp.id}`, { gosiFirstRegisteredAt: '2025-03-01' }), 200)
  assert.equal(saved.gosiFirstRegisteredAt, '2025-03-01')
  assert.equal((await shown(admin)).gosiFirstRegisteredAt, '2025-03-01')
  assert.equal(expectStatus(await request(admin, 'GET', `/employees/${emp.id}/profile`), 200).employee.gosiFirstRegisteredAt, '2025-03-01')
  // نفس القيمة تاني: مفيش سطر جديد في السجل
  expectStatus(await request(admin, 'PATCH', `/employees/${emp.id}`, { gosiFirstRegisteredAt: '2025-03-01' }), 200)
  const today = localDateOf(new Date())
  const tomorrow = new Date(Date.parse(`${today}T12:00:00Z`) + 86400000).toISOString().slice(0, 10)
  for (const [value, pattern] of [['2025-02-30', /YYYY-MM-DD/], ['2025-3-1', /YYYY-MM-DD/], [tomorrow, /المستقبل/]]) {
    const bad = await request(admin, 'PATCH', `/employees/${emp.id}`, { gosiFirstRegisteredAt: value })
    assert.equal(bad.status, 400, value); assert.match([].concat(bad.body.message).join(' '), pattern, value)
  }
  assert.equal((await shown(admin)).gosiFirstRegisteredAt, '2025-03-01')
  expectStatus(await request(admin, 'PATCH', `/employees/${emp.id}`, { gosiFirstRegisteredAt: '' }), 200)
  assert.equal((await shown(admin)).gosiFirstRegisteredAt, null)
  const history = expectStatus(await request(admin, 'GET', `/employees/${emp.id}/history`), 200).filter(row => row.fieldName === 'gosiFirstRegisteredAt')
  assert.deepEqual(history.map(row => [row.oldValue, row.newValue]).reverse(), [[null, '2025-03-01'], ['2025-03-01', null]])
  // غير المالية: الخانة والسجل مخفيين
  expectStatus(await request(admin, 'PATCH', `/employees/${emp.id}`, { gosiFirstRegisteredAt: '2024-09-09' }), 200)
  const hidden = await shown(viewer)
  assert.equal(hidden.id, emp.id); assert.equal('gosiFirstRegisteredAt' in hidden, false)
  const hiddenHistory = expectStatus(await request(viewer, 'GET', `/employees/${emp.id}/history`), 200)
  assert.equal(JSON.stringify(hiddenHistory).includes('2024-09-09'), false)
})

test('GT-3: الإعدادات — «الأساسي + السكن»، والقيم المؤرخة في الشاشة، وتاريخ قرار حدود مصر', async () => {
  const initial = expectStatus(await request(admin, 'GET', '/social-insurance/settings'), 200)
  assert.equal(initial.baseIncludesHousing, false)
  assert.equal(initial.statutory.length, 7)
  assert.equal(initial.saudiNewTrackFrom, '2024-07-03')
  // الشاشة عمرها ما اتحفظت: حدود مصر من الجدول
  assert.equal(initial.egyptianLimitsFrom.verified, false)
  assert.equal(await configValue('social_insurance.egyptian.limits_changed_at'), undefined)

  const housed = await employee(saudiBranch, { basicSalary: 8000, housingAllowance: 2000, gosiBaseSalary: null })
  const estimate = async (period, emp) => expectStatus(await request(admin, 'GET', `/social-insurance/report?period=${period}`), 200).rows.find(r => r.employeeId === emp.id)
  const off = await estimate('2026-08', housed)
  assert.deepEqual([off.source, off.salarySource, off.insuredSalary, off.employeeShare], ['ESTIMATE', 'BASIC', 8000, 780])

  assert.equal((await request(admin, 'PUT', '/social-insurance/settings', { baseIncludesHousing: 'yes' })).status, 400)
  const on = expectStatus(await request(admin, 'PUT', '/social-insurance/settings', { baseIncludesHousing: true }), 200)
  assert.equal(on.baseIncludesHousing, true)
  // أول حفظ من غير تغيير حدود مصر: الحدود ماتكتبتش وتاريخ قرارها فاضي (الجدول لسه بيكسب)
  assert.equal(await configValue('social_insurance.egyptian.limits_changed_at'), '')
  assert.equal(await configValue('social_insurance.egyptian.max_salary'), undefined)
  const housedOn = await estimate('2026-08', housed)
  assert.deepEqual([housedOn.salarySource, housedOn.insuredSalary, housedOn.employeeShare], ['BASIC_HOUSING', 10000, 975])

  // تغيير حدود مصر من الشاشة: قرار من النهارده (مش بأثر رجعي)
  const cairo = await employee(egyptBranch, { nationality: 'مصري', gosiBaseSalary: 25000 })
  expectStatus(await request(admin, 'PUT', '/social-insurance/settings', { egyptianMaxSalary: 18000 }), 200)
  const today = localDateOf(new Date())
  assert.equal(await configValue('social_insurance.egyptian.limits_changed_at'), today)
  // تثبيت تاريخ القرار عشان الاختبار مايعتمدش على النهارده: 20 سبتمبر 2026
  await repo('RequestsConfig').save({ key: 'social_insurance.egyptian.limits_changed_at', value: '2026-09-20' })
  assert.deepEqual(await Promise.all(['2026-08', '2026-09', '2026-12', '2027-01'].map(async period => (await estimate(period, cairo)).insuredSalary)), [16700, 18000, 18000, 19300])
  // حفظ تاني لحاجة سعودية بس: تاريخ قرار مصر زي ما هو
  expectStatus(await request(admin, 'PUT', '/social-insurance/settings', { saudiEmployeePct: 9.75 }), 200)
  assert.equal(await configValue('social_insurance.egyptian.limits_changed_at'), '2026-09-20')
  expectStatus(await request(admin, 'PUT', '/social-insurance/settings', { egyptianMaxSalary: 16700, baseIncludesHousing: false }), 200)
  assert.equal(expectStatus(await request(admin, 'GET', '/social-insurance/settings'), 200).baseIncludesHousing, false)
})
