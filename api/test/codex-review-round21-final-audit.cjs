'use strict'
// Only reads master metadata; removal is restricted to our checked snapshot/cache directories.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),snapshot=path.join(__dirname,'codex-review-round21-snapshot'),temporary=path.join(__dirname,'codex-review-round21-tmp')
const git=(args,cwd=root)=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim()
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const scope=require('./codex-review-round21-scope-evidence.cjs')
const env=require('../node_modules/dotenv').parse(fs.readFileSync(path.join(root,'api/.env')))
const secrets=Object.entries(env).filter(([k,v])=>/password|secret|token|ad_bind_dn|smtp_(host|from|user)|ad_host/i.test(k)&&v.length>2).map(([,v])=>v)
const owned=new Set(),dropped=new Set(),executions=[]
for(const file of fs.readdirSync(__dirname).filter(f=>/^codex-review-round21-results-.*\.cjs$/.test(f))){
  const result=require(path.join(__dirname,file))
  executions.push({file,selected:result.selected,success:result.summary.success,counts:result.summary.counts})
  for(const s of result.stdout||[])for(const m of s.matchAll(/CR5_DATABASE (\{[^\r\n]+\})/g)){
    const d=JSON.parse(m[1]);assert.match(d.database,/^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/)
    if(d.operation==='CREATE')owned.add(d.database);if(d.operation==='DROP')dropped.add(d.database)
  }
}
async function main(){
  const sql=require('../node_modules/mssql'),databases=[]
  const pool=await new sql.ConnectionPool({server:'localhost',port:1433,user:env.DB_USERNAME,password:env.DB_PASSWORD,database:'master',options:{encrypt:false,trustServerCertificate:true},connectionTimeout:5000}).connect()
  let engine
  try{
    engine=(await pool.request().query("SELECT CONVERT(varchar(128),SERVERPROPERTY('ProductVersion')) AS productVersion, CONVERT(varchar(128),SERVERPROPERTY('Edition')) AS edition")).recordset[0]
    for(const name of [...owned].sort()){
      assert.match(name,/^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/);assert.ok(!/^hr_system$|^hr_review_pre_payroll/i.test(name));assert.notEqual(name,env.DB_DATABASE)
      const r=await pool.request().input('name',sql.NVarChar,name).query('SELECT name FROM sys.databases WHERE name=@name')
      databases.push({name,dropRecorded:dropped.has(name),absent:r.recordset.length===0})
    }
  }finally{await pool.close()}
  const snapshotHead=git(['rev-parse','HEAD'],snapshot)
  assert.equal(snapshotHead,'d530d55fca96593254dc1c08f7257ec9e5c2d1e3')
  const product=scope.product.map(x=>({...x,unchanged:hash(path.join(snapshot,x.file))===x.sha256}))
  const priorEvidenceChanged=scope.originalEvidence.filter(x=>hash(path.join(root,x.file))!==x.sha256).map(x=>x.file)
  const snapshotProductDiff=git(['diff','--name-only','d530d55','--','api/src','src','docs/migrations'],snapshot)
  const originalProductDiff=git(['diff','--name-only','d530d55','--','api/src','src','docs/migrations'])
  assert.equal(fs.existsSync(path.join(snapshot,'api/.env')),false)
  const scanFiles=fs.readdirSync(__dirname).filter(f=>f.startsWith('codex-review-round21-')).map(f=>path.join(__dirname,f)).filter(f=>fs.statSync(f).isFile())
  const report=path.join(root,'CODEX_REVIEW_REPORT_20.md');assert.ok(fs.existsSync(report));scanFiles.push(report)
  const secretMatches=[]
  for(const file of scanFiles){const s=fs.readFileSync(file,'utf8');if(secrets.some(v=>s.includes(v))||/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(s))secretMatches.push(path.basename(file))}
  assert.equal(databases.length,13);assert.ok(databases.every(d=>d.dropRecorded&&d.absent))
  assert.ok(product.every(x=>x.unchanged));assert.equal(snapshotProductDiff,'');assert.deepEqual(priorEvidenceChanged,[]);assert.deepEqual(secretMatches,[])
  // Verify the exact absolute workspace paths before any recursive removal. Unlink junctions first.
  for(const dir of [snapshot,temporary]){
    assert.equal(path.dirname(path.resolve(dir)),path.resolve(root,'api/test'))
    assert.ok(['codex-review-round21-snapshot','codex-review-round21-tmp'].includes(path.basename(dir)))
    assert.equal(fs.realpathSync(dir),path.resolve(dir));assert.equal(fs.lstatSync(dir).isSymbolicLink(),false)
  }
  const temporaryEntries=fs.readdirSync(temporary)
  assert.ok(temporaryEntries.every(n=>n==='v8-compile-cache'),'Unexpected remaining temp artifacts: inspect before cleanup')
  const dependencies=[]
  for(const part of ['', 'api']){
    const junction=path.join(snapshot,part,'node_modules'),source=path.join(root,part,'node_modules')
    assert.equal(fs.lstatSync(junction).isSymbolicLink(),true);assert.equal(fs.realpathSync(junction),fs.realpathSync(source))
    fs.unlinkSync(junction);assert.equal(fs.existsSync(junction),false);assert.equal(fs.existsSync(source),true)
    dependencies.push({path:source,preserved:true})
  }
  fs.rmSync(snapshot,{recursive:true,force:true});fs.rmSync(temporary,{recursive:true,force:true})
  const output={checkedAt:new Date().toISOString(),head:git(['rev-parse','HEAD']),target:scope.target,snapshotHead,engine,testDatabaseCompatibility:150,
    executions,databaseCount:databases.length,databases,allDropped:true,product,snapshotProductDiff,originalProductDiff,priorEvidenceChanged,
    workingTreeStatus:git(['status','--short']),secretScan:{files:scanFiles.length,filesWithMatches:secretMatches},environmentFileCopied:false,
    cleanup:{removedSnapshot:!fs.existsSync(snapshot),removedTemporaryDirectory:!fs.existsSync(temporary),temporaryEntriesBeforeRemoval:temporaryEntries,dependencies},
    staticChecks:{api:'tsc --noEmit --incremental false: exit 0',frontend:'tsc --noEmit --incremental false: exit 0'},performanceMeasured:false}
  assert.ok(output.cleanup.removedSnapshot&&output.cleanup.removedTemporaryDirectory)
  fs.writeFileSync(path.join(__dirname,'codex-review-round21-final-audit-results.cjs'),'module.exports = '+JSON.stringify(output,null,2)+'\n')
  console.log(JSON.stringify({databaseCount:output.databaseCount,allDropped:true,productUnchanged:true,originalProductDiff,priorEvidenceChanged,secretScan:output.secretScan,cleanup:output.cleanup,engine}))
}
main().catch(e=>{console.error(e.code||'CR21_FINAL_AUDIT_FAILED');process.exitCode=1})
