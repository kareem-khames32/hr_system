'use strict'
// Read-only company metadata and one SELECT plan; never DDL/DML on the company database.
const fs=require('node:fs'),path=require('node:path'),sql=require('../node_modules/mssql')
const env=require('../node_modules/dotenv').parse(fs.readFileSync(path.join(__dirname,'../.env')))
;(async()=>{let pool
try{
  pool=await new sql.ConnectionPool({server:'localhost',port:1433,user:env.DB_USERNAME,password:env.DB_PASSWORD,database:'hr_system',
    options:{encrypt:false,trustServerCertificate:true},connectionTimeout:5000,requestTimeout:120000}).connect()
  const indexes=(await pool.request().query(`SELECT t.name tableName,i.name indexName,i.type_desc,i.is_unique,i.has_filter,
    (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name+CASE WHEN ic.is_descending_key=1 THEN ' DESC' ELSE '' END),',') WITHIN GROUP (ORDER BY ic.key_ordinal)
     FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id
     WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.is_included_column=0) keys,
    (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),',') FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id
     WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.is_included_column=1) included
    FROM sys.tables t JOIN sys.indexes i ON i.object_id=t.object_id WHERE i.index_id>0 AND t.name IN
    ('attendance_days','attendance_punches','attendance_exemptions','attendance_rule_versions','employee_salary_history_versions',
     'payroll_runs','payroll_items','employees','weekly_schedule_entries','schedule_day_overrides','leaves','requests_config') ORDER BY t.name,i.index_id`)).recordset
  const schema=(await pool.request().query(`SELECT CAST(SERVERPROPERTY('ProductVersion') AS varchar(30)) version,
    CAST(SERVERPROPERTY('Edition') AS varchar(80)) edition, (SELECT compatibility_level FROM sys.databases WHERE name=DB_NAME()) compatibility,
    (SELECT COUNT(*) FROM sys.foreign_keys) foreignKeys,(SELECT COUNT(*) FROM sys.tables) tables,
    COL_LENGTH('dbo.payroll_items','paidPayMethod') paidPayMethodBytes;
    SELECT OBJECT_NAME(parent_object_id) tableName,COUNT(*) fkCount FROM sys.foreign_keys GROUP BY parent_object_id`)).recordsets
  const info=[];const request=pool.request();request.on('info',m=>info.push(m.message))
  const plan=await request.input('day',sql.Date,'2026-09-22').query('SET STATISTICS XML ON; SET STATISTICS IO ON; SELECT * FROM dbo.attendance_days WHERE [date]=@day ORDER BY employeeId; SET STATISTICS XML OFF; SET STATISTICS IO OFF;')
  const xml=plan.recordsets.flat().map(row=>Object.entries(row).find(([key])=>key.includes('Showplan'))?.[1]).find(Boolean)||''
  const operators=[...xml.matchAll(/<RelOp\b[^>]*PhysicalOp="([^"]+)"[^>]*>/g)].map(m=>m[1])
  const objects=[...xml.matchAll(/<Object\b[^>]*Table="([^"]+)"[^>]*Index="([^"]+)"[^>]*>/g)].map(m=>({table:m[1],index:m[2]}))
  const counters=[...xml.matchAll(/<RunTimeCountersPerThread\b[^>]*>/g)].map(m=>Object.fromEntries([...m[0].matchAll(/(ActualRows|ActualRowsRead|ActualLogicalReads|ActualElapsedms|ActualCPUms)="([^"]+)"/g)].map(x=>[x[1],Number(x[2])])))
  const result={schema,indexes,dailyReadPlan:{rows:plan.recordsets[0].length,operators,objects,counters,io:info}}
  fs.writeFileSync(path.join(__dirname,'codex-review-round3-schema-results.cjs'),'module.exports = '+JSON.stringify(result,null,2)+'\n')
  console.log(JSON.stringify({schema,dailyReadPlan:result.dailyReadPlan,indexes:indexes.length}))
}catch(e){console.log(JSON.stringify({code:e.code,number:e.number,name:e.name}));process.exitCode=1}finally{if(pool)await pool.close()}})()
