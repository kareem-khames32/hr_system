'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),net=require('node:net'),dns=require('node:dns'),path=require('node:path'),fs=require('node:fs')
require('../node_modules/ts-node').register({project:path.resolve(__dirname,'../tsconfig.json'),transpileOnly:true})
const {postPinned}=require('../src/integrations/webhooks'),pin={address:'127.0.0.1',family:4}
test('P6C-W05: headers-only, redirects, dropped response, slow headers and TLS handshake are all bounded',async t=>{
 const sockets=new Set(),servers=[],timers=[],evidence=[]
 const lookup=dns.lookup,promiseLookup=dns.promises.lookup
 dns.lookup=(host,...args)=>{assert.equal(host,'127.0.0.1','External DNS forbidden');return lookup(host,...args)};dns.promises.lookup=async()=>{throw Error('External DNS forbidden')}
 async function start(server){server.on('connection',socket=>{sockets.add(socket);socket.on('error',()=>{});socket.on('close',()=>sockets.delete(socket))});servers.push(server);await new Promise(r=>server.listen(0,'127.0.0.1',r));return server.address().port}
 try{
  const port=await start(http.createServer((req,res)=>{req.resume();if(req.url==='/drop'){req.socket.destroy();return}if(req.url==='/silent')return;res.writeHead(req.url==='/redirect'?302:200,{'Content-Length':'1000',Location:'/must-not-follow'});res.flushHeaders()}))
  for(const [route,status] of [['/headers',200],['/redirect',302]]){const began=Date.now();assert.equal(await postPinned(new URL('http://p6c-boundary.invalid:'+port+route),pin,{},'local',400),status);evidence.push({route,status,ms:Date.now()-began})}
  await assert.rejects(postPinned(new URL('http://p6c-boundary.invalid:'+port+'/drop'),pin,{},'local',400))
  const slow=await start(net.createServer(socket=>{socket.on('data',()=>{});socket.write('HTTP/1.1 200 OK\r\nX-Slow: ');timers.push(setInterval(()=>{if(!socket.destroyed)socket.write('x')},20))}))
  const stall=await start(net.createServer(socket=>socket.on('data',()=>{})))
  for(const [name,url] of [['silent response','http://p6c-boundary.invalid:'+port+'/silent'],['trickling headers','http://p6c-boundary.invalid:'+slow+'/'],['TLS before response','https://p6c-boundary.invalid:'+stall+'/']]){
   const began=Date.now();await assert.rejects(postPinned(new URL(url),pin,{},'local',300));const ms=Date.now()-began;assert.ok(ms>=240&&ms<1500);evidence.push({name,rejected:true,ms})
  }
  fs.writeFileSync(path.join(__dirname,'codex-review-p6c-transport-boundaries-result.cjs'),'module.exports = '+JSON.stringify(evidence,null,2)+'\n');t.diagnostic(JSON.stringify(evidence))
 }finally{dns.lookup=lookup;dns.promises.lookup=promiseLookup;timers.forEach(clearInterval);for(const socket of sockets)socket.destroy();await Promise.all(servers.map(server=>new Promise(r=>server.close(r))))}
})
