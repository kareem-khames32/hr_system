'use strict'
const { fs, path, crypto, sql, apiRoot, pool, dataSource, reviewGuard, identifier, schemaSnapshot, checksum, artifactPath, excludedTables } = require('./migrations-lib.cjs')
// Reviewed, value-preserving identity renames. TypeORM may express multiple
// renames on one table as DROP+ADD; we execute explicit sp_rename SQL instead.
const columnRenames = {
  transfers: { fromTeam: 'fromTeamId', toTeam: 'toTeamId' },
  custody_assignments: { assignedBy: 'assignedByEmployeeId' },
  offboarding_cases: { openedBy: 'openedByUserId', settlementApprovedBy: 'settlementApprovedByUserId' },
  clearance_items: { doneBy: 'doneByUserId' }, onboarding_tasks: { doneBy: 'doneByUserId' },
  leaves: { leaveType: 'leaveTypeCode' }, leave_types: { balanceSource: 'balanceType' },
}
const reviewedDataVersions = new Set(['20260911_005_pre_payroll_history_work_type_data.sql', '20260911_006_pre_payroll_leave_request_names.sql'])
function migrations() {
  const dir = path.resolve(apiRoot, '../docs/migrations')
  return fs.readdirSync(dir).filter(name => /^\d{8}_\d{3}_pre_payroll_[a-z_]+\.sql$/.test(name)).sort().map(name => {
    const content = fs.readFileSync(path.join(dir, name), 'utf8')
    const checkedContent = name === '20260911_006_pre_payroll_leave_request_names.sql'
      ? content.replace(/\bDROP\s+TABLE\s+#leave_requests\s*;/gi, '') : content
    if (/\b(?:DROP\s+TABLE|DROP\s+COLUMN|TRUNCATE|DELETE\s+FROM)\b/i.test(checkedContent) ||
      (/\bUPDATE\b/i.test(content) && !reviewedDataVersions.has(name)) ||
      excludedTables.some(table => new RegExp('\\b' + table + '\\b', 'i').test(content))) {
      throw new Error('Destructive/data/payroll operation rejected in ' + name)
    }
    return { version: name.replace(/\.sql$/, ''), content, checksum: checksum(content) }
  })
}
function classify(query, snapshot, metadata) {
  const rename = query.match(/^EXEC sp_rename "[^"]*\.dbo\.([^.]+)\.([^"]+)", "([^"]+)"/i)
  if (rename && columnRenames[rename[1]]?.[rename[2]] === rename[3]) return { kind: 'reviewed-identity-rename', requiresDataDecision: false }
  const dropAlias = query.match(/^ALTER TABLE "([^"]+)" DROP COLUMN "([^"]+)"/i)
  if (dropAlias && columnRenames[dropAlias[1]]?.[dropAlias[2]]) return {
    kind: 'rename-only-never-execute-generated-drop', requiresDataDecision: false,
  }
  if (/^CREATE (?:TABLE|(?:UNIQUE )?INDEX) /i.test(query)) return { kind: 'additive', requiresDataDecision: false }
  if (/^ALTER TABLE .* ADD /i.test(query)) {
    const match = query.match(/^ALTER TABLE "([^"]+)" ADD "([^"]+)"/i)
    const target = match?.[1]
    const column = metadata.find(m => m.tableName === target)?.columns.find(c => c.databaseName === match?.[2])
    const rows = snapshot.counts.find(row => row.table === target)?.rows || 0
    const nullAllowed = column?.isNullable === true
    const oldName = Object.entries(columnRenames[target] || {}).find(([,canonical]) => canonical === match?.[2])?.[0]
    const renameExisting = oldName && snapshot.columns.some(c => c.table === target && c.column === oldName)
    const knownZeroLayer = target === 'leave_balances' && /"adjustmentDays" decimal\(8,2\) NOT NULL .* DEFAULT 0/i.test(query)
    return { kind: renameExisting ? 'rename-only-no-backfill' : 'add-column', rows, requiresDataDecision: !column || (rows > 0 && !nullAllowed && !knownZeroLayer && !renameExisting) }
  }
  if (/^ALTER TABLE "public_holidays" DROP CONSTRAINT /i.test(query)) return { kind: 'remove-holiday-country-default', requiresDataDecision: false }
  return { kind: 'manual-review-required', requiresDataDecision: true }
}
async function inspect(database) {
  const p = await pool(database)
  let ds
  try {
    const snapshot = await schemaSnapshot(p)
    const dataReview = (await p.request().query(`SELECT
      (SELECT COUNT(*) FROM dbo.employees WHERE workType IS NOT NULL AND workType NOT IN
       (N'fulltime',N'parttime',N'full_time',N'part_time',N'contract',N'consultant',N'intern')) AS unknownWorkTypes,
      (SELECT COUNT(*) FROM dbo.employees WHERE workType IN(N'fulltime',N'parttime')) AS legacyWorkTypes,
      (SELECT COUNT(*) FROM dbo.employee_status_history WHERE CHARINDEX(':',newStatus)>0 AND CHARINDEX(':',oldStatus)>0
       AND LEFT(newStatus,CHARINDEX(':',newStatus)-1)<>LEFT(oldStatus,CHARINDEX(':',oldStatus)-1)) AS mismatchedHistoryPrefixes,
      (SELECT COUNT(*) FROM dbo.employee_status_history WHERE newStatus LIKE N'iban:%') AS legacyBankHistories;`)).recordset[0]
    const hasDefinition = snapshot.columns.some(c => c.table === 'requests' && c.column === 'definitionCode')
    const definition = hasDefinition ? "NULLIF(r.definitionCode,N'')" : 'CAST(NULL AS nvarchar(50))'
    const leaveDataReview = (await p.request().query(`WITH leaveRows AS (
      SELECT r.status,r.typeCode,${definition} AS definitionCode,t.code AS profileCode,
        CASE WHEN t.code LIKE N'LEAVE[_]%' AND t.code<>N'LEAVE_MODIFY_CANCEL' THEN SUBSTRING(t.code,7,50) ELSE NULL END AS fixedCode,
        CASE WHEN ISJSON(CAST(r.payload AS nvarchar(max)))=1 THEN CAST(r.payload AS nvarchar(max)) ELSE N'{}' END AS validPayload,
        CASE WHEN r.payload IS NOT NULL AND LTRIM(RTRIM(CAST(r.payload AS nvarchar(max))))<>N'' AND ISJSON(CAST(r.payload AS nvarchar(max)))<>1 THEN 1 ELSE 0 END AS badJson
      FROM dbo.requests r LEFT JOIN dbo.request_types t ON t.code=COALESCE(${definition},r.typeCode)
      WHERE t.destinationHandler IN(N'leave_deduct_balance',N'leave_no_balance',N'leave_calendar',N'leave_calendar_balance',N'leave_calendar_once',N'leave_calendar_payroll')
        OR r.typeCode=N'LEAVE' OR (t.code IS NULL AND r.typeCode LIKE N'LEAVE[_]%' AND r.typeCode<>N'LEAVE_MODIFY_CANCEL')
    ), codes AS (
      SELECT *,JSON_VALUE(validPayload,'$.leaveTypeCode') AS canonicalCode,JSON_VALUE(validPayload,'$.leaveType') AS legacyCode FROM leaveRows
    ) SELECT COUNT(*) AS rowsToReview,
      COALESCE(SUM(badJson),0) AS invalidJson,
      COALESCE(SUM(CASE WHEN profileCode IS NULL THEN 1 ELSE 0 END),0) AS missingProfiles,
      COALESCE(SUM(CASE WHEN typeCode<>N'LEAVE' AND definitionCode IS NOT NULL AND typeCode<>definitionCode THEN 1 ELSE 0 END),0) AS conflictingDefinitions,
      COALESCE(SUM(CASE WHEN canonicalCode IS NOT NULL AND legacyCode IS NOT NULL AND canonicalCode<>legacyCode THEN 1 ELSE 0 END),0) AS conflictingAliases,
      COALESCE(SUM(CASE WHEN fixedCode IS NOT NULL AND COALESCE(canonicalCode,legacyCode,fixedCode)<>fixedCode THEN 1 ELSE 0 END),0) AS profileCodeConflicts,
      COALESCE(SUM(CASE WHEN status<>N'DRAFT' AND NULLIF(COALESCE(canonicalCode,legacyCode,fixedCode),N'') IS NULL THEN 1 ELSE 0 END),0) AS missingSubmittedCodes,
      COALESCE(SUM(CASE WHEN LEN(COALESCE(canonicalCode,legacyCode,fixedCode))>50 THEN 1 ELSE 0 END),0) AS oversizedCodes
    FROM codes;`)).recordset[0]
    const exists = (await p.request().query("SELECT OBJECT_ID(N'dbo.app_schema_migrations',N'U') AS id")).recordset[0].id
    const ledger = exists ? (await p.request().query('SELECT version,checksum,scope,appliedAt FROM dbo.app_schema_migrations ORDER BY version')).recordset : []
    ds = await dataSource(database)
    const diff = await ds.driver.createSchemaBuilder().log()
    return { snapshot, ledger, dataReview, leaveDataReview, pending: diff.upQueries.map(q => ({ query: q.query, ...classify(q.query, snapshot, ds.entityMetadatas) })) }
  } finally { if (ds) await ds.destroy(); await p.close() }
}
async function main() {
  const mode = process.argv[2] || 'plan'
  if (!['plan', 'apply', 'verify'].includes(mode)) throw new Error('Use plan, apply or verify, followed by review database name')
  const manifest = JSON.parse(fs.readFileSync(artifactPath('review-database.json'), 'utf8'))
  const database = process.argv[3] || manifest.database
  reviewGuard(database)
  if (database !== manifest.database || !manifest.copyOnly || !manifest.checksumVerified || !manifest.restored) throw new Error('Matching verified backup/restore manifest required')
  const versions = migrations()
  const before = await inspect(database)
  const decisions = before.pending.filter(p => p.requiresDataDecision)
  if (before.dataReview.unknownWorkTypes || before.dataReview.mismatchedHistoryPrefixes) decisions.push({ kind: 'unknown-historical-data', requiresDataDecision: true, counts: before.dataReview })
  if (Object.entries(before.leaveDataReview).some(([key,value]) => key !== 'rowsToReview' && value > 0)) decisions.push({ kind: 'ambiguous-leave-request-data', requiresDataDecision: true, counts: before.leaveDataReview })
  fs.writeFileSync(artifactPath('migration-plan.json'), JSON.stringify({ database, capturedAt: new Date().toISOString(),
    excludedTables, versions: versions.map(({version,checksum}) => ({version,checksum})), pending: before.pending,
    dataDecisions: decisions, dataReview: before.dataReview, leaveDataReview: before.leaveDataReview, noUnknownNotNullBackfill: decisions.length === 0 }, null, 2))
  if (mode === 'plan') {
    console.log(JSON.stringify({ database, pendingQueries: before.pending.length, dataDecisions: decisions.length,
      versions: versions.map(m => m.version), plan: artifactPath('migration-plan.json') }))
    return
  }
  if (decisions.length) throw new Error('Migration blocked: unresolved schema/data decisions; inspect migration-plan.json')
  if (mode === 'verify') {
    if (before.pending.length) throw new Error('Pre-payroll metadata drift remains: ' + before.pending.length + ' queries')
    if (versions.some(m => !before.ledger.some(row => row.version === m.version && row.checksum === m.checksum && row.scope === 'pre-payroll'))) {
      throw new Error('Verified migration ledger is incomplete or has a checksum mismatch')
    }
    console.log(JSON.stringify({ database, schemaMatches: true, excludedTables }))
    return
  }
  const p = await pool(database)
  const applied = [], skipped = []
  let checkpointBackup = null
  try {
    const statePath = artifactPath('review-server-state.json')
    const server = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : null
    if (server?.database === database && server.running) throw new Error('Stop the review API and wait for stopped status before applying migrations')
    await p.request().input('backupPath', manifest.backupPath).query('RESTORE VERIFYONLY FROM DISK = @backupPath WITH CHECKSUM')
    if (versions.some(version => !before.ledger.some(row => row.version === version.version))) {
      // Preserve changes made during review, not just the earlier source copy.
      const dir = (await p.request().query("SELECT SERVERPROPERTY('InstanceDefaultBackupPath') AS dir")).recordset[0].dir
      if (!dir) throw new Error('SQL backup directory unavailable; no checkpoint path may be guessed')
      const suffix = new Date().toISOString().replace(/\D/g, '').slice(0,14) + '_' + crypto.randomBytes(4).toString('hex')
      checkpointBackup = dir.replace(/[\\/]$/, '') + (dir.includes('\\') ? '\\' : '/') + 'hr_pre_payroll_checkpoint_' + suffix + '.bak'
      await p.request().input('backupPath', checkpointBackup).query(`BACKUP DATABASE ${identifier(database)} TO DISK=@backupPath WITH COPY_ONLY,CHECKSUM`)
      await p.request().input('backupPath', checkpointBackup).query('RESTORE VERIFYONLY FROM DISK=@backupPath WITH CHECKSUM')
      manifest.checkpoints = [...(manifest.checkpoints || []), { database, backupPath: checkpointBackup, copyOnly: true, checksumVerified: true, createdAt: new Date().toISOString() }]
      fs.writeFileSync(artifactPath('review-database.json'), JSON.stringify(manifest, null, 2))
    }
    // This is deliberately separate from TypeORM automatic synchronize.
    await p.request().batch(`IF OBJECT_ID(N'dbo.app_schema_migrations',N'U') IS NULL
      CREATE TABLE dbo.app_schema_migrations(version nvarchar(150) NOT NULL PRIMARY KEY,
        checksum char(64) NOT NULL, scope nvarchar(40) NOT NULL,
        appliedAt datetime2 NOT NULL CONSTRAINT DF_app_schema_migrations_appliedAt DEFAULT SYSDATETIME());`)
    for (const migration of versions) {
      const tx = new sql.Transaction(p)
      await tx.begin()
      try {
        const command = new sql.Request(tx)
        await command.query("DECLARE @lock int; EXEC @lock=sp_getapplock @Resource='hr:pre-payroll:migrations', @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=10000; IF @lock<0 THROW 50003,'Migration lock unavailable',1;")
        const prior = (await new sql.Request(tx).input('version', migration.version).query('SELECT checksum FROM dbo.app_schema_migrations WHERE version=@version')).recordset[0]
        if (prior) {
          if (prior.checksum !== migration.checksum) throw new Error('Applied migration checksum changed: ' + migration.version)
          skipped.push(migration.version)
        } else {
          await new sql.Request(tx).batch('SET XACT_ABORT ON;\n' + migration.content)
          await new sql.Request(tx).input('version', migration.version).input('checksum', migration.checksum)
            .query("INSERT INTO dbo.app_schema_migrations(version,checksum,scope) VALUES(@version,@checksum,'pre-payroll')")
          applied.push(migration.version)
        }
        await tx.commit()
      } catch (err) { try { await tx.rollback() } catch {} throw err }
    }
  } finally { await p.close() }
  const after = await inspect(database)
  const beforeRows = new Map(before.snapshot.counts.map(row => [row.table, Number(row.rows)]))
  const afterRows = new Map(after.snapshot.counts.map(row => [row.table, Number(row.rows)]))
  const changedExistingCounts = [...beforeRows].filter(([table,rows]) => table !== 'app_schema_migrations' && afterRows.get(table) !== rows)
  const result = { database, applied, skipped, schemaMatches: after.pending.length === 0,
    remainingQueries: after.pending, changedExistingCounts, verifiedAt: new Date().toISOString(),
    excludedTables, backupVerified: true, checkpointBackup }
  fs.writeFileSync(artifactPath('migration-result.json'), JSON.stringify(result, null, 2))
  if (after.pending.length || changedExistingCounts.length) throw new Error('Migration validation failed; inspect migration-result.json')
  console.log(JSON.stringify({ database, applied, skipped, schemaMatches: true, existingTableRowCountsUnchanged: true }))
}
main().catch(err => { console.error(err.name + ': ' + err.message); process.exitCode = 1 })
