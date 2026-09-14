'use strict'
const { fs, path, crypto, sql, env, pool, identifier, reviewGuard, schemaSnapshot, checksum, artifactPath } = require('./migrations-lib.cjs')
async function main() {
  const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14)
  const token = crypto.randomBytes(4).toString('hex')
  const database = `hr_review_pre_payroll_${stamp}_${token}`
  reviewGuard(database)
  const master = await pool('master')
  let review
  try {
    const dirs = (await master.request().query(`SELECT SERVERPROPERTY('InstanceDefaultBackupPath') AS backupPath,
      SERVERPROPERTY('InstanceDefaultDataPath') AS dataPath, SERVERPROPERTY('InstanceDefaultLogPath') AS logPath`)).recordset[0]
    if (!dirs.backupPath || !dirs.dataPath || !dirs.logPath) throw new Error('SQL Server must expose its backup/data/log directories; no guessed paths')
    const combine = (dir, file) => dir.replace(/[\\/]$/, '') + (dir.includes('\\') ? '\\' : '/') + file
    const backupPath = combine(dirs.backupPath, `hr_pre_payroll_copyonly_${stamp}_${token}.bak`)
    const sourceBefore = await pool(env.DB_DATABASE)
    let snapshot
    try { snapshot = await schemaSnapshot(sourceBefore) } finally { await sourceBefore.close() }
    await master.request().input('target', database).query("IF DB_ID(@target) IS NOT NULL THROW 50002,'Review database already exists',1")
    await master.request().input('backupPath', backupPath).query(`BACKUP DATABASE ${identifier(env.DB_DATABASE)} TO DISK = @backupPath WITH COPY_ONLY, CHECKSUM`)
    await master.request().input('backupPath', backupPath).query('RESTORE VERIFYONLY FROM DISK = @backupPath WITH CHECKSUM')
    const files = (await master.request().input('backupPath', backupPath).query('RESTORE FILELISTONLY FROM DISK = @backupPath')).recordset
    if (!files.length || files.some(f => !['D', 'L'].includes(f.Type))) throw new Error('Unsupported backup file type; backup retained, no restore attempted')
    const restore = master.request().input('backupPath', backupPath)
    const moves = files.map((file, index) => {
      const ext = file.Type === 'L' ? '.ldf' : index === 0 ? '.mdf' : '.ndf'
      const target = combine(file.Type === 'L' ? dirs.logPath : dirs.dataPath, `${database}_${index}${ext}`)
      restore.input('logical' + index, file.LogicalName).input('physical' + index, target)
      return `MOVE @logical${index} TO @physical${index}`
    })
    // No REPLACE: a collision or an existing target must fail rather than overwrite.
    await restore.query(`RESTORE DATABASE ${identifier(database)} FROM DISK = @backupPath WITH ${moves.join(', ')}, RECOVERY, CHECKSUM`)
    review = await pool(database)
    const restored = await schemaSnapshot(review)
    if (JSON.stringify(snapshot.columns) !== JSON.stringify(restored.columns)) throw new Error('Restored schema differs; review retained for investigation')
    const sourceAfter = await pool(env.DB_DATABASE)
    let after
    try { after = await schemaSnapshot(sourceAfter) } finally { await sourceAfter.close() }
    if (JSON.stringify(snapshot.columns) !== JSON.stringify(after.columns)) throw new Error('Source schema changed during copy; regenerate audit before migration')
    const manifest = { database, createdAt: new Date().toISOString(), sourceDatabase: env.DB_DATABASE,
      backupPath, copyOnly: true, checksumVerified: true, restored: true,
      sourceSchemaHash: checksum(JSON.stringify(snapshot.columns)), sourceRows: snapshot.counts,
      restoredRows: restored.counts, sourceSchemaUnchangedAfterRestore: true,
      sourceRowsUnchangedDuringCopy: JSON.stringify(snapshot.counts) === JSON.stringify(after.counts),
      note: 'Contains private copied data. Keep database, backup and uploads local. No passwords are stored here.' }
    fs.writeFileSync(artifactPath('review-database.json'), JSON.stringify(manifest, null, 2))
    fs.writeFileSync(artifactPath('review.env'), `# Password-free overrides. Base connection values stay in api/.env.\nDB_DATABASE=${database}\nDB_SYNCHRONIZE=false\nPORT=4001\nFRONTEND_URL=http://localhost:3001\n`)
    console.log(JSON.stringify({ database, manifest: artifactPath('review-database.json'), backupVerified: true,
      tables: restored.counts.length, sourceSchemaUnchanged: true, rowsEqual: JSON.stringify(snapshot.counts) === JSON.stringify(restored.counts) }))
  } finally { if (review) await review.close(); await master.close() }
}
main().catch(err => { console.error(err.name + ': ' + err.message); process.exitCode = 1 })
