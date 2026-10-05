'use strict'
// Read-only verification of product/test integrity and deletion of databases recorded by this review.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),scope=require('./codex-review-p2b-scope-evidence.cjs')
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')
async function main(){
 const changed=scope.files.filter(entry=>!fs.existsSync(path.join(root,entry.file))||hash(entry.file)!==entry.sha256).map(e=>e.file)
 assert.deepEqual(changed,[],'No product or pre-existing tests may change')
 const current=cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();assert.equal(current,scope.target)
 const evidenceFiles=fs.readdirSync(__dirname).filter(n=>/^codex-review-p2b-results-[a-z0-9_-]+[.]cjs$/.test(n)),databases=new Set(),shadow={ranges:0,compared:0,mismatches:0,live:0,liveRows:0},results=[]
 for(const name of evidenceFiles){const r=require(path.join(__dirname,name));results.push({file:name,tests:r.summary?.counts,failures:r.failures.map(f=>({name:f.name,error:f.error}))})
  for(const s of r.stdout||[]){const db=s.match(/CR5_DATABASE (\{.*\})/);if(db){const v=JSON.parse(db[1]);if(v.operation==='CREATE')databases.add(v.database)}
   const sh=s.match(/RANGE_SHADOW_SUMMARY (\{.*\})/);if(sh){const v=JSON.parse(sh[1]);for(const k of Object.keys(shadow))shadow[k]+=v[k]||0}
  }
 }
 // Earlier diagnostic reruns whose result file was replaced; deletion was observed at runtime too.
 for(const name of ['hr_codex_p2b_office_test_834e7365b9e9c348','hr_codex_p2b_live_test_144111a64e1a5f81','hr_codex_p2b_screen_history_test_8a3c2d1034135b62','hr_codex_p2b_screen_history_test_f8b289f70e946f1b'])databases.add(name)
 for(const name of databases)assert.match(name,/^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/)
 const env=require('../node_modules/dotenv').parse(fs.readFileSync(path.join(__dirname,'../.env')))
 // Scan only actual secrets, never print values or matching snippets.
 const secrets=Object.entries(env).filter(([k,v])=>/password|secret|token/i.test(k)&&v.length>=8).map(([,v])=>v)
 const scan=fs.readdirSync(__dirname).filter(n=>n.startsWith('codex-review-p2b-')&&fs.statSync(path.join(__dirname,n)).isFile()).map(n=>path.join(__dirname,n))
 scan.push('D:/projects/hr_system/CODEX_REVIEW_REPORT_P2B.md')
 const exposed=scan.filter(p=>{const text=fs.readFileSync(p,'utf8');return secrets.some(s=>text.includes(s))});assert.deepEqual(exposed,[],'An output contains a configured secret')
 const sql=require('../node_modules/mssql'),pool=await new sql.ConnectionPool({server:'localhost',port:1433,user:env.DB_USERNAME,password:env.DB_PASSWORD,database:'master',options:{encrypt:false,trustServerCertificate:true},connectionTimeout:5000}).connect()
 let remaining,server
 try{
  remaining=(await pool.request().input('names',sql.NVarChar(sql.MAX),JSON.stringify([...databases])).query('SELECT name FROM sys.databases WHERE name IN (SELECT value FROM OPENJSON(@names))')).recordset
  server=(await pool.request().query("SELECT CONVERT(varchar(50),SERVERPROPERTY('ProductVersion')) version,CONVERT(varchar(100),SERVERPROPERTY('Edition')) edition")).recordset[0]
 }finally{await pool.close()}
 assert.deepEqual(remaining,[],'All review databases must be removed')
 const evidence={target:current,trackedFilesUnchanged:scope.files.length,server,databasesChecked:[...databases],remainingDatabases:remaining,secretScan:'passed',shadow,results}
 fs.writeFileSync(path.join(__dirname,'codex-review-p2b-final-verification.cjs'),'module.exports = '+JSON.stringify(evidence,null,2)+'\n')
 console.log(JSON.stringify({target:current,trackedFilesUnchanged:scope.files.length,databasesAbsent:databases.size,server,secretScan:'passed',shadow}))
}
main().catch(error=>{console.error(error.message);process.exitCode=1})
