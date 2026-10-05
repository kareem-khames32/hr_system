'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),scope=require('./codex-review-p2a-scope-evidence.cjs'),report=path.resolve(root,'../../../CODEX_REVIEW_REPORT_P2A.md')
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const env=require('../node_modules/dotenv').parse(fs.readFileSync(path.join(root,'api/.env')))
const secrets=Object.entries(env).filter(([k,v])=>/password|secret|token|ad_bind_dn|smtp_(host|from|user)|ad_host/i.test(k)&&v.length>2).map(([,v])=>v)
async function main(){
 assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),scope.target)
 assert.equal(execFileSync('git',['diff','--name-only',scope.target,'--','api/src','api/scripts','src','docs','api/test'],{cwd:root,encoding:'utf8'}).trim(),'')
 const changed=[...scope.files,...scope.preexisting].filter(x=>hash(path.join(root,x.file))!==x.sha256).map(x=>x.file);assert.deepEqual(changed,[])
 const owned=new Set(),dropped=new Set()
 for(const file of fs.readdirSync(__dirname).filter(n=>/^codex-review-p2a-results-.*\.cjs$/.test(n))){const r=require(path.join(__dirname,file));for(const s of r.stdout||[])for(const m of s.matchAll(/CR5_DATABASE (\{[^\r\n]+\})/g)){const row=JSON.parse(m[1]);assert.match(row.database,/^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/);if(row.operation==='CREATE')owned.add(row.database);if(row.operation==='DROP')dropped.add(row.database)}}
 const backup=require('./codex-review-p2a-backup-cleanup-results.cjs');owned.add(backup.database)
 const sql=require('../node_modules/mssql'),pool=await new sql.ConnectionPool({server:'localhost',port:1433,user:env.DB_USERNAME,password:env.DB_PASSWORD,database:'master',options:{encrypt:false,trustServerCertificate:true}}).connect(),databases=[]
 let engine
 try{
  engine=(await pool.request().query("SELECT CONVERT(varchar(128),SERVERPROPERTY('ProductVersion')) productVersion,CONVERT(varchar(128),SERVERPROPERTY('Edition')) edition")).recordset[0]
  for(const name of [...owned].sort()){assert.notEqual(name,env.DB_DATABASE);assert.ok(!/^hr_system$|^hr_review_pre_payroll/i.test(name));const rows=(await pool.request().input('name',sql.NVarChar,name).query('SELECT name FROM sys.databases WHERE name=@name')).recordset;databases.push({name,dropRecorded:dropped.has(name),absent:rows.length===0})}
  assert.ok(databases.length>0);assert.ok(databases.every(d=>d.absent));assert.ok(databases.every(d=>d.dropRecorded||d.name===backup.database))
  assert.match(backup.file,/^\/var\/opt\/mssql\/data\/hr_migrate_test_8ecf54c8902a46ea_freeze_20261005010238_134b9994\.bak$/)
  assert.equal((await pool.request().input('p',sql.NVarChar,backup.file).query('EXEC master.dbo.xp_fileexist @p')).recordset[0]['File Exists'],0)
 }finally{await pool.close()}
 assert.ok(fs.existsSync(report))
 const scan=fs.readdirSync(__dirname).filter(n=>n.startsWith('codex-review-p2a-')).map(n=>path.join(__dirname,n)).filter(p=>fs.statSync(p).isFile());scan.push(report)
 const matches=scan.filter(file=>{const s=fs.readFileSync(file,'utf8');return secrets.some(v=>s.includes(v))||/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(s)}).map(p=>path.basename(p));assert.deepEqual(matches,[])
 const temporary=path.resolve(__dirname,'codex-review-p2a-tmp');assert.equal(path.dirname(temporary),path.resolve(root,'api/test'));assert.equal(path.basename(temporary),'codex-review-p2a-tmp')
 const verifyTree=dir=>{assert.equal(fs.lstatSync(dir).isSymbolicLink(),false);for(const child of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,child.name);assert.equal(fs.lstatSync(p).isSymbolicLink(),false);if(child.isDirectory())verifyTree(p)}}
 if(fs.existsSync(temporary)){assert.equal(fs.realpathSync(temporary).toLowerCase(),temporary.toLowerCase());verifyTree(temporary);fs.rmSync(temporary,{recursive:true,force:true})}
 const preserved=[root,path.join(root,'node_modules'),path.join(root,'api/node_modules')];assert.ok(preserved.every(p=>fs.existsSync(p)))
 const result={target:scope.target,base:scope.base,checkedAt:new Date().toISOString(),trackedFilesChecked:scope.files.length,preexistingUntrackedChecked:scope.preexisting,changed,engine,compatibilityUsed:150,databases,databaseCount:databases.length,allAbsent:true,backupAbsent:backup.file,secretScan:{files:scan.length,matches},privateTemporaryDirectoryRemoved:!fs.existsSync(temporary),suppliedWorktreeAndDependenciesPreserved:true,performanceMeasured:false}
 fs.writeFileSync(path.join(__dirname,'codex-review-p2a-final-audit-results.cjs'),'module.exports = '+JSON.stringify(result,null,2)+'\n')
 console.log(JSON.stringify({target:scope.target,trackedFilesChecked:scope.files.length,changed,databases:databases.length,allAbsent:true,backupAbsent:true,secretMatches:matches,preserved:true,engine}))
}
main().catch(e=>{console.error('P2A_FINAL_AUDIT_FAILED',e.code||'');console.error(String(e.stack||'').split('\n').filter(l=>l.includes('codex-review-p2a-final-audit.cjs')).join('\n'));process.exitCode=1})
