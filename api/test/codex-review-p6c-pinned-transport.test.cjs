'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),https=require('node:https'),dns=require('node:dns'),cp=require('node:child_process')
require('../node_modules/ts-node').register({project:path.resolve(__dirname,'../tsconfig.json'),transpileOnly:true})
test('P6C-W02: native pinned HTTPS preserves Host/SNI/certificate checks and never follows redirects or external DNS',async t=>{
 const area=path.resolve(__dirname,'codex-review-p6c-tmp');fs.mkdirSync(area,{recursive:true});const dir=fs.mkdtempSync(path.join(area,'native-tls-'))
 const key=path.join(dir,'key.pem'),cert=path.join(dir,'cert.pem'),host='p6c-pinned.invalid'
 cp.execFileSync('C:/Program Files/Git/mingw64/bin/openssl.exe',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN='+host,'-addext','subjectAltName=DNS:'+host],{stdio:'ignore'})
 const received=[];let reply=204,lookups=0
 const server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(cert)},(req,res)=>{let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{received.push({host:req.headers.host,sni:req.socket.servername,path:req.url,body});res.writeHead(reply,{location:'/must-not-follow'});res.end()})})
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port
 const original=https.request,lookup=dns.lookup,promiseLookup=dns.promises.lookup,fetch=global.fetch
 dns.lookup=(...args)=>{throw Error('DNS is forbidden in this test')};dns.promises.lookup=async()=>{throw Error('DNS is forbidden in this test')};global.fetch=()=>{throw Error('fetch is forbidden')}
 https.request=(options,callback)=>{
  assert.equal(Number(options.port),port);assert.ok([host,'wrong-name.invalid'].includes(options.hostname));assert.equal(options.agent,false)
  const pinned=options.lookup
  return original({...options,ca:fs.readFileSync(cert),lookup:(name,opts,cb)=>{lookups++;pinned(name,opts,(err,address,family)=>{const actual=Array.isArray(address)?address[0].address:address;assert.equal(actual,'127.0.0.1','The only permitted destination is our loopback receiver');cb(err,address,family)})}},callback)
 }
 try{
  const {postPinned}=require('../src/integrations/webhooks')
  const url=new URL('https://'+host+':'+port+'/hook?value=1'),pin={address:'127.0.0.1',family:4}
  assert.equal(await postPinned(url,pin,{'Content-Type':'application/json'},'{"review":true}',3000),204)
  assert.deepEqual(received[0],{host:host+':'+port,sni:host,path:'/hook?value=1',body:'{"review":true}'})
  reply=302;assert.equal(await postPinned(url,pin,{},'redirect-test',3000),302);assert.equal(received.length,2)
  await assert.rejects(postPinned(new URL('https://wrong-name.invalid:'+port+'/hook'),pin,{},'must-not-arrive',3000),e=>e.code==='ERR_TLS_CERT_ALTNAME_INVALID')
  assert.equal(received.length,2);assert.equal(lookups,3)
  const evidence={externalDnsCalls:0,localRequests:received.length,originalHostAndSni:true,wrongCertificateRejected:true,redirectFollowed:false}
  fs.writeFileSync(path.join(__dirname,'codex-review-p6c-pinned-transport-result.cjs'),'module.exports = '+JSON.stringify(evidence,null,2)+'\n');t.diagnostic(JSON.stringify(evidence))
 }finally{https.request=original;dns.lookup=lookup;dns.promises.lookup=promiseLookup;global.fetch=fetch;await new Promise(r=>server.close(r));assert.ok(fs.realpathSync(dir).startsWith(fs.realpathSync(area)+path.sep));fs.rmSync(dir,{recursive:true,force:true})}
})
