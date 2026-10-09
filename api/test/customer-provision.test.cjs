// B6.1 (أ) — تجهيز عميل جديد: هدف «قاعدة جديدة» في المُرحّل، قايمة «مغطّاة بالأساس» المقفولة ببصماتها، مدخلات التجهيز، سجل النسخ، وترقية كل النسخ.
// حساب نقي بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const migrate = require('../scripts/db-migrate.cjs')
const customer = require('../scripts/customer.cjs')
const seed = require('../src/seed/customer-seed')
const companyDatabase = 'hr_system'

test('CPU-01: هدف «قاعدة جديدة» — اسم بنمط العميل، وبس لما المنادي يطلبه صراحةً؛ ومسار الشركة والمؤقت زي ما هم', () => {
  assert.equal(migrate.classifyTarget('hr_c_acme', { companyDatabase, fresh: true }), 'fresh')
  assert.equal(migrate.classifyTarget('hr_c_acme_ksa_2', { companyDatabase, fresh: true }), 'fresh')
  // من غير الطلب الصريح: مرفوضة زي أي قاعدة غريبة
  assert.throws(() => migrate.classifyTarget('hr_c_acme', { companyDatabase }), /غير مسموحة/)
  assert.throws(() => migrate.classifyTarget('hr_c_acme', { companyDatabase, fresh: 'yes' }), /غير مسموحة/)
  for (const name of ['hr_c_', 'hr_c_Acme', 'hr_c_acme-1', 'hr_customer', 'hr_c__x', 'master', 'hr_c_a_b_c_d_e_f_g']) assert.throws(() => migrate.classifyTarget(name, { companyDatabase, fresh: true }), /غير مسموحة|غير صالح/, name)
  assert.throws(() => migrate.classifyTarget('hr_c_acme', { companyDatabase, fresh: true, company: true }), /غير مسموحة/)
  // قاعدة الشركة وقاعدة المراجعة مايتفتحوش بالوضع ده
  assert.throws(() => migrate.classifyTarget(companyDatabase, { companyDatabase, fresh: true }), /--company/)
  assert.throws(() => migrate.classifyTarget('hr_review_pre_payroll_20260911162404_52ee65ac', { companyDatabase, fresh: true }), /محظورة/)
  assert.equal(migrate.classifyTarget('hr_integrity_test_0123456789abcdef', { companyDatabase, fresh: true }), 'disposable')
})

test('CPU-02: قايمة «مغطّاة بالأساس» مقفولة — 13 ملف موجودين ببصماتهم الحالية، كلهم من مجلد الرواتب وقبل أول ملف بحارس', () => {
  const files = migrate.discover(), covered = Object.keys(migrate.BASELINE_COVERED)
  assert.equal(covered.length, 13)
  assert.equal(Object.isFrozen(migrate.BASELINE_COVERED), true)
  for (const version of covered) {
    const file = files.find(item => item.version === version)
    assert.ok(file, version)
    assert.deepEqual([file.scope, file.kind, file.checksum], ['payroll', 'sql', migrate.BASELINE_COVERED[version]], version)
  }
  // مفيش ملف جديد يدخل القايمة: آخرها ترحيل 042
  assert.equal(covered.every(version => version <= '20260916_042_leave_types_screen'), true)
  // الملفات دي من غير تعبئة بيانات غير 042 (تحديثاته على صفوف موجودة ونوع «امتحانات» اللي بذرة العميل بتحطه)
  for (const version of covered.filter(item => !item.startsWith('20260916_042'))) {
    const text = files.find(item => item.version === version).content.replace(/ON (UPDATE|DELETE) (NO ACTION|CASCADE|SET NULL)/gi, '')
    assert.doesNotMatch(text, /\b(INSERT\s+INTO|UPDATE\s+\S+\s+SET|DELETE\s+FROM|MERGE\s+)/i, version)
  }
  const source = fs.readFileSync(path.join(apiRoot, 'scripts', 'db-migrate.cjs'), 'utf8')
  assert.match(source, /if \(mode === 'company'\) throw new Error\('وضع القاعدة الجديدة لا يعمل على قاعدة الشركة'\)/)
  assert.match(source, /if \(rowsBefore && rowsBefore\.length\) throw new Error\('وضع القاعدة الجديدة موقوف: القاعدة لها دفتر ترحيلات/)
  assert.match(source, /if \(Number\(state\.runs\) > 0 \|\| Number\(state\.employees\) > 1\) throw new Error\('وضع القاعدة الجديدة موقوف: القاعدة فيها موظفين أو مسيرات'\)/)
})

test('CPU-03: مدخلات التجهيز واسم القاعدة', () => {
  assert.deepEqual(seed.customerSeedInput({ country: 'EG', entityName: '  شركة   النيل ', adminEmail: ' Admin@Nile.Example ' }).input,
    { country: 'EG', entityName: 'شركة النيل', branchName: 'الفرع الرئيسي', adminEmail: 'admin@nile.example', preset: 'standard' })
  const issue = raw => seed.customerSeedInput({ country: 'SA', entityName: 'شركة', adminEmail: 'a@b.example', ...raw }).error
  assert.deepEqual([issue({ country: 'sa' }), issue({ entityName: 5 }), issue({ branchName: 'ف' }), issue({ adminEmail: 'a b@c.example' }), issue({ preset: 'toString' }), issue({ preset: 'full' })],
    ['الدولة: EG أو SA', 'اسم الكيان من حرفين لحد 150 حرف', 'اسم الفرع من حرفين لحد 150 حرف', 'بريد مدير النظام مش صحيح', 'الباقة: basic أو standard أو full', null])
  assert.equal(customer.assertDatabaseName('hr_c_acme', { companyDatabase }), 'customer')
  assert.equal(customer.assertDatabaseName('hr_provision_test_0123456789abcdef', { companyDatabase, allowDisposable: true }), 'disposable')
  for (const name of [companyDatabase, 'hr_provision_test_0123456789abcdef', 'hr_c_Acme', undefined, 'master']) assert.throws(() => customer.assertDatabaseName(name, { companyDatabase }), /اسم قاعدة العميل/, String(name))
  assert.deepEqual(customer.parseArgs(['new', '--database', 'hr_c_acme', '--country', 'SA', '--entity', 'شركة', '--admin-email', 'a@b.example', '--preset', 'full']),
    { command: 'new', database: 'hr_c_acme', country: 'SA', entity: 'شركة', adminEmail: 'a@b.example', preset: 'full' })
  assert.throws(() => customer.parseArgs(['new', '--password', 'x']), /وسيط غير معروف/)
})

test('CPU-04: سجل النسخ وترقية كل النسخ — المُرحّل من مجلد كل نسخة، والفشل ظاهر ومابيوقّفش الباقي', () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-customers-'))
  try {
    const registry = path.join(work, 'nested', 'registry.json')
    assert.deepEqual(customer.readRegistry(registry), [])
    const instance = name => { const root = path.join(work, name); fs.mkdirSync(path.join(root, 'scripts'), { recursive: true }); fs.writeFileSync(path.join(root, 'scripts', 'db-migrate.cjs'), '// stub'); return root }
    customer.writeRegistry([{ database: 'hr_c_one', apiRoot: instance('one') }, { database: 'hr_c_two', apiRoot: instance('two') }, { database: 'hr_c_lost', apiRoot: path.join(work, 'missing') }, { database: 'hr_c_none' }], registry)
    const calls = []
    const run = (root, args) => { calls.push([path.basename(root), args.join(' ')]); if (path.basename(root) === 'one' && args[0] === 'apply') { const error = new Error('exit 1'); error.stderr = 'ERROR: وضع الشركة موقوف: الـAPI يستمع'; throw error } return 'ok\nledger complete' }
    // CRP6A-B02: ملف بيئة كل مجلد بيشاور على قاعدته المسجّلة — والاسم بيتبعت للمُرحّل
    const targetOf = root => 'hr_c_' + path.basename(root)
    const report = customer.upgradeAll({ registry, run, targetOf })
    assert.deepEqual([report.total, report.failed, report.results.map(row => [row.database, row.ok])], [4, 3, [['hr_c_one', false], ['hr_c_two', true], ['hr_c_lost', false], ['hr_c_none', false]]])
    assert.deepEqual(calls, [['one', 'plan --database hr_c_one'], ['one', 'apply --company --database hr_c_one'], ['two', 'plan --database hr_c_two'], ['two', 'apply --company --database hr_c_two']])
    // مجلد ملف بيئته بيشاور على قاعدة تانية (أو مش مقري، أو اسم مسجّل مش اسم قاعدة عميل): ولا خطة ولا تطبيق، والفشل ظاهر
    calls.length = 0
    const wrong = customer.upgradeAll({ registry, run, targetOf: root => (path.basename(root) === 'two' ? 'hr_c_actual_other' : 'hr_c_' + path.basename(root)) })
    assert.deepEqual([wrong.results.map(row => row.ok), wrong.results[1].error, calls.map(call => call[0])], [[false, false, false, false], 'قاعدة ملف بيئة النسخة مش هي القاعدة المسجّلة باسمها — الترقية ماتنفّذتش', ['one', 'one']])
    calls.length = 0
    assert.deepEqual([customer.upgradeAll({ registry, run, targetOf: () => { throw new Error('no env') } }).failed, calls.length], [4, 0])
    assert.match(fs.readFileSync(path.join(apiRoot, 'scripts', 'customer.cjs'), 'utf8'), /\['apply', '--company', '--database', row\.database\]/)
    assert.match(report.results[0].error, /وضع الشركة موقوف/)
    // خطة بس: من غير تطبيق
    calls.length = 0
    assert.deepEqual([customer.upgradeAll({ registry, run, targetOf, planOnly: true }).failed, calls.map(call => call[1])], [2, ['plan --database hr_c_one', 'plan --database hr_c_two']])
    fs.writeFileSync(registry, '{"not":"a list"}')
    assert.throws(() => customer.readRegistry(registry), /سجل النسخ تالف/)
  } finally { fs.rmSync(work, { recursive: true, force: true }) }
  // السكربت مابياخدش كلمة مرور ولا بيطبعها
  const source = fs.readFileSync(path.join(apiRoot, 'scripts', 'customer.cjs'), 'utf8'), seedSource = fs.readFileSync(path.join(apiRoot, 'src', 'seed', 'customer-seed.ts'), 'utf8')
  assert.doesNotMatch(source, /--password|bcrypt/)
  assert.match(seedSource, /passwordHash: '!', role: 'super_admin', scopeAllBranches: true, permissions: '\[\]', isActive: false/)
  assert.doesNotMatch(seedSource, /bcrypt|Admin@123/)
})
