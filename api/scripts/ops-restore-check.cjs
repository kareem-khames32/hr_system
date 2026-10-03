'use strict'
// B1.13 — تجربة استرجاع نسخة احتياطية (من api/). مابيلمسش قاعدة الشركة: بيرجّع النسخة على قاعدة تجربة باسم مؤقت
// (hr_migrate_rehearsal_<وقت>_<8 hex>)، بيفحصها، وبيمسحها في الآخر. الخطوات في docs/ops/backup-restore.md.
//
//   node scripts/ops-restore-check.cjs                آخر نسخة «daily» لقاعدة الشركة في HR_BACKUP_DIR
//   --file <مسار .bak>   نسخة بعينها (لازم تكون نسخة كاملة لقاعدة الشركة)
//   --dir <مجلد>         بدل HR_BACKUP_DIR
//   --keep               ماتمسحش قاعدة التجربة (عشان تفتحها وتراجعها بإيدك — امسحها بعدين)
//   --database hr_<اسم>_test_<16 hex>   تجربة على نسخة قاعدة مؤقتة بس
//
// الفحص: HEADERONLY + VERIFYONLY (CHECKSUM)، الاسترجاع، DBCC CHECKDB، عدد الجداول والصفوف، سجل الترحيلات، وجداول أساسية.
// الملخص JSON في الآخر، وexit code 1 لو أي خطوة فشلت.
const fs = require('node:fs'), path = require('node:path')
const ops = require('./ops-backup.cjs')
const migrate = require('./db-migrate.cjs')

const KEY_TABLES = ['employees', 'users', 'branches', 'payroll_runs', 'payroll_items', 'requests', 'attendance_records']

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--keep') out.keep = true
    else if (['--file', '--dir', '--database'].includes(arg)) {
      if (argv[i + 1] === undefined) throw new Error(`${arg} محتاج قيمة`)
      out[arg.slice(2)] = argv[++i]
    } else throw new Error(`اختيار مش معروف: ${arg}`)
  }
  return out
}

/** آخر نسخة «daily» للقاعدة في المجلد (الأحدث بوقتها في الاسم) */
function latestDaily(dir, database) {
  const pattern = new RegExp(`^${database}_daily_(\\d{14})_[a-f0-9]{8}\\.bak$`)
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(name => pattern.test(name)).sort() : []
  if (!files.length) throw new Error(`مفيش نسخة «daily» لقاعدة ${database} في ${dir} — شغّل ops-backup.cjs الأول`)
  return path.join(dir, files[files.length - 1])
}

const quote = name => `[${String(name).replace(/]/g, ']]')}]`

async function inspect(master, database) {
  const db = quote(database)
  // DBCC CHECKDB: أي عطب بيرمي خطأ فالفحص بيفشل
  await master.request().query(`DBCC CHECKDB(${db}) WITH NO_INFOMSGS, ALL_ERRORMSGS`)
  const [shape] = (await master.request().query(`SELECT (SELECT COUNT(*) FROM ${db}.sys.tables WHERE is_ms_shipped = 0) AS [tables],
      (SELECT ISNULL(SUM(p.[rows]), 0) FROM ${db}.sys.partitions p JOIN ${db}.sys.tables t ON t.object_id = p.object_id
        WHERE p.index_id IN (0, 1) AND t.is_ms_shipped = 0) AS [rows]`)).recordset
  const present = new Set((await master.request().query(`SELECT name FROM ${db}.sys.tables WHERE is_ms_shipped = 0`)).recordset.map(row => row.name))
  const tables = {}
  for (const name of KEY_TABLES) {
    if (present.has(name)) tables[name] = Number((await master.request().query(`SELECT COUNT_BIG(*) AS n FROM ${db}.dbo.${quote(name)}`)).recordset[0].n)
  }
  let migrations = null
  if (present.has(migrate.LEDGER)) {
    const [ledger] = (await master.request().query(`SELECT COUNT(*) AS [applied], MAX([appliedAt]) AS [lastAppliedAt] FROM ${db}.dbo.${quote(migrate.LEDGER)}`)).recordset
    migrations = { applied: Number(ledger.applied), lastAppliedAt: ledger.lastAppliedAt }
  }
  return { checkDb: 'passed', tables: Number(shape.tables), rows: Number(shape.rows), keyTables: tables, migrations }
}

async function restoreCheck(options = {}) {
  const settings = ops.resolveOptions({ database: options.database, dir: options.dir })
  const file = options.file ? path.resolve(options.file) : latestDaily(settings.dir, settings.database)
  const master = await migrate.masterPool(settings.env)
  const target = migrate.rehearsalName()
  let verified = null, restored = false
  try {
    // النسخة المتاحة لـSQL Server بتفضل لحد الاسترجاع (وبتتمسح في الآخر لو اتنسخت مؤقتًا)
    process.env.HR_KEEP_STAGED_BACKUP = '1'
    try { verified = await migrate.verifyCompanyBackup(master, settings.database, file) } finally { delete process.env.HR_KEEP_STAGED_BACKUP }
    await migrate.restoreCopy(master, verified.sqlPath, target)
    restored = true
    const checks = await inspect(master, target)
    return { source: settings.database, file: file.split(path.sep).join('/'), sha256: verified.sha256, backupFinishedAt: verified.backupFinishDate,
      restoredAs: target, kept: !!options.keep, ...checks }
  } finally {
    try { if (restored && !options.keep) await migrate.dropCopy(master, target) } finally {
      if (verified?.staged) migrate.sqlRemoveFile(verified.sqlPath)
      await master.close()
    }
  }
}

module.exports = { restoreCheck, latestDaily, inspect, parseArgs }

if (require.main === module) {
  restoreCheck(parseArgs(process.argv.slice(2)))
    .then(result => console.log(JSON.stringify(result, null, 2)))
    .catch(error => {
      const { env } = migrate.runtime()
      const message = String(error && error.message || error)
      console.error('ERROR: ' + (env?.DB_PASSWORD ? message.split(env.DB_PASSWORD).join('***') : message))
      process.exitCode = 1
    })
}
