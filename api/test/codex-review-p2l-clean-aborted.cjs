'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),sql=require('../node_modules/mssql')
const database='hr_policies_test_b5e37b8a17c61bbf'
async function main(){
 assert.match(database,/^hr_policies_test_[a-f0-9]{16}$/)
 const env=require('../node_modules/dotenv').parse(fs.readFileSync(path.join(__dirname,'../.env')))
 assert.notEqual(database,env.DB_DATABASE)
 const p=await new sql.ConnectionPool({server:'localhost',port:1433,user:env.DB_USERNAME,password:env.DB_PASSWORD,database:'master',options:{encrypt:false,trustServerCertificate:true}}).connect()
 try{await p.request().query(`IF DB_ID(N'${database}') IS NOT NULL BEGIN ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]; END`)
 assert.equal((await p.request().input('n',sql.NVarChar,database).query('SELECT name FROM sys.databases WHERE name=@n')).recordset.length,0)
 const result={selected:['policies (old transport aborted)'],summary:{counts:{tests:0,passed:0,failed:0}},failures:[],stdout:[`CR5_DATABASE ${JSON.stringify({operation:'CREATE',database})}`],note:'Stopped own suspended test run: old in-process transport does not observe res.destroy. Database verified absent; rerun uses abort-aware test transport.'}
 fs.writeFileSync(path.join(__dirname,'codex-review-p2l-results-aborted.cjs'),'module.exports = '+JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({cleanupVerified:database}))
 }finally{await p.close()}
}main().catch(e=>{console.error(e.message);process.exitCode=1})
