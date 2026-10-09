'use strict'
// ===== تجهيز عميل جديد وترقية النسخ (B6.1) — نسخة مستقلة لكل عميل: قاعدة + ملف بيئة + مجلد ملفات، بنفس الكود =====
// الشرح الكامل: docs/ops/new-customer.md
//   node api/scripts/customer.cjs new --database hr_c_<اسم> --country EG|SA --entity "<اسم الكيان>" --admin-email <بريد> [--branch "<اسم الفرع>"] [--preset basic|standard|full]
//   node api/scripts/customer.cjs list
//   node api/scripts/customer.cjs upgrade-all [--plan-only]
// «new»: قاعدة جديدة (لازم ماتكونش موجودة) ← مزامنة الكيانات ← حساب مدير نظام مقفول ← كل الترحيلات بالمُرحّل المجمّع (وضع «قاعدة جديدة») ←
//   بذرة العميل ← فحص (الدفتر كامل والفرق عن الكيانات صفر) ← نسخة احتياطية «نقطة أساس» ← سطر في سجل النسخ. أي فشل = القاعدة الجديدة بتتشال (هي بس).
// كلمة مرور المدير مابتتكتبش هنا: `node scripts/set-password.cjs <البريد>` من مجلد نسخة العميل بعد ضبط ملف بيئتها.
// «upgrade-all»: لكل نسخة في السجل، المُرحّل نفسه من مجلدها (`plan` ثم `apply --company` بحراسته كاملة). فشل نسخة مابيوقّفش الباقي ومابيتخبّاش.
const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const migrate = require('./db-migrate.cjs')

const apiRoot = path.resolve(__dirname, '..')
const REGISTRY = process.env.HR_CUSTOMERS_REGISTRY || 'D:/projects/hr_system_customers/registry.json'
const BASELINE_DIR = process.env.HR_CUSTOMERS_BACKUP_DIR || 'D:/projects/hr_system_backups/customers'

function readRegistry(file = REGISTRY) {
  if (!fs.existsSync(file)) return []
  const rows = JSON.parse(fs.readFileSync(file, 'utf8'))
  if (!Array.isArray(rows)) throw new Error('سجل النسخ تالف: ' + file)
  return rows
}
function writeRegistry(rows, file = REGISTRY) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(rows, null, 2) + '\n')
}

/** اسم قاعدة العميل: نمط العميل بس — وفي الاختبارات (allowDisposable) اسم قاعدة اختبار مؤقتة */
function assertDatabaseName(database, { companyDatabase, allowDisposable = false }) {
  if (typeof database !== 'string' || database === companyDatabase) throw new Error('اسم قاعدة العميل غير صالح')
  if (migrate.CUSTOMER_DATABASE.test(database)) return 'customer'
  if (allowDisposable && migrate.DISPOSABLE_DATABASE.test(database)) return 'disposable'
  throw new Error('اسم قاعدة العميل لازم يكون hr_c_<اسم> بحروف صغيرة وأرقام وشرطة سفلية')
}

async function provision(options = {}) {
  const { env } = migrate.runtime()
  const { customerSeedInput, customerAdmin, seedCustomer } = require('../src/seed/customer-seed')
  const kind = assertDatabaseName(options.database, { companyDatabase: env.DB_DATABASE, allowDisposable: options.allowDisposable === true })
  const { input, error } = customerSeedInput({ country: options.country, entityName: options.entity, branchName: options.branch, adminEmail: options.adminEmail, preset: options.preset })
  if (!input) throw new Error(error)
  const database = options.database
  const registryFile = options.registry || REGISTRY
  if (options.register !== false && readRegistry(registryFile).some(row => row.database === database)) throw new Error('القاعدة دي متسجّلة في سجل النسخ قبل كده')
  const record = { command: 'new', database, country: input.country, preset: input.preset, startedAt: new Date().toISOString() }
  const master = await migrate.masterPool(env)
  let created = false
  try {
    const exists = (await master.request().input('name', database).query('SELECT DB_ID(@name) AS id')).recordset[0].id
    if (exists !== null) throw new Error(`القاعدة ${database} موجودة — التجهيز لقاعدة جديدة بس`)
    await master.request().query(`CREATE DATABASE [${database}]`)
    created = true
    // 1) شكل القاعدة من الكيانات، وحساب مدير النظام المقفول (ترحيل النسخ المؤرخة بيوثّق بيه)
    let ds = await migrate.openDataSource(env, database, true)
    let adminUserId
    try {
      await ds.synchronize()
      adminUserId = await customerAdmin(ds, input.adminEmail)
    } finally { await ds.destroy() }
    // 2) كل الترحيلات بالمُرحّل المجمّع — وضع «قاعدة جديدة»
    const applied = await migrate.apply({ database, fresh: true, quiet: options.quiet !== false })
    record.migrations = { ok: applied.ok, baselineCovered: applied.baselineCovered?.length ?? 0, applied: applied.applied?.length ?? 0, failed: applied.failed ?? null, schemaDiffCount: applied.schemaDiffCount }
    if (!applied.ok) throw new Error('الترحيلات ماكملتش على القاعدة الجديدة: ' + (applied.failed ? `${applied.failed.file} — ${applied.failed.error}` : `فرق عن الكيانات ${applied.schemaDiffCount}`))
    // 3) بذرة العميل
    ds = await migrate.openDataSource(env, database, true)
    try {
      record.seed = await seedCustomer(ds, input, adminUserId)
      // أنواع الإجازات بتتزرع بشكلها القديم؛ ترحيل 042 (مغطّى بالأساس عشان دفعة أعمدته) هو اللي بيوصّلها للشكل النهائي: الفئة لكل نوع، وإعدادات
      // السنوية والمرضية، ونوع «امتحانات». دفعات البيانات بتاعته بتتنفذ هنا بنص الملف نفسه وبترتيبه — من غير دفعة الأعمدة — وآخرها فحصه هو (نوع بلا فئة = خطأ).
      const leaveScreen = migrate.discover().find(file => file.version === '20260916_042_leave_types_screen')
      if (!leaveScreen || leaveScreen.checksum !== migrate.BASELINE_COVERED[leaveScreen.version]) throw new Error('ملف ترحيل أنواع الإجازات (042) مش بالبصمة المتراجَعة')
      const dataBatches = migrate.splitBatches(leaveScreen.content).filter(batch => !/\bALTER\s+TABLE\b/i.test(batch))
      for (const batch of dataBatches) await ds.query(batch)
      record.leaveTypeBatches = dataBatches.length
    } finally { await ds.destroy() }
    // 4) الفحص الأخير: الدفتر كامل والفرق عن الكيانات صفر
    const verified = await migrate.verify({ database, fresh: kind === 'customer', quiet: true })
    record.verify = { ok: verified.ok, schemaDiffCount: verified.schemaDiffCount }
    if (!verified.ok) throw new Error('فحص القاعدة الجديدة فشل')
    // 5) نسخة «نقطة الأساس» للنسخة دي: مسارها بيتحط في ملف بيئتها (HR_COMPANY_BACKUP) عشان ترقيتها بعد كده تمشي بحراسة المُرحّل العادية
    if (options.backup !== false) {
      const backup = await migrate.takeCompanyBackup(master, database, { hostDir: options.backupDir || BASELINE_DIR, label: 'baseline' })
      record.baselineBackup = { file: backup.hostPath, sha256: backup.sha256 }
    }
    if (options.register !== false) {
      const rows = readRegistry(registryFile)
      rows.push({ database, country: input.country, entity: input.entityName, preset: input.preset, adminEmail: input.adminEmail, createdAt: record.startedAt, apiRoot: options.instanceApiRoot || null,
        baselineBackup: record.baselineBackup?.file ?? null })
      writeRegistry(rows, registryFile)
    }
    record.ok = true
    return record
  } catch (failure) {
    // أي فشل: القاعدة اللي الأمر ده عملها (باسمها المتحقق منه) بتتشال — مفيش نص قاعدة عميل متساب
    if (created) {
      assertDatabaseName(database, { companyDatabase: env.DB_DATABASE, allowDisposable: options.allowDisposable === true })
      try { await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`) } catch { /* بتتبلّغ مع الخطأ الأصلي */ }
    }
    throw failure
  } finally { await master.close() }
}

/** ترقية كل النسخ المسجّلة: المُرحّل نفسه من مجلد كل نسخة (ملف بيئتها وحراسته). النتيجة لكل نسخة، وفشل واحدة مابيوقّفش الباقي. */
function upgradeAll(options = {}) {
  const rows = readRegistry(options.registry || REGISTRY)
  const run = options.run || ((root, args) => execFileSync(process.execPath, [path.join(root, 'scripts', 'db-migrate.cjs'), ...args], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }))
  // CRP6A-B02: قاعدة ملف بيئة مجلد النسخة (اسمها بس — مفيش قيمة تانية بتتقري ولا بتتطبع)
  const targetOf = options.targetOf || (root => String(require(path.join(apiRoot, 'node_modules', 'dotenv')).parse(fs.readFileSync(path.join(root, '.env'))).DB_DATABASE ?? '').trim())
  const results = []
  for (const row of rows) {
    const result = { database: row.database, apiRoot: row.apiRoot || null }
    if (!row.apiRoot || !fs.existsSync(path.join(row.apiRoot, 'scripts', 'db-migrate.cjs'))) { results.push({ ...result, ok: false, error: 'مجلد النسخة (apiRoot) مش متسجّل أو مش موجود' }); continue }
    // CRP6A-B02: الترقية مثبّتة على القاعدة المسجّلة باسم العميل. ملف بيئة المجلد لازم يشاور عليها (وإلا مفيش خطة ولا تطبيق)، والاسم نفسه بيتبعت
    // للمُرحّل (--database): لو ملف البيئة اتغيّر بعد الفحص المُرحّل نفسه بيرفض (--company لقاعدة ملف البيئة بس) — مفيش ترحيل بيروح لقاعدة تانية.
    let target = ''
    try { assertDatabaseName(row.database, {}); target = targetOf(row.apiRoot) } catch { target = '' }
    if (!target || target !== row.database) { results.push({ ...result, ok: false, error: 'قاعدة ملف بيئة النسخة مش هي القاعدة المسجّلة باسمها — الترقية ماتنفّذتش' }); continue }
    try {
      result.plan = String(run(row.apiRoot, ['plan', '--database', row.database])).trim().split('\n').slice(-3).join(' | ')
      if (!options.planOnly) result.apply = String(run(row.apiRoot, ['apply', '--company', '--database', row.database])).trim().split('\n').slice(-3).join(' | ')
      results.push({ ...result, ok: true })
    } catch (failure) {
      results.push({ ...result, ok: false, error: String(failure.stderr || failure.message || failure).trim().split('\n').slice(-2).join(' | ').slice(0, 600) })
    }
  }
  return { command: 'upgrade-all', planOnly: !!options.planOnly, total: rows.length, failed: results.filter(row => !row.ok).length, results }
}

function parseArgs(argv) {
  const [command = 'list', ...rest] = argv
  const options = { command }
  const named = { '--database': 'database', '--country': 'country', '--entity': 'entity', '--branch': 'branch', '--admin-email': 'adminEmail', '--preset': 'preset', '--registry': 'registry', '--backup-dir': 'backupDir',
    '--instance-api-root': 'instanceApiRoot' }
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]
    if (named[arg]) options[named[arg]] = rest[++i]
    else if (arg === '--plan-only') options.planOnly = true
    else throw new Error(`وسيط غير معروف: ${arg}`)
  }
  return options
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.command === 'new') {
    const record = await provision({ ...options, quiet: false })
    console.log(`✔ القاعدة ${record.database} اتجهّزت: ${record.migrations.applied} ترحيل اتطبق و${record.migrations.baselineCovered} مغطّى بالأساس، والفرق عن الكيانات صفر`)
    if (record.baselineBackup?.file) console.log(`  نقطة الأساس: ${record.baselineBackup.file}  ← حطها في ملف بيئة النسخة: HR_COMPANY_BACKUP`)
    console.log('  الخطوة الجاية: ملف بيئة النسخة، ثم node scripts/set-password.cjs <بريد المدير> من مجلدها (docs/ops/new-customer.md)')
  } else if (options.command === 'list') {
    for (const row of readRegistry(options.registry || REGISTRY)) console.log(`${row.database}\t${row.country}\t${row.preset}\t${row.createdAt}\t${row.apiRoot || '—'}`)
  } else if (options.command === 'upgrade-all') {
    const report = upgradeAll(options)
    for (const row of report.results) console.log(`${row.ok ? '✔' : '✖'} ${row.database}: ${row.ok ? (row.apply || row.plan) : row.error}`)
    if (report.failed) process.exitCode = 1
  } else throw new Error('الأوامر: new | list | upgrade-all')
}

module.exports = { provision, upgradeAll, readRegistry, writeRegistry, assertDatabaseName, parseArgs, REGISTRY, BASELINE_DIR }

if (require.main === module) {
  main().catch(error => {
    let message = String(error && error.message || error)
    try { const { env } = migrate.runtime(); if (env.DB_PASSWORD) message = message.split(env.DB_PASSWORD).join('***') } catch { /* من غير ملف بيئة */ }
    console.error('ERROR: ' + message)
    process.exitCode = 1
  })
}
