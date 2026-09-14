'use strict'
// نضيف إعدادات المرونة الناقصة فقط إلى نسخة المراجعة التي تحققنا من هويتها، ونحفظ القيم القائمة.
const { fs, path, sql, apiRoot, pool } = require('./migrations-lib.cjs')
const { assertTarget } = require('./payroll-migrations.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
const { configSeed } = require('../src/seed/requests-seed.data')
async function main() {
  const root = path.resolve(apiRoot, '..')
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'docs/prepayrollmigration/review-database.json'), 'utf8'))
  assertTarget(manifest, manifest.database)
  const financeKeys = ['payroll.shortfall_enabled', 'payroll.shortfall_mode', 'payroll.shortfall_value',
    'payroll.attendance_overlap_policy', 'payroll.attendance_daily_cap_days']
  const configs = configSeed.filter(row => row.key.startsWith('attendance.flex.') || financeKeys.includes(row.key))
  const connection = await pool(manifest.database), transaction = new sql.Transaction(connection)
  let active = false
  const inserted = [], preserved = []
  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE); active = true
    for (const row of configs) {
      const request = new sql.Request(transaction).input('key', sql.NVarChar, row.key).input('value', sql.NVarChar, row.value)
      const existing = await request.query('SELECT [key] FROM dbo.requests_config WITH (UPDLOCK,HOLDLOCK) WHERE [key]=@key')
      if (existing.recordset.length) preserved.push(row.key)
      else {
        await request.query('INSERT INTO dbo.requests_config ([key],[value]) VALUES (@key,@value)')
        inserted.push(row.key)
      }
    }
    await transaction.commit(); active = false
    const result = { database: manifest.database, inserted, preserved, existingValuesPreserved: true, checkedAt: new Date().toISOString() }
    fs.writeFileSync(path.join(root, 'output/payroll-flex-review-config.json'), JSON.stringify(result, null, 2))
    console.log(JSON.stringify(result))
  } finally {
    if (active) await transaction.rollback()
    await connection.close()
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
