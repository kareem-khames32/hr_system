'use strict'
// Run existing local-only tests without services, migrations or fixture-file writes.
// Invoke from either project root or api/: node api/test/codex-review-local-suite.cjs
const fs = require('node:fs')
const path = require('node:path')
const { run } = require('node:test')
const excluded = new Set([
  'db-dated-calendar-versions.test.cjs', 'db-migrate.test.cjs', 'hr-document-migration.test.cjs',
  'payroll-chain-disbursement-migration.test.cjs', 'env-guard.test.cjs', 'payroll-reports-ui.test.cjs',
  'payroll-managed-foreign-keys.test.cjs', 'legacy-password-marker.test.cjs', 'zk-tcp-auth.test.cjs',
])
const candidates = fs.readdirSync(__dirname).filter(f => f.endsWith('.test.cjs') && !f.startsWith('codex-review-'))
for (const file of candidates) {
  if (fs.readFileSync(path.join(__dirname, file), 'utf8').includes('migrations-lib.cjs')) excluded.add(file)
}
const files = candidates.filter(f => !excluded.has(f)).map(f => path.join(__dirname, f))
console.log(JSON.stringify({ selectedFiles: files.length, excludedFiles: [...excluded].sort() }))
const failures = []
const stream = run({ files, concurrency: 4 })
stream.on('test:fail', d => failures.push({ file: path.basename(d.file || ''), name: d.name,
  error: d.details.error?.message, cause: d.details.error?.cause?.message }))
stream.on('test:summary', d => {
  if (!d.file) { console.log(JSON.stringify({ summary: d, failures })); process.exitCode = d.success ? 0 : 1 }
})
stream.on('error', error => { console.error(error.code || 'REVIEW_RUNNER_ERROR'); process.exitCode = 1 })
stream.resume()
