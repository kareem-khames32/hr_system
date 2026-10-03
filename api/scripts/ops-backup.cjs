'use strict'
// B1.13 — النسخ الاحتياطي (من api/). المالك بيشغّله على السيرفر بـ«Task Scheduler» — الخطوات في docs/ops/backup-restore.md.
//
//   node scripts/ops-backup.cjs
//     نسخة كاملة COPY_ONLY+CHECKSUM لقاعدة الشركة (DB_DATABASE في api/.env)، متحقق منها (HEADERONLY + VERIFYONLY + بصمة sha256)، في HR_BACKUP_DIR.
//     ونسخة منها في HR_BACKUP_OFFSITE (مكان برّه السيرفر: فولدر شبكة أو هارد خارجي) ببصمة مطابقة،
//     والمرفوعات (UPLOADS_ROOT أو api/uploads) لـ HR_BACKUP_OFFSITE/uploads: الجديد والمتغير بس، ومن غير حذف أي حاجة.
//   --log        نسخة log (القاعدة لازم تكون على FULL، ومعاها نسخة أساس). غير كده رسالة بتشرح ومفيش فشل.
//   --log-base   نسخة كاملة عادية (مش COPY_ONLY) تبدأ سلسلة الـlog — مرة واحدة بعد تحويل القاعدة FULL.
//   --keep-days N  بيمسح نسخ «daily» و«log» الأقدم من N يوم من HR_BACKUP_DIR بس، باسمها بالظبط (الافتراضي: مايمسحش حاجة).
//   --dir / --offsite / --uploads  بدل الإعدادات.  --database hr_<اسم>_test_<16 hex>  تجربة على قاعدة مؤقتة بس.
//
// الإعدادات من البيئة أو من api/.env: HR_BACKUP_DIR، HR_BACKUP_OFFSITE، UPLOADS_ROOT، وزي المُرحّل HR_SQL_NATIVE وHR_SQL_BACKUP_DIR.
// الملخص JSON في الآخر من غير أسرار، وexit code 1 لو أي خطوة فشلت.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto')

const apiRoot = path.resolve(__dirname, '..')
const SETTING_KEYS = ['HR_SQL_NATIVE', 'HR_SQL_BACKUP_DIR', 'HR_SQL_CONTAINER', 'HR_BACKUP_DIR', 'HR_BACKUP_OFFSITE', 'UPLOADS_ROOT']

// إعدادات الأدوات من api/.env لو مش في البيئة (Task Scheduler مابيشيلش متغيرات update-from-git.ps1) — قبل تحميل المُرحّل
function loadSettings() {
  let file = {}
  try { file = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env'))) } catch { file = {} }
  for (const key of SETTING_KEYS) if (process.env[key] === undefined && file[key] !== undefined) process.env[key] = file[key]
}
loadSettings()
const migrate = require('./db-migrate.cjs')

const stamp = () => new Date().toISOString().replace(/\D/g, '').slice(0, 14)
const quote = name => `[${String(name).replace(/]/g, ']]')}]`
const sqlJoin = (dir, name) => dir.replace(/[\\/]+$/, '') + (dir.includes('/') ? '/' : '\\') + name
const samePath = (a, b) => path.resolve(String(a)).toLowerCase() === path.resolve(String(b)).toLowerCase()
const backupName = (database, label) => new RegExp(`^${database.replace(/[^A-Za-z0-9_]/g, '')}_${label}_\\d{14}_[a-f0-9]{8}\\.(?:bak|trn)$`)

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--log') out.log = true
    else if (arg === '--log-base') out.logBase = true
    else if (['--database', '--dir', '--offsite', '--uploads', '--keep-days'].includes(arg)) {
      if (argv[i + 1] === undefined) throw new Error(`${arg} محتاج قيمة`)
      out[arg.slice(2).replace('-d', 'D')] = argv[++i]
    } else throw new Error(`اختيار مش معروف: ${arg}`)
  }
  return out
}

/** الإعدادات النهائية — القاعدة: الشركة (api/.env) أو قاعدة مؤقتة hr_*_test_<16 hex> بس */
function resolveOptions(options = {}) {
  const { env } = migrate.runtime()
  const company = env.DB_DATABASE
  const database = options.database || company
  if (database !== company && !migrate.DISPOSABLE_DATABASE.test(database)) {
    throw new Error(`القاعدة ${database} مش قاعدة الشركة (${company}) ولا قاعدة تجربة مؤقتة hr_<اسم>_test_<16 hex>`)
  }
  const dir = options.dir || process.env.HR_BACKUP_DIR || path.resolve(apiRoot, '..', '..', 'hr_system_backups', 'daily')
  const offsite = options.offsite || process.env.HR_BACKUP_OFFSITE || null
  const uploads = options.uploads || process.env.UPLOADS_ROOT || path.join(apiRoot, 'uploads')
  const keepDays = options.keepDays == null ? null : Number(options.keepDays)
  if (keepDays !== null && (!Number.isInteger(keepDays) || keepDays < 1)) throw new Error('--keep-days رقم صحيح من 1')
  if (offsite && samePath(offsite, dir)) throw new Error('HR_BACKUP_OFFSITE لازم يبقى مكان تاني غير HR_BACKUP_DIR (برّه السيرفر)')
  return { env, database, dir, offsite, uploads, keepDays }
}

async function sqlBackupDir(master) {
  if (process.env.HR_SQL_BACKUP_DIR) return process.env.HR_SQL_BACKUP_DIR
  return (await master.request().query("SELECT CAST(SERVERPROPERTY('InstanceDefaultBackupPath') AS nvarchar(400)) AS dir")).recordset[0].dir || '/var/opt/mssql/data'
}

/** نسخة الملف لمكان برّه السيرفر، وبصمتها لازم تطابق */
function copyOffsite(file, offsiteDir) {
  fs.mkdirSync(offsiteDir, { recursive: true })
  const target = path.join(offsiteDir, path.basename(file))
  fs.copyFileSync(file, target)
  const sha256 = migrate.fileSha256(target)
  if (sha256 !== migrate.fileSha256(file)) throw new Error(`بصمة النسخة في ${offsiteDir} مش مطابقة للأصل`)
  return { file: target.split(path.sep).join('/'), sha256 }
}

/** المرفوعات: الجديد والمتغير (الحجم أو التاريخ) بيتنسخ بتاريخه، ومفيش حذف من الوجهة أبدًا */
function copyNewer(source, target) {
  const result = { copied: 0, skipped: 0, bytes: 0, missingSource: false }
  if (!fs.existsSync(source)) { result.missingSource = true; return result }
  const walk = (from, to) => {
    fs.mkdirSync(to, { recursive: true })
    for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
      const src = path.join(from, entry.name), dst = path.join(to, entry.name)
      if (entry.isDirectory()) { walk(src, dst); continue }
      if (!entry.isFile()) continue
      const stat = fs.statSync(src)
      const existing = fs.existsSync(dst) ? fs.statSync(dst) : null
      if (existing && existing.size === stat.size && Math.abs(existing.mtimeMs - stat.mtimeMs) < 2000) { result.skipped++; continue }
      fs.copyFileSync(src, dst)
      fs.utimesSync(dst, stat.atime, stat.mtime)
      result.copied++; result.bytes += stat.size
    }
  }
  walk(source, target)
  return result
}

/** مسح نسخ daily/log الأقدم من N يوم من مجلد النسخ المحلي بس — بالاسم اللي السكربت ده بيكتبه بالظبط */
function pruneOld(dir, database, keepDays, now = Date.now()) {
  const removed = []
  const patterns = [backupName(database, 'daily'), backupName(database, 'log')]
  for (const folder of [dir, path.join(dir, 'log')]) {
    if (!fs.existsSync(folder)) continue
    for (const name of fs.readdirSync(folder)) {
      if (!patterns.some(pattern => pattern.test(name))) continue
      const file = path.join(folder, name)
      if (now - fs.statSync(file).mtimeMs > keepDays * 86_400_000) { fs.rmSync(file, { force: true }); removed.push(name) }
    }
  }
  return removed
}

async function recoveryModel(master, database) {
  const rows = (await master.request().input('d', database).query('SELECT recovery_model_desc AS model FROM sys.databases WHERE name = @d')).recordset
  if (!rows.length) throw new Error(`القاعدة ${database} مش موجودة`)
  return rows[0].model
}

/** نسخة log (أو أساس السلسلة): بتتكتب في مجلد SQL Server، بتتحقق، بتتنقل لـ HR_BACKUP_DIR/log، وبتتمسح من مجلد SQL Server */
async function logBackup(master, options, { base = false } = {}) {
  const model = await recoveryModel(master, options.database)
  if (model !== 'FULL') {
    return { status: 'SKIPPED', recoveryModel: model,
      message: `القاعدة على ${model}: نسخ الـlog مش ممكن. النسخة الكاملة اليومية كفاية للرجوع لآخر نسخة؛ للرجوع لأي لحظة لازم تتحول FULL (قرار المالك — docs/ops/backup-restore.md)` }
  }
  const label = base ? 'logbase' : 'log'
  const name = `${options.database}_${label}_${stamp()}_${crypto.randomBytes(4).toString('hex')}.${base ? 'bak' : 'trn'}`
  const sqlPath = sqlJoin(await sqlBackupDir(master), name)
  const statement = base ? `BACKUP DATABASE ${quote(options.database)} TO DISK = @p WITH CHECKSUM, INIT, FORMAT`
    : `BACKUP LOG ${quote(options.database)} TO DISK = @p WITH CHECKSUM, INIT, FORMAT`
  try {
    await master.request().input('p', sqlPath).query(statement)
  } catch (error) {
    // الرسالة اللي بتشرح (4214) في precedingErrors، والأخيرة «terminating abnormally» بس
    const all = [error, ...(Array.isArray(error?.precedingErrors) ? error.precedingErrors : [])]
    if (!base && all.some(item => Number(item?.number) === 4214 || /no current database backup/i.test(String(item?.message)))) {
      throw new Error('القاعدة على FULL ومافيش نسخة أساس للـlog: شغّل مرة واحدة node scripts/ops-backup.cjs --log-base')
    }
    throw error
  }
  await master.request().input('p', sqlPath).query('RESTORE VERIFYONLY FROM DISK = @p WITH CHECKSUM')
  const folder = path.join(options.dir, 'log')
  fs.mkdirSync(folder, { recursive: true })
  const hostPath = path.join(folder, name)
  migrate.sqlGetFile(sqlPath, hostPath)
  if (!samePath(hostPath, sqlPath)) migrate.sqlRemoveFile(sqlPath)
  const result = { status: 'DONE', recoveryModel: model, kind: base ? 'LOG_BASE' : 'LOG', file: hostPath.split(path.sep).join('/'), sizeBytes: fs.statSync(hostPath).size,
    sha256: migrate.fileSha256(hostPath) }
  if (options.offsite) result.offsite = copyOffsite(hostPath, path.join(options.offsite, 'log'))
  return result
}

/** النسخة الكاملة اليومية + برّه السيرفر + المرفوعات */
async function backup(options = {}) {
  const settings = resolveOptions(options)
  const master = await migrate.masterPool(settings.env)
  try {
    if (options.log || options.logBase) return { database: settings.database, log: await logBackup(master, settings, { base: !!options.logBase }) }
    const taken = await migrate.takeCompanyBackup(master, settings.database, { hostDir: settings.dir, label: 'daily' })
    // النسخة في مجلد SQL Server (غير ملف الجهاز) بتتمسح بعد التحقق عشان المساحة
    if (!samePath(taken.hostPath, taken.sqlPath)) migrate.sqlRemoveFile(taken.sqlPath)
    const result = { database: settings.database, full: { file: taken.hostPath, sizeBytes: taken.sizeBytes, sha256: taken.sha256, checksums: taken.checksums,
      copyOnly: taken.copyOnly, verifyOnly: taken.verifyOnly, finishedAt: taken.backupFinishDate } }
    if (settings.offsite) {
      result.offsite = copyOffsite(taken.hostPath, settings.offsite)
      result.uploads = { source: settings.uploads.split(path.sep).join('/'), ...copyNewer(settings.uploads, path.join(settings.offsite, 'uploads')) }
    } else {
      result.offsite = null
      result.warning = 'HR_BACKUP_OFFSITE مش متظبط: النسخة على نفس السيرفر بس، والمرفوعات ماتنسختش'
    }
    if (settings.keepDays) result.removedOld = pruneOld(settings.dir, settings.database, settings.keepDays)
    return result
  } finally {
    await master.close()
  }
}

module.exports = { backup, copyNewer, pruneOld, parseArgs, resolveOptions }

if (require.main === module) {
  backup(parseArgs(process.argv.slice(2)))
    .then(result => { console.log(JSON.stringify(result, null, 2)); if (result.warning) console.warn('تحذير: ' + result.warning) })
    .catch(error => {
      const { env } = migrate.runtime()
      const message = String(error && error.message || error)
      console.error('ERROR: ' + (env?.DB_PASSWORD ? message.split(env.DB_PASSWORD).join('***') : message))
      process.exitCode = 1
    })
}
