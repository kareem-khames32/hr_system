'use strict'
// Read-only final inventory: verify databases named in our evidence are absent. Never drops any database.
const fs=require('node:fs'),path=require('node:path'),sql=require('../node_modules/mssql')
const env=require('../node_modules/dotenv').parse(fs.readFileSync(path.join(__dirname,'../.env')))
;(async()=>{let pool;try{
  const names=new Set(['hr_codex_performance_test_8a59e8e1d07efbbf','hr_codex_performance_test_22e591e3090464c6','hr_codex_performance_test_5fc4d33a2df4a0f0',
    'hr_codex_memberbatch_test_236b0258ce113d05','hr_leave_attach_test_cd147f560fcaf6f6','hr_leave_year_end_test_d5022139d6d34f0f'])
  const prefixes=new Set(['hr_codex_','hr_decision_race_test_']),sources=new Set()
  for(const file of fs.readdirSync(__dirname).filter(x=>/^codex-review-round2-results-.*\.cjs$/.test(x))){
    const source=fs.readFileSync(path.join(__dirname,file),'utf8')
    for(const match of source.matchAll(/hr_[a-z0-9_]+_test_[a-f0-9]{16}/g))names.add(match[0])
    const result=JSON.parse(source.replace(/^module.exports = /,'').replace(/:\s*\[REDACTED\]/g,': false'))
    for(const selected of result.selected||[])sources.add(selected+'.integration.cjs')
    for(const row of result.results||[])if(row.file.endsWith('.integration.cjs'))sources.add(row.file)
  }
  for(const file of sources){
    const target=path.join(__dirname,path.basename(file));if(!fs.existsSync(target))continue
    for(const match of fs.readFileSync(target,'utf8').matchAll(/`(hr_[a-z0-9_]+_test_)\$\{/g))prefixes.add(match[1])
  }
  pool=await new sql.ConnectionPool({server:'localhost',port:1433,user:env.DB_USERNAME,password:env.DB_PASSWORD,database:'master',
    options:{encrypt:false,trustServerCertificate:true},connectionTimeout:5000}).connect()
  const inventory=(await pool.request().query('SELECT name,create_date FROM sys.databases')).recordset
  const live=inventory.map(r=>r.name)
  const remaining=[...names].filter(n=>live.includes(n))
  const remainingMatchingPrefixes=live.filter(n=>[...prefixes].some(prefix=>n.startsWith(prefix)))
  const ledger=(await pool.request().query('SELECT COUNT(*) appliedFiles,CONVERT(varchar(33),MAX(appliedAt),126) latestAppliedAt FROM hr_system.dbo.app_schema_migrations; SELECT TOP(1) version FROM hr_system.dbo.app_schema_migrations ORDER BY appliedAt DESC')).recordsets
  const otherMatchingDatabases=inventory.filter(r=>remainingMatchingPrefixes.includes(r.name)&&!names.has(r.name))
  const result={checkedAt:new Date().toISOString(),evidenceDatabaseNames:[...names].sort(),checkedDatabases:names.size,remaining,checkedPrefixes:[...prefixes].sort(),remainingMatchingPrefixes,otherMatchingDatabases,companyLedgerReadOnly:ledger}
  fs.writeFileSync(path.join(__dirname,'codex-review-round2-cleanup-results.cjs'),'module.exports = '+JSON.stringify(result,null,2)+'\n')
  console.log(JSON.stringify({checkedDatabases:names.size,remaining,checkedPrefixes:prefixes.size,remainingMatchingPrefixes,companyLedgerReadOnly:ledger}))
  if(remaining.length)process.exitCode=1
}catch(e){console.log(JSON.stringify({name:e.name,code:e.code,number:e.number}));process.exitCode=1}finally{if(pool)await pool.close()}})()
