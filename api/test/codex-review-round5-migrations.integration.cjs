'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path')
test('CR5 migrations 068 and 069 are additive, idempotent and match all entity metadata',async t=>{
  const f=await require('./codex-review-round5-fixture.cjs')('r5migrations')
  try{
    const migrate=require('../scripts/db-migrate.cjs')
    f.assertDisposable()
    const schedule=await f.repo('WorkSchedule').save({name:'Legacy review schedule'})
    const before=await f.ds.query('SELECT (SELECT COUNT(*) FROM users) users,(SELECT COUNT(*) FROM work_schedules) schedules')
    const schemaBefore=await f.ds.driver.createSchemaBuilder().log()
    assert.equal(schemaBefore.upQueries.length,0)
    await f.ds.query('ALTER TABLE dbo.users DROP COLUMN scopeBranchIds')
    await f.ds.query('ALTER TABLE dbo.work_schedules DROP COLUMN weekendExceptions')
    const files=['20260926_068_user_branch_scopes.sql','20260926_069_work_schedule_weekend_exceptions.sql']
    for(let round=0;round<2;round++)for(const file of files){
      const content=fs.readFileSync(path.join(__dirname,'../../docs/migrations/payroll',file),'utf8')
      assert.deepEqual(migrate.forbiddenStatements(content),[])
      assert.doesNotMatch(migrate.stripComments(content),/\b(GREATEST|LEAST|GENERATE_SERIES|DATETRUNC|JSON_OBJECT|JSON_ARRAY)\s*\(|IS\s+(?:NOT\s+)?DISTINCT\s+FROM/i)
      for(const batch of migrate.splitBatches(content)){f.assertDisposable();await f.ds.query(batch)}
    }
    assert.deepEqual(await f.ds.query('SELECT (SELECT COUNT(*) FROM users) users,(SELECT COUNT(*) FROM work_schedules) schedules'),before)
    assert.equal((await f.repo('WorkSchedule').findOneByOrFail({id:schedule.id})).weekendExceptions,null)
    assert.equal((await f.repo('User').findOneByOrFail({id:f.admin.id})).scopeBranchIds,null)
    const schema=await f.ds.driver.createSchemaBuilder().log()
    assert.deepEqual(schema.upQueries.map(q=>q.query),[])
    const [engine]=await f.ds.query("SELECT CAST(SERVERPROPERTY('ProductVersion') AS varchar(40)) version,CAST(SERVERPROPERTY('Edition') AS varchar(100)) edition,(SELECT compatibility_level FROM sys.databases WHERE name=DB_NAME()) compatibility")
    t.diagnostic(JSON.stringify({migrationFiles:files,runsEach:2,entitySchemaDelta:schema.upQueries.length,rowCountsUnchanged:true,backfill:false,engine}))
  }finally{await f.close()}
},{timeout:180000})
