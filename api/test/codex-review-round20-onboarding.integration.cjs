'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
const fixture=require('./codex-review-round20-fixture.cjs')
let f,b,e,doc,task,service
before(async()=>{
  f=await fixture('r20_onboarding')
  b=await f.repo('Branch').save({code:'R20-ON',name:'فرع التهيئة',country:'EG'})
  e=await f.repo('Employee').save({employeeCode:'R20-ON-1',fullName:'أحمد علي محمد',branchId:b.id,joinDate:require('../src/attendance/attendance.service').localDateOf(new Date()),status:'active',isActive:true,nationalId:'R20-ID-ON'})
  await f.repo('DocType').update({code:'contract'},{requiredForHiring:true,isActive:true})
  doc=await f.ok('POST','/documents',{employeeId:e.id,docType:'contract',fileRef:'legacy-contract.pdf'})
  const list=await f.ok('GET','/onboarding');task=list.employees.find(x=>x.id===e.id).tasks.find(x=>x.systemKey==='HIRING_DOCS')
  assert.equal(task.status,'DONE')
  service=f.app.get(require('../src/onboarding/onboarding.service').OnboardingService)
},{timeout:180000})
after(async()=>{if(f)await f.close()})

test('CR20 saving a system task note cannot restore DONE after a concurrent required document removal',async t=>{
  // Pause only immediately before the real repository save; all validation and SQL results remain real.
  const original=service.tasks.save;let resume,arrived,timer,pending
  const gate=new Promise(r=>{resume=r}),ready=new Promise((resolve,reject)=>{arrived=resolve;timer=setTimeout(()=>reject(Error('Task save did not arrive')),10000)})
  service.tasks.save=async function(row,...args){if(row.id===task.id){arrived();await gate}return original.call(this,row,...args)}
  let result,persisted,afterRemoval,healed
  try{
    pending=f.request('PATCH',`/onboarding/tasks/${task.id}`,{note:'ملاحظة أثناء رفع المستندات'})
    await ready;clearTimeout(timer)
    await f.ok('PATCH',`/documents/${doc.id}`,{fileRef:null})
    afterRemoval=(await f.repo('OnboardingTask').findOneByOrFail({id:task.id})).status;assert.equal(afterRemoval,'PENDING')
    resume();result=await pending
    persisted=(await f.repo('OnboardingTask').findOneByOrFail({id:task.id})).status
    const report=await f.ok('GET','/hiring-documents/missing');assert.equal(report.employees.find(x=>x.employeeId===e.id).presentCount,0)
    healed=(await f.ok('GET','/onboarding')).employees.find(x=>x.id===e.id).tasks.find(x=>x.id===task.id).status
  }finally{resume();if(pending)await pending;clearTimeout(timer);service.tasks.save=original}
  t.diagnostic(JSON.stringify({case:'system-task-stale-save',patchStatus:result.status,statusAfterDocumentRemoval:afterRemoval,statusAfterNoteSave:persisted,returnedStatus:result.body.status,returnedProgress:result.body.hiringDocs,statusAfterNextList:healed}))
  assert.equal(result.status,200);assert.equal(persisted,'PENDING','A note edit must not complete a task with missing hiring documents')
})
