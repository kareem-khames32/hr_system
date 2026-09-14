'use strict'
const { fs, pool, dataSource, schemaSnapshot, excludedTables, artifactPath } = require('./migrations-lib.cjs')
async function main() {
  const database = process.argv[2]
  const p = await pool(database)
  let ds
  try {
    const snapshot = await schemaSnapshot(p)
    ds = await dataSource(database)
    const diff = await ds.driver.createSchemaBuilder().log()
    const capabilities = (await p.request().query(`SELECT SERVERPROPERTY('ProductVersion') AS version,
      SERVERPROPERTY('Edition') AS edition, SERVERPROPERTY('InstanceDefaultBackupPath') AS backupPath,
      SERVERPROPERTY('InstanceDefaultDataPath') AS dataPath, SERVERPROPERTY('InstanceDefaultLogPath') AS logPath,
      HAS_PERMS_BY_NAME(DB_NAME(),'DATABASE','BACKUP DATABASE') AS canBackup`)).recordset[0]
    const metadata = ds.entityMetadatas.map(m => ({ table: m.tableName, columns: m.columns.map(c => ({
      name: c.databaseName, type: ds.driver.normalizeType(c), length: c.length, precision: c.precision, scale: c.scale,
      nullable: c.isNullable, primary: c.isPrimary, generated: c.isGenerated, default: c.default === undefined ? undefined : ds.driver.normalizeDefault(c)
    })) }))
    const report = { capturedAt: new Date().toISOString(), scope: 'pre-payroll', excludedTables, capabilities,
      ...snapshot, metadata, queries: diff.upQueries.map(q => ({ query: q.query, parameters: q.parameters })) }
    const out = artifactPath(database ? 'review-schema-audit.json' : 'source-schema-audit.json')
    fs.writeFileSync(out, JSON.stringify(report, null, 2))
    console.log(JSON.stringify({ artifact: out, tables: snapshot.counts.length, targetTables: metadata.length,
      pendingQueries: report.queries.length, capabilities, queryKinds: report.queries.map(q => q.query.slice(0, 170)) }, null, 2))
  } finally { if (ds) await ds.destroy(); await p.close() }
}
main().catch(err => { console.error(err.name + ': ' + err.message); process.exitCode = 1 })
