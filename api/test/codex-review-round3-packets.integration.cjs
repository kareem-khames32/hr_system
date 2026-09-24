'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path'),{performance}=require('node:perf_hooks')
const sql=require('../node_modules/mssql'),env=require('../node_modules/dotenv').parse(fs.readFileSync(path.join(__dirname,'../.env')))
const {safeDatabase}=require('./codex-review-round2-harness.cjs')
test('CR3 packet size negotiation, long SQL and future encrypted connection measured on disposable DB',async t=>{
 const database=`hr_codex_packets_test_${crypto.randomBytes(8).toString('hex')}`;safeDatabase(database)
 const config=(packetSize,encrypt,database)=>({server:'localhost',port:1433,user:env.DB_USERNAME,password:env.DB_PASSWORD,database,connectionTimeout:10000,requestTimeout:15000,pool:{max:1,min:0},options:{encrypt,trustServerCertificate:true,packetSize}})
 let master,created=false;const results=[]
 try{
  master=await new sql.ConnectionPool(config(4096,false,'master')).connect();await master.request().query(`CREATE DATABASE [${database}]`);created=true
  const detailed=process.env.REVIEW_PACKET_DETAIL==='true'
  const lengths=detailed?[0,5500,11000,20000]:[11000]
  for(const encrypt of [false,true])for(const packetSize of [4096,16383,32767]){
   let p;const row={encrypt,requestedPacket:packetSize}
   try{
    p=await new sql.ConnectionPool(config(packetSize,encrypt,database)).connect()
    const info=(await p.request().query('SELECT net_packet_size,encrypt_option FROM sys.dm_exec_connections WHERE session_id=@@SPID')).recordset[0];Object.assign(row,info)
    row.cases=[]
    for(const length of lengths){
     const longSql='SELECT 7 AS value /*'+ 'x'.repeat(length)+'*/'
     await p.request().query(longSql);const samples=[]
     const outgoing=require('../node_modules/tedious/lib/outgoing-message-stream').prototype,oldPush=outgoing.push,frames=[]
     outgoing.push=function(buffer,...rest){if(Buffer.isBuffer(buffer)&&buffer[0]===3)frames.push({bytes:buffer.length,last:!!(buffer[1]&1)});return oldPush.call(this,buffer,...rest)}
     try{for(let i=0;i<7;i++){const start=performance.now();assert.equal((await p.request().query(longSql)).recordset[0].value,7);samples.push(performance.now()-start)}}finally{outgoing.push=oldPush}
     row.cases.push({sqlUtf16Bytes:Buffer.byteLength(longSql,'utf16le'),samplesMs:samples,medianMs:[...samples].sort((a,b)=>a-b)[3],framesPerQuery:frames.length/7,firstFrames:frames.slice(0,4)})
    }
    row.success=true
   }catch(e){row.success=false;row.error={name:e.name,code:e.code,number:e.number,message:String(e.message).split('\n')[0].slice(0,350)}}finally{if(p)await p.close()}
   results.push(row)
  }
  assert.ok(results.filter(r=>!r.encrypt).every(r=>r.success))
  fs.writeFileSync(path.join(__dirname,`codex-review-round3-packet-results${detailed?'-detailed':''}.cjs`),'module.exports = '+JSON.stringify(results,null,2)+'\n')
  t.diagnostic(JSON.stringify({packetMeasurements:results}))
 }finally{
  if(created){safeDatabase(database);await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`);assert.equal((await master.request().input('db',sql.NVarChar,database).query('SELECT name FROM sys.databases WHERE name=@db')).recordset.length,0);t.diagnostic(`Cleanup verified: ${database}`)}
  if(master)await master.close()
 }
},{timeout:180000})
