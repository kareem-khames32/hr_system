'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),sql=require('../node_modules/mssql')
const env=require('../node_modules/dotenv').parse(fs.readFileSync(path.join(__dirname,'../.env')))
;(async()=>{
 const owned=new Set()
 for(const name of fs.readdirSync(__dirname).filter(n=>/^codex-review-p3e-results-[a-z0-9_-]+\.cjs$/.test(n))){for(const out of require(path.join(__dirname,name)).stdout||[]){for(const m of out.matchAll(/CR5_DATABASE (\{[^\n]+\})/g)){const e=JSON.parse(m[1]);if(e.operation==='CREATE')owned.add(e.database)}}}
 const pool=await new sql.ConnectionPool({server:'localhost',port:1433,user:env.DB_USERNAME,password:env.DB_PASSWORD,database:'master',options:{encrypt:false,trustServerCertificate:true},connectionTimeout:5000}).connect()
 const removed=[]
 try{
  const rows=(await pool.request().input('owned',sql.NVarChar(sql.MAX),JSON.stringify([...owned])).query("SELECT name FROM sys.databases WHERE name IN (SELECT value FROM OPENJSON(@owned)) OR name LIKE N'hr[_]codex[_]p3e[_]%'")).recordset
  for(const {name} of rows){assert.match(name,/^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/);assert.ok(owned.has(name)||/^hr_codex_p3e_/.test(name));assert.ok(!/^hr_system$|^hr_review_pre_payroll/i.test(name));assert.notEqual(name,env.DB_DATABASE);await pool.request().query(`ALTER DATABASE [${name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${name}]`);removed.push(name)}
 }finally{await pool.close()}
 fs.writeFileSync(path.join(__dirname,'codex-review-p3e-cleanup-evidence.cjs'),'module.exports = '+JSON.stringify({removed,previousCreated:[...owned]},null,2)+'\n');console.log(JSON.stringify({owned:owned.size,removed}))
})().catch(e=>{console.error(e.message);process.exitCode=1})
