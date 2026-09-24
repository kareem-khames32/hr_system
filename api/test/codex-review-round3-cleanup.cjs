'use strict'
// Final READ ONLY inventory and secret-scan summary. No cleanup by guessing names.
const fs=require('node:fs'),path=require('node:path'),sql=require('../node_modules/mssql'),assert=require('node:assert/strict')
const env=require('../node_modules/dotenv').parse(fs.readFileSync(path.join(__dirname,'../.env')))
;(async()=>{let pool;try{
 const files=fs.readdirSync(__dirname).filter(n=>/^codex-review-round3-results-.*\.cjs$/.test(n)),names=new Set()
 for(const name of files)for(const match of fs.readFileSync(path.join(__dirname,name),'utf8').matchAll(/hr_[a-z0-9_]+_test_[a-f0-9]{16}/g))names.add(match[0])
 pool=await new sql.ConnectionPool({server:'localhost',port:1433,user:env.DB_USERNAME,password:env.DB_PASSWORD,database:'master',options:{encrypt:false,trustServerCertificate:true},connectionTimeout:5000}).connect()
 const inventory=(await pool.request().query('SELECT name,create_date FROM sys.databases')).recordset
 const remaining=inventory.filter(r=>names.has(r.name)),otherCodex=inventory.filter(r=>r.name.startsWith('hr_codex_')&&!names.has(r.name))
 const ledger=(await pool.request().query('SELECT COUNT(*) appliedFiles,CONVERT(varchar(33),MAX(appliedAt),126) latestAppliedAt FROM hr_system.dbo.app_schema_migrations; SELECT TOP(1) version FROM hr_system.dbo.app_schema_migrations ORDER BY appliedAt DESC')).recordsets
 const candidates=fs.readdirSync(__dirname).filter(n=>n.startsWith('codex-review-round3-')||n==='codex-review-round2-performance-round3-500-original.cjs').map(n=>path.join(__dirname,n))
 const report=path.resolve(__dirname,'../../CODEX_REVIEW_REPORT_3.md');if(fs.existsSync(report))candidates.push(report)
 const secrets=Object.entries(env).filter(([k,v])=>/password|secret|token|ad_bind_dn|smtp_(host|from|user)|ad_host/i.test(k)&&v.length>2).map(([,v])=>v)
 const matches=[];for(const file of candidates){const source=fs.readFileSync(file,'utf8');if(secrets.some(secret=>source.includes(secret)))matches.push(path.basename(file))}
 const result={checkedAt:new Date().toISOString(),evidenceDatabaseNames:[...names].sort(),checkedDatabases:names.size,remaining,otherCodex,companyLedgerReadOnly:ledger,secretScan:{files:candidates.length,filesWithSecret:matches}}
 fs.writeFileSync(path.join(__dirname,'codex-review-round3-cleanup-results.cjs'),'module.exports = '+JSON.stringify(result,null,2)+'\n')
 console.log(JSON.stringify({checkedDatabases:names.size,remaining,otherCodex,companyLedgerReadOnly:ledger,secretScan:result.secretScan}))
 assert.equal(remaining.length,0);assert.equal(otherCodex.length,0);assert.equal(matches.length,0)
 }catch(e){console.log(JSON.stringify({name:e.name,code:e.code,number:e.number}));process.exitCode=1}finally{if(pool)await pool.close()}})()
