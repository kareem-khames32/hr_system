// Run: node --test --test-concurrency=1 api/test/db-migrate.test.cjs
// المُرحّل المجمّع: تحليل نصي + قاعدة مؤقتة hr_migrate_test_<16 hex> تنشئها وتحذفها الاختبارات بنفسها.
// لا يكتب شيئًا في hr_system (اختبارات حراسة وضع الشركة تتوقف قبل أي اتصال لغياب النسخة الاحتياطية).
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const EXPECTED_FIRST_19 = [
  '20260911_001_pre_payroll_adjustment_layer', '20260911_002_pre_payroll_holiday_country', '20260911_003_pre_payroll_letter_templates',
  '20260911_004_pre_payroll_history_actor_schema', '20260911_005_pre_payroll_history_work_type_data', '20260911_006_pre_payroll_leave_request_names',
  '20260912_007_pre_payroll_hr_document_templates',
  '20260912_001_settlement_payroll_boundary', '20260912_002_membership_claims_events', '20260912_003_attendance_exemptions',
  '20260913_004_attendance_flex_history', '20260913_005_overtime_workflow', '20260913_006_payroll_policy_drafts',
  '20260913_007_payroll_policy_settings', '20260913_008_payroll_policy_definitions', '20260913_009_loan_installment_ledger',
  '20260913_010_payroll_collection_policy', '20260913_011_payroll_salary_history', '20260914_012_payroll_salary_reference_period',
]

test('GO splits batches only on standalone lines outside strings and block comments', () => {
  const sql = "CREATE TABLE a(id int);\r\nGO\nSELECT 'x\nGO\ny' AS t;\n/* comment\nGO\n*/\nSELECT 1;\n  go  \nSELECT 2;\nGO -- end\n\nGO\n-- only a comment\n"
  const batches = migrate.splitBatches(sql)
  assert.equal(batches.length, 3)
  assert.match(batches[0], /CREATE TABLE a/)
  assert.match(batches[1], /'x\nGO\ny'/)
  assert.match(batches[1], /SELECT 1;/)
  assert.equal(batches[2].trim(), 'SELECT 2;')
})

test('legacy payroll 001-012 files run statement by statement (as their original runner did); new files use GO batches', () => {
  const statements = migrate.splitStatements("ALTER TABLE dbo.a ADD b int NULL;\n-- comment; not a split\nCREATE UNIQUE INDEX [UX;x] ON dbo.a ([b]) WHERE [b] IS NOT NULL;\nCREATE TABLE dbo.c (id int, CONSTRAINT CK_c CHECK ([id] IN (1,2)), note nvarchar(10) DEFAULT N'x;y');\n")
  assert.equal(statements.length, 3)
  assert.match(statements[1], /WHERE \[b\] IS NOT NULL;$/)
  assert.match(statements[2], /N'x;y'\);$/)
  const files = migrate.discover()
  const ledger009 = files.find(file => file.version === '20260913_009_loan_installment_ledger')
  const units = migrate.executionUnits(ledger009)
  // العمود parentInstallmentId يضاف في جملة والفهرس المفلتر عليه في جملة لاحقة منفصلة
  const addIndex = units.findIndex(unit => /ADD parentInstallmentId/i.test(unit)), filteredIndex = units.findIndex(unit => /UX_loan_installments_parent/.test(unit))
  assert.ok(addIndex >= 0 && filteredIndex > addIndex)
  assert.equal(migrate.LEGACY_STATEMENT_FILES.size, 12)
  assert.ok(files.filter(file => file.scope === 'payroll' && file.kind === 'sql' && !migrate.LEGACY_STATEMENT_FILES.has(file.version))
    .every(file => migrate.executionUnits(file).length === migrate.splitBatches(file.content).length))
  // ملفات ما قبل الرواتب تبقى دفعة كاملة (متغيرات DECLARE ومؤشر 004)
  assert.equal(migrate.executionUnits(files.find(file => file.version === '20260911_004_pre_payroll_history_actor_schema')).length, 1)
})

test('static guard rejects destructive statements, including split dynamic SQL, and accepts value-preserving ones', () => {
  const flagged = sql => migrate.forbiddenStatements(sql).length > 0
  for (const sql of ['DROP TABLE dbo.employees', 'DROP TABLE IF EXISTS dbo.x', 'ALTER TABLE t DROP COLUMN c', 'TRUNCATE TABLE dbo.t',
    'DELETE FROM dbo.employees WHERE id=1', 'DELETE t FROM dbo.t t', "EXEC sp_executesql N'DELETE FROM dbo.requests'", "EXEC sp_executesql N'DROP TABLE dbo.x'",
    'BEGIN TRANSACTION', 'BEGIN TRAN;', 'COMMIT;', 'ROLLBACK TRANSACTION', 'USE master', 'ALTER DATABASE hr_system SET SINGLE_USER', 'DROP DATABASE x',
    "BACKUP DATABASE hr_system TO DISK=N'x'",
    // تجاوزات وجدها المراجع: أسماء متعددة، ALTER COLUMN، SQL ديناميكي مقسّم، XACT_ABORT/ANSI_WARNINGS، تعطيل مشغلات/قيود، إعادة تسمية جدول
    'DROP TABLE #tmp, dbo.employees;', 'DROP TABLE IF EXISTS #t, dbo.users;', 'DROP TABLE #a,\n  [dbo].[employees]', 'ALTER TABLE dbo.employees ALTER COLUMN nameAr nvarchar(5) NULL;',
    "EXEC(N'DEL' + N'ETE FROM dbo.employees')", "DECLARE @s nvarchar(max) = N'TRUNC' + 'ATE TABLE dbo.t'", 'SET XACT_ABORT OFF;', 'SET ANSI_WARNINGS OFF',
    'DISABLE TRIGGER ALL ON dbo.employees;', 'ALTER TABLE dbo.employees NOCHECK CONSTRAINT ALL', 'ALTER INDEX ALL ON dbo.employees DISABLE',
    "EXEC sp_rename N'dbo.employees', N'employees_old'", 'ALTER TABLE dbo.a SWITCH TO dbo.b', 'ALTER SCHEMA archive TRANSFER dbo.employees', 'DBCC SHRINKDATABASE(0)']) {
    assert.equal(flagged(sql), true, sql)
  }
  for (const sql of ['DROP TABLE #tmp', 'DROP TABLE IF EXISTS #tmp', 'DELETE FROM #tmp', 'DELETE @rows WHERE id=1',
    'CONSTRAINT FK_x FOREIGN KEY (a) REFERENCES dbo.b (id) ON DELETE NO ACTION ON UPDATE NO ACTION', '-- DROP TABLE dbo.x\nSELECT 1',
    '/* TRUNCATE TABLE dbo.x */ SELECT 1', 'ALTER TABLE dbo.public_holidays DROP CONSTRAINT DF_x', "EXEC sys.sp_rename N'dbo.a.b', N'c', N'COLUMN'",
    "UPDATE dbo.employees SET workType=N'full_time' WHERE workType=N'fulltime'", 'DROP TABLE #a, #b', 'DROP TABLE IF EXISTS #step9_overtime;',
    '-- hr-migrate: allow-alter-column\nALTER TABLE dbo.a ALTER COLUMN note nvarchar(400) NULL', "UPDATE dbo.t SET note = N'switch to POLICY' WHERE id = 1",
    "EXEC sys.sp_rename @qualified,@new,N'COLUMN';"]) {
    assert.equal(flagged(sql), false, sql)
  }
})

test('script migrations (.cjs) are scanned before connecting: row deletes, destructive QueryRunner calls, transaction control and SQL literals', () => {
  const problems = source => migrate.forbiddenScript(source)
  const wrap = body => `'use strict'\nmodule.exports = { description: 'x', async up({ manager, query, queryRunner }) { ${body} } }\n`
  for (const body of ['await manager.delete(Foo, { id: 1 })', 'await manager.getRepository(Foo).remove(rows)', 'await manager.createQueryBuilder().delete().from(Foo).execute()',
    'await queryRunner.dropColumn("employees", "x")', 'await queryRunner.changeColumn("employees", "x", col)', 'await queryRunner.commitTransaction()',
    "await query('DELETE FROM dbo.employees')", "await query('DEL' + \"ETE FROM dbo.employees\")", "await query(`TRUNCATE TABLE ${'dbo.t'}`)",
    "require('node:child_process').execSync('x')", 'process.exit(0)', 'await manager.connection.synchronize()']) {
    assert.ok(problems(wrap(body)).length > 0, body)
  }
  for (const body of ["const seen = new Set([1]); seen.delete(1); await query('UPDATE dbo.t SET a = 1 WHERE id = @0', [1])", "// manager.delete(Foo) في تعليق\nawait query('SELECT 1')",
    "log('rows to delete: none; commit handled by the migrator')",
    "const crypto = require('node:crypto'); await query(\"UPDATE dbo.requests_config SET [value] = @0 WHERE [key] = N'x'\", [crypto.randomBytes(4).toString('hex')])"]) {
    assert.deepEqual(problems(wrap(body)), [], body)
  }
  // ملفات المستودع الحالية (ومنها 013 و014) نظيفة
  for (const file of migrate.discover().filter(f => f.kind === 'cjs')) assert.deepEqual(problems(file.content), [], file.relative)
})

test('column changes: widening passes; narrowing, lossy type changes and collation changes are refused', () => {
  const col = (typeName, maxLength, precision = 0, scale = 0, collation = typeName.includes('char') || typeName.includes('text') ? 'Arabic_CI_AS' : null) =>
    ({ typeName, maxLength, precision, scale, collation, isNullable: true, isComputed: false })
  const ok = (a, b) => assert.equal(migrate.columnChangeProblem('t.c', a, b), null, JSON.stringify([a, b]))
  const bad = (a, b) => assert.match(migrate.columnChangeProblem('t.c', a, b) || '', /t\.c/, JSON.stringify([a, b]))
  ok(col('nvarchar', 100), col('nvarchar', 400)); ok(col('nvarchar', 100), col('nvarchar', -1)); ok(col('varchar', 50), col('nvarchar', 100))
  ok(col('int', 4, 10), col('bigint', 8, 19)); ok(col('decimal', 9, 10, 2), col('decimal', 9, 18, 4)); ok(col('int', 4, 10), col('decimal', 9, 12, 2))
  ok(col('date', 3, 10), col('datetime2', 8, 27, 7)); ok(col('ntext', 16), col('nvarchar', -1)); ok({ ...col('nvarchar', 100), isNullable: false }, col('nvarchar', 100))
  bad(col('nvarchar', 100), col('nvarchar', 10)); bad(col('nvarchar', -1), col('nvarchar', 4000)); bad(col('nvarchar', 100), col('varchar', 200))
  bad(col('bigint', 8, 19), col('int', 4, 10)); bad(col('decimal', 9, 18, 4), col('decimal', 5, 10, 2)); bad(col('decimal', 9, 18, 2), col('decimal', 9, 18, 0))
  bad(col('datetime2', 8, 27, 7), col('date', 3, 10)); bad(col('nvarchar', 100), col('int', 4, 10)); bad(col('ntext', 16), col('nvarchar', 8000))
  bad(col('nvarchar', 100, 0, 0, 'Arabic_CI_AS'), col('nvarchar', 100, 0, 0, 'Latin1_General_CI_AS')); bad(col('varchar', 20), col('char', 20))
})

test('THROW codes must be unique across files', () => {
  const files = [
    { relative: 'a.sql', content: "IF 1=1 THROW 50020,'a',1;\n-- THROW 50099,'comment only',1;" },
    { relative: 'b.sql', content: "IF 1=1 THROW 50020,'b',1; IF 1=1 THROW 50021,'c',1;" },
    { relative: 'c.sql', content: "IF 1=1 THROW 50021,'d',1; IF 1=1 THROW 50021,'same file twice is fine',1;" },
  ]
  assert.deepEqual(migrate.throwCodes(files[0].content), [50020])
  assert.deepEqual(migrate.duplicateThrowCodes(files), [{ code: 50020, files: ['a.sql', 'b.sql'] }, { code: 50021, files: ['b.sql', 'c.sql'] }])
})

test('repository migrations: pre-payroll 001-007 then payroll 001-012 in name order, no problems, duplicate file superseded', () => {
  const files = migrate.discover()
  assert.ok(files.length >= 19)
  assert.deepEqual(files.slice(0, 19).map(file => file.version), EXPECTED_FIRST_19)
  assert.deepEqual(files.slice(0, 7).map(file => file.scope), Array(7).fill('pre-payroll'))
  assert.ok(files.slice(7).every(file => file.scope === 'payroll'))
  const payrollNames = files.slice(7).map(file => file.name)
  assert.deepEqual(payrollNames, [...payrollNames].sort())
  const analysis = migrate.analyze(files)
  assert.deepEqual(analysis.problems, [])
  assert.ok(!files.some(file => file.name === '2026-09-11_leave_balance_adjustments.sql'))
  assert.ok(fs.existsSync(path.join(apiRoot, '../docs/migrations/_superseded/2026-09-11_leave_balance_adjustments.sql')))
  const codes005 = migrate.throwCodes(files[4].content), codes006 = migrate.throwCodes(files[5].content)
  assert.deepEqual(codes005, [50020, 50021])
  assert.equal(codes006.some(code => codes005.includes(code)), false)
  // 004 يقرأ أعمدة ثم 005 يستعمل الأعمدة التي أضافها 004: ملفات منفصلة = دفعات ومعاملات منفصلة
  assert.ok(analysis.details.every(detail => detail.kind === 'cjs' || detail.batches >= 1))
})

test('target guard: company database needs --company, review and arbitrary databases are refused', () => {
  const companyDatabase = 'hr_system'
  assert.throws(() => migrate.classifyTarget('hr_system', { companyDatabase }), /--company/)
  assert.equal(migrate.classifyTarget('hr_system', { company: true, companyDatabase }), 'company')
  assert.throws(() => migrate.classifyTarget('hr_review_pre_payroll_20260911162404_52ee65ac', { companyDatabase }), /محظورة/)
  assert.throws(() => migrate.classifyTarget('master', { companyDatabase }), /غير مسموحة/)
  assert.throws(() => migrate.classifyTarget('hr_system; DROP', { companyDatabase }), /غير صالح/)
  assert.equal(migrate.classifyTarget('hr_integrity_test_0123456789abcdef', { companyDatabase }), 'disposable')
  assert.equal(migrate.classifyTarget('hr_migrate_rehearsal_20260914120000_0a1b2c3d', { companyDatabase }), 'disposable')
  assert.throws(() => migrate.classifyTarget('hr_integrity_test_0123456789abcdef', { company: true, companyDatabase }), /--company/)
  // نفس نمط حارس الإقلاع
  require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
  const { DISPOSABLE_DATABASE_PATTERN } = require('../src/auth/jwt-secret')
  assert.equal(migrate.DISPOSABLE_DATABASE.source, DISPOSABLE_DATABASE_PATTERN.source)
})

test('company mode stops before any connection when the given backup or the pre-payroll baseline file is missing', async () => {
  const missing = path.join(os.tmpdir(), `hr-missing-${crypto.randomBytes(6).toString('hex')}.bak`)
  await assert.rejects(migrate.apply({ company: true, backupPath: missing, quiet: true }), /النسخة الاحتياطية غير موجودة/)
  await assert.rejects(migrate.apply({ company: true, baselinePath: missing, quiet: true }), /نقطة الأساس قبل الرواتب مطلوبة/)
})

test('backup freshness: a backup is a rollback point only if no migration, write or server restart happened after it', () => {
  const finish = new Date('2026-09-14T11:27:33Z')
  assert.deepEqual(migrate.backupFreshnessProblems({ backupFinishDate: finish, ledgerLastAppliedAt: new Date('2026-09-14T11:20:00Z'),
    lastUserUpdate: new Date('2026-09-14T11:27:33.400Z'), serverStartedAt: new Date('2026-09-14T09:06:13Z') }), [])
  // الحالة التي وجدها المراجع: نسخة 11:27 وترحيل 12:19
  assert.match(migrate.backupFreshnessProblems({ backupFinishDate: finish, ledgerLastAppliedAt: new Date('2026-09-14T12:19:51Z'), lastUserUpdate: null,
    serverStartedAt: new Date('2026-09-14T09:06:13Z') }).join(), /أقدم من آخر ترحيل/)
  assert.match(migrate.backupFreshnessProblems({ backupFinishDate: finish, ledgerLastAppliedAt: null, lastUserUpdate: new Date('2026-09-14T11:40:00Z'),
    serverStartedAt: new Date('2026-09-14T09:06:13Z') }).join(), /كتابات على القاعدة بعد/)
  assert.match(migrate.backupFreshnessProblems({ backupFinishDate: finish, ledgerLastAppliedAt: null, lastUserUpdate: null,
    serverStartedAt: new Date('2026-09-14T12:00:00Z') }).join(), /أُعيد تشغيله/)
  assert.match(migrate.backupFreshnessProblems({ backupFinishDate: null }).join(), /غير معروف/)
})

// ---------- قاعدة مؤقتة ----------
const sql = require('../node_modules/mssql')
const database = `hr_migrate_test_${crypto.randomBytes(8).toString('hex')}`
const base = path.join(os.tmpdir(), `hr-migrate-test-${crypto.randomBytes(6).toString('hex')}`)
let master, pool, created = false
const write = (relative, content) => { fs.mkdirSync(path.dirname(path.join(base, relative)), { recursive: true }); fs.writeFileSync(path.join(base, relative), content) }
const q = async text => (await pool.request().query(text)).recordset
const ADD_LABEL = "ALTER TABLE dbo.mig_items ADD label nvarchar(60) NULL;\nGO\nUPDATE dbo.mig_items SET label = name + N'-x';\n"

before(async () => {
  assert.match(database, migrate.DISPOSABLE_DATABASE); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME || 'sa',
    password: env.DB_PASSWORD, database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 10000, requestTimeout: 300000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`)
  created = true
  pool = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME || 'sa',
    password: env.DB_PASSWORD, database, options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 10000 }).connect()
  write('20260101_001_pre_payroll_seed.sql', "-- seed\nCREATE TABLE dbo.mig_items (id int NOT NULL PRIMARY KEY, name nvarchar(50) NOT NULL);\nGO\nINSERT INTO dbo.mig_items (id, name) VALUES (1, N'أول'), (2, N'ثان');\n")
  // UPDATE يستخدم عمودًا أضيف في الدفعة السابقة: يفشل لو لم يُقسَّم الملف على GO
  write('payroll/20260102_001_t1_add_label.sql', ADD_LABEL)
  write('payroll/20260102_002_t1_broken.sql', "CREATE TABLE dbo.mig_partial (id int NOT NULL);\nGO\nIF EXISTS (SELECT 1 FROM dbo.mig_items) THROW 50901, 'intentional failure', 1;\n")
})

after(async () => {
  if (pool) await pool.close()
  if (created) await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
  if (master) await master.close()
  fs.rmSync(base, { recursive: true, force: true })
})

test('trial transaction runs every pending file then rolls everything back on failure', async () => {
  await assert.rejects(migrate.apply({ database, base, trial: true, schemaDiff: false, quiet: true }), /intentional failure/)
  const [state] = await q(`SELECT OBJECT_ID(N'dbo.mig_items') AS items, OBJECT_ID(N'dbo.mig_partial') AS partial, OBJECT_ID(N'dbo.${migrate.LEDGER}') AS ledger`)
  assert.deepEqual(state, { items: null, partial: null, ledger: null })
})

test('each file commits in its own transaction; a failing file rolls back alone and stops the run', async () => {
  const record = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.equal(record.mode, 'disposable')
  assert.deepEqual(record.applied.map(item => [path.basename(item.file), item.batches]), [['20260101_001_pre_payroll_seed.sql', 2], ['20260102_001_t1_add_label.sql', 2]])
  assert.match(record.failed.file, /20260102_002_t1_broken\.sql$/)
  assert.match(record.failed.error, /دفعة 2 من 2.*intentional failure/)
  assert.equal(record.ledgerComplete, false)
  assert.equal(record.ok, false)
  const ledger = await q(`SELECT version, scope FROM dbo.${migrate.LEDGER} ORDER BY version`)
  assert.deepEqual(ledger, [{ version: '20260101_001_pre_payroll_seed', scope: 'pre-payroll' }, { version: '20260102_001_t1_add_label', scope: 'payroll' }])
  assert.equal((await q("SELECT OBJECT_ID(N'dbo.mig_partial') AS id"))[0].id, null)
  assert.deepEqual(await q('SELECT id, label FROM dbo.mig_items ORDER BY id'), [{ id: 1, label: 'أول-x' }, { id: 2, label: 'ثان-x' }])
  const differences = Object.fromEntries(record.rowCounts.differences.map(d => [d.table, d]))
  assert.equal(differences.mig_items.kind, 'new-table')
  assert.equal(differences.mig_items.after, 2)
  // الملف الثاني مر بالفحص الفعلي على كل الصفوف القائمة قبله: صفا mig_items + صف الدفتر للملف الأول
  assert.equal(record.applied[0].guard.keyRowsChecked, 0)
  assert.equal(record.applied[1].guard.keyRowsChecked, 3)
})

test('script migrations run inside the ledger; replays skip; changed applied files and destructive new files are refused', async () => {
  fs.rmSync(path.join(base, 'payroll/20260102_002_t1_broken.sql'))
  write('payroll/20260102_002_t1_script.cjs', `module.exports = {
  description: 'script migration test',
  async up({ query, manager, log }) {
    if (!manager || !manager.queryRunner || !manager.queryRunner.isTransactionActive) throw new Error('transaction expected')
    await query("UPDATE dbo.mig_items SET label = label + N'!' WHERE id = @0", [1])
    log('updated one row')
    return { updated: 1 }
  },
}\n`)
  const planned = await migrate.plan({ database, base, schemaDiff: false })
  assert.deepEqual(planned.files.map(file => file.state), ['APPLIED', 'APPLIED', 'PENDING'])
  assert.deepEqual(planned.problems, [])
  const record = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.equal(record.applied.length, 1)
  assert.deepEqual(record.applied[0].result, { updated: 1 })
  assert.deepEqual(record.applied[0].logs, ['updated one row'])
  assert.equal(record.ledgerComplete, true)
  assert.equal(record.ok, true)
  assert.equal((await q('SELECT label FROM dbo.mig_items WHERE id = 1'))[0].label, 'أول-x!')

  const replay = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.deepEqual(replay.applied, [])
  assert.equal(replay.ledger.length, 3)

  const verified = await migrate.verify({ database, base, schemaDiff: false })
  assert.equal(verified.pendingCount, 0)

  write('payroll/20260102_003_t1_destructive.sql', 'DELETE FROM dbo.mig_items WHERE id = 2;\n')
  await assert.rejects(migrate.apply({ database, base, schemaDiff: false, quiet: true }), /DELETE ممنوع/)
  fs.rmSync(path.join(base, 'payroll/20260102_003_t1_destructive.sql'))
  write('payroll/20260102_003_t1_destructive.cjs', "module.exports = { description: 'x', async up({ manager }) { await manager.delete('mig_items', { id: 2 }) } }\n")
  await assert.rejects(migrate.apply({ database, base, schemaDiff: false, quiet: true }), /حذف صفوف عبر EntityManager/)
  fs.rmSync(path.join(base, 'payroll/20260102_003_t1_destructive.cjs'))
  assert.equal((await q('SELECT COUNT(*) AS n FROM dbo.mig_items'))[0].n, 2)

  write('payroll/20260102_001_t1_add_label.sql', 'ALTER TABLE dbo.mig_items ADD label nvarchar(60) NULL;\nGO\nUPDATE dbo.mig_items SET label = name;\n')
  await assert.rejects(migrate.apply({ database, base, schemaDiff: false, quiet: true }), /تغيّر محتواها/)
  const tampered = await migrate.plan({ database, base, schemaDiff: false })
  assert.equal(tampered.files[1].state, 'CHANGED_AFTER_APPLY')
  write('payroll/20260102_001_t1_add_label.sql', ADD_LABEL)
})

test('runtime guard: files that pass the text scan but delete, narrow, drop, disable or turn XACT_ABORT off are rolled back and not recorded', async () => {
  // ملف سليم: قيد CHECK + توسيع بتصريح + عمود جديد يُعاد تسميته — يمر ويُسجل ملخص الفحص
  write('payroll/20260102_003_t1_constraint.sql', "ALTER TABLE dbo.mig_items ADD CONSTRAINT CK_mig_items_id CHECK (id > 0);\nGO\n-- hr-migrate: allow-alter-column\nALTER TABLE dbo.mig_items ALTER COLUMN label nvarchar(120) NULL;\nGO\nEXEC sys.sp_rename N'dbo.mig_items.label', N'caption', N'COLUMN';\n")
  const good = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.equal(good.ok, true, JSON.stringify(good.failed))
  const guard = good.applied[0].guard
  assert.ok(guard.keyRowsChecked >= 2)
  assert.deepEqual(guard.widenedColumns, ['mig_items.label: nvarchar(60) → nvarchar(120)'])
  assert.deepEqual(guard.renamedColumns, ['mig_items.label → caption'])
  const ledgerBefore = await q(`SELECT version FROM dbo.${migrate.LEDGER} ORDER BY version`)
  const snapshot = async () => ({ rows: await q('SELECT id, name, caption FROM dbo.mig_items ORDER BY id'),
    columns: await q("SELECT c.name, TYPE_NAME(c.system_type_id) AS t, c.max_length AS len FROM sys.columns c WHERE c.object_id = OBJECT_ID(N'dbo.mig_items') ORDER BY c.column_id"),
    disabled: await q("SELECT name, is_disabled FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.mig_items')") })
  const state = await snapshot()

  const cases = [
    // حذف مقنّع بحروف CHAR مع إدخال صف بديل: العدد ثابت لكن المفتاح 2 اختفى
    ['payroll/20260102_004_t1_masked_delete.sql', "INSERT INTO dbo.mig_items (id, name) VALUES (3, N'ثالث');\nDECLARE @s nvarchar(200) = CONCAT(CHAR(68), CHAR(69), CHAR(76), CHAR(69), CHAR(84), CHAR(69)) + N' FROM dbo.mig_items WHERE id = 2';\nEXEC sp_executesql @s;\n", /حُذف 1 صف من dbo\.mig_items/],
    // تضييق عمود بـSQL ديناميكي لا يلتقطه الفحص النصي (القيم تتسع فلا يفشل SQL Server نفسه)
    ['payroll/20260102_004_t1_masked_narrow.sql', "DECLARE @s nvarchar(200) = N'ALTER TABLE dbo.mig_items ALTER ' + CHAR(67) + N'OLUMN name nvarchar(3) NOT NULL';\nEXEC sp_executesql @s;\n", /mig_items\.name: تقليل الطول nvarchar\(50\) → nvarchar\(3\)/],
    ['payroll/20260102_004_t1_masked_drop.sql', "DECLARE @s nvarchar(200) = N'DR' + CHAR(79) + N'P TABLE dbo.mig_items';\nEXEC sp_executesql @s;\n", /الجدول dbo\.mig_items أُسقط/],
    // سكربت .cjs يحذف عبر نص مركّب لا يظهر كنص حرفي واحد
    ['payroll/20260102_004_t1_script_delete.cjs', "'use strict'\nmodule.exports = { description: 'masked delete', async up({ query }) { await query(['DEL', 'ETE FROM dbo.mig_items WHERE id = 2'].join('')) } }\n", /حُذف 1 صف من dbo\.mig_items/],
    ['payroll/20260102_004_t1_script_nocheck.cjs', "'use strict'\nmodule.exports = { description: 'disable constraint', async up({ query }) { await query(['ALTER TABLE dbo.mig_items NOCHECK', 'CONSTRAINT CK_mig_items_id'].join(' ')) } }\n", /القيد CK_mig_items_id عُطّل/],
    // query() يمر عبر sp_executesql فيرجع SET بعده؛ batch() دفعة حقيقية تبقى إعداداتها للجلسة — هذا ما يجب أن يُكشف
    ['payroll/20260102_004_t1_script_xact.cjs', "'use strict'\nmodule.exports = { description: 'xact abort off', async up({ batch }) { await batch(['SET XACT', 'ABORT OFF'].join('_')) } }\n", /XACT_ABORT أُطفئ/],
  ]
  for (const [relative, content, expected] of cases) {
    write(relative, content)
    try {
      assert.deepEqual(migrate.analyze(migrate.discover(base)).problems, [], relative)
      const record = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
      assert.equal(record.ok, false, relative)
      assert.match(record.failed.error, expected, relative)
      assert.deepEqual(await q(`SELECT version FROM dbo.${migrate.LEDGER} ORDER BY version`), ledgerBefore, relative)
      assert.deepEqual(await snapshot(), state, relative)
      // البروفة (معاملة واحدة لكل المعلق) ترفض بنفس السبب قبل أي تغيير
      await assert.rejects(migrate.apply({ database, base, schemaDiff: false, quiet: true, trial: true }), expected)
      assert.deepEqual(await snapshot(), state, relative)
    } finally { fs.rmSync(path.join(base, relative), { force: true }) }
  }
})

test('freeze backup: a new COPY_ONLY CHECKSUM backup is copied outside the volume, verified, and becomes stale after the next write', async () => {
  const hostDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-freeze-test-'))
  let backup
  try {
    backup = await migrate.takeCompanyBackup(master, database, { hostDir, label: 'freeze' })
    assert.equal(backup.databaseName, database)
    assert.equal(backup.verifyOnly, 'passed'); assert.equal(backup.checksums, true); assert.equal(backup.copyOnly, true); assert.equal(backup.staged, false)
    assert.ok(fs.existsSync(backup.hostPath)); assert.equal(migrate.fileSha256(backup.hostPath), backup.sha256)
    const state = await migrate.databaseWriteState(master, database)
    assert.deepEqual(migrate.backupFreshnessProblems({ backupFinishDate: backup.backupFinishDate, ...state }), [])
    await new Promise(resolve => setTimeout(resolve, 2100))
    await pool.request().query('UPDATE dbo.mig_items SET caption = caption WHERE id = 1')
    const later = await migrate.databaseWriteState(master, database)
    assert.match(migrate.backupFreshnessProblems({ backupFinishDate: backup.backupFinishDate, ...later }).join(), /كتابات على القاعدة بعد/)
  } finally {
    if (backup?.sqlPath) { try { migrate.docker(['exec', '-u', '0', migrate.SQL_CONTAINER, 'rm', '-f', backup.sqlPath]) } catch { /* ملف اختبار */ } }
    fs.rmSync(hostDir, { recursive: true, force: true })
  }
})
