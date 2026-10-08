'use strict'
// In-process HTTP transport. Abort must reject like a truncated real HTTP body;
// the old round-2 adapter observes only end(), so intentional pipeline abort hangs.
require('./codex-review-round5-harness.cjs')
const assert=require('node:assert/strict'),{IncomingMessage,ServerResponse}=require('node:http'),{Duplex}=require('node:stream')
const {getApp}=require('./codex-review-round2-harness.cjs')
global.fetch=async(url,options={})=>{
 const u=new URL(url);assert.equal(u.origin,'http://127.0.0.1:1');const application=getApp();assert.ok(application)
 const socket=new Duplex({read(){},write(_chunk,_enc,done){done()}})
 Object.defineProperty(socket,'remoteAddress',{value:'127.0.0.1'})
 const req=new IncomingMessage(socket);req.method=options.method||'GET';req.url=u.pathname+u.search
 const headers=new Headers(options.headers||{});if(!headers.has('user-agent'))headers.set('user-agent','Codex-P4C-Synthetic-Transport')
 const encoded=new Request(u,{method:req.method,headers,...(options.body==null?{}:{body:options.body})})
 req.headers=Object.fromEntries(encoded.headers)
 const body=options.body==null?null:Buffer.from(await encoded.arrayBuffer());if(body)req.headers['content-length']=String(body.length)
 req.httpVersion='1.1';req.httpVersionMajor=1;req.httpVersionMinor=1
 const res=new ServerResponse(req),chunks=[]
 return new Promise((resolve,reject)=>{
  req.on('error',reject);res.on('error',reject);res.on('close',()=>{if(!res.finished)reject(new Error('REVIEW_HTTP_BODY_ABORTED'))})
  res.destroy=function(error){this.destroyed=true;this.emit('close');reject(error||new Error('REVIEW_HTTP_BODY_ABORTED'));return this}
  res.write=(chunk,encoding,callback)=>{if(chunk)chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk,typeof encoding==='string'?encoding:undefined));if(typeof encoding==='function')encoding();if(typeof callback==='function')callback();return true}
  res.end=(chunk,encoding,callback)=>{
   if(chunk)res.write(chunk,encoding);res.finished=true
   const status=res.statusCode,output=[204,205,304].includes(status)||req.method==='HEAD'?null:Buffer.concat(chunks)
   if(output&&res.hasHeader('content-length'))assert.equal(output.length,Number(res.getHeader('content-length')),'Complete body length')
   resolve(new Response(output,{status,headers:res.getHeaders()}));res.emit('finish');if(typeof callback==='function')callback();return res
  }
  application.getHttpAdapter().getInstance().handle(req,res,error=>{if(error)reject(error);else{res.statusCode=404;res.end()}})
  if(body)req.push(body);req.complete=true;req.push(null)
 })
}
console.log('REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports')
