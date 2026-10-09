'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),scope=require('./codex-review-p6b-scope-evidence.cjs'),report='D:/projects/hr_system/CODEX_REVIEW_REPORT_P6B.md'
async function main(){
 assert.equal(cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),scope.target)
 const changed=scope.files.filter(e=>!fs.existsSync(path.join(root,e.file))||crypto.createHash('sha256').update(fs.readFileSync(path.join(root,e.file))).digest('hex')!==e.sha256).map(e=>e.file)
 assert.deepEqual(changed,[],'Tracked files, including all existing tests, must be unchanged')
 const names=fs.readdirSync(__dirname).filter(n=>/^codex-review-p6b-results-[a-z0-9_-]+\.cjs$/.test(n)),databases=new Set(),results=[]
 for(const name of names){const result=require(path.join(__dirname,name));results.push({file:name,counts:result.summary.counts,failures:result.failures.map(f=>({name:f.name,error:f.error}))});for(const text of result.stdout||[]){const m=text.match(/CR5_DATABASE (\{[^\n]+\})/);if(m){const item=JSON.parse(m[1]);if(item.operation==='CREATE')databases.add(item.database)}}}

 const env=require('../node_modules/dotenv').parse(fs.readFileSync(path.join(__dirname,'../.env'))),sql=require('../node_modules/mssql')
 for(const db of databases)assert.match(db,/^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/)
 const pool=await new sql.ConnectionPool({server:'localhost',port:1433,user:env.DB_USERNAME,password:env.DB_PASSWORD,database:'master',options:{encrypt:false,trustServerCertificate:true},connectionTimeout:5000}).connect();let remaining,server
 try{remaining=(await pool.request().input('names',sql.NVarChar(sql.MAX),JSON.stringify([...databases])).query('SELECT name FROM sys.databases WHERE name IN (SELECT value FROM OPENJSON(@names))')).recordset;server=(await pool.request().query("SELECT CONVERT(varchar(50),SERVERPROPERTY('ProductVersion')) version,CONVERT(varchar(100),SERVERPROPERTY('Edition')) edition")).recordset[0]}finally{await pool.close()}
 assert.deepEqual(remaining,[],'All owned databases deleted')
 const temporary=path.resolve(__dirname,'codex-review-p6b-tmp');let removedFiles=0
 if(fs.existsSync(temporary)){
  assert.equal(fs.realpathSync(temporary).toLowerCase(),temporary.toLowerCase());assert.equal(path.dirname(temporary),__dirname)
  function inspect(dir){for(const e of fs.readdirSync(dir)){const file=path.resolve(dir,e);assert.ok(file.startsWith(temporary+path.sep));const s=fs.lstatSync(file);assert.equal(s.isSymbolicLink(),false,'Never delete through a link');if(s.isDirectory())inspect(file);else{assert.ok(s.isFile());removedFiles++}}}
  inspect(temporary);fs.rmSync(temporary,{recursive:true,force:false});assert.equal(fs.existsSync(temporary),false)
 }
 const secrets=Object.entries(env).filter(([k,v])=>/password|secret|token/i.test(k)&&v.length>=8).map(([,v])=>v)
 const outputs=fs.readdirSync(__dirname).filter(n=>n.startsWith('codex-review-p6b-')&&fs.statSync(path.join(__dirname,n)).isFile()).map(n=>path.join(__dirname,n)).concat(report)
 assert.deepEqual(outputs.filter(p=>secrets.some(secret=>fs.readFileSync(p,'utf8').includes(secret))),[],'No configured secrets in review evidence')
 const summary={target:scope.target,trackedFilesUnchanged:scope.files.length,databasesAbsent:databases.size,server,secretScan:'passed',temporaryFilesRemoved:removedFiles,temporaryDirectoryAbsent:true}
 fs.writeFileSync(path.join(__dirname,'codex-review-p6b-final-verification.cjs'),'module.exports = '+JSON.stringify({...summary,databases:[...databases],results},null,2)+'\n')
 const footer=`\n- **التحقق النهائي:** بقيت الملفات المتتبعة الـ${scope.files.length} بلا تغيير، وحُذفت قواعد الاختبار الـ${databases.size} وتحقق غيابها من \`sys.databases\`. حُذف مجلد المرفقات المصطنعة (${removedFiles} ملفًا). فحص الأسرار في التقرير والأدلة: ناجح. الدليل \`codex-review-p6b-final-verification.cjs\`.\n`
 fs.appendFileSync(report,footer);console.log(JSON.stringify(summary))
}
main().catch(error=>{console.error(error.message);process.exitCode=1})
