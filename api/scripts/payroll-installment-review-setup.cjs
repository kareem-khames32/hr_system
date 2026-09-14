'use strict'
// تهيئة نوع التأجيل فقط على قاعدة المراجعة المحتفظ بها؛ لا بذر عام ولا مزامنة أو تشغيل خدمة.
const fs = require('node:fs'), path = require('node:path')
const { assertTarget, openDataSource, readMigrations, assertLedger, schemaDiff } = require('./payroll-migrations.cjs')
const root = path.resolve(__dirname, '../..')
async function main() {
  const mode = process.argv[2] || 'plan'
  if (!['plan', 'apply'].includes(mode)) throw new Error('Use plan or apply')
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'docs/prepayrollmigration/review-database.json'), 'utf8'))
  const state = JSON.parse(fs.readFileSync(path.join(root, 'docs/prepayrollmigration/review-server-state.json'), 'utf8'))
  assertTarget(manifest, manifest.database)
  if (state.database !== manifest.database || state.synchronize !== false) throw new Error('Retained review identity mismatch')
  if (mode === 'apply' && state.running) throw new Error('Stop the retained review API before applying its setup')
  const ds = await openDataSource(manifest.database)
  try {
    const types = ds.getRepository('RequestType')
    const existing = await types.findOneBy({ code: 'LOAN_INSTALLMENT_DEFER' })
    const loan = await types.findOneBy({ code: 'LOAN' })
    if (!loan) throw new Error('The configured LOAN type is required; no approval chain will be invented')
    if (mode === 'plan') {
      console.log(JSON.stringify({ database: manifest.database, typePresent: !!existing, loanApprovalChainId: loan.approvalChainId,
        action: existing ? 'PRESERVE_EXISTING' : 'CREATE_DEFERRAL_TYPE_ONLY', written: false }))
      return
    }
    const versions = readMigrations()
    const ledger = await ds.query('SELECT [version],[checksum] FROM [payroll_schema_migrations]')
    assertLedger(versions, ledger)
    if (!versions.every(version => ledger.some(row => row.version === version.version)) || (await schemaDiff(ds)).length) {
      throw new Error('Apply and verify payroll migrations including 009 before request setup')
    }
    const result = await require('../src/seed/seed-requests').seedLoanInstallmentDeferralOnly(ds)
    console.log(JSON.stringify({ database: manifest.database, ...result, existingApprovalChainsPreserved: true }))
  } finally { await ds.destroy() }
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
