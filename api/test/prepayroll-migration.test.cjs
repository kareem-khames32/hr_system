'use strict'
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { fs, path, crypto, sql, apiRoot, env, pool } = require('../scripts/migrations-lib.cjs')
const database = 'hr_migration_test_' + crypto.randomBytes(8).toString('hex')
let master, p, created = false
const migration = suffix => fs.readFileSync(path.resolve(apiRoot, '../docs/migrations/' + suffix), 'utf8')
before(async () => {
  master = await pool('master')
  assert.notEqual(database, env.DB_DATABASE)
  assert.match(database, /^hr_migration_test_[a-f0-9]{16}$/)
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  p = await pool(database)
  await p.request().batch(`CREATE TABLE dbo.employees(id int PRIMARY KEY,workType nvarchar(30) NULL);
    CREATE TABLE dbo.employee_status_history(id int PRIMARY KEY,employeeId int NOT NULL,oldStatus nvarchar(100),newStatus nvarchar(100) NOT NULL,
      changedAt datetime2 NOT NULL,reason nvarchar(500),requestId int);
    CREATE TABLE dbo.transfers(id int PRIMARY KEY,fromTeam int NULL,toTeam int NOT NULL);
    CREATE TABLE dbo.custody_assignments(id int PRIMARY KEY,assignedBy int NULL);
    CREATE TABLE dbo.offboarding_cases(id int PRIMARY KEY,openedBy int NULL,settlementApprovedBy int NULL);
    CREATE TABLE dbo.clearance_items(id int PRIMARY KEY,doneBy int NULL);
    CREATE TABLE dbo.onboarding_tasks(id int PRIMARY KEY,doneBy int NULL);
    INSERT dbo.employees VALUES(1,N'fulltime'),(2,N'parttime'),(3,N'consultant'),(4,NULL);
    INSERT dbo.transfers VALUES(1,NULL,123);
    INSERT dbo.custody_assignments VALUES(1,234);
    INSERT dbo.offboarding_cases VALUES(1,345,456);
    INSERT dbo.clearance_items VALUES(1,567);
    INSERT dbo.onboarding_tasks VALUES(1,678);
    INSERT dbo.employee_status_history VALUES
    (1,1,N'iban:SA0311111111111111111111',N'iban:SA0322222222222222222222','2020-05-01',N'Approved SA0311111111111111111111 to SA0322222222222222222222 by user #7',71),
    (2,1,N'contract: 2025-01-01 → 2025-12-31',N'contract: 2026-01-01 → 2026-12-31','2020-05-02',N'Renewal reason — user #8',72),
    (3,1,N'probation',N'active','2020-05-03',N'Passed probation',73),
    (4,1,N'salary:6000',N'salary:6500','2020-05-04',N'Approved raise',74);`)
}, { timeout: 60000 })
after(async () => {
  if (p) await p.close()
  if (created) {
    assert.match(database, /^hr_migration_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
    await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
  }
  if (master) await master.close()
})
async function applySql(content) {
  const tx = new sql.Transaction(p); await tx.begin()
  try { await new sql.Request(tx).batch('SET XACT_ABORT ON;\n' + content); await tx.commit() }
  catch (err) { try { await tx.rollback() } catch {} throw err }
}
test('NAM-14/28/30 migrations preserve identity and dates, mask bank history, canonicalize known work types, and replay', async () => {
  const schema = migration('20260911_004_pre_payroll_history_actor_schema.sql')
  const data = migration('20260911_005_pre_payroll_history_work_type_data.sql')
  await applySql(schema); await applySql(data)
  const rows = (await p.request().query('SELECT * FROM dbo.employee_status_history ORDER BY id')).recordset
  assert.equal(rows.length,4)
  assert.equal(rows[0].oldStatus,null); assert.equal(rows[0].newStatus,'change')
  assert.equal(rows[0].changeType,'BANK'); assert.equal(rows[0].fieldName,'iban')
  assert.equal(JSON.parse(rows[0].oldValue),'****1111'); assert.equal(JSON.parse(rows[0].newValue),'****2222')
  assert.equal(rows[0].reason,'Approved ****1111 to ****2222 by user #7')
  assert.equal(JSON.stringify(rows).includes('SA0311111111111111111111'),false)
  assert.equal(rows[0].changedByUserId,null,'unknown actor is not guessed from text or employee id')
  assert.equal(rows[0].requestId,71); assert.equal(rows[0].changedAt.toISOString().slice(0,10),'2020-05-01')
  const { historyWithLegacyLabels } = require('../src/employees/employee-change-log')
  const contract=historyWithLegacyLabels({...rows[1],oldValue:JSON.parse(rows[1].oldValue),newValue:JSON.parse(rows[1].newValue)})
  assert.equal(contract.oldStatus,'contract: 2025-01-01 → 2025-12-31')
  assert.equal(contract.newStatus,'contract: 2026-01-01 → 2026-12-31')
  assert.equal(contract.reason,'Renewal reason — user #8')
  assert.equal(rows[2].newStatus,'active'); assert.equal(rows[2].changeType,'STATUS')
  const values=(await p.request().query(`SELECT t.fromTeamId,t.toTeamId,c.assignedByEmployeeId,o.openedByUserId,o.settlementApprovedByUserId,
    x.doneByUserId AS clearanceActor,n.doneByUserId AS onboardingActor FROM transfers t,custody_assignments c,offboarding_cases o,clearance_items x,onboarding_tasks n;`)).recordset[0]
  assert.deepEqual(values,{fromTeamId:null,toTeamId:123,assignedByEmployeeId:234,openedByUserId:345,settlementApprovedByUserId:456,clearanceActor:567,onboardingActor:678})
  assert.deepEqual((await p.request().query('SELECT workType FROM employees ORDER BY id')).recordset.map(r=>r.workType),['full_time','part_time','consultant',null])
  await applySql(schema); await applySql(data)
  assert.deepEqual((await p.request().query('SELECT * FROM dbo.employee_status_history ORDER BY id')).recordset,rows)
})
test('unknown work types block the data transition without changing other rows',async()=>{
  await p.request().query("INSERT dbo.employees VALUES(5,N'custom_unmapped'),(6,N'fulltime')")
  await assert.rejects(applySql(migration('20260911_005_pre_payroll_history_work_type_data.sql')),/Unknown workType/)
  assert.equal((await p.request().query('SELECT workType FROM employees WHERE id=6')).recordset[0].workType,'fulltime')
})
