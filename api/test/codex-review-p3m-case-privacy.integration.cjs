'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict'),setup=require('./codex-review-p3m-helpers.cjs')
test('P3M-C01: handler account rebound to respondent loses full case and complainant identity',async()=>{
 const f=await setup('case');try{
  await f.enable('cases')
  const handlerEmp=await f.emp(),respondent=await f.emp(),complainant=await f.emp({fullName:'CONFIDENTIAL_COMPLAINANT'})
  const handler=await f.account(['cases.investigate'],{employeeId:handlerEmp.id})
  const made=await f.ok('POST','/cases',{kind:'VIOLATION',title:'Confidential report',description:'Private case evidence',complainantEmployeeId:complainant.id,respondentEmployeeId:respondent.id},handler)
  assert.equal((await f.request('GET',`/cases/${made.id}`,null,f.admin)).status,404)
  
  const fs=require('fs'),path=require('path'),bytes=Buffer.from('%PDF-1.4\nSynthetic case proof\n');fs.mkdirSync(process.env.UPLOADS_ROOT,{recursive:true});fs.writeFileSync(path.join(process.env.UPLOADS_ROOT,'case-control.pdf'),bytes)
  const file=await f.repo('StoredFile').save({originalName:'case-control.pdf',storedName:'case-control.pdf',mime:'application/pdf',size:bytes.length,entityType:'case',entityId:made.id,uploadedBy:handler.id,employeeId:null})
  const jwt=new(require('../node_modules/@nestjs/jwt').JwtService)({secret:process.env.JWT_SECRET})
  const download=async u=>{const r=await fetch('http://127.0.0.1:1/api/files/'+file.id,{headers:{Authorization:'Bearer '+jwt.sign({sub:u.id,email:u.email,role:u.role,employeeId:u.employeeId,branchId:u.branchId,permissions:JSON.parse(u.permissions),tokenVersion:u.tokenVersion||0})}});await r.arrayBuffer();return r.status}
  assert.equal(await download(handler),200)
  await f.ok('PATCH','/users/'+handler.id,{employeeId:respondent.id})

  const rebound=await f.repo('User').findOneByOrFail({id:handler.id})
  const response=await f.request('GET',`/cases/${made.id}`,null,rebound)
  assert.equal(response.status,404);assert.ok(!JSON.stringify(response.body).includes('CONFIDENTIAL_COMPLAINANT'));assert.equal((await f.ok('GET','/cases',null,rebound)).cases.length,0)
  
  assert.equal(await download(rebound),404)
  assert.equal((await f.request('POST','/cases/'+made.id+'/events',{kind:'NOTE',body:'Must be refused'},rebound)).status,404)
  const service=f.app.get(require('../src/cases/cases.service').CasesService)
  await assert.rejects(()=>service.assertCanUpload({sub:rebound.id,employeeId:rebound.employeeId,role:rebound.role,branchId:rebound.branchId,permissions:JSON.parse(rebound.permissions)}),e=>e.getStatus()===403)
  console.log('REVIEW_MEASURE '
+JSON.stringify({case:'C01',unlistedAdmin:404,reboundRespondent:response.status,complainantExposed:false,oldUploaderFile:404,write:404,upload:403}))
 }finally{await f.close()}
},{timeout:180000})
