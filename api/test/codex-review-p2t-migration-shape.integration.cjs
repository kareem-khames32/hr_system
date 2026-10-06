'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path')
let f,batches
before(async()=>{
 f=await require('./codex-review-p2t-comments-fixture.cjs')('p2t_migration_shape')
 const source=fs.readFileSync(path.resolve(__dirname,'../../docs/migrations/payroll/20261006_094_employee_custom_fields.sql'),'utf8')
 batches=source.split(/^\s*GO\s*$/im).map(x=>x.trim()).filter(Boolean)
},{timeout:180000})
after(async()=>{if(f)await f.close()})
async function tryShape(change,inspect){
 const qr=f.ds.createQueryRunner();await qr.connect();await qr.startTransaction()
 let rejected=false,evidence
 try{
  await change(qr)
  try{for(const batch of batches)await qr.query(batch)}catch(error){rejected=true}
  if(!rejected)evidence=await inspect(qr)
 }finally{if(qr.isTransactionActive)await qr.rollbackTransaction();await qr.release()}
 return{rejected,evidence}
}
test('P2T migration must reject a preexisting ten-column fields table with a wrong required type',async t=>{
 const result=await tryShape(qr=>qr.query('ALTER TABLE employee_custom_fields ALTER COLUMN [required] nvarchar(10) NOT NULL'),
  qr=>qr.query("SELECT TYPE_NAME(system_type_id) AS [actualType] FROM sys.columns WHERE object_id=OBJECT_ID('employee_custom_fields') AND name='required'"))
 t.diagnostic(JSON.stringify({case:'old-table-required-type',...result}));assert.equal(result.rejected,true,'094 must not report success on an incompatible same-name table')
})
test('P2T migration must reject a same-named unique field index on the wrong column',async t=>{
 const result=await tryShape(async qr=>{
  await qr.query('DROP INDEX UX_employee_custom_fields_key ON employee_custom_fields')
  await qr.query('CREATE UNIQUE INDEX UX_employee_custom_fields_key ON employee_custom_fields ([id])')
 },async qr=>{
  await qr.query("INSERT employee_custom_fields ([fieldKey],[label],[type],[options],[required],[restricted],[sortOrder],[isActive],[createdAt]) VALUES (N'duplicate',N'Synthetic one',N'TEXT',NULL,0,0,1,1,GETDATE()),(N'duplicate',N'Synthetic two',N'TEXT',NULL,0,0,2,1,GETDATE())")
  return (await qr.query("SELECT COUNT(*) AS duplicateKeys FROM employee_custom_fields WHERE fieldKey=N'duplicate'"))[0]
 })
 t.diagnostic(JSON.stringify({case:'old-table-wrong-index',...result}));assert.equal(result.rejected,true,'Index name and is_unique alone do not verify key columns')
})
