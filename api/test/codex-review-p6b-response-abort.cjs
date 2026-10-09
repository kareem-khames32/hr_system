'use strict'
// Isolated child: forcibly end only this disposable test process if the product promise never settles.
const path=require('node:path'),assert=require('node:assert/strict'),http=require('node:http'),dns=require('node:dns')
require('../node_modules/ts-node').register({project:path.resolve(__dirname,'../tsconfig.json'),transpileOnly:true})
const {postPinned}=require('../src/integrations/webhooks')
const server=http.createServer((req,res)=>{req.resume();req.on('end',()=>{res.writeHead(200,{'Content-Type':'text/plain','Content-Length':'100'});res.write('partial');setTimeout(()=>res.socket.destroy(),30)})})
server.listen(0,'127.0.0.1',async()=>{
 dns.lookup=()=>{throw Error('External DNS forbidden')};dns.promises.lookup=async()=>{throw Error('External DNS forbidden')}
 try{const status=await postPinned(new URL('http://p6b-abort.invalid:'+server.address().port+'/hook'),{address:'127.0.0.1',family:4},{},'local only',1000);console.log(JSON.stringify({result:'resolved',status}))}
 catch(e){console.log(JSON.stringify({result:'rejected',code:e.code,message:e.message}))}
 finally{server.close()}
})
setTimeout(()=>{console.log(JSON.stringify({result:'hung'}));process.exit(3)},2500).unref()
