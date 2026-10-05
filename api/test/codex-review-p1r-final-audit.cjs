'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),main=path.resolve(root,'../../..'),scope=require('./codex-review-p1r-scope-evidence.cjs'),prefix='codex-review-p1r-'
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim()
async function run(){
 assert.equal(git(['rev-parse','HEAD']),scope.target)
 const changed=scope.files.filter(x=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,x.file))).digest('hex')!==x.sha256).map(x=>x.file);assert.deepEqual(changed,[])
 const env=require('../node_modules/dotenv').parse(fs.readFileSync(path.join(root,'api/.env'))),owned=new Set(),dropped=new Set(),tests=[]
 for(const name of fs.readdirSync(__dirname).filter(n=>n.startsWith(prefix+'results-')&&n.endsWith('.cjs'))){const r=require('./'+name);tests.push({file:name,counts:r.summary.counts});for(const text of r.stdout||[])for(const m of text.matchAll(/CR5_DATABASE (\{[^\r\n]+\})/g)){const row=JSON.parse(m[1]);assert.match(row.database,/^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/);if(row.operation==='CREATE')owned.add(row.database);if(row.operation==='DROP')dropped.add(row.database)}}
 const sql=require('../node_modules/mssql'),pool=await new sql.ConnectionPool({server:'localhost',port:1433,user:env.DB_USERNAME,password:env.DB_PASSWORD,database:'master',options:{encrypt:false,trustServerCertificate:true}}).connect(),databases=[];let engine
 try{engine=(await pool.request().query("SELECT CAST(SERVERPROPERTY('ProductVersion') AS varchar(80)) version")).recordset[0];for(const name of owned){const rows=(await pool.request().input('n',name).query('SELECT name FROM sys.databases WHERE name=@n')).recordset;databases.push({name,absent:rows.length===0,dropRecorded:dropped.has(name)})}}finally{await pool.close()}
 assert.ok(databases.length>0&&databases.every(x=>x.absent&&x.dropRecorded))
 const report=path.join(main,'CODEX_REVIEW_REPORT_P1R.md'),files=fs.readdirSync(__dirname).filter(n=>n.startsWith(prefix)).map(n=>path.join(__dirname,n)).filter(n=>fs.statSync(n).isFile());files.push(report)
 const secrets=Object.entries(env).filter(([k,v])=>/password|secret|token|ad_bind_dn|smtp_(host|from|user)|ad_host/i.test(k)&&v.length>2).map(([,v])=>v)
 const matches=files.filter(n=>{const s=fs.readFileSync(n,'utf8');return secrets.some(v=>s.includes(v))||/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(s)}).map(n=>path.basename(n));assert.deepEqual(matches,[])
 const temp=path.join(__dirname,prefix+'tmp');assert.equal(path.dirname(temp),__dirname)
 if(fs.existsSync(temp)){assert.equal(fs.realpathSync(temp),temp);assert.equal(fs.lstatSync(temp).isSymbolicLink(),false);assert.ok(fs.readdirSync(temp).every(n=>n==='v8-compile-cache'));fs.rmSync(temp,{recursive:true,force:true})}
 const result={target:scope.target,trackedFilesChecked:scope.files.length,changed,databases,allDropped:true,tests,engine,compatibility:150,secretMatches:matches,temporaryRemoved:!fs.existsSync(temp),performanceMeasured:false}
 fs.writeFileSync(path.join(__dirname,prefix+'final-audit-results.cjs'),'module.exports = '+JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({target:scope.target,trackedFiles:scope.files.length,databases:databases.length,allDropped:true,changed,secretMatches:matches,tests}))
}
run().catch(e=>{console.error(e.code||'AUDIT_FAILED');console.error(String(e.stack||'').split('\n').filter(l=>l.includes('codex-review-p1r-final-audit')).join('\n'));process.exitCode=1})
