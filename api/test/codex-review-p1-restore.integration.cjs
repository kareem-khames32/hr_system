'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),setup=require('./codex-review-p1-fixture.cjs')
test('P1 restore and CHECKDB recover a full synthetic schema and exact employee data',async t=>{
 const f=await setup('p1_backup'),target=`hr_codex_p1_restore_test_${crypto.randomBytes(8).toString('hex')}`,file=`/var/opt/mssql/data/${target}.bak`
 const migrate=require('../scripts/db-migrate.cjs'),ops=require('../scripts/ops-restore-check.cjs'),guard=require('./codex-review-round5-harness.cjs')
 guard.safeDatabase(f.database);guard.safeDatabase(target);assert.notEqual(target,f.database)
 try{
  const branch=await f.repo('Branch').save({code:'P1-BAK',name:'Synthetic backup branch'}); const emp=await f.repo('Employee').save({branchId:branch.id,employeeCode:'P1-BACKUP',fullName:'Synthetic restore employee',basicSalary:1234.56,joinDate:'2020-01-01'})
  await f.master.request().input('p',file).query(`BACKUP DATABASE [${f.database}] TO DISK=@p WITH COPY_ONLY,CHECKSUM,INIT,FORMAT`)
  await f.master.request().input('p',file).query('RESTORE VERIFYONLY FROM DISK=@p WITH CHECKSUM')
  await migrate.restoreCopy(f.master,file,target);console.log('CR5_DATABASE '+JSON.stringify({operation:'CREATE',database:target}))
  const inspection=await ops.inspect(f.master,target),source=await ops.inspect(f.master,f.database)
  assert.deepEqual(inspection,source)
  const [restored]=(await f.master.request().input('id',emp.id).query(`SELECT employeeCode,fullName,basicSalary FROM [${target}].dbo.employees WHERE id=@id`)).recordset
  assert.equal(restored.employeeCode,'P1-BACKUP');assert.equal(Number(restored.basicSalary),1234.56)
  t.diagnostic(JSON.stringify({case:'native-sql-restore',inspection,employeeAmount:Number(restored.basicSalary),transportAndOffsiteCopyTested:false}))
 }finally{
  await migrate.dropCopy(f.master,target)
  assert.equal((await f.master.request().input('n',target).query('SELECT DB_ID(@n) id')).recordset[0].id,null)
  await f.master.request().input('p',file).query('EXEC master.sys.xp_delete_files @p')
  const exists=(await f.master.request().input('p',file).query('EXEC master.dbo.xp_fileexist @p')).recordset[0]['File Exists'];assert.equal(exists,0)
  t.diagnostic(JSON.stringify({restoredDatabaseDropped:target,ownedBackupDeleted:file}));await f.close()
 }
},{timeout:180000})
