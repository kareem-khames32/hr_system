'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),Excel=require('exceljs')
let f,A,B,n=0
before(async()=>{f=await require('./codex-review-p3g-fixture.cjs')('p3g_data');A=await f.repo('Branch').save({code:'P3GA',name:'Synthetic branch A',country:'EG'});B=await f.repo('Branch').save({code:'P3GB',name:'Synthetic branch B',country:'EG'});for(const module of ['manager','announcements'])await f.ok('PUT','/modules/'+module,{enabled:true})})
after(async()=>{if(f)await f.close()})
const employee=extra=>f.repo('Employee').save({employeeCode:'P3G'+(++n),fullName:'Synthetic employee '+n,branchId:A.id,jobTitle:'Synthetic analyst',basicSalary:5000,joinDate:'2020-01-01',status:'active',isActive:true,...extra})
const account=(employeeId,permissions=[],extra={})=>f.repo('User').save({email:crypto.randomUUID()+'@review.invalid',displayName:'Synthetic user',passwordHash:'unusable',role:'employee',permissions:JSON.stringify(permissions),employeeId,branchId:A.id,isActive:true,...extra})
async function wait(p,label){let t;try{return await Promise.race([p,new Promise((_,reject)=>{t=setTimeout(()=>reject(Error(label)),10000)})])}finally{clearTimeout(t)}}
test('P3G-D01: scheduled report must revalidate its owner after rendering and before sending',async()=>{
 await employee();await employee({branchId:B.id})
 const owner=await account(null,['reports.view','reports.save'],{scopeAllBranches:true})
 const report=await f.ok('POST','/reports/saved',{name:'Synthetic scoped report',report:'headcount',frequency:'DAILY'},owner)
 await f.setting(require('../src/notifications/notifications.service').NOTIFICATIONS_EMAIL_ENABLED_KEY,'true')
 const service=f.app.get(require('../src/reports/saved-reports.service').SavedReportsService),original=service.build
 let entered,release,pending,once=false;const arrived=new Promise(r=>entered=r),resume=new Promise(r=>release=r)
 service.build=async function(...args){const file=await original.apply(this,args);if(!once){once=true;entered();await resume}return file}
 f.mailbox.sent.length=0
 try{
  const now=new Date();now.setHours(10,0,0,0);pending=service.sendDue(now)
  await wait(Promise.race([arrived,pending.then(()=>{throw Error('Scheduled report finished before rendering barrier')})]),'Rendering barrier timeout')
  await f.ok('PATCH',`/users/${owner.id}`,{scopeAllBranches:false,branchId:A.id})
  release();const outcome=await pending
  let foreign=false
  for(const message of f.mailbox.sent){const workbook=new Excel.Workbook();await workbook.xlsx.load(message.attachments[0].content);foreign ||= JSON.stringify(workbook.worksheets[0].getSheetValues()).includes(B.name)}
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'scheduled-report-scope-after-render',sent:outcome.sent,foreignBranchInAttachment:foreign}))
  assert.equal(foreign,false,'the outgoing attachment must not retain the revoked scope')
 }finally{release();service.build=original;if(pending)await pending;await f.repo('SavedReport').delete({id:report.id})}
})
test('P3G-D02: manager team view cannot reveal a department moved outside the reader branch',async()=>{
 const manager=await employee(),user=await account(manager.id),D=await f.repo('Department').save({code:'P3G_MOVED',name:'Synthetic private department',branchId:A.id})
 const member=await employee({managerEmployeeId:manager.id,departmentId:D.id})
 await f.ok('PATCH',`/departments/${D.id}`,{branchId:B.id})
 const result=await f.ok('GET','/manager/team',null,user),shown=result.team.find(row=>row.id===member.id)
 assert.ok(shown);assert.equal(shown.basicSalary,undefined)
 console.log('REVIEW_MEASURE '+JSON.stringify({case:'team-foreign-unit-name',employeeInReaderBranch:true,departmentInOtherBranch:true,shownDepartment:shown.departmentName}))
 assert.notEqual(shown.departmentName,D.name,'a current foreign unit name must not be projected through an in-scope employee')
})
test('P3G-D03: announcements disappear from board, notifications and read route after account rebinding',async()=>{
 const oldEmployee=await employee(),newEmployee=await employee({branchId:B.id}),user=await account(oldEmployee.id)
 const announcement=await f.ok('POST','/announcements',{title:'Synthetic branch-only announcement',body:'Synthetic private content',audience:{mode:'all',where:{mode:'branches',ids:[A.id]}}})
 await f.ok('POST',`/announcements/${announcement.id}/publish`,{})
 const notifications=f.app.get(require('../src/notifications/notifications.service').NotificationsService)
 const event=await f.repo('OutboxEvent').findOneByOrFail({eventKey:'announcement-published:'+announcement.id})
 await notifications.dispatch({id:String(event.id),type:'ANNOUNCEMENT_PUBLISHED',payload:{announcementId:announcement.id}})
 const before=await f.ok('GET','/announcements/board',null,user);assert.ok(before.items.some(row=>row.id===announcement.id))
 await f.ok('PATCH',`/users/${user.id}`,{employeeId:newEmployee.id})
 const current=await f.repo('User').findOneByOrFail({id:user.id})
 const board=await f.ok('GET','/announcements/board',null,current),stored=await f.ok('GET','/notifications',null,current)
 assert.equal(board.items.some(row=>row.id===announcement.id),false)
 assert.equal(JSON.stringify(stored).includes(announcement.title),false)
 assert.equal((await f.request('POST',`/announcements/${announcement.id}/read`,{},current)).status,404)
})
