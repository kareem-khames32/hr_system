'use strict'
// Read-only connection diagnostics. Never outputs SQL text, parameters, credentials or company rows.
const fs=require('node:fs'),path=require('node:path'),sql=require('../node_modules/mssql')
const env=require('../node_modules/dotenv').parse(fs.readFileSync(path.join(__dirname,'../.env')))
;(async()=>{let p;try{
 p=await new sql.ConnectionPool({server:'localhost',port:1433,user:env.DB_USERNAME,password:env.DB_PASSWORD,database:'master',options:{encrypt:false,trustServerCertificate:true}}).connect()
 const r=await p.request().query(`SELECT DB_NAME(r.database_id) db,r.status,r.command,r.wait_type,r.wait_time,r.blocking_session_id,r.total_elapsed_time,r.cpu_time,r.reads,r.logical_reads,r.writes,c.net_packet_size,c.encrypt_option
 FROM sys.dm_exec_requests r JOIN sys.dm_exec_connections c ON r.session_id=c.session_id
 WHERE DB_NAME(r.database_id) LIKE 'hr_codex%';
 SELECT name,create_date FROM sys.databases WHERE name LIKE 'hr_codex%';`)
 console.log(JSON.stringify({requests:r.recordsets[0],databases:r.recordsets[1]}))
 }catch(e){console.log(JSON.stringify({name:e.name,code:e.code,number:e.number}));process.exitCode=1}finally{if(p)await p.close()}})()
