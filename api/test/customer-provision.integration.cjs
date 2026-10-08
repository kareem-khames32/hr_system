'use strict'
// B6.1 (أ) على SQL حقيقي: تجهيز عميل جديد — قاعدة جديدة من مزامنة الكيانات + المُرحّل المجمّع بوضع «قاعدة جديدة» (13 ملف «مغطّاة بالأساس» بتتسجّل من غير تنفيذ)
// + بذرة العميل، والفحص الأخير فرق صفر؛ والوضع بيترفض على قاعدة لها دفتر؛ والفشل بيشيل القاعدة اللي اتعملت. كله على قواعد اختبار مؤقتة بتتمسح.
const { test, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const sql = require('../node_modules/mssql')
const migrate = require('../scripts/db-migrate.cjs')
const customer = require('../scripts/customer.cjs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const NAME = /^hr_provision_test_[a-f0-9]{16}$/
const fresh = () => 'hr_provision_test_' + crypto.randomBytes(8).toString('hex')
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-provision-'))
const registry = path.join(work, 'registry.json')
const connection = { server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD, options: { encrypt: false, trustServerCertificate: true } }
const made = []
const exists = async (master, database) => (await master.request().input('name', database).query('SELECT DB_ID(@name) AS id')).recordset[0].id !== null
const good = database => ({ database, country: 'SA', entity: '  شركة   التجربة ', adminEmail: 'Admin@Customer.Invalid', preset: 'standard', allowDisposable: true, backup: false, registry, quiet: true })

after(async t => {
  const master = await new sql.ConnectionPool({ ...connection, database: 'master' }).connect()
  try {
    for (const database of made) {
      assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
      if (await exists(master, database)) await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal(await exists(master, database), false)
    }
    t.diagnostic(`Cleanup verified: ${made.length} provisioning databases are absent from sys.databases.`)
  } finally { await master.close(); fs.rmSync(work, { recursive: true, force: true }) }
})

test('CP-01: تجهيز عميل — قاعدة جديدة كاملة: 13 ملف مغطّى بالأساس والباقي مطبّق، الدفتر كامل والفرق عن الكيانات صفر، ومدير نظام مقفول، وكيان وفرع وباقة', { timeout: 600000 }, async () => {
  const database = fresh(); made.push(database)
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  const record = await customer.provision(good(database))
  const files = migrate.discover().length
  assert.deepEqual([record.ok, record.migrations.ok, record.migrations.baselineCovered, record.migrations.applied, record.migrations.failed, record.migrations.schemaDiffCount, record.verify],
    [true, true, 13, files - 13, null, 0, { ok: true, schemaDiffCount: 0 }])
  const pool = await new sql.ConnectionPool({ ...connection, database }).connect()
  try {
    const one = async text => (await pool.request().query(text)).recordset
    // الدفتر: كل الملفات، والمغطّاة بالأساس بوسمها
    assert.deepEqual(await one(`SELECT scope, COUNT(*) AS n FROM dbo.${migrate.LEDGER} GROUP BY scope ORDER BY scope`), [{ scope: 'baseline', n: 13 }, { scope: 'payroll', n: files - 13 - 7 }, { scope: 'pre-payroll', n: 7 }])
    // مدير النظام: حساب واحد، مقفول، ومن غير كلمة مرور صالحة، ولازم يغيّرها
    assert.deepEqual(await one('SELECT [email], [role], [isActive], [passwordHash], [mustChangePassword], [scopeAllBranches] FROM dbo.users'),
      [{ email: 'admin@customer.invalid', role: 'super_admin', isActive: false, passwordHash: '!', mustChangePassword: true, scopeAllBranches: true }])
    // الكيان والفرع بدولة العميل وعملتها، ومربوطين
    const [entity] = await one('SELECT [id], [name], [country], [currency], [isActive] FROM dbo.legal_entities')
    assert.deepEqual([entity.name, entity.country, entity.currency, entity.isActive], ['شركة التجربة', 'SA', 'SAR', true])
    assert.deepEqual(await one('SELECT [name], [country], [isHeadquarters], [legalEntityId] FROM dbo.branches'), [{ name: 'الفرع الرئيسي', country: 'SA', isHeadquarters: true, legalEntityId: entity.id }])
    // من غير أي موظف أو مسير أو حساب تجريبي
    assert.deepEqual((await one('SELECT (SELECT COUNT(*) FROM dbo.employees) AS employees, (SELECT COUNT(*) FROM dbo.payroll_runs) AS runs, (SELECT COUNT(*) FROM dbo.users) AS users'))[0], { employees: 0, runs: 0, users: 1 })
    // الكتالوجات: كل أدوار الحزمة، وأنواع الطلبات، وأنواع الإجازات بفئة لكل نوع ونوع «امتحانات» (اللي ترحيل 042 المغطّى كان بيحطه)
    const { ROLE_PRESETS } = require('../src/auth/permissions')
    const counts = (await one(`SELECT (SELECT COUNT(*) FROM dbo.roles) AS roles, (SELECT COUNT(*) FROM dbo.request_types) AS types, (SELECT COUNT(*) FROM dbo.leave_types) AS leaves,
      (SELECT COUNT(*) FROM dbo.leave_types WHERE [category] IS NULL) AS uncategorised, (SELECT COUNT(*) FROM dbo.leave_types WHERE [code] = N'EXAMS') AS exams`))[0]
    assert.deepEqual([counts.roles >= ROLE_PRESETS.length, counts.types > 20, counts.leaves > 5, counts.uncategorised, counts.exams], [true, true, true, 0, 1])
    // الباقة: صف صريح لكل موديول اختياري، والمفعّل هو موديولات الباقة بس
    const registryModule = require('../src/modules-registry/registry')
    const optional = registryModule.MODULE_KEYS.filter(key => !registryModule.moduleDefOf(key).core), target = new Set(registryModule.modulesOfPreset('standard'))
    const rows = await one('SELECT [key], [enabled] FROM dbo.system_modules')
    const state = new Map(rows.map(row => [row.key, row.enabled]))
    assert.deepEqual(optional.filter(key => state.get(key) !== target.has(key)), [])
  } finally { await pool.close() }
  // سجل النسخ
  assert.deepEqual(customer.readRegistry(registry).map(row => [row.database, row.country, row.preset, row.adminEmail]), [[database, 'SA', 'standard', 'admin@customer.invalid']])
  // القاعدة بقى لها دفتر: وضع «قاعدة جديدة» بيترفض، والتطبيق العادي مابيلاقيش حاجة، والتجهيز تاني بنفس الاسم مرفوض
  await assert.rejects(migrate.apply({ database, fresh: true, quiet: true }), /القاعدة لها دفتر ترحيلات/)
  const plain = await migrate.apply({ database, quiet: true })
  assert.deepEqual([plain.ok, plain.applied.length], [true, 0])
  await assert.rejects(customer.provision(good(database)), /متسجّلة في سجل النسخ قبل كده/)
  await assert.rejects(customer.provision({ ...good(database), registry: path.join(work, 'other.json') }), /موجودة — التجهيز لقاعدة جديدة بس/)
})

test('CP-02: مدخلات التجهيز وحراسته — اسم القاعدة بنمط العميل بس، والمدخلات متحكم فيها قبل أي قاعدة؛ وفشل في النص بيشيل القاعدة اللي اتعملت', { timeout: 300000 }, async () => {
  const master = await new sql.ConnectionPool({ ...connection, database: 'master' }).connect()
  try {
    const database = fresh(); made.push(database)
    for (const [patch, message] of [[{ country: 'US' }, /الدولة: EG أو SA/], [{ entity: 'ش' }, /اسم الكيان من حرفين/], [{ adminEmail: 'admin' }, /بريد مدير النظام مش صحيح/], [{ preset: 'gold' }, /الباقة: /]]) {
      await assert.rejects(customer.provision({ ...good(database), ...patch }), message)
    }
    for (const name of [env.DB_DATABASE, 'master', 'hr_c_Acme', 'hr_c_acme; DROP', 'hr_review_pre_payroll_x', 'hr_customer']) {
      await assert.rejects(customer.provision({ ...good(name), allowDisposable: false }), /اسم قاعدة العميل/)
    }
    // اسم اختبار مؤقت من غير تصريح الاختبار مرفوض
    await assert.rejects(customer.provision({ ...good(database), allowDisposable: false }), /اسم قاعدة العميل لازم يكون hr_c_/)
    assert.equal(await exists(master, database), false)
    // فشل بعد إنشاء القاعدة (سجل نسخ مايتكتبش): القاعدة الجديدة بتتشال
    const blocked = path.join(work, 'blocked'); fs.writeFileSync(blocked, 'x')
    await assert.rejects(customer.provision({ ...good(database), registry: path.join(blocked, 'registry.json') }))
    assert.equal(await exists(master, database), false)
  } finally { await master.close() }
})
