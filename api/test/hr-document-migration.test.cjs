'use strict'
// Real SQL Server DDL in a random disposable database. No app/bootstrap/services.
const {test,before,after}=require('node:test')
const assert=require('node:assert/strict')
const {fs,path,crypto,sql,env,pool,apiRoot}=require('../scripts/migrations-lib.cjs')
const {DataSource}=require('../node_modules/typeorm')
const {HrDocumentTemplate,HrDocumentTemplateRevision,HrIssuedDocument}=require('../src/hr-documents/hr-document.entities')
const database='hr_hrdoc_migration_test_'+crypto.randomBytes(8).toString('hex')
const migration=fs.readFileSync(path.resolve(apiRoot,'../docs/migrations/20260912_007_pre_payroll_hr_document_templates.sql'),'utf8')
let master,p,ds,created=false
const content={title:'Synthetic factory contract',greeting:'',body:'Contract body {{employee.fullName}}',closing:'Employee signature: ______',footer:''}
const fields=[{key:'custom.shift',label:'Factory shift',required:true}]
async function apply(extra=''){
  const tx=new sql.Transaction(p);await tx.begin()
  try{await new sql.Request(tx).batch('SET XACT_ABORT ON;\n'+migration+'\n'+extra);await tx.commit()}
  catch(err){try{await tx.rollback()}catch{}throw err}
}
async function existingRows(){return (await p.request().query('SELECT * FROM dbo.existing_document_canary ORDER BY id')).recordset}
before(async()=>{
  assert.match(database,/^hr_hrdoc_migration_test_[a-f0-9]{16}$/);assert.notEqual(database,env.DB_DATABASE)
  assert.doesNotMatch(migration,/\b(?:DROP|DELETE|UPDATE|TRUNCATE|ALTER\s+TABLE)\b/i,'007 must only create new structures')
  master=await pool('master');await master.request().query(`CREATE DATABASE [${database}]`);created=true
  p=await pool(database)
  await p.request().batch("CREATE TABLE dbo.existing_document_canary(id int PRIMARY KEY,metadata nvarchar(max) NOT NULL,originalBytes varbinary(max) NOT NULL); INSERT dbo.existing_document_canary VALUES(9,N'{\"fileRef\":\"file:18\",\"kind\":\"signed_contract\"}',0x0123ABCD)")
  ds=new DataSource({type:'mssql',host:env.DB_HOST||'localhost',port:Number(env.DB_PORT||1433),username:env.DB_USERNAME,password:env.DB_PASSWORD,database,
    options:{encrypt:false,trustServerCertificate:env.DB_TRUST_SERVER_CERTIFICATE!=='false'},entities:[HrDocumentTemplate,HrDocumentTemplateRevision,HrIssuedDocument],synchronize:false,logging:false})
  await ds.initialize()
},{timeout:60000})
after(async()=>{
  if(ds?.isInitialized)await ds.destroy();if(p)await p.close()
  if(created){assert.match(database,/^hr_hrdoc_migration_test_[a-f0-9]{16}$/);assert.notEqual(database,env.DB_DATABASE);await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)}
  if(master)await master.close()
})
test('HR007 transactional DDL rollback leaves existing document data and no partial tables',async()=>{
  const existing=await existingRows()
  await assert.rejects(apply("THROW 50091,'Synthetic rollback after additive DDL',1;"),/Synthetic rollback/)
  assert.equal((await p.request().query("SELECT COUNT(*) AS n FROM sys.tables WHERE name IN('hr_document_templates','hr_document_template_revisions','hr_issued_documents')")).recordset[0].n,0)
  assert.deepEqual(await existingRows(),existing)
})
test('HR007 creates exact current TypeORM schema without changing existing document bytes',async()=>{
  const existing=await existingRows();await apply()
  const diff=await ds.driver.createSchemaBuilder().log()
  assert.deepEqual(diff.upQueries.map(q=>q.query),[])
  assert.deepEqual(await existingRows(),existing)
})
test('HR007 replay preserves saved drafts revisions snapshots and unique issuance constraints',async()=>{
  const templates=ds.getRepository(HrDocumentTemplate), revisions=ds.getRepository(HrDocumentTemplateRevision),issued=ds.getRepository(HrIssuedDocument)
  const template=await templates.save({name:'Original factory contract',category:'contract',draft:content,customFields:fields,updatedByUserId:51})
  const revision=await revisions.save({templateId:template.id,revision:1,name:template.name,category:'contract',content,customFields:fields,publishedByUserId:51})
  await templates.update(template.id,{publishedRevisionId:revision.id})
  const snapshot={content,companyName:'Synthetic factory',companyNameEn:'',companyAddress:'',companyPhone:'',commercialRegister:'',issuedDate:'2026-09-12',requestRef:'HRDOC-TEST-1',templateName:template.name,category:'contract',revision:1,values:{'employee.fullName':'Synthetic employee','custom.shift':'Morning'}}
  const key=crypto.randomUUID()
  const row={reference:'HRDOC-TEST-1',templateId:template.id,revisionId:revision.id,employeeId:17,branchId:3,fileId:101,employeeDocumentId:29,templateName:template.name,category:'contract',isFinancial:true,issuedByUserId:51,idempotencyKey:key,inputHash:'a'.repeat(64),snapshot}
  const saved=await issued.save(row)
  const before={templates:await templates.find(),revisions:await revisions.find(),issued:await issued.find(),existing:await existingRows()}
  await apply();await apply()
  assert.deepEqual({templates:await templates.find(),revisions:await revisions.find(),issued:await issued.find(),existing:await existingRows()},before)
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q=>q.query),[])
  for(const duplicate of [
    {...row,reference:'HRDOC-TEST-2',fileId:102},
    {...row,reference:'HRDOC-TEST-2',idempotencyKey:crypto.randomUUID()},
    {...row,fileId:102,idempotencyKey:crypto.randomUUID()},
  ])await assert.rejects(issued.insert(duplicate),/duplicate|unique/i)
  await assert.rejects(revisions.insert({templateId:template.id,revision:1,name:'Duplicate',category:'contract',content,customFields:[]}),/duplicate|unique/i)
  assert.equal(await issued.count(),1)
  assert.deepEqual((await issued.findOneByOrFail({id:saved.id})).snapshot,snapshot)
  const independent=await issued.save({...row,reference:'HRDOC-OTHER-ACTOR',fileId:103,issuedByUserId:52,employeeId:null,branchId:null,employeeDocumentId:null})
  assert.equal(independent.idempotencyKey,key,'operation keys are scoped to the issuing user')
})
