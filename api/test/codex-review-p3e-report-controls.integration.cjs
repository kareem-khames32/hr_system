'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto')
let f,A,B,service
before(async()=>{
 f=await require('./codex-review-p3e-fixture.cjs')('p3e_reports')
 A=await f.repo('Branch').save({code:'P3ERPA',name:'Synthetic report branch A',country:'EG'});B=await f.repo('Branch').save({code:'P3ERPB',name:'Synthetic report branch B',country:'EG'})
 for(const branch of [A,B])await f.repo('Employee').save({employeeCode:'P3E'+crypto.randomBytes(6).toString('hex'),fullName:'Synthetic report employee',branchId:branch.id,status:'active',isActive:true,joinDate:'2020-01-01'})
 service=f.app.get(require('../src/reports/saved-reports.service').SavedReportsService)
 await f.setting(require('../src/notifications/notifications.service').NOTIFICATIONS_EMAIL_ENABLED_KEY,'true')
})
after(async()=>{if(f)await f.close()})
function barrier(){let enter,release;return{arrived:new Promise(r=>enter=r),resume:new Promise(r=>release=r),enter:()=>enter(),release:()=>release()}}
async function reached(b,p){let t;try{await Promise.race([b.arrived,p.then(()=>{throw Error('Send finished before barrier')}),new Promise((_,reject)=>{t=setTimeout(()=>reject(Error('Render barrier timeout')),15000)})])}finally{clearTimeout(t)}}
for(const mode of ['permission','disabled','churn'])test(`P3E-S-${mode}: final report identity rejects ${mode} after real rendering`,async()=>{
 const owner=await f.repo('User').save({email:crypto.randomUUID()+'@review.invalid',displayName:'Synthetic report owner',passwordHash:'unusable',role:'employee',permissions:'["reports.view","reports.save"]',branchId:A.id,isActive:true})
 const row=await f.ok('POST','/reports/saved',{name:'Synthetic review report '+mode,report:'headcount',frequency:'DAILY'},owner)
 const original=service.build,b=barrier();let pending,builds=0
 f.mailbox.sent.length=0;const audits=await f.repo('AuditLog').count({where:{action:'REPORT_EXPORT'}})
 service.build=async function(...args){const file=await original.apply(this,args);builds++;if(mode==='churn')await f.ok('PATCH','/users/'+owner.id,{branchId:builds%2?B.id:A.id});else if(builds===1){b.enter();await b.resume}return file}
 try{
  const now=new Date();now.setHours(10,0,0,0);pending=service.sendDue(now)
  if(mode!=='churn'){await reached(b,pending);await f.ok('PATCH','/users/'+owner.id,mode==='permission'?{permissions:['reports.view']}:{isActive:false});b.release()}
  const outcome=await pending
  assert.equal(outcome.sent,0);assert.equal(outcome.failed,1);assert.equal(f.mailbox.sent.length,0)
  assert.equal(builds,mode==='churn'?3:1);assert.equal(await f.repo('AuditLog').count({where:{action:'REPORT_EXPORT'}}),audits)
  assert.equal((await f.repo('SavedReport').findOneByOrFail({id:row.id})).lastSentOn,null)
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'report-final-identity-'+mode,builds,sent:outcome.sent,failed:outcome.failed}))
 }finally{b.release();service.build=original;if(pending)await pending;await f.repo('SavedReport').delete({id:row.id})}
})
