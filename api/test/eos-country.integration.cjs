'use strict'
// B4.5 (أ) على SQL حقيقي: «مكافأة نهاية الخدمة مطبّقة» لكل دولة — الافتراضي مطبّقة (التصفية زي ما كانت)، وقفل دولة بيشيل بند المكافأة
// التلقائي لموظفي فروعها بس، والمعاينة بتقول كده، والاعتماد بيقارن بنفس الحكم. قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_eos_country_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_eos_country_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-eos-country-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const eosRules = require('../src/offboarding/eos')
let master, app, ds, base, admin, scoped, created = false, sequence = 0
const B = {}
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false, permissions: JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token(user) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const raw = await response.text(); return { status: response.status, body: raw ? JSON.parse(raw) : null }
}
const ok = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const setApplies = (country, value, user = admin) => request(user, 'PATCH', '/settings/config', { key: eosRules.EOS_APPLIES_KEYS[country], value })
// خدمة 7 سنين (ويوم) وإجمالي 12,000 (مثال بطاقة C-EG-07): (5 × 0.5 + 2 × 1) × 12,000 ≈ 54,000 بسبب «إنهاء من صاحب العمل» — المبلغ بدوال النظام نفسها
const DEFAULT_POLICY = eosRules.buildEosPolicy({ firstTierMonths: eosRules.EOS_DEFAULTS.firstTierMonths, firstTierYears: eosRules.EOS_DEFAULTS.firstTierYears, laterMonths: eosRules.EOS_DEFAULTS.laterMonths,
  resignationFactors: eosRules.EOS_DEFAULTS.resignationFactors, reasonFactors: eosRules.EOS_DEFAULTS.reasonFactors })
const EXPECTED_EOS = eosRules.computeEos(12000, eosRules.serviceYears('2092-07-10', '2099-07-10'), 'termination', DEFAULT_POLICY)
const EOS = EXPECTED_EOS.amount
assert.ok(EOS >= 54000 && EOS < 54100, String(EOS))
async function fixture(branch) {
  const employee = await repo('Employee').save({ employeeCode: 'EOSC' + ++sequence, fullName: 'موظف مكافأة الدولة ' + sequence, branchId: branch.id, joinDate: '2092-07-10', status: 'active', isActive: true,
    basicSalary: 12000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, payMethod: 'cash' })
  const kase = await repo('OffboardingCase').save({ employeeId: employee.id, lastWorkingDay: '2099-07-10', status: 'IN_SETTLEMENT', terminationReason: 'termination' })
  await repo('ClearanceItem').save(['manager', 'custody', 'it', 'finance', 'hr'].map(party => ({ caseId: kase.id, party, label: party, status: 'DONE' })))
  return { employee, kase }
}
const recalc = async f => ok(await request(admin, 'POST', `/offboarding/${f.kase.id}/recalc-lines`), 201)
const eosLines = async f => (await repo('SettlementLine').findBy({ caseId: f.kase.id })).filter(row => row.isAuto && row.label.startsWith('مكافأة نهاية الخدمة')).map(row => Number(row.amount))
const previewOf = async f => ok(await request(admin, 'GET', `/offboarding/preview?employeeId=${f.employee.id}&reason=termination&lastWorkingDay=2099-07-10`), 200)

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
  B.eg = await repo('Branch').save({ code: 'EOS_EG', name: 'فرع القاهرة', country: 'EG' })
  B.sa = await repo('Branch').save({ code: 'EOS_SA', name: 'فرع الرياض', country: 'SA' })
  B.none = await repo('Branch').save({ code: 'EOS_NO', name: 'فرع من غير دولة' })
  admin = await repo('User').save({ email: 'admin@eos-country.invalid', displayName: 'Fixture admin', passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  scoped = await repo('User').save({ email: 'scoped@eos-country.invalid', displayName: 'Fixture branch settings', passwordHash: 'test-only', role: 'hr_manager', branchId: B.eg.id,
    permissions: JSON.stringify(['settings.manage']) })
  for (const [key, value] of [['payroll.monthly_days', '30'], ['payroll.daily_hours', '8'], ['payroll.cycle_start_day', '23'], ['payroll.salary_evidence_mode', 'MONTHLY_HISTORY_OR_CURRENT_FILE']]) {
    const found = await repo('RequestsConfig').findOneBy({ key })
    if (found) await repo('RequestsConfig').update({ key }, { value }); else await repo('RequestsConfig').save({ key, value })
  }
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

test('ES-01: الافتراضي «مطبّقة» للدولتين — التصفية والمعاينة زي ما كانوا بالحرف في فرع مصري وسعودي ومن غير دولة', async () => {
  const seeded = Object.fromEntries((await repo('RequestsConfig').find()).filter(row => row.key.startsWith('eos.applies.')).map(row => [row.key, row.value]))
  assert.deepEqual(seeded, { 'eos.applies.eg': 'true', 'eos.applies.sa': 'true' })
  for (const branch of [B.eg, B.sa, B.none]) {
    const f = await fixture(branch)
    await recalc(f)
    assert.deepEqual(await eosLines(f), [EOS], branch.name)
    const preview = await previewOf(f)
    assert.deepEqual(['applies' in preview.eos, 'note' in preview.eos, preview.lines.some(line => line.label.startsWith('مكافأة نهاية الخدمة'))], [false, false, true], branch.name)
    ok(await request(admin, 'POST', `/offboarding/${f.kase.id}/approve-settlement`), 201)
  }
})

test('ES-02: قفل مصر — موظف الفرع المصري من غير بند مكافأة والمعاينة بتقول ليه، والسعودي ومن غير دولة زي ما هم، والاعتماد بنفس الحكم، والقيم والصلاحية', async () => {
  // القيمة نعم/لأ بس، وحساب فرع مايغيّرش إعداد الشركة
  assert.equal((await setApplies('EG', 'maybe')).status, 400)
  assert.equal((await setApplies('EG', 'false', scoped)).status, 403)
  const stale = await fixture(B.eg)
  await recalc(stale)
  assert.deepEqual(await eosLines(stale), [EOS])

  ok(await setApplies('EG', 'false'), 200)
  try {
    const eg = await fixture(B.eg), sa = await fixture(B.sa), none = await fixture(B.none)
    for (const f of [eg, sa, none]) await recalc(f)
    assert.deepEqual([await eosLines(eg), await eosLines(sa), await eosLines(none)], [[], [EOS], [EOS]])
    const hidden = await previewOf(eg)
    assert.deepEqual([hidden.eos.applies, hidden.eos.note, hidden.lines.some(line => line.label.startsWith('مكافأة نهاية الخدمة')), hidden.eos.fullMonths], [false, eosRules.EOS_NOT_APPLIED_NOTE, false, Math.round(EXPECTED_EOS.fullMonths * 100) / 100])
    assert.equal('applies' in (await previewOf(sa)).eos, false)
    // تصفية مصرية من غير بند مكافأة بتتعتمد؛ والسعودية ببندها
    ok(await request(admin, 'POST', `/offboarding/${eg.kase.id}/approve-settlement`), 201)
    ok(await request(admin, 'POST', `/offboarding/${sa.kase.id}/approve-settlement`), 201)
    // تصفية بنودها اتولّدت قبل القفل (فيها بند مكافأة): الاعتماد بيرفض لحد ما البنود تتولّد تاني
    const refused = await request(admin, 'POST', `/offboarding/${stale.kase.id}/approve-settlement`)
    assert.deepEqual([refused.status, /مكافأة نهاية الخدمة/.test(JSON.stringify(refused.body))], [409, true], JSON.stringify(refused.body))
    await recalc(stale)
    assert.deepEqual(await eosLines(stale), [])
    ok(await request(admin, 'POST', `/offboarding/${stale.kase.id}/approve-settlement`), 201)
    // موظف اتنقل لفرع سعودي: الحكم بدولة فرعه الحالي
    const moved = await fixture(B.eg)
    await repo('Employee').update({ id: moved.employee.id }, { branchId: B.sa.id })
    await recalc(moved)
    assert.deepEqual(await eosLines(moved), [EOS])
    // قفل السعودية كمان: مفتاح كل دولة لوحده؛ والفرع من غير دولة مالوش مفتاح فبيفضل مطبّق
    ok(await setApplies('SA', 'false'), 200)
    const sa2 = await fixture(B.sa), none2 = await fixture(B.none)
    await recalc(sa2); await recalc(none2)
    assert.deepEqual([await eosLines(sa2), await eosLines(none2)], [[], [EOS]])
  } finally {
    ok(await setApplies('EG', 'true'), 200)
    await setApplies('SA', 'true')
  }
  const back = await fixture(B.eg)
  await recalc(back)
  assert.deepEqual(await eosLines(back), [EOS], 'رجعت مطبّقة')
})
