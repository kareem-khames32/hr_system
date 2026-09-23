'use strict'
const fs = require('node:fs'), path = require('node:path'), { run } = require('node:test')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(__dirname, '../.env')))
const secrets = Object.entries(env).filter(([k,v]) => /password|secret|token|ad_bind_dn|smtp_(host|from|user)|ad_host/i.test(k) && v.length > 2).map(([,v]) => v)
const redact = input => {
  let s = String(input)
  for (const v of secrets) s = s.split(v).join('[REDACTED]')
  return s.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[JWT REDACTED]')
    .replace(/("(?:accessToken|challengeToken|password|codeHash)"\s*:\s*")[^"]+/g, '$1[REDACTED]')
}
const defaults = ['fulltest-employees-attendance', 'fulltest-leaves-payroll', 'fulltest-reports',
  'payroll-approval-chain-disbursement', 'two-factor-race', 'disbursed-recorded-split',
  'security-permission-gaps', 'payroll-coverage', 'payroll-installment-ledger',
  'payroll-settlement-boundary', 'permission-window', 'holiday-work', 'leave-year-end',
  'leave-attachment-with-request', 'leave-sick-pay-attachment', 'request-decision-race',
  'attendance-payroll-race', 'request-execution', 'financial-report', 'cost-center-report']
const selected = process.argv.slice(2).length ? process.argv.slice(2) : defaults
const files = selected.map(name => path.join(__dirname, name + '.integration.cjs')).filter(f => {
  const source = fs.readFileSync(f, 'utf8')
  if (/migrat\w*\.apply\(|\.splitBatches\(|\.executionUnits\(|migrations-lib|child_process|docs[\\/'" ,]+migrations|readFileSync\(MIGRATION/.test(source)) { console.log('EXCLUDED_MIGRATION_FIXTURE ' + path.basename(f)); return false }
  return true
})
const results = [], failures = [], diagnostics = [], stdout = []
const stream = run({ files, concurrency: 2, execArgv: ['--require', path.join(__dirname, 'codex-review-round2-harness.cjs')] })
const output = value => console.log(redact(JSON.stringify(value)))
stream.on('test:stdout', d => { const s=redact(d.message); stdout.push(s); if (/REVIEW_MEASURE|cleanupVerified/.test(s)) console.log(s.trim()) })
stream.on('test:pass', d => results.push({ file: path.basename(d.file || ''), name: d.name, ms: d.details.duration_ms, pass: true }))
stream.on('test:fail', d => {
  const f = { file: path.basename(d.file || ''), name: d.name, ms: d.details.duration_ms, pass: false,
    error: d.details.error?.message, cause: d.details.error?.cause?.message, stack: d.details.error?.cause?.stack }
  failures.push(f); results.push(f); output(f)
})
stream.on('test:diagnostic', d => { diagnostics.push(redact(d.message)); if (/Cleanup|\{|scenario|النتيجة|ناجح|فرق/.test(d.message)) output({ diagnostic: d.message }) })
stream.on('test:summary', d => {
  if (!d.file) {
    const final = { selected, summary: d, results, failures, diagnostics, stdout }
    const suffix = process.env.REVIEW_RESULT_SUFFIX || 'core'
    if (!/^[a-z0-9_-]+$/.test(suffix)) throw new Error('Invalid result suffix')
    fs.writeFileSync(path.join(__dirname, `codex-review-round2-results-${suffix}.cjs`), 'module.exports = ' + redact(JSON.stringify(final, null, 2)) + '\n')
    output({ summary: d, failures: failures.length }); process.exitCode = d.success ? 0 : 1
  }
})
stream.on('error', e => { output({ runnerError: e.message }); process.exitCode = 1 })
stream.resume()
