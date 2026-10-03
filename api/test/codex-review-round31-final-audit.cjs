'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),mainRoot=path.resolve(root,'../../..'),baseline=path.resolve(root,'../base-162d50e')
const scope=require('./codex-review-round31-scope-evidence.cjs')
const git=(args,cwd=root)=>execFileSync('git',['-c',`safe.directory=${cwd.replaceAll('\\','/')}`,...args],{cwd,encoding:'utf8'}).trim()
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const env=require('../node_modules/dotenv').parse(fs.readFileSync(path.join(root,'api/.env')))
const secrets=Object.entries(env).filter(([k,v])=>/password|secret|token|ad_bind_dn|smtp_(host|from|user)|ad_host/i.test(k)&&v.length>2).map(([,v])=>v)
async function main(){
 assert.equal(git(['rev-parse','HEAD']),scope.target)
 const changed=scope.files.filter(x=>hash(path.join(root,x.file))!==x.sha256).map(x=>x.file);assert.deepEqual(changed,[])
 assert.equal(git(['diff','--name-only',scope.target,'--','api/src','src','docs','api/test']),'')
 const baselineHead=git(['rev-parse','HEAD'],baseline);assert.ok(baselineHead.startsWith('162d50e'))
 assert.equal(git(['diff','--name-only',baselineHead,'--','api/src','src','api/test'],baseline),'')
 const owned=new Set(),dropped=new Set()
 for(const file of fs.readdirSync(__dirname).filter(f=>/^codex-review-round31-results-.*\.cjs$/.test(f))){
  const r=require(path.join(__dirname,file))
  for(const s of r.stdout||[])for(const m of s.matchAll(/CR5_DATABASE (\{[^\r\n]+\})/g)){
   const row=JSON.parse(m[1]);assert.match(row.database,/^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/)
   if(row.operation==='CREATE')owned.add(row.database);if(row.operation==='DROP')dropped.add(row.database)
  }
 }
 const sql=require('../node_modules/mssql'),pool=await new sql.ConnectionPool({server:'localhost',port:1433,user:env.DB_USERNAME,password:env.DB_PASSWORD,database:'master',options:{encrypt:false,trustServerCertificate:true},connectionTimeout:5000}).connect()
 const databases=[];let engine
 try{
  engine=(await pool.request().query("SELECT CONVERT(varchar(128),SERVERPROPERTY('ProductVersion')) productVersion, CONVERT(varchar(128),SERVERPROPERTY('Edition')) edition")).recordset[0]
  for(const name of [...owned].sort()){
   assert.notEqual(name,env.DB_DATABASE);assert.ok(!/^hr_system$|^hr_review_pre_payroll/i.test(name))
   const rows=(await pool.request().input('name',sql.NVarChar,name).query('SELECT name FROM sys.databases WHERE name=@name')).recordset
   databases.push({name,dropRecorded:dropped.has(name),absent:rows.length===0})
  }
 }finally{await pool.close()}
 assert.ok(databases.length>0);assert.ok(databases.every(d=>d.dropRecorded&&d.absent))
 const report=path.join(mainRoot,'CODEX_REVIEW_REPORT_31.md');assert.ok(fs.existsSync(report))
 const scan=fs.readdirSync(__dirname).filter(f=>f.startsWith('codex-review-round31-')).map(f=>path.join(__dirname,f)).filter(f=>fs.statSync(f).isFile());scan.push(report)
 const matches=scan.filter(file=>{const s=fs.readFileSync(file,'utf8');return secrets.some(v=>s.includes(v))||/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(s)}).map(p=>path.basename(p))
 assert.deepEqual(matches,[])
 const temporary=path.resolve(__dirname,'codex-review-round31-tmp')
 assert.equal(path.dirname(temporary),path.resolve(root,'api/test'));assert.equal(path.basename(temporary),'codex-review-round31-tmp')
 if(fs.existsSync(temporary)){
  assert.equal(fs.realpathSync(temporary),temporary);assert.equal(fs.lstatSync(temporary).isSymbolicLink(),false)
  assert.ok(fs.readdirSync(temporary).every(n=>n==='v8-compile-cache'))
  fs.rmSync(temporary,{recursive:true,force:true})
 }
 assert.equal(fs.existsSync(temporary),false)
 const preserved=[root,baseline,...[root,baseline].flatMap(p=>[path.join(p,'node_modules'),path.join(p,'api/node_modules')])];assert.ok(preserved.every(p=>fs.existsSync(p)))
 const output={checkedAt:new Date().toISOString(),target:scope.target,baselineHead,trackedFilesChecked:scope.files.length,trackedFilesChanged:changed,engine,testDatabaseCompatibility:150,
  databaseCount:databases.length,databases,allDropped:true,secretScan:{files:scan.length,filesWithMatches:matches},privateTemporaryDirectoryRemoved:true,preservedSuppliedWorktreesAndDependencies:preserved,
  evidence:require('./codex-review-round31-evidence-results.cjs'),performanceMeasured:false}
 fs.writeFileSync(path.join(__dirname,'codex-review-round31-final-audit-results.cjs'),'module.exports = '+JSON.stringify(output,null,2)+'\n')
 console.log(JSON.stringify({databaseCount:databases.length,allDropped:true,trackedFilesChecked:scope.files.length,changed,secretMatches:matches,preservedWorktrees:true,engine}))
}
main().catch(error=>{console.error(error.code||'CR31_FINAL_AUDIT_FAILED');process.exitCode=1})
