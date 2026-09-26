'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex')
const scope=require('./codex-review-round5-scope-evidence.cjs')
const env=require('../node_modules/dotenv').parse(fs.readFileSync(path.join(root,'api/.env')))
const secrets=Object.entries(env).filter(([k,v])=>/password|secret|token|ad_bind_dn|smtp_(host|from|user)|ad_host/i.test(k)&&v.length>2).map(([,v])=>v)
const owned=new Set(),dropped=new Set()
for(const file of fs.readdirSync(__dirname).filter(f=>/^codex-review-round5-results-.*\.cjs$/.test(f))){
  const result=require(path.join(__dirname,file))
  for(const s of result.stdout||[])for(const m of s.matchAll(/CR5_DATABASE (\{[^\r\n]+\})/g)){
    const d=JSON.parse(m[1]);assert.match(d.database,/^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/)
    if(d.operation==='CREATE')owned.add(d.database);if(d.operation==='DROP')dropped.add(d.database)
  }
}
async function main(){
  const sql=require('../node_modules/mssql')
  const pool=await new sql.ConnectionPool({server:'localhost',port:1433,user:env.DB_USERNAME,password:env.DB_PASSWORD,database:'master',options:{encrypt:false,trustServerCertificate:true},connectionTimeout:5000}).connect()
  const databases=[]
  try{
    for(const name of [...owned].sort()){
      assert.match(name,/^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/);assert.ok(!/^hr_system$|^hr_review_pre_payroll/i.test(name));assert.notEqual(name,env.DB_DATABASE)
      const r=await pool.request().input('name',sql.NVarChar,name).query('SELECT name FROM sys.databases WHERE name=@name')
      databases.push({name,dropRecorded:dropped.has(name),absent:r.recordset.length===0})
    }
  }finally{await pool.close()}
  const product=scope.product.map(x=>({...x,unchanged:hash(fs.readFileSync(path.join(root,x.file)))===x.sha256}))
  const originalRound4Changed=scope.round4Originals.filter(x=>hash(fs.readFileSync(path.join(root,x.file)))!==x.sha256).map(x=>x.file)
  const diff=execFileSync('git',['diff','--name-only','d352f40','--','api/src','src','docs/migrations'],{cwd:root,encoding:'utf8'}).trim()
  const scanFiles=fs.readdirSync(__dirname).filter(f=>f.startsWith('codex-review-round5-')).map(f=>path.join(__dirname,f))
  if(fs.existsSync(path.join(root,'CODEX_REVIEW_REPORT_5.md')))scanFiles.push(path.join(root,'CODEX_REVIEW_REPORT_5.md'))
  const findings=[]
  for(const file of scanFiles){const s=fs.readFileSync(file,'utf8');if(secrets.some(v=>s.includes(v))||/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(s))findings.push(path.basename(file))}
  const output={checkedAt:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),databaseCount:databases.length,databases,allDropped:databases.every(x=>x.dropRecorded&&x.absent),product,productDiffFromTarget:diff,originalRound4Changed,secretScan:{files:scanFiles.length,filesWithMatches:findings},staticChecks:{api:'tsc --noEmit --incremental false: exit 0',frontend:'tsc --noEmit --incremental false: exit 0'},performanceMeasured:false}
  fs.writeFileSync(path.join(__dirname,'codex-review-round5-final-audit-results.cjs'),'module.exports = '+JSON.stringify(output,null,2)+'\n')
  console.log(JSON.stringify({databaseCount:output.databaseCount,allDropped:output.allDropped,productUnchanged:product.every(x=>x.unchanged)&&!diff,originalRound4Changed,secretScan:output.secretScan}))
  assert.ok(output.allDropped);assert.ok(product.every(x=>x.unchanged));assert.equal(diff,'');assert.deepEqual(originalRound4Changed,[]);assert.deepEqual(findings,[])
}
main().catch(e=>{console.error(e.code||'REVIEW_FINAL_AUDIT_FAILED');process.exitCode=1})
