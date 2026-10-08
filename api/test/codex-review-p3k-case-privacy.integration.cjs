'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict'),setup=require('./codex-review-p3k-helpers.cjs')
test('P3K-C01: handler account rebound to respondent retains full case and complainant identity',async()=>{
 const f=await setup('case');try{
  await f.enable('cases')
  const handlerEmp=await f.emp(),respondent=await f.emp(),complainant=await f.emp({fullName:'CONFIDENTIAL_COMPLAINANT'})
  const handler=await f.account(['cases.investigate'],{employeeId:handlerEmp.id})
  const made=await f.ok('POST','/cases',{kind:'VIOLATION',title:'Confidential report',description:'Private case evidence',complainantEmployeeId:complainant.id,respondentEmployeeId:respondent.id},handler)
  assert.equal((await f.request('GET',`/cases/${made.id}`,null,f.admin)).status,404)
  await f.ok('PATCH',`/users/${handler.id}`,{employeeId:respondent.id})
  const rebound=await f.repo('User').findOneByOrFail({id:handler.id})
  const response=await f.request('GET',`/cases/${made.id}`,null,rebound)
  assert.equal(response.status,200);assert.ok(JSON.stringify(response.body).includes('CONFIDENTIAL_COMPLAINANT'))
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'C01',unlistedAdmin:404,reboundRespondent:response.status,complainantExposed:true}))
 }finally{await f.close()}
},{timeout:180000})
