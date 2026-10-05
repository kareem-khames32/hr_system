'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),setup=require('./codex-review-p1-support.cjs')
test('P1 all eight migrations together preserve old rows, permit old-schema boot and replay with zero schema difference',async t=>{
 const f=await setup('p1_migrations'),dir=path.resolve(__dirname,'../../docs/migrations/payroll'),migrate=require('../scripts/db-migrate.cjs')
 const names=fs.readdirSync(dir).filter(n=>/_(?:07[6-9]|08[0-3])_.*\.sql$/.test(n)).sort();assert.equal(names.length,8)
 let oldApp
 try{
  const emp=await f.employee(4321.98),l=await f.repo('Loan').save({employeeId:emp.id,amount:876.54,status:'APPROVED',installmentMonths:1,firstInstallmentPeriod:'2026-11'})
  const kase=await f.repo('OffboardingCase').save({employeeId:emp.id,lastWorkingDay:'2026-11-22',status:'IN_SETTLEMENT',terminationReason:'termination'})
  const oldRows=async()=>({employees:await f.ds.query('SELECT id,employeeCode,fullName,branchId,basicSalary FROM employees ORDER BY id'),loans:await f.ds.query('SELECT id,employeeId,amount,status,firstInstallmentPeriod FROM loans ORDER BY id'),cases:await f.ds.query('SELECT id,employeeId,status,lastWorkingDay FROM offboarding_cases ORDER BY id'),users:await f.ds.query('SELECT id,email,role,branchId FROM users ORDER BY id')})
  const before=await oldRows();f.assertDisposable()
  for(const table of ['system_module_events','system_module_features','system_modules','login_events','scheduled_job_runs','statutory_values','statutory_definitions','employee_payment_changes'])await f.ds.query(`DROP TABLE [${table}]`)
  for(const [table,columns] of [['users',['failedLoginCount','lockedUntil']],['employees',['gosiFirstRegisteredAt']],['loans',['requiresDisbursement','disbursedByUserId','disbursementMethod','disbursementReference']],['offboarding_cases',['settlementPaidAt','settlementPaidByUserId','settlementPaymentMethod','settlementPaymentReference']]])for(const column of columns){
   const defaults=await f.ds.query('SELECT dc.name FROM sys.default_constraints dc JOIN sys.columns c ON c.object_id=dc.parent_object_id AND c.column_id=dc.parent_column_id WHERE dc.parent_object_id=OBJECT_ID(@0) AND c.name=@1',[table,column])
   for(const {name} of defaults){assert.match(name,/^[A-Za-z0-9_]+$/);await f.ds.query(`ALTER TABLE [${table}] DROP CONSTRAINT [${name}]`)}
   await f.ds.query(`ALTER TABLE [${table}] DROP COLUMN [${column}]`)
  }
  process.env.DB_SYNCHRONIZE='false'
  // Nest's forRoot validated configuration is cached from the first fixture application.
  // Force only the second disposable connection to the no-synchronize deployment mode.
  const DS=require('../node_modules/typeorm').DataSource,initialize=DS.prototype.initialize
  DS.prototype.initialize=function(...args){assert.equal(this.options.database,f.database);this.setOptions({synchronize:false});return initialize.apply(this,args)}
  try{oldApp=await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule,{logger:false});await oldApp.init()}finally{DS.prototype.initialize=initialize}
  const modules=oldApp.get(require('../src/modules-registry/modules.service').ModulesService);assert.equal(await modules.isEnabled('payroll'),true)
  const ds=oldApp.get(require('../node_modules/typeorm').DataSource);assert.equal(ds.options.database,f.database);assert.equal(ds.options.synchronize,false)
  const gosi=await require('../src/employees/employee-gosi-registration').readGosiFirstRegistered(ds.manager,[emp.id]);assert.equal(gosi.get(emp.id)??null,null)
  assert.equal(await require('../src/loans/loan-disbursement').loanDisbursementReady(ds.manager),false)
  assert.equal(await require('../src/offboarding/settlement-payment').settlementPaymentReady(ds.manager),false)
  await oldApp.close();oldApp=null
  for(const name of names)for(const batch of migrate.splitBatches(fs.readFileSync(path.join(dir,name),'utf8').replace(/\r\n/g,'\n')))await f.ds.query(batch)
  assert.deepEqual(await oldRows(),before)
  assert.deepEqual((await f.ds.driver.createSchemaBuilder().log()).upQueries.map(x=>x.query),[])
  const count=async()=>f.ds.query("SELECT (SELECT COUNT(*) FROM system_modules) modules,(SELECT COUNT(*) FROM system_module_features) features,(SELECT COUNT(*) FROM system_module_events) events")
  const once=await count()
  for(const name of names)for(const batch of migrate.splitBatches(fs.readFileSync(path.join(dir,name),'utf8').replace(/\r\n/g,'\n')))await f.ds.query(batch)
  assert.deepEqual(await oldRows(),before);assert.deepEqual(await count(),once)
  assert.deepEqual((await f.ds.driver.createSchemaBuilder().log()).upQueries.map(x=>x.query),[])
  t.diagnostic(JSON.stringify({case:'combined-076-083',files:names,oldSchemaBoot:true,existingRowsUnchanged:true,replayUnchanged:true,schemaDifference:0,compatibility:(await f.ds.query('SELECT compatibility_level level FROM sys.databases WHERE name=DB_NAME()'))[0].level}))
 }finally{if(oldApp)await oldApp.close();await f.close()}
},{timeout:180000})
