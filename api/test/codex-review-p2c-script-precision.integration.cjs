'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path')
test('P2C D direct legacy-import DataSource precision diagnostic (no AppModule imported)',async t=>{
 const env=require('../node_modules/dotenv').parse(fs.readFileSync(path.join(__dirname,'../.env'))),sql=require('../node_modules/mssql')
 const name='hr_codex_p2c_script_test_'+crypto.randomBytes(8).toString('hex');require('./codex-review-round5-harness.cjs').safeDatabase(name)
 const pool=await new sql.ConnectionPool({server:'localhost',port:1433,user:env.DB_USERNAME,password:env.DB_PASSWORD,database:'master',options:{encrypt:false,trustServerCertificate:true}}).connect();let ds,created=false
 try{
  await pool.request().query(`CREATE DATABASE [${name}]`);created=true
  Object.assign(process.env,env,{DB_DATABASE:name,DB_TYPE:'mssql',DB_HOST:'localhost',DB_PORT:'1433'})
  ds=require('../scripts/legacy-import/framework').createDataSource();assert.equal(ds.options.database,name);ds.setOptions({synchronize:true});await ds.initialize()
  const branch=await ds.getRepository('Branch').save({name:'فرع مصطنع',code:'P2CS'}),repo=ds.getRepository('Employee'),saved=await repo.save({branchId:branch.id,employeeCode:'P2C-SCRIPT',fullName:'موظف مصطنع',basicSalary:6000,housingAllowance:1250.50,transportAllowance:300.25,otherAllowance:99.99,workPressureAllowance:10.10})
  const stored=await repo.findOneByOrFail({id:saved.id});t.diagnostic(JSON.stringify({case:'legacy-import-factory',memoryHousing:saved.housingAllowance,storedHousing:stored.housingAllowance,patchLoaded:!!ds.driver[Symbol.for('hr.typeorm.mssql.output-table-precision')]}))
  assert.equal(Number(stored.housingAllowance),1250.5)
  assert.equal(Number(saved.housingAllowance),1250.5,'Legacy import factory must load the same output precision correction')
 }finally{if(ds?.isInitialized)await ds.destroy();if(created){await pool.request().query(`ALTER DATABASE [${name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${name}]`);assert.equal((await pool.request().input('n',sql.NVarChar,name).query('SELECT name FROM sys.databases WHERE name=@n')).recordset.length,0);console.log(JSON.stringify({cleanupVerified:name}))}await pool.close()}
},{timeout:180000})
