'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path')
let f,source,batches
before(async()=>{f=await require('./codex-review-p2u-comments-fixture.cjs')('p2u_migration_extra');source=fs.readFileSync(path.resolve(__dirname,'../../docs/migrations/payroll/20261006_094_employee_custom_fields.sql'),'utf8');batches=source.split(/^\s*GO\s*$/im).map(x=>x.trim()).filter(Boolean)},{timeout:180000})
after(async()=>{if(f)await f.close()})
async function inTransaction(fn){const qr=f.ds.createQueryRunner();await qr.connect();await qr.startTransaction();try{return await fn(qr)}finally{if(qr.isTransactionActive)await qr.rollbackTransaction();await qr.release()}}
const run=async qr=>{for(const b of batches)await qr.query(b)}
test('P2U migration accepts identical columns in a different physical order and completes missing indexes',async()=>inTransaction(async qr=>{
 await qr.query('DROP TABLE employee_custom_values; DROP TABLE employee_custom_fields')
 for(const name of ['employee_custom_fields','employee_custom_values']){
  const match=source.match(new RegExp('CREATE TABLE dbo\\.'+name+' \\(([\\s\\S]*?)\\n\\);'));assert.ok(match)
  const reversed=match[1].trim().split(/\r?\n/).map(s=>s.trim().replace(/,$/,'')).reverse().join(',\n')
  await qr.query(`CREATE TABLE dbo.${name} (${reversed})`)
 }
 await run(qr);await run(qr)
 const columns=await qr.query("SELECT name FROM sys.columns WHERE object_id=OBJECT_ID('employee_custom_fields') ORDER BY column_id")
 assert.equal(columns[0].name,'createdAt');assert.equal(columns.at(-1).name,'id')
 const indexes=await qr.query("SELECT name FROM sys.indexes WHERE object_id IN (OBJECT_ID('employee_custom_fields'),OBJECT_ID('employee_custom_values')) AND name LIKE 'UX_employee_custom_%'")
 assert.equal(indexes.length,2)
}))
test('P2U bad values table is rejected before creating the missing fields table',async()=>inTransaction(async qr=>{
 await qr.query('DROP TABLE employee_custom_fields; ALTER TABLE employee_custom_values ALTER COLUMN numberValue decimal(18,2) NULL')
 await assert.rejects(run(qr),/94002|employee_custom_values/)
 const [row]=await qr.query("SELECT OBJECT_ID('employee_custom_fields','U') fieldsId, scale FROM sys.columns WHERE object_id=OBJECT_ID('employee_custom_values') AND name='numberValue'")
 assert.equal(row.fieldsId,null);assert.equal(row.scale,2)
}))
test('P2U disabled unique index is rejected before filling the other missing index',async()=>inTransaction(async qr=>{
 await qr.query('DROP INDEX UX_employee_custom_values_employee_field ON employee_custom_values; ALTER INDEX UX_employee_custom_fields_key ON employee_custom_fields DISABLE')
 await assert.rejects(run(qr),/94003|UX_employee_custom_fields_key/)
 const [row]=await qr.query("SELECT COUNT(*) n FROM sys.indexes WHERE object_id=OBJECT_ID('employee_custom_values') AND name='UX_employee_custom_values_employee_field'")
 assert.equal(Number(row.n),0)
}))
