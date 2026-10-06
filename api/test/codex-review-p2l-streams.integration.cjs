'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path')
const {Readable,Writable}=require('node:stream'),{pipeline}=require('node:stream/promises')
const {sha256OfStream,sha256VerifiedStream,STORED_FILE_CHANGED}=require('../src/files/stored-file-hash')
const bytes=Buffer.from('%PDF-1.7\n'+Array.from({length:210000},(_,i)=>String.fromCharCode(32+i%91)).join(''))
const digest={size:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')}
const split=(value,size)=>Array.from({length:Math.ceil(value.length/size)},(_,i)=>value.subarray(i*size,(i+1)*size))
async function transfer(chunks){
 const source=Readable.from(chunks),check=sha256VerifiedStream(digest),written=[]
 const dest=new Writable({write(chunk,_enc,done){written.push(Buffer.from(chunk));done()}})
 let error=null;try{await pipeline(source,check,dest)}catch(e){error=e}
 assert.equal(source.destroyed,true);assert.equal(check.destroyed,true);assert.equal(dest.destroyed,true)
 return{error,output:Buffer.concat(written)}
}
test('P2L stream: exact bytes across chunk boundaries; preflight hashes the same bytes',async()=>{
 assert.deepEqual(await sha256OfStream(Readable.from(split(bytes,7001))),digest)
 for(const size of [1,777,65536,bytes.length]){
  const result=await transfer([Buffer.alloc(0),...split(bytes,size),Buffer.alloc(0)])
  assert.equal(result.error,null);assert.deepEqual(result.output,bytes)
 }
})
test('P2L stream: same-size, shorter, larger and trailing-chunk replacements cannot complete the advertised length',async()=>{
 const changed=Buffer.from(bytes);changed[100000]^=1
 for(const bad of [changed,bytes.subarray(0,bytes.length-1),Buffer.concat([bytes,Buffer.from('x')])]){
  for(const size of [4096,65536,bad.length]){
   const result=await transfer(split(bad,size));assert.equal(result.error?.message,STORED_FILE_CHANGED);assert.ok(result.output.length<digest.size)
  }
 }
 assert.deepEqual((await transfer(split(bytes,32768))).output,bytes,'A failed transfer does not poison later reads')
})
test('P2L stream: disconnect and source failure close file descriptors; subsequent requests remain healthy',async()=>{
 const folder=path.resolve(__dirname,'codex-review-p2l-tmp','stream-checks');fs.mkdirSync(folder,{recursive:true})
 const file=path.join(folder,'synthetic.pdf');fs.writeFileSync(file,bytes)
 // Before-start cancellation is covered at the controller boundary in PL-09:
 // it deliberately does not create a stream. Here disconnect occurs in flight.
 for(const abortAfter of [1,2,5]){
  const source=fs.createReadStream(file,{highWaterMark:8192}),check=sha256VerifiedStream(digest);let received=0
  const dest=new Writable({write(_chunk,_enc,done){received++;if(received>=abortAfter){done(new Error('synthetic client disconnect'))}else done()}})
  await assert.rejects(pipeline(source,check,dest))
  assert.equal(source.destroyed,true);assert.equal(source.fd,null);assert.equal(check.destroyed,true)
 }
 let closed=false
 const broken=Readable.from((async function*(){try{yield bytes.subarray(0,5);throw Error('synthetic storage read failure')}finally{closed=true}})())
 await assert.rejects(sha256OfStream(broken),/synthetic storage read failure/);assert.equal(closed,true)
 assert.deepEqual(await sha256OfStream(fs.createReadStream(file)),digest)
 fs.unlinkSync(file)
})
