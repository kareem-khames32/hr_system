'use strict'
// ===== فحوص حفظ البيانات الأربعة عشر (SHA-256) لترحيلات 004-006 على قاعدة الشركة =====
// نفس ثوابت api/scripts/migrations-data-check.cjs (المكتوب لنسخة المراجعة فقط)، مع ثلاث مقارنات:
//   1) before: نسخة مستعادة من نقطة الأساس قبل الرواتب (غير مترحّلة) — القيم القديمة محوّلة لما يجب أن تصبحه
//   2) after:  نفس النسخة بعد تطبيق كل الترحيلات بالمُرحّل المجمّع — يثبت أن التحويلات حافظة
//   3) live:   hr_system الحالية (قراءة فقط) مقيدة بصفوف وأعمدة الأساس نفسها — أي فرق يُذكر بمعرفات الصفوف فقط
// ويضيف: إثبات أن نسخ 013 المؤرخة لم تغيّر قيمة داخل فترة مقفلة، وكتابات الإقلاع (أسماء مفاتيح وأكواد فقط).
// لا يُخزن أي قيمة شخصية أو بنكية: بصمات وأعداد ومعرفات صفوف وأسماء أعمدة/مفاتيح.
// التشغيل: node api/scripts/db-data-invariants.cjs [--keep]
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const migrate = require('./db-migrate.cjs')

const repoRoot = path.resolve(__dirname, '..', '..')
const sha = value => crypto.createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex')
const PAIRS = { transfers: [['fromTeam', 'fromTeamId'], ['toTeam', 'toTeamId']], custody_assignments: [['assignedBy', 'assignedByEmployeeId']],
  offboarding_cases: [['openedBy', 'openedByUserId'], ['settlementApprovedBy', 'settlementApprovedByUserId']],
  clearance_items: [['doneBy', 'doneByUserId']], onboarding_tasks: [['doneBy', 'doneByUserId']] }
const PRESERVED = ['requests', 'request_types', 'approval_chains', 'approval_steps', 'request_approvals']
const REWRITTEN_REQUEST_COLUMNS = ['typeCode', 'definitionCode', 'payload']

function pool(env, database) {
  const { mssql } = migrate.runtime()
  return new mssql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME || 'sa', password: env.DB_PASSWORD, database,
    options: { encrypt: false, trustServerCertificate: true, appName: 'HR Data Invariants (read-only)' }, connectionTimeout: 15000, requestTimeout: 300000 }).connect()
}
const rows = async (p, text) => (await p.request().query(text)).recordset
const ident = name => `[${String(name).replace(/]/g, ']]')}]`
async function columnsOf(p, table) {
  return (await rows(p, `SELECT c.name FROM sys.columns c WHERE c.object_id = OBJECT_ID(N'dbo.${table}') ORDER BY c.column_id`)).map(r => r.name)
}

// كل ثابت = قائمة [id, بصمة الصف]؛ البصمة الإجمالية = sha256 للقائمة بترتيب id
function invariant(list) { return { hash: sha(list.map(([id, rowHash]) => `${id}:${rowHash}`).join('\n')), rows: new Map(list) } }

async function computeInvariants(p, mode, baseline) {
  const { maskedIban } = require('../src/employees/employee-change-log')
  const keep = (table, id) => !baseline || baseline.ids[table]?.has(Number(id))
  const out = {}, ids = {}, columns = {}
  const history = (await rows(p, 'SELECT * FROM dbo.employee_status_history ORDER BY id')).filter(r => keep('employee_status_history', r.id))
  ids.employee_status_history = new Set(history.map(r => Number(r.id)))
  out.historyIdentityDates = invariant(history.map(r => [r.id, sha([r.id, r.employeeId, r.requestId, r.changedAt])]))
  out.historyReasons = invariant(history.map(r => {
    let reason = r.reason
    if (mode === 'before' && /^iban:/i.test(r.newStatus || '')) for (const raw of [r.oldStatus, r.newStatus]) {
      const value = raw?.replace(/^iban:/i, '').trim()
      if (value) reason = reason?.split(value).join(maskedIban(value) ?? value)
    }
    return [r.id, sha([r.id, reason])]
  }))
  out.historyBankValues = invariant(history.filter(r => r.fieldName === 'iban' || /^iban:/i.test(r.newStatus || '')).map(r => {
    if (!r.changeType) return [r.id, sha([r.id, ...[r.oldStatus, r.newStatus].map(v => { const value = v?.replace(/^iban:/i, '').trim(); return value === '—' ? value : maskedIban(value) })])]
    return [r.id, sha([r.id, r.oldValue == null ? null : JSON.parse(r.oldValue), r.newValue == null ? null : JSON.parse(r.newValue)])]
  }))
  const workTypes = (await rows(p, 'SELECT id, workType FROM dbo.employees ORDER BY id')).filter(r => keep('employees', r.id))
  ids.employees = new Set(workTypes.map(r => Number(r.id)))
  out.workTypes = invariant(workTypes.map(r => [r.id, sha([r.id, mode === 'before' ? (r.workType === 'fulltime' ? 'full_time' : r.workType === 'parttime' ? 'part_time' : r.workType) : r.workType])]))
  for (const [table, pairs] of Object.entries(PAIRS)) {
    const present = await columnsOf(p, table)
    const selection = pairs.map(([old, canonical]) => `${ident(present.includes(canonical) ? canonical : old)} AS ${ident(canonical)}`)
    const data = (await rows(p, `SELECT id, ${selection.join(', ')} FROM dbo.${ident(table)} ORDER BY id`)).filter(r => keep(table, r.id))
    ids[table] = new Set(data.map(r => Number(r.id)))
    out[`${table}IdentityValues`] = invariant(data.map(r => [r.id, sha(r)]))
  }
  for (const table of PRESERVED) {
    const present = await columnsOf(p, table)
    const wanted = (baseline ? baseline.columns[table] : present).filter(c => present.includes(c) && !(table === 'requests' && REWRITTEN_REQUEST_COLUMNS.includes(c)))
    columns[table] = wanted
    const data = (await rows(p, `SELECT ${wanted.map(ident).join(', ')} FROM dbo.${ident(table)} ORDER BY id`)).filter(r => keep(table, r.id))
    ids[table] = new Set(data.map(r => Number(r.id)))
    out[`${table}PreservedFields`] = invariant(data.map(r => [r.id, sha(r)]))
  }
  return { invariants: out, ids, columns }
}

function compare(base, other) {
  const result = {}
  for (const [name, value] of Object.entries(base.invariants)) {
    const now = other.invariants[name]
    if (now.hash === value.hash) { result[name] = { passed: true, rows: value.rows.size }; continue }
    const differingIds = [...value.rows.keys()].filter(id => now.rows.get(id) !== value.rows.get(id))
    result[name] = { passed: false, rows: value.rows.size, differingIds, missingIds: differingIds.filter(id => !now.rows.has(id)) }
  }
  return result
}

// 013 استدعى finishCalendarChange مباشرة (بلا assertCalendarPeriodOpen): نثبت أن النسخة المؤرخة = القيم السابقة نفسها
async function datedVersionLockProof(p) {
  // الغلاف {schemaVersion, data, contentHash}: البصمة تشمل رقم النسخة وتاريخ السريان، فالمقارنة على data (القيم) فقط
  const strip = snapshot => JSON.stringify(JSON.parse(snapshot).data)
  const versions = await rows(p, `SELECT v1.sourceType, v1.sourceId, CONVERT(varchar(10), v1.effectiveFrom, 23) AS effectiveFrom, v0.snapshot AS baseline, v1.snapshot AS dated
    FROM dbo.attendance_rule_versions v1 JOIN dbo.attendance_rule_versions v0 ON v0.sourceType = v1.sourceType AND v0.sourceId = v1.sourceId AND v0.version = 0
    WHERE v1.version = 1 AND v1.reason LIKE N'ترحيل 20260914_013%' AND v1.sourceType IN ('CALENDAR_GLOBAL', 'CALENDAR_BRANCH', 'EMPLOYEE_ORG')`)
  const bySource = {}
  const differing = []
  for (const v of versions) {
    bySource[v.sourceType] = bySource[v.sourceType] || { versions: 0, equalToBaseline: 0 }
    bySource[v.sourceType].versions++
    if (strip(v.baseline) === strip(v.dated)) bySource[v.sourceType].equalToBaseline++
    else differing.push(`${v.sourceType}:${v.sourceId}`)
  }
  const effectiveFrom = versions[0]?.effectiveFrom ?? null
  const settled = effectiveFrom ? await rows(p, `SELECT c.id AS caseId, c.employeeId, CONVERT(varchar(10), c.lastWorkingDay, 23) AS lastWorkingDay, c.status
    FROM dbo.offboarding_cases c WHERE c.status IN ('SETTLED', 'CLOSED') AND c.lastWorkingDay >= '${effectiveFrom}' ORDER BY c.id`) : []
  const employeeOrg = new Map(versions.filter(v => v.sourceType === 'EMPLOYEE_ORG').map(v => [Number(v.sourceId), strip(v.baseline) === strip(v.dated)]))
  const lockedRuns = await rows(p, `SELECT COUNT(*) AS n FROM dbo.payroll_runs WHERE status IN ('APPROVED', 'PAID')`)
  const lateJoiners = effectiveFrom ? await rows(p, `SELECT COUNT(*) AS n, CONVERT(varchar(10), MAX(joinDate), 23) AS latest FROM dbo.employees WHERE joinDate > '${effectiveFrom}'`) : [{ n: 0 }]
  return { effectiveFrom, bySource, differingSources: differing, approvedOrPaidRuns: Number(lockedRuns[0].n),
    settledCasesInsideDatedRange: settled.map(c => ({ ...c, employeeOrgVersionEqualsBaseline: employeeOrg.get(Number(c.employeeId)) ?? null })),
    employeesJoiningAfterEffectiveFrom: { count: Number(lateJoiners[0].n), latestJoinDate: lateJoiners[0].latest ?? null } }
}

// كتابات الإقلاع منذ نقطة الأساس: أسماء مفاتيح/أكواد وأعداد فقط
async function bootWrites(baselinePool, livePool) {
  const keys = async p => new Set((await rows(p, 'SELECT [key] FROM dbo.requests_config')).map(r => r.key))
  const codes = async p => new Set((await rows(p, 'SELECT code FROM dbo.doc_types')).map(r => r.code))
  const count = async (p, table) => (await rows(p, `IF OBJECT_ID(N'dbo.${table}') IS NULL SELECT CAST(NULL AS int) AS n ELSE SELECT COUNT(*) AS n FROM dbo.${ident(table)}`))[0].n
  const baseKeys = await keys(baselinePool), liveKeys = await keys(livePool)
  const baseCodes = await codes(baselinePool), liveCodes = await codes(livePool)
  const counts = {}
  for (const table of ['requests_config', 'doc_types', 'letter_templates', 'letter_template_revisions', 'letter_template_bindings', 'attendance_days', 'requests', 'employees', 'hr_issued_documents'])
    counts[table] = { baseline: await count(baselinePool, table), live: await count(livePool, table) }
  const maxRequest = (await rows(baselinePool, 'SELECT MAX(id) AS id FROM dbo.requests'))[0].id
  return { requestsConfigKeysAdded: [...liveKeys].filter(k => !baseKeys.has(k)).sort(), requestsConfigKeysRemoved: [...baseKeys].filter(k => !liveKeys.has(k)).sort(),
    docTypeCodesAdded: [...liveCodes].filter(c => !baseCodes.has(c)).sort(), counts,
    requestsCreatedAfterBaseline: (await rows(livePool, `SELECT id, status FROM dbo.requests WHERE id > ${Number(maxRequest)} ORDER BY id`)) }
}

const serialize = result => Object.fromEntries(Object.entries(result).map(([k, v]) => [k, v]))
const hashes = computed => Object.fromEntries(Object.entries(computed.invariants).map(([k, v]) => [k, v.hash]))

async function main() {
  const { env } = migrate.runtime()
  const keep = process.argv.includes('--keep')
  const companyDatabase = env.DB_DATABASE
  const master = await migrate.masterPool(env)
  const database = migrate.rehearsalName()
  let restored = false, basePool, livePool
  const record = { command: 'invariants', database: companyDatabase, rehearsal: database, startedAt: new Date().toISOString(),
    note: 'SHA-256 وأعداد ومعرفات صفوف فقط؛ لا قيم شخصية أو بنكية' }
  try {
    process.env.HR_KEEP_STAGED_BACKUP = '1'
    let backup
    try { backup = await migrate.verifyCompanyBackup(master, companyDatabase, migrate.COMPANY_BACKUP) } finally { delete process.env.HR_KEEP_STAGED_BACKUP }
    record.baselineBackup = { hostPath: backup.hostPath, sha256: backup.sha256, backupFinishDate: backup.backupFinishDate, verifyOnly: backup.verifyOnly }
    await migrate.restoreCopy(master, backup.sqlPath, database)
    restored = true
    if (backup.staged) { try { migrate.docker(['exec', '-u', '0', migrate.SQL_CONTAINER, 'rm', '-f', backup.sqlPath]) } catch { /* ملف مؤقت */ } }

    basePool = await pool(env, database)
    const before = await computeInvariants(basePool, 'before')
    const baseline = { ids: before.ids, columns: before.columns }
    // كتابات الإقلاع تُقارن مع نسخة الأساس قبل ترحيلها (نفس أسماء الجداول القديمة)
    livePool = await pool(env, companyDatabase)
    record.bootWrites = await bootWrites(basePool, livePool)
    await basePool.close(); basePool = null

    const applied = await migrate.apply({ database, company: false, schemaDiff: false, quiet: true, trial: false })
    record.rehearsalApply = { ok: applied.ok, applied: applied.applied.length, failed: applied.failed ?? null }
    if (!applied.ok) throw new Error('تعذر ترحيل نسخة الأساس: ' + JSON.stringify(applied.failed))

    basePool = await pool(env, database)
    const afterMigration = await computeInvariants(basePool, 'after', baseline)
    const live = await computeInvariants(livePool, 'after', baseline)
    record.hashes = { before: hashes(before), afterMigration: hashes(afterMigration), live: hashes(live) }
    record.migrationPreservesData = compare(before, afterMigration)
    record.liveMatchesBaseline = compare(before, live)
    record.datedVersionLockProof = await datedVersionLockProof(livePool)
    record.invariantCount = Object.keys(before.invariants).length
    record.passedMigration = Object.values(record.migrationPreservesData).every(r => r.passed)
    record.passedLive = Object.values(record.liveMatchesBaseline).every(r => r.passed)
  } finally {
    if (basePool) await basePool.close()
    if (livePool) await livePool.close()
    if (restored && !keep) { try { await migrate.dropCopy(master, database) } catch (error) { console.error(`تعذر حذف ${database}: ${error.message}`) } }
    await master.close()
  }
  record.finishedAt = new Date().toISOString()
  const dir = path.join(repoRoot, 'docs', 'migrations', 'runs')
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}_invariants_${companyDatabase}.json`)
  fs.writeFileSync(file, JSON.stringify(serialize(record), null, 2) + '\n')
  console.log(`invariants: ${record.invariantCount}`)
  for (const [name, r] of Object.entries(record.migrationPreservesData)) console.log(`  migration ${r.passed ? 'OK  ' : 'DIFF'} ${name} (${r.rows} rows)${r.passed ? '' : ` ids: ${r.differingIds.slice(0, 20).join(',')}`}`)
  for (const [name, r] of Object.entries(record.liveMatchesBaseline)) console.log(`  live      ${r.passed ? 'OK  ' : 'DIFF'} ${name} (${r.rows} rows)${r.passed ? '' : ` ids: ${r.differingIds.slice(0, 20).join(',')} missing: ${r.missingIds.length}`}`)
  console.log('  dated versions:', JSON.stringify(record.datedVersionLockProof.bySource), 'differing:', record.datedVersionLockProof.differingSources.length,
    'approved/paid runs:', record.datedVersionLockProof.approvedOrPaidRuns, 'settled cases in range:', record.datedVersionLockProof.settledCasesInsideDatedRange.length)
  console.log('  boot writes: config keys +', record.bootWrites.requestsConfigKeysAdded.length, 'doc types +', record.bootWrites.docTypeCodesAdded.length)
  console.log(`  record: ${path.relative(repoRoot, file).split(path.sep).join('/')}`)
  console.log(`  result: migration ${record.passedMigration ? 'OK' : 'NOT OK'}, live ${record.passedLive ? 'OK' : 'DIFFERENCES LISTED'}`)
  if (!record.passedMigration) process.exitCode = 1
}

if (require.main === module) {
  main().catch(error => {
    const { env } = migrate.runtime()
    console.error('ERROR: ' + String(error?.message || error).split(env.DB_PASSWORD || ' ').join('***'))
    process.exitCode = 1
  })
}

module.exports = { computeInvariants, compare, datedVersionLockProof }
