'use strict'
// Review-only: existing in-process HTTP harness plus an early raw-SQL connection/DDL guard.
const base = require('./codex-review-round2-harness.cjs')
const sql = require('../node_modules/mssql')
const connect = sql.ConnectionPool.prototype.connect
sql.ConnectionPool.prototype.connect = function (...args) {
  const database = this.config.database || 'master'
  if (database !== 'master') base.safeDatabase(database)
  return connect.apply(this, args)
}
for (const method of ['query', 'batch']) {
  const original = sql.Request.prototype[method]
  sql.Request.prototype[method] = function (statement, ...args) {
    if (typeof statement === 'string') {
      if (/\bhr_system\b|\bhr_review_pre_payroll\w*/i.test(statement)) throw new Error('REVIEW_PROTECTED_DATABASE_REFERENCE')
      const operations = [...statement.matchAll(/\b(CREATE|ALTER|DROP)\s+DATABASE\s+\[?([a-z0-9_]+)\]?/gi)]
      for (const operation of operations) base.safeDatabase(operation[2])
      const result = original.call(this, statement, ...args)
      if (result && typeof result.then === 'function' && operations.some(x => /CREATE|DROP/i.test(x[1]))) {
        return result.then(value => {
          for (const op of operations.filter(x => /CREATE|DROP/i.test(x[1]))) console.log('CR5_DATABASE ' + JSON.stringify({ operation: op[1].toUpperCase(), database: op[2] }))
          return value
        })
      }
      return result
    }
    return original.call(this, statement, ...args)
  }
}
module.exports = base
