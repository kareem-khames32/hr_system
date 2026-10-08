'use strict'
// Independent malformed-schema checks on a disposable synchronized database only.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path')
require('../node_modules/ts-node').register({project:path.resolve(__dirname,'../tsconfig.json'),transpileOnly:true})
require('../node_modules/reflect-metadata')
const fixture=require('./codex-review-p5a-fixture.cjs')
const split=require('../scripts/db-migrate.cjs').splitBatches
const dir=path.resolve(__dirname,'../../docs/migrations/payroll')
test('P5A-G01: all 41 migrations accept synchronized shape and refuse malformed owned shape',async t=>{
 const fx=await fixture('p5a_schema');let checked=0
 try{
  const files=fs.readdirSync(dir).filter(n=>/^\d{8}_(14\d|15\d|16\d|17\d|180)_/.test(n)).sort();assert.equal(files.length,41)
  for(const file of files){
   fx.assertDisposable();const sql=fs.readFileSync(path.join(dir,file),'utf8').replace(/\r\n/g,'\n'),batches=split(sql)
   const execute=async()=>{for(const b of batches)await fx.ds.manager.query(b)}
   await execute();await execute()
   const table=sql.match(/CREATE TABLE dbo\.([a-z_0-9]+)/)?.[1]
   if(table){
    assert.match(table,/^[a-z_0-9]+$/);await fx.ds.manager.query(`ALTER TABLE dbo.[${table}] ADD [codex_review_extra] int NULL`)
    try{await assert.rejects(execute,undefined,file+' must refuse an extra column')}finally{await fx.ds.manager.query(`ALTER TABLE dbo.[${table}] DROP COLUMN [codex_review_extra]`)}
   }else{
    assert.match(file,/_157_/);await fx.ds.manager.query('ALTER TABLE dbo.employee_skills ALTER COLUMN [source] nvarchar(21) NULL')
    try{await assert.rejects(execute,undefined,file+' must refuse wrong length')}finally{await fx.ds.manager.query('ALTER TABLE dbo.employee_skills ALTER COLUMN [source] nvarchar(20) NULL')}
   }
   await execute();checked++
  }
  t.diagnostic(JSON.stringify({id:'P5A-G01',migrations:checked,malformedRejected:checked}))
 }finally{await fx.close()}
},{timeout:120000})
