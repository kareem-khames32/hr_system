'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path')
let f
before(async()=>{f=await require('./codex-review-round2-fixture.cjs')('migration067')},{timeout:180000})
after(async()=>{if(f)await f.close()})
test('CR2-M067 additive nullable columns, no backfill, repeatable, zero TypeORM schema delta',async t=>{
  f.assertDisposable()
  await f.ds.query("ALTER TABLE dbo.payroll_items DROP COLUMN paidPayMethod,paidBankAmount,paidCashAmount")
  const item=await f.ds.query("INSERT INTO dbo.payroll_items (runId,employeeId,basicSalary,allowances,netPay,payMethod) OUTPUT INSERTED.id VALUES (7001,7001,1000,0,1000,'mixed')")
  const original=await f.ds.query('SELECT * FROM dbo.payroll_items WHERE id=@0',[item[0].id])
  const migration=fs.readFileSync(path.join(__dirname,'../../docs/migrations/payroll/20260924_067_payroll_item_paid_split.sql'),'utf8')
  const batches=migration.split(/^\s*GO\s*$/im).filter(x=>x.trim())
  for(let round=0;round<2;round++)for(const batch of batches){f.assertDisposable();await f.ds.query(batch)}
  const [after]=await f.ds.query('SELECT * FROM dbo.payroll_items WHERE id=@0',[item[0].id])
  for(const key of ['paidPayMethod','paidBankAmount','paidCashAmount']){assert.equal(after[key],null);delete after[key]}
  assert.deepEqual(after,original[0])
  const delta=(await f.ds.driver.createSchemaBuilder().log()).upQueries.map(q=>q.query).filter(q=>q.includes('payroll_items'))
  assert.deepEqual(delta,[])
  t.diagnostic(JSON.stringify({migration:'067',repetitions:2,newNullableColumns:3,backfilled:0,existingRowChanged:false,payrollItemSchemaDelta:delta.length}))
})
