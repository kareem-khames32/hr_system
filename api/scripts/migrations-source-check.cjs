'use strict'
const { fs, pool, schemaSnapshot, checksum, artifactPath } = require('./migrations-lib.cjs')
async function main() {
  const manifest = JSON.parse(fs.readFileSync(artifactPath('review-database.json'), 'utf8'))
  const p = await pool()
  try {
    const snapshot = await schemaSnapshot(p)
    const schemaUnchanged = checksum(JSON.stringify(snapshot.columns)) === manifest.sourceSchemaHash
    const rowCountsUnchanged = JSON.stringify(snapshot.counts) === JSON.stringify(manifest.sourceRows)
    const result = { checkedAt: new Date().toISOString(), sourceSchemaUnchanged: schemaUnchanged,
      sourceRowCountsUnchanged: rowCountsUnchanged, tablesChecked: snapshot.counts.length,
      note: 'Read-only schema and row-count verification; does not prove no other application changed individual values.' }
    fs.writeFileSync(artifactPath('source-unchanged-check.json'), JSON.stringify(result, null, 2))
    console.log(JSON.stringify(result))
    if (!schemaUnchanged || !rowCountsUnchanged) process.exitCode = 1
  } finally { await p.close() }
}
main().catch(err => { console.error(err.name + ': ' + err.message); process.exitCode = 1 })
