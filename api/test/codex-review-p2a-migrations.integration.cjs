'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),fixture=require('./codex-review-p2a-fixture.cjs')
test('P2A combined 084 085 086 allow true pre-migration boot, preserve old records and replay to zero schema diff',async t=>{
 const f=await fixture('p2a_migrations'),dir=path.resolve(__dirname,'../../docs/migrations/payroll'),migrate=require('../scripts/db-migrate.cjs')
 const names=fs.readdirSync(dir).filter(n=>/_08[4-6]_.*\.sql$/.test(n)).sort();assert.equal(names.length,3)
 let oldApp
 try{
  const branch=await f.repo('Branch').save({code:'P2A_OLD',name:'Existing'}),employee=await f.repo('Employee').save({employeeCode:'P2A_OLD',fullName:'Existing migration control',branchId:branch.id,basicSalary:4321.98,status:'active',isActive:true,payMethod:'cash',joinDate:'2020-01-01'})
  await f.repo('StoredFile').save({originalName:'old.pdf',storedName:'old.pdf',mime:'application/pdf',size:16,employeeId:employee.id,uploadedBy:f.admin.id})
  const oldRows=async()=>({employees:await f.ds.query('SELECT id,employeeCode,fullName,branchId,basicSalary FROM employees ORDER BY id'),users:await f.ds.query('SELECT id,email,role,branchId FROM users ORDER BY id'),files:await f.ds.query('SELECT id,storedName,originalName,size,mime FROM stored_files ORDER BY id')})
  const before=await oldRows();f.assertDisposable()
  for(const table of ['audit_log','jobs_queue','outbox_events'])await f.ds.query(`DROP TABLE [${table}]`)
  await f.ds.query('ALTER TABLE [stored_files] DROP COLUMN [sha256]')
  const audit=require('../src/audit/audit'),outbox=require('../src/queue/outbox');audit.resetAuditTableCache();outbox.resetQueueTablesCache()
  process.env.DB_SYNCHRONIZE='false'
  const DS=require('../node_modules/typeorm').DataSource,initialize=DS.prototype.initialize
  DS.prototype.initialize=function(...args){assert.equal(this.options.database,f.database);this.setOptions({synchronize:false});return initialize.apply(this,args)}
  try{oldApp=await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule,{logger:false});oldApp.setGlobalPrefix('api');oldApp.useGlobalPipes(new(require('../node_modules/@nestjs/common').ValidationPipe)({whitelist:true,transform:true}));await oldApp.init()}finally{DS.prototype.initialize=initialize}
  const ds=oldApp.get(DS);assert.equal(ds.options.synchronize,false)
  assert.equal((await f.request('GET','/audit')).status,409)
  assert.deepEqual(await f.ok('GET','/queue'),{available:false})
  assert.equal(await require('../src/files/stored-file-hash').storedFileHashReady(ds.manager),false)
  assert.equal((await ds.getRepository('StoredFile').find()).length,1)
  await ds.transaction(async em=>{await audit.recordAudit(em,{category:'PAYROLL',action:'P2A_PREMIGRATION'});assert.equal(await outbox.recordOutboxEvent(em,{type:'PAYROLL_RUN_APPROVED',entityId:9999}),false)})
  assert.deepEqual(await oldApp.get(require('../src/queue/queue.service').QueueService).runOnce(),{recovered:0,dispatched:0,done:0,retried:0,dead:0})
  await oldApp.close();oldApp=null
  const apply=async()=>{for(const name of names)for(const batch of migrate.splitBatches(fs.readFileSync(path.join(dir,name),'utf8').replace(/\r\n/g,'\n')))await f.ds.query(batch)}
  await apply();assert.deepEqual(await oldRows(),before)
  assert.deepEqual((await f.ds.driver.createSchemaBuilder().log()).upQueries.map(q=>q.query),[])
  audit.resetAuditTableCache();outbox.resetQueueTablesCache()
  await f.ds.transaction(async em=>{await audit.recordAudit(em,{category:'PAYROLL',action:'P2A_AFTER_MIGRATION'});assert.equal(await outbox.recordOutboxEvent(em,{type:'PAYROLL_RUN_APPROVED',entityId:9999}),true)})
  const addedRows=async()=>({audit:await f.ds.query('SELECT * FROM audit_log ORDER BY id'),outbox:await f.ds.query('SELECT * FROM outbox_events ORDER BY id')})
  const after=await addedRows();await apply();assert.deepEqual(await oldRows(),before);assert.deepEqual(await addedRows(),after)
  assert.deepEqual((await f.ds.driver.createSchemaBuilder().log()).upQueries.map(q=>q.query),[])
  await assert.rejects(f.ds.query(`UPDATE audit_log SET summary=N'alteration'`),/84010|إضافة بس/)
  await assert.rejects(f.ds.query('DELETE FROM audit_log'),/84010|إضافة بس/)
  assert.deepEqual(await addedRows(),after)
  t.diagnostic(JSON.stringify({case:'P2A-combined-migrations',files:names,oldSchemaBoot:true,synchronize:false,schemaDifference:0,replayUnchanged:true,existingRowsPreserved:true,compatibility:(await f.ds.query('SELECT compatibility_level level FROM sys.databases WHERE name=DB_NAME()'))[0].level}))
 }finally{if(oldApp)await oldApp.close();await f.close()}
},{timeout:180000})
