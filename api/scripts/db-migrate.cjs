'use strict'
// ===== المُرحّل المجمّع لقاعدة الشركة (hr_system) وقواعد الاختبار المؤقتة =====
// الأوامر والشرح الكامل: docs/migrations/README.md
//   node api/scripts/db-migrate.cjs plan    [--database <اسم>]                         قراءة فقط
//   node api/scripts/db-migrate.cjs rehearse [--from live|baseline] [--keep]           بروفة على نسخة مستعادة
//   node api/scripts/db-migrate.cjs apply   --company [--backup <ملف>] [--allow-live-api]  تطبيق على hr_system
//   node api/scripts/db-migrate.cjs verify  [--database <اسم>]                         قراءة فقط: الدفتر كامل والفرق = 0
// القواعد: ملفات docs/migrations/*.sql (ما قبل الرواتب) ثم docs/migrations/payroll/*.sql|*.cjs بترتيب الاسم،
// كل ملف في معاملة واحدة ودفعات مفصولة بسطر GO، دفتر واحد dbo.app_schema_migrations، ولا حذف/إسقاط.
// الحراسة طبقتان: فحص نصي قبل أي اتصال (SQL وسكربتات .cjs)، وفحص فعلي داخل معاملة كل ملف قبل الالتزام
// (جداول وأعمدة لم تُسقط، أنواع لم تُقتطع، صفوف قائمة لم تُحذف، مشغلات وقيود لم تُعطّل، XACT_ABORT لم يُطفأ).
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const crypto = require('node:crypto')
const net = require('node:net')
const { execFileSync } = require('node:child_process')

const apiRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(apiRoot, '..')
const DEFAULT_BASE = path.join(repoRoot, 'docs', 'migrations')
const LEDGER = 'app_schema_migrations'
const APP_NAME = 'HR Consolidated Migrator'
// نقطة الأساس قبل الرواتب (القاعدة 1): يجب أن تبقى موجودة ومتحقق منها، لكنها ليست نقطة رجوع لما بعدها
const COMPANY_BACKUP = process.env.HR_COMPANY_BACKUP || 'D:/projects/hr_system_backups/pre-payroll-2026-09-14/hr_system_pre_payroll_20260914.bak'
// نسخ لحظة التجميد تُنسخ لهذا المجلد على الجهاز (خارج volume الحاوية hr_sql_data)
const FREEZE_BACKUP_DIR = process.env.HR_FREEZE_BACKUP_DIR || 'D:/projects/hr_system_backups/freeze'
const SQL_CONTAINER = process.env.HR_SQL_CONTAINER || 'hr-sqlserver'
const FILE_NAME = /^\d{8}_\d{3}_[a-z0-9_]+\.(sql|cjs)$/
// نفس نمط api/src/auth/jwt-secret.ts (الاختبار يتأكد من التطابق) + اسم البروفة
const DISPOSABLE_DATABASE = /^hr_[a-z0-9]+(?:_[a-z0-9]+)*_(?:test|race)_[a-f0-9]{16}$/
const REHEARSAL_DATABASE = /^hr_migrate_rehearsal_\d{14}_[a-f0-9]{8}$/
// ALTER COLUMN مسموح فقط بتصريح صريح في الملف؛ والفحص الفعلي يرفض أي تضييق أو تغيير نوع غير حافظ للقيم
const ALLOW_ALTER_COLUMN = /^\s*--\s*hr-migrate:\s*allow-alter-column\b/im

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex')
const normalize = raw => raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')
const utcStamp = () => new Date().toISOString().replace(/\D/g, '').slice(0, 14)
const quoteName = name => `[${String(name).replace(/]/g, ']]')}]`

// ---------- التحليل النصي (بلا قاعدة بيانات) ----------

// يمسح التعليقات ويحافظ على النصوص الحرفية والمعرفات بين أقواس (فيها قد يكون SQL ديناميكي)
function stripComments(sql) {
  let out = '', i = 0
  while (i < sql.length) {
    const two = sql.slice(i, i + 2)
    if (two === '--') { const end = sql.indexOf('\n', i); i = end < 0 ? sql.length : end; out += ' '; continue }
    if (two === '/*') {
      let depth = 1; i += 2
      while (i < sql.length && depth) {
        if (sql.slice(i, i + 2) === '/*') { depth++; i += 2 } else if (sql.slice(i, i + 2) === '*/') { depth--; i += 2 } else i++
      }
      out += ' '; continue
    }
    if (sql[i] === "'") {
      let j = i + 1
      while (j < sql.length) { if (sql[j] === "'" && sql[j + 1] === "'") j += 2; else if (sql[j] === "'") break; else j++ }
      out += sql.slice(i, j + 1); i = j + 1; continue
    }
    if (sql[i] === '[') { const end = sql.indexOf(']', i); const stop = end < 0 ? sql.length : end + 1; out += sql.slice(i, stop); i = stop; continue }
    out += sql[i]; i++
  }
  return out
}

// يقسم على سطر GO المستقل خارج النصوص والتعليقات؛ الدفعات الفارغة تُتجاهل
function splitBatches(sql) {
  const batches = []
  let current = [], inString = false, commentDepth = 0
  for (const line of normalize(sql).split('\n')) {
    if (!inString && commentDepth === 0 && /^\s*GO\s*(?:--.*)?$/i.test(line)) { batches.push(current.join('\n')); current = []; continue }
    current.push(line)
    for (let i = 0; i < line.length; i++) {
      const two = line.slice(i, i + 2)
      if (inString) { if (line[i] === "'" && line[i + 1] === "'") i++; else if (line[i] === "'") inString = false; continue }
      if (commentDepth) { if (two === '/*') { commentDepth++; i++ } else if (two === '*/') { commentDepth--; i++ } continue }
      if (two === '--') break
      if (two === '/*') { commentDepth++; i++; continue }
      if (line[i] === "'") inString = true
    }
  }
  batches.push(current.join('\n'))
  return batches.filter(batch => stripComments(batch).trim().length)
}

// ملفات الرواتب 001-012 كُتبت لمُرحّل الرواتب القديم الذي ينفذ كل جملة وحدها (بلا GO):
// 009 مثلًا يضيف عمودًا ثم ينشئ فهرسًا مفلترًا عليه، ودفعة واحدة تفشل وقت الترجمة.
// نحافظ على نفس الدلالة لهذه الملفات بالاسم فقط؛ أي ملف جديد يفصل دفعاته بسطر GO.
const LEGACY_STATEMENT_FILES = new Set([
  '20260912_001_settlement_payroll_boundary', '20260912_002_membership_claims_events', '20260912_003_attendance_exemptions',
  '20260913_004_attendance_flex_history', '20260913_005_overtime_workflow', '20260913_006_payroll_policy_drafts',
  '20260913_007_payroll_policy_settings', '20260913_008_payroll_policy_definitions', '20260913_009_loan_installment_ledger',
  '20260913_010_payroll_collection_policy', '20260913_011_payroll_salary_history', '20260914_012_payroll_salary_reference_period',
])

// يقسم على ; في المستوى الأعلى خارج النصوص والمعرفات والتعليقات والأقواس
function splitStatements(sql) {
  const text = normalize(sql), statements = []
  let start = 0, depth = 0, i = 0
  while (i < text.length) {
    const ch = text[i], two = text.slice(i, i + 2)
    if (two === '--') { const end = text.indexOf('\n', i); i = end < 0 ? text.length : end; continue }
    if (two === '/*') { const end = text.indexOf('*/', i + 2); i = end < 0 ? text.length : end + 2; continue }
    if (ch === "'") { i++; while (i < text.length) { if (text[i] === "'" && text[i + 1] === "'") i += 2; else if (text[i] === "'") { i++; break } else i++ } continue }
    if (ch === '[' || ch === '"') { const close = ch === '[' ? ']' : '"'; const end = text.indexOf(close, i + 1); i = end < 0 ? text.length : end + 1; continue }
    if (ch === '(') depth++
    else if (ch === ')') depth--
    else if (ch === ';' && depth === 0) { statements.push(text.slice(start, i + 1)); start = i + 1 }
    i++
  }
  statements.push(text.slice(start))
  return statements.filter(statement => stripComments(statement).replace(/;/g, '').trim().length)
}

function executionUnits(file) {
  return LEGACY_STATEMENT_FILES.has(file.version) && file.scope === 'payroll' ? splitStatements(file.content) : splitBatches(file.content)
}

// الترحيلات إضافية أو حافظة للقيم فقط؛ المُرحّل نفسه يدير المعاملة والقفل.
// النص يُفحص مرتين: كما هو، وبعد دمج النصوص الحرفية المتجاورة ('DEL' + N'ETE') لكشف SQL ديناميكي مقسّم.
const FORBIDDEN = [
  [/\bDROP\s+COLUMN\b/i, 'DROP COLUMN ممنوع'],
  [/\bTRUNCATE\s+TABLE\b/i, 'TRUNCATE TABLE ممنوع'],
  [/(?<!\bON\s{1,20})\bDELETE\b(?!\s+(?:FROM\s+)?[#@])/i, 'DELETE ممنوع (لا حذف لصفوف الشركة؛ عطّل الصف أو غيّر حالته)'],
  [/\bDROP\s+(?:DATABASE|SCHEMA|VIEW|PROC|PROCEDURE|FUNCTION|TRIGGER|USER|LOGIN|SEQUENCE|TYPE|SYNONYM|ROLE|ASSEMBLY|PARTITION)\b/i, 'DROP لكائن قاعدة ممنوع'],
  [/\bALTER\s+DATABASE\b/i, 'ALTER DATABASE ممنوع'],
  [/^\s*USE\s+[[\w]/im, 'USE ممنوع (الترحيل يعمل على القاعدة المختارة فقط)'],
  [/\bBEGIN\s+(?:DISTRIBUTED\s+)?TRAN(?:SACTION)?\b/i, 'BEGIN TRANSACTION ممنوع (المُرحّل يفتح معاملة لكل ملف)'],
  [/\b(?:COMMIT|ROLLBACK)\b/i, 'COMMIT/ROLLBACK ممنوع (المُرحّل يدير المعاملة)'],
  [/\b(?:BACKUP|RESTORE)\s+(?:DATABASE|LOG)\b/i, 'BACKUP/RESTORE ممنوع داخل ترحيل'],
  [/\b(?:xp_\w+|sp_configure|OPENROWSET|OPENDATASOURCE|OPENQUERY|sp_addlinkedserver)\b/i, 'أوامر الخادم ممنوعة'],
  [/\bSET\s+XACT_ABORT\s+OFF\b/i, 'SET XACT_ABORT OFF ممنوع (المُرحّل يفرض XACT_ABORT ON)'],
  [/\bSET\s+ANSI_WARNINGS\s+OFF\b/i, 'SET ANSI_WARNINGS OFF ممنوع (يسمح باقتطاع القيم بصمت)'],
  [/\bDISABLE\s+TRIGGER\b/i, 'DISABLE TRIGGER ممنوع'],
  [/\bNOCHECK\s+CONSTRAINT\b/i, 'تعطيل القيود (NOCHECK CONSTRAINT) ممنوع'],
  [/\bALTER\s+INDEX\b[^;]*?\bDISABLE\b/i, 'تعطيل فهرس ممنوع (قد يوقف قراءة الجدول)'],
  [/\bALTER\s+TABLE\b[^;]*?\bSWITCH\b/i, 'ALTER TABLE ... SWITCH ممنوع (ينقل الصفوف خارج الجدول)'],
  [/\b(?:DBCC|SHUTDOWN|RECONFIGURE)\b|\bKILL\s+\d/i, 'أوامر الخادم ممنوعة'],
  [/\bALTER\s+SCHEMA\s+\S+\s+TRANSFER\b/i, 'نقل جدول بين المخططات ممنوع'],
  [/\bsp_rename\b(?![^;]*?N?'(?:COLUMN|INDEX|STATISTICS)')/i, 'sp_rename مسموح لعمود أو فهرس فقط (لا إعادة تسمية جداول)'],
]

// 'DEL' + N'ETE' → 'DELETE': نص حرفي مقسّم يُدمج قبل الفحص
function foldLiteralConcatenation(text) { return text.replace(/'\s*\+\s*N?'/gi, '') }

// كل الجداول الدائمة في DROP TABLE a, b / DROP TABLE IF EXISTS a, b (المؤقتة # مسموحة)
function droppedPermanentTables(text) {
  const found = []
  const re = /\bDROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?/gi
  const identifier = /^(?:(?:\[[^\]]*\]|"[^"]*"|[#\w@$]+)\s*\.\s*)*(?:\[[^\]]*\]|"[^"]*"|[#\w@$]+)/
  let match
  while ((match = re.exec(text))) {
    let i = re.lastIndex
    for (;;) {
      while (/\s/.test(text[i] || '')) i++
      const id = identifier.exec(text.slice(i))
      if (!id) break
      const last = id[0].split('.').pop().trim().replace(/^[["]|[\]"]$/g, '')
      if (!last.startsWith('#')) found.push(id[0])
      i += id[0].length
      while (/\s/.test(text[i] || '')) i++
      if (text[i] !== ',') break
      i++
    }
  }
  return found
}

function forbiddenStatements(sql) {
  const raw = normalize(String(sql))
  const stripped = stripComments(raw)
  const messages = new Set()
  for (const text of [stripped, foldLiteralConcatenation(stripped)]) {
    for (const [pattern, message] of FORBIDDEN) if (pattern.test(text)) messages.add(message)
    if (droppedPermanentTables(text).length) messages.add('DROP TABLE ممنوع (مسموح لجدول مؤقت #فقط)')
    if (/\bALTER\s+COLUMN\b/i.test(text) && !ALLOW_ALTER_COLUMN.test(raw)) {
      messages.add('ALTER COLUMN ممنوع بلا تصريح "-- hr-migrate: allow-alter-column" (والفحص الفعلي يرفض أي تضييق أو تغيير نوع غير حافظ للقيم)')
    }
  }
  return [...messages]
}

// ---------- فحص سكربتات .cjs نصيًا ----------

// يمسح تعليقات JavaScript ويحفظ النصوص؛ ويجمع محتوى النصوص الحرفية (مع دمج 'a' + "b")
function scanJavaScript(source) {
  const text = normalize(String(source))
  let code = '', i = 0
  const literals = []
  let lastLiteralEnd = -1
  const pushLiteral = (value, endInCode) => {
    const between = lastLiteralEnd >= 0 ? code.slice(lastLiteralEnd, endInCode.start) : null
    if (between !== null && /^\s*\+\s*$/.test(between) && literals.length) literals[literals.length - 1] += value
    else literals.push(value)
    lastLiteralEnd = endInCode.end
  }
  while (i < text.length) {
    const two = text.slice(i, i + 2)
    if (two === '//') { const end = text.indexOf('\n', i); i = end < 0 ? text.length : end; code += ' '; continue }
    if (two === '/*') { const end = text.indexOf('*/', i + 2); i = end < 0 ? text.length : end + 2; code += ' '; continue }
    const ch = text[i]
    if (ch === "'" || ch === '"' || ch === '`') {
      let j = i + 1, value = '', depth = 0
      while (j < text.length) {
        if (text[j] === '\\') { value += text[j + 1] ?? ''; j += 2; continue }
        if (ch === '`' && text[j] === '$' && text[j + 1] === '{') { depth++; value += ' '; j += 2; continue }
        if (depth) { if (text[j] === '{') depth++; else if (text[j] === '}') depth--; j++; continue }
        if (text[j] === ch) break
        value += text[j]; j++
      }
      const start = code.length
      code += text.slice(i, j + 1)
      pushLiteral(value, { start, end: code.length })
      i = j + 1
      continue
    }
    code += ch; i++
  }
  return { code, literals }
}

const SCRIPT_FORBIDDEN = [
  [/\b(?:manager|em|entityManager|queryRunner|qr|repo|repository)\s*\.\s*(?:delete|remove|softDelete|softRemove|clear|restore)\s*\(/, 'حذف صفوف عبر EntityManager/Repository ممنوع'],
  [/\bgetRepository\s*\([^)]*\)\s*\.\s*(?:delete|remove|softDelete|softRemove|clear)\s*\(/, 'حذف صفوف عبر Repository ممنوع'],
  [/\.\s*(?:delete|softDelete)\s*\(\s*\)/, 'QueryBuilder.delete() ممنوع'],
  [/\b(?:dropTable|dropColumns?|dropForeignKeys?|dropIndex|dropIndices|dropPrimaryKey|dropUniqueConstraints?|dropCheckConstraints?|dropExclusionConstraints?|clearTable|clearDatabase|dropDatabase|dropSchema|dropView|renameTable|changeColumns?|renameColumn)\s*\(/, 'تغيير مخطط عبر QueryRunner ممنوع في سكربت (اكتب SQL مفحوصًا)'],
  [/\bsynchronize\s*\(|\bsynchronize\s*:\s*true\b|\bdropSchema\s*:\s*true\b/, 'المزامنة/إسقاط المخطط ممنوع'],
  [/\b(?:startTransaction|commitTransaction|rollbackTransaction|release)\s*\(|\.\s*transaction\s*\(/, 'إدارة المعاملة أو الاتصال ممنوعة (المُرحّل يديرها)'],
  [/\brequire\s*\(\s*['"`](?:node:)?(?:child_process|net|http|https|http2|dgram|cluster|worker_threads|vm)['"`]\s*\)/, 'وحدات تشغيل عمليات أو شبكة ممنوعة في ترحيل'],
  [/\bprocess\s*\.\s*(?:exit|kill|chdir|abort)\b/, 'إنهاء العملية أو تغيير مجلدها ممنوع'],
]

function forbiddenScript(source) {
  const { code, literals } = scanJavaScript(source)
  const messages = new Set(SCRIPT_FORBIDDEN.filter(([pattern]) => pattern.test(code)).map(([, message]) => message))
  // يُفحص كـSQL فقط النص الذي يشبه SQL (فعل في أوله أو كلمة بنية)؛ رسائل مثل 'masked delete' ليست SQL
  const looksLikeSql = /^\s*(?:SELECT|INSERT|UPDATE|DELETE|MERGE|ALTER|DROP|CREATE|EXEC|EXECUTE|TRUNCATE|DECLARE|WITH|IF|SET|BEGIN|COMMIT|ROLLBACK|USE|BACKUP|RESTORE|DBCC|DISABLE|GRANT|KILL|SHUTDOWN)\b|\b(?:FROM|TABLE|INTO|DATABASE|TRANSACTION|COLUMN|TRIGGER|CONSTRAINT|SCHEMA|sp_\w+)\b/i
  for (const literal of literals) {
    if (literal.trim() === 'use strict' || !looksLikeSql.test(literal)) continue
    for (const message of forbiddenStatements(literal)) messages.add(`SQL داخل السكربت: ${message}`)
  }
  return [...messages]
}

function throwCodes(text) {
  const codes = new Set()
  for (const match of stripComments(normalize(text)).matchAll(/\bTHROW\s+(\d{5,})\s*,/gi)) codes.add(Number(match[1]))
  return [...codes].sort((a, b) => a - b)
}

function duplicateThrowCodes(files) {
  const owners = new Map()
  for (const file of files) for (const code of throwCodes(file.content)) owners.set(code, [...(owners.get(code) || []), file.relative])
  return [...owners].filter(([, list]) => list.length > 1).map(([code, list]) => ({ code, files: list }))
}

function folders(base) {
  return [
    { dir: base, scope: 'pre-payroll', extensions: ['.sql'] },
    { dir: path.join(base, 'payroll'), scope: 'payroll', extensions: ['.sql', '.cjs'] },
  ]
}

// اكتشاف الملفات بالترتيب: ما قبل الرواتب ثم الرواتب، كل مجموعة بترتيب الاسم
function discover(base = DEFAULT_BASE) {
  const files = []
  for (const folder of folders(base)) {
    if (!fs.existsSync(folder.dir)) continue
    for (const name of fs.readdirSync(folder.dir).sort()) {
      const full = path.join(folder.dir, name)
      const stat = fs.lstatSync(full)
      if (stat.isDirectory() || !/\.(?:sql|cjs)$/i.test(name)) continue
      const relative = path.relative(repoRoot, full).split(path.sep).join('/')
      if (stat.isSymbolicLink() || !stat.isFile()) throw new Error(`ملف الترحيل يجب أن يكون ملفًا عاديًا: ${relative}`)
      if (!FILE_NAME.test(name) || !folder.extensions.includes(path.extname(name))) {
        throw new Error(`اسم ملف ترحيل غير مقبول: ${relative} — الصيغة YYYYMMDD_NNN_وصف_بحروف_صغيرة.sql` + (folder.scope === 'payroll' ? ' أو .cjs' : ' (ملفات .cjs في مجلد payroll فقط)'))
      }
      const content = normalize(fs.readFileSync(full, 'utf8'))
      const kind = name.endsWith('.cjs') ? 'cjs' : 'sql'
      files.push({ version: name.replace(/\.(?:sql|cjs)$/, ''), name, scope: folder.scope, kind, file: full, relative, content, checksum: sha256(content) })
    }
  }
  const seen = new Set()
  for (const file of files) {
    if (seen.has(file.version)) throw new Error(`اسم ترحيل مكرر بين المجلدين: ${file.version}`)
    seen.add(file.version)
  }
  return files
}

function loadScript(file) {
  delete require.cache[require.resolve(file.file)]
  const mod = require(file.file)
  if (!mod || typeof mod.up !== 'function' || typeof mod.description !== 'string' || !mod.description.trim()) {
    throw new Error(`${file.relative}: ملف .cjs يجب أن يصدّر description نصيًا ودالة up(context)`)
  }
  return mod
}

// كل مشاكل الملفات قبل أي اتصال: أسماء، GO، عبارات ممنوعة (SQL وسكربتات)، أكواد THROW مكررة
function analyze(files) {
  const problems = []
  const details = files.map(file => {
    const entry = { version: file.version, scope: file.scope, kind: file.kind, relative: file.relative, checksum: file.checksum, throwCodes: throwCodes(file.content) }
    if (file.kind === 'sql') {
      entry.batches = executionUnits(file).length
      entry.execution = LEGACY_STATEMENT_FILES.has(file.version) && file.scope === 'payroll' ? 'statements' : 'go-batches'
      if (!entry.batches) problems.push(`${file.relative}: ملف فارغ`)
      for (const message of forbiddenStatements(file.content)) problems.push(`${file.relative}: ${message}`)
    } else {
      for (const message of forbiddenScript(file.content)) problems.push(`${file.relative}: ${message}`)
      try { entry.description = loadScript(file).description } catch (error) { problems.push(error.message) }
    }
    return entry
  })
  for (const dup of duplicateThrowCodes(files)) problems.push(`كود THROW ${dup.code} مكرر بين ملفين: ${dup.files.join(' و ')} — اختر كودًا فريدًا`)
  return { details, problems }
}

// ---------- الفحص الفعلي داخل معاملة الملف ----------

const INT_RANK = { tinyint: 1, smallint: 2, int: 3, bigint: 4 }
const INT_DIGITS = { tinyint: 3, smallint: 5, int: 10, bigint: 19 }
const CHAR_TYPES = { varchar: { unicode: false, fixed: false }, char: { unicode: false, fixed: true }, nvarchar: { unicode: true, fixed: false }, nchar: { unicode: true, fixed: true } }
const isDecimal = type => type === 'decimal' || type === 'numeric'
const charLength = column => column.maxLength === -1 ? Infinity : CHAR_TYPES[column.typeName].unicode ? column.maxLength / 2 : column.maxLength
const typeText = c => CHAR_TYPES[c.typeName] || ['varbinary', 'binary'].includes(c.typeName) ? `${c.typeName}(${c.maxLength === -1 ? 'max' : CHAR_TYPES[c.typeName]?.unicode ? c.maxLength / 2 : c.maxLength})`
  : isDecimal(c.typeName) ? `${c.typeName}(${c.precision},${c.scale})` : ['datetime2', 'time', 'datetimeoffset'].includes(c.typeName) ? `${c.typeName}(${c.scale})` : c.typeName

// null = التغيير حافظ للقيم (توسيع أو لا تغيير)؛ نص = سبب الرفض
function columnChangeProblem(label, a, b) {
  const sameType = a.typeName === b.typeName && a.maxLength === b.maxLength && a.precision === b.precision && a.scale === b.scale
  const sameCollation = (a.collation || null) === (b.collation || null)
  if (!!a.isComputed !== !!b.isComputed) return `${label}: تحويل بين عمود محسوب وعمود مخزن ممنوع`
  if (a.isComputed) return null
  if (sameType && sameCollation) return null
  const ta = a.typeName, tb = b.typeName
  if (CHAR_TYPES[ta] && CHAR_TYPES[tb]) {
    if (!sameCollation) return `${label}: تغيير collation ممنوع (${a.collation} → ${b.collation})`
    if (CHAR_TYPES[ta].unicode && !CHAR_TYPES[tb].unicode) return `${label}: تحويل ${typeText(a)} إلى ${typeText(b)} قد يفقد حروفًا`
    if (charLength(b) < charLength(a)) return `${label}: تقليل الطول ${typeText(a)} → ${typeText(b)} يقتطع القيم`
    if (CHAR_TYPES[tb].fixed && !CHAR_TYPES[ta].fixed) return `${label}: تحويل ${typeText(a)} إلى ${typeText(b)} يغيّر القيم بالحشو`
    return null
  }
  if (['varbinary', 'binary'].includes(ta) && ['varbinary', 'binary'].includes(tb)) {
    if (ta === 'varbinary' && tb === 'binary') return `${label}: تحويل varbinary إلى binary يغيّر القيم بالحشو`
    const len = c => c.maxLength === -1 ? Infinity : c.maxLength
    return len(b) >= len(a) ? null : `${label}: تقليل الطول ${typeText(a)} → ${typeText(b)} يقتطع القيم`
  }
  // الأنواع القديمة إلى مكافئها max (TypeORM simple-json يستعمل ntext)
  if ((ta === 'ntext' && tb === 'nvarchar') || (ta === 'text' && ['varchar', 'nvarchar'].includes(tb)) || (ta === 'image' && tb === 'varbinary')) {
    if (b.maxLength !== -1) return `${label}: تحويل ${ta} إلى ${typeText(b)} يقتطع القيم (المسموح ${tb}(max) فقط)`
    if (ta === 'text' || ta === 'ntext') return (a.collation || null) === (b.collation || null) || tb === 'nvarchar' ? null : `${label}: تغيير collation ممنوع`
    return null
  }
  if (!sameCollation) return `${label}: تغيير collation ممنوع`
  if (INT_RANK[ta] && INT_RANK[tb]) return INT_RANK[tb] >= INT_RANK[ta] ? null : `${label}: تصغير النوع ${ta} → ${tb}`
  if (isDecimal(ta) && isDecimal(tb)) {
    return b.scale >= a.scale && b.precision - b.scale >= a.precision - a.scale ? null : `${label}: تضييق ${typeText(a)} → ${typeText(b)} يقتطع القيم`
  }
  if (INT_RANK[ta] && isDecimal(tb)) return b.precision - b.scale >= INT_DIGITS[ta] ? null : `${label}: ${typeText(b)} لا يسع كل قيم ${ta}`
  if (ta === 'real' && tb === 'float') return null
  if (ta === 'float' && tb === 'float') return b.maxLength >= a.maxLength ? null : `${label}: تضييق float يفقد دقة`
  if (ta === tb && ['datetime2', 'time', 'datetimeoffset'].includes(ta)) return b.scale >= a.scale ? null : `${label}: تقليل دقة ${typeText(a)} → ${typeText(b)}`
  if (ta === 'date' && tb === 'datetime2') return null
  if (ta === 'smalldatetime' && ['datetime', 'datetime2'].includes(tb)) return null
  if (ta === 'datetime' && tb === 'datetime2') return b.scale >= 3 ? null : `${label}: datetime2(${b.scale}) أقل دقة من datetime`
  if (ta === tb) return null
  return `${label}: تغيير النوع ${typeText(a)} → ${typeText(b)} غير مثبت أنه حافظ للقيم`
}

function request(ds, qr) { return new ds.driver.mssql.Request(qr.databaseConnection) }

// دفعة SQL حقيقية على اتصال المعاملة نفسه (ليست sp_executesql) — إعدادات SET تبقى للجلسة
function batch(ds, qr, text) { return request(ds, qr).batch(text) }

const GUARD_INT = '#hr_migrate_guard_int_keys'
const GUARD_TEXT = '#hr_migrate_guard_text_keys'
const INTEGER_KEY_TYPES = new Set(['tinyint', 'smallint', 'int', 'bigint'])
const DATE_TYPES = new Set(['date', 'datetime', 'datetime2', 'smalldatetime', 'datetimeoffset', 'time'])

async function guardMetadata(ds, qr) {
  const result = await request(ds, qr).query(`SET NOCOUNT ON;
SELECT t.object_id AS objectId, SCHEMA_NAME(t.schema_id) AS schemaName, t.name AS tableName FROM sys.tables t WHERE t.is_ms_shipped=0;
SELECT c.object_id AS objectId, c.column_id AS columnId, c.name, TYPE_NAME(c.system_type_id) AS typeName, c.max_length AS maxLength, c.precision, c.scale,
  c.is_nullable AS isNullable, c.collation_name AS collation, c.is_computed AS isComputed
  FROM sys.columns c JOIN sys.tables t ON t.object_id=c.object_id WHERE t.is_ms_shipped=0;
SELECT tr.object_id AS objectId, tr.name, tr.is_disabled AS isDisabled FROM sys.triggers tr JOIN sys.tables t ON t.object_id=tr.parent_id;
SELECT object_id AS objectId, name, is_disabled AS isDisabled FROM sys.foreign_keys UNION ALL SELECT object_id, name, is_disabled FROM sys.check_constraints;
SELECT i.object_id AS objectId, i.index_id AS indexId, i.name, i.is_disabled AS isDisabled FROM sys.indexes i JOIN sys.tables t ON t.object_id=i.object_id WHERE i.type>0 AND t.is_ms_shipped=0;
SELECT ic.object_id AS objectId, ic.key_ordinal AS ordinal, ic.column_id AS columnId FROM sys.indexes i
  JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id JOIN sys.tables t ON t.object_id=i.object_id
  WHERE i.is_primary_key=1 AND t.is_ms_shipped=0 ORDER BY ic.object_id, ic.key_ordinal;`)
  const [tables, columns, triggers, constraints, indexes, keyColumns] = result.recordsets
  const snapshot = { tables: new Map(), columns: new Map(), triggers: new Map(), constraints: new Map(), indexes: new Map(), primaryKeys: new Map() }
  for (const t of tables) snapshot.tables.set(t.objectId, { schemaName: t.schemaName, tableName: t.tableName })
  for (const c of columns) snapshot.columns.set(`${c.objectId}:${c.columnId}`, c)
  for (const t of triggers) snapshot.triggers.set(t.objectId, t)
  for (const c of constraints) snapshot.constraints.set(c.objectId, c)
  for (const i of indexes) snapshot.indexes.set(`${i.objectId}:${i.indexId}`, i)
  for (const k of keyColumns) snapshot.primaryKeys.set(k.objectId, [...(snapshot.primaryKeys.get(k.objectId) || []), k.columnId])
  return snapshot
}

const tableSql = (snapshot, objectId) => { const t = snapshot.tables.get(objectId); return `${quoteName(t.schemaName)}.${quoteName(t.tableName)}` }
const tableLabel = (snapshot, objectId) => { const t = snapshot.tables.get(objectId); return `${t.schemaName}.${t.tableName}` }
function keyPlan(snapshot, objectId) {
  const ids = snapshot.primaryKeys.get(objectId)
  if (!ids || !ids.length) return null
  const columns = ids.map(id => snapshot.columns.get(`${objectId}:${id}`))
  if (columns.some(column => !column)) return null
  if (columns.length === 1 && INTEGER_KEY_TYPES.has(columns[0].typeName)) return { kind: 'int', columnIds: ids, expression: alias => `CAST(${alias}${quoteName(columns[0].name)} AS bigint)` }
  const part = (c, alias) => DATE_TYPES.has(c.typeName) ? `CONVERT(nvarchar(64), ${alias}${quoteName(c.name)}, 126)` : `CONVERT(nvarchar(900), ${alias}${quoteName(c.name)})`
  // CONCAT_WS يحتاج 3 وسائط على الأقل: المفتاح النصي أحادي العمود يُحوَّل مباشرة
  return { kind: 'text', columnIds: ids, expression: alias => columns.length === 1 ? `CONVERT(nvarchar(900), ${part(columns[0], alias)})`
    : `CONVERT(nvarchar(900), CONCAT_WS(N'|', ${columns.map(c => part(c, alias)).join(', ')}))` }
}

// قبل الملف: لقطة البنية + مفاتيح كل الصفوف القائمة (في جداول مؤقتة للجلسة داخل المعاملة نفسها)
async function guardBegin(ds, qr) {
  const snapshot = await guardMetadata(ds, qr)
  const statements = [`IF OBJECT_ID(N'tempdb..${GUARD_INT}') IS NOT NULL DROP TABLE ${GUARD_INT};`,
    `IF OBJECT_ID(N'tempdb..${GUARD_TEXT}') IS NOT NULL DROP TABLE ${GUARD_TEXT};`,
    `CREATE TABLE ${GUARD_INT} (objectId int NOT NULL, k bigint NOT NULL, PRIMARY KEY (objectId, k));`,
    `CREATE TABLE ${GUARD_TEXT} (objectId int NOT NULL, k nvarchar(900) NOT NULL);`]
  const counts = []
  snapshot.keyPlans = new Map()
  for (const objectId of snapshot.tables.keys()) {
    const plan = keyPlan(snapshot, objectId)
    snapshot.keyPlans.set(objectId, plan)
    counts.push(`SELECT ${objectId} AS objectId, COUNT_BIG(*) AS n FROM ${tableSql(snapshot, objectId)}`)
    if (plan) statements.push(`INSERT INTO ${plan.kind === 'int' ? GUARD_INT : GUARD_TEXT} (objectId, k) SELECT ${objectId}, ${plan.expression('x.')} FROM ${tableSql(snapshot, objectId)} x;`)
  }
  await batch(ds, qr, 'SET NOCOUNT ON;\n' + statements.join('\n'))
  snapshot.rowCounts = new Map()
  if (counts.length) for (const row of (await request(ds, qr).query(counts.join('\nUNION ALL\n'))).recordset) snapshot.rowCounts.set(row.objectId, Number(row.n))
  return snapshot
}

async function sessionOptionProblems(ds, qr, expectedTranCount) {
  const [row] = (await request(ds, qr).query('SELECT @@TRANCOUNT AS tranCount, CAST(@@OPTIONS & 16384 AS int) AS xactAbort, CAST(@@OPTIONS & 8 AS int) AS ansiWarnings')).recordset
  const problems = []
  if (Number(row.tranCount) !== expectedTranCount) problems.push(`مستوى المعاملة تغيّر (@@TRANCOUNT=${row.tranCount})`)
  if (!Number(row.xactAbort)) problems.push('XACT_ABORT أُطفئ داخل الملف')
  if (!Number(row.ansiWarnings)) problems.push('ANSI_WARNINGS أُطفئ داخل الملف (اقتطاع صامت)')
  return problems
}

// بعد الملف وقبل الالتزام: أي إسقاط/تضييق/حذف/تعطيل = رفض الملف كله
async function guardEnd(ds, qr, before) {
  const after = await guardMetadata(ds, qr)
  const problems = [], changes = { renamedColumns: [], widenedColumns: [], nullabilityChanges: [] }
  for (const [objectId, table] of before.tables) {
    const now = after.tables.get(objectId)
    if (!now) { problems.push(`الجدول ${table.schemaName}.${table.tableName} أُسقط أو أُعيد إنشاؤه`); continue }
    if (now.tableName !== table.tableName || now.schemaName !== table.schemaName) problems.push(`إعادة تسمية/نقل الجدول ${table.schemaName}.${table.tableName} → ${now.schemaName}.${now.tableName} ممنوعة`)
  }
  for (const [key, column] of before.columns) {
    const table = before.tables.get(column.objectId)
    if (!after.tables.has(column.objectId)) continue
    const label = `${table.tableName}.${column.name}`
    const now = after.columns.get(key)
    if (!now) { problems.push(`العمود ${label} أُسقط`); continue }
    if (now.name !== column.name) changes.renamedColumns.push(`${label} → ${now.name}`)
    const problem = columnChangeProblem(label, column, now)
    if (problem) problems.push(problem)
    else if (now.typeName !== column.typeName || now.maxLength !== column.maxLength || now.precision !== column.precision || now.scale !== column.scale) changes.widenedColumns.push(`${label}: ${typeText(column)} → ${typeText(now)}`)
    if (!!now.isNullable !== !!column.isNullable) changes.nullabilityChanges.push(`${label}: ${column.isNullable ? 'NULL' : 'NOT NULL'} → ${now.isNullable ? 'NULL' : 'NOT NULL'}`)
  }
  for (const [kind, label] of [['triggers', 'المشغل'], ['constraints', 'القيد'], ['indexes', 'الفهرس']]) {
    for (const [key, item] of before[kind]) {
      const now = after[kind].get(key)
      if (kind === 'triggers' && !now) { problems.push(`${label} ${item.name} أُسقط`); continue }
      if (now && !item.isDisabled && now.isDisabled) problems.push(`${label} ${item.name} عُطّل`)
    }
  }
  // الصفوف: كل مفتاح أساسي كان موجودًا يجب أن يبقى؛ الجداول بلا مفتاح: العدد لا ينقص
  const missingQueries = [], countQueries = []
  let keyRowsChecked = 0
  for (const [objectId, plan] of before.keyPlans) {
    if (!after.tables.has(objectId)) continue
    const nowPlan = keyPlan(after, objectId)
    if (plan && nowPlan && nowPlan.kind === plan.kind && nowPlan.columnIds.join(',') === plan.columnIds.join(',')) {
      keyRowsChecked += before.rowCounts.get(objectId) || 0
      missingQueries.push(`SELECT ${objectId} AS objectId, (SELECT COUNT_BIG(*) FROM ${plan.kind === 'int' ? GUARD_INT : GUARD_TEXT} g WHERE g.objectId=${objectId}
        AND NOT EXISTS (SELECT 1 FROM ${tableSql(after, objectId)} x WHERE ${nowPlan.expression('x.')} = g.k)) AS missing`)
    } else {
      countQueries.push(`SELECT ${objectId} AS objectId, COUNT_BIG(*) AS n FROM ${tableSql(after, objectId)}`)
    }
  }
  if (missingQueries.length) {
    for (const row of (await request(ds, qr).query(missingQueries.join('\nUNION ALL\n'))).recordset) {
      if (Number(row.missing) > 0) problems.push(`حُذف ${row.missing} صف من ${tableLabel(after, row.objectId)} (مفاتيح كانت موجودة قبل الملف)`)
    }
  }
  if (countQueries.length) {
    for (const row of (await request(ds, qr).query(countQueries.join('\nUNION ALL\n'))).recordset) {
      const was = before.rowCounts.get(row.objectId) || 0
      if (Number(row.n) < was) problems.push(`نقص عدد صفوف ${tableLabel(after, row.objectId)} من ${was} إلى ${row.n}`)
    }
  }
  await batch(ds, qr, `DROP TABLE ${GUARD_INT}; DROP TABLE ${GUARD_TEXT};`)
  return { problems, summary: { tables: before.tables.size, keyRowsChecked, ...changes } }
}

// ---------- الهدف والحراسة ----------

function readEnv() {
  const dotenv = require('../node_modules/dotenv')
  return dotenv.parse(fs.readFileSync(path.join(apiRoot, '.env')))
}

function classifyTarget(database, { company = false, companyDatabase }) {
  if (typeof database !== 'string' || !/^[A-Za-z0-9_]+$/.test(database)) throw new Error('اسم قاعدة البيانات غير صالح')
  if (/^hr_review_pre_payroll_/i.test(database)) throw new Error('قاعدة المراجعة hr_review_pre_payroll_* محظورة على هذا المُرحّل')
  if (database === companyDatabase) {
    if (!company) throw new Error(`القاعدة ${database} هي قاعدة الشركة: التطبيق يحتاج --company صراحةً (ويشترط نسخة احتياطية لحظة التجميد)`)
    return 'company'
  }
  if (DISPOSABLE_DATABASE.test(database) || REHEARSAL_DATABASE.test(database)) {
    if (company) throw new Error('--company مخصص لقاعدة الشركة المضبوطة في api/.env فقط')
    return 'disposable'
  }
  throw new Error(`القاعدة ${database} غير مسموحة: قاعدة الشركة (${companyDatabase}) مع --company، أو قاعدة مؤقتة hr_<اسم>_test_<16 hex> / hr_migrate_rehearsal_*`)
}

function docker(args, options = {}) {
  return execFileSync('docker', args, { encoding: options.encoding ?? 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 16 * 1024 * 1024 })
}

// SQL Server مثبت أصليًا على نفس الجهاز (بلا حاوية): ما يراه SQL Server هو نفس نظام ملفات الجهاز.
// HR_SQL_NATIVE=1 يفرض المسار الأصلي، و=0 يفرض الحاوية؛ الافتراضي: الحاوية لو docker موجود.
let sqlNativeCache = null
function sqlIsNative() {
  if (process.env.HR_SQL_NATIVE === '1') return true
  if (process.env.HR_SQL_NATIVE === '0') return false
  if (sqlNativeCache === null) {
    try { docker(['version', '--format', '{{.Server.Os}}']); sqlNativeCache = false } catch { sqlNativeCache = true }
  }
  return sqlNativeCache
}

function fileSha256(file) {
  const hash = crypto.createHash('sha256'), fd = fs.openSync(file, 'r'), buffer = Buffer.alloc(1024 * 1024)
  try { let n; while ((n = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0) hash.update(buffer.subarray(0, n)) } finally { fs.closeSync(fd) }
  return hash.digest('hex')
}

// مجلد النسخ الذي يكتب فيه SQL Server. HR_SQL_BACKUP_DIR يتجاوز المجلد الافتراضي — لازم على
// التثبيت الأصلي لأن مجلد Program Files الافتراضي مقروء للمسؤولين وحساب الخدمة فقط.
async function sqlBackupDir(masterPool) {
  if (process.env.HR_SQL_BACKUP_DIR) return process.env.HR_SQL_BACKUP_DIR
  return (await masterPool.request().query("SELECT CAST(SERVERPROPERTY('InstanceDefaultBackupPath') AS nvarchar(400)) AS dir")).recordset[0].dir || '/var/opt/mssql/data'
}
const sqlJoin = (dir, name) => dir.replace(/[\\/]+$/, '') + (dir.includes('/') ? '/' : '\\') + name
const containerSha = file => { try { return docker(['exec', SQL_CONTAINER, 'sha256sum', file]).trim().split(/\s+/)[0] } catch { return null } }
// بصمة الملف كما يراه SQL Server: من داخل الحاوية، أو من نظام ملفات الجهاز لو التثبيت أصلي
const sqlVisibleSha = file => {
  if (!sqlIsNative()) return containerSha(file)
  try { return fs.existsSync(file) ? fileSha256(file) : null } catch { return null }
}
// إتاحة ملف من الجهاز لـSQL Server (نسخ داخل الحاوية، أو نسخ عادي لو التثبيت أصلي)
const sqlPutFile = (hostPath, sqlPath) => {
  if (!sqlIsNative()) { docker(['cp', hostPath, `${SQL_CONTAINER}:${sqlPath}`]); docker(['exec', '-u', '0', SQL_CONTAINER, 'chown', 'mssql', sqlPath]); return }
  fs.mkdirSync(path.dirname(sqlPath), { recursive: true })
  fs.copyFileSync(hostPath, sqlPath)
}
// سحب ملف من SQL Server للجهاز
const sqlGetFile = (sqlPath, hostPath) => {
  if (!sqlIsNative()) { docker(['cp', `${SQL_CONTAINER}:${sqlPath}`, hostPath]); return }
  fs.copyFileSync(sqlPath, hostPath)
}
// حذف ملف مؤقت يراه SQL Server — الفشل غير مهم (يبقى ملف مؤقت فقط)
const sqlRemoveFile = sqlPath => {
  try { if (!sqlIsNative()) docker(['exec', '-u', '0', SQL_CONTAINER, 'rm', '-f', sqlPath]); else fs.rmSync(sqlPath, { force: true }) } catch { /* ملف مؤقت */ }
}

// النسخة الاحتياطية على الجهاز + نسخة مطابقة البصمة يراها SQL Server + HEADERONLY + VERIFYONLY
async function verifyCompanyBackup(masterPool, companyDatabase, backupPath = COMPANY_BACKUP) {
  if (!backupPath || !fs.existsSync(backupPath) || !fs.statSync(backupPath).isFile() || fs.statSync(backupPath).size === 0) {
    throw new Error(`وضع الشركة موقوف: النسخة الاحتياطية غير موجودة على الجهاز (${backupPath})`)
  }
  const hostSha256 = fileSha256(backupPath), sizeBytes = fs.statSync(backupPath).size
  const dataDir = await sqlBackupDir(masterPool)
  let sqlPath = sqlJoin(dataDir, path.basename(backupPath)), staged = false
  if (sqlVisibleSha(sqlPath) !== hostSha256) {
    // لا توجد نسخة مطابقة داخل الحاوية: ننسخ الملف مؤقتًا للتحقق ثم نزيل النسخة المؤقتة فقط
    sqlPath = sqlJoin(dataDir, `migrate_verify_${crypto.randomBytes(6).toString('hex')}.bak`)
    try {
      sqlPutFile(backupPath, sqlPath)
    } catch (error) {
      throw new Error(`وضع الشركة موقوف: تعذر إتاحة النسخة الاحتياطية لـSQL Server (${sqlIsNative() ? 'تثبيت أصلي' : `الحاوية ${SQL_CONTAINER}`}) (${String(error.message).split('\n')[0]})`)
    }
    staged = true
    if (sqlVisibleSha(sqlPath) !== hostSha256) throw new Error('وضع الشركة موقوف: بصمة النسخة التي يراها SQL Server لا تطابق الملف على الجهاز')
  }
  try {
    const header = (await masterPool.request().input('p', sqlPath).query('RESTORE HEADERONLY FROM DISK = @p')).recordset
    if (header.length !== 1 || header[0].DatabaseName !== companyDatabase || Number(header[0].BackupType) !== 1) {
      throw new Error(`وضع الشركة موقوف: النسخة الاحتياطية ليست نسخة كاملة واحدة لقاعدة ${companyDatabase}`)
    }
    const checksums = header[0].HasBackupChecksums === true || Number(header[0].HasBackupChecksums) === 1
    await masterPool.request().input('p', sqlPath).query(`RESTORE VERIFYONLY FROM DISK = @p${checksums ? ' WITH CHECKSUM' : ''}`)
    return { hostPath: backupPath.split(path.sep).join('/'), sizeBytes, sha256: hostSha256, sqlPath, staged, databaseName: header[0].DatabaseName,
      backupStartDate: header[0].BackupStartDate, backupFinishDate: header[0].BackupFinishDate,
      copyOnly: header[0].IsCopyOnly === true || Number(header[0].IsCopyOnly) === 1, checksums, verifyOnly: 'passed' }
  } finally {
    if (staged && !process.env.HR_KEEP_STAGED_BACKUP) sqlRemoveFile(sqlPath)
  }
}

// نسخة COPY_ONLY, CHECKSUM جديدة لحظة التجميد، تُنسخ للجهاز خارج الـvolume ثم تُتحقق بنفس الإجراء
async function takeCompanyBackup(masterPool, database, { hostDir = FREEZE_BACKUP_DIR, label = 'freeze' } = {}) {
  if (!/^[A-Za-z0-9_]+$/.test(database) || !/^[a-z]+$/.test(label)) throw new Error('اسم قاعدة أو وسم نسخة غير صالح')
  const dataDir = await sqlBackupDir(masterPool)
  const stamp = utcStamp()
  const name = `${database}_${label}_${stamp}_${crypto.randomBytes(4).toString('hex')}.bak`
  const sqlPath = sqlJoin(dataDir, name)
  await masterPool.request().input('p', sqlPath).input('n', `${database} ${label} ${stamp}`)
    .query(`BACKUP DATABASE ${quoteName(database)} TO DISK = @p WITH COPY_ONLY, CHECKSUM, INIT, FORMAT, NAME = @n`)
  fs.mkdirSync(hostDir, { recursive: true })
  const hostPath = path.join(hostDir, name)
  sqlGetFile(sqlPath, hostPath)
  const verified = await verifyCompanyBackup(masterPool, database, hostPath)
  return { ...verified, taken: stamp, label }
}

// هل النسخة نقطة رجوع للحالة الحالية؟ لا ترحيل بعدها، ولا كتابة مسجلة بعدها، وSQL Server لم يُعد تشغيله بعدها
async function databaseWriteState(masterPool, database) {
  if (!/^[A-Za-z0-9_]+$/.test(database)) throw new Error('اسم قاعدة البيانات غير صالح')
  const [row] = (await masterPool.request().input('d', database).query(`SELECT
    (SELECT sqlserver_start_time FROM sys.dm_os_sys_info) AS serverStartedAt,
    (SELECT MAX(last_user_update) FROM sys.dm_db_index_usage_stats WHERE database_id = DB_ID(@d)) AS lastUserUpdate,
    OBJECT_ID(N'${database}.dbo.${LEDGER}', N'U') AS ledgerId`)).recordset
  let ledgerLastAppliedAt = null
  if (row.ledgerId) ledgerLastAppliedAt = (await masterPool.request().query(`SELECT MAX(appliedAt) AS last FROM ${quoteName(database)}.dbo.${LEDGER}`)).recordset[0].last
  return { serverStartedAt: row.serverStartedAt, lastUserUpdate: row.lastUserUpdate, ledgerLastAppliedAt }
}

function backupFreshnessProblems({ backupFinishDate, ledgerLastAppliedAt, lastUserUpdate, serverStartedAt }) {
  const t = value => value == null ? null : new Date(value).getTime()
  const finish = t(backupFinishDate)
  if (finish == null || Number.isNaN(finish)) return ['تاريخ انتهاء النسخة غير معروف']
  const problems = []
  // BackupFinishDate بدقة الثانية: نسمح بثانية واحدة فقط
  if (t(ledgerLastAppliedAt) != null && t(ledgerLastAppliedAt) >= finish + 1000) problems.push('النسخة أقدم من آخر ترحيل مطبق في الدفتر — ليست نقطة رجوع للحالة الحالية')
  if (t(serverStartedAt) != null && t(serverStartedAt) > finish) problems.push('SQL Server أُعيد تشغيله بعد النسخة؛ لا يمكن إثبات غياب كتابات بعدها')
  if (t(lastUserUpdate) != null && t(lastUserUpdate) >= finish + 1000) problems.push('فيه كتابات على القاعدة بعد انتهاء النسخة — ليست نقطة رجوع للحالة الحالية')
  return problems
}

async function otherSessions(masterPool, database) {
  return (await masterPool.request().input('d', database).input('app', APP_NAME).query(`SELECT ISNULL(program_name, N'unknown') AS program, COUNT(*) AS n
    FROM sys.dm_exec_sessions WHERE is_user_process=1 AND database_id=DB_ID(@d) AND session_id<>@@SPID AND ISNULL(program_name,'')<>@app GROUP BY program_name`)).recordset
}

async function portListening(port) {
  const probe = host => new Promise(resolve => {
    const socket = net.createConnection({ host, port })
    const done = value => { socket.destroy(); resolve(value) }
    socket.setTimeout(1500, () => done(false))
    socket.once('connect', () => done(true))
    socket.once('error', () => done(false))
  })
  return (await probe('127.0.0.1')) || (await probe('::1'))
}

// ---------- الاتصال ----------

let runtimeCache = null
function runtime() {
  if (runtimeCache) return runtimeCache
  require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
  require('../node_modules/reflect-metadata')
  runtimeCache = { typeorm: require('../node_modules/typeorm'), mssql: require('../node_modules/mssql'), env: readEnv() }
  return runtimeCache
}

function entityClasses() {
  const { typeorm } = runtime()
  const walk = dir => {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, item.name)
      if (item.isDirectory()) walk(file)
      else if (/\.entit(?:y|ies)\.ts$/.test(item.name)) require(file)
    }
  }
  walk(path.join(apiRoot, 'src'))
  return [...new Set(typeorm.getMetadataArgsStorage().tables.map(table => table.target))]
}

function connectionOptions(env, database) {
  return { server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME || 'sa', password: env.DB_PASSWORD, database,
    options: { encrypt: false, trustServerCertificate: env.DB_TRUST_SERVER_CERTIFICATE !== 'false', appName: APP_NAME },
    connectionTimeout: 15000, requestTimeout: 900000, pool: { max: 4 } }
}

async function masterPool(env) {
  const { mssql } = runtime()
  return new mssql.ConnectionPool(connectionOptions(env, 'master')).connect()
}

async function openDataSource(env, database, withEntities = true) {
  const { typeorm } = runtime()
  if (String(env.DB_TYPE || 'mssql') !== 'mssql') throw new Error('المُرحّل يدعم SQL Server فقط')
  const c = connectionOptions(env, database)
  const ds = new typeorm.DataSource({ type: 'mssql', host: c.server, port: c.port, username: c.user, password: c.password, database,
    options: c.options, entities: withEntities ? entityClasses() : [], synchronize: false, migrationsRun: false, logging: false,
    connectionTimeout: c.connectionTimeout, requestTimeout: c.requestTimeout, pool: c.pool })
  await ds.initialize()
  return ds
}

async function ledgerRows(ds) {
  const exists = await ds.query(`SELECT OBJECT_ID(N'dbo.${LEDGER}', N'U') AS id`)
  if (!exists[0].id) return null
  return ds.query(`SELECT version, checksum, scope, CONVERT(varchar(33), appliedAt, 126) AS appliedAt FROM dbo.${LEDGER} ORDER BY appliedAt, version`)
}

function ledgerStatus(files, rows) {
  const byVersion = new Map((rows || []).map(row => [row.version, row]))
  const changed = files.filter(file => byVersion.has(file.version) && byVersion.get(file.version).checksum !== file.checksum).map(file => file.relative)
  const unknown = (rows || []).filter(row => !files.some(file => file.version === row.version)).map(row => row.version)
  return { pending: files.filter(file => !byVersion.has(file.version)), applied: files.filter(file => byVersion.has(file.version)), changed, unknown }
}

async function schemaDiff(ds) {
  const { upQueries } = await ds.driver.createSchemaBuilder().log()
  return upQueries.map(query => query.query)
}

async function tableCounts(ds) {
  const tables = await ds.query("SELECT t.name FROM sys.tables t WHERE t.is_ms_shipped=0 AND SCHEMA_NAME(t.schema_id)='dbo' ORDER BY t.name")
  const counts = {}
  for (const { name } of tables) {
    if (!/^[A-Za-z0-9_]+$/.test(name)) continue
    counts[name] = Number((await ds.query(`SELECT COUNT_BIG(*) AS n FROM dbo.[${name}]`))[0].n)
  }
  return counts
}

async function columnList(ds) {
  const rows = await ds.query("SELECT t.name AS tableName, c.name AS columnName FROM sys.tables t JOIN sys.columns c ON c.object_id=t.object_id WHERE t.is_ms_shipped=0 ORDER BY t.name, c.column_id")
  return rows.map(row => `${row.tableName}.${row.columnName}`)
}

function compareCounts(before, after) {
  const differences = []
  for (const table of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (before[table] === after[table]) continue
    differences.push({ table, before: table in before ? before[table] : null, after: table in after ? after[table] : null,
      kind: !(table in before) ? 'new-table' : !(table in after) ? 'missing-table' : 'row-count-changed' })
  }
  return differences
}

async function ensureLedger(ds) {
  await ds.query(`IF OBJECT_ID(N'dbo.${LEDGER}', N'U') IS NULL
    CREATE TABLE dbo.${LEDGER} (version nvarchar(150) NOT NULL CONSTRAINT PK_${LEDGER} PRIMARY KEY,
      checksum char(64) NOT NULL, scope nvarchar(40) NOT NULL,
      appliedAt datetime2 NOT NULL CONSTRAINT DF_${LEDGER}_appliedAt DEFAULT SYSDATETIME())`)
}

const LOCK_SQL = `DECLARE @lock int; EXEC @lock = sys.sp_getapplock @Resource = N'hr:schema-migrations', @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 20000;
IF @lock < 0 THROW 50990, N'قفل المُرحّل مشغول بعملية ترحيل أخرى', 1;`

async function runFile(ds, qr, file, { database, mode }) {
  if (file.kind === 'sql') {
    const parts = executionUnits(file)
    for (let index = 0; index < parts.length; index++) {
      try { await batch(ds, qr, parts[index]) } catch (error) {
        throw new Error(`${file.relative} (دفعة ${index + 1} من ${parts.length}): ${error.message}`)
      }
      const problems = await sessionOptionProblems(ds, qr, 1)
      if (problems.length) throw new Error(`${file.relative} (دفعة ${index + 1} من ${parts.length}): ${problems.join('؛ ')}`)
    }
    return { batches: parts.length }
  }
  const logs = []
  const mod = loadScript(file)
  const context = { manager: qr.manager, queryRunner: qr, database, mode, apiRoot,
    query: (text, parameters) => qr.query(text, parameters), batch: text => batch(ds, qr, text),
    log: message => logs.push(String(message)), requireApi: relative => require(path.join(apiRoot, relative)) }
  let result
  try { result = await mod.up(context) } catch (error) {
    const detail = error?.response?.message ?? error?.message ?? String(error)
    throw new Error(`${file.relative}: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`)
  }
  const problems = await sessionOptionProblems(ds, qr, 1)
  if (problems.length) throw new Error(`${file.relative}: ${problems.join('؛ ')}`)
  return { script: true, logs, result: result ?? null }
}

// الملف + الفحص الفعلي في نفس المعاملة: أي مخالفة ترمي قبل تسجيله والالتزام به
async function runGuardedFile(ds, qr, file, context) {
  const before = await guardBegin(ds, qr)
  const outcome = await runFile(ds, qr, file, context)
  const guard = await guardEnd(ds, qr, before)
  if (guard.problems.length) throw new Error(`${file.relative}: الفحص الفعلي رفض الملف — ${guard.problems.join('؛ ')}`)
  return { ...outcome, guard: guard.summary }
}

// ---------- الأوامر ----------

function parseArgs(argv) {
  const [command = 'plan', ...rest] = argv
  const options = { command }
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]
    if (arg === '--company') options.company = true
    else if (arg === '--allow-live-api') options.allowLiveApi = true
    else if (arg === '--keep') options.keep = true
    else if (arg === '--no-trial') options.trial = false
    else if (arg === '--database') options.database = rest[++i]
    else if (arg === '--backup') options.backupPath = rest[++i]
    else if (arg === '--from') options.from = rest[++i]
    else throw new Error(`وسيط غير معروف: ${arg}`)
  }
  return options
}

function writeRecord(record) {
  const dir = path.join(DEFAULT_BASE, 'runs')
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `${utcStamp()}_${record.command}_${record.database}.json`)
  fs.writeFileSync(file, JSON.stringify(record, null, 2) + '\n')
  return path.relative(repoRoot, file).split(path.sep).join('/')
}

async function plan(options = {}) {
  const { env } = runtime()
  const files = discover(options.base)
  const analysis = analyze(files)
  const database = options.database || env.DB_DATABASE
  const companyDatabase = env.DB_DATABASE
  const mode = database === companyDatabase ? 'company' : classifyTarget(database, { companyDatabase })
  const ds = await openDataSource(env, database, options.schemaDiff !== false)
  try {
    const rows = await ledgerRows(ds)
    const status = ledgerStatus(files, rows)
    const diff = options.schemaDiff === false ? null : await schemaDiff(ds)
    return { command: 'plan', database, mode, readOnly: true, files: analysis.details.map(detail => ({ ...detail,
      state: status.changed.includes(detail.relative) ? 'CHANGED_AFTER_APPLY' : status.pending.some(file => file.version === detail.version) ? 'PENDING' : 'APPLIED' })),
      problems: [...analysis.problems, ...status.changed.map(file => `${file}: تغيّر بعد تطبيقه — أضف ملفًا جديدًا بدل تعديل ملف مطبق`),
        ...status.unknown.map(version => `الدفتر فيه ${version} ولا يوجد ملف له`)],
      ledgerExists: rows !== null, appliedCount: status.applied.length, pendingCount: status.pending.length,
      schemaDiffCount: diff?.length ?? null, schemaDiff: diff?.slice(0, 60) ?? null,
      baselineBackupPresent: mode === 'company' ? fs.existsSync(options.baselinePath || COMPANY_BACKUP) : undefined }
  } finally { await ds.destroy() }
}

// وضع الشركة: تجميد (لا API ولا جلسات) → نقطة الأساس موجودة ومتحققة → نسخة جديدة لحظة التجميد
// (أو --backup بشرط أنها أحدث من آخر ترحيل وآخر كتابة) → فحص حداثتها → البروفة → التطبيق
async function prepareCompany(env, companyDatabase, options, record) {
  const baselinePath = options.baselinePath || COMPANY_BACKUP
  if (options.backupPath && !fs.existsSync(options.backupPath)) throw new Error(`وضع الشركة موقوف: النسخة الاحتياطية غير موجودة على الجهاز (${options.backupPath})`)
  if (!fs.existsSync(baselinePath)) throw new Error(`وضع الشركة موقوف: النسخة الاحتياطية غير موجودة على الجهاز (${baselinePath}) — نقطة الأساس قبل الرواتب مطلوبة`)
  if (!options.allowLiveApi && await portListening(Number(env.PORT || 4000))) {
    throw new Error(`وضع الشركة موقوف: الـAPI يستمع على المنفذ ${env.PORT || 4000} — أوقفه قبل الترحيل (أو --allow-live-api لملفات إضافية بحتة)`)
  }
  const master = await masterPool(env)
  try {
    if (!options.allowLiveApi) {
      const sessions = await otherSessions(master, companyDatabase)
      if (sessions.length) throw new Error('وضع الشركة موقوف: جلسات أخرى متصلة بالقاعدة: ' + sessions.map(s => `${s.program}×${s.n}`).join(', '))
    }
    record.baselineBackup = await verifyCompanyBackup(master, companyDatabase, baselinePath)
    record.backup = options.backupPath ? await verifyCompanyBackup(master, companyDatabase, options.backupPath) : await takeCompanyBackup(master, companyDatabase, { hostDir: options.freezeDir })
    const state = await databaseWriteState(master, companyDatabase)
    const problems = backupFreshnessProblems({ backupFinishDate: record.backup.backupFinishDate, ...state })
    record.backupFreshness = { ...state, problems }
    if (problems.length) throw new Error('وضع الشركة موقوف: النسخة ليست نقطة رجوع للحالة الحالية — ' + problems.join('؛ ') + ' (شغّل بدون --backup لأخذ نسخة لحظة التجميد)')
  } finally { await master.close() }
}

async function apply(options = {}) {
  const { env } = runtime()
  const started = new Date()
  const companyDatabase = env.DB_DATABASE
  const database = options.database || (options.company ? companyDatabase : undefined)
  if (!database) throw new Error('حدد --company لقاعدة الشركة أو --database <قاعدة مؤقتة>')
  const mode = classifyTarget(database, { company: !!options.company, companyDatabase })
  const files = discover(options.base)
  const analysis = analyze(files)
  if (analysis.problems.length) throw new Error('الترحيل موقوف قبل أي اتصال:\n- ' + analysis.problems.join('\n- '))
  const record = { command: options.recordCommand || 'apply', database, mode, startedAt: started.toISOString(), files: analysis.details.length }
  if (mode === 'company') await prepareCompany(env, companyDatabase, options, record)

  const needEntities = options.schemaDiff !== false || files.some(file => file.kind === 'cjs')
  const ds = await openDataSource(env, database, needEntities)
  try {
    const rowsBefore = await ledgerRows(ds)
    const status = ledgerStatus(files, rowsBefore)
    if (status.changed.length) throw new Error('ملفات مطبقة تغيّر محتواها (لا تعدّل ملفًا مطبقًا؛ أضف ملفًا جديدًا): ' + status.changed.join(', '))
    if (status.unknown.length) throw new Error('الدفتر فيه إصدارات بلا ملفات: ' + status.unknown.join(', '))
    record.pendingBefore = status.pending.map(file => file.relative)
    const countsBefore = await tableCounts(ds)
    const columnsBefore = await columnList(ds)

    // بروفة كاملة داخل معاملة واحدة ثم تراجع: أي خطأ أو مخالفة يوقف كل شيء قبل أول تغيير فعلي
    if (status.pending.length && (mode === 'company' ? options.trial !== false : options.trial === true)) {
      const qr = ds.createQueryRunner(); await qr.connect(); await qr.startTransaction()
      const trialStarted = Date.now()
      try {
        await batch(ds, qr, 'SET XACT_ABORT ON;')
        await batch(ds, qr, LOCK_SQL)
        for (const file of status.pending) await runGuardedFile(ds, qr, file, { database, mode: 'trial' })
        record.trial = { passed: true, files: status.pending.length, ms: Date.now() - trialStarted }
      } finally {
        if (qr.isTransactionActive) { try { await qr.rollbackTransaction() } catch { /* XACT_ABORT تراجع بالفعل */ } }
        await qr.release()
      }
    }

    if (mode === 'company' && !options.allowLiveApi && status.pending.length) {
      const master = await masterPool(env)
      try {
        const sessions = await otherSessions(master, companyDatabase)
        if (sessions.length) throw new Error('وضع الشركة موقوف بعد البروفة: جلسات أخرى اتصلت بالقاعدة: ' + sessions.map(s => `${s.program}×${s.n}`).join(', '))
      } finally { await master.close() }
    }

    await ensureLedger(ds)
    record.applied = []; record.skipped = []
    for (const file of status.pending) {
      const qr = ds.createQueryRunner(); await qr.connect(); await qr.startTransaction()
      const fileStarted = Date.now()
      try {
        await batch(ds, qr, 'SET XACT_ABORT ON;')
        await batch(ds, qr, LOCK_SQL)
        const prior = await qr.query(`SELECT checksum FROM dbo.${LEDGER} WHERE version=@0`, [file.version])
        if (prior.length) {
          if (prior[0].checksum !== file.checksum) throw new Error(`${file.relative}: طبّقه مُرحّل آخر بمحتوى مختلف`)
          record.skipped.push(file.relative)
          await qr.commitTransaction()
          continue
        }
        const outcome = await runGuardedFile(ds, qr, file, { database, mode })
        await qr.query(`INSERT INTO dbo.${LEDGER} (version, checksum, scope) VALUES (@0, @1, @2)`, [file.version, file.checksum, file.scope])
        await qr.commitTransaction()
        record.applied.push({ file: file.relative, scope: file.scope, checksum: file.checksum, ms: Date.now() - fileStarted, ...outcome })
        if (!options.quiet) console.log(`✔ ${file.relative} (${Date.now() - fileStarted}ms)`)
      } catch (error) {
        if (qr.isTransactionActive) { try { await qr.rollbackTransaction() } catch { /* تراجع تلقائي */ } }
        record.failed = { file: file.relative, error: String(error.message).slice(0, 2000) }
        break
      } finally { await qr.release() }
    }

    const rowsAfter = await ledgerRows(ds)
    record.ledger = (rowsAfter || []).map(row => ({ version: row.version, scope: row.scope, checksum: row.checksum, appliedAt: row.appliedAt }))
    const afterStatus = ledgerStatus(files, rowsAfter)
    record.ledgerComplete = afterStatus.pending.length === 0 && afterStatus.changed.length === 0
    const countsAfter = await tableCounts(ds)
    const columnsAfter = await columnList(ds)
    record.rowCounts = { before: countsBefore, after: countsAfter, differences: compareCounts(countsBefore, countsAfter) }
    record.columns = { added: columnsAfter.filter(c => !columnsBefore.includes(c)), removedOrRenamed: columnsBefore.filter(c => !columnsAfter.includes(c)) }
    if (options.schemaDiff !== false) {
      const diff = await schemaDiff(ds)
      record.schemaDiffCount = diff.length
      record.schemaDiff = diff.slice(0, 60)
    }
    record.finishedAt = new Date().toISOString()
    record.ok = !record.failed && record.ledgerComplete && (options.schemaDiff === false || record.schemaDiffCount === 0)
    return record
  } finally { await ds.destroy() }
}

async function verify(options = {}) {
  const record = await plan(options)
  record.command = 'verify'
  record.ok = !record.problems.length && record.pendingCount === 0 && record.schemaDiffCount === 0
  return record
}

// استعادة ملف نسخة (داخل الحاوية) في قاعدة مؤقتة hr_migrate_rehearsal_* جديدة
async function restoreCopy(master, sqlPath, database) {
  if (!REHEARSAL_DATABASE.test(database) && !DISPOSABLE_DATABASE.test(database)) throw new Error('الاستعادة مسموحة لقاعدة مؤقتة فقط')
  const exists = await master.request().input('d', database).query('SELECT DB_ID(@d) AS id')
  if (exists.recordset[0].id) throw new Error('اسم القاعدة المؤقتة مستخدم')
  const files = (await master.request().input('p', sqlPath).query('RESTORE FILELISTONLY FROM DISK = @p')).recordset
  const dataDir = (await master.request().query("SELECT CAST(SERVERPROPERTY('InstanceDefaultDataPath') AS nvarchar(400)) AS dir")).recordset[0].dir
  const sep = dataDir.includes('/') ? '/' : '\\'
  const req = master.request().input('p', sqlPath)
  const moves = files.map((file, index) => {
    req.input(`l${index}`, file.LogicalName)
    req.input(`f${index}`, dataDir.replace(/[\\/]+$/, '') + sep + `${database}_${index}${file.Type === 'L' ? '.ldf' : '.mdf'}`)
    return `MOVE @l${index} TO @f${index}`
  })
  await req.query(`RESTORE DATABASE ${quoteName(database)} FROM DISK = @p WITH ${moves.join(', ')}, RECOVERY`)
}

async function dropCopy(master, database) {
  if (!REHEARSAL_DATABASE.test(database) && !DISPOSABLE_DATABASE.test(database)) throw new Error('الحذف مسموح لقاعدة مؤقتة فقط')
  await master.request().query(`IF DB_ID(N'${database}') IS NOT NULL BEGIN ALTER DATABASE ${quoteName(database)} SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE ${quoteName(database)}; END`)
}

const rehearsalName = () => `hr_migrate_rehearsal_${utcStamp()}_${crypto.randomBytes(4).toString('hex')}`

// نسخة مؤقتة داخل الحاوية من القاعدة الحالية (للبروفة فقط؛ لا تُنسخ للجهاز وتُزال بعد الاستعادة)
async function stageLiveCopy(master, database) {
  const dataDir = await sqlBackupDir(master)
  const sqlPath = sqlJoin(dataDir, `migrate_rehearsal_source_${utcStamp()}_${crypto.randomBytes(4).toString('hex')}.bak`)
  await master.request().input('p', sqlPath).query(`BACKUP DATABASE ${quoteName(database)} TO DISK = @p WITH COPY_ONLY, CHECKSUM, INIT, FORMAT`)
  await master.request().input('p', sqlPath).query('RESTORE VERIFYONLY FROM DISK = @p WITH CHECKSUM')
  const [header] = (await master.request().input('p', sqlPath).query('RESTORE HEADERONLY FROM DISK = @p')).recordset
  return { sqlPath, staged: true, source: 'live', databaseName: header.DatabaseName, backupFinishDate: header.BackupFinishDate, checksums: true, verifyOnly: 'passed' }
}

// بروفة: --from live (افتراضي: نسخة جديدة من hr_system الحالية — تطبق المعلق فقط) أو --from baseline (نقطة ما قبل الرواتب — كل السلسلة)
async function rehearse(options = {}) {
  const { env } = runtime()
  const companyDatabase = env.DB_DATABASE
  const from = options.from || 'live'
  if (!['live', 'baseline'].includes(from)) throw new Error('--from live | baseline')
  const database = rehearsalName()
  const master = await masterPool(env)
  let backup, restored = false
  try {
    if (from === 'baseline') {
      process.env.HR_KEEP_STAGED_BACKUP = '1'
      try { backup = await verifyCompanyBackup(master, companyDatabase, options.backupPath || options.baselinePath) } finally { delete process.env.HR_KEEP_STAGED_BACKUP }
    } else backup = await stageLiveCopy(master, companyDatabase)
    await restoreCopy(master, backup.sqlPath, database)
    restored = true
    if (from === 'live') { sqlRemoveFile(backup.sqlPath); backup.staged = false }
    const record = await apply({ ...options, database, company: false, recordCommand: 'rehearse', trial: options.trial ?? true })
    record.from = from
    record.backup = backup
    return record
  } finally {
    if (backup?.staged) sqlRemoveFile(backup.sqlPath)
    if (restored && !options.keep) { try { await dropCopy(master, database) } catch (error) { console.error(`تعذر حذف قاعدة البروفة ${database}: ${error.message}`) } }
    await master.close()
  }
}

function summary(record) {
  const lines = [`${record.command} → ${record.database} (${record.mode})${record.from ? ` from ${record.from}` : ''}`]
  if (record.baselineBackup) lines.push(`  baseline backup: ${record.baselineBackup.hostPath} sha256=${record.baselineBackup.sha256.slice(0, 16)}… verifyOnly=${record.baselineBackup.verifyOnly}`)
  if (record.backup) lines.push(`  ${record.backup.taken ? 'freeze backup (taken now)' : 'backup'}: ${record.backup.hostPath || record.backup.sqlPath}${record.backup.sha256 ? ` sha256=${record.backup.sha256.slice(0, 16)}…` : ''} finished=${new Date(record.backup.backupFinishDate).toISOString()} verifyOnly=${record.backup.verifyOnly} checksums=${record.backup.checksums}`)
  if (record.backupFreshness) lines.push(`  backup is current: ${record.backupFreshness.problems.length ? 'NO — ' + record.backupFreshness.problems.join('؛ ') : 'yes (no ledger entry, write or server restart after it)'}`)
  if (record.trial) lines.push(`  trial (rolled back): ${record.trial.passed ? 'passed' : 'failed'} ${record.trial.files} files ${record.trial.ms}ms`)
  if (record.applied) lines.push(`  applied: ${record.applied.length}, skipped: ${record.skipped.length}`)
  for (const item of record.applied || []) if (item.guard) lines.push(`    ${path.basename(item.file)}: guard ok (${item.guard.tables} tables, ${item.guard.keyRowsChecked} existing rows kept${item.guard.renamedColumns.length ? `, renamed ${item.guard.renamedColumns.length}` : ''}${item.guard.widenedColumns.length ? `, widened ${item.guard.widenedColumns.length}` : ''})`)
  if (record.failed) lines.push(`  FAILED: ${record.failed.file}: ${record.failed.error}`)
  if (record.problems?.length) lines.push('  problems:\n    - ' + record.problems.join('\n    - '))
  if ('pendingCount' in record) lines.push(`  applied files: ${record.appliedCount}, pending: ${record.pendingCount}`)
  if (record.ledger) lines.push(`  ledger rows: ${record.ledger.length}, complete: ${record.ledgerComplete}`)
  if (record.rowCounts) lines.push(`  row-count differences: ${record.rowCounts.differences.length}` + record.rowCounts.differences.map(d => `\n    ${d.table}: ${d.before} → ${d.after} (${d.kind})`).join(''))
  if (record.columns) lines.push(`  columns added: ${record.columns.added.length}, removed/renamed: ${record.columns.removedOrRenamed.join(', ') || 0}`)
  lines.push(`  schema diff: ${record.schemaDiffCount ?? 'n/a'} queries` + (record.schemaDiff?.length ? '\n    ' + record.schemaDiff.slice(0, 20).map(q => q.slice(0, 200)).join('\n    ') : ''))
  if ('ok' in record) lines.push(`  result: ${record.ok ? 'OK' : 'NOT OK'}`)
  return lines.join('\n')
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  let record
  if (options.command === 'plan') record = await plan(options)
  else if (options.command === 'verify') record = await verify(options)
  else if (options.command === 'apply') record = await apply(options)
  else if (options.command === 'rehearse') record = await rehearse(options)
  else throw new Error('الأوامر: plan | rehearse | apply --company | verify')
  if (['apply', 'rehearse'].includes(options.command)) record.recordFile = writeRecord(record)
  console.log(summary(record))
  if (record.recordFile) console.log(`  record: ${record.recordFile}`)
  if (record.ok === false || record.problems?.length) process.exitCode = 1
}

module.exports = { stripComments, splitBatches, splitStatements, executionUnits, LEGACY_STATEMENT_FILES, forbiddenStatements, forbiddenScript, scanJavaScript,
  droppedPermanentTables, foldLiteralConcatenation, columnChangeProblem, backupFreshnessProblems, throwCodes, duplicateThrowCodes, discover, analyze, classifyTarget,
  ledgerStatus, compareCounts, plan, apply, verify, rehearse, runtime, masterPool, openDataSource, verifyCompanyBackup, takeCompanyBackup, databaseWriteState,
  restoreCopy, dropCopy, rehearsalName, stageLiveCopy, docker, sqlIsNative, sqlVisibleSha, sqlPutFile, sqlGetFile, sqlRemoveFile, fileSha256, DISPOSABLE_DATABASE, REHEARSAL_DATABASE, LEDGER, COMPANY_BACKUP, FREEZE_BACKUP_DIR, SQL_CONTAINER, APP_NAME }

if (require.main === module) {
  main().catch(error => {
    const { env } = runtimeCache || {}
    const message = String(error && error.message || error)
    console.error('ERROR: ' + (env?.DB_PASSWORD ? message.split(env.DB_PASSWORD).join('***') : message))
    process.exitCode = 1
  })
}
