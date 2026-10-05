'use strict'
// Exact disposable backup left by db-migrate.test's unavailable Linux-to-Windows copy transport.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),sql=require('../node_modules/mssql')
const env=require('../node_modules/dotenv').parse(fs.readFileSync(path.join(__dirname,'../.env')))
const name='hr_migrate_test_8ecf54c8902a46ea',file='/var/opt/mssql/data/hr_migrate_test_8ecf54c8902a46ea_freeze_20261005010238_134b9994.bak'
async function main(){
 assert.match(name,/^hr_migrate_test_[a-f0-9]{16}$/);assert.match(file,/^\/var\/opt\/mssql\/data\/hr_migrate_test_8ecf54c8902a46ea_freeze_20261005010238_134b9994\.bak$/)
 const pool=await new sql.ConnectionPool({server:'localhost',port:1433,user:env.DB_USERNAME,password:env.DB_PASSWORD,database:'master',options:{encrypt:false,trustServerCertificate:true}}).connect()
 let result
 try{
  const exists=async()=> (await pool.request().input('p',sql.NVarChar,file).query('EXEC master.dbo.xp_fileexist @p')).recordset[0]['File Exists']===1
  const before=await exists();if(before)await pool.request().input('p',sql.NVarChar,file).query('EXEC master.sys.xp_delete_files @p')
  assert.equal(await exists(),false)
  const found=(await pool.request().input('name',sql.NVarChar,name).query('SELECT name FROM sys.databases WHERE name=@name')).recordset
  assert.equal(found.length,0);result={file,existed:before,absent:true,database:name,databaseAbsent:true}
 }finally{await pool.close()}
 fs.writeFileSync(path.join(__dirname,'codex-review-p2a-backup-cleanup-results.cjs'),'module.exports = '+JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result))
}
main().catch(e=>{console.error('P2A_OWNED_BACKUP_CLEANUP_FAILED',e.code||'');process.exitCode=1})
