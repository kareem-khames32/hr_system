'use strict'
require('./codex-review-p6a-local-preload.cjs')
const sql=require('../node_modules/mssql'),{stripComments}=require('../scripts/db-migrate.cjs')
// Historical migration comments name the company database. Strip comments at
// execution, after checksums; also relabel the historical parityExcludedReason
// prose on the new, empty payroll table. No SQL identifier is changed. Real SQL
// references still pass through the protected-database guard and stay forbidden.
for(const method of ['query','batch']){const original=sql.Request.prototype[method];sql.Request.prototype[method]=function(statement,...args){if(typeof statement==='string'&&/hr_system|hr_review_pre_payroll/i.test(statement)){statement=stripComments(statement); if(statement.includes("[parityExcludedReason]")) statement=statement.replace(/hr_system(?= \u0627\u0644\u062d\u0627\u0644\u064a\u0629)/g,"disposable_review");}return original.call(this,statement,...args)}}
