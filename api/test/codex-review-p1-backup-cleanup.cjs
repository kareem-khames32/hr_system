'use strict'
// Only the two exact backup files created by this review's failed transport test.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),sql=require('../node_modules/mssql')
const env=require('../node_modules/dotenv').parse(fs.readFileSync(path.join(__dirname,'../.env')))
const files=['/var/opt/mssql/data/hr_opsbackup_test_d4dba6395f16d12b_daily_20261003093820_8e29149d.bak','/var/opt/mssql/data/hr_opsbackup_test_d4dba6395f16d12b_logbase_20261003093820_1a1231e9.bak']
async function main(){
 const pool=await new sql.ConnectionPool({server:'localhost',port:1433,user:env.DB_USERNAME,password:env.DB_PASSWORD,database:'master',options:{encrypt:false,trustServerCertificate:true}}).connect(),results=[]
 try{for(const file of files){
  assert.match(file,/^\/var\/opt\/mssql\/data\/hr_opsbackup_test_d4dba6395f16d12b_(daily|logbase)_20261003093820_[a-f0-9]{8}\.bak$/)
  const exists=async()=> (await pool.request().input('p',sql.NVarChar,file).query('EXEC master.dbo.xp_fileexist @p')).recordset?.[0]?.['File Exists']===1
  const before=await exists();if(before)await pool.request().input('p',sql.NVarChar,file).query('EXEC master.sys.xp_delete_files @p')
  const after=await exists();results.push({file,existed:before,absent:!after});assert.equal(after,false)
 }}finally{await pool.close()}
 fs.writeFileSync(path.join(__dirname,'codex-review-p1-backup-cleanup-results.cjs'),'module.exports = '+JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results))
}
main().catch(e=>{console.error('P1_OWNED_BACKUP_CLEANUP_FAILED',e.code||'');process.exitCode=1})
