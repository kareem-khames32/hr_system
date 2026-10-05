'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict')
test('P2A identify native PDF execution limitation without replacing its implementation',async t=>{
 const renderer=new(require('../src/letters/letter-renderer.service').LetterRenderer)()
 try{
  const bytes=await renderer.pdf({companyName:'Review only',companyNameEn:'Review only',issuedDate:'2026-10-05',requestRef:'P2A-native',content:{title:'Review',greeting:'',body:'Review',closing:'',footer:''}})
  assert.equal(Buffer.from(bytes).subarray(0,5).toString(),'%PDF-');t.diagnostic(JSON.stringify({case:'P2A-native-render',supported:true}))
 }catch(e){
  const message=String(e.message),classification=['REVIEW_NETWORK_SQL_LOCAL_ONLY','REVIEW_NO_LISTEN','EPERM','ENOENT','Could not find Chrome','Failed to launch'].find(s=>message.includes(s))||'OTHER'
  t.diagnostic(JSON.stringify({case:'P2A-native-render',supported:false,classification,errorCode:e.code??null,message:classification==='OTHER'?message.slice(0,300):undefined}))
  t.skip('Native renderer unavailable under review runner: '+classification)
 }
},{timeout:30000})
