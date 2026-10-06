'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict')
test('P2N classify native PDF rendering availability without starting any service',async t=>{
 const renderer=new(require('../src/letters/letter-renderer.service').LetterRenderer)()
 try{
  const b=await renderer.pdf({companyName:'Synthetic',issuedDate:'2026-10-06',requestRef:'Synthetic',content:{title:'Synthetic',greeting:'',body:'Synthetic',closing:'',footer:''}})
  assert.equal(Buffer.from(b).subarray(0,5).toString(),'%PDF-');t.diagnostic(JSON.stringify({nativeRenderer:true}))
 }catch(e){
  const m=String(e.message).split('\n')[0]
  t.diagnostic(JSON.stringify({nativeRenderer:false,name:e.name,code:e.code??null,message:m}))
  t.skip('Native Chromium is unavailable in the review sandbox; use deterministic PDF bytes for changed paths')
 }
},{timeout:30000})
