'use strict'
// ترحيلا سلسلة اعتماد المسير (20260922_062) وصرف المسير موظف بموظف (20260922_063):
// فحص نصي (إضافي فقط، متوافق مع SQL Server 2019، أكواد THROW فريدة، كل أعمدة الكيان موجودة)، ثم تطبيق فعلي بالمُرحّل المجمّع نفسه
// (معاملة لكل ملف والفحص الفعلي) على قاعدة مؤقتة hr_chain_migration_test_<hex> تُحذف في النهاية، وفرق مخطط TypeORM لكياناتنا = صفر،
// وإعادة التشغيل آمنة، وقيود القاعدة شغالة. لا اتصال بقاعدة الشركة ولا بقاعدة المراجعة.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
const { typeorm, mssql, env } = migrate.runtime()
const { PayrollApprovalChain, PayrollRunApproval } = require('../src/payroll/payroll-approval-chain.entities')
const { PayrollItemDisbursement } = require('../src/payroll/payroll-disbursement.entities')

const FILES = ['20260922_062_payroll_approval_chain.sql', '20260922_063_payroll_item_disbursement.sql']
const source = name => fs.readFileSync(path.join(apiRoot, '../docs/migrations/payroll', name), 'utf8').replace(/\r\n/g, '\n')
const ENTITIES = [[PayrollApprovalChain, 'payroll_approval_chains', FILES[0]], [PayrollRunApproval, 'payroll_run_approvals', FILES[0]],
  [PayrollItemDisbursement, 'payroll_item_disbursements', FILES[1]]]
const database = `hr_chain_migration_test_${crypto.randomBytes(8).toString('hex')}`
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-chain-migration-'))
let master, pool, created = false

function assertDisposable() {
  assert.match(database, /^hr_chain_migration_test_[a-f0-9]{16}$/)
  assert.match(database, migrate.DISPOSABLE_DATABASE)
  assert.notEqual(database, env.DB_DATABASE)
}
const q = async text => (await pool.request().query(text)).recordset

test('CHAIN-MIG-01: الترحيلان إضافيان بالكامل ومتوافقان مع SQL Server 2019 ويمرّان من فحص المُرحّل النصي بأكواد THROW فريدة', () => {
  const files = migrate.discover()
  const mine = files.filter(file => FILES.includes(file.name))
  assert.deepEqual(mine.map(file => file.name), FILES)
  assert.deepEqual(migrate.analyze(files).problems, [], 'لا عبارة ممنوعة ولا كود THROW مكرر بين كل ملفات الريبو')
  assert.deepEqual(migrate.throwCodes(mine[0].content), [62001, 62002, 62003, 62004, 62005])
  assert.deepEqual(migrate.throwCodes(mine[1].content), [63001, 63002, 63003, 63004])
  for (const file of mine) {
    const statements = migrate.stripComments(file.content)
    for (const forbidden of [/\bDROP\b/i, /\bDELETE\b/i, /\bTRUNCATE\b/i, /\bINSERT\b/i, /\bUPDATE\s+/i, /\bALTER\s+TABLE\b/i, /\bEXEC\b/i, /\bMERGE\b/i]) {
      assert.ok(!forbidden.test(statements), `${file.name} لا يحتوي ${forbidden}`)
    }
    // دوال ما بعد 2019 ممنوعة على خادم الإنتاج
    for (const later of [/\bGREATEST\s*\(/i, /\bLEAST\s*\(/i, /\bGENERATE_SERIES\b/i, /\bDATETRUNC\b/i, /\bIS\s+(?:NOT\s+)?DISTINCT\s+FROM\b/i, /\bJSON_OBJECT\b/i, /\bJSON_ARRAY\b/i, /\bSTRING_SPLIT\s*\([^)]*,[^)]*,/i]) {
      assert.ok(!later.test(statements), `${file.name} متوافق مع 2019: ${later}`)
    }
    assert.ok(migrate.splitBatches(file.content).length >= 4, `${file.name} مفصول بدفعات GO`)
  }
})

test('CHAIN-MIG-02: كل أعمدة الكيانات وقيودها وفهارسها موجودة في ترحيلها بأسمائها، وكل إنشاء محروس فيعاد تشغيله بأمان', () => {
  const storage = typeorm.getMetadataArgsStorage()
  for (const [entity, table, file] of ENTITIES) {
    const sql = source(file)
    assert.ok(sql.includes(`IF OBJECT_ID(N'dbo.${table}', N'U') IS NULL`), `${table}: إنشاء الجدول محروس`)
    const columns = storage.columns.filter(column => column.target === entity)
    assert.ok(columns.length >= 7, `${table}: ${columns.length} عمود`)
    for (const column of columns) {
      assert.ok(sql.includes(`[${column.propertyName}]`), `${table}.${column.propertyName} موجود في الترحيل`)
      assert.equal(column.options?.default, undefined, `${table}.${column.propertyName} بلا قيمة افتراضية (لا قيد DF يحتاج اسمًا مولّدًا)`)
    }
    assert.ok(sql.includes(`CONSTRAINT [PK_${table}] PRIMARY KEY ([id])`), `${table}: اسم المفتاح الأساسي`)
    for (const index of storage.indices.filter(row => row.target === entity)) {
      assert.ok(sql.includes(`WHERE name = N'${index.name}'`), `${index.name} محروس`)
      assert.ok(sql.includes(`CREATE ${index.unique ? 'UNIQUE ' : ''}INDEX [${index.name}]`), `${index.name} يُنشأ`)
    }
    for (const check of storage.checks.filter(row => row.target === entity)) {
      assert.ok(sql.includes(`CONSTRAINT [${check.name}] CHECK (${check.expression})`), `${check.name} بنفس التعبير`)
    }
  }
})

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  fs.mkdirSync(path.join(base, 'payroll'))
  for (const name of FILES) fs.copyFileSync(path.join(apiRoot, '../docs/migrations/payroll', name), path.join(base, 'payroll', name))
  master = await migrate.masterPool(env)
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  pool = await new mssql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD, database,
    options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 15000 }).connect()
}, { timeout: 60000 })

after(async () => {
  const errors = []
  try { if (pool) await pool.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assertDisposable()
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('database', database).query('SELECT DB_ID(@database) AS id')).recordset[0].id, null)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try { assert.match(path.basename(base), /^hr-chain-migration-/); fs.rmSync(base, { recursive: true, force: true }) } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'chain migration fixture cleanup failed')
})

async function entityDiff() {
  const ds = new typeorm.DataSource({ type: 'mssql', host: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), username: env.DB_USERNAME, password: env.DB_PASSWORD,
    database, options: { encrypt: false, trustServerCertificate: true }, entities: ENTITIES.map(([entity]) => entity), synchronize: false, logging: false })
  await ds.initialize()
  try { assert.equal(ds.options.database, database); return (await ds.driver.createSchemaBuilder().log()).upQueries.map(row => row.query) }
  finally { await ds.destroy() }
}

test('CHAIN-MIG-03: المُرحّل المجمّع يطبق الملفين (معاملة لكل ملف والفحص الفعلي)، وفرق مخطط TypeORM للكيانات الثلاثة = صفر، وإعادة التشغيل لا تغيّر شيئًا', async () => {
  assertDisposable()
  assert.ok((await entityDiff()).length > 0, 'قبل الترحيل: الجداول ناقصة فالفرق غير صفري (الفحص نفسه يرى الفرق)')
  const record = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.equal(record.mode, 'disposable')
  assert.equal(record.failed, undefined, JSON.stringify(record.failed))
  assert.deepEqual(record.applied.map(item => path.basename(item.file)), FILES)
  assert.equal(record.ledgerComplete, true)
  assert.deepEqual(record.rowCounts.differences.filter(row => row.kind !== 'new-table').map(row => row.table), [], 'لا صفوف اتغيرت في جداول قائمة')
  assert.deepEqual(record.rowCounts.differences.map(row => row.table).sort(),
    [migrate.LEDGER, 'payroll_approval_chains', 'payroll_item_disbursements', 'payroll_run_approvals'].sort(), 'ثلاثة جداول جديدة فقط + دفتر المُرحّل')
  assert.deepEqual(await entityDiff(), [], 'الترحيل ينتج نفس ما تولّده الكيانات بالحرف: أنواع وأطوال وقابلية إفراغ وأسماء قيود وفهارس')
  // إعادة التشغيل: الدفتر يتخطى، وتنفيذ الدفعات نفسها مرة ثانية مباشرة آمن كذلك (حراسات IF)
  const replay = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.deepEqual(replay.applied, []); assert.equal(replay.ok, true)
  for (const name of FILES) for (const batch of migrate.splitBatches(source(name))) await pool.request().batch(batch)
  assert.deepEqual(await entityDiff(), [])
})

test('CHAIN-MIG-04: قيود القاعدة شغالة — خطوة معتمدة مرة واحدة لنسخة الحساب، رفض بلا سبب مرفوض، وعلامة صرف واحدة لكل بند', async () => {
  assertDisposable()
  const approval = (step, decision, reason, voided) => `INSERT dbo.payroll_run_approvals(runId,snapshotVersion,chainId,chainHash,stepOrder,stepCount,stepLabel,approverKind,decision,reason,actorUserId,decidedAt,voidedAt)
    VALUES(7,1,1,N'${'a'.repeat(64)}',${step},3,N'مراجعة',N'USER',N'${decision}',${reason === null ? 'NULL' : `N'${reason}'`},5,SYSUTCDATETIME(),${voided ? 'SYSUTCDATETIME()' : 'NULL'})`
  await q(approval(1, 'APPROVED', null, false))
  await assert.rejects(q(approval(1, 'APPROVED', null, false)), /UX_payroll_run_approval_active_step/)
  await q(approval(1, 'APPROVED', null, true)) // الملغى خارج الفهرس الفريد
  await q(approval(2, 'REJECTED', 'الأرقام محتاجة مراجعة', false))
  await assert.rejects(q(approval(2, 'REJECTED', null, false)), /CK_payroll_run_approval_decision/)
  await q(`INSERT dbo.payroll_approval_chains(scope,seriesName,steps,revision,updatedByUserId,updatedAt) VALUES(N'COMPANY',N'',N'[]',1,1,SYSUTCDATETIME())`)
  await assert.rejects(q(`INSERT dbo.payroll_approval_chains(scope,seriesName,steps,revision,updatedByUserId,updatedAt) VALUES(N'COMPANY',N'',N'[]',1,1,SYSUTCDATETIME())`), /UX_payroll_approval_chain_key/)
  await assert.rejects(q(`INSERT dbo.payroll_approval_chains(scope,seriesName,steps,revision,updatedByUserId,updatedAt) VALUES(N'RUN_SERIES',N'',N'[]',1,1,SYSUTCDATETIME())`), /CK_payroll_approval_chain_scope/)
  const mark = status => `INSERT dbo.payroll_item_disbursements(runId,itemId,employeeId,status,amount,bankAmount,cashAmount,markedByUserId,markedAt) VALUES(7,70,9,N'${status}',100,100,0,5,SYSUTCDATETIME())`
  await q(mark('PAID'))
  await assert.rejects(q(mark('PAID')), /UX_payroll_item_disbursement_item/)
  await assert.rejects(q(mark('DONE').replace('70', '71')), /CK_payroll_item_disbursement_status/)
})
